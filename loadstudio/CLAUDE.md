# CLAUDE.md — Load Studio / Load Play / Load Eco Master Build Reference

L.Bond | Copyright 2026 | All Rights Reserved

## MANDATORY SESSION-START READ

Before any LoadStudio / Load Eco / Load AI work, read this file first:

- `PROVIDER_REGISTRY_REFERENCE.md` — complete provider list, pipeline chains,
  key wiring, implementation status, and 28-item gap list compiled from 8 inbox
  spec docs. Never re-read the inbox .docx files to answer provider questions.
  Never ask the user to re-explain providers. This file has everything.

## CURRENT USE

This file is the governing specification and persistent project memory for:

- Load Studio
- Load Play
- Load Eco integrations
- future Load AI integrations

This file overrides approximations, partial assumptions, temporary UI interpretations, and isolated task assumptions.

Small task prompts from the user are NOT replacements for this file.
They are current-step instructions under this master architecture.

---

# RESPONSE CONTRACT

When reporting build work, use ONLY this format unless the user explicitly asks for explanation:

STATUS:
CHANGED:
TESTS RUN:
FAILED TESTS:
RISK:
ROLLBACK:
NEXT:

Do not:
- narrate
- apologize
- mirror emotions
- explain intentions
- add commentary before or after the format
- output conversational filler

---

# ECOSYSTEM ARCHITECTURE

## Core Systems

### Main Load
Existing launcher, workspace, AI/media system.

Rules:
- preserve existing working systems
- extend, do not rebuild
- do not redesign unrelated UI
- do not break splash/front screens

---

### Load Studio
Standalone PWA-native cinema production studio.

Purpose:
- creation
- editing
- casting
- narration
- AI generation
- packaging
- CinePWA exports

---

### Load Play
Standalone streaming/viewer platform.

Purpose:
- streaming
- creator channels
- publishing
- validation
- subscriber experiences

---

### Load Eco
Shared tooling and provider infrastructure.

Purpose:
- provider registry
- AI routing
- media systems
- diagnostics
- editor support

---

# CORE PRODUCT RULES

- VN interaction model must be matched precisely
- preserve existing working Load systems
- preserve Editing Bay continuity
- preserve AI Image Director
- preserve provider sync
- preserve clip strip
- preserve thumbnails
- preserve scrubbing
- preserve stage size unless explicitly approved

Never:
- claim success without real returned assets/files
- mark provider READY without real test
- export API keys
- expose tokens
- break working editing systems while patching UI

---

# EDITING BAY TARGET

Editing Bay behavior must match VN interaction behavior.

## VN Interaction Rules

### Insert Drawers
Bottom drawers:
- Music
- Sound FX
- Record
- Title
- SRT
- Photos
- Elements

### Selected Object Toolbar
Compact inline toolbar:
- Replace
- Keyframe
- Curve
- Lock
- Duplicate
- Delete

Toolbar must:
- anchor above selected object
- not block timeline
- not behave like desktop modal
- preserve timeline visibility

---

# CURRENT EDITING BAY TARGETS

## Required

- seamless clip playback
- multitrack timeline
- visible waveform
- visible bottom rows on iPad
- drag/reorder
- VN insert drawers
- Music/SFX category grids
- category → asset list flow
- contextual inline toolbar
- stage size preserved
- touch-friendly timeline

---

# LOAD STUDIO DEPARTMENTS

- Studio Lobby
- Development Office
- Character Lab
- Casting Department
- Voice Studio
- Wardrobe Department
- Look Lab
- Sound Stage
- Scene Workshop
- Editing Bay
- Export Office
- Developer Lab

---

# VN FEATURE MAP

## Core Editing

- trim
- split
- transitions
- FPS control
- resolution control
- export audio only
- reverse video
- blur
- mosaic
- magnifier
- PiP
- stickers
- text duration
- subtitle generation
- LUTs
- background replacement
- project sharing
- cloud save

---

# PRIMARY PROVIDERS

## Editing / Timeline

- FFmpeg.wasm
- Remotion
- WebCodecs
- Web Audio API
- Canvas API

## Animation

- GSAP
- LottieFiles

## Canvas / Layers

- Fabric.js

## Background Removal

- Mediapipe
- background-removal-js

## Subtitles / STT

- Whisper
- Faster-Whisper
- Whisper.cpp
- Vosk
- Moonshine

## Audio / TTS

- Kokoro
- Chatterbox
- XTTS
- Piper
- Coqui
- Bark
- OpenVoice
- Dia

## Music / Audio Generation

- MusicGen
- AudioGen
- Demucs
- Spleeter
- Basic Pitch
- Riffusion

## Image Generation

- Pollinations
- AI Horde
- Hugging Face
- ComfyUI
- Stable Diffusion
- FLUX
- SDXL
- SD 1.5
- SD 3.5
- Kandinsky
- PixArt
- OpenJourney
- DreamShaper
- RealVisXL
- Juggernaut XL

## Video Generation

- WAN
- HunyuanVideo
- LTX-Video
- AnimateDiff
- Stable Video Diffusion
- CogVideoX
- Open-Sora
- Mochi

## Lip Sync

- MuseTalk
- Wav2Lip
- SadTalker
- LivePortrait

## Local LLM / Routing

- Ollama
- LM Studio
- LocalAI
- llama.cpp
- vLLM
- LiteLLM

---

# ASSET LIBRARIES

## Music

- Pixabay Music
- Free Music Archive
- ccMixter
- Incompetech
- Bensound
- YouTube Audio Library

## Sound FX

- Freesound
- ZapSplat
- BBC Sound Effects
- Mixkit SFX
- SoundBible

## Fonts

- Google Fonts
- Bunny Fonts
- Font Squirrel
- Open Foundry

## Animated Titles / Stickers

- LottieFiles
- Mixkit
- Videezy
- Motion Array

## Stock Media

- Pexels
- Pixabay
- Coverr
- Wikimedia Commons
- Internet Archive
- NASA Library

---

# PROVIDER REGISTRY RULES

Shared provider registry for:
- Load Eco
- Load Studio
- future Load AI

Suggested:
- load-provider-registry.js
- window.LoadProviderRegistry

Required methods:
- listProviders()
- listByCapability()
- getProvider()
- testProvider()
- generateImage()
- generateAudio()
- generateVideo()
- transcribeAudio()
- routeToFallback()

---

# SECURITY RULES

- never export API keys
- never expose tokens
- never include keys in logs
- never include keys in exports
- never include keys in CinePWA packages
- never mark provider READY without real success

---

# CINEPWA PACKAGE STRUCTURE

Required:
- scenes.json
- project.json
- rights.json
- voices.json
- wardrobe.json
- assets/images
- assets/audio
- assets/music
- assets/sfx
- assets/subtitles

---

# BUILD PRIORITY

1. format
2. player
3. editing system
4. provider registry
5. asset libraries
6. publishing
7. marketplace
8. AI orchestration

---

# CURRENT ACTIVE TASK

Current Editing Bay work:
- Music/SFX category → asset flow
- preserve stage size
- preserve clip strip
- preserve waveform visibility
- preserve contextual toolbar
- preserve scrubbing
- preserve playback continuity
