// Only admitted nearby sources own a THREE.PositionalAudio (through AudioVoice).
// Distant candidate descriptors are plain data and have no Web Audio nodes.
export class SpatialAudioSource {
  constructor(audio, descriptor) {
    this.audio = audio;
    this.descriptor = descriptor;
    this.key = `spatial:${descriptor.id}`;
    this.voice = null;
    this.gain = 1;
  }

  update(gain) {
    this.gain = gain;
    const { descriptor, audio } = this;
    if (descriptor.kind === 'drip') return;
    this.voice = audio.setLoop(this.key, descriptor.pool ?? 'DISTANT_WATER', {
      bus: 'SPATIAL', position: descriptor.position,
      gain: gain * (descriptor.gain ?? audio.config.ambience.distantWaterGain),
      fade: audio.config.fade.loop,
    });
  }

  drip() {
    if (this.descriptor.kind !== 'drip' || (this.voice && !this.voice.disposed)) return null;
    this.voice = this.audio.playRandomFromPool('DRIPS', {
      bus: 'SPATIAL', position: this.descriptor.position,
      gain: this.gain * this.audio.config.ambience.dripGain,
      rateRange: [0.97, 1.03], gainRange: [0.95, 1.05], cooldown: 0.8,
      group: 'drip', maxVoices: 2,
    });
    return this.voice;
  }

  dispose() {
    this.audio.stopLoop(this.key);
    this.voice?.stop();
    this.voice = null;
  }
}
