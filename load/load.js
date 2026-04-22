// Load — Run Web Apps on iPad (PWA)
// Copyright (c) 2026 DssOrit. All Rights Reserved.
// Proprietary. See LICENSE at the repository root.

(function () {
  'use strict';

  /* Password removed for personal-use offline build. All data stays on
   * the device; no auth layer needed. If you ever want to re-lock the
   * app, we can add an optional setting for it. */

  var DB_NAME = 'load-db';
  var DB_VERSION = 1;
  var STORE_APPS = 'apps';
  var LS_AIDS = 'load_reading_aids_v1';
  var LS_SETTINGS = 'load_settings_v1';

  var db = null;
  var apps = [];
  var currentApp = null;
  var currentBlobUrl = null;
  var currentTypeFilter = 'all';   // all | html | zip | pdf | epub
  var aids = loadAids();
  var settings = loadSettings();

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function show(screenId) {
    var screens = ['home-screen', 'library-screen', 'viewer-screen', 'editor-screen'];
    for (var i = 0; i < screens.length; i++) {
      var el = $(screens[i]);
      if (!el) continue;
      if (screens[i] === screenId) el.classList.add('on');
      else el.classList.remove('on');
    }
  }

  /* ---------- Settings (font / theme / motion) ---------- */
  function defaultSettings() {
    return { font: 'atkinson', theme: 'dark', reduceMotion: false,
             fontSizeStep: 0, lineStep: 0, letterStep: 0 };
  }
  function loadSettings() {
    try {
      var raw = localStorage.getItem(LS_SETTINGS);
      if (!raw) return defaultSettings();
      var obj = JSON.parse(raw);
      var base = defaultSettings();
      for (var k in base) if (obj[k] != null) base[k] = obj[k];
      return base;
    } catch (e) { return defaultSettings(); }
  }
  function saveSettings() {
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); } catch (e) {}
  }
  function applySettings() {
    document.body.classList.toggle('dyslexic-font', settings.font === 'opendyslexic');
    ['dark', 'cream', 'sepia', 'blue', 'contrast'].forEach(function (t) {
      document.body.classList.toggle('theme-' + t, settings.theme === t);
    });
    document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
    // Per-step size / spacing adjustments applied to :root font-size
    var rootFS = 17 + (settings.fontSizeStep || 0) * 1.5;   // px
    var rootLine = 1.75 + (settings.lineStep || 0) * 0.1;
    var rootLetter = 0.015 + (settings.letterStep || 0) * 0.015;
    document.documentElement.style.fontSize = rootFS + 'px';
    document.body.style.lineHeight = rootLine;
    document.body.style.letterSpacing = rootLetter + 'em';
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

  /* ---------- Boot sequence ---------- */
  async function boot() {
    try {
      applySettings();
      db = await openDB();
      apps = await listAll();
      updateHomeCounts();
      wireNavButtons();
      wireHomeActions();
      wireSettingsPanel();
      wireLibrarySearch();
      wireNotes();
      wireTts();
      renderRecent();

      // Deep-link: if the URL has ?app=<id>, open that app directly.
      // Used by home-screen icons created via "Add to Home Screen".
      var params = new URLSearchParams(window.location.search);
      var autoId = params.get('app');
      if (autoId) {
        var target = apps.find(function (x) { return x.id === autoId; });
        if (target) {
          show('viewer-screen');
          openApp(target);
          return;
        }
      }
      // Otherwise show home by default
      show('home-screen');
    } catch (e) {
      alert('Failed to start Load: ' + (e && e.message ? e.message : e));
    }
  }

  /* ---------- Home screen ---------- */
  function updateHomeCounts() {
    var counts = { html: 0, zip: 0, pdf: 0, epub: 0 };
    for (var i = 0; i < apps.length; i++) {
      var k = apps[i].kind || 'html';
      if (counts[k] != null) counts[k]++;
    }
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var k = el.getAttribute('data-count');
      el.textContent = counts[k] || 0;
    });
    var total = apps.length;
    var sub = document.getElementById('home-library-count');
    if (sub) sub.textContent = total
      ? 'Browse all ' + total + ' item' + (total === 1 ? '' : 's')
      : "Nothing imported yet";
  }

  function renderRecent() {
    var section = $('home-recent');
    var row = $('home-recent-row');
    if (!row || !section) return;
    var recent = apps.filter(function (a) { return a.lastOpened; })
                     .sort(function (a, b) { return (b.lastOpened || 0) - (a.lastOpened || 0); })
                     .slice(0, 6);
    if (!recent.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    var html = '';
    for (var i = 0; i < recent.length; i++) {
      var a = recent[i];
      html += '<button class="mini-tile" data-open="' + esc(a.id) + '">' +
        '<div class="mini-tile-name">' + esc(a.name) + '</div>' +
        '<div class="mini-tile-meta">' + esc(relTime(a.lastOpened)) + '</div>' +
        '</button>';
    }
    row.innerHTML = html;
    row.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-open');
        var app = apps.find(function (x) { return x.id === id; });
        if (app) openApp(app);
      });
    });
  }

  function wireNavButtons() {
    // All nav buttons (Home / Library / Import / Settings) across all screens
    document.querySelectorAll('.nav-btn[data-nav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-nav');
        if (target === 'home') show('home-screen');
        else if (target === 'library') { currentTypeFilter = 'all'; show('library-screen'); renderLibrary(); }
        else if (target === 'import') { $('file-picker').click(); }
        else if (target === 'settings') openSettingsPanel();
      });
    });
    // Inline topbar tool buttons: font size, theme, dyslexia font, notes
    document.querySelectorAll('.nav-btn[data-tool]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tool = btn.getAttribute('data-tool');
        if (tool === 'size-up') { settings.fontSizeStep = Math.min(6, (settings.fontSizeStep || 0) + 1); saveSettings(); applySettings(); }
        else if (tool === 'size-down') { settings.fontSizeStep = Math.max(-2, (settings.fontSizeStep || 0) - 1); saveSettings(); applySettings(); }
        else if (tool === 'theme') cycleTheme();
        else if (tool === 'font') toggleDyslexiaFont();
        else if (tool === 'notes') openNotesIndex();
      });
    });
  }
  function cycleTheme() {
    var order = ['dark', 'cream', 'sepia', 'blue', 'contrast'];
    var idx = order.indexOf(settings.theme);
    settings.theme = order[(idx + 1) % order.length];
    saveSettings(); applySettings();
  }
  function toggleDyslexiaFont() {
    settings.font = (settings.font === 'opendyslexic') ? 'atkinson' : 'opendyslexic';
    saveSettings(); applySettings();
  }
  function openNotesIndex() {
    // Show a simple modal listing all apps that have notes attached
    var withNotes = apps.filter(function (a) { return a.notes && a.notes.trim(); });
    if (!withNotes.length) {
      alert('No notes yet. Open a library item and tap the notes icon to start one.');
      return;
    }
    var list = withNotes.map(function (a, i) {
      return (i + 1) + '. ' + a.name + '\n    ' + String(a.notes).slice(0, 120).replace(/\n/g, ' ');
    }).join('\n\n');
    alert('Your notes:\n\n' + list);
  }

  function wireHomeActions() {
    $('home-get-started').addEventListener('click', function () { $('file-picker').click(); });
    $('home-library').addEventListener('click', function () {
      currentTypeFilter = 'all'; show('library-screen'); renderLibrary();
    });
    $('home-pwa').addEventListener('click', function () {
      $('pwa-modal').classList.add('on');
    });
    $('pwa-modal-cancel').addEventListener('click', function () {
      $('pwa-modal').classList.remove('on');
    });
    $('pwa-modal-pick').addEventListener('click', function () {
      $('pwa-modal').classList.remove('on');
      $('file-picker').click();
    });
    document.querySelectorAll('.type-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var t = card.getAttribute('data-type');
        if (!t) return;
        currentTypeFilter = t;
        show('library-screen');
        renderLibrary();
      });
    });
  }

  /* ---------- Library search ---------- */
  var searchQuery = '';
  var searchBarEl = null;
  var searchInputEl = null;
  function toggleLibrarySearch() {
    searchBarEl = searchBarEl || $('library-search');
    searchBarEl.classList.toggle('on');
    if (searchBarEl.classList.contains('on')) {
      setTimeout(function () { $('library-search-input').focus(); }, 30);
    } else {
      searchQuery = '';
      $('library-search-input').value = '';
      renderLibrary();
    }
  }
  function wireLibrarySearch() {
    $('library-search-btn').addEventListener('click', toggleLibrarySearch);
    $('library-search-clear').addEventListener('click', function () {
      $('library-search-input').value = '';
      searchQuery = '';
      renderLibrary();
      $('library-search-input').focus();
    });
    $('library-search-input').addEventListener('input', function (e) {
      searchQuery = String(e.target.value || '').trim().toLowerCase();
      renderLibrary();
    });
  }

  /* ---------- Notes per imported app ---------- */
  var notesApp = null;
  function openNotesFor(app) {
    notesApp = app;
    $('notes-app-name').textContent = app.name;
    $('notes-textarea').value = app.notes || '';
    $('notes-drawer').classList.add('on');
  }
  function closeNotes() {
    $('notes-drawer').classList.remove('on');
    notesApp = null;
  }
  function wireNotes() {
    $('notes-close').addEventListener('click', closeNotes);
    $('notes-save').addEventListener('click', async function () {
      if (!notesApp) return;
      notesApp.notes = $('notes-textarea').value;
      try {
        await putApp(notesApp);
        var idx = apps.findIndex(function (x) { return x.id === notesApp.id; });
        if (idx >= 0) apps[idx] = notesApp;
        closeNotes();
        renderLibrary();
      } catch (e) {
        alert('Save failed: ' + (e && e.message ? e.message : e));
      }
    });
    $('notes-btn').addEventListener('click', function () {
      if (currentApp) openNotesFor(currentApp);
    });
  }

  /* ---------- TTS (Read Aloud) ---------- */
  var ttsUtterance = null;
  var ttsVoices = [];
  var ttsState = 'idle'; // idle | playing | paused
  function populateTtsVoices() {
    if (!window.speechSynthesis) return;
    ttsVoices = speechSynthesis.getVoices() || [];
    var sel = $('tts-voice');
    if (!sel) return;
    sel.innerHTML = '';
    var defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'System default';
    sel.appendChild(defaultOpt);
    ttsVoices.forEach(function (v, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = v.name + ' (' + v.lang + ')';
      sel.appendChild(o);
    });
  }
  function getFrameText() {
    var frame = $('viewer-frame');
    try {
      var doc = frame.contentDocument;
      if (!doc || !doc.body) return '';
      return String(doc.body.innerText || doc.body.textContent || '').trim();
    } catch (e) { return ''; }
  }
  function ttsPlay() {
    if (!window.speechSynthesis) {
      $('tts-status').textContent = 'Speech not supported on this device.';
      return;
    }
    if (ttsState === 'paused') {
      speechSynthesis.resume();
      ttsState = 'playing';
      $('tts-play').style.display = 'none';
      $('tts-pause').style.display = '';
      $('tts-status').textContent = 'Playing...';
      return;
    }
    var text = getFrameText();
    if (!text) { $('tts-status').textContent = 'No text to read on this page.'; return; }
    speechSynthesis.cancel();
    ttsUtterance = new SpeechSynthesisUtterance(text.slice(0, 32000)); // keep it safe
    var speed = parseFloat($('tts-speed').value) || 1;
    ttsUtterance.rate = speed;
    var voiceIdx = $('tts-voice').value;
    if (voiceIdx !== '' && ttsVoices[parseInt(voiceIdx, 10)]) {
      ttsUtterance.voice = ttsVoices[parseInt(voiceIdx, 10)];
    }
    ttsUtterance.onend = function () {
      ttsState = 'idle';
      $('tts-play').style.display = '';
      $('tts-pause').style.display = 'none';
      $('tts-status').textContent = 'Finished.';
    };
    ttsUtterance.onerror = function (e) {
      ttsState = 'idle';
      $('tts-play').style.display = '';
      $('tts-pause').style.display = 'none';
      $('tts-status').textContent = 'Playback error.';
    };
    speechSynthesis.speak(ttsUtterance);
    ttsState = 'playing';
    $('tts-play').style.display = 'none';
    $('tts-pause').style.display = '';
    $('tts-status').textContent = 'Playing...';
  }
  function ttsPause() {
    if (!window.speechSynthesis) return;
    if (ttsState === 'playing') {
      speechSynthesis.pause();
      ttsState = 'paused';
      $('tts-play').style.display = '';
      $('tts-pause').style.display = 'none';
      $('tts-status').textContent = 'Paused.';
    }
  }
  function ttsStop() {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    ttsState = 'idle';
    $('tts-play').style.display = '';
    $('tts-pause').style.display = 'none';
    $('tts-status').textContent = 'Stopped.';
  }
  function wireTts() {
    $('tts-btn').addEventListener('click', function () {
      $('tts-drawer').classList.toggle('on');
      if ($('tts-drawer').classList.contains('on') && ttsVoices.length === 0) {
        populateTtsVoices();
      }
    });
    $('tts-close').addEventListener('click', function () {
      ttsStop();
      $('tts-drawer').classList.remove('on');
    });
    $('tts-play').addEventListener('click', ttsPlay);
    $('tts-pause').addEventListener('click', ttsPause);
    $('tts-stop').addEventListener('click', ttsStop);
    $('tts-speed').addEventListener('change', function () {
      // Re-start with new speed if currently playing
      if (ttsState === 'playing') { ttsStop(); ttsPlay(); }
    });
    if (window.speechSynthesis) {
      // Voice list may load async
      populateTtsVoices();
      speechSynthesis.onvoiceschanged = populateTtsVoices;
    }
  }

  /* ---------- HTML source editor ---------- */
  var editingApp = null;
  function openEditor(app) {
    editingApp = app;
    $('editor-title').textContent = 'Editing: ' + app.name;
    $('editor-textarea').value = app.html || '';
    show('editor-screen');
  }
  $('editor-back').addEventListener('click', function () {
    editingApp = null;
    show('library-screen');
    renderLibrary();
  });
  $('editor-save').addEventListener('click', async function () {
    if (!editingApp) return;
    var newHtml = $('editor-textarea').value;
    editingApp.html = newHtml;
    editingApp.sizeBytes = newHtml.length;
    try {
      await putApp(editingApp);
      // Update in-memory apps array
      var idx = apps.findIndex(function (x) { return x.id === editingApp.id; });
      if (idx >= 0) apps[idx] = editingApp;
      alert('Saved.');
    } catch (e) {
      alert('Save failed: ' + (e && e.message ? e.message : e));
    }
  });

  /* ---------- Settings panel ---------- */
  function openSettingsPanel() {
    refreshSettingsPanel();
    $('settings-panel').classList.add('on');
    $('settings-scrim').classList.add('on');
  }
  function closeSettingsPanel() {
    $('settings-panel').classList.remove('on');
    $('settings-scrim').classList.remove('on');
  }
  function refreshSettingsPanel() {
    document.querySelectorAll('[data-font]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-font') === settings.font);
    });
    document.querySelectorAll('[data-theme]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-theme') === settings.theme);
    });
    var m = $('settings-motion');
    if (m) { m.textContent = settings.reduceMotion ? 'On' : 'Off'; m.classList.toggle('active', settings.reduceMotion); }
  }
  function wireSettingsPanel() {
    $('settings-close').addEventListener('click', closeSettingsPanel);
    $('settings-scrim').addEventListener('click', closeSettingsPanel);
    document.querySelectorAll('[data-font]').forEach(function (b) {
      b.addEventListener('click', function () {
        settings.font = b.getAttribute('data-font');
        saveSettings(); applySettings(); refreshSettingsPanel();
      });
    });
    document.querySelectorAll('[data-theme]').forEach(function (b) {
      b.addEventListener('click', function () {
        settings.theme = b.getAttribute('data-theme');
        saveSettings(); applySettings(); refreshSettingsPanel();
      });
    });
    document.querySelectorAll('[data-size]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-size');
        if (a === 'up') settings.fontSizeStep = Math.min(6, (settings.fontSizeStep || 0) + 1);
        else if (a === 'down') settings.fontSizeStep = Math.max(-2, (settings.fontSizeStep || 0) - 1);
        else settings.fontSizeStep = 0;
        saveSettings(); applySettings();
      });
    });
    document.querySelectorAll('[data-line]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-line');
        if (a === 'up') settings.lineStep = Math.min(4, (settings.lineStep || 0) + 1);
        else if (a === 'down') settings.lineStep = Math.max(-2, (settings.lineStep || 0) - 1);
        else settings.lineStep = 0;
        saveSettings(); applySettings();
      });
    });
    document.querySelectorAll('[data-letter]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-letter');
        if (a === 'up') settings.letterStep = Math.min(4, (settings.letterStep || 0) + 1);
        else if (a === 'down') settings.letterStep = Math.max(-2, (settings.letterStep || 0) - 1);
        else settings.letterStep = 0;
        saveSettings(); applySettings();
      });
    });
    $('settings-motion').addEventListener('click', function () {
      settings.reduceMotion = !settings.reduceMotion;
      saveSettings(); applySettings(); refreshSettingsPanel();
    });
  }

  /* ---------- Library ---------- */

  function renderLibrary() {
    var grid = $('library-grid');
    var empty = $('library-empty');
    var filtered = (currentTypeFilter === 'all')
      ? apps.slice()
      : apps.filter(function (a) { return (a.kind || 'html') === currentTypeFilter; });
    if (searchQuery) {
      filtered = filtered.filter(function (a) {
        var hay = ((a.name || '') + ' ' + (a.notes || '')).toLowerCase();
        return hay.indexOf(searchQuery) >= 0;
      });
    }
    if (!filtered.length) {
      grid.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';
    filtered.sort(function (a, b) {
      var la = a.lastOpened || a.dateAdded || 0;
      var lb = b.lastOpened || b.dateAdded || 0;
      return lb - la;
    });
    var apps_to_render = filtered;
    var parts = [];
    for (var i = 0; i < apps_to_render.length; i++) {
      var a = apps_to_render[i];
      var last = a.lastOpened ? 'Opened ' + relTime(a.lastOpened) : 'Not opened yet';
      var iconChar = '&#128196;'; // generic doc
      var kindLabel = '';
      if (a.kind === 'zip') { iconChar = '&#128230;'; kindLabel = 'Web app'; }
      else if (a.kind === 'pdf') { iconChar = '&#128462;'; kindLabel = 'PDF'; }
      else if (a.kind === 'epub') { iconChar = '&#128214;'; kindLabel = 'EPUB'; }
      else if (a.kind === 'html') { iconChar = '&#128196;'; kindLabel = 'HTML'; }
      var notesIcon = a.notes && a.notes.trim() ? ' <span class="tile-has-notes" title="Has notes">&#128221;</span>' : '';
      parts.push(
        '<div class="tile" data-id="' + esc(a.id) + '">' +
          '<button class="tile-menu-btn" data-menu="' + esc(a.id) + '" aria-label="Options">&#8230;</button>' +
          '<div class="tile-icon">' + iconChar + '</div>' +
          '<div class="tile-name">' + esc(a.name) + notesIcon + '</div>' +
          '<div class="tile-meta">' + (kindLabel ? kindLabel + ' &middot; ' : '') + esc(last) + '</div>' +
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
      '<button data-act="open">View</button>' +
      '<button data-act="notes">Notes</button>' +
      '<button data-act="edit">Edit HTML</button>' +
      '<button data-act="home">Add to Home Screen</button>' +
      '<button data-act="rename">Rename</button>' +
      '<button data-act="delete" class="danger">Delete</button>';
    tile.appendChild(menu);
    menu.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var act = ev.target.getAttribute('data-act');
      menu.remove();
      var app = apps.find(function (x) { return x.id === id; });
      if (!app) return;
      if (act === 'open') openApp(app);
      else if (act === 'notes') openNotesFor(app);
      else if (act === 'edit') openEditor(app);
      else if (act === 'rename') promptRename(id);
      else if (act === 'delete') promptDelete(id);
      else if (act === 'home') promptAddToHome(id);
    });
    // Close when tapping outside
    setTimeout(function () {
      document.addEventListener('click', function closer() {
        menu.remove();
        document.removeEventListener('click', closer);
      });
    }, 0);
  }

  /* ---------- Add to Home Screen flow ---------- */
  // When the user taps "Add to Home Screen" on a tile, we (1) rewrite
  // the current URL to include ?app=<id>, and (2) show an explainer
  // modal. After the user taps Safari Share -> Add to Home Screen, iOS
  // bookmarks the URL with the ?app= param intact. Tapping the icon
  // launches Load, and the auto-open handler jumps straight into that
  // app after the password unlock.
  function promptAddToHome(id) {
    var app = apps.find(function (x) { return x.id === id; });
    if (!app) return;
    var base = window.location.pathname.replace(/[^/]*$/, '');
    var newUrl = base + '?app=' + encodeURIComponent(id);
    // Update the URL without navigating.
    try { history.replaceState(null, '', newUrl); } catch (e) {}
    // Populate + show the explainer modal.
    $('home-modal-title').textContent = 'Save "' + app.name + '" to Home Screen';
    $('home-modal-app').textContent = app.name;
    $('home-modal').classList.add('on');
  }
  $('home-modal-close').addEventListener('click', function () {
    $('home-modal').classList.remove('on');
  });

  /* ---------- Add / import ---------- */

  $('add-btn').addEventListener('click', function () { $('file-picker').click(); });
  $('file-picker').addEventListener('change', async function (e) {
    var files = e.target.files;
    if (!files || !files.length) return;
    try {
      // Multi-file bundle detection: if the user picked several files AND
      // one of them is HTML, treat the selection as a "folder-like" web
      // app bundle. iOS Safari cannot pick folders directly, so this is
      // the closest equivalent — tap-select multiple files from the same
      // folder in the Files app and Load bundles them together.
      if (files.length > 1 && hasHtmlEntry(files)) {
        await importMultiFileBundle(files);
      } else {
        for (var i = 0; i < files.length; i++) {
          try { await importFile(files[i]); }
          catch (err) {
            hideProgress();
            alert('Could not import ' + files[i].name + ': ' + (err && err.message ? err.message : err));
          }
        }
      }
    } catch (err) {
      hideProgress();
      alert('Import failed: ' + (err && err.message ? err.message : err));
    }
    hideProgress();
    e.target.value = '';
    renderLibrary();
    updateHomeCounts();
    renderRecent();
  });

  function hasHtmlEntry(fileList) {
    for (var i = 0; i < fileList.length; i++) {
      if (/\.(html?|xhtml)$/i.test(fileList[i].name)) return true;
    }
    return false;
  }

  function showProgress(msg) {
    var el = $('import-progress');
    $('import-progress-msg').textContent = msg || 'Importing...';
    el.classList.add('on');
  }
  function hideProgress() { $('import-progress').classList.remove('on'); }

  /* File-type router. Routes on extension; on unknown types we try the
   * MIME type. Each handler returns a Project record ready to save. */
  async function importFile(file) {
    var name = file.name || 'untitled';
    var lower = name.toLowerCase();
    var baseName = name.replace(/\.[^.]+$/, '');

    // Kindle formats - DRM-locked or unsupported. Friendly error.
    if (/\.(azw3?|kfx|mobi|prc)$/.test(lower)) {
      throw new Error(
        'Kindle file format (' + name + '). Amazon-purchased books are ' +
        'DRM-locked and cannot be opened in Load or any other third-party app.\n\n' +
        'Fix: on a computer (Mac / Windows / Linux), use Calibre — a free desktop ' +
        'tool — to convert the Kindle file to EPUB. Save the EPUB to iCloud, ' +
        'then import the EPUB here.\n\n' +
        'Download Calibre: https://calibre-ebook.com (free, open source).'
      );
    }

    showProgress('Reading ' + name + '...');

    var app;
    if (/\.(html?|xhtml)$/.test(lower)) {
      app = await handleHtml(file, baseName);
    } else if (/\.zip$/.test(lower)) {
      app = await handleZip(file, baseName);
    } else if (/\.pdf$/.test(lower)) {
      app = await handlePdf(file, baseName);
    } else if (/\.epub$/.test(lower)) {
      app = await handleEpub(file, baseName);
    } else {
      // Fall back on MIME type if extension is unclear
      if (file.type === 'text/html') app = await handleHtml(file, baseName);
      else if (file.type === 'application/pdf') app = await handlePdf(file, baseName);
      else if (file.type === 'application/epub+zip') app = await handleEpub(file, baseName);
      else if (file.type === 'application/zip') app = await handleZip(file, baseName);
      else throw new Error('Unsupported file type. Load accepts HTML, ZIP, PDF, and EPUB.');
    }

    await putApp(app);
    apps.push(app);
  }

  /* ----- Multi-file bundle (folder-like) import ----- */
  // iPad Safari can't pick a whole folder, but it DOES support multi-file
  // selection. Users can tap-select every file in a folder from Files.app
  // and pass them in together. We look for the index.html among them and
  // inline every other selected file as an asset.
  async function importMultiFileBundle(files) {
    showProgress('Unpacking ' + files.length + ' files...');
    var fileMap = {};   // lookup by lowercased basename
    var htmlEntry = null;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var key = f.name;
      fileMap[key.toLowerCase()] = f;
      if (!htmlEntry && /^index\.html?$/i.test(f.name)) htmlEntry = f;
    }
    // No "index.html" exactly? Pick any HTML file.
    if (!htmlEntry) {
      for (var j = 0; j < files.length; j++) {
        if (/\.(html?|xhtml)$/i.test(files[j].name)) { htmlEntry = files[j]; break; }
      }
    }
    if (!htmlEntry) throw new Error('No HTML file found in the selection.');

    showProgress('Inlining ' + (files.length - 1) + ' asset file(s)...');
    var indexHtml = await readAsText(htmlEntry);

    async function loadAsset(relPath) {
      if (!relPath) return null;
      if (/^(data|blob|https?|mailto|tel):/.test(relPath)) return null;
      var cleaned = relPath.split('#')[0].split('?')[0];
      var base = cleaned.split('/').pop();
      var f = fileMap[base.toLowerCase()];
      if (!f) return null;
      var ext = base.split('.').pop().toLowerCase();
      if (/^(css|js|html?|xhtml|json|svg|txt|xml)$/.test(ext)) {
        return { type: 'text', content: await readAsText(f), path: base, ext: ext };
      }
      var mime = mimeFor(ext);
      var buf = await readAsArrayBuffer(f);
      var b64 = arrayBufferToBase64(buf);
      return { type: 'dataurl', content: 'data:' + mime + ';base64,' + b64, path: base, ext: ext };
    }

    indexHtml = await inlineHtmlAssets(indexHtml, '', loadAsset);

    var titleGuess = null;
    try {
      var m = /<title[^>]*>([^<]+)<\/title>/i.exec(indexHtml);
      if (m) titleGuess = m[1].trim();
    } catch (e) {}

    var app = {
      id: newId(),
      name: titleGuess || htmlEntry.name.replace(/\.[^.]+$/, ''),
      kind: 'zip',
      html: indexHtml,
      dateAdded: Date.now(),
      lastOpened: null,
      sizeBytes: indexHtml.length
    };
    await putApp(app);
    apps.push(app);
  }

  function arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var CHUNK = 0x8000;
    var binary = '';
    for (var i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
    }
    return btoa(binary);
  }

  /* ----- HTML: store as-is ----- */
  async function handleHtml(file, baseName) {
    var text = await readAsText(file);
    var titleGuess = null;
    try {
      var m = /<title[^>]*>([^<]+)<\/title>/i.exec(text);
      if (m) titleGuess = m[1].trim();
    } catch (e) {}
    return {
      id: newId(),
      name: titleGuess || baseName,
      kind: 'html',
      html: text,
      dateAdded: Date.now(),
      lastOpened: null,
      sizeBytes: text.length
    };
  }

  /* ----- ZIP: extract + inline everything into one HTML ----- */
  async function handleZip(file, baseName) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip not loaded.');
    showProgress('Unpacking ZIP archive...');
    var buf = await readAsArrayBuffer(file);
    var zip = await JSZip.loadAsync(buf);

    // Find the entry HTML. Prefer index.html / start_url from manifest.
    var files = Object.keys(zip.files).filter(function (k) { return !zip.files[k].dir; });
    var htmlCandidates = files.filter(function (k) { return /\.html?$/i.test(k); });
    if (!htmlCandidates.length) throw new Error('No HTML file found in the ZIP.');

    // Look for manifest.json to learn the canonical entry, if present.
    var manifestPath = files.find(function (k) { return /(^|\/)manifest\.json$/i.test(k); });
    var startPath = null;
    if (manifestPath) {
      try {
        var manifestText = await zip.file(manifestPath).async('string');
        var manifest = JSON.parse(manifestText);
        var base = manifestPath.replace(/[^/]+$/, '');
        if (manifest.start_url) {
          startPath = base + manifest.start_url.replace(/^\.?\/?/, '');
          if (!files.includes(startPath)) startPath = null;
        }
      } catch (e) {}
    }
    if (!startPath) {
      // Prefer the shortest-path index.html
      startPath = htmlCandidates
        .filter(function (k) { return /index\.html?$/i.test(k); })
        .sort(function (a, b) { return a.length - b.length; })[0]
        || htmlCandidates.sort(function (a, b) { return a.length - b.length; })[0];
    }

    showProgress('Inlining web app assets...');
    var baseDir = startPath.replace(/[^/]+$/, '');

    // Build a map of path -> {type, content} for all referenced assets.
    // Load every file as either text (for CSS/JS/HTML) or as data URL
    // (for images, fonts, binary).
    var assetCache = {};
    async function loadAsset(relPath) {
      var full = resolveInZip(baseDir, relPath);
      if (!full || !zip.file(full)) return null;
      if (assetCache[full]) return assetCache[full];
      var ext = full.split('.').pop().toLowerCase();
      var entry = zip.file(full);
      var item;
      if (/^(css|js|html|htm|json|svg|txt|xml)$/.test(ext)) {
        item = { type: 'text', content: await entry.async('string'), path: full, ext: ext };
      } else {
        var mime = mimeFor(ext);
        var b64 = await entry.async('base64');
        item = { type: 'dataurl', content: 'data:' + mime + ';base64,' + b64, path: full, ext: ext };
      }
      assetCache[full] = item;
      return item;
    }

    var indexHtml = await zip.file(startPath).async('string');
    indexHtml = await inlineHtmlAssets(indexHtml, baseDir, loadAsset);

    var titleGuess = null;
    try {
      var m2 = /<title[^>]*>([^<]+)<\/title>/i.exec(indexHtml);
      if (m2) titleGuess = m2[1].trim();
    } catch (e) {}

    return {
      id: newId(),
      name: titleGuess || baseName,
      kind: 'zip',
      html: indexHtml,
      dateAdded: Date.now(),
      lastOpened: null,
      sizeBytes: indexHtml.length
    };
  }

  function resolveInZip(baseDir, rel) {
    if (!rel) return null;
    if (/^(data|blob|https?|mailto|tel):/.test(rel)) return null; // external, skip
    // strip querystring / hash for lookup
    var cleaned = rel.split('#')[0].split('?')[0];
    var parts = (baseDir + cleaned).split('/');
    var stack = [];
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i] || parts[i] === '.') continue;
      if (parts[i] === '..') stack.pop();
      else stack.push(parts[i]);
    }
    return stack.join('/');
  }

  function mimeFor(ext) {
    var map = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon',
      woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
      mp3: 'audio/mpeg', mp4: 'video/mp4', webm: 'video/webm', ogg: 'audio/ogg',
      wasm: 'application/wasm', json: 'application/json'
    };
    return map[ext] || 'application/octet-stream';
  }

  async function inlineHtmlAssets(html, baseDir, loadAsset) {
    // 1. Inline <link rel="stylesheet" href="...">
    var linkRe = /<link\b[^>]*\brel=["']?stylesheet["']?[^>]*>/gi;
    var links = []; var m;
    while ((m = linkRe.exec(html)) !== null) links.push({ tag: m[0], index: m.index });
    for (var i = 0; i < links.length; i++) {
      var hrefMatch = /\bhref=["']([^"']+)["']/i.exec(links[i].tag);
      if (!hrefMatch) continue;
      var asset = await loadAsset(hrefMatch[1]);
      if (!asset || asset.type !== 'text') continue;
      var inlinedCss = await inlineCssUrls(asset.content, asset.path.replace(/[^/]+$/, ''), loadAsset);
      html = html.replace(links[i].tag, '<style>\n' + inlinedCss + '\n</style>');
    }

    // 2. Inline <script src="...">
    var scriptRe = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
    var scripts = [];
    while ((m = scriptRe.exec(html)) !== null) scripts.push({ tag: m[0], src: m[1] });
    for (var s = 0; s < scripts.length; s++) {
      var aa = await loadAsset(scripts[s].src);
      if (!aa || aa.type !== 'text') continue;
      html = html.replace(scripts[s].tag, '<script>\n' + aa.content.replace(/<\/script/gi, '<\\/script') + '\n</script>');
    }

    // 3. Inline <img src="...">, <source src="...">, <video src>, <audio src>
    var mediaRe = /<(img|source|video|audio)\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
    var toReplace = [];
    while ((m = mediaRe.exec(html)) !== null) toReplace.push({ tag: m[0], src: m[2] });
    for (var r = 0; r < toReplace.length; r++) {
      var ad = await loadAsset(toReplace[r].src);
      if (!ad) continue;
      var newTag = toReplace[r].tag.replace(toReplace[r].src, ad.type === 'dataurl' ? ad.content : toReplace[r].src);
      html = html.replace(toReplace[r].tag, newTag);
    }

    return html;
  }

  async function inlineCssUrls(css, baseDir, loadAsset) {
    // Replace url(...) references in CSS with data URLs where possible.
    var urlRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
    var replacements = [];
    var m;
    while ((m = urlRe.exec(css)) !== null) replacements.push({ full: m[0], url: m[2] });
    for (var i = 0; i < replacements.length; i++) {
      var cleanUrl = replacements[i].url.split('#')[0].split('?')[0];
      var asset = await loadAsset(cleanUrl);
      if (asset && asset.type === 'dataurl') {
        css = css.split(replacements[i].full).join('url(' + asset.content + ')');
      }
    }
    return css;
  }

  /* ----- PDF: pdf.js text extraction -> HTML with pages ----- */
  async function handlePdf(file, baseName) {
    if (typeof pdfjsLib === 'undefined') throw new Error('pdf.js not loaded.');
    showProgress('Parsing PDF...');
    var buf = await readAsArrayBuffer(file);
    var loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) });
    var pdf = await loadingTask.promise;
    var pageCount = pdf.numPages;
    var metaName = baseName;
    try {
      var meta = await pdf.getMetadata();
      if (meta && meta.info && meta.info.Title) metaName = meta.info.Title.trim();
    } catch (e) {}

    var pagesHtml = [];
    for (var p = 1; p <= pageCount; p++) {
      showProgress('Parsing PDF... page ' + p + ' of ' + pageCount);
      var page = await pdf.getPage(p);
      var textContent = await page.getTextContent();
      var pageText = '';
      var lastY = null;
      for (var i = 0; i < textContent.items.length; i++) {
        var it = textContent.items[i];
        var y = it.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 2) pageText += '\n';
        pageText += it.str + ' ';
        lastY = y;
      }
      pagesHtml.push(
        '<section class="pdf-page" data-page="' + p + '">' +
        '<h2 class="pdf-page-num">Page ' + p + '</h2>' +
        pageText.split(/\n+/).map(function (line) {
          line = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
          if (!line) return '';
          return '<p>' + line + '</p>';
        }).join('') +
        '</section>'
      );
    }

    var html =
      '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + escHtml(metaName) + '</title>' +
      '<style>' +
      'body{font-family:-apple-system,"Segoe UI",sans-serif;line-height:1.7;color:#222;background:#fff;padding:30px 20px;max-width:820px;margin:0 auto;}' +
      'h1{font-size:22px;color:#333;margin:0 0 20px;}' +
      '.pdf-page{border-bottom:1px solid #ddd;padding:20px 0;}' +
      '.pdf-page:last-child{border-bottom:none;}' +
      '.pdf-page-num{font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;}' +
      '.pdf-page p{margin:0 0 10px;}' +
      '</style></head><body>' +
      '<h1>' + escHtml(metaName) + '</h1>' +
      pagesHtml.join('') +
      '</body></html>';

    return {
      id: newId(),
      name: metaName,
      kind: 'pdf',
      html: html,
      dateAdded: Date.now(),
      lastOpened: null,
      sizeBytes: html.length,
      pageCount: pageCount
    };
  }

  /* ----- EPUB: epub.js chapter extraction -> HTML ----- */
  async function handleEpub(file, baseName) {
    if (typeof ePub === 'undefined') throw new Error('epub.js not loaded.');
    showProgress('Parsing EPUB...');
    var buf = await readAsArrayBuffer(file);
    var book = ePub(buf);
    await book.ready;

    // Try to get title from package metadata
    var metaName = baseName;
    try {
      var md = await book.loaded.metadata;
      if (md && md.title) metaName = md.title.trim();
    } catch (e) {}

    // Load every chapter's HTML, concatenate
    var spineItems = book.spine && book.spine.items ? book.spine.items : [];
    var chapters = [];
    for (var i = 0; i < spineItems.length; i++) {
      showProgress('Parsing EPUB... chapter ' + (i + 1) + ' of ' + spineItems.length);
      var item = spineItems[i];
      try {
        var section = book.spine.get(item.index);
        await section.load(book.load.bind(book));
        var dom = section.document;
        var bodyHtml = dom && dom.body ? dom.body.innerHTML : '';
        // Clean up epub-specific attributes that don't make sense standalone
        bodyHtml = bodyHtml.replace(/\s(xmlns|epub|id|class)=["'][^"']*["']/g, function (m, attr) {
          // Keep id and class, strip xmlns and epub namespaces
          return (attr === 'id' || attr === 'class') ? m : '';
        });
        chapters.push('<section class="epub-chapter">' + bodyHtml + '</section>');
      } catch (e) {
        chapters.push('<section class="epub-chapter"><p><em>Chapter could not be loaded.</em></p></section>');
      }
    }

    var html =
      '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + escHtml(metaName) + '</title>' +
      '<style>' +
      'body{font-family:-apple-system,"Segoe UI",sans-serif;line-height:1.7;color:#222;background:#fff;padding:30px 20px;max-width:820px;margin:0 auto;}' +
      'h1.book-title{font-size:22px;color:#333;margin:0 0 20px;}' +
      '.epub-chapter{padding:30px 0;border-bottom:1px solid #eee;}' +
      '.epub-chapter:last-child{border-bottom:none;}' +
      '.epub-chapter img{max-width:100%;height:auto;}' +
      '</style></head><body>' +
      '<h1 class="book-title">' + escHtml(metaName) + '</h1>' +
      chapters.join('') +
      '</body></html>';

    return {
      id: newId(),
      name: metaName,
      kind: 'epub',
      html: html,
      dateAdded: Date.now(),
      lastOpened: null,
      sizeBytes: html.length,
      chapterCount: chapters.length
    };
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function newId() {
    return 'app-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function readAsText(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result || ''); };
      r.onerror = function () { reject(r.error); };
      r.readAsText(file);
    });
  }
  function readAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsArrayBuffer(file);
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
      updateHomeCounts();
      renderRecent();
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
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    ttsState = 'idle';
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
    $('tts-drawer').classList.remove('on');
    $('notes-drawer').classList.remove('on');
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

  /* ---------- Boot ---------- */
  boot();
}());
