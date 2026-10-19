import * as THREE from 'three';
import {playerHeight} from './frog-escape-navigation.js';
import {doorImpactLocked,setCastleDoorOpen} from './frog-escape-doors.js';

// A jam survives path refreshes: retrying the same A* route is not an escape.
export function createObstacleRecovery({actor,navigation,doors,interactables=[],onReplan=()=>{},onAction=()=>{}}) {
  let time=0,jam=0,episode=null,pressure=null,waypoint=null,retreatUntil=0,doorWait=null;
  let sample={x:actor.x,z:actor.z,time:0};
  const avoided=new Map(),point=new THREE.Vector3();
  const near=(solid,p,radius=.68)=>navigation.overlapsBox(p.x,actor.y,p.z,solid,radius,0,playerHeight(actor));
  function releasePressure() {
    if(pressure?.pressureActor===actor)pressure.pressureActor=null;
    pressure=null;
  }
  function nearby(next) {
    const dx=(next?.x??actor.x)-actor.x,dz=(next?.z??actor.z)-actor.z,length=Math.hypot(dx,dz);
    const ahead={x:actor.x+(length?dx/length*.65:0),z:actor.z+(length?dz/length*.65:0)};
    const candidates=[];
    for(const obstacle of [...doors,...interactables]) {
      if(obstacle.locked||doorImpactLocked(obstacle)||avoided.has(obstacle)||obstacle.kind==='fixture'&&!['cabinet','drawer','fridge'].includes(obstacle.fixtureKind))continue;
      const solids=obstacle.parts?obstacle.parts.map(part=>part.collider).filter(Boolean):obstacle.colliders;
      if(!solids?.some(solid=>near(solid,actor)||near(solid,ahead,.5)))continue;
      if(obstacle.anchor)obstacle.anchor.getWorldPosition(point);else point.set(obstacle.x,obstacle.y+1.1,obstacle.z);
      const distance=Math.hypot(actor.x-point.x,actor.z-point.z);
      if(distance>2.3||point.y<actor.y-.2||point.y>actor.y+playerHeight(actor)+.3)continue;
      if(!navigation.lineClear({x:actor.x,y:actor.y+1.1,z:actor.z},point,[actor.collider,...solids]))continue;
      candidates.push({obstacle,score:distance-(solids.some(solid=>near(solid,actor,.5))?1:0)});
    }
    return candidates.sort((a,b)=>a.score-b.score)[0]?.obstacle??null;
  }
  function walkable(target) {
    const count=Math.max(1,Math.ceil(Math.hypot(target.x-actor.x,target.z-actor.z)/.08));let y=actor.y;
    for(let i=1;i<=count;i++) {
      const x=actor.x+(target.x-actor.x)*i/count,z=actor.z+(target.z-actor.z)*i/count;
      const floor=navigation.support(x,z,y,.235,.4);
      if(!Number.isFinite(floor)||Math.abs(floor-y)>.25||navigation.blocked(x,floor,z,false,playerHeight(actor),.4,[actor.collider]))return null;
      y=floor;
    }
    return {...target,y};
  }
  function clearDoorSwing(door) {
    if(episode||doorWait||avoided.has(door)||doorImpactLocked(door)||door.amount>=.98)return;
    const dx=actor.x-door.x,dz=actor.z-door.z,across=dx*door.tangent[0]+dz*door.tangent[1];
    const out=(dx*door.normal[0]+dz*door.normal[1])*door.swing,reach=door.width/door.parts.length+.55;
    if(out<-.4||out>reach||Math.abs(across)>door.width/2+.4)return;
    const side=THREE.MathUtils.clamp(across,-Math.max(0,door.width/2-.5),Math.max(0,door.width/2-.5));
    const point=walkable({x:door.x+door.normal[0]*door.swing*reach+door.tangent[0]*side,z:door.z+door.normal[1]*door.swing*reach+door.tangent[1]*side});
    if(point){doorWait={door,point,started:time};setCastleDoorOpen(door,true,actor);}
  }
  function localExit(next) {
    let best=null,score=-Infinity;
    const dx=(next?.x??actor.x)-actor.x,dz=(next?.z??actor.z)-actor.z,length=Math.hypot(dx,dz)||1;
    for(let i=0;i<16;i++) {
      const angle=i*Math.PI/8,vx=Math.sin(angle),vz=Math.cos(angle);
      const point=walkable({x:actor.x+vx*.72,z:actor.z+vz*.72});if(!point)continue;
      const value=-(vx*dx+vz*dz)/length+.2*Math.abs(vx*dz-vz*dx)/length;
      if(value>score){score=value;best=point;}
    }
    return best;
  }
  function finish() {releasePressure();episode=null;jam=0;waypoint=null;onReplan();}
  function update(dt,{next=null,blocked=false}={}) {
    time+=dt;releasePressure();
    if(doorWait) {
      setCastleDoorOpen(doorWait.door,true,actor);
      if(doorWait.door.amount>=.98){doorWait=null;onReplan();}
      else if(time-doorWait.started<1.25){sample={x:actor.x,z:actor.z,time};return;}
      else {doorWait=null;jam=.55;onReplan();}
    }
    for(const [obstacle,entry] of avoided)if(entry.until<=time){avoided.delete(obstacle);onReplan();}
    if(waypoint&&(time>retreatUntil||Math.hypot(actor.x-waypoint.x,actor.z-waypoint.z)<.08))waypoint=null;
    jam=blocked?jam+dt:Math.max(0,jam-dt*2);
    if(time-sample.time>=.7) {
      // Catch a body sliding back and forth in the same corner as well.
      if(Math.hypot(actor.x-sample.x,actor.z-sample.z)<.09)jam+=.7;
      sample={x:actor.x,z:actor.z,time};
    }
    if(!episode&&jam>=.55) {
      const obstacle=nearby(next);
      episode={obstacle,started:time,toggleAt:time+1.05,x:actor.x,z:actor.z};
      if(obstacle){if(obstacle.parts)setCastleDoorOpen(obstacle,obstacle.amount<.4,actor);else {obstacle.open=obstacle.amount<.4;obstacle.noiseOwner=actor;}onAction({stage:'interact',obstacle});}
      else {waypoint=localExit(next);retreatUntil=time+.7;}
      onReplan();
    }
    if(!episode)return;
    const {obstacle}=episode;
    if(!blocked&&Math.hypot(actor.x-episode.x,actor.z-episode.z)>.8){finish();return;}
    if(time-episode.started>4.2) {
      if(obstacle) {
        let solids;
        if(obstacle.parts)solids=[{x:obstacle.x,z:obstacle.z,minY:obstacle.y,maxY:obstacle.y+obstacle.height,
          halfX:obstacle.width/2+.04,halfZ:.12,axisX:obstacle.tangent,axisZ:obstacle.normal}];
        else solids=obstacle.colliders.map(solid=>({...solid,halfX:solid.halfX+.16,halfZ:solid.halfZ+.16}));
        avoided.set(obstacle,{until:time+14,solids});
      }
      onAction({stage:'reroute',obstacle});
      finish();waypoint=localExit(next);retreatUntil=time+.8;return;
    }
    if(!obstacle||doorImpactLocked(obstacle))return;
    if(obstacle.parts){pressure=obstacle;obstacle.pressureActor=actor;}
    if(time>=episode.toggleAt&&blocked) {
      // An open leaf or extended drawer can itself be the thing trapping Naiwa.
      // Keep pressing an opening door against the player; reverse for our own body.
      if(!obstacle.parts||obstacle.blockedBy?.includes(actor)||!obstacle.blocked&&!obstacle.pushing) {
        if(obstacle.parts)setCastleDoorOpen(obstacle,!obstacle.open,actor);else {obstacle.open=!obstacle.open;obstacle.noiseOwner=actor;}onAction({stage:'reverse',obstacle});onReplan();
      }
      if(obstacle.blockedBy?.includes(actor)){waypoint=localExit(next);retreatUntil=time+.65;}
      episode.toggleAt=time+1.05;
    }
  }
  function pause() {releasePressure();episode=null;jam=0;waypoint=null;doorWait=null;sample={x:actor.x,z:actor.z,time};}
  return {update,pause,reset(){pause();avoided.clear();time=0;sample={x:actor.x,z:actor.z,time:0};},
    isAvoided:obstacle=>avoided.has(obstacle),
    clearDoorSwing,
    get solids(){return [...avoided.values()].flatMap(entry=>entry.solids);},
    get waypoint(){return doorWait?.point??waypoint;},get activeObstacle(){return episode?.obstacle??null;},
  };
}
