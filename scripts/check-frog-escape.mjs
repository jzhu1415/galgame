import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createPlayer,advancePlayer,jumpPlayer,setCrouch,createNavigation,escapeStairs,stairHeight,PLAYER_RADIUS,PLAYER_HEIGHT,CROUCH_HEIGHT,WALK_SPEED,CROUCH_SPEED} from '../src/frog-escape-navigation.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createInventory} from '../src/frog-escape-inventory.js';
import {dropPosition} from '../src/frog-escape-items.js';
import {propItem} from '../src/frog-escape-props.js';
import {updateCastleDoor,playerInDoorSwing} from '../src/frog-escape-doors.js';
import {updateFixtureAction,nearestFixture} from '../src/frog-escape-interactions.js';
import {bedEntrances} from '../src/frog-escape-hiding.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';

// Exercise the actual scene geometry and collision data, without starting a browser.
const scene=new THREE.Scene();
const {navigation,doors,groups,roof,playerPin,furnitureTargets,interactables,pickupSeeds,breakables,beds,runClues}=createEscapeScene(scene,{labels:false,difficulty:'easy'});
const player=createPlayer();
function setDoorOpen(door,open=true){door.open=open;updateCastleDoor(door,2);}
assert(!navigation.blocked(player.x,player.y,player.z),'the cellar start is clear');
assert.equal(navigation.support(player.x,player.z,player.y),-5.05);
function walkTo(x,z) {
  for(let i=0;i<1600;i++) {
    const dx=x-player.x,dz=z-player.z,distance=Math.hypot(dx,dz);
    if(distance<.035) return;
    const length=Math.min(distance,WALK_SPEED/60);
    advancePlayer(player,dx/distance*length,dz/distance*length,1/60,navigation);
    assert(Number.isFinite(player.y),'movement must retain a valid floor');
  }
  assert.fail(`Movement stopped at ${player.x},${player.y},${player.z}, towards ${x},${z}`);
}
function route(points) { for(const [x,z] of points) walkTo(x,z); }
route([[-1,3.7],[4,5.6],[8,5.6],[8,4.5],[8,-4.75]]);
assert.equal(player.y,.15,'the cellar stairs reach the first floor');
route([[10,-4.75],[10,5.6],[8,5.6],[8,4.5],[8,-4.75]]);
assert.equal(player.y,5.15,'the next staircase reaches the narrower upper floor');
route([[0,-4.75],[0,5.9]]);
const balcony=doors.find(door=>door.id==='balcony');
assert(navigation.blocked(0,5.15,6.9),'the closed balcony door blocks passage');
setDoorOpen(balcony);route([[0,8.1]]);
assert.equal(player.y,5.15,'the balcony has a supporting floor');
for(let i=0;i<90;i++) advancePlayer(player,0,.06,1/60,navigation);
assert(player.z<8.4,'the balcony rail stops the player');
route([[0,5.9],[0,-4.75],[8,-4.75],[8,4.5],[8,5.6],[10,5.6],[10,-4.75],[1,-5.6]]);
assert.equal(player.y,.15,'the stairs can also be descended');
const front=doors.find(door=>door.id==='front');
assert.equal(front.parts.length,2,'the castle entrance has two door leaves');
assert(navigation.blocked(0,.15,6.9),'the closed double entrance blocks passage');
setDoorOpen(front);
assert(front.parts[0].pivot.rotation.y<0&&front.parts[1].pivot.rotation.y>0,'the double leaves swing outward in opposite directions');
route([[10,-4.75],[10,5.6],[1.8,5.6],[0,6.2],[0,7.8]]);
assert.equal(player.y,.15,'the double entrance opens onto a level front landing');
route([[0,9.4],[0,11.6]]);assert.equal(player.y,-.83,'the wider front stairs reach the garden');
route([[0,9.4],[0,7.8],[0,6.2],[1.8,5.6],[10,5.6],[10,-4.75],[1,-5.6]]);
setDoorOpen(front,false);
const inSwing={...createPlayer(),x:0,y:.15,z:7.8};front.open=true;
for(let frame=0;frame<90;frame++)updateCastleDoor(front,1/60,inSwing);
assert(front.blocked&&front.amount<1,'opening pauses before a door leaf sweeps into the player');
assert(!navigation.blocked(inSwing.x,inSwing.y,inSwing.z,false),'the paused door animation does not trap the player inside a leaf');
inSwing.z=10;for(let frame=0;frame<90;frame++)updateCastleDoor(front,1/60,inSwing);
assert.equal(front.amount,1,'the door finishes opening once the player steps clear');
const rear=doors.find(door=>door.id==='rear');
assert(navigation.blocked(1,.15,-6.9),'the closed rear door blocks passage');
setDoorOpen(rear);
assert(!navigation.blocked(1,.15,-6.9),'the open door uses the real wall opening');
route([[1,-6.2],[1,-8],[1,-10],[5,-11],[12,-10],[16,-7]]);
assert(navigation.blocked(15,-.83,-4),'the new side fence divides the yards');
route([[12,-10],[5,-11],[1,-10],[1,-6.2],[10,-4.75],[10,5.6],[1.8,5.6]]);
setDoorOpen(front);route([[0,6.2],[0,7.8],[0,9.4],[0,11.6],[8,11.6],[11,10],[12,8],[14,8],[15,7],[18,7],[18,0],[15,0]]);
assert.equal(player.y,-.83,'the back steps lead down to the garden');
setDoorOpen(doors.find(door=>door.id==='shed'));
route([[15,3.2]]);
assert.equal(player.y,-.7,'the tool shed has an accessible interior');
route([[15,0],[18,0],[18,7],[15,7],[14,8],[12,8],[11,10],[8,11.6],[0,11.6],[0,9.4],[0,7.8],[0,6.2],[1.8,5.6],[10,5.6],[10,-4.75],[8,-4.75],[8,4.5]]);
assert.equal(player.y,-5.05,'the player can walk all the way back to the cellar');
for(const id of ['bedroom','guestroom','bathroom']) {
  const door=doors.find(item=>item.id===id);assert(door,`${id} has an interactive door`);
  assert(navigation.blocked(door.x,door.y,door.z,false),'a closed room door blocks its real doorway');
  setDoorOpen(door);
  const sign=id==='bathroom'?1:-1;
  const visitor={...createPlayer(),x:door.x-door.normal[0]*sign,y:door.y,z:door.z-door.normal[1]*sign};
  for(let frame=0;frame<50;frame++)advancePlayer(visitor,door.normal[0]*sign*.04,door.normal[1]*sign*.04,1/60,navigation);
  assert((visitor.x-door.x)*door.normal[0]*sign>.7,'the open room door and furniture leave a usable entrance');
  assert(playerInDoorSwing(door,{...visitor,x:door.x,z:door.z}),'closing is guarded in the doorway for either wall orientation');
  setDoorOpen(door,false);
}
for(const name of ['fixture:toilet','fixture:vanity','fixture:mirror','fixture:bathtub','entrance:landing','railing:landing'])assert(scene.getObjectByName(name),`${name} is included in the actual scene`);
assert(navigation.blocked(4.75,.15,-.2),'furniture blocks movement');
assert(navigation.blocked(-18,-.83,-16),'large tree trunks block movement');
assert(navigation.blocked(-19,-.83,-4),'ruined walls provide a physical obstacle');
for(const point of [[0,-21.9],[0,23.9],[-25,0],[25,0]]) assert(navigation.blocked(point[0],-.83,point[1]),'the irregular fence stays closed');
const ray=new THREE.Raycaster();
for(const stair of escapeStairs.slice(0,2)) for(const fraction of [.173,.537,.913]) {
  const z=stair.startZ+(stair.endZ-stair.startZ)*fraction;
  ray.set(new THREE.Vector3(8,stair.top+.1,z),new THREE.Vector3(0,-1,0));
  const hit=ray.intersectObjects(scene.children,true).find(item=>item.point.y<=stair.top+.01);
  assert(hit && Math.abs(hit.point.y-stairHeight(stair,z))<.02,'visible stairs and physical tread heights agree');
}
ray.set(new THREE.Vector3(0,-.25,0),new THREE.Vector3(0,-1,0));
const indoorHits=ray.intersectObjects(scene.children,true);
assert(!indoorHits.some(hit=>Math.abs(hit.point.y+.83)<.02),'the lawn does not cover the underground interior');
const fast=createPlayer();advancePlayer(fast,40,0,.04,navigation);
assert(fast.x<11,'a large horizontal step cannot pass through the castle wall');
const jumper=createPlayer();
assert(jumpPlayer(jumper),'jump starts from the floor');
assert(!jumpPlayer(jumper),'a second jump is blocked in midair');
let apex=jumper.y;
for(let i=0;i<120;i++) {advancePlayer(jumper,0,0,1/60,navigation);apex=Math.max(apex,jumper.y);}
assert(apex>jumper.y+1.2&&apex<jumper.y+1.5,'jump reaches chairs and ordinary crates');
assert.equal(jumper.y,-5.05);assert(jumper.grounded,'jump lands back on the cellar floor');
const highJump={...createPlayer(),grounded:false,velocityY:30};
for(let i=0;i<120;i++) {
  advancePlayer(highJump,0,0,1/60,navigation);
  assert(highJump.y+PLAYER_HEIGHT<=-.2+.0001,'the ceiling blocks a fast upward motion through the floor slab');
}
assert(highJump.grounded);
assert(navigation.blocked(6,-.5,-3.5,false),'the edge of a floor slab also blocks horizontal air movement');
const onTable={...createPlayer(),x:4.75,y:1.8,z:-.2,grounded:false};
for(let i=0;i<90;i++) advancePlayer(onTable,0,0,1/60,navigation);
assert(Math.abs(onTable.y-1.05)<.001&&onTable.grounded,'falling onto furniture lands on its top');
const atFence={...createPlayer(),x:0,y:-.83,z:-21.3};jumpPlayer(atFence);
for(let i=0;i<100;i++)advancePlayer(atFence,0,-WALK_SPEED/60,1/60,navigation);
assert(atFence.z>-21.7,'jumping does not bypass the outer fence');
const atRail={...createPlayer(),x:0,y:5.15,z:8.1};jumpPlayer(atRail);
for(let i=0;i<100;i++)advancePlayer(atRail,0,WALK_SPEED/60,1/60,navigation);
assert(atRail.z<8.4,'air movement cannot use automatic step-up to cross the balcony guard');
for(const target of [furnitureTargets.find(item=>item.type==='chair'),furnitureTargets.find(item=>item.type==='crate'&&item.top<0)]) {
  const floor=target.type==='chair'?.15:-5.05,landZ=target.z-(target.type==='chair'?.12:0);
  const climber={...createPlayer(),x:target.x,y:floor,z:target.z+1.5};
  jumpPlayer(climber);
  for(let i=0;i<150;i++)advancePlayer(climber,0,-Math.min(WALK_SPEED/60,Math.max(0,climber.z-landZ)),1/60,navigation);
  assert(Math.abs(climber.y-target.top)<.02&&climber.grounded,`jump reaches and lands on an actual ${target.type}`);
}
const cellarCrate=furnitureTargets.find(item=>item.type==='crate'&&item.top<0);
const edgeFurniture=[
  {solid:navigation.solids.find(item=>Math.abs(item.x-cellarCrate.x)<.001&&Math.abs(item.z-cellarCrate.z)<.001&&Math.abs(item.maxY-cellarCrate.top)<.001),floor:-5.05,side:1},
  {solid:navigation.solids.find(item=>Math.abs(item.x-4.75)<.001&&Math.abs(item.z+.2)<.001&&Math.abs(item.maxY-1.05)<.001),floor:.15,side:-1},
];
function boxPoint(solid,x,z) {
  return {x:solid.x+x*solid.axisX[0]+z*solid.axisZ[0],z:solid.z+x*solid.axisX[1]+z*solid.axisZ[1]};
}
for(const {solid,floor,side} of edgeFurniture) for(const dt of [1/144,1/60,.04]) {
  assert(solid,'edge regression uses the rendered crate or tabletop');
  for(const offset of [[solid.halfX+PLAYER_RADIUS*.5,0],[solid.halfX+PLAYER_RADIUS*.5,solid.halfZ+PLAYER_RADIUS*.5]]) {
    const position=boxPoint(solid,offset[0]*side,offset[1]);
    const landing={...createPlayer(),...position,y:solid.maxY+.3,velocityY:-4,grounded:false};
    for(let i=0;i<Math.ceil(1/dt);i++)advancePlayer(landing,0,0,dt,navigation);
    assert(Math.abs(landing.y-solid.maxY)<.001&&landing.grounded,'partial foot contact supports a landing at a furniture edge or corner');
    assert(!navigation.blocked(landing.x,landing.y,landing.z,false),'edge landings cannot leave the body inside the furniture');
    jumpPlayer(landing);
    for(let i=0;i<Math.ceil(1.5/dt);i++)advancePlayer(landing,0,0,dt,navigation);
    assert(Math.abs(landing.y-solid.maxY)<.001&&landing.grounded,'jumping repeatedly at the edge returns to the same furniture top');
    for(let i=0;i<Math.ceil(1.2/dt);i++) {
      advancePlayer(landing,solid.axisX[0]*side*dt,solid.axisX[1]*side*dt,dt,navigation);
      assert(landing.y>=floor-.001,'walking off furniture cannot cross the room floor');
      assert(!navigation.blocked(landing.x,landing.y,landing.z,false),'walking off the edge keeps the body outside furniture');
    }
    assert(Math.abs(landing.y-floor)<.001&&landing.grounded,'walking off furniture lands on the current room floor');
  }
  const outsideCorner=boxPoint(solid,(solid.halfX+PLAYER_RADIUS*.8)*side,solid.halfZ+PLAYER_RADIUS*.8);
  assert(navigation.support(outsideCorner.x,outsideCorner.z,solid.maxY,0,PLAYER_RADIUS)<solid.maxY-.01,'a clear diagonal corner does not create invisible support');
  assert(navigation.ceiling(outsideCorner.x,outsideCorner.z,solid.minY)>solid.minY+.01,'a clear diagonal corner is not an overhead obstruction');
}
const lowBeam={x:0,z:0,halfX:2,halfZ:2,minY:1.35,maxY:1.55,axisX:[1,0],axisZ:[0,1]};
const clearance=createNavigation({boundary:navigation.boundary,solids:[lowBeam]});
const crawler={...createPlayer(),x:0,y:.15,z:0};
setCrouch(crawler,true,clearance);
assert(!clearance.blocked(crawler.x,crawler.y,crawler.z,false,CROUCH_HEIGHT),'crouching really reduces collision height');
setCrouch(crawler,false,clearance);assert(crawler.crouched,'the character cannot stand through a low beam');
crawler.x=3;setCrouch(crawler,false,clearance);assert(!crawler.crouched,'standing resumes after clearing the obstruction');
const closeToWall={...createPlayer(),x:10.65,y:.15,z:0,yaw:-Math.PI/2};
assert(dropPosition(closeToWall,navigation).x<10.9,'dropping cannot put an item beyond the wall');
const bag=createInventory();
assert.equal(bag.slots.length,7);
for(let i=0;i<7;i++)assert.equal(bag.store({id:String(i),name:`Item ${i}`}),i);
assert.equal(bag.store({id:'extra',name:'Extra'}),-1,'a full bag does not overwrite an item');
assert.equal(bag.remove(2).id,'2');assert.equal(bag.store({id:'new',name:'New'}),2);
assert(!bag.select(7));bag.select(6);bag.cycle(1);assert.equal(bag.selected,0);bag.cycle(-1);assert.equal(bag.selected,6);
assert(!roof.children.some(mesh=>mesh.geometry?.type==='CylinderGeometry'&&mesh.geometry.parameters.height>3),'the decorative towers no longer penetrate upstairs corners');
assert(interactables.length>=20,'drawers, cupboards, wardrobes and refrigerator are interactive');
const bulbs=[];scene.traverse(node=>{if(node.name==='light:filament-bulb')bulbs.push(node);});
assert(bulbs.length>=10,'ceiling lamps, bedside lamps and entrance lanterns use the detailed bulb');
assert(bulbs.every(bulb=>bulb.children.some(mesh=>mesh.geometry?.type==='LatheGeometry'&&mesh.material.transparent)&&bulb.children.some(mesh=>mesh.geometry?.type==='TubeGeometry'&&mesh.material.emissiveIntensity>0)),'glass envelopes and glowing filaments are modelled inside every bulb');
const tableSettings=[];scene.traverse(node=>{if(node.name==='furniture:tableware')tableSettings.push(node);});
assert.equal(tableSettings.length,4);assert(tableSettings.every(setting=>{let count=0;setting.traverse(mesh=>{if(mesh.geometry?.type==='LatheGeometry')count++;});return count>=2;}),'place settings include shaped plates and hollow cups');
assert.equal(new Set(interactables.map(action=>action.id)).size,interactables.length,'fixture IDs are unique');
function fixtureView(action) {
  const point=action.anchor.getWorldPosition(new THREE.Vector3()),normal=new THREE.Vector3(0,0,1).applyQuaternion(action.anchor.parent.getWorldQuaternion(new THREE.Quaternion()));
  const floor=point.y>4?5.15:point.y<0?-.7:.15;
  for(const distance of [1.5,1.3,1.1,.9])for(const offset of [0,-.25,.25]) {
    const camera=new THREE.PerspectiveCamera();camera.position.copy(point).addScaledVector(normal,distance);
    camera.position.x+=normal.z*offset;camera.position.z-=normal.x*offset;camera.position.y=floor+1.58;
    const viewer={...createPlayer(),x:camera.position.x,y:floor,z:camera.position.z};
    if(navigation.blocked(viewer.x,viewer.y,viewer.z,false))continue;
    const direction=point.clone().sub(camera.position).normalize();
    if(nearestFixture(interactables,viewer,camera,direction,navigation)===action)return {viewer,camera,direction};
  }
  assert.fail(`No clear standing interaction point for ${action.id}`);
}
for(const action of interactables) {
  const locked=!!action.locked;action.locked=false;
  assert(action.colliders.length,'moving fixture geometry has registered colliders');
  fixtureView(action);
  const starts=action.motions.map(motion=>({position:motion.pivot.position.clone(),angle:motion.pivot.rotation[motion.axis]}));
  action.open=true;updateFixtureAction(action,2,null,navigation);assert.equal(action.amount,1);
  assert(action.motions.some((motion,i)=>motion.pivot.position.distanceTo(starts[i].position)>.1||Math.abs(motion.pivot.rotation[motion.axis]-starts[i].angle)>.5),'opening changes the actual model');
  for(const solid of action.colliders)assert(Math.abs(solid.axisX[0]*solid.axisZ[0]+solid.axisX[1]*solid.axisZ[1])<1e-8,'rotating furniture remains unstretched with orthogonal colliders');
  fixtureView(action);
  action.open=false;updateFixtureAction(action,2,null,navigation);assert.equal(action.amount,0);
  for(let i=0;i<starts.length;i++)assert(action.motions[i].pivot.position.distanceTo(starts[i].position)<1e-9&&Math.abs(action.motions[i].pivot.rotation[action.motions[i].axis]-starts[i].angle)<1e-9,'closing exactly restores the original pose');
  action.locked=locked;action.onUpdate?.(0);
}
const refrigerator=interactables.find(action=>action.fixtureKind==='fridge'),fridgeFood=scene.getObjectByName('fridge:food');
assert(fridgeFood.children.length>=15,'the fridge contains modelled food and drinks');
assert(!fridgeFood.visible);refrigerator.open=true;updateFixtureAction(refrigerator,2,null,navigation);
assert(fridgeFood.visible&&scene.getObjectByName('fridge:interior-light').visible,'opening the fridge reveals food and lights its interior');
refrigerator.open=false;updateFixtureAction(refrigerator,2,null,navigation);assert(!fridgeFood.visible);
const guardedDrawer=interactables.find(action=>action.fixtureKind==='drawer'&&action.name.includes('床头柜'));
const drawerPoint=guardedDrawer.anchor.getWorldPosition(new THREE.Vector3()),drawerNormal=new THREE.Vector3(0,0,1).applyQuaternion(guardedDrawer.anchor.parent.getWorldQuaternion(new THREE.Quaternion()));
const atDrawer={...createPlayer(),x:drawerPoint.x+drawerNormal.x*.45,y:5.15,z:drawerPoint.z+drawerNormal.z*.45};
guardedDrawer.open=true;for(let i=0;i<120;i++)updateFixtureAction(guardedDrawer,1/60,atDrawer,navigation);
assert(guardedDrawer.blocked&&guardedDrawer.amount<1,'drawers pause before intersecting the player');
assert(!navigation.blocked(atDrawer.x,atDrawer.y,atDrawer.z,false),'a paused drawer cannot trap the player in its collision');
atDrawer.x+=drawerNormal.x;atDrawer.z+=drawerNormal.z;
for(let i=0;i<120;i++)updateFixtureAction(guardedDrawer,1/60,atDrawer,navigation);assert.equal(guardedDrawer.amount,1);
guardedDrawer.open=false;updateFixtureAction(guardedDrawer,2,null,navigation);
// Input lifecycle checks: pointer capture is stubbed, while movement still uses the real scene.
class Control extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.open=false;this.hidden=false;this.attributes={};this.children=new Map();this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(key,value){this.attributes[key]=value;}
  closest(){return null;}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}
  focus(){document.activeElement=this;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  setPointerCapture(){}
}
const controls=new Map();
globalThis.document=new Control();
document.querySelector=key=>{if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};
const bagButtons=Array.from({length:7},()=>new Control());
document.querySelectorAll=selector=>selector==='[data-inventory-slot]'?bagButtons:[];
document.hidden=false;
const motionPreference={matches:false};
globalThis.window=new Control();window.matchMedia=query=>query==='(prefers-reduced-motion: reduce)'?motionPreference:{matches:false};
const canvas=new Control();
canvas.requestPointerLock=()=>{document.pointerLockElement=canvas;document.dispatchEvent(new Event('pointerlockchange'));return Promise.resolve();};
document.exitPointerLock=()=>{document.pointerLockElement=null;document.dispatchEvent(new Event('pointerlockchange'));};
const explorer=createEscapeExplorer({scene,canvas,stage:new Control(),status:new Control(),navigation,doors,groups,roof,playerPin,interactables,pickupSeeds,beds,onMap(){}});
function dispatch(target,type,props={}){const event=new Event(type,{cancelable:true});for(const [name,value] of Object.entries(props))Object.defineProperty(event,name,{value});target.dispatchEvent(event);return event;}
function key(type,code,repeat=false){return dispatch(document,type,{code,repeat});}
explorer.enter();assert(explorer.active);
assert.equal(explorer.inventory.slots[0].type,'flashlight','the flashlight starts in slot one');
let yaw=explorer.player.yaw;
dispatch(document,'mousemove',{movementX:35,movementY:10});
assert(explorer.player.yaw<yaw,'moving a locked mouse turns the view without a mouse button');
explorer.player.yaw=-Math.PI/2;explorer.player.pitch=0;
const originalX=explorer.player.x;
key('keydown','KeyW');explorer.tick(.04);
const firstStep=explorer.player.x-originalX;
assert(firstStep>0&&firstStep<WALK_SPEED*.04*.5,'W starts with acceleration rather than instant full speed');
explorer.tick(.04);assert(explorer.player.x-originalX-firstStep>firstStep,'the second step is faster than the first');
for(let frame=0;frame<15;frame++)explorer.tick(.02);
const atSpeed=explorer.player.x;explorer.tick(.04);
assert(explorer.player.x-atSpeed>WALK_SPEED*.04*.98,'acceleration reaches the new normal walking speed');
const beforeCrouch=explorer.player.x;key('keydown','ShiftLeft');explorer.tick(.04);
assert(explorer.player.crouched,'Shift lowers the character rather than sprinting');
assert(explorer.player.x-beforeCrouch>CROUCH_SPEED*.04&&explorer.player.x-beforeCrouch<WALK_SPEED*.04,'crouching smoothly slows to its own speed');
assert(explorer.camera.position.y-explorer.player.y<1.58,'the crouched viewpoint is visibly lower');
window.dispatchEvent(new Event('blur'));
const stoppedX=explorer.player.x;explorer.tick(.04);
assert.equal(explorer.player.x,stoppedX,'losing focus pauses movement');
assert(document.querySelector('#escape-pause').open,'pause uses a native dialog');
document.querySelector('#escape-resume').dispatchEvent(new Event('click'));explorer.tick(.04);
assert.equal(explorer.player.x,stoppedX,'resume clears held movement keys');
assert(!explorer.player.crouched,'releasing Shift on a clear floor permits standing');
explorer.showMap();assert(!explorer.active);
explorer.enter();assert.equal(explorer.player.x,stoppedX,'checking the map preserves position');
key('keydown','Digit3');assert.equal(explorer.inventory.selected,2);assert.equal(bagButtons[2].attributes['aria-pressed'],'true');
const wheel=dispatch(canvas,'wheel',{deltaY:100});assert(wheel.defaultPrevented);assert.equal(explorer.inventory.selected,3);
bagButtons[4].dispatchEvent(new Event('click'));assert.equal(explorer.inventory.selected,4,'slots also support clicking');
explorer.showMap();explorer.enter();assert.equal(explorer.inventory.selected,4,'map switching preserves the selected backpack slot');
assert(key('keydown','Space').defaultPrevented,'Space jumps instead of scrolling the page');
assert(!explorer.player.grounded&&explorer.player.velocityY>0);
explorer.tick(.04);const risingVelocity=explorer.player.velocityY;
key('keydown','Space',true);key('keydown','Space');assert.equal(explorer.player.velocityY,risingVelocity,'held and repeated Space cannot create an air jump');
explorer.showMap();
canvas.requestPointerLock=()=>{throw new Error('pointer lock unavailable');};
explorer.enter();yaw=explorer.player.yaw;
dispatch(canvas,'pointerenter',{clientX:100,clientY:100,pointerType:'mouse'});
dispatch(canvas,'pointermove',{clientX:140,clientY:110,pointerType:'mouse',buttons:0});
assert(explorer.player.yaw<yaw,'unlocked mouse movement also turns the view without dragging');
canvas.requestPointerLock=()=>{document.pointerLockElement=canvas;document.dispatchEvent(new Event('pointerlockchange'));return Promise.resolve();};
dispatch(canvas,'pointerdown',{clientX:140,clientY:110,pointerType:'mouse',pointerId:1});
assert.equal(document.pointerLockElement,canvas,'clicking retries pointer lock after an earlier failure');
Object.assign(explorer.player,createPlayer(),{x:1,y:.15,z:-5.2,yaw:0,pitch:0});setDoorOpen(rear,false);
explorer.tick(.04);
assert(!document.querySelector('#escape-interact').hidden,'looking at a nearby door offers interaction');
key('keydown','KeyE');assert(!rear.open,'E cannot operate the back door without its key');const rearKeySlot=explorer.inventory.store(propItem('rearDoorKey','temporary-rear-key'));key('keydown','KeyE');assert(rear.open,'E opens the nearby door with the key');assert(explorer.inventory.slots[rearKeySlot]);explorer.inventory.remove(rearKeySlot);
key('keydown','Digit1');
const lamp=explorer.inventory.slots[0],beam=explorer.camera.children.find(child=>child.isSpotLight);
assert(beam.visible&&lamp.on,'equipping the flashlight enables its beam');
dispatch(canvas,'pointerdown',{button:2,pointerType:'mouse'});assert(!lamp.on&&!beam.visible,'right click switches off the selected flashlight');
dispatch(canvas,'pointerdown',{button:2,pointerType:'mouse'});assert(lamp.on&&beam.visible);
key('keydown','Digit2');assert(!beam.visible,'selecting an empty slot puts away the light');
dispatch(canvas,'pointerdown',{button:2,pointerType:'mouse'});assert(lamp.on,'using an empty slot does not toggle the stored item');
key('keydown','Digit1');key('keydown','KeyQ');
assert.equal(explorer.inventory.slots[0],null);assert.equal(explorer.worldItems.drops.length,1);assert(!beam.visible,'dropping the light also removes its illumination');
key('keydown','KeyQ');assert.equal(explorer.worldItems.drops.length,1,'an empty slot cannot duplicate a dropped item');
for(let i=0;i<100;i++)explorer.tick(1/60);
assert(Math.abs(explorer.worldItems.drops[0].y-.225)<.02,'the dropped flashlight settles on the real floor');
function aimAtDroppedItem() {
  const entry=explorer.worldItems.drops[0],direction=new THREE.Vector3(entry.x-explorer.player.x,entry.y-(explorer.player.y+1.58),entry.z-explorer.player.z).normalize();
  explorer.player.yaw=Math.atan2(-direction.x,-direction.z);explorer.player.pitch=Math.asin(direction.y);explorer.tick(1/60);
}
aimAtDroppedItem();
assert(document.querySelector('#escape-interact').textContent.includes('拾取手电筒'));
key('keydown','KeyE');assert.equal(explorer.worldItems.drops.length,0);assert.equal(explorer.inventory.slots[0].type,'flashlight');
assert(!explorer.inventory.slots[0].on,'pickup does not silently reactivate a dropped flashlight');
dispatch(canvas,'pointerdown',{button:2,pointerType:'mouse'});assert(beam.visible,'the recovered light can be used again');
key('keydown','KeyQ');
for(let i=0;i<7;i++)explorer.inventory.store({id:`test-${i}`,name:'Test item'});
for(let i=0;i<90;i++)explorer.tick(1/60);
aimAtDroppedItem();
key('keydown','KeyE');assert.equal(explorer.worldItems.drops.length,1,'a full inventory leaves the pickup in the world');
explorer.inventory.remove(0);explorer.tick(1/60);key('keydown','KeyE');assert.equal(explorer.worldItems.drops.length,0,'freeing a slot permits pickup');
assert(navigation.blocked(0,.15,1.2),'the former gap between first-floor partitions is closed');
assert(navigation.blocked(-2.625,-5.05,6.3),'the cellar divider meets the exterior wall');
assert(navigation.blocked(-1.1*1.0625,5.15,6.3),'the bedroom divider meets the front wall');
for(const id of ['bedroom','guestroom','bathroom']) {
  const door=doors.find(item=>item.id===id),sign=id==='bathroom'?1:-1;
  setDoorOpen(door,false);
  Object.assign(explorer.player,createPlayer(),{x:door.x-door.normal[0]*sign*.85,y:door.y,z:door.z-door.normal[1]*sign*.85,yaw:sign>0?-Math.PI/2:Math.PI/2});
  explorer.tick(1/60);
  assert(!document.querySelector('#escape-interact').hidden&&document.querySelector('#escape-interact').textContent.includes(door.name),'each room door offers a visible E prompt from the corridor');
  key('keydown','KeyE');assert(door.open,'E opens each bedroom and bathroom door');
  for(let frame=0;frame<90;frame++)explorer.tick(1/60);
  assert.equal(door.amount,1,'room door animation completes without hitting the corridor player');
  key('keydown','KeyE');assert(!door.open,'E closes the room door when standing clear of its swing');
  for(let frame=0;frame<90;frame++)explorer.tick(1/60);
  assert.equal(door.amount,0);
}
for(const {solid,floor,side} of edgeFurniture) {
  for(let step=0;step<=12;step++) {
    const angle=step/12*Math.PI/2,radius=PLAYER_RADIUS+.018;
    const position=boxPoint(solid,(solid.halfX+Math.cos(angle)*radius)*side,solid.halfZ+Math.sin(angle)*radius);
    Object.assign(explorer.player,createPlayer(),position,{y:floor});
    explorer.tick(1/60);
    assert(Math.abs(explorer.player.y-floor)<.001,'circling furniture corners keeps the player on the current floor');
    assert(explorer.camera.position.y>explorer.player.y+1.5,'furniture bases and corners cannot force the camera through the floor');
    jumpPlayer(explorer.player);
    for(let frame=0;frame<90;frame++) {
      explorer.tick(1/60);
      assert(explorer.camera.position.y>explorer.player.y+1.5,'jumping beside furniture keeps the viewpoint at standing eye height');
      assert(explorer.player.y>=floor-.001,'jumping beside furniture cannot land on the floor below');
    }
  }
}
function aimAtFixture(action,viewer) {
  const point=action.anchor.getWorldPosition(new THREE.Vector3());
  const direction=point.sub(new THREE.Vector3(viewer.x,viewer.y+1.58,viewer.z)).normalize();
  Object.assign(explorer.player,viewer,{yaw:Math.atan2(-direction.x,-direction.z),pitch:Math.asin(direction.y)});
  explorer.tick(1/60);
}
for(const action of interactables) {
  const {viewer}=fixtureView(action);aimAtFixture(action,viewer);
  assert(!document.querySelector('#escape-interact').hidden,'aiming at a fixture presents an interaction prompt');
  if(action.locked) {key('keydown','KeyE');assert(!action.open&&action.locked,'a locked tool chest refuses E without its key');continue;}
  key('keydown','KeyE');assert(action.open,`E opens ${action.id}`);
  for(let frame=0;frame<100;frame++)explorer.tick(1/60);
  assert.equal(action.amount,1,`${action.id} can finish opening from a reachable standing point`);
  if(action===refrigerator){explorer.showMap();explorer.enter();assert(action.open&&fridgeFood.visible,'checking the map preserves the open fridge and its food');}
  aimAtFixture(action,viewer);key('keydown','KeyE');assert(!action.open,`E closes ${action.id}`);
  for(let frame=0;frame<100;frame++)explorer.tick(1/60);assert.equal(action.amount,0);
}
for(const action of interactables.filter(action=>action.hideVolume)) {
  action.open=true;updateFixtureAction(action,2,null,navigation);
  const point=action.hideVolume.root.localToWorld(new THREE.Vector3(0,.125,0)),viewer={...createPlayer(),x:point.x,y:point.y,z:point.z};
  aimAtFixture(action,viewer);key('keydown','KeyE');assert(!action.open,'E can close the wardrobe from its inside');
  for(let frame=0;frame<100;frame++)explorer.tick(1/60);
  assert(explorer.player.hidden&&explorer.player.hidingWardrobe===action.id,'the closed wardrobe reports a hiding state');
  aimAtFixture(action,viewer);key('keydown','KeyE');assert(action.open,'the hidden player can reopen the wardrobe');
  for(let frame=0;frame<100;frame++)explorer.tick(1/60);assert(!explorer.player.hidden);
  // Restore this scenario's panels before testing bed access separately: the
  // relocated guest wardrobe can cover the bedside when its doors are open.
  action.open=false;updateFixtureAction(action,2,null,navigation);
}
for(let i=1;i<7;i++)explorer.inventory.remove(i);
const scenePlate=explorer.worldItems.entries.find(entry=>entry.item.kind==='plate'),plateIdentity=scenePlate.item.id;
function aimAtPoint(point,viewer) {
  const direction=new THREE.Vector3(point.x-viewer.x,point.y-viewer.y-1.58,point.z-viewer.z).normalize();
  Object.assign(explorer.player,viewer,{yaw:Math.atan2(-direction.x,-direction.z),pitch:Math.asin(direction.y)});explorer.tick(1/60);
}
const propViewer={...createPlayer(),x:2.1,y:.15,z:scenePlate.z};
aimAtPoint(scenePlate,propViewer);key('keydown','KeyE');assert(explorer.inventory.slots.some(item=>item?.id===plateIdentity),'E picks an aimed table plate into the real hotbar');
key('keydown','Digit2');aimAtPoint({x:2.1,y:.15,z:-1.9},propViewer);
assert(document.querySelector('#escape-interact').textContent.includes('放置'),'a valid aimed surface presents the placement prompt');
key('keydown','KeyE');assert(!explorer.inventory.slots[1],'E places the selected plate and clears exactly one slot');
const placedPlate=explorer.worldItems.drops.find(entry=>entry.item.id===plateIdentity);assert(placedPlate&&!placedPlate.broken);
aimAtPoint(placedPlate,propViewer);key('keydown','KeyE');assert.equal(explorer.inventory.slots[1]?.id,plateIdentity,'a carefully placed plate can be picked up again');
dispatch(canvas,'pointerdown',{button:2,pointerType:'mouse'});assert(!explorer.inventory.slots[1],'right click launches the selected prop');
for(let frame=0;frame<100;frame++)explorer.tick(1/60);
assert(explorer.worldItems.brokenIds.has(plateIdentity),'the thrown plate breaks after its physical impact');
runClues.readNote(); // This regression's tool route starts after the mandatory clue; E reading is covered by the victory integration.
const chest=interactables.find(action=>action.id==='shed-tool-chest');
const cuttersEntry=explorer.worldItems.entries.find(entry=>entry.item.kind==='boltCutters');
assert(chest.locked&&!chest.content.visible&&!explorer.worldItems.pickup(cuttersEntry,explorer.inventory),'cutters cannot be picked through the locked lid');
const toiletKey=explorer.worldItems.entries.find(entry=>entry.item.kind==='shedKey');
assert.equal(toiletKey.mesh.name,'quest:toilet-key');
aimAtPoint(toiletKey,{...createPlayer(),x:toiletKey.x,y:5.15,z:toiletKey.z+.8});
assert(document.querySelector('#escape-interact').textContent.includes('工具箱钥匙'),'the key can be aimed at inside the actual hollow toilet');
key('keydown','KeyE');assert(explorer.inventory.slots.some(item=>item?.kind==='shedKey'),'E collects the toilet key');
const leaningBar=explorer.worldItems.entries.find(entry=>entry.item.kind==='crowbar');
assert.equal(leaningBar.mesh.name,'quest:leaning-crowbar');
assert(leaningBar.mesh.rotation.z>.3,'the longer crowbar starts leaning against the shed wall');
aimAtPoint(leaningBar,{...createPlayer(),x:14.1,y:-.7,z:leaningBar.z});
key('keydown','KeyE');assert(explorer.inventory.slots.some(item=>item?.kind==='crowbar'),'E picks up the leaning shed crowbar');
const chestView=fixtureView(chest);aimAtFixture(chest,chestView.viewer);key('keydown','KeyE');assert(chest.locked,'carrying a key no longer lets E unlock the chest');
const keySlot=explorer.inventory.slots.findIndex(item=>item?.kind==='shedKey');key('keydown',`Digit${keySlot+1}`);
dispatch(canvas,'pointerdown',{button:2,pointerType:'mouse'});assert(!chest.locked&&!chest.open&&chest.insertedKey,'right click inserts the selected key without opening the lid');key('keydown','KeyE');
for(let frame=0;frame<90;frame++)explorer.tick(1/60);
assert(!chest.locked&&chest.amount===1&&chest.content.visible,'the inserted key lets E open the chest and expose its content');
aimAtPoint(cuttersEntry,{...createPlayer(),x:cuttersEntry.x,y:-.7,z:4.5});key('keydown','KeyE');
assert(explorer.inventory.slots.some(item=>item?.kind==='boltCutters'),'E retrieves the cutters from the open chest');
const windowTarget=breakables.find(target=>target.escapeRoute),windowPoint=windowTarget.center();
assert(navigation.blocked(windowPoint.x,5.7,-6.9,false),'intact window glass blocks a standing body');
const barSlot=explorer.inventory.slots.findIndex(item=>item?.kind==='crowbar');key('keydown',`Digit${barSlot+1}`);
aimAtPoint(windowPoint,{...createPlayer(),x:windowPoint.x,y:5.15,z:-5.7});
let meleeCount=0;scene.addEventListener('escape-melee-strike',()=>meleeCount++);
dispatch(canvas,'pointerdown',{button:0,pointerType:'mouse'});
for(let frame=0;frame<12;frame++)explorer.tick(1/60);
assert(windowTarget.health===60&&meleeCount===0,'the 0.2 second windup cannot damage the window');
for(let frame=0;frame<12;frame++)explorer.tick(1/60);
assert(!windowTarget.broken&&windowTarget.health===25&&meleeCount===1,'one crowbar strike cracks the stronger window without breaking it');
dispatch(canvas,'pointerdown',{button:0,pointerType:'mouse'});explorer.tick(1/60);
assert.equal(meleeCount,1,'swing cooldown prevents immediate repeated hits');
for(let frame=0;frame<46;frame++)explorer.tick(1/60);
dispatch(canvas,'pointerdown',{button:0,pointerType:'mouse'});explorer.tick(1/60);
assert.equal(meleeCount,1,'a click just before the 1.2 second interval is still rejected');
dispatch(canvas,'pointerdown',{button:0,pointerType:'mouse'});for(let frame=0;frame<24;frame++)explorer.tick(1/60);
assert(windowTarget.broken&&meleeCount===2,'a second deliberate crowbar strike breaks the large window');
assert(!navigation.blocked(windowPoint.x,5.7,-6.9,false),'breaking the glass removes its navigation collision');
assert(navigation.lineClear({x:windowPoint.x,y:6.5,z:-6},{x:windowPoint.x,y:6.5,z:-8}),'the broken opening is clear for aiming');
const glassHit=explorer.worldItems.physics.ray({x:windowPoint.x,y:6.5,z:-6},{x:windowPoint.x,y:6.5,z:-8});
assert(!glassHit,'the physics world also removes the broken pane immediately');
explorer.player.yaw=0;explorer.player.pitch=0;key('keydown','Space');key('keydown','KeyW');
for(let frame=0;frame<75;frame++)explorer.tick(1/60);key('keyup','KeyW');
for(let frame=0;frame<90;frame++)explorer.tick(1/60);
assert(explorer.player.z<-7.5&&Math.abs(explorer.player.y+.83)<.02&&explorer.player.grounded,'the player can jump through the broken window and land in the rear garden');
explorer.showMap();explorer.enter();assert(windowTarget.broken&&!chest.locked,'map mode keeps the opened chest and broken escape window');
for(const bed of beds) {
  const entrance=bedEntrances(bed).find(point=>!navigation.blocked(point.x,point.y,point.z,false));assert(entrance);
  explorer.showMap();Object.assign(explorer.player,createPlayer(),{x:entrance.x,y:entrance.y,z:entrance.z});explorer.enter();explorer.tick(.04);
  // This test teleports directly from the previous bed; allow the normal
  // low-to-standing camera transition to finish before aiming at the next one.
  for(let frame=0;frame<30;frame++)explorer.tick(1/60);
  assert(document.querySelector('#escape-interact').textContent.includes('躲进床底'),`standing beside each bed offers an E hiding prompt: ${JSON.stringify({bed:bed.id,prompt:document.querySelector('#escape-interact').textContent,x:explorer.player.x,y:explorer.player.y,z:explorer.player.z,hidden:explorer.player.hidden,captured:explorer.captured})}`);
  key('keydown','KeyE');explorer.tick(.04);
  assert(explorer.player.hidingBed===bed.id&&explorer.player.hidden,'E enters a real bed hiding state');
  const hidden={x:explorer.player.x,y:explorer.player.y,z:explorer.player.z},attacksBefore=meleeCount;
  assert(explorer.camera.position.y-hidden.y>.35&&explorer.camera.position.y-hidden.y<.5,'the bed viewpoint stays below the raised frame');
  key('keydown','KeyW');key('keydown','KeyA');key('keydown','ShiftLeft');key('keydown','Space');
  dispatch(canvas,'pointerdown',{button:0,pointerType:'mouse'});
  for(let frame=0;frame<40;frame++)explorer.tick(1/60);
  assert.deepEqual({x:explorer.player.x,y:explorer.player.y,z:explorer.player.z},hidden,'walking, crouching and jumping cannot move the hidden player');
  assert.equal(meleeCount,attacksBefore,'attacking is disabled under the bed');
  const hiddenYaw=explorer.player.yaw;dispatch(document,'mousemove',{movementX:20,movementY:0});assert(explorer.player.yaw!==hiddenYaw,'the hidden player may still look around');
  explorer.showMap();explorer.enter();explorer.tick(.04);assert.equal(explorer.player.hidingBed,bed.id,'map switching retains the bed hiding state');
  explorer.pause();document.querySelector('#escape-resume').dispatchEvent(new Event('click'));explorer.tick(.04);assert(explorer.player.hidden);
  key('keydown','KeyE');explorer.tick(.04);
  assert(!explorer.player.hidingBed&&!explorer.player.hidden,'pressing E again leaves the bed');
  assert(Math.hypot(explorer.player.x-entrance.x,explorer.player.z-entrance.z)<.01&&!navigation.blocked(explorer.player.x,explorer.player.y,explorer.player.z,false),'exit returns to a clear bedside position');
}
const forest=scene.getObjectByName('vegetation:old-estate');assert(forest.userData.treeCount>=10&&forest.userData.eaveBranches>=6);
assert(scene.getObjectByName('vegetation:long-leaves').count>8000&&scene.getObjectByName('vegetation:fence-leaves').count>1000&&scene.getObjectByName('vegetation:fallen-leaves').count>1500,'long foliage, fence growth and ground litter are instanced in the real scene');
assert(scene.getObjectByName('vegetation:outer-ground'),'outside trees have matching ground');
forest.traverse(mesh=>assert(!mesh.userData.solid,'decorative foliage does not add invisible navigation obstacles'));
// Use the same live controller at each frame rate, including its real collision and camera paths.
function resetWalker(position={}) {
  explorer.showMap();Object.assign(explorer.player,createPlayer(),{yaw:-Math.PI/2},position);explorer.enter();
  for(let frame=0;frame<30;frame++)explorer.tick(1/60);
}
const walkingDistances=[];
for(const fps of [25,60,144]) {
  resetWalker();const start=explorer.player.x;let bobPeak=0;
  key('keydown','KeyW');
  for(let frame=0;frame<fps;frame++) {
    explorer.tick(1/fps);
    bobPeak=Math.max(bobPeak,Math.abs(explorer.camera.position.y-explorer.player.y-1.58));
    assert(Math.abs(explorer.camera.rotation.z)<=.001201,'walking roll stays subtle');
  }
  walkingDistances.push(explorer.player.x-start);
  assert(bobPeak>.009&&bobPeak<.0141,'actual walking has a gentle bounded eye-height bob');
  key('keyup','KeyW');const releaseX=explorer.player.x;
  for(let frame=0;frame<fps;frame++)explorer.tick(1/fps);
  assert(explorer.player.x-releaseX<.15,'releasing movement brakes promptly');
  const idleX=explorer.player.x;
  for(let frame=0;frame<fps;frame++)explorer.tick(1/fps);
  assert.equal(explorer.player.x,idleX,'idle has no residual sliding');
  assert(Math.abs(explorer.camera.position.y-explorer.player.y-1.58)<.00001&&Math.abs(explorer.camera.rotation.z)<.00001,'walking sway settles completely when idle');
}
assert(Math.max(...walkingDistances)-Math.min(...walkingDistances)<.0001,'acceleration covers the same distance at 25, 60 and 144 FPS');
resetWalker();key('keydown','ShiftLeft');
for(let frame=0;frame<60;frame++)explorer.tick(1/60);
key('keydown','KeyW');let crouchBobPeak=0;
for(let frame=0;frame<60;frame++){explorer.tick(1/60);crouchBobPeak=Math.max(crouchBobPeak,Math.abs(explorer.camera.position.y-explorer.player.y-.9));}
assert(crouchBobPeak>.002&&crouchBobPeak<.005,'crouch walking has a softer bob');
key('keydown','Space');for(let frame=0;frame<15;frame++)explorer.tick(1/60);
assert(!explorer.player.grounded&&Math.abs(explorer.camera.rotation.z)<.00002,'walking sway fades while airborne');
resetWalker({x:10.65,y:.15,z:0});key('keydown','KeyW');
for(let frame=0;frame<120;frame++)explorer.tick(1/60);
const blockedX=explorer.player.x;
for(let frame=0;frame<30;frame++)explorer.tick(1/60);
assert.equal(explorer.player.x,blockedX,'holding forward against a wall cannot move through it');
assert(Math.abs(explorer.camera.position.y-explorer.player.y-1.58)<.00001,'pushing against a wall does not keep walking sway');
resetWalker();motionPreference.matches=true;key('keydown','KeyW');
for(let frame=0;frame<60;frame++) {
  explorer.tick(1/60);
  assert(Math.abs(explorer.camera.position.y-explorer.player.y-1.58)<.00001&&explorer.camera.rotation.z===0,'reduced motion disables walking sway');
}
motionPreference.matches=false;explorer.pause();const pausedX=explorer.player.x;
assert.equal(explorer.camera.rotation.z,0,'pausing resets camera roll');
document.querySelector('#escape-resume').dispatchEvent(new Event('click'));explorer.tick(.04);
assert.equal(explorer.player.x,pausedX,'resuming clears acceleration and held input');
key('keydown','KeyM');assert(!explorer.active,'M returns to the map');
const pursuer=createNaiwaPursuer({scene,navigation,doors,worldItems:explorer.worldItems,player:explorer.player,onCatch:()=>explorer.capture()});explorer.setPursuer(pursuer);
explorer.enter();for(let frame=0;frame<30;frame++)explorer.tick(1/60);
explorer.pause();const enemyBeforePause={x:pursuer.actor.x,y:pursuer.actor.y,z:pursuer.actor.z};
for(let frame=0;frame<30;frame++)explorer.tick(1/60);
assert.deepEqual({x:pursuer.actor.x,y:pursuer.actor.y,z:pursuer.actor.z},enemyBeforePause,'pause freezes the actual pursuer');
document.querySelector('#escape-resume').dispatchEvent(new Event('click'));
const carried=explorer.inventory.slots.map(item=>item?.id??null),beforeCaptureHealth=explorer.player.health;
explorer.capture();assert(explorer.captured&&explorer.paused&&document.querySelector('#escape-caught').open,'capture shows the dedicated retry dialog');
assert.equal(explorer.player.health,beforeCaptureHealth-30,'fainting costs thirty health');
assert(explorer.player.x===-6.25&&explorer.player.y===-5.05,'fainting immediately returns the player to the cellar');
key('keydown','KeyW');explorer.tick(.04);assert.equal(explorer.player.x,-6.25,'captured controls cannot move');
document.querySelector('#escape-caught-map').dispatchEvent(new Event('click'));assert(!explorer.active&&explorer.captured);
explorer.enter();assert(explorer.paused&&document.querySelector('#escape-caught').open,'returning from map cannot bypass a capture');
document.querySelector('#escape-caught-retry').dispatchEvent(new Event('click'));
assert(!explorer.captured&&!explorer.paused&&explorer.player.y===-5.05&&explorer.player.x===-6.25,'retry resets player position and resumes safely');
assert.equal(pursuer.health,20);assert.equal(pursuer.state,'patrol');assert.deepEqual(explorer.inventory.slots.map(item=>item?.id??null),carried,'retry preserves carried tools');
assert.equal(explorer.player.health,beforeCaptureHealth-30,'waking and manual repositioning do not refill health');
assert(windowTarget.broken&&!chest.locked,'retry preserves the open chest and broken window');
pursuer.dispose();explorer.setPursuer(null);explorer.showMap();
console.log('Castle exploration OK: start, both staircases up/down, balcony guards, back steps, doors, shed, furniture, trees, ruins, irregular fence, real geometry and large-step collision.');
console.log('Exploration controls OK: move, lose-focus pause, resume, cleared input, map position retention and nearby door interaction.');
console.log('Natural movement OK: gradual acceleration, normal walking speed, smooth crouch transition, short braking, stable distance at 25/60/144 FPS, gentle walking bob, reduced crouch bob, airborne/wall/idle fade, pause reset and reduced motion.');
console.log('Equipment and posture OK: Shift crouch, safe standing, slower normal movement, jumping onto real chairs/crates, selected flashlight use, drop/settle/pickup, full inventory handling and no duplication.');
console.log('Furniture edges OK: partial landings, repeated jumps, walking off edges, clear diagonal corners and camera height at 25/60/144 FPS.');
console.log('Castle doors and fittings OK: clear double entrance, opposite leaf animation, front landing/stairs, closed/open bedroom and bathroom routes, moving leaf colliders and sanitary fittings.');
console.log('Storage and lighting OK: all fixtures reachable, E opens/closes drawers and cupboards, guarded motion and dynamic colliders, fridge food/light and map persistence, intrusive corner towers removed.');
console.log('Player prop controls OK: E pickup, hotbar selection, aimed E placement, pickup again, right click physics launch and break; E inside the wardrobe closes/reopens it and updates hiding state.');
console.log('Tool route OK: locked chest blocks pickup, toilet key is reachable with E, longer leaning crowbar pickup, key unlock, cutters retrieval, charged crowbar strikes and 1.2 second cooldown, glass navigation/physics removal and jumping through the window into the rear garden.');
console.log('Bed and garden OK: both raised beds offer E hide/exit, low clear viewpoint, movement/jump/attack lock, looking around, map/pause retention and safe exit; ancient trees, eave branches, fence growth and fallen leaves are batched without foliage colliders.');
console.log('Pursuit interface OK: real pursuer pauses with the game, dedicated capture dialog, map cannot bypass capture, retry restores positions and retains tools, chest and window progress.');
