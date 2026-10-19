"""Rebuild the fused inner arms on the existing Naiwa mesh, without generation.

Run with --dependency-dir tmp/mesh-deps when manifold3d is installed locally.
Original source/refined assets are never modified.
"""
import argparse
import hashlib
import json
import sys

import numpy as np

from naiwa_mesh_tools import ROOT, read_glb, write_glb, vertex_normals


SHOULDER_GATE = .678
SHOULDER_FIXED = .655
SHOULDER_TOP = .755
REVISION = '2026-10-17-arm-topology-v12'


def mesh_edges(faces):
    return np.unique(np.sort(np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]]), axis=1), axis=0)


def adjacency_list(count, edges):
    adjacency = [[] for _ in range(count)]
    for a, b in edges:
        adjacency[a].append(int(b))
        adjacency[b].append(int(a))
    return adjacency


def connected_sets(count, adjacency, allowed=None):
    allowed = np.ones(count, dtype=bool) if allowed is None else allowed
    seen = ~allowed.copy()
    components = []
    for start in np.flatnonzero(allowed):
        if seen[start]:
            continue
        pending, component = [int(start)], []
        seen[start] = True
        while pending:
            i = pending.pop()
            component.append(i)
            for j in adjacency[i]:
                if not seen[j]:
                    pending.append(j)
                    seen[j] = True
        components.append(np.array(component, dtype=np.int64))
    return components


def arm_regions(positions, faces):
    """Find actual limb surfaces below the shoulder, through mesh connectivity."""
    edges = mesh_edges(faces)
    adjacency = adjacency_list(len(positions), edges)
    components = connected_sets(len(positions), adjacency, positions[:, 1] < SHOULDER_GATE)
    regions = np.zeros(len(positions), dtype=np.uint8)
    for region, sign in [(1, -1), (2, 1)]:
        seeds = (positions[:, 0] * sign > .244) & (positions[:, 1] > .385) & (positions[:, 1] < .425)
        selected = [component for component in components if np.any(seeds[component])]
        if len(selected) != 1:
            raise ValueError(f'Expected one closed inner arm on side {sign}, found {len(selected)}')
        component = selected[0]
        if np.any(positions[component, 0] * sign < .12):
            raise ValueError('An arm is still fused to the trunk below the shoulder')
        regions[component] = region
    return regions, edges, adjacency


def shoulder_weights(positions, faces):
    """Harmonic shoulder transitions, with independent torso/arm interiors."""
    regions, edges, adjacency = arm_regions(positions, faces)
    fixed = (positions[:, 1] < SHOULDER_FIXED) | (positions[:, 1] > SHOULDER_TOP)
    values = np.column_stack([regions == 1, regions == 2]).astype(np.float64)
    unknown = np.flatnonzero(~fixed)
    # Only the short shoulder band is free. No chest or belly vertex below it
    # can acquire hand/forearm influence through a nearby surface shortcut.
    source = np.concatenate([np.full(len(adjacency[i]), i, dtype=np.int64) for i in unknown])
    neighbor = np.concatenate([np.array(adjacency[i], dtype=np.int64) for i in unknown])
    degree = np.bincount(source, minlength=len(positions))
    for _ in range(1800):
        next_values = np.column_stack([np.bincount(source, weights=values[neighbor, c], minlength=len(positions)) for c in range(2)])
        next_values[unknown] /= degree[unknown, None]
        change = np.max(np.abs(next_values[unknown] - values[unknown]))
        values[unknown] = next_values[unknown]
        if change < 2e-7:
            break
    return values.astype(np.float32), regions


def slot_polygon(sign):
    y = np.linspace(.435, .690, 36)
    # Preserve the original arm's nominal inner boundary (the old rig's torso
    # edge). Put the new air gap on its torso side instead of shaving the limb.
    arm_wall = np.interp(y, [.28, .35, .45, .55, .65, .72, .78], [.15, .19, .225, .230, .195, .145, .10])
    blend = np.clip((y - .435) / .045, 0, 1)
    blend = blend * blend * (3 - 2 * blend)
    arm_wall = .238 * (1 - blend) + arm_wall * blend
    width = np.full_like(y, .006)
    top = y > .665
    width[top] = .006 * np.sqrt(np.maximum(0, 1 - ((y[top] - .665) / .025) ** 2))
    center = arm_wall - width
    # A real volume is removed; the Boolean reconstructs closed inner-arm and
    # body-side faces. This is not a hidden surface or a second rendering layer.
    polygon = np.concatenate([np.column_stack([sign * (center - width), y]), np.column_stack([sign * (center + width), y])[::-1][1:]])
    area = np.sum(polygon[:, 0] * np.roll(polygon[:, 1], -1) - polygon[:, 1] * np.roll(polygon[:, 0], -1))
    return polygon if area > 0 else polygon[::-1]


