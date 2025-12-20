import { ORBIT, PLAYER } from './Config.js';
import { Player } from './Player.js';
import { ObstacleManager } from './ObstacleManager.js';
import { RhythmEffect } from './RhythmEffect.js';
import { SnowEffect } from './SnowEffect.js';

export class GameScene {
  constructor({ centerX, centerY, orbitRadius, playerRadius, playerRenderRadius, scale = 1 } = {}) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.orbitRadius = orbitRadius;
    this.playerRadius = playerRadius;
    this.playerRenderRadius = Number.isFinite(playerRenderRadius) ? playerRenderRadius : playerRadius;
    this.scale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    this.playerSkin = null;
    this.obstacleSkin = null;

    this.playerHitFlash = 0;
    this._snowShouldDraw = false;

    this._buildEntities();
  }

  setGeometry({ centerX, centerY, orbitRadius, playerRadius, playerRenderRadius } = {}) {
    if (typeof centerX === 'number') this.centerX = centerX;
    if (typeof centerY === 'number') this.centerY = centerY;
    if (typeof orbitRadius === 'number') this.orbitRadius = orbitRadius;
    if (typeof playerRadius === 'number') this.playerRadius = playerRadius;
    if (typeof playerRenderRadius === 'number') this.playerRenderRadius = playerRenderRadius;
    if (!Number.isFinite(this.playerRenderRadius)) this.playerRenderRadius = this.playerRadius;

    if (!this.player || !this.obstacleManager) {
      this._buildEntities();
      return;
    }

    this.player.setGeometry({
      centerX: this.centerX,
      centerY: this.centerY,
      orbitRadius: this.orbitRadius,
      radius: this.playerRadius,
      renderRadius: this.playerRenderRadius,
    });
    this.obstacleManager.setGeometry({
      centerX: this.centerX,
      centerY: this.centerY,
      orbitRadius: this.orbitRadius,
    });
  }

  setScale(scale = 1) {
    const nextScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    if (nextScale === this.scale) return;
    this.scale = nextScale;
    if (this.obstacleManager && typeof this.obstacleManager.setScale === 'function') {
      this.obstacleManager.setScale(this.scale);
    }
    if (this.snow && typeof this.snow.setScale === 'function') {
      this.snow.setScale(this.scale);
    }
  }

  setPlayerSkin(skin) {
    this.playerSkin = skin;
    if (this.player && typeof this.player.setSkin === 'function') {
      this.player.setSkin(skin);
    }
  }

  setObstacleSkin(skin) {
    this.obstacleSkin = skin;
    if (this.obstacleManager && typeof this.obstacleManager.setSkin === 'function') {
      this.obstacleManager.setSkin(skin);
    }
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
  }

  setPlayerAngle(angle) {
    if (!this.player) return;
    if (typeof angle === 'number' && Number.isFinite(angle)) {
      this.player.angle = angle;
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
    const dtSeconds = dt / 60;
    if (stageFinished || rhythmPaused) {
      this.rhythmEffect.reset();
    } else if (this.rhythmEffect && typeof this.rhythmEffect.updateSeconds === 'function') {
      this.rhythmEffect.updateSeconds(dtSeconds);
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

    const baseColor = this.player && typeof this.player.getBaseColor === 'function'
      ? this.player.getBaseColor()
      : '#ffffff';
    this.player.color = (this.playerHitFlash > 0) ? '#ff4444' : baseColor;
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
    this.player = new Player(
      this.centerX,
      this.centerY,
      this.orbitRadius,
      this.playerRadius,
      this.playerRenderRadius,
    );
    if (this.playerSkin && typeof this.player.setSkin === 'function') {
      this.player.setSkin(this.playerSkin);
    }
    this.obstacleManager = new ObstacleManager(this.centerX, this.centerY, this.orbitRadius, { scale: this.scale });
    if (this.obstacleSkin && typeof this.obstacleManager.setSkin === 'function') {
      this.obstacleManager.setSkin(this.obstacleSkin);
    }
    this.snow = new SnowEffect({ scale: this.scale });
    this.rhythmEffect = new RhythmEffect();
    this.playerHitFlash = 0;
  }
}
