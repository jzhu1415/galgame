import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {createEscapeAudio,createFoleyMixer,foleyClips,propSoundMaterial,soundPlacement,escapeAudioSettingsKey} from '../src/frog-escape-audio.js';
import {createNavigation,createPlayer,advancePlayer,jumpPlayer} from '../src/frog-escape-navigation.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {propItem} from '../src/frog-escape-props.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {updateCastleDoor} from '../src/frog-escape-doors.js';
import {updateFixtureAction} from '../src/frog-escape-interactions.js';
import {CROWBAR_MELEE} from '../src/frog-escape-melee.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';

let bytes=0;
for(const [name,clip] of Object.entries(foleyClips)) {
  const sourceFile=clip.sourceFile??`${name}.ogg`,raw=readFileSync(`assets/audio/frog-escape/${sourceFile}`),wav=readFileSync(`public/audio/frog-escape/${clip.file}`);
  if(sourceFile.endsWith('.ogg'))assert.equal(raw.subarray(0,4).toString(),'OggS');
  else if(sourceFile.endsWith('.flac'))assert.equal(raw.subarray(0,4).toString(),'fLaC');
  else if(sourceFile.endsWith('.wav'))assert.equal(raw.subarray(0,4).toString(),'RIFF');
  else assert(raw.subarray(0,3).toString()==='ID3'||raw[0]===255&&(raw[1]&224)===224,'retained MP3 source has a valid header');
  assert.equal(createHash('sha256').update(raw).digest('hex'),clip.sourceSha256);
  assert.equal(wav.subarray(0,4).toString(),'RIFF');assert.equal(wav.subarray(8,12).toString(),'WAVE');assert.equal(createHash('sha256').update(wav).digest('hex'),clip.sha256);
  assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt32LE(24),32000);assert.equal(wav.readUInt16LE(34),16);
  let offset=12,pcm;
  while(offset+8<=wav.length){const size=wav.readUInt32LE(offset+4);if(wav.subarray(offset,offset+4).toString()==='data')pcm=wav.subarray(offset+8,offset+8+size);offset+=8+size+(size%2);}
  assert(pcm&&pcm.length>1000);let peak=0,power=0;
  for(let i=0;i<pcm.length;i+=2){const value=pcm.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(value));power+=value*value;}
  assert(peak>.2&&peak<.81&&Math.sqrt(power/(pcm.length/2))>.008,`${name} must contain audible, unclipped audio`);
  assert(Math.abs(pcm.length/64000-clip.duration)<.001);
  if(name==='naiwaAndy'){assert.equal(clip.license,'User-provided; not CC0');assert.equal(createHash('sha256').update(readFileSync(`assets/audio/frog-escape/${clip.sourceVideo}`)).digest('hex'),clip.sourceVideoSha256);}
  else assert.equal(clip.license,'CC0-1.0');bytes+=statSync(`public/audio/frog-escape/${clip.file}`).size;
  if(clip.role){assert(clip.author&&clip.sourcePage&&clip.sourceFile);assert(clip.peakTime>=0&&clip.peakTime<clip.duration);}
}
assert(bytes<2_500_000);assert.equal(Object.keys(foleyClips).length,78);
assert.equal(readFileSync('assets/audio/frog-escape/manifest.json','utf8'),readFileSync('public/audio/frog-escape/manifest.json','utf8'));
for(const pack of ['impact-sounds','rpg-audio'])assert(readFileSync(`public/audio/frog-escape/${pack}-LICENSE.txt`,'utf8').includes('Creative Commons Zero'));
for(const file of ['organic-wooshes-LICENSE.txt','supplemental-CC0-LICENSE.txt'])assert(/CC0|Creative Commons 0/.test(readFileSync(`public/audio/frog-escape/${file}`,'utf8')));

