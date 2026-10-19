import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createNavigation,createPlayer,advancePlayer,jumpPlayer} from '../src/frog-escape-navigation.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {propItem} from '../src/frog-escape-props.js';
import {createInventory} from '../src/frog-escape-inventory.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {NAIWA_SKILLS,NAIWA_BLOCK,NAIWA_BED_PULL,blockPoseAmount,elevatedPlayerInReach,createSkillDisplacement,advanceSkillDisplacement} from '../src/frog-escape-naiwa-skills.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createNaiwaModel} from '../src/frog-escape-naiwa-model.js';

const boundary=[[-20,-20],[20,-20],[20,20],[-20,20]];
const box=(x,z,halfX,halfZ,minY,maxY)=>({x,z,halfX,halfZ,minY,maxY,axisX:[1,0],axisZ:[0,1]});
for(const fps of [25,60,144]) {
  const navigation=createNavigation({solids:[],stairs:[],boundary}),scene=new THREE.Scene(),items=createWorldItems(scene,navigation);
  const item=propItem('crowbar',`topple-${fps}`),target={position:new THREE.Vector3(0,.856,0),yaw:0,valid:true};
  const entry=items.place(item,target);assert(entry);
  const up=()=>new THREE.Vector3(0,1,0).applyQuaternion(entry.mesh.quaternion).y;
  assert(up()>.999,'E placement first releases the crowbar upright');
  for(let i=0;i<Math.floor(fps*.12);i++)items.tick(1/fps);
  assert(up()>.99,'the crowbar stands briefly before losing balance');
  for(let i=0;i<fps*2;i++)items.tick(1/fps);
  assert(Math.abs(up())<.25&&entry.y<.4,'the real rigid body tips and settles on its side');
  const bag=createInventory();assert(items.pickup(entry,bag));assert.equal(bag.slots.filter(Boolean).length,1,'the fallen crowbar is still one recoverable inventory item');
  const early=items.place(propItem('crowbar',`early-${fps}`),target);assert(early);assert(items.pickup(early,createInventory()));
  for(let i=0;i<fps;i++)items.tick(1/fps);
  assert.equal(items.entries.length,0,'picking up during the upright moment leaves no delayed ghost physics');
}

for(const fps of [25,60,144])for(const lowCeiling of [false,true]) {
  const navigation=createNavigation({solids:[],stairs:[],boundary});
  const player={...createPlayer(),x:3,y:.15,z:-3},actor={x:3,y:.15,z:-2,yaw:0};
  if(lowCeiling)navigation.ceilings.push({minX:2,maxX:4,minZ:-8,maxZ:-2,height:.15+1.72+.035});
  const force=createSkillDisplacement('slam',actor,player);let active=true,peak=player.y,firstStep=0;
  assert(Math.abs(Math.atan2(player.velocityY,force.speed)*180/Math.PI-10)<1e-9,'the initial knockback vector launches exactly ten degrees upward');
  assert(force.speed>2/.36,'the initial horizontal impulse is faster than the previous flat knockback');
  for(let i=0;i<fps*1.2;i++) {
    advancePlayer(player,0,0,1/fps,navigation);
    if(active)active=advanceSkillDisplacement(force,player,navigation,1/fps);
    if(i===0)firstStep=Math.abs(player.z+3);peak=Math.max(peak,player.y);
  }
  assert(Math.abs(player.z+3+2.7)<1e-6,'the fading impulse travels 2.7 metres at every tested frame rate');
  assert(firstStep>NAIWA_SKILLS.slam.pushDistance/NAIWA_SKILLS.slam.forceDuration/fps,'the impulse starts fast and eases out');
  assert(peak>.15&&peak<=(lowCeiling?.185:.25)+1e-6,'the small upward arc respects the real ceiling');
  assert(player.grounded&&Math.abs(player.y-.15)<1e-9,'regular gravity returns the player naturally to the floor');
  assert.equal(player.skillControlScale,undefined);
}

