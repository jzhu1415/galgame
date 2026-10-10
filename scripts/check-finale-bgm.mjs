import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { tsModuleUrl } from './ts-module.mjs'

let now = 0, nextFrame = 0
const frames = new Map(), media = []
globalThis.performance = { now: () => now }
globalThis.window = {
  requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame },
  cancelAnimationFrame(id) { frames.delete(id) },
}
function tick(ms = 1100) {
  now += ms
  const pending = [...frames.values()]; frames.clear()
  pending.forEach(callback => callback(now))
}
let nextPlay = null
globalThis.Audio = class {
  constructor(src) { this.src = src; this.paused = true; this.volume = 1; this.currentTime = 0; this.duration = 100; this.plays = 0; media.push(this) }
  play() { this.plays++; const action = nextPlay; nextPlay = null; this.paused = false; return action ? action(this) : Promise.resolve() }
  pause() { this.paused = true }
  removeAttribute() { this.src = '' }
  load() {}
  finish() { this.paused = true; this.onended?.() }
}
const { createFinaleBgm, finaleBgmSrc, finaleBgmVolume, finaleBgmDialogueVolume } = await import(tsModuleUrl('src/finale-bgm.ts'))
assert(statSync('public' + finaleBgmSrc).size > 1024)
assert(readFileSync('src/finale-promo.ts', 'utf8').includes(finaleBgmSrc), 'aftermath uses the existing website track')
assert.equal(finaleBgmVolume, .12)
assert.equal(finaleBgmDialogueVolume, .07)
const bgm = createFinaleBgm()
const state = { node: 'f5-descent', filmCompleted: false, enabled: true, dialoguePlaying: false, suspended: false }
const sync = changes => { Object.assign(state, changes); bgm.sync(state) }
assert.equal(media.length, 0, 'preview imports and controller creation do not create media')
sync({ node: 'f6-battle-film' }); assert.equal(media.length, 0, 'the film has no overlapping music')
sync({ node: 'f6-post-film' }); assert.equal(media.length, 0, 'aftermath requires film completion')
sync({ filmCompleted: true }); await Promise.resolve(); tick()
const track = media.at(-1)
assert.equal(track.volume, .12); assert.equal(track.plays, 1)
track.currentTime = 19
sync({ node: 'f6-injury-reveal', dialoguePlaying: true }); tick()
assert.equal(track.volume, .07); assert.equal(track.currentTime, 19)
assert.equal(track.plays, 1, 'new dialogue and language redraws cannot restart the track')
sync({}); tick(); assert.equal(track.plays, 1)
sync({ dialoguePlaying: false }); tick(); assert.equal(track.volume, .12)
sync({ suspended: true }); bgm.retry()
assert(track.paused && track.volume === 0 && track.plays === 1, 'menus and hidden pages silence the theme')
sync({ suspended: false }); await Promise.resolve(); tick()
assert.equal(track.plays, 2); assert.equal(track.currentTime, 19)
sync({ enabled: false }); bgm.retry(); assert(track.paused && track.volume === 0)
sync({ enabled: true }); await Promise.resolve(); tick()
assert.equal(track.volume, .12)
track.currentTime = 99; track.ontimeupdate(); tick()
assert.equal(track.volume, 0, 'loop ending fades out')
track.finish(); await Promise.resolve(); tick()
assert.equal(track.currentTime, 0); assert.equal(track.volume, .12)
sync({ node: 'f6-ending-cradle' }); assert(!track.paused)
sync({ node: 'f6-battle-film' }); assert(track.paused && track.src === '' && track.onended === null)
const count = media.length
sync({ node: 'f5-descent' }); assert.equal(media.length, count, 'replay before the film releases music')

nextPlay = element => { element.paused = true; return Promise.reject({ name: 'NotAllowedError' }) }
sync({ node: 'f6-revival' }); await Promise.resolve(); await Promise.resolve()
const blocked = media.at(-1)
assert(blocked.paused)
bgm.retry(); await Promise.resolve(); tick()
assert(!blocked.paused && blocked.volume === .12, 'a player gesture retries blocked autoplay')
sync({ enabled: false })
let resolveOld
nextPlay = () => new Promise(resolve => { resolveOld = resolve })
sync({ enabled: true })
bgm.dispose(); resolveOld(); await Promise.resolve(); tick()
assert(blocked.paused && blocked.src === '' && blocked.onended === null && blocked.ontimeupdate === null)
assert.equal(frames.size, 0, 'late playback promises cannot resurrect a disposed theme')
const finalCount = media.length
bgm.retry(); sync({ enabled: true }); assert.equal(media.length, finalCount)
console.log('Finale BGM OK: existing track, aftermath only, 12% / 7% under dialogue, continuous playback, quiet loop, mute, menu/background pause, autoplay retry, replay and disposal.')
