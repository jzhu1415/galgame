import * as THREE from 'three';

// A local morph of the existing lip tube: keep its thickness, end caps and
// depth over the face, while removing the raised smiling corners. It is mixed
// with the support clips, so down/prone and the other forms regain their face.
export function createNaiwaHandwalkFace(rig){
  const skin=rig.getObjectByProperty('isSkinnedMesh',true),{geometry}=skin;
  const source=geometry.attributes.position,color=geometry.attributes.color,target=source.clone();
  const vertices=[];
  for(let i=0;i<source.count;i++){
    const x=source.getX(i),y=source.getY(i),z=source.getZ(i);
    if(Math.abs(x)>.03501||y<.881||y>.891||z<.089||color.getX(i)>.3||color.getY(i)>.2||color.getZ(i)>.1)continue;
    const smile=.883+.006*(x/.035)**2;
    target.setXYZ(i,x,y-smile+.8855,z);vertices.push(i);
  }
  // Flattening the smile moves the centre onto a different part of the lip
  // surface. Fit each existing tube ring to that surface instead of burying
  // the middle of the mouth in the head or detaching the corners.
  const mouthSet=new Set(vertices),patchIndices=[],indices=geometry.index.array,rings=new Map();
  for(let i=0;i<indices.length;i+=3){
    const tri=[indices[i],indices[i+1],indices[i+2]];
    if(tri.every(v=>!mouthSet.has(v)&&Math.abs(source.getX(v))<.065&&source.getY(v)>.86&&source.getY(v)<.91&&source.getZ(v)>.05))patchIndices.push(...tri);
  }
  const patch=new THREE.BufferGeometry();patch.setAttribute('position',source);patch.setIndex(patchIndices);
  const face=new THREE.Mesh(patch,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));face.updateMatrixWorld(true);
  for(const i of vertices){const x=source.getX(i);if(!rings.has(x))rings.set(x,[]);rings.get(x).push(i);}
  const ray=new THREE.Raycaster();
  for(const [x,ring]of rings){
    const centreZ=ring.reduce((sum,i)=>sum+source.getZ(i),0)/ring.length;
    ray.set(new THREE.Vector3(x,.8855,.4),new THREE.Vector3(0,0,-1));const surface=ray.intersectObject(face)[0];
    if(surface)for(const i of ring)target.setZ(i,surface.point.z+.004+source.getZ(i)-centreZ);
  }
  patch.dispose();face.material.dispose();
  target.name='naiwa:vacant-neutral-mouth';
  const posed=geometry.clone();posed.setAttribute('position',target);posed.computeVertexNormals();
  const index=geometry.morphAttributes.position.length;
  geometry.morphAttributes.position.push(target);geometry.morphAttributes.normal.push(posed.attributes.normal.clone());
  posed.dispose();skin.updateMorphTargets();skin.userData.neutralMouthVertices=vertices;
  return {update(amount){skin.morphTargetInfluences[index]=THREE.MathUtils.clamp(amount,0,1);},reset(){skin.morphTargetInfluences[index]=0;}};
}
