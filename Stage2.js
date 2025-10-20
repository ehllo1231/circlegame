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
    this._baseAngle = -Math.PI / 2;
    this.radiusDurationSec = 0;
    this.pauseDurationSec = 0;
    this.rotationDurationSec = 0;
    this.totalDurationSec = 0;
    this.tremorEnabled = false;
    this.tremorAmplitude = 0;
    this.tremorFrequencyHz = 0;
    this.tremorAxisScaleY = 0.6;
    this._tremorAngularSpeed = 0;
    this._tremorPhaseOffset = 0;
    this._backgroundOffset = { x: 0, y: 0 };
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
    this._backgroundOffset.x = 0;
    this._backgroundOffset.y = 0;
    this._tremorPhaseOffset = Math.random() * Math.PI * 2;
    this._buildObstacles();
  }

  update(dt = 0) {
    if (!this.started) return;
    this.elapsed += dt;
    const radiusDuration = this.radiusDurationSec > 0 ? this.radiusDurationSec : 0;
    const pauseDuration = this.pauseDurationSec > 0 ? this.pauseDurationSec : 0;
    const rotationDuration = this.rotationDurationSec > 0 ? this.rotationDurationSec : 0;
    const totalDuration = this.totalDurationSec > 0
      ? this.totalDurationSec
      : (radiusDuration + pauseDuration + rotationDuration);
    const cappedElapsed = Math.max(0, Math.min(this.elapsed, totalDuration));

    let radiusProgress = 1;
    if (radiusDuration > 0) {
      const radiusElapsed = Math.min(cappedElapsed, radiusDuration);
      radiusProgress = Math.max(0, Math.min(1, radiusElapsed / radiusDuration));
    }

    let rotationProgress = 0;
    const afterRadius = Math.max(0, cappedElapsed - radiusDuration);
    if (afterRadius > pauseDuration) {
      const rotationElapsed = Math.max(0, afterRadius - pauseDuration);
      rotationProgress = rotationDuration > 0
        ? Math.max(0, Math.min(1, rotationElapsed / rotationDuration))
        : (radiusProgress >= 1 ? 1 : 0);
    }
    if (rotationDuration <= 0 && radiusProgress >= 1) {
      rotationProgress = 1;
    }

    let offsetX = 0;
    let offsetY = 0;
    if (this.tremorEnabled && radiusDuration > 0 && radiusProgress < 1) {
      const timeInRadius = Math.max(0, Math.min(cappedElapsed, radiusDuration));
      const phase = this._tremorAngularSpeed * timeInRadius + this._tremorPhaseOffset;
      const amplitude = this.tremorAmplitude;
      offsetX = Math.sin(phase) * amplitude;
      const secondaryPhase = phase * 1.3 + Math.PI * 0.25;
      offsetY = Math.sin(secondaryPhase) * amplitude * this.tremorAxisScaleY;
    }
    this._backgroundOffset.x = offsetX;
    this._backgroundOffset.y = offsetY;

    const currentRadius = this._startRadius + (this._endRadius - this._startRadius) * radiusProgress;
    this._applyRotation(rotationProgress);
    if (Array.isArray(this.obstacles)) {
      for (const obstacle of this.obstacles) {
        if (obstacle && typeof obstacle.setRadius === 'function') {
          obstacle.setRadius(currentRadius);
        } else if (obstacle) {
          obstacle.radius = currentRadius;
        }
        if (!this.completed && obstacle && typeof obstacle.update === 'function') {
          obstacle.update(dt);
        }
      }
    }
    if (!this.completed && this.elapsed >= totalDuration) {
      this.completed = true;
      this._backgroundOffset.x = 0;
      this._backgroundOffset.y = 0;
    }
  }

  draw(ctx, geometry) {
    if (!ctx) return;
    const { centerX, centerY, orbitRadius } = geometry || {};
    if (typeof centerX !== 'number' || typeof centerY !== 'number' || typeof orbitRadius !== 'number') return;
    const obstacles = Array.isArray(this.obstacles) ? this.obstacles : [];
    if (!obstacles.length) return;
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
    return Array.isArray(this.obstacles) ? this.obstacles : [];
  }

  getBackgroundOffset() {
    return {
      x: this._backgroundOffset.x,
      y: this._backgroundOffset.y,
    };
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
      angle: this._baseAngle,
      radius: this._startRadius,
      baseWidth: this.spikeWidth,
      length: this.spikeLength,
      color: this.spikeColor,
      pointOutward: true,
    };
    const primary = new Stage2PrologObstacle(baseParams);
    const secondary = new Stage2PrologObstacle({ ...baseParams });
    this.obstacles = [primary, secondary];
    this._applyRotation(0);
  }

  _applyConfig() {
    const cfg = STAGE2_PROLOG ?? {};
    const spikeCfg = cfg.spike ?? {};
    const radiusDuration = typeof cfg.radiusDurationSec === 'number' && cfg.radiusDurationSec > 0 ? cfg.radiusDurationSec : 1;
    const pauseDuration = typeof cfg.pauseBetweenSec === 'number' && cfg.pauseBetweenSec > 0 ? cfg.pauseBetweenSec : 0;
    const rotationDuration = typeof cfg.rotationDurationSec === 'number' && cfg.rotationDurationSec > 0 ? cfg.rotationDurationSec : 1;
    this.radiusDurationSec = radiusDuration;
    this.pauseDurationSec = pauseDuration;
    this.rotationDurationSec = rotationDuration;
    this.totalDurationSec = Math.max(0, radiusDuration) + Math.max(0, pauseDuration) + Math.max(0, rotationDuration);
    const tremorCfg = cfg.tremor ?? {};
    const amplitude = typeof tremorCfg.amplitude === 'number' ? Math.max(0, tremorCfg.amplitude) : 0;
    const frequencyHz = typeof tremorCfg.frequencyHz === 'number' ? Math.max(0, tremorCfg.frequencyHz) : 0;
    this.tremorAxisScaleY = typeof tremorCfg.axisScaleY === 'number' ? tremorCfg.axisScaleY : 0.6;
    this.tremorAmplitude = amplitude;
    this.tremorFrequencyHz = frequencyHz;
    this.tremorEnabled = tremorCfg.enabled !== false && amplitude > 0 && frequencyHz > 0;
    this._tremorAngularSpeed = this.tremorEnabled ? frequencyHz * (Math.PI * 2) : 0;
    this.spikeLength = typeof spikeCfg.length === 'number' ? spikeCfg.length : 37.5;
    this.spikeWidth = typeof spikeCfg.width === 'number' ? spikeCfg.width : 24;
    this.spikeColor = typeof spikeCfg.color === 'string' ? spikeCfg.color : '#ff2d2d';
    const startFactor = Number.isFinite(cfg.radiusStartFactor) ? cfg.radiusStartFactor : 0.6;
    const endFactor = Number.isFinite(cfg.radiusEndFactor) ? cfg.radiusEndFactor : 1.0;
    this.radiusStartFactor = startFactor;
    this.radiusEndFactor = endFactor;
    if (typeof cfg.rotationAngleRad === 'number' && Number.isFinite(cfg.rotationAngleRad)) {
      this.rotationAngleRad = cfg.rotationAngleRad;
    } else {
      const rotationDeg = Number.isFinite(cfg.rotationAngleDeg) ? cfg.rotationAngleDeg : 45;
      this.rotationAngleRad = rotationDeg * (Math.PI / 180);
    }
    if (!Number.isFinite(this.rotationAngleRad)) {
      this.rotationAngleRad = 45 * (Math.PI / 180);
    }
  }

  _applyRotation(progress = 0) {
    if (!Array.isArray(this.obstacles) || this.obstacles.length === 0) return;
    const clamped = Math.max(0, Math.min(1, progress));
    const delta = this.rotationAngleRad * clamped;
    const primary = this.obstacles[0];
    const secondary = this.obstacles[1];
    if (primary) primary.angle = this._baseAngle + delta;
    if (secondary) secondary.angle = this._baseAngle - delta;
  }

  getTotalDuration() {
    return this.totalDurationSec;
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
    const prologDuration = this.prolog && typeof this.prolog.getTotalDuration === 'function'
      ? Math.max(0, this.prolog.getTotalDuration())
      : 0;
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

  getBackgroundOffset() {
    if (this.prolog && this._prologShown && typeof this.prolog.getBackgroundOffset === 'function') {
      const offset = this.prolog.getBackgroundOffset();
      if (offset && typeof offset.x === 'number' && typeof offset.y === 'number') {
        return offset;
      }
    }
    return super.getBackgroundOffset();
  }
}

export const STAGE2_PHASES = {
  Stage2Prolog,
  Stage2Phase1,
  Stage2Phase2,
  Stage2Phase3,
  Stage2Phase4,
};
