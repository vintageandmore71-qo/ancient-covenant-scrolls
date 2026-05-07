// Load — Project Memory database (X-DB Phase 1)
//
// Layer 2 of the 8-layer Load-owned AI OS. IndexedDB wrapper that
// owns every persistent record produced by Load AI Core, the
// Prompt Engine, the Output Manager, and the Package Engine.
//
// Phase 1 scope: open + CRUD + audit. Existing Load features that
// already use their own IDB (imported apps in 'load-apps') are
// untouched. This DB is additive, name 'load-projects', so nothing
// existing breaks.
//
// Public API:
//   window.LoadDB.STORES                          - store ids
//   window.LoadDB.open()                          -> Promise<IDB>
//   window.LoadDB.put(store, key, value)          -> Promise
//   window.LoadDB.get(store, key)                 -> Promise<value>
//   window.LoadDB.getAll(store, limit?)           -> Promise<[{key,value}]>
//   window.LoadDB.count(store)                    -> Promise<number>
//   window.LoadDB.delete(store, key)              -> Promise
//   window.LoadDB.clear(store)                    -> Promise
//   window.LoadDB.summary()                       -> Promise<{ name, version, stores: { id: count } }>
//   window.LoadDB.exportAll()                     -> Promise<{ ... full snapshot ... }>

(function () {
'use strict';

var DB_NAME = 'load-projects';
var DB_VERSION = 1;

var STORES = [
  'projects',         // { id, title, createdAt, updatedAt, kind, ... }
  'scenes',           // spec-shaped scenes (14 audio fields)
  'prompts',          // structured prompts (visual/motion/sound/...)
  'generations',      // generation attempts (success/failure, provider, ms)
  'audio_assets',     // audio blobs / refs
  'video_assets',     // video blobs / refs
  'image_assets',     // image blobs / refs
  'exports',          // export receipts
  'debug_reports',    // saved Site Debugger reports
  'kv'                // misc key-value (settings cache, last route, etc.)
];

var _dbPromise = null;

function open() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise(function (resolve, reject) {
    if (!window.indexedDB) { reject(new Error('IndexedDB not available')); return; }
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      STORES.forEach(function (s) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
      });
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error || new Error('open failed')); };
  });
  return _dbPromise;
}

function tx(store, mode) {
  return open().then(function (db) {
    var t = db.transaction(store, mode);
    return { tx: t, store: t.objectStore(store) };
  });
}

function put(store, key, value) {
  if (STORES.indexOf(store) === -1) return Promise.reject(new Error('unknown store: ' + store));
  return tx(store, 'readwrite').then(function (h) {
    return new Promise(function (resolve, reject) {
      var r = h.store.put(value, key);
      r.onsuccess = function () { resolve(true); };
      r.onerror = function () { reject(r.error); };
    });
  });
}

function get(store, key) {
  return tx(store, 'readonly').then(function (h) {
    return new Promise(function (resolve, reject) {
      var r = h.store.get(key);
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  });
}

function getAll(store, limit) {
  return tx(store, 'readonly').then(function (h) {
    return new Promise(function (resolve, reject) {
      var out = [];
      var req = h.store.openCursor(null, 'prev');
      req.onsuccess = function () {
        var c = req.result;
        if (!c) return resolve(out);
        out.push({ key: c.key, value: c.value });
        if (limit && out.length >= limit) return resolve(out);
        c.continue();
      };
      req.onerror = function () { reject(req.error); };
    });
  });
}

function count(store) {
  return tx(store, 'readonly').then(function (h) {
    return new Promise(function (resolve, reject) {
      var r = h.store.count();
      r.onsuccess = function () { resolve(r.result || 0); };
      r.onerror = function () { reject(r.error); };
    });
  });
}

function del(store, key) {
  return tx(store, 'readwrite').then(function (h) {
    return new Promise(function (resolve, reject) {
      var r = h.store.delete(key);
      r.onsuccess = function () { resolve(true); };
      r.onerror = function () { reject(r.error); };
    });
  });
}

function clearStore(store) {
  return tx(store, 'readwrite').then(function (h) {
    return new Promise(function (resolve, reject) {
      var r = h.store.clear();
      r.onsuccess = function () { resolve(true); };
      r.onerror = function () { reject(r.error); };
    });
  });
}

function summary() {
  return Promise.all(STORES.map(function (s) {
    return count(s).then(function (n) { return [s, n]; }).catch(function () { return [s, -1]; });
  })).then(function (pairs) {
    var stores = {};
    pairs.forEach(function (p) { stores[p[0]] = p[1]; });
    return { name: DB_NAME, version: DB_VERSION, stores: stores };
  });
}

function exportAll(perStoreLimit) {
  var lim = perStoreLimit || 500;
  return Promise.all(STORES.map(function (s) {
    return getAll(s, lim).then(function (rows) { return [s, rows]; }).catch(function () { return [s, []]; });
  })).then(function (pairs) {
    var out = { name: DB_NAME, version: DB_VERSION, generatedAt: new Date().toISOString(), stores: {} };
    pairs.forEach(function (p) { out.stores[p[0]] = p[1]; });
    return out;
  });
}

if (typeof window !== 'undefined') {
  window.LoadDB = {
    STORES: STORES.slice(),
    NAME: DB_NAME,
    VERSION: DB_VERSION,
    open: open,
    put: put,
    get: get,
    getAll: getAll,
    count: count,
    delete: del,
    clear: clearStore,
    summary: summary,
    exportAll: exportAll
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STORES: STORES, NAME: DB_NAME, VERSION: DB_VERSION };
}
})();
