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
        tts = await import(TTS_LIB_URL);
        return tts;
      })();
    }
    return loadPromise;
  }

  async function isCached() {
    try {
      var lib = await ensureLib();
      var stored = await lib.stored();
      return Array.isArray(stored) && stored.indexOf(DEFAULT_VOICE) !== -1;
    } catch (e) {
      console.warn('[Piper] isCached check failed:', e);
      return false;
    }
  }

  async function install(progressFn) {
    var lib = await ensureLib();
    var stored = await lib.stored();
    if (stored.indexOf(DEFAULT_VOICE) !== -1) {
      progressFn && progressFn({ phase: 'already-cached', loaded: 1, total: 1, percent: 100 });
      return true;
    }
    await lib.download(DEFAULT_VOICE, function (p) {
      var loaded = (p && p.loaded) || 0;
      var total  = (p && p.total)  || 0;
      var percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
      progressFn && progressFn({ phase: 'downloading', loaded: loaded, total: total, percent: percent });
    });
    progressFn && progressFn({ phase: 'done', loaded: 1, total: 1, percent: 100 });
    return true;
  }

  async function uninstall() {
    try {
      var lib = await ensureLib();
      await lib.remove(DEFAULT_VOICE);
      return true;
    } catch (e) {
      console.warn('[Piper] uninstall failed:', e);
      return false;
    }
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

    var wav = await lib.predict(req);
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

    stopAll();
    var src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    var rate = (typeof opts.rate === 'number' && opts.rate > 0) ? opts.rate : 1;
    if (rate !== 1) { try { src.playbackRate.value = rate; } catch (_) {} }
    src.connect(ctx.destination);
    currentSource = src;
    src.onended = function () {
      if (currentSource === src) currentSource = null;
    };
    src.start(0);
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
