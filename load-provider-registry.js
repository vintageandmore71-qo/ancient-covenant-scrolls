/* LoadProviderRegistry v1.0
 * Shared provider registry for Load Eco, Load Studio, and future Load AI.
 * All providers are free, open-source, local-first, or no-card free-tier.
 * No paid providers as active defaults.
 *
 * window.LoadProviderRegistry public API:
 *   listProviders()                        → provider[]
 *   listByCapability(cap)                  → provider[]
 *   getProvider(id)                        → provider | null
 *   getProviderStatus(id)                  → 'ready'|'unconfigured'|'disabled'
 *   saveProviderSettings(id, settings)
 *   testProvider(id)                       → Promise<NormalizedResult>
 *   generateImage(request)                 → Promise<NormalizedResult>
 *   generateAudio(request)                 → Promise<NormalizedResult>
 *   transcribeAudio(request)               → Promise<NormalizedResult>
 *   generateVideo(request)                 → Promise<NormalizedResult>
 *   routeToFallback(request)               → Promise<NormalizedResult>
 *   normalizeResult(result)                → NormalizedResult
 *   openPanel()
 *
 * Security:
 *   - API keys stored in localStorage only, never exported
 *   - Keys never appear in logs, prompts, reports, or exported packages
 *   - Provider never marked READY unless testProvider() succeeds
 */
