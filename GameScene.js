import { ORBIT, PLAYER } from './Config.js';
import { Player } from './Player.js';
import { ObstacleManager } from './ObstacleManager.js';
import { RhythmEffect } from './RhythmEffect.js';
import { SnowEffect } from './SnowEffect.js';

export class GameScene {
  constructor({ centerX, centerY, orbitRadius, playerRadius } = {}) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.orbitRadius = orbitRadius;
    this.playerRadius = playerRadius;

    this.playerHitFlash = 0;
    this._snowShouldDraw = false;

    this._buildEntities();
  }

  setGeometry({ orbitRadius, playerRadius }) {
    if (typeof orbitRadius === 'number') this.orbitRadius = orbitRadius;
    if (typeof playerRadius === 'number') this.playerRadius = playerRadius;
    this._buildEntities();
  }

  resetForNewRun() {
    if (this.obstacleManager) {
      this.obstacleManager.obstacles.length = 0;
      if (typeof this.obstacleManager.resetSpawnTimer === 'function') {
        this.obstacleManager.resetSpawnTimer();
      }
      if (Object.prototype.hasOwnProperty.call(this.obstacleManager, 'lastSpawnAccelStage')) {
        this.obstacleManager.lastSpawnAccelStage = 0;
      }
    }
    if (this.snow && typeof this.snow.reset === 'function') this.snow.reset();
    if (this.rhythmEffect && typeof this.rhythmEffect.reset === 'function') this.rhythmEffect.reset();
    if (this.player) this.player.angle = 0;
    this.playerHitFlash = 0;
  }

  resetAfterStageTransition() {
    if (this.obstacleManager) {
      this.obstacleManager.obstacles.length = 0;
      if (typeof this.obstacleManager.resetSpawnTimer === 'function') {
        this.obstacleManager.resetSpawnTimer();
      }
      if (Object.prototype.hasOwnProperty.call(this.obstacleManager, 'lastSpawnAccelStage')) {
        this.obstacleManager.lastSpawnAccelStage = 0;
      }
    }
    if (this.snow && typeof this.snow.reset === 'function') this.snow.reset();
    if (this.rhythmEffect && typeof this.rhythmEffect.reset === 'function') this.rhythmEffect.reset();
    this.playerHitFlash = 0;
  }

  applyStageConfig(stage) {
    if (!stage) return;
    if (this.obstacleManager?.refreshFromConfig) {
      this.obstacleManager.refreshFromConfig();
    }
    if (typeof stage.getCurrentBaseInterval === 'function') {
      const baseInterval = stage.getCurrentBaseInterval();
      if (typeof baseInterval === 'number') {
        this.obstacleManager.spawnInterval = baseInterval;
        this.obstacleManager.frameCounter = 0;
        if (typeof this.obstacleManager.lastSpawnAccelStage === 'number') {
          this.obstacleManager.lastSpawnAccelStage = 0;
        }
      }
    }
    if (typeof stage.isSnowEnabled === 'function' && stage.isSnowEnabled() === false) {
      if (this.snow && typeof this.snow.reset === 'function') this.snow.reset();
    }
  }

  applyPlayerConfigFromConfig() {
    if (!this.player) return;
    if (typeof PLAYER?.angularSpeed === 'number') {
      this.player.speed = PLAYER.angularSpeed;
    }
    if (typeof PLAYER?.radius === 'number') {
      const prevAngle = this.player.angle;
      this.playerRadius = PLAYER.radius;
      this.player.radius = PLAYER.radius;
      // Preserve current angular position.
      this.player.angle = prevAngle;
    }
  }

  updateFrame({
    dt = 1,
    debugMode = false,
    stageFinished = false,
    allowSpawn = true,
    visibleScore = 0,
    offscreenRadius,
    snowActive = false,
    canvasWidth,
    canvasHeight,
    extraObstacles = [],
    rhythmPaused = false,
  } = {}) {
    if (stageFinished || rhythmPaused) {
      this.rhythmEffect.reset();
    } else {
      this.rhythmEffect.update(dt);
    }

    this._snowShouldDraw = false;
    if (snowActive && this.snow && typeof this.snow.update === 'function') {
      if (typeof canvasWidth === 'number' && typeof canvasHeight === 'number') {
        this.snow.update(dt, canvasWidth, canvasHeight);
        this._snowShouldDraw = true;
      }
    }

    this.obstacleManager.update(dt);

    let playerCollided = false;
    for (const obstacle of this.obstacleManager.obstacles) {
      if (obstacle?.ignoreCollision) continue;
      if (this.player.checkCollisionWithObstacle(obstacle)) {
        playerCollided = true;
        break;
      }
    }
    if (!playerCollided && Array.isArray(extraObstacles)) {
      for (const obstacle of extraObstacles) {
        if (!obstacle || obstacle.ignoreCollision) continue;
        if (this.player.checkCollisionWithObstacle(obstacle)) {
          playerCollided = true;
          break;
        }
      }
    }
    if (playerCollided) {
      if (debugMode) {
        this.playerHitFlash = Math.max(this.playerHitFlash, 6);
      } else {
        return { playerHit: true };
      }
    }

    this.obstacleManager.applySpawnAcceleration(visibleScore);

    if (allowSpawn && this.obstacleManager.shouldSpawn()) {
      this.obstacleManager.spawnObstacle(
        typeof offscreenRadius === 'number' ? offscreenRadius : this._defaultOffscreenRadius(canvasWidth, canvasHeight),
      );
      this.obstacleManager.resetSpawnTimer();
    }

    this.player.update(dt);

    if (this.playerHitFlash > 0) {
      this.playerHitFlash = Math.max(0, this.playerHitFlash - dt);
    }

    return { playerHit: false };
  }

  drawFrame(ctx, {
    stageFinished = false,
    centerX = this.centerX,
    centerY = this.centerY,
    orbitRadius = this.orbitRadius,
    snowActive = false,
    extraObstacles = [],
    rhythmPaused = false,
  } = {}) {
    if (snowActive && this._snowShouldDraw && this.snow) {
      this.snow.draw(ctx);
    }

    const rhythmActive = !stageFinished && !rhythmPaused;
    if (rhythmActive) {
      this.rhythmEffect.applyTransform(ctx, centerX, centerY);
    }
    this._drawOrbit(ctx, centerX, centerY, orbitRadius);
    if (rhythmActive) {
      this.rhythmEffect.restoreTransform(ctx);
    }

    this.obstacleManager.draw(ctx);
    if (Array.isArray(extraObstacles)) {
      if (rhythmActive) {
        this.rhythmEffect.applyTransform(ctx, centerX, centerY);
      }
      for (const obstacle of extraObstacles) {
        if (obstacle && typeof obstacle.draw === 'function') {
          obstacle.draw(ctx, centerX, centerY);
        }
      }
      if (rhythmActive) {
        this.rhythmEffect.restoreTransform(ctx);
      }
    }

    this.player.color = (this.playerHitFlash > 0) ? '#ff4444' : '#ffffff';
    if (rhythmActive) {
      this.rhythmEffect.applyTransform(ctx, centerX, centerY);
    }
    this.player.draw(ctx);
    if (rhythmActive) {
      this.rhythmEffect.restoreTransform(ctx);
    }
  }

  reversePlayerDirection() {
    if (this.player && typeof this.player.reverseDirection === 'function') {
      this.player.reverseDirection();
    }
  }

  _drawOrbit(ctx, centerX, centerY, orbitRadius) {
    ctx.strokeStyle = ORBIT.color ?? '#ffffff';
    ctx.lineWidth = ORBIT.lineWidth ?? 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  _defaultOffscreenRadius(width, height) {
    if (typeof width === 'number' && typeof height === 'number') {
      return Math.hypot(width / 2, height / 2) + 40;
    }
    return Math.hypot(this.centerX, this.centerY) + 40;
  }

  _buildEntities() {
    this.player = new Player(this.centerX, this.centerY, this.orbitRadius, this.playerRadius);
    this.obstacleManager = new ObstacleManager(this.centerX, this.centerY, this.orbitRadius);
    this.rhythmEffect = new RhythmEffect();
    this.snow = new SnowEffect();
    this.playerHitFlash = 0;
  }
}
