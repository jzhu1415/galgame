import assert from 'node:assert/strict';
import {readFileSync}from'node:fs';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {createNavigation,createPlayer,advancePlayer}from'../src/frog-escape-navigation.js';
import {createEscapeScene}from'../src/frog-escape-scene.js';
import {createWorldItems}from'../src/frog-escape-items.js';
import {createNaiwaPursuer}from'../src/frog-escape-pursuer.js';
import {createNaiwaModel}from'../src/frog-escape-naiwa-model.js';
import {createPursuitPathfinder}from'../src/frog-escape-pursuit-path.js';
import {createCastleDoor,syncBoxCollider,updateCastleDoor}from'../src/frog-escape-doors.js';
import {updateFixtureAction}from'../src/frog-escape-interactions.js';
import {fixtureHandTargets}from'../src/frog-escape-naiwa-actions.js';
import {flashlightHitsEyes}from'../src/frog-escape-naiwa-defense.js';

const boundary=[[-10,-7],[10,-7],[10,7],[-10,7]];
function chairArena({wall=false}={}) {
  const scene=new THREE.Scene(),root=new THREE.Group();root.position.y=.15;scene.add(root);
  const chair={id:'test-chair',root,colliders:[],meshes:[]},solids=[];
  for(const [x,y,z,w,h,d]of[[0,.46,0,.58,.055,.55],[-.22,.225,-.21,.055,.45,.055],[.22,.225,-.21,.055,.45,.055],[-.22,.225,.21,.055,.45,.055],[.22,.225,.21,.055,.45,.055],[0,.86,.22,.53,.6,.065]]) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial());mesh.position.set(x,y,z);root.add(mesh);root.updateWorldMatrix(true,true);
    const solid={movableChair:chair,dynamic:true,fullRotation:true};syncBoxCollider(mesh,solid);chair.meshes.push(mesh);chair.colliders.push(solid);solids.push(solid);
  }
  if(wall)solids.push({x:0,z:1.8,minY:.15,maxY:3,halfX:4,halfZ:.1,axisX:[1,0],axisZ:[0,1]});
  const navigation=createNavigation({solids,chairs:[chair],stairs:[],boundary}),items=createWorldItems(scene,navigation);
  return {scene,navigation,items,chair};
}

for(const fps of[30,60,144]) {
  const arena=chairArena(),player={...createPlayer(),x:0,y:.15,z:-1.1};let maximum=0;
  for(let i=0;i<fps*3;i++) {
    advancePlayer(player,0,3/fps,1/fps,arena.navigation);arena.items.tick(1/fps,player);
    maximum=Math.max(maximum,Math.hypot(arena.chair.body.velocity.x,arena.chair.body.velocity.z));
    assert(player.z<arena.chair.body.position.z-.35,'the player pushes while remaining on the near side of the chair');
  }
  assert(arena.chair.body.position.z>.2&&arena.chair.body.position.z<2,'continuous pressure slowly moves the actual chair');
  assert(maximum<1.5,'walking pressure does not launch the chair');assert.equal(player.health,100);
  assert(arena.chair.colliders.some(solid=>solid.z>.1),'navigation colliders follow the moving mesh');
}
for(const fps of[30,60,144]) {
  const arena=chairArena(),player={...createPlayer(),x:0,y:.15,z:3.1},actor={x:0,y:.15,z:-1};
  assert(arena.navigation.chairMotion.kick(arena.chair,actor));
  assert(arena.chair.body.velocity.z>7&&arena.chair.body.velocity.y>2,'a kick launches the real rigid body');
  for(let i=0;i<fps*1.6;i++)arena.items.tick(1/fps,player);
  assert.equal(player.health,92,'a fast chair hit costs eight health, without repeated contact damage');
}
const stopped=chairArena({wall:true});stopped.navigation.chairMotion.kick(stopped.chair,{x:0,y:.15,z:-1});
for(let i=0;i<180;i++)stopped.items.tick(1/60,{...createPlayer(),x:8,y:.15,z:4});
assert(stopped.chair.body.position.z<1.8,'a kicked chair cannot pass through a solid wall');

