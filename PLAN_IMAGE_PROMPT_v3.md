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
