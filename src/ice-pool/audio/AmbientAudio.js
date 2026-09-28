import { clamp, randomRange } from './AudioConfig.js';
import { SpatialAudioSource } from './SpatialAudioSource.js';

export class AmbientAudio {
  constructor(audio, environmentProvider) {
    this.audio = audio;
    this.environmentProvider = environmentProvider;
    this.active = new Map();
    this.nextUpdate = 0;
    this.nextDrip = Infinity;
    this.wasPaused = true;
    this.lastDrip = null;
    this.bedGains = new Map();
  }

  updateBed(key, poolName, gain, fade) {
    const current = this.audio.loops.get(key);
    if (this.bedGains.get(key) === gain
      && current?.poolName === poolName && !current.disposed && !current.stopping) return;
    const voice = this.audio.setLoop(key, poolName, {
      bus: 'AMBIENCE', fade, gain,
    });
    // If admission/loading is temporarily unavailable, retry next frame.
    if (voice) this.bedGains.set(key, gain);
    else this.bedGains.delete(key);
  }

  update(state, delta, now) {
    const { audio } = this;
    const config = audio.config.ambience;
    const zone = state.currentRoom;
    // Exactly one global bed of each kind; zone changes change gains, not loops.
    this.updateBed('ventilation', 'VENTILATION', config.ventilationGain * zone.ambience,
      config.zoneFade);
    this.updateBed('pool-bed', 'POOL_AMBIENCE', config.poolGain * zone.ambience,
      config.zoneFade);
    this.updateBed('fluorescent', 'FLUORESCENT', config.humGain * zone.hum,
      config.zoneFade);
    if (state.paused) { this.wasPaused = true; return; }
    if (this.wasPaused) {
      this.wasPaused = false;
      this.nextDrip = now + randomRange(config.dripInterval);
      this.nextUpdate = now;
    }
    if (now < this.nextUpdate) return;
    this.nextUpdate = now + 1 / audio.config.spatial.updateHz;
    this.updateSources(state);
    if (now >= this.nextDrip) {
      this.nextDrip = now + randomRange(config.dripInterval);
      const drips = [...this.active.values()].filter(source => source.descriptor.kind === 'drip');
      const choices = drips.filter(source => source.descriptor.id !== this.lastDrip);
      const available = choices.length ? choices : drips;
      const source = available[Math.floor(Math.random() * available.length)];
      if (source?.drip()) this.lastDrip = source.descriptor.id;
    }
  }

  updateSources(state) {
    const { audio } = this;
    const config = audio.config.spatial;
    const budget = audio.mobile ? config.mobileSources
      : audio.quality === 'performance' ? config.performanceSources : config.desktopSources;
    const loopBudget = audio.mobile || audio.quality === 'performance' ? config.mobileLoops : config.desktopLoops;
    const candidates = this.environmentProvider(state, config.activationDistance)
      .map(source => ({ ...source, distance: Math.hypot(
        source.position.x - state.position.x, source.position.y - state.position.y,
        source.position.z - state.position.z,
      ) }))
      .filter(source => source.distance < config.activationDistance
        + (this.active.has(source.id) ? config.deactivateMargin : 0))
      .sort((a, b) => (a.distance - (this.active.has(a.id) ? 2 : 0))
        - (b.distance - (this.active.has(b.id) ? 2 : 0)));
    const selected = new Map();
    let loops = 0;
    for (const candidate of candidates) {
      if (selected.size >= budget) break;
      if (candidate.kind !== 'drip') {
        if (loops >= loopBudget) continue;
        loops += 1;
      }
      selected.set(candidate.id, candidate);
    }
    for (const [id, source] of this.active) {
      if (!selected.has(id)) { source.dispose(); this.active.delete(id); }
    }
    // Count retiring positional voices too, so zone changes cannot momentarily
    // double the mobile panner budget while old loops are fading away.
    let resident = [...audio.voices].filter(voice => voice.audio.panner).length;
    for (const [id, descriptor] of selected) {
      let source = this.active.get(id);
      if (!source) {
        if (resident >= budget) continue;
        source = new SpatialAudioSource(audio, descriptor);
        this.active.set(id, source);
      }
      const before = source.voice && !source.voice.disposed;
      const boundaryGain = clamp((config.activationDistance + config.deactivateMargin - descriptor.distance) / config.boundaryFade);
      const roomGain = descriptor.roomId === state.currentRoom.id ? 1 : config.adjacentRoomGain;
      source.update(boundaryGain * roomGain);
      if (!before && source.voice && !source.voice.disposed) resident += 1;
    }
  }

  reset() {
    this.wasPaused = true;
    this.nextDrip = Infinity;
    this.nextUpdate = 0;
    for (const source of this.active.values()) source.dispose();
    this.active.clear();
  }

  dispose() {
    this.reset();
    for (const key of ['ventilation', 'pool-bed', 'fluorescent']) this.audio.stopLoop(key, 0);
    this.bedGains.clear();
    this.environmentProvider = null;
  }
}
