import { SNOW } from './Config.js';
import { STAGE_ALL_CLEAR_ID } from './StageAllClear.js';

export class StageRuntime {
  constructor({
    scene,
    stageController,
    score,
    ui,
    audioManager,
    ctx,
    canvas,
    geometry,
    onPlayerHit,
    backgroundTargets = [],
    onStagePlayable,
    highScoreProvider,
    scoreHighlightConfig = {},
  } = {}) {
    this.scene = scene;
    this.stageController = stageController;
    this.score = score;
    this.ui = ui;
    this.audioManager = audioManager;
    this.ctx = ctx;
    this.canvas = canvas;
    this.updateGeometry(geometry);
    this.onPlayerHit = typeof onPlayerHit === 'function' ? onPlayerHit : null;
    this.onStagePlayable = typeof onStagePlayable === 'function' ? onStagePlayable : null;

    this.scoreBase = 0;
    this.stageElapsedOffset = 0;
    this.currentStageId = this.stageController?.getActiveStageId?.() ?? null;
    this.highlightStageId = this._resolveHighlightStageId();
    this.currentDisplayScore = 0;
    this.lastTime = null;
    this.mutedStages = new Set();
    this.playableStageNotified = new Set();
    this.backgroundTargets = Array.isArray(backgroundTargets)
      ? backgroundTargets.filter((target) => target && target.style)
      : [];
    this.highScoreProvider = typeof highScoreProvider === 'function' ? highScoreProvider : null;
    this.scoreHighlightOptions = {
      enabled: scoreHighlightConfig?.enabled !== false,
      pulseSpeedHz: Number.isFinite(scoreHighlightConfig?.pulseSpeedHz)
        ? Math.max(0, scoreHighlightConfig.pulseSpeedHz)
        : 2,
      durationSec: Number.isFinite(scoreHighlightConfig?.durationSec)
        ? Math.max(0, scoreHighlightConfig.durationSec)
        : 0.5,
    };
    this.highlightState = { active: false, timer: 0, intensity: 0, elapsed: 0 };
    this.currentHighScoreStageId = null;
    this.currentHighScoreValue = 0;
    this.highlightTriggered = false;
    this.pendingHighScoreValues = new Map();
    this._syncHighScoreForStage(this.highlightStageId);
  }

  updateGeometry({ centerX, centerY, orbitRadius, offscreenRadius } = {}) {
    if (typeof centerX === 'number') this.centerX = centerX;
    if (typeof centerY === 'number') this.centerY = centerY;
    if (typeof orbitRadius === 'number') this.orbitRadius = orbitRadius;
    if (typeof offscreenRadius === 'number') this.offscreenRadius = offscreenRadius;
  }

  resetTracking() {
    this.scoreBase = 0;
    this.stageElapsedOffset = 0;
    this.currentStageId = this.stageController?.getActiveStageId?.() ?? null;
    this.highlightStageId = this._resolveHighlightStageId();
    this.currentDisplayScore = 0;
    this.lastTime = null;
    this.mutedStages.clear();
    this.playableStageNotified.clear();
    this._applyBackgroundColor(null);
    this._syncHighScoreForStage(this.highlightStageId);
  }

  resetDeltaTime() {
    this.lastTime = null;
  }

  ensurePrologForStage(stage) {
    if (!stage || typeof stage.startProlog !== 'function') return;
    stage.startProlog({
      centerX: this.centerX,
      centerY: this.centerY,
      orbitRadius: this.orbitRadius,
      viewWidth: this.canvas?.width ?? null,
      viewHeight: this.canvas?.height ?? null,
    });
  }

  syncAudio() {
    this._maybePlayStageMusic();
  }

