# Provider Registry Reference — Load Eco / Load Studio / Load AI

Permanent reference. Read at every session start alongside SESSION_NOTES, HANDOFF.md, MASTER_BACKLOG.md.
Source: 10 inbox docs (LoadStudio_Director_AI_Production_System_Addendum.docx,
Free_AI_APIs_SDKs_2026.docx, LoadCap_Free_Providers.docx, LoadCap_Asset_Libraries.docx,
VN_Feature_Provider_Map.docx, Free_OpenSource_AI_Providers_2026.docx,
Free_OpenSource_AI_Image_Rivals_MJ_Adobe_2026.docx, Providers for Load Studio, Eco, AI.docx,
Free_SFX_Provider_Guide_2026.docx, Free_AI_Provider_Connection_Guide_2026.docx)
+ code audit of the 8 provider/registry lib files.

Last updated: 2026-05-19. Update this file whenever a provider is wired, a stub is promoted to real, or a
new provider is added. Never re-read the inbox docs to answer provider questions — use this file.

---

## ARCHITECTURE OVERVIEW

Two separate provider stacks exist. They must be kept in sync.

### Load Main stack
- `load/lib-load-image-providers.js` — 17 image providers, ALL real API calls. Exposed as `window.LoadImageProviders.build(cfg)`. Config passed as `C` object.
- `load/lib-provider-registry.js` — 70-provider metadata registry. Capability flags only. No real API calls. Feeds Load Eco UI panels.
- `load/lib-load-ai-core.js` — routing logic (intent→provider). No API calls itself.
- `load/lib-load-ai-pipeline.js` — pipeline/prompt compilation logic. No API calls.

### LoadStudio stack
- `loadstudio/load-provider-registry.js` — 98 providers, exposed as `window.LoadProviderRegistry`. ALL generate* methods have real fetch() calls — not stubs. Local providers (Kokoro, MusicGen, Wan, etc.) require a local model server to be running. Cloud providers (Kling, Hailuo, ElevenLabs, etc.) require API keys in settings. Free no-key providers (Pollinations, AI Horde, browser-tts, ccMixter, Wikimedia) work immediately. Keys in `_settings` object (localStorage `lpr_settings_v1`).
- `loadstudio/load-pipeline-registry.js` — 19 pipeline definitions, metadata only. No real calls.
- `loadstudio/load-orchestrator.js` — delegates to LoadProviderRegistry methods.
- `loadstudio/load-asset-registry.js` — localStorage asset metadata. Scrubs `apiKey`/`token`/`secret` from all exports.

### Key threading
| Stack | Config Object | localStorage Key | How it's passed |
|-------|--------------|-----------------|-----------------|
| Load Main image | `C` object in `lib-load-image-providers.js` | `ps_sfk` (SiliconFlow), `ps_use_sf`, etc. | Caller constructs C and passes to `build(cfg)` |
| Load Main AI | `providerPrefs` object in `load.js` | varies per provider | Read from LS at init, passed to AI core functions |
| LoadStudio | `_settings` object | `lpr_settings_v1` | Read from LS in `SaveProviderSettings()`, passed internally |

**Rule:** Never mark a provider OK/Ready/success unless a real URL, blob, base64, or file exists. No false positives ever.

---

## REQUIRED PUBLIC API — LoadProviderRegistry (loadstudio/load-provider-registry.js)

All methods below exist and are implemented as of 2026-05-16:

```javascript
window.LoadProviderRegistry = {
  listProviders(),                          // returns all provider objects
  listByCapability(capability),             // filters by capability flag
  getProvider(providerId),                  // returns single provider object — EXISTS
  getProviderStatus(providerId),            // EXISTS
  getProviderSettings(providerId),          // EXISTS (added 2026-05-16)
  getPipelineMembership(providerId),        // EXISTS (attached after object)
  saveProviderSettings(providerId, settings), // EXISTS
  testProvider(providerId),                 // EXISTS — real network/local test, sets status
  generateImage(request),                   // EXISTS — real fetch() calls
  generateAudio(request),                   // EXISTS — real fetch() to local TTS servers + ElevenLabs
  generateVideo(request),                   // EXISTS — real fetch() to cloud (Kling/Hailuo/Luma/Pika/PixVerse/HeyGen/ZSky) + local
  transcribeAudio(request),                 // EXISTS — real fetch() to DeepGram/AssemblyAI + faster-whisper local
  generateLipSync(request),                 // EXISTS — real fetch() to MuseTalk/Wav2Lip/SadTalker/LivePortrait local
  generateMusic(request),                   // EXISTS — real fetch() to MusicGen/AudioGen/Riffusion/StableAudio local
  searchMusic(request),                     // EXISTS — ccMixter(free), Freesound, Pixabay, FMA, Jamendo, Openverse-audio
  searchSFX(request),                       // EXISTS — Freesound, Openverse-sfx
  searchStock(request),                     // EXISTS — Pexels, Pixabay, Wikimedia(free), NASA(free), Openverse(free)
  pollJobResult(jobId, providerId),         // EXISTS — AI Horde, ComfyUI, AssemblyAI, Kling, Hailuo, Luma, Pika, PixVerse, HeyGen
  routeToFallback(request),                 // EXISTS
  normalizeResult(result),                  // EXISTS — returns: { ok, providerId, providerName, capability, imageUrl, audioUrl, videoUrl, blob, base64, file, text, error, status, raw }
}
```

---

## PROVIDER MASTER LIST

### CAPABILITY ABBREVIATIONS
- img-gen = text-to-image generation
- img2img = image-to-image / edit
- inpaint = inpainting with mask
- upscale = image upscaling
- face-restore = face restoration
- bg-remove = background removal
- identity = face/identity preservation across images
- pose = pose/depth/edge control
- style = style transfer
- video = text-to-video or image-to-video
- lipsync = lip sync / talking avatar
- llm = large language model (text)
- tts = text-to-speech
- tts-clone = voice cloning TTS
- stt = speech-to-text / transcription
- music = music generation
- sfx = sound effects generation
- sep = audio source separation
- edit = video editing / timeline
- font = font library
- stock = stock media (images/video)

### STATUS CODES
- REAL = real API call, implemented and wired
- STUB = declared but returns Promise.reject()
- META = metadata/registry entry only, no implementation
- MISSING = called by orchestrator/pipeline but not declared anywhere
- PLANNED = in spec docs, not yet added to any file

