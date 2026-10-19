import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Keep the authored meshes available to collision/aiming code, while drawing
// immutable surfaces in small material batches. Rigid moving panels get their
// own local batches: never combine across a hinge/slide or bake its world pose.
export function createEscapeRenderBatches(castle,{chunkSize=8,minMeshes=2}={}) {
  const {groups,roof,doors=[],interactables=[],pickupSeeds=[],navigation,playerPin,escapeProgress}=castle;
  const excluded=new Set([playerPin,escapeProgress?.fence?.root]);
  const movingRoots=new Set(doors.flatMap(door=>door.parts.map(part=>part.pivot)));
  for(const action of interactables) {
    for(const motion of action.motions??[])movingRoots.add(motion.pivot);
    if(action.content)excluded.add(action.content);
  }
  for(const seed of pickupSeeds)excluded.add(seed.mesh);
  for(const chair of navigation?.chairs??[])excluded.add(chair.root);
  const roots=[...Object.entries(groups).filter(([id])=>id!=='labels').map(([,group])=>group),roof,...doors.map(door=>door.root),...movingRoots].filter(Boolean);
  const rootSet=new Set(roots),records=[],batches=[];
  const stats={sourceMeshes:0,batchMeshes:0,savedDrawCalls:0,vertices:0,geometryBytes:0};
  const inverse=new THREE.Matrix4(),relative=new THREE.Matrix4(),center=new THREE.Vector3();
  const size=Math.max(2,Number.isFinite(chunkSize)?chunkSize:8);
  const signature=geometry=>Object.entries(geometry.attributes).map(([name,attribute])=>`${name}/${attribute.itemSize}/${attribute.normalized}/${attribute.array.constructor.name}`).sort().join('|');
  function skip(node) {
    return excluded.has(node)||!node.visible||node.userData.escapeRenderBatch||node.userData.item||
      node.userData.chair||node.userData.breakable||
      node.userData.escapeFence||node.userData.collisionOnly||node.name.startsWith('quest:');
  }
  function eligible(mesh) {
    const material=mesh.material,geometry=mesh.geometry;
    return mesh.isMesh&&!mesh.isInstancedMesh&&!mesh.isSkinnedMesh&&geometry?.isBufferGeometry&&geometry.index&&
      !Array.isArray(material)&&material?.visible&&!material.transparent&&!material.transmission&&
      !mesh.customDepthMaterial&&!mesh.customDistanceMaterial&&mesh.layers.mask===1&&
      !Object.keys(geometry.morphAttributes).length&&geometry.drawRange.start===0&&geometry.drawRange.count===Infinity;
  }
  for(const root of roots) {
    root.updateWorldMatrix(true,true);inverse.copy(root.matrixWorld).invert();
    const chunks=new Map();
    function collect(node) {
      if(node!==root&&(rootSet.has(node)||skip(node)))return;
      if(eligible(node)&&!skip(node)) {
        relative.multiplyMatrices(inverse,node.matrixWorld);
        if(!node.geometry.boundingBox)node.geometry.computeBoundingBox();
        node.geometry.boundingBox.getCenter(center).applyMatrix4(relative);
        const cell=movingRoots.has(root)?[0,0,0]:[Math.floor(center.x/size),Math.floor(center.y/size),Math.floor(center.z/size)];
        const key=[...cell,node.material.id,
          !!node.castShadow,!!node.receiveShadow,node.renderOrder,node.frustumCulled,signature(node.geometry)].join(':');
        if(!chunks.has(key))chunks.set(key,[]);
        chunks.get(key).push({mesh:node,transform:relative.clone()});
      }
      for(const child of node.children)collect(child);
    }
    collect(root);
    for(const sources of chunks.values()) {
      if(sources.length<Math.max(2,minMeshes))continue;
      const geometries=sources.map(({mesh,transform})=>mesh.geometry.clone().applyMatrix4(transform));
      const geometry=mergeGeometries(geometries,false);geometries.forEach(part=>part.dispose());
      if(!geometry)continue;
      geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const first=sources[0].mesh,batch=new THREE.Mesh(geometry,first.material);
      batch.name='render:static-chunk';batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
      batch.renderOrder=first.renderOrder;batch.frustumCulled=first.frustumCulled;batch.matrixAutoUpdate=false;batch.updateMatrix();
      batch.userData.escapeRenderBatch=true;
      batch.userData.escapeRenderMoving=movingRoots.has(root);
      // A scene ray must still report the authored source object and its face
      // indices. Original panel nodes and visibility remain intact for gameplay
      // code that inspects their identity/ancestors independently of rays.
      batch.raycast=(raycaster,hits)=>{
        for(const {mesh} of sources)if(mesh.visible)mesh.raycast(raycaster,hits);
      };
      root.add(batch);batches.push(batch);
      for(const {mesh} of sources) {
        records.push({mesh,mask:mesh.layers.mask,matrixAutoUpdate:mesh.matrixAutoUpdate,matrixWorldAutoUpdate:mesh.matrixWorldAutoUpdate});
        mesh.layers.disable(0);
        // Original leaves remain collision/raycast targets. Their world matrix
        // must continue following the hinge even though they no longer draw.
        if(!movingRoots.has(root)){mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;}
        mesh.userData.escapeRenderSource=true;
      }
      stats.sourceMeshes+=sources.length;stats.batchMeshes++;
      stats.vertices+=geometry.attributes.position.count;
      stats.geometryBytes+=geometry.index.array.byteLength+Object.values(geometry.attributes).reduce((sum,attribute)=>sum+attribute.array.byteLength,0);
    }
  }
  stats.savedDrawCalls=stats.sourceMeshes-stats.batchMeshes;
  let disposed=false;
  return {batches,stats,dispose(){
    if(disposed)return;disposed=true;
    for(const {mesh,mask,matrixAutoUpdate,matrixWorldAutoUpdate} of records){mesh.layers.mask=mask;mesh.matrixAutoUpdate=matrixAutoUpdate;mesh.matrixWorldAutoUpdate=matrixWorldAutoUpdate;delete mesh.userData.escapeRenderSource;}
    for(const batch of batches){batch.removeFromParent();batch.geometry.dispose();}
  }};
}
