# Plan: "Image Prompt" feature for Load — v2 (Glam-AI-class)

Source: `inbox/3rd Load_AI_Image_Editor_PROVIDER_FALLBACK_FIXED.zip`.
User decisions locked: name **Image Prompt**, cohesive Load integration,
goal = match Glam AI Chat features as closely as the iPad-PWA constraint allows.

---

## Honest evaluation of the uploaded chat PWA

### What it is

A 950-line single-file PWA that does:
- Multi-provider **text chat** (Puter, Gemini, OpenRouter, Cerebras, Anthropic, HF Mistral)
- Auto-fallback to vision providers when an image is attached
- Asks the LLM to write a `SD_PROMPT:` line; HF Inference then runs that prompt against SDXL / SD 1.5 / FLUX-schnell with image-to-image at strength 0.65
- localStorage persists keys + preferences
- Atkinson Hyperlegible font (dyslexia-friendly — keep this!)
- Service worker excludes API hosts from caching (correct)

### What it actually delivers vs. Glam AI's promise

| Feature in your docx | Current PWA | Gap |
| --- | --- | --- |
| Conversational edit ("add a leather jacket") | Sends image to SDXL with strength 0.65 — **largely re-generates** the picture, identity drifts | Needs real inpainting + mask generation |
| Prompt-only generation | ✅ via HF SDXL/FLUX | OK, just slow on cold start |
| Multi-turn refinement | ❌ image is discarded after each turn | Needs persistent "current image" state |
| Community styles (2,000+) | ❌ hardcoded 8 starter chips | Bundle ~50 curated locally instead — no server needed |
| Hairstyle try-on | ❌ | Needs specialized model (HairFastGAN / Stable Hair) |
| Headshot from selfie | ❌ | Needs PhotoMaker / InstantID for face preservation |
| Background change | ❌ | Needs segmentation (rembg / SAM) + inpaint |
| Motion swap (image → video) | ❌ | Needs SVD or AnimateDiff |
| Photo retouching | ❌ | GFPGAN / CodeFormer can do this client-server-free |

### File-quality observations

**Strong points (keep):**
- Provider abstraction (`callProvider` switch) is clean
- Vision auto-fallback logic
- HF model cascade with cold-start (503) handling
- localStorage schema is sane
- SW config is correct (no API caching)

