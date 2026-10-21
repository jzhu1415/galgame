import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as THREE from 'three';
import {tr,escapeEnglish,setEscapeLanguage,escapeLanguage,initEscapeLanguage,bindEscapeDocument} from '../src/frog-escape-i18n.js';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createNavigation,createPlayer} from '../src/frog-escape-navigation.js';
import {ESCAPE_DIFFICULTIES,difficultyRules,displayAlertness,damagePlayer} from '../src/frog-escape-vitals.js';
import {propTypes} from '../src/frog-escape-props.js';

const han=/\p{Script=Han}/u,english=source=>assert(!han.test(tr(source,{},'en')),`Missing English: ${source}`);
const html=readFileSync('frog-escape-map.html','utf8');
for(const source of [...html.matchAll(/>([^<>]+)</g)].map(m=>m[1].trim()).concat([...html.matchAll(/(?:aria-label|content)="([^"]*)"/g)].map(m=>m[1])))if(han.test(source))english(source);
for(const [zh,en]of Object.entries(escapeEnglish)) {
  assert(!han.test(en),`English dictionary contains Chinese: ${zh}`);
  const keys=text=>[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
  assert.deepEqual(keys(en),keys(zh),`Translation preserves all template fields: ${zh}`);
}
// Parse source literals and exercise actual generated fixture names as well.
for(const name of ['explorer','pursuer','scene','props','items','objectives','hiding','vitals','map','run-clues','clue-dialogs','victory','stamina','transparent','quality','fullscreen','guide','cutting']) {
  const file=ts.createSourceFile(name,readFileSync(`src/frog-escape-${name}.js`,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  function visit(node){if(ts.isStringLiteralLike(node)&&han.test(node.text)&&!['中文','切换为中文'].includes(node.text))english(node.text);ts.forEachChild(node,visit);}visit(file);
}
const reference=createEscapeScene(new THREE.Scene(),{labels:false});
for(const item of Object.values(propTypes))english(item.name);
for(const item of [...reference.interactables,...reference.doors,...reference.pickupSeeds.map(seed=>seed.item),...reference.breakables])english(item.name);
assert.equal(tr('未开智',{},'en'),'Fool');assert.equal(tr('已开智',{},'en'),'Nerd');assert.equal(tr('唐王模式',{},'en'),'Ninja');
assert.deepEqual(Object.values(ESCAPE_DIFFICULTIES).map(rule=>rule.captureDamage),[20,30,50,100,100]);assert.equal(difficultyRules('unknown').captureDamage,30);
assert.deepEqual(Object.values(ESCAPE_DIFFICULTIES).map(rule=>rule.initialAlertness),[0,10,30,100,70]);

const storage=new Map([['story-progress','do not touch']]),writes=[];
Object.defineProperty(globalThis,'localStorage',{configurable:true,writable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>{storage.set(key,value);writes.push(key);}}});
// Text-node localization preserves identity/listeners, whitespace and attributes.
const label={nodeValue:'  生命值\n',parentElement:{closest:()=>false}},attr={value:'地图楼层',getAttribute(key){return key==='aria-label'?this.value:null;},setAttribute(key,value){if(key==='aria-label')this.value=value;}};
globalThis.document={documentElement:{lang:''},createTreeWalker:()=>({currentNode:null,nextNode(){if(this.currentNode)return false;this.currentNode=label;return true;}}),querySelectorAll:()=>[attr]};
const unbind=bindEscapeDocument();setEscapeLanguage('en');assert.equal(label.nodeValue,'  Health\n');assert.equal(attr.value,'Map floors');assert.equal(document.documentElement.lang,'en');setEscapeLanguage('zh');assert.equal(label.nodeValue,'  生命值\n');unbind();
storage.set('naiwa-language-override-v1','en');assert.equal(initEscapeLanguage(),'en');setEscapeLanguage('zh');assert.equal(storage.get('naiwa-language-override-v1'),'zh');

class Control extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.open=false;this.hidden=false;this.attributes={};this.children=new Map();this.classList={add(){},remove(){},toggle(){}};this.textContent='';}
  setAttribute(key,value){this.attributes[key]=value;}
  closest(){return null;}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}
  focus(){document.activeElement=this;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  setPointerCapture(){}
}
const boundary=[[-40,-40],[40,-40],[40,40],[-40,40]];
function setup(mode) {
  const controls=new Map(),slots=Array.from({length:7},()=>new Control());globalThis.document=new Control();
  document.querySelector=key=>{if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};document.querySelectorAll=()=>slots;document.hidden=false;
  globalThis.window=new Control();window.matchMedia=()=>({matches:false});let reloads=0;window.location={reload(){reloads++;}};
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),canvas=new Control(),status=new Control();canvas.requestPointerLock=()=>Promise.resolve();
  const groups={labels:new THREE.Group(),basement:new THREE.Group()},roof=new THREE.Group(),playerPin=new THREE.Object3D();scene.add(playerPin);
  const explorer=createEscapeExplorer({scene,canvas,status,stage:new Control(),groups,roof,navigation,playerPin,doors:[],onMap(){}});
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:explorer.worldItems,player:explorer.player,onCatch:()=>explorer.capture(),random:()=>.99});explorer.setPursuer(npc);
  if(mode)assert(explorer.setDifficulty(mode));
  return {explorer,npc,controls,slots,status,reloads:()=>reloads};
}
for(const [mode,damage]of [['easy',20],['normal',30],['hard',50],['hacker',100],['gunmu',100]]) {
  const {explorer,npc,controls,slots,status,reloads}=setup(mode);
  assert.equal(explorer.difficulty,mode);assert.equal(controls.get('#escape-difficulty').value,mode);assert.equal(controls.get('#escape-pause-difficulty').value,mode);
  assert.equal(npc.alertness,difficultyRules(mode).initialAlertness,'difficulty configures the actual opening alertness');
  explorer.refreshLanguage();assert.equal(controls.get('#escape-alertness-value').textContent,String(displayAlertness(difficultyRules(mode).initialAlertness,mode)),'the live HUD uses the selected difficulty’s displayed opening alertness');
  assert.equal(controls.get('#escape-capture-rule').textContent,tr(mode==='gunmu'?'被抓基础扣血 {damage}；警觉固定为 {alertness}。':'被抓基础扣血 {damage}；开局警觉 {alertness}。醒来后警觉 -10。',{damage,alertness:displayAlertness(difficultyRules(mode).initialAlertness,mode)}),'the rule text displays the same opening value');
  explorer.enter();for(let i=0;npc.alertness<70&&i<20;i++){npc.hit({damage:.0001});for(let frame=0;frame<7;frame++)npc.tick(.05);}assert(npc.alertness>=70);npc.reset({keepAlertness:true});const startingAlertness=npc.alertness;
  if(mode==='normal') {
    const event=new Event('keydown',{cancelable:true});Object.defineProperties(event,{code:{value:'Space'},target:{value:{closest:selector=>selector.includes('select')?{}:null}}});
    document.dispatchEvent(event);assert(explorer.player.grounded&&explorer.player.velocityY===0&&!event.defaultPrevented,'difficulty controls keep native keyboard input instead of making the player jump');
  }
  const item=explorer.inventory.slots[0];item.on=false;
  Object.assign(explorer.player,{x:2,y:.15,z:3});explorer.capture();
  assert.equal(explorer.player.health,100-damage);assert(explorer.paused&&explorer.captured);assert.equal(npc.alertness,startingAlertness,'no alertness reward before waking');
  explorer.capture();assert.equal(explorer.player.health,100-damage,'duplicate capture callbacks do not charge again');
  const position={x:explorer.player.x,y:explorer.player.y,z:explorer.player.z};
  setEscapeLanguage('en');explorer.refreshLanguage();
  assert.equal(slots[0].querySelector('[data-item-name]').textContent,'Flashlight');assert.equal(slots[0].attributes['aria-label'],'Inventory slot 1: Flashlight');
  assert(!han.test(controls.get('#escape-caught-description').textContent));assert(!han.test(controls.get('#escape-alertness-phase').textContent));
  assert.equal(controls.get('#escape-difficulty-status').textContent,`${difficultyRules(mode).en} · Caught: −${damage} HP`);
  assert.equal(status.textContent,'');assert(status.hidden,'floor/free-exploration labels stay absent while playing');
  assert.deepEqual({x:explorer.player.x,y:explorer.player.y,z:explorer.player.z},position,'language changes preserve position');assert.equal(explorer.inventory.slots[0],item);assert.equal(item.on,false);assert.equal(npc.alertness,startingAlertness);assert.equal(explorer.player.health,100-damage);
  setEscapeLanguage('zh');explorer.refreshLanguage();assert.equal(slots[0].querySelector('[data-item-name]').textContent,'手电筒');
  explorer.showMap();explorer.enter();assert(explorer.paused&&explorer.captured,'map and language controls cannot bypass capture');
  if(mode==='hacker'||mode==='gunmu') {
    assert(explorer.gameOver);explorer.restartPosition();assert.equal(reloads(),1);assert.equal(npc.alertness,startingAlertness,'a lethal capture does not produce a wake-up');
  }else {
    assert.equal(explorer.player.x,-6.25);assert.equal(explorer.player.y,-5.05);assert.equal(npc.alertness,startingAlertness);
    explorer.restartPosition();assert.equal(npc.alertness,startingAlertness-10);assert.equal(explorer.player.health,100-damage);assert.equal(explorer.inventory.slots[0],item);
    explorer.restartPosition();assert.equal(npc.alertness,startingAlertness-10,'manual reset cannot repeat the ten-point reduction');
    if(mode==='easy') {
      for(let i=0;i<3;i++){explorer.capture();explorer.restartPosition();}assert.equal(explorer.player.health,20);assert.equal(npc.alertness,startingAlertness-40);
      explorer.capture();assert(explorer.gameOver);assert.equal(explorer.player.health,0,'Easy also ends the game when health runs out');
    }
  }
  assert(!explorer.setDifficulty('invalid'));assert.equal(explorer.difficulty,mode);npc.dispose();
}
for(const [mode,opening]of [['easy',0],['normal',10],['hard',30],['hacker',100],['gunmu',70]]) {
  storage.set('naiwa-escape-difficulty-v1',mode);const {explorer,npc,controls,reloads}=setup();assert.equal(explorer.difficulty,mode,'difficulty survives reloads');assert.equal(npc.alertness,opening,'a new run restores the saved difficulty’s opening alertness');
  explorer.enter();assert.equal(controls.get('#escape-alertness-value').textContent,String(displayAlertness(opening,mode)));explorer.showMap();explorer.enter();explorer.pause();assert.equal(npc.alertness,opening,'pause, map and resume preserve opening alertness');
  const restart=controls.get('#escape-pause-new-run');restart.dispatchEvent(new Event('click'));assert.equal(reloads(),1,'new run requests a complete reload');npc.dispose();
}
storage.set('naiwa-escape-difficulty-v1','bad');{const {explorer,npc}=setup();assert.equal(explorer.difficulty,'normal','invalid old preferences safely use Normal');npc.dispose();}
{
  const {explorer,npc,controls}=setup('gunmu');
  for(const locale of ['en','zh','en','zh']) {
    setEscapeLanguage(locale);explorer.refreshLanguage();
    for(const selector of ['#escape-difficulty','#escape-pause-difficulty'])assert.equal(controls.get(selector).querySelector('option[value="gunmu"]').textContent,locale==='en'?'???':'\u3000\u3000模式（???）','language changes preserve the exact missing mode name');
    assert.equal(controls.get('#escape-alertness-phase').textContent,locale==='en'?'Invisibility':'滚木模式','the mode status has its own localized name');
    assert.equal(controls.get('#escape-alertness-value').textContent,'6767');assert.equal(controls.get('#escape-vitals').dataset.phase,'tangwang');
  }
  explorer.enter();explorer.player.effects={milk:30};explorer.capture();
  assert.equal(explorer.player.health,50);assert(!explorer.gameOver);assert(controls.get('#escape-caught-description').textContent.includes('6767'));
  explorer.restartPosition();assert.equal(npc.alertness,70);assert.equal(controls.get('#escape-alertness-value').textContent,'6767');assert(!npc.model.root.visible);
  npc.hit({damage:1,source:'door'});explorer.refreshLanguage();assert.equal(controls.get('#escape-alertness-value').textContent,'6767');npc.dispose();
}
// Blocked storage must still allow live choices, capture, waking and language.
globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
{const {explorer,npc,controls}=setup('easy');setEscapeLanguage('en');explorer.refreshLanguage();assert.equal(npc.alertness,0);assert.equal(controls.get('#escape-alertness-value').textContent,'0');explorer.enter();explorer.capture();assert.equal(explorer.player.health,80);explorer.restartPosition();assert.equal(npc.alertness,0,'wake reduction clamps at zero');npc.dispose();}
assert.equal(storage.get('story-progress'),'do not touch');assert(writes.every(key=>['naiwa-language-override-v1','naiwa-escape-difficulty-v1'].includes(key)),'preferences never write story saves');
setEscapeLanguage('zh');
// The former interior cubes are gone. Every trim vertex stays outside at least
// one outer wall face (allowing a 3 mm contact overlap), including all floors.
const trims=[];reference.groups.ground.parent.traverse(mesh=>{if(mesh.name==='castle:exterior-corner-trim')trims.push(mesh);});assert.equal(trims.length,24);
for(const trim of trims) {
  const box=new THREE.Box3().setFromObject(trim),sx=trim.parent.scale.x;
  assert(box.min.x>(9.07-.003)*sx||box.max.x<-(9.07-.003)*sx||box.min.z>7.07-.003||box.max.z<-(7.07-.003),'corner trim never protrudes into a room');
  assert.equal(trim.userData.solid,false,'decorative trim adds no invisible collision');
}
// Exercise the authored map's actual label redraw without a browser renderer.
const painted=[];
document.createElement=()=>({width:0,height:0,getContext(){return {
  font:'48px sans-serif',fillRect(){},strokeRect(){},beginPath(){},roundRect(){},fill(){},clearRect(){},moveTo(){},lineTo(){},stroke(){},
  getImageData:()=>({data:new Uint8ClampedArray(4)}),putImageData(){},
  measureText(text){return {width:[...text].length*parseFloat(this.font.replace('500 ',''))*.6};},
  fillText(text){painted.push(text);assert(this.measureText(text).width<=470.01,'long English labels fit the actual map canvas');},
};}});
const labeled=createEscapeScene(new THREE.Scene());assert(painted.some(text=>han.test(text)));painted.length=0;setEscapeLanguage('en');labeled.refreshLabels();assert(painted.length>10&&painted.every(text=>!han.test(text)),'all actual room and objective sprites redraw in English');
painted.length=0;setEscapeLanguage('zh');labeled.refreshLabels();assert(painted.some(text=>han.test(text)),'map text can switch back without rebuilding the world');
console.log('Localization/difficulty OK: every static and dynamic item/fixture/prompt/state has English, Fool/Nerd/Ninja names, live language switch preserves play state, Easy/Normal/Hard/Hacker capture costs and zero-HP death, one -10 wake reduction with clamping, safe preferences with blocked storage, and exterior-only corner trim.');
