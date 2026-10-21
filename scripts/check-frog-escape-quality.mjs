import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {ESCAPE_QUALITY,ESCAPE_QUALITY_KEY,readEscapeQuality,qualityPixelRatio,createEscapeQuality,bindEscapeQualityControls} from '../src/frog-escape-quality.js';
import {setEscapeLanguage} from '../src/frog-escape-i18n.js';
import {createQualityEffects,CONTACT_OCCLUSION} from '../src/frog-escape-quality-effects.js';
import {createCastleDetailMaps} from '../src/frog-escape-surface-detail.js';

// A family has coherent color/normal/roughness maps, rather than the same
// random roughness pattern on every surface. Pure generation works without DOM.
const familySamples=new Map();
for(const kind of ['wood','stone','plaster','tile','slate']){
  const detail=createCastleDetailMaps(kind,{size:128});familySamples.set(kind,detail);
  for(const key of ['map','normalMap','roughnessMap']){
    const texture=detail[key];assert(texture.isDataTexture);assert.equal(texture.image.width,128);assert.equal(texture.wrapS,THREE.RepeatWrapping);assert(texture.generateMipmaps);
    assert.equal(texture.colorSpace,key==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace);
    const values=new Set();for(let i=0;i<texture.image.data.length;i+=4)values.add(texture.image.data[i]);assert(values.size>=8,`${kind} ${key} retains spatial detail`);
  }
  const normals=detail.normalMap.image.data;for(let i=0;i<normals.length;i+=64){const length=Math.hypot(normals[i]/127.5-1,normals[i+1]/127.5-1,normals[i+2]/127.5-1);assert(Math.abs(length-1)<.015,`${kind} normals remain unit length`);}
}
const woodAgain=createCastleDetailMaps('wood',{size:128});assert.deepEqual(woodAgain.map.image.data,familySamples.get('wood').map.image.data,'detail generation is deterministic');woodAgain.dispose();
const tileRoughness=familySamples.get('tile').roughnessMap.image.data;
assert(tileRoughness[(16*128+16)*4]+100<tileRoughness[(16*128)*4],'glazed tile is smoother than recessed grout');
for(const [kind,detail]of familySamples)for(const [other,candidate]of familySamples)if(kind!==other)assert.notDeepEqual(detail.map.image.data,candidate.map.image.data,`${kind} and ${other} retain different material character`);
familySamples.forEach(detail=>detail.dispose());

const store=new Map([['story-save','unchanged']]),writes=[];
globalThis.localStorage={getItem:key=>store.get(key),setItem:(key,value)=>{store.set(key,value);writes.push(key);}};
assert.equal(readEscapeQuality(),'balanced');store.set(ESCAPE_QUALITY_KEY,'invalid');assert.equal(readEscapeQuality(),'balanced');
Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('disabled');}});assert.equal(readEscapeQuality(),'balanced');
Object.defineProperty(globalThis,'localStorage',{configurable:true,writable:true,value:{getItem:key=>store.get(key),setItem:(key,value)=>{store.set(key,value);writes.push(key);}}});
assert.equal(qualityPixelRatio('balanced',{dpr:3,mobile:true}),1.3);assert.equal(qualityPixelRatio('balanced',{dpr:3}),1.8);
assert.equal(qualityPixelRatio('low',{dpr:3,mobile:true}),.75);assert(qualityPixelRatio('low',{dpr:3,width:1920,height:1080})**2*1920*1080<=960*540+1);

