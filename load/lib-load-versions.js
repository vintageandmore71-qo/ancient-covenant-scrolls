// Load — Versioned Generation History (reliability addendum #17)
//
// Every generated output (image / animation / audio / video / prompt)
// gets a versioned record so the user can view previous versions,
// restore one, compare, mark final, or delete failed runs.
//
// Records live in LoadDB.kv with keys:
//   versions-{sceneId}-{kind}-{versionId}
// where kind ∈ KINDS and versionId is timestamp-prefixed for natural
// chronological sort. The user-visible label is derived as
// {sceneId}_{kind}_v{n} where n is the chronological index.
//
// Public API:
//   window.LoadVersions.KINDS                                       - 5 spec kinds
//   window.LoadVersions.STATUSES                                    - draft/final/failed
//   window.LoadVersions.add(sceneId, kind, payload)                 -> Promise<record>
//   window.LoadVersions.list(sceneId, kind)                         -> Promise<[record]>
//   window.LoadVersions.listAll(sceneId)                            -> Promise<{kind: [record]}>
//   window.LoadVersions.get(versionId)                              -> Promise<record|null>
//   window.LoadVersions.markFinal(versionId)                        -> Promise<bool>
//   window.LoadVersions.markFailed(versionId, reason)               -> Promise<bool>
//   window.LoadVersions.restore(sceneId, kind, versionId)           -> Promise<{ok, label}>
//   window.LoadVersions.remove(versionId)                           -> Promise<bool>
//   window.LoadVersions.deleteFailed(sceneId, kind?)                -> Promise<number>
//   window.LoadVersions.compare(versionIdA, versionIdB)             -> Promise<{differences[]}>
//   window.LoadVersions.label(record)                               -> string

