# Handoff Tasks

Cross-session tasks that must persist across Claude sessions. Each
task is fully self-describing — a future session should be able to
execute without asking the user to re-explain.

---

## LOCKED DELIVERABLE COMMITMENT

**Attain and Attain Jr will both ultimately be delivered as
standalone PWA zip files.** Each zip is a self-contained folder
(index.html + JS + CSS + sw.js + manifest + icons + README +
.nojekyll + .gitignore) that the user can unpack into a new private
GitHub repo, deploy via Cloudflare Pages free tier, and eventually
wrap as a native app via Capacitor for App Store distribution.

Rules:
- Each app ships as its own zip. Never combined, never
  interdependent.
- Zips are produced only after the user confirms the app is tested
  and complete — not mid-build.
- Packaging procedure for either app lives in TASK A (Attain)
  and TASK B (Attain Jr). Same pattern, different source folder.
- Free stack (see `study/BUILD_PLAN.md` FREE STACK section) applies
  to every zip — no paid services, no Netlify, no hosted LLMs.

---

## TASK A — Split Attain into a Standalone Repo

**Goal:** Extract the Attain PWA from this repo into its own repo that
the user will upload to a different GitHub account. Ancient Covenant
Scrolls (this repo) keeps the ACR reader/study content; Attain leaves
cleanly and runs on its own domain.

**Trigger to execute:** When the user says "extract Attain" or
"split Attain out" or similar in a future session.

**What Attain is today (in this repo):**
- Lives in `attain/` subfolder as a self-contained PWA
- Files: `index.html`, `attain-core.js`, `attain-parser.js`,
  `attain-study.js`, `attain-ui.js`, `attain.css`, `sw.js`,
  `manifest.json`, `icon.png`, 3 splash PNGs
- Has its own cache namespace (`attain-vNN`, currently v23)
- Shipped as `attain-universal.zip` at repo root (122 KB)
- Accepts user-uploaded books (PDF/EPUB/text) — no shared `../data/`
  dependency
- Fully offline-capable after first load; all persistence in
  localStorage + IndexedDB + Cache Storage + cookies

**Execute these steps in the future session:**

1. **Snapshot first.** Before touching anything, run the existing
   PreToolUse snapshot hook (or manually zip the repo).

2. **Create the new repo layout** in a clean working directory (not
   inside this repo). Target structure:

   ```
   attain-standalone/
   ├── index.html          (was attain/index.html — update paths)
   ├── attain-core.js
   ├── attain-parser.js
   ├── attain-study.js
   ├── attain-ui.js
   ├── attain.css
   ├── sw.js
   ├── manifest.json
   ├── icon.png
   ├── splash.PNG
   ├── splash 2.PNG
   ├── splash .PNG
   ├── .nojekyll          (new — prevents Jekyll processing)
   ├── .gitignore
   └── README.md           (new)
   ```

3. **Path updates required:**
   - `index.html`: any `href="attain/..."` or `src="attain/..."` →
     strip the `attain/` prefix.
   - `sw.js`: the SHELL array already uses relative paths (`./`,
     `index.html`, etc.) — verify no absolute `/attain/...` paths
     remain. Cache name stays `attain-vNN`.
   - `manifest.json`: `start_url` and `scope` — set to `./` (root of
     the new repo). `icons` paths should be relative (`icon.png`).

4. **Write the new `README.md`** with:
   - One-sentence description (dyslexia-optimized universal reader
     for user-uploaded books)
   - Install/use instructions (open the GitHub Pages URL, click
     "Install" to add to home screen)
   - Tech stack: PDF.js (loaded from CDN — flag this in the README
     and optionally vendor later), Web Speech API, Service Worker,
     IndexedDB / Cache Storage / localStorage / cookies
   - Zero-cost deployment note (GitHub Pages only, no backend)

5. **Add `.nojekyll`** as an empty file so GitHub Pages serves all
   files including those with underscores.

6. **Write a fresh `.gitignore`** mirroring this repo's (include
   `.snapshots/` and anything else local).

7. **Produce the deliverable** — the user wants this on a different
   GitHub account. Two options (let the user pick):
   - **Zip** the new `attain-standalone/` directory and hand them the
     zip to upload manually via GitHub web UI.
   - **Git bundle** — `git init && git add . && git commit` inside
     `attain-standalone/`, then `git bundle create attain.bundle --all`.
     User pulls from the bundle into their new empty repo.

8. **Regenerate `attain-universal.zip`** for the standalone layout
   (for users who want to self-host).

9. **Do NOT delete** the `attain/` folder from *this* repo in the
   same operation. Keep both until the user confirms the split works.
   Follow-up task can remove it later.

10. **Verify locally** before handoff: `python3 -m http.server 8000`
    from inside the new directory, open `http://localhost:8000`, upload
    a test PDF, confirm chapter detection + study activities work.

**Known dependencies & caveats:**
- **PDF.js** is loaded from `cdnjs.cloudflare.com` in `index.html`.
  Keeps the repo small but depends on an external CDN. Either document
  this or vendor PDF.js into `lib/` for true zero-dependency.
- **Google Fonts** (Atkinson Hyperlegible, OpenDyslexic) loaded in
  `index.html` — free, but an external request. Same choice applies.
- Attain's service worker uses `network-first` strategy — will pick
  up updates automatically without cache-bust headaches.
- Cache version bump needed on any future change: bump
  `CACHE = 'attain-vNN'` in `sw.js`.

**Free-stack constraint (LOCKED):**
Attain must stay zero-cost on the new account too. Same rules as
`study/BUILD_PLAN.md` FREE STACK section:
- No hosted LLMs, no analytics, no paid APIs, no subscription services
- GitHub Pages only for hosting
- Vendor or CDN-free where practical

