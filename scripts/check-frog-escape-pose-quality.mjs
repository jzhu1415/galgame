import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createNaiwaModel} from '../src/frog-escape-naiwa-model.js';

const bytes=readFileSync('assets/models/naiwa-h25-rigged.glb');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const skin=gltf.scene.getObjectByProperty('isSkinnedMesh',true),p=skin.geometry.attributes.position,indices=skin.geometry.index.array;
const rest=i=>new THREE.Vector3().fromBufferAttribute(p,i);
const posed=(i,mesh=skin)=>mesh.applyBoneTransform(i,rest(i));
const mixer=new THREE.AnimationMixer(gltf.scene);
function pose(clip,time) {
  mixer.stopAllAction();const action=mixer.clipAction(clip);
  action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.update(time);
  gltf.scene.updateMatrixWorld(true);skin.skeleton.update();
}

// Preserve the motions the player already approved. Only wrist rotations and
// the two new shoulder supports may change; positions, scales and other joint
// rotations must still match v12, including the prone head and body motion.
const motionHash=createHash('sha256');
for(const clip of gltf.animations) {
  motionHash.update(clip.name);
  for(const track of clip.tracks) {
    if(/^Shoulder_/.test(track.name)||/^Hand_.*quaternion$/.test(track.name))continue;
    motionHash.update(track.name);
    for(const array of [track.times,track.values])motionHash.update(Buffer.from(array.buffer,array.byteOffset,array.byteLength));
  }
}
assert.equal(motionHash.digest('hex'),'64bdd0bd46dc82aa5d9a0d825a5f51318eeaa70fab422581a25f7cca253da775','approved body, head and leg animation tracks remain unchanged');

// Follow material rings cut from the actual rest mesh through skinning. Static
// silhouette width cannot catch the shoulder collapsing under a raised arm.
const rings=[];
function ringArea(points) {
  const sum=new THREE.Vector3(),cross=new THREE.Vector3();
  for(let i=0;i<points.length;i++)sum.add(cross.crossVectors(points[i],points[(i+1)%points.length]));
  return sum.length()/2;
}
for(const y of [.675,.68,.685,.525,.53,.535,.42,.425,.43]) {
  const adjacent=new Map(),points=new Map();
  for(let i=0;i<indices.length;i+=3) {
    const triangle=[indices[i],indices[i+1],indices[i+2]],hits=[];
    for(let k=0;k<3;k++) {
      const a=triangle[k],b=triangle[(k+1)%3],ay=p.getY(a),by=p.getY(b);
      if((ay-y)*(by-y)>=0)continue;
      const key=a<b?`${a}/${b}`:`${b}/${a}`,t=(y-ay)/(by-ay);
      points.set(key,{a,b,t,rest:rest(a).lerp(rest(b),t)});hits.push(key);
    }
    if(hits.length===2)for(let k=0;k<2;k++) {
      if(!adjacent.has(hits[k]))adjacent.set(hits[k],[]);
      adjacent.get(hits[k]).push(hits[1-k]);
    }
  }
  const visited=new Set();
  for(const start of adjacent.keys()) {
    if(visited.has(start))continue;
    let previous=null,current=start;const ring=[];
    do {
      assert(!visited.has(current),'a shoulder material ring closes without a branch');visited.add(current);ring.push(points.get(current));
      assert.equal(adjacent.get(current).length,2);
      const next=adjacent.get(current).find(key=>key!==previous);previous=current;current=next;
    }while(current!==start);
    if(ring.every(point=>point.rest.x>.12)||ring.every(point=>point.rest.x<-.12)) {
      rings.push({y,side:ring[0].rest.x<0?'L':'R',points:ring,area:ringArea(ring.map(point=>point.rest))});
    }
  }
}
assert.equal(rings.filter(ring=>ring.y>.6).length,6,'three complete surface sections cover each shoulder-to-upper-arm transition');
assert.equal(rings.filter(ring=>ring.y<.6).length,12,'three complete surface sections cover each elbow and wrist transition');
let minimumSection=Infinity,minimumJointSection=Infinity;
function checkSections(label,mesh=skin,includeJoints=false) {
  for(const ring of rings) {
    if(ring.y<.6&&!includeJoints)continue;
    const ratio=ringArea(ring.points.map(point=>posed(point.a,mesh).lerp(posed(point.b,mesh),point.t)))/ring.area;
    if(ring.y>.6)minimumSection=Math.min(minimumSection,ratio);else minimumJointSection=Math.min(minimumJointSection,ratio);
    assert(ratio>.65,`${label}: arm ${ring.side} at ${ring.y} keeps its cross-section (${ratio.toFixed(3)})`);
  }
}