(function () {
'use strict';

var KINDS = ['image', 'animation', 'audio', 'video', 'prompt'];
var STATUSES = ['draft', 'final', 'failed'];
var KEY_PREFIX = 'versions-';

function getDB() { return (typeof window !== 'undefined' && window.LoadDB) ? window.LoadDB : null; }

function newVersionId() { return 'ver-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }

function keyFor(sceneId, kind, versionId) {
  return KEY_PREFIX + sceneId + '-' + kind + '-' + versionId;
}

function add(sceneId, kind, payload) {
  if (!sceneId) return Promise.reject(new Error('sceneId required'));
  if (KINDS.indexOf(kind) === -1) return Promise.reject(new Error('unknown kind: ' + kind));
  var db = getDB(); if (!db) return Promise.reject(new Error('LoadDB unavailable'));
  var record = {
    versionId: newVersionId(),
    sceneId: sceneId,
    kind: kind,
    status: 'draft',
    createdAt: new Date().toISOString(),
    payload: payload || {},
    proof: (payload && payload.proof) || null,
    error: null
  };
  return db.put('kv', keyFor(sceneId, kind, record.versionId), record).then(function () { return record; });
}

function list(sceneId, kind) {
  var db = getDB(); if (!db || !sceneId) return Promise.resolve([]);
  return db.getAll('kv', 5000).then(function (rows) {
    var prefix = KEY_PREFIX + sceneId + '-' + (kind ? kind + '-' : '');
    return rows
      .filter(function (r) { return typeof r.key === 'string' && r.key.indexOf(prefix) === 0 && r.value && r.value.versionId; })
      .map(function (r) { return r.value; })
      .sort(function (a, b) { return (a.createdAt < b.createdAt) ? -1 : 1; });
  });
}

function listAll(sceneId) {
  return list(sceneId).then(function (rows) {
    var out = {};
    KINDS.forEach(function (k) { out[k] = []; });
    rows.forEach(function (r) {
      if (out[r.kind]) out[r.kind].push(r);
      else out[r.kind] = [r];
    });
    return out;
  });
}

function get(versionId) {
  var db = getDB(); if (!db || !versionId) return Promise.resolve(null);
  return db.getAll('kv', 5000).then(function (rows) {
    var hit = rows.find(function (r) { return r.value && r.value.versionId === versionId; });
    return hit ? hit.value : null;
  }).catch(function () { return null; });
}

function setStatus(versionId, status, errorMsg) {
  if (STATUSES.indexOf(status) === -1) return Promise.reject(new Error('unknown status: ' + status));
  var db = getDB(); if (!db || !versionId) return Promise.resolve(false);
  return get(versionId).then(function (rec) {
    if (!rec) return false;
    rec.status = status;
    if (status === 'failed' && errorMsg) rec.error = String(errorMsg);
    rec.updatedAt = new Date().toISOString();
    return db.put('kv', keyFor(rec.sceneId, rec.kind, rec.versionId), rec).then(function () { return true; });
  });
}

function markFinal(versionId) { return setStatus(versionId, 'final'); }
function markFailed(versionId, reason) { return setStatus(versionId, 'failed', reason); }

function remove(versionId) {
  var db = getDB(); if (!db || !versionId) return Promise.resolve(false);
  return get(versionId).then(function (rec) {
    if (!rec) return false;
    return db.delete('kv', keyFor(rec.sceneId, rec.kind, rec.versionId)).then(function () { return true; }).catch(function () { return false; });
  });
}

function deleteFailed(sceneId, kind) {
  return list(sceneId, kind).then(function (recs) {
    var doomed = recs.filter(function (r) { return r.status === 'failed'; });
    return Promise.all(doomed.map(function (r) { return remove(r.versionId); })).then(function () { return doomed.length; });
  });
}

// Restore a version: copy its payload back into the scene record so it
// becomes the active one. Returns { ok, label, fields[] } so the caller
// can confirm exactly which scene fields were overwritten.
function restore(sceneId, kind, versionId) {
  var db = getDB(); if (!db || !sceneId || !versionId) return Promise.resolve({ ok: false, reason: 'sceneId+versionId required' });
  return Promise.all([db.get('scenes', sceneId), get(versionId)]).then(function (rows) {
    var scene = rows[0]; var ver = rows[1];
    if (!scene) return { ok: false, reason: 'scene not found' };
    if (!ver) return { ok: false, reason: 'version not found' };
    if (ver.kind !== kind) return { ok: false, reason: 'kind mismatch: version is ' + ver.kind + ', requested ' + kind };
    var fields = [];
    var p = ver.payload || {};
    if (kind === 'image' && p.image) { scene.image = p.image; fields.push('image'); }
    if (kind === 'animation' || kind === 'video') {
      if (p.video) { scene.video = p.video; fields.push('video'); }
      if (p.videoOutputProof) { scene.videoOutputProof = p.videoOutputProof; fields.push('videoOutputProof'); }
    }
    if (kind === 'audio') {
      if (p.audio) { scene.audio = p.audio; fields.push('audio'); }
      if (p.audioOutputProof) { scene.audioOutputProof = p.audioOutputProof; fields.push('audioOutputProof'); }
      if (p.audioStatus) { scene.audioStatus = p.audioStatus; fields.push('audioStatus'); }
    }
    if (kind === 'prompt') {
      ['visualPrompt','motionPrompt','audioPrompt'].forEach(function (k) { if (p[k]) { scene[k] = p[k]; fields.push(k); } });
    }
    scene.updatedAt = new Date().toISOString();
    scene.restoredFromVersion = versionId;
    return db.put('scenes', sceneId, scene).then(function () {
      return { ok: true, label: label(ver), fields: fields };
    });
  });
}

function compare(versionIdA, versionIdB) {
  return Promise.all([get(versionIdA), get(versionIdB)]).then(function (rows) {
    var a = rows[0]; var b = rows[1];
    if (!a || !b) return { differences: [{ field: '_root', a: !!a, b: !!b, note: 'one or both versions not found' }] };
    var differences = [];
    if (a.kind !== b.kind) differences.push({ field: 'kind', a: a.kind, b: b.kind });
    if (a.status !== b.status) differences.push({ field: 'status', a: a.status, b: b.status });
    var pa = a.payload || {}, pb = b.payload || {};
    var keys = {};
    Object.keys(pa).forEach(function (k) { keys[k] = true; });
    Object.keys(pb).forEach(function (k) { keys[k] = true; });
    Object.keys(keys).forEach(function (k) {
      var va = JSON.stringify(pa[k]); var vb = JSON.stringify(pb[k]);
      if (va !== vb) differences.push({ field: 'payload.' + k, a: pa[k], b: pb[k] });
    });
    return { a: { versionId: a.versionId, label: label(a) }, b: { versionId: b.versionId, label: label(b) }, differences: differences };
  });
}

// Build the spec-shaped label: scene_001_image_v1
// `n` is the 1-based chronological index for the same (sceneId, kind).
function label(record, n) {
  if (!record) return '';
  var idx = (typeof n === 'number') ? n : '?';
  return record.sceneId + '_' + record.kind + '_v' + idx;
}

if (typeof window !== 'undefined') {
  window.LoadVersions = {
    KINDS: KINDS.slice(),
    STATUSES: STATUSES.slice(),
    add: add,
    list: list,
    listAll: listAll,
    get: get,
    markFinal: markFinal,
    markFailed: markFailed,
    restore: restore,
    remove: remove,
    deleteFailed: deleteFailed,
    compare: compare,
    label: label
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KINDS: KINDS, STATUSES: STATUSES, add: add, list: list, listAll: listAll, get: get, markFinal: markFinal, markFailed: markFailed, restore: restore, remove: remove, deleteFailed: deleteFailed, compare: compare, label: label };
}
})();
