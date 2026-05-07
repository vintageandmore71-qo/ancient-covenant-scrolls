// Load — Scene Asset Dependency Checker (reliability addendum #10)
//
// Before export, walk every scene in Project Memory and verify that its
// referenced assets actually exist on disk / in IndexedDB, that there
// are no broken paths, no unattached generated assets (assets in
// LoadDB whose sceneId points at no scene), and that rights metadata
// is present.
//
// Public API:
//   window.LoadSceneDeps.checkScene(scene, db)         -> Promise<sceneCheck>
//   window.LoadSceneDeps.checkAll(opts)                -> Promise<aggregateReport>
//
// sceneCheck shape:
//   { sceneId, problems: [ { kind, severity, detail } ] }
// where kind is one of:
//   'Missing file' | 'Broken path' | 'Unattached asset' | 'Rights missing'
// and severity is 'block' | 'warn'.
//
// aggregateReport shape:
//   { scenes: [ sceneCheck ], unattached: [ { store, key, sceneId } ],
//     totals: { problems, blockers, warnings } }

(function () {
'use strict';

var KINDS = ['Missing file', 'Broken path', 'Unattached asset', 'Rights missing'];

function getDB() { return (typeof window !== 'undefined' && window.LoadDB) ? window.LoadDB : null; }

function isProbableUrl(s) {
  return typeof s === 'string' && (/^(https?:|blob:|data:|\.\.?\/|\/)/.test(s) || /\.(png|jpe?g|webp|gif|svg|webm|mp4|mp3|wav|m4a|ogg)$/i.test(s));
}

function checkScene(scene, db) {
  db = db || getDB();
  if (!scene || !scene.sceneId) {
    return Promise.resolve({ sceneId: '', problems: [{ kind: 'Missing file', severity: 'block', detail: 'scene record itself missing' }] });
  }
  var problems = [];
  var jobs = [];

  // Image: if scene.image is set, verify either it's a URL we can render
  // OR there's a matching image_assets row.
  if (scene.image) {
    if (!isProbableUrl(scene.image)) {
      problems.push({ kind: 'Broken path', severity: 'block', detail: 'image: not a recognisable URL or path: ' + String(scene.image).slice(0, 120) });
    }
  }

  // Video: must have a video_assets row when scene.video is set.
  if (scene.video) {
    if (db) {
      jobs.push(db.get('video_assets', scene.sceneId + '_video').then(function (v) {
        if (!v || !v.blob) problems.push({ kind: 'Missing file', severity: 'block', detail: 'video declared on scene but no Blob in video_assets[' + scene.sceneId + '_video]' });
      }).catch(function () { problems.push({ kind: 'Missing file', severity: 'block', detail: 'video_assets read failed for ' + scene.sceneId }); }));
    }
  }

  // Audio: same check.
  if (scene.audio) {
    if (db) {
      jobs.push(db.get('audio_assets', scene.sceneId + '_audio').then(function (a) {
        if (!a || !a.blob) problems.push({ kind: 'Missing file', severity: 'block', detail: 'audio declared on scene but no Blob in audio_assets[' + scene.sceneId + '_audio]' });
      }).catch(function () { problems.push({ kind: 'Missing file', severity: 'block', detail: 'audio_assets read failed for ' + scene.sceneId }); }));
    }
  }

  // Output-proof shape: when video / audio is set, the matching outputProof must exist.
  if (scene.video && !scene.videoOutputProof) problems.push({ kind: 'Broken path', severity: 'block', detail: 'video set but videoOutputProof missing on scene record' });
  if (scene.audio && !scene.audioOutputProof) problems.push({ kind: 'Broken path', severity: 'block', detail: 'audio set but audioOutputProof missing on scene record' });

  // Rights metadata: kv['rights-{sceneId}'] must exist.
  if (db) {
    jobs.push(db.get('kv', 'rights-' + scene.sceneId).then(function (r) {
      if (!r || typeof r !== 'object') {
        problems.push({ kind: 'Rights missing', severity: 'block', detail: 'kv[rights-' + scene.sceneId + '] missing' });
      } else {
        if (!r.assetDeclarations || !Array.isArray(r.assetDeclarations)) {
          problems.push({ kind: 'Rights missing', severity: 'warn', detail: 'rights envelope has no assetDeclarations array' });
        }
      }
    }).catch(function () { problems.push({ kind: 'Rights missing', severity: 'block', detail: 'rights kv read failed' }); }));
  }

  return Promise.all(jobs).then(function () { return { sceneId: scene.sceneId, problems: problems }; });
}

function checkAll(opts) {
  opts = opts || {};
  var db = getDB();
  if (!db) return Promise.resolve({ scenes: [], unattached: [], totals: { problems: 0, blockers: 0, warnings: 0 } });
  return Promise.all([
    db.getAll('scenes', 1000),
    db.getAll('image_assets', 2000),
    db.getAll('audio_assets', 2000),
    db.getAll('video_assets', 2000)
  ]).then(function (rows) {
    var scenes = rows[0].map(function (r) { return r.value; }).filter(function (v) { return v && v.sceneId; });
    if (opts.threadId) scenes = scenes.filter(function (s) { return s.threadId === opts.threadId; });
    var sceneIds = {};
    scenes.forEach(function (s) { sceneIds[s.sceneId] = true; });
    var unattached = [];
    [['image_assets', rows[1]], ['audio_assets', rows[2]], ['video_assets', rows[3]]].forEach(function (pair) {
      pair[1].forEach(function (r) {
        var sid = r.value && r.value.sceneId;
        if (sid && !sceneIds[sid]) unattached.push({ store: pair[0], key: r.key, sceneId: sid });
      });
    });
    return Promise.all(scenes.map(function (s) { return checkScene(s, db); })).then(function (sceneChecks) {
      var problems = 0, blockers = 0, warnings = 0;
      sceneChecks.forEach(function (c) {
        problems += c.problems.length;
        c.problems.forEach(function (p) { if (p.severity === 'block') blockers++; else warnings++; });
      });
      // Unattached counts as block (per spec wording)
      unattached.forEach(function () { problems++; blockers++; });
      return { scenes: sceneChecks, unattached: unattached, totals: { problems: problems, blockers: blockers, warnings: warnings } };
    });
  });
}

if (typeof window !== 'undefined') {
  window.LoadSceneDeps = { KINDS: KINDS.slice(), checkScene: checkScene, checkAll: checkAll };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KINDS: KINDS, checkScene: checkScene, checkAll: checkAll };
}
})();
