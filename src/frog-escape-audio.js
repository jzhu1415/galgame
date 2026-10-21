import manifest from '../assets/audio/frog-escape/manifest.json' with {type:'json'};
import gait from '../assets/models/naiwa-h25-gait.json' with {type:'json'};
import {Vector3} from 'three';
import {CROWBAR_MELEE} from './frog-escape-melee.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const escapeAudioSettingsKey='naiwa-escape-sfx-v1';
export const foleyClips=manifest.clips;
const variants=(prefix,count=2)=>Array.from({length:count},(_,i)=>`${prefix}_${String(i).padStart(3,'0')}`);
const pools={
  woodStep:variants('footstep_wood',3),stoneStep:variants('footstep_concrete',3),grassStep:variants('footstep_grass',3),
  glassLight:variants('impactGlass_light'),glassHeavy:variants('impactGlass_heavy'),
  ceramicLight:variants('impactPlate_light'),ceramicHeavy:variants('impactPlate_heavy'),
  metalLight:['metalClink_01','metalClink_02'],metalHeavy:['metalClang_01','metalClang_02','metalClang_03'],
  metalDrop:['metalDrop_01','metalDrop_02'],
  glassBreak:['glassBreak_01','glassBreak_02'],windowBreak:['windowBreak_01','windowBreak_02'],
  ceramicBreak:['ceramicBreak_01','ceramicBreak_02'],crowbarSwing:['crowbarSwing_01','crowbarSwing_02'],
  crowbarBonk:['metalClang_03'],
  tin:variants('impactTin_medium'),soft:variants('impactSoft_medium'),wet:variants('impactSoft_heavy'),
  woodLight:variants('impactWood_light'),woodHeavy:variants('impactWood_heavy'),splinter:variants('impactPlank_medium'),
  body:variants('impactPunch_medium'),bodyHeavy:variants('impactPunch_heavy'),
  doorOpen:['doorOpen_1','doorOpen_2'],doorClose:['doorClose_1','doorClose_2'],
  swing:['knifeSlice','knifeSlice2'],cloth:['cloth1','cloth2'],
};

export function propSoundMaterial(item) {
  if(item?.kind==='bananaPeel')return 'soft';
  if(['glass','bottle','jar'].includes(item?.kind)||item?.type==='glass')return 'glass';
  if(['plate','bowl','cup','vase'].includes(item?.kind))return 'ceramic';
  if(['egg','tomato'].includes(item?.kind))return 'wet';
  if(item?.kind==='milk'||item?.kind==='book')return 'carton';
  if(item?.type==='food')return 'soft';
  if(item?.type==='cutlery'||item?.type==='tool'||item?.type==='flashlight'||item?.type==='key')return 'metal';
  return 'wood';
}

export function footstepSurface(actor) {
  if(Math.abs(actor.x)>11.25||Math.abs(actor.z)>7.1)return actor.x>12.3&&actor.x<17.7&&actor.z>1.5&&actor.z<6.5?'wood':'grass';
  return actor.y>3?'wood':'stone';
}

export function soundPlacement(position,listener,navigation,ignore=[],range=24) {
  const dx=position.x-listener.x,dy=position.y-listener.y,dz=position.z-listener.z;
  const distance=Math.hypot(dx,dy,dz);
  if(distance>=range)return {gain:0,pan:0,occluded:false};
  const occluded=!!navigation&&!navigation.lineClear(listener,position,ignore);
  const gain=(1-distance/range)**2/(1+(distance/8)**2)*(occluded?.3:1);
  const pan=clamp((dx*Math.cos(listener.yaw??0)-dz*Math.sin(listener.yaw??0))/Math.max(1,distance),-.9,.9);
  return {gain,pan,occluded};
}

