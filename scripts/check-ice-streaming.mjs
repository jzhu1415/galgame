import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createIceLandmarks } from '../src/ice-pool/ice-landmarks.js';

const cameraAt = z => ({ position: new THREE.Vector3(7.5, 1.7, z) });
const count = scene => {
  let result = 0;
  scene.traverse(object => { if (object.userData.crystalCount) result += object.userData.crystalCount; });
  return result;
};
function trackGeometry(run) {
  const setAttribute = THREE.BufferGeometry.prototype.setAttribute, records = new Map();
  THREE.BufferGeometry.prototype.setAttribute = function (name, attribute) {
    if (name === 'position' && !records.has(this)) {
      const record = { vertices: attribute.count, disposals: 0 };
      this.addEventListener('dispose', () => record.disposals++); records.set(this, record);
    }
    return setAttribute.call(this, name, attribute);
  };
  try { run(records); } finally { THREE.BufferGeometry.prototype.setAttribute = setAttribute; }
  return records;
}

test('entry creates nearby crystal buffers only, rather than constructing hidden distant models', () => {
  const eagerScene = new THREE.Scene(); let eager;
  const eagerRecords = trackGeometry(() => { eager = createIceLandmarks({ scene: eagerScene, streaming: false }); });
  const scene = new THREE.Scene(), camera = cameraAt(7.5); let landmarks;
  const records = trackGeometry(() => { landmarks = createIceLandmarks({ scene, camera, viewRadius: 1 }); });
  try {
    assert(!scene.getObjectByName('ice-floating-core-west'), 'Distant core batches are not created at entry');
    assert(count(scene) > 50 && count(scene) < count(eagerScene) * .5, 'The near rooms keep their full crystal density');
    const allocation = entries => [...entries.values()].reduce((sum, record) => sum + record.vertices, 0);
    assert(allocation(records) < allocation(eagerRecords) * .5, 'Lazy loading reduces actual initial BufferGeometry allocation');
  } finally { landmarks.dispose(); eager.dispose(); }
});

test('walking between rooms unloads buffers and deterministically restores the same crystals on return', () => {
  trackGeometry(records => {
    const scene = new THREE.Scene(), camera = cameraAt(97.5);
    const landmarks = createIceLandmarks({ scene, camera, viewRadius: 1 });
    try {
      const core = scene.getObjectByName('ice-dense-ground-core-west');
      const original = Array.from(core.geometry.attributes.position.array);
      const oldGeometry = core.geometry;
      const floats = scene.getObjectByName('ice-floating-core-west'); let instanceDisposals = 0;
      floats.addEventListener('dispose', () => { instanceDisposals++; });
      camera.position.z = 7.5; landmarks.update(.016, 20, { camera });
      assert(!scene.getObjectByName(core.name), 'Unloaded models leave the render tree');
      assert.equal(records.get(oldGeometry).disposals, 1, 'Leaving releases the old room geometry immediately');
      assert.equal(instanceDisposals, 1, 'Leaving releases instance matrices too');
      camera.position.z = 97.5; landmarks.update(.016, 20, { camera });
      const restored = scene.getObjectByName(core.name);
      assert(restored !== core, 'Return reconstructs the room instead of keeping a hidden object cache');
      assert.deepEqual(Array.from(restored.geometry.attributes.position.array), original, 'Return preserves crystal shapes and positions');
      const restoredFloat = scene.getObjectByName('ice-floating-core-west');
      assert.equal(restoredFloat.count, 30, 'Returning does not append duplicate floating instances');
      assert(restoredFloat.boundingSphere.radius < 16, 'Returning retains the original room-sized animation bounds');
      const live = records.size;
      landmarks.update(.016, 21, { camera });
      assert.equal(records.size, live, 'Staying in the same map chunk never rebuilds crystal geometry');
      const activeBuffers = () => [...records.values()].filter(record => record.disposals === 0).length;
      const coreBuffers = activeBuffers();
      for (let visit = 0; visit < 6; visit++) {
        camera.position.z = 7.5; landmarks.update(.016, 22 + visit, { camera });
        camera.position.z = 97.5; landmarks.update(.016, 22 + visit, { camera });
        assert.equal(activeBuffers(), coreBuffers, 'Repeated room visits keep the live geometry budget bounded');
      }
    } finally { landmarks.dispose(); landmarks.dispose(); }
    assert([...records.values()].every(record => record.disposals === 1), 'Every generated buffer is released exactly once');
  });
});

test('map chunk boundaries preload the next room and horizontal travel also releases crystal regions', () => {
  const scene = new THREE.Scene(), camera = cameraAt(47.9);
  const landmarks = createIceLandmarks({ scene, camera, viewRadius: 1 });
  try {
    assert(scene.getObjectByName('ice-dense-ground-crystal-west'), 'The next room is ready before reaching its entrance');
    camera.position.x = 80; landmarks.update(.016, 1, { camera });
    assert.equal(count(scene), 0, 'Moving outside the wall/floor chunk window unloads the crystal rooms on both axes');
    camera.position.x = 7.5; landmarks.update(.016, 2, { camera });
    assert(scene.getObjectByName('ice-dense-ground-crystal-west'), 'Returning horizontally restores the nearby room too');
  } finally { landmarks.dispose(); }
});

test('unloaded rooms rebuild at the current quality and embedded lights follow newly loaded wall crystals', () => {
  const scene = new THREE.Scene(), camera = cameraAt(7.5);
  const landmarks = createIceLandmarks({ scene, camera, viewRadius: 1 });
  try {
    landmarks.setQuality('ultra');
    camera.position.z = 97.5; landmarks.update(.016, 25, { camera });
    const reduced = scene.getObjectByName('ice-dense-ground-core-west');
    assert(reduced.userData.crystalCount < 20, 'A room first visited in Ultra is built with reduced density');
    assert.equal(reduced.material.transmission, 0);
    landmarks.setQuality('high');
    const full = scene.getObjectByName(reduced.name);
    assert.equal(full.userData.crystalCount, 75, 'High quality restores the full room density');
    for (const side of ['west', 'east']) {
      const light = scene.getObjectByName(`ice-crystal-light-${side}`);
      const cluster = scene.getObjectByName(`ice-wall-crystals-core-${side}`);
      const expected = new THREE.Vector3().fromArray(cluster.userData.crystalLightPoint).add(cluster.position);
      assert(light.position.distanceTo(expected) < 1e-8, 'Lights stay embedded after a lazy load and a quality rebuild');
    }
    camera.position.z = 7.5; landmarks.update(.016, 26, { camera });
    camera.position.z = 97.5; landmarks.update(.016, 27, { camera });
    assert.equal(scene.getObjectByName(full.name).userData.crystalCount, 75);
  } finally { landmarks.dispose(); }
});
