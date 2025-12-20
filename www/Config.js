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
  highlight: {
    enabled: true,
    color: '#ffd85e',
    glowColor: 'rgba(255,230,120,0.85)',
    shadowBlurPx: 22,
    minAlpha: 0.55,
    maxAlpha: 1,
    pulseSpeedHz: 2.4,
    scaleBoost: 0.08,
    durationSec: 0.5,
  },
};

// Canvas/game viewport size (configurable)
export const CANVAS = {
  width: 960,
  height: 800,
  aspectRatio: 1.5, // width / height
  // Orbit radius as a fraction of the viewport's smaller side (radius = minSide * ratio)
  orbitRadiusToMinSide: 0.14,
};

export const ORBIT = {
  radius: 144,
  color: "#ffffff",
  lineWidth: 2,
};

export const PLAYER = {
  radius: 13,
  angularSpeed: 0.042, // radians per frame (2x)
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
  baseWidth: 19.2, // 1.5x of 16
  length: 30,  // 1.5x of 25
  baseSpeed: 4.5,          // 2x
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
  intervalSeconds: 1,
  // Scale decrease per 60fps frame / per second (legacy/backward compat)
  scaleDecreasePerSecond: 0.3,
  // Max scale applied on pulse
  maxScale: 1.1,
};

// Background snow effect (time-based trigger)
// Speeds are per 60fps frame to match dt factor
export const SNOW = {
  enabledAfterSeconds: 3,     // start snow after N seconds
  alpha: 0.16,                 // flake transparency (similar to SCORE.centerAlpha)
  direction: 'down',           // 'down' or 'up'
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

export const EXTRA_STAGE = {
  labelSuffix: ' EX',
  snowPreview: {
    enabled: true,             // show snow when an EX stage is selected on the menu
    spawnMultiplier: 1,        // scales SNOW.spawnPerMin for menu preview
    snow: {                    // global default overrides for EX-preview snow
      alpha: 0.16,
      direction: 'down',
      spawnPerMin: 2000,
      size: { min: 3, max: 5 },
      fallSpeed: { min: 3, max: 5 },
      wind: {
        baseX: 3,
        oscAmp: 0.12,
        oscPeriodSec: 6,
      },
    },
    perStage: {                // stage-specific overrides for EX preview
      stage1: {
      },
      stage2: {
        direction: 'up',
      },
      stage3: {
        wind: { baseX: -3, oscAmp: 0.10, oscPeriodSec: 6 },
      },
    },
  },
};

export const STAGE2_PROLOG = {
  radiusDurationSec: 3,
  pauseBetweenSec: 1,
  rotationDurationSec: 2,
  radiusStartFactor: 0.5,
  radiusEndFactor: 1.0,
  rotationAngleDeg: 90,
  tremor: {
    enabled: true,
    amplitude: 8,
    frequencyHz: 10,
    axisScaleY: 0.4,
  },
  collisionSafeDurationSec: 1,
  dust: {
    enabled: true,
    spawnDurationSec: 3,
    spawnRatePerMin: 600,
    spawnRampDurationSec: 2,
    burstCount: 5,
    speed: { min: 100, max: 200 },
    size: { min: 1, max: 3 },
    lifeSec: { min: 2, max: 2 },
    spreadDeg: 70,
    jitterRadius: 15,
    gravity: -220,
    opacity: 0.75,
    color: '#ffffff',
  },
  spike: {
    length: 37.5,
    width: 24,
    color: '#ff2d2d',
  },
};

export const STAGE3_PROLOG = {
  backgroundFade: {
    durationSec: 1.6,
    easeExponent: 1.45,
  },
  spikeRotation: {
    enabled: true,
    totalAngleDeg: 180,
    durationSec: 4,
    easeExponent: 1,
    direction: 'clockwise',
  },
  lightning: {
    enabled: true,
    revealDurationSec: 0.1,
    holdDurationSec: 2,
    fadeOutDurationSec: 0.2,
    coreColor: '#fff6b3',
    glowColor: 'rgba(255, 211, 77, 0.55)',
    coreThickness: 5,
    branchThickness: 3,
    glowBlurPx: 14,
    strikeCount: 2,
    strikeDelaySec: 2,
    startInsetPx: 18,
    startYOffsetRangePx: 120,
    jitterPx: 28,
    jitterDecay: 0.6,
    maxDepth: 4,
    branch: {
      enabled: true,
      splitChance: 0.56,
      maxPerBolt: 10,
      maxDepth: 8,
      lengthDecay: 0.6,
    },
  },
  rotationOscillation: {
    enabled: true,
    startAfterSec: 60,
    intervalSec: 20,
    // Values < 3 are treated as multipliers of the base radius.
    values: [1, 0.8],
  },
};

export const STAGE_THEMES = {
  stage1: {
    background: '#000000',
    fadeDurationSec: 0.8,
  },
  stage2: {
    background: '#0f0020',
    fadeDurationSec: 0.8,
  },
  stage3: {
    background: '#00032e',
    fadeDurationSec: 0.8,
  },
  stageAllClear: {
    background: '#000000',
    fadeDurationSec: 0.6,
  },
};

export const STAGE_ALL_CLEAR = {
  retractDelaySec: 0.2,
  retractDurationSec: 2.1,
  retractEaseExponent: 1.25,
  disableCollisionBelowPx: 4,
  targetInsetPx: 48,
  removeAfterRetract: true,
  fade: {
    delaySec: 1,
    durationSec: 5.0,
    color: '#000000',
  },
  message: {
    text: 'Congratulations!! You cleared all stages.\n\n Thank you for playing!',
    font: '50px "Pretendard", "Noto Sans KR", Arial, sans-serif',
    color: '#ffe600',
    shadowColor: 'rgba(0, 0, 0, 0.7)',
    offsetY: 0,
    fadeInDelaySec: 0.4,
    fadeInDurationSec: 1.2,
  },
  prompt: {
    text: 'Press any key to continue',
    font: '28px "Pretendard", "Noto Sans KR", Arial, sans-serif',
    color: '#4d4d4d',
    shadowColor: 'rgba(0, 0, 0, 0.45)',
    offsetY: 100,
    delayAfterMessageSec: 2,
    fadeInDurationSec: 0.8,
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

// UI layout configuration for overlays
export const UI = {
  intro: {
    titleFontSizePx: 48,
    titleSpacingPx: 24,
    buttonFontSizePx: 18,
    buttonPaddingPx: { vertical: 15, horizontal: 30 },
    buttonMarginTopPx: 12,
  },
  stageSelect: {
    labelFontSizePx: 22,
    labelSpacingPx: 12,
    buttonFontSizePx: 16,
    buttonPaddingPx: { vertical: 10, horizontal: 22 },
    buttonGapPx: 12,
    containerGapPx: 28,
    startButtonFontSizePx: 18,
    startButtonPaddingPx: { vertical: 15, horizontal: 30 },
    startButtonMarginTopPx: 16,
    settingsButtonSizePx: 46,
    settingsIconSizePx: 30,
  },
  gameOver: {
    titleFontSizePx: 48,
    titleSpacingPx: 10,
    scoreFontSizePx: 24,
    scoreSpacingPx: 10,
    containerGapPx: 20,
    buttonFontSizePx: 18,
    buttonPaddingPx: { vertical: 15, horizontal: 30 },
    buttonGapPx: 16,
  },
  buttons: {
    borderRadiusPx: 8,
  },
  pauseButton: {
    backgroundColor: 'rgba(10,10,10,0.35)',
    borderColor: 'rgba(255,255,255,0.25)',
    iconColor: 'rgba(255,255,255,0.8)',
    opacity: 0.55,
    hoverOpacity: 0.85,
  },
};

export const AUDIO = {
  stage1: {
    src: './Music/stage1.mp3',
    volume: 0.6,
    loop: true,
    preload: 'auto',
    startOffsets: [0, 40, 60],
  },
  stage2: {
    src: './Music/stage2.mp3',
    volume: 0.6,
    loop: true,
    preload: 'auto',
    startOffsets: [0, 40, 60],
  },
  stage3: {
    src: './Music/stage3.mp3',
    volume: 0.6,
    loop: true,
    preload: 'auto',
    startOffsets: [0, 41, 60],
  },
};

export const EFFECTS = {
  playerSmash: {
    src: './Effects/smash.mp3',
    volume: 0.85,
    preload: 'auto',
  },
};

export const ADS = {
  enabled: true,
  // Show one interstitial after every N completed games (game over).
  showEveryNGames: 5,
  interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712', // Google sample interstitial
  // Leave true while testing to avoid serving live ads during development.
  initializeForTesting: true,
  useTestAds: true,
  testingDevices: [],
  tagForChildDirectedTreatment: false,
  tagForUnderAgeOfConsent: false,
  maxAdContentRating: 'General',
};
