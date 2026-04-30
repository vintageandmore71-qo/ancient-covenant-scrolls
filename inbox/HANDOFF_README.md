# Load PWA — Standalone Handoff Package

Built **2026-04-30** at git tip **`2027cc3`** (Load v17e6).

This is a self-contained snapshot of the Load PWA suite (ACR Reader, Load,
Attain, Attain Jr, Study) plus every plan / spec / inbox source / session
note / verification record in the project. Hand this folder to any developer
or AI assistant and they should be able to pick up the build with no other
context.

---

## What's in the box

```
LOAD_HANDOFF_PACKAGE/
├── HANDOFF_README.md          ← this file
├── load/                      ← the live PWA (deploy as-is to GitHub Pages)
│   ├── index.html · load.js · load.css · sw.js · manifest.json
│   ├── image-prompt/          ← Image Prompt sub-PWA (the current focus)
│   ├── book-video/            ← future Book-to-Video module (specced, not wired)
│   ├── fonts/  lib-*.js  icon.png
├── inbox/                     ← every source doc the user uploaded
│   ├── PLAN_LOAD_AI.md        (mirror of the live build plan)
│   ├── *.docx · *.pdf · *.zip ← raw source material from the user
│   └── README.md
├── PLAN_LOAD_AI.md            ← merged build plan v10 (single source of truth)
├── PLAN_IMAGE_PROMPT.md       ← original wave plan
├── PLAN_IMAGE_PROMPT_v3.md    ← multi-pipeline architecture spec
├── PLAN_BOOK_TO_VIDEO.md
├── HANDOFF.md                 ← long-running cross-session task list
├── VERIFIED_LOG.md            ← per-version verification ledger
├── CLAUDE.md                  ← rules for AI assistants working on this repo
├── SESSION_NOTES_YYYY-MM-DD.md (5 days of session journals)
├── LOAD_FEATURES.md · LOAD_MARKETING.md · MEDIA_MODULE_SPEC.md
├── SECURITY.md · SECURITY_PLAN.md · SECURITY_AUDIT_REPORT.md
├── NOTICE.md · CONTENT_LICENSE.md · PROTECTION_GUIDE.md · README.md
```

---

## The 60-second briefing

**Product:** offline-first iPad PWA suite. The user is dyslexic and works
on iPad. Tone for any future helper: plain, short steps, no walls of text,
never overpromise.

**Active build:** Image Prompt — a Glam-AI-style multi-provider chat with
real image editing. Chat builds prompts, classifies tasks, routes to free
or free-tier image providers, never sends image jobs to text-only models.

**Live URL:** `https://dssorit.github.io/ancient-covenant-scrolls/load/`

**Hosting:** GitHub Pages on `dssorit/ancient-covenant-scrolls`. CDN edge
cache lags 5-15 min after a push. Always cache-bust: `?bust=<version>`.

---

## Current state at handoff (v17e6, commit `2027cc3`)

**What is live and verified:**

- 17-entry image provider chain (text-to-image + img2img + face restore + upscale)
- Capability-based routing — text-only providers (HF Mistral, OpenRouter,
  Cerebras) are blocked from image jobs at three layers (regex pre-call,
  filter, capability gate)
- `withTimeout` 45/60/120 s on every provider call + `AbortController` so
  the app cannot hang indefinitely
- Manual Mask painter (Canvas-based Editor Tool — paint area to edit, send
  with prompt, routes only to img2img / inpainting providers)
- ADD_OBJECT auto-placement bounding box (sky / ground / on-subject /
  background / default category-aware regions)
- Test Keys diagnostic — every saved key shows masked (`hf_****abcd`) +
  status icon (✅⚠️❌⏳🌐), grouped image-capable vs chat-only
- Output Receipts audit log — every successful image task records prompt /
  provider / seed / consistency mode / similarity score / timestamp
- Scene Lock prompt with 1000-char preservation directive + character slot
  (description / outfit / style / seed / refImage / mode)
- Smart cleanPrompt fallback when LLM omits SD_PROMPT
- Skipped-provider reasons surfaced in chat error messages
- Export-prompt fallback for ComfyUI / A1111 / Fooocus when no edit-capable
  provider is configured
