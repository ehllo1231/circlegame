import { StageManager } from './StageManager.js';
import { Stage2PrologObstacle } from './Stage2PrologObstacle.js';
import { STAGE2_PROLOG, ORBIT, STAGE_ALL_CLEAR, CANVAS } from './Config.js';

export const STAGE_ALL_CLEAR_ID = 'stageAllClear';

const DEFAULT_RETRACT_DELAY_SEC = 0.2;
const DEFAULT_RETRACT_DURATION_SEC = 2.1;
const DEFAULT_RETRACT_EASE = 1.25;
const DEFAULT_DISABLE_THRESHOLD_PX = 4;
const DEFAULT_TARGET_INSET_PX = 48;
const DEFAULT_FADE_DELAY_SEC = 0.5;
const DEFAULT_FADE_DURATION_SEC = 1.8;
const DEFAULT_MESSAGE_TEXT = 'Congratulations! You cleared every stage. Thanks for playing!';
const DEFAULT_MESSAGE_FONT = '28px "Arial", sans-serif';
const DEFAULT_MESSAGE_COLOR = '#ffffff';
const DEFAULT_MESSAGE_SHADOW = 'rgba(0, 0, 0, 0.65)';
const DEFAULT_MESSAGE_OFFSET_Y = 0;
const DEFAULT_MESSAGE_FADE_DELAY = 0.3;
const DEFAULT_MESSAGE_FADE_DURATION = 1.2;
const DEFAULT_PROMPT_TEXT = 'Press any key or tap to return to title';
const DEFAULT_PROMPT_FONT = '20px "Arial", sans-serif';
const DEFAULT_PROMPT_COLOR = '#b5b5b5';
const DEFAULT_PROMPT_SHADOW = 'rgba(0, 0, 0, 0.45)';
const DEFAULT_PROMPT_OFFSET_Y = 120;
const DEFAULT_PROMPT_DELAY_AFTER_MESSAGE = 1;
const DEFAULT_PROMPT_FADE_DURATION = 0.8;

class StageAllClearOverlay {
  constructor({ fade = {}, message = {}, prompt = {} } = {}) {
    this.configure({ fade, message, prompt });
    this.elapsed = 0;
  }

  configure({ fade = {}, message = {}, prompt = {} } = {}) {
    this.fadeDelaySec = resolvePositive(fade?.delaySec, DEFAULT_FADE_DELAY_SEC);
    this.fadeDurationSec = resolvePositive(fade?.durationSec, DEFAULT_FADE_DURATION_SEC);
    this.fadeColor = typeof fade?.color === 'string' ? fade.color : '#000000';
    this.messageText = typeof message?.text === 'string' ? message.text : DEFAULT_MESSAGE_TEXT;
    const resolvedMessageFont = resolveFontString(message?.font, DEFAULT_MESSAGE_FONT);
    this.messageFontSpec = createFontSpec(resolvedMessageFont, { minPx: 22, maxPx: 96 });
    this.messageFont = this.messageFontSpec.original;
    this.messageColor = typeof message?.color === 'string' ? message.color : DEFAULT_MESSAGE_COLOR;
    this.messageShadowColor = typeof message?.shadowColor === 'string'
      ? message.shadowColor
      : DEFAULT_MESSAGE_SHADOW;
    this.messageOffsetY = resolveNumber(message?.offsetY, DEFAULT_MESSAGE_OFFSET_Y);
    this.messageFadeDelaySec = resolveNumber(message?.fadeInDelaySec, DEFAULT_MESSAGE_FADE_DELAY);
    this.messageFadeDurationSec = resolvePositive(
      message?.fadeInDurationSec,
      DEFAULT_MESSAGE_FADE_DURATION,
    );
    this.promptText = typeof prompt?.text === 'string' ? prompt.text : DEFAULT_PROMPT_TEXT;
    const resolvedPromptFont = resolveFontString(prompt?.font, DEFAULT_PROMPT_FONT);
    this.promptFontSpec = createFontSpec(resolvedPromptFont, { minPx: 16, maxPx: 72 });
    this.promptFont = this.promptFontSpec.original;
    this.promptColor = typeof prompt?.color === 'string' ? prompt.color : DEFAULT_PROMPT_COLOR;
    this.promptShadowColor = typeof prompt?.shadowColor === 'string'
      ? prompt.shadowColor
      : DEFAULT_PROMPT_SHADOW;
    this.promptOffsetY = resolveNumber(prompt?.offsetY, DEFAULT_PROMPT_OFFSET_Y);
    this.promptDelayAfterMessageSec = resolveNumber(
      prompt?.delayAfterMessageSec,
      DEFAULT_PROMPT_DELAY_AFTER_MESSAGE,
    );
    this.promptFadeDurationSec = resolvePositive(
      prompt?.fadeInDurationSec,
      DEFAULT_PROMPT_FADE_DURATION,
    );
  }

