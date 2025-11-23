import { clamp01 } from './colorUtils.js';

function lengthOfSegment(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

function midpointWithJitter(a, b, jitter) {
  const mid = {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
  if (!Number.isFinite(jitter) || jitter <= 0) {
    return mid;
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const offset = (Math.random() * 2 - 1) * jitter;
  mid.x += perpX * offset;
  mid.y += perpY * offset;
  return mid;
}

function buildPolyline({ start, end, depth, jitter, jitterDecay }) {
  let points = [start, end];
  let currentJitter = jitter;
  for (let i = 0; i < depth; i += 1) {
    const next = [];
    for (let j = 0; j < points.length - 1; j += 1) {
      const a = points[j];
      const b = points[j + 1];
      next.push(a, midpointWithJitter(a, b, currentJitter));
    }
    next.push(points[points.length - 1]);
    points = next;
    currentJitter *= jitterDecay;
  }
  return points;
}

function accumulatePath(points) {
  const segments = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const len = lengthOfSegment(a, b);
    total += len;
    segments.push({ length: len, cumulative: total });
  }
  return { points, segments, totalLength: total };
}

function lerpPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function clampNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export class Stage3PrologLightningEffect {
  constructor() {
    this.enabled = true;
    this.revealDurationSec = 0.12;
    this.holdDurationSec = 0.14;
    this.fadeOutDurationSec = 0.28;
    this.coreColor = '#fff6b3';
    this.glowColor = 'rgba(255, 211, 77, 0.55)';
    this.coreThickness = 7;
    this.branchThickness = 4;
    this.glowBlurPx = 14;
    this.startInsetPx = 18;
    this.startYOffsetRangePx = 120;
    this.jitterPx = 28;
    this.jitterDecay = 0.6;
    this.maxDepth = 4;
    this.branchConfig = {
      enabled: true,
      splitChance: 0.32,
      maxPerBolt: 6,
      maxDepth: 2,
      lengthDecay: 0.52,
    };

    this.started = false;
    this.completed = false;
    this.elapsed = 0;
    this.totalDurationSec = this._computeTotalDuration();
    this.viewWidth = null;
    this.viewHeight = null;
    this.bolts = [];
  }

  configure(config = {}) {
    this.enabled = config?.enabled !== false;
    this.revealDurationSec = this._positive(config?.revealDurationSec, this.revealDurationSec);
    this.holdDurationSec = this._positive(config?.holdDurationSec, this.holdDurationSec);
    this.fadeOutDurationSec = this._positive(config?.fadeOutDurationSec, this.fadeOutDurationSec);
    this.coreColor = typeof config?.coreColor === 'string' ? config.coreColor : this.coreColor;
    this.glowColor = typeof config?.glowColor === 'string' ? config.glowColor : this.glowColor;
    this.coreThickness = this._positive(config?.coreThickness, this.coreThickness);
    this.branchThickness = this._positive(config?.branchThickness, this.branchThickness);
    this.glowBlurPx = this._positive(config?.glowBlurPx, this.glowBlurPx);
    this.startInsetPx = this._positive(config?.startInsetPx, this.startInsetPx);
    this.startYOffsetRangePx = this._positive(config?.startYOffsetRangePx, this.startYOffsetRangePx);
    this.jitterPx = this._positive(config?.jitterPx, this.jitterPx);
    this.jitterDecay = Number.isFinite(config?.jitterDecay) ? Math.max(0.25, Math.min(1, config.jitterDecay)) : this.jitterDecay;
    this.maxDepth = Number.isInteger(config?.maxDepth) && config.maxDepth >= 0 ? config.maxDepth : this.maxDepth;

    const branch = config?.branch ?? {};
    this.branchConfig = {
      enabled: branch?.enabled !== false,
      splitChance: this._clamp01(branch?.splitChance ?? this.branchConfig.splitChance),
      maxPerBolt: Number.isInteger(branch?.maxPerBolt) && branch.maxPerBolt >= 0
        ? branch.maxPerBolt
        : this.branchConfig.maxPerBolt,
      maxDepth: Number.isInteger(branch?.maxDepth) && branch.maxDepth >= 0
        ? branch.maxDepth
        : this.branchConfig.maxDepth,
      lengthDecay: this._clamp01(branch?.lengthDecay ?? this.branchConfig.lengthDecay),
    };

    this.totalDurationSec = this._computeTotalDuration();
  }

  reset() {
    this.started = false;
    this.completed = !this.enabled;
    this.elapsed = 0;
    this.bolts = [];
  }

  start({
    leftTarget,
    rightTarget,
    viewWidth,
    viewHeight,
    centerY,
  } = {}) {
    this.reset();
    this.started = true;
    this.completed = !this.enabled;
    this.viewWidth = clampNumber(viewWidth, this.viewWidth);
    this.viewHeight = clampNumber(viewHeight, this.viewHeight);

    if (!this.enabled) return;

    const targets = [];
    if (leftTarget) targets.push({ target: leftTarget, fromLeft: true });
    if (rightTarget) targets.push({ target: rightTarget, fromLeft: false });

    this.bolts = targets
      .map((entry) => this._buildBolt({ ...entry, centerY }))
      .filter(Boolean);
    if (this.bolts.length === 0) {
      this.completed = true;
    }
  }

  update(dtSeconds) {
    if (!this.started || this.completed) return;
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    const total = this.getTotalDuration();
    this.elapsed = Math.min(total, this.elapsed + dtSeconds);
    if (this.elapsed >= total - 1e-4) {
      this.completed = true;
    }
  }

  draw(ctx) {
    if (!ctx || !this.started || this.bolts.length === 0) return;
    const reveal = this.revealDurationSec <= 0 ? 1 : clamp01(this.elapsed / this.revealDurationSec);
    const afterReveal = Math.max(0, this.elapsed - this.revealDurationSec);
    const fadeStart = this.holdDurationSec;
    const fade = this.fadeOutDurationSec > 0
      ? clamp01(Math.max(0, afterReveal - fadeStart) / this.fadeOutDurationSec)
      : 0;
    const alpha = 1 - fade;

    for (const bolt of this.bolts) {
      this._drawBolt(ctx, bolt, reveal, alpha);
    }
  }

  fastForward() {
    if (!this.started) {
      this.started = true;
    }
    this.elapsed = this.getTotalDuration();
    this.completed = true;
  }

  hasStarted() {
    return this.started;
  }

  isComplete() {
    return this.completed || !this.enabled;
  }

  getTotalDuration() {
    return this.enabled ? this.totalDurationSec : 0;
  }

  setViewport({ viewWidth, viewHeight } = {}) {
    this.viewWidth = clampNumber(viewWidth, this.viewWidth);
    this.viewHeight = clampNumber(viewHeight, this.viewHeight);
  }

  _drawBolt(ctx, bolt, reveal, alpha) {
    if (!bolt || alpha <= 0) return;
    const drawPath = (path, thickness, color, glowBlurPx, widthScale = 1) => {
      if (!path || !path.points || path.points.length < 2 || path.totalLength <= 0) return;
      const targetLength = path.totalLength * clamp01(reveal);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1, thickness * widthScale);
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = glowBlurPx;
      ctx.beginPath();
      let remaining = targetLength;
      const { points, segments } = path;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < segments.length; i += 1) {
        const seg = segments[i];
        const a = points[i];
        const b = points[i + 1];
        if (remaining <= 0) {
          break;
        }
        if (remaining >= seg.length) {
          ctx.lineTo(b.x, b.y);
          remaining -= seg.length;
        } else {
          const t = seg.length > 0 ? remaining / seg.length : 0;
          const p = lerpPoint(a, b, t);
          ctx.lineTo(p.x, p.y);
          remaining = 0;
          break;
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    drawPath(bolt.main, this.coreThickness, this.glowColor, this.glowBlurPx, 1.8);
    drawPath(bolt.main, this.coreThickness, this.coreColor, 0, 1);
    if (Array.isArray(bolt.branches)) {
      for (const branch of bolt.branches) {
        drawPath(branch, this.branchThickness, this.coreColor, this.glowBlurPx * 0.6, 1);
      }
    }
  }

  _buildBolt({ target, fromLeft, centerY }) {
    if (!target) return null;
    const inset = Math.max(0, this.startInsetPx);
    const width = Number.isFinite(this.viewWidth) ? this.viewWidth : 0;
    const height = Number.isFinite(this.viewHeight) ? this.viewHeight : null;
    const startX = fromLeft ? -inset : width + inset;
    const baseY = Number.isFinite(target.y)
      ? target.y
      : (Number.isFinite(centerY) ? centerY : 0);
    const range = Math.max(0, this.startYOffsetRangePx);
    const offset = range > 0 ? (Math.random() * 2 - 1) * range : 0;
    let startY = baseY + offset;
    if (Number.isFinite(height)) {
      startY = Math.max(-height * 0.25, Math.min(height * 1.25, startY));
    }

    const main = this._buildPath({
      start: { x: startX, y: startY },
      end: target,
      depth: this.maxDepth,
      jitter: this.jitterPx,
      jitterDecay: this.jitterDecay,
    });
    const branches = this.branchConfig?.enabled ? this._buildBranches(main) : [];
    return { main, branches };
  }

  _buildBranches(mainPath) {
    if (!mainPath || !Array.isArray(mainPath.points) || mainPath.points.length < 3) return [];
    const maxBranches = Math.max(0, this.branchConfig.maxPerBolt);
    if (maxBranches === 0) return [];
    const branches = [];
    const directionAngle = Math.atan2(
      mainPath.points[mainPath.points.length - 1].y - mainPath.points[0].y,
      mainPath.points[mainPath.points.length - 1].x - mainPath.points[0].x,
    );
    const baseLength = Math.max(30, mainPath.totalLength * 0.3);
    for (let i = 1; i < mainPath.points.length - 1; i += 1) {
      if (branches.length >= maxBranches) break;
      if (Math.random() > this.branchConfig.splitChance) continue;
      const origin = mainPath.points[i];
      const sign = Math.random() < 0.5 ? -1 : 1;
      const angleJitter = (0.45 + Math.random() * 0.7) * sign;
      const angle = directionAngle + angleJitter;
      const lenScale = (0.4 + Math.random() * 0.4) * this.branchConfig.lengthDecay;
      const length = baseLength * lenScale;
      const end = {
        x: origin.x + Math.cos(angle) * length,
        y: origin.y + Math.sin(angle) * length,
      };
      const depth = Math.max(0, Math.min(this.branchConfig.maxDepth, this.maxDepth - 1));
      const branchPath = this._buildPath({
        start: origin,
        end,
        depth,
        jitter: this.jitterPx * 0.55,
        jitterDecay: this.jitterDecay,
      });
      branches.push(branchPath);
    }
    return branches;
  }

  _buildPath({ start, end, depth, jitter, jitterDecay }) {
    const points = buildPolyline({
      start,
      end,
      depth: Math.max(0, depth),
      jitter: Math.max(0, jitter),
      jitterDecay: jitterDecay > 0 ? jitterDecay : 1,
    });
    return accumulatePath(points);
  }

  _computeTotalDuration() {
    return Math.max(0, this.revealDurationSec + this.holdDurationSec + this.fadeOutDurationSec);
  }

  _positive(value, fallback) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  _clamp01(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }
}
