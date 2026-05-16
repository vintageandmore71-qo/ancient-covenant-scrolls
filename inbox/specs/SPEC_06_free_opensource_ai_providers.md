# Free_OpenSource_AI_Providers_2026.docx

FREE &amp; OPEN-SOURCE AI PROVIDER
MASTER REFERENCE 2026

Complete Catalog: Image · TTS · Voice Cloning · STT · Music · Audio · Video · Lip Sync · Avatars · Editing · Pipelines

Compiled: May 2026   |   Total Providers Catalogued: 150+
4 Search Passes Conducted Across All Major Categories

SEARCH TRANSPARENCY
4 targeted search passes: image models, audio/TTS/voice, video/editing, music/SFX/STT/avatars. All major categories covered. A fully exhaustive pass (complete Hugging Face catalog of 90,000+ models, all GitHub trending repos, ProductHunt, Discord communities) would yield hundreds more niche models. This document covers every provider of practical significance identified through the searches conducted.

CONTENTS

Section 1  —  AI Image Generation  (Models, Interfaces, Free Hosted Platforms)
Section 2  —  Text-to-Speech &amp; Voice Cloning  (Models + Desktop Apps)
Section 3  —  Speech-to-Text / Transcription  (Models)
Section 4  —  Music &amp; Audio Generation  (Models)
Section 5  —  AI Video Generation  (Models + Editors + Free Hosted)
Section 6  —  Lip Sync &amp; Talking Avatar Models
Section 7  —  Aggregator Platforms &amp; Unified API Hubs
Section 8  —  Quick-Pick Decision Guide

SECTION 1 — AI IMAGE GENERATION

1A. Open Source / Self-Hostable Models
All models below are free to download and run locally. License determines commercial use rights.

Model
Developer
Description
Min VRAM
License
Source

FLUX.2
Black Forest Labs
Diffusion Transformer. Native 4MP res. Multi-reference support. Best for high-res production assets &amp; character consistency.
16GB VRAM
Open weights
github.com/black-forest-labs/flux

FLUX.1 [schnell]
Black Forest Labs
Fast inference variant of FLUX. Best default starting point. Strong quality/speed balance.
12GB+ VRAM
Apache 2.0
huggingface.co/black-forest-labs

FLUX.1 [dev]
Black Forest Labs
Higher quality variant. Slower than schnell. Best for final renders.
16GB VRAM
Non-commercial
huggingface.co/black-forest-labs

Stable Diffusion 3.5 Large
Stability AI
Most flexible open-source model. Largest ecosystem: 1000s of LoRAs, fine-tunes, ComfyUI nodes.
12GB VRAM
Stability AI Community
github.com/Stability-AI/generative-models

Stable Diffusion 3.5 Medium
Stability AI
Lighter SD3.5 variant. Faster inference. Better for lower-VRAM systems.
8GB VRAM
Stability AI Community
github.com/Stability-AI

Stable Diffusion XL (SDXL)
Stability AI
High-res 1024x1024 generation. Large community ecosystem.
8GB VRAM
CreativeML Open RAIL+M
github.com/Stability-AI

Stable Diffusion 1.5
Stability AI
Lightweight classic. Runs on 4GB VRAM. Largest LoRA ecosystem.
4GB VRAM
CreativeML Open RAIL-M
github.com/Stability-AI

HunyuanImage 3.0
Tencent
80B MoE architecture. Best for complex reasoning and long prompts.
24GB+ VRAM
Open
huggingface.co/tencent/HunyuanImage

HiDream-I1-Full
HiDream AI
Top photorealism benchmarks 2026. Strong prompt adherence.
16GB VRAM
Open
huggingface.co/HiDream-ai

SANA-Sprint 1.6B
NVIDIA Research
Optimized for speed. Runs on lower-end hardware. Best for fast iteration.
6GB VRAM
Apache 2.0
huggingface.co/Efficient-Large-Model

FIBO
Bria AI
JSON-native structured control: camera, lighting, depth. Trained on licensed data only — commercially safe.
16GB VRAM
Commercial-safe
bria.ai

Qwen Image Max 2512
Alibaba
Excels at readable text inside images. Best for UI mockups, posters, marketing.
16GB VRAM
Open
huggingface.co/Qwen

Kandinsky 3
Sber AI
Russian-developed open model. Strong stylized and artistic outputs.
12GB VRAM
Apache 2.0
github.com/ai-forever/Kandinsky-3

PixArt-Sigma
PixArt-alpha
Efficient DiT-based model. High quality at lower compute cost.
8GB VRAM
Open
github.com/PixArt-alpha/PixArt-sigma

LCM (Latent Consistency Model)
LCM Team
4-8 step generation. Extremely fast. Based on SD fine-tuning.
6GB VRAM
MIT
github.com/luosialen/latent-consistency-model

