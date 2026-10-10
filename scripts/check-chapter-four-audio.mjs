import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { tsModuleUrl } from './ts-module.mjs'

const stored = new Map([['naiwa-chapter-four-v1', '{"node":"welcome","line":2}'], ['naiwa-chapter-four-progress-v1', '{"visited":["threshold"]}']])
const writes = []
globalThis.localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => { writes.push(key); stored.set(key, value) } }
globalThis.window = { addEventListener() {} }
const media = []
let nextPlay = null
globalThis.Audio = class {
  constructor(src) { this.src = src; this.originalSrc = src; this.paused = true; this.ended = false; this.currentTime = 0; this.volume = 1; this.plays = 0; media.push(this) }
  play() { this.paused = false; this.ended = false; this.plays++; const behavior = nextPlay; nextPlay = null; return behavior ? behavior() : Promise.resolve() }
  pause() { this.paused = true }
  removeAttribute() { this.src = '' }
  load() { this.loads = (this.loads ?? 0) + 1 }
  finish() { this.paused = true; this.ended = true; this.onended?.() }
}

const { gildedStory } = await import(tsModuleUrl('src/chapter-four-story.ts'))
const { createGildedAudio, gildedVoiceDescriptor, gildedAudioSettingsKey, gildedAudioEnabledKey } = await import(tsModuleUrl('src/chapter-four-audio.ts'))
const tts = JSON.parse(execFileSync('node', ['scripts/tts-manifest.mjs'], { maxBuffer: 8 * 1024 * 1024 }))
const hashes = JSON.parse(readFileSync('public/audio/tts/manifest.json', 'utf8'))
const chapterTts = tts.filter(entry => entry.path.startsWith('tts/chapter-04-'))
assert.equal(chapterTts.length, 62)
for (const entry of chapterTts) { assert(statSync(`public/audio/${entry.path}`).size > 1024); assert.equal(hashes[entry.path], entry.hash, 'audio matches current script, voice and rate') }
let originals = 0, readings = 0
for (const [node, data] of Object.entries(gildedStory)) {
  if (!data.lines.length) assert.equal(gildedVoiceDescriptor({ node, line: 0 }, 'zh'), null, 'interaction-only nodes have no phantom dialogue')
  data.lines.forEach((line, index) => {
    const save = { node, line: index }, before = JSON.stringify(save)
    const zh = gildedVoiceDescriptor(save, 'zh'), en = gildedVoiceDescriptor(save, 'en')
    if (['naishen', 'naiba'].includes(line.speaker)) { assert(zh.character && en.character); assert.equal(zh.key, en.key); assert.equal(zh.src, null); originals++ }
    else {
      for (const [language, d] of [['zh', zh], ['en', en]]) {
        const entry = chapterTts.find(e => `/audio/${e.path}` === d.src)
        assert.equal(entry.text, line.text[language]); assert(!d.character)
      }
      assert.notEqual(zh.key, en.key); readings++
    }
    assert.equal(JSON.stringify(save), before)
  })
}
assert.equal(readings, 31)
for (const name of ['paint', 'thread-loose', 'thread-tight', 'key-break', 'door-open']) assert(statSync(`public/audio/chapter-04/${name}.mp3`).size > 1024)
const line = (node, index = 0) => ({ node, line: index })
const savesBefore = [...stored.entries()]
let notifications = 0
const sound = createGildedAudio(() => notifications++)
assert.equal(media.length, 0, 'constructing the controller does not create media')
sound.sync(line('welcome'), 'zh')
const first = media.at(-1)
assert.equal(first.src, '/audio/tts/chapter-04-welcome-0-zh.mp3')
assert.equal(first.volume, .85); assert.equal(first.plays, 1)
sound.sync(line('welcome'), 'zh'); assert.equal(first.plays, 1, 'same-line redraw cannot restart speech')
sound.setVoiceVolume(.42); assert.equal(first.volume, .42); assert.equal(first.plays, 1)
sound.toggleVoice(); assert.equal(sound.status, 'paused'); first.currentTime = 2.5
sound.sync(line('welcome'), 'zh'); assert.equal(first.plays, 1, 'redrawing a paused line stays paused')
sound.toggleVoice(); assert.equal(first.currentTime, 2.5); assert.equal(first.plays, 2)
first.finish(); assert.equal(sound.status, 'finished')
sound.sync(line('welcome'), 'zh'); assert.equal(first.plays, 2, 'a finished voice remains finished until replay')
sound.toggleVoice(); assert.equal(first.currentTime, 0); assert.equal(first.plays, 3)
sound.sync(line('welcome'), 'en')
assert(first.paused && first.src === '' && first.onended === null)
assert.equal(media.at(-1).src, '/audio/tts/chapter-04-welcome-0-en.mp3')
sound.sync(line('welcome', 1), 'zh')
const original = media.at(-1), rotation = stored.get('naiwa-character-voice-rotation-v1'), count = media.length
sound.sync(line('welcome', 1), 'en')
assert.equal(media.length, count); assert.equal(original.plays, 1); assert.equal(stored.get('naiwa-character-voice-rotation-v1'), rotation, 'changing subtitles does not rotate original voice')
const round = [original.originalSrc]
for (const save of [line('welcome', 4), line('gallery', 1), line('trial', 1)]) { sound.sync(save, 'zh'); round.push(media.at(-1).originalSrc) }
assert.equal(new Set(round).size, 4, 'all four original clips play before rotation repeats')
sound.setEnabled(false)
const mutedRotation = stored.get('naiwa-character-voice-rotation-v1'), mutedCount = media.length
sound.sync(line('trial', 3), 'zh'); sound.playEffect('paint')
assert.equal(media.length, mutedCount); assert.equal(stored.get('naiwa-character-voice-rotation-v1'), mutedRotation, 'muted lines do not consume character rotation')
sound.setEnabled(true, false); assert.equal(media.length, mutedCount, 'settings enable without previewing audio')
sound.toggleVoice(); assert.equal(media.length, mutedCount + 1)
sound.setEffectVolume(.2); sound.playEffect('paint')
const paint = media.at(-1); assert.equal(paint.volume, .2)
sound.playEffect('thread-loose'); assert(paint.paused && paint.src === '')
const pluck = media.at(-1); sound.pause(); assert(pluck.paused && pluck.src === '', 'panels and background pause voice and clear effects')
assert.equal(sound.status, 'paused')
sound.sync(line('trial', 3), 'zh'); assert.equal(sound.status, 'paused', 'closing panels does not implicitly resume')
sound.setEffectsEnabled(false); const effectsOffCount = media.length
sound.playEffect('paint'); assert.equal(media.length, effectsOffCount)
sound.setEffectsEnabled(true)
sound.sync(line('puzzle'), 'zh'); assert(!sound.hasVoice && sound.status === 'idle')
sound.sync(line('confrontation'), 'zh'); assert.equal(media.at(-1).src, '/audio/chapter-04/key-break.mp3')
const keyCount = media.length
sound.sync(line('confrontation'), 'zh'); assert.equal(media.length, keyCount, 'redraws do not repeat action cues')
sound.sync(line('confrontation'), 'en'); assert.equal(media.length, keyCount + 1, 'switching the same narration to English changes speech without repeating the action cue')
assert.equal(media.at(-1).src, '/audio/tts/chapter-04-confrontation-0-en.mp3')
sound.sync(line('release', 1), 'en'); assert.equal(media.at(-1).src, '/audio/chapter-04/door-open.mp3')