const scene=new THREE.Scene(),moon=new THREE.DirectionalLight(),torch=new THREE.SpotLight(),camera=new THREE.PerspectiveCamera();scene.add(moon,torch,camera);
moon.castShadow=torch.castShadow=true;moon.shadow.mapSize.set(2048,2048);torch.shadow.mapSize.set(512,512);
const map=new THREE.Texture(),bump=new THREE.Texture(),material=new THREE.MeshStandardMaterial({map,bumpMap:bump,bumpScale:.02});material.userData.castleSurface='wood';
const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);scene.add(mesh);
const extraOriginal={map:new THREE.Texture(),bumpMap:new THREE.Texture(),normalMap:new THREE.Texture(),roughnessMap:new THREE.Texture()};
const extraMaterial=new THREE.MeshStandardMaterial(extraOriginal);extraMaterial.normalScale.set(.4,.7);extraMaterial.userData.castleSurface='stone';scene.add(new THREE.Mesh(new THREE.BoxGeometry(),extraMaterial));
const extraKinds=['plaster','tile','slate'].map(kind=>{const m=new THREE.MeshStandardMaterial();m.userData.castleSurface=kind;scene.add(new THREE.Mesh(new THREE.BoxGeometry(),m));return m;});
const anotherWood=material.clone();scene.add(new THREE.Mesh(new THREE.BoxGeometry(),anotherWood));
const leaves=new THREE.InstancedMesh(new THREE.BoxGeometry(),material,100);leaves.name='vegetation:long-leaves';scene.add(leaves);
const lights=Array.from({length:11},(_,i)=>{const light=new THREE.PointLight(0xffffff,5,10,2);light.position.set(i,0,0);scene.add(light);return light;});
const fridge=new THREE.Group();fridge.visible=false;fridge.add(lights[0]);scene.add(fridge);
const renderer={capabilities:{maxTextureSize:4096,maxSamples:4,getMaxAnisotropy:()=>16},shadowMap:{},ratio:1,renders:0,
  setPixelRatio(value){this.ratio=value;},getPixelRatio(){return this.ratio;},setSize(w,h){this.size=[w,h];},render(){this.renders++;},};