---

## 1. IMAGE GENERATION

### 1A. Free / No Key Required

| Provider ID | Name | Capability | Where implemented | Notes |
|------------|------|-----------|------------------|-------|
| `pollflux` | Pollinations FLUX | img-gen | lib-load-image-providers.js REAL | Best free no-key. Use as #1 fallback |
| `pollinations` | Pollinations Classic | img-gen | lib-load-image-providers.js REAL | |
| `pollturbo` | Pollinations Turbo | img-gen | lib-load-image-providers.js REAL | |
| `horde` | AI Horde anon | img-gen | lib-load-image-providers.js REAL | Free, slow, SD models |
| `hordesdxl` | AI Horde SDXL anon | img-gen, img2img | lib-load-image-providers.js REAL | |
| `pollinations-image` | Pollinations | img-gen | loadstudio/load-provider-registry.js REAL | Same endpoint, second stack |
| `aihorde` | AI Horde | img-gen | loadstudio/load-provider-registry.js REAL | |
| `mage-space` | Mage.space | img-gen | META only | Unlimited slow, free, no key. PLANNED |
| `pixazo` | Pixazo | img-gen | META only | FLUX Schnell ~1.2s/image, free daily. PLANNED |
| `zsky` | ZSky AI | video + img-gen | META only | Free anonymous, 1080p video with audio. PLANNED |

### 1B. Free With API Key

| Provider ID | Name | Capability | Where implemented | Key storage | Notes |
|------------|------|-----------|------------------|------------|-------|
| `huggingface` | HF Inference API | img-gen, img2img | lib-load-image-providers.js REAL | `ps_hf_key` → C.hfImgKey | SDXL, FLUX.1-schnell (Apache 2.0 commercial OK), SD cascade |
| `cloudflare` | Cloudflare Workers AI | img-gen | lib-load-image-providers.js REAL | `ps_cf_token` + `ps_cf_account` → C.cfToken/cfAccount | 10K neurons/day |
| `cfsdxllight` | Cloudflare SDXL-Lightning | img-gen | lib-load-image-providers.js REAL | same as cloudflare | |
| `together` | Together FLUX-schnell-Free | img-gen | lib-load-image-providers.js REAL | `ps_together_key` → C.togetherKey | |
| `imagen` | Google Imagen / Gemini 2.5 Flash Image | img-gen | lib-load-image-providers.js REAL | `ps_gemini_key` → C.keys.gemini | ~500 RPD free |
| `deepai` | DeepAI | img-gen | lib-load-image-providers.js REAL | `ps_dai_key` → C.daiKey | |
| `hfsdxlturbo` | HF SDXL-Turbo | img-gen | lib-load-image-providers.js REAL | same as huggingface | |
| `siliconflow` | SiliconFlow | img-gen, img2img | lib-load-image-providers.js REAL | `ps_sfk` → C.siliconflowKey | FLUX.1 Kontext + image-to-video. Settings in load/image-prompt/index.html |
| `huggingface` | HF Inference API | img-gen | loadstudio/load-provider-registry.js REAL | `lpr_settings_v1` | |
| `openrouter` | OpenRouter | llm + img-gen | loadstudio/load-provider-registry.js REAL | `lpr_settings_v1` | 50 req/day free, 29+ free models |
| `replicate` | Replicate | img-gen, video | META only | — | Free credits on signup (card required after). flux-schnell, wan-2.1. PLANNED |
| `fal-ai` | fal.ai | img-gen, video | META only | — | Free credits on signup. fal-ai/flux/schnell, fal-ai/stable-video. PLANNED |
| `nvidia-nim` | NVIDIA NIM | img-gen + llm | META only | — | 1K credits signup. PLANNED |
| `fish-audio` | Fish Audio | tts | META only | — | Free monthly, voice cloning. PLANNED |

### 1C. Local Self-Hosted (endpoint required, no API key)

| Provider ID | Name | Capability | Where implemented | Default endpoint | Notes |
|------------|------|-----------|------------------|-----------------|-------|
| `localsd` | Local SD / A1111 | img-gen, img2img, inpaint | lib-load-image-providers.js REAL | `ps_local_sd_url` → C.localSdUrl | REST at localhost:7860 |
| `comfyui` | ComfyUI | img-gen, img2img, inpaint, video | loadstudio/load-provider-registry.js REAL | `lpr_settings_v1`.endpoint | REST + WebSocket localhost:8188 |
| `ollama` | Ollama | llm | loadstudio/load-provider-registry.js REAL | localhost:11434 | OpenAI-compatible, 100+ models |
| `comfyui` | ComfyUI (Load main) | img-gen | META only | localhost:8188 | Registered in lib-provider-registry.js META only |
| `a1111` | Automatic1111 | img-gen, img2img, inpaint | META only | localhost:7860 | PLANNED |
| `forge` | Forge WebUI | img-gen, img2img | META only | localhost:7860 | PLANNED |
| `invokeai` | InvokeAI | img-gen, img2img | META only | localhost:9090 | PLANNED |
| `fooocus` | Fooocus | img-gen | META only | localhost:7865 | PLANNED |
| `lm-studio` | LM Studio | llm | META only | localhost:1234 | OpenAI-compatible. PLANNED |
| `vllm` | vLLM | llm | META only | localhost:8000 | Production local inference. PLANNED |
| `localai` | LocalAI | llm + tts + img-gen | META only | localhost:8080 | Drop-in OpenAI replacement. PLANNED |
| `llamacpp` | llama.cpp | llm | META only | localhost:8080 | CPU, GGUF models. PLANNED |
| `litellm` | LiteLLM | llm router | META only | localhost:4000 | Routes to 100+ providers. PLANNED |
| `whisper-cpp` | Whisper.cpp | stt | META only | localhost | CPU + Metal + CUDA. PLANNED |

---

## 2. IMAGE MODELS (for ComfyUI / A1111 / local engine model slot selection)

