"""Local GLB mesh editing and offline previews for Naiwa (no cloud generation)."""
from pathlib import Path
import argparse
import json
import struct

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]


def glb_document(path):
    raw = Path(path).read_bytes()
    magic, version, length = struct.unpack_from('<4sII', raw)
    if magic != b'glTF' or version != 2 or length != len(raw):
        raise ValueError('Expected a complete glTF 2 binary file')
    offset, chunks = 12, {}
    while offset < len(raw):
        size, kind = struct.unpack_from('<II', raw, offset)
        chunks[kind] = raw[offset + 8:offset + 8 + size]
        offset += size + 8
    doc = json.loads(chunks[0x4e4f534a])
    data = chunks[0x004e4942]
    def accessor(index):
        a = doc['accessors'][index]
        v = doc['bufferViews'][a['bufferView']]
        dtype = {5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1'}[a['componentType']]
        components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
        start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        if v.get('byteStride'):
            result = np.ndarray((a['count'], components), dtype=dtype, buffer=data,
                                offset=start, strides=(v['byteStride'], np.dtype(dtype).itemsize)).copy()
        else:
            result = np.frombuffer(data, dtype=dtype, count=a['count'] * components,
                                   offset=start).copy().reshape((-1, components))
        if a.get('normalized') and a['componentType'] != 5126:
            result = result.astype(np.float32) / np.iinfo(np.dtype(dtype)).max
        return result
    return doc, accessor


def read_glb(path):
    doc, accessor = glb_document(path)
    p = doc['meshes'][0]['primitives'][0]
    positions = accessor(p['attributes']['POSITION'])
    normals = accessor(p['attributes']['NORMAL'])
    faces = accessor(p['indices']).reshape((-1, 3))
    colors = accessor(p['attributes']['COLOR_0'])[:, :3] if 'COLOR_0' in p['attributes'] else np.full_like(positions, .62)
    return positions, normals, faces, colors


def vertex_normals(positions, faces):
    normals = np.zeros_like(positions)
    triangles = positions[faces]
    area = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
    for corner in range(3):
        np.add.at(normals, faces[:, corner], area)
    normals /= np.maximum(np.linalg.norm(normals, axis=1)[:, None], 1e-12)
    return normals


def write_glb(path, positions, normals, faces, colors, extras=None):
    arrays = [np.asarray(positions, '<f4'), np.asarray(normals, '<f4'),
              np.asarray(colors, '<f4'), np.asarray(faces, '<u4').reshape(-1)]
    blob = b''
    views, accessors = [], []
    for index, arr in enumerate(arrays):
        payload = arr.tobytes()
        views.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(payload),
                      'target': 34963 if index == 3 else 34962})
        blob += payload
        accessor = {'bufferView': index, 'componentType': 5125 if index == 3 else 5126,
                    'count': len(arr), 'type': 'SCALAR' if index == 3 else 'VEC3'}
        if index == 0:
            accessor['min'] = arr.min(axis=0).tolist()
            accessor['max'] = arr.max(axis=0).tolist()
        accessors.append(accessor)
    doc = {'asset': {'version': '2.0', 'generator': 'Naiwa local mesh tools'},
           'scene': 0, 'scenes': [{'nodes': [0]}],
           'nodes': [{'name': 'Naiwa', 'mesh': 0}],
           'meshes': [{'name': 'Naiwa', 'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'COLOR_0': 2},
                                                      'indices': 3, 'material': 0, 'mode': 4}]}],
           'materials': [{'name': 'Naiwa matte skin', 'pbrMetallicRoughness': {
               'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': .66}}],
           'buffers': [{'byteLength': len(blob)}], 'bufferViews': views, 'accessors': accessors,
           'extras': extras or {}}
    encoded = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    encoded += b' ' * (-len(encoded) % 4)
    blob += b'\x00' * (-len(blob) % 4)
    result = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(encoded) + 8 + len(blob))
    result += struct.pack('<II', len(encoded), 0x4e4f534a) + encoded
    result += struct.pack('<II', len(blob), 0x004e4942) + blob
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_bytes(result)


def preview(path=None, output=None, angles=(0, 90, 180), heading='Naiwa / mesh preview',
            mesh_data=None, panel_width=500, panel_height=660):
    positions, normals, faces, colors = read_glb(path) if mesh_data is None else mesh_data
    width, height = panel_width, panel_height
    render_scale = height - 120
    canvas = Image.new('RGB', (width * len(angles), height), (235, 238, 240))
    for panel, angle in enumerate(angles):
        yaw = np.deg2rad(angle)
        forward = np.array([np.sin(yaw), 0, np.cos(yaw)])
        right = np.array([np.cos(yaw), 0, -np.sin(yaw)])
        up = np.array([0, 1, 0])
        projected = np.column_stack([positions @ right * render_scale + width / 2,
                                     height - 63 - positions[:, 1] * render_scale, positions @ forward])
        light = forward * .7 + right * -.35 + up * .7
        light /= np.linalg.norm(light)
        shade = .46 + .54 * np.maximum(0, normals @ light)
        display = np.clip(colors * shade[:, None], 0, 1) ** (1 / 2.2) * 255
        pixels = np.full((height, width, 3), [235, 238, 240], dtype=np.float32)
        zbuffer = np.full((height, width), -np.inf)
        triangles = positions[faces]
        facing = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0]) @ forward
        for face in faces[facing > 0]:
            v = projected[face]
            x0, y0 = np.maximum(np.floor(v[:, :2].min(axis=0)).astype(int), 0)
            x1, y1 = np.minimum(np.ceil(v[:, :2].max(axis=0)).astype(int), [width - 1, height - 1])
            if x0 > x1 or y0 > y1:
                continue
            denom = (v[1, 1] - v[2, 1]) * (v[0, 0] - v[2, 0]) + (v[2, 0] - v[1, 0]) * (v[0, 1] - v[2, 1])
            if abs(denom) < 1e-9:
                continue
            yy, xx = np.mgrid[y0:y1 + 1, x0:x1 + 1]
            a = ((v[1, 1] - v[2, 1]) * (xx - v[2, 0]) + (v[2, 0] - v[1, 0]) * (yy - v[2, 1])) / denom
            b = ((v[2, 1] - v[0, 1]) * (xx - v[2, 0]) + (v[0, 0] - v[2, 0]) * (yy - v[2, 1])) / denom
            c = 1 - a - b
            depth = a * v[0, 2] + b * v[1, 2] + c * v[2, 2]
            z = zbuffer[y0:y1 + 1, x0:x1 + 1]
            mask = (a >= -1e-5) & (b >= -1e-5) & (c >= -1e-5) & (depth > z)
            z[mask] = depth[mask]
            rgb = (a[..., None] * display[face[0]] + b[..., None] * display[face[1]] + c[..., None] * display[face[2]])
            pixels[y0:y1 + 1, x0:x1 + 1][mask] = rgb[mask]
        canvas.paste(Image.fromarray(pixels.clip(0, 255).astype('uint8')), (panel * width, 0))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', max(14, round(width * .04)))
    draw.text((24, 16), heading, fill=(35, 44, 51), font=font)
    for i, angle in enumerate(angles):
        draw.text((i * width + 24, height - 35), f'{angle} degrees', fill=(62, 70, 78), font=font)
    if output:
        Path(output).parent.mkdir(parents=True, exist_ok=True)
        canvas.save(output)
    return canvas


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--angles', default='0,90,180')
    parser.add_argument('--heading', default='Naiwa / mesh preview')
    args = parser.parse_args()
    preview(args.input, args.output, tuple(map(float, args.angles.split(','))), args.heading)
