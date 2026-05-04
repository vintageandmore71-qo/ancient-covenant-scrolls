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
| X-B2V | **Book-to-Video engine** — import book → text → scene cards → assets → Load timeline | `inbox/Load_Book_to_Video_Spec.zip` + `inbox/Load_Book_to_Video_Implementation.zip` → `PLAN_BOOK_TO_VIDEO.md` | **Pending — files dropped, not wired.** Code lives at `load/book-video/` (8 JS files + CSS + schemas). Not loaded by `load/index.html`. No "Book to Video" button in Load UI. | Per integration steps: add CSS link, 7 script tags, button + `window.LoadBookToVideo.open()` handler. Acceptance: TXT/HTML/PDF/EPUB → editable Scene Cards. |
| X-V2V | **Verse-to-Video** — turn ACR Study verses into visual simulations of the verse (clips that bring the words to life) | Originally a Claude suggestion (should have been on this list earlier — captured 2026-05-04 after user correction). ChatGPT prompt note also in `inbox/`. | **Not started.** | Source verses from `study/content/` JSON. Reuse Book-to-Video scene-card pipeline + character-bible engine + image generator. Per-verse output: 5–10 second clip. Will need image-to-video provider gate (see X-AI). |
| X-P2V | **Photo-to-Video** — single photo → 5s synthetic clip | Already partially implemented in LoadStudio Editing Bay (`pickAndOpen('image')` wraps a still in a `MediaRecorder` capture). | **Partial.** LoadStudio uses `canvas.captureStream()` + `MediaRecorder` to wrap a single image into a synthetic 5-second video. Works on iPad. | Needs: extension to AI-driven motion (Ken Burns auto-pan, parallax, image-to-video model when X-AI lands), reuse from Load main + Attain (verse cover → opening clip). |
| X-AI | **Load AI Image system + AI Style Chat** — chat-driven image generation, editing, masking, upscaling, image-to-video | `PLAN_LOAD_AI.md` + `PLAN_IMAGE_PROMPT_v3.md` + `inbox/Load_AI_Glam_Style_System_Research_and_Developer_Plan.zip` + `inbox/PLAN_LOAD_AI.md` (canonical) + `inbox/Load_AI_Free_Open_Source_Provider_and_Image_System_Documentation.pdf` + `inbox/Load_AI_Deeper_Workarounds_Addendum.pdf` + `inbox/load_ai_character_consistency_with_code.zip` | **Partial.** Provider lock list shipped in `load/load.js` v17dt-v17dy (HF Mistral / OpenRouter / Cerebras text-only-blocked; capability flags + filter; Test Keys diagnostic). | Pending Tier 14 items in `PLAN_LOAD_AI.md`: 14a curated style library (~50 styles), 14b face restoration (GFPGAN/CodeFormer), 14c Real-ESRGAN upscale, 14d SiliconFlow connector (FLUX.1 Kontext + image-to-video), 18-fallback external video-prompt panel (Runway/Kling/Pika/Luma/Wan). Plus mask editor (Canvas/Fabric/Konva), 7-layer chat-driven flow (chat input → classifier → prompt builder → mask editor → router → verifier → image-to-video). |
| X-CC | **Character Consistency** — lock face/era/wardrobe across scenes | `inbox/load_ai_character_consistency_with_code.zip` (reference modules) | **Pending.** Spec captured. Modules `provider-registry / character-memory / prompt-builder / output-verifier / image-router` not wired. | Same character JSON schema reused by Book-to-Video + LoadStudio Character Studio + Attain story illustrator. |
| X-VOICE | **Universal voice command bar** | `SUGGESTIONS_PARKED.md` (parked — review 2026-05-25) | Parked. | |
| X-KG | **Shared local knowledge graph (one IDB across apps)** | `SUGGESTIONS_PARKED.md` | Parked. | |

---

## Load main (`/load/`)

**Cache:** `load-v17el`. **Tip status spec:** `PLAN_LOAD_AI.md`,
`PLAN_IMAGE_PROMPT_v3.md`, `PLAN_BOOK_TO_VIDEO.md`,
`MEDIA_MODULE_SPEC.md`, `LOAD_FEATURES.md`, `LOAD_MARKETING.md`.

### Pending
- **Book-to-Video wiring** — see X-B2V above.
- **Load AI Image / AI Style Chat** — see X-AI above. Tier 14 a/b/c/d + 18-fallback + mask editor.
- **Character Consistency module** — see X-CC.
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

### Pending
- **AR-EMOJI** — premium icon parity pass (same as Attain v67 / Study v78). Not started.
- **AR-INTER** — Inter font in chrome.

### Recently done
- (no changes this session — root reader untouched since prior session)

---

## How new requests get added

When the user asks for something, add it to the appropriate
**Pending** block in this file. Reference the inbox source file (or
the date the user asked) so context is preserved.
