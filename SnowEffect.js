import { SNOW } from './Config.js';

export class SnowEffect {
  constructor() {
    this.flakes = [];
    this.spawnAcc = 0;     // spawn accumulator (flakes)
    this.timeFrames = 0;   // frames at 60fps (for wind oscillation)
  }

  reset() {
    this.flakes.length = 0;
    this.spawnAcc = 0;
    this.timeFrames = 0;
  }

  update(dt, width, height) {
    // support spawnPerMin (preferred). fallback to spawnPerSecond if present
    const spawnPerMin = (typeof SNOW?.spawnPerMin === 'number')
      ? SNOW.spawnPerMin
      : ((typeof SNOW?.spawnPerSecond === 'number') ? SNOW.spawnPerSecond * 60 : 0);
    const spawnPerFrame = spawnPerMin / (60 * 60);

    // Advance global time for wind phase calculations
    this.timeFrames += dt;

    // Spawn (no hard cap): use accumulator; unbiased across full width
    this.spawnAcc += spawnPerFrame * dt;
    let toSpawn = Math.floor(this.spawnAcc);
    if (toSpawn > 0) this.spawnAcc -= toSpawn;
    while (toSpawn-- > 0) {
      // Snapshot all config used by this flake at creation time
      const size = this._rand(SNOW?.size?.min ?? 1, SNOW?.size?.max ?? 3);
      const vy = this._rand(SNOW?.fallSpeed?.min ?? 0.8, SNOW?.fallSpeed?.max ?? 2.0);
      const alpha = SNOW?.alpha ?? 0.28;
      const baseX = SNOW?.wind?.baseX ?? 0.1;
      const oscAmp = SNOW?.wind?.oscAmp ?? 0.08;
      const periodSec = SNOW?.wind?.oscPeriodSec ?? 5;
      const periodFrames = Math.max(1, periodSec * 60);
      // Use current wind for initial vx blend to preserve behavior
      const phase0 = (this.timeFrames / periodFrames) * Math.PI * 2;
      const windX0 = baseX + Math.sin(phase0) * oscAmp;
      
      this.flakes.push({
        x: Math.random() * width * 3 - width, // start potentially off-screen for natural entry
        y: -size - Math.random() * 30,
        // keep existing behavior: include wind at spawn plus small noise
        vx: windX0 + (Math.random() - 0.5) * 0.1,
        vy,
        size,
        appeared: false,
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
      const inView = (f.x + f.size >= 0) && (f.x - f.size <= width) && (f.y + f.size >= 0) && (f.y - f.size <= height);
      if (inView) f.appeared = true;

      // Remove only after it has appeared and then exits the screen bounds
      const offScreen = (f.y - f.size > height) || (f.x < -20) || (f.x > width + 20);
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
}
