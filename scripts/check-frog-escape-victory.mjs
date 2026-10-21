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

for(const difficulty of ['hard','hacker']) {
  const test=setup({difficulty});assert(test.controls.get('#escape-guide').hidden,'advanced modes never show the guide');
  test.explorer.showMap();test.explorer.audio.dispose();test.map.escapeProgress.dispose();
}

for(const [route,fps,touch,difficulty]of [['door',30,false,'easy'],['window',144,true,'easy'],['door',60,false,'normal'],['window',60,true,'normal']]) {
  const test=setup({difficulty,touch}),{map,explorer,scene,controls,aim,key,right}=test,goal=map.escapeProgress,clues=map.runClues,fence=goal.fence;
  const guide=controls.get('#escape-guide'),task=()=>guide.querySelector('[data-guide-current]').textContent,taskCount=()=>guide.querySelector('[data-guide-count]').textContent;
  assert(!guide.hidden);assert.equal(taskCount(),'0 / 8');assert.equal(task(),'离开地下室');
  key('KeyH');assert(guide.querySelector('details').open);key('KeyH');assert(!guide.querySelector('details').open);
  const chest=map.interactables.find(a=>a.fixtureKind==='chest'),cutters=explorer.worldItems.entries.find(e=>e.item.kind==='boltCutters'),keyItem=clues.keySeed.item;
  assert(!goal.tryCut(cutters.item,new THREE.Vector3(0,.8,-20.8),new THREE.Vector3(0,0,-1),map.navigation));
  // Reading is still available, but it is a suggested task rather than a gate.
  const drawer=clues.noteContainer;drawer.open=true;updateFixtureAction(drawer,2,null,map.navigation);clues.sync();
  const note=clues.paper.getWorldPosition(new THREE.Vector3()),normal=new THREE.Vector3(0,0,1).applyQuaternion(drawer.loot.anchor.getWorldQuaternion(new THREE.Quaternion())),viewer=note.clone().addScaledVector(normal,.62);
  aim(note,{x:viewer.x,y:5.15,z:viewer.z});key('KeyE');assert(clues.codeKnown&&controls.get('#escape-note-dialog').open);
  test.emit(controls.get('#escape-note-dialog'),'cancel');assert(!explorer.paused);
  assert.equal(taskCount(),'2 / 8');assert.equal(task(),'取得工具箱钥匙');
  if(clues.keyContainer){clues.keyContainer.open=true;updateFixtureAction(clues.keyContainer,2,null,map.navigation);clues.sync();explorer.worldItems.tick(1/60);}
  const toolKey=explorer.worldItems.entries.find(e=>e.item.kind==='shedKey');
  const keyPoint=new THREE.Vector3(toolKey.x,toolKey.y,toolKey.z),keyForward=clues.keyContainer?new THREE.Vector3(0,0,1).applyQuaternion(clues.keyContainer.loot.anchor.getWorldQuaternion(new THREE.Quaternion())):new THREE.Vector3(0,0,1);
  for(const distance of [.55,.8,1.05,1.3]){
    const viewer=keyPoint.clone().addScaledVector(keyForward,distance);aim(keyPoint,{x:viewer.x,y:toolKey.y>4?5.15:toolKey.y>0?.15:-5.05,z:viewer.z});
    if(controls.get('#escape-interact').textContent.includes('拾取工具箱钥匙')){key('KeyE');break;}
  }
  assert(explorer.inventory.slots.some(i=>i?.kind==='shedKey'));
  assert.equal(taskCount(),'3 / 8');assert.equal(task(),'前往工具棚，打开工具箱');
  // Dropping a required tool keeps its completed task but gives recovery help.
  if(difficulty==='normal'){
    Object.assign(explorer.player,{x:0,y:-.83,z:13,yaw:0,pitch:0});explorer.tick(.02);const slot=explorer.inventory.slots.findIndex(i=>i?.kind==='shedKey');
    assert(explorer.worldItems.drop(keyItem,explorer.player));explorer.inventory.remove(slot);explorer.tick(.02);
    assert.equal(taskCount(),'3 / 8');assert(guide.querySelector('[data-guide-hint]').textContent.includes('找回'));
    assert(explorer.worldItems.pickup(explorer.worldItems.entries.find(e=>e.item.id===keyItem.id),explorer.inventory));explorer.tick(.02);
  }
  // Entering the real code opens the main door; it remains a repeatable lock.
  const front=map.doors.find(d=>d.id==='front');aim(new THREE.Vector3(front.x,front.y+1.2,front.z),{x:0,y:.15,z:5.6});key('KeyE');controls.get('#escape-code-input').value=clues.code;test.emit(controls.get('#escape-code-form'),'submit');assert(front.open);
  const anchor=chest.anchor.getWorldPosition(new THREE.Vector3());
  aim(anchor,{x:anchor.x,y:-.7,z:anchor.z-1.3});explorer.inventory.select(explorer.inventory.slots.findIndex(i=>i?.kind==='shedKey'));right();assert(!chest.locked&&chest.insertedKey);
  explorer.tick(.02);assert(guide.querySelector('[data-guide-hint]').textContent.includes('钥匙已插好'));
  key('KeyE');for(let i=0;i<fps;i++)explorer.tick(1/fps);assert(chest.content.visible);
  assert.equal(taskCount(),'4 / 8');assert.equal(task(),'拿到箱内的断线钳');
  aim(new THREE.Vector3(cutters.x,cutters.y,cutters.z),{x:cutters.x,y:-.7,z:4.5});key('KeyE');assert(goal.cuttersClaimed,'only the actual chest item grants the tool step');
  assert.equal(taskCount(),'5 / 8');assert.equal(task(),'带上工具进入后院');
  explorer.showMap();assert(guide.hidden);explorer.enter();assert(!guide.hidden);assert.equal(taskCount(),'5 / 8');
  assert.equal(goal.missingStep(explorer.inventory.slots.find(item=>item?.kind==='boltCutters')),null,'tools work without a required order of route milestones');
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
  assert.equal(taskCount(),'6 / 8');assert.equal(task(),'剪开北侧逃生栅栏');
  for(const y of [-.83,.4,2])assert(map.navigation.blocked(0,y,-22.1));
  const slot=explorer.inventory.slots.findIndex(i=>i?.kind==='boltCutters');explorer.inventory.select(slot);
  aim(new THREE.Vector3(0,.3,-22),{x:0,y:-.83,z:-20.7});
  const events=[];scene.addEventListener('escape-victory',e=>events.push(e));
  const count=explorer.worldItems.entries.length;
  const startCut=()=>{if(touch)test.emit(controls.get('#escape-interact'),'click');else right();};
  startCut();assert(goal.cutting&&!fence.cut&&!fence.passable,'using the cutters begins an action rather than unlocking immediately');
  assert(!controls.get('#escape-cut-progress').hidden);
  for(let frame=0;frame<Math.ceil(fps*.4);frame++)explorer.tick(1/fps);
  const elapsed=goal.cutting.elapsed,held=explorer.camera.getObjectByName('prop:boltCutters');assert(held.userData.cutterRig.handles.some(({pivot})=>Math.abs(pivot.rotation.y)>.03),'actual held handles and jaws articulate');
  explorer.pause();const pose=held.position.clone();for(let frame=0;frame<fps;frame++)explorer.tick(1/fps);assert.equal(goal.cutting.elapsed,elapsed);assert(held.position.equals(pose));explorer.enter();
  setEscapeLanguage('en');explorer.refreshLanguage();assert(controls.get('#escape-cut-label').textContent.includes('Cutting fence'));assert.equal(goal.cutting.elapsed,elapsed);setEscapeLanguage('zh');explorer.refreshLanguage();
  explorer.inventory.select((slot+1)%7);explorer.tick(1/fps);assert(!goal.cutting&&!fence.cut);assert(controls.get('#escape-cut-progress').hidden);
  explorer.inventory.select(slot);aim(new THREE.Vector3(0,.3,-22),{x:0,y:-.83,z:-20.7});startCut();for(let frame=0;frame<fps;frame++)explorer.tick(1/fps);
  assert(!fence.joints[0].link.visible&&fence.joints[1].link.visible,'individual connectors break before the final release');
  explorer.showMap();assert(!goal.cutting&&!fence.cut&&fence.joints.every(j=>j.link.visible));explorer.enter();
  aim(new THREE.Vector3(0,.3,-22),{x:0,y:-.83,z:-20.7});startCut();explorer.capture();assert(!goal.cutting&&!fence.cut);explorer.restartPosition();
  aim(new THREE.Vector3(0,.3,-22),{x:0,y:-.83,z:-20.7});startCut();
  const snips=[],releases=[];scene.addEventListener('escape-fence-snip',event=>snips.push(event));scene.addEventListener('escape-fence-cut',event=>releases.push(event));
  const beforeCut={x:explorer.player.x,z:explorer.player.z};key('KeyW');key('Space');
  for(let frame=0;frame<Math.ceil(2.5*fps)-1;frame++)explorer.tick(1/fps);
  assert(goal.cutting&&!fence.cut&&!explorer.won,'the full 2.5 seconds are required');assert.deepEqual({x:explorer.player.x,z:explorer.player.z},beforeCut,'cutting stays planted even while move/jump are pressed');
  assert(map.navigation.blocked(0,-.83,-22.1));assert.equal(taskCount(),'6 / 8');
  explorer.tick(1/fps);test.emit(document,'keyup',{code:'KeyW'});
  assert(fence.cut&&!explorer.won,'cutting alone never grants victory');assert.equal(explorer.worldItems.entries.length,count,'right-click uses the tool instead of throwing it');assert(explorer.inventory.slots[slot]);
  assert(!goal.cutting&&!fence.passable&&map.navigation.blocked(0,-.83,-22.1),'closed-looking panels still block the passage until they bend apart');
  assert.equal(snips.length,2);assert.equal(releases.length,1);assert(fence.joints.every(j=>!j.link.visible&&j.ends.every(end=>end.visible)));
  for(let frame=0;frame<fps;frame++)explorer.tick(1/fps);
  assert(fence.passable&&fence.halves.every(({pivot})=>Math.abs(pivot.rotation.y)>1&&Math.abs(pivot.rotation.z)>.08),'the severed panels bend, lean and leave a real gap');
  assert.equal(guide.querySelector('[data-guide-count]').textContent,'7 / 8');assert.equal(task(),'穿过缺口，逃离古堡');
  assert(map.navigation.solids.filter(s=>fence.colliders.includes(s)).every(s=>!s.enabled()),'all cut-panel colliders are disabled');
  assert(!map.navigation.blocked(0,-.83,-22.2));assert(map.navigation.blocked(1.5,-.83,-22.3));assert(map.navigation.blocked(0,-.83,24.1),'the rest of the estate boundary is still sealed');
  explorer.pause();const angle=fence.halves[0].pivot.rotation.y;explorer.tick(.04);assert.equal(fence.halves[0].pivot.rotation.y,angle);explorer.enter();
  // A capture after cutting preserves progress, but confiscates the key.
  const code=clues.code;explorer.capture();explorer.restartPosition();assert(fence.cut&&goal.cuttersClaimed&&clues.codeKnown&&clues.code===code);assert.equal(explorer.inventory.slots.filter(i=>i?.kind==='rearDoorKey').length,route==='door'&&difficulty==='easy'?1:0,'only Easy keeps the back key after capture');
  assert.equal(guide.querySelector('[data-guide-count]').textContent,'7 / 8');
  Object.assign(explorer.player,{x:0,y:-.83,z:-20.7,yaw:0,pitch:0});goal.resetPosition(explorer.player);key('KeyW');
  for(let i=0;i<fps*3&&!explorer.won;i++)explorer.tick(1/fps);
  assert(explorer.won&&explorer.paused&&!explorer.gameOver&&!explorer.captured,'running fully outside triggers the victory result');assert(!pointInPolygon(explorer.player.x,explorer.player.z,map.fenceBoundary));assert.equal(events.length,1);
  assert(controls.get('#escape-caught-title').textContent.includes('胜利'));const position={x:explorer.player.x,y:explorer.player.y,z:explorer.player.z},hp=explorer.player.health;
  assert.equal(guide.querySelector('[data-guide-count]').textContent,'8 / 8');assert.equal(task(),'全部任务已完成');
  explorer.capture();for(let i=0;i<20;i++)explorer.tick(1/fps);assert.equal(events.length,1);assert.equal(explorer.player.health,hp);assert.deepEqual({x:explorer.player.x,y:explorer.player.y,z:explorer.player.z},position);
  setEscapeLanguage('en');explorer.refreshLanguage();assert.equal(controls.get('#escape-caught-title').textContent,'Escaped · Victory');assert.equal(task(),'All tasks completed');assert(!/\p{Script=Han}/u.test(guide.querySelector('[data-guide-list]').innerHTML));setEscapeLanguage('zh');
  explorer.showMap();explorer.enter();assert(explorer.paused&&controls.get('#escape-caught').open,'map mode cannot resume a won run');explorer.restartPosition();assert.equal(test.reloads,1);
  explorer.showMap();explorer.audio.dispose();goal.dispose();
}

