import * as THREE from 'three';

// High-preset surface maps share one repeating two-metre tile per material
// family. Color, relief and roughness come from the same features, so mortar
// stays recessed and polished grain catches light without painted-on shadows.
const fract=value=>value-Math.floor(value);
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=value=>value*value*(3-2*value);
function hash(x,y,seed){
  let n=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(seed,1274126177);
  n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;
}
function noise(u,v,frequency,seed){
  const x=u*frequency,y=v*frequency,ix=Math.floor(x),iy=Math.floor(y),fx=smooth(fract(x)),fy=smooth(fract(y));
  const at=(dx,dy)=>hash((ix+dx)%frequency,(iy+dy)%frequency,seed);
  return (at(0,0)*(1-fx)+at(1,0)*fx)*(1-fy)+(at(0,1)*(1-fx)+at(1,1)*fx)*fy;
}
const palettes={wood:[87,61,40],stone:[113,112,104],plaster:[179,170,150],tile:[162,153,132],slate:[61,64,71],furnitureWood:[208,178,130],cabinetWood:[147,108,74],marble:[244,242,237]};

export function createCastleDetailMaps(kind,{size=512}={}){
  if(!Object.hasOwn(palettes,kind))throw new Error(`Unknown castle surface: ${kind}`);
  const seed=Object.keys(palettes).indexOf(kind)+11,color=new Uint8Array(size*size*4),normal=new Uint8Array(color.length),roughness=new Uint8Array(color.length),height=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size,fine=hash(x,y,seed),cloud=noise(u,v,8,seed),medium=noise(u,v,32,seed+1),micro=noise(u,v,128,seed+2);
    let tone=1,relief=.5,rough=.85,stain=0,palette=palettes[kind];
    if(kind==='wood'||kind==='furnitureWood'||kind==='cabinetWood'){
      const plank=Math.floor(u*8),across=fract(u*8),along=fract(v*4+(plank%3)/3),edge=Math.min(across,1-across),end=Math.min(along,1-along);
      const timber=kind!=='wood',seam=timber?0:1-smooth(clamp(Math.min(edge/.035,end/.022))),plankTone=timber?0:hash(plank,0,seed)-.5;
      const fiber=Math.sin(u*Math.PI*2*(timber?48:128)+(noise(u,v,16,seed+3)-.5)*3+Math.sin(v*Math.PI*2*4)*.45);
      const knotY=hash(plank,2,seed),knotX=.25+hash(plank,3,seed)*.5,dx=(across-knotX)*2.5,dy=Math.min(Math.abs(v-knotY),1-Math.abs(v-knotY))*11;
      const knot=Math.exp(-(dx*dx+dy*dy)*7),rings=Math.sin(Math.sqrt(dx*dx+dy*dy)*34)*knot;
      tone=.96+plankTone*.25+(cloud-.5)*.12+fiber*.045+rings*.08-seam*.5;
      relief=.56+fiber*.018+(micro-.5)*.016-rings*.012-seam*.28;
      rough=(timber?.46:.67)+(cloud-.5)*.12+(micro-.5)*.06+seam*.24;
    }else if(kind==='marble'){
      const veinPhase=(u*2+v+(cloud-.5)*.48+(medium-.5)*.06)*Math.PI*2;
      const veins=Math.exp(-(Math.sin(veinPhase)**2)*680),fineVein=Math.exp(-(Math.sin(veinPhase*2+(micro-.5)*.12)**2)*1800);
      tone=.99+(cloud-.5)*.025+(medium-.5)*.012-veins*.24-fineVein*.045;
      relief=.5+(micro-.5)*.0015;rough=.7+(cloud-.5)*.08+veins*.05;
    }else if(kind==='plaster'){
      const pore=clamp((.13-fine)*7),trowel=noise(u,v,16,seed+3);
      tone=.97+(cloud-.5)*.1+(medium-.5)*.05+(fine-.5)*.025-pore*.035;
      relief=.53+(trowel-.5)*.035+(micro-.5)*.025-pore*.028;
      rough=.9+(micro-.5)*.08+pore*.04;
    }else{
      const columns=kind==='slate'?8:4,rows=kind==='tile'?4:8,row=Math.floor(v*rows),horizontal=u*columns+(kind==='tile'?0:(row%2)*.5),column=Math.floor(horizontal),a=fract(horizontal),b=fract(v*rows);
      const edge=Math.min(a,1-a,b,1-b),jointWidth=kind==='tile'?.018:.035;
      const joint=1-smooth(clamp(edge/jointWidth)),bevel=1-smooth(clamp((edge-jointWidth)/.045)),cell=hash(column%columns,row,seed);
      const pits=clamp((.08-fine)*10),chipping=kind==='tile'?0:bevel*clamp((.5-micro)*2);
      if(kind==='tile'){
        if((column+row)%2)palette=[105,108,103];
        const vein=Math.pow(Math.max(0,Math.sin(u*Math.PI*2*16+(cloud-.5)*9+v*Math.PI*2*8)),18);
        tone=.98+(cell-.5)*.055+(medium-.5)*.035-vein*.035-joint*.42;
        relief=.6-joint*.31-bevel*.016+(micro-.5)*.003;
        rough=.26+(medium-.5)*.1+vein*.035+joint*.62;
      }else{
        const slate=kind==='slate',strata=slate?Math.sin(v*Math.PI*2*96+(cloud-.5)*6):0;
        tone=.98+(cell-.5)*.17+(cloud-.5)*.13+(medium-.5)*.09+strata*.018-joint*.5-chipping*.08;
        relief=.6-joint*.33-bevel*.035+(medium-.5)*.045+(micro-.5)*.03-pits*.025-chipping*.08+strata*.007;
        rough=(slate?.8:.88)+(micro-.5)*.1+joint*.1;
      }
      // Fine dirt collects where the edge relief meets mortar.
      stain=bevel*(1-joint)*.025;
    }
    const index=(y*size+x)*4;height[y*size+x]=relief;
    for(let channel=0;channel<3;channel++)color[index+channel]=Math.round(clamp(palette[channel]*tone/255-stain)*255);
    color[index+3]=255;const r=Math.round(clamp(rough)*255);roughness[index]=roughness[index+1]=roughness[index+2]=r;roughness[index+3]=255;
  }
  const strength={wood:3.1,stone:3.3,plaster:2.5,tile:2.1,slate:3.1,furnitureWood:1.8,cabinetWood:1.9,marble:.7}[kind]*(size/512);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*strength,dy=(height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x])*strength,length=Math.hypot(dx,dy,1),index=(y*size+x)*4;
    normal[index]=Math.round((.5-dx/length*.5)*255);normal[index+1]=Math.round((.5-dy/length*.5)*255);normal[index+2]=Math.round((.5+1/length*.5)*255);normal[index+3]=255;
  }
  function texture(data,suffix,srgb=false){
    const result=new THREE.DataTexture(data,size,size);result.name=`castle-detail:${kind}:${suffix}`;result.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
    result.wrapS=result.wrapT=THREE.RepeatWrapping;result.generateMipmaps=true;result.minFilter=THREE.LinearMipmapLinearFilter;result.magFilter=THREE.LinearFilter;result.needsUpdate=true;return result;
  }
  const maps={map:texture(color,'color',true),normalMap:texture(normal,'normal'),roughnessMap:texture(roughness,'roughness')};
  return {...maps,dispose(){Object.values(maps).forEach(map=>map.dispose());}};
}
