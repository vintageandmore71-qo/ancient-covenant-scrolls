#!/usr/bin/env python3
"""
Load — build a fully self-contained standalone HTML from the /load/ tree.

Usage (from repo root):
    python3 load/tools/build-standalone.py

Reads every file in /load/ that the hosted PWA needs (index, CSS, JS, the
bundled libraries, fonts, icon, splash) and writes one file:
    /Load-Standalone.html

Every dependency is inlined:
  - <link rel="stylesheet" href="load.css">  ->  <style>...</style>
  - <script src="load.js">                    ->  <script>...</script>
  - bundled JS libraries (pdf.js, jszip,      ->  <script>...</script>
    epub.js)
  - pdf.worker.min.js                         ->  <script type="text/plain"
                                                  id="pdf-worker-src"> ... then
                                                  a Blob URL is built at runtime
  - /load/fonts/*.woff2                       ->  base64 data: URLs inside the
                                                  inlined @font-face rules
  - splash.png, icon.png                      ->  base64 data: URLs
  - service-worker registration               ->  stripped (file:// can't
                                                  register SWs)
  - manifest.json link                        ->  stripped (not used from
                                                  file:// anyway)

The output file opens directly from the iPad Files app in Safari or HTMLq
and runs 100% offline, with zero dependency on dssorit.github.io.

Copyright (c) 2026 DssOrit. All Rights Reserved.
"""

import base64
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LOAD_DIR = os.path.abspath(os.path.join(HERE, '..'))
REPO_ROOT = os.path.abspath(os.path.join(LOAD_DIR, '..'))
OUT_PATH = os.path.join(REPO_ROOT, 'Load-Standalone.html')


def read_text(path):
    with open(path, 'r', encoding='utf-8') as fh:
        return fh.read()


def read_bytes(path):
    with open(path, 'rb') as fh:
        return fh.read()


def b64(data: bytes) -> str:
    return base64.b64encode(data).decode('ascii')


def inline_script(js_text: str) -> str:
    # Prevent an in-string "</script" from prematurely closing the tag
    return '<script>\n' + js_text.replace('</script', '<\\/script') + '\n</script>'


def inline_stylesheet(css_text: str) -> str:
    return '<style>\n' + css_text + '\n</style>'


def main() -> int:
    # --- Read sources ------------------------------------------------
    html = read_text(os.path.join(LOAD_DIR, 'index.html'))
    css = read_text(os.path.join(LOAD_DIR, 'load.css'))
    js = read_text(os.path.join(LOAD_DIR, 'load.js'))

    libs = {
        'lib-jszip.min.js': read_text(os.path.join(LOAD_DIR, 'lib-jszip.min.js')),
        'lib-pdf.min.js':   read_text(os.path.join(LOAD_DIR, 'lib-pdf.min.js')),
        'lib-epub.min.js':  read_text(os.path.join(LOAD_DIR, 'lib-epub.min.js')),
    }
    pdf_worker = read_text(os.path.join(LOAD_DIR, 'lib-pdf-worker.min.js'))

    fonts_dir = os.path.join(LOAD_DIR, 'fonts')
    fonts = {
        name: b64(read_bytes(os.path.join(fonts_dir, name)))
        for name in (
            'atkinson-400.woff2',
            'atkinson-700.woff2',
            'opendyslexic-400.woff2',
            'opendyslexic-700.woff2',
        )
    }

    splash_b64 = b64(read_bytes(os.path.join(LOAD_DIR, 'splash.png')))
    icon_b64 = b64(read_bytes(os.path.join(LOAD_DIR, 'icon.png')))

    # --- Inline the CSS and rewrite font url()s to data: URIs -------
    for name, b in fonts.items():
        data_url = 'url(data:font/woff2;base64,' + b + ')'
        css = css.replace('url("fonts/' + name + '")', data_url)

    html = html.replace(
        '<link rel="stylesheet" href="load.css">',
        inline_stylesheet(css),
    )

    # --- Inline the splash + icon as data URLs ----------------------
    html = re.sub(
        r'src="splash\.png"',
        'src="data:image/png;base64,' + splash_b64 + '"',
        html,
    )
    html = html.replace(
        'data-src-chain="splash.png|slash.png|splash%20.png|splash.PNG"',
        'data-src-chain=""',
    )
    html = html.replace(
        '<link rel="apple-touch-icon" href="icon.png">',
        '<link rel="apple-touch-icon" href="data:image/png;base64,' + icon_b64 + '">',
    )
    html = html.replace(
        '<link rel="apple-touch-startup-image" href="splash.png">',
        '<link rel="apple-touch-startup-image" href="data:image/png;base64,' + splash_b64 + '">',
    )

    # --- Inline the libraries ---------------------------------------
    # pdf.js: load.js sets workerSrc = 'lib-pdf-worker.min.js'. In the
    # standalone we ship the worker as a <script type="text/plain"> blob
    # and build a Blob URL from it at runtime so pdf.js can spawn its
    # worker from file:// context.
    pdf_worker_tag = (
        '<script type="text/plain" id="pdf-worker-src">'
        + pdf_worker.replace('</script', '<\\/script')
        + '</script>'
    )
    html = html.replace(
        "<script src=\"lib-pdf.min.js\"></script>",
        pdf_worker_tag + '\n' + inline_script(libs['lib-pdf.min.js']),
    )
    # Rewrite the workerSrc = '...' line to use the Blob URL from the
    # inlined worker text (only changes the assignment in index.html
    # that loads pdf.js).
    html = html.replace(
        "pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib-pdf-worker.min.js'",
        "pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL("
        + "new Blob([document.getElementById('pdf-worker-src').textContent], "
        + "{type:'application/javascript'}))",
    )

    html = html.replace(
        '<script src="lib-jszip.min.js"></script>',
        inline_script(libs['lib-jszip.min.js']),
    )
    html = html.replace(
        '<script src="lib-epub.min.js"></script>',
        inline_script(libs['lib-epub.min.js']),
    )

    # --- Inline the main JS -----------------------------------------
    html = html.replace(
        '<script src="load.js"></script>',
        inline_script(js),
    )

    # --- Strip things that don't work from file:// ------------------
    # Service worker registration (iOS Safari won't register SWs from
    # file://; it also just errors noisily).
    html = re.sub(
        r"<script>\s*if \('serviceWorker'[\s\S]*?</script>",
        '<script>/* service worker skipped in standalone file build */</script>',
        html,
    )
    # PWA manifest — not useful from file://
    html = html.replace(
        '<link rel="manifest" href="manifest.json">',
        '<!-- manifest removed for standalone file build -->',
    )

    # --- Banner comment so anyone opening the file knows what it is
    banner = (
        '<!--\n'
        '  Load — Run Web Apps on iPad (standalone offline build)\n'
        '  Copyright (c) 2026 DssOrit. All Rights Reserved.\n'
        '\n'
        '  This file contains every piece of Load inlined into a single\n'
        '  HTML document — the entire app, fonts, libraries, splash,\n'
        '  runs from file:// with no network. Save it to iCloud Drive\n'
        '  or On My iPad, then open it from the Files app in Safari or\n'
        '  HTMLq.\n'
        '\n'
        '  Rebuilt by load/tools/build-standalone.py\n'
        '-->\n'
    )
    html = banner + html

    with open(OUT_PATH, 'w', encoding='utf-8') as fh:
        fh.write(html)

    size_mb = os.path.getsize(OUT_PATH) / (1024 * 1024)
    print('wrote ' + OUT_PATH + ' (' + ('%.2f' % size_mb) + ' MB)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
