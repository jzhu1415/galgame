import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tsModuleUrl } from './ts-module.mjs'

let blocked = false, writes = 0
const stored = new Map(), listeners = new Map(), frames = [], timers = []
globalThis.localStorage = {
  getItem(key) { if (blocked) throw new Error('SecurityError'); return stored.get(key) ?? null },
  setItem(key, value) { if (blocked) throw new Error('QuotaExceededError'); writes++; stored.set(key, value) },
  removeItem(key) { if (blocked) throw new Error('SecurityError'); stored.delete(key) },
}
globalThis.window = { addEventListener: (name, callback) => listeners.set(name, callback), setTimeout: callback => timers.push(callback), requestIdleCallback: callback => timers.push(callback) }
globalThis.requestAnimationFrame = callback => frames.push(callback)
const flushFrames = () => { while (frames.length) frames.shift()() }
const flushTimers = () => { while (timers.length) timers.shift()() }
const { browserStorage } = await import(tsModuleUrl('src/browser-storage.ts'))
assert(browserStorage.setItem('audit-save', 'first'))
assert(browserStorage.setItem('audit-save', 'first'))
assert.equal(writes, 1, 'identical autosaves should not repeat synchronous writes')
stored.set('audit-save', 'external'); listeners.get('storage')({ key: 'audit-save' })
assert(browserStorage.setItem('audit-save', 'first'))
assert.equal(writes, 2, 'another tab invalidates the write cache')
blocked = true
assert.equal(browserStorage.getItem('audit-save'), 'first')
assert.equal(browserStorage.setItem('audit-save', 'session'), false)
assert.equal(browserStorage.getItem('audit-save'), 'session')
assert.equal(browserStorage.removeItem('audit-save'), false)
blocked = false
assert.equal(browserStorage.getItem('audit-save'), null, 'failed removal must mask stale disk data')
assert(browserStorage.setItem('audit-save', 'recovered'))
assert.equal(stored.get('audit-save'), 'recovered')
const { redeemDlcKey, loadDlcViews, isRomanceDlcUnlocked, DLC_WATCH_KEY } = await import(tsModuleUrl('src/dlc-unlock-progress.ts'))
blocked = true
assert.equal(redeemDlcKey('wrong'), 'invalid')
assert.equal(redeemDlcKey('442456'), 'session-unlocked')
assert.equal(loadDlcViews(), 0, 'session key unlock must not fabricate video views')
assert(isRomanceDlcUnlocked())
browserStorage.removeItem('naiwa-romance-coastal-key-unlock-v1')
assert.equal(isRomanceDlcUnlocked(), false)
for (let views = 1; views <= 3; views++) {
  assert.equal(browserStorage.setItem(DLC_WATCH_KEY, String(views)), false)
  assert.equal(loadDlcViews(), views)
  assert.equal(isRomanceDlcUnlocked(), views === 3)
}
blocked = false

const { story } = await import(tsModuleUrl('src/story.ts'))
const { newOriginSave, normalizeOriginSave, normalizeOriginProgress, recordOriginCheckpoint, originLines, originLogLine } = await import(tsModuleUrl('src/origin-state.ts'))
const corrupt = normalizeOriginSave({ ...newOriginSave('en'), lineIndex: 9999, spirit: 300, danger: -8, memories: ['toy', 'toy', 'bad'], history: [{ sceneId: 'toString', index: 0 }, { sceneId: 'p01', index: -2 }, { sceneId: 'p01', index: 999 }, { sceneId: 'p01', index: 0 }] })
assert.equal(corrupt.lineIndex, story.p01.lines.length - 1)
assert.equal(corrupt.spirit, 100)
assert.equal(corrupt.danger, 0)
assert.deepEqual(corrupt.memories, ['toy'])
assert.equal(corrupt.history.length, 1)
for (const id of ['toString', '__proto__', 'invalid']) assert.equal(normalizeOriginSave({ ...newOriginSave('zh'), sceneId: id }), null)
const legacy = normalizeOriginSave({ ...newOriginSave('zh'), sceneId: 'm04', lineIndex: 1, spirit: 42, memories: ['toy'], history: [{ sceneId: 'find_toy', index: 0 }, { sceneId: 'm06', index: 0 }] })
const progress = normalizeOriginProgress(null, legacy)
assert(progress.visited.includes('find_toy'))
assert.equal(progress.checkpoints.find_toy, undefined, 'history cannot invent checkpoints')
assert.equal(progress.checkpoints.m04, undefined)
recordOriginCheckpoint(progress, legacy)
assert.equal(progress.checkpoints.m04, undefined, 'mid-scene old saves are not first-arrival checkpoints')
legacy.lineIndex = 0
recordOriginCheckpoint(progress, legacy)
legacy.spirit = 5; legacy.memories.push('gift')
recordOriginCheckpoint(progress, legacy)
assert.equal(progress.checkpoints.m04.spirit, 42)
assert.deepEqual(progress.checkpoints.m04.memories, ['toy'], 'a checkpoint must not retain a mutable memories array')
const [conditionalId, conditionalScene] = Object.entries(story).find(([_id, scene]) => scene.lines.some(line => line.when === 'uneasy'))
const conditionalLine = originLines(conditionalScene, 30).find(line => line.when === 'uneasy')
const entry = { sceneId: conditionalId, index: 0, sourceIndex: conditionalScene.lines.indexOf(conditionalLine) }
assert.equal(originLogLine(entry, progress), conditionalLine, 'history retains the displayed variant after mood changes')

