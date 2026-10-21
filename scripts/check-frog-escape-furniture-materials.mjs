import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {finishFurnitureMaterials,furnitureSurfaceUV} from '../src/frog-escape-materials.js';
import {createCastleDetailMaps} from '../src/frog-escape-surface-detail.js';
import {createEscapeQuality} from '../src/frog-escape-quality.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {createInventory} from '../src/frog-escape-inventory.js';

// Preserve the existing floor/wall appearance byte for byte. New furniture
// families must not replace any of these previously shipped detail maps.
const existing={wood:'01603fab513491daf3236689513b1d5fab2f603bc32d092bff14c58ca7e72fc5',stone:'c220d6b9986092732389f3f84f745c515cc6716eb70d5a56692a7ab825383c6b',plaster:'930bce0fc6cb823aa364ecd0039037427ebae1a441d1e89105697953db050a34',tile:'e48109123ec0109b53951fd9c052ee677aa7e1b0567232011b3262596026c86f',slate:'0c38bdc99a2e369f4782ab2377553daa69e5b41d44e4c2f3a78debd24c65293b'};
for(const [kind,hash]of Object.entries(existing)){
  const maps=createCastleDetailMaps(kind,{size:128});assert.equal(createHash('sha256').update(maps.map.image.data).update(maps.normalMap.image.data).update(maps.roughnessMap.image.data).digest('hex'),hash,`${kind} retains the existing floor/wall texture`);maps.dispose();
}
const materials={furnitureWood:new THREE.MeshStandardMaterial(),furnitureTrim:new THREE.MeshStandardMaterial(),cabinetWood:new THREE.MeshStandardMaterial(),basementWood:new THREE.MeshStandardMaterial(),basementTrim:new THREE.MeshStandardMaterial(),marble:new THREE.MeshPhysicalMaterial({roughness:.24,clearcoat:.35})};
finishFurnitureMaterials(materials,{textures:true});assert.equal(materials.furnitureWood.map,materials.furnitureTrim.map);assert.notEqual(materials.furnitureWood.map,materials.cabinetWood.map);assert.notEqual(materials.marble.map,materials.cabinetWood.map);
assert.equal(materials.basementWood.map,materials.cabinetWood.map);assert(materials.basementWood.color.r<materials.cabinetWood.color.r*.6,'basement timber retains a dark tint in all presets');
const mean=texture=>{const data=texture.image.data;let sum=0;for(let i=0;i<data.length;i+=4)sum+=(data[i]+data[i+1]+data[i+2])/3;return sum/(data.length/4);};
assert(mean(materials.marble.map)>225,'marble is predominantly white rather than wall stone');assert(mean(materials.furnitureWood.map)>mean(materials.cabinetWood.map)+35,'table and chair timber stays visibly lighter than walnut cabinets');
let min=255,max=0;for(let i=0;i<materials.marble.map.image.data.length;i+=4){min=Math.min(min,materials.marble.map.image.data[i]);max=Math.max(max,materials.marble.map.image.data[i]);}assert(max-min>35,'white marble contains visible natural veins');
const table=furnitureSurfaceUV(new THREE.BoxGeometry(3.2,.08,1.4)),leg=furnitureSurfaceUV(new THREE.BoxGeometry(.14,.82,.14));
for(const [geometry,axis]of [[table,'X'],[leg,'Y']])for(let i=0;i<geometry.attributes.position.count;i++){
  const normal=geometry.attributes.normal;if(geometry===table&&normal.getY(i)>.5||geometry===leg&&Math.abs(normal.getZ(i))>.5)assert(Math.abs(geometry.attributes.uv.getY(i)-geometry.attributes.position[`get${axis}`](i)*.5)<1e-7,'continuous grain follows each timber part, not floorboard strips');
}

const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),tops=[];scene.traverse(mesh=>{if(mesh.name==='furniture:kitchen-marble-top')tops.push(mesh);});assert.equal(tops.length,2);
const racks=[];castle.groups.basement.traverse(mesh=>{if(mesh.name==='furniture:cellar-wine-rack')racks.push(mesh);if(mesh.material?.userData.furnitureSurface){assert.equal(mesh.material.userData.furnitureSurface,'cabinetWood');assert(mesh.material.color.r<.15,'every basement furniture surface uses dark timber');}});assert.equal(racks.length,2);
const wineSeeds=castle.pickupSeeds.filter(seed=>seed.mesh.name.startsWith('wine-rack:'));assert.equal(wineSeeds.length,24);assert.equal(wineSeeds.filter(seed=>seed.item.kind==='bottle').length,12);assert.equal(wineSeeds.filter(seed=>seed.item.kind==='glass').length,12);
for(const top of tops){assert.equal(top.material.userData.furnitureSurface,'marble');assert(top.material.isMeshPhysicalMaterial);assert(top.material.clearcoat>0);}
for(const name of ['furniture:dining-tabletop','furniture:desk-tabletop'])assert.equal(scene.getObjectByName(name).material.userData.furnitureSurface,'furnitureWood');
for(const chair of castle.navigation.chairs)for(const mesh of chair.meshes)if(mesh.material.userData.audioMaterial==='wood')assert.equal(mesh.material.userData.furnitureSurface,'furnitureWood');
for(const action of castle.interactables.filter(action=>action.hideVolume))assert(action.motions.every(motion=>motion.pivot.children.some(mesh=>mesh.material?.userData.furnitureSurface==='cabinetWood')));
const moon=new THREE.DirectionalLight(),renderer={capabilities:{maxTextureSize:4096,getMaxAnisotropy:()=>8},shadowMap:{},ratio:1,setPixelRatio(v){this.ratio=v;},getPixelRatio(){return this.ratio;},setSize(){},render(){}};
const base=new Map(tops.map(top=>[top.material,{map:top.material.map,normalMap:top.material.normalMap,roughnessMap:top.material.roughnessMap}]));
const quality=createEscapeQuality({renderer,scene,moonlight:moon,dpr:()=>1,loadEffects:async()=>({createQualityEffects:()=>({resize(){},render(){},dispose(){}})})});quality.setQuality('high');
for(const top of tops){assert.equal(top.material.map.image.width,512);assert(top.material.map.name.includes('marble'));assert(top.material.normalMap&&top.material.roughnessMap);}
quality.setQuality('low');for(const [material,original]of base){assert.equal(material.map,original.map);assert.equal(material.normalMap,original.normalMap);assert.equal(material.roughnessMap,original.roughnessMap);}quality.dispose();
const items=createWorldItems(scene,castle.navigation,castle.pickupSeeds),inventory=createInventory();
for(const kind of ['bottle','glass']){
  const seed=wineSeeds.find(seed=>seed.item.kind===kind),entry=items.entries.find(entry=>entry.item.id===seed.item.id),target=entry.mesh.getWorldPosition(new THREE.Vector3());
  const origin=new THREE.Vector3(target.x,Math.max(target.y,-3.5),target.z+1.1),direction=target.clone().sub(origin).normalize();
  assert(items.nearby(origin,direction,0)===entry,`the open shelf leaves a real aiming ray to the ${kind}`);assert(items.pickup(entry,inventory));assert(inventory.slots.some(item=>item?.id===seed.item.id));
}
new Set(Object.values(materials).map(material=>material.map)).forEach(map=>map.dispose());Object.values(materials).forEach(material=>material.dispose());table.dispose();leg.dispose();
console.log('Furniture materials OK: white veined marble counters, light continuous-grain tables/chairs, walnut cabinets and dark basement timber; open wine racks with 24 real bottles/glasses and aimed pickup; grain direction/high PBR/restoration and existing floor/wall hashes unchanged.');
