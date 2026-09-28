import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seedHash } from './EnvironmentConfig.js';

const DIRECTIONS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const PIPE_RADIUS = 0.026;
const ORIGIN_GIANT_MEMBERS = [[2, 0], [3, 0], [4, 0]];

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function roomTypeAt(moduleX, moduleZ, columnAt, moduleSize) {
  // The room metadata normally lives on every non-solid reference cell. Probe
  // a few interior cells so a room whose centre happens to be a pillar still
  // gets classified deterministically.
  for (const [x, z] of [[7, 7], [7, 6], [6, 7], [8, 7], [7, 8], [3, 3]]) {
    const cell = columnAt(moduleX * moduleSize + x, moduleZ * moduleSize + z);
    const type = cell?.room?.roomType ?? cell?.roomType;
    if (typeof type === 'string') return type;
  }
  return null;
}

function moduleClass(moduleX, moduleZ, columnAt, moduleSize) {
  const roomType = roomTypeAt(moduleX, moduleZ, columnAt, moduleSize);
  if (roomType === 'arched' || roomType === 'circular') return 'curved';
  if (roomType === 'giant') return 'giant';
  // A missing room metadata field is the legacy reference-map fallback. Its
  // even/even modules are still ordinary rooms; odd modules are corridors.
  return positiveModulo(moduleX, 2) === 0 && positiveModulo(moduleZ, 2) === 0
    ? 'ordinary' : 'other';
}

function isOriginGiantMember(moduleX, moduleZ) {
  return ORIGIN_GIANT_MEMBERS.some(([x, z]) => x === moduleX && z === moduleZ);
}

function giantMembers(moduleX, moduleZ) {
  return isOriginGiantMember(moduleX, moduleZ)
    ? ORIGIN_GIANT_MEMBERS
    : [[moduleX, moduleZ]];
}

function ordinaryRoomSelected(moduleX, moduleZ) {
  // The hash is derived only from the room's module coordinates, never from
  // load order or the current chunk. This gives a stable approximately 25%
  // selection rate without scanning neighbouring rooms on every chunk load.
  return seedHash(moduleX * 31 + 17, moduleZ * 37 - 11) % 4 === 0;
}

function ordinaryFixtureIsLadder(moduleX, moduleZ) {
  // Keep the arrival's familiar ladder, while distributing the two fixture
  // silhouettes across other selected rooms with an independent stable hash.
  if (moduleX === 0 && moduleZ === 0) return true;
  return seedHash(moduleX * 31 - 43, moduleZ * 37 + 59) % 2 === 0;
}

function candidateScore(candidate, targetX) {
  return targetX === undefined
    ? candidate.rank
    : Math.hypot(candidate.x - targetX, candidate.z - 3);
}

function sortCandidates(candidates, targetX) {
  return [...candidates].sort((a, b) => candidateScore(a, targetX) - candidateScore(b, targetX));
}

function chooseFixture(candidates, targetX, preferLadder = true) {
  const ordered = sortCandidates(candidates, targetX);
  const ladder = ordered.find(candidate => candidate.drop >= 0.72);
  const chosen = preferLadder ? ladder ?? ordered[0] : ordered[0];
  return chosen ? [{ ...chosen, kind: preferLadder && chosen === ladder ? 'ladder' : 'handrail' }] : [];
}

function chooseLargeRoomFixtures(candidates) {
  const ordered = sortCandidates(candidates);
  if (!ordered.length) return [];
  const ladder = ordered.find(candidate => candidate.drop >= 0.72);
  const first = ladder ?? ordered[0];
  const result = [{ ...first, kind: ladder ? 'ladder' : 'handrail' }];
  const second = ordered.find(candidate => result.every(selected =>
    Math.hypot(candidate.x - selected.x, candidate.z - selected.z) >= 3.5));
  if (second) result.push({ ...second, kind: second.drop >= 0.72 ? 'ladder' : 'handrail' });
  return result;
}

