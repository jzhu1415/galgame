import * as THREE from 'three';
import {syncBoxCollider,boxesOverlap,doorImpactLocked,resolveOpeningImpact} from './frog-escape-doors.js';
import {PLAYER_RADIUS,playerHeight} from './frog-escape-navigation.js';
import {createPropModel} from './frog-escape-props.js';

export function insertFixtureKey(action,item) {
  if(!action?.locked||!action.keySocket||action.insertedKey||item?.type!=='key'||item.kind!==action.keyKind)return false;
  const model=createPropModel(item);model.name='fixture:inserted-key';
  model.position.set(0,0,.055);model.rotation.set(Math.PI/2,Math.PI/2,0,'YXZ');
  action.keySocket.add(model);action.insertedKey=item;action.locked=false;
  return true;
}

export function createFixtureAction({id,name,kind,anchor,motions,onUpdate}) {
  const action={id,name,kind:'fixture',fixtureKind:kind,anchor,motions,onUpdate,open:false,amount:0,blocked:false,colliders:[]};
  for(const motion of motions) {
    motion.axis??='y';motion.start=motion.pivot.position.clone();motion.startAngle=motion.pivot.rotation[motion.axis];motion.colliders=[];
    motion.pivot.traverse(mesh=>{if(mesh.userData.solid&&mesh.geometry?.type==='BoxGeometry')mesh.userData.fixtureMotion={action,motion};});
  }
  return action;
}

function applyMotion(action,amount) {
  action.amount=amount;
  for(const motion of action.motions) {
    motion.pivot.position.copy(motion.start);
    if(motion.travel)motion.pivot.position.addScaledVector(motion.travel,amount);
    motion.pivot.rotation[motion.axis]=motion.startAngle+(motion.angle??0)*amount;
    for(const {mesh,solid} of motion.colliders)syncBoxCollider(mesh,solid);
  }
}

function openingHasRoom(action,navigation) {
  if(action.amount>.5)return true;
  if(action.impactClearance!==undefined&&(action.impactClearance||action.impactClearanceWait>0))return action.impactClearance;
  if(!navigation)return false;
  const before=action.amount,end=Math.min(1,Math.PI/4/Math.max(...action.motions.map(m=>Math.abs(m.angle??Math.PI/2))));let clear=true;
  try {
    for(let t=before;t<=end+.00001;t=Math.min(end,t+.02)) {
      applyMotion(action,t);
      const sweeps=action.motions.flatMap(motion=>{
        const hinge=motion.pivot.getWorldPosition(new THREE.Vector3());
        return motion.colliders.map(({solid})=>{
          const direction=Math.sign((solid.x-hinge.x)*solid.axisX[0]+(solid.z-hinge.z)*solid.axisX[1])||1,trim=Math.min(.1,solid.halfX);
          return {...solid,x:solid.x+direction*solid.axisX[0]*trim/2,z:solid.z+direction*solid.axisX[1]*trim/2,halfX:solid.halfX-trim/2};
        });
      });
      if(navigation.solids.some(solid=>!action.colliders.includes(solid)&&(!solid.enabled||solid.enabled())&&sweeps.some(sweep=>boxesOverlap(sweep,solid)))){clear=false;break;}
      if((navigation.circles??[]).some(circle=>!circle.npc&&(!circle.enabled||circle.enabled())&&sweeps.some(sweep=>navigation.overlapsBox(circle.x,circle.minY,circle.z,sweep,circle.radius,0,circle.maxY-circle.minY)))){clear=false;break;}
      if(t===end)break;
    }
  } finally {applyMotion(action,before);}
  action.impactClearance=clear;action.impactClearanceWait=.2;return clear;
}

function wardrobePreparationDirection(action,operator,victim,navigation) {
  if(action.wardrobeInspection!==victim||wardrobeContaining([action],operator)!==action)return null;
  const volume=action.hideVolume,root=volume.root;
  const local=root.worldToLocal(new THREE.Vector3(victim.x,victim.y,victim.z));
  if(local.x<volume.minX-.2||local.x>volume.maxX+.2||local.z<volume.maxZ+.25||local.z>volume.maxZ+1.55||Math.abs(local.y)>.4)return null;
  const front=root.localToWorld(new THREE.Vector3(0,.6,volume.maxZ+.08));
  if(!navigation?.lineClear(front,{x:victim.x,y:victim.y+.6,z:victim.z},[...action.colliders,victim.collider]))return null;
  const direction=root.localToWorld(new THREE.Vector3(0,0,1)).sub(root.getWorldPosition(new THREE.Vector3()));
  const length=Math.hypot(direction.x,direction.z)||1;return {x:direction.x/length,z:direction.z/length};
}

