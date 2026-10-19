import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNavigation,createPlayer,advancePlayer,jumpPlayer,WALK_SPEED} from '../src/frog-escape-navigation.js';
import {damagePlayer,fallDamage,alertnessPhase,itemAlertness,changeAlertness} from '../src/frog-escape-vitals.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {propItem} from '../src/frog-escape-props.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';

const boundary=[[-40,-40],[40,-40],[40,40],[-40,40]];
const player=createPlayer(),healthEvents=[];player.onHealthChange=event=>healthEvents.push(event);
assert.equal(player.health,100);assert.equal(damagePlayer(player,6,'slam'),6);assert.equal(player.health,94);
assert.equal(damagePlayer(player,-30,'grab'),0);assert.equal(player.health,94,'damage cannot heal');
damagePlayer(player,500,'fall');assert.equal(player.health,0);damagePlayer(player,6,'slam');assert.equal(healthEvents.length,2,'zero health is clamped and cannot trigger repeated deaths');
assert.equal(fallDamage(3),0);assert(fallDamage(3.1)>0);assert.equal(fallDamage(5.98),8);assert(fallDamage(10)>fallDamage(6));
for(const [value,phase] of [[0,'dormant'],[10,'dormant'],[29,'dormant'],[30,'intelligent'],[69,'intelligent'],[70,'tangwang'],[99,'tangwang'],[100,'transparent']])assert.equal(alertnessPhase(value).id,phase);
assert.equal(changeAlertness(99,5),100);assert.equal(changeAlertness(1,-5),0);

for(const fps of [25,60,144])for(const height of [1.3,3,3.1,4,5.98,6.36,10]) {
  const navigation=createNavigation({solids:[],stairs:[],boundary}),falling={...createPlayer(),x:15,z:-10,y:-.83+height,grounded:false,fallStartY:-.83+height};
  for(let i=0;i<fps*4;i++)advancePlayer(falling,0,0,1/fps,navigation);
  assert(falling.grounded&&Math.abs(falling.y+.83)<1e-6);
  assert.equal(falling.health,100-fallDamage(height),'support-to-support fall damage is applied once and is stable across frame rates');
  const safe={...createPlayer(),x:15,y:-.83,z:-10};jumpPlayer(safe);
  for(let i=0;i<fps*2;i++)advancePlayer(safe,0,0,1/fps,navigation);
  assert.equal(safe.health,100,'ordinary jumps do not cause fall damage');
}

function setup({random=()=>.9,realPhysics=false}={}) {
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),spawn={x:0,y:.15,z:0};
  const player={...createPlayer(),x:0,y:.15,z:-5,hidden:true};let impact;
  const items=realPhysics?createWorldItems(scene,navigation):{physics:{addActor:(actor,callback)=>{impact=callback;return {remove(){}};},syncActors(){}}};
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:items,player,spawn,patrolRoute:[spawn],random});
  const step=seconds=>{for(let remaining=seconds;remaining>1e-9;){const dt=Math.min(.02,remaining);npc.tick(dt);if(realPhysics)items.tick(dt);remaining-=dt;}};
  return {scene,navigation,player,npc,items,step,impact:(item,speed=10)=>impact({entry:{item,thrown:true,thrownFrom:{x:0,y:1.5,z:-2}},speed,position:{x:0,y:1,z:0}})};
}
const tiers={bread:1,egg:1,tomato:1,apple:1,cheese:1,milk:2,fork:2,plate:3,bowl:3,cup:3,jar:3,glass:4,knife:4,bottle:5,crowbar:5};
const contacts=setup();
for(const [kind,increase] of Object.entries(tiers)) {
  contacts.npc.reset();const item=propItem(kind,`tier-${kind}`);
  assert.equal(itemAlertness(item),increase);contacts.impact(item);
  assert.equal(contacts.npc.alertness,10+increase,`${kind} has its specified alertness tier`);
  assert.equal(contacts.npc.health,20-increase,'item damage matches its alertness tier');
  contacts.impact(item);assert.equal(contacts.npc.alertness,10+increase,'one bouncing contact cannot be counted repeatedly');
}
contacts.npc.reset();contacts.npc.hit({damage:35,item:propItem('crowbar','melee'),source:'melee'});assert.equal(contacts.npc.alertness,15);
contacts.npc.reset({keepAlertness:true});assert.equal(contacts.npc.alertness,15,'a position reset can retain alertness');contacts.npc.reset();assert.equal(contacts.npc.alertness,10);contacts.npc.dispose();

