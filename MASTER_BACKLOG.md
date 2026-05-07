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
| **X-VIDEO-AI** | **Advanced AI video generation** &mdash; full text/image/scene-to-video pipeline beyond the existing Verse-to-Video + Reel Composer (which are on-device WebM composers, not AI). Will need cloud provider chain (Runway / Kling / Pika / Luma / Wan / SVD / AnimateDiff), prompt builder integration with Character Bible + Style Library, image-to-video gate, output receipt + safety scan + rights metadata flow, no-false-positive verification of returned video files. | User direction 2026-05-06. **VERY IMPORTANT.** | **Not started.** Spec to capture. | Touches Load main (the Verse-to-Video tool), LoadStudio (scene rendering), and the `lib-export-receipt.js` flow. Needs API key UI, provider-status panel parity with the image side, and a video-specific Output Receipt schema. |
| **X-AI-AUDIO** | **Sound &amp; Atmosphere Engine** &mdash; real audio for animated image/video scenes (SFX, ambience, music, crowd noise, laughter, weather, footsteps, environment, music cues, narration / voice). Three sound paths: (1) embedded video audio when provider supports it, (2) separate generated audio/SFX attached to scene, (3) sound-prompt fallback when no audio provider exists. **MVP = path 2.** Required user-facing audio status labels (Audio embedded, Separate audio generated, Sound prompt saved, Audio provider needed, Silent video, Audio failed, Audio ready for scene, Audio ready for export, Audio muxing available, Audio muxing not available). Output proof rules: never claim audio unless real playable file/blob/URL exists. New scene fields (audioPrompt, sfxPrompt, musicPrompt, ambiencePrompt, voicePrompt, audio, music, sfx[], audioStatus, audioProvider, audioOutputProof, audioEmbedded, audioMuxed, audioDuration, audioRightsStatus). Stage path: prompt extraction &rarr; separate audio/SFX gen &rarr; layered playback &rarr; FFmpeg.wasm muxing &rarr; embedded audio. | `inbox/Load Main AI Addendum.docx` (2026-05-07) — addendum to the Combined AI Cinema System ZIP. **VERY IMPORTANT.** | **Not started.** | Peer of X-VIDEO-AI; sound is a non-optional production feature. Populates `assets/audio/`, `assets/music/`, `assets/sfx/` in LoadStudio packages. Writes into `scenes.json`, `generation-report.json`, `asset-declarations.json`, `rights.json`, `continuity-report.json`, `prompt-log.json`, `chat-history.json`. Chat splits a single user request into visual / motion / sound / music / SFX prompts; runs animation + audio jobs in parallel; surfaces five card types (animation request, animation progress, audio generation, video result, audio result). |
| **X-DB** | **Full production database** &mdash; replace per-device IndexedDB-only state with a server-side production database (cross-device sync of Library, Notes, Bookmarks, Receipts, Rights, Character Bible, Subscription state). | User direction 2026-05-06. **VERY IMPORTANT.** | **Not started.** Scope to define. | Open questions: Postgres vs Firestore vs Supabase; user identity (Apple Sign-In, email magic link); data export / GDPR delete; offline reconciliation; per-app schema or shared schema. Needs auth, conflict resolution, server-side rights enforcement. |
| **X-SUBS** | **Subscription system** &mdash; paid tiers across the Load suite (Load main, Attain, Attain Jr, Study, LoadStudio, LoadPlay). | User direction 2026-05-06. **VERY IMPORTANT.** | **Not started.** Tier structure to define. | Open questions: Stripe / RevenueCat / App Store; per-app or suite-wide bundle; gated features (AI provider quotas, cloud sync, advanced video gen); receipt verification; family sharing; trial flow. Depends on **X-DB** for entitlement storage. |

---

## Load main (`/load/`)

**Cache:** `load-v17g7`. **Tip status spec:** `PLAN_LOAD_AI.md`,
`PLAN_IMAGE_PROMPT_v3.md`, `PLAN_BOOK_TO_VIDEO.md`,
`MEDIA_MODULE_SPEC.md`, `LOAD_FEATURES.md`, `LOAD_MARKETING.md`.

### Pending
- **Advanced AI video generation** &mdash; see **X-VIDEO-AI**. Captured 2026-05-06 as VERY IMPORTANT. Cloud video provider chain, prompt-builder integration, no-false-positive output verification, video-specific export receipts. Current Verse-to-Video / Reel Composer tools are on-device WebM composers and do not satisfy this.
- **Sound &amp; Atmosphere Engine** &mdash; see **X-AI-AUDIO**. Captured 2026-05-07 as VERY IMPORTANT (`inbox/Load Main AI Addendum.docx`). Peer of X-VIDEO-AI. Real audio for animated scenes &mdash; SFX / ambience / music / crowd / laughter / weather / footsteps / environment / music cues / narration. MVP path: silent video + separate generated audio + scene attachment. Adds 14 new scene fields, 10 audio status labels, 5 chat-card types, and stage-gated build (prompt extraction &rarr; separate gen &rarr; layered playback &rarr; FFmpeg.wasm muxing &rarr; embedded audio). Output proof rules: never claim audio unless real playable file/blob/URL exists.
- **Full production database** &mdash; see **X-DB**. Captured 2026-05-06 as VERY IMPORTANT. Cross-device sync replacing per-device IndexedDB-only state. Auth + conflict resolution + GDPR delete still to be designed.
- **Subscription system** &mdash; see **X-SUBS**. Captured 2026-05-06 as VERY IMPORTANT. Paid tiers across the suite. Gated features list still to be agreed; depends on **X-DB** for entitlement storage.
- **Load AI Tier 14 / 18-fallback add-ons** — see X-AI-14 (the core X-AI-CORE is **shipped** in v17dq–v17dy; only the Glam-parity layer remains).
- **Piper TTS Stage 1 unblock + Stage 2 rollout** — see X-PIPER. Stage 1 shipped but not playing; blocked on the play() error text from the user. Resilience panel (Part 9) shipped in v17er gives an in-app diagnostic + recovery path.
- **LOAD-ECO acceptance test pass** (Build Plan Part 13 + Load_Main_Claude_Handoff_Report Section 18). The 11 priority items from the handoff report are shipped in v17fx–v17g6 with `LOAD_MAIN_HANDOFF_FINAL_REPORT.md` listing what's auto-verified vs what still needs user verification on iPad. Parts 1, 2, 3, 14-17 of the earlier Load Main Next Build Plan shipped in v17eq. Parts 4, 7, 9 + Book-to-Video wiring shipped in v17er. Parts 5, 6, 8, 10 shipped in v17es.

### Pending — closed this session
- **Browser mask editor (X-AI-MASK)** — shipped v17ew as `load/tools/mask-editor.html`.
- **Character Consistency module (X-CC)** — shipped v17ex as `load/tools/character-bible.html` wrapping `load/book-video/character-bible.js`.

### Recently done (this session, 2026-05-06 — Handoff Report final verification)
- **v17g7 &mdash; Sections 18 + 19 final report**:
  - New file `LOAD_MAIN_HANDOFF_FINAL_REPORT.md` at the repo root: closing artifact for the eleven priority items (v17fx-v17g6). Each Section 18 acceptance row marked **VERIFIED**, **READY FOR USER VERIFICATION**, or **NOT DONE** per the report&apos;s rule against false-positive completion claims. Section 19&apos;s 15 confirmation items answered with the smoke-test commands and observed output that prove each.
  - `MASTER_BACKLOG.md` Pending block cleaned up: items 2 (X-AI-MASK) and 3 (X-CC) moved to a new &quot;Pending — closed this session&quot; sub-block citing the v17ew / v17ex versions where they shipped; LOAD-ECO row updated to point at the new final-verification report.
  - Cache `load-v17g6` -&gt; `load-v17g7`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Handoff Report Part K: Sample test projects)
