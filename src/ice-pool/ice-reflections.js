import * as THREE from 'three';

// Capture real rooms for chapter props only. Pool tiles keep their own lighting.
export function createIceReflections({ renderer, scene, roots }) {
  if (!renderer) return { refresh() {}, dispose() {} };
  const captureTarget = new THREE.WebGLCubeRenderTarget(128, {
    type: renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType,
    generateMipmaps: false,
  });
  const cubeCamera = new THREE.CubeCamera(.1, 40, captureTarget);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const probes = [8.5, 33.5, 66.5, 97.5].map(z => ({ z, target: null, materials: new Set() }));
  const worldPosition = new THREE.Vector3();
  const originalMaps = new Map();
  for (const root of roots.filter(Boolean)) {
    root.updateWorldMatrix(true, true);
    root.traverse(object => {
      if (!object.isMesh || object.isReflector) return;
      object.getWorldPosition(worldPosition);
      const probe = probes.reduce((nearest, candidate) =>
        Math.abs(candidate.z - worldPosition.z) < Math.abs(nearest.z - worldPosition.z) ? candidate : nearest);
      for (const material of [].concat(object.material || [])) {
        if (!material.isMeshStandardMaterial) continue;
        // Shared landmark materials use the room nearest the camera; each probe
        // rebinds them when visited, so their reflections follow the actual room.
        probe.materials.add(material);
        if (!originalMaps.has(material)) originalMaps.set(material, material.envMap);
      }
    });
  }
  let disposed = false;
  let activeProbe = null;
  return {
    refresh(camera) {
      if (disposed) return;
      const probe = probes.reduce((nearest, candidate) =>
        Math.abs(candidate.z - camera.position.z) < Math.abs(nearest.z - camera.position.z) ? candidate : nearest);
      if (Math.abs(probe.z - camera.position.z) > 20) return;
      if (!probe.target) {
        // Planar mirrors render their own cameras. Hide them during cube capture
        // to prevent nested reflection passes and feedback from the prop itself.
        const hidden = [];
        scene.traverse(object => {
          if (object.isReflector && object.visible) hidden.push(object);
        });
        for (const root of roots.filter(Boolean)) if (root.visible) hidden.push(root);
        const previousFog = scene.fog;
        try {
          hidden.forEach(object => { object.visible = false; });
          scene.fog = null; // Record room surfaces; apply view fog only on the final render.
          cubeCamera.position.set(7.5, 1.8, probe.z);
          cubeCamera.update(renderer, scene);
          probe.target = pmrem.fromCubemap(captureTarget.texture);
        } finally {
          scene.fog = previousFog;
          hidden.forEach(object => { object.visible = true; });
        }
      }
      if (activeProbe === probe) return;
      activeProbe = probe;
      for (const material of probe.materials) {
        material.envMap = probe.target.texture;
        material.needsUpdate = true;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const [material, envMap] of originalMaps) material.envMap = envMap;
      probes.forEach(probe => probe.target?.dispose());
      captureTarget.dispose(); pmrem.dispose();
    },
  };
}
