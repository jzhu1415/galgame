import * as THREE from 'three';
import {createPlayer,advancePlayer,jumpPlayer,setCrouch,playerHeight,EYE_HEIGHT,CROUCH_EYE_HEIGHT,BED_HIDE_EYE_HEIGHT,WALK_SPEED,CROUCH_SPEED,SPRINT_SPEED} from './frog-escape-navigation.js';
import {createInventory} from './frog-escape-inventory.js';
import {createWorldItems,createFlashlightModel,createItemModel,disposeItemModel,flashlightItem} from './frog-escape-items.js';
import {updateCastleDoor,playerInDoorSwing,doorImpactLocked,setCastleDoorOpen} from './frog-escape-doors.js';
import {createDoorDisplacement,advanceDoorDisplacement} from './frog-escape-door-displacement.js';
import {updateFixtureAction,nearestFixture,wardrobeContaining,insertFixtureKey} from './frog-escape-interactions.js';
import {nearestBed,hideUnderBed,leaveBed} from './frog-escape-hiding.js';
import {CROWBAR_MELEE,createCrowbarGrip,poseCrowbar} from './frog-escape-melee.js';
import {MAX_PLAYER_HEALTH,INITIAL_ALERTNESS,alertnessPhase,damagePlayer,ESCAPE_DIFFICULTIES,difficultyRules,playerDamageScale,playerMovementScale} from './frog-escape-vitals.js';
import {createEscapeAudio} from './frog-escape-audio.js';
import {syncStamina,sprintFraction,tickStamina} from './frog-escape-stamina.js';
import {createClueDialogs} from './frog-escape-clue-dialogs.js';
import {inventoryItemIcon} from './frog-escape-inventory-icons.js';
import {tr,itemLabel,foodLabel} from './frog-escape-i18n.js';
import {createConsumption,canConsume,isDrink,tickPlayerEffects,poseEating,CONSUMPTION} from './frog-escape-consumption.js';

