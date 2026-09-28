const characterVoiceFiles = [
  '/audio/naiwa-speech.m4a',
  '/audio/naiwa-short-reply.m4a',
  '/audio/character-voice-03.m4a',
  '/audio/character-voice-04.m4a',
] as const

let lastVoiceIndex = -1

export function nextCharacterVoice(): string {
  // All four clips are shared by naiwa and Naiba; avoid the same clip twice in a row.
  let index = Math.floor(Math.random() * (characterVoiceFiles.length - (lastVoiceIndex < 0 ? 0 : 1)))
  if (lastVoiceIndex >= 0 && index >= lastVoiceIndex) index++
  lastVoiceIndex = index
  return characterVoiceFiles[index]
}

export function characterVoiceSequence(longLine: boolean): string[] {
  return longLine ? [nextCharacterVoice(), nextCharacterVoice()] : [nextCharacterVoice()]
}
