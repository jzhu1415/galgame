import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createNaiwaModel} from '../src/frog-escape-naiwa-model.js';
import {createPlayer,advancePlayer,stairHeight,createNavigation} from '../src/frog-escape-navigation.js';
import {updateCastleDoor} from '../src/frog-escape-doors.js';
import {updateFixtureAction} from '../src/frog-escape-interactions.js';
import {flashlightEvidence,observedStairLanding} from '../src/frog-escape-perception.js';
import {inventoryItemIcon} from '../src/frog-escape-inventory-icons.js';
import {propTypes,propItem} from '../src/frog-escape-props.js';
import {flashlightItem} from '../src/frog-escape-items.js';
import {BED_SEARCH,roomContaining} from '../src/frog-escape-investigation.js';

const pictures=Object.keys(propTypes).map(kind=>inventoryItemIcon(propItem(kind,kind))).concat(inventoryItemIcon(flashlightItem()));
assert.equal(new Set(pictures).size,pictures.length,'each item has a recognisable distinct drawing');
for(const svg of pictures){assert(svg.startsWith('<svg')&&svg.includes('viewBox="0 0 48 48"'));assert(svg.includes('aria-hidden="true"')&&svg.includes('focusable="false"'));assert(!/script|href=|https?:|foreignObject/.test(svg),'icons are self-contained inert vector drawings');}
assert.equal(inventoryItemIcon(null),'');assert.equal(inventoryItemIcon({kind:'unknown'}),'');

function setup(spawn,{fps=60}={}) {
  const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),player={...createPlayer(),hidden:true,x:20,y:.15,z:20},events=[],searchRooms=[];
  let beam=null,caught=0;
  scene.addEventListener('escape-pursuer-light-notice',({fixtureId,position})=>events.push({fixtureId,position}));
  scene.addEventListener('escape-pursuer-investigation',event=>{if(event.stage==='begin')searchRooms.push(event.room);});
  const npc=createNaiwaPursuer({scene,navigation:castle.navigation,doors:castle.doors,interactables:castle.interactables,beds:castle.beds,rooms:castle.rooms,player,spawn,patrolRoute:[spawn],random:()=>.99,
    worldItems:{physics:{addActor:()=>({remove(){}}),syncActors(){}}},onCatch:()=>caught++});
  npc.setFlashlightSource(()=>beam);
  const tick=dt=>{for(const door of castle.doors)updateCastleDoor(door,dt,[player,npc.actor],castle.navigation);for(const action of castle.interactables)updateFixtureAction(action,dt,[player,npc.actor],castle.navigation);npc.tick(dt);};
  const step=seconds=>{for(let t=0;t<seconds-1e-8;t+=1/fps)tick(Math.min(1/fps,seconds-t));};
  step(5.1);
  return {scene,castle,player,npc,events,searchRooms,tick,step,patrol:spawn,set beam(value){beam=value;},get caught(){return caught;}};
}

for(const bedIndex of [0,1]) {
  const test=setup({x:1,y:5.15,z:3.8}),bed=test.castle.beds[bedIndex];
  const start=bed.root.localToWorld(new THREE.Vector3(0,0,-BED_SEARCH.approach)),inside=bed.root.localToWorld(new THREE.Vector3(0,0,-.12));
  Object.assign(test.npc.actor,{x:start.x,y:start.y,z:start.z,yaw:Math.atan2(start.x-inside.x,start.z-inside.z)});test.npc.setMapLayer('all');
  Object.assign(test.patrol,{x:start.x,y:start.y,z:start.z});
  Object.assign(test.player,{x:inside.x,y:inside.y,z:inside.z,hidingBed:bed.id,hidden:true});
  test.step(.3);assert.equal(test.events.length,0,'a silent dark bed does not reveal the hidden player');
  const origin=bed.root.localToWorld(new THREE.Vector3(0,.29,-.12)),direction=new THREE.Vector3(0,0,-1).transformDirection(bed.root.matrixWorld);
  const beam={enabled:true,origin,direction,range:20};
  const evidence=flashlightEvidence(beam,test.npc.actor,test.castle.navigation);assert(evidence,'light escaping the actual open bed foot can be seen');
  test.beam=beam;test.step(.3);assert.equal(test.events[0]?.fixtureId,bed.id,`even dormant Naiwa traces nearby visible spill to the bed opening: ${JSON.stringify({evidence,origin:origin.toArray(),local:bed.root.worldToLocal(origin.clone()).toArray()})}`);
  test.step(5);assert.equal(test.caught,1,'finding the light starts an actual bed search and right-hand capture');test.npc.dispose();
}