InstaFlow
InstaFlow Team
One-step text-to-image. Near-instant generation on capable GPU.
8GB VRAM
MIT
github.com/gaosilas/instaflow

DeepFloyd IF
Stability AI
Cascaded pixel-space diffusion. Excellent text rendering in images.
24GB VRAM (full)
non-commercial
huggingface.co/DeepFloyd

Würstchen
Stability AI
Highly compressed latent space. Fast and memory-efficient.
8GB VRAM
MIT
github.com/dome272/wuerstchen

OpenJourney
PromptHero
Fine-tuned on Midjourney-style outputs. Runs locally.
6GB VRAM
CreativeML Open RAIL-M
huggingface.co/prompthero/openjourney

DreamShaper
Civitai community
Community fine-tune combining photorealism and artistry.
6GB VRAM
Community
civitai.com/models/4384

RealVisXL
SG_161222
SDXL fine-tune focused on photorealism. Popular for portraits.
8GB VRAM
Community
huggingface.co/SG161222

Juggernaut XL
RunDiffusion
High-detail photorealism fine-tune of SDXL. Community favorite.
8GB VRAM
Community
huggingface.co/RunDiffusion

DALLE-mini / Craiyon
Boris Dayma
Lightweight open model. CPU-runnable. Lower quality but highly accessible.
CPU ok
Apache 2.0
github.com/borisdayma/dalle-mini

1B. Open Source Interfaces &amp; UIs
These are front-end interfaces that run the models above. Most support multiple model backends.

Interface
Developer
Description
Platform
License
Source

ComfyUI
ltdrdata / community
Node-based visual pipeline. Most powerful. First to support new features like video diffusion. Best for power users.
Any OS
GPL-3.0
github.com/comfyanonymous/ComfyUI

Automatic1111 WebUI
AUTOMATIC1111
Classic single-page interface. Huge extension ecosystem. Best for beginners to intermediate.
Any OS
AGPL-3.0
github.com/AUTOMATIC1111/stable-diffusion-webui

Forge WebUI
lllyasviel
Memory-optimized fork of Automatic1111. Better for FLUX.2 on consumer hardware.
Any OS
AGPL-3.0
github.com/lllyasviel/stable-diffusion-webui-forge

InvokeAI
Invoke AI
Polished desktop UI. Good for node editing and fine-tuning workflows.
Any OS
Apache 2.0
github.com/invoke-ai/InvokeAI

Fooocus
lllyasviel
Simplified Midjourney-like interface. Minimal setup. Focused on quality.
Any OS
GPL-3.0
github.com/lllyasviel/Fooocus

SD.Next
vladmandic
Fork of WebUI with broader model support and advanced features.
Any OS
AGPL-3.0
github.com/vladmandic/automatic

DiffusionBee
Divam Gupta
macOS-only. One-click install. No GPU required (uses Apple Silicon MPS).
macOS
MIT
diffusionbee.com

Draw Things
Liu Liu
iOS and macOS app. On-device generation. Supports SD, SDXL, FLUX.
iOS/macOS
GPL
apps.apple.com (free)

1C. Free Hosted Platforms (Browser — No GPU Required)
These platforms are free to use in a browser. No local setup required. Free tiers may have daily or weekly limits.

Platform
Provider
Free Tier
Access
Notable Feature

Hugging Face Spaces
Hugging Face
Free
Browser
90,000+ models. Run FLUX, HiDream, SANA through community spaces. No GPU needed.

Ideogram
Ideogram AI
10 credits/week
Browser
Best open-access tool for text-inside-image generation.

NightCafe
NightCafe
Daily credits
Browser
Multiple models, community challenges, earn credits by participating.

Tensor.Art
Tensor.Art
Free credits
Browser
FLUX and SD access, community fine-tunes.

Civitai
Civitai
Free credits
Browser
Largest community model hub. Run fine-tunes directly in browser.

OpenArt
OpenArt
Free credits
Browser
Multiple AI models and community-generated styles.

Leonardo AI
Leonardo AI
Daily generations
Browser
Specialized for game assets, characters, environments.

Playground AI
Playground AI
Limited free tier
Browser
Fast generation, good for marketing visuals.

Mage.space
Mage
Unlimited slow gen
Browser
Unlimited free low-priority queue using Stable Diffusion.

Dezgo
Dezgo
Free tier
Browser
SD-based. Simple interface. No signup for basic use.

Lexica
Lexica
Free search + limited gen
Browser
SD-based. Doubles as image prompt search engine.

SECTION 2 — TEXT-TO-SPEECH &amp; VOICE CLONING

2A. Open Source TTS Models
Self-hostable. All models are free to download. Check individual license for commercial use.

Model
Developer
Key Features
Hardware
License
Source

