import { SCORE, UI } from './Config.js';

export class UIController {
  constructor() {
    this.introScreen = document.getElementById('introScreen');
    this.startScreen = document.getElementById('startScreen');
    this.gameStartButton = document.getElementById('gameStartButton');
    this.gameTitle = document.getElementById('gameTitle');
    this.startButton = document.getElementById('startButton');
    this.gameOverScreen = document.getElementById('gameOverScreen');
    this.restartButton = document.getElementById('restartButton');
    this.scoreDisplay = document.getElementById('scoreDisplay');
    this.gameOverTitle = document.getElementById('gameOverTitle');
    this.gameOverActions = document.getElementById('gameOverActions');
    this.stageButtons = Array.from(document.querySelectorAll('.stage-button'));
    this.stageSelectButton = document.getElementById('stageSelectButton');
    this.stageSelectContainer = document.getElementById('stageSelect');
    this.stageSelectLabel = document.getElementById('stageSelectLabel');
    this.pauseButton = document.getElementById('pauseButton');
    this.pauseMenu = document.getElementById('pauseMenu');
    this.pauseResumeButton = document.getElementById('pauseResumeButton');
    this.pauseStageSelectButton = document.getElementById('pauseStageSelectButton');
    this.settingsButton = document.getElementById('settingsButton');
    this.settingsModal = document.getElementById('settingsModal');
    this.settingsResetButton = document.getElementById('settingsResetButton');
    this.closeSettingsButton = document.getElementById('closeSettingsButton');
    this.muteToggleButton = document.getElementById('muteToggleButton');
    this.resetConfirmModal = document.getElementById('resetConfirmModal');
    this.confirmResetButton = document.getElementById('confirmResetButton');
    this.cancelResetButton = document.getElementById('cancelResetButton');
    this.selectedStageId = null;
    this.isMuted = false;
    this.stageLocks = new Map();
    this.stageButtonMap = new Map();
    this._gameOverOverlayVisible = false;
    this._gameOverOverlayHidden = false;
    this._gameOverPeekReturnHandler = null;
    this._gameOverPeekAttachTimer = null;
    for (const btn of this.stageButtons) {
      const stage = btn?.dataset?.stage;
      if (stage) this.stageButtonMap.set(stage, btn);
    }
    this._introVisible = false;
    this.hidePauseButton();
    this.hidePauseMenu();
    this.applyUIConfig();
  }

  applyUIConfig() {
    const uiConfig = UI ?? {};
    const commonButton = uiConfig.buttons ?? {};
    this._applyIntroUI(uiConfig.intro ?? {}, commonButton);
    this._applyStageSelectUI(uiConfig.stageSelect ?? {}, commonButton);
    this._applyGameOverUI(uiConfig.gameOver ?? {}, commonButton);
    this._applyPauseButtonUI(uiConfig.pauseButton ?? {});
    this._applySettingsButtonUI(uiConfig.stageSelect ?? {});
  }

  _valueToPx(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return `${value}px`;
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    return null;
  }

  _paddingToCss(padding) {
    if (!padding) return null;
    if (typeof padding === 'string' && padding.trim().length > 0) return padding.trim();
    const vertical = this._valueToPx(padding.verticalPx ?? padding.vertical);
    const horizontal = this._valueToPx(padding.horizontalPx ?? padding.horizontal);
    if (vertical && horizontal) return `${vertical} ${horizontal}`;
    if (vertical) return `${vertical} ${vertical}`;
    if (horizontal) return `${horizontal} ${horizontal}`;
    return null;
  }

  _setStyleValue(element, property, value) {
    if (!element) return;
    const cssValue = this._valueToPx(value);
    if (cssValue != null) {
      element.style[property] = cssValue;
    }
  }

  _applyButtonStyle(element, cfg = {}, common = {}) {
    if (!element) return;
    const fontSize = this._valueToPx(cfg.fontSizePx ?? cfg.fontSize ?? common.fontSizePx ?? common.fontSize);
    if (fontSize != null) element.style.fontSize = fontSize;
    const padding = this._paddingToCss(
      cfg.buttonPaddingPx ?? cfg.buttonPadding ?? common.buttonPaddingPx ?? common.buttonPadding,
    );
    if (padding != null) element.style.padding = padding;
    const radius = this._valueToPx(cfg.borderRadiusPx ?? cfg.borderRadius ?? common.borderRadiusPx ?? common.borderRadius);
    if (radius != null) element.style.borderRadius = radius;
  }

