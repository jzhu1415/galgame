import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createNavigation,createPlayer,advancePlayer,pointInPolygon} from '../src/frog-escape-navigation.js';
import {updateFixtureAction,insertFixtureKey} from '../src/frog-escape-interactions.js';
import {propItem} from '../src/frog-escape-props.js';
import {setEscapeLanguage} from '../src/frog-escape-i18n.js';

class Control extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.children=new Map();this.attributes={};this.open=false;this.hidden=false;this.value='';this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(key,value){this.attributes[key]=value;}closest(){return null;}focus(){document.activeElement=this;}setPointerCapture(){}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}
  showModal(){this.open=true;}close(){this.open=false;}
}
function setup({difficulty='normal',castle=true,touch=false}={}) {
  delete globalThis.document;delete globalThis.window;
  const scene=new THREE.Scene(),map=castle?createEscapeScene(scene,{labels:false,random:()=>.0007,difficulty}):null;
  const controls=new Map(),slots=Array.from({length:7},()=>new Control());
  globalThis.document=new Control();document.querySelector=id=>{if(!controls.has(id))controls.set(id,new Control());return controls.get(id);};document.querySelectorAll=id=>id==='[data-inventory-slot]'?slots:[];document.hidden=false;
  globalThis.window=new Control();window.matchMedia=query=>({matches:query==='(pointer:coarse)'&&touch});let reloads=0;window.location={reload(){reloads++;}};
  const canvas=new Control();canvas.requestPointerLock=()=>{document.pointerLockElement=canvas;document.dispatchEvent(new Event('pointerlockchange'));return Promise.resolve();};document.exitPointerLock=()=>{document.pointerLockElement=null;document.dispatchEvent(new Event('pointerlockchange'));};
  const boundary=[[-30,-30],[30,-30],[30,30],[-30,30]],navigation=map?.navigation??createNavigation({solids:[],stairs:[],boundary}),pin=map?.playerPin??new THREE.Object3D();if(!map)scene.add(pin);
  const explorer=createEscapeExplorer({scene,canvas,stage:new Control(),status:new Control(),groups:{labels:new THREE.Group()},roof:new THREE.Group(),playerPin:pin,navigation,doors:[],...map,onMap(){}});explorer.setDifficulty(difficulty);explorer.enter();
  function emit(target,type,props={}){const event=new Event(type,{cancelable:true});for(const[k,v]of Object.entries(props))Object.defineProperty(event,k,{value:v});target.dispatchEvent(event);return event;}
  const key=code=>emit(document,'keydown',{code}),right=()=>emit(canvas,'pointerdown',{button:2,pointerType:'mouse'});
  function aim(point,position) {const v=point.clone().sub(new THREE.Vector3(position.x,position.y+1.58,position.z)).normalize();Object.assign(explorer.player,position,{yaw:Math.atan2(-v.x,-v.z),pitch:Math.asin(v.y)});explorer.tick(.02);}
  return {scene,map,explorer,controls,key,right,aim,emit,navigation,canvas,get reloads(){return reloads;}};
}

// Taking, dropping and re-taking the same physical key must never clone it.
for(const difficulty of ['easy','normal','hard','hacker'])for(const dropped of [false,true]) {
  const test=setup({castle:false,difficulty}),{scene,explorer,navigation}=test,spawn={x:0,y:.15,z:0};
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:explorer.worldItems,player:explorer.player,spawn,patrolRoute:[spawn],random:()=>.99});explorer.setPursuer(npc);
  const waist=scene.getObjectByName('naiwa:waist-key');npc.hit({damage:100});
  const origin=waist.position.clone().add(new THREE.Vector3(0,1,1)),direction=waist.position.clone().sub(origin).normalize();
  assert(npc.pickupKey(explorer.inventory,origin,direction));const slot=explorer.inventory.slots.findIndex(i=>i?.kind==='rearDoorKey'),item=explorer.inventory.slots[slot];
  if(dropped){Object.assign(explorer.player,{x:5,y:.15,z:5});assert(explorer.worldItems.drop(item,explorer.player));explorer.inventory.remove(slot);}
  const other=explorer.inventory.store(propItem('bread','kept-food'));explorer.capture();
  if(difficulty==='easy') {
    assert.equal(explorer.inventory.slots.filter(i=>i?.kind==='rearDoorKey').length,dropped?0:1);
    assert.equal(explorer.worldItems.entries.filter(e=>e.item.kind==='rearDoorKey').length,dropped?1:0);assert(!waist.visible,'Easy keeps the carried or dropped key without regenerating a duplicate');
  }else {assert(!explorer.inventory.slots.some(i=>i?.kind==='rearDoorKey'));assert(!explorer.worldItems.entries.some(e=>e.item.kind==='rearDoorKey'));assert(waist.visible,'the key is hung back on Naiwa even on lethal capture');}
  assert.equal(explorer.inventory.slots[other]?.id,'kept-food');assert.equal(explorer.gameOver,difficulty==='hacker');
  explorer.capture();assert.equal(waist.visible,difficulty!=='easy','duplicate capture callbacks preserve the same key state');
  if(difficulty!=='hacker') {
    explorer.restartPosition();assert.equal(waist.visible,difficulty!=='easy');npc.hit({damage:100});
    const eye=waist.position.clone().add(new THREE.Vector3(0,1,1));
    if(difficulty==='easy') {
      assert(!npc.pickupKey(explorer.inventory,eye,waist.position.clone().sub(eye).normalize()),'Easy cannot generate another copy of the retained key');
      if(dropped)assert(explorer.worldItems.pickup(explorer.worldItems.entries.find(e=>e.item.kind==='rearDoorKey'),explorer.inventory),'the dropped Easy key remains recoverable after waking');
    }else assert(npc.pickupKey(explorer.inventory,eye,waist.position.clone().sub(eye).normalize()),'the returned key can be stolen again on the next knockdown');
    assert.equal(explorer.inventory.slots.filter(i=>i?.kind==='rearDoorKey').length,1);
    explorer.showMap();explorer.enter();assert(!waist.visible,'maps do not confiscate a stolen key');
  }
  npc.dispose();explorer.showMap();explorer.audio.dispose();
}

