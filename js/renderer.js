/**
 * COSMIC DODGE - GRAPHICS RENDERER & PARALLAX BACKGROUND
 * High-DPI Canvas scaling, screen shake, multi-layer cartoon nebula & starfield,
 * and cinematic state overlays.
 */

import { CONSTANTS } from './constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Logical dimensions
    this.virtualWidth = CONSTANTS.CANVAS_WIDTH;
    this.virtualHeight = CONSTANTS.CANVAS_HEIGHT;

    // Screen shake parameters
    this.shakeTrauma = 0;
    this.shakeOffset = { x: 0, y: 0 };

    // Starfield layers
    this.stars = [];
    this.nebulaClouds = [];
    this.initBackground();

    // Resize handling
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  initBackground() {
    // 1. Distant Starfield (120 tiny stars)
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * this.virtualWidth,
        y: Math.random() * this.virtualHeight,
        radius: 0.8 + Math.random() * 1.6,
        speed: 25 + Math.random() * 60,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 2 + Math.random() * 5
      });
    }

    // 2. Cosmic Nebula Clouds (4 soft floating cloud blobs)
    this.nebulaClouds = [
      { x: 180, y: 220, r: 240, vx: 5, vy: 15 },
      { x: 620, y: 480, r: 280, vx: -4, vy: 18 },
      { x: 300, y: 720, r: 220, vx: 6, vy: 12 },
    ];
  }

  handleResize() {
    // Crisp High-DPI support
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    
    // Set internal canvas resolution
    this.canvas.width = this.virtualWidth * dpr;
    this.canvas.height = this.virtualHeight * dpr;

    // Scale drawing context so 1 unit = 1 virtual pixel
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
    this.ctx.scale(dpr, dpr);
  }

  /**
   * Triggers screen shake with given trauma intensity (0 to 1).
   */
  addShake(trauma = 0.5) {
    this.shakeTrauma = Math.min(1.0, this.shakeTrauma + trauma);
  }

  update(dt, speedFactor = 1.0) {
    // Decay shake trauma
    if (this.shakeTrauma > 0) {
      this.shakeTrauma = Math.max(0, this.shakeTrauma - 1.8 * dt);
      const shakePower = Math.pow(this.shakeTrauma, 2); // Quadratic dropoff
      const maxShake = 16 * shakePower;
      this.shakeOffset.x = (Math.random() * 2 - 1) * maxShake;
      this.shakeOffset.y = (Math.random() * 2 - 1) * maxShake;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }

    // Update parallax stars
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      star.y += star.speed * dt * speedFactor;
      if (star.y > this.virtualHeight) {
        star.y = 0;
        star.x = Math.random() * this.virtualWidth;
      }
    }

    // Update nebula clouds
    for (let i = 0; i < this.nebulaClouds.length; i++) {
      const cloud = this.nebulaClouds[i];
      cloud.y += cloud.vy * dt * speedFactor;
      cloud.x += cloud.vx * dt * speedFactor;
      if (cloud.y - cloud.r > this.virtualHeight) {
        cloud.y = -cloud.r;
        cloud.x = Math.random() * this.virtualWidth;
      }
    }
  }

  begin(levelTheme = null) {
    this.ctx.save();

    // Apply camera screen shake offset
    this.ctx.translate(this.shakeOffset.x, this.shakeOffset.y);

    // 1. Deep Space Base Background
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.virtualHeight);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.5, '#05070e');
    bgGrad.addColorStop(1, '#020408');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

    // 2. Parallax Nebula Clouds
    const c1 = levelTheme?.nebulaColor1 || 'rgba(35, 20, 70, 0.45)';
    const c2 = levelTheme?.nebulaColor2 || 'rgba(10, 45, 90, 0.4)';

    this.nebulaClouds.forEach((cloud, idx) => {
      const grad = this.ctx.createRadialGradient(cloud.x, cloud.y, 20, cloud.x, cloud.y, cloud.r);
      grad.addColorStop(0, idx % 2 === 0 ? c1 : c2);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // 3. Parallax Starfield
    const now = performance.now() * 0.001;
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const twinkle = 0.5 + 0.5 * Math.sin(now * star.twinkleSpeed + i);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Draws full-screen special effect vignettes (SlowMo, Low Health).
   */
  drawOverlays(isSlowMo, lives) {
    // 1. Slow-Motion cyan chrono vignette
    if (isSlowMo) {
      const vig = this.ctx.createRadialGradient(
        this.virtualWidth / 2, this.virtualHeight / 2, this.virtualWidth * 0.25,
        this.virtualWidth / 2, this.virtualHeight / 2, this.virtualWidth * 0.75
      );
      vig.addColorStop(0, 'rgba(6, 182, 212, 0)');
      vig.addColorStop(1, 'rgba(6, 182, 212, 0.28)');
      this.ctx.fillStyle = vig;
      this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
    }

    // 2. Low Health Warning (Critical 1 life remaining)
    if (lives === 1) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.006);
      this.ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 * pulse})`;
      this.ctx.lineWidth = 12;
      this.ctx.strokeRect(6, 6, this.virtualWidth - 12, this.virtualHeight - 12);
    }
  }

  end() {
    this.ctx.restore();
  }
}