  step(now, { debugMode = false } = {}) {
    const dt = this._computeDelta(now);
    this.score.update(now);

    const secondsElapsed = this.score.getSeconds();
    const { stage, changed: stageChanged } = this.stageController.update(secondsElapsed, { debugMode });
    if (stageChanged && stage) {
      this.scene.applyStageConfig(stage);
      this.ensurePrologForStage(stage);
      this._maybePlayStageMusic();
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
      this.ensurePrologForStage(activeStage);
    }

    const activeStageId = this.stageController.getActiveStageId();
    const isAllClearStage = activeStageId === STAGE_ALL_CLEAR_ID;
    if (this.currentStageId == null) this.currentStageId = activeStageId;
    if (this.currentStageId !== activeStageId) {
      const previousStageId = this.currentStageId;
      if (previousStageId) {
        this.scoreBase += this._getStageTotalDuration(previousStageId);
      }
      this.currentStageId = activeStageId;
      this.stageElapsedOffset = 0;
      if (this.audioManager && previousStageId === 'stage1' && this.audioManager.isPlaying('stage1')) {
        this.audioManager.stopStage('stage1');
      }
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
    if (isAllClearStage) {
      stageElapsedRaw = 0;
    } else if (activeStageInstance && typeof activeStageInstance.getTotalDuration === 'function') {
      const totalDuration = activeStageInstance.getTotalDuration();
      if (this.stageController.isStageFinished()) {
        stageElapsedRaw = totalDuration;
      }
    }
    const displaySeconds = this.scoreBase + stageElapsedRaw;
    this.currentDisplayScore = displaySeconds;
    this._updateHighlightState(displaySeconds, dtSeconds);

    this._notifyStagePlayableIfNeeded({
      stageId: activeStageId,
      prologActive,
      stageElapsed: stageElapsedRaw,
    });

    if (this.audioManager && this.audioManager.isPlaying('stage1')) {
      const activeBaseId = this._normalizeBaseStageId(activeStageId);
      if (activeBaseId !== 'stage1' || stageElapsedRaw >= 60) {
        this.audioManager.stopStage('stage1');
      }
    }
    if (this.audioManager) {
      this._syncStageTrack('stage2', { activeStageId, prologActive, stageElapsed: stageElapsedRaw });
      this._syncStageTrack('stage3', { activeStageId, prologActive, stageElapsed: stageElapsedRaw });
    }

    const backgroundColor = this.stageController.getBackgroundColor('#000000');
    this._applyBackgroundColor(backgroundColor);
    const backgroundOffset = this.stageController.getBackgroundOffset({ x: 0, y: 0 }) ?? { x: 0, y: 0 };
    const hasBackgroundOffset = Boolean(
      backgroundOffset && (backgroundOffset.x !== 0 || backgroundOffset.y !== 0),
    );
    this._clearCanvas(backgroundColor);

    const elapsedForEffects = stageElapsedRaw;
    const snowStartAt = (typeof SNOW?.enabledAfterSeconds === 'number') ? SNOW.enabledAfterSeconds : 10;
    const snowEnabled = debugMode ? true : this.stageController.isSnowEnabled();
    const snowActive = snowEnabled && elapsedForEffects >= snowStartAt && !prologActive;
    const allowSpawn = (!prologActive) && (debugMode ? true : this.stageController.canSpawn());
    const visibleScore = Math.max(0, Math.floor(stageElapsedRaw));
    const rhythmPaused = prologActive || isAllClearStage;

    const { playerHit } = this.scene.updateFrame({
      dt,
      debugMode,
      stageFinished,
      allowSpawn,
      visibleScore,
      offscreenRadius: this._getOffscreenRadius(),
      snowActive,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      extraObstacles: prologObstacles,
      rhythmPaused,
    });

    if (hasBackgroundOffset) {
      this.ctx.save();
      this.ctx.translate(backgroundOffset.x, backgroundOffset.y);
    }

    this.scene.drawFrame(this.ctx, {
      stageFinished,
      centerX: this.centerX,
      centerY: this.centerY,
      orbitRadius: this.orbitRadius,
      snowActive,
      extraObstacles: prologObstacles,
      rhythmPaused,
    });

    if (activeStage && typeof activeStage.drawProlog === 'function') {
      activeStage.drawProlog(this.ctx, {
        centerX: this.centerX,
        centerY: this.centerY,
        orbitRadius: this.orbitRadius,
      });
    }

    if (debugMode) {
      this._drawDebugLabel();
    } else {
      let hideScore = this.stageController.shouldHideScore();
      if (stageFinished) hideScore = true;
      if (
        (activeStageId === 'stage2' || activeStageId === 'stage3')
        && (prologActive || stageElapsedRaw <= 0)
      ) hideScore = true;
      if (!hideScore && this.ui && typeof this.ui.drawScore === 'function') {
        this.ui.drawScore(
          this.ctx,
          displaySeconds,
          this.centerX,
          this.centerY,
          this.orbitRadius,
          { highlight: this._getHighlightRenderState() },
        );
      }
    }

    if (hasBackgroundOffset) {
      this.ctx.restore();
    }

    if (playerHit) {
      if (this.onPlayerHit) {
        this.onPlayerHit({
          stageId: activeStageId,
          seconds: secondsElapsed,
        });
      }
      return { playerHit: true };
    }

    return { playerHit: false };
  }

  getDisplayScore() {
    return this.currentDisplayScore;
  }

  getCurrentStageId() {
    return this.currentStageId;
  }

  _getHighlightRenderState() {
    if (!this._isHighlightEnabled()) {
      return { active: false, intensity: 0 };
    }
    return {
      active: !!this.highlightState.active,
      intensity: this._clamp01(this.highlightState.intensity ?? 0),
    };
  }

  _updateHighlightState(displaySeconds, dtSeconds) {
    const stageId = this.highlightStageId;
    if (!this._isHighlightEnabled() || !this._isHighlightStage(stageId)) {
      this._resetHighlightState();
      this.highlightTriggered = false;
      return;
    }
    if (this.currentHighScoreStageId !== stageId) {
      this._syncHighScoreForStage(stageId);
    }
    const target = this.currentHighScoreValue ?? 0;
    const visibleScore = Math.floor(Math.max(0, displaySeconds));
    if (!this.highlightTriggered && visibleScore > target) {
      this.highlightTriggered = true;
      this.highlightState.active = true;
      this.highlightState.timer = 0;
      this.highlightState.elapsed = 0;
    }
    if (this.highlightState.active) {
      const speed = this.scoreHighlightOptions?.pulseSpeedHz > 0
        ? this.scoreHighlightOptions.pulseSpeedHz
        : 2;
      const omega = speed * Math.PI * 2;
      this.highlightState.timer += dtSeconds * omega;
      const wave = (Math.sin(this.highlightState.timer) + 1) / 2;
      this.highlightState.intensity = wave;
      this.highlightState.elapsed += dtSeconds;
      const maxDuration = this.scoreHighlightOptions?.durationSec;
      if (maxDuration > 0 && this.highlightState.elapsed >= maxDuration) {
        this._resetHighlightState();
      }
    } else {
      this.highlightState.intensity = 0;
    }
  }

  _syncHighScoreForStage(stageId) {
    this.currentHighScoreStageId = stageId || null;
    if (!this.highScoreProvider || !this._isHighlightStage(stageId)) {
      this.currentHighScoreValue = 0;
      this.highlightTriggered = false;
      this._resetHighlightState();
      return;
    }
    let numeric = 0;
    if (this.pendingHighScoreValues.has(stageId)) {
      numeric = this.pendingHighScoreValues.get(stageId);
      this.pendingHighScoreValues.delete(stageId);
    } else {
      const value = this.highScoreProvider(stageId);
      numeric = Number.isFinite(value) ? value : 0;
    }
    this.currentHighScoreValue = Math.max(0, numeric);
    this.highlightTriggered = false;
    this._resetHighlightState();
  }

  _resetHighlightState() {
    this.highlightState = { active: false, timer: 0, intensity: 0, elapsed: 0 };
  }

  _isHighlightEnabled() {
    return !!(this.scoreHighlightOptions?.enabled && this.highScoreProvider);
  }

  _isHighlightStage(stageId) {
    return !!(stageId && stageId !== STAGE_ALL_CLEAR_ID);
  }

  _resolveHighlightStageId() {
    const startingStageId = this.stageController?.getStartingStageId?.();
    const normalizedStarting = this._normalizeStageId(startingStageId);
    if (normalizedStarting) return normalizedStarting;
    const activeStageId = this.stageController?.getActiveStageId?.();
    return this._normalizeStageId(activeStageId);
  }

  notifyHighScoreUpdated(stageId, value) {
    if (!this._isHighlightStage(stageId)) return;
    const normalized = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    this.pendingHighScoreValues.set(stageId, normalized);
    if (stageId === this.highlightStageId) {
      this.currentHighScoreValue = normalized;
      this.currentHighScoreStageId = stageId;
      this.highlightTriggered = false;
      this._resetHighlightState();
    }
  }

  _clamp01(value) {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  _computeDelta(now) {
    const dt = this.lastTime == null ? 1 : Math.min(3, (now - this.lastTime) / (1000 / 60));
    this.lastTime = now;
    return dt;
  }

  _handleStageAdvance(currentSeconds) {
    const previousStageId = this.stageController.getActiveStageId();
    const advanced = this.stageController.advance(currentSeconds);
    if (!advanced) return false;
    if (previousStageId) {
      this.mutedStages.delete(this._normalizeBaseStageId(previousStageId));
    }
    this.scene.resetAfterStageTransition();
    const nextStageId = this.stageController.getActiveStageId();
    if (this.audioManager && typeof this.audioManager.setNextOffset === 'function') {
      if (previousStageId === 'stage1' && nextStageId === 'stage2') {
        this.audioManager.setNextOffset('stage2', 0);
      } else if (previousStageId === 'stage2' && nextStageId === 'stage3') {
        this.audioManager.setNextOffset('stage3', 0);
      }
    }
    const stage = this.stageController.getActiveStage();
    if (stage) {
      if (typeof stage.setSkipProlog === 'function') {
        stage.setSkipProlog(false);
      }
      this.scene.applyStageConfig(stage);
      this.ensurePrologForStage(stage);
    }
    this._maybePlayStageMusic();
    return true;
  }

  _maybePlayStageMusic() {
    if (!this.audioManager) return;
    const rawStageId = this.stageController.getActiveStageId();
    const stageId = this._normalizeBaseStageId(rawStageId);
    if (this._isStageMuted(stageId)) {
      this.audioManager.stopStage(stageId);
      return;
    }
    if (stageId === 'stage1') {
      this.audioManager.playStage('stage1');
    } else if (this.audioManager.isPlaying('stage1')) {
      this.audioManager.stopStage('stage1');
    }
  }

  _syncStageTrack(stageId, { activeStageId, prologActive, stageElapsed } = {}) {
    if (!stageId || !this.audioManager) return;
    const normalized = this._normalizeBaseStageId(stageId);
    if (!normalized) return;

    if (this._isStageMuted(normalized)) {
      if (this.audioManager.isPlaying(normalized)) {
        this.audioManager.stopStage(normalized);
      }
      return;
    }

    const activeBaseId = this._normalizeBaseStageId(activeStageId);
    const isActive = activeBaseId === normalized;
    const shouldForceStopAt60 = isActive && normalized !== 'stage1' && Number.isFinite(stageElapsed) && stageElapsed >= 60;
    if (shouldForceStopAt60) {
      if (this.audioManager.isPlaying(normalized)) {
        this.audioManager.stopStage(normalized);
      }
      return;
    }
    const stageFinished = this.stageController?.isStageFinished?.();
    const shouldPlay = isActive && !prologActive && !stageFinished;
    const isPlaying = this.audioManager.isPlaying(normalized);

    if (shouldPlay) {
      if (!isPlaying) {
        this.audioManager.playStage(normalized);
      }
      return;
    }

    if (isPlaying) {
      this.audioManager.stopStage(normalized);
    }
  }

  _clearCanvas(color) {
    if (this.ctx.setTransform) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.ctx.fillStyle = color || '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _drawDebugLabel() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const sizePx = Math.max(16, Math.floor(this.orbitRadius * 0.33));
    this.ctx.font = `${sizePx}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Debug Mode', this.centerX, this.centerY);
    this.ctx.restore();
  }

  _notifyStagePlayableIfNeeded({ stageId, prologActive, stageElapsed }) {
    if (!this.onStagePlayable || !stageId) return;
    if (prologActive) return;
    if (stageElapsed <= 0) return;
    if (this.playableStageNotified.has(stageId)) return;
    this.playableStageNotified.add(stageId);
    try {
      this.onStagePlayable(stageId);
    } catch (_) {
      // ignore callback errors to avoid breaking runtime loop
    }
  }

  _getStageTotalDuration(stageId) {
    if (!stageId) return 0;
    const queue = this.stageController?.stageQueue;
    if (!Array.isArray(queue)) return 0;
    for (const entry of queue) {
      if (!entry || entry.id !== stageId) continue;
      if (entry.stage && typeof entry.stage.getTotalDuration === 'function') {
        const duration = entry.stage.getTotalDuration();
        return Number.isFinite(duration) ? duration : 0;
      }
      break;
    }
    return 0;
  }

  _getOffscreenRadius() {
    if (typeof this.offscreenRadius === 'number') return this.offscreenRadius;
    if (!this.canvas) return 0;
    return Math.hypot(this.canvas.width / 2, this.canvas.height / 2) + 40;
  }

  muteStage(stageId) {
    if (!stageId) return;
    const normalized = this._normalizeBaseStageId(stageId);
    if (!normalized) return;
    this.mutedStages.add(normalized);
    if (this.audioManager && this.audioManager.isPlaying(normalized)) {
      this.audioManager.stopStage(normalized);
    }
  }

  setBackgroundTargets(targets = []) {
    this.backgroundTargets = Array.isArray(targets)
      ? targets.filter((target) => target && target.style)
      : [];
  }

  _normalizeStageId(stageId) {
    if (!stageId) return null;
    if (typeof stageId === 'string') return stageId;
    if (stageId && stageId.id) return stageId.id;
    return String(stageId);
  }

  _normalizeBaseStageId(stageId) {
    const raw = this._normalizeStageId(stageId);
    if (!raw || raw === STAGE_ALL_CLEAR_ID) return raw;
    return raw.endsWith('_ex') ? raw.slice(0, -3) : raw;
  }

  _isStageMuted(stageId) {
    const normalized = this._normalizeBaseStageId(stageId);
    if (!normalized) return false;
    return this.mutedStages.has(normalized);
  }

  _applyBackgroundColor(color) {
    if (!this.backgroundTargets?.length) return;
    if (!color) {
      for (const target of this.backgroundTargets) {
        if (target && target.style) {
          target.style.backgroundColor = '';
        }
      }
      return;
    }
    for (const target of this.backgroundTargets) {
      if (target && target.style) {
        target.style.backgroundColor = color;
      }
    }
  }
}
