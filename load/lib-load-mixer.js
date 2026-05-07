// Load — Web Audio Scene Mixer (reliability addendum #11)
//
// Real layered audio playback for scene preview. Built on
// AudioContext / AudioBufferSourceNode / GainNode so every layer
// plays a real Blob through the Web Audio graph (not <audio>).
// No claim of mixed output unless decodeAudioData succeeded and
// every layer's BufferSource actually started.
//
// Public API:
//   window.LoadMixer.LANES                              - 6 spec lane names
//   window.LoadMixer.create()                           -> mixer instance
//
// Mixer instance API:
//   mixer.addLayer(spec)                                -> layer
//                  spec = { id?, name, lane, blob, volume?, muted?, offset? }
//   mixer.removeLayer(id)
//   mixer.loadAll()                                     -> Promise<[layer]>
//                                                         decodes every blob
//   mixer.play()                                        - starts all layers (returns proof
//                                                         object: { startedAt, lanesStarted })
//   mixer.stop()                                        - stops all sources
//   mixer.setVolume(id, v in 0..1)
//   mixer.setMuted(id, bool)
//   mixer.getLayers()                                   -> snapshot
//   mixer.isPlaying()                                   -> bool
//   mixer.elapsed()                                     -> seconds since play()

(function () {
'use strict';

var LANES = ['video','narration','ambience','SFX','music','voice'];

function create() {
  var ctx = null;
  var layers = [];
  var playing = false;
  var startTime = 0;

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) throw new Error('AudioContext not supported in this browser');
    ctx = new AC();
    return ctx;
  }

  function addLayer(spec) {
    spec = spec || {};
    var layer = {
      id: spec.id || ('layer-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5)),
      name: spec.name || 'untitled',
      lane: (LANES.indexOf(spec.lane) !== -1) ? spec.lane : 'SFX',
      blob: spec.blob || null,
      buffer: null,
      volume: typeof spec.volume === 'number' ? spec.volume : 1,
      muted: !!spec.muted,
      offset: +spec.offset || 0,
      source: null,
      gain: null,
      error: null
    };
    layers.push(layer);
    return layer;
  }

  function removeLayer(id) {
    var i = layers.findIndex(function (l) { return l.id === id; });
    if (i === -1) return false;
    if (layers[i].source) try { layers[i].source.stop(); } catch (_) {}
    layers.splice(i, 1);
    return true;
  }

  function loadAll() {
    ensureCtx();
    return Promise.all(layers.map(function (l) {
      if (l.buffer || !l.blob) return l;
      return l.blob.arrayBuffer().then(function (ab) {
        return new Promise(function (resolve, reject) {
          // Some Safari versions accept only the callback form; use it for max compat.
          ctx.decodeAudioData(ab, function (buf) { l.buffer = buf; resolve(l); }, function (err) { reject(err || new Error('decodeAudioData failed')); });
        });
      }).catch(function (err) {
        l.error = (err && err.message) || String(err);
        return l;
      });
    }));
  }

  function play() {
    ensureCtx();
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume();
    if (playing) return { startedAt: startTime, lanesStarted: 0 };
    playing = true;
    startTime = ctx.currentTime;
    var lanesStarted = 0;
    layers.forEach(function (l) {
      if (!l.buffer) return;
      try {
        var src = ctx.createBufferSource();
        src.buffer = l.buffer;
        var gain = ctx.createGain();
        gain.gain.value = l.muted ? 0 : Math.max(0, Math.min(1, l.volume));
        src.connect(gain).connect(ctx.destination);
        src.start(ctx.currentTime + Math.max(0, l.offset || 0));
        l.source = src;
        l.gain = gain;
        lanesStarted++;
      } catch (e) {
        l.error = (e && e.message) || String(e);
      }
    });
    return { startedAt: startTime, lanesStarted: lanesStarted };
  }

  function stop() {
    if (!playing) return;
    playing = false;
    layers.forEach(function (l) {
      if (l.source) { try { l.source.stop(); } catch (_) {} l.source = null; l.gain = null; }
    });
  }

  function setVolume(id, v) {
    var l = layers.find(function (x) { return x.id === id; }); if (!l) return false;
    l.volume = Math.max(0, Math.min(1, +v || 0));
    if (l.gain && !l.muted) l.gain.gain.value = l.volume;
    return true;
  }

  function setMuted(id, m) {
    var l = layers.find(function (x) { return x.id === id; }); if (!l) return false;
    l.muted = !!m;
    if (l.gain) l.gain.gain.value = l.muted ? 0 : l.volume;
    return true;
  }

  function getLayers() { return layers.map(function (l) {
    return { id: l.id, name: l.name, lane: l.lane, hasBuffer: !!l.buffer, durationSec: l.buffer ? l.buffer.duration : 0, volume: l.volume, muted: l.muted, offset: l.offset, error: l.error };
  }); }

  function isPlaying() { return playing; }
  function elapsed() { return ctx ? Math.max(0, ctx.currentTime - startTime) : 0; }

  return {
    addLayer: addLayer,
    removeLayer: removeLayer,
    loadAll: loadAll,
    play: play,
    stop: stop,
    setVolume: setVolume,
    setMuted: setMuted,
    getLayers: getLayers,
    isPlaying: isPlaying,
    elapsed: elapsed,
    LANES: LANES.slice()
  };
}

if (typeof window !== 'undefined') {
  window.LoadMixer = { LANES: LANES.slice(), create: create };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LANES: LANES, create: create };
}
})();
