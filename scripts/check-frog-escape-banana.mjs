import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createConsumption,FOOD_HEALTH,foodStaminaFraction,canConsume} from '../src/frog-escape-consumption.js';
import {createPlayer,createNavigation} from '../src/frog-escape-navigation.js';
import {createInventory} from '../src/frog-escape-inventory.js';
import {propItem,createPropModel} from '../src/frog-escape-props.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {updateFixtureAction} from '../src/frog-escape-interactions.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {difficultyRules,itemDamage} from '../src/frog-escape-vitals.js';
import {inventoryItemIcon} from '../src/frog-escape-inventory-icons.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';

const boundary=[[-40,-40],[40,-40],[40,40],[-40,40]],run=(seconds,tick,fps=60)=>{for(let left=seconds;left>1e-9;){const dt=Math.min(1/fps,left);tick(dt);left-=dt;}};
for(const fps of [30,60,144])for(const kind of [...Object.keys(FOOD_HEALTH),'milk','bottle']){
  const player={...createPlayer(),health:50,stamina:1,sprintExhausted:true},inventory=createInventory(),events=[];
  inventory.store(propItem(kind,kind));const consume=createConsumption({player,inventory,onEvent:event=>events.push(event)});
  assert(consume.start());run(1.49,dt=>consume.tick(dt),fps);assert.equal(player.stamina,1);assert.equal(player.health,50);
  run(.01,dt=>consume.tick(dt),fps);const max=20,expected=Math.min(max,1+max*foodStaminaFraction({kind}));
  assert(Math.abs(player.stamina-expected)<1e-8,`${kind} restores the specified fraction after healing at ${fps} FPS`);
  if(kind==='cheese')assert.equal(player.stamina,max);if(kind==='bottle')assert.equal(player.stamina,1);
  if(kind==='banana'){assert.equal(player.health,53);assert.equal(inventory.slots[0].kind,'bananaPeel');assert.equal(inventory.slots[0].id,'banana:peel');assert(!canConsume(inventory.slots[0]));assert.equal(events.at(-1).item.kind,'banana');}
}
for(const kind of ['banana','cheese','milk']){
  const player={...createPlayer(),health:80,stamina:0},inventory=createInventory();inventory.store(propItem(kind,kind));const consume=createConsumption({player,inventory});consume.start();consume.tick(1);consume.cancel();consume.tick(1);assert.equal(player.stamina,0);assert.equal(player.health,80);assert.equal(inventory.slots[0].kind,kind);
}
assert.equal(itemDamage(propItem('banana','b')),1);assert.equal(itemDamage(propItem('bananaPeel','p')),0);assert.equal(itemDamage(propItem('bananaPeel','p'),'projectile',1.5),0);
for(const kind of ['banana','bananaPeel']){
  const model=createPropModel(propItem(kind,kind)),size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());assert(size.toArray().every(Number.isFinite));assert(inventoryItemIcon(propItem(kind,kind)).startsWith('<svg'));
}
{
  const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),bananas=castle.pickupSeeds.filter(seed=>seed.item.kind==='banana');assert.equal(bananas.length,2);assert.equal(new Set(bananas.map(seed=>seed.item.id)).size,2);
  const items=createWorldItems(scene,castle.navigation,castle.pickupSeeds),bag=createInventory(),fridge=castle.interactables.find(action=>action.fixtureKind==='fridge');
  assert(!items.pickup(items.entries.find(e=>e.item.kind==='banana'),bag),'closed fridge hides bananas');fridge.open=true;
  run(2,dt=>updateFixtureAction(fridge,dt,{...createPlayer(),x:-30,z:20},castle.navigation));items.physics.syncColliders();scene.updateMatrixWorld(true);
  for(const seed of bananas){
    const entry=items.entries.find(e=>e.item.id===seed.item.id),point=seed.mesh.getWorldPosition(new THREE.Vector3()),origin=point.clone().add(new THREE.Vector3(0,0,.8));
    const hit=items.physics.ray(origin,point.clone().add(new THREE.Vector3(0,0,-.1)));assert.equal(hit?.body.propEntry,entry,'both bananas have clear physical pickup rays in their empty shelf spaces');assert(items.pickup(entry,bag));
  }
  assert.equal(bag.slots.filter(item=>item?.kind==='banana').length,2);
}
function arena(difficulty='normal',ninja=false,random=()=>.99){
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),items=createWorldItems(scene,navigation),player={...createPlayer(),x:-15,y:-.83,z:10,hidden:true};
  const spawn={x:15,y:-.83,z:-2},npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:items,player,spawn,patrolRoute:[{x:15,y:-.83,z:2}],difficulty,random});
  if(ninja){while(npc.alertness<70)npc.hit({item:propItem('banana','phase'),damageScale:.00001,source:'projectile'});npc.reset({keepAlertness:true});}
  return {scene,navigation,items,player,npc,step:dt=>{npc.tick(dt);items.tick(dt,player);}};
}
function lay(items,id){const entry=items.place(propItem('bananaPeel',id),{valid:true,position:new THREE.Vector3(15,-.83+.0225+.006,0),yaw:0});assert(entry);return entry;}
for(const fps of [30,60,144])for(const mode of ['easy','normal','hard','hacker','ninja']){
  const t=arena(mode==='ninja'?'normal':mode,mode==='ninja'),{items,npc,player,scene}=t,rules=difficultyRules(mode==='ninja'?'normal':mode),alert=npc.alertness;
  const entry=lay(items,`first-${mode}-${fps}`);run(1,dt=>items.tick(dt,player),fps);let slips=0;scene.addEventListener('escape-banana-slip',()=>slips++);
  for(let i=0;i<fps*6&&npc.state!=='down';i++)t.step(1/fps);
  assert.equal(npc.state,'down',`${mode} really steps on the grounded peel at ${fps} FPS`);assert.equal(npc.health,0);assert.equal(npc.stunTime,rules.downDuration+2);assert.equal(npc.alertness,alert,'slipping has no direct attack damage/alertness bonus');
  assert.equal(slips,1);assert(!items.entries.includes(entry));assert.equal(entry.body,null);assert.equal(items.flyingPeels.length,1);assert(entry.mesh.parent,'used peel remains visible while flying');
  assert(!items.pickup(entry,createInventory()));assert.equal(items.drop(entry.item,{...player,x:15,z:4}),null,'a used peel identity cannot respawn');
  const flyingPosition=entry.mesh.position.clone();run(.2,dt=>items.tick(dt,player),fps);assert(entry.mesh.position.distanceTo(flyingPosition)>.4);run(.5,dt=>items.tick(dt,player),fps);assert.equal(items.flyingPeels.length,0);assert.equal(entry.mesh.parent,null);
  const key=scene.getObjectByName('naiwa:waist-key'),origin=key.position.clone().add(new THREE.Vector3(0,1,1));assert(npc.pickupKey(createInventory(),origin,key.position.clone().sub(origin).normalize()),'a banana knockdown enables normal key stealing');
  run(rules.downDuration+1.95,dt=>npc.tick(dt),fps);assert.equal(npc.state,'down');run(.06,dt=>npc.tick(dt),fps);assert.notEqual(npc.state,'down');assert.equal(npc.health,rules.naiwaHealth,'ordinary get-up health restoration is reused');
  npc.reset({keepAlertness:true});lay(items,`second-${mode}-${fps}`);run(1,dt=>items.tick(dt,player),fps);for(let i=0;i<fps*6&&npc.state!=='down';i++)t.step(1/fps);assert.equal(npc.stunTime,rules.downDuration,'only the first knockdown gets the two-second bonus');assert.equal(slips,2);npc.dispose();
}
for(const kind of ['banana','bananaPeel'])for(const fps of [30,60,144]){
  const t=arena(),{npc,items,player}=t;Object.assign(npc.actor,{z:0});Object.assign(player,{x:15,y:-.83,z:2});npc.setMapLayer('all');
  const health=npc.health,alert=npc.alertness;assert(items.throw(propItem(kind,`physical-${kind}-${fps}`),player,new THREE.Vector3(15,.25,2),new THREE.Vector3(0,0,-1)));
  run(.3,t.step,fps);assert.equal(npc.health,health-(kind==='banana'?1:0),'real body contact uses banana/peel damage');assert.equal(npc.alertness,alert+(kind==='banana'?1:0));npc.dispose();
}
{
  const t=arena('hard',false,()=>0);lay(t.items,'blackout');run(1,dt=>t.items.tick(dt,t.player));for(let i=0;i<360&&t.npc.state!=='down';i++)t.step(1/60);assert.equal(t.npc.state,'down');run(t.npc.stunTime+.01,dt=>t.npc.tick(dt));assert.equal(t.npc.alertness,25,'slip recovery uses the existing five-to-ten-point blackout reduction');t.npc.dispose();
}
{
  const t=arena(),entry=lay(t.items,'gates'),actor={x:15,y:-.83,z:.2,grounded:true,collider:{}};run(1,dt=>t.items.tick(dt,t.player));let attempts=0;
  const slip=()=>{attempts++;return true;},from={x:15,y:-.83,z:-.2};
  actor.grounded=false;assert(!t.items.tryBananaSlip(actor,from,slip));actor.grounded=true;entry.body.velocity.set(4,0,0);assert(!t.items.tryBananaSlip(actor,from,slip));entry.body.velocity.setZero();entry.body.position.y+=2;assert(!t.items.tryBananaSlip(actor,from,slip));entry.body.position.y-=2;
  assert(!t.items.tryBananaSlip(actor,from,()=>false),'immune/non-trippable states do not consume a peel');assert(t.items.entries.includes(entry));
  t.navigation.solids.push({x:15,z:.1,halfX:1,halfZ:.03,minY:-.83,maxY:2,axisX:[1,0],axisZ:[0,1]});assert(!t.items.tryBananaSlip(actor,from,slip),'walls block foot contact');assert.equal(attempts,0);t.npc.dispose();
}
{
  class Control extends EventTarget{
    constructor(){super();this.style={};this.dataset={};this.attributes={};this.children=new Map();this.classList={add(){},remove(){},toggle(){}};this.open=false;}
    querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}setAttribute(key,value){this.attributes[key]=value;}getAttribute(key){return this.attributes[key]??null;}closest(){return null;}focus(){}showModal(){this.open=true;}close(){this.open=false;}setPointerCapture(){}
  }
  const controls=new Map();globalThis.document=new Control();document.querySelector=key=>{if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};document.querySelectorAll=()=>Array.from({length:7},()=>new Control());document.hidden=false;globalThis.window=new Control();window.matchMedia=()=>({matches:false});
  const scene=new THREE.Scene(),pin=new THREE.Object3D(),canvas=new Control();scene.add(pin);canvas.requestPointerLock=()=>Promise.resolve();
  const explorer=createEscapeExplorer({scene,canvas,stage:new Control(),status:new Control(),groups:{labels:new THREE.Group()},roof:new THREE.Group(),playerPin:pin,navigation:createNavigation({solids:[],stairs:[],boundary}),doors:[],onMap(){}});
  explorer.enter();Object.assign(explorer.player,{x:15,y:-.83,z:5,health:95,stamina:1});const slot=explorer.inventory.store(propItem('banana','actual-g-banana'));explorer.inventory.select(slot);
  const key=new Event('keydown',{cancelable:true});Object.defineProperty(key,'code',{value:'KeyG'});document.dispatchEvent(key);assert(explorer.consumption.active);run(1.5,dt=>explorer.tick(dt));
  assert.equal(explorer.player.health,98);assert.equal(explorer.inventory.slots[slot].kind,'bananaPeel');assert(explorer.camera.getObjectByName('prop:bananaPeel'),'actual G consumption replaces the held model with its peel');assert.equal(controls.get('#escape-stamina-meter').value,explorer.player.stamina);
  assert(controls.get('#escape-walk-hint').textContent.includes('香蕉')&&!controls.get('#escape-walk-hint').textContent.includes('香蕉皮'),'finish hint refers to the eaten banana');explorer.showMap();explorer.audio.dispose();delete globalThis.document;delete globalThis.window;
}
const html=readFileSync('frog-escape-map.html','utf8'),css=readFileSync('src/frog-escape-map.css','utf8');assert(html.includes('id="escape-stamina-label">体力值</span>'));assert(!html.includes('id="escape-stamina-value"'));assert(css.includes('.escape-stage:not(.is-walking) .escape-vitals{top:80px}')&&css.includes('top:112px'));
console.log('Bananas/stamina OK: atomic 40% food/milk, full cheese and no wine bonus after healing at 30/60/144 FPS; cancelled actions; exactly two physically reachable fridge bananas; retained unique peels; real banana 1/peel 0 contacts; Fool/Nerd/Ninja/Transcendent slips across all difficulties/FPS reuse knockdown durations, first bonus, recovery and key theft; one-shot flight/removal; air/speed/height/wall/immunity gates; map-button spacing and visible stamina heading.');
