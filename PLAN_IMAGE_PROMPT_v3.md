# PLAN — Image Prompt v3 Spec (multi-pipeline architecture)

**Source:** user-provided spec, 2026-04-29 session.
**Status:** captured here verbatim. Build will happen in waves —
see "Build sequence" at the bottom.

This document is the canonical reference for the multi-pipeline
architecture. The shorter `PLAN_IMAGE_PROMPT.md` covers the original
linear waves (P1-P3, help index, encrypted vault, Phase 4 polish).
This doc covers the architectural rewrite that follows.

---

## Goal

Build a multi-model AI image system that supports:

1. image understanding
2. image editing
3. image generation
4. image consistency
5. image manipulation
6. multi-image continuity
7. fallback routing when free models fail

This system must NOT assume one free AI model can do everything.

Allow users to:
- upload one or more images
- ask what the image shows
- ask for edits
- keep characters, faces, outfits, props, and style consistent
- manipulate specific parts of an image
- generate new images based on prior images
- receive an edited image, newly generated image, or fallback prompt
  if no image model is available

---

## System Architecture

Six separate pipelines:

- **A. Vision / Image Analysis Pipeline**
- **B. Prompt Builder / Consistency Builder**
- **C. Image Editing / Manipulation Pipeline**
- **D. Image Generation Pipeline**
- **E. Output Verification Pipeline**
- **F. Fallback Pipeline**

---

## A. Vision / Image Analysis Pipeline

Use a vision-capable model only.

Use this for:
- describe this image
- what do you see
- identify objects
- identify style
- compare images
- detect consistency
- detect problems
- read visible text
- generate edit instructions from uploaded image
- extract character identity traits

The vision model returns structured JSON:

```json
{
  "image_description": "",
  "subjects": [],
  "character_count": 0,
  "character_profiles": [
    {
      "name_or_label": "",
      "gender_presentation": "",
      "estimated_age_range": "",
      "skin_tone": "",
      "face_shape": "",
      "eye_shape": "",
      "hair_color": "",
      "hair_style": "",
      "body_type": "",
      "distinctive_features": [],
      "clothing": [],
      "pose": "",
      "expression": "",
      "accessories": []
    }
  ],
  "objects": [],
  "background": "",
  "style": "",
  "palette": [],
  "composition": "",
  "lighting": "",
  "problems_detected": [],
  "recommended_edit_prompt": "",
  "can_edit_directly": true
}
```

If multiple reference images, compare and return:

```json
{
  "shared_identity_features": [],
  "style_consistency_notes": [],
  "differences_detected": [],
  "continuity_recommendations": []
}
```

---

## B. Prompt Builder / Consistency Builder

Convert these inputs:
- user request
- uploaded image(s)
- extracted vision traits
- prior character / style memory

…into a clean prompt for image editing or generation.

Must preserve:
- same character identity
- same face
- same hairstyle
- same clothing if requested
- same art style
- same color palette if requested
- same prop / object identity
- same environment if requested

**Three modes:**

1. `strict_identity_preservation`
2. `moderate_identity_preservation`
3. `loose_inspiration_mode`

**Strict example:**
> "Preserve the exact same character identity from the reference image. Keep the face shape, skin tone, hair texture, hairstyle, eye shape, age range, body type, and outfit design consistent. Maintain the same visual style and overall character appearance. Only change the facial expression to fear."

**Moderate example:**
> "Keep the same general character identity and style, but allow natural variation in pose and framing."

**Loose example:**
> "Use the uploaded image as inspiration only. Do not replicate exactly."

---

## C. Image Editing / Manipulation Pipeline

Use an image-capable model only.

For:
- remove object
- replace object
- swap background
- change expression
- change pose
- recolor clothing
- add accessories
- fix hand or face issues
- expand image
- crop image
- clean up artifacts
- change lighting
- restyle image
- inpaint a selected area
- outpaint the canvas
- make image more cinematic
- preserve character while changing scene

**Supported manipulation types:**

1. **inpainting** — edit only selected region while preserving the rest
2. **outpainting** — expand image beyond existing borders
3. **object removal** — remove unwanted elements
4. **object replacement** — replace an item with a different item
5. **background replacement** — keep subject, change environment
6. **expression manipulation** — keep identity, alter emotional expression
7. **pose manipulation** — keep identity, alter pose
8. **style transfer / style locking** — keep same subject, change or preserve art style
9. **color / lighting manipulation** — change mood, exposure, color tone, time of day
10. **image cleanup** — improve detail, reduce artifacts, sharpen or restore

