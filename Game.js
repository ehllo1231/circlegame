import { Player } from './Player.js';
import { ObstacleManager } from './ObstacleManager.js';
import { RhythmEffect } from './RhythmEffect.js';
import { SnowEffect } from './SnowEffect.js';
import { UIController } from './UIController.js';
import { InputController } from './InputController.js';
import { Score } from './Score.js';
import { ORBIT, PLAYER, SNOW } from './Config.js';
import { DebugController } from './DebugController.js';

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
        this.debug = new DebugController({
            onChange: (section) => {
                if (section === 'spawn' || section === 'obstacle' || section === 'particles') {
                    if (this.obstacleManager?.refreshFromConfig) this.obstacleManager.refreshFromConfig();
                }
                if (section === 'player') {
                    // Apply PLAYER config directly to current player
                    this.player.speed = (PLAYER && typeof PLAYER.angularSpeed === 'number') ? PLAYER.angularSpeed : this.player.speed;
                    this.player.radius = (PLAYER && typeof PLAYER.radius === 'number') ? PLAYER.radius : this.player.radius;
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
        });
        this.input.attach();
    }

    startGame() {
        this.gameStarted = true;
        this.gameOver = false;
        this.score.reset();
        this.ui.hideOverlays();
        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }

    gameOverScreenShow() {
        this.gameOver = true;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // Final score (seconds) on game over screen
        this.ui.showGameOver(this.score.getVisible());
    }

    restartGame() {
        // Reset state
        this.gameOver = false;
        this.gameStarted = false;
        this.score.reset();

        // Recreate entities
        this.player = new Player(this.centerX, this.centerY, this.orbitRadius, this.playerRadius);
        this.obstacleManager = new ObstacleManager(this.centerX, this.centerY, this.orbitRadius);
        this.rhythmEffect = new RhythmEffect();
        if (this.snow && this.snow.reset) this.snow.reset();

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

            // Update rhythm effect
            this.rhythmEffect.update(dt);

            // Clear screen
            // Ensure a clean transform each frame to avoid accumulated transforms across restarts
            if (this.ctx.setTransform) {
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Background snow (no rhythm transform)
            const secondsElapsed = this.score.getSeconds();
            if (this.snow && typeof this.snow.update === 'function') {
                // Only start after configured seconds; SnowEffect itself is cheap if nothing to draw
                const startAt = (typeof SNOW?.enabledAfterSeconds === 'number') ? SNOW.enabledAfterSeconds : 10;
                if (secondsElapsed >= startAt) {
                    this.snow.update(dt, this.canvas.width, this.canvas.height);
                    this.snow.draw(this.ctx);
                }
            }

            // Apply rhythm effect ONLY to background orbit
            this.rhythmEffect.applyTransform(this.ctx, this.centerX, this.centerY);
            this.drawOrbit();
            this.rhythmEffect.restoreTransform(this.ctx);

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

            // Draw obstacles (no rhythm effect)
            this.obstacleManager.draw(this.ctx);

            // Spawn acceleration by score (displayed seconds)
            const visibleScore = this.score.getVisible();
            this.obstacleManager.applySpawnAcceleration(visibleScore);

            // Spawn
            if (this.obstacleManager.shouldSpawn()) {
                this.obstacleManager.spawnObstacle(this.offscreenRadius);
                this.obstacleManager.resetSpawnTimer();
            }

            // Player (apply rhythm effect ONLY to the player)
            this.player.update(dt);
            this.rhythmEffect.applyTransform(this.ctx, this.centerX, this.centerY);
            // flash effect
            if (this.playerHitFlash > 0) {
                this.player.color = '#ff4444';
                this.playerHitFlash = Math.max(0, this.playerHitFlash - dt);
            } else {
                this.player.color = '#ffffff';
            }
            this.player.draw(this.ctx);
            this.rhythmEffect.restoreTransform(this.ctx);

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
                this.ui.drawScore(this.ctx, this.score.getSeconds(), this.centerX, this.centerY, this.orbitRadius);
            }
        }

        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }
}

