# Load AI / Load Main — Current Status Report
# Capability Truth Table
# Date: 2026-05-10 | Build: v17g76 | Cache: load-v17g76

---

## 1. Executive Summary

**Load Main is live** at `https://dssorit.github.io/ancient-covenant-scrolls/load/`
Version badge: v17g76. Service worker: load-v17g76.

**Image Prompt (Quick Image Tool)** — Code is fully implemented with a real
17-provider chain and real fallback logic. However, the user confirmed on
2026-05-10 that it is not working on the live site. Root cause is not yet
diagnosed. Status: FAIL until verified working on iPad.

**AI Chat Studio** — The interface loads and sub-modes exist (image, edit,
animate, audio, video). Image and edit modes use the real 17-provider chain.
Result cards require a real blob or URL before showing any success badge.
However, the user confirmed on 2026-05-10 that it is not working on the live
site. The fix plan exists in inbox files 5.8 AI Studio Fix.docx and
5.8 READ AI Studio Not working.docx. Status: NOT ACTIONED.

**True source-preserving image edit** — The mask painter UI is fully wired.
The inpaint route (HF SDXL inpainting-0.1) is wired. But a real inpaint
result requires the user to configure a key (ps_hfimg for HF, ps_k_gemini
for Gemini, or a local SD server). Without a key, it falls back to standard
img2img which does not truly preserve the source. Status: PROVIDER NEEDED.

**Hands / fingers / anatomy-safe edits** — The anatomy refusal gate is wired.
If a prompt involves hands, fingers, face, or body anatomy AND no strong inpaint
provider is configured, the system refuses rather than generate a broken result.
With ps_hfimg or local SD configured, real inpainting is attempted. Status:
PROVIDER NEEDED (gate works; real output requires provider key).

**Audio routing** — Fixed in v17g76. Conjugated SFX terms (laughing, screaming,
engine roar) now correctly route to procedural synthesis or "provider needed"
instead of being read aloud via TTS. All audio outputs are honestly labeled:
no green OK badge fires without a real output blob. Status: READY FOR USER
VERIFICATION (v17g76 ships today; iPad test not yet done).

---

## 2. Capability Truth Table

Labels:
- WORKING REAL OUTPUT — code correct, user-verified on iPad, real file produced
- READY FOR USER VERIFICATION — code correct, real output produced, iPad not yet tested
- PARTIAL — some paths work, some do not
- PROVIDER NEEDED — wired but requires API key or local server
- PLACEHOLDER ONLY — runs, produces a real file, but file is synthesized / not realistic
- NOT DONE — no implementation exists
- FAIL — user confirmed broken on live site


### 2A — Image Generation

| Capability | Status | What the code actually does | Key / dependency |
|---|---|---|---|
| Text-to-image (Image Prompt PWA) | FAIL | Real 17-provider chain, real result cards. User confirmed not working on device 2026-05-10. Root cause undiagnosed. | pollflux / pollinations require no key and should work — investigate why they do not |
| Text-to-image (AI Chat Studio) | FAIL | Same real provider chain. User confirmed not working on device 2026-05-10. | Same — investigate |
| Image-to-image edit (no mask) | READY FOR USER VERIFICATION | Routes to img2img-capable providers (Gemini, HF, SiliconFlow, Local SD). Anatomy gate fires for sensitive prompts. | ps_k_gemini or ps_hfimg recommended |
| Source-preserving inpaint (mask) | PROVIDER NEEDED | Mask painter wired. Binary mask passed to HF SDXL inpainting-0.1 or Local SD. Refuses if no strong provider configured. | ps_hfimg or local SD URL required |
| Anatomy-safe edit (hands / face / body) | PROVIDER NEEDED | Refusal gate wired. System refuses rather than produce broken anatomy if no inpaint provider is set. With key: real inpaint attempted. | ps_hfimg or local SD required |
| Face restoration (GFPGAN) | PROVIDER NEEDED | Real HF endpoint wired (TencentARC/GFPGAN). Task filter routes upscale/face tasks to correct provider. | ps_hfimg required |
| Face restoration (CodeFormer) | PROVIDER NEEDED | Real HF endpoint wired (sczhou/CodeFormer). | ps_hfimg required |
| Upscale (Real-ESRGAN) | PROVIDER NEEDED | Real HF endpoint wired (ai-forever/Real-ESRGAN). | ps_hfimg required |
| Provider health / auto-fallback | WORKING REAL OUTPUT | Circuit breaker per provider (3 fails in 5 min = skip). Ordered fallback chain. Task-aware provider filter. | No key needed for logic layer |
| Output proof gate | WORKING REAL OUTPUT | No success badge fires without a real blob URL or data URL. All cards include providerId, skipped chain, opType. | — |