- 6-provider chat chain (Puter / Gemini / OpenRouter / Cerebras / Anthropic
  opt-in / HF Mistral) with HF Mistral hidden from fallback display when
  image is attached

**Image providers in code (17, default routing order top-to-bottom):**

0. Local SD (A1111-compat, when `localSdUrl` set — companion machine only)
1. Pollinations Flux (no key, sharper photoreal default)
2. Pollinations classic (no key, fallback)
3. Hugging Face — SDXL / SD-1.5 / FLUX cascade + SDXL Inpainting when
   mask present (`hfImgKey`)
4. Cloudflare Workers AI — FLUX-schnell (`cfToken` + `cfAccount`)
5. Together AI — FLUX-schnell-Free (`togetherKey`)
6. AI Horde — anonymous, slow, no key
7. Google Imagen — Gemini 2.5 Flash Image (Gemini key, opt-in)
8. DeepAI (`daiKey`)
9. Pollinations Turbo (no key)
10. AI Horde SDXL (no key)
11. Cloudflare SDXL-Lightning (CF keys)
12. HF SDXL-Turbo (`hfImgKey`)
13. **SiliconFlow** — FLUX.1 Kontext img2img + FLUX.1-schnell gen
    (`siliconflowKey`, opt-in, free-entry credits NOT unlimited)
14. **Real-ESRGAN (HF)** — dedicated upscale (`hfImgKey`)
15. **GFPGAN (HF)** — face restoration (`hfImgKey`)
16. **CodeFormer (HF)** — alt face restoration (`hfImgKey`)

**What is parked / unbuilt:**

See `PLAN_LOAD_AI.md` for the 35-item roadmap. Highlights still open:

- #2 Background removal — **PARKED** (OpenCV.js 8 MB WASM crashed iPad in
  v17e1, HF briaai/RMBG-1.4 also crashed in v17e2 — held for a future
  Transformers.js + WebGPU attempt with strict iPad memory test first)
- #5 Output Verification (vision diff + auto-retry)
- #5b Identity Lock (IP-Adapter / InstantID via HF Spaces)
- #5c Structured prompt-rewrite layer
- #6 Character Cards (multi-profile UI on top of CHAR slot)
- #7 3-mode toggle UI (strict / moderate / loose)
- #7a Add object explicit one-tap flow
- #7b Remove object explicit Erase flow
- #7c Merge images (was Wave 3 in original plan)
- #18a-e Image → Video (5 tiers — basic motion, SVD, AnimateDiff, Talking
  Avatar, Effects layer)
