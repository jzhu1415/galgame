import * as THREE from 'three';

export const NAIWA_TOES=Object.freeze({left:6,right:5});

// Replace the old tapered toe ends in the same skin, rather than layering toes
// over the existing silhouette. This adds no render pass or separate toe meshes.
export function rebuildNaiwaToes(rig){
  const skin=rig.getObjectByProperty('isSkinnedMesh',true),source=skin.geometry,attributes=source.attributes;
  const data=Object.fromEntries(Object.entries(attributes).map(([name,attribute])=>[name,Array.from(attribute.array)]));
  const index=[],cut=.055,edgeCache=new Map(),rings={L:new Set(),R:new Set()},toeRanges={};
  const point=i=>new THREE.Vector3(data.position[i*3],data.position[i*3+1],data.position[i*3+2]);
  const append=values=>{const id=data.position.length/3;for(const name in data)data[name].push(...values[name]);return id;};
  const joints=values=>{const combined=new Map();for(const [id,weight]of values)combined.set(id,(combined.get(id)??0)+weight);const entries=[...combined].filter(([,w])=>w>1e-8).sort((a,b)=>b[1]-a[1]).slice(0,4),total=entries.reduce((sum,[,w])=>sum+w,0);return {skinIndex:Array.from({length:4},(_,i)=>entries[i]?.[0]??0),skinWeight:Array.from({length:4},(_,i)=>(entries[i]?.[1]??0)/(total||1))};};
  function intersection(a,b,side){
    const key=a<b?`${a}/${b}`:`${b}/${a}`;if(edgeCache.has(key))return edgeCache.get(key);
    const t=(cut-point(a).z)/(point(b).z-point(a).z),values={};
    for(const [name,attribute]of Object.entries(attributes))if(name!=='skinIndex'&&name!=='skinWeight')values[name]=Array.from({length:attribute.itemSize},(_,i)=>THREE.MathUtils.lerp(data[name][a*attribute.itemSize+i],data[name][b*attribute.itemSize+i],t));
    values.position[2]=cut;new THREE.Vector3().fromArray(values.normal).normalize().toArray(values.normal);
    const influences=[];for(let c=0;c<4;c++){influences.push([data.skinIndex[a*4+c],data.skinWeight[a*4+c]*(1-t)],[data.skinIndex[b*4+c],data.skinWeight[b*4+c]*t]);}
    Object.assign(values,joints(influences));const id=append(values);edgeCache.set(key,id);rings[side].add(id);return id;
  }
  for(let i=0;i<source.index.count;i+=3){
    const triangle=[source.index.getX(i),source.index.getX(i+1),source.index.getX(i+2)];
    const side=['L','R'].find(side=>triangle.every(v=>point(v).y<.09&&point(v).x*(side==='L'?-1:1)>.075));
    if(!side){index.push(...triangle);continue;}
    const polygon=[];
    for(let edge=0;edge<3;edge++){
      const a=triangle[edge],b=triangle[(edge+1)%3],insideA=point(a).z<=cut,insideB=point(b).z<=cut;
      if(insideA)polygon.push(a);if(insideA!==insideB)polygon.push(intersection(a,b,side));
    }
    for(let v=1;v<polygon.length-1;v++)index.push(polygon[0],polygon[v],polygon[v+1]);
  }
  for(const side of ['L','R']){
    const foot=skin.skeleton.bones.findIndex(bone=>bone.name===`Foot_${side}`),toe=skin.skeleton.bones.findIndex(bone=>bone.name===`Toe_${side}`);
    const ring=[...rings[side]],bounds=new THREE.Box3().setFromPoints(ring.map(point)),centre=bounds.getCenter(new THREE.Vector3());
    const dark=ring.reduce((sum,i)=>sum.add(new THREE.Vector3().fromArray(data.color,i*3)),new THREE.Vector3()).divideScalar(ring.length);
    const vertex=(p,n,weight=0)=>({position:p.toArray(),normal:n.toArray(),color:dark.toArray(),skinIndex:[foot,toe,0,0],skinWeight:[1-weight,weight,0,0]});
    // Seal the cut at the roots; toe roots overlap the sealed foot, with clear
    // gaps only towards the tips. Keep the original non-foot vertex indices.
    ring.sort((a,b)=>Math.atan2(point(a).y-centre.y,point(a).x-centre.x)-Math.atan2(point(b).y-centre.y,point(b).x-centre.x));
    const cap=append(vertex(centre,new THREE.Vector3(0,0,1))),edge=ring.map(i=>append(vertex(point(i),new THREE.Vector3(0,0,1))));
    for(let i=0;i<edge.length;i++)index.push(cap,edge[i],edge[(i+1)%edge.length]);
    const count=side==='R'?NAIWA_TOES.left:NAIWA_TOES.right,width=bounds.max.x-bounds.min.x,sign=side==='R'?1:-1;
    // A rounded forefoot covers the toe roots. Only the shorter, varied distal
    // lobes separate, rather than eleven evenly spaced comb-like rods.
    const pad=new THREE.SphereGeometry(1,16,10),padStart=data.position.length/3;
    pad.scale(width*.51,.020,.032);pad.translate(centre.x,.022,cut+.010);
    for(let v=0;v<pad.attributes.position.count;v++){const q=new THREE.Vector3().fromBufferAttribute(pad.attributes.position,v);append(vertex(q,new THREE.Vector3().fromBufferAttribute(pad.attributes.normal,v),THREE.MathUtils.smoothstep(q.z,.06,.115)));}
    for(const v of pad.index.array)index.push(padStart+v);pad.dispose();
    const widths=Array.from({length:count},(_,i)=>1.16-i*.075),totalWidth=widths.reduce((a,b)=>a+b,0);let across=0;
    toeRanges[side]=[];
    for(let digit=0;digit<count;digit++){
      const spacing=width*widths[digit]/totalWidth,x=sign>0?bounds.min.x+across+spacing*.5:bounds.max.x-across-spacing*.5;
      const length=.102*[1,.97,.89,.78,.65,.56][digit],yaw=sign*(.22+.28*digit/(count-1)),direction=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));across+=spacing;
      const shape=new THREE.SphereGeometry(1,12,8),start=data.position.length/3;
      shape.scale(spacing*.48,.0145*(1-digit*.045),length*.5);
      // A broad rounded pad near the tip and a slight upward arch soften the
      // silhouette; each toe follows the foot's outward-facing fan.
      const sp=shape.attributes.position;
      for(let v=0;v<sp.count;v++){const t=(sp.getZ(v)+length*.5)/length;sp.setX(v,sp.getX(v)*(1+.16*Math.sin(Math.PI*t)));sp.setY(v,sp.getY(v)+.003*Math.sin(Math.PI*t));}
      shape.rotateY(yaw);shape.translate(x+direction.x*length*.5,.020,cut-.012+direction.z*length*.5);shape.computeVertexNormals();
      for(let v=0;v<shape.attributes.position.count;v++){
        const p=new THREE.Vector3().fromBufferAttribute(shape.attributes.position,v),normal=new THREE.Vector3().fromBufferAttribute(shape.attributes.normal,v);
        append(vertex(p,normal,THREE.MathUtils.smoothstep(p.z,.06,.115)));
      }
      for(const v of shape.index.array)index.push(start+v);toeRanges[side].push({start,count:shape.attributes.position.count,direction:direction.toArray()});shape.dispose();
    }
  }
  // Unreferenced old tips retain their indices for stable authored surface
  // checks, but stay at the cut plane and cannot inflate bounds/contact tests.
  const used=new Set(index);for(let i=0;i<attributes.position.count;i++)if(!used.has(i))data.position[i*3+2]=Math.min(data.position[i*3+2],cut);
  const geometry=new THREE.BufferGeometry();
  for(const [name,attribute]of Object.entries(attributes))geometry.setAttribute(name,new THREE.BufferAttribute(new attribute.array.constructor(data[name]),attribute.itemSize,attribute.normalized));
  geometry.setIndex(index);geometry.computeBoundingBox();geometry.computeBoundingSphere();skin.geometry=geometry;
  skin.userData.toeDigits=toeRanges;
  return {original:source,variant:geometry,
    syncWeights(){for(const name of ['skinIndex','skinWeight']){source.attributes[name].array.set(geometry.attributes[name].array.subarray(0,source.attributes[name].array.length));source.attributes[name].needsUpdate=true;}},
    setActive(active){skin.geometry=active?geometry:source;skin.userData.extraToes=!!active;},
    dispose(){(skin.geometry===source?geometry:source).dispose();},
  };
}