### 2A. Base Models
| Model | Developer | License | VRAM | Quality | Notes |
|-------|-----------|---------|------|---------|-------|
| FLUX.1 [schnell] | Black Forest Labs | Apache 2.0 — commercial OK | 8GB | A-Tier | Default speed+quality choice |
| FLUX.1 [dev] | Black Forest Labs | Non-commercial | 12GB | A-Tier | Higher quality, non-commercial only |
| FLUX.2 Dev | Black Forest Labs | Non-commercial | 16GB | S-Tier | MJ v7 photorealism level |
| HiDream-I1-Full | HiDream AI | Open | 16GB | S-Tier | Best 2026 benchmarks |
| SANA-Sprint 1.6B | NVIDIA Research | Apache 2.0 | 6GB | B-Tier | Speed-optimized |
| SD 3.5 Large | Stability AI | Community | 12GB | A-Tier | Adobe Firefly rival |
| SDXL | Stability AI | CreativeML RAIL+M | 8GB | A-Tier | Most plugins/LoRAs |
| SD 1.5 | Stability AI | CreativeML | 4GB | B-Tier | Runs on lowest hardware |
| Kandinsky 3 | Sber AI | Apache 2.0 | 12GB | B-Tier | Commercial OK |
| PixArt-Sigma | PixArt-Alpha | Open | 8GB | B-Tier | Efficient DiT |
| LCM | Latent Consistency | MIT | 6GB | B-Tier | 4-8 step fast gen |
| Reve Image 1.0 | Reve AI | Partial open | API/HF | S-Tier | #1 prompt adherence 2026 |
| Qwen Image Max 2512 | Alibaba | Open | 16GB | A-Tier | Best for text-in-image |
| HunyuanImage 3.0 | Tencent | Open | 24GB+ | A-Tier | 80B MoE |

### 2B. Portrait / Glamour Fine-Tunes (LoRAs and checkpoints — for ComfyUI)
| Model | Base | License | Weight | Notes |
|-------|------|---------|--------|-------|
| AWPortrait-FL | FLUX.1 Dev | Non-commercial | 0.8 | Closest open equivalent to portrait AI tools |
| UltraReal Fine-Tune v4 | FLUX.1 | Community | 0.4 | Top photorealism fine-tune |
| Juggernaut XL v9 | SDXL | Community | — | Most downloaded photorealism checkpoint |
| RealVisXL v4 | SDXL | Community | — | Editorial portrait quality |
| DreamShaper XL | SDXL | Community | — | Portraits + illustration + concept art |
| epiCRealism XL | SDXL | Community | — | Hyper-realistic beauty/glamour |
| CyberRealistic XL | SDXL | Community | — | Cinematic fashion portrait |
| PortraitMaster v1 LoRA | SDXL/FLUX | Community | 0.5 | Trigger: `22facelexia88` |
| HiDream Photorealism LoRA | HiDream | Open | — | Skin/faces/hands |
| UltraRealistic LoRA v2 | FLUX | Community | 0.4 | Dynamic poses |

Download from civitai.com or huggingface.co. Place `.safetensors` in `models/checkpoints/`.

### 2C. Identity / Pose / ControlNet Tools
| Tool | License | Capability | Notes |
|------|---------|-----------|-------|
| ControlNet v1.1 (lllyasviel) | Apache 2.0 | pose, depth, edge, canny, normal, seg | Works with SD1.5/SDXL/FLUX |
| ControlNet for FLUX (Shakker/Xlabs) | Open | depth, canny, pose, tile, structural | FLUX-native |
| IP-Adapter (Tencent) | Apache 2.0 | identity, style, composition from reference | |
| IP-Adapter FaceID | Apache 2.0 | face identity lock | Best for character consistency |
| InstantID (InstantX) | Apache 2.0 | single-image face injection | Better than IP-Adapter |
| PhotoMaker v2 (Tencent) | Apache 2.0 | multi-reference consistent identity | |
| ConsistencyID | MIT | high-fidelity portrait consistency | |
| FaceChain (Alibaba DAMO) | Apache 2.0 | upload 3-5 photos → styles | |
| AnyDoor (IDEA Research) | Apache 2.0 | zero-shot object insertion | |
| InstructPix2Pix (Berkeley) | MIT | natural language image editing | |

### 2D. Face Restoration / Enhancement / Background Removal
| Provider ID | Name | License | Capability | Where implemented | Notes |
|------------|------|---------|-----------|------------------|-------|
| `realesrgan` | Real-ESRGAN | BSD | upscale (4x+) | lib-load-image-providers.js REAL (HF) | Best for upscale |
| `gfpgan` | GFPGAN v1.3 | Apache 2.0 | face-restore | lib-load-image-providers.js REAL (HF) | Blind face restoration |
| `codeformer` | CodeFormer | BSD | face-restore + upscale | lib-load-image-providers.js REAL (HF) | `-w` param controls quality/fidelity |
| `seedvr2` | SeedVR2 | ByteDance | upscale | PLANNED | Diffusion upscaler, 2026 best on degraded content |
| `rembg` | rembg | MIT | bg-remove | PLANNED | U2Net, commercial safe |
| `rmbg-2` | RMBG-2.0 (Bria AI) | Apache 2.0 | bg-remove | PLANNED | Legally cleanest commercial BG removal |
| `mediapipe-seg` | Mediapipe Selfie Seg | Apache 2.0 | bg-remove | load.js REAL (browser JS) | Real-time, on-device |
| `bg-removal-js` | Background Removal.js (imgly) | Open | bg-remove | load.js REAL (browser JS) | |
| `facedetailer` | FaceDetailer (ComfyUI Impact Pack) | ComfyUI | face-restore | PLANNED (ComfyUI workflow) | Auto-detects + re-crops faces |
| `lama` | LaMa (Samsung) | Apache 2.0 | inpaint | PLANNED | State-of-art inpainting, large receptive field |

### 2E. Glamour Pipeline (wiring order — per File 7)
```
1. FLUX.1 Dev + AWPortrait-FL LoRA (ComfyUI) — base generation
2. IP-Adapter FaceID or InstantID — face identity lock from reference photo
3. ControlNet for FLUX (depth + canny) — pose/lighting/composition control
4. FaceDetailer (ComfyUI Impact Pack) — auto face detail fix
5. Qwen-Edit-Skin LoRA or CodeFormer — skin enhancement
6. CodeFormer (-w 0.7) — face restoration
7. Real-ESRGAN x4 or SeedVR2 — 4x upscale
8. RMBG-2.0 — background removal
9. IP-Adapter + ControlNet combo — style transfer
10. Export 4K PNG/JPG
```

