import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createNavigation,createPlayer} from '../src/frog-escape-navigation.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {ESCAPE_DIFFICULTIES,difficultyRules,itemAlertness,itemDamage} from '../src/frog-escape-vitals.js';
import {propItem,propTypes} from '../src/frog-escape-props.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {insertFixtureKey,nearestFixture,updateFixtureAction} from '../src/frog-escape-interactions.js';
import {setEscapeLanguage} from '../src/frog-escape-i18n.js';

const boundary=[[-40,-40],[40,-40],[40,40],[-40,40]];
const run=(seconds,tick,fps=60)=>{for(let rest=seconds;rest>1e-9;){const dt=Math.min(1/fps,rest);tick(dt);rest-=dt;}};
function npcSetup(difficulty='normal',random=()=>.99) {
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),player={...createPlayer(),x:0,y:.15,z:-5,hidden:true},spawn={x:0,y:.15,z:0};
  const events=[];scene.addEventListener('escape-pursuer-hit',event=>events.push(event));
  const npc=createNaiwaPursuer({scene,navigation,player,spawn,doors:[],patrolRoute:[spawn],difficulty,random,worldItems:{physics:{addActor:()=>({remove(){}}),syncActors(){}}}});
  return {npc,events,tick:dt=>npc.tick(dt)};
}
assert.deepEqual(Object.values(ESCAPE_DIFFICULTIES).map(r=>r.naiwaHealth),[15,20,25,30]);
assert.deepEqual(Object.values(ESCAPE_DIFFICULTIES).map(r=>r.downDuration),[8,6.5,5,3.5]);
for(const difficulty of Object.keys(ESCAPE_DIFFICULTIES))for(const kind of Object.keys(propTypes).filter(kind=>kind!=='shedKey')) {
  const {npc,events}=npcSetup(difficulty),item=propItem(kind,kind),base=itemAlertness(item);
  assert.equal(npc.hit({damage:999,item,source:kind==='crowbar'?'melee':'projectile'}),base>0,'zero-damage peel hits do not become damage through the supplied override');
  assert.equal(npc.health,difficultyRules(difficulty).naiwaHealth-base,'actual hits use the item tier even in Hacker at maximum alertness');
  if(base>0)assert.equal(events[0].damage,base);else assert.equal(events.length,0);npc.dispose();
}
for(const kind of['milk','jar','bottle'])for(const scale of[1,1.5]) {
  const item={...propItem(kind,kind),empty:true},test=npcSetup();test.npc.hit({item,damageScale:scale,source:'projectile'});
  assert.equal(test.npc.health,20-(itemAlertness(item)*scale-1),'empty-container penalty and wine apply to the new damage scale');test.npc.dispose();
}
for(const fps of[30,60,144])for(const difficulty of Object.keys(ESCAPE_DIFFICULTIES)) {
  const test=npcSetup(difficulty),rules=difficultyRules(difficulty),bar=propItem('crowbar','bar');test.npc.beginRun();
  function knockDown(){while(test.npc.health>0){assert(test.npc.hit({item:bar,source:'melee'}));if(test.npc.health>0)run(.31,test.tick,fps);}}
  for(const bonus of[2,0]) {
    knockDown();const duration=rules.downDuration+bonus;assert.equal(test.npc.stunTime,duration);
    assert(!test.npc.hit({item:bar,source:'melee'}));assert.equal(test.npc.stunTime,duration,'hits cannot restart a knockdown timer');
    run(duration-.01,test.tick,fps);assert.equal(test.npc.state,'down');run(.01,test.tick,fps);
    assert.notEqual(test.npc.state,'down');assert.equal(test.npc.health,rules.naiwaHealth,'recovery restores this difficulty’s hidden health');
  }
  test.npc.reset({keepAlertness:true});assert(!test.npc.setDifficulty(difficulty==='easy'?'hard':'easy',{restartOpening:true}),'a wake or position reset does not unlock difficulty');
  knockDown();assert.equal(test.npc.stunTime,rules.downDuration,'waking cannot grant another first-knockdown bonus');
  test.npc.reset();test.npc.beginRun();knockDown();assert.equal(test.npc.stunTime,rules.downDuration+2,'a fresh run restores the first-knockdown bonus');test.npc.dispose();
}
{
  const test=npcSetup('hard',()=>0),item=propItem('crowbar','blocked');
  for(let i=0;i<8;i++)assert(test.npc.hit({item,source:'melee',origin:{x:0,z:-2}}));
  assert.equal(test.npc.health,25,'successful blocks never damage hidden health');
  test.npc.hit({damage:100});assert.equal(test.npc.stunTime,7,'blocking does not consume the first-knockdown bonus');test.npc.dispose();
}

