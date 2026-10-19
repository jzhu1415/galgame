import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEscapeFlicker} from '../src/frog-escape-flicker.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createEscapeRenderBatches} from '../src/frog-escape-render-batches.js';
import {createEscapeQuality} from '../src/frog-escape-quality.js';
import {createEscapeAudio,createFoleyMixer,foleyClips} from '../src/frog-escape-audio.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createNavigation} from '../src/frog-escape-navigation.js';
import {damagePlayer} from '../src/frog-escape-vitals.js';

const flush=()=>new Promise(setImmediate),run=(seconds,tick,fps=60)=>{for(let left=seconds;left>1e-9;){const dt=Math.min(1/fps,left);tick(dt);left-=dt;}};
function lights(reduced=false){
  const scene=new THREE.Scene(),shared=new THREE.MeshStandardMaterial({emissive:0xffaa44,emissiveIntensity:3.5}),frame=new THREE.MeshStandardMaterial({color:0x88704b,metalness:.5}),lamps=[],glows=[];
  for(let i=0;i<3;i++){const light=new THREE.PointLight(0xffffff,10),glow=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),shared);glow.add(new THREE.Mesh(new THREE.BoxGeometry(.03,.03,.03),frame));scene.add(glow,light);light.userData.escapeFlickerGlow=glow;lamps.push(light);glows.push(glow);}
  const flicker=createEscapeFlicker(scene,{random:()=>.17,reducedMotion:()=>reduced});return {scene,shared,frame,lamps,glows,flicker};
}
let reference;
for(const fps of [30,60,144]){
  const t=lights(),samples=[],wentOut=[false,false,false],recovered=[false,false,false];let darkest=1,asynchronous=false;
  for(let i=0;i<240;i++){
    run(.25,dt=>{t.flicker.tick(dt);const factors=t.lamps.map(light=>light.intensity/10);darkest=Math.min(darkest,...factors);asynchronous ||=Math.max(...factors)-Math.min(...factors)>.2;for(let j=0;j<3;j++)assert(Math.abs(t.glows[j].material.emissiveIntensity/3.5-factors[j])<1e-10);},fps);
    samples.push(t.lamps.map((light,j)=>{if(light.intensity<.001)wentOut[j]=true;if(wentOut[j]&&light.intensity===10)recovered[j]=true;return light.intensity;}));
  }
  assert(darkest>=0&&darkest<.001&&asynchronous,'separate lamps occasionally go out and recover without global flashes');
  assert(wentOut.some(Boolean)&&recovered.some(Boolean),'a real temporary outage recovers to its full original brightness');
  if(reference)assert(samples.flat().every((v,i)=>Math.abs(v-reference.flat()[i])<1e-7),'lamp schedules and smooth fades are frame independent');else reference=samples;
  assert(t.glows.every(glow=>glow.material!==t.shared));let disposed=0;for(const glow of t.glows)glow.material.addEventListener('dispose',()=>disposed++);t.flicker.dispose();assert.equal(disposed,3);assert(t.glows.every(glow=>glow.material===t.shared));assert(t.lamps.every(light=>light.intensity===10));
  assert(t.glows.every(glow=>glow.children[0].material===t.frame),'non-emitting lamp fittings retain one shared, batchable material');
}
{
  const t=lights(true);let min=1,last=1,maxStep=0;run(80,dt=>{t.flicker.tick(dt);const value=t.lamps[0].intensity/10;min=Math.min(min,value);maxStep=Math.max(maxStep,Math.abs(value-last));last=value;},30);
  assert(min>=.7-1e-6&&min<.75&&maxStep<.006,'reduced motion uses a slow, shallow fade');t.flicker.dispose();
}
{
  const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),fridge=scene.getObjectByName('fridge:interior-light'),camera=new THREE.PerspectiveCamera(),torch=new THREE.SpotLight(0xffffff,20),moon=new THREE.DirectionalLight(0xffffff,2.15);scene.add(camera,torch,moon);assert(castle.flicker.lampCount>=5);
  const fridgeIntensity=fridge.intensity,renderer={capabilities:{maxTextureSize:4096,getMaxAnisotropy:()=>4},shadowMap:{},ratio:1,setPixelRatio(v){this.ratio=v;},getPixelRatio(){return this.ratio;},setSize(){},render(){}};
  const batching=createEscapeRenderBatches(castle),quality=createEscapeQuality({renderer,scene,moonlight:moon,flashlight:torch,dpr:()=>1,loadEffects:async()=>({createQualityEffects:()=>({resize(){},render(){},dispose(){}})})});
  quality.setQuality('low');let dimmed=false;run(45,dt=>{castle.flicker.tick(dt);quality.render(camera,{dt});for(const proxy of scene.children.filter(light=>light.name==='quality:nearby-light'))if(proxy.userData.qualitySource){const source=proxy.userData.qualitySource;assert.equal(proxy.intensity,source.visible?source.intensity:0,'low-quality proxies follow every fade frame without adding light slots');}dimmed ||=scene.children.some(o=>o.isPointLight&&o.intensity>0&&o.intensity<.5);});
  assert.equal(fridge.intensity,fridgeIntensity);assert.equal(torch.intensity,20);assert.equal(moon.intensity,2.15);
  assert.equal(scene.children.filter(light=>light.name==='quality:nearby-light').length,4);quality.setQuality('balanced');quality.setQuality('high');await flush();quality.render(camera);quality.dispose();batching.dispose();castle.flicker.dispose();
}