LoRA stack formula:
```
Base: FLUX.1 Dev + AWPortrait-FL (weight 0.8)
+ UltraRealistic LoRA v2 (0.4)
+ PortraitMaster v1 LoRA (0.5, trigger: 22facelexia88)
+ IP-Adapter FaceID (reference photo)
+ ControlNet depth map
Post: FaceDetailer → CodeFormer → Real-ESRGAN x4 → RMBG-2.0
```

---

## 3. TEXT-TO-SPEECH / VOICE CLONING

Pipeline order (try in sequence, skip if not installed):
1. `kokoro` — fastest, Apache 2.0, 50+ preset voices, CPU-capable
2. `chatterbox` — MIT, zero-shot cloning, beats ElevenLabs in blind tests
3. `chatterbox-multilingual` — 23 languages
4. `f5-tts` — MIT, flow matching, 3x real-time on RTX 4070
5. `orpheus-tts` — Llama-based, zero-shot, streaming
6. `bark` — MIT, nonverbal sounds (laughing, sighing), multilingual
7. `openvoice` — MIT, instant cloning, cross-lingual
8. `xtts-v2` / `coqui-tts` — MPL 2.0, 17 languages, 6s reference audio to clone
9. `dia` — multi-speaker dialogue, nonverbal sounds, free
10. `melo-tts` — MIT, multilingual, multiple English dialects
11. `piper` — fast local TTS, neural voices
12. `style-tts2` — MIT, human-level naturalness
13. `emotivoice` — Apache 2.0, 2000+ voices, emotion control, Chinese + English
14. `vallex` — cross-lingual cloning
15. `tortoise-tts` — Apache 2.0, slow but high quality, best for audiobooks
16. `elevenlabs` — 10K chars/month free ongoing, cloud, not offline
17. `fish-audio` — free monthly, voice cloning, cloud
18. `browser-tts` — Web Speech API, always available, no install needed, lowest quality

| Provider ID | Where implemented | Status |
|------------|------------------|--------|
| `kokoro` | loadstudio/load-provider-registry.js | STUB — needs real impl |
| `chatterbox` | META only | PLANNED |
| `f5-tts` | META only | PLANNED |
| `bark` | loadstudio/load-provider-registry.js | STUB |
| `openvoice` | META only | PLANNED |
| `xtts-v2` | loadstudio/load-provider-registry.js | STUB |
| `piper` | load.js (partial Stage 1) | PARTIAL — play() exception not resolved |
| `dia` | META only | PLANNED |
| `melo-tts` | META only | PLANNED |
| `emotivoice` | META only | PLANNED |
| `elevenlabs` | loadstudio/load-provider-registry.js | REAL |
| `browser-tts` | loadstudio/load-provider-registry.js | REAL |

---

## 4. SPEECH-TO-TEXT / TRANSCRIPTION

Pipeline order (try in sequence):
1. `faster-whisper` — 4x faster than Whisper, CPU support, MIT, recommended
2. `whisper-large-v3-turbo` — 6x faster, within 1-2% of V3 accuracy
3. `whisper-large-v3` — MIT, gold standard, 99+ languages
4. `whisperx` — word-level timestamps + speaker diarization, BSD-2
5. `whisper-cpp` — CPU + Metal + CUDA, no Python
6. `distil-whisper` — MIT, 6x faster
7. `nvidia-canary` — #1 Open ASR Leaderboard, 5.63% WER
8. `ibm-granite-speech` — #2 Open ASR, Apache 2.0
9. `nvidia-parakeet` — RTFx>2000, best real-time captioning
10. `qwen3-asr` — 52 languages
11. `moonshine-v2` — 27MB, Apache 2.0, Raspberry Pi deployable
12. `vosk` — offline, 20+ languages, Apache 2.0, Android/iOS/Pi
13. `cloudflare-whisper` — free via Cloudflare Workers AI (cloud fallback)
14. `pyannote` — speaker diarization alongside Whisper

| Provider ID | Where implemented | Status |
|------------|------------------|--------|
| `whisper` | loadstudio/load-provider-registry.js | STUB |
| `faster-whisper` | META only | PLANNED |
| `vosk` | META only | PLANNED |
| `moonshine` | META only | PLANNED |
| `cloudflare-whisper` | META only | PLANNED |

---

## 5. MUSIC GENERATION

Pipeline order:
1. `musicgen` — Meta AudioCraft, MIT, text-to-music, local
2. `audiogen` — Meta AudioCraft, MIT, text-to-SFX, local
3. `stable-audio-open` — Stability AI, text-to-audio up to 47s
4. `diffrhythm` — full-length song via latent diffusion
5. `riffusion` — MIT, spectrogram-based music, local
6. `hunyuan-foley` — Tencent, video-synced audio/SFX, 48kHz
7. `audiox` — any-to-audio (video/image/text)
8. `gen-sfx` — free browser API (if viable)
9. Fallback: Pixabay Music API, Free Music Archive, ccMixter (library search)

| Provider ID | Where implemented | Status |
|------------|------------------|--------|
| `musicgen` | loadstudio/load-provider-registry.js | STUB |
| `audiogen` | loadstudio/load-provider-registry.js | STUB |
| `riffusion` | META only | PLANNED |
| `stable-audio` | META only | PLANNED |

---

## 6. SOUND EFFECTS

### 6A. AI SFX Generation Pipeline (text-to-SFX)
1. `audiogen` — Meta AudioCraft, MIT, text-to-SFX, local (localhost `/generate`)
2. `audiogen-hf` — HuggingFace Inference API for AudioGen (free tier, no local GPU needed, key: HF_TOKEN)
3. `elevenlabs-sfx` — ElevenLabs Sound Effects API, free tier (limited generations/month), best cloud quality. Endpoint: `https://api.elevenlabs.io/v1/sound-generation`. Key: ELEVENLABS_API_KEY. Prompt tips: be specific about material, action, environment, distance, intensity (5–500 chars).

