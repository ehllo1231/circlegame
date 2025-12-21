import { UIController } from './UIController.js';
import { InputController } from './InputController.js';
import { Score } from './Score.js';
import { CANVAS, ORBIT, PLAYER, STAGE_THEMES, AUDIO, EFFECTS, SCORE, EXTRA_STAGE, SNOW, ADS } from './Config.js';
import { resetAllConfigToDefaults } from './ConfigDefaults.js';
import { DebugController } from './DebugController.js';
import { Stage1, Stage1Ex } from './Stage1.js';
import { Stage2, Stage2Ex } from './Stage2.js';
import { Stage3, Stage3Ex } from './Stage3.js';
import { StageAllClear, STAGE_ALL_CLEAR_ID } from './StageAllClear.js';
import { StageOrchestrator } from './StageOrchestrator.js';
import { GameScene } from './GameScene.js';
import { StageThemeManager } from './StageThemeManager.js';
import { StageBackgroundFader } from './StageBackgroundFader.js';
import { StageAudioManager } from './StageAudioManager.js';
import { StageRuntime } from './StageRuntime.js';
import { SoundEffectManager } from './SoundEffectManager.js';
import { ExtraStageSnowController } from './ExtraStageSnowController.js';
import { AdManager } from './AdManager.js';

const PLAYER_START_ANGLE = Math.PI / 2;
const EXTRA_STAGE_UNLOCK_KEY = 'orbit_extra_stage_unlocked';
const PLAYER_SKIN_STORAGE_KEY = 'orbit_player_skin';
const OBSTACLE_SKIN_STORAGE_KEY = 'orbit_obstacle_skin';
const RING_SKIN_STORAGE_KEY = 'orbit_ring_skin';