- **v17g6 &mdash; Part K samples tightened to spec**:
  - `load/tools/samples.html` already shipped all nine sample types from Section 16 (HTML, PWA ZIP, EPUB, PDF, image, audio, video, LoadStudio package, digital book PWA), each with the four required actions Open / Test / Export / Reset, all generated on-device with no upload required.
  - Renamed the per-sample **Reset** button to **Reset sample** to match the spec wording exactly.
  - Tightened the HTML-sample preview iframe to `sandbox=&quot;allow-scripts&quot;` only with `referrerpolicy=&quot;no-referrer&quot;`, removing `allow-same-origin` per Section 14 / Part I now that the strict default is the rule everywhere.
  - Cache `load-v17g5` -&gt; `load-v17g6`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Handoff Report Part J: Ecosystem routing)
- **v17g5 &mdash; Part J ecosystem routing aligned to spec**:
  - `load/tools/ecosystem-router.html` already surfaced five categories (HTML/PWA, Books, Media, LoadStudio package, LoadPlay prep) with the report&apos;s required actions.
  - Renamed the HTML/PWA action **Export Standalone PWA** -&gt; **Build Standalone PWA ZIP** to match Section 15 wording exactly.
  - Re-pointed **Prepare for LoadPlay** (HTML/PWA bucket) and **Generate Publish Package** (LoadPlay-prep bucket) to `loadstudio-validator.html` &mdash; that is now the canonical home of those flows since item 6 wired the seven required actions there.
  - Tightened tooltips so each action explains the destination button to tap inside the next tool.
  - All five spec action sets are reachable per the report:
    - **HTML/PWA:** Preview Sandboxed, Repair Manifest, Repair Service Worker, Build Standalone PWA ZIP, Prepare for LoadStudio, Prepare for LoadPlay.
    - **Books / documents:** Open Reader, Convert to Digital Book Project, Export EPUB, Export PDF, Export Standalone Book PWA, Send to LoadStudio as Source Material (plus an extra **Validate Book PWA** retained as a bonus).
    - **Media:** Open Player, Add to Project, Send to LoadStudio.
    - **LoadStudio package:** Open as Viewer, Open as Editable Project, Validate Package, Repair Package, Export Fixed Package, Prepare for LoadPlay.
    - **LoadPlay prep:** Validate Rights, Validate Safety, Generate Publish Package, Export Publish Report.
  - Cache `load-v17g4` -&gt; `load-v17g5`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Handoff Report Part I: Safer Sandbox Preview)
- **v17g4 &mdash; Part I strict-by-default sandbox + Trust Package flow**:
  - **`load/index.html`** viewer iframe defaults are now strict per Section 14: `sandbox=&quot;allow-scripts&quot;` with `referrerpolicy=&quot;no-referrer&quot;`. The previous broad permission set (`allow-same-origin allow-forms allow-popups allow-modals allow-storage-access-by-user-activation`) is no longer the default.
  - **`load/load.js`** ships the Trust Package flow:
    - Per-app trust state stored in `localStorage` under `load_trust_apps_v1`.
    - `applyViewerSandbox(app)` sets the iframe&apos;s sandbox tokens to `STRICT_SANDBOX` (allow-scripts only) or `TRUSTED_SANDBOX` (full broad set) based on the app&apos;s trust flag, called immediately before each viewer src navigation.
    - New **shield-icon Trust button** injected into the viewer top bar. Tapping it shows the report&apos;s exact warning copy: &quot;This package may access browser storage, submit forms, open popups, or communicate with external services. Only trust files you created or fully reviewed.&quot; On confirm, trust is granted, the button turns amber, and the iframe reloads with `TRUSTED_SANDBOX`. Tap again to revoke.
    - Three modes from Section 14 are reachable: **Strict Sandbox** (default), **Trusted Preview** (after Mark Package Trusted confirm), and **Blocked Preview** (existing &quot;Hide controls&quot; / closed-viewer state).
  - **`load/tools/safety-rights.html`** sandboxed-preview block defaults to strict. The previous &quot;Reload as strict&quot; toggle was inverted into the spec wording: a **Mark Package Trusted** button shows the same warning text and grants `allow-scripts allow-same-origin allow-forms allow-popups`; a **Revoke trust** button takes it back to strict.
  - Cache `load-v17g3` -&gt; `load-v17g4`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Handoff Report Part H: Rights metadata validator)
- **v17g3 &mdash; Part H rights validator shipped as a reusable library**:
  - New file `load/lib-rights-validator.js` exposes `window.LoadRightsValidator.validate(rights)` returning the spec-shaped envelope `{ valid, errors, warnings, blocksPublish }` per Section 13 / Part H.
  - **Eight-value enum** for both `license` and per-asset `status`: `user-owned`, `public-domain`, `licensed`, `platform-original`, `user-generated`, `user-recorded`, `third-party-licensed`, `unknown`. Values outside the enum produce errors.
  - **Required fields** (errors): `owner`, `license`, `sourceMaterial`, `assetDeclarations` (must be array). Each declaration must have `asset` + valid `status`.
  - **Warnings**: empty `notes` (recommended for legal clarity); `license === 'unknown'`; any asset with `status === 'unknown'`.
  - **`blocksPublish` flag** is true when errors exist OR `license` is `unknown` OR any asset is `unknown`. Wired into the LoadStudio validator&apos;s **Prepare for LoadPlay** action so unresolved rights actually block publish-prep per the report.
  - Wired callers: `load/tools/safety-rights.html` and `load/tools/loadstudio-validator.html` now delegate their inline `validateRights` to the library (with a tiny fallback if the lib fails to load).
  - `load/sw.js` SHELL list now includes `lib-rights-validator.js` for offline.
  - Cache `load-v17g2` -&gt; `load-v17g3`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Handoff Report Part G: LoadStudio Package Validator)
- **v17g2 &mdash; Part G LoadStudio package validator aligned to spec**:
  - `load/tools/loadstudio-validator.html` upgraded to the spec-shaped envelope: `{ valid, status, missingFiles, missingFolders, warnings, errors }` per Section 12 / Part G. Required files (11) and required folders (6) lists already matched the report; the report envelope is now the canonical return shape on `lastReport`, alongside the existing detailed breakdown.
  - Replaced the local regex safety scan with `window.LoadSafetyScanner.scanZip()` so every Load tool that scans uses the same patterns.
  - **Seven required UI actions wired** per Section 12:
    - **Open as Viewer** &mdash; renders `index.html` in a strict sandbox iframe (`sandbox=&quot;allow-scripts&quot;`, `referrerpolicy=&quot;no-referrer&quot;`).
    - **Open as Editable Project** &mdash; emits the package as a Blob and instructs the user to import via Load main.
    - **Validate Package** &mdash; re-runs the validator on the in-memory ZIP (useful after Repair).
    - **Repair Package** &mdash; inserts spec-shaped stubs for any missing required file (`index.html`, `manifest.json`, `service-worker.js`, `project.json`, `scenes.json`, `characters.json`, `rights.json`, `credits.json`, `styles.css`, `player.js`, `editor.js`) and `.keep` markers for missing required folders.
    - **Export Fixed Package** &mdash; downloads the (possibly repaired) ZIP.
    - **Prepare for LoadStudio** &mdash; blocks if any of the 4 hard-required files (`index.html`, `project.json`, `scenes.json`, `rights.json`) are missing; otherwise downloads the prepared ZIP and points the user to `../loadstudio/`.
    - **Prepare for LoadPlay** &mdash; blocks publish-prep if `rights.json` is missing or invalid (per Section 12 + Section 13); otherwise downloads the prepared ZIP and points to `../LoadPlay/`.
  - New &quot;Sandboxed viewer&quot; section in the report panel hosts the iframe.
  - Cache `load-v17g1` -&gt; `load-v17g2`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Handoff Report Parts C + D: One-Click PWA Builder + Live Build Steps)
