import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createPlayer,advancePlayer,jumpPlayer,createNavigation,WALK_SPEED} from '../src/frog-escape-navigation.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createWaterVolume,waterAt,waterMovementScale,createWaterInteraction} from '../src/frog-escape-water.js';
import {createEscapeWater} from '../src/frog-escape-water-renderer.js';

const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),nav=castle.navigation;
const bath=castle.waterVolumes.find(volume=>volume.id==='bathtub'),pool=castle.waterVolumes.find(volume=>volume.id==='garden-pool');
assert.equal(castle.waterVolumes.length,2);assert(bath&&pool);
const world=(volume,x,y,z)=>volume.root.localToWorld(new THREE.Vector3(x,y,z));
for(const volume of [bath,pool]) {
  const point=world(volume,0,volume.bottomY,volume===pool?-.9:0);
  assert(nav.waterAt(point));assert(waterMovementScale(nav.waterAt(point))<.8);
  assert(!nav.blocked(point.x,point.y,point.z,false),'the real basin is hollow at the bottom');
  assert(Math.abs(nav.support(point.x,point.z,point.y)-point.y)<.00001,'feet stand on the actual basin bottom');
  assert(!nav.waterAt(world(volume,0,volume.surfaceY+.1,volume===pool?-.9:0)),'jumping above water is dry');
  assert(!nav.waterAt(world(volume,0,volume.bottomY-3,volume===pool?-.9:0)),'water does not affect the floor below');
}
assert(!nav.waterAt(world(pool,0,pool.bottomY,.4)),'the garden pool is only a semicircle, outside the house');
assert(!nav.circles.some(circle=>circle.x===-8&&circle.z===-7&&circle.radius>1),'the old solid cylinder is removed');

function settle(player,fps,seconds=.8) {for(let i=0;i<fps*seconds;i++)advancePlayer(player,0,0,1/fps,nav);}
function walkTo(player,target,fps,{seconds=6}={}) {
  for(let i=0;i<fps*seconds;i++) {
    const dx=target.x-player.x,dz=target.z-player.z,distance=Math.hypot(dx,dz);if(distance<.03)return;
    const length=Math.min(distance,WALK_SPEED*waterMovementScale(nav.waterAt(player))/fps);
    advancePlayer(player,dx/distance*length,dz/distance*length,1/fps,nav);
  }
  assert.fail(`basin movement blocked at ${JSON.stringify({x:player.x,y:player.y,z:player.z,target})}`);
}
for(const fps of [30,60,144]) {
  const outer=world(pool,0,-.83,-3.25),inner=world(pool,0,pool.bottomY,-1.25),visitor={...createPlayer(),x:outer.x,y:outer.y,z:outer.z};
  walkTo(visitor,inner,fps);settle(visitor,fps);assert(nav.waterAt(visitor),'the player can walk down the pool entry steps into liquid');assert(Math.abs(visitor.y-pool.bottomY)<.001);
  walkTo(visitor,outer,fps);settle(visitor,fps);assert(!nav.waterAt(visitor));assert(Math.abs(visitor.y+.83)<.001,'the player walks out without getting stuck');
  const before=world(bath,-1.5,.01,0),center=world(bath,0,bath.bottomY,0),bather={...createPlayer(),x:before.x,y:before.y,z:before.z};
  assert(!nav.blocked(bather.x,bather.y,bather.z,false));assert(jumpPlayer(bather));walkTo(bather,center,fps);settle(bather,fps);
  assert(nav.waterAt(bather),'jumping over the actual tub rim enters liquid');assert(Math.abs(bather.y-center.y)<.001);
  assert(jumpPlayer(bather));walkTo(bather,before,fps);settle(bather,fps);assert(!nav.waterAt(bather),'the rim can also be crossed on the way out');
}

