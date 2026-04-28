# Plan: "Image Prompt" feature for Load

Source files: `inbox/3rd Load_AI_Image_Editor_PROVIDER_FALLBACK_FIXED.zip`
+ `inbox/Load AI Image Editor .docx`. Status: not built yet.

User decisions made:
- Name: **Image Prompt** (NOT "Prompt Studio")
- Cohesive integration into Load (lives inside Load, not standalone)

---

## What's actually in the upload (verified, not guessing)

The ZIP contains a 950-line self-contained PWA called "Prompt Studio".
It's **multi-provider AI chat with image upload** — not an image editor.

- Providers built in: Puter, Gemini, OpenRouter, Cerebras, Anthropic
- Auto-fallback to vision-capable provider when an image is attached
- Each provider key stored in localStorage on the user's device
- Has its own `sw.js`, `manifest.json`, fonts, icon

The .docx describes Glam-AI-style features (conversational photo edit,
hairstyle try-on, headshot generation, motion-swap). The ZIP code does
not actually do those — it's chat that can SEE images, not edit them.

So we have two distinct pieces of work:
- **Phase 1**: ship the chat PWA inside Load, renamed to "Image Prompt"
- **Phase 2**: add real image-editing features (separate, larger work)

---

## Phase 1 — drop-in integration (~30 min, low risk)

### Files to add
- New folder: `load/image-prompt/`
- Copy 7 files from `prompt-studio/` ZIP into it:
  `index.html`, `sw.js`, `manifest.json`, `icon.png`,
  `fonts/atkinson-400.woff2`, `fonts/atkinson-700.woff2`

### Renames (Prompt Studio → Image Prompt)
8 places in `index.html`:
- L9  `<meta name="apple-mobile-web-app-title" content="Prompt Studio">`
- L12 `<title>Prompt Studio — AI Chat</title>`
- L244 welcome title `Prompt Studio`
- L286 panel hint `Prompt Studio automatically routes…`
- L417 footer `Prompt Studio — AI Chat`
- L785 OpenRouter `X-Title:'Prompt Studio'` (fine to keep or rename)
- L895 download filename `prompt-studio.png` → `image-prompt.png`
- L934 second welcome title `Prompt Studio`

In `manifest.json`:
- L2 `"name": "Prompt Studio — AI Chat"` → `"name": "Image Prompt — AI Chat"`
- L3 `"short_name": "Prompt Studio"` → `"short_name": "Image Prompt"`

In `sw.js`:
- L1 `const CACHE = 'prompt-studio-v5-provider-fallback'` → `const CACHE = 'image-prompt-v1'`

### Load integration

In `load/index.html` (Workspace shortcuts row, near line 150 after the
Voice Library tile):
```html
<button class="home-ws-tile" data-home-ws="imgprompt" id="home-ws-imgprompt">
  <span class="home-ws-icon">&#127912;</span>  <!-- 🎨 -->
  <span class="home-ws-label">Image Prompt</span>
  <span class="home-ws-dir">AI chat: describe images, generate, refine</span>
</button>
```

In `load/load.js` (workspace-tile click handler, ~line 5881 after the
`vlib` branch):
```js
else if (act === 'imgprompt') {
  openImagePrompt();
}
```

Add `openImagePrompt()` that mounts a fullscreen iframe overlay
pointing at `image-prompt/index.html` (relative to /load/), with a
close button. Same pattern as the existing `openWorkspaceHub` /
viewer-screen flows. Reasons for iframe vs inlining:
- Keeps the chat self-contained (its own SW scope, no cross-talk)
- 950 lines of HTML inlined would risk CSS collisions with Load
- Easier to update later: drop a new ZIP version, no merge conflicts

### Cache bumps
- `load/sw.js` `load-v17cs` → `load-v17ct`
- `load/load.js` on-screen badge `v17cs` → `v17ct`
- Image Prompt's own SW stays at its scoped cache, so users get fresh
  builds independently when we update either side

### Verification before marking Phase 1 done
1. Pages publishes; user opens Load in cache-busted URL
2. Home → Workspace shortcuts → tap "🎨 Image Prompt" tile
3. Iframe overlay opens; welcome screen says "Image Prompt"
4. Tap settings, paste a free Gemini key (or Puter signed-out)
5. Send a test prompt; reply renders
6. Close button returns to Load home
7. Create `backup/<date>-v17ct` per the mandatory backup rule

### Risks / things to confirm before building
- **iPad iframe sandbox**: Some PWA behaviors don't work in iframes
  (e.g. install prompts, full-screen video). Test that AI providers
  still reach their APIs from inside the iframe.
- **Service worker scope conflict**: Image Prompt's `sw.js` has scope
  `/load/image-prompt/`. Load's `sw.js` has scope `/load/`. The child
  scope is allowed and won't fight the parent.
