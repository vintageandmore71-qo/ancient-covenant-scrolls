# Icon Concepts (user-uploaded 2026-04-29)

**Source:** `inbox/deliverable_premium_icon_pack.zip` + `_v2.zip`. Captured here so the inbox copies can be deleted.

**Files preserved at:** `designs/icon-concepts/`

## Pack contents

Each PNG is a 3-icon concept sheet (left → middle → right).

### Pack v1 (base style)

| File | Left | Middle | Right |
| --- | --- | --- | --- |
| `01_media_images_film.png` | Media | Images | Film |
| `02_audio_music_ai.png` | Audio | Music | AI |
| `03_help_creative_characters.png` | Help | Creative | Characters |
| `04_children_child_baby.png` | Children | Child | Baby |

### Pack v2 (futuristic variants)

Same 12 concepts, restyled in a futuristic look:

| File | Left | Middle | Right |
| --- | --- | --- | --- |
| `01_media_images_film_futuristic.png` | Media | Images | Film |
| `02_audio_music_ai_futuristic.png` | Audio | Music | AI |
| `03_help_creative_characters_futuristic.png` | Help | Creative | Characters |
| `04_children_child_baby_futuristic.png` | Children | Child | Baby |

## Use plan

These are **concept sheets**, not production-ready assets. To use:

1. Slice each sheet into 3 separate square PNG files (~512×512 each)
2. Or convert the artwork to inline SVG (matching the existing v17cv-v17cw monoline icon system)
3. Pick base or futuristic style per app context:
   - Load main app: probably the base v1 style (matches current cohesive system)
   - Future kids variant (Attain Jr): could use v2 futuristic for Kids/Baby/Children icons
   - Image Prompt: futuristic-AI variant of #2 (the AI icon)

## Mapping to existing UI work

We already have hand-drawn SVG icons for Load's Workspace tile row (v17cv) and topbar/context menu (v17cw). These concept PNGs are alternatives to compare against, OR to slice for App Store / marketing assets where bigger raster is needed.

**Where each concept fits in the current UI:**

| Concept | Current Load tile / use | Action |
| --- | --- | --- |
| Media | (none yet — could be a "Media library" tile) | Possibly slice for Library section header |
| Images | Image Prompt tile | Compare vs. current SVG; if better, swap |
| Film | Video → Audio tile | Compare vs. current SVG |
| Audio | Sound Studio tile | Compare vs. current SVG |
| Music | Voice Library tile | Compare vs. current SVG |
| AI | AI Copilot tile | Compare vs. current SVG |
| Help | Help tile | Compare vs. current SVG |
| Creative | (no current tile — could be "Create New" home button) | Use for Create flow |
| Characters | (Image Prompt has none yet — Pipeline D character system fits) | Reserve for W8 character profile UI |
| Children | Attain Jr launcher | Use as Attain Jr branding |
| Child | Reserved | TBD |
| Baby | Reserved | TBD |

## Action items (queued)

- [ ] User picks base vs. futuristic style for Load main
- [ ] If picking futuristic: slice the relevant PNGs and swap into the Workspace tile system
- [ ] If sticking with current SVGs: archive these concepts for marketing/App Store use only
- [ ] For App Store: a 1024×1024 launcher icon is required — these concept sheets are good source material

No code changes triggered yet. Decision deferred until after Image Prompt build is stable (parked option E in Image Prompt plan).