  reset() {
    this.elapsed = 0;
  }

  update(dtSeconds = 0) {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    this.elapsed += dtSeconds;
  }

  draw(ctx) {
    if (!ctx) return;
    const canvas = ctx.canvas;
    const width = canvas?.width ?? 0;
    const height = canvas?.height ?? 0;
    if (width <= 0 || height <= 0) return;

    const viewportScale = this._computeViewportScale(canvas);
    const fadeAlpha = this._getFadeAlpha();
    if (fadeAlpha > 0) {
      ctx.save();
      ctx.fillStyle = colorWithAlpha(this.fadeColor, fadeAlpha);
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    const messageAlpha = this._getMessageAlpha();
    this._lastMessageBaseline = null;
    if (messageAlpha > 0 && this.messageText) {
      ctx.save();
      ctx.globalAlpha = messageAlpha;
      ctx.font = this._scaleFont(this.messageFontSpec, viewportScale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (this.messageShadowColor) {
        ctx.shadowColor = this.messageShadowColor;
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = this.messageColor;
      const centerX = width / 2;
      const centerY = height / 2 + this.messageOffsetY;
      const messageCenterY = centerY + this.messageOffsetY;
      const metrics = drawTextBlock({
        ctx,
        text: this.messageText,
        x: centerX,
        y: messageCenterY,
        maxWidth: width * 0.8,
        lineHeight: this._computeLineHeight(ctx),
        returnMetrics: true,
      });
      this._lastMessageBaseline = metrics?.lastBaseline ?? messageCenterY;
      ctx.restore();
    }

    const promptAlpha = this._getPromptAlpha();
    if (promptAlpha > 0 && this.promptText) {
      ctx.save();
      ctx.globalAlpha = promptAlpha;
      ctx.font = this._scaleFont(this.promptFontSpec, viewportScale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (this.promptShadowColor) {
        ctx.shadowColor = this.promptShadowColor;
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = this.promptColor;
      const promptLineHeight = Math.max(20, this._computeLineHeight(ctx) * 0.75);
      const scaledOffset = this._scaleOffset(this.promptOffsetY, viewportScale, height, promptLineHeight);
      const promptBase = clamp(
        (this._lastMessageBaseline ?? (height / 2)) + scaledOffset,
        promptLineHeight * 0.8,
        height - promptLineHeight * 0.8,
      );
      drawTextBlock({
        ctx,
        text: this.promptText,
        x: width / 2,
        y: promptBase,
        maxWidth: width * 0.8,
        lineHeight: promptLineHeight,
      });
      ctx.restore();
    }
  }

  _getFadeAlpha() {
    const delay = Math.max(0, this.fadeDelaySec);
    const duration = Math.max(0.001, this.fadeDurationSec);
    const t = Math.max(0, this.elapsed - delay);
    return clamp01(t / duration);
  }

  _getMessageAlpha() {
    const baseDelay = Math.max(0, this.fadeDelaySec + this.fadeDurationSec);
    const extraDelay = Math.max(0, this.messageFadeDelaySec);
    const totalDelay = baseDelay + extraDelay;
    const duration = Math.max(0.001, this.messageFadeDurationSec);
    const t = Math.max(0, this.elapsed - totalDelay);
    return clamp01(t / duration);
  }

  _getPromptAlpha() {
    const start = this._getPromptStartTime();
    const duration = Math.max(0.001, this.promptFadeDurationSec);
    const t = Math.max(0, this.elapsed - start);
    return clamp01(t / duration);
  }

  _getPromptStartTime() {
    const messageStart = this.fadeDelaySec + this.fadeDurationSec + Math.max(0, this.messageFadeDelaySec);
    const messageEnd = messageStart + this.messageFadeDurationSec;
    const promptDelay = Math.max(0, this.promptDelayAfterMessageSec);
    return messageEnd + promptDelay;
  }

  isPromptInteractive() {
    return this.elapsed >= this._getPromptStartTime();
  }

  _computeLineHeight(ctx) {
    const metrics = ctx.measureText('M');
    const base = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    return Math.max(24, base * 1.4);
  }

  _computeViewportScale(canvas) {
    const referenceSide = this._resolveReferenceViewportSide();
    const currentSide = this._resolveCurrentMinViewportSide(canvas);
    if (!Number.isFinite(referenceSide) || referenceSide <= 0) return 1;
    if (!Number.isFinite(currentSide) || currentSide <= 0) return 1;
    const rawScale = currentSide / referenceSide;
    return clamp(rawScale, 0.55, 1.6);
  }

  _resolveReferenceViewportSide() {
    const width = Number.isFinite(CANVAS?.width) ? CANVAS.width : 900;
    const height = Number.isFinite(CANVAS?.height) ? CANVAS.height : 900;
    const side = Math.min(width, height);
    return Number.isFinite(side) && side > 0 ? side : null;
  }

  _resolveCurrentMinViewportSide(canvas) {
    const fallbackWidth = Number.isFinite(CANVAS?.width) ? CANVAS.width : 900;
    const fallbackHeight = Number.isFinite(CANVAS?.height) ? CANVAS.height : 900;
    const width = Number.isFinite(canvas?.width) ? canvas.width : fallbackWidth;
    const height = Number.isFinite(canvas?.height) ? canvas.height : fallbackHeight;
    const side = Math.min(width, height);
    return Number.isFinite(side) && side > 0 ? side : null;
  }

  _scaleFont(fontSpec, viewportScale = 1) {
    if (!fontSpec) return '';
    const baseSize = Number.isFinite(fontSpec.sizePx) ? fontSpec.sizePx : null;
    if (!baseSize) return fontSpec.original;
    const clampedScale = clamp(viewportScale, 0.55, 1.6);
    const targetSize = clamp(
      baseSize * clampedScale,
      fontSpec.minPx ?? baseSize * 0.65,
      fontSpec.maxPx ?? baseSize * 1.6,
    );
    const rounded = Math.round(targetSize * 10) / 10;
    const prefix = fontSpec.prefix ?? '';
    const suffix = fontSpec.suffix ?? '';
    return `${prefix}${rounded}px${suffix}`;
  }

  _scaleOffset(offset, viewportScale, axisSize, minMargin = 16) {
    const normalized = Number.isFinite(offset) ? offset : 0;
    const clampedScale = clamp(viewportScale, 0.55, 1.6);
    const scaled = normalized * clampedScale;
    const margin = Math.max(minMargin, axisSize * 0.05);
    const maxOffset = Math.max(0, (axisSize / 2) - margin);
    return clamp(scaled, -maxOffset, maxOffset);
  }
}

class StageAllClearSpikeDisplay {
  constructor({ config = {} } = {}) {
    this.obstacles = [];
    this.centerX = 0;
    this.centerY = 0;
    this.orbitRadius = null;
    this.scale = 1;
    this.baseWidth = 0;
    this.initialLength = 0;
    this.initialRadius = 0;
    this.targetBaseRadius = 0;
    this.currentProgress = 0;
    this.elapsed = 0;
    this.retracting = false;
    this.config = config || {};
    this._applyEffectConfig();
  }

  start(geometry = {}) {
    this.setConfig(this.config);
    this._applyGeometry(geometry);
    this._buildObstacles();
    this.elapsed = 0;
    this.retracting = false;
    this.currentProgress = 0;
    this._applyRetractProgress(0);
  }

  update(dtSeconds = 0) {
    const dt = Number.isFinite(dtSeconds) ? Math.max(0, dtSeconds) : 0;
    if (dt <= 0 || this.obstacles.length === 0) return;
    this.elapsed += dt;
    if (!this.retracting && this.elapsed >= this.retractDelaySec) {
      this.retracting = true;
    }
    if (!this.retracting) return;
    const timeIntoRetract = this.elapsed - this.retractDelaySec;
    const duration = Math.max(0.001, this.retractDurationSec);
    const rawProgress = clamp01(timeIntoRetract / duration);
    const eased = Math.pow(rawProgress, this.retractEaseExponent);
    this._applyRetractProgress(eased);
    if (rawProgress >= 1 && this.removeAfterRetract) {
      this.obstacles = [];
    }
  }

  draw(/* ctx */) {
    // Visual handled by GameScene obstacles.
  }

  getObstacles() {
    return Array.isArray(this.obstacles) ? this.obstacles : [];
  }

  updateViewport(geometry = {}) {
    this._applyGeometry(geometry);
    if (!Array.isArray(this.obstacles) || this.obstacles.length === 0) return;
    const maskRadius = Number.isFinite(this.orbitRadius) ? this.orbitRadius : null;
    for (const obstacle of this.obstacles) {
      if (!obstacle) continue;
      obstacle.baseWidth = this.baseWidth;
      obstacle.setMaskRadius(maskRadius);
    }
    this._applyRetractProgress(this.currentProgress);
  }

  setConfig(config = {}) {
    this.config = config || {};
    this._applyEffectConfig();
  }

  _applyEffectConfig() {
    const cfg = this.config || {};
    this.retractDelaySec = resolvePositive(cfg.retractDelaySec, DEFAULT_RETRACT_DELAY_SEC);
    this.retractDurationSec = resolvePositive(cfg.retractDurationSec, DEFAULT_RETRACT_DURATION_SEC);
    this.retractEaseExponent = resolvePositive(cfg.retractEaseExponent, DEFAULT_RETRACT_EASE);
    this.disableCollisionThresholdPx = resolvePositive(
      cfg.disableCollisionBelowPx,
      DEFAULT_DISABLE_THRESHOLD_PX,
    );
    this.targetInsetPx = Math.max(0, resolveNumber(cfg.targetInsetPx, DEFAULT_TARGET_INSET_PX));
    this.removeAfterRetract = cfg.removeAfterRetract !== false;
  }

  _applyGeometry(geometry = {}) {
    if (typeof geometry.centerX === 'number') this.centerX = geometry.centerX;
    if (typeof geometry.centerY === 'number') this.centerY = geometry.centerY;
    if (typeof geometry.orbitRadius === 'number') this.orbitRadius = geometry.orbitRadius;
    this._resolveScale();
  }

  _resolveScale() {
    const baseOrbit = typeof ORBIT?.radius === 'number' ? ORBIT.radius : 160;
    if (!Number.isFinite(baseOrbit) || baseOrbit <= 0) {
      this.scale = 1;
      return;
    }
    if (!Number.isFinite(this.orbitRadius) || this.orbitRadius <= 0) {
      this.scale = 1;
      return;
    }
    this.scale = Math.max(0.25, this.orbitRadius / baseOrbit);
  }

  _buildObstacles() {
    if (!Number.isFinite(this.orbitRadius) || this.orbitRadius <= 0) {
      this.obstacles = [];
      return;
    }
    const spikeCfg = STAGE2_PROLOG?.spike ?? {};
    const baseLength = typeof spikeCfg.length === 'number' ? spikeCfg.length : 37.5;
    const baseWidth = typeof spikeCfg.width === 'number' ? spikeCfg.width : 24;
    const color = typeof spikeCfg.color === 'string' ? spikeCfg.color : '#ff2d2d';
    this.initialLength = baseLength * this.scale;
    this.baseWidth = baseWidth * this.scale;
    this.initialRadius = this.orbitRadius;
    const inset = Math.max(0, Math.min(this.targetInsetPx, this.orbitRadius));
    this.targetBaseRadius = Math.max(0, this.orbitRadius - inset);

    const rotationRad = this._resolveRotationAngle();
    const baseAngle = -Math.PI / 2;
    const params = {
      radius: this.initialRadius,
      baseWidth: this.baseWidth,
      length: this.initialLength,
      color,
      pointOutward: true,
    };
    const primary = new Stage2PrologObstacle({ ...params, angle: baseAngle + rotationRad });
    const secondary = new Stage2PrologObstacle({ ...params, angle: baseAngle - rotationRad });
    const maskRadius = Number.isFinite(this.orbitRadius) ? this.orbitRadius : null;
    primary.setMaskRadius(maskRadius);
    secondary.setMaskRadius(maskRadius);
    primary.ignoreCollision = false;
    secondary.ignoreCollision = false;
    this.obstacles = [primary, secondary];
  }

  _applyRetractProgress(progress) {
    this.currentProgress = clamp01(progress);
    if (!Array.isArray(this.obstacles) || this.obstacles.length === 0) return;
    const eased = this.currentProgress;
    const radiusDelta = this.initialRadius - this.targetBaseRadius;
    const baseRadius = this.initialRadius - radiusDelta * eased;
    const lengthMagnitude = Math.max(0, this.initialLength * (1 - eased));
    const directedLength = -lengthMagnitude;
    const disableCollision = lengthMagnitude <= this.disableCollisionThresholdPx;
    for (const obstacle of this.obstacles) {
      if (!obstacle) continue;
      obstacle.radius = baseRadius;
      obstacle.length = directedLength;
      obstacle.ignoreCollision = disableCollision;
    }
  }

  _resolveRotationAngle() {
    if (Number.isFinite(STAGE2_PROLOG?.rotationAngleRad)) {
      return STAGE2_PROLOG.rotationAngleRad;
    }
    const deg = Number.isFinite(STAGE2_PROLOG?.rotationAngleDeg)
      ? STAGE2_PROLOG.rotationAngleDeg
      : 90;
    return (deg * Math.PI) / 180;
  }
}

export class StageAllClear extends StageManager {
  constructor({ effectDurationSec = Number.POSITIVE_INFINITY } = {}) {
    super({
      phases: [],
      fadeFrom: '#000000',
      fadeTo: '#000000',
      fadeDelaySec: 0,
      fadeDurationSec: 0,
      hideScoreDurationSec: 0,
    });
    this.effectDurationSec = Number.isFinite(effectDurationSec) && effectDurationSec > 0
      ? effectDurationSec
      : Number.POSITIVE_INFINITY;
    this._initialized = false;
    this._completed = false;
    this.spawnEnabled = false;
    this.snowEnabled = false;
    const effectConfig = STAGE_ALL_CLEAR ?? {};
    this.spikeDisplay = new StageAllClearSpikeDisplay({ config: effectConfig });
    this.overlay = new StageAllClearOverlay({
      fade: effectConfig?.fade,
      message: effectConfig?.message,
      prompt: effectConfig?.prompt,
    });
  }

  update(secondsElapsed = 0) {
    const elapsed = Math.max(0, Number.isFinite(secondsElapsed) ? secondsElapsed : 0);
    this.totalElapsed = elapsed;
    const wasInitialized = this._initialized;
    if (!wasInitialized) {
      this._initialized = true;
      this.changed = true;
    } else {
      this.changed = false;
    }
    if (Number.isFinite(this.effectDurationSec) && this.effectDurationSec > 0) {
      this._completed = elapsed >= this.effectDurationSec;
    } else {
      this._completed = false;
    }
  }

  getTotalDuration() {
    return 0;
  }

  isFinished() {
    return this._completed;
  }

  hasFadeCompleted() {
    return this._completed;
  }

  canSpawn() {
    return false;
  }

  isSnowEnabled() {
    return false;
  }

  shouldHideScore() {
    return true;
  }

  getBackgroundColor() {
    return '#000000';
  }

  startProlog(geometry) {
    if (this.spikeDisplay) {
      this.spikeDisplay.setConfig(STAGE_ALL_CLEAR ?? {});
      this.spikeDisplay.start(geometry);
    }
    if (this.overlay) {
      this.overlay.configure({
        fade: STAGE_ALL_CLEAR?.fade,
        message: STAGE_ALL_CLEAR?.message,
        prompt: STAGE_ALL_CLEAR?.prompt,
      });
      this.overlay.reset();
    }
  }

  updateProlog(dtSeconds) {
    if (this.spikeDisplay) {
      this.spikeDisplay.update(dtSeconds);
    }
    if (this.overlay) {
      this.overlay.update(dtSeconds);
    }
  }

  drawProlog(ctx) {
    if (this.spikeDisplay && typeof this.spikeDisplay.draw === 'function') {
      this.spikeDisplay.draw(ctx);
    }
    if (this.overlay && typeof this.overlay.draw === 'function') {
      this.overlay.draw(ctx);
    }
  }

  getPrologObstacles() {
    return this.spikeDisplay ? this.spikeDisplay.getObstacles() : [];
  }

  isPrologActive() {
    return false;
  }

  canAcceptContinue() {
    if (!this.overlay || typeof this.overlay.isPromptInteractive !== 'function') return false;
    return this.overlay.isPromptInteractive();
  }

  updateViewport(geometry = {}) {
    if (this.spikeDisplay && typeof this.spikeDisplay.updateViewport === 'function') {
      this.spikeDisplay.updateViewport(geometry);
    }
  }
}

function clamp01(value) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function clamp(value, min, max) {
  const normalized = Number.isFinite(value) ? value : 0;
  const hasMin = Number.isFinite(min);
  const hasMax = Number.isFinite(max);
  const lower = hasMin && hasMax && min > max ? max : min;
  const upper = hasMin && hasMax && min > max ? min : max;
  let result = normalized;
  if (Number.isFinite(lower)) result = Math.max(lower, result);
  if (Number.isFinite(upper)) result = Math.min(upper, result);
  return result;
}

function resolveNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function resolvePositive(value, fallback) {
  const num = resolveNumber(value, undefined);
  if (Number.isFinite(num) && num > 0) return num;
  return fallback;
}

function parseHexColor(hex) {
  if (typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return { r: 0, g: 0, b: 0 };
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return { r: 0, g: 0, b: 0 };
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function colorWithAlpha(hex, alpha) {
  const { r, g, b } = parseHexColor(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
}

function drawTextBlock({
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  returnMetrics = false,
}) {
  if (!ctx || text == null) return null;
  const paragraphs = String(text).split(/\n/g);
  const lines = [];
  for (let i = 0; i < paragraphs.length; i += 1) {
    const paragraph = paragraphs[i];
    const words = paragraph.trim().length ? paragraph.trim().split(/\s+/g) : [];
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const testLine = line.length ? `${line} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line.length) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line.length) lines.push(line);
  }

  const totalHeight = lineHeight * (lines.length - 1);
  const startY = y - totalHeight / 2;
  let offsetY = 0;
  let lastBaseline = startY;
  for (const content of lines) {
    ctx.fillText(content, x, startY + offsetY);
    lastBaseline = startY + offsetY;
    offsetY += lineHeight;
  }
  if (!returnMetrics) return null;
  return {
    lastBaseline,
    totalHeight,
    lines: lines.length,
  };
}

function resolveFontString(font, fallback) {
  if (typeof font === 'string' && font.trim().length) return font.trim();
  if (typeof fallback === 'string' && fallback.trim().length) return fallback.trim();
  return '16px sans-serif';
}

function createFontSpec(font, { minPx, maxPx } = {}) {
  const resolvedFont = resolveFontString(font);
  const match = resolvedFont.match(/(\d+(?:\.\d+)?)px\b/);
  const sizePx = match ? Number.parseFloat(match[1]) : null;
  const start = match ? match.index : -1;
  const end = match ? start + match[0].length : -1;
  return {
    original: resolvedFont,
    sizePx: Number.isFinite(sizePx) ? sizePx : null,
    prefix: start >= 0 ? resolvedFont.slice(0, start) : '',
    suffix: end >= 0 ? resolvedFont.slice(end) : '',
    minPx: Number.isFinite(minPx) && minPx > 0 ? minPx : null,
    maxPx: Number.isFinite(maxPx) && maxPx > 0 ? maxPx : null,
  };
}
