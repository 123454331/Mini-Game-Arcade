/**
 * COSMIC DODGE - UNIFIED INPUT MANAGER
 * Handles Keyboard, Mouse, and Touch interactions reliably across Desktop and Mobile.
 * Includes pointer-cancellation, focus loss, and scroll-prevention guards.
 */

import { CONSTANTS } from './constants.js';

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;

    // Movement direction vector (-1 to 1)
    this.dir = { x: 0, y: 0, active: false };

    // Keyboard state
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      space: false,
      pause: false,
    };

    // Pointer / Touch tracking
    this.pointerActive = false;
    this.pointerTarget = { x: CONSTANTS.CANVAS_WIDTH / 2, y: CONSTANTS.CANVAS_HEIGHT - 160 };
    this.activePointerId = null;

    // Callbacks for discrete triggers
    this.onPauseToggle = null;
    this.onShieldTrigger = null;

    this.bindEvents();
  }

  bindEvents() {
    // 1. Keyboard Listeners
    window.addEventListener('keydown', (e) => {
      // Prevent page scrolling on Arrow keys and Space during gameplay
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.up = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.down = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'Space':
          if (!this.keys.space) {
            this.keys.space = true;
            if (this.onShieldTrigger) this.onShieldTrigger();
          }
          break;
        case 'KeyP':
        case 'Escape':
          if (!this.keys.pause) {
            this.keys.pause = true;
            if (this.onPauseToggle) this.onPauseToggle();
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.up = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.down = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'Space':
          this.keys.space = false;
          break;
        case 'KeyP':
        case 'Escape':
          this.keys.pause = false;
          break;
      }
    });

    // 2. Pointer / Touch Events on Canvas
    this.canvas.addEventListener('pointerdown', (e) => {
      // Prevent browser zoom or touch scroll
      e.preventDefault();
      this.canvas.setPointerCapture?.(e.pointerId);
      this.activePointerId = e.pointerId;
      this.pointerActive = true;
      this.updatePointerCoords(e);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.pointerActive || (this.activePointerId !== null && e.pointerId !== this.activePointerId)) {
        return;
      }
      e.preventDefault();
      this.updatePointerCoords(e);
    });

    const endPointer = (e) => {
      if (this.activePointerId === null || e.pointerId === this.activePointerId) {
        this.pointerActive = false;
        this.activePointerId = null;
      }
    };

    this.canvas.addEventListener('pointerup', endPointer);
    this.canvas.addEventListener('pointercancel', endPointer);
    this.canvas.addEventListener('pointerleave', (e) => {
      // If mouse leaves without holding down, deactivate
      if (e.pointerType === 'mouse' && e.buttons === 0) {
        this.pointerActive = false;
      }
    });

    // 3. Window blur / lost focus reset
    window.addEventListener('blur', () => {
      this.resetInput();
    });
  }

  updatePointerCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Map screen pixels to virtual canvas coordinates
    const scaleX = CONSTANTS.CANVAS_WIDTH / rect.width;
    const scaleY = CONSTANTS.CANVAS_HEIGHT / rect.height;

    let targetX = (e.clientX - rect.left) * scaleX;
    let targetY = (e.clientY - rect.top) * scaleY;

    // On touch devices, apply an ergonomic vertical offset (~45 virtual px upward)
    // so the player's thumb/finger does not physically obscure their spaceship!
    if (e.pointerType === 'touch') {
      targetY -= 45;
    }

    this.pointerTarget.x = Math.max(30, Math.min(CONSTANTS.CANVAS_WIDTH - 30, targetX));
    this.pointerTarget.y = Math.max(80, Math.min(CONSTANTS.CANVAS_HEIGHT - 30, targetY));
  }

  resetInput() {
    this.keys.up = false;
    this.keys.down = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.space = false;
    this.keys.pause = false;
    this.pointerActive = false;
    this.activePointerId = null;
    this.dir.x = 0;
    this.dir.y = 0;
    this.dir.active = false;
  }

  /**
   * Evaluates keyboard & pointer inputs and returns a normalized direction vector.
   * Player current coords (px, py) passed in to compute directional vector from pointer.
   */
  getMovementVector(px, py) {
    // Priority 1: Pointer / Touch dragging
    if (this.pointerActive) {
      const dx = this.pointerTarget.x - px;
      const dy = this.pointerTarget.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Deadzone of 8px to prevent jitter
      if (dist > 8) {
        const factor = Math.min(1.0, dist / 40); // Smooth scaling at small distances
        this.dir.x = (dx / dist) * factor;
        this.dir.y = (dy / dist) * factor;
        this.dir.active = true;
        return this.dir;
      } else {
        this.dir.x = 0;
        this.dir.y = 0;
        this.dir.active = false;
        return this.dir;
      }
    }

    // Priority 2: Keyboard WASD / Arrows
    let kx = 0;
    let ky = 0;
    if (this.keys.left) kx -= 1;
    if (this.keys.right) kx += 1;
    if (this.keys.up) ky -= 1;
    if (this.keys.down) ky += 1;

    if (kx !== 0 || ky !== 0) {
      const len = Math.sqrt(kx * kx + ky * ky);
      this.dir.x = kx / len;
      this.dir.y = ky / len;
      this.dir.active = true;
    } else {
      this.dir.x = 0;
      this.dir.y = 0;
      this.dir.active = false;
    }

    return this.dir;
  }
}

