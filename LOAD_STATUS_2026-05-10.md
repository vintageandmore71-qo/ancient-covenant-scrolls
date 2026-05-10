# Load AI / Load Main — Current Status Report
# Version: v17g76 | Cache: load-v17g76 | Date: 2026-05-10

---

## 1. Executive Summary

Load Main is live at https://dssorit.github.io/ancient-covenant-scrolls/load/
Version badge shows v17g76. Service worker cache is load-v17g76.

The Load AI layer has real infrastructure underneath it — a 17-provider image
chain with health tracking, auto-fallback, and output-proof gating — but the
two surfaces the user actually touches (Image Prompt and AI Chat Studio) are
both confirmed not working on device as of 2026-05-10. The providers work in
code. Something in the deployed UI is failing silently. That is the single
most important thing to fix before any other AI build.

Text-to-image via free providers (Pollinations, AI Horde) requires no API key
and should work. The fact that it does not means the failure is in the UI
layer, not in the provider layer.

Audio routing was fixed in v17g76. Conjugated SFX terms now route correctly.
Honest badges now fire on all audio outputs. This has not been tested on device
yet and is deferred to a future session.

True source-preserving image editing (inpainting) is wired end to end but
requires the user to configure a Hugging Face key or a local SD server. Without
a key it cannot produce a real inpaint result.

Hands, fingers, face, and anatomy-sensitive edits are blocked by a refusal
gate that fires when no strong inpaint provider is configured. The gate works.
The real output requires a provider key.

True subject animation does not exist. Ken-Burns camera-motion (zoom and pan
on a still image) produces a real WebM file and is honestly labeled in the UI
as camera-motion preview only.

Realistic audio (laughter, crowd, singing, music as a real track) does not
exist. The on-device synthesizer produces procedural placeholder audio only.
Video generation does not exist.

---

## 2. Capability Truth Table

### Image

| Feature | Status | Notes |
|---|---|---|
| Text-to-image — Image Prompt PWA | FAIL | User confirmed not working on device 2026-05-10. Free providers (Pollinations, AI Horde) need no key. Failure is in the UI layer, not the providers. |
| Text-to-image — AI Chat Studio | FAIL | Same confirmation. Real 17-provider chain is wired. UI is not surfacing results. |
| Image-to-image edit (no mask) | PARTIAL | Code routes to img2img-capable providers. Anatomy gate fires for sensitive prompts. Cannot confirm working on device because AI Chat Studio is FAIL. |
| Source-preserving inpaint | PROVIDER NEEDED | Mask painter wired. HF SDXL inpainting route wired. Real inpaint output requires ps_hfimg or local SD URL. Without key it cannot preserve source. |
| Anatomy-safe refusal gate | WORKING REAL OUTPUT | Gate code fires correctly. Refuses rather than generate broken anatomy when no strong inpaint provider is configured. |
| Hands / fingers / face edits | PROVIDER NEEDED | Gate works. Real output requires ps_hfimg or local SD. |
| Face restoration — GFPGAN | PROVIDER NEEDED | Real HF endpoint wired (TencentARC/GFPGAN). Requires ps_hfimg. |
| Face restoration — CodeFormer | PROVIDER NEEDED | Real HF endpoint wired (sczhou/CodeFormer). Requires ps_hfimg. |
| Upscale — Real-ESRGAN | PROVIDER NEEDED | Real HF endpoint wired (ai-forever/Real-ESRGAN). Requires ps_hfimg. |
| Mask painter UI | READY FOR USER VERIFICATION | Binary canvas mask, brush painting, touch support wired. Inpaint route hooked up. Not tested on device. |
| Provider health board | WORKING REAL OUTPUT | Circuit breaker per provider. Skips provider after 3 fails in 5 minutes. Resets after 5 minutes. |
| Auto-fallback chain | WORKING REAL OUTPUT | Tries providers in order. Task-aware filter (inpaint providers for inpaint tasks, upscale providers for upscale tasks). Records success and failure. |
| Output proof gate | WORKING REAL OUTPUT | No success badge fires without a real blob URL or data URL. Every card includes provider ID, skipped chain, and operation type. |


