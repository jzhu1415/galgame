import * as THREE from 'three';

export const FENCE_CUT_SECONDS=2.5;
export const FENCE_SNIP_TIMES=Object.freeze([.78,1.58,FENCE_CUT_SECONDS]);

// Three deliberate squeezes, with a short approach into the first-person view.
export function cuttingPose(elapsed) {
  const t=THREE.MathUtils.clamp(elapsed,0,FENCE_CUT_SECONDS),raise=THREE.MathUtils.smoothstep(t,0,.26);
  const cycle=t<.78?t/.78:t<1.58?(t-.78)/.8:(t-1.58)/.92;
  const opening=Math.sin(Math.PI*THREE.MathUtils.clamp(cycle,0,1));
  const pressure=1-THREE.MathUtils.smoothstep(opening,0,.8);
  return {position:[.28-.20*raise,-.25+.09*raise-.012*pressure*raise,-.5-.16*raise],
    rotation:[.3+.28*raise,-.18+.11*raise,.08-.10*raise+.018*pressure*raise],scale:.8+.1*raise,opening:.32*opening*raise,pressure:pressure*raise};
}

export function poseBoltCutters(model,elapsed=null) {
  const rig=model.userData.cutterRig;if(!rig)return;
  const pose=elapsed===null?null:cuttingPose(elapsed);
  if(pose){model.position.fromArray(pose.position);model.rotation.set(...pose.rotation);model.scale.setScalar(pose.scale);}
  for(const {pivot,side} of rig.handles)pivot.rotation.y=side*(pose?.opening??0);
  for(const {pivot,side} of rig.jaws)pivot.rotation.y=-side*(pose?.opening??0)*.72;
}