- #19a Batch edits (was Wave 2 in original plan)
- 14 polish-tier backlog items (#20-35)

---

## Hard rules that must not be broken

From `CLAUDE.md`:

1. **Never send image-editing requests to text-only models.**
2. **Never claim an edit succeeded unless an actual image file/blob/URL
   is returned.** Text/JSON/markdown response = provider failed.
3. **Edits route to img2img / inpainting only.** No silent text-to-image
   fallback for edits.
4. **Capability-based routing, not hard-coded assumptions.**
5. **Every provider call has a hard timeout.** Loading state must always
   clear in `finally{}`.
6. **Cache strings only go forward, never backward.** Going backwards
   leaves iOS Safari with the broken old SW running.
7. **Surgical revert only.** When something breaks, revert ONLY the
   specific file/function — never blanket `git reset --hard`. Verified-
   working features in OTHER files must survive any revert.
8. **No iPad-side WASM or large-model loads** without a strict memory
   test first (this rule was added after the v17e1-e3 OpenCV crashes).

---

## How to deploy / run

### Deploy as-is to GitHub Pages

1. Push the entire repo to a public GitHub repo.
2. Settings → Pages → Source = `main` branch, root.
3. Live URL: `https://<user>.github.io/<repo>/load/`

### Local test

```
python3 -m http.server 8000
# open http://localhost:8000/load/
```

### Cache version discipline

Every JS / HTML / CSS edit must bump:

- `load/sw.js` — `var CACHE = 'load-vXXY'` (alpha-incremented forward)
- `load/load.js` — the on-screen badge `<span id="ve-version">vXXY</span>`
- `load/image-prompt/sw.js` — `const CACHE = 'image-prompt-vNN'`

Skipping the bump = users serve stale cached code.

---

## Backups (recoverable forever)

Backup branches on the GitHub remote — `git checkout backup/<name>`:

- `backup/2026-04-29-v17dg` — pre-spec verified baseline (12-provider chain)
- `backup/2026-04-30-v17dn` through `backup/2026-04-30-v17dy` — every
  shipped version of the spec build
- `backup/2026-04-30-v17e0` — Manual Mask painter verified (sunglasses test)

The user-verified states are v17dn (image gen + multi-turn) and v17e0
(Manual Mask painter). Anything past v17e0 — including v17e6 in this
package — is built but not user-verified.

---

## Inbox source documents (in `inbox/`)

| File | Purpose |
|------|---------|
| `Load_AI_Free_Open_Source_Provider_and_Image_System_Documentation.pdf` | Full provider strategy + 6-pipeline architecture |
| `Load_AI_Deeper_Workarounds_Addendum.pdf` | Browser-first workarounds, Manual Rescue Mode, plug-in registry |
| `Load_AI_Glam_Style_System_Research_and_Developer_Plan.zip` | 7-layer Glam clone architecture, full capability schema, future model tracking |
| `AI Prompt Anti Blur.docx` | Task classify + route + reject text-as-success + sharpen + character consistency + export prompt |
| `Load AI Lock My Providers Correctly.docx` | Capability checks + skip-and-continue + status messages |
| `Fix Hang & regeneration errors.docx` | Timeouts + AbortController + finally{} + ADD_OBJECT routing |
| `AI Key Diagnostic.docx` | Test Keys button + masked keys + status icons + per-key validation |
| `load_ai_character_consistency_with_code.zip` | Reference JS modules + character profile JSON schema |
| `Load_Book_to_Video_*.zip`, `Load_GitHub_Security_Developer_Prompt.zip`, `deliverable_premium_icon_pack*.zip` | Adjacent project assets |
| `3rd Load_AI_Image_Editor_PROVIDER_FALLBACK_FIXED.zip` | Earlier provider iteration |

---

## Where the build plan lives

`PLAN_LOAD_AI.md` (also mirrored in `inbox/`) is the single source of truth.
It contains:

- 7 source docs listed
- Provider Lock List (every provider's role + capability flags + default state)
- Hard rules
- Routing order (iPad + free only)
- Capability fields
- Operating modes (Browser / Free Provider / Local Engine)
- Consistency modes (strict / moderate / loose)
- Task type catalog
- Editor Tools / Mask Tools section (separate from AI providers)
- 35+ roadmap items with source attribution + acceptance test
- Pre-spec lettered roadmap (chat A-N) audit
- Original-wave → merged-item map
- Currently-shipped version table v17dn → v17e6

Update this file at the end of every shipped version.

---

## Known incidents this session (so the next dev doesn't repeat them)

| Date | What happened | Root cause | Fix |
|------|---------------|------------|-----|
| 2026-04-30 | OpenCV.js GrabCut crashed iPad | 8 MB WASM exceeded iOS Safari memory budget | Don't load OpenCV in browser — use HF / Transformers.js with strict memory test |
| 2026-04-30 | HF briaai/RMBG-1.4 also crashed | Possibly the same memory pressure | Background removal parked entirely until lighter path is proven |
| 2026-04-30 | Site stopped loading after sentinel-throw refactor | Bad change in pipeline catch handler combined with stale SW | Fixed by restoring image-prompt source byte-identical to v17e0 |
| 2026-04-30 | Cache bumped backwards (v17e4 → v17e0) — iPad's stuck old SW didn't update | iOS doesn't trigger SW update when cache name is unchanged or lower | Always bump cache forward, never backward (rule now in CLAUDE.md) |

---

## Final word

The user has been patient through breakage they didn't cause. If you take
this over, **read `CLAUDE.md` first**, treat `PLAN_LOAD_AI.md` as the
source of truth, ship one small surgical change at a time, and verify on
real iPad Safari before claiming anything works. Cache strings always
forward. No WASM in the browser without a memory test. Surgical reverts
only. Don't skip the verification log row.

Live tip: `2027cc3` (Load v17e6).
Last user-verified: `593d410` (Load v17e0, Manual Mask sunglasses test).