  _applyIntroUI(cfg, commonButton) {
    if (this.gameTitle) {
      this._setStyleValue(this.gameTitle, 'fontSize', cfg.titleFontSizePx ?? cfg.titleFontSize);
      this._setStyleValue(this.gameTitle, 'marginBottom', cfg.titleSpacingPx ?? cfg.titleSpacing);
    }
    this._applyButtonStyle(this.gameStartButton, {
      fontSizePx: cfg.buttonFontSizePx ?? cfg.buttonFontSize,
      buttonPaddingPx: cfg.buttonPaddingPx ?? cfg.buttonPadding,
      borderRadiusPx: cfg.buttonRadiusPx,
    }, commonButton);
    if (this.gameStartButton) {
      this._setStyleValue(this.gameStartButton, 'marginTop', cfg.buttonMarginTopPx ?? cfg.buttonMarginTop);
    }
  }

  _applyStageSelectUI(cfg, commonButton) {
    if (this.stageSelectContainer) {
      this._setStyleValue(this.stageSelectContainer, 'gap', cfg.buttonGapPx ?? cfg.buttonGap);
      this._setStyleValue(this.stageSelectContainer, 'marginBottom', cfg.containerGapPx ?? cfg.containerGap);
    }
    if (this.stageSelectLabel) {
      this._setStyleValue(this.stageSelectLabel, 'fontSize', cfg.labelFontSizePx ?? cfg.labelFontSize);
      this._setStyleValue(this.stageSelectLabel, 'marginBottom', cfg.labelSpacingPx ?? cfg.labelSpacing);
    }

    const stageButtonStyle = {
      fontSizePx: cfg.buttonFontSizePx ?? cfg.buttonFontSize,
      buttonPaddingPx: cfg.buttonPaddingPx ?? cfg.buttonPadding,
      borderRadiusPx: cfg.buttonRadiusPx,
    };
    this.stageButtons.forEach((btn) => {
      this._applyButtonStyle(btn, stageButtonStyle, commonButton);
    });

    this._applyButtonStyle(this.startButton, {
      fontSizePx: cfg.startButtonFontSizePx ?? cfg.startButtonFontSize ?? cfg.buttonFontSizePx ?? cfg.buttonFontSize,
      buttonPaddingPx: cfg.startButtonPaddingPx ?? cfg.startButtonPadding ?? cfg.buttonPaddingPx ?? cfg.buttonPadding,
      borderRadiusPx: cfg.buttonRadiusPx,
    }, commonButton);
    if (this.startButton) {
      this._setStyleValue(this.startButton, 'marginTop', cfg.startButtonMarginTopPx ?? cfg.startButtonMarginTop);
    }
  }

  _applySettingsButtonUI(cfg = {}) {
    const size = this._valueToPx(cfg.settingsButtonSizePx ?? cfg.settingsButtonSize);
    const iconSize = this._valueToPx(cfg.settingsIconSizePx ?? cfg.settingsIconSize);
    if (this.settingsButton && size) {
      this.settingsButton.style.setProperty('--settings-btn-size', size);
    }
    if (this.settingsButton && iconSize) {
      this.settingsButton.style.setProperty('--settings-icon-size', iconSize);
    }
  }

  _applyGameOverUI(cfg, commonButton) {
    if (this.gameOverScreen) {
      this._setStyleValue(this.gameOverScreen, 'gap', cfg.containerGapPx ?? cfg.containerGap);
    }
    if (this.gameOverTitle) {
      this._setStyleValue(this.gameOverTitle, 'fontSize', cfg.titleFontSizePx ?? cfg.titleFontSize);
      this._setStyleValue(this.gameOverTitle, 'marginBottom', cfg.titleSpacingPx ?? cfg.titleSpacing);
    }
    if (this.scoreDisplay) {
      this._setStyleValue(this.scoreDisplay, 'fontSize', cfg.scoreFontSizePx ?? cfg.scoreFontSize);
      this._setStyleValue(this.scoreDisplay, 'marginBottom', cfg.scoreSpacingPx ?? cfg.scoreSpacing);
      const lineHeight = this._valueToPx(cfg.scoreLineHeightPx ?? cfg.scoreLineHeight);
      if (lineHeight != null) this.scoreDisplay.style.lineHeight = lineHeight;
    }
    if (this.gameOverActions) {
      this._setStyleValue(this.gameOverActions, 'gap', cfg.buttonGapPx ?? cfg.buttonGap);
    }
    this._applyButtonStyle(this.restartButton, {
      fontSizePx: cfg.buttonFontSizePx ?? cfg.buttonFontSize,
      buttonPaddingPx: cfg.buttonPaddingPx ?? cfg.buttonPadding,
      borderRadiusPx: cfg.buttonRadiusPx,
    }, commonButton);
    this._applyButtonStyle(this.stageSelectButton, {
      fontSizePx: cfg.buttonFontSizePx ?? cfg.buttonFontSize,
      buttonPaddingPx: cfg.buttonPaddingPx ?? cfg.buttonPadding,
      borderRadiusPx: cfg.buttonRadiusPx,
    }, commonButton);
  }

