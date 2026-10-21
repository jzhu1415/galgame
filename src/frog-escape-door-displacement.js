import {advancePlayer} from './frog-escape-navigation.js';

// Both actors use the same fading impulse. Gravity remains in their ordinary
// movement tick; this only adds swept horizontal travel and a small launch.
export function createDoorDisplacement(actor,{door,direction,distance}){
  const duration=distance===4?.6:.5,speed=2*distance/duration;
  actor.fallStartY??=actor.y;actor.jumpOriginY=null;actor.grounded=false;actor.velocityY=Math.max(actor.velocityY??0,speed*Math.tan(Math.PI/18));
  return {door,direction,distance,duration,elapsed:0};
}
export function advanceDoorDisplacement(force,actor,navigation,dt){
  const from=force.elapsed,to=Math.min(force.duration,from+Math.max(0,dt));
  const travel=t=>force.distance*(2*t/force.duration-(t/force.duration)**2),distance=travel(to)-travel(from);
  const ignore=[...(force.door.parts?.map(part=>part.collider)??force.door.colliders??[]),actor.collider].filter(Boolean);
  const world={...navigation,blocked:(x,y,z,step,height,radius,extra=[])=>navigation.blocked(x,y,z,step,height,radius,[...ignore,...extra])};
  const x=actor.x,z=actor.z;
  advancePlayer(actor,force.direction.x*distance,force.direction.z*distance,0,world,{forced:true});
  force.elapsed=to;
  return to<force.duration-1e-8&&!(distance>.002&&Math.hypot(actor.x-x,actor.z-z)<distance*.05);
}
