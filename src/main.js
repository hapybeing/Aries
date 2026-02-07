// --- SCENE 1: MAIN MENU ---
class MainMenu extends Phaser.Scene {
    constructor() { super('MainMenu'); }

    preload() {
        // --- NEW: LOADING SCREEN ---
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const loadingText = this.make.text({
            x: width / 2, y: height / 2,
            text: 'LOADING SYSTEM...',
            style: { font: '20px monospace', fill: '#ffffff' }
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            loadingText.setText(`LOADING... ${parseInt(value * 100)}%`);
        });

        this.load.on('complete', () => {
            loadingText.destroy();
        });
        // ---------------------------

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
        
        // Dynamic Scale Factor
        const s = Math.min(width / 800, height / 600); 

        const title = this.add.text(width/2, height * 0.25, 'ARIES', {
            fontSize: `${80 * s}px`, fontFamily: 'Arial Black', color: '#ffffff'
        }).setOrigin(0.5);
        if (title.postFX) title.postFX.addBloom(0xffffff, 1, 1, 2, 1.2);

        const highScore = localStorage.getItem('aries_highscore') || 0;
        this.add.text(width/2, height * 0.35, `BEST RUN: ${highScore}m`, {
            fontSize: `${24 * s}px`, fontFamily: 'monospace', color: '#00ffff'
        }).setOrigin(0.5);

        const guideY = height * 0.55;
        this.add.rectangle(width/2, guideY + 10, 2, 100 * s, 0x00ffff, 0.3);

        const bigFont = `${Math.max(24, 32 * s)}px`;
        const smallFont = `${Math.max(16, 20 * s)}px`;

        // Controls Text (Mobile + PC)
        this.add.text(width * 0.25, guideY - 30 * s, 'LEFT / SPACE', { fontSize: smallFont, fontFamily: 'monospace', color: '#00ffff' }).setOrigin(0.5);
        this.add.text(width * 0.25, guideY + 10 * s, 'JUMP', { fontSize: bigFont, fontFamily: 'Arial Black', color: '#ffffff' }).setOrigin(0.5);

        this.add.text(width * 0.75, guideY - 30 * s, 'RIGHT / D', { fontSize: smallFont, fontFamily: 'monospace', color: '#ff0055' }).setOrigin(0.5);
        this.add.text(width * 0.75, guideY + 10 * s, 'ATTACK', { fontSize: bigFont, fontFamily: 'Arial Black', color: '#ffffff' }).setOrigin(0.5);

        const startBtn = this.add.text(width/2, height * 0.85, '[ TAP TO START ]', {
            fontSize: `${24 * s}px`, fontFamily: 'monospace', color: '#ffffff'
        }).setOrigin(0.5);
        this.tweens.add({ targets: startBtn, alpha: 0.5, duration: 800, yoyo: true, repeat: -1 });

        // Inputs
        this.input.on('pointerdown', () => this.scene.start('GameScene'));
        this.input.keyboard.on('keydown-SPACE', () => this.scene.start('GameScene'));
        this.input.keyboard.on('keydown-ENTER', () => this.scene.start('GameScene'));

        // Rotation Check
        this.events.on('resize', this.checkOrientation, this);
        this.checkOrientation();
    }

    checkOrientation() {
        const { width, height } = this.scale;
        if (height > width) {
            if (!this.warningGroup) {
                this.warningGroup = this.add.container();
                const bg = this.add.rectangle(width/2, height/2, width, height, 0x000000).setOrigin(0.5);
                const txt = this.add.text(width/2, height/2, "PLEASE ROTATE\nDEVICE ↻", {
                    fontSize: '40px', fontFamily: 'Arial Black', color: '#ffffff', align: 'center'
                }).setOrigin(0.5);
                this.warningGroup.add([bg, txt]);
                this.scene.pause();
            }
            this.warningGroup.setVisible(true);
            this.warningGroup.getAll()[0].setSize(width, height);
            this.warningGroup.getAll()[0].setPosition(width/2, height/2);
            this.warningGroup.getAll()[1].setPosition(width/2, height/2);
        } else {
            if (this.warningGroup) {
                this.warningGroup.setVisible(false);
                this.scene.resume();
            }
        }
    }
}

// --- SCENE 2: THE GAME ---
class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    create() {
        const { width, height } = this.scale;

        if (!this.sound.get('music')) {
            this.music = this.sound.add('music', { loop: true, volume: 0.5 });
            this.music.play();
        }
        this.jumpSound = this.sound.add('jump', { volume: 0.4 });
        this.boomSound = this.sound.add('boom', { volume: 0.6 });

