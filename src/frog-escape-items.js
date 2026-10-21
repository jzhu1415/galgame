import {projectileDamage,playerDamageScale} from './frog-escape-vitals.js';
import * as THREE from 'three';
import {Body} from 'cannon-es';
import {playerHeight} from './frog-escape-navigation.js';
import {createPropModel,windowDamage} from './frog-escape-props.js';
import {createPropPhysics} from './frog-escape-physics.js';

export const flashlightItem=()=>({id:'flashlight',type:'flashlight',name:'手电筒',on:true,size:[.15,.15,.4],mass:.35,stackLimit:1,icon:''});

export function createFlashlightModel() {
  const model=new THREE.Group();
  const metal=new THREE.MeshStandardMaterial({color:0x30383c,metalness:.78,roughness:.38});
  const rubber=new THREE.MeshStandardMaterial({color:0x181e20,roughness:.86});
  const lensMaterial=new THREE.MeshStandardMaterial({color:0xe6debc,emissive:0xc6a86a,emissiveIntensity:0,roughness:.15,metalness:.3});
  function cylinder(radius,depth,z,material) {
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,depth,16),material);
    mesh.rotation.x=Math.PI/2;mesh.position.z=z;model.add(mesh);return mesh;
  }
  cylinder(.049,.28,.02,metal);
  cylinder(.074,.11,-.17,metal);
  cylinder(.062,.012,-.232,lensMaterial);
  for(let z=-.08;z<=.12;z+=.035)cylinder(.053,.009,z,rubber);
  const button=new THREE.Mesh(new THREE.BoxGeometry(.025,.012,.035),rubber);button.position.set(0,.052,.02);model.add(button);
  model.userData.lens=lensMaterial;
  return model;
}

export function dropPosition(player,world) {
  let x=player.x,z=player.z;
  for(let distance=.1;distance<=.8;distance+=.1) {
    const nextX=player.x-Math.sin(player.yaw)*distance,nextZ=player.z-Math.cos(player.yaw)*distance;
    if(world.blocked(nextX,player.y,nextZ,false,playerHeight(player))) break;
    x=nextX;z=nextZ;
  }
  return {x,y:player.y+(player.crouched ? .65 : 1.05),z};
}

export function createItemModel(item){return item.type==='flashlight'?createFlashlightModel():createPropModel(item);}
export function disposeItemModel(model) {
  const geometry=new Set(),materials=new Set();model.traverse(child=>{if(child.isMesh||child.isLineSegments){geometry.add(child.geometry);for(const material of [].concat(child.material))materials.add(material);}});
  geometry.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());
}