Chatterbox
Resemble AI
MIT. Emotion exaggeration control. Zero-shot voice cloning. Outperforms ElevenLabs in blind tests. English.
GPU recommended
MIT
github.com/resemble-ai/chatterbox

Chatterbox Turbo
Resemble AI
Blazing-fast variant. Paralinguistic tagging for non-speech sounds. Real-time capable.
GPU
MIT
github.com/resemble-ai/chatterbox

Chatterbox Multilingual
Resemble AI
23 languages. Zero-shot cross-lingual voice cloning.
GPU
MIT
huggingface.co/ResembleAI

Higgs Audio V2
BosonAI
Built on Llama 3.2 3B. Pre-trained on 10M+ hours. Industry-leading expressive audio &amp; multilingual cloning. Top HuggingFace trending.
GPU
Open
huggingface.co/bosonai/higgs-audio-v2

Kokoro
Kokoro team
82M params. Apache licensed. Lightning fast. Comparable quality to larger models. 50+ preset voices.
CPU/GPU
Apache 2.0
huggingface.co/hexgrad/Kokoro-82M

KokoClone
Community
Fast multilingual voice cloning built on Kokoro-ONNX. 3-10 sec reference audio.
CPU
Apache 2.0
huggingface.co/hexgrad

Orpheus TTS
Canopy AI
Llama-based. 3B/1B/400M/150M variants. Zero-shot voice cloning. Guided emotion. Real-time streaming. Multilingual family (ZH, HI, KO, ES).
GPU
Open
huggingface.co/canopylabs

F5-TTS
F5-TTS Team
Flow matching instead of diffusion. &lt;30 inference steps. MIT license = commercial ok. 3x real-time on RTX 4070.
GPU
MIT
github.com/SWivid/F5-TTS

Voxtral TTS
Mistral AI
4B model. 70ms latency. 9.7x real-time factor. Zero-shot cloning from 3s audio. 9 languages.
GPU
CC BY-NC
huggingface.co/mistralai

NeuTTS Air
Neuphonic
On-device. 0.5B backbone. Runs on Raspberry Pi, mobile. GGUF/GGML format. Clones voice from 3s audio.
CPU/Edge
Open
neuphonic.com

Dia
Nari Labs
Completely free. Excellent multi-speaker audio. Nonverbal sounds and emotion. Natural dialogue generation.
GPU
Open
github.com/nari-labs/dia

MeloTTS
MyShell.ai
High-quality multilingual. Multiple English dialects: American, British, Indian, Australian.
CPU/GPU
MIT
github.com/myshell-ai/MeloTTS

XTTS v2 / Coqui TTS
Coqui AI
6s reference audio to clone voice across 17 languages. MPL license. Huge model library.
GPU
MPL 2.0
github.com/coqui-ai/TTS

Tortoise TTS
James Betker
High quality. Slow (10 min for 10 sec audio). Best for audiobooks. Diffusion-based prosody.
GPU (slow)
Apache 2.0
github.com/neonbjb/tortoise-tts

VALL-E X
Microsoft Research
Cross-lingual voice cloning. Preserves speaker identity across languages.
GPU
Open research
github.com/microsoft/unilm

StyleTTS2
Li et al.
Style diffusion. Human-level naturalness on LJSpeech benchmarks.
GPU
MIT
github.com/yl4579/StyleTTS2

SoundStorm (AudioPaLM)
Google Research
Non-autoregressive TTS. Parallel generation. Research release.
GPU
Research
github.com/google-research

ESPnet-TTS
ESPnet team
Full speech processing toolkit. Supports FastSpeech2, VITS, Conformer TTS.
GPU
Apache 2.0
github.com/espnet/espnet

VITS
Jaehyeon Kim
End-to-end TTS with flow-based model. Natural prosody. Fast inference.
GPU
MIT
github.com/jaywalnut310/vits

LightTTS
Community
Lightweight, fast TTS for edge deployment. Low latency.
CPU
MIT
huggingface.co

EmotiVoice
NetEase Youdao
Controllable emotion TTS. 2000+ voices. Chinese and English.
GPU
Apache 2.0
github.com/netease-youdao/EmotiVoice

OpenVoice
MyShell.ai
Instant voice cloning. Tone color cloning. Cross-lingual. Flexible style control.
GPU
MIT
github.com/myshell-ai/OpenVoice

Bark
Suno AI
Transformer-based. Generates speech with nonverbal sounds, laughing, sighing. Multi-language.
GPU (8GB+)
MIT
github.com/suno-ai/bark

2B. Open Source TTS Desktop Applications
GUI tools that wrap TTS models for easy non-developer use.

App
Developer
Description
Platform
License
Source

Voicebox
jamiepine
Local-first. 7 TTS engines. Kokoro, Chatterbox, Qwen3-TTS, LuxTTS, HumeAI. 23 languages. Privacy: nothing leaves machine. MCP agent support.
Desktop
MIT
github.com/jamiepine/voicebox

