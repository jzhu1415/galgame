import * as THREE from 'three';
import { LIGHTING_PRESETS } from './EnvironmentConfig.js';
import { isReferenceCorridor, referenceLightingPreset } from './RoomArchetypes.js';
import { CURVED_ROOM } from './CurvedRoomProfiles.js';
import { sampleCurvedRoom } from './CurvedRooms.js';

// The reference map uses 15m room modules and 16m streaming chunks.  Keeping the
// constants here makes this helper usable by the chunk builder without importing
// browser-only state from reference-map.js.
const MODULE_SIZE = 15;
const CHUNK_SIZE = 16;
const WATER_LEVEL = -0.12;
const WET_EPSILON = 0.08;
const MAX_SOURCE_DISTANCE = 24;
const MAX_LIGHT_COUNT = 16;
const POOL_EMITTER_OFFSET = 0.07;

const QUALITY_BUDGETS = Object.freeze({
  performance: MAX_LIGHT_COUNT,
  balanced: MAX_LIGHT_COUNT,
  high: MAX_LIGHT_COUNT,
});

const DIRECTIONS = Object.freeze([
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]);

const DEFAULT_PRESET = 'cyan';
const DEFAULT_POOL_COLOR = '#9bd9d1';
const POOL_PRESET_COLORS = Object.freeze({
  warm: '#ffe5c3',
  cyan: '#9bd9d1',
  skylight: '#d8ece5',
  dim: '#88c7c1',
  sparse: '#b8d9ce',
  spa: '#ffe2bb',
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const positiveNumber = (value, fallback) => Number.isFinite(Number(value))
  ? Number(value) : fallback;

function moduleCoordinate(value) {
  return Math.floor(value / MODULE_SIZE);
}

function normalizePresetName(value) {
  if (typeof value === 'string' && LIGHTING_PRESETS[value]) return value;
  return DEFAULT_PRESET;
}

function presetNameForFixture(fixture = {}) {
  if (typeof fixture === 'string') return normalizePresetName(fixture);
  const explicit = fixture.presetName
    ?? fixture.lightingPreset
    ?? (typeof fixture.preset === 'string' ? fixture.preset : null)
    ?? fixture.roomLightingPreset;
  if (explicit) return normalizePresetName(explicit);
  if (Number.isFinite(Number(fixture.x)) && Number.isFinite(Number(fixture.z))) {
    try {
      return normalizePresetName(referenceLightingPreset(
        moduleCoordinate(Number(fixture.x)),
        moduleCoordinate(Number(fixture.z)),
      ));
    } catch {
      // A standalone test or a partially loaded map may not have a room resolver.
    }
  }
  return DEFAULT_PRESET;
}

function presetForFixture(fixture = {}) {
  const name = presetNameForFixture(fixture);
  return { name, preset: LIGHTING_PRESETS[name] ?? LIGHTING_PRESETS[DEFAULT_PRESET] };
}

/**
 * Apply a room lighting preset to an already-reset light.
 *
 * Callers intentionally reset intensity/width/height before invoking this
 * function.  That keeps a RectAreaLight stable while the streaming manager
 * changes fixture assignments and avoids compounding preset multipliers.
 */
export function applyFixturePreset(light, fixture = {}) {
  if (!light) return light;
  const fixtureX = Number(fixture.x);
  const fixtureZ = Number(fixture.z);
  if (Number.isFinite(fixtureX) && Number.isFinite(fixtureZ)
    && isReferenceCorridor(moduleCoordinate(fixtureX), moduleCoordinate(fixtureZ))) {
    light.color?.set(0xa8d8ff);
    return light;
  }
  const { name, preset } = presetForFixture(fixture);
  if (light.color?.set) light.color.set(preset.color ?? DEFAULT_POOL_COLOR);

  if (Number.isFinite(Number(light.intensity))) {
    const baseIntensity = Number.isFinite(Number(fixture.baseIntensity))
      ? Number(fixture.baseIntensity) : light.intensity;
    light.intensity = baseIntensity * positiveNumber(preset.intensity, 1);
  }

  // RectAreaLight uses width/height while PointLight does not.  Keep strips
  // visibly long enough after preset application; the old 0.28 width multiplier
  // made the reference ceiling strips read as pinpricks.
  if (Number.isFinite(Number(light.width))) {
    const baseWidth = Number.isFinite(Number(fixture.baseWidth))
      ? Number(fixture.baseWidth) : light.width;
    const fixtureType = preset.fixture ?? 'panel';
    if (fixtureType === 'strip') light.width = Math.max(baseWidth * 0.92, 0.68);
    else if (fixtureType === 'wall') light.width = Math.max(baseWidth * 0.82, 0.42);
    else light.width = Math.max(baseWidth * 0.88, 0.55);
  }
  if (Number.isFinite(Number(light.height))) {
    const baseHeight = Number.isFinite(Number(fixture.baseHeight))
      ? Number(fixture.baseHeight) : light.height;
    const fixtureType = preset.fixture ?? 'panel';
    if (fixtureType === 'strip') light.height = Math.max(baseHeight * 0.88, 0.18);
    else if (fixtureType === 'wall') light.height = Math.max(baseHeight * 0.82, 0.32);
    else light.height = Math.max(baseHeight * 0.88, 0.55);
  }
  light.userData ??= {};
  light.userData.poolLightingPreset = name;
  return light;
}

function sampleCell(sample, x, z) {
  const value = typeof sample === 'function' ? sample(x, z) : null;
  if (!value) return { solid: true, level: 0, ceiling: 0 };
  return value;
}

function isWet(cell) {
  return Boolean(cell) && !cell.solid
    && Number.isFinite(Number(cell.level))
    && Number(cell.level) < WATER_LEVEL - WET_EPSILON;
}

function hasWallEdge(sample, x, z, dx, dz) {
  const cell = sampleCell(sample, x, z);
  if (!isWet(cell)) return false;
  const adjacent = sampleCell(sample, x + dx, z + dz);
  // A dry step can form a vertical pool wall just like an opaque wall.  The
  // small epsilon prevents a flat wet floor from producing four-sided lamps.
  return Boolean(adjacent.solid)
    || Number(adjacent.level) > Number(cell.level) + WET_EPSILON;
}

function logicalRoomKey(moduleX, moduleZ) {
  return moduleZ === 0 && moduleX >= 2 && moduleX <= 4
    ? 'broad-hall:2-4:0' : `${moduleX}:${moduleZ}`;
}

function logicalRoomBounds(key) {
  if (key === 'broad-hall:2-4:0') {
    return { minX: 2 * MODULE_SIZE, maxX: 5 * MODULE_SIZE, minZ: 0, maxZ: MODULE_SIZE };
  }
  const [moduleX, moduleZ] = key.split(':').map(Number);
  return {
    minX: moduleX * MODULE_SIZE,
    maxX: (moduleX + 1) * MODULE_SIZE,
    minZ: moduleZ * MODULE_SIZE,
    maxZ: (moduleZ + 1) * MODULE_SIZE,
  };
}

function logicalRoomAt(position) {
  if (!position) return null;
  return logicalRoomKey(moduleCoordinate(Number(position.x)), moduleCoordinate(Number(position.z)));
}

function wetComponents(logicalRoom, sample) {
  const bounds = logicalRoomBounds(logicalRoom);
  const remaining = new Set();
  for (let x = bounds.minX; x < bounds.maxX; x += 1) {
    for (let z = bounds.minZ; z < bounds.maxZ; z += 1) {
      if (isWet(sampleCell(sample, x, z))) remaining.add(`${x}:${z}`);
    }
  }
  const components = [];
  while (remaining.size) {
    const [first] = remaining;
    remaining.delete(first);
    const cells = [first.split(':').map(Number)];
    for (let index = 0; index < cells.length; index += 1) {
      const [x, z] = cells[index];
      for (const [dx, dz] of DIRECTIONS) {
        const key = `${x + dx}:${z + dz}`;
        if (!remaining.delete(key)) continue;
        cells.push([x + dx, z + dz]);
      }
    }
    components.push(cells);
  }
  components.sort((a, b) => a[0][0] - b[0][0] || a[0][1] - b[0][1]);
  return components;
}

function fixtureDimensions(fixtureType, source = {}) {
  if (fixtureType === 'strip') {
    return {
      width: Math.max(positiveNumber(source.width, 0.92), 0.72),
      depth: Math.max(positiveNumber(source.depth, 0.22), 0.18),
    };
  }
  if (fixtureType === 'wall') return { width: 0.58, depth: 0.42 };
  if (fixtureType === 'round') return { width: 0.56, depth: 0.56 };
  return {
    width: Math.max(positiveNumber(source.width, 0.82), 0.56),
    depth: Math.max(positiveNumber(source.depth, 0.82), 0.56),
  };
}

function colorForPreset(presetName, pool = false) {
  const preset = LIGHTING_PRESETS[presetName] ?? LIGHTING_PRESETS[DEFAULT_PRESET];
  const source = pool ? (POOL_PRESET_COLORS[presetName] ?? DEFAULT_POOL_COLOR) : preset.color;
  return new THREE.Color(source ?? DEFAULT_POOL_COLOR);
}

function addEntry(entries, position, scale, color, rotationY = 0) {
  entries.push({ position, scale, color, rotationY });
}

function addInstancedBatch(group, entries, geometry, material, geometries, materials, emissive = false) {
  if (!entries.length) {
    geometry.dispose();
    material.dispose();
    return null;
  }
  const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
  mesh.frustumCulled = true;
  const transform = new THREE.Object3D();
  entries.forEach((entry, index) => {
    transform.position.fromArray(entry.position);
    transform.scale.fromArray(entry.scale);
    transform.rotation.set(0, entry.rotationY ?? 0, 0);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    mesh.setColorAt(index, entry.color instanceof THREE.Color
      ? entry.color : new THREE.Color(entry.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.userData.poolLightingEmissive = emissive;
  group.add(mesh);
  geometries.push(geometry);
  materials.push(material);
  return mesh;
}

function fixtureMaterial({ emissive = false } = {}) {
  if (emissive) {
    // Keep this base color white.  Preset colors live in instanceColor and the
    // shared material color is the only brightness knob used at runtime.
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
    });
    material.userData.poolLightingBaseColor = new THREE.Color(1, 1, 1);
    return material;
  }
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.04,
  });
}

function pushCeilingFixtures(skylightPoints, housingEntries, emitterEntries, roundEntries) {
  const seen = new Set();
  for (const point of Array.isArray(skylightPoints) ? skylightPoints : []) {
    const x = Number(point?.x);
    const y = Number(point?.y);
    const z = Number(point?.z);
    if (![x, y, z].every(Number.isFinite)) continue;
    if (isReferenceCorridor(moduleCoordinate(x), moduleCoordinate(z))) continue;
    const key = `${Math.round(x * 100)}:${Math.round(y * 100)}:${Math.round(z * 100)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const { name, preset } = presetForFixture(point);
    const dimensions = fixtureDimensions(preset.fixture, point);
    const emitterColor = colorForPreset(name).multiplyScalar(
      Math.max(0.92, positiveNumber(preset.intensity, 1)) * 1.35,
    );
    const housingColor = new THREE.Color('#82918e');
    const isRound = preset.fixture === 'round';
    const width = dimensions.width;
    const depth = dimensions.depth;
    addEntry(housingEntries,
      [x, y - 0.015, z],
      [isRound ? width + 0.12 : width + 0.10, 0.10, isRound ? depth + 0.12 : depth + 0.10],
      housingColor);
    if (isRound) {
      addEntry(roundEntries, [x, y - 0.075, z], [width, 0.025, depth], emitterColor);
    } else {
      addEntry(emitterEntries, [x, y - 0.075, z], [width, 0.025, depth], emitterColor);
    }
  }
}

function poolLampHeight(cellLevel, ceiling = Infinity, wallCell = null, row = 'upper') {
  const depth = Math.max(0, WATER_LEVEL - Number(cellLevel));
  const halfHeight = 0.16;
  const margin = 0.05;
  const bottomLimit = Number(cellLevel) + halfHeight + margin;
  const desired = row === 'lower'
    ? Number(cellLevel) + 1
    : depth > 4
      ? WATER_LEVEL - 1
      : WATER_LEVEL - Math.min(2.2, Math.max(0.16, depth * 0.42));
  // The lamp has a real vertical extent.  Use the lower of the cell ceiling,
  // waterline, and the adjacent step/wall top so a shallow fixture cannot poke
  // through its floor or a -3.1m submerged throat roof.
  let topLimit = WATER_LEVEL - halfHeight - margin;
  if (Number.isFinite(Number(ceiling))) topLimit = Math.min(
    topLimit, Number(ceiling) - halfHeight - margin,
  );
  if (wallCell && !wallCell.solid && Number.isFinite(Number(wallCell.level))) {
    topLimit = Math.min(topLimit, Number(wallCell.level) - halfHeight - margin);
  } else if (wallCell?.solid && Number.isFinite(Number(wallCell.ceiling))) {
    topLimit = Math.min(topLimit, Number(wallCell.ceiling) - halfHeight - margin);
  }
  if (topLimit < bottomLimit) return null;
  // The first branch is important for the reference arrival basin (~0.7m
  // deep), while the top/bottom bounds handle very shallow step cells.
  return clamp(desired, bottomLimit, topLimit);
}

function poolCandidate(logicalRoom, poolIndex, sample, cellX, cellZ, dx, dz, row) {
  const cell = sampleCell(sample, cellX, cellZ);
  const wallCell = sampleCell(sample, cellX + dx, cellZ + dz);
  const lampY = poolLampHeight(Number(cell.level), cell.ceiling, wallCell, row);
  if (lampY === null) return null;
  const inwardX = -dx;
  const inwardZ = -dz;
  const wallX = cellX + 0.5 + dx * 0.5;
  const wallZ = cellZ + 0.5 + dz * 0.5;
  const moduleX = moduleCoordinate(cellX);
  const moduleZ = moduleCoordinate(cellZ);
  let presetName = DEFAULT_PRESET;
  try {
    presetName = normalizePresetName(referenceLightingPreset(moduleX, moduleZ));
  } catch {
    // Keep the reference cyan fallback for isolated tests.
  }
  const preset = LIGHTING_PRESETS[presetName] ?? LIGHTING_PRESETS[DEFAULT_PRESET];
  const poolColor = colorForPreset(presetName, true);
  const tangentX = dz !== 0 ? 1 : 0;
  const tangentZ = dx !== 0 ? 1 : 0;
  return {
    id: `${logicalRoom}:pool-${poolIndex}:${cellX}:${cellZ}:${inwardX}:${inwardZ}:${row}`,
    logicalRoom,
    poolIndex,
    row,
    x: wallX + inwardX * POOL_EMITTER_OFFSET,
    y: lampY,
    z: wallZ + inwardZ * POOL_EMITTER_OFFSET,
    wallX,
    wallZ,
    normalX: inwardX,
    normalZ: inwardZ,
    cellX,
    cellZ,
    moduleX,
    moduleZ,
    rotationY: dz !== 0 ? Math.PI * 0.5 : 0,
    straight: hasWallEdge(sample, cellX - tangentX, cellZ - tangentZ, dx, dz)
      && hasWallEdge(sample, cellX + tangentX, cellZ + tangentZ, dx, dz),
    color: `#${poolColor.getHexString()}`,
    emitterColor: poolColor.clone().multiplyScalar(
      Math.max(1.18, positiveNumber(preset.intensity, 1) * 1.7),
    ),
    presetName,
    // The beam is spatially confined and visibility-tested below, so it can
    // retain enough energy to illuminate the pool without leaking through decks.
    baseIntensity: clamp(6 * positiveNumber(preset.intensity, 1), 5, 11),
    poolDepth: Math.max(0, WATER_LEVEL - Number(cell.level)),
  };
}

function spreadCandidates(candidates, count) {
  if (count <= 0 || !candidates.length) return [];
  const preferred = candidates.filter(candidate => candidate.straight);
  const pool = (preferred.length >= count ? preferred : candidates)
    .slice().sort((a, b) => a.id.localeCompare(b.id));
  const selected = [pool.shift()];
  while (pool.length && selected.length < count) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let index = 0; index < pool.length; index += 1) {
      const candidate = pool[index];
      const distance = Math.min(...selected.map(existing =>
        (candidate.x - existing.x) ** 2 + (candidate.z - existing.z) ** 2));
      const newDirection = selected.some(existing =>
        existing.normalX === candidate.normalX && existing.normalZ === candidate.normalZ) ? 0 : 9;
      const score = distance + newDirection;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    selected.push(pool.splice(bestIndex, 1)[0]);
  }
  return selected;
}

function selectPoolCandidates(logicalRoom, poolIndex, cells, sample) {
  const room = cells.length ? sampleCell(sample, ...cells[0]).room : null;
  if (room?.roomType === 'circular') {
    const presetName = normalizePresetName(referenceLightingPreset(room.moduleX, room.moduleZ));
    const preset = LIGHTING_PRESETS[presetName];
    const poolColor = colorForPreset(presetName, true);
    const y = poolLampHeight(-room.poolDepth, room.ceilingHeight, { solid: false, level: 0 }, 'upper');
    if (y === null) return [];
    return DIRECTIONS.map(([dx, dz], index) => {
      const wallX = room.moduleX * 15 + 7.5 + dx * CURVED_ROOM.poolRadius;
      const wallZ = room.moduleZ * 15 + 7.5 + dz * CURVED_ROOM.poolRadius;
      const x = wallX - dx * POOL_EMITTER_OFFSET, z = wallZ - dz * POOL_EMITTER_OFFSET;
      return {
        id: `${logicalRoom}:pool-${poolIndex}:round-${index}`, logicalRoom, poolIndex,
        row: 'upper', x, y, z, wallX, wallZ, normalX: -dx, normalZ: -dz,
        cellX: Math.floor(x), cellZ: Math.floor(z), moduleX: room.moduleX, moduleZ: room.moduleZ,
        rotationY: dz !== 0 ? Math.PI * 0.5 : 0, curvedPool: true,
        color: `#${poolColor.getHexString()}`, presetName,
        emitterColor: poolColor.clone().multiplyScalar(Math.max(1.18, positiveNumber(preset.intensity, 1) * 1.7)),
        baseIntensity: clamp(6 * positiveNumber(preset.intensity, 1), 5, 11),
        poolDepth: Math.max(0, WATER_LEVEL + room.poolDepth),
      };
    });
  }
  const candidates = [];
  for (const [cellX, cellZ] of cells) {
    const cell = sampleCell(sample, cellX, cellZ);
    for (const [dx, dz] of DIRECTIONS) {
      if (!hasWallEdge(sample, cellX, cellZ, dx, dz)) continue;
      const rows = WATER_LEVEL - Number(cell.level) > 4 ? ['upper', 'lower'] : ['upper'];
      const placedHeights = [];
      for (const row of rows) {
        const candidate = poolCandidate(logicalRoom, poolIndex, sample, cellX, cellZ, dx, dz, row);
        if (!candidate || placedHeights.some(height => Math.abs(height - candidate.y) < 0.55)) continue;
        placedHeights.push(candidate.y);
        candidates.push(candidate);
      }
    }
  }
  const target = logicalRoom === 'broad-hall:2-4:0' ? 8 : 4;
  const upper = candidates.filter(candidate => candidate.row === 'upper');
  const lower = candidates.filter(candidate => candidate.row === 'lower');
  let selected;
  if (lower.length) {
    selected = [
      ...spreadCandidates(upper, Math.ceil(target * 0.5)),
      ...spreadCandidates(lower, Math.floor(target * 0.5)),
    ];
  } else {
    selected = spreadCandidates(upper, target);
  }
  if (selected.length < target) {
    const chosen = new Set(selected.map(candidate => candidate.id));
    selected.push(...spreadCandidates(candidates.filter(candidate => !chosen.has(candidate.id)),
      target - selected.length));
  }
  return selected.slice(0, target);
}

function planPoolFixtures(logicalRoom, sample) {
  const components = wetComponents(logicalRoom, sample);
  const candidates = [];
  components.forEach((cells, poolIndex) => {
    candidates.push(...selectPoolCandidates(logicalRoom, poolIndex, cells, sample));
  });
  return candidates;
}

function canonicalLogicalRoomKey(value, moduleZ) {
  if (Number.isFinite(Number(value)) && Number.isFinite(Number(moduleZ))) {
    return logicalRoomKey(Number(value), Number(moduleZ));
  }
  const key = String(value ?? '');
  if (key === 'broad-hall:2-4:0') return key;
  const [moduleX, parsedModuleZ, ...rest] = key.split(':').map(Number);
  return rest.length === 0 && Number.isFinite(moduleX) && Number.isFinite(parsedModuleZ)
    ? logicalRoomKey(moduleX, parsedModuleZ) : key;
}

/**
 * Bounded LRU cache for the final pool-lamp plan of one logical room.
 *
 * A 15m room can straddle multiple 16m streaming chunks. The room scan and
 * candidate spread are independent of the owning chunk, so keeping that
 * result here avoids repeating the same work as adjacent chunks are loaded.
 * The cache is opt-in: callers that omit it retain the standalone sampler
 * behaviour used by tests and tools that may mutate their cell map.
 */
export class PoolLightPlanCache {
  constructor(columnAt, maxRooms = 64) {
    this.columnAt = typeof columnAt === 'function' ? columnAt : null;
    const parsedMax = Number(maxRooms);
    this.maxRooms = Number.isFinite(parsedMax)
      ? Math.max(1, Math.floor(parsedMax)) : 64;
    this.rooms = new Map();
  }

  get(logicalRoomOrX, moduleZ) {
    const key = canonicalLogicalRoomKey(logicalRoomOrX, moduleZ);
    if (!this.columnAt) return [];

    const cached = this.rooms.get(key);
    if (cached) {
      // Map insertion order is the LRU order. Touching the entry here keeps
      // rooms around while the camera streams back and forth at a seam.
      this.rooms.delete(key);
      this.rooms.set(key, cached);
      return cached;
    }

    const plan = planPoolFixtures(key, this.columnAt);
    this.rooms.set(key, plan);
    if (this.rooms.size > this.maxRooms) this.rooms.delete(this.rooms.keys().next().value);
    return plan;
  }

  clear() {
    this.rooms.clear();
  }
}

function addPoolFixtures(chunkX, chunkZ, sample, housingEntries, emitterEntries, sources,
  planCache = null) {
  const originX = chunkX * CHUNK_SIZE;
  const originZ = chunkZ * CHUNK_SIZE;
  const rooms = new Set();
  for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
    for (let localZ = 0; localZ < CHUNK_SIZE; localZ += 1) {
      const cellX = originX + localX;
      const cellZ = originZ + localZ;
      const cell = sampleCell(sample, cellX, cellZ);
      // A thin circular slice can contain a lamp even when no cell centre is
      // wet in this chunk. Still enumerate its logical room to avoid lost lamps.
      if (!isWet(cell) && cell.room?.roomType !== 'circular') continue;
      rooms.add(logicalRoomKey(moduleCoordinate(cellX), moduleCoordinate(cellZ)));
    }
  }

  for (const logicalRoom of rooms) {
    const planned = planCache?.get(logicalRoom)
      ?? planPoolFixtures(logicalRoom, sample);
    for (const candidate of planned) {
      if (Math.floor(candidate.cellX / CHUNK_SIZE) !== chunkX
        || Math.floor(candidate.cellZ / CHUNK_SIZE) !== chunkZ) continue;
      addEntry(housingEntries,
        [candidate.wallX + candidate.normalX * 0.015, candidate.y,
          candidate.wallZ + candidate.normalZ * 0.015],
        [0.10, 0.32, 0.58], new THREE.Color('#657f7e'), candidate.rotationY);
      addEntry(emitterEntries,
        [candidate.wallX + candidate.normalX * POOL_EMITTER_OFFSET, candidate.y,
          candidate.wallZ + candidate.normalZ * POOL_EMITTER_OFFSET],
        [0.025, 0.22, 0.46], candidate.emitterColor, candidate.rotationY);
      sources.push({
        id: candidate.id,
        logicalRoom: candidate.logicalRoom,
        poolIndex: candidate.poolIndex,
        row: candidate.row,
        x: candidate.x,
        y: candidate.y,
        z: candidate.z,
        normalX: candidate.normalX,
        normalZ: candidate.normalZ,
        cellX: candidate.cellX,
        cellZ: candidate.cellZ,
        moduleX: candidate.moduleX,
        moduleZ: candidate.moduleZ,
        color: candidate.color,
        presetName: candidate.presetName,
        baseIntensity: candidate.baseIntensity,
        intensity: candidate.baseIntensity,
        poolDepth: candidate.poolDepth,
        curvedPool: candidate.curvedPool ?? false,
      });
    }
  }
}

