import assert from 'node:assert/strict';
import { ROUTE_POINTS } from '../src/ice-pool/ice-chapter-layer.js';
import { referenceRoomColumn } from '../src/ice-pool/environment/RoomArchetypes.js';

const playerRadius = 0.3;

assert.equal(ROUTE_POINTS.length, 2);
for (const [routeIndex, points] of ROUTE_POINTS.entries()) {
  assert.equal(points.length, 5, `Route ${routeIndex + 1} needs a start and four marks`);
  for (let leg = 0; leg < 4; leg += 1) {
    const [startX, startZ] = points[leg];
    const [endX, endZ] = points[leg + 1];
    const [directionX, directionZ] = [0, 1];
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
          const walkable = column ? !column.solid && column.ceiling >= 2 && column.level >= -.2
            : Math.floor((z + offsetZ) / 15) % 2 === 1 && Math.floor(x + offsetX) >= 6 && Math.floor(x + offsetX) <= 8;
          assert.ok(walkable,
            `Route ${routeIndex + 1}, leg ${leg + 1} enters blocked or submerged tile at ${x.toFixed(2)}, ${z.toFixed(2)}`);
        }
      }
    }
  }
}

for (const points of ROUTE_POINTS) {
  assert.ok(points.at(-1)[1] - points[0][1] >= 25, 'Each passage must cross multiple spaces without doubling back');
  assert.ok(new Set(points.map(([, z]) => Math.floor(z / 15))).size >= 3, 'Checkpoints cannot all sit in one room');
}

// Check the door-to-door journey as well as the puzzles inside each room.
const connectingPath = [
  ROUTE_POINTS[0][4], [7.5, ROUTE_POINTS[0][4][1]],
  [7.5, ROUTE_POINTS[1][0][1]], ROUTE_POINTS[1][0],
];
const finalPath = [ROUTE_POINTS[1][4], [7.5, ROUTE_POINTS[1][4][1]], [7.5, 97.5]];
for (const path of [connectingPath, finalPath]) {
  for (let leg = 0; leg < path.length - 1; leg += 1) {
    const [ax, az] = path[leg]; const [bx, bz] = path[leg + 1];
    const samples = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / .2));
    for (let step = 0; step <= samples; step += 1) {
      const x = ax + (bx - ax) * step / samples;
      const z = az + (bz - az) * step / samples;
      for (const dx of [-playerRadius, playerRadius]) for (const dz of [-playerRadius, playerRadius]) {
        const ix = Math.floor(x + dx), iz = Math.floor(z + dz);
        const column = referenceRoomColumn(ix, iz);
        if (column) assert.ok(!column.solid && column.level >= -.2 && column.ceiling >= 2,
          `Room connection blocked at ${ix}, ${iz}`);
        else assert.ok(Math.floor(iz / 15) % 2 === 1 && ix >= 6 && ix <= 8,
          `Journey leaves the original north corridor at ${ix}, ${iz}`);
      }
    }
  }
}
console.log('Ice routes OK: both passages advance north across several spaces; all doorways and the journey to the core stay walkable.');