// Game - main controller
export class Game {
  constructor(canvas, { menuSnowCanvas = null } = {}) {
    this.canvas = canvas;
    this.menuSnowCanvas = menuSnowCanvas;
    this.ctx = canvas.getContext('2d');
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.viewportScale = this._computeViewportScale();
    this.orbitRadius = this._computeScaledOrbitRadius(this.viewportScale);
    const { baseRadius, baseRenderRadius } = this._resolvePlayerBaseRadii(this.playerSkin);
    this.playerRadius = this._computeScaledPlayerRadius(this.viewportScale, baseRadius);
    this.playerRenderRadius = this._computeScaledPlayerRenderRadius(this.viewportScale, baseRenderRadius);
    this.offscreenRadius = Math.hypot(canvas.width / 2, canvas.height / 2) + 40;

    this.gameStarted = false;
    this.gameOver = false;
    this.isPaused = false;
    this.animationId = null;
    this.score = new Score();

    this.ui = new UIController();
    this.input = new InputController();

    this.stageMap = {
      stage1: Stage1,
      stage2: Stage2,
      stage3: Stage3,
      stage1_ex: Stage1Ex,
      stage2_ex: Stage2Ex,
      stage3_ex: Stage3Ex,
      [STAGE_ALL_CLEAR_ID]: StageAllClear,
    };
    this.baseStageOrder = ['stage1', 'stage2', 'stage3', STAGE_ALL_CLEAR_ID];
    this.stageOrder = this.baseStageOrder.slice();
    this.selectedStage = 'stage1';
    this.selectedStageIsEx = false;

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
      playerRenderRadius: this.playerRenderRadius,
      scale: this.viewportScale,
    });
    this.playerSkin = this._normalizePlayerSkin({ type: 'default' });
    if (this.scene && typeof this.scene.setPlayerSkin === 'function') {
      this.scene.setPlayerSkin(this.playerSkin);
    }
    this.obstacleSkin = this._normalizeObstacleSkin({ type: 'default' });
    if (this.scene && typeof this.scene.setObstacleSkin === 'function') {
      this.scene.setObstacleSkin(this.obstacleSkin);
    }
    this.ringSkin = this._normalizeRingSkin({ type: 'default' });
    if (this.scene && typeof this.scene.setRingSkin === 'function') {
      this.scene.setRingSkin(this.ringSkin);
    }
    this._loadPersistedSkins();
    this.extraStageSnow = new ExtraStageSnowController({
      canvas: this.menuSnowCanvas || this.canvas,
      scale: this.viewportScale,
      manageVisibility: !!this.menuSnowCanvas,
      config: this._buildPreviewSnowConfig(this.selectedStage),
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
    this.adManager = new AdManager({ config: ADS });
    this.audioMuted = false;
    this.highScoreMemory = new Map();
    this._refreshExtraStageFlagsFromStorage();
    this._applyAudioMuteState();
    this._syncAdConfig();
    this._syncSettingsUI();

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
      backgroundTargets: this._collectGlobalBackgroundTargets(),
      onStagePlayable: (stageId) => this._handleStagePlayable(stageId),
      highScoreProvider: (stageId) => this._readHighScore(stageId),
      scoreHighlightConfig: SCORE?.highlight ?? {},
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
      this.ui.setStageSelection(this.selectedStage, { ex: this.selectedStageIsEx });
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
          this.ui.setStageSelection(this.selectedStage, { ex: this.selectedStageIsEx });
        }
      },
      onIntroStartComplete: () => {
        if (this.ui && typeof this.ui.showStageSelection === 'function') {
          this.ui.showStageSelection();
        }
      },
      onStart: () => this.startGame(),
      onRestart: () => this.restartGame(),
      onStageSelect: (stageId, options) => this.setSelectedStage(stageId, options),
      onStageSelectScreen: () => this.returnToStageSelect(),
      onOpenSettings: () => this._syncSettingsUI(),
      onCloseSettings: () => this._syncSettingsUI(),
      onToggleMute: () => this.toggleAudioMute(),
      onConfirmReset: () => this.resetHighScores(),
      onPlayerSkinSelect: (skin) => this.applyPlayerSkin(skin),
      onObstacleSkinSelect: (skin) => this.applyObstacleSkin(skin),
      onRingSkinSelect: (skin) => this.applyRingSkin(skin),
      onPause: () => this.pauseGame(),
      onResume: () => this.resumeGame(),
      onPauseStageSelect: () => this.handlePauseStageSelect(),
    });
    this.input.bindHandlers({
      onStart: () => {
        if (this.isPaused) {
          this.resumeGame();
          return;
        }
        if (!this.gameStarted) {
          if (this.ui && typeof this.ui.isIntroVisible === 'function' && this.ui.isIntroVisible()) {
            this.ui.triggerIntroStart();
            return;
          }
          this.startGame();
        }
      },
      onRestart: () => {
        if (this.isPaused) return;
        if (this.gameOver) this.restartGame();
      },
      onReverse: () => {
        if (this.isPaused) return;
        if (this.gameStarted && !this.gameOver) this.scene.reversePlayerDirection();
      },
      onDebugToggle: () => {
        if (this.isPaused) return;
        if (!this.gameStarted) {
          this.debugMode = !this.debugMode;
          this.debug.toggle(this.debugMode);
        }
      },
      onFastForward: () => {
        if (this.isPaused) return;
        this.enableFastForwardDebug();
      },
      onAnyKey: () => {
        if (this.isPaused) return false;
        return this._handleAnyKeyPress();
      },
    });
    const reverseTapTarget = typeof window !== 'undefined' ? window : this.canvas;
    this.input.attach({ reverseTapElement: reverseTapTarget });
    this._bindLifecycleEvents();
  }

  startGame() {
    this._stopExtraStageSnowPreview({ immediate: true });
    this._stopStageMusic();
    this.gameStarted = true;
    this.gameOver = false;
    this.isPaused = false;
    this.score.reset();
    this.stageController.resetProgress(0);
    this.scene.resetForNewRun();
    const stage = this.stageController.getActiveStage();
    const skipProlog = !!(stage && typeof stage.setSkipProlog === 'function' && (this.selectedStage === 'stage2' || this.selectedStage === 'stage3'));
    if (stage && typeof stage.setSkipProlog === 'function') {
      stage.setSkipProlog(skipProlog);
    }
    if (stage) {
      this.scene.applyStageConfig(stage);
      this.runtime.ensurePrologForStage(stage);
    }
    this.scene.applyPlayerConfigFromConfig();
    if (skipProlog) {
      this.scene.setPlayerAngle(PLAYER_START_ANGLE);
    }
    if (this.ui) {
      if (typeof this.ui.hideOverlays === 'function') this.ui.hideOverlays();
      if (typeof this.ui.hidePauseMenu === 'function') this.ui.hidePauseMenu();
      if (typeof this.ui.showPauseButton === 'function') this.ui.showPauseButton();
    }
    if (this.runtime) {
      this.runtime.resetTracking();
      if (!this.fastForwardNextStart) {
        this.runtime.syncAudio();
      }
    }

    if (this.fastForwardNextStart) {
      const ffStageId = this.stageController.getActiveStageId();
      if (ffStageId && this.runtime && typeof this.runtime.muteStage === 'function') {
        this.runtime.muteStage(ffStageId);
      }
      this.applyFastForwardStageEnd();
      this.fastForwardNextStart = false;
    }

    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  gameOverScreenShow() {
    this.gameOver = true;
    this.isPaused = false;
    this._stopStageMusic();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.ui) {
      if (typeof this.ui.hidePauseMenu === 'function') this.ui.hidePauseMenu();
      if (typeof this.ui.hidePauseButton === 'function') this.ui.hidePauseButton();
    }
    const displayScore = this.runtime ? this.runtime.getDisplayScore() : this.score.getSeconds();
    const finalScore = Math.floor(displayScore ?? this.score.getSeconds());
    const stageId = this.stageController?.getStartingStageId?.() ?? 'stage1';
    let high = this._readHighScore(stageId);
    let isNew = false;
    if (high < 0) high = 0;
    if (finalScore > high) {
      high = finalScore;
      this._saveHighScore(stageId, high);
      isNew = true;
    }
    this._updateStageLocks();
    this.ui.showGameOver(finalScore, high, isNew);
    this._handleAdOnGameComplete();
  }

  restartGame() {
    this._stopStageMusic();
    resetAllConfigToDefaults();
    this._syncAdConfig();
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

    const resolvedStageId = this._resolveStageId(this.selectedStage, this.selectedStageIsEx);
    const order = this._resolveStageOrder(resolvedStageId, this.selectedStageIsEx);
    this.stageOrder = order.slice();
    this.stageController.stageOrder = order.slice();
    this.stageController.setStartingStage(resolvedStageId);
    this.stageController.reset();
    this.stageController.resetProgress(0);

    this.scene.setGeometry({
      centerX: this.centerX,
      centerY: this.centerY,
      orbitRadius: this.orbitRadius,
      playerRadius: this.playerRadius,
      playerRenderRadius: this.playerRenderRadius,
    });
    this.scene.resetForNewRun();
    const stage = this.stageController.getActiveStage();
    const skipProlog = !!(stage && typeof stage.setSkipProlog === 'function'
      && (this.selectedStage === 'stage2' || this.selectedStage === 'stage3'));
    if (stage && typeof stage.setSkipProlog === 'function') {
      stage.setSkipProlog(skipProlog);
    }
    if (stage) {
      this.scene.applyStageConfig(stage);
      this.runtime.ensurePrologForStage(stage);
    }
    this.scene.applyPlayerConfigFromConfig();
    if (skipProlog) {
      this.scene.setPlayerAngle(PLAYER_START_ANGLE);
    }
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

  setSelectedStage(stageId, { ex = false } = {}) {
    const baseStageId = this._normalizeBaseStageId(stageId);
    let useEx = !!ex;
    if (useEx && !this._canUseExtraStage(baseStageId)) {
      useEx = false;
    }
    const resolvedStageId = this._resolveStageId(baseStageId, useEx);
    if (!resolvedStageId || !this.stageMap?.[resolvedStageId]) return;
    if (!this._isStageUnlocked(baseStageId)) {
      if (this.ui && typeof this.ui.setStageSelection === 'function') {
        this.ui.setStageSelection(this.selectedStage, { ex: this.selectedStageIsEx });
      }
      return;
    }
    if (this.gameStarted) return;

    if (baseStageId !== 'stage1') {
      this._stopStageMusic();
    }

    this.selectedStage = baseStageId;
    this.selectedStageIsEx = useEx;
    this._applyStageTheme(baseStageId);

    const order = this._resolveStageOrder(resolvedStageId, this.selectedStageIsEx);
    this.stageOrder = order.slice();
    this.stageController.stageOrder = order.slice();
    this.stageController.setStartingStage(resolvedStageId);
    this.stageController.resetProgress(0);
    const stage = this.stageController.getActiveStage();
    if (stage && typeof stage.setSkipProlog === 'function') {
      stage.setSkipProlog(baseStageId === 'stage2' || baseStageId === 'stage3');
    }
    if (stage) this.scene.applyStageConfig(stage);
    this.scene.resetForNewRun();
    this.scene.applyPlayerConfigFromConfig();
    if (baseStageId === 'stage2' || baseStageId === 'stage3') {
      this.scene.setPlayerAngle(PLAYER_START_ANGLE);
    }

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
      this.ui.setStageSelection(baseStageId, { ex: this.selectedStageIsEx });
    }
    this._syncExtraStageSnowPreview();
  }

  animate(now) {
    if (this.isPaused) {
      this.animationId = null;
      return;
    }
    if (!this.gameOver) {
      const { playerHit } = this.runtime.step(now, { debugMode: this.debugMode });
      if (playerHit) {
        this.gameOverScreenShow();
        return;
      }
    }

    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  pauseGame() {
    if (!this.gameStarted || this.gameOver || this.isPaused) return;
    this.isPaused = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.audioManager && typeof this.audioManager.pauseAll === 'function') {
      this.audioManager.pauseAll();
    }
    if (this.effectAudioManager && typeof this.effectAudioManager.pauseAll === 'function') {
      this.effectAudioManager.pauseAll();
    }
    if (this.ui) {
      if (typeof this.ui.hidePauseButton === 'function') this.ui.hidePauseButton();
      if (typeof this.ui.showPauseMenu === 'function') this.ui.showPauseMenu();
    }
  }

  resumeGame() {
    if (!this.gameStarted || this.gameOver || !this.isPaused) return;
    this.isPaused = false;
    if (this.score && typeof this.score.resetReferenceTime === 'function') {
      this.score.resetReferenceTime();
    }
    if (this.runtime && typeof this.runtime.resetDeltaTime === 'function') {
      this.runtime.resetDeltaTime();
    }
    if (!this.audioMuted && this.audioManager && typeof this.audioManager.resumePaused === 'function') {
      this.audioManager.resumePaused();
    } else if (this.runtime && typeof this.runtime.syncAudio === 'function') {
      this.runtime.syncAudio();
    }
    if (!this.audioMuted && this.effectAudioManager && typeof this.effectAudioManager.resumeAll === 'function') {
      this.effectAudioManager.resumeAll();
    }
    this._applyAudioMuteState();
    if (this.ui) {
      if (typeof this.ui.hidePauseMenu === 'function') this.ui.hidePauseMenu();
      if (typeof this.ui.showPauseButton === 'function') this.ui.showPauseButton();
    }
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  handlePauseStageSelect() {
    if (!this.gameStarted || this.gameOver) {
      this.returnToStageSelect();
      return;
    }
    if (!this.isPaused) {
      this.pauseGame();
    }
    this.isPaused = false;
    if (this.ui) {
      if (typeof this.ui.hidePauseMenu === 'function') this.ui.hidePauseMenu();
      if (typeof this.ui.hidePauseButton === 'function') this.ui.hidePauseButton();
    }
    this.returnToStageSelect();
  }

  enableFastForwardDebug() {
    if (this.gameStarted) return;
    this.fastForwardNextStart = true;
  }

  _handleAnyKeyPress() {
    const activeStageId = this.stageController?.getActiveStageId?.();
    if (activeStageId !== STAGE_ALL_CLEAR_ID) return false;
    const stage = this.stageController.getActiveStage();
    if (stage && typeof stage.canAcceptContinue === 'function' && stage.canAcceptContinue()) {
      this._grantExtraStageUnlock();
      this._recordCompletionHighScore();
      this.returnToIntro();
      return true;
    }
    return false;
  }

  _bindLifecycleEvents() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const handler = (event) => {
      if (!this.gameStarted || this.gameOver || this.isPaused) return;
      const hidden = document.visibilityState === 'hidden';
      if (hidden || event?.type === 'pagehide' || event?.type === 'pause' || event?.type === 'appStateChange') {
        this.pauseGame();
      }
    };
    document.addEventListener('visibilitychange', handler);
    document.addEventListener('pause', handler);
    window.addEventListener('pagehide', handler);
    window.addEventListener('blur', handler);
    this._lifecycleHandler = handler;

    const cap = (typeof globalThis !== 'undefined' && globalThis.Capacitor) ? globalThis.Capacitor : null;
    const app = cap?.App || cap?.Plugins?.App;
    if (app && typeof app.addListener === 'function') {
      app.addListener('appStateChange', (state) => {
        if (state?.isActive === false) {
          handler({ type: 'appStateChange' });
        }
      });
    }
  }

  applyFastForwardStageEnd() {
    const currentStageId = this.stageController.getActiveStageId();
    if (currentStageId && this.runtime && typeof this.runtime.muteStage === 'function') {
      this.runtime.muteStage(currentStageId);
    }
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
    this._resetToMenu({ showIntro: false });
  }

  returnToIntro() {
    this._resetToMenu({ showIntro: true });
  }

  _resetToMenu({ showIntro = false } = {}) {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this._stopStageMusic();
    resetAllConfigToDefaults();
    this._syncAdConfig();
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
    this.isPaused = false;
    this.fastForwardNextStart = false;
    this.score.reset();
    this._syncRadiiFromConfig();

    const resolvedStageId = this._resolveStageId(this.selectedStage, this.selectedStageIsEx);
    const order = this._resolveStageOrder(resolvedStageId, this.selectedStageIsEx);
    this.stageOrder = order.slice();
    this.stageController.stageOrder = order.slice();
    this.stageController.setStartingStage(resolvedStageId);
    this.stageController.reset();
    this.stageController.resetProgress(0);

    this.scene.setGeometry({
      centerX: this.centerX,
      centerY: this.centerY,
      orbitRadius: this.orbitRadius,
      playerRadius: this.playerRadius,
      playerRenderRadius: this.playerRenderRadius,
    });
    this.scene.resetForNewRun();
    const stage = this.stageController.getActiveStage();
    if (stage && typeof stage.setSkipProlog === 'function') {
      stage.setSkipProlog(this.selectedStage === 'stage2' || this.selectedStage === 'stage3');
    }
    if (stage) {
      this.scene.applyStageConfig(stage);
    }
    this.scene.applyPlayerConfigFromConfig();
    if (this.selectedStage === 'stage2' || this.selectedStage === 'stage3') {
      this.scene.setPlayerAngle(PLAYER_START_ANGLE);
    }
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
    this._clearCanvasSurface();

    this._updateStageLocks();
    if (this.ui) {
      if (typeof this.ui.hidePauseButton === 'function') this.ui.hidePauseButton();
      if (typeof this.ui.hidePauseMenu === 'function') this.ui.hidePauseMenu();
      this.ui.hideOverlays();
      if (showIntro && typeof this.ui.showIntro === 'function') {
        this.ui.showIntro();
      } else if (typeof this.ui.showStageSelection === 'function') {
        this.ui.showStageSelection();
        if (typeof this.ui.setStageSelection === 'function') {
          this.ui.setStageSelection(this.selectedStage, { ex: this.selectedStageIsEx });
        }
      }
    }
    this._syncExtraStageSnowPreview();
  }

  _clearCanvasSurface() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.save?.();
    if (this.ctx.setTransform) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore?.();
  }

  _syncExtraStageSnowPreview() {
    if (!this.extraStageSnow) return;
    const allowPreview = EXTRA_STAGE?.snowPreview?.enabled !== false;
    const introVisible = this.ui && typeof this.ui.isIntroVisible === 'function' ? this.ui.isIntroVisible() : false;
    const shouldPreview = allowPreview && !this.gameStarted && !introVisible && this.selectedStageIsEx;
    if (shouldPreview) {
      this.extraStageSnow.setSnowConfig(this._buildPreviewSnowConfig(this.selectedStage));
      this.extraStageSnow.setScale(this.viewportScale);
      this.extraStageSnow.start();
    } else {
      this.extraStageSnow.stop({ immediate: this.gameStarted });
    }
  }

  _stopExtraStageSnowPreview({ immediate = false } = {}) {
    if (!this.extraStageSnow) return;
    this.extraStageSnow.stop({ immediate });
  }

  _buildPreviewSnowConfig(stageId) {
    const base = this._deepCopy(SNOW);
    const globalOverride = EXTRA_STAGE?.snowPreview?.snow;
    const stageOverride = stageId ? EXTRA_STAGE?.snowPreview?.perStage?.[stageId] : null;
    const mergedGlobal = globalOverride && typeof globalOverride === 'object'
      ? this._mergeSnowConfig(base, globalOverride)
      : base;
    const mergedStage = stageOverride && typeof stageOverride === 'object'
      ? this._mergeSnowConfig(mergedGlobal, stageOverride)
      : mergedGlobal;
    return mergedStage;
  }

  _mergeSnowConfig(base, override) {
    const merged = { ...base };
    merged.alpha = this._pickNumber(override.alpha, base.alpha);
    merged.direction = override.direction || base.direction;
    merged.spawnPerMin = this._pickNumber(
      override.spawnPerMin,
      typeof override.spawnPerSecond === 'number' ? override.spawnPerSecond * 60 : null,
      base.spawnPerMin,
    );
    merged.spawnPerSecond = undefined;
    merged.size = {
      min: this._pickNumber(override?.size?.min, base?.size?.min),
      max: this._pickNumber(override?.size?.max, base?.size?.max),
    };
    merged.fallSpeed = {
      min: this._pickNumber(override?.fallSpeed?.min, base?.fallSpeed?.min),
      max: this._pickNumber(override?.fallSpeed?.max, base?.fallSpeed?.max),
    };
    merged.wind = {
      baseX: this._pickNumber(override?.wind?.baseX, base?.wind?.baseX),
      oscAmp: this._pickNumber(override?.wind?.oscAmp, base?.wind?.oscAmp),
      oscPeriodSec: this._pickNumber(override?.wind?.oscPeriodSec, base?.wind?.oscPeriodSec),
    };
    return merged;
  }

  _deepCopy(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (_) {
      return obj;
    }
  }

  _pickNumber(...values) {
    for (const value of values) {
      if (Number.isFinite(value)) return value;
    }
    return undefined;
  }

  _syncRadiiFromConfig() {
    this.viewportScale = this._computeViewportScale();
    this.orbitRadius = this._computeScaledOrbitRadius(this.viewportScale);
    const { baseRadius, baseRenderRadius } = this._resolvePlayerBaseRadii(this.playerSkin);
    this.playerRadius = this._computeScaledPlayerRadius(this.viewportScale, baseRadius);
    this.playerRenderRadius = this._computeScaledPlayerRenderRadius(this.viewportScale, baseRenderRadius);
    if (this.scene && typeof this.scene.setScale === 'function') {
      this.scene.setScale(this.viewportScale);
    }
    if (this.scene) {
      this.scene.setGeometry({
        centerX: this.centerX,
        centerY: this.centerY,
        orbitRadius: this.orbitRadius,
        playerRadius: this.playerRadius,
        playerRenderRadius: this.playerRenderRadius,
      });
    }
    if (this.runtime) {
      this.runtime.updateGeometry({
        centerX: this.centerX,
        centerY: this.centerY,
        orbitRadius: this.orbitRadius,
        offscreenRadius: this.offscreenRadius,
      });
    }
    if (this.extraStageSnow && typeof this.extraStageSnow.setScale === 'function') {
      this.extraStageSnow.setScale(this.viewportScale);
    }
  }

  _loadPersistedSkins() {
    const storedPlayer = this._readSkinFromStorage(PLAYER_SKIN_STORAGE_KEY);
    if (storedPlayer) {
      this.applyPlayerSkin(storedPlayer);
    }
    const storedObstacle = this._readSkinFromStorage(OBSTACLE_SKIN_STORAGE_KEY);
    if (storedObstacle) {
      this.applyObstacleSkin(storedObstacle);
    }
    const storedRing = this._readSkinFromStorage(RING_SKIN_STORAGE_KEY);
    if (storedRing) {
      this.applyRingSkin(storedRing);
    }
  }

  _readSkinFromStorage(storageKey) {
    if (typeof localStorage === 'undefined' || !storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  _writeSkinToStorage(storageKey, payload) {
    if (typeof localStorage === 'undefined' || !storageKey) return;
    try {
      if (!payload) {
        localStorage.removeItem(storageKey);
        return;
      }
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (_) {
      // ignore storage errors
    }
  }

  _serializePlayerSkin(skin) {
    if (!skin || typeof skin !== 'object') return null;
    const payload = {};
    if (skin.type === 'image' && typeof skin.src === 'string' && skin.src.length > 0) {
      payload.type = 'image';
      payload.src = skin.src;
    } else if (typeof skin.color === 'string' && skin.color.length > 0) {
      payload.type = 'color';
      payload.color = skin.color;
    } else {
      payload.type = 'default';
    }
    if (Number.isFinite(skin.radius)) payload.radius = skin.radius;
    if (Number.isFinite(skin.renderRadius)) payload.renderRadius = skin.renderRadius;
    return payload;
  }

  _serializeObstacleSkin(skin) {
    if (!skin || typeof skin !== 'object') return null;
    const payload = {};
    if (skin.type === 'image' && typeof skin.src === 'string' && skin.src.length > 0) {
      payload.type = 'image';
      payload.src = skin.src;
    } else if (typeof skin.color === 'string' && skin.color.length > 0) {
      payload.type = 'color';
      payload.color = skin.color;
    } else {
      payload.type = 'default';
    }
    if (Number.isFinite(skin.renderScale) && skin.renderScale !== 1) {
      payload.renderScale = skin.renderScale;
    }
    if (Number.isFinite(skin.hitScale) && skin.hitScale !== 1) {
      payload.hitScale = skin.hitScale;
    }
    return payload;
  }

  _serializeRingSkin(skin) {
    if (!skin || typeof skin !== 'object') return null;
    const payload = {};
    if (skin.type === 'image' && typeof skin.src === 'string' && skin.src.length > 0) {
      payload.type = 'image';
      payload.src = skin.src;
    } else if (typeof skin.color === 'string' && skin.color.length > 0) {
      payload.type = 'color';
      payload.color = skin.color;
    } else {
      payload.type = 'default';
    }
    if (Number.isFinite(skin.lineWidth)) {
      payload.lineWidth = skin.lineWidth;
    }
    if (Number.isFinite(skin.renderScale) && skin.renderScale !== 1) {
      payload.renderScale = skin.renderScale;
    }
    if (skin.glow === true) {
      payload.glow = true;
    }
    if (Number.isFinite(skin.glowBlur)) {
      payload.glowBlur = skin.glowBlur;
    }
    return payload;
  }

  _persistPlayerSkin(skin) {
    const payload = this._serializePlayerSkin(skin);
    const shouldClear = !payload
      || (payload.type === 'default'
        && !Number.isFinite(payload.radius)
        && !Number.isFinite(payload.renderRadius));
    this._writeSkinToStorage(PLAYER_SKIN_STORAGE_KEY, shouldClear ? null : payload);
  }

  _persistObstacleSkin(skin) {
    const payload = this._serializeObstacleSkin(skin);
    const shouldClear = !payload
      || (payload.type === 'default'
        && !Number.isFinite(payload.renderScale)
        && !Number.isFinite(payload.hitScale));
    this._writeSkinToStorage(OBSTACLE_SKIN_STORAGE_KEY, shouldClear ? null : payload);
  }

  _persistRingSkin(skin) {
    const payload = this._serializeRingSkin(skin);
    const shouldClear = !payload
      || (payload.type === 'default'
        && !Number.isFinite(payload.lineWidth)
        && !Number.isFinite(payload.renderScale)
        && payload.glow !== true
        && !Number.isFinite(payload.glowBlur));
    this._writeSkinToStorage(RING_SKIN_STORAGE_KEY, shouldClear ? null : payload);
  }

  _getHighScoreStorageKey(stageId) {
    if (!stageId || stageId === 'stage1') {
      return 'orbit_high_score';
    }
    return `orbit_high_score_${stageId}`;
  }

  _readHighScore(stageId) {
    const key = this._getHighScoreStorageKey(stageId);
    const legacyKey = (!stageId || stageId === 'stage1') ? 'orbit_high_score_stage1' : null;
    const defaultValue = (stageId && stageId.endsWith('_ex')) ? 60 : 0;
    const memoryValue = this.highScoreMemory.get(key) ?? defaultValue;
    try {
      const stored = localStorage.getItem(key);
      const parsed = stored ? parseInt(stored, 10) : defaultValue;
      const legacy = legacyKey ? parseInt(localStorage.getItem(legacyKey) ?? String(defaultValue), 10) : defaultValue;
      const best = Math.max(
        Number.isFinite(parsed) ? parsed : 0,
        Number.isFinite(legacy) ? legacy : 0,
        Number.isFinite(memoryValue) ? memoryValue : defaultValue,
      );
      return Math.max(defaultValue, best);
    } catch (_) {
      return Math.max(defaultValue, Number.isFinite(memoryValue) ? memoryValue : defaultValue);
    }
  }

  _saveHighScore(stageId, value) {
    const normalizedStageId = stageId || 'stage1';
    const normalized = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    const key = this._getHighScoreStorageKey(normalizedStageId);
    this.highScoreMemory.set(key, Math.max(normalized, this.highScoreMemory.get(key) ?? 0));
    try {
      localStorage.setItem(key, String(normalized));
      if (!stageId || stageId === 'stage1') {
        // Keep legacy key in sync for older builds that may still read it.
        localStorage.setItem('orbit_high_score_stage1', String(normalized));
      }
    } catch (_) {
      // ignore storage errors
    }
    if (this.runtime && typeof this.runtime.notifyHighScoreUpdated === 'function') {
      this.runtime.notifyHighScoreUpdated(normalizedStageId, normalized);
    }
  }

  _removeLocalStorageKeys(predicate) {
    if (typeof localStorage === 'undefined' || typeof predicate !== 'function') return;
    const toRemove = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && predicate(key)) {
          toRemove.push(key);
        }
      }
    } catch (_) {
      return;
    }
    toRemove.forEach((key) => {
      try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
    });
  }

  _getStageUnlockStorageKey(stageId) {
    if (!stageId) return 'stage_unlocked_default';
    return `stage_unlocked_${stageId}`;
  }

  _handleStagePlayable(stageId) {
    if (!stageId) return;
    if (stageId === 'stage2' || stageId === 'stage3') {
      this._unlockStage(stageId);
    }
  }

  _unlockStage(stageId) {
    if (!stageId || stageId === 'stage1') return;
    if (this._readStageUnlock(stageId)) return;
    try {
      localStorage.setItem(this._getStageUnlockStorageKey(stageId), '1');
    } catch (_) {
      // ignore storage errors
    }
    this._updateStageLocks();
  }

  _readStageUnlock(stageId) {
    if (!stageId || stageId === 'stage1') return true;
    try {
      const value = localStorage.getItem(this._getStageUnlockStorageKey(stageId));
      return value === '1';
    } catch (_) {
      return false;
    }
  }

  _refreshExtraStageFlagsFromStorage() {
    this.extraStageUnlocked = this._readExtraStageUnlock();
  }

  _readExtraStageUnlock() {
    try {
      return localStorage.getItem(EXTRA_STAGE_UNLOCK_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  _persistExtraStageUnlock(enabled) {
    try {
      if (enabled) {
        localStorage.setItem(EXTRA_STAGE_UNLOCK_KEY, '1');
      } else {
        localStorage.removeItem(EXTRA_STAGE_UNLOCK_KEY);
      }
    } catch (_) {
      // ignore storage errors
    }
  }

  _grantExtraStageUnlock() {
    this._refreshExtraStageFlagsFromStorage();
    if (this.extraStageUnlocked) return;
    this.extraStageUnlocked = true;
    this._persistExtraStageUnlock(true);
  }

  _disableExtraStageUnlocks() {
    this.extraStageUnlocked = false;
    this._persistExtraStageUnlock(false);
    if (this.selectedStageIsEx) {
      if (!this.gameStarted) {
        this.setSelectedStage(this.selectedStage, { ex: false });
      } else {
        this.selectedStageIsEx = false;
      }
    }
  }

  toggleAudioMute() {
    this.setAudioMuted(!this.audioMuted);
  }

  setAudioMuted(muted) {
    this.audioMuted = !!muted;
    this._applyAudioMuteState();
    this._syncSettingsUI();
  }

  _applyAudioMuteState() {
    if (this.audioManager && typeof this.audioManager.setMuted === 'function') {
      this.audioManager.setMuted(this.audioMuted);
    }
    if (this.effectAudioManager && typeof this.effectAudioManager.setMuted === 'function') {
      this.effectAudioManager.setMuted(this.audioMuted);
    }
  }

  _syncSettingsUI() {
    if (this.ui && typeof this.ui.setMuteState === 'function') {
      this.ui.setMuteState(this.audioMuted);
    }
  }

  _syncAdConfig() {
    if (this.adManager && typeof this.adManager.updateConfig === 'function') {
      this.adManager.updateConfig(ADS);
      if (typeof this.adManager.preload === 'function') {
        this.adManager.preload();
      }
    }
  }

  _handleAdOnGameComplete() {
    if (this.adManager && typeof this.adManager.handleGameCompleted === 'function') {
      this.adManager.handleGameCompleted();
    }
  }

  resetHighScores() {
    this._removeLocalStorageKeys((key) => key && key.startsWith('orbit_high_score'));
    this._removeLocalStorageKeys((key) => key && key.startsWith('stage_unlocked_'));
    this._disableExtraStageUnlocks();
    this.highScoreMemory.clear();
    this._updateStageLocks();
    this.setSelectedStage('stage1');
    if (this.score) {
      this.score.reset();
      this.score.setMaxSeconds(this.stageController.getTotalDuration());
    }
    if (this.runtime && typeof this.runtime.notifyHighScoreUpdated === 'function') {
      ['stage1', 'stage2', 'stage3'].forEach((stageId) => {
        this.runtime.notifyHighScoreUpdated(stageId, 0);
      });
    }
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

  _recordCompletionHighScore() {
    const displayScore = this.runtime ? this.runtime.getDisplayScore() : this.score.getSeconds();
    const finalScore = Math.floor(displayScore ?? this.score.getSeconds());
    if (!Number.isFinite(finalScore) || finalScore < 0) return;
    const stageId = this.stageController?.getStartingStageId?.() ?? 'stage1';
    const currentHigh = this._readHighScore(stageId);
    if (finalScore > currentHigh) {
      this._saveHighScore(stageId, finalScore);
    }
  }

  _collectBackgroundElements() {
    const elements = [];
    if (typeof document !== 'undefined') {
      if (document.documentElement) elements.push(document.documentElement);
      if (document.body) {
        elements.push(document.body);
      }
    }
    if (this.canvas) elements.push(this.canvas);
    if (this.ui) {
      if (this.ui.startScreen) elements.push(this.ui.startScreen);
      if (this.ui.gameOverScreen) elements.push(this.ui.gameOverScreen);
    }
    return elements;
  }

  _collectGlobalBackgroundTargets() {
    const targets = [];
    if (typeof document !== 'undefined') {
      if (document.documentElement) targets.push(document.documentElement);
      if (document.body) targets.push(document.body);
    }
    return targets;
  }

  _applyStageTheme(stageId, { immediate = false } = {}) {
    if (!this.backgroundFader || !this.stageThemeManager) return;
    this.backgroundFader.setElements(this._collectBackgroundElements());
    const baseId = this._normalizeBaseStageId(stageId);
    const theme = this.stageThemeManager.getTheme(baseId);
    this.backgroundFader.setDefaultDuration(theme.fadeDurationSec);
    if (immediate) {
      this.backgroundFader.setColorImmediate(theme.background);
    } else {
      this.backgroundFader.fadeTo(theme.background, theme.fadeDurationSec);
    }
  }

  applyPlayerSkin(skin = null) {
    this.playerSkin = this._normalizePlayerSkin(skin);
    this._syncRadiiFromConfig();
    if (this.scene && typeof this.scene.setPlayerSkin === 'function') {
      this.scene.setPlayerSkin(this.playerSkin);
    }
    this._persistPlayerSkin(this.playerSkin);
    if (this.ui && typeof this.ui.setPlayerSkinPreview === 'function') {
      this.ui.setPlayerSkinPreview(this.playerSkin);
    }
  }

  applyObstacleSkin(skin = null) {
    this.obstacleSkin = this._normalizeObstacleSkin(skin);
    if (this.scene && typeof this.scene.setObstacleSkin === 'function') {
      this.scene.setObstacleSkin(this.obstacleSkin);
    }
    this._persistObstacleSkin(this.obstacleSkin);
    if (this.ui && typeof this.ui.setObstacleSkinPreview === 'function') {
      this.ui.setObstacleSkinPreview(this.obstacleSkin);
    }
  }

  applyRingSkin(skin = null) {
    this.ringSkin = this._normalizeRingSkin(skin);
    if (this.scene && typeof this.scene.setRingSkin === 'function') {
      this.scene.setRingSkin(this.ringSkin);
    }
    this._persistRingSkin(this.ringSkin);
    if (this.ui && typeof this.ui.setRingSkinPreview === 'function') {
      this.ui.setRingSkinPreview(this.ringSkin);
    }
  }

  _normalizePlayerSkin(skin) {
    const fallback = {
      type: 'circle',
      color: null,
      image: null,
      src: null,
      radius: null,
      renderRadius: null,
    };
    if (!skin || typeof skin !== 'object') return fallback;
    const radius = Number.isFinite(skin.radius) ? skin.radius : null;
    const renderRadius = Number.isFinite(skin.renderRadius) ? skin.renderRadius : null;
    if (skin.type === 'image' && typeof skin.src === 'string' && skin.src.length > 0) {
      const image = new Image();
      image.src = skin.src;
      return { type: 'image', color: null, image, src: skin.src, radius, renderRadius };
    }
    const color = typeof skin.color === 'string' && skin.color.length > 0 ? skin.color : null;
    return { type: 'circle', color, image: null, src: null, radius, renderRadius };
  }

  _resolvePlayerBaseRadii(skin) {
    const fallbackRadius = typeof PLAYER?.radius === 'number' ? PLAYER.radius : 15;
    const fallbackRenderRadius = typeof PLAYER?.renderRadius === 'number'
      ? PLAYER.renderRadius
      : fallbackRadius;
    const baseRadius = (skin && Number.isFinite(skin.radius) && skin.radius > 0)
      ? skin.radius
      : fallbackRadius;
    const baseRenderRadius = (skin && Number.isFinite(skin.renderRadius) && skin.renderRadius > 0)
      ? skin.renderRadius
      : fallbackRenderRadius;
    return { baseRadius, baseRenderRadius };
  }

  _normalizeObstacleSkin(skin) {
    const fallback = {
      type: 'color',
      color: '#ffffff',
      image: null,
      src: null,
      renderScale: 1,
      hitScale: 1,
    };
    if (!skin || typeof skin !== 'object') return fallback;
    const renderScale = (Number.isFinite(skin.renderScale) && skin.renderScale > 0) ? skin.renderScale : 1;
    const hitScale = (Number.isFinite(skin.hitScale) && skin.hitScale > 0) ? skin.hitScale : 1;
    if (skin.type === 'image' && typeof skin.src === 'string' && skin.src.length > 0) {
      const image = new Image();
      image.src = skin.src;
      return { type: 'image', color: null, image, src: skin.src, renderScale, hitScale };
    }
    const color = (typeof skin.color === 'string' && skin.color.length > 0) ? skin.color : fallback.color;
    return { type: 'color', color, image: null, src: null, renderScale, hitScale };
  }

  _normalizeRingSkin(skin) {
    const fallback = {
      type: 'default',
      color: null,
      image: null,
      src: null,
      lineWidth: null,
      renderScale: 1,
      glow: false,
      glowBlur: null,
    };
    if (!skin || typeof skin !== 'object') return fallback;
    const lineWidth = Number.isFinite(skin.lineWidth) ? skin.lineWidth : null;
    const renderScale = (Number.isFinite(skin.renderScale) && skin.renderScale > 0) ? skin.renderScale : 1;
    const glow = skin.glow === true;
    const glowBlur = Number.isFinite(skin.glowBlur) ? skin.glowBlur : null;
    if (skin.type === 'image' && typeof skin.src === 'string' && skin.src.length > 0) {
      const image = new Image();
      image.src = skin.src;
      return { type: 'image', color: null, image, src: skin.src, lineWidth, renderScale, glow, glowBlur };
    }
    const color = typeof skin.color === 'string' && skin.color.length > 0 ? skin.color : null;
    if (skin.type === 'color' || color) {
      return { type: 'color', color, image: null, src: null, lineWidth, renderScale, glow, glowBlur };
    }
    return { type: 'default', color: null, image: null, src: null, lineWidth, renderScale, glow, glowBlur };
  }

  resizeCanvas({ width, height } = {}) {
    const nextWidth = Number(width);
    const nextHeight = Number(height);
    if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) return;
    if (nextWidth <= 0 || nextHeight <= 0) return;

    const changed = this.canvas.width !== nextWidth || this.canvas.height !== nextHeight;
    if (!changed) return;

    this.canvas.width = nextWidth;
    this.canvas.height = nextHeight;
    if (this.extraStageSnow && typeof this.extraStageSnow.setCanvasSize === 'function') {
      this.extraStageSnow.setCanvasSize(nextWidth, nextHeight);
    }

    this.centerX = nextWidth / 2;
    this.centerY = nextHeight / 2;
    this.offscreenRadius = Math.hypot(nextWidth / 2, nextHeight / 2) + 40;
    this.viewportScale = this._computeViewportScale();
    this.orbitRadius = this._computeScaledOrbitRadius(this.viewportScale);
    const { baseRadius, baseRenderRadius } = this._resolvePlayerBaseRadii(this.playerSkin);
    this.playerRadius = this._computeScaledPlayerRadius(this.viewportScale, baseRadius);
    this.playerRenderRadius = this._computeScaledPlayerRenderRadius(this.viewportScale, baseRenderRadius);

    if (this.scene && typeof this.scene.setScale === 'function') {
      this.scene.setScale(this.viewportScale);
    }

    if (this.scene) {
      this.scene.setGeometry({
        centerX: this.centerX,
        centerY: this.centerY,
        orbitRadius: this.orbitRadius,
        playerRadius: this.playerRadius,
        playerRenderRadius: this.playerRenderRadius,
      });
    }
    if (this.runtime) {
      this.runtime.updateGeometry({
        centerX: this.centerX,
        centerY: this.centerY,
        orbitRadius: this.orbitRadius,
        offscreenRadius: this.offscreenRadius,
      });
      this.runtime.setBackgroundTargets(this._collectGlobalBackgroundTargets());
    }
    if (this.extraStageSnow && typeof this.extraStageSnow.setScale === 'function') {
      this.extraStageSnow.setScale(this.viewportScale);
    }
    if (this.backgroundFader) {
      this.backgroundFader.setElements(this._collectBackgroundElements());
    }
    const activeStage = this.stageController?.getActiveStage?.();
    if (activeStage && typeof activeStage.updateViewport === 'function') {
      activeStage.updateViewport({
        centerX: this.centerX,
        centerY: this.centerY,
        viewWidth: nextWidth,
        viewHeight: nextHeight,
        orbitRadius: this.orbitRadius,
      });
    }
  }

  _computeScaledOrbitRadius(scale = 1) {
    const ratio = this._resolveOrbitRadiusRatio();
    const currentSide = this._resolveCurrentMinViewportSide();
    if (Number.isFinite(ratio) && ratio > 0 && Number.isFinite(currentSide) && currentSide > 0) {
      return currentSide * ratio;
    }
    const baseOrbit = typeof ORBIT?.radius === 'number' ? ORBIT.radius : 160;
    const normalized = Number.isFinite(scale) && scale > 0 ? scale : 1;
    return baseOrbit * normalized;
  }

  _computeScaledPlayerRadius(scale = 1, baseRadius) {
    const basePlayer = (Number.isFinite(baseRadius) && baseRadius > 0)
      ? baseRadius
      : (typeof PLAYER?.radius === 'number' ? PLAYER.radius : 15);
    const normalized = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const scaled = basePlayer * normalized;
    return Math.max(2.5, scaled);
  }

  _computeScaledPlayerRenderRadius(scale = 1, baseRadius) {
    const fallback = typeof PLAYER?.renderRadius === 'number'
      ? PLAYER.renderRadius
      : (typeof PLAYER?.radius === 'number' ? PLAYER.radius : 15);
    const basePlayer = (Number.isFinite(baseRadius) && baseRadius > 0) ? baseRadius : fallback;
    const normalized = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const scaled = basePlayer * normalized;
    return Math.max(2.5, scaled);
  }

  _computeViewportScale() {
    const referenceSide = this._resolveReferenceViewportSide();
    if (!Number.isFinite(referenceSide) || referenceSide <= 0) return 1;
    const currentSide = this._resolveCurrentMinViewportSide();
    if (!Number.isFinite(currentSide) || currentSide <= 0) return 1;
    const scale = currentSide / referenceSide;
    if (!Number.isFinite(scale) || scale <= 0) return 1;
    return scale;
  }

  _resolveReferenceViewportSide() {
    const referenceWidth = typeof CANVAS?.width === 'number' ? CANVAS.width : 900;
    const referenceHeight = typeof CANVAS?.height === 'number' ? CANVAS.height : 900;
    const referenceSide = Math.min(referenceWidth, referenceHeight);
    return Number.isFinite(referenceSide) && referenceSide > 0 ? referenceSide : null;
  }

  _resolveCurrentMinViewportSide() {
    const fallbackWidth = typeof CANVAS?.width === 'number' ? CANVAS.width : 900;
    const fallbackHeight = typeof CANVAS?.height === 'number' ? CANVAS.height : 900;
    const width = Number.isFinite(this.canvas?.width) ? this.canvas.width : fallbackWidth;
    const height = Number.isFinite(this.canvas?.height) ? this.canvas.height : fallbackHeight;
    const currentSide = Math.min(width, height);
    return Number.isFinite(currentSide) && currentSide > 0 ? currentSide : null;
  }

  _resolveOrbitRadiusRatio() {
    if (Number.isFinite(CANVAS?.orbitRadiusToMinSide) && CANVAS.orbitRadiusToMinSide > 0) {
      return CANVAS.orbitRadiusToMinSide;
    }
    const referenceSide = this._resolveReferenceViewportSide();
    const baseOrbit = typeof ORBIT?.radius === 'number' ? ORBIT.radius : 160;
    if (!Number.isFinite(referenceSide) || referenceSide <= 0) return null;
    if (!Number.isFinite(baseOrbit) || baseOrbit <= 0) return null;
    return baseOrbit / referenceSide;
  }

  _normalizeBaseStageId(stageId) {
    if (!stageId || stageId === STAGE_ALL_CLEAR_ID) return stageId;
    return stageId.endsWith('_ex') ? stageId.slice(0, -3) : stageId;
  }

  _resolveStageId(baseStageId, isEx) {
    const normalized = this._normalizeBaseStageId(baseStageId);
    if (!normalized) return null;
    const suffix = isEx ? '_ex' : '';
    const resolved = `${normalized}${suffix}`;
    if (this.stageMap?.[resolved]) return resolved;
    if (!isEx && this.stageMap?.[normalized]) return normalized;
    return null;
  }

  _resolveStageOrder(resolvedStageId, isEx) {
    if (isEx && resolvedStageId) {
      return [resolvedStageId];
    }
    return this.baseStageOrder.slice();
  }

  _isStageUnlocked(stageId) {
    const base = this._normalizeBaseStageId(stageId);
    return this._readStageUnlock(base);
  }

  _canUseExtraStage(stageId) {
    if (!stageId) return false;
    if (!this.extraStageUnlocked) return false;
    return this._isStageUnlocked(stageId);
  }

  _updateStageLocks() {
    const stage2Unlocked = this._isStageUnlocked('stage2');
    if (this.ui && typeof this.ui.setStageLock === 'function') {
      this.ui.setStageLock('stage2', !stage2Unlocked);
      const stage3Unlocked = this._isStageUnlocked('stage3');
      this.ui.setStageLock('stage3', !stage3Unlocked);
    }
    if (!stage2Unlocked && this.selectedStage === 'stage2') {
      this.selectedStage = 'stage1';
      this.selectedStageIsEx = false;
      this._stopStageMusic();
      const resolved = this._resolveStageId(this.selectedStage, this.selectedStageIsEx);
      const order = this._resolveStageOrder(resolved, this.selectedStageIsEx);
      this.stageOrder = order.slice();
      this.stageController.stageOrder = order.slice();
      this.stageController.setStartingStage(resolved);
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
        this.ui.setStageSelection(this.selectedStage, { ex: this.selectedStageIsEx });
      }
      this._applyStageTheme(this.selectedStage, { immediate: true });
    }
    if (!this._isStageUnlocked('stage3') && this.selectedStage === 'stage3') {
      this.selectedStage = 'stage1';
      this.selectedStageIsEx = false;
      this._stopStageMusic();
      const resolved = this._resolveStageId(this.selectedStage, this.selectedStageIsEx);
      const order = this._resolveStageOrder(resolved, this.selectedStageIsEx);
      this.stageOrder = order.slice();
      this.stageController.stageOrder = order.slice();
      this.stageController.setStartingStage(resolved);
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
        this.ui.setStageSelection(this.selectedStage, { ex: this.selectedStageIsEx });
      }
      this._applyStageTheme(this.selectedStage, { immediate: true });
    }
    if (this.selectedStageIsEx && !this._canUseExtraStage(this.selectedStage)) {
      this.setSelectedStage(this.selectedStage, { ex: false });
    }
    this._syncExtraStageSnowPreview();
  }
}
