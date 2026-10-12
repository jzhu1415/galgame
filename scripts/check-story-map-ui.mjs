import assert from 'node:assert/strict'
import { tsModuleUrl } from './ts-module.mjs'
const { setupStoryMap } = await import(tsModuleUrl('src/story-map.ts'))
// Exercise the real canvas controls without a browser or any chapter save API.
globalThis.localStorage = { getItem() { throw new Error('Map UI cannot read saves') }, setItem() { throw new Error('Map UI cannot write saves') } }
class Surface {
  constructor() {
    this.listeners = new Map(); this.children = []; this.beforeNodes = []; this.attrs = new Map(); this.dataset = {}; this.style = {}; this.classes = new Set()
    this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name) }
    this.scrollLeft = 0; this.scrollTop = 0; this.clientWidth = 600; this.clientHeight = 400
  }
  addEventListener(name, handler) { this.listeners.set(name, handler) }
  fire(name, event = {}) { this.listeners.get(name)?.(event) }
  setAttribute(name, value) { this.attrs.set(name, value) }
  append(...nodes) { this.children.push(...nodes) }
  before(node) { this.beforeNodes.push(node) }
  setPointerCapture(id) { this.captured = id }
}
globalThis.document = { createElement: () => new Surface() }
let nextFrame = 0
const frames = new Map()
globalThis.requestAnimationFrame = handler => { frames.set(++nextFrame, handler); return nextFrame }
globalThis.cancelAnimationFrame = id => frames.delete(id)
function flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(handler => handler()) }
for (const [language, width] of [['zh', 1200], ['en', 1200], ['zh', 390], ['en', 390]]) {
  globalThis.window = { innerWidth: width }
  const dialog = new Surface(); dialog.open = true
  const viewport = new Surface(), scaled = new Surface(), map = new Surface(), intro = new Surface(), tools = new Surface(), label = new Surface(), plus = new Surface(), minus = new Surface()
  const nodes = [{ disabled: false }, { disabled: true }, { disabled: false }]
  map.querySelectorAll = () => nodes
  const elements = { '#map-viewport': viewport, '#map-scaled': scaled, '#mindmap': map, '.map-intro': intro, '.map-zoom-tools': tools, '#map-zoom': label, '#zoom-in': plus, '#zoom-out': minus }
  dialog.querySelector = selector => elements[selector]
  setupStoryMap(dialog, { width: 1260, height: 3000, current: { x: 700, y: 1000 }, language, chapter: 5 })
  assert(dialog.classes.has('is-story-archive'))
  assert.equal(dialog.lang, language === 'zh' ? 'zh-CN' : 'en')
  assert(intro.beforeNodes[0].innerHTML.includes('CHAPTER 05'))
  assert(intro.beforeNodes[0].innerHTML.includes('2<small> / 3'))
  assert.equal(tools.children.length, 2)
  const [center, reset] = tools.children
  assert(center.attrs.get('aria-label') && reset.attrs.get('aria-label'))
  flush()
  const initialZoom = width < 600 ? 1 : .9
  assert.equal(label.textContent, `${initialZoom * 100}%`)
  plus.fire('click'); viewport.scrollLeft = 10; viewport.scrollTop = 20
  center.fire('click')
  const zoom = initialZoom + .15
  assert.equal(viewport.scrollLeft, 700 * zoom - 300)
  assert.equal(viewport.scrollTop, 1000 * zoom - 200)
  reset.fire('click')
  assert.equal(label.textContent, `${initialZoom * 100}%`)
  assert.equal(viewport.scrollTop, 1000 * initialZoom - 200)
  for (let i = 0; i < 20; i++) plus.fire('click')
  assert.equal(label.textContent, '125%')
  for (let i = 0; i < 20; i++) minus.fire('click')
  assert.equal(label.textContent, '55%')
  const canvas = { closest: () => null }
  viewport.fire('pointerdown', { pointerType: 'touch', target: canvas, button: 0 })
  assert(!viewport.classes.has('is-dragging'), 'Touch retains native scrolling')
  viewport.fire('pointerdown', { pointerType: 'mouse', target: { closest: () => ({}) }, button: 0 })
  assert(!viewport.classes.has('is-dragging'), 'Node buttons are not drag handles')
  const before = { left: viewport.scrollLeft, top: viewport.scrollTop }
  viewport.fire('pointerdown', { pointerType: 'mouse', button: 0, target: canvas, clientX: 100, clientY: 100, pointerId: 1 })
  viewport.fire('pointermove', { clientX: 80, clientY: 50 })
  assert.equal(viewport.scrollLeft, before.left + 20)
  assert.equal(viewport.scrollTop, before.top + 50)
  viewport.fire('pointerup')
  assert(!viewport.classes.has('is-dragging'))
  assert.deepEqual(nodes, [{ disabled: false }, { disabled: true }, { disabled: false }], 'UI never changes node gates')
  dialog.fire('close')
}
// Closing before the initial layout frame prevents work on a removed dialog.
const empty = new Surface(); const map = new Surface(); map.querySelectorAll = () => []
empty.querySelector = selector => selector === '#mindmap' ? map : new Surface()
setupStoryMap(empty, { width: 1100, height: 2000, current: { x: 550, y: 100 } })
empty.fire('close')
assert.equal(frames.size, 0)
console.log('Shared map UI OK: bilingual archive, accurate replay counts, desktop/phone zoom, center/reset, mouse drag, native touch, locked-node isolation and close cleanup.')
