// AdManager centralizes AdMob usage and shields gameplay from platform/plugin availability.
const INTERSTITIAL_EVENTS = {
  LOADED: 'interstitialAdLoaded',
  DISMISSED: 'interstitialAdDismissed',
  FAILED_TO_LOAD: 'interstitialAdFailedToLoad',
  FAILED_TO_SHOW: 'interstitialAdFailedToShow',
};

const GAMES_PLAYED_STORAGE_KEY = 'admob_games_played';

export class AdManager {
  constructor({ config } = {}) {
    this.updateConfig(config);
    this.gamesPlayed = this._readGamesPlayed();
    this.initialized = false;
    this.initializing = null;
    this.interstitialReady = false;
    this.loadingInterstitial = false;
    this.plugin = null;
    this.listeners = [];
  }

  updateConfig(config) {
    this.config = config || {};
  }

  preload() {
    // Fire-and-forget warmup so the first eligible trigger does not stall gameplay.
    this._ensurePrepared();
  }

  async handleGameCompleted() {
    const count = this._incrementGamesPlayed();
    if (!this._shouldShowAd(count)) return;
    try {
      await this._showInterstitial();
    } catch (err) {
      console.warn('[AdManager] Failed to show interstitial', err);
    }
  }

  async _showInterstitial() {
    if (!this._isEnabled()) return false;
    const plugin = await this._getPlugin();
    if (!plugin) return false;
    const initialized = await this._ensureInitialized(plugin);
    if (!initialized) return false;

    if (!this.interstitialReady) {
      const prepared = await this._prepareInterstitial(plugin);
      if (!prepared) return false;
    }

    try {
      await plugin.showInterstitial();
      this.interstitialReady = false;
      this._ensurePrepared(); // Prepare the next one in the background.
      return true;
    } catch (err) {
      console.warn('[AdManager] showInterstitial error', err);
      this.interstitialReady = false;
      return false;
    }
  }

  async _ensurePrepared() {
    if (!this._isEnabled()) return false;
    const plugin = await this._getPlugin();
    if (!plugin) return false;
    const initialized = await this._ensureInitialized(plugin);
    if (!initialized || this.interstitialReady || this.loadingInterstitial) return initialized && this.interstitialReady;

    return this._prepareInterstitial(plugin);
  }

  async _prepareInterstitial(plugin) {
    if (!plugin || this.loadingInterstitial) return false;
    this.loadingInterstitial = true;
    try {
      const adId = this._resolveAdUnitId();
      if (!adId) return false;
      await plugin.prepareInterstitial({
        adId,
        isTesting: this.config?.useTestAds !== false,
        immersiveMode: true,
      });
      this.interstitialReady = true;
      return true;
    } catch (err) {
      console.warn('[AdManager] prepareInterstitial error', err);
      this.interstitialReady = false;
      return false;
    } finally {
      this.loadingInterstitial = false;
    }
  }

  async _ensureInitialized(plugin) {
    if (this.initialized) return true;
    if (!this.initializing) {
      this.initializing = this._initialize(plugin);
    }
    const result = await this.initializing;
    this.initializing = null;
    return result;
  }

  async _initialize(plugin) {
    if (!plugin) return false;
    try {
      await plugin.initialize({
        initializeForTesting: this.config?.initializeForTesting !== false,
        testingDevices: this.config?.testingDevices || [],
        tagForChildDirectedTreatment: this.config?.tagForChildDirectedTreatment,
        tagForUnderAgeOfConsent: this.config?.tagForUnderAgeOfConsent,
        maxAdContentRating: this.config?.maxAdContentRating,
      });
      this._attachListeners(plugin);
      this.initialized = true;
      return true;
    } catch (err) {
      console.warn('[AdManager] initialize failed', err);
      this.initialized = false;
      return false;
    }
  }

  _attachListeners(plugin) {
    this._removeListeners();
    if (!plugin?.addListener) return;

    const events = [
      [INTERSTITIAL_EVENTS.LOADED, () => { this.interstitialReady = true; }],
      [INTERSTITIAL_EVENTS.DISMISSED, () => { this.interstitialReady = false; this._ensurePrepared(); }],
      [INTERSTITIAL_EVENTS.FAILED_TO_LOAD, () => { this.interstitialReady = false; }],
      [INTERSTITIAL_EVENTS.FAILED_TO_SHOW, () => { this.interstitialReady = false; }],
    ];

    events.forEach(([event, handler]) => {
      try {
        plugin.addListener(event, handler).then((listener) => {
          if (listener && typeof listener.remove === 'function') {
            this.listeners.push(listener);
          }
        }).catch(() => {});
      } catch (_) {
        // ignore listener wiring errors
      }
    });
  }

  _removeListeners() {
    this.listeners.forEach((listener) => {
      try { listener.remove(); } catch (_) {}
    });
    this.listeners = [];
  }

  _isEnabled() {
    return this.config?.enabled !== false
      && this._isNativePlatform()
      && !!this._resolveAdUnitId();
  }

  _isNativePlatform() {
    const cap = this._getCapacitor();
    if (!cap) return false;
    if (typeof cap.isNativePlatform === 'function') {
      return cap.isNativePlatform();
    }
    const platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : null;
    return platform === 'android' || platform === 'ios';
  }

  _getCapacitor() {
    if (typeof Capacitor !== 'undefined') return Capacitor;
    if (typeof window !== 'undefined' && window.Capacitor) return window.Capacitor;
    if (typeof globalThis !== 'undefined' && globalThis.Capacitor) return globalThis.Capacitor;
    return null;
  }

  async _getPlugin() {
    if (this.plugin) return this.plugin;
    const cap = this._getCapacitor();
    if (!cap?.Plugins?.AdMob) return null;
    this.plugin = cap.Plugins.AdMob;
    return this.plugin;
  }

  _resolveAdUnitId() {
    const adId = this.config?.interstitialAdUnitId;
    return typeof adId === 'string' && adId.trim().length > 0 ? adId.trim() : null;
  }

  _shouldShowAd(count) {
    const every = Number(this.config?.showEveryNGames);
    if (!Number.isFinite(every) || every <= 0) return false;
    return count % every === 0;
  }

  _readGamesPlayed() {
    try {
      const stored = localStorage.getItem(GAMES_PLAYED_STORAGE_KEY);
      const parsed = stored ? parseInt(stored, 10) : 0;
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch (_) {
      return 0;
    }
  }

  _persistGamesPlayed() {
    try {
      localStorage.setItem(GAMES_PLAYED_STORAGE_KEY, String(this.gamesPlayed));
    } catch (_) {
      // ignore storage errors
    }
  }

  _incrementGamesPlayed() {
    const next = Number(this.gamesPlayed ?? 0) + 1;
    this.gamesPlayed = next;
    this._persistGamesPlayed();
    return next;
  }
}
