import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bindIceHoldButton, isIceControlEvent } from '../src/ice-pool/ice-input.js';

const listeners = new Map(), captured = new Set(), classes = new Set();
let playing = true, held = false, presses = 0;
const button = {
  addEventListener: (type, fn) => listeners.set(type, fn),
  removeEventListener: type => listeners.delete(type),
  classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
  setPointerCapture: id => captured.add(id), hasPointerCapture: id => captured.has(id),
  releasePointerCapture: id => { captured.delete(id); emit('lostpointercapture', { pointerId: id }); },
};
const emit = (type, extra = {}) => listeners.get(type)?.({ pointerType: 'touch', pointerId: 1,
  preventDefault() {}, stopPropagation() {}, cancelable: true, ...extra });
const binding = bindIceHoldButton({ button, canPress: () => playing, setHeld: next => { held = next; }, onPress: () => presses++ });
const released = () => {
  assert.equal(held, false); assert.equal(classes.size, 0); assert.equal(captured.size, 0);
};

// Modern phones deliver both pointer and touch events for one finger contact.
emit('pointerdown'); emit('touchstart');
assert.equal(held, true); assert.equal(presses, 1);
emit('pointerup'); emit('touchend', { touches: [] }); emit('click', { detail: 1 });
released(); assert.equal(presses, 1, 'Compatibility clicks cannot queue an extra jump');
emit('pointerdown'); emit('lostpointercapture'); released();
emit('pointerdown'); emit('pointercancel'); released();
emit('pointerdown'); emit('pointerup', { pointerId: 2 }); assert.equal(held, true);
binding.reset(); released();
emit('pointerdown'); assert.equal(held, true, 'An interrupted hold must not block the next press');
binding.reset(); released();
// Fallback contacts release correctly even when another finger remains down.
const beforeFallback = presses;
emit('touchstart'); emit('touchstart'); assert.equal(presses, beforeFallback + 1);
emit('touchend', { targetTouches: [], touches: [{}] }); released();
emit('touchstart'); emit('touchcancel', { touches: [{}] }); released();
const beforeTakeover = presses;
emit('touchstart'); emit('pointerdown'); assert.equal(presses, beforeTakeover + 1);
emit('pointerup'); released();
emit('click', { detail: 0 }); assert.equal(presses, beforeTakeover + 2, 'Keyboard activation remains usable');
playing = false;
const beforePaused = presses;
emit('pointerdown'); emit('touchstart'); emit('click', { detail: 0 });
released(); assert.equal(presses, beforePaused, 'Paused controls do not start movement');
binding.dispose(); assert.equal(listeners.size, 0);

for (const key of ['altKey', 'ctrlKey', 'metaKey', 'defaultPrevented']) assert(isIceControlEvent({ [key]: true }));
assert(isIceControlEvent({ target: { closest: () => button } }));
assert.equal(isIceControlEvent({ target: { closest: () => null } }), false);
assert.equal(isIceControlEvent({}), false);

// Run the actual menu/resume and keyboard handlers without booting the renderer.
const source = readFileSync(new URL('../src/ice-pool/reference-map.js', import.meta.url), 'utf8');
const resumeHandlers = new Map(); let enabledTouch = false;
const resume = source.slice(source.indexOf("settingsContinue.addEventListener('click'"), source.indexOf("touchMenu.addEventListener('click'"));
new Function('settingsContinue', 'enterExperience', 'enableTouchInput', resume)(
  { addEventListener: (type, callback) => resumeHandlers.set(type, callback) },
  () => assert(enabledTouch, 'Touch mode is enabled before resuming'), () => { enabledTouch = true; });
resumeHandlers.get('pointerdown')({ pointerType: 'touch' }); resumeHandlers.get('click')();

const keyboard = source.slice(source.indexOf("window.addEventListener('keydown', (event) => {", source.indexOf('controls.addEventListener(\'unlock\'')), source.indexOf("window.addEventListener('keyup'"));
const keys = new Set(), settingsMenu = { hidden: false }, controls = { isLocked: true };
let onKey;
const evaluate = new Function('window', 'settingsMenu', 'controls', 'keys', 'isIceControlEvent', `
  let firstQualityPending = false, hasEntered = true, touchPlaying = false, jumpQueued = false;
  ${keyboard}
  return () => jumpQueued;
`);
const jump = evaluate({ __naiwaIceLayer: { isStoryPaused: () => false }, addEventListener: (_type, fn) => { onKey = fn; } }, settingsMenu, controls, keys, isIceControlEvent);
let prevented = 0;
const key = (code, target) => onKey({ code, target, preventDefault: () => prevented++ });
key('Space'); assert.equal(prevented, 0); assert.equal(jump(), false); assert.equal(keys.size, 0);
settingsMenu.hidden = true;
key('Space', { closest: () => button }); assert.equal(jump(), false);
key('KeyW'); assert(keys.has('KeyW'));
key('Space'); assert.equal(jump(), true); assert.equal(prevented, 2);
console.log('Ice input OK: interrupted holds recover, touch/pointer deduplication, pause reset, keyboard activation, touch resume and native settings keys.');
