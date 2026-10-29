/**
 * COSMIC DODGE - CORE GAME ENGINE & STATE MACHINE
 * Manages simulation loop, level progression, collisions, near-miss bonuses,
 * combos, entity spawning, power-up timers, and state transitions.
 */

import { CONSTANTS } from './constants.js';
import { getLevelConfig } from './levels.js';
import { Player, Asteroid, EnemyDrone, Projectile, LaserHazard, SpaceMine, Collectible, FloatingText, circleIntersect } from './entities.js';
import { ParticleSystem } from './particles.js';
import { sound } from './audio.js';
import { storage } from './storage.js';

export class GameEngine {
  constructor(canvas, renderer, input) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.input = input;
    this.particles = new ParticleSystem(350);

    // Current state
    this.state = null;
    this.currentLevelIndex = 1;
    this.currentLevelConfig = getLevelConfig(1);

    // Player
    this.player = new Player(CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT - 160);

    // Dynamic Entity Collections
    this.asteroids = [];
    this.enemies = [];
    this.projectiles = [];
    this.lasers = [];
    this.mines = [];
    this.collectibles = [];
    this.floatingTexts = [];

    // Runtime Metrics & Progress
    this.score = 0;
    this.levelTime = 0;
    this.starsCollected = 0;
    this.hitsTakenThisLevel = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;

    // Spawners timers
    this.asteroidSpawnTimer = 0;
    this.starSpawnTimer = 0;
    this.powerupSpawnTimer = 0;
    this.enemySpawnTimer = 0;
    this.laserSpawnTimer = 0;
    this.mineSpawnTimer = 0;

    // Countdown state
    this.countdownSeconds = 3;
    this.countdownTimer = 0;

    // Timing loop
    this.lastTime = 0;
    this.isRunning = false;

    // Event hooks for UI
    this.onStateChange = null;
    this.onHudUpdate = null;

