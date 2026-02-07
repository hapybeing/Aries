// --- SCENE 1: MAIN MENU ---
class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        // 1. Cinematic Background
        this.cameras.main.setBackgroundColor('#020205');
        
        // Grid effect
        this.add.grid(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 50, 50, 0x00ffff, 0.1, 0x000000, 0);
        
        // 2. The Title
        const title = this.add.text(this.scale.width/2, this.scale.height * 0.3, 'ARIES', {
            fontSize: '80px',
            fontFamily: 'Arial Black',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Bloom Effect (Safety check included)
        if (title.postFX) {
            title.postFX.addBloom(0xffffff, 1, 1, 2, 1.2);
        }

        // 3. The Guide
        const guideText = "TAP LEFT to JUMP  |  TAP RIGHT to DASH";
        this.add.text(this.scale.width/2, this.scale.height * 0.5, guideText, {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#00ffff'
        }).setOrigin(0.5).setAlpha(0.8);

        // 4. Start Button
        const startBtn = this.add.text(this.scale.width/2, this.scale.height * 0.7, '[ TAP TO START ]', {
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
    constructor() {
        super('GameScene');
    }

    preload() {
        // Generate textures
        const gfx = this.make.graphics({x:0, y:0, add: false});
        
        // Player
        gfx.fillStyle(0xffffff);
        gfx.fillCircle(16, 16, 16);
        gfx.generateTexture('player', 32, 32);

        // Ground
        gfx.clear();
        gfx.fillStyle(0x00ffff);
        gfx.fillRect(0, 0, 32, 32);
        gfx.generateTexture('block', 32, 32);
    }

    create() {
        const { width, height } = this.scale;

        // 1. ENABLE HIGH-END GRAPHICS
        if (this.cameras.main.postFX) {
            this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 1.5, 1.1);
            this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9);
        }

        // 2. PLAYER
        this.player = this.physics.add.sprite(100, height/2, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setGravityY(0); 
        
        // Trail
        this.add.particles(0, 0, 'player', {
            speed: 10,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 300,
            blendMode: 'ADD',
            follow: this.player
        });

        // 3. LEVEL GENERATION
        this.platforms = this.physics.add.staticGroup();
        for(let i=0; i<25; i++) {
            this.platforms.create(i * 60, height - 50, 'block').setScale(2).refreshBody();
        }

        this.physics.add.collider(this.player, this.platforms, () => {
            this.jumps = 0;
        });

        // 4. CONTROLS
        this.input.on('pointerdown', (pointer) => {
            if (pointer.x < width / 2) {
                this.jump();
            } else {
                this.dash();
            }
        });

        this.input.keyboard.on('keydown-SPACE', () => this.jump());
        this.input.keyboard.on('keydown-D', () => this.dash());

        this.jumps = 0;
        this.isDashing = false;
    }

    jump() {
        if (this.jumps < 2) {
            this.player.setVelocityY(-700);
            this.jumps++;
            this.cameras.main.shake(100, 0.005);
            
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
            this.cameras.main.flash(100, 255, 255, 255);
            this.player.setGravityY(-1400);
            this.player.setVelocityX(800);
            
            this.time.delayedCall(200, () => {
                this.player.setVelocityX(0);
                this.player.setGravityY(0);
                this.isDashing = false;
            });
        }
    }

    update() {
        if (this.player.y > this.scale.height) {
            this.scene.restart();
        }
    }
}

// --- CONFIGURATION (MUST BE AT THE BOTTOM) ---
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#050505',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 1400 }, debug: false }
    },
    scene: [MainMenu, GameScene]
};

const game = new Phaser.Game(config);
