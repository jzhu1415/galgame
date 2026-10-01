import * as THREE from 'three';

// Evidence is deliberately staged: only the current exhibit can be collected.
export const ICE_LAYOUT = {
  note: new THREE.Vector3(7.5, .05, 9.35),
  footage: new THREE.Vector3(7.5, .72, 22.5),
  shard: new THREE.Vector3(2.1, .72, 41.9),
  echo: new THREE.Vector3(12.1, .72, 71.9),
  core: new THREE.Vector3(7.5, 1.35, 97.5),
};

export const ICE_ROUTE_ONE = [[12.1,31.9],[12.1,36.9],[7.1,36.9],[7.1,41.9],[2.1,41.9]];
export const ICE_ROUTE_TWO = [[2.1,61.9],[7.1,61.9],[7.1,66.9],[12.1,66.9],[12.1,71.9]];
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
