import * as THREE from 'three';
import {NAIWA_SLIP,slipDistance} from './frog-escape-naiwa-slip.js';
import {advancePlayer,houseWidthScale,playerHeight} from './frog-escape-navigation.js';
import {createNaiwaModel} from './frog-escape-naiwa-model.js';
import {createPursuitPathfinder} from './frog-escape-pursuit-path.js';
import {createObstacleRecovery} from './frog-escape-obstacle-recovery.js';
import {searchLookPose} from './frog-escape-search-look.js';
import {NAIWA_SKILLS,NAIWA_BED_PULL,standingOnBed,elevatedPlayerInReach,createSkillDisplacement,advanceSkillDisplacement} from './frog-escape-naiwa-skills.js';
import {alertnessPhase,displayAlertnessPhase,changeAlertness,itemAlertnessChange,itemDamage,isSoftProjectile,damagePlayer,naiwaAttackDamage,WAKE_ALERTNESS_REDUCTION,difficultyRules,displayAlertness,projectileDamage,ESCAPE_DIFFICULTIES} from './frog-escape-vitals.js';
import {NAIWA_DEFENSE,incomingFromFront,flashlightHitsEyes} from './frog-escape-naiwa-defense.js';
import {createRoomInvestigation,roomContaining} from './frog-escape-investigation.js';
import {createEscapeNoise} from './frog-escape-noise.js';
import {inNaiwaView,observedStairLanding,flashlightEvidence,naiwaSenses} from './frog-escape-perception.js';
import {fixtureHandTargets} from './frog-escape-naiwa-actions.js';
import {createNaiwaProps} from './frog-escape-naiwa-props.js';
import {playerInDoorSwing,doorImpactLocked,setCastleDoorOpen} from './frog-escape-doors.js';
import {createDoorDisplacement,advanceDoorDisplacement} from './frog-escape-door-displacement.js';
import {TRANSPARENT,isTransparent,createTransparentNavigation,createWindowTraversal,resolveWindowPassages} from './frog-escape-transparent.js';
import {NAIWA_HANDWALK} from './frog-escape-naiwa-handwalk.js';

export const naiwaPatrol=[
  {x:1.8,y:.15,z:5.6},{x:4.9,y:.15,z:-1.5},{x:1,y:.15,z:-5.3},
  {x:5,y:-.83,z:-10},{x:15,y:-.7,z:3.2},{x:16,y:-.83,z:-7},{x:1,y:.15,z:-5.3},
  {x:1,y:5.15,z:-5.2},{x:1,y:5.15,z:3.8},{x:-2.8,y:5.15,z:3.8},
  {x:1,y:5.15,z:-5.2},{x:-1,y:-5.05,z:3.7},{x:3,y:-5.05,z:-4.8},{x:1.8,y:.15,z:5.6},
];
const labels={patrol:'奶蛙正在巡逻',chase:'奶蛙发现了你！',search:'奶蛙正在附近搜寻',stunned:'奶蛙被击中，暂时踉跄',down:'奶蛙暂时倒地',grab:'奶蛙伸手抓你，快躲开！',caught:'奶蛙抓到了你',slam:'奶蛙高举右拳，快避开！',pull:'奶蛙伸出右手，快避开！'};
Object.assign(labels,{'cabinet-prepare':'奶蛙停在柜前，准备检查衣柜','cabinet-search':'奶蛙正在打开衣柜搜查','bed-search':'奶蛙双手撑地，正在查看床底','bed-reach':'奶蛙伸出右手抓向床底！','bed-rise':'奶蛙正在从地上起身'});
labels.kick='奶蛙抬脚踹开挡路的椅子！';

