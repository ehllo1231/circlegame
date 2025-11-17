import { clamp01, blendHexColors } from './colorUtils.js';

export class Stage3PrologBackgroundFade {
  constructor() {
    this.durationSec = 0;
    this.easeExponent = 1.4;
    this.elapsed = 0;
    this.active = false;
    this.started = false;
    this.completed = false;
  }

  configure(config = {}) {
    const duration = Number(config?.durationSec);
    const exponent = Number(config?.easeExponent);
    this.durationSec = Number.isFinite(duration) && duration > 0 ? duration : 0;
    this.easeExponent = Number.isFinite(exponent) && exponent > 0 ? exponent : 1.4;
  }

  reset() {
    this.elapsed = 0;
    this.active = false;
    this.started = false;
    this.completed = false;
  }

  start() {
    if (this.started || this.durationSec <= 0) {
      this.started = true;
      this.active = false;
      this.completed = this.durationSec <= 0;
      this.elapsed = this.durationSec <= 0 ? this.durationSec : this.elapsed;
      return;
    }
    this.started = true;
    this.active = true;
    this.completed = false;
    this.elapsed = 0;
  }

  update(dtSeconds) {
    if (!this.started || this.completed || !this.active) return;
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    this.elapsed = Math.min(this.durationSec, this.elapsed + dtSeconds);
    if (this.elapsed >= this.durationSec - 1e-4) {
      this.active = false;
      this.completed = true;
    }
  }

  isActive() {
    return this.active;
  }

  isComplete() {
    return this.completed || this.durationSec <= 0;
  }

  hasStarted() {
    return this.started;
  }

  getProgress() {
    if (this.durationSec <= 0) return 1;
    return clamp01(this.elapsed / this.durationSec);
  }

  getEasedProgress() {
    const progress = this.getProgress();
    return Math.pow(progress, this.easeExponent);
  }

  getColor(fromColor, toColor) {
    if (!this.started) return typeof fromColor === 'string' ? fromColor : '#000000';
    if (this.isComplete()) return typeof toColor === 'string' ? toColor : fromColor;
    return blendHexColors(
      typeof fromColor === 'string' ? fromColor : '#000000',
      typeof toColor === 'string' ? toColor : fromColor,
      this.getEasedProgress(),
    );
  }

  fastForward() {
    if (this.durationSec <= 0) {
      this.reset();
      this.started = true;
      this.completed = true;
      return;
    }
    this.started = true;
    this.active = false;
    this.completed = true;
    this.elapsed = this.durationSec;
  }
}
