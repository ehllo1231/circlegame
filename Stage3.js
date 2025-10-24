import { StageManager, StagePhase } from './StageManager.js';
import { SPAWN, SNOW, STAGE2_PROLOG, STAGE3_PROLOG } from './Config.js';
import { Stage2PrologObstacle } from './Stage2PrologObstacle.js';

export class Stage3Prolog {
  constructor() {
    this.started = false;
    this.completed = false;
    this.elapsed = 0;
    this.geometry = null;
    const cfg = STAGE3_PROLOG ?? {};
    this.totalDurationSec = Number.isFinite(cfg.durationSec) && cfg.durationSec > 0 ? cfg.durationSec : 0;
    this.lightningConfig = cfg.lightning ?? {};
    this.lightningEnabled = this.lightningConfig.enabled !== false;
    this.lightningInterval = Math.max(0.05, Number(this.lightningConfig.intervalSec) || 1.3);
    this.lightningDuration = Math.max(0.01, Number(this.lightningConfig.flashDurationSec) || 0.22);
    this.lightningFadeExp = Math.max(0.1, Number(this.lightningConfig.fadeExponent) || 1.6);
    this.obstacles = [];
    this.lightnings = [];
    this.lightningTimer = 0;
    this.centerX = 0;
    this.centerY = 0;
  }

  start(geometry) {
    const cfg = STAGE3_PROLOG ?? {};
    this.totalDurationSec = Number.isFinite(cfg.durationSec) && cfg.durationSec > 0 ? cfg.durationSec : 0;
    this.lightningConfig = cfg.lightning ?? this.lightningConfig ?? {};
    this.lightningEnabled = this.lightningConfig.enabled !== false;
    this.lightningInterval = Math.max(0.05, Number(this.lightningConfig.intervalSec) || 1.3);
    this.lightningDuration = Math.max(0.01, Number(this.lightningConfig.flashDurationSec) || 0.22);
    this.lightningFadeExp = Math.max(0.1, Number(this.lightningConfig.fadeExponent) || 1.6);
    this.started = true;
    this.completed = false;
    this.elapsed = 0;
    this.geometry = geometry || null;
    this._buildObstacles();
    this.lightnings.length = 0;
    this.lightningTimer = 0;
    if (this.lightningEnabled) {
      this._spawnLightning();
    }
  }

  update(dt = 0) {
    if (!this.started) return;
    if (!this.completed && this.lightningEnabled) {
      this.lightningTimer += dt;
      while (this.lightningTimer >= this.lightningInterval) {
        this.lightningTimer -= this.lightningInterval;
        this._spawnLightning();
        if (!this.lightningEnabled) break;
      }
    }
    if (this.lightningEnabled && this.lightnings.length > 0) {
      for (let i = this.lightnings.length - 1; i >= 0; i -= 1) {
        const bolt = this.lightnings[i];
        bolt.life -= dt;
        if (bolt.life <= 0) {
          this.lightnings.splice(i, 1);
        }
      }
    }
    if (!this.completed) {
      this.elapsed += dt;
      if (this.totalDurationSec <= 0 || this.elapsed >= this.totalDurationSec) {
        this.completed = true;
      }
    }
  }

