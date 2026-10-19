import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createConsumption,canConsume,FOOD_HEALTH,CONSUMPTION,tickPlayerEffects,eatingPose,poseEating} from '../src/frog-escape-consumption.js';
import {createInventory} from '../src/frog-escape-inventory.js';
import {propItem} from '../src/frog-escape-props.js';
import {damagePlayer,healPlayer,projectileDamage,playerDamageScale,playerMovementScale,difficultyRules} from '../src/frog-escape-vitals.js';
import {createPlayer,createNavigation,jumpPlayer,WALK_SPEED,SPRINT_SPEED,CROUCH_SPEED} from '../src/frog-escape-navigation.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createWorldItems,createItemModel} from '../src/frog-escape-items.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {setEscapeLanguage,itemLabel} from '../src/frog-escape-i18n.js';
import {createEscapeAudio,foleyClips} from '../src/frog-escape-audio.js';
import {updateFixtureAction} from '../src/frog-escape-interactions.js';

const boundary=[[-40,-40],[40,-40],[40,40],[-40,40]];
const run=(seconds,tick,fps=60)=>{for(let rest=seconds;rest>1e-9;){const dt=Math.min(1/fps,rest);tick(dt);rest-=dt;}};
for(const fps of [30,60,144])for(const kind of [...Object.keys(FOOD_HEALTH),'milk','bottle']) {
  const player={...createPlayer(),health:90},inventory=createInventory(),events=[];inventory.store(propItem(kind,'food-'+kind));
  const full=inventory.slots[0],fullMass=full.mass,controller=createConsumption({player,inventory,onEvent:e=>events.push(e)});
  assert(controller.start());assert(!controller.start(),'cannot start a second use');run(1.49,dt=>controller.tick(dt),fps);
  assert.equal(player.health,90);assert.equal(inventory.slots[0],full);assert.equal(full.empty,undefined,'nothing commits before 1.5 seconds');
  run(.01,dt=>controller.tick(dt),fps);assert(!controller.active);assert.equal(events.filter(e=>e.stage==='bite').length,3);assert.equal(events.filter(e=>e.stage==='finish').length,1);
  assert.equal(player.health,90+(FOOD_HEALTH[kind]??0));
  if(['milk','jar','bottle'].includes(kind)) {
    assert.equal(inventory.slots[0],full,'container keeps its original identity and slot');assert(full.empty&&full.mass<fullMass);assert(!canConsume(full));
    assert(itemLabel(full).includes('空'));for(const speed of[3,7,11.5,20])for(const scale of[1,1.5])assert.equal(projectileDamage(full,speed,scale),projectileDamage(propItem(kind,'filled'),speed,scale)-1,'empty package loses exactly one damage at equal speed, including with wine');
  }else if(kind==='banana'){assert.equal(inventory.slots[0].kind,'bananaPeel');assert(!canConsume(inventory.slots[0]));}else assert.equal(inventory.slots[0],null);
  if(kind==='milk'){assert.equal(player.effects.milk,15);for(const source of['slam','fall','chair','grab','other']){player.health=100;assert.equal(damagePlayer(player,10,source),5);}}
  if(kind==='bottle'){assert.equal(player.effects.wine,20);assert.equal(playerDamageScale(player),1.5);assert.equal(playerMovementScale(player),.8);}
  tickPlayerEffects(player,30);assert.equal(playerDamageScale(player),1);assert.equal(playerMovementScale(player),1);
}
for(const kind of['egg','fork','knife','plate','crowbar'])assert(!canConsume(propItem(kind,kind)),'nonfood and eggs cannot be consumed');
assert.equal(healPlayer({...createPlayer(),health:99},5),1);assert.equal(healPlayer({...createPlayer(),health:0},5),0,'food cannot revive a dead player');
{
  const inventory=createInventory(),player={...createPlayer(),health:90};inventory.store(propItem('bread','cancelled'));inventory.store(propItem('apple','other'));
  const use=createConsumption({player,inventory});use.start();use.tick(1);use.cancel();use.tick(2);assert.equal(player.health,90);assert(inventory.slots[0]);
  use.start();inventory.select(1);use.tick(2);assert(!use.active);assert(inventory.slots[0]&&inventory.slots[1],'a changed slot cancels without eating the wrong item');
}
// Real held models move to the mouth, drink tilts farther, and
// repeated paused poses do not accumulate a transform.
for(const kind of['apple','bread','jar','milk','bottle']) {
  const item=propItem(kind,kind),held=createItemModel(item);poseEating(held,item,.7);
  assert(held.position.distanceTo(new THREE.Vector3(.28,-.25,-.5))>.12);const position=held.position.clone(),rotation=held.quaternion.clone();
  for(let i=0;i<30;i++)poseEating(held,item,.7);assert(held.position.distanceTo(position)<1e-9&&held.quaternion.angleTo(rotation)<1e-7);
  poseEating(held,item,1.5);assert(held.position.distanceTo(new THREE.Vector3(.28,-.25,-.5))<1e-9,'food still lowers to its original resting pose');
}
assert(Math.abs(eatingPose(propItem('milk','milk'),.7).rotation[0])>Math.abs(eatingPose(propItem('apple','apple'),.7).rotation[0])+.8);

