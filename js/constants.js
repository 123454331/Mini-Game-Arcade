/**
 * COSMIC DODGE - GAME CONSTANTS
 * Defines core virtual dimensions, physics, timing, and score parameters.
 */

export const CONSTANTS = {
  // Virtual canvas dimensions (aspect ratio ~8:9, perfect for mobile portrait & desktop arcade frame)
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 900,

  // Player configurations
  PLAYER: {
    WIDTH: 52,
    HEIGHT: 60,
    COLLISION_RADIUS: 22,
    MAX_SPEED: 460,           // Pixels per second
    ACCELERATION: 2800,       // Responsive yet smooth
    FRICTION: 12,             // Smooth deceleration
    INITIAL_LIVES: 3,
    MAX_LIVES: 4,
    INVULNERABLE_DURATION: 1.8, // Seconds of i-frames after hit
    EMERGENCY_SHIELD_COOLDOWN: 16.0, // Seconds to recharge emergency shield
    EMERGENCY_SHIELD_DURATION: 4.0,  // Active duration when triggered manually
  },

  // Collectibles & Powerups
  POWERUPS: {
    SHIELD_DURATION: 8.0,
    BOOST_DURATION: 6.0,
    BOOST_SPEED_MULTIPLIER: 1.5,
    SLOWMO_DURATION: 6.0,
    SLOWMO_FACTOR: 0.45,       // Hazards move at 45% speed
    SPAWN_INTERVAL_MIN: 10.0,
    SPAWN_INTERVAL_MAX: 18.0,
    LIFETIME: 10.0,            // Time a collectible floats before fading
  },

  // Scoring & Combo System
  SCORING: {
    STAR_BASE: 100,
    NEAR_MISS_BASE: 50,
    NEAR_MISS_DISTANCE: 34,    // Extra pixel radius around hazard to count as near-miss
    SECOND_SURVIVED_BASE: 10,
    LEVEL_CLEAR_BASE: 1000,
    COMBO_TIMEOUT: 3.2,        // Seconds before combo multiplier resets
    MAX_COMBO: 4.0,            // 1.0x -> 1.5x -> 2.0x -> ... -> 4.0x
    COMBO_STEP: 0.5,
  },

  // Storage keys
  STORAGE_KEY: 'cosmic_dodge_v1_save',
  
  // Game States
  STATE: {
    MENU: 'MENU',
    LEVEL_SELECT: 'LEVEL_SELECT',
    HOW_TO_PLAY: 'HOW_TO_PLAY',
    COUNTDOWN: 'COUNTDOWN',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    LEVEL_COMPLETE: 'LEVEL_COMPLETE',
    GAME_OVER: 'GAME_OVER',
    CAMPAIGN_WIN: 'CAMPAIGN_WIN',
  }
};