function setup({wall=false,occluded=false,behind=false}={}) {
  const scene=new THREE.Scene(),platform=box(0,behind?1.1:-1.1,.9,.4,.15,1.05),solids=[platform];
  if(wall)solids.push(box(0,-2.1,2,.1,.15,3));
  if(occluded)solids.push(box(0,-.5,2,.05,.15,3));
  const navigation=createNavigation({solids,stairs:[],boundary}),spawn={x:0,y:.15,z:0};
  const player={...createPlayer(),x:0,y:1.05,z:behind?1.05:-1.05,hidden:true,crouched:false},events=[];
  const worldItems={physics:{addActor:()=>({remove(){}}),syncActors(){}}};
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems,player,spawn,patrolRoute:[spawn]});
  scene.addEventListener('escape-pursuer-skill',event=>events.push({kind:event.kind,stage:event.stage,velocityY:player.velocityY}));
  const step=seconds=>{for(let remaining=seconds;remaining>1e-9;){const dt=Math.min(.02,remaining);advancePlayer(player,0,0,dt,navigation);npc.tick(dt);remaining-=dt;}};
  step(5.2);player.hidden=false;
  return {scene,navigation,spawn,player,npc,events,step};
}
const slam=setup();slam.step(.02);assert.equal(slam.npc.state,'slam','a nearby player standing above Naiwa triggers the elevated attack');
const startZ=slam.player.z;slam.step(.6);
assert.equal(slam.player.z,startZ,'the raised fist has a visible anticipation before impact');
slam.step(.1);
assert(Math.abs(slam.events.find(event=>event.stage==='hit')?.velocityY-9*Math.tan(Math.PI/18))<1e-9,'the actual timed hit applies the ten-degree launch');
slam.step(.08);assert(slam.player.y>1.05,'the player briefly rises after impact');
slam.step(.46);
assert.equal(slam.events.filter(event=>event.kind==='slam'&&event.stage==='hit').length,1,'one downstroke resolves exactly one hit');
assert.equal(slam.player.health,94,'one landed slam removes exactly six health');
assert(Math.abs(slam.player.z-startZ+2.7)<.001,'an unobstructed slam knocks the player back 2.7 metres');
assert(slam.player.y<1.05,'a physical knock can carry the player off the raised platform');
assert.equal(slam.player.skillControlScale,undefined,'control is restored after the knockback');

slam.player.hidden=true;slam.step(3.1);
Object.assign(slam.npc.actor,slam.spawn,{yaw:0,grounded:true,velocityY:0});slam.npc.setMapLayer('all');
Object.assign(slam.player,{x:0,y:1.05,z:-1.05,hidden:false,grounded:true,velocityY:0,crouched:true});
slam.step(.02);assert.equal(slam.npc.state,'pull','the next elevated attack uses the right-hand pull');
const pullStart=slam.player.z;slam.step(.4);assert.equal(slam.player.z,pullStart,'the arm reaches before the pull begins');
slam.step(.64);
assert(slam.player.z>pullStart+.35,'the pulling hand draws the player towards Naiwa');
assert(slam.npc.actor.z>.2,'the body steps back while the right arm retracts');
assert(slam.player.y<1.05,'forced pulling can overcome crouched ledge protection');
assert.equal(slam.events.filter(event=>event.kind==='pull'&&event.stage==='hit').length,1);
assert.equal(slam.player.skillControlScale,undefined);
assert.equal(slam.npc.state,'grab','a landed pull immediately transitions to a hug at unobstructed close range');
assert.equal(slam.player.heldBy,slam.npc.actor);assert(!jumpPlayer(slam.player),'a pulled and held player cannot jump');
assert(slam.events.some(event=>event.kind==='pull'&&event.stage==='end'),'contact finishes the pulling animation without waiting out its recovery');
slam.npc.hit({damage:5});assert.equal(slam.player.heldBy,null,'a crowbar strike releases the pull hug');
slam.npc.reset();assert.equal(slam.player.skillControlScale,undefined);assert.equal(slam.player.heldBy,null);slam.npc.dispose();

