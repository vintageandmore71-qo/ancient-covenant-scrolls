# Load — Run Web Apps on iPad

A free, offline, dyslexia-friendly reader for web apps, HTML files,
PDFs, EPUB books, and any other HTML-based content, designed for
iPad.

Copyright (c) 2026 LBond. All Rights Reserved.

---

## TL;DR

- Free. Offline after first visit. No login, no subscription, no
  server, no ads. Runs entirely on your iPad.
- Open this URL once in Safari: `https://dssorit.github.io/ancient-covenant-scrolls/load/`
- Tap Safari's **Share → Add to Home Screen**. Now Load is an app
  icon on your iPad, and works with Airplane Mode on.
- Import HTML, PDF, EPUB, or web-app ZIP files from your Files app.
- Every file becomes a tile in your library.
- Tap a tile to read it. Tap the speaker icon to hear it read aloud.
  Tap the notes icon to jot notes. Tap `Aa` for reading aids.

---

## Quick start (first time)

### 1. Install Load on your iPad home screen

1. In Safari on iPad, open `https://dssorit.github.io/ancient-covenant-scrolls/load/`
2. Let the splash finish loading (first visit downloads ~2 MB of
   fonts and libraries; after that it runs offline).
3. Tap Safari's **Share** icon (the square with an arrow).
4. Tap **Add to Home Screen**.
5. Tap **Add**. Done — you now have a Load app icon.

### 2. Import your first file

- Tap **Import a File** on the home screen → pick a `.html`,
  `.pdf`, `.epub`, or `.zip` from the Files app.
- Or tap **Import a PWA** if you have a full multi-file web app.
  (See "Importing a PWA" below — iPad has special handling.)

### 3. Read it

- Tap any tile in your library.
- The viewer opens with your content.
- Tap `Aa` in the top bar for reading aids: font size, spacing,
  color overlay, bionic reading, focus line, OpenDyslexic font.
- Tap the speaker icon to turn on read-aloud.
- Tap the pencil-paper icon to open the notes drawer.

---

## Every feature

### Home screen

- **Full-size splash image** across the top showing the Load brand.
- **Import a File** button — handles HTML / PDF / EPUB / ZIP.
- **Import a PWA** button — explains how iPad handles multi-file
  web-app imports.
- **Open Library** button — shows your full grid of imports.
- **Browse by type** — four colored boxes: HTML, Web apps (ZIP),
  PDFs, Books (EPUB). Each shows a live count of imports of that
  type. Tap to filter the library.
- **Recently opened** strip at the bottom — horizontal scroll of
  your last-viewed items.

### Library

- Grid of tiles for every imported file.
- Each tile shows the file name, type, when you last opened it,
  and a notes icon if you've written notes on it.
- Tap a tile to open.
- Tap the `…` on a tile for options:
  - **View** — open the file (same as tapping the tile)
  - **Notes** — write or edit notes attached to that file
  - **Edit HTML** — edit the stored HTML source in a simple
    editor
  - **Add to Home Screen** — create a dedicated iPad icon for
    this specific file
  - **Rename** — change the name
  - **Delete** — remove from Load (the original file on your
    iPad is not touched)

### Search

- Tap the magnifying-glass icon in the library's top bar.
- Type anything — the grid filters live by name and notes
  content.
- Tap the × to clear.

### Viewer (opens when you tap a tile)

**Top bar icons (left to right):**

- `←` — back to the library
- Speaker — opens the **Read Aloud** drawer (see below)
- Paper-and-pencil — opens the **Notes** drawer for this file
- Reload circle — reloads the content (useful if you edited the
  HTML)
- `Aa` — opens the **Reading Aids** panel
- `☰` — hide the top bar for distraction-free reading (tap the
  floating `☰` to bring it back)

**Reading Aids panel (`Aa`):**

- **Font size** — `A−` / Reset / `A+`
- **Line spacing** — `↓` / Reset / `↑`
- **Letter spacing** — `↓` / Reset / `↑`
- **Overlay color** — none / cream / yellow / soft blue (cuts
  white-glare)
- **Dyslexia font** — swaps page font to OpenDyslexic
- **Bionic reading** — bolds the first ~40% of each word, which
  helps many dyslexic readers
- **Focus line** — horizontal reading ruler overlay

**Read Aloud drawer (speaker icon):**