function npcSetup({difficulty='normal',random=()=>.999,physical=false}={}) {
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),spawn={x:0,y:.15,z:0},player={...createPlayer(),x:0,y:.15,z:-4,hidden:true};let caught=0;
  const items=physical?createWorldItems(scene,navigation):{physics:{addActor:()=>({remove(){}}),syncActors(){}}};
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:items,player,spawn,patrolRoute:[spawn],difficulty,random,onCatch:()=>caught++});
  const tick=dt=>{npc.tick(dt);if(physical)items.tick(dt,player);};return {npc,player,items,scene,navigation,tick,get caught(){return caught;}};
}
for(const difficulty of['easy','normal','hard','hacker']) {
  const test=npcSetup({difficulty});assert.equal(test.npc.alertness,difficultyRules(difficulty).initialAlertness);test.npc.reset();assert.equal(test.npc.alertness,difficultyRules(difficulty).initialAlertness);
  test.npc.hit({item:propItem('bread','soft'),source:'projectile'});assert.equal(test.npc.health,difficultyRules(difficulty).naiwaHealth-1);assert.equal(test.npc.state,'stunned','unblocked soft food damages and staggers all three phases');test.npc.dispose();
}
for(const fps of[30,60,144])for(const difficulty of['normal','hard','hacker']) {
  const test=npcSetup({difficulty});run(5.2,test.tick,fps);Object.assign(test.player,{x:0,y:.15,z:-.75,hidden:false});test.tick(1/fps);
  assert.equal(test.player.heldBy,test.npc.actor);assert(!jumpPlayer(test.player));
  run(difficulty==='normal'?1.35:.5,test.tick,fps);assert.equal(test.caught,0,'the hold has a real timed window');
  if(difficulty==='normal')assert(test.npc.struggleTime>0);else assert.equal(test.npc.struggleTime,0);
  run(.2,test.tick,fps);assert.equal(test.caught,1);run(1,test.tick,fps);assert.equal(test.caught,1);test.npc.dispose();
}
{
  const test=npcSetup({random:()=>0});run(5.2,test.tick);Object.assign(test.player,{x:0,y:.15,z:-.75,hidden:false});test.tick(.02);
  assert(test.npc.struggleJump());assert.equal(test.player.heldBy,null);assert.equal(test.npc.state,'stunned');assert.equal(test.caught,0);test.npc.dispose();
  const fail=npcSetup();run(5.2,fail.tick);Object.assign(fail.player,{x:0,y:.15,z:-.75,hidden:false});fail.tick(.02);
  for(let i=0;i<100;i++)assert(!fail.npc.struggleJump());run(1.6,fail.tick);assert.equal(fail.caught,1,'failed jump taps do not restart the capture timer');fail.npc.dispose();
}
{
  const test=npcSetup({physical:true});run(5.2,test.tick);Object.assign(test.player,{x:0,y:.15,z:-.75,yaw:Math.PI,hidden:false});test.tick(.02);
  assert.equal(test.player.heldBy,test.npc.actor);
  const thrown=test.items.throw(propItem('bread','held-counterattack'),test.player,new THREE.Vector3(0,1.73,-.75),new THREE.Vector3(0,0,1));assert(thrown,'a held player can actually throw an object into the grabbing actor');
  run(.2,test.tick);assert.equal(test.player.heldBy,null,'a physical harmless projectile interrupts Fool’s hold');assert.equal(test.npc.health,19);assert.equal(test.caught,0);test.npc.dispose();
}
for(const wine of[false,true]) {
  const test=npcSetup({physical:true});test.player.effects={wine:wine?20:0};const bar=propItem('crowbar','damage-bonus');
  for(let i=0;i<3;i++){test.items.strike(new THREE.Vector3(0,1.73,-1.8),new THREE.Vector3(0,0,1),bar,{damageScale:playerDamageScale(test.player)});run(.4,test.tick);}
  assert.equal(test.npc.health,wine?0:5,'wine turns three real crowbar strikes into a knockdown');test.npc.dispose();
}
{
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),items=createWorldItems(scene,navigation),player={...createPlayer(),x:15,y:-.83,z:-10,effects:{wine:20}};
  const item=propItem('fork','snapshot'),entry=items.throw(item,player,new THREE.Vector3(15,.6,-10),new THREE.Vector3(0,0,-1));assert.equal(entry.damageScale,1.5);assert.equal(entry.item.damageScale,undefined,'the bonus is attached to this throw, never permanently to a reusable item');
}

