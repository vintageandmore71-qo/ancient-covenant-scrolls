# Session Handoff — 2026-05-16 (Sunday Read-First)

## READ THESE FIRST (in order)
1. The 8 inbox docx files — fallback chain order and connection details come from these files. Read them before building anything Sunday.
   - `inbox/LoadStudio_Director_AI_Production_System_Addendum.docx`
   - `inbox/Free_AI_APIs_SDKs_2026.docx`
   - `inbox/LoadCap_Free_Providers.docx`
   - `inbox/LoadCap_Asset_Libraries.docx`
   - `inbox/VN_Feature_Provider_Map.docx`
   - `inbox/Free_OpenSource_AI_Providers_2026.docx`
   - `inbox/Free_OpenSource_AI_Image_Rivals_MJ_Adobe_2026.docx`
   - `inbox/Providers for Load Studio, Eco, AI.docx`
2. `loadstudio/PROVIDER_REGISTRY_REFERENCE.md` — master provider list (compiled from the 8 files)
3. This file
4. `git log --oneline -20`

---

## Current State

- Latest commit on `main`: `7e62512` — "Remove Fish Audio, Unsplash, ZapSplat — proprietary, not free & open source (v133)"
- Branch: `claude/check-session-visibility-0xukV` — all code merged to main, treat as finished
- SW cache: `loadstudio-complete-v133`
- Working tree: clean after push

---

## CRITICAL USER RULE — DO NOT VIOLATE

**Only wire free and open source providers.** Source: exactly 8 inbox docx files compiled into `loadstudio/PROVIDER_REGISTRY_REFERENCE.md`.

Providers removed for violating this rule:
- DeepAI, SiliconFlow, Cloudflare Workers AI (image), Leonardo AI, Tensor Art — proprietary image gen
- Fish Audio — proprietary TTS
- Unsplash — proprietary stock photos
- ZapSplat — proprietary SFX

Do NOT re-add any of these.

---

## What Is Currently WIRED (real fetch() calls in load-provider-registry.js)

### generateImage()
- `pollinations-image` — free, no key
- `aihorde` — free, no key
- `comfyui` — local server
- `a1111` — local server
- `pixazo` — free, no key (FLUX Schnell ~1.2s)
- `huggingface` — generic HF key path
- `dezgo`, `getimgai`, `replicate`, `fal-ai`, `wavespeedai`, `ideogram` — paid/key providers (already in registry from before)
- HF Inference routing for 19 open-source models (all require HF key):
  `flux`, `flux-1-schnell`, `flux-2-dev`, `sdxl`, `sd-15`, `sd-35`, `sd-35-medium`, `kandinsky`, `pixart`, `hidream`, `sana`, `sana-sprint`, `wuerstchen`, `dreamshaper`, `openjourney`, `cyberrealistic-xl`, `realvisxl`, `juggernaut-xl`, `deepfloyd-if`, `dalle-mini`

### generateAudio() / generateSpeech()
- `browser-tts` — free, no key, Web Speech API
- `elevenlabs` — free 10K chars/month tier, requires key
- HF Inference cloud paths (requires HF key): `kokoro`, `bark`, `xtts-v2`, `mms-tts`, `vits`
- `coqui` — local server (localhost:5002)
- `dia` — HF Inference (`nari-labs/Dia-1.6B`) OR local endpoint
- Local endpoint path (server must be running) for: `kokoro`, `f5-tts`, `piper`, `bark`, `tortoise-tts`, `valle-x`, `chatterbox`, `chatterbox-turbo`, `melo-tts`, `styletts2`, `orpheus`, `openvoice`, `dia`, `higgs-audio`, `xtts`, `localai`

### transcribeAudio()
- `deepgram`, `assemblyai` — require keys
- HF Inference cloud paths (requires HF key): `whisper`, `faster-whisper`, `whisperx`, `moonshine`, `distil-whisper`
- Local endpoint path for: `faster-whisper`, `localai`, `whisperx`, `vosk`, `nvidia-canary`, `qwen3-asr`, `pyannote`, `speechbrain`, `nemo-asr`, `paddlespeech`