const closet=setup({x:1,y:5.15,z:3.8}),cabinet=closet.castle.interactables.find(action=>action.hideVolume),volume=cabinet.hideVolume;
const front=volume.root.localToWorld(new THREE.Vector3(0,0,volume.maxZ+1.18)),inside=volume.root.localToWorld(new THREE.Vector3(.3,.5,0));
Object.assign(closet.npc.actor,{x:front.x,y:front.y,z:front.z,yaw:Math.atan2(front.x-inside.x,front.z-inside.z)});closet.npc.setMapLayer('all');
Object.assign(closet.patrol,{x:front.x,y:front.y,z:front.z});
Object.assign(closet.player,{x:inside.x,y:5.275,z:inside.z,hidingWardrobe:cabinet.id});
closet.beam={enabled:true,origin:inside,direction:new THREE.Vector3(0,0,1).transformDirection(volume.root.matrixWorld),range:20};
closet.step(.6);assert.equal(closet.events.length,0,'a closed solid wardrobe hides its light');
cabinet.open=true;cabinet.noiseOwner=closet.npc.actor;updateFixtureAction(cabinet,2,null,closet.castle.navigation);closet.step(.3);assert.equal(closet.events[0]?.fixtureId,cabinet.id,'an opened wardrobe exposes the lamp');closet.npc.dispose();

const boundary=[[-20,-20],[20,-20],[20,20],[-20,20]],wall={x:0,z:-5,halfX:5,halfZ:.1,minY:.15,maxY:4,axisX:[1,0],axisZ:[0,1]};
const navigation=createNavigation({solids:[wall],boundary,stairs:[]}),actor={x:2,y:.15,z:-2,yaw:Math.atan2(2,3)},beam={enabled:true,origin:{x:0,y:.65,z:0},direction:{x:0,y:0,z:-1},range:15};
const patch=flashlightEvidence(beam,actor,navigation);assert(patch&&!patch.sourceVisible&&patch.sourceDistance>2,'a visible distant wall spot reveals only the spot');
assert.equal(flashlightEvidence({...beam,enabled:false},actor,navigation),null);assert.equal(flashlightEvidence(beam,{...actor,yaw:actor.yaw+Math.PI},navigation),null,'light outside the field of view is unnoticed');
const opaque={x:1,z:-3.5,halfX:8,halfZ:.08,minY:.15,maxY:4,axisX:[1,0],axisZ:[0,1]};navigation.solids.push(opaque);
assert.equal(flashlightEvidence(beam,{...actor,x:2,z:-6,yaw:Math.PI},navigation),null,'a real partition hides the lamp and its illuminated surfaces');