**If the selected model does not support region editing:**
- generate a precise edit prompt
- preserve as much identity as possible
- state that region-level editing is unavailable
- try next provider automatically

---

## D. Image Generation Pipeline

Use this when the user wants:
- a new image from scratch
- a new scene with the same character
- multiple scenes with continuity
- a new pose or setting based on prior references

**For continuity across several images:**
- generate a character profile first
- store that profile
- attach reference images to future prompts
- include locked identity traits in every generation prompt

**For multi-image continuity, use:**
- one or more reference images
- saved character profile
- saved style profile
- saved wardrobe profile
- saved prop / background notes

**Each new scene prompt must explicitly state:**
- keep same character identity
- keep same art style
- keep same clothing (or change only what is specified)
- keep same hairstyle unless otherwise requested
- preserve color and mood continuity if requested

---

## E. Output Verification Pipeline

After every image generation or edit, run a second-pass vision check.

Compare result against:
- original reference image
- saved character profile
- user instructions

Return structured verification:

```json
{
  "identity_match_score": 0,
  "style_match_score": 0,
  "instruction_match_score": 0,
  "differences_found": [],
  "passed": true
}
```

**If result fails consistency threshold:**
- try one automatic retry with a stronger preservation prompt
- if it still fails, show user the result and offer:
  1. Retry with stricter consistency
  2. Use fallback model
  3. Copy optimized prompt

---

## F. Fallback Pipeline

If no free image editing model is available:
- do not pretend editing succeeded
- return a high-quality optimized prompt instead
- explain clearly that the current provider cannot return an image

**Fallback format:**

```json
{
  "success": false,
  "type": "fallback_prompt",
  "message": "No image editing model is currently available. Use the prompt below in a compatible image editor.",
  "optimized_prompt": ""
}
```

---

## Model Capability Map

```js
const MODEL_CAPABILITIES = {
  "modelA": {
    text: true,
    vision: false,
    imageGeneration: false,
    imageEditing: false,
    inpainting: false,
    outpainting: false,
    consistencySupport: false
  },
  "modelB": {
    text: true,
    vision: true,
    imageGeneration: true,
    imageEditing: true,
    inpainting: true,
    outpainting: false,
    consistencySupport: true
  }
};
```

**Hard rules:**
- Do not send image editing requests to text-only models
- Do not send vision tasks to text-only models
- Do not assume image generation means image editing is supported
- Do not assume image editing means region editing is supported

---

## Provider Routing

Preferred order, automatic fallback:

1. Puter image-capable model
2. Puter vision-capable model
3. Gemini image model if exposed through Puter
4. Pollinations free image generation
5. Hugging Face image inference endpoint
6. Replicate community / free model
7. local browser-based fallback
8. optimized prompt fallback

**Pseudo-code:**

```js
async function routeImageTask({
  taskType,
  prompt,
  referenceImages = [],
  editMask = null,
  consistencyMode = "strict"
}) {
  const providers = [
    "puter-image",
    "puter-vision",
    "gemini-image",
    "pollinations",
    "huggingface",
    "replicate",
    "fallback-prompt"
  ];

  for (const provider of providers) {
    try {
      const result = await runProvider(provider, {
        taskType,
        prompt,
        referenceImages,
        editMask,
        consistencyMode
      });

      if (result && result.success) {
        return result;
      }
    } catch (err) {
      console.warn(`Provider failed: ${provider}`, err);
    }
  }

  return {
    success: false,
    type: "fallback_prompt",
    message: "All image providers failed. Returning optimized prompt.",
    optimizedPrompt: prompt
  };
}
```

---

## Reference Image Memory

Persistent reference storage for consistency. Store:
- character profile
- style profile
- background profile
- wardrobe profile
- prop profile

Each saved project:

```json
{
  "projectId": "",
  "characterProfiles": [],
  "styleProfile": {},
  "wardrobeProfiles": [],
  "propProfiles": [],
  "referenceImageUrls": []
}
```

When user says:
- "keep same character"
- "same woman as before"
- "same outfit"
- "same style"
- "make next scene match previous"

…the app fetches previous references automatically.

---

## Consistency Rules

**`strict`:**
- preserve face shape
- preserve eye shape
- preserve skin tone
- preserve hairstyle
- preserve distinctive features
- preserve clothing silhouette unless changed
- preserve visual style
- preserve age appearance
- preserve body type

