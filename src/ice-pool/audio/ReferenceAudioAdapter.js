import { isReferenceCorridor } from '../environment/RoomArchetypes.js';

const presets = {
  giant: 'LARGE_POOL_HALL', tall: 'LARGE_POOL_HALL', columns: 'LARGE_POOL_HALL',
  deep: 'DEEP_CHAMBER', submerged: 'DEEP_CHAMBER',
  longCorridor: 'LONG_CORRIDOR', waterCorridor: 'LONG_CORRIDOR',
  low: 'SMALL_TILE', spa: 'SMALL_TILE',
};

export function describeAudioRoom(column, moduleX, moduleZ) {
  // `column.room` is present only for archetypes actually used by this map.
  // Do not call roomState indiscriminately: the arrival/legacy rooms differ.
  const type = column.room?.roomType
    ?? (isReferenceCorridor(moduleX, moduleZ) ? 'longCorridor' : 'pool');
  return {
    id: `${moduleX}:${moduleZ}`, moduleX, moduleZ, type,
    reverb: presets[type] ?? 'POOL_ROOM',
    ambience: type === 'dark' || type === 'rest' ? 0.28 : type === 'giant' ? 0.55 : 1,
    hum: type === 'dark' ? 0.15 : type === 'skylight' ? 0.25 : 1,
  };
}

// This adapter consumes values already calculated by updatePlayer. It never
// performs water detection, raycasts materials, or controls the player.
export function createPlayerAudioSnapshot({ position, velocity, verticalVelocity, impactVelocity,
  baseEyeHeight, eyeHeight, waterLevel, playerState, currentRoom, moving, paused }) {
  const { waterDepth, inWaterColumn, nowSwimming, nowWading, grounded, sprinting } = playerState;
  const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
  return {
    position: { x: position.x, y: position.y, z: position.z },
    velocity: { x: velocity.x, y: verticalVelocity, z: velocity.z },
    horizontalSpeed, speed: Math.hypot(horizontalSpeed, verticalVelocity),
    verticalVelocity, impactVelocity, baseEyeHeight, grounded, moving, paused,
    waterDepth: Math.max(0, waterDepth), inWaterColumn, waterLevel,
    // Shallow grounded feet follow the real floor, even while camera height eases.
    // An airborne body over a deep pool isn't wet until the controller enters swim.
    inWater: nowSwimming || (nowWading && (grounded || baseEyeHeight - eyeHeight < waterLevel)),
    isSwimming: nowSwimming, running: sprinting, headUnderwater: false, currentRoom,
  };
}

// Fixed local fixture candidates, validated against the existing cached columns.
// Only nearby modules are enumerated, only when the module window changes. These
// are source placements, NOT a second player water-depth detection system.
const WATER_POINTS = [[4, 5], [10, 9], [7, 4], [4, 10], [10, 4], [7, 10]];
export function createReferenceAudioEnvironment({ columnAt, moduleSize, waterLevel }) {
  let previousKey = '';
  let points = [];
  return (state, distance) => {
    const mx = Math.floor(state.position.x / moduleSize);
    const mz = Math.floor(state.position.z / moduleSize);
    const radius = Math.min(4, Math.ceil(distance / moduleSize));
    const key = `${mx}:${mz}:${radius}`;
    if (key === previousKey) return points;
    previousKey = key;
    points = [];
    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const roomX = mx + dx, roomZ = mz + dz;
        // No sources in solid diagonal modules or narrow dry connectors.
        if (isReferenceCorridor(roomX, roomZ) || (Math.abs(roomX % 2) && Math.abs(roomZ % 2))) continue;
        const valid = [];
        for (const [x, z] of WATER_POINTS) {
          const worldX = roomX * moduleSize + x;
          const worldZ = roomZ * moduleSize + z;
          const column = columnAt(worldX, worldZ);
          if (column.solid || column.level >= waterLevel - 0.08 || column.ceiling < waterLevel + 0.3) continue;
          valid.push({ x: worldX + 0.5, y: waterLevel + 0.08, z: worldZ + 0.5 });
          if (valid.length === 2) break;
        }
        if (!valid.length) continue;
        const roomId = `${roomX}:${roomZ}`;
        points.push({ id: `${roomId}:water`, roomId, kind: 'water', position: valid[0] });
        points.push({ id: `${roomId}:drip`, roomId, kind: 'drip', position: valid.at(-1) });
      }
    }
    return points;
  };
}
