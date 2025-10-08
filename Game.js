import { Player } from './Player.js';
import { ObstacleManager } from './ObstacleManager.js';
import { RhythmEffect } from './RhythmEffect.js';

// Game 클래스 - 전체 게임 관리
export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2;
        this.orbitRadius = 160;
        this.playerRadius = 15;
        this.offscreenRadius = Math.hypot(canvas.width / 2, canvas.height / 2) + 40;
        
        // 게임 객체들
        this.player = new Player(this.centerX, this.centerY, this.orbitRadius, this.playerRadius);
        this.obstacleManager = new ObstacleManager(this.centerX, this.centerY, this.orbitRadius);
        this.rhythmEffect = new RhythmEffect();
        
        // 게임 상태
        this.gameStarted = false;
        this.animationId = null;
        
        // UI 요소들
        this.startScreen = document.getElementById('startScreen');
        this.startButton = document.getElementById('startButton');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        
        document.addEventListener('keydown', (event) => {
            if (!this.gameStarted && event.code === 'Space') {
                event.preventDefault();
                this.startGame();
            } else if (this.gameStarted && event.code === 'Space') {
                event.preventDefault();
                this.player.reverseDirection();
            }
        });
    }
    
    startGame() {
        this.gameStarted = true;
        this.startScreen.style.display = 'none';
        this.animate();
    }
    
    drawOrbit() {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.orbitRadius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }
    
    animate() {
        // 리듬 효과 업데이트
        this.rhythmEffect.update();
        
        // 화면 지우기
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 리듬 효과 적용
        this.rhythmEffect.applyTransform(this.ctx, this.centerX, this.centerY);
        
        // 궤도 그리기
        this.drawOrbit();
        
        // 장애물 관리
        this.obstacleManager.update();
        this.obstacleManager.draw(this.ctx);
        
        // 장애물 스폰
        if (this.obstacleManager.shouldSpawn()) {
            this.obstacleManager.spawnObstacle(this.offscreenRadius);
            this.obstacleManager.resetSpawnTimer();
        }
        
        // 주인공 업데이트 및 그리기
        this.player.update();
        this.player.draw(this.ctx);
        
        // 리듬 효과 복원
        this.rhythmEffect.restoreTransform(this.ctx);
        
        // 애니메이션 계속
        this.animationId = requestAnimationFrame(() => this.animate());
    }
}
