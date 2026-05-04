# PLAN — Load Book-to-Video Engine

**Source:** user-uploaded `Load_Book_to_Video_Spec.zip` + `Load_Book_to_Video_Implementation.zip` (2026-04-29).

**Status:** spec captured + implementation files dropped at `load/book-video/`. NOT yet wired into Load's UI or workflow.

**Inbox source files (safe to delete):**
- `inbox/Load_Book_to_Video_Spec.zip` — captured below
- `inbox/Load_Book_to_Video_Implementation.zip` — extracted to `load/book-video/`

---

## Goal

Build a Book-to-Video engine inside Load. Imports book projects, extracts text, splits into scenes, summarizes each scene, creates editable Scene Cards. Each scene becomes an individual timeline clip in Load's existing media editor.

**Hard constraint:** Do NOT replace Load's existing sound system or video/media editor. Use them as the final assembly layer.

---

## Workflow

```
IMPORT BOOK → EXTRACT TEXT → SPLIT INTO SCENES → CREATE SCENE CARDS
  → LOCK CHARACTERS → GENERATE ASSETS → SEND TO TIMELINE → EXPORT VIDEO
```

## Supported imports

- PDF
- EPUB
- HTML / PWA book projects (Load already imports these)
- TXT
- Later: DOCX

## Scene Card shape

Each scene card must have:

- Scene number
- Chapter name
- Scene summary
- Characters present
- Location
- Time of day
- Visual prompt
- Narration script
- Dialogue script
- Music mood
- Sound effects
- Caption text
- Generated image / video status
- "Send to Timeline" button

## Character Bible (consistency layer)

Per character:

- Name
- Physical description
- Clothing rules
- Personality notes
- Voice profile
- Reference image
- Master visual prompt
- Consistency lock toggle

**Every scene generation MUST use the Character Bible** so characters stay visually consistent across scenes.

## Generated assets per scene

- Background image
- Character image
- Narration audio
- Dialogue audio
- Captions
- Optional video clip

After generation, each scene card sends into Load's existing Media Editor as one timeline clip.

---

## Implementation files (already on main, in `load/book-video/`)

Total: ~766 LOC of vanilla JS + JSON schemas.

| File | Purpose |
| --- | --- |
| `book-to-video.css` | Styles for Scene Cards / Character Bible UI |
| `book-text-extractor.js` | 85 LOC — extract text from imported file |
| `scene-card-engine.js` | 163 LOC — split text into scenes, build Scene Cards |
| `character-bible.js` | 71 LOC — character profile storage + consistency injection |
| `ai-provider-router.js` | 65 LOC — route gen tasks to image/audio providers |
| `timeline-bridge.js` | 48 LOC — handoff to existing Load Media Editor |
| `book-to-video-engine.js` | 120 LOC — orchestrator |
| `book-to-video-ui.js` | 214 LOC — modal / panel UI |
| `schemas/scene-card-schema.json` | Scene Card data shape |
| `schemas/character-bible-schema.json` | Character profile data shape |

## Integration steps (when ready to wire it up)

1. **Already done** — `load/book-video/` folder exists in repo with all files
2. **Wire CSS** — add `<link rel="stylesheet" href="./book-video/book-to-video.css">` to `load/index.html` `<head>`
3. **Wire scripts** — add these `<script>` tags before closing `</body>` in `load/index.html`, after `load.js`:
   ```html
   <script src="./book-video/book-text-extractor.js"></script>
   <script src="./book-video/scene-card-engine.js"></script>
   <script src="./book-video/character-bible.js"></script>
   <script src="./book-video/ai-provider-router.js"></script>
   <script src="./book-video/timeline-bridge.js"></script>
   <script src="./book-video/book-to-video-engine.js"></script>
   <script src="./book-video/book-to-video-ui.js"></script>
   ```
4. **Add a Workspace tile** to Load home screen — `data-home-ws="bookvideo"` with a custom SVG icon (suggest: 🎬 / film-strip + book-page hybrid). Wire the click handler in `load.js` to call `window.LoadBookToVideo.open()`.
5. **Verify globals exist** in browser console after open:
   - `window.LoadBookToVideo`
   - `window.BookTextExtractor`
   - `window.SceneCardEngine`
   - `window.CharacterBibleEngine`
   - `window.LoadTimelineBridge`
6. **Test flow** in this order:
   - Upload `.txt` first
   - Then HTML / PWA book pages
   - Then PDF
   - Then EPUB
7. **Acceptance test:** A book file becomes editable Scene Cards. Each card includes characters, location, narration, visual prompt, captions, and a "Send to Timeline" button that hands off to the existing media editor.

## Cache + verification

