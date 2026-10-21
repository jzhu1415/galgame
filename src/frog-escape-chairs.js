import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {syncBoxCollider} from './frog-escape-doors.js';
import {playerHeight} from './frog-escape-navigation.js';
import {damagePlayer,naiwaAttackDamage} from './frog-escape-vitals.js';

export const CHAIR_GROUP=32;
export const CHAIR_RULES=Object.freeze({playerPushSpeed:.42,naiwaPushSpeed:2.2,kickSpeed:12,kickLift:3,damageSpeed:3.4,damage:8,breakSpeed:7});

export function createChairPhysics({world,navigation,playerBody,onImpact=()=>{},onBreak=()=>{}}) {
  let time=0,player=null;
  const records=navigation.chairs??[],worldMatrix=new THREE.Matrix4(),localMatrix=new THREE.Matrix4();
  const pendingBreaks=new Set();
  for(const chair of records) {
    const {root}=chair;root.updateWorldMatrix(true,true);
    const origin=root.getWorldPosition(new THREE.Vector3()),orientation=root.getWorldQuaternion(new THREE.Quaternion()),scale=root.getWorldScale(new THREE.Vector3());
    const center=new THREE.Vector3(0,.55,0).applyQuaternion(orientation).add(origin);
    const body=new CANNON.Body({mass:6,linearDamping:.36,angularDamping:.55,allowSleep:true,sleepSpeedLimit:.1,sleepTimeLimit:.6,
      collisionFilterGroup:CHAIR_GROUP,collisionFilterMask:1|2|8|CHAIR_GROUP});
    body.position.copy(center);body.quaternion.copy(orientation);
    for(const mesh of chair.meshes) {
      const parameters=mesh.geometry.parameters,size=mesh.getWorldScale(new THREE.Vector3()),q=mesh.getWorldQuaternion(new THREE.Quaternion());
      const point=mesh.getWorldPosition(new THREE.Vector3()).sub(center).applyQuaternion(orientation.clone().invert());
      const shape=new CANNON.Box(new CANNON.Vec3(parameters.width*size.x/2,parameters.height*size.y/2,parameters.depth*size.z/2));shape.audioMaterial='wood';
      q.premultiply(orientation.clone().invert());body.addShape(shape,new CANNON.Vec3(point.x,point.y,point.z),new CANNON.Quaternion(q.x,q.y,q.z,q.w));
    }
    Object.assign(chair,{body,worldScale:scale,centerOffset:new THREE.Vector3(0,.55,0),initialPosition:body.position.clone(),initialQuaternion:body.quaternion.clone(),lastImpact:-10,lastSound:-10,pushVector:new THREE.Vector3(),pushSpeed:0,activePush:null,broken:false});
    body.chair=chair;body.sceneSolid={audioMaterial:'wood'};world.addBody(body);body.sleep();root.matrixAutoUpdate=false;
    bindContacts(chair);
  }
  function bindContacts(chair) {
    const {body}=chair;
    body.addEventListener('collide',event=>{
      const speed=Math.abs(event.contact.getImpactVelocityAlongNormal());
      const group=chair.damageGroup??chair;
      if(event.body===playerBody&&player&&speed>=CHAIR_RULES.damageSpeed&&time-group.lastImpact>1) {
        group.lastImpact=time;const owner=chair.kickedBy??group.kickedBy;
        damagePlayer(player,owner?.kind==='pursuer'?naiwaAttackDamage(CHAIR_RULES.damage,'chair',owner.alertness):CHAIR_RULES.damage,'chair');
      }
      if(speed>1.2&&time-chair.lastSound>.22) {
        chair.lastSound=time;onImpact({chair,speed,position:{...body.position},owner:chair.kickedBy??null});
      }
      if(!chair.fragment&&!chair.broken&&chair.kickedBy&&speed>=CHAIR_RULES.breakSpeed&&event.body.collisionFilterGroup===1&&Math.abs(event.contact.ni.y)<.55)pendingBreaks.add(chair);
    });
  }
  function syncRecord(chair) {
    const {body,root}=chair;
    const p=body.position,rotation=body.quaternion,previous=chair.renderPose;
    if(previous&&previous[0]===p.x&&previous[1]===p.y&&previous[2]===p.z&&previous[3]===rotation.x&&previous[4]===rotation.y&&previous[5]===rotation.z&&previous[6]===rotation.w)return false;
    chair.renderPose=[p.x,p.y,p.z,rotation.x,rotation.y,rotation.z,rotation.w];
    const q=new THREE.Quaternion(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w);
    const origin=chair.centerOffset.clone().negate().applyQuaternion(q).add(body.position);
    worldMatrix.compose(origin,q,chair.worldScale);root.parent.updateWorldMatrix(true,false);
    localMatrix.copy(root.parent.matrixWorld).invert().multiply(worldMatrix);
    const changed=!root.matrix.equals(localMatrix);root.matrix.copy(localMatrix);root.matrixWorldNeedsUpdate=true;
    root.updateWorldMatrix(false,true);chair.meshes.forEach((mesh,i)=>syncBoxCollider(mesh,chair.colliders[i]));return changed;
  }
  function fracture(chair) {
    if(chair.broken)return;syncRecord(chair);chair.broken=true;
    const source=chair.body,parent=chair.root.parent,parts=chair.meshes.map(mesh=>{
      const scale=mesh.getWorldScale(new THREE.Vector3()),q=mesh.getWorldQuaternion(new THREE.Quaternion()),position=mesh.getWorldPosition(new THREE.Vector3()),shape=mesh.geometry.parameters;
      return {mesh,scale,q,position,volume:shape.width*shape.height*shape.depth*scale.x*scale.y*scale.z};
    }),volume=parts.reduce((sum,part)=>sum+part.volume,0),pieces=[];
    world.removeBody(source);chair.colliders.forEach(solid=>{solid.enabled=()=>false;});
    for(const [i,part]of parts.entries()) {
      const {mesh,scale,q,position}=part,shape=mesh.geometry.parameters,root=new THREE.Group();root.name=`chair-part:${chair.id}:${i}`;parent.add(root);
      root.matrixAutoUpdate=false;worldMatrix.compose(position,q,new THREE.Vector3(1,1,1));root.matrix.copy(parent.matrixWorld.clone().invert().multiply(worldMatrix));root.updateWorldMatrix(false,true);
      root.add(mesh);mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.copy(scale);mesh.updateMatrix();
      const body=new CANNON.Body({mass:(source.mass||6)*part.volume/volume,shape:new CANNON.Box(new CANNON.Vec3(shape.width*scale.x/2,shape.height*scale.y/2,shape.depth*scale.z/2)),
        linearDamping:.24,angularDamping:.45,allowSleep:true,sleepSpeedLimit:.12,sleepTimeLimit:.7,collisionFilterGroup:CHAIR_GROUP,collisionFilterMask:1|2|4|8|CHAIR_GROUP});
      body.position.copy(position);body.quaternion.copy(q);source.getVelocityAtWorldPoint(body.position,body.velocity);
      const away=position.clone().sub(source.position).normalize();body.velocity.x=body.velocity.x*.7+away.x*.8;body.velocity.y=body.velocity.y*.7+Math.max(.25,away.y*.8);body.velocity.z=body.velocity.z*.7+away.z*.8;
      body.angularVelocity.set(source.angularVelocity.x*.5+(i%2?1:-1),source.angularVelocity.y*.5,source.angularVelocity.z*.5);
      const solid={dynamic:true,fullRotation:true,audioMaterial:'wood'},piece={id:`${chair.id}-part-${i}`,root,body,meshes:[mesh],colliders:[solid],fragment:true,broken:false,damageGroup:chair,kickedBy:chair.kickedBy,
        centerOffset:new THREE.Vector3(),worldScale:new THREE.Vector3(1,1,1),initialPosition:body.position.clone(),initialQuaternion:body.quaternion.clone(),lastImpact:-10,lastSound:time,pushVector:new THREE.Vector3(),pushSpeed:0,activePush:null};
      solid.movableChair=piece;syncBoxCollider(mesh,solid);navigation.solids.push(solid);records.push(piece);pieces.push(piece);body.chair=piece;body.sceneSolid={audioMaterial:'wood'};body.shapes[0].audioMaterial='wood';world.addBody(body);bindContacts(piece);
    }
    // Retain trim and upholstery as children of the nearest physical component.
    for(const decoration of [...chair.root.children]) {
      const position=decoration.getWorldPosition(new THREE.Vector3()),nearest=pieces.reduce((a,b)=>a.root.getWorldPosition(new THREE.Vector3()).distanceToSquared(position)<b.root.getWorldPosition(new THREE.Vector3()).distanceToSquared(position)?a:b);
      nearest.root.attach(decoration);
    }
    chair.pieces=pieces;onBreak({chair,pieces,position:{...source.position},owner:chair.kickedBy});
  }
  function touches(chair,actor,offset={x:0,z:0},margin=.06) {
    return chair.colliders.some(solid=>navigation.overlapsBox(actor.x+offset.x,actor.y,actor.z+offset.z,solid,(actor.radius??.27)+margin,0,playerHeight(actor)));
  }
  function obstacleAhead(actor,target) {
    const dx=target.x-actor.x,dz=target.z-actor.z,length=Math.hypot(dx,dz)||1;
    return records.find(chair=>!chair.broken&&touches(chair,actor,{x:dx/length*.48,z:dz/length*.48},.12))??null;
  }
  function push(actor,intent,dt) {
    const length=Math.hypot(intent.x,intent.z);if(length<1e-8)return;
    const direction={x:intent.x/length,z:intent.z/length};
    for(const chair of records) {
      if(chair.broken)continue;
      if(!touches(chair,actor,intent,.035))continue;
      const body=chair.body,dx=body.position.x-actor.x,dz=body.position.z-actor.z;
      if(dx*direction.x+dz*direction.z<.02||body.velocity.length()>3)continue;
      const speed=actor.kind==='pursuer'?CHAIR_RULES.naiwaPushSpeed:CHAIR_RULES.playerPushSpeed;
      const along=body.velocity.x*direction.x+body.velocity.z*direction.z;
      const change=Math.max(0,speed-along)*(1-Math.exp(-18*dt));
      body.wakeUp();body.velocity.x+=direction.x*change;body.velocity.z+=direction.z*change;
      chair.pushVector.x+=direction.x*dt;chair.pushVector.z+=direction.z*dt;chair.pushSpeed=Math.max(chair.pushSpeed,speed);
    }
  }
  function kick(chair,actor) {
    if(!records.includes(chair)||chair.broken)return false;
    if(actor.kind==='pursuer'&&(actor.alertness??0)<70)return false;
    const body=chair.body,dx=body.position.x-actor.x,dz=body.position.z-actor.z,length=Math.hypot(dx,dz)||1;
    if(length>1.55||Math.abs(body.position.y-.55-actor.y)>.85)return false;
    body.wakeUp();body.velocity.set(dx/length*CHAIR_RULES.kickSpeed,CHAIR_RULES.kickLift,dz/length*CHAIR_RULES.kickSpeed);
    body.angularVelocity.set(dz/length*3,.8,-dx/length*3);chair.kickedBy=actor;(chair.damageGroup??chair).lastImpact=-10;return true;
  }
  function beforeTick(dt,occupant) {
    time+=dt;player=occupant;
    for(const chair of records) {
      if(chair.broken)continue;
      const mask=1|2|8|CHAIR_GROUP|(chair.body.velocity.length()>2?4:0);
      if(chair.body.collisionFilterMask!==mask){chair.body.collisionFilterMask=mask;world.broadphase.dirty=true;}
      chair.activePush=chair.pushVector.lengthSq()>0?{direction:chair.pushVector.clone().normalize(),speed:chair.pushSpeed}:null;
      chair.pushVector.set(0,0,0);chair.pushSpeed=0;
    }
  }
  function step() {
    for(const chair of records)if(!chair.broken&&chair.activePush&&chair.body.velocity.length()<3) {
      const {direction,speed}=chair.activePush,body=chair.body,along=body.velocity.x*direction.x+body.velocity.z*direction.z;
      if(along>speed){body.velocity.x-=direction.x*(along-speed);body.velocity.z-=direction.z*(along-speed);}
      const acceleration=speed===CHAIR_RULES.naiwaPushSpeed?22:5;
      body.force.x+=direction.x*body.mass*acceleration;body.force.z+=direction.z*body.mass*acceleration;
    }
  }
  function afterStep() {for(const chair of pendingBreaks)fracture(chair);pendingBreaks.clear();}
  function sync() {
    let changed=false;
    for(const chair of records) {
      if(chair.broken)continue;
      const {body,root}=chair;
      if(body.position.y<-15){body.position.copy(chair.initialPosition);body.quaternion.copy(chair.initialQuaternion);body.velocity.setZero();body.angularVelocity.setZero();body.sleep();}
      changed=syncRecord(chair)||changed;
    }
    return changed;
  }
  navigation.pushObstacles=push;
  const controller={records,push,kick,obstacleAhead,beforeTick,step,afterStep,sync};navigation.chairMotion=controller;return controller;
}
