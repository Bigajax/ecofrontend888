#!/usr/bin/env node
/**
 * Convert all PNGs in public/ recursively to WebP using sharp.
 * Reports size savings. Does NOT delete originals — that's a separate step.
 *
 * Usage: node scripts/png-to-webp.mjs
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import { join, relative } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const PUBLIC_DIR = join(ROOT, 'public');
const DELETE_ORIGINALS = process.argv.includes('--delete');

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) out.push(full);
  }
  return out;
}

function fmtKB(bytes) {
  return (bytes / 1024).toFixed(1) + ' KB';
}

async function main() {
  console.log(`Scanning ${PUBLIC_DIR}…`);
  const pngs = await walk(PUBLIC_DIR);
  console.log(`Found ${pngs.length} PNG file(s)\n`);

  let totalIn = 0;
  let totalOut = 0;
  let converted = 0;
  let skipped = 0;
  let failed = 0;

  for (const png of pngs) {
    const webp = png.replace(/\.png$/i, '.webp');
    const rel = relative(ROOT, png);
    try {
      const inStat = await stat(png);
      totalIn += inStat.size;

      // quality 82 — sweet spot for photos; sharp respects PNG transparency
      await sharp(png)
        .webp({ quality: 82, effort: 5, alphaQuality: 90 })
        .toFile(webp);

      const outStat = await stat(webp);
      totalOut += outStat.size;
      converted++;
      const pct = ((1 - outStat.size / inStat.size) * 100).toFixed(0);
      console.log(`✓ ${rel}  ${fmtKB(inStat.size)} → ${fmtKB(outStat.size)}  (-${pct}%)`);

      if (DELETE_ORIGINALS) {
        await unlink(png);
      }
    } catch (err) {
      failed++;
      console.error(`✗ ${rel}  ${err.message}`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Converted: ${converted}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Total in:  ${fmtKB(totalIn)} (${(totalIn / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`Total out: ${fmtKB(totalOut)} (${(totalOut / 1024 / 1024).toFixed(1)} MB)`);
  if (totalIn > 0) {
    const saved = ((1 - totalOut / totalIn) * 100).toFixed(1);
    console.log(`Saved:     ${saved}%`);
  }
  if (DELETE_ORIGINALS) {
    console.log(`\nOriginal PNGs deleted.`);
  } else {
    console.log(`\nOriginal PNGs preserved. Re-run with --delete to remove them.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
