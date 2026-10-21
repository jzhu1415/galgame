import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEscapeWater,WATER_MAX_RIPPLES,WATER_RIPPLE_LIFETIME} from '../src/frog-escape-water-renderer.js';

const scene=new THREE.Scene(),tub=new THREE.Group(),pool=new THREE.Group();
tub.position.set(-4,5.15,3);tub.rotation.y=Math.PI/2;tub.scale.set(1.0625,1,1.0625);
pool.position.set(3,-.1,12);pool.rotation.y=-Math.PI/5;
scene.add(tub,pool);scene.add(new THREE.HemisphereLight(0x97c7dc,0x27281d,.55),new THREE.DirectionalLight(0xd8e5ff,2));
const volumes=[Object.freeze({id:'tub',root:tub,shape:'rectangle',width:1.8,depth:.85,surfaceY:.52,bottomY:.18}),
  Object.freeze({id:'pool',root:pool,shape:'semicircle',radius:2.5,surfaceY:.14,bottomY:-.24})];
const water=createEscapeWater({scene,volumes});
assert.equal(water.quality,'balanced');assert.equal(water.elapsed,0);assert.equal(water.rippleCount,0);assert.equal(water.surfaces.length,2);
const surfaces=water.surfaces.slice();
for(const [index,surface]of surfaces.entries()){
  assert.equal(surface.parent,volumes[index].root);assert.equal(surface.position.y,volumes[index].surfaceY+.002);
  assert.equal(surface.userData.solid,false);assert.equal(surface.userData.dynamic,true);assert.equal(surface.userData.escapeWater,true);
  assert(surface.material.transparent);assert.equal(surface.material.depthWrite,false);assert.equal(surface.castShadow,false);
  const hits=[];surface.raycast(new THREE.Raycaster(),hits);assert.equal(hits.length,0,'water does not intercept item/door interaction rays');
  for(const position of surface.geometry.attributes.position.array)assert(Number.isFinite(position));
}
const rectangle=surfaces[0].geometry.boundingBox;
assert(Math.abs(rectangle.min.x+.9)<1e-6&&Math.abs(rectangle.max.x-.9)<1e-6);
const half=surfaces[1].geometry.attributes.position;
for(let i=0;i<half.count;i++){
  assert(half.getZ(i)<=1e-6,'semicircle water stays behind the straight edge');
  assert(half.getX(i)**2+half.getZ(i)**2<=2.5**2+1e-5,'semicircle water stays inside the circular rim');
}
const worldPoint=(volume,x,z)=>volume.root.localToWorld(new THREE.Vector3(x,volume.surfaceY,z));
const compile=material=>{
  const source=material.isMeshPhysicalMaterial?THREE.ShaderLib.physical:THREE.ShaderLib.standard;
  const shader={uniforms:{},vertexShader:source.vertexShader,fragmentShader:source.fragmentShader};
  material.onBeforeCompile(shader,{});return shader;
};
const initialShader=compile(surfaces[0].material);
assert(initialShader.vertexShader.includes('transformed.y+=escapeWaterWave(position.xz).x'));
assert(initialShader.fragmentShader.includes('normal=normalize(normal-normalize(vEscapeWaterTangentX)'));
assert(initialShader.fragmentShader.includes('waterFresnel'));
assert(initialShader.fragmentShader.includes('totalEmissiveRadiance+=vec3(.13,.20,.23)*waterFresnel*.24'));
assert.equal(initialShader.uniforms.escapeWaterRipples.value.length,WATER_MAX_RIPPLES);

assert(water.disturb(volumes[0],worldPoint(volumes[0],.35,-.2),1));
assert.equal(water.rippleCount,1);
const firstRipple=initialShader.uniforms.escapeWaterRipples.value.find(ripple=>ripple.w>0);
assert(Math.abs(firstRipple.x-.35)<1e-6&&Math.abs(firstRipple.y+.2)<1e-6,'ripple centers respect rotated/scaled basin transforms');
assert.equal(firstRipple.z,0);assert.equal(firstRipple.w,1);
assert(!water.disturb(volumes[0],worldPoint(volumes[0],1.2,0)), 'outside the rectangle cannot splash');
assert(!water.disturb(volumes[1],worldPoint(volumes[1],0,.1)), 'the missing half of the pool cannot splash');
assert(!water.disturb(volumes[1],worldPoint(volumes[1],2.6,-.1)), 'outside the circular rim cannot splash');
assert(!water.disturb('missing',{x:0,y:0,z:0}));assert(!water.disturb(volumes[0],{x:NaN,y:0,z:0}));
assert(!water.disturb(volumes[0],worldPoint(volumes[0],0,0),0));
for(const dt of [0,-.1,NaN,Infinity])assert.equal(water.tick(dt),false);
assert.equal(water.elapsed,0);assert.equal(firstRipple.z,0);assert.equal(firstRipple.w,1,'menu/hidden zero-dt ticks do not age waves');
assert(water.tick(.4));assert.equal(initialShader.uniforms.escapeWaterTime.value,.4);

