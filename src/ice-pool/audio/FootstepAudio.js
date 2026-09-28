import { AUDIO_CONFIG, SurfaceType, clamp } from './AudioConfig.js';

const FOOTSTEP_POOLS = Object.freeze({
  wetTile: 'WET_TILE_STEPS',
  running: 'RUN_STEPS',
  shallowWater: 'SHALLOW_WATER_STEPS',
  deepWading: 'DEEP_WADING_STEPS',
});

const SURFACE_VALUES = new Set(Object.values(SurfaceType));
const FOOTSTEP_BUS = 'FOOTSTEP';
const FOOTSTEP_GROUP = 'FOOTSTEP';

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function readPosition(position) {
  if (!position || !Number.isFinite(Number(position.x)) || !Number.isFinite(Number(position.z))) return null;
  return {
    x: Number(position.x),
    y: finiteNumber(position.y),
    z: Number(position.z),
  };
}

function readVelocity(state) {
  const velocity = state?.velocity;
  return {
    x: finiteNumber(velocity?.x),
    y: finiteNumber(velocity?.y, finiteNumber(state?.verticalVelocity)),
    z: finiteNumber(velocity?.z),
  };
}

function horizontalSpeed(state) {
  if (Number.isFinite(Number(state?.horizontalSpeed))) return Math.max(0, Number(state.horizontalSpeed));
  const velocity = readVelocity(state);
  return Math.hypot(velocity.x, velocity.z);
}

function hasMovementInput(moving) {
  if (typeof moving === 'boolean') return moving;
  if (Number.isFinite(Number(moving))) return Math.abs(Number(moving)) > 0;
  if (moving && typeof moving === 'object') {
    return Math.hypot(finiteNumber(moving.x), finiteNumber(moving.z ?? moving.y)) > 0;
  }
  return false;
}

function waterContact(state) {
  return Boolean(state.inWater);
}

function waterDepth(state) {
  return Math.max(0, finiteNumber(state?.waterDepth));
}

function surfaceFor(state, inWater, swimming, waterConfig) {
  if (swimming) return SurfaceType.SWIMMING;
  if (inWater) {
    return waterDepth(state) >= finiteNumber(waterConfig?.kneeDepth, 0.45)
      ? SurfaceType.DEEP_WADING
      : SurfaceType.SHALLOW_WATER;
  }
  return SURFACE_VALUES.has(state?.surface) ? state.surface : SurfaceType.WET_TILE;
}

function impactMagnitude(value) {
  if (value && typeof value === 'object') return Math.abs(finiteNumber(value.y));
  return Math.abs(finiteNumber(value));
}

function configFor(audio) {
  const config = audio?.config ?? AUDIO_CONFIG;
  return {
    footsteps: config.footsteps ?? AUDIO_CONFIG.footsteps,
    water: config.water ?? AUDIO_CONFIG.water,
    voices: config.voices ?? AUDIO_CONFIG.voices,
  };
}

/**
 * Distance-driven footstep events. The module deliberately owns no clocked
 * step timer: a step is eligible only after the camera has travelled one
 * stride in XZ space.
 */
export class FootstepAudio {
  constructor(audio) {
    this.audio = audio;
    this.surface = SurfaceType.WET_TILE;
    this._previousPosition = null;
    this._distance = 0;
    this._previousGrounded = null;
    this._previousInWater = null;
    this._initialized = false;
    this._lastStepAt = Number.NEGATIVE_INFINITY;
    this._clock = 0;
    this._baselinePending = false;
    this._disposed = false;
  }

  reset(state = null) {
    if (this._disposed) return;

    const settings = configFor(this.audio);
    const position = readPosition(state?.position);
    const inWater = state ? waterContact(state) : null;
    const swimming = Boolean(state?.isSwimming);

    this._previousPosition = position;
    this._distance = 0;
    this._previousGrounded = state ? Boolean(state.grounded) : null;
    this._previousInWater = state ? inWater : null;
    this._initialized = Boolean(state && position);
    this._lastStepAt = Number.NEGATIVE_INFINITY;
    this._baselinePending = Boolean(state);
    this.surface = state ? surfaceFor(state, inWater, swimming, settings.water) : SurfaceType.WET_TILE;
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.audio = null;
    this._previousPosition = null;
    this._distance = 0;
    this._baselinePending = false;
  }