export function createNaiwaPursuer({scene,navigation,doors,interactables=[],beds=[],rooms=[],worldItems,player,onCatch=()=>{},onState=()=>{},random=Math.random,patrolRoute=naiwaPatrol,spawn={x:1.8,y:.15,z:5.6},difficulty='normal'}) {
  const model=createNaiwaModel();scene.add(model.root);
  const actor={kind:'pursuer',name:'奶蛙',...spawn,yaw:0,pitch:0,bodyHeight:2.1,velocityY:0,grounded:true,crouched:false,radius:.4};
  let state='patrol',time=0,grace=5,stun=0,health=difficultyRules(difficulty).naiwaHealth,lastDamage=-10,noiseCooldown=0,searchTime=0,memory=0,grabTime=0;
  let downCount=0,difficultyLocked=false,bananaSlip=null;
  let lastKnown=null,path=[],goal=null,routeIndex=0,dwell=0,planWait=0,stuck=0,mapLayer='all',disposed=false;
  let lookOrigin=null,lookTime=0,lookYaw=0,lookPitch=0;
  let chaseTargetVisible=false;
  let skill=null,skillCooldown=0,nextSkill='slam',playerForce=null;
  let operation=null,kick=null,kickCooldown=0,doorForce=null;
  let frame=0,gravityFrame=-1,chairProgress=null,shadowStamp=-1;
  const chairAvoided=new Map();
  let runDifficulty=difficulty,alertness=difficultyRules(difficulty).initialAlertness;
  Object.defineProperty(actor,'alertness',{get:()=>alertness});
  let holdDuration=.65,lastStruggle=-10,struggleAttempts=0;
  let flashlightSource=()=>null,lightLit=false,lightAmount=0,guardAmount=0,guardUntil=-1,lastPoseSpeed=0;
  const collider={x:actor.x,z:actor.z,radius:.4,minY:actor.y,maxY:actor.y+2.1,npc:true,enabled:()=>!disposed};actor.collider=collider;
  navigation.circles.push(collider);
  const props=createNaiwaProps({scene,model,actor,navigation});
  const doorClosures=new Map(),vaseImpacts=new Map();
  const routeNavigation=createTransparentNavigation(navigation,()=>isTransparent(alertness));
  const traversal=createWindowTraversal({actor,navigation:routeNavigation,onEvent:event=>scene.dispatchEvent({type:'escape-pursuer-window',actor,...event})});
  let resolvedPassages=null;
  const passages=()=>{if(!isTransparent(alertness))return [];resolvedPassages??=resolveWindowPassages(routeNavigation,navigation.windowPassages??[],[collider],actor.standingHeight);return resolvedPassages.filter(passage=>traversal.allowed(passage));};
  const planner=createPursuitPathfinder(routeNavigation,{radius:.44,height:2.1,passages});
  let cuttersTracked=false,trackingSource=()=>false;
  const hasPlayerScent=()=>Math.hypot(player.x-actor.x,player.y-actor.y,player.z-actor.z)<=TRANSPARENT.smellRange;
  const tracksPlayer=()=>cuttersTracked||trackingSource();
  const recovery=createObstacleRecovery({actor,navigation,doors,interactables,
    onReplan:()=>{path=[];goal=null;planWait=0;},
    onAction:({stage,obstacle})=>{if(obstacle&&['interact','reverse'].includes(stage))startOperation(obstacle,obstacle.open);scene.dispatchEvent({type:'escape-pursuer-unstick',stage,obstacle,actor});}});
  const hitItems=new Map();
  const noise=createEscapeNoise({scene,player,doors,interactables});
  const investigation=createRoomInvestigation({rooms,beds,interactables,navigation,actor,player,random,
    onEvent:event=>{if(event.stage==='inspect'&&event.kind==='wardrobe')startOperation(interactables.find(action=>action.id===event.fixtureId),true);scene.dispatchEvent({type:'escape-pursuer-investigation',actor,...event});}});
  let investigationTime=0,witnessedHide=null;
  const handWalking=()=>alertness>=70;
  const stateLabel=state=>state==='chase'?(isTransparent(alertness)?'奶蛙正在循着气息追踪你！':chaseTargetVisible?labels.chase:'奶蛙正在追踪你最后出现的位置'):handWalking()?({slam:'奶蛙高举左脚，快避开！',pull:'奶蛙伸出左脚，快避开！',grab:'奶蛙用左脚抓你，快躲开！',kick:'奶蛙用左脚砸开挡路的椅子！'}[state]??labels[state]):labels[state];
  function syncBodyProfile(){
    const height=handWalking()?NAIWA_HANDWALK.height:2.1;
    if(actor.standingHeight!==height){actor.standingHeight=height;planner.setHeight(height);path=[];goal=null;planWait=0;resolvedPassages=null;}
    actor.handWalking=handWalking();actor.eyeHeight=handWalking()?NAIWA_HANDWALK.eyeHeight:1.93;
    actor.bodyHeight=traversal.active?.9:height;
  }
  let observedPoint=null,rememberedLanding=null,lostTravel=0,lostStall=0,searchTravel=0;
  let currentBeam=null,lightCheck=0,lastLightNotice=null;
  const chairSolids=()=>(navigation.chairs??[]).flatMap(chair=>chair.colliders);
  const movement={chairs:navigation.chairs,overlapsBox:navigation.overlapsBox,support:(x,z,y,a)=>routeNavigation.support(x,z,y,a,.4,chairSolids()),ceiling:(x,z,y)=>routeNavigation.ceiling(x,z,y,.4),pushObstacles:(...args)=>navigation.pushObstacles?.(...args),
    blocked:(x,y,z,step,height,radius=.4,ignore=[])=>routeNavigation.blocked(x,y,z,step,height,radius,[collider,...ignore])
      ||y<player.y+playerHeight(player)&&y+height>player.y&&Math.hypot(x-player.x,z-player.z)<.71
        &&Math.hypot(x-player.x,z-player.z)<Math.hypot(actor.x-player.x,actor.z-player.z)-.000001};
  function publishAlertness(source) {
    syncBodyProfile();
    scene.dispatchEvent({type:'escape-pursuer-alertness',value:alertness,displayValue:displayAlertness(alertness,runDifficulty),phase:displayAlertnessPhase(alertness,runDifficulty),source,actor});
  }
  function addAlertness(amount,source) {
    const before=alertness;alertness=difficultyRules(runDifficulty).fixedAlertness??changeAlertness(alertness,amount);
    if(alertness!==before)publishAlertness(source);
  }
  function transition(next) {
    if(state===next)return;state=next;lookOrigin=null;lookTime=0;lookYaw=lookPitch=0;onState({state,text:stateLabel(state)});
    if(next==='search')searchTravel=0;
    scene.dispatchEvent({type:'escape-pursuer-state',state,actor});
  }
  function releaseHold() {if(player.heldBy===actor)player.heldBy=null;}
  function canGrabPlayer(airborne=false) {
    const raised=player.y-actor.y;
    return !player.hidden&&!player.hidingBed&&(Math.abs(raised)<.7||airborne&&raised>=-.35&&raised<1.55)
      &&Math.hypot(player.x-actor.x,player.z-actor.z)<1.08
      &&navigation.lineClear({x:actor.x,y:actor.y+1.45,z:actor.z},{x:player.x,y:player.y+Math.min(1.05,playerHeight(player)*.7),z:player.z},[collider]);
  }
  function holdPlayer() {
    if(state!=='grab'){transition('grab');grabTime=0;recovery.pause();}
    if(player.heldBy!==actor){grabTime=0;holdDuration=alertness<30?1.5:.65;lastStruggle=-10;struggleAttempts=0;}
    player.heldBy=actor;player.velocityY=Math.min(0,player.velocityY);
    onState({state:'grab',text:holdDuration===1.5?'奶蛙抱住了你！1.5 秒内反击，或连续点跳挣脱！':handWalking()?'奶蛙用左脚抓住了你，无法跳跃！快反击！':'奶蛙抱住了你，无法跳跃！快反击！'});
  }
  function struggleJump() {
    if(state!=='grab'||player.heldBy!==actor||holdDuration!==1.5||grabTime>=holdDuration||time-lastStruggle<.12)return false;
    lastStruggle=time;struggleAttempts++;
    scene.dispatchEvent({type:'escape-player-struggle',actor,attempt:struggleAttempts});
    if(random()>=Math.min(.45,.15+struggleAttempts*.05))return false;
    releaseHold();grabTime=0;stun=.65;grace=.9;path=[];goal=null;recovery.pause();transition('stunned');
    onState({state:'stunned',text:'你挣脱了奶蛙，快跑！'});return true;
  }
  function startOperation(obstacle,wanted) {
    if(!obstacle||obstacle.locked||doorImpactLocked(obstacle))return;
    if(wanted&&obstacle.parts&&!doorClosures.has(obstacle)) {
      const side=(actor.x-obstacle.x)*obstacle.normal[0]+(actor.z-obstacle.z)*obstacle.normal[1];
      doorClosures.set(obstacle,{side:Math.sign(side)||1,wait:0,started:time});
    }
    if(obstacle.parts)setCastleDoorOpen(obstacle,wanted,actor);else {obstacle.open=wanted;obstacle.noiseOwner=actor;}
    if(operation?.obstacle===obstacle&&operation.wanted===wanted)return;
    if(operation)operation.obstacle.naiwaReachDelay=0;
    operation={obstacle,wanted,elapsed:0,release:0,ready:handWalking()};
    obstacle.naiwaReachDelay=!handWalking()&&Math.abs(obstacle.amount-(wanted?1:0))>.02?.18:0;
  }
  function updateOperation(dt) {
    if(!operation)return;operation.elapsed+=dt;
    const {obstacle,wanted}=operation;
    if(handWalking()){operation.ready=true;obstacle.naiwaReachDelay=0;}
    const targets=Object.values(fixtureHandTargets(obstacle,actor)),center=targets.reduce((sum,point)=>sum.add(point),new THREE.Vector3()).multiplyScalar(1/Math.max(1,targets.length));
    const facing=Math.atan2(actor.x-center.x,actor.z-center.z),turn=Math.atan2(Math.sin(facing-actor.yaw),Math.cos(facing-actor.yaw));
    if(!handWalking()&&!skill&&!kick)actor.yaw+=THREE.MathUtils.clamp(turn,-6*dt,6*dt);
    if(!operation.ready) {
      operation.ready=operation.elapsed>=.18&&Math.abs(turn)<.18;
      obstacle.naiwaReachDelay=operation.ready?0:.05;
    }
    if(operation.elapsed>.4&&(Math.abs(obstacle.amount-(wanted?1:0))<.02||obstacle.noiseOwner!==actor||operation.elapsed>3))operation.release+=dt;
    if(operation.release>.25){obstacle.naiwaReachDelay=0;operation=null;}
  }
  function closePassedDoors(dt) {
    if(investigation.inspecting)return false;
    for(const [door,pending]of doorClosures) {
      if(doorImpactLocked(door))continue;
      if(!door.open||time-pending.started>12){doorClosures.delete(door);continue;}
      const side=(actor.x-door.x)*door.normal[0]+(actor.z-door.z)*door.normal[1],distance=Math.hypot(actor.x-door.x,actor.z-door.z);
      const reach=Math.max(2.2,door.width/door.parts.length+.85);
      if(side*pending.side>=-.65||playerInDoorSwing(door,actor)||distance>reach||Math.abs(actor.y-door.y)>1.05)continue;
      pending.wait+=dt;if(pending.wait<.04||operation&&(operation.obstacle!==door||!operation.wanted)||canGrabPlayer())continue;
      startOperation(door,false);operation.closingDoor=true;doorClosures.delete(door);return true;
    }
    return !!operation?.closingDoor;
  }
  function pullContactTarget() {
    const dx=player.x-actor.x,dz=player.z-actor.z,distance=Math.hypot(dx,dz)||1;
    return new THREE.Vector3(player.x-dx/distance*.20,player.y+(handWalking()?.10:Math.min(.65,playerHeight(player)*.5)),player.z-dz/distance*.20);
  }
  function advanceActor(dx,dz,dt) {
    advancePlayer(actor,dx,dz,gravityFrame===frame?0:dt,movement);
    if(dt>0)gravityFrame=frame;
  }
  function updatePose(dt,speed=0) {
    syncBodyProfile();
    if(traversal.active)gravityFrame=frame;
    if(dt>0&&gravityFrame!==frame)advanceActor(0,0,dt);
    lastPoseSpeed=speed;
    const down=state==='down',low=investigation.prone;collider.x=actor.x;collider.z=actor.z;collider.radius=traversal.active?.2:down?.28:.4;collider.minY=actor.y;collider.maxY=actor.y+(low?.6:down?.8:actor.bodyHeight);
    model.root.position.set(actor.x,actor.y,actor.z);model.root.rotation.set(0,actor.yaw+Math.PI,0);
    const layer=actor.y<-2?'basement':actor.y>3?'upper':Math.abs(actor.x)<9*houseWidthScale&&Math.abs(actor.z)<7?'ground':'yard';
    const bedInspecting=state.startsWith('bed-');
    let reachTargets=null,reachAmount=0,bodyLean=0,kickAmount=0;
    if(skill?.kind==='pull') {
      const envelope=THREE.MathUtils.smoothstep(skill.elapsed,0,skill.config.impact-.08)*(1-THREE.MathUtils.smoothstep(skill.elapsed,skill.config.duration-.28,skill.config.duration));
      reachTargets={[handWalking()?'R':'L']:pullContactTarget()};reachAmount=envelope;
      bodyLean=handWalking()?0:envelope*THREE.MathUtils.clamp(.65+(Math.hypot(player.x-actor.x,player.z-actor.z)-1)*.25,.55,.9);
    }else if(!handWalking()&&operation&&!bedInspecting&&!['down','stunned','grab','caught','kick'].includes(state)) {
      reachTargets=fixtureHandTargets(operation.obstacle,actor);
      reachAmount=THREE.MathUtils.smoothstep(operation.elapsed,0,.18)*(1-THREE.MathUtils.smoothstep(operation.release,0,.25));
      const distance=Math.max(...Object.values(reachTargets).map(point=>Math.hypot(point.x-actor.x,point.z-actor.z)));
      bodyLean=THREE.MathUtils.clamp((distance-.6)*.5,.12,.65)*reachAmount;
    }
    if(kick)kickAmount=THREE.MathUtils.smoothstep(kick.elapsed,0,.28)*(1-THREE.MathUtils.smoothstep(kick.elapsed,.35,.75));
    model.root.userData.interactionHands=!handWalking()&&reachTargets?Object.keys(reachTargets):[];
    const invisible=!!difficultyRules(runDifficulty).invisible;
    model.root.visible=!invisible&&(mapLayer==='all'||mapLayer===layer);model.animate(dt,{speed,state,stun,lookYaw,lookPitch,lookTarget:investigation.lookTarget,actionTime:skill?.elapsed??kick?.elapsed??investigationTime,variant:skill?.bed?'bed':null,guardAmount:bedInspecting?0:guardAmount,lightAmount:bedInspecting?0:lightAmount,reachTargets,reachAmount,bodyLean,kickAmount,slipElapsed:bananaSlip?.elapsed??null,intelligent:alertnessPhase(alertness).id==='intelligent'&&!traversal.active,handWalking:handWalking()});
    if(traversal.active){model.root.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),traversal.lean));model.root.position.y-=traversal.lean*.25/1.2;}
    props.update(state,{invisible});
  }
  function lightSpeedScale(){return !lightLit?1:alertnessPhase(alertness).id==='tangwang'?NAIWA_DEFENSE.tangwangLightSpeedScale:NAIWA_DEFENSE.lightSpeedScale;}
  function updateDefense(dt) {
    model.root.position.set(actor.x,actor.y,actor.z);model.root.rotation.set(0,actor.yaw+Math.PI,0);
    const beam=flashlightSource();currentBeam=beam;
    const lit=!isTransparent(alertness)&&state!=='down'&&state!=='caught'&&!!beam?.enabled&&flashlightHitsEyes(beam,actor,model.getEyePositions(),navigation,lookYaw);
    if(lit!==lightLit){lightLit=lit;scene.dispatchEvent({type:'escape-pursuer-light',actor,active:lit});}
    const target=state==='down'||state==='caught'?0:lightLit||time<guardUntil?1:0,before=guardAmount;
    const step=dt/(target>guardAmount?NAIWA_DEFENSE.raiseTime:NAIWA_DEFENSE.lowerTime);
    guardAmount=target>guardAmount?Math.min(target,guardAmount+step):Math.max(target,guardAmount-step);
    const previousLight=lightAmount,lightTarget=lightLit?1:0,lightStep=dt/(lightTarget>lightAmount?NAIWA_DEFENSE.raiseTime:NAIWA_DEFENSE.lowerTime);
    lightAmount=lightTarget>lightAmount?Math.min(lightTarget,lightAmount+lightStep):Math.max(lightTarget,lightAmount-lightStep);
    return Math.abs(guardAmount-before)>.00001||Math.abs(lightAmount-previousLight)>.00001;
  }
  function visiblePlayer() {
    if(isTransparent(alertness)||player.hidden||player.hidingBed)return false;
    return visiblePoint(player);
  }
  function visiblePoint(point,strict=false) {
    if(isTransparent(alertness))return false;
    const target={x:point.x,y:point.y+Math.min(1.5,playerHeight(point)*.86),z:point.z};
    const senses=naiwaSenses(alertness);
    return inNaiwaView(actor,target,{lookYaw,range:point.crouched?senses.crouchedRange:senses.standingRange,frontDot:senses.frontDot,nearRange:senses.nearRange,strict})
      &&navigation.lineClear({x:actor.x,y:actor.y+actor.eyeHeight,z:actor.z},target,[collider]);
  }
  function observeHiding({kind,target,position=player}) {
    if(grace>0||stun>0||state==='caught'||investigation.inspecting||!visiblePoint(position,true))return false;
    if(witnessedHide===target.id&&investigation.exact)return true;
    if(!investigation.begin(position,{exact:{kind,target},alertness}))return false;
    witnessedHide=target.id;path=[];goal=null;planWait=0;memory=0;searchTime=8;lastKnown={x:position.x,y:position.y,z:position.z};
    transition('search');return true;
  }
  function noticeFlashlight(dt,sees) {
    lightCheck=Math.max(0,lightCheck-dt);
    if(isTransparent(alertness)||sees||state==='chase'||state==='grab'||memory>0||player.heldBy===actor||grace>0||lightCheck>0||!currentBeam||investigation.exact||investigation.inspecting)return;
    const senses=naiwaSenses(alertness);lightCheck=senses.lightInterval;
    const evidence=flashlightEvidence(currentBeam,actor,navigation,lookYaw,{range:senses.lightRange,frontDot:senses.frontDot});
    if(!evidence)return;
    const spot=evidence.position;
    if(lastLightNotice&&time-lastLightNotice.time<2&&Math.hypot(spot.x-lastLightNotice.x,spot.z-lastLightNotice.z)<1)return;
    let exact=null;
    if(evidence.sourceVisible||evidence.sourceDistance<2) {
      const source=new THREE.Vector3(currentBeam.origin.x,currentBeam.origin.y,currentBeam.origin.z);
      for(const bed of beds) {
        bed.root.updateWorldMatrix(true,false);const p=bed.root.worldToLocal(source.clone());
        if(Math.abs(p.x)<bed.width/2&&Math.abs(p.z)<1.1&&p.y>=0&&p.y<.72){exact={kind:'bed',target:bed};break;}
      }
      if(!exact)for(const action of interactables) {
        const v=action.hideVolume;if(!v)continue;
        v.root.updateWorldMatrix(true,false);const p=v.root.worldToLocal(source.clone());
        if(p.x>v.minX&&p.x<v.maxX&&p.z>v.minZ&&p.z<v.maxZ&&p.y>=v.floor&&p.y<v.ceiling){exact={kind:'wardrobe',target:action};break;}
      }
    }
    lastLightNotice={x:spot.x,z:spot.z,time};
    if(!exact&&investigation.active)return;
    const room=roomContaining(rooms,spot),floor=room?.floor??navigation.support(spot.x,spot.z,spot.y,.2,.4);
    lastKnown={x:spot.x,y:Number.isFinite(floor)?floor:actor.y,z:spot.z};memory=0;searchTime=8;searchTravel=0;path=[];goal=null;planWait=0;
    investigation.begin(lastKnown,{exact,alertness});witnessedHide=exact?.target.id??null;
    transition('search');onState({state:'search',text:'奶蛙注意到了手电光，正在寻找来源！'});
    scene.dispatchEvent({type:'escape-pursuer-light-notice',actor,position:{...spot},fixtureId:exact?.target.id??null});
  }
  function interruptAction(){
    if(skill)scene.dispatchEvent({type:'escape-pursuer-skill',kind:skill.kind,stage:'interrupt',actor});
    traversal.cancel();skill=null;kick=null;playerForce=null;doorForce=null;if(operation)operation.obstacle.naiwaReachDelay=0;operation=null;investigation.cancel();investigationTime=0;witnessedHide=null;delete player.skillControlScale;releaseHold();
  }
  function beginKnockdown(){
    bananaSlip=null;
    health=0;stun=difficultyRules(runDifficulty).downDuration+(downCount===0?2:0);downCount++;
    grabTime=0;path=[];goal=null;recovery.pause();
  }
  function slip(from){
    if(disposed||state==='down'||state==='caught'||investigation.prone||traversal.active)return false;
    const dx=actor.x-from.x,dz=actor.z-from.z,distance=Math.hypot(dx,dz);
    interruptAction();beginKnockdown();bananaSlip={elapsed:0,x:dx/distance,z:dz/distance};
    transition('down');updatePose(0);return true;
  }
  function advanceSlip(dt){
    if(!bananaSlip)return;
    const before=slipDistance(bananaSlip.elapsed);
    bananaSlip.elapsed=Math.min(NAIWA_SLIP.duration,bananaSlip.elapsed+dt);
    const distance=slipDistance(bananaSlip.elapsed)-before;
    if(distance<=0)return;
    // Preserve stair descent but stop at unsupported ledges. Walls, furniture
    // and the player's body use the same swept collision checks as walking.
    const slipWorld={...movement,blocked:(x,y,z,...args)=>actor.grounded&&movement.support(x,z,actor.y,.235)<actor.y-.25||movement.blocked(x,y,z,...args)};
    advancePlayer(actor,bananaSlip.x*distance,bananaSlip.z*distance,dt,slipWorld);gravityFrame=frame;
  }
  function calmEgg(item) {
    hitItems.set(item.id,time);addAlertness(itemAlertnessChange(item),'egg-hit');
  }
  function hit({damage=0,item=null,origin=null,source='melee',velocity=null,position=null,onBlock=null,damageScale=1,shattered=false}={}) {
    const soft=source==='projectile'&&isSoftProjectile(item);
    const appliedDamage=item?itemDamage(item,source,damageScale,shattered):damage;
    const egg=source==='projectile'&&item?.kind==='egg';
    if(disposed)return false;
    if(state==='down'||state==='caught'||investigation.prone||appliedDamage<=0||(!soft&&source!=='door'&&time-lastDamage<.3)) {
      if(egg)calmEgg(item);return false;
    }
    const intelligent=alertness>=30;
    const blocked=intelligent&&state!=='stunned'&&!state.startsWith('bed-')&&item&&(source==='projectile'||source==='melee')
      &&incomingFromFront(actor,{origin,velocity})&&random()<(alertness>=100?NAIWA_DEFENSE.transparentBlockChance:alertness>=70?NAIWA_DEFENSE.tangwangBlockChance:NAIWA_DEFENSE.blockChance);
    if(egg)calmEgg(item);else addAlertness(source==='door'?appliedDamage:itemAlertnessChange(item,source),'hit');
    if(blocked) {
      guardUntil=time+NAIWA_DEFENSE.blockHold;guardAmount=Math.max(guardAmount,.45);onBlock?.();
      scene.dispatchEvent({type:'escape-pursuer-block',actor,item,source,position:position??{x:actor.x,y:actor.y+1.9,z:actor.z}});
      updatePose(0,lastPoseSpeed);return true;
    }
    interruptAction();
    if(!soft)lastDamage=time;
    health=Math.max(0,health-appliedDamage);
    if(health===0)beginKnockdown();
    else stun=soft?Math.max(stun,.45):Math.min(2.2,.85+appliedDamage*.018);
    grabTime=0;path=[];goal=null;recovery.pause();
    if(origin)lastKnown={x:origin.x,y:origin.y-1.2,z:origin.z};else lastKnown={x:player.x,y:player.y,z:player.z};
    transition(health===0?'down':'stunned');updatePose(0);
    scene.dispatchEvent({type:'escape-pursuer-hit',actor,damage:appliedDamage,health,source,item});return true;
  }
  actor.damageable={hit};
  actor.onDoorImpact=impact=>{
    if(!hit({damage:impact.damage,source:'door',origin:{x:impact.operator.x,y:impact.operator.y+1.2,z:impact.operator.z}}))return false;
    doorForce=createDoorDisplacement(actor,impact);return true;
  };
  const physical=worldItems.physics.addActor(actor,({entry,speed,position,velocity:incomingVelocity})=>{
    if(disposed||entry.isDebris)return;
    if(!entry.thrown||speed<3) {
      if(entry.item.kind==='egg'&&speed>.6&&time-(hitItems.get(entry.item.id)??-100)>=1)calmEgg(entry.item);
      return;
    }
    if(time-(hitItems.get(entry.item.id)??-100)<1)return;
    hitItems.set(entry.item.id,time);
    const damage=projectileDamage(entry.item,speed,entry.damageScale??1);
    const velocity=incomingVelocity??(entry.body?.velocity?{...entry.body.velocity}:null);
    const deliver=shattered=>hit({damage,item:entry.item,damageScale:entry.damageScale??1,shattered,origin:entry.thrownFrom??null,source:'projectile',velocity,position,onBlock:()=>{
      entry.thrown=false;
      if(entry.body){
        const length=velocity?Math.hypot(velocity.x,velocity.z):0;
        const x=length>.01?-velocity.x/length:-Math.sin(actor.yaw),z=length>.01?-velocity.z/length:-Math.cos(actor.yaw);
        entry.body.velocity.set(x*Math.max(2.5,speed*.42),Math.max(1.3,(velocity?.y??0)*.3),z*Math.max(2.5,speed*.42));entry.body.wakeUp();
      }
    }});
    if(entry.item.kind==='vase')vaseImpacts.set(entry.item.id,{deliver,at:time});else deliver(false);
  });
  function canHear(position,loudness=1) {
    if(isTransparent(alertness))return loudness>0&&[position?.x,position?.y,position?.z].every(Number.isFinite);
    const ear={x:actor.x,y:actor.y+1.7,z:actor.z};
    const distance=Math.hypot(position.x-ear.x,position.y-ear.y,position.z-ear.z);
    const senses=naiwaSenses(alertness);
    return distance<=(navigation.lineClear(ear,position,[collider])?senses.hearingRange:senses.occludedHearingRange)*loudness;
  }
  function hear(position,loudness=1) {
    if(isTransparent(alertness)) {
      if(grace>0||stun>0||state==='caught'||player.heldBy===actor||skill||kick||investigation.inspecting||!canHear(position,loudness)||hasPlayerScent()||tracksPlayer())return false;
      const floor=roomContaining(rooms,position)?.floor??routeNavigation.support(position.x,position.z,position.y,.2,.4);
      investigation.cancel();witnessedHide=null;lastKnown={x:position.x,y:Number.isFinite(floor)?floor:actor.y,z:position.z};memory=0;searchTime=8;searchTravel=0;path=[];goal=null;planWait=0;transition('search');return true;
    }
    if(grace>0||stun>0||investigation.exact||investigation.inspecting||['chase','grab','caught','slam','pull','kick'].includes(state)||noiseCooldown>0)return false;
    const senses=naiwaSenses(alertness);
    if(loudness<senses.minLoudness||!canHear(position,loudness))return false;
    if(investigation.active&&(loudness<.8||roomContaining(rooms,position)===investigation.room))return false;
    const floor=roomContaining(rooms,position)?.floor??navigation.support(position.x,position.z,position.y,.2,.4);
    noiseCooldown=senses.noiseCooldown;lastKnown={x:position.x,y:Number.isFinite(floor)?floor:actor.y,z:position.z};searchTime=8;searchTravel=0;path=[];goal=null;transition('search');
    investigation.begin(position,{alertness});return true;
  }
  const onImpact=event=>{
    const pending=vaseImpacts.get(event.item?.id);if(pending){vaseImpacts.delete(event.item.id);pending.deliver(!!event.broken);}
    if(event.owner!==actor&&!event.recentPlacement&&(isTransparent(alertness)?event.speed>.02:event.energy>.3&&event.speed>1.2))hear(event.position,Math.max(.001,Math.min(1.6,Math.sqrt(Math.max(0,event.energy))*.28)));
  };
  const onNoise=event=>{if(event.owner!==actor)hear(event.position,event.loudness);};
  const onLand=event=>{if(event.speed>(isTransparent(alertness)?.1:2.2))hear({x:player.x,y:player.y+.1,z:player.z},event.height>3?1.15:.35);};
  const onMelee=event=>{if(event.hit)hear(event.position,event.item?.kind==='crowbar'?1.2:.65);};
  const onBreak=event=>{
    if(disposed||!canHear(event.position,1.35))return;
    const near=Math.hypot(event.position.x-actor.x,event.position.y-actor.y-1,event.position.z-actor.z)<=6;
    const calmingEgg=event.item?.kind==='egg'&&time-(hitItems.get(event.item.id)??-100)<1;
    if(near&&!calmingEgg)addAlertness(1,'nearby-break');
    if(event.breakable?.kind==='window')addAlertness(3,'window-break');
    hear(event.position,1.35);
  };
  const onPickup=event=>{if(event.item?.kind==='boltCutters')cuttersTracked=true;};
  scene.addEventListener('escape-prop-pickup',onPickup);
  scene.addEventListener('escape-prop-impact',onImpact);scene.addEventListener('escape-prop-break',onBreak);scene.addEventListener('escape-scenery-break',onBreak);
  scene.addEventListener('escape-noise',onNoise);scene.addEventListener('escape-player-land',onLand);scene.addEventListener('escape-melee-strike',onMelee);
  function moveTowards(target,speed,dt,precise=false,liveTarget=false) {
    if(isTransparent(alertness))speed=TRANSPARENT.speed;
    speed*=lightSpeedScale();
    for(const [chair,until]of chairAvoided)if(until<=time)chairAvoided.delete(chair);
    planWait=Math.max(0,planWait-dt);
    const changed=!goal||Math.hypot(target.x-goal.x,target.z-goal.z)>(liveTarget?.45:1.25)||Math.abs(target.y-goal.y)>.8;
    if(liveTarget&&changed&&path[0]&&(path[0].x-actor.x)*(target.x-actor.x)+(path[0].z-actor.z)*(target.z-actor.z)<0)planWait=0;
    if((changed||!path.length||stuck>1.1)&&planWait===0) {
      const avoidedChairs=[...chairAvoided.keys()].flatMap(chair=>chair.colliders.map(solid=>({...solid,halfX:solid.halfX+.06,halfZ:solid.halfZ+.06})));
      path=planner.findPath(actor,target,{avoidSolids:[...recovery.solids,...avoidedChairs]});goal={...target};planWait=liveTarget?.2:.9;stuck=0;
    }
    while(path.length&&!path[0].traverse&&Math.hypot(path[0].x-actor.x,path[0].z-actor.z)<.06&&Math.abs(path[0].y-actor.y)<.26)path.shift();
    if(path.length>1&&!path[0].traverse&&!path[1].traverse&&Math.hypot(path[0].x-actor.x,path[0].z-actor.z)<.55
      &&(path[0].x-actor.x)*(path[1].x-actor.x)+(path[0].z-actor.z)*(path[1].z-actor.z)<0) {
      const next=path[1],count=Math.max(1,Math.ceil(Math.hypot(next.x-actor.x,next.z-actor.z)/.08));let y=actor.y,clear=true;
      for(let i=1;i<=count;i++) {
        const x=actor.x+(next.x-actor.x)*i/count,z=actor.z+(next.z-actor.z)*i/count,floor=movement.support(x,z,y,.235);
        if(!Number.isFinite(floor)||Math.abs(floor-y)>.25||movement.blocked(x,floor,z,true,actor.bodyHeight)){clear=false;break;}y=floor;
      }
      if(clear)path.shift();
    }
    if(path[0]?.traverse&&isTransparent(alertness)) {
      const edge=path[0].traverse;
      if(Math.hypot(actor.x-edge.from.x,actor.z-edge.from.z)<.7&&Math.abs(actor.y-edge.from.y)<.35) {
        if(traversal.begin(edge)){path.shift();recovery.pause();traversal.tick(dt);gravityFrame=frame;return TRANSPARENT.speed;}
        path=[];goal=null;planWait=0;return 0;
      }
    }
    for(const door of doors)if(!recovery.isAvoided(door)&&recovery.activeObstacle!==door&&Math.abs(door.y-actor.y)<.65&&Math.hypot(door.x-actor.x,door.z-actor.z)<2.25&&path.slice(0,7).some(p=>Math.hypot(p.x-door.x,p.z-door.z)<door.width/2+.45
      &&((actor.x-door.x)*door.normal[0]+(actor.z-door.z)*door.normal[1])*((p.x-door.x)*door.normal[0]+(p.z-door.z)*door.normal[1])<.03)) {
      if(Math.hypot(door.x-actor.x,door.z-actor.z)<1.15&&(!door.open||door.amount<.98&&door.noiseOwner!==actor))startOperation(door,true);
      if(door.open)recovery.clearDoorSwing(door);
    }
    if(operation&&!operation.ready)return 0;
    const finalApproach=precise&&Math.hypot(target.x-actor.x,target.z-actor.z)<.85&&Math.abs(target.y-actor.y)<.25
      &&!navigation.blocked(target.x,target.y,target.z,0,actor.bodyHeight,.4,[collider])
      &&navigation.lineClear({x:actor.x,y:actor.y+1.2,z:actor.z},{x:target.x,y:target.y+1.2,z:target.z},[collider]);
    const next=recovery.waypoint??(finalApproach?target:path[0]);
    if(!next){
      advanceActor(0,0,dt);
      if(Math.hypot(target.x-actor.x,target.z-actor.z)<.65&&Math.abs(target.y-actor.y)<.4)recovery.pause();
      else recovery.update(dt,{next:target,blocked:true});
      return 0;
    }
    const dx=next.x-actor.x,dz=next.z-actor.z,distance=Math.hypot(dx,dz);
    const chair=navigation.chairMotion?.obstacleAhead(actor,next);
    if(chair&&!chairAvoided.has(chair)&&alertness>=70&&kickCooldown===0) {
      kick={chair,elapsed:0,resolved:false,previous:state};kickCooldown=2;transition('kick');recovery.pause();
      actor.yaw=Math.atan2(actor.x-chair.body.position.x,actor.z-chair.body.position.z);return 0;
    }
    if(distance<.001){advanceActor(0,0,dt);recovery.update(dt,{next,blocked:Math.abs(next.y-actor.y)>.26});return 0;}
    const wantedYaw=operation?actor.yaw:Math.atan2(-dx,-dz),turn=Math.atan2(Math.sin(wantedYaw-actor.yaw),Math.cos(wantedYaw-actor.yaw));actor.yaw+=turn*(1-Math.exp(-9*dt));
    const step=Math.min(distance,speed*dt),before={x:actor.x,z:actor.z};advanceActor(dx/distance*step,dz/distance*step,dt);
    const moved=Math.hypot(actor.x-before.x,actor.z-before.z);stuck=moved<step*.2?stuck+dt:0;
    if(chair&&!chairAvoided.has(chair)) {
      if(chairProgress?.chair!==chair)chairProgress={chair,started:time,x:chair.body.position.x,z:chair.body.position.z};
      if(time-chairProgress.started>.95) {
        if(Math.hypot(chair.body.position.x-chairProgress.x,chair.body.position.z-chairProgress.z)<.10&&moved<step*.5) {
          chairAvoided.set(chair,time+8);chairProgress=null;path=[];goal=null;planWait=0;recovery.pause();
          scene.dispatchEvent({type:'escape-pursuer-unstick',stage:'chair-reroute',obstacle:chair,actor});return dt?moved/dt:0;
        }
        chairProgress={chair,started:time,x:chair.body.position.x,z:chair.body.position.z};
      }
    }else chairProgress=null;
    recovery.update(dt,{next,blocked:moved<step*.2});return dt?moved/dt:0;
  }
  function beginSkill(bed=false) {
    const kind=bed?'pull':nextSkill;if(!bed)nextSkill=kind==='slam'?'pull':'slam';
    const config=bed?NAIWA_BED_PULL:NAIWA_SKILLS[kind];
    skill={kind,bed,config,elapsed:0,resolved:false,hit:false};skillCooldown=config.cooldown;
    path=[];goal=null;grabTime=0;recovery.pause();
    transition(kind);
    scene.dispatchEvent({type:'escape-pursuer-skill',kind,variant:bed?'bed':null,stage:'start',actor});updatePose(0);
  }
  function updateSkill(dt) {
    const current=skill,config=current.config;current.elapsed+=dt;
    if(current.elapsed<config.impact-.12) {
      const target=Math.atan2(actor.x-player.x,actor.z-player.z),turn=Math.atan2(Math.sin(target-actor.yaw),Math.cos(target-actor.yaw));
      actor.yaw+=turn*(1-Math.exp(-12*dt));
    }
    if(current.kind==='pull'&&current.elapsed<config.impact-.04&&!player.hidden) {
      const dx=player.x-actor.x,dz=player.z-actor.z,distance=Math.hypot(dx,dz)||1,step=Math.min(Math.max(0,distance-.95),1.8*dt);
      advanceActor(dx/distance*step,dz/distance*step,dt);
    }
    updatePose(0);
    if(!current.resolved&&current.elapsed>=config.impact) {
      current.resolved=true;
      const dx=player.x-actor.x,dz=player.z-actor.z,length=Math.hypot(dx,dz);
      const facing=length<.01||(-Math.sin(actor.yaw)*dx-Math.cos(actor.yaw)*dz)/length>.45;
      const contactDistance=current.kind==='pull'?(handWalking()?model.getFootPositions().R:model.getHandPositions().L).distanceTo(pullContactTarget()):0;
      current.hit=facing&&elevatedPlayerInReach(actor,player,navigation,current.bed?NAIWA_BED_PULL.range:1.65)&&contactDistance<.55;
      if(current.hit){playerForce=createSkillDisplacement(current.kind,actor,player,config);if(current.kind==='slam')damagePlayer(player,naiwaAttackDamage(6,'slam',alertness),'slam');}
      scene.dispatchEvent({type:'escape-pursuer-skill',kind:current.kind,stage:current.hit?'hit':'miss',actor,contactDistance});
    }
    if(current.kind==='pull'&&current.hit&&current.elapsed<config.impact+config.forceDuration) {
      // The planted legs take a short backward step as the right arm reels in.
      const dx=actor.x-player.x,dz=actor.z-player.z,length=Math.hypot(dx,dz)||1;
      advanceActor(dx/length*(config.retreatDistance??.45)/config.forceDuration*dt,dz/length*(config.retreatDistance??.45)/config.forceDuration*dt,dt);
      collider.x=actor.x;collider.z=actor.z;collider.minY=actor.y;collider.maxY=actor.y+actor.bodyHeight;
    }
    if(playerForce&&!advanceSkillDisplacement(playerForce,player,navigation,dt))playerForce=null;
    if(current.kind==='pull'&&current.hit&&(visiblePlayer()||isTransparent(alertness))&&canGrabPlayer()) {
      // Reaching contact ends the pull immediately and closes both arms around the player.
      scene.dispatchEvent({type:'escape-pursuer-skill',kind:current.kind,stage:'end',actor});
      skill=null;playerForce=null;delete player.skillControlScale;holdPlayer();updatePose(dt);return true;
    }
    if(current.elapsed>=config.duration) {
      scene.dispatchEvent({type:'escape-pursuer-skill',kind:current.kind,stage:'end',actor});
      skill=null;transition(visiblePlayer()?'chase':'search');searchTime=8;path=[];goal=null;
    }
    updatePose(dt);return true;
  }
  function tick(dt){
    const from={x:actor.x,y:actor.y,z:actor.z},changed=advanceTick(dt);
    if(!disposed&&state!=='down'&&state!=='caught'&&!investigation.prone&&!traversal.active&&worldItems.tryBananaSlip?.(actor,from,()=>slip(from)))return true;
    return changed;
  }
  function advanceTick(dt) {
    frame++;
    syncBodyProfile();
    if(disposed||state==='caught')return false;dt=Math.min(Math.max(dt,0),.05);time+=dt;grace=Math.max(0,grace-dt);noiseCooldown=Math.max(0,noiseCooldown-dt);skillCooldown=Math.max(0,skillCooldown-dt);kickCooldown=Math.max(0,kickCooldown-dt);updateOperation(dt);
    const nextShadowStamp=Math.floor(time*12),shadowChanged=nextShadowStamp!==shadowStamp;shadowStamp=nextShadowStamp;
    noise.tick(dt);const guardChanged=updateDefense(dt);
    if(!isTransparent(alertness)&&traversal.active)traversal.cancel();
    const crossing=traversal.active;traversal.tick(dt);
    if(crossing){gravityFrame=frame;updatePose(dt,TRANSPARENT.speed);return true;}
    for(const [id,at] of hitItems)if(time-at>8)hitItems.delete(id);
    for(const [id,pending]of vaseImpacts)if(time-pending.at>.25)vaseImpacts.delete(id);
    if(stun>0) {
      if(doorForce&&!advanceDoorDisplacement(doorForce,actor,movement,dt))doorForce=null;
      if(state==='down')advanceSlip(dt);
      stun=Math.max(0,stun-dt);if(stun<1e-8)stun=0;updatePose(dt);
      if(stun===0){
        if(state==='down'){bananaSlip=null;health=difficultyRules(runDifficulty).naiwaHealth;if(random()<.4)addAlertness(-(5+Math.min(5,Math.floor(random()*6))),'blackout');}
        searchTime=7;memory=0;transition('search');grabTime=0;
      }
      return true;
    }
    if(skill)return updateSkill(dt);
    if(kick) {
      kick.elapsed+=dt;
      if(!kick.resolved&&kick.elapsed>=.28){kick.resolved=true;navigation.chairMotion?.kick(kick.chair,actor);scene.dispatchEvent({type:'escape-pursuer-kick',actor,chair:kick.chair});}
      if(kick.elapsed>=.75){const previous=kick.previous;kick=null;transition(visiblePlayer()?'chase':previous);path=[];goal=null;planWait=0;}
      updatePose(dt);return true;
    }
    if(closePassedDoors(dt)){updatePose(dt);return true;}
    const sensesTarget=isTransparent(alertness)&&(hasPlayerScent()||tracksPlayer());
    const sees=grace===0&&(sensesTarget||visiblePlayer());
    const sightChanged=chaseTargetVisible!==sees;chaseTargetVisible=sees;
    if(sightChanged&&state==='chase')onState({state,text:stateLabel(state)});
    if(sees&&!investigation.inspecting) {
      if(investigation.exact&&!player.hidingBed&&!player.hidingWardrobe){investigation.cancel();witnessedHide=null;}
      if(isTransparent(alertness)&&(player.hidingBed||player.hidingWardrobe)) {
        const target=player.hidingBed?beds.find(bed=>bed.id===player.hidingBed):interactables.find(action=>action.id===player.hidingWardrobe);
        if(target&&!investigation.exact)investigation.begin(player,{exact:{kind:player.hidingBed?'bed':'wardrobe',target},alertness});
      }
      if(player.hidingWardrobe&&!isTransparent(alertness)) {
        const target=interactables.find(action=>action.id===player.hidingWardrobe);
        if(target)observeHiding({kind:'wardrobe',target});
      }
      if(!investigation.exact){
        // Visual contact takes priority over an old sound/patrol route and its
        // temporary unsticking waypoint, even while the path cache is cooling.
        if(state!=='grab'&&(state!=='chase'||sightChanged)){path=[];goal=null;planWait=0;stuck=0;recovery.pause();}
        investigation.cancel();witnessedHide=null;lastKnown={x:player.x,y:player.y,z:player.z};
        rememberedLanding=observedStairLanding(lastKnown,observedPoint,actor,navigation.stairs,rememberedLanding);observedPoint={...lastKnown};
        investigation.remember(rememberedLanding??player);memory=naiwaSenses(alertness).memory;searchTime=8;lostTravel=lostStall=0;if(state!=='grab')transition('chase');
      }
    }
    else {
      memory=Math.max(0,memory-dt);
      if(state==='chase'&&memory===0) {
        lostTravel+=dt;const destination=rememberedLanding??lastKnown;
        const arrived=destination&&Math.hypot(destination.x-actor.x,destination.z-actor.z)<.75&&Math.abs(destination.y-actor.y)<.35;
        if(arrived||lostTravel>30||lostStall>6){lastKnown=destination;rememberedLanding=null;transition('search');path=[];goal=null;investigation.begin(lastKnown,{alertness,useMemory:true});}
      }
    }
    noticeFlashlight(dt,sees);
    if(investigation.active) {
      const result=investigation.tick(dt,(target,speed,step)=>moveTowards(target,speed,step,true));
      if(result?.caught){transition('caught');onCatch();return true;}
      if(result?.finished){investigationTime=0;witnessedHide=null;transition('patrol');lastKnown=null;path=[];goal=null;}
      else if(result) {
        if(result.state!=='search'||result.look)recovery.pause();
        investigationTime=result.actionTime??0;transition(result.state);
        if(result.look) {
          if(lookOrigin===null)lookOrigin=actor.yaw;
          lookTime+=dt;const look=searchLookPose(lookTime);actor.yaw=lookOrigin+look.body;lookYaw=look.head;lookPitch=look.pitch;
        }else {lookOrigin=null;lookTime=0;lookYaw=lookPitch=0;}
        updatePose(dt,result.speed);return true;
      }
    }
    const bedTarget=standingOnBed(player,beds,navigation);
    if(sees&&!player.heldBy&&skillCooldown===0&&elevatedPlayerInReach(actor,player,navigation,bedTarget?NAIWA_BED_PULL.range:1.5)) {
      const yaw=Math.atan2(actor.x-player.x,actor.z-player.z),turn=Math.atan2(Math.sin(yaw-actor.yaw),Math.cos(yaw-actor.yaw));
      if(Math.abs(turn)>.22){actor.yaw+=Math.max(-6*dt,Math.min(6*dt,turn));recovery.pause();updatePose(dt);return true;}
      beginSkill(!!bedTarget);return true;
    }
    const sameLevelJump=player.jumpOriginY!=null&&Math.abs(player.jumpOriginY-actor.y)<.35;
    const close=grace===0&&canGrabPlayer(sameLevelJump||player.heldBy===actor)&&(sees||Math.hypot(player.x-actor.x,player.z-actor.z)<.85);
    if(close) {
      if(player.heldBy!==actor)holdPlayer();
      grabTime+=dt;actor.yaw=Math.atan2(actor.x-player.x,actor.z-player.z);updatePose(dt);
      if(grabTime+1e-8>=holdDuration){transition('caught');onCatch();}return true;
    }
    if(state==='grab'){releaseHold();grabTime=0;transition(sees?'chase':'search');}
    let speed=0;
    if(state==='patrol') {
      const target=patrolRoute[routeIndex%patrolRoute.length];
      if(Math.hypot(target.x-actor.x,target.z-actor.z)<.65&&Math.abs(target.y-actor.y)<.4){recovery.pause();dwell+=dt;if(dwell>.65){dwell=0;routeIndex++;path=[];goal=null;}}
      else speed=moveTowards(target,1.55,dt);
    }else if(state==='chase'&&lastKnown) {
      speed=moveTowards(memory===0&&rememberedLanding?rememberedLanding:lastKnown,3.45*alertnessPhase(alertness).speedScale,dt,false,sees);
      lostStall=!sees&&speed<.04?lostStall+dt:0;
    }
    else if(state==='search') {
      searchTravel+=dt;
      const nearby=!lastKnown||Math.hypot(lastKnown.x-actor.x,lastKnown.z-actor.z)<1.2&&Math.abs(lastKnown.y-actor.y)<.4;
      if(nearby){searchTime-=dt;recovery.pause();}
      else if(lastKnown)speed=moveTowards(lastKnown,1.85,dt);
      if(speed<.02&&!operation) {
        if(lookOrigin===null){lookOrigin=actor.yaw;lookTime=0;}
        lookTime+=dt;const look=searchLookPose(lookTime);actor.yaw=lookOrigin+look.body;lookYaw=look.head;lookPitch=look.pitch;
      }else {lookOrigin=null;lookTime=0;lookYaw=lookPitch=0;}
      if(searchTime<=0||searchTravel>30){transition('patrol');lastKnown=null;path=[];goal=null;}
    }
    updatePose(dt,speed);return speed>.001||state!=='patrol'||guardChanged||shadowChanged;
  }
  function reset({keepAlertness=false}={}) {
    traversal.reset();if(!keepAlertness)cuttersTracked=false;
    doorClosures.clear();vaseImpacts.clear();props.reset({keepTaken:keepAlertness});
    frame=0;gravityFrame=-1;shadowStamp=-1;chairAvoided.clear();chairProgress=null;bananaSlip=null;doorForce=null;
    if(operation)operation.obstacle.naiwaReachDelay=0;operation=null;kick=null;kickCooldown=0;
    observedPoint=null;rememberedLanding=null;lostTravel=lostStall=searchTravel=0;currentBeam=null;lightCheck=0;lastLightNotice=null;
    investigation.clear();investigationTime=0;witnessedHide=null;noise.reset();
    lightLit=false;lightAmount=0;guardAmount=0;guardUntil=-1;lastPoseSpeed=0;model.reset?.();
    Object.assign(actor,spawn,{yaw:0,velocityY:0,grounded:true});time=0;grace=5;stun=0;health=difficultyRules(runDifficulty).naiwaHealth;lastDamage=-10;noiseCooldown=0;searchTime=0;memory=0;grabTime=0;
    if(!keepAlertness){downCount=0;difficultyLocked=false;}
    lastKnown=null;path=[];goal=null;routeIndex=0;dwell=0;planWait=0;stuck=0;lookOrigin=null;lookTime=0;lookYaw=lookPitch=0;chaseTargetVisible=false;skill=null;playerForce=null;skillCooldown=0;nextSkill='slam';delete player.skillControlScale;releaseHold();recovery.reset();hitItems.clear();if(!keepAlertness)alertness=difficultyRules(runDifficulty).initialAlertness;publishAlertness('reset');transition('patrol');updatePose(0);worldItems.physics.syncActors();onState({state,text:stateLabel(state)});
  }
  updatePose(0);onState({state,text:stateLabel(state)});publishAlertness('initial');
  return {actor,model,planner,tick,reset,hit,struggleJump,nearbyKey:(origin,direction)=>{const target=props.nearby(origin,direction);return target?{...target,available:state==='down'}:null;},pickupKey:(inventory,origin,direction)=>state==='down'&&props.take(inventory,origin,direction),reclaimKey(){props.reset();props.update(state,{invisible:!!difficultyRules(runDifficulty).invisible});},get struggleTime(){return player.heldBy===actor&&holdDuration===1.5?Math.max(0,holdDuration-grabTime):0;},beginRun(){difficultyLocked=true;},setDifficulty(id,{restartOpening=false}={}){if(difficultyLocked||!Object.hasOwn(ESCAPE_DIFFICULTIES,id))return false;runDifficulty=id;if(restartOpening){health=difficultyRules(id).naiwaHealth;downCount=0;alertness=difficultyRules(id).initialAlertness;publishAlertness('difficulty-opening');}updatePose(0);return true;},visiblePlayer,hear,observeHiding,setTrackingSource(source){trackingSource=typeof source==='function'?source:()=>false;},get crossingWindow(){return traversal.active;},get knowsPlayer(){return isTransparent(alertness)&&(hasPlayerScent()||tracksPlayer());},setFlashlightSource(source){flashlightSource=typeof source==='function'?source:()=>null;},setMapLayer(layer){mapLayer=layer;updatePose(0);},get state(){return state;},get health(){return health;},get alertness(){return alertness;},onPlayerWake(){addAlertness(-WAKE_ALERTNESS_REDUCTION,'player-wake');},get phase(){return displayAlertnessPhase(alertness,runDifficulty);},get stunTime(){return stun;},get graceTime(){return grace;},get path(){return path;},get lightExposed(){return lightLit;},get guarding(){return guardAmount>.01;},get movementSpeedScale(){return lightSpeedScale();},get investigating(){return investigation.active;},get prone(){return investigation.prone;},
    dispose(){disposed=true;traversal.reset();noise.dispose();scene.removeEventListener('escape-prop-pickup',onPickup);props.dispose();doorClosures.clear();vaseImpacts.clear();if(operation)operation.obstacle.naiwaReachDelay=0;operation=null;kick=null;investigation.clear();noise.reset();skill=null;playerForce=null;delete player.skillControlScale;releaseHold();recovery.reset();physical.remove();navigation.circles.splice(navigation.circles.indexOf(collider),1);model.dispose?.();model.root.removeFromParent();scene.removeEventListener('escape-prop-impact',onImpact);scene.removeEventListener('escape-prop-break',onBreak);scene.removeEventListener('escape-scenery-break',onBreak);scene.removeEventListener('escape-noise',onNoise);scene.removeEventListener('escape-player-land',onLand);scene.removeEventListener('escape-melee-strike',onMelee);}};
}
