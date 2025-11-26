import { EXTRA_STAGE } from './Config.js';
import { SnowEffect } from './SnowEffect.js';

const FRAME_MS = 1000 / 60;

export class ExtraStageSnowController {
  constructor({ canvas, scale = 1, manageVisibility = true, config = null } = {}) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d') ?? null;
    this.scale = scale;
    this.manageVisibility = !!manageVisibility;
    this.previewConfig = config || null;
    this.snow = new SnowEffect({ scale, config: this.previewConfig });
    this._spawnEnabled = false;
    this._animationId = null;
    this._lastTime = null;
    this._visible = false;
  }

  setScale(scale = 1) {
    const normalized = Number.isFinite(scale) && scale > 0 ? scale : 1;
    this.scale = normalized;
    if (this.snow && typeof this.snow.setScale === 'function') {
      this.snow.setScale(normalized);
    }
  }

  setCanvasSize(width, height) {
    if (!this.canvas) return;
    const w = Number(width);
    const h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h)) return;
    if (w <= 0 || h <= 0) return;
    const changed = this.canvas.width !== w || this.canvas.height !== h;
    if (!changed) return;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  start() {
    if (!this._isPreviewEnabled() || !this.ctx) return;
    if (this.previewConfig && typeof this.snow?.setConfig === 'function') {
      this.snow.setConfig(this.previewConfig);
    }
    this._spawnEnabled = true;
    this._setVisible(true);
    this._ensureLoop();
  }

  stop({ immediate = false } = {}) {
    if (!this.ctx) return;
    if (immediate) {
      this._spawnEnabled = false;
      this._cancelLoop({ clear: true, resetSnow: true, hideCanvas: true });
      return;
    }
    this._spawnEnabled = false;
    this._ensureLoop();
  }

  reset() {
    this._spawnEnabled = false;
    this._cancelLoop({ clear: true, resetSnow: true, hideCanvas: true });
  }

  setSnowConfig(config) {
    this.previewConfig = config || null;
    if (this.snow && typeof this.snow.setConfig === 'function') {
      this.snow.setConfig(this.previewConfig);
    }
  }

  _ensureLoop() {
    if (this._animationId != null) return;
    this._animationId = requestAnimationFrame((time) => this._step(time));
  }

  _step(now) {
    if (!this.canvas || !this.ctx) {
      this._cancelLoop();
      return;
    }
    const dt = this._computeDelta(now);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.snow.update(dt, this.canvas.width, this.canvas.height, {
      allowSpawn: this._spawnEnabled,
      spawnMultiplier: this._getSpawnMultiplier(),
    });
    this.snow.draw(this.ctx);

    const hasFlakes = Array.isArray(this.snow.flakes) && this.snow.flakes.length > 0;
    if (!this._spawnEnabled && !hasFlakes) {
      this._cancelLoop({ hideCanvas: true });
      return;
    }
    this._animationId = requestAnimationFrame((time) => this._step(time));
  }

  _computeDelta(now) {
    const dt = this._lastTime == null ? 1 : Math.min(3, (now - this._lastTime) / FRAME_MS);
    this._lastTime = now;
    return dt;
  }

  _cancelLoop({ clear = false, resetSnow = false, hideCanvas = false } = {}) {
    if (this._animationId != null) {
      cancelAnimationFrame(this._animationId);
    }
    this._animationId = null;
    this._lastTime = null;
    if (resetSnow && this.snow && typeof this.snow.reset === 'function') {
      this.snow.reset();
    }
    if (clear && this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (hideCanvas) {
      this._setVisible(false);
    }
  }

  _isPreviewEnabled() {
    return EXTRA_STAGE?.snowPreview?.enabled !== false;
  }

  _getSpawnMultiplier() {
    const value = EXTRA_STAGE?.snowPreview?.spawnMultiplier;
    if (!Number.isFinite(value)) return 1;
    return Math.max(0, value);
  }

  _setVisible(visible) {
    if (!this.canvas || !this.manageVisibility) return;
    const desired = !!visible;
    if (this._visible === desired) return;
    this._visible = desired;
    this.canvas.style.display = desired ? 'block' : 'none';
  }
}
