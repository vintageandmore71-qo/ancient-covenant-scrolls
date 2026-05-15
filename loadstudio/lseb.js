// LoadStudio Editing Bay (lseb.js) v2
// UI and CSS ported from openVideoEditor (lseditor.js).
// Works with image+audio scenes — no video binary required.
// Two views: STORYBOARD (scene picker) → EDITOR (single scene full-screen).
// Namespaced: window.LSEditBay. No collision with Load globals.

(function () {
'use strict';

var STORE_KEY = 'ls_editbay_v1';
var PX_PER_SECOND = 90;
var _nextId = 1;
var _appendingClip = false;
var _selectedClipIdx = 0;

// ─── STORAGE ─────────────────────────────────────────────────────────────────
function _persist(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (_) {}
}
function _restore() {
  try { var r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : null; } catch (_) { return null; }
}

// ─── SCENE FACTORY ───────────────────────────────────────────────────────────
function _newScene(title) {
  return {
    id: 'lseb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    title: title || 'Scene',
    narration: '', captions: '', musicMood: '', sfx: '',
    transition: 'cut', duration: 5,
    media: { image: null, video: null, narration: null, music: null, sfxAudio: null },
    clips: [],
    tracks: { music: [], text: [], sticker: [], overlay: [] },
    fx: { filter: 'none', mirror: false, flip: false, rotate: 0, opacity: 100 },
    status: 'empty',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
}

// ─── STATE ───────────────────────────────────────────────────────────────────
var _state = { scenes: [], selectedIdx: 0 };

function _initState() {
  var saved = _restore();
  if (saved && Array.isArray(saved.scenes) && saved.scenes.length) {
    _state.scenes = saved.scenes.map(function (s) {
      if (!s.tracks) s.tracks = { music: [], text: [], sticker: [], overlay: [] };
      if (!s.tracks.overlay) s.tracks.overlay = [];
      if (!s.fx) s.fx = { filter: 'none', mirror: false, flip: false, rotate: 0, opacity: 100 };
      if (!s.media) s.media = { image: null, video: null, narration: null, music: null, sfxAudio: null };
      if (s.media.video === undefined) s.media.video = null;
      if (!s.clips) {
        s.clips = [];
        if (s.media.image) s.clips.push({ id: 'clip_mig_' + (_nextId++), type: 'image', src: s.media.image, dur: s.duration || 5 });
        else if (s.media.video) s.clips.push({ id: 'clip_mig_' + (_nextId++), type: 'video', src: s.media.video, dur: s.duration || 5 });
      }
      return s;
    });
    _state.selectedIdx = Math.min(saved.selectedIdx || 0, _state.scenes.length - 1);
  } else {
    _state.scenes = [_newScene('Scene 1')];
    _state.selectedIdx = 0;
  }
}

function _saveState() {
  _persist({ scenes: _state.scenes, selectedIdx: _state.selectedIdx });
}

// ─── AUDIO ENGINE (preload at attach time; play synchronously in user gesture) ─
// Ported from Load Eco engine pattern: media elements are created once when
// content is attached, not recreated on every play click. This satisfies iOS
// Safari's requirement that .play() is called inside a user-gesture context
// with a fully-loaded element.

var _audioPre = {};   // sceneId_lane → <audio> preloaded at attach time
var _playHandles = []; // currently active <audio> elements (play/pause/seek)
var _playTimer = null;
var _playing = false;

function _preloadAudio(sceneId, lane, src) {
  var key = sceneId + '_' + lane;
  var existing = _audioPre[key];
  if (existing) { try { existing.pause(); existing.src = ''; } catch (_) {} }
  if (!src) { delete _audioPre[key]; return; }
  var el = document.createElement('audio');
  el.preload = 'auto';
  el.src = src;
  el.load();
  _audioPre[key] = el;
}

function _stopAudio() {
  _playHandles.forEach(function (h) { try { h.pause(); } catch (_) {} });
  _playHandles = [];
}

// ─── SUBTITLE HELPERS ────────────────────────────────────────────────────────
function _initSubOverlay(scene) {
  var stage = _el('lseb-stage');
  if (!stage) return;
  var existing = document.getElementById('lseb-sub-overlay');
  if (existing) existing.remove();
  var textItems = (scene.tracks && scene.tracks.text) || [];
  if (!textItems.length) return;
  var sub = document.createElement('div');
  sub.id = 'lseb-sub-overlay';
  sub.className = 'sub-bottom';
  sub.style.opacity = '0';
  stage.appendChild(sub);
}

function _updateSubOverlay(scene, t) {
  var sub = document.getElementById('lseb-sub-overlay');
  if (!sub) return;
  var textItems = (scene.tracks && scene.tracks.text) || [];
  if (!textItems.length) return;
  var active = null;
  textItems.forEach(function (it) {
    var t0 = it.t0 || 0;
    if (t >= t0 && t < t0 + (it.dur || 3)) active = it;
  });
  sub.style.opacity = active ? '1' : '0';
  if (active) sub.innerHTML = '<span>' + _esc(active.text || '') + '</span>';
}

// ─── PLAYBACK ENGINE (RAF-based, ported from Load Eco engine) ────────────────
// For video assets: video element is master clock; RAF reads video.currentTime.
// For image assets: RAF advances _engine.t by dt; Ken Burns CSS runs in parallel.
// Audio is driven by preloaded <audio> elements started synchronously in play().
// ─── TIMELINE DURATION HELPER ─────────────────────────────────────────────────
function _tlDuration(scene) {
  if (!scene || !scene.clips || !scene.clips.length) return (scene && scene.duration) || 5;
  var total = 0;
  scene.clips.forEach(function (c) { total += c.dur || (scene.duration) || 5; });
  return total;
}
function _tlStartTimes(scene) {
  var clips = (scene && scene.clips) || [];
  var starts = [], total = 0;
  clips.forEach(function (c) { starts.push(total); total += c.dur || (scene.duration) || 5; });
  return starts;
}
function _tlClipAt(gt, scene) {
  var clips = (scene && scene.clips) || [];
  if (!clips.length) return { idx: 0, localTime: gt, startTime: 0 };
  var starts = _tlStartTimes(scene);
  var idx = 0;
  for (var i = starts.length - 1; i >= 0; i--) {
    if (gt >= starts[i]) { idx = i; break; }
  }
  return { idx: idx, localTime: Math.max(0, gt - starts[idx]), startTime: starts[idx] };
}

var _engine = {
  t: 0,           // local time within current clip
  globalTime: 0,  // absolute position across all clips
  clipIdx: 0,
  isPlaying: false,
  rafId: null,
  lastFrame: 0,

  play: function (idx) {
    if (this.isPlaying) return;
    var scene = _state.scenes[idx];
    if (!scene) return;
    if (!scene.clips) scene.clips = [];
    var total = _tlDuration(scene);
    if (this.globalTime >= total - 0.01) { this.globalTime = 0; }
    var info = _tlClipAt(this.globalTime, scene);
    this.clipIdx = info.idx;
    this.t = info.localTime;
    _selectedClipIdx = this.clipIdx;
    var clip = scene.clips[this.clipIdx] || null;
    var clipDur = clip ? (clip.dur || scene.duration || 5) : (scene.duration || 5);
    this.isPlaying = true;
    _playing = true;
    this.lastFrame = performance.now();
    _setPlayBtn(true);
    this._startClipMedia(clip, clipDur);
    var sceneId = scene.id;
    var LANE_VOL = { narration: 0.9, music: 0.35, sfxAudio: 0.5 };
    _playHandles = [];
    ['narration', 'music', 'sfxAudio'].forEach(function (lane) {
      var pre = _audioPre[sceneId + '_' + lane];
      if (!pre) return;
      try { pre.currentTime = 0; pre.volume = LANE_VOL[lane]; pre.play().catch(function () {}); _playHandles.push(pre); } catch (e) {}
    });
    (scene.tracks.music || []).forEach(function (it, i) {
      var pre = _audioPre[sceneId + '_music_track_' + i];
      if (!pre) return;
      try { pre.currentTime = it.t0 || 0; pre.volume = it.vol || 0.35; pre.play().catch(function () {}); _playHandles.push(pre); } catch (e) {}
    });
    _initSubOverlay(scene);
    this._runStep(idx);
  },

  _startClipMedia: function (clip, clipDur) {
    if (!clip) return;
    if (clip.type === 'video' && clip.src) {
      var vid = _el('lseb-stage-vid');
      var img = _el('lseb-stage-img');
      if (img) { img.classList.remove('kb-play'); img.style.animation = ''; img.style.display = 'none'; }
      if (vid) {
        if (vid.src !== clip.src) { vid.src = clip.src; vid.load(); }
        vid.style.display = 'block';
        try { vid.currentTime = this.t; vid.play().catch(function () {}); } catch (e) {}
      }
    } else if (clip.type === 'image' && clip.src) {
      var vid2 = _el('lseb-stage-vid');
      var img2 = _el('lseb-stage-img');
      if (vid2) { vid2.style.display = 'none'; try { vid2.pause(); } catch (e) {} }
      if (img2) {
        if (img2.src !== clip.src) img2.src = clip.src;
        img2.style.display = 'block';
        img2.classList.remove('kb-play'); img2.style.animation = '';
        void img2.offsetWidth;
        var kbIdx = Math.floor(Math.random() * 3);
        img2.classList.add('kb-play');
        img2.style.animation = 'lsebKenBurns' + kbIdx + ' ' + clipDur + 's ease-in-out forwards';
      }
    }
  },

  _runStep: function (idx) {
    var self = this;
    var starts = null;
    var step = function (now) {
      if (!self.isPlaying) return;
      var scene = _state.scenes[idx];
      if (!scene) { self._pause(idx); return; }
      var dt = (now - self.lastFrame) / 1000;
      self.lastFrame = now;
      if (!starts) starts = _tlStartTimes(scene);
      var clip = (scene.clips && scene.clips[self.clipIdx]) || null;
      var clipDur = clip ? (clip.dur || scene.duration || 5) : (scene.duration || 5);
      var clipStart = starts[self.clipIdx] || 0;
      var hasVid = clip && clip.type === 'video' && !!clip.src;
      var vid = _el('lseb-stage-vid');
      if (hasVid && vid && vid.readyState >= 2) {
        if (vid.ended || (vid.paused && vid.currentTime >= (vid.duration || clipDur) - 0.05)) {
          self.globalTime = clipStart + clipDur;
          self._advanceClip(idx);
          return;
        }
        self.t = vid.currentTime;
        self.globalTime = clipStart + self.t;
      } else {
        self.t += dt;
        self.globalTime += dt;
        if (self.t >= clipDur) {
          self.globalTime = clipStart + clipDur;
          self._advanceClip(idx);
          return;
        }
      }
      var total = _tlDuration(scene);
      if (self.globalTime >= total) { self._pause(idx); self._tick(idx, total); return; }
      self._tick(idx, self.globalTime);
      self.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  },

  _advanceClip: function (idx) {
    var scene = _state.scenes[idx];
    if (!scene || !scene.clips) { this._pause(idx); return; }
    var img = _el('lseb-stage-img');
    if (img) { img.classList.remove('kb-play'); img.style.animation = ''; }
    this.clipIdx++;
    if (this.clipIdx >= scene.clips.length) {
      this._pause(idx);
      this.globalTime = 0; this.t = 0;
      _selectedClipIdx = 0;
      _renderImageStrip(idx);
      return;
    }
    _selectedClipIdx = this.clipIdx;
    var clip = scene.clips[this.clipIdx];
    var clipDur = clip.dur || scene.duration || 5;
    this.t = 0;
    this.lastFrame = performance.now();
    _renderImageStrip(idx);
    this._startClipMedia(clip, clipDur);
    this._runStep(idx);
  },

  _pause: function (idx) {
    this.isPlaying = false;
    _playing = false;
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    _setPlayBtn(false);
    var vid = _el('lseb-stage-vid');
    if (vid) try { vid.pause(); } catch (e) {}
    var img = _el('lseb-stage-img');
    if (img) { img.classList.remove('kb-play'); img.style.animation = ''; }
    var sub = document.getElementById('lseb-sub-overlay');
    if (sub) sub.remove();
    _stopAudio();
  },

  // seekTo receives globalTime (x / PX_PER_SECOND from scrub handler)
  seekTo: function (globalTime, idx) {
    var scene = _state.scenes[idx];
    if (!scene) return;
    var total = _tlDuration(scene);
    globalTime = Math.max(0, Math.min(total, globalTime));
    var info = _tlClipAt(globalTime, scene);
    this.globalTime = globalTime;
    this.t = info.localTime;
    this.clipIdx = info.idx;
    _selectedClipIdx = info.idx;
    var clip = scene.clips && scene.clips[info.idx];
    if (clip) {
      var img = _el('lseb-stage-img');
      var vid = _el('lseb-stage-vid');
      var ph = _el('lseb-stage-ph');
      if (clip.type === 'image') {
        if (img) { if (img.src !== clip.src) img.src = clip.src; img.style.display = 'block'; }
        if (vid) vid.style.display = 'none';
      } else if (clip.type === 'video') {
        if (vid) { if (vid.src !== clip.src) { vid.src = clip.src; vid.load(); } vid.style.display = 'block'; try { vid.currentTime = info.localTime; } catch (e) {} }
        if (img) img.style.display = 'none';
      }
      if (ph) ph.style.display = 'none';
    }
    _renderImageStrip(idx);
    this._tick(idx, globalTime);
    _playHandles.forEach(function (h) { try { h.currentTime = globalTime; } catch (_) {} });
  },

  _tick: function (idx, globalTime) {
    var scene = _state.scenes[idx];
    var total = _tlDuration(scene);
    var timeEl = _el('lseb-time');
    if (timeEl) timeEl.textContent = globalTime.toFixed(2) + ' / ' + total.toFixed(2) + 's';
    var playhead = _el('lseb-playhead');
    if (playhead) playhead.style.left = Math.min(globalTime * PX_PER_SECOND, total * PX_PER_SECOND) + 'px';
    if (scene) _updateSubOverlay(scene, globalTime);
    if (scene) _renderOverlayLayer(scene, globalTime);
  }
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function _esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function _el(id) { return document.getElementById(id); }
function _readDataURL(file) {
  return new Promise(function (res, rej) {
    var r = new FileReader();
    r.onload = function (e) { res(e.target.result); };
    r.onerror = function (e) { rej(e); };
    r.readAsDataURL(file);
  });
}
function _toast(msg) {
  var t = _el('lseb-toast');
  if (!t) return;
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(function () { t.style.opacity = '0'; }, 2200);
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
var _CSS =
  // Storyboard
  '#lseb-root{height:100%;overflow:hidden}' +
  '.lseb-sb{display:flex;flex-direction:column;height:100%;background:#0a0a14;font-family:Inter,system-ui,sans-serif;color:#f5f0ff;overflow:hidden}' +
  '.lseb-sb-bar{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#12081e;border-bottom:1px solid rgba(125,42,232,.25);flex-shrink:0}' +
  '.lseb-sb-title{font:700 15px Inter,system-ui,sans-serif;color:#b388ff;flex:1}' +
  '.lseb-sb-btn{padding:7px 14px;background:rgba(125,42,232,.18);border:1px solid rgba(125,42,232,.4);border-radius:8px;color:#e0d8f8;font:600 12px Inter,system-ui,sans-serif;cursor:pointer}' +
  '.lseb-sb-btn:active{background:rgba(125,42,232,.35)}' +
  '.lseb-sb-grid{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;align-content:start}' +
  '.lseb-sc{border-radius:10px;border:1.5px solid rgba(125,42,232,.22);background:#160b26;cursor:pointer;overflow:hidden;transition:border-color .15s}' +
  '.lseb-sc:hover{border-color:rgba(125,42,232,.55)}' +
  '.lseb-sc.active{border-color:#b33af0}' +
  '.lseb-sc-thumb{width:100%;aspect-ratio:16/9;background:#000;display:block;object-fit:cover}' +
  '.lseb-sc-thumb-ph{width:100%;aspect-ratio:16/9;background:#0c0820;display:flex;align-items:center;justify-content:center;color:#2a1e45}' +
  '.lseb-sc-foot{padding:6px 8px 8px;display:flex;align-items:center;justify-content:space-between}' +
  '.lseb-sc-lbl{font:600 11px Inter,system-ui,sans-serif;color:#c0b8d9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100px}' +
  '.lseb-sc-dur{font:400 10px Inter,system-ui,sans-serif;color:#4a3f6a}' +
  '.lseb-sc-add{border:1.5px dashed rgba(125,42,232,.3);background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;aspect-ratio:unset;min-height:110px;color:#5a4a7a;font:500 12px Inter,system-ui,sans-serif}' +
  '.lseb-sc-add:hover{border-color:rgba(125,42,232,.6);color:#b388ff}' +
  // Toast
  '#lseb-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(26,14,46,.95);color:#f5f0ff;font:500 13px Inter,system-ui,sans-serif;padding:9px 18px;border-radius:10px;pointer-events:none;z-index:9999;opacity:0;transition:opacity .25s;border:1px solid rgba(125,42,232,.4);white-space:nowrap}' +
  // Editor wrapper — same layout as #__loadVideoEdit
  '#lseb-editor{position:absolute;inset:0;display:flex;flex-direction:column;background:#0a0a14;color:#f0f0f0;font-family:-apple-system,sans-serif;overflow:hidden;z-index:10}' +
  // Topbar
  '#lseb-editor .ve-iconbtn{background:transparent;border:none;color:#fff;width:38px;height:38px;border-radius:8px;cursor:pointer;font-size:17px;display:inline-flex;align-items:center;justify-content:center}' +
  '#lseb-editor .ve-iconbtn:active{background:rgba(255,255,255,.1)}' +
  '#lseb-editor .lseb-topbar{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#0a0a14;flex-shrink:0}' +
  '#lseb-editor .lseb-version{font-size:10px;color:#7a6a9a;font-weight:600;letter-spacing:.04em;padding:0 4px;font-variant-numeric:tabular-nums}' +
  '#lseb-editor .lseb-export-btn{background:#7d2ae8;border:none;color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px}' +
  '#lseb-editor .lseb-export-btn:active{background:#9c3aff}' +
  // Stage
  '#lseb-editor #lseb-stage{flex:3 1 0;min-height:240px;position:relative;background:#000;display:flex;align-items:center;justify-content:center}' +
  '#lseb-editor #lseb-stage-img{max-width:100%;max-height:100%;object-fit:contain;display:none}' +
  '#lseb-editor #lseb-stage-ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#2a1a42;font:400 14px Inter,system-ui,sans-serif;cursor:pointer}' +
  '#lseb-editor #lseb-stage-ph svg{opacity:.3}' +
  '#lseb-editor #lseb-fullscreen-btn{position:absolute;right:10px;bottom:10px;background:rgba(255,255,255,.1)}' +
  // Transport
  '#lseb-editor .lseb-transport{display:flex;align-items:center;gap:14px;padding:8px 14px;background:#0a0a14;border-top:1px solid #1a1a26;flex-shrink:0}' +
  '#lseb-editor #lseb-time{font-size:13px;color:#cfcfdc;font-variant-numeric:tabular-nums;min-width:120px}' +
  '#lseb-editor .lseb-transport-center{margin:0 auto;display:flex;align-items:center;gap:18px}' +
  // Timeline engine — identical structure to openVideoEditor
  '#lseb-editor .timeline-engine{width:100%;height:320px;background:#101018;display:grid;grid-template-columns:92px 1fr;color:#fff;overflow:hidden;font-family:system-ui,sans-serif;flex-shrink:0}' +
  '#lseb-editor .track-labels{padding-top:12px;display:flex;flex-direction:column;gap:10px;align-items:center;overflow-y:auto;max-height:300px;scrollbar-width:none}' +
  '#lseb-editor .track-labels::-webkit-scrollbar{display:none}' +
  '#lseb-editor .track-add,.cover-btn{position:relative;width:64px;height:44px;border:none;border-radius:12px;background:#1e1e2a;color:#fff;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}' +
  '#lseb-editor .track-add svg,.cover-btn svg{width:22px;height:22px;color:#fff;display:block;pointer-events:none}' +
  '#lseb-editor .track-add .ta-plus{position:absolute;right:6px;bottom:5px;background:#fff;color:#0a0a14;font-weight:700;font-size:10px;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none}' +
  '#lseb-editor .cover-btn{height:54px;border:1px dashed rgba(255,255,255,.45);flex-direction:column;gap:3px}' +
  '#lseb-editor .cover-btn .ta-lbl{font-size:10.5px;font-weight:600;color:#fff;pointer-events:none}' +
  '#lseb-editor .timeline-scroll{position:relative;overflow-x:auto;overflow-y:hidden;padding:12px 24px 0 0;scrollbar-width:none}' +
  '#lseb-editor .timeline-scroll::-webkit-scrollbar{display:none}' +
  '#lseb-editor .ve-track-row{position:relative;height:38px;margin-bottom:8px;border-radius:8px;background:#191923;color:#8f8f9d;display:block;padding:0;overflow:visible}' +
  '#lseb-editor .ve-track-empty{position:absolute;top:50%;left:18px;transform:translateY(-50%);font-size:13px;color:#5a5a78;pointer-events:auto;cursor:pointer}' +
  '#lseb-editor .ve-track-block{position:absolute;top:3px;bottom:3px;border-radius:6px;display:flex;align-items:center;padding:0 8px;font-size:11px;font-weight:600;cursor:grab;color:#fff;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;touch-action:none;user-select:none}' +
  '#lseb-editor .ve-track-block.dragging{cursor:grabbing;opacity:.85}' +
  '#lseb-editor .ve-track-row[data-track="music"] .ve-track-block{background:linear-gradient(180deg,#7d2ae8,#5b1fa8)}' +
  '#lseb-editor .ve-track-row[data-track="text"] .ve-track-block{background:linear-gradient(180deg,#5fc8ff,#2a6a9c);color:#0a1626}' +
  '#lseb-editor .ve-track-row[data-track="sticker"] .ve-track-block{background:linear-gradient(180deg,#b33af0,#7c1eb5)}' +
  '#lseb-editor .ve-track-row[data-track="overlay"] .ve-track-block{background:linear-gradient(180deg,#3aafb0,#1e6a6b)}' +
  '#lseb-overlay-layer{position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden}' +
  '#lseb-overlay-layer .overlay-item{position:absolute;pointer-events:none}' +
  '#lseb-editor .ve-track-block .ve-tb-trim{position:absolute;top:0;bottom:0;width:8px;background:rgba(0,0,0,.35);cursor:ew-resize}' +
  '#lseb-editor .ve-track-block .ve-tb-trim.l{left:0;border-radius:6px 0 0 6px}' +
  '#lseb-editor .ve-track-block .ve-tb-trim.r{right:0;border-radius:0 6px 6px 0}' +
  '#lseb-editor .ve-track-block .ve-tb-x{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#fff;color:#1a1a26;border:none;font-size:11px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}' +
  // Image track (like video-track)
  '#lseb-editor .video-track{height:90px;display:flex;align-items:center;gap:0;position:relative}' +
  '#lseb-editor .timeline-clip{position:relative;height:84px;border-radius:6px;overflow:hidden;background:#08080d;display:flex;align-items:center;cursor:pointer;flex:0 0 auto;border:2px solid rgba(179,58,240,.4)}' +
  '#lseb-editor .timeline-clip.selected{border:3px solid #b33af0}' +
  '#lseb-editor .thumbnail-strip{position:absolute;inset:0;display:flex;align-items:stretch;overflow:hidden}' +
  '#lseb-editor .thumbnail-strip img{flex:0 0 86px;width:86px;height:100%;object-fit:cover;object-position:center top;display:block;border-right:1px solid rgba(255,255,255,.1)}' +
  '#lseb-editor .clip-duration{position:absolute;left:6px;bottom:4px;background:rgba(0,0,0,.7);color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;font-variant-numeric:tabular-nums;pointer-events:none}' +
  '#lseb-editor .empty-slot{flex:0 0 100px;height:84px;border:1px dashed #2a2a40;border-radius:6px;background:#0c0c14;cursor:pointer}' +
  '#lseb-editor .big-add{flex:0 0 44px;height:84px;background:#1e1e2a;border:none;border-radius:8px;color:#cfcfdc;font-size:22px;font-weight:900;cursor:pointer;font-family:inherit}' +
  '#lseb-editor .big-add:hover{background:#2a2a3a;color:#b33af0}' +
  // Waveform
  '#lseb-editor .waveform-track{height:38px;margin-top:8px;background:#191923;border-radius:8px;position:relative;overflow:hidden}' +
  '#lseb-editor .waveform-track canvas{position:absolute;inset:0;width:100%;height:100%;display:block}' +
  '#lseb-editor .waveform-track.empty::before{content:"Waveform — attach audio to visualise";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#5a5a78;font-size:11px;font-weight:600;letter-spacing:.05em}' +
  // Time ruler
  '#lseb-editor .time-ruler{position:relative;height:22px;color:#9a9aac;font-size:11px;font-variant-numeric:tabular-nums;background:#0a0a14}' +
  '#lseb-editor .time-ruler .tick{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,.18)}' +
  '#lseb-editor .time-ruler .tick.major{background:rgba(255,255,255,.45)}' +
  '#lseb-editor .time-ruler .tick-label{position:absolute;top:4px;color:#cfcfdc;font-weight:600;transform:translateX(-50%)}' +
  // Playhead
  '#lseb-editor .playhead{position:absolute;top:12px;bottom:12px;width:2px;background:#b33af0;left:0;pointer-events:none;box-shadow:0 0 6px rgba(179,58,240,.7);z-index:10}' +
  '#lseb-editor .playhead::before{content:"";position:absolute;top:-3px;left:-5px;width:12px;height:12px;background:#b33af0;border-radius:50%;box-shadow:0 0 0 2px #101018}' +
  // Action bar
  '#lseb-editor #lseb-actions{display:flex;align-items:center;background:#0a0a14;padding:6px 8px max(6px,env(safe-area-inset-bottom));border-top:1px solid #1a1a26;flex-shrink:0;overflow-x:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x;gap:6px;scrollbar-width:none}' +
  '#lseb-editor #lseb-actions::-webkit-scrollbar{display:none}' +
  '#lseb-editor .ve-action{flex:0 0 auto;background:transparent;border:none;color:#cfcfdc;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 2px;cursor:pointer;min-width:46px;font-family:inherit}' +
  '#lseb-editor .ve-action:active{transform:scale(.94)}' +
  '#lseb-editor .ve-act-icon{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;color:#fff}' +
  '#lseb-editor .ve-act-icon svg{width:24px;height:24px;display:block;pointer-events:none}' +
  '#lseb-editor .ve-act-lbl{font-size:9.5px;color:#cfcfdc;text-align:center;line-height:1.15;letter-spacing:.01em;white-space:nowrap}' +
  '#lseb-editor .ve-action.on .ve-act-icon{color:#b33af0}' +
  '#lseb-editor .ve-action-sep{flex:0 0 auto;width:1px;height:36px;background:#2a2a40;margin:0 4px;display:inline-block}' +
  // Panels (music, subtitle, speed, opacity)
  '#lseb-editor .ve-panel{position:fixed;left:0;right:0;bottom:calc(80px + env(safe-area-inset-bottom));background:#1a1a26;border:1px solid #2a2a40;padding:14px 16px 18px;z-index:30;max-width:580px;margin:0 auto;border-radius:18px;box-shadow:0 -10px 36px rgba(0,0,0,.55)}' +
  '#lseb-editor .ve-panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-weight:700;color:#fff;font-size:14px}' +
  '#lseb-editor .ve-lbl{font-size:12.5px;color:#a0a0b0;display:block}' +
  '#lseb-editor .ve-input{display:block;width:100%;margin-top:4px;padding:6px 8px;background:#0e0e18;color:#fff;border:1px solid #2a2a40;border-radius:6px;font-size:13px;font-family:inherit}' +
  '#lseb-editor.ve-panel-open #lseb-actions{display:none}' +
  // Ken Burns animation for playback
  '@keyframes lsebKenBurns0{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.08) translate(-2%,-1%)}}' +
  '@keyframes lsebKenBurns1{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.07) translate(2%,-1.5%)}}' +
  '@keyframes lsebKenBurns2{0%{transform:scale(1.02) translate(-1%,1%)}100%{transform:scale(1.09) translate(1.5%,-1%)}}' +
  '#lseb-stage-img.kb-play{transform-origin:center center;will-change:transform}' +
  // Subtitle overlay
  '#lseb-sub-overlay{position:absolute;left:0;right:0;text-align:center;pointer-events:none;z-index:8;transition:opacity .2s}' +
  '#lseb-sub-overlay.sub-top{top:14px}' +
  '#lseb-sub-overlay.sub-middle{top:50%;transform:translateY(-50%)}' +
  '#lseb-sub-overlay.sub-bottom{bottom:14px}' +
  '#lseb-sub-overlay span{display:inline-block;background:rgba(0,0,0,.72);color:#fff;font:600 18px/1.4 Inter,system-ui,sans-serif;padding:6px 16px;border-radius:6px;max-width:92%;word-break:break-word}' +
  // Ratio select in topbar
  '#lseb-editor .lseb-ratio-wrap{display:flex;align-items:center;gap:6px;background:#1a1a26;padding:6px 12px;border-radius:8px}' +
  '#lseb-editor #lseb-ratio{background:transparent;color:#fff;border:none;font-size:14px;font-weight:600;outline:none}';

// ─── STORYBOARD VIEW ─────────────────────────────────────────────────────────
function _showStoryboard() {
  var root = _el('lseb-root');
  if (!root) return;

  root.innerHTML =
    '<div class="lseb-sb">' +
      '<div class="lseb-sb-bar">' +
        '<span class="lseb-sb-title">Editing Bay</span>' +
        '<button class="lseb-sb-btn" id="lseb-sb-add" type="button">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:13px;height:13px;margin-right:4px;vertical-align:middle"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
          'Add Scene' +
        '</button>' +
        '<button class="lseb-sb-btn" id="lseb-sb-save" type="button">Save</button>' +
      '</div>' +
      '<div class="lseb-sb-grid" id="lseb-sb-grid"></div>' +
    '</div>' +
    '<div id="lseb-toast" style="opacity:0"></div>';

  _el('lseb-sb-add').addEventListener('click', function () { _addScene(); _renderGrid(); });
  _el('lseb-sb-save').addEventListener('click', function () {
    _saveState();
    var btn = _el('lseb-sb-save');
    if (btn) { btn.textContent = 'Saved'; setTimeout(function () { btn.textContent = 'Save'; }, 1200); }
  });

  _renderGrid();
}

function _renderGrid() {
  var grid = _el('lseb-sb-grid');
  if (!grid) return;
  grid.innerHTML = '';

  _state.scenes.forEach(function (scene, i) {
    var card = document.createElement('div');
    card.className = 'lseb-sc' + (i === _state.selectedIdx ? ' active' : '');

    if (scene.media.image) {
      card.innerHTML =
        '<img class="lseb-sc-thumb" src="' + scene.media.image + '" alt="">' +
        '<div class="lseb-sc-foot"><span class="lseb-sc-lbl">' + _esc(scene.title) + '</span><span class="lseb-sc-dur">' + (scene.duration || 5) + 's</span></div>';
    } else {
      card.innerHTML =
        '<div class="lseb-sc-thumb-ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" width="32" height="32"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5-9 9"/></svg></div>' +
        '<div class="lseb-sc-foot"><span class="lseb-sc-lbl">' + _esc(scene.title) + '</span><span class="lseb-sc-dur">' + (scene.duration || 5) + 's</span></div>';
    }

    card.addEventListener('click', function () {
      _state.selectedIdx = i;
      _openSceneEditor(i);
    });
    grid.appendChild(card);
  });

  // "+" add card
  var add = document.createElement('div');
  add.className = 'lseb-sc lseb-sc-add';
  add.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="28" height="28"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
    '<span>New Scene</span>';
  add.addEventListener('click', function () { _addScene(); _renderGrid(); });
  grid.appendChild(add);
}

function _addScene() {
  var scene = _newScene('Scene ' + (_state.scenes.length + 1));
  _state.scenes.push(scene);
  _state.selectedIdx = _state.scenes.length - 1;
  _saveState();
}

// ─── SCENE EDITOR VIEW ───────────────────────────────────────────────────────
function _openSceneEditor(idx) {
  var root = _el('lseb-root');
  if (!root) return;
  var scene = _state.scenes[idx];
  if (!scene) return;
  _selectedClipIdx = 0;
  _engine.globalTime = 0;
  _engine.clipIdx = 0;
  _engine.t = 0;
  if (scene.clips && scene.clips.length > 0) {
    var _fc = scene.clips[0];
    scene.media.image = _fc.type === 'image' ? _fc.src : null;
    scene.media.video = _fc.type === 'video' ? _fc.src : null;
  }

  root.innerHTML =
    '<div id="lseb-editor">' +
      // Topbar
      '<div class="lseb-topbar">' +
        '<button class="ve-iconbtn" id="lseb-back" aria-label="Back to storyboard">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="15 18 9 12 15 6"/></svg>' +
        '</button>' +
        '<span class="lseb-version" id="lseb-scene-label">' + _esc(scene.title) + '</span>' +
        '<div style="margin:0 auto" class="lseb-ratio-wrap">' +
          '<span style="font-size:13px;color:#cfcfdc">&#9633;</span>' +
          '<select id="lseb-ratio" aria-label="Aspect ratio">' +
            '<option value="original" selected>Original</option>' +
            '<option value="16:9">16:9</option>' +
            '<option value="9:16">9:16</option>' +
            '<option value="1:1">1:1</option>' +
          '</select>' +
        '</div>' +
        '<button class="ve-iconbtn" id="lseb-more" aria-label="Scene info" title="Scene details">&#8943;</button>' +
        '<button class="lseb-export-btn" id="lseb-save-btn" aria-label="Save">Save</button>' +
      '</div>' +
      // Stage
      '<div id="lseb-stage">' +
        (scene.media.video
          ? '<video id="lseb-stage-vid" src="' + _esc(scene.media.video) + '" playsinline preload="auto" style="max-width:100%;max-height:100%;background:#000;display:block"></video>' +
            '<img id="lseb-stage-img" alt="" style="display:none;max-width:100%;max-height:100%;object-fit:contain">'
          : '<video id="lseb-stage-vid" playsinline preload="auto" style="display:none;max-width:100%;max-height:100%;background:#000"></video>' +
            (scene.media.image
              ? '<img id="lseb-stage-img" src="' + _esc(scene.media.image) + '" alt="" style="display:block;max-width:100%;max-height:100%;object-fit:contain">'
              : '<img id="lseb-stage-img" alt="" style="display:none;max-width:100%;max-height:100%;object-fit:contain">')) +
        '<div id="lseb-stage-ph"' + (scene.media.image || scene.media.video ? ' style="display:none"' : '') + '>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" width="48" height="48"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5-9 9"/></svg>' +
          '<span>Tap to attach image</span>' +
        '</div>' +
        '<div id="lseb-overlay-layer"></div>' +
        '<button class="ve-iconbtn" id="lseb-fullscreen-btn" aria-label="Fullscreen" style="position:absolute;right:10px;bottom:10px;background:rgba(255,255,255,.1)">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>' +
        '</button>' +
        '<input type="file" id="lseb-img-pick" accept="image/*,video/*,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.m4v" style="display:none">' +
      '</div>' +
      // Transport
      '<div class="lseb-transport">' +
        '<span id="lseb-time">0.00 / ' + _tlDuration(scene).toFixed(2) + 's</span>' +
        '<div class="lseb-transport-center">' +
          '<button class="ve-iconbtn" id="lseb-prev-btn" aria-label="Previous scene">' +
            '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="19 20 9 12 19 4"/><rect x="5" y="4" width="3" height="16"/></svg>' +
          '</button>' +
          '<button class="ve-iconbtn" id="lseb-play-btn" aria-label="Play" style="font-size:22px">' +
            '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><polygon points="6 4 20 12 6 20"/></svg>' +
          '</button>' +
          '<button class="ve-iconbtn" id="lseb-next-btn" aria-label="Next scene">' +
            '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5 4 15 12 5 20"/><rect x="16" y="4" width="3" height="16"/></svg>' +
          '</button>' +
        '</div>' +
        '<button class="ve-iconbtn" id="lseb-undo" aria-label="Undo" title="Undo">&#8634;</button>' +
      '</div>' +
      // Timeline engine
      '<div class="timeline-engine" id="lseb-tl">' +
        '<div class="track-labels">' +
          '<button class="track-add" data-add="music" aria-label="Add music" type="button">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
            '<span class="ta-plus">+</span>' +
          '</button>' +
          '<button class="track-add" data-add="text" aria-label="Add subtitle" type="button">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>' +
            '<span class="ta-plus">+</span>' +
          '</button>' +
          '<button class="track-add" data-add="sticker" aria-label="Add sticker / PiP" type="button">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="1.5"/><rect x="12" y="11" width="7" height="5" rx="0.8" fill="currentColor" stroke="none"/></svg>' +
            '<span class="ta-plus">+</span>' +
          '</button>' +
          '<button class="cover-btn" id="lseb-cover-btn" aria-label="Set cover image" type="button">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 2"/><path d="M8 14l3-3 5 5"/><circle cx="9" cy="8" r="1.4" fill="currentColor"/></svg>' +
            '<span class="ta-lbl">Cover</span>' +
          '</button>' +
          '<button class="track-add" data-add="image" aria-label="Attach image" type="button">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5-9 9"/></svg>' +
            '<span class="ta-plus">+</span>' +
          '</button>' +
        '</div>' +
        '<div class="timeline-scroll" id="lseb-tl-scroll">' +
          '<div class="ve-track-row" data-track="music"><span class="ve-track-empty" data-add="music">Tap to add music</span></div>' +
          '<div class="ve-track-row" data-track="text"><span class="ve-track-empty" data-add="text">Tap to add subtitle</span></div>' +
          '<div class="ve-track-row" data-track="sticker"><span class="ve-track-empty" data-add="sticker">Tap to add sticker / PiP</span></div>' +
          '<div class="ve-track-row" data-track="overlay"><span class="ve-track-empty" data-add="overlay-img">Tap to add overlay image</span></div>' +
          '<div class="video-track" id="lseb-image-strip"></div>' +
          '<div class="waveform-track empty" id="lseb-waveform"></div>' +
          '<div class="time-ruler" id="lseb-ruler"></div>' +
          '<div class="playhead" id="lseb-playhead" style="left:0"></div>' +
        '</div>' +
      '</div>' +
      // Panels (hidden by default)
      '<div id="lseb-music-panel" class="ve-panel" hidden>' +
        '<div class="ve-panel-head"><span>Music / Narration</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
        '<input id="lseb-audio-pick" type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac,.aiff,.webm,.opus" style="font-size:13px;">' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;">' +
          '<label class="ve-lbl">Volume</label>' +
          '<input id="lseb-vol" type="range" min="0" max="1" step="0.05" value="0.35" style="flex:1;min-width:140px;accent-color:#7d2ae8;">' +
          '<span id="lseb-vol-val" style="font-size:13px;color:#cfcfdc;font-weight:700;">35%</span>' +
        '</div>' +
      '</div>' +
      '<div id="lseb-text-panel" class="ve-panel" hidden>' +
        '<div class="ve-panel-head"><span>Subtitle / overlay</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
        '<input id="lseb-text-inp" placeholder="Caption / title" class="ve-input" style="margin-bottom:10px;">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          '<label class="ve-lbl">Position<select id="lseb-text-pos" class="ve-input"><option value="top">Top</option><option value="middle">Middle</option><option value="bottom" selected>Bottom</option></select></label>' +
          '<label class="ve-lbl">Size<input id="lseb-text-size" type="number" value="48" min="12" max="200" class="ve-input"></label>' +
        '</div>' +
      '</div>' +
      '<div id="lseb-filter-panel" class="ve-panel" hidden>' +
        '<div class="ve-panel-head"><span>Filter</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px" id="lseb-filter-grid"></div>' +
      '</div>' +
      '<div id="lseb-opacity-panel" class="ve-panel" hidden>' +
        '<div class="ve-panel-head"><span>Opacity</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
          '<label class="ve-lbl">Transparency</label>' +
          '<input id="lseb-opacity-range" type="range" min="0" max="100" step="5" value="100" style="flex:1;min-width:160px;accent-color:#7d2ae8">' +
          '<span id="lseb-opacity-val" style="font-size:14px;color:#b33af0;font-weight:800;min-width:48px;text-align:right">100%</span>' +
        '</div>' +
      '</div>' +
      '<div id="lseb-blur-panel" class="ve-panel" hidden>' +
        '<div class="ve-panel-head"><span>Blur</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
          '<label class="ve-lbl">Blur amount</label>' +
          '<input id="lseb-blur-range" type="range" min="0" max="20" step="0.5" value="0" style="flex:1;min-width:160px;accent-color:#7d2ae8">' +
          '<span id="lseb-blur-val" style="font-size:14px;color:#b33af0;font-weight:800;min-width:48px;text-align:right">0px</span>' +
        '</div>' +
      '</div>' +
      '<div id="lseb-info-panel" class="ve-panel" hidden>' +
        '<div class="ve-panel-head"><span id="lseb-info-title">Tool</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
        '<p id="lseb-info-msg" style="color:#c0b8d9;font-size:13px;line-height:1.55;margin:0"></p>' +
      '</div>' +
      // Hidden image/sticker pickers
      '<input type="file" id="lseb-sticker-pick" accept="image/*,video/*" style="display:none">' +
      '<input type="file" id="lseb-overlay-pick" accept="image/*" style="display:none">' +
      // Bottom action bar
      '<div id="lseb-actions">' +
        _actionBtn('filter', 'Filter', '<circle cx="9" cy="9" r="5"/><circle cx="15" cy="9" r="5"/><circle cx="12" cy="15" r="5"/>') +
        _actionBtn('crop', 'Crop', '<path d="M6 3v15a1 1 0 0 0 1 1h15"/><path d="M3 6h15a1 1 0 0 1 1 1v15"/>') +
        _actionBtn('rotate', 'Rotate', '<polyline points="3 4 3 10 9 10"/><path d="M3 10a9 9 0 1 0 3-6.7"/>') +
        _actionBtn('mirror', 'Mirror', '<line x1="12" y1="3" x2="12" y2="21"/><polygon points="3 6 10 6 10 18 3 18" fill="currentColor" stroke="none"/><polygon points="21 6 14 6 14 18 21 18" stroke-dasharray="2 1.5"/>') +
        _actionBtn('flip', 'Flip', '<line x1="3" y1="12" x2="21" y2="12"/><polygon points="3 8 10 8 10 4" fill="currentColor" stroke="none"/><polygon points="21 16 14 16 14 20" fill="currentColor" stroke="none"/>') +
        '<span class="ve-action-sep" aria-hidden="true"></span>' +
        _actionBtn('fx', 'FX', '<polygon points="9 3 11 8 16 9 11 10 9 15 7 10 2 9 7 8"/><line x1="15" y1="13" x2="22" y2="13"/><line x1="15" y1="17" x2="20" y2="17"/>') +
        _actionBtn('opacity', 'Opacity', '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>') +
        _actionBtn('blur', 'Blur', '<circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="12" cy="6" r="1" fill="currentColor"/><circle cx="18" cy="6" r="1" fill="currentColor"/><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/><circle cx="6" cy="18" r="1" fill="currentColor"/><circle cx="12" cy="18" r="1" fill="currentColor"/><circle cx="18" cy="18" r="1" fill="currentColor"/>') +
        '<span class="ve-action-sep" aria-hidden="true"></span>' +
        _actionBtn('speed', 'Duration', '<circle cx="12" cy="12" r="9"/><polyline points="12 8 14.5 13"/><circle cx="12" cy="13" r="1.2" fill="currentColor"/>') +
        _actionBtn('tts', 'Narration', '<path d="M5 17l4-12 4 12"/><line x1="6.5" y1="13" x2="11.5" y2="13"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M19 6a8 8 0 0 1 0 12"/>') +
        _actionBtn('delete-scene', 'Delete', '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>') +
        _actionBtn('ai-img', 'AI Image', '<polygon points="9 3 11 8 16 9 11 10 9 15 7 10 2 9 7 8"/><rect x="14" y="14" width="8" height="8" rx="1"/>') +
      '</div>' +
      '<div id="lseb-toast" style="opacity:0"></div>' +
    '</div>';

  // Wire everything
  _bindEditor(idx);
  // Preload audio from restored state so playback works after reload
  if (scene.media.music) _preloadAudio(scene.id, 'music', scene.media.music);
  if (scene.media.narration) _preloadAudio(scene.id, 'narration', scene.media.narration);
  if (scene.media.sfxAudio) _preloadAudio(scene.id, 'sfxAudio', scene.media.sfxAudio);
  (scene.tracks.music || []).forEach(function (it, i) { if (it.src) _preloadAudio(scene.id, 'music_track_' + i, it.src); });
  _renderImageStrip(idx);
  _renderTracks(idx);
  _renderOverlayLayer(scene, 0);
  // Restore waveform if audio was previously attached
  if (scene.media.music || (scene.tracks.music && scene.tracks.music.length > 0)) {
    setTimeout(function () { _renderWaveformPlaceholder(0.35); }, 0);
  }
  _renderRuler(idx);
}

function _actionBtn(action, label, svgPaths) {
  return '<button class="ve-action" data-action="' + action + '" type="button" aria-label="' + label + '">' +
    '<span class="ve-act-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + svgPaths + '</svg></span>' +
    '<span class="ve-act-lbl">' + label + '</span>' +
  '</button>';
}

function _bindEditor(idx) {
  var scene = _state.scenes[idx];
  if (!scene) return;

  // Back → storyboard
  var back = _el('lseb-back');
  if (back) back.addEventListener('click', function () {
    _stopPlayback();
    _state.selectedIdx = idx;
    _saveState();
    _showStoryboard();
  });

  // Save
  var saveBtn = _el('lseb-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', function () {
    _saveState();
    saveBtn.textContent = 'Saved';
    setTimeout(function () { saveBtn.textContent = 'Save'; }, 1200);
  });

  // Stage tap → image picker
  var stagePh = _el('lseb-stage-ph');
  var imgPick = _el('lseb-img-pick');
  if (stagePh && imgPick) {
    stagePh.addEventListener('click', function () { imgPick.click(); });
  }

  // Image / video pick handler
  if (imgPick) imgPick.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var isNew = _appendingClip;
    _appendingClip = false;
    _readDataURL(file).then(function (dataURL) {
      if (/^video\//i.test(file.type)) {
        _attachVideo(idx, dataURL, isNew);
      } else {
        _attachImage(idx, dataURL, isNew);
      }
    }).catch(function () {});
    e.target.value = '';
  });

  // Cover button → same as stage tap
  var coverBtn = _el('lseb-cover-btn');
  if (coverBtn && imgPick) coverBtn.addEventListener('click', function () { imgPick.click(); });

  // Track-add + empty-track tap → open panels
  var _ALL_PANELS = ['lseb-music-panel','lseb-text-panel','lseb-filter-panel','lseb-opacity-panel','lseb-blur-panel','lseb-info-panel'];
  function _showPanel(id) {
    _ALL_PANELS.forEach(function (p) {
      var el = _el(p); if (el) el.hidden = (p !== id);
    });
    var ed = _el('lseb-editor');
    if (ed) ed.classList.toggle('ve-panel-open', !!id);
  }
  function _showInfo(title, msg) {
    var t = _el('lseb-info-title'); if (t) t.textContent = title;
    var m = _el('lseb-info-msg'); if (m) m.textContent = msg;
    _showPanel('lseb-info-panel');
  }
  // Build filter grid (uses module-level _FILTERS / _FILTER_LABELS)
  var _FILTER_LABELS = { none:'None', warm:'Warm', cool:'Cool', noir:'Noir', vivid:'Vivid', soft:'Soft', vintage:'Vintage', bw:'B&W', cinema:'Cinema', golden:'Golden' };
  function _buildFilterGrid(idx) {
    var grid = _el('lseb-filter-grid');
    if (!grid) return;
    grid.innerHTML = '';
    var scene = _state.scenes[idx];
    var curFilter = scene && scene.fx ? scene.fx.filter : 'none';
    Object.keys(_FILTER_LABELS).forEach(function (key) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = 'background:' + (key === curFilter ? '#7d2ae8' : '#2a2a40') + ';border:1.5px solid ' + (key === curFilter ? '#b33af0' : 'transparent') + ';color:#fff;border-radius:10px;padding:10px 6px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:600';
      btn.textContent = _FILTER_LABELS[key];
      btn.addEventListener('click', function () {
        if (!scene) return;
        scene.fx.filter = key;
        var img = _el('lseb-stage-img');
        if (img) img.style.filter = key === 'none' ? '' : _FILTERS[key];
        _saveState();
        _buildFilterGrid(idx);
      });
      grid.appendChild(btn);
    });
  }

  var editor = _el('lseb-editor');
  if (editor) {
    editor.querySelectorAll('.track-add,[data-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var add = btn.dataset.add;
        if (add === 'music') { _showPanel('lseb-music-panel'); }
        else if (add === 'text') { _showPanel('lseb-text-panel'); }
        else if (add === 'sticker') { _el('lseb-sticker-pick') && _el('lseb-sticker-pick').click(); }
        else if (add === 'image' || add === 'overlay-img') { _el('lseb-overlay-pick') && _el('lseb-overlay-pick').click(); }
      });
    });
    editor.querySelectorAll('.ve-track-empty[data-add]').forEach(function (span) {
      span.addEventListener('click', function () {
        var add = span.dataset.add;
        if (add === 'music') _showPanel('lseb-music-panel');
        else if (add === 'text') _showPanel('lseb-text-panel');
        else if (add === 'sticker') { _el('lseb-sticker-pick') && _el('lseb-sticker-pick').click(); }
        else if (add === 'overlay-img') { _el('lseb-overlay-pick') && _el('lseb-overlay-pick').click(); }
      });
    });
    editor.querySelectorAll('[data-close-panel]').forEach(function (btn) {
      btn.addEventListener('click', function () { _showPanel(null); });
    });
  }

  // Music panel — file pick → attach audio
  var audioPick = _el('lseb-audio-pick');
  var volSlider = _el('lseb-vol');
  var volVal = _el('lseb-vol-val');
  if (audioPick) audioPick.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var volNow = volSlider ? parseFloat(volSlider.value) : 0.35;
    _readDataURL(file).then(function (dataURL) {
      var it = _addTrackItem(idx, 'music', { name: file.name.replace(/\.[^.]+$/, ''), dur: scene.duration || 5, src: dataURL, vol: volNow });
      scene.media.music = dataURL;
      _saveState();
      _preloadAudio(scene.id, 'music', dataURL);
      var trackIdx = (scene.tracks.music || []).length - 1;
      if (trackIdx >= 0) _preloadAudio(scene.id, 'music_track_' + trackIdx, dataURL);
      _renderTracks(idx);
      _renderWaveformPlaceholder(volNow);
      _showPanel(null);
      _toast('Music attached: ' + file.name);
    }).catch(function () { _toast('Could not read audio file.'); });
    e.target.value = '';
  });
  if (volSlider && volVal) volSlider.addEventListener('input', function () {
    volVal.textContent = Math.round(parseFloat(volSlider.value) * 100) + '%';
  });

  // Text panel — add subtitle block on confirm
  var textInp = _el('lseb-text-inp');
  if (textInp) textInp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && textInp.value.trim()) {
      _addTrackItem(idx, 'text', { text: textInp.value.trim(), dur: 3 });
      _renderTracks(idx);
      textInp.value = '';
      _showPanel(null);
    }
  });

  // Sticker pick
  var stickerPick = _el('lseb-sticker-pick');
  if (stickerPick) stickerPick.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    _readDataURL(file).then(function (dataURL) {
      _addTrackItem(idx, 'sticker', { src: dataURL, name: file.name.replace(/\.[^.]+$/, ''), dur: 3, kind: /video/i.test(file.type) ? 'video' : 'image' });
      _renderTracks(idx);
      _renderOverlayLayer(scene, _engine.t);
      _toast('Sticker / PiP attached.');
    }).catch(function () {});
    e.target.value = '';
  });

  // Overlay image pick
  var overlayPick = _el('lseb-overlay-pick');
  if (overlayPick) overlayPick.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    _readDataURL(file).then(function (dataURL) {
      _addOverlayImage(idx, dataURL);
    }).catch(function () {});
    e.target.value = '';
  });

  // Timeline scrub — pointerdown + move on the scroll area seeks to that position
  var tlScroll = _el('lseb-tl-scroll');
  if (tlScroll) {
    var _scrubbing = false;
    function _scrubFromPointer(e) {
      var rect = tlScroll.getBoundingClientRect();
      var clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
      var x = (clientX - rect.left) + tlScroll.scrollLeft;
      _engine.seekTo(Math.max(0, x / PX_PER_SECOND), idx);
    }
    tlScroll.addEventListener('pointerdown', function (e) {
      if (e.target && (e.target.classList.contains('ve-clip-handle') || e.target.dataset.edge)) return;
      _scrubbing = true;
      _scrubFromPointer(e);
    }, { passive: true });
    document.addEventListener('pointermove', function (e) {
      if (!_scrubbing) return;
      _scrubFromPointer(e);
    }, { passive: true });
    document.addEventListener('pointerup', function () { _scrubbing = false; });
  }

  // Transport
  var playBtn = _el('lseb-play-btn');
  if (playBtn) playBtn.addEventListener('click', function () {
    _engine.isPlaying ? _engine._pause(idx) : _engine.play(idx);
  });
  var prevBtn = _el('lseb-prev-btn');
  if (prevBtn) prevBtn.addEventListener('click', function () {
    _stopPlayback();
    var newIdx = Math.max(0, idx - 1);
    _state.selectedIdx = newIdx;
    _saveState();
    _openSceneEditor(newIdx);
  });
  var nextBtn = _el('lseb-next-btn');
  if (nextBtn) nextBtn.addEventListener('click', function () {
    _stopPlayback();
    var newIdx = Math.min(_state.scenes.length - 1, idx + 1);
    _state.selectedIdx = newIdx;
    _saveState();
    _openSceneEditor(newIdx);
  });

  // Bottom action bar
  // Opacity panel wiring
  var opRange = _el('lseb-opacity-range');
  var opVal = _el('lseb-opacity-val');
  if (opRange) {
    var sceneOpacity = scene.fx ? (scene.fx.opacity != null ? scene.fx.opacity : 100) : 100;
    opRange.value = sceneOpacity;
    if (opVal) opVal.textContent = sceneOpacity + '%';
    opRange.addEventListener('input', function () {
      var v = parseInt(opRange.value, 10);
      if (opVal) opVal.textContent = v + '%';
      var img = _el('lseb-stage-img');
      if (img) img.style.opacity = v / 100;
      if (scene.fx) scene.fx.opacity = v;
      _saveState();
    });
  }
  // Blur panel wiring
  var blurRange = _el('lseb-blur-range');
  var blurVal = _el('lseb-blur-val');
  if (blurRange) {
    blurRange.addEventListener('input', function () {
      var v = parseFloat(blurRange.value);
      if (blurVal) blurVal.textContent = v + 'px';
      var img = _el('lseb-stage-img');
      if (img) img.style.filter = _buildFilterStr(scene.fx, v);
    });
  }
  if (editor) editor.querySelectorAll('.ve-action[data-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var action = btn.dataset.action;
      if (action === 'filter') { _buildFilterGrid(idx); _showPanel('lseb-filter-panel'); }
      else if (action === 'crop') { _showInfo('Crop', 'Crop editing is coming in the next build. You can use Rotate, Mirror, and Flip right now.'); }
      else if (action === 'rotate') { _rotateScene(idx); }
      else if (action === 'mirror') { _mirrorScene(idx); }
      else if (action === 'flip') { _flipScene(idx); }
      else if (action === 'opacity') { _showPanel('lseb-opacity-panel'); }
      else if (action === 'fx') { _showInfo('FX', 'Visual effects (keyframe, curve, motion) are coming in the next build.'); }
      else if (action === 'blur') { _showPanel('lseb-blur-panel'); }
      else if (action === 'speed') { _promptDuration(idx); }
      else if (action === 'tts') { _showPanel('lseb-text-panel'); }
      else if (action === 'delete-scene') { _deleteScene(idx); }
      else if (action === 'ai-img') { _attachFromAIDirector(idx); }
    });
  });

  // More button → duration edit
  var moreBtn = _el('lseb-more');
  if (moreBtn) moreBtn.addEventListener('click', function () { _promptDuration(idx); });

}

