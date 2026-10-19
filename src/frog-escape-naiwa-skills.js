import {advancePlayer,playerHeight} from './frog-escape-navigation.js';
import {Vector3} from 'three';

export const NAIWA_SKILLS=Object.freeze({
  slam:Object.freeze({duration:1.28,impact:.68,cooldown:3,pushDistance:2.7,forceDuration:.54,initialSpeed:9,launchAngle:10}),
  pull:Object.freeze({duration:1.2,impact:.46,cooldown:3,pushDistance:1.2,forceDuration:.46,stopDistance:.74}),
});

export const NAIWA_BED_PULL=Object.freeze({duration:1.78,impact:.74,anticipation:.28,cooldown:3.4,pushDistance:2.5,forceDuration:.72,stopDistance:.72,retreatDistance:.9,range:2.45});

export function standingOnBed(player,beds,navigation) {
  if(player.hidden||player.hidingBed)return null;
  const support=playerSupportHeight(player,navigation);
  for(const bed of beds) {
    bed.root.updateWorldMatrix(true,false);
    const point=bed.root.worldToLocal(new Vector3(player.x,support,player.z));
    if(Math.abs(point.x)<=bed.width/2+.06&&Math.abs(point.z)<=1.12&&point.y>=.9&&point.y<=1.4)return bed;
  }
  return null;
}

export function bedPullPose(time) {
  const config=NAIWA_BED_PULL,elapsed=Math.max(0,time-config.anticipation),forceEnd=.46+config.forceDuration;
  const smooth=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
  const lean=smooth(0,config.anticipation,time)*(1-smooth(config.anticipation,.56,time));
  const actionTime=elapsed<=.46?elapsed:elapsed<=forceEnd?.46+(elapsed-.46)*.46/config.forceDuration:.92+(elapsed-forceEnd)*.28/(config.duration-config.anticipation-forceEnd);
  return {actionTime:Math.min(1.2,actionTime),lean};
}

// Complete standalone clip; live defense overlays its raised pose on locomotion.
export const NAIWA_BLOCK=Object.freeze({duration:1.2,raise:.4,holdEnd:.8});

export function blockPoseAmount(time) {
  const smooth=(start,end)=>{const t=Math.max(0,Math.min(1,(time-start)/(end-start)));return t*t*(3-2*t);};
  return smooth(0,NAIWA_BLOCK.raise)*(1-smooth(NAIWA_BLOCK.holdEnd,NAIWA_BLOCK.duration));
}

export function playerSupportHeight(player,navigation) {
  // A jump retains its takeoff surface until landing, including jumps from furniture.
  return player.grounded?player.y:player.jumpOriginY??navigation.support(player.x,player.z,player.y,0,player.radius??.27);
}

export function elevatedPlayerInReach(actor,player,navigation,range=1.5) {
  if(player.hidden||player.hidingBed)return false;
  const raised=playerSupportHeight(player,navigation)-actor.y,distance=Math.hypot(player.x-actor.x,player.z-actor.z);
  if(raised<.35||raised>1.55||player.y-actor.y>1.55||distance>range)return false;
  // Aim at the exposed torso above a bed/table; the furniture is not ignored.
  return navigation.lineClear({x:actor.x,y:actor.y+(actor.eyeHeight??1.9),z:actor.z},
    {x:player.x,y:player.y+Math.min(.85,playerHeight(player)*.7),z:player.z},[actor.collider]);
}

export function createSkillDisplacement(kind,actor,player,config=NAIWA_SKILLS[kind]) {
  const dx=player.x-actor.x,dz=player.z-actor.z,distance=Math.hypot(dx,dz);
  const direction=distance>.001?{x:dx/distance,z:dz/distance}:{x:-Math.sin(actor.yaw),z:-Math.cos(actor.yaw)};
  const speed=config.initialSpeed??config.pushDistance/config.forceDuration;
  if(kind==='slam') {
    player.fallStartY??=player.y;
    player.grounded=false;player.jumpOriginY=null;
    player.velocityY=speed*Math.tan(config.launchAngle*Math.PI/180);
  }
  return {kind,actor,config,remaining:config.pushDistance,elapsed:0,duration:config.forceDuration,
    speed,deceleration:kind==='slam'?2*(speed*config.forceDuration-config.pushDistance)/config.forceDuration**2:0,direction};
}

export function advanceSkillDisplacement(force,player,navigation,dt) {
  if(!force||player.hidden||player.hidingBed){delete player.skillControlScale;return false;}
  const config=force.config??NAIWA_SKILLS[force.kind],span=Math.max(0,Math.min(dt,force.duration-force.elapsed));
  const end=force.elapsed+span;
  // Integrate the fading horizontal impulse exactly, so distance is stable across frame rates.
  let distance=Math.min(force.remaining,Math.max(0,force.speed*span-force.deceleration*(end*end-force.elapsed*force.elapsed)/2)),direction=force.direction;
  if(force.kind==='pull') {
    const dx=force.actor.x-player.x,dz=force.actor.z-player.z,gap=Math.hypot(dx,dz);
    direction=gap>.001?{x:dx/gap,z:dz/gap}:{x:0,z:0};distance=Math.min(distance,Math.max(0,gap-config.stopDistance));
  }
  player.skillControlScale=.3;
  const before={x:player.x,z:player.z};
  // The explorer already integrates gravity. Apply only the swept horizontal force.
  advancePlayer(player,direction.x*distance,direction.z*distance,0,navigation,{forced:true});
  const moved=Math.hypot(player.x-before.x,player.z-before.z);
  force.remaining=Math.max(0,force.remaining-moved);force.elapsed=end;
  const active=force.elapsed<force.duration-.000001&&force.remaining>.00001&&!(distance>.002&&moved<distance*.05);
  if(!active)delete player.skillControlScale;
  return active;
}