- **v17g1 &mdash; Part C/D wired into the existing One-Click PWA Builder**:
  - Reorganized `BUILD_STEPS` in `load/tools/pwa-builder.html` to the report&apos;s exact 13 named steps from Section 9 / Part D: Reading project, Checking required files, Repairing missing files, Compressing images, Generating manifest, Generating service worker, Building offline cache, Validating paths, Running security scan, Running PWA readiness scan, Creating ZIP, Creating receipt, Download ready. Each row reports PASS / FAIL / WARN / SKIPPED with a detail string.
  - Internal sub-steps (icons, index, styles, app, data) now roll up under the spec-named parents via a `STEP_ALIAS` map &mdash; the build pipeline didn&apos;t need to be rewritten.
  - Added a new explicit **Building offline cache** step (Section 8 step 14 / Section 9 step 7) that counts the precache entries embedded in the generated `service-worker.js`.
  - Replaced the local regex security scanner with calls to `window.LoadSafetyScanner.scanContent()` so every Load tool that scans uses the same patterns from `lib-security-scanner.js`. The builder now uses the lib&apos;s `blocksExport` flag instead of a severity-name check, matching the Section 10 spec.
  - **ZIP integrity verification** added per Section 8 (&quot;do not show success unless a real file exists&quot;): after `JSZip.generateAsync({type:&apos;blob&apos;})`, the builder reads the first 4 bytes of the blob, refuses to mark the build as `pass` unless the size is &gt;200 bytes and the bytes are `PK\\x03\\x04`. Any failure throws with an exact reason and the build stops.
  - Receipt now built via `window.LoadReceipt.create()` (so the spec field shape applies) and persisted via `LoadReceipt.saveToLibrary()` after the verified ZIP exists. `security-report.json` bundled in the ZIP now uses the spec-shaped report from `LoadSafetyScanner` (with `tool`, `spec`, `generatedAt`, `blockExport`, `counts`, `blockers`, `issues`).
  - The `.html` head now imports both libs: `lib-security-scanner.js` and `lib-export-receipt.js` alongside the existing `lib-jszip.min.js`.
  - Cache `load-v17g0` -&gt; `load-v17g1`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Handoff Report Part F: Export Receipts)
- **v17g0 &mdash; Part F export-receipt library + tool aligned to the spec**:
  - `load/lib-export-receipt.js` already produced spec-shaped receipts (`exportType`, `fileName`, `fileSize`, `createdAt`, `includedFiles`, `missingFiles`, `warnings`, `manifestStatus`, `serviceWorkerStatus`, `rightsStatus`, `offlineStatus`, `safetyStatus`, `nextAction`). Added a `normalize()` adapter so legacy callers (chapter-splitter, epub-builder, audio-trim, &hellip;) that pass `{ tool, kind, files, sizeBytes, nextStep }` get mapped to the spec field names without breaking. Verified end-to-end via Node smoke test.
  - Added the report&apos;s three required actions as one-line API helpers on `window.LoadReceipt`:
    - `LoadReceipt.download(receipt)` &mdash; writes a per-receipt `.json` to disk
    - `LoadReceipt.copy(receipt)` &mdash; writes JSON to clipboard
    - `LoadReceipt.saveToLibrary(receipt)` &mdash; alias for `save()`, persists to `localStorage` under `load_receipts_v1`
  - Added `LoadReceipt.EXPORT_TYPES` constant with the seven canonical export types from Section 11 (Standalone HTML, PWA ZIP, LoadStudio Package, Backup, Diagnostic Report, LoadPlay Publish-Prep, Standalone Book PWA).
  - **`load/tools/export-receipts.html` updated** so each row shows the report&apos;s three required action buttons exactly: **Download Receipt**, **Copy Receipt**, **Save Receipt to Library** (plus a Remove admin button). Each button calls the matching `LoadReceipt.*` helper.
  - Cache `load-v17fz` -&gt; `load-v17g0`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Handoff Report Part E: Security Scanner)
- **v17fz &mdash; Part E security scanner shipped as a reusable library**:
  - New file `load/lib-security-scanner.js` exposes `window.LoadSafetyScanner` with three public functions: `scanFileName(name)`, `scanContent(name, text)`, `scanZip(zip, opts)`. Each issue follows the report&apos;s exact shape: `{ issue, file, severity, recommendedFix, blocksExport }`. Severity buckets: BLOCKER, HIGH, MEDIUM, LOW, INFO.
  - **BLOCKER patterns** (export blocked by default): executable files (.exe/.bat/.cmd/.sh/.app/.dmg/.msi/.com/.scr/.jar/.ps1/.vbs/.wsf), hidden `.env` files, hard-coded API keys / secrets / access tokens, credential / payment / API-key capture forms, malicious-looking redirects (location reassign + verify/login/account language nearby), path traversal (`../../etc|root|home|var|users|...`), dangerous external `<script src="https://...">`, service-worker network hijacking (fetch handler forwarding every request to an external URL).
  - **HIGH:** `javascript:` URLs, absolute local-filesystem paths (file:// / /Users/ / C:\\), very large embedded data: URLs (>150 KB).
  - **MEDIUM:** hidden iframes, tracking-pixel patterns, external stylesheets.
  - **LOW:** inline DOM event handlers, oversized files (>5 MB).
  - **INFO:** OS / VCS metadata files (.DS_Store / Thumbs.db / .git/).
  - `scanZip` returns `{ issues, byFile, blockers, blockExport, summary, securityReport }` where `securityReport` is the exact JSON shape the report calls for (Section 10), ready to bundle as `security-report.json` inside any export ZIP.
  - **`load/tools/safety-rights.html` rewired** to call the new library. Visible safety report panel groups issues by severity with per-issue file path, recommended fix, and BLOCKS EXPORT indicator. Headline reads &quot;BLOCKED — N blocker issue(s) prevent export&quot; whenever blockExport is true. New **Download security-report.json** button writes the spec-shaped JSON. Cache shell now includes the scanner library.
  - Cache `load-v17fy` -&gt; `load-v17fz`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Handoff Report Part B: Feature Verification Dashboard 43→45)
