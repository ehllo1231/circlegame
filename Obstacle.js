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
        const drawLength = Number.isFinite(this.renderLength) ? this.renderLength : this.length;
        const drawBaseWidth = Number.isFinite(this.renderBaseWidth) ? this.renderBaseWidth : this.baseWidth;
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
                    const centerXPos = this.radius - (drawH / 2);
                    ctx.translate(centerXPos, 0);
                    ctx.rotate(Math.PI / 2);
                    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
                } else {
                    ctx.drawImage(image, this.radius - drawW, -drawH / 2, drawW, drawH);
                }
                ctx.restore();
                return;
            }
        }
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.angle);
        
        ctx.beginPath();
        ctx.moveTo(this.radius - drawLength, 0);
        ctx.lineTo(this.radius, -drawBaseWidth / 2);
        ctx.lineTo(this.radius, drawBaseWidth / 2);
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