// One shared context/cache. Andy is the user's supplied recording; no speech
// synthesis is used. Only that capture call may continue into its outcome.
export function createFoleyMixer({contextFactory=()=>{
  const Context=globalThis.AudioContext??globalThis.webkitAudioContext;return Context?new Context():null;
},fetcher=globalThis.fetch}={}) {
  let context=null,master=null,limiter=null,active=false,enabled=true,volume=.65,epoch=0,captureEpoch=0,captureContinuation=false,disposed=false;
  const buffers=new Map(),voices=new Set();
  function load(name) {
    if(!context||!foleyClips[name]||!fetcher)return Promise.resolve(null);
    if(!buffers.has(name))buffers.set(name,Promise.resolve().then(()=>fetcher(`/audio/frog-escape/${foleyClips[name].file}`))
      .then(response=>{if(!response.ok)throw new Error('Missing foley');return response.arrayBuffer();})
      .then(data=>context.decodeAudioData(data)).catch(()=>null));
    return buffers.get(name);
  }
  function stopAll({preserveCapture=false}={}) {
    epoch++;captureContinuation=preserveCapture;if(!preserveCapture)captureEpoch++;
    for(const voice of [...voices]){if(preserveCapture&&voice.captureCall)continue;try{voice.source.stop();}catch{}voice.cleanup();}
  }
  function unlock() {
    if(disposed)return Promise.resolve(false);
    try {
      context??=contextFactory();if(!context)return Promise.resolve(false);
      if(!master){
        master=context.createGain();master.gain.value=enabled?volume:0;
        limiter=context.createDynamicsCompressor?.();
        if(limiter){
          limiter.threshold.value=-10;limiter.knee.value=6;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.12;
          master.connect(limiter);limiter.connect(context.destination);
        }else master.connect(context.destination);
      }
      const resumed=context.resume?.();
      // Decoding is shared with plays requested while this small local pack warms up.
      for(const name of Object.keys(foleyClips))void load(name);
      return Promise.resolve(resumed).then(()=>true).catch(()=>false);
    }catch{return Promise.resolve(false);}
  }
  function play(name,{gain=.2,pan=0,occluded=false,rate=1,delay=0,duration=null,priority=1,allowInactive=false,captureCall=false}={}) {
    if(disposed||!enabled||!context||(!active&&!allowInactive)||gain<.001)return;
    const requestedAt=context.currentTime,requestEpoch=captureCall?captureEpoch:epoch;
    void load(name).then(buffer=>{
      if(!buffer||disposed||!enabled||requestEpoch!==(captureCall?captureEpoch:epoch)||(!active&&!allowInactive&&!(captureCall&&captureContinuation))||context.state!=='running')return;
      if(context.currentTime-requestedAt>(captureCall?2:priority===0?.16:.7))return;
      if(voices.size>=16) {
        const victim=[...voices].find(voice=>voice.priority<priority);
        if(!victim)return;try{victim.source.stop();}catch{}victim.cleanup();
      }
      const source=context.createBufferSource(),level=context.createGain(),filter=context.createBiquadFilter(),panner=context.createStereoPanner?.();
      source.buffer=buffer;source.playbackRate.value=clamp(rate,.55,1.65);
      const at=context.currentTime+Math.max(0,delay),length=Math.min(buffer.duration,duration??buffer.duration)/source.playbackRate.value;
      level.gain.setValueAtTime(0,at);level.gain.linearRampToValueAtTime(gain,at+.003);
      level.gain.setValueAtTime(gain,Math.max(at+.004,at+length-.018));level.gain.linearRampToValueAtTime(0,at+length);
      filter.type='lowpass';filter.frequency.value=occluded?1100:19000;
      source.connect(filter);filter.connect(level);
      if(panner){panner.pan.value=pan;level.connect(panner);panner.connect(master);}else level.connect(master);
      const voice={source,priority,captureCall,cleanup(){voices.delete(voice);for(const node of [source,filter,level,panner])node?.disconnect();}};
      voices.add(voice);source.onended=voice.cleanup;
      source.start(at,0,Math.min(buffer.duration,duration??buffer.duration));
    });
  }
  return {unlock,play,stopAll,
    setActive(value,options){active=!!value;if(!active)stopAll(options);},
    setSettings(settings){enabled=settings.enabled;volume=settings.volume;if(master)master.gain.value=enabled?volume:0;if(!enabled)stopAll();},
    dispose(){disposed=true;stopAll();buffers.clear();master?.disconnect();limiter?.disconnect();void context?.close?.();},
  };
}

