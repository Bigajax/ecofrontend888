#!/usr/bin/env node
/**
 * Convert PNG/JPG images to WebP format
 * Usage: node scripts/convert-images-to-webp.js
 *
 * Requires: npm install -D sharp
 */

import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';

const IMAGE_DIR = './public/images';
const QUALITY = 85; // WebP quality (0-100, 85 is good balance)

// Critical PNG files to convert (HUGE sizes!)
const TARGETS = [
  'diario-01.png',
  'diario-02.png',
  'diario-03.png',
  'diario-04.png',
  'ECOTOPIA-Natal.png',
  'introducao-meditacao-hero.png',
  'meditacao-ansiedade-sono.png',
  'meditacoes-sono-hero.png',
  // JPG files
  'article-bedtime-hero.jpg',
  'article-daytime-hero.jpg',
  'bedtime-environment.jpg',
  'daytime-tips.jpg',
  'good-night-sleep.jpg',
  'sleep-cycles.jpg',
  'sleep-night-hero.jpg',
  'sleep-stages-intro.jpg',
  'sleep-tips-icons-1.jpg',
  'sleep-tips-icons-2.jpg',
  'wellbeing-mental.jpg',
];

async function convertImage(inputPath, outputPath) {
  try {
    const input = await sharp(inputPath);
    const metadata = await input.metadata();

    console.log(`Converting: ${basename(inputPath)}`);
    console.log(`  Original: ${metadata.format} ${metadata.width}x${metadata.height}`);

    // Convert to WebP
    await input
      .webp({ quality: QUALITY, effort: 6 })
      .toFile(outputPath);

    // Get file sizes
    const inputStats = await stat(inputPath);
    const outputStats = await stat(outputPath);
    const savedKB = ((inputStats.size - outputStats.size) / 1024).toFixed(2);
    const savedPercent = (((inputStats.size - outputStats.size) / inputStats.size) * 100).toFixed(1);

    console.log(`  Saved: ${savedKB} KB (${savedPercent}%)`);
    console.log(`  Output: ${outputPath}\n`);

    return {
      input: basename(inputPath),
      output: basename(outputPath),
      savedKB: parseFloat(savedKB),
      savedPercent: parseFloat(savedPercent),
    };
  } catch (error) {
    console.error(`❌ Error converting ${inputPath}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🖼️  Image Conversion Script\n');
  console.log(`Target directory: ${IMAGE_DIR}`);
  console.log(`WebP quality: ${QUALITY}`);
  console.log(`Images to convert: ${TARGETS.length}\n`);

  const results = [];
  let totalSavedKB = 0;

  for (const filename of TARGETS) {
    const inputPath = join(IMAGE_DIR, filename);
    const ext = extname(filename);
    const name = basename(filename, ext);
    const outputPath = join(IMAGE_DIR, `${name}.webp`);

    // Check if already exists
    try {
      await stat(outputPath);
      console.log(`⏭️  Skipping ${filename} (WebP already exists)\n`);
      continue;
    } catch {
      // WebP doesn't exist, proceed with conversion
    }

    const result = await convertImage(inputPath, outputPath);
    if (result) {
      results.push(result);
      totalSavedKB += result.savedKB;
    }
  }

  console.log('\n=== Conversion Summary ===\n');
  console.log(`✅ Converted: ${results.length} images`);
  console.log(`💾 Total saved: ${totalSavedKB.toFixed(2)} KB (~${(totalSavedKB / 1024).toFixed(2)} MB)`);
  console.log(`📉 Average reduction: ${(results.reduce((sum, r) => sum + r.savedPercent, 0) / results.length).toFixed(1)}%\n`);

  if (results.length > 0) {
    console.log('🔄 Next steps:');
    console.log('1. Verify converted images look good');
    console.log('2. Update image references in code (PNG/JPG → WebP)');
    console.log('3. Delete original PNG/JPG files (optional)\n');
  }
}

main().catch(console.error);
