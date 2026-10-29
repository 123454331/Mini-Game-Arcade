import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runArcadeBrowserTests() {
  console.log('🚀 Starting Mini Game Arcade Browser Test Runner...\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1200, height: 850, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--mute-audio', '--autoplay-policy=no-user-gesture-required']
  });

  const page = await browser.newPage();
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.error(`  [Browser Error]: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
    console.error(`  [Page Error]: ${err.message}`);
  });

  try {
    // 1. Test Homepage
    console.log('1. Loading Mini Game Arcade Homepage (http://localhost:3000)...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    const title = await page.title();
    console.log(`   Page Title: "${title}"`);
    if (!title.includes('Mini Game Arcade')) throw new Error('Invalid arcade homepage title');

    // Verify 2 Game Cards rendered
    const cardCount = await page.$$eval('.game-card', els => els.length);
    console.log(`   Rendered Game Cards: ${cardCount}`);
    if (cardCount !== 2) throw new Error(`Expected 2 cards, got ${cardCount}`);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'arcade-01-home.png') });
    console.log('   ✓ Captured screenshot: arcade-01-home.png');

    // 2. Test Category Filters
    console.log('\n2. Testing Category Filtering...');
    const actionTab = await page.$('button[role="tab"]:nth-child(2)'); // "Action & Survival"
    await actionTab.click();
    await new Promise(r => setTimeout(r, 200));

    const actionCount = await page.$$eval('.game-card', els => els.length);
    console.log(`   Action & Survival Cards: ${actionCount}`);
    if (actionCount !== 1) throw new Error(`Expected 1 game for Action & Survival, got ${actionCount}`);

    const allTab = await page.$('button[role="tab"]:nth-child(1)'); // "All Games"
    await allTab.click();
    await new Promise(r => setTimeout(r, 200));

    // 3. Test Real-time Search Input
    console.log('\n3. Testing Real-time Search Input...');
    await page.type('#search-input', 'Fruit');
    await new Promise(r => setTimeout(r, 250));

    const searchCount = await page.$$eval('.game-card', els => els.length);
    console.log(`   Search for "Fruit" results: ${searchCount}`);
    if (searchCount !== 1) throw new Error('Search failed to filter to Fruit Slicer');

    // Clear search
    await page.click('#search-input', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 200));

    // 4. Test Navigation to Informational Pages
    console.log('\n4. Testing Informational Pages (About, Contact, Privacy, Terms)...');
    for (const p of ['about.html', 'contact.html', 'privacy.html', 'terms.html']) {
      await page.goto(`http://localhost:3000/${p}`, { waitUntil: 'networkidle0' });
      const pTitle = await page.title();
      console.log(`   ✓ Loaded ${p}: "${pTitle}"`);
    }

    // 5. Test Fruit Slicer Game
    console.log('\n5. Testing Fruit Slicer Game (/games/fruit-slicer/index.html)...');
    await page.goto('http://localhost:3000/games/fruit-slicer/index.html', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'arcade-02-fruit-slicer-start.png') });

    // Click Start Slicing
    await page.click('#btn-start');
    await new Promise(r => setTimeout(r, 400));

    // Simulate slicing gesture across canvas
    console.log('   Simulating slicing swipe gesture...');
    const canvasBox = await page.$eval('#fruit-canvas', el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });

    await page.mouse.move(canvasBox.x + 100, canvasBox.y + 400);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 500, canvasBox.y + 200, { steps: 8 });
    await page.mouse.up();

    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'arcade-03-fruit-slicer-active.png') });
    console.log('   ✓ Captured screenshot: arcade-03-fruit-slicer-active.png');

    // 6. Test Cosmic Dodge Game
    console.log('\n6. Testing Cosmic Dodge Game (/games/cosmic-dodge/index.html)...');
    await page.goto('http://localhost:3000/games/cosmic-dodge/index.html', { waitUntil: 'networkidle0' });
    
    // Dismiss help or click play
    const btnPlay = await page.$('#btn-play-game');
    if (btnPlay) {
      await btnPlay.click();
      console.log('   Clicked Play Game in Cosmic Dodge');
      await new Promise(r => setTimeout(r, 1000));
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'arcade-04-cosmic-dodge-play.png') });
    console.log('   ✓ Captured screenshot: arcade-04-cosmic-dodge-play.png');

    console.log('\n======================================================');
    console.log('ARCADE BROWSER E2E TESTS COMPLETED SUCCESSFULLY!');
    console.log(`Total Errors Detected: ${errors.length}`);
    console.log('======================================================\n');

    if (errors.length > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runArcadeBrowserTests();
