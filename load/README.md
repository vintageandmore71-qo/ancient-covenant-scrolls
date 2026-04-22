# Load — Run Web Apps on iPad (PWA build)

A Progressive Web App that lets you import self-contained HTML web
apps and open them on your iPad with unified reading aids (font,
spacing, color overlay, dyslexia font, bionic reading, focus line).
No server, no internet after install, no subscription.

Copyright (c) 2026 DssOrit. All Rights Reserved.

## What it does

- Keeps a library of `.html` web apps you've imported.
- Each app is stored in the browser's IndexedDB on your device.
- Tap a tile to open the app in an in-app viewer.
- While viewing, tap `Aa` to apply reading aids to that app.
- Settings persist between sessions.

## How it runs offline

- Visit the deployed URL (GitHub Pages or the deployed host) once
  while online. Safari caches the app shell.
- Add to Home Screen: Safari → Share → **Add to Home Screen**.
- After that, open Load from your Home Screen. It runs from cache;
  no network required.
- Imported HTML apps are stored locally — they never leave your
  device.

## Deployed URL

Placeholder — once the repo is published to GitHub Pages the live
URL will be:

`https://dssorit.github.io/ancient-covenant-scrolls/load/`

## Password

Default password: `acr2026`

To change it, edit this line near the top of `load.js`:

```
var PASSWORD = 'acr2026';
```

## Files

- `index.html` — three screens: login / library / viewer, plus
  reading-aids panel and modals.
- `load.css` — dark theme, iPad-first layout, responsive.
- `load.js` — IndexedDB persistence, file import, viewer, reading
  aids (font size / line spacing / letter spacing / color overlay
  / dyslexia font / bionic reading / focus line), rename / delete.
- `sw.js` — service worker that caches the app shell for offline
  use; never intercepts `blob:` URLs so imported apps always
  render their freshest content.
- `manifest.json` — PWA manifest for Add to Home Screen.
- `icon.png` — placeholder; replace with the Load brand icon.

## Supported formats (v2)

| Format | How it's handled |
|---|---|
| `.html` / `.htm` | stored as-is |
| `.zip` | extracted and inlined into one HTML via JSZip (multi-file web apps become single-file after import) |
| `.pdf` | parsed by pdf.js, extracted as text, rendered as readable HTML with page markers |
| `.epub` | parsed by epub.js, chapters concatenated into one readable HTML |
| `.azw` / `.azw3` / `.kfx` / `.mobi` | Kindle formats — friendly error on import; convert to EPUB with Calibre first |

Libraries are bundled locally (no CDN) at:
- `lib-jszip.min.js` (~96 KB)
- `lib-pdf.min.js` + `lib-pdf-worker.min.js` (~1.4 MB together)
- `lib-epub.min.js` (~219 KB)

Cached by the service worker on first load; offline after that.

## Backlog for later

- TTS with speed control inside the viewer
- Bookmarks with notes
- Search within a loaded project
- Reading position save + Resume
- Adjustable column width
- Per-project sepia / night mode toggle

## Related

- `/load-ios/` — paused Swift Playgrounds native build. See
  `/load-ios/STATE.md` for where that one stopped. Can resume when
  you're ready to target App Store distribution; for personal iPad
  use this PWA is enough.
