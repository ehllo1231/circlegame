// Obstacle 클래스 - 장애물 관리
export class Obstacle {
    constructor(angle, radius, speed, baseWidth = 24, length = 37.5, acceleration = 0, offscreenMargin = 60) {
        this.angle = angle;
        this.radius = radius;
        this.speed = speed;
        // Allow explicit size from spawner; default to original if not provided
        this.baseWidth = baseWidth;
        this.length = length;
        this.acceleration = acceleration;
        this.offscreenMargin = Number.isFinite(offscreenMargin) && offscreenMargin > 0 ? offscreenMargin : 60;
        this.color = '#ffffff';
    }
    
    update(dt = 1) {
        this.radius -= this.speed * dt;
        this.speed += this.acceleration * dt;
    }
    
    draw(ctx, centerX, centerY) {
        const hitLength = Number.isFinite(this.length) ? this.length : 0;
        const drawLength = Number.isFinite(this.renderLength) ? this.renderLength : hitLength;
        const drawBaseWidth = Number.isFinite(this.renderBaseWidth) ? this.renderBaseWidth : this.baseWidth;
        // Anchor render size at the hit tip so visual scaling grows outward from the tip.
        const renderOffset = (Number.isFinite(drawLength) && Number.isFinite(hitLength))
            ? (drawLength - hitLength)
            : 0;
        const baseRadius = this.radius + renderOffset;
        const image = this.image;
        if (image && image.complete) {
            const imgW = image.naturalWidth || image.width;
            const imgH = image.naturalHeight || image.height;
            if (Number.isFinite(imgW) && Number.isFinite(imgH) && imgW > 0 && imgH > 0
                && Number.isFinite(drawLength) && drawLength > 0
                && Number.isFinite(drawBaseWidth) && drawBaseWidth > 0) {
                const rotateImage = imgH > imgW;
                const lengthLimit = Math.max(1, drawLength);
                const widthLimit = Math.max(1, drawBaseWidth);
                const scale = rotateImage
                    ? Math.min(lengthLimit / imgH, widthLimit / imgW)
                    : Math.min(lengthLimit / imgW, widthLimit / imgH);
                const drawW = imgW * scale;
                const drawH = imgH * scale;
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(this.angle);
                if (rotateImage) {
                    const centerXPos = baseRadius - (drawH / 2);
                    ctx.translate(centerXPos, 0);
                    ctx.rotate(Math.PI / 2);
                    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
                } else {
                    ctx.drawImage(image, baseRadius - drawW, -drawH / 2, drawW, drawH);
                }
                ctx.restore();
                return;
            }
        }
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.angle);
        
        ctx.beginPath();
        ctx.moveTo(baseRadius - drawLength, 0);
        ctx.lineTo(baseRadius, -drawBaseWidth / 2);
        ctx.lineTo(baseRadius, drawBaseWidth / 2);
        ctx.closePath();
        ctx.fillStyle = this.color || '#ffffff';
        ctx.fill();
        ctx.restore();
    }
    
    isCollidingWithOrbit(orbitRadius) {
        return this.radius >= orbitRadius && (this.radius - this.length) <= orbitRadius;
    }
    
    isOffScreen() {
        const margin = Number.isFinite(this.offscreenMargin) && this.offscreenMargin > 0 ? this.offscreenMargin : 60;
        return this.radius < -margin;
    }
}
