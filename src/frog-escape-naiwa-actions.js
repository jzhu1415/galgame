import * as THREE from 'three';

// Contact targets follow the actual moving handles, including reversed leaves.
export function fixtureHandTargets(obstacle,actor) {
  const point=object=>{object.updateWorldMatrix(true,false);return object.getWorldPosition(new THREE.Vector3());};
  const handles=obstacle.parts?obstacle.parts.map(part=>{
    const candidates=(part.handles??[]).map(point);return candidates.sort((a,b)=>a.distanceToSquared(actor)-b.distanceToSquared(actor))[0]??point(part.leaf);
  }):obstacle.motions.map(motion=>point(motion.handle??obstacle.anchor??motion.pivot));
  const across=p=>-(p.x-actor.x)*Math.cos(actor.yaw)+(p.z-actor.z)*Math.sin(actor.yaw);
  handles.sort((a,b)=>across(a)-across(b));
  if(handles.length>1)return {L:handles[0],R:handles.at(-1)};
  return handles.length?{[across(handles[0])<0?'L':'R']:handles[0]}:{};
}

// Solve in the shoulder parent's space so the castle's nonuniform model scale
// cannot skew the target or introduce a second wrist twist.
export function solveNaiwaLimb(upper,lower,end,target,pole,amount=1) {
  upper.parent.updateWorldMatrix(true,true);
  const start=upper.position.clone(),goal=upper.parent.worldToLocal(target.clone()),bend=upper.parent.worldToLocal(pole.clone()).sub(start);
  const first=lower.position.clone(),second=end.position.clone(),a=first.length(),b=second.length();
  const direction=goal.clone().sub(start),distance=THREE.MathUtils.clamp(direction.length(),Math.abs(a-b)+.0001,(a+b)*.995);
  if(direction.lengthSq()<1e-10)return;direction.normalize();
  bend.addScaledVector(direction,-bend.dot(direction));
  if(bend.lengthSq()<1e-8)bend.set(0,0,1).addScaledVector(direction,-direction.z);
  bend.normalize();
  const along=(a*a+distance*distance-b*b)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
  const elbow=direction.clone().multiplyScalar(along).addScaledVector(bend,height);
  const upperQ=new THREE.Quaternion().setFromUnitVectors(first.normalize(),elbow.clone().normalize());
  const lowerDirection=direction.clone().multiplyScalar(distance).sub(elbow).applyQuaternion(upperQ.clone().invert()).normalize();
  const lowerQ=new THREE.Quaternion().setFromUnitVectors(second.normalize(),lowerDirection);
  upper.quaternion.slerp(upperQ,amount);lower.quaternion.slerp(lowerQ,amount);upper.updateWorldMatrix(true,true);
}

export function applyNaiwaActionPose(root,skeleton,{reachTargets={},reachAmount=0,bodyLean=0,kickAmount=0}={}) {
  const bone=name=>skeleton.getBoneByName(name);
  const feet=['L','R'].map(side=>({side,foot:bone(`Foot_${side}`)}));
  root.updateWorldMatrix(true,true);
  feet.forEach(entry=>{entry.position=entry.foot.getWorldPosition(new THREE.Vector3());entry.orientation=entry.foot.getWorldQuaternion(new THREE.Quaternion());});
  if(bodyLean>0) {
    bone('Spine').rotateX(bodyLean*.72);bone('Chest').rotateX(bodyLean*.28);bone('Head').rotateX(-bodyLean*.35);
    bone('Hips').position.z+=bodyLean*.10;bone('Hips').position.y-=bodyLean*.025;
    root.updateWorldMatrix(true,true);
    for(const {side,foot,position,orientation} of feet) {
      const pole=root.localToWorld(new THREE.Vector3(side==='L'?-.25:.25,.7,.5));
      solveNaiwaLimb(bone(`Thigh_${side}`),bone(`Shin_${side}`),foot,position,pole);
      foot.quaternion.copy(foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(orientation));
    }
  }
  if(kickAmount>0) {
    bone('Thigh_L').rotateX(-1.05*kickAmount);bone('Shin_L').rotateX(.35*kickAmount);bone('Foot_L').rotateX(-.15*kickAmount);
    bone('Spine').rotateX(-.12*kickAmount);bone('UpperArm_R').rotateX(.2*kickAmount);
  }
  for(const side of ['L','R'])if(reachTargets[side]&&reachAmount>0) {
    const target=new THREE.Vector3().copy(reachTargets[side]),pole=root.localToWorld(new THREE.Vector3(side==='L'?-.75:.75,1.1,.55));
    solveNaiwaLimb(bone(`UpperArm_${side}`),bone(`Forearm_${side}`),bone(`Hand_${side}`),target,pole,reachAmount);
  }
}
