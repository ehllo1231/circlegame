import { STAGE2_PROLOG, STAGE3_PROLOG, ORBIT } from './Config.js';
import { Stage2PrologObstacle } from './Stage2PrologObstacle.js';
import { Stage3PrologBackgroundFade } from './Effects/Stage3PrologBackgroundFade.js';
import { Stage3PrologSpikeRotator } from './Effects/Stage3PrologSpikeRotator.js';
import { Stage3PrologLightningEffect } from './Effects/Stage3PrologLightning.js';

export class Stage3Prolog {
  constructor() {
    this.started = false;
    this.completed = false;
    this.geometry = null;

    this.obstacles = [];
    this.centerX = 0;
    this.centerY = 0;
    this.viewWidth = null;
    this.viewHeight = null;

    this.backgroundFade = new Stage3PrologBackgroundFade();
    this.spikeRotator = new Stage3PrologSpikeRotator();
    this.lightningEffect = new Stage3PrologLightningEffect();

    this.stageRotationEnabled = false;
    this.stageRotationSpeedRadPerSec = 0;
    this.stageRotationDirection = -1;

    this.totalDurationSec = 0;
    this.lightningStrikeCount = 1;
    this.lightningStrikesCompleted = 0;
    this.lightningActive = false;
    this.lightningDelaySec = 0;
    this.lightningDelayRemaining = 0;

    this._applyConfig(STAGE3_PROLOG ?? {});
    this.scale = 1;
    this.backgroundFadeStarted = false;
  }

  start(geometry, { fastForward = false } = {}) {
    if (this.started) return;
    this._applyConfig(STAGE3_PROLOG ?? {});
    this.started = true;
    this.completed = false;
    this.geometry = geometry || null;
    this._applyGeometry(geometry);
    this._buildObstacles();
    this._syncControllers();

    this.backgroundFade.reset();
    this.backgroundFadeStarted = false;
    this.spikeRotator.reset();
    this.lightningEffect.reset();
    this.lightningStrikesCompleted = 0;
    this.lightningActive = false;
    this.lightningDelayRemaining = 0;

    if (fastForward) {
      this._fastForward();
    } else {
      this._maybeStartNextLightning();
    }
  }

  update(dtSeconds = 0) {
    if (!this.started) return;
    const dt = Number.isFinite(dtSeconds) && dtSeconds > 0 ? dtSeconds : 0;

    if (!this.completed) {
      if (!this.lightningActive && this.lightningStrikesCompleted < this.lightningStrikeCount) {
        if (this.lightningDelayRemaining > 0) {
          this.lightningDelayRemaining = Math.max(0, this.lightningDelayRemaining - dt);
        }
      }
      if (!this.lightningActive) {
        this._maybeStartNextLightning();
      }
      if (this.lightningActive && !this.lightningEffect.isComplete()) {
        this.lightningEffect.update(dt);
      }
      if (this.lightningActive && this.lightningEffect.isComplete()) {
        this.lightningActive = false;
        this.lightningStrikesCompleted += 1;
        this.lightningDelayRemaining = this._getStrikeDelay();
      }

      const allLightningDone = this.lightningStrikesCompleted >= this.lightningStrikeCount;

      if (allLightningDone && !this.backgroundFadeStarted) {
        this.backgroundFade.start();
        this.backgroundFadeStarted = true;
      }

      if (this.backgroundFadeStarted) {
        this.backgroundFade.update(dt);
      }
      if (!this.spikeRotator.hasStarted() && this.backgroundFade.isComplete()) {
        this.spikeRotator.start();
      }
      this.spikeRotator.update(dt);

      const fadeDone = this.backgroundFade.isComplete();
      const rotationDone = this.spikeRotator.isComplete();
      if (fadeDone && rotationDone && allLightningDone) {
        this.completed = true;
      }
    }

    this._updateStageRotation(dt);
  }

  draw(ctx) {
    if (!ctx) return;
    if (this.lightningActive) {
      this.lightningEffect.draw(ctx);
    }
  }

  isComplete() {
    return this.started && this.completed;
  }

  isActive() {
    return this.started && !this.completed;
  }

  getObstacles() {
    if (!this.started) return [];
    return Array.isArray(this.obstacles) ? this.obstacles : [];
  }

  getBackgroundOffset() {
    return { x: 0, y: 0 };
  }

  getBackgroundColor({
    fromColor = '#000000',
    toColor = '#000000',
  } = {}) {
    return this.backgroundFade.getColor(fromColor, toColor);
  }

