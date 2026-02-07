// The Game Configuration
const config = {
    type: Phaser.AUTO, // Uses WebGL if available, falls back to Canvas
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#1a1a2e', // A moody dark blue-purple
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 900 }, // High gravity for snappy jumps
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Initialize the Game
const game = new Phaser.Game(config);

// VARIABLES
let player;
let platforms;
let cursors;

// 1. PRELOAD (Load assets)
function preload() {
    // We will load real images later. For now, we generate graphics via code.
}

// 2. CREATE (Setup the scene)
function create() {
    // Create a floor
    platforms = this.physics.add.staticGroup();
    let ground = this.add.rectangle(config.width/2, config.height - 50, config.width, 60, 0x0f3460).setOrigin(0.5);
    this.physics.add.existing(ground, true); // true = static (doesn't move)
    platforms.add(ground);

    // Create the Player (Aries) - A glowing white box for now
    player = this.add.rectangle(100, 450, 40, 40, 0xffffff);
    this.physics.add.existing(player);
    
    // Physics properties for the player
    player.body.setBounce(0.1);
    player.body.setCollideWorldBounds(true);

    // Add collision between player and floor
    this.physics.add.collider(player, platforms);

    // Add a simple "Glow" effect (The Cinematic Touch)
    player.postFX = player.postFX || {}; // Safety check
    // Note: FX might not show on all mobile browsers yet, but we'll try basic tint first.
    
    // Controls (Touch + Keyboard)
    cursors = this.input.keyboard.createCursorKeys();
    
    // Text to prove it works
    this.add.text(config.width/2, 100, 'ARIES: SYSTEM ONLINE', { 
        fontSize: '32px', 
        fill: '#e94560',
        fontFamily: 'monospace'
    }).setOrigin(0.5);
}

// 3. UPDATE (The game loop - runs 60 times per second)
function update() {
    // Simple Jump Logic
    const touchingDown = player.body.touching.down || player.body.onFloor();

    // Jump on Tap or Space
    if ((this.input.activePointer.isDown || cursors.up.isDown) && touchingDown) {
        player.body.setVelocityY(-500);
    }
}