export function createEscapeAudio({scene,player,listener,navigation,doors=[],interactables=[],getPursuer=()=>null,mixer=createFoleyMixer(),random=Math.random}={}) {
  let active=false,clock=0,disposed=false,motion=new WeakMap(),captureCallPlayed=false;
  let settings={enabled:true,volume:.65};
  try {const saved=JSON.parse(globalThis.window?.localStorage?.getItem(escapeAudioSettingsKey)??'null');if(saved)settings={enabled:saved.enabled!==false,volume:Number.isFinite(saved.volume)?clamp(saved.volume,0,1):.65};}catch{}
  mixer.setSettings(settings);
  const lastChoice=new Map(),cooldowns=new Map(),panels=new Map(),bindings=[];
  const panelPosition=new Vector3();
  const positionOf=actor=>({x:actor.x,y:actor.y+1,z:actor.z});
  function resetMotion() {
    motion=new WeakMap();panels.clear();cooldowns.clear();
    for(const panel of [...doors,...interactables])panels.set(panel,{amount:panel.amount,moving:false,direction:0,quiet:0,lastCreak:-10});
  }
  resetMotion();
  function choose(pool) {
    const names=pools[pool]??[pool];let index=Math.min(names.length-1,Math.floor(random()*names.length));
    if(names.length>1&&index===lastChoice.get(pool))index=(index+1)%names.length;
    lastChoice.set(pool,index);return names[index];
  }
  function play(pool,{position=null,local=false,volume=.2,rate=1,key=pool,cooldown=.045,range=24,ignore=[],alignPeak=null,...options}={}) {
    if(disposed||!settings.enabled||(!active&&!options.allowInactive))return;
    if(clock-(cooldowns.get(key)??-100)<cooldown)return;
    const npc=getPursuer(),spatial=local||!position?{gain:1,pan:0,occluded:false}:soundPlacement(position,listener(),navigation,[npc?.actor.collider,...ignore].filter(Boolean),range);
    if(spatial.gain*volume<.001)return;
    cooldowns.set(key,clock);
    const name=choose(pool),playbackRate=clamp(rate*(name==='naiwaAndy'?1:.97+random()*.06),.55,1.65);
    // The input event marks the end of windup. Match the recording's strongest
    // air movement to the hit frame, including its small pitch variation.
    const delay=alignPeak===null?options.delay??0:Math.max(0,alignPeak-(foleyClips[name].peakTime??0)/playbackRate);
    mixer.play(name,{...options,delay,gain:spatial.gain*volume,pan:spatial.pan,occluded:spatial.occluded,rate:playbackRate});
  }
  function impact(item,options={}) {
    const material=propSoundMaterial(item),heavy=options.heavy??false;
    const metal=heavy&&(item?.mass??0)>=.35?(options.floor?'metalDrop':'metalHeavy'):'metalLight';
    const pool={glass:heavy?'glassHeavy':'glassLight',ceramic:heavy?'ceramicHeavy':'ceramicLight',metal,
      wet:'wet',soft:'soft',carton:'bookPlace1',wood:heavy?'woodHeavy':'woodLight'}[material];
    const {heavy:_,floor:__,...soundOptions}=options;
    play(pool,{rate:item?.kind==='bottle'?.8:item?.type==='cutlery'?1.15:item?.kind==='crowbar'?.94:1,...soundOptions});
  }
  function bind(type,handler){scene.addEventListener(type,handler);bindings.push([type,handler]);}
  function captureCall(allowInactive=false){
    if(captureCallPlayed)return;captureCallPlayed=true;
    play('naiwaAndy',{local:true,volume:.75,rate:1,key:'naiwa-capture-call',cooldown:0,priority:3,captureCall:true,allowInactive});
  }
  bind('escape-prop-impact',event=>{
    if(event.contact?.kind==='actor'||event.broken||event.speed<.85||event.recentPlacement)return;
    const intensity=clamp(Math.sqrt(Math.max(0,event.energy??0))/3,.1,1);
    const heavy=(event.energy??0)>=5||(event.item.mass>=.7&&event.speed>2.3);
    impact(event.item,{position:event.position,volume:.07+intensity*.22,heavy,floor:event.contact?.kind==='surface'&&Math.abs(event.normal?.y??0)>.55,key:`impact:${event.item.id}`,cooldown:.14,range:19});
  });
  bind('escape-prop-break',event=>{
    const material=propSoundMaterial(event.item),base={position:event.position,key:`break:${event.item.id}`,cooldown:.2,priority:2};
    if(material==='glass') {
      play(event.item.kind==='bottle'?'glassBreak_03':'glassBreak',{...base,volume:.31,rate:event.item.kind==='bottle'?.93:1});
    }else if(material==='ceramic') {
      // Each full recording already contains its own crack and settling pieces.
      play(event.item.kind==='cup'?'ceramicBreak_01':'ceramicBreak',{...base,volume:.3,rate:event.item.kind==='cup'?1.08:.96});
    }else if(material==='wood')play('splinter',{...base,volume:.3,rate:.86});
    else play('wet',{...base,volume:.18,rate:1.18});
  });
  bind('escape-scenery-break',event=>{
    if(event.breakable?.kind!=='window')return;
    play('windowBreak',{position:event.position,range:30,priority:2,volume:.4,rate:.94,key:`window:${event.breakable.id}`,cooldown:.3});
  });
  bind('escape-melee-strike',event=>{
    if(!event.hit)return;
    if(event.item?.kind==='crowbar') {
      play('crowbarBonk',{position:event.position,volume:.25,rate:.9,key:'crowbar-contact',cooldown:.1,priority:2});return;
    }
    if(event.broken)return;
    if(event.hitKind==='actor') {
      return;
    }
    if(event.hitKind==='window')play('glassLight',{position:event.position,volume:.24,rate:.85});
    else if(event.struckItem)impact(event.struckItem,{position:event.position,volume:.28,heavy:true});
    else play({metal:'metalHeavy',stone:'impactGeneric_light_000',ceramic:'ceramicHeavy',glass:'glassHeavy',soft:'soft'}[event.surfaceMaterial]??'woodHeavy',{position:event.position,volume:.24,rate:.88});
  });
  bind('escape-prop-place',event=>impact(event.item,{position:event.position,volume:.1,heavy:false,key:`place:${event.item.id}`,cooldown:.15}));
  bind('escape-fence-cut',event=>{play('metalHeavy',{position:event.position,volume:.22,rate:1.12,key:'fence-snip',priority:2});play('metalLatch',{position:event.position,volume:.14,delay:.09,key:'fence-release'});});
  bind('escape-fence-snip',event=>{play('metalClick',{position:event.position,volume:.14,rate:.86,key:`fence-squeeze-${event.index}`,priority:2});play('metalLatch',{position:event.position,volume:.08,rate:1.18,delay:.06,key:`fence-link-${event.index}`});});
  bind('escape-prop-pickup',event=>play(propSoundMaterial(event.item)==='metal'?'metalClick':'cloth',{local:true,volume:.055,key:'pickup',cooldown:.08}));
  bind('escape-prop-release',event=>play(event.thrown?'swing':'cloth',{local:true,volume:event.thrown?.08:.045,rate:event.thrown?1.25:1,key:'release'}));
  bind('escape-player-action',event=>{
    if(event.action==='swing')play('crowbarSwing',{local:true,volume:.19,alignPeak:CROWBAR_MELEE.impact-(event.elapsed??CROWBAR_MELEE.windup),priority:2});
    if(event.action==='jump')play('cloth',{local:true,volume:.04,rate:1.15,key:'jump-cloth',cooldown:.2,priority:0});
  });
  bind('escape-player-consume',event=>{
    if(event.stage==='start')play(event.item.kind==='bottle'||event.item.kind==='jar'?'metalClick':'cloth',{local:true,volume:.04,key:'consume-open',cooldown:.1});
    if(event.stage!=='bite')return;
    const settings={apple:['eatCrunch_01',1.12,.12],banana:['eatChew_01',1,.1],tomato:['eatChew_01',1.1,.1],bread:['eatCrunch_02',.94,.11],cheese:['eatChew_01',.85,.09],jar:['drinkGulp_02',1.15,.09],milk:['drinkGulp_01',1.08,.12],bottle:['drinkGulp_02',.93,.12]}[event.item.kind];
    if(settings)play(settings[0],{local:true,rate:settings[1],volume:settings[2],priority:1,key:`consume:${event.item.id}:${event.bite}`,cooldown:.1});
  });
  bind('escape-player-struggle',()=>play('cloth',{local:true,volume:.065,rate:1.1,key:'struggle',cooldown:.12}));
  bind('escape-player-land',event=>{
    if(event.speed<2.2)return;
    play(event.height>3?'bodyHeavy':`${footstepSurface(player)}Step`,{local:true,volume:event.height>3?.26:.075,rate:.85,key:'land',cooldown:.15,priority:2});
    if(event.height>3)play('cloth',{local:true,volume:.12,rate:.8,key:'land-cloth'});
  });
  bind('escape-pursuer-hit',event=>{
    // Melee metal contact comes from the actual strike even if damage is on
    // cooldown. A thrown crowbar reaches this separate projectile path instead.
    if(event.item?.kind==='crowbar'&&event.source==='projectile')play('crowbarBonk',{position:positionOf(event.actor),volume:.25,rate:.9,key:'crowbar-contact',cooldown:.1,priority:2});
    if(event.damage<=0)impact(event.item,{position:positionOf(event.actor),volume:.13,heavy:true});
    else play(event.health===0?'bodyHeavy':'body',{position:positionOf(event.actor),volume:event.health===0?.33:.24,rate:.82,key:'naiwa-hit',priority:2});
  });
  bind('escape-door-impact',event=>{
    play('woodHeavy',{position:event.position,volume:.3,rate:.87,key:`door-impact:${event.door.id}`,priority:2});
    if(event.victim===player)play('bodyHeavy',{local:true,volume:.23,rate:.96,key:'door-body-impact',priority:2});
  });
  bind('escape-pursuer-block',event=>{
    if(event.source==='projectile'&&event.item?.kind==='crowbar')play('crowbarBonk',{position:positionOf(event.actor),volume:.25,rate:.9,key:'crowbar-contact',cooldown:.1,priority:2});
    else play('cloth',{position:positionOf(event.actor),volume:.075,key:'block-cloth',cooldown:.15});
  });
  bind('escape-pursuer-light',event=>{if(event.active)play('cloth',{position:positionOf(event.actor),volume:.055,key:'shield-cloth',cooldown:.4});});
  bind('escape-pursuer-kick',event=>{
    play('woodHeavy',{position:positionOf(event.actor),volume:.22,rate:.92,key:'chair-kick',cooldown:.2});
    play('cloth',{position:positionOf(event.actor),volume:.07,rate:.86,key:'kick-cloth',cooldown:.2});
  });
  bind('escape-pursuer-skill',event=>{
    const position=positionOf(event.actor);
    if(event.stage==='start') {
      play('cloth',{position,volume:.075,rate:.85,key:'skill-cloth'});
      if(event.kind==='slam')play('crowbarSwing',{position,volume:.16,rate:.88,alignPeak:.64,key:'slam-air',priority:2});
    }
    if(event.stage==='hit'||event.stage==='miss') {
      if(event.kind==='slam') {
        const contact=event.stage==='hit'?positionOf(player):{...position,y:event.actor.y};
        play(event.stage==='hit'?'bodyHeavy':'woodHeavy',{position:contact,volume:.36,rate:.96,key:'slam-impact',priority:2});
        if(event.stage==='hit')play('soft',{position:contact,volume:.14,rate:.82,key:'slam-weight',priority:2});
      }else if(event.stage==='hit')play('cloth',{position,volume:.17,rate:.75,key:'pull-cloth'});
    }
  });
  bind('escape-pursuer-investigation',event=>{
    if(event.stage==='inspect'&&event.kind==='bed')play('cloth',{position:positionOf(event.actor),volume:.09,rate:.8,key:'bed-lower'});
    if(event.stage==='reach')play('cloth',{position:positionOf(event.actor),volume:.1,rate:.95,key:'bed-reach'});
  });
  bind('escape-pursuer-state',event=>{
    if(!active)return;
    if(event.state==='down')play('bodyHeavy',{position:positionOf(event.actor),volume:.23,rate:.65,delay:.23,key:'naiwa-fall',priority:2});
    if(event.state==='grab'){captureCallPlayed=false;captureCall();play('cloth',{position:positionOf(event.actor),volume:.11,rate:.8,key:'grab-cloth'});}
    else if(event.state==='caught')captureCall();
    else captureCallPlayed=false;
  });
  function stepActor(actor,dt,npc=null) {
    if(!actor)return;
    const previous=motion.get(actor);motion.set(actor,{x:actor.x,y:actor.y,z:actor.z,distance:previous?.distance??0});
    const current=motion.get(actor);
    if(!previous)return;
    const distance=Math.hypot(actor.x-previous.x,actor.z-previous.z);
    if(!actor.grounded||actor.hidden||actor.hidingBed||actor.heldBy||(!npc&&actor.crouched)||npc&&!['patrol','chase','search'].includes(npc.state)
      ||distance<.00001||distance>.65||Math.abs(actor.y-previous.y)>.3){current.distance=0;return;}
    const clip=distance/Math.max(dt,.001)>2.5?gait.Run:gait.Walk;
    const stride=npc?clip.modelSpeed*1.7*clip.duration/2:1.45;
    current.distance+=distance;
    if(current.distance>=stride) {
      current.distance%=stride;
      play(`${footstepSurface(actor)}Step`,{position:positionOf(actor),local:!npc,volume:npc?.055:.04,rate:npc?.82:1,key:npc?'naiwa-step':'player-step',cooldown:.15,range:13,priority:0});
    }
  }
  function panelTick(panel,dt) {
    const previous=panels.get(panel);if(!previous){panels.set(panel,{amount:panel.amount,moving:false,direction:0,quiet:0,lastCreak:-10});return;}
    const delta=panel.amount-previous.amount;previous.amount=panel.amount;
    const kind=panel.fixtureKind??'door',position=panel.anchor?panel.anchor.getWorldPosition(panelPosition):{x:panel.x,y:panel.y+1,z:panel.z};
    if(Math.abs(delta)>.00001) {
      const direction=Math.sign(delta),start=!previous.moving||direction!==previous.direction;
      const options={position,ignore:panel.colliders??panel.parts?.map(part=>part.collider)??[],key:`panel:${panel.id}`,cooldown:.28,range:21};
      if(start||clock-previous.lastCreak>.8&&Math.abs(delta)>.001) {
        const opening=direction>0;
        const pool=kind==='door'&&opening?'doorOpen':kind==='drawer'?'creak3':kind==='chest'?'creak2':kind==='fridge'?'metalLatch':'creak1';
        play(pool,{...options,volume:kind==='door'?.17:kind==='drawer'?.1:.13,rate:kind==='drawer'?1.25:kind==='chest'?.8:1,duration:kind==='door'&&opening?null:.42});
        previous.lastCreak=clock;
      }
      previous.moving=true;previous.direction=direction;previous.quiet=0;
      if(panel.amount===0||panel.amount===1) {
        if(panel.amount===0)play(kind==='door'?'doorClose':kind==='chest'?'woodHeavy':kind==='fridge'?'soft':'woodLight',{...options,key:`panel-end:${panel.id}`,volume:kind==='door'?.19:.11,rate:kind==='chest'?.83:1});
        else if(kind!=='door')play(kind==='chest'?'metalLatch':'woodLight',{...options,key:`panel-end:${panel.id}`,volume:.065,rate:1.15});
        previous.moving=false;
      }
    }else {previous.quiet+=dt;if(previous.quiet>.18)previous.moving=false;}
  }
  return {unlock:()=>mixer.unlock(),
    setActive(value,options={}){active=!!value;mixer.setActive(active,options);if(!active){resetMotion();if(!options.preserveCapture)captureCallPlayed=false;}},
    tick(dt){if(!active||disposed)return;clock+=dt;stepActor(player,dt);const npc=getPursuer();if(npc)stepActor(npc.actor,dt,npc);for(const panel of [...doors,...interactables])panelTick(panel,dt);},
    reset(options={}){mixer.stopAll(options);resetMotion();if(!options.preserveCapture)captureCallPlayed=false;},
    switchFlashlight(){play('metalClick',{local:true,volume:.075,key:'torch'});},
    lock(panel,unlocked=false){play(unlocked?'metalLatch':'metalClick',{local:true,volume:unlocked?.14:.09,key:'lock',cooldown:.2});},
    outcome({captured=false}={}){if(captured)captureCall(true);play('bodyHeavy',{local:true,volume:.2,rate:.65,key:'faint',cooldown:.4,allowInactive:true,priority:2});},
    get settings(){return {...settings};},
    setSettings(next){settings={enabled:next.enabled??settings.enabled,volume:clamp(Number.isFinite(next.volume)?next.volume:settings.volume,0,1)};mixer.setSettings(settings);try{globalThis.window?.localStorage?.setItem(escapeAudioSettingsKey,JSON.stringify(settings));}catch{}},
    dispose(){disposed=true;for(const [type,handler] of bindings)scene.removeEventListener(type,handler);panels.clear();cooldowns.clear();mixer.dispose();},
  };
}
