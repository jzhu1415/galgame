import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createNaiwaModel} from '../src/frog-escape-naiwa-model.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createNavigation,createPlayer} from '../src/frog-escape-navigation.js';

const original={document:globalThis.document,fetch:globalThis.fetch,ProgressEvent:globalThis.ProgressEvent};
let model,npc,fallback;
try{
  globalThis.document={};globalThis.ProgressEvent??=class{constructor(type,fields){Object.assign(this,{type,...fields});}};
  globalThis.fetch=async()=>new Response(readFileSync('assets/models/naiwa-h25-rigged.glb'));
  model=createNaiwaModel();assert(await model.ready,'the actual packaged skin loads');
  const {root,skeleton}=model,skin=root.getObjectByProperty('isSkinnedMesh',true),bone=name=>skeleton.getBoneByName(name);
  const world=name=>bone(name).getWorldPosition(new THREE.Vector3());
  const direction=(name,axis)=>axis.clone().applyQuaternion(bone(name).getWorldQuaternion(new THREE.Quaternion()));
  const rest=skin.geometry.attributes.position,joints=skin.geometry.attributes.skinIndex,weights=skin.geometry.attributes.skinWeight;
  const soles=['L','R'].map(side=>{
    const joint=skeleton.bones.indexOf(bone(`Foot_${side}`)),indices=[];
    for(let i=0;i<rest.count;i++)for(let j=0;j<4;j++)if(joints.array[i*4+j]===joint&&weights.array[i*4+j]>.7){indices.push(i);break;}
    assert(indices.length>100,'measure the original skinned foot surface');return indices;
  });
  const soleHeights=()=>{root.updateMatrixWorld(true);skeleton.update();return soles.map(indices=>Math.min(...indices.map(i=>skin.localToWorld(skin.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(rest,i))).y)));};
  const settle=options=>{for(let i=0;i<30;i++)model.animate(1/60,options);root.updateMatrixWorld(true);};
  settle({state:'patrol'});
  const standingHip=world('Hips').y,standingWidth=world('Foot_L').distanceTo(world('Foot_R')),standingSoles=soleHeights();
  settle({state:'patrol',intelligent:true});
  assert.equal(model.activeClip,'NerdIdle');assert(root.userData.nerdStanceAmount>.999);
  assert(world('Hips').y<standingHip-.11,'the hips sit visibly lower');
  assert(direction('Chest',new THREE.Vector3(0,0,1)).x<-.35,'the torso turns toward the anatomical right');
  assert(world('Foot_L').distanceTo(world('Foot_R'))>standingWidth+.25,'the staggered stance has a stable base');
  assert(world('Foot_R').z-world('Foot_L').z>.35,'the anatomical left foot is in front of the right');
  assert(direction('Foot_R',new THREE.Vector3(0,0,1)).z>.95,'the left toes point forward');
  assert(direction('Foot_L',new THREE.Vector3(0,0,1)).x<-.65,'the rear right toes point toward the anatomical right');
  soleHeights().forEach((y,i)=>assert(Math.abs(y-standingSoles[i])<.006,'lowering the hips preserves planted soles'));
  assert(world('Hand_R').y>world('Chest').y+.15,'the anatomical left hand is raised');
  assert(world('Hand_R').z>.3,'the open left hand reaches forward');
  assert(direction('Hand_R',new THREE.Vector3(0,0,1)).z>.6,'the palm faces outward');
  assert(direction('Hand_R',new THREE.Vector3(0,-1,0)).y>.5,'the fingers point upward');
  const fist=world('Hand_L');
  assert(Math.abs(fist.x)<.5&&fist.y>world('Hips').y+.25&&fist.y<world('Chest').y&&fist.z>.3&&fist.z<.8,'the bent right arm points forward');
  assert(direction('Hand_L',new THREE.Vector3(0,-1,0)).z>.9,'the clenched right knuckles point forward');
  const upper=world('Forearm_L').sub(world('UpperArm_L')).normalize(),lower=fist.clone().sub(world('Forearm_L')).normalize();
  assert(upper.angleTo(lower)>.6,'the right elbow visibly bends instead of extending straight');
  assert(!root.getObjectByName('naiwa:right-fist').visible,'Nerd uses the real connected hand surface, without the extra fist cover');
  assert(skin.userData.nerdClenchVertices>200&&skin.morphTargetInfluences[0]>.99,'the existing fingers curl into a fist');
  assert(bone('Hand_L').scale.distanceTo(new THREE.Vector3(1,1,1))<1e-6,'the wrist/hand bone retains its original size');
  const handIndex=skeleton.bones.indexOf(bone('Hand_L')),toHand=skeleton.boneInverses[handIndex].clone().multiply(skin.bindMatrix),clench=skin.geometry.morphAttributes.position[0];let fingers=0;
  for(let i=0;i<rest.count;i++){
    const point=new THREE.Vector3().fromBufferAttribute(rest,i),delta=point.distanceTo(new THREE.Vector3().fromBufferAttribute(clench,i));
    if(delta<1e-8)continue;
    let influence=0;for(let j=0;j<4;j++)if(joints.array[i*4+j]===handIndex)influence+=weights.array[i*4+j];
    assert(influence>.9&&point.applyMatrix4(toHand).y<-.020,'only the existing right fingers change; the wrist, forearm and body seam stay untouched');fingers++;
  }
  assert.equal(fingers,skin.userData.nerdClenchVertices);
  const before=skeleton.bones.map(b=>b.quaternion.clone());
  for(let i=0;i<60;i++)model.animate(0,{state:'patrol',intelligent:true});
  skeleton.bones.forEach((b,i)=>assert(b.quaternion.clone().normalize().angleTo(before[i].normalize())<1e-6,`paused updates never accumulate ${b.name} rotations`));

  let lowest=Infinity,largestWrist=0,lowestAt;
  for(const fps of [30,60,144]){
    model.reset();
    // Check the real blended skin, including changing pace and alertness pose.
    for(let frame=0;frame<fps*4;frame++){
      const t=frame/fps,speed=t<1?0:t<2?1.55:t<3?3.45:0,intelligent=t>.2&&t<3.6;
      model.animate(1/fps,{state:'chase',speed,intelligent});
      const heights=soleHeights();if(Math.min(...heights)<lowest){lowest=Math.min(...heights);lowestAt={fps,t,clip:model.activeClip};}
      if(intelligent&&root.userData.nerdStanceAmount>.999){
        assert(world('Foot_R').z-world('Foot_L').z>.25,`the rear foot never overtakes the lead foot at ${fps} FPS/${t}`);
        assert(direction('Foot_L',new THREE.Vector3(0,0,1)).x<-.6,'the back foot remains turned right throughout the shuffle');
      }
      for(const side of ['L','R']){
        const wrist=bone(`Hand_${side}`).quaternion.angleTo(new THREE.Quaternion());largestWrist=Math.max(largestWrist,wrist);
        assert(wrist<.4,'neither wrist supplies a reversed-hand rotation');
      }
      if(t>1.3&&t<1.9)assert.equal(model.activeClip,'NerdWalk');
      if(t>2.3&&t<2.9)assert.equal(model.activeClip,'NerdRun');
    }
  }
  assert(lowest>-.02,`soles do not sink through the floor during motion/pose blends (${lowest.toFixed(4)}m, ${JSON.stringify(lowestAt)})`);
  let maximumKeyGap=0;
  root.rotation.y=.9;root.position.set(2,.15,-3);
  for(const intelligent of [false,true])for(const speed of [0,1.55,3.45]){
    model.reset();settle({state:'chase',intelligent,speed});
    for(let frame=0;frame<90;frame++){
      model.animate(1/60,{state:'chase',intelligent,speed});root.updateMatrixWorld(true);
      if(frame%15)continue;
      const anchor=model.getWaistPose().position,center=bone('Spine').localToWorld(new THREE.Vector3(0,-.06,0)),out=anchor.clone().sub(center).normalize();
      const torsoFace=face=>[face.a,face.b,face.c].every(i=>{let arm=0;for(let j=0;j<4;j++)if(/^(UpperArm|Forearm|Hand|Shoulder)_/.test(skeleton.bones[joints.array[i*4+j]].name))arm+=weights.array[i*4+j];return arm<.15;});
      skin.computeBoundingSphere();const hit=new THREE.Raycaster(anchor.clone().addScaledVector(out,.3),out.clone().negate()).intersectObject(skin).find(hit=>torsoFace(hit.face));
      assert(hit,'a real torso surface lies directly behind the waist attachment');const gap=hit.distance-.3;maximumKeyGap=Math.max(maximumKeyGap,gap);
      assert(gap>=0&&gap<.04,`the key stays within four centimetres of the animated body surface (${gap.toFixed(3)}m, Nerd=${intelligent}, speed=${speed})`);
      if(intelligent){const left=root.worldToLocal(world('Foot_R')),right=root.worldToLocal(world('Foot_L'));assert(left.z-right.z>.25,'the lead foot order follows the actor through turns');}
    }
  }
  root.rotation.y=0;root.position.set(0,0,0);
  for(const [state,clip]of [['slam','Slam'],['pull','Pull'],['block','Block'],['bed-search','BedSearch'],['bed-reach','BedReach'],['grab','Grab'],['stunned','Hit'],['down','Down']]){
    model.reset();settle({state:'patrol',intelligent:true});
    settle({state,intelligent:true,actionTime:.5,stun:3});assert.equal(model.activeClip,clip,'dedicated actions keep priority over the idle stance');
    assert(!root.getObjectByName('naiwa:right-fist').visible||['slam','pull'].includes(state));
  }
  for(const options of [{reachAmount:1,reachTargets:{R:new THREE.Vector3(.5,1.3,.6)}},{bodyLean:.5},{kickAmount:.5}]){
    model.reset();settle({state:'patrol',intelligent:true,...options});assert.equal(model.activeClip,'Idle','door reach and body actions use their full motion');
  }
  model.reset();assert.equal(model.activeClip,'Idle');assert.equal(root.userData.nerdStanceAmount,0);
  assert(!root.getObjectByName('naiwa:right-fist').visible);
  assert.equal(skin.morphTargetInfluences[0],0,'reset releases the real-hand clench');
  const scene=new THREE.Scene(),spawn={x:0,y:.15,z:0};
  npc=createNaiwaPursuer({scene,navigation:createNavigation({solids:[],stairs:[],boundary:[[-40,-40],[40,-40],[40,40],[-40,40]]}),
    player:{...createPlayer(),x:20,z:20,hidden:true},spawn,patrolRoute:[spawn],doors:[],difficulty:'hard',random:()=>.99,
    worldItems:{physics:{addActor:()=>({remove(){}}),syncActors(){}}}});
  assert(await npc.model.ready);npc.reset();
  for(let i=0;i<20;i++)npc.tick(1/60);assert.equal(npc.model.activeClip,'NerdIdle','Hard opening alertness really uses the stance');
  for(const [mode,expected]of [['normal','Idle'],['hacker','HandIdle'],['hard','NerdIdle']]){
    assert(npc.setDifficulty(mode,{restartOpening:true}));npc.reset();
    for(let i=0;i<20;i++)npc.tick(1/60);assert.equal(npc.model.activeClip,expected,'Fool and Transcendent do not inherit the Nerd pose');
  }
  while(npc.alertness<70){npc.hit({damage:.01});npc.reset({keepAlertness:true});}
  for(let i=0;i<20;i++)npc.tick(1/60);assert.equal(npc.model.activeClip,'HandIdle','Ninja exits the Nerd stance at 70 alertness');
  delete globalThis.document;fallback=createNaiwaModel();assert(!(await fallback.ready));
  for(let i=0;i<60;i++)fallback.animate(1/60,{state:'patrol',intelligent:true});
  fallback.root.updateMatrixWorld(true);
  for(const name of ['naiwa:left-hand','naiwa:right-hand'])assert(fallback.root.getObjectByName(name).getWorldPosition(new THREE.Vector3()).z>.35,'the unloaded-model fallback also reaches forward');
  assert(fallback.root.getObjectByName('naiwa:left-hand').getWorldPosition(new THREE.Vector3()).y>1.5);
  console.log(`Nerd stance OK: right-turned torso, persistent left-leading shuffle, right-facing rear toes, continuous elbow hinges and an actual curled right hand with unchanged wrist seam; 30/60/144 FPS, turns, phase/action priority, fallback and stable pause/reset. Lowest sole ${(lowest*100).toFixed(2)}cm; maximum wrist ${(largestWrist*180/Math.PI).toFixed(1)} degrees; waist surface gap at most ${(maximumKeyGap*100).toFixed(1)}cm.`);
}finally{
  model?.dispose();npc?.dispose();fallback?.dispose();for(const [key,value]of Object.entries(original))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
}
