import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createNavigation,createPlayer,upperBalcony,jumpPlayer,advancePlayer,SPRINT_SPEED} from '../src/frog-escape-navigation.js';
import {createInventory,INVENTORY_SIZE} from '../src/frog-escape-inventory.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {propItem,windowDamage} from '../src/frog-escape-props.js';
import {damagePlayer,healPlayer,itemDamage,projectileDamage} from '../src/frog-escape-vitals.js';
import {createCastleDoor,syncBoxCollider,updateCastleDoor} from '../src/frog-escape-doors.js';
import {insertFixtureKey} from '../src/frog-escape-interactions.js';
import {propSoundMaterial} from '../src/frog-escape-audio.js';
import {inventoryItemIcon} from '../src/frog-escape-inventory-icons.js';

const boundary=[[-40,-40],[40,-40],[40,40],[-40,40]];
const run=(seconds,tick,fps=60)=>{for(let rest=seconds;rest>1e-9;){const dt=Math.min(1/fps,rest);tick(dt);rest-=dt;}};
assert.equal(INVENTORY_SIZE,7);const bag=createInventory();for(let i=0;i<7;i++)assert.equal(bag.store(propItem('bread','slot-'+i)),i);
assert.equal(bag.store(propItem('bread','overflow')),-1);bag.select(6);bag.cycle(1);assert.equal(bag.selected,0);bag.cycle(-1);assert.equal(bag.selected,6);
const html=readFileSync('frog-escape-map.html','utf8');assert.equal([...html.matchAll(/data-inventory-slot=/g)].length,7);
for(const kind of['rearDoorKey','vase'])assert(inventoryItemIcon(propItem(kind,kind)).startsWith('<svg'));

