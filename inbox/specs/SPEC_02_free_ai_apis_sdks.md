# Free_AI_APIs_SDKs_2026.docx

FREE AI API KEYS, SDKs &amp;
INFERENCE PROVIDERS 2026

Complete Developer Reference: Every Free Tier, Every SDK, Every Signup URL

Compiled May 2026   |   75+ Providers &amp; Tools Catalogued

IMPORTANT: Rate limits and free tier conditions change frequently. Always verify at the provider&apos;s current pricing/docs page before building. Links verified May 2026.

CONTENTS

Section 1 — Permanent Free Tiers: API Access with No Credit Card Required
Section 2 — Trial/Signup Credits: One-Time or Expiring Free Credits
Section 3 — Local Self-Hosted: Truly Unlimited Free (No API Key Needed)
Section 4 — Official SDKs: Python &amp; JavaScript Libraries
Section 5 — Code Examples: Working Starter Code for Every Major Provider
Section 6 — Startup Programs: $1,000 – $200,000 in Free Credits
Section 7 — Privacy &amp; Data Policy Quick Reference
Section 8 — Quick-Pick Guide: Which API for Which Task

SECTION 1 — PERMANENT FREE TIERS

These providers offer genuine ongoing free access — not trial credits that expire. No credit card required (marked NO).
✓ These are the foundation. Start here before spending anything.

Provider
Signup URL
Free Limits
Models Available
CC Required
SDK / Compat
Best For

Google AI Studio / Gemini API
aistudio.google.com
1,500 req/day (Flash); 100 req/day (Pro); 5 RPM; 1M token context
Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.0 Flash, Imagen 4 (images)
NO
Python, JS, REST, OpenAI-compat
Best overall free tier. Multimodal: text, image, audio, video. Largest context window.

Groq Cloud
console.groq.com
~6,000 req/day; 30K TPM on LLaMA 8B; 300-800 tokens/sec
Llama 3.3 70B, Llama 3.1 8B/70B, Mixtral 8x7B, Gemma 7B
NO
Python, JS, OpenAI-compatible
Fastest free inference on the planet. LPU hardware. Best for real-time chat/voice.

Cerebras Inference
cloud.cerebras.ai
1M tokens/day; 2,600+ tokens/sec
Llama 3.3 70B, gpt-oss-120B
NO
Python, JS, OpenAI-compatible
Even faster than Groq on throughput. Best for batch workloads.

SambaNova Cloud
cloud.sambanova.ai
Free cloud tier; competitive speeds
Llama 3.1 405B, DeepSeek R1, Qwen models
NO
OpenAI-compatible REST
Best for 405B models for free. RDU architecture.

Cloudflare Workers AI
developers.cloudflare.com/workers-ai
10,000 Neurons/day; edge-deployed globally
Llama 3.3 70B, Mistral 7B, DeepSeek R1 distill, Stable Diffusion (images), Whisper (STT)
NO
JS Workers, REST API
Edge inference. 300+ global PoPs. Image gen + TTS + STT all on one free tier.

Mistral La Plateforme
console.mistral.ai
1B tokens/month on open models; 2 RPM cap (free tier may train on prompts)
Mistral Small, Mistral 7B, Mixtral, Codestral (code)
NO
Python, JS, OpenAI-compatible
Broadest Mistral model access free. Good multilingual. Privacy tradeoff on free tier.

OpenRouter
openrouter.ai
50 req/day free; 20 RPM; 29+ free models marked :free
DeepSeek R1, DeepSeek V3, Llama 4 Maverick/Scout, Qwen3 235B, Gemma 3
NO
OpenAI-compatible, Python, JS
Best model variety on one API key. Route to dozens of providers. No lock-in.

Hugging Face Inference API
huggingface.co
Hundreds req/hour (varies); cold starts possible; 1000s of models
FLUX.1 (images), Whisper (STT), any open model on HF: Llama, Mistral, Qwen, SD, etc.
NO
huggingface_hub Python, @huggingface/inference JS, REST
90,000+ models. Best for niche/specialized models. Not reliable for production.

NVIDIA NIM
build.nvidia.com
1,000 credits signup; can request up to 5,000 total; 40 RPM
DeepSeek R1/V3, Llama variants, Kimi K2, AI21 Jamba, vision + biology models
NO
Python, JS, OpenAI-compatible
91 free endpoint models. Includes scientific compute, vision, audio. Docker containers for self-host.

