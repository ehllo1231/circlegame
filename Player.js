// Player 클래스 - 주인공 관리
export class Player {
    constructor(centerX, centerY, orbitRadius, playerRadius) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.orbitRadius = orbitRadius;
        this.radius = playerRadius;
        this.angle = 0;
        this.speed = 0.013; // 라디안/프레임
        this.rotationDirection = 1; // 1: 시계방향, -1: 시계반대방향
    }
    
    update() {
        this.angle += this.speed * this.rotationDirection;
    }
    
    draw(ctx) {
        const playerX = this.centerX + Math.cos(this.angle) * this.orbitRadius;
        const playerY = this.centerY + Math.sin(this.angle) * this.orbitRadius;
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(playerX, playerY, this.radius, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    reverseDirection() {
        this.rotationDirection *= -1;
    }
}
