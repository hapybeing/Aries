// --- SCENE 1: MAIN MENU ---
class MainMenu extends Phaser.Scene {
    constructor() { super('MainMenu'); }

    create() {
        this.cameras.main.setBackgroundColor('#020205');
        this.add.grid(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 50, 50, 0x00ffff, 0.1, 0x000000, 0);
        
        const title = this.add.text(this.scale.width/2, this.scale.height * 0.3, 'ARIES', {
            fontSize: '80px', fontFamily: 'Arial Black', color: '#ffffff'
        }).setOrigin(0.5);
        
        if (title.postFX) title.postFX.addBloom(0xffffff, 1, 1, 2, 1.2);

        this.add.text(this.scale.width/2, this.scale.height * 0.5, "DODGE THE RED CRYSTALS", {
            fontSize: '18px', fontFamily: 'monospace', color: '#00ffff'
        }).setOrigin(0.5).setAlpha(0.8);

        const startBtn = this.add.text(this.scale.width/2, this.scale.height * 0.7, '[ TAP TO START ]', {
            fontSize: '24px', fontFamily: 'monospace', color: '#ffffff'
        }).setOrigin(0.5);

        this.tweens.add({ targets: startBtn, alpha: 0.5, duration: 800, yoyo: true, repeat: -1 });

        this.input.on('pointerdown', () => {
            this.scene.start('GameScene');
        });
    }
}

// --- SCENE 2: THE GAME ---
class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    preload() {
        const gfx = this.make.graphics({x:0, y:0, add: false});
        
        // Player (White Neon)
        gfx.fillStyle(0xffffff); gfx.fillCircle(16, 16, 16);
        gfx.generateTexture('player', 32, 32);

        // Ground (Cyan Neon)
        gfx.clear(); gfx.fillStyle(0x00ffff); gfx.fillRect(0, 0, 32, 32);
        gfx.generateTexture('block', 32, 32);

        // OBSTACLE (Red Danger)
        gfx.clear(); gfx.fillStyle(0xff0000); 
        gfx.beginPath(); gfx.moveTo(16,0); gfx.lineTo(32,32); gfx.lineTo(0,32); gfx.closePath();
        gfx.fillPath();
        gfx.generateTexture('spike', 32, 32);
    }

    create() {
        // VISUALS
        if (this.cameras.main.postFX) {
            this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 1.5, 1.1);
            this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9);
        }

        // PLAYER
        this.player = this.physics.add.sprite(200, 300, 'player');
        this.player.setGravityY(1400); 
        
        // PLAYER TRAIL
        this.add.particles(0, 0, 'player', {
            speed: 10, scale: { start: 0.5, end: 0 }, alpha: { start: 0.5, end: 0 },
            lifespan: 300, blendMode: 'ADD', follow: this.player
        });

        // GROUPS
        this.platforms = this.physics.add.staticGroup();
        this.spikes = this.physics.add.staticGroup();

        // GENERATE INITIAL GROUND
        this.nextPlatformX = 0;
        for(let i=0; i<15; i++) {
            this.spawnPlatform(false); // false = no spikes on first few blocks
        }

        // COLLISIONS
        this.physics.add.collider(this.player, this.platforms, () => { this.jumps = 0; });
        this.physics.add.collider(this.player, this.spikes, () => { this.gameOver(); });

        // CONTROLS
        this.input.on('pointerdown', (pointer) => {
            if (pointer.x < this.scale.width / 2) this.jump();
            else this.dash();
        });
        
        // CAMERA
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setFollowOffset(-200, 100);

        // SCORE
        this.scoreText = this.add.text(50, 50, '0', {
            fontSize: '40px', fontFamily: 'Arial Black', color: '#ffffff'
        }).setScrollFactor(0); // Sticks to screen

        this.jumps = 0;
        this.isDashing = false;
        this.isDead = false;
    }

    spawnPlatform(canHaveSpikes) {
        // Create a block
        const ground = this.platforms.create(this.nextPlatformX, this.scale.height - 50, 'block');
        ground.setScale(4, 1).refreshBody(); // 4x wide

        // Chance to spawn Spike
        if (canHaveSpikes && Math.random() < 0.4) { // 40% chance
            const spikeX = this.nextPlatformX + Phaser.Math.Between(-50, 50);
            this.spikes.create(spikeX, this.scale.height - 85, 'spike').setScale(1).refreshBody();
        }

        this.nextPlatformX += 120; // Move x marker forward
    }

    jump() {
        if (this.jumps < 2 && !this.isDead) {
            this.player.setVelocityY(-700);
            this.jumps++;
            this.cameras.main.shake(50, 0.005);
        }
    }

    dash() {
        if (!this.isDashing && !this.isDead) {
            this.isDashing = true;
            this.player.setGravityY(-1400);
            this.player.setVelocityX(900); // Speed boost
            this.time.delayedCall(200, () => {
                this.player.setGravityY(1400);
                this.isDashing = false;
            });
        }
    }

    update() {
        if (this.isDead) return;

        // Constant Running Speed
        if (!this.isDashing) {
            this.player.setVelocityX(400);
        }

        // Infinite Level Generation
        if (this.player.x > this.nextPlatformX - 1000) {
            this.spawnPlatform(true);
        }

        // Cleanup (Performance)
        this.platforms.children.each((child) => {
            if (child.x < this.player.x - 600) child.destroy();
        });
        this.spikes.children.each((child) => {
            if (child.x < this.player.x - 600) child.destroy();
        });

        // Death Check (Falling)
        if (this.player.y > this.scale.height + 100) {
            this.gameOver();
        }

        // Update Score
        this.scoreText.setText(Math.floor(this.player.x / 100));
    }

    gameOver() {
        if (this.isDead) return;
        this.isDead = true;
        this.cameras.main.shake(500, 0.02);
        this.physics.pause();
        this.player.setTint(0xff0000);
        
        this.time.delayedCall(1000, () => {
            this.scene.start('MainMenu');
        });
    }
}

// --- CONFIG ---
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#050505',
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 }, debug: false } },
    scene: [MainMenu, GameScene]
};
const game = new Phaser.Game(config);
