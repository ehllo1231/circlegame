import { CONTROLS } from './Config.js';

export class InputController {
  constructor() {
    this.handlers = {
      start: null,
      restart: null,
      reverse: null,
    };
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  bindHandlers({ onStart, onRestart, onReverse }) {
    this.handlers.start = onStart || null;
    this.handlers.restart = onRestart || null;
    this.handlers.reverse = onReverse || null;
  }

  attach() {
    document.addEventListener('keydown', this._onKeyDown);
  }

  detach() {
    document.removeEventListener('keydown', this._onKeyDown);
  }

  _onKeyDown(event) {
    const code = event.code;
    // Start
    if (CONTROLS.startOn.includes(code) && this.handlers.start) {
      event.preventDefault();
      this.handlers.start();
      return;
    }
    // Restart
    if (CONTROLS.restartOn.includes(code) && this.handlers.restart) {
      event.preventDefault();
      this.handlers.restart();
      return;
    }
    // Reverse direction
    if (CONTROLS.reverseOn.includes(code) && this.handlers.reverse) {
      event.preventDefault();
      this.handlers.reverse();
      return;
    }
  }
}

