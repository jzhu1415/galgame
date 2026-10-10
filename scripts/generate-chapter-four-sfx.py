#!/usr/bin/env python3
"""Bake five quiet chapter-four interaction cues; no external sound samples."""
import math
from pathlib import Path
import random
import struct
import subprocess
import tempfile
import wave

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'public' / 'audio' / 'chapter-04'
RATE = 24000
LENGTHS = {'paint': .48, 'thread-loose': .8, 'thread-tight': .65, 'key-break': .58, 'door-open': 1.5}


def make(name, seconds):
    rng = random.Random(410)
    samples = []
    low = 0.
    for index in range(round(seconds * RATE)):
        t = index / RATE
        noise = rng.uniform(-1, 1)
        low += .035 * (noise - low)
        envelope = min(1, t / .012) * min(1, (seconds - t) / .06)
        if name == 'paint':
            value = .2 * (noise - low) * math.sin(math.pi * t / seconds) ** 2
        elif name == 'thread-loose':
            value = .17 * (math.sin(2 * math.pi * 392 * t) + .4 * math.sin(2 * math.pi * 588 * t)) * math.exp(-t * 6)
        elif name == 'thread-tight':
            phase = 2 * math.pi * (620 * t - 190 * t * t)
            value = .14 * (math.sin(phase) + .25 * math.sin(2.1 * phase)) * math.exp(-t * 5)
        elif name == 'key-break':
            value = .22 * noise * math.exp(-t * 25) + .09 * math.sin(2 * math.pi * 1380 * t) * math.exp(-t * 14)
            if t > .16:
                value += .08 * math.sin(2 * math.pi * 1850 * (t - .16)) * math.exp(-(t - .16) * 22)
        else:
            phase = 2 * math.pi * (100 * t + 28 * t * t)
            value = (.09 * math.sin(phase) + .11 * low) * math.sin(math.pi * t / seconds) ** 2
        samples.append(round(max(-.4, min(.4, value * envelope)) * 32767))
    return struct.pack('<' + 'h' * len(samples), *samples)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='naiwa-four-sfx-') as temp:
        for name, seconds in LENGTHS.items():
            source = Path(temp) / f'{name}.wav'
            with wave.open(str(source), 'wb') as wav:
                wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(RATE)
                wav.writeframes(make(name, seconds))
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source), '-codec:a', 'libmp3lame', '-b:a', '96k', str(OUTPUT / f'{name}.mp3')], check=True)
    print('Chapter four SFX ready: paint, two thread gestures, key break and door opening.')


if __name__ == '__main__':
    main()