class Param{constructor(value=0){this.value=value;}setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}}
class Node{connect(){}disconnect(){} }
class Context{
  static all=[];
  constructor(){this.currentTime=0;this.state='suspended';this.destination={};this.sources=[];Context.all.push(this);}
  resume(){this.state='running';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
  createGain(){return Object.assign(new Node(),{gain:new Param()});}createBiquadFilter(){return Object.assign(new Node(),{frequency:new Param()});}createStereoPanner(){return Object.assign(new Node(),{pan:new Param()});}
  createBufferSource(){const source=Object.assign(new Node(),{playbackRate:new Param(1),start(){this.started=true;},stop(){this.stopped=true;}});this.sources.push(source);return source;}
  decodeAudioData(data){return Promise.resolve({duration:foleyClips[data.clipName]?.duration??.1,name:data.clipName});}
}
const fetchClip=async url=>({ok:true,arrayBuffer:async()=>{const data=new ArrayBuffer(4);data.clipName=url.split('/').at(-1).replace('.wav','');return data;}});
{
  const context=new Context(),mixer=createFoleyMixer({contextFactory:()=>context,fetcher:fetchClip});await mixer.unlock();await flush();mixer.setActive(true);
  mixer.play('naiwaAndy',{gain:.75,captureCall:true,priority:3});mixer.play('metalClick');await flush();const voice=context.sources.find(source=>source.buffer.name==='naiwaAndy');assert(voice.started);
  mixer.setActive(false,{preserveCapture:true});mixer.stopAll({preserveCapture:true});assert(!voice.stopped);assert(context.sources.filter(s=>s!==voice).every(s=>s.stopped));mixer.setActive(false);assert(voice.stopped,'ordinary pause stops the call');mixer.dispose();
}
{
  const context=new Context();let release;context.decodeAudioData=data=>data.clipName==='naiwaAndy'?new Promise(resolve=>release=()=>resolve({duration:1.23,name:'naiwaAndy'})):Promise.resolve({duration:.1,name:data.clipName});
  const mixer=createFoleyMixer({contextFactory:()=>context,fetcher:fetchClip});await mixer.unlock();await flush();mixer.setActive(true);mixer.play('naiwaAndy',{captureCall:true,priority:3});mixer.setActive(false,{preserveCapture:true});release();await flush();assert(context.sources.some(s=>s.started&&s.buffer.name==='naiwaAndy'),'deferred decoding survives an immediate capture outcome');mixer.setSettings({enabled:false,volume:.65});assert(context.sources.every(s=>s.stopped),'mute stops even the preserved call');mixer.dispose();
}

// Real grab -> capture -> reset -> outcome path with the Web Audio backend.
// No browser is opened and the fake context produces no host audio.
class Control extends EventTarget{
  constructor(){super();this.style={};this.dataset={};this.children=new Map();this.attributes={};this.classList={add(){},remove(){},toggle(){}};this.open=false;}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}setAttribute(key,value){this.attributes[key]=value;}closest(){return null;}focus(){}showModal(){this.open=true;}close(){this.open=false;}setPointerCapture(){}
}
const saved={document:globalThis.document,window:globalThis.window,fetch:globalThis.fetch,AudioContext:globalThis.AudioContext};
try{
  globalThis.AudioContext=Context;globalThis.fetch=fetchClip;
  for(const mode of ['easy','hard','hacker']){
    const controls=new Map();globalThis.document=new Control();document.querySelector=key=>{if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};document.querySelectorAll=()=>Array.from({length:7},()=>new Control());document.hidden=false;globalThis.window=new Control();window.matchMedia=()=>({matches:false});
    const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary:[[-40,-40],[40,-40],[40,40],[-40,40]]}),pin=new THREE.Object3D();scene.add(pin);const canvas=new Control();canvas.requestPointerLock=()=>Promise.resolve();
    const explorer=createEscapeExplorer({scene,navigation,canvas,stage:new Control(),status:new Control(),groups:{labels:new THREE.Group()},roof:new THREE.Group(),playerPin:pin,doors:[],onMap(){}});explorer.setDifficulty(mode);
    const doc=document;delete globalThis.document;const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:explorer.worldItems,player:explorer.player,spawn:{x:15,y:-.83,z:0},patrolRoute:[{x:15,y:-.83,z:0}],difficulty:mode,random:()=>.99,onCatch:()=>explorer.capture()});globalThis.document=doc;explorer.setPursuer(npc);explorer.enter();Object.assign(explorer.player,{x:15,y:-.83,z:-.6});await flush();const context=Context.all.at(-1);
    const step=dt=>{context.currentTime+=dt;explorer.tick(dt);};
    for(let i=0;i<600&&!explorer.player.heldBy&&!explorer.captured;i++)step(1/60);await flush();assert.equal(npc.state,'grab');const call=context.sources.filter(s=>s.buffer.name==='naiwaAndy');assert.equal(call.length,1);assert.equal(call[0].playbackRate.value,1,'the supplied call keeps its original pitch');
    for(let i=0;i<180&&!explorer.captured;i++)step(1/60);await flush();assert(explorer.captured);assert.equal(context.sources.filter(s=>s.buffer.name==='naiwaAndy').length,1,'catch/reset/outcome never duplicate the grab call');assert(!call[0].stopped,'the capture outcome does not truncate the call');
    if(mode!=='hacker'){explorer.restartPosition();assert(call[0].stopped,'waking cancels any old call');}
    explorer.showMap();explorer.audio.dispose();npc.dispose();
  }
}finally{for(const [key,value]of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
console.log('Atmosphere OK: independent frame-stable lamp outages, irregular flickers, full recovery and matching filaments, reduced-motion fades, low-light pool synchronization and disposal; actual Fool/Nerd/Transcendent capture calls keep source pitch, play once, survive reset/outcome/deferred decoding, and stop on pause/mute/wake.');
