import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createNavigation,createPlayer} from '../src/frog-escape-navigation.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {chooseSearchKinds,roomContaining,BED_SEARCH} from '../src/frog-escape-investigation.js';
import {createEscapeNoise} from '../src/frog-escape-noise.js';
import {updateCastleDoor} from '../src/frog-escape-doors.js';
import {updateFixtureAction} from '../src/frog-escape-interactions.js';

for(const [rolls,expected] of [[[.1,.1,.9],['wardrobe','bed']],[[.1,.9],['wardrobe']],[[.9,.1],['bed']],[[.9,.9],[]]]) {
  let i=0;assert.deepEqual(chooseSearchKinds(30,()=>rolls[i++]),expected);assert(i>=2,'two independent probability draws');
}
assert.deepEqual(chooseSearchKinds(10,()=>{throw Error('dormant should not roll');}),[]);
assert.deepEqual(chooseSearchKinds(70,()=>.9),['wardrobe','bed']);assert.deepEqual(chooseSearchKinds(100,()=>.1),['bed','wardrobe']);

// Gameplay footsteps and panels do not depend on an audio context or mixer.
for(const crouched of [false,true]) {
  const scene=new THREE.Scene(),player={...createPlayer(),x:0,y:.15,z:0,crouched},events=[],panel={amount:0,x:2,y:.15,z:0,noiseOwner:player};
  scene.addEventListener('escape-noise',event=>events.push({...event}));
  const noise=createEscapeNoise({scene,player,doors:[panel]});noise.tick(0);
  for(let i=0;i<50;i++){player.x+=.08;noise.tick(.02);}
  assert.equal(events.filter(event=>event.kind==='footstep').length,crouched?0:2);
  player.x+=10;noise.tick(.02);assert.equal(events.filter(event=>event.kind==='footstep').length,crouched?0:2,'teleporting makes no footsteps');
  panel.amount=.2;noise.tick(.02);assert(events.some(event=>event.kind==='panel'&&event.loudness===.8));
  noise.reset();noise.tick(0);assert.equal(events.filter(event=>event.kind==='panel').length,1);
}

function setup({real=true,random=()=>.99,bedIndex=0}={}) {
  const scene=new THREE.Scene(),castle=real?createEscapeScene(scene,{labels:false}):null;
  const navigation=castle?.navigation??createNavigation({solids:[],stairs:[],boundary:[[-20,-20],[20,-20],[20,20],[-20,20]]});
  const bed=castle?.beds[bedIndex],start=bed?bed.root.localToWorld(new THREE.Vector3(0,0,-BED_SEARCH.approach)):new THREE.Vector3(0,.15,0);
  const player={...createPlayer(),x:start.x,y:start.y,z:start.z-3,hidden:true};
  const events=[];let caught=0;
  scene.addEventListener('escape-pursuer-investigation',({stage,kind,fixtureId,checks,room,exact,position,destination})=>events.push({stage,kind,fixtureId,checks,room,exact,position,destination}));
  const npc=createNaiwaPursuer({scene,navigation,doors:castle?.doors??[],interactables:castle?.interactables??[],beds:castle?.beds??[],rooms:castle?.rooms??[],
    player,worldItems:{physics:{addActor:()=>({remove(){}}),syncActors(){}}},random,spawn:{x:start.x,y:start.y,z:start.z},patrolRoute:[{x:start.x,y:start.y,z:start.z}],onCatch:()=>caught++});
  const step=seconds=>{for(let t=0;t<seconds-1e-8;t+=.02){for(const door of castle?.doors??[])updateCastleDoor(door,.02,[player,npc.actor],navigation);for(const action of castle?.interactables??[])updateFixtureAction(action,.02,[player,npc.actor],navigation);npc.tick(Math.min(.02,seconds-t));}};
  const until=(predicate,limit=45)=>{for(let t=0;t<limit&&!predicate();t+=.02)step(.02);assert(predicate(),`timed out in ${npc.state} at ${JSON.stringify({x:npc.actor.x,y:npc.actor.y,z:npc.actor.z,events})}`);};
  const phase=value=>{while(npc.alertness<value){npc.hit({damage:.01});step(.32);}npc.reset({keepAlertness:true});step(5.1);};
  step(5.1);
  return {scene,castle,navigation,bed,player,npc,start,events,step,until,phase,get caught(){return caught;}};
}

