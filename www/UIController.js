import { SCORE, UI, EXTRA_STAGE } from './Config.js';
import { SLOT_CONFIG } from './SlotConfig.js';

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
    this.gameOverPeekButton = document.getElementById('gameOverPeekButton');
    this.gameOverPeekLabel = this.gameOverPeekButton?.querySelector('.sr-only') ?? null;
    this.stageButtons = Array.from(document.querySelectorAll('.stage-button'));
    this.stageSelectButton = document.getElementById('stageSelectButton');
    this.stageSelectContainer = document.getElementById('stageSelect');
    this.stageSelectLabel = document.getElementById('stageSelectLabel');
    this.pauseButton = document.getElementById('pauseButton');
    this.pauseMenu = document.getElementById('pauseMenu');
    this.pauseResumeButton = document.getElementById('pauseResumeButton');
    this.pauseStageSelectButton = document.getElementById('pauseStageSelectButton');
    this.settingsButton = document.getElementById('settingsButton');
    this.leaderboardButton = document.getElementById('leaderboardButton');
    this.customizeButton = document.getElementById('customizeButton');
    this.customizePlayerButton = document.getElementById('customizePlayerButton');
    this.customizeObstacleButton = document.getElementById('customizeObstacleButton');
    this.customizeRingButton = document.getElementById('customizeRingButton');
    this.settingsModal = document.getElementById('settingsModal');
    this.settingsResetButton = document.getElementById('settingsResetButton');
    this.closeSettingsButton = document.getElementById('closeSettingsButton');
    this.muteToggleButton = document.getElementById('muteToggleButton');
    this.resetConfirmModal = document.getElementById('resetConfirmModal');
    this.confirmResetButton = document.getElementById('confirmResetButton');
    this.cancelResetButton = document.getElementById('cancelResetButton');
    this.unlockRequirementModal = document.getElementById('unlockRequirementModal');
    this.unlockRequirementMessage = document.getElementById('unlockRequirementMessage');
    this.customizeModal = document.getElementById('customizeModal');
    this.closeCustomizeButton = document.getElementById('closeCustomizeButton');
    this.playerCustomizeModal = document.getElementById('playerCustomizeModal');
    this.obstacleCustomizeModal = document.getElementById('obstacleCustomizeModal');
    this.ringCustomizeModal = document.getElementById('ringCustomizeModal');
    this.closePlayerCustomizeButton = document.getElementById('closePlayerCustomizeButton');
    this.closeObstacleCustomizeButton = document.getElementById('closeObstacleCustomizeButton');
    this.closeRingCustomizeButton = document.getElementById('closeRingCustomizeButton');
    this.playerPreviewImage = document.getElementById('playerPreviewImage');
    this.playerPreviewDefault = this.playerCustomizeModal?.querySelector('.preview-circle') ?? null;
    this.obstaclePreviewSpike = document.getElementById('obstaclePreviewSpike');
    this.obstaclePreviewImage = document.getElementById('obstaclePreviewImage');
    this.ringPreviewRing = document.getElementById('ringPreviewRing');
    this.ringPreviewImage = document.getElementById('ringPreviewImage');
    this.playerSkinEditorModal = document.getElementById('playerSkinEditorModal');
    this.closePlayerSkinEditorButton = document.getElementById('closePlayerSkinEditorButton');
    this.playerSkinCanvas = document.getElementById('playerSkinCanvas');
    this.playerSkinGuide = document.getElementById('playerSkinGuide');
    this.playerSkinPalette = document.getElementById('playerSkinPalette');
    this.playerSkinModeFreeButton = document.getElementById('playerSkinModeFree');
    this.playerSkinModeCursorButton = document.getElementById('playerSkinModeCursor');
    this.playerSkinToolDrawButton = document.getElementById('playerSkinToolDraw');
    this.playerSkinToolEraseButton = document.getElementById('playerSkinToolErase');
    this.playerSkinClearButton = document.getElementById('playerSkinClear');
    this.playerSkinApplyButton = document.getElementById('playerSkinApply');
    this.playerSkinMoveUpButton = document.getElementById('playerSkinMoveUp');
    this.playerSkinMoveDownButton = document.getElementById('playerSkinMoveDown');
    this.playerSkinMoveLeftButton = document.getElementById('playerSkinMoveLeft');
    this.playerSkinMoveRightButton = document.getElementById('playerSkinMoveRight');
    this.playerPages = Array.from(this.playerCustomizeModal?.querySelectorAll('.customize-page') ?? []);
    this.playerPagePrevButton = document.getElementById('playerPagePrev');
    this.playerPageNextButton = document.getElementById('playerPageNext');
    this.playerPageIndicator = document.getElementById('playerPageIndicator');
    this.obstaclePages = Array.from(this.obstacleCustomizeModal?.querySelectorAll('.customize-page') ?? []);
    this.obstaclePagePrevButton = document.getElementById('obstaclePagePrev');
    this.obstaclePageNextButton = document.getElementById('obstaclePageNext');
    this.obstaclePageIndicator = document.getElementById('obstaclePageIndicator');
    this.ringPages = Array.from(this.ringCustomizeModal?.querySelectorAll('.customize-page') ?? []);
    this.ringPagePrevButton = document.getElementById('ringPagePrev');
    this.ringPageNextButton = document.getElementById('ringPageNext');
    this.ringPageIndicator = document.getElementById('ringPageIndicator');
    this._onPlayerSkinSelect = null;
    this._onObstacleSkinSelect = null;
    this._onRingSkinSelect = null;
    this._currentPlayerSkin = null;
    this._customPlayerSkin = null;
    this._playerSkinEditor = null;
    this._playerSkinEditorResizeHandler = null;
    this._unlockRequirementKeyHandler = null;
    this._unlockRequirementPointerHandler = null;
    this._playerPageIndex = 0;
    this._obstaclePageIndex = 0;
    this._ringPageIndex = 0;
    this.selectedStageId = null;
    this.stageExState = new Map();
    this.stageLabelDefaults = new Map();
    this.isMuted = false;
    this.stageLocks = new Map();
    this.stageButtonMap = new Map();
    this._gameOverOverlayVisible = false;
    this._gameOverOverlayHidden = false;
    this._gameOverPeekActive = false;
    for (const btn of this.stageButtons) {
      const stage = btn?.dataset?.stage;
      if (stage) {
        this.stageButtonMap.set(stage, btn);
        this.stageExState.set(stage, false);
        this.stageLabelDefaults.set(stage, btn.textContent?.trim() || stage);
      }
    }
    this._introVisible = false;
    this.hidePauseButton();
    this.hidePauseMenu();
    this._setGameOverPeekButtonVisible(false);
    this._updateGameOverPeekButtonState(false);
    this.applyUIConfig();
    this._initPlayerCustomizeSlots();
    this._initObstacleCustomizeSlots();
    this._initRingCustomizeSlots();
    this._initPlayerSkinEditor();
    this._initCustomizePagination({
      pages: this.playerPages,
      prevButton: this.playerPagePrevButton,
      nextButton: this.playerPageNextButton,
      indicator: this.playerPageIndicator,
      indexKey: '_playerPageIndex',
    });
    this._initCustomizePagination({
      pages: this.obstaclePages,
      prevButton: this.obstaclePagePrevButton,
      nextButton: this.obstaclePageNextButton,
      indicator: this.obstaclePageIndicator,
      indexKey: '_obstaclePageIndex',
    });
    this._initCustomizePagination({
      pages: this.ringPages,
      prevButton: this.ringPagePrevButton,
      nextButton: this.ringPageNextButton,
      indicator: this.ringPageIndicator,
      indexKey: '_ringPageIndex',
    });
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
    if (this.customizeButton && size) {
      this.customizeButton.style.setProperty('--settings-btn-size', size);
    }
    if (this.customizeButton && iconSize) {
      this.customizeButton.style.setProperty('--settings-icon-size', iconSize);
    }
    if (this.leaderboardButton && size) {
      this.leaderboardButton.style.setProperty('--settings-btn-size', size);
    }
    if (this.leaderboardButton && iconSize) {
      this.leaderboardButton.style.setProperty('--settings-icon-size', iconSize);
    }
  }

  _initPlayerCustomizeSlots() {
    if (!this.playerCustomizeModal) return;
    const canFetch = typeof fetch === 'function';
    const defaultSlot = this.playerCustomizeModal.querySelector('[data-player-default="true"]');
    if (defaultSlot) {
      defaultSlot.addEventListener('click', () => {
        if (this._handleLockedSlotClick(defaultSlot)) return;
        const overrides = this._getPlayerRadiusOverrides(defaultSlot);
        this._setPlayerPreview(null);
        this._emitPlayerSkinSelect({ type: 'default', ...overrides });
      });
    }
    const colorSlots = Array.from(this.playerCustomizeModal.querySelectorAll('[data-player-color]'));
    colorSlots.forEach((slot) => {
      const color = slot.dataset?.playerColor;
      if (!color) return;
      slot.addEventListener('click', () => {
        if (this._handleLockedSlotClick(slot)) return;
        const overrides = this._getPlayerRadiusOverrides(slot);
        this._setPlayerPreviewColor(color);
        this._emitPlayerSkinSelect({ type: 'color', color, ...overrides });
      });
    });
    const slots = canFetch
      ? Array.from(this.playerCustomizeModal.querySelectorAll('[data-pixil-src]'))
      : [];
    slots.forEach((slot) => {
      const src = slot.dataset?.pixilSrc;
      if (!src) return;
      const img = this._ensureSlotImage(slot);
      this._loadPixilPreview(src).then((preview) => {
        if (!preview) return;
        slot.dataset.pixilPreview = preview;
        if (img) img.src = preview;
      });
      slot.addEventListener('click', () => {
        if (this._handleLockedSlotClick(slot)) return;
        const preview = slot.dataset?.pixilPreview;
        if (preview) {
          const overrides = this._getPlayerRadiusOverrides(slot);
          this._setPlayerPreview(preview);
          this._emitPlayerSkinSelect({ type: 'image', src: preview, ...overrides });
        }
      });
    });
    const imageSlots = Array.from(this.playerCustomizeModal.querySelectorAll('[data-player-image-src]'));
    imageSlots.forEach((slot) => {
      const src = slot.dataset?.playerImageSrc;
      if (!src) return;
      const img = this._ensureSlotImage(slot);
      if (img) img.src = src;
      slot.addEventListener('click', () => {
        if (this._handleLockedSlotClick(slot)) return;
        const overrides = this._getPlayerRadiusOverrides(slot);
        this._setPlayerPreview(src);
        this._emitPlayerSkinSelect({ type: 'image', src, ...overrides });
      });
    });
    const customSlot = this.playerCustomizeModal.querySelector('[data-player-custom="true"]');
    if (customSlot) {
      customSlot.addEventListener('click', () => {
        if (this._handleLockedSlotClick(customSlot)) return;
        this.showPlayerSkinEditorModal();
      });
    }
  }

  _initObstacleCustomizeSlots() {
    if (!this.obstacleCustomizeModal) return;
    const defaultSlot = this.obstacleCustomizeModal.querySelector('[data-obstacle-default="true"]');
    if (defaultSlot) {
      defaultSlot.addEventListener('click', () => {
        if (this._handleLockedSlotClick(defaultSlot)) return;
        const overrides = this._getObstacleScaleOverrides(defaultSlot);
        this._setObstaclePreviewColor(null);
        this._emitObstacleSkinSelect({ type: 'default', ...overrides });
      });
    }
    const colorSlots = Array.from(this.obstacleCustomizeModal.querySelectorAll('[data-obstacle-color]'));
    colorSlots.forEach((slot) => {
      const color = slot.dataset?.obstacleColor;
      if (!color) return;
      slot.addEventListener('click', () => {
        if (this._handleLockedSlotClick(slot)) return;
        const overrides = this._getObstacleScaleOverrides(slot);
        this._setObstaclePreviewColor(color);
        this._emitObstacleSkinSelect({ type: 'color', color, ...overrides });
      });
    });
    const imageSlots = Array.from(this.obstacleCustomizeModal.querySelectorAll('[data-obstacle-image-src]'));
    imageSlots.forEach((slot) => {
      const src = slot.dataset?.obstacleImageSrc;
      if (!src) return;
      const img = this._ensureSlotImage(slot);
      if (img) img.src = src;
      slot.addEventListener('click', () => {
        if (this._handleLockedSlotClick(slot)) return;
        const overrides = this._getObstacleScaleOverrides(slot);
        this._setObstaclePreviewImage(src);
        this._emitObstacleSkinSelect({ type: 'image', src, ...overrides });
      });
    });
  }

  _initRingCustomizeSlots() {
    if (!this.ringCustomizeModal) return;
    const defaultSlot = this.ringCustomizeModal.querySelector('[data-ring-default="true"]');
    if (defaultSlot) {
      defaultSlot.addEventListener('click', () => {
        if (this._handleLockedSlotClick(defaultSlot)) return;
        const overrides = this._getRingScaleOverrides(defaultSlot);
        this._setRingPreviewColor(null, overrides.glow, overrides.glowBlur);
        this._emitRingSkinSelect({ type: 'default', ...overrides });
      });
    }
    const colorSlots = Array.from(this.ringCustomizeModal.querySelectorAll('[data-ring-color]'));
    colorSlots.forEach((slot) => {
      const color = slot.dataset?.ringColor;
      if (!color) return;
      slot.addEventListener('click', () => {
        if (this._handleLockedSlotClick(slot)) return;
        const overrides = this._getRingScaleOverrides(slot);
        this._setRingPreviewColor(color, overrides.glow, overrides.glowBlur);
        this._emitRingSkinSelect({ type: 'color', color, ...overrides });
      });
    });
    const imageSlots = Array.from(this.ringCustomizeModal.querySelectorAll('[data-ring-image-src]'));
    imageSlots.forEach((slot) => {
      const src = slot.dataset?.ringImageSrc;
      if (!src) return;
      const img = this._ensureSlotImage(slot);
      if (img) img.src = src;
      slot.addEventListener('click', () => {
        if (this._handleLockedSlotClick(slot)) return;
        const overrides = this._getRingScaleOverrides(slot);
        this._setRingPreviewImage(src, overrides.glow, overrides.glowBlur);
        this._emitRingSkinSelect({ type: 'image', src, ...overrides });
      });
    });
  }

  _getSlotKey(type, slot) {
    if (!slot) return null;
    const data = slot.dataset ?? {};
    if (type === 'player') {
      if (data.playerDefault === 'true') return 'player:default';
      if (data.playerColor) return `player:color:${data.playerColor}`;
      if (data.playerImageSrc) return `player:image:${data.playerImageSrc}`;
      if (data.pixilSrc) return `player:pixil:${data.pixilSrc}`;
      if (data.playerCustom === 'true') return 'player:custom';
      return null;
    }
    if (type === 'obstacle') {
      if (data.obstacleDefault === 'true') return 'obstacle:default';
      if (data.obstacleColor) return `obstacle:color:${data.obstacleColor}`;
      if (data.obstacleImageSrc) return `obstacle:image:${data.obstacleImageSrc}`;
      return null;
    }
    if (type === 'ring') {
      if (data.ringDefault === 'true') return 'ring:default';
      if (data.ringColor) {
        const key = `ring:color:${data.ringColor}`;
        return data.ringGlow === 'true' ? `${key}:glow` : key;
      }
      if (data.ringImageSrc) {
        const key = `ring:image:${data.ringImageSrc}`;
        return data.ringGlow === 'true' ? `${key}:glow` : key;
      }
      return null;
    }
    return null;
  }

  _isSlotRequirementMet(requirement, stageScores) {
    if (!requirement || requirement.unlocked === true) return true;
    const stageId = requirement.stageId;
    if (!stageId) return false;
    const minScore = Number.isFinite(requirement.minScore) ? requirement.minScore : 0;
    const score = Number.isFinite(stageScores?.[stageId]) ? stageScores[stageId] : 0;
    return score >= minScore;
  }

  _setSlotUnlockRequirement(slot, requirement) {
    if (!slot) return;
    if (!requirement || requirement.unlocked === true) {
      delete slot.dataset.unlockStage;
      delete slot.dataset.unlockScore;
      return;
    }
    if (requirement.stageId) {
      slot.dataset.unlockStage = requirement.stageId;
    } else {
      delete slot.dataset.unlockStage;
    }
    if (Number.isFinite(requirement.minScore)) {
      slot.dataset.unlockScore = String(requirement.minScore);
    } else {
      delete slot.dataset.unlockScore;
    }
  }

  _setSlotLocked(slot, locked) {
    if (!slot) return;
    const isLocked = !!locked;
    slot.classList.toggle('is-locked', isLocked);
    if (slot.disabled) slot.disabled = false;
    if (isLocked) {
      slot.dataset.locked = 'true';
    } else {
      delete slot.dataset.locked;
    }
    if (isLocked) {
      slot.setAttribute('aria-disabled', 'true');
    } else {
      slot.removeAttribute('aria-disabled');
    }
  }

  _isSlotLocked(slot) {
    if (!slot) return false;
    return slot.dataset?.locked === 'true' || slot.classList.contains('is-locked');
  }

  _formatStageLabel(stageId) {
    if (!stageId) return '';
    const match = /^stage(\d+)(?:_ex)?$/i.exec(stageId);
    if (match) {
      const suffix = stageId.toLowerCase().endsWith('_ex') ? 'EX' : '';
      return `stage${match[1]}${suffix}`;
    }
    return stageId.replace(/_/g, '');
  }

  _buildUnlockRequirementMessage(slot) {
    const stageId = slot?.dataset?.unlockStage ?? '';
    const rawScore = slot?.dataset?.unlockScore ?? '';
    const minScore = rawScore ? Number.parseInt(rawScore, 10) : NaN;
    if (!stageId) return 'Unlock requirement: ???';
    if (Number.isFinite(minScore) && minScore > 60) return 'Unlock requirement: ???';
    const stageLabel = this._formatStageLabel(stageId);
    const scoreLabel = Number.isFinite(minScore) ? ` ${minScore} points` : '';
    return `Unlock requirement: ${stageLabel}${scoreLabel}`;
  }

  _handleLockedSlotClick(slot) {
    if (!this._isSlotLocked(slot)) return false;
    this.showUnlockRequirement(this._buildUnlockRequirementMessage(slot));
    return true;
  }

  applySlotLocks(stageScores = {}) {
    const config = SLOT_CONFIG ?? {};
    const defaultRequirement = config.defaultRequirement ?? null;
    const overrides = config.overrides ?? {};
    const groups = [
      { type: 'player', container: this.playerCustomizeModal },
      { type: 'obstacle', container: this.obstacleCustomizeModal },
      { type: 'ring', container: this.ringCustomizeModal },
    ];
    groups.forEach(({ type, container }) => {
      if (!container) return;
      const slots = Array.from(container.querySelectorAll('.customize-slot'));
      slots.forEach((slot) => {
        const key = this._getSlotKey(type, slot);
        if (!key) return;
        const requirement = Object.prototype.hasOwnProperty.call(overrides, key)
          ? overrides[key]
          : defaultRequirement;
        this._setSlotUnlockRequirement(slot, requirement);
        const unlocked = this._isSlotRequirementMet(requirement, stageScores);
        this._setSlotLocked(slot, !unlocked);
      });
    });
  }

  _initPlayerSkinEditor() {
    if (!this.playerSkinCanvas) return;
    const ctx = this.playerSkinCanvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const size = this.playerSkinCanvas.width || 52;
    this._playerSkinEditor = {
      canvas: this.playerSkinCanvas,
      guideCanvas: this.playerSkinGuide,
      ctx,
      guideCtx: this.playerSkinGuide?.getContext('2d') ?? null,
      size,
      hitRadius: 13,
      tool: 'draw',
      mode: 'free',
      cursor: { x: Math.floor(size / 2), y: Math.floor(size / 2) },
      color: '#ffffff',
      isDrawing: false,
      isDraggingCursor: false,
    };
    this.playerSkinCanvas.addEventListener('pointerdown', (event) => this._handlePlayerSkinPointerDown(event));
    this.playerSkinCanvas.addEventListener('pointermove', (event) => this._handlePlayerSkinPointerMove(event));
    this.playerSkinCanvas.addEventListener('pointerup', (event) => this._handlePlayerSkinPointerUp(event));
    this.playerSkinCanvas.addEventListener('pointerleave', (event) => this._handlePlayerSkinPointerUp(event));
    this.playerSkinCanvas.addEventListener('pointercancel', (event) => this._handlePlayerSkinPointerUp(event));
    this._buildPlayerSkinPalette();
    if (this.playerSkinToolDrawButton) {
      this.playerSkinToolDrawButton.addEventListener('click', () => {
        const apply = this._playerSkinEditor?.mode === 'cursor';
        this._setPlayerSkinTool('draw', { apply });
      });
    }
    if (this.playerSkinToolEraseButton) {
      this.playerSkinToolEraseButton.addEventListener('click', () => {
        const apply = this._playerSkinEditor?.mode === 'cursor';
        this._setPlayerSkinTool('erase', { apply });
      });
    }
    if (this.playerSkinClearButton) {
      this.playerSkinClearButton.addEventListener('click', () => {
        this._clearPlayerSkinCanvas();
      });
    }
    if (this.playerSkinApplyButton) {
      this.playerSkinApplyButton.addEventListener('click', () => {
        this._applyPlayerSkinFromEditor();
      });
    }
    if (this.playerSkinModeFreeButton) {
      this.playerSkinModeFreeButton.addEventListener('click', () => {
        this._setPlayerSkinMode('free');
      });
    }
    if (this.playerSkinModeCursorButton) {
      this.playerSkinModeCursorButton.addEventListener('click', () => {
        this._setPlayerSkinMode('cursor');
      });
    }
    if (this.playerSkinMoveUpButton) {
      this.playerSkinMoveUpButton.addEventListener('click', () => {
        this._movePlayerSkinCursor(0, -1);
      });
    }
    if (this.playerSkinMoveDownButton) {
      this.playerSkinMoveDownButton.addEventListener('click', () => {
        this._movePlayerSkinCursor(0, 1);
      });
    }
    if (this.playerSkinMoveLeftButton) {
      this.playerSkinMoveLeftButton.addEventListener('click', () => {
        this._movePlayerSkinCursor(-1, 0);
      });
    }
    if (this.playerSkinMoveRightButton) {
      this.playerSkinMoveRightButton.addEventListener('click', () => {
        this._movePlayerSkinCursor(1, 0);
      });
    }
    if (this.closePlayerSkinEditorButton) {
      this.closePlayerSkinEditorButton.addEventListener('click', () => {
        this.hidePlayerSkinEditorModal();
      });
    }
    if (typeof window !== 'undefined') {
      this._playerSkinEditorResizeHandler = () => {
        if (this.playerSkinEditorModal?.style.display === 'flex') {
          this._refreshPlayerSkinGuide();
        }
      };
      window.addEventListener('resize', this._playerSkinEditorResizeHandler);
    }
  }

  _preparePlayerSkinEditor() {
    const editor = this._playerSkinEditor;
    if (!editor || !editor.ctx) return;
    editor.isDrawing = false;
    editor.isDraggingCursor = false;
    this._clearPlayerSkinCanvas();
    const src = this._getCustomPlayerSkinSrc();
    if (src) {
      const image = new Image();
      image.onload = () => {
        editor.ctx.clearRect(0, 0, editor.canvas.width, editor.canvas.height);
        editor.ctx.drawImage(image, 0, 0, editor.canvas.width, editor.canvas.height);
      };
      image.src = src;
    }
    this._refreshPlayerSkinGuide();
    this._syncPlayerSkinPaletteSelection(editor.color);
    this._setPlayerSkinMode(editor.mode);
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this._refreshPlayerSkinGuide());
    }
  }

  _getCustomPlayerSkinSrc() {
    const custom = this._customPlayerSkin;
    if (custom && typeof custom.src === 'string' && custom.src.length > 0) {
      return custom.src;
    }
    const skin = this._currentPlayerSkin;
    if (!skin || skin.type !== 'image') return null;
    if (typeof skin.src !== 'string' || skin.src.length === 0) return null;
    return skin.src.startsWith('data:image') ? skin.src : null;
  }

  _buildPlayerSkinPalette() {
    if (!this.playerSkinPalette) return;
    const columns = [
      ['#ffb3b3', '#ff5c5c', '#d82626', '#7a0b0b'], // red
      ['#ffd2a1', '#ff9b3d', '#d86500', '#7a3a00'], // orange
      ['#fff3b0', '#ffd84d', '#e0a800', '#7a5a00'], // yellow
      ['#d8ffb0', '#8dff5a', '#3ecf3e', '#136a1f'], // green
      ['#c2e8ff', '#5ab7ff', '#1f6fd9', '#10307a'], // blue
      ['#c6d2ff', '#6b7bff', '#3b44c9', '#1c1f6a'], // navy
      ['#e6c2ff', '#b86bff', '#7a2bd6', '#3a0f6a'], // purple
      ['#ffffff', '#d9d9d9', '#8b5a2b', '#000000'], // white/gray/brown/black
    ];
    const colors = [];
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < columns.length; col += 1) {
        colors.push(columns[col][row]);
      }
    }
    this.playerSkinPalette.innerHTML = '';
    colors.forEach((color, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'palette-swatch';
      button.dataset.color = color;
      button.setAttribute('aria-label', `Color ${index + 1}`);
      button.setAttribute('data-prevent-reverse', 'true');
      button.style.backgroundColor = color;
      button.addEventListener('click', () => {
        this._setPlayerSkinColor(color);
      });
      this.playerSkinPalette.appendChild(button);
    });
    const editor = this._playerSkinEditor;
    if (editor) {
      this._syncPlayerSkinPaletteSelection(editor.color);
    }
  }

  _setPlayerSkinMode(mode) {
    const editor = this._playerSkinEditor;
    if (!editor) return;
    editor.mode = mode === 'cursor' ? 'cursor' : 'free';
    if (this.playerSkinModeFreeButton) {
      this.playerSkinModeFreeButton.classList.toggle('active', editor.mode === 'free');
    }
    if (this.playerSkinModeCursorButton) {
      this.playerSkinModeCursorButton.classList.toggle('active', editor.mode === 'cursor');
    }
    this._refreshPlayerSkinGuide();
  }

  _setPlayerSkinCursor(x, y) {
    const editor = this._playerSkinEditor;
    if (!editor) return;
    const max = editor.size - 1;
    const nextX = Math.max(0, Math.min(max, Math.round(x)));
    const nextY = Math.max(0, Math.min(max, Math.round(y)));
    if (editor.cursor && editor.cursor.x === nextX && editor.cursor.y === nextY) return;
    editor.cursor = { x: nextX, y: nextY };
    this._refreshPlayerSkinGuide();
  }

  _movePlayerSkinCursor(dx, dy) {
    const editor = this._playerSkinEditor;
    if (!editor || !editor.cursor) return;
    this._setPlayerSkinCursor(editor.cursor.x + dx, editor.cursor.y + dy);
  }

  _applyPlayerSkinAtCursor() {
    const editor = this._playerSkinEditor;
    if (!editor || !editor.cursor) return;
    this._paintPlayerSkinPixel(editor.cursor.x, editor.cursor.y);
  }

  _setPlayerSkinTool(tool, { apply = false } = {}) {
    const editor = this._playerSkinEditor;
    if (!editor) return;
    editor.tool = tool === 'erase' ? 'erase' : 'draw';
    if (this.playerSkinToolDrawButton) {
      this.playerSkinToolDrawButton.classList.toggle('active', editor.tool === 'draw');
    }
    if (this.playerSkinToolEraseButton) {
      this.playerSkinToolEraseButton.classList.toggle('active', editor.tool === 'erase');
    }
    if (apply) {
      this._applyPlayerSkinAtCursor();
    }
  }

  _setPlayerSkinColor(color) {
    const editor = this._playerSkinEditor;
    if (!editor) return;
    if (typeof color === 'string' && color.length > 0) {
      editor.color = color;
    }
    this._syncPlayerSkinPaletteSelection(editor.color);
  }

  _syncPlayerSkinPaletteSelection(color) {
    if (!this.playerSkinPalette) return;
    const swatches = Array.from(this.playerSkinPalette.querySelectorAll('.palette-swatch'));
    swatches.forEach((swatch) => {
      const swatchColor = swatch.dataset?.color;
      swatch.classList.toggle('active', swatchColor === color);
    });
  }

  _clearPlayerSkinCanvas() {
    const editor = this._playerSkinEditor;
    if (!editor || !editor.ctx) return;
    editor.ctx.clearRect(0, 0, editor.canvas.width, editor.canvas.height);
  }

  _applyPlayerSkinFromEditor() {
    const editor = this._playerSkinEditor;
    if (!editor || !editor.canvas) return;
    const dataUrl = editor.canvas.toDataURL('image/png');
    const sizeScale = Number.isFinite(editor.size) && Number.isFinite(editor.hitRadius) && editor.hitRadius > 0
      ? editor.size / editor.hitRadius
      : 4;
    this._customPlayerSkin = { src: dataUrl, sizeScale };
    this._emitPlayerSkinSelect({ type: 'image', src: dataUrl, sizeScale });
    this.hidePlayerSkinEditorModal();
  }

  _getPlayerSkinPixelFromEvent(event) {
    const editor = this._playerSkinEditor;
    if (!editor || !editor.canvas) return null;
    const rect = editor.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * editor.canvas.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * editor.canvas.height);
    if (x < 0 || y < 0 || x >= editor.canvas.width || y >= editor.canvas.height) return null;
    return { x, y };
  }

  _paintPlayerSkinPixel(x, y) {
    const editor = this._playerSkinEditor;
    if (!editor || !editor.ctx) return;
    if (editor.tool === 'erase') {
      editor.ctx.clearRect(x, y, 1, 1);
      return;
    }
    editor.ctx.fillStyle = editor.color || '#ffffff';
    editor.ctx.fillRect(x, y, 1, 1);
  }

  _handlePlayerSkinPointerDown(event) {
    const editor = this._playerSkinEditor;
    if (!editor || !editor.canvas) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const point = this._getPlayerSkinPixelFromEvent(event);
    if (!point) return;
    if (editor.mode === 'cursor') {
      editor.isDraggingCursor = true;
      editor.canvas.setPointerCapture?.(event.pointerId);
      this._setPlayerSkinCursor(point.x, point.y);
      return;
    }
    editor.isDrawing = true;
    editor.canvas.setPointerCapture?.(event.pointerId);
    this._paintPlayerSkinPixel(point.x, point.y);
  }

  _handlePlayerSkinPointerMove(event) {
    const editor = this._playerSkinEditor;
    if (!editor) return;
    if (editor.mode === 'cursor') {
      if (!editor.isDraggingCursor) return;
      const point = this._getPlayerSkinPixelFromEvent(event);
      if (!point) return;
      this._setPlayerSkinCursor(point.x, point.y);
      return;
    }
    if (!editor.isDrawing) return;
    const point = this._getPlayerSkinPixelFromEvent(event);
    if (!point) return;
    this._paintPlayerSkinPixel(point.x, point.y);
  }

  _handlePlayerSkinPointerUp(event) {
    const editor = this._playerSkinEditor;
    if (!editor || !editor.canvas) return;
    editor.isDrawing = false;
    editor.isDraggingCursor = false;
    editor.canvas.releasePointerCapture?.(event.pointerId);
  }

  _refreshPlayerSkinGuide() {
    const editor = this._playerSkinEditor;
    if (!editor || !editor.guideCanvas || !editor.guideCtx) return;
    const size = Math.round(editor.guideCanvas.clientWidth);
    if (!size) return;
    if (editor.guideCanvas.width !== size || editor.guideCanvas.height !== size) {
      editor.guideCanvas.width = size;
      editor.guideCanvas.height = size;
    }
    const ctx = editor.guideCtx;
    ctx.clearRect(0, 0, size, size);
    const pixelCount = editor.canvas.width;
    const scale = size / pixelCount;
    const lineOffset = 0.5;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= pixelCount; i += 1) {
      const pos = Math.round(i * scale) + lineOffset;
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
    }
    ctx.stroke();
    ctx.restore();
    const center = size / 2;
    const hitRadius = editor.hitRadius * scale;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = Math.max(1, Math.round(scale * 0.4));
    ctx.setLineDash([Math.max(2, scale * 1.2), Math.max(2, scale * 1.2)]);
    ctx.beginPath();
    ctx.arc(center, center, hitRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    if (editor.mode === 'cursor' && editor.cursor) {
      const cellSize = scale;
      const x = Math.round(editor.cursor.x * scale);
      const y = Math.round(editor.cursor.y * scale);
      let cursorColor = 'rgba(255,255,255,0.9)';
      try {
        const pixel = editor.ctx.getImageData(editor.cursor.x, editor.cursor.y, 1, 1).data;
        const alpha = pixel[3] / 255;
        const luminance = (0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2]) / 255;
        if (alpha > 0.2 && luminance > 0.85) {
          cursorColor = 'rgba(0,0,0,0.9)';
        }
      } catch (_) {
        // ignore sampling errors
      }
      ctx.save();
      ctx.strokeStyle = cursorColor;
      ctx.lineWidth = Math.max(1, Math.round(scale * 0.25));
      ctx.strokeRect(x + lineOffset, y + lineOffset, Math.max(1, cellSize - 1), Math.max(1, cellSize - 1));
      ctx.restore();
    }
  }

  _ensureSlotImage(slot) {
    if (!slot || typeof document === 'undefined') return null;
    let container = slot.querySelector('.customize-slot-content');
    if (!container) {
      container = document.createElement('span');
      container.className = 'customize-slot-content';
      slot.appendChild(container);
    }
    let img = container.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'pixel-art';
      img.alt = '';
      container.appendChild(img);
    }
    return img;
  }

  _getPlayerRadiusOverrides(slot) {
    if (!slot) return {};
    const overrides = {};
    const radius = parseFloat(slot.dataset?.playerRadius ?? '');
    const renderRadius = parseFloat(slot.dataset?.playerRenderRadius ?? '');
    if (Number.isFinite(radius)) overrides.radius = radius;
    if (Number.isFinite(renderRadius)) overrides.renderRadius = renderRadius;
    return overrides;
  }

  _getObstacleScaleOverrides(slot) {
    if (!slot) return {};
    const overrides = {};
    const hitScale = parseFloat(slot.dataset?.obstacleHitScale ?? '');
    const renderScale = parseFloat(slot.dataset?.obstacleRenderScale ?? '');
    if (Number.isFinite(hitScale)) overrides.hitScale = hitScale;
    if (Number.isFinite(renderScale)) overrides.renderScale = renderScale;
    return overrides;
  }

  _getRingScaleOverrides(slot) {
    if (!slot) return {};
    const overrides = {};
    const lineWidth = parseFloat(slot.dataset?.ringLineWidth ?? '');
    const renderScale = parseFloat(slot.dataset?.ringRenderScale ?? '');
    const glowValue = slot.dataset?.ringGlow;
    const glowBlur = parseFloat(slot.dataset?.ringGlowBlur ?? '');
    if (Number.isFinite(lineWidth)) overrides.lineWidth = lineWidth;
    if (Number.isFinite(renderScale)) overrides.renderScale = renderScale;
    if (glowValue != null) {
      overrides.glow = glowValue === '' || glowValue === 'true' || glowValue === '1';
    }
    if (Number.isFinite(glowBlur)) overrides.glowBlur = glowBlur;
    return overrides;
  }

  async _loadPixilPreview(src) {
    try {
      const response = await fetch(encodeURI(src));
      if (!response.ok) return null;
      const data = await response.json();
      const raw = data?.preview || data?.frames?.[0]?.preview || data?.frames?.[0]?.layers?.[0]?.src;
      return this._normalizePixilPreview(raw);
    } catch (_) {
      return null;
    }
  }

  _normalizePixilPreview(value) {
    if (typeof value !== 'string' || value.length === 0) return null;
    const marker = 'base64,';
    const markerIndex = value.indexOf(marker);
    if (markerIndex >= 0) {
      return `data:image/png;base64,${value.slice(markerIndex + marker.length)}`;
    }
    const commaIndex = value.indexOf(',');
    if (value.startsWith('data:image/png') && commaIndex >= 0) {
      return `data:image/png;base64,${value.slice(commaIndex + 1)}`;
    }
    return null;
  }

  _setPlayerPreview(preview, sizePx = null) {
    const hasPreview = typeof preview === 'string' && preview.length > 0;
    if (this.playerPreviewImage) {
      this.playerPreviewImage.src = hasPreview ? preview : '';
      this.playerPreviewImage.style.display = hasPreview ? 'block' : 'none';
      if (hasPreview && Number.isFinite(sizePx) && sizePx > 0) {
        const clamped = Math.max(1, Math.round(sizePx));
        this.playerPreviewImage.style.width = `${clamped}px`;
        this.playerPreviewImage.style.height = `${clamped}px`;
      } else {
        this.playerPreviewImage.style.removeProperty('width');
        this.playerPreviewImage.style.removeProperty('height');
      }
    }
    if (hasPreview) {
      if (this.playerPreviewDefault) this.playerPreviewDefault.style.display = 'none';
      return;
    }
    this._setPlayerPreviewColor(null);
  }

  _setPlayerPreviewColor(color) {
    if (this.playerPreviewImage) {
      this.playerPreviewImage.src = '';
      this.playerPreviewImage.style.display = 'none';
    }
    if (this.playerPreviewDefault) {
      this.playerPreviewDefault.style.display = 'block';
      if (color) {
        this.playerPreviewDefault.style.background = color;
      } else {
        this.playerPreviewDefault.style.background = '';
      }
    }
  }

  _setObstaclePreviewColor(color) {
    if (this.obstaclePreviewImage) {
      this.obstaclePreviewImage.src = '';
      this.obstaclePreviewImage.style.display = 'none';
    }
    if (!this.obstaclePreviewSpike) return;
    this.obstaclePreviewSpike.style.display = 'block';
    if (color) {
      this.obstaclePreviewSpike.style.borderTopColor = color;
    } else {
      this.obstaclePreviewSpike.style.borderTopColor = '';
    }
  }

  _setObstaclePreviewImage(preview) {
    const hasPreview = typeof preview === 'string' && preview.length > 0;
    if (this.obstaclePreviewImage) {
      this.obstaclePreviewImage.src = hasPreview ? preview : '';
      this.obstaclePreviewImage.style.display = hasPreview ? 'block' : 'none';
    }
    if (this.obstaclePreviewSpike) {
      this.obstaclePreviewSpike.style.display = hasPreview ? 'none' : 'block';
    }
    if (!hasPreview) {
      this._setObstaclePreviewColor(null);
    }
  }

  _setRingPreviewColor(color, glow = false, glowBlur = null) {
    if (this.ringPreviewImage) {
      this.ringPreviewImage.src = '';
      this.ringPreviewImage.style.display = 'none';
      this.ringPreviewImage.style.removeProperty('filter');
    }
    if (!this.ringPreviewRing) return;
    this.ringPreviewRing.style.display = 'block';
    if (color) {
      this.ringPreviewRing.style.borderColor = color;
    } else {
      this.ringPreviewRing.style.borderColor = '';
    }
    if (glow) {
      const shadowColor = color || '#ffffff';
      const outer = Math.max(6, Math.round(Number.isFinite(glowBlur) ? glowBlur : 18));
      const inner = Math.max(4, Math.round(outer * 0.6));
      this.ringPreviewRing.style.boxShadow = `0 0 ${inner}px ${shadowColor}, 0 0 ${outer}px ${shadowColor}`;
    } else {
      this.ringPreviewRing.style.boxShadow = '';
    }
  }

  _setRingPreviewImage(preview, glow = false, glowBlur = null, glowColor = null) {
    const hasPreview = typeof preview === 'string' && preview.length > 0;
    if (this.ringPreviewImage) {
      this.ringPreviewImage.src = hasPreview ? preview : '';
      this.ringPreviewImage.style.display = hasPreview ? 'block' : 'none';
      if (glow && hasPreview) {
        const shadowColor = glowColor || '#ffffff';
        const outer = Math.max(6, Math.round(Number.isFinite(glowBlur) ? glowBlur : 18));
        const inner = Math.max(4, Math.round(outer * 0.6));
        this.ringPreviewImage.style.filter = `drop-shadow(0 0 ${inner}px ${shadowColor}) drop-shadow(0 0 ${outer}px ${shadowColor})`;
      } else {
        this.ringPreviewImage.style.removeProperty('filter');
      }
    }
    if (this.ringPreviewRing) {
      this.ringPreviewRing.style.display = hasPreview ? 'none' : 'block';
    }
    if (!hasPreview) {
      this._setRingPreviewColor(null);
    }
  }

  setPlayerSkinPreview(skin, options = {}) {
    const normalized = skin && typeof skin === 'object' ? skin : null;
    this._currentPlayerSkin = normalized;
    if (normalized?.type === 'image'
      && typeof normalized.src === 'string'
      && normalized.src.startsWith('data:image')
      && Number.isFinite(normalized.sizeScale)
      && normalized.sizeScale > 2) {
      this._customPlayerSkin = { src: normalized.src, sizeScale: normalized.sizeScale };
    }
    if (normalized && normalized.type === 'image' && typeof normalized.src === 'string' && normalized.src.length > 0) {
      let previewSize = null;
      const renderRadius = Number.isFinite(options?.renderRadius) && options.renderRadius > 0
        ? options.renderRadius
        : null;
      const isCusSkin = normalized.src.startsWith('data:image')
        && Number.isFinite(normalized.sizeScale)
        && normalized.sizeScale > 2;
      if (isCusSkin && renderRadius) {
        const sizeScale = normalized.sizeScale;
        const rawSize = Number.isFinite(normalized.sizePx) ? normalized.sizePx : renderRadius * sizeScale;
        const snapBase = Math.max(1, renderRadius * 2);
        const baseSize = snapBase * Math.max(1, Math.round(rawSize / snapBase));
        previewSize = Math.max(1, Math.round(baseSize));
      }
      this._setPlayerPreview(normalized.src, previewSize);
      return;
    }
    const color = typeof normalized?.color === 'string' && normalized.color.length > 0 ? normalized.color : null;
    if (color) {
      this._setPlayerPreviewColor(color);
      return;
    }
    this._setPlayerPreview(null);
  }

  setObstacleSkinPreview(skin) {
    if (skin && skin.type === 'image' && typeof skin.src === 'string' && skin.src.length > 0) {
      this._setObstaclePreviewImage(skin.src);
      return;
    }
    const color = typeof skin?.color === 'string' && skin.color.length > 0 ? skin.color : null;
    if (color) {
      this._setObstaclePreviewColor(color);
      return;
    }
    this._setObstaclePreviewColor(null);
  }

  setRingSkinPreview(skin) {
    if (skin && skin.type === 'image' && typeof skin.src === 'string' && skin.src.length > 0) {
      this._setRingPreviewImage(skin.src, skin.glow, skin.glowBlur, skin.color);
      return;
    }
    const color = typeof skin?.color === 'string' && skin.color.length > 0 ? skin.color : null;
    if (color) {
      this._setRingPreviewColor(color, skin?.glow, skin?.glowBlur);
      return;
    }
    this._setRingPreviewColor(null, skin?.glow, skin?.glowBlur);
  }

  _initCustomizePagination({ pages, prevButton, nextButton, indicator, indexKey }) {
    if (!Array.isArray(pages) || pages.length === 0) return;
    const total = pages.length;
    const setIndex = (nextIndex) => {
      const raw = Number.isFinite(nextIndex) ? nextIndex : 0;
      const clamped = Math.max(0, Math.min(total - 1, raw));
      this[indexKey] = clamped;
      pages.forEach((page, idx) => {
        page.classList.toggle('active', idx === clamped);
      });
      if (indicator) {
        indicator.textContent = `${clamped + 1}/${total}`;
      }
      if (prevButton) prevButton.disabled = clamped === 0;
      if (nextButton) nextButton.disabled = clamped === total - 1;
    };
    if (prevButton) {
      prevButton.addEventListener('click', () => {
        setIndex((this[indexKey] ?? 0) - 1);
      });
    }
    if (nextButton) {
      nextButton.addEventListener('click', () => {
        setIndex((this[indexKey] ?? 0) + 1);
      });
    }
    setIndex(this[indexKey] ?? 0);
  }

  _emitPlayerSkinSelect(payload) {
    if (typeof this._onPlayerSkinSelect === 'function') {
      this._onPlayerSkinSelect(payload);
    }
  }

  _emitObstacleSkinSelect(payload) {
    if (typeof this._onObstacleSkinSelect === 'function') {
      this._onObstacleSkinSelect(payload);
    }
  }

  _emitRingSkinSelect(payload) {
    if (typeof this._onRingSkinSelect === 'function') {
      this._onRingSkinSelect(payload);
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
    onPlayerSkinSelect,
    onObstacleSkinSelect,
    onRingSkinSelect,
    onPause,
    onResume,
    onPauseStageSelect,
    onShowLeaderboard,
  } = {}) {
    this._onPlayerSkinSelect = typeof onPlayerSkinSelect === 'function' ? onPlayerSkinSelect : null;
    this._onObstacleSkinSelect = typeof onObstacleSkinSelect === 'function' ? onObstacleSkinSelect : null;
    this._onRingSkinSelect = typeof onRingSkinSelect === 'function' ? onRingSkinSelect : null;
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
            const isCurrent = this.selectedStageId === stage;
            const nextEx = isCurrent ? !this.isStageEx(stage) : false;
            this.setStageSelection(stage, { ex: nextEx });
            onStageSelect(stage, { ex: nextEx });
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
    if (this.leaderboardButton && onShowLeaderboard) {
      this.leaderboardButton.addEventListener('click', () => {
        const stageId = this.selectedStageId || 'stage1';
        const ex = this.isStageEx(stageId);
        onShowLeaderboard(stageId, { ex });
      });
    }
    if (this.settingsButton) {
      this.settingsButton.addEventListener('click', () => {
        if (onOpenSettings) onOpenSettings();
        this.hideResetConfirmModal();
        this.showSettingsModal();
      });
    }
    if (this.customizeButton) {
      this.customizeButton.addEventListener('click', () => {
        this.hideSettingsModal();
        this.hideResetConfirmModal();
        this.showCustomizeModal();
      });
    }
    if (this.customizePlayerButton) {
      this.customizePlayerButton.addEventListener('click', () => {
        this.hideObstacleCustomizeModal();
        this.hideRingCustomizeModal();
        this.showPlayerCustomizeModal();
      });
    }
    if (this.customizeObstacleButton) {
      this.customizeObstacleButton.addEventListener('click', () => {
        this.hidePlayerCustomizeModal();
        this.hideRingCustomizeModal();
        this.showObstacleCustomizeModal();
      });
    }
    if (this.customizeRingButton) {
      this.customizeRingButton.addEventListener('click', () => {
        this.hidePlayerCustomizeModal();
        this.hideObstacleCustomizeModal();
        this.showRingCustomizeModal();
      });
    }
    if (this.closeSettingsButton) {
      this.closeSettingsButton.addEventListener('click', () => {
        this.hideSettingsModal();
        if (onCloseSettings) onCloseSettings();
      });
    }
    if (this.closePlayerCustomizeButton) {
      this.closePlayerCustomizeButton.addEventListener('click', () => {
        this.hidePlayerCustomizeModal();
      });
    }
    if (this.closeObstacleCustomizeButton) {
      this.closeObstacleCustomizeButton.addEventListener('click', () => {
        this.hideObstacleCustomizeModal();
      });
    }
    if (this.closeRingCustomizeButton) {
      this.closeRingCustomizeButton.addEventListener('click', () => {
        this.hideRingCustomizeModal();
      });
    }
    if (this.closeCustomizeButton) {
      this.closeCustomizeButton.addEventListener('click', () => {
        this.hideCustomizeModal();
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
    if (this.gameOverPeekButton) {
      this.gameOverPeekButton.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleGameOverPeek();
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
    this._setGameOverPeekButtonVisible(false);
    this._updateGameOverPeekButtonState(false);
    this.hidePauseMenu();
    this.hideSettingsModal();
    this.hideResetConfirmModal();
    this.hideCustomizeModal();
    this.hidePlayerCustomizeModal();
    this.hideObstacleCustomizeModal();
    this.hideRingCustomizeModal();
  }

  showIntro() {
    this._introVisible = true;
    if (this.startScreen) this.startScreen.style.display = 'none';
    if (this.gameOverScreen) this.gameOverScreen.style.display = 'none';
    if (this.introScreen) this.introScreen.style.display = 'flex';
    this.hidePauseButton();
    this.hidePauseMenu();
    this._setGameOverPeekButtonVisible(false);
    this._updateGameOverPeekButtonState(false);
    this.hideCustomizeModal();
    this.hidePlayerCustomizeModal();
    this.hideObstacleCustomizeModal();
    this.hideRingCustomizeModal();
    if (this.stageSelectLabel) {
      const stageId = this.selectedStageId || 'stage1';
      this.setStageSelection(stageId, { ex: this.isStageEx(stageId) });
    }
  }

  showStageSelection() {
    this._introVisible = false;
    if (this.introScreen) this.introScreen.style.display = 'none';
    if (this.gameOverScreen) this.gameOverScreen.style.display = 'none';
    if (this.startScreen) this.startScreen.style.display = 'flex';
    this.hidePauseButton();
    this.hidePauseMenu();
    this._setGameOverPeekButtonVisible(false);
    this._updateGameOverPeekButtonState(false);
    this.hideSettingsModal();
    this.hideResetConfirmModal();
    this.hideCustomizeModal();
    this.hidePlayerCustomizeModal();
    this.hideObstacleCustomizeModal();
    this.hideRingCustomizeModal();
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

  setStageSelection(stageId, { ex = false, resetOthers = true } = {}) {
    if (this.isStageLocked(stageId)) return;
    if (!stageId) return;
    const btn = this.stageButtonMap.get(stageId);
    if (!btn) return;
    this.selectedStageId = stageId;
    if (resetOthers) {
      for (const [key] of this.stageExState) {
        this._setStageEx(key, key === stageId ? ex : false);
      }
    } else {
      this._setStageEx(stageId, ex);
    }
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

  isStageEx(stageId) {
    return !!this.stageExState.get(stageId);
  }

  _setStageEx(stageId, isEx) {
    if (!stageId) return;
    const normalized = !!isEx;
    this.stageExState.set(stageId, normalized);
    const btn = this.stageButtonMap.get(stageId);
    if (!btn) return;
    const baseLabel = this.stageLabelDefaults.get(stageId) ?? btn.textContent?.trim() ?? stageId;
    const suffix = EXTRA_STAGE?.labelSuffix ?? ' EX';
    btn.textContent = normalized ? `${baseLabel}${suffix}` : baseLabel;
  }

  showGameOver(finalScoreSeconds, highScore = null, isNew = false) {
    if (this.gameOverScreen) this.gameOverScreen.style.display = 'flex';
    this._gameOverOverlayVisible = true;
    this._gameOverOverlayHidden = false;
    this.hidePauseButton();
    this.hidePauseMenu();
    this._setGameOverPeekButtonVisible(true);
    this._updateGameOverPeekButtonState(false);
    if (this.scoreDisplay) {
      const lines = [];
      if (isNew) lines.push('New High Score!');
      lines.push(`Score: ${finalScoreSeconds}`);
      if (highScore != null) lines.push(`Best: ${highScore}`);
      this.scoreDisplay.innerHTML = lines.map(x => `<div>${x}</div>`).join('');
    }
  }

  setStageLock(stageId, locked) {
    const btn = this.stageButtonMap.get(stageId);
    if (!btn) return;
    this.stageLocks.set(stageId, !!locked);
    btn.style.display = locked ? 'none' : '';
    if (locked) {
      btn.classList.remove('active');
      this.selectedStageId = null;
      this._setStageEx(stageId, false);
    } else if (btn.classList.contains('active')) {
      // ensure active state keeps current EX flag when unlock restores visibility
      this._setStageEx(stageId, this.isStageEx(stageId));
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

  showCustomizeModal() {
    if (this.customizeModal) this.customizeModal.style.display = 'flex';
  }

  hideCustomizeModal() {
    if (this.customizeModal) this.customizeModal.style.display = 'none';
  }

  showPlayerCustomizeModal() {
    if (this.playerCustomizeModal) this.playerCustomizeModal.style.display = 'flex';
  }

  hidePlayerCustomizeModal() {
    if (this.playerCustomizeModal) this.playerCustomizeModal.style.display = 'none';
  }

  showPlayerSkinEditorModal() {
    if (this.playerSkinEditorModal) this.playerSkinEditorModal.style.display = 'flex';
    this._preparePlayerSkinEditor();
  }

  hidePlayerSkinEditorModal() {
    if (this.playerSkinEditorModal) this.playerSkinEditorModal.style.display = 'none';
  }

  showObstacleCustomizeModal() {
    if (this.obstacleCustomizeModal) this.obstacleCustomizeModal.style.display = 'flex';
  }

  hideObstacleCustomizeModal() {
    if (this.obstacleCustomizeModal) this.obstacleCustomizeModal.style.display = 'none';
  }

  showRingCustomizeModal() {
    if (this.ringCustomizeModal) this.ringCustomizeModal.style.display = 'flex';
  }

  hideRingCustomizeModal() {
    if (this.ringCustomizeModal) this.ringCustomizeModal.style.display = 'none';
  }

  showResetConfirmModal() {
    if (this.resetConfirmModal) this.resetConfirmModal.style.display = 'flex';
  }

  hideResetConfirmModal() {
    if (this.resetConfirmModal) this.resetConfirmModal.style.display = 'none';
  }

  setLeaderboardButtonVisible(visible) {
    if (!this.leaderboardButton) return;
    this.leaderboardButton.style.display = visible ? 'inline-flex' : 'none';
  }

  showUnlockRequirement(message) {
    if (!this.unlockRequirementModal) return;
    if (this.unlockRequirementMessage) {
      this.unlockRequirementMessage.textContent = message || '';
    }
    this.unlockRequirementModal.style.display = 'flex';
    if (!this._unlockRequirementKeyHandler && typeof document !== 'undefined') {
      this._unlockRequirementKeyHandler = (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        this.hideUnlockRequirement();
      };
      document.addEventListener('keydown', this._unlockRequirementKeyHandler, true);
    }
    if (!this._unlockRequirementPointerHandler && this.unlockRequirementModal) {
      this._unlockRequirementPointerHandler = (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        this.hideUnlockRequirement();
      };
      this.unlockRequirementModal.addEventListener('click', this._unlockRequirementPointerHandler, true);
    }
  }

  hideUnlockRequirement() {
    if (this.unlockRequirementModal) this.unlockRequirementModal.style.display = 'none';
    if (this._unlockRequirementKeyHandler && typeof document !== 'undefined') {
      document.removeEventListener('keydown', this._unlockRequirementKeyHandler, true);
      this._unlockRequirementKeyHandler = null;
    }
    if (this._unlockRequirementPointerHandler && this.unlockRequirementModal) {
      this.unlockRequirementModal.removeEventListener('click', this._unlockRequirementPointerHandler, true);
      this._unlockRequirementPointerHandler = null;
    }
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
    this._updateGameOverPeekButtonState(true);
  }

  _restoreGameOverOverlay() {
    if (!this.gameOverScreen) return;
    if (!this._gameOverOverlayVisible || !this._gameOverOverlayHidden) return;
    this._gameOverOverlayHidden = false;
    this.gameOverScreen.style.display = 'flex';
    this._updateGameOverPeekButtonState(false);
  }

  toggleGameOverPeek() {
    if (!this._gameOverOverlayVisible) return;
    if (this._gameOverOverlayHidden) {
      this._restoreGameOverOverlay();
    } else {
      this._temporarilyHideGameOverOverlay();
    }
  }

  _setGameOverPeekButtonVisible(visible) {
    if (!this.gameOverPeekButton) return;
    this.gameOverPeekButton.style.display = visible ? 'inline-flex' : 'none';
  }

  _updateGameOverPeekButtonState(active) {
    if (!this.gameOverPeekButton) return;
    const isActive = !!active;
    this.gameOverPeekButton.classList.toggle('active', isActive);
    this.gameOverPeekButton.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    const label = isActive ? '게임 오버 화면 보기' : '피격 장면 보기';
    if (this.gameOverPeekLabel) this.gameOverPeekLabel.textContent = label;
  }
}
