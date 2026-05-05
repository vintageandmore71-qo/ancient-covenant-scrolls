# MASTER BACKLOG — every site, every request, what's done vs. left

Single source of truth so nothing the user has asked for falls off
the list. Per user direction 2026-05-04 ("you're suppose to be
keeping track of all my requests"). Every plan / handoff / inbox
spec is cross-linked from here.

**Lock rule:** every shipping commit must update this file's per-site
"Done in this session" line and the relevant "Pending" rows. Future
sessions read this file at start (CLAUDE.md `Session continuity`).

---

## How to use this file

- Each site has a **Pending**, **In progress**, and **Recently done** block.
- Each pending row points at its source spec (inbox file or `PLAN_*.md`)
  so a future session can pick up without re-asking the user.
- Cross-cutting features that touch multiple apps live in the
  **Cross-suite features** section.

---

## Cross-suite features (touch multiple apps)

| ID | Item | Source | Status | Notes |
|---|---|---|---|---|
| X-B2V | **Book-to-Video engine** — import book → text → scene cards → assets → Load timeline | `inbox/Load_Book_to_Video_Spec.zip` + `inbox/Load_Book_to_Video_Implementation.zip` → `PLAN_BOOK_TO_VIDEO.md` | **Wired in v17er.** CSS link + 7 script tags loaded from `load/book-video/`, "Book to Video" tile added to workspace hub Section 4 with `data-open-book-to-video` handler that calls `window.LoadBookToVideo.open()`. | Acceptance: TXT/HTML/PDF/EPUB → editable Scene Cards. Engine modules live under `load/book-video/`. |
| X-V2V | **Verse-to-Video** — turn ACR Study verses into visual simulations of the verse (clips that bring the words to life) | Originally a Claude suggestion (should have been on this list earlier — captured 2026-05-04 after user correction). ChatGPT prompt note also in `inbox/`. | **Not started.** | Source verses from `study/content/` JSON. Reuse Book-to-Video scene-card pipeline + character-bible engine + image generator. Per-verse output: 5–10 second clip. Will need image-to-video provider gate (see X-AI). |
| X-P2V | **Photo-to-Video** — single photo → 5s synthetic clip | Already partially implemented in LoadStudio Editing Bay (`pickAndOpen('image')` wraps a still in a `MediaRecorder` capture). | **Partial.** LoadStudio uses `canvas.captureStream()` + `MediaRecorder` to wrap a single image into a synthetic 5-second video. Works on iPad. | Needs: extension to AI-driven motion (Ken Burns auto-pan, parallax, image-to-video model when X-AI lands), reuse from Load main + Attain (verse cover → opening clip). |
| X-AI-CORE | **Load AI Image system core** — chat-driven image gen, provider router, capability map, output validation, no-image-returned detector, Output Receipt audit log | `PLAN_LOAD_AI.md` Tier 1 status table line 254: ✓ shipped | **DONE** in `load/load.js` v17dq–v17dy (provider router, capability registry, `HF_TEXT_ONLY_MODELS` regex pre-call block, `filterImageProvidersForTask`, `imageGenWithFallback` with skip reasons, `runImageTask` facade, soft img2img → text-to-image fallback, `cleanPrompt` extraction, ADD_OBJECT auto-placement bbox, withTimeout / AbortController, Test Keys diagnostic with masked keys + status icons, Output Receipt audit log, Test Keys grouped by image-vs-chat). | No further work needed unless user reports a specific issue. |
| X-AI-14 | **Load AI Tier 14 / 18-fallback add-ons** (the Glam-parity layer on top of the shipped core) | `PLAN_LOAD_AI.md` lines 298-308 + `inbox/Load_AI_Glam_Style_System_Research_and_Developer_Plan.zip` | **Pending.** | 14a curated local style library (~50 styles vs current 8 chips), 14b face restoration (GFPGAN/CodeFormer via HF), 14c Real-ESRGAN upscale via HF, 14d SiliconFlow connector (FLUX.1 Kontext + image-to-video), 15 HF Spaces connector, 18-fallback external video-prompt panel (Runway/Kling/Pika/Luma/Wan), 18a-c Image→Video tiers (basic motion canvas, SVD, AnimateDiff). Plus the 7-layer "AI Style Chat" flow chrome (chat input → classifier → prompt builder → mask editor → router → verifier → image-to-video) layered on top of the existing core. |
| X-AI-MASK | **Browser mask editor** (Canvas / Fabric / Konva) for inpaint / ADD_OBJECT precision | `PLAN_LOAD_AI.md` line 283 + Glam doc | **Pending.** Single biggest unlock for true edit support. | |
| X-PIPER | **Piper TTS — premium offline neural voice** (shared engine across all 5 ACR apps) | `SESSION_NOTES_2026-04-27.md` + `SESSION_NOTES_2026-04-28.md` + `LOAD_FEATURES.md` line 145 + `PLAN_IMAGE_PROMPT_v3.md` line 715/797 | **Stage 1 partial / parked since 2026-04-27.** `lib-piper.js` shared engine ships across all 5 apps. Load Settings → Premium voice — Piper section has Install / Repair / Skip Piper / Diagnostic. Tour narration falls through Piper → Safari speechSynthesis cleanly. **Blocker:** post-install `play()` exception not yet captured — user needs to tap Repair voice and report the visible error so we can fix the actual playback failure. | Stage 2 (ACR Reader / Attain / Attain Jr / Study read-aloud all routed through Piper when installed, otherwise Web Speech) **blocked** on Stage 1 working. |
| X-CC | **Character Consistency** — lock face/era/wardrobe across scenes | `inbox/load_ai_character_consistency_with_code.zip` (reference modules) | **Pending.** Spec captured. Modules `provider-registry / character-memory / prompt-builder / output-verifier / image-router` not wired. | Same character JSON schema reused by Book-to-Video + LoadStudio Character Studio + Attain story illustrator. |
| X-VOICE | **Universal voice command bar** | `SUGGESTIONS_PARKED.md` (parked — review 2026-05-25) | Parked. | |
| X-KG | **Shared local knowledge graph (one IDB across apps)** | `SUGGESTIONS_PARKED.md` | Parked. | |

---

## Load main (`/load/`)

**Cache:** `load-v17ew`. **Tip status spec:** `PLAN_LOAD_AI.md`,
`PLAN_IMAGE_PROMPT_v3.md`, `PLAN_BOOK_TO_VIDEO.md`,
`MEDIA_MODULE_SPEC.md`, `LOAD_FEATURES.md`, `LOAD_MARKETING.md`.

### Pending
- **Load AI Tier 14 / 18-fallback add-ons** — see X-AI-14 (the core X-AI-CORE is **shipped** in v17dq–v17dy; only the Glam-parity layer remains).
- **Browser mask editor** — see X-AI-MASK.
- **Character Consistency module** — see X-CC.
- **Piper TTS Stage 1 unblock + Stage 2 rollout** — see X-PIPER. Stage 1 shipped but not playing; blocked on the play() error text from the user. Resilience panel (Part 9) shipped in v17er gives an in-app diagnostic + recovery path.
- **LOAD-ECO acceptance test pass** (Build Plan Part 13). Every part now has a tool surface, but the user-validation pass is still needed: open each tool, confirm PASS/FAIL/WARN labels render, run a sample export, save a receipt, check it appears in the Receipts library. Parts 1, 2, 3, 14-17 shipped in v17eq. Parts 4, 7, 9 + Book-to-Video wiring shipped in v17er. Parts 5, 6, 8, 10 shipped in v17es. Parts 11-13 are housekeeping/acceptance and are met by the existing tool surfaces.

### Recently done (this session, 2026-05-05 — mask editor + style library)
- **v17ew — Mask Editor + Style Library**:
  - **Mask Editor (X-AI-MASK):** new tool at `load/tools/mask-editor.html`. Drop a photo, paint a white mask with adjustable brush size / hardness / opacity, erase to undo a stroke, invert / clear / undo (12-step history), export a clean binary B/W PNG (white = paint region, black = leave alone). Layered canvas: source + 55%-opacity mask overlay + transparent input layer with pointer events. Source images auto-downscale to max 2048 px. "Download mask + source" button bundles both files for handoff to any inpaint-capable provider. Closes the biggest unlock listed in the Cross-suite features table.
  - **Style Library (X-AI-14a curated styles):** new tool at `load/tools/style-library.html`. 50 curated AI-image styles across 7 categories (Cinema, Painted, Illustration, Photo, 3D, Genre, Crafty). Per-style keyword block. Tap Copy for a single style or Add to basket to combine multiple. Copy basket joins them with semicolons for paste at the end of any image prompt. Search field + category chip filter.
  - Help page updated: new TOC entries + per-tool cards for Mask Editor, Style Library, Acceptance Criteria.
  - Workspace hub Section 6 now has 15 tiles (added Mask Editor + Style Library).
  - Cache `load-v17ev` -> `load-v17ew`. Version badge bumped in `load/load.js`.

### Recently done (this session, 2026-05-05 — acceptance + inline help)
- **v17ev — acceptance dashboard + inline help links + search regression fix**:
  - **Acceptance Criteria dashboard:** new tool at `load/tools/acceptance.html`. Walks the 23 acceptance criteria from Build Plan Part 13. Auto-checks where possible (Diagnostics tool reachable, Safety & Rights tool reachable, LoadStudio Validator references rights.json, Ecosystem Routing references LoadStudio + LoadPlay, PWA Builder runs `findingsBlocked` security gate, AI privacy copy doesn't contain banned absolutes in `load.js`, Voice Diagnostics surfaces recovery actions). Manual checks (navigation, import, library round-trip, viewer reopen, manifest repair, SW generation, PWA ZIP export, book PWA renders, export receipt, LoadStudio inspection, "no false complete claims", final report) get explicit Mark Pass / Mark Fail / Reset buttons. Results persist in localStorage `load_acceptance_v1`. JSON export, copy, reset all.
  - **Inline "How it works" link** added to the header of every Section 6 tool: Export Receipts, Ecosystem Routing, Book PWA Validator, AI Provider Status, Safety & Rights, Sample Test Projects, Voice Diagnostics. Links to the matching anchor in `load/tools/help.html` so the step-by-step guide is one tap away from any tool.
  - **v17eu — search icon fix:** reverted v17et's pointerdown experiment on the magnifying-glass toggle. SVG injection now writes explicit `width="22" height="22"` directly on the `<svg>` element so iPad Safari cannot collapse the icon during first paint. Library search bar also opens by default at boot so search is reachable even if the icon stays hidden on a particular Safari build.
  - Workspace hub Section 6 now has 13 tiles (added Acceptance Criteria).
  - Cache `load-v17et` -> `load-v17eu` -> `load-v17ev`. Version badge bumped in `load/load.js`.
  - **Validation pending (user action):** open Acceptance Criteria, tap Run automatic checks, walk the manual rows on iPad and tap Mark Pass / Mark Fail per row, then Export JSON for the proof-of-pass record.

### Recently done (this session, 2026-05-05 — fixes + media + editor + help)
- **v17et — photos/clips in PWA builder, file editor, help, AI test fix, search hardening**:
  - **Photos & video clips in the One-Click PWA Builder:** picker accepts multi-select images (PNG/JPEG/WEBP/GIF/SVG) into `assets/images/` and video clips (MP4/WEBM/MOV/M4V/OGV) into `assets/clips/`. Inline embedding via `[image: name.jpg]` / `[clip: name.mp4]` markers in the body; anything not inlined renders in a Photos gallery + Clips section at the bottom of the generated `index.html`. New CSS rules for `.embed`, `.gallery`, `.clips`. Filenames are sanitized + de-duped (`-1`, `-2`, ...). Reset clears both pickers. Receipt step still includes everything bundled.
  - **PWA File Editor (new tool):** `load/tools/pwa-file-editor.html`. Drop a PWA / book PWA / LoadStudio ZIP, get a sortable file tree, edit text files inline (HTML/CSS/JS/JSON/Markdown/TXT/XML/SVG/webmanifest), preview / replace any image / audio / video binary, add new file at any path, add new folder (`.keep` marker), delete any file. Repacks via JSZip and downloads `<orig>-edited.zip`. Auto-saves a Part 5 export receipt with edited-file count. Original file on iPad is untouched.
  - **AI Provider Status — test fix + Mark Ready override:** every test now runs through `safeFetch`, classifies fetch errors as UNSUPPORTED with a clear "Browser blocked the test (CORS / content-blocker / offline)" detail instead of failing silently. Switched OpenRouter test to `/api/v1/auth/key` (lighter, more CORS-friendly) and OpenAI / HF unchanged. Added a per-row **Mark Ready** button so users can manually flip a row to Ready when their key works through the Load AI panel but the static-page test is blocked. Status JSON export updated.
  - **Library search hardening:** the magnifying-glass toggle now binds to both `pointerdown` + `click` with a 250 ms re-entry guard. iPad Safari sometimes drops synthesized clicks on icon-only nav buttons inside sticky headers; this restores the toggle.
  - **How to use Load (new help page):** `load/tools/help.html`. Single comprehensive step-by-step guide with sticky table of contents and per-tool instruction cards covering: install, force refresh, import, library + search, preview, repair, One-Click PWA Builder (incl. new photos/clips), Book PWA Validator, Export Receipts, Standalone HTML/PDF/EPUB, Diagnostics dashboard, LoadStudio Validator, Safety & Rights, Ecosystem Routing, Sample Test Projects, AI Provider Status, Voice Diagnostics, PWA File Editor.
  - Workspace hub Section 6 now has 12 tiles (added PWA File Editor + How to use Load).
  - Cache `load-v17es` -> `load-v17et`. Version badge bumped in `load/load.js`.
  - **Validation pending (user action):** confirm hard-refresh shows v17et badge; test the new photos+clips picker by building a small PWA with one photo + one clip; open the modified ZIP in PWA File Editor and edit a file; try the magnifying glass on Library; tap Test in AI Provider Status (Failed/Ready/Unsupported with detail) or use Mark Ready.

### Recently done (this session, 2026-05-05 — Load Main Next Build Plan finish)
- **v17es — Parts 5, 6, 8, 10**:
  - **Part 5 — Export receipts:** new shared library `load/lib-export-receipt.js` exposes `window.LoadReceipt.create / save / list / get / remove / clear / toJson / toBlob`. Receipts persist to `localStorage` key `load_receipts_v1` (capped at 200 entries). Receipt schema matches Build Plan Part 12: id, schemaVersion, exportType, fileName, fileSize, createdAt, includedFiles[], missingFiles[], warnings[], manifestStatus, serviceWorkerStatus, rightsStatus, offlineStatus, safetyStatus, nextAction, notes. New tool at `load/tools/export-receipts.html` lists every saved receipt with status pills, expandable file lists, per-receipt Download / Copy / Remove, plus a manual "New receipt" form for legacy exports and bulk Export-all / Clear-all controls.
  - **Part 6 — Ecosystem routing:** new tool at `load/tools/ecosystem-router.html`. Drop any file; the tool detects type by extension + ZIP content sniff (LoadStudio markers `rights.json + scenes.json`, book-PWA markers `book-data.json / chapters.json`, manifest presence), then renders the contextual button strip per Build Plan Part 6: generic, HTML/PWA, books/documents, media, LoadStudio package, LoadPlay publish-prep. Each button links to the matching Load tool; no automatic upload or transmission. Type-chip grid lets users pick a category without uploading.
  - **Part 8 — PWA Book Export Standard validator:** new tool at `load/tools/book-pwa-validator.html`. Drop a book PWA ZIP; the validator confirms required files (`index.html`, `manifest.json`, `service-worker.js`, `styles.css`, `app.js`, `book-data.json` or `chapters.json`, `README.md`), required folders (`assets/icons/`, `assets/images/`), manifest fields (name, start_url, display, theme_color, icons), service worker has install + activate + fetch handlers and a cache strategy, at least one chapter exists in book data, cover image loads (renders a thumbnail), `index.html` looks like a rendered page (not raw code) with manifest link + script reference + book-data hook, asset paths are not absolute / external / traversal / missing-in-zip. Saves a Build Plan Part 5 receipt with one tap.
  - **Part 10 — AI provider routing statuses:** new tool at `load/tools/ai-provider-status.html`. Surfaces the six statuses spec'd in Part 10 (Not configured / Ready / Failed / Rate limited / Unsupported request / Returned no file) with color-coded pills and per-row explanation. Per-provider key save (masked) + Test (lightweight reachability ping for OpenRouter, Hugging Face, OpenAI; UNSUPPORTED for browser-CORS-blocked endpoints like Anthropic + SiliconFlow, validated at first real request). "Test all configured", JSON export, copy. Built-in helper row documents the no-key local fallback. Status persists to `load_ai_status_<id>` in localStorage. Lock rule: Load never claims an image / audio was generated unless an actual blob exists; the NO_FILE pill is the visible surface for that.
  - Workspace hub Section 6 now has 10 tiles: One-Click PWA Builder, Diagnostics, LoadStudio Validator, Safety & Rights, Sample Test Projects, Voice Diagnostics, Export Receipts, Ecosystem Routing, Book PWA Validator, AI Provider Status.
  - Cache `load-v17er` -> `load-v17es`. Version badge bumped in `load/load.js`.
  - **Validation pending (user action):** open each new tool from workspace hub, confirm rendering on iPad Safari, run a sample import through Ecosystem Routing + Book PWA Validator + Safety & Rights, save a receipt and confirm it appears in the Receipts library, save an OpenRouter or HF key in AI Provider Status and tap Test to confirm the pill flips to Ready (or the matching failure state).

### Recently done (this session, 2026-05-05 — Load Main Next Build Plan continued)
- **v17er — Parts 4, 7, 9 + Book-to-Video wiring**:
  - **Part 4 — Safety & Rights validator (generic):** new tool at `load/tools/safety-rights.html`. Drop any HTML or ZIP and it scans for credentials, hard-coded API keys, external `<script src>` URLs, javascript:/data:html URLs, path traversal, executable-extension files, and `.env` exposure. For ZIPs it also validates the rights metadata block (owner, license, sourceMaterial, assetDeclarations array). HTML preview runs inside a strict-sandbox `<iframe sandbox="allow-scripts">` with a one-tap "Reload as strict (no same-origin)" toggle. JSON export of every finding.
  - **Part 7 — Sample Test Projects:** new tool at `load/tools/samples.html`. Nine ready-made files: minimal HTML page, installable PWA ZIP (manifest + service worker + icons), EPUB 3 zip, valid PDF byte-stream, JPEG image, 1-second 440 Hz WAV (RIFF byte-encoded), 2-second canvas-recorded WebM video, `.loadstudio.zip` pack with rights.json + scenes/characters/credits, and a book-PWA bundle. Per-card buttons: Open, Test (sends through Safety & Rights), Export (downloads the file), Reset.
  - **Part 9 — Piper TTS Resilience panel:** new tool at `load/tools/piper-resilience.html`. Four sequential diagnostics: raw audio (synthetic WAV through `<audio>`), browser voice (`speechSynthesis`), Piper generate (no playback), Piper generate + play. Each step reports PASS / FAIL / SKIP with the actual error text surfaced so we can finally pin Stage 1's playback failure. Recovery actions: Reset Piper Settings (clears prefs), Clear Corrupt Piper Config, Rebuild Voice Cache (purges Cache Storage entries matching `/piper/i`), Hard Reset (drops localStorage piper keys + Cache Storage piper caches + IndexedDB databases matching `/piper/i`).
  - **X-B2V — Book-to-Video engine wired into Load main:** added the CSS link, all 7 module script tags (`book-text-extractor`, `scene-card-engine`, `character-bible`, `ai-provider-router`, `timeline-bridge`, `book-to-video-engine`, `book-to-video-ui`), and a global click handler that opens `window.LoadBookToVideo` when any element with `data-open-book-to-video` is tapped. New "Book to Video" tile lives in workspace hub Section 4 next to Video Editor.
  - Workspace hub Section 6 now has six tiles: One-Click PWA Builder, Diagnostics, LoadStudio Validator, Safety & Rights, Sample Test Projects, Voice Diagnostics.
  - Cache `load-v17eq` -> `load-v17er`. Version badge bumped in `load/load.js`.

### Recently done (this session, 2026-05-04 — Load Main Next Build Plan)
- **v17eq — `inbox/Load Main Next Build Plan.docx` Parts 1, 2, 3 + `inbox/PWA One Click Create.docx` Parts 14-17 shipped**:
  - **Part 1 — Truthful AI / privacy copy:** Load AI panel header rewritten as a plain-language privacy notice ("Load's core workspace is local-first. Optional cloud AI tools may send selected prompts or assets to the provider chosen by the user. These providers are off by default unless configured."). Built-in description + Load AI intro de-claimed away from "100% offline" / "no network" / "never sees" since the optional cloud chain exists. Explicit confirmation that API keys are not hard-coded.
  - **Part 2 — Feature Verification Dashboard:** new tool at `load/tools/feature-tests.html`. 43 tests with PASS / FAIL / WARN / NOT-TESTED, summary cards, per-test Run button, Run All Tests, JSON export, plain text export, Copy report, Clear report. Each test returns explanation + technical detail + suggested fix + timestamp. NOT-TESTED is the default for tests that need a file picker so the dashboard never claims a file imported when none was.
  - **Part 3 — LoadStudio Package Validator:** new tool at `load/tools/loadstudio-validator.html`. Drop a `.loadstudio.zip` / `.cinepwa.zip` and inspect: 11 required files, 6 required folders, full rights.json validation (owner, license, sourceMaterial, assetDeclarations array, unknown-status detector), embedded safety regex sweep on bundled HTML/JS/JSON/CSS (external script, javascript: URL, credential pattern, executable file, hidden .env, path traversal). PASS / WARN / FAIL summary, JSON export, copy.
  - **Parts 14-17 — One-Click Standalone PWA ZIP Builder:** new tool at `load/tools/pwa-builder.html`. Project-name + short-name + theme color + project type (app / book / reader / checklist) + optional icon picker + content textarea. Build button runs 15-step pipeline (collect → checks → icons → manifest → sw → index → styles → app → data → paths → safety → readiness → zip → receipt → ready) with live PASS / FAIL / WARN / SKIP per step. Auto-generates 192 + 512 px PNG icons (canvas-rasterized from the user's pick or generated from the first letter). Real safety scanner: external script, javascript: URLs, inline eval, credential pattern, path traversal, executable file, .env file, absolute paths. BLOCKER-severity findings stop the build. The output ZIP includes `index.html`, `manifest.json`, `service-worker.js`, `styles.css`, `app.js`, `project-data.json` (or `book-data.json` for book/reader types), `assets/icons/icon-192.png`, `assets/icons/icon-512.png`, `assets/images/.keep`, `README.md`, `export-receipt.json`, `security-report.json`. Produces a real `Blob` — never claims success without one. Receipt + security panels render on screen with separate JSON download buttons. Privacy notice at the bottom: nothing leaves the device.
  - Workspace hub gets a new **"6. Build & validate"** section with three tiles linking to the tools.
  - Cache `load-v17ep` -> `load-v17eq`.
- Long-form FAQ emoji strip: done. Some geometric unicode glyphs remain inside the runtime-built editor quick-action panel (◎ / ◖ / ↻) — visually fine on iPad, low priority.

### In progress
- (none — last session shipped v17el)

### Recently done
- v17el — premium icons + Inter font + transparent blue front buttons; editor toolbar SVG; sidebar SVG; headless mode for `?lsedit=` so editor can be hosted by LoadStudio without Load Main UI bleeding through.

---

## LoadStudio (`/loadstudio/`)

**Cache:** `loadstudio-complete-v42`. **Spec source:**
`loadstudio/HANDOFF_LOADSTUDIO.md`,
`inbox/Load_Studio_Load_Play_Complete_Build_Plan.docx`,
`inbox/Load_Studio_PWA_Cinema_Complete_Build_Manual.docx` /`.pdf`.

### Pending
- **LS-Backend (NEW)** — wire every drawer item / tile / form button to a real handler so no link goes nowhere. Audit against the build plan + manual. Batched fix-up across all 36 sections. Source: `inbox/Load_Studio_PWA_Cinema_Complete_Build_Manual.pdf` + `inbox/Load_Studio_Load_Play_Complete_Build_Plan.docx`. Discovered 2026-05-04 via the v41/v42 regression that revealed how many sections are stubs.
- LS-1 dyslexia rework — DONE in v39 for 29 sections. Editing Bay / Visual Editor / Advertiser / Inbox already had bespoke UIs. Some remaining sections still need UI wired (overlaps with LS-Backend).
- LS-2 end-to-end Import wiring — file input + saveImports() exists but only stores metadata. Need: thumbnail extraction, type routing, asset-library tile render, duplicate detection.
- LS-3 stock library — search UI + license metadata + asset checkout. Not started.
- LS-4 Help & Guided Tour content — drawer item + splash tour exist; per-section walkthroughs empty.
- LS-5 lseditor extraction — `lseditor.js` is a verbatim 870 KB copy of `load/load.js`. Long-term: extract just `openVideoEditor`. Not blocking.
- LS-6 Cover button on editor track rail — has SVG icon now but its handler navigates to a Load Main cover-designer screen that doesn't exist in LoadStudio. Either implement a cover designer here or hide the button when `body.ls-host`.
- LS-7 Save draft / IDB schema sync — drafts don't sync between Load Main and LoadStudio (each lives in its own IDB).
- **LS-MKT-1** — sample marketplace items (parity with the Attain sample-book ask). User direction 2026-05-04.

### Recently done (last 3 sessions)
- v42 — moved `controlsFor()` inside the IIFE so it can see `_origControlsFor` + `lsFrame`; fixed every dead front-screen button.
- v41 — wrapped `LS_DYS_ACTIONS` in `lsDysActions(id)` function so `${id}` resolves at call time; fixed Editing Bay regression.
- v40 — zoom banner X dismiss inline-style fix.
- v39 — LS-1 dyslexia-friendly reorganization across 29 generic sections.
- v37 — Reset Page Zoom toolbar button.
- v35 — Editing Bay runs editor NATIVELY in LoadStudio (no iframe, no `../load/` runtime dep).

---

## LoadPlay (`/LoadPlay/`)

**Cache:** `loadplay-v52`. **Spec source:** `HANDOFF_LOADPLAY.md`,
`PLAN_LOADPLAY_AUTOPILOT.md`, `inbox/LoadPlay_Mock_User_*.{zip,docx}`,
`inbox/LoadPlay_Autopilot_Content_Engine_Handoff.zip`.

### Pending
- **LP-MKT-1** — sample marketplace items in LoadPlay (parity with Attain sample-book ask).
- **LP-API** — real API Keys panel surfaced under Settings (the dev-tool API Keys exists in v49, but the Settings-side surface for non-dev users is not built).
- **LP-CONTENT-1** — expand `data/demo-content.json` catalog (more rails, more genre coverage).
- (Tier 7 Content Connector System + Tier 8 Operations Load Simulator both **DONE v54** — see Recently done.)

### Recently done (this session, 2026-05-04)
- **v54 — Tier 7 Content Connector System + Tier 8 Operations Load Simulator**:
  - Sidebar entries: Content Sources / Draft Catalog / Rights Review / Operations Simulator under Creator.
  - Content Sources: 11 connector cards (Internet Archive, Openverse, Pexels, Pixabay, Wikimedia Commons, Freesound, Jamendo, GDELT, NASA, NPS, RSS) with Test / Fetch Preview / Import to Drafts / per-key save / enable toggle. Real fetchers wired live for the four no-key providers (Internet Archive advancedsearch, Wikimedia search, Openverse images, GDELT doc API). Key-required providers return clearly-labelled DEMO PREVIEW until a key is saved.
  - Normalizer enforces the 17-field unified content model (provider / providerId / sourceUrl / mediaUrl / thumbnailUrl / title / description / creator / license / licenseUrl / attributionText / mediaType / duration / category / tags / dateDiscovered / status). License safety auto-routes Public Domain / CC0 / CC BY → drafts; everything else → rights review.
  - Draft Catalog page lists draft items with thumbnail + Send to Rights Review / Approve & publish / Delete; demo-preview items can NEVER publish (hard-blocked).
  - Rights Review page lists pending items with Approve & publish / Needs manual check / Reject / Back to draft, plus Export rights report (JSON + CSV).
  - Tier 8 Operations Load Simulator: capacity input (hours/day), 7 scenario buttons (Light Day / Normal Day / Busy Day / Viral Spike / Creator Upload Rush / API Content Flood / One-Person Operation), workload rules per spec (16 event types with department + minutes + priority + human-required flag), risk-level calculation (manageable / near_capacity / overloaded / critical), per-department breakdown, recommendations engine (rights review caps, support auto-responses, content-review metadata gate, provider-import caps), 30-report rolling history, JSON + CSV export, "Clear simulation data" reset. All output labeled SIMULATION ONLY · INTERNAL TEST DATA.
  - Both engines write to lp_action_log with `connector` / `rights` / `publish` / `ops-sim` categories.

- **v53 — Tier 6 Autopilot Content Engine** + **LP-0.8 action log** shipped:
  - Sidebar entries: Autopilot (with mode pill) + Action Log under Creator.
  - Autopilot dashboard: 6 status cards (mode, last run, drafts, rights queue, published, pilot reports), full settings panel (master enable, 6 modes, 4 frequencies, 3 safety levels, 5 source toggles, 10 row toggles), Run Now / Pilot Test / Recycle / Export Report / Clear Demo Data buttons, rights review queue with Approve & Publish / Reject per-item, latest pilot report summary, recent jobs feed.
  - 6 modes: Off, Demo (mock items only, never count), Draft Only, Rights Review Only, Publish Approved Only, Full Autopilot.
  - 12-item curated discoverable catalog (Internet Archive, Wikimedia, NASA, NPS, Openverse) with bound license metadata so license-safety checks (low / medium / high) can score before any item moves.
  - Storage: lp_autopilot_settings / _jobs / _drafts / _rights_review / _published / _pilot_reports.
  - Honest browser-only scheduler (60s tick, runs only while app open). Per-frequency throttling.
  - Action log: lp_action_log captures every mutation (250 categories, capped 500 entries), Action Log page lists with date / category color / message, Export JSON, Clear log. lpLogAction() called from autopilot run / pilot / recycle / publish / reject / settings save.

### Recently done (this session, 2026-05-04)
- v52 — Tier 5.15 Inbox + 5.16 Advertiser Console.
- v51 — Tier 4.13 Marketplace cart/checkout + 4.14 real Safety Scan (regex blocklist + image-decode + min-dimension + structured pass/warn/fail report).
- v50 — rename "Upload Wizard" → "Upload" everywhere.
- v49 — Tier 3.8–3.12 Dev Lab tools (Diagnostics, Manifest Checker, SW Checker, API Keys, Package Validator).
- v48 — Tier 2.5 cinema package player (.cinepwa.zip via JSZip in sandboxed iframe), 2.6 audio-story playback, 2.7 per-project pages.
- v47 — Tier 1.4 multi-step Upload Wizard + real Drafts / Published pages.
- v46 — Tier 1.2 Watch History + 1.3 Settings page.
- v45 — Tier 1.1 Profile editing page (display name, handle, bio, avatar, banner).
- v44 — fix avatar covering player on tap (position-relative on `.ch-avatar` / `.avatar-btn`).

### Tier 1–5 status snapshot
| Tier | Item | Status |
|---|---|---|
| 1.1 | Profile editing page | DONE v45 |
| 1.2 | Watch History | DONE v46 |
| 1.3 | Settings page | DONE v46 |
| 1.4 | Upload Wizard | DONE v47 |
| 2.5 | Cinema package player | DONE v48 |
| 2.6 | Audio-story playback | DONE v48 |
| 2.7 | Per-project pages | DONE v48 |
| 3.8 | PWA Diagnostics | DONE v49 |
| 3.9 | Manifest Checker | DONE v49 |
| 3.10 | SW Checker | DONE v49 |
| 3.11 | API Keys (dev-tool) | DONE v49 |
| 3.12 | Package Validator | DONE v49 |
| 4.13 | Marketplace cart + checkout | DONE v51 |
| 4.14 | Real Safety Scan | DONE v51 |
| 5.15 | Member/Creator Inbox | DONE v52 |
| 5.16 | Advertiser Console | DONE v52 |
| 6 | Autopilot Content Engine | **DONE v53** (6 modes, curated discoverable catalog, rights review queue, recycling, pilot mode, action log) |
| 7 | Content Connector System (11 sources + Draft Catalog + Rights Review) | **DONE v54** |
| 8 | Operations Load Simulator (busyness simulator, 7 scenarios, risk + recommendations) | **DONE v54** |
| 0.8 | Action log | **DONE v53** |

---

## Attain (`/attain/`)

**Cache:** `attain-v67`. **Spec:** none — handoff is in
`SESSION_NOTES_*.md` rolling.

### Pending
- **AT-V2V** — verse-to-video / passage-to-clip integration: a section of any book can be selected and turned into a Book-to-Video scene chain (uses the same engine as X-B2V / X-V2V). Not started.
- **AT-PWA-IMPORT** — generic PWA-book import (the sample is currently the only PWA-shaped book; parser needs to handle arbitrary PWA-book .zip uploads).
- **AT-MEMORY** — the cadence learner (parked in `SUGGESTIONS_PARKED.md`).

### Recently done
- v67 — Inter font added to chrome (Atkinson Hyperlegible kept for body/reading); 28-glyph `lbIcon()` SVG set replacing emojis on topbar / library cards / banners / primary CTAs / expired / Progress / Settings / upload.
- v66 — wired "How To Flip, Abroad — Portugal Edition" PWA book as the sample (`data/sample-book.json` + `data/sample-cover.jpg`).
- v65 — dropped Aesop sample, plumbed `data/sample-book.json` fetch + cover-image library cards.
- v64 — initial sample-book auto-install pipeline.

---

## Attain Jr (`/attain-jr/`)

**Cache:** `attainjr-v1t`. **Spec:** in `attain-jr/NOTES.md`.

### Pending
- **JR-IMG** — replace activity emojis with the same `lbIcon()` SVG set used in Attain v67 + Study v78 (parity pass).
- **JR-FONT** — Inter chrome / Atkinson body parity pass.

### Recently done
- v1t — Hard Refresh button in topbar.

---

## ACR Study (`/study/`)

**Cache:** `acr-study-v78`. **Spec:** `study/BUILD_PLAN.md`.

### Pending
- **ST-V2V** — see X-V2V above. Each verse becomes a 5–10 second clip. Reuses Book-to-Video scene-card pipeline against `study/content/` JSON. New requirement 2026-05-04.
- **ST-INNER-EMOJI** — secondary emoji passes inside modals / help screens (the activity grid + topbar are done in v78; deeper modals and stage labels at line 508–510, 530, 690, 752, 759, 803 region of `study.js` were partially swapped — finish remaining).
- **ST-CONCEPT-MAP** — parked in `SUGGESTIONS_PARKED.md`.

### Recently done
- v78 — Inter font in chrome; `lbIcon()` 30-glyph SVG set replacing emojis on the 24-card activity grid, topbar (11 buttons), home logo, "Begin with Bereshit" arrow, voice play/pause/stop/preview, notes save/close, all-notes header.
- v77 — Hard Refresh button in topbar.

---

## ACR Reader (root `/`)

**Cache:** `acr-vNN` (see `sw.js`). **Spec:** root `README.md` + `HANDOFF.md`.

### LOCKED — DO NOT EDIT (per user 2026-05-04)

The root ACR Reader is **off-limits** until the user explicitly
unlocks it. Only edit if the user says "edit ACR reader" / "fix the
reader" / names a root-app file directly. AR-EMOJI and AR-INTER
parity passes are deferred indefinitely.

### Recently done
- (no changes this session — root reader untouched since prior session)

---

## How new requests get added

When the user asks for something, add it to the appropriate
**Pending** block in this file. Reference the inbox source file (or
the date the user asked) so context is preserved.
