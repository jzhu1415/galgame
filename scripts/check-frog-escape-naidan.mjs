import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createNavigation,createPlayer} from '../src/frog-escape-navigation.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {createInventory} from '../src/frog-escape-inventory.js';
import {createPropModel,propItem} from '../src/frog-escape-props.js';
import {updateFixtureAction} from '../src/frog-escape-interactions.js';
import {displayAlertness,difficultyRules,itemDamage,itemAlertnessChange} from '../src/frog-escape-vitals.js';
import {inventoryItemIcon} from '../src/frog-escape-inventory-icons.js';
import {canConsume} from '../src/frog-escape-consumption.js';
import {tr} from '../src/frog-escape-i18n.js';

const run=(seconds,fps,tick)=>{for(let rest=seconds;rest>1e-9;){const dt=Math.min(1/fps,rest);tick(dt);rest-=dt;}};
const egg=propItem('egg','reference-egg'),model=createPropModel(egg);
assert.equal(egg.name,'奶蛋');assert.equal(tr(egg.name,{},'en'),'egg');assert(egg.size.every((size,i)=>size>[.075,.1,.075][i]));
assert.equal(itemDamage(egg),1);assert.equal(itemAlertnessChange(egg),-2);assert(!canConsume(egg));
assert.equal(model.getObjectByName('egg:yellow-shell').material.color.getHex(),0xffd83e);
let eyes=0;model.traverse(node=>{if(node.name==='egg:eye')eyes++;});assert.equal(eyes,2);assert(model.getObjectByName('egg:smile'));
const bounds=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());assert(bounds.distanceTo(new THREE.Vector3(...egg.size))<1e-7,'the face stays within the normalized item size');
assert(inventoryItemIcon(egg).includes('#f6d23b')&&inventoryItemIcon(egg).includes('<ellipse'),'the hotbar uses the yellow smiling egg');
const milk=propItem('milk','renamed-milk');assert.equal(milk.name,'野生狗奶');assert.equal(tr(milk.name,{},'en'),'Milk');

{
  const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),items=createWorldItems(scene,castle.navigation,castle.pickupSeeds),bag=createInventory();
  const eggs=items.entries.filter(entry=>entry.item.kind==='egg');assert.equal(eggs.length,4,'the fridge contains exactly four eggs');
  const fridge=castle.interactables.find(action=>action.fixtureKind==='fridge');fridge.open=true;updateFixtureAction(fridge,1);
  run(.8,60,dt=>items.tick(dt));assert(eggs.every(entry=>!entry.broken),'the larger eggs sit intact on their tray');
  // Collect the front row first so the back row is then directly exposed.
  eggs.sort((a,b)=>b.z-a.z);
  for(const entry of eggs) {
    const point=entry.mesh.getWorldPosition(new THREE.Vector3()),origin=point.clone().add(new THREE.Vector3(0,.035,.8));
    assert(items.nearby(origin,point.clone().sub(origin).normalize(),0)===entry,'every larger fridge egg can actually be aimed at');
    assert(items.pickup(entry,bag));
  }
  assert.equal(bag.slots.filter(item=>item?.kind==='egg').length,4);assert.equal(items.entries.filter(entry=>entry.item.kind==='egg').length,0);
}