### 2B — Animation

| Capability | Status | What the code actually does | Key / dependency |
|---|---|---|---|
| Camera-motion animation (Ken-Burns) | PLACEHOLDER ONLY | Canvas captureStream + MediaRecorder. 1.15x zoom + 30 px pan over 5 seconds. Produces real WebM blob (>1024 B, magic bytes verified). Honestly labeled "camera-motion preview, not true subject motion." | No key needed. On-device only. |
| True subject / character animation | NOT DONE | No implementation. Prompt is saved with "animation provider needed" note. | Requires image-to-video provider (e.g. Wan, Kling, Runway-style) — none wired |
| Motion prompt capture | PLACEHOLDER ONLY | Prompt text saved to scene metadata. No motion is actually applied from the prompt. | Animation provider needed |


### 2C — Audio

| Capability | Status | What the code actually does | Key / dependency |
|---|---|---|---|
| Voice / narration (TTS) | READY FOR USER VERIFICATION | Browser speechSynthesis. 7 voice styles (narrator, woman, man, child, elder, calm, dramatic) with pitch/rate. Real playback. Guard blocks SFX-like input in this mode. | No key needed. Web Speech API. |
| SFX — wind / rain / storm | PLACEHOLDER ONLY | OfflineAudioContext bandpass/highpass filtered noise. Real WAV blob. Not a recording. Honestly labeled "Procedural placeholder." | HF audio provider needed for realism |
| SFX — engine / roar / rumble | PLACEHOLDER ONLY | Sawtooth 55 Hz + 120 Hz bandpass noise layer. Real WAV blob. Honestly labeled "Engine placeholder." Fixed in v17g76. | HF audio provider needed for realism |
| SFX — crowd / chatter / hammer | PLACEHOLDER ONLY | Bandpass noise / square-wave oscillator. Real WAV blob. Honestly labeled. | HF audio provider needed for realism |
| SFX — laughter / singing / speech | NOT DONE (guard active) | voiceLikeRx guard fires, saves prompt, shows "Audio Provider Needed" card. No fake audio produced. | HF audio model needed (e.g. AudioCraft / MusicGen) |
| Ambience mode | PLACEHOLDER ONLY | Routes to same OfflineAudioContext synth as SFX. Same honest badge. | HF audio provider needed |
| Music mode | PLACEHOLDER ONLY | Four sine waves at [261.63, 329.63, 392, 523.25] Hz (C major chord arpeggio). Real WAV blob. Not a real music track. | HF MusicGen or similar needed |
| Audio routing guards (v17g76) | READY FOR USER VERIFICATION | sfxLikeRx (no word-boundary) blocks SFX in voice mode. voiceLikeRx blocks voice-like terms in SFX mode. Fixed conjugated forms (laughing, screaming, singing). | iPad test checklist delivered 2026-05-10 |
| Unmatched prompt badge | WORKING REAL OUTPUT | kind=tone → red "Placeholder tone" badge. Engine → "Engine placeholder." No false-positive green OK. | — |


### 2D — Video

| Capability | Status | What the code actually does | Key / dependency |
|---|---|---|---|
| Video generation | NOT DONE | Prompt saved. Links to external-video-fallback.html. No provider wired. No clip produced. | Video provider needed |
| Video muxing (audio + image → video) | NOT DONE | No FFmpeg.wasm or mux path wired. | FFmpeg.wasm or MediaRecorder mux needed |


### 2E — Provider Registry

| Provider | Free / No Key | Key var | Inpaint | img2img | Upscale | Face |
|---|---|---|---|---|---|---|
| Pollinations Flux | Yes | — | No | No | No | No |
| Pollinations | Yes | — | No | No | No | No |
| Pollinations Turbo | Yes | — | No | No | No | No |
| AI Horde | Yes (anon) | — | No | No | No | No |
| AI Horde SDXL | Yes (anon) | — | No | No | No | No |
| Hugging Face | User key | ps_hfimg | Yes | Yes | No | No |
| HF SDXL-Turbo | User key | ps_hfimg | No | No | No | No |
| Real-ESRGAN (HF) | User key | ps_hfimg | No | No | Yes | No |
| GFPGAN (HF) | User key | ps_hfimg | No | No | No | Yes |
| CodeFormer (HF) | User key | ps_hfimg | No | No | No | Yes |
| Gemini Image | User key | ps_k_gemini | No | Yes | No | No |
| Cloudflare AI | User key | ps_cftk + ps_cfac | No | No | No | No |
| Cloudflare SDXL-Lightning | User key | ps_cftk + ps_cfac | No | No | No | No |
| Together AI | User key | ps_tgk | No | No | No | No |
| DeepAI | User key | ps_daik | No | No | No | No |
| SiliconFlow | User key | ps_sfk | No | Yes | No | No |
| Local SD | User server | ps_local_sd_url | Yes | Yes | No | No |


