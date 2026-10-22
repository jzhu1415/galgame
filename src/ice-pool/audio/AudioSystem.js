import * as THREE from 'three';
import { AUDIO_CONFIG, clamp, randomRange, smoothParam } from './AudioConfig.js';
import { AudioAssets } from './AudioAssets.js';
import { AudioVoice } from './AudioVoice.js';
import { FootstepAudio } from './FootstepAudio.js';
import { WaterAudio } from './WaterAudio.js';
import { AmbientAudio } from './AmbientAudio.js';
import { ReverbSystem } from './ReverbSystem.js';
import { UnderwaterAudio } from './UnderwaterAudio.js';

const ACTIVE_SYSTEM = Symbol.for('poolrooms.reference.audio');
const dev = Boolean(import.meta.env?.DEV);

export class AudioSystem {
  constructor({ camera, scene, mobile = false, quality = 'balanced', config = AUDIO_CONFIG,
    environmentProvider = () => [], eventTarget = globalThis.document, singleton = true }) {
    if (singleton) globalThis[ACTIVE_SYSTEM]?.dispose();
    this.singleton = singleton;
    if (singleton) globalThis[ACTIVE_SYSTEM] = this;
    this.camera = camera;
    this.scene = scene;
    this.mobile = mobile;
    this.quality = quality;
    this.config = structuredClone(config);
    this.environmentProvider = environmentProvider;
    this.events = eventTarget;
    this.listener = null;
    this.context = null;
    this.unlocked = false;
    this.ready = false;
    this.disposed = false;
    this.disabled = false;
    this.paused = true;
    this.muted = false;
    this.hidden = Boolean(eventTarget?.hidden);
    this.unlockPending = null;
    this.suspendTimer = null;
    this.suspendPending = null;
    this.voices = new Set();
    this.loops = new Map();
    this.pools = new Map();
    this.buses = {};
    this.busMix = {};
    this.nodes = [];
    this.needsReset = true;
    this.debugNode = null;
    this.lastDebugTime = -Infinity;
    this.snapshot = null;
    this.gesture = event => {
      if (event.repeat || event.isTrusted === false) return;
      void this.unlock();
    };
    this.onVisibility = () => this.setHidden(Boolean(this.events.hidden));
    this.onPageHide = event => { if (event.persisted) this.setHidden(true); else this.dispose(); };
    this.onPageShow = () => this.setHidden(Boolean(this.events.hidden));
    this.armUnlock();
    this.events?.addEventListener('visibilitychange', this.onVisibility);
    globalThis.window?.addEventListener('pagehide', this.onPageHide);
    globalThis.window?.addEventListener('pageshow', this.onPageShow);
    if (dev && (config.debug || new URLSearchParams(globalThis.location?.search).get('audioDebug') === '1')) {
      this.debugNode = this.events.createElement('pre');
      this.debugNode.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:40;pointer-events:none;color:#d9eef0;background:#102327cc;padding:10px;font:11px/1.5 monospace;';
      this.debugNode.textContent = 'Audio locked · awaiting gesture';
      this.events.body.append(this.debugNode);
    }
  }

  armUnlock() {
    if (this.gesturesArmed || this.disposed || this.disabled) return;
    this.gesturesArmed = true;
    for (const name of ['pointerdown', 'keydown', 'click']) this.events?.addEventListener(name, this.gesture, true);
  }

  disarmUnlock() {
    this.gesturesArmed = false;
    for (const name of ['pointerdown', 'keydown', 'click']) this.events?.removeEventListener(name, this.gesture, true);
  }