LM Studio (TTS layer)
LM Studio
Local TTS integrated with LLM runners.
Desktop
Free
lmstudio.ai

Buzz
chidiwilliams
Whisper-based. Transcription + TTS workflows on macOS.
macOS
MIT
github.com/chidiwilliams/buzz

SECTION 3 — SPEECH-TO-TEXT / TRANSCRIPTION

3A. Open Source Speech-to-Text Models
All models below are free. Whisper family has MIT license = full commercial use. Check others individually.

Model
Developer
Description
Hardware
License
Source

Whisper Large V3
OpenAI
99+ languages. Most widely used OSS ASR. MIT license. Gold standard for multilingual transcription.
8GB VRAM
MIT
github.com/openai/whisper

Whisper Large V3 Turbo
OpenAI
6x faster than V3 by reducing decoder layers. 809M params. Within 1-2% accuracy of V3.
6GB VRAM
MIT
github.com/openai/whisper

Distil-Whisper
Hugging Face
Knowledge distillation of Whisper V3. 6x faster. 756M params. Within 1% WER on out-of-distribution audio.
4GB VRAM
MIT
github.com/huggingface/distil-whisper

Faster-Whisper
SYSTRAN
CTranslate2-based Whisper. 4x faster than original. Lower memory. CPU support.
CPU/GPU
MIT
github.com/SYSTRAN/faster-whisper

WhisperX
m-bain
Forced alignment + speaker diarization. Accurate word-level timestamps.
GPU
BSD-2
github.com/m-bain/whisperX

Whisper-AT
Yuan Gong
Whisper extended for non-speech audio event recognition.
GPU
MIT
github.com/YuanGongND/whisper-at

NVIDIA Canary-Qwen 2.5B
NVIDIA
#1 on HuggingFace Open ASR Leaderboard. 5.63% WER. Speech-Augmented LM architecture.
GPU
Open
huggingface.co/nvidia/canary-qwen-2.5b

IBM Granite Speech 3.3 8B
IBM
#2 on Open ASR Leaderboard. 5.85% WER. Enterprise-grade.
GPU
Apache 2.0
huggingface.co/ibm-granite

NVIDIA Parakeet TDT 1.1B
NVIDIA
RTFx &gt;2000. 6.5x faster than Canary. Best for real-time/live captioning.
GPU
Open
huggingface.co/nvidia/parakeet-tdt-1.1b

Qwen3-ASR
Alibaba
New 2026 state-of-art. 52 languages. 1.7B and 0.6B sizes. Beat most commercial APIs on benchmarks.
GPU
Open
huggingface.co/Qwen

Moonshine v2
Useful Sensors
Edge/IoT focused. Smallest: 27MB. Raspberry Pi deployable. Ergodic Streaming Encoder for low latency.
CPU/Edge
Apache 2.0
github.com/usefulsensors/moonshine

SpeechBrain
SpeechBrain team
Full PyTorch toolkit: ASR, speaker diarization, speech enhancement, TTS. Training recipes included.
GPU
Apache 2.0
github.com/speechbrain/speechbrain

Vosk
Alpha Cephei
Offline. 20+ languages. Android/iOS/Raspberry Pi support. Streaming capable.
CPU
Apache 2.0
github.com/alphacep/vosk-api

Kaldi
Johns Hopkins et al.
C++. Apache 2.0. HMM/GMM/FST based. Gold standard for research and custom domain training.
CPU/GPU
Apache 2.0
github.com/kaldi-asr/kaldi

ESPnet ASR
ESPnet team
Conformer-based. Research toolkit. Streaming and offline support.
GPU
Apache 2.0
github.com/espnet/espnet

NeMo ASR
NVIDIA
Conformer-CTC and RNNT models. Production-ready toolkit.
GPU
Apache 2.0
github.com/NVIDIA/NeMo

PaddleSpeech
Baidu
Chinese-origin toolkit. Excellent for Mandarin. Also supports English and other languages.
GPU
Apache 2.0
github.com/PaddlePaddle/PaddleSpeech

Julius
Nagoya University
Lightweight. Real-time. CPU. Optimized for Japanese but multilingual capable.
CPU
BSD
github.com/julius-speech/julius

PocketSphinx
CMU
Ultra-lightweight. Runs on microcontrollers. Offline. Limited accuracy.
CPU (tiny)
BSD
github.com/cmusphinx/pocketsphinx

pyannote.audio
pyannote
Speaker diarization. Used alongside Whisper for multi-speaker transcription.
GPU
MIT
github.com/pyannote/pyannote-audio

SECTION 4 — MUSIC &amp; AUDIO GENERATION

