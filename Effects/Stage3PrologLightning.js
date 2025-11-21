import { hexToRgba } from './colorUtils.js';

export class Stage3PrologLightning {
  constructor() {
    this.enabled = true;
    this.eventCount = 0;
    this.intervalSec = 1.3;
    this.flashDurationSec = 0.22;
    this.fadeExponent = 1.6;
    this.strokeWidth = 3;
    this.spawnDistance = 220;
    this.edgeOffset = 0;
    this.forkJitter = 36;
    this.segments = 6;
    this.color = '#ffd860';
    this.coreColor = '#fff2c0';
    this.tailColor = '#ffffff';
    this.branchDensity = 0.35;
    this.branchDecay = 0.6;
    this.branchSpreadRad = 0;
    this.branchLengthMul = 1;
    this.branchJitterMul = 1;
    this.maxTargetsPerEvent = 4;
    this.maxBranchDepth = 2;
    this.maxBranchCount = 20;
    this.maxBranchSegments = 6;
    this.branchSplitChance = 0.4;

    this.obstacles = [];
    this.centerX = 0;
    this.centerY = 0;
    this.viewWidth = null;
    this.viewHeight = null;

    this.lightnings = [];
    this.eventsSpawned = 0;
    this.timer = 0;
    this.scale = 1;
    this._baseStrokeWidth = this.strokeWidth;
    this._baseSpawnDistance = this.spawnDistance;
    this._baseEdgeOffset = this.edgeOffset;
    this._baseForkJitter = this.forkJitter;
    this._applyScale();
  }

  configure(config = {}) {
    const cfg = config ?? {};
    const enabled = cfg.enabled !== false;
    const count = Math.max(0, Math.floor(Number(cfg.eventCount) || 0));

    this.enabled = enabled && count > 0;
    this.eventCount = count;
    this.intervalSec = Math.max(0.05, Number(cfg.intervalSec) || 1.3);
    this.flashDurationSec = Math.max(0.01, Number(cfg.flashDurationSec) || 0.22);
    this.fadeExponent = Math.max(0.1, Number(cfg.fadeExponent) || 1.6);
    this._baseStrokeWidth = Math.max(1, Number(cfg.strokeWidth) || 3);
    this._baseSpawnDistance = Number.isFinite(cfg.spawnDistance) ? cfg.spawnDistance : 220;
    this._baseEdgeOffset = Number.isFinite(cfg.edgeOffset) ? Math.max(0, cfg.edgeOffset) : 0;
    this._baseForkJitter = Math.max(0, Number(cfg.forkJitter) || 36);
    this.segments = Math.max(2, Math.round(Number(cfg.segments) || 6));
    this.color = typeof cfg.color === 'string' ? cfg.color : '#ffd860';
    this.coreColor = typeof cfg.coreColor === 'string' ? cfg.coreColor : '#fff2c0';
    this.tailColor = typeof cfg.tailColor === 'string' ? cfg.tailColor : '#ffffff';
    this.branchDensity = Math.max(0, Math.min(1, Number(cfg.branchDensity) || 0.35));
    this.branchDecay = Math.max(0.2, Math.min(1, Number(cfg.branchDecay) || 0.6));
    this.branchSpreadRad = Math.max(0, ((Number(cfg.branchSpreadDeg) || 0) * Math.PI) / 180);
    this.branchLengthMul = Math.max(0.2, Number(cfg.branchLengthMul) || 1);
    this.branchJitterMul = Math.max(0, Number(cfg.branchJitterMul) || 1);
    this.maxTargetsPerEvent = Math.max(1, Math.round(Number(cfg.maxTargetsPerEvent) || 4));
    this.maxBranchDepth = Math.max(0, Math.round(Number(cfg.maxBranchDepth) || 2));
    this.maxBranchCount = Math.max(0, Math.round(Number(cfg.maxBranchCount) || 20));
    this.maxBranchSegments = Math.max(3, Math.round(Number(cfg.maxBranchSegments) || 6));
    this.branchSplitChance = Math.max(0, Math.min(1, Number(cfg.branchSplitChance) || 0.4));
    this._applyScale();
  }