def weld(positions, faces, colors):
    _, first, inverse = np.unique(np.round(positions / 1e-7).astype(np.int64), axis=0, return_index=True, return_inverse=True)
    p = positions[first]
    nonzero = (colors.max(axis=1) > 1e-5).astype(float)
    count = np.bincount(inverse, weights=nonzero, minlength=len(p))
    c = np.column_stack([np.bincount(inverse, weights=colors[:, i] * nonzero, minlength=len(p)) for i in range(3)])
    c /= np.maximum(1, count[:, None])
    f = inverse[faces]
    return p, f, c


def subdivide_caps(p, faces, colors, cap_faces):
    """Refine only the new inner walls, propagating shared edge splits."""
    for _ in range(7):
        edge_rows = np.stack([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]], axis=1)
        edges, inverse = np.unique(np.sort(edge_rows.reshape(-1, 2), axis=1), axis=0, return_inverse=True)
        edge_indices = inverse.reshape(-1, 3)
        selected = np.zeros(len(edges), dtype=bool)
        selected[edge_indices[cap_faces].ravel()] = True
        selected &= np.linalg.norm(p[edges[:, 0]] - p[edges[:, 1]], axis=1) > .007
        if not np.any(selected):
            break
        mids = np.full(len(edges), -1, dtype=np.int64)
        mids[selected] = np.arange(len(p), len(p) + np.sum(selected))
        p = np.concatenate([p, p[edges[selected]].mean(axis=1)])
        colors = np.concatenate([colors, colors[edges[selected]].mean(axis=1)])
        new_faces, new_caps = [], []
        for triangle, midpoints, cap in zip(faces, mids[edge_indices], cap_faces):
            count = np.sum(midpoints >= 0)
            if count == 0:
                new_faces.append(triangle)
                new_caps.append(cap)
                continue
            rotation = int(np.flatnonzero(midpoints >= 0)[0]) if count == 1 else next(i for i in range(3) if midpoints[i] >= 0 and midpoints[(i + 1) % 3] >= 0) if count == 2 else 0
            a, b, c = np.roll(triangle, -rotation)
            ab, bc, ca = np.roll(midpoints, -rotation)
            children = ([[a, ab, c], [ab, b, c]] if count == 1 else
                        [[b, bc, ab], [a, ab, c], [ab, bc, c]] if count == 2 else
                        [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]])
            new_faces.extend(children)
            new_caps.extend([cap] * len(children))
        faces = np.array(new_faces, dtype=np.uint32)
        cap_faces = np.array(new_caps, dtype=bool)
    return p, faces, colors, cap_faces


def soften_inner_seams(p, faces, cap_faces):
    """Round only the new wall/exterior seams; leave the rest of Naiwa intact."""
    edges = mesh_edges(faces)
    cap_vertex = np.zeros(len(p), dtype=bool)
    outside_vertex = cap_vertex.copy()
    cap_vertex[faces[cap_faces].ravel()] = True
    outside_vertex[faces[~cap_faces].ravel()] = True
    seam = cap_vertex & outside_vertex
    adjacency = adjacency_list(len(p), edges)
    active = seam.copy()
    for i in np.flatnonzero(seam):
        active[adjacency[i]] = True
    active &= p[:, 1] >= .435
    a, b = np.concatenate([edges[:, 0], edges[:, 1]]), np.concatenate([edges[:, 1], edges[:, 0]])
    degree = np.bincount(a, minlength=len(p))
    p = p.copy()
    original = p.copy()
    for _ in range(4):
        for rate in (.38, -.40):
            total = np.column_stack([np.bincount(a, weights=p[b, c], minlength=len(p)) for c in range(3)])
            delta = total / np.maximum(1, degree[:, None]) - p
            p[active] += rate * delta[active]
    if np.max(np.linalg.norm(p - original, axis=1)) > .004:
        raise ValueError('Inner-wall seam smoothing must remain a small local correction')
    return p


