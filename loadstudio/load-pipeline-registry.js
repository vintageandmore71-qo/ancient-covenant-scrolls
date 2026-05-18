// load-pipeline-registry.js
// Shared pipeline registry for Load Studio, Load Eco, Load AI.
// window.LoadPipelineRegistry — 19 cinematic production pipelines.

(function () {
'use strict';

var _PIPELINES = [

  // 1. VN Editing Pipeline
  {
    pipelineId: 'vn-editing',
    pipelineName: 'VN Editing Pipeline',
    purpose: 'Core cinematic editing: clip strip, timeline, trim, text, music, export',
    outputType: 'video',
    status: 'INCLUDED',
    localVariant: true,
    cloudVariant: false,
    commercialSafe: true,
    whereUsed: ['Editing Bay'],
    orderedSteps: [
      { step: 1, name: 'Media In',       providers: ['canvas-api', 'web-audio-api', 'webcodecs'], required: true,  blocked: false },
      { step: 2, name: 'Timeline Edit',  providers: ['ffmpeg-wasm', 'canvas-api', 'web-audio-api'], required: true,  blocked: false },
      { step: 3, name: 'Text / Titles',  providers: ['canvas-api', 'fabricjs', 'google-fonts', 'bunny-fonts'], required: false, blocked: false },
      { step: 4, name: 'Music / SFX',    providers: ['pixabay-music', 'mixkit-sfx', 'freesound', 'musicgen'], required: false, blocked: false },
      { step: 5, name: 'Voice Track',    providers: ['browser-tts', 'kokoro', 'piper', 'xtts'], required: false, blocked: false },
      { step: 6, name: 'Export / Render',providers: ['ffmpeg-wasm', 'canvas-api', 'webcodecs'], required: true,  blocked: false }
    ],
    requiredSetup: 'None — all primary providers are browser-native or WASM.',
    optionalFallbacks: ['remotion'],
    blockedSteps: [],
    notes: 'Primary editing pipeline. Must remain touch-first, cinematic.'
  },

  // 2. VN Asset Browser Pipeline
  {
    pipelineId: 'vn-asset-browser',
    pipelineName: 'VN Asset Browser Pipeline',
    purpose: 'Browse and insert media assets (photos, video, stickers, fonts) into timeline',
    outputType: 'asset-reference',
    status: 'INCLUDED',
    localVariant: true,
    cloudVariant: true,
    commercialSafe: true,
    whereUsed: ['Editing Bay', 'Scene Workshop'],
    orderedSteps: [
      { step: 1, name: 'Query / Browse', providers: ['pexels', 'pixabay-stock', 'coverr', 'wikimedia', 'nasa-library'], required: true, blocked: false },
      { step: 2, name: 'Preview',        providers: ['canvas-api'], required: true, blocked: false },
      { step: 3, name: 'Download',       providers: ['file-api'], required: true, blocked: false },
      { step: 4, name: 'Timeline Insert',providers: ['ffmpeg-wasm', 'canvas-api'], required: true, blocked: false }
    ],
    requiredSetup: 'Pexels/Pixabay require free API keys. Others are keyless.',
    optionalFallbacks: ['internet-archive'],
    blockedSteps: [],
    notes: 'Asset browsers open as bottom drawer. No dev UI visible.'
  },

  // 3. Music/SFX VN Panel Pipeline
  {
    pipelineId: 'music-sfx-panel',
    pipelineName: 'Music / SFX VN Panel Pipeline',
    purpose: 'Search or generate music and SFX, preview, insert directly to timeline track',
    outputType: 'audio-clip',
    status: 'INCLUDED',
    localVariant: true,
    cloudVariant: true,
    commercialSafe: true,
    whereUsed: ['Editing Bay', 'Sound Stage'],
    orderedSteps: [
      { step: 1, name: 'Browse / Search',providers: ['pixabay-music', 'mixkit-sfx', 'freesound', 'incompetech', 'bensound', 'ccmixter', 'free-music-archive'], required: true, blocked: false },
      { step: 2, name: 'Preview',        providers: ['web-audio-api'], required: true, blocked: false },
      { step: 3, name: 'Timeline Insert',providers: ['web-audio-api', 'ffmpeg-wasm'], required: true, blocked: false }
    ],
    requiredSetup: 'Freesound requires free API key. Others are keyless.',
    optionalFallbacks: ['musicgen', 'audiogen', 'stable-audio-open', 'riffusion', 'vampnet', 'audiox', 'diffrhythm'],
    blockedSteps: [],
    notes: 'Music drawer stays chip-filter, flat list, direct Add.'
  },

  // 4. AI Image Glamour Pipeline
  {
    pipelineId: 'ai-image-glamour',
    pipelineName: 'AI Image Glamour Pipeline',
    purpose: 'High-quality character and scene image generation with identity consistency',
    outputType: 'image',
    status: 'CONNECTED',
    localVariant: true,
    cloudVariant: true,
    commercialSafe: false,
    whereUsed: ['AI Image Director', 'Character Lab', 'Scene Workshop'],
    orderedSteps: [
      { step: 1, name: 'Prompt Build',   providers: ['ollama', 'pollinations-text', 'openrouter', 'gemini'], required: false, blocked: false },
      { step: 2, name: 'Image Generate', providers: ['comfyui', 'a1111', 'forge', 'invokeai', 'draw-things', 'flux', 'sdxl', 'sd-15', 'sd-35', 'kandinsky', 'pixart', 'openjourney', 'hidream', 'juggernaut-xl', 'realvisxl', 'dreamshaper'], required: true, blocked: false },
      { step: 3, name: 'Identity Lock',  providers: ['ip-adapter', 'ip-adapter-faceid', 'instantid', 'photomaker', 'facechain'], required: false, blocked: false },
      { step: 4, name: 'Enhance',        providers: ['codeformer', 'real-esrgan', 'gfpgan'], required: false, blocked: false },
      { step: 5, name: 'Review / Use',   providers: ['canvas-api'], required: true, blocked: false }
    ],
    requiredSetup: 'Requires local SD UI (ComfyUI/A1111/etc.) or Draw Things on iPad.',
    optionalFallbacks: ['pollinations-image', 'aihorde', 'huggingface', 'mage-space', 'replicate'],
    blockedSteps: [],
    notes: 'Commercial safety depends on model license. Always verify before publish.'
  },

  // 5. Commercial-Safe Image Pipeline
  {
    pipelineId: 'commercial-image',
    pipelineName: 'Commercial-Safe Image Pipeline',
    purpose: 'Image generation using only providers cleared for commercial use',
    outputType: 'image',
    status: 'CONNECTED',
    localVariant: true,
    cloudVariant: true,
    commercialSafe: true,
    whereUsed: ['AI Image Director', 'Scene Workshop'],
    orderedSteps: [
      { step: 1, name: 'Prompt Build',   providers: ['pollinations-text', 'openrouter', 'gemini'], required: false, blocked: false },
      { step: 2, name: 'Image Generate', providers: ['pollinations-image', 'draw-things', 'aihorde'], required: true, blocked: false },
      { step: 3, name: 'Review / Use',   providers: ['canvas-api'], required: true, blocked: false }
    ],
    requiredSetup: 'Pollinations is keyless. Draw Things requires iPad app.',
    optionalFallbacks: ['aihorde', 'mage-space'],
    blockedSteps: [],
    notes: 'Use this pipeline when commercial publication is planned.'
  },

  // 6. Local ComfyUI Production Pipeline
  {
    pipelineId: 'comfyui-production',
    pipelineName: 'Local ComfyUI Production Pipeline',
    purpose: 'Full local workflow orchestration via ComfyUI: txt2img, img2img, IP-Adapter, ControlNet, upscale',
    outputType: 'image',
    status: 'CONNECTED',
    localVariant: true,
    cloudVariant: false,
    commercialSafe: false,
    whereUsed: ['AI Image Director', 'Character Lab'],
    orderedSteps: [
      { step: 1, name: 'Workflow Build', providers: ['comfyui'], required: true, blocked: false },
      { step: 2, name: 'IP-Adapter',     providers: ['ip-adapter', 'ip-adapter-faceid'], required: false, blocked: false },
      { step: 3, name: 'ControlNet',     providers: ['controlnet', 'controlnet-flux'], required: false, blocked: false },
      { step: 4, name: 'Generate',       providers: ['comfyui'], required: true, blocked: false },
      { step: 5, name: 'Upscale',        providers: ['real-esrgan', 'seedvr2'], required: false, blocked: false },
      { step: 6, name: 'Review / Use',   providers: ['canvas-api'], required: true, blocked: false }
    ],
    requiredSetup: 'Requires local ComfyUI server with appropriate model checkpoints.',
    optionalFallbacks: ['a1111', 'forge'],
    blockedSteps: [],
    notes: 'Not available on iPad directly — needs Mac/PC server on LAN.'
  },

  // 7. OpenAI-Compatible Routing Pipeline
  {
    pipelineId: 'openai-compat-routing',
    pipelineName: 'OpenAI-Compatible Routing Pipeline',
    purpose: 'Route LLM/TTS/image requests through OpenAI-compatible APIs with fallback chains',
    outputType: 'mixed',
    status: 'CONNECTED',
    localVariant: true,
    cloudVariant: true,
    commercialSafe: true,
    whereUsed: ['Developer Lab', 'AI Image Director', 'Voice Studio'],
    orderedSteps: [
      { step: 1, name: 'Request',        providers: ['litellm', 'openrouter', 'lm-studio'], required: true, blocked: false },
      { step: 2, name: 'Route',          providers: ['litellm', 'openrouter'], required: true, blocked: false },
      { step: 3, name: 'Provider Call',  providers: ['ollama', 'localai', 'vllm', 'tgi', 'openai', 'groq', 'cerebras', 'sambanova', 'nvidia-nim', 'fireworks-ai', 'aiml-api', 'gemini', 'together-ai', 'deepinfra'], required: true, blocked: false },
      { step: 4, name: 'Fallback',       providers: ['pollinations-text', 'openrouter'], required: false, blocked: false }
    ],
    requiredSetup: 'LiteLLM or OpenRouter API key recommended. Ollama/LocalAI need local server.',
    optionalFallbacks: ['pollinations-text'],
    blockedSteps: [],
    notes: 'LiteLLM is the recommended proxy layer. OpenRouter for cloud fallback. Gemini uses generateContent endpoint.'
  },

  // 8. Local / Self-Hosted AI Pipeline
  {
    pipelineId: 'local-selfhosted-ai',
    pipelineName: 'Local / Self-Hosted AI Pipeline',
    purpose: 'All AI tasks routed through local servers only. No cloud calls.',
    outputType: 'mixed',
    status: 'CONNECTED',
    localVariant: true,
    cloudVariant: false,
    commercialSafe: true,
    whereUsed: ['Developer Lab', 'AI Image Director', 'Voice Studio', 'Sound Stage'],
    orderedSteps: [
      { step: 1, name: 'LLM',            providers: ['ollama', 'lm-studio', 'localai', 'vllm', 'tgi', 'jan', 'koboldcpp', 'llama-cpp'], required: false, blocked: false },
      { step: 2, name: 'Image Gen',      providers: ['comfyui', 'a1111', 'forge', 'fooocus', 'invokeai', 'sdnext', 'draw-things', 'diffusionbee', 'flux', 'sdxl', 'sd-15', 'sd-35', 'kandinsky', 'pixart'], required: false, blocked: false },
      { step: 3, name: 'TTS',            providers: ['kokoro', 'piper', 'xtts', 'chatterbox', 'bark', 'openvoice', 'dia', 'f5-tts', 'orpheus', 'voxtral', 'neutts-air', 'tortoise-tts', 'valle-x', 'styletts2', 'vits', 'emotivoice', 'kokoclone', 'voicebox-app', 'coqui'], required: false, blocked: false },
      { step: 4, name: 'STT',            providers: ['whisper-wasm', 'vosk', 'moonshine', 'faster-whisper', 'whisper-v3-turbo', 'distil-whisper', 'ibm-granite-speech', 'nvidia-parakeet', 'speechbrain', 'nemo-asr', 'paddlespeech', 'kaldi', 'espnet-asr', 'julius'], required: false, blocked: false },
      { step: 5, name: 'Video Gen',      providers: ['wan', 'hunyuanvideo', 'ltx-video', 'open-sora', 'cogvideox', 'animatediff', 'i2vgen-xl', 'modelscope-t2v', 'videocrafter2', 'show-1', 'seine', 'motiondirector'], required: false, blocked: false },
      { step: 6, name: 'Audio Gen',      providers: ['musicgen', 'audiogen', 'stable-audio-open', 'diffrhythm', 'vampnet', 'audiox', 'encodec', 'hunyuanvideo-foley'], required: false, blocked: false }
    ],
    requiredSetup: 'Each local server must be running. iPad connects over LAN.',
    optionalFallbacks: [],
    blockedSteps: [],
    notes: 'Privacy-first pipeline. No data leaves the local network.'
  },

  // 9. TTS / Voice Pipeline
  {
    pipelineId: 'tts-voice',
    pipelineName: 'TTS / Voice Pipeline',
    purpose: 'Text to spoken audio, character voice assignment, voice track insert',
    outputType: 'audio',
    status: 'INCLUDED',
    localVariant: true,
    cloudVariant: true,
    commercialSafe: true,
    whereUsed: ['Voice Studio', 'Casting Department', 'Editing Bay'],
    orderedSteps: [
      { step: 1, name: 'Text In',        providers: ['browser-tts'], required: true,  blocked: false },
      { step: 2, name: 'Synthesize',     providers: ['browser-tts', 'kokoro', 'piper', 'f5-tts', 'chatterbox-turbo', 'higgs-audio', 'voxtral', 'neutts-air', 'tortoise-tts', 'valle-x', 'styletts2', 'vits', 'emotivoice', 'kokoclone', 'voicebox-app', 'esptts', 'coqui'], required: true, blocked: false },
      { step: 3, name: 'Preview',        providers: ['web-audio-api'], required: true, blocked: false },
      { step: 4, name: 'Timeline Insert',providers: ['ffmpeg-wasm', 'web-audio-api'], required: true, blocked: false }
    ],
    requiredSetup: 'Browser TTS requires no setup. Local TTS needs endpoint.',
    optionalFallbacks: ['openvoice', 'xtts', 'bark', 'dia', 'orpheus', 'melo-tts', 'elevenlabs'],
    blockedSteps: [],
    notes: 'Browser TTS is always-available fallback. Local TTS for higher quality.'
  },

  // 10. STT / Subtitle Pipeline
  {
    pipelineId: 'stt-subtitle',
    pipelineName: 'STT / Subtitle Pipeline',
    purpose: 'Audio to transcription, subtitle file generation, subtitle track insert',
    outputType: 'subtitle-track',
    status: 'INCLUDED',
    localVariant: true,
    cloudVariant: false,
    commercialSafe: true,
    whereUsed: ['Voice Studio', 'Sound Stage', 'Editing Bay'],
    orderedSteps: [
      { step: 1, name: 'Audio In',       providers: ['web-audio-api', 'file-api'], required: true, blocked: false },
      { step: 2, name: 'Transcribe',     providers: ['whisper-wasm', 'vosk', 'moonshine', 'whisper-v3-turbo', 'distil-whisper', 'ibm-granite-speech', 'nvidia-parakeet', 'speechbrain', 'nemo-asr', 'paddlespeech', 'julius', 'pocketsphinx', 'kaldi', 'espnet-asr'], required: true, blocked: false },
      { step: 3, name: 'Parse / Format', providers: ['canvas-api'], required: true, blocked: false },
      { step: 4, name: 'Subtitle Insert',providers: ['ffmpeg-wasm', 'canvas-api'], required: true, blocked: false }
    ],
    requiredSetup: 'Whisper WASM loads model on first use. Vosk/Moonshine same.',
    optionalFallbacks: ['faster-whisper', 'whisperx', 'nvidia-canary', 'qwen3-asr', 'pyannote'],
    blockedSteps: [],
    notes: 'All primary providers are fully offline and commercial-safe.'
  },

  // 11. Music / Audio Generation Pipeline
  {
    pipelineId: 'music-audio-gen',
    pipelineName: 'Music / Audio Generation Pipeline',
    purpose: 'Generate original music or SFX via AI, insert to timeline',
    outputType: 'audio',
    status: 'CONNECTED',
    localVariant: true,
    cloudVariant: false,
    commercialSafe: false,
    whereUsed: ['Sound Stage', 'Editing Bay'],
    orderedSteps: [
      { step: 1, name: 'Prompt Build',   providers: ['ollama', 'pollinations-text', 'gemini'], required: false, blocked: false },
      { step: 2, name: 'Audio Generate', providers: ['musicgen', 'audiogen', 'stable-audio-open', 'diffrhythm', 'riffusion', 'vampnet', 'audiox', 'encodec', 'hunyuanvideo-foley', 'moises', 'melodfy'], required: true, blocked: false },
      { step: 3, name: 'Preview',        providers: ['web-audio-api'], required: true, blocked: false },
      { step: 4, name: 'Timeline Insert',providers: ['web-audio-api', 'ffmpeg-wasm'], required: true, blocked: false }
    ],
    requiredSetup: 'MusicGen/AudioGen need local Gradio or AudioCraft server.',
    optionalFallbacks: ['riffusion', 'basic-pitch', 'spleeter', 'demucs'],
    blockedSteps: [],
    notes: 'Commercial license varies by model. Verify before publishing.'
  },

  // 12. AI Video Pipeline
  {
    pipelineId: 'ai-video',
    pipelineName: 'AI Video Pipeline',
    purpose: 'Prompt or image to short video clip, insert to timeline',
    outputType: 'video-clip',
    status: 'CONNECTED',
    localVariant: true,
    cloudVariant: false,
    commercialSafe: false,
    whereUsed: ['Scene Workshop', 'Editing Bay'],
    orderedSteps: [
      { step: 1, name: 'Prompt / Image', providers: ['pollinations-image', 'comfyui', 'canvas-api'], required: true, blocked: false },
      { step: 2, name: 'Video Generate', providers: ['ltx-video', 'wan', 'hunyuanvideo', 'cogvideox', 'animatediff', 'i2vgen-xl', 'modelscope-t2v', 'videocrafter2', 'show-1', 'seine', 'motiondirector'], required: true, blocked: false },
      { step: 3, name: 'Review',         providers: ['canvas-api'], required: true, blocked: false },
      { step: 4, name: 'Timeline Insert',providers: ['ffmpeg-wasm', 'canvas-api'], required: true, blocked: false }
    ],
    requiredSetup: 'Requires local video gen server. High VRAM GPU recommended.',
    optionalFallbacks: ['open-sora', 'mochi', 'dynamicrafter'],
    blockedSteps: [
      { step: 2, provider: 'stable-video-diffusion', reason: 'Non-commercial license' },
      { step: 2, provider: 'dynamicrafter', reason: 'Non-commercial license' }
    ],
    notes: 'LTX-Video is the recommended commercial-safe local option.'
  },

  // 13. Lip Sync / Avatar Pipeline
  {
    pipelineId: 'lip-sync-avatar',
    pipelineName: 'Lip Sync / Avatar Pipeline',
    purpose: 'Portrait image plus audio to animated lip-synced character clip',
    outputType: 'video-clip',
    status: 'CONNECTED',
    localVariant: true,
    cloudVariant: true,
    commercialSafe: false,
    whereUsed: ['Character Lab', 'Voice Studio'],
    orderedSteps: [
      { step: 1, name: 'Portrait In',    providers: ['file-api', 'canvas-api'], required: true, blocked: false },
      { step: 2, name: 'Audio In',       providers: ['browser-tts', 'kokoro', 'file-api'], required: true, blocked: false },
      { step: 3, name: 'Lip Sync',       providers: ['musetalk', 'liveportrait', 'omnihuman', 'geneface-pp', 'latentsync', 'lipgan', 'makeitalk', 'talkinghead3d', 'wav2lip-hd'], required: true, blocked: false },
      { step: 4, name: 'Review',         providers: ['canvas-api'], required: true, blocked: false },
      { step: 5, name: 'Timeline Insert',providers: ['ffmpeg-wasm'], required: true, blocked: false }
    ],
    requiredSetup: 'Requires local MuseTalk or LivePortrait server.',
    optionalFallbacks: ['videoretalk', 'heygen'],
    blockedSteps: [
      { step: 3, provider: 'wav2lip', reason: 'Non-commercial research license' },
      { step: 3, provider: 'sadtalker', reason: 'Non-commercial research license' }
    ],
    notes: 'Use MuseTalk for commercial projects — license check required. HeyGen is cloud only.'
  },

  // 14. CinePWA Package Pipeline
  {
    pipelineId: 'cinepwa-package',
    pipelineName: 'CinePWA Package Pipeline',
    purpose: 'Render finished project to a CinePWA offline package (.owa / zip)',
    outputType: 'cinepwa-package',
    status: 'INCLUDED',
    localVariant: true,
    cloudVariant: false,
    commercialSafe: true,
    whereUsed: ['Export Office'],
    orderedSteps: [
      { step: 1, name: 'Finalize',       providers: ['ffmpeg-wasm', 'canvas-api'], required: true, blocked: false },
      { step: 2, name: 'Assets Bundle',  providers: ['file-api', 'indexeddb'], required: true, blocked: false },
      { step: 3, name: 'Manifest Build', providers: ['canvas-api'], required: true, blocked: false },
      { step: 4, name: 'Zip / Package',  providers: ['ffmpeg-wasm', 'file-api'], required: true, blocked: false },
      { step: 5, name: 'Output / Share', providers: ['file-api'], required: true, blocked: false }
    ],
    requiredSetup: 'None — fully browser-side.',
    optionalFallbacks: [],
    blockedSteps: [],
    notes: 'Package must never include API keys or auth tokens.'
  },

  // 15. Load Play Publishing Pipeline
  {
    pipelineId: 'load-play-publish',
    pipelineName: 'Load Play Publishing Pipeline',
    purpose: 'Prepare and upload finished production to Load Play for streaming',
    outputType: 'streaming-publish',
    status: 'CONNECTED',
    localVariant: false,
    cloudVariant: true,
    commercialSafe: true,
    whereUsed: ['Export Office', 'Marketplace'],
    orderedSteps: [
      { step: 1, name: 'Export',         providers: ['ffmpeg-wasm', 'canvas-api'], required: true, blocked: false },
      { step: 2, name: 'Metadata Build', providers: ['canvas-api'], required: true, blocked: false },
      { step: 3, name: 'Save Draft',     providers: ['indexeddb', 'supabase'], required: true, blocked: false },
      { step: 4, name: 'Upload',         providers: ['supabase'], required: true, blocked: false },
      { step: 5, name: 'Publish',        providers: ['supabase'], required: true, blocked: false }
    ],
    requiredSetup: 'Supabase project and account required for upload/publish.',
    optionalFallbacks: ['peertube', 'mediacms', 'owncast'],
    blockedSteps: [],
    notes: 'Draft save to IndexedDB is always available offline.'
  },

  // 16. Hosted Video Platform Pipeline
  {
    pipelineId: 'hosted-video-platform',
    pipelineName: 'Hosted Video Platform Pipeline',
    purpose: 'Route video generation to cloud hosted providers when local GPU is unavailable',
    outputType: 'video-clip',
    status: 'DECLARED',
    localVariant: false,
    cloudVariant: true,
    commercialSafe: false,
    whereUsed: ['Scene Workshop', 'Editing Bay'],
    orderedSteps: [
      { step: 1, name: 'Prompt Build',   providers: ['pollinations-text', 'openrouter', 'gemini'], required: false, blocked: false },
      { step: 2, name: 'Video Generate', providers: ['kling', 'hailuo', 'pika', 'dreamina', 'pixverse', 'luma-dream'], required: true, blocked: false },
      { step: 3, name: 'Poll / Retrieve',providers: ['canvas-api'], required: true, blocked: false },
      { step: 4, name: 'Review',         providers: ['canvas-api'], required: true, blocked: false },
      { step: 5, name: 'Timeline Insert',providers: ['ffmpeg-wasm', 'canvas-api'], required: true, blocked: false }
    ],
    requiredSetup: 'Each provider requires separate account and API key. Async job polling required.',
    optionalFallbacks: ['heygen'],
    blockedSteps: [],
    notes: 'All providers are cloud subscription. Commercial terms vary — verify before publishing.'
  },

  // 17. Aggregator Routing Pipeline
  {
    pipelineId: 'aggregator-routing',
    pipelineName: 'Aggregator Routing Pipeline',
    purpose: 'Route image and media generation through aggregator APIs with unified fallback',
    outputType: 'mixed',
    status: 'DECLARED',
    localVariant: false,
    cloudVariant: true,
    commercialSafe: false,
    whereUsed: ['AI Image Director', 'Developer Lab'],
    orderedSteps: [
      { step: 1, name: 'Request',        providers: ['wavespeedai', 'getimgai', 'atlas-cloud', 'replicate'], required: true, blocked: false },
      { step: 2, name: 'Model Select',   providers: ['wavespeedai', 'getimgai', 'atlas-cloud', 'replicate'], required: true, blocked: false },
      { step: 3, name: 'Generate',       providers: ['wavespeedai', 'getimgai', 'atlas-cloud', 'replicate'], required: true, blocked: false },
      { step: 4, name: 'Retrieve',       providers: ['canvas-api', 'file-api'], required: true, blocked: false }
    ],
    requiredSetup: 'Each aggregator requires API key. WaveSpeedAI and GetIMG have free tiers.',
    optionalFallbacks: ['pollinations-image', 'aihorde'],
    blockedSteps: [],
    notes: 'Aggregators expose many models under one API. Useful when local GPU is absent.'
  },

  // 18. Video Editor Tools Pipeline
  {
    pipelineId: 'video-editor-tools',
    pipelineName: 'Video Editor Tools Pipeline',
    purpose: 'Route editing operations through local or browser-based video editor tools',
    outputType: 'video',
    status: 'DECLARED',
    localVariant: true,
    cloudVariant: false,
    commercialSafe: true,
    whereUsed: ['Editing Bay', 'Export Office'],
    orderedSteps: [
      { step: 1, name: 'Media In',       providers: ['file-api', 'ffmpeg-wasm'], required: true, blocked: false },
      { step: 2, name: 'Edit',           providers: ['ffmpeg-wasm', 'auto-editor', 'losslesscut', 'kdenlive', 'openshot', 'shotcut', 'openmontage', 'voidcut', 'cineshader'], required: true, blocked: false },
      { step: 3, name: 'Enhance',        providers: ['real-esrgan', 'codeformer'], required: false, blocked: false },
      { step: 4, name: 'Export',         providers: ['ffmpeg-wasm', 'webcodecs', 'file-api'], required: true, blocked: false }
    ],
    requiredSetup: 'FFmpeg.wasm runs in browser. Desktop editors require local install.',
    optionalFallbacks: ['moneyprinterturbo', 'twick', 'designcombo'],
    blockedSteps: [],
    notes: 'Browser-native (FFmpeg.wasm/LosslessCut) preferred for iPad. Desktop editors for Mac/PC only.'
  },

  // 19. Director AI Production Pipeline
  {
    pipelineId: 'director-ai',
    pipelineName: 'Director AI Production Pipeline',
    purpose: 'Orchestrate multi-step AI scene production: image, video, voice, SFX, lip sync with continuity checks',
    outputType: 'scene-production',
    status: 'DECLARED',
    localVariant: true,
    cloudVariant: true,
    commercialSafe: false,
    whereUsed: ['Scene Workshop', 'AI Image Director', 'Voice Studio', 'Editing Bay'],
    orderedSteps: [
      { step: 1, name: 'Script / Prompt',providers: ['ollama', 'openrouter', 'gemini', 'pollinations-text'], required: true, blocked: false },
      { step: 2, name: 'Character Image',providers: ['comfyui', 'a1111', 'flux', 'sdxl', 'ip-adapter-faceid', 'instantid'], required: true, blocked: false },
      { step: 3, name: 'Scene Image',    providers: ['comfyui', 'a1111', 'pollinations-image', 'controlnet'], required: true, blocked: false },
      { step: 4, name: 'Voice Gen',      providers: ['kokoro', 'f5-tts', 'piper', 'xtts', 'chatterbox', 'browser-tts'], required: true, blocked: false },
      { step: 5, name: 'Image to Video', providers: ['ltx-video', 'wan', 'i2vgen-xl', 'liveportrait', 'musetalk'], required: false, blocked: false },
      { step: 6, name: 'SFX Generate',   providers: ['audiogen', 'audiox', 'hunyuanvideo-foley'], required: false, blocked: false },
      { step: 7, name: 'Continuity Check', providers: ['canvas-api', 'ollama', 'gemini'], required: false, blocked: false },
      { step: 8, name: 'Assemble',       providers: ['ffmpeg-wasm', 'canvas-api', 'web-audio-api'], required: true, blocked: false }
    ],
    requiredSetup: 'Requires at least one local image gen and one TTS provider. GPU recommended.',
    optionalFallbacks: ['pollinations-image', 'pollinations-text', 'browser-tts'],
    blockedSteps: [],
    notes: 'READY requires proof: real asset returned at each step. Never mark READY without verification.'
  }

];

// ─── PUBLIC API ───────────────────────────────────────────────────────────────
var LoadPipelineRegistry = {

  listPipelines: function () {
    return _PIPELINES.map(function (p) { return Object.assign({}, p); });
  },

  getPipeline: function (pipelineId) {
    var p = _PIPELINES.filter(function (p) { return p.pipelineId === pipelineId; })[0];
    return p ? Object.assign({}, p) : null;
  },

  listByOutput: function (outputType) {
    return _PIPELINES.filter(function (p) { return p.outputType === outputType; });
  },

  listCommercialSafe: function () {
    return _PIPELINES.filter(function (p) { return p.commercialSafe; });
  },

  listLocal: function () {
    return _PIPELINES.filter(function (p) { return p.localVariant; });
  },

  getProvidersForPipeline: function (pipelineId) {
    var p = this.getPipeline(pipelineId);
    if (!p) return [];
    var out = [];
    (p.orderedSteps || []).forEach(function (s) {
      (s.providers || []).forEach(function (id) {
        if (out.indexOf(id) < 0) out.push(id);
      });
    });
    return out;
  },

  getPipelineMembership: function (providerId) {
    return _PIPELINES.filter(function (p) {
      return (p.orderedSteps || []).some(function (s) {
        return (s.providers || []).indexOf(providerId) >= 0;
      });
    }).map(function (p) { return p.pipelineId; });
  }
};

window.LoadPipelineRegistry = LoadPipelineRegistry;

})();