class Control extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.children=new Map();this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(k,v){this[k]=v;}closest(){return null;}focus(){}showModal(){this.open=true;}close(){this.open=false;}setPointerCapture(){}
  querySelector(k){if(!this.children.has(k))this.children.set(k,new Control());return this.children.get(k);}
}
function dispatch(target,type,props={}){const event=new Event(type,{cancelable:true});for(const[k,v]of Object.entries(props))Object.defineProperty(event,k,{value:v});target.dispatchEvent(event);return event;}
globalThis.localStorage={getItem:()=>null,setItem(){}};
function explorerSetup({castle=null,reduce=false}={}) {
  const controls=new Map(),slots=Array.from({length:7},()=>new Control());globalThis.document=new Control();document.querySelector=k=>{if(!controls.has(k))controls.set(k,new Control());return controls.get(k);};document.querySelectorAll=()=>slots;
  const preference=new EventTarget();preference.matches=reduce;globalThis.window=new Control();window.matchMedia=q=>q==='(prefers-reduced-motion: reduce)'?preference:{matches:false};
  const scene=castle?.scene??new THREE.Scene(),navigation=castle?.navigation??createNavigation({solids:[],stairs:[],boundary}),canvas=new Control(),animations=[],pin=new THREE.Object3D();scene.add(pin);
  canvas.requestPointerLock=()=>Promise.resolve();canvas.animate=(frames,options)=>{const animation={frames,options,cancelled:false,cancel(){this.cancelled=true;}};animations.push(animation);return animation;};
  const explorer=createEscapeExplorer({scene,canvas,navigation,stage:new Control(),status:new Control(),groups:castle?.groups??{labels:new THREE.Group()},roof:castle?.roof??new THREE.Group(),playerPin:pin,doors:castle?.doors??[],interactables:castle?.interactables??[],pickupSeeds:castle?.pickupSeeds??[],onMap(){}});
  explorer.enter();const key=code=>dispatch(document,'keydown',{code});return {scene,navigation,explorer,controls,canvas,slots,animations,preference,key};
}
{
  const test=explorerSetup(),{explorer,key,slots,animations}=test;key('Digit7');assert.equal(explorer.inventory.selected,6);assert.equal(slots[6]['aria-pressed'],'true');key('Numpad6');assert.equal(explorer.inventory.selected,5);
  const position={x:explorer.player.x,y:explorer.player.y,z:explorer.player.z},camera=explorer.camera.position.clone();
  damagePlayer(explorer.player,6,'slam');assert.equal(animations.length,1);assert.equal(animations[0].options.duration,220);
  assert.deepEqual({x:explorer.player.x,y:explorer.player.y,z:explorer.player.z},position);assert(explorer.camera.position.equals(camera),'damage feedback does not move the player or aiming camera');
  healPlayer(explorer.player,3);damagePlayer(explorer.player,0,'fall');assert.equal(animations.length,1,'healing and zero damage do not shake');
  damagePlayer(explorer.player,8,'fall');assert.equal(animations.length,2);assert(animations[0].cancelled,'repeated damage replaces the brief shake');
  explorer.pause();assert(animations[1].cancelled);test.preference.matches=true;test.preference.dispatchEvent(new Event('change'));damagePlayer(explorer.player,8,'chair');assert.equal(animations.length,2,'reduced motion disables damage shake');
}
{
  delete globalThis.document;
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),spawn={x:0,y:.15,z:0},player={...createPlayer(),hidden:true};
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:{physics:{addActor:()=>({remove(){}}),syncActors(){}}},player,spawn,patrolRoute:[spawn],random:()=>.99});
  const key=scene.getObjectByName('naiwa:waist-key'),shadow=scene.getObjectByName('naiwa:contact-shadow');assert(key?.visible&&shadow?.visible);
  assert(shadow.material.transparent&&!shadow.material.depthWrite&&shadow.material.map.isDataTexture);assert(key.children.length&&key.position.y>player.y);
  const aim=()=>{const origin=key.position.clone().add(new THREE.Vector3(0,1,1)),direction=key.position.clone().sub(origin).normalize();return {origin,direction};};
  let view=aim(),inventory=createInventory();assert(!npc.pickupKey(inventory,view.origin,view.direction),'a standing Naiwa cannot be robbed');
  npc.hit({damage:100});view=aim();assert(npc.nearbyKey(view.origin,view.direction).available);
  for(let i=0;i<7;i++)inventory.store(propItem('bread','full-'+i));assert(!npc.pickupKey(inventory,view.origin,view.direction));assert(key.visible,'a full inventory cannot lose the waist key');
  inventory.remove(6);assert(npc.pickupKey(inventory,view.origin,view.direction));assert.equal(inventory.slots[6].kind,'rearDoorKey');assert(!key.visible);assert(!npc.pickupKey(inventory,view.origin,view.direction));
  run(9,dt=>npc.tick(dt));assert(!key.visible,'getting up cannot regenerate a stolen key');npc.reset({keepAlertness:true});assert(!key.visible,'waking and position reset preserve theft');
  for(const y of[-5.05,.15,5.15]){Object.assign(npc.actor,{x:0,y,z:0});npc.setMapLayer('all');assert(Math.abs(shadow.position.y-y-.012)<1e-6,'the shadow follows the current floor');}
  npc.setMapLayer('yard');assert(!shadow.visible&&!key.visible);npc.dispose();assert(!scene.getObjectByName('naiwa:contact-shadow'));
}

