import { SPAWN } from './Config.js';

/**
 * Base class for an individual stage phase.
 * Subclasses can override lifecycle hooks to tweak game configuration.
 */
export class StagePhase {
  constructor({ name, durationSec }) {
    if (typeof durationSec !== 'number' || durationSec <= 0) {
      throw new Error('StagePhase requires a positive durationSec');
    }
    this.name = name || 'phase';
    this.durationSec = durationSec;
  }

  getName() {
    return this.name;
  }

  getDurationSec() {
    return this.durationSec;
  }

  onEnter(/* context */) {}
  onExit(/* context */) {}
}

/**
 * Orchestrates the lifecycle of a stage made up of StagePhase instances.
 * Tracks time, phase boundaries, completion, and exposes helper methods
 * used by the rest of the game loop.
 */
export class StageManager {
  constructor({
    phases = [],
    fadeStartSec = 0,
    fadeDelaySec = 0,
    fadeDurationSec = 5,
    fadeFrom = '#000000',
    fadeTo = '#670500',
    hideScoreDurationSec = 0,
    afterStageHandlers = [],
  } = {}) {
    this.phases = Array.isArray(phases) ? phases : [];
    this.currentIndex = -1;
    this.phaseStartTime = 0;
    this.totalElapsed = 0;
    this.changed = false;
    this.spawnEnabled = true;
    this.snowEnabled = true;
    this.fadeStartSec = fadeStartSec;
    this.fadeDelaySec = Math.max(0, fadeDelaySec);
    this.fadeDurationSec = fadeDurationSec;
    this.fadeFrom = fadeFrom;
    this.fadeTo = fadeTo;
    this.hideScoreDurationSec = hideScoreDurationSec;
    this.afterStageHandlers = Array.isArray(afterStageHandlers)
      ? afterStageHandlers.filter(Boolean)
      : afterStageHandlers
        ? [afterStageHandlers]
        : [];
    this.completionTriggered = false;
  }

  update(secondsElapsed) {
    this.totalElapsed = secondsElapsed;
    const { index: newIndex, timeIntoPhase } = this._resolvePhase(secondsElapsed);

    if (newIndex !== this.currentIndex) {
      const context = this._buildContext({ secondsElapsed, timeIntoPhase });
      const previousIndex = this.currentIndex;
      if (previousIndex >= 0) {
        const previousPhase = this.phases[previousIndex];
        if (previousPhase && typeof previousPhase.onExit === 'function') {
          previousPhase.onExit(context);
        }
      }

      this.currentIndex = newIndex;
      this.changed = true;

      if (newIndex >= 0) {
        this.snowEnabled = true;
        this.spawnEnabled = true;
        this.phaseStartTime = secondsElapsed - timeIntoPhase;
        const phase = this.phases[newIndex];
        if (phase && typeof phase.onEnter === 'function') {
          phase.onEnter(context);
        }
      } else if (secondsElapsed >= this.getTotalDuration()) {
        this.spawnEnabled = false;
        this.snowEnabled = false;
        this.fadeStartSec = this.getTotalDuration();
        this._triggerCompletionHandlers(
          this._buildContext({ secondsElapsed, timeIntoPhase: 0 }),
        );
      }
    } else {
      this.changed = false;
    }
  }

  getTotalDuration() {
    return this.phases.reduce(
      (sum, phase) => sum + (typeof phase?.getDurationSec === 'function' ? phase.getDurationSec() : 0),
      0,
    );
  }

  canSpawn() {
    return this.spawnEnabled && this.currentIndex >= 0;
  }

  isSnowEnabled() {
    return this.snowEnabled;
  }

  getCurrentBaseInterval() {
    return SPAWN?.baseInterval;
  }

  getBackgroundColor() {
    const endAt = this.getTotalDuration();
    if (this.totalElapsed <= endAt) return this.fadeFrom;
    const elapsedSinceEnd = Math.max(0, this.totalElapsed - endAt);
    const delay = this.fadeDelaySec || 0;
    if (elapsedSinceEnd <= delay) return this.fadeFrom;
    const elapsedAfterDelay = elapsedSinceEnd - delay;
    const k = Math.max(
      0,
      Math.min(1, this.fadeDurationSec > 0 ? elapsedAfterDelay / this.fadeDurationSec : 1),
    );
    return lerpHex(this.fadeFrom, this.fadeTo, k);
  }

  getBackgroundOffset() {
    return { x: 0, y: 0 };
  }

  isFinished() {
    return this.totalElapsed >= this.getTotalDuration();
  }

  hasFadeCompleted() {
    if (!this.isFinished()) return false;
    const elapsedSinceEnd = Math.max(0, this.totalElapsed - this.getTotalDuration());
    const delay = this.fadeDelaySec || 0;
    if (this.fadeDurationSec <= 0) return elapsedSinceEnd >= delay;
    return elapsedSinceEnd >= (delay + this.fadeDurationSec);
  }

  shouldHideScore() {
    if (!this.hasFadeCompleted()) return false;
    if (this.hideScoreDurationSec <= 0) return false;
    const sinceEnd = this.totalElapsed - this.getTotalDuration();
    const sinceFadeDone = sinceEnd - (this.fadeDelaySec + this.fadeDurationSec);
    return sinceFadeDone >= 0 && sinceFadeDone < this.hideScoreDurationSec;
  }

  fastForwardToEnd() {
    const total = this.getTotalDuration();
    const context = this._buildContext({ secondsElapsed: total, timeIntoPhase: 0 });
    for (const phase of this.phases) {
      if (phase && typeof phase.onEnter === 'function') {
        phase.onEnter(context);
      }
      if (phase && typeof phase.onExit === 'function') {
        phase.onExit(context);
      }
    }
    this.currentIndex = -1;
    this.phaseStartTime = 0;
    this.totalElapsed = total + Math.max(0, this.fadeDelaySec) + Math.max(0, this.fadeDurationSec);
    this.spawnEnabled = false;
    this.snowEnabled = false;
    this.fadeStartSec = total;
    this.changed = true;
    this._triggerCompletionHandlers(context);
  }

  setSnowEnabled(enabled = true) {
    this.snowEnabled = !!enabled;
  }

  setSpawnEnabled(enabled = true) {
    this.spawnEnabled = !!enabled;
  }

  _resolvePhase(secondsElapsed) {
    let accumulated = 0;
    for (let i = 0; i < this.phases.length; i++) {
      const duration = this.phases[i]?.getDurationSec?.() ?? 0;
      if (secondsElapsed < accumulated + duration) {
        return { index: i, timeIntoPhase: secondsElapsed - accumulated };
      }
      accumulated += duration;
    }
    return { index: -1, timeIntoPhase: 0 };
  }

  _buildContext({ secondsElapsed, timeIntoPhase }) {
    return {
      stageManager: this,
      secondsElapsed,
      timeIntoPhase,
    };
  }

  _triggerCompletionHandlers(context) {
    if (this.completionTriggered) return;
    this.completionTriggered = true;
    for (const handler of this.afterStageHandlers) {
      if (handler && typeof handler.execute === 'function') {
        handler.execute({ ...context, stageManager: this });
      }
    }
  }
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp01(t);
}

function hexToRgb(hex) {
  const s = hex.replace('#', '');
  const v = parseInt(s, 16);
  if (s.length === 6) {
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
  }
  return { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
  const v = ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
  return `#${v.toString(16).padStart(6, '0')}`;
}

function lerpHex(h1, h2, t) {
  const a = hexToRgb(h1);
  const b = hexToRgb(h2);
  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const b2 = Math.round(lerp(a.b, b.b, t));
  return rgbToHex(r, g, b2);
}
