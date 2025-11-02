import { CONTROLS } from './Config.js';

export class InputController {
  constructor() {
    this.handlers = {
      start: null,
      restart: null,
      reverse: null,
      debugToggle: null,
      fastForward: null,
    };
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onPointerDown = null;
    this.reverseTapElement = null;
    this.reverseAnyKey = false; // deprecated; kept for backward compatibility
  }

  bindHandlers({ onStart, onRestart, onReverse, onDebugToggle, onFastForward }) {
    this.handlers.start = onStart || null;
    this.handlers.restart = onRestart || null;
    this.handlers.reverse = onReverse || null;
    this.handlers.debugToggle = onDebugToggle || null;
    this.handlers.fastForward = onFastForward || null;
  }

  attach({ reverseTapElement } = {}) {
    document.addEventListener('keydown', this._onKeyDown);
    const fallback =
      typeof window !== 'undefined'
        ? window
        : (typeof document !== 'undefined' ? document : null);
    const target = reverseTapElement && typeof reverseTapElement.addEventListener === 'function'
      ? reverseTapElement
      : fallback;
    if (!target || typeof target.addEventListener !== 'function') return;

    this.reverseTapElement = target;
    this._onPointerDown = (event) => {
      const reverseHandler = this.handlers.reverse;
      if (!reverseHandler) return;
      if (typeof event.isPrimary === 'boolean' && !event.isPrimary) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      reverseHandler();
    };
    this.reverseTapElement.addEventListener('pointerdown', this._onPointerDown);
  }

  detach() {
    document.removeEventListener('keydown', this._onKeyDown);
    if (this.reverseTapElement && this._onPointerDown) {
      this.reverseTapElement.removeEventListener('pointerdown', this._onPointerDown);
    }
    this.reverseTapElement = null;
    this._onPointerDown = null;
  }

  _onKeyDown(event) {
    const code = event.code;
    let handled = false;
    // Start
    if (CONTROLS.startOn.includes(code) && this.handlers.start) {
      this.handlers.start();
      handled = true;
    }
    // Restart
    if (CONTROLS.restartOn.includes(code) && this.handlers.restart) {
      this.handlers.restart();
      handled = true;
    }
    // Reverse direction
    const isAlpha = typeof code === 'string' && code.length === 4 && code.startsWith('Key');
    const reverseByAlpha = !!CONTROLS?.reverseUseAlphabet && isAlpha;
    const reverseByList = Array.isArray(CONTROLS?.reverseOn) && CONTROLS.reverseOn.includes(code);
    if ((reverseByAlpha || reverseByList) && this.handlers.reverse) {
      this.handlers.reverse();
      handled = true;
    }
    // Debug toggle (F6), independent of CONTROLS to avoid accidental remap
    if (code === 'F6' && this.handlers.debugToggle) {
      this.handlers.debugToggle();
      handled = true;
    }
    if (code === 'F7' && this.handlers.fastForward) {
      this.handlers.fastForward();
      handled = true;
    }
    if (handled) event.preventDefault();
  }

  setReverseAnyKey(enabled) { this.reverseAnyKey = !!enabled; }
}