/**
 * Add all chunk-owned fixture meshes.  There are at most three InstancedMesh
 * draw calls: one shared housing batch, one rectangular emissive batch, and one
 * round emissive batch.  The caller owns the group and disposes the resources
 * listed in userData.geometries/materials during chunk eviction.
 */
export function addChunkLights(group, chunkX, chunkZ, sample, skylightPoints = [], planCache = null) {
  if (!group) return [];
  group.userData ??= {};
  if (group.userData.poolLightingBuilt) return group.userData.underwaterLights ?? [];
  group.userData.poolLightingBuilt = true;
  if (!Array.isArray(group.userData.geometries)) group.userData.geometries = [];
  if (!Array.isArray(group.userData.materials)) group.userData.materials = [];

  const housingEntries = [];
  const emitterEntries = [];
  const roundEntries = [];
  const sources = [];
  pushCeilingFixtures(skylightPoints, housingEntries, emitterEntries, roundEntries);
  addPoolFixtures(chunkX, chunkZ, sample, housingEntries, emitterEntries, sources,
    planCache?.get ? planCache : null);

  const ownGeometries = [];
  const ownMaterials = [];
  const housingMaterial = fixtureMaterial();
  const emitterMaterial = fixtureMaterial({ emissive: true });
  const roundMaterial = fixtureMaterial({ emissive: true });
  addInstancedBatch(group, housingEntries, new THREE.BoxGeometry(1, 1, 1), housingMaterial,
    ownGeometries, ownMaterials, false);
  addInstancedBatch(group, emitterEntries, new THREE.BoxGeometry(1, 1, 1), emitterMaterial,
    ownGeometries, ownMaterials, true);
  addInstancedBatch(group, roundEntries, new THREE.CylinderGeometry(0.5, 0.5, 1, 16), roundMaterial,
    ownGeometries, ownMaterials, true);

  group.userData.geometries.push(...ownGeometries);
  group.userData.materials.push(...ownMaterials);
  group.userData.poolLightingEmissiveMaterials = ownMaterials.filter(material =>
    material.userData?.poolLightingBaseColor,
  );
  group.userData.poolLightingSample = sample;
  group.userData.underwaterLights = sources;
  return sources;
}

