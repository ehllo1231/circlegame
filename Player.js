import { PLAYER } from './Config.js';
// Player ?대옒??- 二쇱씤怨?愿由?
export class Player {
    constructor(centerX, centerY, orbitRadius, playerRadius) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.orbitRadius = orbitRadius;
        this.radius = playerRadius;
        this.angle = 0;
        this.speed = (PLAYER && typeof PLAYER.angularSpeed === 'number') ? PLAYER.angularSpeed : 0.015; // angular speed
        this.rotationDirection = 1; // 1: ?쒓퀎諛⑺뼢, -1: ?쒓퀎諛섎?諛⑺뼢
    }
    
    update(dt = 1) {
        this.angle += this.speed * this.rotationDirection * dt;
    }
    
    draw(ctx) {
        const playerX = this.centerX + Math.cos(this.angle) * this.orbitRadius;
        const playerY = this.centerY + Math.sin(this.angle) * this.orbitRadius;
        
        ctx.fillStyle = this.color || '#ffffff';
        ctx.beginPath();
        ctx.arc(playerX, playerY, this.radius, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    reverseDirection() {
        this.rotationDirection *= -1;
    }

    setGeometry({ centerX, centerY, orbitRadius, radius }) {
        if (typeof centerX === 'number') this.centerX = centerX;
        if (typeof centerY === 'number') this.centerY = centerY;
        if (typeof orbitRadius === 'number') this.orbitRadius = orbitRadius;
        if (typeof radius === 'number') this.radius = radius;
    }
    
    // 二쇱씤怨듭쓽 ?꾩옱 ?꾩튂 醫뚰몴 諛섑솚
    getPosition() {
        return {
            x: this.centerX + Math.cos(this.angle) * this.orbitRadius,
            y: this.centerY + Math.sin(this.angle) * this.orbitRadius
        };
    }
    
    // ?μ븷臾쇨낵??異⑸룎 ?먯젙
    checkCollisionWithObstacle(obstacle) {
        if (!obstacle) return false;
        const vertices = this._computeObstacleTriangle(obstacle);
        if (!vertices) return false;
        const { tip, baseLeft, baseRight } = vertices;
        const playerPos = this.getPosition();
        const radius = Math.max(1, this.radius);

        if (this._pointInTriangle(playerPos, tip, baseLeft, baseRight)) {
            return true;
        }

        const segments = [
            [tip, baseLeft],
            [tip, baseRight],
            [baseLeft, baseRight],
        ];
        for (const [a, b] of segments) {
            const dist = this._distancePointToSegment(playerPos, a, b);
            if (dist <= radius) {
                return true;
            }
        }
        return false;
    }

    _computeObstacleTriangle(obstacle) {
        const angle = obstacle.angle;
        const radius = obstacle.radius;
        const length = obstacle.length;
        const baseWidth = obstacle.baseWidth;
        if (!Number.isFinite(angle) || !Number.isFinite(radius) || !Number.isFinite(length) || !Number.isFinite(baseWidth)) {
            return null;
        }
        const centerX = this.centerX;
        const centerY = this.centerY;
        const tipRadius = radius - length;
        const tip = {
            x: centerX + Math.cos(angle) * tipRadius,
            y: centerY + Math.sin(angle) * tipRadius,
        };
        const halfBase = baseWidth / 2;
        const normalAngle = angle + Math.PI / 2;
        const baseCenterX = centerX + Math.cos(angle) * radius;
        const baseCenterY = centerY + Math.sin(angle) * radius;
        const baseLeft = {
            x: baseCenterX + Math.cos(normalAngle) * halfBase,
            y: baseCenterY + Math.sin(normalAngle) * halfBase,
        };
        const baseRight = {
            x: baseCenterX - Math.cos(normalAngle) * halfBase,
            y: baseCenterY - Math.sin(normalAngle) * halfBase,
        };
        if (!this._isFinitePoint(tip) || !this._isFinitePoint(baseLeft) || !this._isFinitePoint(baseRight)) {
            return null;
        }
        return { tip, baseLeft, baseRight };
    }

    _isFinitePoint(point) {
        return point && Number.isFinite(point.x) && Number.isFinite(point.y);
    }

    _pointInTriangle(p, a, b, c) {
        const v0 = { x: c.x - a.x, y: c.y - a.y };
        const v1 = { x: b.x - a.x, y: b.y - a.y };
        const v2 = { x: p.x - a.x, y: p.y - a.y };
        const dot00 = v0.x * v0.x + v0.y * v0.y;
        const dot01 = v0.x * v1.x + v0.y * v1.y;
        const dot02 = v0.x * v2.x + v0.y * v2.y;
        const dot11 = v1.x * v1.x + v1.y * v1.y;
        const dot12 = v1.x * v2.x + v1.y * v2.y;
        const denom = (dot00 * dot11) - (dot01 * dot01);
        if (denom === 0) return false;
        const invDenom = 1 / denom;
        const u = ((dot11 * dot02) - (dot01 * dot12)) * invDenom;
        const v = ((dot00 * dot12) - (dot01 * dot02)) * invDenom;
        return (u >= 0) && (v >= 0) && (u + v <= 1);
    }

    _distancePointToSegment(point, a, b) {
        const ab = { x: b.x - a.x, y: b.y - a.y };
        const lengthSq = ab.x * ab.x + ab.y * ab.y;
        if (lengthSq === 0) {
            return Math.hypot(point.x - a.x, point.y - a.y);
        }
        const ap = { x: point.x - a.x, y: point.y - a.y };
        let t = (ap.x * ab.x + ap.y * ab.y) / lengthSq;
        t = Math.max(0, Math.min(1, t));
        const projX = a.x + ab.x * t;
        const projY = a.y + ab.y * t;
        return Math.hypot(point.x - projX, point.y - projY);
    }
}