// A real hinged door and real navigation test closing after crossing in both
// directions, with and without the waist key, independently of player locks.
for(const fps of[30,60,144])for(const taken of[false,true])for(const side of[-1,1]) {
  delete globalThis.document;const scene=new THREE.Scene(),parent=new THREE.Group();scene.add(parent);
  const material=new THREE.MeshStandardMaterial(),door=createCastleDoor({parent,id:'rear',name:'厨房后门',x:0,y:.15,z:0,width:1.42,swing:-1,materials:{wood:material,darkWood:material,gold:material,stone:material,iron:material}});door.playerKeyKind='rearDoorKey';
  const solids=[{x:-2,z:0,halfX:1.25,halfZ:.12,minY:.15,maxY:3,axisX:[1,0],axisZ:[0,1]},{x:2,z:0,halfX:1.25,halfZ:.12,minY:.15,maxY:3,axisX:[1,0],axisZ:[0,1]}];
  for(const part of door.parts){part.collider={dynamic:true};syncBoxCollider(part.leaf,part.collider);solids.push(part.collider);}
  const navigation=createNavigation({solids,stairs:[],doors:[door],boundary}),player={...createPlayer(),x:10,y:.15,z:8,hidden:true},spawn={x:0,y:.15,z:side*1.7};
  const npc=createNaiwaPursuer({scene,navigation,doors:[door],worldItems:{physics:{addActor:()=>({remove(){}}),syncActors(){}}},player,spawn,patrolRoute:[{x:0,y:.15,z:-side*3.2}],random:()=>.99});
  if(taken){npc.hit({damage:100});const key=scene.getObjectByName('naiwa:waist-key'),origin=key.position.clone().add(new THREE.Vector3(0,1,1));assert(npc.pickupKey(createInventory(),origin,key.position.clone().sub(origin).normalize()));npc.reset({keepAlertness:true});}
  let opened=false,closed=false;
  for(let i=0;i<fps*20;i++){updateCastleDoor(door,1/fps,[player,npc.actor],navigation);npc.tick(1/fps);opened||=door.open;if(opened&&npc.actor.z*side<-.8&&!door.open&&door.amount<.01){closed=true;break;}}
  assert(opened&&closed&&npc.actor.z*side<-.8,`Naiwa passes and closes its own door at ${fps} FPS, key taken=${taken}, side=${side}: ${JSON.stringify({z:npc.actor.z,open:door.open,amount:door.amount,state:npc.state})}`);npc.dispose();
}

{
  const {explorer,scene,navigation,key,controls}=explorerSetup(),spawn={x:0,y:.15,z:0},npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:explorer.worldItems,player:explorer.player,spawn,patrolRoute:[spawn],random:()=>.99});explorer.setPursuer(npc);
  const waist=scene.getObjectByName('naiwa:waist-key');
  function aim(){Object.assign(explorer.player,{x:waist.position.x,y:.15,z:waist.position.z-1.3});const direction=waist.position.clone().sub(new THREE.Vector3(explorer.player.x,1.73,explorer.player.z)).normalize();explorer.player.yaw=Math.atan2(-direction.x,-direction.z);explorer.player.pitch=Math.asin(direction.y);explorer.tick(.02);}
  aim();key('KeyE');assert(!explorer.inventory.slots.some(i=>i?.kind==='rearDoorKey'));npc.hit({damage:100});aim();assert(controls.get('#escape-interact').textContent.includes('拿走后门钥匙'));key('KeyE');assert(explorer.inventory.slots.some(i=>i?.kind==='rearDoorKey')&&!waist.visible,'E takes the downed NPC’s visible waist key');npc.dispose();
}