**`moderate`:**
- preserve identity and overall style
- allow some framing and pose variation

**`loose`:**
- use reference as inspiration only

---

## Manipulation Tools in UI

Clear user-facing tools:
- Remove
- Replace
- Change background
- Expand image
- Crop
- Restyle
- Change expression
- Change pose
- Recolor
- Add object
- Remove object
- Repair face/hands
- Match previous character
- Match previous style

**Optional advanced UI:**
- brush mask tool
- lasso selection
- preserve face toggle
- preserve outfit toggle
- preserve style toggle
- strict consistency toggle

---

## Task Detection

**Vision pipeline triggers** (route to A):
- "what is this"
- "describe this"
- "is this the same character"

**Editing / generation pipeline triggers** (route to B+C+D):
- "edit"
- "fix"
- "remove"
- "change"
- "replace"
- "make consistent"
- "keep same character"
- "same face"
- "new scene with same person"

---

## Examples

**Example 1:**
User: "Make this character look more scared and keep the same face."

System:
1. analyze image
2. build identity profile
3. generate edit prompt:
   "Edit the uploaded image while preserving the exact same character identity. Keep the same face shape, skin tone, hairstyle, eye shape, body type, age appearance, clothing, and illustration style. Increase fear by widening the eyes, raising the brows, opening the mouth slightly, and making the posture more tense. Do not change the background."
4. send to image editing model
5. verify result matches identity

**Example 2:**
User: "Create a new image of this same woman walking in the rain."

System:
1. analyze reference image
2. store character profile
3. build generation prompt:
   "Generate a new image of the same woman shown in the reference image. Preserve her identity, face shape, skin tone, hairstyle, and overall visual style. Show her walking in the rain on a city street. Keep the tone cinematic."
4. generate image
5. verify consistency

**Example 3:**
User: "Remove the microphone from this image but keep everything else the same."

System:
1. detect manipulation type = object removal
2. if mask tool available, remove microphone only
3. preserve subject, style, and background
4. verify result

---

## Debug / Safety Rules

- Never claim image editing succeeded unless an actual image is returned
- If a provider only returns text, treat that as a failed image-edit call
- If image input is inaccessible, repair upload flow before calling provider
- If base64 fails, retry with stored URL
- If provider lacks required capability, automatically skip it
- Show provider status in UI:
  - "Analyzing image…"
  - "Building consistency prompt…"
  - "Editing image…"
  - "Trying backup model…"
  - "Image editing unavailable, returning optimized prompt…"

---

## Final Requirement

The app must support:
- image understanding
- image editing
- image generation
- image consistency
- image manipulation
- multi-image continuity
- fallback prompt generation

It must intelligently separate vision, prompt building, editing, and consistency handling instead of expecting one free model to do everything.

---

# Build Sequence

The original `PLAN_IMAGE_PROMPT.md` waves continue first, then this
spec gets layered on top. Order:

| Wave | Source | Status (2026-04-29) |
| --- | --- | --- |
| **Wave 1** — P1 Scene Lock + first-use popup framework | original | ✅ Shipped (v17dd) |
| **Wave 2** — P2 Batch edit | original | 🔜 Next |
| **Wave 3** — P3 Dual-image merge | original | pending |
| **Wave 4** — Global help index | original | pending |
| **Wave 5** — Encrypted key vault | original | pending |
| **Wave 6** — Spec Pipeline A (Vision / structured-JSON analysis) | this doc | pending |
| **Wave 7** — Spec Pipeline B (Prompt Builder + 3 modes) | this doc | pending |
| **Wave 8** — Spec Pipeline D (multi-image continuity + saved profiles) | this doc | pending |
| **Wave 9** — Spec Pipeline E (Output Verification + auto-retry) | this doc | pending |
| **Wave 10** — Spec Pipeline C (manipulation tools UI + region edit) | this doc | pending |
| **Wave 11** — Spec Pipeline F + Capability Registry cleanup | this doc | pending |
| **Wave 12** — Phase 4 Polish (Lottie / OpenCV / etc.) | original | pending |

**Estimated time for Waves 6-11:** ~15-17 hours of focused work,
spread across 3-5 sessions.

---

## Cross-references

