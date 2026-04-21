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

## TASK B — Design Update (2026-04-21)

This section supersedes the mode list and age bands in the original
TASK B above. The rest of TASK B (free-stack constraints, COPPA
posture, sibling-folder layout, independent cache namespace, eventual
standalone zip packaging) is UNCHANGED.

**Session status:** Design captured, NOT built. Build will happen in
a later session. Scaffold goes on branch
`claude/build-attain-jr-pzbDF` (already created).

### Decisions locked in this session

1. **Library:** Separate kid-safe library. Own IndexedDB namespace
   (`attain_jr_books`). Nothing Attain uploads appears in Jr and vice
   versa — parent curates Jr library explicitly.
2. **Age handling:** TWO modes covering BOTH bands, selected via a
   parent-gated profile picker on first launch and changeable in
   Settings. Choice persisted in localStorage under the Jr namespace.
   - **Younger:** Ages 6–11 (was 6–9 in original TASK B — widened).
   - **Older:** Ages 12–16 (was 10–12 in original TASK B — widened).
3. **Initial location:** `attain-jr/` sibling folder in this repo for
   testing/building (same pattern as `attain/`). Standalone PWA zip is
   produced only after the user confirms testing is complete.
4. **Mode list:** STILL OPEN. Original TASK B locked 8 modes; user has
   proposed a new 18-mode design (8 younger + 10 older). Reconciliation
   and final v1 mode list are a pre-build question — see "Open
   questions for next session" below.

### Attain Jr core design principle (locked)

The game must never punish slow processing. It rewards pattern
recognition, memory linking, audio support, sequencing, logic, and
meaning-building over speed-based reading.

Feels like:
- read less, understand more
- hear it, see it, move it
- chunk everything
- one task per screen
- large wins from small steps
- no shame mechanics
- no red-X overload
- always allow audio, replay, hint, and "show me another way"

### Age Level 1 — Younger (6–11)

Visual tone: bright, warm, playful, low-pressure. Child is exploring,
not being tested.

Best mechanics: drag-and-drop (with tap-to-pick fallback — iPad Safari
drag is unreliable; tap-to-pick is the default in Jr), matching,
picture-supported reading, audio-first prompts, tap-to-hear,
sequencing, rhythm and repetition, story-based memory, visual
chunking, rewards through collection/pets/badges/worlds.

Proposed modes for this band:

1. **Word Builder Island** — phonics/decoding adventure. Build
   bridges/houses/boats/treasure paths by assembling
   beginning-middle-ending sounds, syllable blocks, or rhyme families.
   Every letter chunk speaks on tap; color-coded syllables; optional
   picture clues; no timer; persistent "read to me" button.
2. **Sound Quest** — audio-first. Hear a word / sentence / short-story
   clue / sound pattern; pick matching answer via images, word chunks,
   or actions. Examples: "tap the picture that starts with /b/",
   "which two words rhyme?", "order the story events after listening",
   "which word has the same ending sound?".
3. **Story Path Adventures** — story comprehension as a journey.
   Listen to and read tiny chunks; after each chunk, one light task
   (what happened first / character-to-action match / emotion pick /
   finish the scene / beginning-middle-end sort). Toggle between
   listen-only / read-and-listen / read-alone.
4. **Memory Garden** — gentle recall + spaced repetition disguised as
   garden care. Correct answers grow flowers / fruit trees /
   butterflies / glowing stones / learning creatures. Makes review
   emotionally safe.
5. **Sequence Detective** — sequencing and logic. Arrange story events
   / morning routines / science steps / historical order / math
   procedures by dragging tiles. No written responses.
6. **Picture-to-Meaning Match** — vocabulary and concept building via
   image association. Image-to-word, word-to-meaning, sound-to-image,
   sentence-to-image, category-to-item. Meaning before label.
7. **Glow Trace** — multisensory letter/blend/sight-word tracing.
   Magical/mission-framed (constellations lit, doors activated, rocket
   powered, animal trails unlocked). Not babyish.
8. **Rhyme Rescue** — rhyme / chunking / pattern game. Characters
   find the right rhyme to solve a challenge; progresses into
   syllable matching, onset-rime chunking, word-family grouping.

### Age Level 2 — Older (12–16)

Visual tone: sleek, cool, game-like, strategy-oriented,
identity-building, less cartoon / more premium. Must NOT feel
childish — teens may still need support but want dignity, skill,
challenge, mastery, status, relevance.

Best mechanics: missions, problem solving, strategy progression,
narrative quests, challenge towers, evidence boards, interactive note
systems, logic and sequencing, mastery streaks, leveling systems.

Proposed modes for this band:

1. **Decode the World** — mystery + evidence-solving. Read/listen to
   chunks, sort evidence into fact / clue / theme / definition /
   cause / effect. Missions: solve a historical mystery, uncover a
   science-lab error, decode an ancient text, identify main argument.
2. **Skill Forge** — mastery hub. Pick areas to strengthen:
   vocabulary, comprehension, sequencing, memory, summarizing, note
   decoding, logic, academic reading stamina. Each is a forge /
   chamber / tower / arena with progressive levels.
3. **Audio Sync Quest** — advanced read-along. Text highlights in sync
   with audio (Web Speech API — no "professional audio" bundle; free-
   stack rule). Slow playback, isolate chunks, replay phrases, tap
   words for definitions, quick meaning-questions after each section.
   "Lock in" mastery via summary cards / fill-in chunks / key idea
   capture / evidence pickers.
4. **Concept Builder Lab** — build mental architecture. Turn messy
   info into concept maps, idea chains, timelines, cause/effect
   ladders, compare/contrast boards. Break chapter into idea blocks,
   connect who-what-why-consequence, answer from the map.
5. **Battle of Meaning** — comprehension; pick the strongest
   interpretation (best summary, strongest main idea, best supporting
   evidence, likely author purpose, best inference).
6. **Memory Vault** — smarter spaced repetition for older learners.
   Recover vaults of vocab / concepts / definitions / formulas /
   timeline events / reading themes. Modes: match / explain / order /
   choose evidence / connect terms / audio response.
7. **Sequence & Systems** — reconstruct historical timelines,
   scientific processes, plot arcs, argument flow, legal/policy
   steps, grammar logic.
8. **Survival Notes** — note-taking and summarization. Extract main
   idea / 3 key facts / 1 pattern / 1 question / 1 connection.
   Scored on clarity, completeness, overload vs concise thinking,
   retention strength.
9. **Vocabulary in Motion** — context-based word learning. Hear it,
   see it in a sentence, match it to a visual, contrast with an
   opposite, place it into a mini story.
10. **The Mastery Path** — personal progression across subject
    pathways: reading power / school success / memory upgrade / exam
    prep / confidence rebuild / Bible or religious study / STEM
    concepts / life skills. Missions, streaks, levels, unlockables.

### Cross-age features (locked for both bands)

1. Always-on audio — every important element tappable + speakable.
2. Dyslexia-friendly fonts (Atkinson Hyperlegible + OpenDyslexic).
3. Chunk mode — one bite of content per screen.
4. Color-coded meaning — color groups concepts, never decorative.
5. No speed pressure by default. Challenge mode later, if ever.
6. Multiple pathways to correct: audio, visual, sequence, meaning,
   inference all count.
7. Confidence-safe correction copy: "try another path", "almost
   there", "let's break it down", "want a clue?", "hear it again?".
   No bare "Wrong".
8. Progress shown visually — mastery bars, badges, maps, worlds,
   growth systems.
9. Short session design — 3-min / 5-min / 10-min task sizes; stop
   and save instantly.
10. Parent/teacher insight without shame — exportable JSON showing
    strengths, preferred learning mode, retention gains, skill
    growth. No raw error counts, no social leaderboards (COPPA).

### Theme ideas (optional, for v1+ polish)

- Younger (6–11): island worlds, garden worlds, star maps, jungle
  missions, book kingdoms, animal helpers.
- Older (12–16): digital missions, mastery towers, mystery boards,
  achievement maps, elite skill labs, scholar leagues (LOCAL only —
  no network / no social).

### User's strongest product-idea shortlist

If building exactly one v1 mode per band from the list:
- **Younger (6–11):** Story Path + Sound Quest + Word Builder Island
- **Older (12–16):** Decode the World + Concept Builder Lab +
  Skill Forge