- **v17fy &mdash; Part B Feature Verification Dashboard upgraded to 45-test spec**:
  - Added test **#44 &quot;One-click Build Standalone PWA ZIP creates a real ZIP&quot;** in `load/tools/feature-tests.html`. Test loads JSZip on demand, builds a minimal PWA ZIP with all 7 required files (index.html, manifest.json, service-worker.js, styles.css, app.js, export-receipt.json, security-report.json), verifies the result is a `Blob` with size &gt; 200 bytes, and confirms the binary starts with the `PK\\x03\\x04` ZIP magic header. PASS only when all conditions hold.
  - Added test **#45 &quot;Security scan blocks unsafe ZIP export&quot;**. Self-test runs a curated set of 7 unsafe inputs (executable file, hidden `.env`, hard-coded API key, credential capture form, dangerous external script, path traversal, unsafe service-worker network hijacking) plus 2 benign inputs against the report&apos;s BLOCKER pattern list. PASS only when all unsafe inputs are flagged as BLOCKER and no benign input is falsely flagged.
  - Normalized JSON export to the report&apos;s exact result shape: `{ id, label, status, explanation, technicalDetail, suggestedFix, timestamp }` (Section 7 spec). Top-level report now also includes `tool`, `spec`, `generatedAt`, and a `summary` block.
  - Renamed the JSON export button label from &quot;Export JSON&quot; to **&quot;Export Diagnostic Report&quot;** to match the report&apos;s required button list (`Run All Tests`, `Export Diagnostic Report`, `Copy Report`, `Clear Report`). Plain-text export kept as a bonus.
  - Intro updated from &quot;43 verifications&quot; to &quot;45 verifications&quot; with a note that tests 44 and 45 ship live and run automatically.
  - Cache `load-v17fx` -&gt; `load-v17fy`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Handoff Report Part A: Copy cleanup + truth alignment)
- **v17fx &mdash; Part A copy cleanup (Load_Main_Claude_Handoff_Report Section 6 / Part A)**:
  - Removed user-facing instances of &quot;dyslexia&quot; / &quot;dyslexic&quot; across `load/index.html`, `load/load.js`, `load/load.css`, `load/install-local-ai.html`, `load/tools/help.html`, `load/tools/cat-books.html`, `load/tools/cat-media.html`, `load/tools/quote-card.html`, `load/tools/reading-level.html`, `load/tools/reel-composer.html`, `load/tools/sentence-reader.html`, `load/tools/speed-reader.html`. Replaced with the report&apos;s approved alternatives: &quot;Readability-friendly&quot;, &quot;Reading support font&quot;, &quot;readers&quot;, &quot;reader-friendly&quot;, &quot;readability needs&quot;.
  - Preserved internal identifiers per CLAUDE.md (CSS class `.dyslexic-font`, JS variable `dyslexiaFont`, function `toggleDyslexiaFont`, font family `OpenDyslexic`, font filenames `opendyslexic-*.woff2`).
  - Fixed AI / privacy / offline copy contradictions per Section 3.1: home-screen footer now reads &quot;The core workspace runs entirely on your iPad. No tracking, no accounts. Optional cloud AI providers run only when you enable them.&quot; Help-FAQ &quot;Is this really offline?&quot; rewritten to qualify offline claims with the optional-AI carve-out. AI Provider Status local-helper detail no longer claims &quot;No network&quot;.
  - Cache `load-v17fw` -&gt; `load-v17fx`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Image Metadata + HTML Linter)
- **v17fw &mdash; Image Metadata + HTML Linter**:
  - **Image Metadata:** new tool at `load/tools/image-metadata.html`. Drop a JPG / PNG / WEBP / GIF. Reads file headers and (for JPEG) parses EXIF: dimensions, megapixels, aspect ratio, format kind + signature, PNG bit depth + color type, EXIF Make/Model, capture date, exposure time, f-number, ISO, focal length, orientation, flash, GPS lat/lon/altitude. GPS warning recommends stripping before public sharing. **Strip metadata + download clean copy** re-encodes the image with no EXIF. Export JSON.
  - **HTML Linter:** new tool at `load/tools/html-linter.html`. Drop or paste HTML. 18 checks: doctype, `html lang`, meta charset, viewport, title, h1 count, image alt, empty links, anchor refs, meta description, manifest link, theme-color, apple-touch-icon, service worker registration, inline event handlers, external scripts, external stylesheets, form labels. Per-check PASS / WARN / FAIL with reason. Total / Pass / Warn / Fail summary. Export JSON.
  - cat-media.html and cat-build.html each gained one tile.
  - Workspace tile description bumped to 63 tools.
  - Help page updated with new TOC entries + per-tool cards.
  - Cache `load-v17fv` -&gt; `load-v17fw`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Audio Waveform + Date Formatter)
- **v17fv &mdash; Audio Waveform + Date Formatter**:
  - **Audio Waveform:** new tool at `load/tools/audio-waveform.html`. Drop audio, render its waveform as a static PNG. Settings for canvas width / height, foreground / background colors, background alpha (0% transparent for transparent PNG), padding. Four styles: Bars, Line, Filled, Mirror bars. Bar count adjustable. Live re-render on every option change. Useful for podcast covers, video thumbnails, asset placeholders.
  - **Date Formatter:** new tool at `load/tools/date-formatter.html`. Type any date, ISO timestamp, Unix seconds or milliseconds &mdash; or tap **Now**. Renders 15 outputs: ISO 8601 UTC, ISO 8601 local, Unix seconds, Unix ms, RFC 2822, locale long, locale short, date only, time only, day of week, day of year, week, quarter, custom pattern, relative. Custom-pattern tokens YYYY / YY / MMMM / MMM / MM / M / DDDD / DDD / DD / D / HH / H / mm / m / ss / s / SSS. Per-row Copy.
  - cat-media.html and cat-build.html each gained one tile.
  - Workspace tile description bumped to 61 tools.
  - Help page updated with new TOC entries + per-tool cards.
  - Cache `load-v17fu` -&gt; `load-v17fv`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Color Blindness Sim + Manuscript Stats)
- **v17fu &mdash; Color Blindness Simulator + Manuscript Stats**:
  - **Color Blindness Simulator:** new tool at `load/tools/color-blindness.html`. Drop a PNG / JPG / WEBP. Renders five panels side-by-side: Original, Protanopia, Deuteranopia, Tritanopia, Achromatopsia (full-severity LMS approximations). Severity slider mixes between original and simulation. Per-panel PNG download.
  - **Manuscript Stats:** new tool at `load/tools/manuscript-stats.html`. Drop or paste manuscript. Headlines: words / characters / sentences / paragraphs / chapters. Estimates: read at 220 + 300 wpm, audiobook at 150 wpm, print pages at 250-275 wpp. Sentence-length stats (avg, longest, shortest). Per-chapter word distribution as a bar chart. Top 5 longest and shortest sentences for line editing. JSON export.
  - cat-media.html and cat-books.html each gained one tile.
  - Workspace tile description bumped to 59 tools.
  - Help page updated with new TOC entries + per-tool cards.
  - Cache `load-v17ft` -&gt; `load-v17fu`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Audio Normalize + Lorem Ipsum)
- **v17ft &mdash; Audio Normalize + Lorem Ipsum**:
  - **Audio Normalize:** new tool at `load/tools/audio-normalize.html`. Drop audio (any browser-decoded format). Tool measures peak and RMS in dBFS and shows a waveform. Pick **Peak normalize** (loudest sample to target) or **RMS normalize** (perceived loudness to target), set target dBFS (default -1). Optional soft-clip ceiling at 0 dBFS prevents clipping when over-driving. Exports a 16-bit PCM WAV; shows after-waveform plus actual gain applied, new peak, new RMS.
  - **Lorem Ipsum:** new tool at `load/tools/lorem-ipsum.html`. Generate placeholder text in five flavors (Latin classic, English, Hipster, Pirate, Verse-style cadence). Pick output unit (Paragraphs / Sentences / Words) and count. Optional classic Latin opener. Each tap reshuffles. Copy or download `.txt`.
  - cat-media.html and cat-build.html each gained one tile.
  - Workspace tile description bumped to 57 tools.
  - Help page updated with new TOC entries + per-tool cards.
  - Cache `load-v17fs` -&gt; `load-v17ft`. Version badge bumped.

