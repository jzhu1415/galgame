import { ENVIRONMENT_CONFIG, THEMES, seedHash } from './EnvironmentConfig.js';
import { curvedRoomColumn } from './CurvedRoomProfiles.js';
import { TERRAIN_ROOM_SETTINGS, TERRAIN_ROOM_TYPES,
  terrainRoomColumn } from './TerrainRoomProfiles.js';

const BASE_ROOM_ARCHETYPES = [
  'shallow', 'giant', 'waterCorridor', 'stairwell', 'columns', 'low', 'tall', 'deep',
  'dry', 'flooded', 'multiLevel', 'arched', 'circular', 'skylight', 'dark', 'spa',
  'longCorridor', 'splitLevel', 'submerged', 'rest',
];
export const ROOM_ARCHETYPES = [...BASE_ROOM_ARCHETYPES, ...TERRAIN_ROOM_TYPES];
const heights = [5.4, 10.8, 3.2, 7.8, 8.6, 2.65, 13, 8.4, 4.1, 4.8, 7.4, 6.4, 7.5, 9.4, 5.6, 4.5, 3.6, 6.8, 5.2, 8.8];
const mod = (n, d) => ((n % d) + d) % d;
const cache = new Map();

// A small curated opening sequence. Beyond it a weighted, seeded checkerboard
// avoids identical neighboring types/themes without order-dependent generation.
const opening = new Map([
  ['0:0', 'shallow'], ['2:0', 'giant'], ['4:0', 'giant'], ['2:2', 'deep'],
  ['0:2', 'dry'], ['-2:0', 'dark'], ['0:-2', 'spa'], ['-2:2', 'low'],
  // Chapter two continues north through separate puzzle and core chambers.
  ['0:4', 'dry'], ['0:6', 'rest'],
]);
// Keep the original weighted selection stable. New terrain is an independent
// replacement gate, so adding a profile cannot reshuffle unrelated old rooms.
const weights = [0, 0, 4, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 19, 2, 3, 16, 18];
const allowedByParity = [0, 1].map(parity => weights.filter(index => index % 2 === parity));

function terrainRoomTypeAt(moduleX, moduleZ) {
  const gate = seedHash(moduleX, moduleZ, ENVIRONMENT_CONFIG.seed ^ 0x6d2b79f5);
  if (gate % 5 !== 0) return null;
  const variant = seedHash(moduleX, moduleZ, ENVIRONMENT_CONFIG.seed ^ 0x1b873593);
  return TERRAIN_ROOM_TYPES[variant % TERRAIN_ROOM_TYPES.length];
}