const saved=new Map();globalThis.window={localStorage:{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)}};
function recordingMixer() {
  const calls=[];return {calls,unlocks:0,stops:0,unlock(){this.unlocks++;return Promise.resolve(true);},play(name,options){assert(foleyClips[name],`unknown clip ${name}`);calls.push({name,...options});},setActive(value){this.active=value;if(!value)this.stops++;},setSettings(value){this.settings=value;},stopAll(){this.stops++;},dispose(){this.disposed=true;}};
}
function setup({doors=[],interactables=[],scene=new THREE.Scene(),navigation={lineClear:()=>true}}={}) {
  const player={...createPlayer(),x:0,y:.15,z:0},npc={actor:{...createPlayer(),kind:'pursuer',x:2,y:.15,z:-2,collider:{}},state:'patrol'},mixer=recordingMixer();
  const audio=createEscapeAudio({scene,player,listener:()=>({x:player.x,y:player.y+1.58,z:player.z,yaw:player.yaw}),navigation,doors,interactables,getPursuer:()=>npc,mixer,random:()=>.2});
  const event=(type,fields={})=>scene.dispatchEvent({type,...fields});
  return {player,npc,mixer,audio,scene,navigation,event};
}
for(const fps of [25,60,144]) {
  const test=setup();test.event('escape-player-action',{action:'swing'});assert.equal(test.mixer.calls.length,0,'map preview is silent');
  test.audio.setActive(true);await test.audio.unlock();test.audio.tick(0);
  const elapsed=Math.ceil(CROWBAR_MELEE.windup*fps-1e-8)/fps;
  test.event('escape-player-action',{action:'swing',elapsed});
  const swish=test.mixer.calls.at(-1);
  assert(Math.abs(elapsed+swish.delay+foleyClips[swish.name].peakTime/swish.rate-CROWBAR_MELEE.impact)<1e-9,'frame rounding does not move the strongest swish past the hit phase');
  test.mixer.calls.length=0;
  for(let i=0;i<fps*2;i++){test.player.x+=4.42/fps;test.audio.tick(1/fps);}
  const playerSteps=test.mixer.calls.filter(call=>call.name.startsWith('footstep_'));
  assert.equal(playerSteps.length,6,'footsteps follow actual distance consistently across frame rates');assert(playerSteps.every(call=>call.gain<=.04&&call.priority===0));
  for(const posture of ['crouch','airborne','held','idle']) {
    const before=test.mixer.calls.length;test.player.crouched=posture==='crouch';test.player.grounded=posture!=='airborne';test.player.heldBy=posture==='held'?{}:null;
    for(let i=0;i<fps;i++){if(posture!=='idle')test.player.x+=2/fps;test.audio.tick(1/fps);}
    assert.equal(test.mixer.calls.length,before,`${posture} does not emit walking sounds`);
  }
  test.player.crouched=false;test.player.grounded=true;test.player.heldBy=null;
  let before=test.mixer.calls.length;test.player.x=0;test.audio.tick(1/fps);assert.equal(test.mixer.calls.length,before,'teleporting does not become a burst of footsteps');
  test.npc.actor.x=1;test.npc.actor.z=-1;test.audio.tick(0);
  for(let i=0;i<fps;i++){test.npc.actor.z-=1.55/fps;test.audio.tick(1/fps);}
  const frogSteps=test.mixer.calls.slice(before);assert.equal(frogSteps.length,3,'Naiwa uses the exported long-stride gait for its quiet footsteps');assert(frogSteps.every(call=>call.gain<=.055));
  test.audio.setActive(false);before=test.mixer.calls.length;test.event('escape-prop-break',{item:propItem('glass','paused'),position:{x:1,y:1,z:0}});test.audio.tick(1);assert.equal(test.mixer.calls.length,before,'paused world sounds are suppressed');
  test.audio.dispose();assert(test.mixer.disposed);
}

