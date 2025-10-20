export class StageThemeManager {
  constructor({ themes = {}, defaultTheme = {} } = {}) {
    this._themes = new Map();
    Object.entries(themes || {}).forEach(([id, value]) => {
      if (!id || !value) return;
      this._themes.set(id, { ...value });
    });
    this._defaultTheme = {
      background: '#000000',
      fadeDurationSec: 0.6,
      ...defaultTheme,
    };
  }

  getTheme(stageId) {
    const theme = stageId && this._themes.has(stageId)
      ? this._themes.get(stageId)
      : null;
    return {
      ...this._defaultTheme,
      ...(theme || {}),
    };
  }

  getBackgroundColor(stageId) {
    return this.getTheme(stageId).background;
  }

  getFadeDuration(stageId) {
    return this.getTheme(stageId).fadeDurationSec;
  }
}
