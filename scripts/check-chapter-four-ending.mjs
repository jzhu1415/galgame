import assert from 'node:assert/strict'
import { tsModuleUrl } from './ts-module.mjs'

let now = 0, serial = 0, reduced = false
const timers = new Map(), frames = new Map()
globalThis.window = {
  setTimeout(callback, delay) { const id = ++serial; timers.set(id, { callback, at: now + delay }); return id },
  clearTimeout(id) { timers.delete(id) },
  matchMedia() { return { matches: reduced } },
}
globalThis.requestAnimationFrame = callback => { const id = ++serial; frames.set(id, callback); return id }
globalThis.cancelAnimationFrame = id => frames.delete(id)
globalThis.localStorage = { setItem() { throw Error('The visual epilogue must never write progress') } }
function flushFrames() { while (frames.size) { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()) } }
function tick(ms) { now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback() } }
class FakeImage {
  constructor() { this.style = {}; this.dataset = {}; this.naturalWidth = 1672; this.parent = null; this.classes = new Set(); this.classList = { add: id => this.classes.add(id), remove: id => this.classes.delete(id), contains: id => this.classes.has(id) } }
  set className(value) { this.classes = new Set(value.split(' ')) }
  get isConnected() { return Boolean(this.parent?.isConnected) }
  set src(value) { this.url = value }
  getAttribute(name) { return name === 'src' ? this.url : null }
  remove() { if (this.parent) this.parent.images = this.parent.images.filter(image => image !== this); this.parent = null }
}
globalThis.Image = FakeImage
const makeLayer = () => ({
  dataset: {}, images: [], isConnected: true,
  append(image) { this.images.push(image); image.parent = this },
  querySelectorAll(selector) { return selector === 'img' ? [...this.images] : this.images.filter(image => !image.classList.contains(selector.match(/\.([^)]*)/)[1])) },
  querySelector(selector) { return this.images.find(image => image.classList.contains(selector.split('.')[1])) ?? null },
})
const { createGildedEnding, gildedEndingDissolve } = await import(tsModuleUrl('src/chapter-four-ending.ts'))
const { transitionSceneImage } = await import(tsModuleUrl('src/scene-image.ts'))
const final = { node: gildedEndingDissolve.node, line: gildedEndingDissolve.line, spirit: 80 }
const snapshot = JSON.stringify(final)
const ending = createGildedEnding(), layer = makeLayer()
assert.equal(ending.sync(layer, { node: 'free', line: 0 }, 'zh'), false)
assert(ending.sync(layer, final, 'zh'))
const [oil, reality] = layer.images
assert.equal(reality.style.objectPosition, oil.style.objectPosition)
assert.equal(reality.style.transitionDuration, '3800ms')
reality.onload(); tick(10000); flushFrames()
assert(!reality.classList.contains('is-visible'), 'the reality image waits until the oil image has loaded')
oil.onload(); flushFrames()
assert(oil.classList.contains('is-visible'))
tick(gildedEndingDissolve.holdMs - 1); flushFrames()
assert(!reality.classList.contains('is-visible'), 'the oil image gets a quiet opening hold')
tick(1); flushFrames()
assert(reality.classList.contains('is-visible'))
assert(oil.classList.contains('is-visible'), 'opaque oil remains underneath, preventing a fade through black')
assert.equal(ending.displayedShot(), 'bedsideReality')
tick(6000)
assert(oil.isConnected && reality.isConnected)
assert(ending.sync(layer, final, 'en'))
assert.equal(layer.images.length, 2, 'language changes do not replay the transition')
assert(reality.alt.includes('hospital'))
assert.equal(JSON.stringify(final), snapshot, 'the dissolve never mutates story state')
assert.equal(ending.sync(layer, { node: 'bound', line: 0 }, 'en'), false)
assert(!reality.isConnected)
assert.equal(ending.displayedShot(), null)

// Cancel during loading, during the hold and between animation frames.
for (const phase of ['loading', 'hold', 'frame']) {
  const controller = createGildedEnding(), target = makeLayer()
  controller.sync(target, final, 'zh')
  const [oldOil, oldReality] = target.images
  const lateLoad = oldReality.onload
  if (phase !== 'loading') { oldOil.onload(); flushFrames(); oldReality.onload() }
  if (phase === 'frame') tick(gildedEndingDissolve.holdMs)
  controller.dispose()
  lateLoad(); tick(10000); flushFrames()
  assert(!oldReality.isConnected && !oldReality.classList.contains('is-visible'))
  assert.equal(controller.displayedShot(), null)
  // A replay can reuse the same layer even when the cancelled oil image was still loading.
  assert(controller.sync(target, final, 'en'))
  const currentOil = target.images.filter(image => image.dataset.art === 'bedside').at(-1)
  const currentReality = target.images.find(image => image.dataset.art === 'bedsideReality')
  currentOil.onload(); flushFrames(); currentReality.onload(); tick(gildedEndingDissolve.holdMs); flushFrames()
  assert(currentReality.classList.contains('is-visible'))
  controller.dispose()
}

const failure = createGildedEnding(), failureLayer = makeLayer()
failure.sync(failureLayer, final, 'zh')
const [safeOil, missingReality] = failureLayer.images
safeOil.onload(); flushFrames(); missingReality.onerror(); tick(10000); flushFrames()
assert(safeOil.isConnected && safeOil.classList.contains('is-visible'))
assert.equal(failure.displayedShot(), 'bedside')
failure.dispose()

reduced = true
const still = createGildedEnding(), stillLayer = makeLayer()
still.sync(stillLayer, final, 'zh')
const [stillOil, stillReality] = stillLayer.images
assert.equal(stillReality.style.transitionDuration, '0ms')
stillOil.onload(); flushFrames(); stillReality.onload(); tick(0); flushFrames()
assert(stillReality.classList.contains('is-visible'))
still.dispose()

// The shared reveal hook also ignores stale image loads.
let revealed = 0
const hookLayer = makeLayer()
const shot = id => ({ id, src: id, alt: id, className: 'scene', visibleClass: 'is-visible', onReveal: () => revealed++ })
transitionSceneImage(hookLayer, shot('old')); const stale = hookLayer.images[0]
transitionSceneImage(hookLayer, shot('new')); stale.onload(); flushFrames()
assert.equal(revealed, 0)
hookLayer.images[0].onload(); flushFrames()
assert.equal(revealed, 1)
console.log('Chapter four epilogue OK: oil-to-CG dissolve, matching crop, loading order, opaque underlay, language retention, cancellation/replay, failed images, reduced motion, stale callbacks and unchanged progress.')
