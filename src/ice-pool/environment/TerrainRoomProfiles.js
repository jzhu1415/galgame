// Deterministic terrain-room profiles.  The profile owns only local geometry
// classification; RoomArchetypes supplies the seeded room state and the map
// builder/physics consume the same returned column shape.

export const TERRAIN_ROOM_TYPES = Object.freeze([
  'islandPool', 'bridgePool', 'terracedPool', 'crossCanal', 'peninsulaPool',
]);

export const TERRAIN_ROOM_SETTINGS = Object.freeze({
  islandPool: Object.freeze({ theme: 'sky', depth: 2.1, ceiling: 8.2 }),
  bridgePool: Object.freeze({ theme: 'blue', depth: 2.25, ceiling: 7.2 }),
  terracedPool: Object.freeze({ theme: 'blue', depth: 1.45, ceiling: 8.6 }),
  crossCanal: Object.freeze({ theme: 'blue', depth: 1.55, ceiling: 6.6 }),
  peninsulaPool: Object.freeze({ theme: 'green', depth: 2.0, ceiling: 7.6 }),
});

const CENTER = 7.5;
const DOOR_HALF_WIDTH = 1.5;
const ROOM_EDGE = 1;

const isDoor = (localX, localZ) => {
  const edgeX = localX < ROOM_EDGE || localX >= 15 - ROOM_EDGE;
  const edgeZ = localZ < ROOM_EDGE || localZ >= 15 - ROOM_EDGE;
  if (!edgeX && !edgeZ) return false;
  const cross = edgeX ? localZ : localX;
  return Math.abs(cross - CENTER) <= DOOR_HALF_WIDTH;
};

const isBoundary = (localX, localZ) => localX < ROOM_EDGE || localX >= 15 - ROOM_EDGE
  || localZ < ROOM_EDGE || localZ >= 15 - ROOM_EDGE;

const isInsideBasin = (localX, localZ) => {
  const dx = Math.abs(localX - CENTER);
  const dz = Math.abs(localZ - CENTER);
  return dx <= 5 && dz <= 5;
};

const isCardinalLane = (localX, localZ) => {
  const dx = Math.abs(localX - CENTER);
  const dz = Math.abs(localZ - CENTER);
  return dx < 1 || dz < 1;
};

function terraceLevel(room, localX, localZ) {
  const distance = Math.max(Math.abs(localX - CENTER), Math.abs(localZ - CENTER));
  if (distance > 5) return 0;
  // Six concentric shelves descend in 16cm increments. The outer shelf is
  // deep enough for a submerged wall fixture without becoming a tall drop.
  const ring = Math.min(5, Math.ceil(distance));
  return -Math.min(room.poolDepth, 0.65 + (5 - ring) * 0.16);
}

function skylightFor(type, localX, localZ, solid) {
  if (solid) return false;
  const dx = Math.abs(localX - CENTER);
  const dz = Math.abs(localZ - CENTER);
  if (type === 'crossCanal') {
    return (Math.floor(localX) === 4 || Math.floor(localX) === 10) && Math.floor(localZ) === 7
      || (Math.floor(localZ) === 4 || Math.floor(localZ) === 10) && Math.floor(localX) === 7;
  }
  return (Math.floor(localX) === 4 || Math.floor(localX) === 10)
    && (Math.floor(localZ) === 4 || Math.floor(localZ) === 10);
}

/**
 * Return a production column for one terrain room's local metre coordinate.
 * Coordinates are sampled at cell centres by RoomArchetypes, but the function
 * also accepts arbitrary local positions for deterministic profile queries.
 * `null` means this profile does not own the room type.
 */
export function terrainRoomColumn(room, localX, localZ) {
  if (!room || !TERRAIN_ROOM_SETTINGS[room.roomType]) return null;
  const { roomType } = room;
  const column = {
    solid: false,
    level: 0,
    ceiling: room.ceilingHeight,
    skylight: false,
    room,
  };

  // Keep all four three-metre portals dry and open.  Interior terrain may
  // meet the threshold, but the door cell itself remains a walkable landing.
  if (isBoundary(localX, localZ)) {
    column.solid = !isDoor(localX, localZ);
    if (!column.solid) column.ceiling = 3.6;
    return column;
  }

  const dx = Math.abs(localX - CENTER);
  const dz = Math.abs(localZ - CENTER);
  const basin = isInsideBasin(localX, localZ);

  if (roomType === 'islandPool') {
    const island = Math.hypot(localX - CENTER, localZ - CENTER) <= 2.15;
    column.level = basin && !island ? -room.poolDepth : 0;
  } else if (roomType === 'bridgePool') {
    // A one-cell east/west dry bridge separates north and south water basins.
    const bridge = Math.floor(localZ) === 7;
    column.level = basin && !bridge ? -room.poolDepth : 0;
  } else if (roomType === 'terracedPool') {
    column.level = terraceLevel(room, localX, localZ);
  } else if (roomType === 'crossCanal') {
    column.level = basin && isCardinalLane(localX, localZ) ? -room.poolDepth : 0;
  } else if (roomType === 'peninsulaPool') {
    // Water fills the interior except for a dry western peninsula reaching
    // into the pool.  The shore joins the west doorway landing.
    const peninsula = localX <= CENTER + 1 && localX >= 1.5 && dz <= 1.25;
    column.level = basin && !peninsula ? -room.poolDepth : 0;
  }

  column.skylight = skylightFor(roomType, localX, localZ, column.solid);
  return column;
}

export function isTerrainRoom(room) {
  return Boolean(room && TERRAIN_ROOM_SETTINGS[room.roomType]);
}