// A player can explore the back yard first, guess the door code, collect the
// tools later and win without ever reading the note or repeating the route.
for(const difficulty of ['easy','normal','hard','hacker']) {
  const test=setup({difficulty}),{explorer,map,controls,aim,key,right}=test,clues=map.runClues,goal=map.escapeProgress;
  aim(new THREE.Vector3(0,.3,-22),{x:0,y:-.83,z:-10});assert.equal(goal.rearRoute,'yard');
  const guide=controls.get('#escape-guide');
  if(difficulty==='easy'||difficulty==='normal'){
    assert.equal(guide.querySelector('[data-guide-current]').textContent,'剪开北侧逃生栅栏');
    assert(guide.querySelector('[data-guide-list]').innerHTML.includes('已跳过'));
  }
  const front=clues.frontDoor;aim(new THREE.Vector3(front.x,front.y+1.2,front.z),{x:0,y:.15,z:5.6});key('KeyE');
  controls.get('#escape-code-input').value=clues.code;test.emit(controls.get('#escape-code-form'),'submit');
  assert(front.open&&clues.codeSolved&&!clues.codeKnown,'a correct guess is accepted without fabricating a note visit');
  if(clues.keyContainer){clues.keyContainer.open=true;updateFixtureAction(clues.keyContainer,2,null,map.navigation);clues.sync();explorer.worldItems.tick(.02);}
  assert(explorer.worldItems.pickup(explorer.worldItems.entries.find(e=>e.item.kind==='shedKey'),explorer.inventory));
  const chest=map.interactables.find(a=>a.fixtureKind==='chest'),point=chest.anchor.getWorldPosition(new THREE.Vector3());
  aim(point,{x:point.x,y:-.7,z:point.z-1.3});explorer.inventory.select(explorer.inventory.slots.findIndex(item=>item?.kind==='shedKey'));right();assert(!chest.locked&&chest.insertedKey,'the chest no longer requires reading the note');
  key('KeyE');for(let i=0;i<60;i++)explorer.tick(1/60);
  assert(explorer.worldItems.pickup(explorer.worldItems.entries.find(e=>e.item.kind==='boltCutters'),explorer.inventory));
  explorer.inventory.select(explorer.inventory.slots.findIndex(item=>item?.kind==='boltCutters'));
  aim(new THREE.Vector3(0,.3,-22),{x:0,y:-.83,z:-20.7});right();assert(goal.cutting);
  for(let i=0;i<210;i++)explorer.tick(1/60);assert(goal.fence.cut&&goal.fence.passable&&!clues.codeKnown);
  key('KeyW');for(let i=0;i<180&&!explorer.won;i++)explorer.tick(1/60);assert(explorer.won,'out-of-order exploration and an unread note cannot block the real exit');
  explorer.showMap();explorer.audio.dispose();goal.dispose();
}

delete globalThis.document;delete globalThis.window;
assert(readFileSync('src/frog-escape-map.js','utf8').includes('runClues,escapeProgress,onMap'));
console.log('Victory/guide/cutting OK: real Easy/Normal door/window routes at 30/60/144 FPS, mouse/touch, full 2.5-second articulated tool action, planted movement, paused pose/time, bilingual progress, item/map/capture cancellation, staged connector damage, delayed passable gap, bending panels and frozen pause; eight tasks, recovery hints, capture/key rules, exit-only one-shot victory and restart.');
