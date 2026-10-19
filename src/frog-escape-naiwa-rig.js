import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import gaitData from '../assets/models/naiwa-h25-gait.json' with {type:'json'};
import {NAIWA_BLOCK,bedPullPose} from './frog-escape-naiwa-skills.js';
import {NAIWA_DEFENSE} from './frog-escape-naiwa-defense.js';
import {constrainNaiwaWrist} from './frog-escape-naiwa-pose.js';
import {applyNaiwaActionPose} from './frog-escape-naiwa-actions.js';
import {NAIWA_SLIP,createNaiwaSlipClip} from './frog-escape-naiwa-slip.js';
import {createNaiwaNerdClips,createNaiwaNerdGrounding,createNaiwaNerdClench} from './frog-escape-naiwa-nerd.js';
import {createNaiwaHandwalkFace} from './frog-escape-naiwa-face.js';
import {createNaiwaRightLegSupport} from './frog-escape-naiwa-leg-support.js';
import {rebuildNaiwaToes} from './frog-escape-naiwa-toes.js';
import {NAIWA_HANDWALK,handwalkClips,createNaiwaHandwalkClips,createNaiwaToeGrip,footGripAmount,applyNaiwaFootGuard,applyNaiwaFootReach} from './frog-escape-naiwa-handwalk.js';

const rigAssetUrl=new URL('../assets/models/naiwa-h25-rigged.glb',import.meta.url);
rigAssetUrl.searchParams.set('v',gaitData.revision);
const rigUrl=rigAssetUrl.href;
const repeatClips=new Set(['Idle','Walk','Run','Hit','NerdIdle','NerdWalk','NerdRun','HandIdle','HandWalk','HandRun','HandHit']);
const requiredClips=['Idle','Walk','Run','Grab','Hit','Down','Recover','Slam','Pull','Block','BedPull','BedSearch','BedReach','BedRise'];
const movementClips=new Set(['Walk','Run','NerdWalk','NerdRun','HandWalk','HandRun']);

function releaseResources(object) {
  const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
  object.traverse(child=>{
    if(child.geometry)geometries.add(child.geometry);
    for(const material of [child.material].flat().filter(Boolean)) {
      materials.add(material);
      for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
    }
    if(child.skeleton)skeletons.add(child.skeleton);
  });
  for(const geometry of geometries)geometry.dispose();
  for(const material of materials)material.dispose();
  for(const texture of textures)texture.dispose();
  for(const skeleton of skeletons)skeleton.dispose();
}