function sameFloorJump(atApex=false) {
  const test=setup();Object.assign(test.npc.actor,{x:2,y:.15,z:0,yaw:0});test.npc.setMapLayer('all');
  Object.assign(test.player,{x:2,y:.15,z:-.85,grounded:true,hidden:atApex});
  assert(jumpPlayer(test.player));
  if(atApex)test.step(.24);
  test.player.hidden=false;test.step(.02);return test;
}
for(const atApex of [false,true]) {
  const held=sameFloorJump(atApex);
  assert.equal(held.npc.state,'grab','same-floor jumps at takeoff or in midair are grabbed instead of triggering elevated skills');
  assert(!held.events.some(event=>event.stage==='start'),'same-floor jumping cannot trigger either slam or pull');
  assert.equal(held.player.heldBy,held.npc.actor);assert(held.player.velocityY<=0,'the hug arrests the upward jump');
  held.step(.4);assert(held.player.grounded,'a held player settles to the floor');
  assert(!jumpPlayer(held.player),'jump remains blocked even after the held player touches down');
  const before={x:held.player.x,z:held.player.z};advancePlayer(held.player,1,-1,.02,held.navigation);
  assert.deepEqual({x:held.player.x,z:held.player.z},before,'the hug also prevents walking out of the embrace');
  held.npc.hit({damage:5});assert.equal(held.player.heldBy,null);assert(jumpPlayer(held.player),'interrupting the hug restores jumping');held.npc.dispose();
}
const resetHold=sameFloorJump();resetHold.npc.reset();assert.equal(resetHold.player.heldBy,null,'retry clears the held flag');resetHold.npc.dispose();
const disposeHold=sameFloorJump();disposeHold.npc.dispose();assert.equal(disposeHold.player.heldBy,null,'leaving the game clears the held flag');
const bedJump=setup();assert(jumpPlayer(bedJump.player));advancePlayer(bedJump.player,0,0,.02,bedJump.navigation);
assert(elevatedPlayerInReach(bedJump.npc.actor,bedJump.player,bedJump.navigation),'jumping from an actual tabletop retains its elevated takeoff surface');bedJump.npc.dispose();

const blocked=setup({wall:true});blocked.step(1.1);
assert(blocked.events.some(event=>event.kind==='slam'&&event.stage==='hit'));
assert(blocked.player.z>-1.76,'knockback stops against a real wall');
assert(!blocked.navigation.blocked(blocked.player.x,blocked.player.y,blocked.player.z,false,1.72,.27,[blocked.npc.actor.collider]),'the wall cannot swallow the player');blocked.npc.dispose();

const dodge=setup();dodge.step(.3);dodge.player.x=3;dodge.step(1);
assert(dodge.events.some(event=>event.stage==='miss')&&!dodge.events.some(event=>event.stage==='hit'),'leaving the attack range before impact dodges the skill');assert.equal(dodge.player.health,100);dodge.npc.dispose();
const interrupt=setup();interrupt.step(.2);interrupt.npc.hit({damage:5});interrupt.step(1);
assert(interrupt.events.some(event=>event.stage==='interrupt')&&!interrupt.events.some(event=>event.stage==='hit'),'a crowbar hit interrupts the skill windup');interrupt.npc.dispose();
const cover=setup({occluded:true});cover.step(1);
assert(!cover.events.some(event=>event.stage==='start'),'walls block elevated attacks');cover.npc.dispose();
const behind=setup({behind:true});behind.step(.02);
assert(Math.abs(behind.npc.actor.yaw)<=.121&&!behind.events.some(event=>event.stage==='start'),'the planted body first turns towards a player behind it');
behind.step(.6);assert(behind.events.some(event=>event.stage==='start'),'the raised attack begins after the body has faced its target');behind.npc.dispose();
for(const height of [.15,5.15]) {
  const isolated=setup();isolated.player.y=height;isolated.step(1);
  assert(!isolated.events.some(event=>event.stage==='start'),'same-floor and different-storey players do not trigger the raised-player skills');isolated.npc.dispose();
}
const castle=createEscapeScene(new THREE.Scene(),{labels:false}),table=castle.navigation.solids.find(s=>Math.abs(s.x-4.75)<.001&&Math.abs(s.z+.2)<.001&&Math.abs(s.maxY-1.05)<.001);
let exposed=false;
for(const side of [-1,1])for(const axis of ['x','z']) {
  const px=axis==='x'?side*(table.halfX-.12):0,pz=axis==='z'?side*(table.halfZ-.12):0;
  const player={...createPlayer(),x:table.x+px,y:table.maxY,z:table.z+pz};
  const actor={x:player.x+(axis==='x'?side*.8:0),y:.15,z:player.z+(axis==='z'?side*.8:0)};
  if(!castle.navigation.blocked(actor.x,actor.y,actor.z,false,2.1,.4)&&elevatedPlayerInReach(actor,player,castle.navigation))exposed=true;
}
assert(exposed,'the actual castle tabletop exposes a reachable elevated player');