// All dimensions are metres. Local +Z points into the pool, +X along its edge.
// These fittings use the existing shore-exit controller, not a second climbing
// mode or solid cell colliders (which would block the gap between the rails).
export function planPoolAccess(moduleX, moduleZ, columnAt, {
  moduleSize = 15, waterLevel = -0.12,
} = {}) {
  const type = moduleClass(moduleX, moduleZ, columnAt, moduleSize);
  if (type === 'other' || type === 'curved') return [];
  if (type === 'ordinary' && !ordinaryRoomSelected(moduleX, moduleZ)) return [];

  const members = type === 'giant' ? giantMembers(moduleX, moduleZ) : [[moduleX, moduleZ]];
  const candidates = [];
  for (const [memberX, memberZ] of members) {
    const memberType = moduleClass(memberX, memberZ, columnAt, moduleSize);
    // The three opening-hall modules are one room even though its middle
    // module has odd coordinates. Any other odd module remains a corridor.
    if (type !== 'giant' && memberType !== 'ordinary') continue;
    if (type === 'giant' && memberType !== 'giant' && !isOriginGiantMember(memberX, memberZ)) continue;
    const originX = memberX * moduleSize, originZ = memberZ * moduleSize;
    for (let z = 2; z < moduleSize - 2; z += 1) {
      for (let x = 2; x < moduleSize - 2; x += 1) {
        const cellX = originX + x, cellZ = originZ + z;
        const deck = columnAt(cellX, cellZ);
        if (!deck || deck.solid || deck.level < waterLevel + 0.06) continue;
        for (const [nx, nz] of DIRECTIONS) {
          const wet = columnAt(cellX + nx, cellZ + nz);
          if (!wet || wet.solid || wet.level > waterLevel - 0.35) continue;
          const edgeX = cellX + 0.5 + nx * 0.5;
          const edgeZ = cellZ + 0.5 + nz * 0.5;
          // Keep the straight doorway approaches (three cells wide) clear.
          const along = nx ? z : x;
          if (Math.abs(along - Math.floor(moduleSize / 2)) <= 1) continue;
          const sample = (u, v) => columnAt(
            Math.floor(edgeX + nz * u + nx * v),
            Math.floor(edgeZ - nx * u + nz * v),
          );
          let valid = true;
          let shallowestFloor = -Infinity;
          // Check the whole support/approach footprint, not only its centre tile.
          for (const u of [-0.88, 0, 0.88]) {
            for (const v of [-1.15, -0.2, 0.12, 0.65, 1.35]) {
              const cell = sample(u, v);
              if (!cell || cell.solid || cell.ceiling < deck.level + 2.1
                || (v < 0 ? Math.abs(cell.level - deck.level) > 0.025
                  : cell.level > waterLevel - 0.12)) valid = false;
              if (v > 0 && cell) shallowestFloor = Math.max(shallowestFloor, cell.level);
            }
          }
          if (!valid) continue;
          candidates.push({
            id: `${memberX}:${memberZ}:${x}:${z}:${nx}:${nz}`,
            moduleX: memberX, moduleZ: memberZ, x: edgeX, y: deck.level, z: edgeZ, nx, nz,
            floor: shallowestFloor,
            drop: Math.min(1.65, deck.level - shallowestFloor - 0.12),
            rank: seedHash(cellX + nx * 97, cellZ + nz * 89),
          });
        }
      }
    }
  }

  const selected = type === 'giant'
    ? chooseLargeRoomFixtures(candidates)
    : chooseFixture(candidates, moduleX === 0 && moduleZ === 0 ? 10.5 : undefined,
      ordinaryFixtureIsLadder(moduleX, moduleZ));
  // A giant group is planned globally, then each module returns only the
  // fittings physically owned by that module. This prevents the 43m opening
  // hall from getting a fresh pair every time another chunk is streamed.
  return selected.filter(fixture => fixture.moduleX === moduleX && fixture.moduleZ === moduleZ);
}

/**
 * Bounded cache for an immutable procedural map. A 15m room can overlap as many
 * as four 16m chunks, so chunk streaming must not rescan the same room for every
 * owner candidate. Keep this opt-in because standalone callers may edit cells.
 */
export class PoolAccessPlanCache {
  constructor(columnAt, options = {}, maxRooms = 64) {
    this.columnAt = columnAt;
    this.options = options;
    this.maxRooms = Math.max(1, Math.floor(maxRooms));
    this.rooms = new Map();
  }

  get(moduleX, moduleZ) {
    const key = `${moduleX}:${moduleZ}`;
    let fixtures = this.rooms.get(key);
    if (fixtures) {
      this.rooms.delete(key);
      this.rooms.set(key, fixtures);
      return fixtures;
    }
    fixtures = planPoolAccess(moduleX, moduleZ, this.columnAt, this.options);
    this.rooms.set(key, fixtures);
    if (this.rooms.size > this.maxRooms) this.rooms.delete(this.rooms.keys().next().value);
    return fixtures;
  }

  clear() {
    this.rooms.clear();
  }
}

function addBox(parts, width, height, depth, x, y, z) {
  parts.push(new THREE.BoxGeometry(width, height, depth).translate(x, y, z));
}

function addFoot(parts, gripParts, x, z) {
  parts.push(new THREE.CylinderGeometry(0.095, 0.105, 0.024, 16).translate(x, 0.018, z));
  parts.push(new THREE.CylinderGeometry(0.044, 0.05, 0.065, 12).translate(x, 0.055, z));
  gripParts.push(new THREE.CylinderGeometry(0.106, 0.106, 0.008, 16).translate(x, 0.005, z));
  for (const dx of [-0.065, 0.065]) {
    parts.push(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 6).translate(x + dx, 0.035, z));
  }
}

function railPath(x, commands) {
  const path = new THREE.CurvePath();
  let previous;
  for (const command of commands) {
    const endpoint = new THREE.Vector3(x, command.at(-2), command.at(-1));
    if (previous) {
      path.add(command.length === 2
        ? new THREE.LineCurve3(previous, endpoint)
        : new THREE.QuadraticBezierCurve3(previous,
          new THREE.Vector3(x, command[0], command[1]), endpoint));
    }
    previous = endpoint;
  }
  return new THREE.TubeGeometry(path, 56, PIPE_RADIUS, 10, false);
}

