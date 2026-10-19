import * as THREE from 'three';

export const CROWBAR_MELEE=Object.freeze({windup:.2,impact:.39,swingEnd:.58,duration:.92,interval:1.2});
const idle={position:[.3,-.46,-.65],rotation:[-.28,.08,.08]};
const frames=[
  {time:0,...idle},
  {time:CROWBAR_MELEE.windup,position:[.28,-.5,-.74],rotation:[.1,.04,.02]},
  {time:CROWBAR_MELEE.impact,position:[.3,-.44,-.64],rotation:[-1,-.1,.28]},
  {time:CROWBAR_MELEE.swingEnd,position:[.26,-.5,-.65],rotation:[-1.68,-.22,1.03]},
  {time:CROWBAR_MELEE.duration,...idle},
];

// World props stay centered for physics. Only the held copy pivots at the grip.
export function createCrowbarGrip(model) {
  const marker=model.getObjectByName('crowbar:grip');
  if(!marker)throw new Error('Crowbar model is missing its grip');
  model.updateMatrixWorld(true);
  const anchor=model.worldToLocal(marker.getWorldPosition(new THREE.Vector3()));
  const grip=new THREE.Group();grip.name='held:crowbar-grip';
  model.position.sub(anchor);grip.add(model);grip.scale.setScalar(.76);
  const head=model.getObjectByName('crowbar:head');model.updateMatrixWorld(true);
  const direction=head.getWorldPosition(new THREE.Vector3()).sub(marker.getWorldPosition(new THREE.Vector3()))
    .applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...idle.rotation)));
  // Camera-space roll preserves the old forward tilt while pointing at 1 o'clock.
  grip.userData.clockRoll=Math.atan2(direction.x,direction.y)-Math.PI/6;
  return grip;
}

export function poseCrowbar(grip,elapsed=null) {
  const time=elapsed===null?0:THREE.MathUtils.clamp(elapsed,0,CROWBAR_MELEE.duration);
  const index=Math.max(1,frames.findIndex(frame=>frame.time>=time));
  const a=frames[index-1],b=frames[index];
  const u=THREE.MathUtils.clamp((time-a.time)/(b.time-a.time),0,1),blend=u*u*(3-2*u);
  grip.position.fromArray(a.position.map((value,i)=>THREE.MathUtils.lerp(value,b.position[i],blend)));
  const rotation=frame=>{
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...frame.rotation));
    if(frame.time===0||frame.time===CROWBAR_MELEE.duration||frame.time===CROWBAR_MELEE.windup)
      q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),grip.userData.clockRoll??0));
    return q;
  };
  grip.quaternion.slerpQuaternions(rotation(a),rotation(b),blend);
  grip.userData.meleePhase=elapsed===null||time>=CROWBAR_MELEE.duration?'idle':time<CROWBAR_MELEE.windup?'windup':time<CROWBAR_MELEE.swingEnd?'swing':'recover';
}
