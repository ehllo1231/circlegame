import { StageManager, StagePhase } from './StageManager.js';
import { SPAWN, SNOW, STAGE2_PROLOG } from './Config.js';
import { Stage2PrologObstacle } from './Stage2PrologObstacle.js';

export class Stage2Prolog {
  constructor() {
    this.started = false;
    this.completed = false;
    this.elapsed = 0;
    this.obstacles = [];
    this.geometry = null;
    this._applyConfig();
    this._startRadius = 0;
    this._endRadius = 0;
  }

  start(geometry) {
    this._applyConfig();
    this.started = true;
    this.completed = false;
    this.elapsed = 0;
    this.geometry = geometry || null;
    this._buildObstacles();
  }

  update(dt = 0) {
    if (!this.started || this.completed) return;
    this.elapsed += dt;
    const duration = this.durationSec > 0 ? this.durationSec : 1;
    const progress = Math.max(0, Math.min(1, this.elapsed / duration));
    const currentRadius = this._startRadius + (this._endRadius - this._startRadius) * progress;
    if (Array.isArray(this.obstacles)) {
      for (const obstacle of this.obstacles) {
        if (obstacle && typeof obstacle.setRadius === 'function') {
          obstacle.setRadius(currentRadius);
        } else if (obstacle) {
          obstacle.radius = currentRadius;
        }
        if (obstacle && typeof obstacle.update === 'function') {
          obstacle.update(dt);
        }
      }
    }
    if (this.elapsed >= duration) {
      this.completed = true;
      this.obstacles = [];
    }
  }

  draw(ctx, geometry) {
    if (!ctx || !this.isActive()) return;
    const { centerX, centerY, orbitRadius } = geometry || {};
    if (typeof centerX !== 'number' || typeof centerY !== 'number' || typeof orbitRadius !== 'number') return;
    const obstacles = this.getObstacles();
    for (const obstacle of obstacles) {
      if (obstacle && typeof obstacle.draw === 'function') {
        obstacle.draw(ctx, centerX, centerY);
      }
    }
  }

  isComplete() {
    return this.completed;
  }

  isActive() {
    return this.started && !this.completed;
  }

  getObstacles() {
    return this.isActive() && Array.isArray(this.obstacles) ? this.obstacles : [];
  }

  _buildObstacles() {
    const geom = this.geometry;
    if (!geom) {
      this.obstacles = [];
      return;
    }
    const { orbitRadius } = geom;
    if (typeof orbitRadius !== 'number') {
      this.obstacles = [];
      return;
    }
    this._startRadius = orbitRadius * this.radiusStartFactor;
    this._endRadius = orbitRadius * this.radiusEndFactor;
    const baseParams = {
      angle: -Math.PI / 2,
      radius: this._startRadius,
      baseWidth: this.spikeWidth,
      length: this.spikeLength,
      color: this.spikeColor,
      pointOutward: true,
    };
    const primary = new Stage2PrologObstacle(baseParams);
    const secondary = new Stage2PrologObstacle({ ...baseParams });
    this.obstacles = [primary, secondary];
  }

  _applyConfig() {
    const cfg = STAGE2_PROLOG ?? {};
    const spikeCfg = cfg.spike ?? {};
    const duration = typeof cfg.durationSec === 'number' && cfg.durationSec > 0 ? cfg.durationSec : 1;
    this.durationSec = duration;
    this.spikeLength = typeof spikeCfg.length === 'number' ? spikeCfg.length : 37.5;
    this.spikeWidth = typeof spikeCfg.width === 'number' ? spikeCfg.width : 24;
    this.spikeColor = typeof spikeCfg.color === 'string' ? spikeCfg.color : '#ff2d2d';
    const startFactor = Number.isFinite(cfg.radiusStartFactor) ? cfg.radiusStartFactor : 0.6;
    const endFactor = Number.isFinite(cfg.radiusEndFactor) ? cfg.radiusEndFactor : 1.0;
    this.radiusStartFactor = startFactor;
    this.radiusEndFactor = endFactor;
  }
}

class Stage2Phase1 extends StagePhase {
  constructor() {
    super({ name: 'stage2-phase1', durationSec: 12 });
  }

