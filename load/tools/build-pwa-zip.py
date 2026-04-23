#!/usr/bin/env python3
"""
Load — build a self-contained PWA zip from the /load/ tree.

Usage (from repo root):
    python3 load/tools/build-pwa-zip.py

Mirrors the attain-standalone.zip layout: every file lives under a
single `load-standalone/` folder inside the zip so it extracts cleanly.

Output:
    /load-standalone.zip

The resulting zip works three ways:
  1. Unzip on any static host (GitHub Pages, Netlify, local Python HTTP
     server) and open `load-standalone/index.html`.
  2. Import the zip into another Load install (Library -> Import -> pick
     load-standalone.zip). Load inlines every asset + installs the
     runtime bundle shim, so it runs offline from IndexedDB.
  3. Drop into HTMLq or any iPad PWA runner that accepts multi-file
     packages.

Copyright (c) 2026 LBond. All Rights Reserved.
"""

import os
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
LOAD_DIR = os.path.abspath(os.path.join(HERE, '..'))
REPO_ROOT = os.path.abspath(os.path.join(LOAD_DIR, '..'))
OUT_PATH = os.path.join(REPO_ROOT, 'load-standalone.zip')
# Everything inside the zip lives under this top-level folder, matching
# attain-standalone.zip so the two packages feel symmetrical when a user
# downloads both.
TOP_DIR = 'load-standalone'

EXCLUDE_DIRS = {'tools', '__pycache__', '.git', '.snapshots'}
EXCLUDE_SUFFIXES = ('.pyc', '.DS_Store', '~')
# Legacy / typo filenames kept on disk for backwards compat but not
# worth shipping in a fresh PWA bundle. splash.png (correct) is kept.
EXCLUDE_FILES = {'splash .png', 'slash.png'}

# Extra files at the repo root that belong in the bundle (license, etc.).
EXTRA_ROOT_FILES = [
    ('LICENSE', 'LICENSE'),
]


def should_skip(rel_path: str) -> bool:
    parts = rel_path.replace('\\', '/').split('/')
    if parts[0] in EXCLUDE_DIRS:
        return True
    if parts[-1] in EXCLUDE_FILES:
        return True
    if rel_path.endswith(EXCLUDE_SUFFIXES):
        return True
    return False


def main() -> int:
    if not os.path.isdir(LOAD_DIR):
        print(f'error: {LOAD_DIR} is not a directory', file=sys.stderr)
        return 1

    added = 0
    total_bytes = 0
    with zipfile.ZipFile(OUT_PATH, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        # Explicit top-level folder entry so unzip tools that preview
        # the archive show a single tidy folder.
        zf.writestr(zipfile.ZipInfo(TOP_DIR + '/'), b'')

        # Hint to GitHub Pages to skip Jekyll processing, so dotfiles
        # and underscored paths are served as-is.
        zf.writestr(TOP_DIR + '/.nojekyll', b'')

        for root, dirs, files in os.walk(LOAD_DIR):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for name in sorted(files):
                abs_path = os.path.join(root, name)
                rel_path = os.path.relpath(abs_path, LOAD_DIR)
                if should_skip(rel_path):
                    continue
                arc_name = TOP_DIR + '/' + rel_path.replace(os.sep, '/')
                zf.write(abs_path, arc_name)
                added += 1
                total_bytes += os.path.getsize(abs_path)

        for src_rel, dst_rel in EXTRA_ROOT_FILES:
            src_abs = os.path.join(REPO_ROOT, src_rel)
            if os.path.isfile(src_abs):
                zf.write(src_abs, TOP_DIR + '/' + dst_rel)
                added += 1
                total_bytes += os.path.getsize(src_abs)

    out_size = os.path.getsize(OUT_PATH)
    print(f'wrote {OUT_PATH}')
    print(f'  top-level folder: {TOP_DIR}/')
    print(f'  entries: {added}')
    print(f'  uncompressed: {total_bytes / (1024 * 1024):.2f} MB')
    print(f'  compressed:   {out_size / (1024 * 1024):.2f} MB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
