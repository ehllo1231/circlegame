import { STAGE2_PROLOG, STAGE3_PROLOG } from './Config.js';
import { Stage2PrologObstacle } from './Stage2PrologObstacle.js';

function hexToRgba(hex, alpha = 1) {
  const clampedAlpha = Math.max(0, Math.min(1, Number(alpha) || 0));
  if (typeof hex !== 'string') return `rgba(255,255,255,${clampedAlpha})`;
  let raw = hex.trim().replace('#', '');
  if (raw.length === 3) raw = raw.split('').map((c) => c + c).join('');
  if (raw.length !== 6) return `rgba(255,255,255,${clampedAlpha})`;
  const value = Number.parseInt(raw, 16);
  if (!Number.isFinite(value)) return `rgba(255,255,255,${clampedAlpha})`;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${clampedAlpha})`;
}

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

    this.obstacles = [];
    this.lightnings = [];
    this.lightningTimer = 0;

    this.centerX = 0;
    this.centerY = 0;
    this.viewWidth = null;
    this.viewHeight = null;

    this._applyLightningConfig(STAGE3_PROLOG ?? {});
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
      const boltPath = new Path2D();
      boltPath.moveTo(head.x, head.y);
      for (let i = 1; i < pts.length; i += 1) {
        boltPath.lineTo(pts[i].x, pts[i].y);
      }

      const glowGradient = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
      glowGradient.addColorStop(0, hexToRgba(bolt.color, 0.22));
      glowGradient.addColorStop(0.45, hexToRgba(bolt.coreColor, 0.32));
      glowGradient.addColorStop(1, hexToRgba(bolt.tailColor, 0.18));

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = faded * 0.38;
      ctx.shadowBlur = Math.max(6, bolt.width * (1.4 + (1 - faded) * 0.8));
      ctx.shadowColor = hexToRgba(bolt.color, 0.55);
      ctx.lineWidth = bolt.width * (1.45 + (1 - faded) * 0.55);
      ctx.strokeStyle = glowGradient;
      ctx.stroke(boltPath);
      ctx.restore();

      const bodyGradient = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
      bodyGradient.addColorStop(0, hexToRgba(bolt.color, 0.55));
      bodyGradient.addColorStop(0.5, hexToRgba(bolt.coreColor, 0.72));
      bodyGradient.addColorStop(1, hexToRgba(bolt.tailColor, 0.45));

      ctx.globalAlpha = faded * 0.48;
      ctx.lineWidth = bolt.width * 0.9;
      ctx.strokeStyle = bodyGradient;
      ctx.stroke(boltPath);

      ctx.globalAlpha = faded * 0.78;
      ctx.lineWidth = bolt.width * 0.44;
      ctx.strokeStyle = hexToRgba(bolt.coreColor, 0.92);
      ctx.stroke(boltPath);

      ctx.globalAlpha = faded * 0.23;
      ctx.lineWidth = Math.max(1, bolt.width * 0.26);
      const dash = bolt.width * (0.7 + Math.random() * 0.5);
      ctx.setLineDash([dash, dash * (1.25 + Math.random() * 0.5)]);
      ctx.lineDashOffset = Math.random() * dash;
      ctx.strokeStyle = hexToRgba(bolt.tailColor, 0.6);
      ctx.stroke(boltPath);
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;

      if (Array.isArray(bolt.branches)) {
        for (const branch of bolt.branches) {
          const branchPts = branch.points;
          if (!branchPts || branchPts.length < 2) continue;
          const branchHead = branchPts[0];
          const branchTail = branchPts[branchPts.length - 1];
          const branchPath = new Path2D();
          branchPath.moveTo(branchHead.x, branchHead.y);
          for (let i = 1; i < branchPts.length; i += 1) {
            branchPath.lineTo(branchPts[i].x, branchPts[i].y);
          }

          const branchGlow = ctx.createLinearGradient(
            branchHead.x,
            branchHead.y,
            branchTail.x,
            branchTail.y,
          );
          branchGlow.addColorStop(0, hexToRgba(bolt.coreColor, 0.08));
          branchGlow.addColorStop(0.4, hexToRgba(bolt.coreColor, 0.22));
          branchGlow.addColorStop(1, hexToRgba(bolt.tailColor, 0.12));

          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = faded * 0.25;
          ctx.shadowBlur = Math.max(4, branch.width * 1.1);
          ctx.shadowColor = hexToRgba(bolt.coreColor, 0.45);
          ctx.lineWidth = branch.width * 1.1;
          ctx.strokeStyle = branchGlow;
          ctx.stroke(branchPath);
          ctx.restore();

          const branchBodyGradient = ctx.createLinearGradient(
            branchHead.x,
            branchHead.y,
            branchTail.x,
            branchTail.y,
          );
          branchBodyGradient.addColorStop(0, hexToRgba(bolt.coreColor, 0.18));
          branchBodyGradient.addColorStop(0.3, hexToRgba(bolt.coreColor, 0.34));
          branchBodyGradient.addColorStop(1, hexToRgba(bolt.tailColor, 0.2));

          ctx.globalAlpha = faded * 0.32;
          ctx.lineWidth = branch.width * 0.62;
          ctx.strokeStyle = branchBodyGradient;
          ctx.stroke(branchPath);

          ctx.globalAlpha = faded * 0.43;
          ctx.lineWidth = branch.width * 0.34;
          ctx.strokeStyle = hexToRgba(bolt.coreColor, 0.65);
          ctx.stroke(branchPath);

          ctx.globalAlpha = faded * 0.14;
          ctx.lineWidth = Math.max(1, branch.width * 0.2);
          const branchDash = branch.width * (0.85 + Math.random() * 0.5);
          ctx.setLineDash([branchDash, branchDash * (1.3 + Math.random() * 0.6)]);
          ctx.lineDashOffset = Math.random() * branchDash;
          ctx.strokeStyle = hexToRgba(bolt.tailColor, 0.5);
          ctx.stroke(branchPath);
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
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
    const branchDensity = Math.max(0, Math.min(1, Number(this.lightningConfig.branchDensity) || 0.35));
    const branchDecay = Math.max(0.2, Math.min(1, Number(this.lightningConfig.branchDecay) || 0.6));
    const branchSpreadRad = Math.max(0, ((Number(this.lightningConfig.branchSpreadDeg) || 0) * Math.PI) / 180);
    const branchLengthMul = Math.max(0.2, Number(this.lightningConfig.branchLengthMul) || 1);
    const branchJitterMul = Math.max(0, Number(this.lightningConfig.branchJitterMul) || 1);

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
      const axisX = end.x - start.x;
      const axisY = end.y - start.y;
      const axisLen = Math.hypot(axisX, axisY);
      if (axisLen <= 0.0001) continue;
      const normX = axisX / axisLen;
      const normY = axisY / axisLen;
      const perpX = -normY;
      const perpY = normX;

      const points = [start];
      for (let i = 1; i < segments; i += 1) {
        const t = i / segments;
        const along = axisLen * t;
        const baseX = start.x + normX * along;
        const baseY = start.y + normY * along;
        const falloff = 1 - t;
        const offsetMag = (Math.random() * 2 - 1) * jitter * falloff;
        const offsetX = perpX * offsetMag;
        const offsetY = perpY * offsetMag;
        points.push({ x: baseX + offsetX, y: baseY + offsetY });
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
          spreadRad: branchSpreadRad,
          lengthMul: branchLengthMul,
          jitterMul: branchJitterMul,
        }),
      });
    }
    this.eventsSpawned += 1;
  }

  _buildBranches(points, {
    baseWidth,
    density,
    decay,
    jitter,
    spreadRad,
    lengthMul,
    jitterMul,
  }) {
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

      const branchDir = Math.random() < 0.5 ? 1 : -1;
      const angleOffset = spreadRad > 0 ? (Math.random() * spreadRad) * branchDir : 0;
      const baseAngle = Math.atan2(normY, normX);
      const finalAngle = baseAngle + angleOffset;
      const branchNormX = Math.cos(finalAngle);
      const branchNormY = Math.sin(finalAngle);
      const branchPerpX = -branchNormY;
      const branchPerpY = branchNormX;
      const branchLength = baseLen * lengthMul * (0.7 + Math.random() * 1.2);
      const steps = Math.max(3, Math.round(4 + Math.random() * 3));

      const branchPoints = [origin];
      let currentX = origin.x;
      let currentY = origin.y;
      let remaining = branchLength;
      let segmentWidth = baseWidth * 0.6;

      for (let step = 1; step <= steps && remaining > 4; step += 1) {
        const segLen = Math.min(remaining, branchLength / steps * (0.8 + Math.random() * 0.4));
        remaining -= segLen;
        const drift = (Math.random() - 0.5) * jitter * jitterMul * 0.5;
        currentX += branchNormX * segLen + branchPerpX * drift;
        currentY += branchNormY * segLen + branchPerpY * drift;
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
