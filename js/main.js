/**
 * COSMIC DODGE - APPLICATION ENTRY POINT & UI ORCHESTRATOR
 * Wires DOM event listeners, HUD synchronization, level selection grid,
 * audio settings, and browser tab visibility guards.
 */

import { CONSTANTS } from './constants.js';
import { InputManager } from './input.js';
import { Renderer } from './renderer.js';
import { GameEngine } from './game.js';
import { sound } from './audio.js';
import { storage } from './storage.js';
import { LEVELS } from './levels.js';

// DOM Element References
const canvas = document.getElementById('game-canvas');
const hud = document.getElementById('hud');

// HUD Elements
const hudLevelTag = document.getElementById('hud-level-tag');
const hudLevelTitle = document.getElementById('hud-level-title');
const hudScore = document.getElementById('hud-score');
const hudLives = document.getElementById('hud-lives');
const hudTimer = document.getElementById('hud-timer');
const hudStars = document.getElementById('hud-stars');
const hudComboBadge = document.getElementById('hud-combo-badge');
const hudComboText = document.getElementById('hud-combo-text');
const hudComboFill = document.getElementById('hud-combo-fill');

// Active Power-up Badges
const badgeShield = document.getElementById('hud-badge-shield');
const timerShield = document.getElementById('hud-timer-shield');
const badgeBoost = document.getElementById('hud-badge-boost');
const timerBoost = document.getElementById('hud-timer-boost');
const badgeSlowMo = document.getElementById('hud-badge-slowmo');
const timerSlowMo = document.getElementById('hud-timer-slowmo');

// Touch Ability Button
const btnTouchShield = document.getElementById('btn-touch-shield');
const touchShieldFill = document.getElementById('touch-shield-fill');

// Screens
const screenMenu = document.getElementById('screen-menu');
const screenLevelSelect = document.getElementById('screen-level-select');
const screenHowToPlay = document.getElementById('screen-how-to-play');
const screenPause = document.getElementById('screen-pause');
const screenLevelComplete = document.getElementById('screen-level-complete');
const screenGameOver = document.getElementById('screen-game-over');
const screenCampaignWin = document.getElementById('screen-campaign-win');
const modalResetConfirm = document.getElementById('modal-reset-confirm');

// Level Select Grid
const levelsGrid = document.getElementById('levels-grid');

// Menu Stats
const menuTotalStars = document.getElementById('menu-total-stars');
const menuTotalScore = document.getElementById('menu-total-score');

// Win Modal Stats
const winLevelTitle = document.getElementById('win-level-title');
const winStar1 = document.getElementById('win-star-1');
const winStar2 = document.getElementById('win-star-2');
const winStar3 = document.getElementById('win-star-3');
const winScore = document.getElementById('win-score');
const winStars = document.getElementById('win-stars');
const winBestScore = document.getElementById('win-best-score');

// Fail Modal Stats
const failScore = document.getElementById('fail-score');
const failStars = document.getElementById('fail-stars');
const failBestScore = document.getElementById('fail-best-score');

// Campaign Win Stats
const campaignScore = document.getElementById('campaign-score');
const campaignStars = document.getElementById('campaign-stars');

// Toggle Buttons
const btnToggleSound = document.getElementById('btn-toggle-sound');
const btnToggleMusic = document.getElementById('btn-toggle-music');
const btnMenuSound = document.getElementById('btn-menu-sound');
const btnMenuMusic = document.getElementById('btn-menu-music');

// Core Instances
const input = new InputManager(canvas);
const renderer = new Renderer(canvas);
const game = new GameEngine(canvas, renderer, input);

// ============================================================================
// INITIALIZATION
// ============================================================================
function init() {
  // Sync initial sound preferences
  const soundPref = storage.getSoundEnabled();
  const musicPref = storage.getMusicEnabled();
  sound.setSoundEnabled(soundPref);
  sound.setMusicEnabled(musicPref);
  updateAudioButtons(soundPref, musicPref);

  // Wire Game Hooks
  game.onStateChange = (state) => handleStateChange(state);
  game.onHudUpdate = (hudState) => updateHud(hudState);

  // Setup UI Listeners
  setupEventListeners();

  // Populate UI & Menu metrics
  updateMenuMetrics();

  // Check if first time player and trigger initial state
  if (!storage.hasSeenIntro()) {
    game.setState(CONSTANTS.STATE.HOW_TO_PLAY);
    storage.setSeenIntro(true);
  } else {
    game.setState(CONSTANTS.STATE.MENU);
  }

  // Start engine animation loop
  game.start();
}

