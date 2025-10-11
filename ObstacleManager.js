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
        // Default dimensions (kept for reference; Obstacle instances carry their own size)
        this.baseWidth = 24; 
        this.length = 37.5;  
        this.speed = 3;      // base falling speed (per frame)
        // Random speed range multipliers (0.5x ~ 1.2x)
        this.speedMinMul = 0.5;
        this.speedMaxMul = 1.2;
        // Configurable shard particle settings
        this.particleCount = 8;        // number of shards per impact
        this.particleMinSpeed = 1.2;   // px/frame
        this.particleMaxSpeed = 3.4;   // px/frame
        this.particleMinLife = 18;     // frames
        this.particleMaxLife = 29;     // frames (inclusive)
        this.particleMinSize = 1;      // px radius
        this.particleMaxSize = 3;      // px radius
        this.particles = [];
    }
    
    spawnObstacle(offscreenRadius) {
        const angle = Math.random() * Math.PI * 2;
        const mul = this.speedMinMul + Math.random() * (this.speedMaxMul - this.speedMinMul);
        const speed = this.speed * mul;
        this.obstacles.push(new Obstacle(angle, offscreenRadius, speed, this.baseWidth, this.length));
    }
    
    update() {
        this.frameCounter++;
        
        // 기존 장애물들 업데이트
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.update();
            
            // spawn shards on orbit hit
            if (obstacle.isCollidingWithOrbit(this.orbitRadius)) {
                this.spawnImpactShards(obstacle.angle, obstacle);
            }
            // 궤도와 충돌하거나 화면 밖으로 나간 경우 제거
            if (obstacle.isCollidingWithOrbit(this.orbitRadius) || obstacle.isOffScreen()) {
                this.obstacles.splice(i, 1);
            }
        }
        // update particles
        this.updateParticles();
    }
    
    draw(ctx) {
        this.obstacles.forEach(obstacle => {
            obstacle.draw(ctx, this.centerX, this.centerY);
        });
        this.drawParticles(ctx);
    }
    
    shouldSpawn() {
        return this.frameCounter >= this.spawnInterval;
    }
    
    resetSpawnTimer() {
        this.frameCounter = 0;
    }

    // --- Impact particle helpers ---
    spawnImpactShards(angle, obstacle) {
        // Count scales with obstacle speed (more shards when faster)
        // and with obstacle size (smaller spike -> fewer shards)
        const baseCount = this.particleCount;
        const baseSpeed = this.speed;
        const minMul = this.speedMinMul;
        const maxMul = this.speedMaxMul;
        const sp = Math.max(0, obstacle?.speed ?? baseSpeed);
        const minSpd = baseSpeed * minMul;
        const maxSpd = baseSpeed * maxMul;
        const speedFactor = maxSpd > minSpd ? Math.min(1, Math.max(0, (sp - minSpd) / (maxSpd - minSpd))) : 0;
        const ow = obstacle?.baseWidth ?? this.baseWidth;
        const sizeFactor = Math.max(0.4, Math.min(1.6, ow / this.baseWidth));
        const blend = 0.5 + speedFactor * 0.8; // 0.5x..1.3x by speed
        const count = Math.max(2, Math.round(baseCount * blend * sizeFactor));
        const cx = this.centerX;
        const cy = this.centerY;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        const px = cx + nx * this.orbitRadius;
        const py = cy + ny * this.orbitRadius;
        for (let i = 0; i < count; i++) {
            const theta = angle + (Math.random() - 0.5) * 1.8;
            const spd = this.particleMinSpeed + Math.random() * (this.particleMaxSpeed - this.particleMinSpeed);
            const vx = Math.cos(theta) * spd;
            const vy = Math.sin(theta) * spd;
            const size = this.particleMinSize + Math.random() * (this.particleMaxSize - this.particleMinSize);
            const lifeRange = Math.max(0, this.particleMaxLife - this.particleMinLife);
            const baseLife = this.particleMinLife + Math.floor(Math.random() * (lifeRange + 1));
            const life = Math.max(1, Math.floor(baseLife * 1.5));
            this.particles.push({ x: px, y: py, vx, vy, size, life, maxLife: life });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= 1;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    drawParticles(ctx) {
        for (const p of this.particles) {
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
