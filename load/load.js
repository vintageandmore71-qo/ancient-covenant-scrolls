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
      return '<button class="seg-btn" data-user-template="' + escHtml(t.id) + '">' +
        '&#128196; ' + escHtml(t.name) +
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
    $('console-scan-fix').disabled = report.fixable === 0;
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
    if (externals.length) {
      var uniq = Array.from(new Set(externals)).slice(0, 5);
      pushItem(report, 'warn', '&#127760;', externals.length + ' external URL reference' + (externals.length === 1 ? '' : 's'),
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
        'Your PWA manifest is missing: <code>' + missing.join('</code>, <code>') + '</code>. Load can still render the app; the missing fields just mean iPad won\'t give it a proper home-screen icon/title.');
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
  async function runAutoFix() {
    if (!currentScanReport || !currentApp) return;
    var fixable = currentScanReport.items.filter(function (i) { return typeof i.fix === 'function'; });
    if (!fixable.length) { toast('Nothing to fix.'); return; }
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
    document.querySelectorAll('[data-helper-ask]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.getAttribute('data-helper-ask');
        $('helper-input').value = q;
        submitHelperQuestion();
      });
    });
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

  function openHelperPanel() {
    helperContext = captureHelperContext();
    refreshHelperQuickChips();
    $('helper-panel').classList.add('on');
    $('helper-scrim').classList.add('on');
    // Re-show the intro and clear message history so every open is fresh
    var intro = $('helper-intro'); if (intro) intro.style.display = '';
    var quick = $('helper-quick'); if (quick) quick.classList.remove('hidden');
    $('helper-messages').innerHTML = '';
    // If there's content available, lead with a context note so the user
    // knows the helper is looking at the current item.
    if (helperContext.kind === 'viewer' && helperContext.app) {
      addHelperMessage('assistant',
        'I can see you\'re reading <strong>' + escHtml(helperContext.app.name) + '</strong>. Ask me to summarize it, find a word, outline it, or walk you through it step by step. Or ask me anything about Load.');
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
  function submitHelperQuestion() {
    var input = $('helper-input');
    var q = (input.value || '').trim();
    if (!q) return;
    addHelperMessage('user', escHtml(q));
    input.value = '';

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

    // 1. Content-aware commands — only work when there's an app open
    if (helperContext.kind === 'viewer' && helperContext.text) {
      var contentResponse = handleContentCommand(q, helperContext);
      if (contentResponse) {
        addHelperMessage('assistant', contentResponse.answer, contentResponse.action || null, BADGE_BUILTIN);
        return;
      }
    }

    // 2. "Create a X" intent
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

    // 3. Match knowledge base
    var hit = scoreKnowledgeBase(q);
    if (hit) {
      addHelperMessage('assistant', hit.answer, hit.actionLabel ? { label: hit.actionLabel, fn: hit.actionFn } : null, BADGE_BUILTIN);
      return;
    }

    // 4. Route to the cloud provider chain (Pollinations → AI Horde →
    //    local model). Each provider is attempted in order; the first
    //    that succeeds wins. If none work, fall back to the original
    //    offline behaviour (hand-off modal).
    askProviderChain(q, helperContext).then(function (result) {
      if (result && result.answer) {
        addHelperMessage('assistant', result.answer, null, result.badge);
        return;
      }
      fallbackToOffline(q, helperContext);
    }).catch(function (err) {
      console.warn('Provider chain failed', err);
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

    if (local.installed && !localReady && localLoading) {
      return {
        msg: 'The on-device model is <strong>still warming up</strong> — it takes ~10–20 seconds to load from your iPad\'s cache after the app launches. Please try your question again in a moment.',
        label: 'local model warming up'
      };
    }
    if (local.installed && !localReady && !localLoading) {
      return {
        msg: 'The on-device model is installed but <strong>did not reload</strong> — your iPad may have cleared the browser cache. Tap <strong>⚙ Settings → Load AI → Reinstall</strong> to get it back.',
        label: 'local model cache gone'
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
      huggingface: { enabled: false, apiKey: '' }
    };
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
  function saveProviderPrefs() {
    // Returns true on success, false on failure. Callers that depend on
    // the write actually landing (the install flow) should check this
    // and surface an error if it's false — Safari on iPad can silently
    // reject localStorage writes under storage pressure.
    try {
      var json = JSON.stringify(providerPrefs);
      localStorage.setItem(LS_PROVIDERS, json);
      // Verify round-trip — some Safari failure modes accept setItem
      // but don't actually persist.
      var got = localStorage.getItem(LS_PROVIDERS);
      return got === json;
    } catch (e) {
      console.warn('saveProviderPrefs failed', e);
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
  function buildProviderContext(ctx) {
    if (!ctx) return '';
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
      return head + t.slice(0, 6000) + bundleCtx;
    }
    if (ctx.kind === 'editor' && currentApp) {
      var src = (currentApp.html || '').slice(0, 6000);
      return '[User is editing HTML source of ' + currentApp.name + '.]\n\n' + src;
    }
    return '';
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
        var sys = buildSystemPrompt();
        var prompt = sys + '\n\n' + (contextText ? 'Context:\n' + contextText + '\n\n' : '') + 'User: ' + question + '\nAssistant:';
        var out = await window.__LOAD_LOCAL_AI(prompt);
        setProviderStatus('local', 'ok');
        return out;
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
        var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + encodeURIComponent(key);
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
          replaceMessage(placeholder, html, { tier: p.tier, label: p.label });
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

  async function initLocalAiPipeline(opts) {
    opts = opts || {};
    var firstInstall = !!opts.firstInstall;
    if (firstInstall) {
      setProviderStatus('local', 'busy', 'Loading transformers.js…');
    } else {
      setProviderStatus('local', 'busy', 'Warming up on-device model…');
    }
    var mod = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    if (firstInstall) {
      setProviderStatus('local', 'busy', 'Downloading model (~400 MB)…');
    }
    var pipeline = mod.pipeline;
    mod.env.allowLocalModels = false;
    mod.env.useBrowserCache = true;
    var gen = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat', {
      progress_callback: function (p) {
        if (!p) return;
        if (p.status === 'progress' && p.progress != null) {
          setProviderStatus('local', 'busy', 'Downloading ' + p.file + ' — ' + Math.round(p.progress) + '%');
        } else if (p.status === 'done' && firstInstall) {
          setProviderStatus('local', 'busy', 'Finalizing ' + p.file + '…');
        }
      }
    });
    window.__LOAD_LOCAL_AI = async function (prompt) {
      var out = await gen(prompt, { max_new_tokens: 240, temperature: 0.6, do_sample: true, return_full_text: false });
      return (out && out[0] && (out[0].generated_text || '')) || '';
    };
    return gen;
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
    localAiInitPromise = initLocalAiPipeline({ firstInstall: true });
    try {
      await localAiInitPromise;
      providerPrefs.local.installed = true;
      providerPrefs.local.enabled = true;
      var persisted = saveProviderPrefs();
      if (!persisted) {
        // The pipeline loaded fine but Safari refused to save the flag.
        // The user can still use the model THIS session but it won't
        // rehydrate on next launch. Tell them honestly.
        setProviderStatus('local', 'warn', 'Ready this session — but iPad could not save the install flag. You may need to reinstall next time you open Load.');
        toast('Loaded, but install state could not be saved — may need to reinstall next launch.', true);
      } else {
        setProviderStatus('local', 'ok', 'Installed, ready offline');
        toast('✓ Local model installed. Ready for offline use.');
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
  // install. Silent; uses the cached weights from IndexedDB, no network
  // required once cached. Skipped on cold page loads if the user disabled
  // the local provider in settings.
  function autoInitLocalAi() {
    if (!providerPrefs.local.installed || !providerPrefs.local.enabled) return;
    if (typeof window.__LOAD_LOCAL_AI === 'function') return;
    if (localAiInitPromise) return;
    setProviderStatus('local', 'busy', 'Reloading cached model…');
    localAiInitPromise = initLocalAiPipeline({ firstInstall: false })
      .then(function () {
        setProviderStatus('local', 'ok', 'Ready offline');
      })
      .catch(function (e) {
        console.warn('Local AI auto-init failed', e);
        setProviderStatus('local', 'error', 'Re-init failed — tap Install to retry');
      })
      .finally(function () { localAiInitPromise = null; });
  }
  function wireAiProviderSettings() {
    var CLOUD_PROVIDERS = ['gemini', 'groq', 'openrouter', 'huggingface'];
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
    // Direct patterns: "make a checklist for trip", "create a recipe for soup"
    var m = s.match(/(?:make|create|write|build|new)\s+(?:me\s+)?(?:a|an|some)?\s*(checklist|recipe|letter|article|note|story|essay|paragraph|to-?do|shopping\s*list|grocery\s*list|book|reader|acr)\s*(?:for|about|of|to)?\s*(.*)/i);
    if (m) {
      var tpl = m[1].toLowerCase();
      if (/shopping|grocery|to-?do/.test(tpl)) tpl = 'checklist';
      if (/story|essay|paragraph/.test(tpl)) tpl = 'article';
      if (/book|reader|acr/.test(tpl)) tpl = 'acr';
      if (!['checklist','recipe','letter','article','note','acr'].includes(tpl)) tpl = 'article';
      return { template: tpl, topic: (m[2] || '').trim() };
    }
    // Phrase-initial: "recipe for X", "checklist for X", "book about X"
    m = s.match(/^(checklist|recipe|letter|article|note|shopping\s*list|grocery\s*list|to-?do|book|reader)\s+(?:for|of|about|to)\s+(.+)/i);
    if (m) {
      var tpl2 = m[1].toLowerCase();
      if (/shopping|grocery|to-?do/.test(tpl2)) tpl2 = 'checklist';
      if (/book|reader/.test(tpl2)) tpl2 = 'acr';
      return { template: tpl2, topic: m[2].trim() };
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
  function scoreKnowledgeBase(q) {
    var qLower = ' ' + q.toLowerCase() + ' ';
    var expanded = expandTokens(q);
    var best = null;
    for (var i = 0; i < LOAD_KB.length; i++) {
      var entry = LOAD_KB[i];
      var score = 0;
      entry.keywords.forEach(function (k) {
        var kLower = k.toLowerCase();
        if (qLower.indexOf(' ' + kLower + ' ') >= 0) score += 6;
        else if (qLower.indexOf(kLower) >= 0) score += 4;
        kLower.split(/\s+/).forEach(function (kt) {
          if (kt.length < 3) return;
          if (expanded.indexOf(kt) >= 0) score += 1.5;
          var kStem = kt.replace(/(ies|es|s|ing|ed)$/i, '');
          if (kStem && kStem !== kt && expanded.indexOf(kStem) >= 0) score += 1;
        });
      });
      if (!best || score > best.score) best = { score: score, entry: entry };
    }
    if (best && best.score >= 2) return best.entry;
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
      });
    });
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
        else throw new Error('Unsupported file type: "' + name + '". Load accepts .html, .zip, .pdf, .epub, and media (video/audio/image). Kindle (.azw/.mobi/.kfx) is not supported because of DRM.');
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
    if (!app || !app.html) {
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
    if (scan) scan.addEventListener('click', function () { close(); openDevConsole(); });
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
