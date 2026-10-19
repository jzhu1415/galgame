import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createPlayer,createNavigation} from '../src/frog-escape-navigation.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {createTransparentNavigation,resolveWindowPassages,createWindowTraversal} from '../src/frog-escape-transparent.js';
import {propItem} from '../src/frog-escape-props.js';
import {alertnessPhase} from '../src/frog-escape-vitals.js';

const run=(seconds,step,fps=60)=>{for(let left=seconds;left>1e-9;){const dt=Math.min(1/fps,left);step(dt);left-=dt;}};
assert.equal(alertnessPhase(99).id,'tangwang');assert.equal(alertnessPhase(100).label,'通透模式');
function setup({difficulty='hacker',roll=.99,spawn={x:15,y:-.83,z:0},position={x:15,y:-.83,z:-12}}={}) {
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary:[[-40,-40],[40,-40],[40,40],[-40,40]]});
  const player={...createPlayer(),...position,crouched:true,hidden:true},items=createWorldItems(scene,navigation),npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:items,player,spawn,patrolRoute:[spawn],difficulty,random:()=>roll});
  const step=dt=>{npc.tick(dt);items.tick(dt,player);};run(5.1,step);
  return {scene,navigation,player,items,npc,step};
}
{
  const t=setup(),{npc,player,scene}=t;
  assert(!npc.visiblePlayer()&&!npc.knowsPlayer&&npc.state==='patrol','the blind mode cannot see a distant stationary player');
  Object.assign(player,{x:npc.actor.x+4.99,y:npc.actor.y,z:npc.actor.z,hidden:true,crouched:true});assert(npc.knowsPlayer,'smell locates a crouched hidden player inside 5 m');t.step(.02);assert.equal(npc.state,'chase');
  assert(!npc.hear({x:-20,y:-.83,z:20},.001),'a sound cannot distract a nearby scent lock');
  Object.assign(player,{x:npc.actor.x,y:npc.actor.y+5.1,z:npc.actor.z});assert(!npc.knowsPlayer,'smell uses three-dimensional distance between floors');
  Object.assign(player,{x:25,y:-.83,z:-15});
  assert(npc.hear({x:-15,y:-.83,z:15},.000001),'even a tiny far sound is heard during an old chase');
  const x=npc.actor.x;run(.2,t.step);assert(npc.actor.x<x,'the sound draws movement toward its own location');
  const actor=npc.actor,eyes=npc.model.getEyePositions(),origin=new THREE.Vector3(actor.x,actor.y+1.7,actor.z-4),target=eyes[0].clone().add(eyes[1]).multiplyScalar(.5);
  npc.setFlashlightSource(()=>({enabled:true,origin,direction:target.sub(origin).normalize(),range:20}));run(.3,t.step);assert(!npc.lightExposed&&!npc.visiblePlayer(),'blindness disables eye illumination and visual light evidence');
  // Every small player action is a gameplay sound, even without a working audio device.
  for(const [type,event]of [['escape-prop-pickup',{item:propItem('fork','quiet'),position:{x:20,y:-.83,z:10}}],['escape-player-action',{action:'flashlight'}],['escape-prop-place',{item:propItem('bread','soft'),position:{x:24,y:-.83,z:10}}]]) {
    const heard=[];const listener=e=>heard.push(e);scene.addEventListener('escape-noise',listener);scene.dispatchEvent({type,...event});assert(heard.length>0);scene.removeEventListener('escape-noise',listener);
  }
  player.hidden=false;player.crouched=false;const footsteps=[];scene.addEventListener('escape-noise',e=>{if(e.kind==='footstep')footsteps.push(e);});
  for(let i=0;i<60;i++){player.x-=.04;t.step(1/60);}assert(footsteps.length>0,'ordinary walking emits detectable footsteps');
  const count=footsteps.length;player.crouched=true;for(let i=0;i<60;i++){player.x-=.04;t.step(1/60);}assert.equal(footsteps.length,count,'crouching remains silent');
  scene.dispatchEvent({type:'escape-prop-pickup',item:propItem('boltCutters','quest-tool'),position:player});assert(npc.knowsPlayer,'collecting cutters locks on to a distant crouched player');
  assert(!npc.hear({x:-25,y:-.83,z:25},2),'a distraction cannot override the permanent tool lock');npc.reset({keepAlertness:true});assert(npc.knowsPlayer,'capture/position resets retain acquired-tool knowledge');
  npc.onPlayerWake();assert.equal(npc.phase.id,'tangwang');assert(!npc.knowsPlayer,'the special senses end below 100 alertness');npc.dispose();
}
// The exact probability boundary is evaluated before alertness from that hit.
for(const [roll,blocked]of [[.4999,true],[.5,false]]) {
  const t=setup({roll});const events=[];t.scene.addEventListener('escape-pursuer-block',e=>events.push(e));
  t.npc.hit({item:propItem('crowbar','block'),source:'melee',origin:{x:t.npc.actor.x,y:1,z:t.npc.actor.z-2}});
  assert.equal(events.length,blocked?1:0);assert.equal(t.npc.health,blocked?30:25);t.npc.dispose();
}
// A real thrown object produces a distant impact that can lure the blind actor.
{
  const t=setup({position:{x:25,y:-.83,z:-10}}),heard=[];t.scene.addEventListener('escape-prop-impact',e=>heard.push(e));
  const prop=t.items.throw(propItem('fork','lure'),t.player,new THREE.Vector3(25,.25,-10),new THREE.Vector3(-1,0,0));assert(prop);
  run(1,t.step);assert(heard.length&&t.npc.state==='search');assert(t.npc.actor.z<-.1,'the physical lure attracts the actor away from its starting point');t.npc.dispose();
}

