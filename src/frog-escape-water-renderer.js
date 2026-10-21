import * as THREE from 'three';

export const WATER_MAX_RIPPLES=6;
export const WATER_RIPPLE_LIFETIME=3.4;
const QUALITY_IDS=new Set(['low','balanced','high']);

// Both shapes lie in the descriptor's local X/Z plane. Water never supplies a
// collision floor: the tub/pool bottom and rim remain ordinary scene geometry.
function surfaceGeometry(volume,quality){
  const detail=quality==='high'?24:quality==='balanced'?8:1;
  const geometry=volume.shape==='semicircle'
    ?new THREE.RingGeometry(0,volume.radius,quality==='high'?64:quality==='balanced'?32:16,Math.max(1,detail/2),0,Math.PI)
    :new THREE.PlaneGeometry(volume.width,volume.depth,detail,detail);
  geometry.rotateX(-Math.PI/2);
  geometry.computeBoundingBox();geometry.boundingBox.min.y=-.04;geometry.boundingBox.max.y=.04;
  geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.04;
  return geometry;
}

const WATER_UNIFORMS=`
uniform float escapeWaterTime;
uniform float escapeWaterWaveScale;
uniform vec4 escapeWaterRipples[${WATER_MAX_RIPPLES}];
varying vec2 vEscapeWaterLocal;
varying vec3 vEscapeWaterTangentX;
varying vec3 vEscapeWaterTangentZ;
// The disturbance travels outwards in a narrow band and then dies away. The
// same analytic slope drives lighting, so rings respond to real scene lights.
vec3 escapeWaterWave(vec2 point) {
  float first=dot(point,vec2(3.2,1.8))+escapeWaterTime*.85;
  float second=dot(point,vec2(-2.4,4.3))-escapeWaterTime*1.14;
  vec3 result=escapeWaterWaveScale*vec3(
    .004*sin(first)+.0025*sin(second),
    .0128*cos(first)-.006*cos(second),
    .0072*cos(first)+.01075*cos(second));
  for(int i=0;i<${WATER_MAX_RIPPLES};i++) {
    vec4 ripple=escapeWaterRipples[i];
    float age=escapeWaterTime-ripple.z;
    if(ripple.w>0.0&&age>=0.0&&age<${WATER_RIPPLE_LIFETIME.toFixed(1)}) {
      vec2 offset=point-ripple.xy;
      float distance=max(length(offset),.0001);
      float front=distance-age*1.2;
      float envelope=exp(-front*front*18.0-age*.9);
      float phase=distance*20.0-age*18.0;
      float height=.016*ripple.w*envelope;
      result.x+=height*sin(phase);
      result.yz+=height*(20.0*cos(phase)-36.0*front*sin(phase))*offset/distance;
    }
  }
  return result;
}
`;

function litMaterial(quality,uniforms){
  const high=quality==='high';
  // Transparency keeps the actual basin visible without Three's screen-wide
  // transmission pass. IOR and clearcoat still provide physical local-light
  // highlights; no environment map or reflection render target is needed.
  const material=high?new THREE.MeshPhysicalMaterial({
    color:0x86b7b3,roughness:.085,metalness:0,ior:1.333,
    clearcoat:1,clearcoatRoughness:.07,specularIntensity:1,
    transparent:true,opacity:.3,transmission:0,depthWrite:false,side:THREE.DoubleSide,
  }):new THREE.MeshStandardMaterial({
    color:0x719e9c,roughness:.18,metalness:0,
    transparent:true,opacity:.34,depthWrite:false,side:THREE.DoubleSide,
  });
  material.name=`water:${quality}`;
  material.userData.escapeWater=true;
  material.customProgramCacheKey=()=>`escape-water-v1-${quality}`;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\n${WATER_UNIFORMS}`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        vEscapeWaterLocal=position.xz;
        vEscapeWaterTangentX=normalize(normalMatrix*vec3(1.0,0.0,0.0));
        vEscapeWaterTangentZ=normalize(normalMatrix*vec3(0.0,0.0,1.0));
        transformed.y+=escapeWaterWave(position.xz).x;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\n${WATER_UNIFORMS}`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec3 waterWave=escapeWaterWave(vEscapeWaterLocal);
        normal=normalize(normal-normalize(vEscapeWaterTangentX)*waterWave.y-normalize(vEscapeWaterTangentZ)*waterWave.z);
        float waterFresnel=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),4.0);
        diffuseColor.a=mix(opacity*.62,.72,waterFresnel);
        // A dim, broad sky reflection remains visible at grazing angles even
        // in rooms without an environment map. It adds no synthetic light spot.
        totalEmissiveRadiance+=vec3(.13,.20,.23)*waterFresnel*.24;`)
      .replace('#include <clearcoat_normal_fragment_maps>',`#include <clearcoat_normal_fragment_maps>
        #ifdef USE_CLEARCOAT
          clearcoatNormal=normal;
        #endif`);
  };
  return material;
}