  draw(ctx) {
    if (!ctx || !this.lightningEnabled || this.lightnings.length === 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const bolt of this.lightnings) {
      const alpha = Math.max(0, Math.min(1, bolt.life / bolt.maxLife));
      const faded = Math.pow(alpha, this.lightningFadeExp);
      ctx.globalAlpha = faded;
      ctx.strokeStyle = bolt.color;
      ctx.lineWidth = bolt.width;
      const pts = bolt.points;
      if (!pts || pts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
    }
    ctx.restore();
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
    return { x: 0, y: 0 };
  }

  getTotalDuration() {
    return this.totalDurationSec ?? 0;
  }

  _buildObstacles() {
    const geom = this.geometry || {};
    const orbitRadius = Number.isFinite(geom.orbitRadius) ? geom.orbitRadius : null;
    const centerX = Number.isFinite(geom.centerX) ? geom.centerX : 0;
    const centerY = Number.isFinite(geom.centerY) ? geom.centerY : 0;

    const spikeCfg = STAGE2_PROLOG?.spike ?? {};
    const length = typeof spikeCfg.length === 'number' ? spikeCfg.length : 37.5;
    const width = typeof spikeCfg.width === 'number' ? spikeCfg.width : 24;
    const color = typeof spikeCfg.color === 'string' ? spikeCfg.color : '#ff2d2d';

    const rotationRad = Number.isFinite(STAGE2_PROLOG?.rotationAngleRad)
      ? STAGE2_PROLOG.rotationAngleRad
      : ((Number.isFinite(STAGE2_PROLOG?.rotationAngleDeg)
          ? STAGE2_PROLOG.rotationAngleDeg
          : 90) * Math.PI / 180);

    const baseAngle = -Math.PI / 2;
    const primaryAngle = baseAngle + rotationRad;
    const secondaryAngle = baseAngle - rotationRad;
    const radius = Number.isFinite(orbitRadius) ? orbitRadius : (geom.orbitRadius ?? 0);

    const baseParams = {
      radius,
      baseWidth: width,
      length,
      color,
      pointOutward: true,
    };

    const primary = new Stage2PrologObstacle({ ...baseParams, angle: primaryAngle });
    const secondary = new Stage2PrologObstacle({ ...baseParams, angle: secondaryAngle });

    const maskRadius = Number.isFinite(orbitRadius) ? orbitRadius : null;
    primary.setMaskRadius(maskRadius);
    secondary.setMaskRadius(maskRadius);
    primary.ignoreCollision = false;
    secondary.ignoreCollision = false;

    this.obstacles = [primary, secondary];
    this.centerX = centerX;
    this.centerY = centerY;
  }

  disableLightning() {
    this.lightningEnabled = false;
    if (Array.isArray(this.lightnings)) {
      this.lightnings.length = 0;
    }
    this.lightningTimer = 0;
  }

  _spawnLightning() {
    if (!this.lightningEnabled || !Array.isArray(this.obstacles) || this.obstacles.length === 0) return;
    const segments = Math.max(2, Math.round(Number(this.lightningConfig.segments) || 6));
    const jitter = Math.max(0, Number(this.lightningConfig.forkJitter) || 36);
    const spawnDistance = Number.isFinite(this.lightningConfig.spawnDistance)
      ? this.lightningConfig.spawnDistance
      : 220;
    const color = typeof this.lightningConfig.color === 'string' ? this.lightningConfig.color : '#ffd860';
    const width = Math.max(1, Number(this.lightningConfig.strokeWidth) || 3);

    for (const obstacle of this.obstacles) {
      if (!obstacle) continue;
      const angle = obstacle.angle ?? 0;
      const baseRadius = obstacle.radius ?? 0;
      const length = obstacle.length ?? 0;
      const tipRadius = baseRadius - length;
      const startRadius = baseRadius + Math.max(0, spawnDistance);
      const start = this._pointOnAngle(angle, startRadius);
      const end = this._pointOnAngle(angle, tipRadius);
      if (!Number.isFinite(start.x) || !Number.isFinite(start.y) || !Number.isFinite(end.x) || !Number.isFinite(end.y)) {
        continue;
      }
      const points = [start];
      for (let i = 1; i < segments; i += 1) {
        const t = i / segments;
        const lerpX = start.x + (end.x - start.x) * t;
        const lerpY = start.y + (end.y - start.y) * t;
        const falloff = 1 - t;
        const offsetX = (Math.random() * 2 - 1) * jitter * falloff;
        const offsetY = (Math.random() * 2 - 1) * jitter * falloff;
        points.push({ x: lerpX + offsetX, y: lerpY + offsetY });
      }
      points.push(end);
      this.lightnings.push({
        points,
        color,
        width,
        life: this.lightningDuration,
        maxLife: this.lightningDuration,
      });
    }
  }

  _pointOnAngle(angle, radius) {
    const r = Number.isFinite(radius) ? radius : 0;
    return {
      x: this.centerX + Math.cos(angle) * r,
      y: this.centerY + Math.sin(angle) * r,
    };
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
      fadeFrom: '#00032e',
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
      if (typeof this.prolog.disableLightning === 'function') {
        this.prolog.disableLightning();
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