// Measure wrist swing and twist separately, along the actual forearm axis.
// A modest total rotation alone previously let visibly twisted hands pass.
const identity=new THREE.Quaternion();
function checkWrists(bones,label,limits={swing:.35,twist:.175}) {
  for(const hand of bones.filter(bone=>/^Hand_/.test(bone.name))) {
    const axis=hand.position.clone().normalize(),q=hand.quaternion.clone();
    if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);
    const projected=new THREE.Vector3(q.x,q.y,q.z).dot(axis);
    const twist=new THREE.Quaternion(axis.x*projected,axis.y*projected,axis.z*projected,q.w).normalize();
    const swing=q.clone().multiply(twist.clone().invert());
    assert(swing.angleTo(identity)<=limits.swing+.00001,`${label}: ${hand.name} stays within its wrist extension limit`);
    assert(twist.angleTo(identity)<=limits.twist+.00001,`${label}: ${hand.name} stays within its wrist twist limit`);
  }
}
for(const clip of gltf.animations)for(let frame=0;frame<=Math.ceil(clip.duration*30);frame++) {
  const time=Math.min(frame/30,clip.duration);pose(clip,time);checkWrists(skin.skeleton.bones,`${clip.name}/${time}`);
  if(frame%3===0||time===clip.duration)checkSections(`${clip.name}/${time}`);
}

// Identify the independent mouth and the closed body surface from connectivity.
const adjacency=Array.from({length:p.count},()=>[]);
for(let i=0;i<indices.length;i+=3)for(const [a,b]of[[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]){adjacency[a].push(b);adjacency[b].push(a);}
const visited=new Set(),components=[];
for(let start=0;start<p.count;start++) {
  if(visited.has(start))continue;
  const queue=[start],component=[];visited.add(start);
  while(queue.length) {
    const i=queue.pop();component.push(i);
    for(const j of adjacency[i])if(!visited.has(j)){visited.add(j);queue.push(j);}
  }
  components.push(component);
}
const center=component=>component.reduce((sum,i)=>sum.add(rest(i)),new THREE.Vector3()).divideScalar(component.length);
const body=new Set(components.reduce((a,b)=>a.length>b.length?a:b));
const mouth=components.find(component=>component.length<1000&&center(component).y>.86&&center(component).y<.91);
assert(mouth?.length>200,'the original mouth remains present as a complete component');
const headIndex=skin.skeleton.bones.findIndex(bone=>bone.name==='Head');
const joints=skin.geometry.attributes.skinIndex,weights=skin.geometry.attributes.skinWeight;
let faceCount=0;
for(const i of [...body].filter(i=>p.getY(i)>.875&&p.getZ(i)>.045).concat(mouth)) {
  let weight=0;for(let channel=0;channel<4;channel++)if(joints.array[i*4+channel]===headIndex)weight+=weights.array[i*4+channel];
  assert(weight>.99999,'mouth and visible face follow the same head transform');faceCount++;
}
assert(faceCount>500);
const bodyIndices=[];for(let i=0;i<indices.length;i+=3)if(body.has(indices[i]))bodyIndices.push(...indices.slice(i,i+3));
const mouthSamples=[-.016,0,.016].map(x=>mouth.filter(i=>Math.abs(p.getX(i)-x)<.002).sort((a,b)=>p.getZ(b)-p.getZ(a))[0]);
let restGaps;
for(const [name,time] of [['Idle',0],['Block',.5],['BedSearch',1.3],['BedReach',.6],['BedRise',0]]) {
  pose(gltf.animations.find(clip=>clip.name===name),time);
  const positions=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)positions.set(posed(i).toArray(),i*3);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(bodyIndices);
  const bodyMesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));bodyMesh.updateMatrixWorld(true);
  const forward=new THREE.Vector3(0,0,1).applyQuaternion(gltf.scene.getObjectByName('Head').getWorldQuaternion(new THREE.Quaternion()));
  const ray=new THREE.Raycaster(),gaps=mouthSamples.map(i=>{
    const point=new THREE.Vector3().fromArray(positions,i*3);
    ray.set(point.clone().addScaledVector(forward,.15),forward.clone().negate());
    const hit=ray.intersectObject(bodyMesh)[0];assert(hit,`${name}: a real face lies behind the mouth`);return hit.distance-.15;
  });
  restGaps??=gaps;
  gaps.forEach((gap,i)=>{assert(gap>.006,`${name}: the middle of the mouth stays in front of the face`);assert(Math.abs(gap-restGaps[i])<1e-5,`${name}: mouth-to-face clearance stays unchanged`);});
  geometry.dispose();bodyMesh.material.dispose();
}