        this.bg = this.add.tileSprite(width/2, height/2, width, height, 'bg').setScrollFactor(0);
        if (this.cameras.main.postFX) {
            this.cameras.main.postFX.addBloom(0xffffff, 0.6, 0.6, 1.2, 1.0);
            this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9);
        }

        this.player = this.physics.add.sprite(200, 300, 'hero');
        this.player.setScale(0.15); 
        this.player.setGravityY(1400);
        this.player.setDepth(10);
        this.player.body.setSize(this.player.width * 0.4, this.player.height * 0.5);
        this.player.body.setOffset(this.player.width * 0.3, this.player.height * 0.25);

        this.trail = this.add.particles(0, 0, 'hero', {
            speed: 10, scale: { start: 0.15, end: 0 }, alpha: { start: 0.3, end: 0 },
            lifespan: 200, blendMode: 'ADD', follow: this.player, followOffset: { x: -20, y: 0 } 
        }).setDepth(9);

        const dustGfx = this.make.graphics({x:0, y:0, add:false});
        dustGfx.fillStyle(0xffffff); dustGfx.fillCircle(4,4,4);
        dustGfx.generateTexture('dust', 8, 8);
        this.dust = this.add.particles(0, 0, 'dust', {
            speed: { min: -100, max: 0 }, angle: { min: 180, max: 200 },
            scale: { start: 0.5, end: 0 }, alpha: { start: 0.5, end: 0 },
            lifespan: 300, gravityY: -100, emitting: false
        });

        this.platforms = this.physics.add.staticGroup();
        this.spikes = this.physics.add.staticGroup();
        this.nextPlatformX = 0;
        for(let i=0; i<15; i++) this.spawnPlatform(false);

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

        // --- CONTROLS ---
        this.input.on('pointerdown', (pointer) => {
            if (this.isDead) return;
            // On mobile, simple tap logic
            if (pointer.x < width / 2) this.jump();
            else this.dash();
        });

        // PC KEYBOARD SUPPORT
        this.input.keyboard.on('keydown-SPACE', () => this.jump());
        this.input.keyboard.on('keydown-UP', () => this.jump());
        this.input.keyboard.on('keydown-W', () => this.jump());
        this.input.keyboard.on('keydown-D', () => this.dash());
        this.input.keyboard.on('keydown-RIGHT', () => this.dash());

        // --- CAMERA FIX FOR MOBILE ---
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        
        // ** THE FIX **
        // Instead of hardcoding 150px, we use a percentage of the screen height.
        // On a 360px high phone, 0.1 = 36px offset. This keeps player centered.
        this.cameras.main.setFollowOffset(-200, height * 0.1);

        this.scoreText = this.add.text(50, 50, '0', {
            fontSize: '40px', fontFamily: 'Arial Black', color: '#ffffff'
        }).setScrollFactor(0).setDepth(20);

        this.jumps = 0;
        this.isDashing = false;
        this.isDead = false;
        this.isFlipping = false;
        this.score = 0;
        this.gameSpeed = 400;
        this.speedLevel = 0;

        this.tweens.add({
            targets: this.player, scaleY: 0.14, scaleX: 0.16, duration: 150, yoyo: true, repeat: -1
        });

        this.events.on('resize', this.checkOrientation, this);
        this.checkOrientation();
    }

    checkOrientation() {
        const { width, height } = this.scale;
        if (height > width && !this.isDead) {
            this.scene.pause();
            this.physics.pause();
        } else if (height < width && !this.isDead) {
            this.scene.resume();
            this.physics.resume();
        }
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

        const currentDistance = Math.floor(this.player.x / 100);
        const newSpeedLevel = Math.floor(currentDistance / 500);
        if (newSpeedLevel > this.speedLevel) {
            this.speedLevel = newSpeedLevel;
            this.gameSpeed += 40;
            this.cameras.main.zoomTo(Math.max(0.8, 1 - (this.speedLevel * 0.05)), 1000);
        }

        if (!this.isDashing) this.player.setVelocityX(this.gameSpeed);
        
        if (!this.isFlipping) {
            if (this.player.body.touching.down) {
                this.player.setAngle(0); 
                this.dust.emitParticleAt(this.player.x - 20, this.player.y + 35);
            } else {
                if (this.player.body.velocity.y < 0) this.player.setAngle(-15);
                else this.player.setAngle(10);
            }
        }

        this.bg.tilePositionX = this.cameras.main.scrollX * 0.5;
        if (this.player.x > this.nextPlatformX - 1500) this.spawnPlatform(true);
        const totalScore = currentDistance + this.score;
        this.scoreText.setText(totalScore);

        this.platforms.children.each(c => { if(c.x < this.player.x - 800) c.destroy(); });
        this.spikes.children.each(c => { if(c.x < this.player.x - 800) c.destroy(); });
        
        if (this.player.y > this.scale.height + 100) this.die();
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

        const s = Math.min(width / 800, height / 600);
        
        this.add.text(width/2, height * 0.3, 'SYSTEM FAILURE', {
            fontSize: `${50 * s}px`, fontFamily: 'Arial Black', color: '#ff0055'
        }).setOrigin(0.5).setPostPipeline('BloomPostFX'); 

        this.add.text(width/2, height * 0.45, `SCORE: ${data.score}m`, {
            fontSize: `${40 * s}px`, fontFamily: 'monospace', color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(width/2, height * 0.55, `BEST: ${data.highscore}m`, {
            fontSize: `${24 * s}px`, fontFamily: 'monospace', color: '#00ffff'
        }).setOrigin(0.5);

        const retryBtn = this.add.text(width/2, height * 0.75, '[ TAP TO RETRY ]', {
            fontSize: `${30 * s}px`, fontFamily: 'monospace', color: '#ffffff'
        }).setOrigin(0.5);

        this.tweens.add({ targets: retryBtn, scale: 1.1, duration: 800, yoyo: true, repeat: -1 });

        this.input.on('pointerdown', () => {
            this.scene.stop();
            this.scene.get('GameScene').scene.restart();
        });
        
        // PC Spacebar Restart
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.stop();
            this.scene.get('GameScene').scene.restart();
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#000000',
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 }, debug: false } },
    scene: [MainMenu, GameScene, GameOver]
};
const game = new Phaser.Game(config);