  update(state = {}, delta = 0, nowSeconds = undefined) {
    if (this._disposed) return null;

    const settings = configFor(this.audio);
    const footsteps = settings.footsteps;
    const water = settings.water;
    const now = this._advanceClock(delta, nowSeconds);
    const position = readPosition(state.position);
    const inWater = waterContact(state);
    const swimming = Boolean(state.isSwimming);
    const grounded = Boolean(state.grounded);
    const currentSurface = surfaceFor(state, inWater, swimming, water);
    this.surface = currentSurface;

    if (state.paused) {
      this.reset(state);
      return null;
    }

    if (!position) {
      this.reset();
      return null;
    }

    if (!this._initialized || !this._previousPosition) {
      this._seed(position, grounded, inWater);
      this._baselinePending = false;
      return null;
    }

    if (this._baselinePending) {
      this._seed(position, grounded, inWater);
      this._distance = 0;
      this._baselinePending = false;
      return null;
    }

    const previousPosition = this._previousPosition;
    const distance = Math.hypot(position.x - previousPosition.x, position.z - previousPosition.z);
    const previousGrounded = this._previousGrounded;
    const previousInWater = this._previousInWater;
    this._seed(position, grounded, inWater);

    const maxTravel = finiteNumber(footsteps.maxTravelPerUpdate, 2);
    if (distance > maxTravel) {
      this._distance = 0;
      return null;
    }

    const landed = grounded
      && previousGrounded === false
      && !inWater
      && previousInWater !== true
      && impactMagnitude(state.impactVelocity) >= finiteNumber(footsteps.landingMinSpeed, 1.8);

    if (landed) {
      // A landing owns this update so it cannot also emit a normal step.
      this._distance = 0;
      return this._play(
        FOOTSTEP_POOLS.wetTile,
        finiteNumber(footsteps.landingGain, 0.28),
        footsteps,
        now,
        finiteNumber(footsteps.cooldown, 0.12),
        SurfaceType.WET_TILE,
        1,
      );
    }

    const canStep = grounded
      && !swimming
      && hasMovementInput(state.moving)
      && horizontalSpeed(state) > finiteNumber(footsteps.movementThreshold, 0.14);

    if (!canStep) {
      // Idle, airborne, swimming, and blocked movement all establish a new
      // origin. No old partial stride may be paid back later.
      this._distance = 0;
      return null;
    }

    this._distance += distance;
    const stride = this._strideFor(currentSurface, Boolean(state.running), footsteps);
    if (this._distance < stride) return null;

    // At the configured travel cap only one stride can normally be crossed.
    // Keep any legitimate remainder so the next event remains distance based.
    this._distance -= stride;
    const cooldown = finiteNumber(footsteps.cooldown, 0.12);
    if (now - this._lastStepAt < cooldown) return null;

    const baseGain = currentSurface === SurfaceType.SHALLOW_WATER
      ? finiteNumber(footsteps.shallowGain, footsteps.gain)
      : currentSurface === SurfaceType.DEEP_WADING
        ? finiteNumber(footsteps.deepGain, footsteps.gain)
        : finiteNumber(footsteps.gain, 0.48);
    const gain = gainAtSpeed(baseGain, horizontalSpeed(state), footsteps);
    const pool = state.running && currentSurface === SurfaceType.WET_TILE
      ? FOOTSTEP_POOLS.running
      : currentSurface === SurfaceType.SHALLOW_WATER
      ? FOOTSTEP_POOLS.shallowWater
      : currentSurface === SurfaceType.DEEP_WADING
        ? FOOTSTEP_POOLS.deepWading
        : FOOTSTEP_POOLS.wetTile;
    const rate = waterPitch(currentSurface, waterDepth(state), footsteps, water);

    const voice = this._play(pool, gain, footsteps, now, cooldown, currentSurface, rate);
    if (voice) this._lastStepAt = now;
    return voice;
  }

