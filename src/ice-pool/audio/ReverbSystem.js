import { AUDIO_CONFIG, REVERB_PRESETS, smoothParam } from './AudioConfig.js';
import { IR_MANIFEST } from './AudioManifest.js';

// Small deterministic stereo IRs, generated on demand, are a supported fallback
// (unlike the DEV-only source samples). No delay feedback or acoustic ray tracing.
export function createSyntheticImpulse(context, preset) {
  // ConvolverNode rejects a buffer whose sample rate differs from its context.
  // Bound duration/cache count instead of trying to downsample the IR buffer.
  const sampleRate = context.sampleRate;
  const length = Math.ceil(preset.seconds * sampleRate);
  const buffer = context.createBuffer(2, length, sampleRate);
  const start = Math.floor(preset.predelay * sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    let seed = 9137 + channel * 65537;
    let low = 0;
    for (let i = start; i < length; i += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      low += 0.35 * (noise - low);
      const t = (i - start) / Math.max(1, length - start);
      // Bright early tile reflections, progressively softer late tail.
      data[i] = (noise * (1 - t) * 0.5 + low * 0.5)
        * (1 - t) ** preset.decay * Math.min(1, (i - start) / 80);
    }
  }
  return buffer;
}

export class ReverbSystem {
  constructor(context, { output, dryGain, assets, config = AUDIO_CONFIG }) {
    this.context = context;
    this.config = config;
    this.assets = assets;
    this.dryGain = dryGain;
    this.input = context.createGain();
    this.cache = new Map();
    this.authored = new Map();
    this.loads = new Set();
    this.disposed = false;
    this.currentPreset = null;
    this.requestedPreset = config.reverb.defaultPreset;
    this.activeSlot = -1;
    this.busyUntil = 0;
    this.slots = Array.from({ length: 2 }, () => {
      const convolver = context.createConvolver();
      const gain = context.createGain();
      gain.gain.value = 0;
      this.input.connect(convolver);
      convolver.connect(gain);
      gain.connect(output);
      return { convolver, gain, preset: null, buffer: null };
    });
    this.setPreset(this.requestedPreset);
  }

  remember(name, buffer, authored = false) {
    if (authored) {
      // Authored IRs are a fixed, tiny set and must survive the synthetic LRU.
      // Otherwise revisiting a fourth room silently falls back to rebuilding a
      // synthetic impulse even though the real file already loaded.
      this.authored.set(name, buffer);
      this.cache.delete(name);
      return buffer;
    }
    this.cache.delete(name);
    this.cache.set(name, buffer);
    while (this.cache.size > this.config.reverb.maxCachedImpulses) {
      this.cache.delete(this.cache.keys().next().value);
    }
    return buffer;
  }

  impulse(name) {
    const existing = this.authored.get(name) ?? this.cache.get(name);
    if (existing) return existing;
    const buffer = this.remember(name, createSyntheticImpulse(this.context, REVERB_PRESETS[name]));
    // Synthetic IR is immediately usable. A local authored IR can replace it
    // through the same two-slot crossfade without ever cutting the active buffer.
    if (IR_MANIFEST[name] && !this.loads.has(name)) {
      this.loads.add(name);
      void this.assets.loadImpulse(IR_MANIFEST[name]).then(real => {
        if (!this.disposed && real) this.remember(name, real, true);
      }).catch(error => console.warn(`[Audio] IR ${name}:`, error));
    }
    return buffer;
  }

  setPreset(name) {
    this.requestedPreset = REVERB_PRESETS[name] ? name : this.config.reverb.defaultPreset;
    this.update();
  }

  update() {
    if (this.disposed || this.context.currentTime < this.busyUntil) return;
    const name = this.requestedPreset;
    const buffer = this.impulse(name);
    const active = this.slots[this.activeSlot];
    if (active?.preset === name && active.buffer === buffer) {
      const inactive = this.slots[1 - this.activeSlot];
      if (inactive.buffer) {
        inactive.convolver.buffer = null;
        inactive.buffer = null;
      }
      return;
    }
    const nextIndex = this.activeSlot === 0 ? 1 : 0;
    const next = this.slots[nextIndex];
    const now = this.context.currentTime;
    const duration = this.config.reverb.crossfade;
    next.convolver.buffer = buffer;
    next.buffer = buffer;
    next.preset = name;
    for (let index = 0; index < this.slots.length; index += 1) {
      const param = this.slots[index].gain.gain;
      param.cancelScheduledValues(now);
      param.setValueAtTime(index === this.activeSlot ? REVERB_PRESETS[this.currentPreset].wet : 0, now);
      param.linearRampToValueAtTime(index === nextIndex ? REVERB_PRESETS[name].wet : 0, now + duration);
    }
    smoothParam(this.dryGain.gain, REVERB_PRESETS[name].dry, this.context, duration);
    this.activeSlot = nextIndex;
    this.currentPreset = name;
    this.busyUntil = now + duration;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.input.disconnect();
    for (const slot of this.slots) {
      slot.convolver.disconnect();
      slot.convolver.buffer = null;
      slot.gain.disconnect();
      slot.buffer = null;
    }
    this.cache.clear();
    this.authored.clear();
    this.loads.clear();
    this.assets = null;
  }
}