export function roomState(moduleX, moduleZ) {
  const key = `${ENVIRONMENT_CONFIG.seed}:${moduleX}:${moduleZ}`;
  if (cache.has(key)) return cache.get(key);
  const seed = seedHash(moduleX, moduleZ);
  const corridor = mod(moduleX, 2) !== 0 || mod(moduleZ, 2) !== 0;
  const openingType = opening.get(`${moduleX}:${moduleZ}`);
  let roomType = openingType ?? 'longCorridor';
  if (!openingType && !corridor) {
    const parity = mod(moduleX / 2 + moduleZ / 2, 2);
    const allowed = allowedByParity[parity];
    roomType = BASE_ROOM_ARCHETYPES[allowed[seed % allowed.length]];
    roomType = terrainRoomTypeAt(moduleX, moduleZ) ?? roomType;
  }
  // One broad connector makes the opening hall genuinely 43m long, not a tall box.
  if (moduleX === 3 && moduleZ === 0) roomType = 'giant';
  const index = ROOM_ARCHETYPES.indexOf(roomType);
  const terrainSettings = TERRAIN_ROOM_SETTINGS[roomType];
  const themeNames = ['white', 'green', 'blue', 'sky', 'dark'];
  const theme = terrainSettings?.theme ?? (roomType === 'shallow' || roomType === 'dry' || roomType === 'rest' ? 'white'
    : roomType === 'deep' || roomType === 'submerged' || roomType === 'columns' ? 'blue'
      : roomType === 'dark' ? 'dark' : roomType === 'spa' ? 'green'
        : roomType === 'skylight' || roomType === 'giant' ? 'sky'
          : themeNames[mod(Math.floor(moduleX / 2) + Math.floor(moduleZ / 2) * 2, 5)]);
  const palette = THEMES[theme];
  const depth = terrainSettings?.depth ?? (roomType === 'deep' ? 8 : roomType === 'submerged' ? 6
    : roomType === 'dry' || roomType === 'rest' ? 0
      : palette.depth[0] + (palette.depth[1] - palette.depth[0]) * ((seed >>> 8) % 100) / 100);
  const state = {
    seed, moduleX, moduleZ, roomType, theme,
    lightingPreset: roomType === 'low' || roomType === 'longCorridor' ? 'sparse' : palette.lighting,
    ceilingHeight: (terrainSettings?.ceiling ?? heights[index])
      + (roomType === 'giant' || terrainSettings ? 0 : ((seed >>> 5) % 3) * 0.15),
    poolDepth: depth,
    halfWidth: 5 - ((seed >>> 12) % 2), halfLength: 5 - ((seed >>> 14) % 2),
    columnSpacing: 3 + seed % 2, doorwayOffset: 0,
    archCount: roomType === 'arched' ? 3 : 0, floorElevation: 0,
    stairSide: (seed >>> 4) % 2,
  };
  cache.set(key, state);
  if (cache.size > 256) cache.delete(cache.keys().next().value);
  return state;
}

export function environmentColumn(ix, iz) {
  const mx = Math.floor(ix / 15), mz = Math.floor(iz / 15);
  const x = ix - mx * 15, z = iz - mz * 15;
  const oddX = mod(mx, 2), oddZ = mod(mz, 2);
  const room = roomState(mx, mz);
  const kind = room.roomType;
  const curved = curvedRoomColumn(room, x + 0.5, z + 0.5);
  if (curved) return curved;
  const terrain = terrainRoomColumn(room, x + 0.5, z + 0.5);
  if (terrain) return terrain;
  const dx = Math.abs(x - 7), dz = Math.abs(z - 7);
  const skyOpening = room.roomType === 'skylight'
    && x >= 6 && x <= 8 && z >= 6 && z <= 8;
  const column = {
    solid: false, level: 0, ceiling: room.ceilingHeight,
    skylight: false, skyOpening, room,
  };
  if (oddX && oddZ) { column.solid = true; return column; }
  if ((oddX || oddZ) && kind !== 'giant') {
    const cross = oddX ? z : x;
    const along = oddX ? x : z;
    column.solid = Math.abs(cross - 7) > 1;
    column.ceiling = 3.6;
    column.skylight = !column.solid && along % 5 === 2 && cross === 7;
    return column;
  }
  const giantOpenLeft = mz === 0 && (mx === 3 || mx === 4);
  const giantOpenRight = mz === 0 && (mx === 2 || mx === 3);
  const edgeX = (x === 0 && !giantOpenLeft) || (x === 14 && !giantOpenRight);
  const edgeZ = z === 0 || z === 14;
  if (edgeX || edgeZ) {
    const cross = edgeX ? z : x;
    column.solid = Math.abs(cross - 7) > 1;
    column.ceiling = column.solid ? room.ceilingHeight : 3.6;
    return column;
  }
  let pool = dx <= room.halfWidth && dz <= room.halfLength;
  if (kind === 'giant') pool = dz <= 4 && !(mx === 2 && x < 3) && !(mx === 4 && x > 11);
  if (kind === 'dry' || kind === 'rest') pool = false;
  if (kind === 'waterCorridor' || kind === 'longCorridor') {
    // Preserve the east/west cross-passage as well as the long north/south axis.
    column.solid = dx > 2 && z > 1 && z < 13 && dz > 1;
    pool = dx <= 1 && z >= 3 && z <= 11;
  }
  if (kind === 'spa') pool = (Math.abs(x - 4) <= 2 || Math.abs(x - 10) <= 2) && dz <= 3;
  if (kind === 'flooded') pool = x > 1 && x < 13 && z > 1 && z < 13;
  if (kind === 'splitLevel') pool = (x <= 6 || x >= 9) && dx <= 5 && dz <= 4;
  if (kind === 'deep' || kind === 'submerged') pool = dx <= 5 && dz <= 5;
  column.level = pool ? -room.poolDepth : 0;
  if (kind === 'columns' && (x === 3 || x === 7 || x === 11) && (z === 4 || z === 10)) column.solid = true;
  if (kind === 'multiLevel' && pool && dx < 2 && dz < 2) column.level = -0.48;
  if (kind === 'splitLevel' && pool && x < 7) column.level = -0.68;
  if (kind === 'stairwell' && pool) column.level = -Math.min(room.poolDepth, (z - 1) * 0.16);
  // Descending treads at the shallow entry; collision can climb each 16cm riser.
  if (kind === 'shallow' && pool && dx <= 1 && z <= 6) column.level = -Math.min(room.poolDepth, (z - 2) * 0.16);
  // Deep chamber partition: a real low-ceiling underwater throat between two basins.
  // It uses the existing floor/ceiling cell geometry (and a clearance collision hook),
  // not another water surface, reflection camera or physics engine.
  if ((kind === 'deep' || kind === 'submerged') && pool && z === 8) {
    column.solid = x < 6 || x > 8;
    if (!column.solid) column.ceiling = -3.1;
  }
  if (kind === 'deep' && pool && z > 8) column.level = -6.5;
  if (kind === 'low' && pool) column.level = -0.8;
  if (kind === 'dark') column.skylight = x === 7 && z === 4;
  else if (kind === 'giant') column.skylight = x === 7 && (z === 4 || z === 10);
  else if (kind === 'skylight') column.skylight = dx <= 1 && dz <= 1;
  else if (kind === 'spa') column.skylight = (x === 4 || x === 10) && z === 7;
  else column.skylight = (x === 4 || x === 10) && (z === 4 || z === 10);
  if (column.solid || column.ceiling < 0) column.skylight = false;
  if (column.solid || column.ceiling < 0) column.skyOpening = false;
  return column;
}

