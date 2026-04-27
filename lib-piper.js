/* Shared Piper TTS engine for all ACR apps — Load, Attain, Attain Jr,
 * Study, ACR Reader. Loaded as <script src="/lib-piper.js"> (or relative).
 *
 * All five apps live on the same origin (dssorit.github.io) so the
 * underlying voice file cached by @mintplex-labs/piper-tts-web (which
 * uses Origin Private File System) is shared automatically — first
 * app to install pays the download once, every other app reads from
 * the local cache.
 *
 * Public surface: window.LoadPiper = { isSupported, isCached, install,
 * uninstall, say, stop, isEnabled, setEnabled, voices, DEFAULT_VOICE }
 *
 * Stage 1 ships a single-voice setup (en_US-amy-low, ~30 MB). Stage 4
 * swaps in the LibriTTS multi-speaker model for character voices in
 * Attain Jr; the API surface (say(text, { speakerId })) is already
 * future-proofed for that.
 */
(function (global) {
  'use strict';

  // Single-voice MVP. Multi-speaker LibriTTS (904 speakers in one
  // 80 MB file) lands in Stage 4 alongside Attain Jr's character voice
  // assignment UI.
  var DEFAULT_VOICE = 'en_US-amy-low';

  // Pinned version of @mintplex-labs/piper-tts-web served as ESM via
  // esm.sh — works inside a regular non-module <script> through
  // dynamic import() (supported on iPad Safari 16+).
  var TTS_LIB_URL = 'https://esm.sh/@mintplex-labs/piper-tts-web@1.0.4';

  var LS_ENABLED = 'load_piper_enabled_v1';

  var tts = null;          // resolved lib once first import completes
  var loadPromise = null;  // shared in-flight import promise
  var libBust = 0;         // bumped after uninstall to bypass JS module cache
  var audioCtx = null;     // shared AudioContext (created on first user gesture)
  var currentSource = null;// last AudioBufferSourceNode; stopAll() stops it

  function getAudioContext() {
    if (audioCtx) return audioCtx;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try { audioCtx = new Ctor(); } catch (_) { return null; }
    return audioCtx;
  }

  async function ensureLib() {
    if (tts) return tts;
    if (!loadPromise) {
      loadPromise = (async function () {
        // Append a cache-buster after uninstall so the runtime doesn't
        // hand us back a stale module instance whose internal index
        // still points at OPFS files we already deleted. esm.sh
        // ignores unknown query params and serves the same content.
        var url = TTS_LIB_URL + (libBust > 0 ? '?_bust=' + libBust : '');
        tts = await import(url);
        return tts;
      })();
    }
    return loadPromise;
  }

  // Verify the install actually landed something usable on disk.
  // The library's stored() can lie after a manual sweep; this
  // walks OPFS, finds piper-shaped files, and validates the
  // config JSON parses. Returns { ok, reason }.
  async function verifyInstall() {
    if (!navigator.storage || typeof navigator.storage.getDirectory !== 'function') {
      return { ok: false, reason: 'OPFS not available on this device' };
    }
    try {
      var root = await navigator.storage.getDirectory();
      if (typeof root.entries !== 'function') {
        // Older Safari — can't enumerate; trust stored()
        try {
          var libCheck = await ensureLib();
          var s = await libCheck.stored();
          if (Array.isArray(s) && s.indexOf(DEFAULT_VOICE) !== -1) return { ok: true };
        } catch (_) {}
        return { ok: false, reason: 'Cannot enumerate OPFS on this Safari' };
      }
      // Find candidate model + config files
      var modelOk = false, configOk = false, configBytes = 0;
      async function walk(dir) {
        for await (var entry of dir.entries()) {
          var name = entry[0], handle = entry[1];
          if (handle.kind === 'file') {
            var lower = name.toLowerCase();
            if (lower.indexOf('.onnx.json') !== -1) {
              try {
                var f = await handle.getFile();
                configBytes = f.size;
                if (f.size < 10) continue;
                var txt = await f.text();
                if (!txt || txt.length < 10) continue;
                var first = txt.charAt(0), last = txt.charAt(txt.length - 1);
                if ((first !== '{' && first !== '[') || (last !== '}' && last !== ']')) continue;
                JSON.parse(txt); // throws if invalid
                configOk = true;
              } catch (_) { /* keep looking */ }
            } else if (/\.onnx$/.test(lower)) {
              try {
                var mf = await handle.getFile();
                if (mf.size > 100000) modelOk = true;
              } catch (_) {}
            }
          } else if (handle.kind === 'directory') {
            try { await walk(handle); } catch (_) {}
          }
        }
      }
      await walk(root);
      if (!modelOk) return { ok: false, reason: 'voice model file not found or too small' };
      if (!configOk) return { ok: false, reason: 'voice config JSON missing or unreadable (' + configBytes + ' bytes)' };
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: (e && e.message) || String(e) };
    }
  }

  async function isCached() {
    try {
      var lib = await ensureLib();
      var stored = await lib.stored();
      var libSays = Array.isArray(stored) && stored.indexOf(DEFAULT_VOICE) !== -1;
      if (!libSays) return false;
      // Cross-check OPFS — the library can return a stale list after
      // a flush(), which is what made the UI keep saying "Installed"
      // after Remove. Verify at least one piper-shaped file actually
      // exists at the expected size.
      try {
        if (navigator.storage && typeof navigator.storage.getDirectory === 'function') {
          var root = await navigator.storage.getDirectory();
          var found = false;
          if (typeof root.entries === 'function') {
            for await (var entry of root.entries()) {
              var n = entry[0] || '';
              if (/piper|onnx|amy|libritts/i.test(n) || /\.onnx(\.json)?$/i.test(n)) {
                found = true; break;
              }
            }
          } else {
            // Older Safari without .entries(): trust the library.
            found = true;
          }
          return found;
        }
      } catch (_) {}
      return libSays;
    } catch (e) {
      console.warn('[Piper] isCached check failed:', e);
      return false;
    }
  }

  async function install(progressFn) {
    var lib;
    try { lib = await ensureLib(); }
    catch (e) {
      var em = (e && e.message) || String(e);
      throw new Error('Could not load Piper library (' + em + '). Check your connection.');
    }
    // Always call download() — let the library decide whether the
    // file is already there. We removed the early-return on stored()
    // because after a manual OPFS sweep the library's internal index
    // can be stale, leading to "install succeeded" with nothing on
    // disk. download() is idempotent in the lib.
    progressFn && progressFn({ phase: 'starting', loaded: 0, total: 0, percent: 0 });
    try {
      await lib.download(DEFAULT_VOICE, function (p) {
        var loaded = (p && p.loaded) || 0;
        var total  = (p && p.total)  || 0;
        var percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        progressFn && progressFn({ phase: 'downloading', loaded: loaded, total: total, percent: percent });
      });
    } catch (e) {
      var dem = (e && e.message) || String(e);
      throw new Error('Download failed: ' + dem);
    }
    // Validate the install actually produced usable files. If not,
    // wipe + report so the user gets a clear, recoverable error
    // instead of a silent "Installed" that fails on first speech.
    var v = await verifyInstall();
    if (!v.ok) {
      progressFn && progressFn({ phase: 'verify-failed', loaded: 0, total: 0, percent: 0 });
      try { await uninstall(); } catch (_) {}
      throw new Error('Install incomplete: ' + v.reason + '. Please reinstall the voice.');
    }
    progressFn && progressFn({ phase: 'done', loaded: 1, total: 1, percent: 100 });
    return true;
  }

  async function uninstall() {
    var ok = false;
    // 1. Try the library's own cleanup paths
    try {
      var lib = await ensureLib();
      try { await lib.remove(DEFAULT_VOICE); ok = true; } catch (_) {}
      try { if (typeof lib.flush === 'function') { await lib.flush(); ok = true; } } catch (_) {}
    } catch (_) {}
    // 2. As a fallback, walk OPFS at root + the library's known
    // subdirectories and delete anything piper / onnx / voice
    // related. Defensive — survives a library bug where remove()
    // returns success without actually clearing files.
    try {
      if (navigator.storage && typeof navigator.storage.getDirectory === 'function') {
        var root = await navigator.storage.getDirectory();
        var SUBDIRS = ['piper', 'piper-tts', 'piper-tts-web', 'voices', 'tts', 'huggingface', 'models'];
        async function nukeMatching(dir) {
          // Some Safari versions don't expose entries() yet; gracefully
          // fall back to no-op if iteration isn't supported.
          if (typeof dir.entries !== 'function') return;
          var names = [];
          try {
            for await (var entry of dir.entries()) {
              names.push(entry[0]);
            }
          } catch (_) { return; }
          for (var i = 0; i < names.length; i++) {
            var name = names[i];
            if (/piper|onnx|voice|amy|libritts/i.test(name) ||
                /\.onnx(\.json)?$/i.test(name)) {
              try { await dir.removeEntry(name, { recursive: true }); ok = true; } catch (_) {}
            }
          }
        }
        await nukeMatching(root);
        for (var s = 0; s < SUBDIRS.length; s++) {
          try {
            var sub = await root.getDirectoryHandle(SUBDIRS[s], { create: false });
            await nukeMatching(sub);
            try { await root.removeEntry(SUBDIRS[s], { recursive: true }); ok = true; } catch (_) {}
          } catch (_) { /* not present */ }
        }
      }
    } catch (e) { console.warn('[Piper] OPFS sweep failed:', e); }
    // Drop the cached library reference + bump the import URL so the
    // next ensureLib() pulls a clean module instance whose internal
    // OPFS index isn't holding on to references to files we just
    // deleted underneath it.
    tts = null;
    loadPromise = null;
    libBust += 1;
    return ok;
  }

  function stopAll() {
    try {
      if (currentSource) {
        try { currentSource.stop(0); } catch (_) {}
        try { currentSource.disconnect(); } catch (_) {}
      }
    } catch (_) {}
    currentSource = null;
  }

  async function say(text, opts) {
    opts = opts || {};
    var clean = String(text || '').trim();
    if (!clean) return null;

    // Set up + unlock the AudioContext FIRST so the user-gesture
    // chain that called us is still valid. Doing this after a long
    // await on lib.predict() would let iPad Safari decide the
    // gesture expired, leaving the buffer source silent.
    var ctx = getAudioContext();
    if (!ctx) throw new Error('AudioContext unavailable');
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (_) {}
    }

    var lib = await ensureLib();
    var req = { text: clean, voiceId: opts.voiceId || DEFAULT_VOICE };
    if (opts.speakerId != null) req.speakerId = opts.speakerId;

    var wav;
    try {
      wav = await lib.predict(req);
    } catch (e) {
      var msg = (e && e.message) || String(e);
      // The cached voice config or model is corrupt (typical: install
      // declared success while the underlying file was 0-byte). Wipe
      // it so the next attempt re-downloads cleanly. Surface the
      // marker so the caller can prompt for reinstall.
      if (/JSON.*Parse|Unexpected EOF|Unexpected token|invalid model/i.test(msg)) {
        try { await lib.flush && lib.flush(); } catch (_) {}
        try { await lib.remove && lib.remove(opts.voiceId || DEFAULT_VOICE); } catch (_) {}
        var err = new Error('Voice cache was corrupt (' + msg + '). Cleared — please tap Install again.');
        err.code = 'PIPER_CACHE_CORRUPT';
        throw err;
      }
      throw e;
    }
    if (!wav || (wav.size != null && wav.size < 100)) {
      throw new Error('Piper returned empty audio (' + (wav && wav.size) + ' bytes)');
    }

    var arrayBuffer = await wav.arrayBuffer();
    var audioBuffer = await new Promise(function (res, rej) {
      // Some Safari versions only support the callback form of decodeAudioData.
      try {
        var p = ctx.decodeAudioData(arrayBuffer.slice(0), res, rej);
        if (p && typeof p.then === 'function') { p.then(res, rej); }
      } catch (e) { rej(e); }
    });

    if (!audioBuffer || !audioBuffer.duration || audioBuffer.length < 100) {
      throw new Error('Decoded audio buffer is empty (' + (audioBuffer && audioBuffer.length) + ' samples)');
    }

    stopAll();
    var src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    var rate = (typeof opts.rate === 'number' && opts.rate > 0) ? opts.rate : 1;
    if (rate !== 1) { try { src.playbackRate.value = rate; } catch (_) {} }

    // Insert a GainNode so we can guarantee non-zero volume.
    var gain = ctx.createGain();
    gain.gain.value = 1.0;
    src.connect(gain);
    gain.connect(ctx.destination);

    currentSource = src;
    src.onended = function () {
      if (currentSource === src) currentSource = null;
      if (typeof opts.onended === 'function') {
        try { opts.onended(); } catch (_) {}
      }
    };
    src.start(0);

    // Notify the caller when audio actually starts so the UI can
    // wait before declaring "Speaking".
    if (typeof opts.onstart === 'function') {
      try { opts.onstart(audioBuffer); } catch (_) {}
    }
    return audioBuffer;
  }

  async function listVoices() {
    try {
      var lib = await ensureLib();
      if (typeof lib.voices === 'function') return await lib.voices();
      return [];
    } catch (e) {
      return [];
    }
  }

  function isEnabled() {
    try { return localStorage.getItem(LS_ENABLED) === '1'; }
    catch (_) { return false; }
  }
  function setEnabled(v) {
    try { localStorage.setItem(LS_ENABLED, v ? '1' : '0'); }
    catch (_) {}
  }

  function isSupported() {
    try {
      // Need: dynamic import (handled at parse time), OPFS, AudioContext.
      return typeof Audio !== 'undefined'
        && typeof fetch !== 'undefined'
        && 'storage' in navigator
        && 'getDirectory' in (navigator.storage || {});
    } catch (_) { return false; }
  }

  function warmAudio() {
    // Call this synchronously inside a click/tap handler. Creates +
    // resumes the AudioContext so a later say() call (which awaits
    // a slow predict()) still has a valid gesture-unlocked context.
    var ctx = getAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try { ctx.resume(); } catch (_) {}
    }
    return true;
  }

  global.LoadPiper = {
    DEFAULT_VOICE: DEFAULT_VOICE,
    isSupported: isSupported,
    isCached: isCached,
    verifyInstall: verifyInstall,
    install: install,
    uninstall: uninstall,
    say: say,
    stop: stopAll,
    warmAudio: warmAudio,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    voices: listVoices
  };
})(typeof window !== 'undefined' ? window : globalThis);