// A lost visual frame during an active chase must not replace the player route
// with a flashlight investigation. Glare defense remains independent of this.
for(const fps of [25,60,144]) {
  const test=setup({x:1,y:5.15,z:3.8},{fps}),bed=test.castle.beds[0],start=bed.root.localToWorld(new THREE.Vector3(0,0,-BED_SEARCH.approach));
  Object.assign(test.patrol,{x:start.x,y:start.y,z:start.z});Object.assign(test.npc.actor,{x:start.x,y:start.y,z:start.z,yaw:0});test.npc.setMapLayer('all');
  Object.assign(test.player,{x:start.x+2,y:start.y,z:start.z-.65,hidden:false});test.npc.actor.yaw=Math.atan2(start.x-test.player.x,start.z-test.player.z);test.tick(1/fps);assert.equal(test.npc.state,'chase');
  const hiding=bed.root.localToWorld(new THREE.Vector3(0,0,-.12));Object.assign(test.player,{x:hiding.x,y:hiding.y,z:hiding.z,hidden:true,hidingBed:bed.id});
  test.npc.actor.yaw=Math.PI;const visibleBeam={enabled:true,origin:bed.root.localToWorld(new THREE.Vector3(0,.29,-.12)),direction:{x:0,y:0,z:-1},range:20};test.beam=visibleBeam;
  assert(flashlightEvidence(visibleBeam,test.npc.actor,test.castle.navigation),'the regression has genuinely visible light behind the last seen player');
  test.step(.3);assert.equal(test.events.length,0,'known player pursuit has priority over visible light, even after losing the player for a frame');assert.equal(test.npc.state,'chase');test.npc.dispose();
}

// Reproduce a real chase with the player already partway along either main
// staircase, then hiding at the destination. Memory must last until the landing.
for(const fps of [25,60,144])for(const stairIndex of [0,1])for(const up of [false,true]) {
  const floor=stairIndex===0?-5.05:.15,top=stairIndex===0?.15:5.15;
  const spawn={x:8,y:up?floor:top,z:up?5.2:-5.2},test=setup(spawn,{fps}),stair=test.castle.navigation.stairs[stairIndex];
  const initial=up?.34:.68,z=stair.startZ+(stair.endZ-stair.startZ)*initial;
  Object.assign(test.player,{x:8,y:stairHeight(stair,z),z,hidden:false});test.npc.actor.yaw=up?0:Math.PI;test.npc.setMapLayer('all');
  assert(test.npc.visiblePlayer(),'a player on the real stair is visible');test.tick(1/fps);assert.equal(test.npc.state,'chase');
  const target=up?{x:8,y:top,z:-5.25}:{x:8,y:floor,z:5.25};let hid=false,reached=false;
  for(let i=0;i<fps*18;i++) {
    if(!hid){const dz=Math.sign(target.z-test.player.z)*Math.min(4.42/fps,Math.abs(target.z-test.player.z));advancePlayer(test.player,0,dz,1/fps,test.castle.navigation);if(Math.abs(test.player.z-target.z)<.05){test.player.hidden=true;hid=true;}}
    test.tick(1/fps);
    if(Math.abs(test.npc.actor.y-target.y)<.25&&Math.abs(test.npc.actor.z-target.z)<1){reached=true;break;}
  }
  assert(reached,`chase reaches the ${up?'upper':'lower'} landing: ${JSON.stringify({fps,stairIndex,state:test.npc.state,actor:test.npc.actor.y,z:test.npc.actor.z})}`);test.npc.dispose();
  const landing=observedStairLanding({x:8,y:stairHeight(stair,z),z},{x:8,y:stairHeight(stair,z)+(up?-.2:.2),z:z+(up?.2:-.2)},spawn,[stair]);assert.equal(landing.y,target.y);
}

for(const stairIndex of [0,1])for(const up of [false,true]) {
  const floor=stairIndex===0?-5.05:.15,top=stairIndex===0?.15:5.15,spawn={x:8,y:up?floor:top,z:up?5.2:-5.2},test=setup(spawn),stair=test.castle.navigation.stairs[stairIndex];
  const z=stair.startZ+(stair.endZ-stair.startZ)*(up?.34:.68),seen={x:8,y:stairHeight(stair,z),z};
  Object.assign(test.player,seen,{hidden:false});test.npc.actor.yaw=up?0:Math.PI;test.tick(.02);assert.equal(test.npc.state,'chase');
  const landing=observedStairLanding(seen,null,spawn,test.castle.navigation.stairs),expectedRoom=roomContaining(test.castle.rooms,landing)?.id;
  // Move the hidden collision capsule out of the path without giving the NPC a
  // second visual observation. Only the last seen direction may guide pursuit.
  Object.assign(test.player,{hidden:true,x:-5,y:up?top:floor,z:3});test.step(13);
  assert.equal(test.searchRooms[0],expectedRoom,'lost stair pursuit searches the destination floor, rather than returning to the room below the staircase');test.npc.dispose();
}

