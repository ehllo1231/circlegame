import { AUDIO } from './Config.js';

export class StageAudioManager {
  constructor({ config = AUDIO } = {}) {
    this.config = config || {};
    this.audioElements = new Map();
    this.currentStageId = null;
    this._offsetIndexMap = new Map();
    this._forcedOffsets = new Map();
  }

  playStage(stageId, options = {}) {
    if (!stageId) return;
    const cfg = this.config?.[stageId];
    if (!cfg || !cfg.src) return;
    const normalizedStage = this._normalizeStage(stageId);
    if (this.currentStageId === normalizedStage) return;

    if (this.currentStageId && this.currentStageId !== normalizedStage) {
      this.stopStage(this.currentStageId);
    }

    const audio = this._getAudioElement(normalizedStage, cfg);
    if (!audio) return;

    const volume = Number(cfg.volume);
    audio.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1;
    audio.loop = cfg.loop !== false;

    const forcedOption = Number.isFinite(options?.forceOffset) ? Math.max(0, options.forceOffset) : null;
    const forcedPending = this._consumeForcedOffset(normalizedStage);
    const offset = forcedOption ?? forcedPending ?? this._resolveStartOffset(normalizedStage, cfg);
    audio.__pendingOffset = offset;
    this._setCurrentTime(audio, offset);

    this._playWithRetry(audio);
    this.currentStageId = normalizedStage;
  }

  stopStage(stageId) {
    if (!stageId) return;
    const normalizedStage = this._normalizeStage(stageId);
    const audio = this.audioElements.get(normalizedStage);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (this.currentStageId === normalizedStage) {
      this.currentStageId = null;
    }
  }

  stopAll() {
    if (this.currentStageId) {
      this.stopStage(this.currentStageId);
    }
  }

  isPlaying(stageId) {
    return this.currentStageId === this._normalizeStage(stageId);
  }

  updateConfig(config = AUDIO) {
    const newConfig = config || {};
    if (this.config && this._offsetIndexMap) {
      const currentStageIds = Object.keys(this.config);
      for (const stageId of currentStageIds) {
        if (!Object.prototype.hasOwnProperty.call(newConfig, stageId)) {
          const normalized = this._normalizeStage(stageId);
          this._offsetIndexMap.delete(normalized);
          this._forcedOffsets.delete(normalized);
        }
      }
    }
    this.config = newConfig;
  }

  _resolveStartOffset(stageId, cfg) {
    if (!cfg) return 0;
    if (Array.isArray(cfg.startOffsets) && cfg.startOffsets.length > 0) {
      const idx = this._offsetIndexMap.get(stageId) ?? 0;
      const offset = cfg.startOffsets[idx % cfg.startOffsets.length];
      this._offsetIndexMap.set(stageId, (idx + 1) % cfg.startOffsets.length);
      return Number.isFinite(offset) ? Math.max(0, offset) : 0;
    }
    const start = cfg.startTime;
    return Number.isFinite(start) ? Math.max(0, start) : 0;
  }

  _getAudioElement(stageId, cfg) {
    const normalizedStage = this._normalizeStage(stageId);
    if (this.audioElements.has(normalizedStage)) {
      const existing = this.audioElements.get(normalizedStage);
      if (cfg && cfg.src && existing.__cfgSrc !== cfg.src) {
        this.audioElements.delete(normalizedStage);
      } else {
        return existing;
      }
    }
    if (!cfg || !cfg.src) return null;
    const audio = new Audio(cfg.src);
    audio.preload = cfg.preload ?? 'auto';
    if (audio.preload === 'auto') {
      try { audio.load(); } catch (_) { /* ignore */ }
    }
    audio.__cfgSrc = cfg.src;
    this.audioElements.set(normalizedStage, audio);
    return audio;
  }

  _setCurrentTime(audio, offset) {
    if (!audio) return;
    try {
      audio.currentTime = Math.max(0, Number(offset) || 0);
    } catch (_) {
      // some browsers need metadata loaded first
    }
  }

  _normalizeStage(stageId) {
    if (typeof stageId === 'string') return stageId;
    if (stageId && stageId.id) return stageId.id;
    return stageId;
  }

  setNextOffset(stageId, offsetSeconds) {
    if (!stageId) return;
    const normalizedStage = this._normalizeStage(stageId);
    if (!Number.isFinite(offsetSeconds) || offsetSeconds < 0) {
      this._forcedOffsets.delete(normalizedStage);
      return;
    }
    this._forcedOffsets.set(normalizedStage, Math.max(0, offsetSeconds));
  }

  _consumeForcedOffset(stageId) {
    if (!stageId) return null;
    const value = this._forcedOffsets.get(stageId);
    if (value == null) return null;
    this._forcedOffsets.delete(stageId);
    return value;
  }

  _playWithRetry(audio) {
    if (!audio) return;
    this._setCurrentTime(audio, audio.__pendingOffset ?? 0);
    const playResult = audio.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {
        const onReady = () => {
          audio.removeEventListener('canplaythrough', onReady);
          audio.removeEventListener('loadeddata', onReady);
          this._setCurrentTime(audio, audio.__pendingOffset ?? 0);
          this._playWithRetry(audio);
        };
        audio.addEventListener('canplaythrough', onReady, { once: true });
        audio.addEventListener('loadeddata', onReady, { once: true });
        try { audio.load(); } catch (_) { /* ignore */ }
      });
    }
  }
}
