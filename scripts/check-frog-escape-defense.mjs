import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createNavigation,createPlayer} from '../src/frog-escape-navigation.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {propItem} from '../src/frog-escape-props.js';
import {NAIWA_DEFENSE,incomingFromFront,flashlightHitsEyes} from '../src/frog-escape-naiwa-defense.js';
import {alertnessPhase} from '../src/frog-escape-vitals.js';

const boundary=[[-30,-30],[30,-30],[30,30],[-30,30]];
function setup({fps=60,phase=10,patrol=false}={}) {
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),player={...createPlayer(),x:0,y:.15,z:-5,hidden:true};
  const items=createWorldItems(scene,navigation),events=[];let roll=0;
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:items,player,spawn:{x:0,y:.15,z:0},patrolRoute:[{x:0,y:.15,z:patrol?-6:0}],random:()=>roll});
  const step=seconds=>{for(let remaining=seconds;remaining>1e-9;){const dt=Math.min(1/fps,remaining);npc.tick(dt);items.tick(dt);remaining-=dt;}};
  while(npc.alertness<phase){npc.hit({damage:.01});step(.32);}
  npc.reset({keepAlertness:true});
  for(const type of ['escape-pursuer-block','escape-pursuer-hit','escape-pursuer-light'])scene.addEventListener(type,event=>events.push({...event}));
  const aim=(position=null)=>{
    const eyes=npc.model.getEyePositions(),target=position??eyes[0].clone().add(eyes[1]).multiplyScalar(.5),origin=new THREE.Vector3(0,1.9,-4);
    return {enabled:true,origin,direction:target.clone().sub(origin).normalize(),range:20};
  };
  return {scene,navigation,player,items,npc,events,step,aim,setRoll(value){roll=value;}};
}
assert.equal(alertnessPhase(70).label,'唐王模式');assert.equal(alertnessPhase(70).id,'tangwang');
const actor={x:0,y:.15,z:0,yaw:0,collider:{}};
assert(incomingFromFront(actor,{origin:{x:0,z:-3}}));assert(!incomingFromFront(actor,{origin:{x:0,z:3}}));assert(!incomingFromFront(actor,{origin:{x:3,z:0}}));
assert(incomingFromFront(actor,{origin:{x:0,z:3},velocity:{x:0,z:8}}),'the actual incoming trajectory takes precedence over the original thrower position');

for(const [phase,origin,roll,blocked] of [
  [10,{x:0,y:1.5,z:-2},0,false],[30,{x:0,y:1.5,z:-2},0,true],[70,{x:0,y:1.5,z:-2},0,true],
  [30,{x:0,y:1.5,z:-2},.249,true],[30,{x:0,y:1.5,z:-2},.25,false],
  [65,{x:0,y:1.5,z:-2},.3,false],[70,{x:0,y:1.5,z:-2},.3,true],[70,{x:0,y:1.5,z:-2},.399,true],[70,{x:0,y:1.5,z:-2},.4,false],
  [30,{x:0,y:1.5,z:-2},.99,false],[30,{x:0,y:1.5,z:2},0,false],[30,{x:2,y:1.5,z:0},0,false],
]) {
  const test=setup({phase});test.setRoll(roll);
  assert(test.npc.hit({damage:35,item:propItem('crowbar','front-test'),source:'melee',origin}));
  assert.equal(test.npc.health,blocked?20:15);assert.equal(test.events.filter(event=>event.type==='escape-pursuer-block').length,blocked?1:0);
  assert.equal(test.npc.alertness,phase+5,'blocked contact still raises the appropriate alertness tier');
  if(blocked){assert.notEqual(test.npc.state,'stunned');test.step(.18);assert(test.npc.guarding);assert(test.npc.model.root.userData.guardAmount>.99);test.step(.9);assert(!test.npc.guarding,'the short attack guard lowers again');}
  test.npc.dispose();
}
// Becoming intelligent because of this hit does not retroactively block it.
const threshold=setup({phase:25});threshold.npc.hit({damage:.01,item:propItem('knife','raise-29')});threshold.step(.32);threshold.npc.reset({keepAlertness:true});assert.equal(threshold.npc.alertness,29);
threshold.npc.hit({damage:0,item:propItem('bread','threshold'),source:'projectile',origin:{x:0,z:-2}});assert.equal(threshold.npc.alertness,30);assert(!threshold.events.some(event=>event.type==='escape-pursuer-block'));
threshold.step(.5);threshold.npc.hit({damage:0,item:propItem('bread','intelligent'),source:'projectile',origin:{x:0,z:-2}});assert(threshold.events.some(event=>event.type==='escape-pursuer-block'));threshold.npc.dispose();

