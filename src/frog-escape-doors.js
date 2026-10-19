import * as THREE from 'three';
import {castleSurfaceUV} from './frog-escape-materials.js';
import {PLAYER_RADIUS,playerHeight} from './frog-escape-navigation.js';

// Work in metres even when the containing floor has a wider X scale.
export function createCastleDoor({parent,id,name,x,z,y,width,height=2.48,openingHeight=height+.17,rotation=0,double=false,swing=1,wallDepth=.18,materials}) {
  const root=new THREE.Group();root.name=`door:${id}`;root.position.set(x,y,z);root.scale.x=1/parent.scale.x;parent.add(root);
  const frame=new THREE.Group();frame.rotation.y=rotation;root.add(frame);
  const parts=[];
  function piece(group,px,py,pz,w,h,d,material,solid=false) {
    const geometry=new THREE.BoxGeometry(w,h,d);if(material.map)castleSurfaceUV(geometry);
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(px,py+h/2,pz);
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.solid=solid;if(solid&&group===frame)mesh.userData.doorFrame=state;group.add(mesh);return mesh;
  }
  const state={id,name,x:x*parent.scale.x,z,y,width,height,root,frame,open:false,amount:0,parts,
    tangent:[Math.cos(rotation),-Math.sin(rotation)],normal:[Math.sin(rotation),Math.cos(rotation)],swing};
  for(const side of [-1,1]) {
    piece(frame,side*(width/2+.045),0,0,.09,height,wallDepth+.014,materials.darkWood,true);
    for(const face of [-1,1]) {
      piece(frame,side*(width/2+.065),.012,face*(wallDepth/2+.04),.13,height+.028,.06,materials.wood);
    }
  }
  for(const face of [-1,1])piece(frame,0,height+.04,face*(wallDepth/2+.04),width+.26,.105,.06,materials.wood);
  piece(frame,0,height,0,width+.18,openingHeight-height,wallDepth+.014,materials.darkWood,true);
  const count=double?2:1,span=width/count;
  for(let index=0;index<count;index++) {
    const direction=index===0?1:-1,pivot=new THREE.Group();pivot.position.x=index===0?-width/2:width/2;frame.add(pivot);
    const leaf=piece(pivot,direction*span/2,.015,0,span-.022,height-.025,.14,materials.darkWood,true);
    leaf.name=`door-leaf:${id}:${index}`;leaf.userData.door=state;
    const handles=[];
    for(const face of [-1,1]) {
      for(const [bottom,panelHeight] of [[.22,height*.3],[height*.48,height*.36]]) {
        piece(pivot,direction*span/2,bottom,face*.083,span*.74,panelHeight,.022,materials.wood);
        for(const edge of [-1,1])piece(pivot,direction*span/2+edge*span*.385,bottom,face*.102,.035,panelHeight,.024,materials.gold);
        for(const py of [bottom-.025,bottom+panelHeight])piece(pivot,direction*span/2,py,face*.102,span*.8,.025,.024,materials.gold);
      }
      const handle=piece(pivot,direction*(span-.15),1.02,face*.12,.045,.22,.055,materials.gold);
      handle.name=`door-handle:${id}`;
      handles.push(handle);
    }
    if(double) {
      const knocker=new THREE.Mesh(new THREE.TorusGeometry(.075,.014,8,16),materials.gold);
      knocker.position.set(direction*span/2,1.6,.15);pivot.add(knocker);
    }
    for(const py of [.3,height-.42])piece(pivot,direction*.05,py,.015,.09,.16,.2,materials.iron);
    parts.push({pivot,leaf,direction,handles,collider:null});
  }
  state.hinge=parts[0].pivot;state.leaf=parts[0].leaf;
  return state;
}

export function syncDoorCollider(part) {
  syncBoxCollider(part.leaf,part.collider);
}

export function syncBoxCollider(mesh,collider) {
  if(!collider)return;
  mesh.updateWorldMatrix(true,false);
  const e=mesh.matrixWorld.elements,shape=mesh.geometry.parameters;
  if(collider.fullRotation) {
    const bounds=new THREE.Box3().setFromObject(mesh),size=bounds.getSize(new THREE.Vector3());
    Object.assign(collider,{x:e[12],z:e[14],centerY:e[13],halfX:size.x/2,halfZ:size.z/2,minY:bounds.min.y,maxY:bounds.max.y,axisX:[1,0],axisZ:[0,1],
      halfSize:[shape.width*Math.hypot(e[0],e[1],e[2])/2,shape.height*Math.hypot(e[4],e[5],e[6])/2,shape.depth*Math.hypot(e[8],e[9],e[10])/2],
      quaternion:mesh.getWorldQuaternion(new THREE.Quaternion())});return;
  }
  const sx=Math.hypot(e[0],e[2]),sz=Math.hypot(e[8],e[10]),sy=Math.abs(e[5]);
  Object.assign(collider,{x:e[12],z:e[14],halfX:shape.width*sx/2,halfZ:shape.depth*sz/2,
    minY:e[13]-shape.height*sy/2,maxY:e[13]+shape.height*sy/2,
    axisX:[e[0]/sx,e[2]/sx],axisZ:[e[8]/sz,e[10]/sz]});
}

