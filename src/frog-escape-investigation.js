import {Vector3} from 'three';

// Bounds follow the actual partitions, rather than the decorative room labels.
export function castleSearchRooms(groups) {
  const floors={basement:-5.05,ground:.15,upper:5.15,yard:-.7};
  const definitions={
    basement:[['cell',-8.9,-2.1,1.6,6.9,-1.5,3.7],['cellar',-2.1,8.9,1.6,6.9,1,1],['boiler',-8.9,-2.1,-6.9,1.6,-1.5,-2.4],['workshop',-2.1,8.9,-6.9,1.6,-2.7,-2.4]],
    ground:[['foyer',-8.9,0,.8,6.9,.7,3.7],['study',0,8.9,.8,6.9,-.7,3.7],['corridor',-8.9,0,-2.7,.8,-3.3,1.5],['dining',0,8.9,-2.7,.8,-.7,-1.2],['kitchen',-8.9,8.9,-6.9,-2.7,4,-2]],
    upper:[['bedroom',-8.9,-1.1,1.65,6.9,-.4,3.8],['guestroom',-8.9,-1.1,-1.9,1.65,-.4,-.7],['bathroom',2.5,6.3,-1.9,1.65,1.8,-.7],['upper-hall',-1.1,8.9,1.65,6.9,0,1],['stair-hall',-8.9,8.9,-6.9,-1.9,1,-1.2]],
    yard:[['shed',12.5,17.5,1.7,6.5,15,.9]],
  };
  return Object.entries(definitions).flatMap(([level,rows])=>rows.map(([id,minX,maxX,minZ,maxZ,exitX,exitZ])=>({
    id,level,floor:floors[level],minX:minX*groups[level].scale.x,maxX:maxX*groups[level].scale.x,minZ,maxZ,
    exit:{x:exitX*groups[level].scale.x,y:floors[level],z:exitZ},
  })));
}

export function roomContaining(rooms,point) {
  return rooms.find(room=>point.y>=room.floor-.35&&point.y<room.floor+2.5&&point.x>room.minX&&point.x<room.maxX&&point.z>room.minZ&&point.z<room.maxZ)??null;
}

export const BED_SEARCH={approach:2.65,lower:1.05,check:1.4,duration:2.15,reach:.85,catchAt:.66,rise:1.05};

export function chooseSearchKinds(alertness,random=Math.random) {
  const kinds=[];
  // These are independent draws, including when no furniture of a kind exists.
  if(alertness>=70||alertness>=30&&random()<.5)kinds.push('wardrobe');
  if(alertness>=70||alertness>=30&&random()<.5)kinds.push('bed');
  if(kinds.length===2&&random()<.5)kinds.reverse();
  return kinds;
}

