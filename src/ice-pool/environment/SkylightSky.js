import * as THREE from 'three';

// The sky is deliberately a single, camera-relative draw. Keeping it in a
// separate module also means the streamed room geometry never owns a second
// copy of the sky or its shader resources.
const SKY_RADIUS = 96;
const SKY_SEGMENTS = 32;
const SKY_RINGS = 16;
const SKY_FRAME_WIDTH = 0.12;
const SKY_FRAME_DEPTH = 0.10;
const SKY_GLASS_OFFSET = 0.008;

const SKY_VERTEX_SHADER = /* glsl */`
  varying vec3 vSkyDirection;

  void main() {
    vSkyDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT_SHADER = /* glsl */`
  uniform float uTime;
  uniform vec3 uSunDirection;
  varying vec3 vSkyDirection;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  float valueNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    float a = hash21(cell);
    float b = hash21(cell + vec2(1.0, 0.0));
    float c = hash21(cell + vec2(0.0, 1.0));
    float d = hash21(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
  }

  void main() {
    vec3 direction = normalize(vSkyDirection);
    // The dome only supplies the view above the horizon. Below it, the
    // ordinary room/water geometry and the scene background remain authoritative.
    if (direction.y < -0.025) discard;

    float elevation = clamp(direction.y, 0.0, 1.0);
    float horizon = smoothstep(0.0, 0.74, elevation);
    vec3 horizonColor = vec3(0.62, 0.80, 0.88);
    vec3 zenithColor = vec3(0.105, 0.245, 0.49);
    vec3 color = mix(horizonColor, zenithColor, pow(horizon, 0.78));

    // Broad cumulus forms plus a finer wisp layer keep the sky recognizable
    // through a small ceiling opening without turning it into a flat texture.
    vec2 cloudPoint = direction.xz / max(direction.y + 0.20, 0.20);
    cloudPoint = cloudPoint * 0.68 + vec2(uTime * 0.0035, -uTime * 0.0018);
    float cloudBodyNoise = valueNoise(cloudPoint * 0.55) * 0.52
      + valueNoise(cloudPoint * 1.25 + vec2(7.0, -3.0)) * 0.31
      + valueNoise(cloudPoint * 2.80 + vec2(-4.0, 9.0)) * 0.17;
    float cloudBand = smoothstep(0.05, 0.23, elevation)
      * (1.0 - smoothstep(0.68, 0.98, elevation));
    float cloudBody = smoothstep(0.50, 0.65, cloudBodyNoise) * cloudBand;
    float cloudWispNoise = valueNoise(cloudPoint * 4.2 + vec2(13.0, 2.0));
    float cloudWisp = smoothstep(0.62, 0.78, cloudWispNoise)
      * smoothstep(0.10, 0.34, elevation)
      * (1.0 - smoothstep(0.82, 1.0, elevation));
    float cloudMask = clamp(cloudBody * 0.70 + cloudWisp * 0.20, 0.0, 0.74);
    vec3 cloudShade = vec3(0.66, 0.76, 0.82);
    vec3 cloudLight = vec3(0.96, 0.96, 0.91);
    vec3 cloudColor = mix(cloudShade, cloudLight,
      smoothstep(0.49, 0.67, cloudBodyNoise));
    color = mix(color, cloudColor, cloudMask);

    float sun = pow(max(dot(direction, normalize(uSunDirection)), 0.0), 56.0);
    color += vec3(1.0, 0.79, 0.52) * sun * 0.15;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function finiteCell(cell) {
  const x = Number(cell?.x);
  const z = Number(cell?.z);
  const y = Number(cell?.y);
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)
    ? { x: Math.floor(x), z: Math.floor(z), y } : null;
}

