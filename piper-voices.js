/* Piper neural voices — shared glue for ACR main, ACR Study, Attain.
 * Copyright (c) 2026 LBond. All Rights Reserved.
 *
 * One source file, copied into each app's build. Every distributable
 * stays self-contained — nothing is fetched at runtime between apps.
 *
 * What this does:
 *  - Exposes window.PiperVoices with a tiny API (isSupported, list,
 *    installVoice, speak, cancel, onStateChange).
 *  - Lazy-imports the piper-tts-web package from jsDelivr on first use.
 *  - Caches each voice model (~20 MB .onnx + config) in IndexedDB so
 *    subsequent runs are fully offline.
 *  - Degrades gracefully: if the runtime or model download fails, the
 *    host app keeps using Web Speech Synthesis. Nothing breaks.
 *
 * The heavy bits (piper-tts-web runtime + voice models) are NOT
 * bundled. They download on the first "Install voice" tap in Settings
 * and are cached for offline use after.
 */
(function (global) {
  'use strict';

  // Keep the public shape small and stable across apps.
  var PiperVoices = {
    isSupported: isSupported,
    listVoices: listVoices,
    installedVoices: installedVoices,
    installVoice: installVoice,
    removeVoice: removeVoice,
    speak: speak,
    cancel: cancel,
    isSpeaking: function () { return !!(audioEl && !audioEl.paused); },
    onStateChange: function (fn) { stateListeners.push(fn); }
  };

  // Curated default voices — a small set so the picker stays readable.
  // Each voice is identified by `id` (matches piper-tts-web conventions).
  // Users can add more by editing this array in the copy shipped with
  // each app; no UI for that yet.
  var VOICES = [
    { id: 'en_US-amy-medium',     label: 'Amy (US, medium)',     mb: 63 },
    { id: 'en_US-lessac-medium',  label: 'Lessac (US, medium)',  mb: 63 },
    { id: 'en_US-ryan-medium',    label: 'Ryan (US, medium)',    mb: 63 },
    { id: 'en_GB-alan-medium',    label: 'Alan (UK, medium)',    mb: 63 },
    { id: 'en_GB-jenny_dioco-medium', label: 'Jenny (UK, medium)', mb: 63 }
  ];

  var DB_NAME = 'piper-voices-v1';
  var STORE = 'voices';
  var dbPromise = null;
  var runtimePromise = null;
  var audioEl = null;
  var currentTts = null;   // the piper-tts-web instance
  var stateListeners = [];

  function isSupported() {
    // Piper runs via WebAssembly. iPad Safari supports WASM since iOS
    // 11, but audio playback + OPFS behave inconsistently in old
    // versions. We check the bare minimum and let graceful fallback
    // handle the rest.
    return typeof WebAssembly !== 'undefined' && typeof indexedDB !== 'undefined';
  }

  function notify(state, detail) {
    stateListeners.forEach(function (fn) { try { fn(state, detail); } catch (_) {} });
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  async function dbGet(id) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readonly');
      var req = tx.objectStore(STORE).get(id);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
    });
  }
  async function dbPut(record) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }
  async function dbDelete(id) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }
  async function dbKeys() {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readonly');
      var req = tx.objectStore(STORE).getAllKeys();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function listVoices() { return VOICES.slice(); }

  async function installedVoices() {
    try { return await dbKeys(); }
    catch (_) { return []; }
  }

  async function loadRuntime() {
    if (runtimePromise) return runtimePromise;
    runtimePromise = (async function () {
      notify('loading-runtime');
      // piper-tts-web from the unofficial-but-maintained port on npm.
      // jsDelivr mirrors it; import() with a URL works in modern Safari.
      var mod = await import('https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.4/dist/index.mjs');
      return mod;
    })();
    return runtimePromise;
  }

  async function fetchWithProgress(url, onProgress) {
    var resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to download ' + url + ' (HTTP ' + resp.status + ')');
    var total = +resp.headers.get('content-length') || 0;
    var reader = resp.body.getReader();
    var chunks = [];
    var received = 0;
    while (true) {
      var step = await reader.read();
      if (step.done) break;
      chunks.push(step.value);
      received += step.value.length;
      if (total && typeof onProgress === 'function') {
        onProgress(Math.round(received / total * 100));
      }
    }
    var blob = new Blob(chunks);
    return await blob.arrayBuffer();
  }

  async function installVoice(voiceId, onProgress) {
    if (!isSupported()) throw new Error('Piper is not supported on this device.');
    var voice = VOICES.find(function (v) { return v.id === voiceId; });
    if (!voice) throw new Error('Unknown voice: ' + voiceId);
    var existing = await dbGet(voiceId).catch(function () { return null; });
    if (existing) return existing;
    notify('installing-voice', { voiceId: voiceId, progress: 0 });
    // Piper voice bundles live on HuggingFace's Piper voices space.
    // The onnx + json pair is the full voice.
    var base = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/' +
      (voiceId.startsWith('en_US') ? 'en_US' : 'en_GB') + '/' +
      voiceId.split('-')[1] + '/' + voiceId.split('-')[2] + '/' + voiceId;
    // Download in parallel so small json doesn't wait on large onnx
    var [onnxBuf, configBuf] = await Promise.all([
      fetchWithProgress(base + '.onnx', function (p) { notify('installing-voice', { voiceId: voiceId, progress: p }); }),
      fetchWithProgress(base + '.onnx.json')
    ]);
    var record = {
      id: voiceId,
      onnx: onnxBuf,
      config: new TextDecoder().decode(configBuf),
      installedAt: Date.now()
    };
    await dbPut(record);
    notify('voice-installed', { voiceId: voiceId });
    return record;
  }

  async function removeVoice(voiceId) {
    await dbDelete(voiceId);
    notify('voice-removed', { voiceId: voiceId });
  }

  async function ensureTts(voiceId) {
    var rec = await dbGet(voiceId);
    if (!rec) throw new Error('Voice not installed: ' + voiceId);
    var mod = await loadRuntime();
    // piper-tts-web exposes TtsSession.create(...) in the current port.
    // If the API differs in a particular version we bail out and let
    // the host app fall back to Web Speech.
    if (mod && typeof mod.TtsSession === 'function' && typeof mod.TtsSession.create === 'function') {
      var session = await mod.TtsSession.create({
        voiceId: voiceId,
        progress: function (p) { notify('loading-voice', p); },
        wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/'
      });
      return session;
    }
    throw new Error('Piper runtime did not expose the expected API');
  }

  async function speak(text, voiceId, opts) {
    opts = opts || {};
    if (!text || !voiceId) return;
    cancel();
    notify('synthesizing', { voiceId: voiceId });
    try {
      if (!currentTts || currentTts.voiceId !== voiceId) {
        currentTts = await ensureTts(voiceId);
        currentTts.voiceId = voiceId;
      }
      var blob = await currentTts.predict(String(text).slice(0, 8000));
      // Play via a reusable <audio> element so pause/resume/cancel work.
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.addEventListener('ended', function () { notify('ended'); });
        audioEl.addEventListener('error', function () { notify('error'); });
      }
      if (typeof opts.rate === 'number')   audioEl.playbackRate = opts.rate;
      if (typeof opts.volume === 'number') audioEl.volume = opts.volume;
      var url = URL.createObjectURL(blob);
      audioEl.src = url;
      await audioEl.play();
      notify('playing');
      // Revoke the URL after playback ends to avoid leaking memory.
      audioEl.onended = function () {
        URL.revokeObjectURL(url);
        notify('ended');
        if (typeof opts.onend === 'function') opts.onend();
      };
    } catch (e) {
      notify('error', { message: String(e.message || e) });
      if (typeof opts.onerror === 'function') opts.onerror(e);
      throw e;
    }
  }

  function cancel() {
    try {
      if (audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
      }
    } catch (_) {}
    notify('cancelled');
  }

  // Publish
  global.PiperVoices = PiperVoices;

})(typeof window !== 'undefined' ? window : this);
