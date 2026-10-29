/**
 * FRUIT SLICER - KATANA BLADE TRAIL SYSTEM
 * Tracks touch/mouse strokes, renders glowing tapered trails, and checks swipe velocity.
 */

export class Blade {
  constructor() {
    this.points = []; // { x, y, time }
    this.maxAge = 0.18; // Seconds
    this.isCutting = false;
    this.color = '#38bdf8';
    this.coreColor = '#ffffff';
  }

  addPoint(x, y) {
    const now = performance.now() * 0.001;
    this.points.push({ x, y, time: now });
    this.isCutting = true;
  }

  stop() {
    this.isCutting = false;
    this.points = [];
  }

  update() {
    const now = performance.now() * 0.001;
    // Filter out old trail points
    this.points = this.points.filter(p => now - p.time < this.maxAge);
    if (this.points.length === 0) {
      this.isCutting = false;
    }
  }

  /**
   * Returns current blade segment (last two points) for collision check
   */
  getLastSegment() {
    if (this.points.length < 2) return null;
    const p1 = this.points[this.points.length - 2];
    const p2 = this.points[this.points.length - 1];
    
    // Require a minimum swipe speed to count as a slice
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const dt = Math.max(0.001, p2.time - p1.time);
    const speed = dist / dt;

    if (speed < 120) return null; // Too slow to slice
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, speed };
  }

  draw(ctx) {
    if (this.points.length < 2) return;

    const now = performance.now() * 0.001;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw outer glow trail
    for (let i = 1; i < this.points.length; i++) {
      const p1 = this.points[i - 1];
      const p2 = this.points[i];
      const age = now - p2.time;
      const progress = 1 - Math.min(1, age / this.maxAge); // 1 (new) -> 0 (old)

      ctx.strokeStyle = `rgba(56, 189, 248, ${progress * 0.65})`;
      ctx.lineWidth = 10 * progress;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw white hot inner blade core
    for (let i = 1; i < this.points.length; i++) {
      const p1 = this.points[i - 1];
      const p2 = this.points[i];
      const age = now - p2.time;
      const progress = 1 - Math.min(1, age / this.maxAge);

      ctx.strokeStyle = `rgba(255, 255, 255, ${progress * 0.95})`;
      ctx.lineWidth = 3.5 * progress;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.restore();
  }
}

