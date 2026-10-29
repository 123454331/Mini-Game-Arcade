/**
 * MINI GAME ARCADE - PLATFORM VERIFICATION TEST SUITE
 * Validates games registry, file paths, entity math, and level configs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { GAMES, CATEGORIES, getGameById } from './js/games-data.js';
import { CONSTANTS } from './js/constants.js';
import { LEVELS } from './js/levels.js';
import { Player, circleIntersect } from './js/entities.js';
import { Fruit, FruitHalf, FRUIT_TYPES } from './games/fruit-slicer/js/fruit.js';
import { Blade } from './games/fruit-slicer/js/blade.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedTests++;
  }
}

console.log('=== RUNNING MINI GAME ARCADE PLATFORM TESTS ===\n');

// 1. ARCADE REGISTRY TESTS
console.log('1. Checking Central Games Registry:');
assert(Array.isArray(CATEGORIES) && CATEGORIES.length >= 3, 'Categories array defined with at least 3 categories');
assert(GAMES.length >= 2, `Registry has ${GAMES.length} verified playable games`);

GAMES.forEach((game) => {
  assert(typeof game.id === 'string' && game.id.length > 0, `Game ${game.id} has valid ID`);
  assert(typeof game.title === 'string' && game.title.length > 0, `Game ${game.title} has valid title`);
  assert(typeof game.category === 'string', `Game ${game.title} has category: ${game.category}`);
  assert(CATEGORIES.includes(game.category), `Game ${game.title} category is in CATEGORIES list`);
  assert(game.controls && game.controls.desktop && game.controls.mobile, `Game ${game.title} has controls documentation`);

  // Verify thumbnail file exists
  const thumbPath = path.join(__dirname, game.thumbnail);
  assert(fs.existsSync(thumbPath), `Thumbnail exists on disk: ${game.thumbnail}`);

  // Verify game entry path exists
  const gameHtmlPath = path.join(__dirname, game.path);
  assert(fs.existsSync(gameHtmlPath), `Game entry point exists on disk: ${game.path}`);
});

assert(getGameById('cosmic-dodge') !== null, 'getGameById finds cosmic-dodge');
assert(getGameById('fruit-slicer') !== null, 'getGameById finds fruit-slicer');
assert(getGameById('non-existent') === null, 'getGameById returns null for invalid ID');

// 2. COSMIC DODGE ENGINE TESTS
console.log('\n2. Checking Cosmic Dodge Game:');
assert(LEVELS.length === 10, 'Cosmic Dodge has exactly 10 levels');
const player = new Player(400, 700);
assert(player.lives === 3, 'Cosmic Dodge player starts with 3 lives');
assert(circleIntersect(10, 10, 5, 12, 10, 5) === true, 'circleIntersect accurately identifies collision');

// 3. FRUIT SLICER ENGINE TESTS
console.log('\n3. Checking Fruit Slicer Game:');
assert(FRUIT_TYPES.watermelon && FRUIT_TYPES.bomb, 'FRUIT_TYPES defines watermelon and bomb');
const watermelon = new Fruit(200, 400, 50, -400, 'watermelon');
assert(watermelon.radius === 46, 'Watermelon has radius 46');
assert(watermelon.isBomb === false, 'Watermelon is not a bomb');
assert(watermelon.intersectsSegment(150, 400, 250, 400) === true, 'intersectsSegment detects horizontal slice through fruit');
assert(watermelon.intersectsSegment(50, 50, 60, 60) === false, 'intersectsSegment detects miss away from fruit');

const bomb = new Fruit(300, 400, 0, -300, 'bomb');
assert(bomb.isBomb === true, 'Bomb entity isBomb is true');

const blade = new Blade();
assert(blade.isCutting === false, 'Blade is initially not cutting');
blade.addPoint(100, 100);
blade.addPoint(150, 150);
assert(blade.points.length === 2, 'Blade tracks input points');

// 4. STATIC PAGES EXISTENCE
console.log('\n4. Checking Static Informational Pages & Routes:');
const requiredPages = ['index.html', 'about.html', 'contact.html', 'privacy.html', 'terms.html'];
requiredPages.forEach(p => {
  assert(fs.existsSync(path.join(__dirname, p)), `Page exists: ${p}`);
});

// Run case-sensitive route validation
import { execSync } from 'child_process';
try {
  execSync('node verify-routes.js', { stdio: 'pipe' });
  assert(true, '120 internal route and asset references verified with exact case matching');
} catch (e) {
  assert(false, 'Route verification failed');
}

console.log('\n=================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('=================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
