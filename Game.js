import { UIController } from './UIController.js';
import { InputController } from './InputController.js';
import { Score } from './Score.js';
import { ORBIT, PLAYER, STAGE_THEMES, AUDIO, EFFECTS } from './Config.js';
import { resetAllConfigToDefaults } from './ConfigDefaults.js';
import { DebugController } from './DebugController.js';
import { Stage1 } from './Stage1.js';
import { Stage2 } from './Stage2.js';
import { StageOrchestrator } from './StageOrchestrator.js';
import { GameScene } from './GameScene.js';
import { StageThemeManager } from './StageThemeManager.js';
import { StageBackgroundFader } from './StageBackgroundFader.js';
import { StageAudioManager } from './StageAudioManager.js';
import { StageRuntime } from './StageRuntime.js';
import { SoundEffectManager } from './SoundEffectManager.js';

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
    this.scene = new GameScene({
      centerX: this.centerX,
      centerY: this.centerY,
      orbitRadius: this.orbitRadius,
      playerRadius: this.playerRadius,
    });

    this.stageThemeManager = new StageThemeManager({ themes: STAGE_THEMES });
    this.backgroundFader = new StageBackgroundFader({
      elements: this._collectBackgroundElements(),
      initialColor: this.stageThemeManager.getBackgroundColor(this.selectedStage),
      defaultDurationSec: this.stageThemeManager.getFadeDuration(this.selectedStage),
    });
    this._applyStageTheme(this.selectedStage, { immediate: true });

    this.audioManager = new StageAudioManager({ config: AUDIO });
    this.effectAudioManager = new SoundEffectManager({ config: EFFECTS });

    this.runtime = new StageRuntime({
      scene: this.scene,
      stageController: this.stageController,
      score: this.score,
      ui: this.ui,
      audioManager: this.audioManager,
      ctx: this.ctx,
      canvas: this.canvas,
      geometry: {
        centerX: this.centerX,
        centerY: this.centerY,
        orbitRadius: this.orbitRadius,
        offscreenRadius: this.offscreenRadius,
      },
      onPlayerHit: () => this._playEffect('playerSmash'),
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
      this.runtime.ensurePrologForStage(initialStage);
    }
    this.scene.applyPlayerConfigFromConfig();
    this.score.setMaxSeconds(this.stageController.getTotalDuration());

    this._updateStageLocks();
    if (this.ui && typeof this.ui.setStageSelection === 'function') {
      this.ui.setStageSelection(this.selectedStage);
    }

    this.setupEventListeners();

    if (this.ui && typeof this.ui.showIntro === 'function') {
      this.ui.showIntro();
    }
  }

  setupEventListeners() {
    this.ui.bind({
      onIntroStart: () => {
        if (this.gameStarted) return;
        this._updateStageLocks();
        if (this.ui && typeof this.ui.setStageSelection === 'function') {
          this.ui.setStageSelection(this.selectedStage);
        }
      },
      onIntroStartComplete: () => {
        if (this.ui && typeof this.ui.showStageSelection === 'function') {
          this.ui.showStageSelection();
        }
      },
      onStart: () => this.startGame(),
      onRestart: () => this.restartGame(),
      onStageSelect: (stageId) => this.setSelectedStage(stageId),
      onStageSelectScreen: () => this.returnToStageSelect(),
      onResetScores: () => this.resetHighScores(),
    });
    this.input.bindHandlers({
      onStart: () => {
        if (!this.gameStarted) {
          if (this.ui && typeof this.ui.isIntroVisible === 'function' && this.ui.isIntroVisible()) {
            this.ui.triggerIntroStart();
            return;
          }
          this.startGame();
        }
      },
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
    this._stopStageMusic();
    this.gameStarted = true;
    this.gameOver = false;
    this.score.reset();
    this.stageController.resetProgress(0);
    this.scene.resetForNewRun();
    const stage = this.stageController.getActiveStage();
    if (stage) {
      this.scene.applyStageConfig(stage);
      this.runtime.ensurePrologForStage(stage);
    }
    this.scene.applyPlayerConfigFromConfig();
    this.ui.hideOverlays();
    if (this.runtime) {
      this.runtime.resetTracking();
      this.runtime.syncAudio();
    }

    if (this.fastForwardNextStart) {
      this.applyFastForwardStageEnd();
      this.fastForwardNextStart = false;
    }

    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  gameOverScreenShow() {
    this.gameOver = true;
    this._stopStageMusic();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    const displayScore = this.runtime ? this.runtime.getDisplayScore() : this.score.getSeconds();
    const finalScore = Math.floor(displayScore ?? this.score.getSeconds());
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
    this._updateStageLocks();
    this.ui.showGameOver(finalScore, high, isNew);
  }

  restartGame() {
    this._stopStageMusic();
    resetAllConfigToDefaults();
    if (this.ui && typeof this.ui.applyUIConfig === 'function') {
      this.ui.applyUIConfig();
    }
    if (this.audioManager) {
      this.audioManager.updateConfig(AUDIO);
    }
    if (this.effectAudioManager) {
      this.effectAudioManager.updateConfig(EFFECTS);
    }
    this._syncRadiiFromConfig();

    this.stageController.setStartingStage(this.selectedStage);
    this.stageController.reset();
    this.stageController.resetProgress(0);

    this.scene.setGeometry({ orbitRadius: this.orbitRadius, playerRadius: this.playerRadius });
    this.scene.resetForNewRun();
    const stage = this.stageController.getActiveStage();
    if (stage) {
      this.scene.applyStageConfig(stage);
      this.runtime.ensurePrologForStage(stage);
    }
    this.scene.applyPlayerConfigFromConfig();
    this._applyStageTheme(this.selectedStage, { immediate: true });

    this.score.setMaxSeconds(this.stageController.getTotalDuration());

    this.gameOver = false;
    this.gameStarted = false;
    this.fastForwardNextStart = false;
    this.score.reset();
    if (this.runtime) {
      this.runtime.updateGeometry({
        centerX: this.centerX,
        centerY: this.centerY,
        orbitRadius: this.orbitRadius,
        offscreenRadius: this.offscreenRadius,
      });
      this.runtime.resetTracking();
    }

    this.ui.hideOverlays();
    this.startGame();
  }

  setSelectedStage(stageId) {
    if (!stageId || !this.stageMap?.[stageId]) return;
    if (!this._isStageUnlocked(stageId)) {
      if (this.ui && typeof this.ui.setStageSelection === 'function') {
        this.ui.setStageSelection(this.selectedStage);
      }
      return;
    }
    if (this.gameStarted) return;

    if (stageId !== 'stage1') {
      this._stopStageMusic();
    }

    this.selectedStage = stageId;
    this._applyStageTheme(stageId);

    this.stageController.setStartingStage(stageId);
    this.stageController.resetProgress(0);
    const stage = this.stageController.getActiveStage();
    if (stage) this.scene.applyStageConfig(stage);
    this.scene.resetForNewRun();
    this.scene.applyPlayerConfigFromConfig();

    this.score.reset();
    this.score.setMaxSeconds(this.stageController.getTotalDuration());
    this.fastForwardNextStart = false;

    if (this.runtime) {
      this.runtime.updateGeometry({
        centerX: this.centerX,
        centerY: this.centerY,
        orbitRadius: this.orbitRadius,
        offscreenRadius: this.offscreenRadius,
      });
      this.runtime.resetTracking();
    }

    if (this.ui && typeof this.ui.setStageSelection === 'function') {
      this.ui.setStageSelection(stageId);
    }
  }

  animate(now) {
    if (!this.gameOver) {
      const { playerHit } = this.runtime.step(now, { debugMode: this.debugMode });
      if (playerHit) {
        this.gameOverScreenShow();
        return;
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
    if (this.runtime) {
      this.runtime.resetTracking();
    }
  }

  returnToStageSelect() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this._stopStageMusic();
    resetAllConfigToDefaults();
    if (this.ui && typeof this.ui.applyUIConfig === 'function') {
      this.ui.applyUIConfig();
    }
    if (this.audioManager) {
      this.audioManager.updateConfig(AUDIO);
    }
    if (this.effectAudioManager) {
      this.effectAudioManager.updateConfig(EFFECTS);
    }

    this.gameStarted = false;
    this.gameOver = false;
    this.fastForwardNextStart = false;
    this.score.reset();
    this._syncRadiiFromConfig();

    this.stageController.setStartingStage(this.selectedStage);
    this.stageController.reset();
    this.stageController.resetProgress(0);

    this.scene.setGeometry({ orbitRadius: this.orbitRadius, playerRadius: this.playerRadius });
    this.scene.resetForNewRun();
    const stage = this.stageController.getActiveStage();
    if (stage) {
      this.scene.applyStageConfig(stage);
    }
    this.scene.applyPlayerConfigFromConfig();
    this.score.setMaxSeconds(this.stageController.getTotalDuration());
    this._applyStageTheme(this.selectedStage, { immediate: true });

    if (this.runtime) {
      this.runtime.updateGeometry({
        centerX: this.centerX,
        centerY: this.centerY,
        orbitRadius: this.orbitRadius,
        offscreenRadius: this.offscreenRadius,
      });
      this.runtime.resetTracking();
    }

    this._updateStageLocks();
    if (this.ui) {
      this.ui.hideOverlays();
      this.ui.showStageSelection();
      if (typeof this.ui.setStageSelection === 'function') {
        this.ui.setStageSelection(this.selectedStage);
      }
    }
  }

  _syncRadiiFromConfig() {
    if (typeof ORBIT?.radius === 'number') {
      this.orbitRadius = ORBIT.radius;
    }
    if (typeof PLAYER?.radius === 'number') {
      this.playerRadius = PLAYER.radius;
    }
    if (this.runtime) {
      this.runtime.updateGeometry({
        centerX: this.centerX,
        centerY: this.centerY,
        orbitRadius: this.orbitRadius,
        offscreenRadius: this.offscreenRadius,
      });
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
    this._updateStageLocks();
  }

  _stopStageMusic() {
    if (this.audioManager) {
      this.audioManager.stopAll();
    }
  }

  _playEffect(effectId) {
    if (!effectId || !this.effectAudioManager) return;
    this.effectAudioManager.play(effectId);
  }

  _collectBackgroundElements() {
    const elements = [];
    if (typeof document !== 'undefined' && document.body) {
      elements.push(document.body);
    }
    if (this.canvas) elements.push(this.canvas);
    if (this.ui) {
      if (this.ui.startScreen) elements.push(this.ui.startScreen);
      if (this.ui.gameOverScreen) elements.push(this.ui.gameOverScreen);
    }
    return elements;
  }

  _applyStageTheme(stageId, { immediate = false } = {}) {
    if (!this.backgroundFader || !this.stageThemeManager) return;
    this.backgroundFader.setElements(this._collectBackgroundElements());
    const theme = this.stageThemeManager.getTheme(stageId);
    this.backgroundFader.setDefaultDuration(theme.fadeDurationSec);
    if (immediate) {
      this.backgroundFader.setColorImmediate(theme.background);
    } else {
      this.backgroundFader.fadeTo(theme.background, theme.fadeDurationSec);
    }
  }

  _isStageUnlocked(stageId) {
    if (!stageId || stageId === 'stage1') return true;
    if (stageId === 'stage2') {
      const key = this._getHighScoreStorageKey('stage1');
      let high = 0;
      try {
        const stored = localStorage.getItem(key);
        high = stored ? parseInt(stored, 10) : 0;
        if (!Number.isFinite(high)) high = 0;
      } catch (_) {
        high = 0;
      }
      return high >= 60;
    }
    return true;
  }

  _updateStageLocks() {
    const stage2Unlocked = this._isStageUnlocked('stage2');
    if (this.ui && typeof this.ui.setStageLock === 'function') {
      this.ui.setStageLock('stage2', !stage2Unlocked);
    }
    if (!stage2Unlocked && this.selectedStage === 'stage2') {
      this.selectedStage = 'stage1';
      this._stopStageMusic();
      this.stageController.setStartingStage(this.selectedStage);
      this.stageController.reset();
      this.stageController.resetProgress(0);
      this.scene.resetForNewRun();
      const stage = this.stageController.getActiveStage();
      if (stage) {
        this.scene.applyStageConfig(stage);
      }
      this.scene.applyPlayerConfigFromConfig();
      this.score.reset();
      this.score.setMaxSeconds(this.stageController.getTotalDuration());
      if (this.runtime) {
        this.runtime.updateGeometry({
          centerX: this.centerX,
          centerY: this.centerY,
          orbitRadius: this.orbitRadius,
          offscreenRadius: this.offscreenRadius,
        });
        this.runtime.resetTracking();
      }
      if (this.ui && typeof this.ui.setStageSelection === 'function') {
        this.ui.setStageSelection(this.selectedStage);
      }
      this._applyStageTheme(this.selectedStage, { immediate: true });
    }
  }
}
