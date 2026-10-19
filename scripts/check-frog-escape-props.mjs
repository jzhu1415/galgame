import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createPlayer,advancePlayer,CROUCH_HEIGHT} from '../src/frog-escape-navigation.js';
import {createInventory} from '../src/frog-escape-inventory.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {propItem,propTypes,windowDamage} from '../src/frog-escape-props.js';
import {updateFixtureAction,nearestFixture,wardrobeContaining} from '../src/frog-escape-interactions.js';

const scene=new THREE.Scene(),map=createEscapeScene(scene,{labels:false}),nav=map.navigation;
const joints=[];scene.traverse(node=>{if(node.userData.joint)joints.push(node.userData.joint);});
assert.equal(new Set(joints).size,joints.length,'each landing/stair junction has one newel');
for(const closet of map.interactables.filter(action=>action.hideVolume)) {
  const root=closet.hideVolume.root,normal=new THREE.Vector3(0,0,1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()));
  const start=root.localToWorld(new THREE.Vector3(0,0,1.15)),player={...createPlayer(),x:start.x,y:5.15,z:start.z};
  closet.open=true;updateFixtureAction(closet,2,null,nav);
  for(let i=0;i<29;i++)advancePlayer(player,-normal.x*.04,-normal.z*.04,1/60,nav);
  assert.equal(wardrobeContaining(map.interactables,player),closet,'the character can walk fully inside the empty wardrobe');
  assert(!nav.blocked(player.x,player.y,player.z,false),'the wardrobe fits a standing body');
  closet.open=false;for(let i=0;i<100;i++)updateFixtureAction(closet,1/60,player,nav);
  assert.equal(closet.amount,0,'closing from inside does not intersect the hidden player');
  const camera=new THREE.PerspectiveCamera();camera.position.set(player.x,player.y+1.58,player.z);
  const direction=closet.anchor.getWorldPosition(new THREE.Vector3()).sub(camera.position).normalize();
  assert.equal(nearestFixture(map.interactables,player,camera,direction,nav),closet,'a closed wardrobe can still be operated from inside');
  closet.open=true;for(let i=0;i<100;i++)updateFixtureAction(closet,1/60,player,nav);
  for(let i=0;i<34;i++)advancePlayer(player,normal.x*.04,normal.z*.04,1/60,nav);
  assert.equal(wardrobeContaining(map.interactables,player),null,'the player can leave after reopening');
  closet.open=false;updateFixtureAction(closet,2,null,nav);
}

const items=createWorldItems(scene,nav,map.pickupSeeds),bag=createInventory();
assert(items.entries.length>=40);assert(items.entries.filter(e=>e.item.kind==='glass').length>=3,'cellar wine glasses are pickup props');
for(const kind of ['plate','cup','fork','knife','egg','milk','bread','cheese'])assert(items.entries.some(e=>e.item.kind===kind),`${kind} is in the pickup catalog`);
bag.store(propItem('egg','egg-slot-1'));bag.store(propItem('egg','egg-slot-2'));assert.equal(bag.slots.filter(Boolean).length,2,'two eggs take two slots');bag.remove(0);bag.remove(1);
function step(seconds,dt=1/60){for(let i=0;i<Math.ceil(seconds/dt);i++)items.tick(dt);}
const plate=items.entries.find(e=>e.item.kind==='plate'),plateId=plate.item.id;
const origin=new THREE.Vector3(2.1,1.73,plate.z),direction=new THREE.Vector3(plate.x,plate.y,plate.z).sub(origin).normalize();
assert.equal(items.nearby({x:origin.x,y:.15,z:origin.z},direction,1.58),plate,'aiming picks the real plate in front of the table');
assert(items.pickup(plate,bag));assert(!items.entries.some(e=>e.item.id===plateId),'picking up removes the world copy');
for(let i=1;i<7;i++)bag.store(propItem('egg',`capacity-${i}`));
const anotherPlate=items.entries.find(e=>e.item.kind==='plate');assert(!items.pickup(anotherPlate,bag),'a full seven-slot bar leaves the world item untouched');
assert(items.entries.includes(anotherPlate));for(let i=1;i<7;i++)bag.remove(i);
const held=bag.slots[0],placer={...createPlayer(),x:2,y:.15,z:-.9,yaw:0};
const eye=new THREE.Vector3(2,1.73,-.9),floorPoint=new THREE.Vector3(2,.15,-1.9),aim=floorPoint.clone().sub(eye).normalize();
const placement=items.placement(held,eye,aim,placer);assert(placement?.valid,'a floor target produces a valid placement');
const placed=items.place(held,placement);assert(placed);bag.remove(0);step(.3);
assert(!placed.broken&&Math.abs(placed.y-(.15+held.size[1]/2+.006))<.01,'careful placement does not break or drop the plate through the floor');
const blockedTarget={...placement,position:new THREE.Vector3(0,1,1.2),valid:true};assert.equal(items.place(propItem('cup','wall-place'),blockedTarget),null,'placement cannot insert a prop into an interior wall');
const fridge=map.interactables.find(a=>a.fixtureKind==='fridge');
fridge.open=true;for(let i=0;i<90;i++){updateFixtureAction(fridge,1/60,null,nav);items.tick(1/60);}
const egg=items.entries.find(e=>e.item.kind==='egg');assert(egg&&!egg.broken,'eggs remain intact on the refrigerated tray');
assert(egg.item.energy>0&&items.entries.find(e=>e.item.kind==='bread').item.energy>0,'foods carry future energy values');

