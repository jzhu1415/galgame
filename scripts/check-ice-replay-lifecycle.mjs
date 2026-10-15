import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test, { afterEach } from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
import { compile, moduleUrl, tsModuleUrl } from './ts-module.mjs';
import { TestElement, fire, noop, flushDialogCloseTasks } from './ice-lifecycle-test-utils.mjs';
import { createIceChapterLayer, ROUTE_POINTS } from '../src/ice-pool/ice-chapter-layer.js';
import { ICE_LAYOUT } from '../src/ice-pool/ice-progression.js';

const project = fileURLToPath(new URL('../', import.meta.url));
const stored = new Map(), timers = new Map(), frames = [], audio = [];
let timerId = 0, selectedReplay;
const timer = callback => { const id = ++timerId; timers.set(id, callback); return id; };
globalThis.setTimeout = timer; globalThis.clearTimeout = id => timers.delete(id);
globalThis.localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) };
globalThis.window = Object.assign(new EventTarget(), { location: { origin: 'https://game.example' }, setTimeout: timer, clearTimeout: globalThis.clearTimeout,
  devicePixelRatio: 1, matchMedia: () => ({ matches: false }) });
globalThis.document = Object.assign(new EventTarget(), { hidden: false, documentElement: { lang: 'zh-CN' }, activeElement: null,
  querySelector: () => null, querySelectorAll: () => [], pointerLockElement: null, getElementById: () => null,
  createElement(tag) {
    const element = new TestElement(tag);
    if (tag === 'iframe') { element.contentWindow = { messages: [], postMessage(data) { this.messages.push(structuredClone(data)); this.deliver?.(data); } }; frames.push(element); }
    return element;
  } });
