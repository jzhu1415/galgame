import assert from 'node:assert/strict'
import { tsModuleUrl } from './ts-module.mjs'

const storage = new Map()
let blocked = false, writes = 0, now = 0, nextTimer = 0
const timers = new Map()
globalThis.localStorage = {
  getItem: key => { if (blocked) throw Error('Storage blocked'); return storage.get(key) ?? null },
  setItem: (key, value) => { if (blocked) throw Error('Storage blocked'); writes++; storage.set(key, value) },
  removeItem: key => storage.delete(key),
}
globalThis.window = { addEventListener() {} }
globalThis.setTimeout = (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, at: now + delay }); return id }
globalThis.clearTimeout = id => timers.delete(id)
const tick = duration => {
  const end = now + duration
  while (true) {
    const next = [...timers].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
    if (!next) break
    now = next[1].at; timers.delete(next[0]); next[1].callback()
  }
  now = end
}
const settings = await import(tsModuleUrl('src/reading-settings.ts'))
const manual = await import(tsModuleUrl('src/chapter-two-saves.ts'))
const ice = await import(tsModuleUrl('src/chapter-two-progress.ts'))
const { browserStorage } = await import(tsModuleUrl('src/browser-storage.ts'))
const save = { ...ice.newIceSave(), line: 3 }
assert.deepEqual(settings.getReadingSettings(), { textSpeed: 0, voiceVolume: 1 })
browserStorage.setItem(ice.iceSaveKey, JSON.stringify(save))
const originalSave = storage.get(ice.iceSaveKey)
settings.updateReadingSettings({ textSpeed: 20, voiceVolume: .25 })
assert.equal(storage.get(ice.iceSaveKey), originalSave, 'Reading settings cannot change chapter progress')
assert.deepEqual(settings.normalizeReadingSettings({ textSpeed: Infinity, voiceVolume: -1 }), { textSpeed: 0, voiceVolume: 0 })
assert.deepEqual(settings.normalizeReadingSettings({ textSpeed: 500, voiceVolume: 8 }), { textSpeed: 60, voiceVolume: 1 })
for (const language of ['zh', 'en']) {
  const html = settings.renderReadingControls(language, 'test')
  assert(html.includes('test-text-speed') && html.includes('test-voice-volume') && html.includes('25%'))
}
const reader = settings.createDialogueReader(), element = { textContent: '' }
reader.bind(element, 'one', '冰🧊镜')
assert.equal(element.textContent, '')
tick(50); assert.equal(element.textContent, '冰')
reader.bind(element, 'one', '冰🧊镜'); assert.equal(element.textContent, '冰', 'Re-rendering keeps the revealed position')
tick(50); assert.equal(element.textContent, '冰🧊')
reader.pause(); tick(1000); assert.equal(element.textContent, '冰🧊')
reader.resume(); tick(50); assert.equal(element.textContent, '冰🧊镜'); assert(reader.complete)
reader.bind(element, 'two', '下一句'); assert(reader.finish()); assert.equal(element.textContent, '下一句'); assert.equal(reader.finish(), false)
reader.bind(element, 'three', '下一段'); reader.clear(); tick(1000); assert.equal(timers.size, 0)
settings.updateReadingSettings({ textSpeed: 0 }); reader.bind(element, 'instant', '完整对白'); assert.equal(element.textContent, '完整对白')

assert(manual.writeIceManualSave(0, save))
save.line = 6
assert.equal(manual.loadIceManualSaves()[0].state.line, 3, 'Saving makes an independent copy')
const fragment = { ...ice.newIceSave(), phase: 'map', approach: 'restore', clues: ['note', 'footage'], pendingFragment: { id: 'footage', line: 2 } }
assert(manual.writeIceManualSave(1, fragment))
assert.deepEqual(manual.loadIceManualSaves()[1].state.pendingFragment, { id: 'footage', line: 2 })
const ending = { ...ice.newIceSave(), phase: 'ending', line: 4, approach: 'restore', response: 'trust', completed: true, clues: [...ice.iceClues] }
assert(manual.writeIceManualSave(2, ending))
assert.equal(manual.loadIceManualSaves()[2].state.line, 4)
const beforeInvalid = writes
assert.equal(manual.writeIceManualSave(-1, save), false); assert.equal(manual.writeIceManualSave(3, save), false)
assert.equal(writes, beforeInvalid)
const progress = ice.newIceProgress(); ice.recordIceCheckpoint(progress, fragment, 'footage')
progress.endings.push('ending-trust')
const restoredProgress = ice.normalizeIceProgress(progress, manual.loadIceManualSaves()[0].state)
assert(restoredProgress.visited.includes('footage') && restoredProgress.endings.includes('ending-trust'), 'Loading an older manual state retains cumulative unlocks')
blocked = true
assert.equal(manual.writeIceManualSave(0, { ...save, line: 5 }), false)
assert.equal(manual.loadIceManualSaves()[0].state.line, 5, 'Unavailable persistent storage retains a session save')
settings.updateReadingSettings({ voiceVolume: .6 }); assert.equal(settings.getReadingSettings().voiceVolume, .6)
assert.equal(browserStorage.getItem(ice.iceSaveKey), originalSave)
console.log('Reading tools OK: shared controls, live volume preferences, typing/rebind/pause/disposal, independent slots, precise fragment restore, unlock retention and blocked-storage fallback.')