let effectCreated=0,effectDisposed=0,effectRenders=0,resolveLoad;
const effectsModule={createQualityEffects(){effectCreated++;return {resize(w,h,dpr){assert(w>0&&h>0&&dpr>0);},render(c){assert.equal(c,camera);effectRenders++;},dispose(){effectDisposed++;}};}};
const quality=createEscapeQuality({renderer,scene,moonlight:moon,flashlight:torch,mobile:true,dpr:()=>3,loadEffects:()=>new Promise(resolve=>resolveLoad=resolve)});
quality.resize(1000,700);assert.equal(quality.id,'balanced');assert.equal(renderer.ratio,1.3);assert.equal(moon.shadow.mapSize.x,2048);assert.equal(torch.shadow.mapSize.x,512);assert(torch.castShadow);assert.equal(material.bumpMap,bump);
assert(!quality.setQuality('garbage'));assert.equal(quality.id,'balanced');
quality.setQuality('low');assert.equal(renderer.ratio,.75);assert.equal(moon.shadow.mapSize.x,768);assert(!torch.castShadow);assert.equal(material.bumpMap,null);assert.equal(leaves.count,35);assert(lights.every(light=>light.layers.mask===0));
for(const fps of [30,60,144]){quality.invalidate();let requests=0;for(let i=0;i<fps;i++){quality.render(camera,{dt:1/fps,playing:false,dirty:true});if(renderer.shadowMap.needsUpdate)requests++;renderer.shadowMap.needsUpdate=false;}assert(requests>=9&&requests<=11,`10 Hz low shadows retain their cadence at ${fps} FPS`);}
quality.render(camera,{dt:1/60});const pool=scene.children.filter(o=>o.name==='quality:nearby-light');assert.equal(pool.filter(light=>light.visible).length,4);assert.equal(pool[0].position.x,1,'hidden fridge light cannot become a visible proxy');
let fullSceneUpdates=0;const updateScene=scene.updateMatrixWorld;scene.updateMatrixWorld=function(...args){fullSceneUpdates++;return updateScene.apply(this,args);};
quality.render(camera,{dt:.3});assert.equal(fullSceneUpdates,0,'nearby light selection does not traverse every scene matrix');scene.updateMatrixWorld=updateScene;
assert.equal(torch.visible,true,'lower quality never turns off gameplay illumination');
lights[1].userData.escapeFlickerGlow=new THREE.Object3D();lights[1].intensity=0;
quality.render(camera,{dt:.3});assert.equal(pool[0].userData.qualitySource,lights[1],'a temporarily dark lamp keeps its slot instead of replacing it with another lit source');assert.equal(pool[0].intensity,0);
lights[1].intensity=5;quality.render(camera,{dt:1/60});assert.equal(pool[0].intensity,5,'lamp recovery reaches the same low-quality light immediately');
for(let i=0;i<420;i++)quality.render(camera,{dt:.035,frameMs:35,playing:true,dirty:true});assert(quality.resolutionScale<1);const reduced=quality.resolutionScale;
for(let i=0;i<600;i++)quality.render(camera,{dt:1/60,frameMs:16.67,playing:false});assert.equal(quality.resolutionScale,reduced,'paused/map frames cannot adapt render resolution');
for(let i=0;i<1000;i++)quality.render(camera,{dt:1/60,frameMs:16.67,playing:true});assert(quality.resolutionScale>reduced&&quality.resolutionScale<=1);
quality.setQuality('high');assert.equal(moon.shadow.mapSize.x,4096);assert.equal(torch.shadow.mapSize.x,1024);assert(torch.castShadow);assert.equal(material.bumpMap,null);assert(material.map?.isDataTexture);assert(material.normalMap?.isDataTexture);assert(material.roughnessMap?.isDataTexture);assert.equal(leaves.count,100);assert(lights.every(light=>light.layers.mask===1));
assert.equal(material.map.image.width,512);assert.notEqual(material.map,map,'high replaces the coarse color map as well as light-response detail');assert.equal(anotherWood.map,material.map,'one detail bundle is shared by every material in a family');assert.equal(anotherWood.normalMap,material.normalMap);assert(extraMaterial.normalScale.equals(new THREE.Vector2(1,1)));
const firstDetailTextures=new Set([material,extraMaterial,...extraKinds].flatMap(m=>[m.map,m.normalMap,m.roughnessMap]));assert.equal(firstDetailTextures.size,15);let detailDisposals=0;firstDetailTextures.forEach(texture=>texture.addEventListener('dispose',()=>detailDisposals++));
assert.equal(moon.shadow.normalBias,.012);assert.equal(torch.shadow.normalBias,.008);assert.equal(moon.shadow.camera.far,95);assert.equal(moon.shadow.camera.near,1);assert.equal(moon.shadow.bias,-.00004);
quality.setQuality('balanced');resolveLoad(effectsModule);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(effectCreated,0,'late effects load must not reactivate high graphics');
assert.equal(detailDisposals,15,'downshifting releases all high-only GPU textures');assert.equal(material.map,map);assert.equal(material.normalMap,null);for(const [key,texture]of Object.entries(extraOriginal))assert.equal(extraMaterial[key],texture,`balanced restores original ${key}`);assert(extraMaterial.normalScale.equals(new THREE.Vector2(.4,.7)));
quality.setQuality('high');resolveLoad(effectsModule);await new Promise(resolve=>setTimeout(resolve,0));quality.render(camera);assert.equal(effectCreated,1);assert.equal(effectRenders,1);
assert(!firstDetailTextures.has(material.map),'reentering high builds fresh resources after disposal');
quality.setQuality('balanced');assert.equal(effectDisposed,1);assert.equal(material.roughnessMap,null);assert.equal(material.bumpMap,bump);assert.equal(renderer.ratio,1.3);assert.equal(moon.shadow.camera.far,500);assert.equal(moon.shadow.normalBias,0);assert.equal(torch.shadow.normalBias,0);
quality.setQuality('low');const laterMaterial=new THREE.MeshStandardMaterial({bumpMap:new THREE.Texture()});const later=new THREE.Mesh(new THREE.BoxGeometry(),laterMaterial);scene.add(later);assert.equal(laterMaterial.bumpMap,null,'late-held/dropped models adopt current quality');
class Control extends EventTarget{value='';textContent='';}
const controls=new Map(['#escape-quality','#escape-pause-quality','#escape-quality-help'].map(key=>[key,new Control()]));const refresh=bindEscapeQualityControls(quality,{querySelector:key=>controls.get(key)});
controls.get('#escape-pause-quality').value='balanced';controls.get('#escape-pause-quality').dispatchEvent(new Event('change'));assert.equal(quality.id,'balanced');assert.equal(controls.get('#escape-quality').value,'balanced');
assert(writes.every(key=>key===ESCAPE_QUALITY_KEY));const preferenceWrites=writes.length;
setEscapeLanguage('en');refresh();assert(!/\p{Script=Han}/u.test(controls.get('#escape-quality-help').textContent));setEscapeLanguage('zh');refresh();
assert(writes.slice(preferenceWrites).every(key=>key==='naiwa-language-override-v1'));assert.equal(store.get('story-save'),'unchanged');assert.equal(readEscapeQuality(),'balanced');
Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('disabled');}});assert(quality.setQuality('low'),'storage disabled still permits live quality switching');
quality.dispose();assert.equal(leaves.count,100);assert(lights.every(light=>light.layers.mask===1));
// Disposal while high must also restore original material state and release
// every shared bundle once, including original anisotropy and normal scales.
Object.defineProperty(globalThis,'localStorage',{configurable:true,writable:true,value:{getItem:()=> 'high',setItem(){}}});
const highAtDispose=createEscapeQuality({renderer,scene,moonlight:moon,flashlight:torch,loadEffects:async()=>effectsModule}),finalTextures=new Set([material,extraMaterial,...extraKinds].flatMap(m=>[m.map,m.normalMap,m.roughnessMap]));let finalDisposals=0;
finalTextures.forEach(texture=>texture.addEventListener('dispose',()=>finalDisposals++));highAtDispose.dispose();highAtDispose.dispose();assert.equal(finalDisposals,15,'idempotent high disposal releases each texture once');assert.equal(material.map,map);assert.equal(material.bumpMap,bump);assert.equal(material.normalMap,null);for(const [key,texture]of Object.entries(extraOriginal))assert.equal(extraMaterial[key],texture);assert(extraMaterial.normalScale.equals(new THREE.Vector2(.4,.7)));assert.equal(map.anisotropy,1,'original anisotropy is restored on disposal');
// Exercise the real postprocessing passes with a recording renderer: no browser
// or GPU pixels, but both camera paths, buffer sizes and disposal are checked.
const transparentShadow=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial({transparent:true,depthWrite:false}));scene.add(transparentShadow);
const targets=new Set(),calls=[],clearColor=new THREE.Color(),pipelineRenderer={capabilities:{maxSamples:4},autoClear:true,outputColorSpace:THREE.SRGBColorSpace,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.15,
  getPixelRatio:()=>1.3,getSize:target=>target.set(1000,700),getRenderTarget(){return this.target??null;},setRenderTarget(target){this.target=target;if(target)targets.add(target);},
  getClearColor:target=>target.copy(clearColor),getClearAlpha:()=>1,setClearColor:color=>clearColor.set(color),setClearAlpha(){},clear(){},render(object,c){
    if(object===scene&&scene.overrideMaterial)assert(!transparentShadow.visible,'transparent contact planes cannot become opaque AO occluders');
    const u=object.material?.uniforms;calls.push({object,c,contact:u?.kernelRadius?{radius:u.kernelRadius.value,min:u.minDistance.value,max:u.maxDistance.value,near:u.cameraNear.value,far:u.cameraFar.value}:null});
  },};