const thrower=createPlayer(),hand=new THREE.Vector3(thrower.x,thrower.y+1.58,thrower.z);
for(const kind of ['plate','bowl','cup','glass','bottle','jar']) {
  const entry=items.drop(propItem(kind,`gentle-drop-${kind}`),thrower);assert(entry);step(1.7);
  assert(!entry.broken&&items.entries.includes(entry),`${kind} tolerates a normal hand-height drop`);assert(items.pickup(entry,bag));bag.remove(bag.slots.findIndex(item=>item?.id===entry.item.id));
}
let impactEvents=0;scene.addEventListener('escape-prop-impact',event=>{assert(event.energy>=0);impactEvents++;});
for(const [kind,dt] of [['cup',1/25],['plate',1/60],['glass',1/144],['egg',1/60]]) {
  const id=`throw-break-${kind}`,entry=items.throw(propItem(kind,id),thrower,hand,new THREE.Vector3(-1,0,0));assert(entry);
  step(1.2,dt);assert(entry.broken&&items.brokenIds.has(id),`${kind} breaks against real geometry at ${1/dt} FPS`);
  assert(!items.pickup(entry,bag));assert.equal(bag.store(entry.item),-1,'broken props cannot return to inventory');
}
const fork=items.throw(propItem('fork','reusable-fork'),thrower,hand,new THREE.Vector3(1,.05,0));assert(fork);step(2);
assert(!fork.broken&&items.entries.includes(fork),'metal cutlery survives its first throw');
assert(fork.x<10.8&&fork.y>=-5.06,'fast cutlery cannot cross the castle wall or cellar slab');
assert(items.pickup(fork,bag));const forkSlot=bag.slots.findIndex(item=>item?.id==='reusable-fork');assert(forkSlot>=0);
const forkAgain=items.throw(bag.slots[forkSlot],thrower,hand,new THREE.Vector3(-1,0,0));assert(forkAgain);bag.remove(forkSlot);step(1.4);
assert(!forkAgain.broken&&items.entries.includes(forkAgain),'recovered cutlery can be thrown again');
assert(forkAgain.x>-10.95,'the swept collision guard also protects a fast narrow utensil at the opposite wall');
const weapon=propItem('crowbar','melee-check'),unbrokenPlate=items.entries.find(e=>e.item.kind==='plate');
assert(items.strike(new THREE.Vector3(unbrokenPlate.x,unbrokenPlate.y+.8,unbrokenPlate.z),new THREE.Vector3(0,-1,0),weapon)?.broken,'a deliberate crowbar hit breaks otherwise tougher ceramics');
const rear=map.doors.find(door=>door.id==='rear');let targetHealth=65;
rear.parts[0].collider.damageable={hit:({damage})=>{targetHealth-=damage;}};
const combatEye=new THREE.Vector3(rear.x,1.7,-5.8);
assert(items.strike(combatEye,new THREE.Vector3(0,0,-1),weapon)?.hit);assert.equal(targetHealth,60,'a registered damageable target receives crowbar damage');
items.strike(new THREE.Vector3(rear.x,1.7,-2),new THREE.Vector3(0,0,-1),weapon);assert.equal(targetHealth,60,'out-of-reach targets do not take melee damage');
delete rear.parts[0].collider.damageable;
const windowTarget=map.breakables.find(target=>target.escapeRoute),windowPlayer={...createPlayer(),x:windowTarget.center().x,y:5.15,z:-5.6};
for(const kind of Object.keys(propTypes).filter(kind=>!['crowbar','bottle','vase'].includes(kind))) {
  assert.equal(windowDamage(propItem(kind,`gate-${kind}`),{speed:24}),0,`${kind} cannot break a window even in a fast collision`);
}
assert.equal(windowDamage(weapon,{melee:true}),35);assert.equal(windowDamage(propItem('bottle','soft-bottle'),{speed:5}),0,'soft bottle contact cannot damage a pane');
for(const kind of ['egg','plate','fork','glass']) {
  const entry=items.throw(propItem(kind,`rejected-window-${kind}`),windowPlayer,new THREE.Vector3(windowPlayer.x,6.73,windowPlayer.z),new THREE.Vector3(0,0,-1));assert(entry);step(.4);
  assert(!windowTarget.broken&&windowTarget.health===60,`${kind} impacts leave window durability untouched`);
  if(items.entries.includes(entry)){assert(items.pickup(entry,bag));bag.remove(bag.slots.findIndex(item=>item?.id===entry.item.id));}
}
const windowThrow=items.throw(propItem('crowbar','window-physics-check'),windowPlayer,new THREE.Vector3(windowPlayer.x,6.73,windowPlayer.z),new THREE.Vector3(0,0,-1));assert(windowThrow);step(.4);
assert(windowTarget.broken,'a strong rigid-body impact also shatters the large window');
assert(!items.physics.ray({x:windowPlayer.x,y:6.5,z:-6.3},{x:windowPlayer.x,y:6.5,z:-7.6}),'the broken pane no longer catches physics rays');
const small=map.breakables.find(target=>!target.escapeRoute&&target.center().z<0&&target.center().y<4),smallPoint=small.center();
const smallThrower={...createPlayer(),x:smallPoint.x,y:.15,z:-5.3},smallEye=new THREE.Vector3(smallPoint.x,1.73,-5.3);
const hardBottle=items.throw(propItem('bottle','allowed-window-bottle'),smallThrower,smallEye,new THREE.Vector3(smallPoint.x,2.4,-6.9).sub(smallEye).normalize());assert(hardBottle);step(.5);
assert(small.broken,'a hard-thrown wine bottle breaks ordinary window glass');
for(const target of map.breakables.filter(target=>!target.escapeRoute)) {
  target.break();const center=target.center(),halfWidth=target.colliders[0].halfX;
  for(const fraction of [-.6,-.3,0,.3,.6])assert(nav.blocked(center.x+halfWidth*fraction,center.y-.625,center.z,false,CROUCH_HEIGHT),'fixed lattice blocks crouched passage through every broken small window');
}
assert(impactEvents>0,'physics impacts expose speed, energy and damage hooks for later pursuit AI');
assert(items.debris.length<=42,'physical fragments have a bounded count');
step(8);assert.equal(items.debris.length,0,'expired fragments are removed without becoming usable items');
console.log('Props OK: one item per slot, pickup/place/drop, stronger ceramics, physics at 25/60/144 FPS, reusable cutlery, melee damage/range, window weapon whitelist and bottle strength, permanent small-window lattice, food data and wardrobe hiding.');
