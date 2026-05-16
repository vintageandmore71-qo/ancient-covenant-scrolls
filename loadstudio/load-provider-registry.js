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
    category: 'music-gen',
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
    category: 'music-gen',
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
    category: 'music-gen',
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
    category: 'music-gen',
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
    category: 'music-gen',
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
    category: 'image-gen',
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
    category: 'image-gen',
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
    category: 'image-gen',
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
    category: 'image-gen',
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
    category: 'image-gen',
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
    category: 'image-gen',
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
    category: 'image-gen',
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
    category: 'image-gen',
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
    category: 'image-gen',
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
    category: 'image-gen',
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
    category: 'image-gen',
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
    category: 'video-gen',
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
    category: 'video-gen',
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
    category: 'video-gen',
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
    category: 'video-gen',
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
    category: 'video-gen',
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
    category: 'video-gen',
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
    category: 'video-gen',
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
    category: 'video-gen',
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
    category: 'video-gen',
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
  { providerId:'hidream',             name:'HiDream',               aliases:['HiDream-I1'],          category:'image-gen',         capabilities:['image-generation','high-quality'],                              accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'HiDream License',costLabel:'Free',        fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/HiDream-ai/HiDream-I1', docsUrl:'https://github.com/HiDream-ai/HiDream-I1', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'juggernaut-xl',       name:'Juggernaut XL',         aliases:[],                      category:'image-gen',         capabilities:['image-generation','photorealistic','sdxl-finetune'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'CreativeML',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://civitai.com/models/133005', docsUrl:'https://civitai.com/models/133005', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'SDXL photorealistic fine-tune.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'realvisxl',           name:'RealVisXL',             aliases:[],                      category:'image-gen',         capabilities:['image-generation','photorealistic','sdxl-finetune'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'CreativeML',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://civitai.com/models/139562', docsUrl:'https://civitai.com/models/139562', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'dreamshaper',         name:'DreamShaper',           aliases:[],                      category:'image-gen',         capabilities:['image-generation','stylized','sdxl-finetune'],                 accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'CreativeML',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://civitai.com/models/4384', docsUrl:'https://civitai.com/models/4384', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  // New TTS
  { providerId:'f5-tts',              name:'F5-TTS',                aliases:['F5 TTS','E2 TTS'],     category:'tts',              capabilities:['text-to-speech','voice-clone','zero-shot'],                    accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'MIT',          costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/SWivid/F5-TTS', docsUrl:'https://github.com/SWivid/F5-TTS', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Zero-shot voice cloning from short reference.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text','audio'], outputTypes:['audio'] },
  { providerId:'orpheus',             name:'Orpheus',               aliases:['Orpheus TTS'],         category:'tts',              capabilities:['text-to-speech','expressive','emotional'],                      accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/canopyai/Orpheus-TTS', docsUrl:'https://github.com/canopyai/Orpheus-TTS', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Highly expressive emotional TTS.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['audio'] },
  { providerId:'higgs-audio',         name:'Higgs Audio',           aliases:[],                      category:'tts',              capabilities:['text-to-speech','voice-clone','multilingual'],                  accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/boson-ai/higgs-audio', docsUrl:'https://github.com/boson-ai/higgs-audio', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text','audio'], outputTypes:['audio'] },
  { providerId:'chatterbox-turbo',    name:'Chatterbox Turbo',      aliases:[],                      category:'tts',              capabilities:['text-to-speech','voice-clone','fast'],                          accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/resemble-ai/chatterbox', docsUrl:'https://github.com/resemble-ai/chatterbox', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Faster variant of Chatterbox.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text','audio'], outputTypes:['audio'] },
  { providerId:'melo-tts',            name:'MeloTTS',               aliases:['MeloTTS'],             category:'tts',              capabilities:['text-to-speech','multilingual','fast-local'],                   accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8888', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/myshell-ai/MeloTTS', docsUrl:'https://github.com/myshell-ai/MeloTTS', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['tts-voice'], inputTypes:['text'], outputTypes:['audio'] },
  // New STT
  { providerId:'whisperx',            name:'WhisperX',              aliases:[],                      category:'stt',              capabilities:['speech-to-text','word-timestamps','diarization'],              accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'permitted', license:'BSD 2-Clause', costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/m-bain/whisperX', docsUrl:'https://github.com/m-bain/whisperX', whereUsedInLoadStudio:['Voice Studio','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Adds word-level timestamps and speaker diarization.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text','subtitle'] },
  { providerId:'nvidia-canary',       name:'NVIDIA Canary',         aliases:['Canary-1B'],           category:'stt',              capabilities:['speech-to-text','multilingual','high-accuracy'],               accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/nvidia/canary-1b', docsUrl:'https://huggingface.co/nvidia/canary-1b', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  { providerId:'qwen3-asr',           name:'Qwen3-ASR',             aliases:['Qwen ASR'],            category:'stt',              capabilities:['speech-to-text','multilingual'],                                accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Qwen License', costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/Qwen', docsUrl:'https://huggingface.co/Qwen', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  { providerId:'pyannote',            name:'pyannote.audio',        aliases:['pyannote'],            category:'stt',              capabilities:['speaker-diarization','voice-activity-detection'],              accessType:'local-endpoint',  requiresApiKey:true,  requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'MIT',          costLabel:'Free (HF token)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/pyannote/pyannote-audio', docsUrl:'https://github.com/pyannote/pyannote-audio', whereUsedInLoadStudio:['Voice Studio','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'speaker-id', testAction:'test-local-endpoint', settingsAction:'set-key-and-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Requires HuggingFace token to download model.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['diarization'] },
  // Audio generation
  { providerId:'stable-audio-open',   name:'Stable Audio Open',     aliases:[],                      category:'music-gen', capabilities:['music-generation','sfx-generation','ai-audio'],                accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Stability AI',costLabel:'Free',          fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/stabilityai/stable-audio-open-1.0', docsUrl:'https://huggingface.co/stabilityai/stable-audio-open-1.0', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'audio-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['music-audio-gen'], inputTypes:['text'], outputTypes:['audio'] },
  { providerId:'diffrhythm',          name:'DiffRhythm',            aliases:[],                      category:'music-gen', capabilities:['music-generation','structured-audio'],                          accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/ASLP-lab/DiffRhythm', docsUrl:'https://github.com/ASLP-lab/DiffRhythm', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'audio-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['music-audio-gen'], inputTypes:['text'], outputTypes:['audio'] },
  // Lip sync (extra)
  { providerId:'omnihuman',           name:'OmniHuman',             aliases:[],                      category:'lip-sync',         capabilities:['full-body-animation','lip-sync','gesture-driven'],             accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/ByteDance/OmniHuman-1', docsUrl:'https://github.com/ByteDance/OmniHuman-1', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'avatar-animation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['lip-sync-avatar'], inputTypes:['image','audio'], outputTypes:['video'] },
  { providerId:'geneface-pp',         name:'GeneFace++',            aliases:['GeneFace'],            category:'lip-sync',         capabilities:['talking-head','neural-radiance-field','lip-sync'],             accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/yerfor/GeneFacePlusPlus', docsUrl:'https://github.com/yerfor/GeneFacePlusPlus', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'avatar-animation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['lip-sync-avatar'], inputTypes:['image','audio'], outputTypes:['video'] },
  { providerId:'videoretalk',         name:'VideoReTalking',        aliases:[],                      category:'lip-sync',         capabilities:['lip-sync','video-reenactment'],                                 accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'MIT',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/OpenTalker/video-retalking', docsUrl:'https://github.com/OpenTalker/video-retalking', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'avatar-animation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['lip-sync-avatar'], inputTypes:['video','audio'], outputTypes:['video'] },
  // Local LLM routers (extra)
  { providerId:'jan',                 name:'Jan',                   aliases:[],                      category:'llm-local',        capabilities:['text-generation','chat','local-llm','openai-compatible'],      accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:1337/v1', isFree:true, isOpenSource:true, isLocal:true, isBrowserNative:false, isHosted:false, isOpenAICompatible:true, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'permitted', license:'Apache 2.0', costLabel:'Free', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://jan.ai', docsUrl:'https://jan.ai/docs', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Desktop LLM app, OpenAI-compatible.', pipelineMembership:['local-selfhosted-ai','openai-compat-routing'], inputTypes:['text'], outputTypes:['text'] },
  { providerId:'koboldcpp',           name:'Koboldcpp',             aliases:['KoboldCPP'],           category:'llm-local',        capabilities:['text-generation','chat','openai-compatible','gguf'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:5001',  isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:true,  requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'permitted', license:'AGPL 3.0',     costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/LostRuins/koboldcpp', docsUrl:'https://github.com/LostRuins/koboldcpp', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Single binary, runs GGUF models.', pipelineMembership:['local-selfhosted-ai'], inputTypes:['text'], outputTypes:['text'] },
  { providerId:'gpt4all',             name:'GPT4All',               aliases:[],                      category:'llm-local',        capabilities:['text-generation','chat','local-llm'],                          accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:4891/v1',isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:true,  requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://gpt4all.io', docsUrl:'https://docs.gpt4all.io', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['local-selfhosted-ai'], inputTypes:['text'], outputTypes:['text'] },
  // Cloud LLM
  { providerId:'cloudflare-workers-ai',name:'Cloudflare Workers AI',aliases:['CF Workers AI'],      category:'llm-cloud',        capabilities:['text-generation','image-generation','speech-to-text'],         accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.cloudflare.com/client/v4/accounts', isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:false, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free tier', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://developers.cloudflare.com/workers-ai', docsUrl:'https://developers.cloudflare.com/workers-ai', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'Good free tier fallback.', pipelineMembership:['openai-compat-routing'], inputTypes:['text'], outputTypes:['text','image'] },
  { providerId:'mistral',             name:'Mistral',               aliases:['Mistral AI'],          category:'llm-cloud',        capabilities:['text-generation','chat','vision'],                              accessType:'paid-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.mistral.ai/v1', isFree:false, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:true, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Paid', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://mistral.ai', docsUrl:'https://docs.mistral.ai', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['openai-compat-routing'], inputTypes:['text'], outputTypes:['text'] },
  // Streaming / video players
  { providerId:'peertube',            name:'PeerTube',              aliases:[],                      category:'streaming',        capabilities:['video-hosting','fediverse','self-hosted'],                     accessType:'free-no-key',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:true, isLocal:false, isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'self-hosted', licenseRisk:'low', commercialUseStatus:'check-required', license:'AGPL 3.0', costLabel:'Free (self-hosted)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://joinpeertube.org', docsUrl:'https://docs.joinpeertube.org', whereUsedInLoadStudio:['Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'publishing', testAction:'none', settingsAction:'set-instance-url', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['load-play-publish'], inputTypes:['video'], outputTypes:['stream-url'] },
  { providerId:'mediacms',            name:'MediaCMS',              aliases:[],                      category:'streaming',        capabilities:['video-hosting','self-hosted'],                                  accessType:'free-no-key',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:true, isLocal:false, isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'self-hosted', licenseRisk:'low', commercialUseStatus:'permitted', license:'AGPL 3.0', costLabel:'Free (self-hosted)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://mediacms.io', docsUrl:'https://mediacms.io', whereUsedInLoadStudio:['Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'publishing', testAction:'none', settingsAction:'set-instance-url', useAsPrimary:false, useAsFallback:true, notes:'', pipelineMembership:['load-play-publish'], inputTypes:['video'], outputTypes:['stream-url'] },
  { providerId:'owncast',             name:'Owncast',               aliases:[],                      category:'streaming',        capabilities:['live-streaming','self-hosted'],                                 accessType:'free-no-key',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:true, isLocal:false, isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'self-hosted', licenseRisk:'low', commercialUseStatus:'permitted', license:'MIT', costLabel:'Free (self-hosted)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://owncast.online', docsUrl:'https://owncast.online/docs', whereUsedInLoadStudio:['Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'publishing', testAction:'none', settingsAction:'set-instance-url', useAsPrimary:false, useAsFallback:false, notes:'Live streaming only.', pipelineMembership:['load-play-publish'], inputTypes:['video'], outputTypes:['stream-url'] },
  { providerId:'videojs',             name:'Video.js',              aliases:[],                      category:'player',           capabilities:['video-playback','browser-player','hls'],                       accessType:'wasm',            requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:true, isLocal:true, isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'permitted', license:'Apache 2.0', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://videojs.com', docsUrl:'https://docs.videojs.com', whereUsedInLoadStudio:['Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'playback', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['vn-editing'], inputTypes:['video'], outputTypes:['playback'] },
  // Browser APIs
  { providerId:'file-api',            name:'File API',              aliases:['File System Access'],  category:'editing',          capabilities:['file-read','file-write','directory-access'],                   accessType:'browser-api',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:false, isLocal:true, isBrowserNative:true, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'permitted', license:'Platform API', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://developer.mozilla.org/en-US/docs/Web/API/File_API', docsUrl:'https://developer.mozilla.org/en-US/docs/Web/API/File_API', whereUsedInLoadStudio:['Editing Bay','Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'file-io', testAction:'check-browser-support', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'', pipelineMembership:['vn-editing','cinepwa-package'], inputTypes:['file'], outputTypes:['file'] },
  { providerId:'mediarecorder-api',   name:'MediaRecorder API',     aliases:['MediaRecorder'],       category:'editing',          capabilities:['audio-record','video-record','screen-capture'],                accessType:'browser-api',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:false, isLocal:true, isBrowserNative:true, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'permitted', license:'Platform API', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder', docsUrl:'https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder', whereUsedInLoadStudio:['Editing Bay','Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'recording', testAction:'check-browser-support', settingsAction:'none', useAsPrimary:true, useAsFallback:false, notes:'Used for canvas-to-video recording in Create Blank flow.', pipelineMembership:['vn-editing','tts-voice'], inputTypes:['stream'], outputTypes:['video','audio'] },
  { providerId:'webgl',               name:'WebGL',                 aliases:['WebGL2'],              category:'editing',          capabilities:['gpu-render','shader','compositing'],                            accessType:'browser-api',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:false, isLocal:true, isBrowserNative:true, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'permitted', license:'Platform API', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API', docsUrl:'https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API', whereUsedInLoadStudio:['Editing Bay','Look Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'gpu-acceleration', testAction:'check-browser-support', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'', pipelineMembership:['vn-editing'], inputTypes:['canvas'], outputTypes:['canvas'] },

  // ─── PROVIDERS FROM CLAUDE.md AUDIT — added 2026-05-15 ────────────────────
  // Audio separation
  { providerId:'spleeter',            name:'Spleeter',              aliases:['Deezer Spleeter'],     category:'music-gen', capabilities:['stem-separation','audio-split','2-stem','4-stem','5-stem'],    accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'MIT',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/deezer/spleeter', docsUrl:'https://github.com/deezer/spleeter', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'audio-separation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Stem separation: vocals, drums, bass, other. Companion to Demucs.', pipelineMembership:['music-audio-gen','local-selfhosted-ai'], inputTypes:['audio'], outputTypes:['audio'] },
  // TTS framework
  { providerId:'coqui',               name:'Coqui TTS',             aliases:['Coqui','TTS by Coqui'],'category':'tts',            capabilities:['text-to-speech','voice-clone','multilingual'],                  accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:5002', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'MPL 2.0',      costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/coqui-ai/TTS', docsUrl:'https://tts.readthedocs.io', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Coqui TTS framework — XTTS is a Coqui model. Use this entry for the base server.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['audio'] },
  // Local LLM runtime
  { providerId:'llama-cpp',           name:'llama.cpp',             aliases:['llama-cpp-python'],    category:'llm-local',        capabilities:['text-generation','chat','gguf','local-llm','openai-compatible'], accessType:'local-endpoint', requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8080/v1', isFree:true, isOpenSource:true, isLocal:true, isBrowserNative:false, isHosted:false, isOpenAICompatible:true, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'permitted', license:'MIT', costLabel:'Free', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://github.com/ggml-org/llama.cpp', docsUrl:'https://github.com/ggml-org/llama.cpp', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'GGUF inference backend. Runs via CLI or llama-cpp-python server.', pipelineMembership:['local-selfhosted-ai','openai-compat-routing'], inputTypes:['text'], outputTypes:['text'] },
  // AI Image models (declared — run via ComfyUI / A1111 / Forge backends)
  { providerId:'flux',                name:'FLUX',                  aliases:['FLUX.1','FLUX Dev','FLUX Schnell'], category:'image-gen', capabilities:['image-generation','high-quality','distilled'],                accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'medium', commercialUseStatus:'check-required',  license:'FLUX License', costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/black-forest-labs/FLUX.1-dev', docsUrl:'https://huggingface.co/black-forest-labs', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Runs via ComfyUI, A1111 or Forge. FLUX.1-dev: non-commercial. FLUX.1-schnell: Apache 2.0.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'sdxl',                name:'SDXL',                  aliases:['Stable Diffusion XL'], category:'image-gen',         capabilities:['image-generation','sdxl','high-resolution'],                   accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'CreativeML OpenRAIL', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0', docsUrl:'https://huggingface.co/stabilityai', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Runs via ComfyUI or A1111.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text','image'], outputTypes:['image'] },
  { providerId:'sd-15',               name:'SD 1.5',                aliases:['Stable Diffusion 1.5'], category:'image-gen',        capabilities:['image-generation','inpainting','outpainting'],                  accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'CreativeML OpenRAIL', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/runwayml/stable-diffusion-v1-5', docsUrl:'https://huggingface.co/runwayml', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Lowest VRAM requirement. Good for many fine-tunes.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text','image'], outputTypes:['image'] },
  { providerId:'sd-35',               name:'SD 3.5',                aliases:['Stable Diffusion 3.5'], category:'image-gen',        capabilities:['image-generation','high-quality','mmdit'],                     accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Stability Community License', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/stabilityai/stable-diffusion-3.5-large', docsUrl:'https://huggingface.co/stabilityai', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Requires Stability AI account acceptance.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'kandinsky',           name:'Kandinsky',             aliases:['Kandinsky 3'],         category:'image-gen',         capabilities:['image-generation','multilingual','text-to-image'],             accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/kandinsky-community', docsUrl:'https://huggingface.co/kandinsky-community', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Good multilingual prompt support.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'pixart',              name:'PixArt',                aliases:['PixArt-alpha','PixArt-sigma'], category:'image-gen', capabilities:['image-generation','high-quality','efficient'],                 accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/PixArt-alpha/PixArt-sigma', docsUrl:'https://github.com/PixArt-alpha', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Efficient high-quality generation.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'openjourney',         name:'OpenJourney',           aliases:['Openjourney'],         category:'image-gen',         capabilities:['image-generation','midjourney-style','stylized'],              accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'CreativeML OpenRAIL', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/prompthero/openjourney', docsUrl:'https://huggingface.co/prompthero/openjourney', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'MidJourney-style aesthetics via SD 1.5.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  // Titles / stickers / motion
  { providerId:'videezy',             name:'Videezy',               aliases:[],                      category:'titles-stickers',  capabilities:['stock-video','motion-backgrounds','animated-elements'],         accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free tier',    fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://www.videezy.com', docsUrl:'https://www.videezy.com', whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'motion-elements', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Free account required. Attribution required on free plan.', pipelineMembership:['vn-asset-browser'], inputTypes:[], outputTypes:['video','image'] },
  { providerId:'motion-array',        name:'Motion Array',          aliases:[],                      category:'titles-stickers',  capabilities:['motion-graphics','templates','luts','presets','transitions'],   accessType:'paid-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:false, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Paid subscription', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://motionarray.com', docsUrl:'https://motionarray.com', whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'motion-elements', testAction:'none', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Paid subscription. After Effects / Premiere assets only.', pipelineMembership:[], inputTypes:[], outputTypes:['video','image'] },

  // ─── PROVIDERS FROM INBOX DOCS — added 2026-05-15 ────────────────────────────
  // Cloud LLM — permanent free tiers (no credit card)
  { providerId:'gemini',              name:'Gemini',                aliases:['Google Gemini','Gemini Flash','Gemini Pro','Google AI Studio'], category:'llm-cloud', capabilities:['text-generation','chat','vision','image-generation','audio','multimodal'], accessType:'free-api-key', requiresApiKey:true, requiresLocalEndpoint:false, defaultEndpoint:'https://generativelanguage.googleapis.com/v1beta', isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:true, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free (1500 req/day Flash)', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://aistudio.google.com', docsUrl:'https://ai.google.dev/docs', whereUsedInLoadStudio:['Developer Lab','AI Image Director','Director AI'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'1500 req/day Gemini 2.0 Flash free. Multimodal: text/image/audio/video. Also has OpenAI-compat endpoint. Imagen 4 for images.', pipelineMembership:['openai-compat-routing','ai-image-glamour'], inputTypes:['text','image','audio'], outputTypes:['text','image'] },
  { providerId:'groq',                name:'Groq',                  aliases:['Groq Cloud','Groq LPU'], category:'llm-cloud',       capabilities:['text-generation','chat','speech-to-text','fast-inference'],     accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.groq.com/openai/v1', isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:true, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free (~6000 req/day)', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://console.groq.com', docsUrl:'https://console.groq.com/docs', whereUsedInLoadStudio:['Developer Lab','Director AI'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'Fastest free inference. LPU hardware. 300-800 tok/s. Llama 3.3 70B, Mixtral, Gemma. OpenAI-compat.', pipelineMembership:['openai-compat-routing'], inputTypes:['text'], outputTypes:['text'] },
  { providerId:'cerebras',            name:'Cerebras',              aliases:['Cerebras Inference'],  category:'llm-cloud',        capabilities:['text-generation','chat','fast-inference'],                     accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.cerebras.ai/v1', isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:true, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free (1M tokens/day)', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://cloud.cerebras.ai', docsUrl:'https://inference-docs.cerebras.ai', whereUsedInLoadStudio:['Developer Lab','Director AI'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'2600+ tok/s. 1M tokens/day free. Llama 3.3 70B. OpenAI-compat.', pipelineMembership:['openai-compat-routing'], inputTypes:['text'], outputTypes:['text'] },
  { providerId:'sambanova',           name:'SambaNova',             aliases:['SambaNova Cloud'],     category:'llm-cloud',        capabilities:['text-generation','chat','large-models'],                       accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://fast-api.snova.ai/v1', isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:true, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free tier', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://cloud.sambanova.ai', docsUrl:'https://cloud.sambanova.ai/apis', whereUsedInLoadStudio:['Developer Lab','Director AI'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'Llama 3.1 405B, DeepSeek R1, Qwen. RDU architecture. OpenAI-compat.', pipelineMembership:['openai-compat-routing'], inputTypes:['text'], outputTypes:['text'] },
  { providerId:'nvidia-nim',          name:'NVIDIA NIM',            aliases:['NIM','NVIDIA Inference Microservices'], category:'llm-cloud', capabilities:['text-generation','chat','vision','audio','scientific'],     accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://integrate.api.nvidia.com/v1', isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:true, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free (1000 credits signup)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://build.nvidia.com', docsUrl:'https://docs.api.nvidia.com', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'91 free endpoints. DeepSeek, Llama, Kimi, vision + biology models. Docker containers for self-host.', pipelineMembership:['openai-compat-routing'], inputTypes:['text','image'], outputTypes:['text'] },
  { providerId:'cohere',              name:'Cohere',                aliases:['Cohere AI'],           category:'llm-cloud',        capabilities:['text-generation','chat','embeddings','rerank','rag'],           accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.cohere.com/v2', isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:false, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free (1000 calls/month)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://cohere.com', docsUrl:'https://docs.cohere.com', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Best free RAG pipeline. Embeddings + reranking + generation in one SDK.', pipelineMembership:['openai-compat-routing'], inputTypes:['text'], outputTypes:['text'] },
  { providerId:'fireworks-ai',        name:'Fireworks AI',          aliases:['Fireworks'],           category:'llm-cloud',        capabilities:['text-generation','chat','fast-inference','structured-output'],  accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.fireworks.ai/inference/v1', isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:true, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free (10 RPM no card)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://fireworks.ai', docsUrl:'https://readme.fireworks.ai/docs', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Fastest structured output. Llama 3.1 405B, DeepSeek R1. OpenAI-compat.', pipelineMembership:['openai-compat-routing'], inputTypes:['text'], outputTypes:['text'] },
  { providerId:'aiml-api',            name:'AI/ML API',             aliases:['AIML API'],            category:'llm-cloud',        capabilities:['text-generation','image-generation','speech-to-text','multi-model'], accessType:'free-api-key', requiresApiKey:true, requiresLocalEndpoint:false, defaultEndpoint:'https://api.aimlapi.com/v1', isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:true, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free tier', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://aimlapi.com', docsUrl:'https://docs.aimlapi.com', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'400+ models aggregated in one API. OpenAI-compat routing.', pipelineMembership:['openai-compat-routing'], inputTypes:['text','image'], outputTypes:['text','image'] },

  // Image models — high-tier (local / self-hosted)
  { providerId:'flux-2-dev',          name:'FLUX.2 Dev',            aliases:['FLUX 2','FLUX.2'],     category:'image-gen',         capabilities:['image-generation','photorealistic','s-tier','multi-reference'], accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'medium', commercialUseStatus:'non-commercial', license:'FLUX open weights (non-commercial)', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/black-forest-labs/flux', docsUrl:'https://github.com/black-forest-labs/flux', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'S-Tier 2026. Rivals MidJourney v7 on photorealism. 16GB VRAM. Non-commercial.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text','image'], outputTypes:['image'] },
  { providerId:'flux-1-schnell',      name:'FLUX.1 Schnell',        aliases:['FLUX Schnell','FLUX Fast'], category:'image-gen',    capabilities:['image-generation','fast-inference','commercial-safe'],         accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'permitted', license:'Apache 2.0', costLabel:'Free', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/black-forest-labs/FLUX.1-schnell', docsUrl:'https://huggingface.co/black-forest-labs', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Apache 2.0 — fully commercial safe. Sub-2s generation. 8GB VRAM. Best for pipelines.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'sana-sprint',         name:'SANA-Sprint',           aliases:['SANA Sprint 1.6B'],    category:'image-gen',         capabilities:['image-generation','fast-inference','low-vram'],                accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'permitted', license:'Apache 2.0', costLabel:'Free', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/Efficient-Large-Model/Sana_Sprint_1.6B_1024px_MultiLing_diffusers', docsUrl:'https://huggingface.co/Efficient-Large-Model', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'NVIDIA Research. 6GB VRAM. Fastest open generation. Apache 2.0 commercial.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'reve-image',          name:'Reve Image',            aliases:['Reve Image 1.0'],      category:'image-gen',         capabilities:['image-generation','s-tier','prompt-adherence'],                accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'check-required', license:'Open weights', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/reve-image', docsUrl:'https://huggingface.co/reve-image', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Top prompt-adherence leaderboard 2026. S-tier quality.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'hunyuan-image',       name:'HunyuanImage',          aliases:['HunyuanImage 3.0'],    category:'image-gen',         capabilities:['image-generation','complex-scenes','long-prompts'],            accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'check-required', license:'Open', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/tencent/HunyuanImage', docsUrl:'https://huggingface.co/tencent/HunyuanImage', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Tencent. 80B MoE architecture, 13B active. Handles complex multi-element scenes. 24GB+ VRAM.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'qwen-image',          name:'Qwen Image',            aliases:['Qwen Image Max 2512'], category:'image-gen',         capabilities:['image-generation','text-in-image','multilingual'],             accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'check-required', license:'Qwen License', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/Qwen', docsUrl:'https://huggingface.co/Qwen', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Alibaba. Superior legible text in images. Best open-source text-in-image. 16GB VRAM.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'fibo',                name:'FIBO',                  aliases:['Bria AI FIBO'],        category:'image-gen',         capabilities:['image-generation','structured-control','commercial-safe'],      accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'permitted', license:'Commercial-safe (trained on licensed data)', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://bria.ai', docsUrl:'https://bria.ai/docs', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Bria AI. JSON-native structured control: camera, lighting, depth. Trained on licensed data only.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'lcm',                 name:'LCM',                   aliases:['Latent Consistency Model','LCM-LoRA'], category:'image-gen', capabilities:['image-generation','fast-inference','sd-compatible'],     accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'permitted', license:'MIT', costLabel:'Free', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://github.com/luosialen/latent-consistency-model', docsUrl:'https://huggingface.co/SimianLuo/LCM_Dreamshaper_v7', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'MIT license. 4-8 step generation. Based on SD fine-tuning. Extremely fast. 6GB VRAM.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'instaflow',           name:'InstaFlow',             aliases:['InstaFlow one-step'],  category:'image-gen',         capabilities:['image-generation','one-step','fast-inference'],                accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'permitted', license:'MIT', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/gaosilas/instaflow', docsUrl:'https://github.com/gaosilas/instaflow', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'MIT. One-step text-to-image. Near-instant generation on capable GPU.', pipelineMembership:['comfyui-production'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'deepfloyd-if',        name:'DeepFloyd IF',          aliases:['DeepFloyd'],           category:'image-gen',         capabilities:['image-generation','cascaded-diffusion','text-in-image'],       accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'non-commercial', license:'Stability AI non-commercial', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/deep-floyd/IF', docsUrl:'https://github.com/deep-floyd/IF', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Cascaded pixel-space diffusion. Strong text in images. Non-commercial only.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'wuerstchen',          name:'Wurstchen',             aliases:['Wuerstchen','Würstchen'], category:'image-gen',       capabilities:['image-generation','efficient','low-compute'],                  accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'permitted', license:'MIT', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/warp-ai/wuerstchen', docsUrl:'https://huggingface.co/warp-ai/wuerstchen', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'MIT. Extremely compute-efficient. Runs on consumer hardware.', pipelineMembership:['comfyui-production'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'dalle-mini',          name:'DALL-E Mini',           aliases:['Craiyon','dalle-mini'], category:'image-gen',        capabilities:['image-generation','cpu-friendly','free-hosted'],               accessType:'free-no-key',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:'https://backend.craiyon.com', isFree:true, isOpenSource:true, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'none', commercialUseStatus:'permitted', license:'Apache 2.0', costLabel:'Free', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://www.craiyon.com', docsUrl:'https://github.com/borisdayma/dalle-mini', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-no-key', settingsAction:'none', useAsPrimary:false, useAsFallback:true, notes:'Apache 2.0. Runs on CPU. Lower quality. Good as zero-config fallback.', pipelineMembership:['commercial-image'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'sd-35-medium',        name:'SD 3.5 Medium',         aliases:['Stable Diffusion 3.5 Medium'], category:'image-gen', capabilities:['image-generation','lower-vram','sd35-compatible'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'check-required', license:'Stability Community License', costLabel:'Free', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://github.com/Stability-AI/generative-models', docsUrl:'https://huggingface.co/stabilityai', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Lighter SD3.5 variant. 8GB VRAM. Faster inference. All SD ecosystem tools compatible.', pipelineMembership:['ai-image-glamour','comfyui-production'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'seedream',            name:'Seedream',              aliases:['Seedream 5.0'],        category:'image-gen',         capabilities:['image-generation','photorealistic'],                            accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'check-required', license:'Open weights', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/ByteDance-Seed', docsUrl:'https://huggingface.co/ByteDance-Seed', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'ByteDance. Seedream 5.0.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'playground-v25',      name:'Playground v2.5',       aliases:['Playground 2.5'],      category:'image-gen',         capabilities:['image-generation','aesthetic','sdxl-compatible'],              accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'check-required', license:'Playground Community License', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/playgroundai/playground-v2.5-1024px-aesthetic', docsUrl:'https://huggingface.co/playgroundai', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Strong aesthetic quality. SDXL-compatible.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },

  // Glamour fine-tunes
  { providerId:'awportrait-fl',       name:'AWPortrait-FL',         aliases:['AW Portrait FLUX'],    category:'image-gen',         capabilities:['image-generation','portrait','flux-finetune','glamour'],       accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'medium', commercialUseStatus:'check-required', license:'FLUX non-commercial base', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://civitai.com', docsUrl:'https://civitai.com', whereUsedInLoadStudio:['AI Image Director','Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'FLUX.1-dev fine-tune for glamour portrait photography.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'epicrealism-xl',      name:'EpicRealism XL',        aliases:['Epic Realism XL'],     category:'image-gen',         capabilities:['image-generation','photorealistic','sdxl-finetune','glamour'],  accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'check-required', license:'CreativeML', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://civitai.com/models/277058', docsUrl:'https://civitai.com/models/277058', whereUsedInLoadStudio:['AI Image Director','Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'SDXL glamour portrait fine-tune.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'cyberrealistic-xl',   name:'CyberRealistic XL',     aliases:['Cyber Realistic XL'],  category:'image-gen',         capabilities:['image-generation','photorealistic','sdxl-finetune'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8188', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'low', commercialUseStatus:'check-required', license:'CreativeML', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://civitai.com', docsUrl:'https://civitai.com', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'SDXL photorealistic fine-tune.', pipelineMembership:['ai-image-glamour'], inputTypes:['text'], outputTypes:['image'] },

  // Hosted image (free, no GPU required)
  { providerId:'pixazo',              name:'Pixazo',                aliases:['Pixazo FLUX API'],     category:'image-gen',         capabilities:['image-generation','flux-hosted','free-api'],                   accessType:'free-no-key',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:'https://api.pixazo.com', isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free tier', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://pixazo.com', docsUrl:'https://pixazo.com/api', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-no-key', settingsAction:'none', useAsPrimary:false, useAsFallback:true, notes:'Free FLUX image API. No GPU required.', pipelineMembership:['commercial-image'], inputTypes:['text'], outputTypes:['image'] },

  // TTS — hosted free tier
  { providerId:'fish-audio',          name:'Fish Audio',            aliases:['Fish TTS'],            category:'tts',              capabilities:['text-to-speech','voice-clone','emotion-control'],               accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.fish.audio/v1', isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:false, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free tier', fallbackEligible:true, status:'untested', blockedReason:null, websiteUrl:'https://fish.audio', docsUrl:'https://docs.fish.audio', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'TTS + voice cloning. Free tier available.', pipelineMembership:['tts-voice'], inputTypes:['text','audio'], outputTypes:['audio'] },

  // Video generation — hosted free
  { providerId:'zsky',                name:'ZSky',                  aliases:['ZSky AI'],             category:'video-gen',        capabilities:['video-generation','text-to-video','free-hosted'],              accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:false, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free tier', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://zsky.ai', docsUrl:'https://zsky.ai/docs', whereUsedInLoadStudio:['Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'video-generation', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Free-tier video generation API.', pipelineMembership:['ai-video'], inputTypes:['text','image'], outputTypes:['video'] },

  // Audio / SFX generation
  { providerId:'gensfx',              name:'GenSFX',                aliases:['Gen SFX'],             category:'sfx-generation',   capabilities:['sfx-generation','audio-generation','prompt-to-sfx'],           accessType:'free-no-key',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free tier', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://www.gensfx.com', docsUrl:'https://www.gensfx.com', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'sfx-generation', testAction:'test-no-key', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'AI SFX generation from text prompts.', pipelineMembership:['music-audio-gen'], inputTypes:['text'], outputTypes:['audio'] },

  // Location / map overlay
  { providerId:'mapbox',              name:'Mapbox',                aliases:[],                      category:'overlay',          capabilities:['map-overlay','location','geolocation-ui'],                     accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.mapbox.com', isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:false, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free (50k tiles/month)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://mapbox.com', docsUrl:'https://docs.mapbox.com', whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'location-overlay', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Location overlay and map visuals. Free tier 50k tiles/month.', pipelineMembership:['vn-asset-browser'], inputTypes:[], outputTypes:['image','overlay'] },

  // Color / LUT tools
  { providerId:'uncut-video',         name:'Uncut.video LUTs',      aliases:['Uncut Video'],         category:'color-grading',    capabilities:['lut-files','color-grade','free-download'],                     accessType:'free-no-key',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'none', commercialUseStatus:'permitted', license:'Free', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://uncut.video', docsUrl:'https://uncut.video', whereUsedInLoadStudio:['Editing Bay','Look Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'color-grade', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'Free downloadable colour grade LUT packs.', pipelineMembership:['vn-editing'], inputTypes:[], outputTypes:['lut'] },

  // ─── PROVIDERS FROM Free_OpenSource_AI_Providers_2026.docx — added 2026-05-15 ─

  // TTS — additional open-source models
  { providerId:'voxtral',             name:'Voxtral',               aliases:['Mistral TTS'],         category:'tts',              capabilities:['text-to-speech','voice-clone','zero-shot','multilingual'],      accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'medium', commercialUseStatus:'non-commercial',  license:'CC BY-NC',     costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/mistralai', docsUrl:'https://huggingface.co/mistralai', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Mistral AI. 4B, 70ms latency, 9x realtime, zero-shot 3s cloning, 9 languages. CC BY-NC = non-commercial only.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text','audio'], outputTypes:['audio'] },
  { providerId:'neutts-air',          name:'NeuTTS Air',            aliases:['Neuphonic NeuTTS'],    category:'tts',              capabilities:['text-to-speech','on-device','edge','voice-clone'],             accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Open',         costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://neuphonic.com', docsUrl:'https://neuphonic.com', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'0.5B backbone, runs on Raspberry Pi / mobile. GGUF/GGML format. Clones voice from 3s audio.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text','audio'], outputTypes:['audio'] },
  { providerId:'tortoise-tts',        name:'Tortoise TTS',          aliases:['Tortoise'],            category:'tts',              capabilities:['text-to-speech','high-quality','audiobook'],                   accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/neonbjb/tortoise-tts', docsUrl:'https://github.com/neonbjb/tortoise-tts', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Very high quality. Slow (10 min per 10s audio). Best for audiobooks. Diffusion-based prosody.', pipelineMembership:['tts-voice'], inputTypes:['text','audio'], outputTypes:['audio'] },
  { providerId:'valle-x',             name:'VALL-E X',              aliases:['VALLEX'],              category:'tts',              capabilities:['text-to-speech','cross-lingual','voice-clone'],                accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Open research',costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/microsoft/unilm', docsUrl:'https://github.com/microsoft/unilm', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Microsoft Research. Cross-lingual voice cloning. Preserves identity across languages.', pipelineMembership:['tts-voice'], inputTypes:['text','audio'], outputTypes:['audio'] },
  { providerId:'styletts2',           name:'StyleTTS2',             aliases:['Style TTS 2'],         category:'tts',              capabilities:['text-to-speech','style-diffusion','high-naturalness'],         accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/yl4579/StyleTTS2', docsUrl:'https://github.com/yl4579/StyleTTS2', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'MIT. Style diffusion. Human-level naturalness on LJSpeech benchmarks.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['audio'] },
  { providerId:'vits',                name:'VITS',                  aliases:['VITS TTS'],            category:'tts',              capabilities:['text-to-speech','end-to-end','fast-inference'],                accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/jaywalnut310/vits', docsUrl:'https://github.com/jaywalnut310/vits', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'MIT. End-to-end TTS with flow-based model. Natural prosody. Fast inference.', pipelineMembership:['tts-voice'], inputTypes:['text'], outputTypes:['audio'] },
  { providerId:'emotivoice',          name:'EmotiVoice',            aliases:['Emoti Voice'],         category:'tts',              capabilities:['text-to-speech','emotion-control','multilingual'],             accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/netease-youdao/EmotiVoice', docsUrl:'https://github.com/netease-youdao/EmotiVoice', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'NetEase Youdao. Apache 2.0. Controllable emotion, 2000+ voices, Chinese and English.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['audio'] },
  { providerId:'kokoclone',           name:'KokoClone',             aliases:['Koko Clone'],          category:'tts',              capabilities:['text-to-speech','voice-clone','multilingual','fast'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/hexgrad', docsUrl:'https://huggingface.co/hexgrad', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'Multilingual voice cloning built on Kokoro-ONNX. 3-10s reference audio. CPU-friendly.', pipelineMembership:['tts-voice','local-selfhosted-ai'], inputTypes:['text','audio'], outputTypes:['audio'] },
  { providerId:'voicebox-app',        name:'Voicebox App',          aliases:['Voicebox Desktop'],    category:'tts',              capabilities:['text-to-speech','multi-engine','local-first','desktop-app'],    accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/jamiepine/voicebox', docsUrl:'https://github.com/jamiepine/voicebox', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'MIT. Desktop app. 7 TTS engines (Kokoro, Chatterbox, Qwen3-TTS, LuxTTS, HumeAI). 23 languages. Nothing leaves machine.', pipelineMembership:['tts-voice'], inputTypes:['text'], outputTypes:['audio'] },
  { providerId:'esptts',              name:'ESPnet-TTS',            aliases:['ESPnet TTS'],          category:'tts',              capabilities:['text-to-speech','full-toolkit','fastSpeech','vits'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/espnet/espnet', docsUrl:'https://github.com/espnet/espnet', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'character-voice', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Full speech processing toolkit. FastSpeech2, VITS, Conformer TTS.', pipelineMembership:['tts-voice'], inputTypes:['text'], outputTypes:['audio'] },

  // STT — additional models
  { providerId:'whisper-v3-turbo',    name:'Whisper V3 Turbo',      aliases:['Whisper Large V3 Turbo'], category:'stt',          capabilities:['speech-to-text','multilingual','fast','99-languages'],          accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/openai/whisper', docsUrl:'https://github.com/openai/whisper', whereUsedInLoadStudio:['Voice Studio','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'OpenAI. MIT. 6x faster than Whisper V3 by reducing decoder layers. 809M params. Within 1-2% accuracy.', pipelineMembership:['stt-subtitle','local-selfhosted-ai'], inputTypes:['audio'], outputTypes:['text','subtitle'] },
  { providerId:'distil-whisper',      name:'Distil-Whisper',        aliases:['Distil Whisper'],      category:'stt',              capabilities:['speech-to-text','fast','distilled','english'],                  accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/huggingface/distil-whisper', docsUrl:'https://github.com/huggingface/distil-whisper', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'MIT. Hugging Face distillation of Whisper V3. 6x faster. 756M params. Within 1% WER.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  { providerId:'ibm-granite-speech',  name:'IBM Granite Speech',    aliases:['Granite Speech 3.3'],  category:'stt',              capabilities:['speech-to-text','enterprise','high-accuracy'],                  accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/ibm-granite', docsUrl:'https://huggingface.co/ibm-granite', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'IBM. Apache 2.0. #2 Open ASR Leaderboard 5.85% WER. 8B. Enterprise-grade.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  { providerId:'nvidia-parakeet',     name:'NVIDIA Parakeet',       aliases:['Parakeet TDT 1.1B'],   category:'stt',              capabilities:['speech-to-text','real-time','ultra-fast'],                     accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Open',         costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/nvidia/parakeet-tdt-1.1b', docsUrl:'https://huggingface.co/nvidia/parakeet-tdt-1.1b', whereUsedInLoadStudio:['Voice Studio','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'NVIDIA. RTFx > 2000. 6.5x faster than Canary. Best for real-time / live captioning.', pipelineMembership:['stt-subtitle','local-selfhosted-ai'], inputTypes:['audio'], outputTypes:['text'] },
  { providerId:'speechbrain',         name:'SpeechBrain',           aliases:['Speech Brain'],        category:'stt',              capabilities:['speech-to-text','speaker-diarization','speech-enhancement','tts'], accessType:'local-endpoint', requiresApiKey:false, requiresLocalEndpoint:true, defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'permitted', license:'Apache 2.0', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/speechbrain/speechbrain', docsUrl:'https://speechbrain.github.io', whereUsedInLoadStudio:['Voice Studio','Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Apache 2.0. Full PyTorch toolkit: ASR, speaker diarization, speech enhancement, TTS. Training recipes.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text','diarization'] },
  { providerId:'nemo-asr',            name:'NeMo ASR',              aliases:['NVIDIA NeMo'],         category:'stt',              capabilities:['speech-to-text','production-ready','conformer'],               accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/NVIDIA/NeMo', docsUrl:'https://docs.nvidia.com/deeplearning/nemo', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'NVIDIA. Apache 2.0. Conformer-CTC and RNNT models. Production-ready toolkit.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  { providerId:'paddlespeech',        name:'PaddleSpeech',          aliases:['Paddle Speech'],       category:'stt',              capabilities:['speech-to-text','multilingual','chinese','mandarin'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/PaddlePaddle/PaddleSpeech', docsUrl:'https://github.com/PaddlePaddle/PaddleSpeech', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Baidu. Apache 2.0. Excellent for Mandarin. Also supports English and other languages.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  { providerId:'julius',              name:'Julius',                aliases:[],                      category:'stt',              capabilities:['speech-to-text','lightweight','real-time','cpu'],              accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'BSD',          costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/julius-speech/julius', docsUrl:'https://github.com/julius-speech/julius', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'BSD. Nagoya University. Lightweight real-time CPU. Optimized for Japanese but multilingual.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  { providerId:'pocketsphinx',        name:'PocketSphinx',          aliases:['CMU Sphinx'],          category:'stt',              capabilities:['speech-to-text','embedded','microcontroller','offline'],        accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                    isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'BSD',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/cmusphinx/pocketsphinx', docsUrl:'https://github.com/cmusphinx/pocketsphinx', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'check-wasm-load', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'BSD. CMU. Runs on microcontrollers. Ultra-lightweight. Limited accuracy. Edge deployments only.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  { providerId:'kaldi',               name:'Kaldi',                 aliases:[],                      category:'stt',              capabilities:['speech-to-text','research','custom-domain','training'],         accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/kaldi-asr/kaldi', docsUrl:'https://kaldi-asr.org/doc', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Apache 2.0. Gold standard for research and custom domain training. C++. HMM/GMM/FST.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  { providerId:'espnet-asr',          name:'ESPnet-ASR',            aliases:['ESPnet ASR'],          category:'stt',              capabilities:['speech-to-text','conformer','streaming','research'],            accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:8000', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/espnet/espnet', docsUrl:'https://github.com/espnet/espnet', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'subtitles', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Apache 2.0. Conformer-based. Streaming and offline. Research toolkit.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },

  // Music / Audio — additional models
  { providerId:'vampnet',             name:'VampNet',               aliases:['Vamp Net'],            category:'music-gen', capabilities:['music-generation','music-variation','continuation'],            accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/hugofloresgarcia/vampnet', docsUrl:'https://github.com/hugofloresgarcia/vampnet', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'audio-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'MIT. Music generation via masked acoustic token modeling. Excellent for variation and continuation.', pipelineMembership:['music-audio-gen'], inputTypes:['audio','text'], outputTypes:['audio'] },
  { providerId:'hunyuanvideo-foley',  name:'HunyuanVideo-Foley',    aliases:['Hunyuan Foley'],       category:'sfx-generation',   capabilities:['foley-audio','video-sync','sfx-generation','48khz'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Open',         costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/tencent/HunyuanVideo-Foley', docsUrl:'https://huggingface.co/tencent/HunyuanVideo-Foley', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'sfx-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Tencent. Foley audio synced to video. 48kHz. Aligns audio, video, and text for professional SFX.', pipelineMembership:['music-audio-gen'], inputTypes:['video','text'], outputTypes:['audio'] },
  { providerId:'audiox',              name:'AudioX',                aliases:['Audio X'],             category:'sfx-generation',   capabilities:['audio-generation','sfx','music','any-to-audio','multimodal'],   accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Open',         costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co/AudioX', docsUrl:'https://huggingface.co/AudioX', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'audio-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Any-to-audio: video, image, text → audio / music / SFX in one framework.', pipelineMembership:['music-audio-gen'], inputTypes:['video','image','text'], outputTypes:['audio'] },
  { providerId:'encodec',             name:'EnCodec',               aliases:['Encodec','EnCodec AudioCraft'], category:'audio-codec', capabilities:['audio-codec','neural-compression','high-quality'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/facebookresearch/audiocraft', docsUrl:'https://github.com/facebookresearch/audiocraft', whereUsedInLoadStudio:['Sound Stage','Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'audio-codec', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Meta AI. MIT. Neural audio codec for MusicGen/AudioGen pipeline. High-quality compression.', pipelineMembership:['music-audio-gen'], inputTypes:['audio'], outputTypes:['audio'] },
  { providerId:'moises',              name:'Moises SDK',            aliases:['Moises'],              category:'music-gen', capabilities:['stem-separation','bpm-detection','chord-detection','key-detection'], accessType:'local-endpoint', requiresApiKey:false, requiresLocalEndpoint:true, defaultEndpoint:'http://localhost:7860', isFree:true, isOpenSource:true, isLocal:true, isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'permitted', license:'MIT', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/moises-ai', docsUrl:'https://github.com/moises-ai', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'audio-separation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'MIT. Audio separation + BPM + chords + key detection. Complements Demucs.', pipelineMembership:['music-audio-gen'], inputTypes:['audio'], outputTypes:['audio'] },
  { providerId:'melodfy',             name:'Melodfy',               aliases:['Melody AI'],           category:'music-gen', capabilities:['piano-to-midi','audio-to-midi'],                                accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Research',     costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://huggingface.co', docsUrl:'https://huggingface.co', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'midi-extraction', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'ByteDance research. Piano audio recording to MIDI conversion. AI-powered.', pipelineMembership:['music-audio-gen'], inputTypes:['audio'], outputTypes:['midi'] },

  // Video generation — additional local models
  { providerId:'i2vgen-xl',           name:'I2VGen-XL',             aliases:['I2V Gen XL'],          category:'video-gen',        capabilities:['image-to-video','semantic-understanding','scene-complexity'],   accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Open',         costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/ali-vilab/i2vgen-xl', docsUrl:'https://github.com/ali-vilab/i2vgen-xl', whereUsedInLoadStudio:['Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'video-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Alibaba DAMO. Image-to-video with semantic understanding. Complex scene handling. 16GB VRAM.', pipelineMembership:['ai-video'], inputTypes:['image','text'], outputTypes:['video'] },
  { providerId:'modelscope-t2v',      name:'ModelScope T2V',        aliases:['ModelScope Video'],    category:'video-gen',        capabilities:['text-to-video','open-source-pioneer'],                         accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'medium', commercialUseStatus:'non-commercial',  license:'CC BY-NC 4.0', costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/ali-vilab/modelscope-text-to-video-synthesis', docsUrl:'https://github.com/ali-vilab', whereUsedInLoadStudio:['Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'video-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Alibaba DAMO. CC BY-NC 4.0. Original open text-to-video release. Research / non-commercial.', pipelineMembership:['ai-video'], inputTypes:['text'], outputTypes:['video'] },
  { providerId:'videocrafter2',       name:'VideoCrafter2',         aliases:['Video Crafter 2'],     category:'video-gen',        capabilities:['text-to-video','image-to-video','high-quality'],               accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/AILab-CVC/VideoCrafter', docsUrl:'https://github.com/AILab-CVC/VideoCrafter', whereUsedInLoadStudio:['Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'video-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Apache 2.0. High-quality text-to-video and image-to-video. 16GB VRAM.', pipelineMembership:['ai-video'], inputTypes:['text','image'], outputTypes:['video'] },
  { providerId:'show-1',              name:'Show-1',                aliases:['Show One'],            category:'video-gen',        capabilities:['text-to-video','keyframe-consistency','longer-video'],          accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/showlab/Show-1', docsUrl:'https://github.com/showlab/Show-1', whereUsedInLoadStudio:['Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'video-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'MIT. Combines keyframe and interframe generation for consistent longer videos. 16GB VRAM.', pipelineMembership:['ai-video'], inputTypes:['text'], outputTypes:['video'] },
  { providerId:'seine',               name:'SEINE',                 aliases:['Shot Transition'],     category:'video-gen',        capabilities:['shot-transition','image-animation','video-generation'],         accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/Vchitect/SEINE', docsUrl:'https://github.com/Vchitect/SEINE', whereUsedInLoadStudio:['Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'video-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'MIT. Shot transition and image animation model. 16GB VRAM.', pipelineMembership:['ai-video'], inputTypes:['image','text'], outputTypes:['video'] },
  { providerId:'motiondirector',      name:'MotionDirector',        aliases:['Motion Director'],     category:'video-gen',        capabilities:['motion-customization','video-generation','lora-motion'],        accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/showlab/MotionDirector', docsUrl:'https://github.com/showlab/MotionDirector', whereUsedInLoadStudio:['Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'video-generation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'MIT. Customize motion patterns via LoRA-like training.', pipelineMembership:['ai-video'], inputTypes:['video','text'], outputTypes:['video'] },

  // Video editors / pipeline tools (local)
  { providerId:'ltx-desktop',         name:'LTX Desktop',           aliases:['LTX Video Desktop'],   category:'video-editor',     capabilities:['video-editing','ai-video','nonlinear','local-rendering'],       accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'LTX Open',     costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/Lightricks/LTX-Desktop', docsUrl:'https://github.com/Lightricks/LTX-Desktop', whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'video-editing', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'Lightricks. First free open-source nonlinear AI video editor. Built on LTX-Video. No watermarks.', pipelineMembership:['vn-editing'], inputTypes:['video','text'], outputTypes:['video'] },
  { providerId:'auto-editor',         name:'Auto-Editor',           aliases:['AutoEditor'],          category:'video-editor',     capabilities:['automatic-editing','silence-removal','jump-cuts','motion-detection'], accessType:'local-endpoint', requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null, isFree:true, isOpenSource:true, isLocal:true, isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline', licenseRisk:'none', commercialUseStatus:'permitted', license:'MIT', costLabel:'Free', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/WyattBlue/auto-editor', docsUrl:'https://github.com/WyattBlue/auto-editor', whereUsedInLoadStudio:['Editing Bay','Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'video-editing', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'MIT. AI-powered automatic video editing: silence removal, jump cuts, motion detection.', pipelineMembership:['vn-editing','export-pipeline'], inputTypes:['video'], outputTypes:['video'] },
  { providerId:'losslesscut',         name:'LosslessCut',           aliases:['Lossless Cut'],        category:'video-editor',     capabilities:['video-trim','lossless-cut','fast-editing'],                    accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'GPL-2.0',      costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/mifi/lossless-cut', docsUrl:'https://github.com/mifi/lossless-cut', whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'video-editing', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'GPL-2.0. Fast, lossless video trimming and cutting. Lightweight. No re-encoding.', pipelineMembership:['vn-editing'], inputTypes:['video'], outputTypes:['video'] },
  { providerId:'kdenlive',            name:'Kdenlive',              aliases:[],                      category:'video-editor',     capabilities:['video-editing','multitrack','ai-subtitle','desktop'],           accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'GPL-2.0',      costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://kdenlive.org', docsUrl:'https://docs.kdenlive.org', whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'video-editing', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'GPL-2.0. KDE. Full-featured video editor. AI subtitle generation built in via Whisper.', pipelineMembership:['vn-editing'], inputTypes:['video'], outputTypes:['video'] },
  { providerId:'openshot',            name:'OpenShot',              aliases:[],                      category:'video-editor',     capabilities:['video-editing','ai-background-removal','open-source'],          accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'GPL-3.0',      costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://openshot.org', docsUrl:'https://openshot.org', whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'video-editing', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'GPL-3.0. Python-based. AI background removal. Cross-platform.', pipelineMembership:['vn-editing'], inputTypes:['video'], outputTypes:['video'] },
  { providerId:'shotcut',             name:'Shotcut',               aliases:[],                      category:'video-editor',     capabilities:['video-editing','ai-features','cross-platform'],                 accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'GPL-3.0',      costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://shotcut.org', docsUrl:'https://shotcut.org', whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'video-editing', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'GPL-3.0. Cross-platform. AI-assisted features.', pipelineMembership:['vn-editing'], inputTypes:['video'], outputTypes:['video'] },
  { providerId:'openmontage',         name:'OpenMontage',           aliases:['Open Montage'],        category:'video-editor',     capabilities:['automated-pipeline','research-to-video','agent-driven'],        accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Open',         costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/OpenMontage', docsUrl:'https://github.com/OpenMontage', whereUsedInLoadStudio:['Export Office','Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'automated-pipeline', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'Agent-driven full pipeline: research → script → assets → voiceover → assembly → render.', pipelineMembership:['ai-video'], inputTypes:['text'], outputTypes:['video'] },
  { providerId:'moneyprinterturbo',   name:'MoneyPrinterTurbo',     aliases:['Money Printer Turbo'], category:'video-editor',     capabilities:['automated-pipeline','short-form-video','fully-automated'],      accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/harry0703/MoneyPrinterTurbo', docsUrl:'https://github.com/harry0703/MoneyPrinterTurbo', whereUsedInLoadStudio:['Export Office'], whereUsedInLoadEco:false, futureLoadAIUse:'automated-pipeline', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'MIT. Topic → script → media → subtitles → music → final video. Automated short-form pipeline.', pipelineMembership:['ai-video'], inputTypes:['text'], outputTypes:['video'] },
  { providerId:'twick',               name:'Twick',                 aliases:[],                      category:'video-editor',     capabilities:['react-video-editor','programmatic','web-based'],               accessType:'wasm',            requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Open',         costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com', docsUrl:'https://github.com', whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'video-editing', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'React-based web video editor. Integration reference.', pipelineMembership:['vn-editing'], inputTypes:['video'], outputTypes:['video'] },
  { providerId:'designcombo',         name:'DesignCombo',           aliases:['react-video-editor'],  category:'video-editor',     capabilities:['react-video-editor','web-based','compositing'],                accessType:'wasm',            requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Open',         costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/designcombo/react-video-editor', docsUrl:'https://github.com/designcombo/react-video-editor', whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'video-editing', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'designcombo/react-video-editor. React compositing reference.', pipelineMembership:['vn-editing'], inputTypes:['video'], outputTypes:['video'] },
  { providerId:'voidcut',             name:'Voidcut',               aliases:[],                      category:'video-editor',     capabilities:['video-editing','web-based'],                                    accessType:'wasm',            requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Open',         costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com', docsUrl:'https://github.com', whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'video-editing', testAction:'none', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'Web-based video editing reference.', pipelineMembership:['vn-editing'], inputTypes:['video'], outputTypes:['video'] },
  { providerId:'cineshader',          name:'CineShader',            aliases:['Cine Shader'],         category:'color-grading',    capabilities:['glsl-filters','color-grade','gpu-shader','real-time'],          accessType:'wasm',            requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:true,  isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Open',         costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://cineshader.com', docsUrl:'https://cineshader.com', whereUsedInLoadStudio:['Editing Bay','Look Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'color-grade', testAction:'check-browser-support', settingsAction:'none', useAsPrimary:false, useAsFallback:false, notes:'Open-source GLSL video filters. Browser-native real-time GPU shader pipeline.', pipelineMembership:['vn-editing'], inputTypes:['video'], outputTypes:['video'] },

  // Lip sync — additional models
  { providerId:'latentsync',          name:'LatentSync',            aliases:['Latent Sync'],         category:'lip-sync',         capabilities:['lip-sync','latent-space','audio-visual'],                      accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'Apache 2.0',   costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/bytedance/LatentSync', docsUrl:'https://github.com/bytedance/LatentSync', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'avatar-animation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'ByteDance. Apache 2.0. Encodes face and audio into compact latent representations.', pipelineMembership:['lip-sync-avatar'], inputTypes:['video','audio'], outputTypes:['video'] },
  { providerId:'lipgan',              name:'LipGAN',                aliases:['Lip GAN'],             category:'lip-sync',         capabilities:['lip-sync','any-language','zero-shot'],                          accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/Rudrabha/LipGAN', docsUrl:'https://github.com/Rudrabha/LipGAN', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'avatar-animation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'MIT. Early talking face generation. Handles any language and accents. Zero-shot.', pipelineMembership:['lip-sync-avatar'], inputTypes:['image','audio'], outputTypes:['video'] },
  { providerId:'makeitalk',           name:'MakeItTalk',            aliases:['Make It Talk'],        category:'lip-sync',         capabilities:['talking-head','single-image','speaker-aware','lightweight'],    accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/yzhou359/MakeItTalk', docsUrl:'https://github.com/yzhou359/MakeItTalk', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'avatar-animation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'MIT. Lightweight talking head from single image. Speaker-aware animation.', pipelineMembership:['lip-sync-avatar'], inputTypes:['image','audio'], outputTypes:['video'] },
  { providerId:'talkinghead3d',       name:'Talking Head 3D',       aliases:['TalkingHead','Talking Head'], category:'lip-sync',  capabilities:['3d-avatar','browser-native','real-time','glb-avatars'],        accessType:'browser-api',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:true,  isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'none',   commercialUseStatus:'permitted', license:'MIT',          costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/met4citizen/TalkingHead', docsUrl:'https://github.com/met4citizen/TalkingHead', whereUsedInLoadStudio:['Character Lab','Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'avatar-animation', testAction:'check-browser-support', settingsAction:'none', useAsPrimary:false, useAsFallback:true, notes:'MIT. Browser JS. 3D avatar speaks and lip-syncs in real-time. GLB avatars + Mixamo animations.', pipelineMembership:['lip-sync-avatar'], inputTypes:['text','audio'], outputTypes:['animation'] },
  { providerId:'wav2lip-hd',          name:'Wav2Lip HD',            aliases:['Wav2Lip High Def'],    category:'lip-sync',         capabilities:['lip-sync','high-definition','face-enhance'],                   accessType:'local-endpoint',  requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'offline',           licenseRisk:'medium', commercialUseStatus:'non-commercial',  license:'Research',     costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://github.com/ajay-sainy/Wav2Lip-GFPGAN', docsUrl:'https://github.com/ajay-sainy/Wav2Lip-GFPGAN', whereUsedInLoadStudio:['Character Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'avatar-animation', testAction:'test-local-endpoint', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:false, notes:'Community extension of Wav2Lip with CodeFormer for higher visual quality. Research license.', pipelineMembership:['lip-sync-avatar'], inputTypes:['video','audio'], outputTypes:['video'] },

  // Hosted video generation (free tier)
  { providerId:'kling',               name:'Kling AI',              aliases:['Kling'],               category:'video-gen', capabilities:['text-to-video','image-to-video','4k','physics-aware'],          accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free (daily refresh)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://klingai.com', docsUrl:'https://klingai.com', whereUsedInLoadStudio:['Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'video-generation', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Kuaishou. Free daily refresh credits. Physics-aware. 4K/60fps. Best free cinematic quality 2026.', pipelineMembership:['ai-video'], inputTypes:['text','image'], outputTypes:['video'] },
  { providerId:'hailuo',              name:'HaiLuo',                aliases:['MiniMax Video','Hailuo'], category:'video-gen', capabilities:['text-to-video','fast-queue','1080p'],                         accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free credits',  fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://hailuoai.video', docsUrl:'https://hailuoai.video', whereUsedInLoadStudio:['Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'video-generation', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'MiniMax. Fast queue. Free credits. Stylized. Native 1080p.', pipelineMembership:['ai-video'], inputTypes:['text','image'], outputTypes:['video'] },
  { providerId:'pika',                name:'Pika',                  aliases:['Pika Labs'],           category:'video-gen', capabilities:['text-to-video','effects-library','social-media'],              accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free credits',  fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://pika.art', docsUrl:'https://pika.art', whereUsedInLoadStudio:['Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'video-generation', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Pika Labs. ~150 signup credits + daily replenish. Effects library. Social media focus.', pipelineMembership:['ai-video'], inputTypes:['text','image'], outputTypes:['video'] },
  { providerId:'dreamina',            name:'Dreamina',              aliases:['Jimeng','Seedance'],   category:'video-gen', capabilities:['text-to-video','character-consistency','image-to-video'],       accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free credits',  fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://dreamina.capcut.com', docsUrl:'https://dreamina.capcut.com', whereUsedInLoadStudio:['Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'video-generation', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'ByteDance. 66-80 daily credits. Seedance 2.0. Character consistency.', pipelineMembership:['ai-video'], inputTypes:['text','image'], outputTypes:['video'] },
  { providerId:'pixverse',            name:'PixVerse',              aliases:['Pix Verse'],           category:'video-gen', capabilities:['text-to-video','multi-style','realistic','anime'],              accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free credits',  fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://pixverse.ai', docsUrl:'https://pixverse.ai', whereUsedInLoadStudio:['Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'video-generation', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Free credits. Multi-style: realistic, anime. Social media optimized.', pipelineMembership:['ai-video'], inputTypes:['text','image'], outputTypes:['video'] },
  { providerId:'luma-dream',          name:'Luma Dream Machine',    aliases:['Luma AI','Luma Dream'], category:'video-gen', capabilities:['text-to-video','high-quality','image-to-video'],               accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free (limited monthly)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://lumalabs.ai/dream-machine', docsUrl:'https://lumalabs.ai', whereUsedInLoadStudio:['Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'video-generation', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Luma AI. Limited free monthly generations. High quality.', pipelineMembership:['ai-video'], inputTypes:['text','image'], outputTypes:['video'] },
  { providerId:'heygen',              name:'HeyGen',                aliases:['Hey Gen'],             category:'avatar-video',     capabilities:['avatar-video','175-languages','voice-clone','free-plan'],      accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free plan',     fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://heygen.com', docsUrl:'https://heygen.com', whereUsedInLoadStudio:['Character Lab','Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'avatar-animation', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Free plan: avatars, 175+ languages, voice clone. Best free enterprise avatar evaluation.', pipelineMembership:['lip-sync-avatar'], inputTypes:['text','image','audio'], outputTypes:['video'] },

  // Hosted image platforms (free tier)
  { providerId:'ideogram',            name:'Ideogram',              aliases:[],                      category:'image-gen',     capabilities:['image-generation','text-in-image','free-hosted'],              accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free (10 credits/week)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://ideogram.ai', docsUrl:'https://ideogram.ai', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Best open-access tool for text-inside-image generation. 10 credits/week free.', pipelineMembership:['commercial-image'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'leonardo-ai',         name:'Leonardo AI',           aliases:['Leonardo'],            category:'image-gen',     capabilities:['image-generation','game-assets','characters','environments'],   accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free (daily gen)', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://leonardo.ai', docsUrl:'https://docs.leonardo.ai', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Daily generations free. Specialized for game assets, characters, environments.', pipelineMembership:['commercial-image'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'mage-space',          name:'Mage.space',            aliases:['Mage Space'],          category:'image-gen',     capabilities:['image-generation','unlimited-slow','free-no-account'],         accessType:'free-no-key',     requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free',          fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://mage.space', docsUrl:'https://mage.space', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-generation', testAction:'test-no-key', settingsAction:'none', useAsPrimary:false, useAsFallback:true, notes:'Unlimited free low-priority queue using Stable Diffusion. No signup for basic use.', pipelineMembership:['commercial-image'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'replicate',           name:'Replicate',             aliases:[],                      category:'aggregator',       capabilities:['image-generation','video-generation','tts','multi-model'],      accessType:'paid-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.replicate.com/v1', isFree:false, isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true, isOpenAICompatible:false, requiresAccount:true, requiresBackendProxy:false, privacyLabel:'third-party-cloud', licenseRisk:'low', commercialUseStatus:'check-required', license:'Proprietary', costLabel:'Free credits on signup', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://replicate.com', docsUrl:'https://replicate.com/docs', whereUsedInLoadStudio:['Developer Lab','AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'multi-model-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'300+ models via single API. Pay-as-you-go. FLUX, SD, WAN, TTS and more. Free credits at signup.', pipelineMembership:['commercial-image','ai-video'], inputTypes:['text','image'], outputTypes:['image','video','audio'] },

  // Aggregators
  { providerId:'wavespeedai',         name:'WaveSpeedAI',           aliases:['Wave Speed AI'],       category:'aggregator',       capabilities:['image-generation','multi-provider','aggregator'],               accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free credits',  fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://wavespeed.ai', docsUrl:'https://wavespeed.ai', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'multi-model-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Aggregates FLUX, GPT Image, Ideogram, Recraft. Free credits on signup.', pipelineMembership:['commercial-image'], inputTypes:['text'], outputTypes:['image'] },
  { providerId:'getimgai',            name:'getimg.ai',             aliases:['GetImg AI'],           category:'aggregator',       capabilities:['image-generation','video-generation','multi-model'],            accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free credits',  fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://getimg.ai', docsUrl:'https://getimg.ai', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'multi-model-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Veo, Kling, Seedance, Runway, WAN in one dashboard. Free credits.', pipelineMembership:['commercial-image','ai-video'], inputTypes:['text','image'], outputTypes:['image','video'] },
  { providerId:'atlas-cloud',         name:'Atlas Cloud',           aliases:['AtlasCloud'],          category:'aggregator',       capabilities:['video-generation','image-generation','batch','multi-model'],    accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free trial',    fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://atlascloud.ai', docsUrl:'https://atlascloud.ai', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'multi-model-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Kling, WAN, Vidu, Seedance, FLUX via single API. Batch processing. Free trial.', pipelineMembership:['commercial-image','ai-video'], inputTypes:['text','image'], outputTypes:['image','video'] }
  ,
  // Audio/Music Generation
  { providerId:'audiolm',             name:'AudioLM',               aliases:['AudioLM'],             category:'music-gen',        capabilities:['music-generation','audio-continuation'],                           accessType:'local-server',    requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7861', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'local',              licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache-2.0',   costLabel:'Free/local', fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://google-research.github.io/seanet/audiolm/examples/', docsUrl:'https://github.com/lucidrains/audiolm-pytorch', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'music-gen', testAction:'test-local', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'AudioLM audio continuation and music generation via waveform context.', pipelineMembership:['music-audio-gen','local-selfhosted-ai'], inputTypes:['audio','text'], outputTypes:['audio'] },
  { providerId:'musiclm',             name:'MusicLM',               aliases:['MusicLM'],             category:'music-gen',        capabilities:['music-generation','text-to-music'],                                 accessType:'local-server',    requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7861', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'local',              licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Apache-2.0',   costLabel:'Free/local', fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://google-research.github.io/seanet/musiclm/examples/', docsUrl:'https://github.com/google-research/google-research', whereUsedInLoadStudio:['Sound Stage'], whereUsedInLoadEco:false, futureLoadAIUse:'music-gen', testAction:'test-local', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'MusicLM text-to-music via hierarchical sequence-to-sequence modeling.', pipelineMembership:['music-audio-gen','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['audio'] },
  // Hosted Image Platforms
  { providerId:'nightcafe',           name:'NightCafe',             aliases:['NightCafe Studio'],    category:'image-gen',        capabilities:['text-to-image','img2img','style-transfer'],                        accessType:'freemium',        requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free credits', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://nightcafe.studio', docsUrl:'https://nightcafe.studio', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-gen', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'Hosted SD/SDXL/FLUX platform. Free credits daily.', pipelineMembership:['ai-image-glamour','aggregator-routing'], inputTypes:['text','image'], outputTypes:['image'] },
  { providerId:'tensor-art',          name:'Tensor.Art',            aliases:['TensorArt'],           category:'image-gen',        capabilities:['text-to-image','img2img','LoRA','model-hosting'],                  accessType:'freemium',        requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free tier',    fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://tensor.art', docsUrl:'https://tensor.art', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-gen', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'Cloud SD platform. Free compute credits. Large LoRA/checkpoint library.', pipelineMembership:['ai-image-glamour','aggregator-routing'], inputTypes:['text','image'], outputTypes:['image'] },
  { providerId:'civitai-gen',         name:'Civitai Generator',     aliases:['CivitAI'],             category:'image-gen',        capabilities:['text-to-image','img2img','LoRA','model-browser'],                  accessType:'freemium',        requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free Buzz credits', fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://civitai.com', docsUrl:'https://civitai.com/api', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-gen', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'Civitai hosted generation with community models. Free Buzz credits.', pipelineMembership:['ai-image-glamour','aggregator-routing'], inputTypes:['text','image'], outputTypes:['image'] },
  { providerId:'openart',             name:'OpenArt',               aliases:['OpenArt AI'],          category:'image-gen',        capabilities:['text-to-image','img2img','AI-tools','workflow'],                   accessType:'freemium',        requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free tier',    fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://openart.ai', docsUrl:'https://openart.ai/api', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-gen', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'Hosted image platform with workflow builder. Free trial credits.', pipelineMembership:['ai-image-glamour','aggregator-routing'], inputTypes:['text','image'], outputTypes:['image'] },
  { providerId:'dezgo',               name:'Dezgo',                 aliases:['DezGo'],               category:'image-gen',        capabilities:['text-to-image','img2img','ControlNet'],                            accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.dezgo.com',  isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free credits', fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://dezgo.com', docsUrl:'https://dezgo.com/docs', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-gen', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'Dezgo REST API for SD/SDXL/FLUX. Free daily credits.', pipelineMembership:['ai-image-glamour','aggregator-routing'], inputTypes:['text','image'], outputTypes:['image'] },
  { providerId:'lexica',              name:'Lexica',                aliases:['Lexica Art'],          category:'image-gen',        capabilities:['text-to-image','image-search','photorealistic'],                   accessType:'freemium',        requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free tier',    fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://lexica.art', docsUrl:'https://lexica.art', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'image-gen', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'Lexica Aperture photorealistic image gen with search library. Free tier.', pipelineMembership:['ai-image-glamour','aggregator-routing'], inputTypes:['text'], outputTypes:['image'] },
  // Lip Sync extras
  { providerId:'difftalk',            name:'DiffTalk',              aliases:['DiffTalk'],            category:'lip-sync',         capabilities:['lip-sync','talking-head','audio-driven'],                          accessType:'local-server',    requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'local',              licenseRisk:'medium', commercialUseStatus:'check-required',  license:'CC-BY-NC-4.0', costLabel:'Free/local', fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/sstzal/DiffTalk', docsUrl:'https://github.com/sstzal/DiffTalk', whereUsedInLoadStudio:['Character Lab','Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'lip-sync', testAction:'test-local', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'DiffTalk diffusion-based talking head. Non-commercial license.', pipelineMembership:['lip-sync-avatar'], inputTypes:['image','audio'], outputTypes:['video'] },
  // Video Editor Tools
  { providerId:'frame-editor',        name:'Frame Editor',          aliases:['FrameEditor'],         category:'video-editor',     capabilities:['frame-level-edit','image-edit','canvas'],                          accessType:'browser-native',  requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:true,  isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'local',              licenseRisk:'none',   commercialUseStatus:'permitted',       license:'MIT',          costLabel:'Free',         fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:null, docsUrl:null, whereUsedInLoadStudio:['Editing Bay'], whereUsedInLoadEco:false, futureLoadAIUse:'frame-editing', testAction:'test-local', settingsAction:null, useAsPrimary:false, useAsFallback:true, notes:'Canvas-based frame-level image editor. Browser-native. Used for per-frame touch-up.', pipelineMembership:['video-editor-tools','vn-editing'], inputTypes:['video','image'], outputTypes:['image','video'] }
  ,
  // Cloud LLM — Together AI, DeepInfra, AI21
  { providerId:'together-ai',         name:'Together AI',           aliases:['Together.ai'],         category:'llm-cloud',        capabilities:['text-generation','image-generation','embedding','inference'],       accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.together.xyz/v1', isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:true,  requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free credits', fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://api.together.xyz', docsUrl:'https://docs.together.ai', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'OpenAI-compat. Free $25 credits on signup. Llama, Mixtral, FLUX image gen. Model license varies by model — check before commercial use.', pipelineMembership:['openai-compat-routing','ai-image-glamour'], inputTypes:['text','image'], outputTypes:['text','image'] },
  { providerId:'deepinfra',           name:'DeepInfra',             aliases:['Deep Infra'],          category:'llm-cloud',        capabilities:['text-generation','image-generation','embedding','inference'],       accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.deepinfra.com/v1/openai', isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:true,  requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free tier',    fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://deepinfra.com', docsUrl:'https://deepinfra.com/docs', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'OpenAI-compat. Free inference tier. Llama, Mistral, SDXL, FLUX, Whisper. Model license varies — check before commercial use.', pipelineMembership:['openai-compat-routing'], inputTypes:['text'], outputTypes:['text','image'] },
  { providerId:'ai21',                name:'AI21 Labs',             aliases:['AI21','Jamba'],        category:'llm-cloud',        capabilities:['text-generation','summarization','rewriting'],                     accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.ai21.com/studio/v1', isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:true,  requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free trial',   fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://www.ai21.com', docsUrl:'https://docs.ai21.com', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'llm-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'AI21 Jamba-Mini is OpenAI-compat. Free tier. Proprietary models. Commercial use requires agreement review.', pipelineMembership:['openai-compat-routing'], inputTypes:['text'], outputTypes:['text'] },
  // Aggregators / Cloud Compute
  { providerId:'fal-ai',              name:'Fal.ai',                aliases:['fal','Fal AI'],        category:'aggregator',       capabilities:['image-generation','video-generation','audio-generation','inference'], accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://queue.fal.run', isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free credits', fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://fal.ai', docsUrl:'https://fal.ai/docs', whereUsedInLoadStudio:['AI Image Director','Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'image-video-routing', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'Fast async inference for FLUX, WAN, CogVideoX, MusicGen and more. Free credits on signup. Model license varies per model — check before commercial use.', pipelineMembership:['aggregator-routing','ai-image-glamour'], inputTypes:['text','image','audio'], outputTypes:['image','video','audio'] },
  { providerId:'modal-labs',          name:'Modal',                 aliases:['Modal Labs'],          category:'aggregator',       capabilities:['serverless-compute','custom-inference','batch-jobs'],              accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:true,  isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:true,  privacyLabel:'third-party-cloud',  licenseRisk:'none',   commercialUseStatus:'permitted',       license:'Apache-2.0',   costLabel:'Free tier',    fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://modal.com', docsUrl:'https://modal.com/docs', whereUsedInLoadStudio:['Developer Lab'], whereUsedInLoadEco:false, futureLoadAIUse:'custom-inference', testAction:'test-local', settingsAction:'set-key', useAsPrimary:false, useAsFallback:false, notes:'Serverless Python compute. Deploy any model via decorator. SDK is Apache-2.0. Requires Python backend. The deployed model carries its own license.', pipelineMembership:['local-selfhosted-ai'], inputTypes:['any'], outputTypes:['any'] },
  // Cloud STT
  { providerId:'deepgram',            name:'Deepgram',              aliases:['Deepgram Nova'],       category:'stt',              capabilities:['speech-to-text','diarization','streaming-stt','punctuation'],      accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.deepgram.com/v1', isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free $200 credit', fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://deepgram.com', docsUrl:'https://developers.deepgram.com', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'cloud-stt', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'Deepgram Nova-2 — fast, accurate cloud STT. $200 free credit. Commercial terms apply — check usage agreement before production.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  { providerId:'assemblyai',          name:'AssemblyAI',            aliases:['Assembly AI'],         category:'stt',              capabilities:['speech-to-text','diarization','sentiment','summarization'],        accessType:'free-api-key',    requiresApiKey:true,  requiresLocalEndpoint:false, defaultEndpoint:'https://api.assemblyai.com', isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:true,  requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'low',    commercialUseStatus:'check-required',  license:'Proprietary',  costLabel:'Free tier',    fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://assemblyai.com', docsUrl:'https://www.assemblyai.com/docs', whereUsedInLoadStudio:['Voice Studio'], whereUsedInLoadEco:false, futureLoadAIUse:'cloud-stt', testAction:'test-with-key', settingsAction:'set-key', useAsPrimary:false, useAsFallback:true, notes:'AssemblyAI — cloud STT with speaker diarization and sentiment. Free tier available. Commercial terms apply — check before production use.', pipelineMembership:['stt-subtitle'], inputTypes:['audio'], outputTypes:['text'] },
  // Local Image Model
  { providerId:'sana',                name:'SANA',                  aliases:['SANA-Sprint','Sana Sprint'], category:'image-gen',   capabilities:['text-to-image','fast-inference','high-resolution'],               accessType:'local-server',    requiresApiKey:false, requiresLocalEndpoint:true,  defaultEndpoint:'http://localhost:7860', isFree:true,  isOpenSource:true,  isLocal:true,  isBrowserNative:false, isHosted:false, isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'local',              licenseRisk:'none',   commercialUseStatus:'permitted',       license:'Apache 2.0',   costLabel:'Free/local', fallbackEligible:true,  status:'untested', blockedReason:null, websiteUrl:'https://github.com/NVlabs/SANA', docsUrl:'https://github.com/NVlabs/SANA', whereUsedInLoadStudio:['AI Image Director'], whereUsedInLoadEco:false, futureLoadAIUse:'fast-image-gen', testAction:'test-local', settingsAction:'set-endpoint', useAsPrimary:false, useAsFallback:true, notes:'NVIDIA SANA-Sprint — extremely fast diffusion. Apache 2.0. Commercial use permitted. Requires local GPU server.', pipelineMembership:['ai-image-glamour','local-selfhosted-ai'], inputTypes:['text'], outputTypes:['image'] },
  // Font Asset Library
  { providerId:'dafont',              name:'DaFont',                aliases:['Da Font'],             category:'fonts',            capabilities:['font-library','font-download'],                                     accessType:'browser-native',  requiresApiKey:false, requiresLocalEndpoint:false, defaultEndpoint:null,                     isFree:true,  isOpenSource:false, isLocal:false, isBrowserNative:false, isHosted:true,  isOpenAICompatible:false, requiresAccount:false, requiresBackendProxy:false, privacyLabel:'third-party-cloud',  licenseRisk:'medium', commercialUseStatus:'check-required',  license:'Mixed',        costLabel:'Free',         fallbackEligible:false, status:'untested', blockedReason:null, websiteUrl:'https://dafont.com', docsUrl:'https://dafont.com', whereUsedInLoadStudio:['Editing Bay','Scene Workshop'], whereUsedInLoadEco:false, futureLoadAIUse:'font-assets', testAction:'manual', settingsAction:null, useAsPrimary:false, useAsFallback:true, notes:'Font library. CRITICAL: each font has its own license — many are free for personal use only. Always check individual font license before commercial use. No API — direct download.', pipelineMembership:['vn-editing'], inputTypes:[], outputTypes:['font'] }
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

// ─── SEARCH / FETCH CONNECTORS ───────────────────────────────────────────────

function _freesoundSearch(key, query, filter, limit, page) {
  var url = 'https://freesound.org/apiv2/search/text/' +
    '?query=' + encodeURIComponent(query || '') +
    '&fields=id,name,previews,duration,license,username,tags' +
    '&page_size=' + (limit || 20) +
    '&page=' + (page || 1) +
    (filter ? '&filter=' + encodeURIComponent(filter) : '') +
    '&token=' + key;
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error('Freesound ' + r.status);
    return r.json().then(function (d) {
      return (d.results || []).map(function (item) {
        var dur = Math.round(item.duration || 0);
        return {
          id: String(item.id),
          title: item.name || ('sound-' + item.id),
          artist: item.username || '',
          duration: dur,
          previewUrl: item.previews && (item.previews['preview-hq-mp3'] || item.previews['preview-lq-mp3']) || null,
          licenseType: item.license || 'unknown',
          attribution: (item.username || 'unknown') + ' via Freesound',
          provider: 'freesound',
          tags: item.tags || []
        };
      });
    });
  });
}

function _pexelsSearch(key, query, mediaType, page) {
  var base = mediaType === 'video' ? 'https://api.pexels.com/videos/search' : 'https://api.pexels.com/v1/search';
  var url = base + '?query=' + encodeURIComponent(query) + '&per_page=20&page=' + (page || 1);
  return fetch(url, {headers: {'Authorization': key}}).then(function (r) {
    if (!r.ok) throw new Error('Pexels ' + r.status);
    return r.json().then(function (d) {
      if (mediaType === 'video') {
        return (d.videos || []).map(function (v) {
          var file = (v.video_files || []).filter(function (f) { return f.quality === 'sd'; })[0] || (v.video_files || [])[0] || {};
          return {
            id: String(v.id), title: (v.url || '').split('/').filter(Boolean).pop() || ('pexels-' + v.id),
            artist: (v.user && v.user.name) || 'Pexels',
            thumbnailUrl: v.image || null, url: file.link || null,
            mimeType: 'video/mp4', width: v.width, height: v.height, duration: v.duration || 0,
            licenseType: 'Pexels License', attribution: (v.user && v.user.name) || 'Pexels', provider: 'pexels'
          };
        });
      }
      return (d.photos || []).map(function (p) {
        return {
          id: String(p.id), title: p.alt || ('pexels-' + p.id),
          artist: p.photographer || 'Pexels',
          thumbnailUrl: p.src && p.src.small || null, url: p.src && p.src.large2x || p.src && p.src.original || null,
          mimeType: 'image/jpeg', width: p.width, height: p.height,
          licenseType: 'Pexels License', attribution: p.photographer || 'Pexels', provider: 'pexels'
        };
      });
    });
  });
}

function _pixabaySearch(key, query, mediaType, page) {
  var base = mediaType === 'video' ? 'https://pixabay.com/api/videos/' : 'https://pixabay.com/api/';
  var url = base + '?key=' + key + '&q=' + encodeURIComponent(query) + '&per_page=20&page=' + (page || 1) + '&safesearch=true';
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error('Pixabay ' + r.status);
    return r.json().then(function (d) {
      return (d.hits || []).map(function (h) {
        if (mediaType === 'video') {
          var vid = (h.videos && (h.videos.small || h.videos.tiny)) || {};
          return {
            id: String(h.id), title: h.tags || ('pixabay-' + h.id), artist: h.user || 'Pixabay',
            thumbnailUrl: h.userImageURL || null, url: vid.url || null,
            mimeType: 'video/mp4', width: vid.width, height: vid.height, duration: h.duration || 0,
            licenseType: 'Pixabay License', attribution: (h.user || 'Pixabay') + ' via Pixabay', provider: 'pixabay-stock'
          };
        }
        return {
          id: String(h.id), title: h.tags || ('pixabay-' + h.id), artist: h.user || 'Pixabay',
          thumbnailUrl: h.webformatURL || null, url: h.largeImageURL || h.webformatURL || null,
          mimeType: 'image/jpeg', width: h.imageWidth, height: h.imageHeight,
          licenseType: 'Pixabay License', attribution: (h.user || 'Pixabay') + ' via Pixabay', provider: 'pixabay-stock'
        };
      });
    });
  });
}

function _wikimediaSearch(query, mediaType, page) {
  var url = 'https://commons.wikimedia.org/w/api.php' +
    '?action=query&list=search&srsearch=' + encodeURIComponent(query + ' ' + (mediaType || 'image')) +
    '&srnamespace=6&srlimit=20&format=json&origin=*' +
    '&sroffset=' + (((page || 1) - 1) * 20);
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error('Wikimedia ' + r.status);
    return r.json().then(function (d) {
      return ((d.query && d.query.search) || []).map(function (item) {
        var title = item.title.replace('File:', '');
        var enc = encodeURIComponent(item.title.replace(/ /g, '_'));
        return {
          id: String(item.pageid), title: title, artist: 'Wikimedia Commons',
          thumbnailUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + enc + '?width=200',
          url: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + enc,
          licenseType: 'Various CC', attribution: title + ' via Wikimedia Commons',
          provider: 'wikimedia', pageUrl: 'https://commons.wikimedia.org/wiki/' + enc
        };
      });
    });
  });
}

function _nasaSearch(query, mediaType, page) {
  var type = mediaType === 'video' ? 'video' : (mediaType === 'audio' ? 'audio' : 'image');
  var url = 'https://images-api.nasa.gov/search?q=' + encodeURIComponent(query) +
    '&media_type=' + type + '&page=' + (page || 1) + '&page_size=20';
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error('NASA ' + r.status);
    return r.json().then(function (d) {
      return ((d.collection && d.collection.items) || []).map(function (item) {
        var data = (item.data && item.data[0]) || {};
        var link = (item.links && item.links[0]) || {};
        return {
          id: data.nasa_id || '', title: data.title || data.nasa_id || '', artist: data.center || 'NASA',
          thumbnailUrl: link.href || null, url: link.href || null,
          licenseType: 'Public Domain (NASA)', attribution: (data.title || '') + ' — NASA',
          provider: 'nasa-library', description: data.description || ''
        };
      });
    });
  });
}

function _pollJobComfyUI(endpoint, jobId) {
  return fetch(endpoint + '/history/' + jobId).then(function (r) {
    if (!r.ok) throw new Error('ComfyUI history ' + r.status);
    return r.json().then(function (d) {
      var job = d[jobId];
      if (!job || !(job.status && job.status.completed)) return {done: false, provider: 'comfyui'};
      var outputs = job.outputs || {};
      var imageNode = null;
      Object.keys(outputs).forEach(function (k) { if (!imageNode && outputs[k].images && outputs[k].images.length) imageNode = outputs[k]; });
      if (!imageNode) return {done: true, provider: 'comfyui', error: 'no-image-output'};
      var img = imageNode.images[0];
      var viewUrl = endpoint + '/view?filename=' + encodeURIComponent(img.filename) + '&subfolder=' + (img.subfolder || '') + '&type=' + (img.type || 'output');
      return fetch(viewUrl).then(function (r2) {
        return r2.blob().then(function (b) {
          return Object.assign({done: true}, LoadProviderRegistry.normalizeResult({type: 'image', blob: b, url: URL.createObjectURL(b), provider: 'comfyui'}));
        });
      });
    });
  });
}

function _pollJobAiHorde(jobId, key) {
  var hKey = key || '0000000000';
  return fetch('https://stablehorde.net/api/v2/generate/check/' + jobId, {headers: {'apikey': hKey}}).then(function (r) {
    if (!r.ok) throw new Error('AI Horde check ' + r.status);
    return r.json().then(function (d) {
      if (!d.done) return {done: false, provider: 'aihorde', waiting: d.waiting, processing: d.processing};
      return fetch('https://stablehorde.net/api/v2/generate/status/' + jobId, {headers: {'apikey': hKey}}).then(function (r2) {
        if (!r2.ok) throw new Error('AI Horde status ' + r2.status);
        return r2.json().then(function (d2) {
          var gen = (d2.generations || [])[0];
          if (!gen) return {done: true, provider: 'aihorde', error: 'no-generation'};
          return Object.assign({done: true}, LoadProviderRegistry.normalizeResult({type: 'image', url: gen.img, provider: 'aihorde'}));
        });
      });
    });
  });
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

  getProviderSettings: function (providerId) {
    return Object.assign({}, _settings[providerId] || {});
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

    if (providerId === 'dezgo') {
      if (!key) return Promise.reject(new Error('Dezgo: no API key'));
      return fetch('https://api.dezgo.com/text2image', {
        method:'POST',
        headers:{'Content-Type':'application/json','X-Dezgo-Key':key},
        body:JSON.stringify({prompt:request.prompt||'',width:request.width||512,height:request.height||512,model:s.model||'dreamshaper_8',steps:25,guidance:7.5})
      }).then(function(r){
        if(!r.ok) throw new Error('Dezgo '+r.status);
        return r.blob().then(function(b){
          return LoadProviderRegistry.normalizeResult({type:'image',blob:b,url:URL.createObjectURL(b),provider:'dezgo'});
        });
      });
    }
    if (providerId === 'getimgai') {
      if (!key) return Promise.reject(new Error('getimg.ai: no API key'));
      var gimgModel = s.model || 'stable-diffusion-xl-v1-0';
      return fetch('https://api.getimg.ai/v1/stable-diffusion-xl/text-to-image', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
        body:JSON.stringify({model:gimgModel,prompt:request.prompt||'',width:request.width||1024,height:request.height||1024,steps:30,output_format:'jpeg'})
      }).then(function(r){
        if(!r.ok) throw new Error('getimg.ai '+r.status);
        return r.json().then(function(d){
          var b64=d.image||'';
          if(!b64) throw new Error('getimg.ai: no image');
          return LoadProviderRegistry.normalizeResult({type:'image',dataURL:'data:image/jpeg;base64,'+b64,provider:'getimgai'});
        });
      });
    }
    if (providerId === 'replicate') {
      if (!key) return Promise.reject(new Error('Replicate: no API key'));
      var repModel = s.model || 'black-forest-labs/flux-schnell';
      return fetch('https://api.replicate.com/v1/models/'+repModel+'/predictions', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key,'Prefer':'wait'},
        body:JSON.stringify({input:{prompt:request.prompt||'',width:request.width||1024,height:request.height||1024}})
      }).then(function(r){
        if(!r.ok) throw new Error('Replicate '+r.status);
        return r.json().then(function(d){
          var url=(Array.isArray(d.output)?d.output[0]:d.output)||null;
          if(!url) throw new Error('Replicate: no output URL');
          return LoadProviderRegistry.normalizeResult({type:'image',url:url,provider:'replicate'});
        });
      });
    }
    if (providerId === 'fal-ai') {
      if (!key) return Promise.reject(new Error('Fal.ai: no API key'));
      var falModel = s.model || 'fal-ai/flux/schnell';
      return fetch('https://queue.fal.run/'+falModel, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Key '+key},
        body:JSON.stringify({prompt:request.prompt||'',image_size:{width:request.width||1024,height:request.height||1024}})
      }).then(function(r){
        if(!r.ok) throw new Error('Fal.ai '+r.status);
        return r.json().then(function(d){
          var url=(d.images&&d.images[0]&&d.images[0].url)||d.url||null;
          if(!url) throw new Error('Fal.ai: no image URL');
          return LoadProviderRegistry.normalizeResult({type:'image',url:url,provider:'fal-ai'});
        });
      });
    }
    if (providerId === 'wavespeedai') {
      if (!key) return Promise.reject(new Error('WaveSpeedAI: no API key'));
      return fetch('https://api.wavespeed.ai/api/v2/wavespeed-ai/flux-schnell', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
        body:JSON.stringify({prompt:request.prompt||'',num_images:1,size:'1024x1024',enable_safety_checker:true})
      }).then(function(r){
        if(!r.ok) throw new Error('WaveSpeedAI '+r.status);
        return r.json().then(function(d){
          var url=(d.data&&d.data.outputs&&d.data.outputs[0])||null;
          if(!url) throw new Error('WaveSpeedAI: no output');
          return LoadProviderRegistry.normalizeResult({type:'image',url:url,provider:'wavespeedai'});
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
    if (providerId === 'ideogram') {
      if (!key) return Promise.reject(new Error('Ideogram: no API key'));
      return fetch('https://api.ideogram.ai/generate', {
        method:'POST',
        headers:{'Content-Type':'application/json','Api-Key':key},
        body:JSON.stringify({image_request:{prompt:request.prompt||'',aspect_ratio:'ASPECT_16_9',model:s.model||'V_2',magic_prompt_option:'AUTO'}})
      }).then(function(r){
        if(!r.ok) throw new Error('Ideogram '+r.status);
        return r.json().then(function(d){
          var url=d.data&&d.data[0]&&d.data[0].url;
          if(!url) throw new Error('Ideogram: no image URL');
          return LoadProviderRegistry.normalizeResult({type:'image',url:url,provider:'ideogram'});
        });
      });
    }

    if (providerId === 'pixazo') {
      var pxKey = s.apiKey || null;
      var pxHeaders = {'Content-Type': 'application/json'};
      if (pxKey) pxHeaders['Authorization'] = 'Bearer ' + pxKey;
      return fetch('https://api.pixazo.com/v1/text-to-image', {
        method: 'POST',
        headers: pxHeaders,
        body: JSON.stringify({prompt: request.prompt || '', width: request.width || 1024, height: request.height || 1024})
      }).then(function (r) {
        if (!r.ok) throw new Error('Pixazo ' + r.status);
        return r.blob().then(function (b) {
          return LoadProviderRegistry.normalizeResult({type: 'image', blob: b, url: URL.createObjectURL(b), provider: 'pixazo'});
        });
      });
    }

    // HF Inference API — open-source image models routed via HuggingFace key
    var _hfImgKey = (_settings['huggingface'] || {}).apiKey || null;
    var _hfImgModels = {
      'flux':             'black-forest-labs/FLUX.1-schnell',
      'flux-1-schnell':   'black-forest-labs/FLUX.1-schnell',
      'flux-2-dev':       'black-forest-labs/FLUX.1-dev',
      'sdxl':             'stabilityai/stable-diffusion-xl-base-1.0',
      'sd-15':            'runwayml/stable-diffusion-v1-5',
      'sd-35':            'stabilityai/stable-diffusion-3.5-large',
      'sd-35-medium':     'stabilityai/stable-diffusion-3.5-medium',
      'kandinsky':        'kandinsky-community/kandinsky-2-2-decoder',
      'pixart':           'PixArt-alpha/PixArt-Sigma-XL-2-1024-MS',
      'hidream':          'HiDream-ai/HiDream-I1-Fast',
      'sana':             'Efficient-Large-Model/Sana_1600M_1024px_diffusers',
      'sana-sprint':      'Efficient-Large-Model/Sana_Sprint_1.6B_1024px_diffusers',
      'wuerstchen':       'warp-ai/wuerstchen',
      'dreamshaper':      'Lykon/dreamshaper-7',
      'openjourney':      'prompthero/openjourney',
      'cyberrealistic-xl':'cyberdelia/CyberRealistic-XL',
      'realvisxl':        'SG161222/RealVisXL_V4.0',
      'juggernaut-xl':    'RunDiffusion/Juggernaut-XL-v9',
      'deepfloyd-if':     'DeepFloyd/IF-I-XL-v1.0',
      'dalle-mini':       'dalle-mini/dalle-mini'
    };
    if (_hfImgKey && !endpoint && _hfImgModels[providerId]) {
      var _hfImgModel = s.model || _hfImgModels[providerId];
      return fetch('https://api-inference.huggingface.co/models/' + _hfImgModel, {
        method: 'POST',
        headers: {'Authorization': 'Bearer ' + _hfImgKey, 'Content-Type': 'application/json'},
        body: JSON.stringify({inputs: request.prompt || '', parameters: {width: request.width || 1024, height: request.height || 1024, negative_prompt: request.negativePrompt || ''}})
      }).then(function (r) {
        if (r.status === 503) return r.json().then(function (d) { throw new Error('HF model loading (~' + Math.round(d.estimated_time || 30) + 's), retry shortly'); });
        if (!r.ok) throw new Error(providerId + ' HF error ' + r.status);
        return r.blob().then(function (b) {
          return LoadProviderRegistry.normalizeResult({type: 'image', blob: b, url: URL.createObjectURL(b), provider: providerId});
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

    // Cloud HF Inference API paths — work with HF key, no local server needed
    var hfKey = (_settings['huggingface'] || {}).apiKey || null;
    var hfBase = 'https://api-inference.huggingface.co/models/';

    if (hfKey && !endpoint) {
      var hfModel = null;
      var hfBody = null;
      if (providerId === 'kokoro') {
        hfModel = 'hexgrad/Kokoro-82M';
        hfBody = JSON.stringify({inputs: request.text || '', parameters: {voice: request.voice || s.voice || 'af_heart'}});
      } else if (providerId === 'bark') {
        hfModel = 'suno/bark';
        hfBody = JSON.stringify({inputs: request.text || ''});
      } else if (providerId === 'xtts' || providerId === 'xtts-v2') {
        hfModel = 'coqui/XTTS-v2';
        hfBody = JSON.stringify({inputs: request.text || '', parameters: {language: s.language || 'en'}});
      } else if (providerId === 'mms-tts' || providerId === 'vits') {
        hfModel = 'facebook/mms-tts-eng';
        hfBody = JSON.stringify({inputs: request.text || ''});
      }
      if (hfModel && hfBody) {
        return fetch(hfBase + hfModel, {
          method: 'POST',
          headers: {'Authorization': 'Bearer ' + hfKey, 'Content-Type': 'application/json'},
          body: hfBody
        }).then(function(r) {
          if (r.status === 503) return r.json().then(function(d) { throw new Error('HF model loading (~' + Math.round(d.estimated_time || 20) + 's), retry shortly'); });
          if (!r.ok) throw new Error(providerId + ' HF error ' + r.status);
          return r.blob().then(function(b) {
            return LoadProviderRegistry.normalizeResult({type:'audio', blob:b, url:URL.createObjectURL(b), provider:providerId});
          });
        });
      }
    }

    // Local TTS endpoints (Kokoro, XTTS, Piper via LocalAI, Bark, etc.)
    if (endpoint) {
      var path = (providerId === 'xtts')            ? '/tts_to_audio/' :
                 (providerId === 'localai')         ? '/v1/audio/speech' :
                 (providerId === 'kokoro')          ? '/v1/audio/speech' :
                 (providerId === 'piper')           ? '/api/tts' :
                 (providerId === 'f5-tts')          ? '/run/predict' :
                 (providerId === 'styletts2')       ? '/synthesize' :
                 (providerId === 'vits')            ? '/synthesize' :
                 (providerId === 'tortoise-tts')    ? '/api/tts' :
                 (providerId === 'valle-x')         ? '/generate' :
                 (providerId === 'bark')            ? '/generate_audio' :
                 (providerId === 'openvoice')       ? '/tts' :
                 (providerId === 'dia')             ? '/generate' :
                 (providerId === 'chatterbox')      ? '/tts' :
                 (providerId === 'chatterbox-turbo')? '/tts' :
                 (providerId === 'melo-tts')        ? '/synthesize' :
                 (providerId === 'orpheus')         ? '/generate' :
                 (providerId === 'higgs-audio')     ? '/generate' :
                 '/synthesize';
      var body;
      if (providerId === 'kokoro' || providerId === 'localai') {
        body = JSON.stringify({model:s.model||'kokoro', input:request.text||'', voice:request.voice||s.voice||'af_heart', response_format:'wav'});
      } else if (providerId === 'f5-tts') {
        body = JSON.stringify({data:[request.text||'', null, '', true, 0.3, 0.7, 0.7, 32000, 0]});
      } else if (providerId === 'piper') {
        body = JSON.stringify({text:request.text||''});
      } else if (providerId === 'bark') {
        body = JSON.stringify({text_prompt:request.text||'', history_prompt:request.voice||null});
      } else if (providerId === 'tortoise-tts') {
        body = JSON.stringify({text:request.text||'', voice:request.voice||'random', preset:'fast'});
      } else if (providerId === 'valle-x') {
        body = JSON.stringify({text:request.text||'', language:'English', accent:'English'});
      } else if (providerId === 'chatterbox' || providerId === 'chatterbox-turbo') {
        body = JSON.stringify({text:request.text||'', exaggeration:0.5, cfg_weight:0.5});
      } else if (providerId === 'melo-tts') {
        body = JSON.stringify({text:request.text||'', speaker_id:s.speaker||0, language:s.language||'EN', speed:request.rate||1.0});
      } else if (providerId === 'styletts2') {
        body = JSON.stringify({text:request.text||'', diffusion_steps:10, embedding_scale:1});
      } else if (providerId === 'orpheus') {
        body = JSON.stringify({model:s.model||'orpheus-3b', prompt:request.text||'', voice:request.voice||s.voice||'tara', response_format:'wav'});
      } else {
        body = JSON.stringify({text:request.text, voice:request.voice||s.voice||'default', language:s.language||'en'});
      }
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

    if (providerId === 'coqui') {
      var cqEp = endpoint || 'http://localhost:5002';
      var cqUrl = cqEp + '/api/tts?text=' + encodeURIComponent(request.text || '') + '&speaker_id=' + encodeURIComponent(s.speaker || '') + '&language_id=';
      return fetch(cqUrl)
        .then(function (r) {
          if (!r.ok) throw new Error('Coqui TTS ' + r.status);
          return r.blob();
        }).then(function (b) {
          return LoadProviderRegistry.normalizeResult({type: 'audio', blob: b, url: URL.createObjectURL(b), provider: 'coqui'});
        });
    }

    if (providerId === 'dia') {
      var hfDiaKey = (_settings['huggingface'] || {}).apiKey || key || null;
      if (hfDiaKey && !endpoint) {
        return fetch('https://api-inference.huggingface.co/models/nari-labs/Dia-1.6B', {
          method: 'POST',
          headers: {'Authorization': 'Bearer ' + hfDiaKey, 'Content-Type': 'application/json'},
          body: JSON.stringify({inputs: request.text || ''})
        }).then(function (r) {
          if (r.status === 503) return r.json().then(function (d) { throw new Error('HF model loading (~' + Math.round(d.estimated_time || 30) + 's), retry shortly'); });
          if (!r.ok) throw new Error('Dia HF error ' + r.status);
          return r.blob().then(function (b) {
            return LoadProviderRegistry.normalizeResult({type: 'audio', blob: b, url: URL.createObjectURL(b), provider: 'dia'});
          });
        });
      }
      if (!endpoint) return Promise.reject(new Error('Dia: no HuggingFace key or local endpoint configured'));
      return fetch(endpoint + '/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text: request.text || '', voice: s.voice || null})
      }).then(function (r) {
        if (!r.ok) throw new Error('Dia ' + r.status);
        return r.blob();
      }).then(function (b) {
        return LoadProviderRegistry.normalizeResult({type: 'audio', blob: b, url: URL.createObjectURL(b), provider: 'dia'});
      });
    }

    return Promise.reject(new Error('generateAudio: no endpoint for provider: ' + providerId));
  },

  transcribeAudio: function (request) {
    // request: { blob, providerId, language }
    var providerId = request.providerId || 'faster-whisper';
    var s = _settings[providerId] || {};
    var endpoint = s.endpoint || (this.getProvider(providerId) || {}).defaultEndpoint;
    var key = s.apiKey;

    if (providerId === 'deepgram') {
      if (!key) return Promise.reject(new Error('Deepgram: no API key'));
      return fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
        method:'POST',
        headers:{'Authorization':'Token '+key,'Content-Type':request.blob.type||'audio/wav'},
        body:request.blob
      }).then(function(r){
        if(!r.ok) throw new Error('Deepgram '+r.status);
        return r.json().then(function(d){
          var text=((d.results&&d.results.channels&&d.results.channels[0]&&d.results.channels[0].alternatives&&d.results.channels[0].alternatives[0])||{}).transcript||'';
          return LoadProviderRegistry.normalizeResult({type:'transcript',text:text,provider:'deepgram'});
        });
      });
    }
    if (providerId === 'assemblyai') {
      if (!key) return Promise.reject(new Error('AssemblyAI: no API key'));
      var aaiHeaders = {'Authorization':key,'Content-Type':'application/octet-stream'};
      return fetch('https://api.assemblyai.com/v2/upload',{method:'POST',headers:aaiHeaders,body:request.blob})
        .then(function(r){ if(!r.ok) throw new Error('AssemblyAI upload '+r.status); return r.json(); })
        .then(function(up){
          return fetch('https://api.assemblyai.com/v2/transcript',{
            method:'POST',
            headers:{'Authorization':key,'Content-Type':'application/json'},
            body:JSON.stringify({audio_url:up.upload_url,language_detection:true})
          });
        })
        .then(function(r){ if(!r.ok) throw new Error('AssemblyAI transcript request '+r.status); return r.json(); })
        .then(function(tr){
          return LoadProviderRegistry.normalizeResult({type:'transcript-job',jobId:tr.id,provider:'assemblyai',metadata:{status:tr.status}});
        });
    }
    // Cloud HF Inference API for Whisper — works with HF key, no local server needed
    var hfKeySTT = (_settings['huggingface'] || {}).apiKey || null;
    var isWhisperProvider = providerId === 'whisper' || providerId === 'faster-whisper' ||
                            providerId === 'whisperx' || providerId === 'moonshine' ||
                            providerId === 'distil-whisper';
    if (hfKeySTT && !endpoint && isWhisperProvider) {
      var whisperModel = (providerId === 'moonshine') ? 'UsefulSensors/moonshine-base'
                       : (providerId === 'distil-whisper') ? 'distil-whisper/distil-large-v3'
                       : 'openai/whisper-large-v3-turbo';
      return fetch('https://api-inference.huggingface.co/models/' + whisperModel, {
        method: 'POST',
        headers: {'Authorization': 'Bearer ' + hfKeySTT, 'Content-Type': request.blob.type || 'audio/wav'},
        body: request.blob
      }).then(function(r) {
        if (r.status === 503) return r.json().then(function(d) { throw new Error('HF Whisper loading (~' + Math.round(d.estimated_time || 20) + 's), retry shortly'); });
        if (!r.ok) throw new Error('HF Whisper error ' + r.status);
        return r.json().then(function(d) {
          var text = d.text || (Array.isArray(d.chunks) ? d.chunks.map(function(c){return c.text;}).join(' ') : '') || '';
          return LoadProviderRegistry.normalizeResult({type:'transcript', text:text, provider:providerId});
        });
      });
    }

    if (!endpoint) return Promise.reject(new Error('transcribeAudio: no endpoint for provider: ' + providerId + ' — set HuggingFace key or local endpoint in provider settings'));

    var fd = new FormData();
    fd.append('file', request.blob, 'audio.wav');
    if (request.language) fd.append('language', request.language);

    var path = (providerId === 'faster-whisper')  ? '/transcribe' :
               (providerId === 'localai')          ? '/v1/audio/transcriptions' :
               (providerId === 'whisperx')         ? '/asr' :
               (providerId === 'vosk')             ? '/transcribe' :
               (providerId === 'moonshine')        ? '/transcribe' :
               (providerId === 'nvidia-canary')    ? '/transcribe' :
               (providerId === 'qwen3-asr')        ? '/transcribe' :
               (providerId === 'pyannote')         ? '/diarize' :
               (providerId === 'speechbrain')      ? '/transcribe' :
               (providerId === 'nemo-asr')         ? '/transcribe' :
               (providerId === 'paddlespeech')     ? '/paddlespeech/asr' :
               '/transcribe';

    return fetch(endpoint + path, {method:'POST', body: fd})
      .then(function (r) {
        if (!r.ok) throw new Error(providerId + ' transcribe error ' + r.status);
        return r.json().then(function (d) {
          if (providerId === 'pyannote') {
            return LoadProviderRegistry.normalizeResult({type:'diarization', text:'', data:d, provider:providerId});
          }
          var text = d.text || d.transcription || d.result || '';
          return LoadProviderRegistry.normalizeResult({type:'transcript', text:text, provider:providerId});
        });
      });
  },

  generateVideo: function (request) {
    // request: { prompt, image, width, height, frames, fps, providerId, duration, aspectRatio }
    var providerId = request.providerId;
    var s = _settings[providerId] || {};
    var endpoint = s.endpoint || (this.getProvider(providerId) || {}).defaultEndpoint;
    var key = s.apiKey;

    if (providerId === 'kling') {
      if (!key) return Promise.reject(new Error('Kling: no API key'));
      return fetch('https://api.kling.ai/v1/videos/text2video', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
        body:JSON.stringify({model_name:s.model||'kling-v1',prompt:request.prompt||'',duration:request.duration||5,aspect_ratio:request.aspectRatio||'16:9'})
      }).then(function(r){
        if(!r.ok) throw new Error('Kling '+r.status);
        return r.json().then(function(d){
          return LoadProviderRegistry.normalizeResult({type:'video-job',jobId:d.data&&d.data.task_id,provider:'kling'});
        });
      });
    }
    if (providerId === 'hailuo') {
      if (!key) return Promise.reject(new Error('Hailuo: no API key'));
      return fetch('https://api.minimax.chat/v1/video_generation', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
        body:JSON.stringify({model:s.model||'video-01',prompt:request.prompt||''})
      }).then(function(r){
        if(!r.ok) throw new Error('Hailuo '+r.status);
        return r.json().then(function(d){
          return LoadProviderRegistry.normalizeResult({type:'video-job',jobId:d.task_id,provider:'hailuo'});
        });
      });
    }
    if (providerId === 'luma-dream') {
      if (!key) return Promise.reject(new Error('Luma: no API key'));
      return fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
        body:JSON.stringify({prompt:request.prompt||'',aspect_ratio:request.aspectRatio||'16:9',loop:false})
      }).then(function(r){
        if(!r.ok) throw new Error('Luma '+r.status);
        return r.json().then(function(d){
          return LoadProviderRegistry.normalizeResult({type:'video-job',jobId:d.id,provider:'luma-dream'});
        });
      });
    }
    if (providerId === 'pika') {
      if (!key) return Promise.reject(new Error('Pika: no API key'));
      return fetch('https://api.pika.art/v1/generate', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
        body:JSON.stringify({prompt:request.prompt||'',options:{frameRate:request.fps||24,aspectRatio:request.aspectRatio||'16:9',duration:request.duration||3}})
      }).then(function(r){
        if(!r.ok) throw new Error('Pika '+r.status);
        return r.json().then(function(d){
          return LoadProviderRegistry.normalizeResult({type:'video-job',jobId:d.id||d.job_id,provider:'pika'});
        });
      });
    }
    if (providerId === 'pixverse') {
      if (!key) return Promise.reject(new Error('PixVerse: no API key'));
      return fetch('https://app-api.pixverse.ai/openapi/v2/video/text/generate', {
        method:'POST',
        headers:{'Content-Type':'application/json','API-KEY':key},
        body:JSON.stringify({prompt:request.prompt||'',quality:'high',aspect_ratio:'16:9',duration:request.duration||5})
      }).then(function(r){
        if(!r.ok) throw new Error('PixVerse '+r.status);
        return r.json().then(function(d){
          return LoadProviderRegistry.normalizeResult({type:'video-job',jobId:d.Resp&&d.Resp.video_id,provider:'pixverse'});
        });
      });
    }
    if (providerId === 'heygen') {
      if (!key) return Promise.reject(new Error('HeyGen: no API key'));
      return fetch('https://api.heygen.com/v2/video/generate', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':key},
        body:JSON.stringify({video_inputs:[{character:{type:'avatar',avatar_id:s.avatarId||'Anna_public_3_20240108'},voice:{type:'text',input_text:request.prompt||'',voice_id:s.voiceId||'1bd001e7e50f421d891986aad5158bc8'}}],dimension:{width:request.width||1280,height:request.height||720}})
      }).then(function(r){
        if(!r.ok) throw new Error('HeyGen '+r.status);
        return r.json().then(function(d){
          return LoadProviderRegistry.normalizeResult({type:'video-job',jobId:d.data&&d.data.video_id,provider:'heygen'});
        });
      });
    }

    if (providerId === 'zsky') {
      if (!key) return Promise.reject(new Error('ZSky: no API key'));
      if (!endpoint) return Promise.reject(new Error('ZSky: no endpoint configured — set endpoint in provider settings'));
      return fetch(endpoint + '/v1/video/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key},
        body: JSON.stringify({prompt: request.prompt || '', aspect_ratio: request.aspectRatio || '16:9', duration: request.duration || 5})
      }).then(function (r) {
        if (!r.ok) throw new Error('ZSky ' + r.status);
        return r.json().then(function (d) {
          return LoadProviderRegistry.normalizeResult({type: 'video-job', jobId: d.id || d.job_id || d.task_id, provider: 'zsky', data: d});
        });
      });
    }

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

  searchMusic: function (request) {
    // request: { query, genre, page, providerId, limit }
    // Returns Promise<{ provider, results: [{id,title,artist,duration,previewUrl,licenseType,attribution,provider}] }>
    var providerId = request.providerId || 'freesound';
    var s = _settings[providerId] || {};
    var key = s.apiKey || null;
    var query = request.query || request.genre || 'music';
    var page = request.page || 1;
    var limit = request.limit || 20;

    if (providerId === 'freesound') {
      if (!key) return Promise.resolve({provider: 'freesound', results: [], status: 'needs-key', needsKey: true});
      return _freesoundSearch(key, query, 'tag:music', limit, page)
        .then(function (r) { return {provider: 'freesound', results: r}; })
        .catch(function (e) { return {provider: 'freesound', results: [], error: e.message}; });
    }
    if (providerId === 'pixabay-music') {
      if (!key) return Promise.resolve({provider:'pixabay-music', results:[], status:'needs-key', needsKey:true});
      return fetch('https://pixabay.com/api/?key='+encodeURIComponent(key)+'&q='+encodeURIComponent(query)+'&media_type=music&per_page='+limit+'&page='+page)
        .then(function(r){ if(!r.ok) throw new Error('Pixabay Music '+r.status); return r.json(); })
        .then(function(d){
          return {provider:'pixabay-music', results:(d.hits||[]).map(function(h){
            return {id:String(h.id),title:h.tags,artist:'Pixabay',duration:null,previewUrl:h.previewURL||null,downloadUrl:h.previewURL||null,licenseType:'Pixabay License',attribution:'Pixabay',provider:'pixabay-music'};
          })};
        })
        .catch(function(e){ return {provider:'pixabay-music',results:[],error:e.message}; });
    }
    if (providerId === 'ccmixter') {
      return fetch('https://ccmixter.org/api/query?format=json&tags='+encodeURIComponent(query)+'&limit='+limit+'&offset='+((page-1)*limit)+'&sort=rank')
        .then(function(r){ if(!r.ok) throw new Error('ccMixter '+r.status); return r.json(); })
        .then(function(d){
          return {provider:'ccmixter', results:(Array.isArray(d)?d:[]).map(function(t){
            var artist=t.user_real_name||t.user_name||'Unknown';
            var url=(t.files&&t.files[0]&&t.files[0].download_url)||null;
            return {id:String(t.upload_id||''),title:t.upload_name||'',artist:artist,duration:null,previewUrl:url,downloadUrl:url,licenseType:t.license_name||'CC',attribution:(t.upload_name||'')+' by '+artist+' (ccMixter)',provider:'ccmixter'};
          })};
        })
        .catch(function(e){ return {provider:'ccmixter',results:[],error:e.message}; });
    }
    if (providerId === 'free-music-archive') {
      if (!key) return Promise.resolve({provider:'free-music-archive', results:[], status:'needs-key', needsKey:true});
      return fetch('https://freemusicarchive.org/api/get/tracks.json?api_key='+encodeURIComponent(key)+'&search='+encodeURIComponent(query)+'&limit='+limit+'&page='+page)
        .then(function(r){ if(!r.ok) throw new Error('FMA '+r.status); return r.json(); })
        .then(function(d){
          return {provider:'free-music-archive', results:(d.dataset||[]).map(function(t){
            return {id:String(t.track_id||''),title:t.track_title||'',artist:t.artist_name||'',duration:t.track_duration||null,previewUrl:t.track_file||null,downloadUrl:t.track_file||null,licenseType:t.license_title||'CC',attribution:(t.track_title||'')+' by '+(t.artist_name||'')+' (Free Music Archive)',provider:'free-music-archive'};
          })};
        })
        .catch(function(e){ return {provider:'free-music-archive',results:[],error:e.message}; });
    }
    if (providerId === 'jamendo') {
      if (!key) return Promise.resolve({provider:'jamendo', results:[], status:'needs-key', needsKey:true});
      var offset = (page - 1) * limit;
      return fetch('https://api.jamendo.com/v3.0/tracks/?client_id='+encodeURIComponent(key)+'&format=json&limit='+limit+'&offset='+offset+'&search='+encodeURIComponent(query)+'&audioformat=mp32&include=musicinfo')
        .then(function(r){ if(!r.ok) throw new Error('Jamendo '+r.status); return r.json(); })
        .then(function(d){
          return {provider:'jamendo', results:(d.results||[]).map(function(t){
            return {id:String(t.id||''),title:t.name||'',artist:t.artist_name||'',duration:t.duration||null,previewUrl:t.audiodownload||t.audio||null,downloadUrl:t.audiodownload||null,licenseType:t.license_ccurl||'CC',attribution:(t.name||'')+' by '+(t.artist_name||'')+' (Jamendo)',provider:'jamendo'};
          })};
        })
        .catch(function(e){ return {provider:'jamendo',results:[],error:e.message}; });
    }
    if (providerId === 'openverse-audio') {
      return fetch('https://api.openverse.org/v1/audio/?q='+encodeURIComponent(query)+'&page_size='+limit+'&page='+page)
        .then(function(r){ if(!r.ok) throw new Error('Openverse audio '+r.status); return r.json(); })
        .then(function(d){
          return {provider:'openverse-audio', results:(d.results||[]).map(function(t){
            return {id:String(t.id||''),title:t.title||'',artist:t.creator||'',duration:t.duration||null,previewUrl:t.url||null,downloadUrl:t.url||null,licenseType:t.license||'CC',attribution:(t.title||'')+' by '+(t.creator||'')+' (Openverse)',provider:'openverse-audio'};
          })};
        })
        .catch(function(e){ return {provider:'openverse-audio',results:[],error:e.message}; });
    }
    return Promise.resolve({provider: providerId, results: [], status: 'no-connector'});
  },

  searchSFX: function (request) {
    // request: { query, category, page, providerId, limit }
    var providerId = request.providerId || 'freesound';
    var s = _settings[providerId] || {};
    var key = s.apiKey || null;
    var query = request.query || request.category || 'sound effect';
    var page = request.page || 1;
    var limit = request.limit || 20;

    if (providerId === 'freesound') {
      if (!key) return Promise.resolve({provider: 'freesound', results: [], status: 'needs-key', needsKey: true});
      return _freesoundSearch(key, query, null, limit, page)
        .then(function (r) { return {provider: 'freesound', results: r}; })
        .catch(function (e) { return {provider: 'freesound', results: [], error: e.message}; });
    }
    if (providerId === 'openverse-sfx') {
      return fetch('https://api.openverse.org/v1/audio/?q='+encodeURIComponent(query)+'&page_size='+limit+'&page='+page+'&category=sound_effect')
        .then(function(r){ if(!r.ok) throw new Error('Openverse SFX '+r.status); return r.json(); })
        .then(function(d){
          return {provider:'openverse-sfx', results:(d.results||[]).map(function(t){
            return {id:String(t.id||''),title:t.title||'',artist:t.creator||'',duration:t.duration||null,previewUrl:t.url||null,downloadUrl:t.url||null,licenseType:t.license||'CC',attribution:(t.title||'')+' by '+(t.creator||'')+' (Openverse)',provider:'openverse-sfx'};
          })};
        })
        .catch(function(e){ return {provider:'openverse-sfx',results:[],error:e.message}; });
    }
    if (providerId === 'bbc-sfx') {
      return fetch('https://sound-effects.bbcrewind.co.uk/api/sfx/results?q='+encodeURIComponent(query)+'&limit='+limit+'&page='+page)
        .then(function(r){ if(!r.ok) throw new Error('BBC SFX '+r.status); return r.json(); })
        .then(function(d){
          return {provider:'bbc-sfx', results:((d.soundeffects&&d.soundeffects.results)||[]).map(function(item){
            return {id:String(item.id||''),title:item.description||'',previewUrl:'https://sound-effects-media.bbcrewind.co.uk/mp3/'+item.id+'.mp3',downloadUrl:'https://sound-effects-media.bbcrewind.co.uk/mp3/'+item.id+'.mp3',licenseType:'RemArc',attribution:'BBC Sound Effects',mediaType:'audio',provider:'bbc-sfx'};
          })};
        })
        .catch(function(e){ return {provider:'bbc-sfx',results:[],error:e.message}; });
    }
    return Promise.resolve({provider: providerId, results: [], status: 'no-connector'});
  },

  searchStock: function (request) {
    // request: { query, mediaType ('image'|'video'|'audio'), page, providerId }
    var providerId = request.providerId;
    var mediaType = request.mediaType || 'image';
    var query = request.query || 'nature';
    var page = request.page || 1;

    if (!providerId) {
      var pKey = (_settings['pexels'] || {}).apiKey;
      var pbKey = (_settings['pixabay-stock'] || {}).apiKey;
      providerId = pKey ? 'pexels' : pbKey ? 'pixabay-stock' : 'wikimedia';
    }
    var s = _settings[providerId] || {};
    var key = s.apiKey || null;

    if (providerId === 'pexels') {
      if (!key) return Promise.resolve({provider: 'pexels', results: [], status: 'needs-key', needsKey: true});
      return _pexelsSearch(key, query, mediaType, page)
        .then(function (r) { return {provider: 'pexels', results: r}; })
        .catch(function (e) { return {provider: 'pexels', results: [], error: e.message}; });
    }
    if (providerId === 'pixabay-stock') {
      if (!key) return Promise.resolve({provider: 'pixabay-stock', results: [], status: 'needs-key', needsKey: true});
      return _pixabaySearch(key, query, mediaType, page)
        .then(function (r) { return {provider: 'pixabay-stock', results: r}; })
        .catch(function (e) { return {provider: 'pixabay-stock', results: [], error: e.message}; });
    }
    if (providerId === 'wikimedia') {
      return _wikimediaSearch(query, mediaType, page)
        .then(function (r) { return {provider: 'wikimedia', results: r}; })
        .catch(function (e) { return {provider: 'wikimedia', results: [], error: e.message}; });
    }
    if (providerId === 'nasa-library') {
      return _nasaSearch(query, mediaType, page)
        .then(function (r) { return {provider: 'nasa-library', results: r}; })
        .catch(function (e) { return {provider: 'nasa-library', results: [], error: e.message}; });
    }
    if (providerId === 'openverse') {
      var ovPath = (mediaType === 'audio') ? 'audio' : 'images';
      return fetch('https://api.openverse.org/v1/'+ovPath+'/?q='+encodeURIComponent(query)+'&page_size=20&page='+page)
        .then(function(r){ if(!r.ok) throw new Error('Openverse '+r.status); return r.json(); })
        .then(function(d){
          return {provider:'openverse', results:(d.results||[]).map(function(item){
            return {id:String(item.id||''),title:item.title||'',url:item.url||null,thumbUrl:item.thumbnail||item.url||null,attribution:(item.title||'')+' by '+(item.creator||'Unknown')+' (Openverse - '+item.license+')',mediaType:ovPath==='audio'?'audio':'image',provider:'openverse'};
          })};
        })
        .catch(function(e){ return {provider:'openverse',results:[],error:e.message}; });
    }
    if (providerId === 'internet-archive') {
      var iaMediaType = mediaType === 'video' ? 'movies' : mediaType === 'audio' ? 'audio' : 'image';
      return fetch('https://archive.org/advancedsearch.php?q='+encodeURIComponent(query)+'+AND+mediatype:'+iaMediaType+'&fl[]=identifier,title,mediatype,description&output=json&rows=20&page='+page)
        .then(function(r){ if(!r.ok) throw new Error('Internet Archive '+r.status); return r.json(); })
        .then(function(d){
          return {provider:'internet-archive', results:((d.response&&d.response.docs)||[]).map(function(item){
            return {id:String(item.identifier||''),title:item.title||'',url:'https://archive.org/details/'+item.identifier,thumbUrl:'https://archive.org/services/img/'+item.identifier,attribution:'Internet Archive — '+item.title,mediaType:mediaType,provider:'internet-archive'};
          })};
        }).catch(function(e){ return {provider:'internet-archive',results:[],error:e.message}; });
    }
    if (providerId === 'coverr') {
      return fetch('https://coverr.co/api/videos?keywords='+encodeURIComponent(query)+'&page='+page)
        .then(function(r){ if(!r.ok) throw new Error('Coverr '+r.status); return r.json(); })
        .then(function(d){
          return {provider:'coverr', results:((d.hits&&d.hits.hits)||[]).map(function(item){
            var src=item&&item._source||{};
            return {id:String(item._id||''),title:src.title||'',url:src.urls&&src.urls.mp4_720||null,thumbUrl:src.urls&&src.urls.preview||null,attribution:'Coverr.co — free stock video',mediaType:'video',provider:'coverr'};
          })};
        }).catch(function(e){ return {provider:'coverr',results:[],error:e.message}; });
    }
    return Promise.resolve({provider: providerId, results: [], status: 'no-connector'});
  },

  pollJobResult: function (request) {
    // request: { jobId, providerId }
    var providerId = request.providerId;
    var jobId = request.jobId;
    var s = _settings[providerId] || {};
    var endpoint = s.endpoint || (this.getProvider(providerId) || {}).defaultEndpoint;
    var key = s.apiKey;
    if (providerId === 'comfyui') {
      if (!endpoint) return Promise.reject(new Error('ComfyUI: no endpoint'));
      return _pollJobComfyUI(endpoint, jobId);
    }
    if (providerId === 'aihorde') {
      return _pollJobAiHorde(jobId, key);
    }
    if (providerId === 'assemblyai') {
      if (!key) return Promise.reject(new Error('AssemblyAI: no API key'));
      return fetch('https://api.assemblyai.com/v2/transcript/'+jobId, {headers:{'Authorization':key}})
        .then(function(r){ if(!r.ok) throw new Error('AssemblyAI poll '+r.status); return r.json(); })
        .then(function(d){
          if(d.status==='completed') return Object.assign({done:true},LoadProviderRegistry.normalizeResult({type:'transcript',text:d.text||'',provider:'assemblyai'}));
          if(d.status==='error') return {done:true,error:d.error,provider:'assemblyai'};
          return {done:false,status:d.status,provider:'assemblyai'};
        });
    }
    if (providerId === 'kling') {
      if (!key) return Promise.reject(new Error('Kling: no API key'));
      return fetch('https://api.kling.ai/v1/videos/text2video/'+jobId, {headers:{'Authorization':'Bearer '+key}})
        .then(function(r){ if(!r.ok) throw new Error('Kling poll '+r.status); return r.json(); })
        .then(function(d){
          var task=d.data||{};
          if(task.task_status==='succeed'){
            var url=task.task_result&&task.task_result.videos&&task.task_result.videos[0]&&task.task_result.videos[0].url;
            return Object.assign({done:true},LoadProviderRegistry.normalizeResult({type:'video',url:url,provider:'kling'}));
          }
          if(task.task_status==='failed') return {done:true,error:'task failed',provider:'kling'};
          return {done:false,status:task.task_status,provider:'kling'};
        });
    }
    if (providerId === 'hailuo') {
      if (!key) return Promise.reject(new Error('Hailuo: no API key'));
      return fetch('https://api.minimax.chat/v1/query/video_generation?task_id='+jobId, {headers:{'Authorization':'Bearer '+key}})
        .then(function(r){ if(!r.ok) throw new Error('Hailuo poll '+r.status); return r.json(); })
        .then(function(d){
          if(d.status==='Success'){
            return Object.assign({done:true},LoadProviderRegistry.normalizeResult({type:'video',url:null,provider:'hailuo',metadata:{fileId:d.file_id}}));
          }
          if(d.status==='Fail') return {done:true,error:d.message,provider:'hailuo'};
          return {done:false,status:d.status,provider:'hailuo'};
        });
    }
    if (providerId === 'luma-dream') {
      if (!key) return Promise.reject(new Error('Luma: no API key'));
      return fetch('https://api.lumalabs.ai/dream-machine/v1/generations/'+jobId, {headers:{'Authorization':'Bearer '+key}})
        .then(function(r){ if(!r.ok) throw new Error('Luma poll '+r.status); return r.json(); })
        .then(function(d){
          if(d.state==='completed'){
            var url=d.assets&&d.assets.video;
            return Object.assign({done:true},LoadProviderRegistry.normalizeResult({type:'video',url:url,provider:'luma-dream'}));
          }
          if(d.state==='failed') return {done:true,error:d.failure_reason||'failed',provider:'luma-dream'};
          return {done:false,status:d.state,provider:'luma-dream'};
        });
    }
    if (providerId === 'pika') {
      if (!key) return Promise.reject(new Error('Pika: no API key'));
      return fetch('https://api.pika.art/v1/jobs/'+jobId, {headers:{'Authorization':'Bearer '+key}})
        .then(function(r){ if(!r.ok) throw new Error('Pika poll '+r.status); return r.json(); })
        .then(function(d){
          if(d.status==='succeeded'||d.status==='finished'){
            return Object.assign({done:true},LoadProviderRegistry.normalizeResult({type:'video',url:d.video&&d.video.resultUrl,provider:'pika'}));
          }
          if(d.status==='failed') return {done:true,error:'task failed',provider:'pika'};
          return {done:false,status:d.status,provider:'pika'};
        });
    }
    if (providerId === 'pixverse') {
      if (!key) return Promise.reject(new Error('PixVerse: no API key'));
      return fetch('https://app-api.pixverse.ai/openapi/v2/video/'+jobId, {headers:{'API-KEY':key}})
        .then(function(r){ if(!r.ok) throw new Error('PixVerse poll '+r.status); return r.json(); })
        .then(function(d){
          var resp=d.Resp||{};
          if(resp.status===1) return Object.assign({done:true},LoadProviderRegistry.normalizeResult({type:'video',url:resp.url,provider:'pixverse'}));
          if(resp.status===3) return {done:true,error:'task failed',provider:'pixverse'};
          return {done:false,status:resp.status,provider:'pixverse'};
        });
    }
    if (providerId === 'heygen') {
      if (!key) return Promise.reject(new Error('HeyGen: no API key'));
      return fetch('https://api.heygen.com/v1/video_status.get?video_id='+jobId, {headers:{'x-api-key':key}})
        .then(function(r){ if(!r.ok) throw new Error('HeyGen poll '+r.status); return r.json(); })
        .then(function(d){
          var data=d.data||{};
          if(data.status==='completed') return Object.assign({done:true},LoadProviderRegistry.normalizeResult({type:'video',url:data.video_url,provider:'heygen',metadata:{thumbnail:data.thumbnail_url}}));
          if(data.status==='failed') return {done:true,error:data.error||'failed',provider:'heygen'};
          return {done:false,status:data.status,progress:data.progress,provider:'heygen'};
        });
    }
    return Promise.reject(new Error('pollJobResult: unsupported provider ' + providerId));
  },

  callLLM: function (request) {
    // request: { messages, prompt, model, providerId, maxTokens, temperature }
    var providerId = request.providerId || 'pollinations-text';
    var s = _settings[providerId] || {};
    var endpoint = s.endpoint || (this.getProvider(providerId) || {}).defaultEndpoint;
    var key = s.apiKey;

    if (providerId === 'pollinations-text') {
      var msgs = Array.isArray(request.messages) ? request.messages : [{role: 'user', content: request.prompt || ''}];
      return fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({model: request.model || 'openai', messages: msgs, max_tokens: request.maxTokens || 1024})
      }).then(function (r) {
        if (!r.ok) throw new Error('Pollinations text ' + r.status);
        return r.json().then(function (d) {
          var text = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || d.text || '';
          return LoadProviderRegistry.normalizeResult({type: 'text', text: text, provider: 'pollinations-text'});
        });
      });
    }

    // Gemini: uses generateContent API (not OpenAI-compat chat/completions)
    if (providerId === 'gemini') {
      if (!key) return Promise.reject(new Error('Gemini: no API key'));
      var geminiModel = s.model || request.model || 'gemini-2.0-flash';
      var geminiParts = [];
      var geminiMsgs = Array.isArray(request.messages) ? request.messages : [{role: 'user', content: request.prompt || ''}];
      geminiMsgs.forEach(function (m) { if (m.role === 'user') geminiParts.push({text: m.content || ''}); });
      if (!geminiParts.length) geminiParts.push({text: request.prompt || ''});
      return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + geminiModel + ':generateContent?key=' + key, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({contents: [{role: 'user', parts: geminiParts}], generationConfig: {maxOutputTokens: request.maxTokens || 1024, temperature: request.temperature || 0.7}})
      }).then(function (r) {
        if (!r.ok) throw new Error('Gemini error ' + r.status);
        return r.json().then(function (d) {
          var text = ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts && d.candidates[0].content.parts[0]) || {}).text || '';
          return LoadProviderRegistry.normalizeResult({type: 'text', text: text, provider: 'gemini'});
        });
      });
    }

    // Cloud provider route table — base includes /v1, append /chat/completions only
    var _cloudRoutes = {
      'groq':        { base:'https://api.groq.com/openai/v1',              model:'llama-3.3-70b-versatile' },
      'cerebras':    { base:'https://api.cerebras.ai/v1',                  model:'llama-3.3-70b' },
      'sambanova':   { base:'https://fast-api.snova.ai/v1',                model:'Meta-Llama-3.3-70B-Instruct' },
      'nvidia-nim':  { base:'https://integrate.api.nvidia.com/v1',         model:'meta/llama-3.3-70b-instruct' },
      'fireworks-ai':{ base:'https://api.fireworks.ai/inference/v1',       model:'accounts/fireworks/models/llama-v3p3-70b-instruct' },
      'aiml-api':    { base:'https://api.aimlapi.com/v1',                  model:'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' },
      'mistral':     { base:'https://api.mistral.ai/v1',                   model:'mistral-small-latest' },
      'together-ai': { base:'https://api.together.xyz/v1',                 model:'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
      'deepinfra':   { base:'https://api.deepinfra.com/v1/openai',         model:'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' },
      'ai21':        { base:'https://api.ai21.com/studio/v1',              model:'jamba-mini-1.6' },
      'cohere':      { base:'https://api.cohere.com/compatibility/v1',     model:'command-r' },
      'openai':      { base:'https://api.openai.com/v1',                   model:'gpt-4o-mini' },
      'openrouter':  { base:'https://openrouter.ai/api/v1',                model:'meta-llama/llama-3.3-70b-instruct:free' }
    };
    var _cr = _cloudRoutes[providerId];
    if (_cr && key) {
      var crBase = (s.endpoint && s.endpoint.length > 4) ? s.endpoint : _cr.base;
      var crHeaders = {'Content-Type':'application/json','Authorization':'Bearer '+key};
      if (providerId === 'openrouter') crHeaders['HTTP-Referer'] = 'https://dssorit.github.io/ancient-covenant-scrolls/';
      var crMsgs = Array.isArray(request.messages) ? request.messages : [{role:'user',content:request.prompt||''}];
      return fetch(crBase+'/chat/completions', {
        method:'POST', headers:crHeaders,
        body:JSON.stringify({model:s.model||request.model||_cr.model, messages:crMsgs, max_tokens:request.maxTokens||1024, temperature:request.temperature||0.7})
      }).then(function(r){
        if (!r.ok) throw new Error(providerId+' error '+r.status);
        return r.json().then(function(d){
          var text=(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||'';
          return LoadProviderRegistry.normalizeResult({type:'text',text:text,provider:providerId});
        });
      });
    }

    // OpenAI-compatible fallback (Ollama, LM Studio, LocalAI, LiteLLM, vLLM, TGI, etc.)
    if (endpoint || key) {
      var baseUrl = endpoint || 'https://api.openai.com';
      var headers = {'Content-Type': 'application/json'};
      if (key) headers['Authorization'] = 'Bearer ' + key;
      var messages = Array.isArray(request.messages) ? request.messages : [{role: 'user', content: request.prompt || ''}];
      var chatUrl = baseUrl.replace(/\/v1\/?$/, '') + '/v1/chat/completions';
      return fetch(chatUrl, {
        method: 'POST', headers: headers,
        body: JSON.stringify({
          model: s.model || request.model || 'gpt-4o-mini',
          messages: messages,
          max_tokens: request.maxTokens || 1024,
          temperature: request.temperature || 0.7
        })
      }).then(function (r) {
        if (!r.ok) throw new Error(providerId + ' LLM error ' + r.status);
        return r.json().then(function (d) {
          var text = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
          return LoadProviderRegistry.normalizeResult({type: 'text', text: text, provider: providerId});
        });
      });
    }
    return Promise.reject(new Error('callLLM: no endpoint or key for: ' + providerId));
  },

  generateSpeech: function (request) {
    // Alias for generateAudio with ElevenLabs support added
    var providerId = request.providerId || 'browser-tts';
    var s = _settings[providerId] || {};
    var key = s.apiKey;

    if (providerId === 'elevenlabs') {
      if (!key) return Promise.reject(new Error('ElevenLabs: no API key'));
      var voiceId = s.voiceId || request.voiceId || 'Rachel';
      return fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'xi-api-key': key},
        body: JSON.stringify({text: request.text || '', model_id: 'eleven_monolingual_v1', voice_settings: {stability: 0.5, similarity_boost: 0.75}})
      }).then(function (r) {
        if (!r.ok) throw new Error('ElevenLabs error ' + r.status);
        return r.blob().then(function (b) {
          return LoadProviderRegistry.normalizeResult({type: 'audio', blob: b, url: URL.createObjectURL(b), provider: 'elevenlabs'});
        });
      });
    }
    return this.generateAudio(request);
  },

  generateMusic: function (request) {
    // request: { prompt, duration, providerId, type ('music'|'sfx') }
    var providerId = request.providerId || 'musicgen';
    var s = _settings[providerId] || {};
    var endpoint = s.endpoint || (this.getProvider(providerId) || {}).defaultEndpoint;

    // Cloud HF Inference API — works with HF key, no local server needed
    var hfKey = (_settings['huggingface'] || {}).apiKey || null;
    if (hfKey && !endpoint) {
      var hfModel = (providerId === 'audiogen') ? 'facebook/audiogen-medium' : 'facebook/musicgen-small';
      return fetch('https://api-inference.huggingface.co/models/' + hfModel, {
        method: 'POST',
        headers: {'Authorization': 'Bearer ' + hfKey, 'Content-Type': 'application/json'},
        body: JSON.stringify({inputs: request.prompt || 'ambient music'})
      }).then(function(r) {
        if (r.status === 503) return r.json().then(function(d) { throw new Error('HF model loading (~' + Math.round(d.estimated_time || 30) + 's), retry shortly'); });
        if (!r.ok) throw new Error(providerId + ' HF error ' + r.status);
        return r.blob().then(function(b) {
          return LoadProviderRegistry.normalizeResult({type:'audio', blob:b, url:URL.createObjectURL(b), provider:providerId});
        });
      });
    }

    if (!endpoint) return Promise.reject(new Error('generateMusic: no endpoint for ' + providerId + ' — set HuggingFace key or local endpoint in provider settings'));

    var path, body;
    if (providerId === 'musicgen' || providerId === 'audiogen') {
      path = '/generate';
      body = JSON.stringify({descriptions:[request.prompt||'ambient music'], duration:request.duration||10});
    } else if (providerId === 'riffusion') {
      path = '/run/predict';
      body = JSON.stringify({data:[request.prompt||'', '', 10, request.seed||42, 3, 1]});
    } else if (providerId === 'stable-audio-open') {
      path = '/generate';
      body = JSON.stringify({prompt:request.prompt||'', seconds_total:request.duration||15});
    } else if (providerId === 'diffrhythm') {
      path = '/run/predict';
      body = JSON.stringify({data:[request.prompt||'', '', request.duration||10]});
    } else if (providerId === 'audiox') {
      path = '/generate';
      body = JSON.stringify({text:request.prompt||'', duration:request.duration||10, guidance_scale:3.5});
    } else {
      path = '/generate';
      body = JSON.stringify({prompt:request.prompt||'', duration:request.duration||10});
    }

    return fetch(endpoint + path, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:body
    }).then(function(r){
      if(!r.ok) throw new Error(providerId+' music error '+r.status);
      var ct=r.headers.get('content-type')||'';
      if(ct.indexOf('audio')>=0||ct.indexOf('octet')>=0){
        return r.blob().then(function(b){
          return LoadProviderRegistry.normalizeResult({type:'audio',blob:b,url:URL.createObjectURL(b),provider:providerId});
        });
      }
      return r.json().then(function(d){
        var url=d.url||(Array.isArray(d.data)&&d.data[0])||null;
        if(url) return LoadProviderRegistry.normalizeResult({type:'audio',url:url,provider:providerId});
        throw new Error(providerId+': no audio URL in response');
      });
    });
  },

  generateLipSync: function (request) {
    // request: { videoBlob, audioBlob, imageUrl, audioUrl, providerId }
    var providerId = request.providerId || 'musetalk';
    var s = _settings[providerId] || {};
    var endpoint = s.endpoint || (this.getProvider(providerId) || {}).defaultEndpoint;
    if (!endpoint) return Promise.reject(new Error('generateLipSync: no endpoint for ' + providerId));

    var fd = new FormData();
    if (request.videoBlob) fd.append('video', request.videoBlob, 'video.mp4');
    if (request.audioBlob) fd.append('audio', request.audioBlob, 'audio.wav');
    if (request.imageUrl)  fd.append('image_url', request.imageUrl);
    if (request.audioUrl)  fd.append('audio_url', request.audioUrl);

    var path = (providerId === 'wav2lip')      ? '/run' :
               (providerId === 'musetalk')     ? '/inference' :
               (providerId === 'sadtalker')    ? '/generate' :
               (providerId === 'liveportrait') ? '/animate' :
               (providerId === 'latentsync')   ? '/run/predict' :
               (providerId === 'lipgan')       ? '/generate' :
               (providerId === 'makeitalk')    ? '/generate' :
               (providerId === 'difftalk')     ? '/generate' :
               '/generate';

    return fetch(endpoint + path, {method:'POST', body:fd})
      .then(function(r){
        if(!r.ok) throw new Error(providerId+' lip-sync error '+r.status);
        return r.json().then(function(d){
          var url=d.url||d.video_url||(Array.isArray(d.data)&&d.data[0])||null;
          if(url) return LoadProviderRegistry.normalizeResult({type:'video',url:url,provider:providerId});
          return LoadProviderRegistry.normalizeResult({type:'video-job',jobId:d.id||d.job_id,provider:providerId});
        });
      });
  },

  removeBackground: function (request) {
    // request: { blob, imageUrl, providerId }
    var providerId = request.providerId || 'rmbg';
    var s = _settings[providerId] || {};
    var key = s.apiKey || (_settings['huggingface'] || {}).apiKey || null;

    if (providerId === 'rmbg' || providerId === 'bg-removal-hf') {
      if (!key) return Promise.reject(new Error('RMBG-2.0: no HuggingFace API key configured'));
      var self = LoadProviderRegistry;
      if (!request.blob && request.imageUrl) {
        return fetch(request.imageUrl).then(function(r){ return r.blob(); })
          .then(function(b){ return self.removeBackground(Object.assign({}, request, {blob:b, imageUrl:null})); });
      }
      if (!request.blob) return Promise.reject(new Error('RMBG-2.0: provide blob or imageUrl'));
      return fetch('https://api-inference.huggingface.co/models/briaai/RMBG-2.0', {
        method: 'POST',
        headers: {'Authorization': 'Bearer ' + key, 'Content-Type': request.blob.type || 'image/png'},
        body: request.blob
      }).then(function(r){
        if (r.status === 503) return r.json().then(function(d){ throw new Error('HF model loading (~'+Math.round(d.estimated_time||30)+'s), retry shortly'); });
        if (!r.ok) throw new Error('RMBG-2.0 error ' + r.status);
        return r.blob().then(function(b){
          return LoadProviderRegistry.normalizeResult({type:'image', blob:b, url:URL.createObjectURL(b), provider:'rmbg', metadata:{backgroundRemoved:true}});
        });
      });
    }

    if (providerId === 'mediapipe' || providerId === 'bg-removal-js') {
      return Promise.reject(new Error(providerId + ' is a browser-native library — call it via its JS API directly'));
    }

    return Promise.reject(new Error('removeBackground: unsupported provider: ' + providerId));
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
