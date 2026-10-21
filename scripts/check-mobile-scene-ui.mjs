import assert from 'node:assert/strict'
import { tsModuleUrl } from './ts-module.mjs'

// Exercise real controller events without launching a browser or changing saves.
class Element {
  dataset = {}; children = []; attributes = new Map(); textContent = ''; isConnected = true
  constructor(kind = '') { this.kind = kind }
  append(child) { child.parent = this; this.children.push(child) }
  setAttribute(name, value) { this.attributes.set(name, value) }
  getAttribute(name) { return this.attributes.get(name) ?? null }
  focus() { document.activeElement = this }
  contains(element) { return element === this || this.children.some(child => child.contains(element)) }
  closest(selector) {
    if (selector === '[data-mobile-command]' && this.dataset.mobileCommand) return this
    if (selector.includes('button') && this.kind === 'button') return this
    return this.parent?.closest(selector) ?? null
  }
  querySelector(selector) {
    if (selector === '.mobile-scene-actions') return this.children.find(c => c.className === selector.slice(1)) ?? null
    if (selector.includes('button')) return this.children.find(c => c.kind === 'button') ?? null
    return null
  }
  remove() { this.parent.children = this.parent.children.filter(c => c !== this); this.isConnected = false }
}
globalThis.HTMLElement = Element
globalThis.Element = Element
globalThis.document = { documentElement: { lang: 'zh-CN' }, activeElement: null, createElement: kind => new Element(kind) }
const listeners = new Map()
const observers = []
let disconnected = false, mediaChanged
globalThis.MutationObserver = class { constructor(fn) { observers.push(fn) } observe() {} disconnect() { disconnected = true } }
const media = { matches: true, addEventListener(_, fn) { mediaChanged = fn }, removeEventListener() {} }
globalThis.window = { matchMedia: () => media }
const header = new Element('header'), tools = new Element('tools'), originalAction = new Element('button')
tools.append(originalAction); header.append(tools)
const scene = new Element('game')
scene.matches = selector => selector === '.game'
scene.querySelector = selector => selector === '.game-top' ? header : null
scene.querySelectorAll = selector => selector === '.game-tools' ? [tools] : []
scene.append(header)
const root = new Element('root'); root.append(scene)
root.querySelector = selector => selector.includes(':scope >') ? scene : null
root.addEventListener = (name, fn) => listeners.set(name, fn)
root.removeEventListener = name => listeners.delete(name)
const event = (target, key) => ({ target, key, preventDefault() { this.prevented = true }, stopImmediatePropagation() { this.stopped = true } })
const { mountMobileSceneUI } = await import(tsModuleUrl('src/mobile-scene-ui.ts'))
const dispose = mountMobileSceneUI(root)
const controls = header.querySelector('.mobile-scene-actions')
assert(controls, 'A compact toolbar is installed on a mounted scene')
const art = controls.children.find(c => c.dataset.mobileCommand === 'art')
const menu = controls.children.find(c => c.dataset.mobileCommand === 'tools')
listeners.get('click')(event(menu))
assert.equal(scene.dataset.mobileToolsOpen, 'true')
assert.equal(menu.getAttribute('aria-expanded'), 'true')
assert.equal(document.activeElement, originalAction, 'Opening the tools moves keyboard focus into them')
listeners.get('keydown')(event(originalAction, 'Escape'))
assert.equal(scene.dataset.mobileToolsOpen, 'false')
assert.equal(document.activeElement, menu, 'Escape closes tools and restores focus')
listeners.get('click')(event(menu))
const action = event(originalAction); listeners.get('click')(action)
assert(!action.prevented && !action.stopped, 'Original menu actions keep their native event handlers')
assert.equal(scene.dataset.mobileToolsOpen, 'false')
await Promise.resolve()
assert.equal(document.activeElement, menu, 'Non-dialog menu actions return focus to the toolbar')
listeners.get('click')(event(art))
assert.equal(scene.dataset.mobileArtOnly, 'true')
assert.equal(art.getAttribute('aria-pressed'), 'true')
assert.equal(art.textContent, '恢复界面')
const backgroundTap = event(scene); listeners.get('click')(backgroundTap)
assert(backgroundTap.prevented && backgroundTap.stopped, 'A tap while viewing art cannot advance the story')
const advance = event(scene, ' '); listeners.get('keydown')(advance)
assert(advance.prevented && advance.stopped, 'Keyboard advancement is blocked while viewing art')
listeners.get('keydown')(event(art, 'Escape'))
assert.equal(scene.dataset.mobileArtOnly, 'false')
document.documentElement.lang = 'en'; observers[1]()
assert.equal(art.textContent, 'View art')
observers[0](); assert.equal(header.children.filter(c => c === controls).length, 1, 'Renders do not duplicate controls')
listeners.get('click')(event(menu))
const dismiss = event(scene); listeners.get('click')(dismiss)
assert(dismiss.prevented && dismiss.stopped, 'Dismissing tools by tapping the scene cannot advance dialogue')
assert.equal(scene.dataset.mobileToolsOpen, 'false')
let stoppedPlayback = 0
const normalQuery = scene.querySelector
scene.querySelector = selector => selector.includes('#auto[') ? { click() { stoppedPlayback++ } } : normalQuery(selector)
listeners.get('click')(event(art))
assert.equal(stoppedPlayback, 1, 'Entering art view stops automatic progression before hiding controls')
const restoreKey = event(art, 'Enter'); listeners.get('keydown')(restoreKey)
assert(restoreKey.stopped && !restoreKey.prevented, 'Restore button keeps native activation without leaking the key to chapter shortcuts')
listeners.get('click')(event(art))
listeners.get('click')(event(art)); media.matches = false; mediaChanged()
assert.equal(scene.dataset.mobileArtOnly, 'false', 'Rotating to desktop restores the full interface')
const desktopTap = event(scene); listeners.get('click')(desktopTap)
assert(!desktopTap.prevented, 'Desktop interaction is untouched')
dispose(); assert(disconnected && listeners.size === 0, 'Listeners and observers have a disposal path')
console.log('Mobile scene UI OK: disclosure, focus, art restore, input guards, language, idempotence, desktop reset and disposal.')
