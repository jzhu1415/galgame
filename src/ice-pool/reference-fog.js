import * as THREE from 'three';

// A real, tone-mapped surface behind loaded geometry prevents the unfogged
// scene background from showing through distant corridor openings.
export function createFogBoundary(scene, { chunkSize, viewRadius }) {
  const size = chunkSize * (viewRadius * 2 + 1) + 2;
  const geometry = new THREE.BoxGeometry(size, 28, size);
  // Keep the four sides only: an enclosing roof would occlude skylight skies.
  const walls = geometry.groups.filter((_, index) => index !== 2 && index !== 3);
  const indices = geometry.index.array;
  geometry.setIndex(walls.flatMap(({ start, count }) => Array.from(indices.slice(start, start + count))));
  geometry.clearGroups();
  const material = new THREE.MeshBasicMaterial({
    color: scene.fog.color, side: THREE.BackSide, fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'distance-fog-boundary';
  mesh.frustumCulled = false;
  scene.add(mesh);
  let disposed = false;
  return {
    mesh,
    update(centerX, centerZ) {
      if (disposed) return;
      const x = (centerX + 0.5) * chunkSize, z = (centerZ + 0.5) * chunkSize;
      if (mesh.position.x !== x || mesh.position.y !== 3 || mesh.position.z !== z) {
        mesh.position.set(x, 3, z);
        mesh.updateMatrixWorld();
      }
      material.color.copy(scene.fog.color);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
