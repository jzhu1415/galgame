export const NAIWA_DEFENSE=Object.freeze({blockChance:.25,tangwangBlockChance:.4,transparentBlockChance:.5,frontDot:.5,blockHold:.38,raiseTime:.12,lowerTime:.22,lightSpeedScale:.5,tangwangLightSpeedScale:.75,lightHeadYaw:-.14,rightEyeOpen:.15,leftEyeOpen:.5,lightCoreAngle:.18});

export function incomingFromFront(actor,{origin=null,velocity=null}={}) {
  const dx=velocity&&Math.hypot(velocity.x,velocity.z)>.01?-velocity.x:(origin?.x??actor.x)-actor.x;
  const dz=velocity&&Math.hypot(velocity.x,velocity.z)>.01?-velocity.z:(origin?.z??actor.z)-actor.z;
  const length=Math.hypot(dx,dz);
  return length>.001&&(-Math.sin(actor.yaw)*dx-Math.cos(actor.yaw)*dz)/length>=NAIWA_DEFENSE.frontDot;
}

export function flashlightHitsEyes(beam,actor,eyes,navigation,lookYaw=0) {
  if(!beam?.enabled||!beam.origin||!beam.direction)return false;
  const {origin,direction}=beam,length=Math.hypot(direction.x,direction.y,direction.z);
  if(length<.001)return false;
  const yaw=actor.yaw+lookYaw,dx=origin.x-actor.x,dz=origin.z-actor.z,horizontal=Math.hypot(dx,dz);
  // Light from behind the head does not shine into the eyes. The lifted hand
  // is intentionally ignored so shielding does not switch itself on and off.
  if(horizontal>.01&&(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/horizontal<.25)return false;
  if(eyes.length<2)return false;
  return eyes.every(eye=>{
    const x=eye.x-origin.x,y=eye.y-origin.y,z=eye.z-origin.z,distance=Math.hypot(x,y,z);
    if(distance<.05||distance>(beam.range??20))return false;
    const forward=(x*direction.x+y*direction.y+z*direction.z)/length;
    const miss=Math.sqrt(Math.max(0,distance*distance-forward*forward));
    const core=Math.min(NAIWA_DEFENSE.lightCoreAngle,(beam.angle??.48)*.4);
    return forward>0&&miss<=forward*Math.tan(core)
      &&navigation.lineClear(origin,eye,[actor.collider]);
  });
}
