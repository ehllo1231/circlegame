import { Player } from './Player.js';
import { ObstacleManager } from './ObstacleManager.js';
import { RhythmEffect } from './RhythmEffect.js';
import { SnowEffect } from './SnowEffect.js';
import { UIController } from './UIController.js';
import { InputController } from './InputController.js';
import { Score } from './Score.js';
import { ORBIT, PLAYER, SNOW, OBSTACLE } from './Config.js';
import { resetAllConfigToDefaults } from './ConfigDefaults.js';
import { DebugController } from './DebugController.js';
import { Stage1 } from './Stage1.js';
import { StageSpikeEvent } from './StageSpikeEvent.js';

// Game - main controller
export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2;
        this.orbitRadius = ORBIT?.radius ?? 160;
        this.playerRadius = PLAYER?.radius ?? 15;
        this.offscreenRadius = Math.hypot(canvas.width / 2, canvas.height / 2) + 40;

        // Entities
        this.player = new Player(this.centerX, this.centerY, this.orbitRadius, this.playerRadius);
        this.obstacleManager = new ObstacleManager(this.centerX, this.centerY, this.orbitRadius);
        this.rhythmEffect = new RhythmEffect();
        this.snow = new SnowEffect();
        this.debugMode = false;
        this.playerHitFlash = 0; // frames at 60fps for red flash
        this.fastForwardNextStart = false;
        this.stageSpikeEvent = this.createStageSpikeEvent();
        this.debug = new DebugController({
            onChange: (section) => {
                if (section === 'spawn' || section === 'obstacle' || section === 'particles') {
                    if (this.obstacleManager?.refreshFromConfig) this.obstacleManager.refreshFromConfig();
                    if (section === 'obstacle') {
                        this.stageSpikeEvent = this.createStageSpikeEvent();
                    }
                }
                if (section === 'player') {
                    // Apply PLAYER config directly to current player
                    this.player.speed = (PLAYER && typeof PLAYER.angularSpeed === 'number') ? PLAYER.angularSpeed : this.player.speed;
                    this.player.radius = (PLAYER && typeof PLAYER.radius === 'number') ? PLAYER.radius : this.player.radius;
                    this.playerRadius = this.player.radius;
                }
            }
        });

        // State
        this.gameStarted = false;
        this.gameOver = false;
        this.animationId = null;
        this.score = new Score();
        this._lastTime = null;

        // UI / Input
        this.ui = new UIController();
        this.input = new InputController();

        // Stage manager (Stage1)
        this.stage = new Stage1();
        if (this.stage && typeof this.stage.getTotalDuration === 'function') {
            this.score.setMaxSeconds(this.stage.getTotalDuration());
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.ui.bind({ onStart: () => this.startGame(), onRestart: () => this.restartGame() });
        this.input.bindHandlers({
            onStart: () => { if (!this.gameStarted) this.startGame(); },
            onRestart: () => { if (this.gameOver) this.restartGame(); },
            onReverse: () => { if (this.gameStarted && !this.gameOver) this.player.reverseDirection(); },
            onDebugToggle: () => {
                // Only allow toggling debug from start screen per requirement
                if (!this.gameStarted) {
                    this.debugMode = !this.debugMode;
                    this.debug.toggle(this.debugMode);
                }
            },
            onFastForward: () => this.enableFastForwardDebug(),
        });
        this.input.attach();
    }

    startGame() {
        this.gameStarted = true;
        this.gameOver = false;
        this.score.reset();
        this.ui.hideOverlays();
        if (this.fastForwardNextStart) {
            this.applyFastForwardStageEnd();
            this.fastForwardNextStart = false;
        }
        // key handling is now driven purely by Config (CONTROLS.reverseUseAlphabet / reverseOn)
        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }

    gameOverScreenShow() {
        this.gameOver = true;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // Final score and high score handling
        const finalScore = this.score.getVisible();
        let high = 0;
        try {
            const v = localStorage.getItem('orbit_high_score');
            high = v ? parseInt(v, 10) : 0;
        } catch (_) { high = 0; }
        let isNew = false;
        if (!Number.isFinite(high) || high < 0) high = 0;
        if (finalScore > high) {
            high = finalScore;
            try { localStorage.setItem('orbit_high_score', String(high)); } catch (_) {}
            isNew = true;
        }
        this.ui.showGameOver(finalScore, high, isNew);
    }

    restartGame() {
        // Reset all config objects to their initial defaults
        resetAllConfigToDefaults();

        // Reset state
        this.gameOver = false;
        this.gameStarted = false;
        this.playerHitFlash = 0;
        this.score.reset();

        // Re-read orbit/player radii from (now-reset) config
        this.orbitRadius = ORBIT?.radius ?? this.orbitRadius;
        this.playerRadius = PLAYER?.radius ?? this.playerRadius;
        this.stageSpikeEvent = this.createStageSpikeEvent();

        // Recreate entities using refreshed config
        this.player = new Player(this.centerX, this.centerY, this.orbitRadius, this.playerRadius);
        this.obstacleManager = new ObstacleManager(this.centerX, this.centerY, this.orbitRadius);
        this.rhythmEffect = new RhythmEffect();
        if (this.snow && this.snow.reset) this.snow.reset();

        // Recreate stage so phase-driven config starts fresh
        this.stage = new Stage1();
        if (this.stage && typeof this.stage.getTotalDuration === 'function') {
            this.score.setMaxSeconds(this.stage.getTotalDuration());
        }
        this.fastForwardNextStart = false;

        // Hide overlays and immediately start
        this.ui.hideOverlays();
        this.startGame();
    }

    drawOrbit() {
        this.ctx.strokeStyle = ORBIT.color;
        this.ctx.lineWidth = ORBIT.lineWidth;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.orbitRadius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    animate(now) {
        if (!this.gameOver) {
            const dt = this._lastTime == null ? 1 : Math.min(3, (now - this._lastTime) / (1000 / 60));
            this._lastTime = now;
            // time-based scoring via Score module
            this.score.update(now);

            const secondsElapsed = this.score.getSeconds();

            // Stage update and apply baseInterval on phase change (disabled in debug)
            if (this.stage && !this.debugMode) {
                this.stage.update(secondsElapsed);
                if (this.stage.changed) {
                    const bi = this.stage.getCurrentBaseInterval();
                    if (typeof bi === 'number') {
                        this.obstacleManager.spawnInterval = bi;
                        this.obstacleManager.frameCounter = 0;
                        if (typeof this.obstacleManager.lastSpawnAccelStage === 'number') {
                            this.obstacleManager.lastSpawnAccelStage = 0;
                        }
                    }
                    if (!this.stage.isSnowEnabled() && this.snow && typeof this.snow.reset === 'function') {
                        this.snow.reset();
                    }
                }
            }

            if (this.stageSpikeEvent) {
                this.stageSpikeEvent.setGeometry(this.centerX, this.centerY, this.orbitRadius);
            }

            const stageFinished = this.stage ? this.stage.isFinished() : false;
            const stageFadeComplete = stageFinished && this.stage && typeof this.stage.hasFadeCompleted === 'function'
                ? this.stage.hasFadeCompleted()
                : false;
            if (this.stageSpikeEvent) {
                if (!stageFinished) {
                    this.stageSpikeEvent.reset();
                } else if (stageFadeComplete) {
                    this.stageSpikeEvent.start();
                }
                this.stageSpikeEvent.update(dt);
            }
            if (stageFinished) {
                if (this.rhythmEffect && typeof this.rhythmEffect.reset === 'function') {
                    this.rhythmEffect.reset();
                }
            } else {
                this.rhythmEffect.update(dt);
            }

            // Clear screen
            // Ensure a clean transform each frame to avoid accumulated transforms across restarts
            if (this.ctx.setTransform) {
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
            if (this.stageSpikeEvent) {
                const shake = this.stageSpikeEvent.getShakeOffset();
                if (shake && (shake.x || shake.y)) {
                    this.ctx.translate(shake.x, shake.y);
                }
            }
            // Background color (stage fade after end) — in debug, keep static
            const bg = (this.debugMode || !this.stage) ? '#000000' : (this.stage.getBackgroundColor() || '#000000');
            this.ctx.fillStyle = bg || '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            if (this.stageSpikeEvent) {
                this.stageSpikeEvent.draw(this.ctx);
            }

            // Background snow (no rhythm transform)
            if (this.snow && typeof this.snow.update === 'function') {
                // Only start after configured seconds; SnowEffect itself is cheap if nothing to draw
                const startAt = (typeof SNOW?.enabledAfterSeconds === 'number') ? SNOW.enabledAfterSeconds : 10;
                const snowOk = this.debugMode ? true : (this.stage ? this.stage.isSnowEnabled() : true);
                if (snowOk && secondsElapsed >= startAt) {
                    this.snow.update(dt, this.canvas.width, this.canvas.height);
                    this.snow.draw(this.ctx);
                }
            }

            // Apply rhythm effect ONLY to background orbit
            const rhythmActive = !stageFinished;
            if (rhythmActive) {
                this.rhythmEffect.applyTransform(this.ctx, this.centerX, this.centerY);
            }
            this.drawOrbit();
            if (rhythmActive) {
                this.rhythmEffect.restoreTransform(this.ctx);
            }

            // Update obstacles (no rhythm effect)
            this.obstacleManager.update(dt);

            // Collision (no active transform)
            for (const obstacle of this.obstacleManager.obstacles) {
                if (this.player.checkCollisionWithObstacle(obstacle)) {
                    if (!this.debugMode) {
                        this.gameOverScreenShow();
                        return;
                    } else {
                        // trigger brief red flash
                        this.playerHitFlash = Math.max(this.playerHitFlash, 6);
                    }
                }
            }
            if (this.stageSpikeEvent) {
                for (const spike of this.stageSpikeEvent.getActiveSpikes()) {
                    if (this.player.checkCollisionWithObstacle(spike)) {
                        if (!this.debugMode) {
                            this.gameOverScreenShow();
                            return;
                        } else {
                            this.playerHitFlash = Math.max(this.playerHitFlash, 6);
                        }
                    }
                }
            }

            // Draw obstacles (no rhythm effect)
            this.obstacleManager.draw(this.ctx);

            // Spawn acceleration by score (displayed seconds)
            const visibleScore = this.score.getVisible();
            this.obstacleManager.applySpawnAcceleration(visibleScore);

            // Spawn
            const allowSpawn = this.debugMode ? true : (this.stage ? this.stage.canSpawn() : true);
            if (allowSpawn && this.obstacleManager.shouldSpawn()) {
                this.obstacleManager.spawnObstacle(this.offscreenRadius);
                this.obstacleManager.resetSpawnTimer();
            }

            // Player (apply rhythm effect ONLY to the player)
            this.player.update(dt);
            if (rhythmActive) {
                this.rhythmEffect.applyTransform(this.ctx, this.centerX, this.centerY);
            }
            // flash effect
            if (this.playerHitFlash > 0) {
                this.player.color = '#ff4444';
                this.playerHitFlash = Math.max(0, this.playerHitFlash - dt);
            } else {
                this.player.color = '#ffffff';
            }
            this.player.draw(this.ctx);
            if (rhythmActive) {
                this.rhythmEffect.restoreTransform(this.ctx);
            }

            // Draw score or debug label
            if (this.debugMode) {
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
                const sizePx = Math.max(16, Math.floor(this.orbitRadius * 0.33));
                this.ctx.font = `${sizePx}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('Debug Mode', this.centerX, this.centerY);
                this.ctx.restore();
            } else {
                const hideScore = stageFinished
                    ? true
                    : (this.stage && typeof this.stage.shouldHideScore === 'function'
                        ? this.stage.shouldHideScore()
                        : false);
                if (!hideScore) {
                    this.ui.drawScore(this.ctx, this.score.getDisplaySeconds(), this.centerX, this.centerY, this.orbitRadius);
                }
            }
        }

        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }

    enableFastForwardDebug() {
        if (this.gameStarted) return;
        this.fastForwardNextStart = true;
    }

    applyFastForwardStageEnd() {
        const totalDuration = (this.stage && typeof this.stage.getTotalDuration === 'function')
            ? this.stage.getTotalDuration()
            : this.score.maxSeconds;
        if (this.stage) {
            if (typeof this.stage.fastForwardToEnd === 'function') {
                this.stage.fastForwardToEnd();
            } else if (typeof this.stage.update === 'function' && Number.isFinite(totalDuration)) {
                this.stage.update(totalDuration);
            }
            if (Number.isFinite(totalDuration)) {
                this.stage.totalElapsed = totalDuration;
                this.stage.changed = true;
            }
        }
        if (Number.isFinite(totalDuration)) {
            this.score.seconds = totalDuration;
        }
        if (this.snow && typeof this.snow.reset === 'function') {
            this.snow.reset();
        }
        this.stageSpikeEvent = this.createStageSpikeEvent();
        if (this.obstacleManager) {
            this.obstacleManager.obstacles.length = 0;
            if (typeof this.obstacleManager.resetSpawnTimer === 'function') {
                this.obstacleManager.resetSpawnTimer();
            }
        }
    }

    createStageSpikeEvent() {
        const obstacleLength = (typeof OBSTACLE?.length === 'number') ? OBSTACLE.length : 40;
        const embedDepth = Math.max(20, Math.min(this.orbitRadius - 12, Math.max(obstacleLength, this.orbitRadius * 0.35)));
        return new StageSpikeEvent({
            centerX: this.centerX,
            centerY: this.centerY,
            orbitRadius: this.orbitRadius,
            spikeLength: obstacleLength,
            baseWidth: (typeof OBSTACLE?.baseWidth === 'number') ? OBSTACLE.baseWidth : 24,
            embedDepth,
        });
    }
}