const actor={x:0,y:.15,z:0,yaw:0},eyes=[{x:-.11,y:2.1,z:-.1},{x:.11,y:2.1,z:-.1}],navigation=createNavigation({solids:[],stairs:[],boundary});
for(const offset of[0,.2,.42]) {
  const origin=new THREE.Vector3(0,1.7,-4),target=new THREE.Vector3(offset,2.1,-.1),beam={enabled:true,origin,direction:target.sub(origin).normalize(),range:20};
  assert(flashlightHitsEyes(beam,actor,eyes,navigation),'both eyes in the bright middle trigger shielding despite modest aim error');
}
const origin=new THREE.Vector3(0,1.7,-4),beam={enabled:true,origin,direction:new THREE.Vector3(1.1,2.1,-.1).sub(origin).normalize(),range:20};
assert(!flashlightHitsEyes(beam,actor,eyes,navigation),'the outer beam edge is outside the shielding core');
beam.direction=new THREE.Vector3(.72,2.1,-.1).sub(origin).normalize();
assert(!flashlightHitsEyes(beam,actor,eyes,navigation),'one eye inside the core is insufficient when the other is outside');

const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),planner=createPursuitPathfinder(castle.navigation,{radius:.44,height:2.1});
const from={x:6.3,y:-5.05,z:1.4},to={x:9.85,y:-5.05,z:5.6},route=planner.findPath(from,to);
assert(route.length>2,'the basement route goes around the low stair underside');
for(let i=0;i<route.length-1;i++)for(let sample=0;sample<=10;sample++) {
  const t=sample/10,a=route[i],b=route[i+1],point={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
  assert(!castle.navigation.blocked(point.x,point.y,point.z,true,2.1,.4),'the path is clear for the real body, including stair undersides');
}
const guestFrom={x:0,y:5.15,z:-.7},guestTo={x:-3.2,y:5.15,z:-.1},guest=planner.findPath(guestFrom,guestTo);
assert(guest.some(point=>point.x<-2),'moving the guest wardrobe left leaves a usable entrance');
const cupboard=castle.interactables.find(action=>action.hideVolume&&action.hideVolume.root.getWorldPosition(new THREE.Vector3()).z<1);
assert.equal(Object.keys(fixtureHandTargets(cupboard,{x:-4.9,y:5.15,z:.2,yaw:0})).length,2,'a double cabinet exposes two independently moving hand targets');

const previous={fetch:globalThis.fetch,document:globalThis.document,ProgressEvent:globalThis.ProgressEvent};let model;
try {
  globalThis.document={};globalThis.ProgressEvent??=class{};globalThis.fetch=async()=>new Response(readFileSync('assets/models/naiwa-h25-rigged.glb'));
  model=createNaiwaModel();assert(await model.ready);model.root.position.y=.15;
  const target=new THREE.Vector3(0,1.65,1.2),pose={state:'pull',variant:'bed',actionTime:.74};
  model.animate(0,pose);const originalGap=model.getHandPositions().L.distanceTo(target);
  model.reset();model.animate(0,{...pose,reachTargets:{L:target},reachAmount:1,bodyLean:.75});
  const corrected=model.getHandPositions().L.distanceTo(target);
  assert(corrected<.4&&corrected<originalGap-.15,'the right hand actually gets closer during the forward-leaning reach');
  const hand=model.getHandPositions().L;
  for(let i=0;i<50;i++)model.animate(0,{...pose,reachTargets:{L:target},reachAmount:1,bodyLean:.75});
  assert(model.getHandPositions().L.distanceTo(hand)<1e-5,'paused target-driven reaching never accumulates body lean');
  model.reset();model.animate(0,{state:'patrol'});assert(model.skeleton.getBoneByName('Spine').quaternion.angleTo(new THREE.Quaternion())<.1,'reset removes the procedural lean');

  for(const tangwang of[false,true]) {
    const arena=chairArena(),player={...createPlayer(),x:8,y:.15,z:4,hidden:true},events=[];
    const npc=createNaiwaPursuer({...arena,doors:[],worldItems:arena.items,player,spawn:{x:0,y:.15,z:-1.5},patrolRoute:[{x:0,y:.15,z:3}]});assert(await npc.model.ready);
    if(tangwang){while(npc.alertness<70){if(npc.state==='down')npc.reset({keepAlertness:true});npc.hit({item:{kind:'bread'},source:'projectile'});}npc.reset({keepAlertness:true});assert.equal(npc.alertness,70);}
    arena.scene.addEventListener('escape-pursuer-kick',event=>events.push(event));
    for(let i=0;i<240;i++){npc.tick(1/60);arena.items.tick(1/60,player);}
    assert(tangwang?events.length>0:events.length===0,'only Tangwang uses a kick to clear its path');
    assert(tangwang?arena.chair.body.position.z>.2:npc.actor.z>2.3,'ordinary Naiwa pushes and Tangwang kicks the real obstruction');npc.dispose();
  }
  for(const fps of[30,60,144]) {
    // An immovable chair stands in for one wedged firmly against furniture.
    const arena=chairArena(),player={...createPlayer(),x:8,y:.15,z:4,hidden:true},events=[];
    arena.chair.body.type=CANNON.Body.STATIC;arena.chair.body.mass=0;arena.chair.body.updateMassProperties();
    arena.navigation.ceilings.push({minX:-10,maxX:10,minZ:-7,maxZ:7,height:2.8});
    const npc=createNaiwaPursuer({...arena,doors:[],worldItems:arena.items,player,spawn:{x:0,y:.15,z:-1.5},patrolRoute:[{x:0,y:.15,z:3}]});assert(await npc.model.ready);
    arena.scene.addEventListener('escape-pursuer-unstick',event=>events.push(event));
    for(let i=0;i<fps*8;i++){npc.tick(1/fps);arena.items.tick(1/fps,player);}
    assert(events.some(event=>event.stage==='chair-reroute'),'a chair that cannot move triggers an alternate route');
    assert(npc.actor.z>2.3,'the actual NPC gets around the wedged chair instead of repeatedly pushing it');npc.dispose();
  }
  {
    const arena=chairArena(),player={...createPlayer(),x:8,y:.15,z:4,hidden:true};
    const npc=createNaiwaPursuer({...arena,doors:[],worldItems:arena.items,player,spawn:{x:-.2,y:.15,z:.45},patrolRoute:[{x:-2,y:.15,z:.45}]});assert(await npc.model.ready);
    for(let i=0;i<240;i++){npc.tick(1/60);arena.items.tick(1/60,player);}
    assert(npc.actor.x<-1,'a body already overlapping a chair can leave its legs and back without a permanent jam');
    npc.actor.y=.85;npc.actor.grounded=true;
    for(let i=0;i<120;i++){npc.tick(1/60);arena.items.tick(1/60,player);}
    assert(Math.abs(npc.actor.y-.15)<.01,'gravity settles an NPC after a movable chair lifts its foot level');npc.dispose();
  }
  const bedItems=createWorldItems(scene,castle.navigation);
  {
    const player={...createPlayer(),x:8,y:.15,z:4,hidden:true},npc=createNaiwaPursuer({scene,navigation:castle.navigation,doors:castle.doors,interactables:castle.interactables,worldItems:bedItems,player,spawn:guestFrom,patrolRoute:[guestTo]});assert(await npc.model.ready);
    for(let i=0;i<480;i++) {
      for(const door of castle.doors)updateCastleDoor(door,1/60,[player,npc.actor],castle.navigation);
      for(const action of castle.interactables)updateFixtureAction(action,1/60,[player,npc.actor],castle.navigation);
      npc.tick(1/60);
    }
    assert(npc.actor.x<-2.6&&Math.abs(npc.actor.y-5.15)<.1,'the actual NPC opens the relocated guest entrance and gets inside');npc.dispose();
  }
  for(const bed of castle.beds) {
    const start=bed.root.localToWorld(new THREE.Vector3(0,0,-2.4)),point=bed.root.localToWorld(new THREE.Vector3(0,1.18,0));
    const player={...createPlayer(),x:point.x,y:point.y,z:point.z,hidden:true},events=[];
    const npc=createNaiwaPursuer({scene,navigation:castle.navigation,doors:castle.doors,beds:castle.beds,worldItems:bedItems,player,spawn:{x:start.x,y:start.y,z:start.z},patrolRoute:[start]});assert(await npc.model.ready);
    const onSkill=event=>{if(event.actor===npc.actor)events.push({...event,at:{x:npc.actor.x,z:npc.actor.z}});};scene.addEventListener('escape-pursuer-skill',onSkill);
    for(let i=0;i<105;i++)npc.tick(.05);
    npc.actor.yaw=Math.atan2(start.x-point.x,start.z-point.z);player.hidden=false;
    for(let i=0;i<100;i++){advancePlayer(player,0,0,1/60,castle.navigation);npc.tick(1/60);}
    const hit=events.find(event=>event.kind==='pull'&&event.stage==='hit');
    assert(hit&&hit.contactDistance<.55,'both real beds permit a far pull only after the right hand approaches the player');
    assert(Math.hypot(hit.at.x-start.x,hit.at.z-start.z)>.25,'the far pull includes collision-safe approach steps');
    npc.dispose();scene.removeEventListener('escape-pursuer-skill',onSkill);
  }
  for(const double of[false,true]) {
    const doorScene=new THREE.Scene(),parent=new THREE.Group();doorScene.add(parent);const material=new THREE.MeshBasicMaterial(),solids=[];
    const door=createCastleDoor({parent,id:'hand-door',name:'test',x:0,z:0,y:.15,width:double?2.1:1.3,double,materials:{wood:material,darkWood:material,gold:material,iron:material}});
    doorScene.updateMatrixWorld(true);doorScene.traverse(mesh=>{if(!mesh.userData.solid)return;const solid={};syncBoxCollider(mesh,solid);solids.push(solid);if(mesh.userData.door){door.parts.find(part=>part.leaf===mesh).collider=solid;solid.dynamic=true;}});
    const navigation=createNavigation({solids,doors:[door],stairs:[],boundary}),player={...createPlayer(),x:8,y:.15,z:4,hidden:true},items=createWorldItems(doorScene,navigation);
    const npc=createNaiwaPursuer({scene:doorScene,navigation,doors:[door],worldItems:items,player,spawn:{x:0,y:.15,z:-1.1},patrolRoute:[{x:0,y:.15,z:2}]});assert(await npc.model.ready);
    let raised=false,minimumGap=Infinity;
    for(let i=0;i<90;i++){
      updateCastleDoor(door,1/60,[player,npc.actor],navigation);npc.tick(1/60);
      if(npc.model.root.userData.interactionHands.length===(double?2:1)) {
        raised=true;const hands=npc.model.getHandPositions(),targets=fixtureHandTargets(door,npc.actor);
        minimumGap=Math.min(minimumGap,Math.max(...Object.entries(targets).map(([side,target])=>hands[side].distanceTo(target))));
      }
    }
    assert(raised,'the real pursuer uses one hand per moving door leaf');assert(door.amount>.9,'the reach delay still permits the door to open');npc.dispose();
    assert(minimumGap<.5,`the assigned hands actually approach the door handles: double=${double}, gap=${minimumGap}`);
  }
}finally {
  model?.dispose();globalThis.fetch=previous.fetch;
  for(const key of['document','ProgressEvent'])if(previous[key]===undefined)delete globalThis[key];else globalThis[key]=previous[key];
}
console.log('World actions OK: slow physical chair pushing, Tangwang kicks, single eight-health fast impacts and rerouting around wedged chairs at 30/60/144 FPS; escape from chair overlaps and raised feet settling; collision-safe basement paths and actual guest-room entry; forgiving two-eye flashlight core; real bed-pull contact, stable reset, and single/double door hand assignments.');
