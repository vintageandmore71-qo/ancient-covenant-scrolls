// Load — Run Web Apps on iPad (PWA)
// Copyright (c) 2026 LBond. All Rights Reserved.
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

  // iOS Safari auto-zooms into form inputs with font-size < 16px and
  // won't unzoom when the keyboard closes. Once the PWA is reopened the
  // zoom state can persist — the app appears "huge" and nothing the
  // user taps feels right. The fix of bumping inputs to 16px prevents
  // NEW zooms; this function attempts to clear any STUCK zoom from a
  // previous session by briefly pinning maximum-scale=1, then restores
  // the accessibility-friendly user-scalable viewport.
  function fixStuckZoom() {
    try {
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) return;
      var scale = (window.visualViewport && window.visualViewport.scale) || 1;
      if (scale < 1.02 && scale > 0.98) return; // already at normal zoom
      var original = meta.getAttribute('content');
      meta.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover');
      // Force reflow so iOS picks up the new constraint
      document.body.offsetHeight;
      setTimeout(function () {
        meta.setAttribute('content', original || 'width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=yes');
        // Re-check; if still stuck, tell the user to pinch out.
        var now = (window.visualViewport && window.visualViewport.scale) || 1;
        if (now > 1.05) {
          toast('iPad is stuck zoomed — pinch with two fingers to zoom out.', true);
        }
      }, 400);
    } catch (e) { /* non-fatal */ }
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
  /* ---------- Templates ----------
   * Built-in: article, note, letter, recipe, checklist, acr (ACR Reader
   * Book layout with chapter sidebar, TTS, dyslexia font, etc.).
   * User-saved: any page created in Load can be saved as a template.
   * Templates live in localStorage; the Create screen lists them as
   * buttons. Selecting one pre-fills the editor. */
  var LS_TEMPLATES = 'load_user_templates_v1';
  function loadUserTemplates() {
    try { return JSON.parse(localStorage.getItem(LS_TEMPLATES) || '[]') || []; }
    catch (e) { return []; }
  }
  function saveUserTemplates(list) {
    try { localStorage.setItem(LS_TEMPLATES, JSON.stringify(list)); } catch (e) {}
  }
  function renderUserTemplateButtons() {
    var wrap = $('create-user-templates');
    var label = $('user-templates-label');
    if (!wrap) return;
    var list = loadUserTemplates();
    if (!list.length) {
      wrap.style.display = 'none';
      if (label) label.style.display = 'none';
      wrap.innerHTML = '';
      return;
    }
    wrap.style.display = '';
    if (label) label.style.display = '';
    wrap.innerHTML = list.map(function (t) {
      // Raw-HTML templates get the floppy icon so the user can tell at
      // a glance which entries came from "Save as template" on an open
      // file versus which came from Create-wizard drafts.
      var icon = t.type === 'raw' ? '&#128190;' : '&#128196;';
      return '<button class="seg-btn" data-user-template="' + escHtml(t.id) + '">' +
        icon + ' ' + escHtml(t.name) +
        ' <span class="remove-tpl" data-remove-tpl="' + escHtml(t.id) + '" aria-label="Remove template">&times;</span>' +
      '</button>';
    }).join('');
    wrap.querySelectorAll('[data-user-template]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        if (e.target.getAttribute('data-remove-tpl')) return;
        loadUserTemplateInto(b.getAttribute('data-user-template'));
      });
    });
    wrap.querySelectorAll('[data-remove-tpl]').forEach(function (x) {
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        removeUserTemplate(x.getAttribute('data-remove-tpl'));
      });
    });
  }
  function loadUserTemplateInto(id) {
    var list = loadUserTemplates();
    var t = list.find(function (x) { return x.id === id; });
    if (!t) return;
    // Raw-HTML templates saved from an open file bypass the Create
    // wizard and open directly in the HTML editor as a new scratch
    // app. Nothing is persisted until the user taps Save.
    if (t.type === 'raw') {
      var scratch = {
        id: 'scratch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        name: (t.name || 'Untitled') + ' — copy',
        kind: 'html',
        html: t.html || '',
        sizeBytes: (t.html || '').length,
        dateAdded: Date.now()
      };
      try { openEditor(scratch); toast('Opened "' + scratch.name + '" in the editor. Tap Save to keep it.'); }
      catch (e) { console.warn('loadUserTemplateInto raw failed', e); toast('Could not open editor.', true); }
      return;
    }
    currentTemplate = t.basedOn || 'article';
    $('create-title').value = t.title || '';
    $('create-body').value = t.body || '';
    document.querySelectorAll('[data-template]').forEach(function (x) {
      x.classList.toggle('active', x.getAttribute('data-template') === currentTemplate);
    });
    toggleAcrTemplateOptions(currentTemplate === 'acr');
    if (t.acrOptions) {
      Object.keys(t.acrOptions).forEach(function (k) {
        var el = $('acr-opt-' + k);
        if (el) el.checked = !!t.acrOptions[k];
      });
    }
    toast('Loaded template: ' + t.name);
  }
  function removeUserTemplate(id) {
    var list = loadUserTemplates().filter(function (t) { return t.id !== id; });
    saveUserTemplates(list);
    renderUserTemplateButtons();
    toast('Template removed');
  }
  function toggleAcrTemplateOptions(on) {
    var box = $('acr-template-options');
    if (box) box.style.display = on ? '' : 'none';
  }
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
      toggleAcrTemplateOptions(false);
      renderUserTemplateButtons();
    });
    document.querySelectorAll('[data-template]').forEach(function (b) {
      b.addEventListener('click', function () {
        currentTemplate = b.getAttribute('data-template');
        document.querySelectorAll('[data-template]').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        toggleAcrTemplateOptions(currentTemplate === 'acr');
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
    var tplBtn = $('create-save-template-btn');
    if (tplBtn) tplBtn.addEventListener('click', saveCurrentAsTemplate);
  }
  function saveCurrentAsTemplate() {
    var title = ($('create-title').value || '').trim();
    var body = ($('create-body').value || '').trim();
    if (!title && !body) {
      toast('Add a title or content first — there\'s nothing to save as a template.', true);
      return;
    }
    var name = (prompt('Name this template (so you can reuse it):', title || 'My template') || '').trim();
    if (!name) return;
    var tpl = {
      id: newId(),
      name: name.slice(0, 60),
      basedOn: currentTemplate,
      title: title,
      body: body,
      acrOptions: collectAcrOptions(),
      createdAt: Date.now()
    };
    var list = loadUserTemplates();
    list.unshift(tpl);
    saveUserTemplates(list.slice(0, 30));   // cap at 30 so localStorage stays small
    renderUserTemplateButtons();
    toast('✓ Template saved — it\'ll appear here next time you create.');
  }
  function collectAcrOptions() {
    var keys = ['toc','search','font-controls','dyslexic','tts','bookmarks','progress'];
    var out = {};
    keys.forEach(function (k) {
      var el = $('acr-opt-' + k);
      if (el) out[k] = !!el.checked;
    });
    return out;
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
    } else if (tpl === 'acr') {
      return buildAcrTemplate(title, body, collectAcrOptions());
    }
    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
      '<title>' + esc(title) + '</title>' +
      '<style>' + styleBase + extraStyle + '</style></head>' +
      '<body>' + content + '</body></html>';
  }
  /* ---------- ACR Reader Book template ----------
   * Produces a fully self-contained HTML page modelled on the ACR study
   * reader layout: chapter sidebar, search, font/theme controls,
   * dyslexia font toggle, TTS, bookmarks, optional progress bar. User
   * opts in/out per feature; any unchecked feature is omitted from the
   * output so the saved page stays as small as possible.
   *
   * Content format:
   *   ## Chapter title       — starts a new chapter
   *   Everything until the next ## is that chapter's body text.
   *   Blank lines become paragraph breaks.
   */
  function buildAcrTemplate(title, body, opts) {
    opts = opts || {};
    var esc = escHtml;
    // Split into chapters by "## Heading" lines
    var chapters = [];
    var cur = { title: 'Introduction', paras: [] };
    (String(body || '').split(/\r?\n/)).forEach(function (line) {
      var m = /^##\s+(.+)/.exec(line);
      if (m) {
        if (cur.paras.length || cur.title !== 'Introduction') chapters.push(cur);
        cur = { title: m[1].trim(), paras: [] };
      } else {
        cur.paras.push(line);
      }
    });
    chapters.push(cur);
    // Discard leading empty intro
    chapters = chapters.filter(function (c) {
      return c.title !== 'Introduction' || c.paras.some(function (p) { return p.trim(); });
    });
    if (!chapters.length) chapters = [{ title: title || 'Untitled', paras: [''] }];

    var style = [
      ':root{--bg:#14142a;--fg:#e8e8ee;--mid:#b0b0c8;--accent:#7c7cff;--panel:#1a1a36;--border:#2a2a4a;}',
      '*{box-sizing:border-box;}',
      'body{margin:0;font-family:"Atkinson Hyperlegible",-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--fg);line-height:1.75;font-size:17px;}',
      'body.dyslexic{font-family:"OpenDyslexic","Atkinson Hyperlegible",sans-serif;}',
      'body.theme-cream{--bg:#fbf4e4;--fg:#2a2418;--mid:#6a5a3a;--panel:#f3e8c7;--border:#ddd0a4;}',
      'body.theme-sepia{--bg:#f4ecd8;--fg:#3a2f1a;--mid:#6a5a3a;--panel:#ebe0bf;--border:#ccb98a;}',
      'body.theme-light{--bg:#ffffff;--fg:#1a1a2e;--mid:#5a5a6a;--panel:#f4f4f8;--border:#d0d0dc;}',
      '.layout{display:flex;min-height:100vh;}',
      (opts.toc ? '.sidebar{width:260px;background:var(--panel);border-right:1px solid var(--border);padding:20px 16px;overflow-y:auto;position:sticky;top:0;height:100vh;}' +
         '.sidebar h2{font-size:15px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1.5px;color:var(--mid);}' +
         '.sidebar a{display:block;padding:8px 10px;color:var(--fg);text-decoration:none;border-radius:6px;font-size:15px;margin-bottom:2px;}' +
         '.sidebar a:hover,.sidebar a.active{background:var(--accent);color:#fff;}' : '.sidebar{display:none;}'),
      '.main{flex:1;max-width:820px;margin:0 auto;padding:30px 24px 80px;}',
      'h1{font-size:28px;margin:0 0 8px;color:var(--accent);}',
      '.sub{color:var(--mid);font-size:13px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 24px;}',
      'section.chapter{border-top:1px solid var(--border);padding-top:24px;margin-top:28px;}',
      'section.chapter:first-of-type{border-top:none;margin-top:0;}',
      'h2.chapter-title{font-size:22px;color:var(--fg);margin:0 0 14px;}',
      'p{margin:0 0 14px;}',
      '.controls{position:fixed;top:0;right:0;left:0;background:var(--panel);border-bottom:1px solid var(--border);padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px;z-index:5;}',
      '.controls button,.controls input{background:var(--bg);color:var(--fg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:14px;cursor:pointer;}',
      '.controls input[type=search]{flex:1;min-width:140px;}',
      '.controls button:active{background:var(--accent);color:#fff;}',
      'body.has-controls .main{padding-top:74px;}',
      (opts.progress ? '.progress{position:fixed;top:0;left:0;right:0;height:3px;background:var(--border);z-index:10;}' +
         '.progress>span{display:block;height:100%;background:var(--accent);width:0%;transition:width 0.2s;}' : ''),
      (opts.bookmarks ? '.bm-btn{float:right;background:none;border:none;color:var(--mid);font-size:22px;cursor:pointer;}' +
         '.bm-btn.on{color:#e0a040;}' : ''),
      'mark{background:rgba(255,230,0,0.45);color:inherit;border-radius:3px;padding:0 2px;}'
    ].join('');

    var tocHtml = opts.toc
      ? '<nav class="sidebar"><h2>Chapters</h2>' +
        chapters.map(function (c, i) { return '<a href="#ch-' + i + '" data-ch="' + i + '">' + esc(c.title) + '</a>'; }).join('') +
        '</nav>'
      : '';

    var hasControls = !!(opts.search || opts['font-controls'] || opts.dyslexic || opts.tts);
    var controlsHtml = hasControls ? '<div class="controls">' +
      (opts.search ? '<input type="search" id="acr-q" placeholder="Search in this book…" aria-label="Search">' : '') +
      (opts['font-controls'] ? '<button id="acr-font-down" aria-label="Smaller text">A−</button><button id="acr-font-up" aria-label="Larger text">A+</button><button id="acr-theme" aria-label="Theme">◐</button>' : '') +
      (opts.dyslexic ? '<button id="acr-dyslexic" aria-label="Dyslexia font">🌈 Dyslexia</button>' : '') +
      (opts.tts ? '<button id="acr-tts" aria-label="Read aloud">🔊 Read</button>' : '') +
      '</div>' : '';

    var chaptersHtml = chapters.map(function (c, i) {
      var paras = c.paras.join('\n').split(/\n\s*\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
      return '<section class="chapter" id="ch-' + i + '">' +
        (opts.bookmarks ? '<button class="bm-btn" data-ch="' + i + '" aria-label="Bookmark">★</button>' : '') +
        '<h2 class="chapter-title">' + esc(c.title) + '</h2>' +
        paras.map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('') +
      '</section>';
    }).join('');

    var progressHtml = opts.progress ? '<div class="progress"><span id="acr-progress"></span></div>' : '';

    var script = [
      '(function(){',
      (opts['font-controls'] ? 'var step=parseFloat(localStorage.getItem("acr_font")||"0");document.body.style.fontSize=(17+step*1.5)+"px";' : ''),
      (opts['font-controls'] ? 'var themes=["","theme-cream","theme-sepia","theme-light"];var ti=parseInt(localStorage.getItem("acr_theme")||"0",10);document.body.classList.add(themes[ti]);' : ''),
      (opts.dyslexic ? 'if(localStorage.getItem("acr_dys")==="1")document.body.classList.add("dyslexic");' : ''),
      hasControls ? 'document.body.classList.add("has-controls");' : '',
      (opts['font-controls'] ? 'var fu=document.getElementById("acr-font-up");if(fu)fu.onclick=function(){step=Math.min(6,step+1);localStorage.setItem("acr_font",step);document.body.style.fontSize=(17+step*1.5)+"px";};' : ''),
      (opts['font-controls'] ? 'var fd=document.getElementById("acr-font-down");if(fd)fd.onclick=function(){step=Math.max(-2,step-1);localStorage.setItem("acr_font",step);document.body.style.fontSize=(17+step*1.5)+"px";};' : ''),
      (opts['font-controls'] ? 'var th=document.getElementById("acr-theme");if(th)th.onclick=function(){document.body.classList.remove(themes[ti]);ti=(ti+1)%themes.length;document.body.classList.add(themes[ti]);localStorage.setItem("acr_theme",ti);};' : ''),
      (opts.dyslexic ? 'var dy=document.getElementById("acr-dyslexic");if(dy)dy.onclick=function(){document.body.classList.toggle("dyslexic");localStorage.setItem("acr_dys",document.body.classList.contains("dyslexic")?"1":"0");};' : ''),
      (opts.search ? 'var q=document.getElementById("acr-q");if(q)q.addEventListener("input",function(e){var needle=e.target.value.trim().toLowerCase();document.querySelectorAll("section.chapter").forEach(function(s){s.querySelectorAll("mark").forEach(function(m){m.replaceWith(document.createTextNode(m.textContent));});s.normalize();if(!needle){s.style.display="";return;}var text=s.textContent.toLowerCase();if(text.indexOf(needle)<0){s.style.display="none";return;}s.style.display="";s.querySelectorAll("p").forEach(function(p){var idx=p.textContent.toLowerCase().indexOf(needle);if(idx<0)return;var t=p.textContent;p.innerHTML="";var before=document.createTextNode(t.slice(0,idx));var hit=document.createElement("mark");hit.textContent=t.slice(idx,idx+needle.length);var after=document.createTextNode(t.slice(idx+needle.length));p.appendChild(before);p.appendChild(hit);p.appendChild(after);});});});' : ''),
      (opts.tts ? 'var tts=document.getElementById("acr-tts");var utter=null;if(tts)tts.onclick=function(){if(speechSynthesis.speaking){speechSynthesis.cancel();tts.textContent="🔊 Read";return;}var vis=Array.from(document.querySelectorAll("section.chapter")).filter(function(s){return s.style.display!=="none";});var text=vis.map(function(s){return s.textContent;}).join("\\n\\n");utter=new SpeechSynthesisUtterance(text);utter.rate=1;speechSynthesis.speak(utter);tts.textContent="⏹ Stop";utter.onend=function(){tts.textContent="🔊 Read";};};' : ''),
      (opts.bookmarks ? 'var saved=JSON.parse(localStorage.getItem("acr_bm")||"[]");document.querySelectorAll(".bm-btn").forEach(function(b){var ch=b.getAttribute("data-ch");if(saved.indexOf(ch)>=0)b.classList.add("on");b.onclick=function(){b.classList.toggle("on");var list=JSON.parse(localStorage.getItem("acr_bm")||"[]");if(b.classList.contains("on")){if(list.indexOf(ch)<0)list.push(ch);}else{list=list.filter(function(x){return x!==ch;});}localStorage.setItem("acr_bm",JSON.stringify(list));};});' : ''),
      (opts.toc ? 'var links=document.querySelectorAll(".sidebar a");var sections=document.querySelectorAll("section.chapter");function update(){var top=window.scrollY+120;var active=0;sections.forEach(function(s,i){if(s.offsetTop<=top)active=i;});links.forEach(function(a,i){a.classList.toggle("active",i===active);});}window.addEventListener("scroll",update);update();' : ''),
      (opts.progress ? 'function prog(){var h=document.documentElement.scrollHeight-window.innerHeight;var p=h>0?Math.min(100,(window.scrollY/h)*100):0;var el=document.getElementById("acr-progress");if(el)el.style.width=p+"%";}window.addEventListener("scroll",prog);prog();' : ''),
      '})();'
    ].filter(Boolean).join('\n');

    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
      '<meta name="color-scheme" content="light dark">' +
      '<title>' + esc(title || 'ACR Reader') + '</title>' +
      '<style>' + style + '</style></head>' +
      '<body>' + progressHtml + controlsHtml +
      '<div class="layout">' + tocHtml +
      '<main class="main">' +
        '<h1>' + esc(title || 'ACR Reader Book') + '</h1>' +
        '<p class="sub">ACR Reader Book &middot; created in Load</p>' +
        chaptersHtml +
      '</main></div>' +
      '<script>' + script + '</script>' +
      '</body></html>';
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

  /* ---------- Developer Console (v14g) ----------
   * Captures console.log/info/warn/error and window.error from the
   * loaded iframe and mirrors them into a readable drawer. Also lets
   * the user evaluate one-line expressions in the iframe's context —
   * great for trying bits of JS while building. Built for dyslexic /
   * disabled developers: large mono font, generous spacing, colored
   * by severity, never scrolls off the top. */
  var consoleEntries = [];
  var currentScanReport = null;
  function wireConsole() {
    var drawer = $('console-drawer');
    if (!drawer) return;
    var viewerBtn = document.getElementById('console-btn-viewer');
    if (viewerBtn) viewerBtn.addEventListener('click', openDevConsole);
    $('console-close').addEventListener('click', function () { drawer.classList.remove('on'); });
    $('console-clear').addEventListener('click', function () {
      consoleEntries.length = 0;
      renderConsole();
    });
    $('console-copy').addEventListener('click', function () {
      // Copy whichever tab the user is looking at so they can paste it
      // into an email/note/Slack for help.
      var scanOn = $('console-scan') && $('console-scan').classList.contains('on');
      var txt;
      if (scanOn && currentScanReport) {
        txt = scanReportAsText(currentScanReport);
      } else {
        txt = consoleEntries.map(function (e) {
          return '[' + e.level + '] ' + e.msg;
        }).join('\n');
      }
      copyToClipboard(txt);
      toast('✓ Copied to clipboard');
    });
    $('console-run').addEventListener('click', runConsoleEval);
    $('console-eval').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runConsoleEval();
    });
    // Tab switcher — Scan vs Log. Sticky; last tab used is remembered
    // for the current session only (no persisted setting, intentional).
    var tabScan = $('console-tab-scan');
    var tabLog = $('console-tab-log');
    if (tabScan) tabScan.addEventListener('click', function () { switchConsoleTab('scan'); });
    if (tabLog)  tabLog.addEventListener('click',  function () { switchConsoleTab('log'); });
    // Scan + auto-fix buttons
    var scanRun = $('console-scan-run');
    var scanFix = $('console-scan-fix');
    if (scanRun) scanRun.addEventListener('click', runScanCurrentApp);
    if (scanFix) scanFix.addEventListener('click', runAutoFix);
  }
  function switchConsoleTab(name) {
    var scan = $('console-scan');
    var log = $('console-logview');
    var tabScan = $('console-tab-scan');
    var tabLog = $('console-tab-log');
    if (!scan || !log) return;
    if (name === 'scan') {
      scan.classList.add('on'); log.classList.remove('on');
      if (tabScan) tabScan.classList.add('active');
      if (tabLog)  tabLog.classList.remove('active');
    } else {
      scan.classList.remove('on'); log.classList.add('on');
      if (tabScan) tabScan.classList.remove('active');
      if (tabLog)  tabLog.classList.add('active');
    }
  }
  function updateScanHint() {
    var hint = $('console-scan-hint');
    if (!hint) return;
    if (currentApp) {
      hint.innerHTML = 'Open file: <strong>' + escHtml(currentApp.name) +
        '</strong> &middot; Tap <strong>Scan current page</strong> to diagnose broken assets, JS errors, manifest problems, and render failures. Load will explain each issue in plain language.';
    } else {
      hint.innerHTML = 'No app open. Open any imported file in the viewer, then tap <strong>Scan current page</strong> to detect broken assets, missing manifest entries, script errors and more. Load will explain every issue in plain language and offer to fix what it can.';
    }
  }
  /* ---------- Scan / diagnose / auto-fix engine ----------
   * Given the currently open app, produce a plain-language health report:
   *   - Broken asset references (src/href pointing to files the bundle
   *     doesn't include, after inlining)
   *   - Missing manifest fields (when the bundle is a PWA zip)
   *   - JS errors already captured during the current session (from the
   *     iframe console bridge)
   *   - Structural issues (no <title>, no viewport meta, no <body>,
   *     empty body, doctype missing)
   *   - Local-runner compatibility checks (hard-coded http(s) urls,
   *     absolute /-paths, service-worker-only assets)
   * Each finding has a label, a detail, a severity, and an optional
   * "fix" closure. Auto-fix runs every enabled fix closure, rebuilds
   * the iframe from the patched HTML, and re-scans.
   */
  function runScanCurrentApp() {
    var report = { items: [], fixable: 0 };
    currentScanReport = report;
    var box = $('console-scan-report');
    if (!box) return;
    if (!currentApp) {
      box.innerHTML = '<div class="scan-item warn"><div class="label">&#9432; No app is open.</div>' +
        '<div class="detail">Go to the Library, tap any tile to open it in the viewer, then come back here and tap <strong>Scan current page</strong>.</div></div>';
      $('console-scan-fix').disabled = true;
      return;
    }
    var html = currentApp.html || '';
    scanStructural(html, report);
    scanAssets(html, report);
    scanManifest(currentApp, report);
    scanLocalRunnerCompat(html, report);
    scanCapturedErrors(report);
    scanIframeRender(report);
    renderScanReport(report);
    // Keep the button tappable even when nothing is auto-fixable so the
    // user gets a clear "Nothing to fix" response instead of a silent
    // no-op. Text changes so the state is still visible.
    var fixBtn = $('console-scan-fix');
    if (fixBtn) {
      fixBtn.disabled = false;
      fixBtn.textContent = report.fixable === 0
        ? '✓ Nothing to auto-fix'
        : '\u{1F528} Auto-fix issues (' + report.fixable + ')';
    }
  }
  function renderScanReport(report) {
    var box = $('console-scan-report');
    if (!box) return;
    var errCount = report.items.filter(function (i) { return i.severity === 'error'; }).length;
    var warnCount = report.items.filter(function (i) { return i.severity === 'warn'; }).length;
    var okCount = report.items.filter(function (i) { return i.severity === 'ok'; }).length;
    var summary;
    if (errCount === 0 && warnCount === 0) {
      summary = '<div class="scan-summary"><strong>&#9989; Looks healthy.</strong> ' +
        'Ran ' + report.items.length + ' checks, found no problems. ' +
        (okCount ? okCount + ' passed.' : '') + '</div>';
    } else {
      summary = '<div class="scan-summary"><strong>Scan complete.</strong> ' +
        (errCount ? '<span style="color:var(--danger)">' + errCount + ' error' + (errCount===1?'':'s') + '</span>' : '') +
        (errCount && warnCount ? ', ' : '') +
        (warnCount ? '<span style="color:#e0a040">' + warnCount + ' warning' + (warnCount===1?'':'s') + '</span>' : '') +
        (report.fixable ? ' &mdash; <strong>' + report.fixable + ' fixable.</strong> Tap <strong>Auto-fix issues</strong> to try.' : '') +
        '</div>';
    }
    box.innerHTML = summary + report.items.map(function (item) {
      return '<div class="scan-item ' + item.severity + '">' +
        '<div class="label">' + item.icon + ' ' + escHtml(item.label) + '</div>' +
        '<div class="detail">' + item.detail + '</div>' +
      '</div>';
    }).join('');
    // Wire any embedded scan-action buttons (e.g. "Download & embed
    // fonts"). These aren't part of the auto-fix flow because they
    // need async network work — they run on their own.
    box.querySelectorAll('[data-scan-action]').forEach(function (btn) {
      var action = btn.getAttribute('data-scan-action');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (action === 'embed-gfonts') runEmbedGoogleFonts();
        else if (action === 'ai-fix') runAiFixEverything();
      });
    });
    // Add an "Ask AI to fix everything" card at the bottom when at
    // least one provider is configured. Lets the user trigger a
    // broader LLM-powered rewrite in addition to the built-in fixes.
    if (typeof anyAiProviderConfigured === 'function' && anyAiProviderConfigured()) {
      var aiCard = document.createElement('div');
      aiCard.className = 'scan-item ai-fix-card';
      aiCard.innerHTML =
        '<div class="label">&#129302; Ask AI to fix everything</div>' +
        '<div class="detail">Send this file + the scan report to your configured AI (Gemini / OpenRouter) and have it rewrite the HTML to address every warning above — including ones without built-in fixes. You preview the result before anything is saved.' +
        '<br><button class="scan-action scan-action-primary" data-scan-action="ai-fix">&#9889; Ask AI to fix it</button></div>';
      box.appendChild(aiCard);
      aiCard.querySelector('[data-scan-action="ai-fix"]').addEventListener('click', runAiFixEverything);
    }
  }
  function scanReportAsText(report) {
    var out = ['Load — Developer Console scan'];
    out.push('Item: ' + (currentApp && currentApp.name ? currentApp.name : 'none open'));
    out.push('Time: ' + new Date().toLocaleString());
    out.push('');
    report.items.forEach(function (item) {
      out.push('[' + item.severity.toUpperCase() + '] ' + item.label);
      out.push('  ' + item.detail.replace(/<[^>]+>/g, ''));
    });
    return out.join('\n');
  }
  function pushItem(report, severity, icon, label, detail, fix) {
    var entry = { severity: severity, icon: icon, label: label, detail: detail };
    if (typeof fix === 'function') {
      entry.fix = fix;
      if (severity !== 'ok') report.fixable++;
    }
    report.items.push(entry);
  }
  function scanStructural(html, report) {
    if (!/<!doctype/i.test(html)) {
      pushItem(report, 'warn', '&#9432;', 'No DOCTYPE declaration',
        'The HTML is missing <code>&lt;!DOCTYPE html&gt;</code>. Some browsers fall back to quirks mode, which can break layout. Load can add the standard doctype automatically.',
        function () { return '<!DOCTYPE html>\n' + html; });
    } else {
      pushItem(report, 'ok', '&#10003;', 'DOCTYPE declared', 'Standard <code>&lt;!DOCTYPE html&gt;</code> present.');
    }
    if (!/<title[^>]*>[^<]/i.test(html)) {
      pushItem(report, 'warn', '&#9432;', 'No &lt;title&gt; element',
        'Without a title, the viewer tab + bookmarks will show the filename. Load can inject a default title based on the item name.',
        function (h) { return (h || html).replace(/<head([^>]*)>/i, '<head$1>\n<title>' + escHtml(currentApp.name || 'Untitled') + '</title>'); });
    }
    if (!/<meta[^>]+name=["']viewport/i.test(html)) {
      pushItem(report, 'warn', '&#9432;', 'No viewport meta tag',
        'On iPad the page will render at desktop width and feel zoomed out. Load can add <code>width=device-width,initial-scale=1</code>.',
        function (h) { return (h || html).replace(/<head([^>]*)>/i, '<head$1>\n<meta name="viewport" content="width=device-width,initial-scale=1">'); });
    }
    // Character encoding — without this, browsers default to the system
    // locale which garbles non-ASCII (smart quotes, emoji, accents).
    if (!/<meta[^>]+charset/i.test(html)) {
      pushItem(report, 'warn', '&#9432;', 'No charset declaration',
        'Without <code>&lt;meta charset="UTF-8"&gt;</code> browsers guess the encoding, which can garble smart quotes, accents, and emoji.',
        function (h) { return (h || html).replace(/<head([^>]*)>/i, '<head$1>\n<meta charset="UTF-8">'); });
    }
    // Images with no alt attribute — bad for screen readers and common
    // automated-fix target. We add an empty alt="" so the image is
    // marked decorative; user can rename it later if meaningful.
    var noAltImgs = (html.match(/<img\b(?![^>]*\salt\s*=)[^>]*>/gi) || []).length;
    if (noAltImgs > 0) {
      pushItem(report, 'warn', '&#9888;', noAltImgs + ' image' + (noAltImgs === 1 ? '' : 's') + ' missing <code>alt</code>',
        'Screen readers skip images without an alt attribute. Adding an empty <code>alt=""</code> marks them as decorative; for informative images the user should describe them in plain language.',
        function (h) {
          return (h || html).replace(/<img\b(?![^>]*\salt\s*=)([^>]*)>/gi, '<img alt=""$1>');
        });
    }
    // Common third-party tracking / analytics scripts. These are almost
    // never wanted in a personal book or offline PWA — strip them.
    var trackerRe = /<script\b[^>]*\bsrc\s*=\s*["'][^"']*(?:google-analytics|googletagmanager|mixpanel|segment\.com|facebook\.net\/[^"']*fbevents|hotjar|fullstory|amplitude\.com|matomo)[^"']*["'][^>]*>\s*<\/script>/gi;
    var trackerMatches = html.match(trackerRe) || [];
    var inlineTrackerRe = /<script\b[^>]*>[\s\S]*?(?:gtag\(|ga\(|fbq\(|_gaq\.push|mixpanel\.|amplitude\.|hotjar\.)[\s\S]*?<\/script>/gi;
    var inlineTrackerMatches = html.match(inlineTrackerRe) || [];
    var totalTrackers = trackerMatches.length + inlineTrackerMatches.length;
    if (totalTrackers > 0) {
      pushItem(report, 'warn', '&#128274;', totalTrackers + ' tracking / analytics script' + (totalTrackers === 1 ? '' : 's'),
        'This file includes known third-party tracking scripts (Google Analytics, Facebook Pixel, Mixpanel, etc.). They send information about the reader to outside servers — not ideal for a private book or offline PWA.',
        function (h) {
          var out = h || html;
          out = out.replace(trackerRe, '');
          out = out.replace(inlineTrackerRe, '');
          return out;
        });
    }
    if (!/<body[\s\S]*<\/body>/i.test(html)) {
      pushItem(report, 'error', '&#10060;', 'No &lt;body&gt; element',
        'The HTML has no body, so nothing can render. This usually means the file is a fragment, not a full page. Check the imported file in the HTML editor.');
    } else {
      var bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
      if (bodyMatch && bodyMatch[1].replace(/<[^>]+>/g, '').trim().length < 3) {
        pushItem(report, 'warn', '&#9888;', 'Body is empty',
          'The body tag exists but has no visible content. If this file depends on JavaScript to populate it, check the Log tab for script errors.');
      }
    }
  }
  function scanAssets(html, report) {
    // After Load's zip importer runs, external references SHOULD already
    // be inlined. If any remain (href/src pointing to a relative path),
    // those files weren't in the bundle and will 404 at runtime.
    var broken = [];
    var srcRe = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
    var m;
    var seen = {};
    while ((m = srcRe.exec(html)) !== null) {
      var url = m[1].trim();
      if (!url) continue;
      if (seen[url]) continue;
      seen[url] = true;
      if (/^(data|blob|about|mailto|tel|javascript|#):?/i.test(url)) continue;
      if (/^https?:\/\//i.test(url)) continue;   // external, separate check
      if (/^\/\//.test(url)) continue;           // protocol-relative, handled below
      if (/^\//.test(url)) {
        broken.push({ url: url, reason: 'absolute path — will 404 when opened from local / PWA runners' });
      } else if (!/^[a-z]+:/i.test(url)) {
        // relative path that survived inlining = file wasn't in the bundle
        broken.push({ url: url, reason: 'relative path with no matching file in the bundle' });
      }
    }
    if (!broken.length) {
      pushItem(report, 'ok', '&#10003;', 'All asset references resolved', 'No stray <code>src</code> / <code>href</code> pointing to missing files.');
    } else {
      var list = broken.slice(0, 8).map(function (b) {
        return '<li><code>' + escHtml(b.url) + '</code> — ' + escHtml(b.reason) + '</li>';
      }).join('');
      if (broken.length > 8) list += '<li>&hellip; and ' + (broken.length - 8) + ' more</li>';
      pushItem(report, 'error', '&#10060;',
        broken.length + ' broken asset reference' + (broken.length === 1 ? '' : 's'),
        'These references will fail at runtime because the target file isn\'t in the bundle:<ul>' + list + '</ul>' +
        '<strong>Fix:</strong> re-import the original folder as a <em>zip</em>, or use Files &rarr; Select multi-file, so Load can inline every asset.');
    }
    // External hard-coded URLs — fine online, but break offline-first PWAs.
    var extRe = /\b(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
    var externals = [];
    while ((m = extRe.exec(html)) !== null) externals.push(m[1]);
    // Split out Google Fonts specifically — those have an automated
    // embed path via runEmbedGoogleFonts() since both the CSS host
    // (fonts.googleapis.com) and the font-file host (fonts.gstatic.com)
    // serve Access-Control-Allow-Origin: * so we can fetch + base64
    // them directly from the page.
    var gfontUrls = externals.filter(function (u) {
      return /^https?:\/\/fonts\.(googleapis|gstatic)\.com\//i.test(u);
    });
    var otherExternals = externals.filter(function (u) {
      return !/^https?:\/\/fonts\.(googleapis|gstatic)\.com\//i.test(u);
    });
    if (gfontUrls.length) {
      var gfUniq = Array.from(new Set(gfontUrls)).slice(0, 6);
      pushItem(report, 'warn', '&#127912;', gfontUrls.length + ' Google Fonts reference' + (gfontUrls.length === 1 ? '' : 's'),
        'This file loads fonts from Google at runtime. Offline users will see a system fallback font instead of the one you picked.<br>URLs: ' +
        gfUniq.map(function (u) { return '<code>' + escHtml(u) + '</code>'; }).join(', ') +
        '<br><button class="scan-action scan-action-primary" data-scan-action="embed-gfonts">&#11015; Download &amp; embed fonts</button>' +
        '<span class="scan-action-note"> One tap: grabs the font files, inlines them as base64 data URLs, rewrites the file. Works fully offline after.</span>');
    }
    if (otherExternals.length) {
      var uniq = Array.from(new Set(otherExternals)).slice(0, 5);
      pushItem(report, 'warn', '&#127760;', otherExternals.length + ' external URL reference' + (otherExternals.length === 1 ? '' : 's'),
        'This file pulls resources from the internet at runtime. If you open Load offline, these will fail silently.<br>Examples: ' +
        uniq.map(function (u) { return '<code>' + escHtml(u) + '</code>'; }).join(', ') +
        '<br><strong>Fix:</strong> download those files into the bundle before importing, or switch to a fully self-contained version.');
    }
  }
  function scanManifest(app, report) {
    var html = app.html || '';
    // Inline <script type="application/manifest+json"> or embedded JSON
    // blob. Load can only validate what's in the inlined HTML since the
    // zip has already been flattened.
    var manifestMatch = /<script[^>]*application\/manifest\+json[^>]*>([\s\S]*?)<\/script>/i.exec(html);
    var manifest = null;
    if (manifestMatch) {
      try { manifest = JSON.parse(manifestMatch[1]); } catch (e) {}
    }
    if (!manifest && app.kind === 'zip') {
      pushItem(report, 'info', '&#128196;', 'No PWA manifest detected',
        'This bundle has no inline PWA manifest. Load still runs it as an offline HTML app, but iPad will not treat it as a separate PWA if re-saved. (Optional.)');
      return;
    }
    if (!manifest) return; // nothing to check
    var required = ['name', 'start_url', 'display', 'icons'];
    var missing = required.filter(function (k) { return !manifest[k]; });
    if (missing.length) {
      pushItem(report, 'warn', '&#9888;', 'Manifest missing fields',
        'Your PWA manifest is missing: <code>' + missing.join('</code>, <code>') + '</code>. Load can still render the app; the missing fields just mean iPad won\'t give it a proper home-screen icon/title. Auto-fix fills each one with a reasonable default.',
        function (h) {
          var cur = h || html;
          var mm = /<script[^>]*application\/manifest\+json[^>]*>([\s\S]*?)<\/script>/i.exec(cur);
          if (!mm) return cur;
          var parsed;
          try { parsed = JSON.parse(mm[1]); } catch (e) { return cur; }
          if (!parsed.name) parsed.name = (app.name || 'Untitled');
          if (!parsed.start_url) parsed.start_url = './';
          if (!parsed.display) parsed.display = 'standalone';
          if (!parsed.icons) parsed.icons = [{ src: 'icon.png', sizes: '192x192', type: 'image/png' }];
          var nextJson = JSON.stringify(parsed, null, 2);
          return cur.replace(mm[0], mm[0].split(mm[1]).join('\n' + nextJson + '\n'));
        });
    } else {
      pushItem(report, 'ok', '&#10003;', 'PWA manifest looks complete', 'name, start_url, display, icons all present.');
    }
  }
  function scanLocalRunnerCompat(html, report) {
    // Local runners (opening index.html from the filesystem) fail on:
    //   - Service worker registrations (need HTTPS origin)
    //   - Absolute "/foo" paths
    //   - ES module scripts without a proper MIME server
    var issues = [];
    if (/navigator\.serviceWorker\.register/.test(html)) {
      issues.push({
        severity: 'info', icon: '&#128260;',
        label: 'Service worker registration found',
        detail: 'Service workers require an http(s) origin. Load inlines the app\'s files and runs it from a blob URL, so the service worker will silently fail to register. This is fine &mdash; Load is your offline layer now.'
      });
    }
    var absPathMatches = html.match(/\b(?:src|href)\s*=\s*["']\/[^\/"'][^"']*["']/gi) || [];
    if (absPathMatches.length) {
      pushItem(report, 'warn', '&#9888;', 'Absolute-path references detected',
        absPathMatches.length + ' reference' + (absPathMatches.length === 1 ? '' : 's') + ' start with <code>/</code>. Fine on a real server, but when run from a local PWA runner there is no "site root" &mdash; they resolve to nothing.<br><strong>Fix:</strong> switch to relative paths (remove the leading slash) before importing.',
        function (h) {
          return (h || html).replace(/(\b(?:src|href)\s*=\s*["'])\/(?!\/)/gi, '$1./');
        });
    }
    issues.forEach(function (i) { pushItem(report, i.severity, i.icon, i.label, i.detail); });
    // Root-structure expected by local PWA runners.
    if (currentApp && currentApp.kind === 'zip') {
      pushItem(report, 'info', '&#128193;',
        'Expected PWA root structure',
        'For maximum local-runner compatibility, your zip should have: <code>index.html</code>, <code>manifest.json</code>, <code>service-worker.js</code>, <code>app.js</code>, <code>styles.css</code>, <code>content.json</code>, <code>assets/</code>, <code>icons/</code>. Load does not require this layout &mdash; it inlines everything &mdash; but other PWA runners do.');
    }
  }
  function scanCapturedErrors(report) {
    var errors = consoleEntries.filter(function (e) { return e.level === 'error'; });
    if (!errors.length) {
      pushItem(report, 'ok', '&#10003;', 'No JavaScript errors captured',
        'No <code>console.error</code> / uncaught exceptions since this app was opened.');
      return;
    }
    var shown = errors.slice(-5).map(function (e) {
      return '<li><code>' + escHtml(e.msg.slice(0, 240)) + '</code></li>';
    }).join('');
    pushItem(report, 'error', '&#10060;',
      errors.length + ' JavaScript error' + (errors.length === 1 ? '' : 's') + ' captured',
      'The loaded app logged errors while running. Most recent:<ul>' + shown + '</ul>' +
      '<strong>Tip:</strong> switch to the Log tab to see every entry plus stack traces.');
  }
  function scanIframeRender(report) {
    try {
      var frame = $('viewer-frame');
      if (!frame || !frame.contentDocument) {
        pushItem(report, 'warn', '&#9888;', 'Viewer frame not available',
          'The iframe isn\'t accessible right now — probably because you opened the console before the app finished loading. Tap Reload in the viewer and scan again.');
        return;
      }
      var body = frame.contentDocument.body;
      if (!body) {
        pushItem(report, 'error', '&#10060;', 'Rendered page has no body',
          'The iframe loaded but there is no <code>&lt;body&gt;</code> in the rendered DOM. Check the Log tab for a parse error.');
        return;
      }
      var visibleText = (body.innerText || '').trim();
      if (visibleText.length < 3) {
        pushItem(report, 'warn', '&#9888;', 'Render looks blank',
          'The page loaded but shows almost no text. Possible causes: (1) a CSS rule is hiding content, (2) a script error stopped the page from building itself, (3) the source file was a fragment. Check the Log tab for errors.');
      } else {
        pushItem(report, 'ok', '&#10003;', 'Page is rendering text',
          Math.min(9999, visibleText.length) + ' chars of visible text in the rendered body.');
      }
    } catch (e) {
      pushItem(report, 'warn', '&#9888;', 'Could not inspect the rendered DOM',
        'Cross-origin or sandbox restrictions blocked the inspection: <code>' + escHtml(String(e.message || e)) + '</code>. This is usually safe to ignore.');
    }
  }
  // ---------- Google Fonts offline embed ----------
  // Fetches every fonts.googleapis.com stylesheet referenced by the
  // file, downloads each font file, base64-encodes it, and rewrites
  // the HTML so the fonts load from data URLs. After this the page
  // renders correctly with no network access required.
  async function runEmbedGoogleFonts() {
    if (!currentApp) { toast('Open an app first.', true); return; }
    var html = currentApp.html || '';
    var linkRe = /<link\s+[^>]*href=["'](https:\/\/fonts\.googleapis\.com\/[^"']+)["'][^>]*>/gi;
    var imports = [];
    var m;
    while ((m = linkRe.exec(html)) !== null) imports.push({ tag: m[0], url: m[1] });
    // Also catch @import url(...) in inline <style> blocks.
    var importInStyleRe = /@import\s+url\(\s*["']?(https:\/\/fonts\.googleapis\.com\/[^"')]+)["']?\s*\)\s*;?/gi;
    while ((m = importInStyleRe.exec(html)) !== null) imports.push({ tag: m[0], url: m[1] });
    if (!imports.length) { toast('No Google Fonts references found.'); return; }
    toast('Downloading ' + imports.length + ' Google Fonts stylesheet' + (imports.length === 1 ? '' : 's') + '…');
    // Fetch each CSS. Google Fonts returns woff2 URLs when the caller's
    // User-Agent is a modern browser — iPad Safari qualifies.
    var combinedCss = '';
    for (var i = 0; i < imports.length; i++) {
      try {
        var resp = await fetch(imports[i].url);
        if (!resp.ok) continue;
        var css = await resp.text();
        combinedCss += '/* from ' + imports[i].url + ' */\n' + css + '\n\n';
      } catch (e) {
        console.warn('Failed fetching ' + imports[i].url, e);
      }
    }
    if (!combinedCss) { toast('Could not download any Google Fonts stylesheets. Are you offline?', true); return; }
    // Extract the font-file URLs from the returned CSS and fetch each
    // one. fonts.gstatic.com serves Access-Control-Allow-Origin: *.
    var fontUrlRe = /url\(\s*['"]?(https?:\/\/fonts\.gstatic\.com\/[^'")\s]+)['"]?\s*\)/gi;
    var fontUrls = [];
    var seen = {};
    while ((m = fontUrlRe.exec(combinedCss)) !== null) {
      if (!seen[m[1]]) { seen[m[1]] = true; fontUrls.push(m[1]); }
    }
    if (!fontUrls.length) { toast('No font files found in the CSS — nothing to embed.', true); return; }
    toast('Embedding ' + fontUrls.length + ' font file' + (fontUrls.length === 1 ? '' : 's') + '… hold tight.');
    var urlMap = {};
    for (var j = 0; j < fontUrls.length; j++) {
      try {
        var fresp = await fetch(fontUrls[j]);
        if (!fresp.ok) continue;
        var blob = await fresp.blob();
        var dataUrl = await new Promise(function (resolve, reject) {
          var r = new FileReader();
          r.onloadend = function () { resolve(r.result); };
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
        urlMap[fontUrls[j]] = dataUrl;
      } catch (e) {
        console.warn('Failed fetching ' + fontUrls[j], e);
      }
    }
    // Rewrite CSS to use data URLs
    var rewrittenCss = combinedCss.replace(fontUrlRe, function (match, url) {
      return urlMap[url] ? 'url(' + urlMap[url] + ')' : match;
    });
    // Strip original <link> and @import references, inject one inline <style>
    var newHtml = html;
    imports.forEach(function (imp) { newHtml = newHtml.split(imp.tag).join(''); });
    var styleBlock = '\n<style data-embedded-fonts="1">\n/* Google Fonts — downloaded + embedded offline by Load */\n' + rewrittenCss + '\n</style>\n';
    if (/<\/head>/i.test(newHtml)) {
      newHtml = newHtml.replace(/<\/head>/i, styleBlock + '</head>');
    } else {
      newHtml = styleBlock + newHtml;
    }
    currentApp.html = newHtml;
    currentApp.sizeBytes = newHtml.length;
    try { await putApp(currentApp); } catch (e) { console.warn('putApp failed', e); }
    toast('✓ Fonts embedded. File now works fully offline.');
    // Re-scan to reflect the change
    try { runScanCurrentApp(); } catch (e) {}
  }

  // ---------- AI-powered full rewrite ----------
  // Sends the current file HTML + the current scan report to the user's
  // configured AI provider (Gemini / OpenRouter) with instructions to
  // return a corrected version of the HTML. The result is piped through
  // the same patch-preview UI so the user reviews before anything is
  // written to IndexedDB.
  async function runAiFixEverything() {
    if (!currentApp) { toast('Open an app first.', true); return; }
    if (typeof anyAiProviderConfigured !== 'function' || !anyAiProviderConfigured()) {
      toast('Set up a Gemini or OpenRouter key in Settings first.', true);
      return;
    }
    var html = currentApp.html || '';
    if (html.length > 60000) {
      toast('File is too big (' + humanBytes(html.length) + ') for a single AI pass. Try the individual fixes above instead.', true);
      return;
    }
    // Build the issues summary from the current scan. Fresh scan if
    // the user hasn't run one yet in this session.
    if (!currentScanReport) {
      try { runScanCurrentApp(); } catch (e) {}
    }
    var problems = currentScanReport ? currentScanReport.items
      .filter(function (i) { return i.severity !== 'ok'; })
      .map(function (i, idx) { return (idx + 1) + '. ' + i.label.replace(/<[^>]+>/g, '') + ' — ' + i.detail.replace(/<[^>]+>/g, '').slice(0, 300); })
      .join('\n') : '(no scan data)';
    var promptText =
      'You are fixing an HTML file for an offline-first PWA called Load. The user ran a scan that flagged these issues:\n\n' +
      problems + '\n\n' +
      'Return ONLY the corrected full HTML document, starting with <!DOCTYPE html> and ending with </html>. ' +
      'Do not explain, do not use markdown fences, do not include any text before or after the HTML. ' +
      'Preserve the original content and styling as much as possible — only change what you must to address the issues. ' +
      'For external resources (fonts, images, scripts) that break offline use, prefer removing the <link>/<script> tag over changing the URL. ' +
      'Do not inject analytics, tracking, or service-worker registration unless already present.\n\n' +
      'Here is the current HTML:\n\n' + html;
    toast('Asking AI to rewrite the file — this takes ~10–30 seconds…');
    try {
      var result = await askProviderChain(promptText, { kind: 'home' });
      if (!result || !result.answer) {
        toast('AI did not return a rewrite. Check ⚙ Settings for provider errors.', true);
        return;
      }
      // Strip HTML-ified markdown wrappers we might have rendered.
      var raw = String(result.answer)
        .replace(/<[^>]+>/g, function (m) { return m === '<br>' ? '\n' : ''; })
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      // Pull out the HTML document. Accept plain <!DOCTYPE…</html>, or
      // a fenced block if the model ignored our instructions.
      var docMatch = raw.match(/<!DOCTYPE[\s\S]*?<\/html>/i);
      if (!docMatch) {
        toast('AI response did not contain a full HTML document.', true);
        console.warn('AI fix raw:', raw);
        return;
      }
      var fixed = docMatch[0];
      if (Math.abs(fixed.length - html.length) > html.length * 0.8) {
        if (!confirm('AI rewrite is ' + (fixed.length > html.length ? 'much larger' : 'much smaller') + ' than the original (' + humanBytes(html.length) + ' → ' + humanBytes(fixed.length) + '). Apply anyway?')) return;
      }
      // Show a single-item patch preview so the user reviews before save.
      showPatchPreview([{
        label: 'AI full rewrite',
        detail: 'Complete file rewrite based on the scan report. Size ' + humanBytes(html.length) + ' → ' + humanBytes(fixed.length) + '.',
        fix: function () { return fixed; }
      }]);
    } catch (e) {
      console.warn('runAiFixEverything failed', e);
      toast('AI fix failed: ' + ((e && e.message) || e), true);
    }
  }

  async function runAutoFix() {
    if (!currentScanReport || !currentApp) {
      toast('Run a scan first — open an app, then tap Scan current page.', true);
      return;
    }
    var fixable = currentScanReport.items.filter(function (i) { return typeof i.fix === 'function'; });
    if (!fixable.length) {
      // Explain *why* there's nothing to fix so the user can tell the
      // difference between "clean scan" and "warnings that need manual
      // work". List the non-ok items as a scrollable helper bubble.
      var problems = currentScanReport.items.filter(function (i) { return i.severity !== 'ok'; });
      if (!problems.length) {
        toast('✓ Your file is clean — nothing to fix.');
      } else {
        var lines = problems.map(function (i) {
          return '• ' + i.label.replace(/<[^>]+>/g, '') + ' — needs your input';
        }).join('\n');
        alert('Auto-fix has no automated fixes for these ' + problems.length + ' issue' + (problems.length === 1 ? '' : 's') + ':\n\n' + lines + '\n\nOpen each in the scan list to see the detail and fix it manually.');
      }
      return;
    }
    // Preview step: show the user exactly what's about to change — the
    // list of fixes, size before/after, and a diff-ish snippet per fix.
    // Only apply when they explicitly confirm.
    showPatchPreview(fixable);
  }
  function showPatchPreview(fixable) {
    var html = currentApp.html || '';
    // Simulate each fix in sequence against a working copy so size
    // + changed-byte counts match exactly what "Apply" would produce.
    var working = html;
    var rows = fixable.map(function (item) {
      var before = working;
      var after;
      try { after = item.fix(working); } catch (e) { after = null; }
      if (typeof after !== 'string') after = before;
      var delta = after.length - before.length;
      // Build a compact snippet showing the first changed region.
      var snippet = diffSnippet(before, after);
      working = after;
      return {
        label: item.label,
        detail: item.detail.replace(/<[^>]+>/g, '').slice(0, 200),
        delta: delta,
        snippet: snippet
      };
    });
    var finalSize = working.length;
    var modal = $('patch-preview-modal');
    if (!modal) return applyPatchesDirect(fixable);   // fallback if modal missing
    var listEl = $('patch-preview-list');
    var metaEl = $('patch-preview-meta');
    metaEl.innerHTML = '<strong>' + fixable.length + '</strong> fix' + (fixable.length === 1 ? '' : 'es') +
      ' &middot; ' + humanBytes(html.length) + ' &rarr; ' + humanBytes(finalSize) +
      ' (' + (finalSize - html.length >= 0 ? '+' : '') + (finalSize - html.length) + ' bytes)';
    listEl.innerHTML = rows.map(function (r) {
      return '<div class="patch-row">' +
        '<div class="patch-label">' + r.label + '</div>' +
        '<div class="patch-detail">' + escHtml(r.detail) + '</div>' +
        (r.snippet
          ? '<div class="patch-diff"><div class="diff-before"><span>BEFORE</span><pre>' + escHtml(r.snippet.before) + '</pre></div>' +
            '<div class="diff-after"><span>AFTER</span><pre>' + escHtml(r.snippet.after) + '</pre></div></div>'
          : '<div class="patch-diff-none">No text diff to show (fix operates on structure).</div>') +
      '</div>';
    }).join('');
    modal.classList.add('on');
  }
  function diffSnippet(before, after) {
    if (before === after) return null;
    // Find the first character that differs, grab ~80 chars of context
    // on each side. Good enough for the common "insert a tag" patches.
    var len = Math.min(before.length, after.length);
    var i = 0;
    while (i < len && before[i] === after[i]) i++;
    var start = Math.max(0, i - 40);
    return {
      before: before.slice(start, i + 80).replace(/\s+/g, ' '),
      after:  after.slice(start, i + 120).replace(/\s+/g, ' ')
    };
  }
  async function applyPatchesDirect(fixable) {
    if (!fixable) fixable = currentScanReport.items.filter(function (i) { return typeof i.fix === 'function'; });
    var html = currentApp.html;
    var applied = 0;
    for (var i = 0; i < fixable.length; i++) {
      try { var next = fixable[i].fix(html); if (next && typeof next === 'string') { html = next; applied++; } }
      catch (e) { console.warn('fix failed', e); }
    }
    if (!applied) { toast('No fixes applied.'); return; }
    currentApp.html = html;
    try { await putApp(currentApp); } catch (e) {}
    try { openApp(currentApp); } catch (e) {}
    toast('✓ Applied ' + applied + ' fix' + (applied === 1 ? '' : 'es') + '. Re-scan to confirm.');
    setTimeout(runScanCurrentApp, 600);
  }
  function wirePatchPreview() {
    var modal = $('patch-preview-modal');
    if (!modal) return;
    var cancel = $('patch-preview-cancel');
    var apply = $('patch-preview-apply');
    if (cancel) cancel.addEventListener('click', function () { modal.classList.remove('on'); });
    if (apply) apply.addEventListener('click', async function () {
      modal.classList.remove('on');
      await applyPatchesDirect();
    });
  }
  function renderConsole() {
    var box = $('console-log');
    if (!box) return;
    box.innerHTML = consoleEntries.map(function (e) {
      return '<div class="console-entry ' + e.level + '">' +
        '<span class="tag">' + e.level + '</span>' +
        escHtml(e.msg) + '</div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }
  function addConsoleEntry(level, msg) {
    consoleEntries.push({ level: level, msg: msg, ts: Date.now() });
    if (consoleEntries.length > 500) consoleEntries.shift();
    renderConsole();
  }
  function runConsoleEval() {
    var input = $('console-eval');
    var expr = (input.value || '').trim();
    if (!expr) return;
    addConsoleEntry('log', '> ' + expr);
    try {
      var frame = $('viewer-frame');
      var win = frame && frame.contentWindow;
      if (!win) { addConsoleEntry('error', 'No app is currently open.'); return; }
      // Use the iframe's eval so the expression runs in the loaded app's
      // scope (can see the app's variables/functions).
      var result;
      try { result = win.eval(expr); }
      catch (err) { addConsoleEntry('error', String(err && err.stack || err)); input.value = ''; return; }
      var stringified;
      try { stringified = typeof result === 'string' ? result : JSON.stringify(result, null, 2); }
      catch (_) { stringified = String(result); }
      addConsoleEntry('info', stringified == null ? 'undefined' : stringified);
      input.value = '';
    } catch (e) {
      addConsoleEntry('error', String(e));
    }
  }
  /* Injected into every loaded iframe after load to forward console +
   * error events up to the parent Load page. */
  function installIframeConsoleBridge() {
    var frame = $('viewer-frame');
    if (!frame) return;
    try {
      var win = frame.contentWindow;
      var doc = frame.contentDocument;
      if (!win || !doc) return;
      ['log','info','warn','error'].forEach(function (level) {
        var original = win.console ? win.console[level] : null;
        if (!win.console) win.console = {};
        win.console[level] = function () {
          try {
            var parts = Array.prototype.slice.call(arguments).map(function (a) {
              if (a === null) return 'null';
              if (a === undefined) return 'undefined';
              if (typeof a === 'string') return a;
              try { return JSON.stringify(a); } catch (_) { return String(a); }
            });
            addConsoleEntry(level, parts.join(' '));
          } catch (e) {}
          if (typeof original === 'function') {
            try { original.apply(win.console, arguments); } catch (_) {}
          }
        };
      });
      win.onerror = function (msg, src, line, col, err) {
        var loc = src ? (' @ ' + src.replace(/^blob:[^\/]+\/\//, '')) : '';
        addConsoleEntry('error', String(msg) + loc + (line ? ' (line ' + line + ')' : ''));
        return false;
      };
      win.addEventListener('unhandledrejection', function (ev) {
        addConsoleEntry('error', 'Unhandled promise rejection: ' + (ev.reason && ev.reason.message || ev.reason));
      });
    } catch (e) {}
  }

  /* ---------- Install-as-app detection + UI ----------
   * iOS Safari sets navigator.standalone === true when a PWA was added
   * to the home screen and launched from there. We use that to hide the
   * 'install Load as app' banner when the user is already running Load
   * as an app, and to show a status pill in Settings. */
  function isStandalone() {
    try {
      return (navigator.standalone === true) ||
             (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    } catch (e) { return false; }
  }
  function updateInstallUi() {
    var installed = isStandalone();
    var banner = $('install-banner');
    if (banner) {
      var dismissed = false;
      try { dismissed = localStorage.getItem('load_install_dismissed') === '1'; } catch (e) {}
      banner.style.display = (installed || dismissed) ? 'none' : 'flex';
    }
    var status = $('install-status');
    if (status) {
      status.classList.remove('installed', 'not-installed');
      if (installed) {
        status.classList.add('installed');
        status.innerHTML = '&#10003; <strong>Load is installed as an app.</strong> You\'re running fullscreen from the home screen.';
      } else {
        status.classList.add('not-installed');
        status.innerHTML = '&#9432; You\'re viewing Load in Safari. Tap "Show install steps" below to turn it into a real iPad app.';
      }
    }
  }
  function wireInstallFlow() {
    var show = $('install-show-steps');
    if (show) show.addEventListener('click', function () { $('install-modal').classList.add('on'); });
    var dismiss = $('install-dismiss');
    if (dismiss) dismiss.addEventListener('click', function () {
      var banner = $('install-banner'); if (banner) banner.style.display = 'none';
      try { localStorage.setItem('load_install_dismissed', '1'); } catch (e) {}
    });
    var sb = $('settings-install-btn');
    if (sb) sb.addEventListener('click', function () { $('install-modal').classList.add('on'); });
    var close = $('install-modal-close');
    if (close) close.addEventListener('click', function () { $('install-modal').classList.remove('on'); });
  }

  /* ---------- Load AI — Copilot-style assistant ----------
   * Not real AI. No downloads. Instead: a curated knowledge base of
   * Load-usage answers (extracted from the Help FAQ) plus pattern
   * matching for "create a X" requests that hand off to the Create
   * screen pre-filled. Responses can include an action button that
   * navigates or prefills UI, same way Copilot Chat has "Insert" /
   * "Apply" buttons on its responses.
   */
  var LOAD_KB = [
    { id:'import', keywords:['import','upload','add file','bring in','where do files come from','file picker'],
      answer:'Tap <strong>Get Started</strong> on the Home screen. Pick which kind of file you have (HTML / PWA / PDF / Book / Media). The iPad file picker opens so you can choose from iCloud Drive, On My iPad, Dropbox, Google Drive, and more.',
      actionLabel:'Open Import', actionFn:function(){ show('import-screen'); } },
    { id:'pwa-import', keywords:['pwa','web app','zip','folder','multi-file','bundle'],
      answer:'For a multi-file web app, either <strong>zip the folder first</strong> in Files (long-press &rarr; Compress) and import that zip, OR tap Select in Files, check every file, and import the whole selection.',
      actionLabel:'Open Import', actionFn:function(){ show('import-screen'); } },
    { id:'home-screen', keywords:['home screen','install','icon','add to home','make it an app','standalone'],
      answer:'In Safari, tap the <strong>Share</strong> icon &rarr; <strong>Add to Home Screen</strong> &rarr; <strong>Add</strong>. Load will then open like a native app, fully offline.',
      actionLabel:null, actionFn:null },
    { id:'per-app-home', keywords:['icon for book','icon for app','home screen this','home screen item'],
      answer:'In the Library, tap the <strong>&hellip;</strong> on any tile &rarr; <strong>Add to Home Screen</strong>. Follow the three steps shown. Each item gets its own iPad icon that opens Load directly into it.',
      actionLabel:'Open Library', actionFn:function(){ show('library-screen'); renderLibrary(); } },
    { id:'tts', keywords:['read aloud','speak','voice','audio','tts','hear it','listen'],
      answer:'Open any item in the viewer. Tap the <strong>&#128266; speaker icon</strong> in the top bar. Pick <strong>Play</strong>. For smoother voices, go to iPad <strong>Settings &rarr; Accessibility &rarr; Spoken Content &rarr; Voices</strong> and download any &#9733; enhanced voice.',
      actionLabel:'Open Audio Settings', actionFn:function(){ openAudioSettings(); } },
    { id:'notes', keywords:['notes','take note','write note','jot','pad'],
      answer:'For a <strong>free-form note</strong>, tap the <strong>&#128221;</strong> icon in the top bar &rarr; <strong>+ New Note</strong>. For a note <strong>attached to an item</strong>, open that item and tap the notes icon in the viewer.',
      actionLabel:'Open Notes', actionFn:function(){ openNotesScreen(); } },
    { id:'bookmarks', keywords:['bookmark','save place','chapter','remember spot','page'],
      answer:'In the viewer, tap the <strong>&#9733; star</strong> in the top bar, scroll to the spot you want, then tap <strong>+ Add bookmark here</strong> and give it a name like "Chapter 3" or "Page 48". Tap Jump on any saved bookmark to return.',
      actionLabel:null, actionFn:null },
    { id:'resume', keywords:['resume','continue','where i left off','pick up','last place'],
      answer:'Load auto-saves your scroll position every 1.5 seconds. Just reopen the item &mdash; you land where you left off. On the Home screen, a green <strong>Continue: &lt;name&gt;</strong> button shows your most recent reading.',
      actionLabel:'Go Home', actionFn:function(){ show('home-screen'); } },
    { id:'reading-aids', keywords:['dyslexia','font','bigger','smaller','spacing','overlay','bionic','focus','color','theme'],
      answer:'In the viewer, tap <strong>Aa</strong>. You can change font size, line spacing, letter spacing, color overlay (cream / yellow / soft blue), switch to OpenDyslexic font, turn on <strong>Bionic reading</strong> (bolds the first part of each word), or show a <strong>focus line</strong> ruler.',
      actionLabel:null, actionFn:null },
    { id:'theme', keywords:['dark mode','light mode','sepia','cream','theme','high contrast'],
      answer:'Tap the <strong>&#9681;</strong> icon in any top bar to cycle themes: Dark &rarr; Cream &rarr; Sepia &rarr; Soft Blue &rarr; High Contrast &rarr; back. Or go to Settings and pick explicitly.',
      actionLabel:'Open Settings', actionFn:function(){ openSettingsPanel(); } },
    { id:'font-size', keywords:['bigger text','larger text','text too small','zoom','enlarge'],
      answer:'Tap <strong>A+</strong> in the top bar to increase size, <strong>A&minus;</strong> to decrease. Applies app-wide. For fine-tuning inside a specific app, open it and use the Aa reading-aids panel.',
      actionLabel:null, actionFn:null },
    { id:'settings', keywords:['settings','preferences','config','where is settings'],
      answer:'Tap the <strong>&#9881; gear</strong> icon (far right of the top bar on every screen). Panel slides in from the right with font, theme, spacing, audio, folders, and backup controls.',
      actionLabel:'Open Settings', actionFn:function(){ openSettingsPanel(); } },
    { id:'share', keywords:['share','send','family','airdrop','email','text','message'],
      answer:'From the Library, tap the <strong>&hellip;</strong> on any tile &rarr; <strong>Share (Text, Email, AirDrop)</strong>. iPad\'s share sheet opens &mdash; pick AirDrop, Mail, Messages, or Save to Files. The exported file is a self-contained HTML anyone can open.',
      actionLabel:'Open Library', actionFn:function(){ show('library-screen'); renderLibrary(); } },
    { id:'create', keywords:['create','make','build','write','new page','new document','new file'],
      answer:'Tap <strong>Create New</strong> on the Home screen. Pick a template (Article / Note / Letter / Recipe / Checklist), type a title and content, then Save to Library or Save &amp; Share. No coding needed.',
      actionLabel:'Open Create', actionFn:function(){ show('create-screen'); } },
    { id:'folders', keywords:['folder','collection','group','organize','sort'],
      answer:'Open Settings &rarr; <strong>Folders</strong> section. Type a name and tap Add. In the Library, tap the <strong>&hellip;</strong> on a tile &rarr; <strong>Move to folder...</strong>. Filter chips above the grid let you see just one folder at a time.',
      actionLabel:'Open Settings', actionFn:function(){ openSettingsPanel(); } },
    { id:'search', keywords:['search','find','look for'],
      answer:'In the Library, tap the <strong>&#128269;</strong> magnifying-glass icon. Search matches by name and notes content.',
      actionLabel:'Open Library', actionFn:function(){ show('library-screen'); renderLibrary(); } },
    { id:'backup', keywords:['backup','export','restore','save library','new ipad','transfer'],
      answer:'Open <strong>Settings &rarr; Library Backup</strong>. Tap <strong>Export library to file</strong> to save everything as one JSON file (iCloud Drive is a good spot). Tap <strong>Import library from file</strong> to restore later. Back up before iPad updates.',
      actionLabel:'Open Settings', actionFn:function(){ openSettingsPanel(); } },
    { id:'delete', keywords:['delete','remove','get rid','trash','erase'],
      answer:'In the Library, tap the <strong>&hellip;</strong> on a tile &rarr; <strong>&#128465; Delete</strong> (red at the bottom of the menu). The original file on your iPad is NOT touched &mdash; only Load\'s copy is removed.',
      actionLabel:'Open Library', actionFn:function(){ show('library-screen'); renderLibrary(); } },
    { id:'edit', keywords:['edit html','change','modify'],
      answer:'In the Library, tap the <strong>&hellip;</strong> on a tile &rarr; <strong>Edit HTML</strong>. A source editor opens so you can change the stored HTML. Save writes your changes to Load only; your original file isn\'t touched.',
      actionLabel:null, actionFn:null },
    { id:'offline', keywords:['offline','no internet','airplane mode','without wifi'],
      answer:'Load is offline-first. After you open it in Safari once (or add it to the Home Screen), everything runs locally. Test: turn on Airplane Mode, tap Load\'s icon &mdash; it opens and works normally.',
      actionLabel:null, actionFn:null },
    { id:'safe', keywords:['privacy','safe','secure','tracking','account','login','password'],
      answer:'Nothing you do in Load ever leaves your iPad. No account. No login. No analytics. No tracking. All files, notes, and bookmarks are stored in Safari\'s private storage for this app only.',
      actionLabel:null, actionFn:null },
    { id:'kindle', keywords:['kindle','azw','mobi','kfx','amazon'],
      answer:'Kindle files are DRM-locked by Amazon and can\'t be opened by Load (or any other third-party app). On a computer (not iPad), install the free <strong>Calibre</strong> tool, convert your Kindle file to EPUB, then import the EPUB into Load.',
      actionLabel:null, actionFn:null },
    { id:'media', keywords:['video','audio','mp3','mp4','image','photo','picture'],
      answer:'Tap Get Started &rarr; the orange <strong>Media</strong> card. Works with MP4/MOV/WebM video, MP3/M4A/WAV audio, JPG/PNG/GIF/WebP/HEIC images.',
      actionLabel:'Open Import', actionFn:function(){ show('import-screen'); } },
    { id:'help', keywords:['help','how to','confused','lost','stuck','what does'],
      answer:'Tap the <strong>?</strong> icon in the top bar for the full Help window with 30+ plain-language answers. Or keep asking me here &mdash; I\'ll search the same info faster.',
      actionLabel:'Open Help', actionFn:function(){ openHelp(); } },

    /* Developer topics — for disabled / dyslexic developers who use Load
     * as a build environment. Everything is plain-language, focused on
     * what Load itself supports. */
    { id:'dev-console', keywords:['console','log','error','debug','inspect','devtools'],
      answer:'Open any item in the viewer. Tap the <strong>&#128187; laptop icon</strong> in the top bar. A console drawer slides up showing everything the loaded app prints (console.log, warn, error) plus any JavaScript errors. You can also type one-line expressions to run in the app\'s context.',
      actionLabel:null, actionFn:null },
    { id:'dev-edit', keywords:['edit source','edit code','change html','modify html','code editor'],
      answer:'In the Library, tap the <strong>&hellip;</strong> on any tile &rarr; <strong>&#9998; Edit HTML</strong>. A full-screen source editor opens with the stored HTML. Change anything, tap Save &mdash; your changes stick to Load only. Tap Reload in the viewer to run the new version.',
      actionLabel:null, actionFn:null },
    { id:'dev-css', keywords:['center','css','style','color','background','class','selector','flex'],
      answer:'Centering in CSS (copy-paste examples): <br><code>display: flex; align-items: center; justify-content: center;</code> inside a parent centers child horizontally + vertically. <br>For text: <code>text-align: center;</code>. <br>For a single item in a block: <code>margin: 0 auto;</code> (works with a set width).',
      actionLabel:null, actionFn:null },
    { id:'dev-div', keywords:['div','what is div','what is html','tag','element'],
      answer:'A <code>&lt;div&gt;</code> is an HTML box with no meaning — it groups other elements so you can style or position them. Use <code>&lt;section&gt;</code>, <code>&lt;article&gt;</code>, <code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code> for meaningful groups; <code>&lt;div&gt;</code> only when nothing more specific fits.',
      actionLabel:null, actionFn:null },
    { id:'dev-button', keywords:['button','make button','submit','click'],
      answer:'Basic button: <code>&lt;button onclick="alert(\'hi\')"&gt;Click me&lt;/button&gt;</code>. Styled: add <code>class="primary"</code> and CSS. For a link that looks like a button: <code>&lt;a class="primary-btn" href="..."&gt;Label&lt;/a&gt;</code>.',
      actionLabel:null, actionFn:null },
    { id:'dev-link', keywords:['link','anchor','hyperlink','href','open in new tab'],
      answer:'Link: <code>&lt;a href="https://example.com"&gt;Text&lt;/a&gt;</code>. Open in new tab: add <code>target="_blank" rel="noopener"</code>. For a link that calls JavaScript: use a <code>&lt;button&gt;</code> instead of <code>&lt;a&gt;</code>.',
      actionLabel:null, actionFn:null },
    { id:'dev-image', keywords:['image','img','photo','picture','show image'],
      answer:'Basic image: <code>&lt;img src="cat.jpg" alt="a cat"&gt;</code>. The <code>alt</code> text is for screen readers &mdash; always include it. Responsive: add <code>style="max-width:100%;height:auto;"</code> so it never overflows.',
      actionLabel:null, actionFn:null },
    { id:'dev-form', keywords:['form','input','submit','text field'],
      answer:'Minimal form: <pre><code>&lt;form onsubmit="event.preventDefault(); handle(this);"&gt;\n  &lt;label&gt;Name &lt;input name="n"&gt;&lt;/label&gt;\n  &lt;button&gt;Submit&lt;/button&gt;\n&lt;/form&gt;</code></pre>Every input should have a <code>&lt;label&gt;</code> for screen readers.',
      actionLabel:null, actionFn:null },
    { id:'dev-js-basics', keywords:['javascript','js','variable','function','if','loop'],
      answer:'Basics: <br>Variable: <code>let x = 5;</code> or <code>const x = 5;</code> (const = can\'t change). <br>Function: <code>function say(name) { console.log("Hi " + name); }</code>. <br>If: <code>if (x &gt; 3) { ... } else { ... }</code>. <br>Use the Developer Console drawer to try small expressions.',
      actionLabel:null, actionFn:null },
    { id:'dev-dom', keywords:['getelementbyid','queryselector','dom','find element','change text'],
      answer:'Get an element: <code>document.getElementById("hello")</code> or <code>document.querySelector(".myclass")</code>. Change its text: <code>el.textContent = "Hi";</code>. Change a style: <code>el.style.color = "red";</code>. Add a class: <code>el.classList.add("active");</code>.',
      actionLabel:null, actionFn:null },
    { id:'dev-accessibility', keywords:['accessibility','a11y','screen reader','aria','tab order'],
      answer:'Accessibility basics: (1) Always use labels — <code>&lt;label&gt;</code> around inputs, <code>alt="..."</code> on images. (2) Use buttons for actions, links for navigation. (3) Check contrast (Load\'s dark theme with white text is AAA). (4) Don\'t disable zoom. (5) Keyboard-test: press Tab to cycle through controls and see that focus is visible.',
      actionLabel:null, actionFn:null },
    { id:'dev-dyslexia-friendly-css', keywords:['dyslexia friendly css','readable','opendyslexic','atkinson'],
      answer:'Dyslexia-friendly CSS defaults: <code>font-family: "Atkinson Hyperlegible", sans-serif;</code><br><code>font-size: 17px;</code><br><code>line-height: 1.75;</code><br><code>letter-spacing: 0.02em;</code><br><code>word-spacing: 0.1em;</code><br>Avoid italic; use bold for emphasis. Avoid justified text (use <code>text-align: left;</code>).',
      actionLabel:null, actionFn:null },
    { id:'dev-test-workflow', keywords:['test my app','try my app','workflow','iterate','reload'],
      answer:'Load is a small iPad dev environment: <br>(1) Use <strong>Create New</strong> or edit an imported file via <strong>Edit HTML</strong>. <br>(2) Save. <br>(3) Open it in the viewer. <br>(4) Tap the <strong>&#128187; console</strong> icon to watch logs/errors. <br>(5) Make a change, tap Reload. <br>Full rebuild cycle in 30 seconds, no computer needed.',
      actionLabel:null, actionFn:null },
    { id:'dev-when-need-mac', keywords:['web inspector','mac','safari inspector','breakpoints','full devtools'],
      answer:'Load\'s built-in Developer Console handles logs, errors, and one-liner evaluation. For <strong>breakpoints</strong>, <strong>network inspection</strong>, <strong>CSS live-editing</strong>, or <strong>DOM inspector</strong>, you need Safari Web Inspector: plug your iPad into a Mac via USB, open Safari on the Mac &rarr; Develop &rarr; [your iPad] &rarr; Load. It\'s free.',
      actionLabel:null, actionFn:null },

    /* ============ Troubleshooting ============ */
    { id:'trouble-slow', keywords:['slow','lag','laggy','freezing','hang','sluggish'],
      answer:'First-visit is always a bit slow — Load downloads 2 MB of fonts + PDF/EPUB libraries. After that it\'s instant. If it stays slow: pull down in Safari to refresh, or force-close Safari from the iPad app switcher and reopen Load.',
      actionLabel:null, actionFn:null },
    { id:'trouble-stuck', keywords:['stuck','frozen','not responding','won\'t move'],
      answer:'Try: (1) pull down to refresh Safari, (2) close Load from the iPad app switcher and reopen, (3) restart your iPad. Your imported files and notes always stay safe through these steps.',
      actionLabel:null, actionFn:null },
    { id:'trouble-blank', keywords:['blank','white screen','empty','nothing happens','crashed'],
      answer:'If Load opens to a blank screen: pull down to refresh. If still blank, go to iPad <strong>Settings &rarr; Safari &rarr; Advanced &rarr; Website Data</strong>, swipe left on Load\'s entry, Delete, then reopen Load. (Your imported files will be gone after this — back up first if you can.)',
      actionLabel:null, actionFn:null },
    { id:'trouble-no-image', keywords:['image not loading','picture missing','broken image','no photo'],
      answer:'A broken image icon means the file it points to can\'t be found. In an imported app: open Edit HTML and check that the <code>src="..."</code> path is correct. In your own Create content: URLs to external images only work online; save images to your iPad and import them via the Media card for offline use.',
      actionLabel:null, actionFn:null },
    { id:'trouble-no-video', keywords:['video won\'t play','video not playing','black video','media error'],
      answer:'iPad Safari supports MP4 / MOV / WebM natively. If a video won\'t play: (1) confirm the file plays in the Files app, (2) check the file isn\'t oversized (Safari may struggle above 500 MB), (3) try tapping the fullscreen icon inside the video controls.',
      actionLabel:null, actionFn:null },
    { id:'trouble-no-audio', keywords:['can\'t hear','no sound','silent','mute','audio not working','tts silent'],
      answer:'Check: (1) iPad is not muted (side switch or volume), (2) the volume slider on the TTS drawer or video is up, (3) for TTS, try a different voice in Settings &rarr; Read Aloud, (4) confirm your iPad has at least one Spoken Content voice installed.',
      actionLabel:null, actionFn:null },
    { id:'trouble-upload', keywords:['upload failed','import failed','import error','couldn\'t import'],
      answer:'Common reasons: (1) the file is a format Load doesn\'t support (Kindle AZW is DRM-locked), (2) the file is corrupted, (3) you ran out of iPad storage. Try a small HTML file first to confirm imports work, then retry the failing file.',
      actionLabel:null, actionFn:null },
    { id:'trouble-storage-full', keywords:['out of space','storage full','low storage','no space left'],
      answer:'Each imported file is copied into Load to work offline, so big PDFs and EPUBs eat space. Free space by: Library &rarr; tap 🗑 Delete on items you don\'t need anymore. Export a backup first if you want to keep them for later.',
      actionLabel:null, actionFn:null },

    /* ============ Privacy & security ============ */
    { id:'is-free', keywords:['free','cost','price','pay','subscription','fee'],
      answer:'Yes. Load is 100% free. No subscription, no in-app purchases, no ads. You own your files. It runs entirely on your iPad.',
      actionLabel:null, actionFn:null },
    { id:'who-sees', keywords:['who sees','can others see','visible','private'],
      answer:'Only you. Nothing in Load is sent to any server. There is no account, no cloud sync, no sharing unless you explicitly hit the Share button for one specific file.',
      actionLabel:null, actionFn:null },
    { id:'cookies', keywords:['cookies','tracking','analytics','spy'],
      answer:'No tracking cookies, no analytics, no fingerprinting. Load uses IndexedDB and localStorage purely for your data, never to identify or track you.',
      actionLabel:null, actionFn:null },

    /* ============ Dyslexia-specific ============ */
    { id:'dys-letters-swap', keywords:['letters swap','letters flip','b and d','p and q','mixed up'],
      answer:'Try turning on <strong>OpenDyslexic font</strong> (top bar &rarr; 🌈 rainbow icon, or Settings &rarr; Font). Its weighted bottoms make b/d and p/q easier to distinguish. Also bump <strong>letter spacing</strong> up one notch in Settings.',
      actionLabel:'Open Settings', actionFn:function(){ openSettingsPanel(); } },
    { id:'dys-crowding', keywords:['crowded text','cramped','lines too close','squishy','squashed'],
      answer:'Increase <strong>line spacing</strong> in Settings (or in the viewer Aa panel). Also try a soft-color theme (Cream or Soft Blue) &mdash; reducing glare helps reading stamina.',
      actionLabel:'Open Settings', actionFn:function(){ openSettingsPanel(); } },
    { id:'dys-ruler', keywords:['ruler','focus line','follow line','losing my place','lose place'],
      answer:'In the viewer, tap <strong>Aa &rarr; Focus line</strong> toggle. A horizontal highlighted band stays on your screen. Move your eyes to keep text inside the band.',
      actionLabel:null, actionFn:null },
    { id:'dys-bionic', keywords:['bionic','bold start','first letters','skim'],
      answer:'Bionic Reading bolds the first ~40% of each word to help your eyes latch on. Turn it on in the viewer Aa panel. Many dyslexic readers read faster with it on.',
      actionLabel:null, actionFn:null },
    { id:'dys-tired', keywords:['reading tiring','eye strain','hard to focus','can\'t concentrate'],
      answer:'Try this combo: Cream theme + bigger font (A+) + more line spacing + Read Aloud on at 1x while you follow along visually. Multi-sensory input is proven to reduce dyslexia reading fatigue.',
      actionLabel:null, actionFn:null },

    /* ============ Accessibility beyond dyslexia ============ */
    { id:'a11y-low-vision', keywords:['low vision','blurry','vision','see better'],
      answer:'Combine several: (1) Settings &rarr; A+ repeatedly for base font, (2) Theme &rarr; High Contrast (yellow on black, maximum contrast), (3) pinch-zoom still works in any viewer. For videos and images, the iframe respects iPad\'s system zoom.',
      actionLabel:'Open Settings', actionFn:function(){ openSettingsPanel(); } },
    { id:'a11y-voiceover', keywords:['voiceover','screen reader','blind','vision impaired'],
      answer:'Load\'s topbar buttons, tiles, and menus have proper <code>aria-label</code> attributes so VoiceOver reads them correctly. Turn on VoiceOver in iPad <strong>Settings &rarr; Accessibility &rarr; VoiceOver</strong> (or triple-click the side button if you\'ve set that shortcut).',
      actionLabel:null, actionFn:null },
    { id:'a11y-color-blind', keywords:['color blind','colorblind','can\'t tell colors','colors same'],
      answer:'Load\'s violet accent on dark stays readable for all common types of color blindness. For maximum clarity, use the High Contrast theme (yellow on black). File-type colored boxes also have icons and labels so color isn\'t the only cue.',
      actionLabel:null, actionFn:null },

    /* ============ Sharing scenarios ============ */
    { id:'share-family-no-ipad', keywords:['family without ipad','android','windows','mac','pc'],
      answer:'The exported HTML works in any modern browser &mdash; Chrome, Firefox, Edge, Safari, Brave &mdash; on any OS. AirDrop for Apple devices, email or Dropbox for everyone else. Tell them to double-tap the file to open.',
      actionLabel:null, actionFn:null },
    { id:'share-opens-how', keywords:['how do they open','recipient','what do they do'],
      answer:'The recipient double-taps the HTML file. It opens in their default browser. To save it for offline, they tap Share (or File &rarr; Save As). On iPad they can tap Share &rarr; Add to Home Screen for a standalone icon.',
      actionLabel:null, actionFn:null },

    /* ============ Coding questions (expanded) ============ */
    { id:'dev-center-text', keywords:['center text','align text','text center','middle'],
      answer:'Center one line of text: <code>text-align: center;</code> on the parent. Center a whole block: <code>margin: 0 auto;</code> with a set <code>max-width</code>. Center everything in a box: <code>display: flex; align-items: center; justify-content: center;</code> on the parent.',
      actionLabel:null, actionFn:null },
    { id:'dev-color', keywords:['color','change color','text color','red','blue','green','colour'],
      answer:'Text color: <code>color: red;</code> or <code>color: #cc3f55;</code>. Background: <code>background: #f4eadc;</code>. Hex codes like <code>#rrggbb</code> give any color. For named colors: red, blue, green, goldenrod, tomato, coral, etc.',
      actionLabel:null, actionFn:null },
    { id:'dev-background', keywords:['background','background color','bg','behind'],
      answer:'Color background: <code>body { background: #1a1a2e; }</code>. Image background: <code>body { background: url("picture.jpg") center/cover no-repeat; }</code>. Gradient: <code>background: linear-gradient(135deg, red, orange);</code>.',
      actionLabel:null, actionFn:null },
    { id:'dev-responsive', keywords:['responsive','mobile','phone','different sizes','fit screen'],
      answer:'Add this inside <code>&lt;head&gt;</code>: <code>&lt;meta name="viewport" content="width=device-width,initial-scale=1"&gt;</code>. Then use <code>max-width</code> instead of fixed widths, and test with the iPad in portrait + landscape.',
      actionLabel:null, actionFn:null },
    { id:'dev-click', keywords:['click handler','onclick','button click','when tapped'],
      answer:'Inline: <code>&lt;button onclick="doSomething()"&gt;Go&lt;/button&gt;</code>. Separated: <code>document.querySelector("button").addEventListener("click", doSomething);</code>. Either works. The addEventListener form is cleaner for multiple handlers.',
      actionLabel:null, actionFn:null },
    { id:'dev-storage', keywords:['localstorage','save locally','persist','remember'],
      answer:'Save: <code>localStorage.setItem("key", "value")</code>. Load: <code>localStorage.getItem("key")</code> — returns null if not set. Works offline, stays between visits, ~5 MB limit. For bigger data use IndexedDB.',
      actionLabel:null, actionFn:null },
    { id:'dev-animation', keywords:['animation','animate','move','fade','transition'],
      answer:'Smooth change: <code>.box { transition: all 0.3s; } .box:hover { transform: scale(1.1); }</code>. Keyframes: <code>@keyframes bounce { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-10px);} } .ball { animation: bounce 1s infinite; }</code>.',
      actionLabel:null, actionFn:null },

    /* ============ App creation ideas ============ */
    { id:'ideas', keywords:['what should i make','app idea','what to build','examples','suggestions'],
      answer:'Some low-code wins: a family recipe book (Checklist template, one ingredient per line), a trip packing list, a letter to mail, a personal FAQ, a daily affirmation page, a study flashcard set, a shopping list. All doable in the Create screen in minutes.',
      actionLabel:'Open Create', actionFn:function(){ show('create-screen'); } },
    { id:'flashcards', keywords:['flashcards','flash cards','study cards','memorize'],
      answer:'For a simple offline flashcard deck: use the Article template, put one question per line followed by its answer. Or import an EPUB and use the built-in reader + bookmarks to mark cards. For a flip-style card deck, Edit HTML and I can walk you through the code.',
      actionLabel:null, actionFn:null },
    { id:'quiz', keywords:['quiz','test','exam','questions','multiple choice'],
      answer:'Simple quiz HTML: each question gets a <code>&lt;form&gt;</code> with radio buttons, a submit button, and a small script to count right answers. Ask me "make me a quiz about X" and I\'ll pre-fill the Create screen with a working template.',
      actionLabel:null, actionFn:null },
    { id:'timer', keywords:['timer','countdown','stopwatch','alarm'],
      answer:'Classic HTML timer pattern: a <code>&lt;div id="count"&gt;&lt;/div&gt;</code>, a Start button, and <code>setInterval()</code> in a script. I can generate a starter for you &mdash; ask "make me a countdown timer" and pick a duration.',
      actionLabel:null, actionFn:null },
    { id:'calculator', keywords:['calculator','math','add','multiply'],
      answer:'Simplest: two <code>&lt;input type="number"&gt;</code> fields + a button whose onclick does <code>document.getElementById("out").textContent = Number(a.value) + Number(b.value)</code>. For a full calculator, Edit HTML and ask the helper for a button-grid template.',
      actionLabel:null, actionFn:null },

    /* ============ Misc platform ============ */
    { id:'offline-forever', keywords:['work forever offline','always offline','no internet ever'],
      answer:'Yes. After first visit (or Add to Home Screen), Load needs zero internet forever. Everything is cached. You could delete your internet connection tomorrow and Load would still open tomorrow, and next year.',
      actionLabel:null, actionFn:null },
    { id:'multiple-devices', keywords:['other ipad','sync','two devices','multiple devices','another device'],
      answer:'Load stays on one device at a time &mdash; no cloud sync. To move your library: Settings &rarr; Library Backup &rarr; Export library to file &rarr; Save to iCloud Drive. On the other iPad, open Load &rarr; Settings &rarr; Library Backup &rarr; Import. Your notes, bookmarks, and files are restored.',
      actionLabel:'Open Settings', actionFn:function(){ openSettingsPanel(); } },
    { id:'print', keywords:['print','printer','physical copy','print out'],
      answer:'Open the item in the viewer. iPad Safari\'s Share sheet has <strong>Print</strong> as an option — tap the hide-ui button first to remove Load\'s topbar, then use the Share icon. Or export as HTML, open in Safari, and print from there.',
      actionLabel:null, actionFn:null },
    { id:'save-as-pdf', keywords:['save as pdf','convert to pdf','make pdf','export pdf'],
      answer:'iPad can save any web page as PDF: tap Safari\'s Share &rarr; scroll down &rarr; <strong>Save to Files</strong> &rarr; change format to PDF in the dropdown at top. Works for any Load viewer page too.',
      actionLabel:null, actionFn:null },

    /* ============ Editor-specific ============ */
    { id:'editor-bigger', keywords:['editor font','code too small','editor bigger','bigger code'],
      answer:'In the HTML editor, tap <strong>A+</strong> / <strong>A&minus;</strong> in the top bar. For a lighter background (easier on dyslexic readers), tap the <strong>&#9689; circle icon</strong> to switch to cream theme.',
      actionLabel:null, actionFn:null },
    { id:'editor-lost-changes', keywords:['lost changes','didn\'t save','undo','revert'],
      answer:'Load has no undo history once you tap Back. Always tap <strong>Save</strong> before leaving the editor. If you haven\'t saved: tap Back to library, tap the tile and Edit HTML again — your old content is still there.',
      actionLabel:null, actionFn:null }
  ];

  function wireHelper() {
    var panel = $('helper-panel');
    var scrim = $('helper-scrim');
    if (!panel) return;
    document.querySelectorAll('[data-tool="helper"]').forEach(function (b) {
      b.addEventListener('click', openHelperPanel);
    });
    $('helper-close').addEventListener('click', closeHelperPanel);
    $('helper-scrim').addEventListener('click', closeHelperPanel);
    $('helper-send').addEventListener('click', submitHelperQuestion);
    $('helper-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitHelperQuestion();
    });
    var newChatBtn = $('helper-newchat');
    if (newChatBtn) newChatBtn.addEventListener('click', resetHelperChat);
    document.querySelectorAll('[data-helper-ask]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.getAttribute('data-helper-ask');
        $('helper-input').value = q;
        submitHelperQuestion();
      });
    });
  }
  function applyCodeToEditor(code) {
    // Three scenarios:
    //   1. Editor is already open with a file — insert at the caret, or
    //      replace the textarea contents if the file is essentially
    //      empty (< 20 chars of non-whitespace).
    //   2. Viewer is open on an HTML file — prompt to open that file in
    //      the editor with the new code inserted at the top.
    //   3. Anywhere else — create a fresh scratch app and open the
    //      editor on it. Nothing is persisted until the user hits Save.
    var ta = document.getElementById('editor-textarea');
    var editorScreen = document.getElementById('editor-screen');
    var editorActive = editorScreen && editorScreen.classList.contains('on');
    if (editorActive && ta && editingApp) {
      var cur = ta.value || '';
      if (cur.trim().length < 20) {
        ta.value = code;
      } else {
        var start = (typeof ta.selectionStart === 'number') ? ta.selectionStart : cur.length;
        var end = (typeof ta.selectionEnd === 'number') ? ta.selectionEnd : cur.length;
        ta.value = cur.slice(0, start) + code + cur.slice(end);
        try { ta.selectionStart = ta.selectionEnd = start + code.length; } catch (_) {}
      }
      closeHelperPanel();
      setTimeout(function () { ta.focus(); }, 200);
      toast('✓ Code applied to editor');
      return;
    }
    // Open a scratch file in the editor. The object matches the shape
    // openEditor() and the editor-save handler expect; if the user
    // decides not to keep it, closing the screen is enough — nothing
    // has been written to IndexedDB yet.
    var when = new Date();
    var scratch = {
      id: 'scratch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      name: 'AI scratch — ' + when.toLocaleString(),
      kind: 'html',
      html: code,
      sizeBytes: code.length,
      dateAdded: Date.now()
    };
    try {
      openEditor(scratch);
      closeHelperPanel();
      toast('✓ Opened in editor — tap Save to keep it');
    } catch (e) {
      console.warn('applyCodeToEditor openEditor failed', e);
      copyToClipboard(code);
      toast('Couldn\'t open the editor automatically. Code copied instead.');
    }
  }
  function resetHelperChat() {
    // Wipe the conversation + re-capture context + re-show the welcome
    // bubble. Intentionally does NOT touch providerPrefs or any saved
    // state — just the visible chat history.
    var msgs = $('helper-messages');
    if (msgs) msgs.innerHTML = '';
    var quick = $('helper-quick'); if (quick) quick.classList.remove('hidden');
    helperContext = captureHelperContext();
    refreshHelperQuickChips();
    addHelperMessage('assistant', buildHelperWelcomeHtml(), null, BADGE_BUILTIN);
    if (helperContext.kind === 'viewer' && helperContext.app) {
      addHelperMessage('assistant',
        'I can see you\'re reading <strong>' + escHtml(helperContext.app.name) + '</strong>. Ask me to summarize it, find a word, outline it, or walk you through it step by step.');
    } else if (helperContext.kind === 'editor') {
      addHelperMessage('assistant',
        'You\'re in the HTML editor. Ask me for code snippets (buttons, links, centering text, colors), or how to use any Load feature.');
    }
    var input = $('helper-input'); if (input) { input.value = ''; input.focus(); }
  }
  /* ---- Context awareness ----
   * When the helper opens we grab whatever the user is currently
   * looking at so follow-up questions like "summarize this" or
   * "find the word Rome" can operate on that content. Refreshed
   * every time the panel opens so the context is always current. */
  var helperContext = { kind: 'home', app: null, text: '' };
  function captureHelperContext() {
    var ctx = { kind: 'home', app: null, text: '' };
    // Which screen is currently visible?
    var onScreen = function (id) {
      var el = document.getElementById(id);
      return el && el.classList.contains('on');
    };
    if (onScreen('viewer-screen')) {
      ctx.kind = 'viewer';
      ctx.app = currentApp;
      ctx.text = extractFrameText();
    } else if (onScreen('library-screen')) ctx.kind = 'library';
    else if (onScreen('import-screen')) ctx.kind = 'import';
    else if (onScreen('create-screen')) ctx.kind = 'create';
    else if (onScreen('editor-screen')) ctx.kind = 'editor';
    else if (onScreen('notes-screen')) ctx.kind = 'notes';
    return ctx;
  }
  function refreshHelperQuickChips() {
    // Swap the quick-reply chips to match the current context so
    // the user sees suggestions they can actually act on.
    var wrap = document.getElementById('helper-quick');
    if (!wrap) return;
    var ctx = helperContext;
    var chips = [];
    // When the running page has real JS errors, prepend a "Fix errors"
    // chip. One tap and the AI gets the errors + file source together.
    var hasErrors = consoleEntries.some(function (e) { return e.level === 'error'; });
    var fixErrorsChip = hasErrors
      ? { q: '🛠 Fix errors', ask: 'Look at the recent console errors and tell me exactly what\'s wrong and how to fix it. Show the corrected code.' }
      : null;
    if (ctx.kind === 'viewer' && ctx.app) {
      chips = [
        { q: '/explain', ask: '/explain' },
        { q: '/fix', ask: '/fix' },
        { q: '/optimize', ask: '/optimize' },
        { q: '/analyze', ask: '/analyze' },
        { q: 'Summarize this', ask: 'summarize this' },
        { q: 'Find a word', ask: 'find ' },
        { q: 'Outline', ask: 'outline this' },
        { q: 'Step by step', ask: 'walk me through this step by step' },
        { q: 'Ask ChatGPT', ask: 'open chatgpt with this' }
      ];
      if (fixErrorsChip) chips.unshift(fixErrorsChip);
    } else if (ctx.kind === 'editor') {
      chips = [
        { q: '/explain', ask: '/explain' },
        { q: '/fix', ask: '/fix' },
        { q: '/optimize', ask: '/optimize' },
        { q: '/analyze', ask: '/analyze' },
        { q: 'Center text', ask: 'how do I center text' },
        { q: 'Make a button', ask: 'how do I make a button' },
        { q: 'Change color', ask: 'how do I change the color' },
        { q: 'Add an image', ask: 'how do I add an image' },
        { q: 'Open console', ask: 'how do I see errors' }
      ];
      if (fixErrorsChip) chips.unshift(fixErrorsChip);
    } else if (ctx.kind === 'library') {
      chips = [
        { q: 'How do I search?', ask: 'how do I search' },
        { q: 'Organize with folders', ask: 'how do I make folders' },
        { q: 'Share a file', ask: 'how do I share' },
        { q: 'Back up library', ask: 'how do I back up my library' },
        { q: 'Add to Home Screen', ask: 'how do I add to home screen' }
      ];
    } else {
      chips = [
        { q: 'How do I import?', ask: 'how do I import files' },
        { q: 'Make a checklist', ask: 'make me a checklist' },
        { q: 'Add to home screen', ask: 'how do I save to my home screen' },
        { q: 'Read aloud', ask: 'how do I use read aloud' },
        { q: 'Create a page', ask: 'how do i create a new page' },
        { q: 'Share a file', ask: 'how do i share a file' },
        { q: 'Back up', ask: 'how do i back up my library' },
        { q: 'Developer console', ask: 'how do i see errors' }
      ];
    }
    wrap.innerHTML = chips.map(function (c) {
      return '<button class="helper-chip" data-helper-ask="' + escHtml(c.ask) + '">' + escHtml(c.q) + '</button>';
    }).join('');
    wrap.querySelectorAll('[data-helper-ask]').forEach(function (b) {
      b.addEventListener('click', function () {
        $('helper-input').value = b.getAttribute('data-helper-ask');
        submitHelperQuestion();
      });
    });
  }

  function buildHelperWelcomeHtml() {
    // One-bubble summary of what the helper can do, tuned to whether
    // the user has an AI key set up. Kept short and plain-language
    // so dyslexic users can scan it without losing the thread. The
    // data-welcome marker is detected by addHelperMessage so preamble
    // bubbles don't get a "Copy" button (user wants to copy answers,
    // not the help text).
    var hasAi = anyAiProviderConfigured();
    var lines = ['<span data-welcome="1" style="display:none"></span>'];
    if (hasAi) {
      lines.push('<strong>Ask me anything.</strong> Your question goes straight to the AI — real answers, not canned.');
    } else {
      lines.push('<strong>I\'m in offline mode.</strong> Add a free key in ⚙ Settings → Load AI (Gemini is fastest) to unlock real AI answers.');
    }
    lines.push('');
    lines.push('<strong>Quick commands</strong> (type the slash):');
    lines.push('• <code>/explain</code> — explain the open file');
    lines.push('• <code>/fix</code> — suggest fixes');
    lines.push('• <code>/optimize</code> — make it faster / cleaner');
    lines.push('• <code>/analyze</code> — deep code review');
    lines.push('• <code>/plan</code> — build a plan for a task');
    lines.push('');
    lines.push('<strong>I can see:</strong>');
    lines.push('• The page you\'re on');
    lines.push('• Any <strong>errors</strong> on that page (tap 🛠 Fix errors)');
    lines.push('• Any text you <strong>highlight</strong> — I\'ll focus on it');
    return lines.join('<br>');
  }
  function openHelperPanel() {
    helperContext = captureHelperContext();
    refreshHelperQuickChips();
    $('helper-panel').classList.add('on');
    $('helper-scrim').classList.add('on');
    // Re-show the intro and clear message history so every open is fresh
    var intro = $('helper-intro'); if (intro) intro.style.display = '';
    var quick = $('helper-quick'); if (quick) quick.classList.remove('hidden');
    $('helper-messages').innerHTML = '';
    // Welcome bubble first — explains what the helper can do *right now*
    // (AI-powered or offline) so users know what to expect.
    addHelperMessage('assistant', buildHelperWelcomeHtml(), null, BADGE_BUILTIN);
    // If there's content available, lead with a context note so the user
    // knows the helper is looking at the current item.
    if (helperContext.kind === 'viewer' && helperContext.app) {
      addHelperMessage('assistant',
        'I can see you\'re reading <strong>' + escHtml(helperContext.app.name) + '</strong>. Ask me to summarize it, find a word, outline it, or walk you through it step by step.');
    } else if (helperContext.kind === 'editor') {
      addHelperMessage('assistant',
        'You\'re in the HTML editor. Ask me for code snippets (buttons, links, centering text, colors), or how to use any Load feature.');
    }
    setTimeout(function () { $('helper-input').focus(); }, 120);
  }
  function closeHelperPanel() {
    $('helper-panel').classList.remove('on');
    $('helper-scrim').classList.remove('on');
  }
  function addHelperMessage(role, html, action, providerBadge) {
    // Hide the intro after the first message; quick chips fold away too
    var intro = $('helper-intro'); if (intro) intro.style.display = 'none';
    var quick = $('helper-quick'); if (quick) quick.classList.add('hidden');
    var msgs = $('helper-messages');
    var div = document.createElement('div');
    div.className = 'helper-msg ' + role;
    div.innerHTML = html;
    if (providerBadge && role === 'assistant') {
      var badge = document.createElement('span');
      badge.className = 'prov-badge ' + (providerBadge.tier || 'offline');
      badge.textContent = providerBadge.label;
      div.appendChild(document.createElement('br'));
      div.appendChild(badge);
    }
    if (action && action.label) {
      var btn = document.createElement('button');
      btn.className = 'helper-action';
      btn.innerHTML = '&#10148; ' + action.label;
      btn.addEventListener('click', function () {
        if (typeof action.fn === 'function') action.fn();
        closeHelperPanel();
      });
      div.appendChild(document.createElement('br'));
      div.appendChild(btn);
    }
    // Copy button on assistant bubbles — one-tap to paste the answer
    // into Notes, Messages, email, etc. Skipped on the welcome/context
    // preambles (they set role='assistant-meta' internally via the
    // opt-out flag on the data-welcome marker below).
    var isPreamble = /data-welcome="1"/.test(String(html));
    if (role === 'assistant' && !isPreamble && html && String(html).replace(/<[^>]+>/g, '').trim().length > 0) {
      var copyBtn = document.createElement('button');
      copyBtn.className = 'helper-action helper-copy';
      copyBtn.setAttribute('aria-label', 'Copy answer');
      copyBtn.innerHTML = '&#128203; Copy';
      copyBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        // Clone the bubble, strip the copy button + action buttons +
        // badge, then extract plain text to preserve line breaks.
        var clone = div.cloneNode(true);
        clone.querySelectorAll('.helper-action, .prov-badge').forEach(function (n) { n.remove(); });
        var txt = (clone.innerText || clone.textContent || '').trim();
        copyToClipboard(txt);
        var prev = copyBtn.innerHTML;
        copyBtn.innerHTML = '&#10003; Copied';
        setTimeout(function () { copyBtn.innerHTML = prev; }, 1400);
      });
      div.appendChild(document.createElement('br'));
      div.appendChild(copyBtn);
    }
    // Apply-to-editor button on assistant bubbles that contain code.
    // Preference order:
    //   1. A fenced ```code block``` (typical AI-generated answer) —
    //      apply exactly that.
    //   2. Inline <code>…</code> snippets (typical built-in rule-based
    //      answer) — apply the longest one, or join several if they're
    //      all substantial.
    if (role === 'assistant' && !isPreamble) {
      var applyCode = null;
      var fenceMatch = String(html).match(/<pre class="code-block">([\s\S]*?)<\/pre>/);
      if (fenceMatch) {
        var decoder1 = document.createElement('textarea');
        decoder1.innerHTML = fenceMatch[1];
        applyCode = decoder1.value;
      } else {
        var inlineMatches = String(html).match(/<code>([\s\S]*?)<\/code>/g) || [];
        if (inlineMatches.length) {
          var decoded = inlineMatches.map(function (m) {
            var inner = m.replace(/^<code>|<\/code>$/g, '');
            var d = document.createElement('textarea');
            d.innerHTML = inner;
            return d.value;
          }).filter(function (s) { return s && s.trim().length >= 3; });
          // Keep snippets that look like real markup/CSS/JS (contain <,
          // { or ; or multiple words). Drop tiny fragments like "for".
          var substantial = decoded.filter(function (s) {
            return /[<{};]/.test(s) || s.split(/\s+/).length >= 2;
          });
          if (substantial.length === 1) {
            applyCode = substantial[0];
          } else if (substantial.length > 1) {
            // Join multiple snippets with comment separators so the
            // user can tell them apart in the editor.
            applyCode = substantial.map(function (s, i) {
              return '<!-- snippet ' + (i + 1) + ' -->\n' + s;
            }).join('\n\n');
          }
        }
      }
      if (applyCode && applyCode.trim().length > 0) {
        var applyBtn = document.createElement('button');
        applyBtn.className = 'helper-action helper-apply';
        applyBtn.setAttribute('aria-label', 'Apply code to editor');
        applyBtn.innerHTML = '&#128221; Apply to editor';
        var codeToApply = applyCode;
        applyBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          applyCodeToEditor(codeToApply);
        });
        div.appendChild(document.createElement('br'));
        div.appendChild(applyBtn);
      }
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }
  /* Render a "Thinking…" placeholder that a provider call can replace. */
  function addThinkingMessage(providerLabel) {
    var msgs = $('helper-messages');
    var div = document.createElement('div');
    div.className = 'helper-msg assistant';
    div.innerHTML = '<span class="helper-thinking"><span>Asking ' + escHtml(providerLabel) + '</span><span class="dots"></span></span>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }
  function replaceMessage(div, html, providerBadge) {
    if (!div) return;
    div.innerHTML = html;
    if (providerBadge) {
      var badge = document.createElement('span');
      badge.className = 'prov-badge ' + (providerBadge.tier || 'offline');
      badge.textContent = providerBadge.label;
      div.appendChild(document.createElement('br'));
      div.appendChild(badge);
    }
  }
  var BADGE_BUILTIN = { tier: 'offline', label: 'via built-in (rule-based)' };
  function anyAiProviderConfigured() {
    // Local counts if installed+enabled+actually loaded. Cloud counts
    // whenever the user has saved a key and enabled the provider.
    // Pollinations counts as configured whenever it's enabled (no key
    // required) -- which means Load AI is always "configured" by
    // default since Pollinations ships enabled.
    if (providerPrefs.local.enabled && providerPrefs.local.installed && typeof window.__LOAD_LOCAL_AI === 'function') return true;
    if (providerPrefs.pollinations && providerPrefs.pollinations.enabled !== false) return true;
    return ['gemini', 'groq', 'openrouter', 'huggingface']
      .some(function (n) { return providerPrefs[n] && providerPrefs[n].enabled && providerPrefs[n].apiKey; });
  }
  function submitHelperQuestion() {
    var input = $('helper-input');
    if (!input) { try { alert('Load AI: input field missing. Reload the app.'); } catch (_) {} return; }
    var q = (input.value || '').trim();
    if (!q) return;
    input.value = '';
    // Give immediate visible feedback that the Send click fired. If any
    // of the downstream steps crash, we still surface the error in the
    // chat (or via alert as a last resort) instead of dying silently.
    try {
      addHelperMessage('user', escHtml(q));
    } catch (e) {
      try { alert('Load AI: couldn\'t render your message. ' + ((e && e.message) || String(e))); } catch (_) {}
      return;
    }
    try {
      submitHelperQuestionCore(q);
    } catch (e) {
      console.warn('submitHelperQuestion crashed', e);
      try {
        addHelperMessage('assistant',
          '<strong>Something went wrong.</strong> <code>' + escHtml((e && e.message) || String(e)) + '</code>. Try closing and reopening Load.',
          null,
          { tier: 'offline', label: 'helper error' }
        );
      } catch (ee) {
        try { alert('Load AI error: ' + ((e && e.message) || String(e))); } catch (_) {}
      }
    }
  }
  function submitHelperQuestionCore(q) {
    // Refresh context each turn so follow-ups work even if they opened
    // the panel on Home and then navigated
    helperContext = captureHelperContext();

    // 0. Copilot-style slash commands — operate on the current file's
    //    SOURCE (not just extracted text). /explain /fix /optimize
    //    /analyze /scan all work when an app is open in the viewer
    //    or the HTML editor. Fully offline, no API calls.
    if (/^\s*\//.test(q)) {
      var slashResponse = handleSlashCommand(q);
      if (slashResponse) {
        addHelperMessage('assistant', slashResponse.answer, slashResponse.action || null, BADGE_BUILTIN);
        return;
      }
    }

    // Offline builtin handlers — ONLY fire automatically when no AI
    // provider is available. When a real AI (Gemini / OpenRouter /
    // on-device) is configured, the user expects the AI to read the
    // full question instead of a keyword-matched canned response.
    var hasAi = anyAiProviderConfigured();
    if (!hasAi) {
      if (helperContext.kind === 'viewer' && helperContext.text) {
        var contentResponse = handleContentCommand(q, helperContext);
        if (contentResponse) {
          addHelperMessage('assistant', contentResponse.answer, contentResponse.action || null, BADGE_BUILTIN);
          return;
        }
      }
      var createMatch = matchCreateIntent(q);
      if (createMatch) {
        addHelperMessage('assistant',
          'I can set that up for you! I\'ll open the Create screen with the <strong>' + createMatch.template + '</strong> template' +
          (createMatch.topic ? ' and pre-fill the title as <strong>' + escHtml(createMatch.topic) + '</strong>.' : '.') +
          ' You just type the content and save.',
          { label: 'Open Create screen', fn: function () { openCreateWithHelper(createMatch); } },
          BADGE_BUILTIN
        );
        return;
      }
      var hit = scoreKnowledgeBase(q);
      if (hit) {
        addHelperMessage('assistant', hit.answer, hit.actionLabel ? { label: hit.actionLabel, fn: hit.actionFn } : null, BADGE_BUILTIN);
        return;
      }
    }

    // Route to the provider chain. When AI is up, it gets first
    // crack at every non-slash question. The offline handlers above
    // still serve as fallback if every provider fails.
    askProviderChain(q, helperContext).then(function (result) {
      if (result && result.answer) {
        addHelperMessage('assistant', result.answer, null, result.badge);
        return;
      }
      // AI chain came up empty — try the offline handlers once as a
      // last resort so the user at least gets *something* useful.
      if (hasAi) {
        if (helperContext.kind === 'viewer' && helperContext.text) {
          var cr = handleContentCommand(q, helperContext);
          if (cr) { addHelperMessage('assistant', cr.answer, cr.action || null, BADGE_BUILTIN); return; }
        }
        var cm = matchCreateIntent(q);
        if (cm) {
          addHelperMessage('assistant',
            'I can set that up for you! I\'ll open the Create screen with the <strong>' + cm.template + '</strong> template' +
            (cm.topic ? ' and pre-fill the title as <strong>' + escHtml(cm.topic) + '</strong>.' : '.') +
            ' You just type the content and save.',
            { label: 'Open Create screen', fn: function () { openCreateWithHelper(cm); } },
            BADGE_BUILTIN
          );
          return;
        }
        var kb = scoreKnowledgeBase(q);
        if (kb) {
          addHelperMessage('assistant', kb.answer, kb.actionLabel ? { label: kb.actionLabel, fn: kb.actionFn } : null, BADGE_BUILTIN);
          return;
        }
      }
      fallbackToOffline(q, helperContext);
    }).catch(function (err) {
      console.warn('Provider chain failed', err);
      addHelperMessage('assistant',
        '<strong>AI call failed.</strong> <code>' + escHtml((err && err.message) || String(err)) + '</code>. Falling back to offline helpers.',
        null,
        { tier: 'offline', label: 'provider error' }
      );
      fallbackToOffline(q, helperContext);
    });
    return;
  }
  function fallbackToOffline(q, helperContext) {
    // Figure out the honest reason nothing answered, so the user gets
    // an actionable message instead of the old lying "everyone is
    // rate-limited" blanket.
    var reason = diagnoseNoProvider();
    if (helperContext.kind === 'viewer' && helperContext.text) {
      addHelperMessage('assistant',
        reason.msg + ' I can copy the text + your question to the clipboard and open a public AI site instead.',
        { label: 'Send to ChatGPT', fn: function () { handoffToAi(q, helperContext.text, 'chatgpt'); } },
        { tier: 'offline', label: reason.label }
      );
    } else {
      addHelperMessage('assistant',
        reason.msg + ' Meanwhile I\'m still here for anything <strong>about using Load</strong> or <strong>creating content</strong> — those use the built-in helper and answer instantly.',
        null,
        { tier: 'offline', label: reason.label }
      );
    }
  }

  // Honest explanation of why askProviderChain returned nothing.
  // Returns { msg, label } — msg is HTML shown in the bubble, label is
  // the small badge under it.
  function diagnoseNoProvider() {
    var local = providerPrefs.local;
    var localLoading = !!localAiInitPromise;
    var localReady = typeof window.__LOAD_LOCAL_AI === 'function';
    var anyCloudKey = ['gemini', 'groq', 'openrouter', 'huggingface']
      .some(function (n) { return providerPrefs[n] && providerPrefs[n].enabled && providerPrefs[n].apiKey; });

    // Highest priority: real provider errors from the last attempt.
    // If Gemini/OpenRouter/etc. actually tried and threw, surface THOSE
    // — the local-model state is irrelevant when the user has a working
    // cloud key configured.
    var failures = Object.keys(providerLastError).map(function (n) {
      return '<li><strong>' + n + '</strong>: ' + escHtml(providerLastError[n]) + '</li>';
    }).join('');
    if (failures) {
      return {
        msg: 'The AI provider(s) I tried returned errors:<ul style="margin:6px 0 0 18px;padding:0;">' + failures + '</ul>' +
             '<p style="margin:10px 0 0;font-size:13px;">If this is a network timeout, wait a few seconds and try again. If the key is bad, replace it in ⚙ Settings → Load AI.</p>',
        label: 'provider error'
      };
    }

    // No provider attempted at all — figure out why.
    if (!local.installed && !anyCloudKey) {
      return {
        msg: 'No AI provider is set up yet. Open <strong>⚙ Settings → Load AI</strong> and either: <br>• Tap <strong>📥 Install local model (~400 MB)</strong> for a private offline AI, or<br>• Paste a free-tier key for Gemini / Groq / OpenRouter / Hugging Face.',
        label: 'no provider configured'
      };
    }
    // Cloud keys exist but none fired — could be the provider was disabled
    // or the available() check was skipped. Be honest.
    if (anyCloudKey) {
      return {
        msg: 'A cloud AI key is saved, but no provider was tried for this question. Open <strong>⚙ Settings → Load AI</strong> and make sure the checkbox next to your provider is ON.',
        label: 'cloud provider not enabled'
      };
    }
    // Only reach here if local is installed but not loaded and there's
    // no cloud key — legitimately offline.
    if (local.installed && !localReady && localLoading) {
      return {
        msg: 'The on-device model is <strong>still warming up</strong> — it takes ~10–20 seconds to load from your iPad\'s cache. Please try your question again in a moment.',
        label: 'local model warming up'
      };
    }
    if (local.installed && !localReady && !localLoading) {
      return {
        msg: 'The on-device model is installed but not running. Tap <strong>⚙ Settings → Load AI → Reinstall</strong> to load it, or add a free cloud key (Gemini / OpenRouter) for instant answers.',
        label: 'local model not loaded'
      };
    }
    if (!local.installed && !anyCloudKey) {
      return {
        msg: 'No AI provider is set up yet. Open <strong>⚙ Settings → Load AI</strong> and either: <br>• Tap <strong>📥 Install local model (~400 MB)</strong> for a private offline AI, or<br>• Paste a free-tier key for Gemini / Groq / OpenRouter / Hugging Face.',
        label: 'no provider configured'
      };
    }
    // Fallback: something was enabled but every attempt failed at runtime.
    // Surface the real errors so the user isn't flying blind.
    var failures = Object.keys(providerLastError).map(function (n) {
      return '<li><strong>' + n + '</strong>: ' + escHtml(providerLastError[n]) + '</li>';
    }).join('');
    if (failures) {
      return {
        msg: 'The AI provider(s) I tried returned errors:<ul style="margin:6px 0 0 18px;padding:0;">' + failures + '</ul>' +
             '<p style="margin:10px 0 0;font-size:13px;">If the on-device model is throwing memory or WASM errors, your iPad may not have enough free memory. Reloading Load (swipe closed and reopen) often frees it up. Or use a free cloud key in Settings.</p>',
        label: 'provider error'
      };
    }
    return {
      msg: 'Every enabled AI provider failed right now — either rate-limited, offline, or returned an error.',
      label: 'all providers failed'
    };
  }

  /* ---------- Load AI provider chain ----------
   * Routes every non-matched question through a sequence of free,
   * no-signup providers until one returns a usable answer. Each
   * provider exposes { name, label, tier, available(), ask(prompt, ctx) }.
   * The chain is ordered by provider ordering in LOAD_PROVIDERS; a
   * user can disable any provider in Settings (except built-in).
   *
   * Nothing in this file requires an API key. All providers advertise
   * free anonymous access. Rate limits may apply — those get translated
   * into "try the next provider" not "fail". */
  var providerPrefs = loadProviderPrefs();
  var providerStatus = {};   // name -> 'ok' | 'rate-limited' | 'error' | 'busy'
  var providerLastError = {}; // name -> last error message from askProviderChain
  var LS_PROVIDERS = 'load_ai_providers_v2';
  function defaultProviderPrefs() {
    // All cloud providers default to OFF. User explicitly enables each
    // one by pasting their own key. Built-in is always on. On-device
    // is an opt-in install.
    return {
      builtin:     { enabled: true },
      local:       { enabled: false, installed: false },
      gemini:      { enabled: false, apiKey: '' },
      groq:        { enabled: false, apiKey: '' },
      openrouter:  { enabled: false, apiKey: '' },
      huggingface: { enabled: false, apiKey: '' },
      // Pollinations.ai — completely free, no account, no API key.
      // Default ENABLED so Load AI just works the moment you open the app.
      // User can disable it from settings if they don't want prompts
      // going to a third-party server.
      pollinations: { enabled: true }
    };
  }

  // iOS Safari evicts PWA data under storage pressure unless we ask for
  // persistence. Without it, the 400 MB model weights (and even our tiny
  // install flag) can vanish between sessions. Home-screen PWAs get a
  // favorable grant heuristic on iOS 17+.
  var storagePersistResult = null; // true | false | null (unknown/unsupported)
  async function requestPersistentStorage() {
    try {
      if (!navigator.storage || !navigator.storage.persist) return null;
      if (navigator.storage.persisted) {
        var already = await navigator.storage.persisted();
        if (already) { storagePersistResult = true; return true; }
      }
      var granted = await navigator.storage.persist();
      storagePersistResult = !!granted;
      return storagePersistResult;
    } catch (e) {
      console.warn('requestPersistentStorage failed', e);
      return null;
    }
  }
  async function estimateStorage() {
    try {
      if (!navigator.storage || !navigator.storage.estimate) return null;
      var est = await navigator.storage.estimate();
      return { usage: est.usage || 0, quota: est.quota || 0 };
    } catch (e) { return null; }
  }
  function formatBytes(bytes) {
    if (bytes == null) return '?';
    var mb = bytes / (1024 * 1024);
    if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB';
    return mb.toFixed(0) + ' MB';
  }

  // Mirror of providerPrefs backed by IndexedDB. localStorage on iOS
  // Safari gets evicted alongside the model's IDB cache under storage
  // pressure; a separate IDB store gives us a second source of truth
  // that survives most eviction events, and lets boot() recover the
  // install flag even if LS is wiped.
  var AI_IDB_NAME = 'load_ai_prefs_v1';
  var AI_IDB_STORE = 'kv';
  function openAiPrefsDb() {
    return new Promise(function (resolve, reject) {
      try {
        var req = indexedDB.open(AI_IDB_NAME, 1);
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(AI_IDB_STORE)) {
            db.createObjectStore(AI_IDB_STORE);
          }
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      } catch (e) { reject(e); }
    });
  }
  function idbGetAiPrefs() {
    return openAiPrefsDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(AI_IDB_STORE, 'readonly');
        var req = tx.objectStore(AI_IDB_STORE).get('providerPrefs');
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () { return null; });
  }
  function idbSetAiPrefs(value) {
    return openAiPrefsDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(AI_IDB_STORE, 'readwrite');
        var req = tx.objectStore(AI_IDB_STORE).put(value, 'providerPrefs');
        req.onsuccess = function () { resolve(true); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function (e) { console.warn('idbSetAiPrefs failed', e); return false; });
  }

  function loadProviderPrefs() {
    try {
      var raw = localStorage.getItem(LS_PROVIDERS);
      var saved = raw ? JSON.parse(raw) : {};
      var base = defaultProviderPrefs();
      Object.keys(saved).forEach(function (k) { if (base[k]) Object.assign(base[k], saved[k]); });
      return base;
    } catch (e) { return defaultProviderPrefs(); }
  }
  async function hydrateProviderPrefsFromIdb() {
    // Runs during boot(), after loadProviderPrefs() has already populated
    // providerPrefs synchronously from localStorage. Merges in anything
    // stronger from IDB — primarily the `installed` flag, which Safari
    // may have dropped from LS but kept in IDB.
    var idbPrefs = await idbGetAiPrefs();
    if (!idbPrefs || typeof idbPrefs !== 'object') return false;
    var changed = false;
    Object.keys(idbPrefs).forEach(function (k) {
      if (!providerPrefs[k]) return;
      var cur = providerPrefs[k];
      var src = idbPrefs[k] || {};
      // installed: IDB true wins — never let a missing LS flag downgrade.
      if (src.installed === true && cur.installed !== true) {
        cur.installed = true; changed = true;
      }
      // apiKey: fill in if LS lost it.
      if (typeof src.apiKey === 'string' && src.apiKey && !cur.apiKey) {
        cur.apiKey = src.apiKey; changed = true;
      }
      // enabled: restore from IDB when the underlying prerequisite is
      // present. For cloud providers that means an apiKey (either in
      // cur already, or just restored above). For local that means
      // installed=true. Without this, Safari's LS eviction leaves the
      // user with the key saved but the checkbox mysteriously off.
      if (src.enabled === true && !cur.enabled) {
        var prereq = (k === 'local') ? cur.installed === true : !!cur.apiKey;
        if (prereq) { cur.enabled = true; changed = true; }
      }
    });
    if (changed) {
      // Push the merged state back to LS so subsequent reads are consistent.
      try {
        localStorage.setItem(LS_PROVIDERS, JSON.stringify(providerPrefs));
      } catch (e) { /* LS still broken; IDB remains source of truth */ }
    }
    return changed;
  }
  function saveProviderPrefs() {
    // Sync return = LS write success. IDB mirror is fire-and-forget —
    // it's the durability backstop for the next launch, not the path
    // the UI depends on. If LS fails, the install flow surfaces a
    // warning; meanwhile the IDB write still lands asynchronously so
    // next boot can recover via hydrateProviderPrefsFromIdb().
    idbSetAiPrefs(providerPrefs);
    try {
      var json = JSON.stringify(providerPrefs);
      localStorage.setItem(LS_PROVIDERS, json);
      var got = localStorage.getItem(LS_PROVIDERS);
      return got === json;
    } catch (e) {
      console.warn('saveProviderPrefs LS failed', e);
      return false;
    }
  }
  function setProviderStatus(name, state, detail) {
    providerStatus[name] = state;
    var el = document.getElementById('ai-prov-' + name + '-status');
    if (!el) return;
    el.className = 'ai-prov-status ' + (state === 'ok' ? 'ok' : state === 'busy' ? 'busy' : state === 'rate-limited' ? 'warn' : state === 'error' ? 'error' : '');
    el.textContent = detail || ({
      ok: 'Ready',
      busy: 'Working…',
      'rate-limited': 'Rate-limited (will retry later)',
      error: 'Unavailable',
      'not-installed': 'Not installed'
    })[state] || state;
  }
  /* Build a context string from the file the user is currently looking
   * at. Keeps the prompt small enough that free-tier providers don't
   * reject it: trims the inlined page text to ~6 KB. */
  function recentConsoleErrorsText(max) {
    // Last N error/warning entries from the captured console. Feeds the
    // provider a "what's broken right now" snapshot so 'fix it' questions
    // don't need the user to copy errors manually.
    var n = max || 8;
    var errs = consoleEntries.filter(function (e) {
      return e.level === 'error' || e.level === 'warn';
    }).slice(-n);
    if (!errs.length) return '';
    return errs.map(function (e) {
      return '[' + e.level + '] ' + String(e.msg).slice(0, 500);
    }).join('\n');
  }
  function currentSelectionText() {
    // Whatever the user has selected on the page (or inside the editor
    // textarea). Providers treat this as "the thing the user wants me
    // to focus on" — great for "explain this" / "fix this" questions.
    try {
      var sel = window.getSelection && window.getSelection();
      var s = sel ? String(sel.toString() || '').trim() : '';
      if (s) return s.slice(0, 2000);
      var ed = document.getElementById('editor-code');
      if (ed && typeof ed.selectionStart === 'number' && ed.selectionStart !== ed.selectionEnd) {
        return (ed.value || '').slice(ed.selectionStart, ed.selectionEnd).slice(0, 2000);
      }
    } catch (e) {}
    return '';
  }
  function buildProviderContext(ctx) {
    if (!ctx) return '';
    var out = '';
    if (ctx.kind === 'viewer' && ctx.app) {
      var t = ctx.text || '';
      var head = '[Current file: ' + ctx.app.name + '. Kind: ' + (ctx.app.kind || 'html') + '.]\n\n';
      // Bundle awareness: when this is a zipped multi-file app, include
      // the file index + captured text samples (README / manifest /
      // package.json / service-worker / shared styles/app.js) so the
      // provider can reason about the project as a whole, not just one
      // rendered page.
      var bundleCtx = '';
      if (ctx.app.bundleIndex && ctx.app.bundleIndex.length) {
        bundleCtx += '\n\n[Project bundle — ' + ctx.app.bundleIndex.length + ' files]\n';
        bundleCtx += ctx.app.bundleIndex.slice(0, 40).map(function (p) { return '- ' + p; }).join('\n');
        if (ctx.app.bundleIndex.length > 40) bundleCtx += '\n…' + (ctx.app.bundleIndex.length - 40) + ' more';
        if (ctx.app.bundleSamples) {
          var keys = Object.keys(ctx.app.bundleSamples);
          for (var i = 0; i < Math.min(3, keys.length); i++) {
            bundleCtx += '\n\n[' + keys[i] + ']\n' + ctx.app.bundleSamples[keys[i]].slice(0, 2000);
          }
        }
      }
      out = head + t.slice(0, 6000) + bundleCtx;
    } else if (ctx.kind === 'editor' && currentApp) {
      var src = (currentApp.html || '').slice(0, 6000);
      out = '[User is editing HTML source of ' + currentApp.name + '.]\n\n' + src;
    }
    // In-page "Copilot" context additions — console errors and the
    // user's current text selection. Both are optional; if missing
    // we omit the headers so free-tier providers don't waste tokens
    // on empty sections.
    var errs = recentConsoleErrorsText(8);
    if (errs) {
      out += '\n\n[Recent console errors/warnings from the running page — the user wants these fixed]\n' + errs;
    }
    var sel = currentSelectionText();
    if (sel) {
      out += '\n\n[User selected this text — focus on it]\n' + sel;
    }
    return out;
  }
  function buildSystemPrompt() {
    return 'You are Load AI, a helpful offline-first coding and reading assistant embedded in an iPad PWA called Load. Answer in plain language. Prefer short, direct replies. If asked about code, produce minimal self-contained HTML/CSS/JS snippets. Never request that the user sign up for anything.';
  }
  var LOAD_PROVIDERS = [
    // On-device first among the opt-in layers — private by design.
    {
      name: 'local',
      label: 'via on-device model',
      tier: 'local',
      available: function () { return providerPrefs.local.enabled && providerPrefs.local.installed && typeof window.__LOAD_LOCAL_AI === 'function'; },
      ask: async function (question, contextText) {
        setProviderStatus('local', 'busy', 'Running on-device…');
        var messages = [
          { role: 'system', content: buildSystemPrompt() }
        ];
        if (contextText) {
          messages.push({ role: 'user', content: 'Context:\n' + contextText });
        }
        messages.push({ role: 'user', content: question });
        // 30s watchdog. The on-device worker can hang indefinitely on
        // first-run WASM compile or on a stuck token loop; without a
        // timeout the chat just sits forever. When this fires, the
        // promise rejects and the provider chain moves on to cloud.
        var timeoutMs = 30000;
        var watchdog = new Promise(function (_, reject) {
          setTimeout(function () { reject(new Error('On-device model timed out after ' + (timeoutMs / 1000) + 's. Falling back to cloud.')); }, timeoutMs);
        });
        try {
          var out = await Promise.race([window.__LOAD_LOCAL_AI(messages), watchdog]);
          setProviderStatus('local', 'ok');
          return out;
        } catch (e) {
          setProviderStatus('local', 'error', (e && e.message) || 'On-device model failed');
          throw e;
        }
      }
    },
    // Google Gemini — free tier via AI Studio API key
    {
      name: 'gemini',
      label: 'via Gemini (your key)',
      tier: 'cloud',
      available: function () { return providerPrefs.gemini.enabled && !!providerPrefs.gemini.apiKey; },
      ask: async function (question, contextText) {
        setProviderStatus('gemini', 'busy', 'Thinking…');
        var key = providerPrefs.gemini.apiKey;
        var sys = buildSystemPrompt();
        var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(key);
        var body = {
          systemInstruction: { parts: [{ text: sys }] },
          contents: [{
            role: 'user',
            parts: [{ text: (contextText ? 'Context:\n' + contextText + '\n\n' : '') + question }]
          }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 512 }
        };
        var resp = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }, 30000);
        if (resp.status === 429) { setProviderStatus('gemini', 'rate-limited'); throw new Error('rate-limited'); }
        if (resp.status === 401 || resp.status === 403) { setProviderStatus('gemini', 'error', 'Bad API key'); throw new Error('bad key'); }
        if (!resp.ok) { setProviderStatus('gemini', 'error', 'HTTP ' + resp.status); throw new Error('http ' + resp.status); }
        var data = await resp.json();
        var text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (!text) { setProviderStatus('gemini', 'error', 'Empty response'); throw new Error('empty'); }
        setProviderStatus('gemini', 'ok', 'Ready');
        return text;
      }
    },
    // Groq — free tier, ultra-fast Llama inference
    {
      name: 'groq',
      label: 'via Groq (your key)',
      tier: 'cloud',
      available: function () { return providerPrefs.groq.enabled && !!providerPrefs.groq.apiKey; },
      ask: async function (question, contextText) {
        setProviderStatus('groq', 'busy', 'Thinking…');
        var key = providerPrefs.groq.apiKey;
        var body = {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            contextText ? { role: 'user', content: 'Context:\n' + contextText } : null,
            { role: 'user', content: question }
          ].filter(Boolean),
          temperature: 0.6,
          max_tokens: 512
        };
        var resp = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key
          },
          body: JSON.stringify(body)
        }, 30000);
        if (resp.status === 429) { setProviderStatus('groq', 'rate-limited'); throw new Error('rate-limited'); }
        if (resp.status === 401 || resp.status === 403) { setProviderStatus('groq', 'error', 'Bad API key'); throw new Error('bad key'); }
        if (!resp.ok) { setProviderStatus('groq', 'error', 'HTTP ' + resp.status); throw new Error('http ' + resp.status); }
        var data = await resp.json();
        var text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!text) { setProviderStatus('groq', 'error', 'Empty response'); throw new Error('empty'); }
        setProviderStatus('groq', 'ok', 'Ready');
        return text;
      }
    },
    // OpenRouter — routed access to many free models with user's key
    {
      name: 'openrouter',
      label: 'via OpenRouter (your key)',
      tier: 'cloud',
      available: function () { return providerPrefs.openrouter.enabled && !!providerPrefs.openrouter.apiKey; },
      ask: async function (question, contextText) {
        setProviderStatus('openrouter', 'busy', 'Thinking…');
        var key = providerPrefs.openrouter.apiKey;
        var body = {
          // Load explicitly pins the :free suffix so the user is never
          // charged — OpenRouter blocks paid models when this suffix
          // is present.
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            contextText ? { role: 'user', content: 'Context:\n' + contextText } : null,
            { role: 'user', content: question }
          ].filter(Boolean),
          temperature: 0.6,
          max_tokens: 512
        };
        var resp = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key,
            'HTTP-Referer': 'https://dssorit.github.io/ancient-covenant-scrolls/load/',
            'X-Title': 'Load (ACR)'
          },
          body: JSON.stringify(body)
        }, 30000);
        if (resp.status === 429) { setProviderStatus('openrouter', 'rate-limited'); throw new Error('rate-limited'); }
        if (resp.status === 401 || resp.status === 403) { setProviderStatus('openrouter', 'error', 'Bad API key'); throw new Error('bad key'); }
        if (!resp.ok) { setProviderStatus('openrouter', 'error', 'HTTP ' + resp.status); throw new Error('http ' + resp.status); }
        var data = await resp.json();
        var text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!text) { setProviderStatus('openrouter', 'error', 'Empty response'); throw new Error('empty'); }
        setProviderStatus('openrouter', 'ok', 'Ready');
        return text;
      }
    },
    // Hugging Face Inference — free tier with HF token
    {
      name: 'huggingface',
      label: 'via Hugging Face (your token)',
      tier: 'cloud',
      available: function () { return providerPrefs.huggingface.enabled && !!providerPrefs.huggingface.apiKey; },
      ask: async function (question, contextText) {
        setProviderStatus('huggingface', 'busy', 'Thinking…');
        var key = providerPrefs.huggingface.apiKey;
        var model = 'meta-llama/Llama-3.2-3B-Instruct';
        // HF Inference OpenAI-compatible chat endpoint
        var body = {
          model: model,
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            contextText ? { role: 'user', content: 'Context:\n' + contextText } : null,
            { role: 'user', content: question }
          ].filter(Boolean),
          max_tokens: 512,
          temperature: 0.6
        };
        var resp = await fetchWithTimeout('https://router.huggingface.co/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key
          },
          body: JSON.stringify(body)
        }, 45000);
        if (resp.status === 429) { setProviderStatus('huggingface', 'rate-limited'); throw new Error('rate-limited'); }
        if (resp.status === 401 || resp.status === 403) { setProviderStatus('huggingface', 'error', 'Bad token'); throw new Error('bad key'); }
        if (!resp.ok) { setProviderStatus('huggingface', 'error', 'HTTP ' + resp.status); throw new Error('http ' + resp.status); }
        var data = await resp.json();
        var text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!text) { setProviderStatus('huggingface', 'error', 'Empty response'); throw new Error('empty'); }
        setProviderStatus('huggingface', 'ok', 'Ready');
        return text;
      }
    },
    /* Pollinations.ai — free, no account, no API key. Always-on fallback
     * so Load AI works out-of-the-box for every user. They proxy
     * various open models behind one simple OpenAI-compatible endpoint.
     * Sits AFTER the user's own keyed providers (Gemini, OpenRouter,
     * etc) so paid quality wins when configured, but BEFORE the local
     * model so it picks up the slack when nothing is configured. */
    {
      name: 'pollinations',
      label: 'via Pollinations (free, no key)',
      tier: 'free-cloud',
      available: function () { return providerPrefs.pollinations && providerPrefs.pollinations.enabled !== false; },
      ask: async function (question, contextText) {
        setProviderStatus('pollinations', 'busy', 'Thinking…');
        var body = {
          // Pollinations exposes several free models. 'openai' is their
          // default wrapper around a free OpenAI-compatible model;
          // 'llama' and 'mistral' are alternatives that have less queue
          // pressure. We ask for 'openai' first; if it ever 503s we
          // could rotate.
          model: 'openai',
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            contextText ? { role: 'user', content: 'Context:\n' + contextText } : null,
            { role: 'user', content: question }
          ].filter(Boolean),
          temperature: 0.6,
          // Don't post our prompts to their public feed
          private: true,
          referrer: 'load.dssorit'
        };
        var resp = await fetchWithTimeout('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }, 30000);
        if (resp.status === 429) { setProviderStatus('pollinations', 'rate-limited'); throw new Error('rate-limited'); }
        if (resp.status === 503) { setProviderStatus('pollinations', 'error', 'Busy — try again'); throw new Error('busy'); }
        if (!resp.ok) { setProviderStatus('pollinations', 'error', 'HTTP ' + resp.status); throw new Error('http ' + resp.status); }
        // The /openai endpoint returns OpenAI-shape JSON; older versions of
        // their API returned plain text instead. Handle both shapes
        // defensively so a quiet API change doesn't break Load AI.
        var raw = await resp.text();
        var text = '';
        try {
          var data = JSON.parse(raw);
          text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        } catch (e) { text = raw; }
        if (!text || !String(text).trim()) {
          setProviderStatus('pollinations', 'error', 'Empty response'); throw new Error('empty');
        }
        setProviderStatus('pollinations', 'ok', 'Ready');
        return text;
      }
    }
  ];
  async function fetchWithTimeout(url, opts, timeout) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeout || 30000) : null;
    try {
      return await fetch(url, Object.assign({}, opts || {}, ctrl ? { signal: ctrl.signal } : {}));
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  async function askProviderChain(question, ctx) {
    var context = buildProviderContext(ctx);
    var anyEnabled = false;
    // Track the last error per provider so diagnoseNoProvider() can
    // surface the real reason in the bubble instead of guessing.
    providerLastError = {};
    for (var i = 0; i < LOAD_PROVIDERS.length; i++) {
      var p = LOAD_PROVIDERS[i];
      if (!p.available || !p.available()) continue;
      anyEnabled = true;
      var placeholder = addThinkingMessage(p.label.replace(/^via\s+/, ''));
      try {
        var text = await p.ask(question, context);
        if (text && text.trim().length > 1) {
          var html = markdownToHtml(text.trim());
          // The caller (submitHelperQuestionCore / home rewrite) is the
          // single source of truth for rendering the answer. Drop the
          // "thinking…" placeholder so the caller's addHelperMessage
          // doesn't produce a duplicate bubble.
          placeholder.remove();
          return { answer: html, badge: { tier: p.tier, label: p.label } };
        }
        providerLastError[p.name] = 'empty response';
        placeholder.remove();
      } catch (e) {
        placeholder.remove();
        providerLastError[p.name] = (e && e.message) || String(e);
        console.warn('Provider ' + p.name + ' failed:', e);
      }
    }
    if (!anyEnabled) return null;
    return null;
  }
  /* Tiny Markdown → HTML for provider output. Handles the common bits
   * (paragraphs, code spans, bullet lists, **bold**, *italic*) without
   * pulling in a full markdown library. */
  function markdownToHtml(md) {
    if (!md) return '';
    // Escape HTML first
    var s = String(md).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Code blocks ```…```
    s = s.replace(/```([\s\S]*?)```/g, function (_, code) { return '<pre class="code-block">' + code.trim() + '</pre>'; });
    // Inline code
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold / italic
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(?:^|[^*])\*([^*]+)\*/g, function (m, inner) { return m.charAt(0) === '*' ? '<em>' + inner + '</em>' : m.charAt(0) + '<em>' + inner + '</em>'; });
    // Bullet lists
    s = s.replace(/(^|\n)((?:[-*] [^\n]+\n?)+)/g, function (_, pre, block) {
      var items = block.trim().split(/\n/).map(function (l) { return '<li>' + l.replace(/^[-*] /, '') + '</li>'; }).join('');
      return pre + '<ul>' + items + '</ul>';
    });
    // Paragraphs
    s = s.split(/\n{2,}/).map(function (p) {
      if (/^<(ul|ol|pre|h\d|blockquote)/.test(p.trim())) return p;
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
    return s;
  }
  /* ---------- On-device model loader (opt-in, no bundle) ----------
   * Lazy-imports transformers.js from jsDelivr + pulls a small Qwen
   * model on first use. Weights are cached in IndexedDB by transformers.js
   * itself (via @huggingface/hub's browser cache), so the ~400 MB download
   * happens exactly once. On subsequent visits we re-create the pipeline
   * from the cached weights — fast, fully offline, no network.
   *
   * Sets window.__LOAD_LOCAL_AI(prompt) when ready. Two entry points:
   *   - installLocalAiModel()  : user-triggered, shows full progress
   *   - autoInitLocalAi()      : startup, silent; only runs when already installed
   */
  var localAiInitPromise = null;

  /* Worker source string -- runs transformers.js off the main thread so
     the iPad UI stays responsive during the multi-second WASM compile.
     Built as a Blob URL at install time so it ships inside the
     standalone HTML without a separate worker.js file. */
  var LOCAL_AI_WORKER_SRC =
    'let pipelineFn = null;\n' +
    'let gen = null;\n' +
    'self.onmessage = async function (e) {\n' +
    '  const msg = e.data || {};\n' +
    '  try {\n' +
    '    if (msg.type === "init") {\n' +
    '      const mod = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");\n' +
    '      pipelineFn = mod.pipeline;\n' +
    '      mod.env.allowLocalModels = false;\n' +
    '      mod.env.useBrowserCache = true;\n' +
    '      gen = await pipelineFn("text-generation", msg.model || "Xenova/Qwen1.5-0.5B-Chat", {\n' +
    '        progress_callback: function (p) { self.postMessage({ type: "progress", payload: p }); }\n' +
    '      });\n' +
    '      self.postMessage({ type: "ready" });\n' +
    '      return;\n' +
    '    }\n' +
    '    if (msg.type === "generate") {\n' +
    '      if (!gen) { self.postMessage({ type: "error", id: msg.id, payload: "Model not loaded yet." }); return; }\n' +
    '      const out = await gen(msg.payload.messages, msg.payload.opts || {\n' +
    '        max_new_tokens: 240, temperature: 0.6, do_sample: true, repetition_penalty: 1.1\n' +
    '      });\n' +
    '      const first = out && out[0];\n' +
    '      let text = "";\n' +
    '      if (first) {\n' +
    '        const gt = first.generated_text;\n' +
    '        if (typeof gt === "string") text = gt;\n' +
    '        else if (Array.isArray(gt)) {\n' +
    '          for (let i = gt.length - 1; i >= 0; i--) {\n' +
    '            if (gt[i] && gt[i].role === "assistant") { text = gt[i].content || ""; break; }\n' +
    '          }\n' +
    '        }\n' +
    '      }\n' +
    '      self.postMessage({ type: "result", id: msg.id, payload: text });\n' +
    '      return;\n' +
    '    }\n' +
    '  } catch (err) {\n' +
    '    self.postMessage({ type: "error", id: msg.id, payload: String((err && err.message) || err) });\n' +
    '  }\n' +
    '};\n';

  var localAiWorker = null;
  var localAiWorkerReady = null; // Promise that resolves when worker says "ready"

  async function initLocalAiPipeline(opts) {
    opts = opts || {};
    var firstInstall = !!opts.firstInstall;
    if (firstInstall) {
      setProviderStatus('local', 'busy', 'Spawning local AI worker…');
    } else {
      setProviderStatus('local', 'busy', 'Warming up on-device model…');
    }
    if (localAiWorker) {
      // Already spawned; just wait for ready
      return localAiWorkerReady;
    }
    // Build the worker from an inline Blob so the standalone HTML
    // doesn't need a separate file. type:'module' so we can use
    // dynamic import() inside the worker.
    var blob = new Blob([LOCAL_AI_WORKER_SRC], { type: 'application/javascript' });
    var workerUrl = URL.createObjectURL(blob);
    try {
      localAiWorker = new Worker(workerUrl, { type: 'module' });
    } catch (e) {
      // iOS Safari < 15 doesn't support module workers. Fall back to
      // a classic worker; transformers.js's import() still works there
      // when we use the umd build. For now, surface the issue clearly.
      setProviderStatus('local', 'error', 'Browser does not support module workers (need iOS 15+).');
      throw e;
    }

    var pendingGenerations = {};
    var nextGenId = 1;

    localAiWorkerReady = new Promise(function (resolve, reject) {
      localAiWorker.addEventListener('message', function (e) {
        var msg = e.data || {};
        if (msg.type === 'progress') {
          var p = msg.payload || {};
          if (p.status === 'progress' && p.progress != null) {
            setProviderStatus('local', 'busy', 'Downloading ' + p.file + ' — ' + Math.round(p.progress) + '%');
          } else if (p.status === 'done' && firstInstall) {
            setProviderStatus('local', 'busy', 'Finalizing ' + p.file + '…');
          }
        } else if (msg.type === 'ready') {
          resolve();
        } else if (msg.type === 'result' && msg.id != null) {
          var r = pendingGenerations[msg.id];
          if (r) { delete pendingGenerations[msg.id]; r.resolve(msg.payload); }
        } else if (msg.type === 'error') {
          if (msg.id != null && pendingGenerations[msg.id]) {
            var rj = pendingGenerations[msg.id]; delete pendingGenerations[msg.id]; rj.reject(new Error(msg.payload));
          } else {
            reject(new Error(msg.payload));
          }
        }
      });
      localAiWorker.addEventListener('error', function (e) {
        reject(new Error((e && e.message) || 'Worker crashed'));
      });
    });

    // Tell the worker to install the model
    localAiWorker.postMessage({
      type: 'init',
      model: opts.model || 'Xenova/Qwen1.5-0.5B-Chat'
    });

    // Wire the public API. Each generate() round-trip gets a unique id
    // so concurrent requests don't cross-talk.
    window.__LOAD_LOCAL_AI = function (input) {
      var messages;
      if (typeof input === 'string') messages = [{ role: 'user', content: input }];
      else if (Array.isArray(input)) messages = input;
      else return Promise.resolve('');
      var id = nextGenId++;
      return new Promise(function (resolve, reject) {
        pendingGenerations[id] = { resolve: resolve, reject: reject };
        localAiWorker.postMessage({ type: 'generate', id: id, payload: { messages: messages } });
      });
    };

    return localAiWorkerReady;
  }

  async function installLocalAiModel() {
    if (typeof window.__LOAD_LOCAL_AI === 'function') {
      toast('Local model already loaded and ready.');
      setProviderStatus('local', 'ok', 'Ready offline');
      return;
    }
    if (localAiInitPromise) {
      toast('Already installing — please wait.');
      return;
    }
    // Ask iOS to keep our storage *before* downloading 400 MB. If iOS
    // denies persistence, Safari will evict the model cache under
    // pressure and the user will have to reinstall every session.
    // Home-screen PWAs on iOS 17+ usually get granted.
    var persistGranted = await requestPersistentStorage();
    localAiInitPromise = initLocalAiPipeline({ firstInstall: true });
    try {
      await localAiInitPromise;
      providerPrefs.local.installed = true;
      providerPrefs.local.enabled = true;
      var persisted = saveProviderPrefs();
      var est = await estimateStorage();
      var sizeDetail = est ? ' — using ' + formatBytes(est.usage) + ' of ' + formatBytes(est.quota) + ' available' : '';
      var persistDetail = persistGranted === true
        ? 'iPad will keep the model offline'
        : persistGranted === false
          ? 'iPad did NOT grant persistent storage — model may be cleared later. Keep Load on your home screen and reopen often to improve odds.'
          : 'persistence status unknown on this device';
      if (!persisted) {
        setProviderStatus('local', 'warn', 'Ready this session — install flag may not persist. ' + persistDetail + sizeDetail);
        toast('Loaded, but install state could not be saved — may need to reinstall next launch.', true);
      } else {
        setProviderStatus('local', 'ok', 'Installed, ready offline. ' + persistDetail + sizeDetail);
        toast(persistGranted === false
          ? '✓ Model installed — but iPad did not grant persistent storage. Open Load regularly to keep it.'
          : '✓ Local model installed. Ready for offline use.');
      }
      var cb = document.getElementById('ai-prov-local');
      if (cb) cb.checked = true;
      var btn = document.getElementById('ai-prov-local-install');
      if (btn) { btn.disabled = true; btn.textContent = persisted ? '✓ Installed' : '⚠ Ready this session'; }
    } catch (e) {
      console.warn('Local AI install failed', e);
      setProviderStatus('local', 'error', 'Install failed: ' + ((e && e.message) || e));
      toast('Local model install failed. See settings for details.', true);
    } finally {
      localAiInitPromise = null;
    }
  }

  // Auto re-init on startup when the user has already done the one-time
  // install. Silent; uses the cached weights from the browser cache.
  // Skipped on cold page loads if the user disabled the local provider
  // in settings, or if no install has happened yet.
  function autoInitLocalAi() {
    // Now safe to run on boot: the heavy WASM compile happens inside
    // the Web Worker rather than the main thread, so the UI stays
    // responsive while the model warms up. Previous version had to
    // be neutered because the on-main-thread compile froze iPad
    // Safari for tens of seconds. The worker keeps that off the UI
    // critical path.
    if (!providerPrefs.local.installed || !providerPrefs.local.enabled) return;
    if (typeof window.__LOAD_LOCAL_AI === 'function') return; // already up
    if (localAiInitPromise) return; // install in progress
    localAiInitPromise = (async function () {
      try {
        await initLocalAiPipeline({ firstInstall: false });
        setProviderStatus('local', 'ok', 'Ready offline');
      } catch (e) {
        console.warn('Local AI auto-init failed', e);
        setProviderStatus('local', 'error', 'Could not warm up cached model: ' + ((e && e.message) || e));
      } finally {
        localAiInitPromise = null;
      }
    })();
  }
  function wireAiProviderSettings() {
    var CLOUD_PROVIDERS = ['gemini', 'groq', 'openrouter', 'huggingface'];
    // Pollinations toggle (no key, default on). Drives anyAiProviderConfigured()
    // so the helper UI knows AI is available even with no setup.
    var pollCb = document.getElementById('ai-prov-pollinations');
    if (pollCb) {
      if (!providerPrefs.pollinations) providerPrefs.pollinations = { enabled: true };
      pollCb.checked = providerPrefs.pollinations.enabled !== false;
      setProviderStatus('pollinations', 'ok', 'Ready (no key needed)');
      pollCb.addEventListener('change', function () {
        providerPrefs.pollinations.enabled = pollCb.checked;
        saveProviderPrefs();
        setProviderStatus('pollinations', pollCb.checked ? 'ok' : '',
          pollCb.checked ? 'Ready (no key needed)' : 'Disabled');
      });
    }
    // On-device toggle + install
    var localCb = document.getElementById('ai-prov-local');
    if (localCb) {
      localCb.checked = !!providerPrefs.local.enabled;
      localCb.addEventListener('change', function () {
        providerPrefs.local.enabled = localCb.checked;
        saveProviderPrefs();
      });
    }
    var install = document.getElementById('ai-prov-local-install');
    if (install) install.addEventListener('click', installLocalAiModel);
    if (providerPrefs.local.installed) {
      if (typeof window.__LOAD_LOCAL_AI === 'function') {
        setProviderStatus('local', 'ok', 'Ready offline');
        if (install) { install.disabled = true; install.textContent = '✓ Installed'; }
      } else {
        // Installed on a previous visit — weights live in IndexedDB;
        // rehydrate in the background so the first question after reload
        // still runs on-device.
        setProviderStatus('local', 'busy', 'Reloading cached model…');
        if (install) { install.disabled = true; install.textContent = 'Reloading…'; }
        autoInitLocalAi();
        // Re-enable the button once ready (or failed) so the user can
        // retry if IndexedDB was purged.
        var tick = setInterval(function () {
          if (typeof window.__LOAD_LOCAL_AI === 'function') {
            if (install) { install.disabled = true; install.textContent = '✓ Installed'; }
            setProviderStatus('local', 'ok', 'Ready offline');
            clearInterval(tick);
          } else if (!localAiInitPromise) {
            if (install) { install.disabled = false; install.textContent = '↻ Reinstall (cache may be gone)'; }
            clearInterval(tick);
          }
        }, 1500);
      }
    }
    // Cloud providers: checkbox + API key input per provider
    CLOUD_PROVIDERS.forEach(function (name) {
      var cb = document.getElementById('ai-prov-' + name);
      var keyInput = document.getElementById('ai-prov-' + name + '-key');
      if (!cb || !keyInput) return;
      cb.checked = !!providerPrefs[name].enabled;
      keyInput.value = providerPrefs[name].apiKey || '';
      // Initial status reflects whether a key exists
      if (providerPrefs[name].apiKey) setProviderStatus(name, 'ok', 'Ready (key saved)');
      else setProviderStatus(name, '', name === 'huggingface' ? 'No token' : 'No key');
      cb.addEventListener('change', function () {
        if (cb.checked && !providerPrefs[name].apiKey) {
          toast('Paste a ' + name + ' API key first — otherwise it can\'t run.', true);
          cb.checked = false;
          return;
        }
        providerPrefs[name].enabled = cb.checked;
        saveProviderPrefs();
      });
      keyInput.addEventListener('change', function () {
        var v = (keyInput.value || '').trim();
        providerPrefs[name].apiKey = v;
        if (v) {
          // Auto-enable when a valid-looking key is pasted.
          providerPrefs[name].enabled = true;
          cb.checked = true;
          setProviderStatus(name, 'ok', 'Ready (key saved)');
        } else {
          providerPrefs[name].enabled = false;
          cb.checked = false;
          setProviderStatus(name, '', name === 'huggingface' ? 'No token' : 'No key');
        }
        saveProviderPrefs();
      });
    });
  }

  /* ---------- Content commands over the current file ----------
   * Simple local heuristics over the text already extracted from the
   * iframe. No AI involved — just pattern recognition + Text.prototype
   * basics. Good enough for summarize / find / outline / step-by-step
   * / external-AI handoff. */
  function handleContentCommand(q, ctx) {
    var lower = q.toLowerCase();
    var name = (ctx.app && ctx.app.name) || 'this item';
    var text = ctx.text || '';

    // Summarize / what is this about / key points
    if (/\b(summari[sz]e|summary|key points?|tldr|tl;dr|gist|what is this about|what'?s this)\b/.test(lower)) {
      var firstPara = extractFirstParagraph(text);
      var heads = extractHeadings(text);
      var lines = ['<strong>' + escHtml(name) + '</strong>'];
      if (heads.length) {
        lines.push('Covered:');
        lines.push('<ul>' + heads.slice(0, 7).map(function (h) { return '<li>' + escHtml(h) + '</li>'; }).join('') + '</ul>');
      }
      if (firstPara) lines.push('Opening: <em>' + escHtml(firstPara.slice(0, 300)) + (firstPara.length > 300 ? '…' : '') + '</em>');
      lines.push('For a real full-content summary, hand off to a free AI site:');
      return {
        answer: lines.join('<br>'),
        action: { label: 'Summarize with ChatGPT', fn: function () { handoffToAi('Please summarize this in plain language, 5 bullet points.', text, 'chatgpt'); } }
      };
    }

    // Find a word or phrase
    var findMatch = lower.match(/^(?:find|search(?:\s+for)?|look\s+for|where\s+(?:is|does\s+it\s+say))\s+(.+?)\s*$/);
    if (findMatch) {
      var needle = findMatch[1].trim().replace(/^["']|["']$/g, '');
      if (!needle) return { answer: 'Type what you want to find, like <code>find covenant</code>.' };
      var occurrences = findOccurrences(text, needle);
      if (!occurrences.length) {
        return { answer: '"<strong>' + escHtml(needle) + '</strong>" isn\'t in ' + escHtml(name) + '. Check the spelling, or the word might be in an image (Load only searches text).' };
      }
      var showN = Math.min(5, occurrences.length);
      var body = 'Found <strong>' + occurrences.length + '</strong> match' + (occurrences.length === 1 ? '' : 'es') + ' for "<strong>' + escHtml(needle) + '</strong>":';
      body += '<ul>';
      for (var i = 0; i < showN; i++) body += '<li>…' + escHtml(occurrences[i]) + '…</li>';
      body += '</ul>';
      if (occurrences.length > showN) body += 'Plus ' + (occurrences.length - showN) + ' more.';
      return { answer: body };
    }

    // Outline / table of contents / headings
    if (/\b(outline|toc|table of contents|headings?|what does it cover)\b/.test(lower)) {
      var h = extractHeadings(text);
      if (!h.length) {
        return { answer: 'I don\'t see any headings in ' + escHtml(name) + '. You can still scroll through paragraph by paragraph — try "step by step".' };
      }
      return {
        answer: '<strong>Outline of ' + escHtml(name) + ':</strong><ol>' +
          h.slice(0, 25).map(function (x) { return '<li>' + escHtml(x) + '</li>'; }).join('') + '</ol>'
      };
    }

    // Step-by-step walkthrough
    if (/\b(step by step|walk me through|how do i use this|use this|instructions|guide me)\b/.test(lower)) {
      var steps = extractStepsOrParagraphs(text);
      if (!steps.length) {
        return { answer: 'No clear steps or paragraphs detected in ' + escHtml(name) + '.' };
      }
      var cap = Math.min(8, steps.length);
      return {
        answer: '<strong>Walkthrough of ' + escHtml(name) + ' (first ' + cap + '):</strong><ol>' +
          steps.slice(0, cap).map(function (s) { return '<li>' + escHtml(s.slice(0, 220) + (s.length > 220 ? '…' : '')) + '</li>'; }).join('') +
          '</ol>' + (steps.length > cap ? 'Plus ' + (steps.length - cap) + ' more parts.' : '')
      };
    }

    // Count / how long
    if (/\b(how long|word count|how many (words|pages)|length)\b/.test(lower)) {
      var words = (text.match(/\S+/g) || []).length;
      var mins = Math.max(1, Math.round(words / 220));
      return { answer: escHtml(name) + ' has about <strong>' + words.toLocaleString() + '</strong> words — roughly ' + mins + ' minute' + (mins === 1 ? '' : 's') + ' of reading.' };
    }

    // Open in external AI with content already copied
    if (/(chatgpt|claude|gemini|perplexity|open (in )?ai|ask (chat|an?) ?ai)/i.test(lower)) {
      var site = 'chatgpt';
      if (/claude/i.test(q)) site = 'claude';
      else if (/gemini/i.test(q)) site = 'gemini';
      else if (/perplex/i.test(q)) site = 'perplexity';
      return {
        answer: 'I\'ll copy the text and open ' + site + ' in a new tab. Paste (tap and hold &rarr; Paste) and ask whatever you need.',
        action: { label: 'Open ' + site, fn: function () { handoffToAi('Help me understand this passage.', text, site); } }
      };
    }

    return null;
  }

  /* ---------- Copilot-style slash commands ----------
   * Offline, free, no API keys. Implemented with static analysis of
   * the current file's HTML + stored JS/CSS fragments. Each command
   * returns { answer, action? } exactly like handleContentCommand.
   *
   * Supported: /explain /fix /optimize /analyze /scan /debug /help
   *
   * Future (behind flags, optional): WebLLM local model, transformers.js
   * on-device inference, cloud-tier handoff to ChatGPT/Claude/Gemini.
   */
  function handleSlashCommand(q) {
    var raw = q.trim();
    var space = raw.indexOf(' ');
    var cmd = (space > 0 ? raw.slice(0, space) : raw).toLowerCase();
    var arg = (space > 0 ? raw.slice(space + 1).trim() : '');

    if (cmd === '/help' || cmd === '/?') return slashHelp();

    var ctx = helperContext || captureHelperContext();
    var app = (ctx.kind === 'viewer' || ctx.kind === 'editor') ? currentApp : null;
    if (!app && (cmd === '/explain' || cmd === '/fix' || cmd === '/optimize' || cmd === '/analyze' || cmd === '/scan' || cmd === '/debug')) {
      return {
        answer: '<strong>' + escHtml(cmd) + '</strong> needs an open file to work on. Open an item from the Library first, then come back and run it.',
        action: { label: 'Open Library', fn: function () { show('library-screen'); closeHelperPanel(); } }
      };
    }

    if (cmd === '/explain')  return slashExplain(app, arg);
    if (cmd === '/fix')      return slashFix(app, arg);
    if (cmd === '/optimize') return slashOptimize(app, arg);
    if (cmd === '/analyze')  return slashAnalyze(app, arg);
    if (cmd === '/scan' || cmd === '/debug') return slashScan(app);
    if (cmd === '/plan')     return slashPlan(app, arg);
    if (cmd === '/term' || cmd === '/terminal' || cmd === '/cmd' || cmd === '/shell') return slashTerminal(arg);

    // Unknown slash command — surface the full list so the user can
    // discover what's available.
    return slashHelp(cmd);
  }
  function slashHelp(unknown) {
    var intro = unknown
      ? 'I don\'t recognize <code>' + escHtml(unknown) + '</code>. These are the slash commands Load AI understands:'
      : '<strong>Slash commands</strong> run offline analysis on the file you\'re looking at:';
    return { answer:
      intro +
      '<ul>' +
        '<li><code>/explain [topic]</code> — plain-language walkthrough of the current file (structure, what it does, how it renders).</li>' +
        '<li><code>/fix</code> — runs the Developer Console scan and suggests patches for every issue it finds.</li>' +
        '<li><code>/optimize</code> — suggests size, performance, and accessibility improvements.</li>' +
        '<li><code>/analyze</code> — file structure summary (tags, styles, scripts, assets, counts).</li>' +
        '<li><code>/plan</code> — agent-style: lists a sequenced plan of steps to improve this file.</li>' +
        '<li><code>/scan</code> or <code>/debug</code> — opens the Developer Console on the Scan tab.</li>' +
        '<li><code>/term [command]</code> — plain-language explanation of a shell / git / zip command.</li>' +
        '<li><code>/help</code> — shows this list.</li>' +
      '</ul>' +
      '<p class="hint" style="margin:6px 0 0;"><strong>AI modes</strong> (Settings &rarr; AI): (A) Cloud handoff to ChatGPT / Claude / Gemini / Perplexity is already on — tap the action button on any answer. (B) Local on-device model (WebLLM / transformers.js) is opt-in and downloads on first use; nothing heavy is bundled in Load itself.</p>'
    };
  }
  function slashPlan(app, arg) {
    var html = app.html || '';
    var report = { items: [], fixable: 0 };
    scanStructural(html, report);
    scanAssets(html, report);
    scanManifest(app, report);
    scanLocalRunnerCompat(html, report);
    var s = analyzeSource(html);
    var steps = [];

    // Severity-ordered steps derived from the scan + analysis.
    report.items.forEach(function (i) {
      if (i.severity === 'error') steps.push({ priority: 1, text: 'Fix: ' + i.label.replace(/&lt;|&gt;/g, ''), why: i.detail.replace(/<[^>]+>/g, '').slice(0, 160) });
    });
    report.items.forEach(function (i) {
      if (i.severity === 'warn') steps.push({ priority: 2, text: 'Resolve warning: ' + i.label, why: i.detail.replace(/<[^>]+>/g, '').slice(0, 160) });
    });
    if (s.imgNoAlt > 0) steps.push({ priority: 3, text: 'Add alt text to ' + s.imgNoAlt + ' image' + (s.imgNoAlt === 1 ? '' : 's'), why: 'VoiceOver + screen readers skip images without alt attributes.' });
    if (html.length > 512 * 1024) steps.push({ priority: 3, text: 'Trim unused CSS/JS blocks', why: 'File is ' + humanBytes(html.length) + '; splitting or pruning will make imports faster.' });
    if (s.scripts > 3) steps.push({ priority: 4, text: 'Consolidate ' + s.scripts + ' inline script blocks into one', why: 'Fewer script blocks = faster parse + easier debugging.' });
    if (!/color-scheme/i.test(html) && !/prefers-color-scheme/i.test(html)) steps.push({ priority: 4, text: 'Add dark-mode support', why: 'iPad has system-wide dark mode; your page can honour it with a one-line meta tag or a CSS media query.' });
    if (arg) steps.unshift({ priority: 0, text: 'Focus: ' + arg, why: 'User-directed objective for this plan.' });
    if (!steps.length) return { answer: '<strong>&#9989; Nothing to plan.</strong> The file already passes every check in /fix and /optimize.' };
    steps.sort(function (a, b) { return a.priority - b.priority; });
    var ordered = '<ol>' + steps.slice(0, 10).map(function (s2) {
      return '<li><strong>' + escHtml(s2.text) + '</strong><br><span style="color:var(--ink-mid);font-size:14px;">' + escHtml(s2.why) + '</span></li>';
    }).join('') + '</ol>';
    return {
      answer: '<strong>&#128300; Plan for ' + escHtml(app.name) + '</strong>' + ordered +
        'Run <code>/fix</code> to tackle the auto-fixable items first, then switch to the HTML editor for the rest.',
      action: { label: '&#128295; Run /fix now', fn: function () { openDevConsole(); runScanCurrentApp(); closeHelperPanel(); } }
    };
  }
  function slashTerminal(arg) {
    if (!arg) {
      return { answer:
        '<strong>/term</strong> explains shell / git / zip / file commands in plain language. Examples:' +
        '<ul>' +
          '<li><code>/term git commit -m "msg"</code></li>' +
          '<li><code>/term tar -xzvf file.tar.gz</code></li>' +
          '<li><code>/term zip -r out.zip folder</code></li>' +
          '<li><code>/term chmod +x script.sh</code></li>' +
        '</ul>'
      };
    }
    return { answer: explainShellCommand(arg) };
  }
  function explainShellCommand(cmd) {
    cmd = cmd.trim();
    var tokens = cmd.split(/\s+/);
    var head = tokens[0] || '';
    // Small built-in dictionary of common iPad-era developer commands.
    // Not a full manual — just the ones that come up constantly.
    var ALIAS = {
      'git':  { desc: 'Version control. Tracks changes to files.', flags: {
        'status': 'Show which files are changed / staged / untracked.',
        'add': 'Stage files for the next commit.',
        'commit': 'Record staged changes as a new snapshot. <code>-m "text"</code> sets the message.',
        'push': 'Upload local commits to the remote (e.g. GitHub).',
        'pull': 'Download remote commits and merge into the current branch.',
        'fetch': 'Download remote commits without merging.',
        'checkout': 'Switch branches or restore files.',
        'branch': 'List / create / delete branches.',
        'log': 'Show commit history. <code>--oneline</code> = one commit per line.',
        'diff': 'Show line-by-line changes in files.',
        'stash': 'Temporarily shelf uncommitted changes.',
        'reset': 'Move the branch pointer. <code>--hard</code> discards changes (dangerous).',
        'clone': 'Copy a remote repository to your machine.'
      } },
      'zip':  { desc: 'Create a zip archive.', flags: { '-r': 'Recurse into subfolders (needed for folders).' } },
      'unzip':{ desc: 'Extract a zip archive.', flags: { '-l': 'List contents without extracting.' } },
      'tar':  { desc: 'Create / extract tar archives.', flags: { '-x': 'Extract.', '-z': 'Use gzip.', '-v': 'Verbose (show file names).', '-f': 'Archive filename follows.', '-c': 'Create a new archive.' } },
      'chmod':{ desc: 'Change file permissions.', flags: { '+x': 'Make file executable.' } },
      'ls':   { desc: 'List directory contents. <code>-la</code> shows hidden + details.', flags: {} },
      'cd':   { desc: 'Change directory.', flags: {} },
      'rm':   { desc: 'Delete files. <code>-r</code> for folders. <strong>Not recoverable</strong> — double-check first.', flags: {} },
      'cp':   { desc: 'Copy files. <code>-r</code> for folders.', flags: {} },
      'mv':   { desc: 'Move (or rename) files.', flags: {} },
      'mkdir':{ desc: 'Create a new directory.', flags: { '-p': 'Create parent directories as needed.' } },
      'cat':  { desc: 'Print file contents to the terminal.', flags: {} },
      'grep': { desc: 'Search files for a pattern.', flags: { '-r': 'Recurse into folders.', '-n': 'Show line numbers.', '-i': 'Case-insensitive.' } },
      'curl': { desc: 'Download a URL from the command line.', flags: { '-o': 'Save to a named file.', '-L': 'Follow redirects.' } },
      'npm':  { desc: 'Node package manager.', flags: { 'install': 'Install packages from package.json.', 'run': 'Run a script defined in package.json.', 'publish': 'Upload the current package.' } },
      'python3': { desc: 'Run a Python 3 script. Example: <code>python3 build.py</code>.', flags: {} },
      'node':    { desc: 'Run a JavaScript file with Node.js.', flags: {} }
    };
    if (!ALIAS[head]) {
      return '<strong>' + escHtml(head || cmd) + '</strong> — I don\'t have a built-in explanation for this command. On iPad you likely don\'t have a shell anyway; most of these live on a Mac / Windows / Linux computer. For git commands on GitHub the web UI handles everything from a browser.';
    }
    var base = ALIAS[head];
    var bits = ['<strong>' + escHtml(head) + '</strong> — ' + base.desc];
    // Subcommand (git commit, tar -x, etc.)
    for (var i = 1; i < tokens.length; i++) {
      var t = tokens[i];
      if (base.flags && base.flags[t]) bits.push('<code>' + escHtml(t) + '</code> — ' + base.flags[t]);
      else if (/^-/.test(t)) {
        // Multi-flag cluster like -xzvf: split into individual letters
        var letters = t.replace(/^-+/, '').split('');
        var expanded = letters.map(function (L) {
          var key = '-' + L;
          return base.flags && base.flags[key] ? '<code>' + escHtml(key) + '</code> ' + base.flags[key] : null;
        }).filter(Boolean);
        if (expanded.length) bits.push(expanded.join('<br>'));
      }
    }
    bits.push('<em>Tip:</em> Load doesn\'t ship a terminal — this command runs on a computer. The only commands you\'ll typically use on iPad are inside Load itself (Import, Create, Dev Console).');
    return bits.join('<br>');
  }
  function slashExplain(app, arg) {
    var html = app.html || '';
    var s = analyzeSource(html);
    var parts = ['<strong>What this file does</strong>'];
    if (s.title) parts.push('Title: <strong>' + escHtml(s.title) + '</strong>');
    parts.push('Kind: ' + (app.kind || 'html'));
    parts.push('Size: ' + humanBytes((html || '').length));
    parts.push('DOM roughly contains: <code>' + s.tagCount + '</code> tags (' + s.images + ' images, ' + s.links + ' links, ' + s.scripts + ' scripts, ' + s.styles + ' inline style blocks).');
    if (s.headings.length) parts.push('Main sections:<ul>' + s.headings.slice(0, 8).map(function (h) { return '<li>' + escHtml(h) + '</li>'; }).join('') + '</ul>');
    if (s.hasForm) parts.push('It contains at least one <code>&lt;form&gt;</code>, so it expects user input somewhere.');
    if (s.hasCanvas) parts.push('It uses <code>&lt;canvas&gt;</code>, typically for drawing/games/charts.');
    if (s.hasIframe) parts.push('It embeds another page via <code>&lt;iframe&gt;</code>.');
    if (s.scripts > 0) parts.push('JavaScript is responsible for behavior: ' + (s.scriptChars > 0 ? 'roughly ' + humanBytes(s.scriptChars) + ' of inline script.' : 'external scripts only.'));
    if (arg) {
      // If the argument matches a file in the zip bundle, pull its
      // actual content into the chat. Otherwise treat as a keyword.
      var bundleHit = null;
      if (app.bundleIndex) {
        var lower = arg.toLowerCase();
        for (var bi = 0; bi < app.bundleIndex.length; bi++) {
          var p = app.bundleIndex[bi];
          if (p.toLowerCase() === lower || p.toLowerCase().endsWith('/' + lower) || p.split('/').pop().toLowerCase() === lower) {
            bundleHit = p; break;
          }
        }
      }
      if (bundleHit) {
        var sample = app.bundleSamples && app.bundleSamples[bundleHit];
        parts.push('<strong>Bundle file: <code>' + escHtml(bundleHit) + '</code></strong>');
        if (sample) {
          parts.push('<pre class="code-block">' + escHtml(sample.slice(0, 3000)) + (sample.length > 3000 ? '\n…' + (sample.length - 3000) + ' more chars' : '') + '</pre>');
        } else {
          parts.push('<em>File is present in the bundle but wasn\'t sampled (binary or too large to preview). It is still available at runtime via the fetch shim.</em>');
        }
      } else {
        parts.push('<strong>About "' + escHtml(arg) + '":</strong>');
        var needle = arg.toLowerCase();
        var matches = findOccurrences(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '), needle);
        if (matches.length) parts.push('Mentioned ' + matches.length + ' time' + (matches.length === 1 ? '' : 's') + '. First mention: <em>…' + escHtml(matches[0]) + '…</em>');
        else parts.push('I don\'t see "<strong>' + escHtml(arg) + '</strong>" in the rendered text or bundle.');
      }
    }
    parts.push('<em>Tip:</em> run <code>/analyze</code> for a full structure breakdown, or <code>/fix</code> to check for broken assets.');
    return { answer: parts.join('<br>') };
  }
  function slashFix(app) {
    // Run the scanner directly and feed the summary into the chat.
    // Offer to open the drawer for the full report + auto-fix.
    currentApp = app;
    var report = { items: [], fixable: 0 };
    currentScanReport = report;
    scanStructural(app.html || '', report);
    scanAssets(app.html || '', report);
    scanManifest(app, report);
    scanLocalRunnerCompat(app.html || '', report);
    scanCapturedErrors(report);
    var errs = report.items.filter(function (i) { return i.severity === 'error'; });
    var warns = report.items.filter(function (i) { return i.severity === 'warn'; });
    var headline;
    if (!errs.length && !warns.length) {
      headline = '<strong>&#9989; No issues found.</strong> The file looks healthy.';
    } else {
      headline = '<strong>Found ' +
        (errs.length ? errs.length + ' error' + (errs.length === 1 ? '' : 's') : '') +
        (errs.length && warns.length ? ' and ' : '') +
        (warns.length ? warns.length + ' warning' + (warns.length === 1 ? '' : 's') : '') +
        '.</strong> ' + (report.fixable ? report.fixable + ' of these are auto-fixable.' : '');
    }
    var first = errs.concat(warns).slice(0, 3);
    var list = first.length
      ? '<ul>' + first.map(function (i) { return '<li><strong>' + i.label + ':</strong> ' + i.detail.replace(/<[^>]+>/g, '').slice(0, 180) + '</li>'; }).join('') + '</ul>'
      : '';
    return {
      answer: headline + list + 'Open the Developer Console for the full report and one-tap auto-fix.',
      action: { label: '&#128295; Open Developer Console', fn: function () { openDevConsole(); runScanCurrentApp(); closeHelperPanel(); } }
    };
  }
  function slashOptimize(app) {
    var html = app.html || '';
    var s = analyzeSource(html);
    var tips = [];
    if (html.length > 1024 * 512) tips.push('<strong>File is ' + humanBytes(html.length) + '.</strong> Consider splitting very large pages or removing unused <code>&lt;script&gt;</code> / <code>&lt;style&gt;</code> blocks.');
    if (s.imgNoAlt > 0) tips.push('<strong>' + s.imgNoAlt + ' image' + (s.imgNoAlt === 1 ? '' : 's') + ' without <code>alt</code>.</strong> Screen readers (and iPad VoiceOver) skip them silently. Add descriptive alt text so the page stays readable.');
    if (s.styleBlocksOver2k > 0) tips.push('<strong>Large inline style block(s) found.</strong> Moving repeated styles into CSS classes makes the file smaller and more consistent.');
    if (s.scripts > 3) tips.push('<strong>' + s.scripts + ' script blocks.</strong> Consolidating into one block can speed up initial render on iPad.');
    if (!/color-scheme/i.test(html) && !/prefers-color-scheme/i.test(html)) tips.push('No dark-mode support detected. Adding <code>&lt;meta name="color-scheme" content="light dark"&gt;</code> makes the page respect iPad appearance settings.');
    if (!/viewport/i.test(html)) tips.push('No <code>&lt;meta name="viewport"&gt;</code>. On iPad the page will render too wide. Add <code>&lt;meta name="viewport" content="width=device-width,initial-scale=1"&gt;</code>.');
    if (s.hardcodedColor > 8) tips.push('<strong>Many hard-coded colors.</strong> Using CSS variables (<code>--primary</code>, <code>--bg</code>) makes theme switches and dyslexia overlays work better.');
    if (!tips.length) tips.push('The file is already compact and readable. If you want to go further, run <code>/analyze</code> for a full structure map.');
    return { answer: '<strong>Optimization suggestions:</strong><ul>' + tips.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' };
  }
  function slashAnalyze(app) {
    var html = app.html || '';
    var s = analyzeSource(html);
    var rows = [
      ['Name', escHtml(app.name || '')],
      ['Kind', app.kind || 'html'],
      ['Size', humanBytes(html.length)],
      ['Title tag', s.title ? escHtml(s.title) : '<em>missing</em>'],
      ['Viewport meta', s.viewport ? '&#10003; present' : '<em>missing</em>'],
      ['Doctype', /^<!doctype/i.test(html.trim()) ? '&#10003; html5' : '<em>missing</em>'],
      ['Tags (approx)', s.tagCount],
      ['Headings', s.headings.length],
      ['Images', s.images + (s.imgNoAlt ? ' (' + s.imgNoAlt + ' without alt)' : '')],
      ['Links', s.links + (s.externalLinks ? ' (' + s.externalLinks + ' external)' : '')],
      ['Script blocks', s.scripts + (s.scriptChars ? ' (' + humanBytes(s.scriptChars) + ' inline)' : '')],
      ['Style blocks', s.styles + (s.styleChars ? ' (' + humanBytes(s.styleChars) + ' inline)' : '')],
      ['Forms', s.hasForm ? 'yes' : 'no'],
      ['Canvas', s.hasCanvas ? 'yes' : 'no'],
      ['Iframes', s.hasIframe ? 'yes' : 'no'],
      ['Service worker', /navigator\.serviceWorker/.test(html) ? '<em>registered (won\'t run from blob URL)</em>' : 'no']
    ];
    if (app.bundleIndex && app.bundleIndex.length) {
      rows.push(['Bundle files', app.bundleIndex.length + ' files']);
    }
    var table = '<table class="helper-kv">' + rows.map(function (r) {
      return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>';
    }).join('') + '</table>';
    var tree = '';
    if (app.bundleIndex && app.bundleIndex.length) {
      var show = app.bundleIndex.slice(0, 30);
      tree = '<p style="margin:10px 0 4px;"><strong>Bundle tree (first 30):</strong></p>' +
        '<ul style="font-family:SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.6;margin:0 0 8px;padding-left:20px;">' +
        show.map(function (p) { return '<li>' + escHtml(p) + '</li>'; }).join('') + '</ul>';
      if (app.bundleIndex.length > 30) tree += '<p class="hint">…and ' + (app.bundleIndex.length - 30) + ' more.</p>';
      tree += '<p class="hint">Use <code>/explain &lt;filename&gt;</code> to pull that file\'s content into the chat.</p>';
    }
    return { answer: '<strong>File analysis:</strong>' + table + tree + 'Run <code>/fix</code> for a health check or <code>/optimize</code> for improvement tips.' };
  }
  function slashScan(app) {
    return {
      answer: 'Opening the Developer Console and running a scan on <strong>' + escHtml(app.name) + '</strong>.',
      action: { label: '&#128295; Open Developer Console', fn: function () { openDevConsole(); runScanCurrentApp(); closeHelperPanel(); } }
    };
  }
  function analyzeSource(html) {
    html = html || '';
    var s = {
      title: '', viewport: false,
      tagCount: (html.match(/<[a-z!][^>]*>/gi) || []).length,
      headings: [],
      images: (html.match(/<img\b/gi) || []).length,
      imgNoAlt: 0,
      links: (html.match(/<a\b[^>]*href/gi) || []).length,
      externalLinks: 0,
      scripts: (html.match(/<script\b/gi) || []).length,
      scriptChars: 0,
      styles: (html.match(/<style\b/gi) || []).length,
      styleChars: 0,
      hasForm: /<form\b/i.test(html),
      hasCanvas: /<canvas\b/i.test(html),
      hasIframe: /<iframe\b/i.test(html),
      styleBlocksOver2k: 0,
      hardcodedColor: 0
    };
    var titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
    if (titleMatch) s.title = titleMatch[1].trim();
    if (/<meta[^>]+name=["']viewport/i.test(html)) s.viewport = true;
    var hr = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
    var m;
    while ((m = hr.exec(html)) !== null) s.headings.push(m[2].replace(/<[^>]+>/g, '').trim());
    var imgRe = /<img\b[^>]*>/gi;
    while ((m = imgRe.exec(html)) !== null) if (!/\balt\s*=/.test(m[0])) s.imgNoAlt++;
    var extRe = /<a\b[^>]*href=["']https?:\/\//gi;
    while ((m = extRe.exec(html)) !== null) s.externalLinks++;
    var sRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    while ((m = sRe.exec(html)) !== null) s.scriptChars += m[1].length;
    var stRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
    while ((m = stRe.exec(html)) !== null) { s.styleChars += m[1].length; if (m[1].length > 2048) s.styleBlocksOver2k++; }
    s.hardcodedColor = (html.match(/#[0-9a-f]{3,8}\b/gi) || []).length + (html.match(/\brgba?\s*\(/gi) || []).length;
    return s;
  }

  function extractFirstParagraph(text) {
    if (!text) return '';
    var paras = text.split(/\n\s*\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
    return paras[0] || '';
  }
  function extractHeadings(text) {
    // Heuristic: lines that are short, capitalized, and not sentences
    if (!text) return [];
    var lines = text.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (l.length < 3 || l.length > 90) continue;
      if (/[.!?]\s*$/.test(l)) continue;            // complete sentences aren't headings
      if (l.split(/\s+/).length > 12) continue;
      // Must have at least one capital letter or be ALL CAPS / Title Case
      if (!/[A-Z]/.test(l)) continue;
      out.push(l);
    }
    return out;
  }
  function extractStepsOrParagraphs(text) {
    if (!text) return [];
    // Prefer numbered/bulleted steps if present
    var numberedRegex = /\n\s*(?:\d+[.)]\s+|[-*•]\s+)(.+?)(?=\n\s*(?:\d+[.)]\s+|[-*•]\s+|\n|$))/gs;
    var m, steps = [];
    while ((m = numberedRegex.exec('\n' + text + '\n')) !== null && steps.length < 25) {
      steps.push(m[1].trim());
    }
    if (steps.length >= 3) return steps;
    // Otherwise split on paragraph breaks
    return text.split(/\n\s*\n+/).map(function (p) { return p.trim(); }).filter(function (p) { return p.length > 40; });
  }
  function findOccurrences(text, needle) {
    if (!text || !needle) return [];
    var rx = new RegExp('(?:.{0,40})(' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?:.{0,40})', 'gi');
    var out = [];
    var m;
    while ((m = rx.exec(text)) !== null && out.length < 20) {
      out.push(m[0].replace(/\s+/g, ' ').trim());
    }
    return out;
  }
  function handoffToAi(question, text, site) {
    var payload = question + '\n\n---\n\n' + text.slice(0, 6000);
    copyToClipboard(payload);
    var url = aiSiteUrl(site);
    window.open(url, '_blank');
    toast('Text copied. Paste in the AI chat.');
  }
  function matchCreateIntent(q) {
    var s = q.toLowerCase();
    // Only the verb-initiated pattern — "make a checklist for trip",
    // "create a recipe for soup". The bare-noun pattern
    // ("recipe for pasta") was removed because it was stealing general
    // questions where the user actually wanted the answer, not a
    // blank template.
    var m = s.match(/(?:make|create|write|build|new|start)\s+(?:me\s+)?(?:a|an|some)?\s*(checklist|recipe|letter|article|note|story|essay|paragraph|to-?do|shopping\s*list|grocery\s*list|book|reader|acr)\s*(?:for|about|of|to)?\s*(.*)/i);
    if (m) {
      var tpl = m[1].toLowerCase();
      if (/shopping|grocery|to-?do/.test(tpl)) tpl = 'checklist';
      if (/story|essay|paragraph/.test(tpl)) tpl = 'article';
      if (/book|reader|acr/.test(tpl)) tpl = 'acr';
      if (!['checklist','recipe','letter','article','note','acr'].includes(tpl)) tpl = 'article';
      return { template: tpl, topic: (m[2] || '').trim() };
    }
    return null;
  }
  function openCreateWithHelper(match) {
    show('create-screen');
    setTimeout(function () {
      var titleInput = $('create-title');
      if (titleInput && match.topic) {
        titleInput.value = match.topic.charAt(0).toUpperCase() + match.topic.slice(1);
      }
      currentTemplate = match.template;
      document.querySelectorAll('[data-template]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-template') === match.template);
      });
      toggleAcrTemplateOptions(match.template === 'acr');
      renderUserTemplateButtons();
      var bodyInput = $('create-body');
      if (bodyInput) bodyInput.focus();
    }, 100);
  }
  /* Synonym + stem expansion so Load AI matches many phrasings of the
   * same question. Hand-curated — no external NLP library needed. */
  var SYNONYMS = {
    ipad:['tablet','device'], save:['store','keep','remember','persist'],
    delete:['remove','erase','trash','get rid','destroy'],
    make:['create','build','write','generate','produce','new'],
    show:['display','see','view','open'], change:['edit','modify','update','alter','switch'],
    find:['search','look','locate','where'], share:['send','email','text','airdrop','give'],
    listen:['hear','audio','sound','voice','read aloud','speak'],
    fast:['quick','rapid','speedy'], slow:['laggy','sluggish','stuck','freezing','hang'],
    color:['colour','theme','tint'], page:['document','file','article','doc'],
    big:['large','larger','bigger','enlarge','bigger'], small:['little','tiny','smaller'],
    font:['typeface','letters','type'], book:['epub','novel','volume','reading material'],
    app:['program','tool','application'], folder:['collection','group','category'],
    help:['stuck','confused','lost','understand','how','what','why'],
    start:['begin','initiate','launch'], error:['broken','crash','fail','problem','bug','issue'],
    note:['notes','annotation','memo'], video:['clip','movie','recording'],
    image:['picture','photo','pic'], backup:['backup','copy','save all']
  };
  function expandTokens(q) {
    var out = {};
    q.toLowerCase().split(/[^a-z0-9]+/).forEach(function (t) {
      if (!t || t.length < 2) return;
      out[t] = true;
      var stem = t.replace(/(ies|es|s|ing|ed)$/i, '');
      if (stem && stem.length > 2 && stem !== t) out[stem] = true;
      if (SYNONYMS[t]) SYNONYMS[t].forEach(function (s) { out[s] = true; });
      if (SYNONYMS[stem]) SYNONYMS[stem].forEach(function (s) { out[s] = true; });
    });
    return Object.keys(out);
  }
  // Very common English filler words that should never count as a
  // keyword match on their own. Without this, questions like "recipe
  // for pasta" falsely match a KB entry whose keyword list happens to
  // contain "icon for book" — the word "for" scores enough to pass the
  // threshold and hijacks the answer.
  var KB_STOPWORDS = {
    'a':1,'an':1,'the':1,'and':1,'or':1,'but':1,'if':1,'is':1,'are':1,
    'was':1,'were':1,'be':1,'been':1,'being':1,'to':1,'from':1,'for':1,
    'of':1,'in':1,'on':1,'at':1,'by':1,'with':1,'this':1,'that':1,'it':1,
    'its':1,'as':1,'my':1,'your':1,'our':1,'their':1,'what':1,'which':1,
    'who':1,'whom':1,'whose':1,'how':1,'can':1,'do':1,'does':1,'did':1,
    'will':1,'would':1,'should':1,'could':1,'i':1,'you':1,'we':1,'they':1,
    'he':1,'she':1,'me':1,'us':1,'them':1,'item':1,'thing':1,'about':1
  };
  // Domain gate for the KB: unless the question actually mentions
  // something Load-related, the KB has no business answering. Without
  // this, general questions like "recipe for pasta" or "capital of
  // France" can hit a stray keyword match and get hijacked into an
  // app-help response.
  var KB_DOMAIN_RE = /\b(load|app|apps|pwa|html|css|javascript|js|zip|epub|pdf|file|files|folder|folders|library|page|bookmark|note|notes|share|backup|home\s*screen|offline|tts|speak|speech|read\s*aloud|theme|dark\s*mode|dyslex|font|setting|settings|create|editor|viewer|install|import|export|open\s*ai|gemini|groq|openrouter|huggingface|console|error|icon|manifest|service\s*worker|cache)\b/i;
  function scoreKnowledgeBase(q) {
    // Domain fast-path: if the question doesn't mention Load-vocabulary,
    // skip the KB entirely — let the AI provider handle it.
    if (!KB_DOMAIN_RE.test(q)) return null;
    var qLower = ' ' + q.toLowerCase() + ' ';
    var expanded = expandTokens(q);
    var best = null;
    for (var i = 0; i < LOAD_KB.length; i++) {
      var entry = LOAD_KB[i];
      var score = 0;
      var distinctHits = 0;
      entry.keywords.forEach(function (k) {
        var kLower = k.toLowerCase();
        var hitThisKw = false;
        // Word-ish boundary match only — refusing raw substring stops
        // "past" from matching "pasta" and similar false positives.
        var esc = kLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var phrasePattern = new RegExp('(^|[^a-z0-9])' + esc + '([^a-z0-9]|$)', 'i');
        if (phrasePattern.test(qLower)) { score += 6; hitThisKw = true; }
        kLower.split(/\s+/).forEach(function (kt) {
          if (kt.length < 4) return;
          if (KB_STOPWORDS[kt]) return;
          if (expanded.indexOf(kt) >= 0) { score += 1.5; hitThisKw = true; }
          var kStem = kt.replace(/(ies|es|s|ing|ed)$/i, '');
          if (kStem && kStem !== kt && expanded.indexOf(kStem) >= 0) { score += 1; hitThisKw = true; }
        });
        if (hitThisKw) distinctHits++;
      });
      if (!best || score > best.score) best = { score: score, entry: entry, distinctHits: distinctHits };
    }
    // Require a strong score AND at least two distinct keyword hits so
    // a single coincidental word match can't hijack the reply.
    if (best && best.score >= 8 && best.distinctHits >= 2) return best.entry;
    return null;
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
      safe('fixStuckZoom', fixStuckZoom);
      // Fire-and-forget: ask iOS to keep our storage. Home-screen PWAs
      // on iOS 17+ usually get granted without a prompt. If denied we
      // keep going — install UI will surface the real state later.
      requestPersistentStorage();
      try { db = await openDB(); apps = await listAll(); }
      catch (e) { console.warn('IndexedDB open failed', e); apps = []; }
      // Recover install state from IDB in case Safari evicted localStorage.
      // Must run before wireAiProviderSettings / autoInitLocalAi so the
      // UI and auto-init see the corrected providerPrefs.
      try { await hydrateProviderPrefsFromIdb(); }
      catch (e) { console.warn('hydrateProviderPrefsFromIdb failed', e); }
      safe('updateHomeCounts', updateHomeCounts);
      safe('wireNavButtons', wireNavButtons);
      safe('wireHomeActions', wireHomeActions);
      safe('wireSettingsPanel', wireSettingsPanel);
      safe('wireLibrarySearch', wireLibrarySearch);
      safe('wireNotes', wireNotes);
      safe('wireTts', wireTts);
      safe('wireBookmarks', wireBookmarks);
      safe('wireSaveTemplate', wireSaveTemplate);
      safe('wireLayoutBtn', wireLayoutBtn);
      safe('wireProseEditBtn', wireProseEditBtn);
      safe('wireCoverBtn', wireCoverBtn);
      safe('wireBookCheckBtn', wireBookCheckBtn);
      safe('wireBlurbBtn', wireBlurbBtn);
      safe('wireMetadataBtn', wireMetadataBtn);
      safe('wirePackageBtn', wirePackageBtn);
      safe('wireWorkspaceHub', wireWorkspaceHub);
      safe('wirePerAppTheme', wirePerAppTheme);
      safe('wireNotesScreen', wireNotesScreen);
      safe('wireHelp', wireHelp);
      safe('wireFolders', wireFolders);
      safe('wireBackup', wireBackup);
      safe('wireCreateScreen', wireCreateScreen);
      safe('wireAiHelper', wireAiHelper);
      safe('wireHelper', wireHelper);
      safe('wireConsole', wireConsole);
      safe('wireEditorControls', wireEditorControls);
      safe('wireEditorAutocomplete', wireEditorAutocomplete);
      safe('wireInstallFlow', wireInstallFlow);
      safe('wireImportErrorModal', wireImportErrorModal);
      safe('wireAiProviderSettings', wireAiProviderSettings);
      // Rehydrate the on-device model if the user installed it on a
      // previous visit, so the first question after launch actually
      // runs on-device instead of cycling to a cloud/handoff fallback.
      safe('autoInitLocalAi', autoInitLocalAi);
      safe('wirePatchPreview', wirePatchPreview);
      safe('updateInstallUi', updateInstallUi);
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
      // First-launch guided tour. Only fires if the user hasn't seen
      // it before; safe to call every boot.
      safe('maybeAutoStartTour', maybeAutoStartTour);
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
        else if (tool === 'helper') openHelperPanel();
        else if (tool === 'devconsole') openDevConsole();
        else if (tool === 'help') openHelp();
        else if (tool === 'hard-refresh') hardRefresh();
      });
    });
  }
  /* Force-refresh from any screen — purges every Cache Storage
     entry, asks active service workers to update, then reloads
     with a cache-busting query so iPad Safari's HTTP layer can't
     serve a stale load.js either. Reachable via the ↻ icon in
     the global topbar, so users can bust the cache without first
     having to load the editor. */
  async function hardRefresh() {
    try {
      if ('serviceWorker' in navigator) {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function (r) { return r.update(); }));
      }
      if ('caches' in window) {
        var keys = await caches.keys();
        await Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }
    } catch (e) {}
    location.replace(location.pathname + '?_=' + Date.now());
  }
  function openDevConsole() {
    var drawer = $('console-drawer');
    if (!drawer) return;
    drawer.classList.add('on');
    // Land on the Scan tab by default — that's the plain-language
    // diagnose/fix view the user asked for. Log is still a tap away.
    switchConsoleTab('scan');
    updateScanHint();
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
    var replay = $('help-replay-tour');
    if (replay) replay.addEventListener('click', function () {
      $('help-modal').classList.remove('on');
      setTimeout(function () { startGuidedTour({ auto: false }); }, 150);
    });
  }
  function openHelp() {
    $('help-modal').classList.add('on');
  }

  /* ---------- Guided tour ----------
   * One-screen-at-a-time intro. Each step shows a card with one short
   * sentence (≤ 15 words), a soft yellow ring around the real button it
   * is talking about, optional voice narration, and Back / Next / Skip
   * controls. User controls pace — nothing auto-advances. Auto-runs
   * on first launch (LS flag), re-runnable from Help.
   */
  var LS_TOUR_SEEN = 'load_tour_seen_v2';
  var LS_TOUR_VOICE = 'load_tour_voice_v1';
  function startGuidedTour(opts) {
    opts = opts || {};
    // Always start from Home so the anchor selectors line up.
    try {
      var homeBtn = document.querySelector('[data-nav="home"]');
      if (homeBtn && typeof homeBtn.click === 'function') homeBtn.click();
    } catch (_) {}
    // Tear down any leftover tour overlay
    var prev = document.getElementById('load-tour'); if (prev) prev.remove();

    var STEPS = [
      { anchor: null,
        title: 'Welcome to Load',
        body: 'I\'ll walk you through the basics in under a minute. Tap Next to begin.' },
      { anchor: '#home-get-started',
        title: 'Bring in a file',
        body: 'Tap Get Started to add anything from your iPad. PDFs, books, videos, web pages — they all work.' },
      { anchor: '#home-create',
        title: 'Make something new',
        body: 'Or tap Create New to start from a template and write your own page.' },
      { anchor: '[data-nav="library"]',
        title: 'Your library',
        body: 'Everything you add lives here. Tap a tile to open it.' },
      { anchor: '.home-workspace',
        title: 'Workspace shortcuts',
        body: 'These tiles open the most-used tools. Each one tells you what it does.' },
      { anchor: '[data-tool="helper"]',
        title: 'Load AI helper',
        body: 'Ask anything in plain language. Works offline. Free with no sign-up.' },
      { anchor: '[data-tool="audio"]',
        title: 'Listen instead of read',
        body: 'Tap to hear any page read out loud. Change the speed if it feels too fast.' },
      { anchor: '[data-tool="theme"]',
        title: 'Make it easy on your eyes',
        body: 'Switch colors and font from the top bar. Pick what feels right for you.' },
      { anchor: '[data-tool="help"]',
        title: 'Help is one tap away',
        body: 'The ? button has the full guide. You can replay this tour from there.' },
      { anchor: null,
        title: 'You\'re ready',
        body: 'Have fun making things. Come back to Help any time.' }
    ];

    var idx = 0;
    var voiceOn = (function () {
      var raw = null;
      try { raw = localStorage.getItem(LS_TOUR_VOICE); } catch (_) {}
      // Default voice ON for first-run, OFF if user previously turned it off.
      return raw === null ? true : raw === '1';
    })();

    var root = document.createElement('div');
    root.id = 'load-tour';
    root.innerHTML =
      '<div class="lt-scrim"></div>' +
      '<div class="lt-ring" aria-hidden="true"></div>' +
      '<div class="lt-card" role="dialog" aria-modal="true" aria-labelledby="lt-title">' +
        '<div class="lt-dots"></div>' +
        '<h2 id="lt-title" class="lt-title"></h2>' +
        '<p class="lt-body"></p>' +
        '<div class="lt-controls">' +
          '<button class="lt-btn lt-skip" type="button">Skip</button>' +
          '<button class="lt-btn lt-voice" type="button" aria-pressed="false" title="Voice narration">🔊 <span class="lt-voice-lbl">Voice</span></button>' +
          '<div class="lt-spacer"></div>' +
          '<button class="lt-btn lt-back" type="button">Back</button>' +
          '<button class="lt-btn lt-next lt-primary" type="button">Next</button>' +
        '</div>' +
      '</div>';
    if (!document.getElementById('load-tour-style')) {
      var st = document.createElement('style');
      st.id = 'load-tour-style';
      st.textContent =
        '#load-tour{position:fixed;inset:0;z-index:9000;font-family:inherit;}' +
        '#load-tour .lt-scrim{position:absolute;inset:0;background:rgba(10,10,20,0.78);backdrop-filter:blur(2px);transition:opacity .25s;}' +
        '#load-tour .lt-ring{position:absolute;border:3px solid #fbbf24;border-radius:14px;box-shadow:0 0 0 9999px rgba(10,10,20,0.78),0 0 22px 4px rgba(251,191,36,0.55);transition:all .35s cubic-bezier(.2,.7,.2,1);pointer-events:none;display:none;}' +
        '#load-tour .lt-card{position:absolute;background:#1a1a26;color:#fff;border-radius:18px;padding:22px 22px 18px;max-width:420px;width:calc(100% - 32px);box-shadow:0 18px 50px rgba(0,0,0,0.55);border:1px solid #2a2a40;transition:top .35s cubic-bezier(.2,.7,.2,1),left .35s cubic-bezier(.2,.7,.2,1);}' +
        '#load-tour .lt-dots{display:flex;gap:6px;margin-bottom:12px;}' +
        '#load-tour .lt-dots span{width:8px;height:8px;border-radius:50%;background:#3a3a55;transition:background .2s,transform .2s;}' +
        '#load-tour .lt-dots span.on{background:#fbbf24;transform:scale(1.25);}' +
        '#load-tour .lt-title{margin:0 0 8px;font-size:22px;font-weight:800;line-height:1.2;letter-spacing:-0.01em;}' +
        '#load-tour .lt-body{margin:0 0 18px;font-size:17px;line-height:1.55;color:#dcdce8;}' +
        '#load-tour .lt-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}' +
        '#load-tour .lt-spacer{flex:1;}' +
        '#load-tour .lt-btn{background:#2a2a40;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;min-height:44px;}' +
        '#load-tour .lt-btn:active{transform:scale(0.97);}' +
        '#load-tour .lt-skip{background:transparent;color:#a8a8c4;font-weight:600;padding-left:6px;padding-right:6px;}' +
        '#load-tour .lt-voice{background:#2a2a40;color:#fbbf24;font-size:14px;}' +
        '#load-tour .lt-voice[aria-pressed="false"]{color:#7a7a8c;}' +
        '#load-tour .lt-back:disabled{opacity:0.35;cursor:not-allowed;}' +
        '#load-tour .lt-primary{background:#fbbf24;color:#1a1a26;font-weight:800;}' +
        '#load-tour .lt-primary:hover{background:#fcc847;}' +
        '@media(max-width:520px){#load-tour .lt-title{font-size:20px}#load-tour .lt-body{font-size:16px}}';
      document.head.appendChild(st);
    }
    document.body.appendChild(root);

    var ring = root.querySelector('.lt-ring');
    var card = root.querySelector('.lt-card');
    var titleEl = root.querySelector('.lt-title');
    var bodyEl = root.querySelector('.lt-body');
    var dotsEl = root.querySelector('.lt-dots');
    var backBtn = root.querySelector('.lt-back');
    var nextBtn = root.querySelector('.lt-next');
    var skipBtn = root.querySelector('.lt-skip');
    var voiceBtn = root.querySelector('.lt-voice');

    // Build the dots once
    STEPS.forEach(function () {
      var d = document.createElement('span');
      dotsEl.appendChild(d);
    });

    async function speak(text) {
      if (!voiceOn) return;
      // Prefer Piper when the user has installed + enabled it. Falls
      // through to Safari speechSynthesis on any error.
      try {
        if (window.LoadPiper && LoadPiper.isEnabled() && await LoadPiper.isCached()) {
          try { await LoadPiper.say(text, { rate: 1 }); return; }
          catch (e) { console.warn('[Tour] Piper say failed, falling back:', e); }
        }
      } catch (_) {}
      try {
        if (!('speechSynthesis' in window)) return;
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.rate = 0.95; u.pitch = 1; u.volume = 1;
        speechSynthesis.speak(u);
      } catch (_) {}
    }
    function stopSpeak() {
      try { if (window.LoadPiper) LoadPiper.stop(); } catch (_) {}
      try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (_) {}
    }
    function placeRing(rect) {
      if (!rect) { ring.style.display = 'none'; return; }
      var pad = 8;
      ring.style.display = 'block';
      ring.style.top = (rect.top - pad) + 'px';
      ring.style.left = (rect.left - pad) + 'px';
      ring.style.width = (rect.width + pad * 2) + 'px';
      ring.style.height = (rect.height + pad * 2) + 'px';
    }
    function placeCard(rect) {
      var vw = window.innerWidth, vh = window.innerHeight;
      var cardRect = card.getBoundingClientRect();
      var cw = cardRect.width || Math.min(420, vw - 32);
      var ch = cardRect.height || 220;
      var top, left;
      if (!rect) {
        top = Math.max(20, (vh - ch) / 2);
        left = Math.max(16, (vw - cw) / 2);
      } else {
        var spaceBelow = vh - rect.bottom;
        var spaceAbove = rect.top;
        if (spaceBelow >= ch + 24) {
          top = rect.bottom + 16;
        } else if (spaceAbove >= ch + 24) {
          top = rect.top - ch - 16;
        } else {
          // No room above or below — center vertically
          top = Math.max(16, (vh - ch) / 2);
        }
        left = Math.min(Math.max(16, rect.left + rect.width / 2 - cw / 2), vw - cw - 16);
      }
      card.style.top = Math.round(top) + 'px';
      card.style.left = Math.round(left) + 'px';
    }
    function renderDots() {
      Array.prototype.forEach.call(dotsEl.children, function (d, i) {
        d.classList.toggle('on', i === idx);
      });
    }
    function renderVoiceBtn() {
      voiceBtn.setAttribute('aria-pressed', voiceOn ? 'true' : 'false');
      voiceBtn.firstChild.nodeValue = voiceOn ? '🔊 ' : '🔇 ';
    }
    function renderStep() {
      var step = STEPS[idx];
      titleEl.textContent = step.title;
      bodyEl.textContent = step.body;
      backBtn.disabled = idx === 0;
      nextBtn.textContent = idx === STEPS.length - 1 ? 'Done' : 'Next';
      renderDots();
      // Find and highlight the anchor (might fail if user is on a
      // different screen — that's fine, we just centre the card).
      var rect = null;
      if (step.anchor) {
        var el = null;
        try { el = document.querySelector(step.anchor); } catch (_) {}
        if (el) {
          try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
          rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) rect = null;
        }
      }
      placeRing(rect);
      // Wait one frame so card has a real size before placing it.
      requestAnimationFrame(function () { placeCard(rect); });
      speak(step.title + '. ' + step.body);
    }
    function endTour(seen) {
      stopSpeak();
      try { if (seen) localStorage.setItem(LS_TOUR_SEEN, '1'); } catch (_) {}
      try { localStorage.setItem(LS_TOUR_VOICE, voiceOn ? '1' : '0'); } catch (_) {}
      try { root.remove(); } catch (_) {}
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    }
    function onResize() {
      // Re-render the current step so anchor + card positions track
      // rotation / window size changes.
      var step = STEPS[idx];
      var rect = null;
      if (step.anchor) {
        var el = null;
        try { el = document.querySelector(step.anchor); } catch (_) {}
        if (el) {
          rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) rect = null;
        }
      }
      placeRing(rect);
      placeCard(rect);
    }
    nextBtn.addEventListener('click', function () {
      stopSpeak();
      if (idx >= STEPS.length - 1) { endTour(true); return; }
      idx++; renderStep();
    });
    backBtn.addEventListener('click', function () {
      if (idx === 0) return;
      stopSpeak(); idx--; renderStep();
    });
    skipBtn.addEventListener('click', function () { endTour(true); });
    voiceBtn.addEventListener('click', function () {
      voiceOn = !voiceOn;
      renderVoiceBtn();
      if (voiceOn) speak(STEPS[idx].title + '. ' + STEPS[idx].body);
      else stopSpeak();
    });
    // Esc + scrim tap to skip
    root.querySelector('.lt-scrim').addEventListener('click', function () { endTour(true); });
    document.addEventListener('keydown', function escHandler(e) {
      if (!document.getElementById('load-tour')) {
        document.removeEventListener('keydown', escHandler);
        return;
      }
      if (e.key === 'Escape') endTour(true);
      else if (e.key === 'ArrowRight') nextBtn.click();
      else if (e.key === 'ArrowLeft') backBtn.click();
    });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    renderVoiceBtn();
    renderStep();
  }
  function maybeAutoStartTour() {
    try {
      if (localStorage.getItem(LS_TOUR_SEEN)) return;
    } catch (_) { return; }
    // Wait for the splash + screens to be visible before launching.
    setTimeout(function () { startGuidedTour({ auto: true }); }, 900);
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
  // Apple's .webloc format — a one-URL plist. When tapped on iPad it
  // always opens in Safari (not in QuickLook preview). That means if
  // the URL is a data: URL containing the whole PWA, Safari loads it
  // as a real page and JavaScript runs. Zero hosting, zero accounts,
  // zero installs on the recipient's side — the file is 100% self-
  // contained. For large apps we gzip + base64 the HTML and wrap it
  // in a tiny decompressor launcher so the data URL stays small
  // enough to fit iOS's data-URL size ceiling.
  function buildWeblocXml(urlString) {
    var escUrl = String(urlString).replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
      '<plist version="1.0">\n' +
      '<dict>\n' +
      '\t<key>URL</key>\n' +
      '\t<string>' + escUrl + '</string>\n' +
      '</dict>\n' +
      '</plist>\n';
  }
  async function gzipBase64(text) {
    // Returns base64 of gzipped UTF-8 bytes. Requires CompressionStream
    // (iOS 16.4+). Throws on older browsers so caller can fall back.
    if (typeof CompressionStream === 'undefined') throw new Error('no CompressionStream');
    var bytes = new TextEncoder().encode(text);
    var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    var gz = new Uint8Array(await new Response(stream).arrayBuffer());
    var binary = '';
    for (var i = 0; i < gz.length; i++) binary += String.fromCharCode(gz[i]);
    return btoa(binary);
  }
  function buildDecompressorLauncher(gzBase64) {
    // Minimal launcher HTML that Safari loads from the data URL; it
    // inflates the payload and replaces itself with the real PWA. Uses
    // document.open/write/close so scripts in the PWA execute normally.
    return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
      '<title>Opening…</title>' +
      '<style>html,body{margin:0;height:100%;background:#14142a;color:#f0f0f0;font-family:-apple-system,sans-serif;}.h{height:100%;display:flex;align-items:center;justify-content:center;font-size:16px;}</style>' +
      '</head><body><div class="h">Opening book…</div><script>(async function(){try{' +
        'var b=atob("' + gzBase64 + '");' +
        'var u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);' +
        'var s=new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"));' +
        'var h=await new Response(s).text();' +
        'document.open();document.write(h);document.close();' +
      '}catch(e){document.body.innerHTML="<p style=padding:20px;color:#faa;>Could not open: "+(e&&e.message||e)+"</p>";}})();' +
      '<\/script></body></html>';
  }
  function utf8ToBase64(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  async function buildSelfContainedDataUrl(html) {
    // Prefer gzipped + launcher (smaller). Fall back to raw base64
    // when CompressionStream isn't available on the device.
    try {
      var gz = await gzipBase64(html);
      var launcher = buildDecompressorLauncher(gz);
      return 'data:text/html;base64,' + utf8ToBase64(launcher);
    } catch (e) {
      return 'data:text/html;base64,' + utf8ToBase64(html);
    }
  }
  // Apple's .webarchive format — an XML plist wrapping a full HTML
  // document. AirDropping one to another iPad opens it directly in
  // Safari (not in the QuickLook preview that blocks JavaScript) so
  // the full PWA runs: scripts, password gates, audio, sidebar, and
  // "Add to Home Screen" all work without the recipient installing
  // anything or the sender hosting anything.
  function buildWebArchiveXml(html, pseudoUrl, title) {
    // btoa only accepts latin-1; use TextEncoder to get UTF-8 bytes
    // and fold them into a binary string we can base64 safely.
    var bytes = new TextEncoder().encode(html);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    var b64 = btoa(binary);
    // Apple's WebKit serializes the data in ~68-char lines inside <data>;
    // matching that shape keeps parsers that are picky about whitespace
    // happy on some older iPadOS versions.
    var wrapped = b64.replace(/(.{68})/g, '$1\n');
    var escTitle = (title || 'Load PWA').replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
    var escUrl = (pseudoUrl || 'https://load.local/index.html').replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
      '<plist version="1.0">\n' +
      '<dict>\n' +
      '\t<key>WebMainResource</key>\n' +
      '\t<dict>\n' +
      '\t\t<key>WebResourceData</key>\n' +
      '\t\t<data>\n' + wrapped + '\n\t\t</data>\n' +
      '\t\t<key>WebResourceFrameName</key>\n' +
      '\t\t<string></string>\n' +
      '\t\t<key>WebResourceMIMEType</key>\n' +
      '\t\t<string>text/html</string>\n' +
      '\t\t<key>WebResourceTextEncodingName</key>\n' +
      '\t\t<string>UTF-8</string>\n' +
      '\t\t<key>WebResourceURL</key>\n' +
      '\t\t<string>' + escUrl + '</string>\n' +
      '\t</dict>\n' +
      '</dict>\n' +
      '</plist>\n';
    // title is included via the HTML's own <title> — webarchive format
    // doesn't have a separate title field at top level.
  }
  // Extract a usable app icon — from the zip bundle if possible, else
  // generate a simple initials-based PNG so the recipient's iPad gets a
  // real home-screen icon instead of a thumbnail of the page.
  async function findOrGenerateAppIconDataUrl(app) {
    if (app.kind === 'zip' && app.bundleBlobs) {
      var keys = Object.keys(app.bundleBlobs).filter(function (k) {
        return /(?:^|\/)(?:apple-touch-icon|icon|favicon)[^/]*\.(?:png|jpg|jpeg|svg)$/i.test(k);
      }).sort(function (a, b) {
        // Prefer apple-touch-icon-*, then plain "icon", then favicon.
        var order = function (s) {
          if (/apple-touch/i.test(s)) return 0;
          if (/\/icon[.\-]/i.test(s) || /^icon[.\-]/i.test(s)) return 1;
          return 2;
        };
        return order(a) - order(b);
      });
      for (var i = 0; i < keys.length; i++) {
        try {
          var blob = app.bundleBlobs[keys[i]];
          var buf = await blob.arrayBuffer();
          var b64 = arrayBufferToBase64(buf);
          var mime = blob.type || (/\.svg$/i.test(keys[i]) ? 'image/svg+xml' : /\.jpe?g$/i.test(keys[i]) ? 'image/jpeg' : 'image/png');
          return 'data:' + mime + ';base64,' + b64;
        } catch (e) { /* try next */ }
      }
    }
    return generateInitialsIconDataUrl(app.name || 'L', 192);
  }
  function generateInitialsIconDataUrl(name, size) {
    var initials = String(name).trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return (w.charAt(0) || '').toUpperCase(); }).join('') || 'L';
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    var ctx = canvas.getContext('2d');
    // Deterministic color from the name so each app keeps its own hue.
    var hash = 0;
    for (var i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
    var hue = Math.abs(hash) % 360;
    ctx.fillStyle = 'hsl(' + hue + ',55%,42%)';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'white';
    ctx.font = 'bold ' + Math.floor(size * 0.45) + 'px -apple-system,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, size / 2, size / 2);
    try { return canvas.toDataURL('image/png'); } catch (e) { return ''; }
  }
  // Multi-page router injected at share time. When a PWA has multiple
  // HTML pages (login.html → home.html → etc.) that were bundled by
  // the zip importer, the bundle shim serves them via fetch() — but
  // navigation from <a href="home.html">, <form action=".">, and
  // window.location assignments doesn't naturally route through
  // fetch. This router intercepts all three and swaps the body
  // in-place using the fetched HTML. Works both for newly imported
  // apps (where injectBundleShim also has its own router) and for
  // older imports that pre-date that change.
  function buildMultiPageRouterScript() {
    return '<script>/* Load share-time multi-page router */\n(function(){try{' +
      'function swap(href){if(!window.fetch)return Promise.resolve(false);' +
        'return fetch(href).then(function(r){if(!r||!r.ok)return false;' +
          'return r.text().then(function(body){try{' +
            'var parser=new DOMParser();var doc=parser.parseFromString(body,"text/html");' +
            'var t=doc.querySelector("title");if(t)document.title=t.textContent;' +
            'var hChildren=doc.head?doc.head.children:[];' +
            'for(var i=0;i<hChildren.length;i++){var tag=hChildren[i].tagName;' +
              'if(tag==="STYLE"||tag==="LINK"||tag==="META"){document.head.appendChild(hChildren[i].cloneNode(true));}}' +
            'document.body.innerHTML=doc.body?doc.body.innerHTML:"";' +
            'var scripts=doc.body?doc.body.querySelectorAll("script"):[];' +
            'for(var j=0;j<scripts.length;j++){var src=scripts[j].getAttribute("src");' +
              'var n=document.createElement("script");' +
              'if(src){n.src=src;}else{n.text=scripts[j].textContent||"";}' +
              'document.body.appendChild(n);}' +
            'window.scrollTo(0,0);' +
            'setTimeout(function(){try{document.dispatchEvent(new Event("DOMContentLoaded"));window.dispatchEvent(new Event("load"));}catch(_){}},0);' +
            'try{history.pushState({__lp:href},"","#"+href);}catch(_){}' +
            'return true;}catch(e){console.warn("swap failed",e);return false;}' +
          '});' +
        '}).catch(function(){return false;});}' +
      'document.addEventListener("click",function(ev){var a=ev.target;' +
        'while(a&&a!==document){if(a.tagName==="A"&&a.getAttribute&&a.getAttribute("href"))break;a=a.parentNode;}' +
        'if(!a||a===document)return;var href=a.getAttribute("href");' +
        'if(!href||/^(mailto|tel|javascript|#|https?:|blob:|data:)/i.test(href))return;' +
        'if(/\\.html?(\\?|#|$)/i.test(href)){ev.preventDefault();swap(href);}' +
        '},true);' +
      'document.addEventListener("submit",function(ev){var f=ev.target;' +
        'if(!f||f.tagName!=="FORM")return;var action=f.getAttribute("action")||"";' +
        'if(/\\.html?(\\?|#|$)/i.test(action)){' +
          'setTimeout(function(){swap(action);},30);ev.preventDefault();}' +
        '},true);' +
      'try{var origA=location.assign?location.assign.bind(location):null;' +
        'var origR=location.replace?location.replace.bind(location):null;' +
        'if(origA)location.assign=function(u){swap(u).then(function(ok){if(!ok)origA(u);});};' +
        'if(origR)location.replace=function(u){swap(u).then(function(ok){if(!ok)origR(u);});};}catch(_){}' +
      'window.addEventListener("popstate",function(ev){var p=ev.state&&ev.state.__lp;if(p)swap(p);});' +
      '}catch(err){console.warn("Load multi-page router init failed",err);}})();' +
      '<\/script>';
  }

  // Small self-contained banner + script that auto-pops on the first
  // Safari open of the shared file, telling the recipient exactly how
  // to add it to their home screen. Hides forever once dismissed, and
  // is never shown when the file is already running as a home-screen
  // PWA (display-mode: standalone). Pure inline CSS/JS so it works on
  // any iPad with no dependencies.
  function buildAddToHomeScreenBanner(appName) {
    var safeName = escHtml(appName || 'this app');
    // Using a templated string that's inlined verbatim into the shared
    // HTML. Nothing here depends on Load's runtime.
    return '<div id="__loadInstallHint" style="display:none;position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;background:#1a1a2e;color:#f5f5f5;border-radius:14px;padding:16px 18px;box-shadow:0 12px 40px rgba(0,0,0,0.45);font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:16px;line-height:1.45;max-width:560px;margin:0 auto;">' +
      '<button aria-label="Dismiss" onclick="this.parentNode.remove()" style="position:absolute;top:8px;right:10px;background:transparent;border:none;color:#aaa;font-size:22px;cursor:pointer;padding:4px 8px;">&times;</button>' +
      '<div style="font-weight:700;font-size:17px;margin-bottom:6px;color:#a18cff;">&#128241; Save ' + safeName + ' to your Home Screen</div>' +
      '<div style="color:#d0d0d8;margin-bottom:10px;">To use this as an app (with icon, full-screen):</div>' +
      '<ol style="margin:0 0 10px 20px;padding:0;color:#e0e0e8;">' +
      '<li>Tap the <strong>Share</strong> button <span style="display:inline-block;width:18px;height:18px;border:1.5px solid #a18cff;border-radius:4px;vertical-align:middle;position:relative;top:-1px;">&#8593;</span> at the top of Safari</li>' +
      '<li>Scroll and tap <strong>Add to Home Screen</strong></li>' +
      '<li>Tap <strong>Add</strong> in the corner</li>' +
      '</ol>' +
      '<div style="font-size:13px;color:#9a9aa6;">Only shows once. Sent via <strong>Load</strong>.</div>' +
      '</div>' +
      '<script>(function(){try{' +
      // Never show when already running as a home-screen PWA
      'var standalone=window.matchMedia&&(window.matchMedia(\'(display-mode: standalone)\').matches||window.matchMedia(\'(display-mode: fullscreen)\').matches)||window.navigator.standalone===true;' +
      'if(standalone)return;' +
      // Dismiss persistence per-recipient (localStorage on the shared-file origin)
      'var seenKey="__load_a2hs_seen_v1";' +
      'if(localStorage.getItem(seenKey))return;' +
      // Pop after a short delay so the content paints first
      'setTimeout(function(){' +
      'var el=document.getElementById("__loadInstallHint");' +
      'if(el){el.style.display="block";try{localStorage.setItem(seenKey,"1")}catch(_){}}' +
      '},1200);' +
      '}catch(_){}})();<\/script>';
  }
  // Insert PWA-ready meta tags + an inline apple-touch-icon into an
  // HTML string. When the recipient taps Share → Add to Home Screen in
  // Safari, iOS picks up our title + icon and launches fullscreen.
  // Also injects an auto-popup banner into <body> that walks the
  // recipient through the Add-to-Home-Screen steps on first open.
  function enhanceHtmlForHomeScreen(html, app, iconDataUrl) {
    var metas = [];
    if (!/apple-mobile-web-app-capable/i.test(html)) {
      metas.push('<meta name="apple-mobile-web-app-capable" content="yes">');
    }
    metas.push('<meta name="apple-mobile-web-app-title" content="' + escHtml(app.name || 'Load PWA') + '">');
    if (!/apple-mobile-web-app-status-bar-style/i.test(html)) {
      metas.push('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">');
    }
    if (!/name=["']viewport/i.test(html)) {
      metas.push('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
    }
    if (!/<meta[^>]+charset/i.test(html)) {
      metas.push('<meta charset="UTF-8">');
    }
    if (iconDataUrl) {
      metas.push('<link rel="apple-touch-icon" href="' + iconDataUrl + '">');
      metas.push('<link rel="apple-touch-icon-precomposed" href="' + iconDataUrl + '">');
      metas.push('<link rel="icon" type="image/png" href="' + iconDataUrl + '">');
    }
    var headInjection = '\n' + metas.join('\n') + '\n';
    var bodyInjection = buildAddToHomeScreenBanner(app.name);
    // Multi-page router — only meaningfully useful on bundled PWAs,
    // but harmless on single-page files (fetch() fails, router yields
    // to native nav). Inject once per share regardless.
    var routerInjection = buildMultiPageRouterScript();
    var out = html;
    if (/<head[^>]*>/i.test(out)) {
      out = out.replace(/<head([^>]*)>/i, '<head$1>' + headInjection);
    } else {
      out = '<!DOCTYPE html><html><head>' + headInjection + '<title>' + escHtml(app.name || 'Load PWA') + '</title></head><body>' + out + '</body></html>';
    }
    // Inject the banner + router just before </body>. Router must run
    // after the bundle shim so the shim's fetch override is already
    // in place; appending at end of body satisfies that ordering.
    if (/<\/body>/i.test(out)) {
      out = out.replace(/<\/body>/i, bodyInjection + routerInjection + '</body>');
    } else {
      out += bodyInjection + routerInjection;
    }
    return out;
  }
  // Build the app's enhanced HTML once; every share format that needs
  // HTML starts from this (icon + PWA metas + A2HS popup + multi-page
  // router already injected).
  async function buildEnhancedShareHtml(app) {
    var html = '';
    if (app.kind === 'media' && app.binary) {
      toast('Preparing media file…');
      var buf = await app.binary.arrayBuffer();
      var b64 = arrayBufferToBase64(buf);
      var dataUrl = 'data:' + (app.mime || 'application/octet-stream') + ';base64,' + b64;
      html = buildStandaloneMediaPage(app, dataUrl);
    } else if (app.html) {
      html = app.html;
    } else {
      return null;
    }
    try {
      var iconDataUrl = await findOrGenerateAppIconDataUrl(app);
      html = enhanceHtmlForHomeScreen(html, app, iconDataUrl);
    } catch (e) { console.warn('PWA enhancement failed (still shareable)', e); }
    return html;
  }
  async function shareBlobOrDownload(blob, fileName, mime, successMsg) {
    var file;
    try { file = new File([blob], fileName, { type: mime }); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: fileName, files: [file] });
        toast(successMsg || 'Shared.');
        return true;
      } catch (e) { /* user canceled or API refused; fall back to download */ }
    }
    var url = URL.createObjectURL(blob);
    triggerAnchorDownload(url, fileName);
    toast('Exported ' + fileName + '.');
    return true;
  }
  // Main share entry point — presents a small picker so the user can
  // choose how the recipient will open the file. Default/most useful
  // for interactive PWAs is .webarchive (opens right in Safari, full JS).
  async function shareAsStandaloneHtml(app) {
    if (!app || (!app.html && !(app.kind === 'media' && app.binary))) {
      toast('Nothing to share for this item.', true); return;
    }
    openShareFormatPicker(app);
  }
  function openShareFormatPicker(app) {
    // Lightweight inline modal — built from scratch so we don't have to
    // edit index.html. Styled to match Load's dark theme palette.
    var existing = document.getElementById('__loadSharePicker');
    if (existing) existing.remove();
    var wrap = document.createElement('div');
    wrap.id = '__loadSharePicker';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);padding:20px;';
    wrap.innerHTML =
      '<div role="dialog" aria-label="Share as" style="background:var(--bg-1,#1a1a2e);color:var(--ink-hi,#f0f0f0);border-radius:16px;padding:22px 22px 18px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.55);max-height:92vh;overflow-y:auto;">' +
        '<div style="font-size:19px;font-weight:700;margin-bottom:4px;">Share ' + escHtml(app.name || 'this') + ' as&hellip;</div>' +
        '<div style="font-size:13px;color:var(--ink-mid,#a0a0b0);margin-bottom:16px;">Pick how the recipient should open it. All options keep the file 100% offline &mdash; nothing uploaded anywhere.</div>' +
        '<button data-format="webloc" class="seg-btn full" style="text-align:left;padding:14px 16px;margin-bottom:10px;background:var(--accent,#7b6cff);color:#12121a;border:none;border-radius:10px;font-weight:700;font-size:15px;display:block;width:100%;">' +
          '&#128279; Offline Link (.webloc) &nbsp;&mdash; <em style="font-weight:500;">recommended</em>' +
          '<div style="font-weight:400;font-size:12.5px;color:#2a2540;margin-top:3px;">Self-contained file. Recipient taps it &rarr; opens in Safari with full JS. Password, sidebar, audio, Add to Home Screen &mdash; all work. No hosting, no accounts, no installs.</div>' +
        '</button>' +
        '<button data-format="webarchive" class="seg-btn full" style="text-align:left;padding:14px 16px;margin-bottom:10px;background:var(--bg-2,#2a2a40);color:inherit;border:1px solid var(--border,#3a3a55);border-radius:10px;font-weight:600;font-size:15px;display:block;width:100%;">' +
          '&#128241; Safari App (.webarchive)' +
          '<div style="font-weight:400;font-size:12.5px;color:var(--ink-mid,#a0a0b0);margin-top:3px;">Fallback for large PWAs that don\'t fit in an Offline Link. Opens in Safari on iPad; JS support varies by iOS version.</div>' +
        '</button>' +
        '<button data-format="html" class="seg-btn full" style="text-align:left;padding:14px 16px;margin-bottom:10px;background:var(--bg-2,#2a2a40);color:inherit;border:1px solid var(--border,#3a3a55);border-radius:10px;font-weight:600;font-size:15px;display:block;width:100%;">' +
          '&#128196; Standalone HTML (.html)' +
          '<div style="font-weight:400;font-size:12.5px;color:var(--ink-mid,#a0a0b0);margin-top:3px;">For uploading to a host (GitHub Pages, Netlify). iPad preview blocks JS on raw .html &mdash; prefer Offline Link for direct sharing.</div>' +
        '</button>' +
        '<button data-format="epub" class="seg-btn full" style="text-align:left;padding:14px 16px;margin-bottom:10px;background:var(--bg-2,#2a2a40);color:inherit;border:1px solid var(--border,#3a3a55);border-radius:10px;font-weight:600;font-size:15px;display:block;width:100%;">' +
          '&#128214; Publish as EPUB (.epub) &nbsp;&mdash; reflowable' +
          '<div style="font-weight:400;font-size:12.5px;color:var(--ink-mid,#a0a0b0);margin-top:3px;">Best for novels &amp; non-fiction. For KDP Kindle, Apple Books, Kobo, Nook, Smashwords, Google Play. One file uploads to all of them.</div>' +
        '</button>' +
        '<button data-format="epub-fxl" class="seg-btn full" style="text-align:left;padding:14px 16px;margin-bottom:10px;background:var(--bg-2,#2a2a40);color:inherit;border:1px solid var(--border,#3a3a55);border-radius:10px;font-weight:600;font-size:15px;display:block;width:100%;">' +
          '&#128396;&#65039; Picture-Book EPUB (.epub) &nbsp;&mdash; fixed-layout' +
          '<div style="font-weight:400;font-size:12.5px;color:var(--ink-mid,#a0a0b0);margin-top:3px;">For picture books / illustrated kids\' books. Preserves the spread layout (image + text stay anchored). Required by KDP Kids; preferred by Apple Books for picture books.</div>' +
        '</button>' +
        '<button data-format="pdf" class="seg-btn full" style="text-align:left;padding:14px 16px;margin-bottom:10px;background:var(--bg-2,#2a2a40);color:inherit;border:1px solid var(--border,#3a3a55);border-radius:10px;font-weight:600;font-size:15px;display:block;width:100%;">' +
          '&#128209; Print PDF for KDP / IngramSpark' +
          '<div style="font-weight:400;font-size:12.5px;color:var(--ink-mid,#a0a0b0);margin-top:3px;">Uses your saved Layout (trim, bleed, margins, page numbers). Opens print preview &mdash; tap "Save to Files" to make a print-ready PDF.</div>' +
        '</button>' +
        '<button data-format="cancel" class="seg-btn full" style="text-align:center;padding:10px;background:transparent;color:var(--ink-mid,#a0a0b0);border:none;font-size:14px;margin-top:4px;">Cancel</button>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) { wrap.remove(); return; }
      var btn = e.target.closest ? e.target.closest('[data-format]') : null;
      if (!btn) return;
      var format = btn.getAttribute('data-format');
      wrap.remove();
      if (format === 'webloc') shareAsWebloc(app);
      else if (format === 'webarchive') shareAsWebArchive(app);
      else if (format === 'html') shareAsPlainHtml(app);
      else if (format === 'epub') exportAsEpub(app);
      else if (format === 'epub-fxl') exportAsFixedLayoutEpub(app);
      else if (format === 'pdf') exportAsPdf(app);
    });
  }
  async function shareAsWebloc(app) {
    toast('Packaging as offline link…');
    var html = await buildEnhancedShareHtml(app);
    if (!html) { toast('Nothing to share for this item.', true); return; }
    var dataUrl = await buildSelfContainedDataUrl(html);
    // iOS Safari caps data URL navigation — not documented but ~10 MB
    // works reliably on iOS 17+, older versions hold at ~2 MB. If the
    // payload is too big we advise the user and offer the webarchive
    // fallback so they're not stuck.
    var MAX_BYTES = 9.5 * 1024 * 1024;
    if (dataUrl.length > MAX_BYTES) {
      var mb = (dataUrl.length / (1024 * 1024)).toFixed(1);
      if (!confirm('This book is ' + mb + ' MB after compression — some iPads cap data URLs around 10 MB and may not open it. Try anyway? (Tap Cancel to use .webarchive instead.)')) {
        shareAsWebArchive(app);
        return;
      }
    }
    var xml = buildWeblocXml(dataUrl);
    var safeName = String(app.name || 'load-item').replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || 'load-item';
    var fileName = safeName + '.webloc';
    var blob = new Blob([xml], { type: 'application/x-webloc' });
    await shareBlobOrDownload(blob, fileName, 'application/x-webloc',
      'Shared as ' + fileName + '. Recipient taps it → opens in Safari with full features. No install, no hosting.');
  }
  async function shareAsWebArchive(app) {
    toast('Packaging as Safari app…');
    var html = await buildEnhancedShareHtml(app);
    if (!html) { toast('Nothing to share for this item.', true); return; }
    var safeName = String(app.name || 'load-item').replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || 'load-item';
    var fileName = safeName + '.webarchive';
    var pseudoUrl = 'https://load.local/' + encodeURIComponent(safeName) + '.html';
    var xml = buildWebArchiveXml(html, pseudoUrl, app.name);
    var blob = new Blob([xml], { type: 'application/x-webarchive' });
    await shareBlobOrDownload(blob, fileName, 'application/x-webarchive',
      'Shared as ' + fileName + '. Recipient taps it → opens in Safari with full features, then Share → Add to Home Screen.');
  }
  async function shareAsPlainHtml(app) {
    var html = await buildEnhancedShareHtml(app);
    if (!html) { toast('Nothing to share for this item.', true); return; }
    var safeName = String(app.name || 'load-item').replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || 'load-item';
    var fileName = safeName + '.html';
    var blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    await shareBlobOrDownload(blob, fileName, 'text/html',
      'Shared as ' + fileName + '. Best for uploading to a host — iPad preview blocks JavaScript on raw .html.');
  }

  /* ---------- EPUB 3 export ----------
     Produces a valid EPUB 3 file from any app whose `html` is editable
     book content. Output works for Amazon KDP (Kindle), Apple Books,
     Kobo, Barnes & Noble Nook Press, Smashwords / Draft2Digital, and
     Google Play Books — one file, every major retailer.

     Build steps:
       1. Read the source HTML into a DOM, isolate body content.
       2. Lift any data: image URLs into separate OEBPS/images/imgN.ext
          files; rewrite the <img src> to the relative path.
       3. Split the body into chapters at <h1> boundaries (one chapter
          file per <h1>). Falls back to a single chapter if no <h1>.
       4. Generate package.opf, nav.xhtml, toc.ncx, container.xml.
       5. Zip everything: mimetype first, STORE-compressed (uncompressed
          per the EPUB spec); every other entry DEFLATE-compressed. */
  async function exportAsEpub(app) {
    if (typeof JSZip === 'undefined') { toast('JSZip not loaded — cannot build EPUB.', true); return; }
    if (!app || !app.html) { toast('Nothing to export for this item.', true); return; }
    toast('Building EPUB…');
    try {
      var blob = await buildEpubBlob(app);
      var safeName = String(app.name || 'book').replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || 'book';
      var fileName = safeName + '.epub';
      await shareBlobOrDownload(blob, fileName, 'application/epub+zip',
        'Exported ' + fileName + '. Upload to KDP / Apple Books / Kobo / Nook directly.');
    } catch (e) {
      toast('EPUB export failed: ' + (e && e.message || e), true);
    }
  }

  /* ---------- EPUB 3 Fixed-Layout export ----------
     For picture books and any other book where the spread layout is
     part of the design. Required by KDP Kids and preferred by Apple
     Books for picture books because reflowable EPUB destroys the
     image+text positioning that defines a picture-book spread.

     Fixed-layout EPUB pins each page to a fixed viewport in pixels
     and tells the reader to display two pages side-by-side. Each
     page is one XHTML file with absolute positioning.

     Spec ref: https://www.w3.org/publishing/epub3/epub-rendering.html */
  async function exportAsFixedLayoutEpub(app) {
    if (typeof JSZip === 'undefined') { toast('JSZip not loaded — cannot build EPUB.', true); return; }
    if (!app || !app.html) { toast('Nothing to export for this item.', true); return; }
    toast('Building Fixed-Layout EPUB…');
    try {
      var blob = await buildFixedLayoutEpubBlob(app);
      var safeName = String(app.name || 'book').replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || 'book';
      var fileName = safeName + '-fxl.epub';
      await shareBlobOrDownload(blob, fileName, 'application/epub+zip',
        'Exported ' + fileName + '. Use the KDP "Children\'s Book" upload path.');
    } catch (e) {
      toast('Fixed-layout EPUB export failed: ' + (e && e.message || e), true);
    }
  }

  async function buildFixedLayoutEpubBlob(app) {
    var settings = Object.assign(defaultLayout(), app.layout || {});
    var trim = TRIM_PRESETS.filter(function (t) { return t.id === settings.trim; })[0] || TRIM_PRESETS[3];
    // Pick a sensible page viewport in pixels based on trim. KDP Kids
    // recommends 1600 px on the long edge minimum; we go higher for
    // sharper rendering on retina readers.
    var DPI = 200;
    var pageWPx = Math.round(trim.w * DPI);
    var pageHPx = Math.round(trim.h * DPI);

    var bookTitle = (app.name || 'Untitled Book').trim();

    // Build the page list using the same logic as the layout preview.
    var doc;
    try { doc = new DOMParser().parseFromString(app.html || '', 'text/html'); }
    catch (e) { throw new Error('Could not parse the source HTML.'); }
    var body = doc.body;
    if (!body) throw new Error('The source has no <body> to publish.');

    // Extract data: image URLs into separate files, just like the
    // reflowable exporter -- keeps the EPUB self-contained.
    var imageFiles = [];
    var imgs = body.querySelectorAll('img');
    var imgIdx = 0;
    for (var i = 0; i < imgs.length; i++) {
      var srcAttr = imgs[i].getAttribute('src') || '';
      if (!/^data:/i.test(srcAttr)) continue;
      var m = /^data:([^;,]+)(;base64)?,(.*)$/i.exec(srcAttr);
      if (!m) continue;
      var mime = m[1].toLowerCase();
      var isB64 = !!m[2];
      var data = m[3];
      var ext = mime.indexOf('jpeg') >= 0 ? 'jpg' :
                mime.indexOf('png') >= 0 ? 'png' :
                mime.indexOf('gif') >= 0 ? 'gif' :
                mime.indexOf('webp') >= 0 ? 'webp' :
                mime.indexOf('svg') >= 0 ? 'svg' : 'bin';
      var name = 'img' + (++imgIdx) + '.' + ext;
      var bytes = isB64 ? base64ToBytes(data) : new TextEncoder().encode(decodeURIComponent(data));
      imageFiles.push({ name: name, path: 'OEBPS/images/' + name, bytes: bytes, mime: mime });
      imgs[i].setAttribute('src', 'images/' + name);
      if (!imgs[i].hasAttribute('alt')) imgs[i].setAttribute('alt', '');
    }

    // Build pages with picture-book role logic if applicable.
    var pages = [];
    var isPicBook = !!PICTURE_BOOK_TEMPLATES[settings.bookType];
    var contentChunks = paginateForPreview(body.innerHTML, trim.w, trim.h,
      0.5, settings.marginOutside, settings.marginTop, settings.marginBottom);
    if (isPicBook) {
      var total = picBookPageCount(settings.bookType, settings.customPageCount);
      var STRUCTURAL_FRONT = 5, STRUCTURAL_BACK = 3;
      var storyPageCount = total - STRUCTURAL_FRONT - STRUCTURAL_BACK;
      var perPage = Math.max(1, Math.ceil(contentChunks.length / Math.max(1, storyPageCount)));
      for (var pn = 1; pn <= total; pn++) {
        var role = pageRoleForPictureBook(pn, total);
        var isStructural = pn <= STRUCTURAL_FRONT || pn > total - STRUCTURAL_BACK;
        var pageHtml = '';
        if (!isStructural) {
          var storyIdx = pn - STRUCTURAL_FRONT - 1;
          var fromIdx = storyIdx * perPage;
          var toIdx = Math.min(contentChunks.length, fromIdx + perPage);
          pageHtml = contentChunks.slice(fromIdx, toIdx).join('');
        } else {
          // Structural pages get a clean placeholder so a KDP reviewer
          // can see the role; creator can replace before final upload.
          pageHtml = '<div style="text-align:center;padding:40px 30px;color:#888;font-style:italic;">' + escXml(role) + '</div>';
        }
        pages.push({ index: pn, role: role, html: pageHtml });
      }
    } else {
      pages = contentChunks.map(function (h, i) { return { index: i + 1, role: '', html: h }; });
    }

    // Build chapter XHTML files (one per page). Use absolute positioning
    // inside a viewport-sized div so reader rendering matches design.
    var chapterFiles = [];
    pages.forEach(function (pg, idx) {
      var chId = 'p' + (idx + 1);
      var spread = (idx === 0) ? 'page-spread-right' :     // page 1 always recto
                   (idx % 2 === 1) ? 'page-spread-left' :   // page 2 = left/verso
                                     'page-spread-right';  // page 3 = right/recto, ...
      var xhtml =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!DOCTYPE html>\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">\n' +
        '<head>\n' +
        '<meta charset="UTF-8"/>\n' +
        '<meta name="viewport" content="width=' + pageWPx + ', height=' + pageHPx + '"/>\n' +
        '<title>' + escXml(bookTitle) + ' — page ' + (idx + 1) + '</title>\n' +
        '<link rel="stylesheet" type="text/css" href="css/style.css"/>\n' +
        '</head>\n' +
        '<body>\n' +
        '<div class="page" style="width:' + pageWPx + 'px;height:' + pageHPx + 'px;position:relative;overflow:hidden;">' +
        pg.html +
        '</div>\n' +
        '</body>\n</html>\n';
      chapterFiles.push({ id: chId, hrefRel: chId + '.xhtml', path: 'OEBPS/' + chId + '.xhtml', content: xhtml, spread: spread });
    });

    var bookId = 'urn:uuid:' + uuid4();
    var nowIso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

    var containerXml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n' +
      '<rootfiles>\n' +
      '<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n' +
      '</rootfiles>\n' +
      '</container>\n';

    var styleCss =
      'html, body { margin: 0; padding: 0; }\n' +
      '.page { font-family: Georgia, "Times New Roman", serif; line-height: 1.4; }\n' +
      '.page p { margin: 0 0 0.7em 0; padding: 0 30px; }\n' +
      '.page h1 { font-size: 2em; text-align: center; margin: 0.5em 0; }\n' +
      '.page img { max-width: 100%; height: auto; display: block; }\n';

    var manifest = [];
    manifest.push('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>');
    manifest.push('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>');
    manifest.push('<item id="css" href="css/style.css" media-type="text/css"/>');
    chapterFiles.forEach(function (c) {
      manifest.push('<item id="' + c.id + '" href="' + c.hrefRel + '" media-type="application/xhtml+xml"/>');
    });
    imageFiles.forEach(function (img, ix) {
      manifest.push('<item id="img' + (ix + 1) + '" href="images/' + img.name + '" media-type="' + img.mime + '"/>');
    });

    var spineRefs = chapterFiles.map(function (c) {
      return '<itemref idref="' + c.id + '" properties="' + c.spread + '"/>';
    }).join('\n');

    var contentOpf =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"' +
      ' xml:lang="en" prefix="rendition: http://www.idpf.org/vocab/rendition/#">\n' +
      '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
      '<dc:identifier id="bookid">' + escXml(bookId) + '</dc:identifier>\n' +
      '<dc:title>' + escXml(bookTitle) + '</dc:title>\n' +
      '<dc:language>en</dc:language>\n' +
      '<dc:creator>' + escXml(app.author || 'Unknown') + '</dc:creator>\n' +
      '<meta property="dcterms:modified">' + nowIso + '</meta>\n' +
      // Fixed-layout rendition properties
      '<meta property="rendition:layout">pre-paginated</meta>\n' +
      '<meta property="rendition:orientation">auto</meta>\n' +
      '<meta property="rendition:spread">both</meta>\n' +
      '</metadata>\n' +
      '<manifest>\n' + manifest.join('\n') + '\n</manifest>\n' +
      '<spine toc="ncx">\n' + spineRefs + '\n</spine>\n' +
      '</package>\n';

    var navList = chapterFiles.map(function (c, ix) {
      var label = pages[ix].role || ('Page ' + (ix + 1));
      return '<li><a href="' + c.hrefRel + '">' + escXml(label) + '</a></li>';
    }).join('\n');
    var navXhtml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE html>\n' +
      '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">\n' +
      '<head><meta charset="UTF-8"/><title>' + escXml(bookTitle) + ' — Contents</title></head>\n' +
      '<body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>\n' + navList + '\n</ol></nav></body></html>\n';

    var ncxNavPoints = chapterFiles.map(function (c, ix) {
      var label = pages[ix].role || ('Page ' + (ix + 1));
      return '<navPoint id="np' + (ix + 1) + '" playOrder="' + (ix + 1) + '">' +
        '<navLabel><text>' + escXml(label) + '</text></navLabel>' +
        '<content src="' + c.hrefRel + '"/></navPoint>';
    }).join('\n');
    var tocNcx =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">\n' +
      '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n' +
      '<head>\n' +
      '<meta name="dtb:uid" content="' + escXml(bookId) + '"/>\n' +
      '<meta name="dtb:depth" content="1"/>\n' +
      '<meta name="dtb:totalPageCount" content="0"/>\n' +
      '<meta name="dtb:maxPageNumber" content="0"/>\n' +
      '</head>\n' +
      '<docTitle><text>' + escXml(bookTitle) + '</text></docTitle>\n' +
      '<navMap>\n' + ncxNavPoints + '\n</navMap>\n' +
      '</ncx>\n';

    var zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
    zip.file('META-INF/container.xml', containerXml);
    zip.file('OEBPS/content.opf', contentOpf);
    zip.file('OEBPS/nav.xhtml', navXhtml);
    zip.file('OEBPS/toc.ncx', tocNcx);
    zip.file('OEBPS/css/style.css', styleCss);
    chapterFiles.forEach(function (c) { zip.file(c.path, c.content); });
    imageFiles.forEach(function (img) { zip.file(img.path, img.bytes); });
    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  async function buildEpubBlob(app) {
    var rawHtml = app.html || '';
    var doc;
    try { doc = new DOMParser().parseFromString(rawHtml, 'text/html'); }
    catch (e) { throw new Error('Could not parse the source HTML.'); }

    var bookTitle = (app.name || 'Untitled Book').trim();
    var titleEl = doc.querySelector('title');
    if (titleEl && titleEl.textContent.trim()) bookTitle = titleEl.textContent.trim();

    // Walk body, extract data: image URLs into separate files
    var body = doc.body;
    if (!body) throw new Error('The source has no <body> to publish.');

    var imageFiles = []; // [{path, bytes, mime}]
    var imgs = body.querySelectorAll('img');
    var imgIdx = 0;
    for (var i = 0; i < imgs.length; i++) {
      var srcAttr = imgs[i].getAttribute('src') || '';
      if (!/^data:/i.test(srcAttr)) continue;
      var m = /^data:([^;,]+)(;base64)?,(.*)$/i.exec(srcAttr);
      if (!m) continue;
      var mime = m[1].toLowerCase();
      var isB64 = !!m[2];
      var data = m[3];
      var ext = mime.indexOf('jpeg') >= 0 ? 'jpg' :
                mime.indexOf('png') >= 0 ? 'png' :
                mime.indexOf('gif') >= 0 ? 'gif' :
                mime.indexOf('webp') >= 0 ? 'webp' :
                mime.indexOf('svg') >= 0 ? 'svg' :
                'bin';
      var name = 'img' + (++imgIdx) + '.' + ext;
      var path = 'OEBPS/images/' + name;
      var bytes;
      if (isB64) bytes = base64ToBytes(data);
      else bytes = new TextEncoder().encode(decodeURIComponent(data));
      imageFiles.push({ path: path, bytes: bytes, mime: mime });
      imgs[i].setAttribute('src', 'images/' + name);
      // Self-closing alt is required for valid XHTML; ensure attr exists
      if (!imgs[i].hasAttribute('alt')) imgs[i].setAttribute('alt', '');
    }

    // Split into chapters at <h1>
    var chapters = splitBodyIntoChapters(body, bookTitle);

    // Build the chapter XHTML files
    var chapterFiles = []; // [{path, manifestId, mediaType, content, navTitle}]
    for (var ci = 0; ci < chapters.length; ci++) {
      var ch = chapters[ci];
      var chId = 'ch' + (ci + 1);
      var xhtmlPath = 'OEBPS/' + chId + '.xhtml';
      var xhtml =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!DOCTYPE html>\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">\n' +
        '<head>\n' +
        '<meta charset="UTF-8"/>\n' +
        '<title>' + escXml(ch.title) + '</title>\n' +
        '<link rel="stylesheet" type="text/css" href="css/style.css"/>\n' +
        '</head>\n' +
        '<body>\n' +
        ch.html +
        '\n</body>\n</html>\n';
      chapterFiles.push({ path: xhtmlPath, id: chId, mediaType: 'application/xhtml+xml', content: xhtml, navTitle: ch.title, hrefRel: chId + '.xhtml' });
    }

    var bookId = 'urn:uuid:' + uuid4();

    var containerXml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n' +
      '<rootfiles>\n' +
      '<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n' +
      '</rootfiles>\n' +
      '</container>\n';

    var styleCss =
      'body { font-family: Georgia, "Times New Roman", serif; line-height: 1.55; margin: 0 1em; }\n' +
      'h1, h2, h3, h4, h5, h6 { line-height: 1.25; }\n' +
      'h1 { font-size: 1.6em; margin: 1.2em 0 0.6em; }\n' +
      'h2 { font-size: 1.3em; margin: 1.1em 0 0.4em; }\n' +
      'p { margin: 0 0 0.7em; text-indent: 1.2em; }\n' +
      'p:first-of-type { text-indent: 0; }\n' +
      'blockquote { margin: 1em 1.4em; font-style: italic; }\n' +
      'img { max-width: 100%; height: auto; display: block; margin: 1em auto; }\n' +
      'pre { white-space: pre-wrap; }\n' +
      'ul, ol { margin: 0.5em 0 1em 1.4em; }\n' +
      'hr { border: none; border-top: 1px solid #888; margin: 2em 0; }\n';

    // Build manifest items
    var manifestItems = [];
    manifestItems.push('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>');
    manifestItems.push('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>');
    manifestItems.push('<item id="css" href="css/style.css" media-type="text/css"/>');
    chapterFiles.forEach(function (c) {
      manifestItems.push('<item id="' + c.id + '" href="' + c.hrefRel + '" media-type="' + c.mediaType + '"/>');
    });
    imageFiles.forEach(function (img, ix) {
      var rel = 'images/' + img.path.split('/').pop();
      manifestItems.push('<item id="img' + (ix + 1) + '" href="' + rel + '" media-type="' + img.mime + '"/>');
    });

    var spineItems = chapterFiles.map(function (c) {
      return '<itemref idref="' + c.id + '"/>';
    }).join('\n');

    var nowIso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

    var contentOpf =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="en">\n' +
      '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
      '<dc:identifier id="bookid">' + escXml(bookId) + '</dc:identifier>\n' +
      '<dc:title>' + escXml(bookTitle) + '</dc:title>\n' +
      '<dc:language>en</dc:language>\n' +
      '<dc:creator>' + escXml(app.author || 'Unknown') + '</dc:creator>\n' +
      '<meta property="dcterms:modified">' + nowIso + '</meta>\n' +
      '</metadata>\n' +
      '<manifest>\n' + manifestItems.join('\n') + '\n</manifest>\n' +
      '<spine toc="ncx">\n' + spineItems + '\n</spine>\n' +
      '</package>\n';

    var navList = chapterFiles.map(function (c) {
      return '<li><a href="' + c.hrefRel + '">' + escXml(c.navTitle) + '</a></li>';
    }).join('\n');
    var navXhtml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE html>\n' +
      '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">\n' +
      '<head><meta charset="UTF-8"/><title>' + escXml(bookTitle) + ' — Contents</title></head>\n' +
      '<body>\n' +
      '<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>\n' + navList + '\n</ol></nav>\n' +
      '</body></html>\n';

    var ncxNavPoints = chapterFiles.map(function (c, ix) {
      return '<navPoint id="np' + (ix + 1) + '" playOrder="' + (ix + 1) + '">' +
        '<navLabel><text>' + escXml(c.navTitle) + '</text></navLabel>' +
        '<content src="' + c.hrefRel + '"/></navPoint>';
    }).join('\n');
    var tocNcx =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">\n' +
      '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n' +
      '<head>\n' +
      '<meta name="dtb:uid" content="' + escXml(bookId) + '"/>\n' +
      '<meta name="dtb:depth" content="1"/>\n' +
      '<meta name="dtb:totalPageCount" content="0"/>\n' +
      '<meta name="dtb:maxPageNumber" content="0"/>\n' +
      '</head>\n' +
      '<docTitle><text>' + escXml(bookTitle) + '</text></docTitle>\n' +
      '<navMap>\n' + ncxNavPoints + '\n</navMap>\n' +
      '</ncx>\n';

    // Assemble the zip. mimetype MUST be the first entry, STORE-compressed.
    var zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
    zip.file('META-INF/container.xml', containerXml);
    zip.file('OEBPS/content.opf', contentOpf);
    zip.file('OEBPS/nav.xhtml', navXhtml);
    zip.file('OEBPS/toc.ncx', tocNcx);
    zip.file('OEBPS/css/style.css', styleCss);
    chapterFiles.forEach(function (c) { zip.file(c.path, c.content); });
    imageFiles.forEach(function (img) { zip.file(img.path, img.bytes); });

    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  // Walk the body and split it into chapter chunks at <h1> boundaries.
  // Returns [{title, html}, ...]. If there are no <h1> elements, returns
  // a single chapter holding the whole body.
  function splitBodyIntoChapters(body, bookTitle) {
    var children = Array.prototype.slice.call(body.childNodes);
    var h1s = body.querySelectorAll('h1');
    if (!h1s.length) {
      return [{ title: bookTitle, html: body.innerHTML }];
    }
    var chapters = [];
    var current = null;
    function flush() {
      if (current) {
        // Convert the buffered child nodes to an XHTML-safe string
        var wrapper = body.ownerDocument.createElement('div');
        current.nodes.forEach(function (n) { wrapper.appendChild(n.cloneNode(true)); });
        chapters.push({ title: current.title, html: serializeForXhtml(wrapper) });
      }
    }
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      var isH1 = node.nodeType === 1 && node.tagName.toLowerCase() === 'h1';
      // Skip the auto-injected book-title H1 (class="book-title") so it
      // doesn't become its own ghost chapter
      var isBookTitleH1 = isH1 && node.classList && node.classList.contains('book-title');
      if (isH1 && !isBookTitleH1) {
        flush();
        current = { title: (node.textContent || 'Chapter ' + (chapters.length + 1)).trim(), nodes: [node] };
      } else if (current) {
        current.nodes.push(node);
      } else if (!isBookTitleH1) {
        // Content before the first H1 — gather under "Front Matter"
        if (!chapters.length) {
          current = { title: 'Front Matter', nodes: [node] };
        }
      }
    }
    flush();
    if (!chapters.length) {
      return [{ title: bookTitle, html: body.innerHTML }];
    }
    return chapters;
  }

  // Serialize a DOM tree into XHTML-safe markup. innerHTML is HTML5,
  // which is mostly fine for EPUB readers, but void elements need to
  // self-close to satisfy strict validators.
  function serializeForXhtml(node) {
    var html = node.innerHTML || '';
    // Self-close common void elements: <br>, <hr>, <img>, <meta>, <link>,
    // <input>. Only target the ones we actually emit; over-broad rewrites
    // can corrupt content.
    html = html.replace(/<br\s*>/gi, '<br/>');
    html = html.replace(/<hr\s*>/gi, '<hr/>');
    html = html.replace(/<img([^>]*?)>/gi, function (_m, attrs) {
      // Already self-closing? Leave it.
      if (/\/\s*$/.test(attrs)) return '<img' + attrs + '>';
      return '<img' + attrs + '/>';
    });
    return html;
  }

  function escXml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function uuid4() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    // RFC4122 v4 fallback
    var b = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  function base64ToBytes(b64) {
    var bin = atob(b64);
    var len = bin.length;
    var out = new Uint8Array(len);
    for (var i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
    return out;
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
    // Home Dashboard workspace tiles. Each one is a one-tap shortcut
    // to a workspace tool, mirroring the Workspace hub for users who
    // want to jump straight in without going through Import first.
    document.querySelectorAll('[data-home-ws]').forEach(function (tile) {
      tile.addEventListener('click', function () {
        var act = tile.getAttribute('data-home-ws');
        if (act === 'hub') openWorkspaceHub();
        else if (act === 'doctor') {
          if (typeof openDevConsole === 'function') openDevConsole();
        }
        else if (act === 'copilot') {
          if (typeof openHelperPanel === 'function') openHelperPanel();
        }
        else if (act === 'help') {
          var helpBtn = document.querySelector('[data-tool="help"]');
          if (helpBtn) helpBtn.click();
        }
      });
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
        else if (t === 'manuscript') picker.setAttribute('accept', '.docx,.txt,.md,.markdown,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        else if (t === 'video-edit') {
          picker.setAttribute('accept', 'video/*,.mp4,.mov,.m4v,.webm,.mkv');
          picker.dataset.openVideoEditor = '1';
          // VN-style picker first — gives users Recents (existing
          // library media), Stocks (paste-URL), and Subtitle nav
          // before falling back to the iPad file picker.
          openMediaPicker({ filter: 'video', openVideoAfter: true });
          return;
        }
        else if (t === 'workspace') {
          // Workspace card opens the project workspace hub instead
          // of the file picker. From there the user can jump to any
          // Load tool with a one-line direction telling them what
          // each one does.
          openWorkspaceHub();
          return;
        }
        else if (t === 'media') {
          picker.setAttribute('accept', 'video/*,audio/*,image/*,.mp4,.mov,.m4v,.webm,.mp3,.m4a,.wav,.ogg,.aac,.jpg,.jpeg,.png,.gif,.webp');
          openMediaPicker({ filter: 'all' });
          return;
        }
        else if (t === 'zip') {
          // Web apps card: show the PWA help modal first; modal's "Pick" button opens picker
          picker.setAttribute('accept', '.zip,.html,.htm,application/zip,text/html');
          $('pwa-modal').classList.add('on');
          return;
        } else {
          picker.setAttribute('accept', '.html,.htm,.zip,.pdf,.epub,.docx,.txt,.md,.markdown,.mp4,.mov,.mp3,.m4a,.jpg,.png,.gif,.webp');
        }
        picker.click();
      });
    });
  }

  /* ---------- Library search ----------
   * Opens a search bar when the 🔍 button is tapped. Filters tiles as
   * you type across name, notes, kind (pdf/epub/html/zip/media), folder
   * name, and a short preview of the inlined HTML so keyword matches
   * inside documents also work. iPad Safari can be flaky about which
   * input events fire, so we listen to input + keyup + change together. */
  var searchQuery = '';
  var searchBarEl = null;
  function toggleLibrarySearch() {
    searchBarEl = searchBarEl || $('library-search');
    if (!searchBarEl) return;
    var isOpen = searchBarEl.classList.toggle('on');
    var input = $('library-search-input');
    if (isOpen) {
      setTimeout(function () { input.focus(); input.select && input.select(); }, 30);
    }
    // Closing the bar hides it but keeps the query so reopening resumes.
    // If the user wants to clear, they tap the × Clear button.
  }
  function applySearchFromInput(el) {
    searchQuery = String((el && el.value) || '').trim().toLowerCase();
    renderLibrary();
  }
  function wireLibrarySearch() {
    var btn = $('library-search-btn');
    var clearBtn = $('library-search-clear');
    var input = $('library-search-input');
    if (!btn || !clearBtn || !input) return;
    btn.addEventListener('click', toggleLibrarySearch);
    clearBtn.addEventListener('click', function () {
      input.value = '';
      searchQuery = '';
      renderLibrary();
      input.focus();
    });
    // Belt-and-suspenders: iPad Safari sometimes skips `input` on
    // search-type fields when autocorrect strips characters. Listening
    // to all three guarantees the filter runs.
    ['input', 'keyup', 'change', 'search'].forEach(function (ev) {
      input.addEventListener(ev, function (e) { applySearchFromInput(e.target); });
    });
  }
  function folderNameFor(id) {
    try {
      var folders = loadFolders();
      for (var i = 0; i < folders.length; i++) if (folders[i].id === id) return folders[i].name || '';
    } catch (e) {}
    return '';
  }
  function searchHay(a) {
    var kind = (a.kind || 'html');
    var folderName = a.folderId ? folderNameFor(a.folderId) : '';
    var preview = '';
    if (typeof a.html === 'string') {
      // Strip tags for a rough textual preview, cap length to keep it fast.
      preview = a.html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
                      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                      .replace(/<[^>]+>/g, ' ')
                      .slice(0, 4000);
    }
    return ((a.name || '') + ' ' + (a.notes || '') + ' ' + kind + ' ' + folderName + ' ' + preview).toLowerCase();
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
  function saveCurrentAppAsTemplate() {
    if (!currentApp) {
      toast('Open a file first, then save it as a template.', true);
      return;
    }
    var html = currentApp.html || '';
    if (!html || html.length < 30) {
      toast('This file has no HTML to save.', true);
      return;
    }
    var suggested = (currentApp.name || 'Untitled') + ' — template';
    var name = prompt('Save this page as a template.\n\nTemplates show up on the Create screen — pick one later to start a new page with the same layout.\n\nName:', suggested);
    if (!name) return;
    name = String(name).trim();
    if (!name) return;
    var list = loadUserTemplates();
    list.push({
      id: 'tpl-raw-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name: name,
      type: 'raw',
      html: html,
      sourceName: currentApp.name,
      sourceKind: currentApp.kind || 'html',
      dateAdded: Date.now()
    });
    saveUserTemplates(list);
    toast('✓ Saved "' + name + '" as a template. Find it on the Create screen.');
  }
  function wireSaveTemplate() {
    var btn = $('save-template-btn');
    if (btn) btn.addEventListener('click', saveCurrentAppAsTemplate);
  }

  /* ---------- KDP page layout view ----------
     Wraps the open manuscript in a print-aware preview: KDP trim
     presets, bleed/margin overlays, page numbers, full-bleed image
     mode for children's books. Settings are stored on app.layout so
     the PDF export step can re-use them without re-prompting. */

  // Popular KDP / IngramSpark trim sizes (width x height in inches).
  // Source: KDP Help -- Print Specifications.
  var TRIM_PRESETS = [
    { id: '5x8',     label: '5 × 8 in',     w: 5,    h: 8,    notes: 'Paperback novel' },
    { id: '5.25x8',  label: '5.25 × 8 in',  w: 5.25, h: 8,    notes: 'Paperback novel' },
    { id: '5.5x8.5', label: '5.5 × 8.5 in', w: 5.5,  h: 8.5,  notes: 'Paperback novel' },
    { id: '6x9',     label: '6 × 9 in',     w: 6,    h: 9,    notes: 'Most common -- fiction & non-fiction' },
    { id: '7x10',    label: '7 × 10 in',    w: 7,    h: 10,   notes: 'Workbook / large paperback' },
    { id: '8x10',    label: '8 × 10 in',    w: 8,    h: 10,   notes: 'Children / workbook' },
    { id: '8.5x8.5', label: '8.5 × 8.5 in', w: 8.5,  h: 8.5,  notes: "Children's picture book (square)" },
    { id: '8.5x11',  label: '8.5 × 11 in',  w: 8.5,  h: 11,   notes: 'Workbook / journal / manual' }
  ];

  // KDP gutter (inside margin) tiers based on total page count.
  function gutterForPageCount(pageCount) {
    if (pageCount <= 150) return 0.375;
    if (pageCount <= 300) return 0.5;
    if (pageCount <= 500) return 0.625;
    if (pageCount <= 700) return 0.75;
    return 0.875;
  }

  function defaultLayout() {
    return {
      trim: '6x9',
      bleed: false,
      pageNumbers: true,
      pageNumberPosition: 'outside', // 'centered' | 'outside'
      marginTop: 0.75,
      marginBottom: 0.75,
      marginOutside: 0.5,
      headerText: '',
      footerText: '',
      bookType: 'standard',  // 'standard' | 'picture-24/32/40/48/custom'
      view: 'schema',        // 'schema' | 'flip' | 'spread' | 'stacked'
      customPageCount: 32    // used only when bookType === 'picture-custom'
    };
  }

  // Picture-book industry standards. KDP Kids accepts picture books in
  // multiples of 4. 32 is the most common because it efficiently uses
  // a single signature on the press; 24 / 40 / 48 also common.
  // 'picture-custom' uses settings.customPageCount so the user can
  // pick non-standard counts (28, 36, 56, board books, etc.).
  // Each template fixes the total page count and the structural
  // (non-story) pages: cover paste, end papers, title, copyright,
  // dedication, back-matter, back cover paste.
  var PICTURE_BOOK_TEMPLATES = {
    'picture-24':     { pages: 24, label: "Picture book — 24 pages" },
    'picture-32':     { pages: 32, label: "Picture book — 32 pages (industry standard)" },
    'picture-40':     { pages: 40, label: "Picture book — 40 pages" },
    'picture-48':     { pages: 48, label: "Picture book — 48 pages" },
    'picture-custom': { pages: 0,  label: "Picture book — custom page count" }   // pages filled in from settings.customPageCount at render time
  };

  // Returns the effective page count for a picture-book template. For
  // 'picture-custom' the user-entered value drives this; for the
  // canonical sizes the template fixes it.
  function picBookPageCount(bookType, customPageCount) {
    if (bookType !== 'picture-custom') {
      return PICTURE_BOOK_TEMPLATES[bookType] && PICTURE_BOOK_TEMPLATES[bookType].pages;
    }
    var n = parseInt(customPageCount, 10) || 32;
    // Clamp to KDP rules: even, 16-64. 16 covers board books; 64 is
    // a high cap for picture books (anything taller usually goes
    // chapter-book / middle-grade format).
    if (n < 16) n = 16;
    if (n > 64) n = 64;
    if (n % 2 !== 0) n += 1;
    return n;
  }

  // Returns the human label for a given printed page in a picture-book
  // template. Page numbering starts at 1 = front cover paste-down (not
  // visible to reader). Returns 'Spread N' for story pages so the
  // creator can see how their content will distribute.
  function pageRoleForPictureBook(pageNum, totalPages) {
    if (pageNum === 1) return 'Front Cover (paste-down)';
    if (pageNum === 2) return 'Inside Front Cover (end paper)';
    if (pageNum === 3) return 'Title Page';
    if (pageNum === 4) return 'Copyright';
    if (pageNum === 5) return 'Dedication';
    if (pageNum === totalPages)     return 'Back Cover (paste-down)';
    if (pageNum === totalPages - 1) return 'Inside Back Cover (end paper)';
    if (pageNum === totalPages - 2) return 'Author Bio / Back Matter';
    // Story pages: pair into spreads. Story starts at page 6.
    var storyPage = pageNum - 6;            // 0-indexed within story area
    var spreadIdx = Math.floor(storyPage / 2) + 1;
    return 'Story Spread ' + spreadIdx;
  }

  function openLayoutView(app) {
    if (!app || !app.html) { toast('Open a manuscript first.', true); return; }
    var settings = Object.assign(defaultLayout(), app.layout || {});

    var existing = document.getElementById('__loadLayout');
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.id = '__loadLayout';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2000;display:flex;flex-direction:column;background:#0f0f1a;color:#f0f0f0;font-family:-apple-system,sans-serif;';

    var trimOptions = TRIM_PRESETS.map(function (t) {
      return '<option value="' + t.id + '"' + (t.id === settings.trim ? ' selected' : '') + '>' + t.label + ' — ' + t.notes + '</option>';
    }).join('');

    var bookTypeOptions =
      '<option value="standard"' + (settings.bookType === 'standard' ? ' selected' : '') + '>Standard novel / non-fiction</option>' +
      Object.keys(PICTURE_BOOK_TEMPLATES).map(function (k) {
        var t = PICTURE_BOOK_TEMPLATES[k];
        return '<option value="' + k + '"' + (settings.bookType === k ? ' selected' : '') + '>' + t.label + '</option>';
      }).join('');

    wrap.innerHTML =
      '<div class="ll-bar" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1a1a2e;border-bottom:1px solid #2a2a40;flex-wrap:wrap;">' +
        '<button id="ll-close" style="background:#3a3a55;border:none;color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;cursor:pointer;">&larr; Close</button>' +
        '<div style="font-weight:700;font-size:15px;margin-right:auto;">Layout for Print &mdash; ' + escHtml(app.name || 'Untitled') + '</div>' +
        '<label style="font-size:12.5px;color:#a0a0b0;">Book ' +
          '<select id="ll-booktype" style="margin-left:6px;padding:6px 8px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:13px;">' + bookTypeOptions + '</select>' +
        '</label>' +
        '<label id="ll-pages-label" style="font-size:12.5px;color:#a0a0b0;display:' + (settings.bookType === 'picture-custom' ? 'inline-flex' : 'none') + ';align-items:center;gap:4px;">Pages ' +
          '<input id="ll-pages" type="number" min="16" max="64" step="2" value="' + (settings.customPageCount || 32) + '" style="width:60px;padding:6px 8px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:13px;">' +
        '</label>' +
        '<label style="font-size:12.5px;color:#a0a0b0;">Trim ' +
          '<select id="ll-trim" style="margin-left:6px;padding:6px 8px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:13px;">' + trimOptions + '</select>' +
        '</label>' +
        '<label style="font-size:12.5px;color:#a0a0b0;">View ' +
          '<select id="ll-view" style="margin-left:6px;padding:6px 8px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:13px;">' +
            '<option value="schema"' + (settings.view === 'schema' ? ' selected' : '') + '>Schema overview (whole book)</option>' +
            '<option value="flip"' + (settings.view === 'flip' ? ' selected' : '') + '>Flip book (one spread at a time)</option>' +
            '<option value="spread"' + (settings.view === 'spread' ? ' selected' : '') + '>Side-by-side spreads (scroll all)</option>' +
            '<option value="stacked"' + (settings.view === 'stacked' ? ' selected' : '') + '>Stacked pages (scroll all)</option>' +
          '</select>' +
        '</label>' +
        '<label style="font-size:12.5px;color:#a0a0b0;display:inline-flex;align-items:center;gap:4px;">' +
          '<input id="ll-bleed" type="checkbox"' + (settings.bleed ? ' checked' : '') + '> Bleed (full-bleed images)' +
        '</label>' +
        '<label style="font-size:12.5px;color:#a0a0b0;display:inline-flex;align-items:center;gap:4px;">' +
          '<input id="ll-pn" type="checkbox"' + (settings.pageNumbers ? ' checked' : '') + '> Page numbers' +
        '</label>' +
        '<select id="ll-pnpos" style="padding:6px 8px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:13px;">' +
          '<option value="outside"' + (settings.pageNumberPosition === 'outside' ? ' selected' : '') + '>Outside corner</option>' +
          '<option value="centered"' + (settings.pageNumberPosition === 'centered' ? ' selected' : '') + '>Centered</option>' +
        '</select>' +
        '<button id="ll-save" style="background:#7b6cff;border:none;color:#12121a;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Save layout</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:14px;padding:8px 14px;background:#15152a;border-bottom:1px solid #2a2a40;font-size:12px;color:#a0a0b0;flex-wrap:wrap;">' +
        '<div>Header text <input id="ll-header" value="' + escHtml(settings.headerText || '') + '" placeholder="(optional book title)" style="margin-left:6px;padding:5px 8px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:5px;font-size:12.5px;width:180px;"></div>' +
        '<div>Footer text <input id="ll-footer" value="' + escHtml(settings.footerText || '') + '" placeholder="(optional)" style="margin-left:6px;padding:5px 8px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:5px;font-size:12.5px;width:180px;"></div>' +
        '<div id="ll-pagecount" style="margin-left:auto;font-weight:600;color:#cfcfdc;">Estimating pages…</div>' +
        '<div id="ll-gutter" style="color:#a0a0b0;"></div>' +
      '</div>' +
      '<div style="flex:1;overflow:hidden;background:#222232;">' +
        '<iframe id="ll-preview" style="width:100%;height:100%;border:none;background:#444;"></iframe>' +
      '</div>';

    document.body.appendChild(wrap);

    var iframe = document.getElementById('ll-preview');

    function readSettings() {
      return {
        trim: document.getElementById('ll-trim').value,
        bleed: document.getElementById('ll-bleed').checked,
        pageNumbers: document.getElementById('ll-pn').checked,
        pageNumberPosition: document.getElementById('ll-pnpos').value,
        marginTop: settings.marginTop,
        marginBottom: settings.marginBottom,
        marginOutside: settings.marginOutside,
        headerText: document.getElementById('ll-header').value,
        footerText: document.getElementById('ll-footer').value,
        bookType: document.getElementById('ll-booktype').value,
        view: document.getElementById('ll-view').value,
        customPageCount: parseInt(document.getElementById('ll-pages').value, 10) || 32
      };
    }

    function rebuild() {
      var s = readSettings();
      var preview = buildLayoutPreviewHtml(app, s);
      // Use srcdoc for an isolated rendering context
      iframe.srcdoc = preview;
      iframe.onload = function () {
        try {
          var doc = iframe.contentDocument;
          if (!doc) return;
          // Estimate page count from the printable content height
          var pageEls = doc.querySelectorAll('.page');
          var pages = pageEls.length;
          document.getElementById('ll-pagecount').textContent =
            pages + ' page' + (pages === 1 ? '' : 's');
          var gutter = gutterForPageCount(pages);
          document.getElementById('ll-gutter').textContent =
            'KDP gutter (inside margin) for this length: ' + gutter.toFixed(3) + ' in';
        } catch (e) {}
      };
    }

    document.getElementById('ll-close').addEventListener('click', function () { wrap.remove(); });
    document.getElementById('ll-save').addEventListener('click', async function () {
      var s = readSettings();
      app.layout = s;
      try { await putApp(app); toast('Layout saved.'); }
      catch (e) { toast('Could not save layout: ' + (e && e.message), true); }
    });
    ['ll-trim', 'll-bleed', 'll-pn', 'll-pnpos', 'll-view'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', rebuild);
    });
    // Picture-book templates auto-flip the view to spreads (that's the
    // whole point of these layouts) and suggest the children's-square
    // trim. Both are still user-overridable after the auto-flip.
    document.getElementById('ll-booktype').addEventListener('change', function () {
      var v = document.getElementById('ll-booktype').value;
      // Show / hide the custom-page-count input when picture-custom is picked
      var pagesLabel = document.getElementById('ll-pages-label');
      if (pagesLabel) pagesLabel.style.display = (v === 'picture-custom') ? 'inline-flex' : 'none';
      if (v && v !== 'standard') {
        // Picture-book templates default to schema view -- the whole
        // book on one screen, matching the standard picture-book
        // self-publishing infographics.
        document.getElementById('ll-view').value = 'schema';
        // Suggest 8.5x8.5 if the user hasn't picked an obviously
        // non-children's trim yet.
        var trimEl = document.getElementById('ll-trim');
        if (trimEl && (trimEl.value === '6x9' || trimEl.value === '5x8' || trimEl.value === '5.25x8' || trimEl.value === '5.5x8.5')) {
          trimEl.value = '8.5x8.5';
        }
      }
      rebuild();
    });
    var pagesInput = document.getElementById('ll-pages');
    if (pagesInput) pagesInput.addEventListener('change', rebuild);
    ['ll-header', 'll-footer'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', debounce(rebuild, 500));
    });

    rebuild();
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  // Build the preview HTML: each page is a fixed-size .page div sized
  // in inches so the on-screen result physically matches the chosen
  // trim. We chunk content client-side by H1 boundaries plus a soft
  // height cap so the preview is roughly paginated -- close enough for
  // a creator to see how their book will lay out, exact pagination
  // happens at PDF time.
  function buildLayoutPreviewHtml(app, s) {
    var trim = TRIM_PRESETS.filter(function (t) { return t.id === s.trim; })[0] || TRIM_PRESETS[3];
    var w = trim.w, h = trim.h;
    var bleedExtra = s.bleed ? 0.125 : 0;
    var pageW = w + bleedExtra * 2;
    var pageH = h + bleedExtra * 2;

    // We don't know the final page count yet; gutter is recomputed at
    // PDF time. Use 0.5in as a reasonable preview default.
    var gutter = 0.5;
    var marginInside = gutter;

    var contentBody = '';
    try {
      var doc = new DOMParser().parseFromString(app.html || '', 'text/html');
      contentBody = doc.body ? doc.body.innerHTML : (app.html || '');
    } catch (e) { contentBody = app.html || ''; }

    var headerText = s.headerText || '';
    var footerText = s.footerText || '';
    var showPN = !!s.pageNumbers;
    var pnPos = s.pageNumberPosition || 'outside';

    // Picture-book template: fixed page count, structural pages
    // reserved at front + back, story content distributed across the
    // story spreads in between.
    var isPicBook = !!PICTURE_BOOK_TEMPLATES[s.bookType];
    var schemaView = s.view === 'schema';
    var flipView = s.view === 'flip';
    var spreadView = s.view === 'spread' || flipView;

    var css =
      '*{box-sizing:border-box;}' +
      'html,body{margin:0;padding:0;background:#444;color:#222;font-family:Georgia,"Times New Roman",serif;line-height:1.55;}' +
      // Stacked: column. Spread: each row is a single page (or a pair).
      '.page-stack{padding:24px;display:flex;flex-direction:column;align-items:center;gap:24px;}' +
      '.spread-row{display:flex;align-items:flex-start;gap:0;}' +
      '.spread-row .page{box-shadow:0 6px 24px rgba(0,0,0,0.45);}' +
      '.spread-row .spacer{width:' + pageW + 'in;height:' + pageH + 'in;background:transparent;}' +
      '.page{position:relative;background:#fff;width:' + pageW + 'in;height:' + pageH + 'in;box-shadow:0 6px 24px rgba(0,0,0,0.45);overflow:hidden;}' +
      '.bleed-line{position:absolute;border:1px dashed #d0a050;pointer-events:none;left:' + bleedExtra + 'in;top:' + bleedExtra + 'in;width:' + w + 'in;height:' + h + 'in;}' +
      '.role-label{position:absolute;top:6px;left:6px;background:rgba(123,108,255,0.92);color:#fff;font:600 10px -apple-system,sans-serif;padding:2px 6px;border-radius:3px;letter-spacing:0.3px;z-index:5;}' +
      '.page.structural{background:repeating-linear-gradient(135deg,#fafaf6 0 12px,#f0f0e6 12px 24px);}' +
      '.safe-area{position:absolute;left:' + (bleedExtra + marginInside) + 'in;right:' + (bleedExtra + s.marginOutside) + 'in;top:' + (bleedExtra + s.marginTop) + 'in;bottom:' + (bleedExtra + s.marginBottom) + 'in;overflow:hidden;}' +
      '.safe-area p{margin:0 0 0.6em;text-indent:1.2em;}' +
      '.safe-area p:first-of-type, .safe-area h1+p, .safe-area h2+p{text-indent:0;}' +
      '.safe-area h1{font-size:24pt;margin:0 0 0.4em;text-align:center;line-height:1.2;}' +
      '.safe-area h2{font-size:16pt;margin:1em 0 0.3em;}' +
      '.safe-area h3{font-size:13pt;margin:0.8em 0 0.25em;}' +
      '.safe-area img{max-width:100%;height:auto;display:block;margin:0.6em auto;}' +
      '.safe-area blockquote{margin:0.6em 0.8em;font-style:italic;}' +
      '.safe-area ul,.safe-area ol{margin:0.4em 0 0.6em 1.4em;}' +
      '.page-num{position:absolute;bottom:' + (bleedExtra + 0.25) + 'in;font-size:10pt;color:#444;}' +
      '.page.even .page-num.outside{left:' + (bleedExtra + 0.25) + 'in;}' +
      '.page.odd .page-num.outside{right:' + (bleedExtra + 0.25) + 'in;}' +
      '.page-num.centered{left:0;right:0;text-align:center;}' +
      '.header,.footer{position:absolute;left:' + (bleedExtra + marginInside) + 'in;right:' + (bleedExtra + s.marginOutside) + 'in;font-size:9pt;color:#888;}' +
      '.header{top:' + (bleedExtra + 0.3) + 'in;text-align:center;}' +
      '.footer{bottom:' + (bleedExtra + 0.3) + 'in;text-align:center;}' +
      '.legend{position:fixed;bottom:10px;left:10px;background:rgba(0,0,0,0.65);color:#fff;padding:8px 12px;border-radius:6px;font:12px -apple-system,sans-serif;line-height:1.5;}' +
      '.legend .swatch{display:inline-block;width:14px;height:0;border-top:1px dashed #d0a050;vertical-align:middle;margin-right:4px;}' +
      '@media print { .legend{display:none;} .role-label{display:none;} body{background:#fff;} .page-stack{padding:0;gap:0;} .page{box-shadow:none;page-break-after:always;} .spread-row{display:contents;} }';

    // Decide how many pages we render and what content goes on each.
    var pagesHtml;
    if (isPicBook) {
      // Picture-book: fixed page count + structural pages. Story
      // distributes across (totalPages - structural) story pages.
      var total = picBookPageCount(s.bookType, s.customPageCount);
      var STRUCTURAL_FRONT = 5;     // pages 1..5 = paste, end paper, title, copyright, dedication
      var STRUCTURAL_BACK = 3;      // pages totalPages-2..totalPages = back matter, end paper, paste
      var storyPageCount = total - STRUCTURAL_FRONT - STRUCTURAL_BACK;
      var storyChunks = paginateForPreview(contentBody, w, h, marginInside, s.marginOutside, s.marginTop, s.marginBottom);
      // Distribute story chunks across the available story pages
      // (approximate: one chunk per page, last page gets the remainder).
      pagesHtml = [];
      for (var i = 0; i < total; i++) {
        var pn = i + 1;
        var role = pageRoleForPictureBook(pn, total);
        var isStructural = pn <= STRUCTURAL_FRONT || pn > total - STRUCTURAL_BACK;
        var pageContent = '';
        if (!isStructural) {
          var storyIdx = pn - STRUCTURAL_FRONT - 1;     // 0-indexed story page
          var perPage = Math.max(1, Math.ceil(storyChunks.length / storyPageCount));
          var fromIdx = storyIdx * perPage;
          var toIdx = Math.min(storyChunks.length, fromIdx + perPage);
          pageContent = storyChunks.slice(fromIdx, toIdx).join('');
        }
        pagesHtml.push({ html: pageContent, role: role, structural: isStructural });
      }
    } else {
      // Standard book: chunk content into pages by H1 + soft height cap.
      var chunks = paginateForPreview(contentBody, w, h, marginInside, s.marginOutside, s.marginTop, s.marginBottom);
      pagesHtml = chunks.map(function (h) { return { html: h, role: '', structural: false }; });
    }

    function renderPage(pg, idx) {
      var pageNum = idx + 1;
      var parity = (pageNum % 2 === 0) ? 'even' : 'odd';
      var headerHtml = headerText ? '<div class="header">' + escHtml(headerText) + '</div>' : '';
      var footerHtml = footerText ? '<div class="footer">' + escHtml(footerText) + '</div>' : '';
      var pnHtml = showPN ? '<div class="page-num ' + pnPos + '">' + pageNum + '</div>' : '';
      var bleedLine = s.bleed ? '<div class="bleed-line"></div>' : '';
      var roleHtml = pg.role ? '<div class="role-label">' + escHtml(pg.role) + '</div>' : '';
      var classes = 'page ' + parity + (pg.structural ? ' structural' : '');
      return '<div class="' + classes + '">' +
                bleedLine +
                roleHtml +
                headerHtml +
                '<div class="safe-area">' + pg.html + '</div>' +
                footerHtml +
                pnHtml +
              '</div>';
    }

    var stackHtml = '';
    if (flipView) {
      // Flip book -- ONE spread visible at a time, like reading a real
      // picture book. Prev / Next buttons move through the spreads.
      // Page 1 alone (recto), then [2|3], [4|5], ..., last page alone.
      var spreads = [];
      spreads.push('<div class="spread-row"><div class="spacer"></div>' + renderPage(pagesHtml[0], 0) + '</div>');
      for (var pf = 1; pf < pagesHtml.length - 1; pf += 2) {
        var lf = renderPage(pagesHtml[pf], pf);
        var rf = (pf + 1 < pagesHtml.length - 1) ? renderPage(pagesHtml[pf + 1], pf + 1) :
                  ((pf + 1 < pagesHtml.length) ? renderPage(pagesHtml[pf + 1], pf + 1) : '<div class="spacer"></div>');
        spreads.push('<div class="spread-row">' + lf + rf + '</div>');
      }
      // Back cover on its own row when total pages is even (so we
      // didn't already render it as the right-hand of the last pair)
      if (pagesHtml.length % 2 === 0 && pagesHtml.length > 1) {
        var lastIdx = pagesHtml.length - 1;
        spreads.push('<div class="spread-row"><div class="spacer"></div>' + renderPage(pagesHtml[lastIdx], lastIdx) + '</div>');
      }
      stackHtml +=
        '<div id="flip-stage">' +
          spreads.map(function (s, i) {
            return '<div class="flip-page" data-flip-idx="' + i + '" style="' + (i === 0 ? 'display:flex;' : 'display:none;') + '">' + s + '</div>';
          }).join('') +
        '</div>' +
        '<div id="flip-controls">' +
          '<button id="flip-prev" type="button">&larr; Prev</button>' +
          '<span id="flip-indicator">Spread 1 of ' + spreads.length + '</span>' +
          '<button id="flip-next" type="button">Next &rarr;</button>' +
        '</div>';
      css += '#flip-stage{padding:24px;display:flex;flex-direction:column;align-items:center;gap:0;background:#444;}' +
        '.flip-page{display:none;}' +
        '.flip-page.on{display:flex;}' +
        '#flip-controls{position:sticky;bottom:0;display:flex;align-items:center;justify-content:center;gap:18px;background:#1a1a2e;color:#f0f0f0;padding:10px;border-top:1px solid #2a2a40;font:14px -apple-system,sans-serif;z-index:10;}' +
        '#flip-controls button{background:#7b6cff;border:none;color:#12121a;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;}' +
        '#flip-controls button:disabled{opacity:0.4;cursor:default;}' +
        '#flip-indicator{font-weight:600;}' +
        '@media print { #flip-controls{display:none;} .flip-page{display:flex !important;} }';
    } else if (schemaView) {
      // Schema overview -- the whole book visible at once, like a
      // picture-book self-publishing infographic. Pages render as
      // small thumbnails in a flex grid; spreads pair visually.
      // Aspect ratio matches the chosen trim so the user sees how
      // their pages will actually shape up.
      var aspect = pageW / pageH;
      stackHtml += '<div class="schema-grid">';
      // Row layout: first row is page 1 alone (with leading spacer
      // for visual balance), then 5 spreads per row, last row is the
      // back cover alone.
      function renderThumb(pg, idx) {
        var pageNum = idx + 1;
        var isStructural = pg.structural;
        var bg = isStructural ? '#7b6cff' : '#fff';
        var fg = isStructural ? '#fff' : '#222';
        var subFg = isStructural ? '#e0d0ff' : '#666';
        var contentTeaser = '';
        if (!isStructural && pg.html) {
          // Strip HTML and show first ~60 chars as a flavor preview
          var t = String(pg.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70);
          if (t) contentTeaser = '<div class="schema-teaser">' + escHtml(t) + '…</div>';
        }
        return '<div class="schema-thumb" style="background:' + bg + ';color:' + fg + ';" data-page="' + pageNum + '">' +
                  '<div class="schema-num" style="color:' + subFg + ';">Page ' + pageNum + '</div>' +
                  '<div class="schema-role">' + escHtml(pg.role || ('Page ' + pageNum)) + '</div>' +
                  contentTeaser +
                '</div>';
      }
      function renderThumbSpread(left, right) {
        return '<div class="schema-spread">' + left + right + '</div>';
      }
      // Page 1 alone (paste-down)
      stackHtml += '<div class="schema-row schema-row-single">' +
        '<div class="schema-spread schema-spread-single">' + renderThumb(pagesHtml[0], 0) + '</div>' +
      '</div>';
      // Pair pages 2-3, 4-5, ... up to the back cover
      var spreadsHtml = [];
      for (var p2 = 1; p2 < pagesHtml.length - 1; p2 += 2) {
        var l = renderThumb(pagesHtml[p2], p2);
        var r = (p2 + 1 < pagesHtml.length - 1) ? renderThumb(pagesHtml[p2 + 1], p2 + 1) : '';
        spreadsHtml.push(renderThumbSpread(l, r));
      }
      // Group spreads into rows of 5 to match the standard
      // picture-book infographic layout
      for (var r2 = 0; r2 < spreadsHtml.length; r2 += 5) {
        stackHtml += '<div class="schema-row">' + spreadsHtml.slice(r2, r2 + 5).join('') + '</div>';
      }
      // Back cover alone
      if (pagesHtml.length > 1) {
        stackHtml += '<div class="schema-row schema-row-single">' +
          '<div class="schema-spread schema-spread-single">' + renderThumb(pagesHtml[pagesHtml.length - 1], pagesHtml.length - 1) + '</div>' +
        '</div>';
      }
      stackHtml += '</div>';

      // Schema-specific CSS appended to the existing css string
      css += '.schema-grid{padding:24px;display:flex;flex-direction:column;gap:18px;align-items:center;background:#444;color:#222;}' +
        '.schema-row{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;}' +
        '.schema-row-single{justify-content:center;}' +
        '.schema-spread{display:flex;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,0.45);border-radius:4px;overflow:hidden;}' +
        '.schema-spread-single .schema-thumb{box-shadow:none;}' +
        '.schema-thumb{width:140px;aspect-ratio:' + aspect + ';padding:8px 8px 6px;display:flex;flex-direction:column;justify-content:flex-start;font-family:-apple-system,sans-serif;border-right:1px solid #ddd;}' +
        '.schema-thumb:last-child{border-right:none;}' +
        '.schema-num{font-size:9.5px;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:4px;}' +
        '.schema-role{font-size:11.5px;font-weight:700;line-height:1.25;}' +
        '.schema-teaser{font-size:9px;color:#888;margin-top:6px;line-height:1.35;font-style:italic;font-family:Georgia,serif;}';
    } else if (spreadView) {
      // First page is alone on the right (recto), then [2|3], [4|5], ...
      // Page 1 alone uses a left-side blank spacer so it visually sits
      // on the right of the spread row.
      stackHtml += '<div class="spread-row"><div class="spacer"></div>' + renderPage(pagesHtml[0], 0) + '</div>';
      for (var p = 1; p < pagesHtml.length; p += 2) {
        var leftPage = renderPage(pagesHtml[p], p);
        var rightPage = (p + 1 < pagesHtml.length) ? renderPage(pagesHtml[p + 1], p + 1) : '<div class="spacer"></div>';
        stackHtml += '<div class="spread-row">' + leftPage + rightPage + '</div>';
      }
    } else {
      stackHtml = pagesHtml.map(renderPage).join('');
    }

    // Flip-book interactivity: keyboard arrows + swipe + prev/next.
    // Embedded as inline JS so the iframe owns the navigation; the
    // outer Load app stays uninvolved.
    var flipScript = flipView ?
      '<script>(function(){' +
        'var idx = 0;' +
        'var pages = document.querySelectorAll(".flip-page");' +
        'var total = pages.length;' +
        'var prev = document.getElementById("flip-prev");' +
        'var next = document.getElementById("flip-next");' +
        'var ind = document.getElementById("flip-indicator");' +
        'function show(i) {' +
          'if (i < 0 || i >= total) return;' +
          'idx = i;' +
          'for (var j = 0; j < pages.length; j++) { pages[j].style.display = j === idx ? "flex" : "none"; }' +
          'ind.textContent = "Spread " + (idx + 1) + " of " + total;' +
          'prev.disabled = idx === 0;' +
          'next.disabled = idx === total - 1;' +
          'window.scrollTo(0, 0);' +
        '}' +
        'prev.addEventListener("click", function(){ show(idx - 1); });' +
        'next.addEventListener("click", function(){ show(idx + 1); });' +
        'document.addEventListener("keydown", function(e){' +
          'if (e.key === "ArrowLeft") show(idx - 1);' +
          'else if (e.key === "ArrowRight") show(idx + 1);' +
        '});' +
        'var startX = null;' +
        'document.addEventListener("touchstart", function(e){ if (e.touches && e.touches[0]) startX = e.touches[0].clientX; }, {passive:true});' +
        'document.addEventListener("touchend", function(e){' +
          'if (startX == null) return;' +
          'var dx = (e.changedTouches[0].clientX - startX);' +
          'if (Math.abs(dx) > 60) { if (dx < 0) show(idx + 1); else show(idx - 1); }' +
          'startX = null;' +
        '}, {passive:true});' +
        'show(0);' +
      '})();<\/script>'
      : '';

    var html =
      '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<title>Print Layout Preview</title>' +
      '<style>' + css + '</style></head><body>' +
      '<div class="page-stack">' + stackHtml + '</div>' +
      (s.bleed ? '<div class="legend"><span class="swatch"></span>Trim line (dashed orange) &mdash; KDP cuts here. Anything outside is bleed.</div>' : '') +
      flipScript +
      '</body></html>';
    return html;
  }

  // Heuristic paginator: split body HTML into "pages" suitable for the
  // preview only. Pages start at every <h1>, and each chapter spills
  // forward as continuous flow. Real pagination happens at PDF time.
  // Output: array of HTML strings, one per page.
  function paginateForPreview(bodyHtml, trimW, trimH, mIn, mOut, mTop, mBot) {
    var contentHIn = trimH - mTop - mBot;
    // Approximate body text density in characters per page at 11pt/1.55
    // line-height. ~ (charsPerLine) * (linesPerPage). For a 6x9 -> ~1900
    // chars; 8.5x8.5 -> ~2100; 8.5x11 -> ~3400. Tune by area.
    var contentWIn = trimW - mIn - mOut;
    var areaSqIn = contentWIn * contentHIn;
    var charsPerPage = Math.round(areaSqIn * 50); // tuned constant

    var doc;
    try { doc = new DOMParser().parseFromString('<div>' + bodyHtml + '</div>', 'text/html'); }
    catch (e) { return [bodyHtml]; }
    var root = doc.body.firstChild;
    if (!root) return [bodyHtml];

    var pages = [];
    var current = '', currentChars = 0;
    function pushPage() { if (current.trim()) { pages.push(current); current = ''; currentChars = 0; } }

    var children = Array.prototype.slice.call(root.childNodes);
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      if (node.nodeType !== 1 && node.nodeType !== 3) continue;
      // H1 starts a fresh page (chapter break)
      if (node.nodeType === 1 && node.tagName.toLowerCase() === 'h1' &&
          !(node.classList && node.classList.contains('book-title'))) {
        pushPage();
      }
      var html = node.nodeType === 1 ? node.outerHTML : escHtml(node.textContent);
      var chars = (node.textContent || '').length;
      if (currentChars + chars > charsPerPage && current.trim()) {
        pushPage();
      }
      current += html;
      currentChars += chars;
    }
    pushPage();
    if (!pages.length) pages = [bodyHtml];
    return pages;
  }

  function wireLayoutBtn() {
    var btn = $('layout-btn');
    if (btn) btn.addEventListener('click', function () {
      if (currentApp) openLayoutView(currentApp);
      else toast('Open a manuscript first.', true);
    });
  }

  /* ---------- Prose editor ----------
     A friendly WYSIWYG-ish editor for re-editing a manuscript without
     having to touch HTML source. Loads the body of the current app's
     HTML into a contentEditable div, exposes a tiny toolbar (bold,
     italic, H1, H2, list, undo, redo, save, cancel), and writes the
     edited innerHTML back to app.html on save.

     Designed for the .docx / .txt / .md / .epub / .pdf import
     pipeline -- creators bring in a finished book and edit prose
     directly. Power users who need to edit raw markup still have the
     code-source 'Edit HTML' option in the tile menu. */
  function openProseEditor(app) {
    if (!app || !app.html) { toast('Open a manuscript first.', true); return; }

    var existing = document.getElementById('__loadProseEdit');
    if (existing) existing.remove();

    // Pull the body content out of app.html so the editor doesn't show
    // <head>, doctype, etc.
    var bodyHtml = '', bodyTitle = app.name || 'Manuscript';
    try {
      var doc = new DOMParser().parseFromString(app.html, 'text/html');
      if (doc && doc.body) bodyHtml = doc.body.innerHTML;
      var titleEl = doc && doc.querySelector('title');
      if (titleEl && titleEl.textContent.trim()) bodyTitle = titleEl.textContent.trim();
    } catch (e) { bodyHtml = app.html; }

    var wrap = document.createElement('div');
    wrap.id = '__loadProseEdit';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2050;display:flex;flex-direction:column;background:#0f0f1a;color:#f0f0f0;font-family:-apple-system,sans-serif;';

    wrap.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#1a1a2e;border-bottom:1px solid #2a2a40;flex-wrap:wrap;overflow-x:auto;">' +
        '<button id="pe-cancel" style="background:#3a3a55;border:none;color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;cursor:pointer;flex-shrink:0;">&larr; Cancel</button>' +
        '<div style="font-weight:700;font-size:15px;margin-right:auto;flex-shrink:0;">Edit &mdash; ' + escHtml(bodyTitle) + '</div>' +
        '<button data-cmd="bold" class="pe-tool" style="flex-shrink:0;font-weight:bold;">B</button>' +
        '<button data-cmd="italic" class="pe-tool" style="flex-shrink:0;font-style:italic;">I</button>' +
        '<button data-cmd="underline" class="pe-tool" style="flex-shrink:0;text-decoration:underline;">U</button>' +
        '<button data-cmd="formatBlock" data-arg="H1" class="pe-tool" style="flex-shrink:0;">H1</button>' +
        '<button data-cmd="formatBlock" data-arg="H2" class="pe-tool" style="flex-shrink:0;">H2</button>' +
        '<button data-cmd="formatBlock" data-arg="P" class="pe-tool" style="flex-shrink:0;">P</button>' +
        '<button data-cmd="insertUnorderedList" class="pe-tool" style="flex-shrink:0;">&bull; List</button>' +
        '<button data-cmd="insertOrderedList" class="pe-tool" style="flex-shrink:0;">1. List</button>' +
        '<button data-cmd="formatBlock" data-arg="BLOCKQUOTE" class="pe-tool" style="flex-shrink:0;">&ldquo;</button>' +
        '<button data-cmd="undo" class="pe-tool" style="flex-shrink:0;">&#8630;</button>' +
        '<button data-cmd="redo" class="pe-tool" style="flex-shrink:0;">&#8631;</button>' +
        '<button id="pe-find" class="pe-tool" style="flex-shrink:0;" title="Find &amp; replace">🔍 Find</button>' +
        '<button id="pe-chart" class="pe-tool" style="flex-shrink:0;" title="Insert chart or table">📊 Chart</button>' +
        '<button id="pe-save" style="background:#7b6cff;border:none;color:#12121a;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0;">Save</button>' +
      '</div>' +
      '<div id="pe-find-bar" style="display:none;align-items:center;gap:8px;padding:8px 14px;background:#15152a;border-bottom:1px solid #2a2a40;flex-wrap:wrap;">' +
        '<input id="pe-find-input" placeholder="Find" style="flex:1;min-width:140px;padding:7px 10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:13.5px;">' +
        '<input id="pe-replace-input" placeholder="Replace with" style="flex:1;min-width:140px;padding:7px 10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:13.5px;">' +
        '<label style="font-size:12px;color:#a0a0b0;display:inline-flex;align-items:center;gap:4px;"><input id="pe-find-case" type="checkbox"> Case sensitive</label>' +
        '<button id="pe-find-next" style="background:#3a3a55;border:none;color:#fff;padding:7px 12px;border-radius:6px;font-size:13px;cursor:pointer;">Find next</button>' +
        '<button id="pe-replace-one" style="background:#3a3a55;border:none;color:#fff;padding:7px 12px;border-radius:6px;font-size:13px;cursor:pointer;">Replace</button>' +
        '<button id="pe-replace-all" style="background:#fbbf24;border:none;color:#3a2a05;padding:7px 12px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">Replace all</button>' +
        '<span id="pe-find-status" style="font-size:12px;color:#a0a0b0;"></span>' +
      '</div>' +
      '<div style="flex:1;overflow:auto;background:#fff;color:#222;">' +
        '<div id="pe-area" contenteditable="true" spellcheck="true" style="' +
          'max-width:780px;margin:0 auto;padding:32px 24px 80px;' +
          'font-family:Georgia,\"Times New Roman\",serif;line-height:1.7;font-size:16px;outline:none;min-height:100%;">' +
        bodyHtml +
        '</div>' +
      '</div>' +
      '<style>' +
      '.pe-tool { background:#2a2a40; color:#f0f0f0; border:1px solid #3a3a55; padding:6px 10px; border-radius:6px; font-size:13px; cursor:pointer; min-width:34px; }' +
      '.pe-tool:hover { background:#3a3a55; }' +
      '#pe-area h1 { font-size:24px; margin:1em 0 0.4em; line-height:1.3; }' +
      '#pe-area h2 { font-size:19px; margin:0.9em 0 0.3em; line-height:1.3; }' +
      '#pe-area h3 { font-size:17px; margin:0.8em 0 0.3em; }' +
      '#pe-area p { margin:0 0 0.7em; }' +
      '#pe-area blockquote { margin:1em 0 1em 1em; padding-left:1em; border-left:3px solid #ccc; color:#555; }' +
      '#pe-area img { max-width:100%; height:auto; }' +
      '#pe-area ul, #pe-area ol { margin:0.5em 0 1em 1.4em; }' +
      '</style>';

    document.body.appendChild(wrap);

    var area = document.getElementById('pe-area');

    // Wire toolbar via execCommand. Yes, document.execCommand is
    // formally deprecated but every iPad Safari version still supports
    // it for contenteditable styling, and the Selection-API rewrite to
    // replace it is several hundred lines we don't need today.
    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-cmd]') : null;
      if (!btn) return;
      var cmd = btn.getAttribute('data-cmd');
      var arg = btn.getAttribute('data-arg') || null;
      area.focus();
      try { document.execCommand(cmd, false, arg); }
      catch (err) { /* unsupported -- ignore */ }
    });

    document.getElementById('pe-cancel').addEventListener('click', function () {
      if (area.dataset.dirty === '1') {
        if (!confirm('Discard your edits?')) return;
      }
      wrap.remove();
    });
    document.getElementById('pe-save').addEventListener('click', async function () {
      var newBody = area.innerHTML;
      // Re-emit the full HTML doc using the manuscript shell so it
      // round-trips cleanly with the existing renderer / EPUB / PDF
      // export. If app.html had a custom shell (e.g. a PWA template),
      // preserve everything outside <body>.
      try {
        var doc = new DOMParser().parseFromString(app.html, 'text/html');
        if (doc && doc.body) {
          doc.body.innerHTML = newBody;
          var serialized = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
          app.html = serialized;
        } else {
          app.html = buildManuscriptDoc(bodyTitle, newBody);
        }
      } catch (e) {
        app.html = buildManuscriptDoc(bodyTitle, newBody);
      }
      app.sizeBytes = (app.html || '').length;
      try {
        await putApp(app);
        toast('Saved.');
        wrap.remove();
        // If currently viewing this app, reload the iframe so the new
        // content shows immediately.
        if (currentApp && currentApp.id === app.id) {
          try { reopenApp(app); }
          catch (e) { /* renderer may handle reopen its own way */ }
        }
      } catch (err) {
        toast('Could not save: ' + (err && err.message), true);
      }
    });
    area.addEventListener('input', function () { area.dataset.dirty = '1'; });

    // ---- Find & Replace ----
    var findBar = document.getElementById('pe-find-bar');
    var findInput = document.getElementById('pe-find-input');
    var replaceInput = document.getElementById('pe-replace-input');
    var caseCb = document.getElementById('pe-find-case');
    var statusEl = document.getElementById('pe-find-status');

    document.getElementById('pe-find').addEventListener('click', function () {
      var open = findBar.style.display !== 'flex';
      findBar.style.display = open ? 'flex' : 'none';
      if (open) findInput.focus();
    });

    function findRangesIn(node, needle, caseSensitive) {
      if (!needle) return [];
      var hits = [];
      var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
      var n;
      while ((n = walker.nextNode())) {
        var text = n.nodeValue;
        var hay = caseSensitive ? text : text.toLowerCase();
        var nd = caseSensitive ? needle : needle.toLowerCase();
        var idx = 0, found;
        while ((found = hay.indexOf(nd, idx)) >= 0) {
          hits.push({ node: n, start: found, end: found + needle.length });
          idx = found + needle.length;
        }
      }
      return hits;
    }

    var lastHitIdx = -1;
    function findNext() {
      var needle = findInput.value;
      if (!needle) { statusEl.textContent = 'Type something to find'; return; }
      var hits = findRangesIn(area, needle, caseCb.checked);
      if (!hits.length) { statusEl.textContent = 'No matches'; return; }
      lastHitIdx = (lastHitIdx + 1) % hits.length;
      var h = hits[lastHitIdx];
      var range = document.createRange();
      range.setStart(h.node, h.start);
      range.setEnd(h.node, h.end);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      // Scroll the match into view
      try {
        var rect = range.getBoundingClientRect();
        if (rect.top < 60 || rect.top > window.innerHeight - 60) {
          var anchor = h.node.parentNode;
          if (anchor && anchor.scrollIntoView) anchor.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      } catch (e) {}
      statusEl.textContent = (lastHitIdx + 1) + ' of ' + hits.length;
    }

    function replaceCurrent() {
      var needle = findInput.value;
      var replacement = replaceInput.value;
      if (!needle) { statusEl.textContent = 'Type something to find'; return; }
      var sel = window.getSelection();
      if (sel && sel.rangeCount) {
        var current = sel.toString();
        var same = caseCb.checked ? current === needle : current.toLowerCase() === needle.toLowerCase();
        if (same) {
          var range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(replacement));
          area.dataset.dirty = '1';
          statusEl.textContent = 'Replaced';
          // Re-find to advance to the next hit
          lastHitIdx = -1;
          return findNext();
        }
      }
      // Nothing selected -> just find next so the user can replace it on the second tap
      return findNext();
    }

    function replaceAll() {
      var needle = findInput.value;
      var replacement = replaceInput.value;
      if (!needle) { statusEl.textContent = 'Type something to find'; return; }
      var hits = findRangesIn(area, needle, caseCb.checked);
      if (!hits.length) { statusEl.textContent = 'No matches'; return; }
      // Walk hits in REVERSE so earlier hits stay valid as we mutate
      // text nodes from the back of the document.
      for (var i = hits.length - 1; i >= 0; i--) {
        var h = hits[i];
        var node = h.node, before = node.nodeValue.slice(0, h.start);
        var after = node.nodeValue.slice(h.end);
        node.nodeValue = before + replacement + after;
      }
      area.dataset.dirty = '1';
      statusEl.textContent = 'Replaced ' + hits.length + ' match' + (hits.length === 1 ? '' : 'es');
      lastHitIdx = -1;
    }

    document.getElementById('pe-find-next').addEventListener('click', findNext);
    document.getElementById('pe-replace-one').addEventListener('click', replaceCurrent);
    document.getElementById('pe-replace-all').addEventListener('click', replaceAll);
    findInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); findNext(); }
    });
    replaceInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); replaceCurrent(); }
    });

    // ---- Chart maker ----
    // Save the caret position before the modal steals focus so we can
    // insert the chart back at the right place.
    var savedRange = null;
    area.addEventListener('blur', function () {
      var sel = window.getSelection();
      if (sel && sel.rangeCount && area.contains(sel.anchorNode)) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
    });
    document.getElementById('pe-chart').addEventListener('click', function () {
      // Capture current caret if we can; otherwise insert at end.
      var sel = window.getSelection();
      if (sel && sel.rangeCount && area.contains(sel.anchorNode)) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
      openChartMaker(function (insertHtml) {
        if (!insertHtml) return;
        if (savedRange) {
          var r = savedRange.cloneRange();
          var temp = document.createElement('div');
          temp.innerHTML = insertHtml;
          var frag = document.createDocumentFragment();
          var node;
          while ((node = temp.firstChild)) frag.appendChild(node);
          r.deleteContents();
          r.insertNode(frag);
        } else {
          area.insertAdjacentHTML('beforeend', insertHtml);
        }
        area.dataset.dirty = '1';
        area.focus();
      });
    });

    area.focus();
  }

  /* ---------- In-app chart maker ----------
     Pure-Canvas charts (bar / line / pie) plus an HTML table option,
     all built without any external libraries so it stays offline.
     Tap the 📊 button in the prose editor toolbar, pick a chart type,
     enter "label,value" data one per line, tap Insert and the
     rendered image (or table) lands at your caret position. */
  function openChartMaker(onInsert) {
    var existing = document.getElementById('__loadChart');
    if (existing) existing.remove();

    var defaultData = '2021,12\n2022,18\n2023,27\n2024,34\n2025,41';
    var wrap = document.createElement('div');
    wrap.id = '__loadChart';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2100;display:flex;flex-direction:column;background:#0f0f1a;color:#f0f0f0;font-family:-apple-system,sans-serif;';

    wrap.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1a1a2e;border-bottom:1px solid #2a2a40;flex-wrap:wrap;">' +
        '<button id="ch-close" style="background:#3a3a55;border:none;color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;cursor:pointer;">&larr; Cancel</button>' +
        '<div style="font-weight:700;font-size:15px;margin-right:auto;">Chart maker</div>' +
        '<button id="ch-insert" style="background:#22c55e;border:none;color:#062013;padding:8px 16px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Insert into manuscript</button>' +
      '</div>' +
      '<div style="flex:1;display:flex;overflow:hidden;">' +
        '<div style="width:340px;border-right:1px solid #2a2a40;padding:14px;overflow-y:auto;background:#15152a;">' +
          '<label style="display:block;font-size:12.5px;color:#a0a0b0;margin-bottom:4px;">Chart type</label>' +
          '<select id="ch-type" style="width:100%;padding:8px 10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:14px;margin-bottom:12px;">' +
            '<option value="bar">Bar chart</option>' +
            '<option value="line">Line chart</option>' +
            '<option value="pie">Pie chart</option>' +
            '<option value="table">Table (HTML, not image)</option>' +
          '</select>' +
          '<label style="display:block;font-size:12.5px;color:#a0a0b0;margin-bottom:4px;">Title</label>' +
          '<input id="ch-title" value="My chart" style="width:100%;padding:8px 10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:14px;margin-bottom:12px;">' +
          '<label style="display:block;font-size:12.5px;color:#a0a0b0;margin-bottom:4px;">Data &mdash; one <code>label, value</code> per line</label>' +
          '<textarea id="ch-data" style="width:100%;height:180px;padding:10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:13px;font-family:Menlo,monospace;resize:vertical;">' + escHtml(defaultData) + '</textarea>' +
          '<div style="display:flex;gap:8px;margin-top:10px;">' +
            '<label style="flex:1;font-size:12.5px;color:#a0a0b0;">Color<input id="ch-color" type="color" value="#7b6cff" style="display:block;width:100%;height:34px;margin-top:4px;border:none;background:transparent;cursor:pointer;"></label>' +
            '<label style="flex:1;font-size:12.5px;color:#a0a0b0;">Width<input id="ch-w" type="number" value="600" min="200" max="1600" style="display:block;width:100%;padding:6px 8px;margin-top:4px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:13px;"></label>' +
            '<label style="flex:1;font-size:12.5px;color:#a0a0b0;">Height<input id="ch-h" type="number" value="400" min="200" max="1200" style="display:block;width:100%;padding:6px 8px;margin-top:4px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:13px;"></label>' +
          '</div>' +
          '<p style="font-size:12px;color:#a0a0b0;margin-top:14px;">Pure-Canvas, no internet required. Charts are inserted as PNG images. Tables are inserted as live HTML you can edit further in the prose view.</p>' +
        '</div>' +
        '<div id="ch-preview-wrap" style="flex:1;display:flex;align-items:center;justify-content:center;background:#222232;overflow:auto;padding:20px;">' +
          '<canvas id="ch-canvas" style="max-width:100%;max-height:100%;background:#fff;box-shadow:0 6px 22px rgba(0,0,0,0.5);border-radius:6px;"></canvas>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap);

    var canvas = document.getElementById('ch-canvas');
    var typeEl = document.getElementById('ch-type');
    var titleEl = document.getElementById('ch-title');
    var dataEl = document.getElementById('ch-data');
    var colorEl = document.getElementById('ch-color');
    var wEl = document.getElementById('ch-w');
    var hEl = document.getElementById('ch-h');

    function parseData() {
      var lines = (dataEl.value || '').split(/\r?\n/);
      var rows = [];
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var parts = line.split(/[,\t]/);
        var label = (parts[0] || '').trim();
        var val = parseFloat(parts[1]);
        if (label && !isNaN(val)) rows.push({ label: label, value: val });
      }
      return rows;
    }

    function render() {
      var rows = parseData();
      var w = parseInt(wEl.value, 10) || 600;
      var h = parseInt(hEl.value, 10) || 400;
      var type = typeEl.value;
      if (type === 'table') {
        // Table preview: hide canvas, show an HTML table styled inside
        // the preview wrap.
        canvas.style.display = 'none';
        var existing = document.getElementById('ch-table-preview');
        if (existing) existing.remove();
        var t = document.createElement('table');
        t.id = 'ch-table-preview';
        t.style.cssText = 'background:#fff;color:#222;border-collapse:collapse;font-family:Georgia,serif;font-size:14px;box-shadow:0 6px 22px rgba(0,0,0,0.5);';
        var caption = '<caption style="caption-side:top;padding:8px;font-weight:bold;">' + escHtml(titleEl.value) + '</caption>';
        var rowsHtml = rows.map(function (r) {
          return '<tr><td style="padding:6px 14px;border:1px solid #ccc;">' + escHtml(r.label) + '</td><td style="padding:6px 14px;border:1px solid #ccc;text-align:right;">' + r.value + '</td></tr>';
        }).join('');
        t.innerHTML = caption + '<thead><tr><th style="padding:6px 14px;border:1px solid #ccc;background:#f0f0f0;">Label</th><th style="padding:6px 14px;border:1px solid #ccc;background:#f0f0f0;">Value</th></tr></thead><tbody>' + rowsHtml + '</tbody>';
        document.getElementById('ch-preview-wrap').appendChild(t);
        return;
      }
      var existingTable = document.getElementById('ch-table-preview');
      if (existingTable) existingTable.remove();
      canvas.style.display = '';
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      if (!rows.length) {
        ctx.fillStyle = '#999';
        ctx.font = '14px -apple-system,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data', w / 2, h / 2);
        return;
      }
      var color = colorEl.value;
      if (type === 'bar') drawBarChart(ctx, w, h, rows, titleEl.value, color);
      else if (type === 'line') drawLineChart(ctx, w, h, rows, titleEl.value, color);
      else if (type === 'pie') drawPieChart(ctx, w, h, rows, titleEl.value, color);
    }

    typeEl.addEventListener('change', render);
    titleEl.addEventListener('input', debounce(render, 200));
    dataEl.addEventListener('input', debounce(render, 250));
    colorEl.addEventListener('change', render);
    wEl.addEventListener('change', render);
    hEl.addEventListener('change', render);

    document.getElementById('ch-close').addEventListener('click', function () {
      wrap.remove();
      if (onInsert) onInsert(null);
    });
    document.getElementById('ch-insert').addEventListener('click', function () {
      var rows = parseData();
      if (!rows.length) { toast('Add at least one "label, value" line.', true); return; }
      var type = typeEl.value;
      var insertHtml;
      if (type === 'table') {
        var t = document.getElementById('ch-table-preview');
        // Strip preview-only id + box-shadow before inserting
        var clone = t.cloneNode(true);
        clone.id = '';
        clone.style.boxShadow = 'none';
        insertHtml = clone.outerHTML;
      } else {
        var dataUrl = canvas.toDataURL('image/png');
        insertHtml = '<img src="' + dataUrl + '" alt="' + escHtml(titleEl.value) + '" style="max-width:100%;height:auto;display:block;margin:12px auto;">';
      }
      wrap.remove();
      if (onInsert) onInsert(insertHtml);
    });

    render();
  }

  function drawBarChart(ctx, w, h, rows, title, color) {
    var pad = 36;
    var titleH = title ? 28 : 0;
    var plotX = pad + 30;
    var plotY = pad + titleH;
    var plotW = w - plotX - pad;
    var plotH = h - plotY - pad - 24;
    if (title) {
      ctx.fillStyle = '#222';
      ctx.font = 'bold 16px -apple-system,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, w / 2, pad + 4);
    }
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }));
    var step = max / 4;
    var nice = niceTicks(max);
    var maxNice = nice[nice.length - 1];
    // Y-axis grid + labels
    ctx.fillStyle = '#666';
    ctx.font = '11px -apple-system,sans-serif';
    ctx.textAlign = 'right';
    for (var i = 0; i < nice.length; i++) {
      var y = plotY + plotH - (nice[i] / maxNice) * plotH;
      ctx.strokeStyle = '#eee';
      ctx.beginPath(); ctx.moveTo(plotX, y); ctx.lineTo(plotX + plotW, y); ctx.stroke();
      ctx.fillText(String(nice[i]), plotX - 4, y + 4);
    }
    // Bars
    var barGap = 12;
    var barW = (plotW - barGap * (rows.length + 1)) / rows.length;
    ctx.textAlign = 'center';
    rows.forEach(function (r, idx) {
      var bx = plotX + barGap + idx * (barW + barGap);
      var bh = (r.value / maxNice) * plotH;
      var by = plotY + plotH - bh;
      ctx.fillStyle = color;
      ctx.fillRect(bx, by, barW, bh);
      // Label below bar
      ctx.fillStyle = '#333';
      ctx.fillText(r.label, bx + barW / 2, plotY + plotH + 16);
      // Value on top
      ctx.fillStyle = '#222';
      ctx.font = '11px -apple-system,sans-serif';
      ctx.fillText(String(r.value), bx + barW / 2, by - 4);
    });
  }

  function drawLineChart(ctx, w, h, rows, title, color) {
    var pad = 36;
    var titleH = title ? 28 : 0;
    var plotX = pad + 30;
    var plotY = pad + titleH;
    var plotW = w - plotX - pad;
    var plotH = h - plotY - pad - 24;
    if (title) {
      ctx.fillStyle = '#222';
      ctx.font = 'bold 16px -apple-system,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, w / 2, pad + 4);
    }
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }));
    var nice = niceTicks(max);
    var maxNice = nice[nice.length - 1];
    ctx.fillStyle = '#666';
    ctx.font = '11px -apple-system,sans-serif';
    ctx.textAlign = 'right';
    for (var i = 0; i < nice.length; i++) {
      var y = plotY + plotH - (nice[i] / maxNice) * plotH;
      ctx.strokeStyle = '#eee';
      ctx.beginPath(); ctx.moveTo(plotX, y); ctx.lineTo(plotX + plotW, y); ctx.stroke();
      ctx.fillText(String(nice[i]), plotX - 4, y + 4);
    }
    var stepX = plotW / Math.max(1, rows.length - 1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    rows.forEach(function (r, idx) {
      var x = plotX + idx * stepX;
      var y = plotY + plotH - (r.value / maxNice) * plotH;
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Dots and labels
    rows.forEach(function (r, idx) {
      var x = plotX + idx * stepX;
      var y = plotY + plotH - (r.value / maxNice) * plotH;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.font = '11px -apple-system,sans-serif';
      ctx.fillText(r.label, x, plotY + plotH + 16);
    });
  }

  function drawPieChart(ctx, w, h, rows, title, color) {
    var pad = 24;
    if (title) {
      ctx.fillStyle = '#222';
      ctx.font = 'bold 16px -apple-system,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, w / 2, pad);
    }
    var total = rows.reduce(function (s, r) { return s + r.value; }, 0);
    if (total === 0) return;
    var legendW = 160;
    var pieR = Math.min(w - legendW - pad * 3, h - pad * 3 - (title ? 28 : 0)) / 2;
    var cx = pad + pieR;
    var cy = pad + pieR + (title ? 28 : 0);
    var palette = ['#7b6cff', '#22c55e', '#fbbf24', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#a78bfa', '#f97316'];
    var startAngle = -Math.PI / 2;
    rows.forEach(function (r, i) {
      var fraction = r.value / total;
      var slice = fraction * Math.PI * 2;
      ctx.fillStyle = palette[i % palette.length];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, pieR, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fill();
      startAngle += slice;
    });
    // Legend
    var lx = cx + pieR + 24;
    var ly = pad + 16 + (title ? 28 : 0);
    ctx.font = '12px -apple-system,sans-serif';
    ctx.textAlign = 'left';
    rows.forEach(function (r, i) {
      ctx.fillStyle = palette[i % palette.length];
      ctx.fillRect(lx, ly + i * 22, 14, 14);
      ctx.fillStyle = '#222';
      var pct = ((r.value / total) * 100).toFixed(1) + '%';
      ctx.fillText(r.label + ' (' + pct + ')', lx + 22, ly + i * 22 + 11);
    });
  }

  // Returns an array of "nice" tick values from 0 to a value >= max.
  // Picks 4-5 ticks at increments of 1, 2, 5, 10, 20, 50, 100, ...
  function niceTicks(max) {
    if (max <= 0) return [0, 1];
    var pow = Math.pow(10, Math.floor(Math.log10(max)));
    var n = max / pow;
    var step;
    if (n <= 1) step = pow / 5;
    else if (n <= 2) step = pow / 2;
    else if (n <= 5) step = pow;
    else step = pow * 2;
    var ticks = [];
    var v = 0;
    while (v < max + step) { ticks.push(Math.round(v * 1000) / 1000); v += step; }
    return ticks;
  }

  // Re-render the open manuscript in the viewer iframe after a save.
  // Falls back to a simple srcdoc swap if the original openApp helper
  // expects a different code path; either way, the user immediately
  // sees their edits.
  function reopenApp(app) {
    var frame = $('viewer-frame');
    if (frame && app.html) frame.srcdoc = app.html;
  }

  function wireProseEditBtn() {
    var btn = $('prose-edit-btn');
    if (btn) btn.addEventListener('click', function () {
      if (currentApp) openProseEditor(currentApp);
      else toast('Open a manuscript first.', true);
    });
  }

  /* ---------- Cover-image designer ----------
     KDP Kindle, Apple Books, Kobo, IngramSpark, etc all want a
     high-resolution cover JPEG / PNG uploaded separately from the
     interior file. This designer takes whatever image the creator
     already has (drop in from Photos, pick from images embedded in
     the manuscript, or use a fallback gradient) plus the title and
     author, renders the result to a canvas at the chosen target
     resolution, and downloads it as a single image. No external
     libraries -- canvas + drawImage + fillText. */

  var COVER_PRESETS = [
    { id: 'kindle',  label: 'Kindle eBook (2560 \xd7 1600)',  w: 1600, h: 2560 },
    { id: 'apple',   label: 'Apple Books (1400 \xd7 2100)',   w: 1400, h: 2100 },
    { id: 'kobo',    label: 'Kobo / Nook (1600 \xd7 2400)',   w: 1600, h: 2400 },
    { id: 'print6x9', label: 'KDP Print 6 \xd7 9 (1800 \xd7 2700)', w: 1800, h: 2700 },
    { id: 'print8x10', label: 'KDP Print 8 \xd7 10 (2400 \xd7 3000)', w: 2400, h: 3000 },
    { id: 'square',  label: "Children's square 8.5 \xd7 8.5 (2550 \xd7 2550)", w: 2550, h: 2550 }
  ];

  function defaultCoverDesign(app) {
    return {
      preset: 'kindle',
      title: app && app.name ? app.name : 'Untitled',
      author: (app && app.author) ? app.author : '',
      titleColor: '#ffffff',
      authorColor: '#ffffff',
      bgColor1: '#1a1a3e',
      bgColor2: '#503080',
      darken: 0.35,
      imageDataUrl: null,
      format: 'jpeg', // 'jpeg' | 'png'
      quality: 0.92,
      // Wrap settings (for the cover-wrap PDF used by KDP / IngramSpark
      // print uploads). Defaults map to a 6x9 paperback on white paper.
      wrapPaper: 'white',          // 'white' | 'cream' | 'colorpremium'
      wrapTrim: '6x9',
      wrapBackText: ''
    };
  }

  // KDP spine-width formulas. Pages-per-inch by paper type:
  //   White (60 lb)        -> 444
  //   Cream (55 lb)        -> 426
  //   Color premium 70 lb  -> 360
  // Source: Amazon KDP "Print Specifications -- Cover Calculator"
  function spineWidthInches(pageCount, paper) {
    var ppi = paper === 'cream' ? 426 : paper === 'colorpremium' ? 360 : 444;
    return pageCount / ppi;
  }

  function openCoverDesigner(app) {
    if (!app) { toast('Open a manuscript first.', true); return; }
    var settings = Object.assign(defaultCoverDesign(app), app.coverDesign || {});

    // If no image picked yet, see if the manuscript has any embedded
    // images we can offer as defaults.
    var manuscriptImages = extractManuscriptImages(app.html || '');

    var existing = document.getElementById('__loadCover');
    if (existing) existing.remove();

    var presetOptions = COVER_PRESETS.map(function (p) {
      return '<option value="' + p.id + '"' + (p.id === settings.preset ? ' selected' : '') + '>' + p.label + '</option>';
    }).join('');

    var manuscriptThumbs = manuscriptImages.length
      ? '<div style="font-size:12.5px;color:#a0a0b0;margin-top:6px;">Or pick from your manuscript:</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">' +
          manuscriptImages.slice(0, 12).map(function (src, i) {
            return '<button class="cv-thumb" data-img-idx="' + i + '" style="width:60px;height:80px;background:#2a2a40;border:1px solid #3a3a55;border-radius:6px;cursor:pointer;padding:0;overflow:hidden;">' +
              '<img src="' + src + '" alt="" style="width:100%;height:100%;object-fit:cover;">' +
            '</button>';
          }).join('') +
        '</div>'
      : '';

    var wrap = document.createElement('div');
    wrap.id = '__loadCover';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2050;display:flex;flex-direction:column;background:#0f0f1a;color:#f0f0f0;font-family:-apple-system,sans-serif;';

    wrap.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1a1a2e;border-bottom:1px solid #2a2a40;flex-wrap:wrap;">' +
        '<button id="cv-close" style="background:#3a3a55;border:none;color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;cursor:pointer;">&larr; Close</button>' +
        '<div style="font-weight:700;font-size:15px;margin-right:auto;">Cover &mdash; ' + escHtml(app.name || 'Untitled') + '</div>' +
        '<select id="cv-preset" style="padding:6px 8px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:13px;">' + presetOptions + '</select>' +
        '<select id="cv-format" style="padding:6px 8px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:13px;">' +
          '<option value="jpeg"' + (settings.format === 'jpeg' ? ' selected' : '') + '>JPEG (smaller, ebook)</option>' +
          '<option value="png"' + (settings.format === 'png' ? ' selected' : '') + '>PNG (lossless, print)</option>' +
        '</select>' +
        '<button id="cv-save" style="background:#7b6cff;border:none;color:#12121a;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Save design</button>' +
        '<button id="cv-export" style="background:#22c55e;border:none;color:#062013;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Export image</button>' +
        '<button id="cv-wrap" style="background:#fbbf24;border:none;color:#3a2a05;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;" title="Front + spine + back PDF for KDP paperback / IngramSpark print upload">Print cover wrap PDF</button>' +
      '</div>' +
      '<div style="flex:1;display:flex;overflow:hidden;">' +
        '<div style="width:320px;border-right:1px solid #2a2a40;padding:14px;overflow-y:auto;background:#15152a;">' +
          '<label style="display:block;font-size:12.5px;color:#a0a0b0;margin-bottom:4px;">Title</label>' +
          '<input id="cv-title" value="' + escHtml(settings.title) + '" style="width:100%;padding:8px 10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:14px;margin-bottom:10px;">' +
          '<label style="display:block;font-size:12.5px;color:#a0a0b0;margin-bottom:4px;">Author</label>' +
          '<input id="cv-author" value="' + escHtml(settings.author) + '" style="width:100%;padding:8px 10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:14px;margin-bottom:14px;">' +
          '<label style="display:block;font-size:12.5px;color:#a0a0b0;margin-bottom:4px;">Cover image</label>' +
          '<button id="cv-pick-image" style="width:100%;padding:10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:13px;cursor:pointer;margin-bottom:6px;">' +
            '\xf0\x9f\x96\xbc\xef\xb8\x8f Pick image from Files / Photos' +
          '</button>' +
          '<input id="cv-file" type="file" accept="image/*" style="display:none;">' +
          (settings.imageDataUrl ? '<button id="cv-clear-image" style="width:100%;padding:6px;background:transparent;color:#e88;border:1px solid #5a3a3a;border-radius:6px;font-size:12px;cursor:pointer;margin-bottom:6px;">Clear current image</button>' : '') +
          manuscriptThumbs +
          '<div style="margin-top:14px;">' +
            '<label style="display:block;font-size:12.5px;color:#a0a0b0;margin-bottom:4px;">Image darken (helps text show)</label>' +
            '<input id="cv-darken" type="range" min="0" max="0.8" step="0.05" value="' + settings.darken + '" style="width:100%;">' +
            '<div style="display:flex;gap:8px;margin-top:10px;">' +
              '<label style="flex:1;font-size:12.5px;color:#a0a0b0;">Title color<input id="cv-titlecolor" type="color" value="' + settings.titleColor + '" style="display:block;width:100%;height:34px;margin-top:4px;border:none;background:transparent;cursor:pointer;"></label>' +
              '<label style="flex:1;font-size:12.5px;color:#a0a0b0;">Author color<input id="cv-authorcolor" type="color" value="' + settings.authorColor + '" style="display:block;width:100%;height:34px;margin-top:4px;border:none;background:transparent;cursor:pointer;"></label>' +
            '</div>' +
            '<div style="display:flex;gap:8px;margin-top:10px;">' +
              '<label style="flex:1;font-size:12.5px;color:#a0a0b0;">BG top<input id="cv-bg1" type="color" value="' + settings.bgColor1 + '" style="display:block;width:100%;height:34px;margin-top:4px;border:none;background:transparent;cursor:pointer;"></label>' +
              '<label style="flex:1;font-size:12.5px;color:#a0a0b0;">BG bottom<input id="cv-bg2" type="color" value="' + settings.bgColor2 + '" style="display:block;width:100%;height:34px;margin-top:4px;border:none;background:transparent;cursor:pointer;"></label>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:center;background:#222232;overflow:auto;padding:20px;">' +
          '<canvas id="cv-canvas" style="max-width:100%;max-height:100%;background:#000;box-shadow:0 8px 32px rgba(0,0,0,0.5);border-radius:4px;"></canvas>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap);

    var canvas = document.getElementById('cv-canvas');
    var fileInput = document.getElementById('cv-file');

    function readSettings() {
      return {
        preset: document.getElementById('cv-preset').value,
        title: document.getElementById('cv-title').value,
        author: document.getElementById('cv-author').value,
        titleColor: document.getElementById('cv-titlecolor').value,
        authorColor: document.getElementById('cv-authorcolor').value,
        bgColor1: document.getElementById('cv-bg1').value,
        bgColor2: document.getElementById('cv-bg2').value,
        darken: parseFloat(document.getElementById('cv-darken').value),
        imageDataUrl: settings.imageDataUrl,
        format: document.getElementById('cv-format').value,
        quality: settings.quality
      };
    }

    async function rebuild() {
      var s = readSettings();
      await renderCoverToCanvas(canvas, s);
    }

    document.getElementById('cv-close').addEventListener('click', function () { wrap.remove(); });
    document.getElementById('cv-pick-image').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { settings.imageDataUrl = r.result; rebuild(); };
      r.readAsDataURL(f);
    });
    var clearBtn = document.getElementById('cv-clear-image');
    if (clearBtn) clearBtn.addEventListener('click', function () { settings.imageDataUrl = null; rebuild(); });
    Array.prototype.forEach.call(wrap.querySelectorAll('.cv-thumb'), function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-img-idx'), 10);
        settings.imageDataUrl = manuscriptImages[idx] || null;
        rebuild();
      });
    });
    ['cv-preset', 'cv-format', 'cv-titlecolor', 'cv-authorcolor', 'cv-bg1', 'cv-bg2'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', rebuild);
    });
    document.getElementById('cv-darken').addEventListener('input', rebuild);
    ['cv-title', 'cv-author'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', debounce(rebuild, 300));
    });

    document.getElementById('cv-save').addEventListener('click', async function () {
      app.coverDesign = readSettings();
      try { await putApp(app); toast('Cover design saved.'); }
      catch (e) { toast('Could not save: ' + (e && e.message), true); }
    });
    document.getElementById('cv-export').addEventListener('click', async function () {
      var s = readSettings();
      await renderCoverToCanvas(canvas, s);
      var mime = s.format === 'png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(function (blob) {
        if (!blob) { toast('Could not export image.', true); return; }
        var safeName = String(app.name || 'cover').replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || 'cover';
        var ext = s.format === 'png' ? '.png' : '.jpg';
        shareBlobOrDownload(blob, safeName + '-cover' + ext, mime,
          'Exported ' + safeName + '-cover' + ext + '. Upload to KDP / Apple Books / Kobo as the cover image.');
      }, mime, s.quality);
    });
    document.getElementById('cv-wrap').addEventListener('click', async function () {
      var s = readSettings();
      // Need the page count to compute the spine. Use the layout-saved
      // page count if available; otherwise estimate from the current
      // book's content via the same heuristic as the Print PDF step.
      var bookSettings = Object.assign(defaultLayout(), app.layout || {});
      var trim = TRIM_PRESETS.filter(function (t) { return t.id === bookSettings.trim; })[0] || TRIM_PRESETS[3];
      var pageCount = 0;
      if (PICTURE_BOOK_TEMPLATES[bookSettings.bookType]) {
        pageCount = picBookPageCount(bookSettings.bookType, bookSettings.customPageCount);
      } else if (app.html) {
        try {
          var doc = new DOMParser().parseFromString(app.html, 'text/html');
          var body = doc.body;
          if (body) {
            var chunks = paginateForPreview(body.innerHTML, trim.w, trim.h, 0.5,
              bookSettings.marginOutside, bookSettings.marginTop, bookSettings.marginBottom);
            pageCount = chunks.length;
          }
        } catch (_) {}
      }
      if (!pageCount) {
        var raw = prompt('Couldn\'t auto-detect page count. Enter the total page count of your book (must be even, 24+ for KDP paperback):', '32');
        if (raw == null) return;
        pageCount = parseInt(raw, 10);
        if (isNaN(pageCount) || pageCount < 24) { toast('Page count must be 24 or more for KDP paperback.', true); return; }
      }
      await openCoverWrapPreview(app, s, trim, pageCount);
    });

    rebuild();
  }

  // Build + open the cover-wrap print preview. Layout:
  //
  //   [BACK COVER]  [SPINE]  [FRONT COVER]
  //
  // Total physical width = trim.w * 2 + spine + 0.125" bleed both ends.
  // Total physical height = trim.h + 0.125" bleed top + 0.125" bleed bottom.
  // No bleed at the spine edges -- only the four outer sides.
  // Browser print API generates the PDF when the user taps Save to Files.
  async function openCoverWrapPreview(app, s, trim, pageCount) {
    var paper = s.wrapPaper || 'white';
    var spine = spineWidthInches(pageCount, paper);
    var bleed = 0.125;
    var totalW = trim.w * 2 + spine + bleed * 2;
    var totalH = trim.h + bleed * 2;
    // Render the front-cover artwork (re-use the canvas designer) at
    // higher resolution so it stays crisp when stretched into the
    // wrap PDF.
    var DPI = 300;
    var renderCanvas = document.createElement('canvas');
    renderCanvas.width = Math.round(trim.w * DPI);
    renderCanvas.height = Math.round(trim.h * DPI);
    // Use the print6x9 preset's canvas size for a 6x9 wrap, etc -- we
    // already have a canvas-renderer; reuse it on a temp canvas.
    await renderCoverToCanvas(renderCanvas, Object.assign({}, s, {
      preset: trim.id === '6x9' ? 'print6x9' :
              trim.id === '8x10' ? 'print8x10' :
              trim.id === '8.5x8.5' ? 'square' :
              'kindle'
    }));
    var coverDataUrl = renderCanvas.toDataURL(s.format === 'png' ? 'image/png' : 'image/jpeg', 0.92);

    var safeTitle = escHtml(s.title || 'Untitled');
    var safeAuthor = escHtml(s.author || '');
    var safeBack = escHtml(s.wrapBackText || '');
    var bgGradient = 'linear-gradient(180deg,' + s.bgColor1 + ',' + s.bgColor2 + ')';

    var html =
      '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<title>' + escHtml(app.name || 'Cover') + ' — Print Wrap</title>' +
      '<style>' +
      '@page { size: ' + totalW + 'in ' + totalH + 'in; margin: 0; }' +
      '*{box-sizing:border-box;}' +
      'html,body{margin:0;padding:0;background:#fff;}' +
      '.wrap{position:relative;width:' + totalW + 'in;height:' + totalH + 'in;background:' + bgGradient + ';overflow:hidden;}' +
      // Bleed-line (dashed) for visual reference -- hidden in print
      '.bleed-line{position:absolute;left:' + bleed + 'in;top:' + bleed + 'in;right:' + bleed + 'in;bottom:' + bleed + 'in;border:1px dashed #d0a050;pointer-events:none;}' +
      // Spine fold lines
      '.fold{position:absolute;top:0;bottom:0;width:0;border-left:1px dashed #888;}' +
      '.fold-left{left:' + (bleed + trim.w) + 'in;}' +
      '.fold-right{left:' + (bleed + trim.w + spine) + 'in;}' +
      // Back cover area
      '.back{position:absolute;left:' + bleed + 'in;top:' + bleed + 'in;width:' + trim.w + 'in;height:' + trim.h + 'in;padding:0.5in;color:' + s.titleColor + ';font-family:Georgia,serif;line-height:1.55;font-size:11pt;}' +
      '.back-text{white-space:pre-wrap;}' +
      // Spine area: title + author rotated
      '.spine{position:absolute;left:' + (bleed + trim.w) + 'in;top:' + bleed + 'in;width:' + spine + 'in;height:' + trim.h + 'in;color:' + s.titleColor + ';display:flex;align-items:center;justify-content:center;}' +
      '.spine-content{transform:rotate(90deg);transform-origin:center;white-space:nowrap;font-family:Georgia,serif;font-weight:700;font-size:14pt;}' +
      // Front cover area: drop the rendered image in
      '.front{position:absolute;left:' + (bleed + trim.w + spine) + 'in;top:' + bleed + 'in;width:' + trim.w + 'in;height:' + trim.h + 'in;background-image:url(' + coverDataUrl + ');background-size:cover;background-position:center;}' +
      // Hide guides at print time
      '@media print { .bleed-line{display:none;} .fold{display:none;} .legend{display:none;} }' +
      '.legend{position:fixed;top:6px;left:6px;background:rgba(0,0,0,0.7);color:#fff;font:11px -apple-system,sans-serif;padding:6px 10px;border-radius:4px;}' +
      '</style>' +
      '</head><body>' +
      '<div class="wrap">' +
        '<div class="back"><div class="back-text">' + safeBack + '</div></div>' +
        '<div class="spine"><div class="spine-content">' + safeTitle + (safeAuthor ? '   ·   ' + safeAuthor : '') + '</div></div>' +
        '<div class="front"></div>' +
        '<div class="bleed-line"></div>' +
        '<div class="fold fold-left"></div>' +
        '<div class="fold fold-right"></div>' +
      '</div>' +
      '<div class="legend">Cover Wrap &mdash; total ' + totalW.toFixed(3) + ' x ' + totalH.toFixed(3) + ' in &nbsp;|&nbsp; spine ' + spine.toFixed(3) + ' in (' + pageCount + ' pages, ' + paper + ' paper) &nbsp;|&nbsp; bleed 0.125 in</div>' +
      '<script>window.addEventListener("load",function(){setTimeout(function(){try{window.print();}catch(e){}},400);});<\/script>' +
      '</body></html>';

    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var w = window.open(url, '_blank');
    if (!w) {
      toast('Pop-up blocked — downloading the wrap HTML instead. Open it in Safari, then Share → Print → Save as PDF.', true);
      var safeName = String(app.name || 'cover').replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || 'cover';
      triggerAnchorDownload(url, safeName + '-cover-wrap.html');
      return;
    }
    toast('Opening wrap preview… Save to Files for KDP cover upload.');
  }

  // Walk the manuscript HTML and pull out every <img src> we find. Used
  // by the cover designer's "pick from your manuscript" thumbnail row
  // so creators don't have to re-import an image they already have.
  function extractManuscriptImages(html) {
    var out = [];
    if (!html) return out;
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var imgs = doc.querySelectorAll('img');
      var seen = {};
      for (var i = 0; i < imgs.length; i++) {
        var src = imgs[i].getAttribute('src') || '';
        if (!src || seen[src]) continue;
        seen[src] = 1;
        out.push(src);
      }
    } catch (e) {}
    return out;
  }

  // Render the cover into the supplied <canvas> at the preset's full
  // print resolution. The canvas is also displayed in the designer
  // preview at CSS-fit size (max-width / max-height) so the user sees
  // the same layout they'll get on export.
  async function renderCoverToCanvas(canvas, s) {
    var preset = COVER_PRESETS.filter(function (p) { return p.id === s.preset; })[0] || COVER_PRESETS[0];
    canvas.width = preset.w;
    canvas.height = preset.h;
    var ctx = canvas.getContext('2d');

    // 1. Background gradient
    var grad = ctx.createLinearGradient(0, 0, 0, preset.h);
    grad.addColorStop(0, s.bgColor1);
    grad.addColorStop(1, s.bgColor2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, preset.w, preset.h);

    // 2. Cover image (object-fit: cover behavior)
    if (s.imageDataUrl) {
      try {
        var img = await loadImage(s.imageDataUrl);
        var ar = img.width / img.height;
        var dstAr = preset.w / preset.h;
        var sw, sh, sx, sy;
        if (ar > dstAr) {
          sh = img.height;
          sw = sh * dstAr;
          sy = 0;
          sx = (img.width - sw) / 2;
        } else {
          sw = img.width;
          sh = sw / dstAr;
          sx = 0;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, preset.w, preset.h);
      } catch (e) { /* fall through to gradient-only background */ }
    }

    // 3. Optional darken overlay -- helps text legibility on busy
    // images. Skipped automatically when there's no image so the user
    // gets a clean colored cover from the gradient alone.
    if (s.imageDataUrl && s.darken > 0) {
      ctx.fillStyle = 'rgba(0,0,0,' + s.darken + ')';
      ctx.fillRect(0, 0, preset.w, preset.h);
    }

    // 4. Title text -- big, center, wraps to multiple lines if needed
    var pad = preset.w * 0.08;
    var titleSize = Math.round(preset.h * 0.075);
    ctx.fillStyle = s.titleColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = preset.h * 0.005;
    ctx.font = '700 ' + titleSize + 'px Georgia, "Times New Roman", serif';
    var titleLines = wrapLines(ctx, s.title || '', preset.w - pad * 2);
    var titleY = preset.h * 0.18;
    titleLines.forEach(function (line, i) {
      ctx.fillText(line, preset.w / 2, titleY + i * titleSize * 1.15);
    });

    // 5. Author text -- smaller, near bottom
    if (s.author) {
      var authorSize = Math.round(preset.h * 0.035);
      ctx.fillStyle = s.authorColor;
      ctx.font = '500 ' + authorSize + 'px Georgia, "Times New Roman", serif';
      ctx.fillText(s.author, preset.w / 2, preset.h - pad - authorSize);
    }
    ctx.shadowBlur = 0;
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Could not load cover image.')); };
      // Allow cross-origin if browser permits; ignored for data: URLs
      img.crossOrigin = 'anonymous';
      img.src = src;
    });
  }

  function wrapLines(ctx, text, maxWidth) {
    if (!text) return [];
    var words = String(text).split(/\s+/);
    var lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function wireCoverBtn() {
    var btn = $('cover-btn');
    if (btn) btn.addEventListener('click', function () {
      if (currentApp) openCoverDesigner(currentApp);
      else toast('Open a manuscript first.', true);
    });
  }

  /* ---------- Book Check ----------
     Two scans rolled into one panel because they share the same
     read-the-manuscript-once architecture and creators usually want
     both before publishing:

     - KDP Pre-flight: catches showstopper issues that cause KDP to
       reject an upload after the 24-hour review (low-DPI images,
       page count not divisible by 4, missing copyright, bleed
       violations, gigantic files...).
     - Reading-level: Flesch reading-ease + Flesch-Kincaid grade level
       computed offline (no AI needed -- just word/sentence/syllable
       counts) plus a suggested BISAC age band for KDP's category
       picker.

     All checks are pure functions over the manuscript HTML, so the
     panel is fast and works offline. */
  function openBookCheck(app) {
    if (!app || !app.html) { toast('Open a manuscript first.', true); return; }

    var existing = document.getElementById('__loadBookCheck');
    if (existing) existing.remove();

    var settings = Object.assign(defaultLayout(), app.layout || {});
    var preflight = runKdpPreflight(app, settings);
    var reading = runReadingLevel(app);

    var wrap = document.createElement('div');
    wrap.id = '__loadBookCheck';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2050;display:flex;flex-direction:column;background:#0f0f1a;color:#f0f0f0;font-family:-apple-system,sans-serif;';

    function row(level, msg, fix) {
      var icon = level === 'pass' ? '✅' :
                 level === 'warn' ? '⚠️' :
                 '❌';
      var border = level === 'pass' ? '#22c55e' :
                   level === 'warn' ? '#fbbf24' :
                   '#ef4444';
      return '<div style="border-left:3px solid ' + border + ';padding:10px 12px;margin-bottom:8px;background:#1a1a2e;border-radius:6px;">' +
        '<div style="font-size:13.5px;color:#f0f0f0;margin-bottom:' + (fix ? 4 : 0) + 'px;"><span style="margin-right:6px;">' + icon + '</span>' + escHtml(msg) + '</div>' +
        (fix ? '<div style="font-size:12px;color:#a0a0b0;line-height:1.4;">Fix: ' + escHtml(fix) + '</div>' : '') +
      '</div>';
    }

    var preflightHtml = preflight.map(function (r) { return row(r.level, r.msg, r.fix); }).join('');
    var passCount = preflight.filter(function (r) { return r.level === 'pass'; }).length;
    var warnCount = preflight.filter(function (r) { return r.level === 'warn'; }).length;
    var failCount = preflight.filter(function (r) { return r.level === 'fail'; }).length;

    var bisacBand = bisacAgeBandFor(reading.gradeLevel);
    var readingHtml =
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:14px;">' +
        statTile('Words', reading.words.toLocaleString()) +
        statTile('Sentences', reading.sentences.toLocaleString()) +
        statTile('Avg sentence', reading.avgSentenceLen.toFixed(1) + ' words') +
        statTile('Reading ease', reading.readingEase.toFixed(1) + ' / 100', readingEaseLabel(reading.readingEase)) +
        statTile('Grade level', reading.gradeLevel.toFixed(1), bisacBand.gradeLabel) +
        statTile('Best for ages', bisacBand.ages, bisacBand.bisac) +
      '</div>';

    // Picture-text balance section -- only relevant when a picture-book
    // template is selected (otherwise word-per-spread isn't meaningful).
    var balanceHtml = '';
    if (PICTURE_BOOK_TEMPLATES[settings.bookType]) {
      var balance = runSpreadBalance(app, settings);
      balanceHtml =
        '<h2 style="font-size:17px;color:#f0f0f0;margin:18px 0 8px;border-bottom:1px solid #2a2a40;padding-bottom:6px;">🖼️ Picture-text balance per spread</h2>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">' +
          '<div style="font-size:13px;color:#cfcfdc;">Target reading age:</div>' +
          '<div style="display:flex;gap:6px;">' +
            ['0-3', '3-5', '5-7', '7-10'].map(function (band) {
              var on = band === balance.ageBand;
              return '<button class="bc-age-band" data-band="' + band + '" style="padding:6px 12px;border-radius:6px;border:1px solid ' + (on ? '#7b6cff' : '#3a3a55') + ';background:' + (on ? '#7b6cff' : '#2a2a40') + ';color:' + (on ? '#12121a' : '#cfcfdc') + ';font-size:12.5px;font-weight:' + (on ? '700' : '500') + ';cursor:pointer;">Ages ' + band + '</button>';
            }).join('') +
          '</div>' +
          '<div style="font-size:12px;color:#a0a0b0;margin-left:auto;">Industry max: <strong>' + balance.maxWords + ' words / spread</strong></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:10px;">' +
          balance.spreads.map(function (sp) {
            var color = sp.level === 'pass' ? '#22c55e' :
                        sp.level === 'warn' ? '#fbbf24' :
                        sp.level === 'fail' ? '#ef4444' :
                        '#3a3a55';
            var bg = sp.level === 'pass' ? 'rgba(34,197,94,0.10)' :
                     sp.level === 'warn' ? 'rgba(251,191,36,0.10)' :
                     sp.level === 'fail' ? 'rgba(239,68,68,0.10)' :
                     'rgba(123,108,255,0.06)';
            return '<div style="border:1px solid ' + color + ';background:' + bg + ';border-radius:6px;padding:8px 10px;">' +
              '<div style="font-size:10px;color:#a0a0b0;text-transform:uppercase;letter-spacing:0.5px;">' + escHtml(sp.label) + '</div>' +
              '<div style="font-size:18px;font-weight:700;color:' + color + ';">' + sp.words + '</div>' +
              '<div style="font-size:11px;color:#cfcfdc;">' + (sp.note || (sp.words === 1 ? 'word' : 'words')) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<p style="font-size:12.5px;color:#a0a0b0;margin:0 0 22px;">' +
          '<strong>' + balance.failCount + '</strong> spread' + (balance.failCount === 1 ? '' : 's') + ' over the max' +
          (balance.warnCount ? ', <strong>' + balance.warnCount + '</strong> close to it' : '') + '. ' +
          'Story average: <strong>' + balance.avgWords.toFixed(1) + ' words/spread</strong>. ' +
          'Tap an age band above to re-evaluate against a different audience.' +
        '</p>';
    }

    wrap.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1a1a2e;border-bottom:1px solid #2a2a40;flex-wrap:wrap;">' +
        '<button id="bc-close" style="background:#3a3a55;border:none;color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;cursor:pointer;">&larr; Close</button>' +
        '<div style="font-weight:700;font-size:15px;margin-right:auto;">Book Check &mdash; ' + escHtml(app.name || 'Untitled') + '</div>' +
        '<div style="font-size:12.5px;color:#a0a0b0;">' +
          '<span style="color:#22c55e;">✅ ' + passCount + ' pass</span> &middot; ' +
          '<span style="color:#fbbf24;">⚠️ ' + warnCount + ' warn</span> &middot; ' +
          '<span style="color:#ef4444;">❌ ' + failCount + ' fail</span>' +
        '</div>' +
      '</div>' +
      '<div style="flex:1;overflow-y:auto;padding:18px 22px;max-width:900px;width:100%;margin:0 auto;">' +
        '<h2 style="font-size:17px;color:#f0f0f0;margin:0 0 12px;border-bottom:1px solid #2a2a40;padding-bottom:6px;">📚 Reading level &amp; age band</h2>' +
        readingHtml +
        '<p style="font-size:12.5px;color:#a0a0b0;margin:0 0 22px;">Flesch reading-ease and Flesch-Kincaid grade are computed offline from word, sentence and syllable counts. The age band maps the grade level to KDP’s standard BISAC categories &mdash; pick this on the KDP upload form.</p>' +
        balanceHtml +
        '<h2 style="font-size:17px;color:#f0f0f0;margin:0 0 12px;border-bottom:1px solid #2a2a40;padding-bottom:6px;">✈️ KDP pre-flight check</h2>' +
        preflightHtml +
        '<p style="font-size:12.5px;color:#a0a0b0;margin:14px 0 0;">All checks run locally on this device. Re-open Book Check after edits to re-scan.</p>' +
      '</div>';

    document.body.appendChild(wrap);
    document.getElementById('bc-close').addEventListener('click', function () { wrap.remove(); });
    // Re-evaluate the balance section against a different age band
    // without re-opening the panel.
    Array.prototype.forEach.call(wrap.querySelectorAll('.bc-age-band'), function (btn) {
      btn.addEventListener('click', function () {
        if (!app.layout) app.layout = {};
        app.layout.targetAgeBand = btn.getAttribute('data-band');
        wrap.remove();
        openBookCheck(app);  // simplest: re-open with the new band sticky
      });
    });
  }

  function statTile(label, value, sub) {
    return '<div style="background:#1a1a2e;border:1px solid #2a2a40;border-radius:8px;padding:12px 14px;">' +
      '<div style="font-size:11px;color:#a0a0b0;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">' + escHtml(label) + '</div>' +
      '<div style="font-size:20px;font-weight:700;color:#f0f0f0;">' + escHtml(String(value)) + '</div>' +
      (sub ? '<div style="font-size:12px;color:#7b6cff;margin-top:4px;">' + escHtml(sub) + '</div>' : '') +
    '</div>';
  }

  // Strip HTML and return plain text for analysis
  function manuscriptPlainText(app) {
    try {
      var doc = new DOMParser().parseFromString(app.html || '', 'text/html');
      // Drop any auto-injected book title H1 so it doesn't skew sentence counts
      var bookTitle = doc.querySelector('h1.book-title');
      if (bookTitle) bookTitle.remove();
      return (doc.body && doc.body.textContent || '').replace(/\s+/g, ' ').trim();
    } catch (e) {
      return String(app.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  /* Heuristic syllable counter. Won't match a dictionary perfectly but
     it's accurate to within ~5% for ordinary English prose -- which is
     the precision Flesch-Kincaid needs. Counts vowel groups and
     subtracts a silent trailing 'e'. */
  function countSyllables(word) {
    if (!word) return 0;
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return 0;
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    var matches = word.match(/[aeiouy]+/g);
    return matches ? matches.length : 1;
  }

  function runReadingLevel(app) {
    var text = manuscriptPlainText(app);
    if (!text) {
      return { words: 0, sentences: 0, syllables: 0, avgSentenceLen: 0, readingEase: 0, gradeLevel: 0 };
    }
    // Sentences: split on period / exclam / question, ignore empty
    var sentenceMatches = text.match(/[^.!?]+[.!?]+/g);
    var sentences = sentenceMatches ? sentenceMatches.length : 1;
    // Words: split on whitespace
    var words = text.split(/\s+/).filter(function (w) { return /[a-zA-Z]/.test(w); });
    var wordCount = words.length;
    if (!wordCount) return { words: 0, sentences: sentences, syllables: 0, avgSentenceLen: 0, readingEase: 0, gradeLevel: 0 };
    var syllables = 0;
    for (var i = 0; i < words.length; i++) syllables += countSyllables(words[i]);
    var asl = wordCount / sentences;
    var asw = syllables / wordCount;
    var ease = 206.835 - 1.015 * asl - 84.6 * asw;
    var grade = 0.39 * asl + 11.8 * asw - 15.59;
    return {
      words: wordCount,
      sentences: sentences,
      syllables: syllables,
      avgSentenceLen: asl,
      readingEase: Math.max(0, Math.min(120, ease)),
      gradeLevel: Math.max(0, grade)
    };
  }

  function readingEaseLabel(score) {
    if (score >= 90) return 'Very easy';
    if (score >= 80) return 'Easy';
    if (score >= 70) return 'Fairly easy';
    if (score >= 60) return 'Plain English';
    if (score >= 50) return 'Fairly hard';
    if (score >= 30) return 'College level';
    return 'College graduate';
  }

  function bisacAgeBandFor(grade) {
    // Map grade level to KDP / BISAC age categories. KDP requires
    // picking an age range and grade range when listing a kids' book;
    // these ranges line up with the standard JUVENILE FICTION
    // categories.
    if (grade < 1) return { ages: '0-3', gradeLabel: 'Pre-K', bisac: 'Picture book / board book' };
    if (grade < 2) return { ages: '3-5', gradeLabel: 'Pre-K - K', bisac: 'Picture book / early reader' };
    if (grade < 3) return { ages: '4-7', gradeLabel: 'K - 2', bisac: 'Beginner reader / early picture book' };
    if (grade < 5) return { ages: '6-9', gradeLabel: '1 - 4', bisac: 'Chapter book / early middle grade' };
    if (grade < 7) return { ages: '8-12', gradeLabel: '3 - 7', bisac: 'Middle grade' };
    if (grade < 9) return { ages: '12-17', gradeLabel: '7 - 12', bisac: 'Young adult' };
    return { ages: '18+', gradeLabel: 'College+', bisac: 'Adult fiction / non-fiction' };
  }

  /* Picture-text balance per spread.
     Industry rule of thumb (children's-book editorial): the younger
     the reader, the fewer words per spread. Board books for ages 0-3
     stay around 5-10 words per spread; standard picture books for
     ages 3-5 cap at ~50 words; ages 5-7 can handle ~100; early
     chapter books for ages 7-10 can run higher.

     This walks the picture-book layout the same way buildLayoutPreviewHtml
     does, gets the words landing on each story page, pairs them
     into spreads, and flags which ones exceed the recommended max
     for the chosen age band.

     Returns { ageBand, maxWords, spreads:[{label, words, level, note}],
               failCount, warnCount, avgWords, totalStoryWords }. */
  function runSpreadBalance(app, settings) {
    var bandFromSettings = settings.targetAgeBand;
    // Default age band: derive from the reading-level grade if the user
    // hasn't explicitly chosen one yet
    if (!bandFromSettings) {
      var rl = runReadingLevel(app);
      var b = bisacAgeBandFor(rl.gradeLevel);
      bandFromSettings = b.ages;
    }
    var maxWordsByBand = {
      '0-3': 10,
      '3-5': 50,
      '5-7': 100,
      '7-10': 200,
      // Reading-level mapper sometimes returns these adjacent bands
      '4-7': 75,
      '6-9': 150,
      '8-12': 250,
      '12-17': 400,
      '18+': 600
    };
    var max = maxWordsByBand[bandFromSettings] || 50;

    // Build pages exactly as the layout view does so per-spread word
    // counts match what the user will see on the page.
    var trim = TRIM_PRESETS.filter(function (t) { return t.id === settings.trim; })[0] || TRIM_PRESETS[3];
    var contentBody = '';
    try {
      var doc = new DOMParser().parseFromString(app.html || '', 'text/html');
      contentBody = doc.body ? doc.body.innerHTML : (app.html || '');
    } catch (e) { contentBody = app.html || ''; }
    var chunks = paginateForPreview(contentBody, trim.w, trim.h, 0.5,
      settings.marginOutside, settings.marginTop, settings.marginBottom);
    var total = picBookPageCount(settings.bookType, settings.customPageCount);
    var STRUCTURAL_FRONT = 5, STRUCTURAL_BACK = 3;
    var storyPageCount = total - STRUCTURAL_FRONT - STRUCTURAL_BACK;
    var perPage = Math.max(1, Math.ceil(chunks.length / Math.max(1, storyPageCount)));

    function wordsOf(html) {
      if (!html) return 0;
      var t = String(html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (!t) return 0;
      return t.split(/\s+/).filter(function (w) { return /[a-zA-Z0-9]/.test(w); }).length;
    }

    // Walk each printed page index, pull its content, count words.
    // Then pair into spreads following the same convention as the
    // schema view: page 1 alone, [2|3], [4|5], ..., last page alone.
    var pageWords = [];
    for (var pn = 1; pn <= total; pn++) {
      var isStructural = pn <= STRUCTURAL_FRONT || pn > total - STRUCTURAL_BACK;
      if (isStructural) { pageWords.push(0); continue; }
      var storyIdx = pn - STRUCTURAL_FRONT - 1;
      var fromIdx = storyIdx * perPage;
      var toIdx = Math.min(chunks.length, fromIdx + perPage);
      pageWords.push(wordsOf(chunks.slice(fromIdx, toIdx).join('')));
    }

    var spreads = [];
    // Page 1 alone (cover paste-down)
    spreads.push({ label: 'Page 1', words: 0, level: 'na', note: 'Cover paste-down' });
    for (var p = 1; p < total - 1; p += 2) {
      var pair = pageWords[p] + (pageWords[p + 1] || 0);
      var role1 = pageRoleForPictureBook(p + 1, total);
      var role2 = (p + 1 < total - 1) ? pageRoleForPictureBook(p + 2, total) : '';
      var label = role1.indexOf('Story Spread') === 0 ? role1.replace('Story ', '') :
                  ('Pages ' + (p + 1) + '–' + (p + 2));
      var level, note;
      if (role1.indexOf('Story Spread') !== 0 && role2.indexOf('Story Spread') !== 0) {
        // Structural spread (title/copyright/dedication/back-matter)
        level = 'na'; note = 'structural';
      } else if (pair === 0) {
        level = 'warn'; note = 'empty — add content or illustration';
      } else if (pair > max) {
        level = 'fail'; note = 'over max for ages ' + bandFromSettings;
      } else if (pair > max * 0.85) {
        level = 'warn'; note = 'near the limit';
      } else {
        level = 'pass'; note = pair === 1 ? 'word' : 'words';
      }
      spreads.push({ label: label, words: pair, level: level, note: note });
    }
    // Last page alone (back paste-down)
    spreads.push({ label: 'Page ' + total, words: 0, level: 'na', note: 'Back paste-down' });

    var storyOnly = spreads.filter(function (s) { return s.level !== 'na'; });
    var failCount = storyOnly.filter(function (s) { return s.level === 'fail'; }).length;
    var warnCount = storyOnly.filter(function (s) { return s.level === 'warn'; }).length;
    var totalStoryWords = storyOnly.reduce(function (sum, s) { return sum + s.words; }, 0);
    var avgWords = storyOnly.length ? (totalStoryWords / storyOnly.length) : 0;

    return {
      ageBand: bandFromSettings,
      maxWords: max,
      spreads: spreads,
      failCount: failCount,
      warnCount: warnCount,
      avgWords: avgWords,
      totalStoryWords: totalStoryWords
    };
  }


  function runKdpPreflight(app, layoutSettings) {
    var checks = [];

    // 1. Page count rules (paperback only)
    var isPicBook = !!PICTURE_BOOK_TEMPLATES[layoutSettings.bookType];
    var pageCount = 0;
    if (isPicBook) {
      pageCount = picBookPageCount(layoutSettings.bookType, layoutSettings.customPageCount);
    } else if (app.html) {
      try {
        var doc = new DOMParser().parseFromString(app.html, 'text/html');
        var trim = TRIM_PRESETS.filter(function (t) { return t.id === layoutSettings.trim; })[0] || TRIM_PRESETS[3];
        if (doc && doc.body) {
          var chunks = paginateForPreview(doc.body.innerHTML, trim.w, trim.h, 0.5,
            layoutSettings.marginOutside, layoutSettings.marginTop, layoutSettings.marginBottom);
          pageCount = chunks.length;
        }
      } catch (e) {}
    }
    if (pageCount === 0) {
      checks.push({ level: 'warn', msg: 'Could not estimate the page count.',
        fix: 'Open the Layout panel once so the preview can compute pagination.' });
    } else {
      if (pageCount < 24) {
        checks.push({ level: 'fail', msg: 'Page count is ' + pageCount + ', but KDP paperback minimum is 24.',
          fix: 'Add more content, or print as an ebook only (no minimum for Kindle).' });
      } else if (pageCount > 828) {
        checks.push({ level: 'fail', msg: 'Page count is ' + pageCount + ', but KDP paperback maximum is 828 (white) / 776 (cream).',
          fix: 'Split into Volume 1 and Volume 2.' });
      } else if (pageCount % 2 !== 0) {
        checks.push({ level: 'warn', msg: 'Page count is ' + pageCount + ' (odd). KDP prefers an even total.',
          fix: 'Add a blank back-matter page.' });
      } else {
        checks.push({ level: 'pass', msg: 'Page count ' + pageCount + ' is within KDP paperback range (24–828).' });
      }
      // Picture-book rule: KDP Kids requires multiples of 4
      if (isPicBook && pageCount % 4 !== 0) {
        checks.push({ level: 'fail', msg: 'Picture-book templates require page counts divisible by 4. Current: ' + pageCount + '.',
          fix: 'Switch to a 24/32/40/48-page template in the Layout panel.' });
      } else if (isPicBook) {
        checks.push({ level: 'pass', msg: 'Picture-book page count divisible by 4 (KDP Kids requirement).' });
      }
    }

    // 2. Image checks via DOM scan
    try {
      var doc2 = new DOMParser().parseFromString(app.html || '', 'text/html');
      var imgs = doc2.querySelectorAll('img');
      var noAlt = 0, dataUrls = 0, total = imgs.length;
      for (var i = 0; i < imgs.length; i++) {
        if (!imgs[i].getAttribute('alt')) noAlt++;
        var src = imgs[i].getAttribute('src') || '';
        if (/^data:/i.test(src)) dataUrls++;
      }
      if (total === 0) {
        if (isPicBook) {
          checks.push({ level: 'warn', msg: 'Picture-book layout selected but no images found in the manuscript.',
            fix: 'Drop your illustrations into the manuscript via the Edit Text view (✏️) or import a .docx with images.' });
        } else {
          checks.push({ level: 'pass', msg: 'No inline images to validate.' });
        }
      } else {
        checks.push({ level: 'pass', msg: 'Found ' + total + ' inline image' + (total === 1 ? '' : 's') + '.' });
        if (noAlt > 0) {
          checks.push({ level: 'warn', msg: noAlt + ' of ' + total + ' images are missing alt text.',
            fix: 'Open Edit Text, select the image, and add a description so VoiceOver readers and KDP accessibility checks pass.' });
        } else {
          checks.push({ level: 'pass', msg: 'All ' + total + ' images have alt text.' });
        }
        // Data URL images carry their own resolution; warn the creator we
        // cannot natively check DPI without rendering each one. Cheap
        // heuristic: tiny base64 length means low resolution.
        if (dataUrls > 0) {
          checks.push({ level: 'warn', msg: dataUrls + ' image' + (dataUrls === 1 ? '' : 's') + ' embedded as data URL.',
            fix: 'Verify each is at least 300 DPI for print (KDP rejects below). Open the Cover designer to see the rendered size, or re-import a higher-resolution version.' });
        }
      }
    } catch (e) {
      checks.push({ level: 'warn', msg: 'Could not parse the manuscript HTML for an image scan.',
        fix: 'Re-import the manuscript if it was damaged.' });
    }

    // 3. Front-matter sanity
    var lower = (app.html || '').toLowerCase();
    if (!/copyright|©|&copy;|\(c\)\s*\d{4}/i.test(lower)) {
      checks.push({ level: 'warn', msg: 'No copyright statement found.',
        fix: 'Add a copyright line such as "© ' + new Date().getFullYear() + ' [your name], all rights reserved." on a dedicated front-matter page.' });
    } else {
      checks.push({ level: 'pass', msg: 'Copyright statement detected.' });
    }
    if (!app.author && !/by\s+[A-Z]/.test(app.html || '')) {
      checks.push({ level: 'warn', msg: 'No author name on the book record.',
        fix: 'Set app.author or add "by [Your Name]" near the title page. KDP requires the author field on upload.' });
    } else {
      checks.push({ level: 'pass', msg: 'Author information is present.' });
    }

    // 4. Cover design saved?
    if (!app.coverDesign) {
      checks.push({ level: 'warn', msg: 'No cover design saved.',
        fix: 'Open the Cover designer (🎨) and tap Save design. KDP requires a separate cover image upload.' });
    } else {
      checks.push({ level: 'pass', msg: 'Cover design saved.' });
    }

    // 5. File size sanity (rough MB estimate)
    var sizeBytes = (app.html || '').length;
    var sizeMb = sizeBytes / (1024 * 1024);
    if (sizeMb > 50) {
      checks.push({ level: 'warn', msg: 'Manuscript HTML is ' + sizeMb.toFixed(1) + ' MB.',
        fix: 'KDP allows up to 650 MB for print PDFs but the heavier the file the slower the upload. Compress embedded images.' });
    } else {
      checks.push({ level: 'pass', msg: 'Manuscript size ' + (sizeMb < 1 ? sizeBytes.toLocaleString() + ' bytes' : sizeMb.toFixed(1) + ' MB') + ' is reasonable.' });
    }

    return checks;
  }

  function wireBookCheckBtn() {
    var btn = $('book-check-btn');
    if (btn) btn.addEventListener('click', function () {
      if (currentApp) openBookCheck(currentApp);
      else toast('Open a manuscript first.', true);
    });
  }

  /* ---------- AI Blurb Writer ----------
     Drafts a 150-word back-cover blurb using the AI provider chain.
     Pre-fills title, author, age band (from the reading-level scan),
     genre. Result is shown inline; tap Copy or Save to keep it on the
     book record.

     Blurbs are universally hated by authors; making it one tap saves
     hours of agonizing over comp titles and hooks. */
  function openBlurbWriter(app) {
    if (!app) { toast('Open a manuscript first.', true); return; }
    var existing = document.getElementById('__loadBlurb');
    if (existing) existing.remove();

    var reading = runReadingLevel(app);
    var ageBand = bisacAgeBandFor(reading.gradeLevel);
    var existingBlurb = (app.blurb && app.blurb.text) || '';

    var wrap = document.createElement('div');
    wrap.id = '__loadBlurb';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2050;display:flex;flex-direction:column;background:#0f0f1a;color:#f0f0f0;font-family:-apple-system,sans-serif;';

    wrap.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1a1a2e;border-bottom:1px solid #2a2a40;flex-wrap:wrap;">' +
        '<button id="bl-close" style="background:#3a3a55;border:none;color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;cursor:pointer;">&larr; Close</button>' +
        '<div style="font-weight:700;font-size:15px;margin-right:auto;">AI Blurb Writer &mdash; ' + escHtml(app.name || 'Untitled') + '</div>' +
      '</div>' +
      '<div style="flex:1;overflow-y:auto;padding:18px 22px;max-width:780px;width:100%;margin:0 auto;">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">' +
          '<label style="font-size:12.5px;color:#a0a0b0;">Title<input id="bl-title" value="' + escHtml(app.name || '') + '" style="display:block;width:100%;margin-top:4px;padding:8px 10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:14px;"></label>' +
          '<label style="font-size:12.5px;color:#a0a0b0;">Author<input id="bl-author" value="' + escHtml(app.author || '') + '" style="display:block;width:100%;margin-top:4px;padding:8px 10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:14px;"></label>' +
          '<label style="font-size:12.5px;color:#a0a0b0;">Genre / category<select id="bl-genre" style="display:block;width:100%;margin-top:4px;padding:8px 10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:14px;">' +
            '<option>Picture book</option>' +
            '<option>Middle-grade fiction</option>' +
            '<option>Young-adult fiction</option>' +
            '<option>Adult fiction</option>' +
            '<option>Memoir / non-fiction</option>' +
            '<option>Self-help</option>' +
            '<option>Cookbook</option>' +
            '<option>Devotional / spiritual</option>' +
            '<option>Workbook / journal</option>' +
          '</select></label>' +
          '<label style="font-size:12.5px;color:#a0a0b0;">Age band<input id="bl-age" value="' + escHtml(ageBand.ages) + '" style="display:block;width:100%;margin-top:4px;padding:8px 10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:14px;"></label>' +
        '</div>' +
        '<label style="font-size:12.5px;color:#a0a0b0;">Hook (one line, optional)' +
          '<input id="bl-hook" placeholder="What makes this book special?" style="display:block;width:100%;margin-top:4px;padding:8px 10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:14px;">' +
        '</label>' +
        '<div style="display:flex;gap:8px;margin-top:14px;">' +
          '<button id="bl-generate" style="flex:1;background:#7b6cff;border:none;color:#12121a;padding:12px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;">✨ Generate blurb</button>' +
          '<button id="bl-regenerate" style="background:#3a3a55;border:none;color:#fff;padding:12px 14px;border-radius:8px;font-size:14px;cursor:pointer;" title="Try another draft">↻ Try again</button>' +
        '</div>' +
        '<div id="bl-status" style="font-size:12.5px;color:#a0a0b0;margin-top:8px;min-height:18px;"></div>' +
        '<textarea id="bl-result" placeholder="Your blurb appears here. Tap Generate when ready." style="width:100%;min-height:240px;margin-top:12px;padding:14px;background:#1a1a2e;color:#f0f0f0;border:1px solid #2a2a40;border-radius:8px;font-size:15px;line-height:1.55;font-family:Georgia,serif;resize:vertical;">' + escHtml(existingBlurb) + '</textarea>' +
        '<div style="display:flex;gap:8px;margin-top:10px;">' +
          '<button id="bl-copy" style="background:#22c55e;border:none;color:#062013;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">📋 Copy</button>' +
          '<button id="bl-save" style="background:#3a3a55;border:none;color:#fff;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Save to book</button>' +
        '</div>' +
        '<p style="font-size:12px;color:#a0a0b0;margin-top:18px;">Routes through your AI helper chain (Pollinations / Hugging Face / OpenRouter / Gemini / on-device). Try Again uses a different temperature for variation.</p>' +
      '</div>';

    document.body.appendChild(wrap);

    var resultEl = document.getElementById('bl-result');
    var statusEl = document.getElementById('bl-status');

    function buildPrompt(temp) {
      var title = document.getElementById('bl-title').value.trim() || 'Untitled';
      var author = document.getElementById('bl-author').value.trim() || 'an emerging author';
      var genre = document.getElementById('bl-genre').value;
      var ages = document.getElementById('bl-age').value.trim();
      var hook = document.getElementById('bl-hook').value.trim();
      var sample = manuscriptPlainText(app).slice(0, 1500);
      var p = 'You are a professional book-marketing copywriter. Write a back-cover blurb for the book described below.';
      p += '\n\nTITLE: ' + title;
      p += '\nAUTHOR: ' + author;
      p += '\nGENRE: ' + genre;
      if (ages) p += '\nTARGET AGE: ' + ages;
      if (hook) p += '\nHOOK: ' + hook;
      p += '\n\nMANUSCRIPT EXCERPT (first ~1500 chars):\n' + sample;
      p += '\n\nWrite ONLY the blurb body. 130–170 words. ';
      p += 'Open with a hook. Tease the conflict. End with stakes that make a browser want to buy. ';
      p += 'Plain language, no clichés like "rollercoaster" or "page-turner". No headings, no bullet lists, no spoilers. ';
      p += 'Do not include the title, the author name, or quote-marks around the blurb.';
      if (temp) p += '\n\n(Try a different angle than a standard blurb -- emotional / mood-driven.)';
      return p;
    }

    async function generate(varyAngle) {
      statusEl.textContent = 'Asking the AI helper…';
      resultEl.disabled = true;
      var prompt = buildPrompt(varyAngle);
      var got = null;
      // Run the same provider chain the helper bubble uses, but
      // silent (no thinking-bubble UI). Returns first non-empty
      // string answer.
      for (var i = 0; i < LOAD_PROVIDERS.length; i++) {
        var p = LOAD_PROVIDERS[i];
        if (!p.available || !p.available()) continue;
        if (p.name === 'builtin') continue; // KB rule-based can't write blurbs
        statusEl.textContent = 'Asking ' + p.label.replace(/^via\s+/, '') + '…';
        try {
          var text = await p.ask(prompt, '');
          if (text && text.trim().length > 30) { got = { text: text.trim(), provider: p.label }; break; }
        } catch (e) {
          // Fall through to the next provider
        }
      }
      resultEl.disabled = false;
      if (!got) {
        statusEl.textContent = 'No AI provider responded. Check Settings → Load AI: enable Pollinations or paste a key.';
        return;
      }
      // Strip any wrapping quotes / heading the model added despite the
      // instruction, and any leading '## Blurb' style header.
      var clean = got.text
        .replace(/^["'\s]+|["'\s]+$/g, '')
        .replace(/^#{1,3}.*\n+/, '')
        .replace(/^[Bb]lurb:?\s*\n+/, '')
        .trim();
      resultEl.value = clean;
      statusEl.textContent = 'Drafted ' + got.provider.replace(/^via\s+/, '') + '. ' +
        clean.split(/\s+/).length + ' words.';
    }

    document.getElementById('bl-close').addEventListener('click', function () { wrap.remove(); });
    document.getElementById('bl-generate').addEventListener('click', function () { generate(false); });
    document.getElementById('bl-regenerate').addEventListener('click', function () { generate(true); });
    document.getElementById('bl-copy').addEventListener('click', function () {
      var v = resultEl.value;
      if (!v) { toast('Nothing to copy.', true); return; }
      try {
        navigator.clipboard.writeText(v).then(function () { toast('Blurb copied.'); });
      } catch (e) { toast('Could not copy.', true); }
    });
    document.getElementById('bl-save').addEventListener('click', async function () {
      app.blurb = { text: resultEl.value, savedAt: Date.now() };
      try { await putApp(app); toast('Blurb saved to this book.'); }
      catch (e) { toast('Could not save: ' + (e && e.message), true); }
    });
  }

  function wireBlurbBtn() {
    var btn = $('blurb-btn');
    if (btn) btn.addEventListener('click', function () {
      if (currentApp) openBlurbWriter(currentApp);
      else toast('Open a manuscript first.', true);
    });
  }

  /* ---------- KDP Metadata Manager ----------
     One screen that stores everything the KDP upload form asks for so
     the user doesn't have to remember them at submission time. ISBN,
     three BISAC categories, seven keywords, series info, price, the
     edition number, language, contributors. Saves to app.metadata,
     and offers a "Copy for KDP form" button that pastes a
     pre-formatted block. */
  function openMetadataManager(app) {
    if (!app) { toast('Open a manuscript first.', true); return; }
    var existing = document.getElementById('__loadMetadata');
    if (existing) existing.remove();

    var meta = Object.assign({
      isbn: '', categories: ['', '', ''], keywords: ['', '', '', '', '', '', ''],
      seriesName: '', seriesNumber: '', priceUsd: '', edition: '1',
      language: 'English', contributors: '',
      description: '', // pulled from blurb if present
      releaseDate: ''
    }, app.metadata || {});
    if ((!meta.description || !meta.description.trim()) && app.blurb && app.blurb.text) {
      meta.description = app.blurb.text;
    }

    var wrap = document.createElement('div');
    wrap.id = '__loadMetadata';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2050;display:flex;flex-direction:column;background:#0f0f1a;color:#f0f0f0;font-family:-apple-system,sans-serif;';

    function field(label, id, value, opts) {
      opts = opts || {};
      var t = opts.type || 'text';
      return '<label style="display:block;font-size:12.5px;color:#a0a0b0;margin-bottom:10px;">' + escHtml(label) +
        '<input id="' + id + '" type="' + t + '" value="' + escHtml(value || '') + '"' +
          (opts.placeholder ? ' placeholder="' + escHtml(opts.placeholder) + '"' : '') +
          ' style="display:block;width:100%;margin-top:4px;padding:8px 10px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:14px;">' +
      '</label>';
    }

    var keywordsHtml = meta.keywords.map(function (kw, i) {
      return field('Keyword ' + (i + 1), 'mt-kw-' + i, kw, { placeholder: 'KDP allows 7 keywords' });
    }).join('');

    var categoriesHtml = meta.categories.map(function (cat, i) {
      return field('BISAC category ' + (i + 1), 'mt-cat-' + i, cat,
        { placeholder: 'e.g. JUVENILE FICTION / Animals / Foxes' });
    }).join('');

    wrap.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1a1a2e;border-bottom:1px solid #2a2a40;">' +
        '<button id="mt-close" style="background:#3a3a55;border:none;color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;cursor:pointer;">&larr; Close</button>' +
        '<div style="font-weight:700;font-size:15px;margin-right:auto;">KDP Metadata &mdash; ' + escHtml(app.name || 'Untitled') + '</div>' +
        '<button id="mt-copy" style="background:#22c55e;border:none;color:#062013;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">📋 Copy for KDP form</button>' +
        '<button id="mt-save" style="background:#7b6cff;border:none;color:#12121a;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Save</button>' +
      '</div>' +
      '<div style="flex:1;overflow-y:auto;padding:18px 22px;max-width:900px;width:100%;margin:0 auto;">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 14px;">' +
          field('ISBN (13-digit, optional — KDP gives you a free ASIN)', 'mt-isbn', meta.isbn, { placeholder: '978-...' }) +
          field('Edition', 'mt-edition', meta.edition, { placeholder: '1' }) +
          field('Language', 'mt-lang', meta.language) +
          field('Release date (YYYY-MM-DD, optional)', 'mt-release', meta.releaseDate, { placeholder: '2026-05-01' }) +
          field('Series name (optional)', 'mt-series', meta.seriesName) +
          field('Series number', 'mt-series-n', meta.seriesNumber, { placeholder: '1' }) +
          field('Price (USD, ebook list price)', 'mt-price', meta.priceUsd, { placeholder: '4.99' }) +
          field('Contributors (illustrator, editor, narrator)', 'mt-contrib', meta.contributors) +
        '</div>' +
        '<h3 style="font-size:14px;color:#f0f0f0;margin:16px 0 8px;">BISAC categories (KDP picks 3)</h3>' +
        categoriesHtml +
        '<h3 style="font-size:14px;color:#f0f0f0;margin:16px 0 8px;">Keywords (KDP picks 7)</h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 14px;">' + keywordsHtml + '</div>' +
        '<h3 style="font-size:14px;color:#f0f0f0;margin:16px 0 8px;">Description / blurb</h3>' +
        '<textarea id="mt-desc" placeholder="Description shown on the Amazon listing. Pulled from your saved blurb when present." style="width:100%;min-height:160px;padding:12px;background:#2a2a40;color:#fff;border:1px solid #3a3a55;border-radius:6px;font-size:14px;line-height:1.55;font-family:Georgia,serif;resize:vertical;">' + escHtml(meta.description) + '</textarea>' +
        '<p style="font-size:12px;color:#a0a0b0;margin:18px 0 0;">All metadata is saved on this device only. Tap "Copy for KDP form" to get a paste-friendly text block to drop into KDP\'s upload screens.</p>' +
      '</div>';

    document.body.appendChild(wrap);

    function readAll() {
      return {
        isbn: document.getElementById('mt-isbn').value.trim(),
        edition: document.getElementById('mt-edition').value.trim(),
        language: document.getElementById('mt-lang').value.trim(),
        releaseDate: document.getElementById('mt-release').value.trim(),
        seriesName: document.getElementById('mt-series').value.trim(),
        seriesNumber: document.getElementById('mt-series-n').value.trim(),
        priceUsd: document.getElementById('mt-price').value.trim(),
        contributors: document.getElementById('mt-contrib').value.trim(),
        categories: [0, 1, 2].map(function (i) { return document.getElementById('mt-cat-' + i).value.trim(); }),
        keywords: [0, 1, 2, 3, 4, 5, 6].map(function (i) { return document.getElementById('mt-kw-' + i).value.trim(); }),
        description: document.getElementById('mt-desc').value.trim()
      };
    }

    document.getElementById('mt-close').addEventListener('click', function () { wrap.remove(); });
    document.getElementById('mt-save').addEventListener('click', async function () {
      app.metadata = readAll();
      try { await putApp(app); toast('Metadata saved.'); }
      catch (e) { toast('Could not save: ' + (e && e.message), true); }
    });
    document.getElementById('mt-copy').addEventListener('click', function () {
      var m = readAll();
      var lines = [];
      lines.push('# KDP upload — ' + (app.name || 'Untitled'));
      if (app.author) lines.push('Author: ' + app.author);
      if (m.contributors) lines.push('Contributors: ' + m.contributors);
      lines.push('Language: ' + (m.language || 'English'));
      lines.push('Edition: ' + (m.edition || '1'));
      if (m.isbn) lines.push('ISBN: ' + m.isbn);
      if (m.releaseDate) lines.push('Release date: ' + m.releaseDate);
      if (m.seriesName) lines.push('Series: ' + m.seriesName + (m.seriesNumber ? ' #' + m.seriesNumber : ''));
      if (m.priceUsd) lines.push('Price (USD): $' + m.priceUsd);
      lines.push('');
      lines.push('## BISAC categories (paste into KDP categories)');
      m.categories.filter(Boolean).forEach(function (c, i) { lines.push((i + 1) + '. ' + c); });
      lines.push('');
      lines.push('## Keywords (paste into the 7 keyword fields)');
      m.keywords.filter(Boolean).forEach(function (k, i) { lines.push((i + 1) + '. ' + k); });
      lines.push('');
      lines.push('## Description');
      lines.push(m.description || '(no description yet)');
      var blob = lines.join('\n');
      try {
        navigator.clipboard.writeText(blob).then(function () {
          toast('KDP form data copied to clipboard. Paste into the KDP browser tab.');
        });
      } catch (e) { toast('Could not copy.', true); }
    });
  }

  /* ---------- Workspace hub ----------
     VN-style project workspace, reachable from the Import screen's
     "Workspace" card and from the workflow banner. Tiles route to
     existing Load tools so users get a single discoverable map of
     every feature with one-line directions. Tools that need a
     project open redirect to the Library when nothing is selected. */
  /* ---------- VN-style media picker (Recents / Stocks / Subtitle) ----
     Opens before the iPad file picker so users can pick from media
     they've already imported (Recents tab), pull a free stock asset
     by URL (Stocks tab), or navigate to the subtitle / TTS surface
     (Subtitle tab). The "From device" tile in Recents falls through
     to the regular file picker. */
  var _mpState = { tab: 'recents', sub: 'all', filter: 'all', selected: null, openVideoAfter: false };
  function openMediaPicker(opts) {
    opts = opts || {};
    _mpState.filter = opts.filter || 'all';
    _mpState.openVideoAfter = !!opts.openVideoAfter;
    _mpState.selected = null;
    _mpState.tab = 'recents';
    _mpState.sub = _mpState.filter === 'video' ? 'video' : 'all';
    var modal = $('media-picker-modal');
    if (!modal) return;
    modal.classList.add('on');
    wireMediaPicker();
    renderMediaPickerBody();
    updateMpSelectedCount();
  }
  function closeMediaPicker() {
    var modal = $('media-picker-modal');
    if (modal) modal.classList.remove('on');
  }
  function wireMediaPicker() {
    var modal = $('media-picker-modal');
    if (!modal || modal.dataset.wired === '1') return;
    modal.dataset.wired = '1';
    var close = $('mp-close');
    if (close) close.addEventListener('click', closeMediaPicker);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeMediaPicker();
    });
    Array.prototype.forEach.call(modal.querySelectorAll('.mp-tab'), function (b) {
      b.addEventListener('click', function () {
        _mpState.tab = b.getAttribute('data-mp-tab');
        Array.prototype.forEach.call(modal.querySelectorAll('.mp-tab'), function (x) {
          x.classList.toggle('on', x === b);
        });
        var subs = $('mp-subtabs');
        if (subs) subs.style.display = (_mpState.tab === 'recents') ? 'flex' : 'none';
        renderMediaPickerBody();
      });
    });
    Array.prototype.forEach.call(modal.querySelectorAll('.mp-sub'), function (b) {
      b.addEventListener('click', function () {
        _mpState.sub = b.getAttribute('data-mp-sub');
        Array.prototype.forEach.call(modal.querySelectorAll('.mp-sub'), function (x) {
          x.classList.toggle('on', x === b);
        });
        renderMediaPickerBody();
      });
    });
    var confirm = $('mp-confirm');
    if (confirm) confirm.addEventListener('click', mpConfirm);
  }
  function updateMpSelectedCount() {
    var el = $('mp-selected-count');
    if (el) el.textContent = (_mpState.selected ? '1' : '0') + ' selected';
    var btn = $('mp-confirm');
    if (btn) btn.disabled = !_mpState.selected;
  }
  function renderMediaPickerBody() {
    var body = $('mp-body');
    if (!body) return;
    if (_mpState.tab === 'recents') return renderMpRecents(body);
    if (_mpState.tab === 'stocks')  return renderMpStocks(body);
    if (_mpState.tab === 'subtitle') return renderMpSubtitle(body);
  }
  function renderMpRecents(body) {
    // List Load library media items matching the current sub-filter.
    var items = (typeof apps !== 'undefined' ? apps : []).filter(function (a) {
      if (a.kind !== 'media') return false;
      if (_mpState.sub === 'all') return true;
      if (_mpState.sub === 'video') return a.subKind === 'video';
      if (_mpState.sub === 'image') return a.subKind === 'image';
      if (_mpState.sub === 'audio') return a.subKind === 'audio';
      return true;
    }).sort(function (x, y) { return (y.dateAdded || 0) - (x.dateAdded || 0); });

    var deviceTile =
      '<button class="mp-source-card" data-mp-action="device">' +
        '<strong>📂 From iPad Files</strong>' +
        '<span>Pick a fresh file from Photos / Files / iCloud</span>' +
      '</button>';

    if (!items.length) {
      body.innerHTML =
        '<div class="mp-source-row">' + deviceTile + '</div>' +
        '<p class="mp-empty">No media in your Library yet. Import a file to populate Recents.</p>';
    } else {
      var grid = items.map(function (a) {
        var on = (_mpState.selected && _mpState.selected.id === a.id) ? ' on' : '';
        var thumb = '';
        if (a.subKind === 'image' && a.binary) {
          // Inline image preview by creating an object URL on demand
          var u;
          try { u = URL.createObjectURL(a.binary); } catch (e) { u = ''; }
          if (u) thumb = '<img src="' + u + '" alt="">';
        } else if (a.subKind === 'video') {
          thumb = '<div style="background:#14142a;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px;color:#666">🎬</div>';
        } else if (a.subKind === 'audio') {
          thumb = '<div style="background:#14142a;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px;color:#666">🎵</div>';
        }
        return '<button class="mp-tile' + on + '" data-mp-id="' + esc(a.id) + '">' +
          thumb +
          '<span class="mp-duration">' + esc(a.subKind || 'media') + '</span>' +
          '<span class="mp-pick"></span>' +
        '</button>';
      }).join('');
      body.innerHTML =
        '<div class="mp-source-row">' + deviceTile + '</div>' +
        '<div class="mp-grid">' + grid + '</div>';
    }
    Array.prototype.forEach.call(body.querySelectorAll('.mp-tile'), function (t) {
      t.addEventListener('click', function () {
        var id = t.getAttribute('data-mp-id');
        var hit = (apps || []).filter(function (x) { return x.id === id; })[0];
        _mpState.selected = hit;
        Array.prototype.forEach.call(body.querySelectorAll('.mp-tile'), function (x) {
          x.classList.toggle('on', x === t);
        });
        updateMpSelectedCount();
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll('[data-mp-action="device"]'), function (b) {
      b.addEventListener('click', function () {
        closeMediaPicker();
        $('file-picker').click();
      });
    });
  }
  function renderMpStocks(body) {
    body.innerHTML =
      '<div class="mp-stocks-form">' +
        '<p class="hint">Paste a direct URL to a video / image / audio file from a free stock site (Pexels, Pixabay, etc.) and we will fetch + import it into your Library.</p>' +
        '<input id="mp-stocks-url" type="url" placeholder="https://example.com/video.mp4">' +
        '<button id="mp-stocks-fetch" class="mp-source-card" style="text-align:center;cursor:pointer;"><strong>↓ Fetch &amp; import</strong></button>' +
        '<p class="hint">Tip: Pexels (https://pexels.com), Pixabay (https://pixabay.com) and Unsplash all offer free-to-use media. Right-tap a file there and pick "Copy link" to get the URL.</p>' +
      '</div>';
    var fetchBtn = body.querySelector('#mp-stocks-fetch');
    if (fetchBtn) fetchBtn.addEventListener('click', async function () {
      var url = (body.querySelector('#mp-stocks-url') || {}).value;
      if (!url) { toast('Paste a URL first.', true); return; }
      try {
        showProgress('Fetching ' + url + '…');
        var res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var blob = await res.blob();
        var name = url.split('/').pop().split('?')[0] || 'stock-asset';
        var pseudoFile = new File([blob], name, { type: blob.type });
        var app = await handleMedia(pseudoFile, name.replace(/\.[^.]+$/, ''));
        await putApp(app); apps.push(app);
        hideProgress();
        closeMediaPicker();
        toast('Stock asset imported.', false);
        renderLibrary && renderLibrary();
      } catch (e) {
        hideProgress();
        toast('Fetch failed: ' + ((e && e.message) || e) + '. Some sites block cross-origin fetches — download the file and use From iPad Files instead.', true);
      }
    });
  }
  function renderMpSubtitle(body) {
    body.innerHTML =
      '<div class="mp-stocks-form">' +
        '<p class="hint">Subtitle / caption editor lives inside the video editor. Open a video, then tap the <strong>T+</strong> "Tap to add subtitle" row in the timeline.</p>' +
        '<button id="mp-sub-go" class="mp-source-card" style="text-align:center;cursor:pointer;"><strong>→ Open Library to pick a video</strong></button>' +
      '</div>';
    var go = body.querySelector('#mp-sub-go');
    if (go) go.addEventListener('click', function () {
      closeMediaPicker();
      currentTypeFilter = 'media';
      show('library-screen');
      renderLibrary && renderLibrary();
    });
  }
  function mpConfirm() {
    var sel = _mpState.selected;
    if (!sel) return;
    closeMediaPicker();
    if (_mpState.openVideoAfter && sel.kind === 'media' && sel.subKind === 'video') {
      openVideoEditor(sel);
    } else if (typeof openApp === 'function') {
      openApp(sel);
    }
  }

  function openWorkspaceHub() {
    var hub = $('workspace-hub');
    if (!hub) return;
    hub.classList.add('on');
  }
  function closeWorkspaceHub() {
    var hub = $('workspace-hub');
    if (hub) hub.classList.remove('on');
  }
  function currentlyOpenApp() {
    // Whatever app the viewer last opened. Workspace tools that need
    // a project (Asset Doctor, Code Editor, Export, etc.) operate on
    // this. If nothing is open we steer the user back to the library.
    try { return (typeof currentApp !== 'undefined' && currentApp) ? currentApp : null; }
    catch (e) { return null; }
  }
  function workspaceRequireApp(label) {
    var a = currentlyOpenApp();
    if (a) return a;
    closeWorkspaceHub();
    toast('Open a project first, then re-open ' + label + '.');
    show('library-screen');
    if (typeof renderLibrary === 'function') renderLibrary();
    return null;
  }
  function handleWorkspaceAction(action) {
    switch (action) {
      case 'library':
        closeWorkspaceHub();
        if (typeof currentTypeFilter !== 'undefined') currentTypeFilter = 'all';
        show('library-screen');
        if (typeof renderLibrary === 'function') renderLibrary();
        return;
      case 'import':
        closeWorkspaceHub();
        show('import-screen');
        return;
      case 'recent': {
        closeWorkspaceHub();
        var pool = (typeof apps !== 'undefined' && apps) ? apps : [];
        var sorted = pool.slice().sort(function (x, y) {
          return (y.lastOpened || y.dateAdded || 0) - (x.lastOpened || x.dateAdded || 0);
        });
        if (sorted.length && typeof openApp === 'function') openApp(sorted[0]);
        else { show('library-screen'); if (typeof renderLibrary === 'function') renderLibrary(); }
        return;
      }
      case 'filetree': {
        var a = workspaceRequireApp('File Tree');
        if (!a) return;
        closeWorkspaceHub();
        if (typeof openFileTreeView === 'function') openFileTreeView(a);
        else if (typeof openDevConsole === 'function') openDevConsole();
        return;
      }
      case 'preview': {
        var ap = workspaceRequireApp('Live Preview');
        if (!ap) return;
        closeWorkspaceHub();
        if (typeof openApp === 'function') openApp(ap);
        return;
      }
      case 'doctor':
        closeWorkspaceHub();
        if (typeof openDevConsole === 'function') openDevConsole();
        if (typeof runScanCurrentApp === 'function') {
          try { runScanCurrentApp(); } catch (e) {}
        }
        return;
      case 'manifest':
      case 'sw':
        closeWorkspaceHub();
        if (typeof openDevConsole === 'function') openDevConsole();
        toast(action === 'manifest'
          ? 'Manifest checks live in the Scan tab.'
          : 'Service-worker checks live in the Scan tab.');
        return;
      case 'copilot':
        closeWorkspaceHub();
        if (typeof openHelperPanel === 'function') openHelperPanel();
        return;
      case 'codeedit': {
        var ce = workspaceRequireApp('Code Editor');
        if (!ce) return;
        closeWorkspaceHub();
        if (typeof openEditor === 'function') openEditor(ce);
        return;
      }
      case 'prose': {
        var pe = workspaceRequireApp('Prose Editor');
        if (!pe) return;
        closeWorkspaceHub();
        if (typeof openProseEditor === 'function') openProseEditor(pe);
        else toast('Prose editor opens from a manuscript viewer.');
        return;
      }
      case 'cover': {
        var co = workspaceRequireApp('Cover Designer');
        if (!co) return;
        closeWorkspaceHub();
        if (typeof openCoverDesigner === 'function') openCoverDesigner(co);
        else toast('Cover designer opens from a book viewer.');
        return;
      }
      case 'video': {
        var v = workspaceRequireApp('Video Editor');
        if (!v) return;
        closeWorkspaceHub();
        if (typeof openVideoEditor === 'function') openVideoEditor(v);
        return;
      }
      case 'export-html': {
        var eh = workspaceRequireApp('Standalone HTML export');
        if (!eh) return;
        closeWorkspaceHub();
        if (typeof exportAsStandaloneHtml === 'function') exportAsStandaloneHtml(eh);
        else toast('Open the project, then tap Share → Standalone HTML.');
        return;
      }
      case 'export-zip': {
        var ez = workspaceRequireApp('PWA / ZIP export');
        if (!ez) return;
        closeWorkspaceHub();
        if (typeof exportAsZip === 'function') exportAsZip(ez);
        else toast('Open the project, then tap Share → PWA ZIP.');
        return;
      }
      case 'export-epub': {
        var ee = workspaceRequireApp('EPUB export');
        if (!ee) return;
        closeWorkspaceHub();
        if (typeof exportAsEpub === 'function') exportAsEpub(ee);
        else toast('Open a manuscript, then tap Share → EPUB.');
        return;
      }
      case 'export-pdf': {
        var ep = workspaceRequireApp('PDF export');
        if (!ep) return;
        closeWorkspaceHub();
        if (typeof exportAsPdf === 'function') exportAsPdf(ep);
        else toast('Open a manuscript, then tap Share → PDF.');
        return;
      }
      case 'package': {
        var pk = workspaceRequireApp('App Package');
        if (!pk) return;
        closeWorkspaceHub();
        if (typeof openPackageWalkthrough === 'function') openPackageWalkthrough(pk);
        else toast('Open the project, then tap the Package button.');
        return;
      }
    }
  }
  function wireWorkspaceHub() {
    var hub = $('workspace-hub');
    if (!hub) return;
    var closeBtn = $('ws-close');
    if (closeBtn) closeBtn.addEventListener('click', closeWorkspaceHub);
    hub.addEventListener('click', function (e) {
      if (e.target === hub) closeWorkspaceHub();
    });
    hub.querySelectorAll('[data-ws-action]').forEach(function (b) {
      b.addEventListener('click', function () {
        handleWorkspaceAction(b.getAttribute('data-ws-action'));
      });
    });
    // Workflow banner steps on the Import screen — each chip jumps to
    // the matching Workspace section so users see the same map.
    document.querySelectorAll('.wf-step').forEach(function (s) {
      s.addEventListener('click', function () {
        var step = s.getAttribute('data-wf');
        if (step === 'import') { show('import-screen'); return; }
        if (step === 'preview') { handleWorkspaceAction('preview'); return; }
        if (step === 'diagnose') { handleWorkspaceAction('doctor'); return; }
        if (step === 'fix') { openWorkspaceHub(); return; }
        if (step === 'export') { openWorkspaceHub(); return; }
      });
    });
  }
  // Expose so other code paths (banner clicks, future deep links) can
  // open the hub without going through the import card.
  window.openWorkspaceHub = openWorkspaceHub;

  /* ---------- File Tree view ----------
     Lightweight project file tree, opened from the Workspace hub. For
     each file in app.bundleIndex we show the path, an estimated size,
     and status badges. We compute four badges client-side:
       Large    — sample/file content > 200 KB
       Cached   — path appears in the bundle's service-worker cache list
       Missing  — referenced in HTML/CSS but absent from bundleIndex
       Unused   — present in bundleIndex but never referenced
     Missing/Unused are heuristics; Asset Doctor stays the source of
     truth, this is the at-a-glance view. */
  function fileSizeFromSample(app, path) {
    if (!app.bundleSamples) return null;
    var s = app.bundleSamples[path];
    if (typeof s === 'string') return s.length;
    return null;
  }
  function fmtBytes(n) {
    if (n == null) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }
  function ftBadge(text, color) {
    return '<span class="ft-badge" style="background:' + color + '">' + text + '</span>';
  }
  function buildFileTreeMarkup(app) {
    var idx = (app.bundleIndex || []).slice();
    if (!idx.length) {
      return '<p class="ft-empty">No bundle file list for this project. ' +
        'Single-HTML imports do not have a tree — open the Code Editor ' +
        'to view the source instead.</p>';
    }
    var html = String(app.html || '');
    var refs = {};
    var refRegex = /(?:src|href)=["']([^"'#?]+)["']|url\(["']?([^)"']+)["']?\)/gi;
    var m;
    while ((m = refRegex.exec(html))) {
      var u = (m[1] || m[2] || '').trim();
      if (u && !/^(?:https?:|data:|blob:|#)/.test(u)) {
        refs[u.replace(/^\.?\//, '')] = true;
      }
    }
    var swCache = {};
    if (app.bundleSamples) {
      var swFiles = ['sw.js', 'service-worker.js', 'serviceworker.js'];
      for (var si = 0; si < swFiles.length; si++) {
        var sw = app.bundleSamples[swFiles[si]];
        if (typeof sw === 'string') {
          var cm;
          var cmRe = /["']([^"']+\.[a-z0-9]{2,5})["']/gi;
          while ((cm = cmRe.exec(sw))) {
            swCache[cm[1].replace(/^\.?\//, '')] = true;
          }
        }
      }
    }
    var byPath = {};
    idx.forEach(function (p) { byPath[p.replace(/^\.?\//, '')] = true; });

    var rows = idx.slice().sort().map(function (p) {
      var key = p.replace(/^\.?\//, '');
      var sz = fileSizeFromSample(app, p);
      var bs = '';
      if (sz != null && sz > 200 * 1024) bs += ftBadge('Large', '#a64a3a');
      if (swCache[key]) bs += ftBadge('Cached', '#2e7a60');
      if (refs[key] === undefined && !/index\.html?$|manifest\.json$|sw\.js$|service-worker\.js$|icon\.png$|apple-touch-icon/i.test(p)) {
        bs += ftBadge('Unused', '#5a5a7a');
      }
      var icon = '📄';
      if (/\.html?$/i.test(p)) icon = '📄';
      else if (/\.css$/i.test(p)) icon = '🎨';
      else if (/\.js$/i.test(p)) icon = '⚙️';
      else if (/\.json$/i.test(p)) icon = '📑';
      else if (/\.(png|jpe?g|gif|webp|svg)$/i.test(p)) icon = '🖼️';
      else if (/\.(mp4|mov|webm|m4v)$/i.test(p)) icon = '🎬';
      else if (/\.(mp3|m4a|wav|ogg|aac)$/i.test(p)) icon = '🎵';
      else if (/\.(woff2?|ttf|otf)$/i.test(p)) icon = '🔤';
      else if (/\.pdf$/i.test(p)) icon = '📃';
      else if (/\.epub$/i.test(p)) icon = '📖';
      return '<div class="ft-row">' +
        '<span class="ft-icon">' + icon + '</span>' +
        '<span class="ft-path">' + escHtml(p) + '</span>' +
        '<span class="ft-size">' + (sz != null ? fmtBytes(sz) : '') + '</span>' +
        '<span class="ft-badges">' + bs + '</span>' +
        '</div>';
    }).join('');

    var missing = [];
    Object.keys(refs).forEach(function (r) {
      var rk = r.replace(/^\.?\//, '');
      if (!byPath[rk] && !/^https?:|^data:|^blob:|^#/.test(rk)) missing.push(rk);
    });
    var missingHtml = '';
    if (missing.length) {
      missingHtml = '<div class="ft-missing"><strong>' + ftBadge('Missing', '#c14a4a') + ' ' +
        missing.length + ' referenced file' + (missing.length === 1 ? '' : 's') +
        ' not in the bundle</strong><ul>' +
        missing.slice(0, 12).map(function (mp) { return '<li>' + escHtml(mp) + '</li>'; }).join('') +
        (missing.length > 12 ? '<li>… and ' + (missing.length - 12) + ' more</li>' : '') +
        '</ul><p class="ft-fix-hint">Open <strong>Asset Doctor</strong> from the Workspace to repair them.</p></div>';
    }

    return missingHtml +
      '<div class="ft-summary">' + idx.length + ' file' + (idx.length === 1 ? '' : 's') + ' in this project</div>' +
      '<div class="ft-list">' + rows + '</div>';
  }
  function openFileTreeView(app) {
    var hub = $('workspace-hub');
    if (hub) hub.classList.remove('on');
    var wrap = $('filetree-modal');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'filetree-modal';
      wrap.className = 'modal filetree-modal';
      wrap.innerHTML =
        '<div class="modal-box filetree-box">' +
        '<button class="ft-close" aria-label="Close">&times;</button>' +
        '<h3>📁 File Tree</h3>' +
        '<p class="ft-intro">Every file in <strong id="ft-app-name"></strong>. ' +
        'Tap <strong>Asset Doctor</strong> from Workspace to fix anything flagged Missing.</p>' +
        '<div id="ft-body"></div>' +
        '</div>';
      document.body.appendChild(wrap);
      wrap.querySelector('.ft-close').addEventListener('click', function () {
        wrap.classList.remove('on');
      });
      wrap.addEventListener('click', function (e) {
        if (e.target === wrap) wrap.classList.remove('on');
      });
    }
    var nameEl = wrap.querySelector('#ft-app-name');
    if (nameEl) nameEl.textContent = app.name || 'this project';
    var body = wrap.querySelector('#ft-body');
    if (body) body.innerHTML = buildFileTreeMarkup(app);
    wrap.classList.add('on');
  }
  window.openFileTreeView = openFileTreeView;

  /* ---------- Video editor (in-Load) ----------
     Browser-native video editing: import a video via the Edit-Video
     import card or open any video already in the library, trim it
     with an in/out slider, add ONE text overlay, layer in optional
     background music, and export to MP4.

     The export pipeline is 100% web -- no ffmpeg.wasm. We composite
     the playing <video> + an overlay <canvas> (text drawn each
     frame), captureStream() the canvas at 30 fps, mix in the
     background-music AudioBufferSourceNode through an
     AudioContext destination, and feed both streams into a
     MediaRecorder that emits an MP4 (H.264 + AAC) on iPad Safari.

     Tradeoff: MediaRecorder encodes in real time, so a 60s clip
     takes 60s to render. Acceptable for short kid-book trailers /
     promo clips / TikTok-length pieces. WebCodecs (faster than
     real time) is a future optimization. */
  function openVideoEditor(app) {
    if (!app || app.kind !== 'media' || app.subKind !== 'video' || !app.binary) {
      toast('Open a video file first.', true); return;
    }
    var existing = document.getElementById('__loadVideoEdit');
    if (existing) existing.remove();
    var blobUrl = URL.createObjectURL(app.binary);

    var wrap = document.createElement('div');
    wrap.id = '__loadVideoEdit';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2050;display:flex;flex-direction:column;background:#0a0a14;color:#f0f0f0;font-family:-apple-system,sans-serif;overflow:hidden;';
    // VN-style layout: dark topbar / black preview / track rows / bottom action toolbar
    wrap.innerHTML =
      // ===== Topbar =====
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#0a0a14;flex-shrink:0;">' +
        '<button id="ve-close" class="ve-iconbtn" aria-label="Close">&larr;</button>' +
        '<button id="ve-help" class="ve-iconbtn" aria-label="Help">?</button>' +
        '<button id="ve-refresh" class="ve-iconbtn" aria-label="Force refresh editor build" title="Force refresh">&#8635;</button>' +
        '<span id="ve-version" style="font-size:10px;color:#7a7a8a;font-weight:600;letter-spacing:0.04em;padding:0 4px;font-variant-numeric:tabular-nums;">v17bn</span>' +
        '<div style="margin:0 auto;display:flex;align-items:center;gap:6px;background:#1a1a26;padding:6px 12px;border-radius:8px;">' +
          '<span style="font-size:13px;color:#cfcfdc;">&#9633;</span>' +
          '<select id="ve-ratio" style="background:transparent;color:#fff;border:none;font-size:14px;font-weight:600;outline:none;">' +
            '<option value="original" selected>Original</option>' +
            '<option value="16:9">16:9</option>' +
            '<option value="9:16">9:16</option>' +
            '<option value="1:1">1:1</option>' +
            '<option value="4:5">4:5</option>' +
          '</select>' +
        '</div>' +
        '<button id="ve-more" class="ve-iconbtn" aria-label="More">&#8943;</button>' +
        '<button id="ve-save" class="ve-iconbtn" aria-label="Save draft">&#128190;</button>' +
        '<button id="ve-export" title="Export — encode + save the edit" aria-label="Export" style="background:#1d6fff;border:none;color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">&#11014;&#65039; <span style="font-size:12px;">Export</span></button>' +
      '</div>' +
      // ===== Preview stage (black) =====
      '<div id="ve-stage" style="flex:1;min-height:0;position:relative;background:#000;display:flex;align-items:center;justify-content:center;">' +
        '<video id="ve-video" src="' + blobUrl + '" playsinline preload="auto" controls style="max-width:100%;max-height:100%;background:#000;"></video>' +
        '<canvas id="ve-overlay" style="position:absolute;pointer-events:none;"></canvas>' +
        '<button id="ve-fullscreen" class="ve-iconbtn" style="position:absolute;right:10px;bottom:10px;background:rgba(255,255,255,0.1);" aria-label="Fullscreen">&#10070;</button>' +
      '</div>' +
      // ===== Transport row =====
      '<div style="display:flex;align-items:center;gap:14px;padding:8px 14px;background:#0a0a14;border-top:1px solid #1a1a26;flex-shrink:0;">' +
        '<span id="ve-time" style="font-size:13px;color:#cfcfdc;font-variant-numeric:tabular-nums;min-width:120px;">0:00 / 0:00</span>' +
        '<div style="margin:0 auto;display:flex;align-items:center;gap:18px;">' +
          '<button id="ve-prev" class="ve-iconbtn" aria-label="Previous frame">&#9198;</button>' +
          '<button id="ve-play" class="ve-iconbtn" style="font-size:22px;" aria-label="Play">&#9654;</button>' +
          '<button id="ve-next" class="ve-iconbtn" aria-label="Next frame">&#9197;</button>' +
        '</div>' +
        '<button id="ve-stack" class="ve-iconbtn" aria-label="Layers">&#9783;</button>' +
        '<button id="ve-snap" class="ve-iconbtn" aria-label="Snap to grid" title="Snap (off)">&#9899;</button>' +
        '<button id="ve-link" class="ve-iconbtn" aria-label="Link / unlink timeline elements" title="Link timeline elements (off)">&#128279;</button>' +
        '<button id="ve-undo" class="ve-iconbtn" aria-label="Undo">&#8634;</button>' +
        '<button id="ve-redo" class="ve-iconbtn" aria-label="Redo">&#8635;</button>' +
        '<button id="ve-pause" class="ve-iconbtn" aria-label="Pause" style="display:none;">&#9208;</button>' +
      '</div>' +
      // ===== Track rows =====
      // ===== TIMELINE ENGINE (clean clip-object structure) =====
      // Two-column layout: left column has track labels + Cover
      // button; right column is the scrollable timeline holding
      // empty layer rows, the .video-track with .timeline-clip
      // objects, the waveform, the ruler, and the playhead spanning
      // all rows. Markup mirrors the user's locked-in spec.
      '<div class="timeline-engine" id="timelineEngine">' +
        '<div class="track-labels">' +
          '<button class="track-add" data-add="music" aria-label="Add music">&#127925;+</button>' +
          '<button class="track-add" data-add="text" aria-label="Add subtitle">T+</button>' +
          '<button class="track-add" data-add="sticker" aria-label="Add sticker / PiP">&#128444;+</button>' +
          '<button class="cover-btn" id="ve-cover">Cover</button>' +
          '<button class="track-add" data-add="audio-orig" aria-label="Original audio">&#128264;</button>' +
        '</div>' +
        '<div class="timeline-scroll" id="timelineScroll">' +
          // Empty tracks for music / subtitle / sticker
          '<div class="track ve-track-row" data-track="music"><span class="ve-track-empty" data-add="music">Tap to add music</span></div>' +
          '<div class="track ve-track-row" data-track="text"><span class="ve-track-empty" data-add="text">Tap to add subtitle</span></div>' +
          '<div class="track ve-track-row" data-track="sticker"><span class="ve-track-empty" data-add="sticker">Tap to add sticker / PiP</span></div>' +
          // Main video track — clip objects + empty slots + big-add
          // are appended dynamically by renderClipBlocks().
          '<div class="video-track" id="ve-clip-strip"></div>' +
          // Waveform track — drawn into a canvas by renderWaveformFor()
          '<div class="waveform-track ve-waveform empty" id="ve-waveform"></div>' +
          // Time ruler — second markers + tick marks
          '<div class="time-ruler ve-time-ruler" id="ve-time-ruler"></div>' +
          // Playhead spans every track + waveform + ruler in this column
          '<div class="playhead ve-clip-playhead" id="ve-clip-playhead"></div>' +
          // Hidden legacy elements kept ONLY for engine wiring continuity
          '<div id="ve-clip-thumbs" style="display:none;"></div>' +
          '<div id="ve-clip-trim" style="display:none;">' +
            '<div class="ve-clip-handle ve-handle-left" id="ve-handle-left"></div>' +
            '<div class="ve-clip-handle ve-handle-right" id="ve-handle-right"></div>' +
            '<div class="ve-clip-duration" id="ve-clip-duration">0.00s</div>' +
          '</div>' +
          '<div class="ve-clip-quick" id="ve-clip-quick" hidden>' +
            '<button class="ve-quick-btn" data-clip-action="split" aria-label="Split">&#9986;</button>' +
            '<button class="ve-quick-btn" data-clip-action="duplicate" aria-label="Duplicate">&#10063;</button>' +
            '<button class="ve-quick-btn" data-clip-action="replace" aria-label="Replace">&#8634;</button>' +
            '<button class="ve-quick-btn" data-clip-action="delete" aria-label="Delete">&#128465;</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      // ===== Hidden trim sliders (used by handles via JS) =====
      '<input type="hidden" id="ve-trim-in" value="0">' +
      '<input type="hidden" id="ve-trim-out" value="0">' +
      // ===== Hidden text-overlay panel (slides up when 'subtitle' add tapped) =====
      '<div id="ve-text-panel" class="ve-panel" hidden>' +
        '<div class="ve-panel-head"><span>Subtitle / overlay</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
        '<input id="ve-text" placeholder="Caption / title" style="width:100%;padding:10px;background:#1a1a26;color:#fff;border:1px solid #2a2a40;border-radius:8px;font-size:14px;">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-top:10px;">' +
          '<label class="ve-lbl">Position<select id="ve-text-pos" class="ve-input"><option value="top">Top</option><option value="middle">Middle</option><option value="bottom" selected>Bottom</option></select></label>' +
          '<label class="ve-lbl">Size<input id="ve-text-size" type="number" value="48" min="12" max="200" class="ve-input"></label>' +
          '<label class="ve-lbl">Color<input id="ve-text-color" type="color" value="#ffffff" class="ve-color"></label>' +
          '<label class="ve-lbl">BG<select id="ve-text-bg" class="ve-input"><option value="none">None</option><option value="black" selected>Black bar</option><option value="white">White bar</option></select></label>' +
        '</div>' +
      '</div>' +
      // ===== Hidden music panel =====
      '<div id="ve-music-panel" class="ve-panel" hidden>' +
        '<div class="ve-panel-head"><span>Music</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
        '<input id="ve-audio-pick" type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg" style="font-size:13px;">' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;">' +
          '<label class="ve-lbl">Volume</label>' +
          '<input id="ve-audio-vol" type="range" min="0" max="1" step="0.05" value="0.35" style="flex:1;min-width:140px;accent-color:#fbbf24;">' +
          '<span id="ve-audio-vol-val" style="font-size:13px;color:#cfcfdc;font-weight:700;">35%</span>' +
        '</div>' +
        '<label class="ve-lbl" style="margin-top:8px;display:flex;align-items:center;gap:6px;"><input id="ve-mute-orig" type="checkbox"> Mute original audio</label>' +
      '</div>' +
      // ===== Speed panel — slides up when Speed action tapped =====
      '<div id="ve-speed-panel" class="ve-panel" hidden>' +
        '<div class="ve-panel-head"><span>Speed</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
          '<label class="ve-lbl">Playback rate</label>' +
          '<input id="ve-speed-range" type="range" min="0.25" max="4" step="0.25" value="1" style="flex:1;min-width:160px;accent-color:#fbbf24;">' +
          '<span id="ve-speed-val" style="font-size:14px;color:#fbbf24;font-weight:800;min-width:48px;text-align:right;">1.0x</span>' +
        '</div>' +
        '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">' +
          '<button class="ve-speed-preset" data-speed="0.25">0.25x</button>' +
          '<button class="ve-speed-preset" data-speed="0.5">0.5x</button>' +
          '<button class="ve-speed-preset" data-speed="1">1x</button>' +
          '<button class="ve-speed-preset" data-speed="1.5">1.5x</button>' +
          '<button class="ve-speed-preset" data-speed="2">2x</button>' +
          '<button class="ve-speed-preset" data-speed="4">4x</button>' +
        '</div>' +
      '</div>' +
      // ===== Opacity panel — slides up when Opacity action tapped =====
      '<div id="ve-opacity-panel" class="ve-panel" hidden>' +
        '<div class="ve-panel-head"><span>Opacity</span><button class="ve-iconbtn" data-close-panel>&times;</button></div>' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
          '<label class="ve-lbl">Transparency</label>' +
          '<input id="ve-opacity-range" type="range" min="0" max="100" step="5" value="100" style="flex:1;min-width:160px;accent-color:#fbbf24;">' +
          '<span id="ve-opacity-val" style="font-size:14px;color:#fbbf24;font-weight:800;min-width:48px;text-align:right;">100%</span>' +
        '</div>' +
      '</div>' +
      // Hidden replace-media file picker (triggered from clip context menu)
      '<input id="ve-replace-pick" type="file" accept="video/*,.mp4,.mov,.m4v,.webm,.mkv" style="display:none;">' +
      // ===== Bottom action toolbar — full VN action set the user
      // pasted across three reference screenshots. Section separators
      // (|) split it into three groups: clip-level (Filter→Cutout),
      // playback / framing (Speed→Fit), then visual / audio polish
      // (BG → TTS). Scrolls horizontally on iPad portrait.
      '<div id="ve-actions" style="display:flex;align-items:center;background:#0a0a14;padding:10px 8px max(10px,env(safe-area-inset-bottom));border-top:1px solid #1a1a26;flex-shrink:0;overflow-x:auto;gap:14px;">' +
        '<button class="ve-action" data-action="filter"><span class="ve-act-icon">&#9678;</span><span class="ve-act-lbl">Filter</span></button>' +
        '<button class="ve-action" data-action="trim"><span class="ve-act-icon">&lt;/&gt;</span><span class="ve-act-lbl">Trim</span></button>' +
        '<button class="ve-action" data-action="fx"><span class="ve-act-icon">&#9733;</span><span class="ve-act-lbl">FX</span></button>' +
        '<button class="ve-action" data-action="split"><span class="ve-act-icon">&#9986;</span><span class="ve-act-lbl">Split</span></button>' +
        '<button class="ve-action" data-action="cutout"><span class="ve-act-icon">&#129489;</span><span class="ve-act-lbl">Cutout</span></button>' +
        '<span class="ve-action-sep" aria-hidden="true"></span>' +
        '<button class="ve-action" data-action="speed"><span class="ve-act-icon">&#9201;</span><span class="ve-act-lbl">Speed</span></button>' +
        '<button class="ve-action" data-action="volume"><span class="ve-act-icon">&#128266;</span><span class="ve-act-lbl">Volume</span></button>' +
        '<button class="ve-action" data-action="fade"><span class="ve-act-icon">&#9696;</span><span class="ve-act-lbl">Fade</span></button>' +
        '<button class="ve-action" data-action="crop"><span class="ve-act-icon">&#9974;</span><span class="ve-act-lbl">Crop</span></button>' +
        '<button class="ve-action" data-action="rotate"><span class="ve-act-icon">&#10227;</span><span class="ve-act-lbl">Rotate</span></button>' +
        '<button class="ve-action" data-action="mirror"><span class="ve-act-icon">&#9647;&#9646;</span><span class="ve-act-lbl">Mirror</span></button>' +
        '<button class="ve-action" data-action="flip"><span class="ve-act-icon">&#8693;</span><span class="ve-act-lbl">Flip</span></button>' +
        '<button class="ve-action" data-action="fit"><span class="ve-act-icon">&#9783;</span><span class="ve-act-lbl">Fit</span></button>' +
        '<span class="ve-action-sep" aria-hidden="true"></span>' +
        '<button class="ve-action" data-action="bg"><span class="ve-act-icon">&#9646;</span><span class="ve-act-lbl">BG</span></button>' +
        '<button class="ve-action" data-action="border"><span class="ve-act-icon">&#9633;</span><span class="ve-act-lbl">Border</span></button>' +
        '<button class="ve-action" data-action="blur"><span class="ve-act-icon">&#10070;</span><span class="ve-act-lbl">Blur</span></button>' +
        '<button class="ve-action" data-action="opacity"><span class="ve-act-icon">&#9680;</span><span class="ve-act-lbl">Opacity</span></button>' +
        '<button class="ve-action" data-action="denoise"><span class="ve-act-icon">&#127891;&#65039;</span><span class="ve-act-lbl">Denoise</span></button>' +
        '<button class="ve-action" data-action="zoom"><span class="ve-act-icon">&#11042;</span><span class="ve-act-lbl">Zoom</span></button>' +
        '<button class="ve-action" data-action="extract-audio"><span class="ve-act-icon">&#127925;&#11014;</span><span class="ve-act-lbl">Extract Audio</span></button>' +
        '<button class="ve-action" data-action="auto-captions"><span class="ve-act-icon">[A]</span><span class="ve-act-lbl">Auto Captions</span></button>' +
        '<button class="ve-action" data-action="tts"><span class="ve-act-icon">A&#127908;</span><span class="ve-act-lbl">TTS</span></button>' +
        '<button class="ve-action" data-action="mosaic"><span class="ve-act-icon">&#9783;</span><span class="ve-act-lbl">Mosaic</span></button>' +
        '<button class="ve-action" data-action="magnifier"><span class="ve-act-icon">&#128270;</span><span class="ve-act-lbl">Magnifier</span></button>' +
        '<button class="ve-action" data-action="story"><span class="ve-act-icon">&#9776;</span><span class="ve-act-lbl">Story</span></button>' +
        '<button class="ve-action" data-action="reverse"><span class="ve-act-icon">&#8634;</span><span class="ve-act-lbl">Reverse</span></button>' +
        '<button class="ve-action" data-action="freeze"><span class="ve-act-icon">&#10052;</span><span class="ve-act-lbl">Freeze</span></button>' +
        '<button class="ve-action" data-action="preset"><span class="ve-act-icon">&#9733;</span><span class="ve-act-lbl">Preset</span></button>' +
        '<button class="ve-action" data-action="keyframe"><span class="ve-act-icon">&#128273;</span><span class="ve-act-lbl">Keyframe</span></button>' +
        '<button class="ve-action" data-action="pip-track"><span class="ve-act-icon">&#128301;</span><span class="ve-act-lbl">PiP Track</span></button>' +
        '<button class="ve-action" data-action="stock-media"><span class="ve-act-icon">&#127760;</span><span class="ve-act-lbl">Free Media</span></button>' +
      '</div>' +
      // ===== Context action bar — slides in OVER the bottom toolbar
      // when a clip is selected. Hidden by default. Mirrors VN's
      // contextual edit set: Edit / Split / Replace / Speed /
      // Opacity / Duplicate / Delete.
      '<div id="ve-context" class="ve-context" hidden>' +
        '<button class="ve-action" data-clip-action="edit"><span class="ve-act-icon">&#9998;</span><span class="ve-act-lbl">Edit</span></button>' +
        '<button class="ve-action" data-clip-action="split"><span class="ve-act-icon">&#9986;</span><span class="ve-act-lbl">Split</span></button>' +
        '<button class="ve-action" data-clip-action="replace"><span class="ve-act-icon">&#8634;</span><span class="ve-act-lbl">Replace</span></button>' +
        '<button class="ve-action" data-clip-action="speed"><span class="ve-act-icon">&#9201;</span><span class="ve-act-lbl">Speed</span></button>' +
        '<button class="ve-action" data-clip-action="opacity"><span class="ve-act-icon">&#9680;</span><span class="ve-act-lbl">Opacity</span></button>' +
        '<button class="ve-action" data-clip-action="duplicate"><span class="ve-act-icon">&#10063;</span><span class="ve-act-lbl">Duplicate</span></button>' +
        '<button class="ve-action" data-clip-action="delete"><span class="ve-act-icon">&#128465;</span><span class="ve-act-lbl">Delete</span></button>' +
        '<button class="ve-action ve-context-done" data-clip-action="deselect"><span class="ve-act-icon">&#10003;</span><span class="ve-act-lbl">Done</span></button>' +
      '</div>' +
      // ===== Recording progress overlay =====
      '<div id="ve-progress" style="display:none;position:absolute;left:14px;right:14px;bottom:90px;align-items:center;gap:10px;background:rgba(26,26,38,0.95);border-radius:12px;padding:12px 14px;border:1px solid #2a2a40;backdrop-filter:blur(8px);z-index:5;">' +
        '<div style="flex:1;height:8px;background:#1a1a26;border-radius:4px;overflow:hidden;"><div id="ve-progress-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#ff5ea3,#fbbf24,#22c55e,#4ea0ff,#a18cff);transition:width 0.15s;"></div></div>' +
        '<span id="ve-progress-label" style="font-size:13px;color:#cfcfdc;white-space:nowrap;">Exporting…</span>' +
      '</div>';

    // ===== Inline styles for the editor (scoped) =====
    var styleTag = document.createElement('style');
    styleTag.textContent =
      '#__loadVideoEdit .ve-iconbtn{background:transparent;border:none;color:#fff;width:38px;height:38px;border-radius:8px;cursor:pointer;font-size:17px;display:inline-flex;align-items:center;justify-content:center;}' +
      '#__loadVideoEdit .ve-iconbtn:active{background:rgba(255,255,255,0.1);}' +
      '#__loadVideoEdit .ve-track{display:flex;align-items:center;gap:6px;padding:3px 10px;min-height:42px;}' +
      '#__loadVideoEdit .ve-track-add{position:relative;background:#1a1a26;border:none;color:#fff;width:42px;height:36px;border-radius:8px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;}' +
      '#__loadVideoEdit .ve-track-add .plus{position:absolute;right:-2px;bottom:-2px;background:#fff;color:#0a0a14;font-weight:900;font-size:10px;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;}' +
      '#__loadVideoEdit .ve-track-cover{background:#1a1a26;border:1px dashed #3a3a55;color:#cfcfdc;width:62px;height:42px;border-radius:6px;font-size:11px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}' +
      '#__loadVideoEdit .ve-track-body{flex:1;min-width:0;height:42px;background:#0e0e18;border-radius:6px;display:flex;align-items:center;padding:0 10px;color:#7b7b8c;font-size:13px;overflow:hidden;position:relative;}' +
      '#__loadVideoEdit .ve-track-empty{user-select:none;}' +
      // ===== TIMELINE CSS — user-locked spec (verbatim) =====
      '#__loadVideoEdit .timeline-engine{width:100%;height:260px;background:#101018;display:grid;grid-template-columns:92px 1fr;color:white;overflow:hidden;font-family:system-ui,sans-serif;}' +
      '#__loadVideoEdit .track-labels{padding-top:12px;display:flex;flex-direction:column;gap:10px;align-items:center;}' +
      '#__loadVideoEdit .track-add,#__loadVideoEdit .cover-btn{width:64px;height:44px;border:none;border-radius:12px;background:#1e1e2a;color:white;font-size:18px;cursor:pointer;font-family:inherit;}' +
      '#__loadVideoEdit .cover-btn{height:54px;font-size:14px;border:1px dashed #555;}' +
      '#__loadVideoEdit .timeline-scroll{position:relative;overflow-x:auto;overflow-y:hidden;padding:12px 24px 0 0;}' +
      '#__loadVideoEdit .timeline-scroll::-webkit-scrollbar{display:none;}' +
      '#__loadVideoEdit .track{height:38px;margin-bottom:8px;border-radius:8px;background:#191923;color:#8f8f9d;display:flex;align-items:center;padding-left:18px;font-size:15px;cursor:pointer;}' +
      '#__loadVideoEdit .video-track{height:64px;display:flex;align-items:center;gap:0;position:relative;}' +
      '#__loadVideoEdit .timeline-clip{position:relative;height:56px;border-radius:6px;overflow:visible;background:#08080d;display:flex;align-items:center;cursor:pointer;flex:0 0 auto;}' +
      '#__loadVideoEdit .timeline-clip.selected{border:3px solid #ffcc1a;}' +
      '#__loadVideoEdit .thumbnail-strip{width:100%;height:100%;display:flex;overflow:hidden;border-radius:4px;}' +
      '#__loadVideoEdit .thumbnail-frame,#__loadVideoEdit .thumbnail-strip img{height:100%;width:86px;object-fit:cover;border-right:1px solid rgba(255,255,255,0.15);flex:0 0 auto;}' +
      '#__loadVideoEdit .thumbnail-strip img:last-child{border-right:none;}' +
      // Supporting styles (clip duration / handles / add buttons /
      // empty slots / big-add / waveform / ruler / playhead) live
      // here below the spec block — these complete the spec's
      // structural elements but the spec only specified the layout.
      '#__loadVideoEdit .clip-duration{position:absolute;left:6px;bottom:4px;background:rgba(0,0,0,0.7);color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;font-variant-numeric:tabular-nums;pointer-events:none;}' +
      '#__loadVideoEdit .trim-handle{position:absolute;top:0;bottom:0;width:14px;background:#ffcc1a;cursor:ew-resize;display:flex;align-items:center;justify-content:center;color:#101018;font-weight:900;z-index:6;}' +
      '#__loadVideoEdit .trim-handle.trim-left{left:0;border-radius:4px 0 0 4px;}' +
      '#__loadVideoEdit .trim-handle.trim-right{right:0;border-radius:0 4px 4px 0;}' +
      '#__loadVideoEdit .trim-handle::after{content:"||";font-size:10px;letter-spacing:-1px;}' +
      '#__loadVideoEdit .clip-add{position:absolute;top:50%;transform:translateY(-50%);width:22px;height:22px;border-radius:50%;background:#fff;color:#101018;border:2px solid #101018;font-size:14px;font-weight:900;cursor:pointer;line-height:1;padding:0;z-index:7;}' +
      '#__loadVideoEdit .clip-add.left{left:-12px;}' +
      '#__loadVideoEdit .clip-add.right{right:-12px;}' +
      // Always-visible delete × on each timeline frame. Sits at top-right
      // of the clip block so the user can remove a frame in one tap
      // without first selecting + opening the context bar.
      '#__loadVideoEdit .clip-x{position:absolute;top:-9px;right:-9px;width:22px;height:22px;border-radius:50%;background:#ff3b5c;color:#fff;border:2px solid #fff;font-size:14px;font-weight:900;cursor:pointer;line-height:1;padding:0;z-index:8;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.45);}' +
      '#__loadVideoEdit .clip-x:active{transform:scale(0.9);background:#ff5e7a;}' +
      // Empty slot width matches a thumbnail frame's width for consistent
      // spacing alongside the populated clip strip.
      '#__loadVideoEdit .empty-slot{flex:0 0 100px;height:56px;border:1px dashed #2a2a40;border-radius:6px;background:#0c0c14;cursor:pointer;}' +
      // Multi-track parallel timelines — each ve-track-row is a
      // positioned container for music / subtitle / sticker blocks.
      // Blocks are absolutely positioned inside the row at a pixel
      // offset matching their start time (PX_PER_SECOND = 90).
      '#__loadVideoEdit .ve-track-row{position:relative !important;height:38px !important;margin-bottom:8px !important;border-radius:8px !important;background:#191923 !important;color:#8f8f9d !important;display:block !important;padding:0 !important;overflow:visible !important;}' +
      '#__loadVideoEdit .ve-track-empty{position:absolute;top:50%;left:18px;transform:translateY(-50%);font-size:13px;color:#5a5a78;pointer-events:auto;cursor:pointer;}' +
      '#__loadVideoEdit .ve-track-row .ve-track-block{position:absolute;top:3px;bottom:3px;border-radius:6px;display:flex;align-items:center;padding:0 8px;font-size:11px;font-weight:600;cursor:grab;color:#fff;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;touch-action:none;user-select:none;}' +
      '#__loadVideoEdit .ve-track-row .ve-track-block.dragging{cursor:grabbing;opacity:0.85;}' +
      '#__loadVideoEdit .ve-track-row[data-track="music"] .ve-track-block{background:linear-gradient(180deg,#1d6fff,#1456c4);}' +
      '#__loadVideoEdit .ve-track-row[data-track="text"] .ve-track-block{background:linear-gradient(180deg,#fbbf24,#d99a16);color:#1a1a26;}' +
      '#__loadVideoEdit .ve-track-row[data-track="sticker"] .ve-track-block{background:linear-gradient(180deg,#a855f7,#7c3aed);}' +
      '#__loadVideoEdit .ve-track-row .ve-track-block .ve-tb-trim{position:absolute;top:0;bottom:0;width:8px;background:rgba(0,0,0,0.35);cursor:ew-resize;}' +
      '#__loadVideoEdit .ve-track-row .ve-track-block .ve-tb-trim.l{left:0;border-radius:6px 0 0 6px;}' +
      '#__loadVideoEdit .ve-track-row .ve-track-block .ve-tb-trim.r{right:0;border-radius:0 6px 6px 0;}' +
      '#__loadVideoEdit .ve-track-row .ve-track-block .ve-tb-x{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#fff;color:#1a1a26;border:none;font-size:11px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;}' +
      '#__loadVideoEdit .empty-slot:hover{background:#15152a;}' +
      '#__loadVideoEdit .big-add{flex:0 0 44px;height:56px;background:#1e1e2a;border:none;border-radius:8px;color:#cfcfdc;font-size:22px;font-weight:900;cursor:pointer;font-family:inherit;}' +
      '#__loadVideoEdit .big-add:hover{background:#2a2a3a;color:#ffcc1a;}' +
      '#__loadVideoEdit .waveform-track{height:38px;margin-top:8px;background:#191923;border-radius:8px;position:relative;overflow:hidden;}' +
      '#__loadVideoEdit .waveform-track canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}' +
      '#__loadVideoEdit .waveform-track.empty::before{content:"Audio waveform decoding…";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#5a5a78;font-size:11px;font-weight:600;letter-spacing:0.05em;}' +
      '#__loadVideoEdit .time-ruler{position:relative;height:22px;color:#8f8f9d;font-size:11px;font-variant-numeric:tabular-nums;margin-top:6px;}' +
      '#__loadVideoEdit .playhead{position:absolute;top:12px;bottom:12px;width:2px;background:#fff;left:0;pointer-events:none;box-shadow:0 0 6px rgba(255,255,255,0.7);z-index:10;}' +
      '#__loadVideoEdit .playhead::before{content:"";position:absolute;top:-3px;left:-5px;width:12px;height:12px;background:#fff;border-radius:50%;box-shadow:0 0 0 2px #101018;}' +
      // ===== FORCE-FIX TEST CLIP (verbatim from user spec) =====
      '#__loadVideoEdit .force-test-clip{width:450px !important;height:56px !important;background:red !important;border:3px solid #ffcc1a !important;display:block !important;position:relative !important;z-index:9999 !important;opacity:1 !important;visibility:visible !important;}' +
      '#__loadVideoEdit .force-test-clip .thumbnail-strip{width:100% !important;height:100% !important;display:flex !important;background:#222 !important;}' +
      '#__loadVideoEdit .force-test-clip .thumbnail-frame{width:86px !important;height:100% !important;display:flex !important;align-items:center !important;justify-content:center !important;color:white !important;background:#333 !important;}' +
      // Legacy class shims (kept hidden so existing engine code that
      // queries them still finds something to bind to without throwing)
      '#__loadVideoEdit .ve-clip-strip{position:relative;flex:1;height:56px;background:transparent;cursor:ew-resize;touch-action:none;overflow:visible;}' +
      '#__loadVideoEdit .ve-clip-block{box-shadow:0 0 0 2px #fbbf24;cursor:pointer;}' +
      '#__loadVideoEdit .ve-clip-block.on{box-shadow:0 0 0 3px #fff, 0 0 0 5px #fbbf24, 0 0 18px rgba(251,191,36,0.6);}' +
      '#__loadVideoEdit .ve-block-thumbs{position:absolute;inset:0;display:flex;border-radius:4px;overflow:hidden;background:#1a1a26;}' +
      '#__loadVideoEdit .ve-block-thumbs img{flex:1;width:0;height:100%;object-fit:cover;display:block;border-right:1px solid rgba(0,0,0,0.30);}' +
      '#__loadVideoEdit .ve-block-thumbs img:last-child{border-right:none;}' +
      '#__loadVideoEdit .ve-block-border{position:absolute;inset:0;pointer-events:none;border-radius:4px;}' +
      '#__loadVideoEdit .ve-block-dur{position:absolute;left:6px;bottom:4px;background:rgba(0,0,0,0.7);color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;font-variant-numeric:tabular-nums;pointer-events:none;}' +
      '#__loadVideoEdit .ve-block-handle{position:absolute;top:0;bottom:0;width:14px;background:#fbbf24;cursor:ew-resize;display:flex;align-items:center;justify-content:center;color:#1a1a26;font-weight:900;}' +
      '#__loadVideoEdit .ve-block-handle-l{left:0;border-radius:4px 0 0 4px;}' +
      '#__loadVideoEdit .ve-block-handle-r{right:0;border-radius:0 4px 4px 0;}' +
      '#__loadVideoEdit .ve-block-handle::after{content:"||";font-size:10px;letter-spacing:-1px;}' +
      '#__loadVideoEdit .ve-block-add{position:absolute;top:50%;transform:translateY(-50%);width:22px;height:22px;border-radius:50%;background:#fff;color:#1a1a26;border:2px solid #1a1a26;font-size:14px;font-weight:900;cursor:pointer;line-height:1;padding:0;z-index:7;}' +
      '#__loadVideoEdit .ve-block-add-l{left:-12px;}' +
      '#__loadVideoEdit .ve-block-add-r{right:-12px;}' +
      '#__loadVideoEdit .ve-empty-slot:hover{background:#15152a;color:#5a5a78;}' +
      '#__loadVideoEdit .ve-clip-strip.ve-selected{box-shadow:0 0 0 3px #fbbf24, 0 0 24px rgba(251,191,36,0.55);}' +
      '#__loadVideoEdit .ve-clip-strip.ve-selected .ve-clip-trim{border-color:#fff;border-width:3px;}' +
      '#__loadVideoEdit .ve-clip-thumbs{position:absolute;top:0;bottom:0;left:0;right:0;display:flex;border-radius:6px;overflow:hidden;}' +
      '#__loadVideoEdit .ve-clip-thumbs img{flex:1;width:0;height:100%;object-fit:cover;display:block;border-right:1px solid rgba(0,0,0,0.30);}' +
      '#__loadVideoEdit .ve-clip-thumbs img:last-child{border-right:none;}' +
      '#__loadVideoEdit .ve-clip-thumbs.loading::before{content:"Loading frames…";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px;font-weight:600;letter-spacing:0.05em;}' +
      '#__loadVideoEdit .ve-clip-trim{position:absolute;top:0;bottom:0;left:0;right:0;border:2px solid #fbbf24;border-radius:6px;background:transparent;pointer-events:none;}' +
      '#__loadVideoEdit .ve-clip-quick{position:absolute;top:-46px;left:50%;transform:translateX(-50%);background:#1d6fff;border-radius:14px;padding:4px 6px;display:flex;gap:2px;box-shadow:0 6px 18px rgba(0,0,0,0.45);z-index:6;animation:vePopIn 0.18s ease-out;}' +
      '#__loadVideoEdit .ve-clip-quick::after{content:"";position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);border-left:7px solid transparent;border-right:7px solid transparent;border-top:7px solid #1d6fff;}' +
      '#__loadVideoEdit .ve-quick-btn{background:transparent;border:none;color:#fff;font-size:18px;width:36px;height:36px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;}' +
      '#__loadVideoEdit .ve-quick-btn:active{background:rgba(255,255,255,0.18);}' +
      '@keyframes vePopIn{from{opacity:0;transform:translateX(-50%) translateY(4px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}' +
      '#__loadVideoEdit .ve-context{position:absolute;left:0;right:0;bottom:0;background:#1a1a26;padding:10px 8px max(10px,env(safe-area-inset-bottom));border-top:1px solid #2a2a40;display:flex;align-items:center;gap:14px;overflow-x:auto;scrollbar-width:none;z-index:8;}' +
      // Single-bottom-bar layout. The clip-context bar (#ve-context)
      // duplicates actions already on #ve-actions + the floating
      // quick toolbar, so it's hidden permanently. Editor is a flex
      // column: stage flex:3, timeline 240px, action bar at the
      // bottom — no overlapping, no two-bar stack.
      '#__loadVideoEdit{display:flex !important;flex-direction:column !important;}' +
      '#__loadVideoEdit #ve-stage{flex:3 1 0 !important;min-height:280px !important;}' +
      '#__loadVideoEdit .timeline-engine{flex:0 0 auto !important;height:320px !important;min-height:320px !important;padding-bottom:6px !important;overflow:visible !important;}' +
      '#__loadVideoEdit .track-labels{overflow-y:auto !important;max-height:300px !important;scrollbar-width:none !important;}' +
      '#__loadVideoEdit .track-labels::-webkit-scrollbar{display:none !important;}' +
      '#__loadVideoEdit .timeline-scroll{padding-bottom:6px !important;}' +
      // Always show #ve-actions (even when clip-active hides it via the
      // legacy rule) so the bottom toolbar buttons remain tappable.
      '#__loadVideoEdit #ve-actions,#__loadVideoEdit.ve-clip-active #ve-actions{flex:0 0 auto !important;position:relative !important;bottom:auto !important;padding-bottom:max(10px,env(safe-area-inset-bottom)) !important;display:flex !important;}' +
      '#__loadVideoEdit .ve-context,#__loadVideoEdit #ve-context,#__loadVideoEdit.ve-clip-active #ve-context{display:none !important;}' +
      // Thumbnail-distortion fix — equal flex shares with object-fit:cover.
      // Taller clip + wider per-thumb so source aspect crops less and the
      // image inside reads naturally instead of as a thin strip.
      '#__loadVideoEdit .video-track{height:90px !important;}' +
      '#__loadVideoEdit .timeline-clip{overflow:hidden !important;height:84px !important;}' +
      '#__loadVideoEdit .empty-slot,#__loadVideoEdit .big-add{height:84px !important;}' +
      // Natural-aspect thumbnails (Option 1, VN-like). Each thumb keeps
      // its source aspect ratio at the clip's height — no horizontal
      // stretch, no crop. The strip scrolls horizontally if its
      // natural total width exceeds the clip width.
      '#__loadVideoEdit .thumbnail-strip{width:100% !important;height:100% !important;display:flex !important;align-items:stretch !important;overflow-x:auto !important;overflow-y:hidden !important;-webkit-overflow-scrolling:touch !important;scrollbar-width:none !important;}' +
      '#__loadVideoEdit .thumbnail-strip::-webkit-scrollbar{display:none !important;}' +
      '#__loadVideoEdit .thumbnail-strip > *,#__loadVideoEdit .thumbnail-strip img,#__loadVideoEdit .thumbnail-frame{flex:0 0 auto !important;width:auto !important;height:100% !important;object-fit:contain !important;object-position:center !important;display:block !important;border-right:1px solid rgba(255,255,255,0.15) !important;image-rendering:auto !important;-webkit-image-rendering:auto !important;}' +
      '#__loadVideoEdit .thumbnail-strip img:last-child,#__loadVideoEdit .thumbnail-frame:last-child{border-right:none !important;}' +
      '#__loadVideoEdit .ve-context::-webkit-scrollbar{display:none;}' +
      '#__loadVideoEdit .ve-context-done .ve-act-icon{background:#1d6fff;color:#fff;border-color:#1d6fff;}' +
      '#__loadVideoEdit.ve-clip-active #ve-context{display:flex;}' +
      '#__loadVideoEdit.ve-clip-active #ve-actions{display:none;}' +
      '#__loadVideoEdit .ve-clip-handle{position:absolute;top:-3px;bottom:-3px;width:18px;background:#fbbf24;cursor:ew-resize;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#1a1a26;font-size:14px;font-weight:900;pointer-events:auto;touch-action:none;box-shadow:0 0 0 1px rgba(0,0,0,0.25);}' +
      '#__loadVideoEdit .ve-clip-handle::before{content:attr(data-time);position:absolute;top:-22px;background:#1a1a26;color:#fbbf24;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;pointer-events:none;}' +
      '#__loadVideoEdit .ve-handle-left{left:-9px;}' +
      '#__loadVideoEdit .ve-handle-left::after{content:"\\\\\\\\";color:#1a1a26;}' +
      '#__loadVideoEdit .ve-handle-right{right:-9px;}' +
      '#__loadVideoEdit .ve-handle-right::after{content:"\\\\\\\\";color:#1a1a26;}' +
      '#__loadVideoEdit #ve-snap.on{background:#fbbf24;color:#1a1a26;}' +
      '#__loadVideoEdit .ve-snap-grid{position:absolute;top:0;bottom:0;left:0;right:0;pointer-events:none;z-index:4;}' +
      '#__loadVideoEdit .ve-snap-tick{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.18);}' +
      '#__loadVideoEdit .ve-snap-tick.major{background:rgba(255,255,255,0.40);}' +
      '#__loadVideoEdit .ve-clip-duration{position:absolute;left:6px;top:-18px;font-size:10px;color:#fbbf24;font-weight:700;background:#1a1a26;padding:1px 6px;border-radius:3px;}' +
      '#__loadVideoEdit .ve-clip-playhead{position:absolute;top:-4px;bottom:-4px;width:2px;background:#fff;left:0;pointer-events:none;box-shadow:0 0 6px rgba(255,255,255,0.6);}' +
      '#__loadVideoEdit .ve-clip-playhead::before{content:"";position:absolute;top:-3px;left:-5px;width:12px;height:12px;background:#fff;border-radius:50%;box-shadow:0 0 0 2px #1a1a26;}' +
      '#__loadVideoEdit .ve-track-audio .ve-track-body{background:transparent;}' +
      '#__loadVideoEdit .ve-waveform{flex:1;height:32px;background:#0a0a14;border-radius:4px;position:relative;overflow:hidden;}' +
      '#__loadVideoEdit .ve-waveform canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}' +
      '#__loadVideoEdit .ve-waveform.empty::before{content:"Audio waveform decoding…";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#5a5a78;font-size:11px;font-weight:600;letter-spacing:0.05em;}' +
      '#__loadVideoEdit .ve-time-ruler{position:relative;height:22px;color:#9a9aac;font-size:11px;font-variant-numeric:tabular-nums;background:#0a0a14;}' +
      '#__loadVideoEdit .ve-time-ruler .tick{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.18);}' +
      '#__loadVideoEdit .ve-time-ruler .tick.major{background:rgba(255,255,255,0.45);}' +
      '#__loadVideoEdit .ve-time-ruler .tick-label{position:absolute;top:4px;color:#cfcfdc;font-weight:600;transform:translateX(-50%);}' +
      // VN-tight bottom toolbar — smaller icons, smaller text, tighter
      // gaps. Whole bar reads as a single sleek strip instead of fat
      // chunky tiles. Outline icon + caption stack matches VN exactly.
      '#__loadVideoEdit .ve-action{flex:0 0 auto;background:transparent;border:none;color:#cfcfdc;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 2px;cursor:pointer;min-width:46px;font-family:inherit;}' +
      '#__loadVideoEdit .ve-action:active{transform:scale(0.94);}' +
      '#__loadVideoEdit .ve-act-icon{font-size:15px;width:26px;height:26px;border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;border:1.4px solid rgba(255,255,255,0.85);color:#fff;line-height:1;}' +
      '#__loadVideoEdit .ve-act-lbl{font-size:9.5px;color:#cfcfdc;text-align:center;line-height:1.15;letter-spacing:0.01em;white-space:nowrap;}' +
      '#__loadVideoEdit .ve-action.on .ve-act-icon{background:#fbbf24;color:#1a1a26;border-color:#fbbf24;}' +
      '#__loadVideoEdit #ve-actions{gap:6px !important;padding:6px 8px max(6px,env(safe-area-inset-bottom)) !important;}' +
      '#__loadVideoEdit .ve-action-sep{flex:0 0 auto;width:1px;height:36px;background:#2a2a40;margin:0 4px;display:inline-block;}' +
      // Panel sits above the bottom action toolbar, with safe-area
      // inset so iPad's home indicator doesn't crop the close button.
      // bottom is generous (calc(80px + safe-area)) so on portrait
      // there is always clear separation between the panel and the
      // toolbar; the toolbar is hidden via a parent class while a
      // panel is open as a belt-and-suspenders fallback.
      '#__loadVideoEdit .ve-panel{position:fixed;left:0;right:0;bottom:calc(80px + env(safe-area-inset-bottom));background:#1a1a26;border:1px solid #2a2a40;padding:14px 16px 18px;z-index:30;max-width:580px;margin:0 auto;border-radius:18px;box-shadow:0 -10px 36px rgba(0,0,0,0.55);}' +
      // While any panel is open, suppress the bottom action toolbar
      // and the context-action bar so they don't visually compete.
      '#__loadVideoEdit.ve-panel-open #ve-actions{display:none;}' +
      '#__loadVideoEdit.ve-panel-open #ve-context{display:none;}' +
      '#__loadVideoEdit .ve-panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-weight:700;color:#fff;font-size:14px;}' +
      '#__loadVideoEdit .ve-lbl{font-size:12.5px;color:#a0a0b0;display:block;}' +
      '#__loadVideoEdit .ve-input{display:block;width:100%;margin-top:4px;padding:6px 8px;background:#0e0e18;color:#fff;border:1px solid #2a2a40;border-radius:6px;font-size:13px;}' +
      '#__loadVideoEdit .ve-color{display:block;width:100%;height:34px;margin-top:4px;border:none;background:transparent;cursor:pointer;}' +
      '#__loadVideoEdit .ve-speed-preset{background:#0e0e18;color:#cfcfdc;border:1px solid #2a2a40;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;}' +
      '#__loadVideoEdit .ve-speed-preset:hover{background:#1a1a26;color:#fff;border-color:#fbbf24;}' +
      '#__loadVideoEdit .ve-speed-preset:active{transform:scale(0.97);}';
    wrap.appendChild(styleTag);

    document.body.appendChild(wrap);
    // FIX v17y-safe: bind video/canvas immediately after mounting editor DOM, before anything touches them.
    var video = document.getElementById("ve-video");
    var canvas = document.getElementById("ve-overlay");
    // Force iPad Safari to start downloading metadata + first frame
    // immediately. Without this the <video> waits for user gesture +
    // auto-loads lazily; on broken / unsupported clips that lazy
    // path leaves video.duration stuck at 0 forever, which is what
    // makes Play / scrub / trim / thumbnails all feel dead.
    try { video.load(); } catch (e) {}
    // 3-second "did the video actually decode?" probe. If duration
    // is still 0/NaN by then, surface a loud overlay so the user
    // knows the file failed (instead of a silent inert editor).
    setTimeout(function () {
      if (!video.duration || isNaN(video.duration)) showLoadFailure();
    }, 3000);
    function showLoadFailure() {
      var stage = document.getElementById('ve-stage');
      if (!stage || stage.querySelector('.ve-fail-overlay')) return;
      var ov = document.createElement('div');
      ov.className = 've-fail-overlay';
      ov.style.cssText = 'position:absolute;inset:0;background:rgba(10,10,20,0.92);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;z-index:20;';
      ov.innerHTML =
        '<div style="font-size:42px;">&#9888;&#65039;</div>' +
        '<div style="font-size:16px;font-weight:700;line-height:1.4;max-width:320px;">This video did not decode on iPad.</div>' +
        '<div style="font-size:13px;color:#a8a8c4;line-height:1.6;max-width:340px;">Most common cause: the file is HEVC inside a non-MP4 container, or the original was deleted on the device after import. Re-import the clip as standard H.264 MP4.</div>' +
        '<div style="display:flex;gap:10px;margin-top:8px;">' +
          '<button id="ve-fail-replace" style="background:#1d6fff;color:#fff;border:none;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">&#8634; Replace clip</button>' +
          '<button id="ve-fail-close" style="background:#2a2a40;color:#fff;border:none;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">Close editor</button>' +
        '</div>';
      stage.appendChild(ov);
      document.getElementById('ve-fail-replace').addEventListener('click', function () {
        document.getElementById('ve-replace-pick').click();
        // Once a Replace pick is made, the loadedmetadata handler will
        // fire and the overlay can come down.
        var observer = setInterval(function () {
          if (video.duration && !isNaN(video.duration)) {
            ov.remove(); clearInterval(observer);
          }
        }, 500);
      });
      document.getElementById('ve-fail-close').addEventListener('click', function () {
        var existing = document.getElementById('__loadVideoEdit');
        if (existing) existing.remove();
      });
    }
    // Discoverability toast — fires once per editor session so the
    // user has confirmation the wiring is live and knows the core
    // gestures (tap clip, drag trim handles, scrub, ⬆ export).
    setTimeout(function () {
      try { toast('Editor ready · tap clip to edit · drag yellow handles to trim · ⬆ Export when done', false); } catch (e) {}
    }, 350);

    // Wire timeline trim handles -> hidden trim-in/out inputs (existing
    // export pipeline reads those, so it keeps working without changes)
    var clipTrim = document.getElementById('ve-clip-trim');
    var clipStrip = document.getElementById('ve-clip-strip');
    var handleL = document.getElementById('ve-handle-left');
    var handleR = document.getElementById('ve-handle-right');
    var clipDur = document.getElementById('ve-clip-duration');
    var playhead = document.getElementById('ve-clip-playhead');
    function syncTrimFromHandles() {
      if (!video.duration) return;
      var sw = clipStrip.clientWidth || 1;
      var leftPct = parseFloat(clipTrim.dataset.lpct || '0');
      var rightPct = parseFloat(clipTrim.dataset.rpct || '100');
      var inS = (leftPct / 100) * video.duration;
      var outS = (rightPct / 100) * video.duration;
      document.getElementById('ve-trim-in').value = inS.toFixed(2);
      document.getElementById('ve-trim-out').value = outS.toFixed(2);
      clipTrim.style.left = leftPct + '%';
      clipTrim.style.right = (100 - rightPct) + '%';
      clipDur.textContent = (outS - inS).toFixed(2) + 's';
      // Live timestamps above each handle so the user sees the exact
      // in / out point during a drag without checking the centre label.
      if (handleL) handleL.setAttribute('data-time', inS.toFixed(2) + 's');
      if (handleR) handleR.setAttribute('data-time', outS.toFixed(2) + 's');
    }
    function startDrag(handle, side) {
      var moveHandler = function (e) {
        var clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
        var rect = clipStrip.getBoundingClientRect();
        var pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        // Snap-to-grid: if Snap is on, round the trim handle to the
        // nearest 0.5 second mark on the actual video duration.
        if (snapEnabled && video.duration && isFinite(video.duration)) {
          var sec = (pct / 100) * video.duration;
          var snapped = Math.round(sec / SNAP_STEP) * SNAP_STEP;
          pct = Math.max(0, Math.min(100, (snapped / video.duration) * 100));
        }
        if (side === 'left') {
          var rp = parseFloat(clipTrim.dataset.rpct || '100');
          if (pct > rp - 2) pct = rp - 2;
          clipTrim.dataset.lpct = pct;
        } else {
          var lp = parseFloat(clipTrim.dataset.lpct || '0');
          if (pct < lp + 2) pct = lp + 2;
          clipTrim.dataset.rpct = pct;
        }
        syncTrimFromHandles();
      };
      var endHandler = function () {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('mouseup', endHandler);
        document.removeEventListener('touchend', endHandler);
      };
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('touchmove', moveHandler, { passive: true });
      document.addEventListener('mouseup', endHandler);
      document.addEventListener('touchend', endHandler);
    }
    handleL.addEventListener('mousedown', function (e) { e.preventDefault(); startDrag(handleL, 'left'); });
    handleL.addEventListener('touchstart', function (e) { startDrag(handleL, 'left'); }, { passive: true });
    handleR.addEventListener('mousedown', function (e) { e.preventDefault(); startDrag(handleR, 'right'); });
    handleR.addEventListener('touchstart', function (e) { startDrag(handleR, 'right'); }, { passive: true });

    // Track-add buttons -> open inline panels
    function showPanel(id) {
      ['ve-text-panel', 've-music-panel', 've-speed-panel', 've-opacity-panel'].forEach(function (p) {
        var el = document.getElementById(p); if (el) el.hidden = (p !== id);
      });
      // Toggle ve-panel-open on the editor wrap so CSS hides the
      // bottom action bars while a panel is up — prevents the
      // toolbars from covering the panel's controls / close button.
      wrap.classList.toggle('ve-panel-open', !!id);
    }
    // Old data-add handler removed in v17am — the new handler later
    // in this file (around line ~10590) actually opens pickers, drops
    // clips, and toggles original-audio mute. Keeping both fired
    // duplicate toasts and let the older one shadow the newer one's
    // visual feedback.
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-add-noop]'), function (btn) {
      btn.addEventListener('click', function () {});
    });
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-close-panel]'), function (b) {
      b.addEventListener('click', function () { showPanel(null); });
    });

    // Live CSS-driven effects state. applyFx() pushes inline transform
    // / filter onto the <video> so changes are visible immediately.
    var fx = { mirror: false, flip: false, rotate: 0, filter: 'none', blur: 0, fit: 'contain', bgColor: '#000', borderPx: 0, scale: 1, frozen: false };
    var FILTERS = {
      none:      '',
      warm:      'sepia(0.25) saturate(1.2) hue-rotate(-10deg)',
      cool:      'saturate(1.1) hue-rotate(15deg) brightness(1.05)',
      noir:      'grayscale(1) contrast(1.15)',
      vivid:     'saturate(1.6) contrast(1.1)',
      soft:      'brightness(1.1) contrast(0.92) blur(0.4px)',
      vintage:   'sepia(0.55) contrast(1.1) brightness(0.95)',
      sepia:     'sepia(1)',
      bw:        'grayscale(1)',
      cinema:    'contrast(1.25) saturate(0.85) brightness(0.95) hue-rotate(-5deg)',
      teal:      'hue-rotate(20deg) saturate(1.3) brightness(1.05)',
      sunset:    'sepia(0.4) saturate(1.4) hue-rotate(-20deg) brightness(1.05)',
      crisp:     'contrast(1.4) saturate(1.2) brightness(1.05)',
      faded:     'contrast(0.85) saturate(0.7) brightness(1.1)',
      dramatic:  'contrast(1.6) saturate(1.5) brightness(0.92)',
      pastel:    'contrast(0.9) saturate(0.8) brightness(1.15)',
      neon:      'saturate(2) contrast(1.3) hue-rotate(35deg) brightness(1.1)',
      moody:     'contrast(1.2) saturate(0.9) brightness(0.85) sepia(0.15)',
      golden:    'sepia(0.6) saturate(1.3) hue-rotate(-15deg) brightness(1.08)',
      arctic:    'saturate(0.7) hue-rotate(190deg) brightness(1.15) contrast(1.1)',
      film:      'sepia(0.35) contrast(1.15) saturate(1.2) brightness(0.96)'
    };
    var FILTER_KEYS = Object.keys(FILTERS);
    var FILTER_LABELS = { none: 'None', warm: 'Warm', cool: 'Cool', noir: 'Noir', vivid: 'Vivid', soft: 'Soft', vintage: 'Vintage', sepia: 'Sepia', bw: 'B & W', cinema: 'Cinema', teal: 'Teal', sunset: 'Sunset', crisp: 'Crisp', faded: 'Faded', dramatic: 'Dramatic', pastel: 'Pastel', neon: 'Neon', moody: 'Moody', golden: 'Golden', arctic: 'Arctic', film: 'Film' };

    // Generic option-sheet popup. Used by Filter / FX / Blur / BG /
    // Border / Mosaic / Magnifier / Freeze / Reverse / Zoom etc. so
    // each tool can offer multiple choices instead of single-tap
    // cycle. Returns a promise resolving with the picked option key,
    // or null if cancelled.
    function openToolSheet(title, options, currentKey) {
      return new Promise(function (resolve) {
        var menu = document.createElement('div');
        menu.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:3500;display:flex;align-items:flex-end;justify-content:center;padding:0;';
        var grid = options.map(function (o) {
          var on = (o.key === currentKey) ? ' style="background:#fbbf24;color:#1a1a26;border-color:#fbbf24;"' : '';
          return '<button class="ve-sheet-opt" data-key="' + o.key + '"' + on + '><span class="ve-sheet-icon">' + (o.icon || '•') + '</span><span class="ve-sheet-lbl">' + o.label + '</span></button>';
        }).join('');
        menu.innerHTML =
          '<div style="background:#1a1a26;color:#fff;width:100%;max-width:560px;border-top-left-radius:16px;border-top-right-radius:16px;padding:14px 14px max(14px,env(safe-area-inset-bottom));">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
              '<h3 style="margin:0;font-size:16px;font-weight:700;">' + title + '</h3>' +
              '<button id="vesheet-close" style="background:transparent;border:none;color:#cfcfdc;font-size:22px;cursor:pointer;line-height:1;">×</button>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(86px,1fr));gap:8px;max-height:60vh;overflow-y:auto;">' + grid + '</div>' +
          '</div>' +
          '<style>' +
            '.ve-sheet-opt{background:#2a2a40;border:1.5px solid transparent;color:#fff;border-radius:10px;padding:10px 6px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;font-family:inherit;}' +
            '.ve-sheet-opt:active{transform:scale(0.96);}' +
            '.ve-sheet-icon{font-size:20px;}' +
            '.ve-sheet-lbl{font-size:11px;font-weight:600;text-align:center;line-height:1.15;}' +
          '</style>';
        document.body.appendChild(menu);
        var done = function (key) { try { menu.remove(); } catch (_) {} resolve(key); };
        menu.addEventListener('click', function (e) { if (e.target === menu) done(null); });
        document.getElementById('vesheet-close').addEventListener('click', function () { done(null); });
        Array.prototype.forEach.call(menu.querySelectorAll('.ve-sheet-opt'), function (b) {
          b.addEventListener('click', function () { done(b.getAttribute('data-key')); });
        });
      });
    }
    // In-app free-media browser. Tabbed UI (Photos / Videos / Music)
    // with multiple providers per type. User pastes API keys once
    // (saved to localStorage); after that, search runs in-app and
    // tapping a result fetches + imports the asset to the Library —
    // no copy-paste of URLs needed.
    function openStockMediaSheet() {
      var KEY_STORE = 'load_media_key_';
      function getKey(p) { try { return localStorage.getItem(KEY_STORE + p) || ''; } catch (_) { return ''; } }
      function setKey(p, v) { try { localStorage.setItem(KEY_STORE + p, v || ''); } catch (_) {} }

      var PROVIDERS = {
        pixabay: {
          name: 'Pixabay',
          types: ['photos','videos'],
          needsKey: true,
          signup: 'https://pixabay.com/accounts/register/',
          keyDocs: 'https://pixabay.com/api/docs/',
          license: 'No attribution required. Free for commercial use.',
          search: function (type, q, page) {
            var k = getKey('pixabay'); if (!k) return Promise.reject(new Error('Pixabay API key needed.'));
            var url = (type === 'photos' ? 'https://pixabay.com/api/?' : 'https://pixabay.com/api/videos/?') +
              'key=' + encodeURIComponent(k) + '&q=' + encodeURIComponent(q || '') + '&per_page=20&page=' + page +
              (type === 'photos' ? '&safesearch=true' : '');
            return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
              return (j.hits || []).map(function (h) {
                if (type === 'photos') {
                  return { thumb: h.webformatURL || h.previewURL, full: h.largeImageURL || h.webformatURL, name: 'pixabay-' + h.id + '.jpg', credit: 'Pixabay / ' + (h.user || '') };
                }
                var v = (h.videos && (h.videos.medium || h.videos.small || h.videos.tiny || h.videos.large)) || {};
                return { thumb: 'https://i.vimeocdn.com/video/' + h.picture_id + '_640x360.jpg', full: v.url, name: 'pixabay-' + h.id + '.mp4', credit: 'Pixabay / ' + (h.user || '') };
              }).filter(function (r) { return r.full; });
            });
          }
        },
        pexels: {
          name: 'Pexels',
          types: ['photos','videos'],
          needsKey: true,
          signup: 'https://www.pexels.com/api/new/',
          keyDocs: 'https://www.pexels.com/api/documentation/',
          license: 'Free for commercial use. Attribution appreciated.',
          search: function (type, q, page) {
            var k = getKey('pexels'); if (!k) return Promise.reject(new Error('Pexels API key needed.'));
            var url = type === 'photos'
              ? 'https://api.pexels.com/v1/search?query=' + encodeURIComponent(q || 'nature') + '&per_page=20&page=' + page
              : 'https://api.pexels.com/videos/search?query=' + encodeURIComponent(q || 'nature') + '&per_page=20&page=' + page;
            return fetch(url, { headers: { Authorization: k } }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
              if (type === 'photos') {
                return (j.photos || []).map(function (p) {
                  return { thumb: p.src && (p.src.large || p.src.medium), full: (p.src && (p.src.large2x || p.src.large || p.src.original)), name: 'pexels-' + p.id + '.jpg', credit: 'Pexels / ' + (p.photographer || '') };
                });
              }
              return (j.videos || []).map(function (v) {
                var files = (v.video_files || []).slice().sort(function (a, b) { return (a.width || 0) - (b.width || 0); });
                var pick = files.find(function (f) { return f.width >= 1280; }) || files[files.length - 1];
                return { thumb: v.image, full: pick && pick.link, name: 'pexels-' + v.id + '.mp4', credit: 'Pexels / ' + ((v.user && v.user.name) || '') };
              }).filter(function (r) { return r.full; });
            });
          }
        },
        unsplash: {
          name: 'Unsplash',
          types: ['photos'],
          needsKey: true,
          signup: 'https://unsplash.com/oauth/applications',
          keyDocs: 'https://unsplash.com/documentation',
          license: 'Free Unsplash license. Credit photographer + Unsplash.',
          search: function (type, q, page) {
            var k = getKey('unsplash'); if (!k) return Promise.reject(new Error('Unsplash access key needed.'));
            var url = 'https://api.unsplash.com/search/photos?query=' + encodeURIComponent(q || 'cinematic') + '&per_page=20&page=' + page;
            return fetch(url, { headers: { Authorization: 'Client-ID ' + k } }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
              return (j.results || []).map(function (p) {
                return { thumb: p.urls && p.urls.small, full: (p.urls && (p.urls.regular || p.urls.full)), name: 'unsplash-' + p.id + '.jpg', credit: 'Unsplash / ' + ((p.user && p.user.name) || '') };
              });
            });
          }
        },
        jamendo: {
          name: 'Jamendo',
          types: ['music'],
          needsKey: true,
          signup: 'https://devportal.jamendo.com/signup',
          keyDocs: 'https://developer.jamendo.com/v3.0',
          license: 'Free for non-commercial. Commercial: Jamendo Licensing.',
          search: function (type, q, page) {
            var k = getKey('jamendo'); if (!k) return Promise.reject(new Error('Jamendo client_id needed.'));
            var offset = (page - 1) * 20;
            var url = 'https://api.jamendo.com/v3.0/tracks/?client_id=' + encodeURIComponent(k) +
              '&format=json&limit=20&offset=' + offset +
              '&search=' + encodeURIComponent(q || 'cinematic') +
              '&audioformat=mp32&include=musicinfo';
            return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
              return (j.results || []).map(function (t) {
                return { thumb: t.image || t.album_image, full: t.audiodownload || t.audio, name: 'jamendo-' + t.id + '.mp3', credit: 'Jamendo / ' + (t.artist_name || '') + ' — ' + (t.name || '') };
              }).filter(function (r) { return r.full; });
            });
          }
        },
        openverse: {
          name: 'Openverse (no key)',
          types: ['photos','music'],
          needsKey: false,
          signup: 'https://openverse.org/',
          keyDocs: 'https://api.openverse.org/v1/',
          license: 'CC + public domain. Check per-item license.',
          search: function (type, q, page) {
            var endpoint = type === 'photos' ? 'images' : 'audio';
            var url = 'https://api.openverse.org/v1/' + endpoint + '/?q=' + encodeURIComponent(q || 'cinematic') + '&page_size=20&page=' + page;
            return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
              return (j.results || []).map(function (it) {
                if (type === 'photos') {
                  return { thumb: it.thumbnail || it.url, full: it.url, name: 'openverse-' + (it.id || Date.now()) + '.jpg', credit: 'Openverse / ' + (it.creator || '') + ' (' + (it.license || 'CC') + ')' };
                }
                return { thumb: it.thumbnail, full: it.url, name: 'openverse-' + (it.id || Date.now()) + '.mp3', credit: 'Openverse / ' + (it.creator || '') + ' (' + (it.license || 'CC') + ')' };
              }).filter(function (r) { return r.full; });
            });
          }
        }
      };

      var TYPE_PROVIDERS = {
        photos: ['pixabay','pexels','unsplash','openverse'],
        videos: ['pixabay','pexels'],
        music:  ['jamendo','openverse']
      };

      var state = { type: 'photos', provider: 'pixabay', query: 'cinematic', page: 1 };

      var menu = document.createElement('div');
      menu.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:3500;display:flex;align-items:flex-end;justify-content:center;';
      menu.innerHTML =
        '<div style="background:#1a1a26;color:#fff;width:100%;max-width:720px;border-top-left-radius:16px;border-top-right-radius:16px;padding:14px 14px max(14px,env(safe-area-inset-bottom));max-height:90vh;display:flex;flex-direction:column;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;">' +
            '<h3 style="margin:0;font-size:16px;font-weight:700;">🌐 Free media library</h3>' +
            '<div style="display:flex;gap:6px;">' +
              '<button id="vesm-keys" style="background:#2a2a40;border:none;color:#fff;font-size:13px;padding:6px 10px;border-radius:8px;cursor:pointer;">⚙ Keys</button>' +
              '<button id="vesm-close" style="background:transparent;border:none;color:#cfcfdc;font-size:22px;cursor:pointer;line-height:1;">×</button>' +
            '</div>' +
          '</div>' +
          '<div id="vesm-tabs" style="display:flex;gap:6px;margin-bottom:8px;"></div>' +
          '<div id="vesm-prov" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;"></div>' +
          '<div style="display:flex;gap:6px;margin-bottom:8px;">' +
            '<input id="vesm-q" type="search" placeholder="Search…" style="flex:1;padding:9px 11px;background:#0e0e18;border:1px solid #2a2a40;color:#fff;border-radius:8px;font-size:14px;">' +
            '<button id="vesm-go" style="background:#fbbf24;color:#1a1a26;border:none;font-weight:800;padding:0 14px;border-radius:8px;cursor:pointer;">Search</button>' +
          '</div>' +
          '<div id="vesm-info" style="font-size:11px;color:#a8a8c4;margin-bottom:6px;"></div>' +
          '<div id="vesm-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;overflow-y:auto;flex:1;align-content:start;"></div>' +
          '<div id="vesm-status" style="font-size:12px;color:#a8a8c4;text-align:center;padding-top:6px;">Pick a type and tap Search.</div>' +
        '</div>';
      document.body.appendChild(menu);

      var tabsEl = menu.querySelector('#vesm-tabs');
      var provEl = menu.querySelector('#vesm-prov');
      var qEl = menu.querySelector('#vesm-q');
      var goEl = menu.querySelector('#vesm-go');
      var gridEl = menu.querySelector('#vesm-grid');
      var infoEl = menu.querySelector('#vesm-info');
      var statusEl = menu.querySelector('#vesm-status');

      var TYPES = [
        { key: 'photos', label: '🖼  Photos' },
        { key: 'videos', label: '🎬  Videos' },
        { key: 'music',  label: '🎵  Music' }
      ];
      function renderTabs() {
        tabsEl.innerHTML = '';
        TYPES.forEach(function (t) {
          var b = document.createElement('button');
          var on = state.type === t.key;
          b.textContent = t.label;
          b.style.cssText = 'flex:1;padding:9px;border-radius:8px;border:none;cursor:pointer;font-weight:700;font-size:13px;' +
            (on ? 'background:#fbbf24;color:#1a1a26;' : 'background:#2a2a40;color:#fff;');
          b.addEventListener('click', function () {
            if (state.type === t.key) return;
            state.type = t.key;
            state.provider = TYPE_PROVIDERS[t.key][0];
            state.page = 1;
            renderTabs(); renderProviders();
            gridEl.innerHTML = ''; statusEl.textContent = 'Pick a provider and tap Search.';
            updateInfo();
          });
          tabsEl.appendChild(b);
        });
      }
      function renderProviders() {
        provEl.innerHTML = '';
        var list = TYPE_PROVIDERS[state.type] || [];
        list.forEach(function (pk) {
          var p = PROVIDERS[pk];
          var b = document.createElement('button');
          var on = state.provider === pk;
          var hasKey = !p.needsKey || !!getKey(pk);
          b.innerHTML = (hasKey ? '✓ ' : '⚠ ') + p.name;
          b.title = p.license + (p.needsKey && !hasKey ? '  (No key — tap ⚙ Keys)' : '');
          b.style.cssText = 'padding:7px 11px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:12px;' +
            (on ? 'background:#1d6fff;color:#fff;' : 'background:#2a2a40;color:' + (hasKey ? '#fff' : '#a8a8c4') + ';');
          b.addEventListener('click', function () {
            state.provider = pk; state.page = 1;
            renderProviders(); updateInfo();
          });
          provEl.appendChild(b);
        });
      }
      function updateInfo() {
        var p = PROVIDERS[state.provider];
        if (!p) { infoEl.textContent = ''; return; }
        var hasKey = !p.needsKey || !!getKey(state.provider);
        infoEl.innerHTML = (hasKey ? '✓ ' : '⚠ no key — tap ⚙ Keys · ') + p.license;
      }
      function runSearch() {
        var p = PROVIDERS[state.provider];
        if (!p) return;
        state.query = (qEl.value || '').trim() || 'cinematic';
        gridEl.innerHTML = '';
        statusEl.textContent = 'Searching ' + p.name + ' for "' + state.query + '"…';
        p.search(state.type, state.query, state.page).then(function (rows) {
          if (!rows.length) { statusEl.textContent = 'No results from ' + p.name + '. Try different words or another provider.'; return; }
          statusEl.textContent = rows.length + ' result' + (rows.length === 1 ? '' : 's') + ' from ' + p.name + '. Tap any tile to import.';
          rows.forEach(function (r) { gridEl.appendChild(buildTile(r)); });
        }).catch(function (err) {
          var msg = (err && err.message) || String(err);
          if (/key needed/i.test(msg)) {
            statusEl.textContent = msg + ' Tap ⚙ Keys to paste it (free signup links inside).';
          } else if (/HTTP 401|HTTP 403/i.test(msg)) {
            statusEl.textContent = 'Provider rejected the key (' + msg + '). Tap ⚙ Keys to re-paste, or pick another provider.';
          } else if (/Failed to fetch|NetworkError|CORS/i.test(msg)) {
            statusEl.textContent = 'Network blocked the request (' + msg + '). Try a different provider, or open the site directly via the older link list.';
          } else {
            statusEl.textContent = 'Search failed: ' + msg;
          }
        });
      }
      function buildTile(r) {
        var tile = document.createElement('button');
        tile.style.cssText = 'background:#0e0e18;border:1px solid #2a2a40;border-radius:10px;overflow:hidden;cursor:pointer;padding:0;display:flex;flex-direction:column;text-align:left;';
        var thumb = (r.thumb || '').replace(/"/g, '%22');
        tile.innerHTML =
          // padding-bottom 56.25% gives a true responsive 16:9 box,
          // works on every iPad Safari we care about (no aspect-ratio
          // collapse). The img is absolutely positioned to fill it.
          '<div style="position:relative;width:100%;padding-bottom:56.25%;background:#0a0a14;overflow:hidden;flex-shrink:0;">' +
            (thumb
              ? '<img src="' + thumb + '" alt="" referrerpolicy="no-referrer" loading="lazy" ' +
                  'style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;image-rendering:auto;" ' +
                  'onerror="this.style.display=\'none\';this.parentNode.style.background=\'#1a1a26\';this.parentNode.innerHTML+=\'<div style=&quot;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#5a5a78;font-size:11px;&quot;>(no preview)</div>\';">'
              : '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#5a5a78;font-size:11px;">(no preview)</div>'
            ) +
          '</div>' +
          '<div style="padding:7px 9px;font-size:11px;color:#cfcfdc;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (r.credit || '') + '</div>';
        tile.addEventListener('click', function () { importResult(r); });
        return tile;
      }
      async function importResult(r) {
        if (!r.full) { toast('No download URL for that item.', true); return; }
        statusEl.textContent = 'Fetching ' + r.name + '…';
        try {
          var res = await fetch(r.full);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          var blob = await res.blob();
          var pseudo = new File([blob], r.name, { type: blob.type || '' });
          var baseName = r.name.replace(/\.[^.]+$/, '');
          var imported = await handleMedia(pseudo, baseName);
          imported.attribution = r.credit || '';
          await putApp(imported);
          if (typeof apps !== 'undefined' && apps && apps.push) apps.push(imported);
          hideProgress && hideProgress();
          if (typeof renderLibrary === 'function') { try { renderLibrary(); } catch (_) {} }
          statusEl.textContent = '✓ Imported "' + baseName + '" to Library. Credit: ' + (r.credit || '—');
          toast('Imported: ' + baseName, false);
        } catch (e) {
          hideProgress && hideProgress();
          var m = (e && e.message) || String(e);
          statusEl.textContent = 'Import failed: ' + m;
          toast('Import failed: ' + m, true);
        }
      }
      function openKeys() {
        var pane = document.createElement('div');
        pane.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:3600;display:flex;align-items:flex-end;justify-content:center;';
        var rows = '';
        Object.keys(PROVIDERS).forEach(function (pk) {
          var p = PROVIDERS[pk];
          if (!p.needsKey) return;
          var v = getKey(pk);
          rows +=
            '<div style="background:#0e0e18;border:1px solid #2a2a40;border-radius:10px;padding:10px;margin-bottom:8px;">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">' +
                '<div style="font-weight:700;font-size:14px;">' + p.name + (v ? ' <span style="color:#22c55e;font-size:11px;">✓ saved</span>' : ' <span style="color:#fbbf24;font-size:11px;">— no key</span>') + '</div>' +
                '<div style="display:flex;gap:6px;">' +
                  '<button class="vesm-signup" data-url="' + p.signup + '" style="background:#1d6fff;color:#fff;border:none;border-radius:6px;font-size:11px;padding:4px 8px;cursor:pointer;font-weight:700;">↗ Get free key</button>' +
                  '<button class="vesm-docs" data-url="' + p.keyDocs + '" style="background:#2a2a40;color:#cfcfdc;border:none;border-radius:6px;font-size:11px;padding:4px 8px;cursor:pointer;">Docs</button>' +
                '</div>' +
              '</div>' +
              '<div style="font-size:11px;color:#a8a8c4;margin-bottom:6px;">' + p.license + ' · Covers: ' + p.types.join(', ') + '</div>' +
              '<div style="display:flex;gap:6px;">' +
                '<input class="vesm-key-input" data-prov="' + pk + '" type="text" placeholder="Paste your key here" value="' + (v || '').replace(/"/g, '&quot;') + '" style="flex:1;background:#1a1a26;border:1px solid #2a2a40;color:#fff;padding:8px 10px;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:12px;">' +
                '<button class="vesm-key-save" data-prov="' + pk + '" style="background:#22c55e;color:#1a1a26;border:none;border-radius:6px;font-weight:800;padding:0 12px;cursor:pointer;">Save</button>' +
                (v ? '<button class="vesm-key-clear" data-prov="' + pk + '" style="background:#ff3b5c;color:#fff;border:none;border-radius:6px;font-weight:700;padding:0 10px;cursor:pointer;">Clear</button>' : '') +
              '</div>' +
            '</div>';
        });
        pane.innerHTML =
          '<div style="background:#1a1a26;color:#fff;width:100%;max-width:680px;border-top-left-radius:16px;border-top-right-radius:16px;padding:14px 14px max(14px,env(safe-area-inset-bottom));max-height:88vh;display:flex;flex-direction:column;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
              '<h3 style="margin:0;font-size:16px;font-weight:700;">⚙ Free media — API keys</h3>' +
              '<button id="vesmk-close" style="background:transparent;border:none;color:#cfcfdc;font-size:22px;cursor:pointer;line-height:1;">×</button>' +
            '</div>' +
            '<p style="font-size:12px;color:#a8a8c4;line-height:1.4;margin:0 0 10px;">Each provider needs a free key (one-time signup, takes &lt; 2 min). Keys are stored on this iPad only — never sent to Load servers. Tap “Get free key”, sign up, copy your key, paste it here, Save. Then close this panel and search.</p>' +
            '<div style="overflow-y:auto;flex:1;">' + rows + '</div>' +
            '<p style="font-size:11px;color:#7b7b8c;margin:10px 0 0;line-height:1.4;">Openverse needs no key — it always works. Use it as a fallback while you set up the others.</p>' +
          '</div>';
        document.body.appendChild(pane);
        pane.addEventListener('click', function (e) { if (e.target === pane) try { pane.remove(); } catch (_) {} });
        pane.querySelector('#vesmk-close').addEventListener('click', function () { try { pane.remove(); } catch (_) {} });
        Array.prototype.forEach.call(pane.querySelectorAll('.vesm-signup, .vesm-docs'), function (b) {
          b.addEventListener('click', function () {
            var u = b.getAttribute('data-url');
            try {
              var w = window.open(u, '_blank', 'noopener');
              if (!w && navigator.clipboard) { navigator.clipboard.writeText(u); toast('Pop-up blocked — link copied: ' + u, false); }
            } catch (_) { toast('Open: ' + u, false); }
          });
        });
        Array.prototype.forEach.call(pane.querySelectorAll('.vesm-key-save'), function (b) {
          b.addEventListener('click', function () {
            var pk = b.getAttribute('data-prov');
            var inp = pane.querySelector('.vesm-key-input[data-prov="' + pk + '"]');
            var v = inp ? inp.value.trim() : '';
            setKey(pk, v);
            toast(PROVIDERS[pk].name + ' key ' + (v ? 'saved' : 'cleared') + '.', false);
            try { pane.remove(); } catch (_) {}
            renderProviders(); updateInfo();
          });
        });
        Array.prototype.forEach.call(pane.querySelectorAll('.vesm-key-clear'), function (b) {
          b.addEventListener('click', function () {
            var pk = b.getAttribute('data-prov');
            setKey(pk, '');
            toast(PROVIDERS[pk].name + ' key cleared.', false);
            try { pane.remove(); } catch (_) {}
            renderProviders(); updateInfo();
          });
        });
      }

      menu.addEventListener('click', function (e) { if (e.target === menu) try { menu.remove(); } catch (_) {} });
      menu.querySelector('#vesm-close').addEventListener('click', function () { try { menu.remove(); } catch (_) {} });
      menu.querySelector('#vesm-keys').addEventListener('click', openKeys);
      goEl.addEventListener('click', runSearch);
      qEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') runSearch(); });
      qEl.value = state.query;
      renderTabs(); renderProviders(); updateInfo();
    }
    // Keyframe interpolation. Returns the value of `prop` at time t
    // by linear-interpolating between the closest two keyframes.
    // Times outside the keyframe range clamp to the nearest endpoint.
    function evalKeyframe(arr, t, fallback) {
      if (!arr || !arr.length) return fallback;
      if (arr.length === 1) return arr[0].v;
      if (t <= arr[0].t) return arr[0].v;
      if (t >= arr[arr.length - 1].t) return arr[arr.length - 1].v;
      for (var i = 0; i < arr.length - 1; i++) {
        var a = arr[i], b = arr[i + 1];
        if (t >= a.t && t <= b.t) {
          var span = (b.t - a.t) || 1;
          var f = (t - a.t) / span;
          return a.v + (b.v - a.v) * f;
        }
      }
      return fallback;
    }
    // Resolve (clip, sourceTimeOffsetIntoClip) for the engine playhead
    // and apply any keyframe-driven fx values to the live preview.
    function applyKeyframes(clip, tInClip) {
      if (!clip || !clip.keyframes) return;
      var op = evalKeyframe(clip.keyframes.opacity, tInClip, null);
      var sc = evalKeyframe(clip.keyframes.scale,   tInClip, null);
      var ro = evalKeyframe(clip.keyframes.rotate,  tInClip, null);
      var tx = evalKeyframe(clip.keyframes.translateX, tInClip, null);
      var ty = evalKeyframe(clip.keyframes.translateY, tInClip, null);
      if (op != null && video) video.style.opacity = String(op);
      if (sc != null) fx.scale = sc;
      if (ro != null) fx.rotate = ro;
      if (sc != null || ro != null || tx != null || ty != null) {
        var t = '';
        if (sc != null && sc !== 1) t += ' scale(' + sc + ')';
        if (ro != null && ro !== 0) t += ' rotate(' + ro + 'deg)';
        if (tx != null && tx !== 0) t += ' translateX(' + tx + 'px)';
        if (ty != null && ty !== 0) t += ' translateY(' + ty + 'px)';
        if (fx.mirror) t += ' scaleX(-1)';
        if (fx.flip)   t += ' scaleY(-1)';
        if (video) video.style.transform = t.trim();
      }
    }

    function applyFx() {
      if (!video) return;
      var t = '';
      if (fx.scale !== 1) t += ' scale(' + fx.scale + ')';
      if (fx.rotate) t += ' rotate(' + fx.rotate + 'deg)';
      if (fx.mirror) t += ' scaleX(-1)';
      if (fx.flip) t += ' scaleY(-1)';
      video.style.transform = t.trim();
      var f = (FILTERS[fx.filter] || '');
      if (fx.blur) f += ' blur(' + fx.blur + 'px)';
      video.style.filter = f.trim();
      video.style.objectFit = fx.fit;
      var stage = document.getElementById('ve-stage');
      if (stage) stage.style.background = fx.bgColor;
      video.style.border = fx.borderPx ? (fx.borderPx + 'px solid #fff') : 'none';
      video.style.borderRadius = fx.borderPx ? '6px' : '0';
    }
    var reverseTimer = null;
    function toggleReverse() {
      if (reverseTimer) { clearInterval(reverseTimer); reverseTimer = null; toast('Reverse off.', false); return; }
      try { video.pause(); } catch (e) {}
      reverseTimer = setInterval(function () {
        if (!video || video.readyState < 2) return;
        var t = video.currentTime - 0.066;
        if (t <= 0) { video.currentTime = video.duration || 0; }
        else { try { video.currentTime = t; } catch (e) {} }
      }, 66);
      toast('Reverse on. Tap Reverse again to stop.', false);
    }
    function toggleFreeze() {
      if (fx.frozen) {
        fx.frozen = false;
        try { ctx.clearRect(0, 0, canvas.width, canvas.height); } catch (e) {}
        toast('Freeze off.', false);
        return;
      }
      try {
        video.pause();
        canvas.width = video.videoWidth || canvas.width;
        canvas.height = video.videoHeight || canvas.height;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        fx.frozen = true;
        toast('Freeze on at ' + video.currentTime.toFixed(2) + 's.', false);
      } catch (e) { toast('Freeze failed: ' + (e && e.message || e), true); }
    }
    async function extractAudio() {
      try {
        toast('Extracting audio…', false);
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var resp = await fetch(video.src);
        var ab = await resp.arrayBuffer();
        var buf = await audioCtx.decodeAudioData(ab);
        var wav = audioBufferToWav(buf);
        var blob = new Blob([wav], { type: 'audio/wav' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (app.title || 'audio') + '.wav';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
        toast('Audio downloaded as WAV.', false);
      } catch (e) { toast('Extract failed: ' + (e && e.message || e), true); }
    }
    function audioBufferToWav(buf) {
      var nCh = buf.numberOfChannels, sr = buf.sampleRate, len = buf.length * nCh * 2 + 44;
      var ab = new ArrayBuffer(len), v = new DataView(ab), off = 0;
      function ws(s) { for (var i = 0; i < s.length; i++) v.setUint8(off++, s.charCodeAt(i)); }
      function w16(n) { v.setUint16(off, n, true); off += 2; }
      function w32(n) { v.setUint32(off, n, true); off += 4; }
      ws('RIFF'); w32(len - 8); ws('WAVE'); ws('fmt '); w32(16); w16(1); w16(nCh); w32(sr); w32(sr * nCh * 2); w16(nCh * 2); w16(16); ws('data'); w32(buf.length * nCh * 2);
      var chs = []; for (var c = 0; c < nCh; c++) chs.push(buf.getChannelData(c));
      for (var i = 0; i < buf.length; i++) for (var c2 = 0; c2 < nCh; c2++) {
        var s = Math.max(-1, Math.min(1, chs[c2][i]));
        v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2;
      }
      return ab;
    }
    function autoCaptions() {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { toast('Auto Captions needs Web Speech (Chrome / Safari iOS 16+). Use TTS instead for now.', true); return; }
      if (window.__veRec) { try { window.__veRec.stop(); } catch (_) {} window.__veRec = null; toast('Captions stopped.', false); return; }
      var rec = new SR();
      rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
      var lines = [];
      rec.onresult = function (ev) {
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) lines.push(ev.results[i][0].transcript.trim());
        }
        var box = document.getElementById('ve-text');
        if (box) box.value = lines.join('\n');
        try { drawOverlay(); } catch (e) {}
      };
      rec.onerror = function (e) { toast('Captions error: ' + e.error, true); };
      rec.onend = function () { toast('Captions stopped. Edit text in subtitle panel.', false); window.__veRec = null; };
      try { video.play(); rec.start(); window.__veRec = rec; toast('Captioning… speak / play.', false); }
      catch (e) { toast('Captions failed: ' + (e && e.message || e), true); }
    }

    // Bottom action toolbar — REAL handlers (no stub toasts).
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-action]'), function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-action');
        if (act === 'split') {
          // Real bisect via the engine — same as the clip-context Split.
          var ok = engine.splitAtCursor();
          if (ok) {
            toast('Clip split at ' + engine.t.toFixed(2) + 's. Now ' + engine.clips.length + ' clips.', false);
            renderClipBlocks();
          } else {
            toast('Move the playhead away from the clip edge first.', true);
          }
        }
        else if (act === 'trim') {
          // Scroll the timeline into view + flash the trim handles so
          // the user sees what to drag. No more silent close.
          var stripEl = document.getElementById('ve-clip-strip');
          if (stripEl) stripEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          var handles = document.querySelectorAll('#__loadVideoEdit .trim-handle');
          handles.forEach(function (h) {
            h.style.transition = 'none';
            h.style.boxShadow = '0 0 18px 4px #ffcc1a';
            setTimeout(function () { h.style.transition = 'box-shadow 0.4s ease-out'; h.style.boxShadow = ''; }, 600);
          });
          toast('Drag the yellow handles on the clip to trim.', false);
        }
        else if (act === 'cutout') {
          // Real-ish cutout: cycle a high-contrast / threshold filter
          // that visually isolates the subject. Not ML-quality but
          // gives the user immediate visible feedback.
          var on = btn.classList.toggle('on');
          if (on) {
            video.style.filter = 'contrast(1.6) saturate(1.8) brightness(1.05)';
            toast('Cutout preview on (high-contrast). Re-tap to disable.', false);
          } else {
            video.style.filter = '';
            toast('Cutout preview off.', false);
          }
        }
        else if (act === 'volume')   showPanel('ve-music-panel');
        else if (act === 'mirror')   { fx.mirror = !fx.mirror; applyFx(); btn.classList.toggle('on', fx.mirror); toast('Mirror ' + (fx.mirror ? 'on' : 'off') + '.', false); }
        else if (act === 'flip')     { fx.flip = !fx.flip; applyFx(); btn.classList.toggle('on', fx.flip); toast('Flip ' + (fx.flip ? 'on' : 'off') + '.', false); }
        else if (act === 'rotate')   { fx.rotate = (fx.rotate + 90) % 360; applyFx(); btn.classList.toggle('on', fx.rotate !== 0); toast('Rotated to ' + fx.rotate + '°.', false); }
        else if (act === 'filter')   {
          // 21 filter presets in a grid sheet. Tap one and it applies
          // immediately + the sheet closes.
          var fopts = FILTER_KEYS.map(function (k) { return { key: k, label: FILTER_LABELS[k] || k, icon: k === 'none' ? '○' : '◐' }; });
          openToolSheet('Filter', fopts, fx.filter).then(function (k) {
            if (k == null) return;
            fx.filter = k; applyFx();
            btn.classList.toggle('on', fx.filter !== 'none');
            toast('Filter: ' + (FILTER_LABELS[k] || k), false);
          });
        }
        else if (act === 'blur')     {
          var blurOpts = [
            { key: '0',  label: 'Off',     icon: '○' },
            { key: '2',  label: '2 px',    icon: '◔' },
            { key: '5',  label: '5 px',    icon: '◑' },
            { key: '10', label: '10 px',   icon: '◕' },
            { key: '20', label: '20 px',   icon: '●' },
            { key: '40', label: '40 px',   icon: '⬤' },
            { key: '80', label: 'Heavy',   icon: '◉' }
          ];
          openToolSheet('Blur', blurOpts, String(fx.blur)).then(function (k) {
            if (k == null) return;
            fx.blur = parseInt(k, 10); applyFx();
            btn.classList.toggle('on', fx.blur > 0);
            toast('Blur: ' + fx.blur + 'px.', false);
          });
        }
        else if (act === 'fit')      {
          openToolSheet('Fit', [
            { key: 'contain', label: 'Contain', icon: '▭' },
            { key: 'cover',   label: 'Cover',   icon: '◼' },
            { key: 'fill',    label: 'Stretch', icon: '⬛' }
          ], fx.fit).then(function (k) {
            if (k == null) return;
            fx.fit = k; applyFx();
            btn.classList.toggle('on', fx.fit !== 'contain');
            toast('Fit: ' + fx.fit, false);
          });
        }
        else if (act === 'crop')     {
          openToolSheet('Crop / Aspect', [
            { key: '16:9',  label: '16:9',     icon: '▭' },
            { key: '9:16',  label: '9:16',     icon: '▯' },
            { key: '1:1',   label: '1:1',      icon: '◻' },
            { key: '4:5',   label: '4:5',      icon: '▭' },
            { key: '4:3',   label: '4:3',      icon: '▭' },
            { key: '21:9',  label: '21:9',     icon: '▬' },
            { key: 'fit',   label: 'Reset',    icon: '↺' }
          ], 'fit').then(function (k) {
            if (k == null) return;
            var ratio = document.getElementById('ve-ratio');
            if (ratio && k !== 'fit') {
              for (var i = 0; i < ratio.options.length; i++) {
                if (ratio.options[i].value === k) { ratio.selectedIndex = i; ratio.dispatchEvent(new Event('change')); break; }
              }
            }
            fx.fit = (k === 'fit') ? 'contain' : 'cover'; applyFx();
            btn.classList.toggle('on', k !== 'fit');
            toast('Crop: ' + k, false);
          });
        }
        else if (act === 'bg')       {
          openToolSheet('Background', [
            { key: '#000',     label: 'Black',  icon: '⬛' },
            { key: '#fff',     label: 'White',  icon: '⬜' },
            { key: '#1d6fff',  label: 'Blue',   icon: '🟦' },
            { key: '#fbbf24',  label: 'Yellow', icon: '🟨' },
            { key: '#dc2626',  label: 'Red',    icon: '🟥' },
            { key: '#10b981',  label: 'Green',  icon: '🟩' },
            { key: '#7c3aed',  label: 'Purple', icon: '🟪' },
            { key: '#f59e0b',  label: 'Orange', icon: '🟧' },
            { key: '#1f2937',  label: 'Slate',  icon: '⬛' },
            { key: '#fbf5e6',  label: 'Cream',  icon: '⬜' }
          ], fx.bgColor).then(function (k) {
            if (k == null) return;
            fx.bgColor = k; applyFx(); toast('BG: ' + k, false);
          });
        }
        else if (act === 'border')   {
          openToolSheet('Border', [
            { key: '0',  label: 'Off',    icon: '○' },
            { key: '2',  label: '2 px',   icon: '◔' },
            { key: '4',  label: '4 px',   icon: '◑' },
            { key: '8',  label: '8 px',   icon: '◕' },
            { key: '16', label: '16 px',  icon: '●' },
            { key: '24', label: '24 px',  icon: '⬤' }
          ], String(fx.borderPx)).then(function (k) {
            if (k == null) return;
            fx.borderPx = parseInt(k, 10); applyFx();
            btn.classList.toggle('on', fx.borderPx > 0);
            toast('Border: ' + fx.borderPx + 'px.', false);
          });
        }
        else if (act === 'zoom')     {
          openToolSheet('Zoom', [
            { key: '0.5',  label: '0.5×',  icon: '⊖' },
            { key: '0.75', label: '0.75×', icon: '⊖' },
            { key: '1',    label: '1×',    icon: '○' },
            { key: '1.25', label: '1.25×', icon: '⊕' },
            { key: '1.5',  label: '1.5×',  icon: '⊕' },
            { key: '2',    label: '2×',    icon: '⊕' },
            { key: '3',    label: '3×',    icon: '⊕' },
            { key: '4',    label: '4×',    icon: '⊕' }
          ], String(fx.scale)).then(function (k) {
            if (k == null) return;
            fx.scale = parseFloat(k); applyFx();
            btn.classList.toggle('on', fx.scale !== 1);
            toast('Zoom: ' + fx.scale + '×.', false);
          });
        }
        else if (act === 'fade')     {
          openToolSheet('Fade', [
            { key: 'in-0.5',  label: 'In 0.5s',  icon: '◔' },
            { key: 'in-1',    label: 'In 1s',    icon: '◑' },
            { key: 'in-2',    label: 'In 2s',    icon: '◕' },
            { key: 'out-0.5', label: 'Out 0.5s', icon: '◔' },
            { key: 'out-1',   label: 'Out 1s',   icon: '◑' },
            { key: 'out-2',   label: 'Out 2s',   icon: '◕' },
            { key: 'both-1',  label: 'In+Out 1s',icon: '⬗' },
            { key: 'off',     label: 'Off',      icon: '○' }
          ], 'off').then(function (k) {
            if (k == null) return;
            video.style.transition = (k === 'off') ? '' : 'opacity ' + (parseFloat(k.split('-')[1]) || 1) + 's ease-in-out';
            if (k.indexOf('out') === 0) { video.style.opacity = '0'; }
            else if (k.indexOf('in') === 0) { video.style.opacity = '1'; }
            else if (k.indexOf('both') === 0) { video.style.opacity = '1'; }
            else { video.style.opacity = '1'; video.style.transition = ''; }
            toast('Fade: ' + k, false);
          });
        }
        else if (act === 'fx')       {
          // Real FX presets sheet — 12 effects to pick from.
          openToolSheet('FX', [
            { key: 'none',    label: 'None',         icon: '○' },
            { key: 'zoom-in', label: 'Subtle zoom',  icon: '⊕' },
            { key: 'zoom-out',label: 'Zoom out',     icon: '⊖' },
            { key: 'shake',   label: 'Shake',        icon: '↔' },
            { key: 'pulse',   label: 'Pulse',        icon: '◉' },
            { key: 'tilt',    label: 'Tilt',         icon: '⤢' },
            { key: 'glitch',  label: 'Glitch',       icon: '⚡' },
            { key: 'vignette',label: 'Vignette',     icon: '◐' },
            { key: 'spin',    label: 'Spin',         icon: '↻' },
            { key: 'kenburns',label: 'Ken Burns',    icon: '⤧' },
            { key: 'flash',   label: 'Flash',        icon: '✦' },
            { key: 'wobble',  label: 'Wobble',       icon: '〰' }
          ], 'none').then(function (k) {
            if (k == null) return;
            // Reset the previous fx animation
            video.style.animation = '';
            video.style.boxShadow = '';
            fx.scale = 1; fx.rotate = 0; applyFx();
            // Inject a one-off keyframes block per effect.
            var styleId = 've-fx-keyframes';
            var existing = document.getElementById(styleId);
            if (existing) existing.remove();
            var s = document.createElement('style');
            s.id = styleId;
            var defs = {
              'zoom-in':  '@keyframes vefx-zin{0%{transform:scale(1)}100%{transform:scale(1.18)}}',
              'zoom-out': '@keyframes vefx-zout{0%{transform:scale(1.18)}100%{transform:scale(1)}}',
              'shake':    '@keyframes vefx-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}',
              'pulse':    '@keyframes vefx-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}',
              'tilt':     '@keyframes vefx-tilt{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}',
              'glitch':   '@keyframes vefx-glitch{0%,90%,100%{transform:translate(0)filter:hue-rotate(0)}93%{transform:translate(-2px,1px);filter:hue-rotate(40deg)}96%{transform:translate(2px,-1px);filter:hue-rotate(-40deg)}}',
              'spin':     '@keyframes vefx-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}',
              'kenburns': '@keyframes vefx-kb{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.2) translate(-4%,-3%)}}',
              'flash':    '@keyframes vefx-flash{0%,100%{filter:brightness(1)}50%{filter:brightness(1.6)}}',
              'wobble':   '@keyframes vefx-wob{0%,100%{transform:translateY(0)}25%{transform:translateY(-4px)rotate(-1deg)}75%{transform:translateY(4px)rotate(1deg)}}'
            };
            var anims = {
              'zoom-in':  'vefx-zin 1.2s ease-out forwards',
              'zoom-out': 'vefx-zout 1.2s ease-out forwards',
              'shake':    'vefx-shake 0.5s ease-in-out infinite',
              'pulse':    'vefx-pulse 1.4s ease-in-out infinite',
              'tilt':     'vefx-tilt 2s ease-in-out infinite',
              'glitch':   'vefx-glitch 2s linear infinite',
              'spin':     'vefx-spin 3s linear infinite',
              'kenburns': 'vefx-kb 6s ease-in-out infinite alternate',
              'flash':    'vefx-flash 0.6s ease-in-out infinite',
              'wobble':   'vefx-wob 1.2s ease-in-out infinite'
            };
            if (k === 'vignette') {
              video.style.boxShadow = 'inset 0 0 120px 40px rgba(0,0,0,0.7)';
            } else if (defs[k]) {
              s.textContent = defs[k];
              document.head.appendChild(s);
              video.style.animation = anims[k];
            }
            btn.classList.toggle('on', k !== 'none');
            toast('FX: ' + k, false);
          });
        }
        else if (act === 'cutout')   {
          openToolSheet('Cutout', [
            { key: 'off',       label: 'Off',           icon: '○' },
            { key: 'highc',     label: 'High contrast', icon: '◑' },
            { key: 'edges',     label: 'Edges only',    icon: '⊞' },
            { key: 'subject',   label: 'Subject pop',   icon: '◉' },
            { key: 'silhouette',label: 'Silhouette',    icon: '⬛' }
          ], 'off').then(function (k) {
            if (k == null) return;
            video.style.filter = '';
            applyFx();
            if (k === 'highc')      video.style.filter = 'contrast(1.6) saturate(1.8) brightness(1.05)';
            else if (k === 'edges') video.style.filter = 'contrast(2) brightness(1.1) grayscale(1) invert(1)';
            else if (k === 'subject') video.style.filter = 'contrast(1.4) saturate(2) brightness(0.95)';
            else if (k === 'silhouette') video.style.filter = 'contrast(2.5) brightness(0.7) grayscale(1)';
            btn.classList.toggle('on', k !== 'off');
            toast('Cutout: ' + k, false);
          });
        }
        else if (act === 'denoise')  {
          openToolSheet('Denoise', [
            { key: 'off',     label: 'Off',           icon: '○' },
            { key: 'light',   label: 'Light hiss',    icon: '◔' },
            { key: 'medium',  label: 'Medium room',   icon: '◑' },
            { key: 'heavy',   label: 'Heavy hum',     icon: '◕' },
            { key: 'voice',   label: 'Voice focus',   icon: '🎙' },
            { key: 'wind',    label: 'Wind cut',      icon: '〰' }
          ], window.__veDenoise ? 'medium' : 'off').then(function (k) {
            if (k == null) return;
            try {
              if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              if (window.__veDenoise) { try { window.__veDenoise.disconnect(); } catch (_) {} window.__veDenoise = null; }
              if (k === 'off') { btn.classList.remove('on'); toast('Denoise off.', false); return; }
              var bq = audioCtx.createBiquadFilter();
              if (k === 'light')       { bq.type = 'lowpass';  bq.frequency.value = 7000; }
              else if (k === 'medium') { bq.type = 'lowpass';  bq.frequency.value = 5000; }
              else if (k === 'heavy')  { bq.type = 'highpass'; bq.frequency.value = 200;  }
              else if (k === 'voice')  { bq.type = 'bandpass'; bq.frequency.value = 1500; bq.Q.value = 1.2; }
              else if (k === 'wind')   { bq.type = 'highpass'; bq.frequency.value = 80;   }
              window.__veDenoise = bq;
              btn.classList.add('on');
              toast('Denoise: ' + k, false);
            } catch (e) { toast('Denoise failed: ' + e.message, true); }
          });
        }
        else if (act === 'extract-audio') extractAudio();
        else if (act === 'auto-captions') autoCaptions();
        else if (act === 'mosaic')   {
          openToolSheet('Mosaic', [
            { key: 'off',     label: 'Off',         icon: '○' },
            { key: 'light',   label: 'Light',       icon: '◔' },
            { key: 'medium',  label: 'Medium',      icon: '◑' },
            { key: 'heavy',   label: 'Heavy',       icon: '●' },
            { key: 'extreme', label: 'Extreme',     icon: '⬤' },
            { key: 'face',    label: 'Face only',   icon: '☻' }
          ], 'off').then(function (k) {
            if (k == null) return;
            video.style.imageRendering = '';
            video.style.filter = '';
            applyFx();
            if (k === 'light')   video.style.filter = 'blur(3px)';
            else if (k === 'medium')  { video.style.filter = 'blur(6px) contrast(1.1)'; video.style.imageRendering = 'pixelated'; }
            else if (k === 'heavy')   { video.style.filter = 'blur(12px) contrast(1.2)'; video.style.imageRendering = 'pixelated'; }
            else if (k === 'extreme') { video.style.filter = 'blur(24px) contrast(1.3)'; video.style.imageRendering = 'pixelated'; }
            else if (k === 'face')    { video.style.filter = 'blur(8px)'; toast('Face-only blur needs ML; using full-frame for now.', false); }
            btn.classList.toggle('on', k !== 'off');
            if (k !== 'face') toast('Mosaic: ' + k, false);
          });
        }
        else if (act === 'magnifier'){
          openToolSheet('Magnifier', [
            { key: '1',    label: 'Off',    icon: '○' },
            { key: '1.25', label: '1.25×',  icon: '⊕' },
            { key: '1.5',  label: '1.5×',   icon: '⊕' },
            { key: '1.75', label: '1.75×',  icon: '⊕' },
            { key: '2',    label: '2×',     icon: '⊕' },
            { key: '2.5',  label: '2.5×',   icon: '⊕' },
            { key: '3',    label: '3×',     icon: '⊕' },
            { key: '4',    label: '4×',     icon: '⊕' }
          ], String(fx.scale)).then(function (k) {
            if (k == null) return;
            fx.scale = parseFloat(k); applyFx();
            btn.classList.toggle('on', fx.scale !== 1);
            toast('Magnifier: ' + fx.scale + '×.', false);
          });
        }
        else if (act === 'story')    {
          var beats = engine.clips.map(function (c, i) { return (i+1) + '. clip ' + (c.srcEnd - c.srcStart).toFixed(2) + 's'; }).join('\n');
          openToolSheet('Story beats', [
            { key: 'view',     label: 'View beats',     icon: '☰' },
            { key: 'add',      label: 'Add chapter',    icon: '＋' },
            { key: 'reorder',  label: 'Reorder',        icon: '⇅' },
            { key: 'export',   label: 'Export script',  icon: '⬇' }
          ], 'view').then(function (k) {
            if (k == null) return;
            if (k === 'view') alert('Story beats:\n\n' + (beats || '(no clips yet)'));
            else if (k === 'add') showPanel('ve-text-panel');
            else if (k === 'reorder') toast('Reorder: long-press a clip on the timeline to drag.', false);
            else if (k === 'export') {
              var blob = new Blob([beats || '(no clips yet)'], { type: 'text/plain' });
              var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'story-beats.txt';
              document.body.appendChild(a); a.click(); a.remove();
              toast('Story beats exported.', false);
            }
          });
        }
        else if (act === 'reverse')  {
          openToolSheet('Reverse', [
            { key: 'off',     label: 'Off',          icon: '○' },
            { key: 'slow',    label: '0.5× back',    icon: '◐' },
            { key: 'normal',  label: '1× back',      icon: '◑' },
            { key: 'fast',    label: '2× back',      icon: '◕' },
            { key: 'pingpong',label: 'Ping-pong',    icon: '↔' }
          ], reverseTimer ? 'normal' : 'off').then(function (k) {
            if (k == null) return;
            if (reverseTimer) { clearInterval(reverseTimer); reverseTimer = null; }
            if (k === 'off') { btn.classList.remove('on'); toast('Reverse off.', false); return; }
            try { video.pause(); } catch (_) {}
            var stepSec = (k === 'slow') ? 0.033 : (k === 'fast') ? 0.132 : 0.066;
            var dir = -1;
            reverseTimer = setInterval(function () {
              if (!video || video.readyState < 2) return;
              var t = video.currentTime + dir * stepSec;
              if (t <= 0) { if (k === 'pingpong') dir = +1; else { video.currentTime = video.duration || 0; return; } video.currentTime = 0; return; }
              if (t >= (video.duration || 0)) { if (k === 'pingpong') dir = -1; else { video.currentTime = 0; return; } }
              try { video.currentTime = t; } catch (_) {}
            }, 66);
            btn.classList.add('on');
            toast('Reverse: ' + k, false);
          });
        }
        else if (act === 'freeze')   {
          openToolSheet('Freeze frame', [
            { key: 'off',  label: 'Off',         icon: '○' },
            { key: '1',    label: 'Hold 1 s',    icon: '❄' },
            { key: '2',    label: 'Hold 2 s',    icon: '❄' },
            { key: '3',    label: 'Hold 3 s',    icon: '❄' },
            { key: '5',    label: 'Hold 5 s',    icon: '❄' },
            { key: 'inf',  label: 'Indefinite',  icon: '∞' }
          ], fx.frozen ? 'inf' : 'off').then(function (k) {
            if (k == null) return;
            if (k === 'off') {
              if (fx.frozen) toggleFreeze();
              btn.classList.remove('on');
              return;
            }
            if (!fx.frozen) toggleFreeze();
            btn.classList.add('on');
            if (k !== 'inf') {
              var secs = parseInt(k, 10);
              setTimeout(function () { if (fx.frozen) toggleFreeze(); btn.classList.remove('on'); }, secs * 1000);
              toast('Freeze for ' + secs + 's.', false);
            }
          });
        }
        else if (act === 'preset') {
          // Save / load named color+fx presets. Each preset captures
          // every fx field so loading it instantly recreates the look.
          app.fxPresets = app.fxPresets || [];
          var named = app.fxPresets.map(function (p, i) {
            return { key: 'load:' + i, label: p.name || ('Preset ' + (i + 1)), icon: '⭐' };
          });
          var menu = [
            { key: 'save',  label: 'Save current…',   icon: '💾' },
            { key: 'reset', label: 'Reset all FX',    icon: '↺' }
          ].concat(named).concat(named.length ? [{ key: 'manage', label: 'Delete a preset…', icon: '🗑' }] : []);
          openToolSheet('Color / FX presets (' + named.length + ' saved)', menu, 'save').then(function (k) {
            if (k == null) return;
            if (k === 'reset') {
              fx.mirror = false; fx.flip = false; fx.rotate = 0;
              fx.filter = 'none'; fx.blur = 0; fx.fit = 'contain';
              fx.bgColor = '#000'; fx.borderPx = 0; fx.scale = 1;
              applyFx();
              video.style.animation = ''; video.style.boxShadow = '';
              toast('FX reset to defaults.', false);
              return;
            }
            if (k === 'save') {
              var name = prompt('Name this preset:', 'My look ' + (named.length + 1));
              if (!name) return;
              var snap = { name: name, fx: JSON.parse(JSON.stringify(fx)), savedAt: Date.now() };
              app.fxPresets.push(snap);
              if (typeof putApp === 'function') Promise.resolve(putApp(app)).catch(function () {});
              toast('Preset saved: ' + name, false);
              return;
            }
            if (k === 'manage') {
              var idx = parseInt(prompt('Delete which? (1-' + named.length + ')'), 10);
              if (isFinite(idx) && idx >= 1 && idx <= named.length) {
                var removed = app.fxPresets.splice(idx - 1, 1)[0];
                if (typeof putApp === 'function') Promise.resolve(putApp(app)).catch(function () {});
                toast('Deleted: ' + (removed && removed.name || 'preset'), false);
              }
              return;
            }
            if (k.indexOf('load:') === 0) {
              var i2 = parseInt(k.split(':')[1], 10);
              var p = app.fxPresets[i2];
              if (!p) return;
              Object.assign(fx, p.fx || {});
              applyFx();
              toast('Loaded preset: ' + (p.name || ('Preset ' + (i2 + 1))), false);
            }
          });
        }
        else if (act === 'keyframe') {
          // Per-clip keyframe sheet. Picks a property + sets a kf at
          // the current playhead time using the property's CURRENT
          // value. Repeating with a different value at a different
          // time creates an interpolated animation between them.
          var clip = engine.clips[selectedClipIdx] || engine.clips[0];
          if (!clip) { toast('Pick a clip first.', true); return; }
          clip.keyframes = clip.keyframes || { opacity: [], scale: [], rotate: [], translateX: [], translateY: [] };
          var t = engine.t || 0;
          var summary = Object.keys(clip.keyframes).map(function (k) {
            return k + ': ' + clip.keyframes[k].length;
          }).join(' · ');
          openToolSheet('Keyframe @ ' + t.toFixed(2) + 's  (' + summary + ')', [
            { key: 'opacity',     label: 'Set Opacity',    icon: '◑' },
            { key: 'scale',       label: 'Set Scale',      icon: '⊕' },
            { key: 'rotate',      label: 'Set Rotate',     icon: '↻' },
            { key: 'translateX',  label: 'Set Pan X',      icon: '↔' },
            { key: 'translateY',  label: 'Set Pan Y',      icon: '↕' },
            { key: 'list',        label: 'List + delete',  icon: '☰' },
            { key: 'clear',       label: 'Clear all',      icon: '✕' }
          ], 'opacity').then(function (k) {
            if (k == null) return;
            if (k === 'clear') {
              clip.keyframes = { opacity: [], scale: [], rotate: [], translateX: [], translateY: [] };
              toast('Keyframes cleared.', false);
              applyKeyframes(clip, t);
              return;
            }
            if (k === 'list') {
              var lines = [];
              Object.keys(clip.keyframes).forEach(function (prop) {
                clip.keyframes[prop].forEach(function (kf) {
                  lines.push(prop + ' @ ' + kf.t.toFixed(2) + 's = ' + kf.v);
                });
              });
              alert(lines.length ? lines.join('\n') : '(no keyframes yet)');
              return;
            }
            // Read CURRENT value from the active fx state for the prop.
            var current = (k === 'opacity') ? (typeof clipOpacity !== 'undefined' ? clipOpacity : 1)
                       : (k === 'scale')   ? fx.scale
                       : (k === 'rotate')  ? fx.rotate
                       : 0;
            var arr = clip.keyframes[k];
            // Replace any existing kf at the same t (within 0.05s), else append.
            var existed = arr.findIndex(function (kf) { return Math.abs(kf.t - t) < 0.05; });
            if (existed >= 0) arr[existed].v = current;
            else arr.push({ t: t, v: current });
            arr.sort(function (a, b) { return a.t - b.t; });
            toast('Keyframe set: ' + k + ' = ' + (typeof current === 'number' ? current.toFixed(2) : current) + ' @ ' + t.toFixed(2) + 's', false);
          });
        }
        else if (act === 'pip-track') {
          openToolSheet('PiP overlay', [
            { key: 'native',     label: 'Native PiP',  icon: '⊞' },
            { key: 'tl',         label: 'Top-left',    icon: '◰' },
            { key: 'tr',         label: 'Top-right',   icon: '◱' },
            { key: 'bl',         label: 'Bot-left',    icon: '◳' },
            { key: 'br',         label: 'Bot-right',   icon: '◲' },
            { key: 'center',     label: 'Centered',    icon: '◫' },
            { key: 'add-image',  label: 'Add image',   icon: '🖼' },
            { key: 'add-video',  label: 'Add video',   icon: '🎬' },
            { key: 'remove',     label: 'Remove all',  icon: '✕' }
          ], 'native').then(function (k) {
            if (k == null) return;
            if (k === 'native') {
              if (video.requestPictureInPicture) {
                video.requestPictureInPicture().then(function () { toast('Native PiP on.', false); })
                  .catch(function (e) { toast('PiP not supported: ' + e.message, true); });
              } else toast('Native PiP not supported on this device.', true);
              return;
            }
            if (k === 'remove') {
              wrap.querySelectorAll('.ve-pip-overlay').forEach(function (n) { n.remove(); });
              toast('Overlays removed.', false);
              return;
            }
            if (k === 'add-image' || k === 'add-video') {
              var pk = document.createElement('input');
              pk.type = 'file';
              pk.accept = (k === 'add-image') ? 'image/*' : 'video/*';
              pk.style.display = 'none'; document.body.appendChild(pk);
              pk.addEventListener('change', function (ev) {
                var f = ev.target.files && ev.target.files[0];
                pk.remove();
                if (!f) return;
                var fr = new FileReader();
                fr.onload = function () {
                  var stage = document.getElementById('ve-stage');
                  if (!stage) return;
                  var el;
                  if (k === 'add-image') { el = document.createElement('img'); el.src = fr.result; }
                  else { el = document.createElement('video'); el.src = fr.result; el.autoplay = true; el.loop = true; el.muted = true; el.playsInline = true; }
                  el.className = 've-pip-overlay';
                  el.style.cssText = 'position:absolute;top:20px;right:20px;width:30%;max-height:30%;border:2px solid #fbbf24;border-radius:6px;z-index:5;cursor:move;';
                  stage.appendChild(el);
                  toast('PiP added. Drag on the preview.', false);
                };
                fr.readAsDataURL(f);
              });
              pk.click();
              return;
            }
            // Position presets — affect any existing overlays
            wrap.querySelectorAll('.ve-pip-overlay').forEach(function (el) {
              el.style.top = el.style.right = el.style.left = el.style.bottom = el.style.transform = '';
              if (k === 'tl') { el.style.top = '20px'; el.style.left = '20px'; }
              else if (k === 'tr') { el.style.top = '20px'; el.style.right = '20px'; }
              else if (k === 'bl') { el.style.bottom = '20px'; el.style.left = '20px'; }
              else if (k === 'br') { el.style.bottom = '20px'; el.style.right = '20px'; }
              else if (k === 'center') { el.style.top = '50%'; el.style.left = '50%'; el.style.transform = 'translate(-50%,-50%)'; }
            });
            toast('PiP position: ' + k, false);
          });
        }
        else if (act === 'speed')    {
          openToolSheet('Speed', [
            { key: '0.25', label: '0.25×', icon: '⏪' },
            { key: '0.5',  label: '0.5×',  icon: '⏪' },
            { key: '0.75', label: '0.75×', icon: '⏪' },
            { key: '1',    label: '1× normal', icon: '▶' },
            { key: '1.25', label: '1.25×', icon: '⏩' },
            { key: '1.5',  label: '1.5×',  icon: '⏩' },
            { key: '2',    label: '2×',    icon: '⏩' },
            { key: '3',    label: '3×',    icon: '⏩' },
            { key: '4',    label: '4×',    icon: '⏩' },
            { key: 'panel',label: 'Slider…', icon: '⫾' }
          ], String(video.playbackRate || 1)).then(function (k) {
            if (k == null) return;
            if (k === 'panel') { showPanel('ve-speed-panel'); return; }
            try { video.playbackRate = parseFloat(k); } catch (_) {}
            var speedVal = document.getElementById('ve-speed-val');
            if (speedVal) speedVal.textContent = k + 'x';
            toast('Speed: ' + k + '×', false);
          });
        }
        else if (act === 'opacity')  showPanel('ve-opacity-panel');
        else if (act === 'stock-media') { openStockMediaSheet(); }
        else if (act === 'tts') {
          var t = (document.getElementById('ve-text') && document.getElementById('ve-text').value || '').trim();
          if (!t) { toast('Add subtitle text first, then TTS will read it.', true); showPanel('ve-text-panel'); return; }
          if (window.speechSynthesis) { var u = new SpeechSynthesisUtterance(t); speechSynthesis.cancel(); speechSynthesis.speak(u); }
        }
        else toast(act.charAt(0).toUpperCase() + act.slice(1) + ' tool: not yet implemented.', false);
      });
    });

    // Engine-driven playhead. The engine.onTick callback fires
    // EVERY rAF during playback (60fps) and on every setTime() call,
    // so the playhead UI tracks t precisely instead of waiting for
    // the <video>'s 4fps timeupdate event.
    function updatePlayheadFromEngine(t) {
      var d = engine.duration() || 1;
      var leftPx = t * PX_PER_SECOND;
      if (playhead) playhead.style.left = leftPx + 'px';
      if (timeLbl) timeLbl.textContent = fmtTime(t) + ' / ' + fmtTime(d);
      // Apply keyframe-driven fx for the active clip at this time.
      try {
        var r = engine.resolve(t);
        if (r && r.clip) applyKeyframes(r.clip, t - (r.clipStart || 0));
      } catch (_) {}
    }
    var __vePendingOnTick = updatePlayheadFromEngine;
    // Re-render the clip strip whenever the engine's clips array
    // mutates (Split / Duplicate / Delete).
    var __vePendingClipsChanged = function () { renderClipBlocks(); };

    /* Render N visible clip blocks across the strip — one per entry
       in engine.clips. Each block sits at a percentage of the total
       timeline duration and shows a yellow border + duration label.
       The frame thumbnails sit underneath in .ve-clip-thumbs and
       are continuous (single source MVP) — the borders just show
       which range of source video belongs to which clip. */
    /* Per-clip self-contained blocks, matching the user's VN
       TimelineClipStrip spec. Each block contains:
         - Its own thumbnail row (sliced from the engine-wide thumbs)
         - A duration label in bottom-left
         - Left + right trim handles
         - Edge-attached small white + buttons (add clip before / after)
       Plus, at the right of the strip, dark "empty slot" placeholders
       fill the remaining width so the timeline reads as a continuation
       surface, not blank space. */
    var SLOT_PX = 80; // each empty slot is 80px wide in the spec
    var PX_PER_SECOND = 90; // base pixel scale for clip widths
    var SLOT_PCT = 0; // safety fallback so trim/ruler never crash from an undefined legacy constant

    // ===== Multi-track parallel timelines =====
    // Each track holds an array of items. Each item:
    //   { id, t0, dur, payload }  where payload is kind-specific
    //   - music   : { url, name, buffer? }
    //   - text    : { text }
    //   - sticker : { src, kind: 'image' | 'video' }
    // NB: actual seeding of engine.tracks happens AFTER `var engine = {}`
    // is initialised (see ensureTracks() at the end of this block) — we
    // can't touch it here because `var` hoisting leaves engine = undefined
    // at this position in the code.
    var __nextTrackId = 1;
    function ensureTracks() {
      if (typeof engine === 'undefined' || !engine) return;
      engine.tracks = engine.tracks || { music: [], text: [], sticker: [] };
    }
    function addTrackItem(kind, item) {
      var t0 = (engine.t || 0);
      var dur = item.dur || 3;
      ensureTracks();
      // Avoid overlap with existing items in the same track — push start
      // forward to the end of the latest overlapping item.
      (engine.tracks[kind] || []).forEach(function (it) {
        if (t0 < it.t0 + it.dur && t0 + dur > it.t0) t0 = it.t0 + it.dur;
      });
      var newItem = Object.assign({ id: kind + '-' + (__nextTrackId++), t0: t0, dur: dur }, item);
      engine.tracks[kind] = engine.tracks[kind] || [];
      engine.tracks[kind].push(newItem);
      renderTracks();
      return newItem;
    }
    function removeTrackItem(kind, id) {
      ensureTracks();
      engine.tracks[kind] = (engine.tracks[kind] || []).filter(function (it) { return it.id !== id; });
      renderTracks();
    }
    function renderTracks() {
      ensureTracks();
      if (!engine || !engine.tracks) return;
      ['music', 'text', 'sticker'].forEach(function (kind) {
        var row = wrap.querySelector('.ve-track-row[data-track="' + kind + '"]');
        if (!row) return;
        // Wipe blocks (preserve the empty placeholder)
        Array.prototype.forEach.call(row.querySelectorAll('.ve-track-block'), function (b) { b.remove(); });
        var items = engine.tracks[kind] || [];
        var empty = row.querySelector('.ve-track-empty');
        if (empty) empty.style.display = items.length ? 'none' : '';
        items.forEach(function (it) {
          var el = document.createElement('div');
          el.className = 've-track-block';
          el.dataset.trackKind = kind;
          el.dataset.itemId = it.id;
          el.style.left = (it.t0 * PX_PER_SECOND) + 'px';
          el.style.width = Math.max(40, it.dur * PX_PER_SECOND) + 'px';
          var label = (kind === 'text') ? (it.text || 'Text') : (kind === 'music') ? (it.name || 'Music') : 'Sticker';
          el.innerHTML =
            '<div class="ve-tb-trim l" data-edge="l"></div>' +
            '<span class="ve-tb-lbl">' + label.replace(/[<>&]/g, '') + '</span>' +
            '<div class="ve-tb-trim r" data-edge="r"></div>' +
            '<button class="ve-tb-x" aria-label="Remove">×</button>';
          row.appendChild(el);
          // Drag-to-reposition with link-aware coupling.
          var dragStartX = 0, origT0 = 0, origAcrossT0s = {};
          el.addEventListener('pointerdown', function (e) {
            if (e.target.classList.contains('ve-tb-trim')) return; // trim handler below
            if (e.target.classList.contains('ve-tb-x')) return;
            e.preventDefault(); e.stopPropagation();
            el.setPointerCapture(e.pointerId);
            el.classList.add('dragging');
            dragStartX = e.clientX;
            origT0 = it.t0;
            origAcrossT0s = {};
            if (window.__veLinked) {
              ['music','text','sticker'].forEach(function (kk) {
                origAcrossT0s[kk] = (engine.tracks[kk] || []).map(function (x) { return { id: x.id, t0: x.t0 }; });
              });
            }
            function move(ev) {
              var dx = (ev.clientX || (ev.touches && ev.touches[0] && ev.touches[0].clientX) || dragStartX) - dragStartX;
              var dt = dx / PX_PER_SECOND;
              if (window.__veLinked) {
                ['music','text','sticker'].forEach(function (kk) {
                  (engine.tracks[kk] || []).forEach(function (x, ix) {
                    var snap = origAcrossT0s[kk][ix];
                    if (snap) x.t0 = Math.max(0, snap.t0 + dt);
                  });
                });
              } else {
                it.t0 = Math.max(0, origT0 + dt);
              }
              renderTracks();
            }
            function up() {
              document.removeEventListener('pointermove', move);
              document.removeEventListener('pointerup', up);
              document.removeEventListener('pointercancel', up);
              el.classList.remove('dragging');
            }
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', up);
            document.addEventListener('pointercancel', up);
          });
          // Trim left / right
          Array.prototype.forEach.call(el.querySelectorAll('.ve-tb-trim'), function (h) {
            h.addEventListener('pointerdown', function (e) {
              e.preventDefault(); e.stopPropagation();
              var origDur = it.dur, origT0_ = it.t0, startX = e.clientX, edge = h.dataset.edge;
              function move(ev) {
                var dx = ((ev.clientX || (ev.touches && ev.touches[0] && ev.touches[0].clientX) || startX) - startX) / PX_PER_SECOND;
                if (edge === 'l') {
                  var nt0 = Math.max(0, origT0_ + dx);
                  var nd  = Math.max(0.2, origDur - (nt0 - origT0_));
                  it.t0 = nt0; it.dur = nd;
                } else {
                  it.dur = Math.max(0.2, origDur + dx);
                }
                renderTracks();
              }
              function up() {
                document.removeEventListener('pointermove', move);
                document.removeEventListener('pointerup', up);
              }
              document.addEventListener('pointermove', move);
              document.addEventListener('pointerup', up);
            });
          });
          // Remove ×
          el.querySelector('.ve-tb-x').addEventListener('click', function (e) {
            e.stopPropagation();
            removeTrackItem(kind, it.id);
            toast('Removed.', false);
          });
        });
      });
    }

    function renderClipBlocks() {
      var stripEl = document.getElementById('ve-clip-strip'); // .video-track
      if (!stripEl) return;
      // Clear all clip + slot + big-add children (keep nothing inside)
      stripEl.innerHTML = '';
      // No bail on zero duration — we render the clip immediately
      // even when the engine is seeded with a placeholder clip whose
      // srcEnd is the fallback 5s. The user's directive: timeline
      // must show a clip RIGHT AWAY, not after async loads.
      engine.clips.forEach(function (c, i) {
        var dur = c.srcEnd - c.srcStart;
        var widthPx = Math.max(60, dur * PX_PER_SECOND);
        var clip = document.createElement('div');
        clip.className = 'timeline-clip' + (selectedClipIdx === i ? ' selected' : '');
        clip.id = 've-clip-' + i;
        clip.dataset.clipIdx = i;
        clip.style.width = widthPx + 'px';
        clip.innerHTML =
          '<button class="clip-add left" data-clip-idx="' + i + '" data-edge="before" aria-label="Add clip before">+</button>' +
          '<button class="clip-x" data-clip-idx="' + i + '" aria-label="Delete frame ' + (i + 1) + '" title="Delete frame">&times;</button>' +
          '<div class="thumbnail-strip" data-clip-idx="' + i + '"></div>' +
          '<span class="clip-duration">' + dur.toFixed(2) + 's</span>' +
          '<div class="trim-handle trim-left ve-block-handle ve-block-handle-l" data-clip-idx="' + i + '" data-side="left"></div>' +
          '<div class="trim-handle trim-right ve-block-handle ve-block-handle-r" data-clip-idx="' + i + '" data-side="right"></div>' +
          '<button class="clip-add right" data-clip-idx="' + i + '" data-edge="after" aria-label="Add clip after">+</button>';
        stripEl.appendChild(clip);
        try { populateBlockThumbs(clip.querySelector('.thumbnail-strip'), c); } catch (e) {}
        // Long-press on the thumb strip → poster sheet (custom thumb).
        (function (idx) {
          var strip = clip.querySelector('.thumbnail-strip');
          if (!strip) return;
          var lpTimer = null;
          strip.addEventListener('pointerdown', function (e) {
            if (e.target.closest('.trim-handle') || e.target.closest('.clip-add') || e.target.closest('.clip-x')) return;
            clearTimeout(lpTimer);
            lpTimer = setTimeout(function () {
              try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}
              openPosterSheetFor(idx);
            }, 600);
          });
          strip.addEventListener('pointerup',     function () { clearTimeout(lpTimer); });
          strip.addEventListener('pointerleave',  function () { clearTimeout(lpTimer); });
          strip.addEventListener('pointercancel', function () { clearTimeout(lpTimer); });
        })(i);
      });
      // 3 empty-slot placeholders after the last clip + a big-add tail
      for (var s = 0; s < 3; s++) {
        var slot = document.createElement('div');
        slot.className = 'empty-slot';
        slot.textContent = '';
        slot.addEventListener('click', function () {
          if (engine.clips.length) engine.duplicateAt(engine.clips.length - 1);
        });
        stripEl.appendChild(slot);
      }
      var bigAdd = document.createElement('button');
      bigAdd.className = 'big-add';
      bigAdd.textContent = '+';
      bigAdd.setAttribute('aria-label', 'Add clip at end');
      bigAdd.addEventListener('click', function () {
        if (engine.clips.length) engine.duplicateAt(engine.clips.length - 1);
      });
      stripEl.appendChild(bigAdd);

      // Paint per-clip mini waveform inside each block (only when the
      // source audio is already decoded — first call no-ops silently).
      try { renderPerClipWaveforms(); } catch (_) {}

      // Sync waveform-track width to match the sum of clip widths so
      // the amplitude bars align under the clips they came from.
      var totalClipPx = 0;
      engine.clips.forEach(function (c) {
        totalClipPx += Math.max(60, (c.srcEnd - c.srcStart) * PX_PER_SECOND);
      });
      var wfEl = document.getElementById('ve-waveform');
      if (wfEl && totalClipPx > 0) {
        wfEl.style.width = totalClipPx + 'px';
        wfEl.style.flex = '0 0 auto';
      }
      // Same for the time ruler so its tick positions line up with
      // clip boundaries above and waveform below.
      var rulerEl = document.getElementById('ve-time-ruler');
      if (rulerEl && totalClipPx > 0) {
        rulerEl.style.width = totalClipPx + 'px';
        rulerEl.style.flex = '0 0 auto';
      }

      // Wire per-clip click → select. Long-press (>=400ms) starts a
      // drag-to-reorder gesture: a ghost outline follows the pointer
      // and the engine.moveClip call commits the new index on release.
      Array.prototype.forEach.call(stripEl.querySelectorAll('.timeline-clip'), function (b) {
        var pressTimer = null;
        var dragging = false;
        var dragGhost = null;
        var startX = 0;
        var fromIdx = 0;
        b.addEventListener('click', function (e) {
          if (dragging) { dragging = false; return; }
          if (e.target.closest('.trim-handle') || e.target.closest('.clip-add') || e.target.closest('.clip-x')) return;
          e.stopPropagation();
          selectedClipIdx = +b.dataset.clipIdx;
          selectClip();
          renderClipBlocks();
        });
        b.addEventListener('pointerdown', function (e) {
          if (e.target.closest('.trim-handle') || e.target.closest('.clip-add') || e.target.closest('.clip-x')) return;
          startX = e.clientX;
          fromIdx = +b.dataset.clipIdx;
          clearTimeout(pressTimer);
          pressTimer = setTimeout(function () {
            // Start drag-to-reorder.
            dragging = true;
            try { b.setPointerCapture(e.pointerId); } catch (_) {}
            b.classList.add('dragging');
            b.style.opacity = '0.6';
            b.style.transform = 'scale(1.04)';
            b.style.zIndex = '20';
            try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}
            toast('Drag to reorder. Release to drop.', false);
            function move(ev) {
              if (!dragging) return;
              var dx = (ev.clientX || (ev.touches && ev.touches[0] && ev.touches[0].clientX) || startX) - startX;
              b.style.transform = 'scale(1.04) translateX(' + dx + 'px)';
              // Compute target index by which sibling clip's centre we're over.
              var bRect = b.getBoundingClientRect();
              var midX = bRect.left + bRect.width / 2;
              var siblings = Array.prototype.slice.call(stripEl.querySelectorAll('.timeline-clip'));
              var target = fromIdx;
              for (var i = 0; i < siblings.length; i++) {
                var s = siblings[i];
                if (s === b) continue;
                var r = s.getBoundingClientRect();
                if (midX > r.left && midX < r.right) {
                  target = +s.dataset.clipIdx;
                  break;
                }
              }
              b.dataset._dropTarget = String(target);
            }
            function up() {
              document.removeEventListener('pointermove', move);
              document.removeEventListener('pointerup', up);
              document.removeEventListener('pointercancel', up);
              if (!dragging) return;
              var to = +(b.dataset._dropTarget || fromIdx);
              b.classList.remove('dragging');
              b.style.opacity = '';
              b.style.transform = '';
              b.style.zIndex = '';
              if (to !== fromIdx) {
                engine.moveClip(fromIdx, to);
                toast('Reordered: clip ' + (fromIdx + 1) + ' → position ' + (to + 1) + '.', false);
              }
              setTimeout(function () { dragging = false; }, 50);
            }
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', up);
            document.addEventListener('pointercancel', up);
          }, 400);
        });
        b.addEventListener('pointerup', function () { clearTimeout(pressTimer); });
        b.addEventListener('pointermove', function (e) {
          // Cancel long-press if user starts horizontal scrubbing.
          if (Math.abs(e.clientX - startX) > 6) clearTimeout(pressTimer);
        });
        b.addEventListener('pointercancel', function () { clearTimeout(pressTimer); });
      });
      // Wire edge + buttons
      Array.prototype.forEach.call(stripEl.querySelectorAll('.clip-add'), function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var idx = +btn.dataset.clipIdx;
          var edge = btn.dataset.edge;
          if (edge === 'before' && idx > 0) engine.duplicateAt(idx - 1);
          else engine.duplicateAt(idx);
          toast('Clip added. Now ' + engine.clips.length + ' clips.', false);
        });
      });
      // Per-frame × delete button (always visible on each clip block).
      Array.prototype.forEach.call(stripEl.querySelectorAll('.clip-x'), function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          e.preventDefault();
          var idx = +btn.dataset.clipIdx;
          var n = engine.clips.length;
          var c = engine.clips[idx];
          var dur = c ? (c.srcEnd - c.srcStart).toFixed(2) : '';
          if (n <= 1) {
            if (!confirm('Delete this clip? The editor will close.')) return;
            var existing = document.getElementById('__loadVideoEdit');
            if (existing) existing.remove();
            return;
          }
          if (!confirm('Delete frame ' + (idx + 1) + ' of ' + n + ' (' + dur + 's)?')) return;
          engine.removeAt(idx);
          selectedClipIdx = Math.min(idx, engine.clips.length - 1);
          renderClipBlocks();
          toast('Deleted frame ' + (idx + 1) + '. Now ' + engine.clips.length + ' clip' + (engine.clips.length === 1 ? '' : 's') + '.', false);
        });
      });
      // Per-block trim drag. Captures the original clip + timeline
       // state at pointerdown time so the math doesn't drift as
       // clip.srcStart/srcEnd mutate during the drag.
      Array.prototype.forEach.call(stripEl.querySelectorAll('.ve-block-handle'), function (h) {
        h.addEventListener('pointerdown', function (e) {
          e.preventDefault(); e.stopPropagation();
          var idx = +h.dataset.clipIdx;
          var side = h.dataset.side;
          var clip = engine.clips[idx];
          if (!clip) return;
          // SNAPSHOT at drag start — never recompute from current
          // (mutating) clip values mid-drag.
          var origSrcStart = clip.srcStart;
          var origSrcEnd = clip.srcEnd;
          var origDur = engine.duration();
          var origEmpty = 3 * (SLOT_PCT / 100) * origDur;
          var stripVisualUnits = origDur + origEmpty;
          var origAcc = 0;
          for (var k = 0; k < idx; k++) {
            origAcc += engine.clips[k].srcEnd - engine.clips[k].srcStart;
          }
          var clipTimelineEnd = origAcc + (origSrcEnd - origSrcStart);
          var srcMax = video.duration || origDur;
          var minGap = 0.1;
          var stripRect = stripEl.getBoundingClientRect();
          function move(ev) {
            var x = (ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX) - stripRect.left;
            var pct = Math.max(0, Math.min(1, x / stripRect.width));
            var visualT = pct * stripVisualUnits; // timeline seconds
            // Clamp into this clip's original timeline range.
            visualT = Math.max(origAcc, Math.min(clipTimelineEnd, visualT));
            var withinClip = visualT - origAcc; // 0..origDur of this clip
            // Map back to source time, anchored to the ORIGINAL
            // srcStart so successive moves don't accelerate.
            var srcAtCursor = origSrcStart + withinClip;
            if (side === 'left') {
              srcAtCursor = Math.max(0, Math.min(origSrcEnd - minGap, srcAtCursor));
              clip.srcStart = srcAtCursor;
            } else {
              srcAtCursor = Math.max(origSrcStart + minGap, Math.min(srcMax, srcAtCursor));
              clip.srcEnd = srcAtCursor;
            }
            renderClipBlocks();
            try { renderRuler(); } catch (e2) {}
            if (engine.t > engine.duration()) engine.setTime(engine.duration());
          }
          function end() {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', end);
            document.removeEventListener('pointercancel', end);
          }
          document.addEventListener('pointermove', move);
          document.addEventListener('pointerup', end);
          document.addEventListener('pointercancel', end);
        });
      });
    }
    var selectedClipIdx = 0;

    /* Slice the underlying continuous thumbnail strip down to the
       portion that represents this clip's srcStart..srcEnd window
       in the source video. We clone the relevant <img> elements
       from #ve-clip-thumbs (engine-level) into the block's own row.
       If thumbs aren't generated yet, the row is empty and the
       border + colour show through. */
    function populateBlockThumbs(container, clip) {
      if (!container) return;
      container.innerHTML = '';
      // Custom poster — when set, render it tiled across the strip so
      // the clip reads as a single "poster" instead of frame samples.
      if (clip.poster) {
        var poster = document.createElement('img');
        poster.src = clip.poster;
        poster.alt = '';
        poster.style.cssText = 'flex:1 1 auto;width:100%;height:100%;object-fit:cover;object-position:center;display:block;';
        container.appendChild(poster);
        return;
      }
      var srcThumbs = document.querySelectorAll('#ve-clip-thumbs img');
      if (!srcThumbs.length || !video.duration) return;
      var first = (clip.srcStart / video.duration) * srcThumbs.length;
      var last  = (clip.srcEnd   / video.duration) * srcThumbs.length;
      var startIdx = Math.max(0, Math.floor(first));
      var endIdx = Math.min(srcThumbs.length, Math.ceil(last));
      if (endIdx <= startIdx) endIdx = startIdx + 1;
      for (var k = startIdx; k < endIdx; k++) {
        var img = srcThumbs[k] && srcThumbs[k].cloneNode(true);
        if (img) container.appendChild(img);
      }
    }

    // Long-press on a clip's thumbnail strip opens a poster sheet
    // (Use current frame / Pick image / Reset to auto frames).
    function openPosterSheetFor(clipIdx) {
      var clip = engine.clips[clipIdx];
      if (!clip) return;
      openToolSheet('Clip thumbnail (' + (clipIdx + 1) + '/' + engine.clips.length + ')', [
        { key: 'frame',  label: 'Use current frame', icon: '🖼' },
        { key: 'pick',   label: 'Pick image…',       icon: '📁' },
        { key: 'reset',  label: 'Reset (auto)',      icon: '↺' }
      ], clip.poster ? 'pick' : 'frame').then(function (k) {
        if (k == null) return;
        if (k === 'reset') {
          clip.poster = null;
          renderClipBlocks();
          toast('Thumbnail reset to auto frames.', false);
          return;
        }
        if (k === 'frame') {
          try {
            var c = document.createElement('canvas');
            c.width = video.videoWidth || 1280;
            c.height = video.videoHeight || 720;
            c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
            clip.poster = c.toDataURL('image/jpeg', 0.88);
            renderClipBlocks();
            toast('Thumbnail set from current frame.', false);
          } catch (e) { toast('Could not capture frame: ' + (e && e.message || e), true); }
          return;
        }
        if (k === 'pick') {
          var pk = document.createElement('input');
          pk.type = 'file'; pk.accept = 'image/*'; pk.style.display = 'none';
          document.body.appendChild(pk);
          pk.addEventListener('change', function (ev) {
            var f = ev.target.files && ev.target.files[0];
            pk.remove();
            if (!f) return;
            var fr = new FileReader();
            fr.onload = function () {
              clip.poster = fr.result;
              renderClipBlocks();
              toast('Custom thumbnail set.', false);
            };
            fr.readAsDataURL(f);
          });
          pk.click();
        }
      });
    }
    // Re-skin every block's thumbs once the engine-level thumb
    // generator finishes its second pass (real per-frame seeks).
    var _origGen = generateClipThumbnails;
    generateClipThumbnails = function (vid, count) {
      return _origGen(vid, count).then(function () {
        // Refresh per-block thumbs after the engine's master thumbs
        // are populated.
        try {
          var blocks = document.querySelectorAll('.timeline-clip');
          blocks.forEach(function (b) {
            var idx = +b.dataset.clipIdx;
            populateBlockThumbs(b.querySelector('.thumbnail-strip'), engine.clips[idx]);
          });
        } catch (e) {}
      });
    };

    /* Engine-driven keyboard play/pause for laptop testing. */
    document.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === ' ' && document.getElementById('__loadVideoEdit')) {
        e.preventDefault();
        engine.toggle();
      }
    });

    // Time ruler labels (5 evenly-spaced ticks)
    /* Time ruler — VN-style. One tick per integer second across the
       entire timeline (clips + empty slots), labels on each second.
       Width math matches renderClipBlocks() so the ruler aligns
       with clip boundaries below the strip + waveform. */
    function renderRuler() {
      var ruler = document.getElementById('ve-time-ruler');
      if (!ruler) return;
      ruler.innerHTML = '';
      var total = engine.duration() || video.duration || 0;
      if (!total) return;
      var emptySlots = 3;
      var stripVisualUnits = total + (emptySlots * (SLOT_PCT / 100) * total);
      var maxLabelSec = Math.ceil(stripVisualUnits);
      for (var i = 0; i <= maxLabelSec; i++) {
        var pct = (i / stripVisualUnits) * 100;
        if (pct > 100) break;
        var tick = document.createElement('span');
        tick.className = 'tick major';
        tick.style.left = pct.toFixed(2) + '%';
        ruler.appendChild(tick);
        var label = document.createElement('span');
        label.className = 'tick-label';
        label.style.left = pct.toFixed(2) + '%';
        label.textContent = i + 's';
        ruler.appendChild(label);
        // Half-second minor ticks between labels
        if (i < maxLabelSec) {
          var midPct = ((i + 0.5) / stripVisualUnits) * 100;
          if (midPct < 100) {
            var minor = document.createElement('span');
            minor.className = 'tick';
            minor.style.left = midPct.toFixed(2) + '%';
            ruler.appendChild(minor);
          }
        }
      }
    }
    // Re-render the ruler whenever clips change (split / duplicate).
    // Do not attach this until engine exists. The final binding happens
    // immediately after the engine object is created below.
    var __vePendingClipsChangedWithRuler = function () {
      try { renderClipBlocks(); } catch (e) { console.error('[VE] renderClipBlocks failed', e); }
      try { renderRuler(); } catch (e) { console.error('[VE] renderRuler failed', e); }
    };

    // Initialize trim handles after video metadata is ready
    var earlyHandler = function () {
      clipTrim.dataset.lpct = '0';
      clipTrim.dataset.rpct = '100';
      syncTrimFromHandles();
      renderRuler();
    };
    // Attach earlyHandler after video is bound.

    // Expose backwards-compat IDs the existing handlers below expect.
    // The hidden inputs (#ve-trim-in / #ve-trim-out) plus the handle
    // sync above keep the export pipeline working unchanged.

    var video = document.getElementById('ve-video');
    var canvas = document.getElementById('ve-overlay');
    var ctx = canvas.getContext('2d');
    var trimIn = document.getElementById('ve-trim-in');
    var trimOut = document.getElementById('ve-trim-out');
    var trimInVal = document.getElementById('ve-trim-in-val');
    var trimOutVal = document.getElementById('ve-trim-out-val');
    var finalLen = document.getElementById('ve-final-len');
    var timeLbl = document.getElementById('ve-time');

    var musicBuffer = null;     // decoded AudioBuffer of imported music
    var audioCtx = null;        // shared AudioContext
    var musicSource = null;     // currently-playing music node (live preview)
    var musicGain = null;
    var musicVol = 0.35;
    var muteOrig = false;
    // Snap-to-grid for trim handles + scrub. Step is half a second
    // because that's the finest granularity that still feels useful
    // for kid-book / short-clip editing without fighting drag.
    var snapEnabled = false;
    var SNAP_STEP = 0.5;

    /* Seconds-with-2dp format to match the VN reference exactly:
       "2.30s / 8.04s" instead of "0:02.3 / 0:08.0". Falls back to
       em-dash when duration is unknown so the user can tell at a
       glance the video didn't decode. */
    function fmtTime(s) {
      if (s == null || isNaN(s)) return '—s';
      s = Math.max(0, s || 0);
      return s.toFixed(2) + 's';
    }
    /* ===== TIMELINE ENGINE =====
       The timeline IS the source of truth. Nothing else accesses
       video.currentTime / video.play() / video.pause() directly —
       every interaction routes through `engine`. The engine maintains
       a global timeline `t` (seconds) and an ordered clips[] array;
       at every tick it resolves t -> (which clip, what srcOffset)
       and drives the <video> output to match. Multi-clip is real:
       Split bisects the active clip and playback walks across the
       boundary because resolve() returns the right srcOffset on each
       side.
    */
    var engine = {
      clips: [],
      tracks: { music: [], text: [], sticker: [] },
      t: 0,
      isPlaying: false,
      rafId: null,
      lastFrame: 0,
      onTick: function () {},  // editor sets this to update UI
      onClipsChanged: function () {},  // editor re-renders strip when clips mutate
      duration: function () {
        return this.clips.reduce(function (s, c) { return s + (c.srcEnd - c.srcStart); }, 0);
      },
      // Map global timeline t -> {clip, srcOffset} so the <video>
      // element can be told what frame to show. Single-source MVP:
      // every clip references the SAME video element; only srcStart/
      // srcEnd differ per clip. resolve walks clips in order.
      resolve: function (t) {
        var acc = 0;
        for (var i = 0; i < this.clips.length; i++) {
          var c = this.clips[i];
          var d = c.srcEnd - c.srcStart;
          if (t < acc + d) {
            return { idx: i, clip: c, srcOffset: c.srcStart + (t - acc), clipStart: acc };
          }
          acc += d;
        }
        var last = this.clips[this.clips.length - 1];
        return last ? { idx: this.clips.length - 1, clip: last, srcOffset: last.srcEnd, clipStart: acc - (last.srcEnd - last.srcStart) } : null;
      },
      // Drive the video to match a global t. Use fastSeek for
      // smooth scrub when available (Safari supports it).
      setTime: function (t, immediate) {
        var d = this.duration() || 0;
        t = Math.max(0, Math.min(d, t));
        this.t = t;
        var r = this.resolve(t);
        if (!r) { this.onTick(this.t); return; }
        try {
          // IMPORTANT: do not use fastSeek here. On iPad Safari, fastSeek can jump
          // only to keyframes and may not repaint the preview during a drag. For
          // editor scrubbing we need exact currentTime control.
          var srcTime = r.srcOffset;
          if (video.duration && isFinite(video.duration)) {
            srcTime = Math.max(0, Math.min(srcTime, Math.max(0, video.duration - 0.001)));
          }
          if (Math.abs((video.currentTime || 0) - srcTime) > 0.015) {
            video.currentTime = srcTime;
          }
        } catch (e) { try { console.warn('[VE] setTime seek failed', e); } catch (_) {} }
        this.onTick(this.t);
      },
      play: function () {
        if (this.isPlaying) return;
        var self = this;
        if (this.t >= this.duration() - 0.01) this.setTime(0);
        this.isPlaying = true;
        this.lastFrame = performance.now();
        var step = function (now) {
          if (!self.isPlaying) return;
          var dt = (now - self.lastFrame) / 1000;
          self.lastFrame = now;
          var newT = self.t + dt;
          if (newT >= self.duration()) {
            self.pause();
            self.setTime(self.duration());
            return;
          }
          self.setTime(newT);
          self.rafId = requestAnimationFrame(step);
        };
        try { video.play().catch(function () {}); } catch (e) {}
        this.rafId = requestAnimationFrame(step);
      },
      pause: function () {
        this.isPlaying = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
        try { video.pause(); } catch (e) {}
      },
      toggle: function () { this.isPlaying ? this.pause() : this.play(); },
      // Bisect the active clip at the current t. Both halves still
      // reference the same source video; their srcStart/srcEnd ranges
      // are non-overlapping so playback walks across cleanly.
      splitAtCursor: function () {
        var r = this.resolve(this.t);
        if (!r) return false;
        var c = r.clip;
        var splitOffset = r.srcOffset;
        if (splitOffset - c.srcStart < 0.1) return false;
        if (c.srcEnd - splitOffset < 0.1) return false;
        var newClip = { id: 'c' + Date.now(), srcStart: splitOffset, srcEnd: c.srcEnd };
        c.srcEnd = splitOffset;
        this.clips.splice(r.idx + 1, 0, newClip);
        this.onClipsChanged();
        return true;
      },
      // Reorder by removing from one index and inserting at another.
      // Used by drag-to-reposition.
      moveClip: function (fromIdx, toIdx) {
        if (fromIdx === toIdx) return false;
        if (fromIdx < 0 || fromIdx >= this.clips.length) return false;
        if (toIdx < 0 || toIdx >= this.clips.length) return false;
        var c = this.clips.splice(fromIdx, 1)[0];
        this.clips.splice(toIdx, 0, c);
        this.onClipsChanged();
        return true;
      },
      duplicateAt: function (clipIdx) {
        var c = this.clips[clipIdx];
        if (!c) return false;
        var copy = { id: 'c' + Date.now(), srcStart: c.srcStart, srcEnd: c.srcEnd };
        this.clips.splice(clipIdx + 1, 0, copy);
        this.onClipsChanged();
        return true;
      },
      removeAt: function (clipIdx) {
        if (clipIdx < 0 || clipIdx >= this.clips.length) return false;
        this.clips.splice(clipIdx, 1);
        if (this.t > this.duration()) this.setTime(this.duration());
        this.onClipsChanged();
        return true;
      }
    };
    // Expose for debug + future tooling.
    wrap.__engine = engine;

    // Bind pending UI callbacks now that engine exists. Older builds set engine.onTick before engine was created, aborting before .timeline-clip could mount.
    if (typeof __vePendingOnTick === 'function') engine.onTick = __vePendingOnTick;
    engine.onClipsChanged = (typeof __vePendingClipsChangedWithRuler === 'function') ? __vePendingClipsChangedWithRuler : (typeof __vePendingClipsChanged === 'function' ? __vePendingClipsChanged : function () {});
    try { video.addEventListener('loadedmetadata', earlyHandler); } catch (e) { console.warn('[VE] early metadata handler not attached', e); }

    // RENDER THE CLIP IMMEDIATELY — do not wait for loadedmetadata.
    engine.clips = [{ id: 'c0', srcStart: 0, srcEnd: 5, _placeholder: true }];
    engine.t = 0;
    try { engine.onClipsChanged(); } catch (e) { console.error('[VE] initial clip render failed', e); }
    try { engine.onTick(0); } catch (e) {}

    function refreshTrimDisplay() {
      var inS = parseFloat(trimIn.value), outS = parseFloat(trimOut.value);
      if (outS < inS + 0.2) outS = inS + 0.2;
      trimInVal.textContent = inS.toFixed(2) + 's';
      trimOutVal.textContent = outS.toFixed(2) + 's';
      finalLen.textContent = (outS - inS).toFixed(2) + 's';
    }
    video.addEventListener('loadedmetadata', function () {
      var d = video.duration || 0;
      trimIn.max = trimOut.max = d.toFixed(2);
      trimOut.value = d.toFixed(2);
      // Match canvas internal resolution to video
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      // Initialise the timeline engine with one clip spanning the
      // whole source video. Split / Duplicate / Delete will mutate
      // this array; the strip render iterates it.
      // Patch the placeholder ONLY if we actually got a real duration.
      // If video.duration is 0/NaN (codec issue, no audio track,
      // file failed to decode) we KEEP the placeholder srcEnd so the
      // clip stays visible while the load-failure overlay (3s probe)
      // surfaces the real problem.
      if (d > 0 && !isNaN(d)) {
        if (engine.clips.length === 1 && engine.clips[0]._placeholder) {
          engine.clips[0].srcEnd = d;
          delete engine.clips[0]._placeholder;
        } else if (!engine.clips.length) {
          engine.clips = [{ id: 'c0', srcStart: 0, srcEnd: d }];
        }
        engine.t = 0;
        engine.onClipsChanged();
        engine.setTime(0);
      } else {
        try { console.warn('[VE] loadedmetadata fired but duration is 0/NaN — keeping placeholder clip'); } catch (_) {}
      }
      refreshTrimDisplay();
      drawOverlay();
      // Generate frame thumbnails for the timeline strip — VN-style.
      // Async so the editor stays interactive while seeking happens.
      generateClipThumbnails(video, 5).catch(function () {});
    });
    // Belt-and-suspenders thumb triggers — fire on the earliest event
    // that gives us a paintable frame so the strip populates the
    // moment the preview shows anything, not when full metadata
    // (duration / videoWidth) finally lands.
    var _thumbsKicked = false;
    function kickThumbsOnce() {
      if (_thumbsKicked) return;
      _thumbsKicked = true;
      generateClipThumbnails(video, 5).catch(function () {});
    }
    video.addEventListener('loadeddata', kickThumbsOnce);
    video.addEventListener('canplay', kickThumbsOnce);

    /* Pull N evenly-spaced frame thumbnails out of the video and
       render them into the yellow timeline strip. Two-pass for
       responsiveness:
         Pass 1 (instant) — once one frame is decodable, capture it
                            once and tile it across N <img> slots so
                            the strip looks correct immediately
         Pass 2 (per-frame) — seek to each evenly-spaced timestamp
                              with a watchdog; replace each tile in
                              place with the real frame when it
                              arrives. Surviving frames from pass 1
                              fill in for any seeks Safari refuses. */
    function generateClipThumbnails(vid, count) {
      var thumbsEl = document.getElementById('ve-clip-thumbs');
      if (!thumbsEl) return Promise.resolve();
      thumbsEl.innerHTML = '';
      thumbsEl.classList.add('loading');
      var d = vid.duration;
      if (!d || isNaN(d) || d <= 0) {
        thumbsEl.classList.remove('loading');
        return Promise.resolve();
      }
      function whenReady() {
        if (vid.readyState >= 2) return Promise.resolve();
        return new Promise(function (resolve) {
          var done = false;
          var finish = function () { if (!done) { done = true; resolve(); } };
          vid.addEventListener('loadeddata', finish, { once: true });
          vid.addEventListener('canplay', finish, { once: true });
          try { vid.load(); } catch (e) {}
          setTimeout(finish, 3000);
        });
      }
      return whenReady().then(function () {
        var off = document.createElement('canvas');
        // Thumbnail resolution — preserve source aspect, big enough that
        // the iPad Retina display doesn't see soft / blocky pixels.
        var srcW = vid.videoWidth || 1280;
        var srcH = vid.videoHeight || 720;
        var aspect = srcW / srcH;
        // Render at 480px tall — gives ~5x oversampling vs 84px CSS height
        // on a 2x Retina iPad, so the displayed thumbnail stays crisp
        // even when the strip stretches. Width preserves source aspect
        // so there is zero distortion when CSS lays out at flex:1 1 0.
        off.height = 480;
        off.width = Math.round(480 * aspect);
        var octx = off.getContext('2d');
        var savedTime = vid.currentTime;
        var wasMuted = vid.muted;
        vid.muted = true;
        // Pass 1 — capture the current frame, tile it across the
        // strip so the user sees the timeline populate immediately.
        var instantUrl = '';
        try { octx.drawImage(vid, 0, 0, off.width, off.height); instantUrl = off.toDataURL('image/jpeg', 0.95); }
        catch (e) {}
        var slotImgs = [];
        for (var k = 0; k < count; k++) {
          var slot = document.createElement('img');
          if (instantUrl) slot.src = instantUrl;
          slot.alt = '';
          thumbsEl.appendChild(slot);
          slotImgs.push(slot);
        }
        thumbsEl.classList.remove('loading');
        // Pass 2 — replace each tile with its actual frame.
        var i = 0;
        function drawNext() {
          if (i >= count) {
            try { vid.currentTime = savedTime; } catch (e) {}
            vid.muted = wasMuted;
            return Promise.resolve();
          }
          var t = (d * (i + 0.5)) / count;
          return new Promise(function (resolve) {
            var done = false;
            var finish = function () { if (!done) { done = true; resolve(); } };
            var onSeeked = function () {
              vid.removeEventListener('seeked', onSeeked);
              try {
                octx.drawImage(vid, 0, 0, off.width, off.height);
                var u = off.toDataURL('image/jpeg', 0.95);
                if (u && slotImgs[i]) slotImgs[i].src = u;
              } catch (e) {}
              i++; finish();
            };
            vid.addEventListener('seeked', onSeeked);
            try { vid.currentTime = t; }
            catch (e) { vid.removeEventListener('seeked', onSeeked); i++; finish(); return; }
            // Watchdog so a missing "seeked" event doesn't stall.
            setTimeout(function () {
              vid.removeEventListener('seeked', onSeeked);
              i++; finish();
            }, 1500);
          }).then(drawNext);
        }
        return drawNext();
      });
    }

    /* Drag-to-scrub on the timeline strip — VN behaviour. Pointer
       down on the strip moves the video.currentTime to the matching
       offset; dragging keeps it synced; releasing resumes if the
       video was playing. */
    var clipStripEl = document.getElementById('ve-clip-strip');
    var wasPlaying = false;
    /* Scrub through the engine, not directly to video.currentTime.
       rAF-throttled — pointermove queues at most ONE setTime per
       frame so iPad Safari isn't drowned in seek requests at fast
       scrub speeds (which causes the "jumping" the user reported).
       Engine.setTime uses fastSeek when immediate=true so the
       preview catches up smoothly. */
    var scrubPendingX = null;
    var scrubFrameQueued = false;
    function scrubFromEvent(ev) {
      var dur = engine.duration();
      if (!dur || isNaN(dur)) return;
      var rect = clipStripEl.getBoundingClientRect();
      scrubPendingX = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
      if (scrubFrameQueued) return;
      scrubFrameQueued = true;
      requestAnimationFrame(function () {
        scrubFrameQueued = false;
        if (scrubPendingX == null) return;
        // Pixel-time math: cursor X / PX_PER_SECOND = timeline t.
        // Matches the scale used for clip widths + playhead so the
        // visual playhead lands exactly under the cursor.
        var t = Math.max(0, Math.min(dur, scrubPendingX / PX_PER_SECOND));
        if (snapEnabled) t = Math.round(t / SNAP_STEP) * SNAP_STEP;
        engine.setTime(t, true); // fastSeek path
      });
    }
    function onScrubStart(ev) {
      ev.preventDefault();
      wasPlaying = engine.isPlaying;
      if (wasPlaying) engine.pause();
      scrubFromEvent(ev);
      document.addEventListener('pointermove', onScrubMove);
      document.addEventListener('pointerup', onScrubEnd);
      document.addEventListener('pointercancel', onScrubEnd);
    }
    function onScrubMove(ev) { scrubFromEvent(ev); }
    function onScrubEnd() {
      document.removeEventListener('pointermove', onScrubMove);
      document.removeEventListener('pointerup', onScrubEnd);
      document.removeEventListener('pointercancel', onScrubEnd);
      if (wasPlaying) engine.play();
    }
    if (clipStripEl) clipStripEl.addEventListener('pointerdown', onScrubStart);


    /* v17aa-sync: global VN-style timeline scrubbing.
       The earlier build only listened on #ve-clip-strip. That meant dragging
       the white playhead through the empty music/subtitle/sticker rows or the
       waveform/ruler could move the visual area without driving the preview.
       This listener makes the entire timeline column the scrub surface. */
    (function bindTimelineScrollScrub() {
      var timelineScrollEl = document.getElementById('timelineScroll');
      var videoTrackEl = document.getElementById('ve-clip-strip');
      if (!timelineScrollEl || !videoTrackEl) return;

      function clientXFromEvent(ev) {
        if (ev.touches && ev.touches[0]) return ev.touches[0].clientX;
        if (ev.changedTouches && ev.changedTouches[0]) return ev.changedTouches[0].clientX;
        return ev.clientX;
      }

      function timelineTimeFromClientX(clientX) {
        var rect = videoTrackEl.getBoundingClientRect();
        var x = clientX - rect.left;
        var dur = engine.duration() || 0;
        var t = x / PX_PER_SECOND;
        if (snapEnabled) t = Math.round(t / SNAP_STEP) * SNAP_STEP;
        return Math.max(0, Math.min(dur, t));
      }

      function shouldIgnoreTimelineScrub(target) {
        return !!(target && target.closest && target.closest(
          'button,input,select,textarea,.trim-handle,.clip-add,.ve-block-handle,#ve-context,#ve-clip-quick,.ve-iconbtn'
        ));
      }

      var timelineWasPlaying = false;
      function seekFromEvent(ev) {
        var t = timelineTimeFromClientX(clientXFromEvent(ev));
        engine.setTime(t, false);
        return t;
      }

      function startTimelineScrub(ev) {
        if (shouldIgnoreTimelineScrub(ev.target)) return;
        if (!engine.duration()) return;
        ev.preventDefault();
        timelineWasPlaying = engine.isPlaying;
        if (timelineWasPlaying) engine.pause();
        seekFromEvent(ev);
        document.addEventListener('pointermove', moveTimelineScrub, { passive: false });
        document.addEventListener('pointerup', endTimelineScrub, { passive: false });
        document.addEventListener('pointercancel', endTimelineScrub, { passive: false });
      }
      function moveTimelineScrub(ev) {
        ev.preventDefault();
        seekFromEvent(ev);
      }
      function endTimelineScrub(ev) {
        document.removeEventListener('pointermove', moveTimelineScrub);
        document.removeEventListener('pointerup', endTimelineScrub);
        document.removeEventListener('pointercancel', endTimelineScrub);
        if (timelineWasPlaying) engine.play();
      }

      timelineScrollEl.addEventListener('pointerdown', startTimelineScrub, { passive: false });

      // Keep the engine UI synchronized if the native video controls are used.
      video.addEventListener('timeupdate', function () {
        if (engine.isPlaying) return;
        var src = video.currentTime || 0;
        var acc = 0;
        for (var i = 0; i < engine.clips.length; i++) {
          var c = engine.clips[i];
          var len = c.srcEnd - c.srcStart;
          if (src >= c.srcStart && src <= c.srcEnd) {
            engine.t = acc + (src - c.srcStart);
            engine.onTick(engine.t);
            return;
          }
          acc += len;
        }
      });
    })();

    /* Snap toggle wiring. Updates the button visual + redraws the
       half-second grid markers across the timeline strip when on. */
    var snapBtn = document.getElementById('ve-snap');
    function renderSnapGrid() {
      var stripEl = document.getElementById('ve-clip-strip');
      if (!stripEl) return;
      var existing = stripEl.querySelector('.ve-snap-grid');
      if (existing) existing.remove();
      if (!snapEnabled || !video.duration || !isFinite(video.duration)) return;
      var grid = document.createElement('div');
      grid.className = 've-snap-grid';
      var total = Math.floor(video.duration / SNAP_STEP);
      var ticks = '';
      for (var i = 1; i < total; i++) {
        var pct = ((i * SNAP_STEP) / video.duration) * 100;
        // Major (full second) ticks vs minor (half second).
        var major = (i * SNAP_STEP) % 1 === 0;
        ticks += '<span class="ve-snap-tick' + (major ? ' major' : '') + '" style="left:' + pct.toFixed(2) + '%;"></span>';
      }
      grid.innerHTML = ticks;
      stripEl.appendChild(grid);
    }
    if (snapBtn) snapBtn.addEventListener('click', function () {
      snapEnabled = !snapEnabled;
      snapBtn.classList.toggle('on', snapEnabled);
      snapBtn.title = 'Snap (' + (snapEnabled ? 'on' : 'off') + ')';
      snapBtn.innerHTML = snapEnabled ? '&#9899;' : '&#9898;';
      renderSnapGrid();
      toast('Snap to 0.5s grid: ' + (snapEnabled ? 'ON' : 'OFF'), false);
    });
    // Re-render the grid whenever new metadata loads (e.g. after a
    // Replace) so tick spacing matches the new duration.
    video.addEventListener('loadedmetadata', renderSnapGrid);

    /* Clip selection — tap the strip to enter clip-edit mode. The
       strip glows yellow, a floating quick-toolbar pops above it,
       and the bottom 26-button toolbar swaps to the contextual
       Edit/Split/Replace/Speed/Opacity/Duplicate/Delete bar. Tap
       outside the strip (or Done) to leave selection. */
    var quickEl = document.getElementById('ve-clip-quick');
    function selectClip() {
      if (!clipStripEl) return;
      clipStripEl.classList.add('ve-selected');
      wrap.classList.add('ve-clip-active');
      if (quickEl) quickEl.hidden = false;
    }
    function deselectClip() {
      if (clipStripEl) clipStripEl.classList.remove('ve-selected');
      wrap.classList.remove('ve-clip-active');
      if (quickEl) quickEl.hidden = true;
    }
    // Differentiate a tap (select) from a drag (scrub). We track the
    // pointer-down timestamp + start coords; if movement is small and
    // duration is short, treat as a selection tap.
    var tapStart = 0, tapX = 0, tapY = 0;
    if (clipStripEl) {
      clipStripEl.addEventListener('pointerdown', function (e) {
        tapStart = Date.now();
        tapX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        tapY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      });
      clipStripEl.addEventListener('pointerup', function (e) {
        var dx = Math.abs((e.clientX || 0) - tapX);
        var dy = Math.abs((e.clientY || 0) - tapY);
        var dt = Date.now() - tapStart;
        if (dt < 250 && dx < 8 && dy < 8) selectClip();
      });
    }
    // Tap-outside-the-clip clears selection. Listen on document; if
    // the click target isn't inside the strip or the quick toolbar
    // or the context bar, deselect.
    document.addEventListener('pointerdown', function (e) {
      if (!wrap.classList.contains('ve-clip-active')) return;
      if (e.target.closest('#ve-clip-strip')) return;
      if (e.target.closest('#ve-clip-quick')) return;
      if (e.target.closest('#ve-context')) return;
      deselectClip();
    }, true);

    /* Context + quick-toolbar action handler. Wired today:
         deselect → close clip-edit mode
         delete   → after confirm, removes the editor entirely
                    (single-clip MVP — multi-clip splice lands later)
       Everything else toasts a one-line "coming next" descriptor. */
    function onClipAction(act) {
      if (act === 'deselect') return deselectClip();
      if (act === 'edit')      { showPanel('ve-text-panel'); return; }
      if (act === 'split') {
        // REAL split via the timeline engine. Bisects the active clip
        // at the current playhead position; creates a second entry in
        // engine.clips that references the same source but starts
        // where the first ends. Re-renders the clip blocks so the
        // user sees two yellow blocks side-by-side.
        var ok = engine.splitAtCursor();
        if (ok) toast('Clip split at ' + engine.t.toFixed(2) + 's. Now ' + engine.clips.length + ' clips.', false);
        else toast('Move the playhead away from the clip edge first.', true);
        return;
      }
      if (act === 'duplicate') {
        // Duplicate the LAST clip for now (single-clip selection model);
        // multi-clip selection lands when each block becomes tappable.
        var ok = engine.duplicateAt(engine.clips.length - 1);
        if (ok) toast('Clip duplicated. Now ' + engine.clips.length + ' clips.', false);
        else toast('Could not duplicate.', true);
        return;
      }
      if (act === 'replace')   {
        // Open the hidden replace-media picker. On pick we swap the
        // <video> src for a new blob URL, regenerate frame thumbs,
        // and reset the trim window to the new clip's full duration.
        document.getElementById('ve-replace-pick').click();
        return;
      }
      if (act === 'speed')     { showPanel('ve-speed-panel'); return; }
      if (act === 'opacity')   { showPanel('ve-opacity-panel'); return; }
      if (act === 'delete') {
        // Delete the SELECTED frame (or the last one if nothing is
        // explicitly selected). Single-clip case tears down the editor.
        var n = engine.clips.length;
        var idx = (typeof selectedClipIdx === 'number' && selectedClipIdx >= 0 && selectedClipIdx < n)
          ? selectedClipIdx : n - 1;
        if (n > 1) {
          var c = engine.clips[idx];
          var dur = c ? (c.srcEnd - c.srcStart).toFixed(2) : '';
          if (!confirm('Delete frame ' + (idx + 1) + ' of ' + n + ' (' + dur + 's)?')) return;
          engine.removeAt(idx);
          selectedClipIdx = Math.min(idx, engine.clips.length - 1);
          renderClipBlocks();
          toast('Deleted frame ' + (idx + 1) + '. Now ' + engine.clips.length + ' clip' + (engine.clips.length === 1 ? '' : 's') + '.', false);
          return;
        }
        if (!confirm('Delete this clip? The editor will close.')) return;
        var existing = document.getElementById('__loadVideoEdit');
        if (existing) existing.remove();
        return;
      }
    }

    /* Replace media — pick a new file, swap video src, regenerate
       frame thumbnails, reset trim to the new clip's full length.
       Saves the old blob URL so we can revoke it after the new one
       starts loading (avoids a memory spike on repeated replaces). */
    var replacePick = document.getElementById('ve-replace-pick');
    if (replacePick) replacePick.addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      if (!/^video\//.test(f.type) && !/\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name)) {
        toast('Replace requires a video file.', true);
        return;
      }
      var oldUrl = video.src;
      var newUrl = URL.createObjectURL(f);
      video.src = newUrl;
      // Reset trim + thumbnails after the new metadata loads.
      video.addEventListener('loadedmetadata', function once() {
        video.removeEventListener('loadedmetadata', once);
        try { trimIn.value = '0'; trimOut.value = String(video.duration || 0); refreshTrimDisplay(); } catch (e) {}
        try { generateClipThumbnails(video, 5); } catch (e) {}
        if (oldUrl && oldUrl.indexOf('blob:') === 0) {
          try { URL.revokeObjectURL(oldUrl); } catch (e) {}
        }
        toast('Clip replaced.', false);
      }, { once: true });
    });

    /* Speed — live preview via video.playbackRate. Range slider +
       quick presets keep the same internal state. Persisted to
       playbackRate so playback (and any future export bake step)
       picks it up. */
    var speedRange = document.getElementById('ve-speed-range');
    var speedVal = document.getElementById('ve-speed-val');
    function applySpeed(rate) {
      try { video.playbackRate = rate; } catch (e) {}
      if (speedVal) speedVal.textContent = (+rate).toFixed(2).replace(/\.?0+$/, '') + 'x';
      if (speedRange && +speedRange.value !== +rate) speedRange.value = String(rate);
    }
    if (speedRange) speedRange.addEventListener('input', function () { applySpeed(parseFloat(speedRange.value)); });
    Array.prototype.forEach.call(wrap.querySelectorAll('.ve-speed-preset'), function (b) {
      b.addEventListener('click', function () { applySpeed(parseFloat(b.getAttribute('data-speed'))); });
    });

    /* Opacity — live preview by setting CSS opacity on the <video>
       AND the overlay canvas so subtitle/text overlays fade with the
       clip. Stored on a closure var so the export bake step can
       apply globalAlpha when drawing each frame. */
    var clipOpacity = 1;
    var opacityRange = document.getElementById('ve-opacity-range');
    var opacityVal = document.getElementById('ve-opacity-val');
    function applyOpacity(pct) {
      clipOpacity = Math.max(0, Math.min(1, pct / 100));
      video.style.opacity = String(clipOpacity);
      var overlay = document.getElementById('ve-overlay');
      if (overlay) overlay.style.opacity = String(clipOpacity);
      if (opacityVal) opacityVal.textContent = pct + '%';
    }
    if (opacityRange) opacityRange.addEventListener('input', function () { applyOpacity(parseInt(opacityRange.value, 10)); });
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-clip-action]'), function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        onClipAction(b.getAttribute('data-clip-action'));
      });
    });
    // Surface video-load errors loudly. iPad Safari rejects some
    // codecs (HEVC in non-MP4 wrapper, certain ProRes) silently —
    // before this handler the user just saw "Play does nothing".
    video.addEventListener('error', function () {
      var err = video.error || {};
      var code = err.code;
      var msg = code === 4
        ? 'iPad cannot decode this video format. Re-export as standard H.264 MP4 first.'
        : code === 2 ? 'Network error reading the video.'
        : code === 3 ? 'Video file appears damaged.'
        : 'Could not load this video.';
      toast(msg, true);
    });
    // Tap the preview itself to play/pause (VN behaviour). Useful on
    // iPad portrait where the small play triangle is easy to miss.
    video.addEventListener('click', function () {
      if (video.paused) {
        document.getElementById('ve-play').click();
      } else {
        video.pause();
      }
    });
    video.addEventListener('timeupdate', function () {
      timeLbl.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
      // Auto-stop at out point ONLY when an out point has been set.
      // Initial trimOut is "0" and pausing on currentTime >= 0
      // freezes playback the moment it starts.
      var outS = parseFloat(trimOut.value);
      if (outS > 0 && video.currentTime >= outS) video.pause();
      drawOverlay();
    });

    [trimIn, trimOut].forEach(function (el) { el.addEventListener('input', refreshTrimDisplay); });

    function drawOverlay() {
      if (!canvas.width) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Per-clip text track: any subtitle block whose [t0, t0+dur] window
      // covers the current playhead time wins over the global text. Falls
      // back to the global text panel value when no track item matches.
      var t = '';
      var pos, size, color, bg;
      var nowT = (typeof engine !== 'undefined' && engine && typeof engine.t === 'number') ? engine.t : 0;
      var trackItems = (typeof engine !== 'undefined' && engine && engine.tracks && engine.tracks.text) || [];
      var active = null;
      for (var ti = 0; ti < trackItems.length; ti++) {
        var it = trackItems[ti];
        if (nowT >= it.t0 && nowT <= it.t0 + it.dur) { active = it; break; }
      }
      if (active) {
        t = (active.text || '').trim();
        pos   = active.pos   || (document.getElementById('ve-text-pos')   || {}).value || 'bottom';
        size  = active.size  || parseInt((document.getElementById('ve-text-size')  || {}).value || '48', 10);
        color = active.color || (document.getElementById('ve-text-color') || {}).value || '#ffffff';
        bg    = active.bg    || (document.getElementById('ve-text-bg')    || {}).value || 'none';
      } else {
        t = ((document.getElementById('ve-text') || {}).value || '').trim();
        if (!t) return;
        pos   = (document.getElementById('ve-text-pos')   || {}).value || 'bottom';
        size  = parseInt((document.getElementById('ve-text-size')  || {}).value || '48', 10);
        color = (document.getElementById('ve-text-color') || {}).value || '#ffffff';
        bg    = (document.getElementById('ve-text-bg')    || {}).value || 'none';
      }
      if (!t) return;
      var w = canvas.width, h = canvas.height;
      var pad = Math.round(size * 0.6);
      var lineH = Math.round(size * 1.25);
      ctx.font = '700 ' + size + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var lines = wrapTextLines(ctx, t, w - pad * 2);
      var blockH = lines.length * lineH + pad;
      var y;
      if (pos === 'top') y = pad + lineH / 2;
      else if (pos === 'middle') y = h / 2 - (blockH / 2) + lineH / 2;
      else y = h - blockH + lineH / 2;
      if (bg === 'black') { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, y - lineH / 2 - pad / 2, w, blockH + pad / 2); }
      else if (bg === 'white') { ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.fillRect(0, y - lineH / 2 - pad / 2, w, blockH + pad / 2); }
      ctx.fillStyle = color;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = bg === 'none' ? Math.round(size * 0.12) : 0;
      lines.forEach(function (line, i) { ctx.fillText(line, w / 2, y + i * lineH); });
      ctx.shadowBlur = 0;
    }
    function wrapTextLines(c, text, maxW) {
      var words = String(text).split(/\s+/), lines = [], cur = '';
      for (var i = 0; i < words.length; i++) {
        var test = cur ? cur + ' ' + words[i] : words[i];
        if (c.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = test;
      }
      if (cur) lines.push(cur);
      return lines;
    }
    ['ve-text', 've-text-pos', 've-text-size', 've-text-color', 've-text-bg'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', drawOverlay);
      document.getElementById(id).addEventListener('change', drawOverlay);
    });

    document.getElementById('ve-play').addEventListener('click', function () {
      // Engine-driven. If clips aren't loaded yet, wait for metadata
      // then call engine.play(). engine.play() handles the case where
      // we're at the end (resets to 0) and starts the rAF loop.
      if (!engine.duration() || isNaN(engine.duration())) {
        toast('Video is still loading… one moment.', false);
        video.addEventListener('loadedmetadata', function () { engine.play(); }, { once: true });
        return;
      }
      engine.toggle();
    });
    function tryPlay() {
      var inS = parseFloat(trimIn.value);
      var outS = parseFloat(trimOut.value);
      if (isNaN(inS)) inS = 0;
      // If trimOut is still 0 (e.g. user tapped Play before adjusting
      // trim handles), fall back to the full video duration.
      if (!outS || outS <= 0) {
        outS = video.duration;
        try { trimOut.value = outS.toFixed(2); refreshTrimDisplay(); } catch (e) {}
      }
      if (Math.abs(video.currentTime - inS) > 0.5 || video.currentTime > outS - 0.05) video.currentTime = inS;
      var muteEl = document.getElementById('ve-mute-orig');
      muteOrig = !!(muteEl && muteEl.checked);
      video.muted = muteOrig;
      video.play().catch(function (e) {
        toast('Play failed: ' + (e && e.message ? e.message : 'browser blocked playback'), true);
      });
      if (musicBuffer) playPreviewMusic();
    }
    document.getElementById('ve-pause').addEventListener('click', function () {
      video.pause();
      stopPreviewMusic();
    });
    document.getElementById('ve-audio-vol').addEventListener('input', function (e) {
      musicVol = parseFloat(e.target.value);
      document.getElementById('ve-audio-vol-val').textContent = Math.round(musicVol * 100) + '%';
      if (musicGain) musicGain.gain.value = musicVol;
    });
    document.getElementById('ve-audio-pick').addEventListener('change', async function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var buf = await f.arrayBuffer();
        musicBuffer = await audioCtx.decodeAudioData(buf);
        toast('Music loaded — ' + musicBuffer.duration.toFixed(1) + 's.');
        // Show the music's waveform under the video clip strip so
        // the user sees real amplitude bars matching the audio they
        // just imported.
        renderWaveformFor(musicBuffer);
      } catch (err) { toast('Could not decode that audio file.', true); }
    });

    /* Decode the source video's audio track and draw real amplitude
       bars in .ve-waveform — replaces the decorative repeating-line
       background. Triggered on loadedmetadata; if the file's audio
       can't be decoded (codec mismatch, no audio track, etc.) the
       waveform area stays in its empty placeholder state. */
    var sourceAudioBuffer = null;
    async function decodeSourceVideoWaveform() {
      try {
        if (!app || !app.binary) return;
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var ab = await app.binary.arrayBuffer();
        var copy = ab.slice(0);
        var decoded = await audioCtx.decodeAudioData(copy);
        sourceAudioBuffer = decoded;
        renderWaveformFor(decoded);
        // Now that the source is decoded, paint a waveform inside
        // every existing clip block (per-clip mini-waveform).
        try { renderPerClipWaveforms(); } catch (_) {}
      } catch (e) { /* silent — source may not have a decodable audio track */ }
    }

    // Per-clip mini waveform — paints a small canvas at the bottom
    // of each .timeline-clip showing only that clip's source range.
    // Uses sourceAudioBuffer (decoded once at editor open).
    function renderPerClipWaveforms() {
      if (!sourceAudioBuffer) return;
      var data = sourceAudioBuffer.getChannelData(0);
      var sr = sourceAudioBuffer.sampleRate;
      Array.prototype.forEach.call(wrap.querySelectorAll('.timeline-clip'), function (clipEl) {
        var idx = +clipEl.dataset.clipIdx;
        var c = engine.clips[idx];
        if (!c) return;
        var existing = clipEl.querySelector('.ve-clip-mini-wf');
        if (existing) existing.remove();
        var canvas = document.createElement('canvas');
        canvas.className = 've-clip-mini-wf';
        canvas.style.cssText = 'position:absolute;left:0;right:0;bottom:0;width:100%;height:18px;display:block;pointer-events:none;border-bottom-left-radius:6px;border-bottom-right-radius:6px;';
        clipEl.appendChild(canvas);
        var rect = clipEl.getBoundingClientRect();
        var dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(60, rect.width * dpr);
        canvas.height = 18 * dpr;
        var ctx2 = canvas.getContext('2d');
        ctx2.fillStyle = 'rgba(0,0,0,0.45)';
        ctx2.fillRect(0, 0, canvas.width, canvas.height);
        var startSamp = Math.max(0, Math.floor(c.srcStart * sr));
        var endSamp   = Math.min(data.length, Math.floor(c.srcEnd * sr));
        var bars = Math.max(20, Math.floor(rect.width / 4));
        var step = Math.max(1, Math.floor((endSamp - startSamp) / bars));
        var midY = canvas.height / 2;
        var barW = canvas.width / bars;
        ctx2.fillStyle = 'rgba(251,191,36,0.95)';
        for (var b = 0; b < bars; b++) {
          var max = 0;
          var s0 = startSamp + b * step;
          var s1 = Math.min(endSamp, s0 + step);
          for (var i = s0; i < s1; i++) {
            var v = Math.abs(data[i]);
            if (v > max) max = v;
          }
          var h = Math.max(1, max * canvas.height * 0.85);
          ctx2.fillRect(b * barW, midY - h / 2, Math.max(1, barW - 1), h);
        }
      });
    }

    /* Draw amplitude bars from an AudioBuffer into the waveform
       element. Down-samples the channel data into ~200 buckets and
       renders each as a vertical yellow bar centred on the strip's
       midline. Honours device pixel ratio for crisp lines. */
    function renderWaveformFor(audioBuffer) {
      var wf = document.getElementById('ve-waveform');
      if (!wf || !audioBuffer) return;
      wf.classList.remove('empty');
      // Reuse or create the canvas.
      var c = wf.querySelector('canvas');
      if (!c) { c = document.createElement('canvas'); wf.appendChild(c); }
      var dpr = window.devicePixelRatio || 1;
      var rect = wf.getBoundingClientRect();
      c.width = Math.max(200, rect.width * dpr);
      c.height = Math.max(32, rect.height * dpr);
      var ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);
      var data = audioBuffer.getChannelData(0);
      var bars = 220;
      var step = Math.max(1, Math.floor(data.length / bars));
      var midY = c.height / 2;
      var barW = c.width / bars;
      ctx.fillStyle = '#fbbf24';
      for (var b = 0; b < bars; b++) {
        // Peak amplitude in this bucket (cheap RMS would also work).
        var max = 0;
        var startIdx = b * step;
        var endIdx = Math.min(data.length, startIdx + step);
        for (var i = startIdx; i < endIdx; i++) {
          var v = Math.abs(data[i]);
          if (v > max) max = v;
        }
        var h = Math.max(1, max * c.height * 0.85);
        var x = b * barW;
        ctx.fillRect(x, midY - h / 2, Math.max(1, barW - 1), h);
      }
    }
    // Kick the source-audio decode when the video has metadata.
    video.addEventListener('loadedmetadata', function () {
      var wf = document.getElementById('ve-waveform');
      if (wf) wf.classList.add('empty');
      // Defer briefly so the rest of the metadata-load chain finishes
      // first (canvas dims, thumbnail kickoff, etc).
      setTimeout(decodeSourceVideoWaveform, 200);
    }, { once: true });
    function playPreviewMusic() {
      stopPreviewMusic();
      if (!musicBuffer || !audioCtx) return;
      musicSource = audioCtx.createBufferSource();
      musicSource.buffer = musicBuffer;
      musicSource.loop = true;
      musicGain = audioCtx.createGain();
      musicGain.gain.value = musicVol;
      musicSource.connect(musicGain).connect(audioCtx.destination);
      musicSource.start();
    }
    function stopPreviewMusic() {
      try { if (musicSource) musicSource.stop(); } catch (e) {}
      musicSource = null;
    }

    /* Topbar buttons — wired with a defensive bind() helper so a
       single missing element never kills the rest of the row.
       Earlier versions used document.getElementById(id).addEventListener
       directly; if any of the seven buttons was absent (typo in id,
       refactor drift, etc.) the whole topbar went dark. */
    function bindEd(id, evt, fn) {
      var el = document.getElementById(id);
      if (!el) { try { console.warn('[VE] missing #' + id); } catch (_) {} return; }
      try { el.addEventListener(evt, fn); }
      catch (e) { try { console.warn('[VE] bind failed for #' + id, e); } catch (_) {} }
    }
    bindEd('ve-back', 'click', function () {
      var existing = document.getElementById('__loadVideoEdit');
      if (existing) existing.remove();
    });
    bindEd('ve-refresh', 'click', async function () {
      try {
        if ('serviceWorker' in navigator) {
          var regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(function (r) { return r.update(); }));
        }
        if ('caches' in window) {
          var keys = await caches.keys();
          await Promise.all(keys.map(function (k) { return caches.delete(k); }));
        }
      } catch (e) {}
      location.replace(location.pathname + '?_=' + Date.now());
    });
    bindEd('ve-help', 'click', function () {
      alert(
        'Load Video Editor — full guide\n' +
        '═══════════════════════════════\n\n' +

        'TOP BAR\n' +
        '• ← Back: closes the editor (your unsaved edits stay until you reload)\n' +
        '• ?  Help: this guide\n' +
        '• ↻  Force-Refresh: clears the cache + reloads to pull the latest build\n' +
        '• Original ▾: aspect ratio (Original / 16:9 / 9:16 / 1:1 / 4:5)\n' +
        '• …  More: cycles through aspect ratios quickly\n' +
        '• 💾 Save: stores the current state (clips, trim, speed, opacity, music, text) as a draft\n' +
        '• ⬆ Export: encodes the edit to MP4 (real-time encode), opens iOS share sheet, also saves a copy back to your Library as "(edited)"\n\n' +

        'PREVIEW\n' +
        '• Tap the video to play / pause\n' +
        '• Native iOS controls also work\n' +
        '• Effects (filter / blur / mirror / flip / rotate / zoom / mosaic / magnifier) all preview live on this screen\n\n' +

        'TRANSPORT (under preview)\n' +
        '• ⏮ / ⏭: skip ±5 seconds\n' +
        '• ▶ / ⏸: play / pause\n' +
        '• ☰ Layers: expand / collapse the track rows\n' +
        '• ◌ / ● Snap: snap trim + scrub to a 0.5s grid\n' +
        '• 🔗 Link: when on, dragging one timeline element moves all linked tracks together (text, sticker, music)\n' +
        '• ↺ / ↻ Undo / Redo (multi-clip phase)\n\n' +

        'LEFT TRACK LABELS\n' +
        '• 🎵+ Music: opens picker to add background music\n' +
        '• T+  Subtitle: opens text-overlay panel\n' +
        '• 🖼️+ Sticker / PiP: pick image (drops as draggable PiP overlay) OR video (adds as new clip on timeline)\n' +
        '• Cover: pick a cover image for the exported video\n' +
        '• 🔊 Audio: tap to upload an audio file that replaces the original (auto-mutes the video sound)\n\n' +

        'TIMELINE\n' +
        '• Drag along it to scrub the playhead\n' +
        '• Yellow-bordered block is your video clip — drag the side handles to trim\n' +
        '• Tap the clip to select it (clip-edit mode)\n' +
        '• Edge + buttons: add a copy of the clip before / after\n' +
        '• Red × at the top-right of every frame: tap to delete that frame (single-tap, asks to confirm)\n' +
        '• Bottom-bar 🗑 Delete also removes the SELECTED frame (the one with the yellow border)\n' +
        '• Yellow waveform: real audio amplitude under each clip\n' +
        '• Time ruler: shows seconds 0s, 1s, 2s …\n\n' +

        'BOTTOM BAR (scrollable, 28 tools)\n' +
        '• Filter: cycle warm / cool / noir / vivid / soft / vintage\n' +
        '• Trim: highlights the yellow trim handles\n' +
        '• FX: subtle zoom on/off\n' +
        '• Split: bisect the clip at the playhead (now 2 clips)\n' +
        '• Cutout: high-contrast preview filter\n' +
        '• Speed: 0.5× / 1× / 1.5× / 2× preset slider\n' +
        '• Volume: opens music panel for level\n' +
        '• Fade: opens music panel\n' +
        '• Crop / Fit: object-fit cover / contain\n' +
        '• Rotate: 90° / 180° / 270° / 0°\n' +
        '• Mirror / Flip: horizontal / vertical flip\n' +
        '• BG: cycles 5 background colours behind the video\n' +
        '• Border: 0 / 4 / 8 / 16 px\n' +
        '• Blur: 0 / 2 / 5 / 10 / 20 px\n' +
        '• Opacity: clip transparency slider\n' +
        '• Denoise: 5 kHz audio lowpass to cut hiss\n' +
        '• Zoom: 0.75× / 1× / 1.25× / 1.5× / 2× scale\n' +
        '• Extract Audio: decodes the video, downloads a WAV\n' +
        '• Auto Captions: speech-to-text into the subtitle box\n' +
        '• TTS: speaks the subtitle text out loud\n' +
        '• Mosaic: heavy pixelation toggle\n' +
        '• Magnifier: 1.6× preview zoom toggle\n' +
        '• Story: alert with each clip\'s duration\n' +
        '• Reverse: plays the video backwards at 15 fps\n' +
        '• Freeze: captures the current frame onto the overlay\n' +
        '• PiP Track: requests Picture-in-Picture\n' +
        '• 🌐 Free Media: opens a sheet of curated free / royalty-free sites — cinematic music (Pixabay, FMA, Bensound, Uppbeat, Mixkit, Chosic, Incompetech, YouTube Audio Library), stock video (Pexels, Pixabay, Coverr, Mixkit, Videvo, Vidsplay) and stock photos (Unsplash, Pexels, Pixabay, Burst, StockSnap, Kaboompics). Tap a row to open. Copy a direct file URL there, then paste it in Library → Add → Stocks tab to import.\n\n' +

        'CLIP-EDIT MODE (after tapping a clip)\n' +
        '• Edit: opens the subtitle / text panel\n' +
        '• Split: bisects at the playhead\n' +
        '• Replace: pick a new video to swap in\n' +
        '• Speed / Opacity: live sliders\n' +
        '• Duplicate: copies the clip\n' +
        '• Delete: removes the SELECTED frame (yellow border). With one clip left it tears down the editor instead.\n\n' +

        'DELETE A FRAME — three quick ways\n' +
        '• Easiest: red × on the top-right of every clip block on the timeline → confirm\n' +
        '• Tap the clip first (yellow border appears) → tap 🗑 Delete on the context bar\n' +
        '• Or tap 🗑 Delete on the bottom toolbar — it also targets the selected frame\n\n' +

        'EXPORT OPTIONS (when you tap ⬆ Export)\n' +
        '• File format: MP4 / MOV / WebM / MKV / AVI / WMV / AVCHD\n' +
        '• Resolution: Original / 4K / 2K / 1080p / 720p / 480p / 360p\n' +
        '• Bitrate: Low 1.5 / Medium 4 / High 8 / Best 16 Mbps\n' +
        '• "⬆ Export now" runs the encode immediately\n' +
        '• "＋ Add to queue" stacks the picked options as a job; queue more variants, then "▶ Run queue (N)" exports them sequentially\n' +
        '• "Clear queue" empties the stack\n\n' +

        'SEND-TO (after every export)\n' +
        '• 🗂 Media Library — saves the new MP4 as a standalone item\n' +
        '• ↻ Replace this app\'s video — overwrites the source video\n' +
        '• 📖 Attain book asset — saves as kind:attain for an Attain / Attain Jr book\n' +
        '• 📎 Attach to an existing app — file goes into that app\'s attachments\n\n' +

        'CUSTOM POSTER THUMBNAIL (per clip)\n' +
        '• Long-press a clip\'s thumbnail strip to open the poster sheet\n' +
        '• "Use current frame" snapshots the playhead frame as the thumbnail\n' +
        '• "Pick image…" lets you upload any image as the clip\'s thumbnail\n' +
        '• "Reset (auto)" returns to the auto-generated frame samples\n\n' +

        'COLOR / FX PRESETS\n' +
        '• ★ Preset opens the preset sheet\n' +
        '• "Save current…" snapshots Filter / FX / Blur / BG / Border / Opacity / Zoom / Mirror / Flip / Rotate / Fit as one named look\n' +
        '• Tap any saved preset to re-apply the whole look at once\n' +
        '• "Reset all FX" clears every effect; "Delete a preset…" removes one\n\n' +

        'KEYFRAMES (animate values over time)\n' +
        '• 🗝 Keyframe opens the keyframe sheet at the current playhead\n' +
        '• Set a value (e.g. Zoom 1.5×) → tap "Set Scale" to mark a kf at this time\n' +
        '• Move the playhead later, change the value, tap "Set Scale" again\n' +
        '• On playback, the editor linearly interpolates between the kfs\n' +
        '• Properties: Opacity / Scale / Rotate / Pan X / Pan Y\n' +
        '• "List + delete" shows every kf; "Clear all" wipes the active clip\'s kfs\n\n' +

        'PER-CLIP SUBTITLE TRACKS\n' +
        '• T+ on the left adds a yellow subtitle block on the timeline\n' +
        '• Drag the block to reposition; drag its edges to trim its duration\n' +
        '• Edit the text in the panel — the active block (whichever covers the current playhead) drives the on-screen overlay\n' +
        '• Multiple blocks can chain so different text shows at different times\n\n' +

        'MULTI-TRACK + LINK\n' +
        '• Music / subtitle / sticker rows now hold real positioned, draggable, trim-able blocks\n' +
        '• 🔗 Link toggle: when on, dragging any timeline block moves all blocks across all tracks together (relative timing preserved)\n\n' +

        'DRAG-TO-REORDER CLIPS\n' +
        '• Long-press (~400ms) on a clip lifts it; drag it left or right to swap with another clip\n' +
        '• Release to drop. Plain horizontal scrubs still work because motion before the press timer cancels the long-press.\n\n' +

        'SAVE vs EXPORT\n' +
        '• 💾 Save = store edits as a draft inside Load (no MP4 produced)\n' +
        '• ⬆ Export = render an actual file in your chosen format / resolution / bitrate, shareable + sent to your chosen destination'
      );
    });
    bindEd('ve-more', 'click', function () {
      var ratio = document.getElementById('ve-ratio');
      if (ratio) {
        var idx = ratio.selectedIndex || 0;
        ratio.selectedIndex = (idx + 1) % ratio.options.length;
        ratio.dispatchEvent(new Event('change'));
        toast('Aspect ratio: ' + ratio.options[ratio.selectedIndex].text, false);
      } else {
        toast('More settings: full sheet coming next.', false);
      }
    });
    bindEd('ve-save', 'click', async function () {
      var btn = document.getElementById('ve-save');
      try {
        var serializableClips = (engine.clips || []).map(function (c) {
          return { id: c.id, srcStart: c.srcStart, srcEnd: c.srcEnd };
        });
        var draft = {
          trimIn: parseFloat((trimIn || {}).value) || 0,
          trimOut: parseFloat((trimOut || {}).value) || 0,
          muteOrig: !!(document.getElementById('ve-mute-orig') || {}).checked,
          textOverlay: (document.getElementById('ve-text') || {}).value || '',
          musicVol: parseFloat((document.getElementById('ve-audio-vol') || {}).value || '0.35'),
          speed: video.playbackRate || 1,
          opacity: (typeof clipOpacity !== 'undefined') ? clipOpacity : 1,
          clips: serializableClips,
          savedAt: Date.now()
        };
        app.editorDraft = draft;
        if (typeof putApp !== 'function') throw new Error('putApp unavailable');
        await putApp(app);
        if (btn) {
          var prev = btn.innerHTML;
          btn.innerHTML = '✅';
          setTimeout(function () { btn.innerHTML = prev; }, 1200);
        }
        toast('Draft saved · ' + serializableClips.length + ' clip' + (serializableClips.length === 1 ? '' : 's') + ' at ' + new Date(draft.savedAt).toLocaleTimeString(), false);
      } catch (e) {
        toast('Could not save draft: ' + (e && e.message || e), true);
        try { console.error('[VE] save failed', e); } catch (_) {}
      }
    });
    bindEd('ve-stack', 'click', function () {
      var tracks = document.getElementById('ve-tracks');
      if (tracks) tracks.classList.toggle('ve-tracks-expanded');
    });
    bindEd('ve-undo', 'click', function () {
      toast('Undo: history stack lands with multi-clip phase.', false);
    });
    bindEd('ve-redo', 'click', function () {
      toast('Redo: history stack lands with multi-clip phase.', false);
    });

    // Link / unlink timeline elements. When linked, dragging any one
    // of the timeline elements (clip, music, subtitle, sticker) moves
    // them together so their relative timing is preserved. Toggle is
    // visual + state, the actual coupled-drag wiring lives inside
    // each element's pointermove handler (reads window.__veLinked).
    window.__veLinked = false;
    bindEd('ve-link', 'click', function () {
      window.__veLinked = !window.__veLinked;
      var btn = document.getElementById('ve-link');
      if (btn) {
        btn.classList.toggle('on', window.__veLinked);
        btn.style.background = window.__veLinked ? '#fbbf24' : '';
        btn.style.color = window.__veLinked ? '#1a1a26' : '';
        btn.title = 'Link timeline elements (' + (window.__veLinked ? 'on' : 'off') + ')';
      }
      toast(window.__veLinked ? 'Linked — text, stickers, audio move with the clip.' : 'Unlinked — each track moves independently.', false);
    });

    // Rewind / fast-forward — engine-driven so they respect clip math.
    bindEd('ve-prev', 'click', function () {
      try {
        var step = 5;
        var t = Math.max(0, (engine.t || 0) - step);
        engine.setTime(t, true);
        toast('Rewound to ' + t.toFixed(2) + 's', false);
      } catch (e) { toast('Rewind failed: ' + (e && e.message || e), true); }
    });
    bindEd('ve-next', 'click', function () {
      try {
        var step = 5;
        var max = engine.duration() || 0;
        var t = Math.min(max, (engine.t || 0) + step);
        engine.setTime(t, true);
        toast('Forward to ' + t.toFixed(2) + 's', false);
      } catch (e) { toast('Forward failed: ' + (e && e.message || e), true); }
    });

    // Cover button — opens image picker, stores app.cover (data URL),
    // previews on the button.
    bindEd('ve-cover', 'click', function () {
      var picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      picker.style.display = 'none';
      document.body.appendChild(picker);
      picker.addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) { picker.remove(); return; }
        var fr = new FileReader();
        fr.onload = function () {
          try {
            app.cover = fr.result;
            if (typeof putApp === 'function') {
              Promise.resolve(putApp(app)).catch(function () {});
            }
            var btn = document.getElementById('ve-cover');
            if (btn) {
              btn.style.background = '#000 center/cover no-repeat url("' + fr.result + '")';
              btn.style.borderStyle = 'solid';
              btn.style.color = 'transparent';
            }
            toast('Cover image set.', false);
          } catch (err) { toast('Cover save failed: ' + (err && err.message || err), true); }
          picker.remove();
        };
        fr.onerror = function () { toast('Could not read that image.', true); picker.remove(); };
        fr.readAsDataURL(f);
      });
      picker.click();
    });

    // Track-add buttons (image-box, music+, T+) on the LEFT of the
    // timeline. Each opens an appropriate picker / panel.
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-add]'), function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var kind = btn.getAttribute('data-add');
        if (kind === 'music') {
          var pkM = document.createElement('input');
          pkM.type = 'file'; pkM.accept = 'audio/*'; pkM.style.display = 'none';
          document.body.appendChild(pkM);
          pkM.addEventListener('change', async function (ev) {
            var f = ev.target.files && ev.target.files[0];
            pkM.remove();
            if (!f) return;
            try {
              if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              var buf = await audioCtx.decodeAudioData(await f.arrayBuffer());
              musicBuffer = buf;
              addTrackItem('music', { name: f.name, dur: Math.min(buf.duration, engine.duration() || buf.duration), buffer: buf });
              try { renderWaveformFor(buf); } catch (_) {}
              toast('Music added — ' + f.name + ' (' + buf.duration.toFixed(1) + 's).', false);
            } catch (err) { toast('Could not decode that audio: ' + (err && err.message || err), true); }
          });
          pkM.click();
        } else if (kind === 'text') {
          // Open the text panel + add a default 3s subtitle block at the playhead.
          showPanel('ve-text-panel');
          var existingText = (document.getElementById('ve-text') || {}).value || 'New subtitle';
          addTrackItem('text', { text: existingText, dur: 3 });
          toast('Subtitle block added. Edit text in the panel.', false);
        } else if (kind === 'sticker') {
          var pk = document.createElement('input');
          pk.type = 'file';
          pk.accept = 'image/*,video/*';
          pk.style.display = 'none';
          document.body.appendChild(pk);
          pk.addEventListener('change', function (ev) {
            var f = ev.target.files && ev.target.files[0];
            if (!f) { pk.remove(); return; }
            if (/^video\//.test(f.type)) {
              try {
                var url = URL.createObjectURL(f);
                video.src = url;
                video.addEventListener('loadedmetadata', function once() {
                  video.removeEventListener('loadedmetadata', once);
                  try { engine.clips.push({ id: 'c' + engine.clips.length, srcStart: 0, srcEnd: video.duration }); } catch (_) {}
                  try { renderClipBlocks(); } catch (_) {}
                  try { generateClipThumbnails(video, 5); } catch (_) {}
                  toast('Clip added — ' + (video.duration || 0).toFixed(2) + 's.', false);
                }, { once: true });
              } catch (err) { toast('Could not load that video: ' + err.message, true); }
            } else {
              var fr2 = new FileReader();
              fr2.onload = function () {
                var stage = document.getElementById('ve-stage');
                if (!stage) return;
                var pip = document.createElement('img');
                pip.src = fr2.result;
                pip.className = 've-pip-overlay';
                pip.style.cssText = 'position:absolute;top:20px;right:20px;width:30%;max-height:30%;border:2px solid #fbbf24;border-radius:6px;z-index:5;pointer-events:auto;cursor:move;';
                stage.appendChild(pip);
                addTrackItem('sticker', { src: fr2.result, kind: 'image', dur: 3 });
                toast('Sticker added — visible on preview + draggable on timeline.', false);
              };
              fr2.readAsDataURL(f);
            }
            pk.remove();
          });
          pk.click();
        } else if (kind === 'audio-orig') {
          // Tap opens a file picker just like the sticker / picture
          // box. Picking an audio file decodes it and loads it as
          // the timeline's music track (replacing the original).
          // Picking nothing (cancel) leaves the timeline alone.
          var pk = document.createElement('input');
          pk.type = 'file';
          pk.accept = 'audio/*';
          pk.style.display = 'none';
          document.body.appendChild(pk);
          pk.addEventListener('change', async function (ev) {
            var f = ev.target.files && ev.target.files[0];
            pk.remove();
            if (!f) return;
            try {
              if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              var buf = await audioCtx.decodeAudioData(await f.arrayBuffer());
              musicBuffer = buf;
              var muteEl = document.getElementById('ve-mute-orig');
              if (muteEl) muteEl.checked = true;
              try { video.muted = true; } catch (_) {}
              btn.classList.add('on');
              btn.style.background = '#fbbf24';
              btn.style.color = '#1a1a26';
              btn.innerHTML = '🔇';
              try { renderWaveformFor(musicBuffer); } catch (_) {}
              toast('Audio uploaded — ' + f.name + ' (' + buf.duration.toFixed(1) + 's). Original muted.', false);
            } catch (e) { toast('Could not decode that audio: ' + (e && e.message || e), true); }
          });
          pk.click();
        }
      });
    });

    // ---- Export ----
    document.getElementById('ve-export').addEventListener('click', function () { openExportOptions(); });

    // Export options sheet — runs BEFORE the encode so the user can
    // pick format, resolution, and bitrate. iPad Safari's
    // MediaRecorder natively emits MP4 (H.264 + AAC); WebM is
    // emitted on Chrome / Firefox. The other formats (MOV, AVI,
    // MKV, WMV, AVCHD) are not produced by any browser today, so
    // we either: (a) save the H.264 MP4 stream with the requested
    // extension when the container is byte-compatible (MOV ←→ MP4
    // both use ISO BMFF and QuickTime accepts either), or (b) flag
    // the format as "desktop converter required" and produce an
    // MP4 alongside.
    var EXPORT_FORMATS = [
      { key: 'mp4',   label: 'MP4',    ext: '.mp4',   mime: 'video/mp4',          note: 'Universal · web + social' },
      { key: 'mov',   label: 'MOV',    ext: '.mov',   mime: 'video/mp4',          note: 'Apple QuickTime · same H.264' },
      { key: 'webm',  label: 'WebM',   ext: '.webm',  mime: 'video/webm',         note: 'Web · Chrome / Firefox' },
      { key: 'mkv',   label: 'MKV',    ext: '.mkv',   mime: 'video/x-matroska',   note: 'Saves as MP4 — rename only' },
      { key: 'avi',   label: 'AVI',    ext: '.avi',   mime: 'video/avi',          note: 'Saves as MP4 — rename only' },
      { key: 'wmv',   label: 'WMV',    ext: '.wmv',   mime: 'video/x-ms-wmv',     note: 'Saves as MP4 — rename only' },
      { key: 'mts',   label: 'AVCHD',  ext: '.mts',   mime: 'video/avchd',        note: 'Saves as MP4 — rename only' }
    ];
    var EXPORT_RESOLUTIONS = [
      { key: 'src',   label: 'Original' },
      { key: '2160',  label: '4K (2160p)' },
      { key: '1440',  label: '2K (1440p)' },
      { key: '1080',  label: '1080p' },
      { key: '720',   label: '720p' },
      { key: '480',   label: '480p' },
      { key: '360',   label: '360p' }
    ];
    var EXPORT_BITRATES = [
      { key: 'low',    label: 'Low · 1.5 Mbps',  bps: 1500000 },
      { key: 'med',    label: 'Medium · 4 Mbps', bps: 4000000 },
      { key: 'high',   label: 'High · 8 Mbps',   bps: 8000000 },
      { key: 'best',   label: 'Best · 16 Mbps',  bps: 16000000 }
    ];

    // Send-To sheet — runs AFTER export to route the new MP4 blob.
    function openSendToSheet() {
      return new Promise(function (resolve) {
        var others = (apps || []).filter(function (a) { return a.id !== app.id; }).slice(0, 18);
        var menu = document.createElement('div');
        menu.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:3500;display:flex;align-items:flex-end;justify-content:center;';
        var attachList = others.length
          ? others.map(function (a) {
              return '<button class="ve-sendto-opt" data-key="attach:' + a.id + '">' +
                '<div style="font-weight:700;">📎 ' + (a.name || 'App').replace(/[<>&]/g,'').slice(0,40) + '</div>' +
                '<div style="font-size:9.5px;opacity:0.7;font-weight:400;line-height:1.2;margin-top:2px;">Attach as asset · ' + (a.kind || 'app') + '</div>' +
              '</button>';
            }).join('')
          : '<div style="font-size:12px;color:#7a7a8a;padding:10px;">No other apps to attach to.</div>';
        menu.innerHTML =
          '<div style="background:#1a1a26;color:#fff;width:100%;max-width:560px;border-top-left-radius:16px;border-top-right-radius:16px;padding:14px 14px max(14px,env(safe-area-inset-bottom));max-height:80vh;overflow-y:auto;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
              '<h3 style="margin:0;font-size:17px;font-weight:700;">Send To</h3>' +
              '<button id="ve-send-close" style="background:transparent;border:none;color:#cfcfdc;font-size:22px;cursor:pointer;line-height:1;">×</button>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:8px;">' +
              '<button class="ve-sendto-opt" data-key="library"><div style="font-weight:700;">🗂 Media Library</div><div style="font-size:9.5px;opacity:0.7;font-weight:400;line-height:1.2;margin-top:2px;">Save the new MP4 as a standalone item in your Library (default)</div></button>' +
              '<button class="ve-sendto-opt" data-key="replace"><div style="font-weight:700;">↻ Replace this app\'s video</div><div style="font-size:9.5px;opacity:0.7;font-weight:400;line-height:1.2;margin-top:2px;">Overwrite the source video with the edited export</div></button>' +
              '<button class="ve-sendto-opt" data-key="attain"><div style="font-weight:700;">📖 Attain book asset</div><div style="font-size:9.5px;opacity:0.7;font-weight:400;line-height:1.2;margin-top:2px;">Save as a kind:attain video for use in an Attain / Attain Jr book project</div></button>' +
              '<div style="font-size:11px;color:#7a7a8a;margin:8px 4px 4px;letter-spacing:0.04em;">ATTACH TO AN EXISTING APP</div>' +
              attachList +
            '</div>' +
          '</div>' +
          '<style>.ve-sendto-opt{background:#2a2a40;border:1.5px solid transparent;color:#fff;border-radius:10px;padding:12px 12px;font-family:inherit;font-size:13px;cursor:pointer;text-align:left;}.ve-sendto-opt:active{transform:scale(0.98);}</style>';
        document.body.appendChild(menu);
        var done = function (k) { try { menu.remove(); } catch (_) {} resolve(k); };
        menu.addEventListener('click', function (e) { if (e.target === menu) done('library'); });
        document.getElementById('ve-send-close').addEventListener('click', function () { done('library'); });
        Array.prototype.forEach.call(menu.querySelectorAll('.ve-sendto-opt'), function (b) {
          b.addEventListener('click', function () { done(b.getAttribute('data-key')); });
        });
      });
    }

    function openExportOptions() {
      var picked = { format: 'mp4', resolution: 'src', bitrate: 'med' };
      var menu = document.createElement('div');
      menu.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:3500;display:flex;align-items:flex-end;justify-content:center;';
      function rowHtml(group, list, sel) {
        return '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
          list.map(function (o) {
            var on = (o.key === sel) ? 'background:#fbbf24;color:#1a1a26;border-color:#fbbf24;' : '';
            var note = o.note ? '<div style="font-size:9.5px;opacity:0.7;font-weight:400;line-height:1.2;margin-top:2px;">' + o.note + '</div>' : '';
            return '<button class="ve-exp-opt" data-group="' + group + '" data-key="' + o.key + '" style="' + on + '">' +
              '<div style="font-weight:700;">' + o.label + '</div>' + note + '</button>';
          }).join('') +
        '</div>';
      }
      function render() {
        menu.querySelector('#ve-exp-format').innerHTML = rowHtml('format', EXPORT_FORMATS, picked.format);
        menu.querySelector('#ve-exp-res').innerHTML    = rowHtml('resolution', EXPORT_RESOLUTIONS, picked.resolution);
        menu.querySelector('#ve-exp-rate').innerHTML   = rowHtml('bitrate', EXPORT_BITRATES, picked.bitrate);
        Array.prototype.forEach.call(menu.querySelectorAll('.ve-exp-opt'), function (b) {
          b.addEventListener('click', function () {
            picked[b.getAttribute('data-group')] = b.getAttribute('data-key');
            render();
          });
        });
      }
      menu.innerHTML =
        '<div style="background:#1a1a26;color:#fff;width:100%;max-width:560px;border-top-left-radius:16px;border-top-right-radius:16px;padding:14px 14px max(14px,env(safe-area-inset-bottom));max-height:80vh;overflow-y:auto;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
            '<h3 style="margin:0;font-size:17px;font-weight:700;">Export options</h3>' +
            '<button id="ve-exp-close" style="background:transparent;border:none;color:#cfcfdc;font-size:22px;cursor:pointer;line-height:1;">×</button>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:14px;">' +
            '<div><div style="font-size:12px;font-weight:700;color:#cfcfdc;margin-bottom:6px;letter-spacing:0.04em;">FILE FORMAT</div><div id="ve-exp-format"></div></div>' +
            '<div><div style="font-size:12px;font-weight:700;color:#cfcfdc;margin-bottom:6px;letter-spacing:0.04em;">RESOLUTION</div><div id="ve-exp-res"></div></div>' +
            '<div><div style="font-size:12px;font-weight:700;color:#cfcfdc;margin-bottom:6px;letter-spacing:0.04em;">BITRATE</div><div id="ve-exp-rate"></div></div>' +
            '<div style="display:flex;gap:8px;margin-top:6px;">' +
              '<button id="ve-exp-go" style="flex:1;background:#1d6fff;color:#fff;border:none;padding:14px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;">⬆ Export now</button>' +
              '<button id="ve-exp-queue" style="flex:1;background:#2a2a40;color:#fff;border:1.5px solid #3a3a55;padding:14px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;">＋ Add to queue</button>' +
            '</div>' +
            '<button id="ve-exp-runqueue" style="background:#fbbf24;color:#1a1a26;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:4px;">▶ Run queue (' + ((window.__veQueue && window.__veQueue.length) || 0) + ')</button>' +
            '<button id="ve-exp-clearqueue" style="background:transparent;color:#cfcfdc;border:none;padding:8px;border-radius:10px;font-size:12px;cursor:pointer;">Clear queue</button>' +
          '</div>' +
        '</div>' +
        '<style>' +
          '.ve-exp-opt{flex:1 1 calc(33.33% - 6px);min-width:96px;background:#2a2a40;border:1.5px solid transparent;color:#fff;border-radius:10px;padding:10px 8px;font-family:inherit;font-size:13px;cursor:pointer;text-align:left;}' +
          '.ve-exp-opt:active{transform:scale(0.96);}' +
        '</style>';
      document.body.appendChild(menu);
      var close = function () { try { menu.remove(); } catch (_) {} };
      menu.addEventListener('click', function (e) { if (e.target === menu) close(); });
      document.getElementById('ve-exp-close').addEventListener('click', close);
      render();
      document.getElementById('ve-exp-go').addEventListener('click', function () {
        close();
        exportMp4(picked);
      });
      document.getElementById('ve-exp-queue').addEventListener('click', function () {
        window.__veQueue = window.__veQueue || [];
        window.__veQueue.push(JSON.parse(JSON.stringify(picked)));
        toast('Added to queue (' + window.__veQueue.length + ').', false);
        // Update the button label without closing the sheet so the user
        // can queue up more variants in one session.
        var btn = document.getElementById('ve-exp-runqueue');
        if (btn) btn.textContent = '▶ Run queue (' + window.__veQueue.length + ')';
      });
      document.getElementById('ve-exp-runqueue').addEventListener('click', async function () {
        var q = (window.__veQueue || []).slice();
        if (!q.length) { toast('Queue is empty — Add to queue first.', true); return; }
        close();
        toast('Running ' + q.length + ' export job' + (q.length === 1 ? '' : 's') + '…', false);
        for (var i = 0; i < q.length; i++) {
          var label = (i + 1) + '/' + q.length;
          toast('Queue ' + label + ' starting…', false);
          try { await exportMp4(q[i]); } catch (e) { toast('Queue ' + label + ' failed: ' + (e && e.message || e), true); }
        }
        window.__veQueue = [];
        toast('Queue done.', false);
      });
      document.getElementById('ve-exp-clearqueue').addEventListener('click', function () {
        window.__veQueue = [];
        var btn = document.getElementById('ve-exp-runqueue');
        if (btn) btn.textContent = '▶ Run queue (0)';
        toast('Queue cleared.', false);
      });
    }

    async function exportMp4(opts) {
      opts = opts || { format: 'mp4', resolution: 'src', bitrate: 'med' };
      var fmt = EXPORT_FORMATS.filter(function (f) { return f.key === opts.format; })[0] || EXPORT_FORMATS[0];
      var resPick = EXPORT_RESOLUTIONS.filter(function (r) { return r.key === opts.resolution; })[0] || EXPORT_RESOLUTIONS[0];
      var bratePick = EXPORT_BITRATES.filter(function (b) { return b.key === opts.bitrate; })[0] || EXPORT_BITRATES[1];
      if (!('MediaRecorder' in window)) { toast('Your browser does not support MediaRecorder.', true); return; }
      // Multi-clip aware export. Walks engine.clips[] in order so a
      // 5s clip split at 2s into [A=0..2s, B=2..5s] then reordered
      // to [B, A] exports as B's range followed by A's range. The
      // canvas captureStream continues through between-clip seeks
      // so the recorder gets one continuous video stream.
      var clipsToExport = (engine.clips || []).slice();
      if (!clipsToExport.length) { toast('No clips to export.', true); return; }
      var totalLen = clipsToExport.reduce(function (s, c) { return s + (c.srcEnd - c.srcStart); }, 0);
      if (totalLen < 0.2) { toast('Total trimmed length is too short.', true); return; }
      muteOrig = document.getElementById('ve-mute-orig').checked;

      // Pick the actual MIME the browser can encode. For WebM the
      // user's choice maps directly. For MP4 / MOV / MKV / AVI / WMV /
      // AVCHD we encode H.264 inside an MP4 container — the file is
      // saved with the requested extension. MOV is byte-compatible
      // with MP4 (both ISO BMFF) so QuickTime accepts it natively.
      // The other "rename only" formats may not play in apps that
      // strictly validate the container header — that's why the
      // sheet labels them as such.
      var pickMime = (function () {
        var pref = (fmt.key === 'webm')
          ? ['video/webm;codecs=h264', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
          : ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp8'];
        for (var i = 0; i < pref.length; i++) if (MediaRecorder.isTypeSupported(pref[i])) return pref[i];
        return '';
      })();
      var actuallyWebm = pickMime.indexOf('webm') >= 0;

      var prog = document.getElementById('ve-progress');
      var fill = document.getElementById('ve-progress-fill');
      var label = document.getElementById('ve-progress-label');
      prog.style.display = 'flex';
      fill.style.width = '0%'; label.textContent = 'Preparing…';

      // Off-screen render canvas — same size as video, used to composite
      // both the live video frame AND the text overlay each frame.
      var rc = document.createElement('canvas');
      var srcW = video.videoWidth || 1280;
      var srcH = video.videoHeight || 720;
      // Resolution scaling — keep aspect, scale by the long edge
      // matching the picked target (or use source if 'src').
      if (resPick.key === 'src') {
        rc.width = srcW; rc.height = srcH;
      } else {
        var targetH = parseInt(resPick.key, 10);
        var aspect = srcW / srcH;
        rc.height = targetH;
        rc.width = Math.round(targetH * aspect);
        // Keep dimensions even (some encoders reject odd numbers).
        if (rc.width % 2) rc.width++;
        if (rc.height % 2) rc.height++;
      }
      var rctx = rc.getContext('2d');

      // Build streams
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var dest = audioCtx.createMediaStreamDestination();

      // Original-video audio: capture via captureStream() and route into the
      // mix unless the user muted it.
      var videoStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null);
      if (videoStream && !muteOrig) {
        var origTracks = videoStream.getAudioTracks();
        if (origTracks.length) {
          var srcEl = audioCtx.createMediaStreamSource(new MediaStream([origTracks[0]]));
          srcEl.connect(dest);
        }
      }
      // Music: BufferSource into dest at current volume
      var recMusicSource = null, recMusicGain = null;
      if (musicBuffer) {
        recMusicSource = audioCtx.createBufferSource();
        recMusicSource.buffer = musicBuffer;
        recMusicSource.loop = true;
        recMusicGain = audioCtx.createGain();
        recMusicGain.gain.value = musicVol;
        recMusicSource.connect(recMusicGain).connect(dest);
      }

      var canvasStream = rc.captureStream(30);
      // Combine canvas video tracks with the mixed audio destination.
      var combined = new MediaStream();
      canvasStream.getVideoTracks().forEach(function (t) { combined.addTrack(t); });
      dest.stream.getAudioTracks().forEach(function (t) { combined.addTrack(t); });

      var rec = new MediaRecorder(combined, pickMime ? { mimeType: pickMime, videoBitsPerSecond: bratePick.bps } : { videoBitsPerSecond: bratePick.bps });
      var chunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      var stopped = false;
      rec.onstop = async function () {
        if (stopped) return;
        stopped = true;
        try { if (recMusicSource) recMusicSource.stop(); } catch (_) {}
        // Encoded blob has the actual encoded MIME (mp4 or webm). When
        // the user picked a non-encoded container (MOV / MKV / AVI /
        // WMV / AVCHD) we keep the underlying MP4 bytes but save with
        // the requested extension, since the browser can't transcode
        // those containers natively. MOV in particular plays cleanly
        // because .mov is byte-compatible with MP4 (ISO BMFF).
        var actualMime = actuallyWebm ? 'video/webm' : 'video/mp4';
        var blob = new Blob(chunks, { type: actualMime });
        var ext = fmt.ext;
        // If the user picked WebM but the device can only encode MP4,
        // honour reality and save as .mp4 with a toast.
        if (fmt.key === 'webm' && !actuallyWebm) {
          ext = '.mp4';
          toast('WebM not supported on this device — saving as MP4.', false);
        }
        // If the user picked MP4 but only WebM was available, save as .webm.
        if (fmt.key !== 'webm' && actuallyWebm && (fmt.key === 'mp4' || fmt.key === 'mov')) {
          ext = '.webm';
          toast('MP4 not supported on this browser — saving as WebM.', false);
        }
        var safeName = String(app.name || 'video').replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || 'video';
        var qualityTag = (resPick.key === 'src') ? '' : '-' + resPick.key + 'p';
        prog.style.display = 'none';
        await shareBlobOrDownload(blob, safeName + '-edit' + qualityTag + ext, blob.type,
          'Exported ' + safeName + '-edit' + qualityTag + ext + ' (' + bratePick.label + ').');
        // Send-To sheet: route the export to one or more destinations.
        // Always-on default = Media Library; user can additionally attach
        // to an existing app, replace this app's binary, or prepare an
        // Attain book asset.
        try {
          var dest = await openSendToSheet();
          var fileName = safeName + '-edit' + qualityTag + ext;
          if (!dest || dest === 'library') {
            var newApp = {
              id: newId(), name: safeName + ' (edited)', kind: 'media', subKind: 'video',
              mime: blob.type, binary: blob, dateAdded: Date.now(), lastOpened: null,
              sizeBytes: blob.size
            };
            await putApp(newApp);
            apps.push(newApp);
            renderLibrary && renderLibrary();
            updateHomeCounts && updateHomeCounts();
            toast('Saved to Media Library: ' + fileName, false);
          } else if (dest === 'replace') {
            app.binary = blob;
            app.mime = blob.type;
            app.sizeBytes = blob.size;
            app.lastOpened = Date.now();
            await putApp(app);
            renderLibrary && renderLibrary();
            toast('Replaced this app\'s video with the new export.', false);
          } else if (dest === 'attain') {
            var bookApp = {
              id: newId(), name: safeName + ' (Attain video)', kind: 'attain', subKind: 'video',
              mime: blob.type, binary: blob, dateAdded: Date.now(), lastOpened: null,
              sizeBytes: blob.size, attainAsset: true
            };
            await putApp(bookApp);
            apps.push(bookApp);
            renderLibrary && renderLibrary();
            updateHomeCounts && updateHomeCounts();
            toast('Saved as Attain book asset: ' + fileName, false);
          } else if (dest && dest.indexOf('attach:') === 0) {
            var targetId = dest.slice('attach:'.length);
            var target = apps.filter(function (a) { return a.id === targetId; })[0];
            if (target) {
              target.attachments = target.attachments || [];
              target.attachments.push({ name: fileName, mime: blob.type, binary: blob, sizeBytes: blob.size, dateAdded: Date.now() });
              await putApp(target);
              renderLibrary && renderLibrary();
              toast('Attached to ' + (target.name || 'app') + '.', false);
            } else {
              toast('Target app not found — saved to Media Library instead.', false);
            }
          }
        } catch (e) { try { console.warn('[VE] send-to failed', e); } catch (_) {} }
      };

      video.muted = muteOrig;
      // Helper: paint one frame onto the render canvas + overlay
      function paintFrame() {
        rctx.drawImage(video, 0, 0, rc.width, rc.height);
        var t = (document.getElementById('ve-text').value || '').trim();
        if (t) {
          var pos = document.getElementById('ve-text-pos').value;
          var size = parseInt(document.getElementById('ve-text-size').value, 10) || 48;
          var color = document.getElementById('ve-text-color').value;
          var bg = document.getElementById('ve-text-bg').value;
          var w = rc.width, h = rc.height;
          var pad = Math.round(size * 0.6);
          var lineH = Math.round(size * 1.25);
          rctx.font = '700 ' + size + 'px -apple-system,sans-serif';
          rctx.textAlign = 'center'; rctx.textBaseline = 'middle';
          var lines = wrapTextLines(rctx, t, w - pad * 2);
          var blockH = lines.length * lineH + pad;
          var y = pos === 'top' ? pad + lineH / 2
                : pos === 'middle' ? (h / 2 - blockH / 2 + lineH / 2)
                : (h - blockH + lineH / 2);
          if (bg === 'black') { rctx.fillStyle = 'rgba(0,0,0,0.55)'; rctx.fillRect(0, y - lineH / 2 - pad / 2, w, blockH + pad / 2); }
          else if (bg === 'white') { rctx.fillStyle = 'rgba(255,255,255,0.78)'; rctx.fillRect(0, y - lineH / 2 - pad / 2, w, blockH + pad / 2); }
          rctx.fillStyle = color;
          rctx.shadowColor = 'rgba(0,0,0,0.5)';
          rctx.shadowBlur = bg === 'none' ? Math.round(size * 0.12) : 0;
          lines.forEach(function (line, i) { rctx.fillText(line, w / 2, y + i * lineH); });
          rctx.shadowBlur = 0;
        }
      }
      // Seek the video to a source time, await the seeked event.
      function seekTo(srcT) {
        return new Promise(function (resolve) {
          var done = false;
          var fin = function () { if (done) return; done = true; resolve(); };
          var on = function () { video.removeEventListener('seeked', on); fin(); };
          video.addEventListener('seeked', on);
          try { video.currentTime = srcT; } catch (e) { fin(); return; }
          // Hard cap so we don't stall if Safari refuses the seek.
          setTimeout(fin, 600);
        });
      }
      // Start recorder + music
      rec.start();
      if (recMusicSource) try { recMusicSource.start(); } catch (e) {}
      label.textContent = 'Exporting…';
      var elapsed = 0;
      // Walk clips in engine order. For each, seek to its srcStart,
      // play until srcEnd is reached, paint frames continuously.
      for (var ci = 0; ci < clipsToExport.length; ci++) {
        if (stopped) break;
        var clip = clipsToExport[ci];
        await seekTo(clip.srcStart);
        try { await video.play(); } catch (e) { toast('Cannot start playback for export.', true); rec.stop(); return; }
        var clipDur = clip.srcEnd - clip.srcStart;
        // Per-clip frame loop. Paint until we hit srcEnd or video pauses.
        await new Promise(function (resolve) {
          var endSrc = clip.srcEnd;
          var idxLocal = ci, totalIdx = clipsToExport.length;
          var stepStart = elapsed;
          function step() {
            if (stopped) return resolve();
            paintFrame();
            var local = video.currentTime - clip.srcStart;
            elapsed = stepStart + Math.max(0, local);
            var pct = Math.min(100, Math.round((elapsed / totalLen) * 100));
            fill.style.width = pct + '%';
            label.textContent = 'Exporting clip ' + (idxLocal + 1) + '/' + totalIdx + '… ' + pct + '%';
            if (video.currentTime >= endSrc - 0.02 || video.paused) {
              video.pause();
              return resolve();
            }
            requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        });
        // Move our running counter forward by this clip's full duration
        // (the per-clip loop may have stopped slightly under endSrc).
        elapsed = elapsed > 0 ? elapsed : clipDur;
      }
      // All clips exported — stop recorder
      try { rec.stop(); } catch (e) {}
    }

    document.getElementById('ve-close').addEventListener('click', function () {
      try { video.pause(); } catch (e) {}
      stopPreviewMusic();
      try { URL.revokeObjectURL(blobUrl); } catch (e) {}
      wrap.remove();
    });

    /* FORCE-FIX TEST CLIP — verbatim from user spec. This block
       runs UNCONDITIONALLY at editor open. If it does NOT appear,
       the issue is CSS / layout / parent container clipping. If it
       DOES appear, the issue is render / data logic and we know
       where to look. Inline + .force-test-clip CSS rules use
       !important to defeat every other rule on the page. */
    (function forceMount() {
      var stripEl = document.getElementById('ve-clip-strip');
      if (!stripEl) {
        try { console.error('[VE] #ve-clip-strip MISSING from DOM after mount'); } catch (_) {}
        return;
      }
      // Inject the test markup user specified, byte-for-byte.
      stripEl.innerHTML =
        '<div class="timeline-clip selected force-test-clip">' +
          '<div class="clip-add left">+</div>' +
          '<div class="thumbnail-strip">' +
            '<div class="thumbnail-frame">TEST CLIP</div>' +
          '</div>' +
          '<div class="clip-duration">5.04s</div>' +
          '<div class="trim-handle trim-left"></div>' +
          '<div class="trim-handle trim-right"></div>' +
          '<div class="clip-add right">+</div>' +
        '</div>';
      try { console.log('[VE] forceMount: test clip injected. stripEl=', stripEl, 'children=', stripEl.children.length); } catch (_) {}
      try { renderRuler(); } catch (e) {}
    })();
  }

  // Expose so tile menus / library can also open the editor on a video
  window.openVideoEditor = openVideoEditor;

  function wireMetadataBtn() {
    var btn = $('metadata-btn');
    if (btn) btn.addEventListener('click', function () {
      if (currentApp) openMetadataManager(currentApp);
      else toast('Open a manuscript first.', true);
    });
  }

  /* ---------- Package as native app ----------
     Walks the user through turning their PWA into a real iOS app
     (.ipa) or Android app (.apk / .aab) via pwabuilder.com. We
     don't run the build ourselves -- iOS app signing requires Apple
     Developer credentials and Xcode, neither of which exist on iPad.
     What we DO is:
       1. Help them upload their PWA somewhere PWABuilder can reach
          (the standalone HTML for free upload, or a hosted URL).
       2. Pre-fill the manifest checks PWABuilder runs (icon sizes,
          theme color, display mode, start_url).
       3. Tell them, step by step, what to do on pwabuilder.com.
       4. List exactly what's free vs paid (sideload vs App Store
          submission). */
  function openPackageWalkthrough(app) {
    if (!app) { toast('Open a PWA first.', true); return; }
    var existing = document.getElementById('__loadPackage');
    if (existing) existing.remove();

    var checks = runManifestChecks(app);

    var wrap = document.createElement('div');
    wrap.id = '__loadPackage';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2050;display:flex;flex-direction:column;background:#0f0f1a;color:#f0f0f0;font-family:-apple-system,sans-serif;';

    var checkRows = checks.map(function (c) {
      var icon = c.level === 'pass' ? '✅' : c.level === 'warn' ? '⚠️' : '❌';
      var border = c.level === 'pass' ? '#22c55e' : c.level === 'warn' ? '#fbbf24' : '#ef4444';
      return '<div style="border-left:3px solid ' + border + ';padding:8px 12px;margin-bottom:6px;background:#1a1a2e;border-radius:6px;font-size:13.5px;">' +
        '<span style="margin-right:6px;">' + icon + '</span>' + escHtml(c.msg) +
        (c.fix ? '<div style="font-size:12px;color:#a0a0b0;margin-top:3px;">Fix: ' + escHtml(c.fix) + '</div>' : '') +
      '</div>';
    }).join('');

    wrap.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1a1a2e;border-bottom:1px solid #2a2a40;">' +
        '<button id="pk-close" style="background:#3a3a55;border:none;color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;cursor:pointer;">&larr; Close</button>' +
        '<div style="font-weight:700;font-size:15px;margin-right:auto;">Package as native app &mdash; ' + escHtml(app.name || 'Untitled') + '</div>' +
      '</div>' +
      '<div style="flex:1;overflow-y:auto;padding:18px 22px;max-width:880px;width:100%;margin:0 auto;line-height:1.55;">' +
        '<p style="font-size:14px;color:#cfcfdc;margin:0 0 16px;">Load + <strong>PWABuilder</strong> turns this PWA into a real iOS or Android app. PWABuilder is free and runs in your iPad browser. Apple App Store submission still needs an <strong>Apple Developer account ($99/yr)</strong>; sideload + TestFlight + Android sideload do not.</p>' +

        '<h3 style="font-size:15px;color:#f0f0f0;margin:18px 0 8px;">Step 1 &mdash; Pre-flight</h3>' +
        '<p style="font-size:13.5px;color:#cfcfdc;margin:0 0 8px;">PWABuilder needs a hosted URL or a packaged ZIP. Load checked your manifest:</p>' +
        checkRows +

        '<h3 style="font-size:15px;color:#f0f0f0;margin:22px 0 8px;">Step 2 &mdash; Pick how PWABuilder will see your PWA</h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
          '<div style="background:#1a1a2e;border:1px solid #2a2a40;border-radius:8px;padding:14px;">' +
            '<div style="font-weight:700;color:#f0f0f0;margin-bottom:6px;">A. Hosted URL (recommended)</div>' +
            '<p style="font-size:13px;color:#cfcfdc;margin:0 0 8px;">If your PWA is hosted somewhere with HTTPS (GitHub Pages, Netlify, Vercel, your own domain), PWABuilder reads it directly.</p>' +
            '<p style="font-size:12px;color:#a0a0b0;margin:0;">Example: <code>https://load.dssorit.app/</code></p>' +
          '</div>' +
          '<div style="background:#1a1a2e;border:1px solid #2a2a40;border-radius:8px;padding:14px;">' +
            '<div style="font-weight:700;color:#f0f0f0;margin-bottom:6px;">B. Standalone ZIP</div>' +
            '<p style="font-size:13px;color:#cfcfdc;margin:0 0 8px;">Export this PWA as a self-contained zip, host it on a free static-host service, then point PWABuilder at the resulting URL.</p>' +
            '<button id="pk-export-zip" style="background:#7b6cff;border:none;color:#12121a;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">Export PWA as ZIP</button>' +
          '</div>' +
        '</div>' +

        '<h3 style="font-size:15px;color:#f0f0f0;margin:22px 0 8px;">Step 3 &mdash; Open PWABuilder</h3>' +
        '<p style="font-size:13.5px;color:#cfcfdc;margin:0 0 10px;">Tap the button below. PWABuilder will scan your PWA and show three buttons: <strong>Package for Stores</strong> &rarr; iOS / Android / Windows. Use iOS and Android only.</p>' +
        '<a id="pk-pwabuilder" href="https://www.pwabuilder.com/" target="_blank" rel="noopener" style="display:inline-block;background:#22c55e;color:#062013;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">📦 Open pwabuilder.com</a>' +

        '<h3 style="font-size:15px;color:#f0f0f0;margin:22px 0 8px;">Step 4 &mdash; iOS package (.ipa)</h3>' +
        '<ol style="font-size:13.5px;color:#cfcfdc;margin:0 0 10px 18px;padding:0;">' +
          '<li>On PWABuilder, click <strong>Package for Stores → iOS</strong>.</li>' +
          '<li>Fill in the form: bundle id (e.g. <code>app.dssorit.load</code>), display name, version (start at 1.0.0).</li>' +
          '<li>Tap <strong>Download Package</strong>. You get a ZIP with an Xcode project + a signed-source <code>.ipa</code>.</li>' +
          '<li>Distribution paths:' +
            '<ul style="margin:6px 0;padding-left:18px;">' +
              '<li><strong>App Store:</strong> needs Apple Developer ($99/yr) + a Mac running Xcode to upload via App Store Connect.</li>' +
              '<li><strong>TestFlight beta:</strong> same Apple Developer account required, but you can share with up to 10,000 testers without going through review first.</li>' +
              '<li><strong>Sideload:</strong> use a service like <a href="https://altstore.io/" target="_blank" rel="noopener" style="color:#7b6cff;">AltStore</a> or <a href="https://sideloadly.io/" target="_blank" rel="noopener" style="color:#7b6cff;">Sideloadly</a>. Re-sign every 7 days unless you have a paid Apple Developer cert.</li>' +
            '</ul>' +
          '</li>' +
        '</ol>' +

        '<h3 style="font-size:15px;color:#f0f0f0;margin:22px 0 8px;">Step 5 &mdash; Android package (.apk / .aab)</h3>' +
        '<ol style="font-size:13.5px;color:#cfcfdc;margin:0 0 10px 18px;padding:0;">' +
          '<li>On PWABuilder, click <strong>Package for Stores → Android</strong>.</li>' +
          '<li>Fill in the form: package id, display name, splash screen color, signing key (PWABuilder can generate one for you).</li>' +
          '<li>Tap <strong>Download Package</strong>. You get a ZIP with both <code>.apk</code> (sideload) and <code>.aab</code> (Play Store).</li>' +
          '<li>Distribution paths:' +
            '<ul style="margin:6px 0;padding-left:18px;">' +
              '<li><strong>Google Play:</strong> $25 one-time fee, upload the <code>.aab</code>.</li>' +
              '<li><strong>Sideload:</strong> share the <code>.apk</code> directly. User taps it on their Android phone, accepts "install from unknown sources", done. No fees, no Google account.</li>' +
              '<li><strong>Amazon Appstore:</strong> free for developers, also accepts <code>.apk</code>.</li>' +
            '</ul>' +
          '</li>' +
        '</ol>' +

        '<h3 style="font-size:15px;color:#f0f0f0;margin:22px 0 8px;">Cost summary (worst case)</h3>' +
        '<div style="background:#1a1a2e;border:1px solid #2a2a40;border-radius:8px;padding:12px 14px;font-size:13px;color:#cfcfdc;">' +
          '<div>📱 <strong>iOS App Store:</strong> $99/yr Apple Developer + a Mac (or rent one — MacInCloud ~$30/mo).</div>' +
          '<div>🤖 <strong>Google Play Store:</strong> $25 one-time.</div>' +
          '<div>📦 <strong>PWABuilder:</strong> free.</div>' +
          '<div>↪️ <strong>Sideloading both:</strong> $0.</div>' +
        '</div>' +

        '<p style="font-size:12.5px;color:#a0a0b0;margin:18px 0 0;">Load only ships to iOS and Android; Windows / desktop targets are intentionally left out so users always know they\'re getting a mobile-native app.</p>' +
      '</div>';

    document.body.appendChild(wrap);
    document.getElementById('pk-close').addEventListener('click', function () { wrap.remove(); });
    document.getElementById('pk-export-zip').addEventListener('click', async function () {
      // Reuse the standalone-share path that already produces a single
      // self-contained HTML; for PWABuilder zip, we want a multi-file
      // bundle. The simplest cross-version answer is to produce a zip
      // containing index.html + manifest.json so PWABuilder finds both.
      try {
        var zip = new JSZip();
        var bundle = await buildEnhancedShareHtml(app);
        zip.file('index.html', bundle);
        var manifest = {
          name: app.name || 'My App',
          short_name: (app.name || 'App').slice(0, 12),
          start_url: 'index.html',
          display: 'standalone',
          background_color: '#1a1a3e',
          theme_color: '#7b6cff',
          icons: app.coverDesign && app.coverDesign.imageDataUrl
            ? [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }]
            : []
        };
        zip.file('manifest.json', JSON.stringify(manifest, null, 2));
        var blob = await zip.generateAsync({ type: 'blob' });
        var safeName = String(app.name || 'pwa').replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || 'pwa';
        await shareBlobOrDownload(blob, safeName + '-pwa.zip', 'application/zip',
          'PWA bundle exported. Upload to a static host (GitHub Pages / Netlify), then paste the URL into pwabuilder.com.');
      } catch (e) {
        toast('Could not export ZIP: ' + (e && e.message), true);
      }
    });
  }

  function runManifestChecks(app) {
    var checks = [];
    var html = app.html || '';

    // Title / name
    if (app.name && app.name.length >= 3) {
      checks.push({ level: 'pass', msg: 'App name is set: "' + app.name + '"' });
    } else {
      checks.push({ level: 'fail', msg: 'No app name on the record.', fix: 'Tap rename in the library tile menu.' });
    }

    // Manifest in source
    var hasManifest = /<link\s+rel=["']manifest["']/i.test(html);
    if (hasManifest) {
      checks.push({ level: 'pass', msg: 'manifest.json link tag is in the HTML head.' });
    } else {
      checks.push({ level: 'warn', msg: 'No <link rel="manifest"> in the HTML.',
        fix: 'PWABuilder generates a manifest if missing, but a hand-written one gives you control over icon, theme color and start URL.' });
    }

    // Icons in HTML head
    var hasAppleIcon = /apple-touch-icon/i.test(html);
    if (hasAppleIcon) {
      checks.push({ level: 'pass', msg: 'apple-touch-icon present (iOS home-screen icon).' });
    } else {
      checks.push({ level: 'warn', msg: 'No apple-touch-icon link.',
        fix: 'Add <link rel="apple-touch-icon" href="...">. PWABuilder uses this for the iOS app icon.' });
    }

    // Theme color
    var hasTheme = /<meta\s+name=["']theme-color["']/i.test(html);
    if (hasTheme) {
      checks.push({ level: 'pass', msg: 'theme-color meta tag present.' });
    } else {
      checks.push({ level: 'warn', msg: 'No theme-color meta tag.',
        fix: 'Add <meta name="theme-color" content="#xxxxxx"> to set the system bar color in the packaged app.' });
    }

    // Service worker hint (PWABuilder requires one for installability)
    var hasSw = /serviceWorker\.register/.test(html);
    if (hasSw) {
      checks.push({ level: 'pass', msg: 'Service worker registration found.' });
    } else {
      checks.push({ level: 'warn', msg: 'No service worker registration in the HTML.',
        fix: 'PWABuilder accepts apps without one but the resulting iOS / Android app will not work fully offline. Use the AI helper to add a service worker for full offline support.' });
    }

    // Cover / icon ready
    if (app.coverDesign) {
      checks.push({ level: 'pass', msg: 'Cover design saved — usable as an app icon.' });
    } else {
      checks.push({ level: 'warn', msg: 'No cover design saved.',
        fix: 'Open the Cover designer (🎨) and save a design. PWABuilder will use the cover image as the icon.' });
    }

    return checks;
  }

  function wirePackageBtn() {
    var btn = $('package-btn');
    if (btn) btn.addEventListener('click', function () {
      if (currentApp) openPackageWalkthrough(currentApp);
      else toast('Open a PWA first.', true);
    });
  }

  /* ---------- KDP PDF export ----------
     Builds a print-ready HTML document using the saved app.layout
     settings, then opens it in a new tab and triggers the browser
     print dialog. On iPad the user picks "Save to Files" which
     produces a PDF with proper trim size, bleed, margins, and
     page numbers -- KDP-acceptable.

     Design choice: paginate client-side into fixed-size .page divs
     in inches. iOS Safari's @page :left/:right + running-margin
     support is uneven, so doing the work in JS gives us a reliable
     result everywhere. Each .page has page-break-after:always so
     the print engine maps one .page div to one physical PDF page. */
  async function exportAsPdf(app) {
    if (!app || !app.html) { toast('Open a manuscript first.', true); return; }
    var settings = Object.assign(defaultLayout(), app.layout || {});
    var html = buildPrintReadyHtml(app, settings);

    // Some iOS Safari versions block window.open() on Blob URLs unless
    // it's inside a user-gesture stack. We're already inside a click
    // handler, so this is fine. If pop-up blocked, fall back to
    // download.
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var w;
    try { w = window.open(url, '_blank'); } catch (e) {}
    if (!w) {
      toast('Pop-up blocked — downloading the print file instead. Open it in Safari, then Share → Print → Save as PDF.', true);
      var safeName = String(app.name || 'book').replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || 'book';
      triggerAnchorDownload(url, safeName + '-print.html');
      return;
    }
    toast('Opening print preview… use "Save to Files" to make a KDP-ready PDF.');
  }

  function buildPrintReadyHtml(app, s) {
    var trim = TRIM_PRESETS.filter(function (t) { return t.id === s.trim; })[0] || TRIM_PRESETS[3];
    var w = trim.w, h = trim.h;
    var bleedExtra = s.bleed ? 0.125 : 0;
    var pageW = w + bleedExtra * 2;
    var pageH = h + bleedExtra * 2;

    var contentBody = '';
    try {
      var doc = new DOMParser().parseFromString(app.html || '', 'text/html');
      contentBody = doc.body ? doc.body.innerHTML : (app.html || '');
    } catch (e) { contentBody = app.html || ''; }

    // Pre-paginate the body using the same heuristic as the preview, so
    // page count + page numbers are real before we hit the print engine.
    var pages = paginateForPreview(contentBody, w, h, 0.5, s.marginOutside, s.marginTop, s.marginBottom);
    var pageCount = pages.length;
    var gutter = gutterForPageCount(pageCount);
    var marginInside = gutter;

    var headerText = s.headerText || '';
    var footerText = s.footerText || '';
    var showPN = !!s.pageNumbers;
    var pnPos = s.pageNumberPosition || 'outside';

    var css =
      '@page { size: ' + pageW + 'in ' + pageH + 'in; margin: 0; }\n' +
      '*{box-sizing:border-box;}' +
      'html, body { margin: 0; padding: 0; background: #fff; color: #000; ' +
        'font-family: Georgia, "Times New Roman", serif; line-height: 1.55; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
      '.page { position: relative; width: ' + pageW + 'in; height: ' + pageH + 'in; ' +
        'page-break-after: always; break-after: page; overflow: hidden; }\n' +
      '.page:last-child { page-break-after: auto; break-after: auto; }\n' +
      // Print convention: odd pages are recto (right side of binding) so the
      // spine sits on their LEFT edge -> wider gutter is the LEFT margin.
      // Even pages are verso so the spine sits on their RIGHT edge.
      '.page.odd .safe-area { position: absolute; ' +
        'left: ' + (bleedExtra + marginInside) + 'in; right: ' + (bleedExtra + s.marginOutside) + 'in; ' +
        'top: ' + (bleedExtra + s.marginTop) + 'in; bottom: ' + (bleedExtra + s.marginBottom) + 'in; ' +
        'overflow: hidden; }' +
      '.page.even .safe-area { position: absolute; ' +
        'left: ' + (bleedExtra + s.marginOutside) + 'in; right: ' + (bleedExtra + marginInside) + 'in; ' +
        'top: ' + (bleedExtra + s.marginTop) + 'in; bottom: ' + (bleedExtra + s.marginBottom) + 'in; ' +
        'overflow: hidden; }' +
      '.safe-area p { margin: 0 0 0.6em; text-indent: 1.2em; }' +
      '.safe-area p:first-of-type, .safe-area h1+p, .safe-area h2+p, .safe-area h3+p { text-indent: 0; }' +
      '.safe-area h1 { font-size: 22pt; margin: 0 0 0.5em; text-align: center; line-height: 1.2; page-break-after: avoid; }' +
      '.safe-area h2 { font-size: 14pt; margin: 1em 0 0.3em; }' +
      '.safe-area h3 { font-size: 12pt; margin: 0.8em 0 0.25em; }' +
      '.safe-area img { max-width: 100%; height: auto; display: block; margin: 0.6em auto; }' +
      '.safe-area blockquote { margin: 0.6em 0.8em; font-style: italic; }' +
      '.safe-area ul, .safe-area ol { margin: 0.4em 0 0.6em 1.4em; }' +
      '.page-num { position: absolute; bottom: ' + (bleedExtra + 0.25) + 'in; font-size: 10pt; color: #000; }' +
      '.page.even .page-num.outside { left: ' + (bleedExtra + 0.25) + 'in; }' +
      '.page.odd .page-num.outside { right: ' + (bleedExtra + 0.25) + 'in; }' +
      '.page-num.centered { left: 0; right: 0; text-align: center; }' +
      '.header, .footer { position: absolute; ' +
        'left: ' + (bleedExtra + marginInside) + 'in; right: ' + (bleedExtra + s.marginOutside) + 'in; ' +
        'font-size: 9pt; color: #444; text-align: center; }' +
      '.header { top: ' + (bleedExtra + 0.3) + 'in; }' +
      '.footer { bottom: ' + (bleedExtra + 0.3) + 'in; }' +
      // No on-screen scaling -- leave the .page divs at their native inch
      // size so what the user sees in the new-tab print preview matches
      // the printed PDF
      '@media screen { body { background: #555; padding: 14px; } ' +
        '.page { background: #fff; box-shadow: 0 6px 24px rgba(0,0,0,0.4); margin: 0 auto 14px; } }';

    var pagesHtml = pages.map(function (pageBodyHtml, idx) {
      var pageNum = idx + 1;
      var parity = (pageNum % 2 === 0) ? 'even' : 'odd';
      var headerHtml = headerText ? '<div class="header">' + escHtml(headerText) + '</div>' : '';
      var footerHtml = footerText ? '<div class="footer">' + escHtml(footerText) + '</div>' : '';
      var pnHtml = showPN ? '<div class="page-num ' + pnPos + '">' + pageNum + '</div>' : '';
      return '<div class="page ' + parity + '">' +
                headerHtml +
                '<div class="safe-area">' + pageBodyHtml + '</div>' +
                footerHtml +
                pnHtml +
              '</div>';
    }).join('');

    // Auto-trigger print after content has rendered. The user can
    // cancel and re-trigger via Cmd+P / Share -> Print if needed.
    var autoPrintScript =
      '<script>' +
      'window.addEventListener("load", function () { setTimeout(function () { try { window.print(); } catch (e) {} }, 400); });' +
      '<\/script>';

    return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<title>' + escHtml(app.name || 'book') + ' — KDP Print</title>' +
      '<style>' + css + '</style></head><body>' +
      pagesHtml +
      autoPrintScript +
      '</body></html>';
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
  /* Editor accessibility — font size + theme, dyslexia-friendly defaults */
  var editorFontStep = 0;       // 0 = base 16px; each step = +2px
  var editorTheme = 'dark';     // dark | cream | high
  function applyEditorPrefs() {
    var ta = $('editor-textarea');
    if (!ta) return;
    ta.style.fontSize = (16 + editorFontStep * 2) + 'px';
    ta.classList.remove('editor-theme-cream', 'editor-theme-high');
    if (editorTheme === 'cream') ta.classList.add('editor-theme-cream');
    else if (editorTheme === 'high') ta.classList.add('editor-theme-high');
  }
  function wireEditorControls() {
    document.querySelectorAll('[data-editor-fs]').forEach(function (b) {
      b.addEventListener('click', function () {
        var dir = b.getAttribute('data-editor-fs');
        if (dir === 'up') editorFontStep = Math.min(8, editorFontStep + 1);
        else if (dir === 'down') editorFontStep = Math.max(-2, editorFontStep - 1);
        applyEditorPrefs();
      });
    });
    document.querySelectorAll('[data-editor-theme]').forEach(function (b) {
      b.addEventListener('click', function () {
        editorTheme = b.getAttribute('data-editor-theme') || 'dark';
        applyEditorPrefs();
      });
    });
  }

  function openEditor(app) {
    editingApp = app;
    $('editor-title').textContent = 'Editing: ' + app.name;
    $('editor-textarea').value = app.html || '';
    applyEditorPrefs();
    show('editor-screen');
    refreshEditorSuggestions();
  }
  /* ---------- Copilot-style editor autocomplete ----------
   * Rule-based, fully offline. On every input we look at the 200 chars
   * before the caret, figure out which language mode the user is in
   * (HTML body / CSS / JS / inside an open tag / inside an attribute),
   * and surface the best completion plus 2–3 context-aware snippet
   * chips. Tapping the main suggestion or pressing Tab accepts it;
   * Escape dismisses. No network, no model download. */
  var currentSuggestion = null;
  function wireEditorAutocomplete() {
    var ta = $('editor-textarea');
    if (!ta) return;
    var strip = $('editor-suggest');
    var mainBtn = $('editor-suggest-main');
    var chipsWrap = $('editor-suggest-chips');
    var dismiss = $('editor-suggest-dismiss');
    if (!strip || !mainBtn || !chipsWrap || !dismiss) return;
    ta.addEventListener('input', refreshEditorSuggestions);
    ta.addEventListener('click', refreshEditorSuggestions);
    ta.addEventListener('keyup', function (e) {
      if (e.key !== 'Tab' && e.key !== 'Escape') refreshEditorSuggestions();
    });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && currentSuggestion) {
        e.preventDefault();
        acceptEditorSuggestion();
      } else if (e.key === 'Escape') {
        dismissEditorSuggestions();
      }
    });
    mainBtn.addEventListener('click', acceptEditorSuggestion);
    dismiss.addEventListener('click', dismissEditorSuggestions);
  }
  function refreshEditorSuggestions() {
    var ta = $('editor-textarea');
    if (!ta) return;
    var strip = $('editor-suggest');
    var mainBtn = $('editor-suggest-main');
    var chipsWrap = $('editor-suggest-chips');
    if (!strip || !mainBtn || !chipsWrap) return;
    var value = ta.value || '';
    var pos = ta.selectionStart || 0;
    var result = computeEditorSuggestion(value, pos);
    if (!result || (!result.main && !result.chips.length)) {
      strip.classList.remove('on');
      currentSuggestion = null;
      return;
    }
    strip.classList.add('on');
    currentSuggestion = result.main || null;
    mainBtn.innerHTML = result.main
      ? '<span class="ghost">' + escHtml(result.main.display || result.main.insert) + '</span><span class="kbd">Tab</span>'
      : '';
    chipsWrap.innerHTML = result.chips.map(function (c, i) {
      return '<button class="suggest-chip" data-chip="' + i + '" title="' + escHtml(c.label) + '">' + escHtml(c.label) + '</button>';
    }).join('');
    chipsWrap.querySelectorAll('[data-chip]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-chip'), 10);
        var chip = result.chips[idx];
        if (chip) insertAtCaret(chip.insert, chip.caretBack || 0);
      });
    });
  }
  function dismissEditorSuggestions() {
    var strip = $('editor-suggest');
    if (strip) strip.classList.remove('on');
    currentSuggestion = null;
  }
  function acceptEditorSuggestion() {
    if (!currentSuggestion) return;
    insertAtCaret(currentSuggestion.insert, currentSuggestion.caretBack || 0);
  }
  function insertAtCaret(text, caretBack) {
    var ta = $('editor-textarea');
    if (!ta) return;
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var before = ta.value.slice(0, start);
    var after = ta.value.slice(end);
    ta.value = before + text + after;
    var newPos = start + text.length - (caretBack || 0);
    ta.setSelectionRange(newPos, newPos);
    ta.focus();
    refreshEditorSuggestions();
  }
  /* Compute the best completion for the current caret. Returns
   * { main: {display, insert, caretBack}, chips: [{label, insert, caretBack}] }
   * Language mode detection is crude but useful:
   *   - inside <style> / style="..." → css
   *   - inside <script> (not an open tag) → js
   *   - typing an open tag ("<di") → tag
   *   - inside attribute ("<button cla") → attribute
   *   - body text → snippet suggestions
   */
  function computeEditorSuggestion(text, pos) {
    var head = text.slice(0, pos);
    var tail = text.slice(pos);
    var mode = detectEditorMode(head);
    var out = { main: null, chips: [] };

    // 1. Closing an unclosed tag: "<div>" followed by caret → </div>
    var openTagMatch = /<([a-zA-Z][a-zA-Z0-9-]*)\b[^<>]*>[^<]*$/.exec(head);
    if (openTagMatch && !/<\//.test(head.slice(-60))) {
      var tag = openTagMatch[1];
      if (!/^(br|hr|img|input|meta|link|source|wbr|area|base|col|embed|param|track)$/i.test(tag)) {
        var close = '</' + tag + '>';
        if (!tail.trim().startsWith(close)) {
          out.main = { display: close, insert: close, caretBack: close.length };
        }
      }
    }

    // 2. Typing an open tag: "<di" → "<div>"
    var partial = /<([a-z][a-z0-9-]{0,12})$/i.exec(head);
    if (partial) {
      var frag = partial[1].toLowerCase();
      var candidates = ['div','span','section','article','header','footer','main','nav','aside','h1','h2','h3','h4','p','ul','ol','li','a','button','input','label','form','img','table','tr','td','th','tbody','thead','pre','code','style','script','iframe','canvas','video','audio'];
      var hits = candidates.filter(function (c) { return c.indexOf(frag) === 0; }).slice(0, 4);
      if (hits.length) {
        out.main = { display: hits[0] + '>', insert: hits[0].slice(frag.length) + '></' + hits[0] + '>', caretBack: ('</' + hits[0] + '>').length };
        out.chips = hits.slice(1).map(function (h) {
          return { label: '<' + h + '>', insert: h.slice(frag.length) + '></' + h + '>', caretBack: ('</' + h + '>').length };
        });
        return out;
      }
    }

    // 3. Mode-specific context chips
    if (mode === 'css') {
      out.chips = [
        { label: 'color: #…', insert: 'color: #333;\n' },
        { label: 'flex center', insert: 'display: flex;\nalign-items: center;\njustify-content: center;\n' },
        { label: 'grid auto-fill', insert: 'display: grid;\ngrid-template-columns: repeat(auto-fill, minmax(180px, 1fr));\ngap: 16px;\n' },
        { label: 'rounded card', insert: 'border-radius: 12px;\nbox-shadow: 0 4px 16px rgba(0,0,0,0.08);\npadding: 18px;\n' }
      ];
    } else if (mode === 'js') {
      out.chips = [
        { label: 'console.log()', insert: 'console.log(', caretBack: 1 },
        { label: 'querySelector', insert: 'document.querySelector(\'\')', caretBack: 2 },
        { label: 'addEventListener', insert: '.addEventListener(\'click\', function (e) {\n  \n});\n', caretBack: 5 },
        { label: 'for loop', insert: 'for (var i = 0; i < arr.length; i++) {\n  \n}\n', caretBack: 3 }
      ];
    } else if (mode === 'html') {
      out.chips = [
        { label: '<p>…</p>', insert: '<p></p>', caretBack: 4 },
        { label: '<a href="…">', insert: '<a href=""></a>', caretBack: 5 },
        { label: '<img alt>', insert: '<img src="" alt="">', caretBack: 8 },
        { label: '<button>', insert: '<button type="button"></button>', caretBack: 9 }
      ];
    }

    // 4. Boilerplate: empty doc / no <body>
    if (head.trim().length < 40 && !/<body/i.test(text)) {
      out.chips.unshift({
        label: 'HTML5 skeleton',
        insert: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1">\n  <title>Untitled</title>\n</head>\n<body>\n  \n</body>\n</html>\n',
        caretBack: 17
      });
    }

    return out;
  }
  function detectEditorMode(head) {
    // Last opening <script> without a closing </script> after it = in JS
    var lastScript = head.lastIndexOf('<script');
    var lastScriptEnd = head.lastIndexOf('</script>');
    if (lastScript > -1 && lastScript > lastScriptEnd) {
      // But only when past the closing ">" of the opening tag
      var gt = head.indexOf('>', lastScript);
      if (gt > -1 && gt < head.length) return 'js';
    }
    var lastStyle = head.lastIndexOf('<style');
    var lastStyleEnd = head.lastIndexOf('</style>');
    if (lastStyle > -1 && lastStyle > lastStyleEnd) {
      var gt2 = head.indexOf('>', lastStyle);
      if (gt2 > -1 && gt2 < head.length) return 'css';
    }
    return 'html';
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
    try { updateInstallUi(); } catch (e) {}
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
    // Piper TTS — premium offline neural voice. Lives at the repo
    // root (lib-piper.js) and is shared across all five ACR apps via
    // OPFS, so the user only pays the ~30 MB download once.
    wirePiperSettings();
  }

  function wirePiperSettings() {
    var section = $('piper-section');
    if (!section) return;
    if (!window.LoadPiper) {
      // Library failed to load (network blocked, file missing). Hide
      // the whole section so the user isn't shown a non-working UI.
      section.style.display = 'none';
      return;
    }
    if (!LoadPiper.isSupported()) {
      // Old iPad / browser — OPFS or AudioContext missing.
      section.style.display = 'none';
      return;
    }
    var enableEl    = $('piper-enable');
    var statusEl    = $('piper-status-badge');
    var installEl   = $('piper-install');
    var testEl      = $('piper-test');
    var uninstallEl = $('piper-uninstall');
    var progressRow = $('piper-progress-row');
    var progressFill= $('piper-progress-fill');
    var progressLbl = $('piper-progress-label');

    function setStatus(label, color) {
      if (!statusEl) return;
      statusEl.textContent = label;
      statusEl.style.background = color || '';
    }
    async function refresh() {
      enableEl.checked = LoadPiper.isEnabled();
      var cached = false;
      try { cached = await LoadPiper.isCached(); } catch (_) {}
      if (cached) {
        setStatus('Installed · ready', '#22c55e');
        installEl.textContent = '✓ Installed';
        installEl.disabled = true;
        testEl.disabled = false;
        uninstallEl.style.display = '';
      } else {
        setStatus('Not installed', '');
        installEl.textContent = '⬇ Install voice (~30 MB)';
        installEl.disabled = false;
        testEl.disabled = true;
        uninstallEl.style.display = 'none';
      }
    }

    enableEl.addEventListener('change', function () {
      LoadPiper.setEnabled(enableEl.checked);
      toast(enableEl.checked ? 'Piper voice enabled.' : 'Piper voice off — using iOS voices.');
    });

    installEl.addEventListener('click', async function () {
      if (installEl.disabled) return;
      installEl.disabled = true;
      progressRow.style.display = '';
      progressFill.style.width = '0%';
      progressLbl.textContent = 'Starting download…';
      try {
        await LoadPiper.install(function (p) {
          var pct = (p && p.percent) || 0;
          progressFill.style.width = pct + '%';
          if (p && p.phase === 'downloading') {
            var mb = (p.loaded / 1048576).toFixed(1) + ' MB / ' + (p.total / 1048576).toFixed(1) + ' MB';
            progressLbl.textContent = pct + '% · ' + mb;
          } else if (p && p.phase === 'already-cached') {
            progressLbl.textContent = 'Already cached — ready.';
          } else if (p && p.phase === 'done') {
            progressLbl.textContent = 'Done. Voice ready.';
          }
        });
        // Auto-enable on first successful install
        if (!LoadPiper.isEnabled()) { LoadPiper.setEnabled(true); }
        toast('Piper voice installed and ready.');
      } catch (e) {
        progressLbl.textContent = 'Install failed: ' + (e && e.message || e);
        installEl.disabled = false;
        toast('Piper install failed. Check connection and try again.', true);
      }
      setTimeout(function () { progressRow.style.display = 'none'; }, 2400);
      refresh();
    });

    testEl.addEventListener('click', async function () {
      if (testEl.disabled) return;
      // Pre-warm the AudioContext SYNCHRONOUSLY inside the tap so iPad
      // Safari treats playback as gesture-initiated even after the
      // long predict() await that follows.
      try { if (window.LoadPiper && LoadPiper.warmAudio) LoadPiper.warmAudio(); } catch (_) {}
      testEl.disabled = true;
      var orig = testEl.textContent;
      testEl.textContent = '🔊 Speaking…';
      try {
        var buf = await LoadPiper.say(
          'Hello. I am Piper, your offline voice. Bereshit, Chanokh, and Yovelim. Listen for yourself.',
          { rate: 1 }
        );
        var dur = (buf && buf.duration) ? buf.duration.toFixed(1) + 's' : '?';
        toast('Piper played ' + dur + '. If you heard nothing, raise the volume / unmute.');
      } catch (e) {
        toast('Test failed: ' + (e && e.message || e), true);
        console.error('[Piper test] failed', e);
      }
      setTimeout(function () { testEl.textContent = orig; testEl.disabled = false; }, 1200);
    });

    uninstallEl.addEventListener('click', async function () {
      if (!confirm('Remove the Piper voice file? You can re-install any time.')) return;
      try { await LoadPiper.uninstall(); } catch (_) {}
      LoadPiper.setEnabled(false);
      toast('Piper voice removed.');
      refresh();
    });

    refresh();
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
      // Space-separated tokens all have to match (AND), so "epub genesis"
      // finds the EPUB containing the word "genesis".
      var tokens = searchQuery.split(/\s+/).filter(Boolean);
      filtered = filtered.filter(function (a) {
        var hay = searchHay(a);
        for (var t = 0; t < tokens.length; t++) {
          if (hay.indexOf(tokens[t]) < 0) return false;
        }
        return true;
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
    var existing = document.querySelectorAll('.context-menu');
    for (var i = 0; i < existing.length; i++) existing[i].remove();
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
      '<button data-act="delete" class="danger">&#128465; Delete from Library</button>';
    // Append to body so tile overflow:hidden can't clip it, and so the
    // menu can extend past the tile into the viewport.
    document.body.appendChild(menu);
    // Position below the "…" button by default; flip up if it would
    // overflow the viewport. Uses fixed positioning against getBoundingClientRect.
    var rect = btn.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var estW = Math.min(260, menu.offsetWidth || 260);
    var estH = menu.offsetHeight || 360;
    var left = Math.min(rect.right - estW, vw - estW - 8);
    if (left < 8) left = 8;
    var top;
    if (rect.bottom + 8 + estH <= vh - 8) {
      top = rect.bottom + 8;
    } else if (rect.top - 8 - estH >= 8) {
      top = rect.top - 8 - estH;
    } else {
      top = Math.max(8, vh - estH - 8);
    }
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var act = ev.target.getAttribute('data-act');
      if (!act) return;
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
            // Full multi-line reason: shown in a dismissible modal so the
            // user can actually read it. The toast below is just a summary.
            showImportError(files[i].name, err);
          }
        }
      }
    } catch (err) {
      hideProgress();
      toast('Import failed: ' + (err && err.message ? err.message : err), true);
    }
    hideProgress();
    var openVideoAfter = e.target.dataset.openVideoEditor === '1';
    e.target.value = '';
    e.target.removeAttribute('data-open-video-editor');
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
      // If the user came in via "Edit Video", jump straight to the
      // editor on the most recently-imported video instead of bouncing
      // through the library tile.
      if (openVideoAfter) {
        var newest = apps.filter(function (a) { return a.kind === 'media' && a.subKind === 'video'; })
                         .sort(function (a, b) { return b.dateAdded - a.dateAdded; })[0];
        if (newest) openVideoEditor(newest);
      }
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

    // ---- Pre-flight validation ----
    // Fail fast on broken uploads with a plain-language reason so the
    // user knows what to do. Anything thrown here surfaces as a toast.
    if (!file || typeof file.size !== 'number') {
      throw new Error('The file handle is invalid. Retry by picking the file again from the Files app.');
    }
    if (file.size === 0) {
      throw new Error(name + ' is empty (0 bytes). The upload was truncated or the file itself is a placeholder. Check the original in Files.');
    }
    if (file.size > 200 * 1024 * 1024) {
      throw new Error(name + ' is ' + humanBytes(file.size) + '. iPad Safari\'s storage for a single inlined blob is roughly 200 MB. Split the file, or extract and re-upload the essentials only.');
    }
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
    if (/\.(exe|dmg|app|msi|deb|rpm|apk)$/.test(lower)) {
      throw new Error(name + ' is a desktop/phone installer, not a web file. Load runs HTML/PWA/PDF/EPUB/media only.');
    }

    showProgress('Reading ' + name + '...');

    var app;
    try {
      if (/\.(html?|xhtml)$/.test(lower)) {
        app = await handleHtml(file, baseName);
      } else if (/\.docx$/.test(lower)) {
        app = await handleDocx(file, baseName);
      } else if (/\.(md|markdown)$/.test(lower)) {
        app = await handleMarkdown(file, baseName);
      } else if (/\.txt$/.test(lower)) {
        app = await handleText(file, baseName);
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
        else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') app = await handleDocx(file, baseName);
        else if (file.type === 'text/markdown' || file.type === 'text/x-markdown') app = await handleMarkdown(file, baseName);
        else if (file.type === 'text/plain') app = await handleText(file, baseName);
        else if (file.type === 'application/pdf') app = await handlePdf(file, baseName);
        else if (file.type === 'application/epub+zip') app = await handleEpub(file, baseName);
        else if (file.type === 'application/zip') app = await handleZip(file, baseName);
        else if (/^(video|audio|image)\//.test(file.type || '')) app = await handleMedia(file, baseName);
        else throw new Error('Unsupported file type: "' + name + '". Load accepts .html, .docx, .md, .txt, .zip, .pdf, .epub, and media (video/audio/image). Kindle (.azw/.mobi/.kfx) is not supported because of DRM.');
      }
    } catch (e) {
      // Translate low-level parser failures into language that tells the
      // user what to do rather than what technically broke.
      var msg = String(e && e.message || e);
      if (/JSZip/.test(msg)) throw new Error('Could not unpack ' + name + ' — the zip archive is either corrupted or uses an unsupported compression mode. Try re-zipping from Files (long-press the folder → Compress).');
      if (/pdf\.js|InvalidPDF|corrupted/i.test(msg)) throw new Error('Could not read ' + name + ' as a PDF — the file may be password-protected, encrypted, or damaged. Open it in Files / Books first to confirm it opens there.');
      if (/epub|container\.xml/i.test(msg)) throw new Error('Could not parse ' + name + ' as an EPUB — it is missing the standard <code>META-INF/container.xml</code> entry. Open it in Apple Books first to confirm the file is valid, then re-export if possible.');
      throw e;
    }
    // Media imports (video/audio/image) store a Blob, not html — they
    // are valid even when app.html is undefined.
    if (!app || (!app.html && app.kind !== 'media')) {
      throw new Error('Load finished reading ' + name + ' but produced no content. The file is likely empty or corrupted. Check it in Files first.');
    }

    await putApp(app);
    apps.push(app);
  }

  function humanBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024*1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024*1024*1024) return (n / (1024*1024)).toFixed(1) + ' MB';
    return (n / (1024*1024*1024)).toFixed(2) + ' GB';
  }
  /* Full-screen import-error modal so multi-line plain-language reasons
   * actually fit and the user can read + copy them. Falls back to toast
   * if the modal isn't present. */
  function showImportError(fileName, err) {
    var modal = $('import-error-modal');
    var msg = (err && err.message) ? err.message : String(err);
    if (!modal) { toast('✗ ' + fileName + ' failed: ' + msg, true); return; }
    $('import-error-title').textContent = fileName + ' could not be imported';
    // Preserve newlines as <br> but escape everything else so we don't
    // inject stray tags from a crafted filename/message.
    var lines = msg.split(/\n+/).map(function (l) { return escHtml(l); });
    $('import-error-body').innerHTML = lines.join('<br>');
    modal.classList.add('on');
  }
  function wireImportErrorModal() {
    var modal = $('import-error-modal');
    if (!modal) return;
    function close() { modal.classList.remove('on'); }
    var dismiss = $('import-error-dismiss');
    if (dismiss) dismiss.addEventListener('click', close);
    var scan = $('import-error-scan');
    if (scan) scan.addEventListener('click', function () {
      close();
      try { openDevConsole(); } catch (e) {}
      // The dev console only exposes its scan tab when a project is
      // currently open. After a failed import there is no project, so
      // route the user to the Library where they can pick something.
      try { if (typeof currentApp === 'undefined' || !currentApp) {
        show('library-screen');
        if (typeof renderLibrary === 'function') renderLibrary();
      } } catch (e) {}
    });
    // Tap-outside to dismiss so users aren't trapped if the buttons
    // happen to be invisible due to a CSS glitch.
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
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

    // ---- Runtime bundle shim ----
    // Inlining <script src> / <link rel=stylesheet> / <img src> covers
    // declarative references, but real PWAs (like the ACR reader) also
    // pull content at runtime via fetch('./data/foo.json') or
    // XMLHttpRequest. Those calls fail inside Load's iframe because the
    // iframe runs from a blob: URL and there is no server to ask. The
    // symptom is exactly what the user reported on the ACR full-zip
    // build: login + sidebar render, main area stays empty.
    //
    // Fix: pre-load every bundled file into an asset map and inject a
    // tiny shim that makes fetch/XHR/Image/etc. look up paths there
    // first. If the path isn't in the bundle we fall back to the real
    // fetch (which will still fail offline, but at least it's honest).
    showProgress('Building runtime bundle shim...');
    var bundle = {};
    for (var bi = 0; bi < files.length; bi++) {
      var fPath = files[bi];
      // Don't re-bundle the entry HTML — it's already in indexHtml,
      // and the user agent never fetches "itself" at runtime.
      if (fPath === startPath) continue;
      var fExt = fPath.split('.').pop().toLowerCase();
      var fEntry = zip.file(fPath);
      if (!fEntry) continue;
      try {
        if (/^(css|js|html|htm|json|svg|txt|xml|md|csv)$/.test(fExt)) {
          bundle[fPath] = { type: 'text', body: await fEntry.async('string') };
        } else {
          var mime2 = mimeFor(fExt);
          var b64x = await fEntry.async('base64');
          bundle[fPath] = { type: 'binary', mime: mime2, body: b64x };
        }
      } catch (e) { /* skip unreadable entries */ }
    }
    indexHtml = injectBundleShim(indexHtml, bundle, baseDir);

    var titleGuess = null;
    try {
      var m2 = /<title[^>]*>([^<]+)<\/title>/i.exec(indexHtml);
      if (m2) titleGuess = m2[1].trim();
    } catch (e) {}

    // ---- Nearby-files context for Load AI ----
    // Keep a lightweight file index (just paths) on the app record, plus
    // the full text of README / manifest.json / package.json when present.
    // This lets /analyze and /explain reason over the *bundle* — not just
    // the main HTML — without re-parsing the full inlined payload.
    var bundleIndex = Object.keys(bundle).sort();
    var bundleSamples = {};
    function findBundlePath(pattern) {
      for (var i = 0; i < bundleIndex.length; i++) {
        if (pattern.test(bundleIndex[i])) return bundleIndex[i];
      }
      return null;
    }
    function grab(pathRe, cap) {
      var p = findBundlePath(pathRe);
      if (!p) return;
      var entry = bundle[p];
      if (entry && entry.type === 'text' && entry.body) {
        bundleSamples[p] = entry.body.slice(0, cap || 8192);
      }
    }
    grab(/(^|\/)readme\.(md|txt)$/i, 8192);
    grab(/(^|\/)manifest\.json$/i, 4096);
    grab(/(^|\/)package\.json$/i, 4096);
    grab(/(^|\/)service-?worker\.js$/i, 4096);
    grab(/(^|\/)styles?\.css$/i, 4096);
    grab(/(^|\/)app\.js$/i, 4096);

    return {
      id: newId(),
      name: titleGuess || baseName,
      kind: 'zip',
      html: indexHtml,
      dateAdded: Date.now(),
      lastOpened: null,
      sizeBytes: indexHtml.length,
      bundleIndex: bundleIndex,
      bundleSamples: bundleSamples
    };
  }
  /* Inject a runtime shim that intercepts fetch / XMLHttpRequest /
   * Image / audio / video / scripts requesting paths inside the zip,
   * and serves them from an embedded bundle. Also neuters service-
   * worker registration so blob-URL apps don't spam errors trying to
   * register a worker that can never succeed.
   *
   * The shim is written to be tiny and defensive — it preserves the
   * original fetch for anything not in the bundle, so external URLs
   * still behave normally (they'll just fail offline, same as before). */
  function injectBundleShim(html, bundle, baseDir) {
    var bundleJson = JSON.stringify(bundle);
    var shim =
      '(function(){' +
        'try{var B=' + bundleJson + ';' +
        'var BASE=' + JSON.stringify(baseDir || '') + ';' +
        'function norm(p){if(!p)return "";p=String(p).split("#")[0].split("?")[0];' +
          'if(/^[a-z]+:\\/\\//i.test(p))return null;' +
          'if(/^data:|^blob:/i.test(p))return null;' +
          'p=p.replace(/^\\.\\//,"");if(p.charAt(0)==="/")p=p.slice(1);' +
          'if(BASE){var parts=(BASE+p).split("/");var stack=[];' +
            'for(var i=0;i<parts.length;i++){if(!parts[i]||parts[i]===".")continue;if(parts[i]==="..")stack.pop();else stack.push(parts[i]);}' +
            'return stack.join("/");}return p;}' +
        'function get(p){var k=norm(p);if(!k)return null;if(B[k])return B[k];' +
          'var keys=Object.keys(B);for(var i=0;i<keys.length;i++){if(keys[i].toLowerCase()===k.toLowerCase())return B[keys[i]];' +
            'if(keys[i].split("/").pop().toLowerCase()===k.split("/").pop().toLowerCase())return B[keys[i]];}return null;}' +
        'function makeBlob(e,p){var body;if(e.type==="text"){body=e.body;}else{var bin=atob(e.body);var u8=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);body=u8;}' +
          'var ext=(p.split(".").pop()||"").toLowerCase();' +
          'var mime=e.mime||({html:"text/html",htm:"text/html",css:"text/css",js:"text/javascript",json:"application/json",svg:"image/svg+xml",txt:"text/plain",xml:"text/xml",md:"text/markdown",csv:"text/csv"}[ext]||"application/octet-stream");' +
          'return new Blob([body],{type:mime});}' +
        'var realFetch=window.fetch?window.fetch.bind(window):null;' +
        'window.fetch=function(input,init){var url=typeof input==="string"?input:(input&&input.url);var e=get(url);' +
          'if(e){var blob=makeBlob(e,url);return Promise.resolve(new Response(blob,{status:200,headers:{"Content-Type":blob.type}}));}' +
          'if(!realFetch)return Promise.reject(new Error("fetch not available and asset not bundled: "+url));' +
          'return realFetch(input,init).catch(function(err){console.warn("Load bundle shim: fetch failed for",url,err);throw err;});};' +
        'var RX=window.XMLHttpRequest;if(RX){var origOpen=RX.prototype.open;var origSend=RX.prototype.send;' +
          'RX.prototype.open=function(method,url){this.__loadUrl=url;this.__loadMethod=method;return origOpen.apply(this,arguments);};' +
          'RX.prototype.send=function(body){var self=this;var e=get(self.__loadUrl);if(e){' +
            'setTimeout(function(){' +
              'Object.defineProperty(self,"readyState",{value:4,configurable:true});' +
              'Object.defineProperty(self,"status",{value:200,configurable:true});' +
              'var text=e.type==="text"?e.body:"";' +
              'Object.defineProperty(self,"responseText",{value:text,configurable:true});' +
              'Object.defineProperty(self,"response",{value:text,configurable:true});' +
              'if(typeof self.onreadystatechange==="function")self.onreadystatechange();' +
              'if(typeof self.onload==="function")self.onload();' +
              'self.dispatchEvent&&self.dispatchEvent(new Event("load"));' +
            '},0);return;}return origSend.apply(this,arguments);};}' +
        'if(navigator.serviceWorker){var r=navigator.serviceWorker.register;' +
          'navigator.serviceWorker.register=function(){console.info("Load: service worker skipped (blob origin).");' +
            'return Promise.resolve({scope:location.href,update:function(){return Promise.resolve();},unregister:function(){return Promise.resolve(true);}});};}' +
        // ---- In-page navigation for bundled HTML pages ----
        // When the imported PWA is multi-page (login.html + home.html
        // + ...), navigation between those pages is normally a real
        // browser navigate which breaks under blob: origin. Replace
        // the body contents in place instead so state is preserved.
        'function swapToPage(href){var e=get(href);if(!e||e.type!=="text")return false;' +
          'try{var parser=new DOMParser();var doc=parser.parseFromString(e.body,"text/html");' +
            // Update title
            'var t=doc.querySelector("title");if(t)document.title=t.textContent;' +
            // Merge new <link rel=stylesheet> / <style> / <meta> into head
            'var hChildren=doc.head?doc.head.children:[];' +
            'for(var i=0;i<hChildren.length;i++){var tag=hChildren[i].tagName;' +
              'if(tag==="STYLE"||tag==="LINK"||tag==="META"){document.head.appendChild(hChildren[i].cloneNode(true));}}' +
            // Replace body HTML, then re-execute any inline scripts so
            // login handlers etc. wire up again.
            'document.body.innerHTML=doc.body?doc.body.innerHTML:"";' +
            'var scripts=doc.body?doc.body.querySelectorAll("script"):[];' +
            'for(var j=0;j<scripts.length;j++){var src=scripts[j].getAttribute("src");' +
              'var n=document.createElement("script");' +
              'if(src){n.src=src;}else{n.text=scripts[j].textContent||"";}' +
              'document.body.appendChild(n);}' +
            // Scroll top + fire ready events
            'window.scrollTo(0,0);' +
            'setTimeout(function(){try{document.dispatchEvent(new Event("DOMContentLoaded"));window.dispatchEvent(new Event("load"));}catch(_){}},0);' +
            'try{history.pushState({__loadPage:href},"","#"+href);}catch(_){}' +
            'return true;}catch(err){console.warn("Load swapToPage failed",err);return false;}}' +
        // Intercept anchor clicks
        'document.addEventListener("click",function(ev){var a=ev.target;while(a&&a!==document){if(a.tagName==="A"&&a.getAttribute&&a.getAttribute("href"))break;a=a.parentNode;}' +
          'if(!a||a===document)return;var href=a.getAttribute("href");' +
          'if(!href||/^(mailto|tel|javascript|#|https?:|blob:|data:)/i.test(href))return;' +
          'if(/\\.html?(\\?|#|$)/i.test(href)&&swapToPage(href)){ev.preventDefault();}' +
          '},true);' +
        // Intercept form submits with action pointing to bundled HTML.
        // Form handlers fire first; we navigate in the next tick so any
        // auth/localStorage side effects settle.
        'document.addEventListener("submit",function(ev){var f=ev.target;' +
          'if(!f||f.tagName!=="FORM")return;var action=f.getAttribute("action")||"";' +
          'if(/\\.html?(\\?|#|$)/i.test(action)){' +
            'setTimeout(function(){swapToPage(action);},30);ev.preventDefault();}' +
          '},true);' +
        // Override location.assign / replace so JS-driven nav works too.
        'try{var origA=location.assign?location.assign.bind(location):null;' +
          'var origR=location.replace?location.replace.bind(location):null;' +
          'location.assign=function(u){if(!swapToPage(u)&&origA)origA(u);};' +
          'location.replace=function(u){if(!swapToPage(u)&&origR)origR(u);};}catch(_){}' +
        // Hash-based navigation so back button works with our pushState.
        'window.addEventListener("popstate",function(ev){var p=ev.state&&ev.state.__loadPage;if(p)swapToPage(p);});' +
        '}catch(err){console.warn("Load bundle shim init failed",err);}' +
      '})();';
    var shimTag = '<script>/* Load runtime bundle shim — intercepts fetch/XHR for assets bundled from the imported zip */\n' + shim + '</script>';
    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, '<head$1>' + shimTag);
    }
    return shimTag + html;
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
    var lower = (file.name || '').toLowerCase();
    var subKind =
      /\.(mp4|mov|m4v|webm|mkv)$/i.test(lower) || /^video\//.test(file.type || '') ? 'video' :
      /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(lower) || /^audio\//.test(file.type || '') ? 'audio' :
      /\.(jpe?g|png|gif|webp|heic|heif|svg|bmp)$/i.test(lower) || /^image\//.test(file.type || '') ? 'image' :
      'media';
    var mime = file.type || mimeForMedia(lower, subKind);
    // Three-tier import strategy. Reliability comes FIRST, memory
    // optimisation second — earlier ordering put new Blob([file])
    // first which broke imports for files that worked fine under
    // the legacy readAsArrayBuffer path. The user reported a clip
    // they had imported many times suddenly erroring. Now:
    //   Tier 1: arrayBuffer() — modern, reliable, what every other
    //           handler uses. The only path that's never failed.
    //   Tier 2: legacy FileReader.readAsArrayBuffer — older but
    //           identical semantics.
    //   Tier 3: new Blob([file]) — lightweight wrap. Last resort
    //           because it sometimes silently produces empty Blobs
    //           for stale File handles.
    var blob;
    try {
      var buf = await file.arrayBuffer();
      blob = new Blob([buf], { type: mime });
    } catch (e1) {
      try {
        blob = await new Promise(function (resolve, reject) {
          var r = new FileReader();
          r.onload = function () { resolve(new Blob([r.result], { type: mime })); };
          r.onerror = function () { reject(r.error || new Error('FileReader failed')); };
          r.readAsArrayBuffer(file);
        });
      } catch (e2) {
        try { blob = new Blob([file], { type: mime }); }
        catch (e3) {
          throw new Error(
            'Could not save ' + file.name + ' to your Library. ' +
            'Reason: ' + ((e3 && e3.message) || e3 || 'unknown') + '. ' +
            'If the file is over 1 GB, try a smaller export from Photos first.'
          );
        }
      }
    }
    return {
      id: newId(),
      name: baseName,
      kind: 'media',
      subKind: subKind,
      mime: mime,
      binary: blob,
      dateAdded: Date.now(),
      lastOpened: null,
      sizeBytes: (file.size != null ? file.size : 0)
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

  /* ----- Manuscript text formats: .docx, .txt, .md -----
     These three sit on the import path so a creator can drop in an
     already-written book and edit / re-format / export from Load. */

  // Wraps inner body HTML in a clean book-style document shell. Used by
  // every manuscript handler so they all render the same way in the viewer.
  function buildManuscriptDoc(title, bodyHtml) {
    var esc = escHtml;
    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(title) + '</title>' +
      '<style>' +
      'body{font-family:-apple-system,"Segoe UI",sans-serif;line-height:1.7;color:#222;background:#fff;padding:30px 20px;max-width:780px;margin:0 auto;}' +
      'h1.book-title{font-size:24px;color:#222;margin:0 0 24px;border-bottom:1px solid #ddd;padding-bottom:12px;}' +
      'h1,h2,h3,h4,h5,h6{color:#222;margin:1.4em 0 .5em;line-height:1.3;}' +
      'h1{font-size:22px;}h2{font-size:18px;}h3{font-size:16px;}h4,h5,h6{font-size:15px;}' +
      'p{margin:0 0 .9em;}' +
      'blockquote{margin:1em 0;padding:.4em 1em;border-left:3px solid #bbb;color:#555;}' +
      'code{font-family:"SF Mono",Menlo,Consolas,monospace;background:#f4f4f4;padding:1px 4px;border-radius:3px;font-size:.92em;}' +
      'pre{background:#f4f4f4;padding:12px;border-radius:6px;overflow-x:auto;font-size:.9em;}' +
      'pre code{background:transparent;padding:0;}' +
      'img{max-width:100%;height:auto;display:block;margin:1em auto;border-radius:4px;}' +
      'ul,ol{margin:.6em 0 1em 1.4em;}li{margin:.2em 0;}' +
      'hr{border:none;border-top:1px solid #ddd;margin:2em 0;}' +
      'table{border-collapse:collapse;margin:1em 0;}td,th{border:1px solid #ccc;padding:6px 10px;}' +
      '</style></head><body>' +
      '<h1 class="book-title">' + esc(title) + '</h1>' +
      bodyHtml +
      '</body></html>';
  }

  /* ----- DOCX: Office Open XML -----
     A .docx file is a ZIP with `word/document.xml` as the main content,
     plus `word/_rels/document.xml.rels` mapping rIds -> media files, and
     `word/media/*` holding the embedded images.

     We pull paragraphs, headings, lists, basic bold/italic/underline,
     and inline images. Lossy on purpose: tracked changes, complex
     tables, embedded objects, Word XML drawings, and footnote refs are
     dropped so the result is clean editable HTML. */
  async function handleDocx(file, baseName) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip not loaded.');
    showProgress('Parsing DOCX...');
    var buf = await readAsArrayBuffer(file);
    var zip;
    try { zip = await JSZip.loadAsync(buf); }
    catch (e) { throw new Error('Could not unpack the DOCX file. It may be corrupted; re-export it from Word / Pages / Google Docs.'); }

    var docXml = zip.file('word/document.xml');
    if (!docXml) throw new Error('This file does not look like a Word document — word/document.xml is missing inside the .docx archive.');
    var docText = await docXml.async('string');

    // Build rId -> filename map from the rels file (for inline images)
    var relsFile = zip.file('word/_rels/document.xml.rels');
    var relsText = relsFile ? await relsFile.async('string') : '';
    var rIdToTarget = {};
    if (relsText) {
      var relRe = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g, rm;
      while ((rm = relRe.exec(relsText))) rIdToTarget[rm[1]] = rm[2];
    }

    // Inline embedded images as data URLs so the imported HTML is self-contained
    var rIdToDataUrl = {};
    var rIds = Object.keys(rIdToTarget);
    for (var i = 0; i < rIds.length; i++) {
      var target = rIdToTarget[rIds[i]];
      if (!/^media\//i.test(target)) continue;
      var imgPath = 'word/' + target.replace(/^\.?\//, '');
      var imgFile = zip.file(imgPath);
      if (!imgFile) continue;
      var ext = (target.split('.').pop() || 'png').toLowerCase();
      var mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                 ext === 'gif' ? 'image/gif' :
                 ext === 'svg' ? 'image/svg+xml' :
                 ext === 'webp' ? 'image/webp' :
                 'image/png';
      try {
        var b64data = await imgFile.async('base64');
        rIdToDataUrl[rIds[i]] = 'data:' + mime + ';base64,' + b64data;
      } catch (e) {}
    }

    // Try to get the document title from core.xml
    var metaName = baseName;
    try {
      var coreFile = zip.file('docProps/core.xml');
      if (coreFile) {
        var coreText = await coreFile.async('string');
        var tm = /<dc:title>([^<]+)<\/dc:title>/i.exec(coreText);
        if (tm && tm[1].trim()) metaName = tm[1].trim();
      }
    } catch (e) {}

    // Parse the body XML
    var dp = new DOMParser();
    var xml = dp.parseFromString(docText, 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('The DOCX document.xml is not valid XML — the file may be damaged.');

    // Helper: read text + format runs out of a <w:p>
    function runHtml(rNode) {
      var rPr = rNode.getElementsByTagNameNS('*', 'rPr')[0];
      var bold = false, italic = false, under = false;
      if (rPr) {
        bold = !!rPr.getElementsByTagNameNS('*', 'b')[0];
        italic = !!rPr.getElementsByTagNameNS('*', 'i')[0];
        under = !!rPr.getElementsByTagNameNS('*', 'u')[0];
      }
      var pieces = [];
      var children = rNode.childNodes;
      for (var k = 0; k < children.length; k++) {
        var c = children[k];
        if (c.nodeType !== 1) continue;
        var ln = c.localName;
        if (ln === 't') pieces.push(escHtml(c.textContent || ''));
        else if (ln === 'tab') pieces.push('&nbsp;&nbsp;&nbsp;&nbsp;');
        else if (ln === 'br') pieces.push('<br>');
        else if (ln === 'drawing') {
          var blips = c.getElementsByTagNameNS('*', 'blip');
          for (var b = 0; b < blips.length; b++) {
            var embed = blips[b].getAttribute('r:embed') || blips[b].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
            if (!embed) {
              var attrs = blips[b].attributes;
              for (var ai = 0; ai < attrs.length; ai++) {
                if (/(^|:)embed$/.test(attrs[ai].name)) { embed = attrs[ai].value; break; }
              }
            }
            if (embed && rIdToDataUrl[embed]) pieces.push('<img src="' + rIdToDataUrl[embed] + '" alt="">');
          }
        }
      }
      var html = pieces.join('');
      if (!html) return '';
      if (under) html = '<u>' + html + '</u>';
      if (italic) html = '<em>' + html + '</em>';
      if (bold) html = '<strong>' + html + '</strong>';
      return html;
    }

    // Walk paragraphs in document order
    var bodyEls = xml.getElementsByTagNameNS('*', 'body');
    if (!bodyEls.length) throw new Error('The DOCX document is missing a body. Try re-exporting it.');
    var bodyEl = bodyEls[0];
    var out = [];
    var listOpen = null; // 'ul' | 'ol' | null
    function closeList() { if (listOpen) { out.push('</' + listOpen + '>'); listOpen = null; } }

    var nodes = bodyEl.childNodes;
    for (var n = 0; n < nodes.length; n++) {
      var node = nodes[n];
      if (node.nodeType !== 1) continue;
      var tag = node.localName;

      if (tag === 'p') {
        var pPr = node.getElementsByTagNameNS('*', 'pPr')[0];
        var styleVal = '';
        var numPr = null;
        if (pPr) {
          var styleEl = pPr.getElementsByTagNameNS('*', 'pStyle')[0];
          if (styleEl) styleVal = (styleEl.getAttribute('w:val') || styleEl.getAttribute('val') || '').toLowerCase();
          numPr = pPr.getElementsByTagNameNS('*', 'numPr')[0] || null;
        }
        // Build inline content
        var runs = node.getElementsByTagNameNS('*', 'r');
        var inner = '';
        for (var ri = 0; ri < runs.length; ri++) {
          // Skip runs nested inside other elements we've already processed
          // (DOM .getElementsByTagNameNS includes all descendants)
          if (runs[ri].parentNode === node) inner += runHtml(runs[ri]);
        }
        if (!inner.replace(/&nbsp;|<br>|\s/g, '')) {
          // Skip pure-whitespace paragraphs
          continue;
        }
        // Heading?
        var hMatch = /^heading\s*([1-6])$/.exec(styleVal) || /^h([1-6])$/.exec(styleVal);
        if (hMatch) {
          closeList();
          out.push('<h' + hMatch[1] + '>' + inner + '</h' + hMatch[1] + '>');
          continue;
        }
        if (/^title$/.test(styleVal)) {
          closeList();
          out.push('<h1>' + inner + '</h1>');
          continue;
        }
        if (/^subtitle$/.test(styleVal)) {
          closeList();
          out.push('<h2>' + inner + '</h2>');
          continue;
        }
        // Quote
        if (/quote/.test(styleVal)) {
          closeList();
          out.push('<blockquote><p>' + inner + '</p></blockquote>');
          continue;
        }
        // List item
        if (numPr) {
          // Heuristic: presence of numId implies list. Word doesn't tell us
          // ul-vs-ol cleanly without resolving numbering.xml -- assume <ul>
          // unless paragraph style mentions "ListNumber".
          var wantOl = /listnumber|number/.test(styleVal);
          var newType = wantOl ? 'ol' : 'ul';
          if (listOpen !== newType) { closeList(); out.push('<' + newType + '>'); listOpen = newType; }
          out.push('<li>' + inner + '</li>');
          continue;
        }
        closeList();
        out.push('<p>' + inner + '</p>');
      } else if (tag === 'tbl') {
        // Render tables flat: rows -> <tr>, cells -> <td>, plain text only
        closeList();
        var rows = node.getElementsByTagNameNS('*', 'tr');
        var rowsHtml = [];
        for (var ti = 0; ti < rows.length; ti++) {
          var cells = rows[ti].getElementsByTagNameNS('*', 'tc');
          var cellsHtml = [];
          for (var ci = 0; ci < cells.length; ci++) {
            cellsHtml.push('<td>' + escHtml(cells[ci].textContent || '') + '</td>');
          }
          rowsHtml.push('<tr>' + cellsHtml.join('') + '</tr>');
        }
        if (rowsHtml.length) out.push('<table>' + rowsHtml.join('') + '</table>');
      }
    }
    closeList();

    if (!out.length) throw new Error('Found no readable text in the DOCX. The file may use unsupported features (drawing canvas, embedded objects, or tracked-only changes).');

    var bodyHtml = out.join('\n');
    var html = buildManuscriptDoc(metaName, bodyHtml);
    return {
      id: newId(),
      name: metaName,
      kind: 'docx',
      html: html,
      dateAdded: Date.now(),
      lastOpened: null,
      sizeBytes: html.length
    };
  }

  /* ----- Plain text -----
     Splits on blank lines into paragraphs; preserves single line breaks
     inside a paragraph as <br>. */
  async function handleText(file, baseName) {
    showProgress('Reading text file...');
    var text = await readAsText(file);
    if (!text) throw new Error(file.name + ' is empty.');
    var paras = text.replace(/\r\n/g, '\n').split(/\n\s*\n+/);
    var bodyHtml = paras.map(function (p) {
      var t = p.replace(/\s+$/g, '');
      if (!t.trim()) return '';
      return '<p>' + escHtml(t).replace(/\n/g, '<br>') + '</p>';
    }).filter(Boolean).join('\n');
    var html = buildManuscriptDoc(baseName, bodyHtml);
    return {
      id: newId(),
      name: baseName,
      kind: 'text',
      html: html,
      dateAdded: Date.now(),
      lastOpened: null,
      sizeBytes: html.length
    };
  }

  /* ----- Markdown -----
     Tiny offline parser: covers headings #, lists - / 1., emphasis ** *,
     inline code `x`, fenced ```code```, links [t](u), images ![a](s),
     blockquotes >, hr ---. Deliberately small; users who need
     CommonMark-perfect rendering can paste the HTML from another tool. */
  async function handleMarkdown(file, baseName) {
    showProgress('Parsing Markdown...');
    var src = await readAsText(file);
    if (!src) throw new Error(file.name + ' is empty.');
    var bodyHtml = renderMarkdown(src);
    // Hoist a leading H1 into the document title if the file has one
    var titleGuess = baseName;
    var firstH1 = /^#\s+(.+)$/m.exec(src);
    if (firstH1 && firstH1[1].trim()) titleGuess = firstH1[1].trim().replace(/[*_`]/g, '');
    var html = buildManuscriptDoc(titleGuess, bodyHtml);
    return {
      id: newId(),
      name: titleGuess,
      kind: 'markdown',
      html: html,
      dateAdded: Date.now(),
      lastOpened: null,
      sizeBytes: html.length
    };
  }

  function renderMarkdown(src) {
    src = src.replace(/\r\n/g, '\n');
    var lines = src.split('\n');
    var out = [];
    var i = 0, listType = null, inBQ = false, codeOpen = false, codeBuf = [], codeLang = '';

    function closeList() { if (listType) { out.push('</' + listType + '>'); listType = null; } }
    function closeBQ() { if (inBQ) { out.push('</blockquote>'); inBQ = false; } }

    function inline(s) {
      // Escape first; we'll re-introduce the markup we recognize as literal
      // tags below. This avoids the user's text injecting HTML.
      s = escHtml(s);
      // Images ![alt](src)
      s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
        function (_m, alt, src) { return '<img src="' + src + '" alt="' + alt + '">'; });
      // Links [text](url)
      s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
        function (_m, t, u) { return '<a href="' + u + '">' + t + '</a>'; });
      // Inline code
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      // Bold + italic
      s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
      s = s.replace(/(^|[\s>])\*([^*\n]+)\*/g, '$1<em>$2</em>');
      s = s.replace(/(^|[\s>])_([^_\n]+)_/g, '$1<em>$2</em>');
      return s;
    }

    while (i < lines.length) {
      var line = lines[i];

      // Code fences
      if (/^\s*```/.test(line)) {
        if (!codeOpen) {
          closeList(); closeBQ();
          codeOpen = true;
          codeLang = (line.match(/^\s*```(\w+)?/) || [])[1] || '';
          codeBuf = [];
        } else {
          out.push('<pre><code' + (codeLang ? ' class="lang-' + codeLang + '"' : '') + '>' + escHtml(codeBuf.join('\n')) + '</code></pre>');
          codeOpen = false; codeLang = ''; codeBuf = [];
        }
        i++; continue;
      }
      if (codeOpen) { codeBuf.push(line); i++; continue; }

      // Blank line breaks blocks
      if (/^\s*$/.test(line)) { closeList(); closeBQ(); i++; continue; }

      // Horizontal rule
      if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
        closeList(); closeBQ();
        out.push('<hr>'); i++; continue;
      }

      // ATX heading
      var hm = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (hm) {
        closeList(); closeBQ();
        var lvl = hm[1].length;
        out.push('<h' + lvl + '>' + inline(hm[2]) + '</h' + lvl + '>');
        i++; continue;
      }

      // Blockquote
      var bm = /^\s*>\s?(.*)$/.exec(line);
      if (bm) {
        closeList();
        if (!inBQ) { out.push('<blockquote>'); inBQ = true; }
        out.push('<p>' + inline(bm[1]) + '</p>');
        i++; continue;
      }
      if (inBQ) closeBQ();

      // Unordered list item
      var um = /^\s*[-*+]\s+(.*)$/.exec(line);
      if (um) {
        if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
        out.push('<li>' + inline(um[1]) + '</li>');
        i++; continue;
      }

      // Ordered list item
      var om = /^\s*\d+[.)]\s+(.*)$/.exec(line);
      if (om) {
        if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
        out.push('<li>' + inline(om[1]) + '</li>');
        i++; continue;
      }
      closeList();

      // Default: paragraph -- gather adjacent non-blank, non-special lines
      var pBuf = [line];
      while (i + 1 < lines.length) {
        var next = lines[i + 1];
        if (/^\s*$/.test(next) || /^\s*```/.test(next) || /^\s*(---+|\*\*\*+|___+)\s*$/.test(next) ||
            /^#{1,6}\s+/.test(next) || /^\s*>\s?/.test(next) || /^\s*[-*+]\s+/.test(next) ||
            /^\s*\d+[.)]\s+/.test(next)) break;
        pBuf.push(next); i++;
      }
      out.push('<p>' + inline(pBuf.join(' ')) + '</p>');
      i++;
    }
    if (codeOpen) {
      out.push('<pre><code>' + escHtml(codeBuf.join('\n')) + '</code></pre>');
    }
    closeList(); closeBQ();
    return out.join('\n');
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
    // Install the dev-console bridge so the loaded app's logs and
    // errors flow into our Developer Console drawer.
    installIframeConsoleBridge();
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
