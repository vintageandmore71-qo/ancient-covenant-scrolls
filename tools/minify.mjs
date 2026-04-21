// Attain — Universal Study PWA
// Copyright (c) 2026 DssOrit. All Rights Reserved.
// See LICENSE at the repository root.
//
// Optional minification pass for deployment builds.
//
// Run from the repo root:  node tools/minify.mjs
//
// Reads the plaintext JS from attain/ + study/, emits minified +
// mangled versions to dist/. Does NOT overwrite the originals.
// Intended for the private-repo production build — not for the
// public development repo.
//
// Requires esbuild (one dependency). To install locally:
//   npm install --save-dev esbuild
// Then run this script. For zero-install usage:
//   npx esbuild attain/attain-core.js --minify --outfile=dist/attain/attain-core.js
//   (repeat per file)

import { build } from 'esbuild';
import { mkdir, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'dist');

// Files to pass through esbuild (minify + mangle locals; keep
// the top-of-file copyright legal notice intact via `legalComments`).
const JS_TARGETS = [
  'attain/attain-core.js',
  'attain/attain-parser.js',
  'attain/attain-study.js',
  'attain/attain-ui.js',
  'attain/sw.js',
  'study/study.js',
  'study/sw.js'
];

// Files to copy verbatim (already minimal, or non-JS)
const COPY_TARGETS = [
  'attain/index.html',
  'attain/attain.css',
  'attain/manifest.json',
  'attain/icon.png',
  'attain/splash.PNG',
  'attain/splash 2.PNG',
  'attain/splash .PNG',
  'study/index.html',
  'study/study.css',
  'study/manifest.json',
  'study/icon.png',
  'LICENSE'
];

async function main() {
  await mkdir(OUT, { recursive: true });

  for (const rel of JS_TARGETS) {
    const src = join(ROOT, rel);
    const dst = join(OUT, rel);
    await mkdir(dirname(dst), { recursive: true });
    await build({
      entryPoints: [src],
      outfile: dst,
      minify: true,
      target: 'es2017',
      // Keep the copyright banner, strip all other comments
      legalComments: 'inline',
      // Don't bundle — each file is self-contained and loaded in order
      // by <script> tags in index.html. Bundling would require rewriting
      // the HTML.
      bundle: false
    });
    console.log('minified: ' + rel);
  }

  for (const rel of COPY_TARGETS) {
    const src = join(ROOT, rel);
    const dst = join(OUT, rel);
    if (!existsSync(src)) {
      console.warn('skip (missing): ' + rel);
      continue;
    }
    await mkdir(dirname(dst), { recursive: true });
    await cp(src, dst);
    console.log('copied:   ' + rel);
  }

  console.log('\n✓ Build complete. Output in dist/');
  console.log('  Deploy dist/attain/ or dist/study/ to your private host.');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
