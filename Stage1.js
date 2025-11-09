import { StageManager, StagePhase } from './StageManager.js';
import { SPAWN, SNOW } from './Config.js';

class Stage1Phase1 extends StagePhase {
  constructor() {
    super({ name: 'stage1-phase1', durationSec: 10 });
  }

  onEnter() {
    SPAWN.baseInterval = 40;
    SPAWN.multiCountWeights = [0.05, 0.1, 0.1, 0.2, 0.2, 0.2, 0.1, 0.05];
    SNOW.direction = 'down';
    SNOW.spawnPerMin = 0;
    SNOW.fallSpeed.min = 0.8;
    SNOW.fallSpeed.max = 2.0;
    SNOW.wind.baseX = 0.12;
    SNOW.wind.oscAmp = 0.1;
  }
}

class Stage1Phase2 extends StagePhase {
  constructor() {
    super({ name: 'stage1-phase2', durationSec: 20 });
  }

  onEnter() {
    SPAWN.baseInterval = 28;
    SPAWN.multiCountWeights = [0.05, 0.07, 0.1, 0.2, 0.2, 0.2, 0.13, 0.05];
    SNOW.direction = 'down';
    SNOW.spawnPerMin = 300;
    SNOW.fallSpeed.min = 0.8;
    SNOW.fallSpeed.max = 2.0;
    SNOW.wind.baseX = 0.12;
    SNOW.wind.oscAmp = 0.1;
  }
}

class Stage1Phase3 extends StagePhase {
  constructor() {
    super({ name: 'stage1-phase3', durationSec: 20 });
  }

  onEnter() {
    SPAWN.baseInterval = 23;
    SPAWN.multiCountWeights = [0.0, 0.02, 0.1, 0.2, 0.2, 0.25, 0.13, 0.1];
    SNOW.direction = 'down';
    SNOW.spawnPerMin = 2000;
    SNOW.fallSpeed.min = 3;
    SNOW.fallSpeed.max = 5;
    SNOW.wind.baseX = 3;
  }
}

class Stage1Phase4 extends StagePhase {
  constructor() {
    super({ name: 'stage1-phase4', durationSec: 10 });
  }

  onEnter() {
    SPAWN.baseInterval = 19;
    SPAWN.multiCountWeights = [0.0, 0.02, 0.1, 0.2, 0.2, 0.25, 0.13, 0.1];
    SNOW.direction = 'down';
    SNOW.spawnPerMin = 6000;
    SNOW.fallSpeed.min = 7.0;
    SNOW.fallSpeed.max = 10;
    SNOW.wind.baseX = -6;
  }
}

export class Stage1 extends StageManager {
  constructor() {
    super({
      phases: [
        new Stage1Phase1(),
        new Stage1Phase2(),
        new Stage1Phase3(),
        new Stage1Phase4(),
      ],
      fadeFrom: '#000000',
      fadeTo: '#0f0020',
      fadeDelaySec: 2,
      fadeDurationSec: 2,
      hideScoreDurationSec: 2,
    });
  }
}

export const STAGE1_PHASES = {
  Stage1Phase1,
  Stage1Phase2,
  Stage1Phase3,
  Stage1Phase4,
};
