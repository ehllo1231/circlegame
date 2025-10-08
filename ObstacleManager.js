import { Obstacle } from './Obstacle.js';

// ObstacleManager 클래스 - 장애물 관리
export class ObstacleManager {
    constructor(centerX, centerY, orbitRadius) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.orbitRadius = orbitRadius;
        this.obstacles = [];
        this.spawnInterval = 90; // 프레임 기준
        this.frameCounter = 0;
        this.baseWidth = 16;
        this.length = 25;
        this.speed = 3;
    }
    
    spawnObstacle(offscreenRadius) {
        const angle = Math.random() * Math.PI * 2;
        this.obstacles.push(new Obstacle(angle, offscreenRadius, this.speed));
    }
    
    update() {
        this.frameCounter++;
        
        // 기존 장애물들 업데이트
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.update();
            
            // 궤도와 충돌하거나 화면 밖으로 나간 경우 제거
            if (obstacle.isCollidingWithOrbit(this.orbitRadius) || obstacle.isOffScreen()) {
                this.obstacles.splice(i, 1);
            }
        }
    }
    
    draw(ctx) {
        this.obstacles.forEach(obstacle => {
            obstacle.draw(ctx, this.centerX, this.centerY);
        });
    }
    
    shouldSpawn() {
        return this.frameCounter >= this.spawnInterval;
    }
    
    resetSpawnTimer() {
        this.frameCounter = 0;
    }
}
