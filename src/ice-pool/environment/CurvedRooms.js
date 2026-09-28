import * as THREE from 'three';
import { roomState, usesRoomArchetype } from './RoomArchetypes.js';
import { CURVED_ROOM as C, archHeight, curvedRoomColumn, isCurvedRoom } from './CurvedRoomProfiles.js';

export function referenceCurvedRoom(x, z) {
  const mx = Math.floor(x / C.size), mz = Math.floor(z / C.size);
  if (!usesRoomArchetype(mx, mz)) return null;
  const room = roomState(mx, mz);
  return isCurvedRoom(room) ? room : null;
}

export function sampleCurvedRoom(x, z) {
  const room = referenceCurvedRoom(x, z);
  return room ? curvedRoomColumn(room, x - room.moduleX * C.size, z - room.moduleZ * C.size) : null;
}

export function curvedPoolBounds(x, z) {
  const room = referenceCurvedRoom(x, z);
  if (room?.roomType !== 'circular') return null;
  const cx = room.moduleX * 15 + 7.5, cz = room.moduleZ * 15 + 7.5;
  return new THREE.Vector4(cx - C.poolRadius, cz - C.poolRadius, cx + C.poolRadius, cz + C.poolRadius);
}

export function curvedPoolWall(x, z) {
  const room = referenceCurvedRoom(x, z);
  if (room?.roomType !== 'circular') return null;
  const dx = x - room.moduleX * 15 - 7.5, dz = z - room.moduleZ * 15 - 7.5;
  const radius = Math.hypot(dx, dz);
  const normalX = radius > 1e-8 ? dx / radius : 1, normalZ = radius > 1e-8 ? dz / radius : 0;
  return { axis: 'radial', normalX, normalZ, distance: Math.max(0, C.poolRadius - radius) };
}

// Return null outside curved rooms so all existing grid movement stays intact.
export function curvedRoomCollision(x, z, { fromX, fromZ, eyeY, grounded, swimming,
  allowShoreExit, sampleFallback, waterLevel = -0.12, eyeHeight = 1.7, radius = 0.27 }) {
  if (!referenceCurvedRoom(x, z) && !referenceCurvedRoom(fromX, fromZ)) return null;
  const sample = (px, pz) => sampleCurvedRoom(px, pz) ?? sampleFallback(Math.floor(px), Math.floor(pz));
  const current = sample(fromX, fromZ);
  const bodyFloor = grounded ? current.level : eyeY - (swimming ? 0.38 : eyeHeight);
  const oldRoom = referenceCurvedRoom(fromX, fromZ);
  const inwardOrTangent = oldRoom?.roomType === 'circular'
    && Math.hypot(x - oldRoom.moduleX * 15 - 7.5, z - oldRoom.moduleZ * 15 - 7.5)
      <= Math.hypot(fromX - oldRoom.moduleX * 15 - 7.5, fromZ - oldRoom.moduleZ * 15 - 7.5) + 1e-8;
  for (let i = 0; i < 17; i++) {
    const angle = i * Math.PI / 8;
    const px = x + (i === 16 ? 0 : Math.cos(angle) * radius);
    const pz = z + (i === 16 ? 0 : Math.sin(angle) * radius);
    const cell = sample(px, pz);
    if (cell.solid || cell.ceiling < eyeY + 0.12) return true;
    if (cell.level <= current.level + 0.001 || cell.level <= bodyFloor + (grounded ? 0.18 : 0.015)) continue;
    if (allowShoreExit && waterLevel - cell.level < 1.2 && cell.level <= waterLevel + 0.5
      && cell.ceiling >= cell.level + eyeHeight + 0.12) continue;
    // A submerged swimmer already touching the round bank can slide inward;
    // never lift them through the deck just because its centre sample is dry.
    if (inwardOrTangent) continue;
    return true;
  }
  return false;
}

const SEGMENTS = 128;
function output() { return { position: [], normal: [], uv: [], color: [] }; }
function vertex(p, n, uv, shade = 0.94) { return [...p, ...n, ...uv, shade]; }

// Clip actual polygons, not whole rooms or triangle centres: every loaded chunk
// owns its portion, with no missing slivers when a curve crosses a chunk seam.
function clip(vertices, axis, limit, sign) {
  const result = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    const da = (a[axis] - limit) * sign, db = (b[axis] - limit) * sign;
    if (da >= -1e-9) result.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      result.push(a.map((value, j) => value + (b[j] - value) * t));
    }
  }
  return result;
}

function polygon(target, vertices, bounds) {
  let points = vertices;
  for (const [axis, limit, sign] of [[0, bounds.minX, 1], [0, bounds.maxX, -1],
    [2, bounds.minZ, 1], [2, bounds.maxZ, -1]]) {
    points = clip(points, axis, limit, sign);
    if (points.length < 3) return;
  }
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[0];
    let b = points[i], c = points[i + 1];
    const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    if (ab.cross(ac).lengthSq() < 1e-16) continue;
    if (ab.x * (a[3] + b[3] + c[3]) + ab.y * (a[4] + b[4] + c[4])
      + ab.z * (a[5] + b[5] + c[5]) < 0) [b, c] = [c, b];
    for (const p of [a, b, c]) {
      target.position.push(p[0], p[1], p[2]);
      const length = Math.hypot(p[3], p[4], p[5]);
      target.normal.push(p[3] / length, p[4] / length, p[5] / length);
      target.uv.push(p[6], p[7]);
      target.color.push(p[8], p[8], p[8]);
    }
  }
}