// An old play promise or callback must never change a newer line's state.
let rejectOld
nextPlay = () => new Promise((_resolve, reject) => { rejectOld = reject })
sound.sync(line('welcome'), 'zh'); const stale = media.at(-1), oldError = stale.onerror
sound.sync(line('welcome', 2), 'zh'); const latest = media.at(-1)
rejectOld({ name: 'NotAllowedError' }); oldError(); await Promise.resolve()
assert.equal(sound.status, 'playing'); assert.equal(latest.plays, 1)
nextPlay = () => Promise.reject({ name: 'NotAllowedError' })
sound.sync(line('trial', 1), 'en'); await Promise.resolve()
assert.equal(sound.status, 'blocked')
sound.toggleVoice(); await Promise.resolve(); assert.equal(sound.status, 'playing', 'manual click retries blocked autoplay')
const current = media.at(-1); current.onerror(); assert.equal(sound.status, 'error')
sound.toggleVoice(); await Promise.resolve(); assert.equal(sound.status, 'playing'); assert(current.loads > 0)
sound.setVoiceVolume(100); assert.equal(sound.voiceVolume, 1)
sound.setVoiceVolume(NaN); assert.equal(sound.voiceVolume, 1)
sound.setEffectVolume(-2); assert.equal(sound.effectVolume, 0)
const zeroEffectsCount = media.length; sound.playEffect('paint'); assert.equal(media.length, zeroEffectsCount)
sound.reset(); assert(current.paused && current.src === ''); assert(!sound.hasVoice)
sound.sync(line('trial', 1), 'en'); assert.equal(media.at(-1).plays, 1, 'explicit node replay restarts from its first line')
const departing = media.at(-1), lateEnd = departing.onended
sound.dispose(); const finalNotifications = notifications, finalCount = media.length
assert(departing.paused && departing.src === '' && departing.onerror === null)
lateEnd(); sound.toggleVoice(); sound.sync(line('welcome'), 'zh'); sound.playEffect('paint')
assert.equal(notifications, finalNotifications); assert.equal(media.length, finalCount)
for (const [key, value] of savesBefore) assert.equal(stored.get(key), value, 'audio never modifies story save or checkpoint keys')
assert(writes.every(key => [gildedAudioEnabledKey, gildedAudioSettingsKey, 'naiwa-character-voice-rotation-v1'].includes(key)))
const preferences = createGildedAudio(() => {})
assert.equal(preferences.voiceVolume, 1); assert.equal(preferences.effectVolume, 0); preferences.dispose()
console.log(`Chapter four audio OK: ${readings} bilingual readings / 62 MP3s, ${originals} original-clip lines, 5 cue assets, current hashes, mute and volume, 4-clip rotation, pause/replay, language, stale callbacks, autoplay retry, read-only saves and disposal.`)
