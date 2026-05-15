// load-asset-registry.js
// Production asset registry for Load Studio.
// window.LoadAssetRegistry — never stores or exports API keys or auth tokens.
// Assets stored in localStorage. blobUrl objects are session-only.

(function () {
'use strict';

var _STORAGE_KEY = 'lar_assets_v1';

// ─── SCHEMA CONSTANTS ────────────────────────────────────────────────────────
var ASSET_TYPES = ['image','video','audio','subtitle','font','script','cover','other'];

var PRODUCTION_STATUSES = [
  'draft',
  'approved',
  'rejected',
  'needs-upscale',
  'needs-subtitle-timing',
  'continuity-mismatch',
  'pending-render'
];

var RIGHTS_STATUSES = [
  'creator-owned',
  'user-imported',
  'generated',
  'public-domain',
  'licensed',
  'restricted',
  'unknown'
];

// Pipeline-aware groups
var ASSET_GROUPS = [
  'imported',
  'generated-images',
  'approved-takes',
  'rejected-takes',
  'upscaled',
  'bg-removed',
  'audio-stems',
  'subtitles',
  'music',
  'sfx',
  'scripts',
  'covers',
  'other'
];

var GROUP_LABELS = {
  'imported':         'Imported',
  'generated-images': 'Generated Images',
  'approved-takes':   'Approved Takes',
  'rejected-takes':   'Rejected Takes',
  'upscaled':         'Upscaled',
  'bg-removed':       'Background Removed',
  'audio-stems':      'Audio Stems',
  'subtitles':        'Subtitles',
  'music':            'Music',
  'sfx':              'Sound FX',
  'scripts':          'Scripts',
  'covers':           'Covers',
  'other':            'Other'
};

// ─── RUNTIME STATE ────────────────────────────────────────────────────────────
var _assets = [];   // Array of asset objects

// ─── STORAGE ─────────────────────────────────────────────────────────────────
function _load() {
  try {
    var raw = localStorage.getItem(_STORAGE_KEY);
    if (raw) _assets = JSON.parse(raw);
    if (!Array.isArray(_assets)) _assets = [];
  } catch (_) { _assets = []; }
}

function _persist() {
  // Strip blobUrl before persisting — blob objects are session-only
  var safe = _assets.map(function (a) {
    var copy = Object.assign({}, a);
    if (copy.blobUrl && copy.blobUrl.indexOf('blob:') === 0) delete copy.blobUrl;
    return copy;
  });
  try { localStorage.setItem(_STORAGE_KEY, JSON.stringify(safe)); } catch (_) {}
}

// ─── GROUP ASSIGNMENT ─────────────────────────────────────────────────────────
function _resolveGroup(asset) {
  var type   = asset.assetType || 'other';
  var src    = asset.source    || 'imported';
  var status = asset.productionStatus || 'draft';
  var tags   = asset.tags || [];

  if (type === 'subtitle')                                    return 'subtitles';
  if (type === 'script')                                      return 'scripts';
  if (type === 'cover')                                       return 'covers';
  if (status === 'rejected')                                  return 'rejected-takes';
  if (status === 'approved' && (type === 'video' || type === 'image')) return 'approved-takes';
  if (tags.indexOf('bg-removed') >= 0)                        return 'bg-removed';
  if (tags.indexOf('upscaled') >= 0 || status === 'needs-upscale') return 'upscaled';
  if (type === 'audio' && tags.indexOf('stem') >= 0)          return 'audio-stems';
  if (type === 'audio' && tags.indexOf('sfx') >= 0)           return 'sfx';
  if (type === 'audio' && (tags.indexOf('music') >= 0 || src === 'library')) return 'music';
  if (type === 'image' && src === 'generated')                return 'generated-images';
  if (src === 'imported' || src === 'user-imported')          return 'imported';
  return 'other';
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────
function _validate(asset) {
  if (!asset || typeof asset !== 'object')         return 'Asset must be an object.';
  if (!asset.name || typeof asset.name !== 'string') return 'Asset name is required.';
  if (asset.assetType && ASSET_TYPES.indexOf(asset.assetType) < 0)
    return 'Invalid assetType: ' + asset.assetType;
  if (asset.productionStatus && PRODUCTION_STATUSES.indexOf(asset.productionStatus) < 0)
    return 'Invalid productionStatus: ' + asset.productionStatus;
  if (asset.rightsStatus && RIGHTS_STATUSES.indexOf(asset.rightsStatus) < 0)
    return 'Invalid rightsStatus: ' + asset.rightsStatus;
  return null;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────
var LoadAssetRegistry = {

  ASSET_TYPES:         ASSET_TYPES,
  PRODUCTION_STATUSES: PRODUCTION_STATUSES,
  RIGHTS_STATUSES:     RIGHTS_STATUSES,
  ASSET_GROUPS:        ASSET_GROUPS,
  GROUP_LABELS:        GROUP_LABELS,

  // Add a new asset. Returns the created asset or throws on validation error.
  // blobUrl is accepted but not persisted across sessions.
  addAsset: function (fields) {
    var err = _validate(fields);
    if (err) throw new Error('LoadAssetRegistry.addAsset: ' + err);

    var now = new Date().toISOString();
    var asset = {
      assetId:           'asset-' + Date.now() + '-' + Math.floor(Math.random() * 9999),
      assetType:         fields.assetType        || 'other',
      name:              fields.name,
      source:            fields.source           || 'imported',
      providerId:        fields.providerId        || null,
      pipelineId:        fields.pipelineId        || null,
      sceneId:           fields.sceneId           || null,
      characterIds:      fields.characterIds      || [],
      wardrobeIds:       fields.wardrobeIds        || [],
      propIds:           fields.propIds           || [],
      locationId:        fields.locationId        || null,
      rightsStatus:      fields.rightsStatus      || 'unknown',
      commercialSafe:    fields.commercialSafe    != null ? !!fields.commercialSafe : null,
      continuityStatus:  fields.continuityStatus  || null,
      productionStatus:  fields.productionStatus  || 'draft',
      createdAt:         fields.createdAt         || now,
      blobUrl:           fields.blobUrl           || null,
      filePath:          fields.filePath          || null,
      thumbnailUrl:      fields.thumbnailUrl      || null,
      mimeType:          fields.mimeType          || null,
      width:             fields.width             || null,
      height:            fields.height            || null,
      duration:          fields.duration          || null,
      fileSize:          fields.fileSize          || null,
      tags:              fields.tags              || [],
      notes:             fields.notes             || ''
    };
    // Never store API keys — scrub any accidentally passed fields
    delete asset.apiKey; delete asset.token; delete asset.secret;

    asset.group = _resolveGroup(asset);
    _assets.push(asset);
    _persist();
    return Object.assign({}, asset);
  },

  // Update fields on an existing asset by assetId.
  updateAsset: function (assetId, updates) {
    var idx = _assets.findIndex(function (a) { return a.assetId === assetId; });
    if (idx < 0) throw new Error('LoadAssetRegistry.updateAsset: not found: ' + assetId);
    // Never allow key fields to be updated via updates
    delete updates.apiKey; delete updates.token; delete updates.secret;
    Object.assign(_assets[idx], updates);
    _assets[idx].group = _resolveGroup(_assets[idx]);
    _persist();
    return Object.assign({}, _assets[idx]);
  },

  removeAsset: function (assetId) {
    var before = _assets.length;
    _assets = _assets.filter(function (a) { return a.assetId !== assetId; });
    if (_assets.length === before) throw new Error('LoadAssetRegistry.removeAsset: not found: ' + assetId);
    _persist();
  },

  getAsset: function (assetId) {
    var a = _assets.filter(function (a) { return a.assetId === assetId; })[0];
    return a ? Object.assign({}, a) : null;
  },

  listAssets: function () {
    return _assets.map(function (a) { return Object.assign({}, a); });
  },

  listByType: function (assetType) {
    return _assets.filter(function (a) { return a.assetType === assetType; }).map(function (a) { return Object.assign({}, a); });
  },

  listByGroup: function (group) {
    return _assets.filter(function (a) { return a.group === group; }).map(function (a) { return Object.assign({}, a); });
  },

  listByPipeline: function (pipelineId) {
    return _assets.filter(function (a) { return a.pipelineId === pipelineId; }).map(function (a) { return Object.assign({}, a); });
  },

  listByStatus: function (productionStatus) {
    return _assets.filter(function (a) { return a.productionStatus === productionStatus; }).map(function (a) { return Object.assign({}, a); });
  },

  listByScene: function (sceneId) {
    return _assets.filter(function (a) { return a.sceneId === sceneId; }).map(function (a) { return Object.assign({}, a); });
  },

  listCommercialSafe: function () {
    return _assets.filter(function (a) { return a.commercialSafe === true; }).map(function (a) { return Object.assign({}, a); });
  },

  searchAssets: function (query) {
    if (!query) return this.listAssets();
    var q = query.toLowerCase();
    return _assets.filter(function (a) {
      return (a.name || '').toLowerCase().indexOf(q) >= 0 ||
             (a.assetType || '').indexOf(q) >= 0 ||
             (a.group || '').indexOf(q) >= 0 ||
             (a.tags || []).some(function (t) { return t.toLowerCase().indexOf(q) >= 0; });
    }).map(function (a) { return Object.assign({}, a); });
  },

  // Returns all assets grouped by pipeline group. Empty groups are omitted.
  groupedAssets: function () {
    var out = {};
    _assets.forEach(function (a) {
      var g = a.group || 'other';
      out[g] = out[g] || [];
      out[g].push(Object.assign({}, a));
    });
    return out;
  },

  // Summary counts per group and status.
  summary: function () {
    var byGroup = {}, byStatus = {}, byType = {};
    _assets.forEach(function (a) {
      var g = a.group || 'other';
      var s = a.productionStatus || 'draft';
      var t = a.assetType || 'other';
      byGroup[g]  = (byGroup[g]  || 0) + 1;
      byStatus[s] = (byStatus[s] || 0) + 1;
      byType[t]   = (byType[t]   || 0) + 1;
    });
    return { total: _assets.length, byGroup: byGroup, byStatus: byStatus, byType: byType };
  },

  // Export a manifest for CinePWA packaging. Never includes blobUrl or keys.
  exportManifest: function () {
    return {
      exportedAt: new Date().toISOString(),
      total: _assets.length,
      assets: _assets.map(function (a) {
        var copy = Object.assign({}, a);
        delete copy.blobUrl;
        delete copy.apiKey; delete copy.token; delete copy.secret;
        return copy;
      })
    };
  },

  // Register an asset from a provider result (e.g. from LoadProviderRegistry.generateImage).
  // result is the normalizeResult() output from LoadProviderRegistry.
  registerProviderResult: function (result, overrides) {
    if (!result || !result.ok) throw new Error('registerProviderResult: result is not ok');
    var typeMap = { 'image': 'image', 'audio': 'audio', 'audio-preview': 'audio', 'video-job': 'video', 'transcript': 'subtitle' };
    var assetType = typeMap[result.type] || 'other';
    var pipelineId = null;
    if (result.provider && typeof window.LoadProviderRegistry !== 'undefined') {
      var membership = window.LoadProviderRegistry.getPipelineMembership(result.provider);
      if (membership && membership.length) pipelineId = membership[0];
    }
    return this.addAsset(Object.assign({
      name:          result.provider + '-' + result.type + '-' + Date.now(),
      assetType:     assetType,
      source:        'generated',
      providerId:    result.provider || null,
      pipelineId:    pipelineId,
      rightsStatus:  'generated',
      commercialSafe: null,
      productionStatus: 'draft',
      blobUrl:       result.url   || null,
      filePath:      result.url   || null,
      notes:         result.type === 'video-job' ? 'Job ID: ' + (result.jobId || '') : ''
    }, overrides || {}));
  }
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
_load();
window.LoadAssetRegistry = LoadAssetRegistry;

})();