const test=setup();test.audio.setActive(true);test.audio.tick(0);
for(const [kind,prefix] of [['glass','impactGlass'],['plate','impactPlate'],['fork','metalClink'],['bread','impactSoft'],['egg','impactSoft'],['milk','bookPlace']]) {
  const before=test.mixer.calls.length;test.event('escape-prop-impact',{item:propItem(kind,`hit-${kind}`),position:{x:1,y:1,z:0},speed:4,energy:4});
  assert(test.mixer.calls.at(-1).name.startsWith(prefix),`${kind} uses an appropriate material impact`);
  test.event('escape-prop-impact',{item:propItem(kind,`hit-${kind}`),position:{x:1,y:1,z:0},speed:4,energy:4});assert.equal(test.mixer.calls.length,before+1,'bouncing contacts are rate limited');
}
for(const fields of [{broken:true},{recentPlacement:true},{contact:{kind:'actor'}},{speed:.2}]) {
  const before=test.mixer.calls.length;test.event('escape-prop-impact',{item:propItem('glass','excluded'),position:{x:1,y:1,z:0},speed:4,energy:4,...fields});assert.equal(test.mixer.calls.length,before,'a break, fresh placement, actor hit or resting contact does not double-play an impact');
}
let before=test.mixer.calls.length;test.event('escape-prop-break',{item:propItem('glass','break-glass'),position:{x:1,y:1,z:0}});
assert.equal(test.mixer.calls.length,before+1);assert.equal(foleyClips[test.mixer.calls.at(-1).name].role,'glass-break');
assert.equal(test.mixer.calls.at(-1).delay,0);assert.equal(test.mixer.calls.at(-1).duration,undefined,'the original crack and settling fragments play as one complete recording');
test.event('escape-prop-break',{item:propItem('glass','break-glass'),position:{x:1,y:1,z:0}});assert.equal(test.mixer.calls.length,before+1,'duplicate break events do not replay the recording');
for(const kind of ['plate','bowl','cup','bottle']) {
  before=test.mixer.calls.length;test.event('escape-prop-break',{item:propItem(kind,`break-${kind}`),position:{x:1,y:1,z:0}});assert.equal(test.mixer.calls.length,before+1);
  const call=test.mixer.calls.at(-1);assert.equal(foleyClips[call.name].role,kind==='bottle'?'glass-break':'ceramic-break');
  if(kind==='cup')assert.equal(call.name,'ceramicBreak_01');if(kind==='bottle')assert.equal(call.name,'glassBreak_03');
}
before=test.mixer.calls.length;test.event('escape-scenery-break',{breakable:{id:'window',kind:'window'},position:{x:1,y:2,z:0}});assert.equal(test.mixer.calls.length,before+1);assert.equal(foleyClips[test.mixer.calls.at(-1).name].role,'window-break');
before=test.mixer.calls.length;test.event('escape-prop-break',{item:propItem('glass','far-away'),position:{x:100,y:1,z:0}});assert.equal(test.mixer.calls.length,before,'inaudibly distant sounds are culled');
// Small cutlery stays a short clink even at high speed. Heavy tools ring on
// walls and clatter once on the floor; light placement remains much quieter.
for(const [kind,speed,normal,expected] of [
  ['fork',14,{y:1},'metal-clink'],['crowbar',4,{y:0},'metal-clang'],['crowbar',4,{y:1},'metal-drop'],
]) {
  const item=propItem(kind,`metal-${expected}`);test.event('escape-prop-impact',{item,position:{x:1,y:1,z:0},normal,speed,energy:item.mass*speed*speed/2,contact:{kind:'surface'}});
  assert.equal(foleyClips[test.mixer.calls.at(-1).name].role,expected);
}
const hardMetalGain=test.mixer.calls.at(-1).gain;
test.event('escape-prop-place',{item:propItem('fork','place-fork'),position:{x:1,y:1,z:0}});assert(test.mixer.calls.at(-1).name.startsWith('metalClink'));assert(test.mixer.calls.at(-1).gain<hardMetalGain);
test.event('escape-prop-pickup',{item:propItem('knife','pickup-knife')});assert.equal(test.mixer.calls.at(-1).name,'metalClick');
test.event('escape-prop-release',{item:propItem('bread','throw-bread'),thrown:true});assert(test.mixer.calls.at(-1).name.startsWith('knifeSlice'));
test.audio.tick(.2);test.event('escape-player-action',{action:'swing'});assert(test.mixer.calls.at(-1).name.startsWith('crowbarSwing'));
for(let i=0;i<4;i++) {
  test.audio.tick(CROWBAR_MELEE.interval);test.event('escape-player-action',{action:'swing'});
  const call=test.mixer.calls.at(-1),peak=foleyClips[call.name].peakTime/call.rate+call.delay;
  assert(Math.abs(peak-(CROWBAR_MELEE.impact-CROWBAR_MELEE.windup))<1e-9,'each swish variant peaks on the hit frame, accounting for pitch');
  assert(CROWBAR_MELEE.windup+call.delay+foleyClips[call.name].duration/call.rate<CROWBAR_MELEE.swingEnd+.03,'the swish ends with the forward stroke');
}
before=test.mixer.calls.length;test.event('escape-melee-strike',{hit:true,hitKind:'surface',surfaceMaterial:'metal',position:{x:1,y:1,z:0}});
assert.equal(test.mixer.calls.length,before+1);assert.equal(foleyClips[test.mixer.calls.at(-1).name].role,'metal-clang','crowbar striking a metal fixture rings once');
before=test.mixer.calls.length;test.event('escape-melee-strike',{hit:true,broken:true,hitKind:'item',struckItem:propItem('glass','already-broken'),position:{x:1,y:1,z:0}});assert.equal(test.mixer.calls.length,before,'a breaking strike leaves the sound to the full shatter cue');
for(const target of [{hitKind:'actor'},{hitKind:'surface',surfaceMaterial:'stone'},{hitKind:'surface',surfaceMaterial:'wood'},{hitKind:'surface',surfaceMaterial:'metal'},{hitKind:'window',broken:true},{hitKind:'item',struckItem:propItem('plate','broken-bonk'),broken:true}]) {
  test.audio.tick(1.2);before=test.mixer.calls.length;
  test.event('escape-melee-strike',{hit:true,item:propItem('crowbar','uniform-bonk'),position:{x:1,y:1,z:0},...target});
  assert.equal(test.mixer.calls.length,before+1);assert.equal(test.mixer.calls.at(-1).name,'metalClang_03','every crowbar target gets the same single metallic bonk, including a breaking target');
}
test.audio.tick(1.2);before=test.mixer.calls.length;test.event('escape-melee-strike',{hit:false,item:propItem('crowbar','whiff')});assert.equal(test.mixer.calls.length,before,'an air swing has no metal impact');
test.event('escape-pursuer-hit',{actor:test.npc.actor,item:propItem('crowbar','crowbar'),damage:35,health:65});assert(test.mixer.calls.at(-1).name.startsWith('impactPunch'));
test.event('escape-pursuer-skill',{actor:test.npc.actor,kind:'slam',stage:'start'});assert(test.mixer.calls.at(-1).name.startsWith('crowbarSwing')&&test.mixer.calls.at(-1).delay>0,'the weighty swish anticipates the strike');
test.event('escape-pursuer-skill',{actor:test.npc.actor,kind:'slam',stage:'hit'});assert(test.mixer.calls.slice(-2).some(call=>call.name.startsWith('impactPunch_heavy')&&call.rate>.92&&call.rate<1)&&test.mixer.calls.at(-1).name.startsWith('impactSoft_medium'),'a solid punch and short soft impact replace the knife-like slam sound');
test.event('escape-player-land',{height:6,speed:12});assert(test.mixer.calls.slice(-2).some(call=>call.name.startsWith('impactPunch_heavy')));
test.audio.setSettings({enabled:false});before=test.mixer.calls.length;test.event('escape-player-action',{action:'swing'});assert.equal(test.mixer.calls.length,before);
assert(saved.has(escapeAudioSettingsKey)&&saved.size===1,'sound preferences write only their own storage key');test.audio.setSettings({enabled:true,volume:.4});assert.equal(test.audio.settings.volume,.4);
const restored=setup();assert.equal(restored.audio.settings.volume,.4);restored.audio.dispose();saved.clear();test.audio.dispose();