globalThis.Audio = class extends EventTarget {
  constructor(src) { super(); this.src = src; this.paused = true; audio.push(this); }
  play() { this.paused = false; this.playCalls = (this.playCalls ?? 0) + 1; return Promise.resolve(); }
  pause() { this.paused = true; }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  load() {}
};
const chapterFile = resolve(project, 'src/chapter-two.ts');
let chapterCode = compile(chapterFile).replace(/^import ['"][^'"]+\.css['"];\n/gm, '').replace(/(['"])(\.\/[^'"]+)\1/g,
  (_, _quote, relative) => JSON.stringify(tsModuleUrl(resolve(dirname(chapterFile), `${relative}.ts`))));
// Keep selection/checkpoint/confirmation logic real; the canvas dialog's display is irrelevant here.
const mapDisplay = moduleUrl('export function showIceStoryMap(root, language, save, progress, select) { globalThis.selectIceReplay = select; const dialog = document.createElement("dialog"); root.append(dialog); dialog.showModal(); return dialog }');
chapterCode = chapterCode.replace(JSON.stringify(tsModuleUrl(resolve(project, 'src/chapter-two-map.ts'))), JSON.stringify(mapDisplay));
const { mountChapterTwo, copy, fragmentStories } = await import(moduleUrl(chapterCode + '\nexport { copy, fragmentStories };'));
const { browserStorage } = await import(tsModuleUrl(resolve(project, 'src/browser-storage.ts')));
const { newIceSave, iceSaveKey, iceProgressKey } = await import(tsModuleUrl(resolve(project, 'src/chapter-two-progress.ts')));
const { writeIceManualSave, iceManualSavesKey } = await import(tsModuleUrl(resolve(project, 'src/chapter-two-saves.ts')));
const { createDialogueReader } = await import(tsModuleUrl(resolve(project, 'src/reading-settings.ts')));
const allClues = ['note', 'footage', 'routeOne', 'shard', 'route', 'echo'];
const mapStart = () => ({ ...newIceSave(), phase: 'map', approach: 'chase' });
const saved = () => JSON.parse(browserStorage.getItem(iceSaveKey));
const progressSaved = () => JSON.parse(browserStorage.getItem(iceProgressKey));
function mount(state, checkpoints, language = 'zh', audioEnabled = false, textSpeed = 0) {
  browserStorage.setItem('naiwa-audio-enabled-v1', String(audioEnabled));
  browserStorage.setItem('naiwa-reading-settings-v1', JSON.stringify({ textSpeed, voiceVolume: 1 }));
  browserStorage.setItem(iceSaveKey, JSON.stringify(state));
  browserStorage.setItem(iceProgressKey, JSON.stringify({ version: 1, visited: ['map', 'footage', 'ending-question'], checkpoints, endings: ['ending-question'] }));
  const root = new TestElement(); root.ownerDocument = document;
  const controller = mountChapterTwo(root, language, noop);
  return { root, controller };
}
function receive(frame, type, fields = {}) { fire(window, 'message', { origin: window.location.origin, source: frame.contentWindow, data: { source: 'naiwa-ice-map', type, ...fields } }); }
function choose(root, id) { root.querySelector('#ice-routes').click(); selectedReplay = globalThis.selectIceReplay; selectedReplay(id); return root.querySelector('#app-confirm'); }
function confirm(dialog) { dialog.querySelector('[data-confirm]').click(); }
function runNextTimer() { const [id, callback] = timers.entries().next().value ?? []; assert(callback, 'Expected a scheduled typing tick'); timers.delete(id); callback(); }
afterEach(() => { flushDialogCloseTasks(); document.hidden = false; });

test('confirmed map replay creates a checkpoint-initialized iframe and allows the complete exploration again', () => {
  const { root, controller } = mount({ ...mapStart(), clues: allClues }, { map: mapStart() });
  try {
    const oldFrame = frames.at(-1); receive(oldFrame, 'ready');
    confirm(choose(root, 'map'));
    const freshFrame = frames.at(-1);
    assert(oldFrame.removed, 'Confirmed checkpoint replay must dispose the later exploration iframe');
    assert.notEqual(freshFrame, oldFrame);
    assert.deepEqual(saved().clues, []);
    receive(freshFrame, 'ready');
    assert.deepEqual(freshFrame.contentWindow.messages.find(message => message.type === 'init').found, []);
    assert(progressSaved().visited.includes('footage')); assert(progressSaved().endings.includes('ending-question'));

    // Feed the real bridge's initialization into the real scene layer. Real clue/core
    // messages return through that bridge and its chapter gates, rather than scripted pickups.
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(), canvas = new TestElement('canvas');
    const layer = createIceChapterLayer({ scene, camera, canvas, columnAt: () => ({ solid: false, level: 0, ceiling: 5 }) });
    freshFrame.onRemove = () => layer.dispose();
    window.parent = { postMessage: message => receive(freshFrame, message.type, message.id ? { id: message.id } : {}) };
    freshFrame.contentWindow.deliver = data => { if (data.type === 'story-pause') layer.setStoryPaused(data.paused); else if (data.type === 'language') layer.setLanguage(data.language); };
    layer.setInit({ found: freshFrame.contentWindow.messages.find(message => message.type === 'init').found });
    let time = 0;
    const tick = (count = 1) => { for (let i = 0; i < count; i++) layer.update(.05, time += .05); };
    const approach = position => { camera.position.set(position.x, 1.7, position.z); tick(); };
    const inspect = () => fire(window, 'keydown', { code: 'KeyE', repeat: false });
    const finishFragment = () => {
      for (let i = 0; saved().pendingFragment && i < 8; i++) {
        const next = root.querySelector('#ice-fragment-next'); assert(next, 'An active memory must expose Continue'); next.click();
      }
      assert.equal(saved().pendingFragment, null, 'The memory must return to exploration');
    };
    approach(ICE_LAYOUT.note); inspect(); assert(saved().clues.includes('note'));
    approach(ICE_LAYOUT.footage); inspect(); tick(12); assert.equal(saved().pendingFragment?.id, 'footage'); finishFragment();
    for (const [x, z] of ROUTE_POINTS[0]) approach({ x, z: z + .8 });
    assert(saved().clues.includes('routeOne'));
    approach(ICE_LAYOUT.shard); inspect(); tick(12); finishFragment();
    for (const [x, z] of ROUTE_POINTS[1]) approach({ x, z: z + .8 });
    assert(saved().clues.includes('route'));
    approach(ICE_LAYOUT.echo); inspect(); tick(12); finishFragment();
    assert.equal(saved().clues.length, 6);
    approach(ICE_LAYOUT.core); inspect(); assert.equal(saved().phase, 'core'); assert(freshFrame.removed);
  } finally { controller.dispose(); }
});

test('cancelled replay and language changes retain the current iframe, clues and unlocks', () => {
  const { root, controller } = mount({ ...mapStart(), clues: ['note', 'footage'] }, { map: mapStart() });
  try {
    const frame = frames.at(-1); receive(frame, 'ready'); const before = saved(), progress = progressSaved();
    const dialog = choose(root, 'map');
    assert(!frame.removed); assert.deepEqual(saved(), before);
    dialog.querySelector('[data-cancel]').click();
    assert(!frame.removed); assert.deepEqual(saved(), before); assert.deepEqual(progressSaved(), progress);
    root.children.find(child => child.tag === 'dialog' && child.open).close();
    root.querySelector('#ice-language').click();
    assert.equal(frames.at(-1), frame); assert(!frame.removed);
    assert.equal(frame.contentWindow.messages.filter(message => message.type === 'init').length, 1);
    assert.equal(frame.contentWindow.messages.filter(message => message.type === 'language').at(-1).language, 'en');
  } finally { controller.dispose(); }
});

test('fragment checkpoints restart at their first line, while manual load preserves the saved fragment line', () => {
  const checkpoint = { ...mapStart(), clues: ['note', 'footage'], pendingFragment: { id: 'footage', line: 0 } };
  const { root, controller } = mount({ ...mapStart(), clues: allClues }, { footage: checkpoint });
  try {
    const oldFrame = frames.at(-1); receive(oldFrame, 'ready'); confirm(choose(root, 'footage'));
    assert(oldFrame.removed); assert.deepEqual(saved().pendingFragment, { id: 'footage', line: 0 });
    const frame = frames.at(-1); receive(frame, 'ready');
    assert.equal(frame.contentWindow.messages.find(message => message.type === 'init').storyPaused, true);
    browserStorage.removeItem(iceManualSavesKey);
    writeIceManualSave(0, { ...checkpoint, pendingFragment: { id: 'footage', line: 2 } });
    root.querySelector('#ice-save').click();
    const panel = root.children.find(child => child.tag === 'dialog' && child.open);
    panel.querySelector('[data-load-slot="0"]').click(); confirm(root.querySelector('#app-confirm'));
    assert(frame.removed); assert.deepEqual(saved().pendingFragment, { id: 'footage', line: 2 });
    assert(progressSaved().endings.includes('ending-question'));
  } finally { controller.dispose(); }
});

test('visited legacy nodes without checkpoints cannot reset the exploration', () => {
  const { root, controller } = mount({ ...mapStart(), clues: ['note', 'footage'] }, {});
  try {
    const frame = frames.at(-1), before = saved(); root.querySelector('#ice-routes').click(); globalThis.selectIceReplay('footage');
    assert.equal(root.querySelector('#app-confirm'), null); assert(!frame.removed); assert.deepEqual(saved(), before);
    assert.equal(progressSaved().checkpoints.footage, undefined);
  } finally { controller.dispose(); }
});

for (const language of ['zh', 'en']) test(`${language} response replay starts the selected branch, clears old audio and stops automatic advance`, () => {
  const trust = { ...mapStart(), phase: 'ending', response: 'trust', clues: allClues, completed: true };
  const question = { ...trust, response: 'question' };
  const { root, controller } = mount(trust, { 'ending-trust': trust, 'ending-question': question }, language, true);
  try {
    const oldAudio = audio.at(-1);
    assert.equal(root.querySelector('.ice-copy > p').textContent, copy[language].responseLines.trust);
    root.querySelector('#ice-auto').click();
    confirm(choose(root, 'ending-question'));
    assert.equal(oldAudio.playCalls, 1, 'Confirmation must not briefly resume the old branch voice');
    assert(oldAudio.paused); assert.equal(oldAudio.src, '');
    assert.equal(saved().response, 'question'); assert.equal(saved().line, 0);
    assert.equal(root.querySelector('.ice-copy > p').textContent, copy[language].responseLines.question);
    assert.equal(root.querySelector('#ice-auto').getAttribute('aria-pressed'), 'false');
    assert.equal(timers.size, 0, 'Replay must not inherit a queued Auto timer');
    confirm(choose(root, 'ending-trust'));
    assert.equal(root.querySelector('.ice-copy > p').textContent, copy[language].responseLines.trust);
  } finally { controller.dispose(); }
});

// A branch switch must also invalidate any read scheduled against the previous key.
// Use the actual private key initializer and reader; do not assert its string format.
const ast = ts.createSourceFile(chapterFile, readFileSync(chapterFile, 'utf8'), ts.ScriptTarget.Latest, true);
let keyInitializer;
(function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'readingKey') keyInitializer = node.initializer.getText(ast); ts.forEachChild(node, visit); })(ast);
for (const language of ['zh', 'en']) test(`${language} reading identity resets response and approach characters`, () => {
  const context = { save: { ...mapStart(), phase: 'ending', response: 'trust' }, language };
  vm.createContext(context); vm.runInContext(`const readingKey = ${keyInitializer};`, context);
  const reader = createDialogueReader(), element = { textContent: '' };
  try {
    reader.bind(element, vm.runInContext('readingKey()', context), copy[language].responseLines.trust);
    context.save.response = 'question'; reader.bind(element, vm.runInContext('readingKey()', context), copy[language].responseLines.question);
    assert.equal(element.textContent, copy[language].responseLines.question);
    context.save = { ...mapStart(), phase: 'core', line: 1, approach: 'chase' };
    reader.bind(element, vm.runInContext('readingKey()', context), copy[language].approachLines.chase);
    context.save.approach = 'comfort'; reader.bind(element, vm.runInContext('readingKey()', context), copy[language].approachLines.comfort);
    assert.equal(element.textContent, copy[language].approachLines.comfort);
  } finally { reader.clear(); }
});

