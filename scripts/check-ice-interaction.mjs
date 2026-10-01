import assert from 'node:assert/strict';
import { hasClearEvidencePath } from '../src/ice-pool/ice-interaction.js';
import * as THREE from 'three';
import { makeMirrorFragment, makeNote, makeRouteMarker, silverMaterial } from '../src/ice-pool/ice-props.js';
import { ICE_LAYOUT, currentIceStage, canCollectIceEvidence } from '../src/ice-pool/ice-progression.js';
import { createIceLandmarks } from '../src/ice-pool/ice-landmarks.js';

const landmarkScene = new THREE.Scene();
const landmarks = createIceLandmarks({ scene: landmarkScene });
landmarks.update(.05, 1, { found: new Set(['routeOne']) });
landmarkScene.updateMatrixWorld(true);
const walkingLane = new THREE.Box3(new THREE.Vector3(6.5, .2, 0), new THREE.Vector3(8.5, 2.7, 105));
let meshCount = 0;
const floatingCrystals = [];
const growthSurfaces = new Set();
const growthDirections = [];
const earlyRoomSurfaces = new Map();
landmarkScene.traverse(object => {
  if (!object.isMesh) return;
  meshCount++;
  assert.notEqual(object.geometry.type, 'TorusGeometry', 'Landmarks no longer contain ambiguous D-shaped supports');
  if (object.userData.floatingCrystal) floatingCrystals.push(object);
  if (object.userData.growthSurface) growthSurfaces.add(object.userData.growthSurface);
  if (object.userData.earlyRoom && object.userData.growthSurface) {
    const surfaces = earlyRoomSurfaces.get(object.userData.earlyRoom) || [];
    surfaces.push(object.userData.growthSurface);
    earlyRoomSurfaces.set(object.userData.earlyRoom, surfaces);
  }
  growthDirections.push(...(object.geometry.userData.growthDirections || []));
  if (object.material.transmission > 0) {
    assert.equal(object.material.metalness, 0, 'Crystal is a dielectric, not painted metal');
    assert.ok(object.material.transmission >= .9 && object.material.roughness < .06);
    assert.ok(object.material.attenuationDistance > 0 && object.material.flatShading);
    assert.equal(object.material.emissive.getHex(), 0, 'Crystal highlights come from lighting, not glow');
  }
  if (object.material.ior === 1.31 || object.geometry.userData.crystal) {
    const positions = object.geometry.attributes.position;
    const normals = object.geometry.attributes.normal;
    for (let index = 0; index < positions.count; index += 3) {
      const centre = new THREE.Vector3();
      for (let vertex = 0; vertex < 3; vertex++) centre.add(new THREE.Vector3().fromBufferAttribute(positions, index + vertex));
      centre.multiplyScalar(1 / 3);
      const origin = object.geometry.userData.facetOrigins?.[index / 3];
      if (origin) centre.sub(new THREE.Vector3().fromArray(origin));
      assert.ok(centre.dot(new THREE.Vector3().fromBufferAttribute(normals, index)) > 0,
        'Each crystal facet must face outward for visible reflections and correct refraction');
    }
  }
  assert.equal(new THREE.Box3().setFromObject(object).intersectsBox(walkingLane), false, 'Scenery must leave the northbound walking lane open');
});
assert.ok(meshCount <= 40, 'Landmarks keep a modest geometry budget');
for (const room of ['arrival', 'mirror']) {
  const surfaces = earlyRoomSurfaces.get(room) || [];
  assert.ok(surfaces.filter(surface => surface === 'floor').length >= 2 && surfaces.filter(surface => surface === 'wall').length >= 2,
    `${room} has crystal growth on both floor and walls`);
}
for (const side of ['left', 'right']) {
  assert.equal(landmarkScene.getObjectByName(`ice-core-standing-mirror-${side}`), undefined);
  const cluster = landmarkScene.getObjectByName(`ice-core-crystal-${side}`);
  assert.equal(cluster?.userData.kind, 'coreCrystalCluster', 'Core landmarks grow as crystal clusters');
}
assert.ok(growthSurfaces.has('floor') && growthSurfaces.has('wall'), 'Crystals grow from both floor and walls');
assert.ok(growthDirections.length > 4 && new Set(growthDirections.map(direction => direction.map(value => value.toFixed(2)).join(','))).size > 4,
  'Crystals grow in varied directions');
assert.ok(floatingCrystals.length >= 2, 'The hall has both grounded and floating crystals');
const poses = floatingCrystals.map(object => ({ position: object.position.clone(), rotation: object.rotation.clone() }));
landmarks.update(.1, 11, { found: new Set(['routeOne']) });
floatingCrystals.forEach((object, index) => {
  assert.ok(Math.abs(object.position.y - poses[index].position.y) <= .3, 'Floating motion remains subtle');
  assert.notEqual(object.rotation.y, poses[index].rotation.y, 'Floating crystal rotates slowly');
});
landmarks.update(.1, 1, { found: new Set(['routeOne']) });
floatingCrystals.forEach((object, index) => {
  assert.ok(object.position.distanceTo(poses[index].position) < 1e-6, 'Floating animation does not accumulate position drift');
});
landmarks.dispose(); landmarks.dispose();
assert.equal(landmarkScene.children.length, 0);

const progress = new Set();
for (const [stage, completedId] of [['note', 'note'], ['footage', 'footage'], ['routeOne', 'routeOne'],
  ['shard', 'shard'], ['routeTwo', 'route'], ['echo', 'echo']]) {
  assert.equal(currentIceStage(progress), stage, `The next objective must be ${stage}`);
  for (const id of ['note', 'footage', 'shard', 'echo']) {
    assert.equal(canCollectIceEvidence(id, progress), id === stage, `${id} must respect the current stage`);
  }
  progress.add(completedId);
}
assert.equal(currentIceStage(progress), 'core');
assert.equal(currentIceStage(new Set(['route', 'echo'])), 'note', 'An out-of-order legacy save can complete missing objectives');
assert.equal(currentIceStage(new Set(['note', 'footage', 'routeOne', 'route'])), 'shard', 'Legacy route completion does not hide a missing shard');
assert.ok(ICE_LAYOUT.shard.z - ICE_LAYOUT.footage.z > 15);
assert.ok(ICE_LAYOUT.echo.z - ICE_LAYOUT.shard.z > 25);
assert.ok(ICE_LAYOUT.core.z - ICE_LAYOUT.echo.z >= 15);

for (const id of ['footage', 'shard', 'echo']) {
  const model = makeMirrorFragment({ id, position: ICE_LAYOUT[id] });
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