  initialize() {
    if (this.listener) return;
    // Three owns/reuses this context. Do not close it on HMR: its singleton would
    // otherwise retain a closed context. Dispose disconnects this system's graph.
    this.listener = new THREE.AudioListener();
    this.context = this.listener.context;
    this.camera.add(this.listener);
    const gain = value => {
      const node = this.context.createGain();
      node.gain.value = value;
      this.nodes.push(node);
      return node;
    };
    this.master = gain(this.config.masterVolume);
    this.pauseGain = gain(0);
    this.dryGain = gain(1);
    this.reverbVolume = gain(this.config.buses.REVERB);
    this.reverbMix = gain(1);
    this.underwater = new UnderwaterAudio(this);
    this.dryGain.connect(this.underwater.filter);
    this.reverbVolume.connect(this.reverbMix);
    this.reverbMix.connect(this.underwater.filter);
    this.underwater.filter.connect(this.master);
    this.master.connect(this.pauseGain);
    this.pauseGain.connect(this.listener.getInput());
    this.assets = new AudioAssets(this.context, { config: this.config, dev });
    this.reverb = new ReverbSystem(this.context, {
      output: this.reverbVolume, dryGain: this.dryGain, assets: this.assets, config: this.config,
    });
    for (const name of ['FOOTSTEP', 'WATER', 'AMBIENCE', 'SPATIAL']) {
      this.buses[name] = gain(this.config.buses[name]);
      this.busMix[name] = gain(1);
      const send = gain(this.config.sends[name]);
      this.buses[name].connect(this.busMix[name]);
      this.busMix[name].connect(this.dryGain);
      this.busMix[name].connect(send);
      send.connect(this.reverb.input);
    }
    this.footsteps = new FootstepAudio(this);
    this.water = new WaterAudio(this);
    this.ambient = new AmbientAudio(this, this.environmentProvider);
    this.contextState = () => {
      if (this.disposed || this.hidden) return;
      if (this.context.state !== 'running') { this.unlocked = false; this.armUnlock(); }
    };
    this.context.addEventListener('statechange', this.contextState);
    this.loading = this.assets.loadAll().then(() => {
      if (!this.disposed) { this.ready = true; this.needsReset = true; }
    }).catch(error => console.warn('[Audio] Loading failed; scene remains playable.', error));
  }

  unlock() {
    if (this.disposed || this.disabled || this.hidden) return Promise.resolve(false);
    if (this.unlockPending) return this.unlockPending;
    if (this.unlocked && this.context?.state === 'running') return Promise.resolve(true);
    try {
      this.initialize();
      // Called synchronously inside the trusted gesture, before any await/load.
      const resumed = this.context.state === 'running' ? Promise.resolve() : this.context.resume();
      this.unlockPending = Promise.resolve(resumed).then(() => {
        if (this.disposed || this.hidden) return false;
        this.unlocked = this.context.state === 'running';
        if (this.unlocked) { this.disarmUnlock(); this.needsReset = true; this.applyPauseGain(); }
        return this.unlocked;
      }).catch(error => {
        console.warn('[Audio] Unlock deferred until another user gesture.', error);
        this.armUnlock();
        return false;
      }).finally(() => { this.unlockPending = null; });
      return this.unlockPending;
    } catch (error) {
      console.warn('[Audio] Web Audio unavailable; continuing silently.', error);
      this.dispose();
      this.disabled = true;
      return Promise.resolve(false);
    }
  }

  applyPauseGain() {
    if (!this.pauseGain) return;
    smoothParam(this.pauseGain.gain, this.hidden ? 0 : this.paused ? this.config.pauseAmbience : 1,
      this.context, this.config.fade.pause);
  }

  stopMovement() {
    this.needsReset = true;
    for (const voice of this.voices) {
      if (voice.bus === 'FOOTSTEP' || voice.bus === 'WATER') voice.stop();
    }
  }

  setPaused(paused) {
    if (this.paused === paused) return;
    this.paused = paused;
    this.stopMovement();
    this.applyPauseGain();
  }

  setHidden(hidden) {
    if (this.disposed || this.hidden === hidden) return;
    this.hidden = hidden;
    clearTimeout(this.suspendTimer);
    this.suspendTimer = null;
    this.stopMovement();
    this.applyPauseGain();
    if (!this.context) return;
    if (hidden) {
      this.ambient?.reset();
      this.suspendTimer = setTimeout(() => {
        this.suspendTimer = null;
        if (!this.disposed && this.hidden && this.context.state === 'running') {
          this.suspendPending = this.context.suspend()
            .catch(error => console.warn('[Audio] Suspend failed.', error))
            .finally(() => {
              this.suspendPending = null;
              // A quick hide/show can race the asynchronous suspend operation.
              if (!this.disposed && !this.hidden) void this.unlock();
            });
        }
      }, this.config.fade.pause * 1500);
    } else {
      // Usually permitted after a prior unlock. If the browser rejects it, only
      // re-arm gesture handling; never poll resume on every animation frame.
      this.armUnlock();
      void this.unlock();
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.master) smoothParam(this.master.gain, this.muted ? 0 : this.config.masterVolume,
      this.context, this.config.fade.mute);
  }

