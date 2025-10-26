import { PLAYER } from './Config.js';
// Player ?대옒??- 二쇱씤怨?愿由?
export class Player {
    constructor(centerX, centerY, orbitRadius, playerRadius) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.orbitRadius = orbitRadius;
        this.radius = playerRadius;
        this.angle = 0;
        this.speed = (PLAYER && typeof PLAYER.angularSpeed === 'number') ? PLAYER.angularSpeed : 0.015; // angular speed
        this.rotationDirection = 1; // 1: ?쒓퀎諛⑺뼢, -1: ?쒓퀎諛섎?諛⑺뼢
    }
    
    update(dt = 1) {
        this.angle += this.speed * this.rotationDirection * dt;
    }
    
    draw(ctx) {
        const playerX = this.centerX + Math.cos(this.angle) * this.orbitRadius;
        const playerY = this.centerY + Math.sin(this.angle) * this.orbitRadius;
        
        ctx.fillStyle = this.color || '#ffffff';
        ctx.beginPath();
        ctx.arc(playerX, playerY, this.radius, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    reverseDirection() {
        this.rotationDirection *= -1;
    }

    setGeometry({ centerX, centerY, orbitRadius, radius }) {
        if (typeof centerX === 'number') this.centerX = centerX;
        if (typeof centerY === 'number') this.centerY = centerY;
        if (typeof orbitRadius === 'number') this.orbitRadius = orbitRadius;
        if (typeof radius === 'number') this.radius = radius;
    }
    
    // 二쇱씤怨듭쓽 ?꾩옱 ?꾩튂 醫뚰몴 諛섑솚
    getPosition() {
        return {
            x: this.centerX + Math.cos(this.angle) * this.orbitRadius,
            y: this.centerY + Math.sin(this.angle) * this.orbitRadius
        };
    }
    
    // ?μ븷臾쇨낵??異⑸룎 ?먯젙
    checkCollisionWithObstacle(obstacle) {
        const playerPos = this.getPosition();
        const playerRadius = this.radius;
        
        // ?μ븷臾쇱쓽 媛??먮뱾怨쇱쓽 嫄곕━ 怨꾩궛
        const obstacleAngle = obstacle.angle;
        const obstacleRadius = obstacle.radius;
        const obstacleLength = obstacle.length;
        const obstacleBaseWidth = obstacle.baseWidth;
        
        // ?μ븷臾쇱쓽 ????醫뚰몴 怨꾩궛 (以묒떖 湲곗?)
        const centerX = this.centerX;
        const centerY = this.centerY;
        
        const obstacleCenterX = centerX + Math.cos(obstacleAngle) * obstacleRadius;
        const obstacleCenterY = centerY + Math.sin(obstacleAngle) * obstacleRadius;
        
        const obstacleTipX = centerX + Math.cos(obstacleAngle) * (obstacleRadius - obstacleLength);
        const obstacleTipY = centerY + Math.sin(obstacleAngle) * (obstacleRadius - obstacleLength);
        
        const obstacleBase1X = centerX + Math.cos(obstacleAngle + Math.PI/2) * (obstacleBaseWidth/2) + Math.cos(obstacleAngle) * obstacleRadius;
        const obstacleBase1Y = centerY + Math.sin(obstacleAngle + Math.PI/2) * (obstacleBaseWidth/2) + Math.sin(obstacleAngle) * obstacleRadius;
        
        const obstacleBase2X = centerX + Math.cos(obstacleAngle - Math.PI/2) * (obstacleBaseWidth/2) + Math.cos(obstacleAngle) * obstacleRadius;
        const obstacleBase2Y = centerY + Math.sin(obstacleAngle - Math.PI/2) * (obstacleBaseWidth/2) + Math.sin(obstacleAngle) * obstacleRadius;
        
        // ?먭낵 ?먯쓽 異⑸룎 ?먯젙 (媛꾨떒??諛⑸쾿)
        const points = [
            {x: obstacleCenterX, y: obstacleCenterY},
            {x: obstacleTipX, y: obstacleTipY},
            {x: obstacleBase1X, y: obstacleBase1Y},
            {x: obstacleBase2X, y: obstacleBase2Y}
        ];
        
        for (const point of points) {
            const distance = Math.sqrt(
                Math.pow(playerPos.x - point.x, 2) + 
                Math.pow(playerPos.y - point.y, 2)
            );
            
            if (distance < playerRadius + 5) { // 5???ъ쑀媛?
                return true;
            }
        }
        
        return false;
    }
}