function entriesFromChunks(chunksMap) {
  if (!chunksMap) return [];
  if (chunksMap instanceof Map) return [...chunksMap.entries()];
  if (chunksMap.chunks instanceof Map) return [...chunksMap.chunks.entries()];
  if (typeof chunksMap.entries === 'function') return [...chunksMap.entries()];
  if (typeof chunksMap[Symbol.iterator] === 'function') return [...chunksMap];
  return Object.entries(chunksMap);
}

function sourceDistanceSq(source, position) {
  const dx = Number(source.x) - Number(position.x);
  const dy = Number(source.y) - Number(position.y);
  const dz = Number(source.z) - Number(position.z);
  return dx * dx + dy * dy + dz * dz;
}

function hasVisiblePoolPath(source, origin) {
  if (!source?.sample || !origin) return true;
  const deltaX = Number(source.x) - Number(origin.x);
  const deltaY = Number(source.y) - Number(origin.y);
  const deltaZ = Number(source.z) - Number(origin.z);
  const distance = Math.hypot(deltaX, deltaY, deltaZ);
  const steps = Math.max(2, Math.ceil(distance / 0.35));
  for (let step = 1; step < steps; step += 1) {
    const t = step / steps;
    const x = Number(origin.x) + deltaX * t;
    const y = Number(origin.y) + deltaY * t;
    const z = Number(origin.z) + deltaZ * t;
    const column = sampleCurvedRoom(x, z) ?? sampleCell(source.sample, Math.floor(x), Math.floor(z));
    if (column.solid || y < Number(column.level) + 0.06
      || y > Number(column.ceiling) - 0.06) return false;
  }
  return true;
}