- **Play / Pause / Stop**
- **Speed** — 0.7x through 1.8x
- **Voice** — pick from any system voice installed on your iPad
  (Settings → Accessibility → Spoken Content → Voices to download
  more)
- Uses the browser's built-in Speech Synthesis API — 100% offline,
  no data usage

**Notes drawer (paper-and-pencil icon):**

- Textarea for free-form notes per file
- Saves to your iPad's local storage
- Notes show up as a `📝` icon on the tile in the library
- Search bar also looks inside notes

### Add to Home Screen (per-file icons)

You can give each imported file its own iPad home-screen icon:

1. In the library, tap the `…` on any tile.
2. Tap **Add to Home Screen**.
3. A modal appears with three numbered steps.
4. Tap Safari's **Share → Add to Home Screen**.
5. Now that file has its own app icon. Tapping it opens Load
   directly into that file (skipping the home screen and password).

Technically the icon is a Safari bookmark with a URL parameter
that tells Load which app to open. Works offline.

### Settings (gear icon in top bar)

- **Font**: Atkinson Hyperlegible (default, designed for low-vision
  and dyslexia users) or OpenDyslexic (weighted bottom character
  shapes)
- **Theme**: Dark / Cream / Sepia / Soft Blue / High Contrast
- **Text size**, **line spacing**, **letter spacing** — each with
  − / Reset / + steppers
- **Reduce motion** — turns off animations

All settings persist between sessions.

---

## Importing a PWA (multi-file web app)

iPad Safari **cannot pick a folder directly** — that's an iOS
restriction, not a Load bug. Two workarounds that both work:

### Option 1 — Zip the folder first (easiest)

1. On iPad, open the **Files** app.
2. Long-press the folder that contains your web app.
3. Tap **Compress**. iPad creates a `.zip` in the same location.
4. In Load, tap **Import a PWA** (or **Import a File**), pick the
   zip.
5. Load extracts the zip, detects the `index.html`, inlines every
   CSS/JS/image/font/asset, and creates one tile for the web app.

### Option 2 — Multi-select all files

1. In the Files app, open the folder with your web app's files.
2. Tap **Select** (top right).
3. Check every file (`index.html` plus all the assets).
4. Tap **Share → Save to Files** or drag them all into Load's
   picker.
5. Load auto-detects the `index.html`, uses it as the entry,
   inlines every other selected file.

---

## Kindle books — how to handle them

Amazon Kindle files (`.azw`, `.azw3`, `.mobi`, `.kfx`, `.prc`) are
**DRM-locked**. No third-party app — including Load — can legally
open them. Amazon encrypts them to their apps only.

To read a Kindle book in Load:

1. On a computer (Mac / Windows / Linux, not iPad), install the
   free desktop tool **Calibre** from
   `https://calibre-ebook.com`.