**Weak points (fix in v2):**
- `anthropic-dangerous-direct-browser-access: true` — Anthropic key gets exposed to the browser; risky to ship in an App Store app. Drop or hide behind a "personal-use, advanced" toggle.
- `SD_PROMPT:` extraction via regex is fragile — sometimes the LLM forgets the line
- No request cancellation (user can't abort a slow gen)
- No retry / streaming UX
- No multi-turn image state — every prompt restarts from the user's upload
- No undo / history of generated images
- No "save to Load Library" path (must be a download)
- HF "img2img" at strength 0.65 ≠ inpainting; identity drifts heavily
- Welcome chips are hardcoded; can't grow without code changes

---

## Recommended 8-provider lineup

User asked: "8 different providers across the board to swap through as limits hit."
The current PWA mixes chat and image gen on HF. We separate them into two
swap-pools (chat pool + image pool) so each kind of request fails over to
peers of the same kind.

### Chat pool (5 providers — text only)

Order = primary → fallback. All free or have a free tier.

| # | Provider | Why | Key needed? |
| --- | --- | --- | --- |
| 1 | **Puter.js** | Zero-setup, free, signed-in via Puter | No |
| 2 | **Google Gemini 2.5 Flash** | Fast, free tier, vision-capable | Free Google AI key |
| 3 | **OpenRouter (free models)** | DeepSeek-R1, Llama-3.3, Mistral via one key | Free OR key |
| 4 | **Cerebras (Llama 3.1 8B)** | Very fast, free tier | Free Cerebras key |
| 5 | **HF Inference Chat (Mistral 7B)** | Fallback if all others rate-limit | HF token |

Drop Anthropic from the default ladder — keep it as an opt-in advanced setting only, with a clear warning that the key is browser-visible.

### Image pool (8 providers — generation, edit, retouch)

Order = quality preference, but the runtime swaps based on which one is
healthy/available. Each provider gets an *intent* tag so the router knows
when to call it.

| # | Provider | Intents | Key needed? | Notes |
| --- | --- | --- | --- | --- |
| 1 | **Pollinations.ai** | text-to-image | **No key**, no registration | URL-based: `https://image.pollinations.ai/prompt/<encoded>`. Best zero-friction default. |
| 2 | **Hugging Face Inference** | text-to-image, img2img, inpaint, retouch | Free HF token | SDXL, FLUX-schnell, SDXL-inpaint, GFPGAN, CodeFormer, rembg |
| 3 | **Cloudflare Workers AI** | text-to-image | Free CF account, daily limits | Fast SDXL + Dreamshaper, simple API |
| 4 | **Together AI** | text-to-image | Free key | FLUX-schnell, very fast |
| 5 | **Fal.ai** | text-to-image, edit | Free credits | FLUX, very fast, good quality |
| 6 | **AI Horde / Stable Horde** | text-to-image | Anonymous tier | Free unlimited, slower (volunteer GPUs) |
| 7 | **Replicate** | photomaker, instantid, hairfastgan, gfpgan, svd, anything-goes | Free credits then pay-as-you-go | Most variety; only call for specialized intents |
| 8 | **Google Imagen via Gemini API** | text-to-image | Same Google AI key as chat | Native gen, bundled with chat key |

**Why these 8:**
- 5 are completely free with no card: Pollinations, HF, Cloudflare, Together, AI Horde.
- 2 have free credits sufficient for personal use: Fal.ai, Replicate.
- 1 reuses an existing key: Imagen via Google AI key.
- Together they cover **every Glam-AI feature** in your docx (see mapping below).

### Total: 13 providers (5 chat + 8 image)

Slight overage from "up to 8" — but you said "across the board". 13 covers
chat + image with proper swap pools. If you want exactly 8 total, drop the
weakest from each (Cerebras + Imagen-via-Gemini both reuse keys, so they're
the natural cuts). Recommend keeping all 13.

---

## Glam-AI feature → provider routing map

Each chat turn parses user *intent* (LLM-classified or keyword-matched),
then routes to the right model. This is the key architectural change.

| User says… | Intent | Primary model | Fallback chain |
| --- | --- | --- | --- |
| "Make a sunset beach landscape" | text-to-image | Pollinations (free, fast) | HF FLUX-schnell → Cloudflare SDXL → Together FLUX → Horde |
| "Add a leather jacket to him" | inpaint-with-mask | HF SDXL-inpaint + Grounding-DINO mask | Replicate inpaint |
| "Change background to mountains" | bg-replace | rembg (HF) + SDXL-inpaint | Replicate background-replace |
| "Make my selfie a LinkedIn headshot" | identity-preserve-gen | Replicate PhotoMaker / InstantID | HF PhotoMaker |
| "Try blonde hair on this photo" | hair-edit | Replicate HairFastGAN | Replicate Stable-Hair |
| "Smooth the skin / fix my face" | retouch | HF GFPGAN / CodeFormer | Replicate GFPGAN |
| "Upscale this 4x" | upscale | HF Real-ESRGAN | Replicate Real-ESRGAN |
| "Animate my photo" | image-to-video | Replicate SVD (Stable Video Diffusion) | Replicate AnimateDiff |
| "Change car color and add a spoiler" | iterative-edit | Persisted image + SDXL-inpaint | Multi-step refinement |

**Intent classification:** the chat LLM (Puter or Gemini) is asked to
return a one-word intent + a structured payload. Keep falling back to
"general gen" if it fails.

---

## Out-of-the-box innovation ideas (rank by ROI)

### Tier 1 — must-have for Glam-AI parity

1. **Persistent "current image" state** — every gen result becomes the next
   turn's input image automatically. Multi-turn refinement at last works
   like a real conversation. Single biggest UX upgrade.
2. **Intent router** — see table above. The LLM picks the model per turn.
3. **Save to Load Library button** — every generated image one-tap saves as
   a `kind:'media', subKind:'image'` library item. Fits the suite naturally.
4. **OpenCV.js + Jimp local pre/post-processing** — runs entirely in the
   browser. Free, instant, offline. Use for crop / brightness / contrast /
   vignette / sharpen / blur / denoise. AI handles the AI work; OpenCV
   handles the boring stuff. Keeps Load offline-first.

### Tier 2 — big polish wins

5. **Voice-driven editing** — Web Speech Recognition listens to "make
   it brighter and add a hat", processes hands-free. Massive dyslexia
   benefit (and matches your existing voice-tools direction).
6. **Curated local style library** — bundle ~50 hand-picked style prompts
   (cyberpunk, oil painting, vintage film, headshot-pro, watercolor, etc.)
   in JSON, ship with the PWA. Zero server, instant. Replaces the
   hardcoded 8 chips.
7. **Side-by-side A/B compare** — current image | new result, sliding
   divider. Tap to commit or undo.
8. **History gallery** — last 20 results in a strip; tap to re-edit /
   re-prompt / share / save. IndexedDB-stored so it survives refresh.

### Tier 4 — biblical / cross-app innovations (only this project can do these)

These are the features that make Image Prompt unique to your suite —
no generic AI image app has them because they require an embedded
biblical text library, an existing Cover Designer, an existing reader,
and a multi-app PWA framework. We have all four.

T4-1. **Verse → Scene** — paste any verse from ACR, AI generates the
      scene. While reading, tap a verse → "Visualize this".
T4-2. **Image → Verse reverse search** — upload an image, semantic
      match against all 111 ACR chapters, return the closest passage.
      Search by picture.
T4-3. **Character consistency database** — define Paul / Moses / John /
      Avraham *once* with a face reference. Every future gen reuses
      that face via InstantID / IP-Adapter.
T4-4. **"Visualize as I read" mode** — open a chapter in ACR, tap
      "illustrate as I scroll", side-by-side reader auto-generates an
      image per paragraph. Killer integration feature.
T4-5. **Sketch-to-image** — draw rough lines on a canvas, AI fills in
      the scene via ControlNet (free via HF).
T4-6. **Style cloning** — upload 3-5 of your existing artwork pieces,
      AI learns your style via IP-Adapter, applies to all future gens.
T4-7. **Timeline scrubber + fork** — slide back through edit history,
      branch a new direction at any earlier point.
T4-8. **One-tap "Make a Book Cover"** — generated image → Load's
      existing Cover Designer pre-loaded at 4x upscale + bleed
      margins. Direct path from inspiration to finished book.
T4-9. **Multi-language prompts + voice** — type or speak in English /
      Spanish / Hebrew / Greek / Aramaic / Ge'ez. Whisper transcribes;
      LLM translates if needed. For biblical scholars and bilingual
      readers.
T4-10. **Lockscreen wallpaper export** — tap "Set as wallpaper", get
       installation instructions for iPad lock screen.
T4-11. **Encrypted key vault** — optional passphrase-protected
       localStorage for API keys. Hardens App Store submission.
T4-12. **Daily inspiration card** — 3 fresh style ideas surface on
       first open each day. Engagement loop, no server.
T4-13. **Auto alt-text** — AI captions every result automatically.
       Accessibility + dyslexia win.
T4-14. **Offline queue** — queue gens while offline, auto-fire when
       network returns. Matches Load's "work offline" tagline.
T4-15. **Verse-to-storyboard video** — single verse → 5-shot animated
       mini-film. Combines T4-1 + image-to-video. 30-second parable.
T4-16. **Style translation across mediums** — tap a generated image:
       "now in oil painting" / "now watercolor" / "now stained glass" —
       explore the same scene across art mediums.

### Tier 3 — nice-to-have differentiators

9. **Provider health-board** — track latency + success-rate per provider
   over a rolling window. Auto-prefer the fastest healthy one.
10. **Same-prompt cache** — IndexedDB caches `(prompt + image hash) → result`
    so retries are instant.
11. **NSFW / safety filter** — local heuristic + optional Cloudflare
    moderation API. Necessary for an App Store submission.
12. **Auto-enhance pre-processing** — when an image is uploaded, optional
    OpenCV pass: denoise, white balance, slight sharpen. Makes everything
    downstream look better.
13. **Prompt enhance** — user types "make it pro", LLM expands behind the
    scenes to a full SD prompt with lens, lighting, color grade. Show a
    "view full prompt" toggle so power users can edit.
14. **Camera roll direct picker** — currently file picker only; add an
    explicit "Choose from Photos" CTA so iPad users skip the file dialog.
15. **Drop on iPad share sheet** — share an image to Image Prompt from
    Photos / Safari and it lands as the input. Requires PWA share-target
    intent in `manifest.json` — small change.
16. **Result watermark toggle** — optional "Made with Image Prompt" subtle
    watermark for sharing. Off by default.
17. **Recipe export** — save your edit chain ("upload → headshot mode → upscale →
    sharpen") as a one-tap recipe. Share recipes between users via JSON.

---

## Phased build (revised)

### Phase 1A — drop-in (~30 min) — was the original Phase 1

Same as before: copy files into `load/image-prompt/`, rename strings, add
Workspace tile, fullscreen iframe overlay. Ship as v17ct. **No code changes
to the chat PWA itself yet.** This validates the integration mechanics.

### Phase 1B — provider rebuild (~3-4 hr)

Replace the current chat-only provider list with the **5+8 split**:
- Add Pollinations / Cloudflare / Together / Fal / AI Horde / Imagen image
  provider modules.
- Build the **intent router** (LLM classification + keyword fallback).
- Drop Anthropic from default chain; move to advanced settings with warning.
- Add provider-health tracking + auto-skip unhealthy ones.

### Phase 2 — multi-turn + memory (~3-4 hr)

- Persistent current-image state (each gen becomes the next input).
- IndexedDB result history.
- Save-to-Load-Library button.
- Side-by-side A/B compare with slider.

### ~~Phase 3 — Glam-AI specialty modes~~ ❌ CUT (2026-04-29 user direction)

User explicitly chose to keep ONLY the conversational chat experience.
No specialty mode UIs. Cut from scope:

- ~~Hairstyle try-on~~
- ~~Headshot mode~~
- ~~Background change as a dedicated mode~~
- ~~Retouch mode~~
- ~~Upscale mode~~
- ~~Image-to-video animation as a button~~ (the screenshot user shared
  showed this in Glam, but user clarified they don't want it as a feature)

Tier 4 cuts that follow the same rule (specialty UIs):
- ~~T4-3 character consistency database~~
- ~~T4-5 sketch-to-image~~
- ~~T4-6 style cloning (IP-Adapter)~~
- ~~T4-15 verse-to-storyboard video~~

What stays in scope: text + image generation/edit purely through
conversational chat. The chat itself can still send image-edit prompts
to inpaint models — but only because the user typed an instruction, not
through a specialty button.

**Note 2026-04-29 (later in session):** SadTalker reinstated to scope.
User confirmed they want it kept. SadTalker is image-to-talking-avatar
(server-side Python tool). Integration approach: hosted endpoint (e.g.
HF Space) reachable from the chat, called when the user types something
like "animate this photo speaking these words". Stays a chat-driven
feature, not a button.

### Phase 4 — polish (~2-3 hr)

- Local OpenCV.js + Jimp filters.
- Curated 50-style local library.
- Voice-driven editing (Web Speech Recognition).
- Camera roll picker + share-target manifest.
- Prompt enhance behind the scenes.
- Provider-health dashboard.

### Phase 5 — App Store readiness

- NSFW / safety filter (mandatory for review).
- Watermark toggle.
- Privacy policy text in Settings.
- Move all keys into a single Settings → Image Prompt page (vs the current
  multi-section panel).

---

## Decisions still needed before Phase 1A

(unchanged from v1, but with new tile-icon recommendation now that we
know it does *image editing*, not just chat):

- [ ] Tile icon: **🎨 (palette)** vs ✨ (sparkle) vs 🖼 (frame). Recommend 🎨.
- [ ] Tile position: end of Workspace row (recommended). Keeps it next to
      Voice Studio / Sound Studio / Voice Manipulator / Voice Library.
- [ ] Show in AI Helper menu? Recommend no — its own tile only.
- [ ] Default provider on first launch: **Puter for chat, Pollinations for
      image gen**. Both zero-key, work immediately on first install.

---

## Risk register

| Risk | Mitigation |
| --- | --- |
| iPad Safari blocks `fetch` to some providers via CORS | All 8 image providers have public CORS or work via simple URL fetch (Pollinations is plain GET) |
| App Store review rejects browser-side API key storage | Keys live in localStorage which is fine; the issue is `anthropic-dangerous-direct-browser-access` — drop Anthropic from default chain |
| AI Horde slow (volunteer GPUs) | Use only as last-resort fallback, never primary |
| Inpaint quality varies by model | Provide an "intent override" in settings so power users can pick the model |
| Replicate free credits run out fast | Charge per-feature: only specialty modes (hair / headshot / video) hit Replicate; standard text-to-image goes through free providers |
| Image-to-video latency (~30-60s on SVD) | Show progress + estimated time; let user cancel |

---

## UX target — matching the Glam AI screenshots (user-supplied, 2026-04-29)

The user sent two iPad screenshots showing exactly what the experience
should feel like. Capturing them here so the build can hit the target
without ambiguity.

### Screenshot A — image-to-video flow ("Animate the scene")

**User input:**
- Uploaded a still image (top-right, in a chat bubble)
- Typed text below: *"Animate the scene, the storm is tossing the boat
  the men are afraid"*

**AI response:**
- Heading line: **Video Created** (bold) / *Video Animation* (subtitle/caption)
- Inline video player tile (auto-plays), about 60% width, left-aligned
- Action row directly under the video:
  - ⬇ **Save** (filled white pill, the only labeled action)
  - + (Add to collection / new bubble)
  - ↗ Share
  - 👍 Like
  - 👎 Dislike
- Follow-up text from AI: *"Here's your animated scene. Would you like
  me to make any adjustments or continue with another step?"*

**Input bar (always visible at bottom):**
- Top row: pill labelled **✦ Tools** (left)
- Placeholder: *"Describe your idea or ask"*
- Bottom row: **+** (attach, far left) … **↑** (send, far right)

**Implication for our build:**
- This is the **Image-to-Video / animation intent**. Already in the plan
  as Phase 3, routed to Replicate SVD or AnimateDiff.
- The "Tools" pill is a slide-up sheet of features (Animate / Edit /
  Generate / Upscale / Headshot / Hairstyle / Background / Retouch).
  Replaces our current chat-only input.

### Screenshot B — image-edit flow ("make me cool look")

Marketing capture from the Glam AI App Store listing. Shows the image
EDIT flow (no video).

**User input:**
- Uploaded selfie (right-aligned bubble, ~40% width)
- Text: *"make me cool look"*

**AI response:**
- Heading line: **Image Created**
- Image tile, ~60% width, left-aligned
- Caption under the image: *Image Edit*
- Action row: ⬇ download · ↗ share · 👍 like · 👎 dislike (no Save pill
  here — the download icon is the standalone primary action)

**Header:**
- × (close) · ⊙ Glam AI brand mark · "Glam AI"

**Implication for our build:**
- Same input bar as Screenshot A
- Each result card has: heading ("Image Created" / "Video Created") + sub-label
  ("Image Edit" / "Image Generation" / "Video Animation") + media + action row
- The "edit vs. generation" distinction comes from whether the user attached an image
- The 👍 / 👎 are *feedback*, used to bias the next turn (the LLM sees thumbs-down
  → "the user disliked the previous result, try a different style/model")

### What our v2 build needs to nail visually

1. **Result card component** — matches the layout above:
   ```
   [Heading bold]
   [Sub-label dim]
   [Media tile, max 60% width, rounded]
   [⬇ ↗ 👍 👎 row, all 44px hit targets]
   ```
2. **Tools pill above the input bar** — opens a sheet of intents:
   - 🎨 Edit this image · ✨ Generate from text · 🖼 Headshot · 💇 Hairstyle
   - 🌅 Change background · 💆 Retouch face · 🔍 Upscale · 🎬 Animate
3. **Multi-turn state** — uploading once binds the image to the conversation;
   "make me cool" / "now make it night" / "now animate it" all chain.
4. **Follow-up suggestion text** after every result — *"Here's your X.
   Would you like me to make any adjustments or continue with another step?"*
   Two tappable chip suggestions render under it: "Try a different style" /
   "Add to my Library".
5. **Like / Dislike feedback** — tracked locally, fed to the next prompt
   as a system hint ("user disliked: too dark, use brighter palette").
6. **Save button** — green path: tap **⬇ Save** → image lands in Load's
   main Library as `kind: 'media', subKind: 'image' | 'video'`. No need
   for the iPad share sheet to be the only export.

### Brand / chrome

- Header should read **Image Prompt** (not "Glam AI" or "Prompt Studio")
- A small accent mark on brand — the existing PWA uses a starburst (✦);
  keep that or pick a fresh one we like
- Atkinson Hyperlegible font (already in the file — keep)
- Dark mode by default to match the screenshots; auto-follow system later

---

## Source ZIP location

`inbox/3rd Load_AI_Image_Editor_PROVIDER_FALLBACK_FIXED.zip` — kept on `main`.
The 950-line `index.html` inside is the starting point. v1 plan said
"copy + rename"; v2 plan says "copy → rename → rebuild provider list →
add intent router → add multi-turn state". Phase 1A still ships first as a
drop-in to validate the integration.
