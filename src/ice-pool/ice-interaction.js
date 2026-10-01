import { referenceRoomColumn } from './environment/RoomArchetypes.js';

// Match the Pool world's wall columns, including their floor and ceiling.
// Sampling the short interaction ray prevents inspecting through a corner.
export function hasClearEvidencePath(from, to, range = 3.8, columnAt = referenceRoomColumn) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  if (distance > range) return false;
  const samples = Math.max(1, Math.ceil(distance / .15));
  for (let step = 1; step < samples; step += 1) {
    const t = step / samples;
    const x = from.x + (to.x - from.x) * t;
    const z = from.z + (to.z - from.z) * t;
    const y = from.y + (to.y - from.y) * t;
    const column = columnAt(Math.floor(x), Math.floor(z));
    if (column && (column.solid || y < column.level || y > column.ceiling)) return false;
  }
  return true;
}
