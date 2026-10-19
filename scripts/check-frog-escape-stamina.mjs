import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createNavigation,WALK_SPEED,SPRINT_SPEED} from '../src/frog-escape-navigation.js';
import {damagePlayer,healPlayer} from '../src/frog-escape-vitals.js';
import {setEscapeLanguage} from '../src/frog-escape-i18n.js';

class Control extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.children=new Map();this.attributes={};this.open=false;this.hidden=false;this.value='';this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(key,value){this.attributes[key]=value;}closest(){return null;}focus(){}setPointerCapture(){}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}
  showModal(){this.open=true;}close(){this.open=false;}getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
}
function setup({touch=false,health=100}={}) {
  const controls=new Map();globalThis.document=new Control();document.querySelector=id=>{if(!controls.has(id))controls.set(id,new Control());return controls.get(id);};document.querySelectorAll=()=>Array.from({length:7},()=>new Control());document.hidden=false;
  globalThis.window=new Control();window.matchMedia=query=>({matches:query==='(pointer:coarse)'&&touch});
  const canvas=new Control();canvas.requestPointerLock=()=>{document.pointerLockElement=canvas;document.dispatchEvent(new Event('pointerlockchange'));return Promise.resolve();};document.exitPointerLock=()=>{document.pointerLockElement=null;document.dispatchEvent(new Event('pointerlockchange'));};
  const scene=new THREE.Scene(),pin=new THREE.Object3D();scene.add(pin);const navigation=createNavigation({solids:[],stairs:[],boundary:[[-1000,-1000],[1000,-1000],[1000,1000],[-1000,1000]]});
  const explorer=createEscapeExplorer({scene,canvas,stage:new Control(),status:new Control(),groups:{labels:new THREE.Group()},roof:new THREE.Group(),playerPin:pin,navigation,doors:[],onMap(){}});
  Object.assign(explorer.player,{x:15,y:-.83,z:-10,yaw:0,health,stamina:20});explorer.enter();
  const emit=(target,type,props={})=>{const e=new Event(type,{cancelable:true});for(const[k,v]of Object.entries(props))Object.defineProperty(e,k,{value:v});target.dispatchEvent(e);return e;};
  const key=(code,type='keydown')=>emit(document,type,{code});
  return {explorer,controls,key,emit,navigation};
}
const run=(seconds,explorer,fps)=>{for(let left=seconds;left>1e-9;){const dt=Math.min(1/fps,left);explorer.tick(dt);left-=dt;}};
assert.equal(SPRINT_SPEED/WALK_SPEED,1.7);
for(const fps of [30,60,144])for(const health of [100,50,25]) {
  const t=setup({health}),{explorer,key,controls}=t,p=explorer.player,max=20,rate=health/25;
  key('KeyW');key('KeyR');run(max,explorer,fps);assert(p.stamina<1e-6,'full continuous sprint always lasts exactly 20 seconds');assert(p.sprintExhausted);
  const z=p.z;run(.5,explorer,fps);assert(Math.abs(p.stamina-rate*.5)<1e-6,'exhausted walking recovers stamina without flickering back into a sprint');assert(z-p.z<SPRINT_SPEED*.5);
  key('KeyR','keyup');run(1,explorer,fps);assert(Math.abs(p.stamina-rate*1.5)<1e-6,'normal walking restores health/25 each second');
  key('KeyR');const before=p.stamina;run(.25,explorer,fps);assert(Math.abs(p.stamina-(before-.25))<1e-6,'release and press resumes sprint, with no simultaneous recovery');
  explorer.pause();const paused=p.stamina;run(1,explorer,fps);assert.equal(p.stamina,paused);explorer.enter();
  explorer.showMap();run(1,explorer,fps);assert.equal(p.stamina,paused,'maps freeze stamina');explorer.enter();
  key('KeyW','keyup');key('KeyR','keyup');run(30,explorer,fps);assert(Math.abs(p.stamina-max)<1e-6,'stamina always caps at 20');
  assert.equal(controls.get('#escape-stamina-meter').max,max);assert.equal(Number(controls.get('#escape-stamina-meter').attributes['aria-valuemax']),max);
  explorer.showMap();explorer.audio.dispose();
}
{
  const {explorer,key,controls}=setup(),p=explorer.player;key('KeyW');key('KeyR');run(1,explorer,60);assert(Math.abs(p.stamina-19)<1e-7);
  const stored=p.stamina;damagePlayer(p,50,'slam');assert.equal(p.staminaMax,20);assert.equal(p.stamina,stored,'damage does not reduce current stamina or capacity');
  key('KeyR','keyup');healPlayer(p,10);assert.equal(p.staminaMax,20);assert.equal(p.stamina,stored,'healing leaves capacity and current stamina unchanged');p.stamina=10;run(1,explorer,60);assert(Math.abs(p.stamina-12.4)<1e-6);
  key('ShiftLeft');key('KeyR');const before=p.stamina;run(.5,explorer,60);assert(p.stamina>before,'crouching never drains sprint stamina');
  key('ShiftLeft','keyup');key('KeyR','keyup');key('KeyW','keyup');const state=p.stamina;explorer.restartPosition();assert.equal(p.stamina,state,'ordinary position reset cannot refill stamina');
  setEscapeLanguage('en');explorer.refreshLanguage();assert(controls.get('#escape-stamina-meter').attributes['aria-valuetext'].includes('%'));assert(!controls.has('#escape-stamina-value'),'stamina has no seconds label');setEscapeLanguage('zh');
  explorer.showMap();explorer.audio.dispose();
}
{
  const {explorer,controls,emit}=setup({touch:true}),p=explorer.player,sprint=controls.get('#escape-touch-sprint'),stick=controls.get('#escape-joystick');
  emit(sprint,'pointerdown',{pointerId:1});emit(stick,'pointerdown',{pointerId:2,clientX:50,clientY:15});run(1,explorer,60);assert(Math.abs(p.stamina-19)<1e-7,'touch sprint uses the same timer');
  emit(sprint,'pointerup',{pointerId:1});run(1,explorer,60);assert.equal(p.stamina,20,'touch release recovers while walking');explorer.showMap();explorer.audio.dispose();
}
{
  const {explorer,navigation,key}=setup();navigation.solids.push({x:15,z:-10.5,halfX:1,halfZ:.1,minY:-.83,maxY:3,axisX:[1,0],axisZ:[0,1]});
  key('KeyW');key('KeyR');run(15,explorer,60);assert(explorer.player.stamina>19.9,'pushing an immovable wall does not consume sprint time');explorer.showMap();explorer.audio.dispose();
}
delete globalThis.document;delete globalThis.window;
const html=readFileSync('frog-escape-map.html','utf8'),css=readFileSync('src/frog-escape-map.css','utf8');
const panel=html.slice(html.indexOf('id="escape-player-vitals"'),html.indexOf('id="escape-vitals"'));
assert(panel.includes('escape-health-meter')&&panel.includes('escape-stamina-meter')&&panel.indexOf('escape-health-meter')<panel.indexOf('escape-stamina-meter'),'health is above stamina in its own lower-left panel');
assert(css.includes('.escape-player-vitals{position:absolute;bottom:18px;left:18px')&&css.includes('--meter-color:#62a9ed'),'the lower-left stamina meter is blue');
console.log('Stamina OK: fixed 20-second budget at every health, health/25 per-second recovery at 30/60/144 FPS, no recovery during sprint, exhaustion/release without pulsing, damage/healing never change capacity or current stamina, walk/crouch/blocked-wall/touch, pause/map/reset invariants and localized blue HUD.');
