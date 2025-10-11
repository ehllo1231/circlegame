import { Player } from './Player.js';
import { ObstacleManager } from './ObstacleManager.js';
import { RhythmEffect } from './RhythmEffect.js';

// Game - main controller
export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2;
        this.orbitRadius = 160;
        this.playerRadius = 15;
        this.offscreenRadius = Math.hypot(canvas.width / 2, canvas.height / 2) + 40;

        // Entities
        this.player = new Player(this.centerX, this.centerY, this.orbitRadius, this.playerRadius);
        this.obstacleManager = new ObstacleManager(this.centerX, this.centerY, this.orbitRadius);
        this.rhythmEffect = new RhythmEffect();

        // State
        this.gameStarted = false;
        this.gameOver = false;
        this.animationId = null;
        this.score = 0;

        // UI elements
        this.startScreen = document.getElementById('startScreen');
        this.startButton = document.getElementById('startButton');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.restartButton = document.getElementById('restartButton');
        this.scoreDisplay = document.getElementById('scoreDisplay');

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.restartButton.addEventListener('click', () => this.restartGame());

        document.addEventListener('keydown', (event) => {
            if (!this.gameStarted && event.code === 'Space') {
                event.preventDefault();
                this.startGame();
            } else if (this.gameStarted && !this.gameOver && event.code === 'Space') {
                event.preventDefault();
                this.player.reverseDirection();
            } else if (this.gameOver && event.code === 'Space') {
                event.preventDefault();
                this.restartGame();
            }
        });
    }

    startGame() {
        this.gameStarted = true;
        this.gameOver = false;
        this.score = 0;
        this.startScreen.style.display = 'none';
        this.gameOverScreen.style.display = 'none';
        this.animate();
    }

    gameOverScreenShow() {
        this.gameOver = true;
        this.gameOverScreen.style.display = 'flex';
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // Final score (seconds) on game over screen
        this.scoreDisplay.textContent = `\uC810\uC218: ${Math.floor(this.score / 60)}`;
    }

    restartGame() {
        // Reset state
        this.gameOver = false;
        this.gameStarted = false;
        this.score = 0;

        // Recreate entities
        this.player = new Player(this.centerX, this.centerY, this.orbitRadius, this.playerRadius);
        this.obstacleManager = new ObstacleManager(this.centerX, this.centerY, this.orbitRadius);
        this.rhythmEffect = new RhythmEffect();

        // Hide overlays and immediately start
        this.gameOverScreen.style.display = 'none';
        this.startScreen.style.display = 'none';
        this.startGame();
    }

    drawOrbit() {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.orbitRadius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    animate() {
        if (!this.gameOver) {
            // Increase score (per frame)
            this.score++;

            // Update rhythm effect
            this.rhythmEffect.update();

            // Clear screen
            // Ensure a clean transform each frame to avoid accumulated transforms across restarts
            if (this.ctx.setTransform) {
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Apply rhythm effect
            this.rhythmEffect.applyTransform(this.ctx, this.centerX, this.centerY);

            // Draw orbit
            this.drawOrbit();

            // Update obstacles
            this.obstacleManager.update();

            // Collision
            for (const obstacle of this.obstacleManager.obstacles) {
                if (this.player.checkCollisionWithObstacle(obstacle)) {
                    // Always restore transform before exiting to prevent stacked transforms
                    this.rhythmEffect.restoreTransform(this.ctx);
                    this.gameOverScreenShow();
                    return;
                }
            }

            // Draw obstacles
            this.obstacleManager.draw(this.ctx);

            // Spawn
            if (this.obstacleManager.shouldSpawn()) {
                this.obstacleManager.spawnObstacle(this.offscreenRadius);
                this.obstacleManager.resetSpawnTimer();
            }

            // Player
            this.player.update();
            this.player.draw(this.ctx);

            // Restore rhythm effect
            this.rhythmEffect.restoreTransform(this.ctx);

            // Draw score (canvas)
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px Arial';
            this.ctx.textBaseline = 'top';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`\uC810\uC218: ${Math.floor(this.score / 60)}`, 20, 20);
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }
}
