import { clamp, smoothParam } from './AudioConfig.js';

export class UnderwaterAudio {
  constructor(audio) {
    this.audio = audio;
    this.context = audio.context;
    this.filter = this.context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 0.65;
    this.filter.frequency.value = Math.min(audio.config.underwater.openCutoff, this.context.sampleRate * 0.45);
    this.headUnderwater = false;
    this.mixKey = '';
  }

  // Audio-only Schmitt trigger using the existing water-column flag and camera Y.
  // It never queries terrain, changes physics, or writes to the water system.
  readHeadState(state) {
    const margin = this.audio.config.underwater.hysteresis;
    if (!state.inWaterColumn) this.headUnderwater = false;
    else if (this.headUnderwater) {
      if (state.position.y > state.waterLevel + margin) this.headUnderwater = false;
    } else if (state.position.y < state.waterLevel - margin) this.headUnderwater = true;
    return this.headUnderwater;
  }

  update(state) {
    const { underwater: config } = this.audio.config;
    const amount = state.headUnderwater ? clamp(config.amount) : 0;
    const key = `${amount}:${config.cutoff}:${state.paused}`;
    if (key !== this.mixKey) {
      this.mixKey = key;
      const seconds = state.headUnderwater ? config.enterSeconds : config.exitSeconds;
      const open = Math.min(config.openCutoff, this.context.sampleRate * 0.45);
      const cutoff = Math.exp(Math.log(open) * (1 - amount) + Math.log(config.cutoff) * amount);
      smoothParam(this.filter.frequency, cutoff, this.context, seconds);
      const factors = {
        FOOTSTEP: config.footstepGain, WATER: config.waterGain,
        AMBIENCE: config.ambienceGain, SPATIAL: config.spatialGain,
      };
      for (const [name, node] of Object.entries(this.audio.busMix)) {
        smoothParam(node.gain, 1 + (factors[name] - 1) * amount, this.context, seconds);
      }
      smoothParam(this.audio.reverbMix.gain, 1 + (config.reverbGain - 1) * amount, this.context, seconds);
    }
    this.audio.setLoop('underwater-bed', 'UNDERWATER_BED', {
      bus: 'WATER', gain: state.paused ? 0 : config.bedGain * amount,
      fade: config.enterSeconds,
    });
  }

  dispose() {
    this.audio.stopLoop('underwater-bed', 0);
    this.filter.disconnect();
    this.audio = null;
  }
}
