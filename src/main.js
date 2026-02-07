// --- SCENE 1: MAIN MENU ---
class MainMenu extends Phaser.Scene {
    constructor() { super('MainMenu'); }

    preload() {
        // LOAD THE BACKGROUND IMAGE
        // We assume the file is named 'bg.png' in the main folder
        this.load.image('bg', 'bg.png');
    }

    create() {
        const { width, height } = this.scale;

        // 1. BACKGROUND (Static in Menu)
        // We use setScrollFactor(0) to lock it, but here we just place it.
        // We use a TileSprite so it can cover any screen size
        this.bg = this.add.tileSprite(width/2, height/2, width, height, 'bg');
        // Dim the background slightly so text pops
        this.bg.setTint(0x888888); 

        // 2. TITLE (With heavy Bloom)
        const title = this.add.text(width/2, height * 0.25, 'ARIES', {
            fontSize: '80px', fontFamily: 'Arial Black', color: '#ffffff'
        }).setOrigin(0.5);
        
        if (title.postFX) title.postFX.addBloom(0xffffff, 1, 1, 2, 1.2);

        // 3. THE NEW CONTROLS GUIDE (Clearer)
        // We draw a visual line to split the screen
        const line = this.add.rectangle(width/2, height * 0.55, 2, 100, 0x00ffff, 0.5);
        
        this.add.text(width * 0.25, height * 0.5, 'LEFT SIDE', {
            fontSize: '24px', fontFamily: 'monospace', color: '#00ffff'
        }).setOrigin(0.5);
        
        this.add.text(width * 0.25, height * 0.58, 'JUMP / FLY', {
            fontSize: '32px', fontFamily: 'Arial Black', color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(width * 0.75, height * 0.5, 'RIGHT SIDE', {
            fontSize: '24px', fontFamily: 'monospace', color: '#ff0055' // Reddish for dash
        }).setOrigin(0.5);
        
        this.add.text(width * 0.75, height * 0.58, 'DASH ATTACK', {
            fontSize: '32px', fontFamily: 'Arial Black', color: '#ffffff'
        }).setOrigin(0.5);

        // 4. START PROMPT
        const startBtn = this.add.text(width/2, height * 0.85, '[ TAP ANYWHERE TO START ]', {
            fontSize: '20px', fontFamily: 'monospace', color: '#ffffff'
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

    // No preload needed here, assets are global once loaded in Menu

    create() {
        const { width, height } = this.scale;

        // 1. PARALLAX BACKGROUND
        // TileSprite allows us to scroll the image infinitely
        this.bg = this.add.tileSprite(width/2, height/2, width, height, 'bg');
        this.bg.setScrollFactor(0); // Fixes it to camera
        
        // 2. POST-PROCESSING
        if (this.cameras.main.postFX) {
            this.cameras.main.postFX.addBloom(0xffffff, 0.8, 0.8, 1.5, 1.1);
            this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9);
        }

        // 3. PLAYER GENERATION (Procedural)
        const gfx = this.make.graphics({x:0, y:0, add: false});
        gfx.fillStyle(0xffffff); gfx.fillCircle(16, 16, 16);
        gfx.generateTexture('player', 32, 32);

        gfx.clear(); gfx.fillStyle(0x00ffff); gfx.fillRect(0, 0, 32, 32);
        gfx.generateTexture('block', 32, 32);

        gfx.clear(); gfx.fillStyle(0xff0055); // Matching the Dash text color
        gfx.beginPath(); gfx.moveTo(16,0); gfx.lineTo(32,32); gfx.lineTo(0,32); gfx.closePath();
        gfx.fillPath();
        gfx.generateTexture('spike', 32, 32);

        // 4. ENTITIES
        this.player = this.physics.add.sprite(200, 300, 'player');
        this.player.setGravityY(1400); 
        this.player.setDepth(10); // Ensure player is in front of background
        
        // Trail
        this.add.particles(0, 0, 'player', {
            speed: 10, scale: { start: 0.5, end: 0 }, alpha: { start: 0.5, end: 0 },
            lifespan: 300, blendMode: 'ADD', follow: this.player
        }).setDepth(9);

        this.platforms = this.physics.add.staticGroup();
        this.spikes = this.physics.add.staticGroup();

        // Level Setup
        this.nextPlatformX = 0;
        for(let i=0; i<15; i++) this.spawnPlatform(false);

        // Colliders
        this.physics.add.collider(this.player, this.platforms, () => { this.jumps = 0; });
        this.physics.add.collider(this.player, this.spikes, () => { this.gameOver(); });

        // Controls
        this.input.on('pointerdown', (pointer) => {
            if (pointer.x < width / 2) this.jump();
            else this.dash();
        });

        // Camera
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setFollowOffset(-200, 150);

        // UI
        this.scoreText = this.add.text(50, 50, '0', {
            fontSize: '40px', fontFamily: 'Arial Black', color: '#ffffff'
        }).setScrollFactor(0).setDepth(20);

        this.jumps = 0;
        this.isDashing = false;
        this.isDead = false;
    }

    spawnPlatform(canHaveSpikes) {
        const ground = this.platforms.create(this.nextPlatformX, this.scale.height - 50, 'block');
        ground.setScale(4, 1).refreshBody(); 
        ground.setDepth(10); // In front of BG

        if (canHaveSpikes && Math.random() < 0.4) {
            const spikeX = this.nextPlatformX + Phaser.Math.Between(-50, 50);
            const spike = this.spikes.create(spikeX, this.scale.height - 85, 'spike');
            spike.setScale(1).refreshBody();
            spike.setDepth(10);
        }
        this.nextPlatformX += 120;
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
            this.player.setVelocityX(900);
            this.cameras.main.flash(50, 0, 255, 255); // Cyan flash
            
            this.time.delayedCall(200, () => {
                this.player.setGravityY(1400);
                this.isDashing = false;
            });
        }
    }

    update() {
        if (this.isDead) return;

        // 1. Move Player
        if (!this.isDashing) this.player.setVelocityX(400);

        // 2. PARALLAX EFFECT (The "Award Winning" look)
        // We move the background texture slowly as the camera moves
        this.bg.tilePositionX = this.cameras.main.scrollX * 0.5; // Moves at half speed of player

        // 3. Level Generation
        if (this.player.x > this.nextPlatformX - 1000) this.spawnPlatform(true);

        // 4. Cleanup
        this.platforms.children.each(c => { if(c.x < this.player.x - 800) c.destroy(); });
        this.spikes.children.each(c => { if(c.x < this.player.x - 800) c.destroy(); });

        if (this.player.y > this.scale.height + 100) this.gameOver();

        this.scoreText.setText(Math.floor(this.player.x / 100));
    }

    gameOver() {
        if (this.isDead) return;
        this.isDead = true;
        this.cameras.main.shake(500, 0.02);
        this.player.setTint(0xff0055);
        this.time.delayedCall(1000, () => this.scene.start('MainMenu'));
    }
}

// --- CONFIG ---
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#000000', // Black, so the image sits on top
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 }, debug: false } },
    scene: [MainMenu, GameScene]
};
const game = new Phaser.Game(config);