function setup({fps=60,difficulty='normal',down=false,roll=.99,solids=[]}={}) {
  const scene=new THREE.Scene(),navigation=createNavigation({solids,stairs:[],boundary:[[-20,-20],[20,-20],[20,20],[-20,20]]});
  const items=createWorldItems(scene,navigation),player={...createPlayer(),x:0,y:.15,z:-3,hidden:true},spawn={x:0,y:.15,z:0},changes=[];
  scene.addEventListener('escape-pursuer-alertness',event=>changes.push(event));
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:items,player,spawn,patrolRoute:[spawn],difficulty,random:()=>roll});
  if(down){npc.hit({damage:npc.health,source:'melee'});assert.equal(npc.state,'down');}
  const step=seconds=>run(seconds,fps,dt=>{npc.tick(dt);items.tick(dt);});
  return {scene,navigation,items,player,npc,changes,step};
}
for(const fps of [30,60,144])for(const difficulty of ['easy','normal','hard','hacker','gunmu'])for(const down of [false,true]) {
  const t=setup({fps,difficulty,down}),before=t.npc.alertness,health=t.npc.health,downTime=t.npc.stunTime;
  const thrown=t.items.throw(propItem('egg',`egg-${fps}-${difficulty}-${down}`),t.player,new THREE.Vector3(0,down?.55:1.3,-2),new THREE.Vector3(0,0,1));assert(thrown);
  t.step(.35);assert(thrown.broken,'actual egg contacts still break the fragile shell');
  assert.equal(t.npc.alertness,difficulty==='gunmu'?70:Math.max(0,before-2),'the complete collision plus break event lowers alertness by exactly two');
  assert.equal(t.npc.health,down?health:health-1,'standing hit damage remains one; downed health stays unchanged');
  assert.equal(t.changes.filter(event=>event.source==='egg-hit').length,difficulty==='gunmu'||before===0?0:1,'multi-shape physics contacts count once');
  if(down){assert.equal(t.npc.state,'down');assert(Math.abs(t.npc.stunTime-(downTime-.35))<1e-6,'egg impacts never restart or extend the down timer');}
  if(difficulty==='gunmu'){assert.equal(displayAlertness(t.npc.alertness,difficulty),6767);assert.equal(t.npc.phase.label,'滚木模式');assert.equal(tr(t.npc.phase.label,{},'en'),'Invisibility');assert(!t.npc.model.root.visible);}
  t.npc.dispose();
}
for(const fps of [30,60,144]) {
  const t=setup({fps,difficulty:'hard',roll:0}),before=t.npc.alertness;
  t.items.throw(propItem('egg',`blocked-${fps}`),t.player,new THREE.Vector3(0,1.3,-2),new THREE.Vector3(0,0,1));t.step(.35);
  assert.equal(t.npc.health,difficultyRules('hard').naiwaHealth,'a successful guard retains its original damage protection');
  assert.equal(t.npc.alertness,before-2,'a guarded egg still lowers alertness, using the pre-impact defense threshold');t.npc.dispose();
  const knockout=setup({fps});knockout.npc.hit({damage:knockout.npc.health-1,source:'melee'});const knockoutBefore=knockout.npc.alertness;
  knockout.items.throw(propItem('egg',`knockout-${fps}`),knockout.player,new THREE.Vector3(0,1.3,-2),new THREE.Vector3(0,0,1));knockout.step(.35);
  assert.equal(knockout.npc.state,'down');assert.equal(knockout.npc.health,0);assert.equal(knockout.npc.alertness,knockoutBefore-2,'the egg that knocks Naiwa down also calms it');knockout.npc.dispose();
}
{
  const wall={x:2,z:0,halfX:.3,halfZ:.1,minY:.15,maxY:3,axisX:[1,0],axisZ:[0,1]},t=setup({solids:[wall]});
  t.items.throw(propItem('egg','missed-egg'),t.player,new THREE.Vector3(2,1.3,-2),new THREE.Vector3(0,0,1));t.step(.35);
  assert.equal(t.npc.health,20);assert.equal(t.npc.alertness,11,'an egg broken nearby without hitting Naiwa keeps the ordinary noise behavior');t.npc.dispose();
}
console.log('Nai Dan OK: larger reference-shaped yellow shell, green eyes/smile and icon; four intact, aimable fridge eggs; exact bilingual milk/egg/status names; one-damage physical hits with net -2 alertness across all five difficulties, standing/downed/guarded/final-knockout contacts, zero clamp and permanent 6767 at 30/60/144 FPS; nearby misses retain ordinary noise.');
