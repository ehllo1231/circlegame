import { Player } from './Player.js';
import { ObstacleManager } from './ObstacleManager.js';
import { RhythmEffect } from './RhythmEffect.js';
import { SnowEffect } from './SnowEffect.js';
import { UIController } from './UIController.js';
import { InputController } from './InputController.js';
import { Score } from './Score.js';
import { ORBIT, PLAYER, SNOW } from './Config.js';
import { resetAllConfigToDefaults } from './ConfigDefaults.js';
import { DebugController } from './DebugController.js';
import { Stage1 } from './Stage1.js';
import { Stage2 } from './Stage2.js';

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
        this.player = null;
        this.obstacleManager = null;
        this.rhythmEffect = null;
        this.snow = null;
        this.debugMode = false;
        this.playerHitFlash = 0; // frames at 60fps for red flash
        this.fastForwardNextStart = false;
        this.debug = new DebugController({
            onChange: (section) => {
                if (section === 'spawn' || section === 'obstacle' || section === 'particles') {
                    if (this.obstacleManager?.refreshFromConfig) this.obstacleManager.refreshFromConfig();
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

        // Stage registry
        this.stageMap = {
            stage1: Stage1,
            stage2: Stage2,
        };
        this.stageOrder = ['stage1', 'stage2'];
        this.selectedStage = 'stage1';

        // Stages
        this.stageQueue = [];
        this.stageIndex = 0;
        this.stageStartSeconds = 0;
        this.totalStageDuration = Infinity;
        this._initStages(this.selectedStage);
        this._recreateEntities();
        if (this.ui && typeof this.ui.setStageSelection === 'function') {
            this.ui.setStageSelection(this.selectedStage);
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.ui.bind({
            onStart: () => this.startGame(),
            onRestart: () => this.restartGame(),
            onStageSelect: (stageId) => this.setSelectedStage(stageId),
            onStageSelectScreen: () => this.returnToStageSelect(),
        });
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
        resetAllConfigToDefaults();

        this.gameOver = false;
        this.gameStarted = false;
        this.fastForwardNextStart = false;
        this._lastTime = null;
        this.score.reset();

        this._syncRadiiFromConfig();
        this._initStages(this.selectedStage);
        this._recreateEntities();

        this.ui.hideOverlays();
        this.startGame();
    }

    setSelectedStage(stageId) {
        if (!stageId || !this.stageMap || typeof this.stageMap[stageId] !== 'function') return;
        this.selectedStage = stageId;
        if (!this.gameStarted) {
            this._lastTime = null;
            this.score.reset();
            this.fastForwardNextStart = false;
            this._syncRadiiFromConfig();
            this._initStages(stageId);
            this._recreateEntities();
        }
        if (this.ui && typeof this.ui.setStageSelection === 'function') {
            this.ui.setStageSelection(stageId);
        }
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
            const stageElapsed = this.stage ? Math.max(0, secondsElapsed - (this.stageStartSeconds ?? 0)) : 0;

            // Stage update and apply baseInterval on phase change (disabled in debug)
            if (this.stage && !this.debugMode) {
                this.stage.update(stageElapsed);
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

            let stageFinished = this.stage ? this.stage.isFinished() : false;
            if (stageFinished && this.stage && this.stageIndex < (Array.isArray(this.stageQueue) ? this.stageQueue.length - 1 : -1)) {
                if (this.stage.hasFadeCompleted()) {
                    this._advanceToNextStage();
                    stageFinished = this.stage ? this.stage.isFinished() : false;
                }
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
            // Background color (stage fade after end) — in debug, keep static
            const bg = (this.debugMode || !this.stage) ? '#000000' : (this.stage.getBackgroundColor() || '#000000');
            this.ctx.fillStyle = bg || '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

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

    _syncRadiiFromConfig() {
        this.orbitRadius = ORBIT?.radius ?? this.orbitRadius;
        this.playerRadius = PLAYER?.radius ?? this.playerRadius;
    }

    _recreateEntities() {
        this.player = new Player(this.centerX, this.centerY, this.orbitRadius, this.playerRadius);
        this.obstacleManager = new ObstacleManager(this.centerX, this.centerY, this.orbitRadius);
        this.rhythmEffect = new RhythmEffect();
        this.snow = new SnowEffect();
        this.playerHitFlash = 0;
        if (this.debug && this.debugMode) {
            this.debug.toggle(true);
        }
    }

    applyFastForwardStageEnd() {
        if (!Array.isArray(this.stageQueue) || this.stageQueue.length === 0) return;
        if (this.stageIndex < 0 || this.stageIndex >= this.stageQueue.length) {
            this.stageIndex = 0;
        }
        this.stage = this.stageQueue[this.stageIndex] || null;
        const currentStage = this.stage;
        const stageDuration = currentStage && typeof currentStage.getTotalDuration === 'function'
            ? currentStage.getTotalDuration()
            : 0;
        const baseSeconds = this.stageStartSeconds ?? 0;

        if (currentStage && typeof currentStage.update === 'function' && Number.isFinite(stageDuration)) {
            currentStage.update(stageDuration);
            currentStage.totalElapsed = stageDuration;
            currentStage.changed = true;
        }

        if (Number.isFinite(stageDuration)) {
            const targetSeconds = baseSeconds + stageDuration;
            this.score.seconds = targetSeconds;
        }
        if (this.snow && typeof this.snow.reset === 'function') {
            this.snow.reset();
        }
        if (this.obstacleManager) {
            this.obstacleManager.obstacles.length = 0;
            if (typeof this.obstacleManager.resetSpawnTimer === 'function') {
                this.obstacleManager.resetSpawnTimer();
            }
        }
    }

    returnToStageSelect() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        resetAllConfigToDefaults();
        this.gameStarted = false;
        this.gameOver = false;
        this.fastForwardNextStart = false;
        this._lastTime = null;
        this.score.reset();
        this._syncRadiiFromConfig();
        this._initStages(this.selectedStage);
        this._recreateEntities();
        if (this.ui) {
            this.ui.hideOverlays();
            this.ui.showStart();
            if (typeof this.ui.setStageSelection === 'function') {
                this.ui.setStageSelection(this.selectedStage);
            }
        }
    }

    _initStages(startStageId = this.selectedStage) {
        const order = Array.isArray(this.stageOrder) ? this.stageOrder.slice() : [];
        const startIdx = order.indexOf(startStageId);
        const keys = startIdx >= 0 ? order.slice(startIdx) : order;

        this.stageQueue = keys
            .map((key) => {
                const Ctor = this.stageMap ? this.stageMap[key] : null;
                return typeof Ctor === 'function' ? new Ctor() : null;
            })
            .filter(Boolean);

        if (this.stageQueue.length === 0) {
            this.stage = null;
            this.stageIndex = -1;
            this.stageStartSeconds = 0;
            this.totalStageDuration = 0;
            if (this.score) this.score.setMaxSeconds(Infinity);
            return;
        }

        this.stageIndex = 0;
        this.stage = this.stageQueue[0];
        this.stageStartSeconds = 0;
        this.totalStageDuration = this.stageQueue.reduce((sum, stage) => {
            const duration = typeof stage?.getTotalDuration === 'function' ? stage.getTotalDuration() : 0;
            return sum + (Number.isFinite(duration) ? duration : 0);
        }, 0);
        if (this.score) {
            const total = this.totalStageDuration;
            this.score.setMaxSeconds(Number.isFinite(total) && total > 0 ? total : Infinity);
        }
    }

    _advanceToNextStage() {
        if (!Array.isArray(this.stageQueue)) return;
        if (this.stageIndex >= this.stageQueue.length - 1) return;
        this.stageIndex += 1;
        this.stage = this.stageQueue[this.stageIndex] || null;
        this.stageStartSeconds = this.score ? this.score.getSeconds() : 0;
        if (this.obstacleManager) {
            this.obstacleManager.obstacles.length = 0;
            if (typeof this.obstacleManager.resetSpawnTimer === 'function') {
                this.obstacleManager.resetSpawnTimer();
            }
            if (Object.prototype.hasOwnProperty.call(this.obstacleManager, 'lastSpawnAccelStage')) {
                this.obstacleManager.lastSpawnAccelStage = 0;
            }
        }
        if (this.snow && typeof this.snow.reset === 'function') {
            this.snow.reset();
        }
        if (this.rhythmEffect && typeof this.rhythmEffect.reset === 'function') {
            this.rhythmEffect.reset();
        }
    }
}
