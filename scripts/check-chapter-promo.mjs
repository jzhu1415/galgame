import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { tsModuleUrl } from './ts-module.mjs'

let writes = 0, plays = 0
globalThis.localStorage = { setItem() { writes++; throw new Error('A chapter introduction must not write a save') } }
globalThis.Audio = class { constructor() { plays++; throw new Error('A chapter introduction must not play audio') } }
const { renderChapterPromo, mountChapterPromo } = await import(tsModuleUrl('src/chapter-promo.ts'))
for (const chapter of [1, 2, 3]) for (const language of ['zh', 'en']) for (const started of [false, true]) {
  const html = renderChapterPromo({ chapter, language, started, saveNote: '<Session only>', dlc: { unlocked: false, views: 2, completed: 1 } })
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(match => match[1])
  assert.equal(ids.length, new Set(ids).size, 'controls and anchor targets must have unique IDs')
  assert.equal((html.match(/<h1 /g) ?? []).length, 1)
  assert.equal((html.match(/data-promo-play/g) ?? []).length, 2, 'both ends of the page can enter gameplay')
  assert.equal((html.match(/data-promo-restart/g) ?? []).length, started ? 2 : 0, 'restart is offered only when a save exists')
  assert(html.includes(started ? 'id="continue"' : 'id="start"'))
  assert(html.includes('&lt;Session only&gt;'), 'storage notices are escaped and retained')
  for (const id of ['routes-intro-top', 'chapter-home', 'chapter-return', 'language', 'fullscreen', 'settings-entry', 'gallery-entry', 'release-entry']) assert(ids.includes(id), id)
  for (const match of html.matchAll(/<a ([^>]+)>/g)) {
    const href = match[1].match(/href="([^"]+)"/)?.[1]
    assert(href)
    if (href.startsWith('#')) assert(ids.includes(href.slice(1)), 'section links must have a target')
  }
  for (const match of html.matchAll(/<img ([^>]+)>/g)) {
    const attributes = match[1]
    const src = attributes.match(/src="([^"]+)"/)?.[1]
    assert(src && existsSync('public' + src), 'all campaign art must exist')
    assert(attributes.includes('alt="') && attributes.includes('width="') && attributes.includes('height="'), 'images need text alternatives and dimensions')
  }
  assert.equal((html.match(/fetchpriority="high"/g) ?? []).length, 1, 'only the opening image gets high priority')
  assert.equal(html.includes('id="romance-dlc-entry"'), chapter === 1)
  if (chapter === 1) assert(html.includes('2/3') && html.includes('1/4'), 'real DLC progress is displayed')
  const currentChapter = [...html.matchAll(/data-promo-chapter-link="([^"]+)"([^>]*)/g)].filter(match => match[2].includes('aria-current="page"'))
  assert.equal(currentChapter.length, 1)
  assert.equal(currentChapter[0][1], String(chapter))
}
for (const language of ['zh', 'en']) {
  const html = renderChapterPromo({ chapter: 1, language, started: false, saveNote: '', dlc: { unlocked: true, views: 0, completed: 4 } })
  assert(html.includes(language === 'zh' ? '进入海边番外' : 'Play the coastal story'))
  assert(!html.includes('0/3'), 'a key unlock does not pretend to be a video unlock')
}

