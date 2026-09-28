// Shared by the mesh builder, terrain queries and player collision. Metres, not
// rounded grid coordinates: a circular layout test alone does not make a curve.
export const CURVED_ROOM = Object.freeze({
  size: 15, center: 7.5, poolRadius: 4.65, wallRadius: 6.4,
  doorHalfWidth: 1.5, doorHeight: 3.6,
  archRadius: 4.5, archRise: 3, archSpring: 2.8,
  archStarts: Object.freeze([4, 7, 10]),
});

export function isCurvedRoom(room) {
  return room?.roomType === 'circular' || room?.roomType === 'arched';
}

export function archHeight(localX) {
  const x = (localX - CURVED_ROOM.center) / CURVED_ROOM.archRadius;
  return CURVED_ROOM.archSpring + CURVED_ROOM.archRise * Math.sqrt(Math.max(0, 1 - x * x));
}

export function curvedRoomColumn(room, x, z) {
  if (!isCurvedRoom(room)) return null;
  const dx = Math.abs(x - 7.5), dz = Math.abs(z - 7.5);
  const column = { solid: false, level: 0, ceiling: room.ceilingHeight, skylight: false, room };
  const edgeX = x < 1 || x >= 14, edgeZ = z < 1 || z >= 14;
  if (edgeX || edgeZ) {
    column.solid = (edgeX ? dz : dx) > 1.5;
    if (!column.solid) column.ceiling = CURVED_ROOM.doorHeight;
    return column;
  }
  if (room.roomType === 'circular') {
    const radius = Math.hypot(dx, dz);
    column.solid = radius > CURVED_ROOM.wallRadius && dx > 1.5 && dz > 1.5;
    column.level = radius < CURVED_ROOM.poolRadius ? -room.poolDepth : 0;
    const throat = Math.sqrt(CURVED_ROOM.wallRadius ** 2 - 1.5 ** 2);
    if ((dx <= 1.5 && dz >= throat) || (dz <= 1.5 && dx >= throat)) {
      column.ceiling = CURVED_ROOM.doorHeight;
    }
  } else {
    column.level = dx < room.halfWidth + 0.5 && dz < room.halfLength + 0.5 ? -room.poolDepth : 0;
    if (CURVED_ROOM.archStarts.some(start => z >= start && z < start + 1)) {
      if ((x >= 2 && x < 3) || (x >= 12 && x < 13)) column.solid = true;
      else if (x >= 3 && x <= 12) column.ceiling = archHeight(x);
    }
  }
  // Keep the established four ceiling fixtures on the unmodified high ceiling,
  // clear of the masonry arch bands and round room's doorway soffits.
  column.skylight = !column.solid && column.ceiling === room.ceilingHeight
    && (Math.floor(x) === 4 || Math.floor(x) === 10)
    && (Math.floor(z) === 5 || Math.floor(z) === 11);
  return column;
}
