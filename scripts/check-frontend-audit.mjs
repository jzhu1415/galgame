import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { tsModuleUrl } from './ts-module.mjs'

// Execute the actual application shortcuts, without importing the auto-mounted app.
const main = ts.createSourceFile('main.ts', readFileSync('src/main.ts', 'utf8'), ts.ScriptTarget.ES2022, true)
const javascript = text => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/^export /gm, '')
const declaration = name => main.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(main)
const keyboard = main.statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
  && node.expression.expression.getText(main) === 'window.addEventListener' && node.expression.arguments[0]?.text === 'keydown')
assert(keyboard)
let onKey, registration, backCount = 0, fullscreens = 0, dialogOpen = false, menu = null
const document = { fullscreenElement: null, activeElement: null, querySelector: () => null }
globalThis.MouseEvent = class {}
const window = { addEventListener(_type, handler, options) { onKey = handler; registration = options } }
const back = { click() { backCount++ } }
const root = { querySelector(selector) {
  if (selector === 'dialog[open]') return dialogOpen ? {} : null
  if (selector.startsWith('.crimson-settings')) return menu
  return back
} }
new Function('window', 'document', 'root', 'toggleFullscreen', javascript(keyboard.getText(main)))(window, document, root, () => { fullscreens++ })
assert(!registration?.capture, 'local controls must receive Escape before chapter navigation')
const key = (name, values = {}) => {
  const event = { key: name, defaultPrevented: false, preventDefault() { this.defaultPrevented = true }, stopImmediatePropagation() { this.stopped = true }, ...values }
  onKey(event); return event
}
key('Escape', { defaultPrevented: true })
assert.equal(backCount, 0, 'canceling a local drag cannot leave the chapter')
document.fullscreenElement = { tagName: 'VIDEO' }
assert(!key('Escape').defaultPrevented, 'native video Escape must remain available')
assert.equal(backCount, 0, 'exiting a video player does not navigate away from the film')
document.fullscreenElement = null
dialogOpen = true
key('Escape'); assert.equal(backCount, 0, 'a native dialog gets the first Escape')
dialogOpen = false
let menuFocused = false
menu = { open: true, querySelector: () => ({ focus() { menuFocused = true } }) }
key('Escape'); assert(!menu.open && menuFocused); assert.equal(backCount, 0)
menu = null
key('Escape'); assert.equal(backCount, 1)
assert(key('F11').defaultPrevented); assert.equal(fullscreens, 1)
key('F11', { repeat: true }); assert.equal(fullscreens, 1)

// Page replacement must move focus to the equivalent new control.
for (const id of ['language', 'settings-entry']) {
  document.activeElement = { id }
  let rendered = 0, focused = 0, menuFocused = 0, changed
  const summary = { focus(options) { assert(options.preventScroll); menuFocused++ } }
  const closedMenu = { querySelector: () => summary }
  const focusRoot = { querySelector(selector) { assert.equal(selector, '#' + id); return {
    closest: () => id === 'settings-entry' ? closedMenu : null,
    focus(options) { assert(options.preventScroll); focused++ },
  } } }
  const toggle = new Function('root', 'document', 'preferredLanguage', 'setPreferredLanguage', 'render',
    javascript(declaration('toggleLanguage')) + '\nreturn toggleLanguage;')(focusRoot, document, 'zh', language => { changed = language }, () => { rendered++; document.activeElement = {} })
  toggle()
  assert.equal(changed, 'en'); assert.equal(rendered, 1)
  assert.equal(focused, id === 'language' ? 1 : 0)
  assert.equal(menuFocused, id === 'settings-entry' ? 1 : 0, 'an entry inside a closed menu restores focus to its visible summary')
}

// Returning after switching chapters on the detail page must not focus a hidden home panel.
let returnHome, entryFocused = 0, tabFocused = 0
const hiddenEntry = { closest: () => ({}), focus() { entryFocused++ } }
const selectedTab = { focus() { tabFocused++ } }
const homeButton = { addEventListener(_type, callback) { returnHome = callback } }
const navigationRoot = {
  querySelector(selector) { if (selector === '#chapter-home') return homeButton; if (selector === '#chapter-three') return hiddenEntry; if (selector === '[data-home-tab][aria-selected="true"]') return selectedTab; return null },
  querySelectorAll: () => [],
}
const bind = new Function('root', 'document', 'toggleLanguage', 'toggleFullscreen', 'stopPlayback', 'render', 'showReleaseNotes',
  "let active = false, chapterPlaying = false, selectedChapter = 3, preferredLanguage = 'zh';\n" + javascript(declaration('bindPromoNavigation')) + '\nreturn bindPromoNavigation;')(navigationRoot, document, () => {}, () => {}, () => {}, () => {}, () => {})
