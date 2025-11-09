import { STAGE2_PROLOG, STAGE3_PROLOG, ORBIT } from './Config.js';
import { Stage2PrologObstacle } from './Stage2PrologObstacle.js';
import { Stage3PrologLightning } from './Effects/Stage3PrologLightning.js';
import { Stage3PrologBackgroundFade } from './Effects/Stage3PrologBackgroundFade.js';
import { Stage3PrologSpikeRotator } from './Effects/Stage3PrologSpikeRotator.js';

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

    this.lightning = new Stage3PrologLightning();
    this.backgroundFade = new Stage3PrologBackgroundFade();
    this.spikeRotator = new Stage3PrologSpikeRotator();

    this.stageRotationEnabled = false;
    this.stageRotationSpeedRadPerSec = 0;
    this.stageRotationDirection = -1;

    this.totalDurationSec = 0;

    this._applyConfig(STAGE3_PROLOG ?? {});
    this.scale = 1;
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

    this.lightning.start();
    this.backgroundFade.reset();
    if (!this.lightning.isEnabled() || this.lightning.isComplete()) {
      this.backgroundFade.start();
    }
    this.spikeRotator.reset();

    if (fastForward) {
      this._fastForward();
    }
  }

  update(dtSeconds = 0) {
    if (!this.started) return;
    const dt = Number.isFinite(dtSeconds) && dtSeconds > 0 ? dtSeconds : 0;

    if (!this.completed) {
      this.lightning.update(dt);
      if (!this.backgroundFade.hasStarted() && this.lightning.isComplete()) {
        this.backgroundFade.start();
      }

      this.backgroundFade.update(dt);
      if (!this.spikeRotator.hasStarted() && this.backgroundFade.isComplete()) {
        this.spikeRotator.start();
      }
      this.spikeRotator.update(dt);

      const lightningDone = this.lightning.isComplete();
      const fadeDone = this.backgroundFade.isComplete();
      const rotationDone = this.spikeRotator.isComplete();
      if (lightningDone && fadeDone && rotationDone) {
        this.completed = true;
      }
    }

    this._updateStageRotation(dt);
  }

  draw(ctx) {
    if (!ctx) return;
    this.lightning.draw(ctx);
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

  disableLightning() {
    this.lightning.disable();
    if (!this.backgroundFade.hasStarted()) {
      this.backgroundFade.start();
    }
  }

  updateViewport(geometry = {}) {
    if (!this.started) return;
    this._applyGeometry(geometry);
    const width = (this._spikeBaseWidth ?? 24) * this.scale;
    const length = (this._spikeBaseLength ?? 37.5) * this.scale;
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
    this.lightning.setObstacles(this.obstacles);
    this.lightning.setViewport({
      centerX: this.centerX,
      centerY: this.centerY,
      viewWidth: this.viewWidth,
      viewHeight: this.viewHeight,
    });
    if (this.lightning.isEnabled() && !this.completed) {
      this.lightning.reset();
      this.lightning.start();
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
    this.lightning.fastForward();
    if (!this.backgroundFade.hasStarted()) {
      this.backgroundFade.start();
    }
    this.backgroundFade.fastForward();
    this.spikeRotator.fastForward();
    this.completed = true;
  }

  _applyConfig(config) {
    const cfg = config ?? {};
    this.lightning.configure(cfg.lightning);
    this.backgroundFade.configure(cfg.backgroundFade);
    this.spikeRotator.configure(cfg.spikeRotation);
    this._recomputeTotalDuration();
  }

  _applyGeometry(geometry = {}) {
    const geom = geometry || {};
    this.centerX = Number.isFinite(geom.centerX) ? geom.centerX : this.centerX;
    this.centerY = Number.isFinite(geom.centerY) ? geom.centerY : this.centerY;
    this.viewWidth = Number.isFinite(geom.viewWidth) ? geom.viewWidth : this.viewWidth;
    this.viewHeight = Number.isFinite(geom.viewHeight) ? geom.viewHeight : this.viewHeight;
    this.scale = this._resolveScale(geom);
    if (this.lightning && typeof this.lightning.setScale === 'function') {
      this.lightning.setScale(this.scale);
    }
    this.lightning.setViewport({
      centerX: this.centerX,
      centerY: this.centerY,
      viewWidth: this.viewWidth,
      viewHeight: this.viewHeight,
    });
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
    this.lightning.setObstacles(this.obstacles);
    this.spikeRotator.attachObstacles(this.obstacles);
  }

  _recomputeTotalDuration() {
    const lightningDuration = this.lightning.getTotalDuration();
    const fadeDuration = Number.isFinite(this.backgroundFade.durationSec)
      ? Math.max(0, this.backgroundFade.durationSec)
      : 0;
    const rotationDuration = this.spikeRotator.getTotalDuration();
    this.totalDurationSec = Math.max(0, lightningDuration + fadeDuration + rotationDuration);
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
}