### 2F — UI / UX

| Capability | Status | Notes |
|---|---|---|
| Mask painter (brush UI) | READY FOR USER VERIFICATION | Binary canvas mask, pointer + touch, wired to inpaint route. Requires ps_hfimg for real inpaint output. |
| Result card output proof | WORKING REAL OUTPUT | Every card gates on real blob/URL. providerId + skipped chain + opType always shown. |
| Anatomy refusal card | WORKING REAL OUTPUT | Fires honest refusal card when no strong inpaint provider is configured. |
| Sub-mode picker (audio) | WORKING REAL OUTPUT | Pops picker on first Send if no audioSubMode set. Saves choice to STATE. |
| Version badge | WORKING REAL OUTPUT | Shows v17g76 in Load UI header. |


---

## 3. Provider Key Quick Reference

One key unlocks the most:

| Key var | Where to set | Unlocks |
|---|---|---|
| ps_hfimg | Load Settings | HF image gen + SDXL inpaint + Real-ESRGAN + GFPGAN + CodeFormer + SDXL-Turbo |
| ps_k_gemini | Load Settings | Gemini image gen + img2img |
| ps_cftk + ps_cfac | Load Settings | Cloudflare Flux Schnell + SDXL-Lightning |
| ps_tgk | Load Settings | Together AI FLUX |
| ps_daik | Load Settings | DeepAI text-to-image |
| ps_sfk | Load Settings | SiliconFlow (off by default) |
| ps_local_sd_url | Load Settings | Local SD server — full inpaint + img2img with no rate limits |
| (none needed) | — | pollflux, pollinations, pollturbo, AI Horde, AI Horde SDXL |


---

## 4. What Should Be Built Next (Priority Order)

These are ordered by impact and by whether they require iPad testing after build.

| Priority | Build | Testing burden | Source spec |
|---|---|---|---|
| 1 | Diagnose + fix why Image Prompt and AI Chat Studio fail on device | User must confirm | 5.8 AI Studio Fix.docx + 5.8 READ AI Studio Not working.docx |
| 2 | Verify v17g76 audio routing on iPad (6-item checklist) | User must run checklist | SESSION_NOTES_2026-05-10.md |
| 3 | Bundled CC0 SFX library — real audio files for engine / wind / crowd / footsteps replacing OfflineAudioContext | Minimal (audio plays or it does not) | X-AI-AUDIO (inbox Load Main AI Addendum.docx) |
| 4 | Load Main Part 1 — fix contradictory AI/privacy copy | No iPad needed (text-only) | Load Main Next Build Plan.docx |
| 5 | Provider capability flags audit (24-flag schema) | No iPad needed (code only) | 5.7 AI Providers Verification.docx |
| 6 | Feature Verification Dashboard (43 auto-tests, Run All Tests button) | Minimal (button runs tests) | Load Main Next Build Plan.docx Part 2 |
| 7 | True audio provider (HF AudioCraft / MusicGen / sound-smith) | User must verify audio output | X-AI-AUDIO |
| 8 | Structured animation parser — scene intent → Animation Provider Needed card | Minimal | X-VIDEO-AI |


---

## 5. Open Blockers

| Blocker | Who resolves | Notes |
|---|---|---|
| Image Prompt and AI Chat Studio confirmed not working on live site | Need user to report exact behavior (blank page, spinner, error card, silent fail?) | Cannot fix without knowing the failure mode |
| v17g76 audio routing not yet user-verified | User iPad test | Checklist is in SESSION_NOTES_2026-05-10.md |
| ps_hfimg key not confirmed set | User | Without it: no inpaint, no face restore, no ESRGAN, no SDXL-Turbo |
| True subject animation | External provider needed | No on-device solution exists. Ken-Burns is the only path. |
| Realistic SFX / laughter / singing | External provider needed | OfflineAudioContext synth cannot produce these convincingly. |
| Video generation | External provider needed | No provider wired. Prompt-save only. |
| Password hash rotation (acr2026 plaintext) | User must supply new password | HANDOFF.md Task — 3 standalone files still use plaintext comparison |
