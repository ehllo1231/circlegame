import { StageManager, StagePhase } from './StageManager.js';
import { SPAWN, SNOW } from './Config.js';
import { Stage3Prolog } from './Stage3Prolog.js';

const STAGE2_FINAL_BACKGROUND = '#000000';

function applyStageRotation(context, rotationConfig) {
  const manager = context?.stageManager;
  if (manager && typeof manager.setStageRotationConfig === 'function') {
    manager.setStageRotationConfig(rotationConfig);
  }
}

class Stage3Phase1 extends StagePhase {
  constructor() {
    super({ name: 'stage3-phase1', durationSec: 10 });
  }

  onEnter(context) {
    SPAWN.baseInterval = 40;
    SPAWN.multiCountWeights = [0.05, 0.1, 0.1, 0.2, 0.2, 0.2, 0.1, 0.05];
    SNOW.direction = 'down';
    SNOW.spawnPerMin = 0;
    SNOW.fallSpeed.min = 0.8;
    SNOW.fallSpeed.max = 2.0;
    SNOW.wind.baseX = 0.12;
    SNOW.wind.oscAmp = 0.1;
    applyStageRotation(context, {
      enabled: true,
      speedDegPerSec: 45,
      direction: 'clockwise',
    });
  }
}

class Stage3Phase2 extends StagePhase {
  constructor() {
    super({ name: 'stage3-phase2', durationSec: 20 });
  }

  onEnter(context) {
    SPAWN.baseInterval = 28;
    SPAWN.multiCountWeights = [0.05, 0.07, 0.1, 0.2, 0.2, 0.2, 0.13, 0.05];
    SNOW.direction = 'down';
    SNOW.spawnPerMin = 300;
    SNOW.fallSpeed.min = 0.8;
    SNOW.fallSpeed.max = 2.0;
    SNOW.wind.baseX = 0.12;
    SNOW.wind.oscAmp = 0.1;
    applyStageRotation(context, {
      enabled: true,
      speedDegPerSec: 45,
      direction: 'counterclockwise',
    });
  }
}

class Stage3Phase3 extends StagePhase {
  constructor() {
    super({ name: 'stage3-phase3', durationSec: 20 });
  }

  onEnter(context) {
    SPAWN.baseInterval = 23;
    SPAWN.multiCountWeights = [0.0, 0.02, 0.1, 0.2, 0.2, 0.25, 0.13, 0.1];
    SNOW.direction = 'down';
    SNOW.spawnPerMin = 2000;
    SNOW.fallSpeed.min = 3;
    SNOW.fallSpeed.max = 5;
    SNOW.wind.baseX = 3;
    applyStageRotation(context, {
      enabled: true,
      speedDegPerSec: 45,
      direction: 'clockwise',
    });
  }
}

class Stage3Phase4 extends StagePhase {
  constructor() {
    super({ name: 'stage3-phase4', durationSec: 10 });
  }

  onEnter(context) {
    SPAWN.baseInterval = 19;
    SPAWN.multiCountWeights = [0.0, 0.02, 0.1, 0.2, 0.2, 0.25, 0.13, 0.1];
    SNOW.direction = 'down';
    SNOW.spawnPerMin = 6000;
    SNOW.fallSpeed.min = 7.0;
    SNOW.fallSpeed.max = 10;
    SNOW.wind.baseX = -6;
    applyStageRotation(context, {
      enabled: true,
      speedDegPerSec: 45,
      direction: 'counterclockwise',
    });
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
      fadeFrom: '#00032e',
      fadeTo: '#000000',
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
      this.prolog.start(geometry, { fastForward: true });
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

  setStageRotationConfig(config = {}) {
    if (!this.prolog || typeof this.prolog.setStageRotation !== 'function') return;
    this.prolog.setStageRotation(config);
  }

  isPrologActive() {
    if (!this.prolog || !this._prologShown) return false;
    return this.prolog.isActive();
  }

  getPrologObstacles() {
    if (!this.prolog || !this._prologShown) return [];
    return this.prolog.getObstacles();
  }

  getBackgroundColor() {
    if (this.prolog && this._prologShown && !this.prolog.isComplete()) {
      const stageColor = super.getBackgroundColor();
      if (typeof this.prolog.getBackgroundColor === 'function') {
        return this.prolog.getBackgroundColor({
          fromColor: STAGE2_FINAL_BACKGROUND,
          toColor: stageColor,
        });
      }
      return STAGE2_FINAL_BACKGROUND;
    }
    return super.getBackgroundColor();
  }

  getBackgroundOffset() {
    if (this.prolog && this._prologShown && typeof this.prolog.getBackgroundOffset === 'function') {
      return this.prolog.getBackgroundOffset();
    }
    return super.getBackgroundOffset();
  }

  updateViewport(geometry = {}) {
    if (!this.prolog || typeof this.prolog.updateViewport !== 'function') return;
    const { orbitRadius } = geometry;
    this.prolog.updateViewport({
      ...geometry,
      orbitRadius: Number.isFinite(orbitRadius) ? orbitRadius : null,
    });
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
