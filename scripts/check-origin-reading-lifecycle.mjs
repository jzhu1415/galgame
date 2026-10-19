import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { tsModuleUrl } from './ts-module.mjs'

// Execute the current application's real reading/navigation/media functions.
// Browser DOM, media decoding, and elapsed time are the only external doubles.
const source = ts.createSourceFile('main.ts', readFileSync(resolve('src/main.ts'), 'utf8'), ts.ScriptTarget.Latest, true)
const javascript = text => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const variable = name => {
  for (const statement of source.statements) if (ts.isVariableStatement(statement)) {
    const declaration = statement.declarationList.declarations.find(item => item.name.getText(source) === name)
    if (declaration) return `const ${name} = ${declaration.initializer.getText(source)};`
  }
  throw Error(`Missing source variable: ${name}`)
}
const functionNames = new Set(['renderGame', 'openModal', 'renderModal', 'confirmRestart', 'advance', 'enter', 'recordLine', 'save', 'saveProgress', 'unlockScene', 'availableChoices', 'clearPlaybackTimer', 'stopPlayback', 'current', 'sceneLines', 'esc', 'syncSound', 'syncAmbientLaugh', 'stopSound', 'stopAmbientLaugh', 'playSound', 'soundClips', 'longNaiwaLine'])
const declarations = source.statements.filter(node => ts.isFunctionDeclaration(node)
  && (functionNames.has(node.name?.text) || /^(originGameActive|originReadingPaused|syncOriginReading|pauseOrigin|resumeOrigin|handleOrigin)/.test(node.name?.text ?? '')))
const lifecycleRegistrations = source.statements.filter(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
  && ['document.addEventListener', 'root.addEventListener'].includes(node.expression.expression.getText(source))
  && ['visibilitychange', 'close'].includes(node.expression.arguments[0]?.text))
const application = javascript(variable('ui') + '\n' + declarations.map(node => node.getText(source)).join('\n')
  + '\n' + lifecycleRegistrations.map(node => node.getText(source)).join('\n'))

let now = 0, timerId = 0
const timers = new Map(), stored = new Map(), writes = []
globalThis.localStorage = {
  getItem: key => stored.get(key) ?? null,
  setItem: (key, value) => { stored.set(key, value); writes.push({ key, value: JSON.parse(value) }) },
  removeItem: key => stored.delete(key),
}
globalThis.window = { addEventListener() {} }
globalThis.setTimeout = (callback, delay) => { const id = ++timerId; timers.set(id, { callback, at: now + delay }); return id }
globalThis.clearTimeout = id => timers.delete(id)
const tick = duration => {
  const end = now + duration
  while (true) {
    const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
    if (!next) break
    now = next[1].at; timers.delete(next[0]); next[1].callback()
  }
  now = end
}
const reading = await import(tsModuleUrl('src/reading-settings.ts'))
const { browserStorage } = await import(tsModuleUrl('src/browser-storage.ts'))
const { story, memoryNames, quoteJournalSpeech } = await import(tsModuleUrl('src/story.ts'))
const origin = await import(tsModuleUrl('src/origin-state.ts'))
const { characterVoiceSequence } = await import(tsModuleUrl('src/character-voice.ts'))
const { confirmInApp } = await import(tsModuleUrl('src/ui-confirm.ts'))

