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

// ─── ADDITIONAL PROVIDERS (missing from initial list) ─────────────────────────
var _PROVIDERS_EXTRA = [
  // Identity / Consistency
  { providerId:'ip-adapter',          name:'IP-Adapter',            aliases:['IP Adapter'],          category:'identity',         capabilities:['image-conditioning','style-transfer','ip-adapter'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/tencent-ailab/IP-Adapter', docsUrl:'https://github.com/tencent-ailab/IP-Adapter', whereUsedInLoadStudio:['AI Image Director','Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'character-consistency', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Requires ComfyUI or A1111 with IP-Adapter nodes.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['image','text'], outputTypes:['image'] },
  { providerId:'ip-adapter-faceid',   name:'IP-Adapter FaceID',     aliases:['FaceID Adapter'],      category:'identity',         capabilities:['face-consistency','identity-lock','ip-adapter'],               accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/tencent-ailab/IP-Adapter', docsUrl:'https://github.com/tencent-ailab/IP-Adapter', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'character-consistency', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'FaceID variant for face-locked character generation.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['image','text'], outputTypes:['image'] },
  { providerId:'instantid',           name:'InstantID',             aliases:[],                      category:'identity',         capabilities:['face-consistency','identity-lock','single-image-id'],          accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/InstantID/InstantID', docsUrl:'https://github.com/InstantID/InstantID', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'character-consistency', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Strong single-image face consistency.', pipelineMembership:['ai-image-glamour'], inputTypes:['image','text'], outputTypes:['image'] },
  { providerId:'photomaker',          name:'PhotoMaker',            aliases:[],                      category:'identity',         capabilities:['identity-lock','stylized-character'],                           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/TencentARC/PhotoMaker', docsUrl:'https://github.com/TencentARC/PhotoMaker', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'character-consistency', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Stylize humans while keeping identity.', pipelineMembership:['ai-image-glamour'], inputTypes:['image','text'], outputTypes:['image'] },
  { providerId:'facechain',           name:'FaceChain',             aliases:[],                      category:'identity',         capabilities:['face-consistency','portrait-generation'],                      accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/modelscope/facechain', docsUrl:'https://github.com/modelscope/facechain', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'character-consistency', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['ai-image-glamour'], inputTypes:['image','text'], outputTypes:['image'] },
  // ControlNet / Pose
  { providerId:'controlnet',          name:'ControlNet',            aliases:['ControlNet SD'],       category:'controlnet',       capabilities:['pose-control','depth-control','edge-control','image-conditioning'], accessType:'local-endpoint', requiresApiKey:false, requiresLocalEndpoint:true, defaultEndpoint:'http://localhost:8188', isFree:true, isOpenSource:true, isLocal:true, isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'check-required', license:'Apache 2.0', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/lllyasviel/ControlNet', docsUrl:'https://github.com/lllyasviel/ControlNet', whereUsedInLoadStudio:['AI Image Director','Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'scene-composition', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Requires ComfyUI or A1111 with ControlNet extension.', pipelineMembership:['comfyui-production','ai-image-glamour'], inputTypes:['image','text'], outputTypes:['image'] },
  { providerId:'controlnet-flux',     name:'ControlNet for FLUX',   aliases:['FLUX ControlNet'],     category:'controlnet',       capabilities:['pose-control','depth-control','flux-conditioning'],            accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/Shakker-Labs/FLUX.1-dev-ControlNet-Union-Pro', docsUrl:'https://huggingface.co/Shakker-Labs', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'scene-composition', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'FLUX-specific ControlNet via ComfyUI.', pipelineMembership:['comfyui-production'], inputTypes:['image','text'], outputTypes:['image'] },
  // Enhancement / Upscale
  { providerId:'codeformer',          name:'CodeFormer',            aliases:[],                      category:'enhancement',      capabilities:['face-restore','face-enhance','upscale'],                       accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'S-Lab License',costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/sczhou/CodeFormer', docsUrl:'https://github.com/sczhou/CodeFormer', whereUsedInLoadStudio:['AI Image Director','Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'face-enhancement', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['ai-image-glamour'], inputTypes:['image'], outputTypes:['image'] },
  { providerId:'gfpgan',              name:'GFPGAN',                aliases:[],                      category:'enhancement',      capabilities:['face-restore','face-enhance'],                                  accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'non-commercial',  license:'Non-commercial',costLabel:'Free',        fallbackEligible:false, status:'untested', blockedReason:'Non-commercial license', websiteUrl:'https://github.com/TencentARC/GFPGAN', docsUrl:'https://github.com/TencentARC/GFPGAN', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'face-enhancement', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Non-commercial only.', pipelineMembership:[], inputTypes:['image'], outputTypes:['image'] },
  { providerId:'real-esrgan',         name:'Real-ESRGAN',           aliases:['ESRGAN'],              category:'enhancement',      capabilities:['upscale','super-resolution'],                                   accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'BSD 3-Clause', costLabel:'Free',        fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/xinntao/Real-ESRGAN', docsUrl:'https://github.com/xinntao/Real-ESRGAN', whereUsedInLoadStudio:['AI Image Director','Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'upscaling', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['image'], outputTypes:['image'] },
  { providerId:'seedvr2',             name:'SeedVR2',               aliases:[],                      category:'enhancement',      capabilities:['video-upscale','super-resolution'],                             accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/ByteDance/SeedVR', docsUrl:'https://github.com/ByteDance/SeedVR', whereUsedInLoadStudio:['Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'video-upscaling', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Video super-resolution.', pipelineMembership:['comfyui-production'], inputTypes:['video'], outputTypes:['video'] },
  // Fine-Tunes / AI Image Models
  { providerId:'hidream',             name:'HiDream',               aliases:['HiDream-I1'],          category:'image-ai',         capabilities:['image-generation','high-quality'],                              accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'HiDream License',costLabel:'Free',        fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/HiDream-ai/HiDream-I1', docsUrl:'https://github.com/HiDream-ai/HiDream-I1', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'juggernaut-xl',       name:'Juggernaut XL',         aliases:[],                      category:'image-ai',         capabilities:['image-generation','photorealistic','sdxl-finetune'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'CreativeML',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://civitai.com/models/133005', docsUrl:'https://civitai.com/models/133005', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'SDXL photorealistic fine-tune.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'realvisxl',           name:'RealVisXL',             aliases:[],                      category:'image-ai',         capabilities:['image-generation','photorealistic','sdxl-finetune'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'CreativeML',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://civitai.com/models/139562', docsUrl:'https://civitai.com/models/139562', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'dreamshaper',         name:'DreamShaper',           aliases:[],                      category:'image-ai',         capabilities:['image-generation','stylized','sdxl-finetune'],                 accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'CreativeML',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://civitai.com/models/4384', docsUrl:'https://civitai.com/models/4384', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  // New TTS
  { providerId:'f5-tts',              name:'F5-TTS',                aliases:['F5 TTS','E2 TTS'],     category:'tts',              capabilities:['text-to-speech','voice-clone','zero-shot'],                    accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'MIT',          costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/SWivid/F5-TTS', docsUrl:'https://github.com/SWivid/F5-TTS', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Zero-shot voice cloning from short reference.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text','audio'], outputTypes:['audio'] },
  { providerId:'orpheus',             name:'Orpheus',               aliases:['Orpheus TTS'],         category:'tts',              capabilities:['text-to-speech','expressive','emotional'],                      accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/canopyai/Orpheus-TTS', docsUrl:'https://github.com/canopyai/Orpheus-TTS', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Highly expressive emotional TTS.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['audio'] },
  { providerId:'higgs-audio',         name:'Higgs Audio',           aliases:[],                      category:'tts',              capabilities:['text-to-speech','voice-clone','multilingual'],                  accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/boson-ai/higgs-audio', docsUrl:'https://github.com/boson-ai/higgs-audio', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text','audio'], outputTypes:['audio'] },
  { providerId:'chatterbox-turbo',    name:'Chatterbox Turbo',      aliases:[],                      category:'tts',              capabilities:['text-to-speech','voice-clone','fast'],                          accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/resemble-ai/chatterbox', docsUrl:'https://github.com/resemble-ai/chatterbox', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Faster variant of Chatterbox.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text','audio'], outputTypes:['audio'] },
  { providerId:'melo-tts',            name:'MeloTTS',               aliases:['MeloTTS'],             category:'tts',              capabilities:['text-to-speech','multilingual','fast-local'],                   accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8888', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'free-commercial', license:'MIT',          costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/myshell-ai/MeloTTS', docsUrl:'https://github.com/myshell-ai/MeloTTS', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['tts-voice'], inputTypes:['text'], outputTypes:['audio'] },
  // New STT
  { providerId:'whisperx',            name:'WhisperX',              aliases:[],                      category:'stt',              capabilities:['speech-to-text','word-timestamps','diarization'],              accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'free-commercial', license:'BSD 2-Clause', costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/m-bain/whisperX', docsUrl:'https://github.com/m-bain/whisperX', whereUsedInLoadStudio:['Voice Studio','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Adds word-level timestamps and speaker diarization.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text','subtitle'] },
  { providerId:'nvidia-canary',       name:'NVIDIA Canary',         aliases:['Canary-1B'],           category:'stt',              capabilities:['speech-to-text','multilingual','high-accuracy'],               accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/nvidia/canary-1b', docsUrl:'https://huggingface.co/nvidia/canary-1b', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  { providerId:'qwen3-asr',           name:'Qwen3-ASR',             aliases:['Qwen ASR'],            category:'stt',              capabilities:['speech-to-text','multilingual'],                                accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Qwen License', costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/Qwen', docsUrl:'https://huggingface.co/Qwen', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  { providerId:'pyannote',            name:'pyannote.audio',        aliases:['pyannote'],            category:'stt',              capabilities:['speaker-diarization','voice-activity-detection'],              accessType:'local-endpoint',  requiresApiKey:true,  requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'MIT',          costLabel:'Free (HF token)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/pyannote/pyannote-audio', docsUrl:'https://github.com/pyannote/pyannote-audio', whereUsedInLoadStudio:['Voice Studio','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'speaker-id', testAction:'test-local-endpoint', settingsAction:'set-key-and-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Requires HuggingFace token to download model.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['diarization'] },
  // Audio generation
  { providerId:'stable-audio-open',   name:'Stable Audio Open',     aliases:[],                      category:'music-generation', capabilities:['music-generation','sfx-generation','ai-audio'],                accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Stability AI',costLabel:'Free',          fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/stabilityai/stable-audio-open-1.0', docsUrl:'https://huggingface.co/stabilityai/stable-audio-open-1.0', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'audio-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['music-audio-gen'], inputTypes:['text'], outputTypes:['audio'] },
  { providerId:'diffrhythm',          name:'DiffRhythm',            aliases:[],                      category:'music-generation', capabilities:['music-generation','structured-audio'],                          accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/ASLP-lab/DiffRhythm', docsUrl:'https://github.com/ASLP-lab/DiffRhythm', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'audio-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['music-audio-gen'], inputTypes:['text'], outputTypes:['audio'] },
  // Lip sync (extra)
  { providerId:'omnihuman',           name:'OmniHuman',             aliases:[],                      category:'lip-sync',         capabilities:['full-body-animation','lip-sync','gesture-driven'],             accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/ByteDance/OmniHuman-1', docsUrl:'https://github.com/ByteDance/OmniHuman-1', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'avatar-animation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['lip-sync-avatar'], inputTypes:['image','audio'], outputTypes:['video'] },
  { providerId:'geneface-pp',         name:'GeneFace++',            aliases:['GeneFace'],            category:'lip-sync',         capabilities:['talking-head','neural-radiance-field','lip-sync'],             accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/yerfor/GeneFacePlusPlus', docsUrl:'https://github.com/yerfor/GeneFacePlusPlus', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'avatar-animation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['lip-sync-avatar'], inputTypes:['image','audio'], outputTypes:['video'] },
  { providerId:'videoretalk',         name:'VideoReTalking',        aliases:[],                      category:'lip-sync',         capabilities:['lip-sync','video-reenactment'],                                 accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'MIT',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/OpenTalker/video-retalking', docsUrl:'https://github.com/OpenTalker/video-retalking', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'avatar-animation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['lip-sync-avatar'], inputTypes:['video','audio'], outputTypes:['video'] },
  // Local LLM routers (extra)
  { providerId:'jan',                 name:'Jan',                   aliases:[],                      category:'llm-local',        capabilities:['text-generation','chat','local-llm','openai-compatible'],      accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:1337/v1', isFree:true, isOpenSource:true, isLocal:true, isBrowserNative:false, isHosted:false, isOpenAICompatible:true, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'free-commercial', license:'Apache 2.0', costLabel:'Free', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://jan.ai', docsUrl:'https://jan.ai/docs', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Desktop LLM app, OpenAI-compatible.', pipelineMembership:['local-selfhosted-ai','openai-compat-routing'], inputTypes:['text'], outputTypes:['text'] },
  { providerId:'koboldcpp',           name:'Koboldcpp',             aliases:['KoboldCPP'],           category:'llm-local',        capabilities:['text-generation','chat','openai-compatible','gguf'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:5001',  isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:true,  requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'free-commercial', license:'AGPL 3.0',     costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/LostRuins/koboldcpp', docsUrl:'https://github.com/LostRuins/koboldcpp', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Single binary, runs GGUF models.', pipelineMembership:['local-selfhosted-ai'], inputTypes:['text'], outputTypes:['text'] },
  { providerId:'gpt4all',             name:'GPT4All',               aliases:[],                      category:'llm-local',        capabilities:['text-generation','chat','local-llm'],                          accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:4891/v1',isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:true,  requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'free-commercial', license:'MIT',          costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://gpt4all.io', docsUrl:'https://docs.gpt4all.io', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['local-selfhosted-ai'], inputTypes:['text'], outputTypes:['text'] },
  // Cloud LLM
  { providerId:'cloudflare-workers-ai',name:'Cloudflare Workers AI',aliases:['CF Workers AI'],      category:'llm-cloud',        capabilities:['text-generation','image-generation','speech-to-text'],         accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.cloudflare.com/client/v4/accounts', isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:false, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free tier', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://developers.cloudflare.com/workers-ai', docsUrl:'https://developers.cloudflare.com/workers-ai', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'Good free tier fallback.', pipelineMembership:['openai-compat-routing'], inputTypes:['text'], outputTypes:['text','image'] },
  { providerId:'mistral',             name:'Mistral',               aliases:['Mistral AI'],          category:'llm-cloud',        capabilities:['text-generation','chat','vision'],                              accessType:'paid-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.mistral.ai/v1', isFree:false, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:true, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Paid', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://mistral.ai', docsUrl:'https://docs.mistral.ai', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['openai-compat-routing'], inputTypes:['text'], outputTypes:['text'] },
  // Streaming / video players
  { providerId:'peertube',            name:'PeerTube',              aliases:[],                      category:'streaming',        capabilities:['video-hosting','fediverse','self-hosted'],                     accessType:'free-no-key',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:true, isLocal:false, isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'self-hosted', licenseRisk:'low', commercialUseStatus:'check-required', license:'AGPL 3.0', costLabel:'Free (self-hosted)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://joinpeertube.org', docsUrl:'https://docs.joinpeertube.org', whereUsedInLoadStudio:['Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'publishing', testAction:'none', settingsAction:'set-instance-url', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['load-play-publish'], inputTypes:['video'], outputTypes:['stream-url'] },
  { providerId:'mediacms',            name:'MediaCMS',              aliases:[],                      category:'streaming',        capabilities:['video-hosting','self-hosted'],                                  accessType:'free-no-key',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:true, isLocal:false, isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'self-hosted', licenseRisk:'low', commercialUseStatus:'free-commercial', license:'AGPL 3.0', costLabel:'Free (self-hosted)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://mediacms.io', docsUrl:'https://mediacms.io', whereUsedInLoadStudio:['Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'publishing', testAction:'none', settingsAction:'set-instance-url', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['load-play-publish'], inputTypes:['video'], outputTypes:['stream-url'] },
  { providerId:'owncast',             name:'Owncast',               aliases:[],                      category:'streaming',        capabilities:['live-streaming','self-hosted'],                                 accessType:'free-no-key',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:true, isLocal:false, isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'self-hosted', licenseRisk:'low', commercialUseStatus:'free-commercial', license:'MIT', costLabel:'Free (self-hosted)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://owncast.online', docsUrl:'https://owncast.online/docs', whereUsedInLoadStudio:['Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'publishing', testAction:'none', settingsAction:'set-instance-url', useAsPrimary:false, useAsFallback:false, notes:'Live streaming only.', pipelineMembership:['load-play-publish'], inputTypes:['video'], outputTypes:['stream-url'] },
  { providerId:'videojs',             name:'Video.js',              aliases:[],                      category:'player',           capabilities:['video-playback','browser-player','hls'],                       accessType:'wasm',            requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:true, isLocal:true, isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'free-commercial', license:'Apache 2.0', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://videojs.com', docsUrl:'https://docs.videojs.com', whereUsedInLoadStudio:['Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'playback', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['vn-editing'], inputTypes:['video'], outputTypes:['playback'] },
  // Browser APIs
  { providerId:'file-api',            name:'File API',              aliases:['File System Access'],  category:'editing',          capabilities:['file-read','file-write','directory-access'],                   accessType:'browser-api',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:false, isLocal:true, isBrowserNative:true, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'free-commercial', license:'Platform API', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://developer.mozilla.org/en-US/docs/Web/API/File_API', docsUrl:'https://developer.mozilla.org/en-US/docs/Web/API/File_API', whereUsedInLoadStudio:['Editing Bay','Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'file-io', testAction:'check-browser-support', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'', pipelineMembership:['vn-editing','cinepwa-package'], inputTypes:['file'], outputTypes:['file'] },
  { providerId:'mediarecorder-api',   name:'MediaRecorder API',     aliases:['MediaRecorder'],       category:'editing',          capabilities:['audio-record','video-record','screen-capture'],                accessType:'browser-api',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:false, isLocal:true, isBrowserNative:true, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'free-commercial', license:'Platform API', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder', docsUrl:'https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder', whereUsedInLoadStudio:['Editing Bay','Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'recording', testAction:'check-browser-support', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'Used for canvas-to-video recording in Create Blank flow.', pipelineMembership:['vn-editing','tts-voice'], inputTypes:['stream'], outputTypes:['video','audio'] },
  { providerId:'webgl',               name:'WebGL',                 aliases:['WebGL2'],              category:'editing',          capabilities:['gpu-render','shader','compositing'],                            accessType:'browser-api',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:false, isLocal:true, isBrowserNative:true, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'free-commercial', license:'Platform API', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API', docsUrl:'https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API', whereUsedInLoadStudio:['Editing Bay','Look Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'gpu-acceleration', testAction:'check-browser-support', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['vn-editing'], inputTypes:['canvas'], outputTypes:['canvas'] },

  // ─── PROVIDERS FROM CLAUDE.md AUDIT — added 2026-05-15 ────────────────────
  // Audio separation
  { providerId:'spleeter',            name:'Spleeter',              aliases:['Deezer Spleeter'],     category:'music-generation', capabilities:['stem-separation','audio-split','2-stem','4-stem','5-stem'],    accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'MIT',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/deezer/spleeter', docsUrl:'https://github.com/deezer/spleeter', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'audio-separation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Stem separation: vocals, drums, bass, other. Companion to Demucs.', pipelineMembership:['music-audio-gen','local-selfhosted-ai'], inputTypes:['audio'], outputTypes:['audio'] },
  // TTS framework
  { providerId:'coqui',               name:'Coqui TTS',             aliases:['Coqui','TTS by Coqui'],'category':'tts',            capabilities:['text-to-speech','voice-clone','multilingual'],                  accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:5002', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'MPL 2.0',      costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/coqui-ai/TTS', docsUrl:'https://tts.readthedocs.io', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Coqui TTS framework — XTTS is a Coqui model. Use this entry for the base server.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['audio'] },
  // Local LLM runtime
  { providerId:'llama-cpp',           name:'llama.cpp',             aliases:['llama-cpp-python'],    category:'llm-local',        capabilities:['text-generation','chat','gguf','local-llm','openai-compatible'], accessType:'local-endpoint', requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8080/v1', isFree:true, isOpenSource:true, isLocal:true, isBrowserNative:false, isHosted:false, isOpenAICompatible:true, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'free-commercial', license:'MIT', costLabel:'Free', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://github.com/ggml-org/llama.cpp', docsUrl:'https://github.com/ggml-org/llama.cpp', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'GGUF inference backend. Runs via CLI or llama-cpp-python server.', pipelineMembership:['local-selfhosted-ai','openai-compat-routing'], inputTypes:['text'], outputTypes:['text'] },
  // AI Image models (declared — run via ComfyUI / A1111 / Forge backends)
  { providerId:'flux',                name:'FLUX',                  aliases:['FLUX.1','FLUX Dev','FLUX Schnell'], category:'image-ai', capabilities:['image-generation','high-quality','distilled'],                accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'medium', commercialUseStatus:'check-required',  license:'FLUX License', costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/black-forest-labs/FLUX.1-dev', docsUrl:'https://huggingface.co/black-forest-labs', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Runs via ComfyUI, A1111 or Forge. FLUX.1-dev: non-commercial. FLUX.1-schnell: Apache 2.0.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'sdxl',                name:'SDXL',                  aliases:['Stable Diffusion XL'], category:'image-ai',         capabilities:['image-generation','sdxl','high-resolution'],                   accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'CreativeML OpenRAIL', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0', docsUrl:'https://huggingface.co/stabilityai', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Runs via ComfyUI or A1111.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text','image'], outputTypes:['image'] },
  { providerId:'sd-15',               name:'SD 1.5',                aliases:['Stable Diffusion 1.5'], category:'image-ai',        capabilities:['image-generation','inpainting','outpainting'],                  accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'CreativeML OpenRAIL', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/runwayml/stable-diffusion-v1-5', docsUrl:'https://huggingface.co/runwayml', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Lowest VRAM requirement. Good for many fine-tunes.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text','image'], outputTypes:['image'] },
  { providerId:'sd-35',               name:'SD 3.5',                aliases:['Stable Diffusion 3.5'], category:'image-ai',        capabilities:['image-generation','high-quality','mmdit'],                     accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Stability Community License', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/stabilityai/stable-diffusion-3.5-large', docsUrl:'https://huggingface.co/stabilityai', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Requires Stability AI account acceptance.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'kandinsky',           name:'Kandinsky',             aliases:['Kandinsky 3'],         category:'image-ai',         capabilities:['image-generation','multilingual','text-to-image'],             accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/kandinsky-community', docsUrl:'https://huggingface.co/kandinsky-community', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Good multilingual prompt support.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'pixart',              name:'PixArt',                aliases:['PixArt-alpha','PixArt-sigma'], category:'image-ai', capabilities:['image-generation','high-quality','efficient'],                 accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/PixArt-alpha/PixArt-sigma', docsUrl:'https://github.com/PixArt-alpha', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Efficient high-quality generation.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'openjourney',         name:'OpenJourney',           aliases:['Openjourney'],         category:'image-ai',         capabilities:['image-generation','midjourney-style','stylized'],              accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'CreativeML OpenRAIL', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/prompthero/openjourney', docsUrl:'https://huggingface.co/prompthero/openjourney', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'MidJourney-style aesthetics via SD 1.5.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  // Titles / stickers / motion
  { providerId:'videezy',             name:'Videezy',               aliases:[],                      category:'titles-stickers',  capabilities:['stock-video','motion-backgrounds','animated-elements'],         accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free tier',    fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://www.videezy.com', docsUrl:'https://www.videezy.com', whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'motion-elements', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Free account required. Attribution required on free plan.', pipelineMembership:['vn-asset-browser'], inputTypes:[], outputTypes:['video','image'] },
  { providerId:'motion-array',        name:'Motion Array',          aliases:[],                      category:'titles-stickers',  capabilities:['motion-graphics','templates','luts','presets','transitions'],   accessType:'paid-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:false, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Paid subscription', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://motionarray.com', docsUrl:'https://motionarray.com', whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'motion-elements', testAction:'none', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Paid subscription. After Effects / Premiere assets only.', pipelineMembership:[], inputTypes:[], outputTypes:['video','image'] }
];

// Merge extra providers into main list
_PROVIDERS_EXTRA.forEach(function(p) {
  var exists = _PROVIDERS.some(function(q){ return q.providerId === p.providerId; });
  if (!exists) _PROVIDERS.push(p);
});

// ─── EXTENDED SCHEMA META (adds new fields to existing providers) ─────────────
// Maps providerId to the additional fields from the expanded schema.
var _PROVIDER_META = {
  'ffmpeg-wasm':           { aliases:['FFmpeg WASM','ffmpeg.wasm'], isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://ffmpegwasm.netlify.app/docs',  license:'LGPL 2.1',       costLabel:'Free',         blockedReason:null, whereUsedInLoadStudio:['Editing Bay','Export Office','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'export-render',        testAction:'check-wasm-load',    settingsAction:'none',           useAsPrimary:true,  useAsFallback:false, notes:'Core render backend.', pipelineMembership:['vn-editing','export-pipeline','cinepwa-package'], inputTypes:['video','audio'], outputTypes:['video','audio'] },
  'web-audio-api':         { aliases:['WebAudio'],                  isFree:true,  isOpenSource:false, isLocal:true,  isBrowserNative:true,  isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API', license:'Platform API', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Editing Bay','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'audio-analysis', testAction:'check-browser-support', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'Always available.', pipelineMembership:['vn-editing','music-sfx-panel','tts-voice','stt-subtitle'], inputTypes:['audio'], outputTypes:['audio','waveform'] },
  'canvas-api':            { aliases:['Canvas 2D'],                 isFree:true,  isOpenSource:false, isLocal:true,  isBrowserNative:true,  isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API', license:'Platform API', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Editing Bay','Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'compositing', testAction:'check-browser-support', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'Core compositing layer.', pipelineMembership:['vn-editing','vn-asset-browser','music-sfx-panel','tts-voice','stt-subtitle','ai-image-glamour','commercial-image','comfyui-production','ai-video','lip-sync-avatar','cinepwa-package','load-play-publish'], inputTypes:['image','video'], outputTypes:['image','video'] },
  'webcodecs':             { aliases:['WebCodecs API'],             isFree:true,  isOpenSource:false, isLocal:true,  isBrowserNative:true,  isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API', license:'Platform API', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'decode-encode', testAction:'check-browser-support', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'Progressive enhancement where available.', pipelineMembership:['vn-editing','export-pipeline'], inputTypes:['video'], outputTypes:['video','frame'] },
  'remotion':              { aliases:[],                            isFree:false, isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://www.remotion.dev/docs', license:'Remotion License', costLabel:'Free for personal / paid for commercial', blockedReason:'Commercial license check required.', whereUsedInLoadStudio:['Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'programmatic-export', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'BLOCKED for commercial use until license confirmed.', pipelineMembership:['export-pipeline'], inputTypes:['react','text'], outputTypes:['video'] },
  'fabricjs':              { aliases:['Fabric.js'],                 isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'http://fabricjs.com/docs',      license:'MIT',            costLabel:'Free',         blockedReason:null, whereUsedInLoadStudio:['Editing Bay','Scene Workshop','Look Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'canvas-objects', testAction:'check-wasm-load', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['vn-editing'], inputTypes:['image','svg'], outputTypes:['image','canvas'] },
  'gsap':                  { aliases:['GreenSock'],                 isFree:true,  isOpenSource:false, isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://gsap.com/docs',         license:'GSAP Standard License', costLabel:'Free (standard)', blockedReason:null, whereUsedInLoadStudio:['Editing Bay','Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'title-animation', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'Free for most uses; some plugins need club membership.', pipelineMembership:['vn-editing'], inputTypes:['dom','svg'], outputTypes:['animation'] },
  'lottiefiles':           { aliases:['Lottie'],                   isFree:true,  isOpenSource:true,  isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://lottiefiles.com/learn', license:'MIT (player)',   costLabel:'Free (assets vary)', blockedReason:null, whereUsedInLoadStudio:['Editing Bay','Scene Workshop','Look Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'sticker-overlay', testAction:'check-network', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'Lottie player is MIT; individual assets have separate licenses.', pipelineMembership:['vn-editing'], inputTypes:['lottie-json'], outputTypes:['animation'] },
  'mediapipe':             { aliases:['Google MediaPipe'],         isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://developers.google.com/mediapipe', license:'Apache 2.0', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Character Lab','Look Lab','Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'background-removal', testAction:'check-wasm-load', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'', pipelineMembership:['bg-removal-pipeline'], inputTypes:['image','video'], outputTypes:['mask','image'] },
  'bg-removal-js':         { aliases:['imgly background removal'], isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://img.ly/products/background-removal', license:'MIT', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Character Lab','Look Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'background-removal', testAction:'check-wasm-load', settingsAction:'none', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['bg-removal-pipeline'], inputTypes:['image'], outputTypes:['image','mask'] },
  'whisper-wasm':          { aliases:['Whisper.cpp','whisper'],    isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://github.com/ggerganov/whisper.cpp', license:'MIT', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Voice Studio','Editing Bay','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'check-wasm-load', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'', pipelineMembership:['stt-subtitle','local-selfhosted-ai'], inputTypes:['audio'], outputTypes:['text','subtitle'] },
  'vosk':                  { aliases:[],                            isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://alphacephei.com/vosk/about', license:'Apache 2.0', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Voice Studio','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'check-wasm-load', settingsAction:'none', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  'moonshine':             { aliases:[],                            isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://github.com/usefulsensors/moonshine', license:'Apache 2.0', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'check-wasm-load', settingsAction:'none', useAsPrimary:false, useAsFallback:true, notes:'Optimised for edge/embedded.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  'faster-whisper':        { aliases:['CTranslate2 Whisper'],      isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://github.com/SYSTRAN/faster-whisper', license:'MIT', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Voice Studio','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['stt-subtitle','local-selfhosted-ai'], inputTypes:['audio'], outputTypes:['text'] },
  'browser-tts':           { aliases:['Web Speech API','SpeechSynthesis'], isFree:true, isOpenSource:false, isLocal:true, isBrowserNative:true, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis', license:'Platform API', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Voice Studio','Casting Department'], whereUsedInLoadEco:false, futureLoadAIUse:'voice-preview', testAction:'check-browser-support', settingsAction:'none', useAsPrimary:true, useAsFallback:true, notes:'Always-available voice fallback.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['audio'] },
  'kokoro':                { aliases:[],                            isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://github.com/hexgrad/kokoro', license:'Apache 2.0', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Voice Studio','Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'check-wasm-load', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'Best quality WASM TTS.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['audio'] },
  'piper':                 { aliases:[],                            isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://github.com/rhasspy/piper', license:'MIT', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'check-wasm-load', settingsAction:'none', useAsPrimary:false, useAsFallback:true, notes:'Lightweight, fast.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['audio'] },
  'chatterbox':            { aliases:[],                            isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://github.com/resemble-ai/chatterbox', license:'Apache 2.0', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'voice-clone', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text','audio'], outputTypes:['audio'] },
  'xtts':                  { aliases:['XTTS v2','Coqui XTTS'],    isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://github.com/coqui-ai/TTS', license:'MPL 2.0', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'voice-clone', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text','audio'], outputTypes:['audio'] },
  'bark':                  { aliases:['Suno Bark'],                 isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://github.com/suno-ai/bark', license:'MIT', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'expressive-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Slow but expressive.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['audio'] },
  'openvoice':             { aliases:['OpenVoice v2'],              isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://github.com/myshell-ai/OpenVoice', license:'MIT', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'voice-clone', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text','audio'], outputTypes:['audio'] },
  'dia':                   { aliases:['Nari Dia'],                  isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://github.com/nari-labs/dia', license:'Apache 2.0', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'dialogue-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Dialogue-optimised TTS.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['audio'] },
  'elevenlabs':            { aliases:['ElevenLabs API'],            isFree:false, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, docsUrl:'https://elevenlabs.io/docs', license:'Proprietary', costLabel:'Paid', blockedReason:null, whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'voice-clone', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'High quality; paid.', pipelineMembership:['tts-voice'], inputTypes:['text'], outputTypes:['audio'] },
  'pollinations-image':    { aliases:['Pollinations Flux'],         isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://pollinations.ai/docs', license:'CC0',          costLabel:'Free',         blockedReason:null, whereUsedInLoadStudio:['AI Image Director','Scene Workshop','Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-network-fetch', settingsAction:'none', useAsPrimary:true, useAsFallback:true, notes:'Best zero-config option.', pipelineMembership:['ai-image-glamour','commercial-image','vn-asset-browser'], inputTypes:['text'], outputTypes:['image'] },
  'aihorde':               { aliases:['Stable Horde'],              isFree:true,  isOpenSource:true,  isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://stablehorde.net/api', license:'AGPL 3.0', costLabel:'Free (kudos)', blockedReason:null, whereUsedInLoadStudio:['AI Image Director','Scene Workshop','Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-network-fetch', settingsAction:'set-optional-key', useAsPrimary:false, useAsFallback:true, notes:'Distributed compute. Slower but free.', pipelineMembership:['ai-image-glamour','commercial-image'], inputTypes:['text'], outputTypes:['image'] },
  'huggingface':           { aliases:['HuggingFace Inference API'],isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, docsUrl:'https://huggingface.co/docs/api-inference', license:'Various', costLabel:'Free tier', blockedReason:null, whereUsedInLoadStudio:['AI Image Director','Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  'comfyui':               { aliases:['ComfyUI Local'],             isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://github.com/comfyanonymous/ComfyUI/wiki', license:'GPL 3.0', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['AI Image Director','Scene Workshop','Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'workflow-orchestration', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:true, useAsFallback:false, notes:'Primary local image workflow engine.', pipelineMembership:['ai-image-glamour','comfyui-production','local-selfhosted-ai'], inputTypes:['text','image'], outputTypes:['image'] },
  'a1111':                 { aliases:['Automatic1111','SD WebUI'],  isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki', license:'AGPL 3.0', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['AI Image Director','Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['ai-image-glamour','local-selfhosted-ai'], inputTypes:['text','image'], outputTypes:['image'] },
  'draw-things':           { aliases:['Draw Things App'],           isFree:true,  isOpenSource:false, isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://drawthings.ai/docs', license:'Proprietary (free)', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'ipad-native-image-gen', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:true, useAsFallback:false, notes:'Best iPad-native option. Runs on device.', pipelineMembership:['ai-image-glamour','commercial-image','local-selfhosted-ai'], inputTypes:['text','image'], outputTypes:['image'] },
  'ollama':                { aliases:[],                            isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:true,  requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://ollama.com/library', license:'MIT', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Developer Lab','Scene Workshop','AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:true, useAsFallback:false, notes:'Primary local LLM server.', pipelineMembership:['openai-compat-routing','local-selfhosted-ai','story-pipeline','llm-pipeline'], inputTypes:['text'], outputTypes:['text'] },
  'lm-studio':             { aliases:['LMStudio'],                  isFree:true,  isOpenSource:false, isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:true,  requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://lmstudio.ai/docs', license:'Proprietary (free)', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Developer Lab','AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['openai-compat-routing','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['text'] },
  'localai':               { aliases:['LocalAI Server'],            isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:true,  requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://localai.io/basics', license:'MIT', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Developer Lab','AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Supports image, audio, text.', pipelineMembership:['openai-compat-routing','local-selfhosted-ai','tts-voice','stt-subtitle'], inputTypes:['text'], outputTypes:['text','audio','image'] },
  'litellm':               { aliases:['LiteLLM Proxy'],             isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:true,  requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://docs.litellm.ai', license:'MIT', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:true, useAsFallback:false, notes:'Recommended proxy/routing layer.', pipelineMembership:['openai-compat-routing','local-selfhosted-ai','story-pipeline'], inputTypes:['text'], outputTypes:['text'] },
  'openrouter':            { aliases:['OpenRouter API'],            isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:true,  requiresAccount:true,  requiresBackendProxy:false, docsUrl:'https://openrouter.ai/docs', license:'Proprietary', costLabel:'Free tier (some models)', blockedReason:null, whereUsedInLoadStudio:['Developer Lab','AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'Wide model selection; preferred cloud LLM route.', pipelineMembership:['openai-compat-routing','story-pipeline','ai-image-glamour','commercial-image'], inputTypes:['text'], outputTypes:['text'] },
  'pollinations-text':     { aliases:['Pollinations LLM'],          isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://pollinations.ai/docs', license:'CC0', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Developer Lab','Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'prompt-assist', testAction:'test-network-fetch', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'Zero-config cloud LLM.', pipelineMembership:['story-pipeline','ai-image-glamour','commercial-image','music-audio-gen'], inputTypes:['text'], outputTypes:['text'] },
  'openai':                { aliases:['OpenAI API','GPT-4'],        isFree:false, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:true,  requiresAccount:true,  requiresBackendProxy:false, docsUrl:'https://platform.openai.com/docs', license:'Proprietary', costLabel:'Paid', blockedReason:null, whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Paid; use OpenRouter for cost-effective routing.', pipelineMembership:['openai-compat-routing'], inputTypes:['text'], outputTypes:['text'] },
  'google-fonts':          { aliases:['Google Fonts API'],          isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://developers.google.com/fonts', license:'Various (OFL etc)', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Editing Bay','Look Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'title-design', testAction:'test-network-fetch', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'', pipelineMembership:['vn-editing'], inputTypes:['css'], outputTypes:['font'] },
  'bunny-fonts':           { aliases:['Bunny Fonts CDN'],           isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://fonts.bunny.net', license:'Various (OFL etc)', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Editing Bay','Look Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'title-design', testAction:'test-network-fetch', settingsAction:'none', useAsPrimary:false, useAsFallback:true, notes:'Privacy-friendly alternative to Google Fonts.', pipelineMembership:['vn-editing'], inputTypes:['css'], outputTypes:['font'] },
  'pexels':                { aliases:['Pexels API'],                isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, docsUrl:'https://www.pexels.com/api/documentation', license:'Pexels License', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Scene Workshop','AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'stock-media', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:true, useAsFallback:false, notes:'Pexels license allows commercial use.', pipelineMembership:['vn-asset-browser','stock-pipeline'], inputTypes:['query'], outputTypes:['image','video'] },
  'pixabay-stock':         { aliases:['Pixabay API'],               isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, docsUrl:'https://pixabay.com/api/docs', license:'Pixabay License', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Scene Workshop','AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'stock-media', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['vn-asset-browser','stock-pipeline'], inputTypes:['query'], outputTypes:['image','video'] },
  'freesound':             { aliases:['Freesound API'],             isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, docsUrl:'https://freesound.org/docs/api', license:'Various CC', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Editing Bay','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'sfx-library', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:true, useAsFallback:false, notes:'License varies per sound; check before commercial use.', pipelineMembership:['music-sfx-panel','stock-pipeline'], inputTypes:['query'], outputTypes:['audio'] },
  'pixabay-music':         { aliases:['Pixabay Music CDN'],         isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://pixabay.com/music', license:'Pixabay License', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Editing Bay','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'music-library', testAction:'test-network-fetch', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'Commercial safe.', pipelineMembership:['music-sfx-panel'], inputTypes:['query'], outputTypes:['audio'] },
  'mixkit-sfx':            { aliases:['Mixkit Sound Effects'],      isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://mixkit.co/license/', license:'Mixkit License', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Editing Bay','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'sfx-library', testAction:'test-network-fetch', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'Commercial safe.', pipelineMembership:['music-sfx-panel'], inputTypes:['query'], outputTypes:['audio'] },
  'bbc-sfx':               { aliases:['BBC SFX Library'],           isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://sound-effects.bbcrewind.co.uk/licensing', license:'RemArc', costLabel:'Free (personal/research)', blockedReason:'Non-commercial license. Not usable in commercial productions.', whereUsedInLoadStudio:[], whereUsedInLoadEco:false, futureLoadAIUse:'none', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'BLOCKED for commercial use.', pipelineMembership:[], inputTypes:[], outputTypes:['audio'] },
  'musicgen':              { aliases:['AudioCraft MusicGen'],       isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://github.com/facebookresearch/audiocraft', license:'CC-BY-NC 4.0', costLabel:'Free (non-commercial model)', blockedReason:null, whereUsedInLoadStudio:['Sound Stage','Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'music-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Model weights are non-commercial; library is MIT.', pipelineMembership:['music-audio-gen','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['audio'] },
  'supabase':              { aliases:['Supabase Cloud'],            isFree:true,  isOpenSource:true,  isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, docsUrl:'https://supabase.com/docs', license:'Apache 2.0', costLabel:'Free tier', blockedReason:null, whereUsedInLoadStudio:['Export Office','Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'cloud-save', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Optional cloud save layer.', pipelineMembership:['load-play-publish'], inputTypes:['project-data'], outputTypes:['cloud-storage'] },
  'indexeddb':             { aliases:['IDB','LocalIDB'],            isFree:true,  isOpenSource:false, isLocal:true,  isBrowserNative:true,  isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API', license:'Platform API', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Export Office','Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'draft-storage', testAction:'check-browser-support', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'Primary offline storage.', pipelineMembership:['cinepwa-package','load-play-publish'], inputTypes:['project-data'], outputTypes:['local-storage'] },
  'tonejs':                { aliases:['Tone.js'],                   isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, docsUrl:'https://tonejs.github.io/docs', license:'MIT', costLabel:'Free', blockedReason:null, whereUsedInLoadStudio:['Sound Stage','Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'audio-synthesis', testAction:'check-wasm-load', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['vn-editing'], inputTypes:['audio','midi'], outputTypes:['audio'] }
};

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
      var meta = _PROVIDER_META[p.providerId] || {};
      return Object.assign({}, p, meta, {
        status: _status[p.providerId] || p.status,
        websiteUrl: meta.websiteUrl || p.website || null,
        whereUsedInLoadStudio: meta.whereUsedInLoadStudio || p.usedIn || []
      });
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
LoadProviderRegistry.PROVIDER_META = _PROVIDER_META;
LoadProviderRegistry.getPipelineMembership = function (providerId) {
  if (typeof window.LoadPipelineRegistry !== 'undefined') {
    return window.LoadPipelineRegistry.getPipelineMembership(providerId);
  }
  var meta = _PROVIDER_META[providerId];
  return (meta && meta.pipelineMembership) || [];
};
window.LoadProviderRegistry = LoadProviderRegistry;

}());