function bindPoolSpecularMask(material, visibility) {
  if (!material || material.userData?.poolSpecularMaskBound) return;
  material.userData ??= {};
  material.userData.poolSpecularMaskBound = true;
  const previousCompile = material.onBeforeCompile.bind(material);
  const previousCacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previousCompile(shader, renderer);
    shader.uniforms.poolSpotSpecularVisibility = { value: visibility };
    const chunk = THREE.ShaderChunk.lights_fragment_begin;
    const spotStart = chunk.indexOf('#if ( NUM_SPOT_LIGHTS > 0 )');
    const spotEnd = chunk.indexOf('#if ( NUM_DIR_LIGHTS > 0 )', spotStart);
    const directCall = '\t\tRE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
    if (spotStart < 0 || spotEnd < 0) return;
    const declarationsAnchor = '\tbool inSpotLightMap;';
    let spotSection = chunk.slice(spotStart, spotEnd);
    if (!spotSection.includes(directCall)) return;
    spotSection = spotSection.replace(declarationsAnchor, `${declarationsAnchor}
\tvec3 poolBaseSpecular;
\t#ifdef USE_CLEARCOAT
\t\tvec3 poolBaseClearcoat;
\t#endif`);
    const maskedCall = `
\t\tpoolBaseSpecular = reflectedLight.directSpecular;
\t\t#ifdef USE_CLEARCOAT
\t\t\tpoolBaseClearcoat = clearcoatSpecularDirect;
\t\t#endif
${directCall}
\t\treflectedLight.directSpecular = mix( poolBaseSpecular, reflectedLight.directSpecular, poolSpotSpecularVisibility[ i ] );
\t\t#ifdef USE_CLEARCOAT
\t\t\tclearcoatSpecularDirect = mix( poolBaseClearcoat, clearcoatSpecularDirect, poolSpotSpecularVisibility[ i ] );
\t\t#endif`;
    const patchedChunk = chunk.slice(0, spotStart)
      + spotSection.replace(directCall, maskedCall)
      + chunk.slice(spotEnd);
    shader.fragmentShader = `uniform float poolSpotSpecularVisibility[ ${MAX_LIGHT_COUNT} ];\n`
      + shader.fragmentShader.replace('#include <lights_fragment_begin>', patchedChunk);
  };
  material.customProgramCacheKey = () => `${previousCacheKey()}|pool-specular-mask-v1`;
  material.needsUpdate = true;
}