// ─── VIDEO FIRST-FRAME CAPTURE ────────────────────────────────────────────────
function _captureVideoFirstFrame(src, cb) {
  try {
    var vid = document.createElement('video');
    vid.muted = true; vid.playsInline = true; vid.preload = 'metadata'; vid.src = src;
    var done = false;
    function _cap() {
      if (done) return; done = true;
      try {
        var c = document.createElement('canvas'); c.width = 86; c.height = 84;
        c.getContext('2d').drawImage(vid, 0, 0, 86, 84);
        cb(c.toDataURL('image/jpeg', 0.7));
      } catch (_) { cb(null); }
      vid.src = '';
    }
    vid.addEventListener('seeked', _cap);
    vid.addEventListener('loadeddata', function () { vid.currentTime = 0.01; });
    vid.addEventListener('error', function () { if (!done) { done = true; cb(null); } });
    vid.load();
  } catch (_) { cb(null); }
}

// ─── IMAGE / MEDIA STRIP ─────────────────────────────────────────────────────
function _renderImageStrip(idx) {
  var strip = _el('lseb-image-strip');
  if (!strip) return;
  var scene = _state.scenes[idx];
  if (!scene.clips) scene.clips = [];
  strip.innerHTML = '';

  var clips = scene.clips;

  if (!clips.length) {
    var emptySlot = document.createElement('div');
    emptySlot.className = 'empty-slot';
    emptySlot.addEventListener('click', function () { _el('lseb-img-pick') && _el('lseb-img-pick').click(); });
    strip.appendChild(emptySlot);
  }

  clips.forEach(function (clip, ci) {
    var dur = clip.dur || scene.duration || 5;
    var totalWidth = Math.max(180, dur * PX_PER_SECOND);
    var thumbCount = Math.max(1, Math.ceil(totalWidth / 86));

    var clipEl = document.createElement('div');
    clipEl.className = 'timeline-clip' + (ci === _selectedClipIdx ? ' selected' : '');
    clipEl.style.width = totalWidth + 'px';
    clipEl.dataset.clipIdx = ci;

    if (clip.type === 'image' && clip.src) {
      var thumbStrip = document.createElement('div');
      thumbStrip.className = 'thumbnail-strip';
      for (var i = 0; i < thumbCount; i++) {
        var timg = document.createElement('img');
        timg.src = clip.src; timg.alt = '';
        thumbStrip.appendChild(timg);
      }
      clipEl.appendChild(thumbStrip);
    } else if (clip.type === 'video' && clip.src) {
      var vidThumbStrip = document.createElement('div');
      vidThumbStrip.className = 'thumbnail-strip';
      for (var vi = 0; vi < thumbCount; vi++) {
        var vph = document.createElement('div');
        vph.style.cssText = 'flex:0 0 86px;width:86px;height:100%;background:#0a0820;border-right:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;color:#4a3a6a;font-size:10px;font-weight:600';
        vph.textContent = vi === 0 ? 'Video' : '';
        vidThumbStrip.appendChild(vph);
      }
      clipEl.appendChild(vidThumbStrip);
      (function (captureEl, captureCount, captureSrc) {
        _captureVideoFirstFrame(captureSrc, function (frameSrc) {
          if (!frameSrc) return;
          var ts = captureEl.querySelector('.thumbnail-strip');
          if (!ts) return;
          ts.innerHTML = '';
          for (var fi = 0; fi < captureCount; fi++) {
            var fimg = document.createElement('img'); fimg.src = frameSrc; fimg.alt = '';
            ts.appendChild(fimg);
          }
        });
      })(clipEl, thumbCount, clip.src);
    } else {
      clipEl.style.background = '#1a0a2e';
      clipEl.style.border = '1px dashed rgba(179,58,240,.4)';
      clipEl.innerHTML = '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#3a2e55;font-size:12px;font-weight:600">Tap to attach</span>';
    }

    var durLabel = document.createElement('div');
    durLabel.className = 'clip-duration';
    durLabel.textContent = dur.toFixed(2) + 's';
    clipEl.appendChild(durLabel);

    clipEl.addEventListener('click', function () { _selectClip(idx, ci); });
    strip.appendChild(clipEl);
  });

  var bigAdd = document.createElement('button');
  bigAdd.className = 'big-add';
  bigAdd.textContent = '+';
  bigAdd.type = 'button';
  bigAdd.setAttribute('aria-label', 'Add clip');
  bigAdd.addEventListener('click', function () {
    _appendingClip = true;
    var p = _el('lseb-img-pick');
    if (p) p.click();
  });
  strip.appendChild(bigAdd);
}