const ear={x:0,y:1.7,z:0,yaw:0},clear={lineClear:()=>true},blocked={lineClear:()=>false};
assert(soundPlacement({x:3,y:1.7,z:0},ear,clear).pan>0);assert(soundPlacement({x:-3,y:1.7,z:0},ear,clear).pan<0);
assert(soundPlacement({x:2,y:1.7,z:0},ear,clear).gain>soundPlacement({x:12,y:1.7,z:0},ear,clear).gain);
assert.equal(soundPlacement({x:30,y:1.7,z:0},ear,clear).gain,0);
assert(Math.abs(soundPlacement({x:3,y:1.7,z:0},ear,blocked).gain/soundPlacement({x:3,y:1.7,z:0},ear,clear).gain-.3)<1e-9);
assert(soundPlacement({x:3,y:1.7,z:0},ear,blocked).occluded);

// Use the actual crowbar raycast, actor collider and damage event together:
// one body impact plus one metal contact, including a contact during damage immunity.
const contactScene=new THREE.Scene(),contactNav=createNavigation({solids:[],stairs:[],boundary:[[-10,-10],[10,-10],[10,10],[-10,10]]});
const contactPlayer={...createPlayer(),x:0,y:.15,z:0},contactItems=createWorldItems(contactScene,contactNav);
const contactNpc=createNaiwaPursuer({scene:contactScene,navigation:contactNav,doors:[],worldItems:contactItems,player:contactPlayer,spawn:{x:0,y:.15,z:-1.4}});
const contactMixer=recordingMixer(),contactAudio=createEscapeAudio({scene:contactScene,player:contactPlayer,listener:()=>({x:0,y:1.73,z:0}),navigation:contactNav,getPursuer:()=>contactNpc,mixer:contactMixer,random:()=>.2});
contactAudio.setActive(true);
const bar=propItem('crowbar','actor-contact'),strike=()=>contactItems.strike(new THREE.Vector3(0,1.73,0),new THREE.Vector3(0,0,-1),bar);
assert(strike().hit);assert.equal(contactNpc.health,15);
assert.equal(contactMixer.calls.filter(call=>foleyClips[call.name].role==='metal-clang').length,1,'a real crowbar contact adds exactly one metallic hit');
assert.equal(contactMixer.calls.filter(call=>call.name.startsWith('impactPunch')).length,1,'the existing nonvocal body impact remains');
assert.equal(contactNpc.model.activeClip,'Hit','being hit still uses the normal reaction; the prepared block is not selected by AI');
contactAudio.tick(.2);before=contactMixer.calls.length;assert(strike().hit);assert.equal(contactNpc.health,15);
assert.equal(contactMixer.calls.length,before+1);assert.equal(foleyClips[contactMixer.calls.at(-1).name].role,'metal-clang','physical contact still rings when repeated damage is rejected');
contactAudio.tick(.2);before=contactMixer.calls.length;
contactScene.dispatchEvent({type:'escape-pursuer-hit',actor:contactNpc.actor,item:bar,damage:5,health:10,source:'projectile'});
assert.equal(contactMixer.calls.length,before+2,'a thrown crowbar gets one metallic contact and one body impact');
contactAudio.tick(.2);before=contactMixer.calls.length;contactScene.dispatchEvent({type:'escape-pursuer-block',actor:contactNpc.actor,item:bar,source:'projectile'});
assert.equal(contactMixer.calls.length,before+1);assert.equal(contactMixer.calls.at(-1).name,'metalClang_03','a deflected crowbar rings once without a body-damage sound');
contactAudio.dispose();contactNpc.dispose();

