import { StageManager, StagePhase } from './StageManager.js';
import { SPAWN, SNOW } from './Config.js';

class Stage2Phase1 extends StagePhase {
  constructor() {
    super({ name: 'stage2-phase1', durationSec: 12 });
  }

  onEnter() {
    SPAWN.baseInterval = 24;
    SPAWN.multiCountWeights = [0.08, 0.1, 0.15, 0.2, 0.2, 0.17, 0.07, 0.03];
    SNOW.spawnPerMin = 400;
    SNOW.fallSpeed.min = 1.2;
    SNOW.fallSpeed.max = 2.6;
    SNOW.wind.baseX = 0.4;
    SNOW.wind.oscAmp = 0.2;
  }
}

class Stage2Phase2 extends StagePhase {
  constructor() {
    super({ name: 'stage2-phase2', durationSec: 18 });
  }

  onEnter() {
    SPAWN.baseInterval = 18;
    SPAWN.multiCountWeights = [0.02, 0.04, 0.12, 0.2, 0.22, 0.2, 0.15, 0.05];
    SNOW.spawnPerMin = 1400;
    SNOW.fallSpeed.min = 2.4;
    SNOW.fallSpeed.max = 4.2;
    SNOW.wind.baseX = 1.6;
    SNOW.wind.oscAmp = 0.35;
  }
}

class Stage2Phase3 extends StagePhase {
  constructor() {
    super({ name: 'stage2-phase3', durationSec: 22 });
  }

  onEnter() {
    SPAWN.baseInterval = 14;
    SPAWN.multiCountWeights = [0.0, 0.02, 0.1, 0.18, 0.22, 0.23, 0.18, 0.07];
    SNOW.spawnPerMin = 3200;
    SNOW.fallSpeed.min = 3.5;
    SNOW.fallSpeed.max = 6.5;
    SNOW.wind.baseX = -2.4;
    SNOW.wind.oscAmp = 0.5;
  }
}

class Stage2Phase4 extends StagePhase {
  constructor() {
    super({ name: 'stage2-phase4', durationSec: 14 });
  }

  onEnter() {
    SPAWN.baseInterval = 10;
    SPAWN.multiCountWeights = [0.0, 0.01, 0.07, 0.18, 0.2, 0.24, 0.2, 0.1];
    SNOW.spawnPerMin = 7000;
    SNOW.fallSpeed.min = 6.5;
    SNOW.fallSpeed.max = 10.5;
    SNOW.wind.baseX = -5.5;
    SNOW.wind.oscAmp = 0.65;
  }
}

export class Stage2 extends StageManager {
  constructor() {
    super({
      phases: [
        new Stage2Phase1(),
        new Stage2Phase2(),
        new Stage2Phase3(),
        new Stage2Phase4(),
      ],
      fadeFrom: '#0f0020',
      fadeTo: '#200040',
      fadeDelaySec: 2,
      fadeDurationSec: 2,
      hideScoreDurationSec: 2,
    });
  }
}

export const STAGE2_PHASES = {
  Stage2Phase1,
  Stage2Phase2,
  Stage2Phase3,
  Stage2Phase4,
};