const hearing=setup({real:false});
assert.equal(hearing.npc.hear({x:10,y:1.5,z:0},.3),false,'a quiet distant sound is inaudible');
assert.equal(hearing.npc.hear({x:10,y:1.5,z:0},1.3),true,'a loud sound at the same position starts investigation');
hearing.npc.reset();hearing.step(5.1);hearing.scene.dispatchEvent({type:'escape-noise',owner:hearing.npc.actor,position:{x:2,y:1,z:0},loudness:1});assert.equal(hearing.npc.state,'patrol','Naiwa ignores its own door noise');hearing.npc.dispose();
for(const crouched of [false,true]) {
  const test=setup({real:false});Object.assign(test.player,{x:2,y:.15,z:3,hidden:false,crouched});test.npc.tick(0);
  for(let i=0;i<35;i++){test.player.x+=.05;test.npc.tick(.02);}
  if(crouched)assert.equal(test.npc.state,'patrol','crouched walking behind Naiwa stays silent');
  else assert.notEqual(test.npc.state,'patrol','normal footsteps make Naiwa turn to investigate and possibly see the player');
  test.npc.dispose();
}

// Real castle room, bed, wardrobe, doors and pathfinding. No hidden target is
// supplied to an unwitnessed search: furniture checks are chosen from the room.
for(const level of [10,30,70]) {
  const test=setup({random:()=>.99});test.phase(level);
  const hidden=test.bed.root.localToWorld(new THREE.Vector3(0,0,-.12));Object.assign(test.player,{x:hidden.x,y:hidden.y,z:hidden.z,hidingBed:test.bed.id,hidden:true});
  assert(test.npc.hear({x:test.start.x,y:test.start.y+1,z:test.start.z},1.2));
  test.until(()=>test.caught>0||!test.npc.investigating,75);
  assert(test.events.filter(event=>event.stage==='inspect'&&event.kind==='look').length>=2,'the bedroom sweep visits multiple clear observation points');
  const checks=test.events.find(event=>event.stage==='begin').checks;
  if(level<70){assert.deepEqual(checks,[]);assert.equal(test.caught,0);assert.notEqual(roomContaining(test.castle.rooms,test.npc.actor)?.id,'bedroom',`after sweeping Naiwa actually leaves the room: ${JSON.stringify(test.events)}`);}
  else {assert.deepEqual(checks,['wardrobe','bed']);assert.equal(test.caught,1,JSON.stringify(test.events));assert(test.events.some(event=>event.stage==='reach'));}
  test.npc.dispose();
}

for(const bedIndex of [0,1]) {
  const test=setup({bedIndex}),before=test.bed.root.localToWorld(new THREE.Vector3(0,0,-1.52));
  const hidden=test.bed.root.localToWorld(new THREE.Vector3(0,0,-.12));
  Object.assign(test.player,{x:hidden.x,y:hidden.y,z:hidden.z,hidingBed:test.bed.id});
  test.npc.actor.yaw=Math.atan2(test.start.x-hidden.x,test.start.z-hidden.z);
  assert(test.npc.observeHiding({kind:'bed',target:test.bed,position:before}),'a witnessed bed entry overrides dormant probability');
  assert.deepEqual(test.events.find(event=>event.stage==='begin').checks,['bed'],'go directly to the witnessed bed');
  test.until(()=>test.npc.prone);const health=test.npc.health,alertness=test.npc.alertness;
  assert.equal(test.npc.hit({damage:200,source:'melee'}),false);assert.equal(test.npc.hit({damage:5,item:{kind:'bread',type:'food'},source:'projectile'}),false);
  assert.equal(test.npc.health,health);assert.equal(test.npc.alertness,alertness);assert.equal(test.caught,0,'lowering alone does not catch a player');
  test.until(()=>test.npc.state==='bed-reach');assert.equal(test.caught,0,'right arm first starts reaching');test.step(BED_SEARCH.catchAt-.1);assert.equal(test.caught,0);
  test.step(.14);assert.equal(test.caught,1);test.step(2);assert.equal(test.caught,1,'capture settles exactly once');
  test.npc.reset();assert(!test.npc.prone&&!test.npc.investigating);test.npc.dispose();
}