2. Convert the Kindle book to EPUB (Calibre's built-in converter).
3. Save the resulting `.epub` to your iCloud Drive or iPad Files.
4. Import the EPUB into Load.

This is a one-time step per book. After conversion, the EPUB reads
and searches and takes notes just like anything else in Load.

---

## How Load stays offline

- **Service Worker** caches Load's HTML, CSS, JS, fonts, and the
  pdf.js / epub.js / jszip libraries on first visit. After that
  Load runs fully from cache.
- **IndexedDB** stores every file you import. Local to your iPad.
- **localStorage** holds your settings (font, theme, spacing,
  reduce-motion) and reading positions.
- **Nothing ever leaves your iPad.** Load has zero network calls
  after install. No analytics. No tracking. No accounts.

### Test it yourself

1. Install Load to home screen.
2. Import a file.
3. Turn on **Airplane Mode** in iPad settings.
4. Open Load from the home screen — it opens normally.
5. Read, search, take notes, use TTS — all works offline.

---

## Dyslexia-friendly design choices

These are built in by default. You don't have to enable them.

- **Atkinson Hyperlegible** as the default font — designed by the
  Braille Institute for low-vision and dyslexia readers.
- **OpenDyslexic** is bundled and can be toggled from Settings.
- **17 px base text** (not tiny 14 px)
- **Line height 1.75** (generous leading)
- **Letter spacing 0.015 em** (reduces letter crowding)
- **Word spacing 0.1 em** (clear word boundaries)
- **No italics in the UI** — italics are rendered as bold instead
  (italics are hard to read with dyslexia)
- **High contrast** by default (near-white text on deep navy
  background)
- **High Contrast theme** available for severe contrast needs
  (yellow on black)
- **Bionic reading** in the viewer bolds the first ~40% of each
  word
- **Focus line** provides a reading ruler that stays on-screen
- **Color overlays** (cream, yellow, soft blue) inside the viewer
  reduce page-white glare
- **48 px minimum tap target** for every button — no fiddly taps
- **Reduce motion** kills transitions and animations

---

## Supported file types

| Type | Extension | How Load handles it |
|---|---|---|
| Single HTML | `.html` / `.htm` | stored as-is |
| Web app bundle | `.zip` | JSZip extracts and inlines everything into one self-contained HTML |
| PDF | `.pdf` | pdf.js parses text, renders as readable HTML with page markers |
| EPUB book | `.epub` | epub.js reads chapters, concatenates into one HTML |
| Kindle | `.azw`, `.azw3`, `.mobi`, `.kfx`, `.prc` | **Not supported** — DRM-locked. Convert to EPUB with Calibre first. |

---

## Tips for adult dyslexic readers

- **Turn on Bionic reading** for long-form text — it genuinely
  helps most dyslexic readers.
- **Try OpenDyslexic font** from Settings. Some users love it,
  some don't. Easy to swap.
- **Cream or Sepia theme** is easier on the eyes than bright
  white.
- **Increase line spacing 1 step** if lines feel crowded. You can
  always Reset.
- **Use TTS with text visible.** Seeing and hearing at the same
  time is a well-established dyslexia reading aid.
- **Speed up TTS gradually.** Start at 1x. Most readers settle
  around 1.15x–1.3x after a few sessions.
- **Break long content into chunks.** If a book is overwhelming,
  read 10 minutes, take notes, come back. The notes drawer is
  right there for exactly this.
- **Never force-read.** Close the viewer, come back. Reading
  positions are saved.

---

## Troubleshooting

**"Splash image doesn't show."**
The file must be at `/load/splash.png` in the repo. If the image
won't load, open `https://github.com/dssorit/ancient-covenant-scrolls/tree/main/load`
in Safari and confirm `splash.png` exists there. Rename if needed
(no spaces in filenames).

**"Background image doesn't show."**
Same pattern — file must be at `/load/bg.png`.

**"Import is slow."**
PDFs and EPUBs are parsed at import time so the viewer opens
instantly. A 300-page PDF takes 20–60 seconds to import. One-time
cost per file.

**"Read Aloud says 'No text to read.'"**
The content page is blank or its text is in an inaccessible
iframe. Try reloading the page; if still empty, the HTML might
load content dynamically that the speech engine can't reach.

**"Library is gone after deleting Load from home screen."**
Deleting a PWA from iPad home screen also deletes its IndexedDB
and localStorage. That's iOS behavior, not Load. Don't delete
Load from home screen unless you want to start fresh. To back up
your library, export each file using the Edit HTML option and
save to Files.

**"Home screen icon doesn't work when tapped."**
You added the icon to home screen before the service worker
finished caching. Open Safari once, let Load fully load, then
add to home screen again.

**"I'm seeing the old version."**
Pull down to refresh in Safari. Or go to Settings → Safari →
Advanced → Website Data → find the Load entry → swipe left →
Delete. Reopen Load.

---

## Privacy

- No analytics. No tracking. No cookies for third parties.
- No account. No login. No sign-in.
- Every file you import stays on your iPad. Nothing is sent
  anywhere.
- Notes and reading positions stay on your iPad.
- The service worker's job is to cache Load's code locally so the
  app opens without internet. It makes no other requests.

---

## License

All Rights Reserved. See `LICENSE` at the repository root.

The Load application code is the original work of LBond.
Unauthorized reproduction, modification, distribution, or
use for machine-learning training is prohibited.

---

## Feedback & changes

If a feature is broken or you want something added, note it in a
follow-up session. The architecture is deliberately simple so
changes can be made incrementally:

- `index.html` — UI layout
- `load.css` — styles and themes
- `load.js` — all logic (storage, import, TTS, notes, etc.)
- `sw.js` — service worker for offline caching

Libraries are bundled locally:

- `lib-jszip.min.js` — ZIP extraction
- `lib-pdf.min.js` + `lib-pdf-worker.min.js` — PDF parsing
- `lib-epub.min.js` — EPUB parsing
- `fonts/` — Atkinson Hyperlegible + OpenDyslexic woff2 files
