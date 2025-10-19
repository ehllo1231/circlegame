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
  angularSpeed: 0.04, // radians per frame (2x)
};

export const SPAWN = {
  baseInterval: 30,
  accelEverySeconds: 60,
  accelFactor: 1,
  // Probabilities (weights) for spawning 1..N spikes (N up to 8)
  // Index 0->1 spike, 1->2 spikes, ..., 7->8 spikes
  multiCountWeights: [0.05, 0.07, 0.1, 0.2, 0.2, 0.2, 0.13, 0.05],
  // Angle correction: only compare against the most recent spawn batch
  // Threshold for correction (in degrees) on the remainder domain (0..360/N)
  correctionThresholdDeg: 10,
  // Maximum random attempts per spawn batch before giving up on separation
  correctionMaxRetries: 1000,
  // Minimum spawn interval cap (frames)
  minInterval: 5,
};

export const OBSTACLE = {
  baseWidth: 24, // 1.5x of 16
  length: 37.5,  // 1.5x of 25
  baseSpeed: 6,          // 2x
  speedMinMul: 0.9,
  speedMaxMul: 1.9,
  // Acceleration toward center (px/frame^2)
  gravityAcc: 0.0,
  // Constant-speed mode: all spikes fall at the same speed (no acceleration)
  constantSpeedEnabled: true,
  constantSpeed: 9,
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

// Rhythm pulse effect configuration
export const RHYTHM = {
  // Frames at 60fps between pulses. Set smaller for faster rhythm.
  // 180 ~ 3s, 90 ~ 1.5s (2x faster than 180)
  intervalFrames: 60,
  // Scale decrease per 60fps frame
  scaleDecrease: 0.005,
  // Max scale applied on pulse
  maxScale: 1.1,
};

// Background snow effect (time-based trigger)
// Speeds are per 60fps frame to match dt factor
export const SNOW = {
  enabledAfterSeconds: 3,     // start snow after N seconds
  alpha: 0.16,                 // flake transparency (similar to SCORE.centerAlpha)
  // average flakes spawned per minute (use this instead of per-second)
  spawnPerMin: 60,             // e.g., 30 flakes per minute
  size: { min: 3, max: 5 },    // px radius
  fallSpeed: { min: 0.8, max: 2.2 }, // px per 60fps frame
  wind: {
    baseX: 0.12,               // horizontal drift (px/frame)
    oscAmp: 0.10,              // oscillation amplitude (px/frame)
    oscPeriodSec: 6,           // wind oscillation period (seconds)
  },
};

export const STAGE2_PROLOG = {
  durationSec: 2,
  radiusStartFactor: 0.6,
  radiusEndFactor: 1.0,
  spike: {
    length: 37.5,
    width: 24,
    color: '#ff2d2d',
  },
};

// Input controls mapping (customize key codes here)
export const CONTROLS = {
  startOn: ['Space'],
  restartOn: ['Space'],
  // Reverse direction only with Space 
  reverseOn: ['Space'],
  // If true, any alphabetic key (A–Z) also reverses direction during gameplay
  reverseUseAlphabet: true,
};