for (const speed of [0, 5]) test(`language redraw closes its panel before the queued close event and resumes ${speed ? 'typing' : 'instant text'}`, () => {
  const { root, controller } = mount(newIceSave(), {}, 'zh', false, speed);
  try {
    root.querySelector('#ice-menu').click(); controller.setLanguage('en');
    assert.equal(root.querySelector('dialog[open]'), null);
    flushDialogCloseTasks();
    if (speed) runNextTimer();
    assert.equal(root.querySelector('.ice-copy > p').textContent, speed ? copy.en.hospital[0][1].slice(0, 1) : copy.en.hospital[0][1]);
    assert.equal(saved().line, 0);
  } finally { controller.dispose(); }
});

test('hidden language redraw keeps new text and voice paused until foreground visibility returns', () => {
  const { root, controller } = mount(newIceSave(), {}, 'zh', true, 5);
  try {
    root.querySelector('#ice-menu').click(); document.hidden = true; fire(document, 'visibilitychange');
    controller.setLanguage('en'); flushDialogCloseTasks();
    const voice = audio.at(-1);
    assert.equal(timers.size, 0); assert.equal(root.querySelector('.ice-copy > p').textContent, '');
    assert.equal(voice.paused, true, 'A language redraw must not play a newly-created voice in the background');
    document.hidden = false; fire(document, 'visibilitychange'); runNextTimer();
    assert.equal(root.querySelector('.ice-copy > p').textContent, copy.en.hospital[0][1].slice(0, 1));
    assert.equal(voice.paused, false); assert.equal(voice.playCalls, 1);
  } finally { controller.dispose(); }
});

