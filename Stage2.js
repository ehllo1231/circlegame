import { StageManager, StagePhase } from './StageManager.js';
import { SPAWN, SNOW, STAGE2_PROLOG, ORBIT } from './Config.js';
import { Stage2PrologObstacle } from './Stage2PrologObstacle.js';
import { Stage2PrologDustEffect } from './Stage2PrologDustEffect.js';

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
    this.collisionSafeDurationSec = 0;
    this.dustEffect = null;
    this._dustConfig = null;
    this._applyConfig();
    this._startRadius = 0;
    this._endRadius = 0;
    this.scale = 1;
  }

  start(geometry) {
    this._applyConfig();
    SNOW.direction = 'up';
    this.started = true;
    this.completed = false;
    this.elapsed = 0;
    this.geometry = geometry || null;
    this.scale = this._resolveScale(this.geometry);
    this._backgroundOffset.x = 0;
    this._backgroundOffset.y = 0;
    this._tremorPhaseOffset = Math.random() * Math.PI * 2;
    this._buildObstacles();
    if (this.dustEffect) {
      this.dustEffect.setGeometry(this.geometry);
      if (typeof this.dustEffect.setScale === 'function') {
        this.dustEffect.setScale(this.scale);
      }
      this.dustEffect.setEmitter(this._getEmitterPosition());
      this.dustEffect.reset();
    }
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

    const currentRadius = this._startRadius + (this._endRadius - this._startRadius) * radiusProgress;

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

    if (this.dustEffect) {
      this.dustEffect.setEmitter(this._getEmitterPosition());
      this.dustEffect.update(dt, {
        active: radiusDuration > 0 && radiusProgress < 1,
        elapsedInRadius: Math.min(cappedElapsed, radiusDuration),
      });
    }
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
    const invulnerable = this.elapsed < this.collisionSafeDurationSec;
    if (Array.isArray(this.obstacles)) {
      for (const obstacle of this.obstacles) {
        if (obstacle) obstacle.ignoreCollision = invulnerable;
      }
    }

    if (!this.completed && this.elapsed >= totalDuration) {
      this.completed = true;
      this._backgroundOffset.x = 0;
      this._backgroundOffset.y = 0;
      if (Array.isArray(this.obstacles)) {
        for (const obstacle of this.obstacles) {
          if (obstacle) obstacle.ignoreCollision = false;
        }
      }
    }
  }

  draw(ctx, geometry) {
    if (!ctx) return;
    if (this.dustEffect) {
      this.dustEffect.draw(ctx);
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
    const width = this.spikeWidth * this.scale;
    const length = this.spikeLength * this.scale;
    const baseParams = {
      angle: this._baseAngle,
      radius: this._startRadius,
      baseWidth: width,
      length,
      color: this.spikeColor,
      pointOutward: true,
    };
    const primary = new Stage2PrologObstacle(baseParams);
    const secondary = new Stage2PrologObstacle({ ...baseParams });
    const invulnerable = this.elapsed < this.collisionSafeDurationSec;
    primary.ignoreCollision = invulnerable;
    secondary.ignoreCollision = invulnerable;
    const orbitMask = Number.isFinite(geom.orbitRadius) ? geom.orbitRadius : null;
    primary.setMaskRadius(orbitMask);
    secondary.setMaskRadius(orbitMask);
    this.obstacles = [primary, secondary];
    this._applyRotation(0);
  }

  _getEmitterPosition() {
    const geom = this.geometry || {};
    const centerX = Number.isFinite(geom.centerX) ? geom.centerX : 0;
    const centerY = Number.isFinite(geom.centerY) ? geom.centerY : 0;
    const orbitRadius = Number.isFinite(geom.orbitRadius) ? geom.orbitRadius : 0;
    const angle = -Math.PI / 2;
    const x = centerX;
    const y = centerY - orbitRadius;
    return { x, y, angle };
  }

  updateViewport(geometry = {}) {
    this.geometry = geometry || this.geometry;
    this.scale = this._resolveScale(this.geometry);
    if (Array.isArray(this.obstacles)) {
      const width = this.spikeWidth * this.scale;
      const length = this.spikeLength * this.scale;
      const orbitRadius = Number.isFinite(this.geometry?.orbitRadius) ? this.geometry.orbitRadius : null;
      for (const obstacle of this.obstacles) {
        if (!obstacle) continue;
        obstacle.baseWidth = width;
        obstacle.length = length;
        if (typeof obstacle.setMaskRadius === 'function') {
          obstacle.setMaskRadius(orbitRadius);
        }
      }
    }
    if (this.dustEffect) {
      this.dustEffect.setGeometry(this.geometry);
      if (typeof this.dustEffect.setScale === 'function') {
        this.dustEffect.setScale(this.scale);
      }
    }
  }

  _resolveScale(geometry) {
    const geom = geometry || {};
    const orbitRadius = Number.isFinite(geom.orbitRadius) ? geom.orbitRadius : null;
    const baseOrbit = typeof ORBIT?.radius === 'number' ? ORBIT.radius : 160;
    if (!Number.isFinite(orbitRadius) || orbitRadius <= 0 || !Number.isFinite(baseOrbit) || baseOrbit <= 0) {
      return 1;
    }
    const ratio = orbitRadius / baseOrbit;
    if (!Number.isFinite(ratio) || ratio <= 0) return 1;
    return ratio;
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
    let safeDuration = radiusDuration;
    if (Object.prototype.hasOwnProperty.call(cfg, 'collisionSafeDurationSec')) {
      const rawSafe = cfg.collisionSafeDurationSec;
      if (typeof rawSafe === 'number' && rawSafe >= 0) {
        safeDuration = rawSafe;
      }
    }
    this.collisionSafeDurationSec = safeDuration;
    const dustCfg = cfg.dust ? JSON.parse(JSON.stringify(cfg.dust)) : {};
    this._dustConfig = dustCfg;
    if (this.dustEffect) {
      this.dustEffect.configure(dustCfg);
    } else {
      this.dustEffect = new Stage2PrologDustEffect({ config: dustCfg });
    }
    if (this.dustEffect && typeof this.dustEffect.setScale === 'function') {
      this.dustEffect.setScale(this.scale);
    }
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
    super({ name: 'stage2-phase1', durationSec: 10 });
  }

  onEnter() {
    SPAWN.baseInterval = 40;
    SPAWN.multiCountWeights = [0.05, 0.1, 0.1, 0.2, 0.2, 0.2, 0.1, 0.05];
    SNOW.direction = 'up';
    SNOW.spawnPerMin = 0;
    SNOW.fallSpeed.min = 0.8;
    SNOW.fallSpeed.max = 2.0;
    SNOW.wind.baseX = 0.12;
    SNOW.wind.oscAmp = 0.1;
  }
}

