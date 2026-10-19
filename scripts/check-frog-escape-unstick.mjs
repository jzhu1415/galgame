import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createCastleDoor,syncBoxCollider,updateCastleDoor} from '../src/frog-escape-doors.js';
import {createNavigation,createPlayer,advancePlayer} from '../src/frog-escape-navigation.js';
import {createFixtureAction,updateFixtureAction} from '../src/frog-escape-interactions.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createObstacleRecovery} from '../src/frog-escape-obstacle-recovery.js';
import {createPursuitPathfinder} from '../src/frog-escape-pursuit-path.js';

function arena({alternative=true}={}) {
  const scene=new THREE.Scene(),parent=new THREE.Group();scene.add(parent);
  const material=new THREE.MeshBasicMaterial(),solids=[];
  const door=createCastleDoor({parent,id:'jam-door',name:'测试门',x:0,z:0,y:.15,width:1.8,materials:{darkWood:material,wood:material,gold:material,iron:material}});
  scene.updateMatrixWorld(true);
  scene.traverse(mesh=>{
    if(!mesh.userData.solid)return;
    const solid={};syncBoxCollider(mesh,solid);solids.push(solid);
    if(mesh.userData.door){door.parts.find(part=>part.leaf===mesh).collider=solid;solid.dynamic=true;}
  });
  const box=(x,z,halfX,halfZ=.1)=>({x,z,halfX,halfZ,minY:.15,maxY:3,axisX:[1,0],axisZ:[0,1]});
  solids.push(box(-4.95,0,4.05),box(2,0,1.1),box(6.95,0,2.05));
  if(!alternative)solids.push(box(4,0,.9));
  const navigation=createNavigation({solids,doors:[door],stairs:[],boundary:[[-9,-6],[9,-6],[9,6],[-9,6]]});
  const player={...createPlayer(),x:0,y:.15,z:.38,hidden:false};
  return {scene,door,navigation,player,box};
}

// Pressure is gradual, collision-safe and independent of the frame rate.
for(const dt of [1/30,1/60,1/120]) {
  const {door,navigation,player}=arena();
  const actor={x:0,y:.15,z:-1,kind:'pursuer',bodyHeight:2.1,radius:.4};
  door.open=true;door.pressureActor=actor;
  let pushed=0;
  for(let i=0;i<2/dt;i++) {
    const before={x:player.x,z:player.z};
    updateCastleDoor(door,dt,[player,actor],navigation);
    const moved=Math.hypot(player.x-before.x,player.z-before.z);pushed+=moved;
    assert(moved<=.42*dt+.00002,'pressing never teleports the body or exceeds the push speed');
    assert(!navigation.blocked(player.x,player.y,player.z,false),'a pressed player stays outside walls and door leaves');
  }
  assert(pushed>.15,'Naiwa actually nudges a body that braces the door');
}

const walled=arena();walled.navigation.solids.push(walled.box(0,.78,.5,.1));
const presser={x:0,y:.15,z:-1,kind:'pursuer',radius:.4,bodyHeight:2.1};
walled.door.open=true;walled.door.pressureActor=presser;
for(let i=0;i<240;i++)updateCastleDoor(walled.door,1/60,[walled.player,presser],walled.navigation);
assert(walled.door.blocked&&walled.player.z<.42,'a wall stops the push instead of trapping the player inside it');
assert(!walled.navigation.blocked(walled.player.x,walled.player.y,walled.player.z,false));

function drawerArena() {
  const {scene,navigation}=arena();
  // A drawer extending across the actor's route, with an anchored handle nearby.
  const pivot=new THREE.Group();pivot.position.set(0,.75,-2);scene.add(pivot);
  const leaf=new THREE.Mesh(new THREE.BoxGeometry(1,.3,.3),new THREE.MeshBasicMaterial());leaf.userData.solid=true;pivot.add(leaf);
  const anchor=new THREE.Object3D();anchor.position.set(0,.15,.2);pivot.add(anchor);
  const action=createFixtureAction({id:'test-drawer',name:'抽屉',kind:'drawer',anchor,motions:[{pivot,travel:new THREE.Vector3(0,0,.6)}]});
  const solid={dynamic:true};syncBoxCollider(leaf,solid);navigation.solids.push(solid);
  action.colliders.push(solid);action.motions[0].colliders.push({mesh:leaf,solid});
  return {scene,navigation,action};
}
const drawer=drawerArena(),actor={kind:'pursuer',x:0,y:.15,z:-1.2,radius:.4,bodyHeight:2.1};
drawer.action.open=true;
for(let i=0;i<120;i++)updateFixtureAction(drawer.action,1/60,[{...createPlayer(),x:7,y:.15,z:4},actor],drawer.navigation);
assert(drawer.action.blocked&&drawer.action.amount<1,'drawers respect Naiwa’s larger body as well as the player');
assert(!drawer.navigation.blocked(actor.x,actor.y,actor.z,false,2.1,.4),'a moving drawer cannot embed Naiwa');
const actions=[];
const recovery=createObstacleRecovery({actor,navigation:drawer.navigation,doors:[],interactables:[drawer.action],onAction:event=>actions.push(event)});
for(let i=0;i<100;i++) {
  recovery.update(.04,{next:{x:0,y:.15,z:-2.5},blocked:true});
  updateFixtureAction(drawer.action,.04,actor,drawer.navigation);
}
assert(actions.some(event=>event.stage==='interact'&&event.obstacle===drawer.action),'a jammed Naiwa operates the nearby drawer');
assert(actions.some(event=>event.stage==='reverse'),'continued obstruction tries the other drawer direction');
assert(actions.every(event=>event.obstacle===drawer.action),'recovery only operates a reachable nearby fixture');
recovery.reset();drawer.action.locked=true;actions.length=0;
for(let i=0;i<50;i++)recovery.update(.04,{next:{x:0,y:.15,z:-2.5},blocked:true});
assert(!actions.some(event=>event.obstacle===drawer.action),'recovery cannot bypass a locked container');

