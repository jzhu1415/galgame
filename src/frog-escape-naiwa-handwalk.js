import * as THREE from 'three';
import {solveNaiwaLimb} from './frog-escape-naiwa-actions.js';
import {bedPullPose} from './frog-escape-naiwa-skills.js';
import {constrainNaiwaWrist} from './frog-escape-naiwa-pose.js';

export const NAIWA_HANDWALK=Object.freeze({height:1.65,eyeHeight:1.40,wristSwing:1.45});
export const handwalkClips=['HandIdle','HandWalk','HandRun','HandHit','FootGrab','FootSlam','FootPull','FootBedPull','FootBlock','FootKick'];
const smooth=(time,a,b)=>THREE.MathUtils.smoothstep(time,a,b);
const envelope=(time,a,b,c,d)=>smooth(time,a,b)*(1-smooth(time,c,d));
const point=new THREE.Vector3();

// Pronation belongs to the whole shoulder/elbow chain. Split it across both
// segments while preserving the solved elbow and wrist positions; putting the
// entire roll in one forearm used to pinch the elbow skin shut.
export function orientNaiwaSupportArm(upper,lower,hand,root){
  upper.updateWorldMatrix(true,true);
  // Use a fixed forward normal for the forearm frame. Projecting gravity here
  // becomes singular when an arm passes through vertical during a hand step.
  const frame=root?.getWorldQuaternion(new THREE.Quaternion())??new THREE.Quaternion();
  const forward=new THREE.Vector3(0,0,1).applyQuaternion(frame).applyQuaternion(upper.getWorldQuaternion(new THREE.Quaternion()).normalize().invert());
  const axis=hand.position.clone().normalize().applyQuaternion(lower.quaternion),normal=new THREE.Vector3(0,0,1).applyQuaternion(lower.quaternion);
  forward.addScaledVector(axis,-forward.dot(axis)).normalize();normal.addScaledVector(axis,-normal.dot(axis)).normalize();
  const angle=Math.atan2(axis.dot(normal.clone().cross(forward)),normal.dot(forward));
  const shoulderRoll=new THREE.Quaternion().setFromAxisAngle(lower.position.clone().normalize(),angle*.5);
  upper.quaternion.multiply(shoulderRoll);
  lower.quaternion.premultiply(shoulderRoll.clone().invert()).multiply(new THREE.Quaternion().setFromAxisAngle(hand.position.clone().normalize(),angle));
  upper.updateWorldMatrix(true,true);
  // Fingers point down; the heel of the palm stays above the ground. Use a
  // complete frame rather than rolling a flat palm onto its outer edge.
  const fingersDown=frame.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.25));
  hand.quaternion.copy(lower.getWorldQuaternion(new THREE.Quaternion()).normalize().invert().multiply(fingersDown));
  constrainNaiwaWrist(hand.quaternion,hand.position.clone().normalize(),{swing:NAIWA_HANDWALK.wristSwing,twist:.35});
}

export function handwalkFootMotion(name,time){
  const t=name==='FootBedPull'?bedPullPose(time).actionTime:time;
  let lift=0,forward=0,reach=0,turn=0;
  if(name==='FootSlam'){
    lift=.25*envelope(t,0,.4,.48,.67)-.66*envelope(t,.48,.68,.74,1.26);
    forward=.17*envelope(t,.43,.68,.79,1.28);
  }else if(name==='FootPull'||name==='FootBedPull'||name==='FootGrab'){
    reach=name==='FootGrab'?smooth(t,0,.3):envelope(t,0,.43,.86,1.2);
    forward=.26*reach;lift=-.1*reach;turn=.95*reach;
  }else if(name==='FootBlock')lift=.23*envelope(t,0,.16,.28,.48);
  else if(name==='FootKick')lift=.2*envelope(t,0,.12,.16,.25)-.59*envelope(t,.16,.28,.32,.5);
  return {lift,forward,reach,turn};
}

