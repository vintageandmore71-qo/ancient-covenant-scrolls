# Session Notes — 2026-04-22

Downloadable reference of everything we did today and what you need
to know going forward. Saved to the repo root so you can pull it up
any time from GitHub or your Working Copy backup.

Direct download URL once pushed:
`https://github.com/dssorit/ancient-covenant-scrolls/raw/main/SESSION_NOTES_2026-04-22.md`

---

## TL;DR

- **In-app question validator** landed for Attain's auto-generated
  questions. Shipped safely — no existing functionality broken.
- **Netlify is out** of every doc. Cloudflare Pages is the default
  free host for eventual private-repo deploys. Vercel is the only
  fallback.
- **Attain standalone zip** is at the repo root
  (`attain-standalone.zip`) and is ready to unpack into a new
  private GitHub repo when you're ready.
- **Attain Jr** is locked in as a future TASK B, delivered the same
  way (standalone zip). A paste-ready handoff is in this doc for
  when you open a fresh Claude chat to build it.
- **Security tier 1 fully prepped.** Automated: LICENSE, copyright
  headers on every code file, _copyright metadata on every ACR
  content JSON, content-compilation license doc, secret scan clean,
  safety backup branch on GitHub. Manual: two taps on GitHub you
  still need to do.
- `data/nav.json` is a 1-byte empty placeholder referenced by
  nothing — not an issue, just clutter.

---

## What shipped today (commits on `main`)

| Commit | What |
|---|---|
| `b35565b` | In-app validator for algorithmically-generated questions — length / double-negative / jargon / front-matter checks, with MC also getting option-unambiguous / absurd / distractor-length. |
| `955b7b7` | Stripped Netlify from HANDOFF / MONETIZATION / GITHUB_SETUP / PROTECTION_GUIDE. Cloudflare Pages is default; Netlify explicitly excluded in each doc. |
| `e84edc1` | Tightened validator — length and jargon checks only run on multiple-choice. Fill-blank and true/false keep double-negative + front-matter. Prevents the validator from rejecting legitimate long paragraphs. |
| `02aa994` | Locked "both Attain and Attain Jr delivered as standalone zip files" commitment into HANDOFF.md. Added TASK B execution plan for Jr. |
| `c39e629` | Shipped `attain-standalone.zip` at repo root — 5.2 MB, 17 files, all paths relative, smoke-tested with local server. |
| `f9f7956` | Added accessibility-friendly "EASIEST PATH" section to `docs/GITHUB_SETUP.md` — 2 taps each, Face ID passkey, clickable URLs, no typing. |
| `4f327e1` | Injected `_copyright` / `_license` / `_rights` into all 222 ACR content JSON files. Added HTML copyright comments to the three main index.html files. New `CONTENT_LICENSE.md` asserting compilation ownership separate from the code license. |

Current `main` tip: `4f327e1`  
Safety backup branch on GitHub: `safety/stable-2026-04-22` (pointing at `c39e629`)

---

## The two-tap security setup you still need to do

Open `docs/GITHUB_SETUP.md` for full detail. Short version — both
use Face ID, no typing, no app installs:

### Tap 1 — Add a passkey (counts as 2FA)

1. Safari: open `https://github.com/settings/passkeys`
2. Tap **Add a passkey** → confirm with Face ID.

### Tap 2 — Lock the `main` branch

1. Safari: open `https://github.com/dssorit/ancient-covenant-scrolls/settings/branches`
2. Tap **Add classic branch protection rule**.
3. Pattern box: type `main`.
4. Check: *Restrict deletions*, *Require linear history*, *Block force pushes*.
5. Tap **Create**.

After these two taps, you're at the realistic maximum security for a
free public solo-maintained PWA repo.

---

## Where the Attain standalone zip lives

- **File:** `attain-standalone.zip` at the repo root
- **Size:** 5.2 MB (17 files)
- **Direct download:**
  `https://github.com/dssorit/ancient-covenant-scrolls/raw/main/attain-standalone.zip`

**Contents:** index.html, attain-core.js, attain-parser.js,
attain-study.js, attain-ui.js, attain.css, sw.js (attain-v56),
manifest.json (with `scope: "./"`), icon.png, splash.PNG,
splash 2.PNG, splash .PNG, LICENSE, README.md, .nojekyll, .gitignore.

**How to use it when you're ready to deploy privately:**
1. Download the zip on any device. Unzip — root folder is
   `attain-standalone/`.
2. Create a new private GitHub repo on the other account.
3. Push the unzipped contents to the new repo's root.
4. Connect the repo to Cloudflare Pages (free tier, private repos
   supported, no credit card).
5. Build command: empty. Publish directory: `/`.
6. Verify the live URL loads; verify service worker registers;
   upload a test book to confirm study activities work.
7. Only after that works, delete the `attain/` folder from this
   repo in a follow-up commit (TASK A step 9).

---

## Paste-for-new-chat — Attain Jr build handoff

When you open a fresh Claude chat to start Attain Jr, paste
everything below the line.

---

I'm continuing work on my two PWAs from a prior Claude session.
Please start by reading these files in my repo for full context:

- `HANDOFF.md` — LOCKED DELIVERABLE COMMITMENT at top, then TASK A
  (Attain split) and **TASK B (the task you are picking up — Attain
  Jr)**