export function createRoomInvestigation({rooms,beds,interactables,navigation,actor,player,random,onEvent=()=>{}}) {
  let visit=null,rememberedRoom=null;
  const position=root=>{root.updateWorldMatrix(true,false);return root.getWorldPosition(new Vector3());};
  const furniture={bed:beds,wardrobe:interactables.filter(action=>action.hideVolume)};
  const rootOf=(kind,target)=>kind==='bed'?target.root:target.hideVolume.root;
  const inRoom=(kind,target,room)=>roomContaining([room],position(rootOf(kind,target)))===room;
  const safe=point=>!navigation.blocked(point.x,point.y,point.z,0,2.1,.4,[actor.collider])&&Math.abs(navigation.support(point.x,point.z,point.y,.15,.4)-point.y)<.3;
  function approach(kind,target) {
    const root=rootOf(kind,target);root.updateWorldMatrix(true,false);
    // The foot of the bed leaves room for the head and right arm to reach under it.
    const local=kind==='bed'?new Vector3(0,0,-BED_SEARCH.approach):new Vector3(0,0,target.hideVolume.maxZ+1.18);
    const point=root.localToWorld(local),look=root.localToWorld(new Vector3(0,.1,0));
    return {x:point.x,y:point.y,z:point.z,yaw:Math.atan2(point.x-look.x,point.z-look.z)};
  }
  function begin(point,{exact=null,alertness=10,useMemory=false}={}) {
    const room=exact?roomContaining(rooms,position(rootOf(exact.kind,exact.target))):(useMemory?rememberedRoom:null)??roomContaining(rooms,point);
    if(!room)return false;
    const queue=[];
    if(exact)queue.push(exact);
    else {
      for(const [u,v] of [[.64,.45],[.32,.68],[.36,.3],[.7,.25],[.8,.7],[.2,.25],[.5,.15],[.85,.45],[.25,.85]]) {
        const p={x:room.minX+(room.maxX-room.minX)*u,y:room.floor,z:room.minZ+(room.maxZ-room.minZ)*v};
        if(safe(p)&&queue.every(task=>Math.hypot(task.point.x-p.x,task.point.z-p.z)>1.1))queue.push({kind:'look',point:p});
        if(queue.length===3)break;
      }
      for(const kind of chooseSearchKinds(alertness,random))for(const target of furniture[kind])if(inRoom(kind,target,room))queue.push({kind,target});
    }
    // Line up inside the doorway before crossing, clear of an open leaf.
    const inside={...room.exit};
    if(inside.x<room.minX)inside.x=room.minX+Math.min(1.7,(room.maxX-room.minX)/2);
    else if(inside.x>room.maxX)inside.x=room.maxX-Math.min(1.7,(room.maxX-room.minX)/2);
    else if(inside.z<room.minZ)inside.z=room.minZ+Math.min(1.7,(room.maxZ-room.minZ)/2);
    else if(inside.z>room.maxZ)inside.z=room.maxZ-Math.min(1.7,(room.maxZ-room.minZ)/2);
    if(safe(inside))queue.push({kind:'route',point:inside});
    queue.push({kind:'exit',point:room.exit});
    visit={room,queue,index:0,phase:'approach',elapsed:0,travel:0,exact:!!exact};
    onEvent({stage:'begin',room:room.id,exact:!!exact,checks:queue.filter(task=>task.target).map(task=>task.kind)});
    return true;
  }
  function next() {visit.index++;visit.phase='approach';visit.elapsed=0;visit.travel=0;}
  function tick(dt,move) {
    if(!visit)return null;
    const task=visit.queue[visit.index];
    if(!task){onEvent({stage:'end',room:visit.room.id});visit=null;rememberedRoom=null;return {finished:true};}
    const target=task.point??approach(task.kind,task.target);
    if(visit.phase==='approach') {
      visit.travel+=dt;
      if(Math.hypot(actor.x-target.x,actor.z-target.z)>.16||Math.abs(actor.y-target.y)>.3) {
        const speed=move(target,1.85,dt);
        if(visit.travel>22){onEvent({stage:'unreachable',kind:task.kind,position:{x:actor.x,y:actor.y,z:actor.z},destination:target});next();}
        return {state:'search',speed};
      }
      if(task.kind==='exit'||task.kind==='route'){next();return {state:'search',speed:0};}
      if(task.kind!=='look') {
        const turn=Math.atan2(Math.sin(target.yaw-actor.yaw),Math.cos(target.yaw-actor.yaw));
        actor.yaw+=Math.max(-dt*4,Math.min(dt*4,turn));
        if(Math.abs(turn)>.06)return {state:'search',speed:0};
      }
      visit.phase=task.kind==='bed'?'bed-search':task.kind==='wardrobe'?'cabinet-search':'look';visit.elapsed=0;
      onEvent({stage:'inspect',kind:task.kind,fixtureId:task.target?.id});
    }
    visit.elapsed+=dt;
    const elapsed=visit.elapsed,phase=visit.phase;
    if(phase==='look') {
      if(elapsed>1.25)next();
      return {state:'search',speed:0,look:true};
    }
    if(phase==='cabinet-search') {
      task.target.open=true;task.target.noiseOwner=actor;
      if(elapsed>.65&&task.target.amount>.65&&player.hidingWardrobe===task.target.id) {
        if(elapsed>8){next();return {state:'search',speed:0};}
        if(Math.hypot(actor.x-player.x,actor.z-player.z)<1.25)return {caught:true};
        const root=task.target.hideVolume.root,point=root.localToWorld(new Vector3(0,0,task.target.hideVolume.maxZ+.42));
        return {state:'cabinet-search',actionTime:elapsed,speed:move(point,1.1,dt)};
      }
      if(elapsed>2.1)next();
      return {state:'cabinet-search',actionTime:elapsed,speed:0};
    }
    if(phase==='bed-search') {
      if(elapsed>=BED_SEARCH.check&&player.hidingBed===task.target.id){visit.phase='bed-reach';visit.elapsed=0;onEvent({stage:'reach',kind:'bed',fixtureId:task.target.id});}
      else if(elapsed>=BED_SEARCH.duration){visit.phase='bed-rise';visit.elapsed=0;}
    }else if(phase==='bed-reach') {
      if(elapsed>=BED_SEARCH.catchAt&&player.hidingBed===task.target.id)return {caught:true};
      if(elapsed>=BED_SEARCH.reach){visit.phase='bed-rise';visit.elapsed=0;}
    }else if(phase==='bed-rise'&&elapsed>=BED_SEARCH.rise)next();
    return {state:phase,actionTime:elapsed,speed:0};
  }
  return {begin,tick,remember(point){rememberedRoom=roomContaining(rooms,point);},
    clear(){visit=null;rememberedRoom=null;},cancel(){visit=null;},
    get active(){return !!visit;},get exact(){return !!visit?.exact;},
    get room(){return visit?.room??null;},
    get lookTarget(){
      const task=visit?.queue[visit.index];
      if(task?.kind!=='bed'||!visit.phase.startsWith('bed-'))return null;
      return player.hidingBed===task.target.id?{x:player.x,y:player.y+.42,z:player.z}:task.target.root.localToWorld(new Vector3(0,.42,-.12));
    },
    get prone(){return !!visit&&(visit.phase==='bed-search'&&visit.elapsed>=.75||visit.phase==='bed-reach'||visit.phase==='bed-rise'&&visit.elapsed<.75);},
    get inspecting(){return !!visit&&['bed-search','bed-reach','bed-rise','cabinet-search'].includes(visit.phase);},
  };
}