class Control extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.children=new Map();this.attributes={};this.classList={add(){},remove(){},toggle(){}};}
  closest(){return null;}setPointerCapture(){}focus(){}showModal(){this.open=true;}close(){this.open=false;}
  setAttribute(k,v){this.attributes[k]=v;}querySelector(k){if(!this.children.has(k))this.children.set(k,new Control());return this.children.get(k);}
}
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
function dispatch(target,type,props={}){const event=new Event(type,{cancelable:true});for(const [k,v]of Object.entries(props))Object.defineProperty(event,k,{value:v});target.dispatchEvent(event);return event;}
function explorerSetup(castle=null) {
  const controls=new Map(),slots=Array.from({length:7},()=>new Control());globalThis.document=new Control();document.hidden=false;
  document.querySelector=k=>{if(!controls.has(k))controls.set(k,new Control());return controls.get(k);};document.querySelectorAll=()=>slots;
  let reloads=0;globalThis.window=new Control();window.matchMedia=()=>({matches:false});window.location={reload(){reloads++;}};
  const scene=castle?.scene??new THREE.Scene(),navigation=castle?.navigation??createNavigation({solids:[],stairs:[],boundary}),canvas=new Control(),playerPin=new THREE.Object3D();scene.add(playerPin);canvas.requestPointerLock=()=>Promise.resolve();
  const explorer=createEscapeExplorer({scene,canvas,navigation,playerPin,stage:new Control(),status:new Control(),groups:castle?.groups??{labels:new THREE.Group()},roof:castle?.roof??new THREE.Group(),doors:castle?.doors??[],interactables:castle?.interactables??[],pickupSeeds:castle?.pickupSeeds??[],onMap(){}});
  const key=code=>dispatch(document,'keydown',{code});return {explorer,controls,canvas,scene,navigation,key,reloads:()=>reloads};
}
{
  const {explorer,controls,reloads}=explorerSetup();assert(explorer.setDifficulty('hard'));explorer.enter();
  for(const id of['#escape-difficulty','#escape-pause-difficulty']) {
    const control=controls.get(id);assert(control.disabled);control.value='easy';dispatch(control,'change');assert.equal(control.value,'hard');assert.equal(explorer.difficulty,'hard');
  }
  explorer.pause();assert(!explorer.setDifficulty('easy'));explorer.showMap();assert(!explorer.setDifficulty('hacker'));explorer.enter();explorer.capture();explorer.restartPosition();assert(!explorer.setDifficulty('normal'));
  assert.equal(storage.get('naiwa-escape-difficulty-v1'),'hard','rejected changes cannot alter the next-run preference');
  setEscapeLanguage('en');explorer.refreshLanguage();assert(controls.get('#escape-difficulty-help').textContent.includes('locked'));setEscapeLanguage('zh');
  dispatch(controls.get('#escape-pause-new-run'),'click');assert.equal(reloads(),1,'full restart is distinct from returning to the starting position');
  const fresh=explorerSetup();assert(fresh.explorer.setDifficulty('easy'),'a newly created run can select another difficulty');
}
for(const fps of[30,60,144]) {
  const scene=new THREE.Scene(),castle={scene,...createEscapeScene(scene,{labels:false})},test=explorerSetup(castle),{explorer,key,canvas}=test;
  const chest=castle.interactables.find(a=>a.fixtureKind==='chest'),slot=explorer.inventory.store(propItem('shedKey','inserted-'+fps)),keyItem=explorer.inventory.slots[slot];explorer.inventory.select(slot);explorer.enter();
  const anchor=chest.anchor.getWorldPosition(new THREE.Vector3()),normal=new THREE.Vector3(0,0,1).applyQuaternion(chest.anchor.parent.getWorldQuaternion(new THREE.Quaternion()));
  Object.assign(explorer.player,{x:anchor.x+normal.x*1.3,y:-.7,z:anchor.z+normal.z*1.3});
  function aim(){const eye=new THREE.Vector3(explorer.player.x,explorer.player.y+1.58,explorer.player.z),direction=anchor.clone().sub(eye).normalize();explorer.player.yaw=Math.atan2(-direction.x,-direction.z);explorer.player.pitch=Math.asin(direction.y);explorer.tick(1/fps);}
  aim();assert.equal(nearestFixture(castle.interactables,explorer.player,explorer.camera,explorer.camera.getWorldDirection(new THREE.Vector3()),castle.navigation),chest);
  assert.equal(explorer.worldItems.throw(keyItem,explorer.player,explorer.camera.position,new THREE.Vector3(0,0,-1)),null,'the physics API also refuses key throws');
  key('KeyE');assert(chest.locked&&explorer.inventory.slots[slot],'E with a carried key does not unlock');
  explorer.player.yaw+=Math.PI;explorer.tick(1/fps);dispatch(canvas,'pointerdown',{button:2,pointerType:'mouse'});assert(chest.locked&&explorer.inventory.slots[slot],'a failed right click keeps the key instead of throwing it');
  assert(!insertFixtureKey(chest,propItem('bread','wrong')),'only a matching key fits');
  aim();dispatch(canvas,'pointerdown',{button:2,pointerType:'mouse'});assert(chest.locked&&explorer.inventory.slots[slot],'knowing the code is mandatory before opening the chest');castle.runClues.readNote();
  aim();dispatch(canvas,'pointerdown',{button:2,pointerType:'mouse'});assert(!chest.locked&&!chest.open&&chest.insertedKey===keyItem);assert.equal(explorer.inventory.slots[slot],null);
  const model=chest.keySocket.getObjectByName('fixture:inserted-key'),closed=model.getWorldPosition(new THREE.Vector3());assert(model&&model.visible);key('KeyE');
  run(1.2,dt=>explorer.tick(dt),fps);assert(chest.open&&chest.amount>.99&&chest.content.visible);assert(model.getWorldPosition(new THREE.Vector3()).distanceTo(closed)>.2,'the permanently inserted key follows the actual lid');
  chest.open=false;updateFixtureAction(chest,2,null,castle.navigation);assert(model.getWorldPosition(new THREE.Vector3()).distanceTo(closed)<1e-6);assert(model.parent===chest.keySocket);
  assert(!explorer.worldItems.entries.some(e=>e.item.id===keyItem.id),'the inserted key is never a pickup or projectile');
  explorer.showMap();explorer.enter();explorer.capture();explorer.restartPosition();assert(chest.insertedKey===keyItem&&model.parent===chest.keySocket&&!chest.locked,'map and waking preserve the inserted key');
  assert(!insertFixtureKey(chest,keyItem),'the same key cannot be inserted twice');
}
const html=readFileSync('frog-escape-map.html','utf8');assert(!html.includes('escape-naiwa-health'),'Naiwa’s health remains hidden');
console.log('Balance/key rules OK: locked run difficulty and restart selection; 15/20/25/30 hidden health, item-tier damage including soft food and blocks; 8/6.5/5/3.5-second knockdowns with one +2-second first bonus at 30/60/144 FPS; wake/reset lifecycle; permanent matching-key insertion with real right-click/E/lid/world/map/capture behavior.');