### Animation

| Feature | Status | Notes |
|---|---|---|
| Ken-Burns camera-motion preview | WORKING REAL OUTPUT | Canvas captureStream plus MediaRecorder. 1.15x zoom, 30 px pan over 5 seconds. Produces a real WebM blob. Blob size and magic bytes verified before card shows. Labeled in UI as camera-motion preview, not true animation. |
| True subject animation | NOT DONE | No implementation exists. System saves the animation prompt and notes that an animation provider is needed. No clip is produced from subject motion. |
| Motion prompt → animation | NOT DONE | Prompt text is saved. No motion is applied from it. Animation provider required. |


### Audio

| Feature | Status | Notes |
|---|---|---|
| Voice / narration (browser TTS) | READY FOR USER VERIFICATION | Browser speechSynthesis. 7 voice styles with pitch and rate adjustments. Guard blocks SFX-like input in voice mode. Real playback. Not tested on device post v17g76. |
| SFX — wind / rain / storm | PLACEHOLDER ONLY | OfflineAudioContext filtered noise. Real WAV blob. Honestly labeled Procedural placeholder. Not a recording. |
| SFX — engine / roar / rumble | PLACEHOLDER ONLY | Sawtooth 55 Hz plus 120 Hz bandpass noise. Real WAV blob. Honestly labeled Engine placeholder. Fixed in v17g76. |
| SFX — crowd / chatter / hammer | PLACEHOLDER ONLY | Bandpass noise or square-wave oscillator. Real WAV blob. Honestly labeled. |
| SFX — unmatched prompt | PLACEHOLDER ONLY | Falls through to 440 Hz sine tone. Red badge: Placeholder tone. Prompt saved. |
| Laughter / singing / speech (SFX mode) | NOT DONE | voiceLikeRx guard fires. Saves prompt. Shows Audio Provider Needed card. No fake audio produced for these. |
| Ambience mode | PLACEHOLDER ONLY | Routes to same OfflineAudioContext synth as SFX. Same honest badge. |
| Music mode | PLACEHOLDER ONLY | Four sine waves at C major chord frequencies. Real WAV blob. Not a real music track. |
| Realistic SFX (any) | PROVIDER NEEDED | OfflineAudioContext cannot produce realistic audio. HF AudioCraft or similar required. |
| Realistic music | PROVIDER NEEDED | HF MusicGen or similar required. |
| Audio routing guards | WORKING REAL OUTPUT | sfxLikeRx blocks SFX prompts in voice mode. voiceLikeRx blocks voice-like prompts in SFX mode. Conjugated forms (laughing, screaming, singing) fixed in v17g76. |
| Audio result badge — honest labeling | WORKING REAL OUTPUT | kind=tone shows red Placeholder tone badge. Engine shows Engine placeholder badge. Procedural SFX shows Procedural placeholder badge. No false green OK. |


### Video

| Feature | Status | Notes |
|---|---|---|
| Video generation | NOT DONE | Prompt saved. Links to external-video-fallback.html. No provider is wired. No clip produced. |
| Audio plus image muxed to video | NOT DONE | No FFmpeg.wasm or mux path exists. |


### Provider Registry (17 providers)

| Provider | No Key Needed | Key Var | Inpaint | img2img | Upscale | Face |
|---|---|---|---|---|---|---|
| Pollinations Flux | Yes | — | No | No | No | No |
| Pollinations | Yes | — | No | No | No | No |
| Pollinations Turbo | Yes | — | No | No | No | No |
| AI Horde (anonymous) | Yes | — | No | No | No | No |
| AI Horde SDXL | Yes | — | No | No | No | No |
| Hugging Face | No | ps_hfimg | Yes | Yes | No | No |
| HF SDXL-Turbo | No | ps_hfimg | No | No | No | No |
| Real-ESRGAN via HF | No | ps_hfimg | No | No | Yes | No |
| GFPGAN via HF | No | ps_hfimg | No | No | No | Yes |
| CodeFormer via HF | No | ps_hfimg | No | No | No | Yes |
| Gemini Image | No | ps_k_gemini | No | Yes | No | No |
| Cloudflare AI Flux | No | ps_cftk + ps_cfac | No | No | No | No |
| Cloudflare SDXL-Lightning | No | ps_cftk + ps_cfac | No | No | No | No |
| Together AI | No | ps_tgk | No | No | No | No |
| DeepAI | No | ps_daik | No | No | No | No |
| SiliconFlow | No | ps_sfk | No | Yes | No | No |
| Local Stable Diffusion | No | ps_local_sd_url | Yes | Yes | No | No |

