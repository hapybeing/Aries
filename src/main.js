// --- SCENE 1: MAIN MENU ---
class MainMenu extends Phaser.Scene {
    constructor() { super('MainMenu'); }

    preload() {
        // LOADING BAR
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const loadingText = this.make.text({
            x: width / 2, y: height / 2,
            text: 'LOADING...',
            style: { font: '24px monospace', fill: '#ffffff' }
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            loadingText.setText(`LOADING... ${parseInt(value * 100)}%`);
        });
        this.load.on('complete', () => loadingText.destroy());

        // ASSETS
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
        
        // Background (Tinted Dark)
        this.bg = this.add.tileSprite(width/2, height/2, width, height, 'bg').setTint(0x444444);
        
        // Title
        const title = this.add.text(width/2, height * 0.25, 'ARIES', {
            fontSize: '100px', fontFamily: 'Arial Black', color: '#ffffff'
        }).setOrigin(0.5);
        if (title.postFX) title.postFX.addBloom(0xffffff, 1, 1, 2, 1.2);

        // High Score
        const highScore = localStorage.getItem('aries_highscore') || 0;
        this.add.text(width/2, height * 0.38, `BEST RUN: ${highScore}m`, {
            fontSize: '32px', fontFamily: 'monospace', color: '#00ffff'
        }).setOrigin(0.5);

        // Visual Guide (Line)
        this.add.rectangle(width/2, height * 0.6, 4, 150, 0x00ffff, 0.3);

        // CONTROLS TEXT (Standardized for 720p)
        // LEFT
        this.add.text(width * 0.25, height * 0.55, 'LEFT SIDE / SPACE', { fontSize: '24px', fontFamily: 'monospace', color: '#00ffff' }).setOrigin(0.5);
        this.add.text(width * 0.25, height * 0.65, 'JUMP', { fontSize: '60px', fontFamily: 'Arial Black', color: '#ffffff' }).setOrigin(0.5);

        // RIGHT
        this.add.text(width * 0.75, height * 0.55, 'RIGHT SIDE / D', { fontSize: '24px', fontFamily: 'monospace', color: '#ff0055' }).setOrigin(0.5);
        this.add.text(width * 0.75, height * 0.65, 'ATTACK', { fontSize: '60px', fontFamily: 'Arial Black', color: '#ffffff' }).setOrigin(0.5);

        // Start Button
        const startBtn = this.add.text(width/2, height * 0.85, '[ TAP TO START ]', {
            fontSize: '32px', fontFamily: 'monospace', color: '#ffffff'
        }).setOrigin(0.5);
        this.tweens.add({ targets: startBtn, alpha: 0.5, duration: 800, yoyo: true, repeat: -1 });

        // Inputs
        this.input.on('pointerdown', () => this.scene.start('GameScene'));
        this.input.keyboard.on('keydown-SPACE', () => this.scene.start('GameScene'));
        this.input.keyboard.on('keydown-ENTER', () => this.scene.start('GameScene'));
    }
}

// --- SCENE 2: THE GAME ---
class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    create() {
        const { width, height } = this.scale;

        // Audio
        if (!this.sound.get('music')) {
            this.music = this.sound.add('music', { loop: true, volume: 0.5 });
            this.music.play();
        }
        this.jumpSound = this.sound.add('jump', { volume: 0.4 });
        this.boomSound = this.sound.add('boom', { volume: 0.6 });

