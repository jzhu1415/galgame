// Gain values are deliberately restrained; tune against real recordings, not placeholders.
export const SurfaceType = Object.freeze({
  WET_TILE: 'WET_TILE', SHALLOW_WATER: 'SHALLOW_WATER',
  DEEP_WADING: 'DEEP_WADING', SWIMMING: 'SWIMMING',
  DRY_TILE: 'DRY_TILE', CONCRETE: 'CONCRETE', METAL: 'METAL', WOOD: 'WOOD',
});

export const AUDIO_CONFIG = {
  masterVolume: 0.65,
  buses: { FOOTSTEP: 0.55, WATER: 0.5, AMBIENCE: 0.2, SPATIAL: 0.38, REVERB: 0.3 },
  sends: { FOOTSTEP: 0.42, WATER: 0.3, AMBIENCE: 0.12, SPATIAL: 0.55 },
  devPlaceholder: true, // additionally gated by import.meta.env.DEV; never ships as sound
  debug: false, // opt in with ?audioDebug=1 during development
  loading: { concurrency: 4, timeoutMs: 8000 },
  voices: { total: 24, FOOTSTEP: 3, WATER: 4, SPATIAL: 4, AMBIENCE: 4 },
  fade: { loop: 0.24, stop: 0.12, pause: 0.25, mute: 0.15 },
  pauseAmbience: 0.16,
  footsteps: {
    movementThreshold: 0.14, walkStride: 1.5, runStride: 1.8,
    shallowStride: 1.45, deepStride: 1.3, referenceSpeed: 2.45,
    referenceRunSpeed: 4.45, speedGainRange: [0.72, 1.12],
    maxTravelPerUpdate: 2, playbackRate: [0.94, 1.06], gainVariation: [0.95, 1.05],
    gain: 0.48, shallowGain: 0.38, deepGain: 0.46, cooldown: 0.12,
    landingMinSpeed: 1.8, landingGain: 0.28,
  },
  water: {
    meaningfulDepth: 0.08, kneeDepth: 0.45, waistDepth: 0.85,
    movementThreshold: 0.14, referenceSpeed: 1.8,
    entryGain: 0.38, exitGain: 0.2, transitionCooldown: 0.65,
    entryMediumSpeed: 3.2, entryJumpRiseSpeed: 0.2, entryHighFallDistance: 2,
    swimIdleGain: 0.012, swimGain: 0.18, wadeGain: 0.075,
    strokeGain: 0.25, strokeCooldown: 1.25, accelerationThreshold: 1.5,
    turnThreshold: 0.6, strokeMinSpeed: 0.5,
    surfaceGain: 0.2, surfaceCooldown: 0.85,
  },
  underwater: {
    hysteresis: 0.055, cutoff: 1100, openCutoff: 20000, amount: 1,
    enterSeconds: 0.24, exitSeconds: 0.36,
    ambienceGain: 0.18, spatialGain: 0.25, footstepGain: 0.6,
    waterGain: 1.12, reverbGain: 0.5, bedGain: 0.09,
  },
  ambience: {
    ventilationGain: 0.17, poolGain: 0.07, humGain: 0.025,
    zoneFade: 0.7, dripInterval: [8, 35], dripGain: 0.24,
    distantWaterGain: 0.26,
  },
  spatial: {
    activationDistance: 40, deactivateMargin: 5, refDistance: 2.8,
    maxDistance: 50, rolloffFactor: 1.15, updateHz: 6,
    desktopSources: 6, mobileSources: 3, performanceSources: 3,
    desktopLoops: 3, mobileLoops: 1, boundaryFade: 5,
    adjacentRoomGain: 0.52,
  },
  reverb: { defaultPreset: 'POOL_ROOM', crossfade: 0.65, maxCachedImpulses: 3 },
};

export const REVERB_PRESETS = {
  SMALL_TILE: { seconds: 0.85, decay: 3.4, wet: 0.6, dry: 0.94, predelay: 0.012 },
  POOL_ROOM: { seconds: 1.8, decay: 3, wet: 0.85, dry: 0.93, predelay: 0.022 },
  LARGE_POOL_HALL: { seconds: 2.9, decay: 2.8, wet: 1, dry: 0.9, predelay: 0.036 },
  LONG_CORRIDOR: { seconds: 2.2, decay: 3.1, wet: 0.88, dry: 0.93, predelay: 0.028 },
  DEEP_CHAMBER: { seconds: 3.2, decay: 3, wet: 1.05, dry: 0.9, predelay: 0.045 },
  UNDERWATER: { seconds: 0.55, decay: 4, wet: 0.28, dry: 0.98, predelay: 0.004 },
};

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const randomRange = (range, random = Math.random) => range[0] + random() * (range[1] - range[0]);

// Approximately 95% of the transition completes in `seconds`. Avoid rescheduling
// this every frame: modules call it only when the target actually changes.
export function smoothParam(param, target, context, seconds = 0.2) {
  const now = context.currentTime;
  if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
  else {
    const value = param.value;
    param.cancelScheduledValues(now);
    param.setValueAtTime(value, now);
  }
  param.setTargetAtTime(target, now, Math.max(0.005, seconds / 3));
}