const escape=setup();const hide=escape.bed.root.localToWorld(new THREE.Vector3(0,0,-.12));Object.assign(escape.player,{x:hide.x,y:hide.y,z:hide.z,hidingBed:escape.bed.id});escape.npc.actor.yaw=Math.atan2(escape.start.x-hide.x,escape.start.z-hide.z);
assert(escape.npc.observeHiding({kind:'bed',target:escape.bed,position:escape.bed.root.localToWorld(new THREE.Vector3(0,0,-1.52))}));escape.until(()=>escape.npc.state==='bed-reach');
Object.assign(escape.player,{hidingBed:null,hidden:true,x:20,z:20});escape.step(3);assert.equal(escape.caught,0,'leaving the bed before the right hand reaches prevents capture');assert(!escape.npc.prone);escape.npc.dispose();

const unseen=setup();unseen.npc.actor.yaw=0;assert.equal(unseen.npc.observeHiding({kind:'bed',target:unseen.bed,position:{x:unseen.start.x,y:unseen.start.y,z:unseen.start.z+4}}),false,'hiding behind Naiwa is not witnessed');unseen.npc.dispose();
const nearUnseen=setup();nearUnseen.npc.actor.yaw=0;assert.equal(nearUnseen.npc.observeHiding({kind:'bed',target:nearUnseen.bed,position:{x:nearUnseen.start.x,y:nearUnseen.start.y,z:nearUnseen.start.z+.8}}),false,'close-range body awareness does not reveal hiding behind the eyes');nearUnseen.npc.dispose();

const roomEntry=setup(),door=roomEntry.castle.doors.find(door=>door.id==='bedroom');door.open=true;updateCastleDoor(door,2,null,roomEntry.navigation);
Object.assign(roomEntry.npc.actor,{x:.4,y:5.15,z:3.8,yaw:Math.PI/2});Object.assign(roomEntry.player,{x:-2.2,y:5.15,z:3.8,hidden:false});roomEntry.npc.setMapLayer('all');
assert(roomEntry.npc.visiblePlayer(),'the open room entrance is visible from the hall');roomEntry.step(.02);assert.equal(roomEntry.npc.state,'chase');
Object.assign(roomEntry.player,{x:-5.6,y:5.15,z:5.2,hidden:true,hidingBed:roomEntry.bed.id});roomEntry.until(()=>roomEntry.events.some(event=>event.stage==='begin'));
assert.equal(roomEntry.events.find(event=>event.stage==='begin').room,'bedroom','a seen room entry is remembered after the player hides out of sight');assert.deepEqual(roomEntry.events.find(event=>event.stage==='begin').checks,[],'unseen hiding does not grant exact furniture knowledge');
roomEntry.until(()=>roomContaining(roomEntry.castle.rooms,roomEntry.npc.actor)?.id==='bedroom');roomEntry.npc.dispose();

for(const cabinetIndex of [0,1]) {
  const test=setup(),cabinet=test.castle.interactables.filter(action=>action.hideVolume)[cabinetIndex],root=cabinet.hideVolume.root;
  const front=root.localToWorld(new THREE.Vector3(0,0,cabinet.hideVolume.maxZ+1.18)),inside=root.localToWorld(new THREE.Vector3(0,.125,0)),before=root.localToWorld(new THREE.Vector3(0,0,cabinet.hideVolume.maxZ+.16));
  Object.assign(test.npc.actor,{x:front.x,y:front.y,z:front.z,yaw:Math.atan2(front.x-inside.x,front.z-inside.z)});test.npc.setMapLayer('all');
  Object.assign(test.player,{x:inside.x,y:inside.y,z:inside.z,hidingBed:null,hidingWardrobe:cabinet.id,hidden:true});
  assert(test.npc.observeHiding({kind:'wardrobe',target:cabinet,position:before}));assert.deepEqual(test.events.find(event=>event.stage==='begin').checks,['wardrobe']);
  test.until(()=>test.caught===1,8);assert(cabinet.amount>.55,'the actual wardrobe leaves must open before capture');test.npc.dispose();
}