class Control extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.children=new Map();this.open=false;this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(key,value){this[key]=value;}closest(){return null;}focus(){}showModal(){this.open=true;}close(){this.open=false;}setPointerCapture(){}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}
  getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
}
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null,setItem(){}}});
function dispatch(target,type,props={}){const event=new Event(type,{cancelable:true});for(const [name,value]of Object.entries(props))Object.defineProperty(event,name,{value});target.dispatchEvent(event);return event;}
function explorerSetup(mode='normal',{touch=false}={}) {
  const controls=new Map(),slots=Array.from({length:7},()=>new Control());globalThis.document=new Control();document.querySelector=key=>{if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};document.querySelectorAll=()=>slots;document.hidden=false;
  globalThis.window=new Control();window.matchMedia=query=>({matches:touch&&query==='(pointer:coarse)'});window.location={reload(){}};
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),canvas=new Control();canvas.requestPointerLock=()=>Promise.resolve();const playerPin=new THREE.Object3D();scene.add(playerPin);
  const explorer=createEscapeExplorer({scene,canvas,navigation,stage:new Control(),status:new Control(),groups:{labels:new THREE.Group()},roof:new THREE.Group(),playerPin,doors:[],onMap(){}});explorer.setDifficulty(mode);
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:explorer.worldItems,player:explorer.player,spawn:{x:0,y:.15,z:0},patrolRoute:[{x:0,y:.15,z:0}],onCatch:()=>explorer.capture()});explorer.setPursuer(npc);
  Object.assign(explorer.player,{x:20,y:-.83,z:-12,yaw:0});explorer.enter();
  const key=(code,type='keydown',props={})=>dispatch(document,type,{code,...props});
  function equip(kind){const index=explorer.inventory.store(propItem(kind,'player-'+kind));explorer.inventory.select(index);return explorer.inventory.slots[index];}
  return {explorer,npc,controls,slots,equip,key};
}
assert.equal(SPRINT_SPEED,WALK_SPEED*1.7,'sprinting is now 1.7 times the unchanged walking speed');
assert.equal(SPRINT_SPEED/WALK_SPEED,1.7);assert.equal(CROUCH_SPEED,3.4*1.3*.55,'crouched speed stays unchanged');
for(const fps of[30,60,144])for(const gait of['walk','sprint','crouch'])for(const wine of[false,true]) {
  const {explorer,npc,equip,key}=explorerSetup(),dt=1/fps;
  if(wine)explorer.player.effects={wine:20};
  if(gait==='sprint')key('KeyR');if(gait==='crouch'){key('ShiftLeft');key('KeyR');}
  key('KeyW');run(1,step=>explorer.tick(step),fps);
  const speed=({walk:WALK_SPEED,sprint:SPRINT_SPEED,crouch:CROUCH_SPEED}[gait])*(wine?.8:1);
  let z=explorer.player.z;explorer.tick(dt);assert(Math.abs((z-explorer.player.z)/dt-speed)<.0001,'each actual movement mode reaches its intended speed');
  equip('apple');const cameraChildren=[...explorer.camera.children];key('KeyG');assert(explorer.consumption.active);
  assert.deepEqual(explorer.camera.children,cameraChildren,'eating creates no extra hands or arms');assert(!explorer.camera.getObjectByName('player:eating-hands'));
  z=explorer.player.z;explorer.tick(dt);assert(Math.abs((z-explorer.player.z)/dt-speed*.3)<1e-8,'the very first eating frame slows even an existing full sprint to 30%');
  z=explorer.player.z;run(1,step=>explorer.tick(step),fps);assert(Math.abs(z-explorer.player.z-speed*.3)<1e-7,'food slowdown remains 30% throughout the action with crouch and wine modifiers');
  run(.5,step=>explorer.tick(step),fps);assert(!explorer.consumption.active);run(1,step=>explorer.tick(step),fps);
  z=explorer.player.z;explorer.tick(dt);assert(Math.abs((z-explorer.player.z)/dt-speed)<.0001,'finishing restores the selected gait without a stuck eating slowdown');npc.dispose();
}
{
  const {explorer,npc,equip,key,controls}=explorerSetup();
  assert(key('KeyR').defaultPrevented);key('KeyW');run(1,dt=>explorer.tick(dt));key('KeyR','keyup');run(.6,dt=>explorer.tick(dt));
  let z=explorer.player.z;explorer.tick(.02);assert(Math.abs((z-explorer.player.z)/.02-WALK_SPEED)<.00001,'releasing R restores walking');
  equip('bread');key('KeyG');explorer.tick(.2);damagePlayer(explorer.player,1,'other');assert(!explorer.consumption.active);run(.8,dt=>explorer.tick(dt));
  z=explorer.player.z;explorer.tick(.02);assert(Math.abs((z-explorer.player.z)/.02-WALK_SPEED)<.001,'damage cancels eating slowdown with no lost item');assert(explorer.inventory.slots[1]);
  key('KeyR');window.dispatchEvent(new Event('blur'));assert(explorer.paused);controls.get('#escape-resume').dispatchEvent(new Event('click'));key('KeyW');run(1,dt=>explorer.tick(dt));
  z=explorer.player.z;explorer.tick(.02);assert(Math.abs((z-explorer.player.z)/.02-WALK_SPEED)<.0001,'losing focus clears sprint as well as movement');
  const formTarget={closest:()=>({})};assert(!key('KeyR','keydown',{target:formTarget}).defaultPrevented);assert(!key('KeyR','keydown',{ctrlKey:true}).defaultPrevented);run(.3,dt=>explorer.tick(dt));
  z=explorer.player.z;explorer.tick(.02);assert(Math.abs((z-explorer.player.z)/.02-WALK_SPEED)<.0001,'form and browser-shortcut input cannot start sprinting');npc.dispose();
}
for(const end of['pointerup','pointercancel','lostpointercapture','map','pause']) {
  const {explorer,npc,controls,equip,key}=explorerSetup('normal',{touch:true}),sprint=controls.get('#escape-touch-sprint'),stick=controls.get('#escape-joystick');
  assert(dispatch(sprint,'pointerdown',{pointerId:7}).defaultPrevented);dispatch(stick,'pointerdown',{pointerId:8,clientX:50,clientY:16});run(1,dt=>explorer.tick(dt));
  let z=explorer.player.z;explorer.tick(.02);assert(Math.abs((z-explorer.player.z)/.02-SPRINT_SPEED)<.0001,'touch sprint and the movement stick work together');assert.equal(sprint['aria-pressed'],'true');
  equip('milk');key('KeyG');z=explorer.player.z;explorer.tick(.02);assert(Math.abs((z-explorer.player.z)/.02-SPRINT_SPEED*.3)<1e-8,'drinking also slows touch sprinting immediately');explorer.consumption.cancel();
  if(end==='map'){explorer.showMap();explorer.enter();dispatch(stick,'pointerdown',{pointerId:9,clientX:50,clientY:16});}
  else if(end==='pause'){explorer.pause();controls.get('#escape-resume').dispatchEvent(new Event('click'));dispatch(stick,'pointerdown',{pointerId:9,clientX:50,clientY:16});}
  else dispatch(sprint,end,{pointerId:7});
  run(1,dt=>explorer.tick(dt));z=explorer.player.z;explorer.tick(.02);assert(Math.abs((z-explorer.player.z)/.02-WALK_SPEED)<.0001,`${end} clears touch sprinting`);assert.equal(sprint['aria-pressed'],'false');npc.dispose();
}
for(const [mode,cost]of[['easy',10],['normal',15],['hard',25],['hacker',50]]) {
  const {explorer,npc,equip,key,controls,slots}=explorerSetup(mode),milk=equip('milk');key('KeyG');assert(explorer.consumption.active);run(1.49,dt=>explorer.tick(dt));assert.equal(explorer.player.effects?.milk??0,0);
  const beforePause=explorer.consumption.action.elapsed;explorer.pause();run(3,dt=>explorer.tick(dt));assert.equal(explorer.consumption.action.elapsed,beforePause,'pausing freezes the eating action');
  controls.get('#escape-resume').dispatchEvent(new Event('click'));run(.01,dt=>explorer.tick(dt));assert.equal(explorer.player.effects.milk,15);assert(milk.empty);assert.equal(explorer.inventory.slots[explorer.inventory.selected],milk);
  assert.equal(slots[explorer.inventory.selected].querySelector('[data-item-name]').textContent,'牛奶（空）');
  setEscapeLanguage('en');explorer.refreshLanguage();assert(controls.get('#escape-player-effects').textContent.includes('Milk resistance'));assert(itemLabel(milk).includes('Empty'));setEscapeLanguage('zh');explorer.refreshLanguage();
  explorer.capture();assert.equal(explorer.player.health,100-cost);assert(!explorer.gameOver,'milk lets even Hacker survive one grab at full health');assert(controls.get('#escape-caught-description').textContent.includes(`失去 ${cost}`),'faint text reports mitigated damage');
  const remaining=explorer.player.effects.milk;run(20,dt=>explorer.tick(dt));assert.equal(explorer.player.effects.milk,remaining,'faint dialogs pause timed effects');explorer.restartPosition();assert.equal(npc.alertness,Math.max(0,difficultyRules(mode).initialAlertness-10));
  key('KeyG');assert(!explorer.consumption.active,'empty packages cannot grant a second effect');npc.dispose();
}
for(const fps of[30,60,144]) {
  const distances=[];
  for(const wine of[false,true]) {
    const {explorer,npc,equip,key}=explorerSetup();if(wine){equip('bottle');key('KeyG');run(1.5,dt=>explorer.tick(dt),fps);assert.equal(explorer.player.effects.wine,20);}
    const z=explorer.player.z;key('KeyW');run(1,dt=>explorer.tick(dt),fps);key('KeyW','keyup');distances.push(z-explorer.player.z);npc.dispose();
  }
  assert(Math.abs(distances[1]/distances[0]-.8)<1e-7,'wine really reduces integrated player movement to 80% at every tested frame rate');
}
{
  const {explorer,npc,equip,key}=explorerSetup();explorer.player.health=95;equip('bread');key('KeyG');run(.5,dt=>explorer.tick(dt));key('KeyQ');key('Digit1');assert(explorer.consumption.active&&explorer.inventory.slots[1],'drop and selection cannot duplicate the item being eaten');
  run(1,dt=>explorer.tick(dt));assert.equal(explorer.player.health,100);assert.equal(explorer.inventory.slots[1],null);equip('egg');key('KeyG');assert(!explorer.consumption.active);npc.dispose();
}
// Empty containers survive a physical drop/pickup with the same properties.
{
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),items=createWorldItems(scene,navigation),player={...createPlayer(),x:15,y:-.83,z:-10},inventory=createInventory();
  const empty={...propItem('jar','empty-recovery'),empty:true,filledMass:.3,mass:.12};const entry=items.drop(empty,player);assert(entry);run(.6,dt=>items.tick(dt,player));assert(items.pickup(entry,inventory));assert(inventory.slots[0].empty&&inventory.slots[0].filledMass===.3&&inventory.slots[0].mass===.12);
}
{
  delete globalThis.document;const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),light=scene.getObjectByName('fridge:interior-light'),diffuser=scene.getObjectByName('fridge:diffuser'),lamp=scene.getObjectByName('fridge:ceiling-lamp');
  assert(light&&diffuser&&lamp);assert(light.getWorldPosition(new THREE.Vector3()).distanceTo(diffuser.getWorldPosition(new THREE.Vector3()))<.08,'emitter sits directly beneath its actual ceiling fixture');
  const fridge=castle.interactables.find(a=>a.fixtureKind==='fridge');fridge.open=true;updateFixtureAction(fridge,2,null,castle.navigation);assert(light.visible&&diffuser.visible);fridge.open=false;updateFixtureAction(fridge,2,null,castle.navigation);assert(!light.visible&&!diffuser.visible);
}
{
  const scene=new THREE.Scene(),calls=[],mixer={setSettings(){},setActive(){},play(name,options){assert(foleyClips[name]);calls.push({name,...options});},stopAll(){},unlock:async()=>true,dispose(){}};
  const audio=createEscapeAudio({scene,player:createPlayer(),listener:()=>({x:0,y:0,z:0,yaw:0}),navigation:{lineClear:()=>true},mixer});audio.setActive(true);
  for(const kind of [...Object.keys(FOOD_HEALTH),'milk','bottle'])scene.dispatchEvent({type:'escape-player-consume',stage:'bite',bite:0,item:propItem(kind,'sound-'+kind)});
  assert.equal(calls.length,Object.keys(FOOD_HEALTH).length+2);assert(new Set(calls.map(call=>call.name)).size>=5,'foods and beverages use distinct nonverbal bite/swallow clips');audio.dispose();
}
console.log('Consumption OK: 1.7x R/touch sprint with unchanged normal walking, immediate 30% eating movement at 30/60/144 FPS with wine/crouch, hand-free food poses, release/blur/map/pause/touch cancellation, 1.5-second atomic food use, exact heals/health cap, eggs blocked, 15-second universal half damage including Hacker capture, 20-second wine +50% real crowbar damage and 80% actual movement, persistent lighter empty packages with exact -1 damage, Fool-only timed struggle/escape/physical counterthrows, difficulty opening alertness, bilingual effects HUD, safe pause/input, nonverbal foley and aligned fridge light.');
