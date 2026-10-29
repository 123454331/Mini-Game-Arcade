/**
 * FRUIT SLICER - FRUITS & BOMB PHYSICS ENTITIES
 * Handles fruit launching physics, rotation, half-splitting, and line-circle intersection.
 */

export const FRUIT_TYPES = {
  watermelon: {
    radius: 46,
    color: '#ef4444',
    rindColor: '#15803d',
    innerRind: '#bbf7d0',
    splashColor: '#ef4444',
    points: 1
  },
  orange: {
    radius: 36,
    color: '#f97316',
    rindColor: '#ea580c',
    innerRind: '#ffedd5',
    splashColor: '#f97316',
    points: 1
  },
  banana: {
    radius: 32,
    color: '#facc15',
    rindColor: '#ca8a04',
    innerRind: '#fef08a',
    splashColor: '#facc15',
    points: 2
  },
  apple: {
    radius: 34,
    color: '#dc2626',
    rindColor: '#b91c1c',
    innerRind: '#fef2f2',
    splashColor: '#dc2626',
    points: 1
  },
  strawberry: {
    radius: 28,
    color: '#e11d48',
    rindColor: '#be123c',
    innerRind: '#ffe4e6',
    splashColor: '#e11d48',
    points: 3
  },
  bomb: {
    radius: 30,
    color: '#18181b',
    isBomb: true
  }
};

export class Fruit {
  constructor(x, y, vx, vy, typeKey) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.typeKey = typeKey;
    this.config = FRUIT_TYPES[typeKey];
    this.radius = this.config.radius;
    this.isBomb = !!this.config.isBomb;

    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 5;
    this.sliced = false;
    this.animTime = 0;
  }

  update(dt, gravity = 680) {
    this.animTime += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += gravity * dt;
    this.rotation += this.rotSpeed * dt;
  }

  isBelowScreen(canvasHeight) {
    return this.y > canvasHeight + this.radius * 2;
  }

  /**
   * Checks if line segment (x1, y1) to (x2, y2) intersects circle at (this.x, this.y)
   */
  intersectsSegment(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      return Math.hypot(x1 - this.x, y1 - this.y) <= this.radius;
    }

    // Projection factor t
    const t = Math.max(0, Math.min(1, ((this.x - x1) * dx + (this.y - y1) * dy) / lenSq));
    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;

    return Math.hypot(this.x - nearestX, this.y - nearestY) <= this.radius;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.isBomb) {
      this.drawBomb(ctx);
    } else {
      this.drawWholeFruit(ctx);
    }

    ctx.restore();
  }

  drawBomb(ctx) {
    // Bomb iron sphere
    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glare reflection
    ctx.fillStyle = '#71717a';
    ctx.beginPath();
    ctx.ellipse(-8, -10, 6, 3, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Fuse cap
    ctx.fillStyle = '#52525b';
    ctx.fillRect(-5, -this.radius - 6, 10, 6);

    // Fuse cord
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius - 6);
    ctx.quadraticCurveTo(8, -this.radius - 16, 14, -this.radius - 12);
    ctx.stroke();

    // Sizzling spark at tip
    const sparkPulse = 0.5 + 0.5 * Math.sin(this.animTime * 30);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(14, -this.radius - 12, 4 + sparkPulse * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(14, -this.radius - 12, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawWholeFruit(ctx) {
    const r = this.radius;
    const cfg = this.config;

    if (this.typeKey === 'watermelon') {
      // Dark green stripes on lighter green rind
      ctx.fillStyle = cfg.rindColor;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 5;
      for (let i = -r + 8; i < r; i += 16) {
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.abs(i), r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (this.typeKey === 'orange') {
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Stem & Leaf
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(0, -r, 8, 4, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.typeKey === 'banana') {
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.moveTo(-r, -10);
      ctx.quadraticCurveTo(0, r + 5, r, -5);
      ctx.quadraticCurveTo(0, r - 15, -r, -10);
      ctx.fill();

      // Brown tips
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(-r - 3, -13, 5, 5);
      ctx.fillRect(r - 1, -8, 5, 5);
    } else if (this.typeKey === 'apple') {
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Leaf & stem
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -r + 4);
      ctx.lineTo(2, -r - 8);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(8, -r - 4, 6, 3, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.typeKey === 'strawberry') {
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.moveTo(0, r);
      ctx.bezierCurveTo(-r * 1.1, 0, -r * 0.9, -r, 0, -r * 0.8);
      ctx.bezierCurveTo(r * 0.9, -r, r * 1.1, 0, 0, r);
      ctx.fill();

      // Yellow seeds
      ctx.fillStyle = '#fef08a';
      [-8, 0, 8].forEach(x => {
        [-8, 2].forEach(y => {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // Green leafy cap
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.moveTo(-12, -r * 0.8);
      ctx.lineTo(-4, -r * 0.5);
      ctx.lineTo(0, -r * 0.9);
      ctx.lineTo(4, -r * 0.5);
      ctx.lineTo(12, -r * 0.8);
      ctx.lineTo(0, -r * 0.7);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/**
 * Cut fruit halves that fling apart after being sliced
 */
export class FruitHalf {
  constructor(x, y, vx, vy, typeKey, side = 'left', sliceAngle = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.typeKey = typeKey;
    this.config = FRUIT_TYPES[typeKey];
    this.radius = this.config.radius;
    this.side = side; // 'left' or 'right'
    this.sliceAngle = sliceAngle;

    this.rotation = sliceAngle;
    this.rotSpeed = (side === 'left' ? -1 : 1) * (3 + Math.random() * 4);
    this.life = 2.0;
  }

  update(dt, gravity = 720) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += gravity * dt;
    this.rotation += this.rotSpeed * dt;
    this.life -= dt;
  }

  isDead(canvasHeight) {
    return this.life <= 0 || this.y > canvasHeight + 80;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const r = this.radius;
    const cfg = this.config;

    // Draw half circle based on side
    ctx.beginPath();
    if (this.side === 'left') {
      ctx.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.5);
    } else {
      ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.5);
    }
    ctx.closePath();

    // Rind
    ctx.fillStyle = cfg.rindColor;
    ctx.fill();

    // Inner flesh
    ctx.beginPath();
    if (this.side === 'left') {
      ctx.arc(0, 0, r - 4, Math.PI * 0.5, Math.PI * 1.5);
    } else {
      ctx.arc(0, 0, r - 4, -Math.PI * 0.5, Math.PI * 0.5);
    }
    ctx.closePath();
    ctx.fillStyle = cfg.color;
    ctx.fill();

    // Seeds / Inner detailing
    if (this.typeKey === 'watermelon') {
      ctx.fillStyle = '#18181b';
      const offset = this.side === 'left' ? -r * 0.4 : r * 0.4;
      ctx.beginPath();
      ctx.arc(offset, -6, 2.5, 0, Math.PI * 2);
      ctx.arc(offset, 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