class Stage2Phase2 extends StagePhase {
  constructor() {
    super({ name: 'stage2-phase2', durationSec: 20 });
  }

  onEnter() {
    SPAWN.baseInterval = 28;
    SPAWN.multiCountWeights = [0.05, 0.07, 0.1, 0.2, 0.2, 0.2, 0.13, 0.05];
    SNOW.direction = 'up';
    SNOW.spawnPerMin = 300;
    SNOW.fallSpeed.min = 0.8;
    SNOW.fallSpeed.max = 2.0;
    SNOW.wind.baseX = -0.12;
    SNOW.wind.oscAmp = 0.1;
  }
}

class Stage2Phase3 extends StagePhase {
  constructor() {
    super({ name: 'stage2-phase3', durationSec: 20 });
  }

  onEnter() {
    SPAWN.baseInterval = 23;
    SPAWN.multiCountWeights = [0.0, 0.02, 0.1, 0.18, 0.22, 0.23, 0.18, 0.07];
    SNOW.direction = 'up';
    SNOW.spawnPerMin = 2000;
    SNOW.fallSpeed.min = 3;
    SNOW.fallSpeed.max = 5;
    SNOW.wind.baseX = 3;
    SNOW.wind.oscAmp = 0.5;
  }
}

class Stage2Phase4 extends StagePhase {
  constructor() {
    super({ name: 'stage2-phase4', durationSec: 10 });
  }

  onEnter() {
    SPAWN.baseInterval = 19;
    SPAWN.multiCountWeights = [0.0, 0.02, 0.1, 0.2, 0.2, 0.25, 0.13, 0.1];
    SNOW.direction = 'up';
    SNOW.spawnPerMin = 6000;
    SNOW.fallSpeed.min = 7.0;
    SNOW.fallSpeed.max = 10;
    SNOW.wind.baseX = 6;
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
      fadeTo: '#000000',
      fadeDelaySec: 2,
      fadeDurationSec: 2,
      hideScoreDurationSec: 2,
    });

    this.prolog = new Stage2Prolog();
    this._prologShown = false;
    this._skipProlog = false;
  }

  update(secondsElapsed) {
    const skipProlog = !!this._skipProlog;
    const prologDuration = (!skipProlog && this.prolog && typeof this.prolog.getTotalDuration === 'function')
      ? Math.max(0, this.prolog.getTotalDuration())
      : 0;
    if (!skipProlog && secondsElapsed < prologDuration) {
      this.totalElapsed = 0;
      this.changed = false;
      return;
    }
    const effectiveElapsed = skipProlog
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
      if (this._prologShown) return;
      this._prologShown = true;
      this.prolog.start(geometry);
      const total = typeof this.prolog.getTotalDuration === 'function'
        ? this.prolog.getTotalDuration()
        : this.prolog.totalDurationSec ?? 0;
      if (Number.isFinite(total) && total > 0) {
        this.prolog.update(total);
      }
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

  updateViewport(geometry = {}) {
    if (this.prolog && typeof this.prolog.updateViewport === 'function') {
      this.prolog.updateViewport(geometry);
    }
  }

  setSkipProlog(skip = false) {
    const shouldSkip = !!skip;
    if (this._skipProlog === shouldSkip) {
      if (shouldSkip) {
        this._prologShown = false;
      }
      return;
    }
    this._skipProlog = shouldSkip;
    this._prologShown = false;
    this.prolog = new Stage2Prolog();
  }
}

export const STAGE2_PHASES = {
  Stage2Prolog,
  Stage2Phase1,
  Stage2Phase2,
  Stage2Phase3,
  Stage2Phase4,
};
