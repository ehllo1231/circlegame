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
    this.reverseAnyKey = false; // deprecated; kept for backward compatibility
  }

  bindHandlers({ onStart, onRestart, onReverse, onDebugToggle, onFastForward }) {
    this.handlers.start = onStart || null;
    this.handlers.restart = onRestart || null;
    this.handlers.reverse = onReverse || null;
    this.handlers.debugToggle = onDebugToggle || null;
    this.handlers.fastForward = onFastForward || null;
  }

  attach() {
    document.addEventListener('keydown', this._onKeyDown);
  }

  detach() {
    document.removeEventListener('keydown', this._onKeyDown);
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