for(const [kind,increase,damage] of [['bread',1,1],['egg',2,1],['fork',2,2],['bottle',6,5]]) {
  const physical=setup({realPhysics:true});
  physical.items.throw(propItem(kind,`physical-${kind}`),physical.player,new THREE.Vector3(0,1.5,-1.8),new THREE.Vector3(0,0,1));physical.step(.6);
  assert.equal(physical.npc.alertness,10+increase,'real actor collisions and nearby breakage combine exactly once');
  assert.equal(physical.npc.health,20-damage);physical.npc.dispose();
}

const sounds=setup();sounds.npc.hit({damage:1,source:'melee'});
const breakAt=(position,breakable)=>sounds.scene.dispatchEvent({type:breakable?'escape-scenery-break':'escape-prop-break',position,breakable});
breakAt({x:1,y:1,z:0});assert.equal(sounds.npc.alertness,16,'nearby breakage counts even during hit stun');
breakAt({x:1,y:1,z:0},{kind:'window'});assert.equal(sounds.npc.alertness,20,'a nearby window adds three for hearing plus one for nearby breakage');
breakAt({x:0,y:1.5,z:-15},{kind:'window'});assert.equal(sounds.npc.alertness,23,'a distant but audible window adds three without the nearby bonus');
breakAt({x:0,y:1.5,z:-30},{kind:'window'});assert.equal(sounds.npc.alertness,23,'a window beyond hearing range adds nothing');
sounds.navigation.solids.push({x:0,z:-4,halfX:3,halfZ:.2,minY:.15,maxY:4,axisX:[1,0],axisZ:[0,1]});
breakAt({x:0,y:1.5,z:-12},{kind:'window'});assert.equal(sounds.npc.alertness,23,'occlusion limits hearing distance');sounds.npc.dispose();

for(const [random,loss] of [[()=>.9,0],[()=>0,5],[(()=>{let i=0;return ()=>i++===0?.1:.999;})(),10]]) {
  const down=setup({random});down.npc.hit({damage:100,source:'melee'});assert.equal(down.npc.state,'down');down.step(8.4);assert.equal(down.npc.alertness,15);
  down.step(.2);assert.equal(down.npc.health,20);assert.equal(down.npc.alertness,15-loss,'only getting up from a knockdown can probabilistically forget five to ten points');down.npc.dispose();
}
const rage=setup();
for(let i=0;i<24;i++){rage.npc.hit({damage:.1,source:'melee'});rage.step(.32);}
assert.equal(rage.npc.alertness,100);assert.equal(rage.npc.phase.id,'transparent');rage.npc.reset({keepAlertness:true});Object.assign(rage.player,{hidden:false,z:-4.9});rage.step(5.01);
const before=rage.npc.actor.z;rage.npc.tick(.04);assert(before-rage.npc.actor.z>6*.04,'full alertness really produces the fast scent chase');rage.npc.dispose();

// Run the actual upper window route against the authored collision geometry.
for(const fps of [25,60,144]) {
  const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),window=castle.breakables.find(target=>target.escapeRoute);
  if(fps===25) {
    const items=createWorldItems(scene,castle.navigation),point=window.center(),spawn={x:point.x,y:5.15,z:-5};
    const npc=createNaiwaPursuer({scene,navigation:castle.navigation,doors:castle.doors,worldItems:items,player:{...createPlayer(),hidden:true},spawn,patrolRoute:[spawn]});
    const origin=new THREE.Vector3(point.x,6.73,-5.6),direction=point.clone().sub(origin).normalize();
    items.strike(origin,direction,propItem('crowbar','window-test'));items.strike(origin,direction,propItem('crowbar','window-test'));
    assert(window.broken);assert.equal(npc.alertness,14,'a real shattered window publishes the window identity and awards the nearby hearing bonus once');npc.dispose();
  }else window.break();
  const escaping={...createPlayer(),x:window.center().x,y:5.15,z:-5.7};jumpPlayer(escaping);
  for(let i=0;i<fps*2.8;i++)advancePlayer(escaping,0,i<fps*1.25?-WALK_SPEED/fps:0,1/fps,castle.navigation);
  assert(escaping.grounded&&escaping.z<-7.5&&Math.abs(escaping.y+.83)<.02);
  assert.equal(escaping.health,92,'falling out of the real second-floor window costs eight health');
}