### 6B. SFX Library Search Fallback (no AI needed)
| Library | License | Commercial | Notes |
|---------|---------|-----------|-------|
| Freesound.org | CC0 / CC-BY (varies per sound) | CC0 sounds yes | 500K+ sounds. API available (FREESOUND_API_KEY). Filter by `license:"Creative Commons 0"` for commercial-safe. Preview MP3 = no OAuth. Full WAV = OAuth2. |
| ZapSplat | Free with attribution | Yes with credit | 150K+ professionally recorded. MP3 free, WAV = paid. Attribution: "Sound effects by ZapSplat.com". |
| Mixkit SFX | Royalty-free | Yes, no attribution | 1,500+ curated. No account needed. mixkit.co/free-sound-effects |
| Pixabay SFX | CC0 | Yes, no attribution | Same API key as Pixabay images (PIXABAY_API_KEY). 100 req/min. Do not hotlink — always download. |
| BBC Sound Effects | Personal/educational | NO — personal only | 33,000+ sounds. WAV format. NOT for commercial/monetized use. |
| SoundBible | Public domain / CC-BY | Varies per sound | Check individual sound license. |
| Kenney.nl | CC0 | Yes, no attribution | Complete game SFX packs (ZIP). Interface, Impact, Sci-fi, RPG. kenney.nl/assets?q=audio |
| Internet Archive | Public domain | Yes | Millions of audio files incl. Hollywood SFX archives. API: archive.org/advancedsearch.php (no key). |

### 6C. SFX API Quick Reference
| API | Key | Rate Limit | License | Notes |
|-----|-----|-----------|---------|-------|
| Freesound | FREESOUND_API_KEY | 60 req/min | CC0 sounds available | Apply at freesound.org/apiv2/apply/ |
| Pixabay | PIXABAY_API_KEY | 100 req/min | CC0 | Same key covers images + video + SFX |
| ElevenLabs SFX | ELEVENLABS_API_KEY | Limited/month free | Royalty-free (paid plan for commercial) | POST /v1/sound-generation |
| Internet Archive | None | Undocumented | Public domain | archive.org/advancedsearch.php |

### 6D. Local Audio Processing Tools (SFX manipulation)
| Tool | License | Install | Capability |
|------|---------|---------|-----------|
| FFmpeg | LGPL | apt/brew | Convert, trim, mix, fade, reverb, normalize, pitch, tempo — gold standard |
| pydub | MIT | pip install pydub | Python: trim/mix/fade/volume/export — wraps FFmpeg |
| librosa | ISC | pip install librosa soundfile | Python: beat tracking, pitch detection, time-stretch, harmonic/percussive sep |
| Audacity | GPL | audacityteam.org | GUI: record, edit, effects, export |

---

## 7. AUDIO SOURCE SEPARATION

| Provider | License | Capability | Notes |
|---------|---------|-----------|-------|
| Demucs v4 (Meta) | MIT | separate: vocals, drums, bass, other | Highest quality |
| Spleeter (Deezer) | MIT | 2/4/5 stem separation, fast | |
| Basic Pitch (Spotify) | Apache 2.0 | audio → MIDI | Unique capability |

Status: All PLANNED (not in any lib file yet)

---

## 8. VIDEO GENERATION

### 8A. Local Self-Hosted Models
| Model | License | VRAM | Quality | Notes |
|-------|---------|------|---------|-------|
| Wan 2.2 / 2.6 (Alibaba) | Apache 2.0 | 14GB+ | Best cinematic OSS | LoRA for character consistency |
| HunyuanVideo 1.5 (Tencent) | Open | 14GB with offloading | High quality | 8.3B model |
| LTX-Video 2.1/2.3 (Lightricks) | Open | 12GB | Fast (faster than real-time) | |
| Open-Sora 2.0 | Apache 2.0 | — | 11B, fully open | Code + checkpoints |
| CogVideoX-5B (THUDM) | Apache 2.0 | — | 6s clips | |
| Mochi 1 (Genmo) | Apache 2.0 | — | Best prompt adherence | |
| DynamiCrafter (Tencent) | Apache 2.0 | — | Image-to-video, natural motion | |
| AnimateDiff | Apache 2.0 | 8GB | Turns SD images to animation | Runs via ComfyUI |
| SVD (Stability AI) | Open | — | Image-to-video | ComfyUI integration |

### 8B. Free Hosted Video Platforms
| Provider | Free Tier | Notes |
|---------|-----------|-------|
| ZSky AI | Unlimited (anonymous) | 1080p with audio — best free option |
| Google Veo 3.1 | Via AI Studio free tier | |
| Kling AI 3.0 | Free credits | |
| HaiLuo / MiniMax | Free credits | |
| Pika | Free tier | |
| Dreamina/Jimeng (ByteDance) | Free credits | |
| PixVerse | Free tier | |
| Luma Dream Machine | Free credits | |
| HeyGen | Free tier (talking avatars) | |
| Replicate WAN 2.2 | Free credits on signup | `wavespeedai/wan-2.1` via Replicate API. No local 24GB GPU needed. Apache 2.0. |
| fal.ai video models | Free credits on signup | fal-ai/stable-video, backup cloud option |

### 8C. Video Editing Tools
| Tool | License | Capability | Where |
|------|---------|-----------|-------|
| FFmpeg / ffmpeg.wasm | LGPL | Core editing: trim, split, transitions (xfade 30+ types), blur, mosaic, reverse, LUT, overlay/PiP, audio export, resolution, FPS, GIF, chroma key, subtitle render | load.js REAL (core editor) |
| WebCodecs | Browser API | Hardware-accelerated encode/decode | loadstudio/load-provider-registry.js REAL |
| Web Audio API | Browser API | Multi-track audio mix | loadstudio/load-provider-registry.js REAL |
| Canvas API | Browser API | Frame compositing, text | loadstudio/load-provider-registry.js REAL |
| GSAP | Open | Clip in/out animations | META only — PLANNED |
| Remotion | Open | React-based video timeline | META only — PLANNED |
| Fabric.js | MIT | Canvas layers, PiP, stickers, magnifier | META only — PLANNED |
| MediaRecorder API | Browser | Multi-track recording | load.js REAL |
| LottieFiles | Open API | Animated titles, stickers, text effects | META only — PLANNED |
| LaMa | Apache 2.0 | Inpainting, object removal | META only — PLANNED |
| CineShader | Open | GLSL video filters | META only — PLANNED |

