# Session notes — 2026-05-06

## Plans for next session — read this first

When this file is loaded at session start, do these in order. Don't
start any of them until the user signs in and confirms.

### Step 0 — confirm Pages is current

User opens **`https://dssorit.github.io/ancient-covenant-scrolls/load/sw.js`**
in Safari on iPad. The page must read `var CACHE = 'load-v17g8';` (or
later). If it doesn't, Pages is stale — wait 60 s and reload. Don't
build anything else until the cache string matches `main` HEAD.

### Step 1 — iPad-side acceptance walkthrough

Eight handoff features are deployed but not yet user-tapped. Walk
the user through each, in this order, and mark each row in
`LOAD_MAIN_HANDOFF_FINAL_REPORT.md` Section 18 as **VERIFIED** only
when the user confirms a real PASS:

1. Open `/load/tools/feature-tests.html` → tap **Run All Tests** →
   confirm 45 rows render with PASS / FAIL / WARN / NOT TESTED.
2. Tap **Export Diagnostic Report** → confirm a real `.json` file
   downloads with the spec result shape.
3. Open `/load/tools/pwa-builder.html` → fill in the form → tap
   **Build Standalone PWA ZIP** → watch the 13-step live UI →
   confirm the final ZIP downloads and contains `index.html`,
   `manifest.json`, `service-worker.js`, `styles.css`, `app.js`,
   project data, icons, README.md, `export-receipt.json`,
   `security-report.json`.
4. Inspect the produced ZIP on iPad (long-press → Show Package
   Contents, or unzip on a desktop) and confirm both
   `export-receipt.json` and `security-report.json` are inside.
5. Open `/load/tools/safety-rights.html` → drop a known-bad ZIP
   (e.g. one with `.exe` or hard-coded `apiKey="sk-..."`) →
   confirm the headline reads `BLOCKED — N blocker issue(s)
   prevent export`.
6. Open `/load/tools/loadstudio-validator.html` → drop the
   sample LoadStudio package from `/load/tools/samples.html` →
   confirm validation envelope `{ valid, status, missingFiles,
   missingFolders, warnings, errors }` renders → tap **Prepare for
   LoadPlay** with `rights.json` removed → confirm it refuses.