const scene=new THREE.Scene(),castle={scene,...createEscapeScene(scene,{labels:false})};
{
  delete globalThis.document;const rear=castle.doors.find(d=>d.id==='rear'),player={...createPlayer(),x:15,y:-.83,z:12,hidden:true},spawn={x:rear.x,y:.15,z:-5.2};
  const npc=createNaiwaPursuer({scene,navigation:castle.navigation,doors:castle.doors,player,spawn,patrolRoute:[{x:rear.x,y:-.83,z:-10.2}],worldItems:{physics:{addActor:()=>({remove(){}}),syncActors(){}}},random:()=>.99});
  const trace=[];let opened=false,closed=false,lastOpen=rear.open;for(let i=0;i<900;i++){for(const door of castle.doors)updateCastleDoor(door,1/60,[player,npc.actor],castle.navigation);npc.tick(1/60);opened||=rear.open;if(lastOpen!==rear.open||i%5===0&&npc.actor.z<-8.4&&npc.actor.z>-9.2)trace.push({i,y:npc.actor.y,z:npc.actor.z,open:rear.open,delay:rear.naiwaReachDelay,hands:npc.model.root.userData.interactionHands});lastOpen=rear.open;if(opened&&npc.actor.z<-8&&!rear.open&&rear.amount<.01){closed=true;break;}}
  assert(closed,`the actual rear stair route closes behind Naiwa: ${JSON.stringify({x:npc.actor.x,y:npc.actor.y,z:npc.actor.z,open:rear.open,amount:rear.amount,trace})}`);npc.dispose();
}
const platform=scene.getObjectByName('balcony:platform'),bounds=new THREE.Box3().setFromObject(platform),b=upperBalcony;
assert(Math.abs(bounds.min.x-b.minX)<1e-6&&Math.abs(bounds.max.x-b.maxX)<1e-6&&Math.abs(bounds.max.y-b.top)<1e-6);
assert.equal(castle.navigation.support(3.1*1.0625,8.05,5.15,0),-.83,'the old balcony floor no longer extends beneath a window');
for(const fps of[30,60,144]) {
  const player={...createPlayer(),x:1.4,y:5.15,z:7.9};jumpPlayer(player);run(2,dt=>advancePlayer(player,SPRINT_SPEED*dt,0,dt,castle.navigation),fps);
  assert(player.x<2.05&&Math.abs(player.y-5.15)<.01,'the side guard prevents jumping onto the adjacent window ledge');
}
{
  const {explorer,key}=explorerSetup({castle}),rear=castle.doors.find(d=>d.id==='rear');
  Object.assign(explorer.player,{x:rear.x,y:.15,z:-5.2,yaw:0,pitch:-.2});explorer.tick(.02);key('KeyE');assert(!rear.open,'players need the back door key');
  const slot=explorer.inventory.store(propItem('rearDoorKey','door-key'));key('KeyE');assert(rear.open);run(1,dt=>explorer.tick(dt));key('KeyE');assert(!rear.open);assert.equal(explorer.inventory.slots[slot].kind,'rearDoorKey','E use never consumes the reusable key');
  const chest=castle.interactables.find(a=>a.fixtureKind==='chest');assert(!insertFixtureKey(chest,explorer.inventory.slots[slot]),'the back key cannot unlock a tool chest');
  const torch=explorer.camera.children.find(n=>n.isSpotLight);assert(torch.castShadow&&torch.shadow.mapSize.x===512);
}
const vase=propItem('vase','vase');assert.equal(itemDamage(vase),9);assert.equal(projectileDamage(vase,11.5),10);assert.equal(projectileDamage(vase,4),9);assert.equal(propSoundMaterial(vase),'ceramic');assert.equal(windowDamage(vase,{speed:11.5}),65);
for(const fps of[30,60,144])for(const slow of[false,true])for(const blocked of[false,true]) {
  delete globalThis.document;const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),items=createWorldItems(scene,navigation),player={...createPlayer(),x:0,y:.15,z:-3,hidden:true},spawn={x:0,y:.15,z:0};
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:items,player,spawn,patrolRoute:[spawn],difficulty:blocked?'hard':'normal',random:()=>blocked?0:.99}),hits=[],blocks=[];scene.addEventListener('escape-pursuer-hit',e=>hits.push(e));scene.addEventListener('escape-pursuer-block',e=>blocks.push(e));
  const entry=items.throw(propItem('vase','vase-'+fps),player,new THREE.Vector3(0,1.6,slow?-1.35:-1.8),new THREE.Vector3(0,0,1));if(slow)entry.body.velocity.set(0,0,4);
  run(.45,dt=>{npc.tick(dt);items.tick(dt);},fps);assert.equal(hits.length,blocked?0:1);assert.equal(blocks.length,blocked?1:0);if(!blocked)assert.equal(hits[0].damage,slow?9:10);assert.equal(npc.health,blocked?25:slow?11:10);assert.equal(entry.broken,!slow,'shatter damage matches the actual physical break');npc.dispose();
}
{
  const window=castle.breakables.find(w=>w.escapeRoute),items=createWorldItems(scene,castle.navigation),point=window.center(),player={...createPlayer(),x:point.x,y:5.15,z:-5.3};
  const entry=items.throw(propItem('vase','window-vase'),player,new THREE.Vector3(point.x,point.y,-5.3),new THREE.Vector3(0,0,-1));assert(entry);run(.7,dt=>items.tick(dt));assert(window.broken&&entry.broken,'a real thrown vase shatters the authored window');
}
console.log('Balcony/key update OK: seven slots and shortcuts, damage-only brief shake and reduced motion, waist-key down/full-bag/duplicate/wake gates, floor-aware shadows and flashlight casting, real NPC open/pass/close with or without its key at 30/60/144 FPS, reusable player back-door access, separated balcony/window supports and side guards, exact physical vase 9/10 damage, ceramic foley and real window break.');
