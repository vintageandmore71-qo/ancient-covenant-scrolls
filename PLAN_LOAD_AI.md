# Load AI — Merged Build Plan

Single source of truth for the Image Prompt build. Merges:
- The pre-spec lettered roadmap (chat A–N from 2026-04-29)
- The two-PDF spec from `inbox/` (provider strategy + workarounds addendum)
- The four `.docx` directives (Anti-Blur, Lock Providers, Fix Hang, Key Diagnostic)
- The character-consistency zip (`load_ai_character_consistency_with_code.zip`)
- The current code state on `main` at v17dy

Update this file at the end of every shipped version.

---

## Source documents (in `inbox/`)

| File | Role |
|------|------|
| `Load_AI_Free_Open_Source_Provider_and_Image_System_Documentation.pdf` | Full provider strategy + 6-pipeline architecture (A Vision / B Prompt Builder / C Editing / D Generation / E Verification / F Fallback) + capability registry |
| `Load_AI_Deeper_Workarounds_Addendum.pdf` | Browser-first workarounds, Manual Rescue Mode, capability fields, AI Output Receipt, No Image Returned detector, plug-in registry, MVP phasing |
| `AI Prompt Anti Blur.docx` | Classify task → route correctly → reject text-as-success → sharpen/upscale → character consistency → export-prompt fallback |
| `Load AI Lock My Providers Correctly.docx` | Capability checks before every call; never route image jobs to text-only models; skip-and-continue with status messages |
| `Fix Hang & regeneration errors.docx` | 30 s timeout per provider, AbortController, always clear loading in `finally{}`, ADD_OBJECT must route only to image-input + image-output + inpainting providers |
| `AI Key Diagnostic.docx` | Test Keys button, masked key display, status icons (✅⚠️❌⏳🌐), block invalid / text-only providers from image tasks |
| `load_ai_character_consistency_with_code.zip` | Reference JS modules (provider-registry, character-memory, prompt-builder, output-verifier, image-router) + character-profile JSON schema |
| `Load_AI_Glam_Style_System_Research_and_Developer_Plan.zip` | 7-layer Glam clone architecture (chat input → classifier → prompt builder → mask editor → router → verifier → image-to-video), expanded capability flags, named future models (Step1X-Edit, Qwen-Image-Edit, FLUX Kontext, Stable Diffusion / SDXL Inpainting), external-prompt fallback for video (Runway / Kling / Pika / Luma / Wan), source URLs to HF docs |

---

## Provider lock list (per user 2026-04-29 / 2026-04-30 directives)

Every provider has a hard role. Image jobs must NEVER reach a text-only
provider. Edit jobs must NEVER reach a text-to-image-only provider.