4A. Open Source Music, Audio &amp; SFX Models
Covers text-to-music, text-to-sound-effects, music separation, MIDI transcription, and audio codecs.

Model
Developer
Description
Hardware
License
Source

MusicGen (AudioCraft)
Meta AI
Text-to-music generation. Small/medium/large/stereo variants. Fully open source.
GPU
MIT
github.com/facebookresearch/audiocraft

AudioGen (AudioCraft)
Meta AI
Text-to-sound-effects generation. Part of AudioCraft suite.
GPU
MIT
github.com/facebookresearch/audiocraft

EnCodec (AudioCraft)
Meta AI
Neural audio codec. High-quality compression. Part of AudioCraft.
GPU
MIT
github.com/facebookresearch/audiocraft

Stable Audio Open
Stability AI
Text-to-audio. Up to 47s samples. Sound effects, drum beats, instrument riffs. Fine-tunable.
GPU
Open
stability.ai/stable-audio

DiffRhythm
DiffRhythm team
Full-length song generation via latent diffusion. Training and inference tools included.
GPU
Open
huggingface.co/ASLP-lab

Riffusion (original)
Seth Forsgren
Spectrogram-based. Generates music by visualizing audio as images. Runs on SD pipeline.
GPU
MIT
github.com/riffusion/riffusion

AudioLM
Google Research
Language-model approach to audio generation. Conditioning with classifier-free guidance. PyTorch.
GPU
Research
github.com/lucidrains/audiolm-pytorch

MusicLM (research)
Google Research
High-fidelity music from text descriptions. Research paper + partial open release.
GPU
Research
github.com/google-research/google-research

VampNet
Hugo Flores Garcia
Music generation via masked acoustic token modeling. Excellent for variation and continuation.
GPU
MIT
github.com/hugofloresgarcia/vampnet

HunyuanVideo-Foley
Tencent
Foley audio synced to video. 48kHz output. Multimodal: aligns audio, video, and text. Professional SFX.
GPU
Open
huggingface.co/tencent/HunyuanVideo-Foley

AudioX
AudioX team
Any-to-audio: video, image, text to audio/music/SFX in one framework.
GPU
Open
huggingface.co/AudioX

SoundStorm
Google Research
Parallel audio generation. Extremely fast. Research release.
GPU
Research
github.com/google-research

Moises SDK
Moises
Open source audio separation: stems, BPM, chords, key detection.
CPU/GPU
MIT
github.com/moises-ai

Demucs
Meta AI
State-of-art music source separation. Separate vocals, drums, bass, other. v4 hybrid transformer.
CPU/GPU
MIT
github.com/facebookresearch/demucs

Spleeter
Deezer
Fast music source separation. 2/4/5-stem models. Production-tested.
CPU/GPU
MIT
github.com/deezer/spleeter

Basic Pitch
Spotify
Audio to MIDI transcription. Open source. Works on any polyphonic audio.
CPU
Apache 2.0
github.com/spotify/basic-pitch

Melodfy
ByteDance (research)
Piano audio recording to MIDI conversion. AI-powered.
CPU/GPU
Research
huggingface.co

GenSFX
GenSFX
Text-to-sound-effects. Free web tool. No signup required.
Browser
Free
gensfx.com

SECTION 5 — AI VIDEO GENERATION &amp; EDITING

5A. Open Source Video Generation Models
Self-hostable. Most require 14-24GB VRAM for full quality. Smaller quantized variants exist for lower VRAM.

Model
Developer
Description
Min VRAM
License
Source

HunyuanVideo 1.5
Tencent
8.3B params. Diffusion Transformer + 3D causal VAE. Runs on 14GB VRAM with offloading. Smooth motion.
14GB VRAM
Open
github.com/Tencent/HunyuanVideo

Wan 2.2 / 2.6
Alibaba
Best cinematic open-source output. Self-hosted = zero watermarks. LoRA training for character consistency.
16GB VRAM
Apache 2.0
github.com/ali-vilab/wan2.1

LTX-Video 2.1/2.3
Lightricks
Generates 30fps at 1216x704 faster than real time. Multiple variants: 13B, 2B, FP8. ComfyUI workflows included.
12GB VRAM
LTX Open
github.com/Lightricks/LTX-Video

Open-Sora 2.0
HPC-AI Tech
11B model. On-par with HunyuanVideo 11B and Step-Video 30B. Fully open: checkpoints + training code.
16GB VRAM
Apache 2.0
github.com/hpcaitech/Open-Sora

CogVideoX-5B
THUDM
Short 6s clips at 720x480. Efficient bfloat16. Quantization support.
16GB VRAM
Apache 2.0
github.com/THUDM/CogVideo

Mochi 1
Genmo
Best-in-class prompt adherence. Full open source. Apache 2.0 = commercial ok. Run locally.
24GB VRAM
Apache 2.0
github.com/genmoai/mochi

