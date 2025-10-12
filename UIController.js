import { SCORE } from './Config.js';

export class UIController {
  constructor() {
    this.startScreen = document.getElementById('startScreen');
    this.startButton = document.getElementById('startButton');
    this.gameOverScreen = document.getElementById('gameOverScreen');
    this.restartButton = document.getElementById('restartButton');
    this.scoreDisplay = document.getElementById('scoreDisplay');
  }

  bind({ onStart, onRestart }) {
    if (this.startButton && onStart) {
      this.startButton.addEventListener('click', onStart);
    }
    if (this.restartButton && onRestart) {
      this.restartButton.addEventListener('click', onRestart);
    }
  }

  hideOverlays() {
    if (this.startScreen) this.startScreen.style.display = 'none';
    if (this.gameOverScreen) this.gameOverScreen.style.display = 'none';
  }

  showStart() {
    if (this.gameOverScreen) this.gameOverScreen.style.display = 'none';
    if (this.startScreen) this.startScreen.style.display = 'flex';
  }

  showGameOver(finalScoreSeconds, highScore = null, isNew = false) {
    if (this.gameOverScreen) this.gameOverScreen.style.display = 'flex';
    if (this.scoreDisplay) {
      const lines = [];
      if (isNew) lines.push('최고 점수!!');
      lines.push(`${SCORE.label}: ${finalScoreSeconds}`);
      if (highScore != null) lines.push(`최고 점수: ${highScore}`);
      this.scoreDisplay.innerHTML = lines.map(x => `<div>${x}</div>`).join('');
    }
  }

  drawScore(ctx, seconds, centerX, centerY, orbitRadius) {
    const value = Math.floor(seconds).toString();
    if (SCORE.useCenter && typeof centerX === 'number' && typeof centerY === 'number' && typeof orbitRadius === 'number') {
      const sizePx = Math.max(SCORE.minFontPx ?? 16, Math.floor(orbitRadius * (SCORE.centerScale ?? 0.33)));
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${SCORE.centerAlpha ?? 0.35})`;
      ctx.font = `${sizePx}px ${SCORE.fontFamily || 'Arial'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(value, centerX, centerY);
      ctx.restore();
    } else {
      // Fallback to corner display with label
      ctx.fillStyle = '#ffffff';
      ctx.font = SCORE.font;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(`${SCORE.label}: ${value}`, SCORE.position.x, SCORE.position.y);
    }
  }
}
