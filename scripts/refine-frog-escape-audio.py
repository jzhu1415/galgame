"""Import and edit CC0 swishes, metal contacts and genuine material break recordings.

Run after prepare-frog-escape-audio.py; --offline reuses retained original files.
Requires numpy and soundfile, optionally in tmp/audio-tools. Not part of the build.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import argparse
import hashlib
import json
import sys
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tmp/audio-tools'))
import numpy as np
import soundfile as sf

RAW = ROOT / 'assets/audio/frog-escape'
OUT = ROOT / 'public/audio/frog-escape'
COMMIT = 'f2b6264f9ab89fabc266914c3654685d68c5a39b'
BASE = f'https://raw.githubusercontent.com/lavenderdotpet/CC0-Public-Domain-Sounds/{COMMIT}/'
BREAK_PAGE = 'https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--offline', action='store_true')
args = parser.parse_args()


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Naiwa-Escape-audio-import'}), timeout=30) as response:
        return response.read()


def github(path):
    return BASE + urllib.parse.quote(path, safe='/')


sources = {}
for i in [1, 2]:
    sources[f'crowbarSwing_{i:02d}'] = {'url': github(f'Micro Pack - Organic Wooshes/Classic Swish {i}.wav'),
        'author': 'Benjamin Burnes (Abstraction)', 'page': 'https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/tree/' + COMMIT + '/Micro%20Pack%20-%20Organic%20Wooshes', 'role': 'crowbar-swing'}
for role, indices, names in [
    ('metal-clink', [5, 6], ['metalClink_01', 'metalClink_02']),
    ('metal-clang', [1, 2, 3], ['metalClang_01', 'metalClang_02', 'metalClang_03']),
    ('metal-drop', [1, 2], ['metalDrop_01', 'metalDrop_02']),
    ('glass-break', [1, 2, 4], ['glassBreak_01', 'glassBreak_02', 'glassBreak_03']),
    ('window-break', [5, 6], ['windowBreak_01', 'windowBreak_02']),
]:
    prefix = 'metal_falling' if role == 'metal-drop' else 'metal_hit' if role.startswith('metal') else 'glass_breaking'
    for i, name in zip(indices, names):
        sources[name] = {'url': github(f'75-cc0-breaking-falling-hit-sfx/bfh1_{prefix}_{i:02d}.ogg'),
                         'author': 'rubberduck', 'page': BREAK_PAGE, 'role': role}
sources['ceramicBreak_01'] = {'url': 'https://cdn.freesound.org/previews/583/583310_9395330-hq.mp3',
    'author': 'Fission9', 'page': 'https://freesound.org/people/Fission9/sounds/583310/', 'role': 'ceramic-break'}
sources['ceramicBreak_02'] = {'url': 'https://cdn.freesound.org/previews/623/623130_7243104-hq.mp3',
    'author': 'Brsjak', 'page': 'https://freesound.org/people/Brsjak/sounds/623130/', 'role': 'ceramic-break'}


def load_source(task):
    name, source = task
    extension = Path(urllib.parse.urlparse(source['url']).path).suffix
    original = RAW / f'{name}-source{extension}'
    if not args.offline:
        original.write_bytes(fetch(source['url']))
    return name, original


with ThreadPoolExecutor(max_workers=6) as pool:
    originals = dict(pool.map(load_source, sources.items()))

license_files = {
    'organic-wooshes-LICENSE.txt': github('Micro Pack - Organic Wooshes/_README.txt'),
    'supplemental-CC0-LICENSE.txt': github('LICENSE'),
}
for name, url in license_files.items():
    data = (RAW / name).read_bytes() if args.offline else fetch(url)
    if b'Creative Commons 0' not in data and b'CC0 1.0' not in data:
        raise ValueError(f'Unexpected license: {name}')
    (RAW / name).write_bytes(data)
    (OUT / name).write_bytes(data)

RATE = 32000


def envelope(audio, window=.008):
    count = max(1, round(RATE * window))
    return np.sqrt(np.convolve(audio * audio, np.ones(count) / count, mode='same'))


def filtered(audio, role):
    # Gentle spectral shaping of the recording, retaining real transient and debris detail.
    count = len(audio)
    padded = 1 << (count + 2048 - 1).bit_length()
    spectrum = np.fft.rfft(audio, n=padded)
    frequencies = np.fft.rfftfreq(padded, 1 / RATE)
    if role == 'crowbar-swing':
        weight = (frequencies / (frequencies + 90)) ** 2 / np.sqrt(1 + (frequencies / 6200) ** 6)
        weight *= 1 + .32 * np.exp(-((frequencies - 650) / 550) ** 2)
    elif role.startswith('metal'):
        weight = (frequencies / (frequencies + 65)) ** 2 / np.sqrt(1 + (frequencies / 11500) ** 6)
        weight *= 1 - .24 * np.exp(-((frequencies - 3700) / 1100) ** 2)
    elif role == 'ceramic-break':
        weight = (frequencies / (frequencies + 85)) ** 2 / np.sqrt(1 + (frequencies / 9500) ** 6)
    else:
        weight = (frequencies / (frequencies + 95)) ** 2 / np.sqrt(1 + (frequencies / 14000) ** 6)
    return np.fft.irfft(spectrum * weight, n=padded)[:count].astype('float32')


manifest = json.loads((RAW / 'manifest.json').read_text('utf-8'))
for name, source in sources.items():
    original = originals[name]
    audio, rate = sf.read(original, dtype='float32', always_2d=True)
    audio = audio.mean(axis=1)
    audio -= audio.mean()
    audio = np.interp(np.arange(round(len(audio) * RATE / rate)) * rate / RATE, np.arange(len(audio)), audio).astype('float32')
    role = source['role']
    env = envelope(audio)
    if role == 'crowbar-swing':
        peak = int(env.argmax())
        start, end = max(0, peak - int(.125 * RATE)), min(len(audio), peak + int(.185 * RATE))
    else:
        onset = int(np.flatnonzero(env > env.max() * .12)[0])
        start = max(0, onset - int(.005 * RATE))
        maximum = {'metal-clink': .4, 'metal-clang': .8, 'metal-drop': 1.1,
                   'glass-break': 1.15, 'window-break': 1.65, 'ceramic-break': 1.12}[role]
        # Isolate a single event from the long Brsjak recording.
        if name == 'ceramicBreak_02':
            max_frame = int(env.argmax())
            search = np.flatnonzero(env[:max_frame + 1] > env.max() * .16)
            start = max(0, int(search[0]) - int(.005 * RATE))
        audible = np.flatnonzero(env[start:] > env.max() * .012)
        end = min(len(audio), start + int(maximum * RATE), start + int(audible[-1]) + int(.045 * RATE))
    audio = filtered(audio[start:end], role)
    # Preserve sharp cracks; swishes get a longer rise, while rings get a soft natural tail.
    attack = int(RATE * (.012 if role == 'crowbar-swing' else .001))
    release = min(len(audio) // 4, int(RATE * (.045 if role == 'crowbar-swing' else .075)))
    audio[:attack] *= np.linspace(0, 1, attack)
    audio[-release:] *= np.linspace(1, 0, release)
    audio *= .76 / max(.001, float(np.max(np.abs(audio))))
    output = OUT / f'{name}.wav'
    sf.write(output, audio, RATE, subtype='PCM_16')
    duration = len(audio) / RATE
    peak_time = int(envelope(audio).argmax()) / RATE
    manifest['clips'][name] = {'file': output.name, 'duration': round(duration, 5),
        'source': source['url'], 'sourceFile': original.name,
        'sourceSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
        'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
        'author': source['author'], 'sourcePage': source['page'], 'role': role,
        'peakTime': round(peak_time, 5), 'license': 'CC0-1.0',
        'processing': {'sourceRange': [round(start / RATE, 5), round(end / RATE, 5)], 'sampleRate': RATE, 'mono': True}}
    print(f'{name}: {duration:.3f}s, body peak {peak_time:.3f}s, source at {start / RATE:.3f}s')
manifest['revision'] = '2026-10-16-weighted-swing-real-shatter-v2'
manifest['authors'] = ['Kenney', 'Benjamin Burnes (Abstraction)', 'rubberduck', 'Fission9', 'Brsjak']
manifest['supplementalRepository'] = 'https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds'
manifest['supplementalCommit'] = COMMIT
serialized = json.dumps(manifest, indent=2) + '\n'
(RAW / 'manifest.json').write_text(serialized, encoding='utf-8')
(OUT / 'manifest.json').write_text(serialized, encoding='utf-8')
print(f'Updated {len(sources)} cues, {len(manifest["clips"])} total files, {sum((OUT / v["file"]).stat().st_size for v in manifest["clips"].values()):,} bytes.')
