// Player 클래스 - 주인공 관리
export class Player {
    constructor(centerX, centerY, orbitRadius, playerRadius) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.orbitRadius = orbitRadius;
        this.radius = playerRadius;
        this.angle = 0;
        this.speed = 0.015; // 라디안/프레임
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
    
    // 주인공의 현재 위치 좌표 반환
    getPosition() {
        return {
            x: this.centerX + Math.cos(this.angle) * this.orbitRadius,
            y: this.centerY + Math.sin(this.angle) * this.orbitRadius
        };
    }
    
    // 장애물과의 충돌 판정
    checkCollisionWithObstacle(obstacle) {
        const playerPos = this.getPosition();
        const playerRadius = this.radius;
        
        // 장애물의 각 점들과의 거리 계산
        const obstacleAngle = obstacle.angle;
        const obstacleRadius = obstacle.radius;
        const obstacleLength = obstacle.length;
        const obstacleBaseWidth = obstacle.baseWidth;
        
        // 장애물의 세 점 좌표 계산 (중심 기준)
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
        
        // 점과 원의 충돌 판정 (간단한 방법)
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
            
            if (distance < playerRadius + 5) { // 5는 여유값
                return true;
            }
        }
        
        return false;
    }
}