Cohere
cohere.com
1,000 API calls/month; full model access
Command R+, Command R, Embed 4, Rerank 3.5
NO
Python, JS cohere SDK
Best free RAG pipeline. Embeddings + reranking + generation in one SDK.

Fireworks AI
fireworks.ai
10 RPM free (no card); 6,000 RPM with card
Llama 3.1 405B, DeepSeek R1, hundreds of open-source models
NO (10 RPM tier)
Python, JS, OpenAI-compatible
Fastest structured output. Function calling optimized. Best open-source model speed.

DeepInfra
deepinfra.com
Free credits on signup
Kimi K2, Qwen3.5, GLM-5, DeepSeek V3.2, gpt-oss-120B, MiniMax-M2
YES (card for higher tier)
OpenAI-compatible REST
Widest frontier open-source model catalog. Cheapest per-token rates.

AI/ML API
aimlapi.com
Free tier included; 400+ models
GPT variants, Claude, Gemini, DeepSeek, FLUX, Llama — aggregated
NO
OpenAI-compatible
Single key for 400+ models including frontier closed models on free tier.

ZSky AI
zsky.ai
Free anonymous + free key tier; no CC
Video generation (1080p), image generation
NO
REST API
Free video generation API. 1080p output with audio. No signup for basic use.

Fish Audio API
fish.audio
Free monthly generations included
Fish Speech 1.6 TTS, voice cloning
NO (free tier)
Python SDK, REST
TTS + voice cloning. Free monthly quota. Outperforms ElevenLabs in quality tests.

Pixazo API
pixazo.ai
Free API key, daily requests
FLUX Schnell (1.2s/image), Stable Diffusion, image editing
NO
REST
Fast image generation API. Free tier. FLUX Schnell in ~1.2 seconds.

* Mistral free tier may use your prompts for model training. Do not send proprietary or sensitive data.
* Hugging Face Inference API free tier has cold starts (30+ second delay on unpopular models). Not production-reliable.
* Cohere 1,000 calls/month is for evaluation only. Not suitable for production workloads.

SECTION 2 — TRIAL / SIGNUP CREDITS

These providers give free credits at signup that eventually expire or run out. Some require a credit card on file even if they don&apos;t charge initially.
⚠ Trial credits expire. Always verify current amounts at provider&apos;s site — these change frequently.

Provider
Signup URL
Free Credits
Models
CC Required
SDK
Notes

OpenAI API
platform.openai.com
~$5 trial credits (expires)
GPT-4o, GPT-4o Mini, DALL-E 3, Whisper, TTS, Sora API
YES (after trial)
openai Python/JS SDK
Most widely used. Best ecosystem. Effectively requires $5 deposit for real use.

Anthropic API
console.anthropic.com
~$5 trial credits (expires)
Claude Sonnet 4.6, Claude Haiku 4.5, Claude Opus 4.6
YES (after trial)
anthropic Python/JS SDK
Best for long-context, writing, reasoning. No permanent free tier.

xAI Grok API
console.x.ai
$25 signup credits; +$150/month with data-sharing opt-in
Grok 3, Grok 3 Mini, Aurora (image gen)
NO
OpenAI-compatible
Most generous one-time credit. Ultra-long context. $150/month possible with data sharing.

Together AI
together.ai
$100 credits (was $5; verify current) occasionally; $5 minimum purchase
200+ open-source models: Llama 4, DeepSeek R1, FLUX (images)
YES (minimum $5)
Python, JS, OpenAI-compatible
Best for open-source model benchmarking. Fine-tuning + inference on same platform.

Replicate
replicate.com
Free credits at signup
FLUX, Stable Diffusion, Whisper, WAN video, 300+ models across image/video/audio
YES (after credits)
replicate Python/JS SDK
Best multi-modal model variety. Image, video, audio, LLMs all via one API.

fal.ai
fal.ai
Free credits at signup
FLUX, ElevenLabs TTS, video models, image models, audio
YES (after credits)
fal Python/JS client
Fast inference for image + video + audio. Sub-second FLUX images. ElevenLabs integration.

