import * as THREE from 'three';
import {tr} from './frog-escape-i18n.js';

export const ESCAPE_QUALITY_KEY='naiwa-escape-quality-v1';
export const ESCAPE_QUALITY=Object.freeze({
  low:Object.freeze({label:'低画质 · Best Performance',description:'适合手机：优先帧率，降低渲染分辨率、阴影和装饰细节。',desktopDpr:1,mobileDpr:.75,pixels:960*540,moonShadow:768,torchShadow:0,shadowHz:10,anisotropy:1,pointLights:4}),
  balanced:Object.freeze({label:'中等画质 · Balanced',description:'默认画质：保留原有画面，兼顾清晰度与流畅度。',desktopDpr:1.8,mobileDpr:1.3,pixels:Infinity,moonShadow:2048,torchShadow:512,shadowHz:60,anisotropy:4,pointLights:Infinity}),
  high:Object.freeze({label:'高画质 · Best Quality',description:'更细腻的阴影、接触阴影与表面粗糙度细节，适合性能较强的设备。',desktopDpr:2,mobileDpr:1.6,pixels:2560*1440,moonShadow:4096,torchShadow:1024,shadowHz:60,anisotropy:8,pointLights:Infinity}),
});
export function readEscapeQuality(storage){try{const id=(storage??globalThis.localStorage)?.getItem(ESCAPE_QUALITY_KEY);return Object.hasOwn(ESCAPE_QUALITY,id)?id:'balanced';}catch{return 'balanced';}}
export function qualityPixelRatio(id,{dpr=1,mobile=false,width=1,height=1,scale=1}={}){
  const preset=ESCAPE_QUALITY[id]??ESCAPE_QUALITY.balanced;
  return Math.max(.25,Math.min(dpr,mobile?preset.mobileDpr:preset.desktopDpr,Math.sqrt(preset.pixels/Math.max(1,width*height)))*scale);
}

