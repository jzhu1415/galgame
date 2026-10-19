import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createIceFrozenNaiwa } from '../src/ice-pool/ice-frozen-naiwa.js';

const bytes = readFileSync(new URL('../assets/models/naiwa-h25-refined.glb', import.meta.url));
const parse = () => new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const gltf = await parse();
const frozen = createIceFrozenNaiwa({ loader: { loadAsync: async () => gltf } });
assert.equal(await frozen.ready, true);
const model = frozen.root.getObjectByName('ice-frozen-naiwa-model');
assert.ok(model, 'The real GLB is attached inside the ice');
frozen.root.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(model);
assert.ok(box.max.y - box.min.y > 1.2, 'The character remains large enough to see');
const inverse = frozen.shell.matrixWorld.clone().invert();
const vertex = new THREE.Vector3();
model.traverse(object => {
  if (!object.isMesh) return;
  assert.ok(object.geometry.getAttribute('color'), 'Original character vertex colours survive loading');
  const positions = object.geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).applyMatrix4(inverse);
    assert.ok(Math.abs(vertex.x) + Math.abs(vertex.y) + Math.abs(vertex.z) < .91,
      'Every model vertex stays inside the actual octahedral crystal faces');
  }
});
for (const quality of ['ultra', 'balanced', 'performance', 'high']) {
  frozen.setQuality(quality);
  assert.equal(frozen.shell.material.transmission, quality === 'ultra' ? 0 : .9);
  assert.ok(frozen.shell.material.transparent && !frozen.shell.material.depthWrite);
  assert.ok(frozen.shell.material.opacity < .7, 'The shell cannot hide the character in any preset');
}
const resources = new Set();
model.traverse(object => { if (object.geometry) resources.add(object.geometry); if (object.material) resources.add(object.material); });
resources.add(frozen.shell.geometry); resources.add(frozen.shell.material);
const counts = new Map();
for (const resource of resources) resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1));
frozen.dispose(); frozen.dispose();
assert.equal(frozen.root.children.length, 0);
assert.ok([...resources].every(resource => counts.get(resource) === 1), 'Exit frees each model and crystal resource exactly once');

let resolveLoad;
const late = createIceFrozenNaiwa({ loader: { loadAsync: () => new Promise(resolve => { resolveLoad = resolve; }) } });
late.dispose();
const lateGltf = await parse();
let released = 0;
lateGltf.scene.children[0].geometry.addEventListener('dispose', () => released++);
resolveLoad(lateGltf);
assert.equal(await late.ready, false);
assert.equal(late.root.children.length, 0, 'A late load cannot reattach the model after exit');
assert.equal(released, 1, 'A late load is released too');
const failed = createIceFrozenNaiwa({ loader: { loadAsync: async () => { throw new Error('offline'); } } });
assert.equal(await failed.ready, false);
assert.ok(failed.shell.parent === failed.root, 'Load failure keeps the original crystal usable');
failed.dispose();
console.log('Frozen Naiwa OK: real GLB, full crystal containment, all graphics presets, load failure and early-exit cleanup.');