7. On the home page + FAQ → confirm the words "dyslexia" /
   "dyslexic" are gone from user-facing text. (Internal class
   `.dyslexic-font` and font family `OpenDyslexic` are intentionally
   kept; they're not user-visible.)
8. Optional iPad-only: `Settings → Premium voice → Piper → Repair
   voice` → if Piper still fails to play, screenshot or copy the
   visible error text. That unblocks **X-PIPER Stage 1** which is
   waiting on this single piece of evidence.

Each row that the user confirms becomes a one-line entry in
`VERIFIED_LOG.md` (or wherever the project keeps verified-pass logs).

### Step 2 — decide on a discoverability patch (optional)

The above eight features live behind workspace navigation. Casual
auditors (including ChatGPT pointed at the home URL) won't find
them without entering the Workspace modal → Section 6 → Workspace
Tools → category → tool. If the user wants the spec features
visible directly on `/load/`, add a row of "Handoff features"
shortcut tiles to the home screen with direct links to:

- `tools/feature-tests.html` — Run All Tests
- `tools/pwa-builder.html` — Build Standalone PWA ZIP
- `tools/safety-rights.html` — Safety + Rights
- `tools/loadstudio-validator.html` — LoadStudio Validator
- `tools/samples.html` — Sample Test Projects

Bump cache when this lands. Don't ship without user OK — they
previously rejected one consolidation pass.

### Step 3 — start one of the four VERY IMPORTANT specs

User direction: four new pending items are flagged
**VERY IMPORTANT**. Pick exactly one to scope first based on user
preference:

- **X-VIDEO-AI — Advanced AI video generation.** Open scope to
  resolve before any code: which provider chain (Runway / Kling /
  Pika / Luma / Wan / SVD / AnimateDiff), key UI parity with the
  image side, video Output Receipt schema, no-false-positive
  verification of returned video files. Touches Load main
  (Verse-to-Video tool), LoadStudio (scene rendering), and
  `lib-export-receipt.js`.
- **X-AI-AUDIO — Sound & Atmosphere Engine.** Captured 2026-05-07
  via `inbox/Load Main AI Addendum.docx`. Peer of X-VIDEO-AI; sound
  is non-optional for movie/content creation. MVP path: silent
  video + separate generated audio attached to scene. Three sound
  paths (embedded / separate / prompt-fallback). Five chat card
  types (animation request, animation progress, audio generation,
  video result, audio result). Ten audio status labels (Audio
  embedded, Separate audio generated, Sound prompt saved, Audio
  provider needed, Silent video, Audio failed, Audio ready for
  scene, Audio ready for export, Audio muxing available, Audio
  muxing not available). Fourteen new scene fields including
  audioPrompt / sfxPrompt / musicPrompt / ambiencePrompt /
  voicePrompt / audio / music / sfx[] / audioStatus /
  audioProvider / audioOutputProof / audioEmbedded / audioMuxed /
  audioRightsStatus. Stage path: prompt extraction → separate gen
  → layered playback → FFmpeg.wasm muxing → embedded audio.
  Output proof: never claim audio unless real playable
  file/blob/URL exists.
- **X-DB — Full production database.** Open scope: vendor
  (Postgres / Firestore / Supabase), auth (Apple Sign-In / email
  magic link), conflict resolution, GDPR delete, per-app vs shared
  schema. Gates X-SUBS.
- **X-SUBS — Subscription system.** Open scope: Stripe /
  RevenueCat / App Store, per-app vs suite bundle, gated features,
  receipt verification, family sharing, trial flow. Don't start
  this before X-DB has a concrete plan — entitlements need
  somewhere to live.

Recommended order: capture the spec for **X-VIDEO-AI** and
**X-AI-AUDIO** together first (they share the production pipeline
and the addendum says video must not block waiting for embedded
audio), then **X-DB**, then **X-SUBS**.

### Step 4 — clear the five remaining Load main pending rows

These existed before tonight's work and are still open:

1. Load AI Tier 14 / 18-fallback add-ons (X-AI-14 Glam-parity layer)
2. Browser mask editor — **shipped v17ew, mark closed in backlog**
3. Character Consistency module — **shipped v17ex, mark closed in
   backlog**
4. Piper TTS Stage 1 unblock — depends on Step 1.8 above
5. LOAD-ECO acceptance test pass — depends on Step 1 above

Items 2 and 3 should be moved out of Pending into "Pending —
closed" (already done in v17g7 commit `69895ba`).

---

## Current state

- **Branch:** `claude/fix-session-sending-TVMbW`
- **Latest commit:** `8a1b124` (pushed to `main` and the feature branch)
- **Cache string on `main` HEAD:** `load-v17g8`  (verified via
  `curl raw.githubusercontent.com/.../main/load/sw.js`)
- **Working tree:** clean. No uncommitted changes.

## Built today

Eleven priority items from `inbox/Load_Main_Claude_Handoff_Report.zip`,
plus a remediation patch and a backlog capture:

| # | Section | Part   | Version | Headline |
|---|---------|--------|---------|----------|
| 1 | 6       | A      | v17fx   | Copy cleanup + AI/offline truth alignment |
| 2 | 7       | B      | v17fy   | Feature Verification Dashboard 43 → 45 tests, spec result shape |
| 3 | 10      | E      | v17fz   | `lib-security-scanner.js` (BLOCKER / HIGH / MEDIUM / LOW / INFO) |
| 4 | 11      | F      | v17g0   | Receipt library aligned to Section 11 + 3 spec actions |
| 5 | 8 + 9   | C + D  | v17g1   | One-Click PWA Builder live build steps + ZIP integrity check |
| 6 | 12      | G      | v17g2   | LoadStudio package validator + 7 required UI actions |
| 7 | 13      | H      | v17g3   | `lib-rights-validator.js` with 8-value enum + `blocksPublish` |
| 8 | 14      | I      | v17g4   | Strict-default sandbox + Trust Package flow |
| 9 | 15      | J      | v17g5   | Ecosystem routing aligned to spec wording |
| 10 | 16     | K      | v17g6   | Sample test projects (9 × 4 actions) |
| 11 | 18 + 19 | —      | v17g7   | `LOAD_MAIN_HANDOFF_FINAL_REPORT.md` |
| —  | —      | remediation | v17g8 | Three plain-text dyslexia mentions in FAQ panel patched |

## Outstanding / blocking — carry into next session

The user's audit (and ChatGPT's audit of the live site) flagged
that several handoff features were not visible from the home page.
They are deployed on `main` but live behind workspace navigation.
Carrying these forward as **awaiting iPad-side user verification**:

1. **Run All Tests** — at `/load/tools/feature-tests.html`. 45 tests,
   Run All Tests button id `run-all`. Verified present via
   `curl raw.githubusercontent.com/.../main/load/tools/feature-tests.html`.
2. **Build Standalone PWA ZIP** — at `/load/tools/pwa-builder.html`.
   Two occurrences of the spec-named button. Bundles
   `export-receipt.json` + `security-report.json` into every output.
3. **`export-receipt.json`** — written by `pwa-builder.html` line range
   that calls `zip.file('export-receipt.json', JSON.stringify(receipt, null, 2))`.
   Receipt object built via `LoadReceipt.create()` (spec field shape).
4. **`security-report.json`** — written by the same builder via
   `zip.file('security-report.json', JSON.stringify(securityReport, null, 2))`.
   Report object built from `LoadSafetyScanner.scanContent()` results.
5. **Rights validator** — `/load/lib-rights-validator.js`. All 8 enum
   values present (`user-owned`, `public-domain`, `licensed`,
   `platform-original`, `user-generated`, `user-recorded`,
   `third-party-licensed`, `unknown`). Used by both
   `tools/safety-rights.html` and `tools/loadstudio-validator.html`.
