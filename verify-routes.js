import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== CHECKING ALL ASSET PATHS & CASE-SENSITIVITY ===\n');

let errors = 0;
let checked = 0;

function checkFileExistsCaseSensitive(baseDir, relativePath) {
  checked++;
  // Split query or hash
  const cleanPath = relativePath.split('?')[0].split('#')[0];
  if (!cleanPath || cleanPath.startsWith('http') || cleanPath.startsWith('//') || cleanPath.startsWith('mailto:')) {
    return; // Remote or anchor only
  }

  const fullPath = path.resolve(baseDir, cleanPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`  ✗ MISSING: "${cleanPath}" referenced from "${baseDir}"`);
    errors++;
    return;
  }

  // Check exact case on filesystem
  const segments = path.relative(__dirname, fullPath).split(path.sep);
  let current = __dirname;
  for (const seg of segments) {
    if (!seg || seg === '.') continue;
    const items = fs.readdirSync(current);
    if (!items.includes(seg)) {
      console.error(`  ✗ CASE MISMATCH: expected exact segment "${seg}" in "${current}" (found: ${items.filter(i => i.toLowerCase() === seg.toLowerCase()).join(', ')})`);
      errors++;
      return;
    }
    current = path.join(current, seg);
  }
}

// 1. Check HTML files
const htmlFiles = [
  'index.html',
  'about.html',
  'contact.html',
  'privacy.html',
  'terms.html',
  'games/cosmic-dodge/index.html',
  'games/fruit-slicer/index.html'
];

htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const fileDir = path.dirname(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Match href, src
  const hrefMatches = content.matchAll(/(?:href|src)=["']([^"']+)["']/g);
  for (const match of hrefMatches) {
    const ref = match[1];
    checkFileExistsCaseSensitive(fileDir, ref);
  }
});

// 2. Check JS imports
function checkJsImports(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
      checkJsImports(full);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf-8');
      const importMatches = content.matchAll(/from\s+["'](\.[^"']+)["']/g);
      for (const m of importMatches) {
        checkFileExistsCaseSensitive(dir, m[1]);
      }
    }
  }
}

checkJsImports(path.join(__dirname, 'js'));
checkJsImports(path.join(__dirname, 'games'));

console.log(`\nChecked ${checked} path references.`);
if (errors === 0) {
  console.log('✓ All routes, assets, and imports exist with exact case-sensitivity matching!');
} else {
  console.error(`✗ Found ${errors} path or case-sensitivity errors.`);
  process.exit(1);
}