const water=createEscapeWater({scene,volumes:castle.waterVolumes});water.setQuality('high');
const events=[],interaction=createWaterInteraction({volumes:castle.waterVolumes,onDisturb:event=>{events.push(event);water.disturb(event.volume,event.position,event.strength);}});
const swimmer=world(pool,-.6,pool.bottomY,-.8);interaction.tick(swimmer,1/60);assert.equal(events[0].kind,'enter');assert.equal(water.rippleCount,1);
const count=events.length;for(let i=0;i<120;i++)interaction.tick(swimmer,1/60);assert.equal(events.length,count,'standing still emits no repeated splash');
for(let i=0;i<40;i++){swimmer.x+=.01;interaction.tick(swimmer,1/60);}assert(events.some(event=>event.kind==='wade'));
const beforePause=events.length;swimmer.x+=.5;interaction.tick(swimmer,0);assert.equal(events.length,beforePause,'pause does not advance water contact');
interaction.tick({x:0,y:-5,z:0},1/60);assert.equal(events.length,beforePause,'teleporting/capture makes no long-distance water wake');
water.dispose();

class Control extends EventTarget {
  constructor(){super();this.children=new Map();this.attributes={};this.style={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};this.open=false;}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}
  setAttribute(key,value){this.attributes[key]=value;}closest(){return null;}focus(){}showModal(){this.open=true;}close(){this.open=false;}setPointerCapture(){}
}
function dispatch(target,type,props={}) {const event=new Event(type,{cancelable:true});for(const [key,value]of Object.entries(props))Object.defineProperty(event,key,{value});target.dispatchEvent(event);}
function walkInExplorer(fps,wet) {
  const controls=new Map();globalThis.document=new Control();document.querySelector=key=>{if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};document.querySelectorAll=()=>Array.from({length:7},()=>new Control());document.hidden=false;
  globalThis.window=new Control();window.matchMedia=()=>({matches:false});
  const room=new THREE.Scene(),root=new THREE.Group(),pin=new THREE.Object3D();room.add(root,pin);root.position.set(15,-.83,-10);
  const volume=createWaterVolume({id:'walk-test',root,width:20,depth:20,surfaceY:.4,bottomY:0});
  const navigation=createNavigation({solids:[],stairs:[],waterVolumes:wet?[volume]:[],boundary:[[-100,-100],[100,-100],[100,100],[-100,100]]});
  const explorer=createEscapeExplorer({scene:room,navigation,canvas:new Control(),stage:new Control(),status:new Control(),groups:{labels:new THREE.Group()},roof:new THREE.Group(),playerPin:pin,doors:[],onMap(){}}),disturbances=[];
  room.addEventListener('escape-water-disturbance',event=>disturbances.push(event));explorer.enter();Object.assign(explorer.player,{x:15,y:-.83,z:-10,yaw:0});
  dispatch(document,'keydown',{code:'KeyW'});for(let i=0;i<fps;i++)explorer.tick(1/fps);
  const distance=-10-explorer.player.z;
  if(wet){assert(disturbances.some(event=>event.kind==='enter'));assert(disturbances.some(event=>event.kind==='wade'));}
  explorer.pause();const count=disturbances.length,z=explorer.player.z;explorer.tick(1);assert.equal(disturbances.length,count);assert.equal(explorer.player.z,z);
  explorer.showMap();explorer.audio.dispose();delete globalThis.document;delete globalThis.window;return distance;
}
const distances=[];
for(const fps of [30,60,144]) {
  const dry=walkInExplorer(fps,false),wet=walkInExplorer(fps,true);assert(Math.abs(wet/dry-.7)<.005,'actual player input applies water resistance');distances.push(wet);
}
assert(Math.max(...distances)-Math.min(...distances)<.002,'water walking remains stable across frame rates');
console.log('Water OK: real hollow tub and semicircular basin, walkable pool steps and tub jump entry/exit at 30/60/144 FPS; depth-aware input slowdown, ripple entry/wading, pause/teleport/floor isolation and dry recovery.');
