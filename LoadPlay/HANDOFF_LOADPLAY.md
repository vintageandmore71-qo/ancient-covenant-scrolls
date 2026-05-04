# LoadPlay — Build Handoff

Pick-up doc for the LoadPlay sub-app inside the
`DssOrit/ancient-covenant-scrolls` repo. Mirrors the Tier 0–5 backlog
in `PLAN_LOAD_AI.md` but focused only on LoadPlay so a future session
can pick up without scrolling the whole repo plan.

---

## Current state (updated 2026-05-04, tip 4826b1b)

- **Live tip on `main`:** `4826b1b` — "LoadStudio v37 + LoadPlay v32:
  Reset Page Zoom (Load Main pattern ported)".
- **Cache namespace:** `loadplay-v32` (`LoadPlay/sw.js`).
- **Stable backup branches:**
  - `backup/2026-05-02-loadplay-v19` → `ed355a7` (older snapshot)
  - `backup/2026-05-04-loadplay-v32` → `4826b1b` (current tip)
- Recovery: `git checkout backup/2026-05-04-loadplay-v32`.
- **Branch policy:** push every change to BOTH
  `claude/fix-session-sending-TVMbW` AND `main`. Pages serves from
  `main`. The branch-only push pattern from v8–v11 is the canonical
  invisibility bug — never repeat.
- **Pages URL:** `https://dssorit.github.io/ancient-covenant-scrolls/LoadPlay/`
- **Test Mode admin login:** username `Devtest1`, access key `*t3$tIt!`
  (SHA-256 hash `b75de7fc…60ee` lives in source; plaintext does not).

---

## Why LoadPlay lives inside the ACR repo

`ancient-covenant-scrolls` is the user's single-repo Load suite. Every
sub-app (`load/`, `attain/`, `attain-jr/`, `study/`, `LoadPlay/`,
`loadstudio/`, `GreatE/`) is a subfolder, and GitHub Pages serves them
all from `main` under one URL prefix. The root `index.html` is the ACR
Reader app, which is why the repo is named after ACR.

Pros of the current layout:
- Single Pages deployment, one repo to push, one CI configuration.
- Shared assets and shared documentation (`PLAN_LOAD_AI.md`,
  `HANDOFF.md`, session notes) sit beside every sub-app.
- Cross-app links (`../load/`, `../loadstudio/`) resolve cleanly.