  getTotalDuration() {
    return this.totalDurationSec ?? 0;
  }

  updateViewport(geometry = {}) {
    if (!this.started) return;
    this._applyGeometry(geometry);
    const width = (this._spikeBaseWidth ?? 24) * this.scale;
    const length = (this._spikeBaseLength ?? 37.5) * this.scale;
    if (this.lightningEffect) {
      this.lightningEffect.setViewport({
        viewWidth: this.viewWidth,
        viewHeight: this.viewHeight,
      });
    }
    if (Array.isArray(this.obstacles)) {
      const maskRadius = Number.isFinite(geometry.orbitRadius) ? geometry.orbitRadius : null;
      for (const obstacle of this.obstacles) {
        if (!obstacle) continue;
        if (typeof obstacle.setMaskRadius === 'function') {
          obstacle.setMaskRadius(maskRadius);
        }
        obstacle.baseWidth = width;
        obstacle.length = length;
      }
    }
    if (!this.completed) {
      this.spikeRotator.attachObstacles(this.obstacles);
    }
  }

  setStageRotation(config = {}) {
    const enabled = config?.enabled !== false;
    let rawSpeedRad = Number(config?.speedRadPerSec);
    let derivedDirection = null;

    if (Number.isFinite(rawSpeedRad) && rawSpeedRad !== 0) {
      derivedDirection = rawSpeedRad > 0 ? 1 : -1;
      rawSpeedRad = Math.abs(rawSpeedRad);
    } else {
      const speedDeg = Number(config?.speedDegPerSec);
      if (Number.isFinite(speedDeg) && speedDeg !== 0) {
        derivedDirection = speedDeg > 0 ? 1 : -1;
        rawSpeedRad = Math.abs(speedDeg) * (Math.PI / 180);
      } else {
        rawSpeedRad = 0;
      }
    }

    const directionOverride = this._normalizeDirection(config?.direction);
    if (directionOverride != null) {
      derivedDirection = directionOverride;
    }

    if (!Number.isFinite(rawSpeedRad) || rawSpeedRad <= 0 || !enabled) {
      this.stageRotationEnabled = false;
      this.stageRotationSpeedRadPerSec = 0;
      return;
    }

    this.stageRotationEnabled = true;
    this.stageRotationSpeedRadPerSec = rawSpeedRad;
    this.stageRotationDirection = derivedDirection ?? -1;
  }

  fastForward() {
    if (!this.started) return;
    this._fastForward();
  }

  _fastForward() {
    if (!this.lightningActive && this.lightningStrikesCompleted < this.lightningStrikeCount) {
      this._maybeStartNextLightning();
    }
    this.lightningEffect.fastForward();
    this.lightningStrikesCompleted = this.lightningStrikeCount;
    this.lightningActive = false;
    this.lightningDelayRemaining = 0;
    if (!this.backgroundFadeStarted && !this.backgroundFade.hasStarted()) {
      this.backgroundFade.start();
    }
    this.backgroundFadeStarted = true;
    this.backgroundFade.fastForward();
    this.spikeRotator.fastForward();
    this.completed = true;
  }

  _applyConfig(config) {
    const cfg = config ?? {};
    this.backgroundFade.configure(cfg.backgroundFade);
    this.spikeRotator.configure(cfg.spikeRotation);
    this.lightningEffect.configure(cfg.lightning);
    this.lightningStrikeCount = this._sanitizeStrikeCount(cfg?.lightning?.strikeCount);
    this.lightningDelaySec = this._sanitizeDelay(cfg?.lightning?.strikeDelaySec);
    this._recomputeTotalDuration();
  }

  _applyGeometry(geometry = {}) {
    const geom = geometry || {};
    this.centerX = Number.isFinite(geom.centerX) ? geom.centerX : this.centerX;
    this.centerY = Number.isFinite(geom.centerY) ? geom.centerY : this.centerY;
    this.viewWidth = Number.isFinite(geom.viewWidth) ? geom.viewWidth : this.viewWidth;
    this.viewHeight = Number.isFinite(geom.viewHeight) ? geom.viewHeight : this.viewHeight;
    this.scale = this._resolveScale(geom);
  }

