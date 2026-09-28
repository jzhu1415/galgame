// Development-only source placeholders. These are deliberately noisy and
// short: they keep routing and lifecycle work testable without pretending to
// be authored sound or adding beeps, melodies, or music to the scene.
export const DEV_ONLY_AUDIO_PLACEHOLDER = 'DEV_ONLY_AUDIO_PLACEHOLDER';

function hashSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFrom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function smoothStep(value) {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function pulse(index, center, width) {
  if (width <= 0) return 0;
  return Math.max(0, 1 - Math.abs(index - center) / width);
}

function createNoise(random, length, filterAmount = 0.12) {
  const noise = new Float32Array(length);
  let filtered = 0;
  for (let index = 0; index < length; index += 1) {
    const white = random() * 2 - 1;
    filtered += filterAmount * (white - filtered);
    noise[index] = filtered * 0.76 + white * 0.24;
  }
  return noise;
}

function fillTap(data, random) {
  const noise = createNoise(random, data.length, 0.28);
  const attack = Math.max(2, Math.floor(data.length * 0.012));
  for (let index = 0; index < data.length; index += 1) {
    const envelope = index < attack
      ? smoothStep(index / attack)
      : Math.exp(-5.2 * (index - attack) / Math.max(1, data.length - attack));
    data[index] = noise[index] * envelope * 0.42;
  }
}

function fillSlosh(data, random) {
  const noise = createNoise(random, data.length, 0.075);
  const first = data.length * 0.2;
  const second = data.length * 0.58;
  const firstWidth = data.length * 0.23;
  const secondWidth = data.length * 0.3;
  for (let index = 0; index < data.length; index += 1) {
    const envelope = Math.max(
      pulse(index, first, firstWidth),
      pulse(index, second, secondWidth) * 0.78,
    );
    const tail = Math.exp(-1.8 * index / Math.max(1, data.length));
    data[index] = noise[index] * envelope * tail * 0.48;
  }
}

function fillDrip(data, random) {
  const noise = createNoise(random, data.length, 0.2);
  const center = data.length * 0.2;
  const width = data.length * 0.16;
  for (let index = 0; index < data.length; index += 1) {
    const attack = smoothStep(index / Math.max(1, data.length * 0.015));
    const envelope = pulse(index, center, width) * attack
      + pulse(index, data.length * 0.48, data.length * 0.34) * 0.24;
    data[index] = noise[index] * envelope * 0.44;
  }
}

function circularSmooth(source, radius) {
  const output = new Float32Array(source.length);
  const window = radius * 2 + 1;
  let sum = 0;
  for (let offset = -radius; offset <= radius; offset += 1) {
    sum += source[(offset + source.length) % source.length];
  }
  for (let index = 0; index < source.length; index += 1) {
    output[index] = sum / window;
    sum -= source[(index - radius + source.length) % source.length];
    sum += source[(index + radius + 1) % source.length];
  }
  return output;
}

function fillFilteredNoiseLoop(data, random) {
  const white = new Float32Array(data.length);
  for (let index = 0; index < white.length; index += 1) white[index] = random() * 2 - 1;

  // Circular filtering makes the last and first frames ordinary neighbours.
  // A fade at both ends would be click-free but would also create a very
  // audible silence pulse on every short development loop.
  const radius = Math.max(2, Math.floor(data.length * 0.00075));
  const noise = circularSmooth(circularSmooth(white, radius), radius);
  let mean = 0;
  for (const value of noise) mean += value;
  mean /= noise.length;
  let peak = 0;
  for (const value of noise) peak = Math.max(peak, Math.abs(value - mean));
  const scale = peak > 0 ? 0.3 / peak : 0;
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (noise[index] - mean) * scale;
  }
}

function profileFor(kind) {
  const value = String(kind ?? '').toLowerCase();
  if (value.includes('drip')) return 'drip';
  if (value.includes('slosh') || value.includes('splash') || value.includes('water')) return 'slosh';
  return 'tap';
}

function sampleRateFor(context) {
  const sampleRate = Number(context?.sampleRate);
  return Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 44100;
}

// Generate one deterministic in-memory AudioBuffer. The URL is part of the
// seed so six wet-tile samples remain stable yet audibly distinct in dev.
export function createDevAudioPlaceholder(context, {
  url = '',
  kind = 'tap',
  loop = false,
  variant,
} = {}) {
  if (!context || typeof context.createBuffer !== 'function') return null;

  const isLoop = Boolean(loop || String(kind).toLowerCase().includes('loop'));
  const profile = profileFor(kind);
  const duration = isLoop ? 1.35 : profile === 'drip' ? 0.3 : profile === 'slosh' ? 0.38 : 0.2;
  const sampleRate = sampleRateFor(context);
  const length = Math.max(32, Math.ceil(duration * sampleRate));
  const buffer = context.createBuffer(1, length, sampleRate);
  if (!buffer || typeof buffer.getChannelData !== 'function') return null;

  const seedText = `${url}|${kind}|${variant ?? ''}|${isLoop ? 'loop' : 'one-shot'}`;
  const random = randomFrom(hashSeed(seedText));
  const data = buffer.getChannelData(0);
  if (isLoop) fillFilteredNoiseLoop(data, random);
  else if (profile === 'drip') fillDrip(data, random);
  else if (profile === 'slosh') fillSlosh(data, random);
  else fillTap(data, random);
  return buffer;
}
