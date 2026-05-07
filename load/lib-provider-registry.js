// Load — Shared AI Provider Registry (X-AI-PROVIDERS Phase 1, read-only)
//
// Per Load_Main_Claude_Handoff_Report addendum
// (inbox/5.7 load_ai_complete_addendum_since_last_zip.zip).
//
// Single source of truth for every Load AI provider across the suite.
// Phase 1 surfaces the registry for inspection without changing
// existing routing in load.js or load/image-prompt/index.html.
//
// Public API:
//   window.LoadProviderRegistry.list()
//   window.LoadProviderRegistry.byCategory()
//   window.LoadProviderRegistry.byId(id)
//   window.LoadProviderRegistry.CAPABILITIES   - 24 capability flags
//   window.LoadProviderRegistry.STATUS_VALUES  - 9 status values
//   window.LoadProviderRegistry.CATEGORIES     - 7 ordered category ids
//
// Source code already on main HEAD:
//   load/load.js              — providerPrefs (chat/text providers, line 2530)
//   load/image-prompt/index.html — IMAGE_PROVIDERS array (line 2117)

(function () {
'use strict';

// ── Capability flags (Section 12 of the addendum) ───────────────
var CAPABILITIES = [
  'text', 'image', 'imageToImage', 'inpainting', 'upscale',
  'faceRestore', 'styleTransfer', 'referenceImage', 'imageAnimation',
  'video', 'motionPrompt', 'performanceAnimation',
  'audio', 'sfx', 'ambience', 'music', 'voice', 'narration',
  'local', 'free', 'requiresApiKey', 'requiresLocalServer',
  'documentParsing', 'safety'
];

// ── Status enum (9 values from the addendum) ────────────────────
var STATUS_VALUES = [
  'Not configured', 'Ready', 'Failed', 'Rate limited',
  'Unsupported request', 'Returned no file', 'Offline',
  'Local server unavailable', 'Needs user setup'
];

// ── Category groupings ──────────────────────────────────────────
var CATEGORIES = [
  { id: 'chat-text',   label: 'Chat / text', source: 'load.js providerPrefs' },
  { id: 'image-gen',   label: 'Image generation + repair (existing 17)', source: 'load/image-prompt/index.html IMAGE_PROVIDERS' },
  { id: 'image-anim',  label: 'Image animation / image-to-video (new placeholders)', source: 'addendum Section 14.A' },
  { id: 'sfx',         label: 'SFX / ambience (new placeholders)', source: 'addendum Section 14.B' },
  { id: 'voice',       label: 'Voice / narration', source: 'addendum Section 14.C + existing TTS' },
  { id: 'muxing',      label: 'Audio / video muxing (new placeholders)', source: 'addendum Section 14.D' },
  { id: 'load-hosted', label: 'Load-hosted future engine', source: 'Combined ZIP Part 1, layer 8' }
];

function p(id, name, type, cat, caps, status, notes) {
  var capObj = {};
  CAPABILITIES.forEach(function (c) { capObj[c] = false; });
  (caps || []).forEach(function (c) { capObj[c] = true; });
  return {
    providerId: id,
    providerName: name,
    providerType: type,
    category: cat,
    enabled: false,
    requiresApiKey: capObj.requiresApiKey,
    requiresLocalServer: capObj.requiresLocalServer,
    capabilities: capObj,
    status: status || 'Not configured',
    notes: notes || '',
    lastTestedAt: null
  };
}

var REGISTRY = [
  // ── Category 1: chat / text (existing in load.js providerPrefs) ──
  p('builtin', 'Built-in rule-based',  'built-in',  'chat-text', ['text','local','free'], 'Ready', 'Always on. Slash commands + KB. No network.'),
  p('local',   'On-device WebLLM (Qwen 1.5 0.5B)', 'local', 'chat-text', ['text','local','free','requiresLocalServer'], 'Needs user setup', 'transformers.js, ~400 MB one-time download.'),
  p('pollinations', 'Pollinations.ai (chat)', 'free-api', 'chat-text', ['text','free'], 'Ready', 'Default chat fallback. No key.'),
  p('gemini',  'Google Gemini',     'cloud-optional', 'chat-text', ['text','requiresApiKey','free'], 'Not configured', 'Free tier (~1500 req/day). User-supplied key. License review on outputs.'),
  p('groq',    'Groq Llama 3.3',    'cloud-optional', 'chat-text', ['text','requiresApiKey','free'], 'Not configured', 'Free tier with generous daily limit. User-supplied key.'),
  p('openrouter', 'OpenRouter (free models)', 'cloud-optional', 'chat-text', ['text','requiresApiKey','free'], 'Not configured', 'Only :free models used.'),
  p('huggingface-chat', 'Hugging Face Inference (chat)', 'cloud-optional', 'chat-text', ['text','requiresApiKey','free'], 'Not configured', 'User token; same UI as image HF.'),
  p('horde-text',       'AI Horde anonymous text',       'free-api', 'chat-text', ['text','free'], 'Ready', 'Anonymous public LLM pool. No key. Best-effort fallback after Pollinations.'),

  // ── Category 2: image generation + repair (the existing 17) ──
  p('localsd',     'Local SD (A1111-compatible via localSdUrl)', 'local', 'image-gen', ['image','imageToImage','inpainting','styleTransfer','referenceImage','local','free','requiresLocalServer'], 'Needs user setup', 'GPU on local machine. img2img + mask painter integration.'),
  p('pollflux',    'Pollinations Flux',          'free-api', 'image-gen', ['image','free'], 'Ready', 'Sharper photoreal default since v17do.'),
  p('pollinations-img', 'Pollinations classic',  'free-api', 'image-gen', ['image','free'], 'Ready', 'Forced backstop in imageGenWithFallback.'),
  p('huggingface', 'Hugging Face cascade (SDXL / SD-1.5 / FLUX + SDXL Inpainting)', 'cloud-optional', 'image-gen', ['image','imageToImage','inpainting','requiresApiKey','free'], 'Not configured', 'User token; reuses chat-side HF row per addendum.'),
  p('cloudflare',  'Cloudflare AI FLUX-schnell', 'cloud-optional', 'image-gen', ['image','requiresApiKey','free'], 'Not configured', 'Free tier only. Off by default.'),
  p('together',    'Together AI FLUX-schnell-Free', 'cloud-optional', 'image-gen', ['image','requiresApiKey','free'], 'Not configured', 'Only if free-tier remains.'),
  p('horde',       'AI Horde anonymous',         'free-api', 'image-gen', ['image','free'], 'Ready', 'Volunteer GPU pool. Last in priority.'),
  p('imagen',      'Google Imagen / Gemini 2.5 Flash Image', 'cloud-optional', 'image-gen', ['image','imageToImage','referenceImage','requiresApiKey'], 'Not configured', 'Optional only. Key-based.'),
  p('deepai',      'DeepAI',                     'cloud-optional', 'image-gen', ['image','requiresApiKey'], 'Not configured', 'Optional only.'),
  p('pollturbo',   'Pollinations Turbo',         'free-api', 'image-gen', ['image','free'], 'Ready', 'Free / community route.'),
  p('hordesdxl',   'AI Horde SDXL anonymous',    'free-api', 'image-gen', ['image','free'], 'Ready', 'Free / community SDXL route.'),
  p('cfsdxllight', 'Cloudflare SDXL-Lightning',  'cloud-optional', 'image-gen', ['image','requiresApiKey','free'], 'Not configured', 'Free-tier only.'),
  p('hfsdxlturbo', 'HF SDXL-Turbo',              'cloud-optional', 'image-gen', ['image','requiresApiKey','free'], 'Not configured', 'Free user-token route.'),
  p('siliconflow', 'SiliconFlow FLUX.1 Kontext img2img + FLUX.1-schnell', 'cloud-optional', 'image-gen', ['image','imageToImage','referenceImage','requiresApiKey'], 'Not configured', 'Optional only. Off by default.'),
  p('realesrgan',  'Real-ESRGAN (HF) — upscale task', 'cloud-optional', 'image-gen', ['upscale','requiresApiKey','free'], 'Not configured', 'Task-only. Needs HF token.'),
  p('gfpgan',      'GFPGAN — face restore task', 'cloud-optional', 'image-gen', ['faceRestore','requiresApiKey','free'], 'Not configured', 'Task-only. Needs HF token.'),
  p('codeformer',  'CodeFormer — face restore alt task', 'cloud-optional', 'image-gen', ['faceRestore','requiresApiKey','free'], 'Not configured', 'Task-only. Needs HF token.'),

  // ── Category 3: image animation / image-to-video (new placeholders, addendum 14.A) ──
  p('comfyui',           'ComfyUI connector',                     'local', 'image-anim', ['image','imageToImage','imageAnimation','local','requiresLocalServer','free'], 'Needs user setup', 'Local ComfyUI server.'),
  p('comfy-animatediff', 'ComfyUI AnimateDiff workflow',          'local', 'image-anim', ['imageAnimation','motionPrompt','local','requiresLocalServer','free'], 'Needs user setup', 'AnimateDiff workflow inside ComfyUI.'),
  p('comfy-video',       'ComfyUI video workflow',                'local', 'image-anim', ['video','motionPrompt','imageAnimation','local','requiresLocalServer','free'], 'Needs user setup', 'Local image-to-video workflow.'),
  p('ltx-video',         'LTX-Video local workflow placeholder',  'local', 'image-anim', ['video','imageAnimation','motionPrompt','performanceAnimation','local','requiresLocalServer','free'], 'Needs user setup', 'Future local LTX-Video pipeline.'),
  p('wan-video',         'Wan video local workflow placeholder',  'local', 'image-anim', ['video','imageAnimation','motionPrompt','performanceAnimation','local','requiresLocalServer','free'], 'Needs user setup', 'Future local Wan workflow.'),
  p('prompt-only-motion','Prompt-only motion provider',           'prompt-only', 'image-anim', ['motionPrompt','free'], 'Ready', 'Always-available fallback: emits motion prompt only.'),
  p('local-video-server','Local video model server placeholder',  'local', 'image-anim', ['video','imageAnimation','local','requiresLocalServer','free'], 'Needs user setup', 'Generic local video model endpoint.'),
  p('load-engine-video', 'Load Local Engine video connector',     'load-hosted-future', 'image-anim', ['video','imageAnimation','motionPrompt','performanceAnimation','local','free'], 'Not configured', 'Future Load-owned local rendering.'),

  // ── Category 4: SFX / ambience (new placeholders, addendum 14.B) ──
  p('prompt-only-sfx',   'Prompt-only sound design provider',     'prompt-only', 'sfx', ['sfx','ambience','music','free'], 'Ready', 'Always-available fallback: emits sound prompts.'),
  p('user-sfx-library',  'User-imported SFX library',             'user-imported', 'sfx', ['sfx','ambience','local','free'], 'Needs user setup', 'User drops .mp3/.wav into Load.'),
  p('public-domain-sfx', 'Local / public-domain SFX library',     'local', 'sfx', ['sfx','ambience','local','free'], 'Needs user setup', 'CC0 / public-domain pack.'),
  p('hf-audio',          'Hugging Face open-source audio (free)', 'cloud-optional', 'sfx', ['sfx','ambience','music','requiresApiKey','free'], 'Not configured', 'Free / practical HF audio models only.'),
  p('local-audio-server','Local audio model server placeholder',  'local', 'sfx', ['sfx','ambience','music','local','requiresLocalServer','free'], 'Needs user setup', 'Generic local audio model endpoint.'),
  p('load-engine-audio', 'Load Local Engine audio connector',     'load-hosted-future', 'sfx', ['sfx','ambience','music','local','free'], 'Not configured', 'Future Load-owned audio engine.'),

  // ── Category 5: voice / narration (existing + new, addendum 14.C) ──
  p('browser-tts',       'Browser TTS (speechSynthesis)',         'built-in', 'voice', ['voice','narration','local','free'], 'Ready', 'Native iOS / Safari voices.'),
  p('piper',             'Piper neural voice',                    'local',     'voice', ['voice','narration','local','free'], 'Needs user setup', 'Already shipped. ~30 MB download. Stage 1 partial.'),
  p('voice-manipulator', 'Load voice manipulator',                'built-in', 'voice', ['voice','narration','local','free'], 'Ready', 'Pitch / speed / EQ / reverb / echo / presets.'),
  p('user-recording',    'User recording',                        'user-imported', 'voice', ['voice','narration','local','free'], 'Ready', 'Voice Recorder tool.'),
  p('kokoro-tts',        'Kokoro TTS future local connector',     'local',     'voice', ['voice','narration','local','requiresLocalServer','free'], 'Not configured', 'Future local TTS.'),
  p('hf-tts',            'Hugging Face TTS (free models)',        'cloud-optional', 'voice', ['voice','narration','requiresApiKey','free'], 'Not configured', 'Free / practical HF TTS only.'),
  p('load-engine-voice', 'Load Local Engine voice connector',     'load-hosted-future', 'voice', ['voice','narration','local','free'], 'Not configured', 'Future Load-owned voice engine.'),

  // ── Category 6: audio / video muxing (new placeholders, addendum 14.D) ──
  p('web-audio-mixer',   'Web Audio Scene Mixer',                 'built-in', 'muxing', ['audio','sfx','ambience','music','voice','local','free'], 'Ready', 'In-browser layered playback for scenes.'),
  p('ffmpeg-wasm',       'FFmpeg.wasm placeholder',               'local',     'muxing', ['video','audio','local','free'], 'Needs user setup', 'Future client-side muxing.'),
  p('ffmpeg-backend',    'Backend FFmpeg (future optional)',      'load-hosted-future', 'muxing', ['video','audio','free'], 'Not configured', 'Server-side muxing if Load adds backend.'),
  p('load-engine-mux',   'Load Local Engine muxing connector',    'load-hosted-future', 'muxing', ['video','audio','local','free'], 'Not configured', 'Future Load-owned muxing.'),

  // ── Category 7: Load-hosted future ──
  p('load-hosted-llm',   'Load-hosted Model Server (future)',     'load-hosted-future', 'load-hosted', ['text','image','imageToImage','imageAnimation','video','audio','sfx','voice','narration','free'], 'Not configured', 'Lawful open-source / open-weight backend.'),

  // ── 5.7 AI Providers Verification — additional free / local-first slots
  // Media import lanes (license + source metadata recorded per asset; CC is
  // not auto-commercial-safe; user verifies use case-by-case):
  p('freesound',         'Freesound import connector',            'cloud-optional', 'sfx', ['sfx','ambience','requiresApiKey','free'], 'Not configured', 'Near-term. User-supplied free Freesound API key. License + source URL captured per import.'),
  p('pixabay-audio',     'Pixabay royalty-free audio import',     'cloud-optional', 'sfx', ['sfx','ambience','music','requiresApiKey','free'], 'Not configured', 'Near-term. User-supplied free Pixabay API key. Pixabay license recorded; user verifies commercial use.'),
  p('opengameart',       'OpenGameArt audio import (future)',     'free-api',       'sfx', ['sfx','ambience','music','free'], 'Not configured', 'Future. CC0 / CC-BY / CC-BY-SA mix. Per-asset license must be captured.'),
  p('internet-archive',  'Internet Archive audio/media import (future)', 'free-api','sfx', ['sfx','ambience','music','free'], 'Not configured', 'Future. License varies per item; never assume PD without verifying.'),
  p('wikimedia-commons', 'Wikimedia Commons media import (future)','free-api',      'sfx', ['sfx','ambience','music','free'], 'Not configured', 'Future. CC / PD with attribution recorded per asset.'),
  p('openverse',         'Openverse PD/CC search & import (future)','free-api',     'sfx', ['sfx','ambience','music','free'], 'Not configured', 'Future. Aggregator across CC sources; always verify commercial-safe license.'),

  // Local browser audio tools:
  p('audio-cue-sheet',   'Audio Cue Sheet / Timeline SFX',         'built-in', 'muxing', ['sfx','ambience','music','voice','local','free'], 'Ready', 'Per-scene cue list with timecodes for layered playback.'),
  p('procedural-ambience','Procedural ambience generator',         'built-in', 'sfx',    ['sfx','ambience','local','free'], 'Ready', 'On-device synthesis: rain, wind, fire, room tone, crowd bed via OfflineAudioContext.'),

  // Additional ComfyUI workflow connectors (specific to Wan / LTX flavours):
  p('comfy-wan',         'ComfyUI Wan workflow connector',         'local',    'image-anim', ['video','imageAnimation','motionPrompt','performanceAnimation','local','requiresLocalServer','free'], 'Needs user setup', 'Future. Specific Wan workflow inside ComfyUI.'),
  p('comfy-ltx',         'ComfyUI LTX workflow connector',         'local',    'image-anim', ['video','imageAnimation','motionPrompt','local','requiresLocalServer','free'], 'Needs user setup', 'Future. Specific LTX-Video workflow inside ComfyUI.'),

  // Local / open voice options (license review where indicated):
  p('openvoice',         'OpenVoice future connector',             'local',    'voice', ['voice','narration','local','requiresLocalServer','free'], 'Not configured', 'Future. Open voice cloning / TTS.'),
  p('coqui-xtts',        'Coqui XTTS-style local TTS',             'local',    'voice', ['voice','narration','local','requiresLocalServer','free'], 'Not configured', 'Future. License review required (some XTTS variants are non-commercial).'),
  p('indextts',          'IndexTTS future connector',              'local',    'voice', ['voice','narration','local','requiresLocalServer','free'], 'Not configured', 'Future.'),
  p('vibevoice',         'VibeVoice multi-speaker connector',      'local',    'voice', ['voice','narration','local','requiresLocalServer','free'], 'Not configured', 'Future. Long-form / multi-speaker audio.')
];

function list() { return REGISTRY.slice(); }
function byId(id) { return REGISTRY.find(function (p) { return p.providerId === id; }) || null; }
function byCategory() {
  var out = {};
  CATEGORIES.forEach(function (c) { out[c.id] = []; });
  REGISTRY.forEach(function (p) {
    if (out[p.category]) out[p.category].push(p);
  });
  return out;
}
function summary() {
  var total = REGISTRY.length;
  var byType = {};
  REGISTRY.forEach(function (p) { byType[p.providerType] = (byType[p.providerType] || 0) + 1; });
  return { total: total, byType: byType, capabilities: CAPABILITIES.length, statusValues: STATUS_VALUES.length, categories: CATEGORIES.length };
}

if (typeof window !== 'undefined') {
  window.LoadProviderRegistry = {
    list: list,
    byId: byId,
    byCategory: byCategory,
    summary: summary,
    CAPABILITIES: CAPABILITIES.slice(),
    STATUS_VALUES: STATUS_VALUES.slice(),
    CATEGORIES: CATEGORIES.slice()
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { list: list, byId: byId, byCategory: byCategory, summary: summary, CAPABILITIES: CAPABILITIES, STATUS_VALUES: STATUS_VALUES, CATEGORIES: CATEGORIES };
}
})();
