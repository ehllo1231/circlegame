import { UIController } from './UIController.js';
import { InputController } from './InputController.js';
import { Score } from './Score.js';
import { ORBIT, PLAYER, SNOW } from './Config.js';
import { resetAllConfigToDefaults } from './ConfigDefaults.js';
import { DebugController } from './DebugController.js';
import { Stage1 } from './Stage1.js';
import { Stage2 } from './Stage2.js';
import { StageOrchestrator } from './StageOrchestrator.js';
import { GameScene } from './GameScene.js';

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

    this.gameStarted = false;
    this.gameOver = false;
    this.animationId = null;
    this.score = new Score();
    this.scoreBase = 0;
    this.stageElapsedOffset = 0;
    this.currentStageId = null;
    this.currentDisplayScore = 0;
    this._lastTime = null;

    this.ui = new UIController();
    this.input = new InputController();

    this.stageMap = { stage1: Stage1, stage2: Stage2 };
    this.stageOrder = ['stage1', 'stage2'];
    this.selectedStage = 'stage1';

    this.stageController = new StageOrchestrator({
      stageMap: this.stageMap,
      stageOrder: this.stageOrder,
      defaultStageId: this.selectedStage,
    });
    this.stageDurationById = new Map();

    this.scene = new GameScene({
      centerX: this.centerX,
      centerY: this.centerY,
      orbitRadius: this.orbitRadius,
      playerRadius: this.playerRadius,
    });

    this.debugMode = false;
    this.fastForwardNextStart = false;
    this.debug = new DebugController({
      onChange: (section) => {
        if (section === 'spawn' || section === 'obstacle' || section === 'particles') {
          const stage = this.stageController.getActiveStage();
          if (stage) this.scene.applyStageConfig(stage);
        }
        if (section === 'player') {
          this._syncRadiiFromConfig();
          this.scene.applyPlayerConfigFromConfig();
        }
      },
    });

    const initialStage = this.stageController.getActiveStage();
    if (initialStage) {
      this.scene.applyStageConfig(initialStage);
      this._ensurePrologForStage(initialStage);
    }
    this.scene.applyPlayerConfigFromConfig();
    this.score.setMaxSeconds(this.stageController.getTotalDuration());
    this.currentStageId = this.stageController.getActiveStageId();

    if (this.ui && typeof this.ui.setStageSelection === 'function') {
      this.ui.setStageSelection(this.selectedStage);
    }

    this._refreshStageDurations();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.ui.bind({
      onStart: () => this.startGame(),
      onRestart: () => this.restartGame(),
      onStageSelect: (stageId) => this.setSelectedStage(stageId),
      onStageSelectScreen: () => this.returnToStageSelect(),
      onResetScores: () => this.resetHighScores(),
    });
    this.input.bindHandlers({
      onStart: () => { if (!this.gameStarted) this.startGame(); },
      onRestart: () => { if (this.gameOver) this.restartGame(); },
      onReverse: () => { if (this.gameStarted && !this.gameOver) this.scene.reversePlayerDirection(); },
      onDebugToggle: () => {
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
    this.scoreBase = 0;
    this.stageElapsedOffset = 0;
    this.currentStageId = this.stageController.getActiveStageId();
    this.currentDisplayScore = 0;
    this._lastTime = null;
    this.stageController.resetProgress(0);
    this._refreshStageDurations();
    this.scene.resetForNewRun();
    const stage = this.stageController.getActiveStage();
    if (stage) {
      this.scene.applyStageConfig(stage);
      this._ensurePrologForStage(stage);
    }
    this.scene.applyPlayerConfigFromConfig();
    this.ui.hideOverlays();

    if (this.fastForwardNextStart) {
      this.applyFastForwardStageEnd();
      this.fastForwardNextStart = false;
    }

    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  gameOverScreenShow() {
    this.gameOver = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    const finalScore = Math.floor(this.currentDisplayScore ?? this.score.getSeconds());
    const stageId = this.stageController?.getStartingStageId?.() ?? 'default';
    const highKey = this._getHighScoreStorageKey(stageId);
    let high = 0;
    try {
      const stored = localStorage.getItem(highKey);
      high = stored ? parseInt(stored, 10) : 0;
      if (!Number.isFinite(high)) high = 0;
    } catch (_) {
      high = 0;
    }
    let isNew = false;
    if (high < 0) high = 0;
    if (finalScore > high) {
      high = finalScore;
      try { localStorage.setItem(highKey, String(high)); } catch (_) { /* ignore */ }
      isNew = true;
    }
    this.ui.showGameOver(finalScore, high, isNew);
  }

  restartGame() {
    resetAllConfigToDefaults();
    this._syncRadiiFromConfig();

    this.stageController.setStartingStage(this.selectedStage);
    this.stageController.reset();
    this.stageController.resetProgress(0);
    this._refreshStageDurations();

    this.scene.setGeometry({ orbitRadius: this.orbitRadius, playerRadius: this.playerRadius });
    this.scene.resetForNewRun();
    const stage = this.stageController.getActiveStage();
    if (stage) {
      this.scene.applyStageConfig(stage);
      this._ensurePrologForStage(stage);
    }
    this.scene.applyPlayerConfigFromConfig();

    this.score.setMaxSeconds(this.stageController.getTotalDuration());

    this.gameOver = false;
    this.gameStarted = false;
    this.fastForwardNextStart = false;
    this._lastTime = null;
    this.score.reset();
    this.scoreBase = 0;
    this.stageElapsedOffset = 0;
    this.currentDisplayScore = 0;
    this.currentStageId = this.stageController.getActiveStageId();

    this.ui.hideOverlays();
    this.startGame();
  }

  setSelectedStage(stageId) {
    if (!stageId || !this.stageMap?.[stageId]) return;
    if (this.gameStarted) return;

    this.selectedStage = stageId;

    this.stageController.setStartingStage(stageId);
    this.stageController.resetProgress(0);
    this._refreshStageDurations();
    const stage = this.stageController.getActiveStage();
    if (stage) this.scene.applyStageConfig(stage);
    this.scene.resetForNewRun();
    this.scene.applyPlayerConfigFromConfig();

    this.score.reset();
    this.score.setMaxSeconds(this.stageController.getTotalDuration());
    this._lastTime = null;
    this.fastForwardNextStart = false;
    this.scoreBase = 0;
    this.stageElapsedOffset = 0;
    this.currentDisplayScore = 0;
    this.currentStageId = this.stageController.getActiveStageId();

    if (this.ui && typeof this.ui.setStageSelection === 'function') {
      this.ui.setStageSelection(stageId);
    }
  }

  animate(now) {
    if (!this.gameOver) {
      const dt = this._lastTime == null ? 1 : Math.min(3, (now - this._lastTime) / (1000 / 60));
      this._lastTime = now;
      this.score.update(now);

      const secondsElapsed = this.score.getSeconds();
      const { stage, changed: stageChanged } = this.stageController.update(secondsElapsed, { debugMode: this.debugMode });
      if (stageChanged && stage) {
        this.scene.applyStageConfig(stage);
        this._ensurePrologForStage(stage);
      }

      let stageFinished = this.stageController.isStageFinished();
      if (
        stageFinished &&
        this.stageController.hasNextStage() &&
        this.stageController.isFadeComplete()
      ) {
        if (this._handleStageAdvance(secondsElapsed)) {
          stageFinished = this.stageController.isStageFinished();
        }
      }

      const activeStage = this.stageController.getActiveStage();
      if (activeStage && activeStage !== stage) {
        this._ensurePrologForStage(activeStage);
      }

      const activeStageId = this.stageController.getActiveStageId();
      if (this.currentStageId == null) this.currentStageId = activeStageId;
      if (this.currentStageId !== activeStageId) {
        if (this.currentStageId) {
          this.scoreBase += this._getStageTotalDuration(this.currentStageId);
        }
        this.currentStageId = activeStageId;
        this.stageElapsedOffset = 0;
      }

      const prologActiveStage = this.stageController.getActiveStage();
      let prologActive = false;
      const dtSeconds = dt / 60;
      if (prologActiveStage && typeof prologActiveStage.updateProlog === 'function') {
        prologActiveStage.updateProlog(dtSeconds);
        if (typeof prologActiveStage.isPrologActive === 'function') {
          prologActive = prologActiveStage.isPrologActive();
        }
      }
      const prologObstacles = (prologActiveStage && typeof prologActiveStage.getPrologObstacles === 'function')
        ? prologActiveStage.getPrologObstacles()
        : [];

      const stageStartSeconds = this.stageController.stageStartSeconds ?? 0;
      let stageElapsedRaw = Math.max(0, secondsElapsed - stageStartSeconds);
      if (prologActive) {
        this.stageElapsedOffset = stageElapsedRaw;
        stageElapsedRaw = 0;
      } else if (this.stageElapsedOffset > 0) {
        stageElapsedRaw = Math.max(0, stageElapsedRaw - this.stageElapsedOffset);
      }
      const activeStageInstance = this.stageController.getActiveStage();
      if (activeStageInstance && typeof activeStageInstance.getTotalDuration === 'function') {
        const totalDuration = activeStageInstance.getTotalDuration();
        if (this.stageController.isStageFinished()) {
          stageElapsedRaw = totalDuration;
        }
      }
      const displaySeconds = this.scoreBase + stageElapsedRaw;
      this.currentDisplayScore = displaySeconds;

      const backgroundColor = this.stageController.getBackgroundColor('#000000');
      this._clearCanvas(backgroundColor);

      const elapsedForEffects = stageElapsedRaw;
      const snowStartAt = (typeof SNOW?.enabledAfterSeconds === 'number') ? SNOW.enabledAfterSeconds : 10;
      const snowEnabled = this.debugMode ? true : this.stageController.isSnowEnabled();
      const snowActive = snowEnabled && elapsedForEffects >= snowStartAt && !prologActive;
      const allowSpawn = (!prologActive) && (this.debugMode ? true : this.stageController.canSpawn());
      const visibleScore = Math.max(0, Math.floor(stageElapsedRaw));

      const { playerHit } = this.scene.updateFrame({
        dt,
        debugMode: this.debugMode,
        stageFinished,
        allowSpawn,
        visibleScore,
        offscreenRadius: this.offscreenRadius,
        snowActive,
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height,
        extraObstacles: prologObstacles,
        rhythmPaused: prologActive,
      });

      if (playerHit) {
        this.gameOverScreenShow();
        return;
      }

      this.scene.drawFrame(this.ctx, {
        stageFinished,
        centerX: this.centerX,
        centerY: this.centerY,
        orbitRadius: this.orbitRadius,
        snowActive,
        extraObstacles: prologObstacles,
        rhythmPaused: prologActive,
      });

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
        let hideScore = this.stageController.shouldHideScore();
        if (stageFinished) {
          hideScore = true;
        }
        if (activeStageId === 'stage2' && (prologActive || stageElapsedRaw <= 0)) {
          hideScore = true;
        }
        if (!hideScore) {
          this.ui.drawScore(
            this.ctx,
            displaySeconds,
            this.centerX,
            this.centerY,
            this.orbitRadius,
          );
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
    const targetSeconds = this.stageController.fastForwardToStageEnd();
    if (Number.isFinite(targetSeconds)) {
      this.score.seconds = targetSeconds;
    }
    this.scene.resetAfterStageTransition();
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
    this.scoreBase = 0;
    this.stageElapsedOffset = 0;
    this.currentDisplayScore = 0;
    this._syncRadiiFromConfig();

    this.stageController.setStartingStage(this.selectedStage);
    this.stageController.reset();
    this.stageController.resetProgress(0);
    this._refreshStageDurations();

    this.scene.setGeometry({ orbitRadius: this.orbitRadius, playerRadius: this.playerRadius });
    this.scene.resetForNewRun();
    const stage = this.stageController.getActiveStage();
    if (stage) this.scene.applyStageConfig(stage);
    this.scene.applyPlayerConfigFromConfig();
    this.score.setMaxSeconds(this.stageController.getTotalDuration());
    this.currentStageId = this.stageController.getActiveStageId();

    if (this.ui) {
      this.ui.hideOverlays();
      this.ui.showStart();
      if (typeof this.ui.setStageSelection === 'function') {
        this.ui.setStageSelection(this.selectedStage);
      }
    }
  }

  _handleStageAdvance(currentSeconds) {
    const advanced = this.stageController.advance(currentSeconds);
    if (!advanced) return false;
    this.scene.resetAfterStageTransition();
    const stage = this.stageController.getActiveStage();
    if (stage) {
      this.scene.applyStageConfig(stage);
      this._ensurePrologForStage(stage);
    }
    return true;
  }

  _getStageTotalDuration(stageId) {
    if (!stageId) return 0;
    return this.stageDurationById?.get?.(stageId) ?? 0;
  }

  _refreshStageDurations() {
    this.stageDurationById = new Map();
    const queue = this.stageController?.stageQueue;
    if (!Array.isArray(queue)) return;
    for (const entry of queue) {
      if (!entry || !entry.id) continue;
      let duration = 0;
      if (entry.stage && typeof entry.stage.getTotalDuration === 'function') {
        duration = entry.stage.getTotalDuration();
      }
      this.stageDurationById.set(entry.id, Number.isFinite(duration) ? duration : 0);
    }
  }

  _clearCanvas(color) {
    if (this.ctx.setTransform) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.ctx.fillStyle = color || '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _syncRadiiFromConfig() {
    if (typeof ORBIT?.radius === 'number') {
      this.orbitRadius = ORBIT.radius;
    }
    if (typeof PLAYER?.radius === 'number') {
      this.playerRadius = PLAYER.radius;
    }
  }

  _getHighScoreStorageKey(stageId) {
    if (!stageId || stageId === 'stage1') {
      return 'orbit_high_score';
    }
    return `orbit_high_score_${stageId}`;
  }

  resetHighScores() {
    const keys = new Set(['orbit_high_score']);
    if (Array.isArray(this.stageOrder)) {
      this.stageOrder.forEach((id) => {
        if (id === 'stage1') return;
        keys.add(this._getHighScoreStorageKey(id));
      });
    }
    for (const key of keys) {
      try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
    }
  }

  _ensurePrologForStage(stage) {
    if (!stage) return;
    if (typeof stage.startProlog === 'function') {
      stage.startProlog({
        centerX: this.centerX,
        centerY: this.centerY,
        orbitRadius: this.orbitRadius,
      });
    }
  }
}