// Inspect the real exported bone motion, without opening a browser or rendering.
const raw=readFileSync('assets/models/naiwa-h25-rigged.glb'),gltf=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
const mixer=new THREE.AnimationMixer(gltf.scene),right=gltf.scene.getObjectByName('Hand_L'),left=gltf.scene.getObjectByName('Hand_R'),head=gltf.scene.getObjectByName('Head'),hips=gltf.scene.getObjectByName('Hips');
const point=bone=>bone.getWorldPosition(new THREE.Vector3());
function sample(name,time) {
  mixer.stopAllAction();const clip=gltf.animations.find(clip=>clip.name===name);assert(clip);mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce,1).play();mixer.setTime(time);gltf.scene.updateMatrixWorld(true);
  return {right:point(right),left:point(left),head:point(head),hips:point(hips),handScale:right.scale.y};
}
const raised=sample('Slam',.42),struck=sample('Slam',.68);
assert(raised.right.x<0&&raised.right.y>raised.head.y+.025&&raised.right.y>raised.left.y+.35,'the anatomical right hand rises above the head');
assert(struck.right.y<raised.right.y-.12&&struck.right.z>raised.right.z+.08,'the right fist arcs down and forward');
assert(struck.handScale<.7,'the striking hand closes around the fist volume');
const reach=sample('Pull',.46),retract=sample('Pull',.84);
assert(reach.right.z>retract.right.z+.04,'the reaching right hand retracts with the pulling body');
assert(Math.abs(reach.hips.y-retract.hips.y)>.002,'the pelvis and knees follow the arm action');
const bedStart=sample('BedPull',0),bedLean=sample('BedPull',NAIWA_BED_PULL.anticipation),bedReach=sample('BedPull',NAIWA_BED_PULL.impact);
assert(bedLean.head.z>bedStart.head.z+.07,'the body visibly leans forward before the bed pull reaches');
assert(bedReach.right.z>bedLean.right.z+.12,'the right arm reaches after the leaning preparation');
assert(Math.abs(gltf.animations.find(clip=>clip.name==='BedPull').duration-NAIWA_BED_PULL.duration)<1e-6);
const block=gltf.animations.find(clip=>clip.name==='Block');assert(block);assert(Math.abs(block.duration-NAIWA_BLOCK.duration)<1e-6);
function blockSample(time) {
  const pose=sample('Block',time),orientation=left.getWorldQuaternion(new THREE.Quaternion());
  return {...pose,palm:new THREE.Vector3(0,-.035,.012).applyMatrix4(left.matrixWorld),normal:new THREE.Vector3(0,0,1).applyQuaternion(orientation),up:new THREE.Vector3(0,-1,0).applyQuaternion(orientation),
    elbow:point(gltf.scene.getObjectByName('Forearm_R')),feet:['Foot_L','Foot_R'].map(name=>point(gltf.scene.getObjectByName(name)))};
}
const resting=blockSample(0),guard=blockSample(.5),lowered=blockSample(NAIWA_BLOCK.duration);
assert(guard.left.x>0&&guard.left.y>guard.right.y+.4,'the anatomical left hand guards while the right hand stays low');
assert(Math.abs(guard.palm.x-guard.head.x)<.1&&Math.abs(guard.palm.y-guard.head.y)<.04&&guard.palm.z>guard.head.z+.2,'the open left palm sits directly in front of the face');
assert(guard.normal.z>.94&&guard.up.y>.6,'the relaxed palm faces outward with fingers up, without forcing a straight wrist reversal');
assert(guard.elbow.y<guard.left.y-.035&&guard.elbow.x>guard.left.x+.08,'the elbow bends naturally below and outside the wrist');
assert(guard.hips.y<resting.hips.y-.008&&guard.head.z<resting.head.z-.025,'the torso braces behind the guard');
assert(guard.feet.every((foot,i)=>foot.distanceTo(resting.feet[i])<.004),'the feet stay planted while the weight shifts');
assert(lowered.left.distanceTo(resting.left)<1e-5,'the complete clip lowers the left hand back to rest');
for(const fps of [25,60,144]) {
  let previous=null,maxStep=0;
  for(let i=0;i<=Math.ceil(NAIWA_BLOCK.duration*fps);i++) {
    const time=Math.min(NAIWA_BLOCK.duration,i/fps),pose=blockSample(time);
    assert(pose.left.toArray().every(Number.isFinite)&&pose.normal.z>.9,'the relaxed palm stays outward throughout the clip');
    if(previous)maxStep=Math.max(maxStep,pose.left.distanceTo(previous));previous=pose.left;
    if(time>NAIWA_BLOCK.raise&&time<NAIWA_BLOCK.holdEnd)assert(pose.left.distanceTo(guard.left)<.001,'the raised pose holds steadily');
  }
  assert(maxStep<.15,'the arm raises and lowers continuously at supported frame rates');
}
mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);