const original={fetch:globalThis.fetch,document:globalThis.document,ProgressEvent:globalThis.ProgressEvent};let model;
try {
  globalThis.document={};globalThis.ProgressEvent??=class{constructor(type,fields){Object.assign(this,{type,...fields});}};
  globalThis.fetch=async()=>new Response(bytes);model=createNaiwaModel();assert(await model.ready);
  for(const speed of [0,1.55,3.45]) {
    model.reset();
    for(let frame=0;frame<150;frame++) {
      const amount=frame<30?frame/30:frame<90?1:frame<120?(120-frame)/30:0;
      model.animate(1/60,{state:'chase',speed,guardAmount:amount,lightAmount:amount});model.root.updateMatrixWorld(true);
      checkWrists(model.skeleton.bones,`live guard ${speed}/${frame}`);
      for(const side of ['L','R']) {
        const support=model.skeleton.getBoneByName(`Shoulder_${side}`),upper=model.skeleton.getBoneByName(`UpperArm_${side}`);
        assert(support.quaternion.clone().normalize().angleTo(identity.clone().slerp(upper.quaternion,.5).normalize())<1e-6,'support follows the actual blended shoulder without accumulating rotations');
      }
      const hand=model.skeleton.getBoneByName('Hand_R');
      const forward=new THREE.Vector3(0,0,1).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
      assert(forward.z>.7,'walking, running and lowering never reverse the guarding palm');
    }
  }
  const actualSkin=model.root.getObjectByProperty('isSkinnedMesh',true);
  for(const speed of [0,1.55,3.45]){
    model.reset();
    for(let frame=0;frame<90;frame++){
      const guard=frame<30?0:frame<60?(frame-30)/30:(90-frame)/30;
      model.animate(1/60,{state:'chase',speed,intelligent:true,guardAmount:guard,lightAmount:guard});
      model.root.updateMatrixWorld(true);actualSkin.skeleton.update();
      checkWrists(model.skeleton.bones,`Nerd guard ${speed}/${frame}`);
      if(frame%5===0)checkSections(`Nerd guard ${speed}/${frame}`,actualSkin,true);
    }
  }
  for(const speed of [0,1.55,3.45]){
    model.reset();
    for(let frame=0;frame<90;frame++){
      const guard=frame<30?0:frame<60?(frame-30)/30:(90-frame)/30;
      model.animate(1/60,{state:'chase',speed,handWalking:true,guardAmount:guard,lightAmount:guard});
      model.root.updateMatrixWorld(true);actualSkin.skeleton.update();
      checkWrists(model.skeleton.bones,`Hand support ${speed}/${frame}`,{swing:1.45,twist:.35});
      if(frame%5===0)checkSections(`Hand support ${speed}/${frame}`,actualSkin,true);
    }
  }
  const pose={state:'bed-search',actionTime:1.3,lookTarget:{x:.3,y:.57,z:3}};
  model.reset();model.animate(0,pose);const wrists=model.skeleton.bones.filter(bone=>/^Hand_/.test(bone.name)),before=wrists.map(hand=>hand.quaternion.clone());
  for(let i=0;i<60;i++)model.animate(0,pose);
  wrists.forEach((hand,i)=>assert(hand.quaternion.angleTo(before[i])<1e-6,'paused prone updates do not accumulate wrist corrections'));
  model.reset();assert.equal(model.activeClip,'Idle');checkWrists(model.skeleton.bones,'reset');
}finally {
  model?.dispose();globalThis.fetch=original.fetch;
  for(const key of ['document','ProgressEvent'])if(original[key]===undefined)delete globalThis[key];else globalThis[key]=original[key];
}
console.log(`Pose quality OK: unchanged original body/head/leg tracks; six actual shoulder sections retain at least ${(minimumSection*100).toFixed(1)}% area, twelve Nerd/hand-support elbow/wrist sections at least ${(minimumJointSection*100).toFixed(1)}%; separate ordinary/support wrist limits and walking/running guards; mouth stays in front of the face during prone head lift; repeated updates and reset remain stable.`);
