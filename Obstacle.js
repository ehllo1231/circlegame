// Obstacle 클래스 - 장애물 관리
export class Obstacle {
    constructor(angle, radius, speed) {
        this.angle = angle;
        this.radius = radius;
        this.speed = speed;
        this.baseWidth = 16;
        this.length = 25;
    }
    
    update() {
        this.radius -= this.speed;
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