function tryWardrobeImpact(action,victim,navigation) {
  const operator=action.openingActor??action.noiseOwner;
  if(!action.hideVolume||!action.open||!action.impactArmed||!operator||operator.kind==='pursuer'||victim.kind!=='pursuer')return false;
  let direction=wardrobePreparationDirection(action,operator,victim,navigation);
  if(!direction) {
    if(!openingHasRoom(action,navigation))return false;
    const motion=action.motions.find(m=>m.colliders.some(({solid})=>navigation.overlapsBox(victim.x,victim.y,victim.z,solid,victim.radius??PLAYER_RADIUS,0,playerHeight(victim))));
    if(!motion)return false;
    const hinge=motion.pivot.getWorldPosition(new THREE.Vector3()),sign=Math.sign(motion.angle)||1;
    const dx=(victim.z-hinge.z)*sign,dz=-(victim.x-hinge.x)*sign,length=Math.hypot(dx,dz)||1;
    direction={x:dx/length,z:dz/length};
  }
  const impact=resolveOpeningImpact(action,operator,victim,direction);if(!impact)return false;
  action.open=true;action.naiwaReachDelay=0;applyMotion(action,1);action.blocked=false;action.blockedBy=[];action.onUpdate?.(action.amount);
  let scene=action.anchor;while(scene.parent)scene=scene.parent;
  scene.dispatchEvent({type:'escape-door-impact',...impact,position:{x:victim.x,y:victim.y+1,z:victim.z}});return true;
}

export function updateFixtureAction(action,dt,player=null,navigation=null) {
  dt=Math.max(0,dt);action.impactClearanceWait=Math.max(0,(action.impactClearanceWait??0)-dt);
  if(doorImpactLocked(action)){action.impactCooldown=Math.max(0,action.impactCooldown-dt);if(action.impactCooldown<1e-8)action.impactCooldown=0;action.open=true;}
  if(action.open&&!action.impactObservedOpen&&!action.impactArmed){action.openingActor=action.noiseOwner;action.impactArmed=true;delete action.impactClearance;}
  if(!action.open){action.impactArmed=false;action.openingActor=null;delete action.impactClearance;}
  action.impactObservedOpen=action.open;
  if(action.naiwaReachDelay>0){action.naiwaReachDelay=Math.max(0,action.naiwaReachDelay-dt);return false;}
  const occupants=Array.isArray(player)?player:player?[player]:[];
  const target=action.open&&!action.locked?1:0,before=action.amount;action.blocked=false;action.blockedBy=[];
  if(before===target)return false;
  if(dt>0&&occupants.some(victim=>victim===action.wardrobeInspection&&tryWardrobeImpact(action,victim,navigation)))return true;
  let next=THREE.MathUtils.damp(before,target,9,dt);
  if(Math.abs(next-target)<.0001)next=target;
  const steps=Math.max(1,Math.ceil(Math.abs(next-before)/.025));
  for(let step=1;step<=steps;step++) {
    const previous=action.amount;applyMotion(action,before+(next-before)*step/steps);
    if(navigation)action.blockedBy=occupants.filter(occupant=>action.colliders.some(solid=>navigation.overlapsBox(occupant.x,occupant.y,occupant.z,solid,occupant.radius??PLAYER_RADIUS,0,playerHeight(occupant))));
    if(action.blockedBy.some(victim=>tryWardrobeImpact(action,victim,navigation)))return true;
    if(action.blockedBy.length) {
      applyMotion(action,previous);action.blocked=true;break;
    }
  }
  action.onUpdate?.(action.amount);
  return Math.abs(action.amount-before)>.000001;
}

export function wardrobeContaining(actions,player) {
  const point=new THREE.Vector3(player.x,player.y,player.z);
  for(const action of actions) {
    const volume=action.hideVolume;if(!volume)continue;
    volume.root.updateWorldMatrix(true,false);const p=volume.root.worldToLocal(point.clone());
    if(p.x>volume.minX+PLAYER_RADIUS&&p.x<volume.maxX-PLAYER_RADIUS&&p.z>volume.minZ+PLAYER_RADIUS&&p.z<volume.maxZ-PLAYER_RADIUS&&p.y>=volume.floor-.04&&p.y+playerHeight(player)<=volume.ceiling+.015)return action;
  }
  return null;
}

export function nearestFixture(actions,player,camera,direction,navigation) {
  let selected=null,best=Infinity;
  const target=new THREE.Vector3();
  for(const action of actions) {
    action.anchor.getWorldPosition(target);
    const dx=target.x-camera.position.x,dy=target.y-camera.position.y,dz=target.z-camera.position.z;
    const distance=Math.hypot(dx,dy,dz);if(distance>2.25||distance<.02)continue;
    const dot=(dx*direction.x+dy*direction.y+dz*direction.z)/distance;if(dot<.86)continue;
    if(!navigation.lineClear(camera.position,target,action.colliders))continue;
    const score=(1-dot)*4+distance*.12;
    if(score<best){selected=action;best=score;}
  }
  return selected;
}