// ─── TRACKS ──────────────────────────────────────────────────────────────────
function _addTrackItem(idx, kind, item) {
  var scene = _state.scenes[idx];
  if (!scene) return null;
  if (!scene.tracks) scene.tracks = { music: [], text: [], sticker: [] };
  var t0 = 0;
  (scene.tracks[kind] || []).forEach(function (it) {
    if (it.t0 + it.dur > t0) t0 = it.t0 + it.dur;
  });
  var newItem = Object.assign({ id: kind + '_' + (_nextId++), t0: t0 }, item);
  scene.tracks[kind] = scene.tracks[kind] || [];
  scene.tracks[kind].push(newItem);
  _saveState();
  return newItem;
}

function _removeTrackItem(idx, kind, itemId) {
  var scene = _state.scenes[idx];
  if (!scene || !scene.tracks) return;
  scene.tracks[kind] = (scene.tracks[kind] || []).filter(function (it) { return it.id !== itemId; });
  _saveState();
}

function _renderTracks(idx) {
  var editor = _el('lseb-editor');
  if (!editor) return;
  var scene = _state.scenes[idx];
  if (!scene) return;
  if (!scene.tracks) scene.tracks = { music: [], text: [], sticker: [] };

  ['music', 'text', 'sticker', 'overlay'].forEach(function (kind) {
    var row = editor.querySelector('.ve-track-row[data-track="' + kind + '"]');
    if (!row) return;
    Array.prototype.forEach.call(row.querySelectorAll('.ve-track-block'), function (b) { b.remove(); });
    var items = scene.tracks[kind] || [];
    var empty = row.querySelector('.ve-track-empty');
    if (empty) empty.style.display = items.length ? 'none' : '';
    items.forEach(function (it) {
      var el = document.createElement('div');
      el.className = 've-track-block';
      el.dataset.trackKind = kind;
      el.dataset.itemId = it.id;
      el.style.left = (it.t0 * PX_PER_SECOND) + 'px';
      el.style.width = Math.max(40, it.dur * PX_PER_SECOND) + 'px';
      var label = kind === 'text' ? (it.text || 'Text') : kind === 'music' ? (it.name || 'Music') : kind === 'overlay' ? 'Overlay' : 'Sticker';
      el.innerHTML =
        '<div class="ve-tb-trim l" data-edge="l"></div>' +
        '<span class="ve-tb-lbl" style="pointer-events:none">' + _esc(label.substring(0, 24)) + '</span>' +
        '<div class="ve-tb-trim r" data-edge="r"></div>' +
        '<button class="ve-tb-x" type="button" aria-label="Remove">×</button>';
      row.appendChild(el);

      // Drag to reposition
      var dragStartX = 0, origT0 = 0;
      el.addEventListener('pointerdown', function (e) {
        if (e.target.classList.contains('ve-tb-trim') || e.target.classList.contains('ve-tb-x')) return;
        e.preventDefault(); e.stopPropagation();
        el.setPointerCapture(e.pointerId);
        el.classList.add('dragging');
        dragStartX = e.clientX; origT0 = it.t0;
        function move(ev) {
          it.t0 = Math.max(0, origT0 + (ev.clientX - dragStartX) / PX_PER_SECOND);
          el.style.left = (it.t0 * PX_PER_SECOND) + 'px';
        }
        function up() {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
          el.classList.remove('dragging');
          _saveState();
        }
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
      });

      // Trim handles
      Array.prototype.forEach.call(el.querySelectorAll('.ve-tb-trim'), function (h) {
        h.addEventListener('pointerdown', function (e) {
          e.preventDefault(); e.stopPropagation();
          var origDur = it.dur, origT0_ = it.t0, startX = e.clientX, edge = h.dataset.edge;
          function move(ev) {
            var dx = (ev.clientX - startX) / PX_PER_SECOND;
            if (edge === 'l') {
              var nt0 = Math.max(0, origT0_ + dx);
              it.t0 = nt0; it.dur = Math.max(0.2, origDur - (nt0 - origT0_));
            } else {
              it.dur = Math.max(0.2, origDur + dx);
            }
            el.style.left = (it.t0 * PX_PER_SECOND) + 'px';
            el.style.width = Math.max(40, it.dur * PX_PER_SECOND) + 'px';
          }
          function up() {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            _saveState();
          }
          document.addEventListener('pointermove', move);
          document.addEventListener('pointerup', up);
        });
      });

      // Remove ×
      el.querySelector('.ve-tb-x').addEventListener('click', function (e) {
        e.stopPropagation();
        _removeTrackItem(idx, kind, it.id);
        _renderTracks(idx);
        if (kind === 'music') { scene.media.music = null; _renderWaveformPlaceholder(0); }
      });
    });
  });
}

