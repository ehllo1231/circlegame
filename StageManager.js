import { SPAWN, SNOW } from './Config.js';

class Phase {
  constructor(name, durationSec, applyFn) {
    this.name = name;
    this.durationSec = durationSec;
    this.apply = typeof applyFn === 'function' ? applyFn : () => {};
  }
}

export class StageManager {
  constructor(phases = [], options = {}) {
    this.phases = phases;
    this.currentIndex = -1;
    this.phaseStartTime = 0;
    this.totalElapsed = 0;
    this.changed = false;
    this.spawnEnabled = true;
    this.snowEnabled = true;
    this.fadeStartSec = options.fadeStartSec ?? 0; // when to begin fade (absolute seconds)
    this.fadeDurationSec = options.fadeDurationSec ?? 5; // seconds of fade
    this.fadeFrom = options.fadeFrom || '#000000';
    this.fadeTo = options.fadeTo || '#670500';
  }

  update(secondsElapsed) {
    this.totalElapsed = secondsElapsed;
    let t = secondsElapsed;
    // Determine which phase we are in based on cumulative durations
    let acc = 0;
    let index = -1;
    for (let i = 0; i < this.phases.length; i++) {
      acc += this.phases[i].durationSec;
      if (t < acc) { index = i; break; }
    }

    if (index !== this.currentIndex) {
      this.currentIndex = index;
      this.changed = true;
      if (index >= 0) {
        // Entering a phase
        this.snowEnabled = true;
        this.phases[index].apply();
        // Set fade schedule only when stage is ended
      } else if (t >= this.getTotalDuration()) {
        // Stage finished
        this.spawnEnabled = false;
        this.snowEnabled = true; // allow snow to continue if configured
        this.fadeStartSec = this.getTotalDuration();
      }
    } else {
      this.changed = false;
    }
  }

  getTotalDuration() {
    return this.phases.reduce((s, p) => s + (p.durationSec || 0), 0);
  }

  canSpawn() {
    // After last phase, disallow spawns
    return this.currentIndex >= 0;
  }

  isSnowEnabled() {
    return this.snowEnabled;
  }

  getCurrentBaseInterval() {
    return SPAWN?.baseInterval;
  }

  getBackgroundColor() {
    // If stage finished, fade from from->to over fadeDuration
    const endAt = this.getTotalDuration();
    if (this.totalElapsed <= endAt) return this.fadeFrom;
    const d = Math.max(0, this.totalElapsed - endAt);
    const k = Math.max(0, Math.min(1, this.fadeDurationSec > 0 ? d / this.fadeDurationSec : 1));
    return lerpHex(this.fadeFrom, this.fadeTo, k);
  }
}

function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function lerp(a,b,t){ return a + (b-a)*t; }
function hexToRgb(hex){
  const s = hex.replace('#','');
  const v = parseInt(s,16);
  if (s.length === 6) {
    return { r:(v>>16)&255, g:(v>>8)&255, b:v&255 };
  }
  return { r:0,g:0,b:0 };
}
function rgbToHex(r,g,b){
  const v = ((r&255)<<16)|((g&255)<<8)|(b&255);
  return '#' + v.toString(16).padStart(6,'0');
}
function lerpHex(h1,h2,t){
  const a = hexToRgb(h1); const b = hexToRgb(h2);
  const r = Math.round(lerp(a.r,b.r,clamp01(t)));
  const g = Math.round(lerp(a.g,b.g,clamp01(t)));
  const b2= Math.round(lerp(a.b,b.b,clamp01(t)));
  return rgbToHex(r,g,b2);
}

// Factory for Stage1 as specified
export function createStage1() {
  const phases = [];
  // Phase 0: 10s, baseInterval 30, snow off
  phases.push(new Phase('phase0', 10, () => {
    SPAWN.baseInterval = 30;
    SNOW.spawnPerMin = 0;
  }));
  // Phase 1: 20s, baseInterval 25, snow slight + slow
  phases.push(new Phase('phase1', 20, () => {
    SPAWN.baseInterval = 25;
    SNOW.spawnPerMin = 60; // slight
    SNOW.fallSpeed.min = 0.4; SNOW.fallSpeed.max = 1.0; // slow
  }));
  // Phase 2: 15s, baseInterval 15, snow many + fast
  phases.push(new Phase('phase2', 15, () => {
    SPAWN.baseInterval = 15;
    SNOW.spawnPerMin = 360; // many
    SNOW.fallSpeed.min = 1.2; SNOW.fallSpeed.max = 2.6; // fast
  }));
  // Phase 3: 15s, baseInterval 15, snow very many + very fast
  phases.push(new Phase('phase3', 15, () => {
    SPAWN.baseInterval = 15;
    SNOW.spawnPerMin = 900; // very many
    SNOW.fallSpeed.min = 2.0; SNOW.fallSpeed.max = 3.6; // very fast
  }));

  return new StageManager(phases, { fadeFrom: '#000000', fadeTo: '#670500', fadeDurationSec: 6 });
}

