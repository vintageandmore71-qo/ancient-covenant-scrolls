// Load — Audio Cue Sheet / Timeline SFX System (reliability addendum #12)
//
// Persistent timed cue list per scene. Stores cues in
// LoadDB.kv['cuesheet-{sceneId}'] so they travel with the project
// and are exported into scenes.json on package build.
//
// Cue shape (matches the addendum spec):
//   { id, time, type, asset, name?, blob? (in-memory only) }
// where:
//   time      = seconds from scene start, >= 0
//   type      = one of LANES (ambience / sfx / music / voice / narration / video)
//   asset     = string path or url; required for export
//
// Public API:
//   window.LoadCueSheet.LANES                                - 6-string spec list
//   window.LoadCueSheet.validateCue(cue)                     -> { ok, problems[] }
//   window.LoadCueSheet.load(sceneId)                        -> Promise<[cue]>
//   window.LoadCueSheet.save(sceneId, cues)                  -> Promise<bool>
//   window.LoadCueSheet.addCue(sceneId, cue)                 -> Promise<cue>
//   window.LoadCueSheet.removeCue(sceneId, cueId)            -> Promise<bool>
//   window.LoadCueSheet.exportSheet(sceneId)                 -> Promise<{ sceneId, audioCues }>
//   window.LoadCueSheet.scheduleOnMixer(sceneId, mixer)      -> Promise<{ scheduled, durationSec }>
//                                                              schedules cues at their
//                                                              spec times against a running
//                                                              LoadMixer instance.

(function () {
'use strict';

var LANES = ['video', 'narration', 'ambience', 'sfx', 'music', 'voice'];
var KEY_PREFIX = 'cuesheet-';

function getDB() { return (typeof window !== 'undefined' && window.LoadDB) ? window.LoadDB : null; }

function newId() { return 'cue-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5); }

function validateCue(cue) {
  var problems = [];
  if (!cue || typeof cue !== 'object') { return { ok: false, problems: ['cue is not an object'] }; }
  if (typeof cue.time !== 'number' || isNaN(cue.time)) problems.push('time is not a number');
  else if (cue.time < 0) problems.push('time must be >= 0 seconds');
  if (typeof cue.type !== 'string' || LANES.indexOf(cue.type.toLowerCase()) === -1) {
    problems.push('type must be one of: ' + LANES.join(', '));
  }
  if (typeof cue.asset !== 'string' || !cue.asset.trim()) problems.push('asset path is required for export');
  return { ok: problems.length === 0, problems: problems };
}

function load(sceneId) {
  var db = getDB(); if (!db || !sceneId) return Promise.resolve([]);
  return db.get('kv', KEY_PREFIX + sceneId).then(function (v) {
    if (!v || !Array.isArray(v.cues)) return [];
    return v.cues.slice().sort(function (a, b) { return a.time - b.time; });
  }).catch(function () { return []; });
}

function save(sceneId, cues) {
  var db = getDB(); if (!db || !sceneId) return Promise.resolve(false);
  if (!Array.isArray(cues)) return Promise.reject(new Error('cues must be an array'));
  return db.put('kv', KEY_PREFIX + sceneId, { sceneId: sceneId, cues: cues, savedAt: new Date().toISOString() })
    .then(function () { return true; }).catch(function () { return false; });
}

function addCue(sceneId, cue) {
  if (!cue) return Promise.reject(new Error('cue required'));
  var v = validateCue(cue);
  if (!v.ok) return Promise.reject(new Error('invalid cue: ' + v.problems.join('; ')));
  cue.id = cue.id || newId();
  cue.type = cue.type.toLowerCase();
  return load(sceneId).then(function (cues) {
    cues.push({ id: cue.id, time: +cue.time, type: cue.type, asset: cue.asset.trim(), name: cue.name || '' });
    return save(sceneId, cues).then(function () { return cue; });
  });
}

function removeCue(sceneId, cueId) {
  return load(sceneId).then(function (cues) {
    var next = cues.filter(function (c) { return c.id !== cueId; });
    if (next.length === cues.length) return false;
    return save(sceneId, next);
  });
}

function exportSheet(sceneId) {
  return load(sceneId).then(function (cues) {
    return {
      sceneId: sceneId,
      audioCues: cues.map(function (c) {
        return { time: +c.time, type: c.type, asset: c.asset };
      })
    };
  });
}

// Schedules cues against a LoadMixer instance. Each cue produces a
// layer pre-loaded with the cue's blob if available, with the mixer
// `offset` set to the cue's time so AudioContext.start(currentTime
// + offset) lands the cue at the right beat. Returns proof:
// { scheduled, durationSec, problems[] }.
function scheduleOnMixer(sceneId, mixer) {
  if (!mixer || typeof mixer.addLayer !== 'function') {
    return Promise.reject(new Error('mixer instance with addLayer required'));
  }
  return load(sceneId).then(function (cues) {
    var problems = [];
    var maxEnd = 0;
    cues.forEach(function (c) {
      var v = validateCue(c);
      if (!v.ok) { problems.push('cue ' + (c.id || '?') + ': ' + v.problems.join('; ')); return; }
      var lane = (c.type === 'sfx') ? 'SFX' : c.type;
      mixer.addLayer({
        id: c.id, name: c.name || c.asset, lane: lane,
        blob: c.blob || null, offset: c.time, volume: 1
      });
      maxEnd = Math.max(maxEnd, c.time);
    });
    return { scheduled: cues.length - problems.length, total: cues.length, durationSec: maxEnd, problems: problems };
  });
}

if (typeof window !== 'undefined') {
  window.LoadCueSheet = {
    LANES: LANES.slice(),
    validateCue: validateCue,
    load: load,
    save: save,
    addCue: addCue,
    removeCue: removeCue,
    exportSheet: exportSheet,
    scheduleOnMixer: scheduleOnMixer
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LANES: LANES, validateCue: validateCue, load: load, save: save, addCue: addCue, removeCue: removeCue, exportSheet: exportSheet, scheduleOnMixer: scheduleOnMixer };
}
})();