### 8D. Video Status in loadstudio/load-provider-registry.js
All video providers (`wan`, `hunyuanvideo`, `ltx-video`, `animatediff`, `cogvideox`, etc.) are STUBS.

### 8E. Self-Hosted Streaming Servers (100% free, open-source)
For LoadPlay live streaming and on-demand hosting. All require Docker.

| Tool | License | Use case | Launch |
|------|---------|---------|--------|
| SRS (Simple Realtime Server) | MIT | RTMP ingest → HLS output. 10K+ concurrent viewers. | `docker run ossrs/srs:5` |
| Owncast | GPL | Self-hosted live streaming with chat. OBS → RTMP in. | curl install + OBS |
| PeerTube | AGPL | Full YouTube-alternative platform with federation. | docker-compose |
| Jellyfin | GPL | On-demand streaming of your own media library. | `docker run jellyfin/jellyfin` |

OBS settings for self-hosted: Service = Custom, Server = `rtmp://YOUR_IP/live`, stream key set in server admin panel.
HLS viewer URL pattern: `http://YOUR_IP:8080/live/livestream.m3u8`

---

## 9. LIP SYNC / TALKING AVATARS

Pipeline order:
1. `musetalk` — MIT, Tencent, 30FPS real-time, best quality/speed balance
2. `latentsync` — Apache 2.0, ByteDance, latent-space approach
3. `wav2lip` — personal use, foundational, zero-shot, any language
4. `sadtalker` — MIT, single portrait → head motion + expression
5. `videoretalking` — MIT, modifies lip movements in existing video
6. `liveportrait` — MIT, high identity retention
7. `omni-human` — ByteDance, full-body, multi-character from single image + audio
8. `talking-head-3d` — MIT, browser JS, real-time 3D avatar

| Provider ID | Where implemented | Status |
|------------|------------------|--------|
| `musetalk` | loadstudio/load-provider-registry.js | STUB |
| `wav2lip` | loadstudio/load-provider-registry.js | STUB |
| `sadtalker` | loadstudio/load-provider-registry.js | STUB |
| `liveportrait` | META only | PLANNED |
| `latentsync` | META only | PLANNED |

`generateLipSync()` method is MISSING from LoadProviderRegistry. Orchestrator calls it but it doesn't exist.

---

## 10. LLM / TEXT / ROUTING

### 10A. Free Cloud (no key / permanent free tier)
| Provider | Free Tier | Models | Notes |
|---------|-----------|--------|-------|
| Google AI Studio / Gemini | 1,500 req/day | Gemini 2.5 Flash/Pro, Imagen 4 | Best daily driver. Text + image + audio + video |
| Groq | 14,400 req/day (~6K effective) | Llama 3.3 70B, Mixtral, Gemma2-9B | Fastest LLM inference. Key: GROQ_API_KEY |
| Cerebras | 30 req/min | Llama 3.1 70B, Llama 4 Scout 17B | Ultra-fast hardware. Key: CEREBRAS_API_KEY |
| SambaNova | Free cloud | Llama 405B, DeepSeek R1 | Best for large models |
| Cloudflare Workers AI | 10K neurons/day | Llama 70B, Whisper, SD | Edge inference. Keys: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN |
| Mistral | 1B tokens/month | Mistral Small/7B, Mixtral, Codestral | May train on prompts |
| OpenRouter | 50 req/day free models | 29+ free (`:free` suffix) | DeepSeek R1, Llama 4, Qwen3 235B. Key: OPENROUTER_API_KEY |
| HF Inference API | Hundreds req/hour | 90,000+ models | Key: HF_TOKEN |
| NVIDIA NIM | 1,000 credits signup | 91 models | Vision, audio included |
| Cohere | 1,000 calls/month | Command R+, Embed 4, Rerank | Best for RAG |
| DeepSeek | ~free | DeepSeek R1 | $0.14/M tokens after trial |
| AI/ML API | 400+ models | GPT, Claude, Gemini, FLUX, Llama | Single key for all |

**Optimal LLM routing order (from Free_AI_Provider_Connection_Guide_2026.docx):**
1st Groq (fastest, highest free rate limit) → 2nd Gemini 2.0 Flash (best quality free) → 3rd Cerebras (ultra-fast backup) → 4th OpenRouter :free models → 5th Ollama local (no limits)

### 10B. Local LLM (no key, no quota)
| Provider | Notes |
|---------|-------|
| Ollama | OpenAI-compatible, localhost:11434, 100+ models — REAL in LoadStudio. `ollama pull llama3.2` to start. |
| LM Studio | GGUF, GUI, localhost:1234 — PLANNED |
| vLLM | Any HF model, production-grade, localhost:8000 — PLANNED |
| llama.cpp | GGUF, CPU inference, fastest without GPU — PLANNED |
| LocalAI | Drop-in OpenAI replacement + TTS + image gen — PLANNED |
| LiteLLM | Routes to 100+ providers, one interface, auto-fallback. `pip install litellm`. PLANNED for LoadStudio routing layer. |
| Jan | GGUF via Ollama, cross-platform GUI — PLANNED |

### 10C. Key threading for LLM in Load Main
| Provider | localStorage key | Config field |
|---------|-----------------|-------------|
| Gemini | `ps_gemini_key` | `providerPrefs.gemini.apiKey` |
| Groq | `ps_groq_key` | `providerPrefs.groq.apiKey` |
| OpenRouter | `ps_openrouter_key` | `providerPrefs.openrouter.apiKey` |
| HuggingFace | `ps_hf_key` | `providerPrefs.huggingface.apiKey` |

All four are REAL in `load.js`. Gemini, Groq, OpenRouter, HF are the primary LLM chain.

---

## 11. ASSET LIBRARIES (non-AI, curated content)

### Fonts
| Library | API | Notes |
|---------|-----|-------|
| Google Fonts | Yes (fonts.googleapis.com) | META only — PLANNED as embedded |
| Bunny Fonts | Yes (bunny.net/fonts) | Privacy-friendly Google mirror |
| Font Squirrel | No (download) | Commercial use, direct download |
| Open Foundry | No (download) | Curated open-source display fonts |
| DaFont | No (download) | Check each licence individually |

