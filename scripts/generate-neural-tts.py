#!/usr/bin/env python3
"""Generate the game's bilingual, pre-rendered neural dialogue audio."""

import asyncio
import json
import os
from pathlib import Path
import subprocess
import sys

try:
    import edge_tts
except ImportError as exc:
    raise SystemExit("Install TTS dependencies: python3 -m pip install -r scripts/requirements-tts.txt") from exc

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "public" / "audio"
manifest = json.loads(subprocess.check_output(["node", "scripts/tts-manifest.mjs"], cwd=ROOT))
semaphore = asyncio.Semaphore(3)
metadata_path = OUTPUT / "tts" / "manifest.json"
try:
    cached_hashes = json.loads(metadata_path.read_text())
except (FileNotFoundError, json.JSONDecodeError):
    cached_hashes = {}


async def generate(entry):
    target = OUTPUT / entry["path"]
    if target.exists() and target.stat().st_size > 1024 and cached_hashes.get(entry["path"]) == entry["hash"]:
        return "cached"
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".part")
    async with semaphore:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(entry["text"], entry["voice"], rate=entry["rate"]).save(str(temporary))
                if temporary.stat().st_size <= 1024:
                    raise RuntimeError("No usable audio was returned")
                os.replace(temporary, target)
                return "generated"
            except Exception:
                temporary.unlink(missing_ok=True)
                if attempt == 2:
                    raise
                await asyncio.sleep(1 + attempt * 2)


async def main():
    results = await asyncio.gather(*(generate(entry) for entry in manifest))
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = metadata_path.with_suffix(".part")
    temporary.write_text(json.dumps({entry["path"]: entry["hash"] for entry in manifest}, indent=2) + "\n")
    os.replace(temporary, metadata_path)
    print(f"TTS ready: {len(results)} files ({results.count('generated')} generated, {results.count('cached')} cached)")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"TTS generation failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