// Real physics and authored moving door/drawer/cabinet/chest geometry drive the router.
const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),worldItems=createWorldItems(scene,castle.navigation),mixer=recordingMixer();
const playerAt={...createPlayer(),x:0,y:.15,z:0};
const router=createEscapeAudio({scene,player:playerAt,listener:()=>({x:playerAt.x,y:playerAt.y+1.58,z:playerAt.z,yaw:0}),navigation:castle.navigation,doors:castle.doors,interactables:castle.interactables,mixer,random:()=>.2});router.setActive(true);
for(const panel of [castle.doors[0],...['drawer','cabinet','chest'].map(kind=>castle.interactables.find(panel=>panel.fixtureKind===kind))]) {
  assert(panel,'every required type exists in the real scene');
  const point=panel.anchor?panel.anchor.getWorldPosition(new THREE.Vector3()):new THREE.Vector3(panel.x,panel.y+1,panel.z);Object.assign(playerAt,{x:point.x+1,y:point.y-1,z:point.z+1});
  router.reset();panel.locked=false;panel.open=true;before=mixer.calls.length;
  for(let i=0;i<65;i++){if(panel.kind==='fixture')updateFixtureAction(panel,.02);else updateCastleDoor(panel,.02);router.tick(.02);}
  assert(mixer.calls.length>before,`${panel.fixtureKind??'door'} makes a sound only when its actual amount moves`);
  panel.open=false;before=mixer.calls.length;
  for(let i=0;i<65;i++){if(panel.kind==='fixture')updateFixtureAction(panel,.02);else updateCastleDoor(panel,.02);router.tick(.02);}
  assert(mixer.calls.length>before,'closing uses a distinct creak and endpoint contact');before=mixer.calls.length;
  for(let i=0;i<80;i++)router.tick(.02);assert.equal(mixer.calls.length,before,'stationary or blocked panels do not repeatedly sound');
}
Object.assign(playerAt,{x:15,y:-.83,z:-10});router.reset();
const placed=worldItems.place(propItem('bowl','real-placement'),{position:new THREE.Vector3(15,-.75,-11),yaw:0,valid:true});assert(placed);assert(mixer.calls.at(-1).name.startsWith('impactPlate_light'));
const falling=worldItems.drop(propItem('glass','real-fall'),{...playerAt,y:1,yaw:0});assert(falling);before=mixer.calls.length;
for(let i=0;i<70;i++){worldItems.tick(.02);router.tick(.02);}assert(falling.broken);assert(mixer.calls.slice(before).some(call=>call.name.startsWith('glassBreak')),'a real dropped glass breaks with the complete glass recording');
playerAt.onJump=event=>scene.dispatchEvent({type:'escape-player-action',action:'jump',...event});Object.assign(playerAt,{grounded:true,velocityY:0});before=mixer.calls.length;
assert(jumpPlayer(playerAt));assert.equal(mixer.calls.length,before+1,'an accepted jump has one quiet nonvocal clothing sound');assert(!jumpPlayer(playerAt));assert.equal(mixer.calls.length,before+1,'a rejected air jump is silent');
playerAt.onLand=event=>scene.dispatchEvent({type:'escape-player-land',...event});Object.assign(playerAt,{y:5.15,grounded:false,fallStartY:5.15,velocityY:0});before=mixer.calls.length;
for(let i=0;i<90;i++){advancePlayer(playerAt,0,0,.02,castle.navigation);router.tick(.02);}assert.equal(playerAt.health,92);assert(mixer.calls.slice(before).some(call=>call.name.startsWith('impactPunch_heavy')),'a real high fall lands with a nonvocal body impact');router.dispose();

