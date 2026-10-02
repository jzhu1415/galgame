const characterVoiceFiles = [
  '/audio/naiwa-speech.m4a',
  '/audio/naiwa-short-reply.m4a',
  '/audio/character-voice-03.m4a',
  '/audio/character-voice-04.m4a',
] as const

const ROTATION_KEY = 'naiwa-character-voice-rotation-v1'
let remainingVoiceIndices: number[] = []
let lastVoiceIndex = -1

// Preserve the rotation when the page reloads; unavailable storage falls back to memory.
try {
  const raw: unknown = JSON.parse(localStorage.getItem(ROTATION_KEY) ?? 'null')
  if (raw && typeof raw === 'object') {
    const saved = raw as { remaining?: unknown; last?: unknown }
    const validIndex = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < characterVoiceFiles.length
    if (validIndex(saved.last)) {
      lastVoiceIndex = saved.last
      if (Array.isArray(saved.remaining) && saved.remaining.every(validIndex) && new Set(saved.remaining).size === saved.remaining.length && !saved.remaining.includes(lastVoiceIndex)) remainingVoiceIndices = saved.remaining
    }
  }
} catch { /* The clips can still rotate without browser storage. */ }

function refillVoiceRotation() {
  remainingVoiceIndices = characterVoiceFiles.map((_, index) => index)
  for (let i = remainingVoiceIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[remainingVoiceIndices[i], remainingVoiceIndices[j]] = [remainingVoiceIndices[j], remainingVoiceIndices[i]]
  }
  // The next round must not start with the previous round's last clip.
  const next = remainingVoiceIndices.length - 1
  if (remainingVoiceIndices[next] === lastVoiceIndex) {
    ;[remainingVoiceIndices[0], remainingVoiceIndices[next]] = [remainingVoiceIndices[next], remainingVoiceIndices[0]]
  }
}

export function nextCharacterVoice(): string {
  // Naiwa, Naiba, and Naifen share one shuffled round of all four original clips.
  if (remainingVoiceIndices.length === 0) refillVoiceRotation()
  const index = remainingVoiceIndices.pop()!
  lastVoiceIndex = index
  try { localStorage.setItem(ROTATION_KEY, JSON.stringify({ remaining: remainingVoiceIndices, last: lastVoiceIndex })) } catch { /* Keep rotating in memory. */ }
  return characterVoiceFiles[index]
}

export function characterVoiceSequence(longLine: boolean): string[] {
  return longLine ? [nextCharacterVoice(), nextCharacterVoice()] : [nextCharacterVoice()]
}
