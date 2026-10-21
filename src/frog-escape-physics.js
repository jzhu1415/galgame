import * as CANNON from 'cannon-es';
import {houseWidthScale,subtractRect,stairHeight,PLAYER_RADIUS,playerHeight} from './frog-escape-navigation.js';
import {createChairPhysics,CHAIR_GROUP} from './frog-escape-chairs.js';

const STATIC=1,PROP=2,PLAYER=4,DEBRIS=8,ACTOR=16,STEP=1/240;
export function createPropPhysics(navigation,onImpact) {
  const world=new CANNON.World({gravity:new CANNON.Vec3(0,-9.82,0),allowSleep:true});
  world.broadphase=new CANNON.SAPBroadphase(world);world.solver.iterations=8;
  world.defaultContactMaterial.friction=.48;world.defaultContactMaterial.restitution=.17;
  const moving=[],entries=new Set(),chunks=new Map(),actors=new Set();let accumulator=0,clock=0;
  function box(x,minY,z,hx,height,hz,angle=0,dynamic=false,audioMaterial='stone') {
    const shape=new CANNON.Box(new CANNON.Vec3(hx,height/2,hz));shape.audioMaterial=audioMaterial;
    if(!dynamic&&Math.max(hx,hz)<2&&height<6) {
      const cell=[Math.floor(x/4),Math.floor(minY/4),Math.floor(z/4)],key=cell.join('/');let body=chunks.get(key);
      if(!body){body=new CANNON.Body({mass:0,collisionFilterGroup:STATIC,collisionFilterMask:PROP|DEBRIS|CHAIR_GROUP});body.position.set(cell[0]*4+2,cell[1]*4+2,cell[2]*4+2);chunks.set(key,body);}
      const q=new CANNON.Quaternion();q.setFromEuler(0,angle,0);
      body.addShape(shape,new CANNON.Vec3(x-body.position.x,minY+height/2-body.position.y,z-body.position.z),q);return body;
    }
    const body=new CANNON.Body({mass:0,shape,collisionFilterGroup:STATIC,collisionFilterMask:PROP|DEBRIS|CHAIR_GROUP});
    body.position.set(x,minY+height/2,z);body.quaternion.setFromEuler(0,angle,0);body.updateAABB();world.addBody(body);return body;
  }
  for(const solid of navigation.solids) {
    if(solid.movableChair)continue;
    const angle=Math.atan2(-solid.axisX[1],solid.axisX[0]);
    const mutable=solid.dynamic||solid.breakable||solid.damageable;
    const [hx,hy,hz]=solid.halfSize??[solid.halfX,(solid.maxY-solid.minY)/2,solid.halfZ];
    const body=box(solid.x,(solid.centerY??(solid.minY+hy))-hy,solid.z,hx,hy*2,hz,angle,mutable,solid.audioMaterial);
    if(solid.quaternion){body.quaternion.copy(solid.quaternion);body.updateAABB();}
    if(mutable){body.sceneSolid=solid;moving.push({solid,body,angle});}
  }
  for(const slab of navigation.slabs)box((slab.minX+slab.maxX)/2,slab.underside,(slab.minZ+slab.maxZ)/2,(slab.maxX-slab.minX)/2,slab.height-slab.underside,(slab.maxZ-slab.minZ)/2);
  for(const surface of navigation.surfaces) {
    if(navigation.slabs.some(s=>s.minX===surface.minX&&s.maxX===surface.maxX&&s.minZ===surface.minZ&&s.maxZ===surface.maxZ))continue;
    if(navigation.solids.some(s=>Math.abs(s.maxY-surface.height)<.001&&Math.abs(s.x-(surface.minX+surface.maxX)/2)<.001&&Math.abs(s.z-(surface.minZ+surface.maxZ)/2)<.001))continue;
    box((surface.minX+surface.maxX)/2,surface.height-.2,(surface.minZ+surface.maxZ)/2,(surface.maxX-surface.minX)/2,.2,(surface.maxZ-surface.minZ)/2);
  }
  for(const stair of navigation.stairs) {
    const depth=Math.abs(stair.endZ-stair.startZ)/stair.steps;
    for(let i=0;i<stair.steps;i++) {
      const z=stair.startZ+(stair.endZ-stair.startZ)*(i+.5)/stair.steps,top=stairHeight(stair,z);
      box((stair.minX+stair.maxX)/2,top-.23,z,(stair.maxX-stair.minX)/2,.23,depth/2);
    }
  }
  const house={minX:-9*houseWidthScale,maxX:9*houseWidthScale,minZ:-7,maxZ:7};
  for(const r of subtractRect({minX:-40,maxX:40,minZ:-40,maxZ:40},house))box((r.minX+r.maxX)/2,-1.05,(r.minZ+r.maxZ)/2,(r.maxX-r.minX)/2,.22,(r.maxZ-r.minZ)/2);
  for(const c of navigation.circles) {
    if(c.npc)continue;
    const body=new CANNON.Body({mass:0,shape:new CANNON.Cylinder(c.radius,c.radius,c.maxY-c.minY,12),collisionFilterGroup:STATIC,collisionFilterMask:PROP|DEBRIS|CHAIR_GROUP});body.position.set(c.x,(c.minY+c.maxY)/2,c.z);body.updateAABB();world.addBody(body);
  }
  for(const body of chunks.values()) {
    body.updateAABB();body.shapeAABBs=body.shapes.map((shape,i)=>{
      const position=body.position.vadd(body.shapeOffsets[i]),q=body.shapeOrientations[i],aabb=new CANNON.AABB();
      shape.calculateWorldAABB(position,q,aabb.lowerBound,aabb.upperBound);return aabb;
    });world.addBody(body);
  }
  const playerBody=new CANNON.Body({type:CANNON.Body.KINEMATIC,collisionFilterGroup:PLAYER,collisionFilterMask:PROP|CHAIR_GROUP});let lastHeight=0;world.addBody(playerBody);
  const chairs=createChairPhysics({world,navigation,playerBody,onImpact:event=>navigation.onChairImpact?.(event),onBreak:event=>navigation.onChairBreak?.(event)});
  const contactMargin=item=>Math.min(...item.size)<.065?.0015:0;
  function shape(item) {
    const margin=contactMargin(item),[w,h,d]=item.size.map(value=>value+2*margin);
    if(item.shape==='sphere')return new CANNON.Sphere(Math.max(w,h,d)/2);
    if(item.shape==='cylinder')return new CANNON.Cylinder(w/2,w/2,h,16);
    return new CANNON.Box(new CANNON.Vec3(w/2,h/2,d/2));
  }
  function add(entry,{position,quaternion,velocity,angularVelocity,sleep=false,debris=false}) {
    const body=new CANNON.Body({mass:entry.item.mass??.2,shape:shape(entry.item),linearDamping:.18,angularDamping:.32,allowSleep:true,sleepSpeedLimit:.12,sleepTimeLimit:.55,
      collisionFilterGroup:debris?DEBRIS:PROP,collisionFilterMask:STATIC|PROP|CHAIR_GROUP|(debris?0:PLAYER|ACTOR)});
    body.position.copy(position);if(quaternion)body.quaternion.copy(quaternion);if(velocity)body.velocity.copy(velocity);if(angularVelocity)body.angularVelocity.copy(angularVelocity);
    body.propEntry=entry;body.born=clock;entry.body=body;entry.isDebris=debris;
    body.addEventListener('collide',event=>{
      if(entry.broken||entry.isDebris)return;
      const speed=Math.abs(event.contact.getImpactVelocityAlongNormal());
      if(event.body?.actorBinding)event.body.actorBinding.onImpact?.({entry,speed,position:{...body.position},velocity:{...body.velocity}});
      if(speed>.6)onImpact(entry,speed,{...body.position},{...event.contact.ni},event.body?.sceneSolid?.breakable,
        {kind:event.body?.actorBinding?'actor':event.body?.propEntry?'item':'surface',item:event.body?.propEntry?.item});
    });
    body.updateAABB();world.addBody(body);entries.add(entry);if(sleep)body.sleep();return body;
  }
  function wakeSupportedBy(removed) {
    // Authored props start asleep. Removing their support generates no contact
    // to wake them, so follow the stack upward before removing its base.
    const queue=[removed],seen=new Set(queue);
    for(let i=0;i<queue.length;i++) {
      const support=queue[i];if(support.aabbNeedsUpdate)support.updateAABB();
      const a=support.aabb;
      for(const candidate of entries) {
        const body=candidate.body;
        if(!body||body.type!==CANNON.Body.DYNAMIC||seen.has(body))continue;
        if(body.aabbNeedsUpdate)body.updateAABB();const b=body.aabb;
        if(b.lowerBound.y<a.upperBound.y-.025||b.lowerBound.y>a.upperBound.y+.055||
          b.upperBound.x<=a.lowerBound.x||b.lowerBound.x>=a.upperBound.x||
          b.upperBound.z<=a.lowerBound.z||b.lowerBound.z>=a.upperBound.z)continue;
        seen.add(body);queue.push(body);body.wakeUp();
      }
    }
  }
  function remove(entry){if(entry.body){wakeSupportedBy(entry.body);world.removeBody(entry.body);}entries.delete(entry);entry.body=null;}
  function ray(from,to,mask=STATIC|PROP|ACTOR|CHAIR_GROUP) {
    const hit=new CANNON.RaycastResult();world.raycastClosest(new CANNON.Vec3(from.x,from.y,from.z),new CANNON.Vec3(to.x,to.y,to.z),{collisionFilterMask:mask,collisionFilterGroup:PROP,skipBackfaces:true},hit);return hit.hasHit?hit:null;
  }
  const sweepHit=new CANNON.RaycastResult(),sweepEnd=new CANNON.Vec3(),sweepLocalNormal=new CANNON.Vec3(),sweepImpulse=new CANNON.Vec3(),sweepInverse=new CANNON.Quaternion();
  const sweepOptions={collisionFilterMask:STATIC|ACTOR,collisionFilterGroup:PROP,skipBackfaces:true};
  function actorShape(binding) {
    const {body,actor}=binding,height=actor.collider.maxY-actor.collider.minY,radius=Math.min(actor.collider.radius,height/2-.01);
    if(binding.height===height&&binding.radius===radius)return false;
    body.shapes.length=0;body.shapeOffsets.length=0;body.shapeOrientations.length=0;
    body.addShape(new CANNON.Cylinder(radius,radius,height-radius*2,12));
    for(const y of [-height/2+radius,height/2-radius])body.addShape(new CANNON.Sphere(radius),new CANNON.Vec3(0,y,0));
    body.updateBoundingRadius();binding.height=height;binding.radius=radius;return true;
  }
  function addActor(actor,onImpact) {
    const body=new CANNON.Body({type:CANNON.Body.KINEMATIC,collisionFilterGroup:ACTOR,collisionFilterMask:PROP|CHAIR_GROUP});
    const binding={actor,body,onImpact};body.actorBinding=binding;body.sceneSolid={damageable:actor.damageable};actors.add(binding);actorShape(binding);
    body.position.set(actor.x,actor.y+binding.height/2,actor.z);body.updateAABB();world.addBody(body);
    return {body,remove(){world.removeBody(body);actors.delete(binding);}};
  }
  function syncActors() {
    let changed=false;
    for(const binding of actors) {
      const reshaped=actorShape(binding),{body,actor}=binding,y=actor.y+binding.height/2;
      const mask=!actor.collider.enabled||actor.collider.enabled()?PROP|CHAIR_GROUP:0;
      if(reshaped||body.position.x!==actor.x||body.position.y!==y||body.position.z!==actor.z||body.collisionFilterMask!==mask) {
        body.position.set(actor.x,y,actor.z);body.aabbNeedsUpdate=true;body.collisionFilterMask=mask;changed=true;
      }
      body.velocity.set(0,0,0);body.angularVelocity.set(0,0,0);
    }
    if(changed)world.broadphase.dirty=true;
  }
  function syncMoving(dt) {
    for(const binding of moving) {
      const {solid,body}=binding,y=solid.centerY??(solid.minY+solid.maxY)/2,angle=Math.atan2(-solid.axisX[1],solid.axisX[0]);
      const mask=!solid.enabled||solid.enabled()?PROP|DEBRIS|CHAIR_GROUP:0;
      if(body.collisionFilterMask!==mask){body.collisionFilterMask=mask;world.broadphase.dirty=true;}
      const q=solid.quaternion,rotationDelta=q?Math.abs(q.x-body.quaternion.x)+Math.abs(q.y-body.quaternion.y)+Math.abs(q.z-body.quaternion.z)+Math.abs(q.w-body.quaternion.w):Math.abs(binding.angle-angle);
      const delta=Math.hypot(body.position.x-solid.x,body.position.y-y,body.position.z-solid.z)+rotationDelta;
      body.velocity.set(0,0,0);body.angularVelocity.set(0,0,0);
      if(delta<.000001)continue;
      body.velocity.set((solid.x-body.position.x)/Math.max(dt,STEP),(y-body.position.y)/Math.max(dt,STEP),(solid.z-body.position.z)/Math.max(dt,STEP));
      if(!q)body.angularVelocity.y=(angle-binding.angle)/Math.max(dt,STEP);
      body.position.set(solid.x,y,solid.z);if(q)body.quaternion.copy(q);else body.quaternion.setFromEuler(0,angle,0);body.aabbNeedsUpdate=true;binding.angle=angle;
      for(const e of entries)if(e.body.position.distanceTo(body.position)<body.boundingRadius+e.body.boundingRadius+.1)e.body.wakeUp();
      for(const chair of chairs.records)if(!chair.broken&&chair.body.position.distanceTo(body.position)<body.boundingRadius+chair.body.boundingRadius+.1)chair.body.wakeUp();
      world.broadphase.dirty=true;
    }
  }
  function tick(dt,player) {
    dt=Math.min(Math.max(dt,0),.08);clock+=dt;syncMoving(dt);syncActors();chairs.beforeTick(dt,player);
    if(player) {
      const height=playerHeight(player);
      if(height!==lastHeight) {
        playerBody.shapes.length=0;playerBody.shapeOffsets.length=0;playerBody.shapeOrientations.length=0;
        playerBody.addShape(new CANNON.Cylinder(PLAYER_RADIUS,PLAYER_RADIUS,height-2*PLAYER_RADIUS,12));
        for(const y of [-height/2+PLAYER_RADIUS,height/2-PLAYER_RADIUS])playerBody.addShape(new CANNON.Sphere(PLAYER_RADIUS),new CANNON.Vec3(0,y,0));
        lastHeight=height;
      }
      const y=player.y+height/2;
      if(playerBody.position.x!==player.x||playerBody.position.y!==y||playerBody.position.z!==player.z||playerBody.collisionFilterMask!==(PROP|CHAIR_GROUP)||playerBody.aabbNeedsUpdate) {
        playerBody.position.set(player.x,y,player.z);playerBody.aabbNeedsUpdate=true;world.broadphase.dirty=true;
      }
      playerBody.collisionFilterMask=PROP|CHAIR_GROUP;
    }else playerBody.collisionFilterMask=0;
    accumulator+=dt;let steps=0;
    // Sleeping rigid bodies need no constraint solve. Keep the same fixed-step
    // clock; throws, chair pushes/kicks, moving fixtures and delayed toppling
    // wake their bodies before this check and still receive every 1/240 s step.
    let awake=chairs.records.some(chair=>!chair.broken&&chair.body.sleepState!==CANNON.Body.SLEEPING);
    if(!awake)for(const entry of entries)if(entry.body.type===CANNON.Body.DYNAMIC&&entry.body.sleepState!==CANNON.Body.SLEEPING){awake=true;break;}
    if(!awake) {
      const idleSteps=Math.min(24,Math.floor(accumulator/STEP));accumulator-=idleSteps*STEP;
      world.time+=idleSteps*STEP;world.stepnumber+=idleSteps;world.dt=STEP;
      return chairs.sync();
    }
    while(accumulator>=STEP&&steps++<24) {
      for(const e of entries) {
        const b=e.body;if(b.sleepState===CANNON.Body.SLEEPING)continue;
        const speedSquared=b.velocity.lengthSquared();if(speedSquared>24*24)b.velocity.scale(24/Math.sqrt(speedSquared),b.velocity);
        b.collisionFilterMask=STATIC|PROP|CHAIR_GROUP|(!e.isDebris?ACTOR:0)|(!e.isDebris&&clock-b.born>.2?PLAYER:0);
        if(speedSquared>4*4) {
          sweepEnd.set(b.position.x+b.velocity.x*STEP,b.position.y+b.velocity.y*STEP,b.position.z+b.velocity.z*STEP);
          sweepHit.reset();world.raycastClosest(b.position,sweepEnd,sweepOptions,sweepHit);const hit=sweepHit.hasHit?sweepHit:null;
          if(hit&&b.velocity.dot(hit.hitNormalWorld)<0) {
            const speed=Math.abs(b.velocity.dot(hit.hitNormalWorld)),n=hit.hitNormalWorld;
            onImpact(e,speed,{...hit.hitPointWorld},{...n},hit.body?.sceneSolid?.breakable,{kind:hit.body?.actorBinding?'actor':'surface'});
            hit.body?.actorBinding?.onImpact?.({entry:e,speed,position:{...hit.hitPointWorld},velocity:{...b.velocity}});
            b.quaternion.inverse(sweepInverse);const local=sweepInverse.vmult(n,sweepLocalNormal),[w,h,d]=e.item.size.map(value=>value+2*contactMargin(e.item));
            const extent=e.item.shape==='sphere'?Math.max(w,h,d)/2:Math.abs(local.x)*w/2+Math.abs(local.y)*h/2+Math.abs(local.z)*d/2;
            b.position.set(hit.hitPointWorld.x+n.x*(extent+.003),hit.hitPointWorld.y+n.y*(extent+.003),hit.hitPointWorld.z+n.z*(extent+.003));
            const inbound=b.velocity.dot(n);
            if(inbound<0){n.scale(1.17*inbound,sweepImpulse);b.velocity.vsub(sweepImpulse,b.velocity);}b.aabbNeedsUpdate=true;
          }
        }
      }
      chairs.step();world.step(STEP);chairs.afterStep();accumulator-=STEP;
    }
    return chairs.sync();
  }
  function canPlace(item,position,yaw=0,{ignoreActor=null}={}) {
    const probe=new CANNON.Body({mass:0,shape:shape(item)});probe.position.copy(position);probe.quaternion.setFromEuler(0,yaw,0);probe.updateAABB();
    const a=probe.aabb;
    for(const b of world.bodies) {
      if(b===playerBody||b.actorBinding?.actor===ignoreActor||b.collisionFilterGroup===DEBRIS||!b.collisionFilterMask)continue;if(b.aabbNeedsUpdate)b.updateAABB();const q=b.aabb;
      const overlaps=q=>a.lowerBound.x<q.upperBound.x-.003&&a.upperBound.x>q.lowerBound.x+.003&&a.lowerBound.y<q.upperBound.y-.004&&a.upperBound.y>q.lowerBound.y+.004&&a.lowerBound.z<q.upperBound.z-.003&&a.upperBound.z>q.lowerBound.z+.003;
      if(overlaps(q)&&(!b.shapeAABBs||b.shapeAABBs.some(overlaps)))return false;
    }
    return true;
  }
  return {world,add,remove,tick,ray,canPlace,entries,chairs,addActor,syncActors,syncColliders:()=>{syncMoving(STEP);syncActors();}};
}