  setViewport({ centerX, centerY, viewWidth, viewHeight }) {
    if (Number.isFinite(centerX)) this.centerX = centerX;
    if (Number.isFinite(centerY)) this.centerY = centerY;
    if (Number.isFinite(viewWidth)) this.viewWidth = viewWidth;
    if (Number.isFinite(viewHeight)) this.viewHeight = viewHeight;
  }

  setObstacles(obstacles = []) {
    this.obstacles = Array.isArray(obstacles) ? obstacles : [];
  }

  setScale(scale = 1) {
    const next = this._normalizeScale(scale);
    if (next === this.scale) return;
    const prev = this.scale || 1;
    const ratio = next / prev;
    this.scale = next;
    this._applyScale();
    if (!Array.isArray(this.lightnings) || this.lightnings.length === 0) return;
    for (const bolt of this.lightnings) {
      if (!bolt) continue;
      if (Array.isArray(bolt.points)) {
        for (const point of bolt.points) {
          if (!point) continue;
          point.x = this.centerX + (point.x - this.centerX) * ratio;
          point.y = this.centerY + (point.y - this.centerY) * ratio;
        }
      }
      if (Number.isFinite(bolt.width)) {
        bolt.width = Math.max(1, bolt.width * ratio);
      }
      if (Array.isArray(bolt.branches)) {
        for (const branch of bolt.branches) {
          if (!branch) continue;
          if (Array.isArray(branch.points)) {
            for (const point of branch.points) {
              if (!point) continue;
              point.x = this.centerX + (point.x - this.centerX) * ratio;
              point.y = this.centerY + (point.y - this.centerY) * ratio;
            }
          }
          if (Number.isFinite(branch.width)) {
            branch.width = Math.max(1, branch.width * ratio);
          }
        }
      }
    }
  }

  reset() {
    this.lightnings = [];
    this.eventsSpawned = 0;
    this.timer = 0;
  }

  start() {
    this.reset();
    if (!this.enabled) return;
    this._spawnLightning();
  }

  update(dtSeconds) {
    if (!this.enabled) return;
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    if (this.eventsSpawned < this.eventCount) {
      this.timer += dtSeconds;
      while (this.timer >= this.intervalSec && this.eventsSpawned < this.eventCount) {
        this.timer -= this.intervalSec;
        this._spawnLightning();
        if (!this.enabled) break;
      }
    }
    if (this.lightnings.length > 0) {
      for (let i = this.lightnings.length - 1; i >= 0; i -= 1) {
        const bolt = this.lightnings[i];
        bolt.life -= dtSeconds;
        if (bolt.life <= 0) {
          this.lightnings.splice(i, 1);
        }
      }
    }
  }

