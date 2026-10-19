import {stairHeight} from './frog-escape-navigation.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

const ordinarySenses=Object.freeze({standingRange:11,crouchedRange:7.5,frontDot:.5,nearRange:2.1,hearingRange:14,occludedHearingRange:6,minLoudness:.18,noiseCooldown:1,memory:3,lightRange:13,lightInterval:.2});
const tangwangSenses=Object.freeze({standingRange:15,crouchedRange:10.5,frontDot:.26,nearRange:2.8,hearingRange:19,occludedHearingRange:8,minLoudness:.12,noiseCooldown:.55,memory:4.5,lightRange:17,lightInterval:.12});
export const transparentSenses=Object.freeze({...tangwangSenses,blind:true,smellRange:5,hearingRange:Infinity,occludedHearingRange:Infinity,minLoudness:0,noiseCooldown:0,memory:2,lightRange:0});
export const naiwaSenses=alertness=>alertness>=100?transparentSenses:alertness>=70?tangwangSenses:ordinarySenses;

export function inNaiwaView(actor,point,{lookYaw=0,range=11,strict=false,verticalAngle=1.05,frontDot=.5,nearRange=2.1}={}) {
  const dx=point.x-actor.x,dz=point.z-actor.z,horizontal=Math.hypot(dx,dz),dy=point.y-(actor.y+(actor.eyeHeight??1.93));
  if(Math.hypot(horizontal,dy)>range||Math.abs(Math.atan2(dy,Math.max(.1,horizontal)))>verticalAngle)return false;
  const gaze=actor.yaw+lookYaw;
  return horizontal<.01||!strict&&horizontal<=nearRange||(-Math.sin(gaze)*dx-Math.cos(gaze)*dz)/horizontal>=frontDot;
}

// Remember a landing only from an observed stair position and observed motion.
// No current position of an unseen player is needed to finish this route.
export function observedStairLanding(point,previous,actor,stairs,lastLanding=null) {
  const stair=stairs.find(s=>point.x>s.minX&&point.x<s.maxX&&point.z>=Math.min(s.startZ,s.endZ)&&point.z<=Math.max(s.startZ,s.endZ)&&Math.abs(stairHeight(s,point.z)-point.y)<.4);
  if(!stair)return null;
  const dy=previous?point.y-previous.y:0,dz=previous?point.z-previous.z:0;
  const up=Math.abs(dy)>.01?dy>0:Math.abs(dz)>.015?dz*(stair.endZ-stair.startZ)>0:point.y-actor.y>.3;
  if(Math.abs(dy)<=.01&&Math.abs(dz)<=.015&&Math.abs(point.y-actor.y)<=.3)return lastLanding;
  const direction=Math.sign(stair.endZ-stair.startZ);
  return {x:(stair.minX+stair.maxX)/2,y:up?stair.top:stair.bottom,z:up?stair.endZ+direction*.75:stair.startZ-direction*.75};
}

// Look for a visible lamp or a genuinely illuminated surface. Ray tests use the
// same walls, panels and floors as vision; a sealed cupboard cannot leak light.
export function flashlightEvidence(beam,actor,navigation,lookYaw=0,{range=13,frontDot=.5}={}) {
  if(!beam?.enabled||!beam.origin||!beam.direction)return null;
  const origin=beam.origin,length=Math.hypot(beam.direction.x,beam.direction.y,beam.direction.z);
  if(length<.001)return null;
  const forward={x:beam.direction.x/length,y:beam.direction.y/length,z:beam.direction.z/length};
  const eye={x:actor.x,y:actor.y+(actor.eyeHeight??1.93),z:actor.z},ignore=[actor.collider];
  const visible=point=>inNaiwaView(actor,point,{lookYaw,range,frontDot,strict:true,verticalAngle:1.32})&&navigation.lineClear(eye,point,ignore);
  const towardsEye=((eye.x-origin.x)*forward.x+(eye.y-origin.y)*forward.y+(eye.z-origin.z)*forward.z)/Math.max(.01,distance(eye,origin));
  if(towardsEye>.15&&visible(origin))return {position:{...origin},sourceVisible:true,sourceDistance:0};
  const rightLength=Math.hypot(forward.x,forward.z)||1,right={x:-forward.z/rightLength,y:0,z:forward.x/rightLength};
  const up={x:-right.z*forward.y,y:right.z*forward.x-right.x*forward.z,z:right.x*forward.y};
  const candidates=[];
  for(const [side,lift] of [[0,0],[0,-.22],[0,-.30],[0,.22],[-.24,-.16],[.24,-.16]]) {
    let ray={x:forward.x+right.x*side+up.x*lift,y:forward.y+up.y*lift,z:forward.z+right.z*side+up.z*lift};
    const size=Math.hypot(ray.x,ray.y,ray.z);ray={x:ray.x/size,y:ray.y/size,z:ray.z/size};
    const at=t=>({x:origin.x+ray.x*t,y:origin.y+ray.y*t,z:origin.z+ray.z*t});
    let near=0,far=Math.min(beam.range??20,18);
    if(navigation.lineClear(origin,at(far),ignore))continue;
    for(let i=0;i<11;i++){const middle=(near+far)/2;if(navigation.lineClear(origin,at(middle),ignore))near=middle;else far=middle;}
    if(near<.08)continue;
    const point=at(Math.max(.03,near-.035));
    if(visible(point))candidates.push({position:point,sourceVisible:false,sourceDistance:near});
  }
  // A nearby spill can reveal the opening it came through; a distant wall spot
  // provides only a place to investigate, not knowledge of a hidden player.
  return candidates.sort((a,b)=>a.sourceDistance-b.sourceDistance)[0]??null;
}
