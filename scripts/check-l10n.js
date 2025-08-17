#!/usr/bin/env node
/*
  JSON Flow - i18n verification script
  - Scans src/ and webview/ for occurrences of l10n.t('...') or vscode.l10n.t('...')
  - Compares used keys with keys present in l10n/bundle.l10n.*.json
  - Reports missing and unused keys by bundle
  - Exits with code 1 if any missing keys are found
*/

const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');

const root = process.cwd();
const SRC_DIRS = [
  path.join(root, 'src'),
  path.join(root, 'webview'),
];
const L10N_DIR = path.join(root, 'l10n');

/** Collect all used l10n keys from TS/TSX source files */
function collectUsedKeys() {
  const patterns = [
    'src/**/*.ts',
    'src/**/*.tsx',
    'webview/**/*.ts',
    'webview/**/*.tsx',
  ];
  const entries = fg.sync(patterns, { cwd: root, dot: false, absolute: true });

  const regex = /\b(?:vscode\.)?l10n\.t\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*[),]/g; // captures '..." or "..."
  const keys = new Set();

  for (const file of entries) {
    try {
      const text = fs.readFileSync(file, 'utf8');
      let m;
      while ((m = regex.exec(text)) !== null) {
        const raw = m[2];
        if (!raw) continue;
        // Unescape common sequences
        const key = raw.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\'/g, "'");
        keys.add(key);
      }
    } catch (_) {
      // ignore
    }
  }
  return keys;
}

/** Load all bundle files and return map: filename -> { keys: Set<string>, json } */
function loadBundles() {
  if (!fs.existsSync(L10N_DIR)) {
    console.error('l10n directory not found:', L10N_DIR);
    process.exit(2);
  }
  const bundlePaths = fg.sync(['bundle.l10n.*.json'], { cwd: L10N_DIR, absolute: true });
  const bundles = new Map();
  for (const p of bundlePaths) {
    try {
      const json = JSON.parse(fs.readFileSync(p, 'utf8'));
      const keys = new Set(Object.keys(json));
      bundles.set(p, { keys, json });
    } catch (err) {
      console.error('Failed to parse bundle:', p, err?.message || err);
      process.exit(2);
    }
  }
  return bundles;
}

function main() {
  const usedKeys = collectUsedKeys();
  const bundles = loadBundles();

  // Optional guard: forbid old, unified-away keys
  const forbidden = new Set(['Report a Bug', 'Report Issues']);

  let hasMissing = false;
  console.log('i18n audit:');
  console.log(`- Used keys discovered: ${usedKeys.size}`);
  for (const [bundlePath, { keys }] of bundles) {
    const missing = [];
    for (const k of usedKeys) {
      if (!keys.has(k)) missing.push(k);
    }
    const unused = [];
    for (const k of keys) {
      if (!usedKeys.has(k)) unused.push(k);
    }

    const rel = path.relative(root, bundlePath);
    console.log(`\nBundle: ${rel}`);
    console.log(`  - Keys in bundle: ${keys.size}`);
    console.log(`  - Missing keys: ${missing.length}`);
    if (missing.length) {
      hasMissing = true;
      for (const k of missing.sort()) console.log(`    • ${k}`);
    }
    console.log(`  - Unused keys: ${unused.length}`);
    if (unused.length) {
      // Only show a few to keep output short
      const preview = unused.sort().slice(0, 15);
      for (const k of preview) console.log(`    • ${k}`);
      if (unused.length > preview.length) console.log(`    • ...and ${unused.length - preview.length} more`);
    }

    // Forbidden keys check
    const forbiddenHits = [...keys].filter((k) => forbidden.has(k));
    if (forbiddenHits.length) {
      console.warn(`  - Forbidden keys present (should be removed): ${forbiddenHits.join(', ')}`);
    }
  }

  if (hasMissing) {
    console.error('\nResult: Missing i18n keys found. Please add them to all bundles in l10n/.');
    process.exit(1);
  } else {
    console.log('\nResult: All used i18n keys are present in bundles.');
  }
}

main();
