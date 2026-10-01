import * as THREE from 'three';

/** Three readable landmarks along the northbound route. All geometry stays outside x=6.5..8.5. */
export function createIceLandmarks({ scene }) {
  const root = new THREE.Group();
  root.name = 'ice-route-landmarks';
  root.userData.iceReflective = true;
  const geometries = new Set();
  const materials = new Set();
  const boxGeometries = new Map();

  const silver = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xaebfc2, metalness: 0.97, roughness: 0.08,
    envMapIntensity: 1.3,
  }));
  const edge = ownMaterial(new THREE.MeshStandardMaterial({
    color: 0x60777d, metalness: 0.97, roughness: 0.22,
    envMapIntensity: 1.3,
  }));
  const glass = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xd7edf2, metalness: 0, roughness: 0.035,
    transmission: 0.94, ior: 1.46, thickness: 0.55,
    attenuationColor: 0xc3e6ee, attenuationDistance: 5,
    envMapIntensity: 1.5, flatShading: true, side: THREE.DoubleSide,
  }));
  const ice = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xc2e5ed, metalness: 0, roughness: 0.045,
    transmission: 0.92, ior: 1.31, thickness: 0.85,
    attenuationColor: 0xaedbe7, attenuationDistance: 6,
    envMapIntensity: 1.6, flatShading: true,
  }));
  for (const material of [silver, edge, glass, ice]) material.userData.iceReflective = true;

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
  // A broad, six-sided crystal body with a short hexagonal crown. Non-indexed
  // triangles keep the individual planes optically crisp under env reflections.
  const crystalPositions = [];
  const ring = (y, radius, index) => new THREE.Vector3(
    Math.cos(index * Math.PI / 3) * radius, y,
    Math.sin(index * Math.PI / 3) * radius,
  );
  function triangle(a, b, c) { crystalPositions.push(...a.toArray(), ...c.toArray(), ...b.toArray()); }
  const bottom = Array.from({ length: 6 }, (_, i) => ring(-0.5, 1, i));
  const shoulder = Array.from({ length: 6 }, (_, i) => ring(0.12, 1, i));
  const tip = new THREE.Vector3(0, 0.5, 0);
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    triangle(bottom[i], bottom[next], shoulder[next]);
    triangle(bottom[i], shoulder[next], shoulder[i]);
    triangle(shoulder[i], shoulder[next], tip);
    triangle(new THREE.Vector3(0, -0.5, 0), bottom[next], bottom[i]);
  }
  const crystalGeometry = ownGeometry(new THREE.BufferGeometry());
  crystalGeometry.setAttribute('position', new THREE.Float32BufferAttribute(crystalPositions, 3));
  crystalGeometry.computeVertexNormals();
  const fissureGeometry = ownGeometry(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.33, -.22, .12), new THREE.Vector3(-.12, .13, .18),
    new THREE.Vector3(-.12, .13, .18), new THREE.Vector3(.02, .49, .02),
    new THREE.Vector3(.28, -.15, -.04), new THREE.Vector3(.1, .24, -.1),
    new THREE.Vector3(.1, .24, -.1), new THREE.Vector3(.02, .49, .02),
  ]));
  const fissureMaterial = ownMaterial(new THREE.LineBasicMaterial({
    color: 0xe5f8ff, transparent: true, opacity: 0.23, depthWrite: false,
  }));
  function addFissures(parent) {
    parent.add(new THREE.LineSegments(fissureGeometry, fissureMaterial));
  }
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
    addFissures(c);
  }
  for (const [x, z, size, turn] of [
    [5.1, 61.8, .36, .18], [9.9, 63.5, .29, -.24],
    [5.25, 68.7, .3, -.18], [9.8, 72.8, .35, .22],
  ]) {
    const hanger = mesh(crystalGeometry, glass, x, 3.27, z);
    hanger.scale.set(size * .62, size * 1.55, size * .62);
    hanger.rotation.set(0, turn, Math.PI);
    addFissures(hanger);
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
      void found;
      void delta;
      void time;
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
    },
  };
}
