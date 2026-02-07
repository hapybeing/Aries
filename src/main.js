// --- SCENE 1: MAIN MENU ---
class MainMenu extends Phaser.Scene {
    constructor() { super('MainMenu'); }

    preload() {
        this.load.image('bg', 'bg.png');
        this.load.image('ground', 'ground.png');
        this.load.image('spike', 'spike.png');
        this.load.image('hero', 'hero.png');
        
        this.load.audio('music', 'music.mp3');
        this.load.audio('jump', 'jump.mp3');
        this.load.audio('boom', 'boom.mp3');
    }

    create() {
        const { width, height } = this.scale;
        
        this.bg = this.add.tileSprite(width/2, height/2, width, height, 'bg').setTint(0x666666);
        
        const title = this.add.text(width/2, height * 0.2, 'ARIES', {
            fontSize: '80px', fontFamily: 'Arial Black', color: '#ffffff'
        }).setOrigin(0.5);
        if (title.postFX) title.postFX.addBloom(0xffffff, 1, 1, 2, 1.2);

        const highScore = localStorage.getItem('aries_highscore') || 0;
        this.add.text(width/2, height * 0.3, `BEST RUN: ${highScore}m`, {
            fontSize: '24px', fontFamily: 'monospace', color: '#00ffff'
        }).setOrigin(0.5);

        // --- INSTRUCTIONS ---
        const guideY = height * 0.55;
        this.add.rectangle(width/2, guideY + 20, 2, 120, 0x00ffff, 0.3);

        this.add.text(width * 0.25, guideY - 30, 'TAP LEFT', { fontSize: '20px', fontFamily: 'monospace', color: '#00ffff' }).setOrigin(0.5);
        this.add.text(width * 0.25, guideY + 10, 'JUMP', { fontSize: '32px', fontFamily: 'Arial Black', color: '#ffffff' }).setOrigin(0.5);

        this.add.text(width * 0.75, guideY - 30, 'TAP RIGHT', { fontSize: '20px', fontFamily: 'monospace', color: '#ff0055' }).setOrigin(0.5);
        this.add.text(width * 0.75, guideY + 10, 'ATTACK', { fontSize: '32px', fontFamily: 'Arial Black', color: '#ffffff' }).setOrigin(0.5);

        const startBtn = this.add.text(width/2, height * 0.85, '[ TAP TO START ]', {
            fontSize: '24px', fontFamily: 'monospace', color: '#ffffff'
        }).setOrigin(0.5);
        this.tweens.add({ targets: startBtn, alpha: 0.5, duration: 800, yoyo: true, repeat: -1 });

        this.input.on('pointerdown', () => this.scene.start('GameScene'));
    }
}

// --- SCENE 2: THE GAME ---
class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    create() {
        const { width, height } = this.scale;

        // 1. SETUP AUDIO
        if (!this.sound.get('music')) {
            this.music = this.sound.add('music', { loop: true, volume: 0.5 });
            this.music.play();
        }
        this.jumpSound = this.sound.add('jump', { volume: 0.4 });
        this.boomSound = this.sound.add('boom', { volume: 0.6 });

        // 2. WORLD
        this.bg = this.add.tileSprite(width/2, height/2, width, height, 'bg').setScrollFactor(0);
        