const bytes=readFileSync('assets/models/naiwa-h25-rigged.glb'),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const skin=gltf.scene.getObjectByProperty('isSkinnedMesh',true),edges=new Map(),indices=skin.geometry.index.array;
for(let i=0;i<indices.length;i+=3)for(const [a,b] of [[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]){const key=a<b?`${a}/${b}`:`${b}/${a}`;edges.set(key,(edges.get(key)??0)+1);}
assert([...edges.values()].every(count=>count===2),'the original inner and outer surfaces form a closed manifold with no missing arm faces');
const sourceBytes=readFileSync('assets/models/naiwa-h25-articulated.glb'),source=await new GLTFLoader().parseAsync(sourceBytes.buffer.slice(sourceBytes.byteOffset,sourceBytes.byteOffset+sourceBytes.byteLength),'');
const sourceMesh=source.scene.getObjectByProperty('isMesh',true);
for(const name of ['position','normal','color'])assert.deepEqual(skin.geometry.attributes[name].array,sourceMesh.geometry.attributes[name].array,'the repair preserves the original character surface and palette');
assert.deepEqual(indices,sourceMesh.geometry.index.array,'the repair also preserves the original surface triangles');
// Keep the original hierarchy and append shoulder supports for posed volume.
const originalHierarchy=[['Root','Naiwa'],['Hips','Root'],['Spine','Hips'],['Chest','Spine'],['Neck','Chest'],['Head','Neck']];
for(const side of ['L','R'])originalHierarchy.push([`UpperArm_${side}`,'Chest'],[`Forearm_${side}`,`UpperArm_${side}`],[`Hand_${side}`,`Forearm_${side}`],[`Thigh_${side}`,'Hips'],[`Shin_${side}`,`Thigh_${side}`],[`Foot_${side}`,`Shin_${side}`],[`Toe_${side}`,`Foot_${side}`],[`Eye_${side}`,'Head']);
assert.equal(skin.skeleton.bones.length,24,'the original skeleton has two shoulder volume supports');
assert.deepEqual(skin.skeleton.bones.slice(0,22).map(bone=>[bone.name,bone.parent?.name]),originalHierarchy,'all original bone indices and parent relationships stay unchanged');
for(const side of ['L','R']) {
  const support=skin.skeleton.getBoneByName(`Shoulder_${side}`),upper=skin.skeleton.getBoneByName(`UpperArm_${side}`);
  assert.equal(support.parent.name,'Chest');assert(support.position.distanceTo(upper.position)<1e-6,'shoulder supports share the original shoulder pivot');
}
assert.equal(gltf.parser.json.extras.source,'naiwa-h25-articulated.glb','the rig uses the repaired closed inner-arm surface');
assert.equal(gltf.parser.json.extras.sourceSha256,createHash('sha256').update(sourceBytes).digest('hex'),'the rig matches the actual repaired mesh');
assert.equal(gltf.parser.json.extras.armRebuild.topologyRepaired,true);
const identity=new THREE.Quaternion(),armBones=skin.skeleton.bones.filter(bone=>/^(UpperArm|Forearm|Hand)_/.test(bone.name));
function checkArmPose(bones,previous,label) {
  for(const bone of bones) {
    assert([...bone.position,...bone.quaternion,...bone.scale].every(Number.isFinite),`${label}: ${bone.name} remains finite`);
    const angle=bone.quaternion.angleTo(identity);
    if(bone.name.startsWith('Forearm_'))assert(angle<2.25,`${label}: ${bone.name} does not carry a near-half-turn (${angle.toFixed(3)}rad)`);
    if(bone.name.startsWith('Hand_'))assert(angle<1.25,`${label}: ${bone.name} stays within a modest wrist correction (${angle.toFixed(3)}rad)`);
    if(previous.has(bone.name))assert(bone.quaternion.angleTo(previous.get(bone.name))<.25,`${label}: ${bone.name} has no sudden reversal at 60 FPS`);
    previous.set(bone.name,bone.quaternion.clone());
  }
}
function palmDirection(bone,axis) {return axis.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()));}
const armJointIndices=new Set(skin.skeleton.bones.map((bone,i)=>/^(Shoulder|UpperArm|Forearm|Hand)_/.test(bone.name)?i:-1));
const skinIndices=skin.geometry.attributes.skinIndex.array,skinWeights=skin.geometry.attributes.skinWeight.array,restVertices=Array.from({length:skin.geometry.attributes.position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(skin.geometry.attributes.position,i));
const belongsToArm=restVertices.map((_,i)=>{let weight=0;for(let c=0;c<4;c++)if(armJointIndices.has(skinIndices[i*4+c]))weight+=skinWeights[i*4+c];return weight>.8;});
const armFaces=[],deformedVertices=[],edgeA=new THREE.Vector3(),edgeB=new THREE.Vector3();
for(let i=0;i<indices.length;i+=3) {
  const [a,b,c]=[indices[i],indices[i+1],indices[i+2]];
  if(!belongsToArm[a]||!belongsToArm[b]||!belongsToArm[c])continue;
  const area=edgeA.subVectors(restVertices[b],restVertices[a]).cross(edgeB.subVectors(restVertices[c],restVertices[a])).length();
  if(area<=1e-8)continue;
  armFaces.push({a,b,c,area});for(const vertex of [a,b,c])deformedVertices[vertex]??=new THREE.Vector3();
}
const armVertexIndices=[...new Set(armFaces.flatMap(({a,b,c})=>[a,b,c]))];
assert(armFaces.length>5000,'surface checks cover the repaired upper arms, inner surfaces, elbows, wrists and hands');
function checkArmSurface(label) {
  skin.updateWorldMatrix(true,false);skin.skeleton.update();
  for(const vertex of armVertexIndices) {
    const deformed=skin.applyBoneTransform(vertex,deformedVertices[vertex].copy(restVertices[vertex]));
    assert([...deformed].every(Number.isFinite),`${label}: the actual skinned arm surface remains finite`);
  }
  const ratios=armFaces.map(({a,b,c,area})=>edgeA.subVectors(deformedVertices[b],deformedVertices[a]).cross(edgeB.subVectors(deformedVertices[c],deformedVertices[a])).length()/area).sort((a,b)=>a-b);
  // Use a distribution of real surface areas: a single narrow source triangle
  // can fold locally, but broad regions of the elbow must not flatten away.
  const percentile=ratios[Math.floor(ratios.length*.01)];
  assert(percentile>.2,`${label}: the actual arm surface keeps its area (1st percentile ${percentile.toFixed(3)})`);
}
const skinMixer=new THREE.AnimationMixer(gltf.scene),poseClips=['Block','BedSearch','BedReach','BedRise'];
for(const clip of gltf.animations.filter(clip=>poseClips.includes(clip.name))) {
  skinMixer.stopAllAction();const action=skinMixer.clipAction(clip);action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
  const previous=new Map();
  for(let frame=0;frame<=Math.ceil(clip.duration*60);frame++) {
    const time=Math.min(frame/60,clip.duration);action.time=time;skinMixer.update(0);gltf.scene.updateMatrixWorld(true);
    const label=`${clip.name} at ${time.toFixed(3)}s`;checkArmPose(armBones,previous,label);
    if(frame%6===0||frame===Math.ceil(clip.duration*60))checkArmSurface(label);
    if(clip.name.startsWith('Bed')) {
      assert(gltf.scene.getObjectByName('Head').quaternion.angleTo(identity)<.7,`${label}: head lift is shared with the body rather than sharply bending the head`);
      assert(gltf.scene.getObjectByName('Neck').quaternion.angleTo(identity)<.4,`${label}: neck bend stays limited`);
    }
    if(clip.name==='Block'&&time>=.3&&time<=.84) {
      const hand=gltf.scene.getObjectByName('Hand_R');
      assert(palmDirection(hand,new THREE.Vector3(0,0,1)).z>.8,`${label}: the left palm faces outward`);
      assert(palmDirection(hand,new THREE.Vector3(0,-1,0)).y>.4,`${label}: the left fingers point upward toward the face`);
    }
    if(clip.name==='BedSearch'&&time>=1.1||clip.name==='BedReach'||clip.name==='BedRise'&&time===0)for(const side of ['L','R']) {
      assert(palmDirection(gltf.scene.getObjectByName(`Hand_${side}`),new THREE.Vector3(0,0,1)).y<-.8,`${label}: ${side} palm supports the body facing the floor`);
    }
  }
}
const originalFetch=globalThis.fetch,originalDocument=globalThis.document,originalProgress=globalThis.ProgressEvent;
let model;
try {
  globalThis.document={};globalThis.ProgressEvent??=class {constructor(type,fields){Object.assign(this,{type,...fields});}};globalThis.fetch=async()=>new Response(bytes);
  model=createNaiwaModel();assert(await model.ready);model.root.position.y=.15;
  const target={x:.3,y:.57,z:3},pose={state:'bed-search',actionTime:1.3,lookTarget:target};model.animate(0,pose);model.root.updateMatrixWorld(true);
  const head=model.skeleton.bones.find(bone=>bone.name==='Head'),position=head.getWorldPosition(new THREE.Vector3()),direction=new THREE.Vector3(0,0,1).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()));
  const neck=model.skeleton.bones.find(bone=>bone.name==='Neck');
  assert(head.quaternion.angleTo(identity)<.7&&neck.quaternion.angleTo(identity)<.4,'prone target tracking preserves the limited head and neck bends');
  assert(direction.z>.6&&direction.y<.08&&direction.y>-.8,'prone gaze points forward and slightly downward without forcing the whole head upright');
  assert(direction.dot(new THREE.Vector3(target.x,target.y,target.z).sub(position).normalize())>.7,'prone gaze remains directed toward the bed opening and player');
  const initial=head.quaternion.clone();for(let i=0;i<80;i++)model.animate(0,pose);assert(initial.angleTo(head.quaternion)<.0001,'target tracking does not accumulate rotations');model.reset();assert.equal(model.activeClip,'Idle');
  const runtimeArms=model.skeleton.bones.filter(bone=>/^(UpperArm|Forearm|Hand)_/.test(bone.name)),previous=new Map();
  for(let i=0;i<90;i++){model.animate(1/60,{speed:1.55,state:'chase',guardAmount:Math.min(1,i/18)});model.root.updateMatrixWorld(true);checkArmPose(runtimeArms,previous,`walking guard frame ${i}`);}
}finally{model?.dispose();globalThis.fetch=originalFetch;if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;if(originalProgress===undefined)delete globalThis.ProgressEvent;else globalThis.ProgressEvent=originalProgress;}
console.log('Awareness OK: visible flashlight clues without diverting an active player chase, real hiding searches and light obstruction; both main stairs chased up/down at 25/60/144 FPS; original 22-bone hierarchy plus two shoulder supports, repaired closed inner arms and new skin, actual arm-area distribution, continuous limited arm poses in clips and live walking guard, outward blocking palm, floor-facing supporting palms and limited prone gaze; distinct inventory drawings.');
