import * as THREE from 'three';
import {syncBoxCollider} from './frog-escape-doors.js';
import {PLAYER_RADIUS,playerHeight} from './frog-escape-navigation.js';
import {createPropModel} from './frog-escape-props.js';

export function insertFixtureKey(action,item) {
  if(!action?.locked||!action.keySocket||action.insertedKey||item?.type!=='key'||item.kind!==action.keyKind||action.beforeUnlock&&!action.beforeUnlock())return false;
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

export function updateFixtureAction(action,dt,player=null,navigation=null) {
  if(action.naiwaReachDelay>0){action.naiwaReachDelay=Math.max(0,action.naiwaReachDelay-dt);return false;}
  const occupants=Array.isArray(player)?player:player?[player]:[];
  const target=action.open&&!action.locked?1:0,before=action.amount;action.blocked=false;action.blockedBy=[];
  if(before===target)return false;
  let next=THREE.MathUtils.damp(before,target,9,dt);
  if(Math.abs(next-target)<.0001)next=target;
  const steps=Math.max(1,Math.ceil(Math.abs(next-before)/.025));
  for(let step=1;step<=steps;step++) {
    const previous=action.amount;applyMotion(action,before+(next-before)*step/steps);
    if(navigation)action.blockedBy=occupants.filter(occupant=>action.colliders.some(solid=>navigation.overlapsBox(occupant.x,occupant.y,occupant.z,solid,occupant.radius??PLAYER_RADIUS,0,playerHeight(occupant))));
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