  _buildObstacles() {
    const geom = this.geometry || {};
    const orbitRadius = Number.isFinite(geom?.orbitRadius) ? geom.orbitRadius : null;
    const centerX = Number.isFinite(geom?.centerX) ? geom.centerX : 0;
    const centerY = Number.isFinite(geom?.centerY) ? geom.centerY : 0;

    const spikeCfg = STAGE2_PROLOG?.spike ?? {};
    const baseLength = typeof spikeCfg.length === 'number' ? spikeCfg.length : 37.5;
    const baseWidth = typeof spikeCfg.width === 'number' ? spikeCfg.width : 24;
    this._spikeBaseLength = baseLength;
    this._spikeBaseWidth = baseWidth;
    const length = baseLength * this.scale;
    const width = baseWidth * this.scale;
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

  _syncControllers() {
    this.spikeRotator.attachObstacles(this.obstacles);
  }

  _recomputeTotalDuration() {
    const fadeDuration = Number.isFinite(this.backgroundFade.durationSec)
      ? Math.max(0, this.backgroundFade.durationSec)
      : 0;
    const rotationDuration = this.spikeRotator.getTotalDuration();
    const lightningDurationPerStrike = this.lightningEffect.getTotalDuration();
    const lightningDuration = lightningDurationPerStrike * Math.max(1, this.lightningStrikeCount);
    const delayDuration = Math.max(0, this.lightningStrikeCount - 1) * this.lightningDelaySec;
    this.totalDurationSec = Math.max(0, fadeDuration + rotationDuration + lightningDuration + delayDuration);
  }

  _normalizeDirection(direction) {
    if (direction == null) return null;
    if (typeof direction === 'number') {
      if (direction > 0) return 1;
      if (direction < 0) return -1;
      return null;
    }
    if (typeof direction === 'string') {
      const token = direction.trim().toLowerCase();
      if (token === 'counterclockwise' || token === 'counter-clockwise' || token === 'ccw' || token === 'anticlockwise') {
        return 1;
      }
      if (token === 'clockwise' || token === 'cw') {
        return -1;
      }
    }
    return null;
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

  _updateStageRotation(dtSeconds) {
    if (!this.stageRotationEnabled) return;
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    if (!this.completed) return;
    if (!Array.isArray(this.obstacles) || this.obstacles.length === 0) return;
    const delta = this.stageRotationSpeedRadPerSec * this.stageRotationDirection * dtSeconds;
    if (delta === 0) return;
    for (const obstacle of this.obstacles) {
      if (!obstacle) continue;
      const current = Number.isFinite(obstacle.angle) ? obstacle.angle : 0;
      obstacle.angle = current + delta;
    }
  }

  _maybeStartNextLightning() {
    if (!this.lightningEffect) return;
    if (this.lightningActive) return;
    if (this.lightningStrikesCompleted >= this.lightningStrikeCount) return;
    if (this.lightningDelayRemaining > 1e-4) return;
    this.lightningEffect.reset();
    const targets = this._resolveSpikeTargets();
    this.lightningEffect.setViewport({
      viewWidth: this.viewWidth,
      viewHeight: this.viewHeight,
    });
    this.lightningEffect.start({
      leftTarget: targets.left,
      rightTarget: targets.right,
      viewWidth: this.viewWidth,
      viewHeight: this.viewHeight,
      centerY: this.centerY,
    });
    this.lightningActive = true;
  }

  _resolveSpikeTargets() {
    if (!Array.isArray(this.obstacles) || this.obstacles.length === 0) {
      return { left: null, right: null };
    }
    const points = [];
    for (const obstacle of this.obstacles) {
      if (!obstacle) continue;
      const angle = Number.isFinite(obstacle.angle) ? obstacle.angle : 0;
      const radius = Number.isFinite(obstacle.radius) ? obstacle.radius : 0;
      const length = Number.isFinite(obstacle.length) ? obstacle.length : 0;
      const tipRadius = radius - length;
      const x = this.centerX + tipRadius * Math.cos(angle);
      const y = this.centerY + tipRadius * Math.sin(angle);
      points.push({ x, y });
    }
    if (points.length === 0) {
      return { left: null, right: null };
    }
    points.sort((a, b) => a.x - b.x);
    const left = points[0];
    const right = points.length > 1 ? points[points.length - 1] : null;
    return { left, right };
  }

  _sanitizeStrikeCount(count) {
    if (!Number.isFinite(count)) return 1;
    const n = Math.floor(count);
    if (n < 1) return 1;
    if (n > 10) return 10;
    return n;
  }

  _sanitizeDelay(delay) {
    const value = Number(delay);
    if (!Number.isFinite(value) || value < 0) return 0;
    if (value > 5) return 5;
    return value;
  }

  _getStrikeDelay() {
    return this.lightningDelaySec;
  }
}
