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
    const maxFlakes = SNOW?.maxFlakes ?? 120;
    // support spawnPerMin (preferred). fallback to spawnPerSecond if present
    const spawnPerMin = (typeof SNOW?.spawnPerMin === 'number')
      ? SNOW.spawnPerMin
      : ((typeof SNOW?.spawnPerSecond === 'number') ? SNOW.spawnPerSecond * 60 : 0);
    const spawnPerFrame = spawnPerMin / (60 * 60);

    // Wind parameters
    const baseX = SNOW?.wind?.baseX ?? 0.1;
    const oscAmp = SNOW?.wind?.oscAmp ?? 0.08;
    const periodSec = SNOW?.wind?.oscPeriodSec ?? 5;
    const periodFrames = Math.max(1, periodSec * 60);

    // Advance time for wind
    this.timeFrames += dt;
    const phase = (this.timeFrames / periodFrames) * Math.PI * 2;
    const windX = baseX + Math.sin(phase) * oscAmp;

    // Spawn
    const want = Math.max(0, maxFlakes - this.flakes.length);
    if (want > 0) {
      this.spawnAcc += spawnPerFrame * dt;
      let toSpawn = Math.min(want, Math.floor(this.spawnAcc));
      if (toSpawn > 0) this.spawnAcc -= toSpawn;
      while (toSpawn-- > 0) {
        const size = this._rand(SNOW?.size?.min ?? 1, SNOW?.size?.max ?? 3);
        const vy = this._rand(SNOW?.fallSpeed?.min ?? 0.8, SNOW?.fallSpeed?.max ?? 2.0);
        this.flakes.push({
          x: Math.random() * width,
          y: -size - Math.random() * 30,
          vx: windX + (Math.random() - 0.5) * 0.1,
          vy,
          size,
        });
      }
    }

    // Update
    for (let i = this.flakes.length - 1; i >= 0; i--) {
      const f = this.flakes[i];
      f.x += (windX + f.vx) * dt;
      f.y += f.vy * dt;
      if (f.y - f.size > height || f.x < -20 || f.x > width + 20) {
        this.flakes.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    const alpha = SNOW?.alpha ?? 0.28;
    ctx.save();
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    for (const f of this.flakes) {
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