Stability AI API
platform.stability.ai
Free credits on signup
Stable Diffusion 3.5, Stable Audio, Stable Video
YES (after credits)
REST API
Official Stability AI API. All SD models.

DeepSeek API
platform.deepseek.com
5M free tokens on signup (30 days); then extremely cheap
DeepSeek V3, DeepSeek R1
NO
OpenAI-compatible
Quasi-free: 20-100x cheaper than OpenAI after credits. No hard rate limit.

novita.ai
novita.ai
Free credits on signup
LLMs, image generation, video, audio APIs
YES (after credits)
OpenAI-compatible REST
All modalities: LLM + image + video + audio in one platform. Competitive pricing.

ElevenLabs API
elevenlabs.io
10,000 char/month free tier (ongoing)
Eleven v3 TTS, Scribe v2 STT, Instant Voice Cloning, multilingual
NO (free tier)
elevenlabs Python/JS SDK
Best commercial TTS quality. Free tier is ongoing, not expiring credits.

* ElevenLabs free tier (10K chars/month) is ongoing, not expiring — different from the others in this section.
* DeepSeek&apos;s pricing post-credits is so low (~$0.14/M tokens) it functions as quasi-free for most developers.

SECTION 3 — LOCAL SELF-HOSTED (TRULY UNLIMITED FREE)

These require no API key and have no rate limits. The only cost is your hardware. Complete privacy — data never leaves your machine.
✓ Best for: privacy, high volume, offline use, zero ongoing cost.

Tool
URL / Install
Install Method
Models Supported
Limits
API Interface
Notes

Ollama
ollama.ai
pip/brew/installer
Llama 3.3, Mistral, Qwen3, Phi4, DeepSeek, Gemma, 100+ models
Unlimited (hardware only)
OpenAI-compatible local API (localhost:11434); Python, JS
Pull and run any open model in one command. No API key. Full privacy.

LM Studio
lmstudio.ai
Desktop installer
Same as Ollama + GGUF format models
Unlimited
OpenAI-compatible local server; Python, JS
GUI for non-developers. Runs as local API server. No coding required.

vLLM
github.com/vllm-project/vllm
pip install vllm
Any HuggingFace model: Llama, Mistral, FLUX, etc.
Unlimited
OpenAI-compatible REST server
Production-grade local inference server. Continuous batching. Best for high throughput.

Text Generation Inference (TGI)
github.com/huggingface/text-generation-inference
Docker pull
Any HuggingFace text model
Unlimited
REST + streaming API
HuggingFace&apos;s official inference server. Docker-based. OpenAI-compatible.

llama.cpp
github.com/ggerganov/llama.cpp
Compile from source / brew
GGUF format models: Llama, Mistral, Qwen, Phi, etc.
Unlimited
C++ API; Python bindings; OpenAI-compatible server
Fastest CPU inference. Runs Llama 3 on a MacBook. No GPU required.

Jan
jan.ai
Desktop installer
GGUF models via Ollama/llama.cpp backends
Unlimited
OpenAI-compatible local API
Cross-platform desktop app. GUI + local API. Good for beginners.

GPT4All
gpt4all.io
Desktop installer
Llama, Mistral, Phi variants, GGUF models
Unlimited
Python SDK; local REST API
Offline. No internet required. Simple setup. Built-in Python SDK.

Open WebUI
github.com/open-webui/open-webui
Docker pull
Any Ollama or OpenAI-compatible backend
Unlimited
Works with any local server
ChatGPT-like web interface for local models. Runs on top of Ollama.

LocalAI
github.com/mudler/LocalAI
Docker pull
LLMs, Stable Diffusion, Whisper, TTS — all locally
Unlimited
OpenAI-compatible REST (drop-in replacement)
Drop-in OpenAI API replacement that runs 100% locally. All modalities.

Koboldcpp
github.com/LostRuins/koboldcpp
Single binary
GGUF + GGML models
Unlimited
REST API
Single binary. No install required. Runs on CPU. Image gen (SDXL) built-in.

Automatic1111 WebUI (API mode)
github.com/AUTOMATIC1111/stable-diffusion-webui
pip + launch args
Stable Diffusion all variants
Unlimited
REST API at localhost:7860
SD image generation via REST API. --api flag enables it.

