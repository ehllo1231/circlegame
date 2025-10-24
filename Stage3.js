import { StageManager, StagePhase } from './StageManager.js';
import { SPAWN, SNOW } from './Config.js';

export class Stage3Prolog {
  constructor() {
    this.started = false;
    this.completed = false;
    this.elapsed = 0;
    this.geometry = null;
    this.totalDurationSec = 0;
  }

  start(geometry) {
    this.started = true;
    this.completed = false;
    this.elapsed = 0;
    this.geometry = geometry || null;
  }

  update(dt = 0) {
    if (!this.started || this.completed) return;
    this.elapsed += dt;
    // No special prolog sequence yet; complete immediately.
    this.completed = true;
  }

  draw() {
    // No-op for now; effects will be added later.
  }

  isComplete() {
    return this.completed;
  }

  isActive() {
    return this.started && !this.completed;
  }

  getObstacles() {
    return [];
  }

  getBackgroundOffset() {
    return { x: 0, y: 0 };
  }

  getTotalDuration() {
    return this.totalDurationSec ?? 0;
  }
}

class Stage3Phase1 extends StagePhase {
  constructor() {
    super({ name: 'stage3-phase1', durationSec: 10 });
  }

  onEnter() {
    SPAWN.baseInterval = 22;
    SPAWN.multiCountWeights = [0.05, 0.08, 0.12, 0.2, 0.2, 0.18, 0.12, 0.05];
    SNOW.direction = 'down';
    SNOW.spawnPerMin = 100;
    SNOW.wind.baseX = 0.25;
    SNOW.wind.oscAmp = 0.2;
  }
}

class Stage3Phase2 extends StagePhase {
  constructor() {
    super({ name: 'stage3-phase2', durationSec: 20 });
  }

  onEnter() {
    SPAWN.baseInterval = 18;
    SPAWN.multiCountWeights = [0.02, 0.06, 0.14, 0.24, 0.22, 0.18, 0.10, 0.04];
    SNOW.direction = 'down';
    SNOW.spawnPerMin = 600;
    SNOW.wind.baseX = -0.4;
    SNOW.wind.oscAmp = 0.35;
  }
}

class Stage3Phase3 extends StagePhase {
  constructor() {
    super({ name: 'stage3-phase3', durationSec: 20 });
  }

  onEnter() {
    SPAWN.baseInterval = 15;
    SPAWN.multiCountWeights = [0.0, 0.04, 0.12, 0.24, 0.24, 0.2, 0.12, 0.04];
    SNOW.direction = 'down';
    SNOW.spawnPerMin = 2400;
    SNOW.wind.baseX = 0.6;
    SNOW.wind.oscAmp = 0.5;
  }
}

class Stage3Phase4 extends StagePhase {
  constructor() {
    super({ name: 'stage3-phase4', durationSec: 10 });
  }

  onEnter() {
    SPAWN.baseInterval = 12;
    SPAWN.multiCountWeights = [0.0, 0.02, 0.08, 0.2, 0.24, 0.22, 0.16, 0.08];
    SNOW.direction = 'down';
    SNOW.spawnPerMin = 4800;
    SNOW.wind.baseX = -0.75;
    SNOW.wind.oscAmp = 0.6;
  }
}

export class Stage3 extends StageManager {
  constructor() {
    super({
      phases: [
        new Stage3Phase1(),
        new Stage3Phase2(),
        new Stage3Phase3(),
        new Stage3Phase4(),
      ],
      fadeFrom: '#200040',
      fadeTo: '#36005a',
      fadeDelaySec: 2,
      fadeDurationSec: 2,
      hideScoreDurationSec: 2,
    });

    this.prolog = new Stage3Prolog();
    this._prologShown = false;
    this._skipProlog = false;
  }

  update(secondsElapsed) {
    const skip = this._skipProlog;
    const prologDuration = (!skip && this.prolog?.getTotalDuration?.()) ?? 0;
    if (!skip && secondsElapsed < prologDuration) {
      this.totalElapsed = 0;
      this.changed = false;
      return;
    }
    const effectiveElapsed = skip
      ? Math.max(0, secondsElapsed)
      : Math.max(0, secondsElapsed - prologDuration);
    super.update(effectiveElapsed);
  }

  drawProlog(ctx, geometry) {
    if (!this.prolog || !this._prologShown || typeof this.prolog.draw !== 'function') return;
    this.prolog.draw(ctx, geometry);
  }

  startProlog(geometry) {
    if (!this.prolog || typeof this.prolog.start !== 'function') return;
    if (this._skipProlog) {
      this._prologShown = true;
      this.prolog.start(geometry);
      this.prolog.completed = true;
      return;
    }
    if (this._prologShown) return;
    this._prologShown = true;
    this.prolog.start(geometry);
  }

  updateProlog(dtSeconds) {
    if (!this.prolog || !this._prologShown || typeof this.prolog.update !== 'function') return;
    this.prolog.update(dtSeconds);
  }

  isPrologActive() {
    if (!this.prolog || !this._prologShown) return false;
    return this.prolog.isActive();
  }

  getPrologObstacles() {
    if (!this.prolog || !this._prologShown) return [];
    return this.prolog.getObstacles();
  }

  getBackgroundOffset() {
    if (this.prolog && this._prologShown && typeof this.prolog.getBackgroundOffset === 'function') {
      return this.prolog.getBackgroundOffset();
    }
    return super.getBackgroundOffset();
  }

  setSkipProlog(skip = false) {
    const shouldSkip = !!skip;
    if (this._skipProlog === shouldSkip) {
      if (shouldSkip) {
        this._prologShown = true;
        this.prolog.completed = true;
      }
      return;
    }
    this._skipProlog = shouldSkip;
    this._prologShown = false;
    this.prolog = new Stage3Prolog();
    if (shouldSkip) {
      this.prolog.completed = true;
    }
  }
}

export const STAGE3_PHASES = {
  Stage3Prolog,
  Stage3Phase1,
  Stage3Phase2,
  Stage3Phase3,
  Stage3Phase4,
};