bind(3)
returnHome({ preventDefault() {} })
assert.equal(entryFocused, 0); assert.equal(tabFocused, 1)

// Watch progress must exclude an entire hidden-tab interval, even if the browser
// suppresses all media events until the tab becomes visible again.
class Surface extends EventTarget {
  constructor() { super(); this.listeners = new Map(); this.children = []; this.isConnected = true }
  addEventListener(type, callback, options) { super.addEventListener(type, callback, options); if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(callback) }
  removeEventListener(type, callback, options) { super.removeEventListener(type, callback, options); this.listeners.get(type)?.delete(callback) }
  fire(type) { const event = new Event(type, { cancelable: true }); this.dispatchEvent(event); return event }
  append(child) { this.children.push(child) }
  setAttribute() {}
  insertAdjacentHTML() {}
  remove() { this.isConnected = false }
  focus() {}
  showModal() { this.open = true }
  close() { this.open = false; this.fire('close') }
}
globalThis.window = new Surface()
const { DlcWatchSession, DLC_WATCH_KEY, DLC_REQUIRED_VIEWS } = await import(tsModuleUrl('src/dlc-unlock-progress.ts'))
const dlcSource = ts.createSourceFile('dlc-unlock.ts', readFileSync('src/dlc-unlock.ts', 'utf8'), ts.ScriptTarget.ES2022, true)
const show = dlcSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'showDlcUnlock')
const mediaDocument = new Surface()
mediaDocument.visibilityState = 'visible'; mediaDocument.activeElement = null
const dialog = new Surface(), video = new Surface(), play = new Surface(), enter = new Surface(), status = new Surface(), close = new Surface(), form = new Surface()
const selectors = { video, '[data-play]': play, '[data-enter]': enter, '[data-close]': close, '.dlc-unlock-progress': status, '.dlc-key-form': form }
dialog.querySelector = selector => selectors[selector]
dialog.children = [new Surface(), video]
let clock = 0, views = 0, pauses = 0
video.currentTime = 0; video.duration = 10; video.playbackRate = 1
video.pause = () => { pauses++; video.paused = true }
video.play = () => { video.paused = false; video.fire('playing'); return Promise.resolve() }
video.removeAttribute = () => {}; video.load = () => {}
mediaDocument.createElement = tag => tag === 'dialog' ? dialog : new Surface()
const showUnlock = new Function('document', 'performance', 'browserStorage', 'DlcWatchSession', 'DLC_WATCH_KEY', 'DLC_REQUIRED_VIEWS', 'loadDlcViews', 'isRomanceDlcUnlocked', 'redeemDlcKey',
  javascript(show.getText(dlcSource)) + '\nreturn showDlcUnlock;')(mediaDocument, { now: () => clock }, { setItem(key, value) { assert.equal(key, DLC_WATCH_KEY); views = JSON.parse(value); return true } }, DlcWatchSession, DLC_WATCH_KEY, DLC_REQUIRED_VIEWS, () => views, () => views >= 3, () => 'invalid')
showUnlock({ querySelector: () => null, append() {} }, 'en', () => {}, () => {})
play.fire('click')
for (let t = .25; t <= 1; t += .25) { video.currentTime = t; clock += 250; video.fire('timeupdate') }
mediaDocument.visibilityState = 'hidden'; mediaDocument.fire('visibilitychange')
video.currentTime = 10; clock += 12000 // A browser might deliver no hidden-tab timeupdate.
mediaDocument.visibilityState = 'visible'; mediaDocument.fire('visibilitychange')
video.fire('ended')
assert.equal(views, 0, 'returning from a hidden tab cannot count unseen video')
assert(pauses > 1, 'the unlock film pauses when the document goes to the background')
play.fire('click')
for (let t = .25; t <= 1; t += .25) { video.currentTime = t; clock += 250; video.fire('timeupdate') }
mediaDocument.visibilityState = 'hidden'; mediaDocument.fire('visibilitychange'); clock += 12000
mediaDocument.visibilityState = 'visible'; mediaDocument.fire('visibilitychange'); video.play()
for (let t = 1.25; t <= 10; t += .25) { video.currentTime = t; clock += 250; video.fire('timeupdate') }
video.fire('ended')
assert.equal(views, 1, 'a paused viewing can resume and complete in the foreground')
dialog.close()
assert.equal(mediaDocument.listeners.get('visibilitychange')?.size ?? 0, 0, 'closing the dialog releases its background listener')
console.log('Frontend audit OK: local Escape priority, native film fullscreen, modal/menu/back navigation, language and home focus, hidden-tab video coverage, pause/resume and listener cleanup.')
