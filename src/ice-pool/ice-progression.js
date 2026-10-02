import * as THREE from 'three';

// Evidence is deliberately staged: only the current exhibit can be collected.
export const ICE_LAYOUT = {
  note: new THREE.Vector3(7.5, .05, 9.35),
  footage: new THREE.Vector3(7.5, .72, 22.5),
  shard: new THREE.Vector3(7.5, .72, 49.5),
  echo: new THREE.Vector3(7.5, .72, 82.5),
  core: new THREE.Vector3(7.5, 1.35, 97.5),
};

// Each recovered exhibit starts the next walk through the north passage.
// Doorway checkpoints advance the journey without a separate lock puzzle.
export const ICE_ROUTE_ONE = [[7.5,22.5],[7.5,31.5],[7.5,38.5],[7.5,44.5],[7.5,49.5]];
export const ICE_ROUTE_TWO = [[7.5,49.5],[7.5,56.5],[7.5,61.5],[7.5,73.5],[7.5,82.5]];
export const ICE_ROUTES = [ICE_ROUTE_ONE, ICE_ROUTE_TWO];

export function currentIceStage(found = new Set()) {
  if (!found.has('note')) return 'note';
  if (!found.has('footage')) return 'footage';
  if (!found.has('routeOne') && !found.has('route')) return 'routeOne';
  if (!found.has('shard')) return 'shard';
  if (!found.has('route')) return 'routeTwo';
  if (!found.has('echo')) return 'echo';
  return 'core';
}

export function canCollectIceEvidence(id, found = new Set()) {
  const stage = currentIceStage(found);
  return id === stage;
}
