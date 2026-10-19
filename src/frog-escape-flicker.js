// Each lamp has its own clock/seed. Occasional outages and short irregular
// flickers recover fully; ambient/moonlight remain independent and steady.
const patterns={
  soft:[[0,1],[.1,.54],[.25,.9],[.43,.24],[.65,.82],[.79,.43],[1,1]],
  blackout:[[0,1],[.015,0],[.5,0],[.67,.35],[.79,.22],[1,1]],
  flicker:[[0,1],[.015,.03],[.18,.03],[.2,.92],[.38,.92],[.395,.04],[.58,.04],[.6,.87],[.76,.87],[.78,.02],[.87,.02],[1,1]],
};
const smooth=t=>t*t*(3-2*t);
function brightness(t,reduced,kind){
  if(reduced)return 1-.3*Math.sin(Math.PI*t)**2;
  const pattern=patterns[kind];
  const index=pattern.findIndex(point=>point[0]>=t),a=pattern[Math.max(0,index-1)],b=pattern[Math.max(0,index)];
  return a[1]+(b[1]-a[1])*smooth(b[0]===a[0]?0:(t-a[0])/(b[0]-a[0]));
}
export function createEscapeFlicker(scene,{random=Math.random,reducedMotion=()=>!!globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches}={}){
  let time=0,disposed=false;
  const entries=[];
  scene.traverse(light=>{
    const glow=light.userData.escapeFlickerGlow;if(!light.isPointLight||!glow)return;
    let seed=(Math.floor(random()*4294967296)^Math.imul(entries.length+1,2654435761))>>>0;
    const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const reduced=!!reducedMotion(),materials=new Map(),meshes=[];
    glow.traverse(mesh=>{
      const material=mesh.material;
      // Standard materials default to emissiveIntensity=1 even when their
      // emissive color is black. Keep glass/metal fittings shared and batchable;
      // only the genuinely glowing filament needs a separate lamp material.
      if(!mesh.isMesh||!material?.emissiveIntensity||!material.emissive||material.emissive.r+material.emissive.g+material.emissive.b===0)return;
      const original=mesh.material;
      if(!materials.has(original))materials.set(original,{material:original.clone(),base:original.emissiveIntensity});
      mesh.material=materials.get(original).material;meshes.push({mesh,original});
    });
    const kind=['soft','blackout','flicker'][Math.floor(next()*3)];
    entries.push({light,base:light.intensity,materials,meshes,next,reduced,kind,at:3+next()*14,duration:reduced?6+next()*2:kind==='blackout'?2.7+next()*1.7:kind==='flicker'?3.2+next()*1.2:2.3+next()*.9,factor:1});
  });
  return {get time(){return time;},get lampCount(){return entries.length;},
    tick(dt){
      if(disposed||!Number.isFinite(dt)||dt<=0)return false;
      time+=dt;let changed=false;
      for(const entry of entries){
        while(time>entry.at+entry.duration){entry.at+=entry.duration+(entry.reduced?20:9)+entry.next()*18;entry.kind=['soft','blackout','flicker'][Math.floor(entry.next()*3)];entry.duration=entry.reduced?6+entry.next()*2:entry.kind==='blackout'?2.7+entry.next()*1.7:entry.kind==='flicker'?3.2+entry.next()*1.2:2.3+entry.next()*.9;}
        const t=(time-entry.at)/entry.duration,factor=t<0||t>1?1:brightness(t,entry.reduced,entry.kind);
        if(Math.abs(factor-entry.factor)<1e-6)continue;
        entry.factor=factor;entry.light.intensity=entry.base*factor;
        for(const {material,base}of entry.materials.values())material.emissiveIntensity=base*factor;
        changed=true;
      }
      return changed;
    },
    dispose(){if(disposed)return;disposed=true;for(const entry of entries){entry.light.intensity=entry.base;for(const {mesh,original}of entry.meshes)mesh.material=original;for(const {material}of entry.materials.values())material.dispose();}},
  };
}
