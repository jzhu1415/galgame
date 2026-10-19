import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createNaiwaModel} from '../src/frog-escape-naiwa-model.js';

const bytes=readFileSync('assets/models/naiwa-h25-rigged.glb'),raw=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const originalSkin=raw.scene.getObjectByProperty('isSkinnedMesh',true),originalP=originalSkin.geometry.attributes.position,originalJ=originalSkin.geometry.attributes.skinIndex,originalW=originalSkin.geometry.attributes.skinWeight;
const saved={document:globalThis.document,fetch:globalThis.fetch,ProgressEvent:globalThis.ProgressEvent};let model,fallback;
const area=points=>{const sum=new THREE.Vector3();for(let i=0;i<points.length;i++)sum.add(points[i].clone().cross(points[(i+1)%points.length]));return sum.length()/2;};
try{
  globalThis.document={};globalThis.ProgressEvent??=class{};globalThis.fetch=async()=>new Response(bytes);
  model=createNaiwaModel();assert(await model.ready);model.animate(0,{handWalking:true});const {root,skeleton}=model,skin=root.getObjectByProperty('isSkinnedMesh',true),p=skin.geometry.attributes.position,index=skin.geometry.index.array;
  const rest=i=>new THREE.Vector3().fromBufferAttribute(p,i),posed=i=>skin.applyBoneTransform(i,rest(i));
  const originalPose=i=>{
    const point=new THREE.Vector3().fromBufferAttribute(originalP,i).applyMatrix4(skin.bindMatrix),result=new THREE.Vector3(),matrix=new THREE.Matrix4();
    for(let c=0;c<4;c++){const joint=originalJ.array[i*4+c],weight=originalW.array[i*4+c];if(weight)result.addScaledVector(point.clone().applyMatrix4(matrix.multiplyMatrices(skeleton.bones[joint].matrixWorld,originalSkin.skeleton.boneInverses[joint])),weight);}
    return result.applyMatrix4(skin.bindMatrixInverse);
  };
  const settle=opts=>{model.reset();for(let i=0;i<30;i++)model.animate(1/60,opts);root.updateMatrixWorld(true);};
  const variantGeometry=skin.geometry;
  assert.equal(skeleton.bones.length,29,'five skin-only pivots support the folded right leg');
  assert.equal(skin.userData.toeDigits.R.length,6);assert.equal(skin.userData.toeDigits.L.length,5);
  assert(p.count<originalP.count+2500,'toes and rounded forefeet stay in one skin with a small vertex increase');
  let skins=0;root.traverse(o=>{if(o.isSkinnedMesh)skins++;});assert.equal(skins,1);
  const used=new Set(index);
  for(const [side,digits]of Object.entries(skin.userData.toeDigits)){
    const boxes=digits.map(digit=>new THREE.Box3().setFromPoints(Array.from({length:digit.count},(_,i)=>rest(digit.start+i))));
    assert(boxes.every(box=>box.max.z>.09&&box.min.z<.055),'every toe has a distinct tip and a root buried in the sealed foot');
    assert(Math.max(...boxes.map(b=>b.max.z))-Math.min(...boxes.map(b=>b.max.z))>.03,'toe tips have a natural descending outline instead of an even comb');
    assert(digits.every(d=>d.direction[0]*(side==='R'?1:-1)>.1),'all toes fan along the foot outward rather than turning inward');
    const x=boxes.map(box=>box.getCenter(new THREE.Vector3()).x);assert(new Set(x.map(v=>v.toFixed(4))).size===digits.length,'all requested toes have separate lateral centres');
    for(const digit of digits)assert(Array.from({length:digit.count},(_,i)=>used.has(digit.start+i)).some(Boolean));
  }
  // Complete material rings through the real knee/ankle mesh, rather than a
  // bone-position test that could miss a visually severed or flattened joint.
  const rings=[];
  for(const y of [.085,.095,.175,.185,.195,.205,.215,.225,.285]){
    const adjacent=new Map(),points=new Map();
    for(let i=0;i<index.length;i+=3){
      const tri=[index[i],index[i+1],index[i+2]],hits=[];
      for(let k=0;k<3;k++){
        const a=tri[k],b=tri[(k+1)%3],ay=p.getY(a),by=p.getY(b);if((ay-y)*(by-y)>=0)continue;
        const key=a<b?`${a}/${b}`:`${b}/${a}`,t=(y-ay)/(by-ay);points.set(key,{a,b,t,rest:rest(a).lerp(rest(b),t)});hits.push(key);
      }
      if(hits.length===2)for(let k=0;k<2;k++){if(!adjacent.has(hits[k]))adjacent.set(hits[k],[]);adjacent.get(hits[k]).push(hits[1-k]);}
    }
    const visited=new Set();for(const start of adjacent.keys()){
      if(visited.has(start))continue;let previous=null,current=start;const loop=[];
      do{assert(!visited.has(current));visited.add(current);loop.push(points.get(current));assert.equal(adjacent.get(current).length,2);const next=adjacent.get(current).find(key=>key!==previous);previous=current;current=next;}while(current!==start);
      if(loop.every(point=>point.rest.x<-.04))rings.push({y,points:loop,area:area(loop.map(point=>point.rest))});
    }
  }
  assert(rings.length>=8,'right-leg sections are closed from ankle through knee');
  let minimum=Infinity;
  const checkRings=label=>{for(const ring of rings){const ratio=area(ring.points.map(v=>posed(v.a).lerp(posed(v.b),v.t)))/ring.area;minimum=Math.min(minimum,ratio);assert(ratio>.65,`${label}: right leg ${ring.y} retains a full section (${ratio.toFixed(3)})`);}};
  settle({handWalking:true});checkRings('idle');
  const rightFoot=[];for(const i of used)if(p.getX(i)<-.075&&p.getY(i)<.065)rightFoot.push(i);
  const armJoints=new Set(['Forearm_L','Hand_L'].map(name=>skeleton.bones.findIndex(b=>b.name===name))),rightArm=[];
  for(let i=0;i<originalP.count;i++){let amount=0;for(let c=0;c<4;c++)if(armJoints.has(originalJ.array[i*4+c]))amount+=originalW.array[i*4+c];if(amount>.7)rightArm.push(i);}
  let projectionGap=Infinity;
  const checkClearance=()=>{
    const actorPoint=i=>root.worldToLocal(skin.localToWorld(posed(i))),arm=rightArm.map(actorPoint);
    for(const i of rightFoot){const foot=actorPoint(i),band=arm.filter(point=>Math.abs(point.y-foot.y)<.025);if(!band.length)continue;const gap=foot.x-Math.max(...band.map(point=>point.x));projectionGap=Math.min(projectionGap,gap);assert(gap>.015,`right foot and right arm have separate frontal outlines (${gap})`);}
    const bonePoint=name=>{const p=root.worldToLocal(skeleton.getBoneByName(name).getWorldPosition(new THREE.Vector3()));p.z=0;return p;};
    const triangle=new THREE.Triangle(...['Thigh_L','Shin_L','Foot_L'].map(bonePoint));
    for(const name of ['UpperArm_L','Forearm_L','Hand_L']){const bary=triangle.getBarycoord(bonePoint(name),new THREE.Vector3());assert(Math.min(bary.x,bary.y,bary.z)>-.035,`the ${name} stays tucked inside the folded right leg (${bary.toArray()})`);}
  };
  for(const fps of [30,60,144])for(const speed of [0,1.55,3.45,6.2]){
    settle({handWalking:true,speed,state:'chase'});
    for(let frame=0;frame<fps;frame++){model.animate(1/fps,{handWalking:true,speed,state:'chase'});if(frame%Math.max(1,Math.floor(fps/12))===0){root.updateMatrixWorld(true);checkRings(`${fps}/${speed}/${frame}`);checkClearance();}}
  }
  for(const [state,time]of [['slam',.4],['slam',.68],['pull',.46],['kick',.12],['block',.2],['stunned',.3]]){settle({handWalking:true,state,actionTime:time});checkRings(state);}
  // The original ordinary/prone/down surfaces must remain mathematically
  // equivalent despite the new weights and skin-only support matrices.
  for(const options of [{},{intelligent:true},{state:'chase',speed:3.45},{state:'block',actionTime:.5},{state:'down',stun:3},{state:'bed-search',actionTime:1.3}]){
    settle(options);
    for(let i=0;i<originalP.count;i++){
      const actual=skin.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(skin.geometry.attributes.position,i));
      assert(actual.distanceTo(originalPose(i))<2e-6,'other forms preserve the complete original surface, including their old toes');
    }
    assert(!skin.userData.extraToes);assert.equal(skin.geometry.attributes.position.count,originalP.count);assert.deepEqual(skin.geometry.index.array,originalSkin.geometry.index.array,'Fool/Nerd retain the complete original foot silhouette');
    assert.deepEqual(skin.geometry.attributes.position.array,originalP.array,'other modes retain all original foot vertices');
  }
  const originalGeometry=skin.geometry,geometryIds=new Set();
  for(let i=0;i<40;i++){model.animate(0,{handWalking:i%2===0,state:i%3===0?'down':'patrol',stun:3});geometryIds.add(skin.geometry.id);assert.equal(skin.userData.extraToes,i%2===0);}
  assert.equal(geometryIds.size,2,'changing form reuses two prepared geometries, including Ninja knockdowns');
  settle({handWalking:true,state:'pull',actionTime:.46});const grip=skin.geometry.morphAttributes.position[1];
  for(const digit of skin.userData.toeDigits.R)assert(Array.from({length:digit.count},(_,i)=>rest(digit.start+i).distanceTo(new THREE.Vector3().fromBufferAttribute(grip,digit.start+i))).some(d=>d>.005),'all six left toes participate in the existing grip morph');
  delete globalThis.document;fallback=createNaiwaModel();assert(!(await fallback.ready));fallback.animate(.5,{handWalking:true});
  assert.equal(fallback.root.getObjectByName('naiwa:left-foot').userData.toeCount,6);assert.equal(fallback.root.getObjectByName('naiwa:right-foot').userData.toeCount,5);
  let disposed=0;for(const geometry of [originalGeometry,variantGeometry])geometry.addEventListener('dispose',()=>disposed++);model.dispose();model=null;assert.equal(disposed,2,'both mode geometries are released exactly once');
  console.log(`Feet OK: Ninja/Transcendent have six left/five right rounded, outward-fanning toes in one skin; original toes elsewhere, working grip and fallback; right arm tucked in folded leg, knee/ankle sections retain ${(minimum*100).toFixed(1)}%, foot/arm gap ${(projectionGap*100).toFixed(1)}cm at 30/60/144 FPS; original surfaces in other forms.`);
}finally{model?.dispose();fallback?.dispose();for(const [key,value]of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
