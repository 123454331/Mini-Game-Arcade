/**
 * FRUIT SLICER - CORE GAME ENGINE
 * Wave spawner, cutting collision pipeline, combos, strikes, high scores, and rendering.
 */

import { Fruit, FruitHalf, FRUIT_TYPES } from './fruit.js';
import { Blade } from './blade.js';
import { ParticleSystem } from './particles.js';
import { sound } from './audio.js';

export class FruitGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.width = 800;
    this.height = 600;

    this.blade = new Blade();
    this.particles = new ParticleSystem();

    this.fruits = [];
    this.halves = [];
    this.floatingTexts = [];

    this.state = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAME_OVER'
    this.score = 0;
    this.strikes = 0;
    this.maxStrikes = 3;
    this.highScore = this.loadHighScore();

    // Spawning wave timers
    this.spawnTimer = 1.0;
    this.waveDifficulty = 1.0;

    // Combo tracking
    this.comboCount = 0;
    this.comboTimer = 0;

    // Screen shake
    this.shakeTrauma = 0;

    this.onStateChange = null;
    this.onHudUpdate = null;

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    this.bindInputs();

    this.lastTime = performance.now();
    this.isRunning = true;
    requestAnimationFrame((t) => this.loop(t));
  }

  loadHighScore() {
    try {
      return parseInt(localStorage.getItem('fruit_slicer_highscore') || '0', 10);
    } catch {
      return 0;
    }
  }

  saveHighScore() {
    try {
      localStorage.setItem('fruit_slicer_highscore', this.highScore.toString());
    } catch {}
  }

  handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  bindInputs() {
    const getVirtualCoords = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    // Pointer events for unified touch & mouse dragging
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      sound.initContext();
      const coords = getVirtualCoords(e.clientX, e.clientY);
      this.blade.addPoint(coords.x, coords.y);
      sound.playSwish();
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (e.buttons > 0 || e.pointerType === 'touch') {
        e.preventDefault();
        const coords = getVirtualCoords(e.clientX, e.clientY);
        this.blade.addPoint(coords.x, coords.y);
      }
    });

    const endCut = () => {
      this.blade.stop();
    };

    this.canvas.addEventListener('pointerup', endCut);
    this.canvas.addEventListener('pointercancel', endCut);
    this.canvas.addEventListener('pointerleave', endCut);

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      }
    });
  }

  startNewGame() {
    this.fruits = [];
    this.halves = [];
    this.floatingTexts = [];
    this.particles.clear();

    this.score = 0;
    this.strikes = 0;
    this.spawnTimer = 0.8;
    this.waveDifficulty = 1.0;
    this.comboCount = 0;
    this.comboTimer = 0;

    this.state = 'PLAYING';
    if (this.onStateChange) this.onStateChange(this.state);
    if (this.onHudUpdate) this.onHudUpdate(this.getHudState());
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      if (this.onStateChange) this.onStateChange(this.state);
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      if (this.onStateChange) this.onStateChange(this.state);
    }
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    const rawDt = (currentTime - this.lastTime) * 0.001;
    this.lastTime = currentTime;
    const dt = Math.max(0.001, Math.min(rawDt, 0.08));

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.blade.update();
    this.particles.update(dt);

    // Decay screen shake
    if (this.shakeTrauma > 0) {
      this.shakeTrauma = Math.max(0, this.shakeTrauma - 2.5 * dt);
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const txt = this.floatingTexts[i];
      txt.y -= 50 * dt;
      txt.life -= dt;
      if (txt.life <= 0) this.floatingTexts.splice(i, 1);
    }

    if (this.state !== 'PLAYING') return;

    // Check Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        if (this.comboCount >= 3) {
          const bonus = this.comboCount;
          this.score += bonus;
          sound.playCombo(this.comboCount);
          this.addFloatingText(`COMBO x${this.comboCount}! +${bonus}`, this.width / 2, 120, '#facc15', 26);
        }
        this.comboCount = 0;
      }
    }

    // Spawn Waves
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnWave();
      this.spawnTimer = Math.max(1.4, 2.6 - this.waveDifficulty * 0.15) * (0.8 + Math.random() * 0.4);
      this.waveDifficulty += 0.03;
    }

    // Update Fruit Halves
    for (let i = this.halves.length - 1; i >= 0; i--) {
      const half = this.halves[i];
      half.update(dt);
      if (half.isDead(this.height)) {
        this.halves.splice(i, 1);
      }
    }

    // Update Fruits
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const fruit = this.fruits[i];
      fruit.update(dt);

      // Missed fruit (fell off screen unsliced)
      if (fruit.isBelowScreen(this.height)) {
        if (!fruit.isBomb && !fruit.sliced) {
          this.strikes++;
          sound.playStrike();
          if (this.onHudUpdate) this.onHudUpdate(this.getHudState());

          if (this.strikes >= this.maxStrikes) {
            this.gameOver();
          }
        }
        this.fruits.splice(i, 1);
      }
    }

    // Check Blade Collisions
    const segment = this.blade.getLastSegment();
    if (segment) {
      for (let i = this.fruits.length - 1; i >= 0; i--) {
        const fruit = this.fruits[i];
        if (!fruit.sliced && fruit.intersectsSegment(segment.x1, segment.y1, segment.x2, segment.y2)) {
          this.sliceFruit(fruit, segment, i);
        }
      }
    }

    if (this.onHudUpdate) this.onHudUpdate(this.getHudState());
  }

  sliceFruit(fruit, segment, index) {
    fruit.sliced = true;

    if (fruit.isBomb) {
      // Sliced a bomb!
      this.shakeTrauma = 0.9;
      this.particles.emitBombExplosion(fruit.x, fruit.y);
      sound.playExplosion();
      this.strikes++;
      this.addFloatingText('BOOM! -1 STRIKE', fruit.x, fruit.y, '#ef4444', 22);

      this.fruits.splice(index, 1);
      if (this.strikes >= this.maxStrikes) {
        this.gameOver();
      }
      return;
    }

    // Slice normal fruit
    const cfg = fruit.config;
    this.score += cfg.points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }

    // Combo calculation
    this.comboCount++;
    this.comboTimer = 0.28; // Window to slice next fruit for combo

    sound.playSlice(this.comboCount);
    this.particles.emitJuice(fruit.x, fruit.y, cfg.splashColor, 20);

    // Compute slice cut angle
    const sliceAngle = Math.atan2(segment.y2 - segment.y1, segment.x2 - segment.x1);
    const splitForce = 140 + Math.random() * 80;

    // Normal to slice vector
    const nx = -Math.sin(sliceAngle);
    const ny = Math.cos(sliceAngle);

    // Spawn two halves flinging apart
    this.halves.push(new FruitHalf(
      fruit.x, fruit.y,
      fruit.vx + nx * splitForce,
      fruit.vy + ny * splitForce - 50,
      fruit.typeKey, 'left', sliceAngle
    ));

    this.halves.push(new FruitHalf(
      fruit.x, fruit.y,
      fruit.vx - nx * splitForce,
      fruit.vy - ny * splitForce - 50,
      fruit.typeKey, 'right', sliceAngle
    ));

    this.fruits.splice(index, 1);
  }

  spawnWave() {
    const fruitKeys = ['watermelon', 'orange', 'banana', 'apple', 'strawberry'];
    // Wave size: 1 to 3 fruits
    const count = 1 + Math.floor(Math.random() * (this.waveDifficulty > 1.5 ? 3 : 2));

    for (let i = 0; i < count; i++) {
      const isBomb = Math.random() < Math.min(0.28, 0.08 + this.waveDifficulty * 0.03);
      const typeKey = isBomb ? 'bomb' : fruitKeys[Math.floor(Math.random() * fruitKeys.length)];

      const x = 120 + Math.random() * (this.width - 240);
      const y = this.height + 40;

      // Toss upward with velocity to reach upper half of screen
      const targetHeight = 120 + Math.random() * 220; // Apex Y
      const g = 680;
      const vy = -Math.sqrt(2 * g * (this.height - targetHeight));

      // Arc towards center
      const centerOffsetX = (this.width / 2 - x);
      const vx = centerOffsetX * (0.6 + Math.random() * 0.6) + (Math.random() - 0.5) * 80;

      this.fruits.push(new Fruit(x, y, vx, vy, typeKey));
    }
  }

  addFloatingText(text, x, y, color = '#facc15', size = 20) {
    this.floatingTexts.push({ text, x, y, color, size, life: 0.9, maxLife: 0.9 });
  }

  gameOver() {
    this.state = 'GAME_OVER';
    if (this.onStateChange) this.onStateChange(this.state);
  }

  getHudState() {
    return {
      score: this.score,
      highScore: this.highScore,
      strikes: this.strikes,
      maxStrikes: this.maxStrikes
    };
  }

  render() {
    const ctx = this.ctx;

    ctx.save();

    // Screen shake
    if (this.shakeTrauma > 0) {
      const maxShake = 18 * Math.pow(this.shakeTrauma, 2);
      ctx.translate((Math.random() * 2 - 1) * maxShake, (Math.random() * 2 - 1) * maxShake);
    }

    // 1. Wood Dojo Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#1c1917');
    bgGrad.addColorStop(0.5, '#292524');
    bgGrad.addColorStop(1, '#18181b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle wood grain lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let y = 30; y < this.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // 2. Background Splatter Stains
    this.particles.drawStains(ctx);

    // 3. Fruit Halves & Fruits
    this.halves.forEach(half => half.draw(ctx));
    this.fruits.forEach(fruit => fruit.draw(ctx));

    // 4. Splatter Particles
    this.particles.drawParticles(ctx);

    // 5. Blade Trail
    this.blade.draw(ctx);

    // 6. Floating Combo Texts
    for (const txt of this.floatingTexts) {
      const alpha = Math.max(0, txt.life / txt.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${txt.size}px "Outfit", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeText(txt.text, txt.x, txt.y);
      ctx.fillStyle = txt.color;
      ctx.fillText(txt.text, txt.x, txt.y);
      ctx.restore();
    }

    ctx.restore();
  }
}

