import { Obstacle } from './Obstacle.js';

export class Stage2PrologObstacle extends Obstacle {
  constructor({ angle, radius, baseWidth, length, color = '#ff2d2d', pointOutward = false }) {
    const effectiveLength = pointOutward ? -Math.abs(length) : length;
    super(angle, radius, 0, baseWidth, effectiveLength, 0);
    this.color = color;
    this.ignoreCollision = false;
    this.maskRadius = null;
  }

  update() {
    // Static obstacle during prolog.
  }

  draw(ctx, centerX, centerY) {
    ctx.save();
    const maskRadius = this.maskRadius;
    if (Number.isFinite(maskRadius) && maskRadius > 0 && ctx.canvas) {
      const { width, height } = ctx.canvas;
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.moveTo(centerX + maskRadius, centerY);
      ctx.arc(centerX, centerY, maskRadius, 0, Math.PI * 2, true);
      ctx.closePath();
      if (typeof ctx.clip === 'function') {
        try {
          ctx.clip('evenodd');
        } catch (_) {
          ctx.clip();
        }
      }
    }
    ctx.translate(centerX, centerY);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.moveTo(this.radius - this.length, 0);
    ctx.lineTo(this.radius, -this.baseWidth / 2);
    ctx.lineTo(this.radius, this.baseWidth / 2);
    ctx.closePath();

    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }

  setRadius(radius) {
    this.radius = radius;
  }

  setMaskRadius(radius) {
    this.maskRadius = Number.isFinite(radius) ? radius : null;
  }
}
