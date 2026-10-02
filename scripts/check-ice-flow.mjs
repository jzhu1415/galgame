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
assert.ok(camera.getWorldDirection(new THREE.Vector3()).z > .99, 'Entering the hall faces the route, rather than the entrance wall');
approach(ICE_LAYOUT.echo); key('KeyE'); tick(12);
assert.equal(has('echo'), false, 'Walking ahead cannot collect a future exhibit');
layer.setMenuPaused(true);
approach(ICE_LAYOUT.note); key('KeyE');
key('Escape');
assert.equal(has('note'), false, 'Quality and settings dialogs block evidence interaction');
assert.equal(messages.some(message => message.type === 'exit'), false, 'Escape cannot leave the hall behind a settings dialog');
layer.setMenuPaused(false);
approach(ICE_LAYOUT.note); key('KeyE');
assert.ok(has('note'), 'The entrance note is collected immediately without code input');
assert.equal(has('routeOne'), false);
collect('footage');
for (const [index, [x, z]] of ROUTE_POINTS[0].entries()) {
  approach({ x: x + 1.1, z: z + .8 }); tick();
  if (index === 2) {
    const pose = camera.position.clone();
    layer.setLanguage('en');
    layer.setQuality('performance');
    layer.setQuality('balanced');
    assert.ok(camera.position.equals(pose), 'Changing settings language must not teleport the player');
  }
}
assert.ok(has('routeOne'), 'First route starts after footage');
assert.equal(has('route'), false);
collect('shard');
for (const [x, z] of ROUTE_POINTS[1]) { approach({ x: x - 1.1, z: z + .8 }); tick(); }
assert.ok(has('route'), 'Recovering the shard starts the second route without code input');
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
assert.ok(has('note'), 'A legacy route does not block the missing entrance note');
collect('footage');
collect('shard');
approach(ICE_LAYOUT.core); key('KeyE');
assert.ok(messages.some(message => message.type === 'core'), 'A legacy second route also implies the first route is complete');
layer.dispose();
const resumeCamera = new THREE.PerspectiveCamera();
resumeCamera.position.set(7.5, 1.7, 2.5);
const resumedLayer = createIceChapterLayer({ scene: new THREE.Scene(), camera: resumeCamera,
  canvas: { addEventListener: noop, removeEventListener: noop },
  columnAt: () => ({ solid: false, level: 0, ceiling: 5 }),
});
resumedLayer.setInit({ found: ['note', 'footage', 'routeOne', 'shard'] });
assert.ok(resumeCamera.position.z > 45, 'A resumed game enters near its current passage');
assert.ok(resumeCamera.getWorldDirection(new THREE.Vector3()).z > .99);
// A save that used to stop at the second cipher now resumes the walking route.
resumedLayer.setStoryPaused(true);
resumeCamera.position.set(7.5, 1.7, ROUTE_POINTS[1][1][1] + .8);
resumedLayer.update(.05, 1);
assert.equal(has('route'), false, 'Fragment dialogue pauses route progression');
resumedLayer.setStoryPaused(false);
for (const [x, z] of ROUTE_POINTS[1]) {
  resumeCamera.position.set(x, 1.7, z + .8);
  resumedLayer.update(.05, 2);
}
assert.ok(has('route'), 'A legacy save proceeds along route two with no cipher gate');
resumedLayer.dispose();
console.log('Ice flow OK: future exhibits stay locked; note → film → route one → shard → route two → echo → core.');