class Control extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.open=false;this.hidden=false;this.attributes={};this.children=new Map();this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(key,value){this.attributes[key]=value;}
  closest(){return null;}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}
  focus(){document.activeElement=this;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  setPointerCapture(){}
}
const controls=new Map();globalThis.document=new Control();
document.querySelector=key=>{if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};
document.querySelectorAll=()=>Array.from({length:7},()=>new Control());document.hidden=false;
globalThis.window=new Control();window.matchMedia=()=>({matches:false});let reloads=0;window.location={reload(){reloads++;}};
const canvas=new Control();canvas.requestPointerLock=()=>Promise.resolve();
const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),groups={labels:new THREE.Group(),basement:new THREE.Group()},roof=new THREE.Group(),playerPin=new THREE.Object3D();scene.add(playerPin);
const explorer=createEscapeExplorer({scene,canvas,stage:new Control(),status:new Control(),groups,roof,navigation,playerPin,doors:[],onMap(){}});
const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:explorer.worldItems,player:explorer.player,onCatch:()=>explorer.capture()});explorer.setPursuer(npc);
assert.equal(document.querySelector('#escape-health-value').textContent,'100');assert.equal(document.querySelector('#escape-alertness-value').textContent,'10');
explorer.enter();npc.hit({damage:1,source:'melee'});assert.equal(document.querySelector('#escape-alertness-value').textContent,'15');
damagePlayer(explorer.player,6,'slam');assert.equal(document.querySelector('#escape-health-meter').value,94);
const carried=explorer.inventory.slots[0].id;Object.assign(explorer.player,{x:2,y:.15,z:3});explorer.capture();
assert.equal(explorer.player.health,64);assert.equal(explorer.player.y,-5.05);assert.equal(explorer.player.x,-6.25);assert.equal(npc.alertness,15);
explorer.capture();assert.equal(explorer.player.health,64,'one capture is charged only once');
assert(explorer.paused&&explorer.captured&&!explorer.gameOver&&document.querySelector('#escape-caught').open);
explorer.showMap();explorer.enter();assert(explorer.paused&&explorer.captured,'the map cannot bypass fainting');
explorer.restartPosition();assert(!explorer.paused&&!explorer.captured);assert.equal(explorer.player.health,64);assert.equal(explorer.inventory.slots[0].id,carried);assert.equal(npc.alertness,5,'waking reduces alertness by ten exactly once');
explorer.restartPosition();assert.equal(npc.alertness,5,'manual position resets cannot repeatedly reduce alertness');
explorer.capture();assert.equal(explorer.player.health,34);explorer.restartPosition();explorer.capture();assert.equal(explorer.player.health,4);explorer.restartPosition();explorer.capture();
assert.equal(explorer.player.health,0);assert(explorer.gameOver&&explorer.paused);assert.equal(document.querySelector('#escape-caught-retry').textContent,'重新开始');
explorer.showMap();explorer.enter();assert(explorer.paused&&explorer.gameOver,'map switching cannot revive a dead player');
assert(!jumpPlayer(explorer.player));explorer.restartPosition();assert.equal(reloads,1,'restart begins a genuinely fresh run');npc.dispose();
console.log('Vitals OK: 100 HP clamp, slam -6, support-height falls and real second-floor window -8 at 25/60/144 FPS, faint -30 with automatic spawn return/preserved alertness and equipment, zero-HP game over/fresh restart, all item-tier damage including soft food and real collision deduplication, nearby/window hearing bonuses, optional 5–10 blackout reduction, 30/70/100 thresholds and fast Transcendent scent chase, accessible split health/alertness HUD and phone layout.');
