import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { scanFridgeWithGemini } from '../src/services/gemini.js';

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg';
  }
}

async function run() {
  const imageArg = process.argv[2];

  if (!imageArg) {
    console.log(`
============================================================
              AYAMAA FRIDGE SCANNER CLI TEST
============================================================
Usage:
  node scripts/test_scan.js <path-to-image>

Example:
  node scripts/test_scan.js ~/Downloads/my_fridge.jpg
============================================================
`);
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), imageArg);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found at "${resolvedPath}"`);
    process.exit(1);
  }

  const mimeType = getMimeType(resolvedPath);
  const fileBuffer = fs.readFileSync(resolvedPath);
  const cleanBase64 = fileBuffer.toString('base64');
  const fileSizeKB = (fileBuffer.length / 1024).toFixed(1);

  console.log(`
============================================================
              AYAMAA FRIDGE SCANNER CLI TEST
============================================================
File:     ${path.basename(resolvedPath)} (${fileSizeKB} KB)
Type:     ${mimeType}
Model:    ${process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'}
Scanning fridge contents with Indian culinary intelligence...
============================================================
`);

  const startTime = Date.now();
  try {
    const result = await scanFridgeWithGemini({ cleanBase64, mimeType });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`Scan completed in ${duration}s!\n`);
    
    console.log(`--- DETECTED INGREDIENTS (${result.items.length}) ---`);
    if (result.items.length === 0) {
      console.log('  (No visible produce or ingredients detected)');
    } else {
      result.items.forEach((item) => {
        const badge = item.status === 'seen' ? '\x1b[32m[SEEN]\x1b[0m ' : '\x1b[33m[MAYBE]\x1b[0m';
        console.log(`  ${badge} ${item.name}`);
      });
    }

    console.log(`\n--- STEEL CONTAINERS & STORAGE NOTES (${result.notes.length}) ---`);
    if (result.notes.length === 0) {
      console.log('  (No closed containers or special storage notes)');
    } else {
      result.notes.forEach((note) => {
        console.log(`  * ${note}`);
      });
    }

    console.log(`\n============================================================\n`);
  } catch (err) {
    console.error(`Scan failed: ${err.message}`);
    process.exit(1);
  }
}

run();