### generateVideo()
- `zsky` — free, no key (1080p with audio)
- `kling`, `hailuo`, `luma-dream`, `pika`, `pixverse`, `heygen` — require keys (free tiers exist)
- Local endpoint path for: `ltx-video`, `animatediff`, `cogvideox`, `wan`, `hunyuanvideo`

### searchMusic()
- `ccmixter` — no key
- `openverse-audio` — no key
- `freesound`, `pixabay-music`, `free-music-archive`, `jamendo` — free keys

### searchSFX()
- `openverse-sfx` — no key
- `bbc-sfx` — no key (33,000+ sounds, personal/research)
- `freesound` — free key

### searchStock()
- `wikimedia`, `nasa-library`, `openverse`, `internet-archive`, `coverr` — no key
- `pexels`, `pixabay-stock` — free keys

### callLLM()
- `pollinations-text` — no key
- `gemini` — free 1500/day with key
- Cloud routes with key: `groq`, `cerebras`, `sambanova`, `nvidia-nim`, `fireworks-ai`, `aiml-api`, `mistral`, `together-ai`, `deepinfra`, `ai21`, `cohere`, `openai`, `openrouter`
- OpenAI-compatible fallback covers: `ollama`, `lm-studio`, `localai`, `litellm`, `vllm`, `tgi`

### generateMusic()
- HF Inference (requires HF key): `musicgen` (facebook/musicgen-small), `audiogen` (facebook/audiogen-medium)
- Local endpoint: `musicgen`, `audiogen`, `riffusion`, `stable-audio-open`, `diffrhythm`, `audiox`

### generateLipSync()
- Local endpoint: `musetalk`, `wav2lip`, `sadtalker`, `liveportrait`, `latentsync`

### removeBackground()
- `rmbg` / `bg-removal-hf` — RMBG-2.0 via HF Inference (requires HF key, Apache 2.0)

---

## What Is NOT Wired — Priority for Sunday

### 1. In PROVIDERS array but no fetch() handler
These two are declared in `_PROVIDERS` but `generateImage()` / `searchSFX()` fall through to "unsupported":

| Provider | Category | Access | Issue |
|---------|---------|--------|-------|
| `mage-space` | image-gen | free, no key, proprietary | No documented public API. Check mage.space docs before wiring. |
| `gensfx` | sfx-generation | free, no key, proprietary | gensfx.com — likely browser-only tool, no public API. Confirm first. |

**Action Sunday**: Before wiring either, verify whether a machine-accessible endpoint exists. If no API, mark as `blockedReason:'no-public-api'` in the PROVIDERS array and leave as not wired.

### 2. PROVIDER_REGISTRY_REFERENCE.md is stale
The reference file still shows many providers as STUB or PLANNED that are now REAL. Update it to reflect:
- `rmbg-2` — REAL (HF Inference, wired as `rmbg`)
- `dia` — REAL (HF cloud + local)
- `coqui` — REAL (local)
- `bbc-sfx` — REAL
- `internet-archive`, `coverr` — REAL (searchStock)
- All 19 HF Inference image model IDs — REAL
- All local-endpoint TTS/STT/video providers — REAL (require local server)

### 3. Pipeline registry audit
`loadstudio/load-pipeline-registry.js` — 19 pipeline definitions. After all the wiring additions, some pipelines may not list the newly available providers. Run a diff between pipeline membership arrays and what is now wired.

Priority pipelines to audit:
- `commercial-image` — should include `pixazo`, HF image models
- `music-audio-gen` — should include `ccmixter`, `openverse-audio`, `bbc-sfx`
- `stock-search` — should include `internet-archive`, `coverr`, `nasa-library`
- `tts-voice` — should include `dia`, `coqui`, `chatterbox`, all HF TTS paths

### 4. Test with real keys
No provider has been live-tested against its API. Priority test order:
1. HF key — unlocks 25+ providers at once (19 image models + 5 TTS + 2 music gen + 1 bg removal)
2. `pollinations-image` and `aihorde` — no key needed, test immediately
3. `zsky` — no key needed, test video gen
4. `ccmixter` and `openverse-audio` — no key, test music search
5. `bbc-sfx`, `openverse-sfx` — no key, test SFX search