- `study/BUILD_PLAN.md` — locked rules for content voice, free
  stack, question generation, game modes, question validation
- `PROTECTION_GUIDE.md` — IP posture and free-tier hosting plan
- `CONTENT_LICENSE.md` — ACR content compilation license (same
  All-Rights-Reserved posture applies to Jr)
- `attain/` folder — the existing Attain PWA to use as reference
  scaffold

Repo: `https://github.com/dssorit/ancient-covenant-scrolls`

**Task: Build Attain Jr**, a child-focused variant of my existing
Attain PWA, as a new sibling folder `attain-jr/` in the same repo.
When tested and complete, it will be delivered as a standalone PWA
zip (same packaging procedure as TASK A) for eventual private-repo
deploy on Cloudflare Pages and native-app wrap via Capacitor.

**Locked rules (do not break):**
- 100% free stack — no paid services, no hosted LLMs, no paid APIs,
  no analytics, no tracking
- **No Netlify.** Cloudflare Pages is the default approved free
  host; Vercel hobby is the only fallback
- COPPA posture — no network calls beyond initial asset load,
  publish a parent-readable privacy note
- Vanilla ES5-compatible JavaScript (no arrow fns, template
  literals, destructuring) for iPad Safari compatibility
- Same dyslexia-friendly font stack as Attain (Atkinson
  Hyperlegible, OpenDyslexic)
- Always snapshot before edits (pre-tool-use snapshot hook is
  already configured)
- Split each feature into its own commit — no bundling unrelated
  changes
- Independent service-worker cache namespace (`attain-jr-vNN`,
  start at v1); independent manifest / icons / start_url / scope so
  it does not collide with Attain

**Jr scope (locked in HANDOFF.md TASK B):**
- 8 game modes only: Flashcards, Fill in the Blank, Rhyme Chain,
  Syllable Tap, Who Said It, Audio Fill the Gap, Story Sequence,
  short-sentence Dictation
- Dropped modes: Mind Map, Concept Web, Chapter Timeline, Word
  Morph, Multiple Choice, True/False, Cause and Effect
- Content intake: paste-text + EPUB + plain-text upload only. **No
  PDF parsing**
- UI: larger touch targets, brighter palette, simpler navigation,
  larger default font
- Stricter vocabulary gate (shorter syllable limits, shorter
  question sentences)
- More positive reinforcement on wrong answers

**Before you start building, please ask me these three questions:**
1. Age target — 6–9 or 10–12? (affects reading-level thresholds)
2. Is the 8-mode list above final, or should I adjust it?
3. Should Jr share the uploaded-book library with Attain, or keep
   a separate kid-safe library?

After I answer, scaffold `attain-jr/` by duplicating Attain's file
layout, then strip the dropped modes, rename identifiers that would
collide, and retune for the age target. Verify locally with
`python3 -m http.server 8000` before asking me to test. **Do not
deploy anywhere or create a zip yet** — packaging happens only
after I confirm the app is tested and complete.

---

## Security posture — what's where

| Layer | Status | Where |
|---|---|---|
| Code license | Done | `LICENSE` |
| Code copyright headers | Done | All `.js` / `.css` / service workers |
| ACR content copyright markers | Done (new) | `_copyright` / `_license` / `_rights` in every `data/*.json` and `study/content/*.json` |
| Content compilation license | Done (new) | `CONTENT_LICENSE.md` |
| HTML copyright comments | Done (new) | `index.html`, `attain/index.html`, `study/index.html` |
| Secret scan (leaked credentials) | Clean | Scanned entire codebase — zero matches |
| Safety backup branch | Done | `safety/stable-2026-04-22` on GitHub |
| Accessibility-friendly 2-tap doc | Done | Top of `docs/GITHUB_SETUP.md` |
| 2FA on GitHub account | **Your 2 taps** | `https://github.com/settings/passkeys` |
| Branch protection on `main` | **Your 2 taps** | `https://github.com/dssorit/ancient-covenant-scrolls/settings/branches` |
| Private-repo migration (tier 2) | Future | HANDOFF.md TASK A |

---

## What's open for the next session

1. **Attain Jr build** — open a new chat, paste the handoff above.
2. **TASK A (Attain private-repo split)** — only when you're close
   to launching commercially. Standalone zip is already ready.
3. **In-app validator fine-tuning** — if you see dropped questions
   post-validator, loosen the MC length/jargon thresholds.
4. **Minify pipeline** — `tools/minify.mjs` is wired up; run it on
   every production deploy when that time comes.

---

## Dead-file note

`data/nav.json` is 1 byte (just a newline). Not referenced by any
code, not cached by service workers. Harmless clutter. Options
when you feel like it:

1. Leave it.
2. Delete it (one-line cleanup commit).
3. Replace with `{}` so it parses and gets the copyright metadata
   like every other content file.

Not urgent, pick any time.

---

## One-line summary

Everything you asked for in this session is done, committed, pushed
to `main`, and backed up to a safety branch. The only remaining
work is the two-tap security setup on GitHub (which I cannot do
from this environment) and the Attain Jr build (which you wanted to
start in a fresh chat).
