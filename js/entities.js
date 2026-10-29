/**
 * COSMIC DODGE - GAME ENTITIES
 * Vector-rendered cartoon entities: Player spaceship, Asteroids, Alien Drones,
 * Projectiles, Environmental Hazards, and Collectibles.
 */

import { CONSTANTS } from './constants.js';

// Helper: distance between two circles
export function circleIntersect(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distSq = dx * dx + dy * dy;
  const radSum = r1 + r2;
  return distSq <= radSum * radSum;
}

// ============================================================================
// PLAYER SPACESHIP
// ============================================================================
export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = CONSTANTS.PLAYER.WIDTH;
    this.height = CONSTANTS.PLAYER.HEIGHT;
    this.radius = CONSTANTS.PLAYER.COLLISION_RADIUS;

    // Banking tilt animation
    this.tilt = 0; // -1 (full left) to +1 (full right)
    this.targetTilt = 0;

    // Health & Lives
    this.lives = CONSTANTS.PLAYER.INITIAL_LIVES;
    this.maxLives = CONSTANTS.PLAYER.MAX_LIVES;

    // Timers & States
    this.invulnerableTimer = 0;
    this.shieldTimer = 0;
    this.boostTimer = 0;
    this.slowMoTimer = 0;

    // Built-in emergency shield ability
    this.emergencyShieldCooldown = 0;
    this.emergencyShieldMaxCooldown = CONSTANTS.PLAYER.EMERGENCY_SHIELD_COOLDOWN;

    // Visual indicators
    this.animTime = 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.tilt = 0;
    this.targetTilt = 0;
    this.invulnerableTimer = 1.0; // Brief grace period on spawn
    this.shieldTimer = 0;
    this.boostTimer = 0;
    this.slowMoTimer = 0;
    this.emergencyShieldCooldown = 0;
  }

  isShielded() {
    return this.shieldTimer > 0;
  }

  isBoosted() {
    return this.boostTimer > 0;
  }

  isSlowMo() {
    return this.slowMoTimer > 0;
  }

  isInvulnerable() {
    return this.invulnerableTimer > 0;
  }

  activateEmergencyShield() {
    if (this.emergencyShieldCooldown <= 0) {
      this.shieldTimer = Math.max(this.shieldTimer, CONSTANTS.PLAYER.EMERGENCY_SHIELD_DURATION);
      this.emergencyShieldCooldown = this.emergencyShieldMaxCooldown;
      return true;
    }
    return false;
  }

  update(dt, inputDir, particleSystem) {
    this.animTime += dt;

    // Cool down emergency shield
    if (this.emergencyShieldCooldown > 0) {
      this.emergencyShieldCooldown = Math.max(0, this.emergencyShieldCooldown - dt);
    }

    // Decrement buff timers
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.boostTimer > 0) this.boostTimer -= dt;
    if (this.slowMoTimer > 0) this.slowMoTimer -= dt;

    // Movement calculation
    let maxSpeed = CONSTANTS.PLAYER.MAX_SPEED;
    if (this.isBoosted()) {
      maxSpeed *= CONSTANTS.POWERUPS.BOOST_SPEED_MULTIPLIER;
    }

    if (inputDir.active) {
      // Direct targeting or directional acceleration
      const targetVx = inputDir.x * maxSpeed;
      const targetVy = inputDir.y * maxSpeed;

      const accel = CONSTANTS.PLAYER.ACCELERATION;
      this.vx += (targetVx - this.vx) * Math.min(1, accel * dt / maxSpeed);
      this.vy += (targetVy - this.vy) * Math.min(1, accel * dt / maxSpeed);

      this.targetTilt = Math.max(-1, Math.min(1, inputDir.x * 1.2));
    } else {
      // Decelerate with friction
      const friction = Math.exp(-CONSTANTS.PLAYER.FRICTION * dt);
      this.vx *= friction;
      this.vy *= friction;
      this.targetTilt = 0;
    }

    // Smooth tilt banking
    this.tilt += (this.targetTilt - this.tilt) * Math.min(1, 15 * dt);

    // Apply movement
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Playfield boundaries clamping (leave small padding from screen edges)
    const paddingX = this.radius + 6;
    const paddingYTop = this.radius + 70; // Clearance for HUD
    const paddingYBottom = this.radius + 18;

    this.x = Math.max(paddingX, Math.min(CONSTANTS.CANVAS_WIDTH - paddingX, this.x));
    this.y = Math.max(paddingYTop, Math.min(CONSTANTS.CANVAS_HEIGHT - paddingYBottom, this.y));

    // Emit thruster particles
    if (particleSystem) {
      const leftThrusterX = this.x - 12 + Math.sin(this.tilt * 0.4) * 4;
      const rightThrusterX = this.x + 12 - Math.sin(this.tilt * 0.4) * 4;
      const thrusterY = this.y + 24;

      particleSystem.emitThruster(leftThrusterX, thrusterY, 0, this.isBoosted());
      particleSystem.emitThruster(rightThrusterX, thrusterY, 0, this.isBoosted());
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Flashing opacity during invulnerability
    if (this.isInvulnerable()) {
      ctx.globalAlpha = Math.sin(this.animTime * 30) > 0 ? 0.35 : 0.95;
    }

    // Banking roll
    const rollAngle = this.tilt * 0.32;
    ctx.rotate(rollAngle);

    // 1. Boost Aura / Speed Streaks
    if (this.isBoosted()) {
      ctx.save();
      const glow = ctx.createRadialGradient(0, 8, 5, 0, 8, 48);
      glow.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
      glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 8, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Wings / Aerodynamic Fins
    ctx.fillStyle = '#0284c7'; // Deep blue base
    ctx.strokeStyle = '#38bdf8'; // Glowing cyan outline
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(0, -28);
    // Right wing
    ctx.lineTo(16, -6);
    ctx.lineTo(26, 18);
    ctx.lineTo(16, 24);
    ctx.lineTo(6, 18);
    // Center tail
    ctx.lineTo(0, 22);
    // Left wing
    ctx.lineTo(-6, 18);
    ctx.lineTo(-16, 24);
    ctx.lineTo(-26, 18);
    ctx.lineTo(-16, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Inner Hull (Bright cartoon Cyan & White body)
    ctx.fillStyle = '#f0f9ff';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(11, 4);
    ctx.lineTo(5, 18);
    ctx.lineTo(-5, 18);
    ctx.lineTo(-11, 4);
    ctx.closePath();
    ctx.fill();

    // Hull accent stripes
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(4, 8);
    ctx.lineTo(-4, 8);
    ctx.closePath();
    ctx.fill();

    // 4. Cockpit Canopy (Bubble glass with cartoon reflection)
    const cockpitGradient = ctx.createLinearGradient(-6, -16, 6, 4);
    cockpitGradient.addColorStop(0, '#67e8f9');
    cockpitGradient.addColorStop(0.5, '#0284c7');
    cockpitGradient.addColorStop(1, '#0c4a6e');

    ctx.fillStyle = cockpitGradient;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -6, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pilot reflection glare
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.ellipse(-2, -9, 2.5, 5, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // 5. Dual Wingtip Blaster Cannons
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(23, 2, 4, 12);
    ctx.fillRect(-27, 2, 4, 12);

    ctx.fillStyle = '#facc15'; // Glowing tip
    ctx.beginPath();
    ctx.arc(25, 2, 2.5, 0, Math.PI * 2);
    ctx.arc(-25, 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 6. Shield Dome (if active)
    if (this.isShielded()) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const shieldRadius = this.radius + 18;
      const shieldAlpha = 0.5 + 0.25 * Math.sin(this.animTime * 8);

      // Shimmering outer aura
      const shieldGrad = ctx.createRadialGradient(0, 0, shieldRadius * 0.6, 0, 0, shieldRadius);
      shieldGrad.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
      shieldGrad.addColorStop(0.8, `rgba(56, 189, 248, ${shieldAlpha * 0.35})`);
      shieldGrad.addColorStop(1, `rgba(125, 211, 252, ${shieldAlpha * 0.85})`);

      ctx.fillStyle = shieldGrad;
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
      ctx.fill();

      // Outer hexagonal / energy boundary
      ctx.strokeStyle = `rgba(186, 230, 253, ${shieldAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating energy node rings
      ctx.rotate(this.animTime * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const ang = (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * shieldRadius, Math.sin(ang) * shieldRadius, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}

// ============================================================================
// CARTOON ASTEROID
// ============================================================================
export class Asteroid {
  constructor(x, y, vx, vy, size = 'medium') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.sizeType = size;

    if (size === 'small') {
      this.radius = 16;
      this.color = '#78716c';
      this.highlight = '#a8a29e';
    } else if (size === 'large') {
      this.radius = 44;
      this.color = '#57534e';
      this.highlight = '#78716c';
    } else {
      this.radius = 28;
      this.color = '#64748b';
      this.highlight = '#94a3b8';
    }

    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 2.2;
    this.nearMissed = false; // Flag to reward near-miss only once

    // Generate seeded cartoon rock polygon shape
    this.numVertices = size === 'large' ? 12 : 9;
    this.vertices = [];
    for (let i = 0; i < this.numVertices; i++) {
      const angle = (i / this.numVertices) * Math.PI * 2;
      const variation = 0.8 + Math.random() * 0.4;
      this.vertices.push({
        x: Math.cos(angle) * this.radius * variation,
        y: Math.sin(angle) * this.radius * variation
      });
    }

    // Generate 2-3 cartoon surface craters
    const numCraters = size === 'large' ? 4 : (size === 'medium' ? 2 : 1);
    this.craters = [];
    for (let i = 0; i < numCraters; i++) {
      const dist = (Math.random() * 0.55) * this.radius;
      const ang = Math.random() * Math.PI * 2;
      this.craters.push({
        x: Math.cos(ang) * dist,
        y: Math.sin(ang) * dist,
        r: (0.18 + Math.random() * 0.22) * this.radius
      });
    }
  }

  update(dt, speedFactor = 1.0) {
    this.x += this.vx * dt * speedFactor;
    this.y += this.vy * dt * speedFactor;
    this.rotation += this.rotSpeed * dt * speedFactor;
  }

  isOffscreen() {
    const margin = this.radius * 2 + 60;
    return (
      this.y > CONSTANTS.CANVAS_HEIGHT + margin ||
      this.y < -margin ||
      this.x < -margin ||
      this.x > CONSTANTS.CANVAS_WIDTH + margin
    );
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Rock body
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.highlight;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cartoon craters
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;

    this.craters.forEach(crater => {
      ctx.beginPath();
      ctx.arc(crater.x, crater.y, crater.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }
}

// ============================================================================
// CARTOON ENEMY DRONE
// ============================================================================
export class EnemyDrone {
  constructor(x, y, type = 'scout') {
    this.x = x;
    this.y = y;
    this.type = type; // 'scout', 'gunship', 'boss'
    this.radius = type === 'boss' ? 42 : (type === 'gunship' ? 26 : 20);

    this.vx = (Math.random() > 0.5 ? 1 : -1) * (type === 'scout' ? 140 : 90);
    this.vy = 25; // Gentle downward drift

    this.animTime = 0;
    this.chargeTimer = 0;
    this.chargeDuration = 0.9; // Warning before firing
    this.isCharging = false;
    this.fireCooldown = type === 'boss' ? 2.5 : (type === 'gunship' ? 3.0 : 3.8);
    this.fireTimer = 1.0 + Math.random() * 1.5;
    this.readyToShoot = false;
    this.targetY = 120 + Math.random() * 160;
  }

  update(dt, playerX, playerY, speedFactor = 1.0) {
    this.animTime += dt;
    this.fireTimer -= dt * speedFactor;

    // Movement: enter down to targetY, then patrol horizontally
    if (this.y < this.targetY) {
      this.y += 90 * dt * speedFactor;
    } else {
      this.x += this.vx * dt * speedFactor;
      // Bounce off screen sides
      const margin = this.radius + 20;
      if (this.x < margin && this.vx < 0) this.vx = -this.vx;
      if (this.x > CONSTANTS.CANVAS_WIDTH - margin && this.vx > 0) this.vx = -this.vx;
    }

    // Charging behavior
    if (this.fireTimer <= this.chargeDuration && !this.isCharging) {
      this.isCharging = true;
    }

    if (this.fireTimer <= 0) {
      this.readyToShoot = true;
      this.fireTimer = this.fireCooldown;
      this.isCharging = false;
    }
  }

  draw(ctx, playerX, playerY) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const bob = Math.sin(this.animTime * 5) * 3;

    // 1. Telegraph Warning Laser / Aim Line while charging
    if (this.isCharging) {
      ctx.save();
      const aimAngle = Math.atan2(playerY - this.y, playerX - this.x);
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(aimAngle) * 600, Math.sin(aimAngle) * 600);
      ctx.stroke();

      // Pulsing charge reticle at mouth
      const chargeProgress = 1 - (this.fireTimer / this.chargeDuration);
      ctx.fillStyle = `rgba(244, 63, 94, ${0.6 + 0.4 * Math.sin(this.animTime * 20)})`;
      ctx.beginPath();
      ctx.arc(0, 14, 6 * chargeProgress + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Drone Body
    if (this.type === 'boss') {
      // Big cartoon dreadnought
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, bob, 46, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing central reactor eye
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, bob, 14, 0, Math.PI * 2);
      ctx.fill();

      // Boss antenna
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, bob - 24);
      ctx.lineTo(0, bob - 38);
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, bob - 38, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'gunship') {
      // Sleek crimson attack ship
      ctx.fillStyle = '#991b1b';
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -18 + bob);
      ctx.lineTo(26, 14 + bob);
      ctx.lineTo(0, 8 + bob);
      ctx.lineTo(-26, 14 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0 + bob, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Cartoon alien flying saucer
      ctx.fillStyle = '#065f46'; // Alien green
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5;

      // Base disc
      ctx.beginPath();
      ctx.ellipse(0, 4 + bob, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Dome canopy
      ctx.fillStyle = '#a7f3d0';
      ctx.beginPath();
      ctx.arc(0, bob, 10, Math.PI, 0);
      ctx.fill();

      // Single cyclops pupil
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, bob + 1, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ============================================================================
// ENEMY PLASMA PROJECTILE
// ============================================================================
export class Projectile {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 8;
    this.nearMissed = false;
    this.animTime = 0;
  }

  update(dt, speedFactor = 1.0) {
    this.animTime += dt;
    this.x += this.vx * dt * speedFactor;
    this.y += this.vy * dt * speedFactor;
  }

  isOffscreen() {
    return (
      this.y > CONSTANTS.CANVAS_HEIGHT + 40 ||
      this.y < -40 ||
      this.x < -40 ||
      this.x > CONSTANTS.CANVAS_WIDTH + 40
    );
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Glowing plasma core
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius + 4);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.4, '#f43f5e');
    glow.addColorStop(1, 'rgba(244, 63, 94, 0)');

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
    ctx.fill();

    // Hot central core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ============================================================================
// ENVIRONMENTAL LASER HAZARD (Vertical Energy Lane)
// ============================================================================
export class LaserHazard {
  constructor(x, width = 44) {
    this.x = x;
    this.width = width;
    this.state = 'warning'; // 'warning', 'firing', 'fade'
    this.warningDuration = 1.5;
    this.firingDuration = 1.0;
    this.fadeDuration = 0.3;
    this.timer = 0;
    this.active = true;
    this.animTime = 0;
  }

  update(dt) {
    this.animTime += dt;
    this.timer += dt;

    if (this.state === 'warning' && this.timer >= this.warningDuration) {
      this.state = 'firing';
      this.timer = 0;
    } else if (this.state === 'firing' && this.timer >= this.firingDuration) {
      this.state = 'fade';
      this.timer = 0;
    } else if (this.state === 'fade' && this.timer >= this.fadeDuration) {
      this.active = false;
    }
  }

  isLethal() {
    return this.state === 'firing';
  }

  collidesWithPlayer(player) {
    if (!this.isLethal()) return false;
    // Check if player's X range overlaps with laser lane
    const halfWidth = this.width / 2;
    const laneLeft = this.x - halfWidth;
    const laneRight = this.x + halfWidth;
    return (player.x + player.radius > laneLeft && player.x - player.radius < laneRight);
  }

  draw(ctx) {
    ctx.save();
    const halfWidth = this.width / 2;

    if (this.state === 'warning') {
      // Pulsing yellow/amber warning lane
      const alpha = 0.25 + 0.2 * Math.sin(this.animTime * 14);
      ctx.fillStyle = `rgba(245, 158, 11, ${alpha})`;
      ctx.fillRect(this.x - halfWidth, 0, this.width, CONSTANTS.CANVAS_HEIGHT);

      // Warning hazard dashed borders
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(this.x - halfWidth, 0);
      ctx.lineTo(this.x - halfWidth, CONSTANTS.CANVAS_HEIGHT);
      ctx.moveTo(this.x + halfWidth, 0);
      ctx.lineTo(this.x + halfWidth, CONSTANTS.CANVAS_HEIGHT);
      ctx.stroke();

      // Exclamation icons along the lane
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (let y = 150; y < CONSTANTS.CANVAS_HEIGHT; y += 220) {
        ctx.fillText('⚠', this.x, y);
      }
    } else if (this.state === 'firing') {
      // Blazing lethal laser beam
      const beamGrad = ctx.createLinearGradient(this.x - halfWidth, 0, this.x + halfWidth, 0);
      beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
      beamGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.95)');
      beamGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.95)');
      beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0.4)');

      ctx.fillStyle = beamGrad;
      ctx.fillRect(this.x - halfWidth, 0, this.width, CONSTANTS.CANVAS_HEIGHT);

      // Electric sparks along sides
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let y = 0; y < CONSTANTS.CANVAS_HEIGHT; y += 40) {
        const offset = (Math.random() - 0.5) * 8;
        ctx.lineTo(this.x + offset, y);
      }
      ctx.stroke();
    } else if (this.state === 'fade') {
      const alpha = Math.max(0, 1 - (this.timer / this.fadeDuration));
      ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.4})`;
      ctx.fillRect(this.x - halfWidth, 0, this.width, CONSTANTS.CANVAS_HEIGHT);
    }

    ctx.restore();
  }
}

// ============================================================================
// SPACE MINE (Environmental Hazard)
// ============================================================================
export class SpaceMine {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 22;
    this.vy = 45; // Slow downward drift
    this.animTime = 0;
    this.nearMissed = false;
  }

  update(dt, speedFactor = 1.0) {
    this.animTime += dt;
    this.y += this.vy * dt * speedFactor;
  }

  isOffscreen() {
    return this.y > CONSTANTS.CANVAS_HEIGHT + 60;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 8);

    // Danger proximity ring
    ctx.strokeStyle = `rgba(244, 63, 94, ${0.25 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 12 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();

    // Spikes (8 spiky nodes)
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillRect(-3, -this.radius - 8, 6, 10);
      ctx.restore();
    }

    // Mine Core
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Blinking red central beacon LED
    ctx.fillStyle = pulse > 0.4 ? '#ef4444' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ============================================================================
// COLLECTIBLE ITEMS (Star, Shield, Boost, SlowMo, Heart)
// ============================================================================
export class Collectible {
  constructor(x, y, type = 'star') {
    this.x = x;
    this.y = y;
    this.type = type; // 'star', 'shield', 'boost', 'slowmo', 'heart'
    this.radius = type === 'star' ? 16 : 20;
    this.vy = type === 'star' ? 95 : 65; // Drifts downward gently
    this.lifetime = CONSTANTS.POWERUPS.LIFETIME;
    this.maxLifetime = CONSTANTS.POWERUPS.LIFETIME;
    this.animTime = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.animTime += dt;
    this.lifetime -= dt;
    this.y += this.vy * dt;
  }

  isDead() {
    return this.lifetime <= 0 || this.y > CONSTANTS.CANVAS_HEIGHT + 40;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Flashing when expiring (< 2.5s remaining)
    if (this.lifetime < 2.5) {
      if (Math.sin(this.animTime * 18) > 0) {
        ctx.globalAlpha = 0.4;
      }
    }

    // Gentle floating bob
    const bob = Math.sin(this.animTime * 4) * 3;

    if (this.type === 'star') {
      // Golden Cartoon Star
      ctx.rotate(this.animTime * 1.5);

      // Outer soft glow
      const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 22);
      glow.addColorStop(0, 'rgba(250, 204, 21, 0.4)');
      glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();

      // 5-pointed cartoon star
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerAng = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const innerAng = outerAng + Math.PI / 5;
        const ox = Math.cos(outerAng) * 15;
        const oy = Math.sin(outerAng) * 15;
        const ix = Math.cos(innerAng) * 7.5;
        const iy = Math.sin(innerAng) * 7.5;
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Shiny core glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-2, -3, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Powerup Sphere with Icon
      let bgColor = '#0284c7';
      let strokeColor = '#38bdf8';
      let label = '🛡';

      if (this.type === 'shield') {
        bgColor = '#0284c7';
        strokeColor = '#38bdf8';
        label = '🛡';
      } else if (this.type === 'boost') {
        bgColor = '#ea580c';
        strokeColor = '#fb923c';
        label = '⚡';
      } else if (this.type === 'slowmo') {
        bgColor = '#7c3aed';
        strokeColor = '#c084fc';
        label = '⏳';
      } else if (this.type === 'heart') {
        bgColor = '#e11d48';
        strokeColor = '#fb7185';
        label = '❤';
      }

      // Outer bubble
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, bob, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Icon symbol in center
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, 0, bob);
    }

    ctx.restore();
  }
}

// ============================================================================
// FLOATING COMBAT TEXT
// ============================================================================
export class FloatingText {
  constructor(text, x, y, color = '#facc15', size = 20) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.vy = -60; // Float upward
    this.life = 0.9;
    this.maxLife = 0.9;
  }

  update(dt) {
    this.life -= dt;
    this.y += this.vy * dt;
  }

  isDead() {
    return this.life <= 0;
  }

  draw(ctx) {
    const progress = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = Math.min(1, progress * 1.5);
    ctx.translate(this.x, this.y);

    // Pop scale animation
    const scale = 0.8 + 0.4 * Math.sin(progress * Math.PI);
    ctx.scale(scale, scale);

    ctx.font = `900 ${this.size}px "Outfit", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow outline
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 4;
    ctx.strokeText(this.text, 0, 0);

    // Main text
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);

    ctx.restore();
  }
}