- Original waves: `PLAN_IMAGE_PROMPT.md`
- Source ZIP: `inbox/3rd Load_AI_Image_Editor_PROVIDER_FALLBACK_FIXED.zip`
- Pre-launch checklist (toggle Gemini Image back on after stable):
  see "PRE-LAUNCH CHECKLIST" at bottom of `PLAN_IMAGE_PROMPT.md`

---

# Full Provider/Tool List (user-supplied 2026-04-29)

User shared a 58-item free / free-tier / open-source provider list.
Tracked here permanently so future sessions know exactly what's
wired vs. deferred.

## Cost model (user's framing — accurate)

- Software cost: free
- Model / tool code: usually free / open-source
- Running it locally on your own computer: free after you own the computer
- Running it in the cloud: usually free only with limited free tiers
- Running it commercially at scale: NOT free because of GPU / server costs

## Wired today (~15% of full list)

| # | Item | Status |
| --- | --- | --- |
| 1 | Puter.js | ✅ chat + vision (multimodal GPT-4o-mini class) |
| 2 | Pollinations AI | ✅ image gen |
| 3 | HF Inference (image + Mistral chat) | ⚠ partial |
| 5 | Cloudflare Workers AI | ✅ image gen |
| 21/22 | SD / SDXL Inpainting | ⚠ via HF only, no proper inpaint route |
| 36 | Llama (open) | ⚠ via OpenRouter free |
| 37 | Mistral | ✅ via HF chat |

## Wave 6.5 expansion targets (browser-only / no backend)

These plug into the existing chain via HF Inference API or browser
WASM. No GPU server required.

| # | Item | Wave 6.5 plan |
| --- | --- | --- |
| 4 | HF Spaces | Generic Gradio API caller |
| 15 | SAM 2 | Browser ONNX port (~150 MB) for masks |
| 17 | Florence-2 | HF Inference for captioning + object detection |
| 20 | LaMa Cleaner / IOPaint | HF Space for clean inpainting |
| 24 | rembg / RMBG-1.4 | HF Inference for background removal |
| 26 | BiRefNet | HF Inference for fine-edge cutouts |
| 27 | Real-ESRGAN | HF Inference for upscaling |
| 29 | GFPGAN | HF Inference for face restoration |
| 30 | CodeFormer | HF Inference for face repair |
| 31 | Qwen2.5-VL | HF Inference vision fallback |
| 32 | LLaVA | HF Inference vision fallback |
| 34 | BLIP-2 | HF Inference image captioning |

## ⚠ DEFERRED — needs self-hosted GPU server (revisit later)

User direction (2026-04-29): "We will save ComfyUI server for later,
remind me, keep those providers for then." Capture full list so any
future session can pick up the backend project quickly.

Required infrastructure when we revisit:
- A box (cloud GPU rental ~$5-10/mo, or own a GPU PC)
- ComfyUI / AUTOMATIC1111 / Forge / InvokeAI as the backbone
- API wrapper exposing endpoints to Image Prompt
- Optional auth so only Load can hit it

Full deferred provider list, in priority order for that future build:

| # | Item | What it unlocks |
| --- | --- | --- |
| 6 | **ComfyUI** | Best node-based pipeline; FLUX, SDXL, IP-Adapter, ControlNet, inpaint, outpaint, ClipVision, etc. |
| 7 | AUTOMATIC1111 SD WebUI | Stable Diffusion + extension ecosystem |
| 8 | SD WebUI Forge | Optimized A1111 alt, lower VRAM |
| 9 | InvokeAI | Friendlier canvas + inpaint UI |
| 10 | **IP-Adapter** | True reference-image style/identity transfer |
| 11 | **InstantID** | Face identity preservation across gens |
| 12 | **ControlNet** | Pose / depth / edge / layout lock |
| 13 | LoRA | Saved character / style adapters |
| 14 | DreamBooth | Train a model on a specific subject |
| 21 | SD Inpainting (proper) | Region-aware fill |
| 22 | SDXL Inpainting (proper) | Higher-quality regional edits |
| 23 | Flux Fill | Modern inpaint workflows |
| 46 | AnimateDiff | Image-to-video animation |
| 47 | Deforum SD | Prompt-based animation sequences |
| 48 | Stable Video Diffusion | Image → short video |
| 49 | Wan open video models | Open video gen workflows |

The 7 free providers Image Prompt already uses don't go away when we
add the backend — the backend just becomes a NEW provider that gets
prioritized for editing/consistency tasks. Routing chain expands;
nothing breaks.