DynamiCrafter
Tencent AI Lab
Image-to-video. Natural motion from still images. Hair/water motion quality. Identity preserved.
16GB VRAM
Apache 2.0
github.com/Doubiiu/DynamiCrafter

I2VGen-XL
Alibaba DAMO
Image-to-video with semantic understanding. Complex scene handling.
16GB VRAM
Open
github.com/ali-vilab/i2vgen-xl

Stable Video Diffusion (SVD)
Stability AI
Image-to-video. Large community. Integrates with ComfyUI.
16GB VRAM
Stability AI Community
github.com/Stability-AI/generative-models

AnimateDiff
guoyww
Turns SD images into animations. Plug-in motion module for SD.
8GB VRAM
Apache 2.0
github.com/guoyww/AnimateDiff

ModelScope T2V
Alibaba DAMO
Text-to-video. Original open release that sparked many derivatives.
16GB VRAM
CC BY-NC 4.0
github.com/ali-vilab/modelscope-text-to-video-synthesis

VideoCrafter2
AILAB-CVC
High-quality text-to-video and image-to-video.
16GB VRAM
Apache 2.0
github.com/AILab-CVC/VideoCrafter

Show-1
David Junhao Zhang
Combines keyframe and interframe generation for consistent longer videos.
16GB VRAM
MIT
github.com/showlab/Show-1

SEINE
VCHSY
Shot transition and image animation model.
16GB VRAM
MIT
github.com/Vchitect/SEINE

MotionDirector
Showlab
Customize motion patterns via LoRA-like training.
GPU
MIT
github.com/showlab/MotionDirector

5B. Open Source Video Editors &amp; Pipeline Tools
Tools for editing, assembling, and automating AI video production.

Tool
Developer
Description
Platform
License
Source

LTX Desktop
Lightricks
First free open-source nonlinear AI video editor. Built on LTX-Video engine. Windows installer. Local rendering. No cloud, no watermarks.
Windows
LTX Open
github.com/Lightricks/LTX-Desktop

Frame
aregrid
Open-source AI vibe video editor. Cursor-like interaction. Automates editing and enhancement.
Desktop
MIT
github.com/aregrid/frame

OpenMontage
OpenMontage
Agent-driven full pipeline: research → script → assets → voiceover → assembly → render. Modular. Local or cloud models.
Any OS
Open
github.com/OpenMontage

MoneyPrinterTurbo
harry0703
Topic input → script → media → subtitles → music → final video. Automated short-form pipeline.
Any OS
MIT
github.com/harry0703/MoneyPrinterTurbo

Story Flicks
Community
Short story video generation from script/prompt inputs. Minimal user input required.
Any OS
Open
github.com

ComfyUI (video)
comfyanonymous
Node-based pipeline for video generation. Supports HunyuanVideo, WAN, LTX, AnimateDiff via workflows.
Any OS
GPL-3.0
github.com/comfyanonymous/ComfyUI

Auto-Editor
WyattBlue
AI-powered automatic video editing: silence removal, jump cuts, motion detection.
Any OS
MIT
github.com/WyattBlue/auto-editor

VidChapters-7M (tools)
Research
Automatic chapter detection and video segmentation.
GPU
Apache 2.0
github.com

Lossless Cut
Mikael Finstad
Fast, lossless video trimming and cutting. Lightweight. No re-encoding.
Any OS
GPL-2.0
github.com/mifi/lossless-cut

Kdenlive
KDE
Full-featured open-source video editor. AI subtitle generation built in (via Whisper).
Linux/Win/Mac
GPL-2.0
kdenlive.org

OpenShot
OpenShot team
Open-source video editor. Python-based. AI background removal.
Any OS
GPL-3.0
openshot.org

Shotcut
Meltytech
Open-source video editor with some AI-assisted features.
Any OS
GPL-3.0
shotcut.org

Flowblade
jliljebl
Multitrack video editor for Linux. Fast and lightweight.
Linux
GPL-3.0
github.com/jliljebl/flowblade

5C. Free Hosted Video Generation Platforms
Browser-based. Free tiers available. Most have daily credit limits and apply watermarks on free tier.

Platform
Provider
Notes
Access

Kling AI 3.0 (free tier)
Kuaishou
Daily refresh credits. Physics-aware. 4K/60fps. Best free cinematic quality 2026.
Browser

HaiLuo / MiniMax (free)
MiniMax
Fast queue. Free credits. Stylized. Native 1080p.
Browser

Google Veo 3.1 (AI Studio)
Google
Rate-limited free access via AI Studio. Native audio+video generation. Best quality.
Browser

Pika (free tier)
Pika Labs
~150 signup credits + daily replenish. Effects library. Social media focus.
Browser

Dreamina / Jimeng
ByteDance
66-80 daily credits. Seedance 2.0 access. Character consistency.
Browser

