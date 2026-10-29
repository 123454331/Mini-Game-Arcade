import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');

console.log('🚀 [Build] Starting Mini Game Arcade production build...\n');

// 1. Run Verification Test Suite
console.log('1. Running verification test suite...');
try {
  execSync('node test.js', { stdio: 'inherit' });
  console.log('   ✓ Tests completed successfully.\n');
} catch (err) {
  console.error('   ✗ Test suite failed! Aborting build.');
  process.exit(1);
}

// 2. Clean & Prepare dist directory
console.log('2. Preparing dist/ directory...');
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// Helper to copy directory recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 3. Copy Production Assets
console.log('3. Copying production assets...');
const filesToCopy = [
  'index.html',
  'about.html',
  'contact.html',
  'privacy.html',
  'terms.html'
];
const dirsToCopy = ['css', 'js', 'assets', 'games'];

filesToCopy.forEach(file => {
  const src = path.join(__dirname, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(DIST_DIR, file));
    console.log(`   ✓ Copied ${file}`);
  }
});

dirsToCopy.forEach(dir => {
  const src = path.join(__dirname, dir);
  if (fs.existsSync(src)) {
    copyDirSync(src, path.join(DIST_DIR, dir));
    console.log(`   ✓ Copied ${dir}/`);
  }
});

// 4. Calculate Build Statistics
console.log('\n4. Verifying production bundle:');
function getDirSize(dir) {
  let total = 0;
  let fileCount = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = getDirSize(p);
      total += sub.total;
      fileCount += sub.fileCount;
    } else {
      total += fs.statSync(p).size;
      fileCount++;
    }
  }
  return { total, fileCount };
}

const stats = getDirSize(DIST_DIR);
const kbSize = (stats.total / 1024).toFixed(1);

console.log(`   • Total Output Files: ${stats.fileCount}`);
console.log(`   • Total Static Bundle Size: ${kbSize} KB`);
console.log(`   • Destination: ${DIST_DIR}`);
console.log('\n✨ Mini Game Arcade production build ready! Deployable directly to Vercel, Netlify, or static hosts.');