function supportStep(time,duration,side,running){
  const phase=(time/duration+(side==='L'?.5:0))%1,stance=running?.46:.62,stride=(running?.41:.344)*1.7;
  if(phase<stance)return {z:stride*(.5-phase/stance),lift:0};
  const t=(phase-stance)/(1-stance);return {z:stride*(-.5+smooth(t,0,1)),lift:(running?.14:.1)*Math.sin(Math.PI*t)};
}

// Use the supplied hand-walking reference only for this pose. Bind geometry,
// colors and all original clips remain intact. Variants are baked once at load.
function pose(root,skeleton,name,time,duration,contacts){
  const bone=name=>skeleton.getBoneByName(name),motion=handwalkFootMotion(name,time);
  const moving=name==='HandWalk'||name==='HandRun';
  bone('Hips').position.y-=.245;bone('Hips').position.z+=.13*motion.reach;
  bone('Spine').quaternion.identity();bone('Spine').scale.set(1,1,1);bone('Chest').quaternion.identity();
  bone('Hips').quaternion.identity();bone('Neck').quaternion.identity();bone('Head').quaternion.identity();
  // Incline the whole trunk rather than rounding the upper back or stretching
  // the neck. The head stays close to the shoulder line and looks ahead.
  bone('Hips').rotateX(.20);bone('Spine').rotateX(.12);bone('Chest').rotateX(.025);
  bone('Thigh_L').position.y-=.02;
  bone('Neck').rotateX(-.105);bone('Head').rotateX(-.24);
  bone('Neck').position.z+=.006;
  for(const side of ['L','R']){
    const eye=bone(`Eye_${side}`);eye.scale.y*=side==='L'?.86:.82;
    eye.rotateX(.07);eye.rotateY(side==='L'?-.045:.045);
  }
  if(name==='HandHit'){const rock=Math.sin(time/duration*Math.PI*6);bone('Hips').rotateZ(rock*.085);bone('Hips').position.x+=rock*.012;}
  for(const side of ['L','R']){
    bone(`Forearm_${side}`).position.multiplyScalar(1.42);bone(`Hand_${side}`).position.multiplyScalar(1.42);
    // Preserve the rounded arm volume under the supporting elbow bend.
    bone(`UpperArm_${side}`).scale.set(1.12,1,1.12);bone(`Forearm_${side}`).scale.set(1.12,1,1.12);
    if(side==='R'){bone(`Shin_${side}`).position.multiplyScalar(2.8+.35*motion.reach);bone(`Foot_${side}`).position.multiplyScalar(2.2+.3*motion.reach);}
    bone(`Hand_${side}`).scale.set(1,1,1);
  }
  root.updateWorldMatrix(true,true);
  for(const side of ['L','R']){
    const step=moving?supportStep(time,duration,side,name==='HandRun'):{z:0,lift:0};
    const localTarget=new THREE.Vector3(side==='L'?-.22:.18,.20+step.lift,.36+step.z);
    const pole=root.localToWorld(new THREE.Vector3(side==='L'?-.3:.3,.45,.65));
    for(let pass=0;pass<3;pass++){
      solveNaiwaLimb(bone(`UpperArm_${side}`),bone(`Forearm_${side}`),bone(`Hand_${side}`),root.localToWorld(localTarget.clone()),pole);
      const hand=bone(`Hand_${side}`);orientNaiwaSupportArm(bone(`UpperArm_${side}`),bone(`Forearm_${side}`),hand,root);
      root.updateWorldMatrix(true,true);let lowest=Infinity;
      for(const p of contacts[side])lowest=Math.min(lowest,root.worldToLocal(point.copy(p).applyMatrix4(hand.matrixWorld)).y);
      if(pass<2)localTarget.y+=step.lift+.004-lowest;
    }
    bone(`Shoulder_${side}`).quaternion.identity().slerp(bone(`UpperArm_${side}`).quaternion,.5);
  }
  root.updateWorldMatrix(true,true);
  for(const side of ['L','R']){
    const left=side==='R',shift=left?0:.221*motion.reach,target=root.localToWorld(new THREE.Vector3(left?.30:.02,left?1.40+motion.lift:.82,left?.60+motion.forward:.75+shift));
    const pole=root.localToWorld(new THREE.Vector3(left?.95:-.50,left?.55:1.04,left?.35:.37+shift));
    if(!left){
      const parent=bone('Thigh_L').parent,knee=parent.worldToLocal(pole.clone()),end=parent.worldToLocal(target.clone());
      bone('Shin_L').position.set(0,-knee.distanceTo(bone('Thigh_L').position),0);
      bone('Foot_L').position.set(0,-knee.distanceTo(end),0);
    }
    solveNaiwaLimb(bone(`Thigh_${side}`),bone(`Shin_${side}`),bone(`Foot_${side}`),target,pole);
    const orientation=root.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromEuler(left?new THREE.Euler(-Math.PI/2+motion.turn,0,0):new THREE.Euler(0,0,Math.PI/2)));
    bone(`Foot_${side}`).quaternion.copy(bone(`Shin_${side}`).getWorldQuaternion(new THREE.Quaternion()).invert().multiply(orientation)).normalize();
    bone(`Toe_${side}`).quaternion.setFromEuler(new THREE.Euler(left?.2*motion.reach:0,0,0));
  }
}

