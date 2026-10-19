import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPropModel,propItem} from '../src/frog-escape-props.js';
import {CROWBAR_MELEE,createCrowbarGrip,poseCrowbar} from '../src/frog-escape-melee.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createNavigation} from '../src/frog-escape-navigation.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';

const model=createPropModel(propItem('crowbar','geometry-check'));
assert(Math.abs(new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y-1.4)<.001,'the real model is longer');
const grip=createCrowbarGrip(model),head=model.getObjectByName('crowbar:head'),tail=model.getObjectByName('crowbar:tail'),handle=model.getObjectByName('crowbar:grip');
poseCrowbar(grip);grip.updateMatrixWorld(true);
const heldDirection=head.getWorldPosition(new THREE.Vector3()).sub(handle.getWorldPosition(new THREE.Vector3()));
const oldDirection=heldDirection.clone().applyQuaternion(grip.quaternion.clone().invert()).applyEuler(new THREE.Euler(-.28,.08,.08));
assert(Math.abs(Math.atan2(heldDirection.x,heldDirection.y)-Math.PI/6)<1e-8,'the held crowbar points at 1 o’clock');
assert(Math.abs(heldDirection.z-oldDirection.z)<1e-8,'clock rotation preserves the previous forward tilt');
let headTravel=0,tailTravel=0,previous=null;
const headXs=[];
for(let i=0;i<=115;i++) {
  poseCrowbar(grip,i/100);grip.updateMatrixWorld(true);
  const anchor=handle.getWorldPosition(new THREE.Vector3());
  assert(anchor.distanceTo(grip.position)<1e-8,'the actual handle stays at the hand pivot');
  const h=head.getWorldPosition(new THREE.Vector3()).sub(anchor),t=tail.getWorldPosition(new THREE.Vector3()).sub(anchor);
  headXs.push(h.x);
  if(previous){headTravel+=h.distanceTo(previous.h);tailTravel+=t.distanceTo(previous.t);}
  previous={h,t};
}
assert(headTravel>tailTravel*4,'the hooked head leads the swing while the short tail stays near the hand');
assert(Math.max(...headXs)-Math.min(...headXs)>1,'the hooked head now sweeps through a larger arc');
poseCrowbar(grip,CROWBAR_MELEE.impact);grip.updateMatrixWorld(true);
const impact=head.getWorldPosition(new THREE.Vector3());
assert(Math.abs(impact.x)<.08&&Math.abs(impact.y)<.08&&impact.z<-1,'the head passes the aiming line at the damage moment');

const castle=createEscapeScene(new THREE.Scene(),{labels:false});
const bar=castle.pickupSeeds.find(seed=>seed.item.kind==='crowbar'),bounds=new THREE.Box3().setFromObject(bar.mesh);
assert.equal(bar.mesh.name,'quest:leaning-crowbar');
assert(bar.mesh.rotation.z>.3&&bar.mesh.rotation.z<.5,'the starting crowbar has a visible leaning angle');
assert(bounds.min.x>12.68&&bounds.min.x<12.76&&bounds.min.y>-.66&&bounds.min.y<-.59,'the crowbar rests over the shed boards and beside the left wall');

