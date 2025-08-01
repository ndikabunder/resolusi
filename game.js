// Game state and constants
const GAME_STATES = {
    MENU: 'menu',
    TUTORIAL: 'tutorial',
    PLAYING: 'playing',
    SHOP: 'shop',
    GAME_OVER: 'game_over'
};

const GLYPH_TYPES = {
    STASIS: 0,
    SUNDERING: 1,
    WARDING: 2,
    HASTE: 3
};

const ENEMY_TYPES = {
    SKITTERLING: 0,
    SHADOW_BRUTE: 1,
    UMBRAL_MAGE: 2,
    VOID_CREEPER: 3
};

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = GAME_STATES.MENU;
        
        // Game objects
        this.player = null;
        this.enemies = [];
        this.arrows = [];
        this.glyphs = [];
        this.particles = [];
        
        // Game stats
        this.wave = 1;
        this.lumen = 0;
        this.totalKills = 0;
        this.totalLumen = 0;
        this.coreHealth = 100;
        this.maxCoreHealth = 100;
        
        // Wave management
        this.waveActive = false;
        this.wavePrepTime = 5000; // 5 seconds
        this.waveStartTime = 0;
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = 0;
        this.spawnRate = 1000; // 1 enemy per second
        this.lastSpawnTime = 0;
        
        // Input handling
        this.keys = {};
        this.mouse = { x: 0, y: 0, clicked: false };
        
        // Canvas settings
        this.canvas.width = 1200;
        this.canvas.height = 800;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initPlayer();
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Menu buttons
        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        document.getElementById('show-tutorial').addEventListener('click', () => this.showTutorial());
        document.getElementById('back-to-menu').addEventListener('click', () => this.showMenu());
        document.getElementById('continue-game').addEventListener('click', () => this.continueFromShop());
        document.getElementById('restart-game').addEventListener('click', () => this.restartGame());
        document.getElementById('back-to-main').addEventListener('click', () => this.showMenu());
        
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.handleKeyPress(e.code);
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse input
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.mouse.clicked = true;
                this.handleMouseClick();
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.clicked = false;
            }
        });
        
        // Shop buttons
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.shop-item').dataset.item;
                this.buyItem(item);
            });
        });
    }
    
    handleKeyPress(code) {
        if (this.state !== GAME_STATES.PLAYING) return;
        
        // Glyph placement
        switch(code) {
            case 'Digit1':
                this.placeGlyph(GLYPH_TYPES.STASIS);
                break;
            case 'Digit2':
                this.placeGlyph(GLYPH_TYPES.SUNDERING);
                break;
            case 'Digit3':
                this.placeGlyph(GLYPH_TYPES.WARDING);
                break;
            case 'Digit4':
                this.placeGlyph(GLYPH_TYPES.HASTE);
                break;
            case 'Space':
                this.useSpecialAbility();
                break;
        }
    }
    
    handleMouseClick() {
        if (this.state === GAME_STATES.PLAYING && this.player) {
            this.player.shoot(this.mouse.x, this.mouse.y);
        }
    }
    
    initPlayer() {
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
    }
    
    startGame() {
        this.state = GAME_STATES.PLAYING;
        this.showScreen('game-screen');
        this.resetGameStats();
        this.startWave();
    }
    
    showTutorial() {
        this.showScreen('tutorial-screen');
    }
    
    showMenu() {
        this.state = GAME_STATES.MENU;
        this.showScreen('title-screen');
    }
    
    showShop() {
        this.state = GAME_STATES.SHOP;
        this.showScreen('shop-screen');
        this.updateShopUI();
    }
    
    continueFromShop() {
        this.state = GAME_STATES.PLAYING;
        this.showScreen('game-screen');
        this.startWave();
    }
    
    restartGame() {
        this.resetGameStats();
        this.startGame();
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
    
    resetGameStats() {
        this.wave = 1;
        this.lumen = 0;
        this.totalKills = 0;
        this.totalLumen = 0;
        this.coreHealth = this.maxCoreHealth;
        this.enemies = [];
        this.arrows = [];
        this.glyphs = [];
        this.particles = [];
        this.initPlayer();
        this.player.reset();
    }
    
    startWave() {
        this.waveActive = false;
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = Math.floor(5 + this.wave * 2.5); // Increase enemies each wave
        this.spawnRate = Math.max(500, 1000 - this.wave * 30); // Faster spawning each wave
        
        // Show wave announcement
        this.showWaveAnnouncement();
        
        setTimeout(() => {
            this.waveActive = true;
            this.waveStartTime = Date.now();
            this.lastSpawnTime = Date.now();
        }, this.wavePrepTime);
    }
    
    showWaveAnnouncement() {
        const announcement = document.getElementById('wave-announcement');
        const title = document.getElementById('wave-title');
        const subtitle = document.getElementById('wave-subtitle');
        
        title.textContent = `Wave ${this.wave} Incoming!`;
        subtitle.textContent = `${this.enemiesToSpawn} enemies approach`;
        
        announcement.classList.add('show');
        
        setTimeout(() => {
            announcement.classList.remove('show');
        }, 3000);
    }
    
    spawnEnemy() {
        if (!this.waveActive || this.enemiesSpawned >= this.enemiesToSpawn) return;
        
        const now = Date.now();
        if (now - this.lastSpawnTime < this.spawnRate) return;
        
        const type = this.getRandomEnemyType();
        const enemy = new Enemy(type, this.wave);
        
        // Spawn from random edge
        const edge = Math.floor(Math.random() * 4);
        switch(edge) {
            case 0: // Top
                enemy.x = Math.random() * this.canvas.width;
                enemy.y = -enemy.radius;
                break;
            case 1: // Right
                enemy.x = this.canvas.width + enemy.radius;
                enemy.y = Math.random() * this.canvas.height;
                break;
            case 2: // Bottom
                enemy.x = Math.random() * this.canvas.width;
                enemy.y = this.canvas.height + enemy.radius;
                break;
            case 3: // Left
                enemy.x = -enemy.radius;
                enemy.y = Math.random() * this.canvas.height;
                break;
        }
        
        this.enemies.push(enemy);
        this.enemiesSpawned++;
        this.lastSpawnTime = now;
    }
    
    getRandomEnemyType() {
        const rand = Math.random();
        if (rand < 0.5) return ENEMY_TYPES.SKITTERLING;
        if (rand < 0.7) return ENEMY_TYPES.SHADOW_BRUTE;
        if (rand < 0.9) return ENEMY_TYPES.UMBRAL_MAGE;
        return ENEMY_TYPES.VOID_CREEPER;
    }
    
    placeGlyph(type) {
        if (this.player.glyphCounts[type] <= 0) return;
        
        const glyph = new Glyph(type, this.mouse.x, this.mouse.y);
        this.glyphs.push(glyph);
        this.player.glyphCounts[type]--;
        this.updateGlyphUI();
    }
    
    useSpecialAbility() {
        if (this.player.specialCooldown <= 0) {
            this.player.useSpecialAbility(this.enemies);
            this.updateAbilityUI();
        }
    }
    
    checkWaveComplete() {
        if (this.waveActive && this.enemiesSpawned >= this.enemiesToSpawn && this.enemies.length === 0) {
            this.waveActive = false;
            this.wave++;
            
            // Award lumen for completing wave
            const waveBonus = Math.floor(50 + this.wave * 10);
            this.lumen += waveBonus;
            this.totalLumen += waveBonus;
            
            // Show shop every few waves or if player needs supplies
            if (this.wave % 3 === 0 || this.player.health < 50) {
                this.showShop();
            } else {
                setTimeout(() => this.startWave(), 2000);
            }
        }
    }
    
    checkGameOver() {
        if (this.coreHealth <= 0 || this.player.health <= 0) {
            this.state = GAME_STATES.GAME_OVER;
            this.showScreen('game-over-screen');
            this.updateGameOverUI();
        }
    }
    
    updateUI() {
        // Player health
        const playerHpPercent = (this.player.health / this.player.maxHealth) * 100;
        document.getElementById('player-hp').style.width = playerHpPercent + '%';
        document.getElementById('hp-text').textContent = `${this.player.health}/${this.player.maxHealth}`;
        
        // Core health
        const coreHpPercent = (this.coreHealth / this.maxCoreHealth) * 100;
        document.getElementById('core-hp').style.width = coreHpPercent + '%';
        document.getElementById('core-text').textContent = `${this.coreHealth}/${this.maxCoreHealth}`;
        
        // Wave and lumen
        document.getElementById('wave-number').textContent = this.wave;
        document.getElementById('lumen-count').textContent = this.lumen;
        
        this.updateGlyphUI();
        this.updateAbilityUI();
    }
    
    updateGlyphUI() {
        const glyphSlots = document.querySelectorAll('.glyph-slot');
        glyphSlots.forEach((slot, index) => {
            const count = slot.querySelector('.glyph-count');
            count.textContent = this.player.glyphCounts[index];
            
            if (this.player.glyphCounts[index] === 0) {
                slot.style.opacity = '0.5';
            } else {
                slot.style.opacity = '1';
            }
        });
    }
    
    updateAbilityUI() {
        const ability = document.getElementById('special-ability');
        const cooldownOverlay = ability.querySelector('.cooldown-overlay');
        
        if (this.player.specialCooldown > 0) {
            cooldownOverlay.style.display = 'block';
            const cooldownPercent = (this.player.specialCooldown / this.player.maxSpecialCooldown) * 100;
            cooldownOverlay.style.height = cooldownPercent + '%';
        } else {
            cooldownOverlay.style.display = 'none';
        }
    }
    
    updateShopUI() {
        document.getElementById('shop-lumen').textContent = this.lumen;
        
        // Update buy button states
        document.querySelectorAll('.shop-item').forEach(item => {
            const itemType = item.dataset.item;
            const price = this.getItemPrice(itemType);
            const buyBtn = item.querySelector('.buy-btn');
            
            if (this.lumen >= price) {
                buyBtn.disabled = false;
            } else {
                buyBtn.disabled = true;
            }
        });
    }
    
    updateGameOverUI() {
        document.getElementById('final-wave').textContent = this.wave - 1;
        document.getElementById('final-kills').textContent = this.totalKills;
        document.getElementById('final-lumen').textContent = this.totalLumen;
    }
    
    getItemPrice(itemType) {
        const prices = {
            'glyph-stasis': 50,
            'glyph-sundering': 75,
            'damage': 100,
            'speed': 80
        };
        return prices[itemType] || 0;
    }
    
    buyItem(itemType) {
        const price = this.getItemPrice(itemType);
        if (this.lumen < price) return;
        
        this.lumen -= price;
        
        switch(itemType) {
            case 'glyph-stasis':
                this.player.glyphCounts[GLYPH_TYPES.STASIS] += 2;
                break;
            case 'glyph-sundering':
                this.player.glyphCounts[GLYPH_TYPES.SUNDERING] += 2;
                break;
            case 'damage':
                this.player.damage *= 1.25;
                break;
            case 'speed':
                this.player.speed *= 1.2;
                break;
        }
        
        this.updateShopUI();
    }
    
    update(deltaTime) {
        if (this.state !== GAME_STATES.PLAYING) return;
        
        // Update player
        this.player.update(deltaTime, this.keys, this.canvas.width, this.canvas.height);
        
        // Spawn enemies
        this.spawnEnemy();
        
        // Update enemies
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(deltaTime, this.canvas.width / 2, this.canvas.height / 2, this.glyphs);
            
            // Check if enemy reached core
            const coreX = this.canvas.width / 2;
            const coreY = this.canvas.height / 2;
            const distance = Math.sqrt((enemy.x - coreX) ** 2 + (enemy.y - coreY) ** 2);
            
            if (distance < 30) {
                this.coreHealth -= enemy.damage;
                this.createParticles(enemy.x, enemy.y, enemy.color, 8);
                return false; // Remove enemy
            }
            
            return enemy.health > 0;
        });
        
        // Update arrows
        this.arrows = this.arrows.filter(arrow => {
            arrow.update(deltaTime);
            
            // Check arrow-enemy collisions
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                const distance = Math.sqrt((arrow.x - enemy.x) ** 2 + (arrow.y - enemy.y) ** 2);
                
                if (distance < arrow.radius + enemy.radius) {
                    enemy.takeDamage(arrow.damage);
                    this.createParticles(arrow.x, arrow.y, '#ffd700', 4);
                    
                    if (enemy.health <= 0) {
                        this.totalKills++;
                        this.lumen += enemy.lumenValue;
                        this.totalLumen += enemy.lumenValue;
                        this.createParticles(enemy.x, enemy.y, enemy.color, 12);
                        this.enemies.splice(i, 1);
                    }
                    
                    return false; // Remove arrow
                }
            }
            
            // Remove arrows that go off screen
            return arrow.x > -50 && arrow.x < this.canvas.width + 50 && 
                   arrow.y > -50 && arrow.y < this.canvas.height + 50;
        });
        
        // Update glyphs
        this.glyphs.forEach(glyph => {
            glyph.update(deltaTime, this.enemies);
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
        
        // Update player cooldowns
        this.player.updateCooldowns(deltaTime);
        
        // Check wave completion and game over
        this.checkWaveComplete();
        this.checkGameOver();
        
        // Update UI
        this.updateUI();
    }
    
    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }
    
    render() {
        if (this.state !== GAME_STATES.PLAYING) return;
        
        // Clear canvas
        this.ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw core
        this.drawCore();
        
        // Draw glyphs
        this.glyphs.forEach(glyph => glyph.render(this.ctx));
        
        // Draw enemies
        this.enemies.forEach(enemy => enemy.render(this.ctx));
        
        // Draw arrows
        this.arrows.forEach(arrow => arrow.render(this.ctx));
        
        // Draw player
        this.player.render(this.ctx);
        
        // Draw particles
        this.particles.forEach(particle => particle.render(this.ctx));
        
        // Draw crosshair
        this.drawCrosshair();
    }
    
    drawCore() {
        const coreX = this.canvas.width / 2;
        const coreY = this.canvas.height / 2;
        const coreRadius = 25;
        
        // Core glow
        const gradient = this.ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, coreRadius * 2);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(coreX - coreRadius * 2, coreY - coreRadius * 2, coreRadius * 4, coreRadius * 4);
        
        // Core
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        this.ctx.arc(coreX, coreY, coreRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Core border
        this.ctx.strokeStyle = '#ffed4e';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }
    
    drawCrosshair() {
        const size = 10;
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 2;
        
        // Horizontal line
        this.ctx.beginPath();
        this.ctx.moveTo(this.mouse.x - size, this.mouse.y);
        this.ctx.lineTo(this.mouse.x + size, this.mouse.y);
        this.ctx.stroke();
        
        // Vertical line
        this.ctx.beginPath();
        this.ctx.moveTo(this.mouse.x, this.mouse.y - size);
        this.ctx.lineTo(this.mouse.x, this.mouse.y + size);
        this.ctx.stroke();
    }
    
    gameLoop() {
        const now = Date.now();
        const deltaTime = now - (this.lastFrameTime || now);
        this.lastFrameTime = now;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.speed = 200; // pixels per second
        this.health = 100;
        this.maxHealth = 100;
        this.damage = 25;
        
        // Shooting
        this.shootCooldown = 0;
        this.maxShootCooldown = 200; // milliseconds
        
        // Special ability
        this.specialCooldown = 0;
        this.maxSpecialCooldown = 5000; // 5 seconds
        
        // Glyphs
        this.glyphCounts = [3, 2, 2, 1]; // [Stasis, Sundering, Warding, Haste]
    }
    
    reset() {
        this.health = this.maxHealth;
        this.glyphCounts = [3, 2, 2, 1];
        this.shootCooldown = 0;
        this.specialCooldown = 0;
    }
    
    update(deltaTime, keys, canvasWidth, canvasHeight) {
        const speed = this.speed * (deltaTime / 1000);
        
        // Movement
        if (keys['KeyW'] || keys['ArrowUp']) this.y -= speed;
        if (keys['KeyS'] || keys['ArrowDown']) this.y += speed;
        if (keys['KeyA'] || keys['ArrowLeft']) this.x -= speed;
        if (keys['KeyD'] || keys['ArrowRight']) this.x += speed;
        
        // Keep player in bounds
        this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
    }
    
    updateCooldowns(deltaTime) {
        this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);
        this.specialCooldown = Math.max(0, this.specialCooldown - deltaTime);
    }
    
    shoot(targetX, targetY) {
        if (this.shootCooldown > 0) return;
        
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        const arrow = new Arrow(this.x, this.y, angle, this.damage);
        game.arrows.push(arrow);
        
        this.shootCooldown = this.maxShootCooldown;
    }
    
    useSpecialAbility(enemies) {
        // Rain of Arrows - damages all enemies
        enemies.forEach(enemy => {
            enemy.takeDamage(this.damage * 2);
            game.createParticles(enemy.x, enemy.y, '#ffd700', 6);
        });
        
        this.specialCooldown = this.maxSpecialCooldown;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.health = Math.max(0, this.health);
    }
    
    render(ctx) {
        // Player glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.radius * 2, this.y - this.radius * 2, this.radius * 4, this.radius * 4);
        
        // Player
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Player border
        ctx.strokeStyle = '#ffed4e';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Arrow class
class Arrow {
    constructor(x, y, angle, damage) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 600; // pixels per second
        this.damage = damage;
        this.radius = 3;
        
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
    
    render(ctx) {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Arrow trail
        ctx.strokeStyle = '#ffed4e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - Math.cos(this.angle) * 15, this.y - Math.sin(this.angle) * 15);
        ctx.stroke();
    }
}

// Enemy class
class Enemy {
    constructor(type, wave) {
        this.type = type;
        this.wave = wave;
        this.x = 0;
        this.y = 0;
        this.radius = 12;
        this.angle = 0;
        
        // Initialize stats based on type and wave
        this.initializeStats();
        
        // Movement
        this.vx = 0;
        this.vy = 0;
        
        // Effects
        this.slowEffect = 1; // 1 = normal speed, 0.5 = half speed
        this.slowDuration = 0;
    }
    
    initializeStats() {
        const waveMultiplier = 1 + (this.wave - 1) * 0.2;
        
        switch(this.type) {
            case ENEMY_TYPES.SKITTERLING:
                this.maxHealth = Math.floor(25 * waveMultiplier);
                this.speed = 120;
                this.damage = 5;
                this.lumenValue = 5;
                this.color = '#ff6b6b';
                this.radius = 10;
                break;
                
            case ENEMY_TYPES.SHADOW_BRUTE:
                this.maxHealth = Math.floor(80 * waveMultiplier);
                this.speed = 60;
                this.damage = 15;
                this.lumenValue = 15;
                this.color = '#4a4a4a';
                this.radius = 18;
                break;
                
            case ENEMY_TYPES.UMBRAL_MAGE:
                this.maxHealth = Math.floor(40 * waveMultiplier);
                this.speed = 80;
                this.damage = 8;
                this.lumenValue = 12;
                this.color = '#9d4edd';
                this.radius = 14;
                break;
                
            case ENEMY_TYPES.VOID_CREEPER:
                this.maxHealth = Math.floor(30 * waveMultiplier);
                this.speed = 100;
                this.damage = 10;
                this.lumenValue = 20;
                this.color = '#2d3436';
                this.radius = 12;
                this.invisible = true;
                this.invisibilityDistance = 150;
                break;
        }
        
        this.health = this.maxHealth;
    }
    
    update(deltaTime, coreX, coreY, glyphs) {
        // Move towards core
        const dx = coreX - this.x;
        const dy = coreY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const moveSpeed = this.speed * this.slowEffect * (deltaTime / 1000);
            this.vx = (dx / distance) * moveSpeed;
            this.vy = (dy / distance) * moveSpeed;
            
            this.x += this.vx;
            this.y += this.vy;
        }
        
        // Update slow effect
        if (this.slowDuration > 0) {
            this.slowDuration -= deltaTime;
            if (this.slowDuration <= 0) {
                this.slowEffect = 1;
            }
        }
        
        // Check glyph effects
        this.checkGlyphEffects(glyphs, coreX, coreY);
    }
    
    checkGlyphEffects(glyphs, coreX, coreY) {
        glyphs.forEach(glyph => {
            const distance = Math.sqrt((this.x - glyph.x) ** 2 + (this.y - glyph.y) ** 2);
            
            if (distance < glyph.radius) {
                switch(glyph.type) {
                    case GLYPH_TYPES.STASIS:
                        this.slowEffect = 0.5;
                        this.slowDuration = 1000;
                        break;
                        
                    case GLYPH_TYPES.SUNDERING:
                        if (!glyph.triggered) {
                            this.takeDamage(50);
                            glyph.triggered = true;
                            game.createParticles(glyph.x, glyph.y, '#f87171', 10);
                        }
                        break;
                }
            }
        });
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.health = Math.max(0, this.health);
    }
    
    render(ctx) {
        // Check if invisible and close to core
        if (this.type === ENEMY_TYPES.VOID_CREEPER && this.invisible) {
            const coreDistance = Math.sqrt((this.x - ctx.canvas.width/2) ** 2 + (this.y - ctx.canvas.height/2) ** 2);
            if (coreDistance > this.invisibilityDistance) {
                return; // Don't render if invisible and far from core
            }
        }
        
        // Enemy glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
        gradient.addColorStop(0, this.color.replace(')', ', 0.3)').replace('rgb', 'rgba'));
        gradient.addColorStop(1, this.color.replace(')', ', 0)').replace('rgb', 'rgba'));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.radius * 2, this.y - this.radius * 2, this.radius * 4, this.radius * 4);
        
        // Enemy
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Health bar
        if (this.health < this.maxHealth) {
            const barWidth = 30;
            const barHeight = 4;
            const barX = this.x - barWidth / 2;
            const barY = this.y - this.radius - 10;
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Health
            ctx.fillStyle = '#22c55e';
            const healthPercent = this.health / this.maxHealth;
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        }
        
        // Slow effect indicator
        if (this.slowEffect < 1) {
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// Glyph class
class Glyph {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.radius = 40;
        this.triggered = false;
        this.life = 30000; // 30 seconds
        this.maxLife = 30000;
        
        // Type-specific properties
        this.initializeType();
    }
    
    initializeType() {
        switch(this.type) {
            case GLYPH_TYPES.STASIS:
                this.color = '#60a5fa';
                break;
            case GLYPH_TYPES.SUNDERING:
                this.color = '#f87171';
                break;
            case GLYPH_TYPES.WARDING:
                this.color = '#34d399';
                break;
            case GLYPH_TYPES.HASTE:
                this.color = '#fbbf24';
                break;
        }
    }
    
    update(deltaTime, enemies) {
        this.life -= deltaTime;
        
        // Haste glyph effect on player
        if (this.type === GLYPH_TYPES.HASTE) {
            const playerDistance = Math.sqrt((game.player.x - this.x) ** 2 + (game.player.y - this.y) ** 2);
            if (playerDistance < this.radius) {
                // Player gets speed boost (handled in player update)
            }
        }
        
        // Remove glyph if life expired
        if (this.life <= 0) {
            const index = game.glyphs.indexOf(this);
            if (index > -1) {
                game.glyphs.splice(index, 1);
            }
        }
    }
    
    render(ctx) {
        const alpha = Math.min(1, this.life / this.maxLife);
        
        // Glyph effect area
        ctx.strokeStyle = this.color.replace(')', `, ${alpha * 0.3})`).replace('rgb', 'rgba');
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Glyph center
        ctx.fillStyle = this.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Glyph symbol (simplified)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        switch(this.type) {
            case GLYPH_TYPES.STASIS:
                // Snowflake pattern
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3;
                    const x1 = this.x + Math.cos(angle) * 5;
                    const y1 = this.y + Math.sin(angle) * 5;
                    const x2 = this.x + Math.cos(angle) * 12;
                    const y2 = this.y + Math.sin(angle) * 12;
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                }
                break;
                
            case GLYPH_TYPES.SUNDERING:
                // Explosion lines
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI) / 4;
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(this.x + Math.cos(angle) * 6, this.y + Math.sin(angle) * 6);
                }
                break;
                
            case GLYPH_TYPES.WARDING:
                // Shield pattern
                ctx.moveTo(this.x, this.y - 6);
                ctx.lineTo(this.x - 4, this.y + 2);
                ctx.lineTo(this.x, this.y + 6);
                ctx.lineTo(this.x + 4, this.y + 2);
                ctx.closePath();
                break;
                
            case GLYPH_TYPES.HASTE:
                // Lightning bolt
                ctx.moveTo(this.x - 3, this.y - 6);
                ctx.lineTo(this.x + 1, this.y - 2);
                ctx.lineTo(this.x - 2, this.y);
                ctx.lineTo(this.x + 3, this.y + 6);
                ctx.lineTo(this.x - 1, this.y + 2);
                ctx.lineTo(this.x + 2, this.y);
                break;
        }
        
        ctx.stroke();
    }
}

// Particle class
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 200;
        this.vy = (Math.random() - 0.5) * 200;
        this.color = color;
        this.life = 1000; // 1 second
        this.maxLife = 1000;
        this.size = Math.random() * 4 + 2;
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.98; // Friction
        this.vy *= 0.98;
        this.life -= deltaTime;
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Initialize game when page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});