  _seed(position, grounded, inWater) {
    this._previousPosition = position;
    this._previousGrounded = grounded;
    this._previousInWater = inWater;
    this._initialized = true;
  }

  _strideFor(surface, running, footsteps) {
    if (surface === SurfaceType.SHALLOW_WATER) {
      return Math.max(0.001, finiteNumber(footsteps.shallowStride, footsteps.walkStride));
    }
    if (surface === SurfaceType.DEEP_WADING) {
      return Math.max(0.001, finiteNumber(footsteps.deepStride, footsteps.walkStride));
    }
    return Math.max(0.001, finiteNumber(
      running ? footsteps.runStride : footsteps.walkStride,
      running ? 1.8 : 1.5,
    ));
  }

  _play(
    poolName,
    gain,
    footsteps,
    now,
    cooldown = finiteNumber(footsteps.cooldown, 0.12),
    surface = SurfaceType.WET_TILE,
    rate = 1,
  ) {
    if (!this.audio || typeof this.audio.playRandomFromPool !== 'function') return null;

    const voices = this.audio.config?.voices ?? AUDIO_CONFIG.voices;
    const options = {
      bus: surface === SurfaceType.SHALLOW_WATER || surface === SurfaceType.DEEP_WADING
        ? 'WATER'
        : FOOTSTEP_BUS,
      gain: clamp(gain, 0, 1),
      rate,
      rateRange: [...(footsteps.playbackRate ?? AUDIO_CONFIG.footsteps.playbackRate)],
      gainRange: [...(footsteps.gainVariation ?? AUDIO_CONFIG.footsteps.gainVariation)],
      cooldown,
      group: FOOTSTEP_GROUP,
    };
    const maxVoices = Number(voices?.FOOTSTEP);
    if (Number.isFinite(maxVoices)) options.maxVoices = maxVoices;

    const voice = this.audio.playRandomFromPool(poolName, options);
    if (poolName === FOOTSTEP_POOLS.wetTile && surface === SurfaceType.WET_TILE && voice) {
      this._lastStepAt = now;
    }
    return voice ?? null;
  }

  _advanceClock(delta, nowSeconds) {
    const dt = Math.max(0, finiteNumber(delta));
    if (Number.isFinite(Number(nowSeconds))) {
      this._clock = Number(nowSeconds);
    } else {
      this._clock += dt;
    }
    return this._clock;
  }
}

function gainAtSpeed(baseGain, speed, footsteps) {
  const reference = Math.max(0.001, finiteNumber(footsteps.referenceSpeed, 2.45));
  const run = Math.max(reference + 0.001, footsteps.referenceRunSpeed);
  const [quiet, fast] = footsteps.speedGainRange;
  const factor = speed <= reference
    ? quiet + (1 - quiet) * clamp(speed / reference)
    : 1 + (fast - 1) * clamp((speed - reference) / (run - reference));
  return baseGain * factor;
}

function waterPitch(surface, depth, footsteps, water) {
  if (surface !== SurfaceType.SHALLOW_WATER && surface !== SurfaceType.DEEP_WADING) return 1;
  const lowRate = clamp(finiteNumber(footsteps.playbackRate?.[0], 0.94), 0.5, 1);
  const knee = Math.max(0.001, finiteNumber(water.kneeDepth, 0.45));
  const waist = Math.max(knee, finiteNumber(water.waistDepth, 0.85));
  const amount = surface === SurfaceType.SHALLOW_WATER
    ? clamp(depth / knee, 0, 1) * 0.35
    : clamp((depth - knee) / Math.max(0.001, waist - knee), 0, 1);
  return 1 - amount * (1 - lowRate);
}

export { FOOTSTEP_POOLS };
export default FootstepAudio;