const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),phase=createTransparentNavigation(castle.navigation,()=>true),passages=resolveWindowPassages(phase,castle.navigation.windowPassages);
assert.equal(passages.length,castle.navigation.windowPassages.length,'every authored window has a usable approach and landing');assert.equal(passages.length,16);
for(const broken of [false,true]) {
  for(const target of castle.breakables)if(broken)target.break();
  for(const fps of [30,60,144])for(const passage of passages) {
    const actor={...passage.from,bodyHeight:2.1,collider:{}},traversal=createWindowTraversal({actor,navigation:phase});
    assert(traversal.begin({passage,from:passage.from,to:passage.to}),`${passage.id}: intact/broken window accepts explicit traversal`);
    run(4,dt=>traversal.tick(dt),fps);assert(!traversal.active);assert(Math.hypot(actor.x-passage.to.x,actor.y-passage.to.y,actor.z-passage.to.z)<1e-6);assert.equal(actor.bodyHeight,2.1);
    assert(!phase.blocked(actor.x,actor.y,actor.z,false,2.1,.4),'full height is restored on a clear, supported landing');
    if(passage.bidirectional){Object.assign(actor,passage.to);assert(traversal.begin({passage,from:passage.to,to:passage.from}));run(4,dt=>traversal.tick(dt),fps);assert(Math.abs(actor.y-.15)<1e-6);}
  }
}
assert(castle.navigation.blocked(15,-.83,-4)&&!phase.blocked(15,-.83,-4,false,2.1,.4),'only the special actor passes the divider fence');
assert(castle.navigation.blocked(0,-.83,24)&&!phase.blocked(0,-.83,24,false,2.1,.4),'even an intact perimeter gate is permeable only to the special actor');
assert(phase.blocked(11.12,.15,0,false,2.1,.4),'ordinary castle walls still block the special actor');
assert(castle.navigation.blocked(0,5.15,8.68)&&!phase.blocked(0,5.15,8.68,false,2.1,.4),'balcony balusters are also permeable only to the special actor');

// A real hidden player is located by scent and checked without a visual witness.
{
  const bed=castle.beds[0],point=bed.root.getWorldPosition(new THREE.Vector3()),spawn={x:point.x+2.8,y:point.y,z:point.z-1.3};
  const player={...createPlayer(),x:point.x,y:point.y,z:point.z,hidden:true,hidingBed:bed.id},items=createWorldItems(scene,castle.navigation,castle.pickupSeeds);let caught=0;
  const npc=createNaiwaPursuer({scene,navigation:castle.navigation,doors:castle.doors,beds:castle.beds,rooms:castle.rooms,interactables:castle.interactables,worldItems:items,player,spawn,patrolRoute:[spawn],difficulty:'hacker',random:()=>.99,onCatch:()=>caught++});
  for(let i=0;i<1500&&!caught;i++){npc.tick(.02);items.tick(.02,player);}
  assert.equal(caught,1);assert(!npc.visiblePlayer(),'scent leads to the real prone bed search despite blindness');npc.dispose();
}

for(const [spawn,target,expectWindow]of [
  [{x:15,y:-.83,z:-7},{x:15,y:-.83,z:0},false],
  [passages.find(p=>p.id==='castle-window-0').from,{x:-7.75,y:-.83,z:12},true],
  [{x:1,y:5.15,z:-5.2},{x:-3.3,y:-.83,z:-13},true],
]) {
  const player={...createPlayer(),...target,hidden:true,crouched:true},items=createWorldItems(scene,castle.navigation),npc=createNaiwaPursuer({scene,navigation:castle.navigation,doors:castle.doors,worldItems:items,player,spawn,patrolRoute:[spawn],difficulty:'hacker',random:()=>.99});
  const windows=[];const listener=e=>windows.push(e);scene.addEventListener('escape-pursuer-window',listener);scene.dispatchEvent({type:'escape-prop-pickup',item:propItem('boltCutters','permanent'),position:player});
  run(12,dt=>{npc.tick(dt);items.tick(dt,player);});
  assert(Math.hypot(npc.actor.x-target.x,npc.actor.z-target.z)<1.3&&Math.abs(npc.actor.y-target.y)<.3,`actual pursuit reaches the target via ${expectWindow?'window':'fence'}`);
  assert.equal(windows.some(e=>e.stage==='end'),expectWindow);assert.equal(npc.model.root.scale.x,1,'vaulting does not shrink the character or change arm thickness');
  npc.dispose();scene.removeEventListener('escape-pursuer-window',listener);
}
console.log('Transcendent OK: 100-only blindness, 5 m 3D smell despite crouching/hiding, all-volume distant hearing and silent crouch, real thrown lure, cutter pickup lock/reset/priority, 50% frontal guard, no light response, all 16 intact/broken windows both floors at 30/60/144 FPS, reverse ground-floor traversal, safe landings and restored body, real fence/ground-window/upstairs-window pursuits and solid ordinary walls.');
