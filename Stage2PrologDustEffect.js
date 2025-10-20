const TAU = Math.PI * 2;

const DEFAULTS = {
  enabled: true,
  spawnDurationSec: 0.9,
  spawnIntervalSec: 0.08,
  burstCount: 12,
  speed: { min: 110, max: 220 },
  size: { min: 2, max: 5 },
  lifeSec: { min: 0.35, max: 0.7 },
  spreadDeg: 70,
  jitterRadius: 10,
  gravity: 220,
  opacity: 0.75,
  color: '#ffdcb0',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return min || 0;
  if (max <= min) return min;
  return min + Math.random() * (max - min);
}

export class Stage2PrologDustEffect {
  constructor({ config = {} } = {}) {
    this.configure(config);
    this.particles = [];
    this.spawnAccumulator = 0;
    this.emitter = { x: 0, y: 0, angle: -Math.PI / 2 };
    this.elapsedInRadiusPhase = 0;
  }

  configure(config = {}) {
    const merged = {
      ...DEFAULTS,
      ...config,
      speed: { ...DEFAULTS.speed, ...(config.speed || {}) },
      size: { ...DEFAULTS.size, ...(config.size || {}) },
      lifeSec: { ...DEFAULTS.lifeSec, ...(config.lifeSec || {}) },
    };
    this.config = merged;
    this.enabled = merged.enabled !== false;
    this.spawnDurationSec = Number.isFinite(merged.spawnDurationSec)
      ? Math.max(0, merged.spawnDurationSec)
      : DEFAULTS.spawnDurationSec;
    this.spawnIntervalSec = Number.isFinite(merged.spawnIntervalSec) && merged.spawnIntervalSec > 0
      ? merged.spawnIntervalSec
      : DEFAULTS.spawnIntervalSec;
    this.burstCount = Math.max(1, Math.round(merged.burstCount ?? DEFAULTS.burstCount));
    this.gravity = Number.isFinite(merged.gravity) ? merged.gravity : DEFAULTS.gravity;
    this.opacity = clamp(Number(merged.opacity ?? DEFAULTS.opacity), 0, 1);
    this.color = typeof merged.color === 'string' ? merged.color : DEFAULTS.color;
  }

  reset() {
    this.particles.length = 0;
    this.spawnAccumulator = 0;
    this.elapsedInRadiusPhase = 0;
  }

  setGeometry(geometry) {
    this.geometry = geometry || null;
  }

  setEmitter({ x, y, angle }) {
    this.emitter.x = Number.isFinite(x) ? x : this.emitter.x;
    this.emitter.y = Number.isFinite(y) ? y : this.emitter.y;
    this.emitter.angle = Number.isFinite(angle) ? angle : this.emitter.angle;
  }

  update(dt = 0, { active = false, elapsedInRadius = 0 } = {}) {
    const dtSec = Math.max(0, dt);
    this.elapsedInRadiusPhase = elapsedInRadius;

    if (this.enabled && active && elapsedInRadius <= this.spawnDurationSec) {
      this.spawnAccumulator += dtSec;
      while (this.spawnAccumulator >= this.spawnIntervalSec) {
        this.spawnAccumulator -= this.spawnIntervalSec;
        this._emitBurst();
      }
    } else {
      this.spawnAccumulator = this.spawnIntervalSec;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dtSec;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += this.gravity * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
    }
  }

  draw(ctx) {
    if (!ctx || this.particles.length === 0) return;

    ctx.save();
    ctx.fillStyle = this.color;
    for (const p of this.particles) {
      const alpha = this.opacity * clamp(p.life / p.maxLife, 0, 1);
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  _emitBurst() {
    const cfg = this.config;
    const { x, y } = this.emitter;
    const baseDir = -Math.PI / 2;
    const spreadRad = clamp((cfg.spreadDeg ?? DEFAULTS.spreadDeg) * (Math.PI / 180), 0, Math.PI);

    for (let i = 0; i < this.burstCount; i++) {
      const dir = baseDir + (Math.random() - 0.5) * spreadRad;
      const speed = randomBetween(cfg.speed.min, cfg.speed.max);
      const size = randomBetween(cfg.size.min, cfg.size.max);
      const life = randomBetween(cfg.lifeSec.min, cfg.lifeSec.max);
      const jitterRadius = cfg.jitterRadius ?? DEFAULTS.jitterRadius;
      const jitterAngle = Math.random() * TAU;
      const jitterDist = Math.random() * jitterRadius;
      const spawnX = x + Math.cos(jitterAngle) * jitterDist;
      const spawnY = y + Math.sin(jitterAngle) * jitterDist * 0.5;

      const vx = Math.cos(dir) * speed;
      const vy = Math.sin(dir) * speed;

      this.particles.push({
        x: spawnX,
        y: spawnY,
        vx,
        vy,
        size,
        life,
        maxLife: life,
      });
    }
  }
}
