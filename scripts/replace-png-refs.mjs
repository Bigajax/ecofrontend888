#!/usr/bin/env node
/**
 * Replace `.png` with `.webp` in code references.
 * Targets only string-context occurrences (preceded by /, ', ", `, =, etc.)
 * to avoid touching random prose in docs.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const TARGET_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vercel', '.next', 'build', 'coverage', 'public']);
const SKIP_FILES = new Set([
  'png-to-webp.mjs',
  'replace-png-refs.mjs',
  'convert-images-to-webp.js',
  'convert-single-image.js',
  'update-png-references.js',
  'image-conversion-report.json',
]);

// Match .png when it follows a path-like char (alphanumeric, _, -, /, .)
// AND is followed by a string terminator (', ", `, ), ?, #, whitespace, $).
const RE = /\.png(?=['")\s?#$])/g;

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue;
      if (TARGET_EXTS.has(extname(entry.name).toLowerCase())) out.push(full);
    }
  }
  return out;
}

async function main() {
  console.log(`Scanning ${ROOT}…\n`);
  const files = await walk(ROOT);
  let changed = 0;
  let totalReplacements = 0;

  for (const file of files) {
    const text = await readFile(file, 'utf8');
    if (!text.includes('.png')) continue;

    let count = 0;
    const updated = text.replace(RE, () => {
      count++;
      return '.webp';
    });

    if (count > 0 && updated !== text) {
      await writeFile(file, updated, 'utf8');
      changed++;
      totalReplacements += count;
      console.log(`✓ ${file.replace(ROOT, '.')}  (${count} ref${count === 1 ? '' : 's'})`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Files changed:     ${changed}`);
  console.log(`Refs replaced:     ${totalReplacements}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
