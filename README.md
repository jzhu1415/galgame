# Naiwa

**Naiwa — The Redemption** is a Chinese-English browser visual novel about love, trust, and lost memories. A chance meeting on a rainy night grows into a relationship, then leads into a strange inner world. Everyday romance gives way to investigation, memory puzzles, and choices that shape how the story unfolds.

**[Play the demo](https://galgame-ashy.vercel.app)** · [Run locally](#run-locally)

![Naiwa in a rainy alley](public/images/P02.webp)

## Story

- **Chapter One: Origin** — Meet Naiwa, share everyday moments, and search a mistbound fairground for lost memories.
- **Chapter Two: The Culprit in the Ice** — Follow clues from a hospital into a frozen mirror hall, exploring in 3D to recover fragments of the truth.
- **Chapter Three: The Crimson Bargain** — Meet Naifen in the Flesh Theatre, investigate conflicting memories, and face a difficult bargain.
- **Romance DLC: A Letter from the Tide** — Take a separate two-day coastal trip with Naiwa, with four date chapters, interactive puzzles, and endings shaped by your shared experiences.

The repository includes all three main chapters and the coastal DLC. Development is ongoing; the hosted demo may differ from the latest source version.

## Features

- Chinese and English dialogue, with language switching that preserves your progress.
- Branching choices, multiple endings, an interactive story map, and replay of unlocked scenes.
- Memory collection, spirit management, illustrated object puzzles, and a Three.js exploration level.
- Scene illustrations, character recordings, and prerecorded protagonist and narrator voices in supported scenes.
- Dialogue history, browser autosaves, independent chapter and DLC progress, and fullscreen play.
- Desktop and touch controls, including a mobile joystick for 3D exploration.

## How to play

Click to advance dialogue, select a response, or inspect highlighted objects. Use the story map to explore unlocked branches and the dialogue history to revisit earlier conversations.

In the mirror hall, use **WASD** to move, the **mouse** to look around, and **E** to collect nearby clues. On mobile, use the joystick and touch view controls.

The first launch follows your system language: Chinese for Chinese locales, English otherwise. You can switch languages from the game controls. Saves and unlocks stay in the current browser.

The coastal DLC is available from Chapter One's detail page. Unlock it by watching the video three complete times or entering an access key. It has its own save and does not require finishing the main story.

## Run locally

Requires **Node.js 22.12+** or **Node.js 20.19+ (20.x)**, and npm.

```bash
git clone https://github.com/jzhu1415/galgame.git
cd galgame
npm install
npm run dev
```

Open the local URL printed by Vite. On macOS, you can also launch the game with [`打开游戏.command`](打开游戏.command). The source files need Vite's local server to load correctly.

Build and preview the static site:

```bash
npm run build
npm run preview
```

The production output is written to `dist/` and can be hosted on a static website platform.

## Development

Built with **TypeScript, Vite, and Three.js**.

| Directory | Contents |
| --- | --- |
| `src/` | Bilingual stories, game logic, interfaces, and the 3D level |
| `public/` | Web images, audio, and video |
| `assets/` | Original artwork and recordings |
| `references/` | Character identity and turnaround references |
| `docs/` | Worldbuilding, storyboards, and production notes |
| `scripts/` | Story checks and voice generation tools |

Run `npm run check:story`, `npm run check:chapter-three`, and `npm run check:romance-dlc` to validate story routes and assets. Additional checks cover route previews, DLC unlocking, release notes, and the mirror hall; see `package.json` for the full list.

Contributor conventions are in [AGENTS.md](AGENTS.md). Major game updates should include a new version ID and bilingual player notes in `src/release-notes.ts`. Story and production documents in `docs/` contain spoilers.
