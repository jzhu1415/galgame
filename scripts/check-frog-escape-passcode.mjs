import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {createInventory} from '../src/frog-escape-inventory.js';
import {createPlayer} from '../src/frog-escape-navigation.js';
import {updateCastleDoor} from '../src/frog-escape-doors.js';
import {updateFixtureAction} from '../src/frog-escape-interactions.js';
import {createPursuitPathfinder} from '../src/frog-escape-pursuit-path.js';
import {setEscapeLanguage} from '../src/frog-escape-i18n.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createRunClues,MEMORABLE_FRONT_DOOR_CODES} from '../src/frog-escape-run-clues.js';

// Cover every friendly code, difficulty changes before play and the actual
// canvas print. Hard/Hacker must still reach both ends of the original range.
assert.equal(new Set(MEMORABLE_FRONT_DOOR_CODES).size,MEMORABLE_FRONT_DOOR_CODES.length);
for(const code of MEMORABLE_FRONT_DOOR_CODES)assert(/^(\d)\1(\d)\2$/.test(code)||/^(\d\d)\1$/.test(code)||[...code].slice(1).every((digit,i)=>Number(digit)-Number(code[i])===1)||[...code].slice(1).every((digit,i)=>Number(digit)-Number(code[i])===-1));
const printed=[];
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(value){printed.push(value);}})})};
for(let i=0;i<MEMORABLE_FRONT_DOOR_CODES.length;i++) {
  const root=new THREE.Group(),key=new THREE.Group();root.add(key);
  const actions=[0,1,2].map((n)=>{const anchor=new THREE.Group();root.add(anchor);return {id:String(n),amount:0,loot:{anchor,room:n===0?'master-bedroom':'kitchen'}};});
  const seed={mesh:key,item:{kind:'shedKey',size:[.1,.1,.1]}};
  let draws=0;const roll=(i+.1)/MEMORABLE_FRONT_DOOR_CODES.length;
  const run=createRunClues({seeds:[seed],actions,frontDoor:{},random:()=>{draws++;return roll;},difficulty:'easy'});
  assert.equal(run.code,MEMORABLE_FRONT_DOOR_CODES[i]);assert.equal(printed.at(-1),run.code);
  run.configureDifficulty('normal');const keyContainer=run.keyContainer,noteContainer=run.noteContainer,drawsBefore=draws;
  for(const difficulty of ['hard','hacker','normal','easy','normal']) {
    run.configureDifficulty(difficulty);
    assert.equal(run.code,difficulty==='easy'||difficulty==='normal'?MEMORABLE_FRONT_DOOR_CODES[i]:String(Math.floor(roll*10000)).padStart(4,'0'));
    assert.equal(printed.at(-1),run.code,'printed paper uses the selected difficulty code');
    assert.equal(run.noteContainer,noteContainer);
  }
  assert.equal(draws,drawsBefore+1,'switching out of Easy only redraws the key location, never the code');
  assert(keyContainer);const frozenCode=run.code;run.beginRun();assert.equal(run.configureDifficulty('hard'),false);assert.equal(run.code,frozenCode);
}
delete globalThis.document;

