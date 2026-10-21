import assert from 'node:assert/strict';
import {readFileSync}from'node:fs';
import * as THREE from 'three';
import {createNavigation,createPlayer}from'../src/frog-escape-navigation.js';
import {syncBoxCollider}from'../src/frog-escape-doors.js';
import {createWorldItems}from'../src/frog-escape-items.js';
import {createNaiwaPursuer}from'../src/frog-escape-pursuer.js';

const boundary=[[-22,-22],[22,-22],[22,22],[-22,22]];
function arena({wall=false,scaled=false}={}) {
  const scene=new THREE.Scene(),floor=new THREE.Group(),root=new THREE.Group();scene.add(floor);floor.add(root);floor.scale.x=scaled?1.25:1;root.position.y=.15;
  const chair={id:'chair-upgrade',root,meshes:[],colliders:[]},solids=[];
  for(const[x,y,z,w,h,d]of[[0,.46,0,.58,.055,.55],[0,.5,0,.53,.04,.5],[-.22,.225,-.21,.055,.45,.055],[.22,.225,-.21,.055,.45,.055],[-.22,.225,.21,.055,.45,.055],[.22,.225,.21,.055,.45,.055],[-.24,.82,.22,.055,.64,.06],[.24,.82,.22,.055,.64,.06],[0,.99,.22,.53,.23,.065]]) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial());mesh.position.set(x,y,z);root.add(mesh);root.updateWorldMatrix(true,true);
    const solid={movableChair:chair,dynamic:true,fullRotation:true};syncBoxCollider(mesh,solid);chair.meshes.push(mesh);chair.colliders.push(solid);solids.push(solid);
  }
  const trim=new THREE.Mesh(new THREE.SphereGeometry(.03,8,6),new THREE.MeshBasicMaterial());trim.position.set(.24,1.16,.22);root.add(trim);
  if(wall)solids.push({x:0,z:3,minY:.15,maxY:4,halfX:8,halfZ:.1,axisX:[1,0],axisZ:[0,1]});
  const navigation=createNavigation({solids,chairs:[chair],stairs:[],boundary}),items=createWorldItems(scene,navigation);
  return {scene,navigation,items,chair};
}
function step(arena,dt,player,npc=null) {npc?.tick(dt);arena.items.tick(dt,player);}
function meshes(scene) {const result=[];scene.traverse(object=>{if(object.isMesh)result.push(object);});return result;}

for(const fps of [30,60,144])for(const milk of [false,true])for(const [phase,damage]of [[10,0],[30,0],[70,15],[100,25]]) {
  const place=arena(),player={...createPlayer(),x:0,y:.15,z:-2,health:100,effects:{milk:milk?15:0}};
  const owner={kind:'pursuer',alertness:phase,x:0,y:.15,z:1};assert.equal(place.navigation.chairMotion.kick(place.chair,owner),phase>=70);
  if(phase<70)assert.equal(place.chair.body.velocity.length(),0,'Dormant and Intelligent cannot launch a chair');
  for(let i=0;i<fps*.8;i++)step(place,1/fps,player);
  assert.equal(player.health,100-damage*(milk?.5:1),`real kicked chair damage at phase ${phase}, ${fps} FPS, milk=${milk}`);
}

for(const fps of[30,60,144]) {
  const place=arena({wall:true,scaled:true}),player={...createPlayer(),x:15,y:.15,z:-4,hidden:true},original=meshes(place.scene),body=place.chair.body,events=[];
  place.scene.addEventListener('escape-prop-break',event=>events.push(event));
  place.navigation.chairMotion.kick(place.chair,{x:0,y:.15,z:-1});
  for(let i=0;i<fps*2;i++)step(place,1/fps,player);
  assert(place.chair.broken,'a kicked chair really fractures on a hard wall impact');
  const pieces=place.chair.pieces;
  assert.equal(pieces.length,place.chair.meshes.length,'each structural component receives its own rigid body');
  assert(!place.items.physics.world.bodies.includes(body),'the old whole-chair collision body is removed');
  assert.equal(events.length,1,'fracturing is emitted once per original chair');
  assert(Math.abs(pieces.reduce((sum,piece)=>sum+piece.body.mass,0)-6)<1e-6,'fragment masses retain the original chair mass');
  assert.deepEqual(new Set(meshes(place.scene)),new Set(original),'all original structural meshes and trim remain visible');
  assert(place.chair.colliders.every(solid=>!solid.enabled()),'the old whole-chair colliders leave no invisible obstruction');
  for(const piece of pieces) {
    assert(place.items.physics.world.bodies.includes(piece.body));
    assert.equal(piece.damageGroup,place.chair,'all fragments share fast-hit damage deduplication');
    assert(piece.root.parent,'each component stays attached to the scene');
    assert(piece.meshes[0].getWorldPosition(new THREE.Vector3()).distanceTo(piece.body.position)<1e-5,'fragment rendering and navigation follow the actual body');
  }
  for(let i=0;i<fps*10;i++)step(place,1/fps,player);
  assert.equal(meshes(place.scene).length,original.length,'pieces have no timed disappearance');
  assert(pieces.every(piece=>place.items.physics.world.bodies.includes(piece.body)),'persistent pieces retain physical collision');
  if(fps===60) {
    Object.assign(player,{x:0,y:.15,z:-3,health:100});
    for(const [i,piece]of pieces.slice(0,2).entries()) {
      piece.body.position.set(0,1.1,i);piece.body.quaternion.set(0,0,0,1);piece.body.velocity.set(0,0,-9);piece.body.angularVelocity.setZero();piece.body.aabbNeedsUpdate=true;piece.body.wakeUp();
    }
    for(let i=0;i<54;i++)step(place,1/60,player);
    assert.equal(player.health,92,'several pieces from one broken chair still cause only one eight-health hit in a contact burst');
  }
}
{
  const fast=arena(),old=arena(),player={...createPlayer(),x:15,y:.15,z:-4,hidden:true};
  fast.navigation.chairMotion.kick(fast.chair,{x:0,y:.15,z:-1});old.navigation.chairMotion.kick(old.chair,{x:0,y:.15,z:-1});old.chair.body.velocity.set(0,2.2,7.5);
  for(let i=0;i<96;i++){step(fast,1/60,player);step(old,1/60,player);}
  assert(fast.chair.body.position.z>old.chair.body.position.z*1.25,'the stronger kick really travels farther through the same physics');
  assert(!fast.chair.broken&&!old.chair.broken,'falling to the floor alone does not fracture a chair');
}
{
  const place=arena(),player={...createPlayer(),x:15,y:.15,z:-4,hidden:true};
  place.chair.body.velocity.set(0,0,3);
  for(let i=0;i<120;i++)step(place,1/60,player);
  assert(!place.chair.broken,'ordinary motion is not treated as a kicked structural break');
}