// Check actual GLB hand/body geometry, clip continuity and anatomical right reach.
const bytes=readFileSync('assets/models/naiwa-h25-rigged.glb');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const rig=gltf.scene,mixer=new THREE.AnimationMixer(rig);
function sample(clip,time){mixer.stopAllAction();const action=mixer.clipAction(gltf.animations.find(c=>c.name===clip));action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.update(time);rig.updateMatrixWorld(true);return Object.fromEntries(['Head','Chest','Hand_L','Hand_R'].map(name=>[name,rig.getObjectByName(name).getWorldPosition(new THREE.Vector3())]));}
const prone=sample('BedSearch',1.2),reach=sample('BedReach',.7),rise=sample('BedRise',0);
assert(prone.Head.y<.4&&prone.Head.z>.7,'body lies face down towards the bed');
for(const side of ['L','R']){assert(prone[`Hand_${side}`].y<.13&&prone[`Hand_${side}`].y>.08,'both hand joints leave clearance for their thick palms against the floor');assert(prone[`Hand_${side}`].distanceTo(rise[`Hand_${side}`])<.002,'rising begins in the same grounded pose');}
sample('BedSearch',1.2);for(const side of ['L','R']){const hand=rig.getObjectByName(`Hand_${side}`),normal=new THREE.Vector3(0,0,1).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));assert(normal.y<-.95,'the actual palms face the ground');}
const mesh=rig.getObjectByProperty('isSkinnedMesh',true);mesh.skeleton.update();let bottom=Infinity,underBedTop=-Infinity;
for(let i=0;i<mesh.geometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,p);bottom=Math.min(bottom,p.y);if(p.z>(BED_SEARCH.approach-1.05)/1.7)underBedTop=Math.max(underBedTop,p.y*2.1);}
assert(bottom>-.005,'neither body nor fingers penetrate the floor');assert(underBedTop<.72,'the head that enters the bed fits below the real bed frame');
assert(reach.Hand_L.z-prone.Hand_L.z>.19,'anatomical right hand extends under the bed');assert(reach.Hand_R.distanceTo(prone.Hand_R)<.002,'left hand stays planted');
assert(sample('BedRise',BED_SEARCH.rise).Head.y>.9,'the rise returns to standing');
// Check the whole transition, not only the settled pose: the old descent drove
// toes through the floor, and moving forward to reach pushed the crown into
// the bed frame even though the hands and head-joint positions looked valid.
const vertex=new THREE.Vector3(),frameStart=(BED_SEARCH.approach-1.05)/1.7;
for(const name of ['BedSearch','BedReach','BedRise']) {
  const clip=gltf.animations.find(clip=>clip.name===name);
  for(let frame=0;frame<=Math.ceil(clip.duration*30);frame++) {
    const time=Math.min(frame/30,clip.duration);sample(name,time);mesh.skeleton.update();let floor=Infinity,ceiling=-Infinity;
    for(let i=0;i<mesh.geometry.attributes.position.count;i++) {
      vertex.fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,vertex);
      floor=Math.min(floor,vertex.y);if(vertex.z>frameStart)ceiling=Math.max(ceiling,vertex.y*2.1);
    }
    assert(floor>-.005,`${name} at ${time.toFixed(3)}s keeps the toes and body above the floor (${floor.toFixed(4)})`);
    assert(ceiling<.72,`${name} at ${time.toFixed(3)}s keeps the crown below the bed frame (${ceiling.toFixed(4)})`);
  }
}
console.log('Investigation OK: independent 50% checks, random Tangwang order, real room sweep and exit, witnessed hiding in both beds, prone immunity, timed right-hand capture or escape, reset; loudness/quiet crouch/mute-independent hearing; actual GLB prone/grounded hands/right reach/rise.');