| Provider | Role | Image gen? | Image edit / img2img? | Inpaint / mask? | Vision input? | Default state | Notes |
|----------|------|-----------|------------------------|-----------------|---------------|---------------|-------|
| **HF Mistral** (`mistralai/Mistral-7B-Instruct-v0.3`) | chat / prompt rewrite ONLY | ❌ blocked | ❌ blocked | ❌ blocked | ❌ | ON for chat, BLOCKED for image | Pre-call regex `HF_TEXT_ONLY_MODELS` |
| **OpenRouter** (free models) | chat / prompt rewrite ONLY | ❌ blocked | ❌ blocked | ❌ blocked | model-dep | ON for chat, BLOCKED for image | Test Keys row labelled TEXT-ONLY |
| **Cerebras** (Llama 3.1) | chat / prompt rewrite ONLY | ❌ blocked | ❌ blocked | ❌ blocked | ❌ | ON for chat, BLOCKED for image | Test Keys row labelled TEXT-ONLY |
| **Puter.js** | chat + vision + image gen (no key) | ✓ | partial | ❌ | ✓ | ON | First-try default; multimodal |
| **Google Gemini** (free tier) | chat + vision + image edit (Gemini 2.5 Flash Image) | ✓ | ✓ | partial | ✓ | OPT-IN (set key) | Real img2img; single Gemini key powers both chat + Imagen |
| **Anthropic Claude** | chat + vision (paid) | ❌ | ❌ | ❌ | ✓ | OFF (paid; opt-in only) | Excluded from default chain — `dangerous-direct-browser-access` |
| **Pollinations** (classic + Flux + Turbo) | image GEN only — never preservation | ✓ | ❌ | ❌ | ❌ | ON (no key) | Slot 1 default; sharper Flux variant promoted v17do |
| **Hugging Face — image** (`hfImgKey`) | img gen + img2img + inpainting + face-restore + upscale | ✓ | ✓ | ✓ | ✓ via Spaces | ON if `hfImgKey` set | SDXL / FLUX / SDXL-Turbo / GFPGAN / Real-ESRGAN |
| **HF Spaces** (public Gradio) | img2img / inpaint / video / vision (model-dependent, often no token) | ✓ | ✓ | ✓ | ✓ | OPT-IN (item 15) | Florence-2, Qwen2.5-VL, SVD, AnimateDiff, SadTalker, IP-Adapter, InstantID |
| **Cloudflare Workers AI** (`cfToken` + `cfAccount`) | image GEN only (FLUX-schnell, SDXL-Lightning) | ✓ | ❌ | ❌ | ❌ | ON if CF keys set | |
| **Together AI** | image GEN only (FLUX-schnell-Free) | ✓ | ❌ | ❌ | ❌ | OFF (free credits, not sustained) | Opt-in flag |
| **AI Horde** anonymous (SD 1.5 + SDXL slots) | image GEN only, last resort | ✓ | ❌ | ❌ | ❌ | ON (no key) | Slow but free; bottom of chain |
| **Google Imagen** (Gemini 2.5 Flash Image, same key) | image GEN + true img2img | ✓ | ✓ | ❌ | ✓ via Gemini | OFF (free tier, opt-in) | Best free img2img once enabled |
| **DeepAI** (`daiKey`) | image GEN only | ✓ | limited | ❌ | ❌ | OFF (free tier, opt-in) | |
| **SiliconFlow** (`siliconflowKey`) | image GEN + img2img (FLUX Kontext) + image-to-video | ✓ | ✓ | model-dep | ✓ Qwen | OFF (free-**entry** credits, NOT unlimited free) | Per user 2026-04-30 |
| **Fal.ai / Replicate / DeepInfra / Stability / Hyperbolic** | image GEN, sometimes edit | ✓ | model-dep | model-dep | model-dep | REMOVED from default chain | Pay-per-use after free credit; user explicitly excluded |
| **Local SD** (A1111 / ComfyUI / Fooocus on user's Mac/PC) | full edit suite | ✓ | ✓ | ✓ | model-dep | OFF (companion-machine-only; iPad cannot run) | Gated by `localSdUrl` setting |

**Lock rules (enforced in code):**
- `HF_TEXT_ONLY_MODELS` regex (Mistral / Llama / GPT / Qwen / Gemma / Phi / Falcon / MPT / Flan / T5 / BART / Pythia / DeepSeek / Yi / Olmo) blocks pre-call (v17dt)
- `MODEL_CAPABILITIES` flags `text_only: true` for chat-only providers (v17dt)
- `IMAGE_PROVIDERS` entries carry `supportsImg2Img` / `supportsImageOutput` / `supportsImageInput` / `supportsInpainting` (v17dt+)
- `filterImageProvidersForTask` removes incapable providers per task (v17dt)
- `imageGenWithFallback` capability gate skips with status "Skipped X: text-only model" (v17dt+v17du)
- `runImageTask` add_object branch hard-routes to `supportsImg2Img===true` only (v17ds)
- Test Keys diagnostic groups by image-capable vs chat-only and labels TEXT-ONLY explicitly (v17dy)

## Editor Tools / Mask Tools (NOT AI providers)

Per user direction 2026-04-30. These are **client-side editing libraries**
that prepare `sourceImage + mask + prompt` for an AI provider. They
must NEVER be listed in the AI provider chain — they don't generate or
edit pixels with AI; they let the user define the region/intent the AI
provider then acts on.

| Tool | Role | iPad-safe? | Status |
|------|------|-----------|--------|
| **Canvas API** (browser native) | Manual mask painting, erase/refine, crop, before/after compare | ✓ | not wired |
| **Fabric.js** | Object/area selection, layers, manipulable shapes on top of an image | ✓ | not wired |
| **Konva.js** *(optional)* | Higher-level canvas toolkit for layers + shapes if Fabric is too heavy | ✓ | not wired |
| **Cropper.js** *(optional)* | Tap-friendly crop UI | ✓ | not wired |
| **Filerobot Image Editor** *(optional)* | Drop-in editor (filters, text, crop, draw) | ✓ | not wired |

**Lock rules:**
- Editor tools live under a separate "Editor Tools / Mask Tools" header in Settings — never mixed into the AI provider list
- They prepare `sourceImage + mask + prompt` and call `runImageTask({...})` with the result
- If `runImageTask` cannot find a provider that supports image-edit / inpainting, the UI must surface **"Image-edit provider needed"** — never fake the edit, never return the unchanged image as success
- The AI provider chain stays exactly as locked in the Provider Lock List above

**Where they slot into the build:** these tools power roadmap items #1
(Manual Mask painter), #4 (Jimp ops resize/crop/flip/compose), #27
(A/B compare slider), #28 (History gallery), #30 (auto-enhance
pre-processing). The first ship that introduces a Canvas/Fabric tool
will also lay down this structural separation in Settings.



1. Never send image-editing requests to text-only models
2. Never claim an edit succeeded unless image file/blob/URL is returned
3. Provider returns text/JSON/markdown → mark failed and try next
4. Edits route to img2img/inpainting only — never silent text-to-image fallback
5. Capability-based routing, not hard-coded assumptions
6. Every provider call has a hard timeout (45 s LLM / 60 s fallback / 120 s image gen)
7. Loading state must always clear in `finally{}`

## Capability fields (per provider)

Expanded per Glam Style doc (2026-04-30):

`enabled · requiresKey · keyPresent · textOnly · canRewritePrompt · canClassifyTask · canReadImage · canGenerateImage · canEditImage · canInpaint · canUseMask · canReturnImageUrl · canReturnBlob · canReturnVideo · canImageToVideo · maxDurationSeconds · supportsSeed · freeStatus (free / free-tier / paid / unknown) · rate_limit_status`

(legacy synonyms still in code: `text_only · vision_input · image_output · image_edit · image_to_image · inpainting · outpainting · background_removal · segmentation · object_detection · returns_file · returns_url · returns_blob · cost_status`)

