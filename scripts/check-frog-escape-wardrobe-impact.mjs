import assert from 'node:assert/strict';
import * as THREE from 'three';
import {castleStorage} from '../src/frog-escape-storage.js';
import {syncBoxCollider,doorImpactLocked} from '../src/frog-escape-doors.js';
import {updateFixtureAction} from '../src/frog-escape-interactions.js';
import {createNavigation} from '../src/frog-escape-navigation.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {roomContaining,WARDROBE_SEARCH} from '../src/frog-escape-investigation.js';

class Control extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.children=new Map();this.attributes={};this.classList={add(){},remove(){},toggle(){}};this.open=false;}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}
  setAttribute(key,value){this.attributes[key]=value;}closest(){return null;}focus(){}showModal(){this.open=true;}close(){this.open=false;}setPointerCapture(){}
}
function arena({rotation=0,scaled=false,wall=false,room=null}={}) {
  const scene=new THREE.Scene(),parent=new THREE.Group(),actions=[],solids=[],material=new THREE.MeshStandardMaterial();scene.add(parent);parent.scale.x=scaled?1.25:1;
  const castle=room?createEscapeScene(scene,{labels:false}):null;
  function box(parent,x,y,z,w,h,d,mat=material,options={}){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y+h/2,z);mesh.userData.solid=options.solid!==false;parent.add(mesh);return mesh;}
  const storage=castleStorage(box,{darkWood:material,wood:material,gold:material},actions,{tube(){}},null);
  // Use the game's actual wardrobe builder, including its double leaves,
  // containing volume, inset panels, scale compensation and movable colliders.
  if(!castle)storage.wardrobe(parent,15/parent.scale.x,0,-.83,1.8,rotation);
  else actions.push(...castle.interactables);
  const action=castle?actions.find(action=>action.hideVolume&&roomContaining(castle.rooms,action.hideVolume.root.getWorldPosition(new THREE.Vector3()))?.id===room):actions[0],root=action.hideVolume.root;
  if(!castle)scene.traverse(mesh=>{if(!mesh.userData.solid)return;const solid={};syncBoxCollider(mesh,solid);solids.push(solid);if(mesh.userData.fixtureMotion){const {motion}=mesh.userData.fixtureMotion;motion.colliders.push({mesh,solid});action.colliders.push(solid);solid.dynamic=true;}});
  const world=(x,y,z)=>root.localToWorld(new THREE.Vector3(x,y,z)),inside=world(0,.125,-.1),outside=castle?world(0,0,action.hideVolume.maxZ+1.18):world(.4,0,1.08);
  if(wall){const point=world(.4,0,.87);solids.push({x:point.x,z:point.z,halfX:.2,halfZ:.2,minY:-.83,maxY:2,axisX:[1,0],axisZ:[0,1]});}
  const navigation=castle?.navigation??createNavigation({solids,stairs:[],boundary:[[-40,-40],[40,-40],[40,40],[-40,40]]}),controls=new Map();
  globalThis.document=new Control();document.querySelector=key=>{if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};document.querySelectorAll=()=>Array.from({length:7},()=>new Control());document.hidden=false;
  globalThis.window=new Control();window.matchMedia=()=>({matches:false});const pin=new THREE.Object3D();scene.add(pin);
  const canvas=new Control(),explorer=createEscapeExplorer({scene,navigation,canvas,stage:new Control(),status:new Control(),groups:{labels:new THREE.Group()},roof:new THREE.Group(),playerPin:pin,doors:castle?.doors??[],interactables:actions,onMap(){}});
  Object.assign(explorer.player,{x:inside.x,y:inside.y,z:inside.z,yaw:0,pitch:0});
  const point=action.anchor.getWorldPosition(new THREE.Vector3()),direction=point.clone().sub(new THREE.Vector3(inside.x,inside.y+1.58,inside.z)).normalize();Object.assign(explorer.player,{yaw:Math.atan2(-direction.x,-direction.z),pitch:Math.asin(direction.y)});
  const npc=createNaiwaPursuer({scene,navigation,doors:castle?.doors??[],interactables:actions,beds:castle?.beds??[],rooms:castle?.rooms??[],worldItems:explorer.worldItems,player:explorer.player,spawn:{x:outside.x,y:outside.y,z:outside.z},patrolRoute:[outside],random:()=>.99});explorer.setPursuer(npc);explorer.enter();
  const impacts=[];scene.addEventListener('escape-door-impact',event=>impacts.push({...event,start:{x:event.victim.x,z:event.victim.z}}));
  const key=()=>{const event=new Event('keydown',{cancelable:true});Object.defineProperty(event,'code',{value:'KeyE'});document.dispatchEvent(event);};
  return {action,explorer,npc,impacts,key,world,step:dt=>explorer.tick(dt),
    prepare(fps){
      for(let i=0;i<fps*5.1;i++)explorer.tick(1/fps);
      Object.assign(npc.actor,{x:outside.x,y:outside.y,z:outside.z,yaw:Math.atan2(outside.x-inside.x,outside.z-inside.z)});
      assert(npc.observeHiding({kind:'wardrobe',target:action,position:world(0,0,action.hideVolume.maxZ+.16)}));
      for(let i=0;i<fps*2&&npc.state!=='cabinet-prepare';i++)explorer.tick(1/fps);
      assert.equal(npc.state,'cabinet-prepare');assert.equal(action.wardrobeInspection,npc.actor);
    },
    dispose(){npc.dispose();explorer.showMap();explorer.audio.dispose();delete globalThis.document;delete globalThis.window;}};
}
for(const fps of [30,60,144])for(const rotation of [0,Math.PI/2])for(const scaled of [false,true]) {
  const t=arena({rotation,scaled});t.step(1/fps);assert(t.explorer.player.hidingWardrobe,'the player really starts inside the closed wardrobe');t.key();assert(t.action.open,`E opens the wardrobe instead of an unavailable waist key (${rotation}, scaled=${scaled})`);
  for(let i=0;i<fps&&!t.impacts.length;i++)t.step(1/fps);
  assert.equal(t.impacts.length,1,'the real E opening sweep strikes Naiwa once');assert.equal(t.impacts[0].damage,8);assert.equal(t.npc.health,12);assert.equal(t.npc.state,'stunned');assert.equal(t.action.amount,1);assert.equal(t.action.impactCooldown,5);
  const impact=t.impacts[0];for(let left=.5-1/fps;left>1e-9;){const dt=Math.min(1/fps,left);t.step(dt);left-=dt;}
  assert(Math.abs(Math.hypot(t.npc.actor.x-impact.start.x,t.npc.actor.z-impact.start.z)-2)<1e-6,'the wardrobe strike uses the same two-metre knockback');
  t.key();assert(t.action.open&&doorImpactLocked(t.action),'player input respects the same five-second impact lock');
  t.explorer.pause();const cooldown=t.action.impactCooldown;t.step(1);assert.equal(t.action.impactCooldown,cooldown);t.explorer.enter();
  for(let i=0;i<fps*5;i++)t.step(1/fps);assert(!doorImpactLocked(t.action));assert.equal(t.impacts.length,1);t.dispose();
}
for(const owner of [null,'npc']) {
  const t=arena();t.action.open=true;t.action.noiseOwner=owner==='npc'?t.npc.actor:null;
  for(let i=0;i<60;i++)t.step(1/60);assert.equal(t.impacts.length,0,'unowned and NPC wardrobe motion cannot strike Naiwa');t.dispose();
}
{const t=arena({wall:true});t.action.open=true;t.action.noiseOwner=t.explorer.player;for(let i=0;i<60;i++)t.step(1/60);assert.equal(t.impacts.length,0,'a blocked opening arc does not strike through an obstruction');assert.equal(t.npc.health,20);t.dispose();}
for(const fps of [30,60,144])for(const room of ['bedroom','guestroom']) {
  const t=arena({room});t.prepare(fps);
  const start={x:t.npc.actor.x,z:t.npc.actor.z};
  for(let i=0;i<Math.floor(fps*(WARDROBE_SEARCH.prepare-.15));i++)t.step(1/fps);
  assert.equal(t.npc.state,'cabinet-prepare');assert(!t.action.open&&t.action.amount===0,'the actual bedroom cabinet stays closed during the reaction window');
  assert.equal(t.npc.actor.x,start.x);assert.equal(t.npc.actor.z,start.z);
  t.explorer.pause();t.step(1);assert.equal(t.action.wardrobeInspection,t.npc.actor);t.explorer.enter();t.step(0);
  t.key();assert(t.action.open,`E from inside the ${room} opens the cabinet`);t.step(1/fps);
  assert.equal(t.impacts.length,1,`opening during preparation reliably hits the centered ${room} inspector at ${fps} FPS`);
  assert.equal(t.impacts[0].damage,8);assert.equal(t.npc.health,12);assert.equal(t.npc.state,'stunned');assert.equal(t.action.amount,1);assert(!t.action.wardrobeInspection,'a hit immediately cancels preparation');assert(!t.npc.investigating);assert(doorImpactLocked(t.action));
  for(let i=0;i<fps*.6;i++)t.step(1/fps);assert.equal(t.impacts.length,1);t.dispose();
}
for(const cancellation of ['reset','hit','dispose']) {
  const t=arena({room:'bedroom'});t.prepare(60);
  if(cancellation==='hit')t.npc.hit({damage:1});else t.npc[cancellation]();
  assert(!t.action.wardrobeInspection,`${cancellation} clears the counter window`);t.dispose();
}
console.log('Wardrobe impact OK: actual E in the main/guest bedrooms during a 1.2s preparation window, centered inspector, pause and cancellation; rotated/scaled double leaves at 30/60/144 FPS; shared 8 damage, stun, knockback, one-hit and 5s lock, obstruction and owner protection.');