class Surface {
  constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.nodes = new Map(); this.listeners = new Map(); this.children = []; this.textContent = ''; this.innerHTML = ''; this.dataset = {}; this.attributes = {}; this.isConnected = true; this.open = false }
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(callback) }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback) }
  fire(type) { for (const callback of [...(this.listeners.get(type) ?? [])]) callback({ target: this }) }
  setAttribute(name, value) { this.attributes[name] = value }
  querySelector(selector) {
    if (selector === 'dialog[open]') return this.children.find(child => child.tagName === 'DIALOG' && child.open) ?? (this.externalDialogOpen ? {} : null)
    if (selector === ':scope > .game') return this.game ?? null
    if (selector === '#app-confirm' || selector === '#app-dialog') return this.children.find(child => child.id === selector.slice(1)) ?? null
    if (!this.nodes.has(selector)) this.nodes.set(selector, new Surface())
    return this.nodes.get(selector)
  }
  querySelectorAll() { return [] }
  append(child) { child.parent = this; this.children.push(child) }
  remove() { this.isConnected = false; if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this) }
  showModal() { this.open = true }
  close() { if (!this.open) return; this.open = false; this.parent?.fire('close'); this.fire('close') }
  focus() { globalThis.document.activeElement = this }
  after() {}
  insertAdjacentHTML() {}
  getBoundingClientRect() { return { left: 0, top: 0, right: 100, bottom: 100 } }
}
class Media extends Surface {
  constructor(src) { super('audio'); this.src = src; this.volume = 1; this.loop = false; this.playCalls = 0 }
  set src(value) { this.url = value; this.currentTime = 0; this.paused = true; this.ended = false }
  get src() { return this.url }
  play() { this.playCalls++; this.paused = false; return Promise.resolve() }
  pause() { this.paused = true }
  removeAttribute(name) { if (name === 'src') this.src = '' }
  load() { this.paused = true }
  end() { this.paused = true; this.ended = true; this.fire('ended') }
}
const contexts = []
const controller = ({ mode = 'off', speed = 0, hidden = false } = {}) => {
  timers.clear(); reading.updateReadingSettings({ textSpeed: speed })
  browserStorage.removeItem('naiwa-origin-save-v1'); browserStorage.removeItem('naiwa-origin-progress-v1')
  const root = new Surface(), document = new Surface('document'); root.game = new Surface()
  document.hidden = hidden; document.activeElement = null; document.createElement = tag => new Surface(tag)
  globalThis.document = document
  const context = {
    state: origin.newOriginSave('zh'), progress: origin.newOriginProgress(), active: true,
    selectedChapter: 1, romanceDlcOpen: false, preferredLanguage: 'zh', modal: null, appDialog: null, modalFocus: null,
    playbackMode: mode, playbackTimer: null, soundPlayback: null, ambientLaugh: null,
    suspendedSound: null, suspendedAmbient: null, ambientPlayRequest: 0, ambientEnabled: true, ambientError: false, audioEnabled: true,
    savePersistent: true, progressPersistent: true, STORAGE_KEY: 'naiwa-origin-save-v1', PROGRESS_KEY: 'naiwa-origin-progress-v1',
    root, document, window: { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout }, Audio: Media,
    story, memoryNames, quoteJournalSpeech, originLines: origin.originLines, recordOriginCheckpoint: origin.recordOriginCheckpoint,
    browserStorage, characterVoiceSequence, confirmInApp, objectScenes: {},
    dialogueReader: reading.createDialogueReader(), getReadingSettings: reading.getReadingSettings,
    readingDelay: reading.readingDelay, renderReadingControls: reading.renderReadingControls, bindReadingControls: reading.bindReadingControls,
    updateSceneImage() {}, updateFullscreenButton() {}, positionObjectHotspots() {}, isAppFullscreen: () => false,
    toggleLanguage() {}, toggleFullscreen() {}, manualSave() {}, start() {}, restartFrom() {},
  }
  context.render = () => context.renderGame()
  vm.createContext(context); vm.runInContext(application, context); contexts.push(context)
  return context
}
const text = context => context.root.game.querySelector('.dialogue-box > p').textContent
const storyWrites = from => writes.slice(from).filter(write => ['naiwa-origin-save-v1', 'naiwa-origin-progress-v1'].includes(write.key))
let failed = 0, passed = 0
const check = async (name, body) => {
  try { await body(); passed++; console.log(`PASS ${name}`) }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`) }
  finally { for (const context of contexts.splice(0)) { context.stopPlayback(); context.stopSound(); context.stopAmbientLaugh() }; timers.clear() }
}

for (const mode of ['auto', 'skip']) {
  await check(`${mode} creates no reading/media timers while initially hidden`, () => {
    const game = controller({ mode, speed: 5, hidden: true }), from = writes.length
    game.renderGame(); tick(15000)
    assert.equal(game.state.lineIndex, 0, 'hidden rendering must preserve the current line')
    assert.equal(storyWrites(from).length, 0, 'hidden rendering cannot write story progress')
    assert.equal(text(game), '', 'hidden rendering cannot reveal text')
    assert.equal(timers.size, 0, 'hidden rendering cannot create playback or typing timers')
    assert(game.soundPlayback.audio.paused, 'hidden rendering cannot start narration')
  })
  await check(`${mode} queued callback cannot save or advance after visibility changes`, () => {
    const game = controller({ mode }), from = writes.length
    game.renderGame(); const queued = timers.get(game.playbackTimer).callback
    game.document.hidden = true // Deliberately omit the event: the callback must defend itself.
    queued()
    assert.equal(game.state.lineIndex, 0, 'a queued hidden callback must not advance')
    assert.equal(storyWrites(from).length, 0, 'a queued hidden callback must not save')
  })
}
await check('visibility pauses typing/audio and resumes the same clip and reading mode', () => {
  const game = controller({ mode: 'auto', speed: 5 })
  game.renderGame(); tick(200)
  const displayed = text(game), audio = game.soundPlayback.audio; audio.currentTime = 3.5
  const from = writes.length
  game.document.hidden = true; game.document.fire('visibilitychange'); tick(20000)
  assert.equal(text(game), displayed); assert.equal(storyWrites(from).length, 0)
  assert(audio.paused, 'narration must pause while hidden'); assert.equal(timers.size, 0)
  game.document.hidden = false; game.document.fire('visibilitychange')
  assert.equal(game.soundPlayback.audio, audio); assert.equal(audio.currentTime, 3.5, 'resume must not restart the clip')
  assert(!audio.paused); assert.equal(game.playbackMode, 'auto'); assert.equal(game.state.lineIndex, 0)
  tick(200); assert.notEqual(text(game), displayed, 'typing must resume on foreground return')
})
await check('hidden audio-status redraw retains text position and creates no timers', () => {
  const game = controller({ mode: 'auto', speed: 5 }); game.renderGame(); tick(200)
  const displayed = text(game), from = writes.length
  game.document.hidden = true; game.document.fire('visibilitychange')
  game.soundPlayback.audio.end(); game.renderGame(); tick(20000)
  assert.equal(text(game), displayed); assert.equal(game.state.lineIndex, 0)
  assert.equal(timers.size, 0); assert.equal(storyWrites(from).length, 0)
})
for (const resumed of [false, true]) await check(`late play rejection is ignored ${resumed ? 'after foreground resume' : 'while hidden'}`, async () => {
  const game = controller({ mode: 'auto' }), requests = []
  game.Audio = class extends Media { play() { super.play(); return new Promise((resolve, reject) => requests.push({ resolve, reject })) } }
  game.renderGame(); const audio = game.soundPlayback.audio; audio.currentTime = 4.25
  game.document.hidden = true; game.document.fire('visibilitychange')
  if (resumed) { game.document.hidden = false; game.document.fire('visibilitychange') }
  requests[0].reject(Error('Late interruption')); await Promise.resolve()
  assert.equal(game.soundPlayback.status, 'playing', 'an invalidated play request cannot mark the current clip failed')
  assert.equal(audio.currentTime, 4.25)
  assert.equal(audio.paused, !resumed)
  if (!resumed) assert.equal(timers.size, 0)
})
for (const mediaEvent of ['ended', 'error']) await check(`menu remains paused across audio ${mediaEvent} redraw`, () => {
  const game = controller({ speed: 5 }); game.renderGame(); tick(200)
  const displayed = text(game), audio = game.soundPlayback.audio, from = writes.length
  game.openModal('menu')
  if (mediaEvent === 'ended') audio.end(); else audio.fire('error')
  tick(5000)
  assert.equal(text(game), displayed, 'audio redraw must retain the paused text position')
  assert.equal(game.state.lineIndex, 0); assert.equal(storyWrites(from).length, 0)
  assert.equal(timers.size, 0, 'menu redraw cannot restart typing')
  game.appDialog.close(); tick(200)
  assert.notEqual(text(game), displayed, 'closing the menu must resume typing')
  assert(audio.paused, 'finished or failed audio cannot resume')
})
await check('native confirmation pauses typing/media and cancel resumes without seeking', () => {
  const game = controller({ speed: 5 }); game.renderGame(); tick(200)
  const displayed = text(game), audio = game.soundPlayback.audio; audio.currentTime = 2.25
  game.confirmRestart(() => { throw Error('Cancel must not restart') })
  tick(5000); assert.equal(text(game), displayed); assert(audio.paused)
  game.root.querySelector('#app-confirm').close()
  tick(200); assert.notEqual(text(game), displayed); assert(!audio.paused); assert.equal(audio.currentTime, 2.25)
})
await check('closing a menu in the background keeps reading/media paused until foreground', () => {
  const game = controller({ mode: 'auto', speed: 5 }); game.renderGame(); tick(200)
  const displayed = text(game), audio = game.soundPlayback.audio
  game.openModal('menu'); game.document.hidden = true; game.document.fire('visibilitychange'); game.appDialog.close()
  tick(20000); assert.equal(text(game), displayed); assert.equal(game.state.lineIndex, 0); assert(audio.paused)
  game.document.hidden = false; game.document.fire('visibilitychange'); tick(200)
  assert.notEqual(text(game), displayed); assert(!audio.paused); assert.equal(game.playbackMode, 'auto')
})
for (const reason of ['manual pause', 'finished', 'mute']) await check(`foreground does not resume ${reason} narration`, () => {
  const game = controller(); game.renderGame(); const audio = game.soundPlayback.audio
  if (reason === 'mute') { game.audioEnabled = false; game.stopSound() }
  else { audio.pause(); if (reason === 'finished') game.soundPlayback.status = 'finished' }
  const plays = audio.playCalls
  game.document.hidden = true; game.document.fire('visibilitychange')
  game.document.hidden = false; game.document.fire('visibilitychange')
  assert(audio.paused); assert.equal(audio.playCalls, plays, 'only lifecycle-paused playing audio may resume')
})
await check('ambient audio resumes its position and respects disabled ambience', () => {
  const game = controller(); game.state.sceneId = 'e01'; game.syncAmbientLaugh()
  const audio = game.ambientLaugh; audio.currentTime = 7.5
  game.document.hidden = true; game.document.fire('visibilitychange'); assert(audio.paused)
  game.document.hidden = false; game.document.fire('visibilitychange')
  assert(!audio.paused); assert.equal(audio.currentTime, 7.5)
  game.document.hidden = true; game.document.fire('visibilitychange'); game.ambientEnabled = false; game.stopAmbientLaugh()
  game.document.hidden = false; game.document.fire('visibilitychange'); assert(audio.paused); assert.equal(game.ambientLaugh, null)
})
await check('a clip ending during suspension defers the next clip until foreground', () => {
  const game = controller(); game.state.lineIndex = 1; game.renderGame()
  const audio = game.soundPlayback.audio
  assert.equal(game.soundPlayback.clips.length, 2)
  game.document.hidden = true; game.document.fire('visibilitychange'); audio.end()
  assert.equal(game.soundPlayback.clipIndex, 1); assert(audio.paused, 'next clip cannot start behind a hidden page')
  game.document.hidden = false; game.document.fire('visibilitychange'); assert(!audio.paused)
  assert.equal(game.soundPlayback.clipIndex, 1, 'foreground must retain the next clip, not replay clip zero')
})
await check('late ambient play rejection cannot overwrite a successful foreground resume', async () => {
  const game = controller(), requests = []
  game.Audio = class extends Media { play() { super.play(); return new Promise((resolve, reject) => requests.push({ resolve, reject })) } }
  game.state.sceneId = 'e01'; game.syncAmbientLaugh(); const audio = game.ambientLaugh; audio.currentTime = 8.25
  game.document.hidden = true; game.document.fire('visibilitychange')
  game.document.hidden = false; game.document.fire('visibilitychange')
  requests[0].reject(Error('Old ambient request')); await Promise.resolve()
  assert(!game.ambientError); assert(!audio.paused); assert.equal(audio.currentTime, 8.25)
})
await check('inactive origin events cannot restart origin media or redraw another chapter', () => {
  const game = controller({ mode: 'auto' }); game.renderGame()
  const audio = game.soundPlayback.audio
  game.document.hidden = true; game.document.fire('visibilitychange')
  game.stopPlayback(); game.stopSound(); game.stopAmbientLaugh(); game.active = false; game.selectedChapter = 2
  const from = writes.length
  game.document.hidden = false; game.document.fire('visibilitychange'); game.root.fire('close'); game.renderGame(); tick(10000)
  assert.equal(game.soundPlayback, null); assert(audio.paused)
  assert.equal(timers.size, 0); assert.equal(storyWrites(from).length, 0)
})
await check('typing first advance reveals the line without saving or advancing', () => {
  const game = controller({ speed: 5 }); game.renderGame(); const from = writes.length
  game.advance(); assert.equal(game.state.lineIndex, 0); assert.equal(storyWrites(from).length, 0)
  assert.equal(text(game), '加班到末班车都走了，我踩着积水往家赶。')
  game.advance(); assert.equal(game.state.lineIndex, 1); assert(storyWrites(from).length > 0)
})
if (failed) { console.error(`Origin reading lifecycle: ${passed} passed, ${failed} failed`); process.exitCode = 1 }
else console.log(`Origin reading lifecycle OK: ${passed} checks; background timers/saves, media position and intent, native menus, redraws, and inactive chapter cleanup.`)