  setVolume(bus, value) {
    value = clamp(Number(value));
    if (!Number.isFinite(value)) return;
    if (bus === 'MASTER') { this.config.masterVolume = value; this.setMuted(this.muted); return; }
    if (!(bus in this.config.buses)) return;
    this.config.buses[bus] = value;
    const node = bus === 'REVERB' ? this.reverbVolume : this.buses[bus];
    if (node) smoothParam(node.gain, value, this.context);
  }

  setQuality(quality, mobile = this.mobile) {
    this.quality = quality;
    this.mobile = mobile;
  }

  selectSample(name, { cooldown = 0, rateRange = [1, 1], gainRange = [1, 1] } = {}) {
    const samples = this.assets.getPool(name);
    if (!samples.length) return null;
    const previous = this.pools.get(name) ?? { index: -1, time: -Infinity };
    if (this.context.currentTime - previous.time < cooldown) return null;
    let index = Math.floor(Math.random() * (samples.length - (previous.index >= 0 && samples.length > 1 ? 1 : 0)));
    if (samples.length > 1 && previous.index >= 0 && index >= previous.index) index += 1;
    return { sample: samples[index], index, rate: randomRange(rateRange), gain: randomRange(gainRange) };
  }

  createVoice(sample, options) {
    // Hard bounded live graph, including retiring/fading voices. On saturation,
    // evict the oldest one-shot (or already retiring loop), never an active bed.
    const group = options.group ?? options.bus;
    if (options.position) {
      const config = this.config.spatial;
      const limit = this.mobile ? config.mobileSources
        : this.quality === 'performance' ? config.performanceSources : config.desktopSources;
      if ([...this.voices].filter(voice => voice.audio.panner).length >= limit) return null;
    }
    const groupLimit = options.maxVoices ?? this.config.voices[options.bus];
    const grouped = [...this.voices].filter(voice => voice.group === group && !voice.audio.loop);
    if (!options.loop && grouped.length >= groupLimit) grouped[0].dispose();
    if (this.voices.size >= this.config.voices.total) {
      const oldest = [...this.voices].find(voice => voice.stopping || !voice.audio.loop);
      if (!oldest) return null;
      oldest.dispose();
    }
    const voice = new AudioVoice(this, sample, options);
    this.voices.add(voice);
    return voice;
  }

  playRandomFromPool(name, options = {}) {
    if (!this.ready || !this.unlocked || this.hidden || this.disposed || this.paused) return null;
    const selection = this.selectSample(name, options);
    if (!selection) return null;
    const bus = options.bus ?? 'WATER';
    const voice = this.createVoice(selection.sample, {
      ...options, bus, gain: (options.gain ?? 1) * selection.gain,
      rate: (options.rate ?? 1) * selection.rate,
    });
    if (voice) this.pools.set(name, { index: selection.index, time: this.context.currentTime });
    return voice;
  }

  setLoop(key, poolName, { bus = 'WATER', gain = 0, rate = 1, fade = this.config.fade.loop, position } = {}) {
    if (this.disposed || !this.ready || !this.unlocked || this.hidden) return null;
    let voice = this.loops.get(key);
    if (voice?.disposed) { this.loops.delete(key); voice = null; }
    if (gain <= 0.001 || (this.paused && (bus === 'WATER' || bus === 'FOOTSTEP'))) {
      if (voice) voice.stop(fade);
      return voice;
    }
    if (voice && voice.poolName !== poolName) voice.stop(fade);
    // A source already scheduled to stop cannot be revived. It remains tracked
    // until onended; its replacement still counts against the global voice cap.
    if (voice?.stopping) { this.loops.delete(key); voice = null; }
    if (!voice) {
      const sample = this.assets.getPool(poolName)[0];
      if (!sample) return null;
      voice = this.createVoice(sample, { bus, gain, rate, loop: true, fade, position });
      if (voice) { voice.poolName = poolName; this.loops.set(key, voice); }
    } else {
      voice.setGain(gain, fade);
      voice.setRate(rate);
    }
    return voice;
  }

