"""Create a colored, locally refined Naiwa draft from the untouched Tripo GLB."""
from pathlib import Path
import numpy as np

from naiwa_mesh_tools import ROOT, read_glb, write_glb, vertex_normals, preview


def smoothstep(lo, hi, x):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def linear_hex(value):
    srgb = np.array([int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)])
    return np.where(srgb <= .04045, srgb / 12.92, ((srgb + .055) / 1.055) ** 2.4)


def refine_belly_boundary(positions, faces):
    """Add shared edge vertices around the painted boundary without cracks or T junctions."""
    for _ in range(2):
        x, y, z = positions.T
        oval = (x / .214) ** 2 + ((y - .565) / .151) ** 2
        values = oval[faces]
        selected = (values.min(axis=1) < 1.2) & (values.max(axis=1) > .8) & (z[faces].min(axis=1) > .025)
        all_edges = np.stack([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]], axis=1)
        unique_edges, inverse = np.unique(np.sort(all_edges.reshape(-1, 2), axis=1), axis=0, return_inverse=True)
        edge_indices = inverse.reshape(-1, 3)
        split = np.zeros(len(unique_edges), dtype=bool)
        split[edge_indices[selected].ravel()] = True
        edge_midpoints = np.full(len(unique_edges), -1, dtype=np.int64)
        edge_midpoints[split] = np.arange(len(positions), len(positions) + split.sum())
        positions = np.concatenate([positions, positions[unique_edges[split]].mean(axis=1)])
        mids = edge_midpoints[edge_indices]
        new_faces = []
        for triangle, midpoints in zip(faces, mids):
            count = np.sum(midpoints >= 0)
            if count == 0:
                new_faces.append(triangle)
                continue
            if count == 1:
                rotation = int(np.flatnonzero(midpoints >= 0)[0])
            elif count == 2:
                rotation = next(i for i in range(3) if midpoints[i] >= 0 and midpoints[(i + 1) % 3] >= 0)
            else:
                rotation = 0
            a, b, c = np.roll(triangle, -rotation)
            ab, bc, ca = np.roll(midpoints, -rotation)
            if count == 1:
                new_faces.extend([[a, ab, c], [ab, b, c]])
            elif count == 2:
                new_faces.extend([[b, bc, ab], [a, ab, c], [ab, bc, c]])
            else:
                new_faces.extend([[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]])
        faces = np.array(new_faces, dtype=np.uint32)
    return positions, faces


def ellipsoid(center, radii, color, segments=32, rings=16):
    vertices = [np.array(center) + np.array([0, radii[1], 0])]
    for row in range(1, rings):
        phi = np.pi * row / rings
        for col in range(segments):
            theta = 2 * np.pi * col / segments
            vertices.append(np.array(center) + np.array(radii) *
                            np.array([np.sin(phi) * np.cos(theta), np.cos(phi), np.sin(phi) * np.sin(theta)]))
    vertices.append(np.array(center) - np.array([0, radii[1], 0]))
    faces = []
    for col in range(segments):
        a, b = 1 + col, 1 + (col + 1) % segments
        faces.append([0, b, a])
    for row in range(rings - 2):
        for col in range(segments):
            a, b = 1 + row * segments + col, 1 + row * segments + (col + 1) % segments
            c, d = a + segments, b + segments
            faces.extend([[a, b, c], [b, d, c]])
    pole = len(vertices) - 1
    for col in range(segments):
        a, b = 1 + (rings - 2) * segments + col, 1 + (rings - 2) * segments + (col + 1) % segments
        faces.append([pole, a, b])
    p, f = np.array(vertices, dtype=np.float32), np.array(faces, dtype=np.uint32)
    return p, f, np.tile(linear_hex(color), (len(p), 1))


