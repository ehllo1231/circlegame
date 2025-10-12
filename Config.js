// Centralized configuration to improve maintainability
export const SCORE = {
  label: "\uC810\uC218",
  font: "20px Arial",
  position: { x: 20, y: 20 },
  // Centered score rendering settings
  useCenter: true,
  centerAlpha: 0.35,      // transparency for centered score
  centerScale: 0.33,      // font size = orbitRadius * centerScale
  minFontPx: 16,          // minimum font size in px
  fontFamily: 'Arial',
};

// Canvas/game viewport size (configurable)
export const CANVAS = {
  width: 900,
  height: 900,
};

export const ORBIT = {
  radius: 144,
  color: "#ffffff",
  lineWidth: 2,
};

export const PLAYER = {
  radius: 15,
  angularSpeed: 0.015, // radians per frame
};

export const SPAWN = {
  baseInterval: 90,
  accelEverySeconds: 7,
  accelFactor: 1.2,
  // Probabilities (weights) for spawning 1..4 spikes
  // e.g., [0.6, 0.25, 0.1, 0.05] means 60% 1 spike, 25% 2 spikes, etc.
  multiCountWeights: [0.25, 0.25, 0.25, 0.25],
  // Minimum angular separation in degrees across recent spawns
  minAngularSeparationDeg: 20,
  // How many recent spikes to remember for separation checks
  angleHistorySize: 32,
  // Minimum spawn interval cap (frames)
  minInterval: 15,
};

export const OBSTACLE = {
  baseWidth: 24, // 1.5x of 16
  length: 37.5,  // 1.5x of 25
  baseSpeed: 3,
  speedMinMul: 0.9,
  speedMaxMul: 1.9,
  // Acceleration toward center (px/frame^2)
  gravityAcc: 0.0,
};

export const PARTICLES = {
  count: 8,
  minSpeed: 1.2,
  maxSpeed: 3.4,
  minLife: 18,
  maxLife: 29,
  minSize: 1,
  maxSize: 3,
  damping: 0.98,
};

// Input controls mapping (customize key codes here)
export const CONTROLS = {
  startOn: ['Space'],
  restartOn: ['Space'],
  // Reverse direction only with Space (?붿껌???곕씪 醫??????쒓굅)
  reverseOn: ['Space'],
};