PixVerse (free)
PixVerse
Free credits. Multi-style support: realistic, anime. Social media optimized.
Browser

Luma Dream Machine (free)
Luma AI
Limited free monthly generations. High quality.
Browser

HeyGen (free)
HeyGen
Free plan: avatars, 175+ languages, voice clone. Best free enterprise evaluation.
Browser

SECTION 6 — LIP SYNC &amp; TALKING AVATAR MODELS

All models below are open source and self-hostable. Applications: dubbing, avatar creation, AI presenters, e-learning, VTubing.

Model
Developer
Description
Hardware
License
Source

Wav2Lip
Prajwal et al.
Foundational open-source lip sync. GAN-based. SyncNet discriminator ensures audio-visual accuracy. Zero-shot, any language.
GPU
Research (personal use)
github.com/Rudrabha/Wav2Lip

Wav2Lip HD
Community
Community extension of Wav2Lip with CodeFormer for higher visual quality.
GPU
Research
github.com/ajay-sainy/Wav2Lip-GFPGAN

MuseTalk
Tencent TMElyralab
Diffusion-based. Sharper output than GANs. Real-time at 30FPS. Better teeth and boundaries.
GPU
MIT
github.com/TMElyralab/MuseTalk

LatentSync
ByteDance
Latent-space lip sync. Encodes face and audio into compact representations.
GPU
Apache 2.0
github.com/bytedance/LatentSync

SadTalker
OpenTalker
Single portrait → full talking head with expression and head motion. 3DMM approach.
GPU
MIT
github.com/OpenTalker/SadTalker

VideoReTalking
CUHK
Modifies lip movements in existing video footage to match new audio. Preserves original frame.
GPU
MIT
github.com/OpenTalker/video-retalking

LivePortrait
KwaiVGI
Image → animated portrait with expression and pose. High identity retention.
GPU
MIT
github.com/KwaiVGI/LivePortrait

GeneFace++
ZiqiPan
Talking head with excellent identity retention. Good for generated avatars.
GPU
MIT
github.com/yerfor/GeneFacePlusPlus

LipGAN
Prajwal K R
Early talking face generation model. Handles any language and accents.
GPU
MIT
github.com/Rudrabha/LipGAN

MakeItTalk
Chen et al.
Lightweight talking head from single image. Speaker-aware animation.
GPU
MIT
github.com/yzhou359/MakeItTalk

OmniHuman v1.5
ByteDance
Film-grade digital humans. Full-body motion, camera movement, multi-character from single image + audio. Supports singing.
GPU
Research
huggingface.co/ByteDance

Talking Head 3D
Anne Barela / community
Browser JS class. 3D avatar that speaks and lip-syncs in real-time. GLB avatars + Mixamo animations. MIT licensed.
Browser
MIT
github.com/met4citizen/TalkingHead

DiffTalk
DiffTalk team
Diffusion-based talking head. High quality and controllable.
GPU
MIT
github.com

IP-Adapter Face
tencent-ailab
Face reference adapter. Inject specific face identity into any generation.
GPU
Apache 2.0
github.com/tencent-ailab/IP-Adapter

SECTION 7 — AGGREGATOR PLATFORMS &amp; UNIFIED API HUBS

These platforms provide access to multiple models through a single interface or API. Useful for comparison and scaling.

Platform
URL
Description
Free Access

Hugging Face
huggingface.co
90,000+ models across all categories. Spaces for browser-based free inference. Model hub, datasets, leaderboards.
Free tier unlimited Spaces

Replicate
replicate.com
300+ models via single API. Pay-as-you-go. Free credits at signup. FLUX, SD, WAN, TTS and more.
Free credits on signup

ComfyUI
github.com/comfyanonymous/ComfyUI
Local model orchestration. Supports image, video, audio workflows via node graphs. Plugin ecosystem.
Free and open source

Ollama
ollama.ai
Local LLM and multimodal model runner. Pull and run open models in one command.
Free and open source

LM Studio
lmstudio.ai
Desktop app for running local LLMs and TTS. GUI interface. No coding required.
Free

InvokeAI
invoke-ai/InvokeAI
Full-stack image generation platform. API + UI. Supports all SD variants and FLUX.
Open source

WaveSpeedAI
wavespeed.ai
Aggregates FLUX, GPT Image 1.5, Ideogram, Recraft in one interface. Free credits on signup.
Free credits

getimg.ai
getimg.ai
Veo 3.1, Kling, Seedance, Runway, WAN in one dashboard. Free credits.
Free credits

Atlas Cloud
atlascloud.ai
Kling, WAN, Vidu, Seedance, FLUX via single API. Batch processing. Free trial.
Free trial + pay-per-use

SECTION 8 — QUICK-PICK DECISION GUIDE

