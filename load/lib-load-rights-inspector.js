// Load — Asset Rights Inspector (reliability addendum #9)
//
// Per-asset rights inspector that aggregates from rights-{sceneId},
// asset-decl-{sceneId}, and the LoadDB.scenes / generations stores
// to produce a single audit answer:
//   "Every asset has a status. Status 'unknown' or 'needs-review'
//   blocks LoadPlay publish-prep."
//
// Public API:
//   window.LoadRightsInspector.STATUSES                            - 9-value spec enum
//   window.LoadRightsInspector.BLOCKING_STATUSES                   - statuses that block publish
//   window.LoadRightsInspector.classifyAsset(decl, scene)          -> { status, evidence, blocksPublish }
//   window.LoadRightsInspector.inspectAll(opts)                    -> Promise<auditReport>
//   window.LoadRightsInspector.blocksPublish(auditReport)          -> bool
//
// auditReport shape:
//   { total, byStatus: { ... }, blockers: [...], scenes: [
//       { sceneId, threadId, assets: [ { asset, status, blocksPublish, evidence } ],
//         sceneBlocksPublish }
//     ] }

(function () {
'use strict';

var STATUSES = [
  'user-owned', 'public-domain', 'licensed', 'platform-original',
  'user-generated', 'user-recorded', 'third-party-licensed',
  'unknown', 'needs-review'
];
var BLOCKING_STATUSES = ['unknown', 'needs-review'];

function getDB() { return (typeof window !== 'undefined' && window.LoadDB) ? window.LoadDB : null; }

function isBlocking(status) {
  return BLOCKING_STATUSES.indexOf(status) !== -1;
}

// Classify a single asset declaration into one of the 9 spec statuses.
// `decl` may be a plain object from asset-declarations.json or a
// runtime asset descriptor produced by Chat Studio's attachToScene.
function classifyAsset(decl, scene) {
  if (!decl || typeof decl !== 'object') {
    return { status: 'unknown', evidence: 'declaration missing', blocksPublish: true };
  }
  var s = decl.status;
  if (typeof s === 'string' && STATUSES.indexOf(s) !== -1) {
    return { status: s, evidence: 'status from declaration', blocksPublish: isBlocking(s) };
  }
  // Heuristic fallbacks for Chat-Studio-generated assets.
  if (decl.source && /on-device/.test(decl.source)) {
    return { status: 'platform-original', evidence: 'on-device synthesis source string', blocksPublish: false };
  }
  if (decl.kind === 'image' && decl.asset && /^(blob:|data:)/.test(decl.asset)) {
    return { status: 'platform-original', evidence: 'blob:/data: asset url', blocksPublish: false };
  }
  return { status: 'unknown', evidence: 'no status, no source — needs review', blocksPublish: true };
}

function inspectAll(opts) {
  opts = opts || {};
  var db = getDB();
  if (!db) return Promise.resolve({ total: 0, byStatus: {}, blockers: [], scenes: [] });
  return Promise.all([
    db.getAll('scenes', 1000),
    db.getAll('kv', 5000)
  ]).then(function (rows) {
    var scenes = rows[0].map(function (r) { return r.value; }).filter(function (v) { return v && v.sceneId; });
    if (opts.threadId) scenes = scenes.filter(function (s) { return s.threadId === opts.threadId; });
    var byKey = {};
    rows[1].forEach(function (r) { if (typeof r.key === 'string') byKey[r.key] = r.value; });

    var byStatus = {};
    STATUSES.forEach(function (s) { byStatus[s] = 0; });
    var blockers = [];
    var sceneRows = scenes.map(function (sc) {
      var declEntry = byKey['asset-decl-' + sc.sceneId];
      var rightsEntry = byKey['rights-' + sc.sceneId];
      var declarations = (declEntry && Array.isArray(declEntry.declarations)) ? declEntry.declarations.slice() : [];
      // If the rights envelope itself has assetDeclarations and the kv list is empty, use those.
      if (!declarations.length && rightsEntry && Array.isArray(rightsEntry.assetDeclarations)) {
        declarations = rightsEntry.assetDeclarations.slice();
      }
      // If there are still no declarations but the scene clearly references
      // assets, synthesize placeholders so the inspector still flags them.
      if (!declarations.length) {
        if (sc.image) declarations.push({ asset: sc.image, kind: 'image' });
        if (sc.video) declarations.push({ asset: sc.video, kind: 'video' });
        if (sc.audio) declarations.push({ asset: sc.audio, kind: 'audio' });
      }
      var assets = declarations.map(function (d) {
        var c = classifyAsset(d, sc);
        byStatus[c.status] = (byStatus[c.status] || 0) + 1;
        if (c.blocksPublish) blockers.push({ sceneId: sc.sceneId, asset: d.asset || '(no asset id)', status: c.status, reason: c.evidence });
        return { asset: d.asset || '', kind: d.kind || '', source: d.source || '', status: c.status, evidence: c.evidence, blocksPublish: c.blocksPublish };
      });
      var sceneBlocks = assets.some(function (a) { return a.blocksPublish; });
      return { sceneId: sc.sceneId, threadId: sc.threadId || '', assets: assets, sceneBlocksPublish: sceneBlocks };
    });
    var total = sceneRows.reduce(function (n, s) { return n + s.assets.length; }, 0);
    return { total: total, byStatus: byStatus, blockers: blockers, scenes: sceneRows };
  });
}

function blocksPublish(report) {
  if (!report) return true;
  return (report.blockers && report.blockers.length > 0);
}

if (typeof window !== 'undefined') {
  window.LoadRightsInspector = {
    STATUSES: STATUSES.slice(),
    BLOCKING_STATUSES: BLOCKING_STATUSES.slice(),
    classifyAsset: classifyAsset,
    inspectAll: inspectAll,
    blocksPublish: blocksPublish
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STATUSES: STATUSES, BLOCKING_STATUSES: BLOCKING_STATUSES, classifyAsset: classifyAsset, inspectAll: inspectAll, blocksPublish: blocksPublish };
}
})();