const ice = await import(tsModuleUrl('src/chapter-two-progress.ts'))
const { iceMapNodes, iceMapLinks, renderIceMindMap } = await import(tsModuleUrl('src/chapter-two-map.ts'))
assert.deepEqual(new Set(Object.keys(iceMapNodes)), new Set(ice.iceNodeIds))
for (const [from, to] of iceMapLinks) assert(iceMapNodes[from] && iceMapNodes[to])
for (const clue of ice.iceClues) assert(iceMapLinks.some(([from, to]) => from === clue && to === 'map'), 'investigations return to the map')
const cumulative = ice.newIceProgress()
for (const approach of ['chase', 'restore', 'comfort']) {
  let save = { ...ice.newIceSave(), phase: 'threshold' }
  ice.recordIceCheckpoint(cumulative, save)
  save = { ...save, phase: 'map', approach }
  ice.recordIceCheckpoint(cumulative, save, approach); ice.recordIceCheckpoint(cumulative, save)
  for (const clue of ice.iceClues) {
    save = { ...save, clues: [...save.clues, clue], pendingFragment: ice.fragmentIds.includes(clue) ? { id: clue, line: 0 } : null }
    ice.recordIceCheckpoint(cumulative, save, clue)
    save.pendingFragment = null
  }
  save = { ...save, phase: 'core' }; ice.recordIceCheckpoint(cumulative, save)
  for (const response of ['trust', 'question']) ice.recordIceCheckpoint(cumulative, { ...save, phase: 'ending', response, completed: true })
}
assert.equal(Object.keys(cumulative.checkpoints).length, ice.iceNodeIds.length, 'all chapter two branches and investigations can be recorded')
assert.equal(cumulative.endings.length, 2)
const hall = ice.restartIceFrom(cumulative, 'map')
assert.deepEqual(hall.clues, [], 'replaying hall entry cannot carry completed-game clues')
assert.equal(hall.approach, 'chase')
const memory = ice.restartIceFrom(cumulative, 'footage')
assert.equal(memory.pendingFragment.id, 'footage')
assert.equal(memory.pendingFragment.line, 0)
assert.deepEqual(ice.normalizeIceProgress(JSON.parse(JSON.stringify(cumulative)), ice.newIceSave()).checkpoints, cumulative.checkpoints)
for (const language of ['zh', 'en']) {
  const html = renderIceMindMap(hall, cumulative, language)
  assert(html.includes('aria-current="step"') && html.includes('map-viewport') && html.includes('ending-gallery'))
  assert(!html.includes('ice-route-tree'))
}
const brokenIce = ice.normalizeIceSave({ version: 1, phase: 'core', line: Infinity, clues: [], approach: 'restore' })
assert.equal(brokenIce.phase, 'map', 'invalid old confrontations must return to investigation gates')
assert.equal(ice.normalizeIceSave({ version: 1, phase: 'hospital', line: Infinity }).line, 0)

