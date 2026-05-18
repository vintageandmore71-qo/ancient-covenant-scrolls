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
var _ctxData = null;

var _MUSIC_DEMO = {
  'vlog':       [{id:'music-demo-0',t:'Mellow Demo',a:'Demo',d:'0:30',c:'#7d2ae8',k:'music-mellow'}],
  'pop':        [{id:'music-demo-1',t:'Upbeat Demo',a:'Demo',d:'0:30',c:'#e82a7d',k:'music-modern'}],
  'dynamic':    [{id:'music-demo-2',t:'Energetic Demo',a:'Demo',d:'0:30',c:'#2ae8a0',k:'music-energetic'}],
  'fresh':      [],
  'acoustic':   [],
  'electronic': [],
  'hiphop':     []
};

// cs=commercialSafe  ar=attributionRequired  po=personalOnly
var _SFX_DEMO = {
  'cartoon':     [{id:'sfx-l-cartoon',  t:'Spring Boing',     a:'CC0 / Local', d:'0:01', c:'#ff9500', k:'sfx-local-cartoon',     license:'CC0', cs:true,  ar:false, po:false}],
  'swish':       [{id:'sfx-l-swish',    t:'Air Whoosh',       a:'CC0 / Local', d:'0:01', c:'#4cd964', k:'sfx-local-swish',       license:'CC0', cs:true,  ar:false, po:false}],
  'funny':       [{id:'sfx-l-funny',    t:'Wobble Boing',     a:'CC0 / Local', d:'0:01', c:'#ffcc00', k:'sfx-local-funny',       license:'CC0', cs:true,  ar:false, po:false}],
  'machine':     [{id:'sfx-l-machine',  t:'Mechanical Tick',  a:'CC0 / Local', d:'0:01', c:'#8e8e93', k:'sfx-local-machine',     license:'CC0', cs:true,  ar:false, po:false}],
  'ringing':     [{id:'sfx-l-ringing',  t:'Bell Ding',        a:'CC0 / Local', d:'0:01', c:'#5ac8fa', k:'sfx-local-ringing',     license:'CC0', cs:true,  ar:false, po:false}],
  'vehicles':    [{id:'sfx-l-vehicles', t:'Engine Rumble',    a:'CC0 / Local', d:'0:02', c:'#ff6b35', k:'sfx-local-vehicles',    license:'CC0', cs:true,  ar:false, po:false}],
  'weather':     [{id:'sfx-l-weather',  t:'Storm Rain',       a:'CC0 / Local', d:'0:02', c:'#34aadc', k:'sfx-local-weather',     license:'CC0', cs:true,  ar:false, po:false}],
  'variety':     [{id:'sfx-l-variety',  t:'Fanfare',          a:'CC0 / Local', d:'0:01', c:'#bf5af2', k:'sfx-local-variety',     license:'CC0', cs:true,  ar:false, po:false}],
  'vlogsf':      [{id:'sfx-l-vlogsf',   t:'Notification Pop', a:'CC0 / Local', d:'0:01', c:'#30b0c7', k:'sfx-local-vlogsf',      license:'CC0', cs:true,  ar:false, po:false}],
  'physical':    [{id:'sfx-l-physical', t:'Impact Hit',       a:'CC0 / Local', d:'0:01', c:'#ff6b35', k:'sfx-local-physical',    license:'CC0', cs:true,  ar:false, po:false}],
  'transitions': [{id:'sfx-l-trans',    t:'Transition Sweep', a:'CC0 / Local', d:'0:01', c:'#5e5ce6', k:'sfx-local-transitions', license:'CC0', cs:true,  ar:false, po:false}],
  'cues':        [{id:'sfx-l-cues',     t:'Dramatic Hit',     a:'CC0 / Local', d:'0:01', c:'#ff3b30', k:'sfx-local-cues',        license:'CC0', cs:true,  ar:false, po:false}],
  'game':        [{id:'sfx-l-game',     t:'Coin Collect',     a:'CC0 / Local', d:'0:01', c:'#30d158', k:'sfx-local-game',        license:'CC0', cs:true,  ar:false, po:false}],
  'emotion':     [{id:'sfx-l-emotion',  t:'Chord Swell',      a:'CC0 / Local', d:'0:02', c:'#ff9f0a', k:'sfx-local-emotion',     license:'CC0', cs:true,  ar:false, po:false}]
};

// ─── LOCAL AUDIO MAP — all paths served by the SW cache ─────────────────────
// Music + legacy SFX demo: assets/audio/demo/  (creator-owned, commercial OK)
// Per-category SFX:        assets/sfx/         (CC0, creator-owned synth WAVs)
var _DEMO_AUDIO = {
  'music-mellow':          'assets/audio/demo/demo-music-mellow.wav',
  'music-modern':          'assets/audio/demo/demo-music-upbeat.wav',
  'music-energetic':       'assets/audio/demo/demo-music-energetic.wav',
  // Legacy aliases kept so old saved scenes continue to resolve
  'sfx-spring':            'assets/audio/demo/demo-sfx-boing.wav',
  'sfx-swish':             'assets/audio/demo/demo-sfx-whoosh.wav',
  'sfx-ding':              'assets/audio/demo/demo-sfx-ding.wav',
  'sfx-hit':               'assets/audio/demo/demo-sfx-hit.wav',
  'sfx-rumble':            'assets/audio/demo/demo-sfx-rumble.wav',
  // Per-category local SFX (CC0, creator-owned synthesised WAVs in assets/sfx/)
  'sfx-local-cartoon':     'assets/sfx/sfx-cartoon.wav',
  'sfx-local-swish':       'assets/sfx/sfx-swish.wav',
  'sfx-local-funny':       'assets/sfx/sfx-funny.wav',
  'sfx-local-machine':     'assets/sfx/sfx-machine.wav',
  'sfx-local-ringing':     'assets/sfx/sfx-ringing.wav',
  'sfx-local-vehicles':    'assets/sfx/sfx-vehicles.wav',
  'sfx-local-weather':     'assets/sfx/sfx-weather.wav',
  'sfx-local-variety':     'assets/sfx/sfx-variety.wav',
  'sfx-local-vlogsf':      'assets/sfx/sfx-vlogsf.wav',
  'sfx-local-physical':    'assets/sfx/sfx-physical.wav',
  'sfx-local-transitions': 'assets/sfx/sfx-transitions.wav',
  'sfx-local-cues':        'assets/sfx/sfx-cues.wav',
  'sfx-local-game':        'assets/sfx/sfx-game.wav',
  'sfx-local-emotion':     'assets/sfx/sfx-emotion.wav'
};
// Deduplication map: normalized URL → cached data URL.
// Prevents re-downloading the same provider sound when Add is tapped multiple times.
var _sfxCache = {};
function _sfxCacheKey(url) { return (url || '').split('?')[0].toLowerCase().slice(-120); }
var _musicCache = {};
function _musicCacheKey(url) { return (url || '').split('?')[0].toLowerCase().slice(-120); }

var _NOTE_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.5" width="18" height="18"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
var _SPK_ICO  = '<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.5" width="18" height="18"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
var _PLAY_ICO = '<svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><polygon points="6 4 20 12 6 20"/></svg>';
var _STOP_ICO = '<svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><rect x="5" y="5" width="14" height="14" rx="1"/></svg>';

// ─── Singleton preview audio controller ──────────────────────────────────────
// One Audio instance at a time. Toggle tap stops. Panel close stops.
// Timeline play stops. Button reflects: idle / loading / playing / failed.
var _PreviewCtrl = (function () {
  var _audio = null;
  var _activeBtn = null;
  function _setState(btn, state) {
    if (!btn) return;
    btn.dataset.previewState = state;
    if (state === 'idle')    { btn.innerHTML = _PLAY_ICO; btn.disabled = false; }
    else if (state === 'loading') { btn.textContent = '…'; btn.disabled = true; }
    else if (state === 'playing') { btn.innerHTML = _STOP_ICO; btn.disabled = false; }
    else if (state === 'failed')  { btn.textContent = '!'; btn.disabled = false; }
  }
  function stop() {
    if (_audio) { try { _audio.pause(); _audio.src = ''; } catch (_) {} _audio = null; }
    if (_activeBtn) { _setState(_activeBtn, 'idle'); _activeBtn = null; }
  }
  function play(btn, src) {
    stop();
    if (!src) { if (btn) _setState(btn, 'failed'); return; }
    _activeBtn = btn;
    _setState(btn, 'loading');
    // Use new Audio(src) constructor so play() is called synchronously
    // in the user-gesture context — required for iOS Safari.
    // Waiting for oncanplay puts play() in an async callback where Safari
    // may block it, especially for very short SFX files.
    var a = new Audio(src);
    a.volume = 0.6;
    _audio = a;
    a.onerror = function () {
      if (_activeBtn === btn) { _audio = null; _setState(btn, 'failed'); _activeBtn = null; }
    };
    a.onended = function () {
      _audio = null;
      if (_activeBtn === btn) { _setState(btn, 'idle'); _activeBtn = null; }
    };
    var p = a.play();
    if (p && typeof p.then === 'function') {
      p.then(function () {
        if (_activeBtn === btn) _setState(btn, 'playing');
      }).catch(function () {
        if (_activeBtn === btn) { _audio = null; _setState(btn, 'failed'); _activeBtn = null; }
      });
    } else {
      _setState(btn, 'playing');
    }
  }
  function toggle(btn, src) {
    if (_activeBtn === btn) { stop(); return; }
    play(btn, src);
  }
  function isActive(btn) { return _activeBtn === btn; }
  return { stop: stop, play: play, toggle: toggle, isActive: isActive };
}());

var _currentMusicCat = 'all';
var _currentSfxCat   = 'all';

