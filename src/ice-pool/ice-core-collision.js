import { ICE_LAYOUT } from './ice-progression.js';

// A stationary cylinder encloses the 1.15m crystal half-width, its gentle
// rotation and the 1.145m base ring. Player radius is added by the caller.
export const ICE_CORE_RADIUS = 1.2;

export function collidesWithIceCore(x, z, playerRadius = .27, from) {
  const center = ICE_LAYOUT.core;
  const boundarySquared = (ICE_CORE_RADIUS + playerRadius) ** 2;
  const dx = x - center.x, dz = z - center.z;
  const destinationSquared = dx * dx + dz * dz;
  if (!from) return destinationSquared < boundarySquared;
  const ax = from.x - center.x, az = from.z - center.z;
  const originSquared = ax * ax + az * az;
  // A pre-existing position inside the new collider may move outward to escape.
  if (originSquared < boundarySquared) return destinationSquared <= originSquared;
  const moveX = dx - ax, moveZ = dz - az;
  const lengthSquared = moveX * moveX + moveZ * moveZ;
  const t = lengthSquared ? Math.max(0, Math.min(1, -(ax * moveX + az * moveZ) / lengthSquared)) : 0;
  return (ax + moveX * t) ** 2 + (az + moveZ * t) ** 2 < boundarySquared;
}
