import { StageManager, StagePhase } from './StageManager.js';
import { SPAWN, SNOW } from './Config.js';
import { Stage2PrologObstacle } from './Stage2PrologObstacle.js';

export class Stage2Prolog {
  constructor() {
    this.started = false;
    this.completed = false;
    this.primaryColor = '#ff2d2d';
    this.secondaryColor = '#ff5c5c';
    this.spikeLength = 64;
    this.spikeWidth = 26;
    this.angleOffset = 0.04; // radians
    this.elapsed = 0;
    this.duration = 1; // seconds
    this.obstacles = [];
    this.geometry = null;
  }

  start(geometry) {
    this.started = true;
    this.completed = false;
    this.elapsed = 0;
    this.geometry = geometry || null;
    this._buildObstacles();
  }

  update(dt = 0) {
    if (!this.started || this.completed) return;
    this.elapsed += dt;
    if (Array.isArray(this.obstacles)) {
      for (const obstacle of this.obstacles) {
        if (obstacle && typeof obstacle.update === 'function') {
          obstacle.update(dt);
        }
      }
    }
    if (this.elapsed >= this.duration) {
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
    const baseRadius = orbitRadius * (4 / 5);
    const primary = new Stage2PrologObstacle({
      angle: -Math.PI / 2,
      radius: baseRadius,
      baseWidth: this.spikeWidth,
      length: this.spikeLength,
      color: this.primaryColor,
    });
    const secondary = new Stage2PrologObstacle({
      angle: -Math.PI / 2 + this.angleOffset,
      radius: baseRadius,
      baseWidth: this.spikeWidth * 0.9,
      length: this.spikeLength * 0.9,
      color: this.secondaryColor,
    });
    this.obstacles = [primary, secondary];
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