// Exercise the Web Audio backend without launching a browser or playing on the host.
class Param {constructor(value=0){this.value=value;this.events=[];}setValueAtTime(value,time){this.value=value;this.events.push(['set',value,time]);}linearRampToValueAtTime(value,time){this.value=value;this.events.push(['ramp',value,time]);}}
class AudioNode {connect(next){this.connected=next;}disconnect(){this.disconnected=true;}}
class Context {
  constructor(){this.currentTime=0;this.state='suspended';this.destination={};this.sources=[];this.gains=[];this.filters=[];}
  resume(){this.state='running';return Promise.resolve();}
  close(){this.state='closed';return Promise.resolve();}
  createGain(){const node=new AudioNode();node.gain=new Param();this.gains.push(node);return node;}
  createBiquadFilter(){const node=new AudioNode();node.frequency=new Param();this.filters.push(node);return node;}
  createStereoPanner(){const node=new AudioNode();node.pan=new Param();return node;}
  createDynamicsCompressor(){const node=new AudioNode();for(const key of ['threshold','knee','ratio','attack','release'])node[key]=new Param();this.limiter=node;return node;}
  createBufferSource(){const node=new AudioNode();node.playbackRate=new Param();node.start=(...args)=>{node.started=args;};node.stop=()=>{node.stopped=true;node.onended?.();};this.sources.push(node);return node;}
  decodeAudioData(){return Promise.resolve({duration:.4});}
}
let contexts=0,fetches=0;const context=new Context();
const backend=createFoleyMixer({contextFactory:()=>{contexts++;return context;},fetcher:async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}});
backend.setActive(true);backend.play('metalClick');assert.equal(contexts,0,'no context is created before a user unlock');await backend.unlock();await new Promise(setImmediate);
assert.equal(contexts,1);assert.equal(fetches,Object.keys(foleyClips).length);assert.equal(context.gains[0].connected,context.limiter,'the shared output limits large overlapping impacts');await backend.unlock();assert.equal(fetches,Object.keys(foleyClips).length,'each local sample decodes only once');
backend.play('metalClick',{gain:.1,occluded:true,pan:-.5});await new Promise(setImmediate);assert.equal(context.sources.length,1);assert.equal(context.filters.at(-1).frequency.value,1100);
assert(context.gains.at(-1).gain.events.some(event=>event[0]==='ramp'&&event[1]===.1),'short gain ramps prevent clicks');
backend.play('cloth1');backend.setActive(false);await new Promise(setImmediate);assert.equal(context.sources.length,1,'pause cancels pending decoded plays');assert(context.sources[0].stopped);
backend.setActive(true);backend.setSettings({enabled:false,volume:.4});backend.play('metalClick');await new Promise(setImmediate);assert.equal(context.sources.length,1);
backend.setSettings({enabled:true,volume:.4});assert.equal(context.gains[0].gain.value,.4);
for(let i=0;i<20;i++)backend.play('cloth1',{priority:0});await new Promise(setImmediate);assert.equal(context.sources.filter(source=>!source.stopped).length,16,'the voice budget caps collision and footstep pileups');
backend.play('impactPunch_heavy_000',{priority:2});await new Promise(setImmediate);assert.equal(context.sources.filter(source=>!source.stopped).length,16);assert(context.sources.at(-1).buffer,'a high-priority hit can replace a quiet step');
backend.setActive(false);backend.play('impactPunch_heavy_000',{priority:2,allowInactive:true});await new Promise(setImmediate);assert.equal(context.sources.filter(source=>!source.stopped).length,1,'only the deliberate fainting contact may sound over the outcome dialog');backend.dispose();assert.equal(context.state,'closed');
const unsupported=createFoleyMixer({contextFactory:()=>null});assert.equal(await unsupported.unlock(),false);unsupported.play('metalClick');unsupported.dispose();
const failed=createFoleyMixer({contextFactory:()=>new Context(),fetcher:()=>Promise.reject(new Error('offline'))});await failed.unlock();failed.setActive(true);failed.play('metalClick');await new Promise(setImmediate);failed.dispose();
console.log('Audio OK: 77 CC0 clips plus the retained user-provided Andy call, provenance/hashes and unclipped local PCM, real material/melee/window/food/panel/step events, silent crouch, spatial occlusion, cooldowns, unlock/cache/voice budget, mute/storage isolation, pause/map cancellation and unsupported/offline fallback.');
