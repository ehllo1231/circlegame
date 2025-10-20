import { Obstacle } from './Obstacle.js';

export class Stage2PrologObstacle extends Obstacle {
  constructor({ angle, radius, baseWidth, length, color = '#ff2d2d', pointOutward = false }) {
    const effectiveLength = pointOutward ? -Math.abs(length) : length;
    super(angle, radius, 0, baseWidth, effectiveLength, 0);
    this.color = color;
    this.ignoreCollision = false;
  }

  update() {
    // Static obstacle during prolog.
  }

  draw(ctx, centerX, centerY) {
    ctx.save();
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
}
