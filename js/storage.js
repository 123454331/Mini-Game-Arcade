/**
 * COSMIC DODGE - LOCAL STORAGE PROGRESS & SETTINGS MANAGER
 * Handles resilient local persistence of unlocked levels, star ratings,
 * high scores, audio preferences, and onboarding status.
 */

import { CONSTANTS } from './constants.js';

class StorageManager {
  constructor() {
    this.key = CONSTANTS.STORAGE_KEY;
    this.memoryCache = this.getDefaultData();
    this.isStorageAvailable = this.checkStorageAvailability();
    this.load();
  }

  getDefaultData() {
    return {
      unlockedLevel: 1, // 1 to 10
      levels: {
        1: { unlocked: true, stars: 0, bestScore: 0, completed: false },
        2: { unlocked: false, stars: 0, bestScore: 0, completed: false },
        3: { unlocked: false, stars: 0, bestScore: 0, completed: false },
        4: { unlocked: false, stars: 0, bestScore: 0, completed: false },
        5: { unlocked: false, stars: 0, bestScore: 0, completed: false },
        6: { unlocked: false, stars: 0, bestScore: 0, completed: false },
        7: { unlocked: false, stars: 0, bestScore: 0, completed: false },
        8: { unlocked: false, stars: 0, bestScore: 0, completed: false },
        9: { unlocked: false, stars: 0, bestScore: 0, completed: false },
        10: { unlocked: false, stars: 0, bestScore: 0, completed: false },
      },
      campaignCompleted: false,
      totalCampaignScore: 0,
      soundEnabled: true,
      musicEnabled: true,
      hasSeenIntro: false,
    };
  }

  checkStorageAvailability() {
    try {
      const testKey = '__cosmic_storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  load() {
    if (!this.isStorageAvailable) return;
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with defaults to guard against schema changes
        this.memoryCache = {
          ...this.getDefaultData(),
          ...parsed,
          levels: {
            ...this.getDefaultData().levels,
            ...(parsed.levels || {})
          }
        };
      }
    } catch (e) {
      console.warn('[CosmicDodge] Failed to read localStorage, falling back to memory state', e);
    }
  }

  save() {
    if (!this.isStorageAvailable) return;
    try {
      localStorage.setItem(this.key, JSON.stringify(this.memoryCache));
    } catch (e) {
      console.warn('[CosmicDodge] Failed to write to localStorage', e);
    }
  }

  isLevelUnlocked(levelNumber) {
    if (levelNumber === 1) return true;
    return !!(this.memoryCache.levels[levelNumber] && this.memoryCache.levels[levelNumber].unlocked);
  }

  getLevelData(levelNumber) {
    return this.memoryCache.levels[levelNumber] || { unlocked: false, stars: 0, bestScore: 0, completed: false };
  }

  /**
   * Records level completion, awards stars, updates high scores, and unlocks next level.
   */
  recordLevelCompletion(levelNumber, score, starsEarned) {
    const current = this.getLevelData(levelNumber);
    const newBestScore = Math.max(current.bestScore || 0, score);
    const newBestStars = Math.max(current.stars || 0, Math.min(3, Math.max(1, starsEarned)));

    this.memoryCache.levels[levelNumber] = {
      unlocked: true,
      completed: true,
      stars: newBestStars,
      bestScore: newBestScore
    };

    // Unlock next level if exists
    const nextLevel = levelNumber + 1;
    if (nextLevel <= 10) {
      if (!this.memoryCache.levels[nextLevel]) {
        this.memoryCache.levels[nextLevel] = { unlocked: true, stars: 0, bestScore: 0, completed: false };
      } else {
        this.memoryCache.levels[nextLevel].unlocked = true;
      }
      this.memoryCache.unlockedLevel = Math.max(this.memoryCache.unlockedLevel, nextLevel);
    } else {
      this.memoryCache.campaignCompleted = true;
    }

    // Recalculate total campaign score
    let sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += (this.memoryCache.levels[i]?.bestScore || 0);
    }
    this.memoryCache.totalCampaignScore = sum;

    this.save();
    return { isNewHighScore: score > (current.bestScore || 0), starsEarned: newBestStars };
  }

  getTotalStarsEarned() {
    let total = 0;
    for (let i = 1; i <= 10; i++) {
      total += (this.memoryCache.levels[i]?.stars || 0);
    }
    return total;
  }

  getSoundEnabled() {
    return this.memoryCache.soundEnabled;
  }

  setSoundEnabled(enabled) {
    this.memoryCache.soundEnabled = !!enabled;
    this.save();
  }

  getMusicEnabled() {
    return this.memoryCache.musicEnabled;
  }

  setMusicEnabled(enabled) {
    this.memoryCache.musicEnabled = !!enabled;
    this.save();
  }

  hasSeenIntro() {
    return !!this.memoryCache.hasSeenIntro;
  }

  setSeenIntro(val = true) {
    this.memoryCache.hasSeenIntro = !!val;
    this.save();
  }

  resetAllProgress() {
    this.memoryCache = this.getDefaultData();
    this.save();
  }
}

export const storage = new StorageManager();