const { normalizeRomanceSave, newRomanceSave } = await import(tsModuleUrl('src/romance-dlc-save.ts'))
const lockedDawn = normalizeRomanceSave({ ...newRomanceSave(), node: 'dawn', completed: ['dawn'] })
assert.equal(lockedDawn.node, null, 'a damaged DLC save cannot skip locked dates')
assert.deepEqual(lockedDawn.completed, [])
const resumed = normalizeRomanceSave({ ...newRomanceSave(), node: 'rain-end', line: 999, completed: ['departure', 'shore'], gear: ['blanket', 'blanket', 'recorder'], trail: ['lighthouse', 'anchor', 'shell'], treasure: true, history: [{ node: 'rain-end', line: 0, blanket: false }] })
assert.equal(resumed.node, 'rain-end')
assert.deepEqual(resumed.gear, ['blanket', 'recorder'])
assert.equal(resumed.treasure, true)
assert.equal(resumed.history[0].blanket, false, 'history carries the blanket variant instead of today’s luggage')
assert.equal(normalizeRomanceSave({ ...newRomanceSave(), treasure: true }).treasure, false)
const { newTheatreSave, normalizeTheatreSave } = await import(tsModuleUrl('src/chapter-three-story.ts'))
assert.equal(normalizeTheatreSave({ ...newTheatreSave(), node: 'saved', memories: ['rain', 'breakfast', 'film'], trade: 'fake', routeVerified: false }).node, 'bargain', 'damaged third-chapter saves cannot bypass route verification')
assert.equal(normalizeOriginSave({ ...newOriginSave('en'), sceneId: 'm07', memories: ['toy'] }).sceneId, 'm06')
const unsafeOrigin = normalizeOriginProgress({ version: 1, checkpoints: { e02: { sceneId: 'e02', affection: 0, anxiety: 0, danger: 0, spirit: 30, memories: [] } }, endings: [] }, null)
assert.equal(unsafeOrigin.checkpoints.e02, undefined, 'invalid legacy checkpoint data cannot bypass memory gates')

class FakeImage {
  constructor() {
    this.dataset = {}; this.style = {}; this.naturalWidth = 1672; this.parent = null
    this.classes = new Set(); this.classList = { add: id => this.classes.add(id), remove: id => this.classes.delete(id), contains: id => this.classes.has(id) }
  }
  set className(value) { this.classes = new Set(value.split(' ')) }
  get isConnected() { return !!this.parent?.isConnected }
  set src(value) { this.url = value }
  getAttribute(name) { return name === 'src' ? this.url : null }
  remove() { if (this.parent) this.parent.images = this.parent.images.filter(img => img !== this); this.parent = null }
}
globalThis.Image = FakeImage
const layer = { dataset: {}, images: [], isConnected: true, append(img) { this.images.push(img); img.parent = this }, querySelectorAll(selector) { return selector === 'img' ? [...this.images] : this.images.filter(img => !img.classList.contains(selector.match(/\.([^)]*)/)[1])) }, querySelector(selector) { return this.images.find(img => img.classList.contains(selector.split('.')[1])) ?? null } }
const { transitionSceneImage, preloadSceneImage } = await import(tsModuleUrl('src/scene-image.ts'))
const shot = id => ({ id, src: `/images/${id}.webp`, alt: id, className: 'scene-image', visibleClass: 'active' })
transitionSceneImage(layer, shot('first')); layer.images[0].onload(); flushFrames()
const first = layer.images[0]
transitionSceneImage(layer, shot('slow')); const slow = layer.images[1]
transitionSceneImage(layer, shot('latest')); const latest = layer.images[1]
slow.onload(); slow.onerror()
assert.equal(layer.dataset.image, 'latest', 'stale loads and errors cannot replace the latest request')
latest.onload(); flushFrames(); flushTimers()
assert.equal(layer.images.length, 1); assert.equal(layer.images[0], latest)
assert(!first.isConnected)
for (let index = 0; index < 30; index++) { transitionSceneImage(layer, shot(`rapid-${index}`)); assert(layer.images.length <= 2) }
const final = layer.images[1]; final.onload(); flushFrames(); flushTimers()
assert.equal(layer.images.length, 1)
transitionSceneImage(layer, shot('broken')); layer.images[1].onerror()
assert.equal(layer.images[0], final); assert.equal(layer.dataset.image, 'rapid-29')
transitionSceneImage(layer, shot('retry')); layer.images[1].onload(); flushFrames(); flushTimers()
assert.equal(layer.dataset.image, 'retry')
transitionSceneImage(layer, { ...shot('retry'), alt: 'Translated caption' })
assert.equal(layer.images.length, 1); assert.equal(layer.images[0].alt, 'Translated caption')
preloadSceneImage('/images/next.webp'); preloadSceneImage('/images/next.webp')
assert.equal(timers.length, 1, 'repeated speculative requests are deduplicated')
flushTimers()
const loader = readFileSync('src/chapter-loader.ts', 'utf8')
for (const chapter of ['chapter-two', 'chapter-three', 'romance-dlc']) assert(loader.includes(`import('./${chapter}')`))
const main = readFileSync('src/main.ts', 'utf8')
assert(!/^import .* from ['"]\.\/(chapter-two|chapter-three|romance-dlc)['"]/m.test(main), 'landing page must not eagerly load chapter controllers')
assert(main.includes('generation === viewGeneration'), 'late chapter loads must not replace a page after returning')
console.log('Site regression checks OK: blocked/quota storage, cross-tab invalidation, damaged and legacy saves, immutable checkpoints, dialogue variants, all ice routes/endings/gates, stale/failed/rapid image loads and lazy chapter entry.')
