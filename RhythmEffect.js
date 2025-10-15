import { RHYTHM } from './Config.js';
// RhythmEffect ?대옒??- 由щ벉 ?④낵 愿由?
export class RhythmEffect {
    constructor() {
        this.timer = 0;
        this.scale = 1;
        this.interval = (RHYTHM && typeof RHYTHM.intervalFrames === "number") ? RHYTHM.intervalFrames : 180; // frames at 60fps (~3s)
        this.scaleDecrease = (RHYTHM && typeof RHYTHM.scaleDecrease === "number") ? RHYTHM.scaleDecrease : 0.005; // per 60fps frame
        this.maxScale = (RHYTHM && typeof RHYTHM.maxScale === "number") ? RHYTHM.maxScale : 1.1;
    }
    
    update(dt = 1) { this.timer += dt;
        
        if (this.timer >= this.interval) {
            this.timer = 0;
            this.scale = this.maxScale;
        }
        
        this.scale = Math.max(1, this.scale - this.scaleDecrease * dt);
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
}