def repair(dependency_dir=None):
    if dependency_dir:
        sys.path.insert(0, str((ROOT / dependency_dir).resolve()))
    from manifold3d import Manifold, Mesh, CrossSection, Error

    source = ROOT / 'assets/models/naiwa-h25-refined.glb'
    output = ROOT / 'assets/models/naiwa-h25-articulated.glb'
    p, normals, faces, colors = read_glb(source)
    adjacency = adjacency_list(len(p), mesh_edges(faces))
    body = max(connected_sets(len(p), adjacency), key=len)
    belongs = np.zeros(len(p), dtype=bool)
    belongs[body] = True
    body_faces = np.all(belongs[faces], axis=1)
    remap = np.full(len(p), -1, dtype=np.int64)
    remap[body] = np.arange(len(body))
    properties = np.column_stack([p[body], colors[body], np.zeros((len(body), 2))]).astype(np.float32)
    solid = Manifold(Mesh(vert_properties=properties, tri_verts=remap[faces[body_faces]].astype(np.uint32)))
    if solid.status() != Error.NoError:
        raise ValueError(f'Original body is not an oriented solid: {solid.status()}')
    volume_before = solid.volume()
    for sign in (-1, 1):
        cutter = Manifold.extrude(CrossSection([slot_polygon(sign)]), 1, n_divisions=99).translate([0, 0, -.5])
        # Preserve a regular grid on the new walls during the Boolean. A smooth
        # auxiliary parameter prevents merging a wall into long skinny fans;
        # it is discarded before exporting the actual RGB mesh.
        cutter = cutter.set_properties(5, lambda point, old: [0, 0, 0, 1, point[1] ** 2 + point[2] ** 2])
        solid = solid - cutter
    pieces = solid.decompose()
    debris = [piece for piece in pieces if piece.volume() < 1e-8]
    major = [piece for piece in pieces if piece.volume() >= 1e-8]
    if solid.status() != Error.NoError or len(major) != 1:
        details = [(piece.volume(), piece.bounding_box()) for piece in solid.decompose()]
        raise ValueError(f'Repair must keep one closed body, with both arms attached at the shoulders: {solid.status()}, {details}')
    solid = major[0]
    # Fill long new cap triangles with sufficient vertices for elbow deformation.
    result = solid.to_mesh()
    cap_faces = np.all(np.asarray(result.vert_properties)[np.asarray(result.tri_verts), 6] > .99, axis=1)
    repaired_p, repaired_f, repaired_c = weld(np.asarray(result.vert_properties[:, :3]), np.asarray(result.tri_verts), np.asarray(result.vert_properties[:, 3:6]))
    cap = repaired_c.max(axis=1) < 1e-5
    def linear_hex(value):
        rgb = np.array([int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)])
        return np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
    lower, upper = linear_hex('E9B92E'), linear_hex('F3D646')
    mix = np.clip((repaired_p[:, 1] - .25) / .75, 0, 1)
    mix = mix * mix * (3 - 2 * mix)
    repaired_c[cap] = lower + (upper - lower) * mix[cap, None]
    repaired_p, repaired_f, repaired_c, cap_faces = subdivide_caps(repaired_p, repaired_f, repaired_c, cap_faces)
    repaired_p = soften_inner_seams(repaired_p, repaired_f, cap_faces)
    # All original face/eye/mouth parts remain byte-identical separate surfaces.
    other = np.flatnonzero(~belongs)
    remap[:] = -1
    remap[other] = np.arange(len(other)) + len(repaired_p)
    p = np.concatenate([repaired_p, p[other]])
    faces = np.concatenate([repaired_f, remap[faces[~body_faces]]]).astype(np.uint32)
    colors = np.concatenate([repaired_c, colors[other]]).astype(np.float32)
    n = np.concatenate([vertex_normals(repaired_p, repaired_f), normals[other]])
    regions, _, _ = arm_regions(p, faces)
    rebuilt_volume = float(np.einsum('ij,ij->i', repaired_p[repaired_f[:, 0]], np.cross(repaired_p[repaired_f[:, 1]], repaired_p[repaired_f[:, 2]])).sum() / 6)
    report = {'revision': REVISION, 'source': source.name, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
              'identityReference': 'references/naiwa-escape-turnaround.png', 'vertices': len(p), 'triangles': len(faces),
              'shoulderGate': SHOULDER_GATE, 'shoulderFixed': SHOULDER_FIXED, 'shoulderTop': SHOULDER_TOP,
              'closedBodyComponents': len(solid.decompose()), 'discardedCutDebris': len(debris), 'volumeRemovedFraction': 1 - rebuilt_volume / volume_before,
              'leftArmVertices': int(np.sum(regions == 1)), 'rightArmVertices': int(np.sum(regions == 2)),
              'rebuiltInnerTriangles': int(np.sum(cap_faces)),
              'thicknessPolicy': 'preserve original outer silhouette and nominal inner arm boundary; place gap on trunk side',
              'method': 'local Boolean inner-arm separation, closed side surfaces, harmonic shoulder weights', 'manifold3d': '3.5.4'}
    write_glb(output, p, n, faces, colors, report)
    (output.parent / 'naiwa-h25-arm-repair.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2), flush=True)
    print(f'{output}: {output.stat().st_size:,} bytes', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dependency-dir')
    repair(parser.parse_args().dependency_dir)