class Control extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.open=false;this.hidden=false;this.children=new Map();this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(){} closest(){return null;} focus(){} setPointerCapture(){}
  querySelector(selector){if(!this.children.has(selector))this.children.set(selector,new Control());return this.children.get(selector);}
  showModal(){this.open=true;} close(){this.open=false;}
}
function dispatch(target,type,props={}) {
  const event=new Event(type,{cancelable:true});
  for(const [key,value] of Object.entries(props))Object.defineProperty(event,key,{value});
  target.dispatchEvent(event);
}
function setup(fps,touch=false) {
  globalThis.document=new Control();const controls=new Map();
  document.querySelector=selector=>{if(!controls.has(selector))controls.set(selector,new Control());return controls.get(selector);};
  document.querySelectorAll=()=>Array.from({length:7},()=>new Control());document.hidden=false;
  globalThis.window=new Control();window.matchMedia=query=>({matches:query==='(pointer:coarse)'&&touch});
  const canvas=new Control();
  canvas.requestPointerLock=()=>{document.pointerLockElement=canvas;dispatch(document,'pointerlockchange');};
  document.exitPointerLock=()=>{document.pointerLockElement=null;dispatch(document,'pointerlockchange');};
  const scene=new THREE.Scene(),groups={labels:new THREE.Group()},roof=new THREE.Group(),playerPin=new THREE.Group();scene.add(roof,playerPin);
  const target={x:0,z:-1.4,halfX:.4,halfZ:.1,minY:.15,maxY:2.8,axisX:[1,0],axisZ:[0,1],dynamic:true};
  let damage=0,time=0;const strikes=[],swishes=[];target.damageable={hit:({damage:amount})=>{damage+=amount;}};
  const navigation=createNavigation({solids:[target],stairs:[],boundary:[[-20,-20],[20,-20],[20,20],[-20,20]]});
  const explorer=createEscapeExplorer({scene,canvas,stage:new Control(),status:new Control(),groups,roof,playerPin,navigation,doors:[],onMap(){}});
  Object.assign(explorer.player,{x:0,y:.15,z:0,yaw:0,pitch:0});
  explorer.inventory.store(propItem('crowbar','held-crowbar'));explorer.inventory.select(1);explorer.enter();
  scene.addEventListener('escape-melee-strike',()=>strikes.push(time));
  scene.addEventListener('escape-player-action',event=>{if(event.action==='swing')swishes.push({time,elapsed:event.elapsed});});
  const swing=()=>touch?dispatch(document.querySelector('#escape-item-attack'),'click'):dispatch(canvas,'pointerdown',{button:0,pointerType:'mouse'});
  const step=seconds=>{for(let remaining=seconds;remaining>1e-9;){const dt=Math.min(1/fps,remaining);time+=dt;explorer.tick(dt);remaining-=dt;}};
  return {explorer,canvas,step,swing,strikes,swishes,get damage(){return damage;}};
}
for(const [fps,touch] of [[25,false],[60,false],[144,false],[60,true]]) {
  const h=setup(fps,touch),held=h.explorer.camera.getObjectByName('held:crowbar-grip');
  h.swing();h.step(.19);assert.equal(h.strikes.length,0);assert.equal(held.userData.meleePhase,'windup');
  h.step(.01);assert.equal(h.strikes.length,0,'the full 0.2 second charge does not deal damage');
  assert.equal(h.swishes.length,1);assert(Math.abs(h.swishes[0].time-h.swishes[0].elapsed)<1e-8,'the sound event carries actual animation time for sample alignment');
  h.step(CROWBAR_MELEE.impact-.21);assert.equal(h.strikes.length,0,'damage waits for the forward stroke');
  h.step(.01);assert.equal(h.strikes.length,1);assert.equal(h.damage,5,'one forward stroke deals one tier-five hit');
  h.step(CROWBAR_MELEE.duration-CROWBAR_MELEE.impact);assert.equal(h.strikes.length,1);assert.equal(held.userData.meleePhase,'idle','the slightly faster action returns to rest after its wider swing');
  h.swing();h.step(1.19-CROWBAR_MELEE.duration);h.swing();assert.equal(h.strikes.length,1,'clicks during the 1.2 second cooldown cannot restart the swing');
  h.step(.01);h.swing();h.step(CROWBAR_MELEE.impact);assert.equal(h.strikes.length,2);
  assert(Math.abs(h.strikes[1]-h.strikes[0]-1.2)<1e-6,'consecutive hits respect exactly 1.2 seconds between swing starts');
}

const cancel=setup(60);
cancel.swing();cancel.step(.1);cancel.explorer.inventory.select(0);cancel.explorer.inventory.select(1);cancel.swing();cancel.step(.3);
assert.equal(cancel.strikes.length,0,'switching away cancels windup and cannot bypass cooldown by switching back');
cancel.explorer.showMap();cancel.explorer.enter();cancel.swing();cancel.step(.39);
assert.equal(cancel.strikes.length,0,'map mode cancels the attack while retaining cooldown');
cancel.explorer.pause();cancel.explorer.enter();cancel.swing();cancel.step(.4);
assert.equal(cancel.strikes.length,0,'pause cannot reset the cooldown');
cancel.step(.01);cancel.swing();cancel.step(.39);assert.equal(cancel.strikes.length,1,'the crowbar can swing again after its full remaining cooldown');
cancel.swing();cancel.step(.5);assert.equal(cancel.strikes.length,1,'no stale or repeated damage occurs during recovery');
console.log('Crowbar OK: longer model, real leaning shed pickup, 1 o’clock orientation and unchanged forward tilt, handle pivot, wider head-led arc, aim alignment, 0.2 second charge, one hit per swing, exact 1.2 second interval at 25/60/144 FPS and touch, canceled windups and cooldown across item/map/pause changes.');