        // World
        this.bg = this.add.tileSprite(width/2, height/2, width, height, 'bg').setScrollFactor(0);
        // Bloom (Standardized)
        if (this.cameras.main.postFX) {
            this.cameras.main.postFX.addBloom(0xffffff, 0.6, 0.6, 1.2, 1.0);
            this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9);
        }

        // HERO (Safe Spawn at Y=100)
        this.player = this.physics.add.sprite(200, 100, 'hero');
        this.player.setScale(0.15); 
        this.player.setGravityY(1400);
        this.player.setDepth(10);
        // Hitbox Polish
        this.player.body.setSize(this.player.width * 0.4, this.player.height * 0.5);
        this.player.body.setOffset(this.player.width * 0.3, this.player.height * 0.25);

        // Trail
        this.trail = this.add.particles(0, 0, 'hero', {
            speed: 10, scale: { start: 0.15, end: 0 }, alpha: { start: 0.3, end: 0 },
            lifespan: 200, blendMode: 'ADD', follow: this.player, followOffset: { x: -20, y: 0 } 
        }).setDepth(9);

        // Dust
        const dustGfx = this.make.graphics({x:0, y:0, add:false});
        dustGfx.fillStyle(0xffffff); dustGfx.fillCircle(4,4,4);
        dustGfx.generateTexture('dust', 8, 8);
        this.dust = this.add.particles(0, 0, 'dust', {
            speed: { min: -100, max: 0 }, angle: { min: 180, max: 200 },
            scale: { start: 0.5, end: 0 }, alpha: { start: 0.5, end: 0 },
            lifespan: 300, gravityY: -100, emitting: false
        });

        // Platforms (Standardized Floor Height)
        this.platforms = this.physics.add.staticGroup();
        this.spikes = this.physics.add.staticGroup();
        this.nextPlatformX = 0;
        
        // Generate initial floor
        for(let i=0; i<20; i++) this.spawnPlatform(false);

        // Collisions
        this.physics.add.collider(this.player, this.platforms, () => { 
            this.jumps = 0; this.isFlipping = false;
        });
        
        this.physics.add.overlap(this.player, this.spikes, (player, spike) => {
            if (this.isDashing) {
                this.cameras.main.shake(100, 0.01);
                spike.destroy();
                this.score += 50; 
                this.boomSound.play();
                const burst = this.add.circle(spike.x, spike.y, 50, 0xff0000);
                this.tweens.add({targets: burst, scale: 2.5, alpha: 0, duration: 250, onComplete: () => burst.destroy()});
            } else {
                this.die(); 
            }
        });

        // CONTROLS
        this.input.on('pointerdown', (pointer) => {
            if (this.isDead) return;
            if (pointer.x < width / 2) this.jump();
            else this.dash();
        });
        this.input.keyboard.on('keydown-SPACE', () => this.jump());
        this.input.keyboard.on('keydown-UP', () => this.jump());
        this.input.keyboard.on('keydown-W', () => this.jump());
        this.input.keyboard.on('keydown-D', () => this.dash());
        this.input.keyboard.on('keydown-RIGHT', () => this.dash());

        // CAMERA (Fixed Offset for 720p)
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setFollowOffset(-300, 100); // Tuned for 720p

        // Score
        this.scoreText = this.add.text(50, 50, '0', {
            fontSize: '50px', fontFamily: 'Arial Black', color: '#ffffff'
        }).setScrollFactor(0).setDepth(20);

        // Variables
        this.jumps = 0;
        this.isDashing = false;
        this.isDead = false;
        this.isFlipping = false;
        this.score = 0;
        this.gameSpeed = 400;
        this.speedLevel = 0;

        // Run Anim
        this.tweens.add({
            targets: this.player, scaleY: 0.14, scaleX: 0.16, duration: 150, yoyo: true, repeat: -1
        });
    }

    spawnPlatform(canHaveSpikes) {
        // Floor is always at height - 64
        const groundY = 720 - 64; 
        const ground = this.platforms.create(this.nextPlatformX, groundY, 'ground');
        ground.displayWidth = 125; ground.displayHeight = 100;
        ground.refreshBody(); ground.setDepth(10);

        if (canHaveSpikes && Math.random() < 0.4) {
            const spikeX = this.nextPlatformX + Phaser.Math.Between(-30, 30);
            // Spike sits on top of floor
            const spike = this.spikes.create(spikeX, groundY - 60, 'spike');
            spike.displayWidth = 60; spike.displayHeight = 60;
            spike.refreshBody(); spike.setDepth(10);
            
            const glow = this.add.circle(spikeX, groundY - 50, 30, 0xff0000, 0.3);
            this.tweens.add({ targets: glow, alpha: 0.1, scale: 1.5, duration: 500, yoyo: true, repeat: -1 });
        }
        this.nextPlatformX += 120;
    }

    jump() {
        if (this.jumps < 2 && !this.isDead) {
            this.player.setVelocityY(-700);
            this.jumps++;
            this.jumpSound.play();
            if (this.jumps === 2) {
                this.isFlipping = true;
                this.tweens.add({
                    targets: this.player, angle: 360, duration: 600, ease: 'Cubic.easeOut',
                    onComplete: () => { this.player.setAngle(0); }
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
            this.tweens.add({ targets: this.player, angle: 20, duration: 100, yoyo: true });
            this.time.delayedCall(250, () => {
                this.player.setGravityY(1400);
                this.isDashing = false;
            });
        }
    }

    update() {
        if (this.isDead) return;

        // Speed
        const currentDistance = Math.floor(this.player.x / 100);
        const newSpeedLevel = Math.floor(currentDistance / 500);
        if (newSpeedLevel > this.speedLevel) {
            this.speedLevel = newSpeedLevel;
            this.gameSpeed += 40;
            this.cameras.main.zoomTo(Math.max(0.8, 1 - (this.speedLevel * 0.05)), 1000);
        }
        if (!this.isDashing) this.player.setVelocityX(this.gameSpeed);
        
        // Posture
        if (!this.isFlipping) {
            if (this.player.body.touching.down) {
                this.player.setAngle(0); 
                this.dust.emitParticleAt(this.player.x - 20, this.player.y + 35);
            } else {
                if (this.player.body.velocity.y < 0) this.player.setAngle(-15);
                else this.player.setAngle(10);
            }
        }

        // Parallax
        this.bg.tilePositionX = this.cameras.main.scrollX * 0.5;
        
        // Generator
        if (this.player.x > this.nextPlatformX - 1500) this.spawnPlatform(true);
        
        // UI
        const totalScore = currentDistance + this.score;
        this.scoreText.setText(totalScore);

        // Cleanup
        this.platforms.children.each(c => { if(c.x < this.player.x - 800) c.destroy(); });
        this.spikes.children.each(c => { if(c.x < this.player.x - 800) c.destroy(); });
        
        if (this.player.y > 720 + 200) this.die(); // Fall check against fixed 720p height
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.physics.pause(); 
        this.boomSound.play(); 
        this.cameras.main.shake(500, 0.02);

        this.player.setVisible(false);
        this.trail.stop();
        
        const explosion = this.add.particles(0, 0, 'hero', {
            x: this.player.x, y: this.player.y,
            speed: { min: 50, max: 200 }, angle: { min: 0, max: 360 },
            scale: { start: 0.1, end: 0 }, lifespan: 800, gravityY: 1000, quantity: 50, emitting: false
        });
        explosion.explode();

        const totalScore = Math.floor(this.player.x / 100) + this.score;
        const best = localStorage.getItem('aries_highscore') || 0;
        if (totalScore > best) localStorage.setItem('aries_highscore', totalScore);

        this.time.delayedCall(1000, () => {
            this.scene.pause(); 
            this.scene.launch('GameOver', { score: totalScore, highscore: Math.max(totalScore, best) });
        });
    }
}

// --- SCENE 3: GAME OVER ---
class GameOver extends Phaser.Scene {
    constructor() { super('GameOver'); }

    create(data) {
        const { width, height } = this.scale;
        this.add.rectangle(width/2, height/2, width, height, 0x000000).setAlpha(0.8);

        this.add.text(width/2, height * 0.3, 'SYSTEM FAILURE', {
            fontSize: '70px', fontFamily: 'Arial Black', color: '#ff0055'
        }).setOrigin(0.5).setPostPipeline('BloomPostFX'); 

        this.add.text(width/2, height * 0.45, `SCORE: ${data.score}m`, {
            fontSize: '50px', fontFamily: 'monospace', color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(width/2, height * 0.55, `BEST: ${data.highscore}m`, {
            fontSize: '30px', fontFamily: 'monospace', color: '#00ffff'
        }).setOrigin(0.5);

        const retryBtn = this.add.text(width/2, height * 0.75, '[ TAP TO RETRY ]', {
            fontSize: '40px', fontFamily: 'monospace', color: '#ffffff'
        }).setOrigin(0.5);
        this.tweens.add({ targets: retryBtn, scale: 1.1, duration: 800, yoyo: true, repeat: -1 });

        // Restart
        this.input.on('pointerdown', () => {
            this.scene.stop();
            this.scene.get('GameScene').scene.restart();
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.stop();
            this.scene.get('GameScene').scene.restart();
        });
    }
}

// --- CONFIG (FIXED RESOLUTION) ---
const config = {
    type: Phaser.AUTO,
    // We FORCE the game to be 1280x720.
    // The scale mode 'FIT' will shrink this to fit your phone screen perfectly.
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT, // This is the magic setting
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 }, debug: false } },
    scene: [MainMenu, GameScene, GameOver]
};
const game = new Phaser.Game(config);