// ─── WAVEFORM ────────────────────────────────────────────────────────────────
function _renderWaveformPlaceholder(vol) {
  var wf = _el('lseb-waveform');
  if (!wf) return;
  wf.classList.remove('empty');
  wf.innerHTML = '';
  var canvas = document.createElement('canvas');
  var w = wf.clientWidth || 600;
  var h = wf.clientHeight || 38;
  canvas.width = w; canvas.height = h;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#191923';
  ctx.fillRect(0, 0, w, h);
  var bars = Math.floor(w / 3);
  for (var i = 0; i < bars; i++) {
    var amp = (Math.random() * 0.7 + 0.1) * vol * (h / 2);
    var x = i * 3;
    ctx.fillStyle = '#7d2ae8';
    ctx.globalAlpha = 0.7 + Math.random() * 0.3;
    ctx.fillRect(x, h / 2 - amp, 2, amp * 2);
  }
  ctx.globalAlpha = 1;
  wf.appendChild(canvas);
}

// ─── TIME RULER ──────────────────────────────────────────────────────────────
function _renderRuler(idx) {
  var ruler = _el('lseb-ruler');
  if (!ruler) return;
  var scene = _state.scenes[idx];
  var dur = _tlDuration(scene);
  var totalPx = Math.max(dur * PX_PER_SECOND + 120, 400);
  ruler.style.width = totalPx + 'px';
  ruler.innerHTML = '';
  var step = 1;
  for (var t = 0; t <= dur + 2; t += step) {
    var tick = document.createElement('div');
    tick.className = 'tick major';
    tick.style.left = (t * PX_PER_SECOND) + 'px';
    if (t % 2 === 0) {
      var lbl = document.createElement('span');
      lbl.className = 'tick-label';
      lbl.textContent = t + 's';
      lbl.style.left = (t * PX_PER_SECOND) + 'px';
      ruler.appendChild(lbl);
    }
    ruler.appendChild(tick);
  }
}