  draw(ctx) {
    if (!ctx || !this.enabled || this.lightnings.length === 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const bolt of this.lightnings) {
      const alpha = Math.max(0, Math.min(1, bolt.life / bolt.maxLife));
      const faded = Math.pow(alpha, this.fadeExponent);
      const path = bolt.path ?? this._buildPath(bolt.points);
      if (!path) continue;
      const head = bolt.head ?? bolt.points?.[0];
      const tail = bolt.tail ?? bolt.points?.[bolt.points.length - 1];
      if (!head || !tail) continue;

      const glow = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
      glow.addColorStop(0, hexToRgba(bolt.color, 0.22));
      glow.addColorStop(0.45, hexToRgba(bolt.coreColor, 0.32));
      glow.addColorStop(1, hexToRgba(bolt.tailColor, 0.18));

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = faded * 0.38;
      ctx.shadowBlur = Math.max(6, bolt.width * (1.4 + (1 - faded) * 0.8));
      ctx.shadowColor = hexToRgba(bolt.color, 0.55);
      ctx.lineWidth = bolt.width * (1.45 + (1 - faded) * 0.55);
      ctx.strokeStyle = glow;
      ctx.stroke(path);
      ctx.restore();

      const body = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
      body.addColorStop(0, hexToRgba(bolt.color, 0.55));
      body.addColorStop(0.5, hexToRgba(bolt.coreColor, 0.72));
      body.addColorStop(1, hexToRgba(bolt.tailColor, 0.45));

      ctx.globalAlpha = faded * 0.48;
      ctx.lineWidth = bolt.width * 0.9;
      ctx.strokeStyle = body;
      ctx.stroke(path);

      ctx.globalAlpha = faded * 0.78;
      ctx.lineWidth = bolt.width * 0.44;
      ctx.strokeStyle = hexToRgba(bolt.coreColor, 0.92);
      ctx.stroke(path);

      ctx.globalAlpha = faded * 0.23;
      ctx.lineWidth = Math.max(1, bolt.width * 0.26);
      this._applyDash(ctx, bolt.dash);
      ctx.strokeStyle = hexToRgba(bolt.tailColor, 0.6);
      ctx.stroke(path);
      this._clearDash(ctx);

      if (Array.isArray(bolt.branches)) {
        for (const branch of bolt.branches) {
          const branchPath = branch.path ?? this._buildPath(branch.points);
          if (!branchPath) continue;
          const branchHead = branch.head ?? branch.points?.[0];
          const branchTail = branch.tail ?? branch.points?.[branch.points.length - 1];
          if (!branchHead || !branchTail) continue;

          const branchGlow = ctx.createLinearGradient(branchHead.x, branchHead.y, branchTail.x, branchTail.y);
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

          const branchBody = ctx.createLinearGradient(branchHead.x, branchHead.y, branchTail.x, branchTail.y);
          branchBody.addColorStop(0, hexToRgba(bolt.coreColor, 0.18));
          branchBody.addColorStop(0.3, hexToRgba(bolt.coreColor, 0.34));
          branchBody.addColorStop(1, hexToRgba(bolt.tailColor, 0.2));

          ctx.globalAlpha = faded * 0.32;
          ctx.lineWidth = branch.width * 0.62;
          ctx.strokeStyle = branchBody;
          ctx.stroke(branchPath);

          ctx.globalAlpha = faded * 0.43;
          ctx.lineWidth = branch.width * 0.34;
          ctx.strokeStyle = hexToRgba(bolt.coreColor, 0.65);
          ctx.stroke(branchPath);

          ctx.globalAlpha = faded * 0.14;
          ctx.lineWidth = Math.max(1, branch.width * 0.2);
          this._applyDash(ctx, branch.dash);
          ctx.strokeStyle = hexToRgba(bolt.tailColor, 0.5);
          ctx.stroke(branchPath);
          this._clearDash(ctx);
        }
      }
    }
    ctx.restore();
  }

  isEnabled() {
    return this.enabled;
  }

  isComplete() {
    if (!this.enabled) return true;
    return this.eventsSpawned >= this.eventCount && this.lightnings.length === 0;
  }

  hasActiveVisuals() {
    return this.enabled && this.lightnings.length > 0;
  }

  disable() {
    this.enabled = false;
    this.lightnings = [];
    this.eventsSpawned = 0;
    this.timer = 0;
  }

  fastForward() {
    if (!this.enabled) {
      this.disable();
      return;
    }
    this.eventsSpawned = this.eventCount;
    this.lightnings = [];
    this.timer = 0;
  }

  getTotalDuration() {
    if (!this.enabled) return 0;
    if (!Number.isFinite(this.eventCount) || this.eventCount <= 0) return 0;
    const interval = Math.max(0, this.intervalSec);
    const flash = Math.max(0, this.flashDurationSec);
    if (this.eventCount <= 1) return flash;
    return (this.eventCount - 1) * interval + flash;
  }

