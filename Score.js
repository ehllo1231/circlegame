export class Score {
  constructor() {
    this.seconds = 0;
    this._lastTime = null;
    this.maxSeconds = Infinity;
  }

  reset() {
    this.seconds = 0;
    this._lastTime = null;
  }

  update(now) {
    const timeNow = typeof now === 'number'
      ? now
      : (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (this._lastTime == null) {
      this._lastTime = timeNow;
      return;
    }
    const dt = (timeNow - this._lastTime) / 1000;
    this._lastTime = timeNow;
    this.seconds += dt;
  }

  getSeconds() {
    return this.seconds;
  }

  getVisible() {
    return Math.floor(this.getDisplaySeconds());
  }

  getDisplaySeconds() {
    return Math.min(this.seconds, this.maxSeconds);
  }

  setMaxSeconds(maxSeconds = Infinity) {
    if (Number.isFinite(maxSeconds) && maxSeconds >= 0) {
      this.maxSeconds = Math.max(0, maxSeconds);
    } else {
      this.maxSeconds = Infinity;
    }
  }
}