const actualEffects=createQualityEffects(pipelineRenderer,scene);actualEffects.resize(1000,700,1.3);actualEffects.render(camera);
const mapCamera=new THREE.PerspectiveCamera(38,1.5,.1,150);actualEffects.render(mapCamera);
assert.equal(calls.filter(call=>call.object===scene&&call.c===camera).length,2);assert.equal(calls.filter(call=>call.object===scene&&call.c===mapCamera).length,2);
assert(transparentShadow.visible,'normal pass restores original visibility');
for(const {contact}of calls.filter(call=>call.contact)){
  assert.equal(contact.radius,CONTACT_OCCLUSION.radius);assert(contact.radius<1,'AO cannot project metre-scale upright silhouettes');
  const range=contact.far-contact.near;assert(Math.abs(contact.min*range-CONTACT_OCCLUSION.minGap)<1e-8);assert(Math.abs(contact.max*range-CONTACT_OCCLUSION.maxGap)<1e-8,'contact gap stays in world metres across both cameras');
}
assert([...targets].some(target=>target.width===975&&target.height===683),'SSAO targets use 75% render size');assert([...targets].some(target=>target.width===1300&&target.height===910),'color buffers keep full preset clarity');
assert.equal(pipelineRenderer.getRenderTarget(),null);let disposedTargets=0;targets.forEach(target=>target.addEventListener('dispose',()=>disposedTargets++));actualEffects.dispose();assert.equal(disposedTargets,targets.size);
const html=readFileSync('frog-escape-map.html','utf8');for(const id of ['escape-quality','escape-pause-quality'])assert(html.includes(`id="${id}"`));for(const preset of Object.values(ESCAPE_QUALITY))assert(html.includes(preset.label));
const source=readFileSync('src/frog-escape-map.js','utf8');assert(source.includes('document.hidden'));assert(source.includes('orbitChanged||renderRequested||quality.needsShadowUpdate'));
console.log('Graphics: defaults/persistence, storage denial, live selectors, all presets, adaptive low resolution, light visibility, shadow sizes, material restoration, async effects races/disposal and localization passed.');