  _spawnLightning() {
    if (!this.enabled || this.eventsSpawned >= this.eventCount) return;
    const targets = this._selectObstacleTargets();
    if (targets.length === 0) return;
    for (const obstacle of targets) {
      if (!obstacle) continue;
      const angle = obstacle.angle ?? 0;
      const baseRadius = obstacle.radius ?? 0;
      const length = obstacle.length ?? 0;
      const tipRadius = baseRadius - length;
      const end = this._pointOnAngle(angle, tipRadius);
      if (!Number.isFinite(end.x) || !Number.isFinite(end.y)) continue;
      let start = this._computeEdgeStartPoint({ angle, tip: end });
      if (!start || !Number.isFinite(start.x) || !Number.isFinite(start.y)) {
        const startRadius = baseRadius + Math.max(0, this.spawnDistance);
        start = this._pointOnAngle(angle, startRadius);
      }
      if (!start || !Number.isFinite(start.x) || !Number.isFinite(start.y)) continue;

      const axisX = end.x - start.x;
      const axisY = end.y - start.y;
      const axisLen = Math.hypot(axisX, axisY);
      if (axisLen <= 0.0001) continue;
      const normX = axisX / axisLen;
      const normY = axisY / axisLen;
      const perpX = -normY;
      const perpY = normX;

      const points = [start];
      for (let i = 1; i < this.segments; i += 1) {
        const t = i / this.segments;
        const along = axisLen * t;
        const baseX = start.x + normX * along;
        const baseY = start.y + normY * along;
        const falloff = 1 - t;
        const offsetMag = (Math.random() * 2 - 1) * this.forkJitter * falloff;
        const offsetX = perpX * offsetMag;
        const offsetY = perpY * offsetMag;
        points.push({ x: baseX + offsetX, y: baseY + offsetY });
      }
      points.push(end);
      const width = this.strokeWidth;
      this.lightnings.push({
        points,
        path: this._buildPath(points),
        head: points[0],
        tail: points[points.length - 1],
        color: this.color,
        coreColor: this.coreColor,
        tailColor: this.tailColor,
        width,
        life: this.flashDurationSec,
        maxLife: this.flashDurationSec,
        dash: this._createDashPattern(width),
        branches: this._buildBranches(points, width),
      });
    }
    this.eventsSpawned += 1;
  }

  _buildBranches(points, baseWidth) {
    const branches = [];
    if (!Array.isArray(points) || points.length < 3 || this.maxBranchCount <= 0) return branches;

    const seeds = [];
    for (let i = 1; i < points.length - 1; i += 1) {
      if (Math.random() > this.branchDensity) continue;
      const origin = points[i];
      const next = points[i + 1];
      if (!origin || !next) continue;
      const dirX = next.x - origin.x;
      const dirY = next.y - origin.y;
      const len = Math.hypot(dirX, dirY);
      if (len <= 0.001) continue;
      seeds.push({
        origin,
        dirX: dirX / len,
        dirY: dirY / len,
        baseLen: len,
        depth: 0,
        width: baseWidth * 0.6,
      });
    }

    if (!seeds.length) return branches;
    this._shuffle(seeds);
    const queue = seeds.slice(0, Math.min(seeds.length, this.maxBranchCount));

    while (queue.length && branches.length < this.maxBranchCount) {
      const seed = queue.shift();
      const branch = this._generateBranch(seed);
      if (!branch) continue;
      branches.push(branch);
      if (seed.depth >= this.maxBranchDepth) continue;
      if (Math.random() > this.branchSplitChance) continue;
      const split = this._createSplitSeed(branch, seed.depth + 1);
      if (split) {
        queue.push(split);
      }
    }
    return branches;
  }

  _generateBranch(seed) {
    const origin = seed.origin;
    if (!origin) return null;
    const baseAngle = Math.atan2(seed.dirY, seed.dirX);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const angleOffset = this.branchSpreadRad > 0 ? Math.random() * this.branchSpreadRad * dir : 0;
    const finalAngle = baseAngle + angleOffset;
    const branchNormX = Math.cos(finalAngle);
    const branchNormY = Math.sin(finalAngle);
    const branchPerpX = -branchNormY;
    const branchPerpY = branchNormX;

    const branchLength = seed.baseLen * this.branchLengthMul * (0.7 + Math.random() * 1.1);
    const steps = Math.min(this.maxBranchSegments, Math.max(3, Math.round(4 + Math.random() * 3)));

    const branchPoints = [origin];
    let currentX = origin.x;
    let currentY = origin.y;
    let remaining = branchLength;
    let segmentWidth = seed.width;

    for (let step = 1; step <= steps && remaining > 3; step += 1) {
      const segmentLength = Math.min(remaining, branchLength / steps * (0.8 + Math.random() * 0.4));
      remaining -= segmentLength;
      const drift = (Math.random() - 0.5) * this.forkJitter * this.branchJitterMul * 0.45;
      currentX += branchNormX * segmentLength + branchPerpX * drift;
      currentY += branchNormY * segmentLength + branchPerpY * drift;
      branchPoints.push({ x: currentX, y: currentY });
      segmentWidth *= this.branchDecay;
    }

    if (branchPoints.length <= 1) return null;
    const width = Math.max(1, segmentWidth);
    return {
      points: branchPoints,
      path: this._buildPath(branchPoints),
      head: branchPoints[0],
      tail: branchPoints[branchPoints.length - 1],
      width,
      dash: this._createDashPattern(width * 0.85),
      depth: seed.depth,
    };
  }

