import assert from 'node:assert/strict'
import { compile, moduleUrl, tsModuleUrl } from './ts-module.mjs'
const storage = new Map()
let writes = 0, plays = 0, current, confirmSelection, confirmations = 0
// These controllers own only a dialog; all gameplay/Audio/iframe APIs are absent.
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { writes++; storage.set(key, value) } }
globalThis.confirmPreview = (_root, _message, _language, callback) => { confirmations++; confirmSelection = callback }
const iceProgressUrl = tsModuleUrl('src/chapter-two-progress.ts')
const thirdStoryUrl = tsModuleUrl('src/chapter-three-story.ts')
const thirdProgressUrl = tsModuleUrl('src/chapter-three-progress.ts')
const { renderIceMindMap } = await import(tsModuleUrl('src/chapter-two-map.ts'))
const { renderTheatreMindMap } = await import(tsModuleUrl('src/chapter-three-map.ts'))
globalThis.previewIceMap = (_root, language, save, progress, onSelect) => {
  current = { content: renderIceMindMap(save, progress, language), closed: false, close() { this.closed = true }, select: onSelect }
  return current
}
globalThis.previewTheatreMap = (_root, language, save, progress, onSelect) => {
  current = { content: renderTheatreMindMap(save, progress, language), closed: false, close() { this.closed = true }, select: onSelect }
  return current
}
const stripImports = js => js.replace(/^import .*;\n/gm, '')
const base = `const browserStorage = globalThis.localStorage; const confirmInApp = globalThis.confirmPreview;\n`
const second = await import(moduleUrl(`${base}const showIceStoryMap = globalThis.previewIceMap;\nconst { iceSaveKey: KEY, iceProgressKey: PROGRESS_KEY, fragmentIds, newIceSave: blank, normalizeIceSave, normalizeIceProgress, recordIceCheckpoint, restartIceFrom } = await import(${JSON.stringify(iceProgressUrl)});\n${stripImports(compile('src/chapter-two.ts'))}`))
const third = await import(moduleUrl(`${base}const showTheatreStoryMap = globalThis.previewTheatreMap;\nconst { newTheatreSave, normalizeTheatreSave, theatreStory } = await import(${JSON.stringify(thirdStoryUrl)});\nconst { newTheatreProgress, normalizeTheatreProgress, recordTheatreCheckpoint, restartTheatreFrom } = await import(${JSON.stringify(thirdProgressUrl)});\n${stripImports(compile('src/chapter-three.ts'))}`))
for (const language of ['zh', 'en']) {
  for (const [preview, locked, initial, key] of [
    [second.previewChapterTwoRoutes, 'core', 'hospital', 'naiwa-chapter-two-v1'],
    [third.previewChapterThreeRoutes, 'saved', 'invitation', 'naiwa-chapter-three-v1'],
  ]) {
    writes = 0; plays = 0
    preview({}, language, () => plays++)
    assert(current.content.includes('map-viewport') && current.content.includes('mind-node') && current.content.includes('ending-gallery'))
    assert.equal(writes, 0, 'opening a preview must not save')
    assert.equal(plays, 0, 'opening a preview must not start gameplay')
    current.close()
    assert.equal(writes, 0, 'closing a preview must not save')
    preview({}, language, () => plays++)
    const beforeConfirm = confirmations
    current.select(locked)
    assert.equal(confirmations, beforeConfirm, 'locked nodes cannot ask to enter gameplay')
    current.select(initial)
    assert.equal(confirmations, beforeConfirm + 1)
    assert.equal(plays, 0, 'node selection waits for confirmation')
    assert.equal(writes, 0, 'a pending confirmation cannot change saves')
    confirmSelection = null // Cancel the confirmation.
    assert.equal(current.closed, false)
    current.select(initial)
    confirmSelection()
    assert(current.closed)
    assert.equal(plays, 1)
    assert.equal(writes, 2, 'entry saves the checkpoint and cumulative unlocks')
    const restored = JSON.parse(storage.get(key))
    assert.equal(restored.node ?? restored.phase, initial)
    assert.equal(restored.line, 0)
    assert.deepEqual(restored.history, [])
  }
}
// Legacy saves prove arrival but do not grant a fictional replay checkpoint.
for (const [preview, key, save, node] of [
  [second.previewChapterTwoRoutes, 'naiwa-chapter-two-v1', { version: 1, phase: 'core', line: 6, clues: ['footage', 'shard', 'echo', 'route'], approach: 'restore', history: [] }, 'core'],
  [third.previewChapterThreeRoutes, 'naiwa-chapter-three-v1', { version: 1, node: 'rain', line: 2, spirit: 68, pollution: 10, memories: [], visited: ['invitation', 'rain'], history: [], endings: [] }, 'rain'],
  [second.previewChapterTwoRoutes, 'naiwa-chapter-two-v1', { version: 1, phase: 'map', line: 0, clues: ['footage', 'note'], approach: 'restore', history: [] }, 'map'],
  [third.previewChapterThreeRoutes, 'naiwa-chapter-three-v1', { version: 1, node: 'explore', line: 0, spirit: 68, pollution: 10, memories: ['rain'], visited: ['invitation', 'rain', 'explore'], history: [], endings: [] }, 'explore'],
]) {
  storage.clear(); storage.set(key, JSON.stringify(save)); writes = 0
  preview({}, 'zh', () => plays++)
  const beforeConfirm = confirmations
  current.select(node)
  assert.equal(confirmations, beforeConfirm)
  assert.equal(writes, 0)
}
console.log('Route previews OK: shared maps in both languages; opening/closing is read-only; locked and legacy nodes stay gated; replay requires confirmation.')