function openingRegions(openings) {
  const byHeight = new Map();
  for (const opening of Array.isArray(openings) ? openings : []) {
    const cell = finiteCell(opening);
    if (!cell) continue;
    const heightKey = Math.round(cell.y * 1000);
    let rows = byHeight.get(heightKey);
    if (!rows) {
      rows = new Map();
      byHeight.set(heightKey, rows);
    }
    let columns = rows.get(cell.z);
    if (!columns) {
      columns = new Set();
      rows.set(cell.z, columns);
    }
    columns.add(cell.x);
  }

  const regions = [];
  for (const [heightKey, rows] of byHeight) {
    const height = heightKey / 1000;
    const mergedByRun = new Map();
    for (const z of [...rows.keys()].sort((a, b) => a - b)) {
      const columns = [...rows.get(z)].sort((a, b) => a - b);
      let start = null;
      let previous = null;
      const runs = [];
      for (const x of columns) {
        if (start === null) start = x;
        else if (x !== previous + 1) {
          runs.push([start, previous]);
          start = x;
        }
        previous = x;
      }
      if (start !== null) runs.push([start, previous]);

      for (const [minX, maxX] of runs) {
        const key = `${minX}:${maxX}`;
        const previousRegion = mergedByRun.get(key);
        if (previousRegion && previousRegion.maxZ === z - 1) {
          previousRegion.maxZ = z;
        } else {
          const region = { minX, maxX, minZ: z, maxZ: z, y: height };
          regions.push(region);
          mergedByRun.set(key, region);
        }
      }
    }
  }
  return regions;
}

function pushQuad(data, a, b, c, d, normal) {
  const base = data.positions.length / 3;
  data.positions.push(...a, ...b, ...c, ...d);
  for (let i = 0; i < 4; i += 1) data.normals.push(...normal);
  data.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function pushBox(data, centerX, centerY, centerZ, sizeX, sizeY, sizeZ) {
  const x0 = centerX - sizeX * 0.5;
  const x1 = centerX + sizeX * 0.5;
  const y0 = centerY - sizeY * 0.5;
  const y1 = centerY + sizeY * 0.5;
  const z0 = centerZ - sizeZ * 0.5;
  const z1 = centerZ + sizeZ * 0.5;
  const faces = [
    { normal: [0, 1, 0], corners: [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]] },
    { normal: [0, -1, 0], corners: [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]] },
    { normal: [1, 0, 0], corners: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]] },
    { normal: [-1, 0, 0], corners: [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]] },
    { normal: [0, 0, 1], corners: [[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]] },
    { normal: [0, 0, -1], corners: [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]] },
  ];
  for (const face of faces) pushQuad(data, ...face.corners, face.normal);
}

function makeGeometry(data) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
  geometry.setIndex(data.indices);
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Add a chunk-owned glass/metal assembly for each contiguous ceiling opening.
 * `openings` contains integer cell corners ({x, z}) and the ceiling height.
 * The returned geometry and materials are registered on the group so streamed
 * chunk eviction can release every resource without touching shared materials.
 */
