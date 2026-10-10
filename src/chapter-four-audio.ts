import type { Language } from './story'
import { browserStorage } from './browser-storage'
import { characterVoiceSequence } from './character-voice'
import { gildedStory, type GildedSave } from './chapter-four-story'

export type GildedVoiceStatus = 'idle' | 'playing' | 'paused' | 'finished' | 'blocked' | 'error'
export type GildedEffect = 'paint' | 'thread-loose' | 'thread-tight' | 'key-break' | 'door-open'
export const gildedAudioSettingsKey = 'naiwa-chapter-four-audio-v1'
export const gildedAudioEnabledKey = 'naiwa-audio-enabled-v1'
const level = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback

export function gildedVoiceDescriptor(save: Pick<GildedSave, 'node' | 'line'>, language: Language) {
  const line = Object.hasOwn(gildedStory, save.node) ? gildedStory[save.node].lines[save.line] : undefined
  if (!line) return null
  const character = line.speaker === 'naishen' || line.speaker === 'naiba'
  return { key: `${save.node}/${save.line}/${character ? 'original' : language}`, character, src: character ? null : `/audio/tts/chapter-04-${save.node}-${save.line}-${language}.mp3` }
}

export function createGildedAudio(onChange: () => void) {
  let enabled = browserStorage.getItem(gildedAudioEnabledKey) !== 'false'
  let preferences: { voice?: unknown; effects?: unknown; effectsEnabled?: unknown } = {}
  try { const raw = JSON.parse(browserStorage.getItem(gildedAudioSettingsKey) ?? 'null'); if (raw && typeof raw === 'object') preferences = raw } catch { /* Use defaults for old or damaged settings. */ }
  let voiceVolume = level(preferences.voice, .85), effectVolume = level(preferences.effects, .35)
  let effectsEnabled = preferences.effectsEnabled !== false
  let descriptor: ReturnType<typeof gildedVoiceDescriptor> = null
  let voice: HTMLAudioElement | null = null, effect: HTMLAudioElement | null = null
  let status: GildedVoiceStatus = 'idle', disposed = false, playAttempt = 0, positionKey = ''
  const saveSettings = () => browserStorage.setItem(gildedAudioSettingsKey, JSON.stringify({ voice: voiceVolume, effects: effectVolume, effectsEnabled }))
  const release = (audio: HTMLAudioElement | null) => {
    if (!audio) return
    audio.onended = null; audio.onerror = null; audio.pause(); audio.removeAttribute('src'); audio.load()
  }
  const stopEffect = () => { release(effect); effect = null }
  const stopVoice = () => { playAttempt++; release(voice); voice = null; status = 'idle' }
  function pause() {
    playAttempt++
    if (voice && status === 'playing') { voice.pause(); status = 'paused' }
    stopEffect()
    if (!disposed) onChange()
  }
  function play() {
    if (disposed || !enabled || !descriptor) return
    if (!voice) {
      const current = new Audio(descriptor.src ?? characterVoiceSequence(false)[0])
      current.preload = 'auto'
      voice = current
      current.onended = () => { if (voice !== current || disposed) return; playAttempt++; status = 'finished'; onChange() }
      current.onerror = () => { if (voice !== current || disposed) return; playAttempt++; status = 'error'; onChange() }
    }
    const current = voice
    current.volume = voiceVolume
    if (status === 'finished') current.currentTime = 0
    if (status === 'error') current.load()
    status = 'playing'
    const attempt = ++playAttempt
    onChange()
    void current.play().catch(error => {
      if (disposed || voice !== current || attempt !== playAttempt) return
      status = error?.name === 'NotAllowedError' ? 'blocked' : 'error'
      onChange()
    })
  }
  function playEffect(id: GildedEffect) {
    if (disposed || !enabled || !effectsEnabled || effectVolume === 0) return
    stopEffect()
    const current = new Audio(`/audio/chapter-04/${id}.mp3`)
    current.volume = effectVolume
    effect = current
    const finish = () => { if (effect === current) { release(current); effect = null } }
    current.onended = finish; current.onerror = finish
    void current.play().catch(finish)
  }
  return {
    get enabled() { return enabled }, get voiceVolume() { return voiceVolume }, get effectVolume() { return effectVolume },
    get effectsEnabled() { return effectsEnabled }, get status() { return status }, get hasVoice() { return Boolean(descriptor) },
    sync(save: Pick<GildedSave, 'node' | 'line'>, language: Language) {
      if (disposed) return
      const next = gildedVoiceDescriptor(save, language)
      const position = `${save.node}/${save.line}`
      const enteredLine = positionKey !== position
      positionKey = position
      if (next?.key === descriptor?.key) { onChange(); return }
      stopVoice(); stopEffect(); descriptor = next
      if (enabled && next) play()
      else onChange()
      if (enteredLine && save.node === 'tightening' && save.line === 0) playEffect('thread-tight')
      if (enteredLine && save.node === 'confrontation' && save.line === 0) playEffect('key-break')
      if (enteredLine && save.node === 'release' && save.line === 1) playEffect('door-open')
    },
    toggleVoice() { if (status === 'playing') pause(); else play() },
    pause,
    reset() { stopVoice(); stopEffect(); descriptor = null; positionKey = '' },
    setEnabled(next: boolean, autoplay = true) {
      if (disposed) return
      enabled = next; browserStorage.setItem(gildedAudioEnabledKey, String(enabled))
      if (!enabled) pause()
      else if (autoplay) play()
      onChange()
    },
    setVoiceVolume(value: number) { if (disposed) return; voiceVolume = level(value, voiceVolume); if (voice) voice.volume = voiceVolume; saveSettings(); onChange() },
    setEffectVolume(value: number) { if (disposed) return; effectVolume = level(value, effectVolume); if (effect) effect.volume = effectVolume; saveSettings(); onChange() },
    setEffectsEnabled(next: boolean) { if (disposed) return; effectsEnabled = next; if (!next) stopEffect(); saveSettings(); onChange() },
    playEffect,
    dispose() { disposed = true; stopVoice(); stopEffect(); descriptor = null },
  }
}
