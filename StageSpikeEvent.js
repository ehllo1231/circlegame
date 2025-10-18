const DEG_TO_RAD = Math.PI / 180;

export class StageSpikeEvent {
  constructor({
    centerX = 0,
    centerY = 0,
    orbitRadius = 150,
    spikeLength = 40,
    baseWidth = 24,
    embedDepth = null,
  } = {}) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.orbitRadius = orbitRadius;
    this.spikeLength = spikeLength;
    this.baseWidth = baseWidth;
    this.embedDepth = Number.isFinite(embedDepth) ? Math.max(5, embedDepth) : spikeLength * 1.2;

    this.baseAngle = -Math.PI / 2; // 0 degrees at top (12 o'clock)
    this.warningDuration = 45; // frames (~0.75s)
    this.emergeDuration = 120; // frames (~2s)
    this.holdDuration = 60; // frames (~1s)
    this.spreadDuration = 60; // frames (~1s)
    this.spreadAngleRad = 20 * DEG_TO_RAD;
    this.shakeBaseAmplitude = 7;

    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.elapsed = 0;
    this.currentLength = this.spikeLength;
    this.depthMax = this._computeDepthMax();
    this.currentBaseRadius = this.orbitRadius - this.depthMax;
    this.spikeOffsets = [0, 0];
    this.emergeProgress = 0;
    this.shakeOffset = { x: 0, y: 0 };
    this.shards = [];
    this.shakeEnabled = false;
    this.spawnStartProgress = Math.max(0, 1 - (60 / Math.max(1, this.emergeDuration)));
  }

  setGeometry(centerX, centerY, orbitRadius) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.orbitRadius = orbitRadius;
    this.depthMax = this._computeDepthMax();
    this.currentBaseRadius = this.orbitRadius - this.depthMax * (1 - this.emergeProgress);
  }

  start() {
    if (this.state === 'idle') {
      this.state = 'warning';
      this.elapsed = 0;
      this.depthMax = this._computeDepthMax();
      this.currentBaseRadius = this.orbitRadius - this.depthMax;
      this.emergeProgress = 0;
      this.shards = [];
      this.shakeEnabled = false;
      this.spawnStartProgress = Math.max(0, 1 - (60 / Math.max(1, this.emergeDuration)));
    }
  }

  skipToEnd() {
    this.reset();
    this.state = 'done';
    this.emergeProgress = 1;
    this.currentBaseRadius = this.orbitRadius;
    this.spikeOffsets = [-this.spreadAngleRad, this.spreadAngleRad];
    this.shakeOffset = { x: 0, y: 0 };
  }

  update(dt = 1) {
    this._updateShards(dt);
    if (this.state === 'idle') return;

    this.elapsed += dt;

    switch (this.state) {
      case 'warning':
        if (this.elapsed >= this.warningDuration) {
          this.state = 'emerging';
          this.elapsed = 0;
          this.emergeProgress = 0;
        }
        break;

      case 'emerging': {
        const progress = Math.min(1, this.elapsed / this.emergeDuration);
        this.emergeProgress = progress;
        this.currentBaseRadius = this.orbitRadius - this.depthMax * (1 - progress);
        this.shakeEnabled = true;
        this._updateShake();
        this._spawnEmergingShards();
        if (this.elapsed >= this.emergeDuration) {
          this.state = 'hold';
          this.elapsed = 0;
          this.currentBaseRadius = this.orbitRadius;
          this.shakeOffset = { x: 0, y: 0 };
          this.shakeEnabled = false;
        }
        break;
      }

      case 'hold':
        this.currentBaseRadius = this.orbitRadius;
        this.shakeOffset = { x: 0, y: 0 };
        this.shakeEnabled = false;
        if (this.elapsed >= this.holdDuration) {
          this.state = 'spreading';
          this.elapsed = 0;
        }
        break;

      case 'spreading': {
        const progress = Math.min(1, this.elapsed / this.spreadDuration);
        const angle = this.spreadAngleRad * progress;
        this.spikeOffsets[0] = -angle;
        this.spikeOffsets[1] = angle;
        this.currentBaseRadius = this.orbitRadius;
        if (this.elapsed >= this.spreadDuration) {
          this.state = 'done';
          this.spikeOffsets[0] = -this.spreadAngleRad;
          this.spikeOffsets[1] = this.spreadAngleRad;
        }
        break;
      }

      case 'done':
        this.spikeOffsets[0] = -this.spreadAngleRad;
        this.spikeOffsets[1] = this.spreadAngleRad;
        this.currentBaseRadius = this.orbitRadius;
        this.shakeOffset = { x: 0, y: 0 };
        this.shakeEnabled = false;
        break;

      default:
        break;
    }
  }

  draw(ctx) {
    this._drawShards(ctx);
    if (this.state === 'idle') return;

    if (!this._hasSpikes()) return;

    const angles = this._currentAngles();
    ctx.save();
    ctx.fillStyle = '#910000';
    for (const angle of angles) {
      this._drawSpike(ctx, angle);
    }
    ctx.restore();
  }

  getShakeOffset() {
    return this.shakeEnabled ? this.shakeOffset : { x: 0, y: 0 };
  }

  getActiveSpikes() {
    if (!this._hasSpikes()) return [];
    const tipRadius = this.currentBaseRadius + this.currentLength;
    if (tipRadius < this.orbitRadius) return [];
    const angles = this._currentAngles();
    const drawLength = tipRadius - this.orbitRadius;
    return angles.map((angle) => ({
      angle,
      radius: this.orbitRadius,
      length: -drawLength,
      baseWidth: this.baseWidth,
      speed: 0,
    }));
  }

  _hasSpikes() {
    if (this.state === 'idle' || this.currentLength <= 0) return false;
    return ['emerging', 'hold', 'spreading', 'done'].includes(this.state);
  }

  _currentAngles() {
    return [
      this.baseAngle + this.spikeOffsets[0],
      this.baseAngle + this.spikeOffsets[1],
    ];
  }

  _drawSpike(ctx, angle) {
    const tip = this.currentBaseRadius + this.currentLength;
    if (tip <= this.orbitRadius) return;
    const drawLength = tip - this.orbitRadius;
    const baseRadius = this.orbitRadius;
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(baseRadius, -this.baseWidth / 2);
    ctx.lineTo(baseRadius + drawLength, 0);
    ctx.lineTo(baseRadius, this.baseWidth / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _updateShake() {
    const amplitude = Math.max(0, this.shakeBaseAmplitude * (1 - this.emergeProgress));
    this.shakeOffset = {
      x: (Math.random() * 2 - 1) * amplitude,
      y: (Math.random() * 2 - 1) * amplitude,
    };
  }

  _spawnEmergingShards() {
    const tip = this.currentBaseRadius + this.currentLength;
    const progress = this.emergeProgress;
    if (progress < this.spawnStartProgress) return;
    const normalized = Math.max(0, Math.min(1, (progress - this.spawnStartProgress) / (1 - this.spawnStartProgress)));
    const particleBase = 2;
    const particlePeak = 6;
    const particles = Math.floor(particleBase + normalized * (particlePeak - particleBase));
    const angles = this._currentAngles();
    for (const angle of angles) {
      const cx = this.centerX + Math.cos(angle) * this.orbitRadius;
      const cy = this.centerY + Math.sin(angle) * this.orbitRadius;
      for (let i = 0; i < particles; i++) {
        const spread = (Math.random() - 0.5) * 1.4;
        const theta = angle + spread;
        const speed = 1.1 + Math.random() * 1.5;
        const vx = Math.cos(theta) * speed;
        const vy = Math.sin(theta) * speed;
        const life = 20 + Math.random() * 18;
        const size = 1.2 + Math.random() * 1.5;
        this.shards.push({
          x: cx + (Math.random() - 0.5) * 6,
          y: cy + (Math.random() - 0.5) * 6,
          vx,
          vy,
          life,
          maxLife: life,
          size,
        });
      }
    }
  }

  _updateShards(dt) {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const p = this.shards[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.94, dt);
      p.vy *= Math.pow(0.94, dt);
      p.life -= dt;
      if (p.life <= 0) {
        this.shards.splice(i, 1);
      }
    }
  }

  _drawShards(ctx) {
    if (!this.shards.length) return;
    ctx.save();
    for (const p of this.shards) {
      const alpha = Math.max(0, p.life / p.maxLife) * 0.9;
      ctx.fillStyle = `rgba(170,170,170,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _computeDepthMax() {
    const requested = Number.isFinite(this.embedDepth)
      ? Math.max(5, this.embedDepth)
      : this.spikeLength;
    const limit = Math.max(5, this.orbitRadius - 12);
    return Math.min(limit, Math.max(this.spikeLength, requested));
  }
}