---

## 3. Do Not Test Today List

These are deferred. Do not open them, do not verify them, do not report on
them. They belong to a future session with a device in hand.

- Image Prompt PWA — known FAIL. Needs a diagnostic build first.
- AI Chat Studio — known FAIL. Same reason.
- Audio routing v17g76 — just shipped. Defer to tomorrow.
- Inpainting / mask painter — requires ps_hfimg key to produce real output.
- Face restoration (GFPGAN, CodeFormer) — requires ps_hfimg.
- Upscale (Real-ESRGAN) — requires ps_hfimg.
- Ken-Burns animation — code works, no device test needed today.
- Voice TTS — code works, device test is low priority today.
- Any SFX / ambience / music — all are placeholder, nothing to verify.
- Video — does not exist.

---

## 4. Next Build Order

Ordered by impact and by how much iPad testing is required after the build.

| Order | Build | Testing required after |
|---|---|---|
| 1 | Diagnose why Image Prompt and AI Chat Studio fail on device. Free providers need no key and should work. Failure is in the UI layer. Read 5.8 AI Studio Fix.docx and 5.8 READ AI Studio Not working.docx before building. | Minimal — one tap to confirm image appears |
| 2 | Bundled CC0 SFX library — real audio files for engine, wind, crowd, footsteps replacing OfflineAudioContext synth | One listen per sound type |
| 3 | Load Main Part 1 — fix contradictory AI/privacy copy in load.js. Text-only change. | None |
| 4 | Provider capability flags audit — extend lib-load-image-providers.js with 24-flag schema per 5.7 AI Providers Verification.docx | None — code only |
| 5 | Feature Verification Dashboard — 43 auto-tests, Run All Tests button per Load Main Next Build Plan Part 2 | Tap the button, read the pass/fail table |
| 6 | True audio provider integration (HF AudioCraft or MusicGen) | One listen to confirm real audio plays |
| 7 | Structured animation intent parser — saves animation prompt with Animation Provider Needed card, clears false expectations | None — card either appears or it does not |
| 8 | Load Main Parts 2–13 (Full ecosystem hub build) — Feature Verification Dashboard, LoadStudio package support, Safety and Rights panel, Export receipts, Ecosystem routing, Sample Projects, PWA Book Export, Piper TTS resilience, Module list, Code structure, Acceptance criteria | Staged testing per part |

---

## 5. Provider Needed Checklist

What the user must configure to unlock each blocked capability. All keys are
stored in Load Settings (localStorage). No keys are baked into the code.

| What you want | Key to add | Where to get it |
|---|---|---|
| Inpainting (source-preserving edit) | ps_hfimg | huggingface.co — free account, Settings, Access Tokens |
| Face restoration (GFPGAN / CodeFormer) | ps_hfimg | Same HF token |
| Upscale (Real-ESRGAN) | ps_hfimg | Same HF token |
| Best img2img edit (Gemini) | ps_k_gemini | aistudio.google.com — free API key |
| Cloudflare image generation | ps_cftk (API token) + ps_cfac (Account ID) | dash.cloudflare.com — free Workers AI |
| Together AI (FLUX free tier) | ps_tgk | api.together.xyz — free credits on signup |
| DeepAI | ps_daik | deepai.org — free tier |
| SiliconFlow | ps_sfk | siliconflow.cn — free credits |
| Local Stable Diffusion (full inpaint, no rate limits) | ps_local_sd_url | Run AUTOMATIC1111 or Forge locally, paste the URL |
| Free with no key (5 providers) | None needed | Pollinations Flux, Pollinations, Pollinations Turbo, AI Horde, AI Horde SDXL |

