import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {propItem} from '../src/frog-escape-props.js';

let tested=0;
for(const fps of [30,60,144]){
  const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),nav=castle.navigation,items=createWorldItems(scene,nav),finishes=[],paths=[];
  scene.traverse(mesh=>{if(mesh.userData.floorFinish)finishes.push(mesh);if(mesh.name==='yard:flush-path')paths.push(mesh);});assert(finishes.length>=4&&paths.length===4);
  const points=[];
  for(const finish of finishes){
    assert(finish.userData.solid,'visible raised floor finishes participate in real collision');const bounds=new THREE.Box3().setFromObject(finish);let found=false;
    for(let ix=1;ix<5&&!found;ix++)for(let iz=1;iz<5&&!found;iz++){
      const x=THREE.MathUtils.lerp(bounds.min.x,bounds.max.x,ix/5),z=THREE.MathUtils.lerp(bounds.min.z,bounds.max.z,iz/5),y=bounds.max.y;
      if(nav.blocked(x,y,z,false,1.72,.4)||Math.abs(nav.support(x,z,y,.025,.2)-y)>.001)continue;
      points.push({x,y,z,top:y});found=true;
    }
    assert(found,'each finish has a real accessible test point');
  }
  for(const path of paths){
    const position=path.geometry.attributes.position;assert(path.material.polygonOffset);let found=false;
    for(let i=12;i<position.count-12&&!found;i+=12){
      const x=(position.getX(i)+position.getX(i+1))/2,z=(position.getZ(i)+position.getZ(i+1))/2,top=position.getY(i),y=nav.support(x,z,-.8,.025,.3);
      assert(Math.abs(top+.83)<.001,'garden paths are flush with the physical ground');
      if(y>-.82||nav.blocked(x,y,z,false,1.72,.4))continue;
      points.push({x,y,z,top});found=true;
    }
    assert(found,'each path has a clear point for small props');
  }
  for(const point of points)for(const [n,kind]of ['shedKey','rearDoorKey','bananaPeel','fork'].entries()){
    const entry=items.place(propItem(kind,`surface-${fps}-${tested++}`),{valid:true,position:new THREE.Vector3(point.x,point.y+.7,point.z),yaw:.3});assert(entry);
    entry.body.quaternion.setFromEuler(.3+n*.11,.4,.2);entry.body.angularVelocity.set(.5,1,.3);
    for(let i=0;i<fps*5;i++)items.tick(1/fps);
    const bounds=new THREE.Box3().setFromObject(entry.mesh);assert(bounds.min.y>=point.top-.00005,`${kind} stays entirely above the actual visible floor at ${fps} FPS (${bounds.min.y} vs ${point.top})`);
    const ray=items.physics.ray(new THREE.Vector3(entry.x,entry.y+.4,entry.z),new THREE.Vector3(entry.x,point.y-.2,entry.z));assert.equal(ray?.body.propEntry,entry,'settled thin props remain physically pickable');items.confiscate(kind);
  }
}
console.log(`Surfaces OK: ${tested} real rotated thin-prop drops on every accessible tile/carpet finish and garden path at 30/60/144 FPS stay above visible surfaces and remain pickable, with flush decals and matching collision floors.`);