## Hard constraint — iPad-runnable + free only

The PWA runs entirely in iPad Safari. Every feature must work via:

1. **Browser (client-side)** — Jimp, OpenCV.js, Transformers.js+WebGPU, Canvas API, Web Speech API, FFmpeg.wasm, browser-image-compression
2. **Free public APIs (no GPU at user's house)** — Pollinations, AI Horde anonymous, Hugging Face Inference + Spaces (free tier), Cloudflare Workers AI free tier, Puter.js, Google Gemini free tier, OpenRouter free models

Tools that require Python + a local GPU (ComfyUI, AUTOMATIC1111, Fooocus, InvokeAI) **cannot run on iPad** and are therefore NOT part of the core plan. They remain available as an *optional companion-machine* path for power users only — not a default route.

## Routing order (iPad + free only)

1. **Browser-side first** (Jimp / OpenCV / Transformers.js) — for compression, crop, flip, simple masks, background removal where the model fits in memory
2. **Pollinations** — text-to-image, no key, no preservation
3. **Hugging Face Inference / Spaces** (free tier with HF token) — img2img, inpainting, face restoration, upscale, vision
4. **Cloudflare Workers AI** (free tier with CF token) — SDXL-Lightning, FLUX-schnell
5. **SiliconFlow** (`api.siliconflow.cn` — free-**entry** credits, NOT truly unlimited free; hosts **FLUX.1 Kontext** for image-to-image / editing, FLUX, Stable Diffusion 3, Qwen vision, image-to-video). Treated as opt-in: default OFF, user adds key in Settings, app warns when credit balance is unknown. Per user 2026-04-30 clarification.
6. **Puter.js** — vision LLM, no key
7. **Google Gemini** (free key) — vision + image edit on free tier
8. **AI Horde anonymous** — last-resort, slow but truly free
9. **Optimized export-prompt fallback** — when no online provider can do the requested edit

(ComfyUI / A1111 / Fooocus on a companion machine = optional only, gated behind explicit `localSdUrl` setting. Default is OFF.)

## Operating modes (iPad-runnable)

- **Browser Mode** — client-side only (compression, crop, mask paint, OpenCV, Jimp, Transformers.js background removal, FFmpeg.wasm video encode)
- **Free Provider Mode** — Puter / Pollinations / HF / Cloudflare / Horde / Gemini / DeepAI

(*Local Engine Mode* — optional, requires user to run a Mac/PC alongside the iPad; not a default path.)

## Consistency modes

- **strict** — preserve face, hair, skin tone, hairstyle, distinctive features, clothing silhouette, visual style, age, body type
- **moderate** — preserve identity + overall style, allow pose/framing variation
- **loose** — reference as inspiration only

## Task types (canonical set)

`generate · improve · add_object · modify_character · change_background · remove_object · inpaint · outpainting · mask_edit · upscale · background_removal · style_transfer · expression_change · pose_change · animate · talking_avatar`

## AI Chat orchestrator — the "secret sauce" (per user 2026-04-30)

This is the dispatcher every user prompt flows through. It is the
piece that makes the app feel intelligent rather than a wrapper
around one provider. Three jobs, in order:

1. **Understand the image** (vision LLM reads the attached image and
   extracts identity / scene / style / palette / lighting context)
2. **Rewrite the prompt internally** (LLM converts "add a bird" into
   a structured edit prompt that includes preservation context, the
   user's actual delta, and explicit task tagging)
3. **Route to the correct model** automatically (`classifyImageTask`
   + capability filter + provider chain — text-to-image gen,
   img2img edit, inpaint, animate, talking_avatar)

```
User input  →  AI Chat orchestrator
                  ├─ vision: read image
                  ├─ rewrite: structured prompt + preservation
                  └─ classify task
                          ├─ generate    → text-to-image chain
                          ├─ edit/inpaint → img2img / mask chain
                          └─ animate     → video chain
                                  ↓
                            correct output (image / video / file)
```

Currently shipped pieces of the orchestrator:
- Vision read (Puter multimodal, optional Gemini/Anthropic) ✓
- Prompt rewrite (every chat LLM emits SD_PROMPT under Scene Lock) ✓
- Classifier (`classifyImageTask` v17ds–v17dv) ✓
- Capability gate (v17dt) ✓
- Routing (image vs edit vs video) — image+edit ✓; **video routing not yet wired**

## Identity Lock — face/style embedding (per user 2026-04-30)

"Same face / same style / same identity across edits" requires a
real embedding-based lock, not just re-uploading the previous image
each turn. The free, iPad-runnable path:

- **IP-Adapter FaceID** via HF Space (free Gradio API, free HF token if rate-limited)
- **InstantID** via HF Space (single reference photo → identity-locked gens)
- **Reference image** stored in `CHAR.refImage` (already in localStorage)
- **Seed locking** for reproducibility on supporting providers (already in CHAR.seed)
- **CharacterCard schema** (per inbox zip) carries the embedding-relevant fields

The PWA never needs to run the embedding model itself — it calls a
public Space that does it. Output is just an image, returned via
the same `imageGenWithFallback` path.

## Character profile (from inbox zip schema)

```
{ id, name, referenceImageId, referenceImageUrl, faceStructure, skinTone,
  ageRange, hair{style,length,texture,color}, eyes{shape,color}, bodyType,
  clothingStyle, lightingStyle, cameraStyle, artStyle, seed,
  consistencyMode: strict|moderate|loose, notes }
```

---

## Pre-spec lettered roadmap (chat A–N audit)

| Letter | Item | Status | Evidence |
|--------|------|--------|----------|
| A | "Lock 5 free additions" / "Pollinations Flux to slot 1" | ✓ done | v17dn + v17do |
| B | Phase 1B — 8-provider rebuild + intent router | ✓ done | v17cy → v17cz → v17dr (now 12 providers) |
| C | Custom-icon treatment to Load topbar | ✓ done | commit `14901f4` (v17cw) |
| D | Tile context-menu icons | ✓ done | commit `14901f4` (v17cw) |
| E | Apply icon set to ACR / Attain / Attain Jr / Study | ❌ NOT done | no commits |
| F | Phase 2 — multi-turn + Save-to-Library + Continue chips | ✓ done | v17db |
| G | Update `PLAN_IMAGE_PROMPT.md` | ✓ done | file committed |
| H | "Something else?" | n/a | meta option |
| I | Fold 5 client-side libs (Jimp / OpenCV / Anime / Lottie / Graphite) | ⚠️ partial | Jimp wired (LOCAL_OPS); OpenCV + Lottie loader stubs only; Anime.js + Graphite not added |
| J | "Stay the course: Phase 2 then Phase 4" | executed | directional |
| K | Phase 4 polish (Lottie anims / OpenCV bg-removal / more Jimp ops) | ❌ NOT done | loaders exist, no UI calls them |
| L | Tier 4 biblical (Verse→Scene / Image→Verse / Visualize as I read) | ❌ NOT done | no code |
| M | Voice-driven editing (Web Speech) | ❌ NOT done | no code |
| N | App Store readiness (NSFW / watermark / privacy / key vault) | ❌ NOT done | no code |

---

## Currently shipped (chronological since v17dn)

| Version | What landed |
|---------|-------------|
| v17dn   | restore v17dg + 5 free providers (12 total) |
| v17do   | Pollinations Flux to slot 1 (blur fix) |
| v17dp   | Scene Lock 1000-char preservation directive |
| v17dq   | task router + character slot + output validation + canvas sharpening + export-prompt fallback + Local SD slot |
| v17dr   | runImageTask facade + soft img2img → text-to-image fallback + smart cleanPrompt extraction |
| v17ds   | ADD_OBJECT hard-route to img2img only + MANUAL_MASK_NEEDED + similarity reject |
| v17dt   | HF Mistral / text-only model regex block + supports{ImageOutput,ImageInput,Inpainting} gate |
| v17du   | withTimeout (45/60/120 s) + AbortController + skipped-reasons surfaced + debug line |
| v17dv   | ADD_OBJECT auto-placement bounding box (sky / ground / on-subject / background / default) |
| v17dw   | Test Keys diagnostic (masked keys + status icons) |
| v17dx   | Output Receipt audit log |
| v17dy   | Test Keys panel grouped image-vs-chat + explicit text-only lock labels |

---

## Spec phases (PDFs) — current status

| Phase | Items | Status |
|-------|-------|--------|
| 1 | provider router, capability map, output validation, no-image-returned detector | ✓ shipped |
| 1.E | Output Verification (vision diff + auto-retry) | ❌ not started |
| 2 | browser compression, cropper, manual mask painter, rembg, HF Spaces, Cloudflare router | ❌ not started |
| 3 | reference memory, character cards, consistency mode toggle UI, OpenRouter / Gemini vision fallback | ⚠️ partial (CHAR slot + Output Receipt) |
| 4 | Local Engine — ComfyUI workflow JSON, IOPaint, SAM 2, ControlNet, IP-Adapter, Real-ESRGAN | ⚠️ partial (A1111 stub only) |
| 5 | video / animation, voice tools, batch generation, plug-in marketplace | ❌ deferred |

---

## Outstanding (carried from previous PLAN_LOAD_AI.md "Outstanding" section)

These items were called out in the previous version of this file and remain
relevant:

- AI Output Receipt — ✓ shipped v17dx (closed)
- Manual Rescue Mode (paint mask, lasso) — Phase 2, still open
- Output Verification pass (vision diff + auto-retry) — Phase 3, still open
- IP-Adapter / InstantID via Local SD — Phase 4, still open
- `runImageTask(opts)` UI entry-point wiring — ✓ shipped v17dr (closed)

---

## Merged forward roadmap

Each row is one small commit. Verify on iPad after each ship. Stop and ask
before opening more than one in flight.

| # | Source | Item | Why this slot | Acceptance test |
|---|--------|------|----|----|
| 1 | spec Ph 2 + Anti-Blur + Fix-Hang | **Manual Mask painter** (Canvas brush overlay → send mask + image to Local SD `/img2img`; for HF inpainting models pass mask via `parameters.mask`) | Unblocks real ADD_OBJECT and inpaint without character drift | Paint over an area, ask "remove this", non-mask area is pixel-identical |
| ~~2~~ | original K | ~~**OpenCV.js wired for "remove background"**~~ — **PARKED v17e3.** 8 MB WASM crashed iPad Safari. Held until lighter path is available. | — | — |
| ~~2-alt~~ | hotfix v17e2 | ~~HF briaai/RMBG-1.4 inference route~~ — **PARKED v17e3.** Also crashed iPad. | — | — |
| 3 | spec Ph 2 | **rembg via Transformers.js (briaai/RMBG-1.4) + WebGPU when available** — re-attempt browser-side bg-removal with the lightest possible model + WebGPU acceleration. Strict iPad memory test before promoting. | After two prior crashes, this is the next attempt at the bg-removal feature | Tab survives loading + running; transparent PNG returned |
| 2-workaround | v17e0 verified | **Manual Mask painter + "remove this" prompt** — paint over the background, send "remove this" → routes to inpaint. Already works as of v17e0. Documented as the interim path until #3 lands. | User confirmed the mask path produces correct edits | (already verified v17e0) |
| 4 | original K | **More Jimp ops in `LOCAL_OPS`** — resize, crop, flip, compose | Cheap offline wins; no AI quota burn | "resize to 512", "flip horizontally" route to Jimp, no provider call |
| 5 | spec Ph 1.E | **Output Verification** (vision LLM compares result vs source → identity / style / instruction match scores → auto-retry once if below threshold) | Closes Pipeline E | Verification line appears in Receipt; auto-retry triggers when score < 0.7 |
| 6 | spec Ph 3 + character-zip | **Character Cards** (multi-profile store: name + reference image + full schema; Settings panel "Cards" section with quick-pick) | Productizes the single CHAR slot; matches inbox schema | Save 2 cards, switch active card, prompt picks up correct profile |
| 7 | spec Ph 3 + Anti-Blur | **3-mode consistency toggle UI** (strict / moderate / loose pill next to Scene Lock) | Spec calls for three modes; only strict is wired | Each mode produces visibly different drift |
| 8 | original K | **Lottie loading animations** (call existing `loadLottie()` stub; ship a small JSON anim during gen) | Replaces silent typing dots; brand polish | Loader plays during 1-30 s gen, vanishes on result |
| 9 | original M | **Voice-driven editing** (Web Speech Recognition → fills the prompt input) | Dyslexia win; matches voice-tools direction | Mic button transcribes "make it brighter and add a tree" |
| 10 | original L (T4-1) | **Verse → Scene** (paste an ACR verse → generate scene) | Biblical differentiator; cross-app | Paste Genesis 1:3, get a sunrise / light scene |
| 11 | original L (T4-2) | **Image → Verse** (upload image → semantic match against 111 ACR chapters) | Biblical differentiator; reverse search | Upload mountain image, top match returns a Sinai / Horeb passage |
| 12 | original L (T4-4) | **Visualize as I read** (ACR chapter scroll triggers per-paragraph gen) | Biggest cross-app integration | Scrolling past a paragraph kicks off async gen, image renders inline |
| 13 | original L (T4-8) | **One-tap Make a Book Cover** (gen result → existing Cover Designer at 4× upscale) | Cross-app integration | "Make book cover" button on result opens Cover Designer pre-loaded |
| 14a | Glam parity | **Curated local style library** (~50 hand-picked style prompts in JSON; replace 8 hardcoded chips) | Glam-AI "2,000+ community styles" parity, browser-only | Tap "watercolor" chip, prompt expands and routes |
| 14b | Glam parity | **Face restoration / photo retouch** via HF Inference (GFPGAN + CodeFormer); chat phrases "smooth skin", "fix my face", "retouch this" | Glam-AI photo-retouch parity, free with HF token | "smooth my face" returns a restored portrait |
| 14c | Glam parity | **Real-ESRGAN upscale engine** wired to HF Inference; chat phrase "upscale this 4×" | Glam-AI upscale parity, free with HF token | "upscale 4x" returns 4× larger PNG |
| 14d | user 2026-04-30 | **SiliconFlow connector** — opt-in only (default OFF). `https://api.siliconflow.cn/v1/...` with bearer key. Hosts **FLUX.1 Kontext** (image-to-image / editing), FLUX, Stable Diffusion 3, Qwen vision, image-to-video. Has cheap / free-**entry** credits but is **NOT truly unlimited free** — must be flagged in Settings the same way Replicate / Together / DeepInfra are flagged for paid-after-credit. Capability flags `supportsImageOutput / supportsImg2Img / supportsImageToVideo`. | Adds FLUX Kontext (best free img2img model currently available) and free-tier SD3 / image-to-video with a different rate-limit budget than HF | Set SiliconFlow key in Settings → image gen + animate routes through it; UI shows "free credits — not unlimited" warning before first call |
| 15 | spec Ph 2 | **HF Spaces connector** (public Gradio APIs for Florence-2, Qwen2.5-VL, SDXL inpaint, GFPGAN, Real-ESRGAN — many require no token) | More truly-free img2img/inpaint paths | Spaces models appear as separate slots |
| 16 | original E | **Cohesive icon set across ACR / Attain / Attain Jr / Study** | Unblocked now that Phase 1B + 2 are done | Brand consistency across all 5 apps |
| 17 | original N | **App Store readiness** — NSFW / safety filter, watermark toggle, privacy text, encrypted key vault, install banner | Submission gate | App Store screening passes |
| 18-fallback | Glam doc 2026-04-30 | **External video-prompt fallback** — when no `canReturnVideo` provider is configured, surface a ready-to-paste prompt for **Runway / Kling / Pika / Luma / Wan** (alongside ComfyUI for image edits). Mirrors the existing `buildSDExportPrompt` for the video path. | "Do not pretend success" — Glam doc explicit rule for video | Ask "animate this" with no video provider → external-prompt panel appears with prompt + provider buttons |
| 18a | user direction 2026-04-30 | **Image → Video tier 1 — basic motion** (browser-only): pan, zoom, parallax, slow Ken-Burns drift on a single still. Canvas + Anime.js + FFmpeg.wasm → exports `.mp4` / `.webm` file. No AI call required. | First win, zero cost, works offline | Tap "Animate" → choose Pan / Zoom / Parallax → 3-5 s clip downloads |
| 18b | user direction 2026-04-30 | **Image → Video tier 2 — Stable Video Diffusion via HF Space** (free, no key for many public Spaces; HF token for rate-limited ones). Image → ~14-frame motion clip → FFmpeg.wasm encode. | Real generative motion (water, wind, hair, slight character motion) | Tap "Animate" → SVD → 3-5 s mp4 |
| 18c | user direction 2026-04-30 | **Image → Video tier 3 — AnimateDiff via HF Space**. Motion module on top of SDXL. Adds prompt-driven camera move + scene motion. | Cinematic 5-15 s clips with prompted motion | "Animate with slow zoom and rain" returns a clip |
| 18d | user direction 2026-04-30 | **Image → Video tier 4 — Talking Avatar / Lip-Sync** via HF Space (SadTalker, Wav2Lip). Image + audio (recorded in-app via MediaRecorder OR generated via Puter / browser TTS) → talking-head clip. | Lip-sync was carried over from earlier scope (v17da reinstated SadTalker) | Upload portrait + speak → portrait speaks back in their face |
| 18e | user direction 2026-04-30 | **Effects layer** — overlay rain / snow / dust / light leaks / lens flares on top of any image OR video output. Canvas-based particle systems composited with FFmpeg.wasm. | Polish; pure browser; free | "add rain" overlays animated rain to the result clip |
| 7a | user 2026-04-30 | **Add object/person** — explicit one-tap flow on top of Mask painter. UI: 🖌 → paint where → "Add a [bird/dog/person/hat/...]" chip or input. Auto-routes to inpaint with the painted mask. (Builds on v17e0 + ADD_OBJECT auto-placement v17dv.) | User asked explicitly; closes the gap between mask + verb | Paint area → tap "Add bird" → bird appears in painted area only |
| 7b | user 2026-04-30 | **Remove object/person** — explicit one-tap flow. UI: 🖌 → paint over object → "Erase" button. Routes to inpaint with `inpainting_fill: 1` (LaMa-style fill). Surfaces "Image-edit provider needed" if no inpaint provider configured. | User asked explicitly; mirror of add | Paint a person in a group photo → tap Erase → person gone, scene patched |
| 7c | user 2026-04-30 + original Wave 3 (P3 Dual-image merge from `PLAN_IMAGE_PROMPT_v3.md`) | **Merge images** (2+ source images → composed result). Two paths: (a) **browser-side composite** — Canvas drag/scale/rotate of a cut-out (rembg first) onto a background, "flatten" exports a single image; (b) **AI-driven blend** — both images sent to an IP-Adapter / FLUX Kontext / Gemini-Image edit provider with a "blend these naturally" prompt. UI: long-press the upload icon → "Add another image" → second slot appears in input bar. Vision-pass should support the "multiple reference images" comparison schema from the spec PDF (`shared_identity_features`, `style_consistency_notes`, `differences_detected`, `continuity_recommendations`). | User asked explicitly; was Wave 3 in original plan (got missed during pre-spec phasing); no current path for "put X from photo A into photo B" | Upload portrait + landscape → "put the person on this beach" → composed result |
| 19a | user 2026-04-30 + original Wave 2 (P2 Batch edit from `PLAN_IMAGE_PROMPT_v3.md`) | **Batch edits** — queue mode. Upload multiple images (or pick from Library) → set one prompt + (optional) one mask template → fire all sequentially with auto-throttling and provider rotation to avoid rate limits. Receipts row per item. Resumable on reconnect via the existing offline queue (#25). | User asked explicitly; was Wave 2 in original plan (got missed); spec Ph 5 batch generation pulled forward | Pick 5 photos, prompt "make cinematic", queue runs, 5 results saved to Library |
| 19 | spec Ph 5 | Voice tools, plug-in marketplace | Deferred until 1–19a land | n/a |

### Tier-4 cross-app backlog (carried from `PLAN_IMAGE_PROMPT.md`)

| # | Source | Item | Notes |
|---|--------|------|-------|
| 20 | T4-7 | **Timeline scrubber + fork** — slide back through edit history; branch a new direction at any earlier point | Builds on Output Receipt log already shipped |
| 21 | T4-9 | **Multi-language prompts** — type / speak in English / Spanish / Hebrew / Greek / Aramaic / Ge'ez; LLM translates | Pairs with item 9 voice editing |
| 22 | T4-10 | **Lockscreen wallpaper export** — "Set as wallpaper" → instructions for iPad lock screen | Cross-app, biblical art use case |
| 23 | T4-12 | **Daily inspiration card** — 3 fresh styles surface on first open each day (no server) | Engagement loop |
| 24 | T4-13 | **Auto alt-text** — AI captions every result automatically | Accessibility + dyslexia |
| 25 | T4-14 | **Offline queue** — queued gens auto-fire when network returns | Matches Load's "work offline" tagline |
| 26 | T4-16 | **Style translation across mediums** — tap a result → "now oil painting / watercolor / stained glass" | Same scene, multiple art mediums |

### Polish backlog (Tier 2 + Tier 3 from `PLAN_IMAGE_PROMPT.md`)

| # | Source | Item | Notes |
|---|--------|------|-------|
| 27 | T2-7 | **Side-by-side A/B compare** — current image \| new result, sliding divider | Tap to commit or undo |
| 28 | T2-8 | **History gallery** — last 20 results in a strip; tap to re-edit / re-prompt / share / save | Builds on IndexedDB receipt log |
| 29 | T3-10 | **Same-prompt cache** — IndexedDB caches `(prompt + image hash) → result` | Instant retries |
| 30 | T3-12 | **Auto-enhance pre-processing** — optional OpenCV pass on upload (denoise, white balance, slight sharpen) | Better downstream input |
| 31 | T3-13 | **Prompt enhance** — user types "make it pro" → LLM expands behind the scenes; "view full prompt" toggle | Power-user transparency |
| 32 | T3-14 | **Camera roll direct picker** — explicit "Choose from Photos" CTA | iPad UX |
| 33 | T3-15 | **PWA share-target manifest** — share an image to Image Prompt from Photos / Safari | One-tap input |
| 34 | T3-17 | **Recipe export** — save edit chain as one-tap recipe, share via JSON | Power user |
| 35 | T3-9  | **Provider health dashboard UI** (data already collected by `PROVIDER_HEALTH`) | Surface hidden state |
| OPT | optional companion | **ComfyUI / A1111 / Fooocus / InvokeAI on user's Mac/PC** — IP-Adapter, InstantID, ControlNet, LoRA workflows. Requires the user to run Python + GPU on a separate machine; iPad just sends requests. NOT a default path; gated behind explicit `localSdUrl` setting in Settings. Already wired (A1111-compat) at v17dq. | Power-user-only; iPad alone cannot do this | User points iPad at `http://192.168.x.x:7860`, edits route via local HTTP |
| OPT-track | Glam doc 2026-04-30 | **Future-track edit models** to evaluate as soon as a free public endpoint becomes available: **Step1X-Edit** (open-source, GPT-4o-class instruction edit), **Qwen-Image-Edit** (semantic + appearance control), **FLUX Kontext** (instruction edit; SiliconFlow hosts), **HF SDXL Inpainting** (`diffusers/stable-diffusion-xl-1.0-inpainting-0.1`), **HF SD-1.5 Inpainting** (`stable-diffusion-v1-5/stable-diffusion-inpainting`). Tracking-only — not in roadmap until free / iPad-callable. | Glam-quality edit fidelity once one of these has a sustained-free endpoint | Provider entry added with capability flags when available |

**New pre-18 items added per user direction 2026-04-30:**

| # | Source | Item | Why this slot | Acceptance test |
|---|--------|------|----|----|
| 5b | user 2026-04-30 | **Identity Lock — face/style embedding** via IP-Adapter FaceID + InstantID through HF Spaces. Stores reference embedding via `CHAR.refImage` (browser-only); calls public Gradio Space for the actual lock. | "Same face / same style / same identity across edits" requires real embeddings, not just re-uploading the prior image | Save a face card → 5 successive edits keep the same face |
| 5c | user 2026-04-30 | **Prompt-rewriting layer** (already partially shipped via Scene Lock LLM SD_PROMPT). Promote to explicit pre-pass: every user prompt + image goes through a vision-LLM rewrite that emits a structured `{positive, negative, preserve, region, taskType}` JSON object before routing. | "Add a bird" → structured edit instruction with preservation directives, not raw text. This is the AI Chat secret sauce. | Console shows structured JSON; the JSON is what reaches the provider, not raw user text |

**Recommended order:** 1 → 2 → 3 → 4 → 5 → 5b → 5c → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14a → 14b → 14c → 14d → 15 → 16 → 17 → 18a → 18b → 18c → 18d → 18e → 19. OPT is unblocked at any point but never required.

Any of those can be reordered if a user request shifts priority — but
each one stays a single small commit, with cache bump and an entry
in `VERIFIED_LOG.md` after sign-off.

---

## Original-wave → merged-item map (audit cross-reference)

Items from earlier wave plans (`PLAN_IMAGE_PROMPT.md` and
`PLAN_IMAGE_PROMPT_v3.md`) cross-referenced into this merged plan so
nothing is silently dropped.

| Original wave | Description | Merged-plan item | Status |
|---------------|-------------|------------------|--------|
| Wave 1 | P1 Scene Lock + first-use popup | (shipped v17dd, hardened v17dp) | ✓ |
| **Wave 2** | **P2 Batch edit** | **#19a** | NOT done |
| **Wave 3** | **P3 Dual-image merge** | **#7c** | NOT done |
| Wave 4 | Global help index | (post-spec; not in roadmap) | parked |
| Wave 5 | Encrypted key vault | covered by #17 (App Store readiness) | NOT done |
| Wave 6 | Pipeline A — Vision / structured-JSON analysis | (was shipped v17dh, rolled back; needs re-ship as part of orchestrator) | re-do |
| Wave 7 | Pipeline B — Prompt Builder + 3 modes | #5c (structured rewrite) + #7 (3-mode toggle) | NOT done |
| Wave 8 | Pipeline D — multi-image continuity + saved profiles | #6 (Character Cards) + #7c (merge) | NOT done |
| Wave 9 | Pipeline E — Output Verification + auto-retry | #5 | NOT done |
| Wave 10 | Pipeline C — manipulation tools UI + region edit | #1 (mask painter ✓) + #7a (Add) + #7b (Remove) | partial — #1 ✓ |
| Wave 11 | Pipeline F + Capability Registry cleanup | shipped v17dq–v17dy | ✓ |
| Wave 12 | Phase 4 Polish (Lottie / OpenCV / Jimp ops) | #2 (OpenCV bg-rm) + #4 (Jimp ops) + #8 (Lottie) | NOT done |

## Live tip

`main` at v17dy. Backups for every shipped version exist as
`backup/2026-04-30-v17d{n,o,p,q,r,s,t,u,v,w,x,y}` on origin.

---

## LoadPlay backlog (added 2026-05-02 — must complete before launch)

Tracks the work derived from the Load Studio / Load Play Build Plan +
the PWA Cinema Build Manual + every user request through 2026-05-02.
Stable backup of the current LoadPlay tip:
`backup/2026-05-02-loadplay-v19` → `ed355a7`. v20+ work continues on
`claude/fix-session-sending-TVMbW` and is fast-forwarded to `main`
after each push (Pages serves from `main`).

### Tier 0 — admin / test infrastructure (in progress, v20)

- [x] Admin · Test Mode area inside Developer Lab — gated by SHA-256
  developer login (Devtest1 + hashed access key). Site-wide red TEST
  MODE banner when ACTIVE; "ACTIVE" chip on the Developer sidebar item.
- [x] Mock data engine — IndexedDB (`loadplay_test`, store `kv`),
  schema v1, localStorage fallback. JSON Export / Import carries
  `schemaVersion` for migrations. Mulberry32 PRNG, fixed seed for
  repeatable generation.
- [x] Generate Mock Members / Generate Mock Activity / Reset /
  Export / Import buttons. Volume presets (25 / 100 / 500).
- [x] Diverse SVG avatar generator (age band, skin-tone palette of 6,
  gender presentation, style accent). 100% offline, royalty-free,
  deterministic per member-id. Slot for future PNG/portrait overrides
  in `LoadPlay/avatars/`.
- [x] Mock activity simulates views, likes, saves, follows,
  partial / completed watches. Trending = decayed sum (7-day half-life).
- [x] Sign-in-as-Mock-Member picker (impersonate any generated
  account; saves session as `role: 'mock-viewer'`, `isMock: true`).
- [x] Action log panel (last 50 events, timestamped) for verifying
  generation counts and trending math.
- [x] Every demo record carries `isMock: true` so a future production
  switch can hide or wipe demo data in one pass.

Safety rules (locked in code comments + behavior): no real-people
photos, no scraping, no public-user photos, royalty-free only.

### Tier 1 — most-visible build-plan gaps (next up)

1. **Profile editing page** — display name, banner upload, profile
   image upload, bio. Reachable from sidebar Viewer · Viewer Profiles.
2. **Watch History** sidebar item — Tubi/YouTube-style list of
   recently-watched items, sortable, with resume support.
3. **Settings page** in sidebar — surface subtitle preferences,
   audio language, autoplay toggle, content-filter level.
4. **Multi-step Upload Wizard** — replaces the single-step file
   picker currently triggered by Creator Upload / Upload Wizard.
   Steps: title details / poster / trailer / category / rights /
   credits / safety scan / preview / publish or save draft. Saves
   to `drafts` until published.

### Tier 2 — playback shell expansion

5. **HTML cinema package player** — open a `.cinepwa.zip`, render
   via the PWA Cinema Build Manual's Scene JSON spec.
6. **Audio-story playback** — non-video content type with cover art,
   chapters, and progress.
7. **Per-project pages** — dedicated landing for each published
   item: description, credits, rights, related items.

### Tier 3 — real implementations behind the Developer Lab gate

8. **PWA Diagnostics** — manifest reachable, SW registered, icons
   resolvable, scope OK, IndexedDB capacity check.
9. **Manifest Checker** — fetch + parse manifest.json, surface issues.
10. **Service Worker Checker** — list registered SWs, controllers,
    cache contents, version of active SW.
11. **API Keys panel** — per-provider key entry + local storage,
    mirroring `load/image-prompt`'s pattern.
12. **Package Validator** — open `.cinepwa.zip` / `.loadstudio.zip`,
    validate structure against the manual's schema.

### Tier 4 — marketplace & safety completion

13. **Marketplace cart / checkout** for paid items (currently free
    items unlock instantly; paid items toast "coming soon").
14. **Real Safety Scan** — text + image at upload time. Blocks
    publish for fails, returns to Drafts with notes.

### Outstanding decisions (carried)

- **Inbox files privacy** — leave `inbox/` public on the repo, or
  scrub from history (destructive)?
- **`acr2026` rotation** — three standalone HTMLs still use plaintext
  `acr2026`. Awaiting new password to hash + replace across
  `ACR-Study-Standalone.html`, `ACR-Records-Standalone.html`,
  `Attain-Standalone.html`. Reminder lives in `HANDOFF.md`.
