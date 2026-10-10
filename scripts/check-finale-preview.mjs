import assert from 'node:assert/strict'
import { compile, moduleUrl, tsModuleUrl } from './ts-module.mjs'

const storage = new Map()
let writes = 0, entered = 0, confirmations = 0, selection, current
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { writes++; storage.set(key, value); return true } }
globalThis.Audio = class { constructor() { throw new Error('Preview must never create audio') } }
globalThis.previewFinaleMap = (_root, _language, save, progress, onSelect) => {
  current = { save, progress, select: onSelect, closed: false, close() { this.closed = true } }
  return current
}
globalThis.confirmFinalePreview = (_root, _message, _language, callback) => { confirmations++; selection = callback }
const storyUrl = tsModuleUrl('src/finale-story.ts')
const progressUrl = tsModuleUrl('src/finale-progress.ts')
const story = await import(storyUrl)
const progress = await import(progressUrl)
const source = compile('src/finale.ts').replace(/^import .*;\n/gm, '')
const module = await import(moduleUrl(`
const browserStorage = globalThis.localStorage;
const showFinaleStoryMap = globalThis.previewFinaleMap;
const confirmInApp = globalThis.confirmFinalePreview;
const { ${Object.keys(story).join(', ')} } = await import(${JSON.stringify(storyUrl)});
const { ${Object.keys(progress).join(', ')} } = await import(${JSON.stringify(progressUrl)});
${source}`))

for (const language of ['zh', 'en']) {
  storage.clear(); writes = 0; entered = 0
  module.previewFinaleRoutes({}, 5, language, () => entered++)
  assert.equal(writes, 0)
  assert.equal(entered, 0)
  current.close()
  assert.equal(writes, 0)
  module.previewFinaleRoutes({}, 5, language, () => entered++)
  const before = confirmations
  current.select('f6-battle-film')
  assert.equal(confirmations, before)
  current.select('f5-descent')
  assert.equal(confirmations, before + 1)
  assert.equal(writes, 0)
  selection = null // Cancel without touching a save.
  assert.equal(current.closed, false)
  current.select('f5-descent'); selection()
  assert.equal(writes, 2)
  assert.equal(entered, 1)
  const replay = JSON.parse(storage.get(story.finaleSaveKey(5)))
  assert(replay.mergedFinale && replay.node === 'f5-descent' && replay.line === 0)
  const unlocks = JSON.parse(storage.get(story.finaleProgressKey(5)))
  assert(unlocks.checkpoints['f5-descent'], 'confirmed first entry keeps its real checkpoint')
}

// An old sixth-chapter run migrates in memory; just viewing it cannot write.
storage.clear()
const old = story.normalizeFinaleSave(6, { ...story.newFinaleSave(6), node: 'f6-core', spirit: 63,
  clues: ['f6-medical-log', 'f6-waveform', 'f6-car-log'], flags: ['f6-local-evidence-ready'] })
assert.equal(old.node, 'f6-core')
storage.set(story.finaleSaveKey(6), JSON.stringify(old))
storage.set(story.finaleProgressKey(6), JSON.stringify(progress.recordFinaleCheckpoint(progress.newFinaleProgress(6), old)))
writes = 0
module.previewFinaleRoutes({}, 5, 'zh', () => entered++)
assert.equal(writes, 0)
assert.equal(current.save.chapter, 5)
assert.equal(current.save.node, 'f6-core')
assert.equal(current.save.spirit, 63)
assert.equal(current.progress.checkpoints['f6-core'].chapter, 5)
current.select('f6-core'); selection()
assert.equal(writes, 2)

// Restart must not resurrect the historical independent chapter run.
module.resetFinale(5)
module.previewFinaleRoutes({}, 5, 'en', () => entered++)
assert.equal(current.save.node, 'f5-descent')
assert.equal(current.save.spirit, 100)
assert(current.progress.checkpoints['f6-core'])

// Real legacy visits without snapshots remain locked, even at line zero.
storage.clear()
storage.set(story.finaleSaveKey(5), JSON.stringify({ ...story.newFinaleSave(5), node: 'f5-trace', visited: ['f5-descent', 'f5-trace'] }))
writes = 0
module.previewFinaleRoutes({}, 5, 'zh', () => entered++)
const before = confirmations
current.select('f5-trace')
assert.equal(confirmations, before)
assert.equal(writes, 0)
// Earlier aftermath saves replay the new sequence without invented rescue state.
storage.clear()
const oldAftermath = story.normalizeFinaleSave(6, { ...story.newFinaleSave(6), node: 'f6-resolution', spirit: 63,
  flags: ['film-completed'], visited: ['f6-resolution'] })
assert.equal(oldAftermath.node, 'f6-resolution')
storage.set(story.finaleSaveKey(6), JSON.stringify(oldAftermath))
storage.set(story.finaleProgressKey(6), JSON.stringify(progress.recordFinaleCheckpoint(progress.newFinaleProgress(6), oldAftermath)))
writes = 0
module.previewFinaleRoutes({}, 5, 'zh', () => entered++)
assert.equal(current.save.node, 'f6-post-film')
assert.equal(current.save.line, 0)
assert.equal(current.save.spirit, 63)
assert(!current.save.flags.includes('f6-naiba-sacrificed') && !current.save.flags.includes('f6-revived'))
assert(current.progress.visited.includes('f6-resolution'))
assert(!current.progress.checkpoints['f6-resolution'] && !current.progress.checkpoints['f6-post-film'])
assert.equal(writes, 0)
console.log('Finale previews OK: bilingual, no audio or writes before confirmation; true checkpoints persist; legacy migration is read-only; restart keeps unlocks without reviving old runs.')