export function createWorldItems(scene,world,seeds=[]) {
  world.onChairImpact=({chair,speed,position,owner})=>scene.dispatchEvent({type:'escape-prop-impact',item:{id:chair.id,kind:'chair',type:'wood',mass:chair.body.mass},speed,energy:chair.body.mass*speed*speed/2,position,owner,contact:{kind:'surface'},recentPlacement:false});
  world.onChairBreak=event=>scene.dispatchEvent({type:'escape-prop-break',item:{id:event.chair.id,kind:'chair',type:'wood',mass:6},...event});
  const entries=[],debris=[],flyingPeels=[],usedPeels=new Set(),brokenIds=new Set(),pending=new Map(),pendingScenery=new Map();let revision=0,time=0;
  const physics=createPropPhysics(world,(entry,speed,point,normal,target,contact)=>{
    if(entry.isDebris||entry.broken)return;
    const damage=target?windowDamage(entry.item,{speed}):0;
    if(target&&!target.broken&&damage>0)pendingScenery.set(target,{damage,speed,point,normal});
    const previous=pending.get(entry);if(!previous||previous.speed<speed)pending.set(entry,{speed,point,normal,contact});
  });
  function spawn(item,position,{mesh=null,quaternion=null,velocity=null,angularVelocity=null,sleep=false,source='dropped',thrown=false}={}) {
    if(brokenIds.has(item.id)||usedPeels.has(item.id))return null;
    mesh??=createItemModel(item);scene.attach(mesh);mesh.position.copy(position);if(quaternion)mesh.quaternion.copy(quaternion);else mesh.quaternion.identity();mesh.scale.set(1,1,1);
    const entry={item:{...item,on:false},mesh,x:position.x,y:position.y,z:position.z,source,thrown,broken:false};
    entries.push(entry);physics.add(entry,{position,quaternion,velocity,angularVelocity,sleep});revision++;return entry;
  }
  // Seed meshes stay in their original groups, so a closed refrigerator conceals its food.
  for(const seed of seeds) {
    const position=seed.mesh.getWorldPosition(new THREE.Vector3()),quaternion=seed.mesh.getWorldQuaternion(new THREE.Quaternion());
    const entry={...seed,...position,source:'scene',broken:false,thrown:false};entries.push(entry);physics.add(entry,{position,quaternion,sleep:true});
    if(entry.trackContainer){entry.body.type=Body.STATIC;entry.body.mass=0;entry.body.updateMassProperties();}
  }
  function remove(entry,{keepMesh=false}={}) {
    physics.remove(entry);const index=entries.indexOf(entry);if(index>=0)entries.splice(index,1);
    if(!keepMesh){entry.mesh.removeFromParent();disposeItemModel(entry.mesh);}revision++;
  }
  function tryBananaSlip(actor,from,slip){
    const dx=actor.x-from.x,dz=actor.z-from.z,lengthSquared=dx*dx+dz*dz;
    if(!actor.grounded||lengthSquared<1e-8||lengthSquared>1)return false;
    for(const entry of entries){
      if(entry.item.kind!=='bananaPeel'||entry.used||!visible(entry)||entry.body.velocity.lengthSquared()>1)continue;
      const p=entry.body.position,floor=world.support(p.x,p.z,p.y,.025,.05,[actor.collider]);
      if(!Number.isFinite(floor)||p.y<floor-.01||p.y-floor>.09||Math.abs(actor.y-floor)>.16||Math.abs(from.y-floor)>.4)continue;
      const t=Math.max(0,Math.min(1,((p.x-from.x)*dx+(p.z-from.z)*dz)/lengthSquared));
      if(Math.hypot(p.x-from.x-t*dx,p.z-from.z-t*dz)>.37||!world.lineClear({x:actor.x,y:floor+.12,z:actor.z},{x:p.x,y:floor+.12,z:p.z},[actor.collider]))continue;
      if(!slip(entry))continue;
      entry.used=true;usedPeels.add(entry.item.id);scene.attach(entry.mesh);remove(entry,{keepMesh:true});
      const length=Math.sqrt(lengthSquared),velocity=new THREE.Vector3(dx/length*3.5,2.8,dz/length*3.5);
      flyingPeels.push({mesh:entry.mesh,velocity,remaining:.65});
      entry.mesh.traverse(mesh=>{if(mesh.material){mesh.material.transparent=true;mesh.material.depthWrite=false;mesh.material.needsUpdate=true;}});
      scene.dispatchEvent({type:'escape-banana-slip',actor,item:entry.item,position:{x:p.x,y:p.y,z:p.z}});return true;
    }
    return false;
  }
  function breakItem(entry,impact) {
    const position=entry.body.position.clone(),velocity=entry.body.velocity.clone();entry.broken=true;entry.item.broken=true;brokenIds.add(entry.item.id);
    const color=entry.item.kind==='egg'?0xffd83e:entry.item.type==='glass'?0x9db6bc:0xc3bba8;
    remove(entry);
    fragments(position,color,velocity,7,entry.item.id);
    scene.dispatchEvent({type:'escape-prop-break',item:entry.item,position:impact.point});
  }
  function fragments(position,color,velocity={x:0,y:0,z:0},count=7,id='window') {
    for(let i=0;i<count;i++) {
      const mesh=new THREE.Mesh(new THREE.TetrahedronGeometry(.025,0),new THREE.MeshStandardMaterial({color,roughness:.65}));mesh.scale.y=.35;scene.add(mesh);
      const shard={item:{id:`shard-${id}-${i}-${time}`,size:[.035,.012,.04],mass:.012},mesh,isDebris:true,expires:time+7};
      const angle=i*Math.PI*2/count,point={x:position.x+Math.cos(angle)*.035,y:position.y+.035,z:position.z+Math.sin(angle)*.035};
      physics.add(shard,{position:point,debris:true,velocity:{x:velocity.x*.18+Math.cos(angle)*1.1,y:.6+i*.08,z:velocity.z*.18+Math.sin(angle)*1.1},angularVelocity:{x:i+2,y:3,z:5}});debris.push(shard);
    }
  }
  function breakScenery(target,impact) {
    if(!target.break())return false;
    physics.syncColliders();fragments(impact.point??target.center(),0xa2bbc0,{x:0,y:0,z:-1},12,target.id);revision++;
    scene.dispatchEvent({type:'escape-scenery-break',breakable:target,position:impact.point??target.center()});return true;
  }
  function damageScenery(target,damage,impact) {
    if(target.broken||damage<=0)return false;
    target.health=Math.max(0,target.health-damage);target.onDamage?.(target.health);revision++;
    return target.health===0?breakScenery(target,impact):false;
  }
  function strike(origin,direction,item,{damageScale=1}={}) {
    if(!item?.melee)return null;
    physics.syncColliders();
    const hit=physics.ray(origin,new THREE.Vector3().copy(origin).addScaledVector(direction,2.45));
    const attack={type:'escape-melee-strike',item,origin:origin.clone(),direction:direction.clone(),reach:hit?.distance??2.45,damage:item.damage*damageScale,hit:false};
    let result={hit:false,broken:false};
    if(hit) {
      const entry=hit.body.propEntry,target=hit.body.sceneSolid?.breakable;
      attack.struckItem=entry?.item;attack.hitKind=hit.body.actorBinding?'actor':target?.kind??(entry?'item':'surface');
      attack.surfaceMaterial=hit.body.sceneSolid?.audioMaterial??hit.shape?.audioMaterial??'stone';
      result={hit:true,broken:false,target:target??entry??hit.body.actorBinding?.actor};attack.hit=true;attack.position={...hit.hitPointWorld};
      if(target&&!target.broken) {
        result.broken=damageScenery(target,windowDamage(item,{melee:true}),{point:{...hit.hitPointWorld}});
      }else if(entry&&!entry.isDebris&&!entry.broken&&visible(entry)) {
        if(entry.item.fragile){breakItem(entry,{point:{...hit.hitPointWorld}});result.broken=true;}
        else {entry.body.wakeUp();entry.body.velocity.set(direction.x*4,Math.max(.6,direction.y*4),direction.z*4);}
      }
      hit.body.sceneSolid?.damageable?.hit?.({damage:item.damage*damageScale,item,damageScale,origin:origin.clone(),source:'melee',position:attack.position});
    }
    attack.broken=result.broken;
    scene.dispatchEvent(attack);return {...result,hit:result.hit||attack.hit};
  }
  function tick(dt,player=null) {
    time+=dt;
    for(let i=flyingPeels.length-1;i>=0;i--){
      const flight=flyingPeels[i];flight.remaining-=dt;revision++;
      if(flight.remaining<=0){flight.mesh.removeFromParent();disposeItemModel(flight.mesh);flyingPeels.splice(i,1);continue;}
      flight.velocity.y-=9.82*dt;flight.mesh.position.addScaledVector(flight.velocity,dt);flight.mesh.rotateX(dt*7);flight.mesh.rotateZ(dt*4);
      flight.mesh.traverse(mesh=>{if(mesh.material)mesh.material.opacity=Math.min(1,flight.remaining/.15);});
    }
    // Stored props follow their actual moving drawer until picked up. Releasing
    // the inventory item later creates an ordinary dynamic prop again.
    for(const entry of entries)if(entry.trackContainer) {
      const position=entry.mesh.getWorldPosition(new THREE.Vector3()),quaternion=entry.mesh.getWorldQuaternion(new THREE.Quaternion()),body=entry.body;
      if(position.distanceToSquared(body.position)>.0000001)revision++;
      body.position.copy(position);body.quaternion.copy(quaternion);body.aabbNeedsUpdate=true;
      physics.world.broadphase.dirty=true;
    }
    for(const entry of entries)if(entry.toppleAt!==undefined&&time>=entry.toppleAt) {
      delete entry.toppleAt;
      const body=entry.body,up=new THREE.Vector3(0,1,0).applyQuaternion(new THREE.Quaternion(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w));
      if(up.y>.85){body.wakeUp();body.angularVelocity.set(-Math.cos(entry.toppleYaw)*1.8,0,Math.sin(entry.toppleYaw)*1.8);}
    }
    if(physics.tick(dt,player))revision++;
    for(const [entry,impact] of pending) {
      if(!entries.includes(entry))continue;
      scene.dispatchEvent({type:'escape-prop-impact',item:entry.item,position:impact.point,normal:impact.normal,speed:impact.speed,energy:entry.item.mass*impact.speed*impact.speed/2,damage:entry.thrown?projectileDamage(entry.item,impact.speed,entry.damageScale??1):0,
        contact:impact.contact,broken:!!entry.item.fragile&&impact.speed>(entry.item.breakSpeed??7),recentPlacement:time-(entry.placedAt??-10)<.18});
      if(entry.item.fragile&&impact.speed>(entry.item.breakSpeed??7))breakItem(entry,impact);
    }
    pending.clear();
    for(const [target,impact] of pendingScenery)damageScenery(target,impact.damage,impact);
    pendingScenery.clear();
    for(const entry of [...entries,...debris]) {
      const b=entry.body;if(!b)continue;
      const moved=Math.hypot(entry.x-b.position.x,entry.y-b.position.y,entry.z-b.position.z)>.0005;
      if(moved||b.angularVelocity.length()>.05)revision++;
      entry.x=b.position.x;entry.y=b.position.y;entry.z=b.position.z;
      if(entry.trackContainer||entry.source==='scene'&&b.sleepState===2)continue;
      entry.mesh.parent?.updateWorldMatrix(true,false);
      const p=new THREE.Vector3(b.position.x,b.position.y,b.position.z),q=new THREE.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);
      if(entry.mesh.parent!==scene)scene.attach(entry.mesh);
      entry.mesh.position.copy(p);entry.mesh.quaternion.copy(q);entry.mesh.scale.set(1,1,1);
    }
    for(let i=debris.length-1;i>=0;i--)if(debris[i].expires<time||debris.length>42) {const entry=debris.splice(i,1)[0];physics.remove(entry);entry.mesh.removeFromParent();disposeItemModel(entry.mesh);revision++;}
    for(const entry of [...entries])if(entry.y<-18||Math.hypot(entry.x,entry.z)>60)remove(entry);
  }
  function visible(entry) {for(let node=entry.mesh;node;node=node.parent)if(!node.visible)return false;return true;}
  function nearby(player,direction,eyeHeight) {
    const from={x:player.x,y:player.y+eyeHeight,z:player.z},to={x:from.x+direction.x*2.4,y:from.y+direction.y*2.4,z:from.z+direction.z*2.4};
    const hit=physics.ray(from,to),entry=hit?.body?.propEntry;
    return entry&&!entry.isDebris&&!entry.broken&&entries.includes(entry)&&visible(entry)&&(!entry.available||entry.available())?entry:null;
  }
  function pickup(entry,inventory) {
    if(!entries.includes(entry)||entry.broken||brokenIds.has(entry.item.id)||!visible(entry)||(entry.available&&!entry.available())||inventory.store(entry.item)===-1)return false;
    const position={x:entry.x,y:entry.y,z:entry.z};remove(entry);scene.dispatchEvent({type:'escape-prop-pickup',item:entry.item,position});return true;
  }
  function release(item,player,{origin=null,direction=null,thrown=false}={}) {
    if(thrown&&item?.type==='key')return null;
    direction??=new THREE.Vector3(-Math.sin(player.yaw),0,-Math.cos(player.yaw));origin??=new THREE.Vector3(player.x,player.y+(player.crouched ? .65 : 1.05),player.z);
    const distance=thrown ? .55 : .5,limit=physics.ray(origin,origin.clone().addScaledVector(direction,distance),1),radius=Math.max(...item.size)/2;
    let travel=limit?Math.max(0,limit.distance-radius-.03):distance;
    if(thrown&&player.heldBy) {
      // Start in front of the grabbing capsule rather than inside it. The
      // ordinary physics contact then resolves the counterthrow at full speed.
      const holder=physics.ray(origin,origin.clone().addScaledVector(direction,distance+1),16);
      if(holder?.body.actorBinding?.actor===player.heldBy)travel=Math.min(travel,Math.max(0,holder.distance-radius-.02));
    }
    let position=origin.clone().addScaledVector(direction,travel);
    const clearance={ignoreActor:thrown?player.heldBy:null};
    if(!physics.canPlace(item,position,player.yaw,clearance)){position=origin.clone();if(!physics.canPlace(item,position,player.yaw,clearance))return null;}
    const velocity=thrown?{x:direction.x*11.5,y:direction.y*11.5+.7,z:direction.z*11.5}:{x:direction.x*.4,y:.05,z:direction.z*.4};
    const entry=spawn(item,position,{quaternion:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),player.yaw),velocity,angularVelocity:thrown?{x:5,y:7,z:2}:{x:0,y:.4,z:0},thrown});
    if(entry) {
      entry.damageScale=thrown?playerDamageScale(player):1;
      if(thrown)entry.thrownFrom={x:player.x,y:player.y+1.2,z:player.z};
      scene.dispatchEvent({type:'escape-prop-release',item:entry.item,position:{...position},thrown});
    }
    return entry;
  }
  function placement(item,origin,direction,player) {
    if(!item)return null;
    const hit=physics.ray(origin,new THREE.Vector3().copy(origin).addScaledVector(direction,3));if(!hit||hit.hitNormalWorld.y<.75)return null;
    const position=new THREE.Vector3(hit.hitPointWorld.x,hit.hitPointWorld.y+item.size[1]/2+.006,hit.hitPointWorld.z),yaw=player.yaw;
    if(Math.hypot(position.x-player.x,position.z-player.z)<.3+Math.max(item.size[0],item.size[2])/2&&position.y<player.y+playerHeight(player))return null;
    return {position,yaw,valid:physics.canPlace(item,position,yaw)};
  }
  function place(item,target) {
    if(!target?.valid||!physics.canPlace(item,target.position,target.yaw))return null;
    const entry=spawn(item,target.position,{quaternion:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),target.yaw)});
    if(entry){entry.placedAt=time;scene.dispatchEvent({type:'escape-prop-place',item:entry.item,position:{x:entry.x,y:entry.y,z:entry.z}});}
    if(entry&&item.kind==='crowbar'){entry.toppleAt=time+.18;entry.toppleYaw=target.yaw;}
    return entry;
  }
  return {entries,debris,brokenIds,physics,tryBananaSlip,get flyingPeels(){return flyingPeels;},confiscate(kind){for(const entry of [...entries])if(entry.item.kind===kind)remove(entry);},get drops(){return entries.filter(e=>e.source!=='scene');},drop:(item,player)=>release(item,player),throw:(item,player,origin,direction)=>release(item,player,{origin,direction,thrown:true}),placement,place,strike,tick,nearby,pickup,get revision(){return revision;}};
}
