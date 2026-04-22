// Load — Run Web Apps on iPad (PWA)
// Copyright (c) 2026 DssOrit. All Rights Reserved.
//
// Unauthorized reproduction, modification, distribution, or
// commercial use is strictly prohibited. See LICENSE at the
// repository root for the full terms.
//
// Load is an offline, dyslexia-friendly launcher for imported HTML
// apps, PDFs, and EPUB books. All features run locally on the
// device — no network calls, no analytics, no accounts.
//
// Main subsystems in this file:
//   - IndexedDB storage (apps, notes, settings)
//   - File import routing (HTML / ZIP / PDF / EPUB)
//   - WKWebView-equivalent iframe viewer
//   - Reading aids (font, spacing, overlays, bionic, focus line)
//   - Bookmarks, per-app notes, reading position, timer, theme
//   - TTS via Web Speech API, with enhanced-voice sorting
//   - Help screen + standalone notes screen

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
  /* ---------- Toast notification ---------- */
  var toastTimer = null;
  function toast(msg, isError) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('error', !!isError);
    el.classList.add('on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 3000);
  }

  function show(screenId) {
    var screens = ['home-screen', 'library-screen', 'viewer-screen', 'editor-screen', 'notes-screen', 'note-editor', 'import-screen', 'create-screen'];
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
             fontSizeStep: 0, lineStep: 0, letterStep: 0,
             ttsVoiceIndex: '', ttsSpeed: '1' };
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

  /* ---------- Create — simple page builder for non-coders ----------
   * The user picks a template, types a title + body, Load wraps it in
   * a clean, offline-ready HTML document and saves it to the Library.
   * No HTML knowledge needed. Templates control the look; content is
   * plain text that becomes paragraphs, list items, or sections. */
  var currentTemplate = 'article';
  function wireCreateScreen() {
    var home = $('home-create');
    if (home) home.addEventListener('click', function () {
      show('create-screen');
      $('create-title').value = '';
      $('create-body').value = '';
      currentTemplate = 'article';
      document.querySelectorAll('[data-template]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-template') === 'article');
      });
    });
    document.querySelectorAll('[data-template]').forEach(function (b) {
      b.addEventListener('click', function () {
        currentTemplate = b.getAttribute('data-template');
        document.querySelectorAll('[data-template]').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
      });
    });
    $('create-preview-btn').addEventListener('click', function () {
      var html = buildFromTemplate();
      if (!html) { toast('Add a title or some content first.', true); return; }
      var blob = new Blob([html], { type: 'text/html' });
      var url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
    $('create-save-btn').addEventListener('click', async function () {
      var app = await saveCreated();
      if (app) {
        toast('✓ Saved to your Library');
        show('library-screen'); renderLibrary();
      }
    });
    $('create-share-btn').addEventListener('click', async function () {
      var app = await saveCreated();
      if (app) await shareAsStandaloneHtml(app);
    });
  }

  async function saveCreated() {
    var title = $('create-title').value.trim();
    var body = $('create-body').value;
    if (!title && !body.trim()) { toast('Add a title or some content first.', true); return null; }
    if (!title) title = 'Untitled';
    var html = buildFromTemplate();
    var app = {
      id: newId(),
      name: title,
      kind: 'html',
      html: html,
      dateAdded: Date.now(),
      lastOpened: null,
      sizeBytes: html.length,
      createdHere: true      // marker so we know this was built inside Load
    };
    try {
      await putApp(app);
      apps.push(app);
      renderLibrary();
      updateHomeCounts();
      renderLibraryChips();
      return app;
    } catch (e) {
      toast('Save failed: ' + (e && e.message || e), true);
      return null;
    }
  }

  function buildFromTemplate() {
    var title = $('create-title').value.trim() || 'Untitled';
    var body = $('create-body').value;
    var tpl = currentTemplate || 'article';
    var styleBase = 'body{font-family:-apple-system,BlinkMacSystemFont,"Atkinson Hyperlegible",Arial,sans-serif;line-height:1.75;color:#1a1a2e;background:#f7f7fa;max-width:720px;margin:0 auto;padding:30px 20px;}h1{color:#2a1a3e;font-size:28px;margin:0 0 10px;}.sub{color:#666;font-size:13px;margin:0 0 26px;text-transform:uppercase;letter-spacing:1px;}p{margin:0 0 14px;font-size:17px;}ul,ol{font-size:17px;padding-left:22px;}li{margin:6px 0;}a{color:#4a4aaa;}a:hover{color:#2a2a8a;}';
    var esc = escHtml;
    function linkify(text) {
      return esc(text).replace(/(https?:\/\/[^\s<)"']+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    }
    function paragraphs(text) {
      // Split on blank lines; inside paragraphs keep single line breaks
      var paras = String(text || '').split(/\n\s*\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
      return paras.map(function (p) {
        return '<p>' + linkify(p).replace(/\n/g, '<br>') + '</p>';
      }).join('\n');
    }
    function lines(text) {
      return String(text || '').split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    }
    var content = '';
    var extraStyle = '';
    if (tpl === 'article') {
      content = '<h1>' + esc(title) + '</h1><p class="sub">Article &middot; created in Load</p>' + paragraphs(body);
    } else if (tpl === 'note') {
      content = '<h1>' + esc(title) + '</h1>' + paragraphs(body);
    } else if (tpl === 'letter') {
      extraStyle = 'body{max-width:640px;}h1{font-size:22px;text-align:center;}.sub{text-align:center;}';
      content = '<h1>' + esc(title) + '</h1><p class="sub">A letter</p>' + paragraphs(body);
    } else if (tpl === 'recipe') {
      extraStyle = 'ol{background:#fff5e6;border-left:4px solid #d9551a;padding:14px 14px 14px 44px;border-radius:8px;}li{padding:3px 0;}';
      content = '<h1>' + esc(title) + '</h1><p class="sub">Recipe / Steps</p><ol>' +
        lines(body).map(function (l) { return '<li>' + linkify(l) + '</li>'; }).join('') + '</ol>';
    } else if (tpl === 'checklist') {
      extraStyle = '.check{list-style:none;padding-left:0;}.check li{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #eee;}.check input{transform:scale(1.4);}';
      content = '<h1>' + esc(title) + '</h1><p class="sub">Checklist</p><ul class="check">' +
        lines(body).map(function (l) { return '<li><input type="checkbox">' + linkify(l) + '</li>'; }).join('') + '</ul>';
    }
    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
      '<title>' + esc(title) + '</title>' +
      '<style>' + styleBase + extraStyle + '</style></head>' +
      '<body>' + content + '</body></html>';
  }

  /* ---------- Ask AI — no-download, user-friendly workaround ----------
   * Opens a free AI site in a new tab with the current content copied to
   * the clipboard and a preset question about what to do with it. */
  function wireAiHelper() {
    var shareBtnViewer = $('share-btn-viewer');
    if (shareBtnViewer) shareBtnViewer.addEventListener('click', function () {
      if (currentApp) shareAsStandaloneHtml(currentApp);
    });
    var aiBtn = $('ai-btn-viewer');
    if (aiBtn) aiBtn.addEventListener('click', openAiHelper);
    var aiClose = $('ai-modal-close');
    if (aiClose) aiClose.addEventListener('click', function () { $('ai-modal').classList.remove('on'); });
    var currentPreset = 'summarize';
    document.querySelectorAll('[data-ai-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        currentPreset = b.getAttribute('data-ai-preset');
        document.querySelectorAll('[data-ai-preset]').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        $('ai-modal-status').textContent = 'Ready. Pick an AI site below.';
      });
    });
    document.querySelectorAll('[data-ai-site]').forEach(function (b) {
      b.addEventListener('click', function () {
        var text = extractFrameText();
        if (!text) { $('ai-modal-status').textContent = 'No text available on this page to copy.'; return; }
        var question = aiPrompt(currentPreset);
        var fullPayload = question + '\n\n---\n\n' + text.slice(0, 6000);
        copyToClipboard(fullPayload);
        var url = aiSiteUrl(b.getAttribute('data-ai-site'));
        window.open(url, '_blank');
        $('ai-modal-status').textContent = 'Text copied. Paste (tap + hold → Paste) in the AI chat.';
      });
    });
  }
  function openAiHelper() {
    $('ai-modal').classList.add('on');
    $('ai-modal-status').textContent = 'Pick what you want AI to help with, then choose a site.';
    // default preset
    document.querySelectorAll('[data-ai-preset]').forEach(function (x) { x.classList.remove('active'); });
    var first = document.querySelector('[data-ai-preset="summarize"]');
    if (first) first.classList.add('active');
  }
  function aiPrompt(kind) {
    switch (kind) {
      case 'summarize': return 'Please summarize the following in plain language, 3-5 bullet points.';
      case 'explain': return 'Please explain the following simply, like I have dyslexia and want it in short clear sentences.';
      case 'translate': return 'Please translate the following to plain English (or ask me which language if unclear).';
      case 'keypoints': return 'Please list the key points from the following, each as a short bullet.';
      case 'define': return 'Please define any hard or technical words in the following passage.';
    }
    return 'Please help me with the following:';
  }
  function aiSiteUrl(key) {
    switch (key) {
      case 'chatgpt': return 'https://chat.openai.com/';
      case 'claude': return 'https://claude.ai/';
      case 'gemini': return 'https://gemini.google.com/app';
      case 'perplexity': return 'https://www.perplexity.ai/';
    }
    return 'https://chat.openai.com/';
  }
  function extractFrameText() {
    try {
      var doc = $('viewer-frame') && $('viewer-frame').contentDocument;
      if (doc && doc.body) return String(doc.body.innerText || doc.body.textContent || '').trim();
    } catch (e) {}
    return '';
  }
  function copyToClipboard(text) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text); }
    catch (e) {
      // Fallback: write into a hidden textarea and execCommand('copy')
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e2) {}
      document.body.removeChild(ta);
    }
  }

  /* ---------- Boot sequence ----------
   * Each wire* step is wrapped in its own try so one missing element
   * (e.g. after a DOM change in a future refactor) can't stop the app
   * from booting. Errors are logged to console but never surface to
   * the user as a broken home screen. */
  function safe(label, fn) { try { fn(); } catch (e) { try { console.warn('Load boot:', label, e); } catch (_) {} } }
  async function boot() {
    try {
      safe('applySettings', applySettings);
      try { db = await openDB(); apps = await listAll(); }
      catch (e) { console.warn('IndexedDB open failed', e); apps = []; }
      safe('updateHomeCounts', updateHomeCounts);
      safe('wireNavButtons', wireNavButtons);
      safe('wireHomeActions', wireHomeActions);
      safe('wireSettingsPanel', wireSettingsPanel);
      safe('wireLibrarySearch', wireLibrarySearch);
      safe('wireNotes', wireNotes);
      safe('wireTts', wireTts);
      safe('wireBookmarks', wireBookmarks);
      safe('wirePerAppTheme', wirePerAppTheme);
      safe('wireNotesScreen', wireNotesScreen);
      safe('wireHelp', wireHelp);
      safe('wireFolders', wireFolders);
      safe('wireBackup', wireBackup);
      safe('wireCreateScreen', wireCreateScreen);
      safe('wireAiHelper', wireAiHelper);
      safe('renderFolderList', renderFolderList);
      safe('renderLibraryChips', renderLibraryChips);
      safe('updateResumeCard', updateResumeCard);
      safe('renderRecent', renderRecent);

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
    row.innerHTML = recent.map(function (a) {
      return '<button class="mini-tile" data-open="' + esc(a.id) + '">' +
        '<div class="mini-tile-name">' + esc(a.name) + '</div>' +
        '<div class="mini-tile-meta">' + esc(relTime(a.lastOpened || 0)) + '</div>' +
      '</button>';
    }).join('');
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
        else if (target === 'import') { show('import-screen'); }
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
        else if (tool === 'notes') openNotesScreen();
        else if (tool === 'audio') openAudioSettings();
        else if (tool === 'help') openHelp();
      });
    });
  }
  function openAudioSettings() {
    openSettingsPanel();
    // Scroll the TTS section into view so the user doesn't hunt for it
    setTimeout(function () {
      var panel = $('settings-panel');
      var heading = panel && panel.querySelector('h4');
      var sections = panel ? panel.querySelectorAll('.panel-section') : [];
      // Find the "Read Aloud (TTS)" section by its heading text
      for (var i = 0; i < sections.length; i++) {
        var h = sections[i].querySelector('h4');
        if (h && /read aloud|tts/i.test(h.textContent)) {
          sections[i].scrollIntoView({ block: 'start', behavior: 'smooth' });
          break;
        }
      }
    }, 120);
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
  /* ---------- Notes screen (browse + create) ---------- */
  // Standalone notes are stored in localStorage under LS_NOTES as an array
  // of {id, title, content, ts}. Per-app notes continue to live on each
  // Project record. The Notes screen shows both in one list.
  var LS_NOTES = 'load_standalone_notes_v1';
  function loadStandaloneNotes() {
    try { var raw = localStorage.getItem(LS_NOTES); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
  }
  function saveStandaloneNotes(arr) {
    try { localStorage.setItem(LS_NOTES, JSON.stringify(arr)); } catch (e) {}
  }

  function openNotesScreen() {
    renderNotesScreen();
    show('notes-screen');
  }
  function renderNotesScreen() {
    var standalone = loadStandaloneNotes().map(function (n) {
      return { kind: 'standalone', id: n.id, title: n.title, content: n.content, ts: n.ts };
    });
    var linked = apps.filter(function (a) { return a.notes && a.notes.trim(); })
      .map(function (a) {
        return { kind: 'linked', appId: a.id, id: 'app:' + a.id, title: a.name, content: a.notes, ts: a.lastOpened || a.dateAdded };
      });
    var all = standalone.concat(linked).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });

    var grid = $('notes-screen-list');
    var empty = $('notes-empty');
    if (!all.length) {
      grid.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';
    grid.innerHTML = all.map(function (n) {
      var preview = String(n.content || '').slice(0, 140).replace(/\n/g, ' ');
      var when = n.ts ? relTime(n.ts) : '';
      var badge = n.kind === 'linked'
        ? '<span class="nc-badge linked">Linked</span>'
        : '<span class="nc-badge">Note</span>';
      return '<button class="note-card" data-note-id="' + esc(n.id) + '">' +
        badge +
        '<div class="nc-title">' + esc(n.title || 'Untitled') + '</div>' +
        '<div class="nc-preview">' + esc(preview) + '</div>' +
        '<div class="nc-meta">' + esc(when) + '</div>' +
      '</button>';
    }).join('');
    grid.querySelectorAll('[data-note-id]').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-note-id');
        openNoteEditor(id);
      });
    });
  }

  var noteEditorTarget = null;    // {kind, id, appId?}
  function openNoteEditor(noteId) {
    var title = '', content = '', ctxLabel = '';
    if (noteId && noteId.indexOf('app:') === 0) {
      var appId = noteId.slice(4);
      var app = apps.find(function (x) { return x.id === appId; });
      if (!app) return;
      noteEditorTarget = { kind: 'linked', id: noteId, appId: appId };
      title = app.name; content = app.notes || '';
      ctxLabel = 'Note attached to "' + app.name + '"';
    } else if (noteId) {
      var arr = loadStandaloneNotes();
      var n = arr.find(function (x) { return x.id === noteId; });
      if (!n) return;
      noteEditorTarget = { kind: 'standalone', id: noteId };
      title = n.title; content = n.content; ctxLabel = 'Standalone note';
    } else {
      // New standalone note
      var newId = 'note-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      noteEditorTarget = { kind: 'standalone', id: newId, isNew: true };
      title = ''; content = ''; ctxLabel = 'New note';
    }
    $('note-editor-title').value = title;
    $('note-editor-body-text').value = content;
    $('note-editor-context').textContent = ctxLabel;
    show('note-editor');
    setTimeout(function () {
      if (noteEditorTarget.isNew) $('note-editor-title').focus();
    }, 30);
  }

  function saveCurrentNote() {
    if (!noteEditorTarget) return;
    var title = $('note-editor-title').value.trim() || 'Untitled';
    var content = $('note-editor-body-text').value;
    if (noteEditorTarget.kind === 'linked') {
      var app = apps.find(function (x) { return x.id === noteEditorTarget.appId; });
      if (!app) return;
      app.notes = content;
      putApp(app);
    } else {
      var arr = loadStandaloneNotes();
      var idx = arr.findIndex(function (x) { return x.id === noteEditorTarget.id; });
      var rec = { id: noteEditorTarget.id, title: title, content: content, ts: Date.now() };
      if (idx >= 0) arr[idx] = rec;
      else arr.push(rec);
      saveStandaloneNotes(arr);
    }
  }

  function deleteCurrentNote() {
    if (!noteEditorTarget) return;
    if (!confirm('Delete this note?')) return;
    if (noteEditorTarget.kind === 'linked') {
      var app = apps.find(function (x) { return x.id === noteEditorTarget.appId; });
      if (app) { app.notes = ''; putApp(app); }
    } else {
      var arr = loadStandaloneNotes().filter(function (x) { return x.id !== noteEditorTarget.id; });
      saveStandaloneNotes(arr);
    }
    noteEditorTarget = null;
    show('notes-screen');
    renderNotesScreen();
  }

  function wireNotesScreen() {
    $('notes-new-btn').addEventListener('click', function () { openNoteEditor(null); });
    $('note-editor-back').addEventListener('click', function () {
      saveCurrentNote();
      noteEditorTarget = null;
      show('notes-screen'); renderNotesScreen();
    });
    $('note-editor-save').addEventListener('click', function () {
      saveCurrentNote();
      noteEditorTarget = null;
      show('notes-screen'); renderNotesScreen();
    });
    $('note-editor-delete').addEventListener('click', deleteCurrentNote);
  }

  /* ---------- Help modal ---------- */
  function wireHelp() {
    $('help-close').addEventListener('click', function () {
      $('help-modal').classList.remove('on');
    });
  }
  function openHelp() {
    $('help-modal').classList.add('on');
  }

  /* ---------- Folders / Collections (option 5) ---------- */
  var LS_FOLDERS = 'load_folders_v1';
  var currentFolderFilter = '';  // '' = all folders
  var FOLDER_COLORS = ['#7c7cff', '#4aa04a', '#e0a040', '#cc3f55', '#8b1f99', '#0891b2'];
  function loadFolders() {
    try { var raw = localStorage.getItem(LS_FOLDERS); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
  }
  function saveFolders(arr) {
    try { localStorage.setItem(LS_FOLDERS, JSON.stringify(arr)); } catch (e) {}
  }
  function countInFolder(folderId) {
    var n = 0;
    for (var i = 0; i < apps.length; i++) if (apps[i].folderId === folderId) n++;
    return n;
  }
  function renderFolderList() {
    var list = $('folder-list');
    if (!list) return;
    var folders = loadFolders();
    if (!folders.length) {
      list.innerHTML = '<p class="panel-hint" style="margin:0;">No folders yet. Name one below and tap Add.</p>';
      return;
    }
    list.innerHTML = folders.map(function (f) {
      return '<div class="folder-row" data-folder="' + esc(f.id) + '">' +
        '<span class="f-color" style="background:' + esc(f.color || '#7c7cff') + ';"></span>' +
        '<span class="f-name">' + esc(f.name) + '</span>' +
        '<span class="f-count">' + countInFolder(f.id) + '</span>' +
        '<button data-folder-act="rename" aria-label="Rename folder">&#9998;</button>' +
        '<button data-folder-act="delete" class="danger" aria-label="Delete folder">&#128465;</button>' +
      '</div>';
    }).join('');
    list.querySelectorAll('[data-folder]').forEach(function (row) {
      var id = row.getAttribute('data-folder');
      row.querySelector('[data-folder-act="rename"]').addEventListener('click', function () {
        var arr = loadFolders();
        var folder = arr.find(function (x) { return x.id === id; });
        if (!folder) return;
        var name = prompt('New folder name:', folder.name);
        if (name == null) return;
        folder.name = name.trim() || folder.name;
        saveFolders(arr);
        renderFolderList();
        renderLibraryChips();
      });
      row.querySelector('[data-folder-act="delete"]').addEventListener('click', function () {
        if (!confirm('Delete this folder? Items inside will not be deleted, just unassigned.')) return;
        var arr = loadFolders().filter(function (x) { return x.id !== id; });
        saveFolders(arr);
        // Unassign from apps that were in this folder
        apps.forEach(function (a) { if (a.folderId === id) { a.folderId = null; putApp(a); } });
        renderFolderList();
        renderLibraryChips();
        renderLibrary();
      });
    });
  }
  function wireFolders() {
    $('folder-new-btn').addEventListener('click', function () {
      var name = ($('folder-new-input').value || '').trim();
      if (!name) { $('folder-new-input').focus(); return; }
      var arr = loadFolders();
      arr.push({
        id: 'f-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        name: name,
        color: FOLDER_COLORS[arr.length % FOLDER_COLORS.length],
        dateCreated: Date.now()
      });
      saveFolders(arr);
      $('folder-new-input').value = '';
      renderFolderList();
      renderLibraryChips();
    });
    $('folder-new-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('folder-new-btn').click();
    });
  }

  function renderLibraryChips() {
    var wrap = $('library-chips');
    if (!wrap) return;
    var counts = { all: apps.length, html: 0, zip: 0, pdf: 0, epub: 0, media: 0 };
    for (var i = 0; i < apps.length; i++) {
      var k = apps[i].kind || 'html';
      if (counts[k] != null) counts[k]++;
    }
    var folders = loadFolders();
    var html = '';
    // File-type chips
    html += renderChip('all', 'All', counts.all, currentTypeFilter === 'all' && !currentFolderFilter);
    html += renderChip('html', 'HTML', counts.html, currentTypeFilter === 'html');
    html += renderChip('zip', 'PWA / Web apps', counts.zip, currentTypeFilter === 'zip');
    html += renderChip('pdf', 'PDFs', counts.pdf, currentTypeFilter === 'pdf');
    html += renderChip('epub', 'Books', counts.epub, currentTypeFilter === 'epub');
    html += renderChip('media', 'Media', counts.media, currentTypeFilter === 'media');
    // Folder chips
    folders.forEach(function (f) {
      var count = countInFolder(f.id);
      if (count === 0) return;
      var active = (currentFolderFilter === f.id);
      html += '<button class="chip' + (active ? ' active' : '') + '" data-folder-chip="' + esc(f.id) + '" style="border-color:' + esc(f.color) + ';">' +
        '<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + esc(f.color) + ';"></span>' +
        esc(f.name) + ' <span class="chip-count">' + count + '</span>' +
      '</button>';
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll('[data-chip]').forEach(function (c) {
      c.addEventListener('click', function () {
        currentTypeFilter = c.getAttribute('data-chip');
        currentFolderFilter = '';
        renderLibraryChips();
        renderLibrary();
      });
    });
    wrap.querySelectorAll('[data-folder-chip]').forEach(function (c) {
      c.addEventListener('click', function () {
        var id = c.getAttribute('data-folder-chip');
        currentFolderFilter = (currentFolderFilter === id) ? '' : id;
        currentTypeFilter = 'all';
        renderLibraryChips();
        renderLibrary();
      });
    });
  }
  function renderChip(val, label, count, active) {
    return '<button class="chip' + (active ? ' active' : '') + '" data-chip="' + esc(val) + '">' +
      esc(label) + ' <span class="chip-count">' + count + '</span>' +
    '</button>';
  }

  /* ---------- Export / Import library (option 2) ---------- */
  function buildBackup() {
    return {
      load_backup_version: 1,
      generated: new Date().toISOString(),
      apps: apps,
      notes: loadStandaloneNotes(),
      folders: loadFolders(),
      settings: settings
    };
  }
  function downloadBackup() {
    var payload = JSON.stringify(buildBackup(), null, 2);
    var blob = new Blob([payload], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var stamp = new Date().toISOString().slice(0, 10);
    var name = 'load-library-backup-' + stamp + '.json';
    // Prefer Web Share API (iPad Safari 16+) so the user gets the native
    // share/save sheet and can pick "Save to Files".
    try {
      var file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ title: 'Load library backup', files: [file] })
          .catch(function () { triggerAnchorDownload(url, name); });
        return;
      }
    } catch (e) {}
    triggerAnchorDownload(url, name);
  }
  function triggerAnchorDownload(url, name) {
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  }
  async function restoreBackup(file) {
    var text = '';
    try { text = await readAsText(file); }
    catch (e) { alert('Could not read file: ' + (e && e.message || e)); return; }
    var payload;
    try { payload = JSON.parse(text); }
    catch (e) { alert('File is not valid JSON.'); return; }
    if (!payload || typeof payload !== 'object' || payload.load_backup_version == null) {
      alert('File does not look like a Load backup.');
      return;
    }
    var choice = prompt(
      'Backup has ' + (payload.apps || []).length + ' apps and ' + (payload.notes || []).length + ' notes.\n\n' +
      'Type REPLACE to wipe your current library and restore the backup.\n' +
      'Type MERGE to add backup items alongside your current ones.\n' +
      'Anything else cancels.',
      'MERGE'
    );
    if (choice !== 'REPLACE' && choice !== 'MERGE') return;

    if (choice === 'REPLACE') {
      // Wipe apps store
      for (var i = 0; i < apps.length; i++) {
        try { await deleteApp(apps[i].id); } catch (e) {}
      }
      apps = [];
      try { localStorage.removeItem(LS_NOTES); } catch (e) {}
      try { localStorage.removeItem(LS_FOLDERS); } catch (e) {}
    }
    // Write backup apps into IndexedDB
    var incoming = payload.apps || [];
    for (var j = 0; j < incoming.length; j++) {
      var app = incoming[j];
      if (choice === 'MERGE') {
        // Assign a fresh id on collision so nothing gets overwritten
        if (apps.find(function (x) { return x.id === app.id; })) {
          app = Object.assign({}, app, { id: newId() });
        }
      }
      try { await putApp(app); apps.push(app); } catch (e) {}
    }
    // Notes
    var notesBackup = payload.notes || [];
    if (choice === 'REPLACE') {
      saveStandaloneNotes(notesBackup);
    } else {
      var merged = loadStandaloneNotes().concat(notesBackup);
      saveStandaloneNotes(merged);
    }
    // Folders
    var foldersBackup = payload.folders || [];
    if (choice === 'REPLACE') {
      saveFolders(foldersBackup);
    } else {
      var cur = loadFolders();
      foldersBackup.forEach(function (f) {
        if (!cur.find(function (x) { return x.id === f.id; })) cur.push(f);
      });
      saveFolders(cur);
    }
    // Settings — only on REPLACE so MERGE doesn't blow away the user's prefs
    if (choice === 'REPLACE' && payload.settings) {
      Object.assign(settings, payload.settings);
      saveSettings();
      applySettings();
    }
    renderLibrary();
    updateHomeCounts();
    renderRecent();
    updateResumeCard();
    renderFolderList();
    renderLibraryChips();
    alert('Restore complete.');
  }
  /* ---------- Share / Export one app as a standalone HTML file ----------
   * For HTML / ZIP / PDF / EPUB apps the stored app.html is already a
   * fully self-contained document, so we write it straight out.
   * For media apps we inline the binary as a base64 data URL so the
   * resulting HTML is one file someone else can open with no extras.
   * The Web Share API (iPad Safari 16+) opens the native share sheet so
   * the user can AirDrop, email, save to Files, or message the file. */
  async function shareAsStandaloneHtml(app) {
    var html = '';
    if (app.kind === 'media' && app.binary) {
      toast('Preparing media file...');
      var buf = await app.binary.arrayBuffer();
      var b64 = arrayBufferToBase64(buf);
      var dataUrl = 'data:' + (app.mime || 'application/octet-stream') + ';base64,' + b64;
      html = buildStandaloneMediaPage(app, dataUrl);
    } else if (app.html) {
      html = app.html;
    } else {
      toast('Nothing to share for this item.', true); return;
    }
    var safeName = String(app.name || 'load-item').replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || 'load-item';
    var fileName = safeName + '.html';
    var blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    var file;
    try { file = new File([blob], fileName, { type: 'text/html' }); } catch (e) {}
    // Prefer the Web Share API — on iPad it opens the native share sheet
    // so the user can AirDrop, message, email, or Save to Files in one tap.
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: app.name, files: [file] });
        toast('Shared.');
        return;
      } catch (e) { /* user canceled or API refused; fall back */ }
    }
    var url = URL.createObjectURL(blob);
    triggerAnchorDownload(url, fileName);
    toast('Exported as ' + fileName);
  }
  function buildStandaloneMediaPage(app, dataUrl) {
    var safeName = escHtml(app.name || 'Media');
    var body = '';
    if (app.subKind === 'video') body = '<video src="' + dataUrl + '" controls playsinline></video>';
    else if (app.subKind === 'audio') body = '<audio src="' + dataUrl + '" controls></audio>';
    else body = '<img src="' + dataUrl + '" alt="' + safeName + '">';
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + safeName + '</title><style>html,body{margin:0;padding:0;background:#000;color:#fff;min-height:100vh;font-family:-apple-system,sans-serif;}' +
      '.holder{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;}' +
      '.title{font-size:14px;color:#bbb;letter-spacing:1px;text-transform:uppercase;}' +
      'video,audio,img{max-width:100%;max-height:85vh;border-radius:10px;}audio{width:100%;max-width:480px;}</style></head>' +
      '<body><div class="holder"><div class="title">' + safeName + '</div>' + body + '</div></body></html>';
  }

  function promptMoveToFolder(app) {
    var folders = loadFolders();
    if (!folders.length) {
      alert('Create a folder first in Settings → Folders.');
      return;
    }
    var lines = ['Move "' + app.name + '" to which folder?', ''];
    lines.push('0 — (no folder / unassign)');
    folders.forEach(function (f, i) { lines.push((i + 1) + ' — ' + f.name); });
    lines.push('', 'Enter a number:');
    var raw = prompt(lines.join('\n'), '1');
    if (raw == null) return;
    var n = parseInt(String(raw).trim(), 10);
    if (isNaN(n)) return;
    if (n === 0) { app.folderId = null; }
    else if (n > 0 && n <= folders.length) { app.folderId = folders[n - 1].id; }
    else return;
    putApp(app);
    renderLibrary();
    renderFolderList();
    renderLibraryChips();
  }

  function wireBackup() {
    $('export-library-btn').addEventListener('click', downloadBackup);
    $('import-library-btn').addEventListener('click', function () {
      $('library-restore-picker').click();
    });
    $('library-restore-picker').addEventListener('change', async function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      await restoreBackup(file);
      e.target.value = '';
    });
  }

  function wireHomeActions() {
    var gs = $('home-get-started'); if (gs) gs.addEventListener('click', function () {
      show('import-screen');
    });
    var lib = $('home-library'); if (lib) lib.addEventListener('click', function () {
      currentTypeFilter = 'all'; show('library-screen'); renderLibrary();
    });
    // Optional PWA-help modal kept wired (used when user picks Web Apps card)
    var pc = $('pwa-modal-cancel'); if (pc) pc.addEventListener('click', function () { $('pwa-modal').classList.remove('on'); });
    var pp = $('pwa-modal-pick'); if (pp) pp.addEventListener('click', function () {
      $('pwa-modal').classList.remove('on'); $('file-picker').click();
    });
    // Type cards on the Library screen = filter cards
    document.querySelectorAll('[data-type]').forEach(function (card) {
      card.addEventListener('click', function () {
        var t = card.getAttribute('data-type');
        if (!t) return;
        currentTypeFilter = t;
        show('library-screen');
        renderLibrary();
      });
    });
    // Type cards on the Import screen = import with accept filter
    document.querySelectorAll('[data-import-type]').forEach(function (card) {
      card.addEventListener('click', function () {
        var t = card.getAttribute('data-import-type');
        var picker = $('file-picker');
        if (t === 'html') picker.setAttribute('accept', '.html,.htm,text/html');
        else if (t === 'pdf') picker.setAttribute('accept', '.pdf,application/pdf');
        else if (t === 'epub') picker.setAttribute('accept', '.epub,application/epub+zip');
        else if (t === 'media') picker.setAttribute('accept', 'video/*,audio/*,image/*,.mp4,.mov,.m4v,.webm,.mp3,.m4a,.wav,.ogg,.aac,.jpg,.jpeg,.png,.gif,.webp');
        else if (t === 'zip') {
          // Web apps card: show the PWA help modal first; modal's "Pick" button opens picker
          picker.setAttribute('accept', '.zip,.html,.htm,application/zip,text/html');
          $('pwa-modal').classList.add('on');
          return;
        } else {
          picker.setAttribute('accept', '.html,.htm,.zip,.pdf,.epub,.mp4,.mov,.mp3,.m4a,.jpg,.png,.gif,.webp');
        }
        picker.click();
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

  /* ---------- Bookmarks (option 1) ---------- */
  function openBookmarksFor(app) {
    $('bookmarks-app-name').textContent = app.name;
    renderBookmarks(app);
    $('bookmarks-drawer').classList.add('on');
  }
  function renderBookmarks(app) {
    var list = $('bookmarks-list');
    var marks = app.bookmarks || [];
    if (!marks.length) {
      list.innerHTML = '<p class="hint">No bookmarks yet. Scroll to any spot and tap "Add bookmark here".</p>';
      return;
    }
    list.innerHTML = marks.map(function (m, i) {
      return '<div class="bookmark-row" data-bm="' + esc(m.id) + '">' +
        '<div style="flex:1;">' +
          '<div class="bm-label">' + esc(m.label) + '</div>' +
          '<div class="bm-time">Saved ' + new Date(m.ts).toLocaleString() + '</div>' +
        '</div>' +
        '<button data-bm-act="jump">Jump</button>' +
        '<button data-bm-act="delete" class="danger">Delete</button>' +
      '</div>';
    }).join('');
    list.querySelectorAll('[data-bm]').forEach(function (row) {
      var id = row.getAttribute('data-bm');
      row.querySelector('[data-bm-act="jump"]').addEventListener('click', function () {
        var bm = (app.bookmarks || []).find(function (x) { return x.id === id; });
        if (!bm) return;
        try {
          var doc = $('viewer-frame').contentDocument;
          if (doc && doc.scrollingElement) doc.scrollingElement.scrollTop = bm.scrollY;
        } catch (e) {}
        $('bookmarks-drawer').classList.remove('on');
      });
      row.querySelector('[data-bm-act="delete"]').addEventListener('click', function () {
        app.bookmarks = (app.bookmarks || []).filter(function (x) { return x.id !== id; });
        putApp(app);
        renderBookmarks(app);
      });
    });
  }
  function wireBookmarks() {
    $('bookmarks-btn').addEventListener('click', function () {
      if (currentApp) openBookmarksFor(currentApp);
    });
    $('bookmarks-close').addEventListener('click', function () {
      $('bookmarks-drawer').classList.remove('on');
    });
    $('bookmarks-add').addEventListener('click', function () {
      if (!currentApp) return;
      var defaultLabel = 'Page position';
      try {
        var doc = $('viewer-frame').contentDocument;
        if (doc) {
          // Try to pick a heading or first line visible at current scrollY
          var y = doc.scrollingElement ? doc.scrollingElement.scrollTop : 0;
          var els = doc.querySelectorAll('h1, h2, h3, p');
          for (var i = 0; i < els.length; i++) {
            if (els[i].offsetTop >= y) {
              defaultLabel = String(els[i].textContent || '').trim().slice(0, 60);
              break;
            }
          }
        }
      } catch (e) {}
      var label = prompt('Label for this bookmark:', defaultLabel);
      if (label == null) return;
      label = label.trim() || 'Bookmark';
      var sy = 0;
      try {
        var d2 = $('viewer-frame').contentDocument;
        if (d2 && d2.scrollingElement) sy = d2.scrollingElement.scrollTop;
      } catch (e) {}
      currentApp.bookmarks = currentApp.bookmarks || [];
      currentApp.bookmarks.push({
        id: 'bm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        label: label,
        scrollY: sy,
        ts: Date.now()
      });
      putApp(currentApp);
      renderBookmarks(currentApp);
    });
  }

  /* ---------- Resume reading (option 6) ---------- */
  function updateResumeCard() {
    var btn = $('home-resume');
    var text = $('home-resume-text');
    if (!btn || !text) return;
    var candidates = apps.filter(function (a) {
      return a.readingPosition && a.readingPosition > 100;
    }).sort(function (a, b) { return (b.lastOpened || 0) - (a.lastOpened || 0); });
    if (!candidates.length) { btn.style.display = 'none'; return; }
    var top = candidates[0];
    btn.style.display = 'inline-flex';
    text.textContent = 'Continue: ' + top.name;
    btn.onclick = function () { openApp(top); };
  }

  /* ---------- Per-app theme override (option 3) ---------- */
  function wirePerAppTheme() {
    document.querySelectorAll('.per-theme-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!currentApp) return;
        var t = b.getAttribute('data-per-theme');
        currentApp.preferredTheme = t || null;
        putApp(currentApp);
        // Apply immediately
        if (t) {
          overrideThemeBeforeOpen = overrideThemeBeforeOpen == null ? settings.theme : overrideThemeBeforeOpen;
          applyThemeClasses({ theme: t });
        } else {
          applyThemeClasses(settings);
          overrideThemeBeforeOpen = null;
        }
        refreshPerAppThemeButtons();
      });
    });
  }
  function refreshPerAppThemeButtons() {
    var pref = (currentApp && currentApp.preferredTheme) || '';
    document.querySelectorAll('.per-theme-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-per-theme') === pref);
    });
  }
  function updateReadingTimeDisplay() {
    var el = $('aid-time-spent'); if (!el) return;
    var secs = (currentApp && currentApp.timeSeconds) || 0;
    var mins = Math.floor(secs / 60);
    el.textContent = mins + ' min' + (mins === 1 ? '' : 's');
  }

  /* ---------- TTS (Read Aloud) ---------- */
  var ttsUtterance = null;
  var ttsVoices = [];
  var ttsState = 'idle'; // idle | playing | paused
  function populateTtsVoices() {
    if (!window.speechSynthesis) return;
    ttsVoices = speechSynthesis.getVoices() || [];
    // Sort enhanced/local voices to the top; they sound much better.
    var sorted = ttsVoices.slice().sort(function (a, b) {
      var aEnh = /enhanced|premium|neural/i.test(a.name) ? 1 : 0;
      var bEnh = /enhanced|premium|neural/i.test(b.name) ? 1 : 0;
      if (aEnh !== bEnh) return bEnh - aEnh;
      if (!!a.localService !== !!b.localService) return (b.localService ? 1 : 0) - (a.localService ? 1 : 0);
      return a.name.localeCompare(b.name);
    });
    function fillVoiceSelect(sel) {
      if (!sel) return;
      sel.innerHTML = '';
      var defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = 'System default';
      sel.appendChild(defaultOpt);
      sorted.forEach(function (v) {
        var o = document.createElement('option');
        o.value = String(ttsVoices.indexOf(v));
        var isEnhanced = /enhanced|premium|neural/i.test(v.name);
        var qualityBadge = isEnhanced ? '★ ' : (v.localService ? '• ' : '');
        o.textContent = qualityBadge + v.name + ' (' + v.lang + ')';
        sel.appendChild(o);
      });
    }
    fillVoiceSelect($('tts-voice'));
    fillVoiceSelect($('settings-tts-voice'));
    // Restore saved selections
    if ($('tts-voice') && settings.ttsVoiceIndex) $('tts-voice').value = settings.ttsVoiceIndex;
    if ($('settings-tts-voice') && settings.ttsVoiceIndex) $('settings-tts-voice').value = settings.ttsVoiceIndex;
    if ($('tts-speed') && settings.ttsSpeed) $('tts-speed').value = settings.ttsSpeed;
    if ($('settings-tts-speed') && settings.ttsSpeed) $('settings-tts-speed').value = settings.ttsSpeed;
    // Tiny hint row below the dropdown to guide users
    var status = $('tts-status');
    if (status && !status.dataset.hintAdded) {
      status.dataset.hintAdded = '1';
      status.textContent = '★ = enhanced voice (higher quality). Add more in iPad Settings → Accessibility → Spoken Content → Voices.';
    }
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
    // Prefer the viewer drawer's current selection; fall back to the
    // Settings default (settings.ttsSpeed / settings.ttsVoiceIndex).
    var speed = parseFloat($('tts-speed').value) || parseFloat(settings.ttsSpeed || '1') || 1;
    ttsUtterance.rate = speed;
    var voiceIdx = $('tts-voice').value || settings.ttsVoiceIndex || '';
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
    // TTS defaults (voice + speed) — persist and sync with the viewer drawer
    var sv = $('settings-tts-voice');
    if (sv) sv.addEventListener('change', function () {
      settings.ttsVoiceIndex = sv.value;
      saveSettings();
      if ($('tts-voice')) $('tts-voice').value = sv.value;
    });
    var ss = $('settings-tts-speed');
    if (ss) ss.addEventListener('change', function () {
      settings.ttsSpeed = ss.value;
      saveSettings();
      if ($('tts-speed')) $('tts-speed').value = ss.value;
    });
    // Test Voice — speak a sample phrase so the user can audition
    var st = $('settings-tts-test');
    if (st) st.addEventListener('click', function () {
      if (!window.speechSynthesis) {
        alert('Speech synthesis is not supported on this device.'); return;
      }
      try { speechSynthesis.cancel(); } catch (e) {}
      var u = new SpeechSynthesisUtterance('This is how the selected voice sounds. Every word you read can be spoken aloud.');
      var idx = settings.ttsVoiceIndex;
      if (idx !== '' && ttsVoices[parseInt(idx, 10)]) u.voice = ttsVoices[parseInt(idx, 10)];
      u.rate = parseFloat(settings.ttsSpeed || '1') || 1;
      speechSynthesis.speak(u);
    });
  }

  /* ---------- Library ---------- */

  function renderLibrary() {
    var grid = $('library-grid');
    var empty = $('library-empty');
    var filtered = (currentTypeFilter === 'all')
      ? apps.slice()
      : apps.filter(function (a) { return (a.kind || 'html') === currentTypeFilter; });
    if (currentFolderFilter) {
      filtered = filtered.filter(function (a) { return a.folderId === currentFolderFilter; });
    }
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
      else if (a.kind === 'media') {
        if (a.subKind === 'video') { iconChar = '&#127916;'; kindLabel = 'Video'; }
        else if (a.subKind === 'audio') { iconChar = '&#127925;'; kindLabel = 'Audio'; }
        else { iconChar = '&#128444;'; kindLabel = 'Image'; }
      }
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
      '<button data-act="open">&#128065; View</button>' +
      '<button data-act="notes">&#128221; Notes</button>' +
      '<button data-act="folder">&#128193; Move to folder...</button>' +
      '<button data-act="share">&#10150; Share (Text, Email, AirDrop)</button>' +
      '<button data-act="edit">&#9998; Edit HTML</button>' +
      '<button data-act="home">&#127968; Add to Home Screen</button>' +
      '<button data-act="rename">&#9999; Rename</button>' +
      '<div class="menu-sep"></div>' +
      '<button data-act="delete" class="danger">&#128465; Delete</button>';
    tile.appendChild(menu);
    menu.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var act = ev.target.getAttribute('data-act');
      menu.remove();
      var app = apps.find(function (x) { return x.id === id; });
      if (!app) return;
      if (act === 'open') openApp(app);
      else if (act === 'notes') openNotesFor(app);
      else if (act === 'folder') promptMoveToFolder(app);
      else if (act === 'share') shareAsStandaloneHtml(app);
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
    var imported = 0;
    var failed = 0;
    try {
      // Multi-file bundle detection: if the user picked several files AND
      // one of them is HTML, treat the selection as a "folder-like" web
      // app bundle. iOS Safari cannot pick folders directly, so this is
      // the closest equivalent — tap-select multiple files from the same
      // folder in the Files app and Load bundles them together.
      if (files.length > 1 && hasHtmlEntry(files)) {
        await importMultiFileBundle(files);
        imported = 1;
      } else {
        for (var i = 0; i < files.length; i++) {
          try { await importFile(files[i]); imported++; }
          catch (err) {
            failed++;
            hideProgress();
            toast('✗ ' + files[i].name + ' failed: ' + (err && err.message ? err.message : err), true);
          }
        }
      }
    } catch (err) {
      hideProgress();
      toast('Import failed: ' + (err && err.message ? err.message : err), true);
    }
    hideProgress();
    e.target.value = '';
    renderLibrary();
    updateHomeCounts();
    renderRecent();
    updateResumeCard();
    renderLibraryChips();
    // Confirmation toast — green check, auto-dismisses after 3s
    if (imported > 0) {
      var label = imported === 1
        ? '✓ Imported — now in your Library'
        : '✓ Imported ' + imported + ' files — now in your Library';
      if (failed > 0) label += ' (' + failed + ' failed)';
      toast(label);
    }
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
    } else if (/\.(mp4|mov|m4v|webm|mkv|mp3|m4a|wav|ogg|aac|flac|jpe?g|png|gif|webp|bmp|svg|heic|heif)$/.test(lower)) {
      app = await handleMedia(file, baseName);
    } else {
      // Fall back on MIME type if extension is unclear
      if (file.type === 'text/html') app = await handleHtml(file, baseName);
      else if (file.type === 'application/pdf') app = await handlePdf(file, baseName);
      else if (file.type === 'application/epub+zip') app = await handleEpub(file, baseName);
      else if (file.type === 'application/zip') app = await handleZip(file, baseName);
      else if (/^(video|audio|image)\//.test(file.type || '')) app = await handleMedia(file, baseName);
      else throw new Error('Unsupported file type. Load accepts HTML, ZIP, PDF, EPUB, and media (video / audio / image).');
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

  /* ----- Media: videos / audio / images — stored as raw Blob ----- */
  async function handleMedia(file, baseName) {
    showProgress('Saving ' + file.name + '...');
    var buf = await readAsArrayBuffer(file);
    var lower = (file.name || '').toLowerCase();
    var subKind =
      /\.(mp4|mov|m4v|webm|mkv)$/i.test(lower) || /^video\//.test(file.type || '') ? 'video' :
      /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(lower) || /^audio\//.test(file.type || '') ? 'audio' :
      /\.(jpe?g|png|gif|webp|heic|heif|svg|bmp)$/i.test(lower) || /^image\//.test(file.type || '') ? 'image' :
      'media';
    var mime = file.type || mimeForMedia(lower, subKind);
    // Store as a Blob directly; IndexedDB handles that natively without
    // the ~33% bloat that base64 would add.
    var blob = new Blob([buf], { type: mime });
    return {
      id: newId(),
      name: baseName,
      kind: 'media',
      subKind: subKind,
      mime: mime,
      binary: blob,
      dateAdded: Date.now(),
      lastOpened: null,
      sizeBytes: buf.byteLength
    };
  }

  function mimeForMedia(lower, subKind) {
    var ext = (lower.split('.').pop() || '').toLowerCase();
    var map = {
      mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v',
      webm: 'video/webm', mkv: 'video/x-matroska',
      mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav',
      ogg: 'audio/ogg', aac: 'audio/aac', flac: 'audio/flac',
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
      bmp: 'image/bmp', heic: 'image/heic', heif: 'image/heif'
    };
    return map[ext] || (subKind === 'video' ? 'video/mp4' : subKind === 'audio' ? 'audio/mpeg' : 'image/jpeg');
  }

  /* Build the HTML wrapper that plays a media file inside the viewer
     iframe. Takes a Blob URL (created just-in-time in openApp). */
  function buildMediaWrapper(app, blobUrl) {
    var esc = escHtml;
    var css = 'html,body{margin:0;padding:0;background:#000;color:#fff;height:100%;font-family:-apple-system,sans-serif;}' +
      '.holder{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;box-sizing:border-box;text-align:center;}' +
      '.title{font-size:14px;color:#bbb;letter-spacing:1px;text-transform:uppercase;}' +
      'video,audio,img{max-width:100%;max-height:85vh;display:block;background:#000;border-radius:10px;}' +
      'audio{width:100%;max-width:480px;}';
    var body;
    if (app.subKind === 'video') {
      body = '<video src="' + blobUrl + '" controls playsinline></video>';
    } else if (app.subKind === 'audio') {
      body = '<audio src="' + blobUrl + '" controls></audio>';
    } else {
      body = '<img src="' + blobUrl + '" alt="' + esc(app.name) + '">';
    }
    return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
      '<title>' + esc(app.name) + '</title><style>' + css + '</style></head>' +
      '<body><div class="holder"><div class="title">' + esc(app.name) + '</div>' + body + '</div></body></html>';
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
      var deletedName = app.name;
      await deleteApp(id);
      apps = apps.filter(function (x) { return x.id !== id; });
      renderLibrary();
      updateHomeCounts();
      renderRecent();
      renderLibraryChips();
      renderFolderList();
      closeConfirm();
      toast('✓ Deleted "' + deletedName + '"');
    };
    $('confirm-cancel').onclick = closeConfirm;
  }
  function closeConfirm() { $('confirm-modal').classList.remove('on'); }

  /* ---------- Viewer ---------- */

  /* ---- Reading position + timer state (per-app tracking) ---- */
  var viewerOpenTs = 0;
  var timerInterval = null;
  var positionSaveTimer = null;
  var overrideThemeBeforeOpen = null;
  var currentMediaUrl = null;   // Blob URL for the raw media binary

  async function openApp(app) {
    currentApp = app;
    app.lastOpened = Date.now();
    // Apply per-app theme override (option 3) without persisting to settings
    if (app.preferredTheme && app.preferredTheme !== settings.theme) {
      overrideThemeBeforeOpen = settings.theme;
      var tmp = Object.assign({}, settings, { theme: app.preferredTheme });
      applyThemeClasses(tmp);
    }
    try { await putApp(app); } catch (e) {}
    // Media apps store a raw Blob and need a wrapper HTML; everything
    // else stores ready-to-display HTML.
    var htmlBlob;
    if (app.kind === 'media' && app.binary) {
      // Two Blob URLs: one for the media binary, one for the wrapper HTML
      if (currentMediaUrl) { try { URL.revokeObjectURL(currentMediaUrl); } catch (e) {} }
      currentMediaUrl = URL.createObjectURL(app.binary);
      var wrapperHtml = buildMediaWrapper(app, currentMediaUrl);
      htmlBlob = new Blob([wrapperHtml], { type: 'text/html; charset=utf-8' });
    } else {
      htmlBlob = new Blob([app.html], { type: 'text/html; charset=utf-8' });
    }
    if (currentBlobUrl) { try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {} }
    currentBlobUrl = URL.createObjectURL(htmlBlob);
    $('viewer-title').textContent = app.name;
    var frame = $('viewer-frame');
    frame.src = currentBlobUrl;
    show('viewer-screen');
    frame.addEventListener('load', onFrameLoaded, { once: true });
    // Start reading timer (option 4)
    viewerOpenTs = Date.now();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tickTimer, 10000);  // flush every 10s
  }

  function tickTimer() {
    if (!currentApp || !viewerOpenTs) return;
    var delta = Math.floor((Date.now() - viewerOpenTs) / 1000);
    viewerOpenTs = Date.now();
    currentApp.timeSeconds = (currentApp.timeSeconds || 0) + delta;
    putApp(currentApp).catch(function () {});
  }

  function saveScrollPosition() {
    if (!currentApp) return;
    try {
      var doc = $('viewer-frame').contentDocument;
      if (!doc) return;
      var y = doc.scrollingElement ? doc.scrollingElement.scrollTop : 0;
      currentApp.readingPosition = y;
      putApp(currentApp).catch(function () {});
    } catch (e) {}
  }

  function scheduleScrollSave() {
    if (positionSaveTimer) clearTimeout(positionSaveTimer);
    positionSaveTimer = setTimeout(saveScrollPosition, 1500);
  }

  function closeViewer() {
    // Flush timer + position one last time before unmounting
    tickTimer();
    saveScrollPosition();
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    viewerOpenTs = 0;

    // Restore app-wide theme if a per-app override was active
    if (overrideThemeBeforeOpen != null) {
      applyThemeClasses(settings);
      overrideThemeBeforeOpen = null;
    }

    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    ttsState = 'idle';
    show('library-screen');
    var frame = $('viewer-frame');
    frame.src = 'about:blank';
    if (currentBlobUrl) { try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {} currentBlobUrl = null; }
    if (currentMediaUrl) { try { URL.revokeObjectURL(currentMediaUrl); } catch (e) {} currentMediaUrl = null; }
    currentApp = null;
    $('viewer-topbar').classList.remove('hidden');
    $('show-ui-btn').classList.remove('on');
    $('focus-line').classList.remove('on');
    $('aids-panel').classList.remove('on');
    $('aids-scrim').classList.remove('on');
    $('tts-drawer').classList.remove('on');
    $('notes-drawer').classList.remove('on');
    $('bookmarks-drawer').classList.remove('on');
    renderLibrary();
  }

  /* Extract theme-only class logic so we can override per-app without
   * clobbering saved settings.theme. */
  function applyThemeClasses(s) {
    ['dark', 'cream', 'sepia', 'blue', 'contrast'].forEach(function (t) {
      document.body.classList.toggle('theme-' + t, s.theme === t);
    });
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
    refreshPerAppThemeButtons();
    updateReadingTimeDisplay();
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

  function onFrameLoaded() {
    applyAidsToFrame();
    // Restore reading position if we have one (option 6)
    if (currentApp && currentApp.readingPosition > 0) {
      try {
        var doc = $('viewer-frame').contentDocument;
        if (doc && doc.scrollingElement) {
          doc.scrollingElement.scrollTop = currentApp.readingPosition;
        }
      } catch (e) {}
    }
    // Hook scroll listener so we can save the position as it changes
    try {
      var doc2 = $('viewer-frame').contentDocument;
      if (doc2) doc2.addEventListener('scroll', scheduleScrollSave, { passive: true });
    } catch (e) {}
  }

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