// A real thrown crowbar meets the actor collider, is deflected, and cannot
// damage the actor repeatedly while settling beside it.
for(const fps of [25,60,144]) {
  const test=setup({phase:30,fps});
  const entry=test.items.throw(propItem('crowbar',`deflect-${fps}`),test.player,new THREE.Vector3(0,1.45,-1.6),new THREE.Vector3(0,0,1));assert(entry);
  test.step(.18);assert.equal(test.npc.health,20);assert.equal(test.events.filter(event=>event.type==='escape-pursuer-block').length,1);assert.equal(entry.thrown,false);assert(entry.body.velocity.z<0,'a blocked projectile rebounds toward the incoming side');
  test.step(.8);assert.equal(test.npc.health,20);assert.equal(test.events.filter(event=>event.type==='escape-pursuer-block').length,1,'one thrown item rolls its guard chance only once');test.npc.dispose();
}

for(const phase of [10,30,70])for(const fps of [25,60,144]) {
  const test=setup({phase,fps});let beam=test.aim();test.npc.setFlashlightSource(()=>beam);test.step(.24);
  assert(test.npc.lightExposed&&test.npc.guarding,'all three alertness modes lift a hand against direct eye light');
  assert.equal(test.npc.movementSpeedScale,phase>=70?.75:.5);assert.equal(test.npc.model.root.userData.guardAmount,1);
  test.step(.8);assert.equal(test.events.filter(event=>event.type==='escape-pursuer-light'&&event.active).length,1,'the lifted hand does not occlude its own detector or cause repeated shield triggers');
  beam=test.aim(new THREE.Vector3(0,.8,0));test.step(.04);assert(!test.npc.lightExposed,'aiming at the body is not direct eye illumination');assert.equal(test.npc.movementSpeedScale,1);
  beam.origin.z=-18;beam.direction=new THREE.Vector3(0,.8,0).sub(beam.origin).normalize();test.step(.04);assert(test.npc.lightExposed,'both eyes inside the distant central beam trigger shielding without pinpoint aim');
  beam=test.aim();test.navigation.solids.push({x:0,z:-2,halfX:1,halfZ:.1,minY:.15,maxY:3,axisX:[1,0],axisZ:[0,1]});test.step(.04);assert(!test.npc.lightExposed,'walls stop the beam');test.navigation.solids.pop();
  beam.enabled=false;test.step(.3);assert(!test.npc.guarding,'switching off the light lowers the hand');assert.equal(test.npc.movementSpeedScale,1);
  beam=test.aim();beam.origin.z=4;beam.direction=test.npc.model.getEyePositions()[0].clone().sub(beam.origin).normalize();test.step(.04);assert(!test.npc.lightExposed,'light aimed from behind does not reach the eyes');
  beam=test.aim();beam.range=2;test.step(.04);assert(!test.npc.lightExposed,'the effect respects the light range');
  test.npc.reset();assert(!test.npc.guarding&&!test.npc.lightExposed);test.npc.dispose();
}
// Compare actual unobstructed walking and chasing distances, not just a getter.
for(const phase of [10,30,70])for(const chase of [false,true])for(const fps of [25,60,144]) {
  function distance(lit) {
    const test=setup({phase,fps,patrol:!chase});test.step(5.2);test.npc.reset({keepAlertness:true});
    if(chase){test.step(5.2);Object.assign(test.npc.actor,{x:0,y:.15,z:0,yaw:0});test.npc.setMapLayer('all');test.player.hidden=false;}
    if(lit)test.npc.setFlashlightSource(()=>test.aim());
    // Measure before the first waypoint; the final step to a waypoint is capped.
    const start=test.npc.actor.z;test.step(.08);const moved=start-test.npc.actor.z;test.npc.dispose();return moved;
  }
  const plain=distance(false),lit=distance(true);assert(plain>.1,`phase ${phase} ${chase?'chase':'patrol'} should move`);assert(Math.abs(lit/plain-(phase>=70?.75:.5))<.005,`real ${chase?'chase':'patrol'} distance keeps the correct light multiplier at ${fps} FPS in phase ${phase}: ${lit}/${plain}`);
}