function leafOverlapsPlayer(part,player) {
  const solid=part.collider;if(!solid||player.y+playerHeight(player)<=solid.minY+.015||player.y>=solid.maxY-.015)return false;
  const dx=player.x-solid.x,dz=player.z-solid.z;
  const ex=Math.max(Math.abs(dx*solid.axisX[0]+dz*solid.axisX[1])-solid.halfX,0);
  const ez=Math.max(Math.abs(dx*solid.axisZ[0]+dz*solid.axisZ[1])-solid.halfZ,0);
  const radius=player.radius??PLAYER_RADIUS;return ex*ex+ez*ez<radius*radius;
}

export const doorImpactLocked=door=>(door.impactCooldown??0)>1e-8;
export function setCastleDoorOpen(door,open,owner=null){
  if(doorImpactLocked(door))return false;
  if(door.open===open)return true;
  door.open=open;door.noiseOwner=owner;
  door.openingActor=open?owner:null;door.impactArmed=!!open;delete door.impactClearance;
  return true;
}
function applyDoorAmount(door,amount){
  door.amount=amount;
  for(const part of door.parts){part.pivot.rotation.y=-part.direction*door.swing*amount*Math.PI/2;syncDoorCollider(part);}
}
function boxesOverlap(a,b){
  if(a.minY>=b.maxY-.012||a.maxY<=b.minY+.012)return false;
  const dx=b.x-a.x,dz=b.z-a.z;
  for(const axis of [a.axisX,a.axisZ,b.axisX,b.axisZ]){
    const radius=s=>s.halfX*Math.abs(s.axisX[0]*axis[0]+s.axisX[1]*axis[1])+s.halfZ*Math.abs(s.axisZ[0]*axis[0]+s.axisZ[1]*axis[1]);
    if(Math.abs(dx*axis[0]+dz*axis[1])>=radius(a)+radius(b)-.012)return false;
  }
  return true;
}
function openingHasRoom(door,navigation){
  if(door.amount>.5)return true;
  if(door.impactClearance!==undefined&&(door.impactClearance||door.impactClearanceWait>0))return door.impactClearance;
  if(!navigation)return false;
  const amount=door.amount,leaves=door.parts.map(part=>part.collider),end=.501;
  let clear=true;
  try{
    for(let t=amount;t<=end+.00001;t=Math.min(end,t+.01)){
      applyDoorAmount(door,t);
      // The hinge lives inside its jamb. Exclude only that small mounting
      // strip, rather than treating its normal overlap with a wall as a jam.
      const sweeps=door.parts.map(part=>{const s=part.collider,trim=Math.min(.13,s.halfX);return {...s,x:s.x+part.direction*s.axisX[0]*trim/2,z:s.z+part.direction*s.axisX[1]*trim/2,halfX:s.halfX-trim/2};});
      for(const solid of navigation.solids){
        if(leaves.includes(solid)||solid.doorFrame===door||solid.enabled&&!solid.enabled())continue;
        if(sweeps.some(sweep=>boxesOverlap(sweep,solid))){clear=false;break;}
      }
      if(clear)for(const circle of navigation.circles??[]){
        if(circle.npc||circle.enabled&&!circle.enabled())continue;
        if(door.parts.some(part=>leafOverlapsPlayer(part,{x:circle.x,z:circle.z,y:circle.minY,bodyHeight:circle.maxY-circle.minY,radius:circle.radius}))){clear=false;break;}
      }
      if(!clear||t===end)break;
    }
  }finally{applyDoorAmount(door,amount);}
  door.impactClearance=clear;door.impactClearanceWait=.2;return clear;
}
function tryDoorImpact(door,part,victim,navigation){
  const operator=door.openingActor??door.noiseOwner;
  if(!door.open||!door.impactArmed||!operator||operator===victim||!victim.onDoorImpact||victim.hidden||victim.hidingBed||victim.hidingWardrobe)return false;
  if(operator.kind==='pursuer'?victim.kind==='pursuer':victim.kind!=='pursuer')return false;
  if(operator.kind!=='pursuer'&&!openingHasRoom(door,navigation))return false;
  const hinge=part.pivot.getWorldPosition(new THREE.Vector3()),sign=-part.direction*door.swing;
  let dx=(victim.z-hinge.z)*sign,dz=-(victim.x-hinge.x)*sign,length=Math.hypot(dx,dz);
  if(length<.001){dx=door.normal[0]*door.swing;dz=door.normal[1]*door.swing;length=1;}
  const impact={door,operator,victim,direction:{x:dx/length,z:dz/length},distance:victim.kind==='pursuer'?2:4,damage:victim.kind==='pursuer'?5:10};
  if(victim.onDoorImpact(impact)===false)return false;
  door.impactArmed=false;door.impactCooldown=victim.kind==='pursuer'?5:0;door.open=true;door.pressureActor=null;door.naiwaReachDelay=0;
  if(door.autoCloseDelay){door.autoCloseWasOpen=true;door.autoCloseRemaining=door.autoCloseDelay;}
  applyDoorAmount(door,1);door.blocked=false;door.blockedBy=[];
  let scene=door.root;while(scene.parent)scene=scene.parent;
  scene.dispatchEvent({type:'escape-door-impact',...impact,position:{x:victim.x,y:victim.y+1,z:victim.z}});
  return true;
}