// An avoided doorway is excluded even though normal planning opens doors.
const routing=arena(),planner=createPursuitPathfinder(routing.navigation,{radius:.44,height:2.1});
const barrier={x:0,z:0,minY:.15,maxY:3,halfX:.94,halfZ:.12,axisX:[1,0],axisZ:[0,1]};
const from={x:0,y:.15,z:-1},to={x:0,y:.15,z:2.6};
const direct=planner.findPath(from,to),detour=planner.findPath(from,to,{avoidSolids:[barrier]});
assert(direct.some(point=>Math.abs(point.x)<1&&Math.abs(point.z)<.4));
assert(detour.some(point=>point.x>3.3&&Math.abs(point.z)<.5),'the alternate path crosses the other opening');
assert(!detour.some(point=>Math.abs(point.x)<1&&Math.abs(point.z)<.4));
const sealed=arena({alternative:false}),sealedPlanner=createPursuitPathfinder(sealed.navigation,{radius:.44,height:2.1});
assert.equal(sealedPlanner.findPath(from,to,{avoidSolids:[barrier]}).length,0,'an entirely sealed room does not invent a route through walls');

// Exercise the real pursuer and movement while a player keeps bracing the leaf.
const chase=arena(),events=[];
chase.player.hidden=true;
const npc=createNaiwaPursuer({scene:chase.scene,navigation:chase.navigation,doors:[chase.door],player:chase.player,
  worldItems:{physics:{addActor:()=>({remove(){}}),syncActors(){}}},spawn:{x:0,y:.15,z:-1.4},patrolRoute:[to]});
chase.scene.addEventListener('escape-pursuer-unstick',event=>events.push(event));
let crossedAlternative=false;
for(let i=0;i<1400;i++) {
  // Staying concealed avoids a grab interrupting this obstacle-only exercise.
  // Physically walk back against the leaf instead of resetting through it.
  const dx=-chase.player.x,dz=.38-chase.player.z,distance=Math.hypot(dx,dz);
  chase.player.moveIntent=distance>.002?{x:dx/distance*4.42,z:dz/distance*4.42}:{x:0,z:-4.42};
  advancePlayer(chase.player,chase.player.moveIntent.x/60,chase.player.moveIntent.z/60,1/60,chase.navigation);
  updateCastleDoor(chase.door,1/60,[chase.player,npc.actor],chase.navigation);
  npc.tick(1/60);
  if(npc.actor.x>3.3&&Math.abs(npc.actor.z)<.6)crossedAlternative=true;
  assert(!chase.navigation.blocked(npc.actor.x,npc.actor.y,npc.actor.z,false,2.1,.4,[npc.actor.collider]),'Naiwa never escapes through a wall');
  if(Math.hypot(npc.actor.x-to.x,npc.actor.z-to.z)<.7)break;
}
assert(events.some(event=>event.stage==='interact'&&event.obstacle===chase.door),'the real pursuer starts working the blocked door');
assert(events.some(event=>event.stage==='reroute'&&event.obstacle===chase.door),'persistent resistance triggers a new route');
assert(crossedAlternative&&Math.hypot(npc.actor.x-to.x,npc.actor.z-to.z)<.7,'Naiwa walks the alternate route to its original destination');
npc.reset();assert.equal(chase.door.pressureActor,null,'retry clears pressure');npc.dispose();

// Validate the packaged gait, rather than just a playback multiplier.
const gait=JSON.parse(readFileSync('assets/models/naiwa-h25-gait.json','utf8'));
for(const [clip,oldStride,oldStance] of [['Walk',.264,.62],['Run',.336,.46]]) {
  assert(gait[clip].strideDistance>oldStride*1.2,'each actual leg swing is larger');
  assert(gait[clip].stanceFraction/gait[clip].strideDistance<oldStance/oldStride*.85,'fewer steps cover the same world distance');
}
const raw=readFileSync('assets/models/naiwa-h25-rigged.glb'),length=raw.readUInt32LE(12),glb=JSON.parse(raw.subarray(20,20+length).toString());
assert.equal(glb.extras.gaitRevision,gait.revision,'the game metadata and actual GLB have the same revision');
for(const name of ['Walk','Run']) {
  const animation=glb.animations.find(clip=>clip.name===name),accessor=glb.accessors[animation.samplers[0].input];
  assert(Math.abs(accessor.max[0]-gait[name].duration)<.00001,'exported clip duration matches the playback data');
}
const gltf=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
const mixer=new THREE.AnimationMixer(gltf.scene),foot=gltf.scene.getObjectByName('Foot_L');
for(const [name,oldStride] of [['Walk',.264],['Run',.336]]) {
  mixer.stopAllAction();const clip=gltf.animations.find(clip=>clip.name===name);mixer.clipAction(clip).reset().play();
  const positions=[];
  for(let i=0;i<80;i++){mixer.setTime(clip.duration*i/80);gltf.scene.updateMatrixWorld(true);positions.push(foot.getWorldPosition(new THREE.Vector3()).z);}
  assert(Math.max(...positions)-Math.min(...positions)>oldStride*1.2,'the actual exported skeleton takes larger steps');
}
mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
console.log('Naiwa escape OK: gradual body pressure at 30/60/120 FPS, wall protection, NPC drawer collision, nearby fixture reversal, alternate doorway planning and actual rerouting under persistent resistance, retry cleanup, larger/slower packaged gait.');
