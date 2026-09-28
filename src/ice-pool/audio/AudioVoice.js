import * as THREE from 'three';
import { clamp, smoothParam } from './AudioConfig.js';

// One small owner for Three's source + gain + optional panner. In particular,
// remove Three.Audio's default listener connection to avoid a parallel dry path.
export class AudioVoice {
  constructor(system, sample, { bus, gain = 1, rate = 1, loop = false, position, fade = 0.012, group }) {
    this.system = system;
    this.context = system.context;
    this.bus = bus;
    this.group = group ?? bus;
    this.createdAt = this.context.currentTime;
    this.disposed = false;
    this.stopping = false;
    this.targetGain = gain;
    this.audio = position ? new THREE.PositionalAudio(system.listener) : new THREE.Audio(system.listener);
    this.audio.gain.disconnect();
    this.audio.gain.connect(system.buses[bus]);
    this.audio.gain.gain.value = 0;
    this.audio.setBuffer(sample.buffer);
    this.audio.setLoop(loop);
    this.audio.setPlaybackRate(rate);
    if (loop) {
      this.audio.setLoopStart(sample.loopStart ?? 0);
      this.audio.setLoopEnd(sample.loopEnd ?? 0);
    }
    if (position) {
      const config = system.config.spatial;
      this.audio.position.copy(position);
      this.audio.setDistanceModel('inverse');
      this.audio.setRefDistance(config.refDistance);
      this.audio.setMaxDistance(config.maxDistance);
      this.audio.setRolloffFactor(config.rolloffFactor);
      this.audio.panner.panningModel = system.mobile ? 'equalpower' : 'HRTF';
      system.scene.add(this.audio);
    }
    this.audio.play();
    // Three binds this callback on play; replace it with an owned cleanup callback.
    this.audio.source.onended = () => this.dispose();
    smoothParam(this.audio.gain.gain, gain, this.context, fade);
    if (position) this.audio.updateMatrixWorld(true);
  }

  setGain(gain, seconds) {
    if (this.disposed || this.stopping || Math.abs(gain - this.targetGain) < 0.002) return;
    this.targetGain = gain;
    smoothParam(this.audio.gain.gain, Math.max(0, gain), this.context, seconds);
  }

  setRate(rate) {
    if (!this.disposed && !this.stopping && Math.abs(this.audio.playbackRate - rate) > 0.01) {
      this.audio.setPlaybackRate(clamp(rate, 0.5, 1.5));
    }
  }

  stop(seconds) {
    if (this.disposed || this.stopping) return;
    seconds ??= this.system.config.fade.stop;
    if (seconds <= 0) { this.dispose(); return; }
    this.stopping = true;
    smoothParam(this.audio.gain.gain, 0, this.context, seconds);
    // Keep onended so stopped nodes are disconnected even when rendering pauses.
    this.audio.source.stop(this.context.currentTime + seconds * 1.5);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const sound = this.audio;
    if (sound.source) {
      sound.source.onended = null;
      try { sound.source.stop(); } catch { /* Already naturally ended. */ }
      sound.source.disconnect();
    }
    sound.isPlaying = false;
    sound.gain.disconnect();
    sound.panner?.disconnect();
    sound.removeFromParent();
    sound.buffer = null;
    sound.source = null;
    this.system.voices.delete(this);
    this.system = null;
  }
}