def refine():
    source = ROOT / 'assets/models/naiwa-h25-source.glb'
    output = ROOT / 'assets/models/naiwa-h25-refined.glb'
    p, _, faces, _ = read_glb(source)
    x, y, z = p.T.copy()

    # Smooth the existing watertight surface, concentrating on the raised belly/wrist seams.
    # Taubin's alternating steps reduce small ridges while keeping the rounded silhouette.
    edges = np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]])
    edges = np.unique(np.sort(edges, axis=1), axis=0)
    a, b = np.concatenate([edges[:, 0], edges[:, 1]]), np.concatenate([edges[:, 1], edges[:, 0]])
    degree = np.bincount(a, minlength=len(p)).astype(np.float32)
    torso = (1 - smoothstep(.215, .252, np.abs(x))) * smoothstep(.37, .42, y) * (1 - smoothstep(.70, .75, y)) * smoothstep(.04, .09, z)
    wrists = smoothstep(.21, .26, np.abs(x)) * np.exp(-((y - .43) / .045) ** 2)
    face_patch = (1 - smoothstep(.07, .11, np.abs(x))) * smoothstep(.85, .88, y) * (1 - smoothstep(.955, .98, y)) * smoothstep(.04, .07, z)
    weight = np.maximum.reduce([np.full(len(p), .10), torso * .9, wrists * .8, face_patch * .6])[:, None]
    for _ in range(32):
        for rate in (.45, -.47):
            total = np.zeros_like(p)
            np.add.at(total, a, p[b])
            average = total / np.maximum(degree[:, None], 1)
            p += rate * weight * (average - p)

    # Compress the small generated beak into a shallow smile/lip, preserving the head.
    x, y, z = p.T.copy()
    lip = np.exp(-((x / .037) ** 2 + ((y - .889) / .018) ** 2)) * smoothstep(.05, .09, z)
    p[:, 2] -= .024 * lip

    # Replace both irregular eye bulges with matching smooth surfaces before adding the eyes.
    # These vertices stay part of the original continuous body, with no cut or cap.
    x, y, z = p.T.copy()
    for side in (-1, 1):
        eye = ((x - side * .058) / .033) ** 2 + ((y - .934) / .038) ** 2
        flatten = (1 - smoothstep(.55, 1.5, eye)) * smoothstep(.045, .075, z)
        p[:, 2] -= .008 * flatten

    p, faces = refine_belly_boundary(p, faces)
    x, y, z = p.T
    lower, upper = linear_hex('E9B92E'), linear_hex('F3D646')
    colors = lower + (upper - lower) * smoothstep(.25, 1.0, y)[:, None]
    belly_oval = (x / .214) ** 2 + ((y - .565) / .151) ** 2
    belly = (1 - smoothstep(.975, 1.025, belly_oval)) * smoothstep(.025, .065, z)
    colors = colors * (1 - belly[:, None]) + linear_hex('EFE5CE') * belly[:, None]
    hands = smoothstep(.21, .24, np.abs(x)) * (1 - smoothstep(.375, .421, y))
    feet = 1 - smoothstep(.047, .073, y)
    dark = np.maximum(hands, feet)
    colors = colors * (1 - dark[:, None]) + linear_hex('575548') * dark[:, None]

    parts = [(p, faces, colors)]
    for side in (-1, 1):
        center_x = side * .058
        parts.append(ellipsoid([center_x, .934, .084], [.027, .030, .022], '75A84B'))
        parts.append(ellipsoid([center_x, .9335, .105], [.0145, .019, .006], '101D12', 24, 12))
        parts.append(ellipsoid([center_x - .0045, .9405, .1105], [.0031, .0038, .0013], 'D8E8BD', 12, 8))

    # A shallow, closed tube follows the surface of the lips; no floating face decal.
    mouth_positions, mouth_faces, smile_samples = [], [], []
    for row in range(33):
        t = row / 32
        mx = (t - .5) * .070
        my = .883 + .006 * (2 * t - 1) ** 2
        near = (np.abs(p[:, 0] - mx) < .008) & (np.abs(p[:, 1] - my) < .009) & (p[:, 2] > .05)
        distances = (p[near, 0] - mx) ** 2 + (p[near, 1] - my) ** 2
        samples = np.argsort(distances)[:5]
        mz = np.average(p[near, 2][samples], weights=1 / (distances[samples] + 1e-5))
        smile_samples.append((mx, my, mz))
    fit = np.polyfit(np.array(smile_samples)[:, 0], np.array(smile_samples)[:, 2], 4)
    for row, (mx, my, _) in enumerate(smile_samples):
        mz = np.polyval(fit, mx) + .002
        for col in range(8):
            theta = col / 8 * 2 * np.pi
            mouth_positions.append([mx, my + np.cos(theta) * .0013, mz + np.sin(theta) * .0013])
        if row:
            for col in range(8):
                a0, b0 = (row - 1) * 8 + col, (row - 1) * 8 + (col + 1) % 8
                c0, d0 = row * 8 + col, row * 8 + (col + 1) % 8
                mouth_faces.extend([[a0, b0, c0], [b0, d0, c0]])
    for cap, reverse in [(0, False), (32 * 8, True)]:
        for col in range(1, 7):
            triangle = [cap, cap + col, cap + col + 1]
            mouth_faces.append(triangle[::-1] if reverse else triangle)
    mouth_positions = np.array(mouth_positions, dtype=np.float32)
    parts.append((mouth_positions, np.array(mouth_faces, dtype=np.uint32),
                  np.tile(linear_hex('665122'), (len(mouth_positions), 1))))

    positions, indices, all_colors = [], [], []
    offset = 0
    for vertices, triangles, color in parts:
        positions.append(vertices)
        indices.append(triangles + offset)
        all_colors.append(color)
        offset += len(vertices)
    positions, indices, all_colors = np.concatenate(positions), np.concatenate(indices), np.concatenate(all_colors)
    normals = vertex_normals(positions, indices)
    write_glb(output, positions, normals, indices, all_colors, {
        'identityReference': 'references/naiwa-escape-turnaround.png',
        'frontReference': 'references/naiwa-tripo-front-reference.png',
        'source': 'naiwa-h25-source.glb',
        'sourceSha256': '2c2a51de7183385c1d825f8be5c27fa4d9f7ec853c02c85e64e47dc5d9b5d080',
        'notes': 'Local draft: smoothed body, no tail in source, rebuilt symmetric green eyes, vertex colors. Unrigged.'})
    preview(output, ROOT / 'references/naiwa-h25-refined-preview.png',
            heading='Naiwa / local color and mesh draft')
    print(f'{output}\n{len(indices):,} triangles / {len(positions):,} vertices / {output.stat().st_size:,} bytes')


if __name__ == '__main__':
    refine()