// A viewport harness exercises scrolling without mounting any game controller.
class Surface {
  constructor() {
    this.listeners = new Map()
    this.classes = new Set()
    this.properties = new Map()
    this.classList = {
      add: name => this.classes.add(name),
      contains: name => this.classes.has(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
    }
    this.style = { setProperty: (name, value) => this.properties.set(name, value) }
  }
  addEventListener(name, callback) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(callback) }
  removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback) }
  fire(name, event = {}) { for (const callback of this.listeners.get(name) ?? []) callback(event) }
}
let nextFrame = 0
const queue = new Map()
const motion = new Surface()
motion.matches = false
globalThis.window = new Surface()
window.matchMedia = () => motion
window.requestAnimationFrame = callback => { queue.set(++nextFrame, callback); return nextFrame }
window.cancelAnimationFrame = id => queue.delete(id)
const flush = () => { const pending = [...queue.values()]; queue.clear(); pending.forEach(callback => callback()) }
let intersection, resize
globalThis.IntersectionObserver = class {
  constructor(callback) { this.callback = callback; this.targets = new Set(); intersection = this }
  observe(target) { this.targets.add(target) }
  unobserve(target) { this.targets.delete(target) }
  disconnect() { this.disconnected = true; this.targets.clear() }
}
globalThis.ResizeObserver = class {
  constructor(callback) { this.callback = callback; resize = this }
  observe() {}
  disconnect() { this.disconnected = true }
}
const page = new Surface()
page.clientHeight = 900
page.scrollHeight = 5000
page.scrollTop = 0
page.getBoundingClientRect = () => ({ top: 42 })
page.scrollTo = options => { page.lastScroll = options; page.scrollTop = options.top }
const header = new Surface()
header.offsetHeight = 76
const sceneCount = { textContent: '' }
const scene = top => ({ getBoundingClientRect: () => ({ top: 42 + top - page.scrollTop }) })
const scenes = [1300, 1900, 2500].map(scene)
const frames = [new Surface(), new Surface(), new Surface()]
const drift = new Surface()
drift.getBoundingClientRect = () => ({ top: 3200 - page.scrollTop, height: 600 })
const revealed = new Surface()
const story = scene(1300)
story.hasAttribute = name => name === 'tabindex'
story.focus = options => { story.focusOptions = options }
page.querySelector = selector => ({ '.promo-header': header, '[data-promo-scene-count]': sceneCount, '#promo-story': story })[selector]
page.querySelectorAll = selector => ({
  '[data-promo-scene]': scenes, '[data-promo-frame]': frames, '[data-promo-drift-frame]': [drift], '[data-promo-reveal]': [revealed],
})[selector]
const root = { querySelector: () => page }
const controller = mountChapterPromo(root, 1700)
assert.equal(controller.getScrollTop(), 1700, 'language rerenders can restore the viewport')
assert(page.classes.has('has-motion'))
intersection.callback([{ isIntersecting: true, target: revealed }])
assert(revealed.classes.has('is-revealed'))
assert(!intersection.targets.has(revealed), 'a revealed paragraph no longer needs observation')
flush()
assert.equal(sceneCount.textContent, '02 / 03')
assert(frames[1].classes.has('is-active'))
assert.equal(page.properties.get('--promo-reading'), String(1700 / 4100))
page.scrollTop = 2300
for (let i = 0; i < 30; i++) page.fire('scroll')
assert.equal(queue.size, 1, 'rapid wheel and touch events share one frame')
flush()
assert.equal(sceneCount.textContent, '03 / 03')
assert(frames[2].classes.has('is-active') && !frames[1].classes.has('is-active'))
motion.matches = true
motion.fire('change')
flush()
assert(!page.classes.has('has-motion'))
assert.equal(page.properties.get('--promo-hero-shift'), '0px')
assert.equal(drift.properties.get('--promo-drift'), '0px')
let prevented = false
const click = { button: 0, target: { closest: () => ({ hash: '#promo-story' }) }, preventDefault: () => { prevented = true } }
page.fire('click', { ...click, ctrlKey: true })
assert(!prevented && !page.lastScroll, 'modified navigation keeps normal link behavior')
page.fire('click', click)
assert(prevented)
assert.deepEqual(page.lastScroll, { top: 1200, behavior: 'auto' }, 'section navigation accounts for the sticky header and reduced motion')
assert.deepEqual(story.focusOptions, { preventScroll: true }, 'keyboard navigation moves focus without another scroll')
page.fire('scroll')
assert.equal(queue.size, 1)
controller.dispose()
assert.equal(queue.size, 0, 'leaving for gameplay cancels pending animation work')
assert(intersection.disconnected && resize.disconnected)
for (const name of ['scroll', 'click', 'load']) assert.equal(page.listeners.get(name)?.size, 0)
assert.equal(window.listeners.get('resize')?.size, 0)
assert.equal(motion.listeners.get('change')?.size, 0)
page.fire('scroll'); resize.callback()
assert.equal(queue.size, 0, 'a stale resize callback cannot restart a disposed page')
assert.equal(writes, 0)
assert.equal(plays, 0)
const main = readFileSync('src/main.ts', 'utf8')
assert(main.includes('chapterPromoController.dispose()'), 'route changes clean up the presentation')
console.log('Chapter pages OK: bilingual start/resume/DLC states, real art and anchors, read-only scrolling, scene changes, frame batching, reduced motion, focus navigation, scroll restoration and complete disposal.')
