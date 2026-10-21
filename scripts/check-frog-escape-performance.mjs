import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createEscapeRenderBatches} from '../src/frog-escape-render-batches.js';
import {createPursuitPathfinder} from '../src/frog-escape-pursuit-path.js';
import {createPropPhysics} from '../src/frog-escape-physics.js';
import {createNavigation} from '../src/frog-escape-navigation.js';
import {createEscapeExplorer} from '../src/frog-escape-explorer.js';
import {updateCastleDoor,syncDoorCollider} from '../src/frog-escape-doors.js';
import {updateFixtureAction} from '../src/frog-escape-interactions.js';

const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),{navigation}=castle;
const opaque=()=>{let count=0;scene.traverseVisible(mesh=>{if(mesh.isMesh&&mesh.layers.isEnabled(0)&&!mesh.material?.transparent)count++;});return count;};
const before=opaque(),batcher=createEscapeRenderBatches(castle),after=opaque();
// Real books and usable drawer contents replace static decorative blocks.
// Measure batching efficiency against the remaining static sources, while
// the checks below keep all interactive props individually rendered.
assert(batcher.stats.sourceMeshes>1800);assert(before-after>batcher.stats.sourceMeshes*.8);assert.equal(before-after,batcher.stats.savedDrawCalls);
const foliage=scene.getObjectByName('vegetation:long-leaves'),quadrants=count=>{const totals=[0,0,0,0],values=foliage.instanceMatrix.array;for(let i=0;i<count;i++)totals[(values[i*16+12]>0?1:0)+(values[i*16+14]>0?2:0)]++;return totals;};
const allLeaves=quadrants(foliage.count),thinLeaves=quadrants(Math.ceil(foliage.count*.35));allLeaves.forEach((count,i)=>assert(Math.abs(thinLeaves[i]/count-.35)<.04,'lower foliage density remains spread across every garden quadrant'));
for(const seed of castle.pickupSeeds)seed.mesh.traverse(mesh=>assert(mesh.layers.isEnabled(0),'items remain individually rendered and selectable'));
for(const group of [...navigation.chairs.map(c=>c.root),castle.escapeProgress.fence.root])group.traverse(mesh=>assert(!mesh.userData.escapeRenderSource,'chairs and breakable fence remain separate'));
const movingRoots=[...castle.doors.flatMap(d=>d.parts.map(p=>p.pivot)),...castle.interactables.flatMap(a=>(a.motions??[]).map(m=>m.pivot))];
for(const root of movingRoots)root.traverse(mesh=>{if(mesh.userData.escapeRenderSource)assert(mesh.matrixWorldAutoUpdate,'batched panel sources still follow moving ancestors for collision and ray hits');});
const movingBatches=batcher.batches.filter(mesh=>mesh.userData.escapeRenderMoving);assert(movingBatches.length>30);
// A source handle and the same rendered point must agree through actual door
// opening/closing and drawer translation, not just at the authored rest pose.
for(const target of [castle.doors.find(d=>d.id==='rear'),castle.interactables.find(a=>a.fixtureKind==='drawer')]){
  const motion=target.parts?.[0]??target.motions[0],root=motion.pivot,source=root.children.find(mesh=>mesh.userData.escapeRenderSource);
  const batch=movingBatches.find(mesh=>mesh.parent===root&&mesh.material===source.material);assert(batch);
  const marker=new THREE.Vector3();source.getWorldPosition(marker);const local=batch.worldToLocal(marker.clone()),before=marker.clone();
  target.open=true;for(let i=0;i<60;i++)target.parts?updateCastleDoor(target,1/60):updateFixtureAction(target,1/60);
  scene.updateMatrixWorld(true);source.getWorldPosition(marker);assert(marker.distanceTo(before)>.1);assert(marker.distanceTo(batch.localToWorld(local.clone()))<1e-6,'rendered panel and original handle stay together');
  const movingRay=new THREE.Raycaster(marker.clone().add(new THREE.Vector3(0,3,0)),new THREE.Vector3(0,-1,0)),movingHits=[];
  batch.raycast(movingRay,movingHits);assert(movingHits.some(hit=>hit.object===source),'aiming at a moved batch still reports the original panel part');
  if(target.parts){syncDoorCollider(motion);const c=motion.collider;assert(Math.abs(c.x-motion.leaf.getWorldPosition(new THREE.Vector3()).x)<1e-6);}
  target.open=false;for(let i=0;i<90;i++)target.parts?updateCastleDoor(target,1/60):updateFixtureAction(target,1/60);
  scene.updateMatrixWorld(true);assert(source.getWorldPosition(marker).distanceTo(before)<1e-5,'the panel returns to its initial render/collision pose');
}
for(const target of castle.breakables)for(const solid of target.colliders)assert(navigation.solids.includes(solid),'breakable collisions remain original objects');
assert(batcher.batches.every(mesh=>mesh.geometry.boundingSphere&&mesh.geometry.boundingBox&&mesh.parent!==scene),'chunks retain floor visibility and frustum bounds');
// Merged visual proxies must return original mesh hits, including face indices.
const proxy=batcher.batches[0],ray=new THREE.Raycaster(new THREE.Vector3(0,25,0),new THREE.Vector3(0,-1,0),0,100);scene.updateMatrixWorld(true);const hits=[];proxy.raycast(ray,hits);assert(hits.every(hit=>!hit.object.userData.escapeRenderBatch));
batcher.dispose();assert.equal(opaque(),before);batcher.dispose();
// Isolate the user's suspected cause without pretending a headless test is a
// GPU/FPS measurement. Flicker changes uniforms only; no materials or lights
// are constructed/removed or marked for shader recompilation while it runs.
const lampMaterials=new Map(),lampObjects=[];
scene.traverse(o=>{if(o.isPointLight)lampObjects.push(o);for(const material of [o.material].flat().filter(Boolean))lampMaterials.set(material,material.version);});
for(let i=0;i<2000;i++)castle.flicker.tick(1/60);
const flickerStart=performance.now();for(let i=0;i<100000;i++)castle.flicker.tick(1/60);const flickerUs=(performance.now()-flickerStart)/100;
for(const [material,version]of lampMaterials)assert.equal(material.version,version,'lamp flicker never recompiles scene materials');
const currentLights=[];scene.traverse(o=>{if(o.isPointLight)currentLights.push(o);});assert.deepEqual(currentLights,lampObjects,'the light topology stays fixed through outages');