function fixtureParts(fixture) {
  const metal = [], grips = [];
  if (fixture.kind === 'ladder') {
    for (const x of [-0.45, 0.45]) {
      metal.push(railPath(x, [
        [0.045, -0.66], [0.76, -0.66], [1.08, -0.66, 1.08, -0.34],
        [1.08, -0.02], [1.08, 0.3, 0.76, 0.3],
        [-fixture.drop + 0.12, 0.3],
        [-fixture.drop, 0.3, -fixture.drop, 0.18], [-fixture.drop, 0.075],
      ]));
      addFoot(metal, grips, x, -0.66);
      // Rubber wall standoffs keep the bent tube ends out of the tile wall.
      const bumper = new THREE.CylinderGeometry(0.057, 0.057, 0.06, 12);
      bumper.rotateX(Math.PI / 2).translate(x, -fixture.drop, 0.045);
      grips.push(bumper);
    }
    for (let y = -0.26; y >= -fixture.drop + 0.1; y -= 0.28) {
      addBox(metal, 0.94, 0.045, 0.2, 0, y, 0.3);
      addBox(grips, 0.79, 0.012, 0.148, 0, y + 0.027, 0.3);
      // Three narrow raised ridges read as non-slip treads, not flat black bars.
      for (const z of [0.25, 0.3, 0.35]) {
        addBox(grips, 0.77, 0.008, 0.008, 0, y + 0.035, z);
      }
    }
  } else {
    // Deck-mounted figure-four grab rails: both feet are on verified dry tile.
    // The rounded nose reaches over the water without a fictitious submerged
    // support, stair or change to the actual pool floor.
    for (const x of [-0.68, 0.68]) {
      metal.push(railPath(x, [
        [0.045, -0.78], [0.67, -0.78], [0.94, -0.78, 0.94, -0.5],
        [0.94, 0.18], [0.94, 0.5, 0.64, 0.5],
        [0.45, 0.5, 0.42, 0.25], [0.25, -0.2],
        [0.2, -0.28, 0.045, -0.28],
      ]));
      addFoot(metal, grips, x, -0.78);
      addFoot(metal, grips, x, -0.28);
    }
  }
  const transform = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(fixture.nz, 0, -fixture.nx), new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(fixture.nx, 0, fixture.nz),
  ).setPosition(fixture.x, fixture.y, fixture.z);
  for (const geometry of [...metal, ...grips]) geometry.applyMatrix4(transform);
  return { metal, grips };
}

export function addChunkPoolAccess(group, chunkX, chunkZ, columnAt, {
  chunkSize = 16, moduleSize = 15, waterLevel = -0.12, planCache = null,
} = {}) {
  const minX = chunkX * chunkSize, minZ = chunkZ * chunkSize;
  const maxX = minX + chunkSize, maxZ = minZ + chunkSize;
  const fixtures = [];
  for (let mz = Math.floor(minZ / moduleSize); mz <= Math.floor((maxZ - 1) / moduleSize); mz++) {
    for (let mx = Math.floor(minX / moduleSize); mx <= Math.floor((maxX - 1) / moduleSize); mx++) {
      const planned = planCache?.get(mx, mz)
        ?? planPoolAccess(mx, mz, columnAt, { moduleSize, waterLevel });
      for (const fixture of planned) {
        // Half-open ownership also works on negative coordinates and exact seams.
        if (fixture.x >= minX && fixture.x < maxX && fixture.z >= minZ && fixture.z < maxZ) {
          fixtures.push(fixture);
        }
      }
    }
  }
  group.userData.poolAccess = fixtures;
  if (!fixtures.length) return;
  const parts = { metal: [], grips: [] };
  for (const fixture of fixtures) {
    const assembled = fixtureParts(fixture);
    parts.metal.push(...assembled.metal);
    parts.grips.push(...assembled.grips);
  }
  // Two opaque draws per populated chunk; no lights, reflection captures,
  // textures, per-frame updates or permanent geometry caches are added.
  const materials = {
    metal: new THREE.MeshStandardMaterial({ color: 0xd6dfe2, metalness: 0.78, roughness: 0.24 }),
    grips: new THREE.MeshStandardMaterial({ color: 0x283638, metalness: 0.08, roughness: 0.82 }),
  };
  group.userData.geometries ??= [];
  group.userData.materials ??= [];
  for (const key of ['metal', 'grips']) {
    const geometry = mergeGeometries(parts[key]);
    parts[key].forEach(part => part.dispose());
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, materials[key]);
    mesh.name = `PoolAccess_${key}`;
    mesh.userData.poolAccessFixture = true;
    group.add(mesh);
    group.userData.geometries.push(geometry);
    group.userData.materials.push(materials[key]);
  }
}