## Voice / audio (separate scope from Image Prompt)

| # | Item | Where it belongs |
| --- | --- | --- |
| 40 | Piper TTS | Already parked in Load (see SESSION_NOTES_2026-04-27/28) |
| 41 | Coqui TTS | Future Voice Studio expansion |
| 42 | eSpeak NG | Accessibility fallback |
| 43-44 | Whisper / Whisper.cpp | STT for voice commands (T4-9 in plan v2) |
| 45 | Vosk | Offline STT fallback |
| 50 | FFmpeg | Already used for Audio I/O export in Load |

## Hosting / compute / dev (infra, not features)

| # | Item | Notes |
| --- | --- | --- |
| 51-53 | Colab / Kaggle / Codespaces | Dev/testing only; not production |
| 54 | Cloudflare Workers Free | Already used for image gen (#5); could become router for hidden keys |
| 55-56 | Vercel / Netlify | Static hosting alts to GitHub Pages |
| 57 | Supabase | Future user-project storage if we go server-backed |
| 58 | Firebase | Alt to Supabase |

---

---

# Deeper Workarounds Addendum (user-supplied 2026-04-29)

Companion notes to the main spec. Captures the deeper workaround
layer: browser-side rescue tools, manual recovery flows, plug-in
architecture, debugging logic, output verification, and combining
free / free-tier / open-source tools as ONE practical creator system.

## Core principle

Load AI should behave like a **command center, not a single-model
prompt box**. Each task should be split into smaller operations and
routed to the best available tool.

## Executive summary (16 directives)

1. **Split image tasks into modules** — analyze, select, prompt-build, edit/generate, verify, retry
2. **Use browser-side utilities first** — reduce cost and failure rate
3. **Add Manual Rescue Mode** — let user recover failed AI edits with crop, mask, or manual selection
4. **Add a provider router with strict capability checks** — text-only models never receive image-editing tasks
5. **Add an AI Output Receipt and No Image Returned detector** — never falsely claim success
6. **Support three operating modes** — Browser Mode, Free Provider Mode, Local Engine Mode
7. **Build a plug-in registry** — modular ecosystem rather than a brittle one-provider product
8. **Browser-first tools** — `browser-image-compression`, Canvas API, Fabric.js, Konva.js, Cropper.js, Transformers.js, manual crop/erase/mask/select
9. **Local Engine companion** — iPad PWA → laptop/desktop running ComfyUI / IOPaint / rembg / SAM2 / Florence-2 / Qwen2.5-VL / IP-Adapter / ControlNet / InstantID / Real-ESRGAN / GFPGAN / CodeFormer / FFmpeg
10. **Capability fields per provider** — text_only, vision_input, image_output, image_edit, image_to_image, inpainting, outpainting, background_removal, segmentation, object_detection, tts, stt, video, returns_file, returns_url, returns_blob, rate_limit_status, cost_status
11. **Reference memory** — face, hair, clothing, skin tone, pose, style, lighting, palette, reference images, negative prompts, seed
12. **Three consistency modes** — Strict / Moderate / Loose (already in main spec Pipeline B)
13. **Image enhancement layer** — Real-ESRGAN, SwinIR, GFPGAN, CodeFormer, OpenCV
14. **Audio/voice extension** — Piper TTS, eSpeak NG, Coqui, Whisper / Whisper.cpp, Vosk, Web Speech API
15. **Image-to-video roadmap** — AnimateDiff, SVD, Deforum, RIFE, FFmpeg (backend phase)
16. **Non-AI workarounds that make AI look better** — template-based editing for icons / splash / thumbnails / posters / book covers / lower thirds / title cards; layer-based editor; before/after comparison; prompt presets ("Keep Same Face" / "Replace Sky" / etc.); prompt debugger

## Most-innovative ideas (8 high-leverage adds)

1. **Ask two models, then choose** — one analyzes, another verifies
2. **Cheap text AI before image AI** — clean prompts, choose right provider
3. **Manual mask + free inpainting** — when vision/selection fails
4. **Save character cards** — face, clothing, body profile, style profile, successful prompts, failed prompts
5. **AI Output Receipt for every gen/edit** — prompt, provider, model, seed, reference image ID, consistency mode, source image, output file, verification result, datetime
6. **No Image Returned detector** — block false success states; if provider returns text/JSON/markdown instead of an actual image file/blob/URL, mark as failed for that task and try next
7. **Browser / Free Provider / Local Engine modes** — single dropdown, three lanes
8. **Export prompts to external tools** — when free providers fail, return ready-to-use prompts for ComfyUI / Stable Diffusion / Leonardo / Midjourney / Runway / Kling / Pika

## Plug-in registry shape (each plug-in stores)

- provider name, task type
- input type, output type
- free / free-tier / open-source status
- requires API key (yes/no)
- runtime: browser / local / cloud
- supports: image input, image output, masks, reference image, seed, batch
- enabled / disabled state

## MVP feature order (user's recommended phasing)

This is an **alternative phasing** the user provided. Cross-reference
with our wave plan; some overlap, some new ideas. Keep both in mind:

- **Phase 1:** provider router, capability map, Puter, Pollinations, image upload, prompt builder, output verification, no-image-returned detector
- **Phase 2:** browser compression, cropper, manual mask tool, rembg / local background removal, HF connector, Cloudflare Worker router
- **Phase 3:** reference memory, character cards, consistency modes, vision verification, OpenRouter / Gemini vision fallback
- **Phase 4:** Load AI Local Engine, ComfyUI API, IOPaint, SAM2, ControlNet, IP-Adapter, Real-ESRGAN
- **Phase 5:** video / animation, voice tools, batch generation, plug-in marketplace

## Mapping Workarounds → existing wave plan

| Addendum item | Wave |
| --- | --- |
| Provider router with capability checks | W11 (Capability Registry cleanup) |
| Output Receipt + No-Image-Returned detector | W9 (Verification) |
| Browser-first tools (compression, Canvas, Fabric.js, Cropper.js) | W10 (Manipulation Tools UI) |
| Manual Rescue Mode (paint mask, crop, lasso) | W10 (manipulation tools) |
| Plug-in registry | W11 |
| Reference memory + character cards | W8 (Continuity) |
| Three consistency modes (Strict/Moderate/Loose) | W7 (Prompt Builder) |
| Browser-side background removal (Transformers.js) | W6.5 |
| HF rembg / Real-ESRGAN / GFPGAN / CodeFormer specialty endpoints | W6.5 |
| ComfyUI / A1111 / IP-Adapter / InstantID / ControlNet | Deferred (server phase) |
| Audio / voice tools | Separate scope (Voice tools, not Image Prompt) |
| Image-to-video | Backend phase |
| Template-based editing | Future polish |
| Prompt debugger | W11 (debug rules) |
| Export prompts to external tools | W11 (Pipeline F fallback) |

---

# Recommended Routing Order (user-supplied)

Captured for the spec build:

**Image understanding:** Puter vision → OpenRouter free vision → HF
vision → Qwen2.5-VL → LLaVA → Florence-2

**Image generation:** Puter image → Pollinations → Cloudflare AI → HF
model/Space → ComfyUI (future) → A1111/Forge/InvokeAI (future)

**Image editing:** Puter image (only if returns image) → Gemini image
free route → ComfyUI inpaint → A1111/Forge inpaint → InvokeAI canvas
→ LaMa Cleaner / IOPaint → fallback prompt

**Object selection / masks:** SAM 2 → SAM original → Grounding DINO →
Florence-2 → YOLO

**Character consistency:** IP-Adapter → InstantID → ControlNet → LoRA
→ seed locking → saved reference memory → post-output vision verify

**Background removal:** rembg → BiRefNet → U²-Net → SAM 2 mask + transparent export

**Upscaling / restoration:** Real-ESRGAN → SwinIR → GFPGAN → CodeFormer

**Voice / audio:** Piper → Coqui → eSpeak NG → Whisper / Whisper.cpp → Vosk

---

# System Rules (user-supplied — must enforce)

1. Never send image-editing requests to text-only models
2. Never claim an image was edited unless an actual image (file/blob/URL) is returned
3. If a provider returns text only on an image-edit request, mark it failed and try next
4. Keep a provider capability map
5. Store reference images and character profiles
6. Add consistency modes: Strict / Moderate / Loose
7. Add user toggles: preserve face / outfit / hairstyle / style / background / pose / use previous image / use previous character profile
8. Add manipulation tools: remove / replace object / change background / expand / crop / recolor / change expression / change pose / repair hands / repair face / upscale / background cutout / compare before & after
9. Add automatic verification — vision check after every gen/edit
10. Add fallback prompt — if no provider can return an image, return a polished prompt
