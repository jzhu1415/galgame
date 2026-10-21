import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createNavigation,createPlayer,advancePlayer,PLAYER_RADIUS} from '../src/frog-escape-navigation.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {createInventory} from '../src/frog-escape-inventory.js';
import {createEscapeAudio} from '../src/frog-escape-audio.js';
import {difficultyRules,displayAlertness,naiwaAttackDamage} from '../src/frog-escape-vitals.js';
import {propItem} from '../src/frog-escape-props.js';
import {NAIWA_HANDWALK} from '../src/frog-escape-naiwa-handwalk.js';
import {tr} from '../src/frog-escape-i18n.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createEscapeGuide} from '../src/frog-escape-guide.js';

const rules=difficultyRules('gunmu'),extreme=difficultyRules('hacker');
assert.equal(rules.label,'\u3000\u3000模式（???）');assert.equal(tr(rules.label,{},'en'),'???');assert.equal(tr(rules.phaseLabel,{},'en'),'Invisibility');
for(const key of ['captureDamage','naiwaHealth','downDuration'])assert.equal(rules[key],extreme[key],`${key} follows Hacker`);
assert.deepEqual([...readFileSync('frog-escape-map.html','utf8').matchAll(/<option value="gunmu">([^<]*)<\/option>/g)].map(match=>match[1]),[rules.label,rules.label],'both native selectors have the missing Chinese name');
const run=(seconds,fps,tick)=>{for(let rest=seconds;rest>1e-9;){const dt=Math.min(1/fps,rest);tick(dt);rest-=dt;}};
function setup({fps=60,roll=.99,route=null,difficulty='gunmu',position={x:0,y:.15,z:-3}}={}) {
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary:[[-30,-30],[30,-30],[30,30],[-30,30]]});
  const player={...createPlayer(),...position,hidden:true},items=createWorldItems(scene,navigation),spawn={x:0,y:.15,z:0},messages=[],alertnessEvents=[];
  scene.addEventListener('escape-pursuer-alertness',event=>alertnessEvents.push(event));
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:items,player,spawn,patrolRoute:route??[spawn],difficulty,random:()=>roll,onState:event=>messages.push(event)});
  const tick=dt=>{npc.tick(dt);items.tick(dt);};
  const step=seconds=>run(seconds,fps,tick);
  const assertHidden=()=>{
    assert.equal(npc.model.root.visible,false);assert.equal(scene.getObjectByName('naiwa:waist-key').visible,false);assert.equal(scene.getObjectByName('naiwa:contact-shadow').visible,false);
    let meshes=0;scene.traverseVisible(node=>{if(node.isMesh&&node.name.startsWith('naiwa:'))meshes++;});assert.equal(meshes,0);
  };
  const assertFixed=()=>{assert.equal(npc.alertness,70);assert.equal(npc.actor.alertness,70);assert.equal(npc.phase.id,'tangwang');assert.equal(npc.phase.label,'滚木模式');assert.equal(displayAlertness(npc.alertness,'gunmu'),6767);assert(alertnessEvents.every(event=>event.value===70&&event.displayValue===6767&&event.phase.id==='tangwang'&&event.phase.label==='滚木模式'));};
  return {scene,navigation,player,items,npc,messages,alertnessEvents,tick,step,assertHidden,assertFixed};
}

for(const fps of [30,60,144]) {
  const t=setup({fps});t.assertHidden();t.assertFixed();assert.equal(t.npc.actor.bodyHeight,NAIWA_HANDWALK.height);
  const hit=t.items.physics.ray({x:0,y:1,z:-3},{x:0,y:1,z:3},16);
  assert(hit?.body.actorBinding?.actor===t.npc.actor,'the invisible NPC retains its actual physics capsule');
  Object.assign(t.player,{x:0,y:.15,z:-1.4});
  run(1,fps,dt=>advancePlayer(t.player,0,2/fps,dt,t.navigation));assert(t.player.z<=-(PLAYER_RADIUS+t.npc.actor.collider.radius)+1e-6,'the player cannot walk through invisible Naiwa');
  Object.assign(t.player,{x:0,y:.15,z:-3});
  const book=t.items.throw(propItem('book',`invisible-book-${fps}`),t.player,new THREE.Vector3(0,1.3,-3),new THREE.Vector3(0,0,1));assert(book);
  t.step(.45);assert.equal(t.npc.health,28,'a real thrown book hits the invisible capsule for 2 damage');t.assertFixed();t.assertHidden();
  for(const layer of ['basement','ground','upper','yard','all']){t.npc.setMapLayer(layer);t.assertHidden();}
  t.npc.onPlayerWake();t.assertFixed();t.npc.reset({keepAlertness:true});t.assertHidden();t.assertFixed();
  assert.equal(naiwaAttackDamage(6,'slam',t.npc.actor.alertness),10);assert.equal(naiwaAttackDamage(10,'door',t.npc.actor.alertness),15);assert.equal(naiwaAttackDamage(15,'chair',t.npc.actor.alertness),15);
  // The HUD number must never confer Transcendent sight loss/scent/cutter tracking.
  t.player.hidden=false;t.npc.actor.yaw=0;assert(t.npc.visiblePlayer(),'invisible Naiwa still sees with ordinary Ninja perception');
  t.player.hidden=true;t.npc.setTrackingSource(()=>true);assert(!t.npc.knowsPlayer,'6767 does not grant Transcendent scent or cutter omniscience');
  t.npc.beginRun();assert(!t.npc.setDifficulty('normal',{restartOpening:true}));
  t.npc.dispose();
}

