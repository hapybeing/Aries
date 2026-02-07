const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#050505',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 1200 }, debug: false }
    },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player;
let platforms;
let cursors;
let jumpCount = 0;

function preload() {}

function create() {
    // 1. MAKE GRAPHICS (Procedural Textures)
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Player Texture (Glowing Diamond)
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.generateTexture('playerTex', 20, 20);
    
    // Particle Texture (Soft Glow)
    graphics.clear();
    graphics.fillStyle(0x00ffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('particleTex', 8, 8);

    // 2. WORLD
    platforms = this.physics.add.staticGroup();
    // A floor that looks like a neon line
    let ground = this.add.rectangle(config.width/2, config.height - 20, config.width, 40, 0x00ffff).setOrigin(0.5);
    this.physics.add.existing(ground, true);
    platforms.add(ground);

    // Background Dust Particles
    const dust = this.add.particles(0, 0, 'particleTex', {
        x: { min: 0, max: config.width },
        y: { min: 0, max: config.height },
        quantity: 50,
        lifespan: 4000,
        gravityY: -10,
        scale: { start: 0.2, end: 0 },
        alpha: { start: 0.5, end: 0 },
        blendMode: 'ADD'
    });

    // 3. PLAYER (ARIES)
    player = this.physics.add.sprite(100, 450, 'playerTex');
    player.setBounce(0.0);
    player.setCollideWorldBounds(true);
    
    // The Trail (Cinematic Effect)
    const trail = this.add.particles(0, 0, 'particleTex', {
        speed: 20,
        scale: { start: 1, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: 400,
        blendMode: 'ADD',
        follow: player
    });

    this.physics.add.collider(player, platforms, () => {
        jumpCount = 0; 
    });

    cursors = this.input.keyboard.createCursorKeys();

    // 4. GUI
    this.add.text(20, 20, 'ARIES: VISUAL UPGRADE', { 
        fontSize: '20px', 
        color: '#00ffff',
        fontFamily: 'monospace' 
    });
}

function update() {
    const isTouchingDown = player.body.touching.down;

    // Auto-Run Effect (The world moves, player stays)
    // We will simulate speed later, for now just controls.

    // Jump Logic (Double Jump enabled)
    if (Phaser.Input.Keyboard.JustDown(cursors.up) || this.input.activePointer.isDown) {
        // Reset pointer to prevent machine-gun jumping on touch
        this.input.activePointer.isDown = false; 

        if (isTouchingDown || jumpCount < 2) {
            player.setVelocityY(-600);
            jumpCount++;
            
            // "Squash" animation on jump
            this.tweens.add({
                targets: player,
                scaleX: 0.6,
                scaleY: 1.4,
                duration: 100,
                yoyo: true
            });
        }
    }
}

