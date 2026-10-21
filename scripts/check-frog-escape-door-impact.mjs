import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCastleDoor,syncBoxCollider,updateCastleDoor,setCastleDoorOpen,doorImpactLocked} from '../src/frog-escape-doors.js';
import {createNavigation,createPlayer} from '../src/frog-escape-navigation.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {createDoorDisplacement,advanceDoorDisplacement} from '../src/frog-escape-door-displacement.js';

const boundary=[[-40,-40],[40,-40],[40,40],[-40,40]],run=(seconds,tick,fps)=>{for(let left=seconds;left>1e-9;){const dt=Math.min(1/fps,left);tick(dt);left-=dt;}};
class Control extends EventTarget{
  constructor(){super();this.style={};this.dataset={};this.children=new Map();this.attributes={};this.classList={add(){},remove(){},toggle(){}};this.open=false;}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}setAttribute(key,value){this.attributes[key]=value;}closest(){return null;}focus(){}showModal(){this.open=true;}close(){this.open=false;}setPointerCapture(){}
}
function arena({double=false,swing=1,rotation=0,withExplorer=false,npcOpener=false,milk=false,phase=10}={}){
  const scene=new THREE.Scene(),parent=new THREE.Group();scene.add(parent);
  const material=new THREE.MeshStandardMaterial(),door=createCastleDoor({parent,id:'test',name:'测试门',x:15,y:-.83,z:0,width:2,double,swing,rotation,materials:{darkWood:material,wood:material,gold:material,iron:material}});
  scene.updateMatrixWorld(true);const solids=[];
  scene.traverse(mesh=>{if(!mesh.userData.solid)return;const solid={doorFrame:mesh.userData.doorFrame};syncBoxCollider(mesh,solid);solids.push(solid);const part=door.parts.find(part=>part.leaf===mesh);if(part)part.collider=solid;});
  const navigation=createNavigation({solids,stairs:[],boundary,doors:[door]}),normal=door.normal,point=distance=>({x:door.x+normal[0]*swing*distance,y:door.y,z:door.z+normal[1]*swing*distance});
  let explorer,controls,player;
  if(withExplorer){
    controls=new Map();globalThis.document=new Control();document.querySelector=key=>{if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};document.querySelectorAll=()=>Array.from({length:7},()=>new Control());document.hidden=false;
    globalThis.window=new Control();window.matchMedia=()=>({matches:false});const pin=new THREE.Object3D();scene.add(pin);
    const canvas=new Control();canvas.requestPointerLock=()=>Promise.resolve();
    explorer=createEscapeExplorer({scene,canvas,stage:new Control(),status:new Control(),groups:{labels:new THREE.Group()},roof:new THREE.Group(),navigation,playerPin:pin,doors:[door],onMap(){}});explorer.enter();player=explorer.player;
  }else player=createPlayer();
  Object.assign(player,point(npcOpener?.18:-.9),{yaw:Math.atan2(normal[0]*-swing,normal[1]*-swing),hidden:false});if(milk)player.effects={milk:15,wine:0};
  const items=explorer?.worldItems??createWorldItems(scene,navigation),doc=globalThis.document;delete globalThis.document;
  const npc=createNaiwaPursuer({scene,navigation,doors:[door],worldItems:items,player,spawn:point(npcOpener?-1.2:.55),patrolRoute:[point(npcOpener?-1.2:.55)],random:()=>.99});if(doc)globalThis.document=doc;
  explorer?.setPursuer(npc);
  while(npc.alertness<phase){if(npc.state==='down')npc.reset({keepAlertness:true});npc.hit({item:{kind:'bread'},source:'projectile'});}if(phase!==10)npc.reset({keepAlertness:true});
  const impacts=[];scene.addEventListener('escape-door-impact',event=>impacts.push({...event,start:{x:event.victim.x,z:event.victim.z}}));
  const step=dt=>{if(explorer)explorer.tick(dt);else {updateCastleDoor(door,dt,[player,npc.actor],navigation);npc.tick(dt);items.tick(dt,player);}};
  return {scene,door,navigation,player,npc,items,explorer,controls,point,impacts,step,dispose(){npc.dispose();if(explorer){explorer.showMap();explorer.audio.dispose();delete globalThis.document;delete globalThis.window;}}};
}
function waitImpact(t,fps){for(let i=0;i<fps*2&&!t.impacts.length;i++)t.step(1/fps);assert.equal(t.impacts.length,1,'real opening sweep connects once');assert.equal(t.door.amount,1);assert.equal(t.door.impactCooldown,t.impacts[0].victim.kind==='pursuer'?5:0);return t.impacts[0];}
for(const fps of [30,60,144])for(const double of [false,true])for(const swing of [-1,1])for(const rotation of [0,Math.PI/2]){
  const t=arena({double,swing,rotation}),health=t.npc.health;setCastleDoorOpen(t.door,true,t.player);const impact=waitImpact(t,fps);assert.equal(impact.damage,8);assert.equal(t.npc.health,health-8);assert.equal(t.npc.state,'stunned');
  const forceTime=.5-1/fps;run(forceTime,t.step,fps);assert(Math.abs(Math.hypot(t.npc.actor.x-impact.start.x,t.npc.actor.z-impact.start.z)-2)<1e-6,'real NPC flies exactly two metres');
  assert(!setCastleDoorOpen(t.door,false,t.player));assert(!setCastleDoorOpen(t.door,false,t.npc.actor));assert.equal(t.door.open,true);
  run(4.49-forceTime,t.step,fps);assert(doorImpactLocked(t.door));assert.equal(t.impacts.length,1);run(.52,t.step,fps);assert(!doorImpactLocked(t.door));assert(setCastleDoorOpen(t.door,false,t.player));t.dispose();
}
for(const fps of [30,60,144])for(const milk of [false,true])for(const [phase,damage]of [[10,10],[30,12],[70,15],[100,25]]){
  const t=arena({withExplorer:true,npcOpener:true,milk,phase});setCastleDoorOpen(t.door,true,t.npc.actor);const impact=waitImpact(t,fps);
  assert.equal(impact.damage,damage);assert.equal(t.player.health,100-damage*(milk?.5:1),'actual attacker phase is applied before milk resistance');assert.equal(t.player.staminaMax,20);assert(t.controls.get('#escape-vitals-message').textContent.includes('门'));
  assert(!doorImpactLocked(t.door));assert(setCastleDoorOpen(t.door,false,t.player),'hitting the player leaves the door immediately usable');
  run(.6-1/fps,t.step,fps);assert(Math.abs(Math.hypot(t.player.x-impact.start.x,t.player.z-impact.start.z)-4)<1e-6,'actual player input/physics applies four-metre knockback');assert.equal(t.impacts.length,1);t.dispose();
}
{
  const t=arena({withExplorer:true});t.step(1/60);const e=new Event('keydown',{cancelable:true});Object.defineProperty(e,'code',{value:'KeyE'});document.dispatchEvent(e);assert(t.door.open,'actual E opens the aimed door');waitImpact(t,60);
  const key=new Event('keydown',{cancelable:true});Object.defineProperty(key,'code',{value:'KeyE'});document.dispatchEvent(key);assert(t.door.open,'E cannot close the impacted door');t.dispose();
}
{
  const t=arena();t.npc.hit({damage:12});setCastleDoorOpen(t.door,true,t.player);waitImpact(t,60);assert.equal(t.npc.health,0);assert.equal(t.npc.state,'down','lethal door damage uses the normal knockdown state');t.dispose();
}
for(const obstruction of ['wall','cabinet','chair']){
  const t=arena();const solid={x:15.3,z:.85,halfX:.16,halfZ:.15,minY:-.83,maxY:1.6,axisX:[1,0],axisZ:[0,1]};
  if(obstruction==='chair')solid.movableChair={};t.navigation.solids.push(solid);setCastleDoorOpen(t.door,true,t.player);run(1,t.step,60);assert.equal(t.impacts.length,0,'less than 45 degrees of room prevents a player door strike');assert.equal(t.door.impactClearance,false);assert.equal(t.npc.health,20);
  t.navigation.solids.splice(t.navigation.solids.indexOf(solid),1);waitImpact(t,60);assert.equal(t.npc.health,12,'moving an obstruction out of the swing restores eligibility without reopening');t.dispose();
}
{
  const t=arena();t.navigation.solids.push({x:14.65,z:1.2,halfX:.05,halfZ:.05,minY:-.83,maxY:2,axisX:[1,0],axisZ:[0,1]});setCastleDoorOpen(t.door,true,t.player);waitImpact(t,60);assert.equal(t.door.impactClearance,true,'clearance beyond 45 degrees is sufficient even with a later obstruction');t.dispose();
}
{
  const t=arena();t.door.autoCloseDelay=5;setCastleDoorOpen(t.door,true,t.player);waitImpact(t,60);run(4.99,t.step,60);assert(t.door.open&&doorImpactLocked(t.door),'automatic closure also respects the impact lock');run(.02,t.step,60);assert(!t.door.open,'timed gates can close after the lock expires');t.dispose();
}
{
  const t=arena();setCastleDoorOpen(t.door,true,null);run(1,t.step,60);assert.equal(t.impacts.length,0,'unowned automatic motion does not attack');t.dispose();
}
{
  const t=arena();Object.assign(t.npc.actor,t.point(3));setCastleDoorOpen(t.door,true,t.player);run(1,t.step,60);Object.assign(t.npc.actor,t.point(.55));const health=t.npc.health;setCastleDoorOpen(t.door,false,t.player);run(1,t.step,60);assert.equal(t.impacts.length,0,'closing never attacks');assert.equal(t.npc.health,health);t.dispose();
}
{
  const t=arena({withExplorer:true,npcOpener:true});setCastleDoorOpen(t.door,true,t.npc.actor);waitImpact(t,60);t.explorer.pause();const start={x:t.player.x,z:t.player.z},cooldown=t.door.impactCooldown;run(1,t.step,60);assert.equal(t.door.impactCooldown,cooldown);assert.equal(t.player.x,start.x);assert.equal(t.player.z,start.z);t.explorer.restartPosition();assert.equal(t.npc.state,'patrol');t.dispose();
}
for(const fps of [30,60,144]){
  const nav=createNavigation({solids:[{x:15,z:1,halfX:4,halfZ:.1,minY:-.83,maxY:3,axisX:[1,0],axisZ:[0,1]}],stairs:[],boundary}),actor={...createPlayer(),x:15,y:-.83,z:0},force=createDoorDisplacement(actor,{door:{parts:[]},direction:{x:0,z:1},distance:4});
  run(.6,dt=>advanceDoorDisplacement(force,actor,nav,dt),fps);assert(actor.z<=.64,'knockback never crosses a solid wall');
}
console.log('Door impacts OK: real E/NPC openings, single/double leaves, swing directions/rotation, clear/blocked arcs, 8 damage/2m NPC, player phase damage 10/12/15/25 before milk at 30/60/144 FPS with unchanged 4m knockback, lethal knockdown, one-hit/cooldown, owner/closing immunity and pause/reset.');
