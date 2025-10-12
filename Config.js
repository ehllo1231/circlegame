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

export const ORBIT = {
  radius: 160,
  color: "#ffffff",
  lineWidth: 2,
};

export const PLAYER = {
  radius: 15,
};

export const SPAWN = {
  baseInterval: 90,
  accelEverySeconds: 30,
  accelFactor: 1.2,
};

export const OBSTACLE = {
  baseWidth: 24, // 1.5x of 16
  length: 37.5,  // 1.5x of 25
  baseSpeed: 3,
  speedMinMul: 0.5,
  speedMaxMul: 1.2,
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
  // Allow both Space and Arrow keys to trigger reverse for flexibility
  reverseOn: ['Space', 'ArrowLeft', 'ArrowRight'],
};
