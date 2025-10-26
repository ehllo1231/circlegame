import { SNOW } from './Config.js';

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

    this.scoreBase = 0;
    this.stageElapsedOffset = 0;
    this.currentStageId = this.stageController?.getActiveStageId?.() ?? null;
    this.currentDisplayScore = 0;
    this.lastTime = null;
    this.mutedStages = new Set();
    this.backgroundTargets = Array.isArray(backgroundTargets)
      ? backgroundTargets.filter((target) => target && target.style)
      : [];
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
    this.currentDisplayScore = 0;
    this.lastTime = null;
    this.mutedStages.clear();
    this._applyBackgroundColor(null);
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
    if (activeStageInstance && typeof activeStageInstance.getTotalDuration === 'function') {
      const totalDuration = activeStageInstance.getTotalDuration();
      if (this.stageController.isStageFinished()) {
        stageElapsedRaw = totalDuration;
      }
    }
    const displaySeconds = this.scoreBase + stageElapsedRaw;
    this.currentDisplayScore = displaySeconds;

    if (this.audioManager && this.audioManager.isPlaying('stage1')) {
      if (activeStageId !== 'stage1' || stageElapsedRaw >= 60) {
        this.audioManager.stopStage('stage1');
      }
    }
    if (this.audioManager) {
      if (activeStageId === 'stage2') {
        if (!prologActive && !this.stageController.isStageFinished()) {
          this.audioManager.playStage('stage2');
        } else if (this.audioManager.isPlaying('stage2')) {
          this.audioManager.stopStage('stage2');
        }
      } else if (this.audioManager.isPlaying('stage2')) {
        this.audioManager.stopStage('stage2');
      }
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
      rhythmPaused: prologActive,
    });

    if (playerHit) {
      if (this.onPlayerHit) {
        this.onPlayerHit({
          stageId: activeStageId,
          seconds: secondsElapsed,
        });
      }
      return { playerHit: true };
    }

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
      rhythmPaused: prologActive,
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
        );
      }
    }

    if (hasBackgroundOffset) {
      this.ctx.restore();
    }

    return { playerHit: false };
  }

  getDisplayScore() {
    return this.currentDisplayScore;
  }

  getCurrentStageId() {
    return this.currentStageId;
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
      this.mutedStages.delete(this._normalizeStageId(previousStageId));
    }
    this.scene.resetAfterStageTransition();
    const nextStageId = this.stageController.getActiveStageId();
    if (previousStageId === 'stage1' && nextStageId === 'stage2' && this.audioManager && typeof this.audioManager.setNextOffset === 'function') {
      this.audioManager.setNextOffset('stage2', 0);
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
    const stageId = this.stageController.getActiveStageId();
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
    const normalized = this._normalizeStageId(stageId);
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

  _isStageMuted(stageId) {
    const normalized = this._normalizeStageId(stageId);
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