        if (this.cameras.main.postFX) {
            this.cameras.main.postFX.addBloom(0xffffff, 0.6, 0.6, 1.2, 1.0);
            this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9);
        }

        // 3. THE HERO
        this.player = this.physics.add.sprite(200, 300, 'hero');
        this.player.setScale(0.15); 
        this.player.body.setCircle(this.player.width * 0.3, this.player.width * 0.2, this.player.height * 0.2);
        this.player.setGravityY(1400);
        this.player.setDepth(10);
        
        // Trail - Offset to come from his back
        this.add.particles(0, 0, 'hero', {
            speed: 10, scale: { start: 0.15, end: 0 }, alpha: { start: 0.3, end: 0 },
            lifespan: 200, blendMode: 'ADD', follow: this.player,
            followOffset: { x: -20, y: 0 } 
        }).setDepth(9);

        // 4. GROUPS
        this.platforms = this.physics.add.staticGroup();
        this.spikes = this.physics.add.staticGroup();

        this.nextPlatformX = 0;
        for(let i=0; i<15; i++) this.spawnPlatform(false);

        // 5. COLLISIONS
        this.physics.add.collider(this.player, this.platforms, () => { this.jumps = 0; });
        
        this.physics.add.overlap(this.player, this.spikes, (player, spike) => {
            if (this.isDashing) {
                this.cameras.main.shake(100, 0.01);
                spike.destroy();
                this.score += 50; 
                this.boomSound.play();
                const burst = this.add.circle(spike.x, spike.y, 50, 0xff0000);
                this.tweens.add({targets: burst, scale: 2.5, alpha: 0, duration: 250, onComplete: () => burst.destroy()});
            } else {
                this.gameOver();
            }
        });

        // 6. CONTROLS
        this.input.on('pointerdown', (pointer) => {
            if (pointer.x < width / 2) this.jump();
            else this.dash();
        });

        // 7. CAMERA & SPEED
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setFollowOffset(-200, 150);

        this.scoreText = this.add.text(50, 50, '0', {
            fontSize: '40px', fontFamily: 'Arial Black', color: '#ffffff'
        }).setScrollFactor(0).setDepth(20);

        this.jumps = 0;
        this.isDashing = false;
        this.isDead = false;
        this.score = 0;
        this.gameSpeed = 400;
        this.speedLevel = 0;
    }

    spawnPlatform(canHaveSpikes) {
        const ground = this.platforms.create(this.nextPlatformX, this.scale.height - 50, 'ground');
        ground.displayWidth = 125; ground.displayHeight = 100;
        ground.refreshBody(); ground.setDepth(10);

        if (canHaveSpikes && Math.random() < 0.4) {
            const spikeX = this.nextPlatformX + Phaser.Math.Between(-30, 30);
            const spike = this.spikes.create(spikeX, this.scale.height - 110, 'spike');
            spike.displayWidth = 60; spike.displayHeight = 60;
            spike.refreshBody(); spike.setDepth(10);
            
            const glow = this.add.circle(spikeX, this.scale.height - 100, 30, 0xff0000, 0.3);
            this.tweens.add({ targets: glow, alpha: 0.1, scale: 1.5, duration: 500, yoyo: true, repeat: -1 });
        }
        this.nextPlatformX += 120;
    }

    jump() {
        if (this.jumps < 2 && !this.isDead) {
            this.player.setVelocityY(-700);
            this.jumps++;
            this.jumpSound.play();
            
            // --- ANIMATION: THE FLIP ---
            if (this.jumps === 2) {
                // Double Jump = Front Flip
                this.tweens.add({
                    targets: this.player,
                    angle: 360,
                    duration: 600,
                    ease: 'Cubic.easeOut'
                });
            }
        }
    }

    dash() {
        if (!this.isDashing && !this.isDead) {
            this.isDashing = true;
            this.player.setGravityY(-1400);
            this.player.setVelocityX(this.gameSpeed + 500);
            this.jumpSound.play({ rate: 1.5 });
            this.cameras.main.flash(50, 0, 255, 255);
            
            // Lean forward into the dash
            this.tweens.add({ targets: this.player, angle: 20, duration: 100, yoyo: true });

            this.time.delayedCall(250, () => {
                this.player.setGravityY(1400);
                this.isDashing = false;
            });
        }
    }

    update() {
        if (this.isDead) return;

        // Speed Logic
        const currentDistance = Math.floor(this.player.x / 100);
        const newSpeedLevel = Math.floor(currentDistance / 500);
        if (newSpeedLevel > this.speedLevel) {
            this.speedLevel = newSpeedLevel;
            this.gameSpeed += 40;
            this.cameras.main.zoomTo(Math.max(0.8, 1 - (this.speedLevel * 0.05)), 1000);
        }

        if (!this.isDashing) this.player.setVelocityX(this.gameSpeed);
        
        // --- PROCEDURAL ANIMATION LOOP ---
        if (this.player.body.touching.down) {
            // RUNNING: Bob up and down lightly
            this.player.setAngle(0); // Reset angle
            this.player.y += Math.sin(this.time.now / 100) * 0.5;
        } else {
            // AIRBORNE: Tilt based on velocity
            if (this.jumps < 2) { // Don't override the flip
                if (this.player.body.velocity.y < 0) {
                    this.player.setAngle(-15); // Tilt up (Jumping)
                } else {
                    this.player.setAngle(10);  // Tilt down (Falling)
                }
            }
        }
        // ---------------------------------

        this.bg.tilePositionX = this.cameras.main.scrollX * 0.5;

        if (this.player.x > this.nextPlatformX - 1500) this.spawnPlatform(true);

        const totalScore = currentDistance + this.score;
        this.scoreText.setText(totalScore);

        this.platforms.children.each(c => { if(c.x < this.player.x - 800) c.destroy(); });
        this.spikes.children.each(c => { if(c.x < this.player.x - 800) c.destroy(); });
        
        if (this.player.y > this.scale.height + 100) this.gameOver();
    }

    gameOver() {
        if (this.isDead) return;
        this.isDead = true;
        this.cameras.main.shake(500, 0.02);
        this.player.setTint(0xff0055);
        this.boomSound.play(); 
        
        const totalScore = Math.floor(this.player.x / 100) + this.score;
        const best = localStorage.getItem('aries_highscore') || 0;
        if (totalScore > best) localStorage.setItem('aries_highscore', totalScore);

        this.time.delayedCall(1000, () => this.scene.start('MainMenu'));
    }
}

// --- CONFIG ---
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#000000',
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 }, debug: false } },
    scene: [MainMenu, GameScene]
};
const game = new Phaser.Game(config);
