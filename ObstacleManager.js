import { Obstacle } from './Obstacle.js';
import { OBSTACLE } from './Config.js';

// ObstacleManager - 장애물 관리 및 파편 효과, 스폰 가속 관리
export class ObstacleManager {
    constructor(centerX, centerY, orbitRadius) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.orbitRadius = orbitRadius;
        this.obstacles = [];

        // Spawn interval (frames)
        this.spawnInterval = 90; // 기본 스폰 간격
        this.frameCounter = 0;

        // 스폰 가속 설정(사용자 조정 가능)
        this.baseSpawnInterval = this.spawnInterval; // 기준값
        this.spawnAccelEvery = 7;   // 표시 점수(초) N마다 가속
        this.spawnAccelFactor = 1.2; // X배 빠르게(간격 감소)
        this.lastSpawnAccelStage = 0; // 마지막 적용 스테이지

        // Obstacle default dimensions (1.5x of original 16/25)
        this.baseWidth = 24;
        this.length = 37.5;

        // Falling speed base and randomization multipliers
        this.speed = 3;      // base falling speed (px/frame)
        this.speedMinMul = 0.7;
        this.speedMaxMul = 1.3;

        // Configurable shard particle settings
        this.particleCount = 8;        // number of shards per impact
        this.particleMinSpeed = 1.2;   // px/frame
        this.particleMaxSpeed = 3.4;   // px/frame
        this.particleMinLife = 18;     // frames
        this.particleMaxLife = 29;     // frames (inclusive)
        this.particleMinSize = 1;      // px radius
        this.particleMaxSize = 3;      // px radius
        this.particles = [];

        // Gravity-like acceleration toward center (configurable)
        this.gravityAcc = (OBSTACLE && typeof OBSTACLE.gravityAcc === 'number') ? OBSTACLE.gravityAcc : 0;
    }

    // 점수(초 단위 표시값)에 따라 스폰 간격 가속 적용
    applySpawnAcceleration(visibleScore) {
        if (typeof visibleScore !== 'number' || !isFinite(visibleScore)) return;
        const stage = Math.floor(visibleScore / this.spawnAccelEvery);
        if (stage > this.lastSpawnAccelStage) {
            const steps = stage - this.lastSpawnAccelStage;
            for (let i = 0; i < steps; i++) {
                this.spawnInterval = Math.max(1, Math.round(this.spawnInterval / this.spawnAccelFactor));
            }
            this.lastSpawnAccelStage = stage;
        }
    }

    spawnObstacle(offscreenRadius) {
        const angle = Math.random() * Math.PI * 2;
        const mul = this.speedMinMul + Math.random() * (this.speedMaxMul - this.speedMinMul);
        const speed = this.speed * mul;
        this.obstacles.push(new Obstacle(angle, offscreenRadius, speed, this.baseWidth, this.length, this.gravityAcc));
    }

    update() {
        this.frameCounter++;

        // 기존 장애물 업데이트 및 제거
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.update();

            if (obstacle.isCollidingWithOrbit(this.orbitRadius)) {
                this.spawnImpactShards(obstacle.angle, obstacle);
                this.obstacles.splice(i, 1);
            } else if (obstacle.isOffScreen()) {
                this.obstacles.splice(i, 1);
            }
        }

        // 파편 업데이트
        this.updateParticles();
    }

    draw(ctx) {
        this.obstacles.forEach(obstacle => {
            obstacle.draw(ctx, this.centerX, this.centerY);
        });
        // 파편 그리기
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
        // Count scales with obstacle speed and size
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
            const life = Math.max(1, Math.floor(baseLife * 1.5)); // 1.5배 연장
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