test('a queued panel close delivered after hiding cannot revive text or voice, and foreground resumes both', () => {
  const { root, controller } = mount(newIceSave(), {}, 'zh', true, 5);
  try {
    const voice = audio.at(-1);
    root.querySelector('#ice-menu').click();
    root.children.find(child => child.tag === 'dialog' && child.open).close();
    document.hidden = true; fire(document, 'visibilitychange'); flushDialogCloseTasks();
    assert.equal(timers.size, 0); assert.equal(root.querySelector('.ice-copy > p').textContent, '');
    assert.equal(voice.paused, true); assert.equal(voice.playCalls, 1);
    document.hidden = false; fire(document, 'visibilitychange'); runNextTimer();
    assert.equal(root.querySelector('.ice-copy > p').textContent, copy.zh.hospital[0][1].slice(0, 1));
    assert.equal(voice.paused, false); assert.equal(voice.playCalls, 2);
  } finally { controller.dispose(); }
});

test('an explicit panel close already in the background preserves deferred voice intent without restarting typing', () => {
  const { root, controller } = mount(newIceSave(), {}, 'zh', true, 5);
  try {
    const voice = audio.at(-1);
    root.querySelector('#ice-menu').click();
    const panel = root.children.find(child => child.tag === 'dialog' && child.open);
    document.hidden = true; fire(document, 'visibilitychange');
    panel.querySelector('#ice-routes-close').click(); flushDialogCloseTasks();
    assert.equal(timers.size, 0); assert.equal(voice.paused, true); assert.equal(voice.playCalls, 1);
    document.hidden = false; fire(document, 'visibilitychange'); runNextTimer();
    assert.equal(root.querySelector('.ice-copy > p').textContent, copy.zh.hospital[0][1].slice(0, 1));
    assert.equal(voice.paused, false); assert.equal(voice.playCalls, 2);
  } finally { controller.dispose(); }
});

