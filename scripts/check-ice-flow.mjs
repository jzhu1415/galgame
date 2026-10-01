import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createIceChapterLayer, ROUTE_POINTS } from '../src/ice-pool/ice-chapter-layer.js';
import { ICE_LAYOUT } from '../src/ice-pool/ice-progression.js';

const listeners = new Map();
const messages = [];
const noop = () => {};
const ctx = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop: noop }) : noop });
globalThis.document = {
  querySelector: () => null, querySelectorAll: () => [], pointerLockElement: null,
  createElement: () => ({ getContext: () => ctx, setAttribute: noop, remove: noop }),
};
globalThis.window = {
  parent: { postMessage: message => messages.push(message) }, location: { origin: 'http://localhost' },
  matchMedia: () => ({ matches: false }), dispatchEvent: noop,
  addEventListener: (type, callback) => listeners.set(type, callback), removeEventListener: noop,
};
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const layer = createIceChapterLayer({ scene, camera,
  canvas: { addEventListener: noop, removeEventListener: noop },
  columnAt: () => ({ solid: false, level: 0, ceiling: 5 }),
});
let time = 0;
const tick = (count = 1) => { for (let i = 0; i < count; i++) { time += .05; layer.update(.05, time); } };
const key = code => listeners.get('keydown')({ code, repeat: false, preventDefault: noop });
const approach = position => { camera.position.set(position.x, 1.7, position.z); tick(); };
const has = id => messages.some(message => message.type === 'clue' && message.id === id);
const collect = id => {
  approach(ICE_LAYOUT[id]);
  assert.ok(scene.children.find(group => group.userData.clueId === id)?.visible, `${id} must be visible at its stage`);
  key('KeyE'); tick(12);
  assert.ok(has(id), `${id} must be collectible at its stage`);
};

layer.setInit({ found: [] });
approach(ICE_LAYOUT.echo); key('KeyE'); tick(12);
assert.equal(has('echo'), false, 'Walking ahead cannot collect a future exhibit');
approach(ICE_LAYOUT.note); key('KeyE');
for (const code of ['Digit1', 'Digit2', 'Digit1', 'Digit2']) key(code);
assert.ok(has('note'));
assert.equal(has('routeOne'), false);
collect('footage');
for (const [x, z] of ROUTE_POINTS[0]) { approach({ x, z }); tick(); }
assert.ok(has('routeOne'), 'First route starts after footage');
assert.equal(has('route'), false);
collect('shard');
for (const code of ['Digit1', 'Digit2', 'Digit1', 'Digit2']) key(code);
for (const [x, z] of ROUTE_POINTS[1]) { approach({ x, z }); tick(); }
assert.ok(has('route'), 'Shard cipher starts the second-room route');
collect('echo');
approach(ICE_LAYOUT.core); key('KeyE');
assert.ok(messages.some(message => message.type === 'core'));

messages.length = 0;
layer.setInit({ found: ['note', 'footage', 'routeOne', 'route'] });
collect('shard');
collect('echo');
assert.equal(has('route'), false, 'A completed legacy route is not replayed');

messages.length = 0;
layer.setInit({ found: ['route', 'echo'] });
approach(ICE_LAYOUT.note); key('KeyE');
for (const code of ['Digit1', 'Digit2', 'Digit1', 'Digit2']) key(code);
assert.ok(has('note'), 'A legacy route does not block the missing entrance cipher');
collect('footage');
collect('shard');
approach(ICE_LAYOUT.core); key('KeyE');
assert.ok(messages.some(message => message.type === 'core'), 'A legacy second route also implies the first route is complete');
layer.dispose();
console.log('Ice flow OK: future exhibits stay locked; note → film → route one → shard → route two → echo → core.');