const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false,random:()=>0,difficulty:'hard'});
const clues=castle.runClues,front=clues.frontDoor;
assert.equal(clues.code,'0000');assert.equal(clues.noteContainer.loot.room,'master-bedroom');
const chooseIndex=i=>{let call=0;return ()=>++call===1?.99999:call===2?0:(i+.1)/(clues.containers.length-1);};
// Cover every valid randomized compartment, with real movable colliders and pickup rays.
const locations=new Set();
for(let i=0;i<clues.containers.length-1;i++) {
  const scene=new THREE.Scene(),map=createEscapeScene(scene,{labels:false,random:chooseIndex(i),difficulty:'hard'}),run=map.runClues,container=run.keyContainer;
  assert.equal(run.code,'9999');assert.notEqual(container,run.noteContainer);locations.add(container.id);
  assert.equal(map.pickupSeeds.filter(seed=>seed.item.kind==='shedKey').length,1);
  const items=createWorldItems(scene,map.navigation,map.pickupSeeds),entry=items.entries.find(e=>e.item.kind==='shedKey'),bag=createInventory();
  assert(!items.pickup(entry,bag),'closed compartments conceal the key');
  container.open=true;updateFixtureAction(container,2,null,map.navigation);run.sync();items.tick(1/60);
  const point=entry.mesh.getWorldPosition(new THREE.Vector3());assert(point.distanceTo(new THREE.Vector3(entry.x,entry.y,entry.z))<1e-5,'body follows the moving drawer');
  const forward=new THREE.Vector3(0,0,1).applyQuaternion(container.loot.anchor.getWorldQuaternion(new THREE.Quaternion()));
  let reachable=false;
  // A drawer can be looked down into; a lower cabinet can be reached while crouching.
  for(const eye of [.9,1.58])for(const distance of [.55,.8,1.05,1.3]) {
    const origin=point.clone().addScaledVector(forward,distance);origin.y=(point.y>5?5.15:.15)+eye;
    const direction=point.clone().sub(origin).normalize();
    if(items.nearby({x:origin.x,y:origin.y,z:origin.z},direction,0)===entry)reachable=true;
  }
  assert(reachable,`key is reachable in actual open compartment ${container.id}`);
  assert(items.pickup(entry,bag));assert.equal(bag.slots.filter(item=>item?.kind==='shedKey').length,1);assert(!items.pickup(entry,bag));
}
assert.equal(locations.size,clues.containers.length-1);
for(let i=0;i<4;i++) {
  let call=0;const map=createEscapeScene(new THREE.Scene(),{labels:false,random:()=>++call===2?(i+.1)/4:0}),run=map.runClues,container=run.noteContainer;
  const forward=new THREE.Vector3(0,0,1).applyQuaternion(container.loot.anchor.getWorldQuaternion(new THREE.Quaternion()));
  container.open=true;updateFixtureAction(container,2,null,map.navigation);run.sync();
  const point=run.paper.getWorldPosition(new THREE.Vector3()),origin=point.clone().addScaledVector(forward,.62);origin.y=5.15+1.58;
  const direction=point.clone().sub(origin).normalize();assert(run.nearbyNote(origin,direction,map.navigation),`readable note in ${container.id}`);
  container.open=false;updateFixtureAction(container,2,null,map.navigation);run.sync();assert(!run.nearbyNote(origin,direction,map.navigation),'closed drawer conceals the code note');
}
for(const difficulty of ['easy','normal','hard','hacker']) {
  clues.configureDifficulty(difficulty);assert.equal(clues.keyContainer===null,difficulty==='easy');
  if(difficulty==='easy')assert.equal(clues.keySeed.mesh.parent.name,'fixture:toilet');
  else assert.notEqual(clues.keyContainer,clues.noteContainer);
  assert.equal(clues.code,difficulty==='easy'||difficulty==='normal'?'2233':'0000');
}
clues.beginRun();assert.equal(clues.configureDifficulty('easy'),false);
assert(!clues.submit('0'));assert(!clues.submit('1234'));assert(!front.open);assert(clues.submit('0000'));
for(const fps of [30,60,144]) {
  front.open=false;front.amount=0;front.autoCloseWasOpen=false;
  assert(clues.submit('0000'));
  for(let i=0;i<fps*4;i++)updateCastleDoor(front,1/fps,null,castle.navigation);
  assert(front.open&&front.amount>.99,'door remains open before its deadline');
  for(let i=0;i<fps*3;i++)updateCastleDoor(front,1/fps,null,castle.navigation);
  assert(!front.open&&front.amount<.001,'door shuts automatically');
  assert(!clues.submit('0010')&&!front.open,'a previous success never permanently unlocks the next opening');
}
// Automatic closing respects a body standing in a leaf sweep.
front.open=false;front.amount=0;front.autoCloseWasOpen=false;clues.submit('0000');
for(let i=0;i<90;i++)updateCastleDoor(front,1/60,null,castle.navigation);
const blocker={...createPlayer(),x:front.x+.7,y:front.y,z:front.z+.25};
for(let i=0;i<420;i++)updateCastleDoor(front,1/60,blocker,castle.navigation);
assert(front.blocked&&front.amount>0,'automatic closing cannot clip a player');
for(let i=0;i<120;i++)updateCastleDoor(front,1/60,null,castle.navigation);
assert(front.amount<.001,'it finishes closing after the body leaves');
// The partition is continuous, and leaves the actual shed on the larger front side.
assert(castle.yardDivider.z<0&&4>castle.yardDivider.z);
for(const [left,right] of castle.yardDivider.segments)for(let x=left+.15;x<right;x+=.14)assert(castle.navigation.blocked(x,-.83,-4,false,2.1,.4),`no gap in divider at ${x}`);
const finder=createPursuitPathfinder(castle.navigation),route=finder.findPath({x:15,y:-.83,z:0},{x:15,y:-.83,z:-9});
assert(route.length>0,'Naiwa can route from front yard to rear through the house');
assert(route.some(p=>Math.abs(p.x)<11&&p.y>-.5),'route passes through the house rather than the fence');
for(const fromOutside of [false,true]) {
  front.open=false;front.amount=0;front.autoCloseWasOpen=false;updateCastleDoor(front,0,null,castle.navigation);
  const spawn={x:0,y:fromOutside?-.83:.15,z:fromOutside?12:5.7},target={x:0,y:fromOutside?.15:-.83,z:fromOutside?5.7:12};
  const player={...createPlayer(),hidden:true},npc=createNaiwaPursuer({scene,navigation:castle.navigation,doors:castle.doors,player,spawn,patrolRoute:[target],worldItems:{physics:{addActor:()=>({remove(){}}),syncActors(){}}},random:()=>.99});
  let opened=false,reached=false;
  for(let frame=0;frame<900;frame++) {
    updateCastleDoor(front,.04,[player,npc.actor],castle.navigation);npc.tick(.04);opened||=front.open;
    if(Math.hypot(npc.actor.x-target.x,npc.actor.z-target.z)<.75&&Math.abs(npc.actor.y-target.y)<.3)reached=true;
    if(reached&&!front.open&&front.amount<.01)break;
  }
  assert(opened&&reached&&!front.open,`Naiwa bypass: ${JSON.stringify({fromOutside,opened,reached,x:npc.actor.x,y:npc.actor.y,z:npc.actor.z,state:npc.state,open:front.open,amount:front.amount,blocked:front.blocked,path:npc.path.slice(0,3)})}`);npc.dispose();
}

