import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createIceLandmarks } from '../src/ice-pool/ice-landmarks.js';
import { makeMirrorFragment } from '../src/ice-pool/ice-props.js';
import { PoolLighting } from '../src/ice-pool/environment/PoolLighting.js';

const vertices = root => {
  let count = 0;
  root.traverseVisible(object => {
    if (object.isMesh) count += (object.geometry.index?.count ?? object.geometry.attributes.position.count)
      * (object.isInstancedMesh ? object.count : 1);
  });
  return count;
};
const scene = new THREE.Scene(), landmarks = createIceLandmarks({ scene, streaming: false });
const full = vertices(scene);
landmarks.setQuality('performance'); const low = vertices(scene);
landmarks.setQuality('ultra');
const ultra = vertices(scene);
assert(ultra < low * .65, 'Ultra low must render substantially fewer crystal vertices than the existing low preset');
scene.traverseVisible(object => {
  if (object.isMesh && object.material.isMeshPhysicalMaterial) assert.equal(object.material.transmission, 0, 'Ultra low avoids the refraction pass');
});
const floating = scene.getObjectByName('ice-floating-core-west');
const matrixVersion = floating.instanceMatrix.version;
landmarks.update(.1, 30, { camera: { position: new THREE.Vector3(7.5, 1.7, 97.5) } });
assert.equal(floating.instanceMatrix.version, matrixVersion, 'Ultra low suspends decorative floating animation uploads');
for (const preset of ['balanced', 'ultra', 'high']) {
  landmarks.setQuality(preset);
  if (preset !== 'ultra') assert.equal(vertices(scene), full, 'Switching back restores all crystal geometry');
}
landmarks.dispose();

for (const id of ['footage', 'shard', 'echo']) {
  const prop = makeMirrorFragment({ id, position: new THREE.Vector3(3, 1, 20) });
  const bounds = new THREE.Box3().setFromObject(prop);
  assert(bounds.getSize(new THREE.Vector3()).x < 1.5, 'Fine prop geometry stays on its reachable tray');
  assert.equal(typeof prop.userData.setQuality, 'function', 'Evidence models support real geometry LOD');
  const fine = vertices(prop);
  const checkLensCracks = () => {
    if (id !== 'shard') return;
    const surface = new THREE.Box3().setFromObject(prop.getObjectByName('evidence-lens')).max.y;
    prop.traverse(object => {
      if (object.name === 'evidence-lens-crack') assert(new THREE.Box3().setFromObject(object).min.y > surface, 'Cracks sit above the glass in either LOD instead of being buried by its new thickness');
    });
  };
  checkLensCracks();
  const originalGeometry = new Map();
  prop.traverse(object => {
    if (!object.geometry || originalGeometry.has(object.geometry)) return;
    const record = { disposals: 0 };
    object.geometry.addEventListener('dispose', () => record.disposals++);
    originalGeometry.set(object.geometry, record);
  });
  prop.userData.setQuality('performance');
  checkLensCracks();
  assert(vertices(prop) < fine, 'Low quality removes close-up bevel geometry');
  assert([...originalGeometry.values()].some(record => record.disposals === 1), 'Replaced fine geometry is released immediately');
  prop.userData.setQuality('ultra');
  assert(prop.userData.mirrorFaces.every(face => !face.visible), 'Ultra low disables expensive planar mirror captures');
  assert(prop.userData.reflectionFallbacks.some(face => face.visible), 'A room-reflective surface replaces the disabled live mirror');
  prop.traverseVisible(object => { if (object.isMesh && object.material.isMeshPhysicalMaterial) assert.equal(object.material.transmission, 0); });
  prop.userData.setQuality('high');
  checkLensCracks();
  assert.equal(vertices(prop), fine, 'Returning to high quality restores detailed evidence models');
  assert.equal(prop.userData.clueId, id);
  assert(prop.position.equals(new THREE.Vector3(3, 1, 20)), 'Quality changes never relocate evidence');
  const resources = new Set();
  prop.traverse(object => { if (object.geometry) resources.add(object.geometry); for (const material of [].concat(object.material ?? [])) resources.add(material); const target = object.getRenderTarget?.(); if (target) resources.add(target); });
  resources.forEach(resource => resource.dispose());
  assert([...originalGeometry.values()].every(record => record.disposals === 1), 'Fine geometry is released once, including geometry shared by mirror fallbacks');
}
const lightingScene = new THREE.Scene();
const lighting = new PoolLighting(lightingScene);
lighting.setQuality('ultra');
assert.equal(lighting.activeCount, 4);
assert.equal(lighting.lights.filter(light => light.visible).length, 4, 'Ultra reduces actual visible shader lights');
lighting.setQuality('high');
assert.equal(lighting.lights.filter(light => light.visible).length, 16, 'Other presets restore the room light pool');
lighting.dispose();
assert.equal(lightingScene.children.length, 0, 'Light disposal removes lights and targets');
console.log(`Crystal vertex references: full=${full}, low=${low}, ultra=${ultra}.`);
console.log('Ice ultra OK: fewer vertices than Low, no transmission, suspended decoration animation, detailed evidence LOD, reflective fallback, full restoration and unchanged clue positions.');