function _buildAssetList(listId, demo, cat, q, icon, trackKind, tone, audioKeyMap) {
  var list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = '';
  var keys = cat === 'all' ? Object.keys(demo) : [cat];
  var lq = (q || '').toLowerCase();
  keys.forEach(function (k) {
    var catAudioKey = audioKeyMap && audioKeyMap[k];
    (demo[k] || []).forEach(function (tr) {
      if (lq && tr.t.toLowerCase().indexOf(lq) < 0 && tr.a.toLowerCase().indexOf(lq) < 0) return;
      var audioKey = tr.k || catAudioKey;
      var audioSrc = (audioKey && _DEMO_AUDIO && _DEMO_AUDIO[audioKey]) || null;
      var row = document.createElement('div');
      row.className = 've-asset-row';
      if (tr.id) row.dataset.itemId = tr.id;
      var hasAudio   = !!audioSrc;
      var idAttr     = tr.id ? ' data-item-id="'+tr.id+'"' : '';
      var sqAttr     = (trackKind === 'music') ? ' data-search-query="'+tr.t.replace(/"/g,'')+'"' : '';
      var playAttrs  = hasAudio ? 'data-tone="'+tone+'" data-audio-key="'+audioKey+'" data-src="'+audioSrc+'"'+idAttr+sqAttr : 'data-tone="'+tone+'" data-no-src="1"'+idAttr+sqAttr;
      var _lic  = tr.license || 'CC0';
      var _cs   = tr.cs  !== false ? '1' : '0';
      var _ar   = tr.ar  ? '1' : '0';
      var _po   = tr.po  ? '1' : '0';
      var _su   = (tr.sourceUrl || '').replace(/"/g, '');
      var licAttrs = ' data-license="'+_lic+'" data-cs="'+_cs+'" data-ar="'+_ar+'" data-po="'+_po+'" data-source-url="'+_su+'" data-provider="local"';
      var addAttrs   = (hasAudio ? 'data-audio-key="'+audioKey+'" data-src="'+audioSrc+'"'+idAttr : 'data-no-src="1"'+idAttr) + licAttrs;
      var subText    = tr.d + (hasAudio ? (' \xb7 ' + _lic) : ' \xb7 Source missing');
      row.innerHTML =
        '<div class="ve-asset-art" style="background:linear-gradient(135deg,' + tr.c + ',' + tr.c + '88)">' + icon + '</div>' +
        '<div class="ve-asset-info">' +
          '<span class="ve-asset-title">' + (tr.t.length > 22 ? tr.t.slice(0, 21) + '…' : tr.t) + '</span>' +
          '<span class="ve-asset-sub">' + subText + '</span>' +
        '</div>' +
        '<div class="ve-asset-acts">' +
          '<button class="ve-asset-play" type="button" ' + playAttrs + ' aria-label="Preview">' + _PLAY_ICO + '</button>' +
          '<button class="ve-asset-add" type="button" data-add-track="' + trackKind + '" ' + addAttrs + ' data-tn="' + tr.t.replace(/"/g,'') + '" data-ta="' + tr.a.replace(/"/g,'') + '" data-td="' + tr.d + '">Add</button>' +
        '</div>';
      list.appendChild(row);
    });
  });
  if (!list.children.length) {
    list.innerHTML = '<p style="color:#5a5a78;font:400 12px system-ui,sans-serif;text-align:center;margin:18px 0">No results.</p>';
  }
}
function _buildMusicList(cat, q) {
  _currentMusicCat = cat || 'all';
  _buildAssetList('lseb-music-list', _MUSIC_DEMO, _currentMusicCat, q, _NOTE_ICO, 'music', 'music', {});
  var list = document.getElementById('lseb-music-list');
  if (!list) return;
  var reg = window.LoadProviderRegistry;
  if (!reg) return;
  var _MUSIC_QUERY_MAP = {
    'vlog':'vlog background music chill',
    'pop':'pop music upbeat',
    'dynamic':'dynamic energetic cinematic',
    'fresh':'fresh upbeat positive',
    'acoustic':'acoustic guitar folk',
    'electronic':'electronic synth beat',
    'hiphop':'hip hop rap beat'
  };
  var searchQ = q || (_currentMusicCat === 'all' ? 'music' : (_MUSIC_QUERY_MAP[_currentMusicCat] || _currentMusicCat));
  var fsKey = null;
  try { var fsS = JSON.parse(localStorage.getItem('lpr_settings_v1') || '{}'); fsKey = (fsS['freesound'] || {}).apiKey || null; } catch (_) {}
  var providers = ['ccmixter', 'openverse-audio'];
  if (fsKey) providers.push('freesound');
  var loader = document.createElement('p');
  loader.id = 'lseb-music-loader';
  loader.style.cssText = 'color:#7d2ae8;font:400 12px system-ui,sans-serif;text-align:center;margin:6px 0';
  loader.textContent = 'Searching...';
  list.insertBefore(loader, list.firstChild);
  var _tryMusicProvider = function (idx) {
    if (idx >= providers.length) {
      var ldr = document.getElementById('lseb-music-loader'); if (ldr) ldr.remove(); return;
    }
    reg.searchMusic({query: searchQ, providerId: providers[idx]}).then(function (result) {
      if (!result.results || !result.results.length) { _tryMusicProvider(idx + 1); return; }
      var ldr = document.getElementById('lseb-music-loader'); if (ldr) ldr.remove();
      var frag = document.createDocumentFragment();
      result.results.forEach(function (item) {
        if (!item.previewUrl) return;
        var dur = item.duration || 0;
        // Openverse/Jamendo returns duration in milliseconds despite API docs saying seconds.
        // Any value > 3600 is certainly milliseconds — convert it.
        if (dur > 3600) dur = Math.round(dur / 1000);
        var durStr = Math.floor(dur / 60) + ':' + String(Math.round(dur % 60)).padStart(2, '0');
        var row = document.createElement('div');
        row.className = 've-asset-row';
        var safeTitle = (item.title || '').replace(/"/g, '');
        var safeAttr  = (item.attribution || '').replace(/"/g, '');
        row.innerHTML =
          '<div class="ve-asset-art" style="background:linear-gradient(135deg,#1f5a80,#1f5a8088)">' + _NOTE_ICO + '</div>' +
          '<div class="ve-asset-info">' +
            '<span class="ve-asset-title">' + (safeTitle.length > 22 ? safeTitle.slice(0, 21) + '…' : safeTitle) + '</span>' +
            '<span class="ve-asset-sub">' + durStr + ' \xb7 ' + (item.attribution || item.provider) + '</span>' +
          '</div>' +
          '<div class="ve-asset-acts">' +
            '<button class="ve-asset-play" type="button" data-tone="music" data-src="' + item.previewUrl + '" aria-label="Preview">' + _PLAY_ICO + '</button>' +
            '<button class="ve-asset-add" type="button" data-add-track="music" data-src="' + item.previewUrl + '" data-provider="' + item.provider + '" data-license="' + (item.licenseType || '') + '" data-tn="' + safeTitle + '" data-ta="' + safeAttr + '" data-td="' + durStr + '">Add</button>' +
          '</div>';
        frag.appendChild(row);
      });
      var currentList = document.getElementById('lseb-music-list');
      if (currentList && frag.childNodes.length) currentList.insertBefore(frag, currentList.firstChild);
    }).catch(function () { _tryMusicProvider(idx + 1); });
  };
  _tryMusicProvider(0);
}

function _buildSFXList(cat, q) {
  _currentSfxCat = cat || 'all';
  _buildAssetList('lseb-sfx-list', _SFX_DEMO, _currentSfxCat, q, _SPK_ICO, 'sfx', 'sfx', {});
  var list = document.getElementById('lseb-sfx-list');
  if (!list) return;
  var reg = window.LoadProviderRegistry;
  if (!reg) { _appendConnectBanner(list, 'sfx'); return; }
  var fsKey = null;
  try { var fsS = JSON.parse(localStorage.getItem('lpr_settings_v1') || '{}'); fsKey = (fsS['freesound'] || {}).apiKey || null; } catch (_) {}
  var sfxProviders = ['mixkit-sfx', 'openverse-sfx', 'bbc-sfx', 'openverse-audio'];
  if (fsKey) sfxProviders.push('freesound');
  var _SFX_QUERY_MAP = {
    'cartoon':'cartoon sound effect', 'swish':'whoosh swish air',
    'funny':'funny comedy sound', 'machine':'machine mechanical',
    'ringing':'ring bell notification', 'vehicles':'car engine vehicle',
    'weather':'thunder rain wind', 'variety':'fanfare game show',
    'vlogsf':'notification click vlog', 'physical':'impact hit punch',
    'transitions':'transition whoosh sweep', 'cues':'dramatic suspense alert',
    'game':'game coin level up', 'emotion':'applause crowd cheer'
  };
  var searchQ = q || (_currentSfxCat === 'all' ? 'sound effect' : (_SFX_QUERY_MAP[_currentSfxCat] || _currentSfxCat));
  var loader = document.createElement('p');
  loader.id = 'lseb-sfx-loader';
  loader.style.cssText = 'color:#7d2ae8;font:400 12px system-ui,sans-serif;text-align:center;margin:6px 0';
  loader.textContent = 'Searching...';
  list.insertBefore(loader, list.firstChild);
  // per-provider commercial-safe / attribution / personal-only metadata
  var _SFX_PROVIDER_META = {
    'mixkit-sfx':      {cs:true,  ar:false, po:false, license:'Royalty-Free'},
    'openverse-sfx':   {cs:null,  ar:true,  po:false, license:'CC-BY'},
    'bbc-sfx':         {cs:false, ar:true,  po:true,  license:'Personal/Educational'},
    'openverse-audio': {cs:null,  ar:true,  po:false, license:'CC-BY'},
    'freesound':       {cs:null,  ar:true,  po:false, license:'CC-BY'}
  };
  var _appendSFXRows = function (results, pid) {
    var pmeta = _SFX_PROVIDER_META[pid] || {cs:null, ar:true, po:false, license:'Unknown'};
    var frag = document.createDocumentFragment();
    results.forEach(function (item) {
      if (!item.previewUrl) return;
      var dur = item.duration || 0;
      if (dur > 3600) dur = Math.round(dur / 1000);
      var durStr = (dur < 60 ? '0:' : Math.floor(dur / 60) + ':') + String(Math.round(dur % 60)).padStart(2, '0');
      var row = document.createElement('div');
      row.className = 've-asset-row';
      var safeTitle = (item.title || '').replace(/"/g, '');
      var safeAttr  = (item.attribution || item.provider || '').replace(/"/g, '');
      var lic = item.licenseType || pmeta.license;
      var cs  = (item.commercialSafe != null ? item.commercialSafe : pmeta.cs);
      var ar  = pmeta.ar;
      var po  = pmeta.po;
      var csBadge = cs === true ? ' CC' : cs === false ? ' (personal)' : '';
      row.innerHTML =
        '<div class="ve-asset-art" style="background:linear-gradient(135deg,#1f6640,#1f664088)">' + _SPK_ICO + '</div>' +
        '<div class="ve-asset-info">' +
          '<span class="ve-asset-title">' + (safeTitle.length > 22 ? safeTitle.slice(0, 21) + '…' : safeTitle) + '</span>' +
          '<span class="ve-asset-sub">' + durStr + ' \xb7 ' + lic + csBadge + '</span>' +
        '</div>' +
        '<div class="ve-asset-acts">' +
          '<button class="ve-asset-play" type="button" data-tone="sfx" data-src="' + item.previewUrl + '" aria-label="Preview">' + _PLAY_ICO + '</button>' +
          '<button class="ve-asset-add" type="button" data-add-track="sfx"' +
            ' data-src="' + item.previewUrl + '"' +
            ' data-provider="' + (pid || item.provider || '') + '"' +
            ' data-license="' + lic + '"' +
            ' data-cs="' + (cs === true ? '1' : cs === false ? '0' : '') + '"' +
            ' data-ar="' + (ar ? '1' : '0') + '"' +
            ' data-po="' + (po ? '1' : '0') + '"' +
            ' data-source-url="' + item.previewUrl + '"' +
            ' data-tn="' + safeTitle + '" data-ta="' + safeAttr + '" data-td="' + durStr + '">' +
            'Add' +
          '</button>' +
        '</div>';
      frag.appendChild(row);
    });
    var currentList = document.getElementById('lseb-sfx-list');
    var added = frag.childNodes.length > 0;
    if (currentList && added) currentList.insertBefore(frag, currentList.firstChild);
    return added;
  };
  var _trySFXProvider = function (idx) {
    if (idx >= sfxProviders.length) {
      var ldr = document.getElementById('lseb-sfx-loader'); if (ldr) ldr.remove();
      if (!fsKey) _appendConnectBanner(document.getElementById('lseb-sfx-list') || list, 'sfx');
      return;
    }
    var pid = sfxProviders[idx];
    var sfxCat = (_currentSfxCat !== 'all') ? _currentSfxCat : null;
    reg.searchSFX({query: searchQ, category: sfxCat, providerId: pid}).then(function (result) {
      if (!result.results || !result.results.length) {
        var reason = result.errorCode || (result.error ? 'provider_error' : 'no_output');
        console.log('[SFX provider]', pid, 'skip reason:', reason);
        _trySFXProvider(idx + 1); return;
      }
      var ldr = document.getElementById('lseb-sfx-loader'); if (ldr) ldr.remove();
      _appendSFXRows(result.results, pid);
    }).catch(function (err) {
      var msg = err && err.message || '';
      var reason = /401|403/.test(msg) ? 'auth_missing' :
                   /429/.test(msg)     ? 'rate_limited' :
                   /503/.test(msg)     ? 'cold_start'   :
                   /timeout/i.test(msg)? 'timeout'      : 'provider_error';
      console.log('[SFX provider]', pid, 'fail reason:', reason, msg.slice(0, 60));
      _trySFXProvider(idx + 1);
    });
  };
  _trySFXProvider(0);
}

function _appendConnectBanner(list, kind) {
  var banner = document.createElement('div');
  banner.style.cssText = 'margin:10px 0 4px;padding:9px 12px;background:#1a0a30;border:1px solid #7d2ae855;border-radius:8px;display:flex;align-items:center;gap:10px';
  banner.innerHTML =
    '<span style="flex:1;font:400 11px system-ui,sans-serif;color:#9a85c2">' +
      'Add a Freesound API key to search real ' + (kind === 'music' ? 'music' : 'sound effects') + '.' +
    '</span>' +
    '<button type="button" data-connect-provider="freesound" style="padding:4px 10px;background:#7d2ae8;border:none;border-radius:5px;color:#fff;font:600 11px system-ui,sans-serif;cursor:pointer;touch-action:manipulation">Connect</button>';
  list.appendChild(banner);
}

function _showProviderKeyEntry(providerId) {
  var existing = document.getElementById('lseb-provider-key-modal');
  if (existing) existing.remove();
  var modal = document.createElement('div');
  modal.id = 'lseb-provider-key-modal';
  modal.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#1a0a30;border-top:2px solid #7d2ae8;padding:16px;box-shadow:0 -4px 24px #7d2ae844;display:flex;flex-direction:column;gap:10px';
  var name = providerId === 'freesound' ? 'Freesound' : providerId;
  modal.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between">' +
      '<span style="font:600 14px system-ui,sans-serif;color:#f5f0ff">' + name + ' API Key</span>' +
      '<button type="button" id="lseb-pkey-close" style="background:none;border:none;color:#9a85c2;font-size:22px;cursor:pointer;padding:0 4px;line-height:1">&times;</button>' +
    '</div>' +
    '<input id="lseb-pkey-inp" type="password" placeholder="Paste your API key here..." autocomplete="off" style="width:100%;box-sizing:border-box;padding:10px 12px;background:#0d0019;border:1px solid #7d2ae888;border-radius:8px;color:#f5f0ff;font:400 14px system-ui,sans-serif;outline:none">' +
    '<p style="margin:0;font:400 11px system-ui,sans-serif;color:#5a5a78">Stored locally in this browser only. Never sent anywhere except ' + name + '.</p>' +
    '<button type="button" id="lseb-pkey-save" style="padding:10px;background:#7d2ae8;border:none;border-radius:8px;color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer;touch-action:manipulation">Save and test</button>' +
    '<p id="lseb-pkey-status" style="margin:0;font:400 12px system-ui,sans-serif;color:#5a5a78"></p>';
  document.body.appendChild(modal);
  var inp = document.getElementById('lseb-pkey-inp');
  if (inp) inp.focus();
  document.getElementById('lseb-pkey-close').addEventListener('click', function () { modal.remove(); });
  document.getElementById('lseb-pkey-save').addEventListener('click', function () {
    var key = (inp ? inp.value : '').trim();
    if (!key) return;
    var status = document.getElementById('lseb-pkey-status');
    if (status) { status.style.color = '#9a85c2'; status.textContent = 'Testing connection...'; }
    var reg = window.LoadProviderRegistry;
    if (!reg) { if (status) { status.style.color = '#ff3b30'; status.textContent = 'Registry not available.'; } return; }
    reg.saveProviderSettings(providerId, {apiKey: key});
    reg.testProvider(providerId).then(function (result) {
      if (result.ok) {
        if (status) { status.style.color = '#4cd964'; status.textContent = 'Connected.'; }
        setTimeout(function () {
          modal.remove();
          _buildMusicList(_currentMusicCat, null);
          _buildSFXList(_currentSfxCat, null);
        }, 900);
      } else {
        if (status) { status.style.color = '#ff3b30'; status.textContent = 'Failed — check your key and try again.'; }
      }
    }).catch(function (e) {
      if (status) { status.style.color = '#ff3b30'; status.textContent = 'Error: ' + (e.message || 'unknown'); }
    });
  });
}

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
    tracks: { music: [], text: [], sticker: [], overlay: [], sfx: [], voice: [], transition: [] },
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
      if (!s.tracks.music) s.tracks.music = [];
      if (!s.tracks.overlay) s.tracks.overlay = [];
      if (!s.tracks.sfx) s.tracks.sfx = [];
      if (!s.tracks.voice) s.tracks.voice = [];
      if (!s.tracks.transition) s.tracks.transition = [];
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
  el.addEventListener('error', function () { console.warn('[LS audio] load error', key.slice(-30), el.error && el.error.message); });
  el.load();
  _audioPre[key] = el;
  console.log('[LS preload]', key.slice(-30), src.slice(0, 60));
}

function _stopAudio() {
  _playHandles.forEach(function (h) { try { h.pause(); } catch (_) {} });
  _playHandles = [];
}

// ─── VISIBLE DEBUG PANEL ─────────────────────────────────────────────────────
// Temporary panel for diagnosing music playback on iPad where Safari console
// is not easily accessible. Remove once playback is verified working.
var _dbgEl = null;
function _dbgPanel() {
  if (_dbgEl && _dbgEl.parentNode) return _dbgEl;
  _dbgEl = document.createElement('div');
  _dbgEl.id = 'lseb-dbg';
  _dbgEl.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:rgba(0,0,0,.88);color:#0f0;font:11px/1.5 monospace;padding:8px 10px;max-height:38vh;overflow-y:auto;border-top:1px solid #0f0;pointer-events:auto;-webkit-overflow-scrolling:touch';
  _dbgEl.innerHTML = '<b style="color:#fff">AUDIO DEBUG</b> <button onclick="document.getElementById(\'lseb-dbg\').style.display=\'none\'" style="background:#333;border:1px solid #666;color:#fff;font:11px monospace;padding:1px 6px;cursor:pointer;float:right">x</button><br>';
  document.body.appendChild(_dbgEl);
  return _dbgEl;
}
function _dbg(msg) {
  console.log('[LSDBG]', msg);
  // Defer DOM writes so they never run inside a gesture handler.
  // Synchronous DOM manipulation (appendChild, scrollTop) before audio.play()
  // triggers layout reflow that expires iOS Safari's gesture timer, causing AbortError.
  var _ts = new Date().toLocaleTimeString();
  setTimeout(function () {
    var p = _dbgPanel();
    var line = document.createElement('div');
    line.textContent = _ts + ' ' + msg;
    p.appendChild(line);
    p.scrollTop = p.scrollHeight;
  }, 0);
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
  if (active) {
    sub.className = 'sub-' + (active.pos || 'bottom');
    sub.innerHTML = '<span style="font-size:' + (active.size || 18) + 'px">' + _esc(active.text || '') + '</span>';
  }
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

// ─── CLIP PREVIEW ENGINE (Load Eco pattern) ───────────────────────────────────
// Per-clip dedicated DOM elements. Switching = display toggle only.
// display:none → display:'' restarts CSS animations per spec — no forced reflow.
function _mountClipPreview(clip, localTime, isPlaying, sceneIdx) {
  var stage = _el('lseb-stage');
  if (!stage || !clip || !clip.src) return;
  var scene = _state.scenes[sceneIdx];
  var allPv = stage.querySelectorAll('[data-lseb-clip-preview]');
  for (var pi = 0; pi < allPv.length; pi++) {
    var pv = allPv[pi];
    if (pv !== clip._previewEl) {
      pv.style.display = 'none';
      if (pv.tagName === 'VIDEO') { try { pv.pause(); } catch (_) {} }
    }
  }
  if (!clip._previewEl || !clip._previewEl.parentNode) {
    var newEl;
    if (clip.type === 'image') {
      newEl = document.createElement('img');
      newEl.src = clip.src;
      newEl.alt = '';
      newEl.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;display:none';
      if (scene && scene.fx) _applyFxToImg(newEl, scene.fx);
    } else if (clip.type === 'video') {
      newEl = document.createElement('video');
      newEl.src = clip.src;
      newEl.playsInline = true;
      newEl.preload = 'auto';
      newEl.style.cssText = 'max-width:100%;max-height:100%;background:#000;display:none';
    } else {
      return;
    }
    newEl.setAttribute('data-lseb-clip-preview', clip.id);
    var stagePh = stage.querySelector('#lseb-stage-ph');
    if (stagePh) stage.insertBefore(newEl, stagePh); else stage.appendChild(newEl);
    clip._previewEl = newEl;
  }
  if (clip.type === 'image') {
    if (isPlaying) {
      if (clip._kbIdx == null) clip._kbIdx = Math.floor(Math.random() * 3);
      var dur = clip.dur || (scene && scene.duration) || 5;
      clip._previewEl.classList.add('kb-play');
      clip._previewEl.style.animation = 'lsebKenBurns' + clip._kbIdx + ' ' + dur + 's ease-in-out forwards';
    } else {
      clip._previewEl.classList.remove('kb-play');
      clip._previewEl.style.animation = '';
    }
  }
  clip._previewEl.style.display = '';
  var ph = _el('lseb-stage-ph');
  if (ph) ph.style.display = 'none';
  if (clip.type === 'video') {
    var drift = Math.abs((clip._previewEl.currentTime || 0) - localTime);
    if (!isPlaying || drift > 0.5) {
      if (drift > 0.05) try { clip._previewEl.currentTime = Math.max(0, localTime); } catch (_) {}
    }
    if (isPlaying) {
      try { clip._previewEl.play().catch(function () {}); } catch (_) {}
    } else try { clip._previewEl.pause(); } catch (_) {}
  }
}
function _activePreviewEl(idx) {
  var scene = _state.scenes[idx];
  if (!scene || !scene.clips) return null;
  var clip = scene.clips[_selectedClipIdx] || scene.clips[0];
  return (clip && clip._previewEl && clip._previewEl.parentNode) ? clip._previewEl : null;
}
function _applyFxToAllPreviews(idx) {
  var scene = _state.scenes[idx];
  if (!scene || !scene.fx) return;
  var stage = _el('lseb-stage');
  if (!stage) return;
  var pvs = stage.querySelectorAll('[data-lseb-clip-preview]');
  for (var i = 0; i < pvs.length; i++) {
    if (pvs[i].tagName === 'IMG') _applyFxToImg(pvs[i], scene.fx);
  }
}

var _engine = {
  t: 0,           // global time across all clips
  globalTime: 0,  // alias kept for compatibility
  clipIdx: 0,
  isPlaying: false,
  rafId: null,
  lastFrame: 0,

  // Single source of truth for clip visibility — called every RAF tick and on seek.
  setTime: function (t, idx) {
    var scene = _state.scenes[idx];
    if (!scene) return;
    var total = _tlDuration(scene);
    t = Math.max(0, Math.min(total, t));
    this.t = t;
    this.globalTime = t;
    var info = _tlClipAt(t, scene);
    this.clipIdx = info.idx;
    _selectedClipIdx = info.idx;
    var clip = scene.clips && scene.clips[info.idx];
    if (clip) _mountClipPreview(clip, info.localTime, this.isPlaying, idx);
    // Preload next clip so handoff is instant
    var nextClip = scene.clips && scene.clips[info.idx + 1];
    if (nextClip && !nextClip._previewEl) _mountClipPreview(nextClip, 0, false, idx);
    this._tick(idx, t);
  },

  play: function (idx) {
    if (this.isPlaying) return;
    var scene = _state.scenes[idx];
    if (!scene) return;
    if (!scene.clips) scene.clips = [];
    var total = _tlDuration(scene);
    if (this.t >= total - 0.01) this.t = 0;
    this.isPlaying = true;
    _playing = true;
    this.lastFrame = performance.now();
    _setPlayBtn(true);
    // Synchronous mount inside user-gesture for iOS Safari play() permission
    this.setTime(this.t, idx);
    var sceneId = scene.id;
    var LANE_VOL = { narration: 0.9, music: 0.35, sfxAudio: 0.5 };
    _playHandles = [];
    var _resumeT = this.t;
    console.log('[LS play] scene:', sceneId.slice(-12), 'resumeT:', _resumeT.toFixed(2),
      'music tracks:', (scene.tracks.music || []).length,
      'sfx tracks:', (scene.tracks.sfx || []).length);
    ['narration', 'music', 'sfxAudio'].forEach(function (lane) {
      var pre = _audioPre[sceneId + '_' + lane];
      if (!pre) return;
      try { pre.currentTime = Math.max(0, _resumeT); } catch (_) {}
      try { pre.volume = LANE_VOL[lane]; pre.play().catch(function (err) { console.warn('[LS play] legacy', lane, 'rejected:', err && err.message); }); _playHandles.push(pre); } catch (e) { console.warn('[LS play] legacy', lane, 'threw:', e && e.message); }
    });
    var _musicTracks = scene.tracks.music || [];
    _dbg('PLAY scene ' + sceneId.slice(-8) + ' musicTracks=' + _musicTracks.length + ' resumeT=' + _resumeT.toFixed(2));
    _musicTracks.forEach(function (it, i) {
      // localPath is a data URL or SW-cached local path — never a remote stream.
      // For old saved tracks that only have src: allow local paths, skip remote URLs.
      var _rawSrc = it.localPath || it.src || '';
      var _playbackSrc = _rawSrc && (/^data:/.test(_rawSrc) || !/^https?:\/\//.test(_rawSrc)) ? _rawSrc : null;
      _dbg('  track[' + i + '] localPath=' + (_playbackSrc ? _playbackSrc.slice(0, 60) : 'NONE') +
        ' sourceUrl=' + (it.sourceUrl || it.src || '').slice(0, 40));
      if (!_playbackSrc) { _dbg('  SKIP: no localPath — re-add track to cache'); return; }
      // Fix legacy tracks stored with millisecond duration (Openverse bug)
      var trackDur = (it.dur > 3600) ? Math.round(it.dur / 1000) : (it.dur || 30);
      var lt = _resumeT - (it.t0 || 0);
      _dbg('  lt=' + lt.toFixed(2) + ' dur=' + trackDur + ' t0=' + (it.t0 || 0));
      if (lt < 0 || lt >= trackDur) { _dbg('  SKIP: out of window'); return; }
      // Prefer the element unlocked during the Add gesture (same object, already
      // gesture-blessed). Fall back to new Audio only if missing.
      var _mKey = sceneId + '_music_track_' + i;
      var a = _audioPre[_mKey];
      if (!a || a.error || a.networkState === 3) {
        a = new Audio(_playbackSrc);
        _dbg('  WARN: no unlocked el — fallback new Audio(localPath)');
      }
      a.volume = it.vol || 0.35;
      // Only seek if data is buffered. Seeking at rs=0 aborts load on iOS Safari.
      if (a.readyState >= 2 && lt > 0.05) {
        try { a.currentTime = lt; } catch (_) {}
      }
      _dbg('  rs=' + a.readyState + ' ns=' + a.networkState + ' paused=' + a.paused + ' vol=' + a.volume + ' src=' + (a.src || '').slice(-40));
      var _aRef = a;
      var _evtPlay = false; var _evtCtStart = null;
      _aRef.addEventListener('playing', function () { if (!_evtPlay) { _evtPlay = true; _evtCtStart = _aRef.currentTime; } _dbg('  EVT playing ct=' + _aRef.currentTime.toFixed(2) + ' vol=' + _aRef.volume); });
      _aRef.addEventListener('error', function () { var _e = _aRef.error; _dbg('  EVT error code=' + (_e && _e.code) + ' ' + (_e && _e.message)); });
      if (!a.paused) {
        // Already playing silently from Add gesture — just unmuted, no play() call needed
        _dbg('  already playing — unmuted to ' + a.volume);
        setTimeout(function () {
          _dbg('  500ms: ct=' + _aRef.currentTime.toFixed(2) + ' paused=' + _aRef.paused + ' vol=' + _aRef.volume + ' err=' + (_aRef.error ? _aRef.error.code : 'none'));
        }, 500);
      } else {
        a.play()
          .then(function () {
            _dbg('  PLAY OK rs=' + _aRef.readyState + ' vol=' + _aRef.volume + ' muted=' + _aRef.muted);
            setTimeout(function () {
              var _ct = _aRef.currentTime;
              var _adv = (_evtCtStart !== null) ? (_ct - _evtCtStart) : _ct;
              _dbg('  500ms: AUDIBLE=' + (_evtPlay && _adv > 0.1 && _aRef.volume > 0 && !_aRef.muted && !_aRef.error) + ' playing-evt=' + _evtPlay + ' adv=' + _adv.toFixed(2) + ' ct=' + _ct.toFixed(2));
            }, 500);
          })
          .catch(function (err) { _dbg('  PLAY FAIL: track ' + i + ' ' + (err && err.message)); });
      }
      _playHandles.push(a);
      _audioPre[_mKey] = a;
    });
    (scene.tracks.sfx || []).forEach(function (it, i) {
      if (!it.src) return;
      if (it.src.indexOf('http://') === 0) { it.src = it.src.replace('http://', 'https://'); _saveState(); }
      var lt = _resumeT - (it.t0 || 0);
      if (lt < 0 || lt >= (it.dur || 999)) return;
      var _sKey = sceneId + '_sfx_track_' + i;
      var a = _audioPre[_sKey] || new Audio(it.src);
      a.volume = it.vol || 0.7;
      if (lt > 0.05) try { a.currentTime = lt; } catch (_) {}
      else try { a.currentTime = 0; } catch (_) {}
      a.play().catch(function (err) { console.warn('[LS play:sfx:error] track', i, err && err.message); });
      _playHandles.push(a);
      _audioPre[_sKey] = a;
    });
    (scene.tracks.voice || []).forEach(function (it, i) {
      var pre = _audioPre[sceneId + '_voice_track_' + i];
      if (!pre) return;
      var lt = _resumeT - (it.t0 || 0);
      if (lt < 0 || lt >= (it.dur || 999)) return;
      try { pre.currentTime = Math.max(0, lt); } catch (_) {}
      try { pre.volume = it.vol || 0.9; pre.play().catch(function (err) { console.warn('[LS play] voice_track_' + i, 'rejected:', err && err.message); }); _playHandles.push(pre); } catch (e) {}
    });
    _initSubOverlay(scene);
    var self = this;
    var step = function (now) {
      if (!self.isPlaying) return;
      var sc = _state.scenes[idx];
      if (!sc) { self._pause(idx); return; }
      var dt = Math.min((now - self.lastFrame) / 1000, 0.1);
      self.lastFrame = now;
      var total2 = _tlDuration(sc);
      // For active video clip: its element is master clock — no seeking during playback
      var info = _tlClipAt(self.t, sc);
      var ac = sc.clips && sc.clips[info.idx];
      if (ac && ac.type === 'video' && ac._previewEl && ac._previewEl.tagName === 'VIDEO' && ac._previewEl.readyState >= 2) {
        var pv = ac._previewEl;
        var starts = _tlStartTimes(sc);
        var base = starts[info.idx] || 0;
        self.t = base + pv.currentTime;
        if (pv.ended || pv.currentTime >= (pv.duration || ac.dur || 5) - 0.08) {
          self.t = base + (ac.dur || sc.duration || 5);
        }
      } else {
        self.t += dt;
      }
      if (self.t >= total2) {
        self._pause(idx);
        self.t = 0; self.globalTime = 0;
        _selectedClipIdx = 0;
        self._tick(idx, 0);
        return;
      }
      self.setTime(self.t, idx);
      self.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  },

  _pause: function (idx) {
    this.isPlaying = false;
    _playing = false;
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    _setPlayBtn(false);
    var _pauseStage = _el('lseb-stage');
    if (_pauseStage) {
      var _pausePvs = _pauseStage.querySelectorAll('[data-lseb-clip-preview]');
      for (var _pi = 0; _pi < _pausePvs.length; _pi++) {
        if (_pausePvs[_pi].tagName === 'VIDEO') try { _pausePvs[_pi].pause(); } catch (_) {}
        if (_pausePvs[_pi].tagName === 'IMG') { _pausePvs[_pi].classList.remove('kb-play'); _pausePvs[_pi].style.animation = ''; }
      }
    }
    var sub = document.getElementById('lseb-sub-overlay');
    if (sub) sub.remove();
    _stopAudio();
  },

  seekTo: function (globalTime, idx) {
    var scene = _state.scenes[idx];
    if (!scene) return;
    var total = _tlDuration(scene);
    globalTime = Math.max(0, Math.min(total, globalTime));
    this.setTime(globalTime, idx);
    var _seekStrip = _el('lseb-image-strip');
    if (_seekStrip) {
      var info = _tlClipAt(this.t, scene);
      var _seekClips = _seekStrip.querySelectorAll('.timeline-clip');
      for (var _sci = 0; _sci < _seekClips.length; _sci++) {
        _seekClips[_sci].classList.toggle('selected', _sci === info.idx);
      }
    }
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
  '#lseb-editor #lseb-stage{flex:3 1 0;min-height:240px;position:relative;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
  '#lseb-editor #lseb-stage-img{max-width:100%;max-height:100%;object-fit:contain;display:none}' +
  '#lseb-editor #lseb-stage-ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#2a1a42;font:400 14px Inter,system-ui,sans-serif;cursor:pointer}' +
  '#lseb-editor #lseb-stage-ph svg{opacity:.3}' +
  '#lseb-editor #lseb-fullscreen-btn{position:absolute;right:10px;bottom:10px;background:rgba(255,255,255,.1)}' +
  // Transport
  '#lseb-editor .lseb-transport{display:flex;align-items:center;gap:14px;padding:8px 14px;background:#0a0a14;border-top:1px solid #1a1a26;flex-shrink:0}' +
  '#lseb-editor #lseb-time{font-size:13px;color:#cfcfdc;font-variant-numeric:tabular-nums;min-width:120px}' +
  '#lseb-editor .lseb-transport-center{margin:0 auto;display:flex;align-items:center;gap:18px}' +
  // Timeline engine — identical structure to openVideoEditor
  '#lseb-editor .timeline-engine{width:100%;height:220px;background:#101018;display:grid;grid-template-columns:92px 1fr;color:#fff;overflow:hidden;font-family:system-ui,sans-serif;flex-shrink:0}' +
  '#lseb-editor .track-labels{padding-top:12px;display:flex;flex-direction:column;gap:10px;align-items:center;overflow-y:auto;max-height:200px;scrollbar-width:none}' +
  '#lseb-editor .track-labels::-webkit-scrollbar{display:none}' +
  '#lseb-editor .track-add,.cover-btn{position:relative;width:64px;height:44px;border:none;border-radius:12px;background:#1e1e2a;color:#fff;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}' +
  '#lseb-editor .track-add svg,.cover-btn svg{width:22px;height:22px;color:#fff;display:block;pointer-events:none}' +
  '#lseb-editor .track-add .ta-plus{position:absolute;right:6px;bottom:5px;background:#fff;color:#0a0a14;font-weight:700;font-size:10px;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none}' +
  '#lseb-editor .cover-btn{height:54px;border:1px dashed rgba(255,255,255,.45);flex-direction:column;gap:3px}' +
  '#lseb-editor .cover-btn .ta-lbl{font-size:10.5px;font-weight:600;color:#fff;pointer-events:none}' +
  '#lseb-editor .timeline-scroll{position:relative;overflow-x:auto;overflow-y:auto;padding:12px 24px max(100px,calc(env(safe-area-inset-bottom,0px) + 80px)) 0;scrollbar-width:none;-webkit-overflow-scrolling:touch}' +
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
  '#lseb-editor .timeline-clip .clip-del{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:rgba(255,59,92,.9);color:#fff;border:none;font-size:15px;font-weight:900;cursor:pointer;display:none;align-items:center;justify-content:center;z-index:6;line-height:1;padding:0}' +
  '#lseb-editor .timeline-clip.selected .clip-del{display:flex}' +
  '#lseb-editor .clip-reorder{position:absolute;bottom:4px;left:50%;transform:translateX(-50%);display:none;gap:2px;background:rgba(0,0,0,.65);border-radius:8px;padding:1px 4px;z-index:6;white-space:nowrap}' +
  '#lseb-editor .timeline-clip.selected .clip-reorder{display:flex}' +
  '#lseb-editor .clip-reorder button{background:transparent;border:none;color:#fff;font-size:15px;cursor:pointer;padding:1px 5px;line-height:1;font-family:inherit}' +
  '#lseb-editor .clip-reorder button:active{color:#b33af0}' +
  '#lseb-editor .clip-reorder button:disabled{color:#444;cursor:default}' +
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
  '#lseb-editor .ve-panel{position:absolute;left:0;right:0;bottom:0;background:#1a1a26;border-top:1px solid #3a3a50;padding:0 16px max(16px,env(safe-area-inset-bottom,8px));z-index:30;border-radius:18px 18px 0 0;box-shadow:0 -10px 36px rgba(0,0,0,.6);transform:translateY(100%);visibility:hidden;pointer-events:none;transition:transform .26s cubic-bezier(.32,.72,0,1),visibility 0s linear .26s;max-height:85%;overflow-y:auto;-webkit-overflow-scrolling:touch}' +
  '#lseb-editor .ve-panel.panel-open{transform:translateY(0);visibility:visible;pointer-events:all;transition:transform .26s cubic-bezier(.32,.72,0,1)}' +
  '#lseb-editor .ve-panel-handle{width:36px;height:4px;background:rgba(255,255,255,.18);border-radius:2px;margin:10px auto 14px;display:block}' +
  '#lseb-editor .ve-panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-weight:700;color:#fff;font-size:14px}' +
  '#lseb-editor .ve-lbl{font-size:12.5px;color:#a0a0b0;display:block}' +
  '#lseb-editor .ve-input{display:block;width:100%;margin-top:4px;padding:6px 8px;background:#0e0e18;color:#fff;border:1px solid #2a2a40;border-radius:6px;font-size:13px;font-family:inherit}' +
  '#lseb-drawer-scrim{position:absolute;inset:0;background:rgba(0,0,0,.38);z-index:29;visibility:hidden;opacity:0;transition:opacity .26s,visibility 0s linear .26s;pointer-events:none}' +
  '#lseb-editor.ve-panel-open #lseb-drawer-scrim{visibility:visible;opacity:1;transition:opacity .26s;pointer-events:all}' +
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
  '#lseb-editor #lseb-ratio{background:transparent;color:#fff;border:none;font-size:14px;font-weight:600;outline:none}' +
  '#lseb-editor .ve-track-row[data-track="sfx"] .ve-track-block{background:linear-gradient(180deg,#e87d2a,#a85b1f)}' +
  '#lseb-editor .ve-track-row[data-track="voice"] .ve-track-block{background:linear-gradient(180deg,#2ae87d,#1fa85b)}' +
  '#lseb-editor .ve-track-row[data-track="transition"] .ve-track-block{background:linear-gradient(180deg,#9c9cff,#6a6ab5)}' +
  '#lseb-record-btn{background:#ff3b5c;border:none;border-radius:50%;width:52px;height:52px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin:0 auto 10px;transition:transform .1s}' +
  '#lseb-record-btn:active{transform:scale(.92)}' +
  '#lseb-record-btn.recording{background:#ff6e6e;animation:lsebPulse 1s ease-in-out infinite}' +
  '@keyframes lsebPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,59,92,.4)}50%{box-shadow:0 0 0 12px rgba(255,59,92,0)}}' +
  '#lseb-record-indicator{text-align:center;font:600 12px Inter,system-ui,sans-serif;color:#ff3b5c;height:20px;margin-bottom:8px}' +
  '.lseb-sfx-card{background:#160b26;border:1px solid rgba(125,42,232,.22);border-radius:10px;padding:10px 12px;margin-bottom:8px}' +
  '.lseb-sfx-card-name{font:600 13px Inter,system-ui,sans-serif;color:#f5f0ff;margin-bottom:2px}' +
  '.lseb-sfx-card-note{font:400 11px Inter,system-ui,sans-serif;color:#7a6fa0}' +
  '.lseb-tr-option{display:flex;flex-direction:column;align-items:center;gap:4px;background:#1a1a26;border:1.5px solid rgba(125,42,232,.22);border-radius:8px;padding:10px 14px;cursor:pointer;min-width:64px;font-family:inherit}' +
  '.lseb-tr-option.active{border-color:#b33af0;background:rgba(125,42,232,.18)}' +
  '.lseb-tr-option-icon{font-size:18px;color:#fff}' +
  '.lseb-tr-option-lbl{font:600 10px Inter,system-ui,sans-serif;color:#c0b8d9}' +
  '#lseb-clip-ctx{position:absolute;z-index:60;background:#1a1a2e;border:1px solid rgba(179,58,240,.45);border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.72);display:none;align-items:center;gap:0;padding:3px 5px;pointer-events:all;white-space:nowrap}' +
  '#lseb-clip-ctx::after{content:"";position:absolute;bottom:-7px;left:var(--ctx-arrow,50%);transform:translateX(-50%);width:0;height:0;border:7px solid transparent;border-top-color:#1a1a2e;border-bottom:none;pointer-events:none}' +
  '.lseb-ctx-btn{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 8px 6px;background:none;border:none;border-radius:8px;color:#cfcfdc;cursor:pointer;font:600 9px system-ui,sans-serif;min-width:46px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;flex-shrink:0}' +
  '.lseb-ctx-btn:active{background:rgba(179,58,240,.2)}' +
  '.lseb-ctx-btn.ctx-danger{color:#ff3b5c}' +
  '.lseb-ctx-sep{width:1px;height:30px;background:rgba(255,255,255,.1);margin:0 2px;flex-shrink:0;align-self:center}' +
  '#lseb-editor .ve-insert-grid{display:flex;gap:10px;padding:8px 0 4px;justify-content:center}' +
  '#lseb-editor .ve-insert-tile{display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 10px 14px;background:#1e1e30;border:1.5px solid rgba(125,42,232,.25);border-radius:14px;flex:1;cursor:pointer;font:600 12px system-ui,sans-serif;color:#cfcfdc;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
  '#lseb-editor .ve-insert-tile:active{background:rgba(125,42,232,.18);border-color:#b33af0}' +
  '#lseb-editor .ve-tab-bar{display:flex;gap:0;margin:0 -16px 12px;padding:0 16px;border-bottom:1px solid #2a2a40;overflow-x:auto;scrollbar-width:none}' +
  '#lseb-editor .ve-tab-bar::-webkit-scrollbar{display:none}' +
  '#lseb-editor .ve-tab{flex:0 0 auto;background:transparent;border:none;border-bottom:2.5px solid transparent;color:#7a6fa0;font:600 13px system-ui,sans-serif;padding:8px 16px;cursor:pointer;margin-bottom:-1px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
  '#lseb-editor .ve-tab.active{color:#b33af0;border-bottom-color:#b33af0}' +
  '#lseb-editor .ve-cat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px 0 4px}' +
  '#lseb-editor .ve-cat-tile{background:#1e1e30;border:1.5px solid rgba(125,42,232,.22);border-radius:10px;padding:14px 4px;font:600 11px system-ui,sans-serif;color:#cfcfdc;cursor:pointer;text-align:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent;line-height:1.35;word-break:break-word}' +
  '#lseb-editor .ve-cat-tile:active{background:rgba(125,42,232,.22);border-color:#b33af0}' +
  '#lseb-editor .ve-search-bar{display:flex;align-items:center;gap:8px;background:#0e0e18;border:1px solid #2a2a40;border-radius:10px;padding:7px 12px;margin-bottom:12px}' +
  '#lseb-editor .ve-search-inp{flex:1;background:transparent;border:none;color:#f0eeff;font:400 13px system-ui,sans-serif;outline:none;min-width:0}' +
  '#lseb-editor .ve-search-inp::placeholder{color:#4a4a68}' +
  '#lseb-editor .ve-cat-card-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:2px 0 6px}' +
  '#lseb-editor .ve-cat-card{background:#1a1a2a;border:1.5px solid rgba(125,42,232,.2);border-radius:12px;overflow:hidden;cursor:pointer;text-align:left;font-family:inherit;display:flex;flex-direction:column;touch-action:manipulation;-webkit-tap-highlight-color:transparent;width:100%}' +
  '#lseb-editor .ve-cat-card:active{border-color:#b33af0}' +
  '#lseb-editor .ve-cat-card-art{height:68px;display:flex;align-items:center;justify-content:center}' +
  '#lseb-editor .ve-cat-card-info{padding:7px 10px 9px}' +
  '#lseb-editor .ve-cat-card-name{font:700 12px system-ui,sans-serif;color:#f0eeff;display:block}' +
  '#lseb-editor .ve-cat-card-count{font:400 10px system-ui,sans-serif;color:#6a6a8a;display:block;margin-top:1px}' +
  '#lseb-editor .ve-panel-back{display:flex;align-items:center;gap:6px;background:transparent;border:none;color:#b33af0;font:600 13px system-ui,sans-serif;cursor:pointer;padding:0 0 12px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
  '#lseb-editor .ve-asset-list{display:flex;flex-direction:column;gap:8px;padding-bottom:8px}' +
  '#lseb-editor .ve-asset-row{display:flex;align-items:center;gap:10px;background:#1a1a26;border:1px solid rgba(125,42,232,.15);border-radius:10px;padding:8px 10px}' +
  '#lseb-editor .ve-asset-art{width:42px;height:42px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center}' +
  '#lseb-editor .ve-asset-info{flex:1;min-width:0}' +
  '#lseb-editor .ve-asset-title{font:600 12px system-ui,sans-serif;color:#f0eeff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}' +
  '#lseb-editor .ve-asset-sub{font:400 10px system-ui,sans-serif;color:#6a6a8a;margin-top:1px;display:block}' +
  '#lseb-editor .ve-asset-acts{display:flex;gap:6px;flex-shrink:0;align-items:center}' +
  '#lseb-editor .ve-asset-play{background:rgba(179,58,240,.18);border:1px solid rgba(179,58,240,.3);color:#b33af0;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit;flex-shrink:0;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
  '#lseb-editor .ve-asset-play:active{background:rgba(179,58,240,.38)}' +
  '#lseb-editor .ve-asset-add{background:#7d2ae8;border:none;color:#fff;border-radius:8px;padding:6px 10px;font:700 11px system-ui,sans-serif;cursor:pointer;flex-shrink:0;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
  '#lseb-editor .ve-asset-add:active{background:#9c3aff}' +
  '#lseb-editor .ve-rec-strip{display:flex;gap:6px;padding:8px 0 12px;overflow-x:auto;scrollbar-width:none;min-height:76px;align-items:center;border-bottom:1px solid #1e1e2a;margin-bottom:12px}' +
  '#lseb-editor .ve-rec-strip::-webkit-scrollbar{display:none}' +
  '#lseb-editor .ve-rec-strip img{height:60px;width:88px;border-radius:6px;object-fit:cover;flex-shrink:0}' +
  '#lseb-editor .ve-rec-controls{display:flex;align-items:center;justify-content:space-between;padding:4px 8px 8px}' +
  '#lseb-editor .ve-rec-cancel{background:transparent;border:1.5px solid #3a3a50;color:#8a8a9a;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;font-family:inherit;touch-action:manipulation}' +
  '#lseb-editor .ve-rec-confirm{background:#7d2ae8;border:none;color:#fff;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit;touch-action:manipulation;font-size:18px}' +
  '#lseb-editor .ve-rec-confirm:disabled{background:#2a1a4a;color:#5a4a8a}' +
  '#lseb-editor .ve-chip-bar{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:10px;flex-shrink:0}' +
  '#lseb-editor .ve-chip-bar::-webkit-scrollbar{display:none}' +
  '#lseb-editor .ve-chip{flex:0 0 auto;background:#1e1e2a;border:1.5px solid rgba(125,42,232,.22);border-radius:20px;color:#8a8aaa;font:600 11px system-ui,sans-serif;padding:5px 12px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
  '#lseb-editor .ve-chip.active{background:rgba(125,42,232,.25);border-color:#b33af0;color:#d4b0ff}' +
  '#lseb-editor .ve-cat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:4px 0 10px}' +
  '#lseb-editor .ve-cat-tile{border:none;border-radius:10px;padding:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;aspect-ratio:1;display:flex;align-items:flex-end;overflow:hidden;position:relative}' +
  '#lseb-editor .ve-cat-tile-label{display:block;width:100%;padding:5px 4px 5px;background:rgba(0,0,0,.45);color:#fff;font:600 10px system-ui,sans-serif;text-align:center;line-height:1.2}' +
  '#lseb-editor .ve-back-btn{background:none;border:none;color:#b33af0;font:600 13px system-ui,sans-serif;padding:0 0 8px;cursor:pointer;touch-action:manipulation;display:flex;align-items:center;gap:4px}';

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
  _engine.t = 0; _engine.globalTime = 0; _engine.clipIdx = 0;
  if (scene.clips) scene.clips.forEach(function (c) { c._previewEl = null; c._kbIdx = null; });
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
        '<video id="lseb-stage-vid" playsinline preload="auto" style="display:none;max-width:100%;max-height:100%;background:#000"></video>' +
        '<img id="lseb-stage-img" alt="" style="display:none;max-width:100%;max-height:100%;object-fit:contain">' +
        '<div id="lseb-stage-ph"' + (scene.clips && scene.clips.length > 0 ? ' style="display:none"' : '') + '>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" width="48" height="48"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5-9 9"/></svg>' +
          '<span>Tap to attach image</span>' +
        '</div>' +
        '<div id="lseb-overlay-layer"></div>' +
        '<button class="ve-iconbtn" id="lseb-fullscreen-btn" aria-label="Fullscreen" style="position:absolute;right:10px;bottom:10px;background:rgba(255,255,255,.1)">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>' +
        '</button>' +
        '<input type="file" id="lseb-img-pick" accept="image/*,video/*,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.m4v,.heic,.heif" style="display:none">' +
        '<div id="lseb-drawer-scrim"></div>' +
        '<div id="lseb-music-panel" class="ve-panel">' +
          '<div class="ve-panel-handle" aria-hidden="true"></div>' +
          '<div class="ve-panel-head"><span>Music</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
          '<input id="lseb-audio-pick" type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac,.aiff,.webm,.opus" style="display:none">' +
          '<div class="ve-tab-bar" id="lseb-music-tabs">' +
            '<button class="ve-tab active" data-tab="music-lib" type="button">Music</button>' +
            '<button class="ve-tab" data-tab="music-fav" type="button">Favorites</button>' +
            '<button class="ve-tab" data-tab="music-my" type="button">My Music</button>' +
          '</div>' +
          '<div id="lseb-music-lib" class="ve-tab-pane">' +
            '<div id="lseb-music-cat-grid-wrap">' +
              '<div class="ve-search-bar" style="margin-bottom:10px">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:#5a5a78;flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                '<input class="ve-search-inp" id="lseb-music-search" placeholder="Search music..." autocomplete="off">' +
              '</div>' +
              '<div class="ve-cat-grid">' +
                '<button class="ve-cat-tile" data-music-cat="vlog"      type="button" style="background:linear-gradient(135deg,#1a78c2,#00acc1)"><span class="ve-cat-tile-label">Vlog</span></button>' +
                '<button class="ve-cat-tile" data-music-cat="pop"       type="button" style="background:linear-gradient(135deg,#c2185b,#8e24aa)"><span class="ve-cat-tile-label">Pop</span></button>' +
                '<button class="ve-cat-tile" data-music-cat="dynamic"   type="button" style="background:linear-gradient(135deg,#e64a19,#c62828)"><span class="ve-cat-tile-label">Dynamic</span></button>' +
                '<button class="ve-cat-tile" data-music-cat="fresh"     type="button" style="background:linear-gradient(135deg,#2e7d32,#00796b)"><span class="ve-cat-tile-label">Fresh</span></button>' +
                '<button class="ve-cat-tile" data-music-cat="acoustic"  type="button" style="background:linear-gradient(135deg,#5d4037,#f57f17)"><span class="ve-cat-tile-label">Acoustic</span></button>' +
                '<button class="ve-cat-tile" data-music-cat="electronic" type="button" style="background:linear-gradient(135deg,#283593,#6a1b9a)"><span class="ve-cat-tile-label">Electronic</span></button>' +
                '<button class="ve-cat-tile" data-music-cat="hiphop"    type="button" style="background:linear-gradient(135deg,#212121,#e65100)"><span class="ve-cat-tile-label">Hip-Hop</span></button>' +
              '</div>' +
            '</div>' +
            '<div id="lseb-music-list-pane" style="display:none">' +
              '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
                '<button class="ve-back-btn" data-cat-back="music" type="button">' +
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>' +
                  'Back' +
                '</button>' +
                '<span id="lseb-music-cat-title" style="font:600 13px system-ui,sans-serif;color:#cfcfdc"></span>' +
              '</div>' +
              '<div class="ve-asset-list" id="lseb-music-list"></div>' +
            '</div>' +
          '</div>' +
          '<div id="lseb-music-fav" class="ve-tab-pane" style="display:none">' +
            '<p style="color:#5a5a78;font:400 12px Inter,system-ui,sans-serif;margin:18px 0;text-align:center">No favorites yet.</p>' +
          '</div>' +
          '<div id="lseb-music-my" class="ve-tab-pane" style="display:none">' +
            '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">' +
              '<label class="ve-lbl">Volume</label>' +
              '<input id="lseb-vol" type="range" min="0" max="1" step="0.05" value="0.35" style="flex:1;min-width:140px;accent-color:#7d2ae8;">' +
              '<span id="lseb-vol-val" style="font-size:13px;color:#cfcfdc;font-weight:700;">35%</span>' +
            '</div>' +
            '<button type="button" data-open-pick="lseb-audio-pick" style="width:100%;padding:12px;background:#7d2ae8;border:none;border-radius:10px;color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer;touch-action:manipulation">Browse music files</button>' +
          '</div>' +
        '</div>' +
        '<div id="lseb-text-panel" class="ve-panel">' +
          '<div class="ve-panel-handle" aria-hidden="true"></div>' +
          '<div class="ve-panel-head"><span>Subtitle / overlay</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
          '<input id="lseb-text-inp" placeholder="Caption / title" class="ve-input" style="margin-bottom:10px;">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
            '<label class="ve-lbl">Position<select id="lseb-text-pos" class="ve-input"><option value="top">Top</option><option value="middle">Middle</option><option value="bottom" selected>Bottom</option></select></label>' +
            '<label class="ve-lbl">Size (px)<input id="lseb-text-size" type="number" value="18" min="10" max="120" class="ve-input"></label>' +
          '</div>' +
          '<button id="lseb-text-add-btn" type="button" style="width:100%;padding:10px;background:#7d2ae8;border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Add Text</button>' +
        '</div>' +
        '<div id="lseb-filter-panel" class="ve-panel">' +
          '<div class="ve-panel-handle" aria-hidden="true"></div>' +
          '<div class="ve-panel-head"><span>Filter</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px" id="lseb-filter-grid"></div>' +
        '</div>' +
        '<div id="lseb-opacity-panel" class="ve-panel">' +
          '<div class="ve-panel-handle" aria-hidden="true"></div>' +
          '<div class="ve-panel-head"><span>Opacity</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
            '<label class="ve-lbl">Transparency</label>' +
            '<input id="lseb-opacity-range" type="range" min="0" max="100" step="5" value="100" style="flex:1;min-width:160px;accent-color:#7d2ae8">' +
            '<span id="lseb-opacity-val" style="font-size:14px;color:#b33af0;font-weight:800;min-width:48px;text-align:right">100%</span>' +
          '</div>' +
        '</div>' +
        '<div id="lseb-blur-panel" class="ve-panel">' +
          '<div class="ve-panel-handle" aria-hidden="true"></div>' +
          '<div class="ve-panel-head"><span>Blur</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
            '<label class="ve-lbl">Blur amount</label>' +
            '<input id="lseb-blur-range" type="range" min="0" max="20" step="0.5" value="0" style="flex:1;min-width:160px;accent-color:#7d2ae8">' +
            '<span id="lseb-blur-val" style="font-size:14px;color:#b33af0;font-weight:800;min-width:48px;text-align:right">0px</span>' +
          '</div>' +
        '</div>' +
        '<div id="lseb-info-panel" class="ve-panel">' +
          '<div class="ve-panel-handle" aria-hidden="true"></div>' +
          '<div class="ve-panel-head"><span id="lseb-info-title">Tool</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
          '<p id="lseb-info-msg" style="color:#c0b8d9;font-size:13px;line-height:1.55;margin:0"></p>' +
        '</div>' +
        '<div id="lseb-sfx-panel" class="ve-panel">' +
          '<div class="ve-panel-handle" aria-hidden="true"></div>' +
          '<div class="ve-panel-head"><span>Sound FX</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
          '<input id="lseb-sfx-pick" type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac" style="display:none">' +
          '<div class="ve-tab-bar" id="lseb-sfx-tabs">' +
            '<button class="ve-tab active" data-tab="sfx-lib" type="button">Sound FX</button>' +
            '<button class="ve-tab" data-tab="sfx-fav" type="button">Favorites</button>' +
            '<button class="ve-tab" data-tab="sfx-my" type="button">My Sound</button>' +
          '</div>' +
          '<div id="lseb-sfx-lib" class="ve-tab-pane">' +
            '<div id="lseb-sfx-cat-grid-wrap">' +
              '<div class="ve-search-bar" style="margin-bottom:10px">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:#5a5a78;flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                '<input class="ve-search-inp" id="lseb-sfx-search" placeholder="Search sound FX..." autocomplete="off">' +
              '</div>' +
              '<div class="ve-cat-grid">' +
                '<button class="ve-cat-tile" data-sfx-cat="cartoon"     type="button" style="background:linear-gradient(135deg,#ff9500,#e65100)"><span class="ve-cat-tile-label">Cartoon</span></button>' +
                '<button class="ve-cat-tile" data-sfx-cat="swish"       type="button" style="background:linear-gradient(135deg,#0097a7,#01579b)"><span class="ve-cat-tile-label">Fast Swish</span></button>' +
                '<button class="ve-cat-tile" data-sfx-cat="funny"       type="button" style="background:linear-gradient(135deg,#f9a825,#e65100)"><span class="ve-cat-tile-label">Funny</span></button>' +
                '<button class="ve-cat-tile" data-sfx-cat="machine"     type="button" style="background:linear-gradient(135deg,#455a64,#263238)"><span class="ve-cat-tile-label">Machine</span></button>' +
                '<button class="ve-cat-tile" data-sfx-cat="ringing"     type="button" style="background:linear-gradient(135deg,#0288d1,#0d47a1)"><span class="ve-cat-tile-label">Ringing</span></button>' +
                '<button class="ve-cat-tile" data-sfx-cat="vehicles"    type="button" style="background:linear-gradient(135deg,#d84315,#b71c1c)"><span class="ve-cat-tile-label">Vehicles</span></button>' +
                '<button class="ve-cat-tile" data-sfx-cat="weather"     type="button" style="background:linear-gradient(135deg,#1565c0,#1a237e)"><span class="ve-cat-tile-label">Weather</span></button>' +
                '<button class="ve-cat-tile" data-sfx-cat="variety"     type="button" style="background:linear-gradient(135deg,#8e24aa,#4527a0)"><span class="ve-cat-tile-label">Variety Show</span></button>' +
                '<button class="ve-cat-tile" data-sfx-cat="vlogsf"      type="button" style="background:linear-gradient(135deg,#00838f,#01579b)"><span class="ve-cat-tile-label">Vlog</span></button>' +
                '<button class="ve-cat-tile" data-sfx-cat="physical"    type="button" style="background:linear-gradient(135deg,#c62828,#880e4f)"><span class="ve-cat-tile-label">Physical</span></button>' +
                '<button class="ve-cat-tile" data-sfx-cat="transitions" type="button" style="background:linear-gradient(135deg,#4527a0,#1a237e)"><span class="ve-cat-tile-label">Transitions</span></button>' +
                '<button class="ve-cat-tile" data-sfx-cat="cues"        type="button" style="background:linear-gradient(135deg,#b71c1c,#880e4f)"><span class="ve-cat-tile-label">Cues</span></button>' +
                '<button class="ve-cat-tile" data-sfx-cat="game"        type="button" style="background:linear-gradient(135deg,#2e7d32,#004d40)"><span class="ve-cat-tile-label">Game</span></button>' +
                '<button class="ve-cat-tile" data-sfx-cat="emotion"     type="button" style="background:linear-gradient(135deg,#f57f17,#e65100)"><span class="ve-cat-tile-label">Emotion</span></button>' +
              '</div>' +
            '</div>' +
            '<div id="lseb-sfx-list-pane" style="display:none">' +
              '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
                '<button class="ve-back-btn" data-cat-back="sfx" type="button">' +
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>' +
                  'Back' +
                '</button>' +
                '<span id="lseb-sfx-cat-title" style="font:600 13px system-ui,sans-serif;color:#cfcfdc"></span>' +
              '</div>' +
              '<div class="ve-asset-list" id="lseb-sfx-list"></div>' +
            '</div>' +
          '</div>' +
          '<div id="lseb-sfx-fav" class="ve-tab-pane" style="display:none">' +
            '<p style="color:#5a5a78;font:400 12px Inter,system-ui,sans-serif;margin:18px 0;text-align:center">No favorites yet.</p>' +
          '</div>' +
          '<div id="lseb-sfx-my" class="ve-tab-pane" style="display:none">' +
            '<button type="button" data-open-pick="lseb-sfx-pick" style="width:100%;padding:12px;background:#7d2ae8;border:none;border-radius:10px;color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer;touch-action:manipulation">Browse sound files</button>' +
          '</div>' +
        '</div>' +
        '<div id="lseb-voice-panel" class="ve-panel">' +
          '<div class="ve-panel-handle" aria-hidden="true"></div>' +
          '<div class="ve-panel-head"><span>Record</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
          '<div class="ve-rec-strip" id="lseb-rec-strip"></div>' +
          '<div id="lseb-record-indicator" style="text-align:center;font:600 12px system-ui,sans-serif;color:#ff3b5c;height:20px;margin-bottom:8px"></div>' +
          '<div class="ve-rec-controls">' +
            '<button class="ve-rec-cancel" data-close-panel type="button">&times;</button>' +
            '<button id="lseb-record-btn" type="button" aria-label="Record narration">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" width="24" height="24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>' +
            '</button>' +
            '<button class="ve-rec-confirm" id="lseb-rec-done" type="button" disabled>&#10003;</button>' +
          '</div>' +
          '<div style="text-align:center;color:#7a6fa0;font:400 11px system-ui,sans-serif;margin:8px 0 10px">Tap to record — tap again to stop</div>' +
          '<div style="text-align:center;margin-bottom:6px;color:#4a4a60;font:400 11px system-ui,sans-serif">or upload a file</div>' +
          '<input id="lseb-voice-pick" type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg" style="font-size:13px;">' +
        '</div>' +
        '<div id="lseb-transition-panel" class="ve-panel">' +
          '<div class="ve-panel-handle" aria-hidden="true"></div>' +
          '<div class="ve-panel-head"><span>Transition</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
          '<div style="color:#a0a0b0;font:400 12px Inter,system-ui,sans-serif;margin-bottom:12px">Applies to the end of the selected clip.</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap" id="lseb-tr-options">' +
            '<button class="lseb-tr-option" data-tr="cut" type="button"><span class="lseb-tr-option-icon">|</span><span class="lseb-tr-option-lbl">Cut</span></button>' +
            '<button class="lseb-tr-option" data-tr="fade" type="button"><span class="lseb-tr-option-icon">&#9618;</span><span class="lseb-tr-option-lbl">Fade</span></button>' +
            '<button class="lseb-tr-option" data-tr="dissolve" type="button"><span class="lseb-tr-option-icon">&#9617;</span><span class="lseb-tr-option-lbl">Dissolve</span></button>' +
          '</div>' +
          '<div style="margin-top:10px;color:#5a5a78;font:400 11px Inter,system-ui,sans-serif">Fade and Dissolve will render in the next build.</div>' +
        '</div>' +
        '<div id="lseb-insert-panel" class="ve-panel">' +
          '<div class="ve-panel-handle" aria-hidden="true"></div>' +
          '<div class="ve-panel-head"><span>Add Audio</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
          '<div class="ve-insert-grid">' +
            '<button class="ve-insert-tile" data-insert="music" type="button">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
              'Music' +
            '</button>' +
            '<button class="ve-insert-tile" data-insert="sfx" type="button">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>' +
              'Sound FX' +
            '</button>' +
            '<button class="ve-insert-tile" data-insert="record" type="button">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>' +
              'Record' +
            '</button>' +
          '</div>' +
        '</div>' +
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
          '<button class="track-add" data-add="sfx" aria-label="Add sound FX" type="button">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>' +
            '<span class="ta-plus">+</span>' +
          '</button>' +
          '<button class="track-add" data-add="voice" aria-label="Record narration" type="button">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>' +
            '<span class="ta-plus">+</span>' +
          '</button>' +
          '<button class="track-add" data-add="transition" aria-label="Add transition" type="button">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="8" height="10" rx="1"/><rect x="14" y="7" width="8" height="10" rx="1"/><line x1="10" y1="12" x2="14" y2="12" stroke-dasharray="1.5 1.5"/></svg>' +
            '<span class="ta-plus">+</span>' +
          '</button>' +
        '</div>' +
        '<div class="timeline-scroll" id="lseb-tl-scroll">' +
          '<div class="ve-track-row" data-track="music"><span class="ve-track-empty" data-add="music">Tap to add music</span></div>' +
          '<div class="ve-track-row" data-track="text"><span class="ve-track-empty" data-add="text">Tap to add subtitle</span></div>' +
          '<div class="ve-track-row" data-track="sticker"><span class="ve-track-empty" data-add="sticker">Tap to add sticker / PiP</span></div>' +
          '<div class="ve-track-row" data-track="overlay"><span class="ve-track-empty" data-add="overlay-img">Tap to add overlay image</span></div>' +
          '<div class="ve-track-row" data-track="sfx" style="display:none"><span class="ve-track-empty" data-add="sfx">Tap to add sound FX</span></div>' +
          '<div class="ve-track-row" data-track="voice" style="display:none"><span class="ve-track-empty" data-add="voice">Tap to record narration</span></div>' +
          '<div class="ve-track-row" data-track="transition" style="display:none"><span class="ve-track-empty" data-add="transition">Tap to add transition</span></div>' +
          '<div class="video-track" id="lseb-image-strip"></div>' +
          '<div class="waveform-track empty" id="lseb-waveform"></div>' +
          '<div class="time-ruler" id="lseb-ruler"></div>' +
          '<div class="playhead" id="lseb-playhead" style="left:0"></div>' +
        '</div>' +
      '</div>' +
      // Hidden image/sticker pickers
      '<input type="file" id="lseb-sticker-pick" accept="image/*,video/*" style="display:none">' +
      '<input type="file" id="lseb-clip-img-pick" accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif" style="display:none">' +
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
      '<div id="lseb-clip-ctx" role="toolbar" aria-label="Clip actions"></div>' +
      '<div id="lseb-toast" style="opacity:0"></div>' +
    '</div>';

  // Wire everything
  _bindEditor(idx);
  // Preload audio from restored state so playback works after reload
  if (scene.media.music) _preloadAudio(scene.id, 'music', scene.media.music);
  if (scene.media.narration) _preloadAudio(scene.id, 'narration', scene.media.narration);
  if (scene.media.sfxAudio) _preloadAudio(scene.id, 'sfxAudio', scene.media.sfxAudio);
  (scene.tracks.music || []).forEach(function (it, i) { if (it.src) _preloadAudio(scene.id, 'music_track_' + i, it.src); });
  (scene.tracks.sfx || []).forEach(function (it, i) { if (it.src) _preloadAudio(scene.id, 'sfx_track_' + i, it.src); });
  (scene.tracks.voice || []).forEach(function (it, i) { if (it.src) _preloadAudio(scene.id, 'voice_track_' + i, it.src); });
  _renderImageStrip(idx);
  _renderTracks(idx);
  _renderOverlayLayer(scene, 0);
  // Restore waveform if audio was previously attached
  if (scene.media.music || (scene.tracks.music && scene.tracks.music.length > 0)) {
    setTimeout(function () { _renderWaveformPlaceholder(0.35); }, 0);
  }
  _renderRuler(idx);
  if (scene.clips && scene.clips.length > 0) _mountClipPreview(scene.clips[0], 0, false, idx);
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
  var _ALL_PANELS = ['lseb-insert-panel','lseb-music-panel','lseb-text-panel','lseb-sfx-panel','lseb-voice-panel','lseb-transition-panel','lseb-filter-panel','lseb-opacity-panel','lseb-blur-panel','lseb-info-panel'];
  function _showPanel(id) {
    _PreviewCtrl.stop();
    _ALL_PANELS.forEach(function (p) {
      var el = _el(p);
      if (el) el.classList.toggle('panel-open', p === id);
    });
    var ed = _el('lseb-editor');
    if (ed) ed.classList.toggle('ve-panel-open', !!id);
    // Reset music/sfx panels to category grid view when opened
    if (id === 'lseb-music-panel') {
      var mg = _el('lseb-music-cat-grid-wrap'); var mp = _el('lseb-music-list-pane');
      if (mg) mg.style.display = ''; if (mp) mp.style.display = 'none';
      _currentMusicCat = 'all';
    }
    if (id === 'lseb-sfx-panel') {
      var sg = _el('lseb-sfx-cat-grid-wrap'); var sp = _el('lseb-sfx-list-pane');
      if (sg) sg.style.display = ''; if (sp) sp.style.display = 'none';
      _currentSfxCat = 'all';
    }
  }
  var scrim = _el('lseb-drawer-scrim');
  if (scrim) scrim.addEventListener('click', function () { _showPanel(null); });
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
        var aEl = _activePreviewEl(idx);
        if (aEl && aEl.tagName === 'IMG') aEl.style.filter = key === 'none' ? '' : _FILTERS[key];
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
        if (add === 'music') { _showPanel('lseb-insert-panel'); }
        else if (add === 'text') { _showPanel('lseb-text-panel'); }
        else if (add === 'sticker') { _el('lseb-sticker-pick') && _el('lseb-sticker-pick').click(); }
        else if (add === 'image') { _el('lseb-clip-img-pick') && _el('lseb-clip-img-pick').click(); }
        else if (add === 'overlay-img') { _el('lseb-overlay-pick') && _el('lseb-overlay-pick').click(); }
        else if (add === 'sfx') { _showPanel('lseb-sfx-panel'); }
        else if (add === 'voice') { _showPanel('lseb-voice-panel'); }
        else if (add === 'transition') { _showPanel('lseb-transition-panel'); }
      });
    });
    editor.querySelectorAll('.ve-track-empty[data-add]').forEach(function (span) {
      span.addEventListener('click', function () {
        var add = span.dataset.add;
        if (add === 'music') _showPanel('lseb-insert-panel');
        else if (add === 'text') _showPanel('lseb-text-panel');
        else if (add === 'sticker') { _el('lseb-sticker-pick') && _el('lseb-sticker-pick').click(); }
        else if (add === 'overlay-img') { _el('lseb-overlay-pick') && _el('lseb-overlay-pick').click(); }
        else if (add === 'sfx') { _showPanel('lseb-sfx-panel'); }
        else if (add === 'voice') { _showPanel('lseb-voice-panel'); }
        else if (add === 'transition') { _showPanel('lseb-transition-panel'); }
      });
    });
    editor.querySelectorAll('[data-close-panel]').forEach(function (btn) {
      btn.addEventListener('click', function () { _showPanel(null); });
    });
    editor.querySelectorAll('.ve-insert-tile').forEach(function (tile) {
      tile.addEventListener('click', function () {
        var ins = tile.dataset.insert;
        if (ins === 'music') _showPanel('lseb-music-panel');
        else if (ins === 'sfx') _showPanel('lseb-sfx-panel');
        else if (ins === 'record') _showPanel('lseb-voice-panel');
      });
    });
    // Tab switching
    editor.querySelectorAll('.ve-tab-bar').forEach(function (bar) {
      bar.addEventListener('click', function (e) {
        var tab = e.target.closest('.ve-tab');
        if (!tab) return;
        bar.querySelectorAll('.ve-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var paneId = 'lseb-' + tab.dataset.tab;
        var panel = bar.closest('.ve-panel');
        if (panel) panel.querySelectorAll('.ve-tab-pane').forEach(function (p) {
          p.style.display = p.id === paneId ? '' : 'none';
        });
      });
    });
    // Asset browser delegated handler
    editor.addEventListener('click', function (e) {
      // Music category tile
      var mcat = e.target.closest('[data-music-cat]');
      if (mcat) {
        var mcatVal = mcat.dataset.musicCat;
        var mcatLbl = mcat.querySelector('.ve-cat-tile-label');
        var mcatGrid = _el('lseb-music-cat-grid-wrap');
        var mcatPane = _el('lseb-music-list-pane');
        var mcatTitle = _el('lseb-music-cat-title');
        if (mcatGrid) mcatGrid.style.display = 'none';
        if (mcatPane) mcatPane.style.display = '';
        if (mcatTitle) mcatTitle.textContent = mcatLbl ? mcatLbl.textContent : mcatVal;
        _buildMusicList(mcatVal, '');
        return;
      }
      // Music back button
      var mcatBack = e.target.closest('[data-cat-back="music"]');
      if (mcatBack) {
        var mcatGrid2 = _el('lseb-music-cat-grid-wrap');
        var mcatPane2 = _el('lseb-music-list-pane');
        if (mcatGrid2) mcatGrid2.style.display = '';
        if (mcatPane2) mcatPane2.style.display = 'none';
        _currentMusicCat = 'all';
        return;
      }
      // SFX category tile
      var scat = e.target.closest('[data-sfx-cat]');
      if (scat) {
        var scatVal = scat.dataset.sfxCat;
        var scatLbl = scat.querySelector('.ve-cat-tile-label');
        var scatGrid = _el('lseb-sfx-cat-grid-wrap');
        var scatPane = _el('lseb-sfx-list-pane');
        var scatTitle = _el('lseb-sfx-cat-title');
        if (scatGrid) scatGrid.style.display = 'none';
        if (scatPane) scatPane.style.display = '';
        if (scatTitle) scatTitle.textContent = scatLbl ? scatLbl.textContent : scatVal;
        _buildSFXList(scatVal, '');
        return;
      }
      // SFX back button
      var scatBack = e.target.closest('[data-cat-back="sfx"]');
      if (scatBack) {
        var scatGrid2 = _el('lseb-sfx-cat-grid-wrap');
        var scatPane2 = _el('lseb-sfx-list-pane');
        if (scatGrid2) scatGrid2.style.display = '';
        if (scatPane2) scatPane2.style.display = 'none';
        _currentSfxCat = 'all';
        return;
      }
      // Provider key entry
      var cpBtn = e.target.closest('[data-connect-provider]');
      if (cpBtn) {
        _showProviderKeyEntry(cpBtn.dataset.connectProvider);
        return;
      }
      // Library asset direct timeline insert
      var addTrackBtn = e.target.closest('[data-add-track]');
      if (addTrackBtn) {
        var trackKind = addTrackBtn.dataset.addTrack;
        var durStr = addTrackBtn.dataset.td || '0:30';
        var parts = durStr.split(':');
        var dur = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        if (dur < 1) dur = 30;
        var label = (addTrackBtn.dataset.tn || trackKind) + (addTrackBtn.dataset.ta ? ' — ' + addTrackBtn.dataset.ta : '');
        var noSrc    = addTrackBtn.dataset.noSrc === '1';
        var addAk    = addTrackBtn.dataset.audioKey;
        var addSrc   = (addAk && _DEMO_AUDIO && _DEMO_AUDIO[addAk]) || addTrackBtn.dataset.src || null;
        console.log('[LS add]', trackKind, '| id:', addTrackBtn.dataset.itemId || 'n/a',
          '| title:', label, '| src:', addSrc || 'NONE');
        if (addSrc && addSrc.indexOf('http://') === 0) addSrc = addSrc.replace('http://', 'https://');
        // Music from provider: download to data URL → localPath → timeline plays local only.
        // Same proven pattern as SFX. Preview plays remote URL; Add always caches first.
        if (trackKind === 'music' && addSrc && /^https?:\/\//.test(addSrc)) {
          if (addTrackBtn.dataset.downloading === '1') return;
          addTrackBtn.dataset.downloading = '1';
          var _mOrigTxt = addTrackBtn.textContent;
          addTrackBtn.textContent = '...';
          addTrackBtn.disabled = true;
          var _mRemote   = addSrc;
          var _mLabel    = label;
          var _mDur      = dur;
          var _mProvider = addTrackBtn.dataset.provider || 'provider';
          var _mLicense  = addTrackBtn.dataset.license  || '';
          var _mAttr     = (addTrackBtn.dataset.ta || '').replace(/"/g, '');
          var _mRestore = function () {
            addTrackBtn.dataset.downloading = '';
            addTrackBtn.textContent = _mOrigTxt;
            addTrackBtn.disabled = false;
          };
          var _mCacheKey = _musicCacheKey(_mRemote);
          var _mCommit = function (localSrc) {
            _musicCache[_mCacheKey] = localSrc;
            var ti = {
              name: _mLabel, dur: _mDur,
              src: localSrc, localPath: localSrc, sourceUrl: _mRemote,
              trackType: 'music', volume: 0.7, vol: 0.35, fadeIn: 0, fadeOut: 0,
              license: _mLicense, attribution: _mAttr, providerId: _mProvider
            };
            _addTrackItem(idx, 'music', ti);
            var _msc = _state.scenes[idx];
            var _mulIdx = (_msc && _msc.tracks.music) ? _msc.tracks.music.length - 1 : -1;
            if (_msc && _mulIdx >= 0) {
              var _mulKey = _msc.id + '_music_track_' + _mulIdx;
              _audioPre[_mulKey] = new Audio(localSrc);
              _dbg('Music DL cached key=' + _mulKey.slice(-24) + ' size=' + Math.round(localSrc.length / 1024) + 'KB');
            }
            _renderTracks(idx);
            _showPanel(null);
            _toast('Music added');
            _mRestore();
          };
          if (_musicCache[_mCacheKey]) {
            _mCommit(_musicCache[_mCacheKey]);
            return;
          }
          fetch(_mRemote, {mode: 'cors'}).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.blob();
          }).then(function (blob) {
            var rd = new FileReader();
            rd.onload  = function (ev) { _mCommit(ev.target.result); };
            rd.onerror = function () { _toast('Music could not be cached — check connection.'); _mRestore(); };
            rd.readAsDataURL(blob);
          }).catch(function () {
            _toast('Music could not be cached — check connection.');
            _mRestore();
          });
          return;
        }
        // SFX from provider: download to data URL → local path → timeline never streams remote.
        if (trackKind === 'sfx' && addSrc && /^https?:\/\//.test(addSrc)) {
          if (addTrackBtn.dataset.downloading === '1') return;
          addTrackBtn.dataset.downloading = '1';
          var _sfxOrigTxt = addTrackBtn.textContent;
          addTrackBtn.textContent = '...';
          addTrackBtn.disabled = true;
          var _sfxRemote   = addSrc;
          var _sfxLabel    = label;
          var _sfxDur      = dur;
          var _sfxProvider = addTrackBtn.dataset.provider  || 'provider';
          var _sfxLicense  = addTrackBtn.dataset.license   || 'Unknown';
          var _sfxCs       = addTrackBtn.dataset.cs;
          var _sfxAr       = addTrackBtn.dataset.ar === '1';
          var _sfxPo       = addTrackBtn.dataset.po === '1';
          var _sfxAttr     = (addTrackBtn.dataset.ta || '').replace(/"/g, '');
          var _sfxSu       = addTrackBtn.dataset.sourceUrl || _sfxRemote;
          _dbg('SFX DL start provider=' + _sfxProvider + ' license=' + _sfxLicense + ' src=' + _sfxRemote.slice(0, 80));
          var _sfxRestore = function () {
            addTrackBtn.dataset.downloading = '';
            addTrackBtn.textContent = _sfxOrigTxt;
            addTrackBtn.disabled = false;
          };
          var _sfxCommit = function (localSrc, blobType) {
            var cacheKey = _sfxCacheKey(_sfxRemote);
            _sfxCache[cacheKey] = localSrc;   // store for deduplication
            var ti = {
              name: _sfxLabel, dur: _sfxDur, src: localSrc,
              volume: 0.7, fadeIn: 0, fadeOut: 0,
              license: _sfxLicense,
              commercialSafe:      _sfxCs === '1' ? true : _sfxCs === '0' ? false : null,
              attributionRequired: _sfxAr,
              personalOnly:        _sfxPo,
              attribution:         _sfxAttr,
              sourceUrl:           _sfxSu,
              providerId:          _sfxProvider
            };
            if (window.LoadAssetRegistry) {
              try {
                window.LoadAssetRegistry.addAsset({
                  assetType: 'sfx', source: _sfxProvider,
                  license: _sfxLicense, rightsStatus: _sfxLicense,
                  commercialSafe: ti.commercialSafe,
                  attributionRequired: _sfxAr, personalOnly: _sfxPo,
                  attribution: _sfxAttr, sourceUrl: _sfxSu,
                  localPath: 'data:[' + (blobType || 'audio/mpeg') + ']',
                  mimeType: blobType || 'audio/mpeg', duration: _sfxDur, tags: ['sfx'],
                  notes: _sfxLabel + ' [cached; origin=' + _sfxRemote.slice(0, 80) + ']'
                });
                _dbg('SFX AssetRegistry: saved provider=' + _sfxProvider + ' license=' + _sfxLicense);
              } catch (_re) { _dbg('SFX AssetRegistry err: ' + (_re && _re.message)); }
            }
            _addTrackItem(idx, 'sfx', ti);
            var _sc3 = _state.scenes[idx];
            var _ulIdx3 = (_sc3 && _sc3.tracks.sfx) ? _sc3.tracks.sfx.length - 1 : -1;
            if (_sc3 && _ulIdx3 >= 0) {
              var _ulKey3 = _sc3.id + '_sfx_track_' + _ulIdx3;
              _audioPre[_ulKey3] = new Audio(localSrc);
              var _addedSfx = _sc3.tracks.sfx[_ulIdx3] || {};
              _dbg('SFX cached key=' + _ulKey3.slice(-24) + ' localPath=data:[' + (blobType || 'audio/mpeg') + '] size=' + Math.round(localSrc.length / 1024) + 'KB');
              _dbg('SFX scene.sfx: name=' + (_addedSfx.name || '?') + ' dur=' + (_addedSfx.dur || 0) + ' license=' + (_addedSfx.license || '?') + ' src=data:[' + Math.round(localSrc.length / 1024) + 'KB]');
              _dbg('SFX playback: key=' + _ulKey3.slice(-24) + ' via _audioPre (data URL — no stream)');
            }
            _renderTracks(idx);
            _showPanel(null);
            _toast('Sound FX added');
            _sfxRestore();
          };
          // Deduplication: reuse cached data URL if this URL was downloaded before
          var _cKey = _sfxCacheKey(_sfxRemote);
          if (_sfxCache[_cKey]) {
            _dbg('SFX DL dedup: reusing cached data URL for ' + _sfxRemote.slice(-50));
            _sfxCommit(_sfxCache[_cKey], 'audio/mpeg');
            return;
          }
          fetch(_sfxRemote, {mode: 'cors'}).then(function (r) {
            if (!r.ok) {
              var reason = r.status === 401 || r.status === 403 ? 'auth_missing' :
                           r.status === 429 ? 'rate_limited' :
                           r.status === 503 ? 'cold_start'   : 'provider_error';
              throw new Error(reason + ' HTTP' + r.status);
            }
            return r.blob();
          }).then(function (blob) {
            var rd = new FileReader();
            rd.onload = function (ev) {
              _dbg('SFX DL ok size=' + Math.round(ev.target.result.length / 1024) + 'KB type=' + blob.type);
              _sfxCommit(ev.target.result, blob.type);
            };
            rd.onerror = function () {
              _dbg('SFX DL FileReader err — remote fallback');
              _sfxCommit(_sfxRemote, 'audio/mpeg');
            };
            rd.readAsDataURL(blob);
          }).catch(function (err) {
            var reason = err && err.message || 'provider_error';
            _dbg('SFX DL fail: ' + reason + ' — remote fallback');
            _sfxCommit(_sfxRemote, 'audio/mpeg');
          });
          return;
        }
        var _tLic = addTrackBtn.dataset.license  || (trackKind === 'sfx' ? 'CC0' : '');
        var _tCs  = addTrackBtn.dataset.cs;   // '1','0', or ''
        var _tAr  = addTrackBtn.dataset.ar === '1';
        var _tPo  = addTrackBtn.dataset.po === '1';
        var _tSu  = addTrackBtn.dataset.sourceUrl || '';
        var _tPid = addTrackBtn.dataset.provider  || 'local';
        var trackItem = { name: label, dur: dur, volume: 0.7, fadeIn: 0, fadeOut: 0, trackType: trackKind };
        if (addSrc) {
          trackItem.src = addSrc;
          if (trackKind === 'music') {
            trackItem.localPath = addSrc;  // local path (SW-cached demo file) is the playback source
            trackItem.sourceUrl = '';
          }
        }
        if (trackKind === 'sfx') {
          trackItem.license          = _tLic;
          trackItem.commercialSafe   = _tCs === '1' ? true : _tCs === '0' ? false : null;
          trackItem.attributionRequired = _tAr;
          trackItem.personalOnly     = _tPo;
          trackItem.attribution      = (addTrackBtn.dataset.ta || '').replace(/"/g, '');
          trackItem.sourceUrl        = _tSu;
          trackItem.providerId       = _tPid;
        }
        // Record in asset registry if available
        var regResult = 'no registry';
        if (addSrc && window.LoadAssetRegistry) {
          try {
            window.LoadAssetRegistry.addAsset({
              assetType: trackKind === 'music' ? 'music' : 'sfx',
              source: _tPid,
              license: _tLic || 'unknown',
              rightsStatus: _tLic || 'unknown',
              commercialSafe: _tCs === '1' ? true : _tCs === '0' ? false : null,
              attributionRequired: _tAr,
              personalOnly: _tPo,
              attribution: (addTrackBtn.dataset.ta || '').replace(/"/g, ''),
              sourceUrl: _tSu,
              localPath: /^https?:\/\//.test(addSrc) ? null : addSrc,
              mimeType: 'audio/' + (addSrc.split('.').pop() || 'wav'),
              duration: dur,
              tags: [trackKind],
              notes: label
            });
            regResult = 'saved';
          } catch (regErr) { regResult = 'error: ' + (regErr && regErr.message); }
        }
        console.log('[LS add] AssetRegistry:', regResult);
        _addTrackItem(idx, trackKind, trackItem);
        var sc2 = _state.scenes[idx];
        var _addedList = sc2 ? (sc2.tracks[trackKind] || []) : [];
        var _addedIt   = _addedList[_addedList.length - 1] || {};
        _dbg('ADD ' + trackKind + ' id=' + (_addedIt.id || 'NONE'));
        _dbg('  title=' + (_addedIt.name || 'NONE'));
        _dbg('  src=' + (_addedIt.src ? _addedIt.src.slice(0, 80) : 'NONE -- WILL NOT PLAY'));
        _dbg('  dur=' + (_addedIt.dur || 0) + 's t0=' + (_addedIt.t0 || 0));
        // Unlock the audio element NOW, in this Add gesture. iOS Safari permanently
        // grants playback permission to an element that has play() called during a
        // user gesture. That same element can then be play()-ed later (Play button)
        // without needing a new gesture. new Audio(src).play() in a separate Play
        // gesture always aborts because the element was never gesture-unlocked.
        if (addSrc && (trackKind === 'music' || trackKind === 'sfx')) {
          var _sc2 = _state.scenes[idx];
          var _ulIdx = (_sc2 && _sc2.tracks[trackKind] ? _sc2.tracks[trackKind].length - 1 : -1);
          if (_sc2 && _ulIdx >= 0) {
            var _ulKey = _sc2.id + '_' + trackKind + '_track_' + _ulIdx;
            var _ulEl = document.createElement('audio');
            _ulEl.src = addSrc;
            _ulEl.volume = 0;
            _ulEl.addEventListener('loadstart', function () { _dbg('  unlock EVT loadstart'); });
            _ulEl.addEventListener('loadedmetadata', function () { _dbg('  unlock EVT meta dur=' + _ulEl.duration.toFixed(1) + ' cs=' + (_ulEl.currentSrc || '').slice(-50)); });
            _ulEl.addEventListener('canplay', function () { _dbg('  unlock EVT canplay rs=' + _ulEl.readyState); });
            _ulEl.addEventListener('playing', function () { _dbg('  unlock EVT playing ct=' + _ulEl.currentTime.toFixed(2) + ' vol=' + _ulEl.volume + ' muted=' + _ulEl.muted); });
            var _tuC = 0;
            _ulEl.addEventListener('timeupdate', function () { if (_tuC++ < 4) _dbg('  unlock EVT timeupdate ct=' + _ulEl.currentTime.toFixed(2)); });
            _ulEl.addEventListener('volumechange', function () { _dbg('  unlock EVT volchange vol=' + _ulEl.volume + ' muted=' + _ulEl.muted); });
            _ulEl.addEventListener('stalled', function () { _dbg('  unlock EVT stalled'); });
            _ulEl.addEventListener('suspend', function () { _dbg('  unlock EVT suspend rs=' + _ulEl.readyState + ' ns=' + _ulEl.networkState); });
            _ulEl.addEventListener('waiting', function () { _dbg('  unlock EVT waiting'); });
            _ulEl.addEventListener('error', function () { var _ue = _ulEl.error; _dbg('  unlock EVT error code=' + (_ue && _ue.code) + ' ' + (_ue && _ue.message)); });
            _ulEl.addEventListener('ended', function () { _dbg('  unlock EVT ended'); });
            // Play silently at volume=0. Do NOT pause — pausing before the remote
            // URL has buffered (Jamendo takes ~10s) leaves rs=0 when Play fires,
            // which iOS Safari rejects. The element keeps loading silently; when Play
            // fires it is already playing and just gets unmuted.
            var _ulP = _ulEl.play();
            if (_ulP && _ulP.catch) _ulP.catch(function () {});
            _audioPre[_ulKey] = _ulEl;
            _dbg('  unlocked (silent play) ' + _ulKey.slice(-24));
          }
        }
        _renderTracks(idx);
        _showPanel(null);
        _toast((trackKind === 'music' ? 'Music' : 'Sound FX') + (noSrc ? ' added — no audio source connected' : ' added'));
        return;
      }
      // Preview — centralized controller; one preview at a time; toggle stops
      var playBtn = e.target.closest('[data-tone]');
      if (playBtn) {
        var ak2     = playBtn.dataset.audioKey;
        var demoSrc = (ak2 && _DEMO_AUDIO[ak2]) || null;
        var dataSrc = playBtn.dataset.src || null;
        var src     = dataSrc || demoSrc;
        var sq      = playBtn.dataset.searchQuery;
        var rowEl   = playBtn.closest('[data-item-id]');
        console.log('[LS preview] itemId:', rowEl ? rowEl.dataset.itemId : 'n/a',
          '| ak:', ak2 || 'none', '| src:', src || 'NONE');
        if (src) { _PreviewCtrl.toggle(playBtn, src); return; }
        if (_PreviewCtrl.isActive(playBtn)) { _PreviewCtrl.stop(); return; }
        if (sq && window.LoadProviderRegistry) {
          if (playBtn.dataset.previewState === 'loading') return;
          playBtn.textContent = '…'; playBtn.disabled = true;
          var _tryLive = function (provs, pi) {
            if (pi >= provs.length) { playBtn.innerHTML = _PLAY_ICO; playBtn.disabled = false; return; }
            window.LoadProviderRegistry.searchMusic({query: sq, providerId: provs[pi]}).then(function (r) {
              var url = r && r.results && r.results[0] && r.results[0].previewUrl;
              if (!url) { _tryLive(provs, pi + 1); return; }
              playBtn.dataset.src = url;
              _PreviewCtrl.play(playBtn, url);
            }).catch(function () { _tryLive(provs, pi + 1); });
          };
          _tryLive(['ccmixter', 'openverse-audio'], 0);
          return;
        }
        return;
      }
      // data-open-pick or data-pick → open file picker
      var pickBtn = e.target.closest('[data-open-pick],[data-pick]');
      if (pickBtn) {
        var pickId = pickBtn.dataset.openPick || pickBtn.dataset.pick;
        var pick = _el(pickId); if (pick) pick.click();
      }
    });
    // Search input listeners — typing shows list pane with search results
    (function () {
      var ms = _el('lseb-music-search');
      if (ms) ms.addEventListener('input', function () {
        var q = ms.value.trim();
        if (!q) return;
        var mg = _el('lseb-music-cat-grid-wrap'); var mp = _el('lseb-music-list-pane');
        var mt = _el('lseb-music-cat-title');
        if (mg) mg.style.display = 'none'; if (mp) mp.style.display = '';
        if (mt) mt.textContent = 'Search: ' + q;
        _buildMusicList('all', q);
      });
      var ss = _el('lseb-sfx-search');
      if (ss) ss.addEventListener('input', function () {
        var q = ss.value.trim();
        if (!q) return;
        var sg = _el('lseb-sfx-cat-grid-wrap'); var sp = _el('lseb-sfx-list-pane');
        var st = _el('lseb-sfx-cat-title');
        if (sg) sg.style.display = 'none'; if (sp) sp.style.display = '';
        if (st) st.textContent = 'Search: ' + q;
        _buildSFXList('all', q);
      });
      // Panels open on grid view — lists load only when a tile is tapped
    }());
    // Populate record panel mini strip with current scene clips
    (function () {
      var strip = _el('lseb-rec-strip');
      if (!strip) return;
      var clips = (scene && scene.clips) || [];
      if (!clips.length) {
        strip.innerHTML = '<span class="ve-rec-strip-empty">No clips yet — add an image above.</span>';
      } else {
        strip.innerHTML = '';
        clips.forEach(function (c) {
          if (c.type === 'image' && c.src) {
            var img = document.createElement('img');
            img.src = c.src; img.alt = '';
            strip.appendChild(img);
          }
        });
        if (!strip.children.length) strip.innerHTML = '<span class="ve-rec-strip-empty">No image clips.</span>';
      }
    })();
    // Record done button — enable after recording completes
    var recDone = _el('lseb-rec-done');
    if (recDone) recDone.addEventListener('click', function () { _showPanel(null); });
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
      var it = _addTrackItem(idx, 'music', { name: file.name.replace(/\.[^.]+$/, ''), dur: scene.duration || 5, src: dataURL, localPath: dataURL, trackType: 'music', sourceUrl: '', vol: volNow });
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
  function _doAddText() {
    if (!textInp || !textInp.value.trim()) return;
    var pos = (_el('lseb-text-pos') && _el('lseb-text-pos').value) || 'bottom';
    var size = parseInt((_el('lseb-text-size') && _el('lseb-text-size').value) || '18', 10) || 18;
    var sc = _state.scenes[idx];
    _addTrackItem(idx, 'text', { text: textInp.value.trim(), dur: 3, pos: pos, size: size });
    _renderTracks(idx);
    if (sc) _initSubOverlay(sc);
    textInp.value = '';
    _showPanel(null);
  }
  if (textInp) textInp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); _doAddText(); }
  });
  var textAddBtn = _el('lseb-text-add-btn');
  if (textAddBtn) textAddBtn.addEventListener('click', _doAddText);

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
  // Clip image pick → add as main clip (shows thumbnail in clip strip)
  var clipImgPick = _el('lseb-clip-img-pick');
  if (clipImgPick) clipImgPick.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    _readDataURL(file).then(function (dataURL) {
      _attachImage(idx, dataURL, true);
    }).catch(function () { _toast('Could not read image.'); });
    e.target.value = '';
  });

  var overlayPick = _el('lseb-overlay-pick');
  if (overlayPick) overlayPick.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    _readDataURL(file).then(function (dataURL) {
      _addOverlayImage(idx, dataURL);
    }).catch(function () {});
    e.target.value = '';
  });

  // SFX file pick
  var sfxPick = _el('lseb-sfx-pick');
  if (sfxPick) sfxPick.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    _readDataURL(file).then(function (dataURL) {
      _addTrackItem(idx, 'sfx', { name: file.name.replace(/\.[^.]+$/, ''), dur: scene.duration || 5, src: dataURL, vol: 0.7 });
      var trackIdx = (scene.tracks.sfx || []).length - 1;
      if (trackIdx >= 0) _preloadAudio(scene.id, 'sfx_track_' + trackIdx, dataURL);
      _renderTracks(idx);
      _showPanel(null);
      _toast('SFX attached: ' + file.name);
    }).catch(function () { _toast('Could not read audio file.'); });
    e.target.value = '';
  });

  // Voice recording (MediaRecorder) and file upload
  var _recorder = null, _recChunks = [];
  var recordBtn = _el('lseb-record-btn');
  var recordIndicator = _el('lseb-record-indicator');

  function _attachVoiceBlob(blob) {
    var reader = new FileReader();
    reader.onload = function (e2) {
      var dataURL = e2.target.result;
      _addTrackItem(idx, 'voice', { name: 'Narration', dur: scene.duration || 5, src: dataURL, vol: 0.9 });
      var trackIdx = (scene.tracks.voice || []).length - 1;
      if (trackIdx >= 0) _preloadAudio(scene.id, 'voice_track_' + trackIdx, dataURL);
      _renderTracks(idx);
      _showPanel(null);
      _toast('Narration attached.');
    };
    reader.readAsDataURL(blob);
  }

  if (recordBtn) recordBtn.addEventListener('click', function () {
    if (_recorder && _recorder.state === 'recording') {
      _recorder.stop();
      recordBtn.classList.remove('recording');
      if (recordIndicator) recordIndicator.textContent = '';
    } else {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { _toast('Microphone not available.'); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        var mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) ? 'audio/webm;codecs=opus' :
                       (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')) ? 'audio/mp4' : '';
        var opts = mimeType ? { mimeType: mimeType } : {};
        _recChunks = [];
        _recorder = new MediaRecorder(stream, opts);
        _recorder.ondataavailable = function (ev) { if (ev.data.size > 0) _recChunks.push(ev.data); };
        _recorder.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          var blob = new Blob(_recChunks, { type: _recorder.mimeType || 'audio/webm' });
          _attachVoiceBlob(blob);
          var rd = _el('lseb-rec-done'); if (rd) rd.disabled = false;
        };
        _recorder.start();
        recordBtn.classList.add('recording');
        if (recordIndicator) recordIndicator.textContent = 'Recording...';
      }).catch(function () { _toast('Microphone access denied.'); });
    }
  });

  var voicePick = _el('lseb-voice-pick');
  if (voicePick) voicePick.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    _readDataURL(file).then(function (dataURL) {
      _addTrackItem(idx, 'voice', { name: file.name.replace(/\.[^.]+$/, ''), dur: scene.duration || 5, src: dataURL, vol: 0.9 });
      var trackIdx = (scene.tracks.voice || []).length - 1;
      if (trackIdx >= 0) _preloadAudio(scene.id, 'voice_track_' + trackIdx, dataURL);
      _renderTracks(idx);
      _showPanel(null);
      _toast('Narration attached: ' + file.name);
    }).catch(function () {});
    e.target.value = '';
  });

  // Transition panel
  var trOptions = _el('lseb-tr-options');
  if (trOptions) trOptions.querySelectorAll('.lseb-tr-option').forEach(function (opt) {
    opt.addEventListener('click', function () {
      var trType = opt.dataset.tr;
      var clip = scene.clips && scene.clips[_selectedClipIdx];
      if (!clip) { _toast('Select a clip first.'); return; }
      clip.outTransition = { type: trType, dur: trType === 'cut' ? 0 : 0.4 };
      _saveState();
      trOptions.querySelectorAll('.lseb-tr-option').forEach(function (o) {
        o.classList.toggle('active', o.dataset.tr === trType);
      });
      _toast('Transition: ' + trType);
    });
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

  // Dismiss context toolbar on tap outside
  var editor = _el('lseb-editor');
  if (editor) {
    editor.addEventListener('pointerdown', function (e) {
      var ctx = _el('lseb-clip-ctx');
      if (ctx && ctx.style.display !== 'none' && !ctx.contains(e.target) &&
          !e.target.classList.contains('timeline-clip') &&
          !e.target.closest('.timeline-clip') &&
          !e.target.classList.contains('ve-track-block') &&
          !e.target.closest('.ve-track-block')) {
        _hideClipCtx();
      }
    }, true);
  }

  // Transport
  var playBtn = _el('lseb-play-btn');
  if (playBtn) playBtn.addEventListener('click', function () {
    _PreviewCtrl.stop();
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
      var aEl = _activePreviewEl(idx);
      if (aEl && aEl.tagName === 'IMG') aEl.style.opacity = v / 100;
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
      var aEl = _activePreviewEl(idx);
      if (aEl && aEl.tagName === 'IMG') aEl.style.filter = _buildFilterStr(scene.fx, v);
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

    // Delete button
    var delBtn = document.createElement('button');
    delBtn.className = 'clip-del';
    delBtn.type = 'button';
    delBtn.setAttribute('aria-label', 'Delete clip');
    delBtn.textContent = '×';
    (function (ci_) {
      delBtn.addEventListener('click', function (e) { e.stopPropagation(); _deleteClip(idx, ci_); });
    })(ci);
    clipEl.appendChild(delBtn);

    // Move left / right buttons
    var reorderEl = document.createElement('div');
    reorderEl.className = 'clip-reorder';
    var moveL = document.createElement('button');
    moveL.type = 'button'; moveL.textContent = '←'; moveL.setAttribute('aria-label', 'Move left');
    if (ci === 0) moveL.disabled = true;
    var moveR = document.createElement('button');
    moveR.type = 'button'; moveR.textContent = '→'; moveR.setAttribute('aria-label', 'Move right');
    var scene2 = _state.scenes[idx];
    if (scene2 && ci >= (scene2.clips ? scene2.clips.length - 1 : 0)) moveR.disabled = true;
    (function (ci_) {
      moveL.addEventListener('click', function (e) { e.stopPropagation(); _moveClip(idx, ci_, ci_ - 1); });
      moveR.addEventListener('click', function (e) { e.stopPropagation(); _moveClip(idx, ci_, ci_ + 1); });
    })(ci);
    reorderEl.appendChild(moveL);
    reorderEl.appendChild(moveR);
    clipEl.appendChild(reorderEl);

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

// ─── CLIP DELETE / REORDER ───────────────────────────────────────────────────
function _deleteClip(idx, ci) {
  var scene = _state.scenes[idx];
  if (!scene || !scene.clips || scene.clips.length <= 1) { _toast('Cannot delete the only clip.'); return; }
  var clip = scene.clips[ci];
  if (clip && clip._previewEl) { try { clip._previewEl.remove(); } catch (_) {} clip._previewEl = null; }
  scene.clips.splice(ci, 1);
  _selectedClipIdx = Math.min(_selectedClipIdx, scene.clips.length - 1);
  var first = scene.clips[0];
  scene.media.image = first && first.type === 'image' ? first.src : null;
  scene.media.video = first && first.type === 'video' ? first.src : null;
  _saveState();
  var newTotal = _tlDuration(scene);
  _engine.t = Math.min(_engine.t, newTotal);
  _engine.globalTime = _engine.t;
  _engine.setTime(_engine.t, idx);
  _renderImageStrip(idx);
  _renderRuler(idx);
  _toast('Clip deleted.');
}
function _moveClip(idx, fromCi, toCi) {
  var scene = _state.scenes[idx];
  if (!scene || !scene.clips) return;
  if (fromCi === toCi || fromCi < 0 || toCi < 0) return;
  if (fromCi >= scene.clips.length || toCi >= scene.clips.length) return;
  var moved = scene.clips.splice(fromCi, 1)[0];
  scene.clips.splice(toCi, 0, moved);
  _selectedClipIdx = toCi;
  var first = scene.clips[0];
  scene.media.image = first && first.type === 'image' ? first.src : null;
  scene.media.video = first && first.type === 'video' ? first.src : null;
  _saveState();
  _renderImageStrip(idx);
  var selClip = scene.clips[_selectedClipIdx];
  if (selClip) _mountClipPreview(selClip, 0, false, idx);
}

// ─── TRACKS ──────────────────────────────────────────────────────────────────
function _addTrackItem(idx, kind, item) {
  var scene = _state.scenes[idx];
  if (!scene) return null;
  if (!scene.tracks) scene.tracks = { music: [], text: [], sticker: [], overlay: [], sfx: [], voice: [], transition: [] };
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

// ─── CLIP CONTEXT TOOLBAR ────────────────────────────────────────────────────
function _ctxSvgI(path) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">' + path + '</svg>';
}
function _ctxBtn(action, label, svgPath, extra) {
  return '<button class="lseb-ctx-btn' + (extra || '') + '" data-ctx="' + action + '" type="button" aria-label="' + label + '">' + _ctxSvgI(svgPath) + '<span>' + label + '</span></button>';
}
var _CTX_SEP = '<span class="lseb-ctx-sep" aria-hidden="true"></span>';
var _CTX_ICONS = {
  rep: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5.1"/>',
  kf:  '<polygon points="12 2 19 9 12 16 5 9"/>',
  cur: '<path d="M3 12c3-6 6-6 9 0s6 6 9 0"/>',
  lck: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  dup: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  del: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>',
  vol: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>',
  edt: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
};
function _ctxHtml(type) {
  var I = _CTX_ICONS; var S = _CTX_SEP;
  if (type === 'clip') {
    return _ctxBtn('replace', 'Replace', I.rep) + S +
           _ctxBtn('keyframe', 'Keyframe', I.kf) +
           _ctxBtn('curve', 'Curve', I.cur) + S +
           _ctxBtn('lock', 'Lock', I.lck) + S +
           _ctxBtn('duplicate', 'Duplicate', I.dup) + S +
           _ctxBtn('delete', 'Delete', I.del, ' ctx-danger');
  }
  if (type === 'text') {
    return _ctxBtn('track-edit', 'Edit', I.edt) + S +
           _ctxBtn('track-lock', 'Lock', I.lck) + S +
           _ctxBtn('track-dup', 'Duplicate', I.dup) + S +
           _ctxBtn('track-del', 'Delete', I.del, ' ctx-danger');
  }
  if (type === 'music' || type === 'sfx' || type === 'voice') {
    return _ctxBtn('track-vol', 'Volume', I.vol) + S +
           _ctxBtn('track-lock', 'Lock', I.lck) + S +
           _ctxBtn('track-dup', 'Duplicate', I.dup) + S +
           _ctxBtn('track-del', 'Delete', I.del, ' ctx-danger');
  }
  if (type === 'sticker' || type === 'overlay') {
    return _ctxBtn('replace-asset', 'Replace', I.rep) + S +
           _ctxBtn('track-lock', 'Lock', I.lck) + S +
           _ctxBtn('track-dup', 'Duplicate', I.dup) + S +
           _ctxBtn('track-del', 'Delete', I.del, ' ctx-danger');
  }
  return _ctxBtn('track-del', 'Delete', I.del, ' ctx-danger');
}
function _showClipCtx(anchorEl, type, data) {
  var ctx = _el('lseb-clip-ctx');
  var editor = _el('lseb-editor');
  if (!ctx || !editor) return;
  _ctxData = data;
  ctx.innerHTML = _ctxHtml(type);
  ctx.style.display = 'flex';
  var eRect = editor.getBoundingClientRect();
  var aRect = anchorEl ? anchorEl.getBoundingClientRect() : null;
  if (aRect) {
    var ctxH = ctx.offsetHeight || 56;
    var top = aRect.top - eRect.top - ctxH - 8;
    var centerX = aRect.left - eRect.left + aRect.width / 2;
    var ctxW = ctx.offsetWidth || 300;
    var left = Math.max(8, Math.min(centerX - ctxW / 2, eRect.width - ctxW - 8));
    var arrowPct = Math.round(Math.max(10, Math.min(90, (centerX - left) / ctxW * 100)));
    ctx.style.setProperty('--ctx-arrow', arrowPct + '%');
    ctx.style.top = Math.max(8, top) + 'px';
    ctx.style.left = left + 'px';
  }
  Array.prototype.forEach.call(ctx.querySelectorAll('.lseb-ctx-btn'), function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      _handleCtxAction(btn.dataset.ctx, _ctxData);
    });
  });
}
function _hideClipCtx() {
  var ctx = _el('lseb-clip-ctx');
  if (ctx) ctx.style.display = 'none';
  _ctxData = null;
}
function _handleCtxAction(action, data) {
  if (!data) return;
  var sceneIdx = data.sceneIdx;
  var scene = _state.scenes && _state.scenes[sceneIdx];
  if (!scene) return;
  if (action === 'replace') {
    _hideClipCtx();
    var p = _el('lseb-img-pick');
    if (p) { _appendingClip = false; p.click(); }
    return;
  }
  if (action === 'duplicate') {
    _hideClipCtx();
    if (data.ci == null) return;
    var clips = scene.clips;
    if (!clips || !clips[data.ci]) return;
    var orig = clips[data.ci];
    var dup = Object.assign({}, orig, { id: 'clip_' + (_nextId++), _previewEl: null, _kbIdx: null });
    clips.splice(data.ci + 1, 0, dup);
    _selectedClipIdx = data.ci + 1;
    _saveState();
    _renderImageStrip(sceneIdx);
    _mountClipPreview(scene.clips[_selectedClipIdx], 0, false, sceneIdx);
    _toast('Clip duplicated.');
    return;
  }
  if (action === 'delete') {
    _hideClipCtx();
    if (data.ci != null) _deleteClip(sceneIdx, data.ci);
    return;
  }
  if (action === 'lock') {
    var clip = scene.clips && scene.clips[data.ci];
    if (clip) { clip.locked = !clip.locked; _saveState(); _toast(clip.locked ? 'Locked.' : 'Unlocked.'); }
    _hideClipCtx();
    return;
  }
  if (action === 'keyframe' || action === 'curve' || action === 'track-edit' || action === 'replace-asset') {
    _toast('Coming soon.');
    return;
  }
  if (action === 'track-del') {
    _hideClipCtx();
    if (data.it && data.trackKind) {
      _removeTrackItem(sceneIdx, data.trackKind, data.it.id);
      _renderTracks(sceneIdx);
      if (data.trackKind === 'music') { scene.media.music = null; _renderWaveformPlaceholder(0); }
    }
    return;
  }
  if (action === 'track-dup') {
    _hideClipCtx();
    if (data.it && data.trackKind) {
      var itCopy = Object.assign({}, data.it, { id: data.trackKind + '_' + (_nextId++) });
      scene.tracks[data.trackKind] = scene.tracks[data.trackKind] || [];
      scene.tracks[data.trackKind].push(itCopy);
      _saveState();
      _renderTracks(sceneIdx);
      _toast('Duplicated.');
    }
    return;
  }
  if (action === 'track-lock') {
    if (data.it) { data.it.locked = !data.it.locked; _saveState(); _toast(data.it.locked ? 'Locked.' : 'Unlocked.'); }
    _hideClipCtx();
    return;
  }
  if (action === 'track-vol') {
    _toast('Use the panel volume slider.');
    _hideClipCtx();
    return;
  }
}

function _renderTracks(idx) {
  var editor = _el('lseb-editor');
  if (!editor) return;
  var scene = _state.scenes[idx];
  if (!scene) return;
  if (!scene.tracks) scene.tracks = { music: [], text: [], sticker: [], overlay: [], sfx: [], voice: [], transition: [] };

  ['music', 'text', 'sticker', 'overlay', 'sfx', 'voice', 'transition'].forEach(function (kind) {
    var row = editor.querySelector('.ve-track-row[data-track="' + kind + '"]');
    if (!row) return;
    Array.prototype.forEach.call(row.querySelectorAll('.ve-track-block'), function (b) { b.remove(); });
    var items = scene.tracks[kind] || [];
    if (kind === 'sfx' || kind === 'voice' || kind === 'transition') {
      row.style.display = items.length ? '' : 'none';
    }
    var empty = row.querySelector('.ve-track-empty');
    if (empty) empty.style.display = items.length ? 'none' : '';
    items.forEach(function (it) {
      var el = document.createElement('div');
      el.className = 've-track-block';
      el.dataset.trackKind = kind;
      el.dataset.itemId = it.id;
      el.style.left = (it.t0 * PX_PER_SECOND) + 'px';
      el.style.width = Math.max(40, it.dur * PX_PER_SECOND) + 'px';
      var label = kind === 'text' ? (it.text || 'Text') : kind === 'music' ? (it.name || 'Music') : kind === 'overlay' ? 'Overlay' : kind === 'sfx' ? (it.name || 'SFX') : kind === 'voice' ? (it.name || 'Voice') : kind === 'transition' ? (it.type || 'Transition') : 'Sticker';
      el.innerHTML =
        '<div class="ve-tb-trim l" data-edge="l"></div>' +
        '<span class="ve-tb-lbl" style="pointer-events:none">' + _esc(label.substring(0, 24)) + '</span>' +
        '<div class="ve-tb-trim r" data-edge="r"></div>' +
        '<button class="ve-tb-x" type="button" aria-label="Remove">×</button>';
      (function (it_, kind_) {
        el.addEventListener('click', function (e) {
          if (e.target.classList.contains('ve-tb-x') || e.target.classList.contains('ve-tb-trim')) return;
          _showClipCtx(el, kind_, { sceneIdx: idx, trackKind: kind_, it: it_ });
        });
      })(it, kind);
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
  if (sel) _mountClipPreview(sel, 0, false, idx);
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
  if (sel) _mountClipPreview(sel, 0, false, idx);
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
  _mountClipPreview(clip, 0, false, idx);
  _renderImageStrip(idx);
  var strip = _el('lseb-image-strip');
  var anchor = strip && strip.querySelectorAll('.timeline-clip')[ci];
  if (anchor) _showClipCtx(anchor, 'clip', { sceneIdx: idx, ci: ci });
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
  if (!scene || (!scene.media.image && !(scene.clips && scene.clips.length))) { _toast('Attach an image first.'); return; }
  scene.fx.rotate = ((scene.fx.rotate || 0) + 90) % 360;
  _saveState();
  var aEl = _activePreviewEl(idx);
  if (aEl && aEl.tagName === 'IMG') aEl.style.transform = _buildTransform(scene.fx);
  _toast('Rotated ' + scene.fx.rotate + '°');
}
function _mirrorScene(idx) {
  var scene = _state.scenes[idx];
  if (!scene) return;
  scene.fx.mirror = !scene.fx.mirror;
  _saveState();
  var aEl = _activePreviewEl(idx);
  if (aEl && aEl.tagName === 'IMG') aEl.style.transform = _buildTransform(scene.fx);
}
function _flipScene(idx) {
  var scene = _state.scenes[idx];
  if (!scene) return;
  scene.fx.flip = !scene.fx.flip;
  _saveState();
  var aEl = _activePreviewEl(idx);
  if (aEl && aEl.tagName === 'IMG') aEl.style.transform = _buildTransform(scene.fx);
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