  _createSplitSeed(branch, depth) {
    if (!branch?.points || branch.points.length < 3) return null;
    const index = Math.min(branch.points.length - 2, Math.max(1, Math.floor(Math.random() * branch.points.length)));
    const origin = branch.points[index];
    const prev = branch.points[index - 1];
    if (!origin || !prev) return null;
    const dirX = origin.x - prev.x;
    const dirY = origin.y - prev.y;
    const len = Math.hypot(dirX, dirY);
    if (len <= 0.001) return null;
    return {
      origin,
      dirX: dirX / len,
      dirY: dirY / len,
      baseLen: len,
      depth,
      width: Math.max(1, branch.width * this.branchDecay),
    };
  }

  _selectObstacleTargets() {
    if (!Array.isArray(this.obstacles) || this.obstacles.length === 0) return [];
    const pool = this.obstacles.filter(Boolean);
    if (!pool.length) return [];
    this._shuffle(pool);
    return pool.slice(0, Math.min(this.maxTargetsPerEvent, pool.length));
  }

  _buildPath(points = []) {
    if (!Array.isArray(points) || points.length < 2) return null;
    const path = new Path2D();
    path.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      const point = points[i];
      if (!point) continue;
      path.lineTo(point.x, point.y);
    }
    return path;
  }

  _createDashPattern(width) {
    if (!Number.isFinite(width) || width <= 0) return null;
    const dash = width * (0.7 + Math.random() * 0.5);
    const gap = dash * (1.25 + Math.random() * 0.5);
    return {
      pattern: [dash, gap],
      offset: Math.random() * dash,
    };
  }

  _applyDash(ctx, dash) {
    if (!dash || !Array.isArray(dash.pattern)) return;
    ctx.setLineDash(dash.pattern);
    ctx.lineDashOffset = dash.offset || 0;
  }

  _clearDash(ctx) {
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  _shuffle(list = []) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }

  _pointOnAngle(angle, radius) {
    const r = Number.isFinite(radius) ? radius : 0;
    return {
      x: this.centerX + Math.cos(angle) * r,
      y: this.centerY + Math.sin(angle) * r,
    };
  }

  _computeEdgeStartPoint({ angle, tip }) {
    if (!tip) return null;
    if (!Number.isFinite(this.viewWidth) || this.viewWidth <= 0) return null;
    const halfWidth = this.viewWidth / 2;
    const direction = Math.cos(angle) >= 0 ? 1 : -1;
    const startX = this.centerX + direction * (halfWidth + this.edgeOffset);

    const dx = tip.x - this.centerX;
    const dy = tip.y - this.centerY;
    let startY;
    if (Math.abs(dx) < 1e-3) {
      startY = tip.y;
    } else {
      const slope = dy / dx;
      startY = tip.y + slope * (startX - tip.x);
    }
    if (!Number.isFinite(startY)) startY = tip.y;

    if (Number.isFinite(this.viewHeight) && this.viewHeight > 0) {
      const halfHeight = this.viewHeight / 2;
      const limit = halfHeight + this.edgeOffset;
      const minY = this.centerY - limit;
      const maxY = this.centerY + limit;
      startY = Math.max(minY, Math.min(maxY, startY));
    }

    if (this.forkJitter > 0) {
      startY += (Math.random() - 0.5) * this.forkJitter * 0.6;
    }

    return { x: startX, y: startY };
  }

  _applyScale() {
    const scale = this.scale;
    this.strokeWidth = Math.max(1, this._baseStrokeWidth * scale);
    this.spawnDistance = this._baseSpawnDistance * scale;
    this.edgeOffset = this._baseEdgeOffset * scale;
    this.forkJitter = this._baseForkJitter * scale;
  }

  _normalizeScale(value) {
    if (!Number.isFinite(value) || value <= 0) return 1;
    return value;
  }
}