function roomBuilder(room, bounds, floors, walls) {
  const ox = room.moduleX * 15, oz = room.moduleZ * 15, height = room.ceilingHeight;
  const emit = (target, points, normals, uvs) => polygon(target, points.map((p, i) =>
    vertex([p[0] + ox, p[1], p[2] + oz], normals[i] ?? normals[0],
      uvs?.[i] ?? [(p[0] + ox) * 0.5, (p[2] + oz) * 0.5])), bounds);
  const flat = (x0, z0, x1, z1, y, down = false) => emit(down ? walls : floors,
    [[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]], [[0, down ? -1 : 1, 0]]);
  const wall = (a, b, bottom, top, normal) => emit(walls,
    [[a[0], bottom, a[1]], [b[0], bottom, b[1]], [b[0], top, b[1]], [a[0], top, a[1]]],
    [normal], [[0, bottom * 0.5], [Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.5, bottom * 0.5],
      [Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.5, top * 0.5], [0, top * 0.5]]);
  const rotate = (point, side) => {
    let [x, z] = point;
    for (let i = 0; i < side; i++) [x, z] = [15 - z, x];
    return [x, z];
  };
  // Four unchanged 3m passages connect to the existing corridor lattice.
  for (let side = 0; side < 4; side++) {
    const n2 = rotate([7.5, 8.5], side), n = [n2[0] - 7.5, 0, n2[1] - 7.5];
    for (const [a, b] of [[[1, 1], [6, 1]], [[9, 1], [14, 1]]]) {
      wall(rotate(a, side), rotate(b, side), 0, height, n);
    }
    for (const v of [0, 1]) wall(rotate([6, v], side), rotate([9, v], side), 3.6, height, n);
    const throat = room.roomType === 'circular' ? 7.5 - Math.sqrt(C.wallRadius ** 2 - 1.5 ** 2) : 1;
    for (const u of [6, 9]) {
      const nd = rotate([u === 6 ? 8.5 : 6.5, 7.5], side);
      wall(rotate([u, 0], side), rotate([u, throat], side), 0, height, [nd[0] - 7.5, 0, nd[1] - 7.5]);
    }
    const corners = [[6, 0], [9, 0], [9, throat], [6, throat]].map(p => rotate(p, side));
    emit(walls, corners.map(p => [p[0], 3.6, p[1]]), [[0, -1, 0]]);
  }
  flat(0, 0, 15, 15, height, true);

  if (room.roomType === 'circular') {
    for (let i = 0; i < SEGMENTS; i++) {
      const a = i / SEGMENTS * Math.PI * 2, b = (i + 1) / SEGMENTS * Math.PI * 2;
      const radial = (t, r, y) => [7.5 + Math.cos(t) * r, y, 7.5 + Math.sin(t) * r];
      const outer = t => 7.5 / Math.max(Math.abs(Math.cos(t)), Math.abs(Math.sin(t)));
      emit(floors, [radial(a, C.poolRadius, 0), radial(a, outer(a), 0), radial(b, outer(b), 0),
        radial(b, C.poolRadius, 0)], [[0, 1, 0]]);
      emit(floors, [[7.5, -room.poolDepth, 7.5], radial(a, C.poolRadius, -room.poolDepth),
        radial(b, C.poolRadius, -room.poolDepth)], [[0, 1, 0]]);
      const na = [-Math.cos(a), 0, -Math.sin(a)], nb = [-Math.cos(b), 0, -Math.sin(b)];
      emit(walls, [radial(a, C.poolRadius, -room.poolDepth), radial(b, C.poolRadius, -room.poolDepth),
        radial(b, C.poolRadius, 0), radial(a, C.poolRadius, 0)], [na, nb, nb, na],
      [[a * C.poolRadius * 0.5, -room.poolDepth * 0.5], [b * C.poolRadius * 0.5, -room.poolDepth * 0.5],
        [b * C.poolRadius * 0.5, 0], [a * C.poolRadius * 0.5, 0]]);
    }
    const aperture = Math.asin(C.doorHalfWidth / C.wallRadius);
    for (let side = 0; side < 4; side++) {
      // Add exact portal angles to the tessellation so curved jambs meet their
      // straight tunnel walls, rather than rounding the openings to a segment.
      const cuts = [-aperture, aperture, Math.PI / 2 - aperture];
      for (let interval = 0; interval < 2; interval++) {
        const start = side * Math.PI / 2 + cuts[interval];
        const end = side * Math.PI / 2 + cuts[interval + 1];
        const steps = Math.ceil((end - start) / (Math.PI * 2) * SEGMENTS);
        for (let i = 0; i < steps; i++) {
          const a = start + (end - start) * i / steps, b = start + (end - start) * (i + 1) / steps;
          const bottom = interval === 0 ? 3.6 : 0;
          const p = (t, y) => [7.5 + Math.cos(t) * C.wallRadius, y, 7.5 + Math.sin(t) * C.wallRadius];
          const na = [-Math.cos(a), 0, -Math.sin(a)], nb = [-Math.cos(b), 0, -Math.sin(b)];
          emit(walls, [p(a, bottom), p(b, bottom), p(b, height), p(a, height)], [na, nb, nb, na],
            [[a * C.wallRadius * 0.5, bottom * 0.5], [b * C.wallRadius * 0.5, bottom * 0.5],
              [b * C.wallRadius * 0.5, height * 0.5], [a * C.wallRadius * 0.5, height * 0.5]]);
        }
      }
    }
  } else {
    const x0 = 7 - room.halfWidth, x1 = 8 + room.halfWidth;
    const z0 = 7 - room.halfLength, z1 = 8 + room.halfLength;
    flat(0, 0, x0, 15, 0); flat(x1, 0, 15, 15, 0);
    flat(x0, 0, x1, z0, 0); flat(x0, z1, x1, 15, 0);
    flat(x0, z0, x1, z1, -room.poolDepth);
    wall([x0, z0], [x1, z0], -room.poolDepth, 0, [0, 0, 1]);
    wall([x1, z1], [x0, z1], -room.poolDepth, 0, [0, 0, -1]);
    wall([x0, z1], [x0, z0], -room.poolDepth, 0, [1, 0, 0]);
    wall([x1, z0], [x1, z1], -room.poolDepth, 0, [-1, 0, 0]);
    for (const z of C.archStarts) {
      // Solid piers plus a continuous elliptical intrados and closed spandrels.
      for (const [left, right] of [[2, 3], [12, 13]]) {
        wall([left, z], [left, z + 1], -room.poolDepth, height, [-1, 0, 0]);
        wall([right, z + 1], [right, z], -room.poolDepth, height, [1, 0, 0]);
        wall([left, z], [right, z], -room.poolDepth, height, [0, 0, -1]);
        wall([right, z + 1], [left, z + 1], -room.poolDepth, height, [0, 0, 1]);
      }
      for (let i = 0; i < 64; i++) {
        const a = Math.PI - i * Math.PI / 64, b = Math.PI - (i + 1) * Math.PI / 64;
        const xa = 7.5 + C.archRadius * Math.cos(a), xb = 7.5 + C.archRadius * Math.cos(b);
        const ya = archHeight(xa), yb = archHeight(xb);
        const na = [-Math.cos(a) / C.archRadius, -Math.sin(a) / C.archRise, 0];
        const nb = [-Math.cos(b) / C.archRadius, -Math.sin(b) / C.archRise, 0];
        emit(walls, [[xa, ya, z], [xb, yb, z], [xb, yb, z + 1], [xa, ya, z + 1]], [na, nb, nb, na],
          [[a * 2, z * 0.5], [b * 2, z * 0.5], [b * 2, (z + 1) * 0.5], [a * 2, (z + 1) * 0.5]]);
        for (const faceZ of [z, z + 1]) emit(walls,
          [[xa, ya, faceZ], [xb, yb, faceZ], [xb, height, faceZ], [xa, height, faceZ]],
          [[0, 0, faceZ === z ? -1 : 1]],
          [[xa * 0.5, ya * 0.5], [xb * 0.5, yb * 0.5], [xb * 0.5, height * 0.5], [xa * 0.5, height * 0.5]]);
      }
    }
  }
}