for (const hidden of [false, true]) test(`map language redraw ${hidden ? 'keeps the hidden pause until foreground' : 'releases the closed panel pause'} without recreating exploration`, () => {
  const { root, controller } = mount(mapStart(), {});
  let layer;
  try {
    const frame = frames.at(-1); receive(frame, 'ready');
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
    layer = createIceChapterLayer({ scene, camera, canvas: new TestElement('canvas'), columnAt: () => ({ solid: false, level: 0, ceiling: 5 }) });
    layer.setInit({ found: [] }); frame.onRemove = () => layer.dispose();
    frame.contentWindow.deliver = data => { if (data.type === 'story-pause') layer.setStoryPaused(data.paused); else if (data.type === 'language') layer.setLanguage(data.language); };
    window.parent = { postMessage: message => receive(frame, message.type, message.id ? { id: message.id } : {}) };
    root.querySelector('#ice-menu').click(); assert.equal(layer.isStoryPaused(), true);
    if (hidden) { document.hidden = true; fire(document, 'visibilitychange'); }
    controller.setLanguage('en'); flushDialogCloseTasks();
    assert.equal(layer.isStoryPaused(), hidden); assert.equal(frames.at(-1), frame); assert(!frame.removed);
    if (hidden) { document.hidden = false; fire(document, 'visibilitychange'); }
    assert.equal(layer.isStoryPaused(), false);
    camera.position.set(ICE_LAYOUT.note.x, 1.7, ICE_LAYOUT.note.z); layer.update(.05, 1);
    fire(window, 'keydown', { code: 'KeyE', repeat: false }); assert(saved().clues.includes('note'));
  } finally { controller.dispose(); layer?.dispose(); }
});

test('pending fragment language redraw resumes its text while retaining the map story gate', () => {
  const state = { ...mapStart(), clues: ['note', 'footage'], pendingFragment: { id: 'footage', line: 1 } };
  const { root, controller } = mount(state, {}, 'zh', false, 5);
  try {
    const frame = frames.at(-1); receive(frame, 'ready');
    root.querySelector('#ice-menu').click(); controller.setLanguage('en'); flushDialogCloseTasks();
    runNextTimer();
    assert.equal(root.querySelector('.ice-fragment-dialogue > p').textContent, fragmentStories.en.footage.lines[1][1].slice(0, 1));
    assert.equal(frame.contentWindow.messages.filter(message => message.type === 'story-pause').at(-1).paused, true);
    assert.equal(frames.at(-1), frame); assert.deepEqual(saved().pendingFragment, { id: 'footage', line: 1 });
  } finally { controller.dispose(); }
});