/** Fixed inward-facing spot-light slots illuminate pool interiors without lighting dry decks. */
export class PoolLighting {
  constructor(scene, compact = false) {
    this.scene = scene;
    this.compact = Boolean(compact);
    this.lights = [];
    this.targets = [];
    this.quality = 'balanced';
    this.activeCount = MAX_LIGHT_COUNT;
    this.brightness = 1;
    this.sources = [];
    this._roomSources = new Map();
    this._evaluatedPosition = new THREE.Vector3(Infinity, Infinity, Infinity);
    this.specularVisibility = new Float32Array(MAX_LIGHT_COUNT);
    this._groups = new Map();
    this._chunksMap = null;
    this._elapsed = 0;
    this._hasSynced = false;
    this._forceEvaluate = false;

    for (let index = 0; index < MAX_LIGHT_COUNT; index += 1) {
      const light = new THREE.SpotLight(
        DEFAULT_POOL_COLOR, 0, 6, Math.PI / 6, 0.65, 2,
      );
      light.castShadow = false;
      light.visible = true;
      light.userData.targetIntensity = 0;
      light.userData.sourceId = null;
      scene?.add(light, light.target);
      this.lights.push(light);
      this.targets.push(light.target);
    }
  }

  setQuality(name = 'balanced') {
    this.quality = QUALITY_BUDGETS[name] ? name : 'balanced';
    this.activeCount = MAX_LIGHT_COUNT;
    this.lights.forEach((light) => {
      light.visible = true;
    });
    this._forceEvaluate = true;
    return this;
  }

