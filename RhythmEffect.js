import { RHYTHM } from './Config.js';
// RhythmEffect ?대옒??- 由щ벉 ?④낵 愿由?
export class RhythmEffect {
    constructor() {
        this.timer = 0;
        this.scale = 1;
        this.intervalSeconds = this._resolveIntervalSeconds();
        this.scaleDecayPerSecond = this._resolveScaleDecayPerSecond();
        this.maxScale = (RHYTHM && typeof RHYTHM.maxScale === "number") ? RHYTHM.maxScale : 1.1;
    }

    updateSeconds(dtSeconds = 0) {
        if (dtSeconds <= 0) return;
        this.timer += dtSeconds;

        if (this.timer >= this.intervalSeconds) {
            this.timer -= this.intervalSeconds;
            if (this.timer < 0) this.timer = 0;
            this.scale = this.maxScale;
        }

        const decay = this.scaleDecayPerSecond * dtSeconds;
        this.scale = Math.max(1, this.scale - decay);
    }

    applyTransform(ctx, centerX, centerY) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-centerX, -centerY);
    }
    
    restoreTransform(ctx) {
        ctx.restore();
    }

    reset() {
        this.timer = 0;
        this.scale = 1;
    }

    _resolveIntervalSeconds() {
        if (RHYTHM && typeof RHYTHM.intervalSeconds === "number") {
            return Math.max(0.0001, RHYTHM.intervalSeconds);
        }
        return 1;
    }

    _resolveScaleDecayPerSecond() {
        if (RHYTHM && typeof RHYTHM.scaleDecreasePerSecond === "number") {
            return Math.max(0, RHYTHM.scaleDecreasePerSecond);
        }
        return 0.3;
    }
}