function bracesLeaf(part,occupant,navigation) {
  const intent=occupant.moveIntent,solid=part.collider;
  if(!intent||!solid||!navigation.overlapsBox(occupant.x,occupant.y,occupant.z,solid,(occupant.radius??PLAYER_RADIUS)+.08,0,playerHeight(occupant)))return false;
  const dx=occupant.x-solid.x,dz=occupant.z-solid.z;
  const x=dx*solid.axisX[0]+dz*solid.axisX[1],z=dx*solid.axisZ[0]+dz*solid.axisZ[1];
  const nx=x-THREE.MathUtils.clamp(x,-solid.halfX,solid.halfX),nz=z-THREE.MathUtils.clamp(z,-solid.halfZ,solid.halfZ);
  const length=Math.hypot(nx,nz);
  return length>1e-8&&(intent.x*(nx*solid.axisX[0]+nz*solid.axisZ[0])+intent.z*(nx*solid.axisX[1]+nz*solid.axisZ[1]))/length<-.2;
}

// A press moves the body only as fast as the leaf can gently sweep it aside.
// Check the entire displacement against the room, floors and other actors.
function pushOccupant(door,part,occupant,budget,navigation) {
  if(!navigation||occupant===door.pressureActor||occupant.kind==='pursuer'||occupant.hidingWardrobe||occupant.hidingBed)return false;
  const solid=part.collider,radius=occupant.radius??PLAYER_RADIUS;
  const dx=occupant.x-solid.x,dz=occupant.z-solid.z;
  const localX=dx*solid.axisX[0]+dz*solid.axisX[1],localZ=dx*solid.axisZ[0]+dz*solid.axisZ[1];
  const nearX=THREE.MathUtils.clamp(localX,-solid.halfX,solid.halfX),nearZ=THREE.MathUtils.clamp(localZ,-solid.halfZ,solid.halfZ);
  let nx=localX-nearX,nz=localZ-nearZ,length=Math.hypot(nx,nz),distance;
  if(length>1e-8){distance=radius-length+.0001;nx/=length;nz/=length;}
  else {
    const ex=solid.halfX-Math.abs(localX),ez=solid.halfZ-Math.abs(localZ);
    if(ex<ez){nx=Math.sign(localX)||1;nz=0;distance=ex+radius+.0001;}
    else {nx=0;nz=Math.sign(localZ)||1;distance=ez+radius+.0001;}
  }
  if(distance>budget+.00001)return false;
  const vx=(nx*solid.axisX[0]+nz*solid.axisZ[0])*distance,vz=(nx*solid.axisX[1]+nz*solid.axisZ[1])*distance;
  const ignore=door.parts.map(leaf=>leaf.collider);if(occupant.collider)ignore.push(occupant.collider);
  let y=occupant.y;
  for(let i=1,count=Math.max(1,Math.ceil(distance/.02));i<=count;i++) {
    const x=occupant.x+vx*i/count,z=occupant.z+vz*i/count;
    const floor=navigation.support(x,z,y,.235,radius);
    if(!Number.isFinite(floor)||Math.abs(floor-y)>.25)return false;
    if(occupant.grounded)y=floor;
    if(navigation.blocked(x,y,z,false,playerHeight(occupant),radius,ignore))return false;
  }
  Object.assign(occupant,{x:occupant.x+vx,y,z:occupant.z+vz});return distance;
}

