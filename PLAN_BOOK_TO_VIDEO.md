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
