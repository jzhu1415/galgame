import assert from 'node:assert/strict';
import { ROUTE_POINTS } from '../src/ice-pool/ice-chapter-layer.js';
import { referenceRoomColumn } from '../src/ice-pool/environment/RoomArchetypes.js';

const directions = [
  [[0, 1], [-1, 0], [0, 1], [-1, 0]],
  [[1, 0], [0, 1], [1, 0], [0, 1]],
];
const playerRadius = 0.3;

assert.equal(ROUTE_POINTS.length, 2);
for (const [routeIndex, points] of ROUTE_POINTS.entries()) {
  assert.equal(points.length, 5, `Route ${routeIndex + 1} needs a start and four marks`);
  for (let leg = 0; leg < 4; leg += 1) {
    const [startX, startZ] = points[leg];
    const [endX, endZ] = points[leg + 1];
    const [directionX, directionZ] = directions[routeIndex][leg];
    assert.equal(Math.sign(endX - startX), directionX, `Route ${routeIndex + 1}, leg ${leg + 1}: X direction`);
    assert.equal(Math.sign(endZ - startZ), directionZ, `Route ${routeIndex + 1}, leg ${leg + 1}: Z direction`);
    const samples = Math.ceil(Math.hypot(endX - startX, endZ - startZ) / 0.2);
    for (let sample = 0; sample <= samples; sample += 1) {
      const progress = sample / samples;
      const x = startX + (endX - startX) * progress;
      const z = startZ + (endZ - startZ) * progress;
      for (const offsetX of [-playerRadius, playerRadius]) {
        for (const offsetZ of [-playerRadius, playerRadius]) {
          const column = referenceRoomColumn(Math.floor(x + offsetX), Math.floor(z + offsetZ));
          assert.ok(column && !column.solid && column.ceiling >= 2 && column.level >= -0.2,
            `Route ${routeIndex + 1}, leg ${leg + 1} enters blocked or submerged tile at ${x.toFixed(2)}, ${z.toFixed(2)}`);
        }
      }
    }
  }
}

console.log('Ice routes OK: both four-step paths stay on dry, walkable floor.');