Positioning (user's directive): **"the first dyslexia-centered mental
architecture game system for children and teens — decode, understand,
organize, remember, apply."** Not a generic phonics app.

### Monetizable expansion-pack backlog

Later, ship bundled content packs (no new engines needed — Attain's
paste-text + EPUB + plain-text intake already supports them):
Bible & religious study (ACR content is a candidate first pack),
history detective, science-lab challenges, vocabulary vault, exam
prep missions, life skills & money basics, writing & storytelling,
homeschool pack, dyslexia confidence builder pack.

### Engineering notes from the design review (apply during build)

1. **Folder / manifest name = `attain-jr`** (no period). "Attain Jr."
   with a trailing period breaks TTS, filenames, and PWA manifest
   `name`. Display as "Attain Jr" everywhere.
2. **Mode overlaps — inherit, don't rebuild.** Memory Vault ≈ existing
   SM-2 flashcard engine (`study/study.js`). Sequence & Systems +
   Story Path sequencing ≈ existing Story Sequence. Concept Builder
   Lab ≈ existing Mind Map + Concept Web. Audio Sync Quest ≈ existing
   Listen & Learn with word-boundary highlighting. Rhyme Rescue ≈
   existing Rhyme Chain. Battle of Meaning ≈ existing Multiple Choice
   with meaning-picker framing. Genuinely new engines: Word Builder
   Island (phonics), Sound Quest, Picture-to-Meaning Match, Glow
   Trace, Decode the World, Skill Forge, Survival Notes, Mastery
   Path, Memory Garden. Roughly ~6 new engines, the rest reskins.
3. **Imagery under the free stack.** Default to emoji + CSS/SVG
   vector scenes for Story Path / Picture-to-Meaning / Word Builder.
   Option to surface embedded EPUB images from uploaded books.
   Vendoring a Wikimedia public-domain set is the fallback. NO paid
   asset packs.
4. **Audio.** Web Speech API only. No pre-recorded "professional
   audio" ships. Reuse Attain's voice picker + onboundary word
   highlighting.
5. **Input.** Tap-to-pick is the default for all Jr modes. Drag is an
   optional enhancement where it works. iPad Safari drag has been
   flaky — Attain's Story Sequence already ships tap-to-pick as the
   primary interaction for this reason.
6. **No social / no network.** "Scholar league" and any multi-user
   mechanic is local-only (personal bests, streaks, badges). Parent
   export is a JSON download (reuse Study's export pattern). COPPA
   posture is preserved.
7. **Glow Trace is a new engine (pointer capture + SVG path match).**
   Highest new-code cost, lowest overlap with existing code. Park
   for v2 unless user overrides.
8. **ES5-compatible JS only** (no arrow fns, template literals,
   destructuring, const/let only where necessary) — iPad Safari
   compatibility is locked.

### Proposed reconciled v1 scope (awaiting user approval)

- `attain-jr/` sibling folder, `attain-jr-v1` cache namespace,
  separate kid-safe IndexedDB library.
- Parent-gated profile picker with Younger (6–11) and Older (12–16)
  modes; thresholds and font sizing swap per profile.
- **Six v1 modes:** Story Path, Sound Quest, Word Builder Island
  (Younger) + Decode the World, Concept Builder Lab, Skill Forge
  (Older). Matches the user's strongest-idea shortlist.
- Tap-to-pick everywhere, emoji/SVG-only imagery, Web Speech API
  audio, local-only progression, JSON export for parents.
- v2 backlog (build one commit at a time after v1 ships): Memory
  Garden, Glow Trace, Rhyme Rescue, Battle of Meaning, Memory Vault,
  Survival Notes, Vocabulary in Motion, Mastery Path, Sequence &
  Systems, Picture-to-Meaning Match, Audio Sync Quest, Sequence
  Detective.

### Session-review callouts (for product awareness, not code)

- **12–16 band overlaps Attain's primary audience.** Worth deciding
  later whether a "Teen Mode" toggle inside Attain proper is a better
  home for the older band than Jr. Not blocking v1; flag if scope
  drifts.
- **18 modes vs. original "scoped-down sibling" framing.** 6-mode v1
  keeps the original framing intact; the full 18 becomes a multi-
  session backlog instead of a single build.
- **ACR content is a natural first expansion pack** once Jr ships —
  ties the kid app back to this repo's content without mixing
  libraries.

### Open questions for next session (pre-build)

1. Approve the **six-mode v1 scope** above, OR override with a
   different subset of the 18, OR commit to building all 18 up front?
2. Approve the **age-band widening** (6–11 / 12–16) as an update to
   the original TASK B lock, OR pull the older band out of Jr and put
   it in Attain proper as a "Teen Mode"?
3. Approve **emoji + CSS/SVG** as the default imagery strategy for
   v1, or pick the Wikimedia-vendor / EPUB-embedded-image path?

### Resume instruction for next session

Open a fresh chat and say: "Read HANDOFF.md TASK B — Design Update
(2026-04-21). Answer the three open questions, then snapshot and
scaffold `attain-jr/` on branch `claude/build-attain-jr-pzbDF`."

---

## Notes for future sessions

- This file is the source of truth for cross-session handoffs.
- Add new handoff tasks as `## TASK C`, `## TASK D`, etc.
- Mark a task `## TASK A — DONE (commit <sha>, date)` when complete;
  don't delete — keeps the audit trail.
- The `study/BUILD_PLAN.md` is the source of truth for the Study PWA's
  feature backlog. These two files don't overlap.