// ─── ATTACH IMAGE ────────────────────────────────────────────────────────────
function _attachImage(idx, src, asNewClip) {
  var scene = _state.scenes[idx];
  if (!scene) return;
  if (!scene.clips) scene.clips = [];
  var dur = scene.duration || 5;
  if (asNewClip || !scene.clips.length) {
    scene.clips.push({ id: 'clip_' + (_nextId++), type: 'image', src: src, dur: dur });
    _selectedClipIdx = scene.clips.length - 1;
  } else {
    var ci = Math.min(_selectedClipIdx, scene.clips.length - 1);
    scene.clips[ci] = { id: scene.clips[ci].id || ('clip_' + (_nextId++)), type: 'image', src: src, dur: scene.clips[ci].dur || dur };
  }
  var sel = scene.clips[_selectedClipIdx] || scene.clips[0];
  scene.media.image = sel && sel.type === 'image' ? sel.src : null;
  scene.media.video = sel && sel.type === 'video' ? sel.src : null;
  scene.status = 'has-image';
  scene.updatedAt = new Date().toISOString();
  _saveState();
  var stageImg = _el('lseb-stage-img');
  var stageVid = _el('lseb-stage-vid');
  var ph = _el('lseb-stage-ph');
  if (sel && sel.type === 'image') {
    if (stageImg) { stageImg.src = sel.src; stageImg.style.display = 'block'; _applyFxToImg(stageImg, scene.fx); }
    if (stageVid) stageVid.style.display = 'none';
  }
  if (ph) ph.style.display = 'none';
  _renderImageStrip(idx);
  _toast(asNewClip ? 'Clip added.' : 'Image attached.');
}