(function () {
'use strict';

var STORE_KEY = 'load_provider_registry_v1';
var AID_STORE_KEY = 'loadstudio_ai_image_director_providers';

// Registry provider IDs → AI Director router IDs
var REGISTRY_TO_ROUTER = {
  'pollinations-flux':  'pollinations',
  'pollinations-sdxl':  'pollinations',
  'ai-horde':           'horde',
  'ai-horde-sdxl':      'horde',
  'huggingface-image':  'huggingface',
  'comfyui':            'comfyui',
  'a1111':              'localsd',
  'forge':              'forge',
  'fooocus':            'fooocus',
  'invokeai':           'invokeai',
  'kokoro':             'kokoro',
  'piper':              'piper',
  'browser-tts':        'browser_tts'
};

// AI Director router IDs → registry provider IDs (first canonical match)
var ROUTER_TO_REGISTRY = {
  'pollinations': 'pollinations-flux',
  'horde':        'ai-horde',
  'huggingface':  'huggingface-image',
  'comfyui':      'comfyui',
  'localsd':      'a1111',
  'forge':        'forge',
  'fooocus':      'fooocus',
  'invokeai':     'invokeai',
  'kokoro':       'kokoro',
  'piper':        'piper',
  'browser_tts':  'browser-tts'
};

// ── Provider definitions ─────────────────────────────────────────────────────
var PROVIDERS = [
  // ── Free Web Image ──────────────────────────────────────────────────────
  {
    providerId: 'pollinations-flux',
    name: 'Pollinations Flux',
    category: 'image',
    capabilities: ['image'],
    accessType: 'free-web',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://image.pollinations.ai',
    privacyLabel: 'Prompts sent to pollinations.ai server',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: true,
    status: 'active',
    labels: ['Free', 'No Key', 'Open Source']
  },
  {
    providerId: 'pollinations-sdxl',
    name: 'Pollinations SDXL',
    category: 'image',
    capabilities: ['image'],
    accessType: 'free-web',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://image.pollinations.ai',
    privacyLabel: 'Prompts sent to pollinations.ai server',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: true,
    status: 'active',
    labels: ['Free', 'No Key']
  },
  {
    providerId: 'ai-horde',
    name: 'AI Horde',
    category: 'image',
    capabilities: ['image'],
    accessType: 'free-web',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://stablehorde.net/api/v2',
    privacyLabel: 'Prompts sent to volunteer GPU network',
    licenseRisk: 'low',
    commercialUseStatus: 'check',
    fallbackEligible: true,
    status: 'active',
    labels: ['Free', 'No Key', 'Open Source']
  },
  {
    providerId: 'ai-horde-sdxl',
    name: 'AI Horde SDXL',
    category: 'image',
    capabilities: ['image'],
    accessType: 'free-web',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://stablehorde.net/api/v2',
    privacyLabel: 'Prompts sent to volunteer GPU network',
    licenseRisk: 'low',
    commercialUseStatus: 'check',
    fallbackEligible: true,
    status: 'active',
    labels: ['Free', 'No Key', 'Open Source']
  },
  {
    providerId: 'huggingface-image',
    name: 'Hugging Face Inference',
    category: 'image',
    capabilities: ['image'],
    accessType: 'free-tier',
    requiresApiKey: true,
    requiresLocalEndpoint: false,
    defaultEndpoint: 'https://api-inference.huggingface.co',
    privacyLabel: 'Prompts and key sent to HuggingFace servers',
    licenseRisk: 'low',
    commercialUseStatus: 'check-per-model',
    fallbackEligible: true,
    status: 'unconfigured',
    labels: ['Free', 'API Key Needed', 'Open Source']
  },
  // ── Local Image Engines ──────────────────────────────────────────────────
  {
    providerId: 'comfyui',
    name: 'ComfyUI',
    category: 'image',
    capabilities: ['image', 'video'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8188',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check-per-model',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'a1111',
    name: 'Stable Diffusion A1111',
    category: 'image',
    capabilities: ['image'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check-per-model',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'forge',
    name: 'Forge',
    category: 'image',
    capabilities: ['image'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check-per-model',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'fooocus',
    name: 'Fooocus',
    category: 'image',
    capabilities: ['image'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7865',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check-per-model',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'invokeai',
    name: 'InvokeAI',
    category: 'image',
    capabilities: ['image'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:9090',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check-per-model',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'sdnext',
    name: 'SD.Next',
    category: 'image',
    capabilities: ['image'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check-per-model',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'diffusionbee',
    name: 'DiffusionBee',
    category: 'image',
    capabilities: ['image'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:5000',
    privacyLabel: 'Fully local — macOS only',
    licenseRisk: 'low',
    commercialUseStatus: 'check-per-model',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'draw-things',
    name: 'Draw Things',
    category: 'image',
    capabilities: ['image'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7888',
    privacyLabel: 'Fully local — iOS/macOS only',
    licenseRisk: 'low',
    commercialUseStatus: 'check-per-model',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Local', 'Local Endpoint Needed']
  },
  // ── Local Audio / TTS ────────────────────────────────────────────────────
  {
    providerId: 'browser-tts',
    name: 'Browser TTS',
    category: 'audio',
    capabilities: ['tts'],
    accessType: 'browser',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: '',
    privacyLabel: 'Fully local — built into browser',
    licenseRisk: 'none',
    commercialUseStatus: 'allowed',
    fallbackEligible: true,
    status: 'active',
    labels: ['Free', 'No Key', 'Local']
  },
  {
    providerId: 'kokoro',
    name: 'Kokoro',
    category: 'audio',
    capabilities: ['tts'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8880',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'chatterbox',
    name: 'Chatterbox',
    category: 'audio',
    capabilities: ['tts'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8000',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'chatterbox-turbo',
    name: 'Chatterbox Turbo',
    category: 'audio',
    capabilities: ['tts'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8001',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'f5-tts',
    name: 'F5-TTS',
    category: 'audio',
    capabilities: ['tts'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8000',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'bark',
    name: 'Bark',
    category: 'audio',
    capabilities: ['tts'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8000',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Non-Commercial', 'Local Endpoint Needed']
  },
  {
    providerId: 'openvoice',
    name: 'OpenVoice',
    category: 'audio',
    capabilities: ['tts', 'voice-clone'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8000',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'research-only',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Research Only', 'Local Endpoint Needed']
  },
  {
    providerId: 'xtts-v2',
    name: 'XTTS v2',
    category: 'audio',
    capabilities: ['tts', 'voice-clone'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8000',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'medium',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Non-Commercial', 'License Check', 'Local Endpoint Needed']
  },
  {
    providerId: 'piper',
    name: 'Piper',
    category: 'audio',
    capabilities: ['tts'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:5000',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: true,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'coqui-tts',
    name: 'Coqui TTS',
    category: 'audio',
    capabilities: ['tts', 'voice-clone'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:5002',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'medium',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Non-Commercial', 'Local Endpoint Needed']
  },
  {
    providerId: 'dia',
    name: 'Dia',
    category: 'audio',
    capabilities: ['tts'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8000',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  // ── Local Speech-to-Text ─────────────────────────────────────────────────
  {
    providerId: 'whisper',
    name: 'Whisper',
    category: 'stt',
    capabilities: ['stt'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:9000',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'faster-whisper',
    name: 'Faster-Whisper',
    category: 'stt',
    capabilities: ['stt'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:9001',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'whisper-cpp',
    name: 'Whisper.cpp',
    category: 'stt',
    capabilities: ['stt'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8080',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'vosk',
    name: 'Vosk',
    category: 'stt',
    capabilities: ['stt'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:2700',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'moonshine',
    name: 'Moonshine',
    category: 'stt',
    capabilities: ['stt'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:9002',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  // ── Local Music / SFX ────────────────────────────────────────────────────
  {
    providerId: 'musicgen',
    name: 'MusicGen',
    category: 'music',
    capabilities: ['music'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'medium',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Non-Commercial', 'Local Endpoint Needed']
  },
  {
    providerId: 'audiogen',
    name: 'AudioGen',
    category: 'music',
    capabilities: ['sfx'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'medium',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Non-Commercial', 'Local Endpoint Needed']
  },
  {
    providerId: 'demucs',
    name: 'Demucs',
    category: 'music',
    capabilities: ['stem-separation'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'spleeter',
    name: 'Spleeter',
    category: 'music',
    capabilities: ['stem-separation'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8000',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'basic-pitch',
    name: 'Basic Pitch',
    category: 'music',
    capabilities: ['pitch-detection'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:5000',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'riffusion',
    name: 'Riffusion',
    category: 'music',
    capabilities: ['music'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:3013',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  // ── Local Video ──────────────────────────────────────────────────────────
  {
    providerId: 'comfyui-video',
    name: 'ComfyUI Video Workflows',
    category: 'video',
    capabilities: ['video'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8188',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check-per-model',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed', 'Integration Required']
  },
  {
    providerId: 'wan-local',
    name: 'WAN Local',
    category: 'video',
    capabilities: ['video'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed', 'Experimental']
  },
  {
    providerId: 'hunyuan-video',
    name: 'HunyuanVideo Local',
    category: 'video',
    capabilities: ['video'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Non-Commercial', 'Local Endpoint Needed', 'Experimental']
  },
  {
    providerId: 'ltx-video',
    name: 'LTX-Video Local',
    category: 'video',
    capabilities: ['video'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed', 'Experimental']
  },
  {
    providerId: 'animatediff',
    name: 'AnimateDiff',
    category: 'video',
    capabilities: ['video'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Non-Commercial', 'Local Endpoint Needed', 'Experimental']
  },
  {
    providerId: 'svd',
    name: 'Stable Video Diffusion',
    category: 'video',
    capabilities: ['video'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'medium',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Local', 'Non-Commercial', 'License Check', 'Local Endpoint Needed', 'Experimental']
  },
  {
    providerId: 'cogvideox',
    name: 'CogVideoX',
    category: 'video',
    capabilities: ['video'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed', 'Experimental']
  },
  {
    providerId: 'open-sora',
    name: 'Open-Sora',
    category: 'video',
    capabilities: ['video'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed', 'Experimental']
  },
  {
    providerId: 'mochi',
    name: 'Mochi',
    category: 'video',
    capabilities: ['video'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed', 'Experimental']
  },
  {
    providerId: 'dynamicrafter',
    name: 'DynamiCrafter',
    category: 'video',
    capabilities: ['video'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:7860',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'non-commercial',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Non-Commercial', 'Local Endpoint Needed', 'Experimental']
  },
  // ── Browser Editing Primitives ───────────────────────────────────────────
  {
    providerId: 'ffmpeg-wasm',
    name: 'FFmpeg.wasm',
    category: 'editing',
    capabilities: ['transcode', 'mux', 'trim'],
    accessType: 'browser',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: '',
    privacyLabel: 'Fully local — runs in browser',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'future-optional',
    labels: ['Free', 'Open Source', 'Local', 'Future Optional', 'Disabled by Default']
  },
  {
    providerId: 'webcodecs',
    name: 'WebCodecs',
    category: 'editing',
    capabilities: ['decode', 'encode'],
    accessType: 'browser',
    requiresApiKey: false,
    requiresLocalEndpoint: false,
    defaultEndpoint: '',
    privacyLabel: 'Fully local — browser API',
    licenseRisk: 'none',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'future-optional',
    labels: ['Free', 'Local', 'Future Optional']
  },
  // ── Local LLM / Router ───────────────────────────────────────────────────
  {
    providerId: 'ollama',
    name: 'Ollama',
    category: 'llm',
    capabilities: ['prompt', 'captions', 'summaries', 'json'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:11434',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check-per-model',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'lm-studio',
    name: 'LM Studio',
    category: 'llm',
    capabilities: ['prompt', 'captions', 'summaries', 'json'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:1234',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check-per-model',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'localai',
    name: 'LocalAI',
    category: 'llm',
    capabilities: ['prompt', 'image', 'tts', 'stt'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8080',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'llama-cpp',
    name: 'llama.cpp',
    category: 'llm',
    capabilities: ['prompt', 'json'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8080',
    privacyLabel: 'Fully local — no data leaves device',
    licenseRisk: 'low',
    commercialUseStatus: 'check-per-model',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'vllm',
    name: 'vLLM',
    category: 'llm',
    capabilities: ['prompt', 'json'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8000',
    privacyLabel: 'Fully local or self-hosted',
    licenseRisk: 'low',
    commercialUseStatus: 'allowed',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  },
  {
    providerId: 'tgi',
    name: 'TGI (Text Generation Inference)',
    category: 'llm',
    capabilities: ['prompt', 'json'],
    accessType: 'local',
    requiresApiKey: false,
    requiresLocalEndpoint: true,
    defaultEndpoint: 'http://127.0.0.1:8080',
    privacyLabel: 'Fully local or self-hosted',
    licenseRisk: 'low',
    commercialUseStatus: 'check',
    fallbackEligible: false,
    status: 'unconfigured',
    labels: ['Free', 'Open Source', 'Local', 'Local Endpoint Needed']
  }
];

// ── Settings storage (localStorage only — never exported) ────────────────────
var _settings = {};
function _loadSettings() {
  try {
    var s = localStorage.getItem(STORE_KEY);
    _settings = s ? JSON.parse(s) : {};
  } catch (_) { _settings = {}; }
}
function _saveSettings() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(_settings)); } catch (_) {}
}
_loadSettings();

// ── AID sync helpers ──────────────────────────────────────────────────────────
function _readAIDConfig() {
  try { var r = localStorage.getItem(AID_STORE_KEY); return r ? JSON.parse(r) : {}; } catch (_) { return {}; }
}
function _writeAIDConfig(cfg) {
  try { localStorage.setItem(AID_STORE_KEY, JSON.stringify(cfg)); } catch (_) {}
}
function _syncRegistryPrimaryToAID(registryId) {
  var routerId = REGISTRY_TO_ROUTER[registryId] || null;
  var cfg = _readAIDConfig();
  cfg.primary = routerId;
  _writeAIDConfig(cfg);
}
function _migrateAIDToRegistry() {
  var aidCfg = _readAIDConfig();
  var aidPrimary = aidCfg.primary || aidCfg.active || null;
  if (!aidPrimary) return false;
  var hasPrimary = Object.keys(_settings).some(function (id) { return _settings[id] && _settings[id].primary; });
  if (hasPrimary) return false;
  var registryId = ROUTER_TO_REGISTRY[aidPrimary] || null;
  if (!registryId) return false;
  _settings[registryId] = _settings[registryId] || {};
  _settings[registryId].primary = true;
  _saveSettings();
  return true;
}
function _initSync() {
  _migrateAIDToRegistry();
  var primaryId = null;
  Object.keys(_settings).forEach(function (id) { if (_settings[id] && _settings[id].primary) primaryId = id; });
  if (primaryId) _syncRegistryPrimaryToAID(primaryId);
}

// ── Normalise result ──────────────────────────────────────────────────────────
function normalizeResult(raw) {
  if (raw && raw.__normalized) return raw;
  var r = {
    __normalized: true,
    ok: false,
    providerId: raw && raw.providerId || '',
    providerName: raw && raw.providerName || '',
    capability: raw && raw.capability || '',
    imageUrl: null,
    audioUrl: null,
    videoUrl: null,
    blob: null,
    base64: null,
    file: null,
    text: null,
    error: null,
    status: 'error',
    raw: raw
  };
  if (!raw) return r;
  if (raw.ok === false || raw.error) { r.error = raw.error || 'Unknown error'; return r; }
  r.imageUrl = raw.imageUrl || null;
  r.audioUrl = raw.audioUrl || null;
  r.videoUrl = raw.videoUrl || null;
  r.blob = raw.blob || null;
  r.base64 = raw.base64 || null;
  r.file = raw.file || null;
  r.text = raw.text || null;
  // Never mark ok=true without a real result
  var hasResult = r.imageUrl || r.audioUrl || r.videoUrl || r.blob || r.base64 || r.file || r.text;
  if (hasResult) { r.ok = true; r.status = 'ok'; }
  return r;
}

// ── Provider test functions ───────────────────────────────────────────────────
function _testPollinations(p, endpoint) {
  var url = (endpoint || p.defaultEndpoint) + '/prompt/test+image?width=8&height=8&nologo=true&seed=1';
  return fetch(url, { signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.blob();
    })
    .then(function (b) {
      if (!b.type.startsWith('image/')) throw new Error('Non-image response');
      return normalizeResult({ ok: true, providerId: p.providerId, providerName: p.name, capability: 'image', imageUrl: URL.createObjectURL(b) });
    });
}

function _testAIHorde(p) {
  return fetch('https://stablehorde.net/api/v2/status/heartbeat')
    .then(function (r) {
      if (!r.ok) throw new Error('Horde unreachable');
      return normalizeResult({ ok: true, providerId: p.providerId, providerName: p.name, capability: 'image', text: 'AI Horde is reachable' });
    });
}

function _testHuggingFace(p, settings) {
  if (!settings || !settings.apiKey) throw new Error('No API key configured');
  return fetch('https://api-inference.huggingface.co/models/stabilityai/sdxl-turbo', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + settings.apiKey, 'Content-Type': 'application/json', 'Accept': 'image/png' },
    body: JSON.stringify({ inputs: 'test', parameters: { num_inference_steps: 1 } })
  }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.blob();
  }).then(function (b) {
    if (!b.type.startsWith('image/')) throw new Error('Non-image response');
    return normalizeResult({ ok: true, providerId: p.providerId, providerName: p.name, capability: 'image', imageUrl: URL.createObjectURL(b) });
  });
}

function _testLocalEndpoint(p, endpoint) {
  return fetch((endpoint || p.defaultEndpoint) + '/', { method: 'GET', signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined })
    .then(function (r) {
      return normalizeResult({ ok: true, providerId: p.providerId, providerName: p.name, capability: p.capabilities[0], text: 'Endpoint reachable (HTTP ' + r.status + ')' });
    });
}

function _testBrowserTTS(p) {
  var ok = typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.getVoices;
  return Promise.resolve(normalizeResult({ ok: ok, providerId: p.providerId, providerName: p.name, capability: 'tts', text: ok ? 'Browser TTS available' : 'Browser TTS not available' }));
}

// ── Image generation ──────────────────────────────────────────────────────────
function _generatePollinations(p, request, model) {
  var params = new URLSearchParams({ width: request.width || 1024, height: request.height || 1024, model: model || 'flux', nologo: 'true', seed: Math.floor(Math.random() * 999999) });
  var ep = (request.endpoint || p.defaultEndpoint);
  var url = ep + '/prompt/' + encodeURIComponent(String(request.prompt || '').slice(0, 1500)) + '?' + params;
  return fetch(url)
    .then(function (r) { if (!r.ok) throw new Error(p.name + ' HTTP ' + r.status); return r.blob(); })
    .then(function (b) {
      if (!b.type.startsWith('image/')) throw new Error(p.name + ': non-image response');
      return normalizeResult({ ok: true, providerId: p.providerId, providerName: p.name, capability: 'image', imageUrl: URL.createObjectURL(b) });
    });
}

function _generateHorde(p, request, model) {
  var body = { prompt: String(request.prompt || '').slice(0, 1000), params: { sampler_name: 'k_euler', cfg_scale: 7, steps: 20, width: request.width || 512, height: request.height || 512 }, models: [model || 'stable_diffusion'], r2: true, nsfw: false, censor_nsfw: true, shared: false, replacement_filter: true };
  return fetch('https://stablehorde.net/api/v2/generate/async', { method: 'POST', headers: { apikey: '0000000000', 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(function (r) { if (!r.ok) throw new Error('Horde submit HTTP ' + r.status); return r.json(); })
    .then(function (d) {
      if (!d.id) throw new Error('Horde: no job id');
      return new Promise(function (res, rej) {
        var tries = 0;
        function poll() {
          if (tries++ > 60) { rej(new Error('Horde timed out')); return; }
          fetch('https://stablehorde.net/api/v2/generate/check/' + d.id).then(function (r) { return r.json(); }).then(function (ck) {
            if (!ck.done) { setTimeout(poll, 3000); return; }
            fetch('https://stablehorde.net/api/v2/generate/status/' + d.id).then(function (r) { return r.json(); }).then(function (fin) {
              var g = fin.generations && fin.generations[0];
              if (!g || !g.img) { rej(new Error('Horde: no image in result')); return; }
              res(normalizeResult({ ok: true, providerId: p.providerId, providerName: p.name, capability: 'image', imageUrl: 'data:image/webp;base64,' + g.img }));
            }).catch(rej);
          }).catch(function () { setTimeout(poll, 4000); });
        }
        setTimeout(poll, 3000);
      });
    });
}

// ── Core API ─────────────────────────────────────────────────────────────────
var Registry = {
  listProviders: function () { return PROVIDERS.slice(); },

  listByCapability: function (cap) {
    return PROVIDERS.filter(function (p) { return p.capabilities.indexOf(cap) !== -1; });
  },

  getProvider: function (id) {
    return PROVIDERS.find(function (p) { return p.providerId === id; }) || null;
  },

  getProviderStatus: function (id) {
    var p = this.getProvider(id);
    if (!p) return 'disabled';
    var s = _settings[id] || {};
    if (s.disabled) return 'disabled';
    if (s.status === 'ready') return 'ready';
    if (p.status === 'active') return 'active';
    return 'unconfigured';
  },

  saveProviderSettings: function (id, settings) {
    if (!this.getProvider(id)) return;
    if (settings.primary === true) {
      // Only one primary at a time across all providers
      Object.keys(_settings).forEach(function (pid) { if (pid !== id && _settings[pid]) _settings[pid].primary = false; });
    }
    _settings[id] = _settings[id] || {};
    Object.keys(settings).forEach(function (k) { _settings[id][k] = settings[k]; });
    _saveSettings();
    // Sync primary to AI Director
    if ('primary' in settings) {
      if (settings.primary === true) {
        _syncRegistryPrimaryToAID(id);
      } else {
        var anyPrimary = null;
        Object.keys(_settings).forEach(function (pid) { if (_settings[pid] && _settings[pid].primary) anyPrimary = pid; });
        if (anyPrimary) {
          _syncRegistryPrimaryToAID(anyPrimary);
        } else {
          var cfg = _readAIDConfig(); cfg.primary = null; _writeAIDConfig(cfg);
        }
      }
    }
  },

  testProvider: function (id) {
    var self = this;
    var p = this.getProvider(id);
    if (!p) return Promise.reject(new Error('Unknown provider: ' + id));
    var s = _settings[id] || {};
    var endpoint = s.endpoint || p.defaultEndpoint;
    var promise;
    if (id === 'pollinations-flux' || id === 'pollinations-sdxl') {
      promise = _testPollinations(p, endpoint);
    } else if (id === 'ai-horde' || id === 'ai-horde-sdxl') {
      promise = _testAIHorde(p);
    } else if (id === 'huggingface-image') {
      promise = _testHuggingFace(p, s);
    } else if (id === 'browser-tts') {
      promise = _testBrowserTTS(p);
    } else if (p.requiresLocalEndpoint) {
      promise = _testLocalEndpoint(p, endpoint);
    } else {
      promise = Promise.resolve(normalizeResult({ ok: true, providerId: id, providerName: p.name, capability: p.capabilities[0], text: 'No test available — provider assumed ready' }));
    }
    return promise.then(function (r) {
      if (r.ok) {
        self.saveProviderSettings(id, { status: 'ready' });
      } else {
        self.saveProviderSettings(id, { status: 'failed', lastError: r.error });
      }
      return r;
    }).catch(function (e) {
      self.saveProviderSettings(id, { status: 'failed', lastError: String(e) });
      return normalizeResult({ ok: false, providerId: id, providerName: p.name, capability: p.capabilities[0], error: String(e) });
    });
  },

  generateImage: function (request) {
    var s = _settings;
    // Try active image providers in fallback order
    var order = ['pollinations-flux', 'ai-horde', 'pollinations-sdxl', 'huggingface-image', 'comfyui', 'a1111'];
    var customPrimary = null;
    PROVIDERS.forEach(function (p) {
      if (p.capabilities.indexOf('image') !== -1 && s[p.providerId] && s[p.providerId].primary) customPrimary = p.providerId;
    });
    if (customPrimary) order = [customPrimary].concat(order.filter(function (id) { return id !== customPrimary; }));
    return this._tryChain(order, request, 'image');
  },

  generateAudio: function (request) {
    var order = ['browser-tts', 'kokoro', 'piper', 'chatterbox'];
    return this._tryChain(order, request, 'tts');
  },

  transcribeAudio: function (request) {
    var order = ['whisper', 'faster-whisper', 'whisper-cpp', 'vosk', 'moonshine'];
    return this._tryChain(order, request, 'stt');
  },

  generateVideo: function (request) {
    var order = ['comfyui-video', 'wan-local', 'ltx-video', 'animatediff'];
    return this._tryChain(order, request, 'video');
  },

  _tryChain: function (ids, request, cap) {
    var self = this;
    var i = 0;
    function next() {
      if (i >= ids.length) return Promise.resolve(normalizeResult({ ok: false, capability: cap, error: 'No provider available for ' + cap }));
      var id = ids[i++];
      var p = self.getProvider(id);
      if (!p) return next();
      var status = self.getProviderStatus(id);
      if (status === 'disabled') return next();
      if (p.requiresLocalEndpoint) {
        var s = _settings[id] || {};
        if (!s.endpoint && !p.defaultEndpoint) return next();
      }
      return self._callProvider(p, request, cap).then(function (r) {
        if (r.ok) return r;
        return next();
      }).catch(next);
    }
    return next();
  },

  _callProvider: function (p, request, cap) {
    var s = _settings[p.providerId] || {};
    var endpoint = s.endpoint || p.defaultEndpoint;
    if (cap === 'image') {
      if (p.providerId === 'pollinations-flux') return _generatePollinations(p, request, 'flux');
      if (p.providerId === 'pollinations-sdxl') return _generatePollinations(p, request, 'sdxl');
      if (p.providerId === 'ai-horde') return _generateHorde(p, request, 'stable_diffusion');
      if (p.providerId === 'ai-horde-sdxl') return _generateHorde(p, request, 'SDXL 1.0');
      if (p.providerId === 'huggingface-image') {
        if (!s.apiKey) return Promise.resolve(normalizeResult({ ok: false, providerId: p.providerId, providerName: p.name, capability: 'image', error: 'No HuggingFace API key configured' }));
        var model = s.model || 'stabilityai/sdxl-turbo';
        return fetch('https://api-inference.huggingface.co/models/' + model, { method: 'POST', headers: { 'Authorization': 'Bearer ' + s.apiKey, 'Content-Type': 'application/json', 'Accept': 'image/png' }, body: JSON.stringify({ inputs: String(request.prompt || '').slice(0, 1500) }) })
          .then(function (r) { if (!r.ok) throw new Error('HF HTTP ' + r.status); return r.blob(); })
          .then(function (b) { if (!b.type.startsWith('image/')) throw new Error('HF non-image'); return normalizeResult({ ok: true, providerId: p.providerId, providerName: p.name, capability: 'image', imageUrl: URL.createObjectURL(b) }); });
      }
      if (p.requiresLocalEndpoint && endpoint) {
        return fetch(endpoint + '/sdapi/v1/txt2img', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: String(request.prompt || ''), width: request.width || 512, height: request.height || 512, steps: 20 }) })
          .then(function (r) { if (!r.ok) throw new Error('Local HTTP ' + r.status); return r.json(); })
          .then(function (d) {
            var img = d.images && d.images[0];
            if (!img) throw new Error('No image in response');
            return normalizeResult({ ok: true, providerId: p.providerId, providerName: p.name, capability: 'image', imageUrl: 'data:image/png;base64,' + img });
          });
      }
    }
    if (cap === 'tts') {
      if (p.providerId === 'browser-tts') {
        return new Promise(function (res) {
          if (!window.speechSynthesis) { res(normalizeResult({ ok: false, providerId: p.providerId, providerName: p.name, capability: 'tts', error: 'Browser TTS not available' })); return; }
          var u = new SpeechSynthesisUtterance(request.text || '');
          u.onend = function () { res(normalizeResult({ ok: true, providerId: p.providerId, providerName: p.name, capability: 'tts', text: 'spoken' })); };
          u.onerror = function (e) { res(normalizeResult({ ok: false, providerId: p.providerId, providerName: p.name, capability: 'tts', error: String(e) })); };
          window.speechSynthesis.speak(u);
        });
      }
    }
    return Promise.resolve(normalizeResult({ ok: false, providerId: p.providerId, providerName: p.name, capability: cap, error: 'Provider not yet implemented for ' + cap }));
  },

  routeToFallback: function (request) {
    var cap = request.capability || 'image';
    if (cap === 'image') return this.generateImage(request);
    if (cap === 'tts' || cap === 'audio') return this.generateAudio(request);
    if (cap === 'stt') return this.transcribeAudio(request);
    if (cap === 'video') return this.generateVideo(request);
    return Promise.resolve(normalizeResult({ ok: false, capability: cap, error: 'Unknown capability: ' + cap }));
  },

  normalizeResult: normalizeResult,

  // ── Panel UI ───────────────────────────────────────────────────────────────
  openPanel: function () {
    var existing = document.getElementById('lspr-panel-overlay');
    if (existing) { existing.style.display = 'flex'; return; }
    _renderPanel();
  }
};

// ── Panel renderer ────────────────────────────────────────────────────────────
var LABEL_COLORS = {
  'Free': '#5ee0a5', 'Open Source': '#5fc8ff', 'Local': '#b388ff',
  'No Key': '#fbd24a', 'API Key Needed': '#ffa852', 'Local Endpoint Needed': '#ff8ad6',
  'Non-Commercial': '#ff6e9c', 'Research Only': '#ff6e9c', 'License Check': '#ffa852',
  'Future Optional': '#9c9cff', 'Disabled by Default': '#7a6fa0',
  'Experimental': '#ffa852', 'Integration Required': '#ffa852'
};

var CAT_TITLES = {
  image: 'Image Generation', audio: 'Audio / Voice', stt: 'Speech-to-Text',
  music: 'Music / SFX', video: 'Video', editing: 'Editing Primitives', llm: 'Local LLM / Router'
};

function _esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _labelBadge(lbl) {
  var color = LABEL_COLORS[lbl] || '#c0b8d9';
  return '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font:500 10px Inter,system-ui,sans-serif;border:1px solid ' + color + ';color:' + color + ';margin:1px">' + _esc(lbl) + '</span>';
}

function _statusBadge(status) {
  var map = { active: ['Active', '#5ee0a5'], ready: ['Ready', '#5ee0a5'], unconfigured: ['Not configured', '#ffa852'], 'future-optional': ['Future optional', '#9c9cff'], disabled: ['Disabled', '#7a6fa0'], failed: ['Test failed', '#ff6e9c'] };
  var info = map[status] || ['Unknown', '#7a6fa0'];
  return '<span style="font:600 11px Inter,system-ui,sans-serif;color:' + info[1] + '">' + info[0] + '</span>';
}

function _renderPanel() {
  var style = document.createElement('style');
  style.id = 'lspr-styles';
  style.textContent = '#lspr-panel-overlay{position:fixed;inset:0;z-index:99000;background:rgba(5,2,14,.96);display:flex;flex-direction:column;font-family:Inter,system-ui,sans-serif;color:#f5f0ff;overflow:hidden}' +
    '#lspr-panel-bar{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#12081e;border-bottom:1px solid rgba(125,42,232,.3);flex-shrink:0}' +
    '#lspr-panel-title{font:700 15px Inter,system-ui,sans-serif;color:#b388ff;flex:1}' +
    '#lspr-panel-close{background:none;border:1px solid rgba(125,42,232,.4);border-radius:8px;color:#c0b8d9;font:600 14px Inter,system-ui,sans-serif;padding:6px 12px;cursor:pointer}' +
    '#lspr-panel-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px}' +
    '.lspr-group{margin-bottom:20px}' +
    '.lspr-group-head{display:flex;align-items:center;gap:8px;margin:0 0 10px;font:600 11px Inter,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#9c9cff;cursor:pointer}' +
    '.lspr-group-head svg{transition:transform .2s}' +
    '.lspr-group.collapsed .lspr-cards{display:none}' +
    '.lspr-group.collapsed .lspr-group-head svg{transform:rotate(-90deg)}' +
    '.lspr-cards{display:grid;grid-template-columns:1fr;gap:10px}@media(min-width:600px){.lspr-cards{grid-template-columns:1fr 1fr}}' +
    '.lspr-card{background:#160b26;border:1px solid rgba(125,42,232,.22);border-radius:12px;padding:12px 14px}' +
    '.lspr-card-name{font:700 14px Inter,system-ui,sans-serif;color:#f5f0ff;margin:0 0 4px}' +
    '.lspr-card-privacy{font:400 11px Inter,system-ui,sans-serif;color:#7a6fa0;margin:0 0 6px}' +
    '.lspr-card-labels{margin:0 0 8px}' +
    '.lspr-card-status{margin:0 0 8px}' +
    '.lspr-card-ep{width:100%;background:#0e0720;border:1px solid rgba(125,42,232,.35);border-radius:7px;color:#f5f0ff;font:400 12px Inter,system-ui,sans-serif;padding:7px 10px;box-sizing:border-box;margin:0 0 6px}' +
    '.lspr-card-key{width:100%;background:#0e0720;border:1px solid rgba(125,42,232,.35);border-radius:7px;color:#f5f0ff;font:400 12px Inter,system-ui,sans-serif;padding:7px 10px;box-sizing:border-box;margin:0 0 6px}' +
    '.lspr-card-row{display:flex;gap:6px;flex-wrap:wrap}' +
    '.lspr-btn{padding:6px 12px;border-radius:8px;font:600 11px Inter,system-ui,sans-serif;cursor:pointer;border:1px solid}' +
    '.lspr-btn-test{background:rgba(125,42,232,.18);border-color:rgba(125,42,232,.45);color:#e0d8f5}' +
    '.lspr-btn-primary{background:rgba(94,224,165,.12);border-color:rgba(94,224,165,.4);color:#5ee0a5}' +
    '.lspr-btn-primary.active{background:rgba(94,224,165,.3)}' +
    '.lspr-btn-save{background:rgba(125,42,232,.28);border-color:rgba(125,42,232,.6);color:#fff}' +
    '.lspr-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#7d2ae8;color:#fff;padding:8px 18px;border-radius:8px;font:600 13px Inter,system-ui,sans-serif;z-index:100000;opacity:0;transition:opacity .3s;pointer-events:none}';
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.id = 'lspr-panel-overlay';
  overlay.innerHTML =
    '<div id="lspr-panel-bar">' +
      '<span id="lspr-panel-title">Provider Registry</span>' +
      '<button id="lspr-panel-close" type="button">Close</button>' +
    '</div>' +
    '<div id="lspr-panel-body">' + _buildBody() + '</div>' +
    '<div class="lspr-toast" id="lspr-toast"></div>';
  document.body.appendChild(overlay);

  overlay.querySelector('#lspr-panel-close').addEventListener('click', function () { overlay.style.display = 'none'; });

  overlay.querySelectorAll('.lspr-group-head').forEach(function (h) {
    h.addEventListener('click', function () { h.closest('.lspr-group').classList.toggle('collapsed'); });
  });

  overlay.querySelectorAll('.lspr-btn-test').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.id;
      btn.textContent = 'Testing...';
      btn.disabled = true;
      Registry.testProvider(id).then(function (r) {
        btn.textContent = r.ok ? 'Test OK' : 'Test failed';
        btn.disabled = false;
        _lsprToast(r.ok ? (r.text || 'Provider is reachable.') : ('Error: ' + (r.error || 'failed')));
        var card = btn.closest('.lspr-card');
        if (card) {
          var st = card.querySelector('.lspr-card-status');
          if (st) st.innerHTML = _statusBadge(r.ok ? 'ready' : 'failed');
        }
      });
    });
  });

  overlay.querySelectorAll('.lspr-btn-primary').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.id;
      var isActive = btn.classList.contains('active');
      Registry.saveProviderSettings(id, { primary: !isActive });
      btn.classList.toggle('active', !isActive);
      btn.textContent = !isActive ? 'Primary (active)' : 'Use as Primary';
      _lsprToast(!isActive ? 'Set as primary provider.' : 'Removed as primary.');
    });
  });

  overlay.querySelectorAll('.lspr-btn-save').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.id;
      var card = btn.closest('.lspr-card');
      var s = {};
      var ep = card.querySelector('.lspr-card-ep');
      var key = card.querySelector('.lspr-card-key');
      if (ep) s.endpoint = ep.value.trim();
      if (key && key.value.trim()) s.apiKey = key.value.trim();
      Registry.saveProviderSettings(id, s);
      _lsprToast('Settings saved.');
    });
  });
}

function _buildBody() {
  var cats = ['image', 'audio', 'stt', 'music', 'video', 'llm', 'editing'];
  return cats.map(function (cat) {
    var providers = PROVIDERS.filter(function (p) { return p.category === cat; });
    if (!providers.length) return '';
    var isFuture = cat === 'editing';
    return '<div class="lspr-group' + (isFuture ? ' collapsed' : '') + '">' +
      '<div class="lspr-group-head"><svg viewBox="0 0 10 10" width="12" height="12" fill="currentColor"><polygon points="5,8 1,2 9,2"/></svg>' + _esc(CAT_TITLES[cat] || cat) + '</div>' +
      '<div class="lspr-cards">' + providers.map(_buildCard).join('') + '</div>' +
    '</div>';
  }).join('');
}

function _buildCard(p) {
  var s = _settings[p.providerId] || {};
  var status = s.status || p.status;
  var endpoint = s.endpoint || p.defaultEndpoint;
  var isPrimary = !!(s.primary);
  var epField = p.requiresLocalEndpoint
    ? '<input class="lspr-card-ep" type="text" value="' + _esc(endpoint) + '" placeholder="http://127.0.0.1:xxxx" aria-label="Endpoint">'
    : '';
  var keyField = p.requiresApiKey
    ? '<input class="lspr-card-key" type="password" placeholder="API key (stored locally only)" aria-label="API key">'
    : '';
  return '<div class="lspr-card">' +
    '<div class="lspr-card-name">' + _esc(p.name) + '</div>' +
    '<div class="lspr-card-privacy">' + _esc(p.privacyLabel) + '</div>' +
    '<div class="lspr-card-labels">' + p.labels.map(_labelBadge).join('') + '</div>' +
    '<div class="lspr-card-status">' + _statusBadge(status) + '</div>' +
    epField + keyField +
    '<div class="lspr-card-row">' +
      '<button class="lspr-btn lspr-btn-test" data-id="' + _esc(p.providerId) + '" type="button">Test Provider</button>' +
      '<button class="lspr-btn lspr-btn-primary' + (isPrimary ? ' active' : '') + '" data-id="' + _esc(p.providerId) + '" type="button">' + (isPrimary ? 'Primary (active)' : 'Use as Primary') + '</button>' +
      (epField || keyField ? '<button class="lspr-btn lspr-btn-save" data-id="' + _esc(p.providerId) + '" type="button">Save</button>' : '') +
    '</div>' +
  '</div>';
}

function _lsprToast(msg) {
  var t = document.getElementById('lspr-toast');
  if (!t) return;
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(function () { t.style.opacity = '0'; }, 2400);
}

// ── Auto-wire buttons in both apps ────────────────────────────────────────────
function _autoWire() {
  _initSync();
  document.querySelectorAll('[data-action="provider-registry"],[data-lspr-open]').forEach(function (btn) {
    btn.addEventListener('click', function () { Registry.openPanel(); });
  });
  // Load Studio: section-provider-registry becomes a pass-through that opens the panel
  var section = document.getElementById('section-provider-registry');
  if (section) {
    var obs = new MutationObserver(function () {
      if (section.classList.contains('active')) Registry.openPanel();
    });
    obs.observe(section, { attributes: true, attributeFilter: ['class'] });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _autoWire);
} else {
  _autoWire();
}

window.LoadProviderRegistry = Registry;

window.LoadProviderRegistrySelfTest = function () {
  _loadSettings();
  var primaryId = null;
  Object.keys(_settings).forEach(function (id) { if (_settings[id] && _settings[id].primary) primaryId = id; });
  var routerId = primaryId ? (REGISTRY_TO_ROUTER[primaryId] || null) : null;
  var aidCfg = _readAIDConfig();
  var aidPrimary = aidCfg.primary || null;
  return {
    registryPrimaryProvider: primaryId,
    registryPrimaryStatus: primaryId ? Registry.getProviderStatus(primaryId) : 'none',
    aidDetectedProvider: aidPrimary,
    aidProviderConnected: !!(aidPrimary),
    localStorage_registry: STORE_KEY,
    localStorage_aid: AID_STORE_KEY,
    routerIdExpected: routerId,
    inSync: routerId === aidPrimary,
    migrationApplied: false
  };
};

window.lsAID_providerSyncSelfTest = function () {
  _loadSettings();
  var primaryId = null;
  Object.keys(_settings).forEach(function (id) { if (_settings[id] && _settings[id].primary) primaryId = id; });
  var routerId = primaryId ? (REGISTRY_TO_ROUTER[primaryId] || null) : null;
  var aidCfg = _readAIDConfig();
  var aidPrimary = aidCfg.primary || null;
  var migApplied = false;
  if (!primaryId && aidPrimary) {
    migApplied = _migrateAIDToRegistry();
    if (migApplied) {
      _loadSettings();
      primaryId = null;
      Object.keys(_settings).forEach(function (id) { if (_settings[id] && _settings[id].primary) primaryId = id; });
      routerId = primaryId ? (REGISTRY_TO_ROUTER[primaryId] || null) : null;
    }
  }
  return {
    registryPrimaryProvider: primaryId,
    registryPrimaryStatus: primaryId ? Registry.getProviderStatus(primaryId) : 'none',
    aidDetectedProvider: aidPrimary,
    aidProviderConnected: !!(aidPrimary),
    localStorageKeys: { registry: STORE_KEY, aid: AID_STORE_KEY },
    migrationApplied: migApplied,
    syncStatus: routerId === aidPrimary ? 'in-sync' : 'out-of-sync'
  };
};

})();
