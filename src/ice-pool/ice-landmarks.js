import * as THREE from 'three';

/** Three readable landmarks along the northbound route. All geometry stays outside x=6.5..8.5. */
export function createIceLandmarks({ scene }) {
  const root = new THREE.Group();
  root.name = 'ice-route-landmarks';
  const geometries = new Set();
  const materials = new Set();
  const animated = [];
  const boxGeometries = new Map();

  const silver = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xaebfc2, metalness: 0.84, roughness: 0.22,
    clearcoat: 1, clearcoatRoughness: 0.12, reflectivity: 0.92,
    emissive: 0x1b303a, emissiveIntensity: 0.035,
  }));
  const edge = ownMaterial(new THREE.MeshStandardMaterial({
    color: 0x60777d, metalness: 0.72, roughness: 0.3,
  }));
  const glass = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xb9d5d9, metalness: 0.16, roughness: 0.12,
    transmission: 0.28, thickness: 0.18, clearcoat: 1,
    clearcoatRoughness: 0.08, side: THREE.DoubleSide,
  }));
  const ice = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x9dbec5, metalness: 0.22, roughness: 0.18,
    clearcoat: 1, clearcoatRoughness: 0.08,
    emissive: 0x152a34, emissiveIntensity: 0.025,
  }));

  function ownMaterial(material) { materials.add(material); return material; }
  function ownGeometry(geometry) { geometries.add(geometry); return geometry; }
  function box(w, h, d) {
    const key = `${w}:${h}:${d}`;
    if (!boxGeometries.has(key)) boxGeometries.set(key, ownGeometry(new THREE.BoxGeometry(w, h, d)));
    return boxGeometries.get(key);
  }
  function mesh(geometry, material, x, y, z, parent = root) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }
  function beam(x, y, z, w, h, d, material = silver) {
    return mesh(box(w, h, d), material, x, y, z);
  }

  // 1. A fractured metal doorway: the two jambs and lintel frame the passage.
  for (const x of [5.5, 9.5]) {
    beam(x, 1.48, 33.5, 0.3, 2.96, 0.34);
    beam(x, 0.16, 33.5, 0.48, 0.12, 0.52, edge);
    beam(x, 2.89, 33.5, 0.44, 0.1, 0.48, edge);
  }
  beam(7.5, 3.0, 33.5, 4.0, 0.22, 0.34, silver);
  const scratches = ownGeometry(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(7.7, .016, 34.5), new THREE.Vector3(7.76, .016, 42.5),
    new THREE.Vector3(7.82, .016, 35.5), new THREE.Vector3(7.88, .016, 41.8),
  ]));
  root.add(new THREE.LineSegments(scratches, ownMaterial(new THREE.LineBasicMaterial({
    color: 0x9fb2b7, transparent: true, opacity: .55,
  }))));
  // Small broken mirror splinters sit on the outer edges of the frame.
  const shardGeometry = ownGeometry(new THREE.OctahedronGeometry(1, 0));
  for (const [x, y, z, sx, sy, sz, turn] of [
    [5.18, 2.35, 33.35, .19, .34, .08, .18],
    [9.83, 2.0, 33.64, .16, .28, .07, -.26],
    [5.29, 1.14, 33.7, .13, .22, .07, .5],
    [9.7, 2.61, 33.32, .14, .24, .07, -.42],
  ]) {
    const shard = mesh(shardGeometry, glass, x, y, z);
    shard.scale.set(sx, sy, sz);
    shard.rotation.set(0, turn, turn * 0.4);
  }

  // 2. Lateral ice clusters, with suspended shards kept above the walking camera.
  const crystalGeometry = ownGeometry(new THREE.ConeGeometry(1, 1, 5, 1));
  const crystalSpecs = [
    [3.5, 1.35, 62.4, .62, 1.5, .55, -.14], [3.8, 1.0, 65.0, .42, 1.1, .38, .28],
    [3.35, 1.2, 68.2, .56, 1.4, .48, -.32], [3.8, 1.05, 72.2, .48, 1.2, .45, .2],
    [11.5, 1.25, 61.8, .58, 1.4, .5, .2], [11.2, 1.05, 65.4, .44, 1.2, .4, -.22],
    [11.65, 1.4, 69.0, .62, 1.5, .52, .16], [11.25, 1.0, 72.5, .43, 1.15, .38, -.3],
  ];
  for (const [x, y, z, sx, sy, sz, ry] of crystalSpecs) {
    const c = mesh(crystalGeometry, ice, x, y, z);
    c.scale.set(sx, y * 2, sz);
    c.rotation.set(0, ry, (x < 7.5 ? 1 : -1) * .12);
    animated.push({ object: c, phase: z * .71, amount: 0.018, baseRotation: c.rotation.z });
  }
  for (const [x, z, size, turn] of [
    [5.1, 61.8, .36, .18], [9.9, 63.5, .29, -.24],
    [5.25, 68.7, .3, -.18], [9.8, 72.8, .35, .22],
  ]) {
    const hanger = mesh(crystalGeometry, glass, x, 3.27, z);
    hanger.scale.set(size * .62, size * 1.55, size * .62);
    hanger.rotation.set(0, turn, Math.PI);
    animated.push({ object: hanger, phase: z * .53, amount: 0.012, baseRotation: hanger.rotation.z });
  }
  // Narrow side-wall mirror slivers distinguish this chamber from the doorway.
  for (const [x, z, angle] of [[3.13, 63.6, -.15], [11.87, 67.0, .15], [3.12, 71.0, .12], [11.88, 62.0, -.12]]) {
    const pane = beam(x, 1.72, z, .045, 1.35, .56, glass);
    pane.rotation.y = angle;
    const rim = beam(x + (x < 7.5 ? .045 : -.045), 1.72, z, .06, 1.45, .64, edge);
    rim.rotation.y = angle;
  }

  // 3. A pair of tall crescent mirror ribs makes a broad, open-ended arc around the core.
  // Each rib lies at the room sides, leaving the whole x=6.5..8.5 corridor empty.
  const archCurveGeometry = ownGeometry(new THREE.TorusGeometry(1, 0.085, 5, 20, Math.PI));
  for (const side of [-1, 1]) {
    const arch = mesh(archCurveGeometry, silver, side < 0 ? 4.0 : 11.0, 1.63, 100);
    // TorusGeometry's half-circle is turned upright and opens toward the room center.
    arch.rotation.z = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    arch.scale.set(1.38, 1.65, 1);
    const backing = beam(side < 0 ? 4.15 : 10.85, 1.63, 100, .12, 2.42, .16, edge);
    backing.rotation.z = side < 0 ? -.12 : .12;
    // Thin vertical lens inserts catch the existing ambient/reflection pass.
    const insert = mesh(box(.055, 1.5, .035), glass, side < 0 ? 4.65 : 10.35, 1.72, 100.04);
    insert.rotation.z = side < 0 ? -.17 : .17;
  }
  // Silver arc fragments, set around the outer shoulders rather than across the route.
  for (const [x, y, z, r] of [[4.75, 2.7, 99.8, .25], [10.25, 2.55, 100.2, -.25]]) {
    const accent = mesh(shardGeometry, glass, x, y, z);
    accent.scale.set(.16, .34, .07);
    accent.rotation.z = r;
  }

  scene.add(root);
  let disposed = false;
  return {
    update(delta, time, { found = new Set(), camera } = {}) {
      if (disposed) return;
      const routeSeen = found.has('routeOne') || found.has('route');
      const target = routeSeen ? 0.16 : 0.035;
      const blend = 1 - Math.exp(-Math.max(0, delta) * 1.7);
      silver.emissiveIntensity += (target - silver.emissiveIntensity) * blend;
      ice.emissiveIntensity = (routeSeen ? 0.07 : 0.025) + 0.012 * (0.5 + 0.5 * Math.sin(time * 0.72));
      for (const { object, phase, amount, baseRotation } of animated) {
        object.rotation.z = baseRotation + Math.sin(time * 0.45 + phase) * amount;
      }
      // Keep this argument in the interface for callers; landmarks never chase or obstruct the camera.
      void camera;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(root);
      root.traverse((object) => {
        if (object.isMesh) {
          // Resources are owned by this module and intentionally shared within it.
          object.geometry = null;
          object.material = null;
        }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      geometries.clear();
      materials.clear();
      animated.length = 0;
    },
  };
}