---

## Free private hosting options (chosen during execution)

Because the user plans to **sell** Attain eventually, the new repo
should be **private**. GitHub Pages on private repos requires GitHub
Pro ($4/month). Two hosts deploy private repos for free without any
paid upsell path and are the ONLY approved options — **Netlify is
explicitly out** per user directive.

### Option 1 — Cloudflare Pages free tier (recommended default)
- Sign in on `https://pages.cloudflare.com`
- Connect the private Attain repo
- Auto-builds on every push; deploys to `yourapp.pages.dev`
- Free tier: unlimited bandwidth, 500 builds/month, unlimited sites.
- Custom domain free (bring your own domain name).
- No credit card required.

### Option 2 — Vercel hobby tier
- Sign in on `https://vercel.com`
- Connect private repo; deploys to `yourapp.vercel.app`
- Free hobby tier supports personal/non-commercial projects — check
  Vercel's current terms before any paid rollout; if ambiguous,
  default to Cloudflare.
- No credit card required.

Both give production-grade CDN, HTTPS, and auto-deploy on push.

### Decision point during TASK A execution
Default to **Cloudflare Pages** unless the user specifies otherwise.
Do NOT propose Netlify.

### Migration specifics for private + free hosting
1. Create new private GitHub repo (don't init with README).
2. Copy current `attain/` contents as the new repo's root.
3. Strip any commit history that shouldn't travel (or fresh-init).
4. Push to the new private repo.
5. On chosen host (Cloudflare Pages or Vercel): connect the repo.
6. Build command: empty (static PWA, no build step needed).
7. Publish directory: repo root (or `/` if the host asks).
8. Verify the live URL loads; verify service worker registers; verify
   file upload + all activities work.
9. Add the host's free subdomain to `manifest.json` `start_url` and
   `scope` so PWA install works.
10. Leave `dssorit/ancient-covenant-scrolls` public with `attain/`
    intact until the new deployment is confirmed working — then the
    `attain/` folder in this repo can be deleted in a follow-up
    commit.

---

## TASK B — Build Attain Jr as a sibling PWA

**Goal:** Build a child-focused variant of Attain as a new
`attain-jr/` folder in this repo, then eventually deliver it as a
standalone PWA zip (same packaging procedure as TASK A).

**Trigger to execute:** Starting in a fresh Claude chat. The user
plans to open a new session and paste in a handoff prompt to pick up
the build.

**Relationship to Attain:** Jr is a fork-in-place scoped-down
variant. Start by duplicating Attain scaffolding, then strip and
retune. Divergence is expected; when drift becomes painful, extract
shared bits in a follow-up refactor.

**Scope (locked):**
- Location: `attain-jr/` (sibling to `attain/` and `study/` in this
  repo).
- Service-worker cache namespace: `attain-jr-vNN` (starts at v1).
- Independent manifest, icons, start_url, scope — must not collide
  with Attain.
- Content intake: paste-text and upload only. Drop PDF parsing
  (PDFs aren't the child-book format; EPUB + plain text cover it).
- Game modes (8, child-age-appropriate subset):
  Flashcards, Fill in the Blank, Rhyme Chain, Syllable Tap,
  Who Said It, Audio Fill the Gap, Story Sequence, Dictation
  (short sentences only).
- Modes dropped from Jr: Mind Map, Concept Web, Chapter Timeline,
  Word Morph, Multiple Choice, True/False with Why, Cause and
  Effect Match.
- UI: larger touch targets, brighter palette, simpler navigation,
  bigger default font. Same dyslexia-friendly font stack.
- Stricter vocabulary gate: shorter syllable limit on key terms,
  shorter question sentences, simpler stop-word list tuning.
- More positive reinforcement on wrong answers.
- COPPA posture — no tracking, no analytics, no network calls
  beyond initial asset load. Publish a parent-readable privacy note
  in the app.

**Before building, the session should ask the user three questions:**
1. Age target — 6–9 or 10–12 (affects reading-level thresholds).
2. Final 8-mode list — is the locked list above correct or adjust?
3. Shared library with Attain, or separate kid-safe library?

**Build order:**
1. Snapshot first (pre-tool-use snapshot hook).
2. Scaffold `attain-jr/` by duplicating Attain files, stripping the
   dropped modes, renaming identifiers that would collide.
3. Retune thresholds per the age target the user confirms.
4. Rebuild UI for larger touch targets + brighter palette.
5. Verify locally with `python3 -m http.server 8000` — upload a
   sample children's text, confirm all 8 modes work.
6. Commit each scaffold / retune / UI / mode-wiring step as a
   separate commit — do not bundle unrelated changes.

**Delivery (when user confirms tested and complete):**
Package `attain-jr/` the same way TASK A packages `attain/`:
strip the `attain-jr/` prefix from internal paths, add .nojekyll +
.gitignore + README, regenerate manifest paths, zip the result.
User unpacks into a new private repo on a different GitHub account.

**Free-stack constraint (LOCKED, same as Attain):**
- No paid services, no hosted LLMs, no analytics, no Netlify.
- Cloudflare Pages is the approved free host for eventual private
  deployment. Vercel hobby is the only fallback.
- Vanilla ES5-compatible JavaScript (no arrow fns, template
  literals, destructuring) for iPad Safari compatibility.

---

## Notes for future sessions

- This file is the source of truth for cross-session handoffs.
- Add new handoff tasks as `## TASK C`, `## TASK D`, etc.
- Mark a task `## TASK A — DONE (commit <sha>, date)` when complete;
  don't delete — keeps the audit trail.
- The `study/BUILD_PLAN.md` is the source of truth for the Study PWA's
  feature backlog. These two files don't overlap.