export function addSkylightOpenings(group, openings = []) {
  if (!group) return { regions: [], meshes: [] };
  group.userData ??= {};
  if (!Array.isArray(group.userData.geometries)) group.userData.geometries = [];
  if (!Array.isArray(group.userData.materials)) group.userData.materials = [];

  const regions = openingRegions(openings);
  if (!regions.length) {
    group.userData.skyOpeningRegions = [];
    return { regions, meshes: [] };
  }

  const glass = { positions: [], normals: [], indices: [] };
  const frame = { positions: [], normals: [], indices: [] };
  for (const region of regions) {
    const x0 = region.minX;
    const x1 = region.maxX + 1;
    const z0 = region.minZ;
    const z1 = region.maxZ + 1;
    const width = x1 - x0;
    const depth = z1 - z0;
    const y = region.y;
    const glassInset = SKY_FRAME_WIDTH * 1.1;
    const glassX0 = x0 + glassInset;
    const glassX1 = x1 - glassInset;
    const glassZ0 = z0 + glassInset;
    const glassZ1 = z1 - glassInset;
    if (glassX1 > glassX0 && glassZ1 > glassZ0) {
      pushQuad(glass,
        [glassX0, y + SKY_GLASS_OFFSET, glassZ0],
        [glassX0, y + SKY_GLASS_OFFSET, glassZ1],
        [glassX1, y + SKY_GLASS_OFFSET, glassZ1],
        [glassX1, y + SKY_GLASS_OFFSET, glassZ0],
        [0, 1, 0]);
    }

    const frameY = y - SKY_FRAME_DEPTH * 0.5;
    const frameYSize = SKY_FRAME_DEPTH;
    pushBox(frame, (x0 + x1) * 0.5, frameY, z0 + SKY_FRAME_WIDTH * 0.5,
      width, frameYSize, SKY_FRAME_WIDTH);
    pushBox(frame, (x0 + x1) * 0.5, frameY, z1 - SKY_FRAME_WIDTH * 0.5,
      width, frameYSize, SKY_FRAME_WIDTH);
    pushBox(frame, x0 + SKY_FRAME_WIDTH * 0.5, frameY, (z0 + z1) * 0.5,
      SKY_FRAME_WIDTH, frameYSize, Math.max(0, depth - SKY_FRAME_WIDTH * 2));
    pushBox(frame, x1 - SKY_FRAME_WIDTH * 0.5, frameY, (z0 + z1) * 0.5,
      SKY_FRAME_WIDTH, frameYSize, Math.max(0, depth - SKY_FRAME_WIDTH * 2));
    // One restrained cross-brace keeps the opening readable from below while
    // preserving a clear view of the procedural sky between the four panes.
    pushBox(frame, (x0 + x1) * 0.5, frameY, (z0 + z1) * 0.5,
      Math.max(0, width - SKY_FRAME_WIDTH * 2), frameYSize, SKY_FRAME_WIDTH);
    pushBox(frame, (x0 + x1) * 0.5, frameY, (z0 + z1) * 0.5,
      SKY_FRAME_WIDTH, frameYSize, Math.max(0, depth - SKY_FRAME_WIDTH * 2));
  }

  const meshes = [];
  if (glass.positions.length) {
    const geometry = makeGeometry(glass);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x9bd5e5,
      roughness: 0.16,
      metalness: 0.06,
      clearcoat: 0.34,
      clearcoatRoughness: 0.15,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    material.userData.skyOpeningGlass = true;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'SkyOpeningGlass';
    mesh.userData.skyOpening = true;
    group.add(mesh);
    group.userData.geometries.push(geometry);
    group.userData.materials.push(material);
    meshes.push(mesh);
  }
  if (frame.positions.length) {
    const geometry = makeGeometry(frame);
    const material = new THREE.MeshStandardMaterial({
      color: 0x627b80,
      roughness: 0.27,
      metalness: 0.82,
      side: THREE.DoubleSide,
    });
    material.userData.skyOpeningFrame = true;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'SkyOpeningFrame';
    mesh.userData.skyOpening = true;
    group.add(mesh);
    group.userData.geometries.push(geometry);
    group.userData.materials.push(material);
    meshes.push(mesh);
  }
  group.userData.skyOpeningRegions = regions;
  return { regions, meshes };
}

/** Create the single low-cost sky dome shared by all streamed room chunks. */
export function createSkylightSky({ scene = null, camera = null, radius = SKY_RADIUS } = {}) {
  const geometry = new THREE.SphereGeometry(radius, SKY_SEGMENTS, SKY_RINGS);
  const uniforms = {
    uTime: { value: 0 },
    uSunDirection: { value: new THREE.Vector3(0.36, 0.78, 0.31).normalize() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'SkylightSkyDome';
  mesh.renderOrder = -1000;
  mesh.frustumCulled = false;
  mesh.userData.skylightSky = true;
  mesh.onBeforeRender = (_renderer, _scene, renderCamera) => {
    if (!renderCamera?.position) return;
    mesh.position.copy(renderCamera.position);
    // The scene graph's normal matrix pass has already run by this hook.
    // Update immediately so reflection and main cameras each center the dome
    // correctly during their own render in the same animation frame.
    mesh.updateMatrixWorld();
  };
  scene?.add(mesh);

  let disposed = false;
  const api = {
    mesh,
    geometry,
    material,
    uniforms,
    // Follow the main camera between frames. onBeforeRender repeats this for
    // the reflection camera, so the dome stays camera-relative in both passes.
    update(time = 0, activeCamera = camera) {
      if (activeCamera?.position) mesh.position.copy(activeCamera.position);
      uniforms.uTime.value = Number.isFinite(Number(time)) ? Number(time) : 0;
      return api;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mesh.onBeforeRender = null;
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
  api.update(0, camera);
  return api;
}

export const SKYLIGHT_SKY_SHADER = Object.freeze({
  vertex: SKY_VERTEX_SHADER,
  fragment: SKY_FRAGMENT_SHADER,
});