// Exercise both sides of Ninja's 40% block boundary. A leaked 6767 would
// incorrectly select Transcendent's 50% probability and fail the second case.
for(const [roll,blocked]of [[.399,true],[.4,false]]) {
  const t=setup({roll});t.npc.hit({item:propItem('crowbar','boundary'),source:'melee',origin:{x:0,y:1,z:-3}});
  assert.equal(t.npc.health,blocked?30:25);t.assertFixed();t.assertHidden();t.npc.dispose();
}

for(const fps of [30,60,144]) {
  const t=setup({fps,roll:0}),bag=createInventory();
  t.npc.hit({damage:30,source:'door'});assert.equal(t.npc.state,'down');assert.equal(t.npc.stunTime,5.5);t.assertHidden();t.assertFixed();
  const key=t.scene.getObjectByName('naiwa:waist-key'),origin=key.position.clone().add(new THREE.Vector3(0,.4,-.8)),direction=key.position.clone().sub(origin).normalize();
  assert(t.npc.nearbyKey(origin,direction)?.available);assert(t.npc.pickupKey(bag,origin,direction),'the hidden key remains collectible after a knockdown');
  assert.equal(bag.remove(0).kind,'rearDoorKey');t.npc.reclaimKey();assert(t.npc.pickupKey(bag,origin,direction),'reclaiming preserves concealed key interaction');bag.remove(0);
  t.step(5.5);assert.equal(t.npc.health,30);assert.notEqual(t.npc.state,'down');t.assertFixed();t.assertHidden();
  t.npc.hit({damage:30,source:'door'});assert.equal(t.npc.stunTime,3.5,'later knockdowns use Hacker recovery time');t.step(3.5);t.assertFixed();t.assertHidden();
  t.npc.onPlayerWake();t.npc.reset();t.assertFixed();t.assertHidden();
  assert(t.npc.setDifficulty('normal',{restartOpening:true}));assert(t.npc.model.root.visible,'switching away before a run restores visibility immediately');assert.equal(t.npc.alertness,10);
  t.alertnessEvents.length=0;assert(t.npc.setDifficulty('gunmu',{restartOpening:true}));t.assertFixed();t.assertHidden();t.npc.dispose();
}

{
  const t=setup({route:[{x:0,y:.15,z:-8}],position:{x:2,y:.15,z:-4}}),calls=[];
  const mixer={setSettings(){},setActive(){},stopAll(){},dispose(){},unlock:()=>Promise.resolve(true),play:(name,options)=>calls.push({name,...options})};
  const audio=createEscapeAudio({scene:t.scene,player:t.player,navigation:t.navigation,getPursuer:()=>t.npc,listener:()=>({...t.player,y:t.player.y+1.5}),mixer});
  audio.setActive(true);await audio.unlock();audio.tick(0);run(2,60,dt=>{t.tick(dt);audio.tick(dt);});
  assert(calls.some(call=>call.name.startsWith('footstep_')&&call.gain>0&&Number.isFinite(call.pan)),'an actually moving invisible NPC still produces spatial footsteps');
  t.npc.hit({damage:30,source:'door'});assert(calls.some(call=>call.name.startsWith('impactPunch_heavy')),'invisible knockdowns retain body sounds');assert(t.messages.some(event=>event.state==='down'&&event.text),'state text remains published while invisible');
  t.assertFixed();t.assertHidden();audio.dispose();t.npc.dispose();
}
{
  const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false,difficulty:'gunmu',random:()=>.12345});
  assert.equal(castle.runClues.code,'1234','the hidden mode uses Hacker random codes');assert(castle.runClues.keyContainer,'the hidden mode uses the random cupboard key');
  const guide=createEscapeGuide({player:createPlayer(),inventory:createInventory(),clues:castle.runClues,progress:castle.escapeProgress});
  assert(!guide.update({difficulty:'gunmu',active:true}).visible,'the hidden mode has no Easy/Normal guide');
}
console.log('Unknown mode OK: exact bilingual name, Hacker health/capture/recovery and clues, no guide; fixed 6767 HUD with permanent Ninja behavior, sight/block/damage boundaries, hidden body/key/shadow across map/reset/down states, real collision/projectiles, collectible knockdown key, spatial footsteps and state notices at 30/60/144 FPS.');
