import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createEscapeFullscreen} from '../src/frog-escape-fullscreen.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createNavigation} from '../src/frog-escape-navigation.js';
import {setEscapeLanguage} from '../src/frog-escape-i18n.js';

class Control extends EventTarget{
  constructor(){super();this.children=new Map();this.attributes={};this.style={};this.dataset={};this.open=false;this.hidden=false;this.textContent='';const classes=new Set();this.classList={add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name),toggle(name,on){on?classes.add(name):classes.delete(name);}};}
  setAttribute(key,value){this.attributes[key]=value;}getAttribute(key){return this.attributes[key]??null;}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}closest(){return null;}focus(){this.focused=true;}showModal(){this.open=true;}close(){this.open=false;}setPointerCapture(){}
}
function dispatch(target,type,props={}){const event=new Event(type,{cancelable:true});for(const[key,value]of Object.entries(props))Object.defineProperty(event,key,{value});target.dispatchEvent(event);return event;}
const controls=new Map(),slots=Array.from({length:7},()=>new Control());globalThis.document=new Control();document.querySelector=key=>{if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};document.querySelectorAll=()=>slots;document.hidden=false;
globalThis.window=new Control();window.matchMedia=()=>({matches:false});
const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary:[[-100,-100],[100,-100],[100,100],[-100,100]]}),pin=new THREE.Object3D(),canvas=new Control(),status=new Control(),stage=new Control();scene.add(pin);canvas.requestPointerLock=()=>Promise.resolve();
const explorer=createEscapeExplorer({scene,navigation,canvas,status,stage,groups:{labels:new THREE.Group()},roof:new THREE.Group(),playerPin:pin,doors:[],onMap(){}});
explorer.refreshLanguage();assert.equal(controls.get('#escape-explore').textContent,'开始游戏');
dispatch(controls.get('#escape-settings-button'),'click');assert(controls.get('#escape-pause').open&&!explorer.active,'settings open before starting without starting or locking difficulty');
dispatch(controls.get('#escape-pause'),'cancel');assert(!controls.get('#escape-pause').open&&!explorer.active);
dispatch(document,'keydown',{code:'Escape',target:{closest:selector=>selector==='dialog'?{}:null}});assert(!controls.get('#escape-pause').open,'Esc in release notes or another modal must not open nested settings');
dispatch(document,'keydown',{code:'Escape'});assert(controls.get('#escape-pause').open,'Esc opens map settings');dispatch(controls.get('#escape-resume'),'click');
dispatch(controls.get('#escape-explore'),'click');assert(explorer.active&&controls.get('#escape-explore').hidden,'start overlay disappears during play');
Object.assign(explorer.player,{x:15,y:-.83,z:0});explorer.tick(1/60);assert(status.hidden&&status.textContent==='');assert(!controls.has('#escape-pause-button'));
dispatch(document,'keydown',{code:'Escape'});assert(explorer.paused&&controls.get('#escape-pause').open);const pausedHealth=explorer.player.health;
setEscapeLanguage('en');explorer.refreshLanguage();assert.equal(controls.get('#escape-resume').textContent,'Resume Game');assert(controls.get('#escape-stamina-meter').attributes['aria-valuetext'].includes('%'));assert(!controls.has('#escape-stamina-value'));
dispatch(controls.get('#escape-resume'),'click');assert(!explorer.paused&&explorer.player.health===pausedHealth);explorer.showMap();assert(!controls.get('#escape-explore').hidden);explorer.audio.dispose();

const root=new Control();let entries=0,exits=0,notifications=0;document.fullscreenEnabled=true;
root.requestFullscreen=async()=>{entries++;document.fullscreenElement=root;document.dispatchEvent(new Event('fullscreenchange'));};
document.exitFullscreen=async()=>{exits++;document.fullscreenElement=null;document.dispatchEvent(new Event('fullscreenchange'));};
const fullscreen=createEscapeFullscreen({root,onChange:()=>notifications++});const fullscreenButton=controls.get('#escape-fullscreen');
assert.equal(fullscreenButton.textContent,'Fullscreen · F11');assert(await fullscreen.toggle());assert.equal(entries,1);assert(fullscreen.active&&root.classList.contains('is-fullscreen'));assert.equal(fullscreenButton.textContent,'Exit fullscreen · F11');
const key=dispatch(document,'keydown',{code:'F11'});assert(key.defaultPrevented);await Promise.resolve();assert.equal(exits,1);assert(!fullscreen.active);
dispatch(document,'keydown',{code:'F11',repeat:true});dispatch(document,'keydown',{code:'F11',ctrlKey:true});assert.equal(entries,1,'key repeat and browser modifier shortcuts do not toggle');
let release;root.requestFullscreen=()=>new Promise(resolve=>release=()=>{entries++;document.fullscreenElement=root;resolve();});
// Controller intentionally retains the original request API, like the browser.
fullscreen.dispose();const pendingController=createEscapeFullscreen({root});const first=pendingController.toggle();assert.equal(await pendingController.toggle(),false,'duplicate pending fullscreen requests are ignored');release();assert(await first);pendingController.dispose();document.fullscreenElement=null;
root.requestFullscreen=async()=>{throw Error('denied');};const failed=createEscapeFullscreen({root});assert.equal(await failed.toggle(),false);assert(controls.get('#escape-fullscreen-status').textContent.includes('Try'));assert(!controls.get('#escape-fullscreen-status').hidden);failed.dispose();
delete root.requestFullscreen;const unsupported=createEscapeFullscreen({root});assert(fullscreenButton.disabled);assert(!dispatch(document,'keydown',{code:'F11'}).defaultPrevented,'unsupported API preserves native browser F11');unsupported.dispose();assert(notifications>=2);
setEscapeLanguage('zh');delete globalThis.document;delete globalThis.window;

const html=readFileSync('frog-escape-map.html','utf8'),css=readFileSync('src/frog-escape-map.css','utf8');const pause=html.slice(html.indexOf('<dialog id="escape-pause"'),html.indexOf('<dialog id="escape-caught"'));
assert(pause.includes('id="escape-language"')&&!html.slice(0,html.indexOf('<section class="escape-stage"')).includes('id="escape-language"'),'language selector lives only in settings');
assert(pause.includes('<details')&&!pause.includes('<details open'),'controls help starts collapsed');assert((pause.match(/<p>/g)??[]).length<=2,'settings no longer show long gameplay introductions');
assert(!html.includes('id="escape-pause-button"'));assert(!html.includes('id="escape-stamina-value"'));assert(html.includes('>开始游戏</button>'));assert(css.includes('width:240px')&&css.includes('width:200px'),'longer health and stamina bars on desktop and phones');assert(css.includes('#app:fullscreen>.escape-stage')&&css.includes('height:100dvh'),'fullscreen stage fills the root while keeping dialogs inside it');
console.log('Interface OK: longer numeric-free stamina HUD, start/hidden play controls, no floor/free-exploration banner, compact settings and native controls, live language retention, pregame/in-game Esc, fullscreen root/F11/exit/repeat/pending/denial/native fallback and progress preservation.');
