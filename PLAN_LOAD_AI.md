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

---

## Hard rules (must not be broken)

1. Never send image-editing requests to text-only models
2. Never claim an edit succeeded unless image file/blob/URL is returned
3. Provider returns text/JSON/markdown → mark failed and try next
4. Edits route to img2img/inpainting only — never silent text-to-image fallback
5. Capability-based routing, not hard-coded assumptions
6. Every provider call has a hard timeout (45 s LLM / 60 s fallback / 120 s image gen)
7. Loading state must always clear in `finally{}`

## Capability fields (per provider)

`text_only · vision_input · image_output · image_edit · image_to_image · inpainting · outpainting · background_removal · segmentation · object_detection · returns_file · returns_url · returns_blob · rate_limit_status · cost_status`

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
5. **Puter.js** — vision LLM, no key
6. **Google Gemini** (free key) — vision + image edit on free tier
7. **AI Horde anonymous** — last-resort, slow but truly free
8. **Optimized export-prompt fallback** — when no online provider can do the requested edit

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

`generate · improve · add_object · modify_character · change_background · remove_object · inpaint · outpainting · mask_edit · upscale · background_removal · style_transfer · expression_change · pose_change`

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
| 2 | original K | **OpenCV.js wired for "remove background"** (call existing `loadOpenCV()` lazy stub; threshold + edge mask) | Free, browser-only, no key | "remove background" returns transparent PNG offline |
| 3 | spec Ph 2 | **rembg via Transformers.js (briaai/RMBG-1.4) + WebGPU when available** | Better cutouts than OpenCV; still in browser | Same prompt produces cleaner mask than OpenCV path |
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
| 15 | spec Ph 2 | **HF Spaces connector** (public Gradio APIs for Florence-2, Qwen2.5-VL, SDXL inpaint, GFPGAN, Real-ESRGAN — many require no token) | More truly-free img2img/inpaint paths | Spaces models appear as separate slots |
| 16 | original E | **Cohesive icon set across ACR / Attain / Attain Jr / Study** | Unblocked now that Phase 1B + 2 are done | Brand consistency across all 5 apps |
| 17 | original N | **App Store readiness** — NSFW / safety filter, watermark toggle, privacy text, encrypted key vault, install banner | Submission gate | App Store screening passes |
| 18 | user direction 2026-04-30 | **Image → Video clip (downloadable .mp4/.webm file)** — every generated/edited image can be brought alive as a short motion clip. iPad path: HF Space hosting **Stable Video Diffusion** or **AnimateDiff** (free, no GPU at user's house) → returned frames encoded in-browser via **FFmpeg.wasm** → saved to camera roll / Load Library. | User explicit: "the image editor/generator should not only animate but should be able to be brought alive as a video clip, i.e file" | Tap "Animate" on any result → 3-5 s mp4 downloads / shares via PWA share sheet |
| 19 | spec Ph 5 | Voice tools, batch generation, plug-in marketplace | Deferred until 1–18 land | n/a |
| OPT | optional companion | **ComfyUI / A1111 / Fooocus on user's Mac/PC** — IP-Adapter, InstantID, ControlNet, LoRA workflows. Requires the user to run Python + GPU on a separate machine; iPad just sends requests. NOT a default path; gated behind explicit `localSdUrl` setting in Settings. Already wired (A1111-compat) at v17dq. | Power-user-only; iPad alone cannot do this | User points iPad at `http://192.168.x.x:7860`, edits route via local HTTP |

**Recommended order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14a → 14b → 14c → 15 → 16 → 17 → 18 → 19. OPT is unblocked at any point but never required.

**Video pipeline (item 18) — iPad-only path:**
- **Stable Video Diffusion** via HF Space (free, image → ~14-frame clip)
- **AnimateDiff** via HF Space (motion on top of SDXL, free token)
- **FFmpeg.wasm** in-browser encode → `.mp4` / `.webm`
- **Save to Library** + PWA share-target so the file lands as a normal asset alongside images
- *(Deforum / RIFE require local GPU — companion-machine only, optional)*

Any of those can be reordered if a user request shifts priority — but
each one stays a single small commit, with cache bump and an entry
in `VERIFIED_LOG.md` after sign-off.

---

## Live tip

`main` at v17dy. Backups for every shipped version exist as
`backup/2026-04-30-v17d{n,o,p,q,r,s,t,u,v,w,x,y}` on origin.
