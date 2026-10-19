"""Render the exported GLB's real skin and animation channels to a small GIF."""
import argparse
import numpy as np

from naiwa_mesh_tools import ROOT, glb_document, preview, vertex_normals


def interpolate(a, b, t, quaternion=False):
    if not quaternion:
        return a + (b - a) * t
    dot = float(np.dot(a, b))
    if dot < 0:
        b, dot = -b, -dot
    if dot > .9995:
        result = a + (b - a) * t
        return result / np.linalg.norm(result)
    angle = np.arccos(np.clip(dot, -1, 1))
    return (a * np.sin((1 - t) * angle) + b * np.sin(t * angle)) / np.sin(angle)


def transform(translation, quaternion, scale):
    x, y, z, w = quaternion
    matrix = np.eye(4)
    matrix[:3, :3] = np.array([
        [1 - 2 * (y*y + z*z), 2 * (x*y - z*w), 2 * (x*z + y*w)],
        [2 * (x*y + z*w), 1 - 2 * (x*x + z*z), 2 * (y*z - x*w)],
        [2 * (x*z - y*w), 2 * (y*z + x*w), 1 - 2 * (x*x + y*y)],
    ]) * np.array(scale)[None, :]
    matrix[:3, 3] = translation
    return matrix


def render(clip_name, count, angles, output_name=None):
    path = ROOT / 'assets/models/naiwa-h25-rigged.glb'
    doc, accessor = glb_document(path)
    primitive = doc['meshes'][0]['primitives'][0]
    position = accessor(primitive['attributes']['POSITION'])
    homogeneous = np.column_stack([position, np.ones(len(position))])
    color = accessor(primitive['attributes']['COLOR_0'])
    indices = accessor(primitive['indices']).reshape(-1, 3)
    joints = accessor(primitive['attributes']['JOINTS_0'])
    weights = accessor(primitive['attributes']['WEIGHTS_0'])
    skin = doc['skins'][0]
    inverses = accessor(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    animation = next(a for a in doc['animations'] if a['name'] == clip_name)
    duration = max(float(accessor(s['input'])[-1, 0]) for s in animation['samplers'])
    parents = {}
    for i, node in enumerate(doc['nodes']):
        for child in node.get('children', []):
            parents[child] = i
    frames = []
    for frame in range(count):
        time = duration * frame / count
        components = [{'translation': n.get('translation', [0, 0, 0]),
                       'rotation': n.get('rotation', [0, 0, 0, 1]),
                       'scale': n.get('scale', [1, 1, 1])} for n in doc['nodes']]
        for channel in animation['channels']:
            sampler = animation['samplers'][channel['sampler']]
            times = accessor(sampler['input'])[:, 0]
            values = accessor(sampler['output'])
            k = min(max(0, np.searchsorted(times, time, side='right') - 1), len(times) - 2)
            factor = (time - times[k]) / (times[k + 1] - times[k])
            target = channel['target']
            components[target['node']][target['path']] = interpolate(values[k], values[k + 1], factor, target['path'] == 'rotation')
        worlds = {}
        def world(i):
            if i not in worlds:
                c = components[i]
                local = transform(c['translation'], c['rotation'], c['scale'])
                worlds[i] = world(parents[i]) @ local if i in parents else local
            return worlds[i]
        matrices = np.array([world(i) for i in skin['joints']]) @ inverses
        posed = np.einsum('nkij,nj,nk->ni', matrices[joints], homogeneous, weights)[:, :3]
        normals = vertex_normals(posed, indices)
        image = preview(angles=angles, heading=f'Naiwa / {clip_name}',
                        mesh_data=(posed, normals, indices, color), panel_width=350, panel_height=510)
        frames.append(image)
        print(f'{clip_name}: frame {frame + 1}/{count}', flush=True)
    output = ROOT / 'references' / (output_name or f'naiwa-rig-{clip_name.lower()}.gif')
    frames[0].save(output, save_all=True, append_images=frames[1:],
                   duration=round(duration * 1000 / count), loop=0, disposal=2)
    print(output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--clip', default='Walk')
    parser.add_argument('--frames', type=int, default=12)
    parser.add_argument('--angle', type=float, default=30)
    parser.add_argument('--angles', help='Comma-separated camera angles for a combined preview')
    parser.add_argument('--output-name')
    args = parser.parse_args()
    render(args.clip, args.frames, tuple(map(float, args.angles.split(','))) if args.angles else (args.angle,), args.output_name)