6. **`.loadstudio.zip` recognition** — `tools/loadstudio-validator.html`
   has `accept=".zip,.cinepwa,application/zip"` plus extension checks.
7. **`.cinepwa.zip` recognition** — same tool, same accept list.
8. **Prohibited reading-accessibility wording** — zero user-facing
   `dyslex*` matches remain on `main` (verified via Python regex
   sweep that excludes `OpenDyslexic` / `.dyslexic-font` internal
   identifiers; v17g8 fixed the last 3 mentions in the FAQ panel).

If the user's iPad still shows the old wording, that is GitHub Pages
serving a stale build. Pages typically lags `main` by 30-90 seconds.
Confirm by opening
`https://dssorit.github.io/ancient-covenant-scrolls/load/sw.js`
and looking for `var CACHE = 'load-v17g8';`.

## Pending / parked — five existing Load main rows + three new VERY IMPORTANT

Carrying forward verbatim (per user direction tonight):

1. **Load AI Tier 14 / 18-fallback add-ons** — see X-AI-14. Core
   X-AI-CORE shipped v17dq–v17dy; only the Glam-parity layer
   remains (face restoration, Real-ESRGAN, SiliconFlow, HF Spaces,
   image-to-video, AI Style Chat chrome).
2. **Browser mask editor** — see X-AI-MASK. Stale — shipped v17ew
   as `load/tools/mask-editor.html`.
3. **Character Consistency module** — see X-CC. Stale — shipped
   v17ex as `load/tools/character-bible.html` (wraps
   `load/book-video/character-bible.js`).
4. **Piper TTS Stage 1 unblock + Stage 2 rollout** — see X-PIPER.
   Stage 1 ships but won't play; blocked on the user reporting the
   visible play() error after tapping Repair voice. Stage 2
   (read-aloud across ACR Reader / Attain / Attain Jr / Study) is
   blocked on Stage 1.
5. **LOAD-ECO acceptance test pass** (Build Plan Part 13). Every
   part has a tool surface; the pass is opening each tool,
   confirming PASS/FAIL/WARN renders, running a sample export,
   saving a receipt, and checking it appears in the Receipts
   library.

Three new entries captured 2026-05-06 as **VERY IMPORTANT**:

6. **X-VIDEO-AI — Advanced AI video generation.** Real cloud-provider
   text/image/scene-to-video pipeline beyond the existing on-device
   WebM composers (Verse-to-Video, Reel Composer). Open scope: which
   provider chain (Runway / Kling / Pika / Luma / Wan / SVD /
   AnimateDiff), key UI parity, video Output Receipt schema,
   no-false-positive output verification.
7. **X-DB — Full production database.** Server-side state replacing
   per-device IndexedDB-only storage. Cross-device sync of Library,
   Notes, Bookmarks, Receipts, Rights, Character Bible, Subscription
   entitlements. Open scope: vendor (Postgres / Firestore /
   Supabase), auth (Apple Sign-In / email magic link), conflict
   resolution, GDPR delete, per-app vs shared schema.
8. **X-SUBS — Subscription system across the Load suite.** Paid
   tiers across Load main, Attain, Attain Jr, Study, LoadStudio,
   LoadPlay. Open scope: Stripe / RevenueCat / App Store, per-app
   vs suite bundle, gated features, receipt verification, family
   sharing, trial flow. Depends on X-DB for entitlement storage.

## Capability gaps in this session

- `dssorit.github.io` is unreachable from this sandbox (network
  policy). All deployed-state verification went through
  `raw.githubusercontent.com/DssOrit/ancient-covenant-scrolls/main/...`
  which IS reachable. That gives `main` HEAD content but cannot
  confirm Pages itself rendered the update — only the user's
  browser can.

## Today's commit log (oneline)

```
8a1b124 backlog: capture three VERY IMPORTANT pending items
5859cee Load v17g8: Patch three remaining user-facing dyslexia mentions
69895ba Load v17g7: Handoff Report Sections 18 + 19 — final verification
1d6dda5 Load v17g6: Handoff Report Part K — Sample test projects
968328a Load v17g5: Handoff Report Part J — Ecosystem routing aligned
69a9f64 Load v17g4: Handoff Report Part I — Safer Sandbox Preview
88235d6 Load v17g3: Handoff Report Part H — Rights metadata validator
2b5435c Load v17g2: Handoff Report Part G — LoadStudio package validator
31dae98 Load v17g1: Handoff Report Parts C + D — One-Click PWA Builder
31b23a7 Load v17g0: Handoff Report Part F — Export receipts aligned to spec
74d1d7f Load v17fz: Handoff Report Part E — Security scanner
571b9f2 Load v17fy: Handoff Report Part B — Feature Verification Dashboard 43→45
896aa95 Load v17fx: Handoff Report Part A — copy cleanup + truth alignment
```

## Backups

Created `backup/2026-05-06-v17g8` pointing at the verified-working
tip. Recovery: `git checkout backup/2026-05-06-v17g8`.
