import * as THREE from 'three';
import {solveNaiwaLimb} from './frog-escape-naiwa-actions.js';
import {constrainNaiwaWrist} from './frog-escape-naiwa-pose.js';

// Pose reference: references/naiwa-nerd-stance-reference.png. Identity and skin
// stay in the original rig. Bake variants once so ordinary frames need no IK.
function applyStance(root,skeleton,speed){
  const bone=name=>skeleton.getBoneByName(name),chest=bone('Chest');
  const movement=THREE.MathUtils.smoothstep(speed,.05,2.6),depth=1-.35*movement;
  root.updateWorldMatrix(true,true);
  const feet=['L','R'].map(side=>{
    const foot=bone(`Foot_${side}`),position=root.worldToLocal(foot.getWorldPosition(new THREE.Vector3()));
    position.x+=(side==='L'?-1:1)*.1*depth;
    // A leading-foot shuffle, rather than adding a small offset to a normal
    // stride that would let the rear foot overtake the lead foot every cycle.
    position.z=(side==='R'?.28:-.22)+THREE.MathUtils.clamp((position.z-.0425)*.22,-.08,.08);
    const localOrientation=root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(foot.getWorldQuaternion(new THREE.Quaternion()));
    const angles=new THREE.Euler().setFromQuaternion(localOrientation);
    const orientation=root.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(angles.x,side==='L'?-1.1:0,angles.z)));
    return {side,foot,position:root.localToWorld(position),orientation};
  });
  bone('Hips').position.y-=.065*depth;bone('Hips').position.z-=.022*depth;
  bone('Hips').rotateY(-.36);bone('Spine').rotateX(.045);chest.rotateY(-.16);bone('Head').rotateY(.28);
  root.updateWorldMatrix(true,true);
  for(const {side,foot,position,orientation}of feet){
    const pole=root.localToWorld(new THREE.Vector3(side==='L'?-.75:.48,.65,side==='L'?.05:.65));
    solveNaiwaLimb(bone(`Thigh_${side}`),bone(`Shin_${side}`),foot,position,pole);
    foot.quaternion.copy(foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(orientation));
  }
  // Author a continuous shoulder/elbow hinge pose. An IK solution followed by
  // an independent forearm roll had twisted the actual elbow surface shut.
  bone('UpperArm_R').quaternion.setFromEuler(new THREE.Euler(.10,-.35,1.25));
  bone('Forearm_R').quaternion.setFromEuler(new THREE.Euler(0,0,1.60));
  bone('UpperArm_L').quaternion.setFromEuler(new THREE.Euler(-1.05,.9,-.12,'YXZ'));
  bone('Forearm_L').quaternion.setFromEuler(new THREE.Euler(-.8,0,-.12));
  bone('Hand_R').quaternion.identity();bone('Hand_L').quaternion.identity();
  for(const side of ['L','R']){
    const hand=bone(`Hand_${side}`);constrainNaiwaWrist(hand.quaternion,hand.position.clone().normalize());
    bone(`Shoulder_${side}`).quaternion.identity().slerp(bone(`UpperArm_${side}`).quaternion,.5);
  }
}

export function createNaiwaNerdClips(root,rig,originalClips){
  const skeleton=rig.getObjectByProperty('isSkinnedMesh',true).skeleton;
  const saved=skeleton.bones.map(bone=>({bone,position:bone.position.clone(),quaternion:bone.quaternion.clone(),scale:bone.scale.clone()})),result=[];
  try{
    for(const [name,speed]of [['Idle',0],['Walk',1.55],['Run',3.45]]){
      const original=originalClips.get(name),count=Math.ceil(original.duration*30)+1,times=Array.from({length:count},(_,i)=>i/(count-1)*original.duration);
      const channels=original.tracks.map(track=>{const split=track.name.lastIndexOf('.');return {track,bone:skeleton.getBoneByName(track.name.slice(0,split)),property:track.name.slice(split+1),sample:track.createInterpolant(),values:[]};});
      for(const time of times){
        for(const channel of channels)channel.bone[channel.property].fromArray(channel.sample.evaluate(time));
        applyStance(root,skeleton,speed);
        for(const channel of channels){
          const value=channel.bone[channel.property].toArray(),previous=channel.values.slice(-value.length);
          if(channel.property==='quaternion'&&previous.length&&value.reduce((sum,v,i)=>sum+v*previous[i],0)<0)for(let i=0;i<value.length;i++)value[i]=-value[i];
          channel.values.push(...value);
        }
      }
      result.push(new THREE.AnimationClip(`Nerd${name}`,original.duration,channels.map(({track,values})=>new track.constructor(track.name,times,values,track.getInterpolation()))));
    }
  }finally{
    for(const {bone,position,quaternion,scale}of saved){bone.position.copy(position);bone.quaternion.copy(quaternion);bone.scale.copy(scale);}root.updateWorldMatrix(true,true);
  }
  return result;
}

