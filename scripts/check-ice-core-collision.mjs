import assert from 'node:assert/strict';
import { ICE_LAYOUT } from '../src/ice-pool/ice-progression.js';
import { collidesWithIceCore, ICE_CORE_RADIUS } from '../src/ice-pool/ice-core-collision.js';
import { hasClearEvidencePath } from '../src/ice-pool/ice-interaction.js';
import { referenceRoomColumn } from '../src/ice-pool/environment/RoomArchetypes.js';

const { x, z } = ICE_LAYOUT.core;
const playerRadius = .27;
const edge = ICE_CORE_RADIUS + playerRadius;
assert.equal(collidesWithIceCore(x, z, playerRadius), true);
for (let i = 0; i < 32; i++) {
  const angle = i * Math.PI / 16, dx = Math.cos(angle), dz = Math.sin(angle);
  const from = { x: x + dx * (edge + .15), z: z + dz * (edge + .15) };
  assert.equal(collidesWithIceCore(x + dx * (edge - .01), z + dz * (edge - .01), playerRadius, from), true,
    'All sides stop the player before entering the crystal');
  assert.equal(collidesWithIceCore(x + dx * (edge + .01), z + dz * (edge + .01), playerRadius), false,
    'The player can walk around the outside');
  assert.equal(collidesWithIceCore(x - dx * (edge + .15), z - dz * (edge + .15), playerRadius, from), true,
    'A large movement step cannot tunnel through the core');
}
assert.equal(collidesWithIceCore(x + .4, z, playerRadius, { x, z }), false,
  'Old positions inside the core can move out');
assert.equal(collidesWithIceCore(x + .2, z, playerRadius, { x: x + .4, z }), true,
  'An old inside position cannot move further inward');
const approach = { x, y: 1.7, z: z - edge - .1 };
assert.equal(collidesWithIceCore(approach.x, approach.z, playerRadius), false);
assert.equal(hasClearEvidencePath(approach, ICE_LAYOUT.core, 3.8, referenceRoomColumn), true,
  'Core interaction remains reachable from outside the collision volume');
assert.equal(collidesWithIceCore(ICE_LAYOUT.note.x, ICE_LAYOUT.note.z, playerRadius), false,
  'Other evidence and corridors remain unaffected');
console.log('Core collision OK: all sides, walk-around clearance, swept movement, old-position escape and reachable interaction.');