  stopLoop(key, fade = this.config.fade.stop) {
    const voice = this.loops.get(key);
    voice?.stop(fade);
    if (voice?.disposed) this.loops.delete(key);
  }

  updatePlayerState(state, delta) {
    if (this.disposed) return;
    this.snapshot = state;
    this.setPaused(state.paused);
    this.updateDebug();
    if (!this.ready || !this.unlocked || this.hidden) return;
    state.headUnderwater = this.underwater.readHeadState(state);
    if (this.needsReset) {
      this.footsteps.reset(state);
      this.water.reset(state);
      this.needsReset = false;
    }
    const now = this.context.currentTime;
    this.underwater.update(state);
    this.footsteps.update(state, delta, now);
    this.water.update(state, delta, now);
    this.ambient.update(state, delta, now);
    this.reverb.setPreset(state.headUnderwater ? 'UNDERWATER' : state.currentRoom.reverb);
    // Audio clocks/camera matrices are normally advanced by Three's render; the
    // listener stays on the real player camera, never on the reflection camera.
    for (const [key, voice] of this.loops) if (voice.disposed) this.loops.delete(key);
  }

  getDebugState() {
    return {
      unlocked: this.unlocked, ready: this.ready, muted: this.muted,
      surface: this.footsteps?.surface ?? 'WET_TILE', waterDepth: this.snapshot?.waterDepth ?? 0,
      swimming: Boolean(this.snapshot?.isSwimming), headUnderwater: Boolean(this.snapshot?.headUnderwater),
      reverb: this.reverb?.currentPreset ?? this.config.reverb.defaultPreset,
      positionalSources: [...this.voices].filter(voice => voice.audio.panner).length,
      voices: this.voices.size,
      assets: dev ? 'Real assets first; missing samples use DEV_ONLY_AUDIO_PLACEHOLDER' : 'Real assets only',
    };
  }

  updateDebug() {
    if (!this.debugNode) return;
    const now = performance.now();
    if (now - this.lastDebugTime < 200) return;
    this.lastDebugTime = now;
    this.debugNode.textContent = Object.entries(this.getDebugState()).map(([key, value]) => `${key}: ${value}`).join('\n');
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.unlocked = false;
    this.ready = false;
    clearTimeout(this.suspendTimer);
    this.disarmUnlock();
    this.events?.removeEventListener('visibilitychange', this.onVisibility);
    globalThis.window?.removeEventListener('pagehide', this.onPageHide);
    globalThis.window?.removeEventListener('pageshow', this.onPageShow);
    this.context?.removeEventListener('statechange', this.contextState);
    this.ambient?.dispose();
    this.footsteps?.dispose();
    this.water?.dispose();
    this.underwater?.dispose();
    for (const voice of [...this.voices]) voice.dispose();
    this.loops.clear();
    this.pools.clear();
    this.assets?.dispose();
    this.reverb?.dispose();
    for (const node of this.nodes) node.disconnect();
    this.listener?.gain.disconnect();
    this.listener?.removeFromParent();
    this.debugNode?.remove();
    this.nodes.length = 0;
    this.environmentProvider = null;
    this.snapshot = null;
    this.camera = null;
    this.scene = null;
    this.listener = null;
    this.ambient = null;
    this.footsteps = null;
    this.water = null;
    this.underwater = null;
    this.reverb = null;
    this.assets = null;
    this.buses = {};
    this.busMix = {};
    this.debugNode = null;
    this.events = null;
    if (this.singleton && globalThis[ACTIVE_SYSTEM] === this) delete globalThis[ACTIVE_SYSTEM];
  }
}