  onEnter() {
    SPAWN.baseInterval = 24;
    SPAWN.multiCountWeights = [0.08, 0.1, 0.15, 0.2, 0.2, 0.17, 0.07, 0.03];
    SNOW.spawnPerMin = 400;
    SNOW.fallSpeed.min = 1.2;
    SNOW.fallSpeed.max = 2.6;
    SNOW.wind.baseX = 0.4;
    SNOW.wind.oscAmp = 0.2;
  }
}

class Stage2Phase2 extends StagePhase {
  constructor() {
    super({ name: 'stage2-phase2', durationSec: 18 });
  }

  onEnter() {
    SPAWN.baseInterval = 18;
    SPAWN.multiCountWeights = [0.02, 0.04, 0.12, 0.2, 0.22, 0.2, 0.15, 0.05];
    SNOW.spawnPerMin = 1400;
    SNOW.fallSpeed.min = 2.4;
    SNOW.fallSpeed.max = 4.2;
    SNOW.wind.baseX = 1.6;
    SNOW.wind.oscAmp = 0.35;
  }
}

class Stage2Phase3 extends StagePhase {
  constructor() {
    super({ name: 'stage2-phase3', durationSec: 22 });
  }

  onEnter() {
    SPAWN.baseInterval = 14;
    SPAWN.multiCountWeights = [0.0, 0.02, 0.1, 0.18, 0.22, 0.23, 0.18, 0.07];
    SNOW.spawnPerMin = 3200;
    SNOW.fallSpeed.min = 3.5;
    SNOW.fallSpeed.max = 6.5;
    SNOW.wind.baseX = -2.4;
    SNOW.wind.oscAmp = 0.5;
  }
}

class Stage2Phase4 extends StagePhase {
  constructor() {
    super({ name: 'stage2-phase4', durationSec: 14 });
  }

  onEnter() {
    SPAWN.baseInterval = 10;
    SPAWN.multiCountWeights = [0.0, 0.01, 0.07, 0.18, 0.2, 0.24, 0.2, 0.1];
    SNOW.spawnPerMin = 7000;
    SNOW.fallSpeed.min = 6.5;
    SNOW.fallSpeed.max = 10.5;
    SNOW.wind.baseX = -5.5;
    SNOW.wind.oscAmp = 0.65;
  }
}

export class Stage2 extends StageManager {
  constructor() {
    super({
      phases: [
        new Stage2Phase1(),
        new Stage2Phase2(),
        new Stage2Phase3(),
        new Stage2Phase4(),
      ],
      fadeFrom: '#0f0020',
      fadeTo: '#200040',
      fadeDelaySec: 2,
      fadeDurationSec: 2,
      hideScoreDurationSec: 2,
    });

    this.prolog = new Stage2Prolog();
    this._prologShown = false;
  }

  update(secondsElapsed) {
    const prologDuration = this.prolog ? Math.max(0, this.prolog.durationSec || 0) : 0;
    if (secondsElapsed < prologDuration) {
      this.totalElapsed = 0;
      this.changed = false;
      return;
    }
    const effectiveElapsed = Math.max(0, secondsElapsed - prologDuration);
    super.update(effectiveElapsed);
  }

  drawProlog(ctx, geometry) {
    if (!this.prolog || !this._prologShown || typeof this.prolog.draw !== 'function') return;
    this.prolog.draw(ctx, geometry);
  }

  startProlog(geometry) {
    if (!this.prolog || typeof this.prolog.start !== 'function') return;
    if (this._prologShown) return;
    this._prologShown = true;
    this.prolog.start(geometry);
  }

  updateProlog(dtSeconds) {
    if (!this.prolog || !this._prologShown || typeof this.prolog.update !== 'function') return;
    this.prolog.update(dtSeconds);
  }

  isPrologActive() {
    if (!this._prologShown || !this.prolog) return false;
    return this.prolog.isActive();
  }

  getPrologObstacles() {
    if (!this.prolog || !this._prologShown) return [];
    return this.prolog.getObstacles();
  }
}

export const STAGE2_PHASES = {
  Stage2Prolog,
  Stage2Phase1,
  Stage2Phase2,
  Stage2Phase3,
  Stage2Phase4,
};
