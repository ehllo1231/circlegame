// RhythmEffect 클래스 - 리듬 효과 관리
export class RhythmEffect {
    constructor() {
        this.timer = 0;
        this.scale = 1;
        this.interval = 180; // 3초 (60fps * 3초)
        this.scaleDecrease = 0.005;
        this.maxScale = 1.1;
    }
    
    update() {
        this.timer++;
        
        if (this.timer >= this.interval) {
            this.timer = 0;
            this.scale = this.maxScale;
        }
        
        this.scale = Math.max(1, this.scale - this.scaleDecrease);
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
}