// Wire the real equipped flashlight and camera through explorer.setPursuer.
class Control extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.open=false;this.hidden=false;this.children=new Map();this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(){} closest(){return null;} focus(){} setPointerCapture(){}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}
  showModal(){this.open=true;}close(){this.open=false;}
}
const controls=new Map();globalThis.document=new Control();document.querySelector=key=>{if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};document.querySelectorAll=()=>Array.from({length:7},()=>new Control());document.hidden=false;
globalThis.window=new Control();window.matchMedia=()=>({matches:false});
const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),canvas=new Control(),pin=new THREE.Object3D();scene.add(pin);canvas.requestPointerLock=()=>Promise.resolve();
const explorer=createEscapeExplorer({scene,navigation,canvas,stage:new Control(),status:new Control(),groups:{labels:new THREE.Group()},roof:new THREE.Group(),playerPin:pin,doors:[],onMap(){}});
Object.assign(explorer.player,{x:0,y:.15,z:0,yaw:0,pitch:0});
let activeBeam=null;explorer.setPursuer({alertness:10,actor:{x:0,y:.15,z:-4,collider:{}},state:'patrol',tick(){return false;},setFlashlightSource(source){activeBeam=source;},setMapLayer(){}});
assert.equal(activeBeam(),null);explorer.enter();assert(activeBeam()?.enabled);
explorer.inventory.slots[0].on=false;assert.equal(activeBeam(),null);explorer.inventory.slots[0].on=true;
explorer.inventory.store(propItem('crowbar','selected'));explorer.inventory.select(1);assert.equal(activeBeam(),null,'unequipping the flashlight removes its effect');explorer.inventory.select(0);
explorer.player.yaw=Math.PI/2;explorer.tick(.02);assert(activeBeam().direction.x<-.99,'the actual camera controls the beam direction in this frame');
explorer.pause();assert.equal(activeBeam(),null);explorer.enter();assert(activeBeam()?.enabled);explorer.showMap();assert.equal(activeBeam(),null);
const savedFetch=globalThis.fetch,savedProgressEvent=globalThis.ProgressEvent;let actualNpc;
try {
  const glb=readFileSync('assets/models/naiwa-h25-rigged.glb');globalThis.fetch=async()=>new Response(glb,{headers:{'Content-Length':String(glb.byteLength)}});
  globalThis.ProgressEvent??=class {constructor(type,options){this.type=type;Object.assign(this,options);}};
  actualNpc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:explorer.worldItems,player:explorer.player,spawn:{x:0,y:.15,z:-4},patrolRoute:[{x:0,y:.15,z:-4}]});assert(await actualNpc.model.ready);
}finally {globalThis.fetch=savedFetch;if(savedProgressEvent===undefined)delete globalThis.ProgressEvent;else globalThis.ProgressEvent=savedProgressEvent;}
actualNpc.actor.yaw=Math.PI;actualNpc.setMapLayer('all');explorer.setPursuer(actualNpc);
Object.assign(explorer.player,{x:0,y:.15,z:0,yaw:0,pitch:Math.atan2(actualNpc.model.getEyePositions()[0].y-1.73,4)});
explorer.enter();explorer.tick(.04);assert(actualNpc.lightExposed&&actualNpc.movementSpeedScale===.5,'the equipped real light affects a real pursuer in the same input frame');
explorer.player.pitch=-.25;explorer.tick(.04);assert(!actualNpc.lightExposed,'moving the real beam far enough down puts the eyes outside its central cone');
explorer.player.pitch=Math.atan2(actualNpc.model.getEyePositions()[0].y-1.73,4);explorer.tick(.04);assert(actualNpc.lightExposed);
explorer.inventory.select(1);explorer.tick(.04);assert(!actualNpc.lightExposed,'the live pursuer loses the effect after changing the held item');
actualNpc.dispose();explorer.showMap();explorer.audio.dispose();
delete globalThis.document;delete globalThis.window;
console.log('Defense OK: Tangwang label, 25% Nerd / 40% Ninja frontal guard after intelligence with pre-hit threshold, damage prevention and alertness, real deflected projectile/dedup at 25/60/144 FPS; eye-only directional flashlight, occlusion/range/back-face/off/unequipped/pause/map gates, all modes shielding, actual patrol/chase at 50% / Tangwang 75%, clean lowering/reset and real explorer flashlight wiring.');
