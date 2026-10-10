"""Generate only the new chapters' speech, preserving all existing chapter audio."""
import asyncio
import json
import os
from pathlib import Path
import subprocess
import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'public' / 'audio'
ENTRIES = json.loads(subprocess.check_output(['node', 'scripts/finale-tts-manifest.mjs'], cwd=ROOT))
META = OUTPUT / 'tts' / 'finale-manifest.json'
try:
    hashes = json.loads(META.read_text())
except (FileNotFoundError, json.JSONDecodeError):
    hashes = {}
limit = asyncio.Semaphore(4)
completed = 0

async def generate(entry):
    global completed
    target = OUTPUT / entry['path']
    if target.exists() and target.stat().st_size > 1024 and hashes.get(entry['path']) == entry['hash']:
        return 'cached'
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix('.part')
    async with limit:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(entry['text'], entry['voice'], rate=entry['rate']).save(str(temporary))
                if temporary.stat().st_size <= 1024:
                    raise RuntimeError('Empty speech file')
                os.replace(temporary, target)
                hashes[entry['path']] = entry['hash']
                META.write_text(json.dumps(hashes, ensure_ascii=False, indent=2) + '\n')
                completed += 1
                if completed % 40 == 0:
                    print(f'{completed}/{len(ENTRIES)} new speech files ready', flush=True)
                return 'generated'
            except Exception:
                temporary.unlink(missing_ok=True)
                if attempt == 2:
                    raise
                await asyncio.sleep(1 + attempt * 2)

async def main():
    result = await asyncio.gather(*(generate(entry) for entry in ENTRIES))
    print(f'Finale speech: {len(result)} files; {result.count("generated")} generated, {result.count("cached")} cached', flush=True)

if __name__ == '__main__':
    asyncio.run(main())