export function createNaiwaHandwalkClips(root,rig,originalClips){
  const skeleton=rig.getObjectByProperty('isSkinnedMesh',true).skeleton;
  const saved=skeleton.bones.map(bone=>({bone,position:bone.position.clone(),quaternion:bone.quaternion.clone(),scale:bone.scale.clone()}));
  const idle=originalClips.get('Idle'),samplers=idle.tracks.map(track=>{const split=track.name.lastIndexOf('.');return {bone:skeleton.getBoneByName(track.name.slice(0,split)),property:track.name.slice(split+1),sample:track.createInterpolant()};});
  const result=[];
  const skin=rig.getObjectByProperty('isSkinnedMesh',true),contacts={};
  for(const side of ['L','R']){
    const index=skeleton.bones.indexOf(skeleton.getBoneByName(`Hand_${side}`)),candidates=[];
    const p=skin.geometry.attributes.position,j=skin.geometry.attributes.skinIndex,w=skin.geometry.attributes.skinWeight;
    for(let i=0;i<p.count;i++)for(let c=0;c<4;c++)if(j.array[i*4+c]===index&&w.array[i*4+c]>.999){candidates.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(skin.bindMatrix).applyMatrix4(skeleton.boneInverses[index]));break;}
    contacts[side]=[];
    for(const x of [-1,0,1])for(const y of [-1,0,1])for(const z of [-1,0,1])if(x||y||z){const direction=new THREE.Vector3(x,y,z);contacts[side].push(candidates.reduce((a,b)=>a.dot(direction)>b.dot(direction)?a:b));}
  }
  try{
    for(const name of handwalkClips){
      const base=name==='HandWalk'?'Walk':name==='HandRun'?'Run':name==='FootBedPull'?'BedPull':name==='FootSlam'?'Slam':name==='FootPull'?'Pull':name==='FootBlock'?'Block':null;
      const duration=base?originalClips.get(base).duration:name==='FootKick'?.9:name==='HandHit'?.8:idle.duration;
      const count=Math.ceil(duration*30)+1,times=Array.from({length:count},(_,i)=>duration*i/(count-1));
      const channels=saved.flatMap(({bone})=>['position','quaternion','scale'].map(property=>({bone,property,values:[]})));
      for(const time of times){
        for(const entry of saved)for(const property of ['position','quaternion','scale'])entry.bone[property].copy(entry[property]);
        for(const sample of samplers)sample.bone[sample.property].fromArray(sample.sample.evaluate(time/duration*idle.duration%idle.duration));
        pose(root,skeleton,name,time,duration,contacts);
        for(const channel of channels){
          const value=channel.bone[channel.property].toArray(),previous=channel.values.slice(-value.length);
          if(channel.property==='quaternion'&&previous.length&&value.reduce((sum,v,i)=>sum+v*previous[i],0)<0)for(let i=0;i<4;i++)value[i]=-value[i];
          channel.values.push(...value);
        }
      }
      result.push(new THREE.AnimationClip(name,duration,channels.map(({bone,property,values})=>new (property==='quaternion'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack)(`${bone.name}.${property}`,times,values))));
    }
  }finally{
    for(const entry of saved)for(const property of ['position','quaternion','scale'])entry.bone[property].copy(entry[property]);root.updateWorldMatrix(true,true);
  }
  return result;
}

