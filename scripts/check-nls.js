#!/usr/bin/env node
/*
  JSON Flow - NLS (package.nls) verification script
  - Scans package.json for %...% placeholders
  - Compares used keys with keys present in package.nls*.json (default and locales)
  - Reports missing and unused keys by bundle
  - Exits with code 1 if any missing keys are found in any bundle
*/

const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');

const root = process.cwd();
const PKG_PATH = path.join(root, 'package.json');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    console.error('Failed to read JSON:', p, err?.message || err);
    process.exit(2);
  }
}

/** Collect all %...% placeholders from package.json values (recursively) */
function collectUsedNlsKeysFromPackage(pkg) {
  const keys = new Set();
  const rx = /%([^%\n\r]+)%/g;

  function visit(node) {
    if (node == null) return;
    const t = typeof node;
    if (t === 'string') {
      let m;
      while ((m = rx.exec(node)) !== null) {
        const key = m[1].trim();
        if (key) keys.add(key);
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const it of node) visit(it);
      return;
    }
    if (t === 'object') {
      for (const k of Object.keys(node)) visit(node[k]);
    }
  }

  visit(pkg);
  return keys;
}

/** Load all package.nls*.json files and return map: filename -> { keys: Set<string>, json } */
function loadNlsBundles() {
  const patterns = ['package.nls.json', 'package.nls.*.json'];
  const files = fg.sync(patterns, { cwd: root, absolute: true });
  if (!files.length) {
    console.error('No package.nls*.json files found.');
    process.exit(2);
  }
  const bundles = new Map();
  for (const p of files) {
    const json = readJson(p);
    bundles.set(p, { json, keys: new Set(Object.keys(json)) });
  }
  return bundles;
}

function main() {
  const pkg = readJson(PKG_PATH);
  const usedKeys = collectUsedNlsKeysFromPackage(pkg);
  const bundles = loadNlsBundles();

  let hasMissing = false;
  console.log('NLS audit (package.nls):');
  console.log(`- Used NLS keys discovered in package.json: ${usedKeys.size}`);

  for (const [bundlePath, { keys }] of bundles) {
    const missing = [];
    for (const k of usedKeys) if (!keys.has(k)) missing.push(k);

    const unused = [];
    for (const k of keys) if (!usedKeys.has(k)) unused.push(k);

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
      const preview = unused.sort().slice(0, 20);
      for (const k of preview) console.log(`    • ${k}`);
      if (unused.length > preview.length) console.log(`    • ...and ${unused.length - preview.length} more`);
    }
  }

  if (hasMissing) {
    console.error('\nResult: Missing NLS keys found. Please add them to all package.nls*.json files.');
    process.exit(1);
  } else {
    console.log('\nResult: All used NLS keys are present in package.nls bundles.');
  }
}

main();