ComfyUI (API mode)
github.com/comfyanonymous/ComfyUI
pip install
SD, FLUX, HunyuanVideo, all image/video models
Unlimited
REST + WebSocket API
Node-based. API mode enables programmatic workflow execution.

Whisper.cpp
github.com/ggerganov/whisper.cpp
Compile or brew
Whisper all sizes: tiny through large-v3
Unlimited
C API; Python bindings; server mode
Fastest local Whisper inference. CPU + Metal + CUDA. Sub-real-time on modern hardware.

Faster-Whisper
github.com/SYSTRAN/faster-whisper
pip install faster-whisper
Whisper all sizes + distil-whisper
Unlimited
Python library
4x faster than original Whisper. Lower memory. Easy Python API.

Coqui TTS
github.com/coqui-ai/TTS
pip install TTS
XTTS v2, 100+ TTS models
Unlimited
Python library: from TTS.api import TTS
Full TTS pipeline. Voice cloning. 17+ languages.

SECTION 4 — OFFICIAL SDKs

These are the Python and JavaScript/TypeScript libraries you install to call AI APIs. Most use OpenAI-compatible format — change the base_url and api_key to switch providers with zero code changes.

SDK / Library
pip install
npm install
What It Does
Source

openai
pip install openai
npm install openai
OpenAI Python / JS SDK. OpenAI-compatible = works with Groq, DeepSeek, Mistral, etc. by changing base_url
github.com/openai/openai-python

anthropic
pip install anthropic
npm install @anthropic-ai/sdk
Official Anthropic SDK. Claude models.
github.com/anthropic/anthropic-sdk-python

google-genai
pip install google-genai
npm install @google/genai
Google GenAI SDK for Gemini models.
github.com/google/generative-ai-python

groq
pip install groq
npm install groq
Groq SDK. OpenAI-compatible. Fastest inference.
github.com/groq/groq-python

mistralai
pip install mistralai
npm install @mistralai/mistralai
Mistral official SDK.
github.com/mistralai/client-python

cohere
pip install cohere
npm install cohere-ai
Cohere SDK: generation, embeddings, reranking.
github.com/cohere-ai/cohere-python

together
pip install together
npm install together-ai
Together AI SDK. 200+ open-source models.
github.com/togethercomputer/together-python

replicate
pip install replicate
npm install replicate
Replicate SDK. 300+ models: image, video, audio, LLM.
github.com/replicate/replicate-python

fal-client
pip install fal-client
npm install @fal-ai/client
fal.ai client. Image/video/audio fast inference.
github.com/fal-ai/fal-client-python

elevenlabs
pip install elevenlabs
npm install elevenlabs
ElevenLabs SDK. TTS, voice cloning, STT.
github.com/elevenlabs/elevenlabs-python

huggingface_hub
pip install huggingface_hub
npm install @huggingface/inference
HF Inference API. 90,000+ models.
github.com/huggingface/huggingface_hub

transformers
pip install transformers
—
HuggingFace Transformers. Run any model locally.
github.com/huggingface/transformers

diffusers
pip install diffusers
—
HuggingFace Diffusers. SD, FLUX, video models locally.
github.com/huggingface/diffusers

ollama
pip install ollama
npm install ollama
Ollama Python/JS client for local models.
github.com/ollama/ollama-python

openai (local)
—
—
OpenAI SDK works with any local server (Ollama, LM Studio, vLLM) by setting base_url=&apos;http://localhost:PORT/v1&apos; and api_key=&apos;none&apos;
—

litellm
pip install litellm
—
Universal SDK. One interface for 100+ providers. Route to any API.
github.com/BerriAI/litellm

deepseek (openai compat)
pip install openai
—
DeepSeek uses OpenAI SDK with base_url=&apos;https://api.deepseek.com&apos; and own API key.
platform.deepseek.com

instructor
pip install instructor
npm install @instructor-ai/instructor
Structured JSON output from any LLM. Works with any OpenAI-compat SDK.
github.com/jxnl/instructor

langchain
pip install langchain
npm install langchain
Orchestration framework. Works with every provider listed here.
github.com/langchain-ai/langchain

llama-index
pip install llama-index
npm install llamaindex
RAG and data pipeline framework. Any provider.
github.com/run-llama/llama_index

The OpenAI-Compatible Pattern
Over 90% of providers in this document accept the OpenAI SDK format. This means one piece of code routes to any provider:

from openai import OpenAI

# Google Gemini
client = OpenAI(api_key=&apos;YOUR_GEMINI_KEY&apos;, base_url=&apos;https://generativelanguage.googleapis.com/v1beta/openai/&apos;)

# Groq
client = OpenAI(api_key=&apos;YOUR_GROQ_KEY&apos;, base_url=&apos;https://api.groq.com/openai/v1&apos;)

# DeepSeek
client = OpenAI(api_key=&apos;YOUR_DEEPSEEK_KEY&apos;, base_url=&apos;https://api.deepseek.com&apos;)

# OpenRouter (29+ free models)
client = OpenAI(api_key=&apos;YOUR_OR_KEY&apos;, base_url=&apos;https://openrouter.ai/api/v1&apos;)

# Ollama (local, no key needed)
client = OpenAI(api_key=&apos;none&apos;, base_url=&apos;http://localhost:11434/v1&apos;)

All of the above use the exact same .chat.completions.create() call. Only the client setup changes.

SECTION 5 — WORKING CODE EXAMPLES

Copy-paste ready code for every major free provider. All tested against current APIs.

Google Gemini (Python) — Free, No Credit Card
pip install google-genai

from google import genai
client = genai.Client(api_key=&apos;YOUR_GEMINI_API_KEY&apos;)  # from aistudio.google.com
response = client.models.generate_content(
    model=&apos;gemini-2.5-flash&apos;,
    contents=&apos;Summarize AI trends in 2026&apos;
)
print(response.text)

Groq (Python) — Free, Fastest Inference
pip install groq

from groq import Groq
client = Groq(api_key=&apos;YOUR_GROQ_KEY&apos;)  # from console.groq.com
response = client.chat.completions.create(
    model=&apos;llama-3.3-70b-versatile&apos;,
    messages=[{&apos;role&apos;: &apos;user&apos;, &apos;content&apos;: &apos;Hello!&apos;}]
)
print(response.choices[0].message.content)

Hugging Face Inference API — FLUX Image Generation (Free)
pip install huggingface_hub

from huggingface_hub import InferenceClient
client = InferenceClient(api_key=&apos;YOUR_HF_TOKEN&apos;)  # from huggingface.co
image = client.text_to_image(
    prompt=&apos;A warrior in ancient Africa at sunrise, photorealistic&apos;,
    model=&apos;black-forest-labs/FLUX.1-dev&apos;
)
image.save(&apos;output.png&apos;)

OpenRouter (Python) — 29+ Free Models, One Key
pip install openai  # OpenRouter uses OpenAI-compatible SDK

from openai import OpenAI
client = OpenAI(
    api_key=&apos;YOUR_OPENROUTER_KEY&apos;,  # from openrouter.ai
    base_url=&apos;https://openrouter.ai/api/v1&apos;
)
response = client.chat.completions.create(
    model=&apos;deepseek/deepseek-r1:free&apos;,  # :free suffix = zero cost
    messages=[{&apos;role&apos;: &apos;user&apos;, &apos;content&apos;: &apos;Explain the Dead Sea Scrolls.&apos;}]
)
print(response.choices[0].message.content)

Ollama (Python) — Fully Local, Unlimited, No Key
# First: install Ollama from ollama.ai, then: ollama pull llama3.3
pip install ollama

import ollama
response = ollama.chat(
    model=&apos;llama3.3&apos;,
    messages=[{&apos;role&apos;: &apos;user&apos;, &apos;content&apos;: &apos;What is the Ge ez Orit?&apos;}]
)
print(response[&apos;message&apos;][&apos;content&apos;])

Cloudflare Workers AI (JavaScript) — Free Edge Inference
// In a Cloudflare Worker — free 10,000 neurons/day
export default {
  async fetch(request, env) {
    const response = await env.AI.run(
      &apos;@cf/meta/llama-3.3-70b-instruct-fp8-fast&apos;,
      { messages: [{ role: &apos;user&apos;, content: &apos;Hello&apos; }] }
    );
    return Response.json(response);
  }
};

LiteLLM (Python) — Route to Any Provider Transparently
pip install litellm

import litellm
# Switch provider by changing model string — code stays the same
response = litellm.completion(
    model=&apos;groq/llama-3.3-70b-versatile&apos;,   # or gemini/gemini-2.5-flash
    messages=[{&apos;role&apos;: &apos;user&apos;, &apos;content&apos;: &apos;Hello&apos;}]  # or gpt-4o, claude-sonnet-4-6
)
print(response.choices[0].message.content)

Replicate (Python) — Image/Video/Audio Free Credits
pip install replicate

import replicate  # API key from replicate.com, set REPLICATE_API_TOKEN
output = replicate.run(
    &apos;black-forest-labs/flux-schnell&apos;,
    input={&apos;prompt&apos;: &apos;Ancient Nile Valley at dawn, painted style&apos;}
)
print(output)  # URL to generated image

ElevenLabs TTS (Python) — Free 10K chars/month
pip install elevenlabs

from elevenlabs.client import ElevenLabs
from elevenlabs import play
client = ElevenLabs(api_key=&apos;YOUR_XI_KEY&apos;)  # from elevenlabs.io
audio = client.text_to_speech.convert(
    voice_id=&apos;21m00Tcm4TlvDq8ikWAM&apos;,
    text=&apos;This is a free tier voice generation.&apos;,
    model_id=&apos;eleven_flash_v2_5&apos;
)
play(audio)

Faster-Whisper STT (Python) — Local, Unlimited
pip install faster-whisper

from faster_whisper import WhisperModel
model = WhisperModel(&apos;large-v3&apos;, device=&apos;cpu&apos;, compute_type=&apos;int8&apos;)
segments, info = model.transcribe(&apos;audio.mp3&apos;, beam_size=5)
for segment in segments:
    print(f&apos;[{segment.start:.2f}s -&gt; {segment.end:.2f}s] {segment.text}&apos;)

SECTION 6 — STARTUP PROGRAMS: $1,000–$200,000 FREE

If you are building a product, these programs grant substantial credits far beyond the standard free tiers. These are legitimate programs directly from providers.
⚠ These require applications and may have eligibility criteria (early-stage startup, student, accelerator member, etc.)

Program
Credits Available
URL
How to Access

Google Cloud for Startups
$200,000 in GCP credits (incl. Vertex AI/Gemini)
cloud.google.com/startup
Apply via Google Cloud startup program.

Microsoft for Startups Founders Hub
$150,000 Azure credits + GitHub Copilot + OpenAI access
foundershub.startups.microsoft.com
Apply online. Includes Azure OpenAI Service.

AWS Activate
$100,000 in AWS credits (incl. Bedrock: Claude, Llama)
aws.amazon.com/activate
Apply. Higher tiers require VC backing or accelerator membership.

Anthropic Startup Program
$5,000-$50,000+ in Claude API credits
anthropic.com/startups
Apply through Anthropic site. Best for Claude-specific builds.

OpenAI Startup Fund
$2,500-$25,000 in OpenAI API credits
openai.com/startups
Apply through OpenAI. For companies building on GPT/DALL-E/Whisper.

Together AI Startup Accelerator
Up to $50,000 in credits
together.ai/startup
Best for open-source model fine-tuning and inference at scale.

xAI Free Credits (data sharing)
$150/month ongoing (requires $5 prior spend + data opt-in)
console.x.ai
Opt-in to data sharing to receive monthly recurring credits.

NVIDIA Inception Program
Extended NIM credits + GPU access
nvidia.com/en-us/startups
Apply to NVIDIA Inception for AI startups.

Hugging Face PRO
$9/month — not startup but cheapest paid tier for reliable inference
huggingface.co/pricing
Best low-cost upgrade from free tier. Eliminates cold starts.

SECTION 7 — PRIVACY &amp; DATA POLICY QUICK REFERENCE

Critical before sending any proprietary, personal, or sensitive data to any external API.

Provider
Free Tier Trains on Your Data?
Production Data Policy
Safest Option

Google AI Studio
YES on free tier — prompts may be used
Paid Vertex AI: no training on customer data
Use Vertex AI paid for production

Groq
NO — Groq does not train on API data
No data retention policy
Safe for development

Cerebras
NO
Does not train on prompts
Safe for development

Mistral (free tier)
YES — free tier prompts may train model
Paid tier: data processing agreement available
Paid tier for sensitive data

OpenRouter
Routes to third parties — varies by model
Check underlying provider&apos;s policy
Use direct provider for sensitive data

Hugging Face (free)
Varies by model — check each model card
HF PRO has cleaner terms
Check each model&apos;s card

Ollama / Local models
NO — data never leaves your machine
Complete privacy guaranteed
Best for sensitive/private data

vLLM / LM Studio / local
NO — fully offline capable
Complete privacy guaranteed
Best for sensitive/private data

OpenAI (paid)
NO on paid tier with DPA
Zero data retention available
Paid tier with DPA

Anthropic (paid)
NO on paid tier
Zero data retention option
Paid tier

ElevenLabs
Verify current policy at elevenlabs.io
Business tier has stricter privacy
Check current ToS

SECTION 8 — QUICK-PICK GUIDE

Which Free API for Which Task?

Task
Best Free API
Why
Signup

Text generation / LLM chat
Google AI Studio (Gemini 2.5 Flash)
1,500 req/day, no CC, frontier model, 1M context
aistudio.google.com

Fastest LLM inference
Groq
300-800 tokens/sec. Sub-100ms TTFT.
console.groq.com

Many different LLM models
OpenRouter
29+ free models via one key
openrouter.ai

LLM — fully local / private
Ollama + any open model
No key, no limit, no data sent
ollama.ai

Image generation — cloud
Hugging Face Spaces / FLUX Space
Free FLUX browser access
huggingface.co/spaces

Image generation — API
Pixazo API or HF Inference API
FLUX Schnell ~1.2s; no CC
pixazo.ai / huggingface.co

Image generation — local
ComfyUI + FLUX.1 [schnell]
Unlimited local. Apache 2.0.
github.com/comfyanonymous/ComfyUI

TTS voice generation — cloud
ElevenLabs (10K chars/month free)
Best cloud TTS quality. Ongoing free.
elevenlabs.io

TTS — local / unlimited
Chatterbox (MIT) or Kokoro
MIT license. No API call needed.
github.com/resemble-ai/chatterbox

Speech-to-text — cloud
Cloudflare Workers AI (Whisper)
Free 10K neurons/day includes Whisper
developers.cloudflare.com/workers-ai

Speech-to-text — local
Faster-Whisper or Whisper.cpp
CPU-capable. MIT license. No key.
github.com/SYSTRAN/faster-whisper

Video generation — API
ZSky AI (free anonymous tier)
1080p video API. No key required.
zsky.ai

Video generation — local
ComfyUI + WAN 2.2 or LTX-Video
No watermarks. Apache 2.0.
github.com/comfyanonymous/ComfyUI

Multi-modal: text+image+audio
Google AI Studio
All in one. Free. No CC.
aistudio.google.com

Embeddings for RAG
Cohere (1,000 calls/month)
Best free embedding + reranking pipeline
cohere.com

Route across all providers
LiteLLM
One Python SDK for 100+ providers
github.com/BerriAI/litellm

Music generation — local
Meta AudioCraft / MusicGen
MIT. No API needed.
github.com/facebookresearch/audiocraft

Best startup credit stack
Google + Microsoft + AWS + Anthropic
Stack all four programs: up to $375K+ total
See Section 6 above

Optimal Free Stack for Zero-Budget Developer

Daily LLM driver: Google AI Studio — 1,500 req/day, no CC, frontier model
Speed-critical LLM: Groq — sub-100ms, free, no CC
Model variety / comparison: OpenRouter — 29+ free models, one key
Local / private LLM: Ollama — no key, no limit, no data sent
Image generation API: Hugging Face Inference API — FLUX.1 free
Image generation local: ComfyUI + FLUX.1 [schnell] — unlimited
TTS cloud: ElevenLabs — 10K chars/month free, ongoing
TTS local: Chatterbox (MIT) — unlimited, no API
STT cloud: Cloudflare Workers AI Whisper — free neurons
STT local: Faster-Whisper — free, fast, MIT
Video API: ZSky AI — 1080p free anonymous
Video local: ComfyUI + WAN 2.2 — zero cost, no watermark
Routing layer: LiteLLM — switch providers in one line
Total cost: $0.00 for serious development workloads

END OF DOCUMENT — FREE AI API KEYS, SDKs &amp; INFERENCE PROVIDERS 2026