// High quality varies reflected light across grain/mortar, without external assets.
function roughnessTexture(kind){
  const size=256,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const noise=Math.sin(x*17.13+y*83.71)*43758.5453,grain=noise-Math.floor(noise);
    const mortar=kind==='wood'?x%32<2||y%75<2:x%64<2||y%32<2;
    const value=Math.round(255*(mortar?.99:.78+grain*.18)),index=(y*size+x)*4;
    data[index]=data[index+1]=data[index+2]=value;data[index+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
function resizeShadow(light,size){
  if(!light?.shadow||!size)return;
  if(light.shadow.mapSize.x===size)return;
  light.shadow.map?.dispose();light.shadow.mapPass?.dispose();light.shadow.map=null;light.shadow.mapPass=null;
  light.shadow.mapSize.set(size,size);light.shadow.needsUpdate=true;
}
const effectivelyVisible=object=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};

export function createEscapeQuality({renderer,scene,moonlight,flashlight,mobile=false,dpr=()=>globalThis.devicePixelRatio??1,onChange=()=>{},loadEffects=()=>import('./frog-escape-quality-effects.js')} ){
  let id=readEscapeQuality(),width=1,height=1,scale=1,shadowPending=true,lastShadow=-Infinity,elapsed=0,lightWait=0;
  let effects=null,effectsRequest=null,effectsFailed=false,disposed=false,frameAverage=16.7,adaptiveTime=0,warmup=0;
  const materials=new Map(),textures=new Map(),roughness=new Map(),lights=new Map(),ornaments=new Map(),watchers=[];
  const originalShadows=new Map([moonlight,flashlight].filter(Boolean).map(light=>[light,{normalBias:light.shadow.normalBias,bias:light.shadow.bias,near:light.shadow.camera.near,far:light.shadow.camera.far}]));
  const pointPool=Array.from({length:4},()=>{const light=new THREE.PointLight(0xffffff,0,1);light.name='quality:nearby-light';light.visible=false;scene.add(light);return light;});
  const position=new THREE.Vector3(),cameraPosition=new THREE.Vector3();
  function applyMaterial(material){
    if(!materials.has(material)){
      const onDispose=()=>materials.delete(material);material.addEventListener('dispose',onDispose);
      materials.set(material,{bumpMap:material.bumpMap,roughnessMap:material.roughnessMap,onDispose});
    }
    const original=materials.get(material),bump=id==='low'?null:original.bumpMap;
    let detail=original.roughnessMap;
    if(id==='high'&&material.userData.castleSurface){const kind=material.userData.castleSurface;if(!roughness.has(kind))roughness.set(kind,roughnessTexture(kind));detail=roughness.get(kind);}
    if(material.bumpMap!==bump||material.roughnessMap!==detail){material.bumpMap=bump;material.roughnessMap=detail;material.needsUpdate=true;}
    for(const texture of [material.map,material.bumpMap,material.normalMap,material.roughnessMap])if(texture){
      if(!textures.has(texture)){
        const onDispose=()=>textures.delete(texture);texture.addEventListener('dispose',onDispose);textures.set(texture,{anisotropy:texture.anisotropy,onDispose});
      }
      const value=Math.min(ESCAPE_QUALITY[id].anisotropy,renderer.capabilities.getMaxAnisotropy());
      if(texture.anisotropy!==value){texture.anisotropy=value;texture.needsUpdate=true;}
    }
  }
  function applyObject(root){
    root.traverse(object=>{
      for(const material of [object.material].flat().filter(Boolean))applyMaterial(material);
      if(object.isPointLight&&!pointPool.includes(object)){
        if(!lights.has(object))lights.set(object,object.layers.mask);
        object.layers.mask=id==='low'?0:lights.get(object);
      }
      if(object.isInstancedMesh&&object.name.startsWith('vegetation:')){
        if(!ornaments.has(object))ornaments.set(object,{count:object.count});
        object.count=id==='low'?Math.ceil(ornaments.get(object).count*.35):ornaments.get(object).count;
      }
    });
    shadowPending=true;
  }
  function watchRoot(root){
    if(!root)return;const listener=event=>{applyObject(event.child);onChange(id);};root.addEventListener('childadded',listener);watchers.push([root,listener]);
  }
  function updateSize(){
    const ratio=qualityPixelRatio(id,{dpr:dpr(),mobile,width,height,scale});
    if(Math.abs(renderer.getPixelRatio()-ratio)>.005)renderer.setPixelRatio(ratio);
    renderer.setSize(width,height,false);effects?.resize(width,height,ratio);shadowPending=true;
  }
  function startEffects(){
    if(disposed||id!=='high'||effects||effectsRequest||effectsFailed)return;
    if(renderer.extensions&&!renderer.extensions.has('EXT_color_buffer_float'))return;
    effectsRequest=loadEffects().then(module=>{
      if(!disposed&&id==='high'){effects=module.createQualityEffects(renderer,scene);effects.resize(width,height,renderer.getPixelRatio());onChange(id);}
    }).catch(()=>{effectsFailed=true;}).finally(()=>{effectsRequest=null;});
  }
  function configure(){
    scale=1;warmup=0;adaptiveTime=0;frameAverage=16.7;
    const preset=ESCAPE_QUALITY[id],max=renderer.capabilities.maxTextureSize??4096;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=id==='low'?THREE.PCFShadowMap:THREE.PCFSoftShadowMap;
    resizeShadow(moonlight,Math.min(preset.moonShadow,max));
    if(flashlight){flashlight.castShadow=preset.torchShadow>0;resizeShadow(flashlight,Math.min(preset.torchShadow,max));}
    for(const [light,original]of originalShadows){
      light.shadow.normalBias=id==='high'?(light===moonlight ? .012 : .008):original.normalBias;
      light.shadow.bias=id==='high'?-.00004:original.bias;
      light.shadow.camera.near=id==='high'&&light===moonlight?1:original.near;
      light.shadow.camera.far=id==='high'&&light===moonlight?95:original.far;
      light.shadow.camera.updateProjectionMatrix();
    }
    pointPool.forEach(light=>light.visible=id==='low');
    applyObject(scene);lightWait=0;updateSize();
    if(id!=='high'&&effects){effects.dispose();effects=null;}
    if(id!=='high'){roughness.forEach(texture=>texture.dispose());roughness.clear();}
    startEffects();lastShadow=-Infinity;shadowPending=true;onChange(id);
  }
  function setQuality(next){
    if(disposed||!Object.hasOwn(ESCAPE_QUALITY,next))return false;
    if(next===id)return true;id=next;
    try{globalThis.localStorage?.setItem(ESCAPE_QUALITY_KEY,id);}catch{}
    configure();return true;
  }
  function updateLights(camera,dt){
    if(id!=='low')return;
    for(const proxy of pointPool){const source=proxy.userData.qualitySource;if(source)proxy.intensity=effectivelyVisible(source)?source.intensity:0;}
    lightWait-=dt;if(lightWait>0)return;lightWait=.2;
    // getWorldPosition updates only the light's ancestor chain. A full scene
    // traversal here needlessly recalculated thousands of unrelated matrices.
    camera.getWorldPosition(cameraPosition);
    const candidates=[];for(const light of lights.keys())if(effectivelyVisible(light)&&(light.intensity>0||light.userData.escapeFlickerGlow)){
      light.getWorldPosition(position);candidates.push({light,position:position.clone(),distance:position.distanceToSquared(cameraPosition)});
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    pointPool.forEach((proxy,index)=>{const source=candidates[index];proxy.userData.qualitySource=source?.light??null;if(source){proxy.color.copy(source.light.color);proxy.intensity=source.light.intensity;proxy.distance=source.light.distance;proxy.decay=source.light.decay;proxy.position.copy(source.position);}else proxy.intensity=0;});
  }
  function adapt(frameMs,playing){
    if(id!=='low'||!playing||!Number.isFinite(frameMs)||frameMs>180)return;
    const seconds=frameMs/1000;warmup+=seconds;if(warmup<.8)return;
    frameAverage+=(frameMs-frameAverage)*.035;adaptiveTime+=seconds;
    if(adaptiveTime<1)return;adaptiveTime=0;
    const next=frameAverage>22?Math.max(.55,scale-.1):frameAverage<17.5?Math.min(1,scale+.02):scale;
    if(next!==scale){scale=next;updateSize();}
  }
  function render(camera,{dt=1/60,frameMs=dt*1000,playing=true,dirty=false}={}){
    elapsed+=dt;adapt(frameMs,playing);updateLights(camera,dt);shadowPending ||= dirty;
    const shadowInterval=1/ESCAPE_QUALITY[id].shadowHz;
    if(shadowPending&&elapsed-lastShadow+1e-6>=shadowInterval){renderer.shadowMap.needsUpdate=true;shadowPending=false;lastShadow=Number.isFinite(lastShadow)?Math.max(lastShadow+shadowInterval,elapsed-shadowInterval):elapsed;}
    if(id==='high'&&effects)effects.render(camera);else renderer.render(scene,camera);
  }
  configure();watchRoot(scene);
  return {get id(){return id;},get preset(){return ESCAPE_QUALITY[id];},get resolutionScale(){return scale;},get needsShadowUpdate(){return shadowPending;},setQuality,render,applyObject,watchRoot,
    resize(w,h){width=Math.max(1,w);height=Math.max(1,h);updateSize();},invalidate(){shadowPending=true;lastShadow=-Infinity;},
    dispose(){if(disposed)return;disposed=true;effects?.dispose();watchers.forEach(([root,listener])=>root.removeEventListener('childadded',listener));lights.forEach((mask,light)=>light.layers.mask=mask);ornaments.forEach((original,mesh)=>mesh.count=original.count);materials.forEach((original,material)=>{material.bumpMap=original.bumpMap;material.roughnessMap=original.roughnessMap;material.needsUpdate=true;material.removeEventListener('dispose',original.onDispose);});textures.forEach((value,texture)=>{texture.anisotropy=value.anisotropy;texture.removeEventListener('dispose',value.onDispose);});roughness.forEach(texture=>texture.dispose());pointPool.forEach(light=>light.removeFromParent());materials.clear();textures.clear();},
  };
}

export function bindEscapeQualityControls(quality,root=document){
  const controls=['#escape-quality','#escape-pause-quality'].map(selector=>root.querySelector(selector)).filter(Boolean),help=root.querySelector('#escape-quality-help');
  const refresh=()=>{controls.forEach(control=>control.value=quality.id);if(help)help.textContent=tr(quality.preset.description);};
  controls.forEach(control=>control.addEventListener('change',()=>{quality.setQuality(control.value);refresh();}));refresh();return refresh;
}