// Keep the existing synchronous model interface while the packaged GLB loads.
// Navigation owns root movement; all exported clips animate in place.
export function attachNaiwaRig(placeholder) {
  const {root}=placeholder,placeholderChildren=[...root.children];
  let disposed=false,rig=null,mixer=null,currentAction=null,currentClip=null;
  let last={speed:0,state:'patrol',stun:0};
  const actions=new Map();
  let lookBones=[];
  let guardBones=[],eyeBones=[];
  let shoulderSupports=[],wrists=[];
  const actionBases=new Map();
  const eyeBases=new Map();
  const placeholderEyes=[];root.traverse(object=>{if(object.name==='naiwa:green-eye')placeholderEyes.push(object);});
  let rightFist=null,nerdGrounding=null,nerdClench=null,toeGrip=null,supportFace=null,rightLegSupport=null,toeModel=null;
  root.userData.height=2.1;
  root.userData.modelAsset='naiwa-h25-rigged.glb';
  root.userData.modelRevision=gaitData.revision;
  root.userData.assetStatus='loading';
  root.userData.blockAnimation={...NAIWA_BLOCK,clip:'Block',anatomicalLeftHand:'Hand_R',aiEnabled:true};
  root.userData.handwalkAnimation={reference:'references/naiwa-handwalk-reference.png',anatomicalLeftFoot:'Foot_R'};

  function play(name,fade=.18) {
    if(name===currentClip)return;
    const next=actions.get(name);
    if(!next)return;
    const previous=currentAction;
    const preservePhase=previous&&movementClips.has(currentClip)&&movementClips.has(name);
    const phase=preservePhase?(previous.time/previous.getClip().duration)%1:0;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if(preservePhase)next.time=phase*next.getClip().duration;
    if(previous&&movementClips.has(currentClip)&&['Idle','NerdIdle','HandIdle'].includes(name))previous.setEffectiveTimeScale(0);
    next.stopFading();
    if(previous&&fade>0){previous.fadeOut(fade);next.fadeIn(fade);}
    currentAction=next;currentClip=name;root.userData.animation=name;
  }

  function animate(dt,{speed=0,state='patrol',stun=0,lookYaw=0,lookPitch=0,lookTarget=null,actionTime=0,variant=null,guardAmount=0,lightAmount=0,reachTargets=null,reachAmount=0,bodyLean=0,kickAmount=0,slipElapsed=null,intelligent=false,handWalking=false}={}) {
    if(disposed)return;
    dt=Number.isFinite(dt)?THREE.MathUtils.clamp(dt,0,.1):0;
    speed=Number.isFinite(speed)?Math.max(0,speed):0;
    const inspecting=['bed-search','bed-reach','bed-rise'].includes(state);
    guardAmount=inspecting||['down','caught'].includes(state)?0:THREE.MathUtils.clamp(guardAmount,0,1);
    lightAmount=inspecting||['down','caught'].includes(state)?0:THREE.MathUtils.clamp(lightAmount,0,1);
    root.userData.guardAmount=guardAmount;
    root.userData.lightAmount=lightAmount;
    last={speed,state,stun,lookYaw,lookPitch,lookTarget,actionTime,variant,guardAmount,lightAmount,reachTargets,reachAmount,bodyLean,kickAmount,slipElapsed,intelligent,handWalking};
    const handPose=handWalking&&!inspecting&&state!=='down';
    root.userData.height=handPose?NAIWA_HANDWALK.height:2.1;
    const recovering=state==='down'&&stun<=.8;
    const nerd=intelligent&&['patrol','chase','search'].includes(state)&&reachAmount<.01&&bodyLean<.01&&kickAmount<.01;
    let clip=nerd?'NerdIdle':'Idle';
    if(recovering)clip='Recover';
    else if(state==='down')clip=slipElapsed!==null&&slipElapsed<NAIWA_SLIP.duration?'Slip':'Down';
    else if(state==='stunned')clip='Hit';
    else if(state==='grab'||state==='caught')clip='Grab';
    else if(state==='slam')clip='Slam';
    else if(state==='pull')clip=variant==='bed'?'BedPull':'Pull';
    else if(state==='block')clip='Block';
    else if(state==='bed-search')clip='BedSearch';
    else if(state==='bed-reach')clip='BedReach';
    else if(state==='bed-rise')clip='BedRise';
    else if(speed>.06)clip=(nerd?'Nerd':'')+(speed>(currentClip==='Run'||currentClip==='NerdRun'?2.2:2.5)?'Run':'Walk');
    if(handPose){
      clip=state==='stunned'?'HandHit':state==='grab'||state==='caught'?'FootGrab':state==='slam'?'FootSlam':state==='pull'?(variant==='bed'?'FootBedPull':'FootPull'):state==='block'?'FootBlock':state==='kick'||kickAmount>.01?'FootKick':speed>.06?(speed>(currentClip==='HandRun'?2.2:2.5)?'HandRun':'HandWalk'):'HandIdle';
    }
    if(!mixer){root.userData.animation=clip;placeholder.animate(dt,last);return;}
    toeModel.setActive(handWalking);
    nerdGrounding.reset();
    const changed=clip!==currentClip;
    play(clip,recovering?.08:inspecting?.06:clip==='Down'?.1:.18);
    if(clip==='Slip')currentAction.time=Math.max(0,slipElapsed-dt);
    if(clip==='Down'&&changed&&slipElapsed!==null)currentAction.time=currentAction.getClip().duration;
    if(clip==='Recover'&&changed)currentAction.time=Math.max(0,.8-Math.max(0,stun));
    if(['Slam','Pull','Block','BedPull','BedSearch','BedReach','BedRise'].includes(clip))currentAction.time=Math.max(0,actionTime-dt);
    if(['FootSlam','FootPull','FootBedPull','FootBlock','FootKick'].includes(clip))currentAction.time=Math.max(0,actionTime-dt);
    if(movementClips.has(clip)) {
      // Use the forward scale, including the castle's narrower model depth.
      // Actual speed avoids a lagging step rate during acceleration and braking.
      const base=gaitData[clip.replace(/^(Nerd|Hand)/,'')].modelSpeed*rig.scale.z;
      currentAction.setEffectiveTimeScale(THREE.MathUtils.clamp(speed/base,.08,4));
    }
    for(const [bone,base]of actionBases){bone.position.copy(base.position);bone.quaternion.copy(base.quaternion);}actionBases.clear();
    for(const entry of lookBones)if(entry.base)entry.bone.quaternion.copy(entry.base);
    for(const entry of guardBones)if(entry.base)entry.bone.quaternion.copy(entry.base);
    for(const [bone,scale] of eyeBases)bone.scale.copy(scale);
    mixer.update(dt);
    const nerdWeight=['NerdIdle','NerdWalk','NerdRun'].reduce((sum,name)=>{const action=actions.get(name);return sum+(action?.isScheduled()?action.getEffectiveWeight():0);},0);
    root.userData.nerdStanceAmount=THREE.MathUtils.clamp(nerdWeight,0,1);
    nerdClench.update(nerdWeight);
    const supportWeight=THREE.MathUtils.clamp(handwalkClips.reduce((sum,name)=>{const action=actions.get(name);return sum+(action?.isScheduled()?action.getEffectiveWeight():0);},0),0,1);
    root.userData.handwalkAmount=supportWeight;root.userData.actionLimb=handPose?'left-foot':'hands';
    supportFace.update(supportWeight);
    toeGrip.update(handPose?footGripAmount(state,actionTime,variant):0);
    // Apply only the upper-body guard pose. Walk/Run keep their leg cycle and
    // real speed while the left palm shields the face; no idle clip replaces them.
    for(const entry of guardBones) {
      entry.base??=new THREE.Quaternion();entry.base.copy(entry.bone.quaternion);
      if(guardAmount>0&&!handPose)entry.bone.quaternion.slerp(entry.target,guardAmount);
    }
    for(const entry of lookBones) {
      entry.base=entry.bone.quaternion.clone();
      if(!inspecting)entry.bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(lookPitch*entry.weight,(lookYaw+NAIWA_DEFENSE.lightHeadYaw*lightAmount)*entry.weight,0)));
    }
    if(inspecting&&lookTarget) {
      const head=lookBones.find(entry=>entry.bone.name==='Head')?.bone;
      if(head) {
        root.updateWorldMatrix(true,true);
        const origin=head.getWorldPosition(new THREE.Vector3());
        const direction=new THREE.Vector3(lookTarget.x,lookTarget.y,lookTarget.z).sub(origin).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
        const amount=state==='bed-search'?THREE.MathUtils.smoothstep(actionTime,.55,1.05):state==='bed-rise'?1-THREE.MathUtils.smoothstep(actionTime,0,.7):1;
        // Add small local gaze offsets to the authored supported pose. Replacing
        // the whole orientation with look-at used to roll/overextend the neck.
        const yaw=THREE.MathUtils.clamp(Math.atan2(direction.x,direction.z),-.24,.24)*amount;
        const pitch=THREE.MathUtils.clamp(-Math.atan2(direction.y,Math.hypot(direction.x,direction.z)),-.09,.12)*amount;
        for(const entry of lookBones)entry.bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch*entry.weight,yaw*entry.weight,0)));
      }
    }
    eyeBones.forEach((bone,i)=>{
      if(!eyeBases.has(bone))eyeBases.set(bone,new THREE.Vector3());eyeBases.get(bone).copy(bone.scale);
      bone.scale.y*=THREE.MathUtils.lerp(1,i===0?NAIWA_DEFENSE.rightEyeOpen:NAIWA_DEFENSE.leftEyeOpen,lightAmount);
    });
    if(!handPose&&(reachAmount>0||bodyLean>0||kickAmount>0)) {
      const skeleton=rig.getObjectByProperty('isSkinnedMesh',true).skeleton;
      for(const bone of skeleton.bones)actionBases.set(bone,{position:bone.position.clone(),quaternion:bone.quaternion.clone()});
      applyNaiwaActionPose(root,skeleton,{reachTargets:reachTargets??{},reachAmount,bodyLean,kickAmount});
    }
    if(handPose&&(guardAmount>0||state==='pull'&&reachAmount>0)){
      const skeleton=rig.getObjectByProperty('isSkinnedMesh',true).skeleton;
      for(const bone of skeleton.bones)actionBases.set(bone,{position:bone.position.clone(),quaternion:bone.quaternion.clone()});
      if(state==='pull')applyNaiwaFootReach(root,skeleton,reachTargets?.R,reachAmount);
      else applyNaiwaFootGuard(root,skeleton,guardAmount);
    }
    for(const {bone,axis}of wrists)constrainNaiwaWrist(bone.quaternion,axis,{swing:THREE.MathUtils.lerp(.35,NAIWA_HANDWALK.wristSwing,supportWeight),twist:THREE.MathUtils.lerp(.175,.35,supportWeight)});
    for(const {bone,upper}of shoulderSupports)bone.quaternion.identity().slerp(upper.quaternion,.5);
    nerdGrounding.update(nerdWeight,['patrol','chase','search'].includes(state)&&reachAmount<.01&&bodyLean<.01&&kickAmount<.01);
    rightLegSupport.update(supportWeight);
    const handTime=variant==='bed'?bedPullPose(actionTime).actionTime:actionTime;
    if(rightFist)rightFist.visible=!handPose&&(state==='slam'&&actionTime>.08&&actionTime<1.13||state==='pull'&&handTime>.42&&handTime<1.06);
  }

  function reset() {
    if(disposed)return;
    last={speed:0,state:'patrol',stun:0};
    root.userData.guardAmount=0;
    root.userData.lightAmount=0;
    root.userData.nerdStanceAmount=0;
    root.userData.handwalkAmount=0;
    root.userData.height=2.1;root.userData.actionLimb='hands';
    nerdGrounding?.reset();
    nerdClench?.reset();
    toeGrip?.reset();
    supportFace?.reset();
    toeModel?.setActive(false);
    if(rightFist)rightFist.visible=false;
    for(const [bone,base]of actionBases){bone.position.copy(base.position);bone.quaternion.copy(base.quaternion);}actionBases.clear();
    for(const entry of lookBones)if(entry.base){entry.bone.quaternion.copy(entry.base);entry.base=null;}
    for(const entry of guardBones)if(entry.base){entry.bone.quaternion.copy(entry.base);entry.base=null;}
    for(const [bone,scale] of eyeBases)bone.scale.copy(scale);eyeBases.clear();
    if(mixer){mixer.stopAllAction();currentAction=null;currentClip=null;play('Idle',0);mixer.update(0);rightLegSupport?.reset();}
    else {root.userData.animation='Idle';placeholder.animate(0,last);}
  }

  const ready=typeof document==='undefined'?Promise.resolve(false):new GLTFLoader().loadAsync(rigUrl).then(gltf=>{
    if(disposed){releaseResources(gltf.scene);return false;}
    const byName=new Map(gltf.animations.map(clip=>[clip.name,clip]));
    if(requiredClips.some(name=>!byName.has(name))) {
      releaseResources(gltf.scene);throw new Error('Naiwa rig is missing an animation clip');
    }
    rig=gltf.scene;
    // The one-unit mesh fits the existing 2.1m actor and the castle doorways.
    rig.scale.set(1.8,2.1,1.7);
    toeModel=rebuildNaiwaToes(rig);
    const leftHand=rig.getObjectByName('Hand_R');
    if(leftHand){const palm=new THREE.Object3D();palm.name='naiwa:left-palm';palm.position.set(0,-.035,.012);leftHand.add(palm);}
    const hand=rig.getObjectByName('Hand_L');
    if(hand) {
      rightFist=new THREE.Group();rightFist.name='naiwa:right-fist';rightFist.visible=false;hand.add(rightFist);
      const material=new THREE.MeshStandardMaterial({color:0x555347,roughness:.83});
      const fist=new THREE.Mesh(new THREE.SphereGeometry(.052,16,12),material);fist.position.set(0,-.04,.027);fist.scale.set(.9,1.5,1);rightFist.add(fist);
      const thumb=new THREE.Mesh(new THREE.SphereGeometry(.022,12,8),material);thumb.position.set(.035,-.035,.043);thumb.scale.y=1.5;rightFist.add(thumb);
    }
    rig.traverse(child=>{
      if(child.isMesh){child.castShadow=true;child.receiveShadow=true;child.frustumCulled=false;}
    });
    root.add(rig);rig.updateMatrixWorld(true);
    mixer=new THREE.AnimationMixer(rig);
    eyeBones=['Eye_L','Eye_R'].map(name=>rig.getObjectByName(name)).filter(Boolean);
    shoulderSupports=['L','R'].map(side=>({bone:rig.getObjectByName(`Shoulder_${side}`),upper:rig.getObjectByName(`UpperArm_${side}`)})).filter(entry=>entry.bone&&entry.upper);
    wrists=['L','R'].map(side=>rig.getObjectByName(`Hand_${side}`)).filter(Boolean).map(bone=>({bone,axis:bone.position.clone().normalize()}));
    guardBones=['Spine','Chest','Head','UpperArm_R','Forearm_R','Hand_R'].map(name=>{
      const bone=rig.getObjectByName(name),track=byName.get('Block').tracks.find(track=>track.name===`${name}.quaternion`);
      return bone&&track?{bone,target:new THREE.Quaternion().fromArray(track.createInterpolant().evaluate(.5)),base:null}:null;
    }).filter(Boolean);
    lookBones=[['Head',.78],['Neck',.22]].map(([name,weight])=>({bone:rig.getObjectByName(name),weight,base:null})).filter(entry=>entry.bone);
    byName.set('Slip',createNaiwaSlipClip(byName.get('Down')));
    const nerdClips=createNaiwaNerdClips(root,rig,byName);for(const clip of nerdClips)byName.set(clip.name,clip);
    const supportClips=createNaiwaHandwalkClips(root,rig,byName);for(const clip of supportClips)byName.set(clip.name,clip);
    nerdClench=createNaiwaNerdClench(rig);
    toeGrip=createNaiwaToeGrip(rig);
    supportFace=createNaiwaHandwalkFace(rig);
    // Both geometries keep the same three morph channels. The ordinary foot
    // remains the original mesh, including Nerd's original hand-clench morph.
    toeModel.setActive(false);
    nerdGrounding=createNaiwaNerdGrounding(root,rig);
    createNaiwaNerdClench(rig);createNaiwaToeGrip(rig);createNaiwaHandwalkFace(rig);
    toeModel.setActive(true);rig.getObjectByProperty('isSkinnedMesh',true).updateMorphTargets();
    rightLegSupport=createNaiwaRightLegSupport(rig);
    toeModel.syncWeights();
    for(const name of [...requiredClips,'Slip',...nerdClips.map(clip=>clip.name),...handwalkClips]) {
      const action=mixer.clipAction(byName.get(name));
      const repeat=repeatClips.has(name);
      action.setLoop(repeat?THREE.LoopRepeat:THREE.LoopOnce,repeat?Infinity:1);
      action.clampWhenFinished=!repeat;actions.set(name,action);
    }
    for(const child of placeholderChildren){root.remove(child);releaseResources(child);}
    placeholderChildren.length=0;
    root.userData.assetStatus='ready';
    root.userData.boneCount=rig.getObjectByProperty('isSkinnedMesh',true)?.skeleton.bones.length??0;
    root.userData.animations=[...requiredClips,'Slip',...nerdClips.map(clip=>clip.name),...handwalkClips];
    animate(0,last);
    return true;
  }).catch(error=>{
    if(!disposed){
      if(mixer){mixer.stopAllAction();if(rig)mixer.uncacheRoot(rig);}
      if(rig){toeModel?.dispose();rig.removeFromParent();releaseResources(rig);}
      actions.clear();mixer=null;rig=null;currentAction=null;currentClip=null;
      root.userData.assetStatus='fallback';console.warn('Naiwa model could not load; using the built-in character.',error);
    }
    return false;
  });
  if(typeof document==='undefined')root.userData.assetStatus='fallback';

  return {root,animate,reset,ready,
    getWaistPose(){
      root.updateMatrixWorld(true);
      const waist=rig?.getObjectByName('Spine')??placeholderChildren[0]??root;
      return {position:waist.localToWorld(new THREE.Vector3(...(rig?[.21,-.06,.14]:[.49,.96,.22]))),quaternion:waist.getWorldQuaternion(new THREE.Quaternion())};
    },
    getEyePositions(){root.updateMatrixWorld(true);return (rig?eyeBones:placeholderEyes).map(eye=>eye.getWorldPosition(new THREE.Vector3()));},
    getHandPositions(){root.updateMatrixWorld(true);return Object.fromEntries(['L','R'].map(side=>{
      const hand=rig?rig.getObjectByName(`Hand_${side}`):root.getObjectByName(side==='L'?'naiwa:right-hand':'naiwa:left-hand');
      return [side,hand.localToWorld(new THREE.Vector3(0,-.04,.02))];
    }));},
    getFootPositions(){root.updateMatrixWorld(true);return Object.fromEntries(['L','R'].map(side=>{
      const foot=rig?rig.getObjectByName(`Foot_${side}`):root.getObjectByName(side==='R'?'naiwa:left-foot':'naiwa:right-foot');
      return [side,foot?foot.localToWorld(new THREE.Vector3(0,-.02,.11)):root.getWorldPosition(new THREE.Vector3())];
    }));},
    get activeClip(){return currentClip??root.userData.animation;},
    get skeleton(){return rig?.getObjectByProperty('isSkinnedMesh',true)?.skeleton??null;},
    dispose(){
      if(disposed)return;disposed=true;
      if(mixer){mixer.stopAllAction();mixer.uncacheRoot(rig);}
      if(rig){toeModel?.dispose();rig.removeFromParent();releaseResources(rig);}
      for(const child of placeholderChildren){child.removeFromParent();releaseResources(child);}
      placeholderChildren.length=0;actions.clear();mixer=null;rig=null;
      root.userData.assetStatus='disposed';
    },
  };
}
