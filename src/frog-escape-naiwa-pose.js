import * as THREE from 'three';

const identity=new THREE.Quaternion();
export const NAIWA_WRIST_LIMITS=Object.freeze({swing:.35,twist:.175});

export function constrainNaiwaWrist(quaternion,axis,limits=NAIWA_WRIST_LIMITS) {
  const q=quaternion.clone();if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);
  const projection=new THREE.Vector3(q.x,q.y,q.z).dot(axis);
  const twist=new THREE.Quaternion(axis.x*projection,axis.y*projection,axis.z*projection,q.w).normalize();
  const swing=q.clone().multiply(twist.clone().invert());
  const swingAngle=swing.angleTo(identity),twistAngle=2*Math.atan2(new THREE.Vector3(twist.x,twist.y,twist.z).dot(axis),twist.w);
  if(swingAngle<=limits.swing&&Math.abs(twistAngle)<=limits.twist)return;
  swing.slerpQuaternions(identity,swing,Math.min(1,limits.swing/Math.max(1e-8,swingAngle)));
  twist.setFromAxisAngle(axis,THREE.MathUtils.clamp(twistAngle,-limits.twist,limits.twist));
  quaternion.copy(swing.multiply(twist)).normalize();
}
