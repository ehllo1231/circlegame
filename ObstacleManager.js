import { Obstacle } from './Obstacle.js';
import { OBSTACLE, SPAWN, PARTICLES } from './Config.js';

// ObstacleManager - obstacle updates, spawning, and particle effects
export class ObstacleManager {
    constructor(centerX, centerY, orbitRadius) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.orbitRadius = orbitRadius;
        this.obstacles = [];

        // Spawn interval and counter
        this.spawnInterval = (SPAWN && typeof SPAWN.baseInterval === 'number') ? SPAWN.baseInterval : 90;
        this.frameCounter = 0;

        // Score-based spawn acceleration
        this.spawnAccelEvery = (SPAWN && typeof SPAWN.accelEverySeconds === 'number') ? SPAWN.accelEverySeconds : 30;
        this.spawnAccelFactor = (SPAWN && typeof SPAWN.accelFactor === 'number') ? SPAWN.accelFactor : 1.2;
        this.lastSpawnAccelStage = 0;

        // Obstacle dimensions
        this.baseWidth = (OBSTACLE && typeof OBSTACLE.baseWidth === 'number') ? OBSTACLE.baseWidth : 24;
        this.length = (OBSTACLE && typeof OBSTACLE.length === 'number') ? OBSTACLE.length : 37.5;

        // Falling speed base and randomization multipliers
        this.speed = (OBSTACLE && typeof OBSTACLE.baseSpeed === 'number') ? OBSTACLE.baseSpeed : 3; // px/frame
        this.speedMinMul = (OBSTACLE && typeof OBSTACLE.speedMinMul === 'number') ? OBSTACLE.speedMinMul : 0.7;
        this.speedMaxMul = (OBSTACLE && typeof OBSTACLE.speedMaxMul === 'number') ? OBSTACLE.speedMaxMul : 1.3;

        // Particle settings
        this.particleCount = (PARTICLES && typeof PARTICLES.count === 'number') ? PARTICLES.count : 8;
        this.particleMinSpeed = (PARTICLES && typeof PARTICLES.minSpeed === 'number') ? PARTICLES.minSpeed : 1.2;
        this.particleMaxSpeed = (PARTICLES && typeof PARTICLES.maxSpeed === 'number') ? PARTICLES.maxSpeed : 3.4;
        this.particleMinLife = (PARTICLES && typeof PARTICLES.minLife === 'number') ? PARTICLES.minLife : 18;
        this.particleMaxLife = (PARTICLES && typeof PARTICLES.maxLife === 'number') ? PARTICLES.maxLife : 29;
        this.particleMinSize = (PARTICLES && typeof PARTICLES.minSize === 'number') ? PARTICLES.minSize : 1;
        this.particleMaxSize = (PARTICLES && typeof PARTICLES.maxSize === 'number') ? PARTICLES.maxSize : 3;
        this.particleDamping = (PARTICLES && typeof PARTICLES.damping === 'number') ? PARTICLES.damping : 0.98;
        this.particles = [];

        // Gravity-like acceleration toward center (configurable)
        this.gravityAcc = (OBSTACLE && typeof OBSTACLE.gravityAcc === 'number') ? OBSTACLE.gravityAcc : 0;
        // Constant-speed mode
        this.constantSpeedEnabled = !!(OBSTACLE && OBSTACLE.constantSpeedEnabled === true);
        this.constantSpeed = (OBSTACLE && typeof OBSTACLE.constantSpeed === 'number') ? OBSTACLE.constantSpeed : this.speed;

