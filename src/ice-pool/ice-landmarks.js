import * as THREE from 'three';

/** Three readable landmarks along the northbound route. All geometry stays outside x=6.5..8.5. */
export function createIceLandmarks({ scene }) {
  const root = new THREE.Group();
  root.name = 'ice-route-landmarks';
  root.userData.iceReflective = true;
  const geometries = new Set();
  const materials = new Set();
  const boxGeometries = new Map();
  const floating = [];

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

  // 2. Lateral ice clusters. Three deterministic profiles avoid a repeated
  // pencil silhouette; each pair/trio is baked into one non-indexed mesh.
  const crystalVariants = [
    { sides: 6, radii: [1, .91, 1.04, .94, 1.02, .9], shoulder: -.05, tip: [.16, -.09] },
    { sides: 5, radii: [.93, 1.08, .9, 1.03, .96], shoulder: .2, tip: [-.12, .12] },
    { sides: 6, radii: [1.06, .9, .98, 1.08, .91, 1.02], shoulder: .32, tip: [.1, .16] },
  ];
  const crystalVariantFor = (index) => crystalVariants[index % crystalVariants.length];
  const createCrystalParts = (variant) => {
    const positions = [];
    const facetOrigins = [];
    const sides = variant.sides;
    const ring = (y, radiusScale, index) => {
      const angle = index * Math.PI * 2 / sides;
      const radius = radiusScale * variant.radii[index];
      return new THREE.Vector3(Math.cos(angle) * radius, y,
        Math.sin(angle) * radius);
    };
    const addTriangle = (a, b, c, outward) => {
      const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
      if (normal.dot(outward) < 0) [b, c] = [c, b];
      positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
      facetOrigins.push([0, 0, 0]);
    };
    const lower = Array.from({ length: sides }, (_, i) => ring(-.5, 1, i));
    const shoulder = Array.from({ length: sides }, (_, i) => ring(variant.shoulder, 1, i));
    const shoulderTop = Array.from({ length: sides }, (_, i) => ring(variant.shoulder + .08, .97, i));
    const apex = new THREE.Vector3(variant.tip[0], .5, variant.tip[1]);
    const center = new THREE.Vector3(0, -.5, 0);
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      const radial = new THREE.Vector3().addVectors(lower[i], lower[next]); radial.y = 0;
      addTriangle(lower[i], lower[next], shoulder[next], radial);
      addTriangle(lower[i], shoulder[next], shoulder[i], radial);
      addTriangle(shoulder[i], shoulder[next], shoulderTop[next], radial);
      addTriangle(shoulder[i], shoulderTop[next], shoulderTop[i], radial);
      const crownRadial = new THREE.Vector3().addVectors(shoulderTop[i], shoulderTop[next]);
      crownRadial.add(apex).multiplyScalar(1 / 3); crownRadial.y = 0;
      addTriangle(shoulderTop[i], shoulderTop[next], apex, crownRadial);
      addTriangle(center, lower[next], lower[i], new THREE.Vector3(0, -1, 0));
    }
    return { positions, facetOrigins };
  };
  function makeCrystalCluster(specs) {
    const positions = [];
    const facetOrigins = [];
    for (const { variantIndex, x, z, scale, height } of specs) {
      const shape = createCrystalParts(crystalVariantFor(variantIndex));
      const transform = new THREE.Matrix4().makeScale(scale[0], height, scale[1]);
      transform.setPosition(x, height / 2, z);
      const vertex = new THREE.Vector3();
      for (let i = 0; i < shape.positions.length; i += 3) {
        vertex.set(shape.positions[i], shape.positions[i + 1], shape.positions[i + 2]).applyMatrix4(transform);
        positions.push(vertex.x, vertex.y, vertex.z);
        if (i % 9 === 0) facetOrigins.push([x, height / 2, z]);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    geometry.userData.facetOrigins = facetOrigins;
    geometry.userData.crystal = true;
    return ownGeometry(geometry);
  }
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
  const crystalGroups = [
    { x: 3.52, z: 63.65, entries: [
      { variantIndex: 0, x: -.2, z: -.9, scale: [.66, .58], height: 2.7 },
      { variantIndex: 1, x: .24, z: .78, scale: [.4, .39], height: 1.55 },
    ] },
    { x: 3.55, z: 70.15, entries: [
      { variantIndex: 2, x: -.24, z: -1.0, scale: [.59, .52], height: 2.4 },
      { variantIndex: 0, x: .22, z: .92, scale: [.44, .39], height: 1.85 },
    ] },
    { x: 11.36, z: 63.6, entries: [
      { variantIndex: 1, x: -.2, z: -1.0, scale: [.6, .52], height: 2.5 },
      { variantIndex: 2, x: .23, z: .87, scale: [.43, .38], height: 1.75 },
    ] },
    { x: 11.42, z: 70.75, entries: [
      { variantIndex: 0, x: -.24, z: -1.05, scale: [.64, .53], height: 2.75 },
      { variantIndex: 1, x: .2, z: .98, scale: [.38, .4], height: 1.55 },
    ] },
  ];
  for (const cluster of crystalGroups) {
    const members = cluster.entries.map(entry => ({ ...entry, x: entry.x, z: entry.z }));
    mesh(makeCrystalCluster(members), ice, cluster.x, 0, cluster.z);
  }
  function makeFloatingCrystal(variantIndex) {
    const profile = crystalVariantFor(variantIndex);
    const positions = [];
    const facetOrigins = [];
    const sides = 5;
    const ring = (y, radius, index) => {
      const angle = index * Math.PI * 2 / sides;
      const irregular = profile.radii[index] ?? 1;
      return new THREE.Vector3(Math.cos(angle) * radius * irregular, y,
        Math.sin(angle) * radius * irregular);
    };
    const addTriangle = (a, b, c, outward) => {
      const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
      if (normal.dot(outward) < 0) [b, c] = [c, b];
      positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
      facetOrigins.push([0, 0, 0]);
    };
    const lower = Array.from({ length: sides }, (_, i) => ring(-.12, .42, i));
    const upper = Array.from({ length: sides }, (_, i) => ring(.12, .48, i));
    const top = new THREE.Vector3(profile.tip[0] * .35, .5, profile.tip[1] * .35);
    const bottom = new THREE.Vector3(-profile.tip[1] * .35, -.5, profile.tip[0] * .35);
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      const radial = new THREE.Vector3().addVectors(lower[i], upper[next]); radial.y = 0;
      addTriangle(lower[i], lower[next], upper[next], radial);
      addTriangle(lower[i], upper[next], upper[i], radial);
      const topOutward = new THREE.Vector3().addVectors(upper[i], upper[next]).add(top).multiplyScalar(1 / 3);
      topOutward.y = 0;
      addTriangle(upper[i], upper[next], top, topOutward);
      const bottomOutward = new THREE.Vector3().addVectors(lower[i], lower[next]).add(bottom).multiplyScalar(1 / 3);
      bottomOutward.y = 0;
      addTriangle(lower[next], lower[i], bottom, bottomOutward);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    geometry.userData.facetOrigins = facetOrigins;
    geometry.userData.crystal = true;
    return ownGeometry(geometry);
  }
  const floatingSpecs = [
    [4.85, 2.85, 62.6, .95, 0], [10.2, 3.02, 65.0, .82, 1],
    [4.95, 2.76, 68.3, 1.05, 2], [10.15, 3.08, 71.2, .9, 0],
  ];
  floatingSpecs.forEach(([x, y, z, size, variantIndex], index) => {
    const crystal = mesh(makeFloatingCrystal(variantIndex), ice, x, y, z);
    crystal.userData.floatingCrystal = true;
    crystal.scale.setScalar(size);
    crystal.rotation.set(.12 * (variantIndex - 1), .26 * variantIndex, .1 * (variantIndex % 2 ? -1 : 1));
    floating.push({ object: crystal, baseY: y, phase: index * 1.61, baseRotationY: crystal.rotation.y });
    addFissures(crystal);
  });
  // Narrow side-wall mirror slivers distinguish this chamber from the doorway.
  for (const [x, z, angle] of [[3.13, 63.6, -.15], [11.87, 67.0, .15], [3.12, 71.0, .12], [11.88, 62.0, -.12]]) {
    const pane = beam(x, 1.72, z, .045, 1.35, .56, glass);
    pane.rotation.y = angle;
    const rim = beam(x + (x < 7.5 ? .045 : -.045), 1.72, z, .06, 1.45, .64, edge);
    rim.rotation.y = angle;
  }

  // 3. Pair of damaged standing mirrors. The inset glass-metal faces have a
  // chipped crown and a beveled rim, with visible surface fractures.
  function mirrorSilhouette(inset = false) {
    const shape = new THREE.Shape();
    const points = inset
      ? [[-.55, .25], [-.52, 1.45], [-.54, 2.27], [-.34, 2.34], [-.2, 2.22], [-.06, 2.39], [.12, 2.2], [.29, 2.32], [.53, 2.25], [.55, .25]]
      : [[-.7, .16], [-.67, 1.48], [-.7, 2.43], [-.42, 2.52], [-.27, 2.4], [-.08, 2.58], [.09, 2.31], [.27, 2.5], [.4, 2.34], [.67, 2.42], [.7, .16]];
    shape.moveTo(...points[0]);
    for (const point of points.slice(1)) shape.lineTo(...point);
    shape.closePath();
    return shape;
  }
  function mirrorFrameGeometry() {
    const shape = mirrorSilhouette(false);
    const hole = new THREE.Path();
    const points = [[-.57, .29], [.57, .29], [.55, 2.28], [.32, 2.2], [.13, 2.08], [-.04, 2.23], [-.22, 2.06], [-.37, 2.2], [-.55, 2.14]];
    hole.moveTo(...points[0]);
    for (const point of points.slice(1)) hole.lineTo(...point);
    hole.closePath();
    shape.holes.push(hole);
    return ownGeometry(new THREE.ExtrudeGeometry(shape, {
      depth: .08, bevelEnabled: true, bevelSegments: 1, steps: 1,
      bevelSize: .035, bevelThickness: .035,
    }));
  }
  function mirrorFaceGeometry() {
    return ownGeometry(new THREE.ExtrudeGeometry(mirrorSilhouette(true), {
      depth: .09, bevelEnabled: true, bevelSegments: 1, steps: 1,
      bevelSize: .025, bevelThickness: .025,
    }));
  }
  function mergeBoxParts(parts) {
    const positions = [];
    for (const [w, h, d, x, y, z] of parts) {
      const part = new THREE.BoxGeometry(w, h, d).toNonIndexed();
      const matrix = new THREE.Matrix4().makeTranslation(x, y, z);
      const attribute = part.getAttribute('position');
      const vertex = new THREE.Vector3();
      for (let i = 0; i < attribute.count; i++) {
        vertex.fromBufferAttribute(attribute, i).applyMatrix4(matrix);
        positions.push(vertex.x, vertex.y, vertex.z);
      }
      part.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return ownGeometry(geometry);
  }
  for (const [side, x] of [['left', 4.5], ['right', 10.5]]) {
    const mirror = new THREE.Group();
    mirror.name = `ice-core-standing-mirror-${side}`;
    mirror.userData.kind = 'brokenStandingMirror';
    mirror.position.set(x, 0, 100);
    mirror.rotation.y = Math.PI;
    root.add(mirror);
    silver.side = THREE.DoubleSide;
    mesh(mirrorFrameGeometry(), silver, 0, .1, 0, mirror);
    mesh(mirrorFaceGeometry(), silver, 0, .1, .11, mirror);
    const footing = mesh(mergeBoxParts([
      [.98, .14, .5, 0, .07, 0], [.2, .25, .18, 0, .24, 0],
    ]), silver, 0, 0, 0, mirror);
    footing.name = 'mirror-footing';
    const crackGeometry = ownGeometry(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-.25, .62, .23), new THREE.Vector3(-.04, .91, .23),
      new THREE.Vector3(-.04, .91, .23), new THREE.Vector3(-.18, 1.21, .23),
      new THREE.Vector3(.27, 1.42, .23), new THREE.Vector3(.08, 1.7, .23),
      new THREE.Vector3(.08, 1.7, .23), new THREE.Vector3(.19, 2.02, .23),
    ]));
    mirror.add(new THREE.LineSegments(crackGeometry, ownMaterial(new THREE.LineBasicMaterial({
      color: 0x334a52, transparent: true, opacity: .38,
    }))));
  }

  scene.add(root);
  let disposed = false;
  return {
    update(delta, time, { found = new Set(), camera } = {}) {
      if (disposed) return;
      void found;
      void delta;
      for (const { object, baseY, phase, baseRotationY } of floating) {
        object.position.y = baseY + Math.sin(time * .62 + phase) * .1;
        object.rotation.y = baseRotationY + time * .08;
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
      floating.length = 0;
    },
  };
}
