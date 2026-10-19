"""Download pinned CC0 Kenney foley, then produce local, browser-safe mono WAVs.

One-off tool, never run by the build. Requires numpy and soundfile (which may be
installed into the ignored tmp/audio-tools directory).
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import argparse
import json
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tmp/audio-tools'))
import numpy as np
import soundfile as sf

REPO = 'GeorgeQLe/assets-sfx-combat'
RAW = ROOT / 'assets/audio/frog-escape'
OUT = ROOT / 'public/audio/frog-escape'
IMPACT = [f'footstep_{surface}_{i:03d}' for surface in ['wood', 'concrete', 'grass'] for i in range(3)]
for material, weights in {
    'Glass': ['light', 'heavy'], 'Plate': ['light', 'heavy'],
    'Metal': ['light', 'medium'], 'Soft': ['medium', 'heavy'],
    'Wood': ['light', 'heavy'], 'Punch': ['medium', 'heavy'],
}.items():
    IMPACT += [f'impact{material}_{weight}_{i:03d}' for weight in weights for i in range(2)]
IMPACT += [f'impactTin_medium_{i:03d}' for i in range(2)]
IMPACT += [f'impactPlank_medium_{i:03d}' for i in range(2)]
IMPACT += ['impactGeneric_light_000', 'impactMetal_heavy_000']
RPG = ['doorOpen_1', 'doorOpen_2', 'doorClose_1', 'doorClose_2',
       'creak1', 'creak2', 'creak3', 'metalLatch', 'metalClick',
       'cloth1', 'cloth2', 'knifeSlice', 'knifeSlice2', 'drawKnife1',
       'dropLeather', 'bookPlace1', 'handleCoins']


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Naiwa-Escape-audio-import'})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--commit', help='Exact upstream commit; omit to import the current main commit')
args = parser.parse_args()
commit = args.commit or json.loads(fetch(f'https://api.github.com/repos/{REPO}/commits/main'))['sha']
base = f'https://raw.githubusercontent.com/{REPO}/{commit}/'
RAW.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
for pack in ['impact-sounds', 'rpg-audio']:
    license_data = fetch(base + f'LICENSES/kenney-{pack}-license.txt')
    if b'Creative Commons Zero' not in license_data or b'Kenney' not in license_data:
        raise ValueError(f'Unexpected license for {pack}')
    (RAW / f'{pack}-LICENSE.txt').write_bytes(license_data)
    (OUT / f'{pack}-LICENSE.txt').write_bytes(license_data)


def prepare(task):
    pack, name = task
    path = f'assets/kenney/{pack}/Audio/{name}.ogg'
    data = fetch(base + path)
    if data[:4] != b'OggS':
        raise ValueError(f'Unexpected file: {path}')
    original = RAW / f'{name}.ogg'
    original.write_bytes(data)
    audio, rate = sf.read(original, dtype='float32', always_2d=True)
    audio = audio.mean(axis=1)
    # Preserve the complete effect while removing long export silence and DC offset.
    audio -= audio.mean()
    audible = np.flatnonzero(np.abs(audio) > .0008)
    if len(audible) == 0:
        raise ValueError(f'Silent source: {path}')
    audio = audio[max(0, audible[0] - int(rate * .008)):min(len(audio), audible[-1] + int(rate * .045))]
    if rate != 32000:
        audio = np.interp(np.arange(round(len(audio) * 32000 / rate)) * rate / 32000,
                          np.arange(len(audio)), audio).astype('float32')
    peak = float(np.max(np.abs(audio)))
    audio *= .8 / max(peak, .001)
    ramp = min(96, len(audio) // 8)
    audio[:ramp] *= np.linspace(0, 1, ramp)
    audio[-ramp:] *= np.linspace(1, 0, ramp)
    output = OUT / f'{name}.wav'
    sf.write(output, audio, 32000, subtype='PCM_16')
    return name, {'file': output.name, 'duration': round(len(audio) / 32000, 5),
                  'source': base + path, 'sourceSha256': hashlib.sha256(data).hexdigest(),
                  'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'license': 'CC0-1.0'}


tasks = [('impact-sounds', name) for name in IMPACT] + [('rpg-audio', name) for name in RPG]
with ThreadPoolExecutor(max_workers=6) as pool:
    clips = dict(sorted(pool.map(prepare, tasks)))
manifest = {'revision': '2026-10-16-material-foley-v1', 'author': 'Kenney (kenney.nl)',
            'repository': f'https://github.com/{REPO}', 'commit': commit,
            'license': 'CC0-1.0', 'clips': clips}
(RAW / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(f'Prepared {len(clips)} CC0 effects ({sum((OUT / v["file"]).stat().st_size for v in clips.values()):,} WAV bytes), commit {commit}.')