### Recently done (this session, 2026-05-06 — PWA Icon Set + Front Matter Builder)
- **v17fs &mdash; PWA Icon Set + Front Matter Builder**:
  - **PWA Icon Set:** new tool at `load/tools/pwa-icons.html`. Drop a square source image. Generates 15 standard sizes (16, 32, 48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512, 1024) plus optional **maskable** 192/512 with safe-zone padding. Toggles for rounded corners (iOS-style), fill-transparent-with-background, and emit-maskable-variants. Live preview grid; ZIP bundle download; one-tap copy of the manifest `icons` JSON array.
  - **Front Matter Builder:** new tool at `load/tools/front-matter.html`. Title page (title / subtitle / author / series), copyright (year / publisher / rights / license / ISBN), and optional dedication, epigraph (with attribution), preface, acknowledgments. Live print-style preview with proper typography. Output is a single `front-matter.md` ready to prepend to a manuscript or feed into EPUB Builder / Manuscript-to-Book.
  - cat-build.html and cat-books.html each gained one tile.
  - Workspace tile description bumped to 55 tools.
  - Help page updated with new TOC entries + per-tool cards.
  - Cache `load-v17fr` -&gt; `load-v17fs`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Audio Concat + Outline Writer)
- **v17fr &mdash; Audio Concat + Outline Writer**:
  - **Audio Concat:** new tool at `load/tools/audio-concat.html`. Drop multiple audio files (browser handles WAV / MP3 / M4A / OGG / WEBM via `decodeAudioData`). Each track shows duration, sample rate, channels, size; reorder up/down or remove. Settings: silence between tracks (sec), fade in, fade out. Output is a 16-bit PCM WAV at the device sample rate. Includes a built-in `&lt;audio&gt;` preview after merge.
  - **Outline Writer:** new tool at `load/tools/outline-writer.html`. Tab-aware textarea with smart indentation: Tab indents and adds a bullet, Shift+Tab outdents, Enter on a bulleted line keeps the level, Enter on an empty bullet outdents. Live Markdown preview on the right. **Normalize bullets &amp; indent** rewrites the outline to a consistent style. **Convert to numbered** swaps bullets for per-level `1.`, `2.`, &hellip;. Download `.md` or copy.
  - cat-media.html and cat-books.html each gained one tile.
  - Workspace tile description bumped to 53 tools.
  - Help page updated with new TOC entries + per-tool cards.
  - Cache `load-v17fq` -&gt; `load-v17fr`. Version badge bumped.

### Recently done (this session, 2026-05-06 — EPUB to Text + CSV Viewer)
- **v17fq &mdash; EPUB to Text + CSV Viewer**:
  - **EPUB to Text:** new tool at `load/tools/epub-to-text.html`. Drop an `.epub` file (a ZIP). Parses `META-INF/container.xml`, finds the OPF package, walks the spine in publication order, decodes each XHTML chapter to plain text and to Markdown. Shows metadata (title, author, language, chapter count, total words) and per-chapter word counts. Three downloads: combined `.txt`, combined `.md` (with `## Chapter` headings), or per-chapter ZIP with manifest. Auto-saves an export receipt.
  - **CSV Viewer:** new tool at `load/tools/csv-viewer.html`. Drop or paste CSV / TSV / pipe-delimited / semicolon-delimited. Auto-detect delimiter, header-row toggle, RFC-style quoted fields with embedded commas. Sortable columns (numeric vs text auto-detect), live filter input, stats card. Export filtered rows as CSV / JSON or copy as a Markdown table.
  - cat-books.html and cat-build.html each gained one tile.
  - Workspace tile description bumped to 51 tools.
  - Help page updated with new TOC entries + per-tool cards.
  - Cache `load-v17fp` -&gt; `load-v17fq`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Markdown TOC + Text Encoder)
- **v17fp &mdash; Markdown TOC + Text Encoder**:
  - **Markdown TOC:** new tool at `load/tools/markdown-toc.html`. Drop or paste Markdown. Detect ATX headings (#, ##, &hellip;) and Setext headings (=, -). Choose min/max levels, list style (-, *, numbered), indent (2/3/4 spaces or tab). Toggles for GitHub-style anchor links, hierarchical numbering (1, 1.1, &hellip;), skip-headings-inside-fenced-code. **Insert at top of source** prepends a `## Table of Contents` block ready to ship.
  - **Text Encoder:** new tool at `load/tools/text-encoder.html`. Five tabs: Base64, URL, HTML entities, Hex (UTF-8), Slug. Encode/decode toggles (Slug is encode-only). Per-format options (component vs URI, named vs numeric entities, space-separated bytes, slug separator). Live two-way conversion as you type, swap input/output, copy result.
  - cat-books.html and cat-build.html each gained one tile.
  - Workspace tile description bumped to 49 tools.
  - Help page updated with new TOC entries + per-tool cards.
  - Cache `load-v17fo` -&gt; `load-v17fp`. Version badge bumped.

### Recently done (this session, 2026-05-06 — HTML to Markdown + Image Compare)
- **v17fo &mdash; HTML to Markdown + Image Compare**:
  - **HTML to Markdown:** new tool at `load/tools/html-to-markdown.html`. Drop or paste HTML; convert to clean Markdown. Supports headings (h1-h6), paragraphs, bold / italic / strikethrough, links, images, ordered + unordered lists with nesting, blockquotes, inline code, fenced code blocks (with language), horizontal rules, tables (basic). Asterisk vs underscore style toggle, ATX-closed-headings toggle, body-only toggle. Copy or download .md.
  - **Image Compare:** new tool at `load/tools/image-compare.html`. Drop image A and B. Four modes: slider left/right, slider up/down, side-by-side, pixel-difference. The slider has a draggable round handle (mouse + touch). Difference mode reports the percentage of changed pixels. Mismatched dimensions warn the user and recommend Image Resize first.
  - cat-books.html and cat-media.html each gained one tile.
  - Workspace tile description bumped to 47 tools.
  - Help page updated with new TOC entries + per-tool cards.
  - Cache `load-v17fn` -&gt; `load-v17fo`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Palette Generator + Checksum)
- **v17fn &mdash; Palette Generator + Checksum**:
  - **Palette Generator:** new tool at `load/tools/palette-generator.html`. Pick a base color (picker / hex / random). Generates six harmony schemes: monochromatic (5 lightness steps), analogous (3 hues), complementary (2), split complementary (3), triadic (3), tetradic (4). Tap any swatch to copy hex. Export the full palette as JSON or as a `:root` CSS-variables block. Pairs with the existing Palette Extractor (which extracts from an image; this one synthesizes from one base color).
  - **Checksum:** new tool at `load/tools/checksum.html`. File-mode drop or text-mode paste. Computes SHA-1 / SHA-256 / SHA-384 / SHA-512 in parallel via `crypto.subtle.digest`. Per-row Copy buttons. **Verify** field accepts an expected hash and reports MATCH (with the algorithm) or NO MATCH against all four computed hashes. Useful for confirming a downloaded asset is intact.
  - cat-media.html and cat-build.html each gained one tile.
  - Workspace tile description bumped to 45 tools.
  - Help page updated with new TOC entries + per-tool cards.
  - Cache `load-v17fm` -&gt; `load-v17fn`. Version badge bumped.