export function roomAtPosition(position) {
  return roomState(Math.floor(position.x / 15), Math.floor(position.z / 15));
}

// Keep the original arrival pool and approximately one third of the original
// six layouts. New archetypes are inserted into the same room/corridor lattice.
export function usesRoomArchetype(moduleX, moduleZ) {
  if (moduleX === 0 && moduleZ === 0) return false;
  if (moduleX === 3 && moduleZ === 0) return true;
  if (mod(moduleX, 2) || mod(moduleZ, 2)) return false;
  return opening.has(`${moduleX}:${moduleZ}`) || seedHash(moduleX + 71, moduleZ - 19) % 3 !== 0;
}

export function referenceRoomColumn(ix, iz) {
  return usesRoomArchetype(Math.floor(ix / 15), Math.floor(iz / 15))
    ? environmentColumn(ix, iz) : null;
}

export function referenceLightingPreset(moduleX, moduleZ) {
  // The familiar entrance keeps its cool poolroom light.
  if (moduleX === 0 && moduleZ === 0) return 'cyan';
  if (usesRoomArchetype(moduleX, moduleZ)) return roomState(moduleX, moduleZ).lightingPreset;
  if (mod(moduleX, 2) || mod(moduleZ, 2)) return 'sparse';
  return ['cyan', 'warm', 'skylight', 'dim', 'spa', 'cyan'][seedHash(moduleX, moduleZ) % 6];
}

export function isReferenceCorridor(moduleX, moduleZ) {
  if (moduleX === 3 && moduleZ === 0) return false; // Part of the six-exit broad hall.
  return Boolean(mod(moduleX, 2)) !== Boolean(mod(moduleZ, 2));
}