// ============================================================================
// UI STATE & SCREEN MANAGEMENT
// ============================================================================
function showScreen(targetScreen) {
  const screens = [
    screenMenu,
    screenLevelSelect,
    screenHowToPlay,
    screenPause,
    screenLevelComplete,
    screenGameOver,
    screenCampaignWin,
  ];

  screens.forEach((s) => {
    if (s === targetScreen) {
      s.classList.remove('hidden');
      s.classList.add('active');
    } else {
      s.classList.add('hidden');
      s.classList.remove('active');
    }
  });

  // Manage HUD visibility
  if (targetScreen === null) {
    hud.classList.remove('hidden');
  } else if (targetScreen === screenPause) {
    hud.classList.remove('hidden'); // Keep HUD visible beneath pause menu
  } else {
    hud.classList.add('hidden');
  }
}

function handleStateChange(state) {
  switch (state) {
    case CONSTANTS.STATE.MENU:
      updateMenuMetrics();
      showScreen(screenMenu);
      break;

    case CONSTANTS.STATE.LEVEL_SELECT:
      renderLevelSelectGrid();
      showScreen(screenLevelSelect);
      break;

    case CONSTANTS.STATE.HOW_TO_PLAY:
      showScreen(screenHowToPlay);
      break;

    case CONSTANTS.STATE.COUNTDOWN:
    case CONSTANTS.STATE.PLAYING:
      showScreen(null); // HUD visible, canvas active
      break;

    case CONSTANTS.STATE.PAUSED:
      showScreen(screenPause);
      break;

    case CONSTANTS.STATE.LEVEL_COMPLETE:
      populateWinModal();
      showScreen(screenLevelComplete);
      break;

    case CONSTANTS.STATE.GAME_OVER:
      populateGameOverModal();
      showScreen(screenGameOver);
      break;

    case CONSTANTS.STATE.CAMPAIGN_WIN:
      populateCampaignWinModal();
      showScreen(screenCampaignWin);
      break;
  }
}

// ============================================================================
// HUD UPDATES
// ============================================================================
function updateHud(state) {
  hudLevelTag.textContent = `LVL ${state.levelIndex}`;
  hudLevelTitle.textContent = state.levelTitle;
  hudScore.textContent = state.score.toLocaleString();

  // Update Lives (Hearts)
  let heartsHtml = '';
  for (let i = 0; i < state.maxLives; i++) {
    if (i < state.lives) {
      heartsHtml += '<span class="heart full">❤</span>';
    } else {
      heartsHtml += '<span class="heart empty" style="opacity: 0.25;">❤</span>';
    }
  }
  hudLives.innerHTML = heartsHtml;

  // Objective counters
  if (state.objectiveType === 'SURVIVE_TIME') {
    hudTimer.textContent = `${state.remainingTime}s`;
    hudStars.textContent = `${state.starsCollected}`;
  } else if (state.objectiveType === 'COLLECT_STARS') {
    hudTimer.textContent = `${state.remainingTime}s`;
    hudStars.textContent = `${state.starsCollected} / ${state.targetStars}`;
  } else {
    hudTimer.textContent = `${state.remainingTime}s`;
    hudStars.textContent = `${state.starsCollected} / ${state.targetStars}`;
  }

  // Combo Badge
  if (state.comboMultiplier > 1.0) {
    hudComboBadge.classList.remove('hidden');
    hudComboText.textContent = `${state.comboMultiplier.toFixed(1)}x COMBO`;
    hudComboFill.style.width = `${state.comboProgress * 100}%`;
  } else {
    hudComboBadge.classList.add('hidden');
  }

  // Powerup Buff Badges
  if (state.isShielded) {
    badgeShield.classList.remove('hidden');
    timerShield.textContent = `${state.activeShieldDuration}s`;
  } else {
    badgeShield.classList.add('hidden');
  }

  if (state.isBoosted) {
    badgeBoost.classList.remove('hidden');
    timerBoost.textContent = `${state.activeBoostDuration}s`;
  } else {
    badgeBoost.classList.add('hidden');
  }

  if (state.isSlowMo) {
    badgeSlowMo.classList.remove('hidden');
    timerSlowMo.textContent = `${state.activeSlowMoDuration}s`;
  } else {
    badgeSlowMo.classList.add('hidden');
  }

  // Touch Shield Ability Button Ring
  // Circumference: 2 * PI * 30 = ~188.5
  const circumference = 188.5;
  const offset = circumference * (1 - state.shieldCooldownProgress);
  touchShieldFill.style.strokeDashoffset = offset;
  btnTouchShield.style.opacity = state.isShieldReady ? '1.0' : '0.55';
}

