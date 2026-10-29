/**
 * FRUIT SLICER - JUICE SPLATTER & EXPLOSION PARTICLES
 */

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.stains = []; // Persistent fruit juice stains on board
  }

  emitJuice(x, y, color, count = 18) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 4,
        color,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        gravity: 600
      });
    }

    // Add a couple of background stains
    if (this.stains.length > 25) this.stains.shift();
    this.stains.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      radius: 20 + Math.random() * 25,
      color,
      alpha: 0.28,
      life: 8.0
    });
  }

  emitBombExplosion(x, y) {
    // Red / orange fire particles
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 380;
      const colors = ['#ef4444', '#f97316', '#facc15', '#ffffff'];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.6 + Math.random() * 0.5,
        maxLife: 1.1,
        gravity: 200
      });
    }
  }

  update(dt) {
    // Update active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Slowly fade background stains
    for (let i = this.stains.length - 1; i >= 0; i--) {
      const s = this.stains[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.stains.splice(i, 1);
      }
    }
  }

  drawStains(ctx) {
    for (const s of this.stains) {
      const currentAlpha = Math.min(s.alpha, (s.life / 8.0) * s.alpha);
      ctx.save();
      ctx.globalAlpha = currentAlpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const progress = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = progress;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (0.4 + 0.6 * progress), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
    this.stains = [];
  }
}

