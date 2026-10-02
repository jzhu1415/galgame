import * as THREE from 'three';

// Capture real rooms for chapter props only. Pool tiles keep their own lighting.
export function createIceReflections({ renderer, scene, roots }) {
  if (!renderer) return { refresh() {}, setQuality() {}, invalidate() {}, dispose() {} };
  const captureRoots = roots.filter(Boolean);
  const captureOptions = {
    type: renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType,
    generateMipmaps: false,
  };
  let captureTarget = new THREE.WebGLCubeRenderTarget(128, captureOptions);
  const cubeCamera = new THREE.CubeCamera(.1, 40, captureTarget);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const probes = [8.5, 33.5, 66.5, 97.5].map((z, index) => ({
    z, roomZ: 7.5 + index * 30, target: null, dirty: true,
  }));
  const originalMaps = new Map();
  for (const root of captureRoots) {
    root.traverse(object => {
      if (!object.isMesh || object.isReflector) return;
      for (const material of [].concat(object.material || [])) {
        if (!material.isMeshStandardMaterial) continue;
        if (!originalMaps.has(material)) originalMaps.set(material, material.envMap);
      }
    });
  }
  let disposed = false;
  let activeProbe = null;
  let captureSize = 128;
  let dirtyAfter = 0;
  function invalidate({ delayMs = 0 } = {}) {
    if (disposed) return;
    dirtyAfter = performance.now() + delayMs;
    // Retain the current valid texture through corridors. Replace and release
    // each stale capture on its next visit instead of causing a black frame.
    probes.forEach(probe => { probe.dirty = true; });
  }
  function bindMap(material, texture) {
    if (material.envMap === texture) return;
    const previousMapping = material.envMap?.mapping;
    material.envMap = texture;
    if (previousMapping !== texture?.mapping) material.needsUpdate = true;
  }
  return {
    invalidate,
    setQuality(preset) {
      if (disposed) return;
      const size = preset === 'performance' ? 64 : 128;
      if (size === captureSize) return;
      captureSize = size;
      // Recreate all six face images too: generic RenderTarget.setSize updates
      // the array wrapper, leaving the cubemap face sizes used by PMREM stale.
      const previous = captureTarget;
      captureTarget = new THREE.WebGLCubeRenderTarget(size, captureOptions);
      cubeCamera.renderTarget = captureTarget;
      previous.dispose();
      invalidate();
    },
    refresh(camera) {
      if (disposed) return;
      const probe = probes.reduce((nearest, candidate) =>
        Math.abs(candidate.roomZ - camera.position.z) < Math.abs(nearest.roomZ - camera.position.z) ? candidate : nearest);
      // Capture only after the room's own lights are active at full strength.
      if (Math.abs(probe.roomZ - camera.position.z) > 10) return;
      let previousTarget = null;
      if (!probe.target || (probe.dirty && performance.now() >= dirtyAfter)) {
        // Planar mirrors render their own cameras. Hide them during cube capture
        // to prevent nested reflection passes and feedback from the prop itself.
        const hidden = [];
        scene.traverse(object => {
          if (object.isReflector && object.visible) hidden.push(object);
        });
        for (const root of captureRoots) if (root.visible) hidden.push(root);
        const previousFog = scene.fog;
        try {
          hidden.forEach(object => { object.visible = false; });
          scene.fog = null; // Record room surfaces; apply view fog only on the final render.
          cubeCamera.position.set(7.5, 1.8, probe.z);
          cubeCamera.update(renderer, scene);
          const target = pmrem.fromCubemap(captureTarget.texture);
          previousTarget = probe.target;
          probe.target = target;
          probe.dirty = false;
        } finally {
          scene.fog = previousFog;
          hidden.forEach(object => { object.visible = true; });
        }
      }
      if (activeProbe === probe && !previousTarget) return;
      activeProbe = probe;
      // Shared crystal materials and nearby metal props use the same local room
      // map; rebinding an existing PMREM changes uniforms, not shader features.
      for (const material of originalMaps.keys()) bindMap(material, probe.target.texture);
      previousTarget?.dispose();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const [material, envMap] of originalMaps) bindMap(material, envMap);
      probes.forEach(probe => probe.target?.dispose());
      captureTarget.dispose(); pmrem.dispose();
    },
  };
}
