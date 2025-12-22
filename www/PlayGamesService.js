const CapacitorGlobal = typeof globalThis !== 'undefined' ? globalThis.Capacitor : null;
const registerPlugin = CapacitorGlobal?.registerPlugin;
const PlayGames = registerPlugin
  ? registerPlugin('PlayGames')
  : {
      signIn: async () => ({ authenticated: false }),
      submitScore: async () => ({}),
      showLeaderboard: async () => ({}),
    };

export class PlayGamesService {
  constructor({ config } = {}) {
    this.config = config ?? {};
    this.leaderboards = this.config.leaderboards ?? {};
    this.enabled = this.config.enabled !== false;
    this._signedIn = false;
  }

  isAvailable() {
    if (!this.enabled || !CapacitorGlobal) return false;
    const isNative = typeof CapacitorGlobal.isNativePlatform === 'function'
      ? CapacitorGlobal.isNativePlatform()
      : (CapacitorGlobal.getPlatform?.() ?? 'web') !== 'web';
    const platform = typeof CapacitorGlobal.getPlatform === 'function'
      ? CapacitorGlobal.getPlatform()
      : null;
    const pluginAvailable = typeof CapacitorGlobal.isPluginAvailable === 'function'
      ? CapacitorGlobal.isPluginAvailable('PlayGames')
      : !!(PlayGames && typeof PlayGames.signIn === 'function');
    return isNative && platform === 'android' && pluginAvailable;
  }

  async signIn() {
    if (!this.isAvailable()) return { ok: false, reason: 'unavailable' };
    try {
      const result = await PlayGames.signIn();
      const authenticated = !!result?.authenticated;
      this._signedIn = authenticated;
      return { ok: authenticated };
    } catch (error) {
      return { ok: false, error: error?.message ?? String(error) };
    }
  }

  async ensureSignedIn() {
    if (this._signedIn) return true;
    const result = await this.signIn();
    return !!result.ok;
  }

  async submitScore(stageId, score) {
    if (!this.isAvailable()) return { ok: false, reason: 'unavailable' };
    const leaderboardId = this._getLeaderboardId(stageId);
    if (!leaderboardId) return { ok: false, reason: 'unknown-leaderboard' };
    if (!Number.isFinite(score)) return { ok: false, reason: 'invalid-score' };
    const authenticated = await this.ensureSignedIn();
    if (!authenticated) return { ok: false, reason: 'not-authenticated' };
    try {
      await PlayGames.submitScore({ leaderboardId, score: Math.floor(score) });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error?.message ?? String(error) };
    }
  }

  async showLeaderboard(stageId) {
    if (!this.isAvailable()) return { ok: false, reason: 'unavailable' };
    const leaderboardId = this._getLeaderboardId(stageId);
    if (!leaderboardId) return { ok: false, reason: 'unknown-leaderboard' };
    const authenticated = await this.ensureSignedIn();
    if (!authenticated) return { ok: false, reason: 'not-authenticated' };
    try {
      await PlayGames.showLeaderboard({ leaderboardId });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error?.message ?? String(error) };
    }
  }

  _getLeaderboardId(stageId) {
    if (!stageId) return null;
    return this.leaderboards?.[stageId] ?? null;
  }
}
