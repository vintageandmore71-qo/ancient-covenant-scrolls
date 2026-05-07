// Load — Model Capability Audit (reliability addendum #14)
//
// Every provider in the registry already declares its capabilities
// (24 flags). This library exposes:
//   1. A full audit that confirms every capability flag is a boolean
//      and every provider declares all 24 (catches registry bugs).
//   2. A `canHandle(providerId, capability)` guard so call sites
//      cannot accidentally send an audio request to an image-only
//      provider or a video request to an audio-only one.
//   3. `assertCanHandle()` that throws — useful as a runtime gate.
//
// Public API:
//   window.LoadCapabilityAudit.audit()                          -> auditReport
//   window.LoadCapabilityAudit.canHandle(providerId, cap)       -> bool
//   window.LoadCapabilityAudit.assertCanHandle(providerId, cap) -> throws on mismatch
//   window.LoadCapabilityAudit.findProvidersFor(cap)            -> [provider]
//   window.LoadCapabilityAudit.checkRoute(providerId, intent)   -> { allowed, reason }
//
// auditReport shape:
//   { totalProviders, totalCapabilities, problems: [{providerId, problem}],
//     coverage: { capability: providerCount, ... }, byProvider: { id: {capCount, missingFlags} } }

(function () {
'use strict';

// Map LoadAICore intent ids to the capability flag they require.
var INTENT_TO_CAPABILITY = {
  'chat':           'text',
  'image-gen':      'image',
  'image-to-image': 'imageToImage',
  'image-upscale':  'upscale',
  'face-restore':   'faceRestore',
  'image-anim':     'imageAnimation',
  'video':          'video',
  'sfx':            'sfx',
  'ambience':       'ambience',
  'music':          'music',
  'voice':          'voice',
  'mux':            'video'   // mux is video-domain
};

function getRegistry() { return (typeof window !== 'undefined' && window.LoadProviderRegistry) ? window.LoadProviderRegistry : null; }

function audit() {
  var R = getRegistry();
  if (!R) return { totalProviders: 0, totalCapabilities: 0, problems: ['LoadProviderRegistry missing'], coverage: {}, byProvider: {} };
  var caps = R.CAPABILITIES;
  var providers = R.list();
  var problems = [];
  var coverage = {};
  caps.forEach(function (c) { coverage[c] = 0; });
  var byProvider = {};
  providers.forEach(function (p) {
    var capObj = p.capabilities || {};
    var capCount = 0;
    var missingFlags = [];
    caps.forEach(function (c) {
      if (!Object.prototype.hasOwnProperty.call(capObj, c)) {
        missingFlags.push(c);
        problems.push({ providerId: p.providerId, problem: 'missing flag: ' + c });
      } else if (typeof capObj[c] !== 'boolean') {
        problems.push({ providerId: p.providerId, problem: 'flag ' + c + ' is not a boolean: ' + typeof capObj[c] });
      } else if (capObj[c] === true) {
        capCount++;
        coverage[c]++;
      }
    });
    byProvider[p.providerId] = { capCount: capCount, missingFlags: missingFlags };
  });
  return {
    totalProviders: providers.length,
    totalCapabilities: caps.length,
    problems: problems,
    coverage: coverage,
    byProvider: byProvider
  };
}

function canHandle(providerId, capability) {
  var R = getRegistry(); if (!R) return false;
  var p = R.byId(providerId); if (!p) return false;
  return !!(p.capabilities && p.capabilities[capability] === true);
}

function assertCanHandle(providerId, capability) {
  var R = getRegistry();
  if (!R) throw new Error('LoadProviderRegistry missing');
  var p = R.byId(providerId);
  if (!p) throw new Error('unknown providerId: ' + providerId);
  if (R.CAPABILITIES.indexOf(capability) === -1) throw new Error('unknown capability: ' + capability);
  if (p.capabilities[capability] !== true) {
    throw new Error('Capability mismatch: ' + p.providerName + ' [' + providerId + '] does not support "' + capability + '". Declared: ' + R.CAPABILITIES.filter(function (c) { return p.capabilities[c]; }).join(', '));
  }
  return true;
}

function findProvidersFor(capability) {
  var R = getRegistry(); if (!R) return [];
  return R.list().filter(function (p) { return p.capabilities && p.capabilities[capability] === true; });
}

// Higher-level guard for routing decisions: given a provider id + an
// intent (LoadAICore intent), confirm the provider declares the matching
// capability. Returns { allowed, reason } so the caller can surface the
// error without throwing.
function checkRoute(providerId, intent) {
  var cap = INTENT_TO_CAPABILITY[intent];
  if (!cap) return { allowed: false, reason: 'unknown intent: ' + intent };
  if (canHandle(providerId, cap)) return { allowed: true, reason: 'capability declared', capability: cap };
  return { allowed: false, reason: 'provider ' + providerId + ' does not declare capability "' + cap + '" required by intent "' + intent + '"', capability: cap };
}

if (typeof window !== 'undefined') {
  window.LoadCapabilityAudit = {
    audit: audit,
    canHandle: canHandle,
    assertCanHandle: assertCanHandle,
    findProvidersFor: findProvidersFor,
    checkRoute: checkRoute,
    INTENT_TO_CAPABILITY: Object.assign({}, INTENT_TO_CAPABILITY)
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { audit: audit, canHandle: canHandle, assertCanHandle: assertCanHandle, findProvidersFor: findProvidersFor, checkRoute: checkRoute, INTENT_TO_CAPABILITY: INTENT_TO_CAPABILITY };
}
})();