  bindSurfaceMaterials(materials = []) {
    for (const material of materials) bindPoolSpecularMask(material, this.specularVisibility);
    return this;
  }

  applyGroupBrightness(group) {
    for (const material of group?.userData?.poolLightingEmissiveMaterials ?? []) {
      const base = material.userData.poolLightingBaseColor ?? new THREE.Color(1, 1, 1);
      material.color.copy(base).multiplyScalar(this.brightness);
    }
  }

  setBrightness(scale = 1) {
    this.brightness = Math.max(0, Number(scale) || 0);
    for (const group of this._groups.values()) this.applyGroupBrightness(group);
    // setBrightness can be called before the first update (the reference page
    // does this during startup), so catch already-built groups even when the
    // chunk map has not been synchronized yet.
    if (!this._groups.size && this.scene?.traverse) {
      this.scene.traverse((object) => {
        if (object?.userData?.poolLightingEmissiveMaterials) this.applyGroupBrightness(object);
      });
    }
    if (this.brightness === 0) {
      this.lights.forEach((light) => {
        light.userData.targetIntensity = 0;
        light.intensity = 0;
      });
    }
    this._forceEvaluate = true;
    return this;
  }

  syncChunks(chunksMap) {
    this._chunksMap = chunksMap;
    this._groups = new Map();
    this.sources = [];
    this._roomSources.clear();
    const sourceIds = new Set();
    for (const [key, group] of entriesFromChunks(chunksMap)) {
      if (!group?.userData) continue;
      this._groups.set(String(key), group);
      this.applyGroupBrightness(group);
      for (const source of group.userData.underwaterLights ?? []) {
        if (!source || !Number.isFinite(Number(source.x)) || !Number.isFinite(Number(source.y))
          || !Number.isFinite(Number(source.z))) continue;
        const sourceKey = source.id ?? `${key}:${source.cellX}:${source.cellZ}:${source.normalX}:${source.normalZ}`;
        if (sourceIds.has(String(sourceKey))) continue;
        sourceIds.add(String(sourceKey));
        this.sources.push({ ...source, id: String(sourceKey), chunkKey: String(key),
          sample: group.userData.poolLightingSample });
      }
    }
    // Source membership and slot ordering only change when chunks are streamed.
    for (const source of this.sources) {
      if (!this._roomSources.has(source.logicalRoom)) this._roomSources.set(source.logicalRoom, []);
      this._roomSources.get(source.logicalRoom).push(source);
    }
    for (const sources of this._roomSources.values()) {
      sources.sort((a, b) => a.poolIndex - b.poolIndex || a.id.localeCompare(b.id));
    }
    this._hasSynced = true;
    this._forceEvaluate = true;
  }

