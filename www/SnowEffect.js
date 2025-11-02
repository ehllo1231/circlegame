import { SNOW } from './Config.js';

function normalizeScale(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(value, 1);
}

export class SnowEffect {
  constructor({ scale = 1 } = {}) {
    this.flakes = [];
    this.spawnAcc = 0;     // spawn accumulator (flakes)
    this.timeFrames = 0;   // frames at 60fps (for wind oscillation)
    this.scale = normalizeScale(scale);
    this.offscreenMargin = this._computeOffscreenMargin();
  }

  reset() {
    this.flakes.length = 0;
    this.spawnAcc = 0;
    this.timeFrames = 0;
  }

  setScale(scale = 1) {
    const next = normalizeScale(scale);
    if (next === this.scale) return;
    const prev = this.scale || 1;
    const ratio = next / prev;
    this.scale = next;
    this.offscreenMargin = this._computeOffscreenMargin();
    if (!Array.isArray(this.flakes) || this.flakes.length === 0) return;
    for (const flake of this.flakes) {
      if (!flake) continue;
      flake.size *= ratio;
      flake.vx *= ratio;
      flake.vy *= ratio;
      if (Number.isFinite(flake.windBaseX)) flake.windBaseX *= ratio;
      if (Number.isFinite(flake.windOscAmp)) flake.windOscAmp *= ratio;
    }
  }

  update(dt, width, height) {
    // support spawnPerMin (preferred). fallback to spawnPerSecond if present
    const spawnPerMin = (typeof SNOW?.spawnPerMin === 'number')
      ? SNOW.spawnPerMin
      : ((typeof SNOW?.spawnPerSecond === 'number') ? SNOW.spawnPerSecond * 60 : 0);
    const spawnPerFrame = spawnPerMin / (60 * 60);

    // Advance global time for wind phase calculations
    this.timeFrames += dt;

    const direction = this._resolveDirection();
    const w = Number.isFinite(width) ? width : 0;
    const h = Number.isFinite(height) ? height : 0;

    // Spawn (no hard cap): use accumulator; unbiased across full width
    this.spawnAcc += spawnPerFrame * dt;
    let toSpawn = Math.floor(this.spawnAcc);
    if (toSpawn > 0) this.spawnAcc -= toSpawn;
    while (toSpawn-- > 0) {
      // Snapshot all config used by this flake at creation time
      const size = this._rand(SNOW?.size?.min ?? 1, SNOW?.size?.max ?? 3) * this.scale;
      const speedMag = this._rand(SNOW?.fallSpeed?.min ?? 0.8, SNOW?.fallSpeed?.max ?? 2.0) * this.scale;
      const verticalSpeed = direction === 'up' ? -speedMag : speedMag;
      const alpha = SNOW?.alpha ?? 0.28;
      const baseX = (SNOW?.wind?.baseX ?? 0.1) * this.scale;
      const oscAmp = (SNOW?.wind?.oscAmp ?? 0.08) * this.scale;
      const periodSec = SNOW?.wind?.oscPeriodSec ?? 5;
      const periodFrames = Math.max(1, periodSec * 60);
      // Use current wind for initial vx blend to preserve behavior
      const phase0 = (this.timeFrames / periodFrames) * Math.PI * 2;
      const windX0 = baseX + Math.sin(phase0) * oscAmp;

      const spawnX = Math.random() * w * 3 - w;
      const spawnY = direction === 'up'
        ? h + size + Math.random() * (30 * this.scale)
        : -size - Math.random() * (30 * this.scale);

      this.flakes.push({
        x: spawnX,
        y: spawnY,
        // keep existing behavior: include wind at spawn plus small noise
        vx: windX0 + (Math.random() - 0.5) * 0.1,
        vy: verticalSpeed,
        size,
        appeared: false,
        direction,
        // snapshot config so later changes do not affect this flake
        alpha,
        windBaseX: baseX,
        windOscAmp: oscAmp,
        windPeriodFrames: periodFrames,
      });
    }

    // Update existing flakes using their own snapped configs
    for (let i = this.flakes.length - 1; i >= 0; i--) {
      const f = this.flakes[i];
      const phase = (this.timeFrames / f.windPeriodFrames) * Math.PI * 2;
      const windX = f.windBaseX + Math.sin(phase) * f.windOscAmp;
      f.x += (windX + f.vx) * dt;
      f.y += f.vy * dt;

      // Mark as appeared once it intersects the viewport
      const inView = (f.x + f.size >= 0) && (f.x - f.size <= w) && (f.y + f.size >= 0) && (f.y - f.size <= h);
      if (inView) f.appeared = true;

      const dir = f.direction === 'up' ? 'up' : 'down';
      const offVertical = dir === 'up'
        ? (f.y + f.size < -this.offscreenMargin)
        : (f.y - f.size > h + this.offscreenMargin);
      const offHorizontal = (f.x < -this.offscreenMargin) || (f.x > w + this.offscreenMargin);
      const offScreen = offVertical || offHorizontal;
      if (f.appeared && offScreen) {
        this.flakes.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const f of this.flakes) {
      const a = (typeof f.alpha === 'number') ? f.alpha : (SNOW?.alpha ?? 0.28);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _rand(min, max) {
    const lo = Number(min) ?? 0;
    const hi = Number(max) ?? lo;
    return lo + Math.random() * Math.max(0, hi - lo);
  }

  _resolveDirection() {
    const direction = SNOW?.direction;
    return direction === 'up' ? 'up' : 'down';
  }

  _computeOffscreenMargin() {
    return Math.max(8, 20 * this.scale);
  }
}