for(const [route,fps,touch]of [['door',30,false],['window',144,true]]) {
  const test=setup({difficulty:'easy',touch}),{map,explorer,scene,controls,aim,key,right}=test,goal=map.escapeProgress,clues=map.runClues,fence=goal.fence;
  const chest=map.interactables.find(a=>a.fixtureKind==='chest'),cutters=explorer.worldItems.entries.find(e=>e.item.kind==='boltCutters'),keyItem=clues.keySeed.item;
  assert(!insertFixtureKey(chest,keyItem),'a guessed code or early shed visit cannot skip learning the clue');
  assert(!goal.tryCut(cutters.item,new THREE.Vector3(0,.8,-20.8),new THREE.Vector3(0,0,-1),map.navigation));
  // The mandatory clue is recorded by the actual E-to-read interaction.
  const drawer=clues.noteContainer;drawer.open=true;updateFixtureAction(drawer,2,null,map.navigation);clues.sync();
  const note=clues.paper.getWorldPosition(new THREE.Vector3()),normal=new THREE.Vector3(0,0,1).applyQuaternion(drawer.loot.anchor.getWorldQuaternion(new THREE.Quaternion())),viewer=note.clone().addScaledVector(normal,.62);
  aim(note,{x:viewer.x,y:5.15,z:viewer.z});key('KeyE');assert(clues.codeKnown&&controls.get('#escape-note-dialog').open);
  test.emit(controls.get('#escape-note-dialog'),'cancel');assert(!explorer.paused);
  const toolKey=explorer.worldItems.entries.find(e=>e.item.kind==='shedKey');
  aim(new THREE.Vector3(toolKey.x,toolKey.y,toolKey.z),{x:toolKey.x,y:5.15,z:toolKey.z+.8});key('KeyE');assert(explorer.inventory.slots.some(i=>i?.kind==='shedKey'));
  // Entering the real code opens the main door; it remains a repeatable lock.
  const front=map.doors.find(d=>d.id==='front');aim(new THREE.Vector3(front.x,front.y+1.2,front.z),{x:0,y:.15,z:5.6});key('KeyE');controls.get('#escape-code-input').value=clues.code;test.emit(controls.get('#escape-code-form'),'submit');assert(front.open);
  const anchor=chest.anchor.getWorldPosition(new THREE.Vector3());
  aim(anchor,{x:anchor.x,y:-.7,z:anchor.z-1.3});explorer.inventory.select(explorer.inventory.slots.findIndex(i=>i?.kind==='shedKey'));right();assert(!chest.locked&&chest.insertedKey);
  key('KeyE');for(let i=0;i<fps;i++)explorer.tick(1/fps);assert(chest.content.visible);
  aim(new THREE.Vector3(cutters.x,cutters.y,cutters.z),{x:cutters.x,y:-.7,z:4.5});key('KeyE');assert(goal.cuttersClaimed,'only the actual chest item grants the tool step');
  assert(!goal.tryCut(cutters.item,new THREE.Vector3(0,.8,-20.8),new THREE.Vector3(0,0,-1),map.navigation),'the rear route is mandatory too');
  if(route==='door') {
    const rear=map.doors.find(d=>d.id==='rear');explorer.inventory.store(propItem('rearDoorKey','naiwa-rear-door-key'));
    aim(new THREE.Vector3(rear.x,rear.y+1.2,rear.z),{x:rear.x,y:.15,z:-5.7});key('KeyE');assert(rear.open);
    for(let i=0;i<fps;i++)explorer.tick(1/fps);
    Object.assign(explorer.player,{x:rear.x,y:.15,z:-6.15,yaw:0,pitch:0});goal.resetPosition(explorer.player);key('KeyW');
    for(let i=0;i<fps*3&&explorer.player.z>-9.8;i++)explorer.tick(1/fps);test.emit(document,'keyup',{code:'KeyW'});
    assert.equal(goal.rearRoute,'door');assert(explorer.player.z<-8);
  }else {
    const window=map.breakables.find(b=>b.escapeRoute),point=window.center(),bar=explorer.worldItems.entries.find(e=>e.item.kind==='crowbar');
    assert(explorer.worldItems.pickup(bar,explorer.inventory));explorer.inventory.select(explorer.inventory.slots.findIndex(i=>i?.kind==='crowbar'));
    aim(point,{x:point.x,y:5.15,z:-6.15});
    for(let hit=0;hit<2;hit++){test.emit(test.canvas,'pointerdown',{button:0,pointerType:'mouse'});for(let i=0;i<Math.ceil(fps*1.25);i++)explorer.tick(1/fps);}
    assert(window.broken);Object.assign(explorer.player,{yaw:0,pitch:0});goal.resetPosition(explorer.player);key('Space');key('KeyW');
    for(let i=0;i<fps*3;i++)explorer.tick(1/fps);test.emit(document,'keyup',{code:'KeyW'});
    assert.equal(goal.rearRoute,'window');assert(explorer.player.z<-7.5&&explorer.player.grounded);
  }
  // Closed panels and the polygon block the exit, even at a jump height.
  for(const y of [-.83,.4,2])assert(map.navigation.blocked(0,y,-22.1));
  const slot=explorer.inventory.slots.findIndex(i=>i?.kind==='boltCutters');explorer.inventory.select(slot);
  aim(new THREE.Vector3(0,.3,-22),{x:0,y:-.83,z:-20.7});
  const events=[];scene.addEventListener('escape-victory',e=>events.push(e));
  const count=explorer.worldItems.entries.length;
  if(touch)test.emit(controls.get('#escape-interact'),'click');else right();
  assert(fence.cut&&!explorer.won,'cutting alone never grants victory');assert.equal(explorer.worldItems.entries.length,count,'right-click uses the tool instead of throwing it');assert(explorer.inventory.slots[slot]);
  assert(map.navigation.solids.filter(s=>fence.colliders.includes(s)).every(s=>!s.enabled()),'all cut-panel colliders are disabled');
  assert(!map.navigation.blocked(0,-.83,-22.2));assert(map.navigation.blocked(1.5,-.83,-22.3));assert(map.navigation.blocked(0,-.83,24.1),'the rest of the estate boundary is still sealed');
  explorer.pause();const angle=fence.halves[0].pivot.rotation.y;explorer.tick(.04);assert.equal(fence.halves[0].pivot.rotation.y,angle);explorer.enter();
  // A capture after cutting preserves progress, but confiscates the key.
  const code=clues.code;explorer.capture();explorer.restartPosition();assert(fence.cut&&goal.cuttersClaimed&&clues.codeKnown&&clues.code===code);assert.equal(explorer.inventory.slots.filter(i=>i?.kind==='rearDoorKey').length,route==='door'?1:0,'Easy keeps the back key after capture');
  Object.assign(explorer.player,{x:0,y:-.83,z:-20.7,yaw:0,pitch:0});goal.resetPosition(explorer.player);key('KeyW');
  for(let i=0;i<fps*3&&!explorer.won;i++)explorer.tick(1/fps);
  assert(explorer.won&&explorer.paused&&!explorer.gameOver&&!explorer.captured,'running fully outside triggers the victory result');assert(!pointInPolygon(explorer.player.x,explorer.player.z,map.fenceBoundary));assert.equal(events.length,1);
  assert(controls.get('#escape-caught-title').textContent.includes('胜利'));const position={x:explorer.player.x,y:explorer.player.y,z:explorer.player.z},hp=explorer.player.health;
  explorer.capture();for(let i=0;i<20;i++)explorer.tick(1/fps);assert.equal(events.length,1);assert.equal(explorer.player.health,hp);assert.deepEqual({x:explorer.player.x,y:explorer.player.y,z:explorer.player.z},position);
  setEscapeLanguage('en');explorer.refreshLanguage();assert.equal(controls.get('#escape-caught-title').textContent,'Escaped · Victory');setEscapeLanguage('zh');
  explorer.showMap();explorer.enter();assert(explorer.paused&&controls.get('#escape-caught').open,'map mode cannot resume a won run');explorer.restartPosition();assert.equal(test.reloads,1);
  explorer.showMap();explorer.audio.dispose();goal.dispose();
}

delete globalThis.document;delete globalThis.window;
assert(readFileSync('src/frog-escape-map.js','utf8').includes('runClues,escapeProgress,onMap'));
console.log('Victory OK: Easy carried/dropped retention and Normal/Hard/Hacker carried/dropped/lethal key confiscation without duplication and re-theft; mandatory real note/chest/tool/rear-route steps, actual key-door and shattered-window routes at 30/144 FPS, mouse/touch fence cutting, safe bounded exit floor, cut collider removal, no early win, capture progress retention, one-shot victory, frozen outcome/map/restart and bilingual result.');