- **localStorage isolation**: keys saved by Image Prompt live under
  the `dssorit.github.io` origin, same as Load. They share storage
  but different keys, which is fine.

---

## Phase 2 — real image editing (separate, larger work)

The .docx asks for things the chat code can't do today. Each requires
a different API, and each is its own implementation:

| Feature | Needs | Notes |
| --- | --- | --- |
| Generate from text | Image gen API | Gemini Imagen (free tier), FLUX via Replicate, Stable Diffusion via HF Inference |
| Conversational edit ("add jacket") | Image-to-image / inpainting | FLUX-Fill, SDXL inpaint, Gemini Edit |
| Hairstyle try-on | Specialized API | Most are paid. CodeFormer for face, but hair editing is hard |
| Headshot from selfie | Specialized API | PhotoAI / Astria / Replicate "headshot" flows; usually paid |
| Motion swap (image → video) | Video gen API | Stable Video Diffusion, Runway, Pika — all paid except small free tiers |
| Background change | Inpainting + segmentation | Free options exist (HF + remove.bg) |

Phase 2 sub-decisions to make next session:
1. Which providers to support (recommend: Gemini Imagen first — free
   tier, fits user's stated HF preference)
2. Whether to extend the existing chat UI with action buttons or
   build a separate "Edit" panel
3. Cost ceiling for paid APIs (or skip them for now)

Don't start Phase 2 until Phase 1 is shipped and the user has used it
for a few days — usage will reshape what's worth building.

### Free AI / open-source options (user-provided list)

Vetted these against PWA-on-iPad-Safari constraints. ✅ = runs fully
client-side in the browser; ⚠ = needs network or server; ❌ = doesn't
fit the iPad-Safari-PWA model.

**Open-source JS libraries (drop into the codebase):**

| Tool | Fits PWA? | Best use in Load |
| --- | --- | --- |
| **Jimp** | ✅ pure JS, in-browser | Resize / crop / blur / filter — fastest path to "client-side image edits". Zero network. |
| **OpenCV.js** | ✅ runs in-browser (large WASM ~8 MB) | Face detection, feature tracking, segmentation — enables "remove background", "find faces" without an API |
| **Anime.js** | ✅ tiny | UI animations, transitions on rendered images |
| **Lottie.js** | ✅ tiny | Render lightweight JSON animations alongside generated images |
| **Graphite** | ⚠ partly — desktop-first; web build experimental | Vector / raster editing — keep an eye on web-stable releases |

**External web-based editors (open in iframe or as Workspace tile):**

| Tool | Fits PWA? | Notes |
| --- | --- | --- |
| **Wick Editor** | ⚠ web-based, opens in iframe | Animation + game creation. Could embed as a tile like Image Prompt. |
| **Motionity** | ⚠ web-based | After-Effects-style motion graphics. iframe candidate. |
| **SadTalker** | ❌ Python/server-only today | Talking-avatar from still image. Would need a hosted endpoint (HF Spaces, Replicate). Not client-side. |

**Recommended Phase-2 build order using these:**

1. **Jimp** first (smallest add) — gives instant client-side filters,
   crop, blur. No API key needed. Pure-JS = works fully offline.
2. **OpenCV.js** for "remove background" + face detection (powers
   future hairstyle/headshot features). Heavy WASM but a one-time load.
3. **Lottie.js** + **Anime.js** for the UX layer — make the editing
   feel responsive without a backend.
4. **Wick / Motionity** as iframe Workspace tiles only if the user
   wants timeline-style animation editing.
5. **SadTalker** is the only true AI animation in the list — and it
   requires a server. Defer until Phase 2's API decisions are made.
6. AI generation/edit (Gemini Imagen, FLUX, SDXL inpaint, etc.) layers
   on top — the open-source libs handle pre/post-processing locally,
   the API handles the actual gen/edit step.

This staging keeps Load's "work offline" tagline intact for as much
as possible — the network only gets touched when the user explicitly
asks for AI generation.

---

## Open questions to resolve before building Phase 1

These are small enough to answer next session in <2 minutes each:

- [ ] Tile icon: 🎨 (palette) vs 🖼 (frame) vs 💬 (chat bubble)
      — recommend 🎨
- [ ] Tile position: end of Workspace row vs near the AI Helper tile
      — recommend end of row (matches recently-added pattern)
- [ ] Should Image Prompt also appear in the AI Helper menu, or only
      as its own tile? — recommend its own tile only, to keep it simple
- [ ] Default provider on first launch: Puter (signed-out, free) vs
      Gemini (needs free key) — recommend Puter (zero setup)

---

## Recovery / safety

- Source ZIP + docx live in `inbox/` on `main`, recoverable forever
- Today's verified working backup: `backup/2026-04-28-acr-v16` (`91581c7`)
- Phase 1 will create `backup/<date>-v17ct` after user verifies it works