function _attachVideo(idx, src, asNewClip) {
  var scene = _state.scenes[idx];
  if (!scene) return;
  if (!scene.clips) scene.clips = [];
  var dur = scene.duration || 5;
  if (asNewClip || !scene.clips.length) {
    scene.clips.push({ id: 'clip_' + (_nextId++), type: 'video', src: src, dur: dur });
    _selectedClipIdx = scene.clips.length - 1;
  } else {
    var ci = Math.min(_selectedClipIdx, scene.clips.length - 1);
    scene.clips[ci] = { id: scene.clips[ci].id || ('clip_' + (_nextId++)), type: 'video', src: src, dur: scene.clips[ci].dur || dur };
  }
  var sel = scene.clips[_selectedClipIdx] || scene.clips[0];
  scene.media.image = null;
  scene.media.video = sel && sel.type === 'video' ? sel.src : null;
  scene.status = 'has-video';
  scene.updatedAt = new Date().toISOString();
  _saveState();
  var vid = _el('lseb-stage-vid');
  var img = _el('lseb-stage-img');
  var ph = _el('lseb-stage-ph');
  if (sel && sel.type === 'video') {
    if (vid) { vid.src = sel.src; vid.style.display = 'block'; vid.load(); }
    if (img) img.style.display = 'none';
  }
  if (ph) ph.style.display = 'none';
  _renderImageStrip(idx);
  _toast(asNewClip ? 'Clip added.' : 'Video attached.');
}

