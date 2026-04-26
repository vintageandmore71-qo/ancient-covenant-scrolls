/* Attain Jr — kid-friendly study companion.
   Mirrors Attain's chapter / character / activity structure but with
   bigger touch targets, audio-first interactions, paraphrase
   read-aloud, inline SFX, custom voice upload, and parent-gated
   settings. Pure offline JS — no frameworks. */
(function () {
  'use strict';

  // Defensive helper: every top-level addEventListener wrapped in this
  // means a single missing element or runtime throw doesn't kill all
  // the other bindings. iPad Safari was hitting one bad call high up
  // in the script and silently dropping the rest of the wires (Read,
  // Pause, Stop, Music, Back, Next, etc. all stopped responding).
  function bind(id, evt, fn) {
    try {
      var el = document.getElementById(id);
      if (!el) { try { console.warn('[Attain Jr] missing #' + id); } catch (_) {} return; }
      el.addEventListener(evt, fn);
    } catch (e) { try { console.warn('[Attain Jr] bind failed for #' + id, e); } catch (_) {} }
  }
  function bindAll(selector, evt, fn) {
    try {
      Array.prototype.forEach.call(document.querySelectorAll(selector), function (el) {
        el.addEventListener(evt, fn.bind(null, el));
      });
    } catch (e) { try { console.warn('[Attain Jr] bindAll failed for ' + selector, e); } catch (_) {} }
  }
  function safe(label, fn) {
    try { fn(); } catch (e) { try { console.warn('[Attain Jr] safe(' + label + ')', e); } catch (_) {} }
  }

  /* ---------- Sample story (ships in v1 so the app demonstrates
     itself even with zero imported books). Replace via Library
     import in a future commit. */
  var SAMPLE_BOOK = {
    title: 'The Brave Little Fox',
    author: 'Attain Jr Sample',
    ageBand: '3-5',
    cover: 'splash.jpg',
    characters: [
      { name: 'Fox',  emoji: '🦊', voiceHint: 'high-young' },
      { name: 'Owl',  emoji: '🦉', voiceHint: 'wise-deep' },
      { name: 'Bear', emoji: '🐻', voiceHint: 'low-warm' }
    ],
    storyworld: {
      setting: 'A bright forest at the edge of a winding river.',
      time: 'A long time ago, in story-time.',
      lesson: 'Being brave means asking for help when you need it.'
    },
    gallery: [
      { caption: 'A bright forest at sunrise.', src: 'splash.jpg' }
    ],
    scenes: [
      {
        id: 'meet',
        title: 'Meeting',
        color: 'blue',
        sfx: ['pop'],
        body: [
          { type: 'stage', text: 'Sunlight peeks through the trees.' },
          { type: 'p',     text: 'A little fox lived by a winding river.' },
          { type: 'char',  who: 'Fox' },
          { type: 'p',     text: 'I want to find the wise owl on the other side of the river.' },
          { type: 'p',     text: 'But the river was wide and fast.' }
        ]
      },
      {
        id: 'river',
        title: 'River',
        color: 'orange',
        sfx: ['storm'],
        body: [
          { type: 'stage', text: 'The river roars softly. Splashes of water sparkle.' },
          { type: 'p',     text: 'The fox stood at the edge of the water.' },
          { type: 'highlight', text: '“I am too small to swim across.”' },
          { type: 'p',     text: 'A bear walked by with a big log.' },
          { type: 'char',  who: 'Bear' },
          { type: 'p',     text: 'Little fox, why are you sad?' },
          { type: 'char',  who: 'Fox' },
          { type: 'p',     text: 'I want to cross the river. Will you help me?' }
        ]
      },
      {
        id: 'owl',
        title: 'Owl',
        color: 'purple',
        sfx: ['chime'],
        body: [
          { type: 'stage', text: 'On the other side, an owl waits in a great oak tree.' },
          { type: 'char',  who: 'Owl' },
          { type: 'p',     text: 'You are very brave, little fox. Do you know why?' },
          { type: 'char',  who: 'Fox' },
          { type: 'p',     text: 'Because I crossed the river?' },
          { type: 'char',  who: 'Owl' },
          { type: 'p',     text: 'Because you asked for help.' },
          { type: 'highlight', text: 'Being brave means asking for help when you need it.' }
        ]
      },
      {
        id: 'home',
        title: 'Home',
        color: 'green',
        sfx: ['celebrate'],
        body: [
          { type: 'stage', text: 'The fox returns home, happy and warm.' },
          { type: 'p',     text: 'And the fox lived bravely ever after.' }
        ]
      }
    ],
    activities: [
      {
        type: 'mc',
        prompt: 'Tap the brave little animal!',
        choices: [
          { text: '🦊 Fox',   correct: true },
          { text: '🐢 Turtle' },
          { text: '🐭 Mouse' }
        ]
      },
      {
        type: 'mc',
        prompt: 'What helped the fox cross the river?',
        choices: [
          { text: '🪵 A log',  correct: true },
          { text: '🚗 A car' },
          { text: '🪁 A kite' }
        ]
      },
      {
        type: 'mc',
        prompt: 'Being brave means…',
        choices: [
          { text: 'Asking for help', correct: true },
          { text: 'Doing it alone' },
          { text: 'Hiding away' }
        ]
      }
    ]
  };

  /* ---------- Library (localStorage-backed) ----------
     Stories live in localStorage as an array of book objects shaped
     like SAMPLE_BOOK. Per-story progress (last scene index, completed
     scene ids, activity scores) is stored separately so progress
     survives book replacement on re-import. */
  var LS_LIBRARY = 'attainjr_library_v1';
  var LS_PROGRESS = 'attainjr_progress_v1';
  var LS_LAST_BOOK = 'attainjr_last_book_v1';
  var LS_SETTINGS = 'attainjr_settings_v1';

  function loadLibrary() {
    try { var raw = localStorage.getItem(LS_LIBRARY); var arr = raw ? JSON.parse(raw) : []; if (!Array.isArray(arr)) arr = []; return arr; }
    catch (e) { return []; }
  }
  function saveLibrary(arr) {
    try { localStorage.setItem(LS_LIBRARY, JSON.stringify(arr)); } catch (e) {}
  }
  function loadProgress() {
    try { var raw = localStorage.getItem(LS_PROGRESS); return raw ? JSON.parse(raw) : {}; }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(LS_PROGRESS, JSON.stringify(p)); } catch (e) {}
  }
  function loadJrSettings() {
    try { var raw = localStorage.getItem(LS_SETTINGS); return raw ? JSON.parse(raw) : {}; }
    catch (e) { return {}; }
  }
  function saveJrSettings(s) {
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); } catch (e) {}
  }
  function bookId(b) {
    // Stable id derived from title so the same uploaded book updates
    // rather than spawning duplicates.
    return 'b_' + (b.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
  }
  function ensureSampleInLibrary() {
    var lib = loadLibrary();
    var sampleId = bookId(SAMPLE_BOOK);
    if (!lib.some(function (b) { return bookId(b) === sampleId; })) {
      lib.unshift(Object.assign({}, SAMPLE_BOOK, { __sample: true }));
      saveLibrary(lib);
    }
    return lib;
  }

  var library = ensureSampleInLibrary();
  var book = (function () {
    // Restore last-opened book if its id still exists, else fall back
    // to the first library entry (which is always at minimum the
    // bundled sample).
    var lastId = null;
    try { lastId = localStorage.getItem(LS_LAST_BOOK); } catch (e) {}
    if (lastId) {
      var hit = library.filter(function (b) { return bookId(b) === lastId; })[0];
      if (hit) return hit;
    }
    return library[0] || SAMPLE_BOOK;
  })();
  var currentSceneIdx = 0;
  var currentTab = 'reader';
  var withMusic = false;

  /* ---------- Splash ---------- */
  // dismissSplash(opts) — opts.music starts background music,
  // opts.tab picks which tab to show first. Default lands on
  // Activities so the kid sees the activity grid (mirroring Attain's
  // chapter-then-activities flow). The Reader tab is always one tap
  // away via the topbar pill or the in-tab "Reader" button.
  function dismissSplash(opts) {
    opts = opts || {};
    document.body.classList.remove('splash-on');
    var s = document.getElementById('splash'); if (s) s.remove();
    document.getElementById('app').hidden = false;
    if (opts.music) startMusic();
    selectTab(opts.tab || 'activities');
  }
  bind('b-begin', 'click', function () {
    primeAudio();
    // "Begin Reading" implies they want the colourful reader, not the
    // activity grid — opt them straight in.
    dismissSplash({ tab: 'reader' });
  });
  bind('b-begin-music', 'click', function () {
    primeAudio();
    dismissSplash({ music: true, tab: 'reader' });
  });
  bind('b-parent', 'click', openParentGate);

  /* ---------- Splash home features (Library / Upload / Progress / Settings / Export) ---------- */
  function renderLibraryGrid() {
    var grid = document.getElementById('jr-library-grid');
    if (!grid) return;
    library = loadLibrary();
    if (!library.length) ensureSampleInLibrary();
    library = loadLibrary();
    var currentId = bookId(book);
    var html = library.map(function (b) {
      var id = bookId(b);
      var on = id === currentId ? ' on' : '';
      var sceneCount = (b.scenes || []).length;
      var coverImg = b.cover ? '<img class="jr-card-cover" src="' + escAttr(b.cover) + '" alt="">'
        : '<div class="jr-card-cover jr-card-cover-fallback">📖</div>';
      var sample = b.__sample ? '<span class="jr-card-tag">Sample</span>' : '';
      return '<button class="jr-story-card' + on + '" data-book-id="' + escAttr(id) + '">' +
        coverImg +
        '<div class="jr-card-body">' +
          '<div class="jr-card-title">' + escHtml(b.title || 'Untitled') + '</div>' +
          '<div class="jr-card-sub">' + sceneCount + ' scene' + (sceneCount === 1 ? '' : 's') +
            (b.author ? ' · ' + escHtml(b.author) : '') + '</div>' +
        '</div>' +
        sample +
        (b.__sample ? '' : '<button class="jr-card-del" data-del-id="' + escAttr(id) + '" aria-label="Delete">×</button>') +
      '</button>';
    }).join('') +
    '<button class="jr-story-card jr-story-new" id="jr-card-new" aria-label="Upload a new story">' +
      '<div class="jr-card-cover jr-card-cover-new">+</div>' +
      '<div class="jr-card-body"><div class="jr-card-title">Upload a story</div>' +
      '<div class="jr-card-sub">JSON file for now</div></div>' +
    '</button>';
    grid.innerHTML = html;
    Array.prototype.forEach.call(grid.querySelectorAll('.jr-story-card[data-book-id]'), function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('.jr-card-del')) return;
        var id = card.getAttribute('data-book-id');
        var hit = library.filter(function (b) { return bookId(b) === id; })[0];
        if (!hit) return;
        switchToBook(hit);
      });
    });
    Array.prototype.forEach.call(grid.querySelectorAll('.jr-card-del'), function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-del-id');
        if (!confirm('Remove this story from your library? Progress for this story will also be cleared.')) return;
        var lib = loadLibrary().filter(function (b) { return bookId(b) !== id; });
        saveLibrary(lib);
        var prog = loadProgress(); delete prog[id]; saveProgress(prog);
        if (bookId(book) === id) book = lib[0] || SAMPLE_BOOK;
        renderLibraryGrid();
      });
    });
    var newCard = document.getElementById('jr-card-new');
    if (newCard) newCard.addEventListener('click', function () {
      document.getElementById('jr-file-picker').click();
    });
  }

  function switchToBook(b) {
    book = b;
    currentSceneIdx = 0;
    try { localStorage.setItem(LS_LAST_BOOK, bookId(b)); } catch (e) {}
    primeAudio();
    dismissSplash();
  }

  /* Upload a new story. v1 accepts JSON shaped like SAMPLE_BOOK
     (title, characters, scenes, etc.). Future versions will accept
     ZIP / EPUB picture-book bundles. */
  document.getElementById('jr-upload-story').addEventListener('click', function () {
    document.getElementById('jr-file-picker').click();
  });
  document.getElementById('jr-get-started').addEventListener('click', function () {
    primeAudio();
    dismissSplash();
  });
  document.getElementById('jr-file-picker').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-picking the same file
    if (!f) return;
    var lower = f.name.toLowerCase();
    if (/\.json$/.test(lower))           handleJsonImport(f);
    else if (/\.(html?|htm)$/.test(lower)) handleHtmlImport(f);
    else if (/\.epub$/.test(lower))      handleEpubImport(f);
    else if (/\.zip$/.test(lower))       handleZipImport(f);
    else alert('Pick a .json story, an .html / .htm web app, an .epub book, or a .zip PWA bundle.');
  });

  function handleJsonImport(f) {
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var parsed = JSON.parse(rd.result);
        if (!parsed || !parsed.title || !Array.isArray(parsed.scenes)) {
          alert('That JSON does not look like an Attain Jr story (needs at least a title and scenes).');
          return;
        }
        addBookToLibrary(parsed);
      } catch (err) {
        alert('Could not read that file. Make sure it is valid JSON.');
      }
    };
    rd.readAsText(f);
  }

  function handleHtmlImport(f) {
    var rd = new FileReader();
    rd.onload = function () {
      Promise.resolve(htmlToBook(rd.result, f.name)).then(function (book) {
        if (!book) { alert('Could not read that HTML file.'); return; }
        addBookToLibrary(book);
      });
    };
    rd.readAsText(f);
  }

  /* EPUB import. EPUBs are ZIPs with a known structure:
       META-INF/container.xml -> rootfile path (usually content.opf)
       content.opf            -> manifest, spine, metadata
       spine                  -> ordered list of chapter files (XHTML)
     We pick out the spine items in order, parse each as HTML, and
     turn each into a scene. Cover image is found via either the
     manifest's properties="cover-image" item or a metadata
     <meta name="cover" content="<id>"> reference. */
  function handleEpubImport(f) {
    if (!window.JSZip) { alert('JSZip is missing — please refresh the page.'); return; }
    var rd = new FileReader();
    rd.onload = function () {
      window.JSZip.loadAsync(rd.result).then(function (zip) {
        return parseEpubZip(zip, f.name);
      }).then(function (b) {
        if (!b) { alert('Could not read that EPUB.'); return; }
        addBookToLibrary(b);
      }).catch(function () { alert('Could not unzip that EPUB file.'); });
    };
    rd.readAsArrayBuffer(f);
  }

  function parseEpubZip(zip, filename) {
    var containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) return Promise.resolve(null);
    return containerFile.async('string').then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, 'application/xml');
      var rootEl = doc.querySelector('rootfile');
      if (!rootEl) return null;
      var opfPath = rootEl.getAttribute('full-path');
      if (!opfPath) return null;
      var opfFile = zip.file(opfPath);
      if (!opfFile) return null;
      var opfDir = opfPath.indexOf('/') >= 0 ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
      return opfFile.async('string').then(function (opfXml) {
        var opf = new DOMParser().parseFromString(opfXml, 'application/xml');
        var title = (opf.querySelector('metadata title') || {}).textContent || filename.replace(/\.epub$/i, '');
        var author = (opf.querySelector('metadata creator') || {}).textContent || 'Imported';
        // Manifest: id -> { href, mediaType, properties }
        var manifest = {};
        Array.prototype.forEach.call(opf.querySelectorAll('manifest > item'), function (it) {
          manifest[it.getAttribute('id')] = {
            href: opfDir + (it.getAttribute('href') || ''),
            type: it.getAttribute('media-type') || '',
            props: it.getAttribute('properties') || ''
          };
        });
        // Cover detection: prefer properties="cover-image", then any
        // metadata <meta name="cover" content=ID>, then any image
        // file with "cover" in the path.
        var coverItem = null;
        Object.keys(manifest).forEach(function (id) {
          if (!coverItem && /\bcover-image\b/.test(manifest[id].props)) coverItem = manifest[id];
        });
        if (!coverItem) {
          var metaCover = opf.querySelector('metadata > meta[name="cover"]');
          if (metaCover && manifest[metaCover.getAttribute('content')]) {
            coverItem = manifest[metaCover.getAttribute('content')];
          }
        }
        if (!coverItem) {
          Object.keys(manifest).forEach(function (id) {
            if (!coverItem && /image\//i.test(manifest[id].type) && /cover/i.test(manifest[id].href)) {
              coverItem = manifest[id];
            }
          });
        }
        // Spine: ordered list of chapter idrefs.
        var spine = Array.prototype.map.call(opf.querySelectorAll('spine > itemref'), function (ir) {
          return ir.getAttribute('idref');
        }).map(function (idref) { return manifest[idref]; }).filter(Boolean);

        var coverP = coverItem ? readImageAsDataUrl(zip, coverItem.href, coverItem.type) : Promise.resolve('');
        var scenesP = Promise.all(spine.map(function (it, i) {
          var f = zip.file(it.href);
          if (!f) return null;
          return f.async('string').then(function (html) {
            // Resolve <img src> to data URLs from the zip so they
            // render — EPUBs use relative paths like
            // "images/cover.jpg" that don't exist on the web.
            return chapterHtmlToScene(html, i, zip, it.href);
          });
        })).then(function (scenes) { return scenes.filter(Boolean); });

        return Promise.all([coverP, scenesP]).then(function (out) {
          var cover = out[0];
          var scenes = out[1];
          // Skip empty/blank scenes (typical EPUB has a cover-only
          // first chapter with nothing to read).
          scenes = scenes.filter(function (s) { return s.body && s.body.length > 0; });
          if (!scenes.length) return null;
          return {
            title: (title || '').trim() || 'Untitled',
            author: (author || '').trim() || 'Imported',
            ageBand: '6-8',
            cover: cover || '',
            characters: [],
            storyworld: { setting: '', time: '', lesson: '' },
            gallery: [],
            scenes: scenes,
            activities: []
          };
        });
      });
    });
  }

  function readImageAsDataUrl(zip, path, mime) {
    var f = zip.file(path);
    if (!f) return Promise.resolve('');
    return f.async('base64').then(function (b64) {
      var ext = (path.split('.').pop() || '').toLowerCase();
      var m = mime || (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png');
      return 'data:' + m + ';base64,' + b64;
    });
  }

  function chapterHtmlToScene(html, idx, zip, chapterHref) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc || !doc.body) return Promise.resolve(null);
    var sceneTitle = '';
    var h = doc.querySelector('h1, h2, h3');
    if (h && h.textContent.trim()) sceneTitle = h.textContent.trim().slice(0, 40);
    var colors = ['blue', 'orange', 'purple', 'green', 'pink', 'teal'];
    var nodes = doc.body.querySelectorAll('h1, h2, h3, p, blockquote, img, image');
    var body = [];
    var imgPromises = [];
    var chapterDir = chapterHref && chapterHref.indexOf('/') >= 0
      ? chapterHref.substring(0, chapterHref.lastIndexOf('/') + 1) : '';
    Array.prototype.forEach.call(nodes, function (n) {
      var tag = n.tagName.toLowerCase();
      if (tag === 'img' || tag === 'image') {
        // SVG <image> uses xlink:href; HTML <img> uses src.
        var rawSrc = n.getAttribute('src')
          || n.getAttribute('xlink:href')
          || n.getAttribute('href')
          || '';
        if (!rawSrc) return;
        var alt = n.getAttribute('alt') || '';
        var blockIdx = body.length;
        body.push({ type: 'img', src: rawSrc, alt: alt });
        if (zip) {
          imgPromises.push(resolveZipImageRef(zip, rawSrc, chapterDir).then(function (dataUrl) {
            if (dataUrl) body[blockIdx].src = dataUrl;
            else body[blockIdx]._broken = true;
          }));
        }
      } else if (tag === 'blockquote' || tag === 'h3') {
        var t = (n.textContent || '').trim();
        if (t) body.push({ type: 'highlight', text: t });
      } else {
        var t2 = (n.textContent || '').trim();
        if (t2) body.push({ type: 'p', text: t2 });
      }
    });

    function finish() {
      // Replace broken images with a visible placeholder block so the
      // user can see which path failed and we don't render the
      // browser's default broken-image icon.
      var clean = body.map(function (b) {
        if (b.type === 'img' && b._broken) {
          return { type: 'highlight', text: '🖼 Image not found in EPUB: ' + (b.src || '(no src)') };
        }
        return b;
      });
      return {
        id: 's' + (idx + 1),
        title: sceneTitle || ('Chapter ' + (idx + 1)),
        color: colors[idx % colors.length],
        sfx: [],
        body: clean
      };
    }
    if (!imgPromises.length) return Promise.resolve(finish());
    return Promise.all(imgPromises).then(finish);
  }

  /* Resolve a relative image href (from inside an EPUB or PWA zip)
     to a base64 data URL. Tries the literal path first, then the
     chapter-relative path, then a few common rewrites (strip leading
     ./, drop a ../ traversal, look in any "images" or "OEBPS"
     subfolder). Returns '' if no match. */
  function resolveZipImageRef(zip, rawSrc, chapterDir) {
    if (!rawSrc) return Promise.resolve('');
    var normalized = rawSrc.replace(/^\.\//, '').replace(/\\/g, '/');
    // Strip any URL fragment / query before lookup.
    normalized = normalized.split('#')[0].split('?')[0];
    // Decode %20 etc. so a pretty filename matches the zip path.
    try { normalized = decodeURIComponent(normalized); } catch (e) {}
    var basename = normalized.split('/').pop();
    var candidates = [
      normalized,
      chapterDir + normalized,
      chapterDir.replace(/[^/]+\/$/, '') + normalized,
      'OEBPS/' + normalized,
      'OPS/' + normalized,
      'EPUB/' + normalized,
      normalized.replace(/^\.\.\//, ''),
      'images/' + basename,
      'Images/' + basename,
      'IMAGES/' + basename,
      'OEBPS/images/' + basename,
      'OEBPS/Images/' + basename,
      'OPS/images/' + basename,
      basename
    ];
    // Resolve any "../" segments left in candidates against simple
    // path arithmetic so EPUBs with chapters in OEBPS/text/ pointing
    // at ../images/ still work.
    candidates = candidates.map(resolveDots);
    // De-dup and try each.
    var seen = {};
    candidates = candidates.filter(function (p) { if (seen[p]) return false; seen[p] = true; return !!p; });
    function tryNext(i) {
      if (i >= candidates.length) {
        // Last resort: walk the entire zip looking for a basename match.
        var hit = null;
        zip.forEach(function (path, entry) {
          if (!entry.dir && path.split('/').pop().toLowerCase() === basename.toLowerCase()) hit = path;
        });
        if (hit) return readImageAsDataUrl(zip, hit);
        try { console.warn('[Attain Jr] image not found in ZIP:', rawSrc, '— tried:', candidates); } catch (_) {}
        return Promise.resolve('');
      }
      var f = zip.file(candidates[i]);
      if (!f) return tryNext(i + 1);
      return readImageAsDataUrl(zip, candidates[i]);
    }
    return tryNext(0);
  }
  function resolveDots(path) {
    var parts = path.split('/');
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === '..') out.pop();
      else if (parts[i] !== '.') out.push(parts[i]);
    }
    return out.join('/');
  }

  function handleZipImport(f) {
    if (!window.JSZip) { alert('JSZip is missing — please refresh the page.'); return; }
    var rd = new FileReader();
    rd.onload = function () {
      window.JSZip.loadAsync(rd.result).then(function (zip) {
        // Find an index.html (root preferred) or first .html file.
        var candidates = [];
        zip.forEach(function (path, entry) {
          if (entry.dir) return;
          if (/\.(html?|htm)$/i.test(path)) candidates.push(path);
        });
        if (!candidates.length) { alert('No HTML file found in that ZIP.'); return; }
        candidates.sort(function (a, b) {
          var ai = /(^|\/)index\.html?$/i.test(a) ? 0 : a.split('/').length;
          var bi = /(^|\/)index\.html?$/i.test(b) ? 0 : b.split('/').length;
          return ai - bi;
        });
        var picked = candidates[0];
        return zip.file(picked).async('string').then(function (html) {
          return htmlToBook(html, f.name, zip, picked);
        }).then(function (book) {
          if (!book) { alert('Could not parse the HTML inside the ZIP.'); return; }
          // Look for a manifest.json or sibling files we can pull a cover image from.
          var coverPath = null;
          zip.forEach(function (path) {
            if (coverPath) return;
            if (/(^|\/)icon\.(png|jpe?g|webp)$/i.test(path)) coverPath = path;
            else if (/(^|\/)cover\.(png|jpe?g|webp)$/i.test(path)) coverPath = path;
            else if (/(^|\/)splash\.(png|jpe?g|webp)$/i.test(path)) coverPath = path;
          });
          if (coverPath) {
            return zip.file(coverPath).async('base64').then(function (b64) {
              var ext = coverPath.split('.').pop().toLowerCase();
              var mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                : ext === 'webp' ? 'image/webp' : 'image/png';
              book.cover = 'data:' + mime + ';base64,' + b64;
              addBookToLibrary(book);
            });
          }
          addBookToLibrary(book);
        });
      }).catch(function () { alert('Could not unzip that file.'); });
    };
    rd.readAsArrayBuffer(f);
  }

  /* Convert an HTML document into an Attain Jr book object.
     Heuristic: split by <h1>/<h2> headings into scenes; everything
     between two headings becomes that scene's body. Each <p> becomes
     a paragraph block, each <img> becomes an image block. Title comes
     from <title> or first <h1>. */
  function htmlToBook(html, filename, zip, htmlHref) {
    if (!html || typeof html !== 'string') return null;
    var doc;
    try { doc = new DOMParser().parseFromString(html, 'text/html'); }
    catch (e) { return null; }
    if (!doc || !doc.body) return null;
    var title = (doc.querySelector('title') && doc.querySelector('title').textContent.trim()) ||
                (doc.querySelector('h1') && doc.querySelector('h1').textContent.trim()) ||
                filename.replace(/\.(html?|htm|zip)$/i, '');
    var scenes = [];
    var cur = { id: 'intro', title: 'Beginning', color: 'blue', sfx: [], body: [] };
    var sceneCount = 0;
    var colors = ['blue', 'orange', 'purple', 'green', 'pink', 'teal'];
    function flush() { if (cur.body.length) scenes.push(cur); }
    var imgPromises = [];
    var htmlDir = htmlHref && htmlHref.indexOf('/') >= 0
      ? htmlHref.substring(0, htmlHref.lastIndexOf('/') + 1) : '';
    var nodes = doc.body.querySelectorAll('h1, h2, h3, p, blockquote, li, img, image');
    // Track characters discovered via data-role / "NAME:" patterns so
    // we can publish them on book.characters and the colour-coded
    // reader pulls each one's paint automatically.
    var discoveredChars = {};
    function recordChar(role, displayName) {
      if (!role) return;
      if (!discoveredChars[role]) {
        discoveredChars[role] = { name: displayName || role, emoji: '' };
      } else if (displayName && discoveredChars[role].name === role) {
        discoveredChars[role].name = displayName;
      }
    }
    Array.prototype.forEach.call(nodes, function (n) {
      var tag = n.tagName.toLowerCase();
      // Stop Lion / Jonah-style speaker label: <p class="speaker" data-role="lion">LION</p>
      // Becomes a char block; the very NEXT paragraph is attributed.
      if (tag === 'p' && (n.classList.contains('speaker') || n.getAttribute('data-role'))) {
        var role = (n.getAttribute('data-role') || (n.textContent || '').trim().toLowerCase()).replace(/[^a-z0-9]+/g, '');
        var label = (n.textContent || '').trim();
        if (role && label) {
          recordChar(role, label);
          cur.body.push({ type: 'char', who: role });
          return;
        }
      }
      // Stop Lion-style stage direction: <p class="action">...</p>
      if (tag === 'p' && n.classList.contains('action')) {
        var actionText = (n.textContent || '').trim();
        if (actionText) cur.body.push({ type: 'stage', text: actionText });
        return;
      }
      if (tag === 'h1' || tag === 'h2') {
        flush();
        sceneCount++;
        cur = {
          id: 's' + sceneCount,
          title: (n.textContent || '').trim().slice(0, 40) || ('Scene ' + sceneCount),
          color: colors[sceneCount % colors.length],
          sfx: [],
          body: []
        };
      } else if (tag === 'h3') {
        var t = (n.textContent || '').trim();
        if (t) cur.body.push({ type: 'highlight', text: t });
      } else if (tag === 'img' || tag === 'image') {
        var rawSrc = n.getAttribute('src')
          || n.getAttribute('xlink:href')
          || n.getAttribute('href')
          || '';
        if (!rawSrc) return;
        // Skip absolute http(s)/data URLs — those already resolve.
        if (/^(?:https?:|data:|blob:)/.test(rawSrc)) {
          cur.body.push({ type: 'img', src: rawSrc, alt: n.getAttribute('alt') || '' });
          return;
        }
        // Relative — only useful if we have a zip to resolve from.
        if (zip) {
          var blockTarget = cur;
          var blockIdx = blockTarget.body.length;
          blockTarget.body.push({ type: 'img', src: rawSrc, alt: n.getAttribute('alt') || '' });
          imgPromises.push(resolveZipImageRef(zip, rawSrc, htmlDir).then(function (dataUrl) {
            if (dataUrl) blockTarget.body[blockIdx].src = dataUrl;
            else blockTarget.body[blockIdx]._broken = true;
          }));
        }
        // No zip and a relative src can't load — drop silently.
      } else if (tag === 'blockquote') {
        var qt = (n.textContent || '').trim();
        if (qt) cur.body.push({ type: 'highlight', text: qt });
      } else {
        var t2 = (n.textContent || '').trim();
        if (!t2) return;
        // Jonah-style inline cast pattern: "JONAH: text" or "GOD — text".
        // Convert into a [char] + [p] pair so the colour-tint render
        // path picks the speaker up.
        var inline = t2.match(/^([A-Z][A-Z' .#0-9-]{1,30})\s*[:—–-]\s*(.+)$/);
        if (inline) {
          var role = inline[1].toLowerCase().replace(/[^a-z0-9]+/g, '');
          if (role && role.length >= 2) {
            recordChar(role, inline[1].trim());
            cur.body.push({ type: 'char', who: role });
            cur.body.push({ type: 'p', text: inline[2].trim() });
            return;
          }
        }
        cur.body.push({ type: 'p', text: t2 });
      }
    });
    flush();
    function finish() {
      // Replace broken images with a visible placeholder so the user
      // can see exactly which path inside the ZIP didn't resolve.
      scenes.forEach(function (s) {
        s.body = s.body.map(function (b) {
          if (b.type === 'img' && b._broken) {
            return { type: 'highlight', text: '🖼 Image not found in ZIP: ' + (b.src || '(no src)') };
          }
          return b;
        });
      });
      if (!scenes.length) return null;
      // Publish characters discovered during the walk so per-character
      // colour tinting kicks in for imported books.
      var charList = Object.keys(discoveredChars).map(function (key) {
        var c = discoveredChars[key];
        return { name: key, displayName: c.name, emoji: c.emoji || '' };
      });
      return {
        title: title,
        author: 'Imported',
        ageBand: '6-8',
        cover: '',
        characters: charList,
        storyworld: { setting: '', time: '', lesson: '' },
        gallery: [],
        scenes: scenes,
        activities: []
      };
    }
    if (!imgPromises.length) return finish();
    return Promise.all(imgPromises).then(finish);
  }

  function addBookToLibrary(b) {
    var lib = loadLibrary();
    var id = bookId(b);
    var idx = -1;
    for (var i = 0; i < lib.length; i++) { if (bookId(lib[i]) === id) { idx = i; break; } }
    if (idx >= 0) lib[idx] = b; else lib.push(b);
    saveLibrary(lib);
    renderLibraryGrid();
    // Match Attain's flow: once a story is uploaded, jump straight
    // into Activities for that book instead of leaving the user on
    // the splash to figure out which tile to tap. Reader is one tap
    // away via the topbar pill or the in-content Activities button.
    book = b;
    currentSceneIdx = 0;
    try { localStorage.setItem(LS_LAST_BOOK, bookId(b)); } catch (e) {}
    if (document.getElementById('splash')) {
      primeAudio();
      dismissSplash({ tab: 'activities' });
    } else {
      // Splash already dismissed (e.g. user re-uploaded from inside
      // the app). Just navigate the visible app to Activities.
      try { selectTab('activities'); } catch (e) {}
    }
  }

  /* Export now: write the entire library + progress + settings to a
     downloadable JSON file. Same shape as the import format so a
     user can re-import on a new device. */
  document.getElementById('jr-export-now').addEventListener('click', function () {
    var payload = {
      __attainjr: true,
      version: 1,
      exportedAt: new Date().toISOString(),
      library: loadLibrary(),
      progress: loadProgress(),
      settings: loadJrSettings()
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'attain-jr-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  });

  /* Settings modal */
  document.getElementById('jr-settings').addEventListener('click', openJrSettings);
  function openJrSettings() {
    var m = document.getElementById('jr-settings-modal');
    var s = loadJrSettings();
    document.getElementById('jr-set-font').textContent = s.font === 'opendyslexic' ? 'OpenDyslexic' : 'Off';
    document.getElementById('jr-set-contrast').textContent = s.contrast ? 'On' : 'Off';
    document.getElementById('jr-set-voice-mode').textContent = s.voiceMode === 'single' ? 'Single' : 'Cast';
    document.getElementById('jr-set-music').textContent = s.musicOnStart ? 'On' : 'Off';
    m.hidden = false;
  }
  document.getElementById('jr-set-close').addEventListener('click', function () {
    document.getElementById('jr-settings-modal').hidden = true;
    applyJrSettings();
  });
  document.getElementById('jr-set-font').addEventListener('click', function () {
    var s = loadJrSettings();
    s.font = (s.font === 'opendyslexic') ? 'off' : 'opendyslexic';
    saveJrSettings(s);
    this.textContent = s.font === 'opendyslexic' ? 'OpenDyslexic' : 'Off';
    applyJrSettings();
  });
  document.getElementById('jr-set-contrast').addEventListener('click', function () {
    var s = loadJrSettings();
    s.contrast = !s.contrast;
    saveJrSettings(s);
    this.textContent = s.contrast ? 'On' : 'Off';
    applyJrSettings();
  });
  document.getElementById('jr-set-voice-mode').addEventListener('click', function () {
    var s = loadJrSettings();
    s.voiceMode = (s.voiceMode === 'single') ? 'cast' : 'single';
    saveJrSettings(s);
    this.textContent = s.voiceMode === 'single' ? 'Single' : 'Cast';
    var sel = document.getElementById('ab-voice-mode');
    if (sel) sel.value = s.voiceMode;
  });
  document.getElementById('jr-set-music').addEventListener('click', function () {
    var s = loadJrSettings();
    s.musicOnStart = !s.musicOnStart;
    saveJrSettings(s);
    this.textContent = s.musicOnStart ? 'On' : 'Off';
  });
  function applyJrSettings() {
    var s = loadJrSettings();
    document.body.classList.toggle('aa-contrast', !!s.contrast);
    if (s.font === 'opendyslexic') {
      document.body.style.fontFamily = "'OpenDyslexic', 'Lexend', sans-serif";
    } else {
      document.body.style.fontFamily = '';
    }
  }
  applyJrSettings();

  /* Progress modal */
  document.getElementById('jr-progress').addEventListener('click', openJrProgress);
  function openJrProgress() {
    var m = document.getElementById('jr-progress-modal');
    var body = document.getElementById('jr-progress-body');
    var prog = loadProgress();
    var lib = loadLibrary();
    var rows = lib.map(function (b) {
      var id = bookId(b);
      var p = prog[id] || { lastScene: 0, scenesRead: [], activitiesRight: 0, activitiesAttempted: 0 };
      var totalScenes = (b.scenes || []).length;
      var pct = totalScenes ? Math.round((p.scenesRead || []).length / totalScenes * 100) : 0;
      return '<div class="jr-prog-row">' +
        '<strong>' + escHtml(b.title) + '</strong>' +
        '<div class="jr-prog-bar"><div class="jr-prog-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="jr-prog-meta">' + ((p.scenesRead || []).length) + ' / ' + totalScenes + ' scenes &middot; ' +
          (p.activitiesRight || 0) + ' &#11088;</div>' +
      '</div>';
    }).join('');
    body.innerHTML = rows || '<p>Read your first story to start tracking progress.</p>';
    m.hidden = false;
  }
  document.getElementById('jr-prog-close').addEventListener('click', function () {
    document.getElementById('jr-progress-modal').hidden = true;
  });

  /* Kid-coloured stats row, mirrors Attain's home-stats (cards due /
     streak / level / xp). Numbers come from loadProgress(). Hidden
     until at least one stat is > 0 so a brand-new user sees the
     encouraging Get Started CTA, not a row of zeros. */
  function renderJrStats() {
    var el = document.getElementById('jr-stats');
    if (!el) return;
    var prog = loadProgress();
    var lib = loadLibrary();
    var stars = 0, scenesRead = 0, activitiesRight = 0, booksFinished = 0;
    Object.keys(prog).forEach(function (k) {
      var p = prog[k] || {};
      stars += (p.activitiesRight || 0);
      activitiesRight += (p.activitiesRight || 0);
      scenesRead += ((p.scenesRead || []).length);
      var b = lib.filter(function (x) { return bookId(x) === k; })[0];
      if (b && p.scenesRead && p.scenesRead.length >= (b.scenes || []).length && (b.scenes || []).length > 0) {
        booksFinished++;
      }
    });
    var streak = +localStorage.getItem('attainjr_streak_v1') || 0;
    var level = 1 + Math.floor(stars / 10);
    var levelEmoji = ['🐣', '🌱', '⭐', '🌈', '🚀', '🦄', '👑'][Math.min(level - 1, 6)] || '👑';
    var anyStat = stars > 0 || scenesRead > 0 || streak > 0 || booksFinished > 0;
    if (!anyStat) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    var boxes = [];
    if (stars > 0)        boxes.push({ cls: 'jr-stat-stars',     icon: '⭐', big: stars,           label: 'star' + (stars === 1 ? '' : 's') + ' earned' });
    if (streak > 0)       boxes.push({ cls: 'jr-stat-streak',    icon: '🔥', big: streak,          label: 'day streak' });
    boxes.push(             { cls: 'jr-stat-level',     icon: levelEmoji, big: 'L' + level,        label: 'reader level' });
    if (scenesRead > 0)   boxes.push({ cls: 'jr-stat-scenes',    icon: '📖', big: scenesRead,      label: 'scene' + (scenesRead === 1 ? '' : 's') + ' read' });
    if (booksFinished > 0) boxes.push({ cls: 'jr-stat-finished', icon: '🏆', big: booksFinished,   label: 'book' + (booksFinished === 1 ? '' : 's') + ' finished' });
    el.innerHTML = boxes.map(function (b) {
      return '<div class="jr-stat ' + b.cls + '">' +
        '<div class="jr-stat-icon">' + b.icon + '</div>' +
        '<div class="jr-stat-big">' + b.big + '</div>' +
        '<div class="jr-stat-label">' + b.label + '</div>' +
      '</div>';
    }).join('');
  }

  // Initial paint of the splash library grid + stats.
  renderLibraryGrid();
  renderJrStats();

  /* ---------- Tabs ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (btn) {
    btn.addEventListener('click', function () {
      selectTab(btn.getAttribute('data-tab'));
    });
  });
  function selectTab(name) {
    currentTab = name;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-tab') === name);
    });
    document.getElementById('scene-strip').hidden = name !== 'reader';
    document.getElementById('sfx-bar').hidden = !(name === 'reader' || name === 'storyworld');
    if (name === 'reader')      renderReader();
    else if (name === 'characters') renderCharacters();
    else if (name === 'storyworld') renderStoryworld();
    else if (name === 'gallery')    renderGallery();
    else if (name === 'activities') renderActivities();
  }

  /* ---------- Reader ---------- */
  function renderReader() {
    var strip = document.getElementById('scene-strip');
    strip.innerHTML = (book.scenes || []).map(function (s, i) {
      var on = i === currentSceneIdx ? ' on' : '';
      return '<button class="scene-pill' + on + '" data-color="' + s.color + '" data-idx="' + i + '">' + escHtml(s.title) + '</button>';
    }).join('');
    Array.prototype.forEach.call(strip.querySelectorAll('.scene-pill'), function (el) {
      el.addEventListener('click', function () {
        currentSceneIdx = parseInt(el.getAttribute('data-idx'), 10) || 0;
        stopRead();
        renderReader();
      });
    });
    var sc = (book.scenes || [])[currentSceneIdx];
    var c = document.getElementById('content');
    if (!sc) {
      c.innerHTML = '<h1>' + escHtml(book.title || 'Untitled') + '</h1>' +
        '<p>This book has no scenes yet. Try uploading a different story.</p>' +
        '<button class="jr-jump-act" data-jump-tab="activities">🚀 Open Activities</button>';
      bindAll('.jr-jump-act', 'click', function (el) { selectTab(el.getAttribute('data-jump-tab') || 'activities'); });
      return;
    }
    // Quick "jump to Activities" pill always visible at the top of the
    // reader so a user can leave the reading surface without hunting
    // the topbar (which sometimes scrolls Activities off screen on
    // narrow iPads).
    var html = '<div class="jr-reader-cta">' +
      '<button class="jr-jump-act" data-jump-tab="activities">🚀 Activities</button>' +
      '</div>';
    html += '<h1>' + escHtml(book.title) + '</h1>';
    html += '<h2 style="color:#7b6cff">Scene: ' + escHtml(sc.title) + '</h2>';
    html += sc.body.map(renderBlock).join('');
    c.innerHTML = html;
    // Activate the jump-to-activities button after innerHTML is set.
    bindAll('.jr-jump-act', 'click', function (el) { selectTab(el.getAttribute('data-jump-tab') || 'activities'); });
    // Tap-to-highlight (Stop Lion pattern). Tapping a readable line
    // toggles a yellow highlight; in focus mode it also becomes the
    // single un-dimmed paragraph.
    bindAll('.content [data-rl]', 'click', function (el, ev) {
      if (ev && ev.target && ev.target !== el && (ev.target.tagName === 'A' || ev.target.tagName === 'BUTTON')) return;
      var alreadyOn = el.classList.contains('jr-highlighted');
      if (document.body.classList.contains('jr-focus-mode')) {
        Array.prototype.forEach.call(document.querySelectorAll('.jr-focus-on'), function (p) { p.classList.remove('jr-focus-on'); });
        if (!alreadyOn) el.classList.add('jr-focus-on');
      }
      el.classList.toggle('jr-highlighted', !alreadyOn);
    });
    // Mark this scene read after a short dwell so a quick swipe past
    // doesn't count, but a real read does.
    scheduleSceneReadMark(sc.id);
  }
  var sceneReadTimer = null;
  function scheduleSceneReadMark(sceneId) {
    clearTimeout(sceneReadTimer);
    sceneReadTimer = setTimeout(function () { markSceneRead(sceneId); }, 4000);
  }
  function markSceneRead(sceneId) {
    if (!sceneId) return;
    var prog = loadProgress();
    var id = bookId(book);
    var p = prog[id] || { lastScene: 0, scenesRead: [], activitiesRight: 0, activitiesAttempted: 0 };
    p.lastScene = currentSceneIdx;
    p.scenesRead = p.scenesRead || [];
    if (p.scenesRead.indexOf(sceneId) === -1) {
      p.scenesRead.push(sceneId);
      bumpDailyStreak();
    }
    prog[id] = p;
    saveProgress(prog);
  }
  // Walking renderer state — when a [char] block is seen, the next
  // [p] block is attributed to that character and gets that
  // character's colour as its background tint, mirroring the colour-
  // coded reading style the user pointed out in their reference ZIPs.
  var _renderCurrentChar = null;
  function characterColor(name) {
    if (!name || !book.characters) return null;
    var ch = book.characters.filter(function (x) { return x.name === name; })[0];
    if (!ch) return null;
    if (ch.color) return ch.color;
    // Auto-assign a stable colour from a kid-friendly palette so books
    // with no per-character colour still get the highlight effect.
    var palette = ['#ff6b6b', '#4ea0ff', '#2bbd7e', '#a36cff', '#ff9a3a', '#ff6ba6', '#ffd166', '#2fb6c4'];
    var hash = 0;
    for (var i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    ch.color = palette[Math.abs(hash) % palette.length];
    return ch.color;
  }
  function renderBlock(b) {
    if (b.type === 'stage') {
      _renderCurrentChar = null; // stage directions reset speaker
      return '<div class="stage" data-rl>' + escHtml(b.text) + '</div>';
    }
    if (b.type === 'highlight') return '<div class="highlight" data-rl data-story>' + escHtml(b.text) + '</div>';
    if (b.type === 'char') {
      _renderCurrentChar = b.who;
      var ch = (book.characters || []).filter(function (x) { return x.name === b.who; })[0];
      var em = ch ? ch.emoji : '';
      // Prefer the human-readable displayName (e.g. "LION") over the
      // canonical role key (e.g. "lion") for the visible label.
      var label = (ch && ch.displayName) ? ch.displayName : b.who;
      var color = characterColor(b.who) || '#7b6cff';
      return '<div class="char" data-char="' + escHtml(b.who) + '" style="--char-color:' + color + '">' +
        em + ' ' + escHtml(label.toUpperCase()) + '</div>';
    }
    if (b.type === 'p') {
      // Tint this paragraph with the speaker's colour if a [char]
      // block was seen most recently. Reset after rendering so the
      // next paragraph (without a speaker) reverts to plain prose.
      var who = _renderCurrentChar;
      _renderCurrentChar = null;
      var styleAttr = '';
      var classAttr = ' data-story';
      if (who) {
        var c = characterColor(who) || '#7b6cff';
        styleAttr = ' style="--char-color:' + c + '"';
        classAttr += ' jr-p-spoken';
      }
      return '<p data-rl' + classAttr + (who ? ' data-spoken-by="' + escAttr(who) + '"' : '') + styleAttr + '>' +
        escHtml(b.text) + '</p>';
    }
    if (b.type === 'img') return '<div class="imgcard"><img src="' + escAttr(b.src) + '" alt="' + escAttr(b.alt || '') + '"></div>';
    return '';
  }

  /* ---------- Characters ---------- */
  function renderCharacters() {
    var c = document.getElementById('content');
    c.innerHTML = '<h1>Characters</h1>' + book.characters.map(function (ch) {
      return '<div class="act"><h3>' + ch.emoji + ' ' + escHtml(ch.name) + '</h3>' +
        '<p>Voice hint: ' + escHtml(ch.voiceHint) + '</p>' +
      '</div>';
    }).join('');
  }

  /* ---------- Storyworld ---------- */
  function renderStoryworld() {
    var c = document.getElementById('content');
    var sw = book.storyworld || {};
    c.innerHTML = '<h1>Storyworld</h1>' +
      '<div class="act"><h3>📍 Where</h3><p>' + escHtml(sw.setting || '') + '</p></div>' +
      '<div class="act"><h3>🕰 When</h3><p>' + escHtml(sw.time || '') + '</p></div>' +
      '<div class="act"><h3>💡 Lesson</h3><p>' + escHtml(sw.lesson || '') + '</p></div>';
  }

  /* ---------- Gallery ---------- */
  function renderGallery() {
    var c = document.getElementById('content');
    c.innerHTML = '<h1>Gallery</h1>' + (book.gallery || []).map(function (g) {
      return '<div class="imgcard"><img src="' + escAttr(g.src) + '" alt="' + escAttr(g.caption || '') + '"></div>' +
        (g.caption ? '<p style="text-align:center;color:#666;">' + escHtml(g.caption) + '</p>' : '');
    }).join('');
  }

  /* ---------- Activities ---------- */
  /* ---------- Activities tab ----------
     Mirrors Attain's chapter activity grid (Read / Breakdown / Fill in
     Blank / Multiple Choice / etc.) but kid-coloured with cloud-blob
     shaped tiles to keep it visually distinct. Picks a current scene
     from the scene strip above. Tap a tile to launch that activity.
     Activities are auto-derived from the book's content where
     possible (T/F from paragraph blocks, Who-Said-It from char
     blocks, Sequence from the scene list itself). */
  var JR_ACTIVITIES = [
    // Big primary tile — runs every mini-game in order so the child
    // ends with a well-rounded grasp of the book.
    { id: 'quest',   label: 'Book Quest',     emoji: '🚀', cls: 'jr-act-rainbow', big: true },
    { id: 'read',    label: 'Read',           emoji: '📖', cls: 'jr-act-blue'    },
    { id: 'listen',  label: 'Listen',         emoji: '🔊', cls: 'jr-act-teal'    },
    { id: 'mc',      label: 'Multiple Choice',emoji: '🎯', cls: 'jr-act-purple'  },
    { id: 'tf',      label: 'True or False',  emoji: '⚖️', cls: 'jr-act-green'   },
    { id: 'who',     label: 'Who Said It?',   emoji: '💬', cls: 'jr-act-violet'  },
    { id: 'seq',     label: 'Story Sequence', emoji: '🔄', cls: 'jr-act-orange'  },
    { id: 'world',   label: 'Storyworld',     emoji: '🌍', cls: 'jr-act-pink'    },
    { id: 'lesson',  label: 'What I Learned', emoji: '💡', cls: 'jr-act-yellow'  }
  ];
  var JR_QUEST_STEPS = ['listen', 'who', 'tf', 'seq', 'world', 'lesson'];
  var JR_QUESTION_CAP = 3; // short books, short attention spans

  function renderActivities() {
    var c = document.getElementById('content');
    var tiles = JR_ACTIVITIES.map(function (a) {
      var bigCls = a.big ? ' jr-act-tile-big' : '';
      return '<button class="jr-act-tile ' + a.cls + bigCls + '" data-jr-act="' + a.id + '">' +
        '<span class="jr-act-emoji" aria-hidden="true">' + a.emoji + '</span>' +
        '<span class="jr-act-label">' + a.label + '</span>' +
      '</button>';
    }).join('');
    c.innerHTML =
      '<h1 class="jr-act-h1">Activities</h1>' +
      '<p class="jr-act-sub">Tap a cloud to play. Earn ⭐ for every right answer!</p>' +
      '<div class="jr-act-grid">' + tiles + '</div>' +
      '<div id="jr-act-stage" class="jr-act-stage" hidden></div>';
    Array.prototype.forEach.call(c.querySelectorAll('.jr-act-tile'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-jr-act');
        playSfx('pop');
        launchActivity(id);
      });
    });
  }

  function launchActivity(id) {
    var stage = document.getElementById('jr-act-stage');
    if (!stage) return;
    stage.hidden = false;
    if (id === 'read')    return runReadActivity(stage);
    if (id === 'listen')  return runListenActivity(stage);
    if (id === 'mc')      return runMcActivity(stage);
    if (id === 'tf')      return runTrueFalseActivity(stage);
    if (id === 'who')     return runWhoSaidItActivity(stage);
    if (id === 'seq')     return runSequenceActivity(stage);
    if (id === 'world')   return runStoryworldActivity(stage);
    if (id === 'lesson')  return runLessonActivity(stage);
    if (id === 'quest')   return runBookQuest(stage);
    return runComingSoonActivity(stage, id);
  }

  function activityShell(stage, title, body) {
    stage.innerHTML =
      '<div class="jr-stage-head">' +
        '<h2>' + escHtml(title) + '</h2>' +
        '<button class="jr-stage-close" aria-label="Close">×</button>' +
      '</div>' +
      '<div class="jr-stage-body">' + body + '</div>';
    stage.querySelector('.jr-stage-close').addEventListener('click', function () {
      stage.hidden = true; stage.innerHTML = '';
    });
    stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function runReadActivity(stage) {
    // Switch back to the Reader tab — the tile is a teleport, not a
    // duplicated reader UI inside the activities pane.
    stage.hidden = true; stage.innerHTML = '';
    selectTab('reader');
  }

  function runListenActivity(stage) {
    activityShell(stage, '🔊 Listen', '<p>Reading the current scene aloud. Tap any text in the reader to hear it again.</p>');
    selectTab('reader');
    setTimeout(readAloud, 400);
  }

  function runMcActivity(stage) {
    var qs = (book.activities || []).filter(function (a) { return a.type === 'mc'; });
    if (!qs.length) {
      activityShell(stage, '🎯 Multiple Choice', '<p>This book has no multiple-choice questions yet.</p>');
      return;
    }
    var html = qs.map(function (q, i) {
      return '<div class="jr-q">' +
        '<h3>Q' + (i + 1) + '. ' + escHtml(q.prompt) + '</h3>' +
        '<div class="jr-q-options">' +
          q.choices.map(function (c) {
            return '<button class="jr-q-opt" data-right="' + (c.correct ? '1' : '0') + '">' + escHtml(c.text) + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
    }).join('');
    activityShell(stage, '🎯 Multiple Choice', html);
    wireQuestionButtons(stage);
  }

  function runTrueFalseActivity(stage) {
    var sc = book.scenes[currentSceneIdx] || book.scenes[0];
    if (!sc) {
      activityShell(stage, '⚖️ True or False', '<p>Read a scene first, then come back.</p>');
      return;
    }
    var paragraphs = sc.body.filter(function (b) { return b.type === 'p' && b.text && b.text.length > 12; });
    if (!paragraphs.length) {
      activityShell(stage, '⚖️ True or False', '<p>This scene needs more text to play True or False.</p>');
      return;
    }
    var picked = paragraphs.slice(0, JR_QUESTION_CAP);
    var qs = picked.map(function (p, i) {
      var flipped = (i % 2 === 1);
      var text = flipped ? mangleParagraph(p.text) : p.text;
      return { text: text, isTrue: !flipped };
    });
    var html = qs.map(function (q, i) {
      return '<div class="jr-q">' +
        '<h3>"' + escHtml(q.text) + '"</h3>' +
        '<div class="jr-q-options">' +
          '<button class="jr-q-opt" data-right="' + (q.isTrue ? '1' : '0') + '">✅ True</button>' +
          '<button class="jr-q-opt" data-right="' + (q.isTrue ? '0' : '1') + '">❌ False</button>' +
        '</div>' +
      '</div>';
    }).join('');
    activityShell(stage, '⚖️ True or False — ' + (sc.title || 'Scene'), html);
    wireQuestionButtons(stage);
  }

  function mangleParagraph(text) {
    // Flip a small word so the sentence reads false. Targets common
    // simple words first to stay readable for kids.
    var swaps = { 'big':'small', 'small':'big', 'happy':'sad', 'sad':'happy',
                  'fast':'slow', 'slow':'fast', 'up':'down', 'down':'up',
                  'wide':'narrow', 'narrow':'wide', 'brave':'scared', 'scared':'brave',
                  'wise':'silly', 'silly':'wise' };
    var keys = Object.keys(swaps);
    for (var i = 0; i < keys.length; i++) {
      var re = new RegExp('\\b' + keys[i] + '\\b', 'i');
      if (re.test(text)) return text.replace(re, swaps[keys[i]]);
    }
    // Fallback: prefix a "not" before a verb-ish first word — crude
    // but produces an obviously-false sentence.
    return text.replace(/^([A-Z][a-z]+\s)/, '$1did not ');
  }

  function runWhoSaidItActivity(stage) {
    var sc = book.scenes[currentSceneIdx] || book.scenes[0];
    var characters = book.characters || [];
    if (!sc || !characters.length) {
      activityShell(stage, '💬 Who Said It?', '<p>This book needs characters first.</p>');
      return;
    }
    // Walk the scene body in order; whenever we see a 'char' block,
    // the next 'p' block becomes the quote attributed to that char.
    var pairs = [];
    for (var i = 0; i < sc.body.length - 1; i++) {
      if (sc.body[i].type === 'char' && sc.body[i + 1].type === 'p') {
        pairs.push({ who: sc.body[i].who, text: sc.body[i + 1].text });
      }
    }
    if (!pairs.length) {
      activityShell(stage, '💬 Who Said It?', '<p>This scene has no character lines to play.</p>');
      return;
    }
    var html = pairs.slice(0, JR_QUESTION_CAP).map(function (p) {
      var opts = characters.slice().sort(function () { return 0.5 - Math.random(); });
      return '<div class="jr-q">' +
        '<h3>"' + escHtml(p.text) + '"</h3>' +
        '<div class="jr-q-options">' +
          opts.map(function (ch) {
            return '<button class="jr-q-opt" data-right="' + (ch.name === p.who ? '1' : '0') + '">' +
              ch.emoji + ' ' + escHtml(ch.name) + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
    }).join('');
    activityShell(stage, '💬 Who Said It?', html);
    wireQuestionButtons(stage);
  }

  function runSequenceActivity(stage) {
    var scenes = (book.scenes || []).slice();
    if (scenes.length < 2) {
      activityShell(stage, '🔄 Story Sequence', '<p>This book needs at least 2 scenes to play Sequence.</p>');
      return;
    }
    var shuffled = scenes.slice().sort(function () { return 0.5 - Math.random(); });
    var html = '<p class="jr-seq-hint">Tap the scenes in the right order from the start of the story to the end.</p>' +
      '<div id="jr-seq-pool" class="jr-seq-pool">' +
        shuffled.map(function (s, i) {
          return '<button class="jr-seq-pill" data-seq-id="' + escAttr(s.id) + '">' +
            (i + 1) + '. ' + escHtml(s.title) + '</button>';
        }).join('') +
      '</div>' +
      '<div id="jr-seq-picked" class="jr-seq-picked"></div>' +
      '<button id="jr-seq-check" class="jr-seq-check">Check my answer</button>';
    activityShell(stage, '🔄 Story Sequence', html);
    var picked = [];
    Array.prototype.forEach.call(stage.querySelectorAll('.jr-seq-pill'), function (b) {
      b.addEventListener('click', function () {
        if (b.classList.contains('used')) return;
        b.classList.add('used');
        picked.push(b.getAttribute('data-seq-id'));
        var label = b.textContent.replace(/^\d+\.\s*/, '');
        var div = document.createElement('div');
        div.className = 'jr-seq-step';
        div.textContent = (picked.length) + '. ' + label;
        stage.querySelector('#jr-seq-picked').appendChild(div);
      });
    });
    stage.querySelector('#jr-seq-check').addEventListener('click', function () {
      var correct = picked.length === scenes.length &&
        picked.every(function (id, i) { return scenes[i].id === id; });
      if (correct) { celebrate('🌟'); playSfx('celebrate'); speak('Perfect order!'); recordRight(); }
      else { playSfx('pop'); speak('Almost! Try again.'); }
    });
  }

  /* Storyworld game — auto-generates Where & When questions from the
     book.storyworld block. Distractors are picked from a small kid
     vocabulary so the answers feel reachable, not impossible. */
  var JR_DISTRACTORS = {
    setting: ['a busy city', 'a sandy desert', 'a snowy mountain', 'a deep ocean', 'a tall castle', 'a dark cave'],
    time: ['next week', 'tomorrow morning', 'in space', 'underwater', 'at school today', 'next summer']
  };
  function pickDistractors(pool, exclude, n) {
    var clean = pool.filter(function (x) {
      return x.toLowerCase() !== (exclude || '').toLowerCase();
    });
    clean.sort(function () { return 0.5 - Math.random(); });
    return clean.slice(0, n);
  }
  function runStoryworldActivity(stage) {
    var sw = book.storyworld || {};
    if (!sw.setting && !sw.time) {
      activityShell(stage, '🌍 Storyworld', '<p>This book has no Where / When info yet.</p>');
      return;
    }
    var qs = [];
    if (sw.setting) {
      var opts = pickDistractors(JR_DISTRACTORS.setting, sw.setting, 3).concat([sw.setting]);
      opts.sort(function () { return 0.5 - Math.random(); });
      qs.push({ prompt: '📍 Where does the story happen?', right: sw.setting, options: opts });
    }
    if (sw.time) {
      var topts = pickDistractors(JR_DISTRACTORS.time, sw.time, 3).concat([sw.time]);
      topts.sort(function () { return 0.5 - Math.random(); });
      qs.push({ prompt: '🕰 When does the story happen?', right: sw.time, options: topts });
    }
    var html = qs.slice(0, JR_QUESTION_CAP).map(function (q) {
      return '<div class="jr-q">' +
        '<h3>' + escHtml(q.prompt) + '</h3>' +
        '<div class="jr-q-options">' +
          q.options.map(function (o) {
            return '<button class="jr-q-opt" data-right="' + (o === q.right ? '1' : '0') + '">' + escHtml(o) + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
    }).join('');
    activityShell(stage, '🌍 Storyworld', html);
    wireQuestionButtons(stage);
  }

  /* Lesson game — pulls book.storyworld.lesson and any 'highlight'
     blocks across scenes (callouts in the reader). One real lesson +
     three distractors generated from a tiny stock of common
     children's-book lessons that DON'T match the right answer. */
  var JR_LESSON_DISTRACTORS = [
    'Always race ahead alone.',
    'Never share your snack.',
    'Tomatoes are the best fruit.',
    'Stay quiet when you need help.',
    'Going to bed late is fine.',
    'Skip your friends and play by yourself.',
    'Animals can talk if you whisper to them.',
    'Hide when you feel scared.'
  ];
  function runLessonActivity(stage) {
    var sw = book.storyworld || {};
    var lessons = [];
    if (sw.lesson) lessons.push(sw.lesson);
    (book.scenes || []).forEach(function (s) {
      (s.body || []).forEach(function (b) { if (b.type === 'highlight' && b.text) lessons.push(b.text); });
    });
    if (!lessons.length) {
      activityShell(stage, '💡 What I Learned',
        '<p>This book has no highlighted lesson yet. Tap <strong>Read</strong> first to find one!</p>');
      return;
    }
    // Use up to JR_QUESTION_CAP unique lessons.
    var seen = {};
    var uniq = [];
    for (var i = 0; i < lessons.length && uniq.length < JR_QUESTION_CAP; i++) {
      if (!seen[lessons[i]]) { seen[lessons[i]] = true; uniq.push(lessons[i]); }
    }
    var html = uniq.map(function (lesson) {
      var distractors = pickDistractors(JR_LESSON_DISTRACTORS, lesson, 3);
      var opts = distractors.concat([lesson]);
      opts.sort(function () { return 0.5 - Math.random(); });
      return '<div class="jr-q">' +
        '<h3>💡 What did this story teach?</h3>' +
        '<div class="jr-q-options">' +
          opts.map(function (o) {
            return '<button class="jr-q-opt" data-right="' + (o === lesson ? '1' : '0') + '">' + escHtml(o) + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
    }).join('');
    activityShell(stage, '💡 What I Learned', html);
    wireQuestionButtons(stage);
  }

  /* Book Quest — guided sequence through every mini-game so the
     child finishes with a well-rounded grasp of characters, plot,
     setting, and lesson. Keeps each step short. After the final
     step a "Book Mastered!" celebration triggers, marks the book
     read in progress, and bumps the streak counter. */
  function runBookQuest(stage) {
    var step = 0;
    function nextStep() {
      if (step >= JR_QUEST_STEPS.length) return finishQuest();
      var stepId = JR_QUEST_STEPS[step++];
      stage.hidden = false; stage.scrollIntoView({ behavior: 'smooth' });
      // Inline progress strip + next-button shell, then drop the real
      // activity content underneath.
      var dotRow = JR_QUEST_STEPS.map(function (_, i) {
        return '<span class="jr-quest-dot' + (i < step ? ' done' : '') + (i === step - 1 ? ' on' : '') + '"></span>';
      }).join('');
      stage.innerHTML =
        '<div class="jr-quest-head">' +
          '<h2>🚀 Book Quest — Step ' + step + ' / ' + JR_QUEST_STEPS.length + '</h2>' +
          '<div class="jr-quest-dots">' + dotRow + '</div>' +
        '</div>' +
        '<div id="jr-quest-body" class="jr-quest-body"></div>' +
        '<button id="jr-quest-next" class="jr-seq-check">Next ▶</button>' +
        '<button id="jr-quest-quit" class="jr-quest-quit">Quit</button>';
      var body = stage.querySelector('#jr-quest-body');
      // Each step renders into a child stage element so the inner
      // close button doesn't kill the quest UI.
      var sub = document.createElement('div');
      sub.className = 'jr-act-stage jr-quest-substage';
      sub.style.display = 'block';
      body.appendChild(sub);
      // Hijack the inner shell so the close button just goes to next.
      sub._isQuestSub = true;
      launchQuestStep(sub, stepId);
      stage.querySelector('#jr-quest-next').addEventListener('click', nextStep);
      stage.querySelector('#jr-quest-quit').addEventListener('click', function () {
        stage.hidden = true; stage.innerHTML = '';
      });
    }
    function launchQuestStep(sub, id) {
      // Reuse the runners but render into our sub element. Because
      // each runner expects a stage element with the structure
      // matching activityShell, we just call them with sub.
      if (id === 'listen')  return runListenInline(sub);
      if (id === 'who')     return runWhoSaidItActivity(sub);
      if (id === 'tf')      return runTrueFalseActivity(sub);
      if (id === 'seq')     return runSequenceActivity(sub);
      if (id === 'world')   return runStoryworldActivity(sub);
      if (id === 'lesson')  return runLessonActivity(sub);
      if (id === 'mc')      return runMcActivity(sub);
    }
    function runListenInline(sub) {
      activityShell(sub, '🔊 Listen', '<p>Press play in the reader, then come back.</p>');
      setTimeout(readAloud, 200);
    }
    function finishQuest() {
      stage.innerHTML =
        '<div class="jr-quest-finish">' +
          '<div class="jr-quest-trophy">🏆</div>' +
          '<h2>Book Mastered!</h2>' +
          '<p>You finished every activity for <strong>' + escHtml(book.title || 'this book') + '</strong>. Way to go!</p>' +
          '<button id="jr-quest-done" class="jr-seq-check">Done</button>' +
        '</div>';
      celebrate('🏆'); playSfx('celebrate'); speak('Book mastered! Great job!');
      // Mark every scene read so the splash stats finished-books
      // counter ticks up.
      var prog = loadProgress();
      var id = bookId(book);
      var p = prog[id] || { lastScene: 0, scenesRead: [], activitiesRight: 0, activitiesAttempted: 0 };
      p.scenesRead = (book.scenes || []).map(function (s) { return s.id; });
      p.questFinishedAt = Date.now();
      prog[id] = p;
      saveProgress(prog);
      bumpDailyStreak();
      stage.querySelector('#jr-quest-done').addEventListener('click', function () {
        stage.hidden = true; stage.innerHTML = '';
      });
    }
    nextStep();
  }

  function bumpDailyStreak() {
    var KEY = 'attainjr_streak_v1';
    var LAST = 'attainjr_streak_last_v1';
    try {
      var todayStr = new Date().toISOString().slice(0, 10);
      var lastStr = localStorage.getItem(LAST) || '';
      if (lastStr === todayStr) return; // already counted today
      var streak = parseInt(localStorage.getItem(KEY) || '0', 10);
      // If yesterday was the last, +1; otherwise reset to 1.
      var yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      var ydStr = yesterday.toISOString().slice(0, 10);
      streak = (lastStr === ydStr) ? (streak + 1) : 1;
      localStorage.setItem(KEY, String(streak));
      localStorage.setItem(LAST, todayStr);
    } catch (e) {}
  }

  function runComingSoonActivity(stage, id) {
    activityShell(stage,
      'Coming soon!',
      '<p>This activity (<strong>' + escHtml(id) + '</strong>) is on the way. ' +
      'Right now you can play <strong>Read</strong>, <strong>Listen</strong>, ' +
      '<strong>Multiple Choice</strong>, <strong>True or False</strong>, ' +
      '<strong>Who Said It</strong>, and <strong>Story Sequence</strong>.</p>');
  }

  function wireQuestionButtons(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll('.jr-q-opt'), function (btn) {
      btn.addEventListener('click', function () {
        var right = btn.getAttribute('data-right') === '1';
        if (right) {
          btn.classList.add('right');
          celebrate('⭐'); playSfx('celebrate'); speak('Yes! You got it!');
          recordRight();
        } else {
          btn.classList.add('wrong'); playSfx('pop'); speak('Try again!');
          setTimeout(function () { btn.classList.remove('wrong'); }, 800);
        }
      });
    });
  }

  function recordRight() {
    // Track stars/right-answers per-book so the splash stats row and
    // Progress modal show real numbers.
    var prog = loadProgress();
    var id = bookId(book);
    var p = prog[id] || { lastScene: 0, scenesRead: [], activitiesRight: 0, activitiesAttempted: 0 };
    p.activitiesRight = (p.activitiesRight || 0) + 1;
    p.activitiesAttempted = (p.activitiesAttempted || 0) + 1;
    prog[id] = p;
    saveProgress(prog);
  }

  /* ---------- Audio: Speech, Read-aloud, Pause/Stop, Voice cast ----------
     Voice modes:
       cast   — per-character voice + narrator voice (Jonah-style)
       single — one voice reads everything

     Voice cast persists per-book via localStorage so the user picks
     once and the assignment sticks. */
  var voices = [];
  var customVoiceBlob = null;   // user-recorded voice (Blob)
  var voiceCast = {};           // { characterName: voiceIndex }
  var narratorVoiceIdx = -1;    // -1 = first English voice / system default
  var currentUtter = null;
  var readQueue = [];
  var readIdx = 0;
  var readPaused = false;
  function loadVoices() {
    voices = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    var sel = document.getElementById('ab-voice');
    if (!sel) return;
    sel.innerHTML = '<option value="auto">Auto voice</option>' +
      voices.map(function (v, i) { return '<option value="' + i + '">' + escHtml(v.name) + '</option>'; }).join('');
    if (customVoiceBlob) sel.innerHTML += '<option value="custom">🎙 My recorded voice</option>';
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
  setTimeout(loadVoices, 600);
  function pickNarratorVoice() {
    var sel = document.getElementById('ab-voice');
    var v = sel ? sel.value : 'auto';
    if (v === 'custom') return null;
    if (v === 'auto') {
      // Pick first English voice we find (Siri / Samantha on iPad)
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang && voices[i].lang.indexOf('en') === 0) return voices[i];
      }
      return voices[0] || null;
    }
    var idx = parseInt(v, 10);
    return isNaN(idx) ? null : voices[idx];
  }
  function autoAssignCast() {
    // Pick distinct voices for each character. Prefer English voices,
    // skip the narrator voice when picking character voices.
    var en = voices.filter(function (v) { return v.lang && v.lang.indexOf('en') === 0; });
    var pool = en.length >= book.characters.length + 1 ? en : voices.slice();
    var narrator = pickNarratorVoice();
    var available = pool.filter(function (v) { return !narrator || v.name !== narrator.name; });
    book.characters.forEach(function (ch, i) {
      if (available.length) {
        voiceCast[ch.name] = voices.indexOf(available[i % available.length]);
      } else {
        voiceCast[ch.name] = -1;
      }
    });
    saveCast();
  }
  function loadCast() {
    try {
      var raw = localStorage.getItem('attainjr_cast_' + (book.title || 'sample'));
      if (raw) voiceCast = JSON.parse(raw) || {};
    } catch (e) { voiceCast = {}; }
  }
  function saveCast() {
    try { localStorage.setItem('attainjr_cast_' + (book.title || 'sample'), JSON.stringify(voiceCast)); } catch (e) {}
  }
  function voiceForCharacter(name) {
    if (!name) return pickNarratorVoice();
    var idx = voiceCast[name];
    if (typeof idx === 'number' && idx >= 0 && voices[idx]) return voices[idx];
    return pickNarratorVoice();
  }
  function speak(text, opts) {
    if (!text || !text.trim()) return;
    if (!window.speechSynthesis) return;
    opts = opts || {};
    // Custom-recorded voice plays for the WHOLE passage when selected.
    if (customVoiceBlob && document.getElementById('ab-voice').value === 'custom') {
      var au = new Audio(URL.createObjectURL(customVoiceBlob));
      au.play().catch(function () {});
      if (opts.onend) setTimeout(opts.onend, 1200);
      return;
    }
    // Hebrew preprocessor — runs the spoken text through the shared
    // Hebrew phoneme dictionary so iPad voices say "Yeshayahu" close
    // to how a native speaker would. Falls through unchanged when
    // there's no Hebrew or biblical-name token.
    var spoken = text;
    try { if (window.HebrewPron) spoken = window.HebrewPron.normalize(text); } catch (e) {}
    var u = new SpeechSynthesisUtterance(spoken);
    var v = opts.voice || pickNarratorVoice();
    if (v) u.voice = v;
    u.rate = opts.rate || 0.95;
    u.pitch = opts.pitch || 1.05;
    u.volume = 1;
    u.onend = opts.onend || null;
    currentUtter = u;
    try { speechSynthesis.cancel(); } catch (e) {}
    speechSynthesis.speak(u);
  }

  // Read-aloud with optional story-only mode + voice-cast switching.
  // storyOnly=true skips stage directions, character labels and front
  // matter (cover/title/copyright) -- reads only paragraph + highlight
  // blocks marked data-story.
  // mode='cast' switches voices per-character: when a [character] block
  // is encountered, the next [paragraph] block is voiced as that
  // character. Otherwise the narrator voice reads.
  function buildReadQueue(storyOnly) {
    var sel = storyOnly ? '[data-story]' : '[data-rl]';
    var nodes = Array.prototype.slice.call(document.querySelectorAll(sel));
    // Walk the DOM in document order to detect character context for
    // voice-cast mode -- a 'char' badge sets the speaker for the next
    // paragraph until another char or stage block resets it.
    var allReadable = Array.prototype.slice.call(document.querySelectorAll('[data-rl], [data-char]'));
    var speakerByEl = new Map();
    var currentSpeaker = null;
    for (var i = 0; i < allReadable.length; i++) {
      var el = allReadable[i];
      if (el.hasAttribute && el.hasAttribute('data-char')) {
        currentSpeaker = el.getAttribute('data-char');
        speakerByEl.set(el, null);
      } else {
        speakerByEl.set(el, currentSpeaker);
        // Stage directions reset the speaker (back to narrator)
        if (el.classList && el.classList.contains('stage')) currentSpeaker = null;
      }
    }
    return nodes.map(function (el) {
      return { el: el, text: el.textContent || '', speaker: speakerByEl.get(el) || null };
    });
  }
  function readAloudInternal(storyOnly) {
    stopRead();
    readQueue = buildReadQueue(!!storyOnly);
    readIdx = 0; readPaused = false;
    nextRead();
  }
  function readAloud()      { readAloudInternal(false); }
  function readStoryOnly()  { readAloudInternal(true); }
  function nextRead() {
    if (readPaused) return;
    if (readIdx >= readQueue.length) return;
    var item = readQueue[readIdx];
    var el = item.el;
    Array.prototype.forEach.call(document.querySelectorAll('.reading'), function (e) { e.classList.remove('reading'); });
    el.classList.add('reading');
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    var mode = (document.getElementById('ab-voice-mode') || {}).value || 'cast';
    var voice = (mode === 'cast' && item.speaker) ? voiceForCharacter(item.speaker) : pickNarratorVoice();
    var pitch = (mode === 'cast' && item.speaker) ? voicePitchHint(item.speaker) : 1.05;
    speak(item.text, { voice: voice, pitch: pitch, onend: function () { readIdx++; nextRead(); } });
  }
  // Per-character pitch nudge so distinct voices are even more distinct.
  // We can't control timbre with SpeechSynthesis, but pitch + speaker
  // voice combine to give noticeably different deliveries.
  function voicePitchHint(name) {
    var ch = book.characters.find(function (x) { return x.name === name; });
    if (!ch) return 1.05;
    if ((ch.voiceHint || '').indexOf('high') >= 0) return 1.4;
    if ((ch.voiceHint || '').indexOf('low')  >= 0) return 0.7;
    if ((ch.voiceHint || '').indexOf('deep') >= 0) return 0.75;
    if ((ch.voiceHint || '').indexOf('warm') >= 0) return 0.95;
    return 1.05;
  }
  function stopRead() {
    readPaused = false; readQueue = []; readIdx = 0;
    Array.prototype.forEach.call(document.querySelectorAll('.reading'), function (e) { e.classList.remove('reading'); });
    try { speechSynthesis.cancel(); } catch (e) {}
  }
  bind('ab-read', 'click', readAloud);
  bind('ab-read-story', 'click', readStoryOnly);
  bind('ab-pause', 'click', function () {
    if (!window.speechSynthesis) return;
    if (readPaused) { speechSynthesis.resume(); readPaused = false; }
    else { speechSynthesis.pause(); readPaused = true; }
  });
  bind('ab-stop', 'click', stopRead);
  bind('ab-music', 'click', function () {
    if (musicNode) stopMusic(); else startMusic();
  });
  bind('ab-prev', 'click', function () {
    if (currentSceneIdx > 0) { stopRead(); currentSceneIdx--; renderReader(); }
  });
  bind('ab-next', 'click', function () {
    if (currentSceneIdx < (book.scenes || []).length - 1) { stopRead(); currentSceneIdx++; renderReader(); }
  });

  /* ---------- Custom voice recording ---------- */
  var mediaRecorder = null;
  document.getElementById('ab-record-voice').addEventListener('click', async function () {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      this.textContent = '🎙 Record';
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('This iPad does not support voice recording in this browser.');
      return;
    }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      var chunks = [];
      mediaRecorder.addEventListener('dataavailable', function (e) { if (e.data && e.data.size > 0) chunks.push(e.data); });
      mediaRecorder.addEventListener('stop', function () {
        customVoiceBlob = new Blob(chunks, { type: 'audio/webm' });
        idbPut('voice', customVoiceBlob).catch(function () {});
        loadVoices();
        document.getElementById('ab-voice').value = 'custom';
        document.getElementById('ab-record-voice').textContent = '🎙 Re-record';
        speak('Your voice is saved!');
      });
      mediaRecorder.start();
      this.textContent = '⏹ Stop recording';
    } catch (e) { alert('Could not access microphone: ' + (e && e.message || e)); }
  });

  /* ---------- Paraphrase: summarize chapter (or selection) and speak ---------- */
  document.getElementById('tool-paraphrase').addEventListener('click', async function () {
    this.disabled = true; var oldLabel = this.textContent;
    this.textContent = '💭 Thinking…';
    try {
      var sel = (window.getSelection && String(window.getSelection())).trim();
      var text = sel || sceneText();
      if (!text) { speak('There is nothing to paraphrase yet.'); return; }
      var paraphrase = await getParaphrase(text);
      speak(paraphrase, { rate: 0.92 });
    } catch (e) {
      speak('I could not paraphrase right now.');
    } finally {
      this.textContent = oldLabel;
      this.disabled = false;
    }
  });
  function sceneText() {
    var scene = book.scenes[currentSceneIdx];
    if (!scene) return '';
    return scene.body.map(function (b) {
      if (b.type === 'p' || b.type === 'stage' || b.type === 'highlight') return b.text;
      if (b.type === 'char') return b.who + ':';
      return '';
    }).join(' ');
  }
  // Free + no-account paraphrase via Pollinations.ai. Falls back to a
  // very simple "first sentence + last sentence" excerpt offline.
  async function getParaphrase(text) {
    try {
      var resp = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          private: true,
          referrer: 'attain-jr',
          messages: [
            { role: 'system', content: 'You are a friendly story summarizer for children ages 3 to 7. Rewrite the story in 2 short, simple sentences using easy words. No quotes around the answer.' },
            { role: 'user', content: text.slice(0, 4000) }
          ]
        })
      });
      if (resp.ok) {
        var raw = await resp.text();
        try {
          var data = JSON.parse(raw);
          var t = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
          if (t) return String(t).trim();
        } catch (e) { return raw; }
      }
    } catch (e) {}
    // Offline fallback: first sentence + last sentence.
    var sentences = text.match(/[^.!?]+[.!?]/g) || [];
    if (sentences.length <= 2) return text;
    return sentences[0].trim() + ' ' + sentences[sentences.length - 1].trim();
  }

  /* ---------- SFX (WebAudio, no files needed) + Music loop ---------- */
  var ac = null;
  function getAC() { if (!ac && (window.AudioContext || window.webkitAudioContext)) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
  function primeAudio() { var c = getAC(); if (c && c.state === 'suspended') c.resume().catch(function () {}); }
  function tone(freq, dur, type, gain) {
    var c = getAC(); if (!c) return;
    var o = c.createOscillator(); var g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gain || 0.18, c.currentTime + 0.02);
    g.gain.linearRampToValueAtTime(0, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.05);
  }
  function noiseBurst(dur, gain) {
    var c = getAC(); if (!c) return;
    var bufSize = Math.floor((c.sampleRate || 44100) * dur);
    var buf = c.createBuffer(1, bufSize, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    var src = c.createBufferSource(); src.buffer = buf;
    var g = c.createGain(); g.gain.value = gain || 0.2;
    src.connect(g).connect(c.destination); src.start();
  }
  function playSfx(name) {
    primeAudio();
    if (name === 'pop')        { tone(880, 0.08, 'square', 0.16); setTimeout(function () { tone(1320, 0.08, 'square', 0.14); }, 60); }
    else if (name === 'chime') { [880, 1175, 1480].forEach(function (f, i) { setTimeout(function () { tone(f, 0.5, 'sine', 0.18); }, i * 120); }); }
    else if (name === 'celebrate') { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { tone(f, 0.18, 'triangle', 0.2); }, i * 90); }); }
    else if (name === 'storm') { noiseBurst(2.0, 0.24); setTimeout(function () { tone(60, 1.2, 'sawtooth', 0.18); }, 200); }
    else if (name === 'splash'){ noiseBurst(0.5, 0.3); setTimeout(function () { tone(220, 0.3, 'sine', 0.18); }, 80); }
    else if (name === 'cinematic') { startMusic(); }
    else if (name === 'stop')  { stopMusic(); try { speechSynthesis.cancel(); } catch (e) {} }
  }
  Array.prototype.forEach.call(document.querySelectorAll('.sfx'), function (b) {
    b.addEventListener('click', function () { playSfx(b.getAttribute('data-sfx')); });
  });
  // Background music: a tiny ambient pad loop using two detuned oscillators.
  var musicNode = null;
  function startMusic() {
    primeAudio();
    if (musicNode) return;
    var c = getAC(); if (!c) return;
    var o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = 220;
    var o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 277;
    var g = c.createGain(); g.gain.value = 0.05;
    o1.connect(g); o2.connect(g); g.connect(c.destination);
    o1.start(); o2.start();
    musicNode = { o1: o1, o2: o2, g: g };
  }
  function stopMusic() {
    if (!musicNode) return;
    try { musicNode.o1.stop(); musicNode.o2.stop(); } catch (e) {}
    musicNode = null;
  }

  /* ---------- Celebration ---------- */
  function celebrate(emoji) {
    var el = document.getElementById('celebrate');
    el.textContent = emoji || '⭐';
    el.hidden = false;
    requestAnimationFrame(function () {
      el.style.animation = 'none';
      el.offsetHeight; // reflow
      el.style.animation = 'celebrate-pop 0.9s ease-out forwards';
    });
    setTimeout(function () { el.hidden = true; }, 950);
  }

  /* ---------- Parent gate ---------- */
  function openParentGate() {
    var modal = document.getElementById('parent-gate');
    modal.hidden = false;
    document.getElementById('pg-pin').value = '';
    document.getElementById('pg-err').textContent = '';
    setTimeout(function () { document.getElementById('pg-pin').focus(); }, 100);
  }
  document.getElementById('pg-cancel').addEventListener('click', function () { document.getElementById('parent-gate').hidden = true; });
  document.getElementById('pg-ok').addEventListener('click', function () {
    var pin = document.getElementById('pg-pin').value || '';
    if (!/^\d{4}$/.test(pin)) { document.getElementById('pg-err').textContent = 'Please enter 4 digits.'; return; }
    var saved = localStorage.getItem('attainjr_pin');
    if (!saved) {
      // First time — save the entered PIN as the parent PIN
      localStorage.setItem('attainjr_pin', pin);
      document.getElementById('parent-gate').hidden = true;
      alert('PIN saved. You\'re in.');
      // Just return to splash so the parent area can be built later
      return;
    }
    if (pin !== saved) { document.getElementById('pg-err').textContent = 'Wrong PIN.'; return; }
    document.getElementById('parent-gate').hidden = true;
    alert('Welcome, parent. (Dashboard coming in v2.)');
  });

  /* ---------- IndexedDB tiny helpers (for custom voice persistence) ---------- */
  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('attainjr', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('kv'); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function idbPut(key, val) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(val, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function idbGet(key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction('kv', 'readonly');
        var req = tx.objectStore('kv').get(key);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { resolve(null); };
      });
    });
  }
  // On boot, restore any previously-recorded voice + voice cast
  idbGet('voice').then(function (b) { if (b) { customVoiceBlob = b; loadVoices(); } }).catch(function () {});
  loadCast();
  // Auto-assign cast on first load if none saved (after voices are
  // available -- iOS Safari populates them asynchronously).
  setTimeout(function () {
    if (Object.keys(voiceCast).length === 0 && voices.length > 0) autoAssignCast();
  }, 1000);

  /* ---------- Voice cast modal ---------- */
  document.getElementById('ab-cast').addEventListener('click', openCastModal);
  function openCastModal() {
    var modal = document.getElementById('cast-modal');
    var rows = document.getElementById('cast-rows');
    rows.innerHTML = book.characters.map(function (ch) {
      var current = voiceCast[ch.name];
      var opts = '<option value="-1">— Narrator voice —</option>' +
        voices.map(function (v, i) {
          var on = (i === current) ? ' selected' : '';
          return '<option value="' + i + '"' + on + '>' + escHtml(v.name) + ' (' + escHtml(v.lang || '') + ')</option>';
        }).join('');
      return '<div class="cast-row">' +
        '<div class="cast-label">' + ch.emoji + ' <strong>' + escHtml(ch.name) + '</strong> <span class="cast-hint">' + escHtml(ch.voiceHint || '') + '</span></div>' +
        '<select class="cast-pick" data-char="' + escHtml(ch.name) + '">' + opts + '</select>' +
        '<button class="cast-test" data-char="' + escHtml(ch.name) + '">▶ Test</button>' +
      '</div>';
    }).join('');
    modal.hidden = false;
    Array.prototype.forEach.call(rows.querySelectorAll('.cast-test'), function (b) {
      b.addEventListener('click', function () {
        var name = b.getAttribute('data-char');
        var sel = rows.querySelector('.cast-pick[data-char="' + name.replace(/"/g, '\\"') + '"]');
        var idx = parseInt(sel.value, 10);
        var v = (idx >= 0) ? voices[idx] : pickNarratorVoice();
        speak('Hi! I am ' + name + '.', { voice: v, pitch: voicePitchHint(name) });
      });
    });
  }
  document.getElementById('cast-cancel').addEventListener('click', function () {
    document.getElementById('cast-modal').hidden = true;
  });
  document.getElementById('cast-auto').addEventListener('click', function () {
    autoAssignCast();
    openCastModal();   // refresh dropdowns
  });
  document.getElementById('cast-save').addEventListener('click', function () {
    var picks = document.querySelectorAll('#cast-rows .cast-pick');
    Array.prototype.forEach.call(picks, function (sel) {
      var name = sel.getAttribute('data-char');
      var idx = parseInt(sel.value, 10);
      voiceCast[name] = isNaN(idx) ? -1 : idx;
    });
    saveCast();
    document.getElementById('cast-modal').hidden = true;
    speak('Voice cast saved.');
  });

  /* ---------- Reading aids cycle (Aa button) ---------- */
  document.getElementById('tool-aa').addEventListener('click', function () {
    var b = document.body;
    if (b.classList.contains('aa-xxl')) {
      b.classList.remove('aa-xxl');
    } else if (b.classList.contains('aa-xl')) {
      b.classList.remove('aa-xl'); b.classList.add('aa-xxl');
    } else {
      b.classList.add('aa-xl');
    }
  });

  /* ---------- Back button → splash ---------- */
  document.getElementById('tool-back').addEventListener('click', function () {
    location.reload();
  });

  // Focus mode toggle. Adds .jr-focus-mode to <body>; CSS dims every
  // paragraph in the content area until the user taps one — that
  // paragraph gets .jr-focus-on and pops back to full opacity.
  bind('tool-focus', 'click', function () {
    var on = document.body.classList.toggle('jr-focus-mode');
    var btn = document.getElementById('tool-focus');
    if (btn) btn.classList.toggle('on', on);
  });

  // Customize this book.
  bind('tool-customize', 'click', openCustomizeModal);

  /* ---------- Customize this book ----------
     Per-book editor for character display name / emoji / color and
     the storyworld setting / time / lesson. Changes persist by
     writing the modified book object back to localStorage so the
     library carries the user's tweaks across sessions. */
  var KID_PALETTE = [
    '#ef476f', '#ff9f1c', '#ffd166', '#06d6a0',
    '#118ab2', '#7b2cbf', '#ff6ba6', '#4d3eea',
    '#2bbd7e', '#a36cff', '#2fb6c4', '#444'
  ];
  function saveBookToLibrary(b) {
    var lib = loadLibrary();
    var id = bookId(b);
    var found = false;
    for (var i = 0; i < lib.length; i++) {
      if (bookId(lib[i]) === id) { lib[i] = b; found = true; break; }
    }
    if (!found) lib.push(b);
    saveLibrary(lib);
  }
  function openCustomizeModal() {
    var modal = document.getElementById('jr-customize-modal');
    if (!modal) return;
    var box = document.getElementById('jr-cz-chars');
    var chars = (book.characters || []);
    if (!chars.length) {
      box.innerHTML = '<p style="color:#666;font-size:12pt">This book has no characters yet. Upload a story with character lines (e.g. <code>LION:</code> or <code>DANIEL:</code>) and they will appear here.</p>';
    } else {
      box.innerHTML = chars.map(function (ch, idx) {
        var color = characterColor(ch.name) || '#7b6cff';
        var swatches = KID_PALETTE.map(function (col) {
          var on = col.toLowerCase() === color.toLowerCase() ? ' on' : '';
          return '<button class="jr-cz-swatch' + on + '" style="background:' + col + '" data-cz-idx="' + idx + '" data-cz-color="' + col + '" aria-label="' + col + '"></button>';
        }).join('');
        var dn = ch.displayName || ch.name;
        return '<div class="jr-cz-char">' +
          '<div class="jr-cz-name-row">' +
            '<input class="jr-cz-name" data-cz-idx="' + idx + '" type="text" value="' + escAttr(dn) + '" placeholder="Name">' +
            '<input class="jr-cz-emoji" data-cz-idx="' + idx + '" type="text" value="' + escAttr(ch.emoji || '') + '" placeholder="🦊" maxlength="2">' +
          '</div>' +
          '<div class="jr-cz-swatches">' + swatches + '</div>' +
        '</div>';
      }).join('');
    }
    var sw = book.storyworld || {};
    document.getElementById('jr-cz-setting').value = sw.setting || '';
    document.getElementById('jr-cz-time').value = sw.time || '';
    document.getElementById('jr-cz-lesson').value = sw.lesson || '';
    // Wire palette swatches: tapping one paints that character.
    bindAll('.jr-cz-swatch', 'click', function (el) {
      var idx = +el.getAttribute('data-cz-idx');
      var col = el.getAttribute('data-cz-color');
      Array.prototype.forEach.call(document.querySelectorAll('.jr-cz-swatch[data-cz-idx="' + idx + '"]'), function (s) { s.classList.remove('on'); });
      el.classList.add('on');
      // Mutate the in-memory book so the next save picks it up.
      if (book.characters[idx]) book.characters[idx].color = col;
    });
    modal.hidden = false;
  }
  bind('jr-cz-cancel', 'click', function () {
    document.getElementById('jr-customize-modal').hidden = true;
  });
  bind('jr-cz-save', 'click', function () {
    var chars = book.characters || [];
    Array.prototype.forEach.call(document.querySelectorAll('.jr-cz-name'), function (inp) {
      var idx = +inp.getAttribute('data-cz-idx');
      if (chars[idx]) chars[idx].displayName = inp.value.trim() || chars[idx].name;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.jr-cz-emoji'), function (inp) {
      var idx = +inp.getAttribute('data-cz-idx');
      if (chars[idx]) chars[idx].emoji = inp.value.trim();
    });
    book.storyworld = {
      setting: document.getElementById('jr-cz-setting').value.trim(),
      time:    document.getElementById('jr-cz-time').value.trim(),
      lesson:  document.getElementById('jr-cz-lesson').value.trim()
    };
    saveBookToLibrary(book);
    document.getElementById('jr-customize-modal').hidden = true;
    // Re-render the current view so colour / name changes show
    // immediately. Don't change the active tab.
    if (currentTab === 'reader') renderReader();
    else if (currentTab === 'characters') renderCharacters();
    else if (currentTab === 'storyworld') renderStoryworld();
  });
  bind('jr-cz-cast', 'click', function () {
    document.getElementById('jr-customize-modal').hidden = true;
    var castBtn = document.getElementById('ab-cast');
    if (castBtn) castBtn.click();
  });

  /* ---------- Word definition lookup ----------
     Tap a single word in the reader -> floating popup with a
     kid-friendly definition + speak button. Definitions are cached
     in IndexedDB so repeats are instant + offline-friendly. */
  var defCache = {};
  idbGet('defs').then(function (d) { defCache = d || {}; }).catch(function () {});

  function findWordAtPoint(x, y) {
    // Use caretRangeFromPoint (Safari) or caretPositionFromPoint
    var range = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
      var pos = document.caretPositionFromPoint(x, y);
      if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); range.collapse(true); }
    }
    if (!range || !range.startContainer || range.startContainer.nodeType !== 3) return null;
    var node = range.startContainer;
    var text = node.textContent || '';
    var idx = range.startOffset;
    // Expand to whole word
    var start = idx, end = idx;
    while (start > 0 && /\w/.test(text.charAt(start - 1))) start--;
    while (end < text.length && /\w/.test(text.charAt(end))) end++;
    var word = text.slice(start, end);
    if (!word || !/^\w+$/.test(word)) return null;
    var wordRange = document.createRange();
    wordRange.setStart(node, start);
    wordRange.setEnd(node, end);
    return { word: word, range: wordRange };
  }

  function showDefPop(word, range) {
    var pop = document.getElementById('def-pop');
    document.getElementById('def-word').textContent = word;
    document.getElementById('def-body').textContent = 'Looking up…';
    pop.hidden = false;
    // Position above the word, clamped to viewport
    var rect = range.getBoundingClientRect();
    pop.style.left = '0px'; pop.style.top = '0px'; // reset for measurement
    var popW = Math.min(320, Math.max(220, pop.offsetWidth));
    var leftRaw = rect.left + window.scrollX + (rect.width / 2) - 30;
    var top = rect.top + window.scrollY - pop.offsetHeight - 16;
    if (top < window.scrollY + 10) top = rect.bottom + window.scrollY + 12; // flip below if too close to top
    var maxLeft = window.scrollX + window.innerWidth - popW - 10;
    if (leftRaw > maxLeft) leftRaw = maxLeft;
    if (leftRaw < 10) leftRaw = 10;
    pop.style.left = leftRaw + 'px';
    pop.style.top = top + 'px';
    // Fetch + display
    getDefinition(word).then(function (def) {
      if (document.getElementById('def-word').textContent !== word) return; // stale
      document.getElementById('def-body').textContent = def;
    });
  }

  function hideDefPop() {
    document.getElementById('def-pop').hidden = true;
  }

  async function getDefinition(rawWord) {
    var w = String(rawWord || '').toLowerCase().trim();
    if (!w) return '';
    if (defCache[w]) return defCache[w];
    // Try Pollinations first -- gives kid-friendly one-sentence answers
    try {
      var resp = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          private: true,
          referrer: 'attain-jr',
          messages: [
            { role: 'system', content: 'Define the word for a child age 5. Use ONE short, simple sentence (under 20 words). No quotes, no preamble, no examples, no part of speech.' },
            { role: 'user', content: w }
          ]
        })
      });
      if (resp.ok) {
        var raw = await resp.text();
        var text = '';
        try {
          var data = JSON.parse(raw);
          text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        } catch (e) { text = raw; }
        if (text) {
          var clean = String(text).replace(/^["'\s]+|["'\s]+$/g, '').trim();
          defCache[w] = clean;
          idbPut('defs', defCache).catch(function () {});
          return clean;
        }
      }
    } catch (e) {}
    // Fallback to free dictionaryapi.dev (no key)
    try {
      var r2 = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w));
      if (r2.ok) {
        var arr = await r2.json();
        var def = arr && arr[0] && arr[0].meanings && arr[0].meanings[0] && arr[0].meanings[0].definitions && arr[0].meanings[0].definitions[0] && arr[0].meanings[0].definitions[0].definition;
        if (def) {
          defCache[w] = def;
          idbPut('defs', defCache).catch(function () {});
          return def;
        }
      }
    } catch (e) {}
    return 'I don\'t know that word yet. Tap me again when you\'re online!';
  }

  // Tap on a word in the content area -> show definition popup
  document.getElementById('content').addEventListener('click', function (e) {
    // Skip clicks on activity buttons + character badges + images
    var t = e.target;
    if (t.closest && (t.closest('.act-opt') || t.closest('.char') || t.tagName === 'IMG' || t.tagName === 'BUTTON')) return;
    var hit = findWordAtPoint(e.clientX, e.clientY);
    if (!hit) { hideDefPop(); return; }
    showDefPop(hit.word, hit.range);
    e.stopPropagation();
  });
  document.addEventListener('click', function (e) {
    var pop = document.getElementById('def-pop');
    if (pop.hidden) return;
    if (pop.contains(e.target)) return;
    hideDefPop();
  });
  document.getElementById('def-close').addEventListener('click', hideDefPop);
  document.getElementById('def-speak').addEventListener('click', function () {
    var word = document.getElementById('def-word').textContent;
    var def = document.getElementById('def-body').textContent;
    if (word && def) speak(word + '. ' + def, { rate: 0.9 });
  });

  /* ---------- Service worker ---------- */
  if ('serviceWorker' in navigator) {
    try { navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }); } catch (e) {}
  }

  /* ---------- HTML escape helpers ---------- */
  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function escAttr(s) { return escHtml(s); }

})();