---

## Outstanding / Blocking

1. **pollJobResult() has no cases for `leonardo-ai` or `tensor-art`** — these were wired in an earlier PR (PR #157) but then REMOVED in PR #158 because they're proprietary. No longer relevant.

2. **`generateLipSync()` method exists** but only routes to local endpoints. No cloud/free hosted path for lip sync. musetalk/wav2lip/sadtalker all require local GPU server.

3. **No `cloudflare-whisper` handler** — Cloudflare Workers AI STT. The user's rule is "free & open source only" — Cloudflare Workers AI is proprietary. Skip unless user confirms it's OK (it has a free tier).

4. **`emotivoice`** — Apache 2.0, 2000+ voices — in the TTS pipeline list in the reference file but has no handler. It's a local server. Would be covered by generic local endpoint path if user runs emotivoice server. Check if it needs a specific endpoint path.

---

## What Sunday's Session Must Accomplish (in order)

1. **READ THE 8 INBOX FILES FIRST** — the fallback chain order and connection priority for every capability (image, audio, video, STT, music, SFX, stock, LLM) is specified in those files. Do not invent chains. Extract them from the files and use them exactly.

2. **Build auto-fallback pipeline** — `routeToFallback()` exists but is never called automatically. Need:
   - `_isQuotaError(status, body)` — detects 429, 402, "quota", "rate limit", "insufficient credits" vs hard failures
   - `_FALLBACK_CHAINS` map — ordered priority lists per capability, sourced from the 8 files
   - Auto-trigger inside each generate* method — on quota/auth error, call routeToFallback() instead of rejecting
   - Policy confirmed by user: proprietary providers with free tiers are OK as long as auto-cutoff jumps to next provider when tier is used up

3. Verify `mage-space` and `gensfx` APIs — wire if accessible, mark blocked if not
4. Update `PROVIDER_REGISTRY_REFERENCE.md` to show current real status for all providers wired this session
5. Audit `load-pipeline-registry.js` — add newly wired providers to correct pipeline chains
6. Test providers with real keys (HF key first — biggest unlock)
7. If any providers from the 8 files are still missing, wire them

---

## What CANNOT Be Wired (per user rule — free & open source only)

These are in the 8 files but are proprietary services — do not wire:
- DeepAI, SiliconFlow, Cloudflare Workers AI (image gen) — proprietary
- Fish Audio — proprietary TTS
- Unsplash — proprietary stock photos
- ZapSplat — proprietary SFX (paid tiers, not truly free/open)
- Leonardo AI, Tensor Art — proprietary image gen (job-submit pattern, paid)
- Pixabay image gen — proprietary (their generation service, not search)

Note: Pixabay Music and Pixabay Stock SEARCH are wired (free API key, not generation).

---

## Capability Gaps This Session

- Cannot fetch live deployed URL (dssorit.github.io) directly — use `raw.githubusercontent.com` to verify deployed files
- Cannot run providers against live APIs — only code was written, zero live tests performed
- GitHub MCP tools available and working

---

## Recovery

If anything breaks: check `git log --oneline -20` for the last clean commit, then `git checkout <sha> -- loadstudio/load-provider-registry.js`.

Backup branches from prior sessions remain intact (see earlier SESSION_NOTES files).

---

## Today's Commit Log (this session)

```
8f5639a Merge remote-tracking branch 'origin/main' into claude/check-session-visibility-0xukV
7e62512 Remove Fish Audio, Unsplash, ZapSplat — proprietary, not free & open source (v133)
30e2c13 Merge main, resolve sw.js conflict — keep v133
483588a Remove Fish Audio, Unsplash, ZapSplat — proprietary services, not free & open source
636078b Remove proprietary/paid provider handlers (v132)
531a74a Remove proprietary/paid provider handlers — free & open source only
b59d5b2 session notes 2026-05-16 — provider wiring sprint, handoff for Sunday
1490b81 Wire remaining providers in LoadStudio registry (v131)
a2a4770 Wire 20+ providers across generateImage, generateAudio, searchSFX, searchStock, callLLM; add removeBackground
0218e25 Wire Pixazo and Fish Audio providers with real fetch() calls
```
