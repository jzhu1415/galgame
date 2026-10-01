import assert from 'node:assert/strict';
import { hasClearEvidencePath } from '../src/ice-pool/ice-interaction.js';
import * as THREE from 'three';
import { makeMirrorFragment, makeNote, makeRouteMarker, silverMaterial } from '../src/ice-pool/ice-props.js';

for (const id of ['footage', 'shard', 'echo']) {
  const model = makeMirrorFragment({ id, position: new THREE.Vector3(7.5, .72, 22.5) });
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(size.x <= 1.3 && size.z <= 1.3, `${id} must fit inside the corridor`);
  assert.ok(bounds.min.y >= 0 && bounds.min.y < .06, `${id} needs a grounded display stand`);
  assert.equal(model.userData.mirrorFaces.length, 2, `${id} retains its reflective faces`);
}
assert.ok(makeNote(new THREE.Vector3()).children.length > 0);
assert.ok(makeRouteMarker().userData.pulseMaterial);
assert.equal(silverMaterial({ color: 0xc7ecf4 }).color.getHex(), 0xc7ecf4);

assert.equal(hasClearEvidencePath({ x: 7.5, y: 1.7, z: 21 }, { x: 7.5, y: .72, z: 22.5 }), true, 'Nearby evidence in the corridor is reachable');
assert.equal(hasClearEvidencePath({ x: 7.5, y: 1.7, z: 17 }, { x: 7.5, y: .72, z: 22.5 }), false, 'Distant evidence cannot be collected');
assert.equal(hasClearEvidencePath({ x: 7.5, y: 1.7, z: 21 }, { x: 10.5, y: .72, z: 21 }, 3.8,
  x => ({ solid: x >= 9, level: 0, ceiling: 3.6 })), false, 'The injected Pool corridor wall blocks inspection');
assert.equal(hasClearEvidencePath({ x: 7.5, y: 1.7, z: 8 }, { x: 7.5, y: .05, z: 9.35 }), true, 'The entrance paper stays reachable');
console.log('Ice props and interaction OK: construction, corridor fit, grounded stands, reflective faces, range and walls.');
