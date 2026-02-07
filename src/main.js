// CONFIGURATION
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#050505',
    scale: {
        mode: Phaser.Scale.RESIZE, // Resizes game when you rotate tablet
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 1400 }, debug: false }
    },
    scene: [MainMenu, GameScene] // We now have multiple scenes
};

const game = new Phaser.Game(config);

// --- SCENE 1: MAIN MENU ---
class MainMenu extends Phaser.Scene {
    constructor() { super('MainMenu'); }

    create() {
        // 1. Cinematic Background
        this.cameras.main.setBackgroundColor('#020205');
        
        // Add a "Grid" effect for that retro-future vibe
        const grid = this.add.grid(config.width/2, config.height/2, config.width, config.height, 50, 50, 0x00ffff, 0.1, 0x000000, 0);
        
        // 2. The Title (With Glow)
        const title = this.add.text(config.width/2, config.height * 0.3, 'ARIES', {
            fontSize: '80px',
            fontFamily: 'Arial Black',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Add Bloom to Title (The 2026 look)
        title.postFX.addBloom(0xffffff, 1, 1, 2, 1.2);

        // 3. The Guide
        const guideText = "TAP LEFT to JUMP  |  TAP RIGHT to DASH";
        this.add.text(config.width/2, config.height * 0.5, guideText, {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#00ffff'
        }).setOrigin(0.5).setAlpha(0.8);

        // 4. Start Button (Pulsing)
        const startBtn = this.add.text(config.width/2, config.height * 0.7, '[ TAP TO START ]', {
            fontSize: '24px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: startBtn,
            alpha: 0.5,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // Interaction
        this.input.on('pointerdown', () => {
            this.cameras.main.fade(500, 0, 0, 0);
            this.time.delayedCall(500, () => this.scene.start('GameScene'));
        });
    }
}

// --- SCENE 2: THE GAME ---
class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    preload() {
        // Generate textures procedurally (No download needed)
        const gfx = this.make.graphics({x:0, y:0, add: false});
        
        // Player: A glowing diamond
        gfx.fillStyle(0xffffff);
        gfx.fillCircle(16, 16, 16);
        gfx.generateTexture('player', 32, 32);

        // Ground: Neon blocks
        gfx.clear();
        gfx.fillStyle(0x00ffff);
        gfx.fillRect(0, 0, 32, 32);
        gfx.generateTexture('block', 32, 32);
    }

    create() {
        // 1. ENABLE HIGH-END GRAPHICS
        // Bloom: Makes bright things glow
        this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 1.5, 1.1);
        // Vignette: Darkens corners for focus
        this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9);

        // 2. PLAYER
        this.player = this.physics.add.sprite(100, config.height/2, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setGravityY(0); // Gravity kicks in after start
        
        // Trail Effect (GPU Particles)
        const particles = this.add.particles(0, 0, 'player', {
            speed: 10,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 300,
            blendMode: 'ADD',
            follow: this.player
        });

        // 3. LEVEL GENERATION (Infinite Floor)
        this.platforms = this.physics.add.staticGroup();
        // Create initial floor
        for(let i=0; i<20; i++) {
            this.platforms.create(i * 60, config.height - 50, 'block').setScale(2).refreshBody();
        }

        this.physics.add.collider(this.player, this.platforms, () => {
            this.jumps = 0; // Reset jumps on touch
        });

        // 4. CONTROLS (Split Screen Touch)
        this.input.on('pointerdown', (pointer) => {
            if (pointer.x < config.width / 2) {
                this.jump();
            } else {
                this.dash();
            }
        });

        // Keyboard backup
        this.input.keyboard.on('keydown-SPACE', () => this.jump());
        this.input.keyboard.on('keydown-D', () => this.dash());

        this.jumps = 0;
        this.isDashing = false;
    }

    jump() {
        if (this.jumps < 2) {
            this.player.setVelocityY(-700);
            this.jumps++;
            
            // Camera Shake for impact
            this.cameras.main.shake(100, 0.005);
            
            // Squash animation
            this.tweens.add({
                targets: this.player,
                scaleX: 0.6, scaleY: 1.4,
                duration: 100, yoyo: true
            });
        }
    }

    dash() {
        if (!this.isDashing) {
            this.isDashing = true;
            const originalX = this.player.x;
            
            // Flash effect
            this.cameras.main.flash(100, 255, 255, 255);
            
            // Dash Physics
            this.player.setGravityY(-1400); // Defy gravity
            this.player.setVelocityX(800);
            
            this.time.delayedCall(200, () => {
                this.player.setVelocityX(0);
                this.player.setGravityY(0);
                this.isDashing = false;
            });
        }
    }

    update() {
        // Player constantly runs to the right (simulated by camera)
        // For this prototype, we keep player still and will move world later.
        
        // Respawn if falls
        if (this.player.y > config.height) {
            this.scene.restart();
        }
    }
}

