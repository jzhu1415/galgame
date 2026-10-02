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
  const crystalLights = [];
  const qualityRebuilders = [];
  let quality = 'balanced';
  const floatingDummy = new THREE.Object3D();

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
    emissive: 0x356b83, emissiveIntensity: .11,
  }));
  for (const material of [silver, edge, glass, ice]) material.userData.iceReflective = true;

  function ownMaterial(material) { materials.add(material); return material; }
  function ownGeometry(geometry) { geometries.add(geometry); return geometry; }
  function replaceQualityGeometry(object, buildGeometry) {
    const previous = object.geometry;
    if (previous && geometries.delete(previous)) previous.dispose();
    object.geometry = buildGeometry();
  }
  function registerQualityRebuilder(rebuild) { qualityRebuilders.push(rebuild); }
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
  const createCrystalParts = (variant, reduced = false) => {
    const positions = [];
    const facetOrigins = [];
    const sides = reduced ? 4 : variant.sides;
    const ring = (y, radiusScale, index) => {
      const angle = index * Math.PI * 2 / sides;
      const radius = radiusScale * (variant.radii[index % variant.radii.length] ?? 1);
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
  function makeCrystalCluster(specs, reduced = quality === 'performance') {
    const positions = [];
    const facetOrigins = [];
    const growthDirections = [];
    const growthRoots = [];
    const growthHeights = [];
    for (const { variantIndex, x, z, scale, height, rootY = 0, rotation = [0, 0, 0], rotationQuaternion, embed = .035 } of specs) {
      const shape = createCrystalParts(crystalVariantFor(variantIndex), reduced);
      const orientation = rotationQuaternion
        ? new THREE.Quaternion(...rotationQuaternion)
        : new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));
      growthDirections.push(new THREE.Vector3(0, 1, 0).applyQuaternion(orientation).normalize().toArray());
      const transform = new THREE.Matrix4().compose(
        new THREE.Vector3(), orientation, new THREE.Vector3(scale[0], height, scale[1]),
      );
      const vertex = new THREE.Vector3();
      let minY = Infinity;
      for (let i = 0; i < shape.positions.length; i += 3) {
        vertex.set(shape.positions[i], shape.positions[i + 1], shape.positions[i + 2]).applyMatrix4(transform);
        minY = Math.min(minY, vertex.y);
      }
      const origin = new THREE.Vector3(x, rootY - minY - embed, z);
      transform.setPosition(origin);
      growthRoots.push(origin.toArray());
      growthHeights.push(height);
      for (let i = 0; i < shape.positions.length; i += 3) {
        vertex.set(shape.positions[i], shape.positions[i + 1], shape.positions[i + 2]).applyMatrix4(transform);
        positions.push(vertex.x, vertex.y, vertex.z);
        if (i % 9 === 0) facetOrigins.push(origin.toArray());
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    geometry.userData.facetOrigins = facetOrigins;
    geometry.userData.crystal = true;
    geometry.userData.growthDirections = growthDirections;
    geometry.userData.growthRoots = growthRoots;
    geometry.userData.growthHeights = growthHeights;
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
      { variantIndex: 0, x: -.2, z: -.9, scale: [.66, .58], height: 2.7, rotation: [0, .12, -.08] },
      { variantIndex: 1, x: .24, z: .78, scale: [.4, .39], height: 1.55, rotation: [.1, -.3, .32] },
    ] },
    { x: 3.55, z: 70.15, entries: [
      { variantIndex: 2, x: -.24, z: -1.0, scale: [.59, .52], height: 2.4, rotation: [-.08, .28, -.27] },
      { variantIndex: 0, x: .22, z: .92, scale: [.44, .39], height: 1.85, rotation: [.14, -.2, .24] },
    ] },
    { x: 11.36, z: 63.6, entries: [
      { variantIndex: 1, x: -.2, z: -1.0, scale: [.6, .52], height: 2.5, rotation: [.12, -.16, -.22] },
      { variantIndex: 2, x: .23, z: .87, scale: [.43, .38], height: 1.75, rotation: [-.1, .3, .29] },
    ] },
    { x: 11.42, z: 70.75, entries: [
      { variantIndex: 0, x: -.24, z: -1.05, scale: [.64, .53], height: 2.75, rotation: [-.15, .2, .12] },
      { variantIndex: 1, x: .2, z: .98, scale: [.38, .4], height: 1.55, rotation: [.08, -.2, -.34] },
    ] },
  ];
  for (const cluster of crystalGroups) {
    const members = cluster.entries.map(entry => ({ ...entry, x: entry.x, z: entry.z }));
    const object = mesh(makeCrystalCluster(members), ice, cluster.x, 0, cluster.z);
    object.userData.growthSurface = 'floor';
    object.userData.crystalRoom = 'crystal';
    object.userData.crystalCount = members.length;
    registerQualityRebuilder((reduced) => replaceQualityGeometry(object,
      () => makeCrystalCluster(members, reduced)));
  }
  function makeFloatingCrystal(variantIndex, reduced = quality === 'performance') {
    const profile = crystalVariantFor(variantIndex);
    const positions = [];
    const facetOrigins = [];
    const sides = reduced ? 4 : 5;
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
    geometry.userData.growthDirections = [top.clone().normalize().toArray(), bottom.clone().normalize().toArray()];
    return ownGeometry(geometry);
  }
  const floatingSpecs = [
    [4.85, 2.85, 62.6, .95, 0], [10.2, 3.02, 65.0, .82, 1],
    [4.95, 2.76, 68.3, 1.05, 2], [10.15, 3.08, 71.2, .9, 0],
  ];
  floatingSpecs.forEach(([x, y, z, size, variantIndex], index) => {
    const crystal = mesh(makeFloatingCrystal(variantIndex, false), ice, x, y, z);
    crystal.userData.floatingCrystal = true;
    crystal.userData.growthSurface = 'air';
    crystal.userData.crystalRoom = 'crystal';
    crystal.userData.crystalCount = 1;
    crystal.scale.setScalar(size);
    crystal.rotation.set(.12 * (variantIndex - 1), .26 * variantIndex, .1 * (variantIndex % 2 ? -1 : 1));
    floating.push({ object: crystal, baseY: y, phase: index * 1.61, baseRotationY: crystal.rotation.y });
    registerQualityRebuilder((reduced) => replaceQualityGeometry(crystal,
      () => makeFloatingCrystal(variantIndex, reduced)));
    addFissures(crystal);
  });
  // Low, broad mineral growth frames the former mirror core, with one strong
  // diagonal crystal on each side instead of a freestanding mirror silhouette.
  const coreClusters = [
    { x: 5.0, z: 99.7, entries: [
      { variantIndex: 2, x: -.2, z: -.48, scale: [.62, .55], height: 2.35, rotation: [0, .2, -.34] },
      { variantIndex: 1, x: .28, z: .42, scale: [.48, .44], height: 1.55, rotation: [.08, -.28, .18] },
      { variantIndex: 0, x: -.55, z: .52, scale: [.34, .33], height: 1.12, rotation: [-.1, .2, -.12] },
    ] },
    { x: 10.0, z: 100.2, entries: [
      { variantIndex: 0, x: .2, z: -.5, scale: [.62, .55], height: 2.35, rotation: [0, -.2, .34] },
      { variantIndex: 2, x: -.28, z: .42, scale: [.48, .44], height: 1.55, rotation: [-.08, .28, -.18] },
      { variantIndex: 1, x: .55, z: .52, scale: [.34, .33], height: 1.12, rotation: [.1, -.2, .12] },
    ] },
  ];
  for (const cluster of coreClusters) {
      const object = mesh(makeCrystalCluster(cluster.entries), ice, cluster.x, 0, cluster.z);
    object.name = cluster.x < 7.5 ? 'ice-core-crystal-left' : 'ice-core-crystal-right';
    object.userData.kind = 'coreCrystalCluster';
    object.userData.growthSurface = 'floor';
    object.userData.crystalRoom = 'core';
    object.userData.crystalCount = cluster.entries.length;
    registerQualityRebuilder((reduced) => replaceQualityGeometry(object,
      () => makeCrystalCluster(cluster.entries, reduced)));
  }

  // Early rooms use smaller growths at the dry arrival perimeter and richer
  // mineral fans in the first dry mirror chamber. Coordinates follow the map's
  // 15m room lattice and keep every branch outside the central walking lane.
  const earlyClusters = [
    { room: 'arrival', surface: 'floor', name: 'arrival-floor-west', x: 1.95, z: 5.35, entries: [
      { variantIndex: 1, x: -.12, z: 0, scale: [.27, .26], height: .92, rotation: [.06, .24, -.1] },
      { variantIndex: 0, x: .2, z: .34, scale: [.2, .21], height: .62, rotation: [-.08, -.2, .19] },
    ] },
    { room: 'arrival', surface: 'floor', name: 'arrival-floor-east', x: 13.05, z: 11.45, entries: [
      { variantIndex: 2, x: .1, z: -.18, scale: [.29, .25], height: 1.02, rotation: [-.07, .12, .08] },
      { variantIndex: 1, x: -.22, z: .34, scale: [.18, .2], height: .58, rotation: [.1, -.24, -.16] },
    ] },
    { room: 'mirror', surface: 'floor', name: 'mirror-floor-west', x: 3.55, z: 34.6, entries: [
      { variantIndex: 2, x: -.2, z: -.38, scale: [.4, .36], height: 1.55, rotation: [.08, .24, -.24] },
      { variantIndex: 0, x: .26, z: .38, scale: [.31, .29], height: 1.05, rotation: [-.1, -.3, .28] },
      { variantIndex: 1, x: -.5, z: .48, scale: [.22, .24], height: .82, rotation: [.1, .12, -.12] },
    ] },
    { room: 'mirror', surface: 'floor', name: 'mirror-floor-east', x: 11.45, z: 41.0, entries: [
      { variantIndex: 0, x: .18, z: -.4, scale: [.42, .37], height: 1.72, rotation: [-.1, -.2, .2] },
      { variantIndex: 2, x: -.25, z: .35, scale: [.32, .3], height: 1.18, rotation: [.12, .3, -.26] },
      { variantIndex: 1, x: .5, z: .5, scale: [.23, .22], height: .78, rotation: [-.1, -.14, .16] },
    ] },
  ];
  for (const cluster of earlyClusters) {
    const object = mesh(makeCrystalCluster(cluster.entries), ice, cluster.x, 0, cluster.z);
    object.name = cluster.name;
    object.userData.earlyRoom = cluster.room;
    object.userData.growthSurface = cluster.surface;
    object.userData.crystalRoom = cluster.room;
    object.userData.crystalCount = cluster.entries.length;
    registerQualityRebuilder((reduced) => replaceQualityGeometry(object,
      () => makeCrystalCluster(cluster.entries, reduced)));
  }

  // Four wall stations on both faces of each early/core room are merged into
  // one mesh per side. Each station combines a heavy spear and two smaller
  // branches at different heights and angles for a broken, mineral growth line.
  function addRoomWallCrystals({ room, wallRoom, startZ, endZ }) {
    const centerZ = (startZ + endZ) * .5;
    const stations = [startZ + 2.4, startZ + 4.7, endZ - 4.7, endZ - 2.4];
    const branchHeights = [
      [2.55, 1.35, .52], [2.05, .76, .48],
      [2.42, 1.12, .58], [1.82, .68, 2.12],
    ];
    const branchRoots = [
      [.36, .92, 1.65], [.48, 1.28, .62],
      [.42, 1.0, 1.72], [.58, 1.42, .72],
    ];
    const leanMagnitudes = [.26, .48, .68, .34];
    for (const side of ['west', 'east']) {
      const west = side === 'west';
      const anchorX = west ? 1.02 : 13.98;
      const sign = west ? -1 : 1;
      const specs = [];
      stations.forEach((stationZ, stationIndex) => {
        for (let branch = 0; branch < 3; branch++) {
          const height = branchHeights[stationIndex][branch];
          const rootY = branchRoots[stationIndex][branch];
          const lean = sign * leanMagnitudes[(stationIndex + branch) % leanMagnitudes.length]
            * (branch === 1 ? .72 : 1);
          const sideOffset = branch === 0 ? 0 : sign * (branch === 1 ? .13 : -.09);
          specs.push({
            variantIndex: (stationIndex * 2 + branch + (west ? 1 : 0)) % crystalVariants.length,
            x: sideOffset,
            z: stationZ - centerZ + (branch - 1) * .16,
            scale: branch === 0 ? [.43, .39] : branch === 1 ? [.29, .27] : [.18, .2],
            height,
            rootY,
            rotation: [((stationIndex + branch) % 2 ? -.24 : .19) + (branch - 1) * .055,
              (stationIndex - 1.5) * .17 + (branch - 1) * .1, lean],
          });
        }
      });
      const object = mesh(makeCrystalCluster(specs), ice, anchorX, 0, centerZ);
      object.name = `ice-wall-crystals-${wallRoom}-${side}`;
      object.userData.growthSurface = 'wall';
      object.userData.wallRoom = wallRoom;
      object.userData.crystalRoom = wallRoom;
      object.userData.crystalCount = specs.length;
      if (room === 'arrival' || room === 'mirror') object.userData.earlyRoom = room;
      const lightBranch = 3; // First growth at the second, dry wall station.
      const growthDirection = new THREE.Vector3().fromArray(object.geometry.userData.growthDirections[lightBranch]);
      object.userData.crystalLightPoint = new THREE.Vector3()
        .fromArray(object.geometry.userData.growthRoots[lightBranch])
        .addScaledVector(growthDirection, object.geometry.userData.growthHeights[lightBranch] * .36)
        .toArray();
      registerQualityRebuilder((reduced) => {
        const retainedIndexes = reduced ? [0, 2, 3, 5, 6, 9] : specs.map((_, index) => index);
        const selected = retainedIndexes.map(index => specs[index]);
        replaceQualityGeometry(object, () => makeCrystalCluster(selected, reduced));
        object.userData.crystalCount = selected.length;
        const retainedLightBranch = retainedIndexes.indexOf(lightBranch);
        const growth = object.geometry.userData.growthDirections[retainedLightBranch];
        object.userData.crystalLightPoint = new THREE.Vector3()
          .fromArray(object.geometry.userData.growthRoots[retainedLightBranch])
          .addScaledVector(new THREE.Vector3().fromArray(growth),
            object.geometry.userData.growthHeights[retainedLightBranch] * .36)
          .toArray();
      });
    }
  }
  addRoomWallCrystals({ room: 'arrival', wallRoom: 'arrival', startZ: 0, endZ: 15 });
  addRoomWallCrystals({ room: 'mirror', wallRoom: 'mirror', startZ: 30, endZ: 45 });
  addRoomWallCrystals({ room: 'crystal', wallRoom: 'crystal', startZ: 60, endZ: 75 });
  addRoomWallCrystals({ room: 'core', wallRoom: 'core', startZ: 90, endZ: 105 });

  function deterministicUnit(seed, index, salt) {
    const value = Math.sin((seed + 1) * 127.1 + (index + 1) * 311.7 + salt * 74.7) * 43758.5453123;
    return value - Math.floor(value);
  }
  function sampleCrystalSpecs(specs, count) {
    if (count >= specs.length) return specs;
    const selected = [];
    const seen = new Set();
    for (let i = 0; i < count; i++) {
      const index = Math.min(specs.length - 1, Math.floor((i + .5) * specs.length / count));
      if (!seen.has(index)) { selected.push(specs[index]); seen.add(index); }
    }
    return selected;
  }
  function addDenseGroundRoom({ room, countPerSide, startZ, endZ, maxHeight }) {
    for (const side of ['west', 'east']) {
      const west = side === 'west';
      const sign = west ? -1 : 1;
      const specs = [];
      for (let i = 0; i < countPerSide; i++) {
        const u = deterministicUnit(room.length * 17 + (west ? 3 : 7), i, 1);
        const v = deterministicUnit(room.length * 29 + (west ? 5 : 11), i, 2);
        const tower = i % 11 === 0 || (room === 'core' && i % 17 === 4);
        let worldX;
        if (room === 'arrival') {
          // The legacy entry has a pool ring from x=3 through x=11. Keep
          // ground roots on its dry outer ledges, away from the paper at z=9.35.
          worldX = west ? 1.72 + u * .62 : 13.28 - u * .62;
        } else if (tower) {
          worldX = west ? 4.5 + (u - .5) * .34 : 10.5 + (u - .5) * .34;
        } else if (west) {
          worldX = 2.05 + u * 3.38;
        } else {
          worldX = 12.95 - u * 3.38;
        }
        const z = startZ + 1.35 + v * ((endZ - startZ) - 2.7);
        const height = tower
          ? maxHeight * (.94 + .06 * deterministicUnit(97, i, 3))
          : Math.min(maxHeight * .76, .42 + deterministicUnit(131, i, 4) * maxHeight * .62);
        const radius = .12 + height * .13;
        // Taller inner-band spires lean outward so their tips stay beside the
        // route; smaller tips vary toward the room and along its length.
        const nearRoute = west ? worldX > 4.75 : worldX < 10.25;
        const outward = nearRoute || tower || room === 'arrival' || height > 1.5;
        const tilt = outward
          ? (west ? 1 : -1) * (.2 + deterministicUnit(181, i, 5) * .28)
          : (deterministicUnit(211, i, 6) - .5) * .68;
        const yaw = deterministicUnit(281, i, 8) * Math.PI * 2;
        const forwardTilt = (deterministicUnit(331, i, 9) - .5) * (outward ? .72 : .98);
        const orientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(forwardTilt, 0, 0))
          .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, tilt)))
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
        specs.push({
          variantIndex: Math.floor(deterministicUnit(251, i, 7) * crystalVariants.length),
          x: worldX,
          z,
          scale: [radius * (.76 + u * .45), radius * (.74 + v * .46)],
          height,
          rotationQuaternion: orientation.toArray(),
        });
      }
      const object = mesh(makeCrystalCluster(specs), ice, 0, 0, 0);
      object.name = `ice-dense-ground-${room}-${side}`;
      object.userData.crystalRoom = room;
      object.userData.crystalCount = specs.length;
      object.userData.growthSurface = 'floor';
      if (room === 'arrival' || room === 'mirror') object.userData.earlyRoom = room;
      registerQualityRebuilder((reduced) => {
        const selected = reduced ? sampleCrystalSpecs(specs, Math.max(1, Math.ceil(specs.length * .35))) : specs;
        replaceQualityGeometry(object, () => makeCrystalCluster(selected, reduced));
        object.userData.crystalCount = selected.length;
      });
    }
  }
  addDenseGroundRoom({ room: 'arrival', countPerSide: 16, startZ: 0, endZ: 15, maxHeight: 1.35 });
  addDenseGroundRoom({ room: 'mirror', countPerSide: 32, startZ: 30, endZ: 45, maxHeight: 2.75 });
  addDenseGroundRoom({ room: 'crystal', countPerSide: 44, startZ: 60, endZ: 75, maxHeight: 3.18 });
  addDenseGroundRoom({ room: 'core', countPerSide: 75, startZ: 90, endZ: 105, maxHeight: 3.72 });

  function addRoomFloatBatches({ room, startZ, endZ, perSide, minY, maxY, maxScale }) {
    for (const side of ['west', 'east']) {
      const west = side === 'west';
      const instances = [];
      const variantIndex = west ? 0 : 2;
      const geometry = makeFloatingCrystal(variantIndex, false);
      const object = new THREE.InstancedMesh(geometry, ice, perSide);
      object.name = `ice-floating-${room}-${side}`;
      object.userData.floatingCrystal = true;
      object.userData.growthSurface = 'air';
      object.userData.crystalRoom = room;
      object.userData.crystalCount = perSide;
      if (room === 'arrival' || room === 'mirror') object.userData.earlyRoom = room;
      for (let i = 0; i < perSide; i++) {
        const xUnit = deterministicUnit(room.length * 31 + (west ? 17 : 23), i, 9);
        const zUnit = deterministicUnit(room.length * 43 + (west ? 29 : 37), i, 10);
        const yUnit = deterministicUnit(room.length * 59 + (west ? 41 : 47), i, 11);
        const size = .36 + deterministicUnit(307, i + room.length, west ? 12 : 13) * (maxScale - .36);
        const sideMargin = size * 1.4 + .12;
        const maxWestX = 6.5 - sideMargin;
        const minEastX = 8.5 + sideMargin;
        const x = west
          ? 3.45 + xUnit * Math.max(0, maxWestX - 3.45)
          : 11.55 - xUnit * Math.max(0, 11.55 - minEastX);
        const z = startZ + 1.2 + zUnit * ((endZ - startZ) - 2.4);
        const baseY = minY + yUnit * (maxY - minY);
        instances.push({
          x, z, baseY, phase: i * 1.731 + (west ? 0 : 1.13), size,
          scale: [size * (.72 + xUnit * .58), size * (.78 + yUnit * .72), size * (.7 + zUnit * .62)],
          rotation: [(.2 + yUnit * .9) * (west ? 1 : -1), xUnit * Math.PI * 2, (.16 + zUnit * .8) * (west ? -1 : 1)],
        });
      }
      root.add(object);
      const entry = { object, instances, allInstances: instances, perSide, variantIndex };
      floating.push(entry);
      updateInstancedFloatBatch(object, instances, 0);
      registerQualityRebuilder((reduced) => {
        const count = reduced ? Math.max(1, Math.ceil(perSide * .35)) : perSide;
        entry.instances = entry.allInstances.slice(0, count);
        object.count = count;
        object.userData.crystalCount = count;
        replaceQualityGeometry(object, () => makeFloatingCrystal(variantIndex, reduced));
        updateInstancedFloatBatch(object, entry.instances, 0);
      });
    }
  }
  function updateInstancedFloatBatch(object, instances, time) {
    for (let index = 0; index < instances.length; index++) {
      const instance = instances[index];
      floatingDummy.position.set(instance.x,
        instance.baseY + Math.sin(time * .62 + instance.phase) * .1, instance.z);
      floatingDummy.rotation.set(instance.rotation[0], instance.rotation[1] + time * .08, instance.rotation[2]);
      floatingDummy.scale.set(...instance.scale);
      floatingDummy.updateMatrix();
      object.setMatrixAt(index, floatingDummy.matrix);
    }
    object.instanceMatrix.needsUpdate = true;
    object.computeBoundingBox();
    object.computeBoundingSphere();
  }
  addRoomFloatBatches({ room: 'arrival', startZ: 0, endZ: 15, perSide: 4, minY: 2.65, maxY: 3.65, maxScale: .72 });
  addRoomFloatBatches({ room: 'mirror', startZ: 30, endZ: 45, perSide: 4, minY: 2.6, maxY: 3.3, maxScale: .88 });
  addRoomFloatBatches({ room: 'crystal', startZ: 60, endZ: 75, perSide: 18, minY: 2.45, maxY: 3.15, maxScale: 1.0 });
  addRoomFloatBatches({ room: 'core', startZ: 90, endZ: 105, perSide: 30, minY: 3.0, maxY: 5.6, maxScale: 1.15 });

  // A pair of embedded lights per room throws a soft blue wash onto actual
  // surfaces. Only the nearest pair participates in rendering on mobile.
  for (const centerZ of [7.5, 37.5, 67.5, 97.5]) {
    for (const side of ['west', 'east']) {
      const cluster = root.children.find(object => object.userData.wallRoom
        && object.position.z === centerZ && object.name.endsWith(`-${side}`));
      const light = new THREE.PointLight(0xb6eaff, 5, 10, 1.6);
      light.name = `ice-crystal-light-${centerZ}-${side}`;
      light.position.fromArray(cluster.userData.crystalLightPoint).add(cluster.position);
      light.userData.roomZ = centerZ;
      light.visible = centerZ === 7.5;
      root.add(light);
      crystalLights.push(light);
    }
  }

  // A small pair grows off the walls of the long connecting passage without
  // crossing into the central path or the evidence pickup at z=22.5.
  for (const [side, x, lean] of [['west', 6.05, -.3], ['east', 8.95, .3]]) {
    const object = mesh(makeCrystalCluster([{
      variantIndex: side === 'west' ? 1 : 0, x: 0, z: 0,
      scale: [.12, .15], height: .65, rootY: .38,
      rotation: [0, .12, lean], embed: .02,
    }, {
      variantIndex: side === 'west' ? 2 : 1, x: 0, z: 7.0,
      scale: [.16, .17], height: .78, rootY: .52,
      rotation: [.08, -.18, lean * .8], embed: .02,
    }]), ice, x, 0, 18.6);
    object.name = `ice-connector-wall-${side}`;
    object.userData.earlyRoom = 'arrival';
    object.userData.growthSurface = 'wall';
    object.userData.crystalRoom = 'connector';
    object.userData.crystalCount = 2;
  }

  scene.add(root);
  let disposed = false;
  return {
    setQuality(preset) {
      if (disposed) return;
      const nextQuality = preset === 'performance' ? 'performance' : 'balanced';
      if (nextQuality === quality) return;
      quality = nextQuality;
      for (const rebuild of qualityRebuilders) rebuild(quality === 'performance');
    },
    update(delta, time, { found = new Set(), camera } = {}) {
      if (disposed) return;
      void found;
      void delta;
      for (const entry of floating) {
        if (entry.instances) {
          updateInstancedFloatBatch(entry.object, entry.instances, time);
          continue;
        }
        const { object, baseY, phase, baseRotationY } = entry;
        object.position.y = baseY + Math.sin(time * .62 + phase) * .1;
        object.rotation.y = baseRotationY + time * .08;
      }
      if (camera) {
        const nearest = crystalLights.reduce((closest, light) =>
          Math.abs(light.userData.roomZ - camera.position.z) < Math.abs(closest.userData.roomZ - camera.position.z) ? light : closest);
        for (const light of crystalLights) light.visible = light.userData.roomZ === nearest.userData.roomZ;
      }
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
      qualityRebuilders.length = 0;
      crystalLights.forEach(light => light.dispose());
      crystalLights.length = 0;
    },
  };
}