        // Multi-spawn configuration and angular separation
        this.multiWeights = Array.isArray(SPAWN?.multiCountWeights) && SPAWN.multiCountWeights.length > 0
          ? SPAWN.multiCountWeights.slice()
          : [1, 0, 0, 0, 0, 0, 0, 0];
        this.minSep = (SPAWN && typeof SPAWN.minAngularSeparationDeg === 'number') ? (SPAWN.minAngularSeparationDeg * Math.PI / 180) : 0;
        this.angleHistorySize = (SPAWN && typeof SPAWN.angleHistorySize === 'number') ? SPAWN.angleHistorySize : 32;
        this.recentAngles = [];
    }

    refreshFromConfig() {
        // Re-read config values live (for debug panel)
        if (typeof SPAWN?.baseInterval === 'number') this.spawnInterval = SPAWN.baseInterval;
        if (typeof SPAWN?.accelEverySeconds === 'number') this.spawnAccelEvery = SPAWN.accelEverySeconds;
        if (typeof SPAWN?.accelFactor === 'number') this.spawnAccelFactor = SPAWN.accelFactor;
        if (Array.isArray(SPAWN?.multiCountWeights) && SPAWN.multiCountWeights.length > 0) {
            this.multiWeights = SPAWN.multiCountWeights.slice();
        }

        if (typeof OBSTACLE?.baseWidth === 'number') this.baseWidth = OBSTACLE.baseWidth;
        if (typeof OBSTACLE?.length === 'number') this.length = OBSTACLE.length;
        if (typeof OBSTACLE?.baseSpeed === 'number') this.speed = OBSTACLE.baseSpeed;
        if (typeof OBSTACLE?.speedMinMul === 'number') this.speedMinMul = OBSTACLE.speedMinMul;
        if (typeof OBSTACLE?.speedMaxMul === 'number') this.speedMaxMul = OBSTACLE.speedMaxMul;
        if (typeof OBSTACLE?.gravityAcc === 'number') this.gravityAcc = OBSTACLE.gravityAcc;
        this.constantSpeedEnabled = !!OBSTACLE?.constantSpeedEnabled;
        if (typeof OBSTACLE?.constantSpeed === 'number') this.constantSpeed = OBSTACLE.constantSpeed;
    }
    // Score-based difficulty: shrink spawn interval stepwise
    applySpawnAcceleration(visibleScore) {
        if (typeof visibleScore !== 'number' || !isFinite(visibleScore)) return;
        const stage = Math.floor(visibleScore / this.spawnAccelEvery);
        if (stage > this.lastSpawnAccelStage) {
            const steps = stage - this.lastSpawnAccelStage;
            for (let i = 0; i < steps; i++) {
                const minCap = (SPAWN && typeof SPAWN.minInterval === 'number') ? SPAWN.minInterval : 1;
                this.spawnInterval = Math.max(minCap, Math.round(this.spawnInterval / this.spawnAccelFactor));
            }
            this.lastSpawnAccelStage = stage;
        }
    }

    spawnObstacle(offscreenRadius) {
        const count = this._chooseCount(this.multiWeights);
        const step = (Math.PI * 2) / count; // equal division
        let baseAngle = Math.random() * Math.PI * 2;
        if (this.minSep > 0 && this.recentAngles.length > 0) {
            let attempts = 0;
            const maxAttempts = 24;
            while (attempts < maxAttempts) {
                const candidate = [];
                for (let i = 0; i < count; i++) candidate.push(this._normAngle(baseAngle + i * step));
                if (this._anglesAreSeparated(candidate, this.recentAngles, this.minSep)) break;
                baseAngle = this._normAngle(baseAngle + step * (0.25 + Math.random() * 0.5));
                attempts++;
            }
        }
        const spawned = [];
        // Pick batch speed once (constant-speed mode overrides randomness)
        const batchSpeed = this.constantSpeedEnabled
            ? this.constantSpeed
            : (this.speed * (this.speedMinMul + Math.random() * (this.speedMaxMul - this.speedMinMul)));
        const accel = this.constantSpeedEnabled ? 0 : this.gravityAcc;
        for (let i = 0; i < count; i++) {
            const angle = this._normAngle(baseAngle + i * step);
            this.obstacles.push(new Obstacle(angle, offscreenRadius, batchSpeed, this.baseWidth, this.length, accel));
            spawned.push(angle);
        }
        this.recentAngles.push(...spawned);
        if (this.recentAngles.length > this.angleHistorySize) {
            this.recentAngles.splice(0, this.recentAngles.length - this.angleHistorySize);
        }
    }

    _chooseCount(weights) {
        // weights for counts 1..N (N = weights.length, up to 8 supported)
        const w = weights.map(v => (typeof v === 'number' && v > 0 ? v : 0));
        const n = Math.max(1, w.length);
        const sum = w.reduce((a, b) => a + b, 0);
        if (sum <= 0) return 1;
        const r = Math.random() * sum;
        let acc = 0;
        for (let i = 0; i < n; i++) {
            acc += w[i];
            if (r < acc) return i + 1;
        }
        return 1;
    }

    _normAngle(a) {
        a = a % (Math.PI * 2);
        return a < 0 ? a + Math.PI * 2 : a;
    }

    _wrapAngle(a) {
        a = (a + Math.PI) % (Math.PI * 2);
        if (a < 0) a += Math.PI * 2;
        return a - Math.PI;
    }

    _anglesAreSeparated(cands, hist, minSep) {
        for (const c of cands) {
            for (const h of hist) {
                const d = Math.abs(this._wrapAngle(c - h));
                if (d < minSep) return false;
            }
        }
        return true;
    }

    update(dt = 1) {
        this.frameCounter += dt;

        // Update existing obstacles and remove when needed
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.update(dt);

            if (obstacle.isCollidingWithOrbit(this.orbitRadius)) {
                this.spawnImpactShards(obstacle.angle, obstacle);
                this.obstacles.splice(i, 1);
            } else if (obstacle.isOffScreen()) {
                this.obstacles.splice(i, 1);
            }
        }

        // Update particle system
        this.updateParticles();
    }

    draw(ctx) {
        this.obstacles.forEach(obstacle => {
            obstacle.draw(ctx, this.centerX, this.centerY);
        });
        // Draw particles
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
            const life = Math.max(1, Math.floor(baseLife * 1.5));
            this.particles.push({ x: px, y: py, vx, vy, size, life, maxLife: life });
        }
    }

    updateParticles(dt = 1) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            const damp = (typeof this.particleDamping === 'number') ? this.particleDamping : 0.98;
            const dampPow = Math.pow(damp, dt);
            p.vx *= dampPow;
            p.vy *= dampPow;
            p.life -= dt;
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
