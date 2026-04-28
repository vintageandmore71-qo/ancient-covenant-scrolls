# Load — Feature Rundown

Plain list of what Load does today and what's planned. Last updated end of session 2026-04-28 (Load v17cs).

---

## Library & file management

- Import HTML, ZIP, PDF, EPUB, DOCX, MD, TXT, plus video / audio / image
- Multi-file bundle import (tap-select multiple files = a folder-like web app)
- Per-tile rename, move-to-folder, delete
- Folders (organize your apps into groups)
- Type filters (HTML / PWA / PDFs / Books / Media / All)
- Search across name, notes, type, folder
- Recently-opened strip on Home
- Resume-reading card (jump back to where you left off)
- Per-tile context menu (View / Notes / Folder / Share / Edit / Add to Home / Rename / Delete)
- ⭐ Favorite toggle (kept during auto-cleanup)
- 🗑 Clear Library button (everything except favorites + annotated + bookmarked)
- Auto-cleanup on boot: items not opened in 30+ days, with one consent popup

## Reading aids

- Adjustable font size (A− / A+)
- Dyslexia-friendly font toggle (Atkinson Hyperlegible)
- Theme toggle (light / dark)
- Per-app theme override (an app can override the global theme)
- Bionic-text overlay (bold the leading N% of each word)
- Focus line (rendered over iframe content)
- Letter / word / line spacing controls
- Per-app reading position memory
- Per-app reading timer

## Annotations

- Per-app notes (📝 icon shows on tile when notes exist)
- Bookmarks
- Standalone Notes screen (read all notes across apps)
- Note editor

## Audio & voice tools

- TTS via Web Speech API (with enhanced-voice sorting)
- Audio I/O export — WAV / AIFF / M4A / AAC / WebM / OGG / MP3 / FLAC
- **Sound Studio** (Voice FX) — 20 effect presets via Web Audio (chipmunk, baby, grandma, grandpa, cartoon, etc.)
- **Voice Manipulator** — granular pitch shift + time stretch + 3-band EQ + reverb / echo / distortion / dry-wet + 8 style presets
- **Character Voice Studio** — assign voices to characters in a script
- Real voice transformation (pitch + formant shift, not chipmunk)
- **Voice Library** — IndexedDB store shared across all five ACR apps; manager panel; save buttons in Sound Studio + Voice Manipulator
- **Video → Audio** — pick a video, save audio-only as WAV (instant) or M4A (real-time AAC encode), result lands in Library

## Editor & authoring

- Single-file HTML editor (in-app)
- Editor controls + autocomplete
- Prose Editor (long-form writing surface)
- Layout View
- Chart Maker (insert charts into HTML)
- Cover Designer (book covers)
- Book Check (validate book metadata)
- Blurb Writer (back-cover summaries)
- Metadata Manager (title, author, ISBN, etc.)
- Save as template / load template
- Save as standalone HTML

## Sharing & export

- Share via Text / Email / AirDrop (iPad share sheet)
- Save to Files (iPad)
- Add to Home Screen (creates a custom-icon home shortcut that deep-links into Load)
- Package / export as standalone HTML
- Downloadable PWA bundles for the suite (`ACR-Reader-PWA.zip` etc.)

## AI & helpers

- **Load AI** built-in coding & reading assistant
- AI Helper / Copilot panel (plain-language help)
- AI provider settings (multi-provider routing)
- Auto-init local AI on rehydrate
- Patch preview (review proposed code edits)
- AI prefs persistence in IndexedDB (survives Safari eviction)

## Diagnostics & repair

- **Asset Doctor** / Developer Console (diagnose & fix uploads)
- Console scan reports
- Import error modal with multi-line reasons
- Hard refresh (purges cache)
- Persistent storage request (asks iOS to keep data)

## App framework / PWA

- Service worker offline-first (`load-vXXY` cache versioning)
- On-screen version badge (footer)
- Install banner (Safari → Add to Home Screen guidance)
- Persistent storage opt-in
- Standalone mode detection (hides install banner once installed)
- Cache-buster query string + controllerchange auto-reload
- IndexedDB primary storage (survives most eviction events)
- localStorage fallback for settings

## Workspace & Home

- Home splash with "Get Started" / "Create New" / "Open Library"
- Workspace shortcuts row (Workspace / Asset Doctor / AI Copilot / Help / Voice Studio / Sound Studio / Voice Manipulator / Voice Library)
- Workspace Hub (every tool with directions)
- Help screen with feature tour
- First-launch guided tour
- Settings panel
- Backup tool

## Recently shipped (today, 2026-04-28)

- v17cq — Library auto-cleanup + favorites + Clear Library
- v17cr — labeled red Clear Library button above the grid + item count
- v17cs — Video → Audio quick-extract Workspace tile

---

## Planned (in priority order)

### Next up — confirmed and ready to build

1. **Image Prompt** — multi-provider AI chat workspace tile (full plan in `PLAN_IMAGE_PROMPT.md`)
   - Phase 1: drop in the chat PWA renamed to "Image Prompt", ~30 min
   - Phase 2: real image editing (generate, edit, retouch, hairstyle, background change) — needs API decisions

### Mentioned by user, not yet committed

2. **Save-extracted-audio download button** — direct download path for audio tiles (currently only Share)
3. **Save-to-Voice-Library tile-menu action** — promote any audio file in the main Library to the cross-app Voice Library
4. **Use-Library-audio-as-chapter-recording** — let ACR's per-chapter recording flow accept a Library audio file in addition to live mic
5. **SFX bar in Load** like Attain Jr's 7-button row (Cinematic / Celebrate / Storm / Splash / Pop / Chime / Stop)
6. **Voice file upload in Attain / Attain Jr / Study** (mic record + file upload like ACR has)

### Voice cloning (decision pending)

7. **Custom voice for the reader** — clone a voice from a clip and read text in that voice. Three honest paths discussed:
   - Hugging Face Inference (XTTS-v2 / OpenVoice) — free tier, online-only, recommended
   - ElevenLabs API — best quality, paid
   - Self-hosted XTTS server — most private, requires a computer

### Long-parked, blocked

8. **Piper TTS** — parked since 2026-04-27. Blocked on the post-install play() exception text from the user (v17bx surfaces it).
9. **Voice Library cross-app integration** — only Load currently has the save-to-library buttons. ACR / Attain / Attain Jr / Study can READ the shared IndexedDB but no UI yet to invoke library voices for reading.
10. **Stage 2 of Piper rollout** (ACR / Attain / Study) — blocked on Stage 1 working.
11. **Stage 4** — Attain Jr per-character voices via LibriTTS multi-speaker — blocked on Stage 1.

---

## Where to find things in code

- `load/index.html` — all UI markup, modals, screens
- `load/load.js` — every wire function, every handler, single ~17k-line module
- `load/sw.js` — service worker (cache-bust, network-first for HTML/sw.js, cache-first for assets)
- `load/lib-voice-library.js` — Voice Library IndexedDB module
- `load/load.css` — styles

## Cache versioning

Bump these on every JS/HTML/CSS edit:
- `load/sw.js` `var CACHE = 'load-vXXY'`
- `load/load.js` on-screen badge `<span id="ve-version">vXXY</span>`

Skipping the bump = users serve stale cached code.