export function addCurvedRoomGeometry(group, chunkX, chunkZ, floorMaterial, wallMaterial, chunkSize = 16) {
  const bounds = { minX: chunkX * chunkSize, minZ: chunkZ * chunkSize,
    maxX: (chunkX + 1) * chunkSize, maxZ: (chunkZ + 1) * chunkSize };
  const floors = output(), walls = output();
  for (let mz = Math.floor(bounds.minZ / 15); mz <= Math.floor((bounds.maxZ - 1) / 15); mz++) {
    for (let mx = Math.floor(bounds.minX / 15); mx <= Math.floor((bounds.maxX - 1) / 15); mx++) {
      const room = referenceCurvedRoom(mx * 15 + 7.5, mz * 15 + 7.5);
      if (room) roomBuilder(room, bounds, floors, walls);
    }
  }
  for (const [data, material, name] of [[floors, floorMaterial, 'floor'], [walls, wallMaterial, 'wall']]) {
    if (!data.position.length) continue;
    const geometry = new THREE.BufferGeometry();
    for (const [key, values] of Object.entries(data)) geometry.setAttribute(key,
      new THREE.Float32BufferAttribute(values, key === 'uv' ? 2 : 3));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `CurvedRoom_${name}`;
    mesh.userData.curvedArchitecture = true;
    group.add(mesh);
    group.userData.geometries.push(geometry);
  }
}
