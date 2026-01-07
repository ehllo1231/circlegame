const PLAY_GAMES_PLUGIN_ID = 'PlayGames';

export class PlayGamesService {
  constructor({ config } = {}) {
    this.config = config ?? {};
    this.leaderboards = this.config.leaderboards ?? {};
    this.enabled = this.config.enabled !== false;
    this._signedIn = false;
    this._capacitor = null;
    this._pluginProxy = null;
    this._nativeProxy = null;
  }

  _log(action, details) {
    if (typeof console === 'undefined' || typeof console.debug !== 'function') return;
    console.debug('[PlayGamesService]', action, details ?? '');
  }

  _getCapacitor() {
    if (this._capacitor) return this._capacitor;
    const cap = typeof globalThis !== 'undefined' ? globalThis.Capacitor : null;
    if (cap) {
      this._capacitor = cap;
    }
    return cap;
  }

  _getPluginProxy() {
    if (this._pluginProxy) return this._pluginProxy;
    const cap = this._getCapacitor();
    if (!cap || typeof cap.registerPlugin !== 'function') return null;
    this._pluginProxy = cap.registerPlugin(PLAY_GAMES_PLUGIN_ID);
    return this._pluginProxy;
  }

  _getNativeProxy() {
    if (this._nativeProxy) return this._nativeProxy;
    const cap = this._getCapacitor();
    if (!cap || typeof cap.nativePromise !== 'function') return null;
    this._nativeProxy = {
      signIn: (options = {}) => cap.nativePromise(PLAY_GAMES_PLUGIN_ID, 'signIn', options),
      submitScore: (options = {}) => cap.nativePromise(PLAY_GAMES_PLUGIN_ID, 'submitScore', options),
      showLeaderboard: (options = {}) => cap.nativePromise(PLAY_GAMES_PLUGIN_ID, 'showLeaderboard', options),
    };
    return this._nativeProxy;
  }

  _isUnimplemented(error) {
    if (!error) return false;
    if (error.code === 'UNIMPLEMENTED') return true;
    const message = typeof error.message === 'string' ? error.message : '';
    return message.toLowerCase().includes('not implemented');
  }

  async _invoke(method, options) {
    const plugin = this._getPluginProxy();
    if (plugin && typeof plugin[method] === 'function') {
      try {
        return await plugin[method](options);
      } catch (error) {
        if (!this._isUnimplemented(error)) {
          throw error;
        }
      }
    }
    const nativeProxy = this._getNativeProxy();
    if (nativeProxy && typeof nativeProxy[method] === 'function') {
      return await nativeProxy[method](options);
    }
    throw new Error('PlayGames plugin unavailable');
  }

  isAvailable() {
    if (!this.enabled) return false;
    const cap = this._getCapacitor();
    if (!cap) return false;
    const isNative = typeof cap.isNativePlatform === 'function'
      ? cap.isNativePlatform()
      : (cap.getPlatform?.() ?? 'web') !== 'web';
    const platform = typeof cap.getPlatform === 'function'
      ? cap.getPlatform()
      : null;
    const pluginAvailable = typeof cap.isPluginAvailable === 'function'
      ? cap.isPluginAvailable(PLAY_GAMES_PLUGIN_ID)
      : false;
    const hasNativeBridge = typeof cap.nativePromise === 'function';
    return isNative && platform === 'android' && (pluginAvailable || hasNativeBridge);
  }

  async signIn() {
    if (!this.isAvailable()) return { ok: false, reason: 'unavailable' };
    if (this._signedIn) return { ok: true };
    try {
      this._log('signIn:start', { signedIn: this._signedIn });
      const result = await this._invoke('signIn', {});
      const authenticated = !!result?.authenticated;
      this._signedIn = authenticated;
      if (authenticated) {
        this._log('signIn:success', result);
        return { ok: true };
      }
      const payload = {
        ok: false,
        reason: 'not-authenticated',
        error: result?.error ?? null,
        statusCode: result?.statusCode ?? null,
      };
      this._log('signIn:not-authenticated', payload);
      return payload;
    } catch (error) {
      const payload = { ok: false, reason: 'exception', error: error?.message ?? String(error) };
      this._log('signIn:exception', payload);
      return payload;
    }
  }

  async ensureSignedIn() {
    if (this._signedIn) return { ok: true };
    return this.signIn();
  }

  async submitScore(stageId, score) {
    if (!this.isAvailable()) return { ok: false, reason: 'unavailable' };
    const leaderboardId = this._getLeaderboardId(stageId);
    if (!leaderboardId) return { ok: false, reason: 'unknown-leaderboard' };
    if (!Number.isFinite(score)) return { ok: false, reason: 'invalid-score' };
    const authResult = await this.ensureSignedIn();
    if (!authResult?.ok) {
      const payload = { ok: false, reason: 'not-authenticated', error: authResult?.error, statusCode: authResult?.statusCode };
      this._log('submitScore:not-authenticated', { stageId, leaderboardId, payload });
      return payload;
    }
    try {
      this._log('submitScore:start', { stageId, leaderboardId, score });
      await this._invoke('submitScore', { leaderboardId, score: Math.floor(score) });
      this._log('submitScore:success', { stageId, leaderboardId });
      return { ok: true };
    } catch (error) {
      const payload = { ok: false, error: error?.message ?? String(error) };
      this._log('submitScore:exception', { stageId, leaderboardId, payload });
      return payload;
    }
  }

  async showLeaderboard(stageId) {
    if (!this.isAvailable()) return { ok: false, reason: 'unavailable' };
    const leaderboardId = this._getLeaderboardId(stageId);
    if (!leaderboardId) return { ok: false, reason: 'unknown-leaderboard' };
    const authResult = await this.ensureSignedIn();
    if (!authResult?.ok) {
      const payload = { ok: false, reason: 'not-authenticated', error: authResult?.error, statusCode: authResult?.statusCode };
      this._log('showLeaderboard:not-authenticated', { stageId, leaderboardId, payload });
      return payload;
    }
    try {
      this._log('showLeaderboard:start', { stageId, leaderboardId });
      await this._invoke('showLeaderboard', { leaderboardId });
      this._log('showLeaderboard:success', { stageId, leaderboardId });
      return { ok: true };
    } catch (error) {
      const payload = { ok: false, reason: 'show-failed', error: error?.message ?? String(error) };
      this._log('showLeaderboard:exception', { stageId, leaderboardId, payload });
      return payload;
    }
  }

  _getLeaderboardId(stageId) {
    if (!stageId) return null;
    return this.leaderboards?.[stageId] ?? null;
  }
}
