import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { iceQualitySettings } from './ice-quality.js';

// Import only the static coloured mesh, independently of the escape game's map and rig.
const modelUrl = new URL('../../assets/models/naiwa-h25-refined.glb', import.meta.url).href;

function release(root) {
  const resources = new Set();
  root.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    for (const material of [].concat(object.material || [])) {
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
      resources.add(material);
    }
  });
  resources.forEach(resource => resource.dispose());
  root.clear();
}

export function createIceFrozenNaiwa({ loader = new GLTFLoader() } = {}) {
  const root = new THREE.Group();
  root.name = 'ice-frozen-naiwa';
  const shell = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshPhysicalMaterial({
    color: 0xd8f3fa, roughness: .035, transmission: .9,
    ior: 1.31, thickness: .65, attenuationColor: 0xbfe8f2, attenuationDistance: 4,
    envMapIntensity: 1.7, flatShading: true,
    emissive: 0x163241, emissiveIntensity: .08,
    transparent: true, opacity: .62, depthWrite: false,
  }));
  shell.name = 'ice-frozen-naiwa-shell';
  shell.scale.set(1.15, 1.4, .95);
  shell.renderOrder = 2;
  root.add(shell);
  let disposed = false;
  const ready = loader.loadAsync(modelUrl).then(gltf => {
    const model = gltf.scene;
    if (disposed) { release(model); return false; }
    try {
      const holder = new THREE.Group();
      holder.name = 'ice-frozen-naiwa-model';
      holder.add(model);
      // The original face points +Z; visitors approach the core from the south (-Z).
      model.rotation.y += Math.PI;
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Empty Naiwa model');
      model.position.sub(bounds.getCenter(new THREE.Vector3()));
      model.updateMatrixWorld(true);
      // Fit the actual vertices to the sloping faces, not just an enclosing box.
      let extent = 0;
      const vertex = new THREE.Vector3();
      model.traverse(object => {
        if (!object.isMesh) return;
        const positions = object.geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++) {
          vertex.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
          extent = Math.max(extent, Math.abs(vertex.x) / shell.scale.x
            + Math.abs(vertex.y) / shell.scale.y + Math.abs(vertex.z) / shell.scale.z);
        }
      });
      if (!Number.isFinite(extent) || extent <= 0) throw new Error('Invalid Naiwa model');
      holder.scale.setScalar(Math.min(1.65 / size.y, .86 / extent));
      root.add(holder);
      return true;
    } catch {
      release(model);
      return false;
    }
  }).catch(() => false); // Keep the interactive core available if the asset fails to load.

  return {
    root, shell, ready,
    setQuality(preset) {
      if (disposed) return;
      const refract = iceQualitySettings(preset).refraction;
      const material = shell.material;
      const transmission = refract ? .9 : 0;
      if (material.transmission !== transmission) {
        material.transmission = transmission;
        material.needsUpdate = true;
      }
      material.opacity = refract ? .62 : .16;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      release(root);
    },
  };
}
