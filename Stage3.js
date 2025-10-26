import { StageManager, StagePhase } from './StageManager.js';
import { SPAWN, SNOW, STAGE2_PROLOG, STAGE3_PROLOG } from './Config.js';
import { Stage2PrologObstacle } from './Stage2PrologObstacle.js';

export class Stage3Prolog {
  constructor() {
    this.started = false;
    this.completed = false;
    this.elapsed = 0;
    this.geometry = null;
    this.lightningConfig = {};
    this.lightningEnabled = true;
    this.lightningInterval = 1.3;
    this.lightningDuration = 0.22;
    this.lightningFadeExp = 1.6;
    this.eventCount = 0;
    this.eventsSpawned = 0;
    this.totalDurationSec = 0;
    this._applyLightningConfig(STAGE3_PROLOG ?? {});
    this.obstacles = [];
    this.lightnings = [];
    this.lightningTimer = 0;
    this.centerX = 0;
    this.centerY = 0;
    this.viewWidth = null;
    this.viewHeight = null;
  }

  start(geometry) {
    this._applyLightningConfig(STAGE3_PROLOG ?? {});
    this.started = true;
    this.completed = false;
    this.elapsed = 0;
    this.geometry = geometry || null;
    this.viewWidth = Number.isFinite(geometry?.viewWidth) ? geometry.viewWidth : null;
    this.viewHeight = Number.isFinite(geometry?.viewHeight) ? geometry.viewHeight : null;
    this._buildObstacles();
    this.lightnings.length = 0;
    this.lightningTimer = 0;
    this.eventsSpawned = 0;
    if (this.lightningEnabled && this.eventCount > 0) {
      this._spawnLightning();
    }
  }