function _attachFromAIDirector(idx) {
  try {
    var takes = JSON.parse(localStorage.getItem('loadstudio_ai_image_director_takes') || '[]');
    var approved = takes.filter(function (t) { return t.verdict === 'approved' && t.image; });
    if (!approved.length) { _toast('No approved images from AI Director yet.'); return; }
    _attachImage(idx, approved[approved.length - 1].image);
  } catch (e) { _toast('Could not read AI Director takes.'); }
}

// ─── CLIP SELECTION ───────────────────────────────────────────────────────────
function _selectClip(idx, ci) {
  var scene = _state.scenes[idx];
  if (!scene || !scene.clips || !scene.clips[ci]) return;
  _selectedClipIdx = ci;
  var clip = scene.clips[ci];
  scene.media.image = clip.type === 'image' ? clip.src : null;
  scene.media.video = clip.type === 'video' ? clip.src : null;
  _saveState();
  var img = _el('lseb-stage-img');
  var vid = _el('lseb-stage-vid');
  var ph = _el('lseb-stage-ph');
  if (clip.type === 'image') {
    if (img) { img.src = clip.src; img.style.display = 'block'; _applyFxToImg(img, scene.fx); }
    if (vid) vid.style.display = 'none';
  } else if (clip.type === 'video') {
    if (vid) { vid.src = clip.src; vid.style.display = 'block'; vid.load(); }
    if (img) img.style.display = 'none';
  }
  if (ph) ph.style.display = 'none';
  _renderImageStrip(idx);
}