---

## 6. Load AI Product Promise

This section states what Load promises users, what it actually delivers today,
and where the gap is.

**What Load promises:**
- Generate images from a text prompt, on-device or with a free provider
- Edit an existing image with a follow-up prompt, preserving the original
- Animate a scene
- Add sound and atmosphere to a scene
- Export a finished scene as a package

**What Load delivers today:**

Text-to-image generation: The infrastructure is real. 17 providers, 5 of which
need no key. Auto-fallback, health tracking, and output proof are working.
However the UI surfaces (Image Prompt and AI Chat Studio) are both confirmed
broken on device. Users cannot reach the working provider chain through the UI.

Image editing: The edit routing, anatomy gate, and img2img path are wired.
Real inpainting (source-preserving) requires a key. Without a key it uses
img2img which changes the whole image. The mask painter UI is built.

Animation: Ken-Burns camera-motion preview is real and honest. It is not
character animation. True subject motion is not implemented.

Sound: Browser TTS voice works. Procedural synthesis produces placeholder
audio files for SFX and ambience — real blobs, not realistic sounds. Music
is a chord arpeggio, not a real track. Laughter, singing, and speech cannot
be synthesized and are blocked with an honest Provider Needed card.

Export: Output proof is in place. No muxing or full scene package export exists.

**The gap in one sentence:**
The provider infrastructure is sound, but the user-facing UI layer is broken
on device, and the realistic audio and true animation layers do not exist.

---

## 7. Final Handoff Summary

For the next session. Read this first, before opening any file.

**Current build:** v17g76
**Current cache:** load-v17g76
**Last merged PR:** #6 (squash, SHA d842909)
**Branch:** claude/fix-session-sending-TVMbW-i4JHc

**What is genuinely working (code verified, not device-dependent):**
- 17-provider image chain with health board and auto-fallback
- Output proof gate — no success badge without a real blob
- Anatomy refusal gate — refuses broken edits when no inpaint provider is set
- Ken-Burns animation — real WebM, honestly labeled
- Audio routing guards — sfxLikeRx and voiceLikeRx correct as of v17g76
- Audio honest badges — no false green OK on any audio output

**What is confirmed broken on device:**
- Image Prompt PWA — user confirmed not working 2026-05-10
- AI Chat Studio — user confirmed not working 2026-05-10
- Root cause: UI layer, not provider layer. Free providers need no key.

**What is not built:**
- True subject animation (no provider)
- Realistic SFX, laughter, crowd, singing (no provider)
- Real music generation (no provider)
- Video generation (no provider, no mux)
- Full scene package export

**What is built but needs a provider key to produce real output:**
- Inpainting / mask painter (needs ps_hfimg or local SD)
- Face restoration GFPGAN / CodeFormer (needs ps_hfimg)
- Upscale Real-ESRGAN (needs ps_hfimg)

**First task in next build session:**
Read 5.8 AI Studio Fix.docx and 5.8 READ AI Studio Not working.docx.
Diagnose the UI failure mode in Image Prompt and AI Chat Studio.
Fix the UI layer so the real provider chain is reachable from the device.
This is the single highest-priority item. Everything else waits.

**Key files:**
- `load/tools/ai-chat-studio.html` — AI Chat Studio surface
- `load/image-prompt/index.html` — Image Prompt PWA
- `load/lib-load-image-providers.js` — shared 17-provider chain
- `load/load.js` — Load Main app shell
- `load/sw.js` — service worker (CACHE = load-v17g76)
- `LOAD_STATUS_2026-05-10.md` — this file
- `SESSION_NOTES_2026-05-10.md` — session log with tomorrow's test reminder
- `MASTER_BACKLOG.md` — full feature backlog across all apps
- `HANDOFF.md` — cross-session architectural state
- `inbox/` — unread spec files (5.7, 5.8, Load Main Next Build Plan, PWA One Click, Reliability Addendum)