    // Wire input hooks
    this.input.onPauseToggle = () => this.togglePause();
    this.input.onShieldTrigger = () => this.triggerEmergencyShield();
  }

  start() {
    this.lastTime = performance.now();
    this.isRunning = true;
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    // Calculate clamped delta-time (prevent physics explosion on tab switches)
    const rawDt = (currentTime - this.lastTime) * 0.001;
    this.lastTime = currentTime;
    const dt = Math.max(0.001, Math.min(rawDt, 0.08));

    // Update & Render depending on state
    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    if (this.onStateChange) this.onStateChange(this.state);
  }

  /**
   * Initializes a new session for a specific level.
   */
  loadLevel(levelNumber) {
    this.currentLevelIndex = levelNumber;
    this.currentLevelConfig = getLevelConfig(levelNumber);

    // Reset entities
    this.asteroids = [];
    this.enemies = [];
    this.projectiles = [];
    this.lasers = [];
    this.mines = [];
    this.collectibles = [];
    this.floatingTexts = [];
    this.particles.clear();

    // Reset player
    this.player.reset(CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT - 160);
    this.player.lives = CONSTANTS.PLAYER.INITIAL_LIVES;

    // Reset runtime metrics
    this.score = 0;
    this.levelTime = 0;
    this.starsCollected = 0;
    this.hitsTakenThisLevel = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;

    // Reset spawner clocks
    this.asteroidSpawnTimer = 0.8; // Brief initial safe grace window
    this.starSpawnTimer = 1.0;
    this.powerupSpawnTimer = 4.0;
    this.enemySpawnTimer = 3.0;
    this.laserSpawnTimer = 3.5;
    this.mineSpawnTimer = 2.5;

    // Start 3-2-1 Countdown
    this.countdownSeconds = 3;
    this.countdownTimer = 0.9;
    this.setState(CONSTANTS.STATE.COUNTDOWN);
    sound.playCountdown(false);
  }

  restartCurrentLevel() {
    this.loadLevel(this.currentLevelIndex);
  }

  nextLevel() {
    if (this.currentLevelIndex < 10) {
      this.loadLevel(this.currentLevelIndex + 1);
    } else {
      this.setState(CONSTANTS.STATE.CAMPAIGN_WIN);
    }
  }

  togglePause() {
    if (this.state === CONSTANTS.STATE.PLAYING) {
      this.setState(CONSTANTS.STATE.PAUSED);
    } else if (this.state === CONSTANTS.STATE.PAUSED) {
      this.setState(CONSTANTS.STATE.PLAYING);
    }
  }

  triggerEmergencyShield() {
    if (this.state !== CONSTANTS.STATE.PLAYING) return;
    if (this.player.activateEmergencyShield()) {
      sound.playShieldOn();
      this.particles.emitShieldPop(this.player.x, this.player.y, false);
      this.addFloatingText("SHIELD PULSE!", this.player.x, this.player.y - 30, '#38bdf8');
    }
  }

  // ============================================================================
  // UPDATE LOGIC
  // ============================================================================
  update(dt) {
    // Parallax background always animates smoothly
    const speedFactor = (this.state === CONSTANTS.STATE.PLAYING && this.player.isSlowMo())
      ? CONSTANTS.POWERUPS.SLOWMO_FACTOR
      : 1.0;
    this.renderer.update(dt, speedFactor);

    if (this.state === CONSTANTS.STATE.COUNTDOWN) {
      this.updateCountdown(dt);
      return;
    }

    if (this.state !== CONSTANTS.STATE.PLAYING) {
      // Particles still update on victory or game over screens
      this.particles.update(dt);
      return;
    }

    // 1. Advance Level Timer & Time-based Score
    this.levelTime += dt;
    this.score += Math.floor(CONSTANTS.SCORING.SECOND_SURVIVED_BASE * dt * this.comboMultiplier);

    // 2. Combo Timer Decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboMultiplier = 1.0;
      }
    }

    // 3. Player Movement & Input
    const moveDir = this.input.getMovementVector(this.player.x, this.player.y);
    this.player.update(dt, moveDir, this.particles);

    // 4. Entity Spawning
    this.updateSpawners(dt);

    // 5. Update Hazards & Enemies
    const hazardSpeedFactor = this.player.isSlowMo() ? CONSTANTS.POWERUPS.SLOWMO_FACTOR : 1.0;

    // Asteroids
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const ast = this.asteroids[i];
      ast.update(dt, hazardSpeedFactor);
      if (ast.isOffscreen()) {
        this.asteroids.splice(i, 1);
      }
    }

    // Enemies & Projectiles
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt, this.player.x, this.player.y, hazardSpeedFactor);

      if (enemy.readyToShoot) {
        enemy.readyToShoot = false;
        this.spawnEnemyProjectiles(enemy);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt, hazardSpeedFactor);
      if (proj.isOffscreen()) {
        this.projectiles.splice(i, 1);
      }
    }

    // Lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.update(dt);
      if (!laser.active) {
        this.lasers.splice(i, 1);
      }
    }

    // Space Mines
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const mine = this.mines[i];
      mine.update(dt, hazardSpeedFactor);
      if (mine.isOffscreen()) {
        this.mines.splice(i, 1);
      }
    }

    // Collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      item.update(dt);
      if (item.isDead()) {
        this.collectibles.splice(i, 1);
      }
    }

    // Floating text popups
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const txt = this.floatingTexts[i];
      txt.update(dt);
      if (txt.isDead()) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Particle system
    this.particles.update(dt);

    // 6. Collision & Proximity Detections
    this.checkCollisions();

    // 7. Check Level Objectives
    this.checkObjectives();

    // 8. Inform HUD
    if (this.onHudUpdate) {
      this.onHudUpdate(this.getHudState());
    }
  }

  updateCountdown(dt) {
    this.countdownTimer -= dt;
    if (this.countdownTimer <= 0) {
      this.countdownSeconds--;
      if (this.countdownSeconds > 0) {
        this.countdownTimer = 0.9;
        sound.playCountdown(false);
      } else if (this.countdownSeconds === 0) {
        this.countdownTimer = 0.6;
        sound.playCountdown(true);
      } else {
        this.setState(CONSTANTS.STATE.PLAYING);
      }
    }
  }

  // ============================================================================
  // SPAWNER SUBSYSTEM
  // ============================================================================
  updateSpawners(dt) {
    const cfg = this.currentLevelConfig;

    // 1. Asteroid Spawner
    this.asteroidSpawnTimer -= dt;
    if (this.asteroidSpawnTimer <= 0) {
      this.asteroidSpawnTimer = cfg.asteroidSpawnInterval * (0.8 + Math.random() * 0.4);
      this.spawnAsteroid();
    }

    // 2. Star Spawner
    this.starSpawnTimer -= dt;
    if (this.starSpawnTimer <= 0) {
      this.starSpawnTimer = cfg.starSpawnInterval * (0.7 + Math.random() * 0.6);
      this.spawnStar();
    }

    // 3. Power-Up Spawner
    if (cfg.allowedPowerups && cfg.allowedPowerups.length > 0) {
      this.powerupSpawnTimer -= dt;
      if (this.powerupSpawnTimer <= 0) {
        this.powerupSpawnTimer = (cfg.powerupInterval || 10.0) * (0.85 + Math.random() * 0.3);
        this.spawnPowerup();
      }
    }

    // 4. Enemy Spawner
    if (cfg.hasEnemies) {
      this.enemySpawnTimer -= dt;
      if (this.enemySpawnTimer <= 0 && this.enemies.length < 3) {
        this.enemySpawnTimer = (cfg.enemySpawnInterval || 5.0) * (0.8 + Math.random() * 0.4);
        this.spawnEnemy();
      }
    }

    // 5. Environmental Laser Spawner
    if (cfg.hasLasers) {
      this.laserSpawnTimer -= dt;
      if (this.laserSpawnTimer <= 0 && this.lasers.length < 2) {
        this.laserSpawnTimer = (cfg.laserSpawnInterval || 5.0) * (0.85 + Math.random() * 0.3);
        this.spawnLaser();
      }
    }

    // 6. Space Mine Spawner
    if (cfg.hasMines) {
      this.mineSpawnTimer -= dt;
      if (this.mineSpawnTimer <= 0 && this.mines.length < 4) {
        this.mineSpawnTimer = (cfg.mineSpawnInterval || 4.5) * (0.85 + Math.random() * 0.3);
        this.spawnMine();
      }
    }
  }

  spawnAsteroid() {
    const cfg = this.currentLevelConfig;
    const sizes = cfg.allowedAsteroidSizes || ['small', 'medium'];
    const chosenSize = sizes[Math.floor(Math.random() * sizes.length)];

    // Determine speed
    const [minSpd, maxSpd] = cfg.asteroidSpeedRange || [140, 220];
    const speed = minSpd + Math.random() * (maxSpd - minSpd);

    // Spawn from top or upper sides
    let startX, startY, vx, vy;
    const spawnType = Math.random();

    if (spawnType < 0.75) {
      // Spawn along top edge
      startX = 40 + Math.random() * (CONSTANTS.CANVAS_WIDTH - 80);
      startY = -50;
      vx = (Math.random() - 0.5) * 80;
      vy = speed;
    } else {
      // Spawn angled from side
      const fromLeft = Math.random() > 0.5;
      startX = fromLeft ? -40 : CONSTANTS.CANVAS_WIDTH + 40;
      startY = 40 + Math.random() * 250;
      vx = fromLeft ? (80 + Math.random() * 100) : -(80 + Math.random() * 100);
      vy = speed * 0.85;
    }

    // Guard: Prevent spawning directly on player's current position
    if (Math.abs(startX - this.player.x) < 50 && Math.abs(startY - this.player.y) < 120) {
      startX = (startX + 180) % (CONSTANTS.CANVAS_WIDTH - 80) + 40;
    }

    this.asteroids.push(new Asteroid(startX, startY, vx, vy, chosenSize));
  }

  spawnStar() {
    const x = 50 + Math.random() * (CONSTANTS.CANVAS_WIDTH - 100);
    const y = -30;
    this.collectibles.push(new Collectible(x, y, 'star'));
  }

  spawnPowerup() {
    const cfg = this.currentLevelConfig;
    const types = cfg.allowedPowerups;
    if (!types || types.length === 0) return;

    const chosenType = types[Math.floor(Math.random() * types.length)];
    const x = 60 + Math.random() * (CONSTANTS.CANVAS_WIDTH - 120);
    const y = -35;
    this.collectibles.push(new Collectible(x, y, chosenType));
  }

  spawnEnemy() {
    const cfg = this.currentLevelConfig;
    const type = cfg.enemyType || 'scout';
    const x = 80 + Math.random() * (CONSTANTS.CANVAS_WIDTH - 160);
    const y = -40;
    this.enemies.push(new EnemyDrone(x, y, type));
  }

  spawnEnemyProjectiles(enemy) {
    sound.playLaserShot();
    const aimAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
    const projSpeed = 220;

    if (enemy.type === 'gunship') {
      // Dual angled shots
      [-0.15, 0.15].forEach(offset => {
        const vx = Math.cos(aimAngle + offset) * projSpeed;
        const vy = Math.sin(aimAngle + offset) * projSpeed;
        this.projectiles.push(new Projectile(enemy.x, enemy.y + 10, vx, vy));
      });
    } else if (enemy.type === 'boss') {
      // 3-way spread shot
      [-0.25, 0, 0.25].forEach(offset => {
        const vx = Math.cos(aimAngle + offset) * (projSpeed + 30);
        const vy = Math.sin(aimAngle + offset) * (projSpeed + 30);
        this.projectiles.push(new Projectile(enemy.x, enemy.y + 14, vx, vy));
      });
    } else {
      // Single targeted plasma orb
      const vx = Math.cos(aimAngle) * projSpeed;
      const vy = Math.sin(aimAngle) * projSpeed;
      this.projectiles.push(new Projectile(enemy.x, enemy.y + 12, vx, vy));
    }
  }

  spawnLaser() {
    sound.playWarning();
    const laneWidth = 46;
    // Pick lane, avoid player's immediate X position if possible for safe reaction
    let x = 60 + Math.random() * (CONSTANTS.CANVAS_WIDTH - 120);
    if (Math.abs(x - this.player.x) < 40) {
      x = (x + 200) % (CONSTANTS.CANVAS_WIDTH - 120) + 60;
    }
    this.lasers.push(new LaserHazard(x, laneWidth));
  }

  spawnMine() {
    const x = 60 + Math.random() * (CONSTANTS.CANVAS_WIDTH - 120);
    const y = -35;
    this.mines.push(new SpaceMine(x, y));
  }

  // ============================================================================
  // COLLISION DETECTION & NEAR-MISS SYSTEM
  // ============================================================================
  checkCollisions() {
    const px = this.player.x;
    const py = this.player.y;
    const pr = this.player.radius;

    // 1. Player vs Asteroids
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const ast = this.asteroids[i];
      const dist = Math.hypot(px - ast.x, py - ast.y);
      const hitDist = pr + ast.radius;

      // Direct Collision
      if (dist <= hitDist) {
        this.handleHazardCollision(ast.x, ast.y);
        // Destroy asteroid on collision
        this.particles.emitExplosion(ast.x, ast.y, ast.highlight, 14);
        this.asteroids.splice(i, 1);
        continue;
      }

      // Near-Miss Bonus Detection
      const nearDist = hitDist + CONSTANTS.SCORING.NEAR_MISS_DISTANCE;
      if (!ast.nearMissed && dist <= nearDist && ast.y > py - 20) {
        ast.nearMissed = true;
        this.awardNearMiss(ast.x, ast.y);
      }
    }

    // 2. Player vs Enemy Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const dist = Math.hypot(px - proj.x, py - proj.y);
      const hitDist = pr + proj.radius;

      if (dist <= hitDist) {
        this.handleHazardCollision(proj.x, proj.y);
        this.particles.emitExplosion(proj.x, proj.y, '#f43f5e', 8);
        this.projectiles.splice(i, 1);
        continue;
      }

      const nearDist = hitDist + CONSTANTS.SCORING.NEAR_MISS_DISTANCE;
      if (!proj.nearMissed && dist <= nearDist && proj.y > py - 20) {
        proj.nearMissed = true;
        this.awardNearMiss(proj.x, proj.y);
      }
    }

    // 3. Player vs Space Mines
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const mine = this.mines[i];
      const dist = Math.hypot(px - mine.x, py - mine.y);
      const hitDist = pr + mine.radius;

      if (dist <= hitDist) {
        this.handleHazardCollision(mine.x, mine.y);
        this.particles.emitExplosion(mine.x, mine.y, '#ef4444', 18);
        this.mines.splice(i, 1);
        continue;
      }

      const nearDist = hitDist + CONSTANTS.SCORING.NEAR_MISS_DISTANCE;
      if (!mine.nearMissed && dist <= nearDist && mine.y > py - 20) {
        mine.nearMissed = true;
        this.awardNearMiss(mine.x, mine.y);
      }
    }

    // 4. Player vs Lethal Lasers
    for (let i = 0; i < this.lasers.length; i++) {
      const laser = this.lasers[i];
      if (laser.collidesWithPlayer(this.player)) {
        this.handleHazardCollision(this.player.x, this.player.y);
        break;
      }
    }

    // 5. Player vs Collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      if (circleIntersect(px, py, pr, item.x, item.y, item.radius)) {
        this.collectItem(item);
        this.collectibles.splice(i, 1);
      }
    }
  }

  handleHazardCollision(hazardX, hazardY) {
    // If shielded: Absorb hit completely!
    if (this.player.isShielded()) {
      this.player.shieldTimer = 0; // Shield breaks
      sound.playShieldBreak();
      this.particles.emitShieldPop(this.player.x, this.player.y, true);
      this.renderer.addShake(0.3);
      this.addFloatingText("SHIELD DEFLECTED!", this.player.x, this.player.y - 30, '#38bdf8');
      return;
    }

    // If currently invulnerable (i-frames): ignore
    if (this.player.isInvulnerable()) {
      return;
    }

    // Player takes damage!
    this.player.lives--;
    this.hitsTakenThisLevel++;
    this.comboMultiplier = 1.0; // Reset combo on damage
    this.comboTimer = 0;

    sound.playHit();
    this.renderer.addShake(0.65);
    this.particles.emitExplosion(this.player.x, this.player.y, '#ef4444', 20);
    this.addFloatingText("-1 LIFE", this.player.x, this.player.y - 35, '#ef4444', 24);

    // Grant i-frames
    this.player.invulnerableTimer = CONSTANTS.PLAYER.INVULNERABLE_DURATION;

    // Safety clear: vaporize hazards within danger radius so player is never chain-hit
    this.clearLethalPerimeter(this.player.x, this.player.y, 140);

    // Check Game Over
    if (this.player.lives <= 0) {
      this.gameOver();
    }
  }

  clearLethalPerimeter(cx, cy, radius) {
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      if (Math.hypot(cx - this.asteroids[i].x, cy - this.asteroids[i].y) < radius) {
        this.particles.emitExplosion(this.asteroids[i].x, this.asteroids[i].y, '#94a3b8', 8);
        this.asteroids.splice(i, 1);
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (Math.hypot(cx - this.projectiles[i].x, cy - this.projectiles[i].y) < radius) {
        this.projectiles.splice(i, 1);
      }
    }
    for (let i = this.mines.length - 1; i >= 0; i--) {
      if (Math.hypot(cx - this.mines[i].x, cy - this.mines[i].y) < radius) {
        this.particles.emitExplosion(this.mines[i].x, this.mines[i].y, '#ef4444', 8);
        this.mines.splice(i, 1);
      }
    }
  }

  awardNearMiss(hx, hy) {
    const pts = Math.floor(CONSTANTS.SCORING.NEAR_MISS_BASE * this.comboMultiplier);
    this.score += pts;
    this.incrementCombo();

    sound.playNearMiss();
    this.particles.emitNearMiss(hx, hy);
    this.addFloatingText(`NEAR MISS! +${pts}`, hx, hy - 15, '#38bdf8', 16);
  }

  collectItem(item) {
    if (item.type === 'star') {
      this.starsCollected++;
      const pts = Math.floor(CONSTANTS.SCORING.STAR_BASE * this.comboMultiplier);
      this.score += pts;
      this.incrementCombo();

      sound.playStarPickup(this.comboMultiplier);
      this.particles.emitStarCollection(item.x, item.y);
      this.addFloatingText(
        this.comboMultiplier > 1 ? `+${pts} (${this.comboMultiplier.toFixed(1)}x)` : `+${pts}`,
        item.x, item.y - 20, '#facc15'
      );
    } else if (item.type === 'shield') {
      this.player.shieldTimer = CONSTANTS.POWERUPS.SHIELD_DURATION;
      sound.playShieldOn();
      this.particles.emitShieldPop(this.player.x, this.player.y, false);
      this.addFloatingText("SHIELD ACTIVE!", this.player.x, this.player.y - 30, '#38bdf8');
    } else if (item.type === 'boost') {
      this.player.boostTimer = CONSTANTS.POWERUPS.BOOST_DURATION;
      sound.playPowerup('boost');
      this.addFloatingText("SPEED BOOST!", this.player.x, this.player.y - 30, '#fb923c');
    } else if (item.type === 'slowmo') {
      this.player.slowMoTimer = CONSTANTS.POWERUPS.SLOWMO_DURATION;
      sound.playPowerup('slowmo');
      this.addFloatingText("SLOW-MOTION!", this.player.x, this.player.y - 30, '#c084fc');
    } else if (item.type === 'heart') {
      if (this.player.lives < this.player.maxLives) {
        this.player.lives++;
        sound.playPowerup('heart');
        this.addFloatingText("+1 LIFE!", this.player.x, this.player.y - 30, '#fb7185', 22);
      } else {
        this.score += 300;
        sound.playPowerup('heart');
        this.addFloatingText("MAX LIVES! +300", this.player.x, this.player.y - 30, '#fb7185', 18);
      }
    }
  }

  incrementCombo() {
    this.comboMultiplier = Math.min(
      CONSTANTS.SCORING.MAX_COMBO,
      +(this.comboMultiplier + CONSTANTS.SCORING.COMBO_STEP).toFixed(1)
    );
    this.comboTimer = CONSTANTS.SCORING.COMBO_TIMEOUT;
  }

  addFloatingText(text, x, y, color, size) {
    this.floatingTexts.push(new FloatingText(text, x, y, color, size));
  }

  // ============================================================================
  // OBJECTIVE & WIN / LOSE CONDITIONS
  // ============================================================================
  checkObjectives() {
    const cfg = this.currentLevelConfig;
    let isComplete = false;

    if (cfg.objectiveType === 'SURVIVE_TIME') {
      isComplete = this.levelTime >= cfg.targetDuration;
    } else if (cfg.objectiveType === 'COLLECT_STARS') {
      isComplete = this.starsCollected >= cfg.targetStars;
    } else { // SURVIVE_AND_STARS
      isComplete = (this.levelTime >= cfg.targetDuration && this.starsCollected >= cfg.targetStars);
    }

    if (isComplete) {
      this.levelComplete();
    }
  }

  levelComplete() {
    const cfg = this.currentLevelConfig;
    this.score += CONSTANTS.SCORING.LEVEL_CLEAR_BASE;

    // Calculate star rating (1 to 3 stars)
    // 3 stars: zero damage taken AND met score threshold
    // 2 stars: <= 1 damage taken OR high stars collected
    let starsEarned = 1;
    if (this.hitsTakenThisLevel === 0 && this.score >= cfg.scoringThresholds.twoStars) {
      starsEarned = 3;
    } else if (this.hitsTakenThisLevel <= 1 || this.score >= cfg.scoringThresholds.twoStars) {
      starsEarned = 2;
    }

    // Persist completion and unlock next level
    storage.recordLevelCompletion(this.currentLevelIndex, this.score, starsEarned);

    sound.playLevelComplete();
    this.particles.emitConfetti(CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT * 0.4);

    if (this.currentLevelIndex === 10) {
      this.setState(CONSTANTS.STATE.CAMPAIGN_WIN);
    } else {
      this.setState(CONSTANTS.STATE.LEVEL_COMPLETE);
    }
  }

  gameOver() {
    sound.playGameOver();
    this.setState(CONSTANTS.STATE.GAME_OVER);
  }

  // ============================================================================
  // HUD STATE PROVIDER
  // ============================================================================
  getHudState() {
    const cfg = this.currentLevelConfig;
    const remainingTime = Math.max(0, Math.ceil(cfg.targetDuration - this.levelTime));

    return {
      levelIndex: this.currentLevelIndex,
      levelTitle: cfg.title,
      score: this.score,
      lives: this.player.lives,
      maxLives: this.player.maxLives,
      starsCollected: this.starsCollected,
      targetStars: cfg.targetStars,
      remainingTime,
      targetDuration: cfg.targetDuration,
      objectiveType: cfg.objectiveType,
      comboMultiplier: this.comboMultiplier,
      comboProgress: Math.max(0, this.comboTimer / CONSTANTS.SCORING.COMBO_TIMEOUT),
      shieldCooldownProgress: 1 - Math.min(1, this.player.emergencyShieldCooldown / this.player.emergencyShieldMaxCooldown),
      isShieldReady: this.player.emergencyShieldCooldown <= 0,
      activeShieldDuration: Math.ceil(this.player.shieldTimer),
      isShielded: this.player.isShielded(),
      activeBoostDuration: Math.ceil(this.player.boostTimer),
      isBoosted: this.player.isBoosted(),
      activeSlowMoDuration: Math.ceil(this.player.slowMoTimer),
      isSlowMo: this.player.isSlowMo(),
    };
  }

  // ============================================================================
  // RENDERING PIPELINE
  // ============================================================================
  render() {
    const ctx = this.renderer.ctx;
    const theme = this.currentLevelConfig?.theme;

    // Begin frame with parallax starfield & nebula
    this.renderer.begin(theme);

    // Render hazards and collectibles
    this.lasers.forEach(laser => laser.draw(ctx));
    this.mines.forEach(mine => mine.draw(ctx));
    this.collectibles.forEach(col => col.draw(ctx));
    this.asteroids.forEach(ast => ast.draw(ctx));
    this.enemies.forEach(enemy => enemy.draw(ctx, this.player.x, this.player.y));
    this.projectiles.forEach(proj => proj.draw(ctx));

    // Render player
    if (this.state === CONSTANTS.STATE.PLAYING ||
        this.state === CONSTANTS.STATE.PAUSED ||
        this.state === CONSTANTS.STATE.COUNTDOWN ||
        this.state === CONSTANTS.STATE.LEVEL_COMPLETE) {
      this.player.draw(ctx);
    }

    // Render particles
    this.particles.draw(ctx);

    // Render floating combat texts
    this.floatingTexts.forEach(txt => txt.draw(ctx));

    // Special Fullscreen Overlays (SlowMo vignette, Critical health warning)
    this.renderer.drawOverlays(this.player.isSlowMo(), this.player.lives);

    // Ready Countdown Text (Rendered on canvas for perfect punch)
    if (this.state === CONSTANTS.STATE.COUNTDOWN) {
      this.drawCountdownOverlay(ctx);
    }

    this.renderer.end();
  }

  drawCountdownOverlay(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, CONSTANTS.CANVAS_WIDTH, CONSTANTS.CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = this.countdownSeconds === 0 ? "GO!" : this.countdownSeconds.toString();
    const color = this.countdownSeconds === 0 ? '#38bdf8' : '#facc15';

    ctx.font = '900 96px "Outfit", system-ui, sans-serif';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 8;
    ctx.strokeText(text, CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 2 - 40);

    ctx.fillStyle = color;
    ctx.fillText(text, CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 2 - 40);

    ctx.font = '700 24px "Outfit", system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.currentLevelConfig.title.toUpperCase(), CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 2 + 40);

    ctx.font = '400 18px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(this.currentLevelConfig.subtitle, CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 2 + 70);

    ctx.restore();
  }
}