When wiring up:
- Bump `load/sw.js` `var CACHE = 'load-vXXY'` (next available)
- Bump `load/load.js` on-screen badge to match
- Custom SVG icon for the Workspace tile (extend the v17cv icon system)
- First-use popup explaining the Book-to-Video flow (use existing `showFirstUseHint` if scoped or build equivalent)
- Backup branch: `backup/<date>-<cacheVer>` after user verifies

## Sequencing

This is a **separate project** from Image Prompt. Recommend completing Image Prompt's spec waves (W6.5 → W11) FIRST, since:

- Book-to-Video depends on the Image Prompt provider router for scene image generation
- Character Bible parallels Image Prompt's Character Profile system (Pipeline D / W8) — should share data shape
- Once W8 ships, Book-to-Video's Character Bible can reuse the same storage

Then Book-to-Video becomes its own wave (~3-5 hr to wire UI + test).

## Hard rule from spec

> "Do not replace the existing sound or video editor. Use the existing systems as the final assembly layer."

Always send generated scene assets THROUGH `timeline-bridge.js` into Load's existing Video Editor. Don't reimplement timeline / mixing / export.

---

## Companion engines (added 2026-05-04)

Same Scene-Card → assets → timeline pipeline, different inputs.

### Verse-to-Video (ACR Study) — originally a Claude suggestion that should have been tracked earlier; captured here after user correction 2026-05-04

Take a verse from `study/content/` JSON and turn it into a 5–10 second
visual simulation of the verse — "bringing the words to life in clips".

Pipeline:

```
SELECT VERSE → AUTO-PARSE (subjects / actions / setting / time-of-day)
  → BUILD SCENE CARD (single-scene cinema beat: stage description,
    visual prompt, narration = verse text, character list when known,
    suggested music mood from chapter context)
  → GENERATE COVER IMAGE (X-AI image gen, locked character bible
    when verse references named figures)
  → ANIMATE COVER (X-P2V / image-to-video provider when X-AI 14d
    SiliconFlow connector or HF SVD lands; until then, Ken Burns
    auto-pan via canvas.captureStream)
  → SEND TO LOAD TIMELINE (existing timeline-bridge.js)
  → INLINE PLAYBACK in ACR Study activity card
```

Trigger surfaces in Study UI:

- New "Animate this verse" button on every chapter activity card.
- Bulk "Animate this section" on the section header — produces a
  back-to-back chain of per-verse clips.
- Output saved to `lp_published`-style local store so the user can
  rewatch / re-export without re-rendering.

Source files:

- ACR Study text: `study/content/<volume>/<section>.json`
- Engine reuse: `load/book-video/scene-card-engine.js`,
  `book-text-extractor.js` (with a `study-verse-extractor.js`
  variant), `character-bible.js`, `ai-provider-router.js`,
  `timeline-bridge.js`.

Acceptance test:

- Open Bereshit chapter 1 verse 1 in Study → tap "Animate this
  verse" → within ~30 seconds a 5–10 second clip plays inline with
  generated cover + verse narration + suggested music bed.
- Bulk "Animate section" on Bereshit ch1 produces a chained playlist.

### Photo-to-Video (single-image clip)

Already partially implemented in LoadStudio Editing Bay
(`pickAndOpen('image')` wraps a still in a `MediaRecorder`
`canvas.captureStream` capture for ~5 seconds). Needs:

1. **Promote to a first-class engine.** Move the wrap logic into
   `load/book-video/photo-to-video.js` so Load main + Attain (verse
   cover → opening clip) can call it.
2. **Add motion presets:** Ken Burns zoom-in, Ken Burns zoom-out,
   slow pan-left, slow pan-right, parallax (foreground/background
   split via mask). All run on canvas — no AI provider required for
   the basic motions.
3. **Optional AI motion:** when X-AI 14d SiliconFlow image-to-video
   connector lands (or HF SVD becomes free), fall through to a real
   image-to-video model for a more cinematic clip.
4. **Surface in Load main:** a "Photo to Video" tile on the import
   grid (next to "Edit Video"). One-tap → file picker → motion preset
   → clip drops into Load's editor.

Acceptance test:

- Pick a photo in Load main → "Photo to Video" → choose Ken Burns
  zoom-in → 5-second MP4 plays in the editor preview.
- LoadStudio Editing Bay's existing "Upload Image" flow keeps
  working unchanged (it now calls the shared engine internally).

---

## Cross-references

- `MASTER_BACKLOG.md` — X-B2V / X-V2V / X-P2V / X-AI rows.
- `PLAN_LOAD_AI.md` — Tier 14d SiliconFlow connector + 18-fallback
  external video-prompt panel cover the AI image-to-video gap.
- `inbox/Load_AI_Glam_Style_System_Research_and_Developer_Plan.zip`
  — 7-layer chat-driven flow the AI Style Chat will implement.
