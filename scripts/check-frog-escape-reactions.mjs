import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNavigation,createPlayer,advancePlayer} from '../src/frog-escape-navigation.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {NAIWA_BED_PULL,standingOnBed} from '../src/frog-escape-naiwa-skills.js';
import {propItem} from '../src/frog-escape-props.js';
const boundary=[[-20,-20],[20,-20],[20,20],[-20,20]];
const box=(x,z,halfX,halfZ,minY,maxY)=>({x,z,halfX,halfZ,minY,maxY,axisX:[1,0],axisZ:[0,1]});
const physics=()=>({addActor:()=>({remove(){}}),syncActors(){}});
function setup(solids=[]) {
  const scene=new THREE.Scene(),navigation=createNavigation({solids,stairs:[],boundary}),player={...createPlayer(),x:0,y:.15,z:-4,hidden:true};
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:{physics:physics()},player,spawn:{x:0,y:.15,z:0},patrolRoute:[{x:0,y:.15,z:0}],random:()=>.99});
  const step=seconds=>{for(let rest=seconds;rest>1e-9;){const dt=Math.min(.02,rest);npc.tick(dt);rest-=dt;}};
  const smart=()=>{for(let i=0;i<4;i++){npc.hit({damage:.01});step(.32);}npc.reset({keepAlertness:true});};
  return {scene,navigation,player,npc,step,smart};
}
for(const kind of ['bread','egg','tomato','apple','cheese']) {
  const test=setup();test.npc.hit({damage:12,item:propItem(kind,`dormant-${kind}`),source:'projectile',origin:{x:0,z:-2}});
  assert.equal(test.npc.health,19);assert.equal(test.npc.state,'stunned','Fool staggers on soft food too');
  test.npc.reset();test.smart();test.npc.hit({damage:12,item:propItem(kind,`smart-${kind}`),source:'projectile',origin:{x:0,z:-2}});
  assert.equal(test.npc.health,19,'soft food now deals one damage');assert.equal(test.npc.state,'stunned','an unblocked soft hit staggers intelligent Naiwa');assert(test.npc.stunTime>=.44&&test.npc.stunTime<=.46);
  test.step(.5);assert.notEqual(test.npc.state,'stunned');test.npc.dispose();
}

// A full NPC capsule cannot sweep along this diagonal next to the wall, but
// the short unobstructed reach between both actors is clear.
const near=setup([box(.65,0,.25,3,.15,3)]);near.step(5.2);Object.assign(near.player,{x:.1,y:.15,z:-.75,hidden:false});near.npc.tick(.02);
assert.equal(near.npc.state,'grab');assert.equal(near.player.heldBy,near.npc.actor,'close contact beside a wall becomes an actual hold');near.npc.dispose();
const divided=setup([box(0,-.475,2,.03,.15,3)]);divided.step(5.2);Object.assign(divided.player,{x:0,y:.15,z:-.95,hidden:false});divided.npc.tick(.02);
assert.notEqual(divided.player.heldBy,divided.npc.actor,'a real wall still prevents grabbing across it');divided.npc.dispose();

for(const fps of [25,60,144]) {
  const navigation=createNavigation({solids:[],stairs:[],boundary}),circle={x:.3,z:0,radius:.4,minY:.15,maxY:2.25,npc:true};navigation.circles.push(circle);
  const player={...createPlayer(),x:0,y:.15,z:0};advancePlayer(player,.04,0,0,navigation);assert.equal(player.x,0,'an overlapping player cannot walk deeper through Naiwa');
  for(let i=0;i<fps;i++)advancePlayer(player,-1/fps,0,1/fps,navigation);assert(player.x<-.8,'the player can walk away from an accidental NPC overlap');
  Object.assign(player,{x:0,z:0});navigation.solids.push(box(-.35,0,.05,2,.15,3));advancePlayer(player,-.06,0,0,navigation);assert.equal(player.x,0,'escaping an NPC overlap never bypasses the wall');
  navigation.solids.length=0;player.heldBy={};advancePlayer(player,-.1,0,.02,navigation);assert.equal(player.x,0,'a deliberate hold still disables walking');
}

// Use both actual castle beds, from the centre of the mattress to the open
// foot of each bed. The old 1.5m range and 1.2m pull left this player on top.
for(const fps of [25,60,144]) {
  const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false});
  assert(!castle.interactables.some(action=>action.id.startsWith('vanity-')||action.name==='洗手台柜门'),'the bathroom cabinet has no interactive leaves');
  assert(scene.getObjectByName('fixture:vanity')&&scene.getObjectByName('fixture:mirror'),'the basin cabinet and mirror remain');
  for(const bed of castle.beds) {
    const center=bed.root.localToWorld(new THREE.Vector3(0,1.17,0)),start=bed.root.localToWorld(new THREE.Vector3(0,0,-1.6));
    const player={...createPlayer(),x:center.x,y:castle.navigation.support(center.x,center.z,center.y,.02),z:center.z,hidden:true},events=[];
    const npc=createNaiwaPursuer({scene,navigation:castle.navigation,doors:castle.doors,beds:castle.beds,worldItems:{physics:physics()},player,spawn:{x:start.x,y:start.y,z:start.z},patrolRoute:[{x:start.x,y:start.y,z:start.z}],random:()=>.99});
    const onSkill=event=>events.push({kind:event.kind,variant:event.variant,stage:event.stage});scene.addEventListener('escape-pursuer-skill',onSkill);
    const step=seconds=>{for(let rest=seconds;rest>1e-9;){const dt=Math.min(1/fps,rest);advancePlayer(player,0,0,dt,castle.navigation);npc.tick(dt);rest-=dt;}};
    step(5.2);player.hidden=false;npc.actor.yaw=Math.atan2(npc.actor.x-player.x,npc.actor.z-player.z);npc.setMapLayer('all');
    assert.equal(standingOnBed(player,castle.beds,castle.navigation),bed);const initial={x:player.x,y:player.y,z:player.z};
    step(.02);assert(events.some(event=>event.kind==='pull'&&event.variant==='bed'&&event.stage==='start'),'standing on a bed prioritizes the prepared leaning pull');
    step(NAIWA_BED_PULL.impact-.06);assert(Math.hypot(player.x-initial.x,player.z-initial.z)<.001,'the body anticipates before reeling the player in');
    step(.75);
    assert(events.some(event=>event.kind==='pull'&&event.stage==='hit'),'the extended pull reaches the real mattress centre');
    assert(player.y<initial.y-.45,'the pull actually removes the player from the bed, including footprint overlap at its edge');
    assert.equal(player.heldBy,npc.actor,'once pulled to the side, the player is held immediately');
    npc.dispose();scene.removeEventListener('escape-pursuer-skill',onSkill);
  }
}
console.log('Reactions OK: soft food deals one damage and staggers Fool and intelligent Naiwa, short recovery; real holds beside furniture/walls, solid-wall protection, escape-only correction for NPC overlap at 25/60/144 FPS; both authored beds prioritize leaning extended pull, remove the player from the mattress and immediately hold; bathroom cabinet leaves removed with basin/mirror retained.');