### Animated Titles / Stickers
| Library | Access | Notes |
|---------|--------|-------|
| LottieFiles | API | Best: lightweight JSON, free API — PLANNED |
| Mixkit | Download | Free motion title templates |
| Videezy | Download | Free lower thirds / motion graphics |
| Motion Array | Free tier | Animated templates |
| Remotion | Code | Build animated text programmatically |

### Music Libraries (licensed, free)
| Library | Attribution | Notes |
|---------|------------|-------|
| Pixabay Music | None required | Best free option — PLANNED |
| ccMixter | CC attribution | Creative Commons |
| Free Music Archive | Varies | Genre browsing, open licences |
| Incompetech / Kevin MacLeod | Credit required | Large catalogue |
| Bensound | Free tier | |
| YouTube Audio Library | Creator use | |

### Sound FX Libraries
| Library | Notes |
|---------|-------|
| Freesound.org | Largest open-source SFX — PLANNED API integration. Filter CC0 for commercial. |
| ZapSplat | Free tier with attribution, all categories |
| BBC Sound Effects | 33,000+ sounds, personal/research ONLY — not commercial |
| Mixkit SFX | Free, no account, no attribution |
| Pixabay SFX | CC0, same API key as Pixabay images |
| SoundBible | Free downloadable SFX — check per-sound license |
| Kenney.nl | CC0 game SFX packs (ZIP), no attribution, commercial OK |
| Internet Archive | Public domain SFX archives incl. historic Hollywood libraries |

### Stock Media
| Library | Notes |
|---------|-------|
| Pexels | Free photos/video API |
| Pixabay | Free photos/video API |
| Coverr | Free video clips |
| Wikimedia Commons | Open media |
| Internet Archive | Historical + public domain |
| NASA Library | Space + science |

---

## 12. VIDEO EDITOR FEATURES → PROVIDER MAP (VN parity)

Per VN_Feature_Provider_Map.docx and LoadCap_Free_Providers.docx. Build priority order:

| Priority | Feature | Provider | Status |
|----------|---------|---------|--------|
| 1 | Trim / split / adjust duration | FFmpeg / ffmpeg.wasm | REAL (load.js) |
| 2 | 30+ transitions (xfade) | FFmpeg xfade | REAL |
| 3 | PiP / layer overlay | FFmpeg overlay | REAL |
| 4 | Blur / mosaic / pixelate | FFmpeg gblur | REAL |
| 5 | Reverse video | FFmpeg | REAL |
| 6 | Change ratio / resolution / FPS | FFmpeg -vf scale, -r | REAL |
| 7 | Export audio only | FFmpeg | REAL |
| 8 | Chroma key / green screen | FFmpeg colorkey | REAL |
| 9 | LUT colour grades | FFmpeg lut3d | REAL |
| 10 | Background removal | Mediapipe Selfie Seg | REAL (load.js) |
| 11 | Stickers + animated text | LottieFiles API | PLANNED |
| 12 | In/out clip animation | GSAP | PLANNED |
| 13 | PiP sticker placement + duration | Fabric.js | PLANNED |
| 14 | Subtitle generation | Whisper (local/cloud) | STUB in LoadStudio |
| 15 | Multi-track recording | MediaRecorder API | REAL |
| 16 | Font variety | Google Fonts API | PLANNED |
| 17 | Export GIF | FFmpeg | REAL |
| 18 | Project save/share | IndexedDB + optional Supabase | REAL (IndexedDB) |

---

## 13. LOADSTUDIO — DIRECTOR AI DATA FILES

Required JSON files for LoadStudio Director AI (per Director AI Addendum doc):

| File | Purpose | Status |
|------|---------|--------|
| `director-ai.json` | Director AI state | EXISTS (in sw.js ASSETS) |
| `character-stability.json` | Character lock profiles | EXISTS |
| `provider-routing.json` | Provider routing config | EXISTS |
| `prompt-log.json` | Prompt history | EXISTS |
| `generation-report.json` | Generation audit | EXISTS |
| `continuity-report.json` | Scene continuity | EXISTS |
| `asset-declarations.json` | Asset catalogue | EXISTS |
| `rights.json` | Rights metadata | EXISTS |

Required scene fields per Director AI Addendum:
`videoPrompt`, `motionPrompt`, `sfxPrompt`, `voicePrompt`, `outpaintPrompt`, `stylePrompt`, `consistencyScore`, `approvedTakeStatus`, `providerStatus`, `generatedAssetProof`

---

## 14. PIPELINE CHAINS PER TASK TYPE

### Image Generation (text-to-image)
```
1. pollflux / pollinations / pollturbo   (free, no key, always try first)
2. huggingface (FLUX.1 / SDXL)          (free with hfImgKey)
3. cloudflare                            (free with cfToken)
4. together                              (free with togetherKey)
5. imagen (Gemini)                       (free with gemini key, 500 RPD)
6. deepai                                (free with daiKey)
7. horde / hordesdxl                     (free, slow)
8. siliconflow                           (free credits, siliconflowKey)
9. localsd / comfyui                     (local endpoint, unlimited)
10. prompt-only save                     (always available offline fallback)
```

### Image Edit / img2img
```
1. siliconflow FLUX.1 Kontext           (best img2img, siliconflowKey)
2. huggingface SDXL-inpainting           (hfImgKey)
3. hordesdxl                             (free)
4. localsd / comfyui with img2img       (local endpoint)
5. prompt-only save                      (offline fallback)
```

### Face Restore
```
1. gfpgan (via HF)                       (free, hfImgKey)
2. codeformer (via HF)                   (free, hfImgKey)
3. Browser sharpen (canvas convolution) (offline, built — face-restore.html)
4. HF Spaces handoff (copy-link)         (free, no key, manual)
```

### Upscale
```
1. realesrgan (via HF)                   (free, hfImgKey)
2. Browser bicubic (canvas)              (offline, built — image-upscaler.html)
3. HF Spaces Real-ESRGAN handoff        (free, no key, manual)
```

### TTS / Voice
```
1. kokoro (local)                        (fastest, Apache 2.0, no key)
2. chatterbox (local)                    (MIT, zero-shot cloning)
3. browser-tts                           (Web Speech, always available)
4. elevenlabs                            (10K/month free, cloud key)
5. piper (local, if installed)           (Stage 1 partial)
```

