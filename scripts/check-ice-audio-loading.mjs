import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { AudioAssets } from '../src/ice-pool/audio/AudioAssets.js';
import { AudioSystem } from '../src/ice-pool/audio/AudioSystem.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function flush() {
  return new Promise(resolve => setImmediate(resolve));
}

async function until(predicate, message) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await flush();
  }
  assert.fail(message);
}

function buffer(url) {
  return { url, sampleRate: 48000, numberOfChannels: 1, duration: 1 };
}

function audioContext() {
  return {
    sampleRate: 48000,
    decodeAudioData: async bytes => buffer(Buffer.from(bytes).toString()),
  };
}

test('priority pools rotate first samples across pools, publish progressively, and keep manifest order', async () => {
  const url = (name, index) => `/${name}-${index}.ogg`;
  const gates = new Map([
    ['/optional.ogg', deferred()],
    ...Array.from({ length: 5 }, (_, index) => [`/wet-${index + 1}.ogg`, deferred()]),
    ...Array.from({ length: 5 }, (_, index) => [`/run-${index + 1}.ogg`, deferred()]),
    ['/splash-small.ogg', deferred()],
    ['/splash-large.ogg', deferred()],
  ]);
  const scheduled = [
    url('wet', 1), url('run', 1), '/splash-small.ogg', '/splash-large.ogg',
    url('wet', 2), url('run', 2), url('wet', 3), url('run', 3),
    url('wet', 4), url('run', 4), url('wet', 5), url('run', 5), '/optional.ogg',
  ];
  const requests = [];
  const ready = [];
  const assets = new AudioAssets(audioContext(), {
    config: {
      devPlaceholder: false,
      loading: { concurrency: 4, timeoutMs: 0,
        priorityPools: ['WET_TILE_STEPS', 'RUN_STEPS', 'SPLASH_SMALL', 'SPLASH_LARGE'] },
    },
    manifest: {
      AMBIENCE: { loop: true, samples: [{ url: '/optional.ogg' }] },
      RUN_STEPS: { loop: false, samples: Array.from({ length: 5 }, (_, index) => ({ url: url('run', index + 1) })) },
      WET_TILE_STEPS: { loop: false, samples: Array.from({ length: 5 }, (_, index) => ({ url: url('wet', index + 1) })) },
      SPLASH_SMALL: { loop: false, samples: [{ url: '/splash-small.ogg' }] },
      SPLASH_LARGE: { loop: false, samples: [{ url: '/splash-large.ogg' }] },
    },
    fetcher: url => {
      requests.push(url);
      return gates.get(url).promise.then(text => ({
        ok: true,
        headers: { get: () => 'audio/ogg' },
        arrayBuffer: async () => new TextEncoder().encode(text).buffer,
      }));
    },
    onPoolReady: name => ready.push(name),
  });

  let loadFinished = false;
  const loading = assets.loadAll().then(() => { loadFinished = true; });
  await until(() => requests.length === 4, 'all bounded loader workers should start');
  assert.deepEqual(requests, scheduled.slice(0, 4),
    'the first request batch should start one URL from every critical pool');

  gates.get('/wet-1.ogg').resolve('wet-1');
  await until(() => assets.getPool('WET_TILE_STEPS').length === 1,
    'the first decoded step should become playable before unrelated URLs finish');
  assert.equal(assets.getPool('WET_TILE_STEPS')[0].url, '/wet-1.ogg');
  assert.equal(loadFinished, false, 'loadAll must still await every manifest URL');
  assert.deepEqual(ready, ['WET_TILE_STEPS']);

  for (const [sampleUrl, gate] of gates) {
    if (sampleUrl !== '/wet-1.ogg') gate.resolve(sampleUrl);
  }
  await loading;
  assert.deepEqual(requests, scheduled, 'non-priority URLs should be queued after all priority-pool samples');
  assert.deepEqual(assets.getPool('WET_TILE_STEPS').map(sample => sample.url),
    Array.from({ length: 5 }, (_, index) => url('wet', index + 1)),
    'completion order must not reorder samples inside a pool');
  assert.deepEqual(assets.getPool('RUN_STEPS').map(sample => sample.url),
    Array.from({ length: 5 }, (_, index) => url('run', index + 1)));
  assert.equal(loadFinished, true);
  assert.deepEqual([...ready].sort(), ['AMBIENCE', 'RUN_STEPS', 'SPLASH_LARGE', 'SPLASH_SMALL', 'WET_TILE_STEPS']);
  assets.dispose();
});

test('disposing during a pending URL prevents late pool publication and callbacks', async () => {
  const gate = deferred();
  const ready = [];
  const assets = new AudioAssets(audioContext(), {
    config: { devPlaceholder: false, loading: { concurrency: 1, timeoutMs: 0 } },
    manifest: { WET_TILE_STEPS: { samples: [{ url: '/late.ogg' }] } },
    fetcher: () => gate.promise,
    onPoolReady: name => ready.push(name),
  });
  const loading = assets.loadAll();
  await flush();
  assets.dispose();
  await loading;
  gate.resolve({ ok: true, headers: { get: () => 'audio/ogg' },
    arrayBuffer: async () => new TextEncoder().encode('late').buffer });
  await flush();
  assert.deepEqual(assets.getPool('WET_TILE_STEPS'), []);
  assert.deepEqual(ready, []);
});

