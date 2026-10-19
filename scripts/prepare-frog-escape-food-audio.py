"""Prepare short nonverbal CC0 eating/drinking foley; works offline with retained archives.

Uses numpy and soundfile (the latter can be in tmp/audio-tools). No build-time downloads.
"""
from pathlib import Path
from zipfile import ZipFile
import argparse, hashlib, io, json, subprocess, sys, urllib.request

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tmp/audio-tools'))
import numpy as np
import soundfile as sf

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--offline',action='store_true')
args=parser.parse_args()
RAW=ROOT/'assets/audio/frog-escape'
OUT=ROOT/'public/audio/frog-escape'
archives={
    'crunch_-_tito.zip':('https://opengameart.org/content/7-eating-crunches','Tito / StarNinjas'),
    'qubodup-bottle-and-drink-sounds.7z':('https://opengameart.org/content/liquid-bottle-drink-set','qubodup'),
}
for name in archives:
    if not args.offline and not (RAW/name).exists():
        with urllib.request.urlopen('https://opengameart.org/sites/default/files/'+name,timeout=30)as response:(RAW/name).write_bytes(response.read())

sources=[
    ('eatCrunch_01','crunch_-_tito.zip','crunch.1.ogg',6500,.29),
    ('eatCrunch_02','crunch_-_tito.zip','crunch.3.ogg',4500,.29),
    ('eatChew_01','crunch_-_tito.zip','crunch.6.ogg',1800,.27),
    ('drinkGulp_01','qubodup-bottle-and-drink-sounds.7z','qubodup-bottle-and-drink-sounds/swallow-01.flac',3800,.32),
    ('drinkGulp_02','qubodup-bottle-and-drink-sounds.7z','qubodup-bottle-and-drink-sounds/swallow-03.flac',3000,.34),
]
manifest=json.loads((RAW/'manifest.json').read_text('utf8'))
RATE=32000
for name,archive,member,cutoff,maximum in sources:
    if archive.endswith('.zip'):
        with ZipFile(RAW/archive)as package:data=package.read(member)
    else:
        data=subprocess.run(['tar','-xOf',str(RAW/archive),member],check=True,capture_output=True).stdout
    suffix=Path(member).suffix
    original=RAW/(name+'-source'+suffix);original.write_bytes(data)
    audio,rate=sf.read(io.BytesIO(data),always_2d=True,dtype='float32');audio=audio.mean(axis=1);audio-=audio.mean()
    audio=np.interp(np.arange(round(len(audio)*RATE/rate))*rate/RATE,np.arange(len(audio)),audio)
    window=round(.006*RATE);env=np.sqrt(np.convolve(audio*audio,np.ones(window)/window,mode='same'))
    onset=max(0,int(np.flatnonzero(env>env.max()*.16)[0]) - round(.008*RATE))
    audio=audio[onset:onset+round(maximum*RATE)]
    spectrum=np.fft.rfft(audio);frequency=np.fft.rfftfreq(len(audio),1/RATE)
    spectrum*= (frequency/(frequency+100))**2 / np.sqrt(1+(frequency/cutoff)**6)
    audio=np.fft.irfft(spectrum,n=len(audio));audio*=.65/max(np.max(np.abs(audio)),1e-9)
    fade=round(.012*RATE);audio[:fade]*=np.linspace(0,1,fade);audio[-fade:]*=np.linspace(1,0,fade)
    output=OUT/(name+'.wav');sf.write(output,audio,RATE,subtype='PCM_16')
    page,author=archives[archive]
    manifest['clips'][name]={'file':output.name,'duration':len(audio)/RATE,'source':'https://opengameart.org/sites/default/files/'+archive,'archiveMember':member,
        'sourceFile':original.name,'sourceSha256':hashlib.sha256(data).hexdigest(),'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),
        'license':'CC0-1.0','author':author,'sourcePage':page,'role':'drink' if name.startswith('drink')else'eat','peakTime':int(np.argmax(np.abs(audio)))/RATE}
manifest['revision']='2026-10-17-consumption-foley-v3'
text=json.dumps(manifest,ensure_ascii=False,indent=2)+'\n'
(RAW/'manifest.json').write_text(text,encoding='utf8');(OUT/'manifest.json').write_text(text,encoding='utf8')
license_text='Food foley — CC0 1.0 / public domain. No spoken dialogue.\n\n'+''.join(f'{author}: {page}\n'for page,author in archives.values())
for directory in[RAW,OUT]:(directory/'food-CC0-LICENSE.txt').write_text(license_text,encoding='utf8')
print('Prepared 5 short bite/swallow clips; retained source recordings and archives. Total clips:',len(manifest['clips']))
