import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
import { TestElement, fire, noop } from './ice-lifecycle-test-utils.mjs';
import { createIceChapterLayer, ROUTE_POINTS } from '../src/ice-pool/ice-chapter-layer.js';
import { bindIceHoldButton } from '../src/ice-pool/ice-input.js';
import { bindIceQualityPicker } from '../src/ice-pool/ice-quality-picker.js';
import { createFogBoundary } from '../src/ice-pool/reference-fog.js';
import { ICE_LAYOUT } from '../src/ice-pool/ice-progression.js';

const source = readFileSync(new URL('../src/ice-pool/reference-map.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('reference-map.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = ['resetTouchInputs', 'releaseTouchStick', 'releaseTouchLook', 'resetTouchStickVisual', 'bindTouchHoldButton']
  .map(name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === name)?.getText(ast)).join('\n');
const lifecycle = source.slice(source.indexOf('window.__naiwaShowFirstQualityDialog = showFirstQualityDialog;')
  + 'window.__naiwaShowFirstQualityDialog = showFirstQualityDialog;'.length, source.indexOf('function render(frameTime'));

function setup({ pendingQuality = false, storyPaused = false, menuPaused = false } = {}) {
  globalThis.document = Object.assign(new EventTarget(), { hidden: false, querySelector: () => null, querySelectorAll: () => [],
    pointerLockElement: null, createElement: tag => new TestElement(tag) });
  globalThis.window = Object.assign(new EventTarget(), { devicePixelRatio: 1, location: { origin: 'https://game.example' },
    parent: { postMessage: message => messages.push(message) }, matchMedia: () => ({ matches: false }) });
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(), canvas = new TestElement('canvas'), messages = [];
  scene.fog = new THREE.FogExp2(0x78a8c4, .049);
  const fogBoundary = createFogBoundary(scene, { chunkSize: 16, viewRadius: 1 });
  fogBoundary.update(0, 0);
  const layer = createIceChapterLayer({ scene, camera, canvas, columnAt: () => ({ solid: false, level: 0, ceiling: 5 }) });
  layer.setInit({ found: [] }); layer.setMenuPaused(menuPaused || pendingQuality); layer.setStoryPaused(storyPaused);
  const welcome = new TestElement(), inputs = ['balanced', 'performance'].map(value => {
    const input = { value, disabled: false, checked: false }, card = new TestElement();
    input.closest = () => card; card.querySelector = () => input; welcome.append(card); return input;
  });
  const picker = bindIceQualityPicker({ container: welcome, inputs, canChoose: () => pendingQuality, onChoose: noop });
  picker.select('balanced');
  const button = new TestElement('button'), stick = new TestElement();
  const input = new Function('window', 'firstQualityPicker', 'iceChapterLayer', 'bindIceHoldButton', 'touchStickZone', 'canvas', 'THREE', 'distanceFogBoundary', `
    const keys = new Set(), touchMove = new THREE.Vector2(), touchHoldResets = [];
    let touchRiseHeld=false, touchDiveHeld=false, jumpQueued=false, touchStickPointerId=null,
      touchStickCaptureTarget=null, touchLookPointerId=null, touchPlaying=${!pendingQuality && !menuPaused && !storyPaused};
    ${functions}
    ${lifecycle}
    return { bind: button => bindTouchHoldButton(button, held => { touchRiseHeld=held; }, true),
      interrupt() { keys.add('KeyW'); touchMove.set(1,1); touchDiveHeld=true; jumpQueued=true;
        touchStickPointerId=3; touchStickCaptureTarget=canvas; canvas.setPointerCapture(3);
        touchLookPointerId=4; canvas.setPointerCapture(4); },
      state: () => ({keys:keys.size, move:touchMove.length(), rise:touchRiseHeld, dive:touchDiveHeld, jump:jumpQueued,
        stick:touchStickPointerId, look:touchLookPointerId, playing:touchPlaying}) };
  `)(window, picker, layer, bindIceHoldButton, stick, canvas, THREE, fogBoundary);
  input.bind(button);
  return { scene, camera, canvas, layer, messages, welcome, inputs, picker, button, input };
}
const press = button => fire(button, 'pointerdown', { pointerId: 1, pointerType: 'touch', button: 0 });
function assertReleased(input, button, canvas) {
  const state = input.state();
  assert.deepEqual({ ...state, playing: undefined }, { keys: 0, move: 0, rise: false, dive: false, jump: false, stick: null, look: null, playing: undefined });
  assert(!button.classList.contains('is-pressed')); assert.equal(button.captured.size, 0); assert.equal(canvas.captured.size, 0);
}

test('cached hide clears every ephemeral input, preserves the same clue layer and supports a later permanent disposal', () => {
  const { scene, camera, canvas, layer, messages, button, input } = setup();
  const note = scene.children.find(group => group.userData.clueId === 'note');
  try {
    for (let cycle = 0; cycle < 2; cycle++) {
      press(button); assert.equal(input.state().rise, true); input.interrupt();
      fire(window, 'pagehide', { persisted: true });
      assertReleased(input, button, canvas);
      assert(scene.children.includes(note), 'Cacheable navigation must retain clue groups');
      assert(scene.children.some(child => child.name === 'distance-fog-boundary'), 'Cacheable navigation retains the fog surface');
      assert.equal(input.state().playing, true, 'Cacheable navigation must retain the gameplay mode');
      fire(window, 'pageshow', { persisted: true });
    }
    camera.position.set(ICE_LAYOUT.note.x, 1.7, ICE_LAYOUT.note.z); layer.update(.05, 1);
    fire(window, 'keydown', { code: 'KeyE', repeat: false });
    assert(messages.some(message => message.type === 'clue' && message.id === 'note'), 'Evidence remains collectible after cache restores');
    press(button); assert.equal(input.state().rise, true);
    fire(window, 'pagehide', { persisted: false });
    assertReleased(input, button, canvas); assert.equal(scene.children.length, 0);
    press(button); assert.equal(input.state().rise, false, 'Permanent exit removes the hold-button handler even after previous cache hides');
  } finally { layer.dispose(); }
});

test('pending quality selection survives repeated cached hides and is cleaned only on permanent exit', () => {
  const { layer, scene, picker, welcome, inputs, input, button, canvas } = setup({ pendingQuality: true });
  try {
    picker.select('performance');
    for (let cycle = 0; cycle < 2; cycle++) {
      input.interrupt(); fire(window, 'pagehide', { persisted: true }); fire(window, 'pageshow', { persisted: true });
      assertReleased(input, button, canvas); assert.equal(input.state().playing, false);
      assert.equal(picker.value(), 'performance'); assert(scene.children.length > 0);
    }
    fire(welcome, 'click', { target: inputs[0] }); assert.equal(picker.value(), 'balanced', 'Quality card activation remains attached after restore');
    fire(window, 'pagehide', { persisted: false });
    fire(welcome, 'click', { target: inputs[1] }); assert.equal(picker.value(), 'balanced', 'Permanent exit removes quality listeners');
    assert.equal(scene.children.length, 0);
  } finally { layer.dispose(); picker.dispose(); }
});

test('cached hide retains recovered evidence and resumes the current passage checkpoint', () => {
  const { layer, scene, camera, messages } = setup();
  try {
    layer.setInit({ found: ['note', 'footage'] });
    const note = scene.children.find(group => group.userData.clueId === 'note');
    const film = scene.children.find(group => group.userData.clueId === 'footage');
    const step = ([x, z]) => { camera.position.set(x, 1.7, z + .8); layer.update(.05, 1); };
    step(ROUTE_POINTS[0][1]); step(ROUTE_POINTS[0][2]);
    fire(window, 'pagehide', { persisted: true }); fire(window, 'pageshow', { persisted: true });
    assert(scene.children.includes(note)); assert.equal(note.visible, false); assert.equal(film.visible, false);
    step(ROUTE_POINTS[0][3]); step(ROUTE_POINTS[0][4]);
    assert(messages.some(message => message.type === 'clue' && message.id === 'routeOne'), 'Restore continues the unfinished passage instead of resetting its checkpoints');
    assert(!messages.some(message => message.id === 'note' || message.id === 'footage'));
    fire(window, 'pagehide', { persisted: false }); assert.equal(scene.children.length, 0);
  } finally { layer.dispose(); }
});

for (const pause of ['story', 'menu']) test(`cached hide preserves ${pause} pause and its collection gate`, () => {
  const { layer, scene, camera, messages, input, button, canvas } = setup({ storyPaused: pause === 'story', menuPaused: pause === 'menu' });
  try {
    input.interrupt(); fire(window, 'pagehide', { persisted: true }); fire(window, 'pageshow', { persisted: true });
    assertReleased(input, button, canvas); assert.equal(input.state().playing, false); assert(scene.children.length > 0);
    assert.equal(layer.isStoryPaused(), pause === 'story');
    camera.position.set(ICE_LAYOUT.note.x, 1.7, ICE_LAYOUT.note.z); layer.update(.05, 1);
    fire(window, 'keydown', { code: 'KeyE', repeat: false }); assert.equal(messages.length, 0);
    layer.setStoryPaused(false); layer.setMenuPaused(false);
    fire(window, 'keydown', { code: 'KeyE', repeat: false }); assert(messages.some(message => message.id === 'note'));
    fire(window, 'pagehide', { persisted: false }); assert.equal(scene.children.length, 0);
  } finally { layer.dispose(); }
});