  update(dt = 0) {
    if (!this.started) return;
    if (!this.completed && this.lightningEnabled && this.eventCount > 0) {
      this.lightningTimer += dt;
      while (this.lightningTimer >= this.lightningInterval && this.eventsSpawned < this.eventCount) {
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
      const pts = bolt.points;
      if (!pts || pts.length < 2) continue;

      const head = pts[0];
      const tail = pts[pts.length - 1];
      const gradient = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
      gradient.addColorStop(0, bolt.color);
      gradient.addColorStop(0.55, bolt.coreColor);
      gradient.addColorStop(1, bolt.tailColor);

      ctx.globalAlpha = faded * 0.8;
      ctx.shadowBlur = Math.max(12, bolt.width * 2.2);
      ctx.shadowColor = bolt.color;
      ctx.lineWidth = bolt.width * 1.6;
      ctx.strokeStyle = bolt.color;
      ctx.beginPath();
      ctx.moveTo(head.x, head.y);
      for (let i = 1; i < pts.length; i += 1) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = faded;
      ctx.lineWidth = bolt.width;
      ctx.strokeStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(head.x, head.y);
      for (let i = 1; i < pts.length; i += 1) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      if (Array.isArray(bolt.branches) && bolt.branches.length > 0) {
        for (const branch of bolt.branches) {
          const branchPts = branch.points;
          if (!branchPts || branchPts.length < 2) continue;
          const branchHead = branchPts[0];
          const branchTail = branchPts[branchPts.length - 1];
          const branchGradient = ctx.createLinearGradient(
            branchHead.x,
            branchHead.y,
            branchTail.x,
            branchTail.y,
          );
          branchGradient.addColorStop(0, bolt.coreColor);
          branchGradient.addColorStop(1, bolt.tailColor);

          ctx.globalAlpha = faded * 0.6;
          ctx.lineWidth = branch.width * 1.15;
          ctx.strokeStyle = branchGradient;
          ctx.beginPath();
          ctx.moveTo(branchHead.x, branchHead.y);
          for (let i = 1; i < branchPts.length; i += 1) {
            ctx.lineTo(branchPts[i].x, branchPts[i].y);
          }
          ctx.stroke();
        }
      }
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

  _applyLightningConfig(sourceConfig) {
    const base = sourceConfig ?? {};
    const lightning = base.lightning ?? this.lightningConfig ?? {};
    this.lightningConfig = lightning;
    this.lightningEnabled = lightning.enabled !== false;
    this.eventCount = Math.max(0, Math.floor(Number(lightning.eventCount) || 3));
    this.lightningInterval = Math.max(0.05, Number(lightning.intervalSec) || 1.3);
    this.lightningDuration = Math.max(0.01, Number(lightning.flashDurationSec) || 0.22);
    this.lightningFadeExp = Math.max(0.1, Number(lightning.fadeExponent) || 1.6);
    this.totalDurationSec = this._computeTotalDuration();
    if (this.eventCount <= 0 || !this.lightningEnabled) {
      this.lightningEnabled = false;
      this.totalDurationSec = 0;
    }
  }

  _computeTotalDuration() {
    if (!this.lightningEnabled) return 0;
    if (!Number.isFinite(this.eventCount) || this.eventCount <= 0) return 0;
    const interval = Math.max(0, this.lightningInterval);
    const flash = Math.max(0, this.lightningDuration);
    if (this.eventCount <= 1) {
      return flash;
    }
    return (this.eventCount - 1) * interval + flash;
  }

  disableLightning() {
    this.lightningEnabled = false;
    if (Array.isArray(this.lightnings)) {
      this.lightnings.length = 0;
    }
    this.lightningTimer = 0;
  }

  updateViewport(geometry = {}) {
    const nextCenterX = Number.isFinite(geometry.centerX) ? geometry.centerX : this.centerX;
    const nextCenterY = Number.isFinite(geometry.centerY) ? geometry.centerY : this.centerY;
    const nextViewWidth = Number.isFinite(geometry.viewWidth) ? geometry.viewWidth : this.viewWidth;
    const nextViewHeight = Number.isFinite(geometry.viewHeight) ? geometry.viewHeight : this.viewHeight;
    this.centerX = nextCenterX;
    this.centerY = nextCenterY;
    this.viewWidth = nextViewWidth;
    this.viewHeight = nextViewHeight;

    const maskRadius = Number.isFinite(geometry.orbitRadius) ? geometry.orbitRadius : null;
    if (Array.isArray(this.obstacles)) {
      for (const obstacle of this.obstacles) {
        if (obstacle && typeof obstacle.setMaskRadius === 'function') {
          obstacle.setMaskRadius(maskRadius);
        }
      }
    }

    if (this.lightningEnabled) {
      if (Array.isArray(this.lightnings)) {
        this.lightnings.length = 0;
      }
      this.lightningTimer = 0;
      this._spawnLightning();
    }
  }

  _hasViewportBounds() {
    return Number.isFinite(this.viewWidth) && this.viewWidth > 0;
  }

  _computeEdgeStartPoint({ angle, tip, margin }) {
    if (!tip || !this._hasViewportBounds()) return null;
    const halfWidth = this.viewWidth / 2;
    const offsetSetting = Number.isFinite(this.lightningConfig?.edgeOffset)
      ? Math.max(0, this.lightningConfig.edgeOffset)
      : 0;
    const offset = offsetSetting;
    const direction = Math.cos(angle) >= 0 ? 1 : -1;
    const startX = this.centerX + direction * (halfWidth + offset);

    const dx = tip.x - this.centerX;
    const dy = tip.y - this.centerY;
    let startY;
    if (Math.abs(dx) < 1e-3) {
      startY = tip.y;
    } else {
      const slope = dy / dx;
      startY = tip.y + slope * (startX - tip.x);
    }
    if (!Number.isFinite(startY)) {
      startY = tip.y;
    }

    if (Number.isFinite(this.viewHeight) && this.viewHeight > 0) {
      const halfHeight = this.viewHeight / 2;
      const limit = halfHeight + offset;
      const minY = this.centerY - limit;
      const maxY = this.centerY + limit;
      startY = Math.max(minY, Math.min(maxY, startY));
    }

    const jitter = Math.max(0, Number(this.lightningConfig?.forkJitter) || 0);
    if (jitter > 0) {
      startY += (Math.random() - 0.5) * jitter * 0.6;
    }

    return { x: startX, y: startY };
  }

  _spawnLightning() {
    if (!this.lightningEnabled || this.eventsSpawned >= this.eventCount) return;
    if (!Array.isArray(this.obstacles) || this.obstacles.length === 0) return;
    const segments = Math.max(2, Math.round(Number(this.lightningConfig.segments) || 6));
    const jitter = Math.max(0, Number(this.lightningConfig.forkJitter) || 36);
    const spawnDistance = Number.isFinite(this.lightningConfig.spawnDistance)
      ? this.lightningConfig.spawnDistance
      : 220;
    const color = typeof this.lightningConfig.color === 'string' ? this.lightningConfig.color : '#ffd860';
    const width = Math.max(1, Number(this.lightningConfig.strokeWidth) || 3);
    const coreColor = typeof this.lightningConfig.coreColor === 'string' ? this.lightningConfig.coreColor : '#fff2c0';
    const tailColor = typeof this.lightningConfig.tailColor === 'string' ? this.lightningConfig.tailColor : '#ffffff';
    const branchDensity = Math.max(0, Number(this.lightningConfig.branchDensity) || 0.35);
    const branchDecay = Math.max(0.2, Math.min(1, Number(this.lightningConfig.branchDecay) || 0.6));

    for (const obstacle of this.obstacles) {
      if (!obstacle) continue;
      const angle = obstacle.angle ?? 0;
      const baseRadius = obstacle.radius ?? 0;
      const length = obstacle.length ?? 0;
      const tipRadius = baseRadius - length;
      const end = this._pointOnAngle(angle, tipRadius);
      if (!Number.isFinite(end.x) || !Number.isFinite(end.y)) {
        continue;
      }
      let start = this._computeEdgeStartPoint({ angle, tip: end, margin: spawnDistance });
      if (!start || !Number.isFinite(start.x) || !Number.isFinite(start.y)) {
        const startRadius = baseRadius + Math.max(0, spawnDistance);
        start = this._pointOnAngle(angle, startRadius);
      }
      if (!start || !Number.isFinite(start.x) || !Number.isFinite(start.y)) {
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
        coreColor,
        tailColor,
        width,
        life: this.lightningDuration,
        maxLife: this.lightningDuration,
        branches: this._buildBranches(points, {
          baseWidth: width,
          density: branchDensity,
          decay: branchDecay,
          jitter,
        }),
      });
    }
    this.eventsSpawned += 1;
  }

  _buildBranches(points, { baseWidth, density, decay, jitter }) {
    const branches = [];
    if (!Array.isArray(points) || points.length < 3) return branches;
    const total = points.length;
    for (let i = 1; i < total - 1; i += 1) {
      if (Math.random() > density) continue;
      const origin = points[i];
      const next = points[i + 1];
      if (!origin || !next) continue;

      const dirX = next.x - origin.x;
      const dirY = next.y - origin.y;
      const baseLen = Math.hypot(dirX, dirY);
      if (baseLen <= 0.001) continue;
      const normX = dirX / baseLen;
      const normY = dirY / baseLen;

      const perpX = -normY;
      const perpY = normX;
      const branchDir = Math.random() < 0.5 ? 1 : -1;
      const branchLength = baseLen * (0.7 + Math.random() * 1.2);
      const steps = Math.max(3, Math.round(4 + Math.random() * 3));

      const branchPoints = [origin];
      let currentX = origin.x;
      let currentY = origin.y;
      let remaining = branchLength;
      let segmentWidth = baseWidth * 0.6;

      for (let step = 1; step <= steps && remaining > 4; step += 1) {
        const segLen = Math.min(remaining, branchLength / steps * (0.8 + Math.random() * 0.4));
        remaining -= segLen;
        const drift = (Math.random() - 0.5) * jitter * 0.4;
        currentX += normX * segLen + perpX * drift * branchDir;
        currentY += normY * segLen + perpY * drift * branchDir;
        branchPoints.push({ x: currentX, y: currentY });
        segmentWidth *= decay;
      }
      if (branchPoints.length > 1) {
        branches.push({
          points: branchPoints,
          width: Math.max(1, segmentWidth),
        });
      }
    }
    return branches;
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