export function createEscapeExplorer({scene,canvas,stage,status,groups,roof,navigation,playerPin,doors,interactables=[],pickupSeeds=[],beds=[],runClues=null,escapeProgress=null,onMap}) {
  const camera=new THREE.PerspectiveCamera(70,1,.05,130);
  camera.rotation.order='YXZ'; scene.add(camera);
  const player=createPlayer(), keys=new Set();
  const touch=window.matchMedia('(pointer:coarse)').matches;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let hurtAnimation=null;
  const shadowPosition=new THREE.Vector3(Infinity,Infinity,Infinity),shadowRotation=new THREE.Quaternion();
  function shakeDamage(){
    hurtAnimation?.cancel();if(reducedMotion.matches)return;
    hurtAnimation=canvas.animate?.([
      {transform:'translate(0,0) rotate(0deg)'},{transform:'translate(-2px,1px) rotate(-.12deg)'},
      {transform:'translate(2px,-1px) rotate(.1deg)'},{transform:'translate(-1px,0) rotate(-.05deg)'},{transform:'translate(0,0) rotate(0deg)'},
    ],{duration:220,easing:'ease-out'})??null;
  }
  reducedMotion.addEventListener?.('change',()=>{if(reducedMotion.matches)hurtAnimation?.cancel();});
  const motion={vx:0,vz:0,phase:0,bob:0};
  const modeButton=document.querySelector('#escape-explore');
  const prompt=document.querySelector('#escape-interact');
  const dialog=document.querySelector('#escape-pause');
  const caughtDialog=document.querySelector('#escape-caught');
  const stick=document.querySelector('#escape-joystick');
  const knob=stick.querySelector('span');
  const crouchButton=document.querySelector('#escape-touch-crouch');
  const sprintButton=document.querySelector('#escape-touch-sprint');
  const useButton=document.querySelector('#escape-item-use');
  const dropButton=document.querySelector('#escape-item-drop');
  const attackButton=document.querySelector('#escape-item-attack');
  const jumpButton=document.querySelector('#escape-touch-jump');
  const eatButton=document.querySelector('#escape-item-eat');
  const hint=document.querySelector('#escape-walk-hint');
  const inventoryButtons=[...document.querySelectorAll('[data-inventory-slot]')];
  const inventorySelection=document.querySelector('#escape-inventory-selection');
  // Most HUD values stay unchanged between frames. Read nodes once and avoid
  // invalidating text/layout unless their visible or accessible value changes.
  const uiAttributes=new WeakMap();
  function ui(node,key,value){if(node[key]!==value)node[key]=value;}
  function uiAttribute(node,key,value){
    let values=uiAttributes.get(node);
    if((node.getAttribute?node.getAttribute(key):values?.[key])===value)return;
    node.setAttribute(key,value);if(!values){values={};uiAttributes.set(node,values);}values[key]=value;
  }
  const vitalNodes=Object.fromEntries(['vitals','stamina-meter','player-vitals','health-value','alertness-value','health-meter','alertness-meter','alertness-phase'].map(id=>[id,document.querySelector(`#escape-${id}`)]));
  const effectPanel=document.querySelector('#escape-player-effects'),consumeProgress=document.querySelector('#escape-consume-progress'),consumeLabel=document.querySelector('#escape-consume-label'),consumeMeter=document.querySelector('#escape-consume-meter');
  const inventoryNodes=inventoryButtons.map(button=>({name:button.querySelector('[data-item-name]'),symbol:button.querySelector('[data-item-symbol]')}));
  const inventory=createInventory(renderInventory);
  const consumption=createConsumption({player,inventory,onEvent:event=>{
    scene.dispatchEvent({type:'escape-player-consume',...event});
    if(event.stage==='bite')scene.dispatchEvent({type:'escape-noise',position:{x:player.x,y:player.y+1,z:player.z},owner:player,loudness:isDrink(event.item)?.18:.25,kind:'consumption'});
    if(event.stage==='finish'){setHint(isDrink(event.item)?'喝完{item}，效果已生效。':'吃完{item}，恢复 {healed} 点生命。',{item:event.item.kind==='jar'?'果酱':event.item.kind==='bottle'?'酒':event.item.name,healed:event.healed});renderVitals();renderEffects();}
    if(event.stage==='cancel')renderEffects();
    updateEquipment();
  }});

  const torch=new THREE.SpotLight(0xffe5c0,25,20,.48,.55,1.2);
  torch.castShadow=true;torch.shadow.mapSize.set(512,512);torch.shadow.bias=-.0001;torch.shadow.normalBias=.02;torch.shadow.camera.near=.1;torch.shadow.camera.far=20;
  torch.position.set(.15,-.13,0); torch.target.position.set(0,-.1,-10);
  camera.add(torch,torch.target);
  const heldFlashlight=createFlashlightModel();heldFlashlight.position.set(.28,-.25,-.45);camera.add(heldFlashlight);
  const worldItems=createWorldItems(scene,navigation,pickupSeeds);
  const placementMarker=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),new THREE.LineBasicMaterial({color:0x97c5a6,transparent:true,opacity:.65,depthWrite:false}));placementMarker.visible=false;scene.add(placementMarker);
  let heldProp=null,lastHeldId=null;
  let active=false,hasEntered=false,paused=false,fallback=false,lockPending=false,nearest=null,eyeOffset=EYE_HEIGHT;
  let lookPointer=null, hoverPointer=null, stickPointer=null, sprintPointer=null, touchForward=0,touchRight=0,lastLocation='';
  let shadowsDirty=true,lastItemRevision=0;
  let swingTime=0,swingCooldown=0,swingItemId=null,swingHit=false;
  let bedHide=null,doorForce=null;
  let lastHealthEvent=null,effectSnapshot='';
  let pursuer=null,captured=false,gameOver=false,won=false,alertness=INITIAL_ALERTNESS;
  const audio=createEscapeAudio({scene,player,navigation,doors,interactables,getPursuer:()=>pursuer,
    listener:()=>({x:camera.position.x,y:camera.position.y,z:camera.position.z,yaw:player.yaw})});
  player.onLand=event=>scene.dispatchEvent({type:'escape-player-land',...event});
  player.onJump=event=>scene.dispatchEvent({type:'escape-player-action',action:'jump',...event});
  const soundEnabled=document.querySelector('#escape-sfx-enabled'),soundVolume=document.querySelector('#escape-sfx-volume'),soundValue=document.querySelector('#escape-sfx-value');
  soundEnabled.checked=audio.settings.enabled;soundVolume.value=String(Math.round(audio.settings.volume*100));soundValue.textContent=`${soundVolume.value}%`;
  soundEnabled.addEventListener('change',()=>{audio.setSettings({enabled:soundEnabled.checked});if(active&&!paused)void audio.unlock();});
  soundVolume.addEventListener('input',()=>{audio.setSettings({volume:Number(soundVolume.value)/100});soundValue.textContent=`${Math.round(audio.settings.volume*100)}%`;});
  const direction=new THREE.Vector3();
  const lightOrigin=new THREE.Vector3(),lightTarget=new THREE.Vector3();
  function flashlightBeam() {
    const held=inventory.slots[inventory.selected];
    if(!active||paused||held?.type!=='flashlight'||!held.on)return null;
    torch.getWorldPosition(lightOrigin);torch.target.getWorldPosition(lightTarget);
    return {enabled:true,origin:lightOrigin,direction:lightTarget.sub(lightOrigin).normalize(),range:torch.distance,angle:torch.angle};
  }
  scene.attach(playerPin);
  const helpSource=touch ? '摇杆移动 · 按住疾跑 · 滑动转头 · 对准物品点按拾取 / 放置 · 装备撬棍可点挥击' : 'WASD 移动 · 按住 R 疾跑 · Shift 下蹲 · 空格跳跃 · E 拾取 / 开关 / 放置 · 撬棍左键挥击 · 右键投掷（手电开关） · Q 丢弃 · 1–7 物品栏 · M 地图';
  let hintSource=helpSource,hintParams={};
  function setHint(source=helpSource,params={}) {
    hintSource=source;hintParams=params;
    const suffix=tr(touch?'点按进食／饮用':'G · 进食／饮用');
    hint.textContent=tr(source,Object.fromEntries(Object.entries(params).map(([key,value])=>[key,value?.name?itemLabel(value):typeof value==='string'?tr(value)+(value===helpSource?' · '+suffix:''):value])))+(source===helpSource?' · '+suffix:'');
  }
  setHint();
  let difficulty='normal',pendingWake=false,lastCaptureDamage=30;
  try{const saved=globalThis.localStorage?.getItem('naiwa-escape-difficulty-v1');if(Object.hasOwn(ESCAPE_DIFFICULTIES,saved))difficulty=saved;}catch{}
  runClues?.configureDifficulty(difficulty);
  const clueDialogs=runClues?createClueDialogs({clues:runClues,
    onOpen(){hurtAnimation?.cancel();paused=true;audio.setActive(false);clearInput();prompt.hidden=true;placementMarker.visible=false;if(document.pointerLockElement===canvas)document.exitPointerLock();},
    onClose(){if(document.hidden){if(active&&!dialog.open)dialog.showModal();}else resume();},
    onSuccess(value){if(!active||captured)return false;const opened=runClues.submit(value,player);if(opened)setHint('大门已开启，5 秒后自动关闭。');return opened;},
    onFailure(){audio.lock(runClues.frontDoor);},
  }):null;
  const difficultyControls=['#escape-difficulty','#escape-pause-difficulty'].map(id=>document.querySelector(id));
  const newRunButtons=['#escape-new-run','#escape-pause-new-run'].map(id=>document.querySelector(id));
  function renderDifficulty() {
    const rules=difficultyRules(difficulty);
    difficultyControls.forEach(control=>{control.value=difficulty;control.disabled=hasEntered;});
    newRunButtons.forEach(button=>{button.hidden=!hasEntered;});
    document.querySelector('#escape-difficulty-help').textContent=tr(hasEntered?'本局难度已锁定。重新开始后可重新选择。':'难度仅能在开局前选择，开始后本局锁定。');
    document.querySelector('#escape-difficulty-status').textContent=tr('{mode} · 被抓 -{damage}',{mode:tr(rules.label),damage:rules.captureDamage*(player.effects?.milk>0?.5:1)});
    document.querySelector('#escape-capture-rule').textContent=tr('被抓基础扣血 {damage}；开局警觉 {alertness}。醒来后警觉 -10。',{damage:rules.captureDamage,alertness:rules.initialAlertness});
  }
  function setDifficulty(id) {
    if(hasEntered){renderDifficulty();return false;}
    if(!Object.hasOwn(ESCAPE_DIFFICULTIES,id))return false;
    difficulty=id;try{globalThis.localStorage?.setItem('naiwa-escape-difficulty-v1',id);}catch{}
    runClues?.configureDifficulty(difficulty);pursuer?.setDifficulty?.(difficulty,{restartOpening:!hasEntered});renderDifficulty();return true;
  }
  difficultyControls.forEach(control=>control.addEventListener('change',()=>setDifficulty(control.value)));
  newRunButtons.forEach(button=>button.addEventListener('click',()=>{consumption.cancel();audio.setActive(false);window.location.reload();}));
  renderDifficulty();
  function renderVitals() {
    syncStamina(player);
    const hud=vitalNodes.vitals,phase=alertnessPhase(alertness),staminaMeter=vitalNodes['stamina-meter'];
    ui(staminaMeter,'max',Math.max(.01,player.staminaMax));ui(staminaMeter,'value',player.stamina);uiAttribute(staminaMeter,'aria-valuenow',String(player.stamina));uiAttribute(staminaMeter,'aria-valuemax',String(player.staminaMax));
    uiAttribute(staminaMeter,'aria-valuetext',tr('体力剩余 {percent}%',{percent:Math.round(player.stamina/Math.max(.01,player.staminaMax)*100)}));
    ui(vitalNodes['player-vitals'].dataset,'health',player.health<=30?'low':'normal');
    ui(vitalNodes['health-value'],'textContent',String(player.health));
    ui(vitalNodes['alertness-value'],'textContent',String(alertness));
    const healthMeter=vitalNodes['health-meter'],alertMeter=vitalNodes['alertness-meter'];
    ui(healthMeter,'value',player.health);ui(healthMeter,'textContent',`${player.health} / ${MAX_PLAYER_HEALTH}`);uiAttribute(healthMeter,'aria-valuenow',String(player.health));
    ui(alertMeter,'value',alertness);ui(alertMeter,'textContent',`${alertness} / 100`);uiAttribute(alertMeter,'aria-valuenow',String(alertness));
    uiAttribute(alertMeter,'aria-valuetext',`${alertness} / 100, ${tr(phase.label)}`);
    ui(vitalNodes['alertness-phase'],'textContent',tr(phase.label));
    ui(hud.dataset,'health',player.health<=30?'low':'normal');ui(hud.dataset,'phase',phase.id);
  }
  function renderHealthMessage({damage,health,source,healed=0}) {
    if(healed>0){document.querySelector('#escape-vitals-message').textContent=tr('生命恢复 {healed}，当前 {health}。',{healed,health});return;}
    const cause={slam:'被举砸命中',fall:'高处摔落',grab:'被奶蛙抱住',chair:'被飞来的椅子撞中',door:'被门撞中'}[source]??'受伤';
    document.querySelector('#escape-vitals-message').textContent=tr('{cause}，生命值减少 {damage}，剩余 {health}。',{cause:tr(cause),damage,health});
  }
  player.onHealthChange=event=>{
    lastHealthEvent=event;if(event.damage>0){consumption.cancel();shakeDamage();}renderVitals();renderHealthMessage(event);
    const {health}=event;
    if(health<=0)endRun();
  };
  scene.addEventListener('escape-pursuer-alertness',event=>{alertness=event.value;renderVitals();});
  renderVitals();

  function renderInventory() {
    inventoryButtons.forEach((button,index)=>{
      const item=inventory.slots[index], selected=index===inventory.selected;
      uiAttribute(button,'aria-pressed',String(selected));
      uiAttribute(button,'aria-label',tr('物品栏第{slot}格：{item}',{slot:index+1,item:itemLabel(item)}));
      uiAttribute(button,'data-item-kind',item?.type??'');
      uiAttribute(button,'data-item-empty',String(!!item?.empty));
      uiAttribute(button,'data-item-on',String(selected&&!!item?.on));
      ui(inventoryNodes[index].name,'textContent',item?itemLabel(item):'');
      ui(button,'title',itemLabel(item));
      ui(inventoryNodes[index].symbol,'innerHTML',inventoryItemIcon(item));
    });
    ui(inventorySelection,'textContent',`${inventory.selected+1} / ${inventory.slots.length}`);
    updateEquipment();
  }
  function updateEquipment() {
    const item=inventory.slots[inventory.selected], equipped=item?.type==='flashlight';
    const lightVisible=active&&equipped&&!!item.on;if(torch.visible!==lightVisible)shadowsDirty=true;torch.visible=lightVisible;
    heldFlashlight.visible=active&&equipped;
    heldFlashlight.userData.lens.emissiveIntensity=equipped&&item.on ? .8 : 0;
    ui(useButton,'disabled',!item||!!bedHide&&!equipped||consumption.active);ui(dropButton,'disabled',!item||!!bedHide||consumption.active);
    ui(attackButton,'hidden',!item?.melee);ui(attackButton,'disabled',swingCooldown>0||!!bedHide||consumption.active);
    ui(useButton,'textContent',tr(equipped?(item.on?'关闭手电':'打开手电'):item?.kind==='rearDoorKey'?'使用钥匙':item?.type==='key'?'插入钥匙':item?.kind==='boltCutters'?'剪栅栏':'投掷'));
    const visualId=item?`${item.id}:${!!item.empty}`:null;
    ui(eatButton,'hidden',!canConsume(item));ui(eatButton,'disabled',consumption.active||!!player.heldBy);ui(eatButton,'textContent',tr(isDrink(item)?'饮用':'进食'));
    if(lastHeldId!==visualId) {
      swingTime=0;swingItemId=null;swingHit=false;
      if(heldProp){camera.remove(heldProp);disposeItemModel(heldProp);heldProp=null;}
      if(item?.kind) {
        const model=createItemModel(item);heldProp=item.kind==='crowbar'?createCrowbarGrip(model):model;
        heldProp.position.set(.28,-.25,-.5);heldProp.rotation.set(.3,-.18,.08);if(!item.melee)heldProp.scale.setScalar(.8);
        heldProp.traverse(mesh=>{if(mesh.isMesh)mesh.castShadow=false;});camera.add(heldProp);
      }
      lastHeldId=visualId;
    }
    if(heldProp){heldProp.visible=active;if(!item?.melee){heldProp.position.set(.28,-.25,-.5);heldProp.rotation.set(.3,-.18,.08);heldProp.scale.setScalar(.8);}}
    if(active&&heldProp&&consumption.active)poseEating(heldProp,item,consumption.action.elapsed);
    if(heldProp&&item?.melee)poseCrowbar(heldProp,swingTime>0?CROWBAR_MELEE.duration-swingTime:null);
  }

  function clearInput() {
    keys.clear(); touchForward=0; touchRight=0; stickPointer=null; sprintPointer=null; lookPointer=null; hoverPointer=null; nearest=null;
    uiAttribute(sprintButton,'aria-pressed','false');
    motion.vx=motion.vz=motion.phase=motion.bob=0;
    player.moveIntent={x:0,z:0};
    swingTime=0;swingItemId=null;swingHit=false;
    knob.style.transform='translate(-50%,-50%)';
    updateCamera();
  }
  function updateCamera() {
    // Only obstacles above the body can limit the eye; furniture bases are not ceilings.
    const headroom=navigation.ceiling(player.x,player.z,player.y+playerHeight(player))-player.y-.06;
    const bob=reducedMotion.matches?0:motion.bob;
    camera.position.set(player.x,player.y+Math.max(.1,Math.min(eyeOffset+Math.sin(motion.phase*2)*.014*bob,headroom)),player.z);
    camera.rotation.set(player.pitch,player.yaw,Math.sin(motion.phase)*.0012*bob);
    updateEquipment();
    if(torch.visible&&(shadowPosition.distanceToSquared(camera.position)>.000001||shadowRotation.angleTo(camera.quaternion)>.001)) {
      shadowsDirty=true;shadowPosition.copy(camera.position);shadowRotation.copy(camera.quaternion);
    }
  }
  function movePlayer(f,r,dt) {
    const requested=keys.has('KeyR')||sprintPointer!==null,burst=sprintFraction(player,dt,requested,!doorForce&&Math.hypot(f,r)>.001);
    const speed=(doorForce?0:1)*(player.crouched?CROUCH_SPEED:WALK_SPEED+(SPRINT_SPEED-WALK_SPEED)*burst)*(player.skillControlScale??1)*playerMovementScale(player)*(consumption.active?CONSUMPTION.movementScale:1);
    uiAttribute(sprintButton,'aria-pressed',String(burst>0));
    // Eating takes effect immediately, including when started at full sprint.
    const currentSpeed=Math.hypot(motion.vx,motion.vz);
    if(consumption.active&&currentSpeed>speed){motion.vx*=speed/currentSpeed;motion.vz*=speed/currentSpeed;}
    const targetX=(-Math.sin(player.yaw)*f+Math.cos(player.yaw)*r)*speed;
    const targetZ=(-Math.cos(player.yaw)*f-Math.sin(player.yaw)*r)*speed;
    player.moveIntent={x:targetX,z:targetZ};
    const rate=Math.hypot(f,r)<.001?30:Math.hypot(targetX,targetZ)<Math.hypot(motion.vx,motion.vz)?24:12;
    const blend=-Math.expm1(-rate*dt);
    // Integrate the acceleration curve, so the same input travels equally at different frame rates.
    const dx=targetX*dt+(motion.vx-targetX)*blend/rate;
    const dz=targetZ*dt+(motion.vz-targetZ)*blend/rate;
    motion.vx+=(targetX-motion.vx)*blend;motion.vz+=(targetZ-motion.vz)*blend;
    if(!f&&!r&&Math.hypot(motion.vx,motion.vz)<.005)motion.vx=motion.vz=0;
    const x=player.x,z=player.z;
    advancePlayer(player,dx,dz,dt,navigation);
    const movedX=player.x-x,movedZ=player.z-z,distance=Math.hypot(movedX,movedZ);
    // Contact stops velocity on the blocked axis; pushing into a wall must not keep a walking bob.
    if(Math.abs(movedX-dx)>.00001)motion.vx=0;
    if(Math.abs(movedZ-dz)>.00001)motion.vz=0;
    tickStamina(player,dt,burst>0&&distance>.00001);renderVitals();
    const walking=player.grounded&&dt>0?Math.min(1,distance/dt/(WALK_SPEED*1.5)):0;
    if(walking>.01)motion.phase=(motion.phase+distance*Math.PI*2/3.2)%(Math.PI*2);
    motion.bob=THREE.MathUtils.damp(motion.bob,walking*(player.crouched?.55:1),16,dt);
    if(walking===0&&motion.bob<.0001)motion.bob=0;
  }
  function pause() {
    if(!active || paused) return;
    hurtAnimation?.cancel();
    paused=true; audio.setActive(false);clearInput(); prompt.hidden=true;
    document.querySelector('#escape-resume').textContent=tr('继续游戏');
    if(document.pointerLockElement===canvas) document.exitPointerLock();
    if(!dialog.open) dialog.showModal();
  }
  function openSettings(){
    if(captured||won||gameOver)return;
    if(active){pause();return;}
    clearInput();document.querySelector('#escape-resume').textContent=tr('返回');if(!dialog.open)dialog.showModal();
  }
  function lockView() {
    if(touch || lockPending || document.pointerLockElement===canvas) return;
    lockPending=true;
    try {
      const request=canvas.requestPointerLock();
      request?.catch?.(()=>useMouseLook());
    } catch { useMouseLook(); }
  }
  function useMouseLook() {
    lockPending=false;
    if(!active || paused) return;
    if(document.pointerLockElement===canvas) {fallback=false;setHint();return;}
    fallback=true;hoverPointer=null;
    setHint('移动鼠标转头，点击画面可锁定鼠标 · {help}',{help:helpSource});
  }
  function resume() {
    if(!active){dialog.close();modeButton.focus({preventScroll:true});return;}
    if(document.hidden || clueDialogs?.active) return;
    if(captured||won){paused=true;if(!caughtDialog.open)caughtDialog.showModal();return;}
    dialog.close(); paused=false;audio.setActive(true);void audio.unlock();clearInput(); canvas.focus({preventScroll:true}); lockView();
  }
  function enter() {
    if(active) { resume(); return; }
    active=true;hasEntered=true;paused=false;lastLocation='';clearInput();renderDifficulty();runClues?.beginRun();pursuer?.beginRun?.();
    shadowsDirty=true;
    Object.entries(groups).forEach(([id,group])=>{group.visible=id!=='labels';});
    roof.visible=true; playerPin.visible=false;
    pursuer?.setMapLayer('all');
    stage.classList.add('is-walking'); stage.classList.toggle('has-touch',touch);
    modeButton.hidden=true;modeButton.setAttribute('aria-pressed','true');status.hidden=true;
    updateCamera(); resume();
  }
  function showMap() {
    hurtAnimation?.cancel();
    if(!active) return;
    active=false; paused=false;audio.setActive(false);clearInput(); dialog.close();caughtDialog.close();clueDialogs?.dismiss();
    document.querySelector('#escape-consume-progress').hidden=true;
    shadowsDirty=true;
    if(document.pointerLockElement===canvas) document.exitPointerLock();
    stage.classList.remove('is-walking');
    modeButton.textContent=tr('继续游戏');modeButton.hidden=false;modeButton.setAttribute('aria-pressed','false');
    prompt.hidden=true; torch.visible=false;heldFlashlight.visible=false;if(heldProp)heldProp.visible=false;placementMarker.visible=false;
    groups.labels.visible=true; playerPin.visible=true;
    playerPin.position.set(player.x,player.y+1.15,player.z);
    onMap(); modeButton.focus({preventScroll:true});
  }
  function interact() {
    if(!active || paused||consumption.active) return;
    if(bedHide) {
      if(!leaveBed(bedHide,player,navigation)){setHint('床边暂时被挡住，换个时机再按 E 出来。');return;}
      bedHide=null;clearInput();setHint();return;
    }
    if(nearest?.kind==='bed') {
      const before={x:player.x,y:player.y,z:player.z,crouched:player.crouched};
      bedHide=hideUnderBed(nearest.bed,player,navigation);
      if(bedHide){pursuer?.observeHiding({kind:'bed',target:nearest.bed,position:before});eyeOffset=BED_HIDE_EYE_HEIGHT;clearInput();setHint('已躲在床底，无法移动；按 E 出来。');}
      return;
    }
    if(!nearest) {
      const item=inventory.slots[inventory.selected];camera.getWorldDirection(direction);
      const target=worldItems.placement(item,camera.position,direction,player);
      if(item&&worldItems.place(item,target)){inventory.remove(inventory.selected);setHint('已放置{item}。',{item});placementMarker.visible=false;}
      else if(item)setHint('对准附近的桌面、地面或层架空位再按 E 放置。');
      return;
    }
    if(nearest.kind==='item') {
      if(!worldItems.pickup(nearest.entry,inventory))setHint('物品栏已满，先丢下一件物品。');
      else setHint();
      nearest=null;prompt.hidden=true;updateEquipment();return;
    }
    if(nearest.kind==='naiwa-key') {
      camera.getWorldDirection(direction);
      if(pursuer?.state!=='down')setHint('奶蛙倒地时才能拿走腰间的后门钥匙。');
      else if(pursuer.pickupKey(inventory,camera.position,direction)){setHint('拿到了后门钥匙，持有时按 E 开关后门，钥匙可重复使用。');shadowsDirty=true;}
      else setHint(inventory.slots.every(Boolean)?'物品栏已满，先丢下一件物品。':'靠近并对准奶蛙腰间的钥匙再按 E。');
      nearest=null;prompt.hidden=true;return;
    }
    if(nearest.kind==='escape-fence'){setHint(escapeProgress.missingStep(inventory.slots[inventory.selected])??'选中断线钳，对准北侧逃生栅栏按右键。');return;}
    if(nearest.kind==='code-note'){clueDialogs?.open('note');return;}
    if(nearest.kind==='fixture') {
      if(nearest.locked) {
        audio.lock(nearest);setHint(inventory.slots.some(item=>item?.kind===nearest.keyKind)?'选中工具箱钥匙，对准箱锁按右键插入，再按 E 开关箱子。':'工具箱上了锁，需要找到对应的钥匙。');return;
      }
      nearest.open=!nearest.open;nearest.noiseOwner=player;setHint();return;
    }
    const door=nearest;
    if(doorImpactLocked(door)){setHint('门受到撞击，稍等片刻再使用。');return;}
    if(door.codeRequired){clueDialogs?.open('gate');return;}
    if(door.playerKeyKind&&!inventory.slots.some(item=>item?.kind===door.playerKeyKind)) {
      audio.lock(door);setHint('厨房后门需要后门钥匙；奶蛙倒地时可拿走它腰间的钥匙。');return;
    }
    if(door.open && playerInDoorSwing(door,player)) {
      setHint('先离开门口，再关门。'); return;
    }
    setCastleDoorOpen(door,!door.open,player);setHint();
  }
  function useSelected() {
    if(!active||paused||consumption.active)return;
    const item=inventory.slots[inventory.selected];
    if(item?.type==='flashlight') {item.on=!item.on;audio.switchFlashlight();scene.dispatchEvent({type:'escape-player-action',action:'flashlight'});renderInventory();setHint();}
    else if(item?.kind==='rearDoorKey'&&!bedHide) {
      if(nearest?.id==='rear')interact();else setHint('后门钥匙可重复使用，持有时按 E 开关厨房后门。');
    }
    else if(item?.type==='key'&&!bedHide) {
      camera.getWorldDirection(direction);
      const target=nearestFixture(interactables,player,camera,direction,navigation);
      if(target?.beforeUnlock&&!target.beforeUnlock()){setHint('先阅读正门密码线索。二楼有线索。');return;}
      if(insertFixtureKey(target,item)) {
        audio.lock(target,true);inventory.remove(inventory.selected);nearest=target;shadowsDirty=true;
        setHint('钥匙已插在箱锁上，永久保留；按 E 开关箱子。');
      }else setHint('钥匙不能投掷。对准附近对应的箱锁按右键插入。');
    }
    else if(item?.kind==='boltCutters'&&!bedHide) {
      camera.getWorldDirection(direction);
      if(player.heldBy){setHint('被抱住时先反击或挣脱！');return;}
      if(escapeProgress?.tryCut(item,camera.position,direction,navigation)) {
        worldItems.physics.syncColliders();shadowsDirty=true;nearest=null;prompt.hidden=true;setHint('栅栏已剪开，穿过缺口跑到庭院外！');
      }else setHint(escapeProgress?.missingStep(item)??'靠近并对准北侧逃生栅栏，再按右键剪开。');
    }
    else if(item&&!bedHide) {
      camera.getWorldDirection(direction);
      if(worldItems.throw(item,player,camera.position,direction)){inventory.remove(inventory.selected);nearest=null;prompt.hidden=true;setHint('已投出{item}。',{item});}
      else setHint('这里空间不足，后退一点再投掷。');
    }
  }
  function dropSelected() {
    if(!active||paused||bedHide||consumption.active)return;
    const item=inventory.slots[inventory.selected];if(!item)return;
    if(!worldItems.drop(item,player)){setHint('这里空间不足，后退一点再丢弃。');return;}inventory.remove(inventory.selected);
    nearest=null;prompt.hidden=true;setHint('{item}已丢下，靠近后按 E 拾取。',{item});
  }
  function look(dx,dy) {
    player.yaw-=dx*.0025;
    player.pitch=THREE.MathUtils.clamp(player.pitch-dy*.0025,-1.35,1.35);
  }
  function attack() {
    const item=inventory.slots[inventory.selected];
    if(!active||paused||bedHide||consumption.active||!item?.melee||swingCooldown>0)return;
    swingItemId=item.id;swingTime=CROWBAR_MELEE.duration;swingCooldown=CROWBAR_MELEE.interval;swingHit=false;updateEquipment();
  }
  function updateMelee(dt) {
    swingCooldown=Math.max(0,swingCooldown-dt);if(swingCooldown<.000001)swingCooldown=0;
    if(swingTime<=0)return;
    const item=inventory.slots[inventory.selected];
    if(item?.id!==swingItemId){swingTime=0;return;}
    const before=swingTime;
    swingTime=Math.max(0,swingTime-dt);if(swingTime<.000001)swingTime=0;
    if(before>CROWBAR_MELEE.duration-CROWBAR_MELEE.windup+.000001&&swingTime<=CROWBAR_MELEE.duration-CROWBAR_MELEE.windup+.000001)
      scene.dispatchEvent({type:'escape-player-action',action:'swing',item,elapsed:CROWBAR_MELEE.duration-swingTime});
    if(!swingHit&&swingTime<=CROWBAR_MELEE.duration-CROWBAR_MELEE.impact+.000001) {
      swingHit=true;camera.getWorldDirection(direction);
      const hit=worldItems.strike(camera.position,direction,item,{damageScale:playerDamageScale(player)});
      setHint(hit?.broken?(hit.target?.escapeRoute?'大窗已打碎，可以跳过窗台进入后院。':hit.target?.kind==='window'?'小窗玻璃已打碎，窄格栏杆无法翻越。':'击碎了眼前的物品。'):hit?.target?.kind==='window'?'窗玻璃出现裂痕，还需要再敲击。':hit?.hit?'撬棍击中了目标。':'挥动撬棍。');
    }
    updateEquipment();
  }
  function tick(dt) {
    let dirty=shadowsDirty||lastItemRevision!==worldItems.revision;shadowsDirty=false;lastItemRevision=worldItems.revision;
    if(active&&!paused)for(const door of doors) {
      if(updateCastleDoor(door,dt,pursuer?[player,pursuer.actor]:player,navigation))dirty=true;
    }
    if(active&&!paused)for(const action of interactables)if(updateFixtureAction(action,dt,pursuer?[player,pursuer.actor]:player,navigation))dirty=true;
    runClues?.sync();
    if(active&&!paused&&escapeProgress?.fence.tick(dt))dirty=true;
    if(!active) return dirty;
    if(!paused) {
      tickPlayerEffects(player,dt);consumption.tick(dt);renderEffects();
      if(bedHide&&player.hidingBed!==bedHide.bed.id)bedHide=null;
      if(!bedHide)setCrouch(player,keys.has('ShiftLeft')||keys.has('ShiftRight'),navigation);
      eyeOffset=THREE.MathUtils.damp(eyeOffset,bedHide?BED_HIDE_EYE_HEIGHT:player.crouched?CROUCH_EYE_HEIGHT:EYE_HEIGHT,18,dt);
      let f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+touchForward;
      let r=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touchRight;
      const magnitude=Math.hypot(f,r); if(magnitude>1) {f/=magnitude;r/=magnitude;}
      if(!bedHide)movePlayer(f,r,dt);else {tickStamina(player,dt,false);renderVitals();}
      if(doorForce&&!advanceDoorDisplacement(doorForce,player,navigation,dt))doorForce=null;
      if(gameOver)return true;
      const hidingCloset=bedHide?null:wardrobeContaining(interactables,player);
      if(hidingCloset&&player.hidingWardrobe!==hidingCloset.id)pursuer?.observeHiding({kind:'wardrobe',target:hidingCloset});
      player.hidden=!!bedHide||!!hidingCloset&&hidingCloset.amount<.04;player.hidingWardrobe=hidingCloset?.id??null;
      updateCamera();
      if(pursuer?.tick(dt))dirty=true;
      if(captured)return true;
      worldItems.tick(dt,player);
      updateCamera();
      updateMelee(dt);renderEffects();
      if(escapeProgress?.observe(player,inventory)){showVictory();return true;}
      nearest=null; let best=2.25;
      camera.getWorldDirection(direction);
      if(!bedHide)for(const door of doors) {
        if(Math.abs(player.y-door.y)>.7) continue;
        const dx=door.x-player.x,dz=door.z-player.z,distance=Math.hypot(dx,dz);
        const doorAim=new THREE.Vector3(door.x,door.y+1.2,door.z).sub(camera.position);
        if(distance<best && (door.codeRequired?doorAim.dot(direction)/doorAim.length()>.85:distance<.7 || (dx*direction.x+dz*direction.z)/distance>.35)
          &&navigation.lineClear(camera.position,{x:door.x,y:door.y+1.2,z:door.z},door.parts.map(part=>part.collider))) {best=distance;nearest=door;}
      }
      const fixture=!bedHide?nearestFixture(interactables,player,camera,direction,navigation):null;
      if(fixture)nearest=fixture;
      const item=!bedHide?worldItems.nearby(player,direction,camera.position.y-player.y):null;
      if(item)nearest={kind:'item',entry:item};
      const codeNote=!bedHide?runClues?.nearbyNote(camera.position,direction,navigation):null;if(codeNote)nearest=codeNote;
      const fenceTarget=!bedHide?escapeProgress?.fence.nearby(camera.position,direction,navigation):null;if(fenceTarget)nearest=fenceTarget;
      const waistKey=!bedHide?pursuer?.nearbyKey?.(camera.position,direction):null;if(waistKey)nearest=waistKey;
      if(!nearest&&!bedHide)nearest=nearestBed(beds,player,camera,navigation);
      let promptHidden=!nearest,promptText='';
      const key=touch?tr('点按'):'E';
      if(nearest)promptText=nearest.kind==='item'?tr('{key} · 拾取{item}',{key,item:itemLabel(nearest.entry.item)}):tr('{key} · {action}{item}',{key,action:tr(nearest.open?'关闭':'打开'),item:tr(nearest.name)});
      if(nearest?.kind==='code-note')promptText=tr('{key} · 放大查看密码纸条',{key});
      if(nearest?.kind==='bed')promptText=tr('{key} · 躲进床底',{key});
      if(nearest?.kind==='naiwa-key')promptText=tr(nearest.available?'{key} · 拿走后门钥匙':'奶蛙倒地时才能拿走腰间的后门钥匙。',{key});
      if(bedHide){promptHidden=false;promptText=tr('{key} · 离开床底',{key});}
      if(nearest?.locked)promptText=inventory.slots[inventory.selected]?.kind===nearest.keyKind
        ?tr(touch?'点按“插入钥匙”解锁{item}':'右键 · 插入钥匙 · {item}',{item:tr(nearest.name)})
        :tr(inventory.slots.some(item=>item?.kind===nearest.keyKind)?'先选中钥匙 · {item}':'{key} · 需要钥匙 · {item}',{key,item:tr(nearest.name)});
      if(nearest?.blocked)promptText=tr('请让开{item} · {key} 反向开关',{key,item:tr(nearest.kind==='fixture'?nearest.name:'门扇')});
      if(nearest?.playerKeyKind&&!inventory.slots.some(item=>item?.kind===nearest.playerKeyKind))promptText=tr('{key} · 需要后门钥匙 · {item}',{key,item:tr(nearest.name)});
      if(nearest?.kind==='escape-fence')promptText=tr(escapeProgress.missingStep(inventory.slots[inventory.selected])??(touch?'点按 · 剪开栅栏':'右键 · 剪开栅栏'));
      if(nearest?.codeRequired)promptText=tr('{key} · 输入大门密码',{key});
      if(nearest?.parts&&doorImpactLocked(nearest))promptText=tr('门受到撞击，稍等片刻再使用。');
      const held=inventory.slots[inventory.selected],target=!nearest&&!bedHide?worldItems.placement(held,camera.position,direction,player):null;
      placementMarker.visible=!!target;
      if(target){placementMarker.position.copy(target.position);placementMarker.rotation.y=target.yaw;placementMarker.scale.set(...held.size);placementMarker.material.color.setHex(target.valid?0x97c5a6:0xb36756);if(target.valid){promptHidden=false;promptText=tr('{key} · 放置{item}',{key,item:itemLabel(held)});}}
      ui(prompt,'hidden',promptHidden);if(!promptHidden)ui(prompt,'textContent',promptText);
      const closet=bedHide?null:wardrobeContaining(interactables,player);player.hidden=!!bedHide||!!closet&&closet.amount<.04;player.hidingWardrobe=closet?.id??null;
      renderLocation();
      audio.tick(dt);
    }
    if(lastItemRevision!==worldItems.revision) {dirty=true;lastItemRevision=worldItems.revision;}
    return dirty;
  }
  function renderLocation() {
    const closet=bedHide?null:wardrobeContaining(interactables,player);
    const location=bedHide?tr('床底 · 已藏好 · E 出来'):closet?tr(player.hidden?'衣柜内 · 已藏好':'衣柜内 · 柜门未关'):'';
    ui(status,'hidden',!location);
    if(location!==lastLocation){status.textContent=location;lastLocation=location;}
  }
  function renderEffects() {
    const lines=[];
    if(player.effects?.milk>0)lines.push(tr('牛奶抗性 · 所有伤害减半 · {time} 秒',{time:Math.ceil(player.effects.milk)}));
    if(player.effects?.wine>0)lines.push(tr('酒劲 · 伤害 +50% · 移速 80% · {time} 秒',{time:Math.ceil(player.effects.wine)}));
    if(pursuer?.struggleTime>0)lines.push(tr('挣扎剩余 {time} 秒 · 连续点跳或反击',{time:pursuer.struggleTime.toFixed(1)}));
    const text=lines.join('\n');
    if(text!==effectSnapshot){effectSnapshot=text;ui(effectPanel,'textContent',text);renderDifficulty();}ui(effectPanel,'hidden',!text);
    ui(consumeProgress,'hidden',!consumption.active||!active);
    if(consumption.active){const action=consumption.action;ui(consumeLabel,'textContent',tr(isDrink(action.item)?'正在喝{item} · {time} 秒':'正在吃{item} · {time} 秒',{item:foodLabel(action.item),time:Math.max(0,CONSUMPTION.duration-action.elapsed).toFixed(1)}));ui(consumeMeter,'value',action.elapsed);}
    ui(jumpButton,'textContent',tr(pursuer?.struggleTime>0?'挣扎':'跳跃'));
  }
  function eatSelected() {
    if(!active||paused||consumption.active||swingTime>0)return;
    const item=inventory.slots[inventory.selected];
    if(player.heldBy){setHint('被抱住时先反击或挣脱！');return;}
    if(!canConsume(item)){setHint(item?.empty?'包装已经空了。':item?.kind==='egg'?'鸡蛋不能食用。':'当前物品不能食用。');return;}
    if(consumption.start()){nearest=null;prompt.hidden=true;placementMarker.visible=false;renderEffects();}
  }
  function attemptJump() {
    if(!active||paused)return;
    if(player.heldBy){if(pursuer?.struggleJump?.())jumpPlayer(player);renderEffects();return;}
    jumpPlayer(player);
  }
  eatButton.addEventListener('click',eatSelected);
  modeButton.addEventListener('click',enter);
  useButton.addEventListener('click',useSelected);
  dropButton.addEventListener('click',dropSelected);
  attackButton.addEventListener('click',attack);
  for(const id of ['#escape-settings-button','#escape-touch-settings'])document.querySelector(id)?.addEventListener('click',openSettings);
  prompt.addEventListener('click',()=>{if(touch&&nearest?.kind==='escape-fence')useSelected();else interact();});
  inventoryButtons.forEach((button,index)=>button.addEventListener('click',()=>{if(active&&!paused&&!consumption.active)inventory.select(index);}));
  canvas.addEventListener('wheel',event=>{
    if(!active||paused||!event.deltaY) return;
    event.preventDefault();if(!consumption.active)inventory.cycle(event.deltaY);
  },{passive:false});
  jumpButton.addEventListener('click',attemptJump);
  document.querySelector('#escape-resume').addEventListener('click',resume);
  document.querySelector('#escape-pause-map').addEventListener('click',showMap);
  function restartPosition() {
    if(gameOver||won){window.location.reload();return;}
    captured=false;resetPlayerPosition();if(pendingWake){pendingWake=false;pursuer?.onPlayerWake();}caughtDialog.close();setHint();
    if(active)resume();else enter();
  }
  function resetPlayerPosition({preserveCapture=false}={}) {
    if(preserveCapture)audio.setActive(false,{preserveCapture:true});
    doorForce=null;
    consumption.cancel();const {health,effects,stamina,sprintExhausted}=player;
    bedHide=null;Object.assign(player,createPlayer(),{health,effects,stamina,sprintExhausted,hidden:false,hidingWardrobe:null});delete player.skillControlScale;
    escapeProgress?.resetPosition(player);pursuer?.reset({keepAlertness:true});audio.reset({preserveCapture});eyeOffset=EYE_HEIGHT;clearInput();renderVitals();shadowsDirty=true;
  }
  player.onDoorImpact=impact=>{
    if(captured||gameOver||won||player.hidden||player.hidingBed||player.hidingWardrobe)return false;
    damagePlayer(player,impact.damage,'door');motion.vx=motion.vz=0;
    if(!gameOver)doorForce=createDoorDisplacement(player,impact);
    return true;
  };
  document.querySelector('#escape-restart-position').addEventListener('click',restartPosition);
  document.querySelector('#escape-caught-retry').addEventListener('click',restartPosition);
  document.querySelector('#escape-caught-map').addEventListener('click',showMap);
  caughtDialog.addEventListener('cancel',event=>event.preventDefault());
  function showOutcome({preserveCapture=false}={}) {
    captured=true;paused=true;consumption.cancel();audio.setActive(false,{preserveCapture});audio.outcome({captured:preserveCapture});clearInput();prompt.hidden=true;placementMarker.visible=false;dialog.close();clueDialogs?.dismiss();
    renderOutcome();
    if(document.pointerLockElement===canvas)document.exitPointerLock();if(!caughtDialog.open)caughtDialog.showModal();
  }
  function showVictory() {
    if(won||captured||gameOver||!active)return;
    won=true;paused=true;hurtAnimation?.cancel();consumption.cancel();audio.setActive(false);clearInput();prompt.hidden=true;placementMarker.visible=false;dialog.close();clueDialogs?.dismiss();
    renderOutcome();if(document.pointerLockElement===canvas)document.exitPointerLock();if(!caughtDialog.open)caughtDialog.showModal();
    scene.dispatchEvent({type:'escape-victory',health:player.health,difficulty,route:escapeProgress?.rearRoute});
  }
  function renderOutcome() {
    document.querySelector('#escape-outcome-eyebrow').textContent=won?'NAIWA / ESCAPED':gameOver?'NAIWA / GAME OVER':'NAIWA / CAUGHT';
    caughtDialog.dataset.outcome=won?'won':gameOver?'lost':'caught';
    if(won){
      document.querySelector('#escape-caught-title').textContent=tr('逃脱成功 · 游戏胜利');
      document.querySelector('#escape-caught-description').textContent=tr('你记住了密码，拿到断线钳，进入后院并剪开栅栏，成功逃出古堡！');
      document.querySelector('#escape-caught-retry').textContent=tr('重新开始');return;
    }
    document.querySelector('#escape-caught-title').textContent=tr(gameOver?'生命耗尽 · 游戏结束':'你晕了过去');
    document.querySelector('#escape-caught-description').textContent=gameOver?tr('生命值已归零。重新开始会重置生命、警觉、物品和本次探索进度。'):tr(difficulty==='easy'?'被奶蛙抱住，失去 {damage} 点生命。你已回到地下室起点，剩余生命 {health}。简单模式保留后门钥匙、其他物品和场景状态，醒来后奶蛙警觉值降低 10。':'被奶蛙抱住，失去 {damage} 点生命。你已回到地下室起点，剩余生命 {health}。后门钥匙被奶蛙没收并重新挂回腰间；其他物品和场景状态保留，醒来后奶蛙警觉值降低 10。',{damage:lastCaptureDamage,health:player.health});
    document.querySelector('#escape-caught-retry').textContent=tr(gameOver?'重新开始':'醒来继续');
  }
  function endRun() {
    if(gameOver||won)return;gameOver=true;showOutcome({preserveCapture:lastHealthEvent?.source==='grab'});
  }
  function capture() {
    if(!active||captured||won)return;captured=true;paused=true;clearInput();prompt.hidden=true;placementMarker.visible=false;dialog.close();clueDialogs?.dismiss();
    if(difficulty!=='easy'){
      for(let i=0;i<inventory.slots.length;i++)if(inventory.slots[i]?.kind==='rearDoorKey')inventory.remove(i);
      worldItems.confiscate('rearDoorKey');pursuer?.reclaimKey?.();shadowsDirty=true;
    }
    lastCaptureDamage=damagePlayer(player,difficultyRules(difficulty).captureDamage,'grab');if(gameOver)return;
    pendingWake=true;
    // Preserve the call across the immediate wake-position reset. That reset
    // also publishes a patrol state, so keep the same capture episode in audio.
    resetPlayerPosition({preserveCapture:true});showOutcome({preserveCapture:true});
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();resume();});
  document.addEventListener('pointerlockchange',()=>{
    lockPending=false;hoverPointer=null;
    if(document.pointerLockElement===canvas) {
      if(!active||paused) {document.exitPointerLock();return;}
      fallback=false;setHint();
    } else if(active&&!fallback&&!touch) pause();
  });
  document.addEventListener('pointerlockerror',useMouseLook);
  document.addEventListener('mousemove',event=>{if(active&&!paused&&document.pointerLockElement===canvas) look(event.movementX,event.movementY);});
  document.addEventListener('keydown',event=>{
    if(event.code==='Escape'&&!active&&!dialog.open&&!caughtDialog.open&&!clueDialogs?.active&&!event.repeat&&!event.target.closest?.('dialog')){event.preventDefault();openSettings();return;}
    if(!active || paused || event.target.closest('dialog,input,select,textarea,button,a,[contenteditable="true"]')) return;
    if(event.ctrlKey || event.metaKey || event.altKey) return;
    if(['KeyW','KeyA','KeyS','KeyD','KeyR','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(event.code)) {event.preventDefault();keys.add(event.code);}
    if(event.repeat) return;
    if(event.code==='Space') {event.preventDefault();attemptJump();}
    if(event.code==='KeyG') {event.preventDefault();eatSelected();}
    const slot=/^(?:Digit|Numpad)([1-7])$/.exec(event.code);
    if(slot&&!consumption.active) {event.preventDefault();inventory.select(Number(slot[1])-1);}
    if(event.code==='KeyE') {event.preventDefault();interact();}
    if(event.code==='KeyQ') {event.preventDefault();dropSelected();}
    if(event.code==='KeyM') {event.preventDefault();showMap();}
    if(event.code==='Escape' && document.pointerLockElement!==canvas) {event.preventDefault();pause();}
  });
  document.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',pause);
  document.addEventListener('visibilitychange',()=>{if(document.hidden) pause();});
  canvas.addEventListener('pointerdown',event=>{
    if(active&&!paused&&event.button===2) {event.preventDefault();useSelected();return;}
    if(active&&!paused&&event.button===0&&event.pointerType!=='touch'&&event.pointerType!=='pen')attack();
    if(!active || paused || document.pointerLockElement===canvas) return;
    if(event.pointerType==='touch'||event.pointerType==='pen') {
      lookPointer={id:event.pointerId,x:event.clientX,y:event.clientY}; canvas.setPointerCapture(event.pointerId);
    } else {
      hoverPointer={x:event.clientX,y:event.clientY};canvas.focus({preventScroll:true});lockView();
    }
  });
  canvas.addEventListener('pointermove',event=>{
    if(!active||paused||document.pointerLockElement===canvas) return;
    if(event.pointerType==='touch'||event.pointerType==='pen') {
      if(lookPointer?.id!==event.pointerId) return;
      look(event.clientX-lookPointer.x,event.clientY-lookPointer.y);
      lookPointer.x=event.clientX;lookPointer.y=event.clientY;
    } else {
      if(hoverPointer) look(event.clientX-hoverPointer.x,event.clientY-hoverPointer.y);
      hoverPointer={x:event.clientX,y:event.clientY};
    }
  });
  canvas.addEventListener('pointerenter',event=>{hoverPointer={x:event.clientX,y:event.clientY};});
  canvas.addEventListener('pointerleave',()=>{hoverPointer=null;});
  canvas.addEventListener('contextmenu',event=>{if(active)event.preventDefault();});
  const endLook=event=>{if(lookPointer?.id===event.pointerId) lookPointer=null;};
  canvas.addEventListener('pointerup',endLook);canvas.addEventListener('pointercancel',endLook);canvas.addEventListener('lostpointercapture',endLook);
  function moveStick(event) {
    const rect=stick.getBoundingClientRect(),radius=rect.width*.34;
    let x=(event.clientX-rect.left-rect.width/2)/radius,y=(event.clientY-rect.top-rect.height/2)/radius;
    const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
    touchRight=x;touchForward=-y;
    knob.style.transform=`translate(calc(-50% + ${x*radius}px),calc(-50% + ${y*radius}px))`;
  }
  stick.addEventListener('pointerdown',event=>{if(!active||paused||stickPointer!==null)return;event.preventDefault();stickPointer=event.pointerId;stick.setPointerCapture(event.pointerId);moveStick(event);});
  stick.addEventListener('pointermove',event=>{if(stickPointer===event.pointerId)moveStick(event);});
  const endStick=event=>{if(stickPointer!==event.pointerId)return;stickPointer=null;touchRight=0;touchForward=0;knob.style.transform='translate(-50%,-50%)';};
  stick.addEventListener('pointerup',endStick);stick.addEventListener('pointercancel',endStick);stick.addEventListener('lostpointercapture',endStick);
  crouchButton.addEventListener('pointerdown',event=>{if(!active||paused)return;event.preventDefault();keys.add('ShiftLeft');crouchButton.setPointerCapture(event.pointerId);});
  for(const event of ['pointerup','pointercancel','lostpointercapture']) crouchButton.addEventListener(event,()=>keys.delete('ShiftLeft'));
  sprintButton.addEventListener('pointerdown',event=>{if(!active||paused||sprintPointer!==null)return;event.preventDefault();sprintPointer=event.pointerId;sprintButton.setPointerCapture(event.pointerId);});
  const endSprint=event=>{if(sprintPointer!==event.pointerId)return;sprintPointer=null;uiAttribute(sprintButton,'aria-pressed',String(keys.has('KeyR')&&!player.crouched));};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])sprintButton.addEventListener(event,endSprint);
  function refreshLanguage() {
    clueDialogs?.refreshLanguage();renderVitals();renderInventory();renderDifficulty();effectSnapshot='';renderEffects();setHint(hintSource,hintParams);lastLocation='';
    if(lastHealthEvent)renderHealthMessage(lastHealthEvent);
    if(active)renderLocation();
    modeButton.textContent=tr(hasEntered?'继续游戏':'开始游戏');modeButton.hidden=active;
    document.querySelector('#escape-resume').textContent=tr(active?'继续游戏':'返回');
    if(captured||won)renderOutcome();
  }
  playerPin.position.set(player.x,player.y+1.15,player.z);
  inventory.store(flashlightItem());
  updateCamera();
  return {camera,player,inventory,worldItems,audio,consumption,eatSelected,attemptJump,flashlightBeam,get flashlight(){return torch;},refreshLanguage,setDifficulty,get difficulty(){return difficulty;},tick,enter,showMap,pause,capture,restartPosition,setPursuer(value){pursuer=value;if(value){value.setDifficulty?.(difficulty,{restartOpening:!hasEntered});if(hasEntered)value.beginRun?.();alertness=value.alertness;value.setFlashlightSource?.(flashlightBeam);value.setTrackingSource?.(()=>!!escapeProgress?.cuttersClaimed||inventory.slots.some(item=>item?.kind==='boltCutters'));}renderVitals();},get active(){return active;},get paused(){return paused;},get captured(){return captured;},get gameOver(){return gameOver;},get won(){return won;}};
}