### STT / Transcription
```
1. faster-whisper (local)                (fastest, MIT, CPU)
2. whisper-large-v3-turbo (local)        (quality + speed)
3. whisper-cpp (local)                   (no Python needed)
4. vosk (local)                          (offline, tiny, Pi-capable)
5. cloudflare-whisper (cloud)            (free fallback)
```

### Music Generation
```
1. musicgen (local, AudioCraft)          (MIT, text-to-music)
2. riffusion (local)                     (MIT, spectrogram)
3. stable-audio-open (local)             (Stability AI)
4. Pixabay Music API search              (free library, no attribution)
5. Freesound.org API search              (SFX)
6. prompt-only save                      (offline fallback)
```

### Video Generation
```
1. ZSky AI (free, anonymous cloud)       (1080p with audio — best free)
2. wan-local (ComfyUI + WAN 2.2)        (local, Apache 2.0)
3. ltx-video-local                       (local, fast)
4. animatediff (ComfyUI)                 (local, 8GB)
5. prompt-only save                      (offline fallback)
```

### LLM / Chat / Prompt Building
```
1. ollama (local)                        (no key, no quota)
2. google-gemini                         (1500/day free, gemini key)
3. groq                                  (6000/day free, groq key)
4. openrouter                            (50/day free, openrouter key)
5. huggingface (LLM)                     (hundreds/hour, hf key)
6. deepseek                              (quasi-free)
7. Prompt-only / browser-only fallback
```

---

## 15. TRUE STATUS — CORRECTED 2026-05-16

### What works with ZERO setup (free, no key, no local server)
- Image generation: `pollinations-image`, `pollinations-turbo`, `aihorde` (anonymous)
- TTS: `browser-tts` (Web Speech API)
- Music search: `ccmixter` (no key)
- Stock search: `wikimedia`, `nasa-library`, `openverse` (all free, no key)
- SFX search: `openverse-sfx` (no key)
- Audio search: `openverse-audio` (no key)

### What works with a free API key entered in settings
- Image: `huggingface`, `cloudflare`, `cfsdxllight`, `together`, `imagen` (Gemini), `deepai`, `hfsdxlturbo`, `siliconflow`, `openrouter`
- TTS: `elevenlabs` (10K chars/month free)
- Video: `kling`, `hailuo`, `luma-dream`, `pika`, `pixverse`, `heygen`
- STT: `deepgram`, `assemblyai`
- Music search: `freesound`, `pixabay-music`, `jamendo`, `free-music-archive`
- Stock: `pexels`, `pixabay-stock`

### What works when local model server is running (no key, no quota)
These have real fetch() calls in the registry. They fail with "no endpoint" if no server is running.
- TTS: `kokoro` (localhost `/v1/audio/speech`), `chatterbox` (localhost `/tts`), `bark`, `xtts`, `piper`, `f5-tts`, `orpheus`, `melo-tts`, `openvoice`, `dia`, `styletts2`
- Music gen: `musicgen`, `audiogen` (localhost `/generate`), `riffusion`, `stable-audio-open`, `diffrhythm`, `audiox`
- Video gen: `wan`, `hunyuanvideo`, `ltx-video`, `animatediff`, `cogvideox`
- Lip sync: `musetalk`, `wav2lip`, `sadtalker`, `liveportrait`, `latentsync`
- STT: `faster-whisper` (needs local server or HF Spaces)
- Image: `comfyui`, `localsd`
- LLM: `ollama` (localhost:11434)

### Still genuinely PLANNED (not in registry, no fetch() call)
- `lottiefiles` — animated titles/stickers (JS lib, needs `<script>` CDN + lseb.js integration)
- `gsap` — clip animations (JS lib, needs `<script>` CDN + lseb.js integration)
- `fabricjs` — PiP/sticker canvas layers (JS lib, needs `<script>` CDN + lseb.js integration)
- `rembg` / `rmbg-2` — background removal beyond Mediapipe
- `supabase` — cloud save (only IndexedDB active)
- `lm-studio`, `vllm`, `llamacpp`, `litellm` — local LLM alternatives to Ollama
- `cloudflare-whisper` — cloud STT fallback
- `fish-audio` — free cloud TTS with voice cloning

---

## 16. SECURITY RULES (non-negotiable, from all 8 docs)

- Never export API keys in any file, log, prompt log, generation report, LoadStudio package, or Load Eco export
- Keys stored locally only: Load Main uses per-provider localStorage keys; LoadStudio uses `lpr_settings_v1`
- `load-asset-registry.js` already scrubs `apiKey`, `token`, `secret` from all asset exports — preserve this
- Never mark provider `ok: true` / READY / success unless a real URL, blob, base64, file, or text result exists
- Never call `testProvider()` and mark Ready without a real network/local success response
- Paid providers (ElevenLabs above free tier, Replicate, Stability AI paid, OpenAI paid) are optional, off by default, never hard-coded
- `Integration Required` label must appear on any UI feature that requires a provider not yet wired

---

## 17. LOADSTUDIO DIRECTOR AI — WHAT THE USER MUST EXPERIENCE

Per Director AI Addendum — the user directs, not just prompts. LoadStudio must understand:
- Production language: lighting, pacing, edit rhythm, camera movement, emotional tone
- Character continuity: face notes, body type, skin tone, hair, wardrobe, era, expression range, forbidden changes
- Scene language: shot types, scene order, final packaging
- Outputs: script-to-scene, idea-to-scene, book-to-cinematic-sequence, text-to-video, image-to-video, image-to-scene-still, character-to-scene, scene-to-shot-list, shot-list-to-visual-sequence

Build phases:
1. Shell + architecture + IndexedDB + drag-and-drop + prompt engine + provider registry
2. Prompt/package engine (scene-to-image, character lock prompts)
3. Free/open/local providers (Pollinations, AI Horde, HF routes, browser TTS, Pixabay/Freesound vault, local SD/ComfyUI)
4. High-stability character workflows (IP-Adapter, ControlNet, LoRA, face comparison)
5. Video generation slots (text-to-video, image-to-video, audio/voice generation)

External / paid features must be labeled "Integration Required" until a real provider is wired.

---

*This file supersedes any partial provider notes in SESSION_NOTES, HANDOFF.md, or MASTER_BACKLOG.md. Update it in place — do not create duplicate provider docs.*
