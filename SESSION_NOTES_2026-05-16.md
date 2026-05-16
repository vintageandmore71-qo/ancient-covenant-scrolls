# Session Notes — 2026-05-16

## Current State

- Latest merged commit: `1490b81` on `main` (squash merge of PR #157)
- Branch used: `claude/check-session-visibility-0xukV` (finished — treat as done)
- SW cache: `loadstudio-complete-v131`
- Working tree: clean after push

## Built Today

- **ZSky AI** wired in `generateVideo()` — PR #153
- **Openverse + Jamendo** wired in `searchMusic()` / `searchSFX()` — PR #154
- **HF Inference cloud paths** for TTS (Kokoro, Bark, XTTS, MMS-TTS/VITS), music gen (MusicGen, AudioGen), transcription (Whisper variants) — PR #156
- **PROVIDER_REGISTRY_REFERENCE.md** corrected (removed false "86 stubs" claim) — PR #155
- **Pixazo** wired in `generateImage()` (free FLUX, no key) — PR #157
- **Fish Audio** wired in `generateAudio()` (TTS + voice clone, requires key) — PR #157
- **HF Inference image routing** for 19 open-source models: FLUX.1-schnell, FLUX.1-dev, SDXL, SD 1.5, SD 3.5, SD 3.5 Medium, Kandinsky 2.2, PixArt-Sigma, HiDream, Sana, Sana-Sprint, Wuerstchen, DreamShaper, OpenJourney, RealVisXL, Juggernaut-XL, DeepFloyd-IF, dalle-mini, CyberRealistic-XL — PR #157
- **DeepAI** wired in `generateImage()` (requires api-key header) — PR #157
- **SiliconFlow** wired in `generateImage()` (requires Bearer key) — PR #157
- **Cloudflare Workers AI** wired in `generateImage()` AND `callLLM()` (requires accountId + API token in provider settings) — PR #157
- **Leonardo AI** wired in `generateImage()` (job-submit pattern, returns image-job) — PR #157
- **Tensor Art** wired in `generateImage()` (job-submit pattern, returns image-job) — PR #157
- **Coqui TTS** wired in `generateAudio()` (local server, default port 5002) — PR #157
- **Dia TTS** wired in `generateAudio()` (HF Inference `nari-labs/Dia-1.6B` or local endpoint) — PR #157
- **BBC Sound Effects** wired in `searchSFX()` (free, no key) — PR #157
- **ZapSplat** wired in `searchSFX()` (requires X-API-Key) — PR #157
- **Unsplash** wired in `searchStock()` (requires Client-ID key) — PR #157
- **Internet Archive** wired in `searchStock()` (free, no key, supports image/video/audio mediaType) — PR #157
- **Coverr** wired in `searchStock()` (free stock video, no key) — PR #157
- **RMBG-2.0** (briaai/RMBG-2.0) — new `removeBackground()` method added (uses HuggingFace key) — PR #157

## Provider Status After Today

Total in registry: ~262 providerIds
Wired with real fetch() calls (after today): ~130+ cases

### What is wired and working (no server needed):
- pollinations-image (zero-setup image gen)
- aihorde (free, no key image gen)
- browser-tts (zero-setup TTS)
- ccmixter, openverse-audio, openverse-sfx, openverse, wikimedia, nasa-library, internet-archive, coverr, bbc-sfx (free, no key, search)
- With HF key: all 19 HF image models (flux, sdxl, sd-15, sd-35, kandinsky, pixart, hidream, sana, wuerstchen, dreamshaper, openjourney, realvisxl, juggernaut-xl, deepfloyd-if, dalle-mini, cyberrealistic-xl, sana-sprint)
- With HF key: kokoro, bark, xtts, xtts-v2, mms-tts, vits (TTS via HF Inference)
- With HF key: musicgen, audiogen (music gen via HF Inference)
- With HF key: whisper, faster-whisper, whisperx, moonshine, distil-whisper (transcription via HF Inference)
- With HF key: dia (TTS via HF Inference `nari-labs/Dia-1.6B`)
- With HF key: removeBackground (RMBG-2.0 via HF Inference)
- With other free keys: unsplash, pixabay-stock, pexels, pixabay-music, jamendo, freesound, elevenlabs, deepai, siliconflow, fish-audio, zapsplat
- With account + key: cloudflare-workers-ai (image + LLM), leonardo-ai, tensor-art, replicate, fal-ai, kling, hailuo, luma-dream, pika, pixverse, heygen, assemblyai, deepgram, ideogram, getimgai, wavespeedai, dezgo
- With Gemini key: gemini (callLLM)
- Cloud LLM (key required): groq, cerebras, sambanova, nvidia-nim, fireworks-ai, aiml-api, mistral, together-ai, deepinfra, ai21, cohere, openai, openrouter
- With local server: all local providers (ollama, lm-studio, localai, litellm, vllm, tgi, coqui, a1111, comfyui, wan, hunyuanvideo, ltx-video, musetalk, wav2lip, sadtalker, liveportrait, latentsync, lipgan, makeitalk, difftalk, etc.)

### What is NOT wired and WHY:
- Browser/JS libs (canvas-api, web-audio-api, fabricjs, gsap, lottiefiles, mediapipe, bg-removal-js, webcodecs, tonejs): these are client-side libraries, not fetch APIs — caller uses their JS API directly
- Desktop apps (kdenlive, shotcut, diffusionbee, draw-things, invokeai, fooocus): local GUI tools, no HTTP API
- Music libraries without public APIs (incompetech, bensound, yt-audio-library, mixkit-sfx, soundbible): no machine-readable REST endpoints
- Research models with no hosted API (audiolm, musiclm, emotivoice, encodec, voicebox-app): no public inference endpoint
- Source separation tools (demucs, spleeter, basic-pitch): Python tools only — must be served locally, caught by generic endpoint routing if user runs a server

## Outstanding / Blocking

1. **Cloudflare Workers AI needs `accountId` in provider settings** — not just an apiKey. The settings UI may need a field for this. Currently it reads `s.accountId`. User must set it in lpr_settings_v1 under `cloudflare-workers-ai.accountId`.

2. **Leonardo AI + Tensor Art return image-job not image** — they are async. The `pollJobResult()` method does NOT yet have cases for `leonardo-ai` or `tensor-art`. Sunday: add poll handlers for both.

3. **PROVIDER_REGISTRY_REFERENCE.md is outdated** — reflects pre-session state. Should be updated to reflect today's wiring additions.

4. **Pipeline wiring** — providers are now registered and fetchable, but the pipeline registry (`load-pipeline-registry.js`) may not route to all newly wired providers. Sunday: audit pipeline membership for newly wired providers and ensure routes are correct.

5. **Test coverage** — no automated test results. All providers are wired with real fetch() calls but none have been live-tested against their APIs. Priority on Sunday: test each provider tier with real keys.

6. **gensfx** — in PROVIDERS array (AI-generated SFX), no handler. Needs to be checked against the 8 files for endpoint details.

## Pending / Parked

- Full pipeline audit (load-pipeline-registry.js) to confirm all wired providers are in the right pipelines
- Studio UI for provider settings (accountId field for Cloudflare, voiceId for Fish Audio, etc.)
- Export/CinePWA packaging — providers must not leak keys in exports (already enforced by normalizeResult scrubbing)

## Priority for Sunday Session

**DO THIS IN ORDER:**

1. Add `pollJobResult()` cases for `leonardo-ai` and `tensor-art` (they return image-job today, no poller)
2. Update PROVIDER_REGISTRY_REFERENCE.md to reflect current wired status
3. Audit pipeline registry for newly wired providers
4. Test providers with real keys (HF key is the biggest unlock — tests 25+ providers at once)
5. Wire any remaining providers from the 8 files not yet covered (check gensfx, and any others found in re-audit)

## Capability Gaps This Session

- Cannot fetch live deployed URL (dssorit.github.io) — use raw.githubusercontent.com to verify deployed files
- Cannot run providers against live APIs to confirm correctness — only code was written
- GitHub MCP tools available and working

## Backups

No new backup branch created this session (no user-confirmed working state). Previous backup branches remain intact.

## Today's Commit Log

```
a2a4770 Wire 20+ providers across generateImage, generateAudio, searchSFX, searchStock, callLLM; add removeBackground
0218e25 Wire Pixazo and Fish Audio providers with real fetch() calls
48329d7 wire HF cloud paths for TTS, music gen, transcription (#156)
9b6ad27 correct PROVIDER_REGISTRY_REFERENCE.md — remove false stub claims (#155)
4253fd2 wire Openverse, Jamendo to LoadStudio search (#154)
ee7c2ed fix: add getProviderSettings() and wire ZSky AI in generateVideo() (#153)
```

## Recovery

If anything breaks: `git checkout backup/<name>` — check prior SESSION_NOTES for backup branch names.