### Recently done (this session, 2026-05-06 — JSON Formatter + Image Filter)
- **v17fm &mdash; JSON Formatter + Image Filter**:
  - **JSON Formatter:** new tool at `load/tools/json-formatter.html`. Paste / load file / paste-from-clipboard JSON, get **valid** / **invalid** status with line + column on errors. Pretty-print with 2 spaces, 4 spaces, or Tab; toggle alphabetical key sort; minify; validate. Stats: byte size, objects, arrays, keys, strings, numbers. Copy or download `.json`.
  - **Image Filter:** new tool at `load/tools/image-filter.html`. Drop a PNG / JPG / WEBP. Eight live sliders: brightness, contrast, saturation, hue rotate, blur, sepia, grayscale, invert. Nine one-tap presets (Black &amp; white, Sepia classic, Warm, Cool, Vintage, Punchy, Soft, Invert, Reset). Export PNG / JPEG / WEBP with quality slider, or copy a PNG to the clipboard.
  - cat-build.html and cat-media.html each gained one tile.
  - Workspace tile description bumped to 43 tools.
  - Help page updated with new TOC entries + per-tool cards.
  - Cache `load-v17fl` -&gt; `load-v17fm`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Word Frequency + Diff Viewer)
- **v17fl &mdash; Word Frequency + Diff Viewer**:
  - **Word Frequency:** new tool at `load/tools/word-frequency.html`. Drop or paste a manuscript. Filter by minimum word length, optional stop-word skip (the / a / of / &hellip;), case folding. Top N selectable (10 / 25 / 50 / 100 / All). Bar chart + counts + percentage of kept tokens. Click any word to highlight every occurrence in the source preview pane below. Export CSV or JSON.
  - **Diff Viewer:** new tool at `load/tools/diff-viewer.html`. Paste old version (A) and new version (B). Line-by-line LCS diff (capped at 5000 lines per side). Counts of A lines, B lines, unchanged, added (+green), removed (-red). Toggles for ignore leading/trailing whitespace, ignore case, hide unchanged. Useful for spot-checking what Find &amp; Replace or Regex Tester actually changed.
  - cat-books.html and cat-build.html each gained one tile.
  - Workspace tile label corrected back to **Tools** (section heading stays as &quot;6. Workspace Tools&quot;); count bumped to 41.
  - Help page updated with new TOC entries + per-tool cards.
  - Cache `load-v17fk` -&gt; `load-v17fl`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Chapter Splitter + Regex Tester + Workspace Tools rename)
- **v17fk &mdash; Chapter Splitter + Regex Tester**:
  - **Chapter Splitter:** new tool at `load/tools/chapter-splitter.html`. Drop a TXT / Markdown / HTML manuscript or paste text; pick detection mode (Markdown headings, &quot;Chapter N&quot; lines, ALL-CAPS, blank-line gaps); pick output format (.md or .txt). Tap **Detect chapters** to preview a numbered list with per-chapter word counts; tap **Build ZIP** to download a bundle with one file per chapter (named `01-slug.md`) plus an `index.txt` manifest. Saves an export receipt.
  - **Regex Tester:** new tool at `load/tools/regex-tester.html`. Type a pattern; toggle flags (g, i, m, s, u, y); paste sample text; live highlights + capture-group list; replacement preview with `$1`, `$2`, etc.; one-tap **Apply** writes the replacement back into the test text. Common-pattern presets (URL, Email, US phone, ISO date, hex color, blank line, multi-space, proper name, Markdown heading, quoted string).
  - Workspace Section 6 renamed from &quot;Tools&quot; to **Workspace Tools** (heading + tile label + landing-page title + category-page back-link text). Tile description bumped from 37 to 39 tools.
  - cat-books.html and cat-build.html each gained one tile.
  - Help page updated with new TOC entries + per-tool cards.
  - Cache `load-v17fj` -&gt; `load-v17fk`. Version badge bumped.

### Recently done (this session, 2026-05-06 — Tools landing + 5 category pages)
- **v17fj &mdash; Section 6 split into its own page hierarchy**:
  - Workspace hub Section 6 collapsed from 37 tiles into a single **Tools** tile that opens `load/tools/index.html`.
  - New landing page `load/tools/index.html` shows five large category boxes: **Media** (10 tools), **AI** (5), **Books &amp; writing** (8), **Build &amp; validate** (10), **Logs &amp; routing** (4). Each box opens its own page.
  - New category pages: `load/tools/cat-media.html`, `load/tools/cat-ai.html`, `load/tools/cat-books.html`, `load/tools/cat-build.html`, `load/tools/cat-logs.html`. Each lists only its own tiles using the same dark workspace card styling.
  - All 37 tiles preserved with their existing onclick targets; only the host pages changed.
  - Cache `load-v17fi` -&gt; `load-v17fj`. Version badge bumped.

### Recently done (this session, 2026-05-06 — workspace tile sub-headings)
- **v17fi — Workspace Section 6 grouped by category**:
  - Section 6 renamed from &quot;Build &amp; validate&quot; to &quot;Tools&quot; and split into five sub-headings: **Media** (10 tiles), **AI** (5), **Books &amp; writing** (8), **Build &amp; validate** (10), **Logs &amp; routing** (4). All 37 tiles preserved; only the order + headings changed.
  - New CSS class `.ws-subhead` in `load/load.css` for the sub-heading rows (small uppercase muted-color label).
  - Cache `load-v17fh` -&gt; `load-v17fi`. Version badge bumped.

### Recently done (this session, 2026-05-06 — EPUB builder + find-and-replace)
- **v17fh — EPUB Builder + Find &amp; Replace**:
  - **EPUB Builder:** new tool at `load/tools/epub-builder.html`. Drop a manuscript file (TXT / Markdown / HTML) or paste text. Same chapter-detection options as Manuscript-to-Book (Markdown headings, &quot;Chapter N&quot; lines, ALL-CAPS lines, blank-line gaps, single-chapter). Inputs: title, author, language, optional publisher, optional description, optional cover image. Output: valid EPUB 3 — `mimetype` (STORE compression, first entry), `META-INF/container.xml`, `OEBPS/content.opf` with dc:identifier (UUID v4) + dc:title + dc:creator + dc:language + dcterms:modified, `OEBPS/toc.ncx` (legacy NCX), `OEBPS/nav.xhtml` (EPUB 3 nav with `epub:type=&quot;toc&quot;`), `OEBPS/styles.css`, per-chapter `OEBPS/ch{N}.xhtml`, optional `OEBPS/cover.{ext}` with `properties=&quot;cover-image&quot;`. Auto-saves a Part 5 export receipt.
  - **Find &amp; Replace:** new tool at `load/tools/find-replace.html`. Drop a text file or paste a manuscript. Add multiple find/replace rules; per-rule toggles for case-insensitive, whole-word, regex. One-tap &quot;Common typos preset&quot; injects ten cleanup rules (extra space before punctuation, em-dash conversion, ellipsis, smart quotes). Live diff preview using red-strikethrough + green-add markup. Per-rule replacement counts. Undo restores the prior text. Export as `.txt` or copy to clipboard. Live word + character stats.
  - Help page updated with new TOC entries + per-tool cards.
  - Workspace hub Section 6 now has 37 tiles.
  - Cache `load-v17fg` -> `load-v17fh`. Version badge bumped in `load/load.js`.