// ─── OVERLAY IMAGE ────────────────────────────────────────────────────────────
function _addOverlayImage(idx, src) {
  var scene = _state.scenes[idx];
  if (!scene) return;
  if (!scene.tracks.overlay) scene.tracks.overlay = [];
  _addTrackItem(idx, 'overlay', { src: src, dur: 3, x: 0.05, y: 0.05, w: 0.4, h: 0.4 });
  _renderTracks(idx);
  _renderOverlayLayer(scene, _engine.t);
  _toast('Overlay image added.');
}

// ─── OVERLAY LAYER RENDER ────────────────────────────────────────────────────
function _renderOverlayLayer(scene, t) {
  var layer = document.getElementById('lseb-overlay-layer');
  if (!layer) return;
  if (!scene || !scene.tracks) { layer.innerHTML = ''; return; }
  var stickers = scene.tracks.sticker || [];
  var overlays = scene.tracks.overlay || [];
  var allItems = stickers.map(function (it) { return { kind: 'sticker', item: it }; })
    .concat(overlays.map(function (it) { return { kind: 'overlay', item: it }; }));

  // Rebuild DOM when item set changes
  var existing = layer.querySelectorAll('.overlay-item');
  var needRebuild = existing.length !== allItems.length;
  if (!needRebuild) {
    for (var k = 0; k < allItems.length; k++) {
      if (!existing[k] || existing[k].dataset.itemId !== allItems[k].item.id) { needRebuild = true; break; }
    }
  }
  if (needRebuild) {
    layer.innerHTML = '';
    allItems.forEach(function (ai) {
      var it = ai.item;
      var el = document.createElement('div');
      el.className = 'overlay-item';
      el.dataset.itemId = it.id;
      if (ai.kind === 'sticker') {
        el.style.cssText = 'position:absolute;top:8%;right:4%;width:32%;height:32%;display:flex;align-items:center;justify-content:center';
        if (it.kind === 'video') {
          var v = document.createElement('video');
          v.src = it.src; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
          v.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain';
          el.appendChild(v);
        } else {
          var si = document.createElement('img');
          si.src = it.src; si.alt = '';
          si.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain';
          el.appendChild(si);
        }
      } else {
        var x = (it.x || 0.05) * 100, y = (it.y || 0.05) * 100;
        var w = (it.w || 0.4) * 100, h = (it.h || 0.4) * 100;
        el.style.cssText = 'position:absolute;left:' + x + '%;top:' + y + '%;width:' + w + '%;height:' + h + '%;overflow:hidden';
        var oi = document.createElement('img');
        oi.src = it.src; oi.alt = '';
        oi.style.cssText = 'width:100%;height:100%;object-fit:contain';
        el.appendChild(oi);
      }
      layer.appendChild(el);
    });
  }

  // Update visibility based on playhead time
  var els = layer.querySelectorAll('.overlay-item');
  allItems.forEach(function (ai, i) {
    if (!els[i]) return;
    var it = ai.item;
    var t0 = it.t0 || 0;
    var visible = t >= t0 && t < t0 + (it.dur || 3);
    els[i].style.display = visible ? '' : 'none';
  });
}

// ─── PLAYBACK SHIMS (delegate to _engine) ────────────────────────────────────
function _startPlayback(idx) { _engine.play(idx); }

function _stopPlayback() {
  _engine._pause(_state.selectedIdx);
  _engine.t = 0;
  _engine.globalTime = 0;
  clearTimeout(_playTimer);
  var playhead = _el('lseb-playhead');
  if (playhead) playhead.style.left = '0';
  var timeEl = _el('lseb-time');
  if (timeEl) {
    var scene = _state.scenes[_state.selectedIdx];
    var dur = _tlDuration(scene);
    timeEl.textContent = '0.00 / ' + dur.toFixed(2) + 's';
  }
}

function _setPlayBtn(isPlaying) {
  var btn = _el('lseb-play-btn');
  if (!btn) return;
  btn.innerHTML = isPlaying
    ? '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><polygon points="6 4 20 12 6 20"/></svg>';
  btn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
}

// ─── SCENE TRANSFORMS ────────────────────────────────────────────────────────
function _rotateScene(idx) {
  var scene = _state.scenes[idx];
  if (!scene || !scene.media.image) { _toast('Attach an image first.'); return; }
  scene.fx.rotate = ((scene.fx.rotate || 0) + 90) % 360;
  _saveState();
  var img = _el('lseb-stage-img');
  if (img) img.style.transform = _buildTransform(scene.fx);
  _toast('Rotated ' + scene.fx.rotate + '°');
}
function _mirrorScene(idx) {
  var scene = _state.scenes[idx];
  if (!scene) return;
  scene.fx.mirror = !scene.fx.mirror;
  _saveState();
  var img = _el('lseb-stage-img');
  if (img) img.style.transform = _buildTransform(scene.fx);
}
function _flipScene(idx) {
  var scene = _state.scenes[idx];
  if (!scene) return;
  scene.fx.flip = !scene.fx.flip;
  _saveState();
  var img = _el('lseb-stage-img');
  if (img) img.style.transform = _buildTransform(scene.fx);
}
function _buildTransform(fx) {
  var parts = [];
  if (fx.rotate) parts.push('rotate(' + fx.rotate + 'deg)');
  if (fx.mirror) parts.push('scaleX(-1)');
  if (fx.flip) parts.push('scaleY(-1)');
  return parts.join(' ') || 'none';
}
var _FILTERS = {
  none:'', warm:'sepia(0.25) saturate(1.2) hue-rotate(-10deg)',
  cool:'saturate(1.1) hue-rotate(15deg) brightness(1.05)',
  noir:'grayscale(1) contrast(1.15)', vivid:'saturate(1.6) contrast(1.1)',
  soft:'brightness(1.1) contrast(0.92)', vintage:'sepia(0.55) contrast(1.1) brightness(0.95)',
  bw:'grayscale(1)', cinema:'contrast(1.25) saturate(0.85) brightness(0.95)',
  golden:'sepia(0.6) saturate(1.3) hue-rotate(-15deg) brightness(1.08)'
};
function _buildFilterStr(fx, blurOverride) {
  var parts = [];
  var blur = blurOverride != null ? blurOverride : 0;
  if (blur > 0) parts.push('blur(' + blur + 'px)');
  if (fx && fx.filter && fx.filter !== 'none' && _FILTERS && _FILTERS[fx.filter]) parts.push(_FILTERS[fx.filter]);
  return parts.join(' ') || '';
}
function _applyFxToImg(img, fx) {
  if (!img || !fx) return;
  img.style.transform = _buildTransform(fx);
  img.style.filter = _buildFilterStr(fx);
  img.style.opacity = (fx.opacity != null ? fx.opacity : 100) / 100;
}

// ─── DURATION PROMPT ─────────────────────────────────────────────────────────
function _promptDuration(idx) {
  var scene = _state.scenes[idx];
  if (!scene) return;
  var val = window.prompt('Scene duration (seconds):', scene.duration || 5);
  if (val === null) return;
  var n = parseFloat(val);
  if (!n || n < 0.5) { _toast('Duration must be at least 0.5s.'); return; }
  scene.duration = n;
  scene.updatedAt = new Date().toISOString();
  _saveState();
  _renderImageStrip(idx);
  _renderRuler(idx);
  var timeEl = _el('lseb-time');
  if (timeEl) timeEl.textContent = '0.00 / ' + n.toFixed(2) + 's';
  _toast('Duration set to ' + n + 's');
}

// ─── DELETE SCENE ────────────────────────────────────────────────────────────
function _deleteScene(idx) {
  if (_state.scenes.length <= 1) { _toast('Cannot delete the last scene.'); return; }
  if (!window.confirm('Delete "' + _state.scenes[idx].title + '"?')) return;
  _stopPlayback();
  _state.scenes.splice(idx, 1);
  _state.selectedIdx = Math.min(idx, _state.scenes.length - 1);
  _saveState();
  _showStoryboard();
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────
function exportForBundle() {
  return {
    scenes: _state.scenes.map(function (s) {
      var out = Object.assign({}, s);
      out.media = { image: s.media.image, narration: null, music: null, sfxAudio: null };
      return out;
    }),
    exportedAt: new Date().toISOString()
  };
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
function init() {
  if (!document.getElementById('lseb-css')) {
    var style = document.createElement('style');
    style.id = 'lseb-css';
    style.textContent = _CSS;
    document.head.appendChild(style);
  }
  _initState();

  var section = document.getElementById('section-timeline-editor');
  if (!section) return;

  var _mounted = false;
  var obs = new MutationObserver(function () {
    if (section.classList.contains('active')) {
      if (!_mounted) { _mounted = true; _showStoryboard(); }
    } else {
      _mounted = false;
      _stopPlayback();
    }
  });
  obs.observe(section, { attributes: true, attributeFilter: ['class'] });

  if (section.classList.contains('active')) { _mounted = true; _showStoryboard(); }
}

// ─── PUBLIC ───────────────────────────────────────────────────────────────────
window.LSEditBay = {
  init: init,
  render: _showStoryboard,
  addScene: function () { _addScene(); _renderGrid(); },
  attachImage: function (idx, src) { _attachImage(idx, src); },
  exportForBundle: exportForBundle,
  getState: function () { return _state; }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  setTimeout(init, 0);
}

})();
