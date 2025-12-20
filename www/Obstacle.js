// Obstacle 클래스 - 장애물 관리
export class Obstacle {
    constructor(angle, radius, speed, baseWidth = 24, length = 37.5, acceleration = 0, offscreenMargin = 60) {
        this.angle = angle;
        this.radius = radius;
        this.speed = speed;
        // Allow explicit size from spawner; default to original if not provided
        this.baseWidth = baseWidth;
        this.length = length;
        this.acceleration = acceleration;
        this.offscreenMargin = Number.isFinite(offscreenMargin) && offscreenMargin > 0 ? offscreenMargin : 60;
        this.color = '#ffffff';
    }
    
    update(dt = 1) {
        this.radius -= this.speed * dt;
        this.speed += this.acceleration * dt;
    }
    
    draw(ctx, centerX, centerY) {
        const drawLength = Number.isFinite(this.renderLength) ? this.renderLength : this.length;
        const drawBaseWidth = Number.isFinite(this.renderBaseWidth) ? this.renderBaseWidth : this.baseWidth;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.angle);
        
        ctx.beginPath();
        ctx.moveTo(this.radius - drawLength, 0);
        ctx.lineTo(this.radius, -drawBaseWidth / 2);
        ctx.lineTo(this.radius, drawBaseWidth / 2);
        ctx.closePath();
        ctx.fillStyle = this.color || '#ffffff';
        ctx.fill();
        ctx.restore();
    }
    
    isCollidingWithOrbit(orbitRadius) {
        return this.radius >= orbitRadius && (this.radius - this.length) <= orbitRadius;
    }
    
    isOffScreen() {
        const margin = Number.isFinite(this.offscreenMargin) && this.offscreenMargin > 0 ? this.offscreenMargin : 60;
        return this.radius < -margin;
    }
}
