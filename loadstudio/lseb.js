// LoadStudio Editing Bay (lseb.js)
// Adapted from Load Eco mixer and scene-card-engine patterns.
// Self-contained — no runtime dependency on Load Eco.
// Reused: mixer pattern (lib-load-mixer.js), scene state shape (book-to-video-engine.js),
//         scene card render (book-to-video-ui.js), scene fields (scene-card-engine.js).
// Namespaced: window.LSEditBay (no collision with Load globals).
// Public API: init, render, addScene, deleteScene, selectScene, updateScene, moveScene,
//             attachImage, attachAudio, play, pause, togglePlay, prevScene, nextScene,
//             playProject, exportForBundle, getState.

(function () {
'use strict';

// ─── STORAGE ─────────────────────────────────────────────────────────────────
var STORE_KEY = 'ls_editbay_v1';

function _persist(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch(_) {}
}

function _restore() {
  try { var r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : null; }
  catch(_) { return null; }
}

// ─── SCENE FACTORY ───────────────────────────────────────────────────────────
// Scene shape matches Load Eco book-to-video-engine structure for future bundling.
function _newScene(title) {
  return {
    id: 'lseb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    title: title || 'Scene',
    summary: '',
    narration: '',
    dialogue: '',
    captions: '',
    musicMood: '',
    sfx: '',
    transition: 'cut',
    duration: 4,
    media: { image: null, narration: null, music: null, sfxAudio: null },
    status: 'empty',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ─── STATE ───────────────────────────────────────────────────────────────────
var _state = {
  scenes: [],
  selectedIdx: 0,
  playing: false,
  playTimer: null
};

function _initState() {
  var saved = _restore();
  if (saved && Array.isArray(saved.scenes) && saved.scenes.length) {
    _state.scenes = saved.scenes;
    _state.selectedIdx = Math.min(saved.selectedIdx || 0, _state.scenes.length - 1);
  } else {
    _state.scenes = [_newScene('Scene 1')];
    _state.selectedIdx = 0;
  }
}

function _saveState() {
  _persist({ scenes: _state.scenes, selectedIdx: _state.selectedIdx });
}

// ─── AUDIO PLAYBACK ──────────────────────────────────────────────────────────
// HTML Audio elements (dataURL safe, Safari-compatible).
// Adapted from lib-load-mixer.js lane/volume pattern.
var _LANES = { narration: 0.9, music: 0.3, sfxAudio: 0.5 };
var _audioEls = {};

function _playAudio(idx) {
  _stopAudio();
  var scene = _state.scenes[idx];
  if (!scene) return;
  Object.keys(_LANES).forEach(function (lane) {
    var src = scene.media[lane];
    if (!src) return;
    try {
      var el = new Audio(src);
      el.volume = _LANES[lane];
      el.play().catch(function () {});
      _audioEls[lane] = el;
    } catch (_) {}
  });
}

function _stopAudio() {
  Object.keys(_audioEls).forEach(function (k) {
    try { _audioEls[k].pause(); _audioEls[k].src = ''; } catch (_) {}
  });
  _audioEls = {};
}

// ─── SCENE OPS ───────────────────────────────────────────────────────────────
function addScene() {
  var scene = _newScene('Scene ' + (_state.scenes.length + 1));
  _state.scenes.push(scene);
  _state.selectedIdx = _state.scenes.length - 1;
  _saveState();
  render();
}

function deleteScene(idx) {
  if (_state.scenes.length <= 1) return;
  _state.scenes.splice(idx, 1);
  _state.selectedIdx = Math.min(_state.selectedIdx, _state.scenes.length - 1);
  _saveState();
  render();
}

function selectScene(idx) {
  if (idx < 0 || idx >= _state.scenes.length) return;
  _state.selectedIdx = idx;
  _renderStrip();
  _renderPreview();
  _renderTracks();
  _renderInspector();
}

function updateScene(idx, patch) {
  var scene = _state.scenes[idx];
  if (!scene) return;
  Object.keys(patch).forEach(function (k) { scene[k] = patch[k]; });
  scene.updatedAt = new Date().toISOString();
  _saveState();
}

function moveScene(fromIdx, toIdx) {
  var sc = _state.scenes;
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= sc.length || toIdx >= sc.length) return;
  var s = sc.splice(fromIdx, 1)[0];
  sc.splice(toIdx, 0, s);
  _state.selectedIdx = toIdx;
  _saveState();
  render();
}

// ─── MEDIA ATTACHMENT ────────────────────────────────────────────────────────
function attachImage(idx, src) {
  var scene = _state.scenes[idx];
  if (!scene) return;
  scene.media.image = src;
  if (scene.status === 'empty') scene.status = 'has-image';
  scene.updatedAt = new Date().toISOString();
  _saveState();
  if (idx === _state.selectedIdx) { _renderPreview(); _renderTracks(); }
  _refreshCard(idx);
}

function attachAudio(idx, lane, src) {
  var scene = _state.scenes[idx];
  if (!scene) return;
  scene.media[lane] = src;
  scene.updatedAt = new Date().toISOString();
  _saveState();
  if (idx === _state.selectedIdx) _renderTracks();
}

// ─── PLAYBACK ────────────────────────────────────────────────────────────────
function play() {
  if (_state.playing) return;
  _state.playing = true;
  var scene = _state.scenes[_state.selectedIdx];
  var dur = (scene && scene.duration > 0) ? scene.duration * 1000 : 4000;
  _playAudio(_state.selectedIdx);
  _setPlayBtn(true);
  _state.playTimer = setTimeout(function () {
    _state.playing = false;
    _stopAudio();
    _setPlayBtn(false);
  }, dur);
}

function pause() {
  if (!_state.playing) return;
  clearTimeout(_state.playTimer);
  _state.playing = false;
  _stopAudio();
  _setPlayBtn(false);
}

function togglePlay() { _state.playing ? pause() : play(); }

function prevScene() { pause(); selectScene(Math.max(0, _state.selectedIdx - 1)); }
function nextScene() { pause(); selectScene(Math.min(_state.scenes.length - 1, _state.selectedIdx + 1)); }

function playProject() {
  pause();
  _playSeq(0);
}

function _playSeq(idx) {
  if (idx >= _state.scenes.length) return;
  selectScene(idx);
  _state.playing = true;
  _playAudio(idx);
  _setPlayBtn(true);
  var scene = _state.scenes[idx];
  var dur = (scene && scene.duration > 0) ? scene.duration * 1000 : 4000;
  _state.playTimer = setTimeout(function () {
    _stopAudio();
    if (idx + 1 < _state.scenes.length) {
      _state.playing = false;
      _playSeq(idx + 1);
    } else {
      _state.playing = false;
      _setPlayBtn(false);
    }
  }, dur);
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────
function exportForBundle() {
  return {
    scenes: _state.scenes.map(function (s) {
      var out = {};
      Object.keys(s).forEach(function (k) { out[k] = s[k]; });
      // Strip inline audio blobs from bundle JSON to keep size manageable;
      // images retained for CinePWA scene assembly.
      out.media = { image: s.media.image, narration: null, music: null, sfxAudio: null };
      return out;
    }),
    exportedAt: new Date().toISOString()
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function _esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function _el(id) { return document.getElementById(id); }

function _setPlayBtn(isPlaying) {
  var btn = _el('lseb-play-btn');
  if (!btn) return;
  btn.innerHTML = isPlaying
    ? '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><polygon points="6 4 20 12 6 20"/></svg>';
  btn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
}

function _readDataURL(file) {
  return new Promise(function (res, rej) {
    var r = new FileReader();
    r.onload = function (e) { res(e.target.result); };
    r.onerror = function (e) { rej(e); };
    r.readAsDataURL(file);
  });
}

function _counter() {
  var c = _el('lseb-counter');
  if (c) c.textContent = (_state.selectedIdx + 1) + ' / ' + _state.scenes.length;
}

// ─── RENDER — FULL MOUNT ─────────────────────────────────────────────────────
function render() {
  var root = _el('lseb-root');
  if (!root) return;
  root.innerHTML = _shell();
  _bindShell();
  _renderStrip();
  _renderPreview();
  _renderTracks();
  _renderInspector();
}

function _shell() {
  return '<div class="lseb-wrap">' +
    '<div class="lseb-topbar">' +
      '<span class="lseb-brand">Editing Bay</span>' +
      '<div class="lseb-topbar-actions">' +
        '<button class="lseb-btn-sm" id="lseb-add-btn" type="button">+ Scene</button>' +
        '<button class="lseb-btn-sm" id="lseb-playall-btn" type="button">Play All</button>' +
        '<button class="lseb-btn-sm lseb-btn-save" id="lseb-save-btn" type="button">Save</button>' +
      '</div>' +
    '</div>' +
    '<div class="lseb-body">' +
      '<div class="lseb-strip-col">' +
        '<div class="lseb-col-head">Storyboard</div>' +
        '<div class="lseb-strip" id="lseb-strip"></div>' +
        '<button class="lseb-add-inline" id="lseb-add-inline" type="button">+ Add Scene</button>' +
      '</div>' +
      '<div class="lseb-main-col">' +
        '<div class="lseb-preview">' +
          '<div class="lseb-screen" id="lseb-screen">' +
            '<div class="lseb-screen-ph" id="lseb-screen-ph">No image attached</div>' +
            '<img class="lseb-screen-img" id="lseb-screen-img" src="" alt="" style="display:none">' +
          '</div>' +
          '<div class="lseb-controls">' +
            '<button class="lseb-ctrl" id="lseb-prev-btn" type="button" aria-label="Previous scene">' +
              '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="18 20 8 12 18 4"/><rect x="4" y="4" width="3" height="16"/></svg>' +
            '</button>' +
            '<button class="lseb-ctrl lseb-ctrl-play" id="lseb-play-btn" type="button" aria-label="Play">' +
              '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><polygon points="6 4 20 12 6 20"/></svg>' +
            '</button>' +
            '<button class="lseb-ctrl" id="lseb-next-btn" type="button" aria-label="Next scene">' +
              '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="6 4 16 12 6 20"/><rect x="17" y="4" width="3" height="16"/></svg>' +
            '</button>' +
            '<span class="lseb-counter" id="lseb-counter"></span>' +
          '</div>' +
        '</div>' +
        '<div class="lseb-tracks-panel">' +
          '<div class="lseb-panel-head">Tracks — selected scene</div>' +
          '<div class="lseb-tracks" id="lseb-tracks"></div>' +
        '</div>' +
        '<div class="lseb-insp-panel">' +
          '<div class="lseb-panel-head">Scene Details</div>' +
          '<div class="lseb-insp" id="lseb-insp"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function _bindShell() {
  function on(id, ev, fn) { var el = _el(id); if (el) el.addEventListener(ev, fn); }
  on('lseb-add-btn', 'click', addScene);
  on('lseb-add-inline', 'click', addScene);
  on('lseb-playall-btn', 'click', playProject);
  on('lseb-save-btn', 'click', function () {
    _saveState();
    var btn = _el('lseb-save-btn');
    if (btn) { btn.textContent = 'Saved'; setTimeout(function () { btn.textContent = 'Save'; }, 1200); }
  });
  on('lseb-prev-btn', 'click', prevScene);
  on('lseb-play-btn', 'click', togglePlay);
  on('lseb-next-btn', 'click', nextScene);
}

// ─── RENDER — SCENE STRIP ────────────────────────────────────────────────────
function _cardHTML(scene, i) {
  var thumb = scene.media.image
    ? '<img class="lseb-card-img" src="' + scene.media.image + '" alt="">'
    : '<div class="lseb-card-img lseb-card-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5-9 9"/></svg></div>';
  return thumb +
    '<div class="lseb-card-lbl">' + _esc(scene.title) + '</div>' +
    '<div class="lseb-card-dur">' + (scene.duration || 4) + 's</div>';
}

function _renderStrip() {
  var strip = _el('lseb-strip');
  if (!strip) return;
  strip.innerHTML = '';
  _state.scenes.forEach(function (scene, i) {
    var card = document.createElement('div');
    card.className = 'lseb-card' + (i === _state.selectedIdx ? ' active' : '');
    card.setAttribute('data-idx', i);
    card.innerHTML = _cardHTML(scene, i);
    card.addEventListener('click', function () { selectScene(i); });
    strip.appendChild(card);
  });
  _counter();
}

function _refreshCard(idx) {
  var strip = _el('lseb-strip');
  if (!strip) return;
  var cards = strip.querySelectorAll('.lseb-card');
  var card = cards[idx];
  if (!card) return;
  card.innerHTML = _cardHTML(_state.scenes[idx], idx);
}

// ─── RENDER — PREVIEW ────────────────────────────────────────────────────────
function _renderPreview() {
  var scene = _state.scenes[_state.selectedIdx];
  var ph = _el('lseb-screen-ph');
  var img = _el('lseb-screen-img');
  _counter();
  if (!scene || !scene.media.image) {
    if (ph) ph.style.display = '';
    if (img) { img.style.display = 'none'; img.src = ''; }
    return;
  }
  if (ph) ph.style.display = 'none';
  if (img) { img.src = scene.media.image; img.style.display = 'block'; }
}

// ─── RENDER — TRACKS ─────────────────────────────────────────────────────────
function _renderTracks() {
  var panel = _el('lseb-tracks');
  if (!panel) return;
  var scene = _state.scenes[_state.selectedIdx];
  if (!scene) { panel.innerHTML = '<p class="lseb-muted">No scene selected.</p>'; return; }

  var defs = [
    { lane: 'image',    label: 'Image',    accept: 'image/*',  key: 'image',    cls: 'lseb-t-img',  has: !!scene.media.image },
    { lane: 'narr',     label: 'Narration',accept: 'audio/*',  key: 'narration',cls: 'lseb-t-narr', has: !!scene.media.narration },
    { lane: 'music',    label: 'Music',    accept: 'audio/*',  key: 'music',    cls: 'lseb-t-music',has: !!scene.media.music },
    { lane: 'sfx',      label: 'SFX',      accept: 'audio/*',  key: 'sfxAudio', cls: 'lseb-t-sfx',  has: !!scene.media.sfxAudio },
    { lane: 'sub',      label: 'Subtitle', accept: null,        key: null,       cls: 'lseb-t-sub',  has: !!scene.captions },
    { lane: 'trans',    label: 'Transition',accept: null,       key: null,       cls: 'lseb-t-trans',has: true }
  ];

  panel.innerHTML = '';
  defs.forEach(function (d) {
    var row = document.createElement('div');
    row.className = 'lseb-track-row';

    var blockText = d.has
      ? (d.lane === 'sub' ? _esc(scene.captions).substring(0, 40) + '…' : d.lane === 'trans' ? _esc(scene.transition) : 'Attached')
      : 'Empty';

    var action = '';
    if (d.key && d.key !== null) {
      var fid = 'lseb-fi-' + d.lane;
      action = '<label class="lseb-track-btn" for="' + fid + '">' + (d.has ? 'Replace' : 'Attach') + '</label>' +
        '<input type="file" id="' + fid + '" accept="' + d.accept + '" ' +
        'style="position:absolute;left:-9999px;opacity:0;width:1px;height:1px" ' +
        'data-key="' + d.key + '" data-lane="' + d.lane + '">';
    }

    row.innerHTML =
      '<span class="lseb-track-lbl ' + d.cls + '">' + d.label + '</span>' +
      '<span class="lseb-track-block' + (d.has ? ' lseb-track-has' : '') + '">' + blockText + '</span>' +
      action;
    panel.appendChild(row);
  });

  panel.querySelectorAll('input[type=file]').forEach(function (inp) {
    inp.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var key = inp.dataset.key;
      var lane = inp.dataset.lane;
      _readDataURL(file).then(function (dataURL) {
        if (lane === 'image') attachImage(_state.selectedIdx, dataURL);
        else attachAudio(_state.selectedIdx, key, dataURL);
      }).catch(function () {});
    });
  });
}

// ─── RENDER — INSPECTOR ──────────────────────────────────────────────────────
function _renderInspector() {
  var panel = _el('lseb-insp');
  if (!panel) return;
  var idx = _state.selectedIdx;
  var scene = _state.scenes[idx];
  if (!scene) { panel.innerHTML = '<p class="lseb-muted">No scene selected.</p>'; return; }

  panel.innerHTML =
    '<div class="lseb-field">' +
      '<label class="lseb-lbl">Title</label>' +
      '<input class="lseb-inp" id="lseb-f-title" value="' + _esc(scene.title) + '" placeholder="Scene title">' +
    '</div>' +
    '<div class="lseb-field lseb-field-row2">' +
      '<div>' +
        '<label class="lseb-lbl">Duration (s)</label>' +
        '<input class="lseb-inp lseb-inp-sm" id="lseb-f-dur" type="number" min="1" max="600" value="' + (scene.duration || 4) + '">' +
      '</div>' +
      '<div>' +
        '<label class="lseb-lbl">Transition</label>' +
        '<select class="lseb-inp" id="lseb-f-trans">' +
          ['cut','fade','dissolve','wipe'].map(function (t) {
            return '<option value="' + t + '"' + (scene.transition === t ? ' selected' : '') + '>' + t.charAt(0).toUpperCase() + t.slice(1) + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="lseb-field">' +
      '<label class="lseb-lbl">Narration script</label>' +
      '<textarea class="lseb-ta" id="lseb-f-narr" placeholder="Voiceover script for this scene">' + _esc(scene.narration) + '</textarea>' +
    '</div>' +
    '<div class="lseb-field">' +
      '<label class="lseb-lbl">Captions / Subtitles</label>' +
      '<textarea class="lseb-ta" id="lseb-f-caps" placeholder="Caption text">' + _esc(scene.captions) + '</textarea>' +
    '</div>' +
    '<div class="lseb-field">' +
      '<label class="lseb-lbl">Music mood</label>' +
      '<input class="lseb-inp" id="lseb-f-music" value="' + _esc(scene.musicMood) + '" placeholder="e.g. Cinematic underscore, Tense, Warm">' +
    '</div>' +
    '<div class="lseb-field">' +
      '<label class="lseb-lbl">SFX notes</label>' +
      '<input class="lseb-inp" id="lseb-f-sfx" value="' + _esc(scene.sfx) + '" placeholder="e.g. Room tone, Footsteps">' +
    '</div>' +
    '<div class="lseb-field lseb-field-actions">' +
      '<button class="lseb-btn-danger" id="lseb-del-btn" type="button">Delete Scene</button>' +
      '<button class="lseb-btn-sm" id="lseb-ai-img-btn" type="button">Attach from AI Director</button>' +
    '</div>';

  var binds = { 'lseb-f-title': 'title', 'lseb-f-narr': 'narration', 'lseb-f-caps': 'captions',
                'lseb-f-music': 'musicMood', 'lseb-f-sfx': 'sfx' };
  Object.keys(binds).forEach(function (id) {
    var el = _el(id);
    if (!el) return;
    var key = binds[id];
    el.addEventListener('input', function () {
      var patch = {}; patch[key] = el.value;
      updateScene(idx, patch);
      if (key === 'title') _refreshCard(idx);
    });
  });

  var durEl = _el('lseb-f-dur');
  if (durEl) durEl.addEventListener('change', function () {
    updateScene(idx, { duration: Math.max(1, parseInt(durEl.value, 10) || 4) });
    _refreshCard(idx);
  });

  var transEl = _el('lseb-f-trans');
  if (transEl) transEl.addEventListener('change', function () {
    updateScene(idx, { transition: transEl.value });
    _renderTracks();
  });

  var delBtn = _el('lseb-del-btn');
  if (delBtn) delBtn.addEventListener('click', function () { if (_state.scenes.length > 1) deleteScene(idx); });

  var aiBtn = _el('lseb-ai-img-btn');
  if (aiBtn) aiBtn.addEventListener('click', function () {
    try {
      var takes = JSON.parse(localStorage.getItem('loadstudio_ai_image_director_takes') || '[]');
      var approved = takes.filter(function (t) { return t.verdict === 'approved' && t.image; });
      if (!approved.length) {
        aiBtn.textContent = 'No approved images yet';
        setTimeout(function () { aiBtn.textContent = 'Attach from AI Director'; }, 2000);
        return;
      }
      attachImage(idx, approved[approved.length - 1].image);
      aiBtn.textContent = 'Attached';
      setTimeout(function () { aiBtn.textContent = 'Attach from AI Director'; }, 1500);
    } catch (e) {
      aiBtn.textContent = 'Could not read Director takes';
      setTimeout(function () { aiBtn.textContent = 'Attach from AI Director'; }, 2000);
    }
  });
}

// ─── CSS (injected once) ─────────────────────────────────────────────────────
var _CSS = [
  '.lseb-wrap{display:flex;flex-direction:column;height:100%;min-height:100vh;background:#0a0a14;font-family:Inter,system-ui,sans-serif;color:#f5f0ff}',
  '.lseb-topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#12081e;border-bottom:1px solid rgba(125,42,232,.25);position:sticky;top:0;z-index:10}',
  '.lseb-brand{font:700 16px Inter,system-ui,sans-serif;color:#b388ff;letter-spacing:-.01em}',
  '.lseb-topbar-actions{display:flex;gap:8px}',
  '.lseb-btn-sm{padding:7px 14px;background:rgba(125,42,232,.18);border:1px solid rgba(125,42,232,.4);border-radius:8px;color:#e0d8f8;font:600 12px Inter,system-ui,sans-serif;cursor:pointer}',
  '.lseb-btn-sm:active{background:rgba(125,42,232,.35)}',
  '.lseb-btn-save{background:rgba(94,224,165,.1);border-color:rgba(94,224,165,.4);color:#5ee0a5}',
  '.lseb-body{display:flex;flex:1;min-height:0;overflow:hidden}',
  /* Strip */
  '.lseb-strip-col{width:108px;flex-shrink:0;background:#0e0720;border-right:1px solid rgba(125,42,232,.2);display:flex;flex-direction:column;overflow:hidden}',
  '.lseb-col-head,.lseb-panel-head{padding:8px 10px;font:700 10px Inter,system-ui,sans-serif;color:#a78bfa;letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid rgba(125,42,232,.15)}',
  '.lseb-strip{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:6px 5px;display:flex;flex-direction:column;gap:5px}',
  '.lseb-card{border-radius:8px;border:1.5px solid rgba(125,42,232,.2);background:#160b26;cursor:pointer;overflow:hidden;transition:border-color .15s}',
  '.lseb-card.active{border-color:#b33af0}',
  '.lseb-card:hover{border-color:rgba(125,42,232,.5)}',
  '.lseb-card-img{width:100%;aspect-ratio:16/9;display:block;object-fit:cover;background:#0a0a14}',
  '.lseb-card-empty{display:flex;align-items:center;justify-content:center;color:#2a1e45;background:#0a0a14;width:100%;aspect-ratio:16/9}',
  '.lseb-card-lbl{padding:3px 5px 0;font:600 9px Inter,system-ui,sans-serif;color:#c0b8d9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.lseb-card-dur{padding:1px 5px 4px;font:400 8px Inter,system-ui,sans-serif;color:#4a3f6a}',
  '.lseb-add-inline{margin:6px 5px;padding:7px 4px;background:transparent;border:1px dashed rgba(125,42,232,.3);border-radius:7px;color:#5a4a7a;font:500 10px Inter,system-ui,sans-serif;cursor:pointer;text-align:center}',
  '.lseb-add-inline:hover{color:#b388ff;border-color:rgba(125,42,232,.6)}',
  /* Main */
  '.lseb-main-col{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;-webkit-overflow-scrolling:touch}',
  /* Preview */
  '.lseb-preview{padding:14px 14px 6px}',
  '.lseb-screen{width:100%;max-width:760px;aspect-ratio:16/9;background:#000;border-radius:10px;overflow:hidden;border:1.5px solid rgba(125,42,232,.3);position:relative;margin:0 auto}',
  '.lseb-screen-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#1e1630;font:400 13px Inter,system-ui,sans-serif}',
  '.lseb-screen-img{width:100%;height:100%;object-fit:contain;display:block}',
  /* Controls */
  '.lseb-controls{display:flex;align-items:center;justify-content:center;gap:12px;padding:9px 0}',
  '.lseb-ctrl{width:38px;height:38px;border-radius:50%;background:rgba(125,42,232,.2);border:1px solid rgba(125,42,232,.4);color:#e0d8f8;cursor:pointer;display:flex;align-items:center;justify-content:center}',
  '.lseb-ctrl-play{width:46px;height:46px;background:linear-gradient(135deg,#7d2ae8,#b33af0);border:none;color:#fff}',
  '.lseb-counter{font:500 12px Inter,system-ui,sans-serif;color:#7a6fa0;min-width:44px;text-align:center}',
  /* Tracks */
  '.lseb-tracks-panel{padding:0 14px 8px}',
  '.lseb-panel-head{border-bottom:0;border-top:1px solid rgba(125,42,232,.15);padding:8px 0 5px}',
  '.lseb-tracks{display:flex;flex-direction:column;gap:4px}',
  '.lseb-track-row{display:flex;align-items:center;gap:7px;min-height:30px}',
  '.lseb-track-lbl{width:76px;flex-shrink:0;font:600 10px Inter,system-ui,sans-serif;padding:3px 7px;border-radius:5px;text-align:center}',
  '.lseb-t-img{background:rgba(179,58,240,.12);color:#c084fc;border:1px solid rgba(179,58,240,.25)}',
  '.lseb-t-narr{background:rgba(94,224,165,.08);color:#5ee0a5;border:1px solid rgba(94,224,165,.2)}',
  '.lseb-t-music{background:rgba(96,165,250,.08);color:#60a5fa;border:1px solid rgba(96,165,250,.2)}',
  '.lseb-t-sfx{background:rgba(251,210,74,.08);color:#fbd24a;border:1px solid rgba(251,210,74,.2)}',
  '.lseb-t-sub{background:rgba(255,168,82,.08);color:#ffa852;border:1px solid rgba(255,168,82,.2)}',
  '.lseb-t-trans{background:rgba(156,156,255,.08);color:#9c9cff;border:1px solid rgba(156,156,255,.2)}',
  '.lseb-track-block{flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:5px;padding:3px 9px;font:400 10px Inter,system-ui,sans-serif;color:#3a2e55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.lseb-track-block.lseb-track-has{color:#c0b8d9;background:rgba(125,42,232,.1);border-color:rgba(125,42,232,.28)}',
  '.lseb-track-btn{padding:3px 9px;background:rgba(125,42,232,.15);border:1px solid rgba(125,42,232,.3);border-radius:5px;color:#b388ff;font:500 10px Inter,system-ui,sans-serif;cursor:pointer;white-space:nowrap}',
  /* Inspector */
  '.lseb-insp-panel{padding:0 14px 28px}',
  '.lseb-insp{display:flex;flex-direction:column;gap:9px;padding-top:4px}',
  '.lseb-field{display:flex;flex-direction:column;gap:3px}',
  '.lseb-field-row2{flex-direction:row;gap:14px}',
  '.lseb-field-row2>div{flex:1;display:flex;flex-direction:column;gap:3px}',
  '.lseb-field-actions{flex-direction:row;gap:8px;flex-wrap:wrap;margin-top:2px}',
  '.lseb-lbl{font:500 11px Inter,system-ui,sans-serif;color:#9c93b5;letter-spacing:.03em}',
  '.lseb-inp{background:#0e0720;border:1px solid rgba(125,42,232,.35);border-radius:8px;color:#f5f0ff;font:400 13px Inter,system-ui,sans-serif;padding:7px 11px;width:100%;box-sizing:border-box}',
  '.lseb-inp-sm{width:auto;max-width:80px}',
  '.lseb-ta{background:#0e0720;border:1px solid rgba(125,42,232,.35);border-radius:8px;color:#f5f0ff;font:400 13px Inter,system-ui,sans-serif;padding:7px 11px;width:100%;box-sizing:border-box;min-height:56px;resize:vertical}',
  '.lseb-btn-danger{padding:7px 13px;background:rgba(255,80,80,.1);border:1px solid rgba(255,80,80,.28);border-radius:8px;color:#ff8080;font:600 12px Inter,system-ui,sans-serif;cursor:pointer}',
  '.lseb-muted{color:#3a2e55;font:400 12px Inter,system-ui,sans-serif}',
  '@media(max-width:520px){.lseb-strip-col{width:82px}.lseb-track-lbl{width:58px}.lseb-controls{gap:8px}}'
].join('');

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

  var obs = new MutationObserver(function () {
    if (section.classList.contains('active')) {
      var root = _el('lseb-root');
      if (root && !root.querySelector('.lseb-wrap')) render();
    }
  });
  obs.observe(section, { attributes: true, attributeFilter: ['class'] });

  setTimeout(function () {
    if (section.classList.contains('active') && _el('lseb-root')) render();
  }, 80);
}

// ─── PUBLIC ───────────────────────────────────────────────────────────────────
window.LSEditBay = {
  init: init, render: render,
  addScene: addScene, deleteScene: deleteScene, selectScene: selectScene,
  updateScene: updateScene, moveScene: moveScene,
  attachImage: attachImage, attachAudio: attachAudio,
  play: play, pause: pause, togglePlay: togglePlay,
  prevScene: prevScene, nextScene: nextScene, playProject: playProject,
  exportForBundle: exportForBundle,
  getState: function () { return _state; }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  setTimeout(init, 0);
}

})();