class Control extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.children=new Map();this.attributes={};this.open=false;this.hidden=false;this.value='';this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(key,value){this.attributes[key]=value;}closest(){return null;}focus(){document.activeElement=this;}setPointerCapture(){}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}
  showModal(){this.open=true;}close(){this.open=false;}getBoundingClientRect(){return {left:10,top:10,right:400,bottom:500};}
}
const controls=new Map(),bag=Array.from({length:7},()=>new Control()),digits=Array.from({length:10},(_,i)=>Object.assign(new Control(),{dataset:{codeDigit:String(i)}}));
globalThis.document=new Control();document.hidden=false;document.querySelector=key=>{if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};document.querySelectorAll=key=>key==='[data-code-digit]'?digits:bag;
globalThis.window=new Control();window.matchMedia=()=>({matches:false});
const canvas=new Control();canvas.requestPointerLock=()=>{document.pointerLockElement=canvas;document.dispatchEvent(new Event('pointerlockchange'));return Promise.resolve();};document.exitPointerLock=()=>{document.pointerLockElement=null;document.dispatchEvent(new Event('pointerlockchange'));};
const uiScene=new THREE.Scene(),map=createEscapeScene(uiScene,{labels:false,random:()=>.0007});
const explorer=createEscapeExplorer({scene:uiScene,canvas,stage:new Control(),status:new Control(),...map,onMap(){}});explorer.enter();
function emit(target,type,props={}){const event=new Event(type,{cancelable:true});for(const [key,value]of Object.entries(props))Object.defineProperty(event,key,{value});target.dispatchEvent(event);return event;}
const key=code=>emit(document,'keydown',{code});
function aim(point,position) {
  const v=point.clone().sub(new THREE.Vector3(position.x,position.y+1.58,position.z)).normalize();
  Object.assign(explorer.player,position,{yaw:Math.atan2(-v.x,-v.z),pitch:Math.asin(v.y)});explorer.tick(.02);
}
for(const side of [-1,1]) {
  const door=map.runClues.frontDoor;
  aim(new THREE.Vector3(door.x,door.y+1.2,door.z),{x:0,y:.15,z:door.z+side*1.8});
  assert(controls.get('#escape-interact').textContent.includes('输入大门密码'));
  key('KeyE');assert(explorer.paused&&controls.get('#escape-code-dialog').open);
  const input=controls.get('#escape-code-input');input.value='1234';emit(controls.get('#escape-code-form'),'submit');assert(!door.open&&controls.get('#escape-code-error').textContent.includes('错误'));
  input.value='abc007xyz';emit(input,'input');assert.equal(input.value,'007');emit(controls.get('#escape-code-form'),'submit');assert(!door.open);
  input.value='';for(const digit of map.runClues.code)emit(digits[Number(digit)],'click');assert.equal(input.value,'2233');
  emit(controls.get('#escape-code-form'),'submit');assert(door.open&&!explorer.paused&&!controls.get('#escape-code-dialog').open);
  // Opening from the other side still requires a new code after automatic closure.
  Object.assign(explorer.player,{x:0,y:-5.05,z:4});for(let i=0;i<420;i++)explorer.tick(1/60);assert(!door.open);
}
const note=map.runClues.noteContainer;note.open=true;updateFixtureAction(note,2,null,map.navigation);map.runClues.sync();
const notePoint=map.runClues.paper.getWorldPosition(new THREE.Vector3()),forward=new THREE.Vector3(0,0,1).applyQuaternion(note.loot.anchor.getWorldQuaternion(new THREE.Quaternion()));
const viewer=notePoint.clone().addScaledVector(forward,.62);aim(notePoint,{x:viewer.x,y:5.15,z:viewer.z});
assert(controls.get('#escape-interact').textContent.includes('放大查看'),`actual E target for ${note.id}: ${controls.get('#escape-interact').textContent}`);
key('KeyE');assert(controls.get('#escape-note-dialog').open&&explorer.paused);assert.equal(controls.get('#escape-note-code').textContent,'2233');
const hp=explorer.player.health,code=map.runClues.code;setEscapeLanguage('en');explorer.refreshLanguage();assert.equal(map.runClues.code,code);assert.equal(explorer.player.health,hp);
emit(controls.get('#escape-note-dialog'),'cancel');assert(!explorer.paused&&document.activeElement===canvas);
explorer.showMap();explorer.enter();assert.equal(map.runClues.code,code);assert.equal(explorer.setDifficulty('easy'),false);
// Aiming away while near the door does not expose the keypad prompt.
Object.assign(explorer.player,{x:0,y:.15,z:8.5,yaw:Math.PI,pitch:0});explorer.tick(.02);assert(!controls.get('#escape-interact').textContent.includes('Enter front door code'));
const containerBefore=map.runClues.keyContainer,noteBefore=map.runClues.noteContainer;explorer.capture();explorer.restartPosition();assert.equal(map.runClues.code,code);assert.equal(map.runClues.keyContainer,containerBefore);assert.equal(map.runClues.noteContainer,noteBefore);
explorer.showMap();explorer.audio.dispose();delete globalThis.document;delete globalThis.window;
const source=readFileSync('src/frog-escape-map.js','utf8');assert(source.includes('beds,runClues,escapeProgress,onMap'),'the real entry passes run clues to the explorer');
const html=readFileSync('frog-escape-map.html','utf8'),gateCopy=html.slice(html.indexOf('id="escape-code-dialog"'),html.indexOf('id="escape-note-dialog"'));
assert(gateCopy.includes('二楼有线索')&&!/主卧|床头|柜子/.test(gateCopy),'the gate only hints that the clue is upstairs');
console.log('Passcode/yard OK: every memorable Easy/Normal code and canvas print, unchanged Hard/Hacker range, stable difficulty/run clues, every random loot slot physically reachable, Easy toilet, no note/key overlap, code required on both sides, input and keypad, note E zoom, modal pause/focus/locale, safe auto-close at 30/60/144 FPS and continuous yard fences.');
