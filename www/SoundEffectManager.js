const clampVolume = (value) => {
  if (!Number.isFinite(value)) return 1;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const AudioContextClass = typeof window !== 'undefined'
  ? (window.AudioContext || window.webkitAudioContext)
  : null;

export class SoundEffectManager {
  constructor({ config = {} } = {}) {
    this.config = {};
    this.buffers = new Map();
    this.loadingBuffers = new Map();
    this.htmlPools = new Map();
    this.audioContext = null;
    this.useWebAudio = !!AudioContextClass;
    this._pausedHtmlAudio = new Map();
    this.updateConfig(config);
  }

  play(name) {
    if (!name) return;
    const cfg = this.config?.[name];
    if (!cfg || !cfg.src) return;
    const key = this._normalizeKey(name);

    if (this.useWebAudio) {
      const ctx = this._ensureAudioContext();
      if (ctx) {
        const buffer = this.buffers.get(key);
        if (buffer) {
          if (ctx.state === 'suspended') {
            try { ctx.resume(); } catch (_) { /* ignore */ }
          }
          const gain = ctx.createGain();
          gain.gain.value = clampVolume(cfg.volume ?? 1);
          gain.connect(ctx.destination);

          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(gain);
          source.start(0);
          source.addEventListener('ended', () => {
            try { source.disconnect(); } catch (_) { /* ignore */ }
            try { gain.disconnect(); } catch (_) { /* ignore */ }
          }, { once: true });
          return;
        }
      }
    }

    const audio = this._getHtmlAudioInstance(key, cfg);
    if (!audio) return;
    audio.volume = clampVolume(cfg.volume ?? audio.volume ?? 1);
    try { audio.currentTime = 0; } catch (_) { /* ignore */ }
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }

  updateConfig(config = {}) {
    const newConfig = config || {};
    this.config = newConfig;

    const keys = Object.keys(newConfig);
    const normalizedKeys = new Set(keys.map((key) => this._normalizeKey(key)));

    if (this.useWebAudio) {
      for (const key of keys) {
        this._ensureBuffer(key, newConfig[key]);
      }
    }

    for (const key of keys) {
      this._ensureHtmlAudio(key, newConfig[key]);
    }

    for (const key of Array.from(this.buffers.keys())) {
      if (!normalizedKeys.has(key)) this.buffers.delete(key);
    }
    for (const key of Array.from(this.loadingBuffers.keys())) {
      if (!normalizedKeys.has(key)) this.loadingBuffers.delete(key);
    }
    for (const key of Array.from(this.htmlPools.keys())) {
      if (!normalizedKeys.has(key)) this.htmlPools.delete(key);
    }
    this._pausedHtmlAudio.clear();
  }

  pauseAll() {
    if (this.useWebAudio && this.audioContext && this.audioContext.state === 'running') {
      try { this.audioContext.suspend(); } catch (_) { /* ignore */ }
    }
    this._pausedHtmlAudio.clear();
    for (const pool of this.htmlPools.values()) {
      if (!Array.isArray(pool)) continue;
      for (const audio of pool) {
        if (!audio || audio.paused) continue;
        try {
          this._pausedHtmlAudio.set(audio, audio.currentTime || 0);
          audio.pause();
        } catch (_) { /* ignore */ }
      }
    }
  }

  resumeAll() {
    if (this.useWebAudio && this.audioContext && this.audioContext.state === 'suspended') {
      try { this.audioContext.resume(); } catch (_) { /* ignore */ }
    }
    for (const [audio, time] of this._pausedHtmlAudio.entries()) {
      if (!audio) continue;
      try {
        if (Number.isFinite(time)) {
          audio.currentTime = Math.max(0, time);
        }
      } catch (_) { /* ignore */ }
      const result = audio.play();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    }
    this._pausedHtmlAudio.clear();
  }

  _ensureAudioContext() {
    if (!this.useWebAudio) return null;
    if (this.audioContext) return this.audioContext;
    try {
      this.audioContext = new AudioContextClass();
    } catch (_) {
      this.audioContext = null;
    }
    return this.audioContext;
  }

  _ensureBuffer(name, cfg) {
    const key = this._normalizeKey(name);
    if (!cfg || !cfg.src) return;
    if (this.buffers.has(key) || this.loadingBuffers.has(key)) return;
    const ctx = this._ensureAudioContext();
    if (!ctx) return;

    const loadPromise = fetch(cfg.src)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load effect: ${cfg.src}`);
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => new Promise((resolve, reject) => {
        const decodeResult = ctx.decodeAudioData(
          arrayBuffer,
          (buffer) => resolve(buffer),
          (error) => reject(error),
        );
        if (decodeResult && typeof decodeResult.then === 'function') {
          decodeResult.then(resolve).catch(reject);
        }
      }))
      .then((buffer) => {
        this.buffers.set(key, buffer);
        this.loadingBuffers.delete(key);
        return buffer;
      })
      .catch(() => {
        this.loadingBuffers.delete(key);
      });

    this.loadingBuffers.set(key, loadPromise);
  }

  _ensureHtmlAudio(name, cfg) {
    const key = this._normalizeKey(name);
    if (!cfg || !cfg.src) return;
    if (this.htmlPools.has(key)) return;
    const poolSize = Math.max(1, Math.round(cfg.poolSize ?? 3));
    const pool = [];
    for (let i = 0; i < poolSize; i += 1) {
      pool.push(this._createHtmlAudio(cfg));
    }
    this.htmlPools.set(key, pool);
  }

  _getHtmlAudioInstance(key, cfg) {
    if (!this.htmlPools.has(key)) {
      this._ensureHtmlAudio(key, cfg);
    }
    const pool = this.htmlPools.get(key);
    if (!pool || pool.length === 0) return null;
    for (const audio of pool) {
      if (audio.paused || audio.ended) {
        return audio;
      }
    }
    const extra = this._createHtmlAudio(cfg);
    pool.push(extra);
    return extra;
  }

  _createHtmlAudio(cfg) {
    const audio = new Audio(cfg.src);
    audio.preload = cfg.preload ?? 'auto';
    audio.volume = clampVolume(cfg.volume ?? 1);
    if (audio.preload === 'auto') {
      try { audio.load(); } catch (_) { /* ignore */ }
    }
    return audio;
  }

  _normalizeKey(name) {
    return typeof name === 'string' ? name : String(name);
  }
}
