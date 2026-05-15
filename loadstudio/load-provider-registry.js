// load-provider-registry.js
// Shared provider registry for Load Studio, Load Eco, Load AI.
// window.LoadProviderRegistry — never exports API keys or tokens.
// Keys stored in localStorage only. Status never set READY without a real test.

(function () {
'use strict';

var _STORAGE_KEY = 'lpr_settings_v1';
var _STATUS_KEY  = 'lpr_status_v1';

// Runtime state — keys never leave this scope
var _settings = {};  // { providerId: { apiKey, endpoint, model, ... } }
var _status   = {};  // { providerId: 'untested'|'testing'|'ok'|'error'|'needs-key'|'needs-endpoint' }

// ─── PROVIDER DEFINITIONS ────────────────────────────────────────────────────
// Every provider must declare all required fields.
var _PROVIDERS = [

  // ── Editing / Timeline ────────────────────────────────────────────────────
  {
    providerId: 'ffmpeg-wasm',
    name: 'FFmpeg.wasm',
    category: 'editing',
    capabilities: ['video-encode','video-decode','audio-encode','audio-decode','trim','merge','export'],
    accessType: 'wasm',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://ffmpegwasm.netlify.app',
    usedIn: ['Editing Bay','Export Office','Sound Stage']
  },
  {
    providerId: 'web-audio-api',
    name: 'Web Audio API',
    category: 'editing',
    capabilities: ['audio-playback','audio-analysis','waveform'],
    accessType: 'browser-api',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'none',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API',
    usedIn: ['Editing Bay','Sound Stage']
  },
  {
    providerId: 'canvas-api',
    name: 'Canvas API',
    category: 'editing',
    capabilities: ['compositing','frame-render','thumbnail'],
    accessType: 'browser-api',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'none',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API',
    usedIn: ['Editing Bay','Scene Workshop']
  },
  {
    providerId: 'webcodecs',
    name: 'WebCodecs',
    category: 'editing',
    capabilities: ['video-decode','video-encode','frame-extract'],
    accessType: 'browser-api',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'none',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API',
    usedIn: ['Editing Bay']
  },
  {
    providerId: 'remotion',
    name: 'Remotion',
    category: 'editing',
    capabilities: ['programmatic-video','react-render'],
    accessType: 'wasm',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'medium',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://remotion.dev',
    usedIn: ['Export Office']
  },

  // ── Canvas / Layers ───────────────────────────────────────────────────────
  {
    providerId: 'fabricjs',
    name: 'Fabric.js',
    category: 'canvas',
    capabilities: ['canvas-objects','layers','pip','stickers','text-overlay'],
    accessType: 'wasm',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'http://fabricjs.com',
    usedIn: ['Editing Bay','Scene Workshop','Look Lab']
  },

  // ── Animation ─────────────────────────────────────────────────────────────
  {
    providerId: 'gsap',
    name: 'GSAP',
    category: 'animation',
    capabilities: ['timeline-animation','css-animation','svg-animation'],
    accessType: 'wasm',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'medium',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://gsap.com',
    usedIn: ['Editing Bay','Scene Workshop']
  },
  {
    providerId: 'lottiefiles',
    name: 'LottieFiles',
    category: 'titles-stickers',
    capabilities: ['animated-stickers','animated-titles','lottie-render'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://lottiefiles.com/featured',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://lottiefiles.com',
    usedIn: ['Editing Bay','Scene Workshop','Look Lab']
  },

  // ── Background Removal ────────────────────────────────────────────────────
  {
    providerId: 'mediapipe',
    name: 'MediaPipe',
    category: 'background-removal',
    capabilities: ['background-removal','segmentation','pose'],
    accessType: 'wasm',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://mediapipe.dev',
    usedIn: ['Character Lab','Look Lab','Editing Bay']
  },
  {
    providerId: 'bg-removal-js',
    name: 'background-removal-js',
    category: 'background-removal',
    capabilities: ['background-removal'],
    accessType: 'wasm',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://github.com/imgly/background-removal-js',
    usedIn: ['Character Lab','Look Lab']
  },

  // ── STT / Captions ────────────────────────────────────────────────────────
  {
    providerId: 'whisper-wasm',
    name: 'Whisper.cpp (WASM)',
    category: 'stt',
    capabilities: ['speech-to-text','subtitles','transcription'],
    accessType: 'wasm',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/ggerganov/whisper.cpp',
    usedIn: ['Voice Studio','Editing Bay','Sound Stage']
  },
  {
    providerId: 'vosk',
    name: 'Vosk',
    category: 'stt',
    capabilities: ['speech-to-text','subtitles','offline-transcription'],
    accessType: 'wasm',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://alphacephei.com/vosk',
    usedIn: ['Voice Studio','Sound Stage']
  },
  {
    providerId: 'moonshine',
    name: 'Moonshine',
    category: 'stt',
    capabilities: ['speech-to-text','fast-transcription'],
    accessType: 'wasm',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://github.com/usefulsensors/moonshine',
    usedIn: ['Voice Studio']
  },
  {
    providerId: 'faster-whisper',
    name: 'Faster-Whisper',
    category: 'stt',
    capabilities: ['speech-to-text','subtitles'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:8000',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://github.com/SYSTRAN/faster-whisper',
    usedIn: ['Voice Studio','Sound Stage']
  },

  // ── TTS / Voice ───────────────────────────────────────────────────────────
  {
    providerId: 'browser-tts',
    name: 'Browser Speech',
    category: 'tts',
    capabilities: ['text-to-speech','voice-preview'],
    accessType: 'browser-api',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'send-to-server',
    licenseRisk: 'none',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis',
    usedIn: ['Voice Studio','Casting Department']
  },
  {
    providerId: 'kokoro',
    name: 'Kokoro',
    category: 'tts',
    capabilities: ['text-to-speech','high-quality-voice'],
    accessType: 'wasm',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://github.com/hexgrad/kokoro',
    usedIn: ['Voice Studio','Character Lab']
  },
  {
    providerId: 'chatterbox',
    name: 'Chatterbox',
    category: 'tts',
    capabilities: ['text-to-speech','voice-clone'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://github.com/resemble-ai/chatterbox',
    usedIn: ['Voice Studio']
  },
  {
    providerId: 'xtts',
    name: 'XTTS',
    category: 'tts',
    capabilities: ['text-to-speech','voice-clone','multilingual'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:8020',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://github.com/coqui-ai/TTS',
    usedIn: ['Voice Studio']
  },
  {
    providerId: 'piper',
    name: 'Piper',
    category: 'tts',
    capabilities: ['text-to-speech','fast-local'],
    accessType: 'wasm',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://github.com/rhasspy/piper',
    usedIn: ['Voice Studio']
  },
  {
    providerId: 'bark',
    name: 'Bark',
    category: 'tts',
    capabilities: ['text-to-speech','expressive-voice'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/suno-ai/bark',
    usedIn: ['Voice Studio']
  },
  {
    providerId: 'openvoice',
    name: 'OpenVoice',
    category: 'tts',
    capabilities: ['text-to-speech','voice-clone'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/myshell-ai/OpenVoice',
    usedIn: ['Voice Studio']
  },
  {
    providerId: 'dia',
    name: 'Dia',
    category: 'tts',
    capabilities: ['text-to-speech','dialogue-generation'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/nari-labs/dia',
    usedIn: ['Voice Studio']
  },
  {
    providerId: 'elevenlabs',
    name: 'ElevenLabs',
    category: 'tts',
    capabilities: ['text-to-speech','voice-clone','high-quality-voice'],
    accessType: 'paid-api-key',
    requiresApiKey: true,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://api.elevenlabs.io/v1',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://elevenlabs.io',
    usedIn: ['Voice Studio']
  },

  // ── Music Libraries ───────────────────────────────────────────────────────
  {
    providerId: 'pixabay-music',
    name: 'Pixabay Music',
    category: 'music-library',
    capabilities: ['music-search','music-download'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://pixabay.com/music',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://pixabay.com/music',
    usedIn: ['Editing Bay','Sound Stage']
  },
  {
    providerId: 'free-music-archive',
    name: 'Free Music Archive',
    category: 'music-library',
    capabilities: ['music-search','music-download'],
    accessType: 'free-api-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://freemusicarchive.org/api',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://freemusicarchive.org',
    usedIn: ['Editing Bay','Sound Stage']
  },
  {
    providerId: 'ccmixter',
    name: 'ccMixter',
    category: 'music-library',
    capabilities: ['music-search','remixable-music'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'http://ccmixter.org/api',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'http://ccmixter.org',
    usedIn: ['Editing Bay','Sound Stage']
  },
  {
    providerId: 'incompetech',
    name: 'Incompetech',
    category: 'music-library',
    capabilities: ['music-search','royalty-free-music'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://incompetech.com',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://incompetech.com',
    usedIn: ['Editing Bay','Sound Stage']
  },
  {
    providerId: 'bensound',
    name: 'Bensound',
    category: 'music-library',
    capabilities: ['music-search','royalty-free-music'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://www.bensound.com',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://www.bensound.com',
    usedIn: ['Editing Bay','Sound Stage']
  },
  {
    providerId: 'yt-audio-library',
    name: 'YouTube Audio Library',
    category: 'music-library',
    capabilities: ['music-search','royalty-free-music'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://studio.youtube.com/channel/music',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://studio.youtube.com/channel/music',
    usedIn: ['Sound Stage']
  },

  // ── Sound FX Libraries ────────────────────────────────────────────────────
  {
    providerId: 'freesound',
    name: 'Freesound',
    category: 'sfx-library',
    capabilities: ['sfx-search','sfx-download'],
    accessType: 'free-api-key',
    requiresApiKey: true,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://freesound.org/apiv2',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://freesound.org',
    usedIn: ['Editing Bay','Sound Stage']
  },
  {
    providerId: 'zapsplat',
    name: 'ZapSplat',
    category: 'sfx-library',
    capabilities: ['sfx-search','sfx-download'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://www.zapsplat.com',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://www.zapsplat.com',
    usedIn: ['Editing Bay','Sound Stage']
  },
  {
    providerId: 'bbc-sfx',
    name: 'BBC Sound Effects',
    category: 'sfx-library',
    capabilities: ['sfx-search','sfx-download'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://sound-effects.bbcrewind.co.uk',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'medium',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://sound-effects.bbcrewind.co.uk',
    usedIn: ['Editing Bay','Sound Stage']
  },
  {
    providerId: 'mixkit-sfx',
    name: 'Mixkit SFX',
    category: 'sfx-library',
    capabilities: ['sfx-search','sfx-download'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://mixkit.co/free-sound-effects',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://mixkit.co/free-sound-effects',
    usedIn: ['Editing Bay','Sound Stage']
  },
  {
    providerId: 'soundbible',
    name: 'SoundBible',
    category: 'sfx-library',
    capabilities: ['sfx-search','sfx-download'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://soundbible.com',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://soundbible.com',
    usedIn: ['Editing Bay','Sound Stage']
  },

  // ── Music / Audio Generation ──────────────────────────────────────────────
  {
    providerId: 'musicgen',
    name: 'MusicGen',
    category: 'music-generation',
    capabilities: ['music-generation','ai-audio'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/facebookresearch/audiocraft',
    usedIn: ['Sound Stage','Editing Bay']
  },
  {
    providerId: 'audiogen',
    name: 'AudioGen',
    category: 'music-generation',
    capabilities: ['sfx-generation','ai-audio'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/facebookresearch/audiocraft',
    usedIn: ['Sound Stage']
  },
  {
    providerId: 'riffusion',
    name: 'Riffusion',
    category: 'music-generation',
    capabilities: ['music-generation','spectrogram-diffusion'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:3013',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/riffusion/riffusion-hobby',
    usedIn: ['Sound Stage']
  },
  {
    providerId: 'demucs',
    name: 'Demucs',
    category: 'music-generation',
    capabilities: ['stem-separation','audio-separation'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/facebookresearch/demucs',
    usedIn: ['Sound Stage']
  },
  {
    providerId: 'basic-pitch',
    name: 'Basic Pitch',
    category: 'music-generation',
    capabilities: ['audio-to-midi','pitch-detection'],
    accessType: 'wasm',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/spotify/basic-pitch',
    usedIn: ['Sound Stage']
  },

  // ── AI Image Generation ───────────────────────────────────────────────────
  {
    providerId: 'pollinations-image',
    name: 'Pollinations Image',
    category: 'image-ai',
    capabilities: ['image-generation','flux-model','no-signup'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://image.pollinations.ai',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://pollinations.ai',
    usedIn: ['AI Image Director','Scene Workshop','Character Lab']
  },
  {
    providerId: 'aihorde',
    name: 'AI Horde',
    category: 'image-ai',
    capabilities: ['image-generation','distributed-compute','sdxl','sd15'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://stablehorde.net/api/v2',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://aihorde.net',
    usedIn: ['AI Image Director','Scene Workshop','Character Lab']
  },
  {
    providerId: 'huggingface',
    name: 'Hugging Face Inference',
    category: 'image-ai',
    capabilities: ['image-generation','model-hub','sdxl','flux'],
    accessType: 'free-api-key',
    requiresApiKey: true,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://api-inference.huggingface.co/models',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://huggingface.co/inference-api',
    usedIn: ['AI Image Director','Scene Workshop']
  },
  {
    providerId: 'comfyui',
    name: 'ComfyUI',
    category: 'image-ai',
    capabilities: ['image-generation','workflow','ip-adapter','controlnet','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:8188',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/comfyanonymous/ComfyUI',
    usedIn: ['AI Image Director','Scene Workshop','Character Lab']
  },
  {
    providerId: 'a1111',
    name: 'Automatic1111',
    category: 'image-ai',
    capabilities: ['image-generation','sd15','sdxl','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/AUTOMATIC1111/stable-diffusion-webui',
    usedIn: ['AI Image Director','Scene Workshop']
  },
  {
    providerId: 'forge',
    name: 'Stable Diffusion Forge',
    category: 'image-ai',
    capabilities: ['image-generation','sdxl','flux','local','faster-than-a1111'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/lllyasviel/stable-diffusion-webui-forge',
    usedIn: ['AI Image Director','Scene Workshop']
  },
  {
    providerId: 'fooocus',
    name: 'Fooocus',
    category: 'image-ai',
    capabilities: ['image-generation','sdxl','flux','simplified-local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7865',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/lllyasviel/Fooocus',
    usedIn: ['AI Image Director','Scene Workshop']
  },
  {
    providerId: 'invokeai',
    name: 'InvokeAI',
    category: 'image-ai',
    capabilities: ['image-generation','sdxl','sd15','unified-canvas','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:9090',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://invoke-ai.github.io/InvokeAI',
    usedIn: ['AI Image Director','Scene Workshop']
  },
  {
    providerId: 'sdnext',
    name: 'SD.Next',
    category: 'image-ai',
    capabilities: ['image-generation','sdxl','flux','sd15','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/vladmandic/automatic',
    usedIn: ['AI Image Director','Scene Workshop']
  },
  {
    providerId: 'diffusionbee',
    name: 'DiffusionBee',
    category: 'image-ai',
    capabilities: ['image-generation','macos-local','sd15','sdxl'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:5598',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://diffusionbee.com',
    usedIn: ['AI Image Director']
  },
  {
    providerId: 'draw-things',
    name: 'Draw Things',
    category: 'image-ai',
    capabilities: ['image-generation','ios-local','macos-local','sd15','sdxl','flux'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7888',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://drawthings.ai',
    usedIn: ['AI Image Director']
  },

  // ── AI Video Generation ───────────────────────────────────────────────────
  {
    providerId: 'wan',
    name: 'WAN',
    category: 'video-ai',
    capabilities: ['video-generation','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:8080',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/Wan-Video/Wan2.1',
    usedIn: ['Scene Workshop']
  },
  {
    providerId: 'hunyuanvideo',
    name: 'HunyuanVideo',
    category: 'video-ai',
    capabilities: ['video-generation','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:8080',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/Tencent/HunyuanVideo',
    usedIn: ['Scene Workshop']
  },
  {
    providerId: 'ltx-video',
    name: 'LTX-Video',
    category: 'video-ai',
    capabilities: ['video-generation','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:8080',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/Lightricks/LTX-Video',
    usedIn: ['Scene Workshop']
  },
  {
    providerId: 'animatediff',
    name: 'AnimateDiff',
    category: 'video-ai',
    capabilities: ['video-generation','animation','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/guoyww/AnimateDiff',
    usedIn: ['Scene Workshop']
  },
  {
    providerId: 'cogvideox',
    name: 'CogVideoX',
    category: 'video-ai',
    capabilities: ['video-generation','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:8080',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/THUDM/CogVideo',
    usedIn: ['Scene Workshop']
  },
  {
    providerId: 'stable-video-diffusion',
    name: 'Stable Video Diffusion',
    category: 'video-ai',
    capabilities: ['video-generation','image-to-video','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/Stability-AI/generative-models',
    usedIn: ['Scene Workshop']
  },
  {
    providerId: 'open-sora',
    name: 'Open-Sora',
    category: 'video-ai',
    capabilities: ['video-generation','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:8080',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/hpcaitech/Open-Sora',
    usedIn: ['Scene Workshop']
  },
  {
    providerId: 'mochi',
    name: 'Mochi',
    category: 'video-ai',
    capabilities: ['video-generation','high-quality','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:8080',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/genmoai/mochi',
    usedIn: ['Scene Workshop']
  },
  {
    providerId: 'dynamicrafter',
    name: 'DynamiCrafter',
    category: 'video-ai',
    capabilities: ['video-generation','image-to-video','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/Doubiiu/DynamiCrafter',
    usedIn: ['Scene Workshop']
  },

  // ── Lip Sync / Avatars ────────────────────────────────────────────────────
  {
    providerId: 'musetalk',
    name: 'MuseTalk',
    category: 'lip-sync',
    capabilities: ['lip-sync','avatar','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/TMElyralab/MuseTalk',
    usedIn: ['Character Lab','Voice Studio']
  },
  {
    providerId: 'wav2lip',
    name: 'Wav2Lip',
    category: 'lip-sync',
    capabilities: ['lip-sync','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/Rudrabha/Wav2Lip',
    usedIn: ['Character Lab','Voice Studio']
  },
  {
    providerId: 'sadtalker',
    name: 'SadTalker',
    category: 'lip-sync',
    capabilities: ['lip-sync','portrait-animation','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/OpenTalker/SadTalker',
    usedIn: ['Character Lab']
  },
  {
    providerId: 'liveportrait',
    name: 'LivePortrait',
    category: 'lip-sync',
    capabilities: ['portrait-animation','expression-transfer','local'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:7860',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://github.com/KwaiVGI/LivePortrait',
    usedIn: ['Character Lab']
  },

  // ── Local LLMs ────────────────────────────────────────────────────────────
  {
    providerId: 'ollama',
    name: 'Ollama',
    category: 'llm-local',
    capabilities: ['text-generation','chat','local-llm'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:11434',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://ollama.com',
    usedIn: ['Developer Lab','Scene Workshop','AI Image Director']
  },
  {
    providerId: 'lm-studio',
    name: 'LM Studio',
    category: 'llm-local',
    capabilities: ['text-generation','chat','local-llm','openai-compatible'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:1234/v1',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://lmstudio.ai',
    usedIn: ['Developer Lab','AI Image Director']
  },
  {
    providerId: 'localai',
    name: 'LocalAI',
    category: 'llm-local',
    capabilities: ['text-generation','image-generation','tts','openai-compatible'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:8080/v1',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://localai.io',
    usedIn: ['Developer Lab','AI Image Director']
  },
  {
    providerId: 'litellm',
    name: 'LiteLLM',
    category: 'llm-local',
    capabilities: ['llm-proxy','openai-compatible','routing'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:4000/v1',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://litellm.ai',
    usedIn: ['Developer Lab']
  },
  {
    providerId: 'vllm',
    name: 'vLLM',
    category: 'llm-local',
    capabilities: ['text-generation','chat','openai-compatible','high-throughput'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:8000/v1',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://github.com/vllm-project/vllm',
    usedIn: ['Developer Lab']
  },
  {
    providerId: 'tgi',
    name: 'Text Generation Inference',
    category: 'llm-local',
    capabilities: ['text-generation','chat','openai-compatible','huggingface-models'],
    accessType: 'local-endpoint',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://localhost:8080/v1',
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://github.com/huggingface/text-generation-inference',
    usedIn: ['Developer Lab']
  },

  // ── Cloud LLMs ────────────────────────────────────────────────────────────
  {
    providerId: 'pollinations-text',
    name: 'Pollinations Text',
    category: 'llm-cloud',
    capabilities: ['text-generation','chat','no-signup'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://text.pollinations.ai',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://pollinations.ai',
    usedIn: ['Developer Lab','Scene Workshop']
  },
  {
    providerId: 'openrouter',
    name: 'OpenRouter',
    category: 'llm-cloud',
    capabilities: ['text-generation','chat','model-routing'],
    accessType: 'free-api-key',
    requiresApiKey: true,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://openrouter.ai/api/v1',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://openrouter.ai',
    usedIn: ['Developer Lab','AI Image Director']
  },
  {
    providerId: 'openai',
    name: 'OpenAI',
    category: 'llm-cloud',
    capabilities: ['text-generation','chat','image-generation','tts','stt'],
    accessType: 'paid-api-key',
    requiresApiKey: true,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://api.openai.com/v1',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://platform.openai.com',
    usedIn: ['Developer Lab']
  },

  // ── Fonts ─────────────────────────────────────────────────────────────────
  {
    providerId: 'google-fonts',
    name: 'Google Fonts',
    category: 'fonts',
    capabilities: ['font-load','font-search'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://fonts.googleapis.com',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://fonts.google.com',
    usedIn: ['Editing Bay','Look Lab']
  },
  {
    providerId: 'bunny-fonts',
    name: 'Bunny Fonts',
    category: 'fonts',
    capabilities: ['font-load','font-search','privacy-friendly'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://fonts.bunny.net',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://fonts.bunny.net',
    usedIn: ['Editing Bay','Look Lab']
  },
  {
    providerId: 'font-squirrel',
    name: 'Font Squirrel',
    category: 'fonts',
    capabilities: ['font-download'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://www.fontsquirrel.com',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://www.fontsquirrel.com',
    usedIn: ['Editing Bay','Look Lab']
  },
  {
    providerId: 'open-foundry',
    name: 'Open Foundry',
    category: 'fonts',
    capabilities: ['font-download','open-source-fonts'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://open-foundry.com',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://open-foundry.com',
    usedIn: ['Editing Bay','Look Lab']
  },

  // ── Titles / Stickers / Overlays ──────────────────────────────────────────
  {
    providerId: 'mixkit-titles',
    name: 'Mixkit',
    category: 'titles-stickers',
    capabilities: ['animated-titles','stickers','overlays'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://mixkit.co/free-premiere-pro-templates',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://mixkit.co',
    usedIn: ['Editing Bay']
  },

  // ── Stock Media ───────────────────────────────────────────────────────────
  {
    providerId: 'pexels',
    name: 'Pexels',
    category: 'stock-media',
    capabilities: ['stock-photos','stock-video','search'],
    accessType: 'free-api-key',
    requiresApiKey: true,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://api.pexels.com/v1',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://www.pexels.com/api',
    usedIn: ['Scene Workshop','AI Image Director']
  },
  {
    providerId: 'pixabay-stock',
    name: 'Pixabay',
    category: 'stock-media',
    capabilities: ['stock-photos','stock-video','search'],
    accessType: 'free-api-key',
    requiresApiKey: true,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://pixabay.com/api',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://pixabay.com/api/docs',
    usedIn: ['Scene Workshop','AI Image Director']
  },
  {
    providerId: 'coverr',
    name: 'Coverr',
    category: 'stock-media',
    capabilities: ['stock-video','search'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://coverr.co',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://coverr.co',
    usedIn: ['Scene Workshop']
  },
  {
    providerId: 'wikimedia',
    name: 'Wikimedia Commons',
    category: 'stock-media',
    capabilities: ['stock-photos','stock-video','search','open-license'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://commons.wikimedia.org/w/api.php',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://commons.wikimedia.org',
    usedIn: ['Scene Workshop']
  },
  {
    providerId: 'internet-archive',
    name: 'Internet Archive',
    category: 'stock-media',
    capabilities: ['stock-video','stock-audio','search','public-domain'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://archive.org/advancedsearch.php',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://archive.org',
    usedIn: ['Scene Workshop']
  },
  {
    providerId: 'nasa-library',
    name: 'NASA Image Library',
    category: 'stock-media',
    capabilities: ['stock-photos','stock-video','search','public-domain'],
    accessType: 'free-no-key',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://images-api.nasa.gov',
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'none',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://images.nasa.gov',
    usedIn: ['Scene Workshop']
  },

  // ── Audio Synthesis (browser) ─────────────────────────────────────────────
  {
    providerId: 'tonejs',
    name: 'Tone.js',
    category: 'editing',
    capabilities: ['audio-synthesis','music-timing','sequencer','browser-audio'],
    accessType: 'wasm',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'low',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://tonejs.github.io',
    usedIn: ['Sound Stage','Editing Bay']
  },

  // ── Project Save / Share ──────────────────────────────────────────────────
  {
    providerId: 'supabase',
    name: 'Supabase',
    category: 'project-save',
    capabilities: ['cloud-save','project-share','auth','realtime','storage'],
    accessType: 'free-api-key',
    requiresApiKey: true,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'third-party-cloud',
    licenseRisk: 'low',
    commercialUseStatus: 'check-required',
    fallbackEligible: false,
    status: 'untested',
    website: 'https://supabase.com',
    usedIn: ['Export Office','Developer Lab']
  },
  {
    providerId: 'indexeddb',
    name: 'IndexedDB (Local)',
    category: 'project-save',
    capabilities: ['local-save','offline-first','draft-storage'],
    accessType: 'browser-api',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: null,
    privacyLabel: 'offline',
    licenseRisk: 'none',
    commercialUseStatus: 'free-commercial',
    fallbackEligible: true,
    status: 'untested',
    website: 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API',
    usedIn: ['Export Office','Editing Bay']
  }
];

// ─── STORAGE ─────────────────────────────────────────────────────────────────
function _load() {
  try {
    var s = localStorage.getItem(_STORAGE_KEY);
    if (s) _settings = JSON.parse(s);
  } catch (_) {}
  try {
    var t = localStorage.getItem(_STATUS_KEY);
    if (t) _status = JSON.parse(t);
  } catch (_) {}
}

function _persist() {
  try { localStorage.setItem(_STORAGE_KEY, JSON.stringify(_settings)); } catch (_) {}
  try { localStorage.setItem(_STATUS_KEY,   JSON.stringify(_status));   } catch (_) {}
}

function _setStatus(id, st) {
  _status[id] = st;
  _persist();
}

// Scrub any key-shaped values before returning settings in public methods.
// Internal _settings may have keys, but we never surface them.
function _safeSettings(id) {
  var s = _settings[id] || {};
  var out = {};
  Object.keys(s).forEach(function (k) {
    if (k.toLowerCase().indexOf('key') < 0 && k.toLowerCase().indexOf('token') < 0 && k.toLowerCase().indexOf('secret') < 0) {
      out[k] = s[k];
    }
  });
  return out;
}

// ─── TEST IMPLEMENTATIONS ────────────────────────────────────────────────────
function _testPollinations() {
  return fetch('https://image.pollinations.ai/prompt/test?width=32&height=32&nologo=true', {method:'HEAD'})
    .then(function (r) { return r.ok || r.status === 200 || r.type === 'opaque'; })
    .catch(function () { return false; });
}

function _testAiHorde() {
  return fetch('https://stablehorde.net/api/v2/status/heartbeat')
    .then(function (r) { return r.ok; })
    .catch(function () { return false; });
}

function _testBrowserTTS() {
  return Promise.resolve('speechSynthesis' in window);
}

function _testLocalEndpoint(endpoint, path) {
  return fetch((endpoint || '') + (path || '/'), {method:'GET', signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined})
    .then(function (r) { return r.ok || r.status < 500; })
    .catch(function () { return false; });
}

function _testPollinationsText() {
  return fetch('https://text.pollinations.ai/test', {method:'GET'})
    .then(function (r) { return r.ok || r.status < 500; })
    .catch(function () { return false; });
}

function _testWebAudio() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.close();
    return Promise.resolve(true);
  } catch (_) { return Promise.resolve(false); }
}

function _testCanvas() {
  return Promise.resolve(!!document.createElement('canvas').getContext);
}

function _testWebCodecs() {
  return Promise.resolve(typeof VideoDecoder !== 'undefined');
}

function _testGoogleFonts() {
  return fetch('https://fonts.googleapis.com/css2?family=Roboto', {method:'HEAD'})
    .then(function (r) { return r.ok || r.type === 'opaque'; })
    .catch(function () { return false; });
}

function _testBunnyFonts() {
  return fetch('https://fonts.bunny.net/css?family=nunito', {method:'HEAD'})
    .then(function (r) { return r.ok || r.type === 'opaque'; })
    .catch(function () { return false; });
}

function _testWikimedia() {
  return fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=test&srlimit=1')
    .then(function (r) { return r.ok; })
    .catch(function () { return false; });
}

function _testNasa() {
  return fetch('https://images-api.nasa.gov/search?q=earth&media_type=image&page_size=1')
    .then(function (r) { return r.ok; })
    .catch(function () { return false; });
}

function _testPexels(key) {
  if (!key) return Promise.resolve(false);
  return fetch('https://api.pexels.com/v1/photos/2014422', {headers:{'Authorization': key}})
    .then(function (r) { return r.ok; })
    .catch(function () { return false; });
}

function _testPixabay(key) {
  if (!key) return Promise.resolve(false);
  return fetch('https://pixabay.com/api/?key=' + encodeURIComponent(key) + '&q=sky&per_page=3')
    .then(function (r) { return r.ok; })
    .catch(function () { return false; });
}

function _testFreesound(key) {
  if (!key) return Promise.resolve(false);
  return fetch('https://freesound.org/apiv2/sounds/?query=click&token=' + encodeURIComponent(key))
    .then(function (r) { return r.ok; })
    .catch(function () { return false; });
}

function _testHuggingFace(key) {
  if (!key) return Promise.resolve(false);
  return fetch('https://huggingface.co/api/whoami-v2', {headers:{'Authorization':'Bearer ' + key}})
    .then(function (r) { return r.ok; })
    .catch(function () { return false; });
}

function _testOpenAI(key) {
  if (!key) return Promise.resolve(false);
  return fetch('https://api.openai.com/v1/models', {headers:{'Authorization':'Bearer ' + key}})
    .then(function (r) { return r.ok; })
    .catch(function () { return false; });
}

function _testOpenRouter(key) {
  if (!key) return Promise.resolve(false);
  return fetch('https://openrouter.ai/api/v1/models', {headers:{'Authorization':'Bearer ' + key}})
    .then(function (r) { return r.ok; })
    .catch(function () { return false; });
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────
var LoadProviderRegistry = {

  listProviders: function () {
    return _PROVIDERS.map(function (p) {
      return Object.assign({}, p, {status: _status[p.providerId] || p.status});
    });
  },

  listByCapability: function (capability) {
    return this.listProviders().filter(function (p) {
      return p.capabilities.indexOf(capability) >= 0;
    });
  },

  getProvider: function (providerId) {
    var p = _PROVIDERS.filter(function (p) { return p.providerId === providerId; })[0];
    if (!p) return null;
    return Object.assign({}, p, {status: _status[providerId] || p.status});
  },

  getProviderStatus: function (providerId) {
    return _status[providerId] || 'untested';
  },

  saveProviderSettings: function (providerId, settings) {
    // Accept endpoint + model + apiKey. Keys go only to localStorage.
    _settings[providerId] = Object.assign(_settings[providerId] || {}, settings);
    _persist();
  },

  testProvider: function (providerId) {
    var self = this;
    var p = this.getProvider(providerId);
    if (!p) return Promise.reject(new Error('Unknown provider: ' + providerId));

    _setStatus(providerId, 'testing');
    var s = _settings[providerId] || {};
    var endpoint = s.endpoint || p.defaultEndpoint;
    var key = s.apiKey || null;

    var testPromise;

    switch (providerId) {
      case 'pollinations-image':  testPromise = _testPollinations();        break;
      case 'pollinations-text':   testPromise = _testPollinationsText();    break;
      case 'aihorde':             testPromise = _testAiHorde();             break;
      case 'browser-tts':         testPromise = _testBrowserTTS();          break;
      case 'web-audio-api':       testPromise = _testWebAudio();            break;
      case 'canvas-api':          testPromise = _testCanvas();              break;
      case 'webcodecs':           testPromise = _testWebCodecs();           break;
      case 'google-fonts':        testPromise = _testGoogleFonts();         break;
      case 'bunny-fonts':         testPromise = _testBunnyFonts();          break;
      case 'wikimedia':           testPromise = _testWikimedia();           break;
      case 'nasa-library':        testPromise = _testNasa();                break;
      case 'pexels':              testPromise = _testPexels(key);           break;
      case 'pixabay-stock':       testPromise = _testPixabay(key);         break;
      case 'freesound':           testPromise = _testFreesound(key);        break;
      case 'huggingface':         testPromise = _testHuggingFace(key);      break;
      case 'openai':              testPromise = _testOpenAI(key);           break;
      case 'openrouter':          testPromise = _testOpenRouter(key);       break;
      case 'ollama':
        testPromise = _testLocalEndpoint(endpoint, '/api/tags');            break;
      case 'lm-studio':
        testPromise = _testLocalEndpoint(endpoint, '/models');              break;
      case 'localai':
        testPromise = _testLocalEndpoint(endpoint, '/models');              break;
      case 'litellm':
        testPromise = _testLocalEndpoint(endpoint, '/health');              break;
      case 'comfyui':
        testPromise = _testLocalEndpoint(endpoint, '/system_stats');        break;
      case 'a1111':
        testPromise = _testLocalEndpoint(endpoint, '/sdapi/v1/options');    break;
      case 'faster-whisper':
      case 'musetalk': case 'wav2lip': case 'sadtalker': case 'liveportrait':
      case 'musicgen': case 'audiogen': case 'riffusion': case 'demucs':
      case 'chatterbox': case 'xtts': case 'bark': case 'openvoice': case 'dia':
      case 'wan': case 'hunyuanvideo': case 'ltx-video': case 'animatediff': case 'cogvideox':
      case 'stable-video-diffusion': case 'open-sora': case 'mochi': case 'dynamicrafter':
      case 'forge': case 'fooocus': case 'invokeai': case 'diffusionbee': case 'draw-things':
      case 'vllm': case 'tgi':
        testPromise = _testLocalEndpoint(endpoint, '/');                    break;
      case 'sdnext':
        testPromise = _testLocalEndpoint(endpoint, '/sdapi/v1/options');    break;
      case 'supabase':
        if (!key) { _setStatus(providerId, 'needs-key'); return Promise.resolve({ok:false,status:'needs-key',providerId:providerId}); }
        testPromise = Promise.resolve(true);                                break;
      default:
        // Browser/WASM providers: check for known globals or just return not-applicable
        if (p.accessType === 'browser-api' || p.accessType === 'wasm') {
          testPromise = Promise.resolve(true);
        } else if (p.requiresApiKey && !key) {
          _setStatus(providerId, 'needs-key');
          return Promise.resolve({ok: false, status: 'needs-key', providerId: providerId});
        } else if (p.requiresLocalEndpoint && !endpoint) {
          _setStatus(providerId, 'needs-endpoint');
          return Promise.resolve({ok: false, status: 'needs-endpoint', providerId: providerId});
        } else {
          testPromise = Promise.resolve(false);
        }
    }

    if (p.requiresApiKey && !key) {
      _setStatus(providerId, 'needs-key');
      return Promise.resolve({ok: false, status: 'needs-key', providerId: providerId});
    }
    if (p.requiresLocalEndpoint && !endpoint) {
      _setStatus(providerId, 'needs-endpoint');
      return Promise.resolve({ok: false, status: 'needs-endpoint', providerId: providerId});
    }

    return testPromise.then(function (ok) {
      var st = ok ? 'ok' : 'error';
      _setStatus(providerId, st);
      return {ok: ok, status: st, providerId: providerId};
    }).catch(function (err) {
      _setStatus(providerId, 'error');
      return {ok: false, status: 'error', providerId: providerId, error: err && err.message};
    });
  },

  generateImage: function (request) {
    // request: { prompt, width, height, seed, providerId, model, negativePrompt }
    var providerId = request.providerId;
    var s = _settings[providerId] || {};
    var endpoint = s.endpoint || (this.getProvider(providerId) || {}).defaultEndpoint;
    var key = s.apiKey;

    if (providerId === 'pollinations-image' || !providerId) {
      var w = request.width || 1024;
      var h = request.height || 576;
      var seed = request.seed || Math.floor(Math.random() * 999999);
      var url = 'https://image.pollinations.ai/prompt/' +
        encodeURIComponent(request.prompt || 'scene') +
        '?width=' + w + '&height=' + h + '&seed=' + seed + '&nologo=true';
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error('Pollinations error ' + r.status);
        return r.blob().then(function (b) {
          return LoadProviderRegistry.normalizeResult({type:'image', blob:b, url:URL.createObjectURL(b), provider:'pollinations-image'});
        });
      });
    }

    if (providerId === 'aihorde') {
      var hordeKey = key || '0000000000';
      return fetch('https://stablehorde.net/api/v2/generate/async', {
        method: 'POST',
        headers: {'Content-Type':'application/json','apikey': hordeKey},
        body: JSON.stringify({
          prompt: request.prompt,
          params: {width: request.width || 512, height: request.height || 512, n: 1},
          r2: true
        })
      }).then(function (r) {
        if (!r.ok) throw new Error('AI Horde submit error ' + r.status);
        return r.json();
      }).then(function (data) {
        // Return job id for polling — caller must poll getHordeResult
        return LoadProviderRegistry.normalizeResult({type:'image-job', jobId:data.id, provider:'aihorde'});
      });
    }

    if (providerId === 'comfyui') {
      // Simple txt2img workflow for ComfyUI
      var workflow = {
        "3":{"class_type":"KSampler","inputs":{"cfg":7,"denoise":1,"latent_image":["5",0],"model":["4",0],"negative":["7",0],"positive":["6",0],"sampler_name":"euler","scheduler":"normal","seed":request.seed||42,"steps":20}},
        "4":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":s.model||"v1-5-pruned-emaonly.ckpt"}},
        "5":{"class_type":"EmptyLatentImage","inputs":{"batch_size":1,"height":request.height||512,"width":request.width||512}},
        "6":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":request.prompt||""}},
        "7":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":request.negativePrompt||""}},
        "8":{"class_type":"VAEDecode","inputs":{"samples":["3",0],"vae":["4",2]}},
        "9":{"class_type":"SaveImage","inputs":{"filename_prefix":"lseb","images":["8",0]}}
      };
      return fetch(endpoint + '/prompt', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({prompt: workflow})
      }).then(function (r) {
        if (!r.ok) throw new Error('ComfyUI error ' + r.status);
        return r.json().then(function (d) {
          return LoadProviderRegistry.normalizeResult({type:'image-job', jobId:d.prompt_id, provider:'comfyui'});
        });
      });
    }

    if (providerId === 'a1111') {
      return fetch(endpoint + '/sdapi/v1/txt2img', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          prompt: request.prompt || '',
          negative_prompt: request.negativePrompt || '',
          width: request.width || 512,
          height: request.height || 512,
          steps: 20,
          cfg_scale: 7,
          seed: request.seed || -1,
          batch_size: 1
        })
      }).then(function (r) {
        if (!r.ok) throw new Error('A1111 error ' + r.status);
        return r.json().then(function (d) {
          var b64 = (d.images || [])[0];
          if (!b64) throw new Error('No image returned');
          var dataURL = 'data:image/png;base64,' + b64;
          return LoadProviderRegistry.normalizeResult({type:'image', dataURL:dataURL, provider:'a1111'});
        });
      });
    }

    if (providerId === 'huggingface') {
      var model = s.model || 'black-forest-labs/FLUX.1-schnell';
      return fetch('https://api-inference.huggingface.co/models/' + model, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer ' + key},
        body: JSON.stringify({inputs: request.prompt})
      }).then(function (r) {
        if (!r.ok) throw new Error('HuggingFace error ' + r.status);
        return r.blob().then(function (b) {
          return LoadProviderRegistry.normalizeResult({type:'image', blob:b, url:URL.createObjectURL(b), provider:'huggingface'});
        });
      });
    }

    return Promise.reject(new Error('generateImage: unsupported or unconfigured provider: ' + providerId));
  },

  generateAudio: function (request) {
    // request: { text, voice, providerId, rate, pitch }
    var providerId = request.providerId || 'browser-tts';
    var s = _settings[providerId] || {};
    var endpoint = s.endpoint || (this.getProvider(providerId) || {}).defaultEndpoint;

    if (providerId === 'browser-tts' || !providerId) {
      return new Promise(function (resolve, reject) {
        if (!('speechSynthesis' in window)) { reject(new Error('SpeechSynthesis not available')); return; }
        var utt = new SpeechSynthesisUtterance(request.text || '');
        if (request.voice) utt.voice = request.voice;
        if (request.rate)  utt.rate  = request.rate;
        if (request.pitch) utt.pitch = request.pitch;
        utt.onend   = function () { resolve(LoadProviderRegistry.normalizeResult({type:'audio-preview', provider:'browser-tts'})); };
        utt.onerror = function (e) { reject(new Error('SpeechSynthesis error: ' + e.error)); };
        speechSynthesis.speak(utt);
      });
    }

    // Local TTS endpoints (Kokoro, XTTS, Piper via LocalAI, Bark, etc.)
    if (endpoint) {
      var path = (providerId === 'xtts') ? '/tts_to_audio/' :
                 (providerId === 'localai') ? '/v1/audio/speech' :
                 '/synthesize';
      var body = JSON.stringify({text: request.text, voice: request.voice || s.voice || 'default', language: s.language || 'en'});
      return fetch(endpoint + path, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: body
      }).then(function (r) {
        if (!r.ok) throw new Error(providerId + ' TTS error ' + r.status);
        return r.blob().then(function (b) {
          return LoadProviderRegistry.normalizeResult({type:'audio', blob:b, url:URL.createObjectURL(b), provider:providerId});
        });
      });
    }

    return Promise.reject(new Error('generateAudio: no endpoint for provider: ' + providerId));
  },

  transcribeAudio: function (request) {
    // request: { blob, providerId, language }
    var providerId = request.providerId || 'faster-whisper';
    var s = _settings[providerId] || {};
    var endpoint = s.endpoint || (this.getProvider(providerId) || {}).defaultEndpoint;

    if (!endpoint) return Promise.reject(new Error('transcribeAudio: no endpoint for provider: ' + providerId));

    var fd = new FormData();
    fd.append('file', request.blob, 'audio.wav');
    if (request.language) fd.append('language', request.language);

    var path = (providerId === 'faster-whisper') ? '/transcribe' :
               (providerId === 'localai') ? '/v1/audio/transcriptions' :
               '/transcribe';

    return fetch(endpoint + path, {method:'POST', body: fd})
      .then(function (r) {
        if (!r.ok) throw new Error(providerId + ' transcribe error ' + r.status);
        return r.json().then(function (d) {
          var text = d.text || d.transcription || d.result || '';
          return LoadProviderRegistry.normalizeResult({type:'transcript', text:text, provider:providerId});
        });
      });
  },

  generateVideo: function (request) {
    // request: { prompt, image, width, height, frames, fps, providerId }
    var providerId = request.providerId;
    var s = _settings[providerId] || {};
    var endpoint = s.endpoint || (this.getProvider(providerId) || {}).defaultEndpoint;

    if (!endpoint) return Promise.reject(new Error('generateVideo: no endpoint for provider: ' + providerId));

    var body = {
      prompt: request.prompt || '',
      width: request.width || 512,
      height: request.height || 320,
      num_frames: request.frames || 24,
      fps: request.fps || 8
    };
    if (request.image) body.image = request.image;

    var path = (providerId === 'ltx-video')    ? '/generate' :
               (providerId === 'animatediff')   ? '/run' :
               (providerId === 'cogvideox')     ? '/generate' :
               (providerId === 'wan')           ? '/generate' :
               (providerId === 'hunyuanvideo')  ? '/generate' :
               '/generate';

    return fetch(endpoint + path, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error(providerId + ' video error ' + r.status);
      return r.json().then(function (d) {
        return LoadProviderRegistry.normalizeResult({type:'video-job', jobId:d.id || d.job_id, provider:providerId, data:d});
      });
    });
  },

  routeToFallback: function (request) {
    // request must have: type ('image'|'audio'|'video'|'transcript'), originalProviderId, ...rest
    var self = this;
    var type = request.type;
    var failed = request.originalProviderId;

    var capMap = {
      'image':      'image-generation',
      'audio':      'text-to-speech',
      'video':      'video-generation',
      'transcript': 'speech-to-text'
    };
    var cap = capMap[type];
    if (!cap) return Promise.reject(new Error('routeToFallback: unknown type ' + type));

    var candidates = this.listByCapability(cap).filter(function (p) {
      return p.fallbackEligible && p.providerId !== failed;
    });

    function tryNext(idx) {
      if (idx >= candidates.length) return Promise.reject(new Error('All fallbacks exhausted for ' + type));
      var p = candidates[idx];
      var req = Object.assign({}, request, {providerId: p.providerId, originalProviderId: undefined, type: undefined});
      var fn = type === 'image'      ? self.generateImage.bind(self)    :
               type === 'audio'      ? self.generateAudio.bind(self)    :
               type === 'video'      ? self.generateVideo.bind(self)    :
               type === 'transcript' ? self.transcribeAudio.bind(self)  : null;
      if (!fn) return Promise.reject(new Error('No generator for type ' + type));
      return fn(req).catch(function () { return tryNext(idx + 1); });
    }

    return tryNext(0);
  },

  normalizeResult: function (raw) {
    // Normalize any provider response into a consistent shape.
    // Never include API keys or tokens in output.
    return {
      ok:         true,
      type:       raw.type       || 'unknown',
      provider:   raw.provider   || 'unknown',
      url:        raw.url        || null,
      dataURL:    raw.dataURL    || null,
      blob:       raw.blob       || null,
      text:       raw.text       || null,
      jobId:      raw.jobId      || null,
      metadata:   raw.metadata   || {}
    };
  }
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
_load();
window.LoadProviderRegistry = LoadProviderRegistry;

}());
