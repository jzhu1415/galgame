import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const compile = file => ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const url = js => `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
const storage = new Map()
let writes = 0
let plays = 0
let current
// Preview controllers use dialog stubs: no game, Three.js, DOM or Audio initialization.
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { writes++; storage.set(key, value) } }
globalThis.previewDialog = (_root, _language, _title, content) => {
  const buttons = new Map()
  const button = key => {
    if (!buttons.has(key)) buttons.set(key, { dataset: { iceRoute: key }, addEventListener: (_event, callback) => { buttons.get(key).click = callback } })
    return buttons.get(key)
  }
  current = { content, closed: false, close() { this.closed = true }, querySelectorAll() { return [...content.matchAll(/data-ice-route="([^"]+)"/g)].map(match => button(match[1])) }, querySelector(selector) { return button(selector) }, buttons }
  return current
}
const stripImports = js => js.replace(/^import .*;\n/gm, '')
const second = await import(url(`const showChapterRoutePreview = globalThis.previewDialog;\n${stripImports(compile('src/chapter-two.ts'))}`))
const thirdStoryUrl = url(compile('src/chapter-three-story.ts'))
const thirdProgressUrl = url(compile('src/chapter-three-progress.ts').replace(/(['"])\.\/chapter-three-story\1/g, JSON.stringify(thirdStoryUrl)))
const canvasUrl = url(compile('src/story-map.ts'))
const thirdMapUrl = url(compile('src/chapter-three-map.ts').replace(/(['"])\.\/chapter-three-story\1/g, JSON.stringify(thirdStoryUrl)).replace(/(['"])\.\/story-map\1/g, JSON.stringify(canvasUrl)))
const { renderTheatreMindMap } = await import(thirdMapUrl)
let confirmSelection
let confirmations = 0
globalThis.confirmPreview = (_root, _message, _language, callback) => { confirmations++; confirmSelection = callback }
globalThis.previewMap = (_root, language, save, progress, onSelect) => {
  current = { content: renderTheatreMindMap(save, progress, language), closed: false, close() { this.closed = true }, select: onSelect }
  return current
}
const third = await import(url(`const showTheatreStoryMap = globalThis.previewMap;\nconst confirmInApp = globalThis.confirmPreview;\nconst { newTheatreSave, normalizeTheatreSave, theatreStory } = await import(${JSON.stringify(thirdStoryUrl)});\nconst { newTheatreProgress, normalizeTheatreProgress, recordTheatreCheckpoint, restartTheatreFrom } = await import(${JSON.stringify(thirdProgressUrl)});\n${stripImports(compile('src/chapter-three.ts'))}`))
for (const language of ['zh', 'en']) {
  writes = 0; plays = 0
  second.previewChapterTwoRoutes({}, language, () => plays++)
  assert(current.content.includes('ice-route-tree'))
  assert.equal(writes, 0, 'opening chapter two preview must not save')
  assert.equal(plays, 0, 'opening chapter two preview must not start gameplay')
  current.buttons.get('core').click()
  assert.equal(plays, 0, 'locked phase must not start gameplay')
  current.close()
  assert.equal(writes, 0, 'closing preview must not save')
  second.previewChapterTwoRoutes({}, language, () => plays++)
  current.buttons.get('hospital').click()
  assert(current.closed)
  assert.equal(plays, 1, 'explicitly selecting an unlocked phase starts gameplay')
  assert.equal(writes, 1)
  writes = 0; plays = 0
  third.previewChapterThreeRoutes({}, language, () => plays++)
  assert(current.content.includes('map-viewport') && current.content.includes('mind-node') && current.content.includes('ending-gallery'))
  assert.equal(writes, 0, 'opening chapter three preview must not save')
  assert.equal(plays, 0, 'opening chapter three preview must not start gameplay')
  current.close()
  assert.equal(writes, 0)
  third.previewChapterThreeRoutes({}, language, () => plays++)
  const beforeConfirm = confirmations
  current.select('saved')
  assert.equal(confirmations, beforeConfirm, 'locked nodes cannot ask to enter gameplay')
  current.select('invitation')
  assert.equal(confirmations, beforeConfirm + 1)
  assert.equal(plays, 0, 'selecting an unlocked node waits for confirmation')
  assert.equal(writes, 0, 'no save is changed while confirmation is pending')
  // Cancel by dismissing the callback, then choose the same node again.
  confirmSelection = null
  assert.equal(current.closed, false)
  current.select('invitation')
  confirmSelection()
  assert(current.closed)
  assert.equal(plays, 1, 'confirmed checkpoint selection starts gameplay')
  assert.equal(writes, 2, 'selection saves cumulative progress and the restored checkpoint')
  const restored = JSON.parse(storage.get('naiwa-chapter-three-v1'))
  assert.equal(restored.node, 'invitation')
  assert.equal(restored.line, 0)
  assert.deepEqual(restored.history, [])
}
console.log('Route previews OK: both languages; no game/audio initialization or save changes on open/close; locked nodes stay locked; checkpoint entry requires confirmation.')
