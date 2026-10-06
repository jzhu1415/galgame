import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { compile, moduleUrl, tsModuleUrl } from './ts-module.mjs'
import { initializeIceMap } from '../src/ice-pool/ice-map-bootstrap.js'

const stored = new Map(), events = new Map(), timers = new Map(), frames = []
let blocked = false, timerId = 0, exits = 0
globalThis.localStorage = {
  getItem: key => stored.get(key) ?? null,
  setItem(key, value) { if (blocked) throw new Error('QuotaExceededError'); stored.set(key, value) },
  removeItem: key => stored.delete(key),
}
globalThis.window = {
  location: { origin: 'https://game.example' },
  addEventListener(name, callback) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(callback) },
  removeEventListener: (name, callback) => events.get(name)?.delete(callback),
  setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id },
  clearTimeout: id => timers.delete(id),
}
const emit = data => { for (const callback of events.get('message') ?? []) callback(data) }
class Element {
  constructor(tag = 'div') { this.tag = tag; this.nodes = new Map(); this.events = new Map(); this.children = []; this.classList = { contains: () => false }; this.hidden = false }
  set innerHTML(value) { this.html = value; this.nodes.clear() }
  get innerHTML() { return this.html ?? '' }
  insertAdjacentHTML(_position, value) { this.html = this.innerHTML + value }
  addEventListener(name, callback) { this.events.set(name, callback) }
  removeEventListener(name) { this.events.delete(name) }
  setAttribute() {}
  focus() { document.activeElement = this }
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child) } }
  remove() { this.removed = true; if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this) }
  click() { this.events.get('click')?.() }
  showModal() { this.open = true }
  close() { this.open = false; this.events.get('close')?.() }
  querySelector(selector) {
    if (selector === 'dialog[open]') return this.children.find(child => child.tag === 'dialog' && child.open) ?? null
    if (selector === '.romance-stage') return null
    if (selector.startsWith('#') && !this.innerHTML.includes(`id="${selector.slice(1)}"`)) return null
    if (selector === '#ice-world' && !this.innerHTML.includes('id="ice-world"')) return null
    if (!this.nodes.has(selector)) this.nodes.set(selector, new Element())
    return this.nodes.get(selector)
  }
  querySelectorAll() { return [] }
}
globalThis.document = {
  documentElement: { lang: 'zh-CN' }, activeElement: null,
  addEventListener() {}, removeEventListener() {}, head: new Element('head'),
  getElementById: id => document.head.children.find(child => child.id === id) ?? null,
  createElement(tag) {
    const element = new Element(tag)
    if (tag === 'iframe') { element.contentWindow = { messages: [], postMessage(data) { this.messages.push(structuredClone(data)) } }; frames.push(element) }
    return element
  },
}
const root = new Element()
root.ownerDocument = document
const chapterFile = resolve('src/chapter-two.ts')
const js = compile(chapterFile).replace(/^import ['"][^'"]+\.css['"];\n/gm, '').replace(/(['"])(\.\/[^'"]+)\1/g, (_match, _quote, relative) => JSON.stringify(tsModuleUrl(resolve(dirname(chapterFile), `${relative}.ts`))))
const { mountChapterTwo, copy } = await import(moduleUrl(js + '\nexport { copy };'))
const { normalizeIceSave, newIceSave } = await import(tsModuleUrl('src/chapter-two-progress.ts'))
const { resolveIceDialogue } = await import(tsModuleUrl('src/chapter-two-dialogue.ts'))
const { browserStorage } = await import(tsModuleUrl('src/browser-storage.ts'))
stored.set('naiwa-audio-enabled-v1', 'false')
const mapSave = { ...newIceSave(), phase: 'map', approach: 'chase', clues: ['note', 'footage'] }
stored.set('naiwa-chapter-two-v1', JSON.stringify(mapSave))
let controller = mountChapterTwo(root, 'zh', () => exits++)
const frame = frames.at(-1)
root.querySelector('#ice-language').click()
emit({ origin: window.location.origin, source: frame.contentWindow, data: { source: 'naiwa-ice-map', type: 'ready' } })
assert.equal(frame.contentWindow.messages.at(-1).language, 'en', 'language changes before ready survive initialization')
for (let i = 0; i < 4; i++) root.querySelector('#ice-language').click()
assert.equal(frames.length, 1, 'language changes do not recreate or detach the iframe')
assert(!frame.removed)
assert.equal(frame.contentWindow.messages.filter(message => message.type === 'init').length, 1, 'language messages do not reset the route')
assert.equal(frame.contentWindow.messages.filter(message => message.type === 'language').length, 4)

blocked = true
emit({ origin: window.location.origin, source: {}, data: { source: 'naiwa-ice-map', type: 'clue', id: 'routeOne' } })
assert(!JSON.parse(browserStorage.getItem('naiwa-chapter-two-v1')).clues.includes('routeOne'), 'untrusted frame messages cannot change saves')
emit({ origin: window.location.origin, source: frame.contentWindow, data: { source: 'naiwa-ice-map', type: 'clue', id: 'routeOne' } })
assert.equal(root.querySelector('#ice-save-status').hidden, false)
assert.match(root.querySelector('#ice-save-status').textContent, /Session only/)
assert(JSON.parse(browserStorage.getItem('naiwa-chapter-two-v1')).clues.includes('routeOne'), 'quota failures keep the current session playable')
emit({ origin: window.location.origin, source: frame.contentWindow, data: { source: 'naiwa-ice-map', type: 'error', reason: 'unsupported' } })
const world = root.querySelector('#ice-world')
let errorPanel = world.children.find(child => child.tag === 'section')
assert.match(errorPanel.querySelector('p').textContent, /WebGL 2/)
root.querySelector('#ice-language').click()
assert.match(errorPanel.querySelector('h2').textContent, /无法启动/)
errorPanel.querySelector('[data-ice-retry]').click()
assert(errorPanel.removed)
emit({ origin: window.location.origin, source: frame.contentWindow, data: { source: 'naiwa-ice-map', type: 'ready' } })
assert.equal(frame.contentWindow.messages.at(-1).type, 'init', 'retry restores collected clues into the new iframe document')
assert(frame.contentWindow.messages.at(-1).found.includes('routeOne'))
assert.equal(frame.contentWindow.messages.at(-1).language, 'zh')
assert.equal(timers.size, 0)
controller.dispose()
assert.equal(events.get('message').size, 0)
assert(frame.removed)
blocked = false
controller = mountChapterTwo(root, 'en', () => exits++)
assert.match(root.innerHTML, /id="ice-save-status"[^>]*\bhidden/, 'successful persistence hides the warning again')
assert(JSON.parse(stored.get('naiwa-chapter-two-v1')).clues.includes('routeOne'), 'recovered storage writes the session progress to disk')
controller.dispose()

for (const language of ['zh', 'en']) {
  for (const approach of ['chase', 'restore', 'comfort']) assert.equal(resolveIceDialogue(copy[language], { phase: 'core', line: 1, approach }).text, copy[language].approachLines[approach])
  for (const response of ['trust', 'question']) assert.equal(resolveIceDialogue(copy[language], { phase: 'ending', line: 0, response }).text, copy[language].responseLines[response])
}
const legacy = normalizeIceSave({ ...mapSave, phase: 'core', line: 1, clues: ['note', 'footage', 'routeOne', 'shard', 'route', 'echo'], history: [{ phase: 'core', line: 1 }] })
assert.equal(legacy.history[0].approach, 'chase', 'legacy run history migrates its recorded choice')
legacy.history.push({ phase: 'core', line: 1, approach: 'comfort' })
assert.equal(normalizeIceSave(legacy).history.at(-1).approach, 'comfort', 'recorded history never substitutes the current choice')
browserStorage.setItem('naiwa-chapter-two-v1', JSON.stringify(legacy))
controller = mountChapterTwo(root, 'en', () => exits++)
assert(root.innerHTML.includes(copy.en.approachLines.chase), 'actual narrative uses the chosen variant')
root.querySelector('#ice-log').click()
const log = root.children.find(child => child.tag === 'dialog' && child.open)
assert(log.innerHTML.includes(copy.en.approachLines.chase))
assert(log.innerHTML.includes(copy.en.approachLines.comfort), 'actual history renders each recorded branch')
controller.dispose()

await assert.rejects(initializeIceMap({ supportsWebGL2: () => false }), error => error.code === 'unsupported')
await assert.rejects(initializeIceMap({ supportsWebGL2: () => true, loadWorld: async () => { throw new Error('network failed') } }), /network failed/)
await assert.rejects(initializeIceMap({ supportsWebGL2: () => true, loadWorld: async () => ({ referenceReady: Promise.reject(new Error('shader failed')) }) }), /shader failed/)
const layer = { position: [1, 2, 3] }
assert.equal(await initializeIceMap({ supportsWebGL2: () => true, loadWorld: async () => ({ referenceReady: Promise.resolve() }), getLayer: () => layer }), layer)

const { loadOptionalFonts } = await import(tsModuleUrl('src/fonts.ts'))
loadOptionalFonts()
assert.equal(document.head.children.length, 0, 'fonts wait until after initial rendering')
for (const callback of timers.values()) callback()
const font = document.head.children[0]
assert.equal(font.media, 'print', 'font loading cannot block the screen')
font.onload()
assert.equal(font.media, 'all')
font.onerror()
assert(font.removed, 'font errors leave system fonts available')
assert(!/<link[^>]+rel="stylesheet"[^>]+fonts\.googleapis/.test(readFileSync('index.html', 'utf8')))
console.log('Review fixes OK: persistent iframe and language handshake; session-save warning and recovery; trusted messages, retry and cleanup; branch history and legacy migration; WebGL/network/shader failures; nonblocking fonts.')
