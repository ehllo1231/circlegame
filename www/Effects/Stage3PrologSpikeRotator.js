import { clamp01 } from './colorUtils.js';

export class Stage3PrologSpikeRotator {
  constructor() {
    this.enabled = false;
    this.totalAngleRad = Math.PI;
    this.durationSec = 0;
    this.easeExponent = 1.3;
    this.direction = -1;

    this.obstacles = [];
    this.baseAngles = [];
    this.targetAngles = [];

    this.active = false;
    this.started = false;
    this.completed = false;
    this.elapsed = 0;
  }

  configure(config = {}) {
    const isEnabled = config?.enabled !== false;
    let angleRad = Number(config?.totalAngleRad);
    if (!Number.isFinite(angleRad)) {
      const angleDeg = Number(config?.totalAngleDeg);
      if (Number.isFinite(angleDeg)) {
        angleRad = angleDeg * (Math.PI / 180);
      }
    }
    if (!Number.isFinite(angleRad)) {
      angleRad = Math.PI;
    }
    const magnitude = Math.abs(angleRad);

    const directionConfig = typeof config?.direction === 'string' ? config.direction.toLowerCase() : null;
    let direction = -1;
    if (
      directionConfig === 'counterclockwise'
      || directionConfig === 'counter-clockwise'
      || directionConfig === 'ccw'
      || directionConfig === 'anticlockwise'
    ) {
      direction = 1;
    } else if (
      directionConfig === 'clockwise'
      || directionConfig === 'cw'
    ) {
      direction = -1;
    } else if (angleRad < 0) {
      direction = -1;
    }

    const duration = Number(config?.durationSec);
    const easeExp = Number(config?.easeExponent);

    this.enabled = isEnabled && magnitude > 0;
    this.totalAngleRad = magnitude;
    this.direction = direction;
    this.durationSec = Number.isFinite(duration) && duration > 0 ? duration : 0;
    this.easeExponent = Number.isFinite(easeExp) && easeExp > 0 ? easeExp : 1.3;
  }

  attachObstacles(obstacles = []) {
    this.obstacles = Array.isArray(obstacles) ? obstacles : [];
    this.baseAngles = this.obstacles.map((obstacle) => {
      const angle = obstacle?.angle;
      return Number.isFinite(angle) ? angle : 0;
    });
    const delta = this.direction * this.totalAngleRad;
    this.targetAngles = this.baseAngles.map((angle) => angle + delta);
    if (!this.enabled) {
      this.applyRotation(1);
    } else {
      this.applyRotation(0);
    }
  }

  reset() {
    this.active = false;
    this.started = false;
    this.completed = !this.enabled;
    this.elapsed = 0;
    this.applyRotation(0);
  }

  start() {
    if (!this.enabled || this.started) {
      this.started = true;
      this.active = false;
      this.completed = !this.enabled;
      return;
    }
    this.started = true;
    this.active = true;
    this.completed = false;
    this.elapsed = 0;
    this.applyRotation(0);
  }

  update(dtSeconds) {
    if (!this.active || this.completed || !Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    if (this.durationSec <= 0) {
      this.fastForward();
      return;
    }
    this.elapsed = Math.min(this.durationSec, this.elapsed + dtSeconds);
    const progress = clamp01(this.elapsed / this.durationSec);
    const eased = Math.pow(progress, this.easeExponent);
    this.applyRotation(eased);
    if (this.elapsed >= this.durationSec - 1e-4) {
      this.active = false;
      this.completed = true;
      this.applyRotation(1);
    }
  }

  applyRotation(progress) {
    if (!this.enabled || !Array.isArray(this.obstacles)) return;
    const baseAngles = Array.isArray(this.baseAngles) ? this.baseAngles : [];
    const targetAngles = Array.isArray(this.targetAngles) ? this.targetAngles : [];
    for (let i = 0; i < this.obstacles.length; i += 1) {
      const obstacle = this.obstacles[i];
      if (!obstacle) continue;
      const base = Number.isFinite(baseAngles[i]) ? baseAngles[i] : (obstacle.angle ?? 0);
      const target = Number.isFinite(targetAngles[i]) ? targetAngles[i] : base;
      obstacle.angle = base + (target - base) * clamp01(progress);
    }
  }

  isEnabled() {
    return this.enabled;
  }

  isActive() {
    return this.active;
  }

  isComplete() {
    return !this.enabled || this.completed;
  }

  hasStarted() {
    return this.started;
  }

  fastForward() {
    if (!this.enabled) {
      this.reset();
      this.started = true;
      this.completed = true;
      this.active = false;
      return;
    }
    this.started = true;
    this.active = false;
    this.completed = true;
    this.elapsed = this.durationSec;
    this.applyRotation(1);
  }

  getTotalDuration() {
    return this.enabled ? this.durationSec : 0;
  }
}