// ============================================================================
// LEVEL SELECT GRID BUILDER
// ============================================================================
function renderLevelSelectGrid() {
  levelsGrid.innerHTML = '';

  LEVELS.forEach((lvl) => {
    const isUnlocked = storage.isLevelUnlocked(lvl.id);
    const lvlData = storage.getLevelData(lvl.id);

    const btn = document.createElement('button');
    btn.className = `level-card-btn ${isUnlocked ? 'unlocked' : 'locked'}`;
    btn.setAttribute('aria-label', `Level ${lvl.id}: ${lvl.title}`);
    if (!isUnlocked) {
      btn.setAttribute('disabled', 'true');
    }

    // Star icons
    let starsHtml = '';
    for (let s = 1; s <= 3; s++) {
      starsHtml += s <= lvlData.stars ? '★' : '☆';
    }

    btn.innerHTML = `
      <div class="level-card-top">
        <span class="lvl-badge">LEVEL ${lvl.id}</span>
        <span class="lvl-stars">${isUnlocked ? starsHtml : '🔒'}</span>
      </div>
      <div class="lvl-title">${lvl.title}</div>
      <div class="lvl-score">${isUnlocked ? (lvlData.bestScore ? `Best: ${lvlData.bestScore.toLocaleString()}` : 'Not Cleared') : 'Locked'}</div>
    `;

    if (isUnlocked) {
      btn.addEventListener('click', () => {
        sound.playButtonClick();
        game.loadLevel(lvl.id);
      });
    }

    levelsGrid.appendChild(btn);
  });
}

function updateMenuMetrics() {
  menuTotalStars.textContent = `${storage.getTotalStarsEarned()} / 30`;
  menuTotalScore.textContent = storage.memoryCache.totalCampaignScore.toLocaleString();
}

// ============================================================================
// MODAL POPULATORS
// ============================================================================
function populateWinModal() {
  const lvlConfig = game.currentLevelConfig;
  const lvlData = storage.getLevelData(game.currentLevelIndex);

  winLevelTitle.textContent = `${lvlConfig.title.toUpperCase()} CLEARED`;
  winScore.textContent = game.score.toLocaleString();
  winStars.textContent = `${game.starsCollected} Stars`;
  winBestScore.textContent = lvlData.bestScore.toLocaleString();

  // Populate Star Icons
  const starsEarned = lvlData.stars || 1;
  winStar1.className = 'star-icon ' + (starsEarned >= 1 ? 'earned' : '');
  winStar2.className = 'star-icon ' + (starsEarned >= 2 ? 'earned' : '');
  winStar3.className = 'star-icon ' + (starsEarned >= 3 ? 'earned' : '');

  // If last level, alter button label
  const btnWinNext = document.getElementById('btn-win-next');
  if (game.currentLevelIndex === 10) {
    btnWinNext.innerHTML = '<span>VICTORY CEREMONY 🏆</span>';
  } else {
    btnWinNext.innerHTML = '<span>NEXT SECTOR ➔</span>';
  }
}

function populateGameOverModal() {
  const lvlData = storage.getLevelData(game.currentLevelIndex);
  failScore.textContent = game.score.toLocaleString();
  failStars.textContent = `${game.starsCollected} Stars`;
  failBestScore.textContent = lvlData.bestScore.toLocaleString();
}

function populateCampaignWinModal() {
  campaignScore.textContent = storage.memoryCache.totalCampaignScore.toLocaleString();
  campaignStars.textContent = `${storage.getTotalStarsEarned()} / 30`;
}

function updateAudioButtons(soundEnabled, musicEnabled) {
  btnToggleSound.textContent = soundEnabled ? '🔊' : '🔇';
  btnToggleMusic.textContent = musicEnabled ? '🎵' : '🚫';
  btnMenuSound.textContent = `Sound: ${soundEnabled ? 'ON' : 'OFF'}`;
  btnMenuMusic.textContent = `Music: ${musicEnabled ? 'ON' : 'OFF'}`;
}

