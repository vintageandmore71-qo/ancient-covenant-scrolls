/* Voice Library — shared IndexedDB-backed store of named audio clips.
 *
 * All five ACR apps (ACR, Attain, Attain Jr, Study, Load) live on the
 * same origin, so they all see the same library. Save once in Load's
 * Sound Studio / Voice Manipulator → use anywhere.
 *
 * Public API: window.VoiceLibrary = {
 *   list()                                  -> Promise<[{id,name,durationSec,createdAt,tags,mime,size}]>
 *   get(id)                                 -> Promise<{...meta, blob}>
 *   save(blob, { name, tags?, durationSec?, mime? }) -> Promise<{id}>
 *   rename(id, name)                        -> Promise<void>
 *   remove(id)                              -> Promise<void>
 *   clear()                                 -> Promise<void>
 *   openManager(opts)                       -> opens a manager panel
 * }
 *
 * opts.onPick(item)         called when user taps "Use" on a clip
 * opts.onAddAudioBlob(blob, name) bridge to add to current editor timeline
 */
(function (global) {
  'use strict';
  if (global.VoiceLibrary) return;

  var DB_NAME = 'load-voice-library';
  var DB_VERSION = 1;
  var STORE = 'clips';

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var s = db.createObjectStore(STORE, { keyPath: 'id' });
          s.createIndex('createdAt', 'createdAt');
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function tx(db, mode) { return db.transaction(STORE, mode).objectStore(STORE); }

  function rid() {
    return 'vl-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  async function list() {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var out = [];
      var req = tx(db, 'readonly').openCursor();
      req.onsuccess = function () {
        var c = req.result;
        if (!c) {
          // newest first
          out.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
          resolve(out);
          return;
        }
        var v = c.value;
        out.push({
          id: v.id, name: v.name, tags: v.tags || [],
          durationSec: v.durationSec || 0, createdAt: v.createdAt || 0,
          mime: v.mime || 'audio/wav', size: (v.blob && v.blob.size) || 0
        });
        c.continue();
      };
      req.onerror = function () { reject(req.error); };
    });
  }
  async function get(id) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var req = tx(db, 'readonly').get(id);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
    });
  }
  async function save(blob, meta) {
    if (!(blob instanceof Blob)) throw new Error('save() requires a Blob');
    meta = meta || {};
    var db = await openDb();
    var rec = {
      id: rid(),
      name: meta.name || ('Voice clip ' + new Date().toLocaleString()),
      tags: meta.tags || [],
      durationSec: meta.durationSec || 0,
      mime: meta.mime || blob.type || 'audio/wav',
      createdAt: Date.now(),
      blob: blob
    };
    return new Promise(function (resolve, reject) {
      var req = tx(db, 'readwrite').add(rec);
      req.onsuccess = function () { resolve({ id: rec.id }); };
      req.onerror = function () { reject(req.error); };
    });
  }
  async function rename(id, name) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var store = tx(db, 'readwrite');
      var g = store.get(id);
      g.onsuccess = function () {
        var rec = g.result; if (!rec) { reject(new Error('not found')); return; }
        rec.name = name;
        var p = store.put(rec);
        p.onsuccess = function () { resolve(); };
        p.onerror = function () { reject(p.error); };
      };
      g.onerror = function () { reject(g.error); };
    });
  }
  async function remove(id) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var req = tx(db, 'readwrite').delete(id);
      req.onsuccess = function () { resolve(); };
      req.onerror = function () { reject(req.error); };
    });
  }
  async function clear() {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var req = tx(db, 'readwrite').clear();
      req.onsuccess = function () { resolve(); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function fmtBytes(n) {
    if (!n && n !== 0) return '?';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }
  function fmtDate(t) {
    try { return new Date(t).toLocaleString(); } catch (_) { return ''; }
  }

  function openManager(opts) {
    opts = opts || {};
    var prev = document.getElementById('vl-modal');
    if (prev) prev.remove();
    var modal = document.createElement('div');
    modal.id = 'vl-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,20,0.78);z-index:9550;display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML =
      '<div style="background:#1a1a26;color:#fff;border-radius:18px;width:100%;max-width:680px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.55);border:1px solid #2a2a40;overflow:hidden;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #2a2a40;flex-shrink:0;">' +
          '<h2 style="margin:0;font-size:18px;font-weight:800;">📚 Voice Library</h2>' +
          '<button id="vl-close" style="background:transparent;border:none;color:#cfcfdc;font-size:24px;cursor:pointer;line-height:1;">×</button>' +
        '</div>' +
        '<p style="margin:0;padding:10px 18px;color:#a8a8c4;font-size:12px;">Saved here once → available across ACR, Attain, Attain Jr, Study, and Load on this device.</p>' +
        '<div id="vl-list" style="overflow-y:auto;padding:10px 18px;flex:1;"></div>' +
        '<div style="padding:12px 18px;border-top:1px solid #2a2a40;display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0;">' +
          '<button id="vl-import" style="background:#2a2a40;color:#fff;border:none;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;">📂 Import audio file</button>' +
          '<input id="vl-import-file" type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac,.aiff,.aif,.webm,.weba,.opus" style="display:none;">' +
          '<div style="flex:1;"></div>' +
          '<button id="vl-clear" style="background:transparent;color:#ff6b8a;border:1px solid #2a2a40;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;">🗑 Clear all</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    var listEl = modal.querySelector('#vl-list');
    var audio = null;
    function stopAudio() { try { if (audio) { audio.pause(); audio = null; } } catch (_) {} }

    function close() { stopAudio(); try { modal.remove(); } catch (_) {} }
    modal.querySelector('#vl-close').addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

    async function refresh() {
      listEl.innerHTML = '<p style="color:#a8a8c4;font-size:13px;">Loading…</p>';
      try {
        var items = await list();
        if (!items.length) {
          listEl.innerHTML = '<p style="color:#a8a8c4;font-size:13px;">No saved voices yet. Record one in Sound Studio or Voice Manipulator and tap 💾 Save to Library.</p>';
          return;
        }
        listEl.innerHTML = '';
        items.forEach(function (it) {
          var row = document.createElement('div');
          row.style.cssText = 'background:#0e0e18;border:1px solid #2a2a40;border-radius:12px;padding:10px 12px;margin-bottom:8px;';
          row.innerHTML =
            '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
              '<strong style="flex:1;min-width:140px;font-size:14px;">' + escHtml(it.name) + '</strong>' +
              '<span style="font-size:11px;color:#a8a8c4;font-variant-numeric:tabular-nums;">' + (it.durationSec ? it.durationSec.toFixed(1) + 's · ' : '') + fmtBytes(it.size) + ' · ' + fmtDate(it.createdAt) + '</span>' +
            '</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">' +
              '<button data-vl-act="play"   data-id="' + it.id + '" style="background:#22c55e;color:#0a0a14;border:none;border-radius:8px;padding:7px 12px;font-weight:700;cursor:pointer;">▶ Play</button>' +
              '<button data-vl-act="stop"   data-id="' + it.id + '" style="background:#2a2a40;color:#fff;border:none;border-radius:8px;padding:7px 12px;font-weight:700;cursor:pointer;">■</button>' +
              '<button data-vl-act="add"    data-id="' + it.id + '" style="background:#1d6fff;color:#fff;border:none;border-radius:8px;padding:7px 12px;font-weight:700;cursor:pointer;">＋ Add to timeline</button>' +
              '<button data-vl-act="save"   data-id="' + it.id + '" style="background:#fbbf24;color:#1a1a26;border:none;border-radius:8px;padding:7px 12px;font-weight:700;cursor:pointer;">💾 Download</button>' +
              '<button data-vl-act="rename" data-id="' + it.id + '" style="background:transparent;color:#cfcfdc;border:1px solid #2a2a40;border-radius:8px;padding:7px 10px;cursor:pointer;">✎</button>' +
              '<button data-vl-act="delete" data-id="' + it.id + '" style="background:transparent;color:#ff6b8a;border:1px solid #2a2a40;border-radius:8px;padding:7px 10px;cursor:pointer;">🗑</button>' +
            '</div>';
          listEl.appendChild(row);
        });
        Array.prototype.forEach.call(listEl.querySelectorAll('[data-vl-act]'), function (b) {
          b.addEventListener('click', function () { return onRowAction(b.getAttribute('data-vl-act'), b.getAttribute('data-id')); });
        });
      } catch (e) {
        listEl.innerHTML = '<p style="color:#ff6b8a;font-size:13px;">Library failed to load: ' + escHtml((e && e.message) || e) + '</p>';
      }
    }

    async function onRowAction(act, id) {
      try {
        if (act === 'play') {
          var rec = await get(id); if (!rec) return;
          stopAudio();
          audio = new Audio(URL.createObjectURL(rec.blob));
          audio.volume = 1; audio.muted = false;
          await audio.play();
        } else if (act === 'stop') {
          stopAudio();
        } else if (act === 'add') {
          if (typeof opts.onAddAudioBlob !== 'function') {
            alert('Open a video in the editor first to add audio to its timeline.');
            return;
          }
          var rec2 = await get(id); if (!rec2) return;
          opts.onAddAudioBlob(rec2.blob, rec2.name || 'voice');
          close();
        } else if (act === 'save') {
          var rec3 = await get(id); if (!rec3) return;
          var ext = (rec3.mime && rec3.mime.indexOf('mp4') >= 0) ? '.m4a'
                  : (rec3.mime && rec3.mime.indexOf('webm') >= 0) ? '.webm'
                  : '.wav';
          var a = document.createElement('a');
          a.href = URL.createObjectURL(rec3.blob);
          a.download = (rec3.name || 'voice').replace(/[^\w\-]+/g, '_') + ext;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
        } else if (act === 'rename') {
          var newName = prompt('Rename voice clip:');
          if (newName && newName.trim()) { await rename(id, newName.trim()); refresh(); }
        } else if (act === 'delete') {
          if (!confirm('Delete this voice clip from your library?')) return;
          await remove(id);
          refresh();
        }
      } catch (e) {
        alert('Action failed: ' + ((e && e.message) || e));
      }
    }

    modal.querySelector('#vl-import').addEventListener('click', function () { modal.querySelector('#vl-import-file').click(); });
    modal.querySelector('#vl-import-file').addEventListener('change', async function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      try {
        var dur = 0;
        try {
          var ctx = new (window.AudioContext || window.webkitAudioContext)();
          var ab = await f.arrayBuffer();
          var buf = await ctx.decodeAudioData(ab.slice(0));
          dur = buf.duration;
          try { ctx.close(); } catch (_) {}
        } catch (_) {}
        await save(f, { name: f.name.replace(/\.[^.]+$/, ''), durationSec: dur, mime: f.type });
        refresh();
      } catch (err) {
        alert('Import failed: ' + ((err && err.message) || err));
      }
      e.target.value = '';
    });
    modal.querySelector('#vl-clear').addEventListener('click', async function () {
      if (!confirm('Delete ALL saved voice clips? This can\'t be undone.')) return;
      await clear(); refresh();
    });

    function escHtml(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    refresh();
  }

  global.VoiceLibrary = {
    list: list, get: get, save: save, rename: rename, remove: remove, clear: clear,
    openManager: openManager
  };
})(typeof window !== 'undefined' ? window : globalThis);