// Curl only the existing finger surface. The wrist and forearm retain their
// original size and vertices, so there is no detached replacement fist/seam.
export function createNaiwaNerdClench(rig){
  const skin=rig.getObjectByProperty('isSkinnedMesh',true),{geometry,skeleton}=skin;
  const hand=skeleton.bones.findIndex(bone=>bone.name==='Hand_L'),toHand=skeleton.boneInverses[hand].clone().multiply(skin.bindMatrix),fromHand=toHand.clone().invert();
  const source=geometry.attributes.position,joints=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight;
  const target=source.clone(),point=new THREE.Vector3();let changed=0;
  for(let i=0;i<source.count;i++){
    let influence=0;for(let channel=0;channel<4;channel++)if(joints.array[i*4+channel]===hand)influence+=weights.array[i*4+channel];
    if(influence<.9)continue;
    point.fromBufferAttribute(source,i).applyMatrix4(toHand);if(point.y>=-.020)continue;
    const distance=-.020-point.y,curl=THREE.MathUtils.smoothstep(distance,0,.02),angle=Math.min(1.7,distance/.032),thickness=(point.z-.056)*(1-.22*curl);
    point.x=.008+(point.x-.008)*(1+.1*curl);
    point.y=-.020-.032*Math.sin(angle)+thickness*Math.sin(angle);
    point.z=.056+.032*(1-Math.cos(angle))+thickness*Math.cos(angle);
    point.applyMatrix4(fromHand);target.setXYZ(i,point.x,point.y,point.z);changed++;
  }
  target.name='naiwa:right-hand-clench';
  // The GLB has no existing morphs; keep absolute targets and matching normals.
  const posed=geometry.clone();posed.setAttribute('position',target);posed.computeVertexNormals();
  geometry.morphAttributes.position=[target];geometry.morphAttributes.normal=[posed.attributes.normal.clone()];geometry.morphTargetsRelative=false;
  posed.dispose();skin.updateMorphTargets();skin.userData.nerdClenchVertices=changed;
  return {update(amount){skin.morphTargetInfluences[0]=THREE.MathUtils.clamp(amount,0,1);},reset(){skin.morphTargetInfluences[0]=0;}};
}

// Quaternion blends between a wide crouch and a running stride can put the
// soles below the floor even though each authored pose is planted. Eight real
// sole points give a small visual lift without changing navigation or running
// leg IK every frame. Dedicated falls/attacks retain their original positions.
export function createNaiwaNerdGrounding(root,rig){
  const skin=rig.getObjectByProperty('isSkinnedMesh',true),{skeleton}=skin;
  const position=skin.geometry.attributes.position,joints=skin.geometry.attributes.skinIndex,weights=skin.geometry.attributes.skinWeight;
  const contacts=[],point=new THREE.Vector3(),originY=rig.position.y;
  for(const side of ['L','R']){
    const foot=skeleton.getBoneByName(`Foot_${side}`),index=skeleton.bones.indexOf(foot),candidates=[];
    for(let i=0;i<position.count;i++)for(let channel=0;channel<4;channel++)if(joints.array[i*4+channel]===index&&weights.array[i*4+channel]>.999){
      candidates.push(new THREE.Vector3().fromBufferAttribute(position,i));break;
    }
    const bounds=new THREE.Box3().setFromPoints(candidates),center=bounds.getCenter(new THREE.Vector3());
    for(const x of [-1,1])for(const z of [-1,1]){
      const sole=candidates.filter(p=>(p.x-center.x)*x>=0&&(p.z-center.z)*z>=0).sort((a,b)=>a.y-b.y)[0];
      if(sole)contacts.push({foot,position:sole.clone().applyMatrix4(skin.bindMatrix).applyMatrix4(skeleton.boneInverses[index])});
    }
  }
  return {reset(){rig.position.y=originY;},update(amount,enabled){
    rig.position.y=originY;
    if(!enabled||amount<.001)return;
    root.updateWorldMatrix(true,true);let lowest=Infinity;
    for(const contact of contacts)lowest=Math.min(lowest,root.worldToLocal(point.copy(contact.position).applyMatrix4(contact.foot.matrixWorld)).y);
    rig.position.y+=THREE.MathUtils.clamp(-lowest,0,.08);
  }};
}
