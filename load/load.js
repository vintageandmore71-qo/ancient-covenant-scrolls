// Load — Run Web Apps on iPad (PWA)
// Copyright (c) 2026 DssOrit. All Rights Reserved.
// Proprietary. See LICENSE at the repository root.

(function () {
  'use strict';

  /* =========================================================
   * PASSWORD — change the value below. Default: "acr2026".
   * ========================================================= */
  var PASSWORD = 'acr2026';

  var DB_NAME = 'load-db';
  var DB_VERSION = 1;
  var STORE_APPS = 'apps';
  var LS_AIDS = 'load_reading_aids_v1';

  var db = null;
  var apps = [];
  var currentApp = null;
  var currentBlobUrl = null;
  var aids = loadAids();

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function show(screenId) {
    var screens = ['login-screen', 'library-screen', 'viewer-screen'];
    for (var i = 0; i < screens.length; i++) {
      var el = $(screens[i]);
      if (!el) continue;
      if (screens[i] === screenId) el.classList.add('on');
      else el.classList.remove('on');
    }
  }

  /* ---------- IndexedDB ---------- */

  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(STORE_APPS)) {
          var store = d.createObjectStore(STORE_APPS, { keyPath: 'id' });
          store.createIndex('dateAdded', 'dateAdded');
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function tx(mode) {
    return db.transaction([STORE_APPS], mode).objectStore(STORE_APPS);
  }

  function listAll() {
    return new Promise(function (resolve, reject) {
      var req = tx('readonly').getAll();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function putApp(app) {
    return new Promise(function (resolve, reject) {
      var req = tx('readwrite').put(app);
      req.onsuccess = function () { resolve(app); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function deleteApp(id) {
    return new Promise(function (resolve, reject) {
      var req = tx('readwrite').delete(id);
      req.onsuccess = function () { resolve(); };
      req.onerror = function () { reject(req.error); };
    });
  }

  /* ---------- Reading aids persistence ---------- */

  function defaultAids() {
    return {
      fontSize: 1.0,
      lineHeight: 1.7,
      letterSpacing: 0,
      overlayColor: 'none',
      dyslexiaFont: false,
      bionic: false,
      focusLine: false
    };
  }
  function loadAids() {
    try {
      var raw = localStorage.getItem(LS_AIDS);
      if (!raw) return defaultAids();
      var obj = JSON.parse(raw);
      var base = defaultAids();
      for (var k in base) if (obj[k] != null) base[k] = obj[k];
      return base;
    } catch (e) { return defaultAids(); }
  }
  function saveAids() {
    try { localStorage.setItem(LS_AIDS, JSON.stringify(aids)); } catch (e) {}
  }

  /* ---------- Login ---------- */

  $('pw-btn').addEventListener('click', tryLogin);
  $('pw-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') tryLogin();
  });
  function tryLogin() {
    var v = $('pw-input').value;
    if (v === PASSWORD) {
      $('login-err').textContent = '';
      bootLibrary();
    } else {
      $('login-err').textContent = 'Incorrect password.';
      $('pw-input').select();
    }
  }

  async function bootLibrary() {
    try {
      db = await openDB();
      apps = await listAll();
      renderLibrary();
      show('library-screen');
    } catch (e) {
      $('login-err').textContent = 'Storage error: ' + (e && e.message ? e.message : e);
    }
  }

  /* ---------- Library ---------- */

  function renderLibrary() {
    var grid = $('library-grid');
    var empty = $('library-empty');
    if (!apps.length) {
      grid.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';
    apps.sort(function (a, b) {
      var la = a.lastOpened || a.dateAdded || 0;
      var lb = b.lastOpened || b.dateAdded || 0;
      return lb - la;
    });
    var parts = [];
    for (var i = 0; i < apps.length; i++) {
      var a = apps[i];
      var last = a.lastOpened ? 'Opened ' + relTime(a.lastOpened) : 'Not opened yet';
      parts.push(
        '<div class="tile" data-id="' + esc(a.id) + '">' +
          '<button class="tile-menu-btn" data-menu="' + esc(a.id) + '" aria-label="Options">&#8230;</button>' +
          '<div class="tile-icon">&#128196;</div>' +
          '<div class="tile-name">' + esc(a.name) + '</div>' +
          '<div class="tile-meta">' + esc(last) + '</div>' +
        '</div>'
      );
    }
    grid.innerHTML = parts.join('');
    var tiles = grid.querySelectorAll('.tile');
    for (var t = 0; t < tiles.length; t++) {
      tiles[t].addEventListener('click', onTileClick);
    }
    var menus = grid.querySelectorAll('.tile-menu-btn');
    for (var m = 0; m < menus.length; m++) {
      menus[m].addEventListener('click', onMenuClick);
    }
  }

  function relTime(ts) {
    var now = Date.now();
    var diff = Math.max(0, now - ts);
    var min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + ' min ago';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + ' hr ago';
    var d = Math.floor(hr / 24);
    if (d < 30) return d + ' day' + (d === 1 ? '' : 's') + ' ago';
    var mo = Math.floor(d / 30);
    return mo + ' mo ago';
  }

  function onTileClick(e) {
    if (e.target.classList.contains('tile-menu-btn')) return;
    var tile = e.currentTarget;
    var id = tile.getAttribute('data-id');
    var app = apps.find(function (x) { return x.id === id; });
    if (app) openApp(app);
  }

  function onMenuClick(e) {
    e.stopPropagation();
    var btn = e.currentTarget;
    var id = btn.getAttribute('data-menu');
    // Close any existing menus
    var existing = document.querySelectorAll('.context-menu');
    for (var i = 0; i < existing.length; i++) existing[i].remove();
    var tile = btn.closest('.tile');
    var menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML =
      '<button data-act="rename">Rename</button>' +
      '<button data-act="delete" class="danger">Delete</button>';
    tile.appendChild(menu);
    menu.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var act = ev.target.getAttribute('data-act');
      menu.remove();
      if (act === 'rename') promptRename(id);
      else if (act === 'delete') promptDelete(id);
    });
    // Close when tapping outside
    setTimeout(function () {
      document.addEventListener('click', function closer() {
        menu.remove();
        document.removeEventListener('click', closer);
      });
    }, 0);
  }

  /* ---------- Add / import ---------- */

  $('add-btn').addEventListener('click', function () { $('file-picker').click(); });
  $('file-picker').addEventListener('change', async function (e) {
    var files = e.target.files;
    if (!files || !files.length) return;
    for (var i = 0; i < files.length; i++) {
      try { await importFile(files[i]); } catch (err) {
        alert('Could not import ' + files[i].name + ': ' + (err && err.message ? err.message : err));
      }
    }
    e.target.value = '';
    renderLibrary();
  });

  async function importFile(file) {
    var text = await readAsText(file);
    var guessTitle = null;
    try {
      var m = /<title[^>]*>([^<]+)<\/title>/i.exec(text);
      if (m) guessTitle = m[1].trim();
    } catch (e) {}
    var app = {
      id: 'app-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      name: guessTitle || file.name.replace(/\.[^.]+$/, ''),
      html: text,
      dateAdded: Date.now(),
      lastOpened: null,
      sizeBytes: text.length
    };
    await putApp(app);
    apps.push(app);
  }

  function readAsText(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result || ''); };
      r.onerror = function () { reject(r.error); };
      r.readAsText(file);
    });
  }

  /* ---------- Rename / delete ---------- */

  function promptRename(id) {
    var app = apps.find(function (x) { return x.id === id; });
    if (!app) return;
    $('rename-input').value = app.name;
    $('rename-modal').classList.add('on');
    setTimeout(function () { $('rename-input').focus(); $('rename-input').select(); }, 30);
    var doSave = async function () {
      var v = $('rename-input').value.trim();
      if (v) {
        app.name = v;
        await putApp(app);
        renderLibrary();
      }
      closeRename();
    };
    $('rename-ok').onclick = doSave;
    $('rename-cancel').onclick = closeRename;
    $('rename-input').onkeydown = function (e) { if (e.key === 'Enter') doSave(); };
  }
  function closeRename() { $('rename-modal').classList.remove('on'); }

  function promptDelete(id) {
    var app = apps.find(function (x) { return x.id === id; });
    if (!app) return;
    $('confirm-title').textContent = 'Delete "' + app.name + '"?';
    $('confirm-body').textContent = 'This removes it from Load. The original file on your iPad is not touched.';
    $('confirm-modal').classList.add('on');
    $('confirm-ok').onclick = async function () {
      await deleteApp(id);
      apps = apps.filter(function (x) { return x.id !== id; });
      renderLibrary();
      closeConfirm();
    };
    $('confirm-cancel').onclick = closeConfirm;
  }
  function closeConfirm() { $('confirm-modal').classList.remove('on'); }

  /* ---------- Viewer ---------- */

  async function openApp(app) {
    currentApp = app;
    app.lastOpened = Date.now();
    try { await putApp(app); } catch (e) {}
    var blob = new Blob([app.html], { type: 'text/html; charset=utf-8' });
    if (currentBlobUrl) { try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {} }
    currentBlobUrl = URL.createObjectURL(blob);
    $('viewer-title').textContent = app.name;
    var frame = $('viewer-frame');
    frame.src = currentBlobUrl;
    show('viewer-screen');
    frame.addEventListener('load', onFrameLoaded, { once: true });
  }

  function closeViewer() {
    show('library-screen');
    var frame = $('viewer-frame');
    frame.src = 'about:blank';
    if (currentBlobUrl) { try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {} currentBlobUrl = null; }
    currentApp = null;
    $('viewer-topbar').classList.remove('hidden');
    $('show-ui-btn').classList.remove('on');
    $('focus-line').classList.remove('on');
    $('aids-panel').classList.remove('on');
    $('aids-scrim').classList.remove('on');
    renderLibrary();
  }

  $('back-btn').addEventListener('click', closeViewer);
  $('reload-btn').addEventListener('click', function () {
    if (!currentApp) return;
    openApp(currentApp);
  });
  $('hide-ui-btn').addEventListener('click', function () {
    $('viewer-topbar').classList.add('hidden');
    $('show-ui-btn').classList.add('on');
  });
  $('show-ui-btn').addEventListener('click', function () {
    $('viewer-topbar').classList.remove('hidden');
    $('show-ui-btn').classList.remove('on');
  });

  /* ---------- Reading aids ---------- */

  $('aids-btn').addEventListener('click', openAids);
  $('aids-close').addEventListener('click', closeAids);
  $('aids-scrim').addEventListener('click', closeAids);
  function openAids() {
    $('aids-panel').classList.add('on');
    $('aids-scrim').classList.add('on');
    refreshAidButtonStates();
  }
  function closeAids() {
    $('aids-panel').classList.remove('on');
    $('aids-scrim').classList.remove('on');
  }

  document.querySelectorAll('.aid-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var act = btn.getAttribute('data-act');
      handleAidAction(act, btn);
    });
  });

  function handleAidAction(act, btn) {
    switch (act) {
      case 'fs-up': aids.fontSize = Math.min(2.5, aids.fontSize + 0.1); break;
      case 'fs-down': aids.fontSize = Math.max(0.6, aids.fontSize - 0.1); break;
      case 'fs-reset': aids.fontSize = 1.0; break;
      case 'line-up': aids.lineHeight = Math.min(2.5, aids.lineHeight + 0.1); break;
      case 'line-down': aids.lineHeight = Math.max(1.0, aids.lineHeight - 0.1); break;
      case 'line-reset': aids.lineHeight = 1.7; break;
      case 'ls-up': aids.letterSpacing = Math.min(0.5, aids.letterSpacing + 0.02); break;
      case 'ls-down': aids.letterSpacing = Math.max(-0.1, aids.letterSpacing - 0.02); break;
      case 'ls-reset': aids.letterSpacing = 0; break;
      case 'color':
        aids.overlayColor = btn.getAttribute('data-color');
        break;
      case 'font-toggle': aids.dyslexiaFont = !aids.dyslexiaFont; break;
      case 'bionic-toggle': aids.bionic = !aids.bionic; break;
      case 'focus-toggle': aids.focusLine = !aids.focusLine; break;
    }
    saveAids();
    applyAidsToFrame();
    refreshAidButtonStates();
  }

  function refreshAidButtonStates() {
    document.querySelectorAll('.color-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-color') === aids.overlayColor);
    });
    toggleClass('[data-act="font-toggle"]', aids.dyslexiaFont);
    toggleClass('[data-act="bionic-toggle"]', aids.bionic);
    toggleClass('[data-act="focus-toggle"]', aids.focusLine);
  }
  function toggleClass(selector, on) {
    var el = document.querySelector(selector);
    if (el) el.classList.toggle('active', on);
  }

  function onFrameLoaded() { applyAidsToFrame(); }

  function applyAidsToFrame() {
    var frame = $('viewer-frame');
    var doc;
    try { doc = frame.contentDocument; } catch (e) { doc = null; }
    $('focus-line').classList.toggle('on', aids.focusLine);

    if (!doc || !doc.body) return;

    // Remove prior style + overlay, so we can reapply cleanly
    var prior = doc.getElementById('__load_aids_style');
    if (prior) prior.remove();
    var priorOverlay = doc.getElementById('__load_aids_overlay');
    if (priorOverlay) priorOverlay.remove();

    // Build an aids stylesheet. All selectors use !important so they win
    // against the loaded page's own CSS.
    var css = '';
    css += 'html, body { font-size: ' + (aids.fontSize * 100) + '% !important; ';
    css += 'line-height: ' + aids.lineHeight + ' !important; ';
    css += 'letter-spacing: ' + aids.letterSpacing + 'em !important; }\n';

    if (aids.dyslexiaFont) {
      // OpenDyslexic isn't bundled here; fall back to a known-readable
      // sans-serif with wider letterforms. User can also rely on embedded
      // fonts in their own apps (e.g. Attain-Standalone.html).
      css += '* { font-family: "OpenDyslexic", "Atkinson Hyperlegible", "Comic Sans MS", "Lucida Grande", sans-serif !important; }\n';
    }

    var styleEl = doc.createElement('style');
    styleEl.id = '__load_aids_style';
    styleEl.textContent = css;
    doc.head.appendChild(styleEl);

    // Color overlay as a fixed div inside the iframe
    if (aids.overlayColor && aids.overlayColor !== 'none') {
      var overlay = doc.createElement('div');
      overlay.id = '__load_aids_overlay';
      var c = 'transparent';
      if (aids.overlayColor === 'cream') c = 'rgba(244, 234, 220, 0.35)';
      else if (aids.overlayColor === 'yellow') c = 'rgba(255, 244, 184, 0.3)';
      else if (aids.overlayColor === 'blue') c = 'rgba(212, 232, 248, 0.35)';
      overlay.setAttribute('style',
        'position:fixed;inset:0;background:' + c + ';pointer-events:none;z-index:2147483647;mix-blend-mode:multiply;');
      doc.body.appendChild(overlay);
    }

    // Bionic reading: bold the first ~40% of characters of each word
    if (aids.bionic) {
      applyBionic(doc.body);
    } else {
      removeBionic(doc.body);
    }
  }

  var BIONIC_SKIP_TAGS = { SCRIPT:1, STYLE:1, CODE:1, PRE:1, TEXTAREA:1, INPUT:1, NOSCRIPT:1, SVG:1 };
  function applyBionic(root) {
    // Walk text nodes, wrap the first ~40% of each word in <b data-load-bionic>
    var walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        while (p && p !== root) {
          if (BIONIC_SKIP_TAGS[p.tagName]) return NodeFilter.FILTER_REJECT;
          if (p.dataset && p.dataset.loadBionic != null) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var text = n.nodeValue;
      var frag = n.ownerDocument.createDocumentFragment();
      text.split(/(\s+)/).forEach(function (tok) {
        if (!tok.length) return;
        if (/^\s+$/.test(tok)) { frag.appendChild(n.ownerDocument.createTextNode(tok)); return; }
        var boldLen = Math.max(1, Math.ceil(tok.length * 0.4));
        var b = n.ownerDocument.createElement('b');
        b.dataset.loadBionic = '1';
        b.textContent = tok.slice(0, boldLen);
        frag.appendChild(b);
        if (boldLen < tok.length) frag.appendChild(n.ownerDocument.createTextNode(tok.slice(boldLen)));
      });
      n.parentNode.replaceChild(frag, n);
    }
  }
  function removeBionic(root) {
    var bolds = root.querySelectorAll('b[data-load-bionic]');
    for (var i = 0; i < bolds.length; i++) {
      var b = bolds[i];
      b.parentNode.replaceChild(root.ownerDocument.createTextNode(b.textContent), b);
    }
    // Normalize to merge sibling text nodes
    try { root.normalize(); } catch (e) {}
  }

  /* ---------- Splash screen timing ---------- */
  // CSS runs the fade-out animation at 1.5s. Remove the element from
  // the DOM after the animation completes so taps go through.
  setTimeout(function () {
    var s = $('splash-screen');
    if (s) s.classList.add('hidden');
  }, 2000);

  /* ---------- Boot ---------- */
  // Autofocus password input (after splash clears)
  setTimeout(function () { var p = $('pw-input'); if (p) p.focus(); }, 2100);
}());
