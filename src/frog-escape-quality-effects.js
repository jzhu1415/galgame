import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

export const CONTACT_OCCLUSION=Object.freeze({radius:.3,minGap:.005,maxGap:.45,intensity:.6});
const contactBlur=`
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform sampler2D tNormal;
uniform vec2 resolution;
uniform float cameraNear;
uniform float cameraFar;
varying vec2 vUv;
#include <packing>
float distanceAt(vec2 uv){return -perspectiveDepthToViewZ(texture2D(tDepth,uv).x,cameraNear,cameraFar);}
void main(){
  if(texture2D(tDepth,vUv).x>=.999999){gl_FragColor=vec4(1.0);return;}
  float center=distanceAt(vUv),sum=0.0,total=0.0;
  vec3 normal=unpackRGBToNormal(texture2D(tNormal,vUv).xyz);
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
    vec2 offset=vec2(float(x),float(y)),uv=clamp(vUv+offset/resolution,vec2(0.0),vec2(1.0));
    float depthWeight=exp(-abs(distanceAt(uv)-center)*40.0);
    float normalWeight=pow(max(0.0,dot(normal,unpackRGBToNormal(texture2D(tNormal,uv).xyz))),8.0);
    float weight=exp(-dot(offset,offset)*.4)*depthWeight*normalWeight;
    sum+=texture2D(tDiffuse,uv).r*weight;total+=weight;
  }
  gl_FragColor=vec4(vec3(total>.00001?sum/total:texture2D(tDiffuse,vUv).r),1.0);
}`;

// Loaded only for Best Quality. Disposed completely when switching back.
export function createQualityEffects(renderer,scene){
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:Math.min(4,renderer.capabilities.maxSamples??0)});
  const composer=new EffectComposer(renderer,target),camera=new THREE.PerspectiveCamera();
  const color=new RenderPass(scene,camera),ao=new SSAOPass(scene,camera,1,1,16),output=new OutputPass();
  // The SSAO kernel is in world metres, not screen pixels. Large kernels made
  // dark silhouettes metres from contact; keep this to furniture/foot creases.
  ao.kernelRadius=CONTACT_OCCLUSION.radius;
  ao.ssaoMaterial.fragmentShader=ao.ssaoMaterial.fragmentShader
    .replace('float realDepth = getLinearDepth( samplePointUv );','if(any(lessThan(samplePointUv,vec2(0.0)))||any(greaterThan(samplePointUv,vec2(1.0))))continue;\nfloat realDepth = getLinearDepth( samplePointUv );')
    .replace('occlusion += 1.0;',`occlusion += ${CONTACT_OCCLUSION.intensity.toFixed(1)};`);
  Object.assign(ao.blurMaterial.uniforms,{tDepth:{value:ao.normalRenderTarget.depthTexture},tNormal:{value:ao.normalRenderTarget.texture},cameraNear:{value:camera.near},cameraFar:{value:camera.far}});
  ao.blurMaterial.fragmentShader=contactBlur;
  const overrideVisibility=ao._overrideVisibility.bind(ao);
  ao._overrideVisibility=()=>{
    overrideVisibility();scene.traverse(object=>{
      const materials=[object.material].flat().filter(Boolean);
      if(object.visible&&object.isMesh&&(object.userData.excludeContactOcclusion||materials.length&&materials.every(material=>material.transparent||material.depthWrite===false))){object.visible=false;ao._visibilityCache.push(object);}
    });
  };
  composer.addPass(color);composer.addPass(ao);composer.addPass(output);
  let width=1,height=1,ratio=1;
  return {resize(w,h,dpr){width=w;height=h;ratio=dpr;composer.setPixelRatio(dpr);composer.setSize(w,h);ao.setSize(Math.max(1,Math.round(w*dpr*.75)),Math.max(1,Math.round(h*dpr*.75)));},
    render(activeCamera){
      color.camera=ao.camera=activeCamera;
      const range=activeCamera.far-activeCamera.near;
      ao.minDistance=CONTACT_OCCLUSION.minGap/range;ao.maxDistance=CONTACT_OCCLUSION.maxGap/range;
      ao.blurMaterial.uniforms.cameraNear.value=activeCamera.near;ao.blurMaterial.uniforms.cameraFar.value=activeCamera.far;
      ao.ssaoMaterial.uniforms.cameraNear.value=activeCamera.near;ao.ssaoMaterial.uniforms.cameraFar.value=activeCamera.far;
      ao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(activeCamera.projectionMatrix);
      ao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(activeCamera.projectionMatrixInverse);
      composer.render(0);
    },dispose(){color.dispose();ao.dispose();output.dispose();composer.dispose();},
    get size(){return [width,height,ratio];},
  };
}
