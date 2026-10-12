import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tsModuleUrl } from './ts-module.mjs'
const { finaleDialogueTheme, renderFinaleDialogueFrame, renderFinaleMapDamage } = await import(tsModuleUrl('src/finale-dialogue-ui.ts'))
const { newFinaleSave, completeFinaleFilm, finaleStories } = await import(tsModuleUrl('src/finale-story.ts'))
const save = newFinaleSave(5)
const intact = { ...save, node: 'f6-battle-film', line: 0 }
const before = structuredClone(intact)
assert.equal(finaleDialogueTheme(intact).damaged, false, 'The battle film has an intact frame')
assert(!renderFinaleDialogueFrame(intact).includes('finale-frame-fractures'))
const aftermath = completeFinaleFilm(intact)
assert.equal(aftermath.node, 'f6-post-film')
assert(aftermath.flags.includes('film-completed'))
assert.equal(finaleDialogueTheme(aftermath).damaged, true, 'Both ending the film and explicitly skipping it use the same completion path')
assert(renderFinaleDialogueFrame(aftermath).includes('finale-frame-fractures'))
assert.deepEqual(intact, before, 'Presentation never mutates its checkpoint')
const stages = ['f6-post-film', 'f6-injury-reveal', 'f6-ruin-search', 'f6-naiba-farewell', 'f6-naiba-sacrifice', 'f6-revival', 'f6-resolution', 'f6-ending-reconcile', 'f6-ending-sever', 'f6-ending-captured', 'f6-ending-cradle']
for (const node of stages) {
  assert(finaleStories[5][node])
  assert.equal(finaleDialogueTheme({ ...aftermath, node }).damaged, true, node + ': damage persists through the aftermath')
  assert.equal(finaleDialogueTheme({ ...aftermath, node, flags: [] }).damaged, false, 'Artwork or a node name alone cannot trigger damage')
}
for (const node of ['f5-descent', 'f5-cat-ambush', 'f6-rooftop', 'f6-body-awake', 'f6-battle-film']) {
  assert.equal(finaleDialogueTheme({ ...aftermath, node }).damaged, false, 'A stale completion flag must not damage a pre-film scene')
}
assert.equal(finaleDialogueTheme({ ...save, visited: ['f6-post-film'] }).damaged, false, 'Historical unlocks do not change the current checkpoint theme')
const frame = renderFinaleDialogueFrame(aftermath)
assert(frame.includes('aria-hidden="true"') && frame.includes('focusable="false"'))
assert(!frame.includes('<button') && !frame.includes('tabindex'), 'Damage decorations cannot trap focus')
const source = readFileSync('src/finale.ts', 'utf8')
assert(source.includes('finaleDialogueTheme(save)') && source.includes('renderFinaleDialogueFrame(save)'))
const css = readFileSync('src/finale-dialogue.css', 'utf8')
assert(css.includes('pointer-events: none') && css.includes('prefers-reduced-motion'))
assert(css.includes('.finale-frame-skin') && css.includes('.finale-dialogue-v2 button:focus-visible'))
// The real map dialog uses the same checkpoint phase in previews and gameplay.
const { showFinaleStoryMap } = await import(tsModuleUrl('src/finale-map.ts'))
let focuses = 0, selections = 0
const host = { dialogs: [], append(dialog) { this.dialogs.push(dialog) } }
const focus = { isConnected: true, focus() { focuses++ } }
globalThis.document = {
  activeElement: focus, getElementById: () => host,
  createElement: () => {
    const listeners = new Map()
    return {
      dataset: {}, open: false, removed: false,
      setAttribute() {},
      // Shared canvas mechanics are covered separately by check:story-map-ui.
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener(name, callback) { listeners.set(name, callback) },
      showModal() { this.open = true },
      close() { this.open = false; listeners.get('close')?.() },
      remove() { this.removed = true },
    }
  },
}
const progress = { version: 1, chapter: 5, checkpoints: {}, visited: [], endings: [] }
for (const language of ['zh', 'en']) {
  for (const current of [save, aftermath, { ...aftermath, node: 'f5-descent' }]) {
    const snapshot = JSON.stringify({ current, progress })
    const damaged = finaleDialogueTheme(current).damaged
    const dialog = showFinaleStoryMap(host, language, current, progress, () => { selections++ })
    assert(dialog.className.includes('finale-themed-map'))
    assert.equal(dialog.className.includes('is-battle-scarred'), damaged)
    assert.equal(dialog.innerHTML.includes('finale-map-scars'), damaged)
    assert(dialog.innerHTML.includes('map-viewport') && dialog.innerHTML.includes('map-lines'))
    assert.equal(dialog.lang, language === 'zh' ? 'zh-CN' : 'en')
    assert.equal(JSON.stringify({ current, progress }), snapshot, 'The themed map is read-only')
    dialog.close(); assert(dialog.removed)
  }
}
assert.equal(focuses, 6)
assert.equal(selections, 0, 'Theme changes cannot select a story node')
assert.equal(renderFinaleMapDamage(save), '')
assert(renderFinaleMapDamage(aftermath).includes('focusable="false"'))
console.log('Finale dialogue and map UI OK: shared pre/post-film theme, checkpoint restoration, immutable previews, native close/focus and inert damage decorations.')