  evaluate(camera) {
    const position = camera?.position;
    if (!position || this.brightness === 0) {
      this.specularVisibility.fill(0);
      this.lights.forEach((light) => {
        light.userData.targetIntensity = 0;
        light.userData.sourceId = null;
      });
      return;
    }
    const currentRoom = logicalRoomAt(position);
    const roomSources = this._roomSources;
    let selected = roomSources.get(currentRoom) ?? [];
    if (!selected.length) {
      let nearest = null;
      let nearestDistance = Infinity;
      for (const sources of roomSources.values()) {
        let distance = Infinity;
        for (const source of sources) distance = Math.min(distance, sourceDistanceSq(source, position));
        if (distance >= nearestDistance) continue;
        nearest = sources;
        nearestDistance = distance;
      }
      if (nearestDistance < MAX_SOURCE_DISTANCE ** 2) selected = nearest;
    }
    const selectedIds = new Set();
    this.lights.forEach((light, index) => {
      if (index >= this.activeCount) {
        this.specularVisibility[index] = 0;
        return;
      }
      const source = selected[index];
      if (!source || selectedIds.has(source.id)) {
        light.intensity = 0;
        this.specularVisibility[index] = 0;
        light.userData.sourceId = null;
        light.userData.targetIntensity = 0;
        return;
      }
      selectedIds.add(source.id);
      const reassigned = light.userData.sourceId !== source.id;
      if (reassigned) light.intensity = 0;
      light.userData.sourceId = source.id;
      light.userData.targetIntensity = Math.max(0, positiveNumber(source.baseIntensity,
        positiveNumber(source.intensity, 1.5)) * this.brightness);
      light.position.set(source.x, source.y, source.z);
      const beamDrop = clamp(positiveNumber(source.poolDepth, 1) * 0.18, 0.18, 0.8);
      light.target.position.set(
        source.x + positiveNumber(source.normalX, 0) * 2.4,
        source.y - beamDrop,
        source.z + positiveNumber(source.normalZ, 0) * 2.4,
      );
      light.color.set(source.color ?? DEFAULT_POOL_COLOR);
      light.distance = positiveNumber(source.distance, 6);
      light.decay = positiveNumber(source.decay, 2);
      this.specularVisibility[index] = hasVisiblePoolPath(source, position) ? 1 : 0;
    });
    for (let index = this.activeCount; index < this.lights.length; index += 1) {
      this.lights[index].userData.targetIntensity = 0;
      this.lights[index].userData.sourceId = null;
      this.specularVisibility[index] = 0;
    }
  }

