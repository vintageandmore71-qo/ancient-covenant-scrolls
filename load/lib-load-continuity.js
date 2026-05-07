// Load — Continuity Lock System (reliability addendum #16)
//
// Per-thread locks that prevent output drift across scenes. Each lock
// captures a stable trait the user wants every subsequent generation
// to honour. Locks are persisted in LoadDB.kv['continuity-locks-
// {threadId}'] so they travel with the thread and re-apply after a
// page reload.
//
// Public API:
//   window.LoadContinuity.LOCK_KEYS                                - 8 spec keys
//   window.LoadContinuity.PROMPT_TARGETS                           - lock -> compiled-prompt-layer map
//   window.LoadContinuity.getLocks(threadId)                       -> Promise<{...}>
//   window.LoadContinuity.setLock(threadId, key, value)            -> Promise<bool>
//   window.LoadContinuity.removeLock(threadId, key)                -> Promise<bool>
//   window.LoadContinuity.applyToPrompt(threadId, compiled)        -> Promise<compiled'>
//   window.LoadContinuity.applyLocksToPrompt(locks, compiled)      -> compiled' (sync)
//   window.LoadContinuity.diff(threadId)                           -> Promise<{ scenesChecked, conflicts }>

(function () {
'use strict';

var LOCK_KEYS = [
  'character',          // Lock character appearance
  'wardrobe',           // Lock wardrobe
  'era',                // Lock era
  'style',              // Lock style
  'location',           // Lock location
  'tone',               // Lock tone
  'voiceDirection',     // Lock voice direction
  'lightingDirection'   // Lock lighting direction
];

// Where each lock value gets appended in a compiled-prompt object.
// Targets are arrays so a lock can reinforce more than one layer.
var PROMPT_TARGETS = {
  character:         ['visualPrompt', 'characterMotionPrompt'],
  wardrobe:          ['visualPrompt', 'characterMotionPrompt'],
  era:               ['environmentPrompt', 'visualPrompt'],
  style:             ['visualPrompt'],
  location:          ['environmentPrompt'],
  tone:              ['musicPrompt'],
  voiceDirection:    ['voicePrompt'],
  lightingDirection: ['visualPrompt', 'cameraPrompt']
};

var KEY_PREFIX = 'continuity-locks-';

function getDB() { return (typeof window !== 'undefined' && window.LoadDB) ? window.LoadDB : null; }

function emptyLocks() {
  var o = {};
  LOCK_KEYS.forEach(function (k) { o[k] = ''; });
  return o;
}

function getLocks(threadId) {
  var db = getDB(); if (!db || !threadId) return Promise.resolve(emptyLocks());
  return db.get('kv', KEY_PREFIX + threadId).then(function (v) {
    var out = emptyLocks();
    if (v && typeof v === 'object') {
      LOCK_KEYS.forEach(function (k) { if (typeof v[k] === 'string') out[k] = v[k]; });
    }
    return out;
  }).catch(function () { return emptyLocks(); });
}

function setLock(threadId, key, value) {
  if (!threadId) return Promise.reject(new Error('threadId required'));
  if (LOCK_KEYS.indexOf(key) === -1) return Promise.reject(new Error('unknown lock key: ' + key));
  var db = getDB(); if (!db) return Promise.resolve(false);
  return getLocks(threadId).then(function (locks) {
    locks[key] = String(value == null ? '' : value).trim();
    locks._savedAt = new Date().toISOString();
    return db.put('kv', KEY_PREFIX + threadId, locks).then(function () { return true; });
  });
}

function removeLock(threadId, key) {
  return setLock(threadId, key, '');
}

function clearAll(threadId) {
  var db = getDB(); if (!db || !threadId) return Promise.resolve(false);
  return db.put('kv', KEY_PREFIX + threadId, emptyLocks()).then(function () { return true; }).catch(function () { return false; });
}

// Apply a locks object to a compiled-prompt object (synchronous).
// Empty locks are skipped. Targets are appended after a separator so
// the original prompt content is preserved.
function applyLocksToPrompt(locks, compiled) {
  var out = compiled ? Object.assign({}, compiled) : {};
  if (!locks || typeof locks !== 'object') return out;
  LOCK_KEYS.forEach(function (k) {
    var v = (typeof locks[k] === 'string') ? locks[k].trim() : '';
    if (!v) return;
    var targets = PROMPT_TARGETS[k] || [];
    targets.forEach(function (layer) {
      var current = (typeof out[layer] === 'string') ? out[layer] : '';
      var tag = '[locked ' + k + ': ' + v + ']';
      // Idempotent — don't append the same lock twice.
      if (current.indexOf(tag) !== -1) return;
      out[layer] = current ? (current + ' | ' + tag) : tag;
    });
  });
  return out;
}

function applyToPrompt(threadId, compiled) {
  return getLocks(threadId).then(function (locks) {
    return applyLocksToPrompt(locks, compiled);
  });
}

// Drift detection: compares the locks for a thread against every
// per-scene continuity entry (kv['continuity-{sceneId}']) for that
// thread. Reports conflicts where a scene's character / wardrobe /
// era / style etc. is set but does NOT contain the locked value.
function diff(threadId) {
  var db = getDB(); if (!db || !threadId) return Promise.resolve({ scenesChecked: [], conflicts: [] });
  return Promise.all([getLocks(threadId), db.getAll('scenes', 1000), db.getAll('kv', 5000)]).then(function (rows) {
    var locks = rows[0];
    var scenes = rows[1].map(function (r) { return r.value; }).filter(function (s) { return s && s.threadId === threadId; });
    var continuityByScene = {};
    rows[2].forEach(function (r) {
      if (typeof r.key === 'string' && r.key.indexOf('continuity-') === 0 && r.key.indexOf(KEY_PREFIX) !== 0) {
        var sid = r.key.replace(/^continuity-/, '');
        continuityByScene[sid] = r.value;
      }
    });
    var conflicts = [];
    var scenesChecked = [];
    scenes.forEach(function (s) {
      var c = continuityByScene[s.sceneId] || {};
      scenesChecked.push(s.sceneId);
      LOCK_KEYS.forEach(function (k) {
        var lockedV = (locks[k] || '').toLowerCase();
        if (!lockedV) return;
        var actual = String(c[k] == null ? '' : c[k]);
        if (!actual) {
          conflicts.push({ sceneId: s.sceneId, key: k, locked: locks[k], actual: '', kind: 'missing' });
        } else if (actual.toLowerCase().indexOf(lockedV) === -1) {
          conflicts.push({ sceneId: s.sceneId, key: k, locked: locks[k], actual: actual, kind: 'mismatch' });
        }
      });
    });
    return { scenesChecked: scenesChecked, conflicts: conflicts };
  });
}

if (typeof window !== 'undefined') {
  window.LoadContinuity = {
    LOCK_KEYS: LOCK_KEYS.slice(),
    PROMPT_TARGETS: Object.assign({}, PROMPT_TARGETS),
    getLocks: getLocks,
    setLock: setLock,
    removeLock: removeLock,
    clearAll: clearAll,
    applyToPrompt: applyToPrompt,
    applyLocksToPrompt: applyLocksToPrompt,
    diff: diff
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LOCK_KEYS: LOCK_KEYS, PROMPT_TARGETS: PROMPT_TARGETS, getLocks: getLocks, setLock: setLock, removeLock: removeLock, clearAll: clearAll, applyToPrompt: applyToPrompt, applyLocksToPrompt: applyLocksToPrompt, diff: diff };
}
})();