Best Open-Source Choice by Use Case

Goal
Recommended Tool

Highest quality image (self-hosted)
FLUX.2 or HunyuanImage 3.0

Fastest image generation (self-hosted)
FLUX.1 [schnell] or SANA-Sprint 1.6B

Image — largest community ecosystem
Stable Diffusion 3.5 Large + ComfyUI

Image — legally clean for commercial
FIBO (licensed training data only)

Image — no GPU, browser only
Hugging Face Spaces (FLUX via Space) or Ideogram

TTS — best quality + MIT license
Chatterbox / Chatterbox Turbo

TTS — fastest / lightest
Kokoro (82M params, Apache 2.0)

TTS — multilingual voice cloning
XTTS v2 (17 languages, 6s reference)

TTS — edge / on-device
NeuTTS Air or Moonshine

TTS — multi-speaker dialogue
Dia by Nari Labs

TTS — desktop app, no coding
Voicebox (7 engines, 23 languages, local)

STT — most accurate
NVIDIA Canary-Qwen 2.5B (5.63% WER)

STT — fastest real-time
NVIDIA Parakeet TDT 1.1B (RTFx &gt;2000)

STT — best multilingual (99 languages)
Whisper Large V3 (MIT)

STT — edge / CPU only
Moonshine (27MB) or Vosk

STT — speaker diarization
WhisperX + pyannote.audio

Music generation (text-to-music)
Meta AudioCraft / MusicGen

Full-song generation
DiffRhythm

Sound effects from text
AudioCraft AudioGen or GenSFX

Music source separation
Demucs v4 (Meta AI)

Video — best cinematic quality (self-hosted)
Wan 2.2 or HunyuanVideo 1.5

Video — fastest generation
LTX-Video 2.1 (faster than real time)

Video — Apache 2.0 / commercial safe
Mochi 1 or Open-Sora 2.0

Video — no watermark, unlimited
Self-host WAN 2.2 locally

Video editing — open source desktop
LTX Desktop or Kdenlive

Video — full automated pipeline
OpenMontage or MoneyPrinterTurbo

Lip sync — best quality
MuseTalk (real-time, diffusion-based)

Lip sync — most compatible baseline
Wav2Lip (any language, zero-shot)

Talking head from single image
SadTalker or LivePortrait

Film-grade talking human from image
OmniHuman v1.5 (ByteDance)

3D browser avatar (real-time)
Talking Head 3D (MIT, JavaScript)

License Quick Reference

License
Commercial Use?
Modify?
Distribute?
Notes

MIT
YES
YES
YES
Most permissive. Use freely.

Apache 2.0
YES
YES
YES
Patent protection included.

GPL-2.0 / GPL-3.0
YES (open source)
YES
Must open-source derivative
Copyleft: your code must also be GPL.

CC BY-NC
NO
YES
YES
Non-commercial only. Attribution required.

CreativeML Open RAIL-M
YES (with restrictions)
YES
YES
Stable Diffusion license. Review use restrictions.

Stability AI Community
Limited
YES
Limited
Check current terms at stability.ai.

Research / non-commercial
NO
Lab use only
No
Academic/personal use only.

Hardware Quick Reference

VRAM Available
What You Can Run

4-6GB
SD 1.5, SANA-Sprint, Kokoro TTS, Whisper base/small, Vosk, basic lip sync

8GB
SDXL, AnimateDiff, LCM, most TTS models, Whisper large, CogVideoX (quantized)

12-16GB
FLUX.1 schnell, Stable Diffusion 3.5, HunyuanVideo (with offloading), Wan (quantized), full TTS suite

24GB+
FLUX.2, HunyuanImage 3.0, HunyuanVideo full, WAN 2.2 full quality, Mochi 1

CPU only (no GPU)
Vosk STT, Moonshine STT, PocketSphinx, Julius, NeuTTS Air, Kokoro (slow), LCM (slow)

Apple Silicon (MPS)
SD via DiffusionBee / Draw Things, Whisper, many TTS models via MLX builds

Total Count Summary

Category
Count

Image Generation Models (self-hosted)
23 models

Image Generation Interfaces/UIs
8 interfaces

Image Generation Free Hosted Platforms
11 platforms

TTS Models (self-hosted)
23 models

TTS Desktop Applications
3 apps

Speech-to-Text Models
20 models

Music &amp; Audio Models
18 models

Video Generation Models (self-hosted)
15 models

Video Editors &amp; Pipeline Tools
13 tools

Video Free Hosted Platforms
8 platforms

Lip Sync &amp; Talking Avatar Models
14 models

Aggregator Platforms
9 platforms

TOTAL TOOLS/MODELS CATALOGUED
165+

END OF DOCUMENT — FREE &amp; OPEN-SOURCE AI PROVIDER MASTER REFERENCE 2026