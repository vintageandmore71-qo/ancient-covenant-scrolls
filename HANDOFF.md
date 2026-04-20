# Handoff Tasks

Cross-session tasks that must persist across Claude sessions. Each
task is fully self-describing — a future session should be able to
execute without asking the user to re-explain.

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

## Notes for future sessions

- This file is the source of truth for cross-session handoffs.
- Add new handoff tasks as `## TASK B`, `## TASK C`, etc.
- Mark a task `## TASK A — DONE (commit <sha>, date)` when complete;
  don't delete — keeps the audit trail.
- The `study/BUILD_PLAN.md` is the source of truth for the Study PWA's
  feature backlog. These two files don't overlap.