Cons (worth flagging if you want to split later):
- The **root** `sw.js` (ACR Reader's service worker) used to intercept
  every path under the repo. As of commit `5ca615b` (2026-05-02) every
  sub-app folder is in the root SW's bypass list. If LoadPlay moves to
  its own repo this concern disappears.
- One CodeQL workflow, one repo size, one issue tracker for everything.

If you want LoadPlay in its own repo later: copy `LoadPlay/`, `data/`,
`assets/mock-users/`, and the relevant inbox docs to a fresh repo,
re-enable Pages there, update `manifest.json` `start_url` + `scope` if
needed (currently both are `./` so they're path-portable), and delete
the LoadPlay folder from this repo.

---

## What's already built (v8 → v26 summary)

| Version | What landed |
| --- | --- |
| v8  | Splash text dropped above CTAs; "Load" footer title |
| v9  | A2HS install banner + modal; Sign-in/up + 5-step tour; Creator Subscription tiers; Developer Lab gate; data-attr modal system |
| v10 | Topside menu reorganized into 6 build-plan groups (Viewer / Content / Creator / Safety / Developer / Platform) |
| v11 | Splash redesigned to match the user's mockup; streaming UI wrapped in `#lp-stream-view`; sidebar drawer fix |
| v12 | iPad-portrait drawer fix; legacy nav-item handler patched so it doesn't intercept v9 menu items |
| v13 | Top chip row = exact 18 user titles |
| v14 | Chip renames (Originals→Load Originals, PWA Originals→Thrillers, Creator Channels→Creators Originals) + Podcasts; SHA-256 dev gate |
| v15 | Real pages everywhere (Marketplace, Help, sidebar items); home feed after sign-in; splash feature popovers; emojis stripped; "channel" word stripped; copyright footer |
| v16 | A2HS icon mismatch fixed (regenerated every iOS size from real icon.png); centered hero overlay removed |
| v17 | Premium multi-row chip pages (later reverted in v18) |
| v18 | Reverted v17; restored loadplay2's original Shorts row + videoGrid; renderHome empty-state never shows |
| v19 | Chip + sidebar Content Section tap updates the page heading to the active label |
| v20 | Admin · Test Mode page (IndexedDB, mock-data engine, diverse SVG avatars, ACTIVE chip) |
| v21 | Faker-style names + bios + `@mock.test` emails; mock comments + Q&A; scenario presets; trending refresh; CSV export; randomuser.me opt-in; Production switch; demo-data disclaimer in footer |
| v22 | Pre-built LITE mock package shipped (500 real-portrait JPGs + demo-users.json + demo-activity.json); "Load Pre-Built Mock Package" button |
| v23 | Avatar 404 fallback; kids profile content filter; impersonation chip + Switch-back; analytics blocking flag; storage size + last-generated date in admin |
| v24 | Mock users visible site-wide: player creator avatar, topnav, Featured Creators strip, home-feed rails bound to demo-content.json (60 items, 17 types) |
| v25 | Mock-user portraits show on every video grid card and the player avatar without requiring LITE pack to be loaded into IndexedDB |
| v26 | Home button + topnav logo + toolbar Home icon now actually return to splash (resets `body.lp-streaming` / `body.lp-paging`) |

Every shipped version was pushed to both `main` and the feature branch.

---

## File structure (LoadPlay/)

```
LoadPlay/
├── index.html                 (single-file PWA; ~4500 lines)
├── sw.js                      (cache: loadplay-v26)
├── manifest.json              (PWA manifest)
├── icon.png                   (real source icon, 512×512)
├── load-play-splash-768w-compressed.jpg
├── icons/
│   ├── icon-72.png   icon-96.png   icon-120.png  icon-128.png
│   ├── icon-144.png  icon-152.png  icon-167.png  icon-180.png
│   ├── icon-192.png  icon-384.png  icon-512.png
├── js/
│   └── app.js                 (loadplay2 internal logic — DO NOT EDIT
│                                without explicit permission; user
│                                instruction "keep loadplay2 intact")
├── data/
│   ├── demo-users.json        (500 LITE members, 293 KB)
│   ├── demo-activity.json     (LITE activity, 1.3 MB)
│   └── demo-content.json      (60 mock content items, 17 types)
└── assets/
    └── mock-users/
        └── avatars/
            └── user_001.jpg … user_500.jpg
```

`index.html` ships three IIFEs at the bottom of `<body>`:
1. **Loadplay2 inline script** (lines ~1265–1810) — original loadplay2
   logic: video data, `renderHome`, `makeShortCard`, `makeVideoCard`,
   `openPlayer`, chip click handler, sidebar/bnav legacy handlers,
   detectLayout, install banner, online/offline.
2. **v9 IIFE** (~lines 1976–2825) — A2HS, Sign-in, Sign-up + tour,
   Creator subscription modal, Developer Lab gate, page system
   (`#lp-page` + `showPage`), home feed (`renderHomeFeed`), splash
   feature popover, bottom-nav delegation, splash/stream view swap.
   Exposes `window.__lpRunAct`, `__lpShowPage`, `__lpShowSplash`,
   `__lpShowStream`.
3. **v20+ IIFE** (~lines 3000+) — Admin · Test Mode: IndexedDB,
   Faker-style mock data engine, scenario presets, LITE loader,
   randomuser opt-in, Production switch, mock-creator hooks (player,
   topnav avatar, Featured Creators strip).

---

## Built since v26 (this session, 2026-05-04)

- **v28** — Avatar realism: per-user procedural variation everywhere a
  portrait renders (no more 100 identical avatars).
- **v29** — Splash hero fully visible (`object-fit:contain`,
  height:auto, gradient overlay hidden); cross-suite footer links
  pruned to Load-only (Main Load + LoadStudio).
- **v30** — Interactive guided tour (`#lp-v30-tour`): auto-runs on
  first visit, 8 steps, red `#ff5a5a` ring + card. "Replay site
  tour" link at top of `lp-footer-links`.
- **v31** — Install banner + How-to-install modal (Load Main pattern).
  Detects standalone PWA, only shows in Safari, persists dismiss in
  `lp_install_dismissed_v1`.
- **v32** — Reset Page Zoom auto-banner (`#lpZoomBanner`) + viewport
  meta now `user-scalable=yes`. `window.lpFixZoom` exposed for any
  other script to call. Triggered when `visualViewport.scale > 1.08`.

## What's still pending for LoadPlay

| ID | Item | Notes |
|---|---|---|
| LP-1 | **No interactive intro on Load Main** | Load Main has its own `#load-tour`. LoadPlay's new tour is independent. Cross-app tour continuity is not done. |
| LP-2 | **Creator dashboard data wiring** | Tour mentions Creator Studio but the dashboard tiles still render mock data. |
| LP-3 | **Tier 0–5 backlog below** | Pre-existing roadmap, see next section. |

## Backlog — Tier 0 → Tier 5

Tier 0 is shipped. Tiers 1–5 remain. Source-of-truth: `PLAN_LOAD_AI.md`
under "LoadPlay backlog (added 2026-05-02 — must complete before
launch)".

### Tier 0 — admin / test infrastructure (DONE in v20–v25)

- Admin · Test Mode area, gated by SHA-256 dev login
- Mock data engine in IndexedDB (schema v1, JSON Export/Import)
- Generate Members / Activity / Comments + Q&A buttons; presets
  25/100/500 + scenario presets (small/medium/large)
- Diverse SVG avatar generator + LITE pack with 500 real portraits
- Sign-in-as-Mock-Member impersonation + Switch-back chip
- Analytics blocking flag (`window.__LP_ANALYTICS_BLOCKED`)
- Production Mode switch (one-click wipe of every `isMock:true` record)
- Action log (last 50, timestamped, IndexedDB-persisted)
- demo-content.json (60 items, all 17 build-plan content types)

### Tier 1 — most-visible build-plan gaps (NEXT UP)

1. **Profile editing page** — display name, banner upload, profile
   image upload, bio. Reachable from sidebar Viewer · Viewer Profiles.
2. **Watch History sidebar item** — Tubi/YouTube-style list of
   recently-watched items, sortable, with resume support.
3. **Settings page** in sidebar — subtitle preferences, audio
   language, autoplay toggle, content-filter level.
4. **Multi-step Upload Wizard** — replaces the single-step file
   picker currently triggered by Creator Upload / Upload Wizard.
   Steps: title details / poster / trailer / category / rights /
   credits / safety scan / preview / publish or save draft. Saves
   to drafts until published.

### Tier 2 — playback shell expansion

5. **HTML cinema package player** — open a `.cinepwa.zip`, render
   via the PWA Cinema Build Manual's Scene JSON spec.
6. **Audio-story playback** — non-video content type with cover art,
   chapters, and progress.
7. **Per-project pages** — dedicated landing for each published item:
   description, credits, rights, related items.

### Tier 3 — real implementations behind the Developer Lab gate

8. **PWA Diagnostics** — manifest reachable, SW registered, icons
   resolvable, scope OK, IndexedDB capacity check.
9. **Manifest Checker** — fetch + parse manifest.json, surface issues.
10. **Service Worker Checker** — list registered SWs, controllers,
    cache contents, version of active SW.
11. **API Keys panel** — per-provider key entry + local storage,
    mirroring `load/image-prompt`'s pattern.
12. **Package Validator** — open `.cinepwa.zip` / `.loadstudio.zip`,
    validate structure against the manual's schema.

### Tier 4 — marketplace & safety completion

13. **Marketplace cart / checkout** for paid items.
14. **Real Safety Scan** — text + image at upload time.

### Tier 5 — engagement & monetization (added 2026-05-02)

15. **Member / Creator Inbox** — direct-message surface for both
    members and creators. NO inbox / messaging exists today; comments
    + Q&A (v21 mock) are the only viewer↔creator surfaces. Sidebar
    items under Viewer ("Inbox") and Creator ("Creator Inbox");
    IndexedDB `lp_test_messages` thread store; topnav notification
    dot for unread; Test Mode "Generate Mock Messages" seeder;
    Production wipe handles it.
16. **Advertiser Console** (admin / dev-gated) — ad object schema
    (id / name / type / mediaSrc / clickUrl / genre + ageBand
    targeting / start + end / budget / impressions / CTR / isMock);
    IndexedDB store with schema versioning + JSON/CSV export; player
    resolver picks an eligible ad on `openPlayer` and surfaces a
    "Sponsored" overlay before play; kid/child profiles never see
    ads (mirrors v23 kids-profile filter); brand seeders for Test
    Mode; Production wipe clears mock ads.

---

## Outstanding decisions (carried)

- **Inbox files privacy** — `inbox/` is publicly readable on the repo.
  Leave as-is or scrub from history (destructive)?
- **`acr2026` rotation** — three standalone HTMLs still use plaintext
  `acr2026`. When ready, hand over a new password and the next
  session hashes + replaces it across `ACR-Study-Standalone.html`,
  `ACR-Records-Standalone.html`, `Attain-Standalone.html`. The
  hashing pattern lives in root `index.html` (`function sha256(s)`
  + `if (h === ACR_HASH)`). Reminder also in `HANDOFF.md`.

---

## Source-of-truth documents (in `inbox/`)

- `Load_Studio_Load_Play_Complete_Build_Plan.docx` — original spec
  (every Tier item traces back here).
- `Load_Studio_PWA_Cinema_Complete_Build_Manual.pdf` — Scene JSON,
  Character Bible, Rights schema for Tier 2 work.
- `LoadPlay_Mock_User_Simulation_System.docx` — 20-section QA
  blueprint that drove v20–v25.
- `LoadPlay_Test_Mode_Mock_Users_Claude_Instructions.docx` — exact
  mock-user names + avatar slicing instructions (consumed by the
  LITE pack already in v22).
- `LoadPlay_Mock_User_Package_LITE.zip` — already extracted into
  `LoadPlay/data/` + `LoadPlay/assets/mock-users/avatars/` in v22.

---

## How to verify on iPad (after every push)

1. Wait 5–15 min for GitHub Pages to rebuild from `main`.
2. Open `https://dssorit.github.io/ancient-covenant-scrolls/LoadPlay/`.
3. If anything looks stale: tap the circular hard-refresh icon in
   the LoadPlay topnav toolbar — it clears every cache + unregisters
   the SW + reloads.
4. To verify the cache version that's actually live, open
   `https://dssorit.github.io/ancient-covenant-scrolls/LoadPlay/sw.js`
   in Safari and check the `CACHE = 'loadplay-vNN'` line.

---

## Known caveats / capability gaps

- The Pages URL (`dssorit.github.io`) is not directly fetchable from
  this Claude Code session. Use `raw.githubusercontent.com/.../main/...`
  to verify what's on `main` HEAD.
- The branch policy (`claude/fix-session-sending-TVMbW`) is
  development-only. Pages serves `main` — every push must propagate
  to both, or the deployed site stays stale.
- iOS Safari has known A2HS quirks. After a manifest change, users
  may need to remove and re-add the home-screen icon for the new
  icon to take effect.
- The root `sw.js` previously intercepted sub-app paths and could
  cache 404 responses; fixed in commit `5ca615b` (2026-05-02). New
  sub-app folders that ship later should also be added to its
  `SUBAPP_PATHS` bypass list.

---

## Recovery cheat-sheet

```bash
# Restore the last user-verified-working LoadPlay state
git checkout backup/2026-05-02-loadplay-v19

# Resume work on the feature branch + main
git checkout claude/fix-session-sending-TVMbW
git push origin claude/fix-session-sending-TVMbW:main

# Verify what's currently on main
git fetch origin main && git log --oneline origin/main -10 -- LoadPlay/

# Verify the live cache version
# Visit:
# https://raw.githubusercontent.com/DssOrit/ancient-covenant-scrolls/main/LoadPlay/sw.js
```