### Recently done (this session, 2026-05-05 — cover designer + markdown preview)
- **v17fg — Cover Designer + Markdown Preview**:
  - **Cover Designer:** new tool at `load/tools/cover-designer.html`. Visual book-cover composer. Format presets: KDP 6x9 (1600x2400), KDP 5x8 (1500x2400), Square 2000, eBook 1600x2560, Audible 3000x3000, custom. Title / subtitle / author / series banner; per-element font (Cinzel / Playfair / Bebas Neue / Atkinson / Inter / Georgia), size, color, italic, position (top / center / bottom). Background: solid color, two-stop gradient, or image with adjustable dim + vignette. Frame: none / thin / double / ornament corners. Live canvas render. Export JPEG / PNG / WEBP with quality slider, or Copy image to clipboard.
  - **Markdown Preview:** new tool at `load/tools/markdown-preview.html`. Inline pure-JS Markdown parser (no external library) supporting headings (#-######), Setext h1/h2, paragraphs, bold (`**` / `__`), italic (`*` / `_`), strikethrough (`~~`), inline code, code fences (with language tag), bulleted + ordered lists, blockquotes, horizontal rules, tables with alignment, links, images. Live two-pane render with Atkinson Hyperlegible body font. Export to complete styled HTML document, copy inner HTML, or download .md source.
  - Help page updated with new TOC entries + per-tool cards.
  - Workspace hub Section 6 now has 35 tiles.
  - Cache `load-v17ff` -> `load-v17fg`. Version badge bumped in `load/load.js`.

### Recently done (this session, 2026-05-05 — reading level + speed reader)
- **v17ff — Reading Level Analyzer + Speed Reader (RSVP)**:
  - **Reading Level Analyzer:** new tool at `load/tools/reading-level.html`. Drop TXT / Markdown / HTML or paste text. Computes word count, sentence count, average sentence length, syllables-per-word (basic English heuristic), reading time @ 220 wpm, Flesch Reading Ease (with school-grade label), Flesch-Kincaid grade level. Lists the ten hardest sentences (highest per-sentence grade) for targeted rewriting. Color-coded PASS / WARN / FAIL cards. JSON copy. Atkinson Hyperlegible body font in the textarea.
  - **Speed Reader (RSVP):** new tool at `load/tools/speed-reader.html`. Rapid Serial Visual Presentation: one word at a time at the focus point, pivot letter highlighted in accent color (Bionic Reading style). Adjustable WPM 80-700, word size 48-100 px, background tint (Dark / Cream / Yellow / Blue). Pause-on-punctuation modes (off / 1.6x / 2.5x). Skip-empty-tokens toggle. Step buttons (+/- 1, +/- 10) and arrow-key shortcuts. Spacebar play / pause. Progress bar.
  - Help page updated with new TOC entries + per-tool cards.
  - Workspace hub Section 6 now has 33 tiles.
  - Cache `load-v17fe` -> `load-v17ff`. Version badge bumped in `load/load.js`.

### Recently done (this session, 2026-05-05 — reel composer + contrast checker)
- **v17fe — Reel Composer + Color Contrast Checker**:
  - **Reel Composer:** new tool at `load/tools/reel-composer.html`. Drop scene-cards JSON from Verse to Video. Per-scene image + audio attachments. Render combines: per-scene Ken-Burns motion (zoom-in / zoom-out / pan-left / pan-right / auto-alternate / off), verse text overlay (bottom / top / center / off), per-scene audio scheduled via `AudioBufferSourceNode` into a `MediaStreamDestination`, vignette, mood-gradient fallback when no image is attached. Canvas captured via `captureStream(fps)` + `MediaRecorder` with `vp9,opus` -> `vp8,opus` -> `webm` codec fallback. Live status with elapsed / total seconds + current scene index. Stop button mid-render. Output is a single WebM video.
  - **Color Contrast Checker:** new tool at `load/tools/color-contrast.html`. WCAG 2.1 relative-luminance ratio between any two colors. Live preview block with small / normal / large text samples. Pass/fail pills for AA normal, AA large, AAA normal, AAA large, UI/graphical. Swap, invert FG, invert BG, common-swatch row (shift+click for background). Auto-tune "Suggest a passing color" steps the foreground darker or lighter until AA normal-text passes (4.5:1).
  - Help page updated with new TOC entries + per-tool cards.
  - Workspace hub Section 6 now has 31 tiles.
  - Cache `load-v17fd` -> `load-v17fe`. Version badge bumped in `load/load.js`.

### Recently done (this session, 2026-05-05 — image resize + TTS voiceover)
- **v17fd — Image Resize & Crop + TTS Voiceover**:
  - **Image Resize & Crop:** new tool at `load/tools/image-resize.html`. Drop image (max 8192 px). Presets: Square 1080, Portrait 1080x1350, Story 1080x1920, Landscape 1920x1080, KDP cover 1600x2560, Thumbnail 512, PWA icons 192 / 512, Custom WxH, Scale-by-percent. Three fit modes: Cover (crop edges), Fit (letterbox with picker color), Stretch. PNG / JPEG / WEBP output with quality slider + optional 3x3 unsharp-mask sharpening pass. Source + output side-by-side preview, 64-megapixel memory guard.
  - **TTS Voiceover:** new tool at `load/tools/tts-voiceover.html`. Pick browser voice / rate / pitch, type a script, tap "Speak & record" — `speechSynthesis` plays through speakers while a parallel `MediaRecorder` captures it via the microphone. Stop button, in-place preview, download recorded (WebM / M4A / OGG / WAV depending on browser) plus optional WAV re-encode via `AudioContext.decodeAudioData` + 16-bit PCM RIFF write. Honest copy: "browser TTS doesn't expose its audio stream directly" + room-noise warning.
  - Help page updated with new TOC entries + per-tool cards.
  - Workspace hub Section 6 now has 29 tiles.
  - Cache `load-v17fc` -> `load-v17fd`. Version badge bumped in `load/load.js`.

### Recently done (this session, 2026-05-05 — sentence reader + audio trim)
- **v17fc — Sentence Reader + Audio Trim**:
  - **Sentence Reader:** new tool at `load/tools/sentence-reader.html`. Paste text, splits on `.!?` + hard line breaks. One-sentence cards with big text, Atkinson Hyperlegible default, adjustable size (20-64 px), background tint (Dark / Cream / Yellow / Blue), bionic-bold prefix (off / 1 / 2 / 3 letters). Browser TTS read-aloud per sentence with voice picker, speed select, optional auto-advance. Arrow keys + spacebar shortcuts.
  - **Audio Trim:** new tool at `load/tools/audio-trim.html`. Decodes any audio (WebM/OGG/MP3/M4A/WAV) via `AudioContext.decodeAudioData`. Live waveform render. Drag handles or type exact start / end seconds. Optional fade in / fade out. Preview the trimmed selection in-place. Export as universal 16-bit PCM WAV (RIFF byte-encoded inline; no library). Side-by-side info panel with file + duration + sample rate + channels.
  - Help page updated with new TOC entries + per-tool cards.
  - Workspace hub Section 6 now has 27 tiles.
  - Cache `load-v17fb` -> `load-v17fc`. Version badge bumped in `load/load.js`.

### Recently done (this session, 2026-05-05 — manuscript-to-book + quote cards)
- **v17fb — Manuscript to Book PWA + Quote Card Generator**:
  - **Manuscript to Book PWA:** new tool at `load/tools/manuscript-to-book.html`. Drop a TXT / Markdown / HTML manuscript (or paste text). Auto-detects chapters via Markdown `##`, "Chapter N" lines, ALL-CAPS title heuristic, or large blank-line gaps; mode selector overrides. Live preview of detected chapters with per-chapter word count. Builds a complete installable book PWA ZIP: `index.html` (sticky cover + sidebar nav + paragraph render), `manifest.json`, `service-worker.js` (precache + offline-first fetch), `styles.css` (Atkinson Hyperlegible body), `app.js`, `book-data.json` (chapters as paragraphs), `README.md`, generated 192/512 icons, optional rasterized cover at 800x1200 JPEG. Auto-saves a Part 5 export receipt.
  - **Quote Card Generator:** new tool at `load/tools/quote-card.html`. Compose a verse + attribution card. Five formats (Square 1080, Portrait 4:5, Story 9:16, Landscape 16:9, Header 3:1). Six fonts including Atkinson Hyperlegible (dyslexia-friendly default) and Playfair Display (serif). Three background modes: solid, two-stop gradient, image with adjustable dim + vignette. Italic toggle, color pickers, size slider, padding slider, optional border. Live canvas render. Export PNG / JPEG / WEBP with quality slider, or Copy image straight to clipboard.
  - Help page updated with new TOC entries + per-tool cards.
  - Workspace hub Section 6 now has 25 tiles.
  - Cache `load-v17fa` -> `load-v17fb`. Version badge bumped in `load/load.js`.

### Recently done (this session, 2026-05-05 — voice + subtitles)
- **v17fa — Voice Recorder + Subtitle Generator**:
  - **Voice Recorder:** new tool at `load/tools/voice-recorder.html`. `getUserMedia` + MediaRecorder. Live timer + analyser-driven level meter. Per-take playback (HTML5 `<audio controls>`), rename inline, download, delete. MIME negotiation across `audio/webm;codecs=opus`, `audio/webm`, `audio/mp4`, `audio/ogg;codecs=opus`, `audio/wav` (whichever the browser supports). Optional script panel for the read-along text. Files never leave the device.
  - **Subtitle Generator:** new tool at `load/tools/subtitle-generator.html`. Paste lines (one cue per line) or drop a Verse-to-Video scene-cards JSON / TXT / SRT / VTT. Three timing modes: fixed seconds per cue, words per minute, or per-cue durations from JSON. Start offset, inter-cue gap, minimum-seconds-per-cue clamps. Outputs both SRT and WebVTT side-by-side; preview toggle, copy, download for either format. Smart import: detects JSON shape (Verse-to-Video schema with `scenes[].verse` + `durationSeconds`), falls back to SRT/VTT cue extraction, finally to plain text.
  - Help page updated with new TOC entries + per-tool cards.
  - Workspace hub Section 6 now has 23 tiles.
  - Cache `load-v17ez` -> `load-v17fa`. Version badge bumped in `load/load.js`.

### Recently done (this session, 2026-05-05 — backup + palette)
- **v17ez — Project Backup + Palette Extractor**:
  - **Project Backup:** new tool at `load/tools/project-backup.html`. Counts library entries (IndexedDB `load-db` `apps` store), receipts, characters, acceptance results, AI provider statuses, other localStorage keys. Two backup modes: full (includes binary blobs from library) or lite (metadata only). Output is a single `load-backup-<mode>-<date>.zip` with `manifest.json`, `localStorage.json`, `library/apps-metadata.json`, and per-id binary files under `library/binary/`. Restore reads any backup ZIP and writes back to localStorage + IDB; matching ids are overwritten, existing items not in the backup are kept. Auto-saves a Part 5 export receipt. Live-counts panel + log of every operation.
  - **Palette Extractor:** new tool at `load/tools/palette-extractor.html`. Drop any image. Pixel-quantized to 24-step buckets, near-white and near-black filtered, returns the 8 most-prevalent colors with prevalence percentages. Per-swatch tap-to-copy hex. One-tap copy of: manifest `theme_color`, complete `:root` CSS palette block (`--c1` through `--c8` plus semantic `--primary` / `--accent` / `--bg` / `--ink`), or full JSON. Drops directly into the One-Click PWA Builder's theme color field.
  - Help page updated with new TOC entries + per-tool cards.
  - Workspace hub Section 6 now has 21 tiles.
  - Cache `load-v17ey` -> `load-v17ez`. Version badge bumped in `load/load.js`.

### Recently done (this session, 2026-05-05 — verse-to-video + prompt builder)
- **v17ey — Verse to Video (X-V2V) + AI Prompt Builder**:
  - **Verse to Video (X-V2V):** new tool at `load/tools/verse-to-video.html`. Paste verse, lyric, scripture line, or short passage; one line per scene. Hooks into Character Bible (consistency lock) + Style Library (global look). Per-line scene card output: verse, camera (heuristic from keywords like "gaze", "wide", "walk"), lighting (dawn/dusk/night/storm/firelight/garden inferred from text), mood (serene/somber/joyful/intense/tender/hopeful from cues), duration, aspect ratio, complete visual prompt. Starter buttons load Psalm 23 / haiku / short-story beat / lyric. Per-card Copy prompt, Copy all prompts, Export scene-cards JSON ready for the Book-to-Video engine. Closes the X-V2V row that originated as a Claude suggestion.
  - **AI Prompt Builder:** new tool at `load/tools/prompt-builder.html`. Six-layer composer: Subject + Character lock (from Bible) + Style (preset + custom) + Camera (13 toggleable chips) + Lighting (12 chips) + Composition (10 chips) + Negative prompt. Live-rendered preview block. Copy / Download .txt / Reset all.
  - Help page updated with new TOC entries + per-tool cards for Verse to Video and AI Prompt Builder.
  - Workspace hub Section 6 now has 19 tiles.
  - Cache `load-v17ex` -> `load-v17ey`. Version badge bumped in `load/load.js`.

### Recently done (this session, 2026-05-05 — character bible + image upscaler)
- **v17ex — Character Bible (X-CC) + Image Upscaler (X-AI-14c starter)**:
  - **Character Bible (X-CC):** new tool at `load/tools/character-bible.html`. Wraps the existing `load/book-video/character-bible.js` engine with a full UI. Per-character profile: name, age, physical description, skin tone, hair, voice profile, clothing rules, personality, master prompt, reference image (max 1.5 MB, kept on device). Auto-rendered consistency-lock prompt block via `CharacterBibleEngine.characterPrompt()`. Save / Copy character prompt / Download character JSON / Delete per character. Bulk Export all / Import JSON / Clear all. Profiles persist to `localStorage` `load_character_bible_v1`.
  - **Image Upscaler (X-AI-14c starter):** new tool at `load/tools/image-upscaler.html`. Drop an image (max 4096 px in either dimension). Pick 2x / 3x / 4x multiplier, PNG / WEBP / JPEG output, quality slider, optional 3x3 unsharp-mask sharpening pass (None / Light / Strong). Runs entirely in-browser via canvas with `imageSmoothingQuality: 'high'`. Memory guard rejects >64 megapixel outputs. Source + upscaled side-by-side preview. Honest copy: "Browser bicubic is fast and offline, but it cannot invent detail" with a handoff guide to Hugging Face Spaces (CodeFormer / GFPGAN / Real-ESRGAN) for AI-quality detail recovery.
  - Help page updated with new TOC entries + per-tool cards for Character Bible and Image Upscaler.
  - Workspace hub Section 6 now has 17 tiles.
  - Cache `load-v17ew` -> `load-v17ex`. Version badge bumped in `load/load.js`.

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