const fallback=createNaiwaModel();assert.equal(await fallback.ready,false);
fallback.animate(0,{state:'block',actionTime:.5});fallback.root.updateMatrixWorld(true);
const fallbackPalm=fallback.root.getObjectByName('naiwa:left-palm'),fallbackEyes=[];
fallback.root.traverse(object=>{if(object.name==='naiwa:green-eye')fallbackEyes.push(point(object));});
const palmPoint=point(fallbackPalm),eyeHeight=(fallbackEyes[0].y+fallbackEyes[1].y)/2;
assert(Math.abs(palmPoint.y-eyeHeight)<.12&&palmPoint.z>Math.max(...fallbackEyes.map(eye=>eye.z))+.15,'the fallback also raises its open left palm in front of the face');
assert(new THREE.Vector3(0,0,1).applyQuaternion(fallbackPalm.getWorldQuaternion(new THREE.Quaternion())).normalize().z>.75,'the fallback palm faces forward with a relaxed wrist');
assert.equal(fallback.activeClip,'Block');fallback.reset();fallback.root.updateMatrixWorld(true);assert(point(fallbackPalm).y<1,'reset lowers the fallback arm immediately');fallback.dispose();
assert.equal(blockPoseAmount(0),0);assert.equal(blockPoseAmount(.5),1);assert.equal(blockPoseAmount(NAIWA_BLOCK.duration),0);

