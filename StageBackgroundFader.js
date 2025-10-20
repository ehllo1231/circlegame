const DEFAULT_COLOR = '#000000';

export class StageBackgroundFader {
  constructor({ elements = [], initialColor = DEFAULT_COLOR, defaultDurationSec = 0.6 } = {}) {
    this.elements = Array.isArray(elements) ? elements.filter(Boolean) : [];
    this.defaultDurationSec = defaultDurationSec;
    this._animationId = null;
    this._startTime = 0;
    this._durationMs = 0;
    this._startColor = this._parseColor(initialColor);
    this._currentColor = { ...this._startColor };
    this._targetColor = { ...this._startColor };
    this.setColorImmediate(initialColor);
  }

  setElements(elements = []) {
    this.elements = Array.isArray(elements) ? elements.filter(Boolean) : [];
    this._applyColor(this._currentColor);
  }

  setDefaultDuration(durationSec) {
    if (typeof durationSec === 'number' && durationSec >= 0) {
      this.defaultDurationSec = durationSec;
    }
  }

  setColorImmediate(color) {
    this._cancelAnimation();
    const parsed = this._parseColor(color);
    this._startColor = { ...parsed };
    this._currentColor = { ...parsed };
    this._targetColor = { ...parsed };
    this._applyColor(parsed);
  }

  fadeTo(color, durationSec) {
    const parsedTarget = this._parseColor(color);
    if (!parsedTarget) return;
    if (this._colorsEqual(parsedTarget, this._currentColor)) {
      this.setColorImmediate(parsedTarget);
      return;
    }

    this._startColor = { ...this._currentColor };
    this._targetColor = { ...parsedTarget };
    this._durationMs = Math.max(0, (typeof durationSec === 'number' ? durationSec : this.defaultDurationSec) * 1000);
    if (this._durationMs === 0) {
      this.setColorImmediate(parsedTarget);
      return;
    }
    this._startTime = performance.now();
    this._cancelAnimation();
    this._animationId = requestAnimationFrame((now) => this._step(now));
  }

  _step(now) {
    const elapsed = now - this._startTime;
    const t = this._durationMs > 0 ? Math.min(1, elapsed / this._durationMs) : 1;
    const current = {
      r: this._lerp(this._startColor.r, this._targetColor.r, t),
      g: this._lerp(this._startColor.g, this._targetColor.g, t),
      b: this._lerp(this._startColor.b, this._targetColor.b, t),
    };
    this._currentColor = current;
    this._applyColor(current);

    if (t < 1) {
      this._animationId = requestAnimationFrame((time) => this._step(time));
    } else {
      this._animationId = null;
    }
  }

  _applyColor({ r, g, b }) {
    const css = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    for (const el of this.elements) {
      if (el && el.style) {
        el.style.backgroundColor = css;
      }
    }
  }

  _parseColor(color) {
    if (color && typeof color === 'object' && Number.isFinite(color.r) && Number.isFinite(color.g) && Number.isFinite(color.b)) {
      return { r: color.r, g: color.g, b: color.b };
    }
    if (typeof color === 'string') {
      const trimmed = color.trim();
      if (trimmed.startsWith('#')) {
        return this._parseHex(trimmed);
      }
      if (trimmed.startsWith('rgb')) {
        return this._parseRgbFunction(trimmed);
      }
    }
    return this._parseHex(DEFAULT_COLOR);
  }

  _parseHex(hex) {
    let value = hex.replace('#', '').trim();
    if (value.length === 3) {
      value = value.split('').map((c) => c + c).join('');
    }
    if (value.length !== 6) return { r: 0, g: 0, b: 0 };
    const num = parseInt(value, 16);
    if (Number.isNaN(num)) return { r: 0, g: 0, b: 0 };
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  _parseRgbFunction(value) {
    const match = value.match(/rgba?\(([^)]+)\)/i);
    if (!match) return { r: 0, g: 0, b: 0 };
    const [r, g, b] = match[1].split(',').map((part) => parseFloat(part.trim())).slice(0, 3);
    return {
      r: Number.isFinite(r) ? r : 0,
      g: Number.isFinite(g) ? g : 0,
      b: Number.isFinite(b) ? b : 0,
    };
  }

  _colorsEqual(a, b) {
    return Math.round(a.r) === Math.round(b.r)
      && Math.round(a.g) === Math.round(b.g)
      && Math.round(a.b) === Math.round(b.b);
  }

  _lerp(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  _cancelAnimation() {
    if (this._animationId != null) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
  }
}
