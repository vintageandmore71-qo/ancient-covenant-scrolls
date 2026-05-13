# LoadStudio v44 — Handoff Reference

## Verified Live Status

- Cache string: `loadstudio-complete-v44`
- User-confirmed on iPad: service worker active, PWA opens as installed site, splash screen intact, main sections visible
- Confirmed date: 2026-05-13
- Merged commit SHA (main): `7e70733a570880bf8d04addef1f611ffa0cbe5d4`
- PR: #68 (squash merged to main)

## Backup Branch

- Name: `backup/2026-05-13-loadstudio-v44`
- Points at: `7e70733a570880bf8d04addef1f611ffa0cbe5d4`
- Recovery: `git checkout backup/2026-05-13-loadstudio-v44`

## Commit References

| SHA | Description |
| --- | --- |
| `7e70733` | Final squash merge — LoadStudio v44 (PR #68, main HEAD) |
| `38b59ff` | Fix duplicate HTML IDs (section-dashboard-legacy, lsEbLaunchCardVN) |
| `cee74a4` | Pass 2 completion — sw.js assets, schema fields, BUILD_AUDIT |
| `131f88d` | Pass 2 — 5 new sections, 17 JSON data files, updated schemas |
| `b5a5dbb` | Pass 1 completion — 12 AI production sections, Display Controls |
| `5358506` | Pass 1 — 13 AI director sections |

## What Was Added in v44

### Sections (18 new, 60 total)

- `display-focus-controls` — readability and focus toggles, localStorage-persisted
- `director-ai` — shot list generator with style, pacing, and beat inputs
- `character-stability` — per-character consistency scoring (face, skin, body, hair, wardrobe, era, style)
- `text-to-video` — prompt builder (Integration Required)
- `image-to-video` — motion prompt builder (Integration Required)
- `video-stylizer` — style transfer prompt builder (Integration Required)
- `sfx-generator` — sound effect cue builder with cue sheet export (Integration Required)
- `voice-character-engine` — voice profile sliders and render queue (Integration Required)
- `video-outpainting` — frame extension prompt builder (Integration Required)
- `prompt-writer` — freeform prompt authoring with prompt log save
- `multilingual` — SRT placeholder export for translation (Integration Required)
- `production-board` — scene list with move-up/move-down reordering
- `provider-report` — provider attempt log with export
- `own-image-clone` — user-owned image clone studio with rights metadata
- `continuity-engine` — 7-score continuity check per take
- `reference-pack` — reference pack builder per character
- `prompt-lock` — prompt lock compiler reading character DNA from localStorage
- `scene-proof` — asset proof system; marks complete only when filePath, blobUrl, or externalUrl is present

### JSON Data Files (21 new)

`director-ai.json`, `character-stability.json`, `own-image-clones.json`, `provider-routing.json`,
`prompt-log.json`, `generation-report.json`, `continuity-report.json`, `asset-declarations.json`,
`voices.json`, `wardrobe.json`, `props.json`, `locations.json`, `looks.json`,
`reference-packs.json`, `approved-takes.json`, `rejected-takes.json`, `scene-proof.json`

Plus schema extensions to `scenes.json` (20 new fields) and `characters.json` (20 new fields).

### Other Changes

- `sw.js` bumped from `loadstudio-complete-v43` to `loadstudio-complete-v44`; all new JSON files added to ASSETS array
- `BUILD_AUDIT.json` updated: `sections_count: 60`, all 18 new section IDs listed
- `app.js` extended: LS_META entries for all 18 new sections; JS handlers for every new module
- `display-focus-controls` toggles apply body classes and persist to localStorage
- Free-first provider strategy: Pollinations Flux, AI Horde, browser TTS as defaults; paid providers off by default

## Integration Required Sections

The following sections have no working generation without external API connections.
They are labeled with `.ls-integration-badge` in the UI and must never be marked complete
without a real filePath, blobUrl, or externalUrl as proof:

- `text-to-video`
- `image-to-video`
- `video-stylizer`
- `sfx-generator`
- `voice-character-engine` (note: browser TTS is wired in for offline fallback, but full voice profiles require an external service)
- `video-outpainting`
- `multilingual` (SRT export works offline; actual translation requires a provider)
- `scene-proof` (the proof system enforces no false completion across all generation modules)

## No False Positives Rule

No generation module may report success without a verified output artifact.
The Scene Proof System (`scene-proof.json`, `approved-takes.json`) enforces this in data.
The JS Scene Proof handler enforces it in UI: the Mark Complete action is blocked unless
`filePath`, `blobUrl`, or `externalUrl` is present in the take record.
Never change this behavior.

## Readability Controls

The Display & Focus Controls section (`display-focus-controls`) provides 7 user-facing toggles.
These exist because some users need larger text, more spacing, reduced visual clutter, or
plain language to use the interface comfortably. These controls must:

- Always be reachable from the toolbar or drawer
- Always persist their state to localStorage on change and restore on page load
- Never be removed, hidden behind a paywall, or made harder to reach
- Apply cleanly without breaking section layout at any toggle combination

Body classes applied: `ls-large-text`, `ls-comfortable-spacing`, `ls-reduced-clutter`,
`ls-focus-mode`, `ls-stepbystep`, `ls-plain-lang`, `ls-contrast-safe`.

## What Must Not Be Touched

- **Cache version** — `loadstudio-complete-v44` must never go backward. Next build must be v45 or higher.
- **Scope filter in sw.js activate handler** — the filter `k.indexOf('loadstudio-')===0` is intentional. It prevents this service worker from deleting other apps' caches on the same origin. Do not remove this filter.
- **Section IDs** — all 60 `id="section-*"` attributes are referenced by `lsNav()`, LS_META, drawer nav, and the BUILD_AUDIT. Do not rename them.
- **Scene Proof enforcement** — the "without proof, it is not complete" rule is a product rule, not a UI nicety. Do not add a bypass.
- **ACR Reader** — root-level files (`index.html`, `acr.css`, `sw.js`, `content/`) are locked. Do not touch them.
- **Integration Required labels** — do not remove them from AI generation sections. They are accurate. Removing them would be a false positive.

## Next Recommended LoadStudio Build Step

Provider wiring is the logical next phase. The UI shells for all 18 AI modules exist and are labeled
Integration Required. The next build should wire at least one real provider per generation type using
the same free-first strategy already defined in `provider-routing.json`:

Priority order (matches free-first strategy):
1. Pollinations Flux — image generation, already used in Load image-prompt
2. AI Horde — image generation fallback
3. Browser TTS (`speechSynthesis`) — voice character engine offline fallback
4. OpenRouter (user-supplied key) — text/prompt generation in Director AI and Prompt Writer
5. Hugging Face Inference API (user-supplied key) — audio/sfx fallback

Before starting provider wiring:
- Confirm with user which generation type to wire first (image, voice, or sfx)
- Do not wire paid-only providers without explicit user approval
- Bump sw.js to `loadstudio-complete-v45` on any JS/HTML/CSS change
- Update BUILD_AUDIT.json if section count or feature count changes

## Cold Start for Future Sessions

1. Read `CLAUDE.md`, this file, `SESSION_NOTES_2026-05-13.md`, `HANDOFF.md`
2. `git log --oneline -10` — confirm main HEAD is `7e70733`
3. `git fetch origin main && git merge origin/main --no-edit` before any push
4. Check `loadstudio/BUILD_AUDIT.json` to confirm current section count and feature count
5. Read `loadstudio/sw.js` line 1 to confirm current cache version
6. Do not begin a build without confirming the above three values match this document
