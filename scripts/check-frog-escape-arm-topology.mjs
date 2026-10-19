import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

async function load(path) {
  const bytes=readFileSync(path);
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  return {bytes,gltf,mesh:gltf.scene.getObjectByProperty('isMesh',true)};
}
const original=await load('assets/models/naiwa-h25-refined.glb'),repaired=await load('assets/models/naiwa-h25-articulated.glb'),rig=await load('assets/models/naiwa-h25-rigged.glb');
const report=JSON.parse(readFileSync('assets/models/naiwa-h25-arm-repair.json','utf8'));
assert.equal(report.sourceSha256,createHash('sha256').update(original.bytes).digest('hex'),'the original refined model is preserved');
assert(report.volumeRemovedFraction>0&&report.volumeRemovedFraction<.03,'the repair is confined to the fused inner-arm strip');
assert(repaired.mesh.geometry.index.count/3<100000,'local repair retains the game model triangle budget');
assert.equal(rig.gltf.parser.json.extras.sourceSha256,createHash('sha256').update(repaired.bytes).digest('hex'));
const p=repaired.mesh.geometry.attributes.position,indices=repaired.mesh.geometry.index.array,adjacency=Array.from({length:p.count},()=>[]),edges=new Map();
for(let i=0;i<indices.length;i+=3)for(const [a,b] of [[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]) {
  const key=a<b?`${a}/${b}`:`${b}/${a}`;
  edges.set(key,(edges.get(key)??0)+1);adjacency[a].push(b);adjacency[b].push(a);
}
assert([...edges.values()].every(count=>count===2),'reconstructed inner arms and body sides have no open or non-manifold edges');

function component(seed,allowed) {
  const found=new Set([seed]),pending=[seed];
  while(pending.length)for(const neighbor of adjacency[pending.pop()])if(allowed(neighbor)&&!found.has(neighbor)){found.add(neighbor);pending.push(neighbor);}
  return found;
}
const arms=[];
for(const sign of [-1,1]) {
  const seed=Array.from({length:p.count},(_,i)=>i).find(i=>p.getX(i)*sign>.244&&p.getY(i)>.385&&p.getY(i)<.425);
  assert.notEqual(seed,undefined);
  const arm=component(seed,i=>p.getY(i)<.678);assert(arm.size>1500);
  assert([...arm].every(i=>p.getX(i)*sign>.12),'the arm cannot reach the torso through a fused underarm surface');
  arms.push(arm);
}
assert([...arms[0]].every(i=>!arms[1].has(i)),'left and right arms only connect through the shoulder region');
// A complete body component still joins the arms normally above the axilla.
const whole=component([...arms[0]][0],()=>true);assert([...arms[1]].every(i=>whole.has(i)),'the arms are not detached floating objects');

function sectionLoops(geometry,height) {
  const positions=geometry.attributes.position,index=geometry.index.array,nodes=new Map(),points=new Map();
  for(let i=0;i<index.length;i+=3) {
    const triangle=[index[i],index[i+1],index[i+2]],hits=[];
    for(let edge=0;edge<3;edge++) {
      const a=triangle[edge],b=triangle[(edge+1)%3],ay=positions.getY(a),by=positions.getY(b);
      if((ay-height)*(by-height)>=0)continue;
      const id=a<b?`${a}/${b}`:`${b}/${a}`,t=(height-ay)/(by-ay);
      points.set(id,[positions.getX(a)+(positions.getX(b)-positions.getX(a))*t,positions.getZ(a)+(positions.getZ(b)-positions.getZ(a))*t]);hits.push(id);
    }
    if(hits.length===2)for(let side=0;side<2;side++){if(!nodes.has(hits[side]))nodes.set(hits[side],[]);nodes.get(hits[side]).push(hits[1-side]);}
  }
  const seen=new Set(),loops=[];
  for(const start of nodes.keys()) {
    if(seen.has(start))continue;
    let current=start,previous=null;const loop=[];
    do{seen.add(current);loop.push(points.get(current));const neighbors=nodes.get(current);assert.equal(neighbors.length,2,'closed surface sections form complete loops');const next=neighbors.find(node=>node!==previous);previous=current;current=next;}while(current!==start);
    loops.push(loop);
  }
  return loops;
}
const area=polygon=>Math.abs(polygon.reduce((sum,point,i)=>sum+point[0]*polygon[(i+1)%polygon.length][1]-point[1]*polygon[(i+1)%polygon.length][0],0))/2;
function clipArm(polygon,sign,boundary) {
  const result=[];
  for(let i=0;i<polygon.length;i++) {
    const a=polygon[i],b=polygon[(i+1)%polygon.length],insideA=a[0]*sign>=boundary,insideB=b[0]*sign>=boundary;
    if(insideA)result.push(a);
    if(insideA!==insideB){const t=(boundary*sign-a[0])/(b[0]-a[0]);result.push([boundary*sign,a[1]+(b[1]-a[1])*t]);}
  }
  return result;
}
const thickness=[];
for(const height of [.48,.53,.58,.63,.665]) {
  // This is the original rig's anatomical arm/trunk boundary. The old mesh
  // has no separate inner-arm wall, so its whole-body width is not an arm size.
  const boundary=height<.55?.225+(height-.45)*.05:height<=.65?.230-(height-.55)*.35:.195-(height-.65)*(.05/.07);
  const sourceLoops=sectionLoops(original.mesh.geometry,height),newLoops=sectionLoops(repaired.mesh.geometry,height);
  for(const sign of [-1,1]) {
    const oldParts=sourceLoops.map(loop=>clipArm(loop,sign,boundary)).filter(loop=>loop.length>=3),limb=newLoops.find(loop=>loop.every(point=>point[0]*sign>.12));assert(limb);
    const originalWidth=Math.max(...oldParts.flat().map(point=>point[0]*sign))-boundary,newWidth=Math.max(...limb.map(point=>point[0]*sign))-Math.min(...limb.map(point=>point[0]*sign));
    const widthRatio=newWidth/originalWidth,areaRatio=area(limb)/oldParts.reduce((sum,polygon)=>sum+area(polygon),0);
    assert(widthRatio>.94&&widthRatio<1.08,`arm width stays consistent at ${height} (${widthRatio.toFixed(3)})`);
    assert(areaRatio>.9&&areaRatio<1.1,`arm cross-section retains its volume at ${height} (${areaRatio.toFixed(3)})`);
    thickness.push({height,sign,widthRatio,areaRatio});
  }
}

// Face, eyes, hands, feet and central belly retain their actual source vertices
// and colours. Face topology/shape is not regenerated as part of this repair.
const key=(x,y,z)=>`${Math.round(x*1e6)},${Math.round(y*1e6)},${Math.round(z*1e6)}`;
const lookup=new Map();for(let i=0;i<p.count;i++)lookup.set(key(p.getX(i),p.getY(i),p.getZ(i)),i);
const old=original.mesh.geometry.attributes.position,oldColor=original.mesh.geometry.attributes.color,color=repaired.mesh.geometry.attributes.color;
let retained=0;
for(let i=0;i<old.count;i++) {
  const x=old.getX(i),y=old.getY(i),z=old.getZ(i);
  if(!(y>.77||y<.43||Math.abs(x)<.13))continue;
  const j=lookup.get(key(x,y,z));assert.notEqual(j,undefined,'identity-critical geometry remains unchanged');
  assert(Math.max(Math.abs(color.getX(j)-oldColor.getX(i)),Math.abs(color.getY(j)-oldColor.getY(i)),Math.abs(color.getZ(j)-oldColor.getZ(i)))<2e-5,'identity-critical vertex colours remain unchanged');retained++;
}
assert(retained>12000);

const skin=rig.mesh,bones=skin.skeleton.bones,joints=skin.geometry.attributes.skinIndex.array,weights=skin.geometry.attributes.skinWeight.array;
const armJoint=new Set(bones.map((bone,i)=>/^(Shoulder|UpperArm|Forearm|Hand)_/.test(bone.name)?i:-1));
const armWeight=i=>{let sum=0;for(let c=0;c<4;c++)if(armJoint.has(joints[i*4+c]))sum+=weights[i*4+c];return sum;};
assert.equal(skin.geometry.attributes.position.count,p.count);
for(let i=0;i<p.count;i++) {
  const sum=Array.from({length:4},(_,c)=>weights[i*4+c]).reduce((a,b)=>a+b,0);assert(Math.abs(sum-1)<1e-5);
  if(p.getY(i)>.43&&p.getY(i)<.64)assert(arms.some(arm=>arm.has(i))?armWeight(i)>.999:armWeight(i)<1e-6,'below the shoulder, the torso and arm skin belong to their own bones');
}
// Deliberately spread both arms. The original failure was a broad sheet pulled
// from the belly, even with finite bone angles and apparently valid wrists.
for(const side of ['L','R'])bones.find(bone=>bone.name===`UpperArm_${side}`).rotation.z=side==='L'?-.95:.95;
rig.gltf.scene.updateMatrixWorld(true);skin.skeleton.update();
const v=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3();let fixedTorso=0;
for(let i=0;i<p.count;i++)if(p.getY(i)>.43&&p.getY(i)<.64&&!arms.some(arm=>arm.has(i))) {
  v.fromBufferAttribute(skin.geometry.attributes.position,i);skin.applyBoneTransform(i,v);
  assert(v.distanceTo(new THREE.Vector3().fromBufferAttribute(p,i))<1e-5,'spread arms do not pull the trunk into a membrane');fixedTorso++;
}
assert(fixedTorso>2000);
for(const [edge] of edges) {
  const [i,j]=edge.split('/').map(Number);
  if(Math.max(p.getY(i),p.getY(j))>=.655)continue;
  a.fromBufferAttribute(skin.geometry.attributes.position,i);b.fromBufferAttribute(skin.geometry.attributes.position,j);
  const rest=a.distanceTo(b);if(rest<1e-6)continue;
  skin.applyBoneTransform(i,a);skin.applyBoneTransform(j,b);
  assert(a.distanceTo(b)/rest<1.001,'a raised arm cannot stretch an underarm bridge below the shoulder');
}
const armFaces=[],rest=skin.geometry.attributes.position,crossA=new THREE.Vector3(),crossB=new THREE.Vector3();
for(let i=0;i<indices.length;i+=3) {
  const triangle=[indices[i],indices[i+1],indices[i+2]];if(!triangle.every(vertex=>armWeight(vertex)>.8))continue;
  const [a,b,c]=triangle.map(vertex=>new THREE.Vector3().fromBufferAttribute(rest,vertex)),area=crossA.subVectors(b,a).cross(crossB.subVectors(c,a)).length();
  if(area>1e-8)armFaces.push({triangle,area});
}
const animatedIndices=[...new Set(armFaces.flatMap(face=>face.triangle))],animated=[];for(const i of animatedIndices)animated[i]=new THREE.Vector3();
const mixer=new THREE.AnimationMixer(rig.gltf.scene);
for(const clip of rig.gltf.animations) {
  mixer.stopAllAction();const action=mixer.clipAction(clip);action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
  for(let sample=0;sample<=Math.ceil(clip.duration*10);sample++) {
    action.time=Math.min(sample/10,clip.duration);mixer.update(0);rig.gltf.scene.updateMatrixWorld(true);skin.skeleton.update();
    for(const i of animatedIndices){skin.applyBoneTransform(i,animated[i].fromBufferAttribute(rest,i));assert([...animated[i]].every(Number.isFinite),`${clip.name}: the repaired surface stays finite`);}
    const ratios=armFaces.map(({triangle:[a,b,c],area})=>crossA.subVectors(animated[b],animated[a]).cross(crossB.subVectors(animated[c],animated[a])).length()/area).sort((a,b)=>a-b);
    assert(ratios[Math.floor(ratios.length*.01)]>.15,`${clip.name}: broad arm regions do not flatten away`);
    assert(ratios[Math.floor(ratios.length*.99)]<8,`${clip.name}: broad arm regions do not stretch into sheets`);
  }
}
console.log(`Arm topology OK: closed inner surfaces, shoulder-only attachment, ${retained} preserved identity vertices, arm widths ${(Math.min(...thickness.map(row=>row.widthRatio))*100).toFixed(1)}–${(Math.max(...thickness.map(row=>row.widthRatio))*100).toFixed(1)}% of original, isolated torso/arm weights, spread-arm test without a membrane; ${indices.length/3} triangles.`);