  update(delta = 1 / 60, camera, chunksMap, changed = false, scale) {
    const safeDelta = clamp(Number(delta) || 0, 0, 0.25);
    if (Number.isFinite(Number(scale)) && Number(scale) !== this.brightness) {
      this.setBrightness(Number(scale));
    }
    // The first render can legitimately pass changed=false after chunks were
    // built by the constructor.  Always synchronize that initial map.
    const needsSync = !this._hasSynced || changed || chunksMap !== this._chunksMap;
    if (needsSync) this.syncChunks(chunksMap);
    this._elapsed += safeDelta;
    if (needsSync || changed || this._forceEvaluate || this._elapsed >= 0.08) {
      this._elapsed = 0;
      // The visibility rays depend on position, not look direction. Exact
      // equality avoids changing masks for even very small player movements.
      if (this._forceEvaluate || !camera?.position
        || !this._evaluatedPosition.equals(camera.position)) {
        this.evaluate(camera);
        if (camera?.position) this._evaluatedPosition.copy(camera.position);
        else this._evaluatedPosition.set(Infinity, Infinity, Infinity);
      }
      this._forceEvaluate = false;
    }
    const response = 14;
    const blend = 1 - Math.exp(-response * safeDelta);
    for (const light of this.lights) {
      const target = this.brightness === 0 ? 0 : positiveNumber(light.userData.targetIntensity, 0);
      light.intensity += (target - light.intensity) * blend;
      if (this.brightness === 0) light.intensity = 0;
    }
    return this;
  }

  dispose() {
    for (let index = 0; index < this.lights.length; index += 1) {
      const light = this.lights[index];
      const target = this.targets[index];
      this.scene?.remove(light);
      this.scene?.remove(target);
      light.userData.targetIntensity = 0;
      light.userData.sourceId = null;
      light.intensity = 0;
      light.dispose?.();
    }
    this.lights.length = 0;
    this.targets.length = 0;
    this.sources.length = 0;
    this._roomSources.clear();
    this._evaluatedPosition.set(Infinity, Infinity, Infinity);
    this.specularVisibility.fill(0);
    this._groups.clear();
    this._chunksMap = null;
    this._hasSynced = false;
    this._forceEvaluate = false;
  }
}

export const POOL_LIGHT_QUALITY_BUDGETS = QUALITY_BUDGETS;
export { MODULE_SIZE, CHUNK_SIZE, WATER_LEVEL };
