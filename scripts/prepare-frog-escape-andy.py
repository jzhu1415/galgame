"""Extract the user-supplied Andy call locally; no speech synthesis or downloads.

Pass --source on first import. Later runs use the retained source video.
Requires numpy and ffmpeg (or the optional local imageio-ffmpeg helper).
"""
from pathlib import Path
import argparse, hashlib, io, json, shutil, subprocess, sys, wave

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tmp/audio-tools'))
import numpy as np

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source',type=Path)
parser.add_argument('--ffmpeg')
args=parser.parse_args()
raw=ROOT/'assets/audio/frog-escape'
out=ROOT/'public/audio/frog-escape'
movie=raw/'naiwaAndy-source.mp4'
if args.source and args.source.resolve()!=movie.resolve():
    shutil.copyfile(args.source,movie)
exe=args.ffmpeg or shutil.which('ffmpeg')
if not exe:
    import imageio_ffmpeg
    exe=imageio_ffmpeg.get_ffmpeg_exe()
rate=32000
pcm=subprocess.run([exe,'-v','error','-i',str(movie),'-map','0:a:0','-vn','-ac','1','-ar',str(rate),'-f','f32le','pipe:1'],check=True,capture_output=True).stdout
audio=np.frombuffer(pcm,dtype='<f4').astype(np.float64)
def wav_bytes(samples):
    result=io.BytesIO()
    with wave.open(result,'wb')as file:
        file.setnchannels(1);file.setsampwidth(2);file.setframerate(rate)
        file.writeframes(np.clip(np.rint(samples*32767),-32768,32767).astype('<i2').tobytes())
    return result.getvalue()
source=wav_bytes(audio)
(raw/'naiwaAndy-source.wav').write_bytes(source)
audio-=audio.mean()
window=round(.008*rate)
envelope=np.sqrt(np.convolve(audio*audio,np.ones(window)/window,mode='same'))
audible=np.flatnonzero(envelope>max(.002,float(envelope.max())*.035))
if not len(audible):raise ValueError('Source has no audible call')
start=max(0,int(audible[0])-round(.035*rate))
end=min(len(audio),int(audible[-1])+round(.075*rate))
clip=audio[start:end].copy()
clip*=.74/max(float(np.abs(clip).max()),1e-9)
fade=round(.005*rate)
clip[:fade]*=np.linspace(0,1,fade);clip[-fade:]*=np.linspace(1,0,fade)
published=wav_bytes(clip)
(out/'naiwaAndy.wav').write_bytes(published)
manifest=json.loads((raw/'manifest.json').read_text('utf8'))
manifest['revision']='2026-10-18-naiwa-andy-v4'
manifest['license']='Mixed; see individual clips'
manifest['clips']['naiwaAndy']={
    'file':'naiwaAndy.wav','duration':round(len(clip)/rate,6),
    'source':'User-supplied video 066f3fd56dfe0573a2774408a4bb6ba0.mp4',
    'sourceFile':'naiwaAndy-source.wav','sourceSha256':hashlib.sha256(source).hexdigest(),
    'sourceVideo':'naiwaAndy-source.mp4','sourceVideoSha256':hashlib.sha256(movie.read_bytes()).hexdigest(),
    'sha256':hashlib.sha256(published).hexdigest(),'license':'User-provided; not CC0',
    'author':'User-provided recording','sourcePage':'User attachment: 066f3fd56dfe0573a2774408a4bb6ba0.mp4',
    'role':'naiwa-capture-call','trim':[round(start/rate,6),round(end/rate,6)],
    'peakTime':round(int(np.argmax(np.abs(clip)))/rate,6),
}
text=json.dumps(manifest,ensure_ascii=False,indent=2)+'\n'
(raw/'manifest.json').write_text(text,encoding='utf8');(out/'manifest.json').write_text(text,encoding='utf8')
notice='Naiwa Andy call: extracted from the video supplied by the user for this game.\nThis recording is not represented as CC0. Existing CC0 foley retains its individual license.\nOriginal attachment: 066f3fd56dfe0573a2774408a4bb6ba0.mp4\nRetained local video: assets/audio/frog-escape/naiwaAndy-source.mp4\nProcessing: mono 32kHz PCM, exterior silence trim, DC removal, peak normalization and 5ms fades. No pitch changes or synthesis.\n'
for folder in [raw,out]:(folder/'user-provided-audio-NOTICE.txt').write_text(notice,encoding='utf8')
print(json.dumps({'name':'naiwaAndy','duration':len(clip)/rate,'trim':[start/rate,end/rate],'bytes':len(published),'peak':float(np.abs(clip).max())}))
