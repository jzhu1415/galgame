import * as THREE from 'three';

export const NAIWA_SLIP=Object.freeze({duration:.9,slideDuration:.72,distance:1.15});

// Integrate the decelerating slide analytically so its distance does not depend
// on frame rate. Navigation still resolves each small step against the world.
export function slipDistance(elapsed){
  const t=THREE.MathUtils.clamp(elapsed/NAIWA_SLIP.slideDuration,0,1);
  return NAIWA_SLIP.distance*(1-(1-t)**3);
}
export function slipPose(elapsed){
  return {
    fall:THREE.MathUtils.smoothstep(elapsed,.12,.78),
    kick:THREE.MathUtils.smoothstep(elapsed,0,.2)*(1-THREE.MathUtils.smoothstep(elapsed,.23,.68)),
  };
}

// Retain the authored body's final floor contact and arm shape. The feet shoot
// forward before the torso falls back, then settle into exactly the Down pose.
export function createNaiwaSlipClip(down){
  const samples=55,times=Array.from({length:samples},(_,i)=>i/(samples-1)*NAIWA_SLIP.duration);
  const tracks=down.tracks.map(track=>{
    const interpolant=track.createInterpolant(),size=track.getValueSize(),values=[];
    for(const elapsed of times){
      const {fall,kick}=slipPose(elapsed),value=Array.from(interpolant.evaluate(fall*down.duration));
      if(track.name.endsWith('.quaternion')){
        let angle=0;
        if(track.name==='Thigh_L.quaternion')angle=-.85*kick;
        if(track.name==='Thigh_R.quaternion')angle=-.47*kick;
        if(track.name==='Shin_L.quaternion')angle=.3*kick;
        if(track.name==='Shin_R.quaternion')angle=.48*kick;
        if(track.name.startsWith('UpperArm_'))angle=-.42*kick;
        if(angle)new THREE.Quaternion().fromArray(value).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),angle)).toArray(value);
      }
      values.push(...value.slice(0,size));
    }
    return new track.constructor(track.name,times,values,track.getInterpolation());
  });
  return new THREE.AnimationClip('Slip',NAIWA_SLIP.duration,tracks);
}
