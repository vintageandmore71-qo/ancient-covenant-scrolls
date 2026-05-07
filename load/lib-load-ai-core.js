// Load — AI Core orchestration layer (X-AI-CORE Phase 1, read-only)
//
// Layer 1 of the 8-layer Load-owned AI OS. Reads from
// window.LoadProviderRegistry and produces an ordered route
// (preferred -> fallback -> last-resort) for any supported intent.
//
// Phase 1 scope: pure routing decisions only. Does NOT call any
// generator. The downstream phases that wire real providers must
// honour the route this Core returns and the output-proof rule
// (real playable file/blob/URL or labelled prompt-only).
//
// Master rule: free / open-source / local-first first. Paid /
// cloud-optional providers are appended after free ones, never
// chosen unless the user has supplied a key.
//
// Public API:
//   window.LoadAICore.INTENTS                    - 11 intent ids
//   window.LoadAICore.intentMeta(id)             - { id, label, capability, category }
//   window.LoadAICore.route(intent[, opts])      - ordered provider list
//   window.LoadAICore.explain(intent[, opts])    - [{ provider, reason }]
//   window.LoadAICore.pickByCapability(cap)      - providers with that flag
//   window.LoadAICore.summary()                  - counts per intent

(function () {
'use strict';

var INTENT_DEFS = [
  { id: 'chat',           label: 'Chat / text',                    capability: 'text',          category: 'chat-text' },
  { id: 'image-gen',      label: 'Image generation',               capability: 'image',         category: 'image-gen' },
  { id: 'image-to-image', label: 'Image to image',                 capability: 'imageToImage',  category: 'image-gen' },
  { id: 'image-upscale',  label: 'Image upscale',                  capability: 'upscale',       category: 'image-gen' },
  { id: 'face-restore',   label: 'Face restore',                   capability: 'faceRestore',   category: 'image-gen' },
  { id: 'image-anim',     label: 'Image animation / image to video', capability: 'imageAnimation', category: 'image-anim' },
  { id: 'video',          label: 'Video generation',               capability: 'video',         category: 'image-anim' },
  { id: 'sfx',            label: 'Sound effects',                  capability: 'sfx',           category: 'sfx' },
  { id: 'ambience',       label: 'Ambience',                       capability: 'ambience',      category: 'sfx' },
  { id: 'music',          label: 'Music',                          capability: 'music',         category: 'sfx' },
  { id: 'voice',          label: 'Voice / narration',              capability: 'voice',         category: 'voice' },
  { id: 'mux',            label: 'Audio / video muxing',           capability: 'video',         category: 'muxing' }
];

function getRegistry() {
  return (typeof window !== 'undefined' && window.LoadProviderRegistry) ? window.LoadProviderRegistry : null;
}

function intentMeta(id) {
  for (var i = 0; i < INTENT_DEFS.length; i++) if (INTENT_DEFS[i].id === id) return INTENT_DEFS[i];
  return null;
}

// Priority weight: lower = preferred. Free / built-in / local before
// cloud-optional. prompt-only is a guaranteed fallback (always Ready).
var TYPE_WEIGHT = {
  'built-in':            10,
  'free-api':            20,
  'local':               30,
  'prompt-only':         40,
  'user-imported':       50,
  'cloud-optional':      60,
  'load-hosted-future':  90
};

function statusWeight(status) {
  if (status === 'Ready') return 0;
  if (status === 'Needs user setup') return 5;
  if (status === 'Not configured') return 10;
  return 50;
}

function pickByCapability(cap) {
  var R = getRegistry(); if (!R) return [];
  return R.list().filter(function (p) { return p.capabilities && p.capabilities[cap]; });
}

function pickByCategoryAndCap(category, cap) {
  var R = getRegistry(); if (!R) return [];
  return R.list().filter(function (p) {
    return p.category === category && p.capabilities && p.capabilities[cap];
  });
}

function reasonFor(provider, intent) {
  var caps = provider.capabilities || {};
  var bits = [];
  if (caps.local) bits.push('local-first');
  if (caps.free && !caps.requiresApiKey) bits.push('free / no key');
  if (caps.requiresApiKey) bits.push('user key required');
  if (caps.requiresLocalServer) bits.push('local server required');
  if (provider.providerType === 'prompt-only') bits.push('emits prompt only');
  if (provider.providerType === 'load-hosted-future') bits.push('Load-owned (future)');
  if (provider.providerType === 'built-in') bits.push('always on');
  if (provider.status === 'Ready') bits.push('Ready');
  else bits.push(provider.status);
  return bits.join(' · ');
}

function route(intent, opts) {
  var meta = intentMeta(intent);
  if (!meta) return [];
  var R = getRegistry(); if (!R) return [];
  var includePaid = !!(opts && opts.includePaid);
  var rows = pickByCategoryAndCap(meta.category, meta.capability);
  if (!includePaid) {
    rows = rows.filter(function (p) {
      return !(p.capabilities.requiresApiKey && !p.capabilities.free);
    });
  }
  rows.sort(function (a, b) {
    var wa = (TYPE_WEIGHT[a.providerType] || 100) + statusWeight(a.status);
    var wb = (TYPE_WEIGHT[b.providerType] || 100) + statusWeight(b.status);
    if (wa !== wb) return wa - wb;
    return a.providerName.localeCompare(b.providerName);
  });
  return rows;
}

function explain(intent, opts) {
  return route(intent, opts).map(function (p) {
    return {
      providerId: p.providerId,
      providerName: p.providerName,
      providerType: p.providerType,
      status: p.status,
      reason: reasonFor(p, intent)
    };
  });
}

function summary() {
  var out = { intents: INTENT_DEFS.length, byIntent: {} };
  INTENT_DEFS.forEach(function (i) {
    out.byIntent[i.id] = route(i.id).length;
  });
  return out;
}

if (typeof window !== 'undefined') {
  window.LoadAICore = {
    INTENTS: INTENT_DEFS.map(function (i) { return i.id; }),
    intentMeta: intentMeta,
    route: route,
    explain: explain,
    pickByCapability: pickByCapability,
    summary: summary
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { INTENTS: INTENT_DEFS, intentMeta: intentMeta, route: route, explain: explain, pickByCapability: pickByCapability, summary: summary };
}
})();