const planner=createPursuitPathfinder(navigation),from={x:-3,y:-5.05,z:-4.3},to={x:0,y:.15,z:0};
planner.findPath(from,to);const revision=planner.revision;planner.findPath(from,to);assert.equal(planner.revision,revision,'unchanged graph is reused');
const fixture=navigation.solids.find(s=>s.dynamic&&!s.breakable&&!s.movableChair&&!castle.doors.some(d=>d.parts.some(p=>p.collider===s)));
const saved=fixture.x;fixture.x+=.025;planner.findPath(from,to);assert.equal(planner.revision,revision+1,'moved fixture invalidates the graph');fixture.x=saved;
const target=castle.breakables[0],oldEnabled=target.colliders[0].enabled;target.colliders[0].enabled=()=>false;planner.findPath(from,to);assert.equal(planner.revision,revision+2);target.colliders[0].enabled=oldEnabled;
const portalNav=createNavigation({solids:[],stairs:[],boundary:[[-40,-40],[40,-40],[40,40],[-40,40]]});
const portalPlanner=createPursuitPathfinder(portalNav,{passages:()=>[{id:'stable',lift:1,from:{x:15,y:-.83,z:0},to:{x:16,y:-.83,z:0},bidirectional:true}]});
portalPlanner.findPath({x:15,y:-.83,z:-2},{x:16,y:-.83,z:2});const portalRevision=portalPlanner.revision;portalPlanner.findPath({x:15,y:-.83,z:-2},{x:16,y:-.83,z:2});assert.equal(portalPlanner.revision,portalRevision,'new equivalent portal objects preserve graph reuse');
const attempts=8;planner.findPath(from,to);let started=performance.now();for(let i=0;i<attempts;i++)planner.findPath(from,to);const cachedMs=performance.now()-started;
started=performance.now();for(let i=0;i<attempts;i++){fixture.x+=.000001;planner.findPath(from,to);}const rebuiltMs=performance.now()-started;fixture.x=saved;

