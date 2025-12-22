import { SCORE, CANVAS, ORBIT, PLAYER, SPAWN, OBSTACLE, PARTICLES, RHYTHM, SNOW, EXTRA_STAGE, STAGE2_PROLOG, STAGE3_PROLOG, CONTROLS, UI, AUDIO, EFFECTS, ADS, PLAY_GAMES } from './Config.js';

const deepCopy = (o) => JSON.parse(JSON.stringify(o));

export const SCORE_DEFAULTS = deepCopy(SCORE);
export const CANVAS_DEFAULTS = deepCopy(CANVAS);
export const ORBIT_DEFAULTS = deepCopy(ORBIT);
export const PLAYER_DEFAULTS = deepCopy(PLAYER);
export const SPAWN_DEFAULTS = deepCopy(SPAWN);
export const OBSTACLE_DEFAULTS = deepCopy(OBSTACLE);
export const PARTICLES_DEFAULTS = deepCopy(PARTICLES);
export const RHYTHM_DEFAULTS = deepCopy(RHYTHM);
export const SNOW_DEFAULTS = deepCopy(SNOW);
export const EXTRA_STAGE_DEFAULTS = deepCopy(EXTRA_STAGE);
export const STAGE2_PROLOG_DEFAULTS = deepCopy(STAGE2_PROLOG);
export const STAGE3_PROLOG_DEFAULTS = deepCopy(STAGE3_PROLOG);
export const CONTROLS_DEFAULTS = deepCopy(CONTROLS);
export const UI_DEFAULTS = deepCopy(UI);
export const AUDIO_DEFAULTS = deepCopy(AUDIO);
export const EFFECTS_DEFAULTS = deepCopy(EFFECTS);
export const ADS_DEFAULTS = deepCopy(ADS);
export const PLAY_GAMES_DEFAULTS = deepCopy(PLAY_GAMES);

export function resetAllConfigToDefaults() {
  try { Object.assign(SCORE, deepCopy(SCORE_DEFAULTS)); } catch (_) {}
  try { Object.assign(CANVAS, deepCopy(CANVAS_DEFAULTS)); } catch (_) {}
  try { Object.assign(ORBIT, deepCopy(ORBIT_DEFAULTS)); } catch (_) {}
  try { Object.assign(PLAYER, deepCopy(PLAYER_DEFAULTS)); } catch (_) {}
  try { Object.assign(SPAWN, deepCopy(SPAWN_DEFAULTS)); } catch (_) {}
  try { Object.assign(OBSTACLE, deepCopy(OBSTACLE_DEFAULTS)); } catch (_) {}
  try { Object.assign(PARTICLES, deepCopy(PARTICLES_DEFAULTS)); } catch (_) {}
  try { Object.assign(RHYTHM, deepCopy(RHYTHM_DEFAULTS)); } catch (_) {}
  try { Object.assign(SNOW, deepCopy(SNOW_DEFAULTS)); } catch (_) {}
  try { Object.assign(EXTRA_STAGE, deepCopy(EXTRA_STAGE_DEFAULTS)); } catch (_) {}
  try { Object.assign(STAGE2_PROLOG, deepCopy(STAGE2_PROLOG_DEFAULTS)); } catch (_) {}
  try { Object.assign(STAGE3_PROLOG, deepCopy(STAGE3_PROLOG_DEFAULTS)); } catch (_) {}
  try { Object.assign(CONTROLS, deepCopy(CONTROLS_DEFAULTS)); } catch (_) {}
  try { Object.assign(UI, deepCopy(UI_DEFAULTS)); } catch (_) {}
  try { Object.assign(AUDIO, deepCopy(AUDIO_DEFAULTS)); } catch (_) {}
  try { Object.assign(EFFECTS, deepCopy(EFFECTS_DEFAULTS)); } catch (_) {}
  try { Object.assign(ADS, deepCopy(ADS_DEFAULTS)); } catch (_) {}
  try { Object.assign(PLAY_GAMES, deepCopy(PLAY_GAMES_DEFAULTS)); } catch (_) {}
}