function surfaceMaterial(quality,uniforms){
  if(quality!=='low')return litMaterial(quality,uniforms);
  // The lowest preset is a single transparent sheet, with no wave shader,
  // transmission buffer, normal texture or per-frame geometry work.
  const material=new THREE.MeshBasicMaterial({color:0x618b89,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide});
  material.name='water:low';material.userData.escapeWater=true;return material;
}
const visibleInScene=object=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};

export function createEscapeWater({scene,volumes=[]}){
  let quality='balanced',elapsed=0,disposed=false;
  const localPoint=new THREE.Vector3();
  const records=volumes.map(volume=>{
    const uniforms={escapeWaterTime:{value:0},escapeWaterWaveScale:{value:.45},
      escapeWaterRipples:{value:Array.from({length:WATER_MAX_RIPPLES},()=>new THREE.Vector4(0,0,-1000,0))}};
    const surface=new THREE.Mesh(surfaceGeometry(volume,quality),surfaceMaterial(quality,uniforms));
    surface.name=`water:surface:${volume.id}`;surface.position.y=volume.surfaceY+.002;
    surface.userData.solid=false;surface.userData.dynamic=true;surface.userData.escapeWater=true;
    surface.castShadow=false;surface.receiveShadow=false;surface.renderOrder=4;
    surface.raycast=()=>{}; // Aiming at the visible bottom must still work.
    (volume.root??scene).add(surface);
    return {volume,surface,uniforms};
  });
  const surfaces=Object.freeze(records.map(record=>record.surface));
  function setQuality(next){
    if(disposed||!QUALITY_IDS.has(next))return false;
    if(next===quality)return true;
    quality=next;
    for(const record of records){
      const oldGeometry=record.surface.geometry,oldMaterial=record.surface.material;
      record.uniforms.escapeWaterWaveScale.value=next==='high'?1:.45;
      record.surface.geometry=surfaceGeometry(record.volume,next);
      record.surface.material=surfaceMaterial(next,record.uniforms);
      oldGeometry.dispose();oldMaterial.dispose();
    }
    return true;
  }
  function disturb(volume,position,strength=1){
    if(disposed||!position||![position.x,position.y,position.z,strength].every(Number.isFinite)||strength<=0)return false;
    const record=records.find(item=>item.volume===volume||item.volume.id===(typeof volume==='string'?volume:volume?.id));
    if(!record)return false;
    localPoint.set(position.x,position.y,position.z);record.surface.parent.worldToLocal(localPoint);
    const descriptor=record.volume;
    const inside=descriptor.shape==='semicircle'
      ?localPoint.z<=.001&&localPoint.x*localPoint.x+localPoint.z*localPoint.z<=descriptor.radius*descriptor.radius+.001
      :Math.abs(localPoint.x)<=descriptor.width/2+.001&&Math.abs(localPoint.z)<=descriptor.depth/2+.001;
    if(!inside)return false;
    const ripples=record.uniforms.escapeWaterRipples.value;
    const ripple=ripples.find(item=>item.w===0)??ripples.reduce((oldest,item)=>item.z<oldest.z?item:oldest);
    ripple.set(localPoint.x,localPoint.z,elapsed,Math.min(2,strength));
    return true;
  }
  return {surfaces,setQuality,disturb,
    get quality(){return quality;},get elapsed(){return elapsed;},
    get rippleCount(){return records.reduce((total,record)=>total+record.uniforms.escapeWaterRipples.value.filter(ripple=>ripple.w>0).length,0);},
    tick(dt){
      if(disposed||!Number.isFinite(dt)||dt<=0)return false;
      elapsed+=dt;
      for(const {uniforms}of records){
        uniforms.escapeWaterTime.value=elapsed;
        for(const ripple of uniforms.escapeWaterRipples.value)if(ripple.w>0&&elapsed-ripple.z>=WATER_RIPPLE_LIFETIME)ripple.w=0;
      }
      return quality!=='low'&&records.some(record=>visibleInScene(record.surface));
    },
    dispose(){
      if(disposed)return;disposed=true;
      for(const {surface,uniforms}of records){surface.removeFromParent();surface.geometry.dispose();surface.material.dispose();uniforms.escapeWaterRipples.value.forEach(ripple=>ripple.w=0);}
    },
  };
}