// ============================================================================
// EVENT LISTENERS & NAVIGATION
// ============================================================================
function setupEventListeners() {
  // Sound & Music Toggles
  const handleToggleSound = () => {
    sound.initContext();
    const current = storage.getSoundEnabled();
    const next = !current;
    storage.setSoundEnabled(next);
    sound.setSoundEnabled(next);
    updateAudioButtons(next, storage.getMusicEnabled());
    sound.playButtonClick();
  };

  const handleToggleMusic = () => {
    sound.initContext();
    const current = storage.getMusicEnabled();
    const next = !current;
    storage.setMusicEnabled(next);
    sound.setMusicEnabled(next);
    updateAudioButtons(storage.getSoundEnabled(), next);
    sound.playButtonClick();
  };

  btnToggleSound.addEventListener('click', handleToggleSound);
  btnToggleMusic.addEventListener('click', handleToggleMusic);
  btnMenuSound.addEventListener('click', handleToggleSound);
  btnMenuMusic.addEventListener('click', handleToggleMusic);

  // Main Menu Actions
  document.getElementById('btn-play-game').addEventListener('click', () => {
    sound.initContext();
    sound.playButtonClick();
    // Start at next uncompleted level or level 1
    const targetLvl = storage.memoryCache.unlockedLevel || 1;
    game.loadLevel(targetLvl);
  });

  document.getElementById('btn-open-levels').addEventListener('click', () => {
    sound.initContext();
    sound.playButtonClick();
    game.setState(CONSTANTS.STATE.LEVEL_SELECT);
  });

  document.getElementById('btn-open-help').addEventListener('click', () => {
    sound.initContext();
    sound.playButtonClick();
    game.setState(CONSTANTS.STATE.HOW_TO_PLAY);
  });

  document.getElementById('btn-levels-back').addEventListener('click', () => {
    sound.playButtonClick();
    game.setState(CONSTANTS.STATE.MENU);
  });

  document.getElementById('btn-help-close').addEventListener('click', () => {
    sound.initContext();
    sound.playButtonClick();
    game.setState(CONSTANTS.STATE.MENU);
  });

  // Pause Menu Actions
  document.getElementById('btn-pause').addEventListener('click', () => {
    sound.playButtonClick();
    game.togglePause();
  });

  document.getElementById('btn-pause-resume').addEventListener('click', () => {
    sound.playButtonClick();
    game.togglePause();
  });

  document.getElementById('btn-pause-restart').addEventListener('click', () => {
    sound.playButtonClick();
    game.restartCurrentLevel();
  });

  document.getElementById('btn-pause-levels').addEventListener('click', () => {
    sound.playButtonClick();
    game.setState(CONSTANTS.STATE.LEVEL_SELECT);
  });

  document.getElementById('btn-pause-help').addEventListener('click', () => {
    sound.playButtonClick();
    game.setState(CONSTANTS.STATE.HOW_TO_PLAY);
  });

  document.getElementById('btn-pause-menu').addEventListener('click', () => {
    sound.playButtonClick();
    game.setState(CONSTANTS.STATE.MENU);
  });

  // Level Complete Actions
  document.getElementById('btn-win-next').addEventListener('click', () => {
    sound.playButtonClick();
    game.nextLevel();
  });

  document.getElementById('btn-win-replay').addEventListener('click', () => {
    sound.playButtonClick();
    game.restartCurrentLevel();
  });

  document.getElementById('btn-win-levels').addEventListener('click', () => {
    sound.playButtonClick();
    game.setState(CONSTANTS.STATE.LEVEL_SELECT);
  });

  // Game Over Actions
  document.getElementById('btn-fail-retry').addEventListener('click', () => {
    sound.playButtonClick();
    game.restartCurrentLevel();
  });

  document.getElementById('btn-fail-levels').addEventListener('click', () => {
    sound.playButtonClick();
    game.setState(CONSTANTS.STATE.LEVEL_SELECT);
  });

  document.getElementById('btn-fail-menu').addEventListener('click', () => {
    sound.playButtonClick();
    game.setState(CONSTANTS.STATE.MENU);
  });

  // Campaign Victory Actions
  document.getElementById('btn-campaign-replay').addEventListener('click', () => {
    sound.playButtonClick();
    game.loadLevel(1);
  });

  document.getElementById('btn-campaign-levels').addEventListener('click', () => {
    sound.playButtonClick();
    game.setState(CONSTANTS.STATE.LEVEL_SELECT);
  });

  // Mobile Touch Shield Trigger
  btnTouchShield.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sound.initContext();
    game.triggerEmergencyShield();
  });

  // Reset Progress Modal
  document.getElementById('btn-open-reset').addEventListener('click', () => {
    sound.playButtonClick();
    modalResetConfirm.classList.remove('hidden');
  });

  document.getElementById('btn-cancel-reset').addEventListener('click', () => {
    sound.playButtonClick();
    modalResetConfirm.classList.add('hidden');
  });

  document.getElementById('btn-confirm-reset').addEventListener('click', () => {
    sound.playButtonClick();
    storage.resetAllProgress();
    modalResetConfirm.classList.add('hidden');
    updateMenuMetrics();
  });

  // Browser Autoplay Policy: resume AudioContext on first interaction
  const resumeAudioOnGesture = () => {
    sound.initContext();
    window.removeEventListener('pointerdown', resumeAudioOnGesture);
    window.removeEventListener('keydown', resumeAudioOnGesture);
  };
  window.addEventListener('pointerdown', resumeAudioOnGesture);
  window.addEventListener('keydown', resumeAudioOnGesture);

  // Tab Visibility Change Auto-Pause Guard
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === CONSTANTS.STATE.PLAYING) {
      game.setState(CONSTANTS.STATE.PAUSED);
    }
  });
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', init);