export function applyNaiwaFootGuard(root,skeleton,amount){
  if(amount<=0)return;
  const thigh=skeleton.getBoneByName('Thigh_R'),shin=skeleton.getBoneByName('Shin_R'),foot=skeleton.getBoneByName('Foot_R');
  const target=root.localToWorld(new THREE.Vector3(.22,1.65,.42)),pole=root.localToWorld(new THREE.Vector3(.95,.7,.2));
  solveNaiwaLimb(thigh,shin,foot,target,pole,amount);
  const orientation=root.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)));
  foot.quaternion.slerp(shin.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(orientation).normalize(),amount);
}

export function applyNaiwaFootReach(root,skeleton,target,amount){
  if(!target||amount<=0)return;
  const thigh=skeleton.getBoneByName('Thigh_R'),shin=skeleton.getBoneByName('Shin_R'),foot=skeleton.getBoneByName('Foot_R');
  root.updateWorldMatrix(true,true);const orientation=foot.getWorldQuaternion(new THREE.Quaternion());
  const offset=foot.localToWorld(new THREE.Vector3(0,-.02,.11)).sub(foot.getWorldPosition(new THREE.Vector3()));
  const goal=new THREE.Vector3(target.x,target.y,target.z).sub(offset),pole=root.localToWorld(new THREE.Vector3(.95,.7,.2));
  solveNaiwaLimb(thigh,shin,foot,goal,pole,amount);
  foot.quaternion.copy(shin.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(orientation)).normalize();
}

export function createNaiwaToeGrip(rig){
  const skin=rig.getObjectByProperty('isSkinnedMesh',true),{geometry,skeleton}=skin;
  const footIndex=skeleton.bones.findIndex(bone=>bone.name==='Foot_R'),toeIndex=skeleton.bones.findIndex(bone=>bone.name==='Toe_R');
  const toFoot=skeleton.boneInverses[footIndex].clone().multiply(skin.bindMatrix),fromFoot=toFoot.clone().invert();
  const source=geometry.attributes.position,joints=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight,target=source.clone();
  for(let i=0;i<source.count;i++){
    let influence=0;for(let j=0;j<4;j++)if(joints.array[i*4+j]===footIndex||joints.array[i*4+j]===toeIndex)influence+=weights.array[i*4+j];
    if(influence<.9)continue;point.fromBufferAttribute(source,i).applyMatrix4(toFoot);
    const grip=smooth(point.z,.04,.09);if(!grip)continue;
    point.x*=1-.65*grip;point.z+=.026*grip;point.applyMatrix4(fromFoot);target.setXYZ(i,point.x,point.y,point.z);
  }
  target.name='naiwa:left-toe-grip';const normalGeometry=geometry.clone();normalGeometry.setAttribute('position',target);normalGeometry.computeVertexNormals();
  const index=geometry.morphAttributes.position.length;geometry.morphAttributes.position.push(target);geometry.morphAttributes.normal.push(normalGeometry.attributes.normal.clone());normalGeometry.dispose();skin.updateMorphTargets();
  return {update(amount){skin.morphTargetInfluences[index]=THREE.MathUtils.clamp(amount,0,1);},reset(){skin.morphTargetInfluences[index]=0;}};
}

export const footGripAmount=(state,time,variant)=>state==='grab'||state==='caught'?1:state==='pull'?envelope(variant==='bed'?bedPullPose(time).actionTime:time,.16,.4,.88,1.2):0;
