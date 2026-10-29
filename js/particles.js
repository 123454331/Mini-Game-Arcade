/**
 * COSMIC DODGE - PARTICLE SYSTEM
 * Lightweight, high-performance particle engine for thrusters, sparkles,
 * explosions, shield ripples, and victory confetti.
 */

export class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 2;
    this.maxLife = 1;
    this.life = 1;
    this.color = '#ffffff';
    this.type = 'circle'; // 'circle', 'sparkle', 'ring', 'confetti'
    this.rotation = 0;
    this.rotSpeed = 0;
    this.fade = true;
  }

  init(x, y, vx, vy, size, life, color, type = 'circle', rotSpeed = 0) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.color = color;
    this.type = type;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = rotSpeed;
  }

  update(dt) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotSpeed * dt;

    if (this.type === 'confetti') {
      this.vy += 80 * dt; // Slight gravity for victory confetti
      this.vx *= 0.98;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const progress = this.life / this.maxLife; // 1 -> 0
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, progress));
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.type === 'circle') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * (0.4 + 0.6 * progress), 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'sparkle') {
      ctx.fillStyle = this.color;
      const s = this.size * progress;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.3, -s * 0.3);
      ctx.lineTo(s, 0);
      ctx.lineTo(s * 0.3, s * 0.3);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.3, s * 0.3);
      ctx.lineTo(-s, 0);
      ctx.lineTo(-s * 0.3, -s * 0.3);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'ring') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2.5 * progress;
      ctx.beginPath();
      const currentRadius = this.size * (1.8 - 0.8 * progress);
      ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === 'confetti') {
      ctx.fillStyle = this.color;
      const w = this.size;
      const h = this.size * 0.6;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    ctx.restore();
  }
}

export class ParticleSystem {
  constructor(maxParticles = 350) {
    this.pool = Array.from({ length: maxParticles }, () => new Particle());
  }

  getFreeParticle() {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) return this.pool[i];
    }
    // Fallback: recycle oldest
    return this.pool[0];
  }

  emit(x, y, vx, vy, size, life, color, type = 'circle', rotSpeed = 0) {
    const p = this.getFreeParticle();
    p.init(x, y, vx, vy, size, life, color, type, rotSpeed);
    return p;
  }

  /**
   * Spaceship exhaust flame stream
   */
  emitThruster(x, y, angle = 0, isBoosted = false) {
    const spread = (Math.random() - 0.5) * 0.4;
    const speed = isBoosted ? (220 + Math.random() * 120) : (120 + Math.random() * 80);
    const life = isBoosted ? (0.28 + Math.random() * 0.15) : (0.18 + Math.random() * 0.1);
    const size = isBoosted ? (6 + Math.random() * 4) : (3.5 + Math.random() * 3);

    const dirX = Math.sin(angle + spread);
    const dirY = Math.cos(angle + spread);

    const colors = isBoosted
      ? ['#38bdf8', '#818cf8', '#c084fc', '#ffffff']
      : ['#38bdf8', '#0ea5e9', '#67e8f9', '#ffffff'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.emit(x, y, dirX * speed, dirY * speed, size, life, color, 'circle');
  }

  /**
   * Star collection glittering sparkle burst
   */
  emitStarCollection(x, y) {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 70 + Math.random() * 110;
      const size = 5 + Math.random() * 5;
      const life = 0.45 + Math.random() * 0.3;
      const colors = ['#facc15', '#fef08a', '#ffffff', '#fbbf24'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.emit(
        x, y,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        size, life, color, 'sparkle', (Math.random() - 0.5) * 6
      );
    }
  }

  /**
   * Near-miss pulse: expanding cyan energy ring
   */
  emitNearMiss(x, y) {
    this.emit(x, y, 0, 0, 36, 0.35, '#38bdf8', 'ring');
    // Mini sparks
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const speed = 40 + Math.random() * 30;
      this.emit(
        x, y,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        3, 0.25, '#67e8f9', 'circle'
      );
    }
  }

  /**
   * Shield burst or hit absorption ring
   */
  emitShieldPop(x, y, isBreak = false) {
    const color = isBreak ? '#f43f5e' : '#38bdf8';
    this.emit(x, y, 0, 0, 48, 0.4, color, 'ring');
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 90 + Math.random() * 70;
      this.emit(
        x, y,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        4, 0.35, color, 'circle'
      );
    }
  }

  /**
   * Asteroid debris / impact explosion
   */
  emitExplosion(x, y, color = '#fb923c', count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      const size = 3 + Math.random() * 5;
      const life = 0.35 + Math.random() * 0.35;
      this.emit(
        x, y,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        size, life, color, 'circle'
      );
    }
  }

  /**
   * Victory Confetti Celebration
   */
  emitConfetti(x, y) {
    const colors = ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#facc15'];
    for (let i = 0; i < 30; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 120 + Math.random() * 240;
      const size = 6 + Math.random() * 6;
      const life = 1.0 + Math.random() * 0.8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.emit(
        x, y,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        size, life, color, 'confetti', (Math.random() - 0.5) * 10
      );
    }
  }

  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].update(dt);
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].draw(ctx);
      }
    }
  }

  clear() {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
    }
  }
}

