import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createNavigation} from '../src/frog-escape-navigation.js';

class Control extends EventTarget {
  constructor(){super();this.children=new Map();this.attributes={};this.style={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};this.open=false;this.textContent='';}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}
  setAttribute(key,value){this.attributes[key]=value;}getAttribute(key){return this.attributes[key]??null;}
  closest(){return null;}focus(){}showModal(){this.open=true;}close(){this.open=false;}setPointerCapture(){}
}
const storage=new Map([['story-progress','untouched']]),writes=[],key='naiwa-escape-mouse-sensitivity-v1';
function dispatch(target,type,props={}) {const event=new Event(type,{cancelable:true});for(const [key,value]of Object.entries(props))Object.defineProperty(event,key,{value});target.dispatchEvent(event);return event;}
function setup({blocked=false}={}) {
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>{if(blocked)throw Error('blocked');return storage.get(key)??null;},setItem:(key,value)=>{if(blocked)throw Error('blocked');storage.set(key,value);writes.push(key);}}});
  const controls=new Map();globalThis.document=new Control();document.querySelector=key=>{if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};document.querySelectorAll=()=>Array.from({length:7},()=>new Control());document.hidden=false;document.exitPointerLock=()=>{document.pointerLockElement=null;};
  globalThis.window=new Control();window.matchMedia=()=>({matches:false});
  const scene=new THREE.Scene(),pin=new THREE.Object3D(),canvas=new Control();scene.add(pin);canvas.requestPointerLock=()=>Promise.resolve();
  const navigation=createNavigation({solids:[],stairs:[],boundary:[[-100,-100],[100,-100],[100,100],[-100,100]]});
  const explorer=createEscapeExplorer({scene,navigation,canvas,stage:new Control(),status:new Control(),groups:{labels:new THREE.Group()},roof:new THREE.Group(),playerPin:pin,doors:[],onMap(){}});
  const control=controls.get('#escape-mouse-sensitivity'),output=controls.get('#escape-mouse-sensitivity-value');
  return {explorer,controls,control,output,canvas,set(percent){control.value=String(percent);dispatch(control,'input');},
    lockedMove(dx,dy){document.pointerLockElement=canvas;dispatch(document,'mousemove',{movementX:dx,movementY:dy});},
    dispose(){explorer.showMap();explorer.audio.dispose();}};
}
const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
{
  const t=setup();assert.equal(t.control.value,'100');assert.equal(t.output.textContent,'100%');assert.equal(writes.length,0,'reading defaults does not write preferences or saves');
  dispatch(t.controls.get('#escape-settings-button'),'click');assert(t.controls.get('#escape-pause').open);
  const health=t.explorer.player.health,position={x:t.explorer.player.x,y:t.explorer.player.y,z:t.explorer.player.z};
  t.set(175);assert.equal(t.output.textContent,'175%');assert.equal(t.control.attributes['aria-valuetext'],'175%');assert.equal(storage.get(key),'1.75');assert(!t.explorer.active,'pregame settings do not start a run');
  assert.equal(t.explorer.player.health,health);for(const axis of ['x','y','z'])assert.equal(t.explorer.player[axis],position[axis]);
  dispatch(t.controls.get('#escape-resume'),'click');t.explorer.enter();Object.assign(t.explorer.player,{yaw:0,pitch:0});
  t.lockedMove(100,40);close(t.explorer.player.yaw,-.4375);close(t.explorer.player.pitch,-.175);
  document.pointerLockElement=null;Object.assign(t.explorer.player,{yaw:0,pitch:0});
  dispatch(t.canvas,'pointerenter',{clientX:100,clientY:100});dispatch(t.canvas,'pointermove',{pointerType:'mouse',clientX:120,clientY:108});close(t.explorer.player.yaw,-.0875);close(t.explorer.player.pitch,-.035);
  Object.assign(t.explorer.player,{yaw:0,pitch:0});
  dispatch(t.canvas,'pointerdown',{button:0,pointerId:1,pointerType:'touch',clientX:100,clientY:100});dispatch(t.canvas,'pointermove',{pointerId:1,pointerType:'touch',clientX:120,clientY:108});
  close(t.explorer.player.yaw,-.05);close(t.explorer.player.pitch,-.02);
  t.explorer.pause();const yaw=t.explorer.player.yaw;t.lockedMove(100,40);assert.equal(t.explorer.player.yaw,yaw,'pause ignores look input');
  const native=dispatch(document,'keydown',{code:'ArrowRight',target:{closest:()=>t.control}});assert(!native.defaultPrevented,'range input retains native keyboard controls');
  t.dispose();
}
{
  const t=setup();assert.equal(t.control.value,'175','a fresh explorer restores the saved choice');t.explorer.enter();Object.assign(t.explorer.player,{yaw:0,pitch:0});
  t.lockedMove(20,0);close(t.explorer.player.yaw,-.0875);
  document.pointerLockElement=null;t.explorer.pause();dispatch(t.controls.get('#escape-mouse-sensitivity-reset'),'click');assert.equal(storage.get(key),'1');assert.equal(t.output.textContent,'100%');
  t.dispose();
}
for(const [saved,percent]of [['bad',100],['NaN',100],['',100],['0',25],['10',300]]) {
  storage.set(key,saved);const t=setup();assert.equal(Number(t.control.value),percent,`safe preference: ${saved}`);t.dispose();
}
{
  const t=setup({blocked:true});assert.equal(t.control.value,'100');t.set(225);assert.equal(t.output.textContent,'225%');
  t.explorer.enter();Object.assign(t.explorer.player,{yaw:0,pitch:0});t.lockedMove(20,1000);close(t.explorer.player.yaw,-.1125);assert.equal(t.explorer.player.pitch,-1.35,'pitch keeps its existing limit');t.dispose();
}
assert(writes.every(name=>name===key));assert.equal(storage.get('story-progress'),'untouched');
delete globalThis.document;delete globalThis.window;delete globalThis.localStorage;
console.log('Mouse sensitivity OK: live locked/fallback mouse response, saved reload, 25–300% bounds, default reset, corrupt/blocked storage, pause/native keyboard/progress isolation; touch look and pitch limit preserved.');
