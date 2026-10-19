import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createNavigation,createPlayer,stairHeight,escapeStairs} from '../src/frog-escape-navigation.js';
import {createWorldItems,disposeItemModel} from '../src/frog-escape-items.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createNaiwaModel} from '../src/frog-escape-naiwa-model.js';
import {createPropModel,propItem,propTypes} from '../src/frog-escape-props.js';
import {NAIWA_SLIP} from '../src/frog-escape-naiwa-slip.js';

const boundary=[[-40,-40],[40,-40],[40,40],[-40,40]];
const run=(seconds,tick,fps=60)=>{for(let left=seconds;left>1e-9;){const dt=Math.min(1/fps,left);tick(dt);left-=dt;}};
function setup({stairs=false}={}){
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:stairs?escapeStairs:[],boundary}),items=createWorldItems(scene,navigation),player={...createPlayer(),x:-15,y:-.83,z:10,hidden:true};
  const spawn=stairs?{x:8,y:.15,z:-4.35}:{x:15,y:-.83,z:-2},target=stairs?{x:8,y:-5.05,z:4.2}:{x:15,y:-.83,z:2};
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:items,player,spawn,patrolRoute:[target],random:()=>.99});
  const stairZ=-4.4+8.8/26*2.5,peel=stairs?{x:8,y:stairHeight(escapeStairs[0],stairZ),z:stairZ}:{x:15,y:-.83,z:0};
  assert(items.place(propItem('bananaPeel','test-peel'),{valid:true,position:new THREE.Vector3(peel.x,peel.y+.0285,peel.z),yaw:0}));
  run(1,dt=>items.tick(dt,player));
  const step=dt=>{npc.tick(dt);items.tick(dt,player);};
  return {scene,navigation,items,player,npc,step};
}
function trip(t,fps){
  for(let i=0;i<fps*9&&t.npc.state!=='down';i++)t.step(1/fps);
  assert.equal(t.npc.state,'down');assert.equal(t.npc.model.activeClip,'Slip');
  return {...t.npc.actor};
}
for(const fps of [30,60,144]){
  const t=setup(),start=trip(t,fps),dur=t.npc.stunTime,distances=[];
  for(let i=0;i<4;i++){const from=t.npc.actor.z;run(.18,t.step,fps);distances.push(t.npc.actor.z-from);}
  assert(Math.abs(t.npc.actor.z-start.z-NAIWA_SLIP.distance)<1e-7,`real NPC slides a full ${NAIWA_SLIP.distance}m at ${fps} FPS`);
  assert(distances.every((d,i)=>d>0&&(!i||d<distances[i-1])),'movement decelerates instead of snapping or travelling at constant speed');
  assert(Math.abs(t.npc.actor.x-start.x)<.01,'the slide follows the incoming path direction');assert.equal(t.npc.actor.y,start.y);
  run(.2,t.step,fps);assert.equal(t.npc.model.activeClip,'Down');const end=t.npc.actor.z;run(.3,t.step,fps);assert.equal(t.npc.actor.z,end,'no drift after the slide');
  assert(Math.abs(t.npc.stunTime-(dur-1.22))<1e-7,'the slip does not add or remove knockdown time');
  t.npc.reset();assert.equal(t.npc.model.activeClip,'Idle');assert.equal(t.npc.actor.z,-2);t.npc.dispose();
}
for(const obstacle of ['wall','player','ledge'])for(const fps of [30,60,144]){
  const t=setup(),start=trip(t,fps);
  if(obstacle==='wall')t.navigation.solids.push({x:15,z:start.z+.85,halfX:2,halfZ:.05,minY:-.83,maxY:3,axisX:[1,0],axisZ:[0,1]});
  if(obstacle==='player')Object.assign(t.player,{x:15,y:-.83,z:start.z+.95});
  if(obstacle==='ledge'){
    const original=t.navigation.support;
    t.navigation.support=(x,z,...rest)=>z>start.z+.4?-5:original(x,z,...rest);
  }
  run(1,t.step,fps);assert(t.npc.actor.z>start.z+.1&&t.npc.actor.z<start.z+.43,`${obstacle} stops the real slide at ${fps} FPS`);assert.equal(t.npc.actor.y,start.y);assert(!t.player.heldBy);t.npc.dispose();
}
for(const fps of [30,60,144]){
  const t=setup({stairs:true}),start=trip(t,fps);run(1,t.step,fps);
  assert(t.npc.actor.z>start.z+.7,'a descending staircase allows forward slipping');assert(t.npc.actor.y<start.y,'the body follows the stair height');
  assert(Math.abs(t.npc.actor.y-t.navigation.support(t.npc.actor.x,t.npc.actor.z,t.npc.actor.y,.235,.4,[t.npc.actor.collider]))<.02,'feet settle on a real stair surface');t.npc.dispose();
}
{
  const t=setup(),start={...t.npc.actor};assert(t.npc.hit({damage:30}));run(1,t.step);assert.equal(t.npc.actor.z,start.z,'ordinary weapon knockdowns never inherit peel momentum');t.npc.dispose();
}
{
  const t=setup();trip(t,60);run(.1,t.step);t.npc.reset();assert.equal(t.npc.model.activeClip,'Idle');assert.equal(t.npc.actor.z,-2);run(.02,t.step);assert(Math.abs(t.npc.actor.z+2)<.04,'reset during a slide clears momentum');t.npc.dispose();
}

