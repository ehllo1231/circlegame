// Obstacle 클래스 - 장애물 관리
export class Obstacle {
    constructor(angle, radius, speed, baseWidth = 24, length = 37.5, acceleration = 0) {
        this.angle = angle;
        this.radius = radius;
        this.speed = speed;
        // Allow explicit size from spawner; default to original if not provided
        this.baseWidth = baseWidth;
        this.length = length;
        this.acceleration = acceleration;
    }
    
    update(dt = 1) {
        this.radius -= this.speed * dt;
        this.speed += this.acceleration * dt;
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
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
    }
    
    isCollidingWithOrbit(orbitRadius) {
        return this.radius >= orbitRadius && (this.radius - this.length) <= orbitRadius;
    }
    
    isOffScreen() {
        return this.radius < -60;
    }
}