  _clamp01(value) {
    if (!Number.isFinite(value)) return null;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  _applyPauseButtonUI(cfg = {}) {
    if (!this.pauseButton) return;
    this._setPauseCustomProperty('--pause-btn-background', cfg.backgroundColor);
    this._setPauseCustomProperty('--pause-btn-border', cfg.borderColor);
    this._setPauseCustomProperty('--pause-btn-color', cfg.iconColor);
    this._setPauseOpacity('--pause-btn-opacity', cfg.opacity);
    this._setPauseOpacity('--pause-btn-hover-opacity', cfg.hoverOpacity);
  }

  _setPauseCustomProperty(propertyName, value) {
    if (!this.pauseButton) return;
    if (value == null || value === '') {
      this.pauseButton.style.removeProperty(propertyName);
      return;
    }
    this.pauseButton.style.setProperty(propertyName, value);
  }

  _setPauseOpacity(propertyName, value) {
    if (!this.pauseButton) return;
    const clamped = this._clamp01(value);
    if (clamped == null) {
      this.pauseButton.style.removeProperty(propertyName);
      return;
    }
    this.pauseButton.style.setProperty(propertyName, clamped.toString());
  }

  bind({
    onIntroStart,
    onIntroStartComplete,
    onStart,
    onRestart,
    onStageSelect,
    onStageSelectScreen,
    onOpenSettings,
    onCloseSettings,
    onToggleMute,
    onConfirmReset,
    onPause,
    onResume,
    onPauseStageSelect,
  } = {}) {
    if (this.gameStartButton) {
      this.gameStartButton.addEventListener('click', () => {
        if (onIntroStart) onIntroStart();
        this.showStageSelection();
        if (onIntroStartComplete) onIntroStartComplete();
      });
    }
    if (this.startButton && onStart) {
      this.startButton.addEventListener('click', onStart);
    }
    if (this.restartButton && onRestart) {
      this.restartButton.addEventListener('click', onRestart);
    }
    if (this.stageSelectButton && onStageSelectScreen) {
      this.stageSelectButton.addEventListener('click', onStageSelectScreen);
    }
    if (this.stageButtons.length > 0 && onStageSelect) {
      this.stageButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const stage = btn.dataset.stage;
          if (stage) {
            if (this.isStageLocked(stage)) return;
            this.setStageSelection(stage);
            onStageSelect(stage);
          }
        });
      });
    }
    if (this.pauseButton && onPause) {
      this.pauseButton.addEventListener('click', onPause);
    }
    if (this.pauseResumeButton && onResume) {
      this.pauseResumeButton.addEventListener('click', onResume);
    }
    if (this.pauseStageSelectButton && onPauseStageSelect) {
      this.pauseStageSelectButton.addEventListener('click', onPauseStageSelect);
    }
    if (this.settingsButton) {
      this.settingsButton.addEventListener('click', () => {
        if (onOpenSettings) onOpenSettings();
        this.hideResetConfirmModal();
        this.showSettingsModal();
      });
    }
    if (this.closeSettingsButton) {
      this.closeSettingsButton.addEventListener('click', () => {
        this.hideSettingsModal();
        if (onCloseSettings) onCloseSettings();
      });
    }
    if (this.muteToggleButton && onToggleMute) {
      this.muteToggleButton.addEventListener('click', onToggleMute);
    }
    if (this.settingsResetButton) {
      this.settingsResetButton.addEventListener('click', () => {
        this.showResetConfirmModal();
      });
    }
    if (this.cancelResetButton) {
      this.cancelResetButton.addEventListener('click', () => {
        this.hideResetConfirmModal();
      });
    }
    if (this.confirmResetButton && onConfirmReset) {
      this.confirmResetButton.addEventListener('click', () => {
        this.hideResetConfirmModal();
        this.hideSettingsModal();
        onConfirmReset();
      });
    }
    if (this.gameOverScreen) {
      this.gameOverScreen.addEventListener('click', (event) => {
        if (!this._gameOverOverlayVisible) return;
        const isButton = event.target?.closest?.('button');
        if (isButton) return;
        this._temporarilyHideGameOverOverlay();
      });
    }
  }

  hideOverlays() {
    this._introVisible = false;
    if (this.introScreen) this.introScreen.style.display = 'none';
    if (this.startScreen) this.startScreen.style.display = 'none';
    if (this.gameOverScreen) this.gameOverScreen.style.display = 'none';
    this._gameOverOverlayVisible = false;
    this._gameOverOverlayHidden = false;
    this._detachGameOverPeekRestore();
    this.hidePauseMenu();
    this.hideSettingsModal();
    this.hideResetConfirmModal();
  }

  showIntro() {
    this._introVisible = true;
    if (this.startScreen) this.startScreen.style.display = 'none';
    if (this.gameOverScreen) this.gameOverScreen.style.display = 'none';
    if (this.introScreen) this.introScreen.style.display = 'flex';
    this.hidePauseButton();
    this.hidePauseMenu();
    if (this.stageSelectLabel) {
      this.setStageSelection(this.selectedStageId || 'stage1');
    }
  }

  showStageSelection() {
    this._introVisible = false;
    if (this.introScreen) this.introScreen.style.display = 'none';
    if (this.gameOverScreen) this.gameOverScreen.style.display = 'none';
    if (this.startScreen) this.startScreen.style.display = 'flex';
    this.hidePauseButton();
    this.hidePauseMenu();
    this.hideSettingsModal();
    this.hideResetConfirmModal();
  }

  isIntroVisible() {
    return !!this._introVisible;
  }

  triggerIntroStart() {
    if (this.gameStartButton) {
      this.gameStartButton.click();
    } else {
      this.showStageSelection();
    }
  }

  showStart() {
    this.showStageSelection();
  }

  setStageSelection(stageId) {
    if (this.isStageLocked(stageId)) return;
    if (!stageId) return;
    const btn = this.stageButtonMap.get(stageId);
    if (!btn) return;
    this.selectedStageId = stageId;
    if (this.stageButtons.length > 0) {
      this.stageButtons.forEach((btn) => {
        const btnStage = btn.dataset.stage;
        if (btnStage) {
          if (btnStage === stageId) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        }
      });
    }
  }

  showGameOver(finalScoreSeconds, highScore = null, isNew = false) {
    if (this.gameOverScreen) this.gameOverScreen.style.display = 'flex';
    this._gameOverOverlayVisible = true;
    this._gameOverOverlayHidden = false;
    this._detachGameOverPeekRestore();
    this.hidePauseButton();
    this.hidePauseMenu();
    if (this.scoreDisplay) {
      const lines = [];
      if (isNew) lines.push('최고 점수!!');
      lines.push(`${SCORE.label}: ${finalScoreSeconds}`);
      if (highScore != null) lines.push(`최고 점수: ${highScore}`);
      this.scoreDisplay.innerHTML = lines.map(x => `<div>${x}</div>`).join('');
    }
  }

  setStageLock(stageId, locked) {
    const btn = this.stageButtonMap.get(stageId);
    if (!btn) return;
    this.stageLocks.set(stageId, !!locked);
    btn.style.display = locked ? 'none' : '';
    if (locked && btn.classList.contains('active')) {
      btn.classList.remove('active');
      this.selectedStageId = null;
    }
  }

  isStageLocked(stageId) {
    return !!this.stageLocks.get(stageId);
  }

  drawScore(ctx, seconds, centerX, centerY, orbitRadius, options = {}) {
    const value = Math.floor(seconds).toString();
    const highlightStyle = this._buildScoreHighlightStyle(options.highlight);
    if (SCORE.useCenter && typeof centerX === 'number' && typeof centerY === 'number' && typeof orbitRadius === 'number') {
      const baseSize = Math.max(SCORE.minFontPx ?? 16, Math.floor(orbitRadius * (SCORE.centerScale ?? 0.33)));
      const highlightScale = highlightStyle.active
        ? 1 + ((highlightStyle.scaleBoost ?? 0) * highlightStyle.intensity)
        : 1;
      const sizePx = Math.max(1, Math.round(baseSize * highlightScale));
      ctx.save();
      if (highlightStyle.active) {
        ctx.fillStyle = highlightStyle.color;
        ctx.globalAlpha = highlightStyle.alpha ?? 1;
        ctx.shadowColor = highlightStyle.glowColor;
        ctx.shadowBlur = highlightStyle.shadowBlur ?? 0;
      } else {
        ctx.fillStyle = `rgba(255,255,255,${SCORE.centerAlpha ?? 0.35})`;
      }
      ctx.font = `${sizePx}px ${SCORE.fontFamily || 'Arial'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(value, centerX, centerY);
      ctx.restore();
    } else {
      ctx.save();
      if (highlightStyle.active) {
        ctx.fillStyle = highlightStyle.color;
        ctx.globalAlpha = highlightStyle.alpha ?? 1;
        ctx.shadowColor = highlightStyle.glowColor;
        ctx.shadowBlur = highlightStyle.shadowBlur ?? 0;
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.font = SCORE.font;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(`${SCORE.label}: ${value}`, SCORE.position.x, SCORE.position.y);
      ctx.restore();
    }
  }

  _buildScoreHighlightStyle(state = {}) {
    const cfg = SCORE.highlight ?? {};
    const enabled = cfg.enabled !== false && state && state.active;
    if (!enabled) {
      return { active: false, intensity: 0 };
    }
    const intensity = this._clamp01(typeof state.intensity === 'number' ? state.intensity : 0) ?? 0;
    const minAlpha = this._clamp01(cfg.minAlpha);
    const maxAlpha = this._clamp01(cfg.maxAlpha);
    const baseMin = (minAlpha != null ? minAlpha : this._clamp01(SCORE.centerAlpha ?? 0.35)) ?? 0.35;
    const baseMax = (maxAlpha != null ? maxAlpha : 1);
    const alpha = this._lerp(baseMin, baseMax, intensity);
    return {
      active: true,
      intensity,
      alpha,
      color: cfg.color ?? '#ffd85e',
      glowColor: cfg.glowColor ?? cfg.color ?? '#ffd85e',
      shadowBlur: Math.max(0, cfg.shadowBlurPx ?? 18),
      scaleBoost: Math.max(0, cfg.scaleBoost ?? 0),
    };
  }

  _lerp(a = 0, b = 1, t = 0) {
    if (!Number.isFinite(a)) a = 0;
    if (!Number.isFinite(b)) b = 1;
    const clampedT = this._clamp01(t);
    const normalizedT = clampedT != null ? clampedT : 0;
    return a + (b - a) * normalizedT;
  }

  showPauseButton() {
    if (this.pauseButton) this.pauseButton.style.display = 'inline-flex';
  }

  hidePauseButton() {
    if (this.pauseButton) this.pauseButton.style.display = 'none';
  }

  showPauseMenu() {
    if (this.pauseMenu) this.pauseMenu.style.display = 'flex';
  }

  hidePauseMenu() {
    if (this.pauseMenu) this.pauseMenu.style.display = 'none';
  }

  showSettingsModal() {
    if (this.settingsModal) this.settingsModal.style.display = 'flex';
  }

  hideSettingsModal() {
    if (this.settingsModal) this.settingsModal.style.display = 'none';
  }

  showResetConfirmModal() {
    if (this.resetConfirmModal) this.resetConfirmModal.style.display = 'flex';
  }

  hideResetConfirmModal() {
    if (this.resetConfirmModal) this.resetConfirmModal.style.display = 'none';
  }

  setMuteState(isMuted) {
    this.isMuted = !!isMuted;
    if (!this.muteToggleButton) return;
    this.muteToggleButton.textContent = this.isMuted ? 'Unmute Audio' : 'Mute Audio';
  }

  _temporarilyHideGameOverOverlay() {
    if (!this.gameOverScreen) return;
    if (!this._gameOverOverlayVisible || this._gameOverOverlayHidden) return;
    this._gameOverOverlayHidden = true;
    this.gameOverScreen.style.display = 'none';
    this._scheduleGameOverPeekRestore();
  }

  _restoreGameOverOverlay() {
    if (!this.gameOverScreen) return;
    if (!this._gameOverOverlayVisible || !this._gameOverOverlayHidden) return;
    this._gameOverOverlayHidden = false;
    this.gameOverScreen.style.display = 'flex';
    this._detachGameOverPeekRestore();
  }

  _scheduleGameOverPeekRestore() {
    this._detachGameOverPeekRestore();
    const root = typeof window !== 'undefined' ? window : null;
    if (!root) return;
    this._gameOverPeekReturnHandler = () => {
      this._restoreGameOverOverlay();
    };
    this._gameOverPeekAttachTimer = root.setTimeout(() => {
      root.addEventListener('pointerdown', this._gameOverPeekReturnHandler, { once: true });
    }, 0);
  }

  _detachGameOverPeekRestore() {
    const root = typeof window !== 'undefined' ? window : null;
    if (this._gameOverPeekAttachTimer != null) {
      clearTimeout(this._gameOverPeekAttachTimer);
      this._gameOverPeekAttachTimer = null;
    }
    if (root && this._gameOverPeekReturnHandler) {
      root.removeEventListener('pointerdown', this._gameOverPeekReturnHandler);
    }
    this._gameOverPeekReturnHandler = null;
  }
}