const original={fetch:globalThis.fetch,document:globalThis.document,ProgressEvent:globalThis.ProgressEvent};
try {
  globalThis.document={};globalThis.ProgressEvent??=class{};globalThis.fetch=async()=>new Response(readFileSync('assets/models/naiwa-h25-rigged.glb'));
  async function npcAt(place,phase,{spawn={x:0,y:.15,z:-1.25},target={x:0,y:.15,z:2.5}}={}) {
    const player={...createPlayer(),x:15,y:.15,z:-4,hidden:true};
    const npc=createNaiwaPursuer({...place,doors:[],worldItems:place.items,player,spawn,patrolRoute:[target],random:()=>.99});assert(await npc.model.ready);
    while(npc.alertness<phase){if(npc.state==='down')npc.reset({keepAlertness:true});npc.hit({item:{kind:'bread'},source:'projectile'});}npc.reset({keepAlertness:true});assert.equal(npc.alertness,phase);return {npc,player};
  }
  for(const phase of[10,45])for(const fps of[30,60,144])for(const lowCeiling of[false,true]) {
    const place=arena(),{npc,player}=await npcAt(place,phase);let peak=.15,maxSpeed=0;
    if(lowCeiling)place.navigation.ceilings.push({minX:-10,maxX:10,minZ:-10,maxZ:10,height:2.8});
    for(let i=0;i<fps*4;i++) {
      step(place,1/fps,player,npc);peak=Math.max(peak,npc.actor.y);
      maxSpeed=Math.max(maxSpeed,Math.hypot(place.chair.body.velocity.x,place.chair.body.velocity.z));
      assert.notEqual(npc.state,'chair-step','the removed step-over state never runs');
    }
    assert(peak<.4,'ordinary Naiwa stays on the floor instead of climbing over a chair');
    assert(npc.actor.z>1.8&&npc.actor.grounded,'both ordinary modes can press forward through the obstructing chair');
    assert(place.chair.body.position.z>1.5,'the actual heavy-body push moves the physical chair well out of the way');
    assert(maxSpeed<3.4,'body pressure stays below the fast-chair damage threshold');
    npc.dispose();
  }
  for(const phase of[10,45,70]) {
    const place=arena(),{npc,player}=await npcAt(place,phase,{spawn:{x:5,y:.15,z:0},target:{x:5,y:.15,z:0}});
    for(let i=0;i<105;i++)step(place,.05,player,npc);
    Object.assign(player,{x:5,y:.15,z:-13,hidden:false,crouched:false});assert.equal(npc.visiblePlayer(),phase>=70,'Tangwang sees farther');
    Object.assign(player,{z:-9,crouched:true});assert.equal(npc.visiblePlayer(),phase>=70,'Tangwang also notices crouched players farther away');
    Object.assign(player,{x:5+Math.sin(67*Math.PI/180)*7,z:-Math.cos(67*Math.PI/180)*7,crouched:false});assert.equal(npc.visiblePlayer(),phase>=70,'Tangwang has a wider frontal field of view');
    player.hidden=true;assert(!npc.visiblePlayer(),'sensitivity never reveals a hidden player directly');
    assert.equal(npc.hear({x:5,y:1.6,z:-2},.14),phase>=70,'Tangwang reacts to quieter nearby sounds');
    npc.dispose();
  }
  {
    const place=arena(),{npc,player}=await npcAt(place,70,{spawn:{x:5,y:.15,z:0},target:{x:5,y:.15,z:0}});
    for(let i=0;i<105;i++)step(place,.05,player,npc);
    Object.assign(player,{x:5,y:.15,z:-7,hidden:false});place.navigation.solids.push({x:5,z:-3,minY:.15,maxY:4,halfX:3,halfZ:.1,axisX:[1,0],axisZ:[0,1]});
    assert(!npc.visiblePlayer(),'Tangwang vision still respects opaque walls');npc.dispose();
  }
}finally {
  globalThis.fetch=original.fetch;for(const key of['document','ProgressEvent'])if(original[key]===undefined)delete globalThis[key];else globalThis[key]=original[key];
}
console.log('Chair upgrade OK: Dormant/Intelligent cannot kick or deal kicked-chair damage; Ninja/Transcendent 15/25 before milk at 30/60/144 FPS; low-ceiling pushing, kick distance, wall fracture, preserved meshes/mass and persistent pieces with shared damage cooldown; Ninja senses retain wall/hiding limits.');