// Exercise the packaged rig's actual selection/time/reset path using a local
// fetch stub. No browser, rendering, network or automatic gameplay trigger.
const originalFetch=globalThis.fetch,originalDocument=globalThis.document,originalProgressEvent=globalThis.ProgressEvent;
let runtime;
try {
  globalThis.document={};globalThis.ProgressEvent??=class {constructor(type,options){this.type=type;Object.assign(this,options);}};
  globalThis.fetch=async()=>new Response(raw,{headers:{'Content-Length':String(raw.byteLength)}});
  runtime=createNaiwaModel();assert(await runtime.ready);assert.equal(runtime.root.userData.blockAnimation.aiEnabled,true);
  const standingWaist=runtime.getWaistPose();assert(standingWaist.position.y>.7&&standingWaist.position.y<1.3&&Math.abs(standingWaist.position.x)>.3,'the actual rig supplies a side-waist attachment');
  for(let i=0;i<70;i++)runtime.animate(1/60,{state:'down',stun:3});
  const downWaist=runtime.getWaistPose();assert(downWaist.position.toArray().every(Number.isFinite)&&downWaist.position.distanceTo(standingWaist.position)>.3,'the waist attachment follows the real knockdown bones');runtime.reset();
  for(let i=0;i<5;i++)runtime.animate(.05,{state:'block',actionTime:.5});
  runtime.root.updateMatrixWorld(true);assert.equal(runtime.activeClip,'Block');
  const runtimePalm=runtime.root.getObjectByName('naiwa:left-palm'),runtimeHead=runtime.skeleton.getBoneByName('Head');
  assert(point(runtimePalm).y>point(runtimeHead).y-.1&&point(runtimePalm).z>point(runtimeHead).z+.3,'the live model wrapper plays the actual raised left-hand clip');
  runtime.animate(.05,{state:'block',actionTime:NAIWA_BLOCK.duration});runtime.root.updateMatrixWorld(true);assert(point(runtimePalm).y<1,'the timed action finishes lowering its hand');
  for(let i=0;i<5;i++)runtime.animate(.05,{state:'patrol'});assert.equal(runtime.activeClip,'Idle');
  const feet=()=>['Foot_L','Foot_R'].map(name=>runtime.skeleton.getBoneByName(name).quaternion.clone());
  runtime.reset();runtime.animate(.04,{speed:1.55,state:'patrol'});const walkingFeet=feet();
  runtime.reset();runtime.animate(.04,{speed:1.55,state:'patrol',guardAmount:1});const shieldingFeet=feet();
  assert.equal(runtime.activeClip,'Walk','shielding overlays the walking animation');assert(walkingFeet.every((q,i)=>q.angleTo(shieldingFeet[i])<1e-6),'shielding preserves actual leg animation');
  runtime.root.updateMatrixWorld(true);assert(point(runtimePalm).y>point(runtimeHead).y-.1,'the left palm remains raised during locomotion');
  for(let i=0;i<10;i++)runtime.animate(.04,{speed:1.55,state:'patrol',guardAmount:1});
  assert(feet().some((q,i)=>q.angleTo(shieldingFeet[i])>.03),'the feet keep stepping while the hand shields');
  runtime.reset();runtime.animate(0,{guardAmount:1});const eyeR=runtime.skeleton.getBoneByName('Eye_L'),eyeL=runtime.skeleton.getBoneByName('Eye_R');
  const normalEyes=[eyeR.scale.y,eyeL.scale.y],normalHead=runtimeHead.quaternion.clone();
  runtime.animate(0,{guardAmount:1,lightAmount:1});
  assert(Math.abs(eyeR.scale.y/normalEyes[0]-.15)<1e-6&&Math.abs(eyeL.scale.y/normalEyes[1]-.5)<1e-6,'glare nearly closes the anatomical right eye and half-closes the left');
  const headTurn=new THREE.Euler().setFromQuaternion(normalHead.invert().multiply(runtimeHead.quaternion));assert(headTurn.y<-.09&&headTurn.y>-.14,'glare turns the head slightly toward the anatomical right');
  for(let i=0;i<30;i++)runtime.animate(0,{guardAmount:1,lightAmount:1});
  assert(Math.abs(eyeR.scale.y/normalEyes[0]-.15)<1e-6,'repeated shielding never accumulates eye squashing');
  runtime.animate(0,{guardAmount:0,lightAmount:0});assert(Math.abs(eyeR.scale.y-normalEyes[0])<1e-6&&Math.abs(eyeL.scale.y-normalEyes[1])<1e-6,'removing the light restores both eyes');
  runtime.reset();assert.equal(runtime.activeClip,'Idle');
}finally {
  runtime?.dispose();globalThis.fetch=originalFetch;if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
  if(originalProgressEvent===undefined)delete globalThis.ProgressEvent;else globalThis.ProgressEvent=originalProgressEvent;
}
console.log('Skills OK: upright-then-toppling placement, 10-degree airborne slam and fading 2.7m impulse, coordinated pull into a hold, same-floor jump capture, interruption/dodge/collision rules, actual raised-player gates; packaged Block clip and fallback raise the anatomical left open palm before the face, facing outward with fingers up, natural elbow/torso/feet at 25/60/144 FPS, steady hold, timed lowering, live rig selection/reset and guard overlay support.');