let retiredGeometries=0,retiredMaterials=0,createdGeometries=0,createdMaterials=0;
const geometries=new Set(),materials=new Set();
function track(){for(const surface of water.surfaces){
  if(!geometries.has(surface.geometry)){geometries.add(surface.geometry);createdGeometries++;surface.geometry.addEventListener('dispose',()=>retiredGeometries++);}
  if(!materials.has(surface.material)){materials.add(surface.material);createdMaterials++;surface.material.addEventListener('dispose',()=>retiredMaterials++);}
}}
track();
assert(!water.setQuality('ultra'));assert.equal(water.quality,'balanced');
assert(water.setQuality('high'));track();
assert.equal(retiredMaterials,2);assert.equal(retiredGeometries,2);
for(const [index,surface]of water.surfaces.entries()){
  assert.equal(surface,surfaces[index],'live quality switches retain surface objects and descriptor transforms');
  assert(surface.material.isMeshPhysicalMaterial);assert.equal(surface.material.ior,1.333);
  assert.equal(surface.material.transmission,0,'clear water avoids a screen-sized transmission buffer');
  assert(surface.material.opacity<.4,'the basin remains visible through clear water');
  assert.equal(surface.material.envMap,null);assert.equal(surface.material.depthWrite,false);assert(surface.material.clearcoat>0);
  const shader=compile(surface.material);assert.equal(shader.uniforms.escapeWaterTime.value,.4);
  assert(shader.fragmentShader.includes('clearcoatNormal=normal;'),'physical clearcoat uses the same ripple normals');
  assert(shader.vertexShader.includes(`escapeWaterRipples[${WATER_MAX_RIPPLES}]`));
}
assert.equal(water.rippleCount,1,'quality switches retain waves instead of resetting entry feedback');
assert.equal(compile(water.surfaces[0].material).uniforms.escapeWaterRipples,initialShader.uniforms.escapeWaterRipples);

// Each basin has a fixed uniform budget, even during long continuous wading.
for(let i=0;i<WATER_MAX_RIPPLES*3;i++){
  water.tick(.02);assert(water.disturb(volumes[0],worldPoint(volumes[0],0,0),4));
}
assert.equal(water.rippleCount,WATER_MAX_RIPPLES);assert(initialShader.uniforms.escapeWaterRipples.value.every(ripple=>ripple.w<=2));
assert(water.disturb('pool',worldPoint(volumes[1],.1,-.6),.7));assert.equal(water.rippleCount,WATER_MAX_RIPPLES+1);
water.tick(WATER_RIPPLE_LIFETIME+.01);assert.equal(water.rippleCount,0,'expired rings retire and their uniform slots are reusable');
for(const fps of [30,60,144]){
  assert(water.disturb(volumes[0],worldPoint(volumes[0],0,0)));
  for(let i=0;i<Math.ceil(fps*(WATER_RIPPLE_LIFETIME+.05));i++)water.tick(1/fps);
  assert.equal(water.rippleCount,0,`ripple lifetime remains consistent at ${fps} FPS`);
}

assert(water.setQuality('low'));track();
for(const surface of water.surfaces){
  assert(surface.material.isMeshBasicMaterial);assert(surface.material.transparent);assert.equal(surface.material.depthWrite,false);
  assert.equal(surface.material.transmission,undefined);assert(surface.geometry.attributes.position.count<100);
  const original=surface.geometry.attributes.position.array.slice();water.tick(.1);
  assert.deepEqual(surface.geometry.attributes.position.array,original,'low water never updates CPU vertices');
}
assert.equal(water.tick(.1),false,'a static low-quality surface does not force background redraws');
assert(water.disturb(volumes[0],worldPoint(volumes[0],0,0)));
water.tick(WATER_RIPPLE_LIFETIME+.01);assert.equal(water.rippleCount,0,'low quality also retires old disturbance state');
for(const quality of ['high','balanced','low','high','balanced','high']){assert(water.setQuality(quality));track();}
assert.equal(retiredGeometries,createdGeometries-2);assert.equal(retiredMaterials,createdMaterials-2,'quality switches dispose every replaced material');
const lastGeometry=water.surfaces[0].geometry;assert(water.setQuality('high'));assert.equal(water.surfaces[0].geometry,lastGeometry,'setting the same preset does not allocate resources');
tub.visible=pool.visible=false;assert.equal(water.tick(.01),false,'hidden basins do not request an animated redraw');tub.visible=true;assert(water.tick(.01));
const before=water.elapsed;water.dispose();water.dispose();
assert(water.surfaces.every(surface=>surface.parent===null));assert.equal(retiredGeometries,createdGeometries);assert.equal(retiredMaterials,createdMaterials);
assert.equal(water.rippleCount,0);assert(!water.tick(1));assert.equal(water.elapsed,before);assert(!water.setQuality('low'));assert(!water.disturb(volumes[0],worldPoint(volumes[0],0,0)));
assert.equal(scene.environment,null,'the nighttime water works without an environment map');
console.log('Water renderer: passable clear surfaces, correct rectangle/semicircle shapes, transformed bounded ripples, real Three shader hooks, all quality levels, pause/lifetime behavior and complete disposal passed.');
