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

    const baseRadius = this.radius;
    const tipRadius = this.radius - this.length;
    const span = Math.abs(tipRadius - baseRadius);
    if (span <= 0) {
      ctx.restore();
      return;
    }
    const halfWidth = this.baseWidth / 2;
    const apexRadius = tipRadius;

    const bodyPath = new Path2D();
    bodyPath.moveTo(apexRadius, 0);
    bodyPath.lineTo(baseRadius, -halfWidth);
    bodyPath.lineTo(baseRadius, halfWidth);
    bodyPath.closePath();

    const gradient = ctx.createLinearGradient(baseRadius, 0, tipRadius, 0);
    gradient.addColorStop(0, '#ff6161');
    gradient.addColorStop(0.45, '#ff3030');
    gradient.addColorStop(1, '#a10000');

    ctx.fillStyle = gradient;
    ctx.fill(bodyPath);

    ctx.save();
    ctx.clip(bodyPath);
    const stripeCount = 5;
    const stripeSpacing = span / (stripeCount + 0.5);
    const direction = tipRadius >= baseRadius ? 1 : -1;
    ctx.lineWidth = Math.max(1, this.baseWidth * 0.14);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineCap = 'round';
    for (let i = 0; i < stripeCount; i += 1) {
      const start = baseRadius + direction * stripeSpacing * (i + 0.4);
      const end = start + direction * stripeSpacing * 0.9;
      ctx.beginPath();
      ctx.moveTo(start, -halfWidth - 1);
      ctx.lineTo(end, halfWidth + 1);
      ctx.stroke();
    }
    ctx.restore();

    ctx.lineWidth = Math.max(1, this.baseWidth * 0.08);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(baseRadius, -halfWidth);
    ctx.lineTo(tipRadius, 0);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.moveTo(baseRadius, halfWidth);
    ctx.lineTo(tipRadius, 0);
    ctx.stroke();

    ctx.restore();
  }

  setRadius(radius) {
    this.radius = radius;
  }

  setMaskRadius(radius) {
    this.maskRadius = Number.isFinite(radius) ? radius : null;
  }
}