// Exercise the packaged skinned model, including mixer blending and the final
// Slip -> Down transition, without opening a browser or taking screenshots.
const originalDocument=globalThis.document,originalFetch=globalThis.fetch,originalProgress=globalThis.ProgressEvent;
let model;
try{
  globalThis.document={};globalThis.ProgressEvent??=class {constructor(type,fields){Object.assign(this,{type,...fields});}};
  const bytes=readFileSync('assets/models/naiwa-h25-rigged.glb');globalThis.fetch=async()=>new Response(bytes);
  model=createNaiwaModel();assert(await model.ready);const bones=new Map(model.skeleton.bones.map(b=>[b.name,b]));
  model.animate(1/60,{state:'patrol',speed:1.55});const foot=bones.get('Foot_L').getWorldPosition(new THREE.Vector3());
  let previous=new Map(),lastDown;
  for(let i=0;i<=66;i++){
    const elapsed=i/60;model.animate(i?1/60:0,{state:'down',stun:7-elapsed,slipElapsed:Math.min(.9,elapsed)});model.root.updateMatrixWorld(true);
    assert.equal(model.activeClip,elapsed<.9?'Slip':'Down');
    if(i===12){assert(bones.get('Thigh_L').quaternion.angleTo(new THREE.Quaternion())>.75,'the actual thigh kicks forwards');assert(bones.get('Foot_L').getWorldPosition(new THREE.Vector3()).z>foot.z+.2,'the foot really slides ahead of the torso');}
    for(const bone of bones.values()){
      assert(bone.position.toArray().concat(bone.quaternion.toArray()).every(Number.isFinite));
      if(previous.has(bone.name))assert(bone.quaternion.angleTo(previous.get(bone.name))<.3,`${bone.name} has no abrupt per-frame turn during slip or settling`);
    }
    previous=new Map([...bones].map(([name,b])=>[name,b.quaternion.clone()]));
    if(elapsed>=.9){const pose=[...bones.values()].flatMap(b=>b.position.toArray().concat(b.quaternion.toArray()));if(lastDown)assert(pose.every((value,j)=>Math.abs(value-lastDown[j])<1e-4),'settled pose stays still without replaying the fall');lastDown=pose;}
  }
  model.reset();assert.equal(model.activeClip,'Idle');
}finally{
  model?.dispose();globalThis.fetch=originalFetch;if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;if(originalProgress===undefined)delete globalThis.ProgressEvent;else globalThis.ProgressEvent=originalProgress;
}
for(const kind of ['banana','bananaPeel']){
  const item=propItem(kind,kind),mesh=createPropModel(item),bounds=new THREE.Box3().setFromObject(mesh),size=bounds.getSize(new THREE.Vector3());
  assert(size.toArray().every((v,i)=>Math.abs(v-propTypes[kind].size[i])<1e-7),'visual detail retains pickup and physics dimensions');
  let triangles=0,draws=0;
  mesh.traverse(child=>{if(!child.isMesh)return;draws++;triangles+=child.geometry.index.count/3;const color=child.geometry.attributes.color;assert(color&&child.material.vertexColors&&child.material.side===THREE.FrontSide);assert(child.geometry.attributes.normal.array.every(Number.isFinite));});
  assert(triangles<2500&&draws<=3,'small fruit retains a bounded mobile rendering budget');
  let disposed=0;const resources=new Set();mesh.traverse(child=>{if(child.isMesh){resources.add(child.geometry);resources.add(child.material);}});for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);disposeItemModel(mesh);assert.equal(disposed,resources.size);
}
console.log('Slip OK: real decelerating NPC travel, wall/player/ledge stops, descending stairs, exact frame-independent durations and reset at 30/60/144 FPS; packaged GLB forward foot kick, smooth body/arm poses and stable Down transition; detailed fruit keeps physics sizes, low draw/triangle counts and resource disposal.');
