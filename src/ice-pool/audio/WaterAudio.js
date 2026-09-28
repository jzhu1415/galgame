import { AUDIO_CONFIG, clamp } from './AudioConfig.js';

const WATER_POOLS = Object.freeze({
  splashSmall: 'SPLASH_SMALL',
  splashMedium: 'SPLASH_MEDIUM',
  splashLarge: 'SPLASH_LARGE',
  exit: 'WATER_EXIT',
  swimLoop: 'SWIM_LOOP',
  wadeLoop: 'WADE_LOOP',
  swimStrokes: 'SWIM_STROKES',
  surfaceEnter: 'SURFACE_ENTER',
  surfaceExit: 'SURFACE_EXIT',
});

const WATER_LOOP_KEY = 'water-loop';
const WATER_BUS = 'WATER';
const WATER_GROUP = 'WATER';

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function readPosition(position) {
  if (!position || !Number.isFinite(Number(position.x)) || !Number.isFinite(Number(position.z))) return null;
  return { x: Number(position.x), y: finiteNumber(position.y), z: Number(position.z) };
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

function physicalSpeed(state) {
  if (Number.isFinite(Number(state?.speed))) return Math.max(0, Number(state.speed));
  const velocity = readVelocity(state);
  return Math.hypot(velocity.x, velocity.y, velocity.z);
}

function waterContact(state) {
  return Boolean(state.inWater);
}

function depthOf(state) {
  return Math.max(0, finiteNumber(state?.waterDepth));
}

function configFor(audio) {
  const config = audio?.config ?? AUDIO_CONFIG;
  return {
    water: config.water ?? AUDIO_CONFIG.water,
    footsteps: config.footsteps ?? AUDIO_CONFIG.footsteps,
    fade: config.fade ?? AUDIO_CONFIG.fade,
    voices: config.voices ?? AUDIO_CONFIG.voices,
  };
}

/**
 * Water transitions and loops are state-driven. Transient cooldowns are local
 * guards as well as engine hints; they never prevent the loop target from
 * being refreshed on the same update.
 */
export class WaterAudio {
  constructor(audio) {
    this.audio = audio;
    this.currentRoom = null;
    this._previousPosition = null;
    this._previousVelocity = { x: 0, y: 0, z: 0 };
    this._previousSpeed = 0;
    this._previousInWater = null;
    this._previousDepth = 0;
    this._previousSwimming = null;
    this._previousHeadUnderwater = null;
    this._initialized = false;
    this._lastTransitionAt = Number.NEGATIVE_INFINITY;
    this._lastSurfaceAt = Number.NEGATIVE_INFINITY;
    this._lastStrokeAt = Number.NEGATIVE_INFINITY;
    this._loopMode = null;
    this._clock = 0;
    this._baselinePending = false;
    this._entryFlight = null;
    this._disposed = false;
  }

  reset(state = null) {
    if (this._disposed) return;

    const settings = configFor(this.audio);
    this._stopLoop(settings.fade.pause);

    const position = readPosition(state?.position);
    const velocity = state ? readVelocity(state) : { x: 0, y: 0, z: 0 };
    const inWater = state ? waterContact(state) : null;

    this._previousPosition = position;
    this._previousVelocity = velocity;
    this._previousSpeed = state ? physicalSpeed(state) : 0;
    this._previousInWater = state ? inWater : null;
    this._previousDepth = state ? depthOf(state) : 0;
    this._previousSwimming = state ? Boolean(state.isSwimming) : null;
    this._previousHeadUnderwater = state ? Boolean(state.headUnderwater) : null;
    this._initialized = Boolean(state);
    this._lastTransitionAt = Number.NEGATIVE_INFINITY;
    this._lastSurfaceAt = Number.NEGATIVE_INFINITY;
    this._lastStrokeAt = Number.NEGATIVE_INFINITY;
    this._baselinePending = Boolean(state);
    this._entryFlight = null;
  }

  dispose() {
    if (this._disposed) return;
    const settings = configFor(this.audio);
    this._stopLoop(settings.fade.stop);
    this._disposed = true;
    this.audio = null;
    this._previousPosition = null;
    this._loopMode = null;
    this._baselinePending = false;
    this._entryFlight = null;
  }

  update(state = {}, delta = 0, nowSeconds = undefined) {
    if (this._disposed) return null;

    const settings = configFor(this.audio);
    const water = settings.water;
    const now = this._advanceClock(delta, nowSeconds);
    const position = readPosition(state.position);
    const velocity = readVelocity(state);
    const currentInWater = waterContact(state);
    const currentDepth = depthOf(state);
    const currentSwimming = Boolean(state.isSwimming);
    const currentHeadUnderwater = Boolean(state.headUnderwater);

    if (state.paused) {
      this.reset(state);
      return null;
    }

    if (!this._initialized) {
      this._trackEntryFlight(state, water);
      this._seed(
        position,
        velocity,
        physicalSpeed(state),
        currentInWater,
        currentDepth,
        currentSwimming,
        currentHeadUnderwater,
      );
      this._updateLoop(currentInWater, currentSwimming, state, settings);
      this._baselinePending = false;
      return null;
    }

    const previousPosition = this._previousPosition;
    const teleported = position && previousPosition
      && Math.hypot(position.x - previousPosition.x, position.z - previousPosition.z)
        > finiteNumber(settings.footsteps.maxTravelPerUpdate, 2);

    const previousInWater = this._previousInWater;
    const previousDepth = this._previousDepth;
    const previousSwimming = this._previousSwimming;
    const previousHeadUnderwater = this._previousHeadUnderwater;
    let played = null;

    if (this._baselinePending) {
      this._entryFlight = null;
      this._trackEntryFlight(state, water);
      this._seed(
        position,
        velocity,
        physicalSpeed(state),
        currentInWater,
        currentDepth,
        currentSwimming,
        currentHeadUnderwater,
      );
      this._updateLoop(currentInWater, currentSwimming, state, settings);
      this._baselinePending = false;
      return null;
    }

    if (teleported) {
      // A map transition/teleport is not a physical entry, exit, or stroke.
      this._entryFlight = null;
      this._trackEntryFlight(state, water);
      this._seed(
        position,
        velocity,
        physicalSpeed(state),
        currentInWater,
        currentDepth,
        currentSwimming,
        currentHeadUnderwater,
      );
      this._updateLoop(currentInWater, currentSwimming, state, settings);
      return null;
    }

    const divingEntry = this._trackEntryFlight(state, water);
    if (previousInWater !== null && previousInWater !== currentInWater) {
      played = this._waterTransition(
        currentInWater,
        previousDepth,
        state,
        now,
        water,
        settings,
        divingEntry,
      ) ?? played;
    }

    if (previousHeadUnderwater !== null && previousHeadUnderwater !== currentHeadUnderwater) {
      played = this._surfaceTransition(currentHeadUnderwater, now, water, settings) ?? played;
    }

    if (currentSwimming && previousSwimming === true) {
      played = this._strokeIfNeeded(
        state,
        velocity,
        physicalSpeed(state),
        now,
        delta,
        water,
        settings,
      ) ?? played;
    }

    // This call is intentionally after transient filtering and happens every
    // active frame, including frames where a stroke/transition is cooling down.
    this._updateLoop(currentInWater, currentSwimming, state, settings);
    this._seed(
      position,
      velocity,
      physicalSpeed(state),
      currentInWater,
      currentDepth,
      currentSwimming,
      currentHeadUnderwater,
    );
    return played;
  }

  _seed(position, velocity, currentSpeed, inWater, depth, swimming, headUnderwater) {
    this._previousPosition = position;
    this._previousVelocity = velocity;
    this._previousSpeed = currentSpeed;
    this._previousInWater = inWater;
    this._previousDepth = depth;
    this._previousSwimming = swimming;
    this._previousHeadUnderwater = headUnderwater;
    this._initialized = true;
  }

  _trackEntryFlight(state, water) {
    // An ordinary pool-edge walk also becomes airborne and gains considerable
    // downward speed. Observe a real upward launch, or a genuinely long fall,
    // instead of treating impact speed alone as evidence of a jump.
    const height = finiteNumber(state.baseEyeHeight, finiteNumber(state.position?.y));
    const airborne = state.grounded === false && !state.isSwimming && !state.inWater;
    if (airborne) {
      this._entryFlight ??= { peak: height, jumped: false };
      this._entryFlight.peak = Math.max(this._entryFlight.peak, height);
      this._entryFlight.jumped ||= readVelocity(state).y
        > finiteNumber(water.entryJumpRiseSpeed, 0.2);
    }
    const flight = this._entryFlight;
    const diving = Boolean(flight && (flight.jumped
      || flight.peak - height >= finiteNumber(water.entryHighFallDistance, 2)));
    // Consume on first contact, including a grounded shallow-water landing;
    // landing on dry tile must not contaminate the next walking entry either.
    if (state.inWater || state.grounded || state.isSwimming) this._entryFlight = null;
    return diving;
  }

  _waterTransition(currentInWater, previousDepth, state, now, water, settings, divingEntry) {
    // Jumping above the surface is not climbing onto a bank. Don't spend the
    // entry/exit cooldown on it, or a short water jump loses its re-entry sound.
    if (!currentInWater && state.grounded === false) return null;
    const cooldown = finiteNumber(water.transitionCooldown, 0.65);
    if (now - this._lastTransitionAt < cooldown) return null;

    if (!currentInWater && previousDepth < finiteNumber(water.kneeDepth, 0.45)) {
      // Leaving ankle/knee-deep water is intentionally almost silent.
      return null;
    }

    const pool = currentInWater
      ? splashPoolForEntry(state, water, divingEntry)
      : WATER_POOLS.exit;
    const gain = currentInWater ? finiteNumber(water.entryGain, 0.38) : finiteNumber(water.exitGain, 0.2);
    this._lastTransitionAt = now;
    return this._play(pool, gain, cooldown, settings);
  }

  _surfaceTransition(headUnderwater, now, water, settings) {
    const cooldown = finiteNumber(water.surfaceCooldown, 0.85);
    if (now - this._lastSurfaceAt < cooldown) return null;

    this._lastSurfaceAt = now;
    return this._play(
      headUnderwater ? WATER_POOLS.surfaceEnter : WATER_POOLS.surfaceExit,
      finiteNumber(water.surfaceGain, 0.2),
      cooldown,
      settings,
    );
  }

  _strokeIfNeeded(state, velocity, currentSpeed, now, delta, water, settings) {
    const dt = Math.max(0.000001, finiteNumber(delta));
    const minimumSpeed = finiteNumber(water.strokeMinSpeed, 0.5);
    if (currentSpeed < minimumSpeed) return null;

    const previousVelocity = this._previousVelocity;
    const velocityDelta = Math.hypot(
      velocity.x - previousVelocity.x,
      velocity.y - previousVelocity.y,
      velocity.z - previousVelocity.z,
    );
    const acceleration = velocityDelta / dt;
    const speedAcceleration = Math.abs(currentSpeed - this._previousSpeed) / dt;
    const previousMagnitude = Math.hypot(previousVelocity.x, previousVelocity.y, previousVelocity.z);
    let turnRate = 0;
    if (previousMagnitude > 0.000001 && currentSpeed > 0.000001) {
      const dot = (previousVelocity.x * velocity.x + previousVelocity.y * velocity.y
        + previousVelocity.z * velocity.z) / (previousMagnitude * currentSpeed);
      const angle = Math.acos(clamp(dot, -1, 1));
      turnRate = angle / dt;
    }

    const obviousMotion = Math.max(acceleration, speedAcceleration) >= finiteNumber(water.accelerationThreshold, 1.5)
      || turnRate >= finiteNumber(water.turnThreshold, 0.6);
    if (!obviousMotion) return null;

    const cooldown = finiteNumber(water.strokeCooldown, 1.25);
    if (now - this._lastStrokeAt < cooldown) return null;

    this._lastStrokeAt = now;
    return this._play(
      WATER_POOLS.swimStrokes,
      finiteNumber(water.strokeGain, 0.25),
      cooldown,
      settings,
    );
  }

  _updateLoop(inWater, swimming, state, settings) {
    const mode = swimming ? 'swim' : inWater ? 'wade' : null;
    if (!mode) {
      this._stopLoop(settings.fade.stop);
      return;
    }

    if (!this.audio || typeof this.audio.setLoop !== 'function') return;

    const water = settings.water;
    const speed = swimming ? physicalSpeed(state) : horizontalSpeed(state);
    const referenceSpeed = Math.max(0.001, finiteNumber(water.referenceSpeed, 1.8));
    const intensity = speed <= water.movementThreshold ? 0 : clamp(speed / referenceSpeed, 0, 1);
    const idleGain = clamp(finiteNumber(water.swimIdleGain, 0.012), 0, 1);
    const maximumGain = clamp(
      swimming ? finiteNumber(water.swimGain, 0.18) : finiteNumber(water.wadeGain, 0.075),
      0,
      1,
    );
    const depthIntensity = clamp(
      (depthOf(state) - finiteNumber(water.meaningfulDepth, 0.08))
        / Math.max(0.001, finiteNumber(water.waistDepth, 0.85) - finiteNumber(water.meaningfulDepth, 0.08)),
      0,
      1,
    );
    const gain = swimming
      ? idleGain + (maximumGain - idleGain) * intensity
      : maximumGain * intensity * depthIntensity;
    const poolName = swimming ? WATER_POOLS.swimLoop : WATER_POOLS.wadeLoop;
    const voices = this.audio.config?.voices ?? AUDIO_CONFIG.voices;
    const options = {
      bus: WATER_BUS,
      gain,
      fade: finiteNumber(settings.fade.loop, 0.24),
    };
    const maxVoices = Number(voices?.WATER);
    if (Number.isFinite(maxVoices)) options.maxVoices = maxVoices;

    this.audio.setLoop(WATER_LOOP_KEY, poolName, options);
    this._loopMode = mode;
  }

  _stopLoop(fade) {
    if (this._loopMode === null) return;
    if (this.audio && typeof this.audio.stopLoop === 'function') {
      this.audio.stopLoop(WATER_LOOP_KEY, Math.max(0, finiteNumber(fade, 0.12)));
    }
    this._loopMode = null;
  }

  _play(poolName, gain, cooldown, settings) {
    if (!this.audio || typeof this.audio.playRandomFromPool !== 'function') return null;

    const voices = this.audio.config?.voices ?? AUDIO_CONFIG.voices;
    const options = {
      bus: WATER_BUS,
      gain: clamp(gain, 0, 1),
      cooldown,
      group: WATER_GROUP,
    };
    const maxVoices = Number(voices?.WATER);
    if (Number.isFinite(maxVoices)) options.maxVoices = maxVoices;
    return this.audio.playRandomFromPool(poolName, options) ?? null;
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

function splashPoolForEntry(state, water, divingEntry = false) {
  if (divingEntry) return WATER_POOLS.splashLarge;
  if (state.horizontalSpeed >= water.entryMediumSpeed) {
    return WATER_POOLS.splashMedium;
  }
  return WATER_POOLS.splashSmall;
}

export { WATER_LOOP_KEY, WATER_POOLS, splashPoolForEntry };
export default WaterAudio;