for(const fps of [30,60,144]){
  const nav=createNavigation({solids:[],stairs:[],boundary:[[-40,-40],[40,-40],[40,40],[-40,40]]}),physics=createPropPhysics(nav,()=>{});let steps=0;
  const original=physics.world.step.bind(physics.world);physics.world.step=(...args)=>{steps++;return original(...args);};
  const entry={item:{size:[.2,.2,.2],mass:.3,shape:'box'}};physics.add(entry,{position:{x:15,y:0,z:0},sleep:true});
  for(let i=0;i<fps;i++)physics.tick(1/fps);assert.equal(steps,0,'sleeping world skips constraint solves');assert(Math.abs(physics.world.time-1)<1e-7,'idle world fixed clock remains accurate');
  entry.body.wakeUp();entry.body.velocity.set(2,1,0);for(let i=0;i<fps/2;i++)physics.tick(1/fps);assert(steps>=119&&steps<=122,'awake bodies still use 240 Hz');assert(entry.body.position.x>15.4,'active throws continue moving');assert.notEqual(entry.body.sleepState,CANNON.Body.SLEEPING);
}
// Run a real batched castle with the actual explorer. Idle HUDs should neither
// query the document repeatedly nor rewrite unchanged labels/buttons/meters.
let domQueries=0,domWrites=0;
class Control extends EventTarget{
  constructor(){super();this.fields={};this.children=new Map();this.attributes={};this.style={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};this.open=false;}
  setAttribute(key,value){domWrites++;this.attributes[key]=value;}getAttribute(key){return this.attributes[key]??null;}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Control());return this.children.get(key);}closest(){return null;}focus(){}showModal(){this.open=true;}close(){this.open=false;}setPointerCapture(){}
}
for(const key of ['textContent','innerHTML','value','max','hidden','disabled','title'])Object.defineProperty(Control.prototype,key,{get(){return this.fields[key];},set(value){domWrites++;this.fields[key]=value;}});
const controls=new Map(),slots=Array.from({length:7},()=>new Control());globalThis.document=new Control();document.querySelector=key=>{domQueries++;if(!controls.has(key))controls.set(key,new Control());return controls.get(key);};document.querySelectorAll=()=>slots;document.hidden=false;
globalThis.window=new Control();window.matchMedia=()=>({matches:false});const canvas=new Control();canvas.requestPointerLock=()=>Promise.resolve();
const liveBatches=createEscapeRenderBatches(castle),explorer=createEscapeExplorer({scene,canvas,stage:new Control(),status:new Control(),...castle,onMap(){}});
explorer.enter();Object.assign(explorer.player,{x:22,y:-.83,z:8,yaw:0});explorer.inventory.select(1);for(let i=0;i<60;i++)explorer.tick(1/60);
const previousQueries=domQueries,previousWrites=domWrites;for(let i=0;i<120;i++)explorer.tick(1/60);
assert.equal(domQueries,previousQueries,'idle HUD uses cached nodes');assert(domWrites-previousWrites<5,'unchanged two-second HUD does not rewrite labels/buttons/meters');
assert(castle.pickupSeeds.every(seed=>!seed.mesh.userData.escapeRenderSource),'actual item physics does not receive batched sources');
explorer.showMap();explorer.audio.dispose();liveBatches.dispose();delete globalThis.document;delete globalThis.window;
console.log(JSON.stringify({opaqueSceneDraws:{before,after,reducedPercent:Math.round((before-after)/before*100)},batchGeometryBytes:batcher.stats.geometryBytes,flicker:{lamps:castle.flicker.lampCount,cpuMicrosecondsPerTick:+flickerUs.toFixed(3)},pathQueries:attempts,cachedMs:+cachedMs.toFixed(1),rebuiltMs:+rebuiltMs.toFixed(1)},null,2));
console.log('Static and rigid panel batches preserve items, actual opening/sliding/closing, colliders/rays/floors and uniform foliage; graph invalidation and equivalent window portals passed; idle and active 240 Hz physics passed at 30/60/144 FPS; actual batched explorer has no repeated idle HUD queries/writes. Draw counts are structural, not a device FPS measurement.');