export function updateCastleDoor(door,dt,player=null,navigation=null) {
  dt=Math.max(0,dt);
  door.impactClearanceWait=Math.max(0,(door.impactClearanceWait??0)-dt);
  if(doorImpactLocked(door)){door.impactCooldown=Math.max(0,door.impactCooldown-dt);if(door.impactCooldown<1e-8)door.impactCooldown=0;door.open=true;}
  if(door.open&&!door.impactObservedOpen&&!door.impactArmed){door.openingActor=door.noiseOwner;door.impactArmed=true;delete door.impactClearance;}
  if(!door.open){door.impactArmed=false;door.openingActor=null;delete door.impactClearance;}
  door.impactObservedOpen=door.open;
  if(door.autoCloseDelay) {
    if(door.open) {
      if(!door.autoCloseWasOpen)door.autoCloseRemaining=door.autoCloseDelay;
      door.autoCloseRemaining=Math.max(0,(door.autoCloseRemaining??door.autoCloseDelay)-dt);
      if(door.autoCloseRemaining===0&&!doorImpactLocked(door))setCastleDoorOpen(door,false);
    } else door.autoCloseRemaining=0;
    door.autoCloseWasOpen=door.open;
  }
  if(door.naiwaReachDelay>0){door.naiwaReachDelay=Math.max(0,door.naiwaReachDelay-dt);return false;}
  const occupants=Array.isArray(player)?player:player?[player]:[];
  door.blockedBy=[];door.pushing=false;
  if(door.amount===(door.open?1:0)){door.blocked=false;return false;}
  const before=door.amount;
  const pressing=occupants.includes(door.pressureActor)&&navigation&&Math.abs(door.pressureActor.y-door.y)<.7
    &&Math.hypot(door.pressureActor.x-door.x,door.pressureActor.z-door.z)<2.5;
  const duration=pressing?Math.min(Math.max(dt,0),.05):Math.max(dt,0);
  door.resisted=!!pressing&&occupants.some(occupant=>occupant!==door.pressureActor&&door.parts.some(part=>bracesLeaf(part,occupant,navigation)));
  let next=THREE.MathUtils.damp(before,door.open?1:0,10,duration);
  if(Math.abs(next-(door.open?1:0))<.0001)next=door.open?1:0;
  if(pressing) {
    const limit=.38*(door.resisted?.12:1)*duration/(door.width/door.parts.length*Math.PI/2);
    next=before+THREE.MathUtils.clamp(next-before,-limit,limit);
  }
  const pushed=new Map(),steps=Math.max(1,Math.ceil(Math.abs(next-before)/.012));door.blocked=false;
  const apply=amount=>applyDoorAmount(door,amount);
  for(let step=1;step<=steps;step++) {
    const previous=door.amount,snapshots=occupants.map(occupant=>({occupant,x:occupant.x,y:occupant.y,z:occupant.z})),spent=new Map(pushed);
    apply(before+(next-before)*step/steps);
    for(const part of door.parts)for(const occupant of occupants)if(leafOverlapsPlayer(part,occupant)) {
      if(tryDoorImpact(door,part,occupant,navigation))return true;
      const distance=pressing&&pushOccupant(door,part,occupant,.42*duration-(pushed.get(occupant)??0),navigation);
      if(distance)pushed.set(occupant,(pushed.get(occupant)??0)+distance);
      else door.blockedBy.push(occupant);
    }
    // Two leaves must agree on the final body position before committing it.
    for(const part of door.parts)for(const occupant of occupants)if(leafOverlapsPlayer(part,occupant)&&!door.blockedBy.includes(occupant))door.blockedBy.push(occupant);
    if(door.blockedBy.length) {
      for(const {occupant,x,y,z} of snapshots)Object.assign(occupant,{x,y,z});
      pushed.clear();for(const [occupant,distance] of spent)pushed.set(occupant,distance);
      apply(previous);door.blocked=true;break;
    }
  }
  door.pushing=pushed.size>0;
  return Math.abs(door.amount-before)>.00001;
}

export function playerInDoorSwing(door,player) {
  if(Math.abs(player.y-door.y)>door.height)return false;
  const dx=player.x-door.x,dz=player.z-door.z;
  const across=dx*door.tangent[0]+dz*door.tangent[1];
  const out=(dx*door.normal[0]+dz*door.normal[1])*door.swing;
  return Math.abs(across)<door.width/2+PLAYER_RADIUS && out>-.3-PLAYER_RADIUS && out<door.width/door.parts.length+PLAYER_RADIUS+.12;
}