test('sample de-duplication follows URL identity when a progressively growing pool shifts indices', () => {
  const system = Object.create(AudioSystem.prototype);
  system.assets = { getPool: () => [
    { url: '/earlier.ogg' }, { url: '/previous.ogg' }, { url: '/later.ogg' },
  ] };
  system.pools = new Map([['WET_TILE_STEPS', {
    index: 0, sampleIdentity: JSON.stringify(['/previous.ogg', null, null]), time: -Infinity,
  }]]);
  system.context = { currentTime: 10 };
  const previousRandom = Math.random;
  Math.random = () => 0;
  try {
    const selection = system.selectSample('WET_TILE_STEPS');
    assert.notEqual(selection.sample.url, '/previous.ogg');
    assert.equal(selection.sampleIdentity, JSON.stringify([selection.sample.url, null, null]));
  } finally {
    Math.random = previousRandom;
  }
});

test('an audio pool-ready callback unblocks the system while the full loading promise remains pending', async () => {
  // This uses the real AudioAssets publication and the callback installed by
  // AudioSystem.initialize; only Web Audio nodes, fetch, and decoding are local doubles.
  const FakeAudioNode = class {
    constructor(properties = {}) { Object.assign(this, properties); this.connections = new Set(); }
    connect(node) { this.connections.add(node); return node; }
    disconnect() { this.connections.clear(); }
  };
  const fakeParam = value => ({ value, setTargetAtTime() {}, setValueAtTime() {},
    linearRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
  class FakeContext extends EventTarget {
    constructor() {
      super();
      this.sampleRate = 48000; this.currentTime = 0; this.state = 'suspended';
      this.destination = new FakeAudioNode(); this.listener = {};
      for (const key of ['positionX','positionY','positionZ','forwardX','forwardY','forwardZ','upX','upY','upZ']) {
        this.listener[key] = fakeParam(0);
      }
    }
    createGain() { return new FakeAudioNode({ gain: fakeParam(1) }); }
    createBiquadFilter() { return new FakeAudioNode({ frequency: fakeParam(350), Q: fakeParam(1), type: 'lowpass' }); }
    createConvolver() { return new FakeAudioNode({ normalize: true, buffer: null }); }
    createBuffer(channels, length, sampleRate) { return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: () => new Float32Array(length) }; }
    async decodeAudioData(bytes) { return buffer(Buffer.from(bytes).toString()); }
    async resume() { this.state = 'running'; this.dispatchEvent(new Event('statechange')); }
  }
  class FakeEvents extends EventTarget {
    constructor() { super(); this.hidden = false; this.listeners = new Map(); }
    addEventListener(name, listener, options) { super.addEventListener(name, listener, options); this.listeners.set(name, listener); }
    removeEventListener(name, listener, options) { super.removeEventListener(name, listener, options); }
  }

  const gates = new Map([['/wet.ogg', deferred()], ['/optional.ogg', deferred()]]);
  const originalFetch = globalThis.fetch;
  const originalLoadAll = AudioAssets.prototype.loadAll;
  const originalLoadImpulse = AudioAssets.prototype.loadImpulse;
  const originalWindow = globalThis.window;
  globalThis.window = new EventTarget();
  let originalContext = null;
  try { originalContext = THREE.AudioContext.getContext(); } catch { /* No context was set in this process. */ }
  const context = new FakeContext();
  const events = new FakeEvents();
  const requested = [];
  THREE.AudioContext.setContext(context);
  globalThis.fetch = url => {
    if (!gates.has(url)) return Promise.resolve({ ok: false, status: 404 });
    requested.push(url);
    return gates.get(url).promise;
  };
  AudioAssets.prototype.loadImpulse = async () => null;
  AudioAssets.prototype.loadAll = function loadTestManifest() {
    this.manifest = {
      OPTIONAL: { samples: [{ url: '/optional.ogg' }] },
      WET_TILE_STEPS: { samples: [{ url: '/wet.ogg' }] },
    };
    return originalLoadAll.call(this);
  };
  let audio;
  try {
    const camera = new THREE.PerspectiveCamera();
    audio = new AudioSystem({ camera, eventTarget: events, singleton: false,
      config: { ...JSON.parse(JSON.stringify((await import('../src/ice-pool/audio/AudioConfig.js')).AUDIO_CONFIG)), devPlaceholder: false } });
    await audio.unlock();
    let loadingFinished = false;
    audio.loading.then(() => { loadingFinished = true; });
    await until(() => requested.length === 2, 'the test manifest URLs should start loading');
    gates.get('/wet.ogg').resolve({ ok: true, headers: { get: () => 'audio/ogg' },
      arrayBuffer: async () => new TextEncoder().encode('wet').buffer });
    await until(() => audio.assets.getPool('WET_TILE_STEPS').length === 1,
      'AudioSystem should receive the first non-empty priority pool');
    assert.equal(audio.ready, true);
    assert.equal(audio.needsReset, true);
    assert.equal(loadingFinished, false, 'the public loading promise retains full-load semantics');
    audio.dispose();
  } finally {
    audio?.dispose();
    AudioAssets.prototype.loadAll = originalLoadAll;
    AudioAssets.prototype.loadImpulse = originalLoadImpulse;
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    THREE.AudioContext.setContext(originalContext);
  }
});
