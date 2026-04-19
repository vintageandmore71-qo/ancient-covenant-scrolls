// Attain Universal — UI Module
// Screen navigation, library, upload, architecture, activities, settings, gamification

// ---- Intro Splash Pages (first visit or tap logo) ----

function showIntro(page) {
  page = page || 1;
  var imgSrc = page === 1 ? 'splash.PNG' : 'splash%202.PNG';
  var h = '<div id="home" style="padding:0;justify-content:flex-start">';
  h += '<img src="' + imgSrc + '" alt="Attain" style="width:100%;max-width:600px;height:auto;display:block;margin:0 auto" onerror="this.style.display=\'none\'">';
  h += '<div class="btns" style="margin:0;padding:20px 16px">';
  h += '<button id="b-intro-upload" style="background:linear-gradient(135deg,#7c3aed,#2563eb);font-size:17px;padding:18px 40px" aria-label="Upload a book">\u2795 Upload a Book</button>';
  if (page === 1) {
    h += '<button id="b-intro-next" style="background:linear-gradient(135deg,#059669,#0891b2);font-size:16px;padding:16px 40px" aria-label="Next page">Next Page \u25B6</button>';
  } else {
    h += '<button id="b-intro-start" style="background:linear-gradient(135deg,#059669,#0891b2);font-size:16px;padding:16px 40px" aria-label="Get started">Get Started \u{1F680}</button>';
  }
  h += '</div>';

  h += '</div>';
  document.getElementById('content').innerHTML = h;
  document.getElementById('tb').textContent = 'Attain';

  document.getElementById('b-intro-upload').addEventListener('click', function (e) {
    e.stopPropagation();
    showUpload();
  });
  if (page === 1) {
    document.getElementById('b-intro-next').addEventListener('click', function (e) {
      e.stopPropagation();
      showIntro(2);
    });
  } else {
    document.getElementById('b-intro-start').addEventListener('click', function (e) {
      e.stopPropagation();
      localStorage.setItem('attain_intro_seen', '1');
      showLibrary();
    });
  }
}

// ---- Library Screen — book grid with "New Book" card ----

function showLibrary() {
  var lib = getLibrary();
  var totalDue = getAllDueCount();
  var stats = getStats();
  var lvl = getLevel(stats.xp || 0);
  var streak = stats.streak || 0;

  // Show intro when library is empty
  if (lib.length === 0) {
    showIntro(1);
    return;
  }

  var html = '<div id="home">';

  html += '<img src="splash.PNG" alt="Attain" style="width:100%;max-width:600px;height:auto;display:block;margin:0 auto 16px" id="lib-logo" onerror="this.style.display=\'none\'">';
  html += '<p class="tag">Universal Study Engine\u2003\u00B7\u2003Read it. Study it. Attain it.</p>';

  // Stats bar
  if (totalDue > 0 || streak > 0 || (stats.xp || 0) > 0) {
    html += '<div class="home-stats">';
    if (totalDue > 0) html += '<div class="home-stat home-due" role="status">\u{1F4DA} ' + totalDue + ' cards due</div>';
    if (streak > 0) html += '<div class="home-stat home-streak">\u{1F525} ' + streak + ' day streak</div>';
    html += '<div class="home-stat home-level">' + lvl.current.icon + ' ' + lvl.current.name + ' \u00B7 ' + (stats.xp || 0) + ' XP</div>';
    html += '</div>';
  }

  // Primary action buttons
  html += '<div class="btns" style="margin-top:24px">';
  if (lib.length > 0) {
    html += '<button id="b-lib-start" style="background:linear-gradient(135deg,#059669,#0891b2);font-size:18px;padding:20px 40px">\u{1F4D6} Get Started</button>';
  }
  html += '<button id="b-lib-new-hero" style="background:linear-gradient(135deg,#7c3aed,#2563eb);font-size:16px;padding:16px 32px">\u2795 Upload a Book</button>';
  if (totalDue > 0) {
    html += '<button id="b-lib-review" style="background:linear-gradient(135deg,#059669,#0891b2)">\u{1F4DA} Review All Due (' + totalDue + ' cards)</button>';
  }
  html += '</div>';

  // Book grid — inside the dark home div, no white break
  html += '<div style="padding:20px 24px 60px;max-width:900px;margin:0 auto;width:100%">';
  html += '<div class="activity-grid-header" style="color:#c8c8e8">My Library</div>';
  html += '<div class="lib-grid">';

  // Existing books
  for (var i = 0; i < lib.length; i++) {
    var b = lib[i];
    var bookDue = getDueCards(b.id).length;
    var dueBadge = bookDue > 0 ? ' \u00B7 ' + bookDue + ' due' : '';
    html += '<div class="lib-card" data-book="' + b.id + '" style="background:' + (b.color || '#2563eb') + '" role="button" tabindex="0" aria-label="Open book: ' + b.title + '">';
    html += '<div class="lib-icon">\u{1F4D6}</div>';
    html += '<div class="lib-title">' + b.title + '</div>';
    html += '<div class="lib-meta">' + (b.chapterCount || 0) + ' chapters' + dueBadge + '</div>';
    html += '</div>';
  }

  // "New Book" card
  html += '<div class="lib-card lib-add" id="b-lib-new" role="button" tabindex="0" aria-label="Add a new book">';
  html += '<div class="lib-icon">\u2795</div>';
  html += '<div class="lib-title">New Book</div>';
  html += '</div>';

  html += '</div>';

  // Settings row
  html += '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:20px;padding-bottom:30px">';
  html += '<button class="study-btn" id="b-lib-progress" aria-label="View progress and stats">\u{1F4CA} Progress</button>';
  html += '<button class="study-btn" id="b-lib-settings" aria-label="Settings" style="background:#6b7280">\u2699\uFE0F Settings</button>';
  html += '</div>';

  html += '</div></div>';

  document.getElementById('content').innerHTML = html;
  document.getElementById('tb').textContent = 'Attain';

  // Hide sidebar on library screen
  document.getElementById('sb').innerHTML = '';
  sbOpen = false;
  updateSB();

  // Clear sidebar active states
  var secs = document.querySelectorAll('.sec');
  for (var s = 0; s < secs.length; s++) secs[s].classList.remove('on');

  // Wire events
  var logo = document.getElementById('lib-logo');
  if (logo) logo.addEventListener('click', function () { showIntro(1); });

  var startBtn = document.getElementById('b-lib-start');
  if (startBtn) {
    startBtn.addEventListener('click', function () {
      var lastBook = localStorage.getItem('attain_last_book');
      var lastCh = parseInt(localStorage.getItem('attain_last_ch') || '0');
      if (lastBook && getBook(lastBook)) {
        setActiveBook(lastBook).then(function () {
          buildSidebar(lastBook);
          showChapterActivities(lastBook, lastCh);
        });
      } else if (lib.length > 0) {
        var bid = lib[0].id;
        setActiveBook(bid).then(function () {
          buildSidebar(bid);
          showArchitecture(bid);
        });
      }
    });
  }

  var heroBtn = document.getElementById('b-lib-new-hero');
  if (heroBtn) heroBtn.addEventListener('click', function () { showUpload(); });

  var newBtn = document.getElementById('b-lib-new');
  if (newBtn) newBtn.addEventListener('click', function () { showUpload(); });

  var reviewBtn = document.getElementById('b-lib-review');
  if (reviewBtn) reviewBtn.addEventListener('click', function () { showCrossReview(); });

  var progBtn = document.getElementById('b-lib-progress');
  if (progBtn) progBtn.addEventListener('click', function () { showProgress(); });

  var settBtn = document.getElementById('b-lib-settings');
  if (settBtn) settBtn.addEventListener('click', function () { showSettings(); });

  // Wire book cards
  var bookCards = document.querySelectorAll('.lib-card[data-book]');
  for (var bc = 0; bc < bookCards.length; bc++) {
    bookCards[bc].addEventListener('click', function () {
      var bid = this.getAttribute('data-book');
      setActiveBook(bid).then(function () {
        buildSidebar(bid);
        showArchitecture(bid);
      });
    });
  }
}

// ---- Book Delete Confirmation ----

function confirmDeleteBook(bookId) {
  var book = getBook(bookId);
  if (!book) return;
  var h = '<div class="cloze-results">';
  h += '<div class="cr-emoji">\u26A0\uFE0F</div>';
  h += '<div class="cr-msg">Delete "' + book.title + '"?<br><span style="font-size:.8em;color:var(--text-muted)">This removes the book and all study progress for it. This cannot be undone.</span></div>';
  h += '<div class="cr-btns">';
  h += '<button class="study-btn" id="b-del-yes" style="background:#dc2626" aria-label="Confirm delete">Delete</button>';
  h += '<button class="study-btn sb-pri" id="b-del-no" aria-label="Cancel">Cancel</button>';
  h += '</div></div>';

  document.getElementById('content').innerHTML = h;
  document.getElementById('b-del-yes').addEventListener('click', function () {
    deleteBook(bookId);
    deleteChaptersDB(bookId);
    if (activeBookId === bookId) {
      activeBookId = null;
      activeChapters = [];
    }
    showLibrary();
  });
  document.getElementById('b-del-no').addEventListener('click', function () {
    showLibrary();
  });
}

// ---- Settings Screen ----

function showSettings() {
  var h = '<div class="prog-view">';
  h += '<div class="sv-title" style="border-left-color:var(--vol5)">Settings</div>';

  // Font toggle
  h += '<div class="prog-card">';
  h += '<h3 class="prog-h3">Accessibility</h3>';
  h += '<div style="display:flex;flex-direction:column;gap:12px">';
  h += '<label style="display:flex;align-items:center;gap:10px;font-weight:700;font-size:.95em;color:var(--text-main)">';
  h += '<input type="checkbox" id="set-dyslexic" ' + (document.body.classList.contains('font-dyslexic') ? 'checked' : '') + ' style="transform:scale(1.3)"> OpenDyslexic Font</label>';
  h += '<label style="display:flex;align-items:center;gap:10px;font-weight:700;font-size:.95em;color:var(--text-main)">';
  h += '<input type="checkbox" id="set-beeline" ' + (document.body.classList.contains('beeline-on') ? 'checked' : '') + ' style="transform:scale(1.3)"> BeeLine Reading Aid</label>';
  h += '<label style="display:flex;align-items:center;gap:10px;font-weight:700;font-size:.95em;color:var(--text-main)">';
  h += '<input type="checkbox" id="set-linefocus" ' + (document.body.classList.contains('linefocus-on') ? 'checked' : '') + ' style="transform:scale(1.3)"> Line Focus Mode</label>';
  h += '</div></div>';

  // Theme
  h += '<div class="prog-card">';
  h += '<h3 class="prog-h3">Theme</h3>';
  h += '<div style="display:flex;gap:10px;flex-wrap:wrap">';
  var themes = [
    { id: '', label: 'Light', color: '#faf6f0' },
    { id: 'theme-parchment', label: 'Parchment', color: '#2c2416' },
    { id: 'theme-navy', label: 'Navy', color: '#0a1628' },
    { id: 'theme-amber', label: 'Amber', color: '#1a1408' }
  ];
  for (var t = 0; t < themes.length; t++) {
    h += '<button class="study-btn set-theme-btn" data-theme="' + themes[t].id + '" style="background:' + themes[t].color + ';color:' + (themes[t].id ? '#fff' : '#333') + ';border:2px solid #888;min-width:80px" aria-label="' + themes[t].label + ' theme">' + themes[t].label + '</button>';
  }
  h += '</div></div>';

  // Voice
  h += '<div class="prog-card">';
  h += '<h3 class="prog-h3">Voice</h3>';
  h += '<select id="set-voice" style="width:100%;padding:12px;border-radius:var(--radius);border:2px solid #ddd;font-family:var(--font-main);font-size:14px;background:var(--bg-card);color:var(--text-main)" aria-label="Select voice">';
  var savedVoice = localStorage.getItem('attain_voice') || '';
  for (var v = 0; v < ttsVoices.length; v++) {
    h += '<option value="' + ttsVoices[v].name + '"' + (ttsVoices[v].name === savedVoice ? ' selected' : '') + '>' + ttsVoices[v].name + '</option>';
  }
  h += '</select></div>';

  // Danger zone
  h += '<div class="prog-card" style="border-left:4px solid #dc2626">';
  h += '<h3 class="prog-h3" style="color:#dc2626">Danger Zone</h3>';
  h += '<button class="study-btn" id="b-set-reset" style="background:#dc2626" aria-label="Reset all progress">Reset All Progress</button>';
  h += '</div>';

  h += '<button class="study-btn" id="b-set-back" style="margin-top:16px" aria-label="Return to library">Back to Library</button>';
  h += '</div>';

  document.getElementById('content').innerHTML = h;

  // Wire events
  document.getElementById('set-dyslexic').addEventListener('change', function () {
    document.body.classList.toggle('font-dyslexic', this.checked);
    localStorage.setItem('attain_dyslexic', this.checked ? '1' : '');
  });
  document.getElementById('set-beeline').addEventListener('change', function () {
    document.body.classList.toggle('beeline-on', this.checked);
    localStorage.setItem('attain_beeline', this.checked ? '1' : '');
  });
  document.getElementById('set-linefocus').addEventListener('change', function () {
    document.body.classList.toggle('linefocus-on', this.checked);
    localStorage.setItem('attain_linefocus', this.checked ? '1' : '');
  });

  var themeBtns = document.querySelectorAll('.set-theme-btn');
  for (var tb = 0; tb < themeBtns.length; tb++) {
    themeBtns[tb].addEventListener('click', function () {
      var theme = this.getAttribute('data-theme');
      document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
      if (theme) document.body.classList.add(theme);
      localStorage.setItem('attain_theme', theme);
    });
  }

  document.getElementById('set-voice').addEventListener('change', function () {
    localStorage.setItem('attain_voice', this.value);
  });

  document.getElementById('b-set-reset').addEventListener('click', function () {
    if (confirm('This will delete ALL books, progress, and study data. Are you sure?')) {
      localStorage.removeItem('attain_library');
      localStorage.removeItem('attain_cards');
      localStorage.removeItem('attain_qmastery');
      localStorage.removeItem('attain_stats');
      localStorage.removeItem('attain_notes');
      localStorage.removeItem('attain_active_book');
      deleteChaptersDB(activeBookId);
      activeBookId = null;
      activeChapters = [];
      showLibrary();
    }
  });

  document.getElementById('b-set-back').addEventListener('click', function () { showLibrary(); });
}

// ---- Upload Flow — drop zone, file picker, paste area, parsing progress ----

function showUpload() {
  var h = '<div class="upload-zone">';
  h += '<div class="sv-title" style="border-left-color:var(--vol1)">Add a New Book</div>';

  // Book title input
  h += '<div style="margin-bottom:20px">';
  h += '<label style="font-weight:700;font-size:.9em;color:var(--text-muted);display:block;margin-bottom:6px">Book Title</label>';
  h += '<input type="text" id="upload-title" placeholder="Enter book title..." style="width:100%;padding:14px;border-radius:var(--radius);border:2px solid #ddd;font-family:var(--font-main);font-size:16px;font-weight:700;background:var(--bg-card);color:var(--text-main)" aria-label="Book title">';
  h += '</div>';

  // Drop zone
  h += '<div class="upload-drop" id="upload-drop" role="button" tabindex="0" aria-label="Drop a file here or tap to browse">';
  h += '<div class="upload-drop-icon">\u{1F4C4}</div>';
  h += '<div class="upload-drop-text">Drop a file here or tap to browse</div>';
  h += '<div class="upload-drop-sub">PDF \u2022 EPUB \u2022 DOCX \u2022 TXT \u2022 HTML</div>';
  h += '</div>';
  h += '<input type="file" id="upload-file" accept=".pdf,.epub,.docx,.txt,.md,.html,.htm" style="display:none">';

  // OR divider
  h += '<div class="upload-or">\u2014 or paste text directly \u2014</div>';

  // Paste area
  h += '<textarea id="upload-paste" class="upload-paste" placeholder="Paste your text here..." aria-label="Paste text content"></textarea>';

  // Action buttons
  h += '<div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center">';
  h += '<button class="study-btn sb-pri" id="b-upload-go" aria-label="Parse and import">\u{1F680} Import Book</button>';
  h += '<button class="study-btn" id="b-upload-cancel" aria-label="Cancel and return to library">Cancel</button>';
  h += '</div>';

  // Status area
  h += '<div id="upload-status" role="status" aria-live="polite" style="margin-top:16px;text-align:center;font-size:14px;font-weight:700;color:var(--text-muted)"></div>';

  h += '</div>';

  document.getElementById('content').innerHTML = h;
  document.getElementById('tb').textContent = 'New Book';

  var selectedFile = null;
  var dropZone = document.getElementById('upload-drop');
  var fileInput = document.getElementById('upload-file');
  var statusEl = document.getElementById('upload-status');

  // Tap drop zone to open file picker
  dropZone.addEventListener('click', function () {
    fileInput.click();
  });

  // File selected via picker
  fileInput.addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) {
      selectedFile = e.target.files[0];
      dropZone.querySelector('.upload-drop-text').textContent = '\u2705 ' + selectedFile.name;
      dropZone.querySelector('.upload-drop-sub').textContent = formatFileSize(selectedFile.size);
      // Auto-fill title from filename if empty
      var titleInput = document.getElementById('upload-title');
      if (!titleInput.value.trim()) {
        var name = selectedFile.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        titleInput.value = name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  });

  // Drag and drop
  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    this.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectedFile = e.dataTransfer.files[0];
      dropZone.querySelector('.upload-drop-text').textContent = '\u2705 ' + selectedFile.name;
      dropZone.querySelector('.upload-drop-sub').textContent = formatFileSize(selectedFile.size);
      var titleInput = document.getElementById('upload-title');
      if (!titleInput.value.trim()) {
        var name = selectedFile.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        titleInput.value = name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  });

  // Import button
  document.getElementById('b-upload-go').addEventListener('click', function () {
    var title = document.getElementById('upload-title').value.trim();
    var pasteText = document.getElementById('upload-paste').value.trim();

    if (!title) {
      statusEl.textContent = '\u274C Please enter a book title';
      statusEl.style.color = '#dc2626';
      return;
    }

    if (!selectedFile && !pasteText) {
      statusEl.textContent = '\u274C Please select a file or paste text';
      statusEl.style.color = '#dc2626';
      return;
    }

    statusEl.textContent = '\u23F3 Parsing...';
    statusEl.style.color = 'var(--vol1)';

    var textPromise;
    if (selectedFile) {
      textPromise = parseFile(selectedFile);
    } else {
      textPromise = parsePlainText(pasteText);
    }

    textPromise.then(function (rawText) {
      if (!rawText || rawText.trim().length < 50) {
        statusEl.textContent = '\u274C Not enough text extracted from the file';
        statusEl.style.color = '#dc2626';
        return;
      }
      statusEl.textContent = '\u23F3 Detecting chapters...';
      var chapters = detectChapters(rawText);
      statusEl.textContent = '\u23F3 Extracting key terms...';
      showChapterPreview(title, chapters, rawText);
    }).catch(function (err) {
      statusEl.textContent = '\u274C Error: ' + err.message;
      statusEl.style.color = '#dc2626';
    });
  });

  // Cancel button
  document.getElementById('b-upload-cancel').addEventListener('click', function () {
    showLibrary();
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ---- Chapter Preview — confirm or adjust detected chapter breaks ----

function showChapterPreview(title, chapters, rawText) {
  var h = '<div class="parse-preview">';
  h += '<div class="sv-title" style="border-left-color:var(--vol1)">' + title + '</div>';
  h += '<div style="text-align:center;margin-bottom:20px">';
  h += '<div style="font-size:1.1em;font-weight:700;color:var(--text-main)">' + chapters.length + ' chapters detected</div>';
  var totalParas = 0;
  for (var c = 0; c < chapters.length; c++) totalParas += chapters[c].paragraphs.length;
  h += '<div style="font-size:.85em;color:var(--text-muted);margin-top:4px">' + totalParas + ' paragraphs total</div>';
  h += '</div>';

  // Chapter list with previews
  for (var i = 0; i < chapters.length; i++) {
    var ch = chapters[i];
    var preview = ch.paragraphs.length > 0 ? ch.paragraphs[0] : '';
    if (preview.length > 120) preview = preview.slice(0, 117) + '...';

    h += '<div class="parse-chapter" data-ch="' + i + '">';
    h += '<div style="display:flex;align-items:center;gap:8px">';
    h += '<span style="background:var(--vol1);color:#fff;padding:2px 8px;border-radius:6px;font-size:.75em;font-weight:700">' + (i + 1) + '</span>';
    h += '<input type="text" class="ch-title-edit" data-ch="' + i + '" value="' + ch.title.replace(/"/g, '&quot;') + '" style="flex:1;padding:8px 10px;border:1px solid #ddd;border-radius:8px;font-family:var(--font-main);font-size:.95em;font-weight:700;background:var(--bg-card);color:var(--text-main)" aria-label="Chapter ' + (i + 1) + ' title">';
    h += '</div>';
    h += '<div class="parse-ch-preview">' + preview + '</div>';
    h += '<div class="parse-ch-count">' + ch.paragraphs.length + ' paragraphs</div>';
    h += '</div>';
  }

  // Action buttons
  h += '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:24px">';
  h += '<button class="study-btn sb-pri" id="b-preview-confirm" aria-label="Confirm and import">\u2705 Confirm &amp; Import</button>';
  h += '<button class="study-btn" id="b-preview-resplit" aria-label="Re-split chapters" style="background:#d97706">\u{1F504} Re-split</button>';
  h += '<button class="study-btn" id="b-preview-cancel" aria-label="Cancel">Cancel</button>';
  h += '</div>';

  // Re-split options (hidden initially)
  h += '<div id="resplit-panel" style="display:none;margin-top:16px;text-align:center">';
  h += '<div style="font-weight:700;margin-bottom:10px;color:var(--text-main)">Split into how many sections?</div>';
  h += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">';
  var splitOptions = [5, 10, 15, 20, 30];
  for (var so = 0; so < splitOptions.length; so++) {
    h += '<button class="study-btn resplit-btn" data-n="' + splitOptions[so] + '" aria-label="Split into ' + splitOptions[so] + ' sections" style="min-width:60px">' + splitOptions[so] + '</button>';
  }
  h += '</div>';
  h += '<div class="upload-or" style="margin:12px 0">\u2014 or split by \u2014</div>';
  h += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">';
  h += '<button class="study-btn resplit-mode-btn" data-mode="double-newline" aria-label="Split by double line break">Double Line Break</button>';
  h += '<button class="study-btn resplit-mode-btn" data-mode="heading" aria-label="Split by headings only">Headings Only</button>';
  h += '</div></div>';

  h += '<div id="preview-status" role="status" aria-live="polite" style="margin-top:12px;text-align:center;font-size:14px;font-weight:700;color:var(--text-muted)"></div>';
  h += '</div>';

  document.getElementById('content').innerHTML = h;
  document.getElementById('tb').textContent = 'Preview: ' + title;

  // Confirm button — save book
  document.getElementById('b-preview-confirm').addEventListener('click', function () {
    var statusEl = document.getElementById('preview-status');
    statusEl.textContent = '\u23F3 Saving book...';

    // Read edited chapter titles
    var titleInputs = document.querySelectorAll('.ch-title-edit');
    for (var ti = 0; ti < titleInputs.length; ti++) {
      var idx = parseInt(titleInputs[ti].getAttribute('data-ch'));
      if (chapters[idx]) chapters[idx].title = titleInputs[ti].value.trim() || 'Chapter ' + (idx + 1);
    }

    // Extract key terms
    var keyTerms = extractKeyTerms(chapters);
    var tp = 0;
    for (var p = 0; p < chapters.length; p++) tp += chapters[p].paragraphs.length;

    var bookId = generateBookId();
    var lib = getLibrary();
    var book = {
      id: bookId,
      title: title,
      color: assignBookColor(lib.length),
      dateAdded: new Date().toISOString(),
      chapterCount: chapters.length,
      keyTerms: keyTerms,
      totalParagraphs: tp
    };

    saveBook(book);
    // Store chapters in memory immediately as fallback
    activeBookId = bookId;
    activeChapters = chapters;
    activeChapterIdx = 0;
    localStorage.setItem('attain_active_book', bookId);
    localStorage.setItem('attain_last_book', bookId);
    localStorage.setItem('attain_last_ch', '0');

    saveChaptersDB(bookId, chapters).then(function () {
      buildSidebar(bookId);
      showArchitecture(bookId);
    }).catch(function () {
      // IndexedDB failed — chapters already in memory, proceed anyway
      buildSidebar(bookId);
      showArchitecture(bookId);
    });
  });

  // Re-split button — toggle panel
  document.getElementById('b-preview-resplit').addEventListener('click', function () {
    var panel = document.getElementById('resplit-panel');
    panel.style.display = panel.style.display === 'none' ? '' : 'none';
  });

  // Re-split by count
  var resplitBtns = document.querySelectorAll('.resplit-btn');
  for (var rb = 0; rb < resplitBtns.length; rb++) {
    resplitBtns[rb].addEventListener('click', function () {
      var n = parseInt(this.getAttribute('data-n'));
      var allText = rawText.split(/\n/).filter(function (l) { return l.trim().length > 10; });
      var chunkSize = Math.max(1, Math.ceil(allText.length / n));
      var newChapters = [];
      for (var i = 0; i < allText.length; i += chunkSize) {
        var slice = allText.slice(i, i + chunkSize);
        newChapters.push({
          title: 'Section ' + (newChapters.length + 1),
          paragraphs: slice.map(function (l) { return l.trim(); })
        });
      }
      showChapterPreview(title, newChapters, rawText);
    });
  }

  // Re-split by mode
  var modeBtns = document.querySelectorAll('.resplit-mode-btn');
  for (var mb = 0; mb < modeBtns.length; mb++) {
    modeBtns[mb].addEventListener('click', function () {
      var mode = this.getAttribute('data-mode');
      var newChapters;
      if (mode === 'double-newline') {
        var blocks = rawText.split(/\n\s*\n/).filter(function (b) { return b.trim().length > 20; });
        newChapters = blocks.map(function (b, i) {
          return { title: 'Section ' + (i + 1), paragraphs: [b.trim()] };
        });
      } else {
        newChapters = detectChapters(rawText);
      }
      if (!newChapters.length) {
        newChapters = [{ title: 'Full Text', paragraphs: rawText.split('\n').filter(function (l) { return l.trim(); }) }];
      }
      showChapterPreview(title, newChapters, rawText);
    });
  }

  // Cancel
  document.getElementById('b-preview-cancel').addEventListener('click', function () { showUpload(); });

  window.scrollTo(0, 0);
}

// ---- Book Architecture — visual mind map of chapter structure with mastery dots ----

function showArchitecture(bookId) {
  var book = getBook(bookId);
  if (!book) { showLibrary(); return; }
  var chapters = activeChapters;
  if (!chapters || !chapters.length) {
    setActiveBook(bookId).then(function () {
      chapters = activeChapters;
      renderArch();
    });
    return;
  }
  renderArch();

  function renderArch() {
    var totalDue = getDueCards(bookId).length;

    var h = '<div class="arch-view">';
    h += '<div class="sv-title" style="border-left-color:' + (book.color || 'var(--vol1)') + '">' + book.title + '</div>';

    // Book stats bar
    h += '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:20px">';
    h += '<div class="home-stat" style="background:' + (book.color || 'var(--vol1)') + ';color:#fff">\u{1F4D6} ' + chapters.length + ' chapters</div>';
    h += '<div class="home-stat" style="background:rgba(0,0,0,.15);color:var(--text-main)">\u{1F4DD} ' + (book.totalParagraphs || 0) + ' paragraphs</div>';
    if (totalDue > 0) h += '<div class="home-stat home-due">\u{1F4DA} ' + totalDue + ' cards due</div>';
    h += '<div class="home-stat" style="background:rgba(0,0,0,.1);color:var(--text-main)">\u{1F511} ' + (book.keyTerms ? book.keyTerms.length : 0) + ' key terms</div>';
    h += '</div>';

    // Review button
    if (totalDue > 0) {
      h += '<div style="text-align:center;margin-bottom:20px"><button class="study-btn sb-pri" id="b-arch-review" aria-label="Review due cards for this book">\u{1F4DA} Review Due Cards (' + totalDue + ')</button></div>';
    }

    // Chapter nodes — the mind map
    h += '<div style="margin-bottom:8px;font-weight:700;font-size:.85em;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Chapter Map</div>';

    for (var i = 0; i < chapters.length; i++) {
      var ch = chapters[i];
      var mastery = getChapterMastery(bookId, i);
      var paraCount = ch.paragraphs ? ch.paragraphs.length : 0;
      var dotColor = mastery.pct >= 80 ? '#059669' : mastery.pct >= 40 ? '#d97706' : mastery.pct > 0 ? '#2563eb' : '#ccc';

      h += '<div class="arch-node" data-ch="' + i + '" role="button" tabindex="0" aria-label="Chapter ' + (i + 1) + ': ' + ch.title + ' — ' + mastery.pct + '% mastered">';
      h += '<div class="arch-dot" style="background:' + dotColor + '"></div>';
      h += '<div class="arch-label">' + ch.title + '</div>';
      h += '<div class="arch-terms">' + paraCount + ' \u00B6';
      if (mastery.badge) h += ' ' + mastery.badge;
      if (mastery.total > 0) h += ' ' + mastery.pct + '%';
      h += '</div>';
      h += '</div>';
    }

    // Key terms summary
    if (book.keyTerms && book.keyTerms.length > 0) {
      h += '<div style="margin-top:24px;margin-bottom:8px;font-weight:700;font-size:.85em;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Top Key Terms</div>';
      var showTerms = book.keyTerms.slice(0, 15);
      h += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
      for (var t = 0; t < showTerms.length; t++) {
        h += '<span style="background:var(--bg-card);border:2px solid ' + (book.color || 'var(--vol1)') + ';color:var(--text-main);padding:6px 12px;border-radius:20px;font-size:.85em;font-weight:700;font-family:var(--font-main)">' + showTerms[t].term + ' <span style="opacity:.6;font-size:.8em">' + showTerms[t].frequency + 'x</span></span>';
      }
      h += '</div>';
    }

    // Bottom actions
    h += '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:24px">';
    h += '<button class="study-btn" id="b-arch-library" aria-label="Return to library">\u{1F4DA} Library</button>';
    h += '<button class="study-btn" id="b-arch-delete" style="background:#dc2626" aria-label="Delete this book">\u{1F5D1} Delete Book</button>';
    h += '</div>';

    h += '</div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('tb').textContent = book.title;

    // Wire chapter nodes
    var nodes = document.querySelectorAll('.arch-node');
    for (var n = 0; n < nodes.length; n++) {
      nodes[n].addEventListener('click', function () {
        var chIdx = parseInt(this.getAttribute('data-ch'));
        activeChapterIdx = chIdx;
        showChapterActivities(bookId, chIdx);
      });
    }

    // Wire buttons
    var reviewBtn = document.getElementById('b-arch-review');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', function () {
        // Show flashcard review for this book's due cards
        var due = getDueCards(bookId);
        if (due.length) showCrossReview();
      });
    }

    document.getElementById('b-arch-library').addEventListener('click', function () { showLibrary(); });
    document.getElementById('b-arch-delete').addEventListener('click', function () { confirmDeleteBook(bookId); });

    window.scrollTo(0, 0);
  }
}

// ---- Chapter Activities — activity card grid per chapter with mastery bar ----

function showChapterActivities(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book) { showLibrary(); return; }
  var chapters = activeChapters;
  if (!chapters || !chapters[chIdx]) {
    setActiveBook(bookId).then(function () {
      if (activeChapters[chIdx]) showChapterActivities(bookId, chIdx);
      else showArchitecture(bookId);
    });
    return;
  }

  activeChapterIdx = chIdx;
  var ch = chapters[chIdx];
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);
  var mastery = getChapterMastery(bookId, chIdx);
  var dueCount = getDueCards(bookId).length;

  // Update sidebar active state
  var secs = document.querySelectorAll('.vol-hdr[data-ch]');
  for (var s = 0; s < secs.length; s++) {
    var isActive = parseInt(secs[s].getAttribute('data-ch')) === chIdx;
    secs[s].style.background = isActive ? 'rgba(255,255,255,.1)' : '';
    secs[s].style.borderLeft = isActive ? '4px solid #8888cc' : '';
    secs[s].style.paddingLeft = isActive ? '12px' : '';
  }

  // Save last position
  localStorage.setItem('attain_last_book', bookId);
  localStorage.setItem('attain_last_ch', String(chIdx));

  var h = '';

  // Volume banner
  h += '<div class="vol-banner" style="background:linear-gradient(135deg,' + (book.color || '#2563eb') + ',' + adjustColor(book.color || '#2563eb', -30) + ')">';
  h += '<div class="vol-banner-name">' + chTitle + '</div>';
  h += '</div>';

  // Mastery bar
  if (mastery.total > 0) {
    h += '<div class="mastery-bar"><div class="mastery-label">' +
      (mastery.badge || '\u{1F4CA}') + ' ' + mastery.mastered + '/' + mastery.total +
      ' questions mastered (' + mastery.pct + '%)</div>' +
      '<div class="prog-bar-wrap"><div class="prog-bar" style="width:' + mastery.pct + '%"></div></div></div>';
  }

  // Due cards banner
  if (dueCount > 0) {
    h += '<div class="due-banner">';
    h += '<span class="due-badge">\u{1F4DA} ' + dueCount + ' cards due for review</span>';
    h += '</div>';
  }

  // Activity grid
  h += '<div class="activity-grid">';
  h += actCard('\u{1F4D6}', 'Breakdown', book.color || '#2563eb', 'breakdown');
  h += actCard('\u{1F9E9}', 'Fill in Blank', '#059669', 'filblank');
  h += actCard('\u270F\uFE0F', 'Multiple Choice', '#7c3aed', 'mc');
  h += actCard('\u{1F0CF}', 'Flashcards', '#d97706', 'flash');
  h += actCard('\u{1F9E0}', 'Memory Match', '#dc2626', 'memory');
  h += actCard('\u{1F50A}', 'Listen & Learn', '#4f46e5', 'listen');
  h += actCard('\u{1F9E9}', 'Verse Builder', '#e91e90', 'versebuild');
  h += actCard('\u{1F517}', 'Word Match', '#6d28d9', 'wordmatch');
  h += actCard('\u2694\uFE0F', 'Challenge', '#b91c1c', 'challenge');
  h += '</div>';

  // Navigation
  h += '<div style="display:flex;gap:10px;justify-content:center;margin-top:10px;flex-wrap:wrap">';
  if (chIdx > 0) {
    h += '<button class="study-btn" id="b-act-prev" aria-label="Previous chapter">\u25C0 Previous</button>';
  }
  h += '<button class="study-btn" id="b-act-arch" aria-label="Book architecture view">\u{1F5FA} Architecture</button>';
  if (chIdx < chapters.length - 1) {
    h += '<button class="study-btn" id="b-act-next" aria-label="Next chapter">Next \u25B6</button>';
  }
  h += '</div>';

  document.getElementById('content').innerHTML = h;
  document.getElementById('tb').textContent = chTitle;

  // Wire activity cards
  var cards = document.querySelectorAll('.act-card');
  for (var c = 0; c < cards.length; c++) {
    cards[c].addEventListener('click', function () {
      var mode = this.getAttribute('data-mode');
      openStudyMode(bookId, chIdx, mode);
    });
  }

  // Wire nav buttons
  var prevBtn = document.getElementById('b-act-prev');
  if (prevBtn) prevBtn.addEventListener('click', function () { showChapterActivities(bookId, chIdx - 1); });

  var nextBtn = document.getElementById('b-act-next');
  if (nextBtn) nextBtn.addEventListener('click', function () { showChapterActivities(bookId, chIdx + 1); });

  document.getElementById('b-act-arch').addEventListener('click', function () { showArchitecture(bookId); });

  window.scrollTo(0, 0);
}

function actCard(icon, label, color, mode) {
  return '<div class="act-card" data-mode="' + mode + '" style="background:' + color + '" role="button" tabindex="0" aria-label="' + label + ' activity">' +
    '<div class="act-icon" aria-hidden="true">' + icon + '</div>' +
    '<div class="act-label">' + label + '</div>' +
    '</div>';
}

function openStudyMode(bookId, chIdx, mode) {
  if (mode === 'breakdown') { showBreakdown(bookId, chIdx); return; }
  if (mode === 'filblank') { showFillBlank(bookId, chIdx); return; }
  if (mode === 'mc') { showMC(bookId, chIdx); return; }
  if (mode === 'flash') { showFlashcards(bookId, chIdx); return; }
  if (mode === 'memory') { showMemoryMatch(bookId, chIdx); return; }
  if (mode === 'listen') { showListenLearn(bookId, chIdx); return; }
  if (mode === 'versebuild') { showVerseBuilder(bookId, chIdx); return; }
  if (mode === 'wordmatch') { showWordMatch(bookId, chIdx); return; }
  if (mode === 'challenge') { showChallenge(bookId, chIdx); return; }
  showNoContent(bookId, chIdx, mode);
}

function adjustColor(hex, amount) {
  hex = hex.replace('#', '');
  var r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  var g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  var b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}

// ---- Sidebar + Navigation ----

function buildSidebar(bookId) {
  var book = getBook(bookId);
  var sb = document.getElementById('sb');
  sb.innerHTML = '';

  if (!book) return;

  var bookColor = book.color || '#2563eb';

  // Sidebar intro label
  var intro = document.createElement('div');
  intro.className = 'sb-intro';
  intro.textContent = '\u{1F4D6} ATTAIN';
  sb.appendChild(intro);

  // Volume header — book title with color
  var volHdr = document.createElement('div');
  volHdr.className = 'vol-hdr';
  volHdr.style.color = bookColor;
  volHdr.innerHTML = book.title + '<span class="vol-eng" style="color:#8888cc">' + (book.chapterCount || 0) + ' Chapters</span>';
  volHdr.style.cursor = 'pointer';
  volHdr.addEventListener('click', function () { showArchitecture(bookId); });
  sb.appendChild(volHdr);

  // Library link
  var libLink = document.createElement('div');
  libLink.className = 'sec';
  libLink.innerHTML = '\u{1F4DA} All Books';
  libLink.style.color = '#8888cc';
  libLink.style.fontWeight = '700';
  libLink.setAttribute('role', 'button');
  libLink.setAttribute('tabindex', '0');
  libLink.setAttribute('aria-label', 'Return to book library');
  libLink.addEventListener('click', function () { showLibrary(); });
  sb.appendChild(libLink);

  var chapterColors = [
    '#2563eb', '#dc2626', '#059669', '#d97706',
    '#7c3aed', '#0891b2', '#ea580c', '#b8860b',
    '#e91e90', '#16a34a', '#6d28d9', '#0ea5e9'
  ];

  // Chapter list with color-coded headers and subtitles
  var chapters = activeChapters;
  if (!chapters || !chapters.length) return;

  for (var i = 0; i < chapters.length; i++) {
    var chColor = chapterColors[i % chapterColors.length];

    // Color-coded chapter header
    var hdr = document.createElement('div');
    hdr.className = 'vol-hdr';
    hdr.setAttribute('data-ch', String(i));
    hdr.style.color = chColor;
    hdr.style.cursor = 'pointer';

    var chNum = document.createElement('span');
    chNum.textContent = 'Ch ' + (i + 1);
    hdr.appendChild(chNum);

    // Subtitle — use title if it's descriptive, otherwise generate from content
    var chTitle = chapters[i].title || '';
    var isGeneric = /^(Chapter|Section|Part)\s+\d+$/i.test(chTitle);
    var subtitle = '';
    if (!isGeneric && chTitle.length > 0) {
      subtitle = chTitle.length > 45 ? chTitle.slice(0, 42) + '...' : chTitle;
    }
    if (subtitle) {
      var sub = document.createElement('span');
      sub.className = 'vol-eng';
      sub.style.color = '#8888cc';
      sub.textContent = subtitle;
      hdr.appendChild(sub);
    }

    // Content preview — always show first line as context
    if (chapters[i].paragraphs && chapters[i].paragraphs.length > 0) {
      var preview = '';
      // Find the first meaningful line
      for (var pi = 0; pi < Math.min(3, chapters[i].paragraphs.length); pi++) {
        var candidate = chapters[i].paragraphs[pi].trim();
        if (candidate.length > 10 && candidate !== subtitle) {
          preview = candidate;
          break;
        }
      }
      if (preview) {
        if (preview.length > 55) preview = preview.slice(0, 52) + '...';
        var prev = document.createElement('span');
        prev.className = 'vol-eng';
        prev.style.color = '#6666aa';
        prev.style.fontSize = '0.9em';
        prev.textContent = preview;
        hdr.appendChild(prev);
      }
    }

    (function (idx) {
      hdr.addEventListener('click', function () {
        activeChapterIdx = idx;
        if (window.innerWidth <= 768) { sbOpen = false; updateSB(); }
        showChapterActivities(bookId, idx);
      });
    })(i);

    // Mastery badge
    var mastery = getChapterMastery(bookId, i);
    if (mastery.pct > 0) {
      var badge = document.createElement('span');
      badge.className = 'vol-badge';
      badge.textContent = mastery.badge || '';
      if (mastery.badge) hdr.appendChild(badge);
    }

    sb.appendChild(hdr);
  }
}

// ---- Top Navigation Wiring ----

var sbOpen = false;
var updateSB = function () {};

function initNav() {
  // Restore saved preferences
  if (localStorage.getItem('attain_dyslexic') === '1') document.body.classList.add('font-dyslexic');
  if (localStorage.getItem('attain_beeline') === '1') document.body.classList.add('beeline-on');
  if (localStorage.getItem('attain_linefocus') === '1') document.body.classList.add('linefocus-on');
  var savedTheme = localStorage.getItem('attain_theme');
  if (savedTheme) document.body.classList.add(savedTheme);

  sbOpen = window.innerWidth > 768;
  var sb = document.getElementById('sb');
  var main = document.getElementById('main');
  var vr = document.getElementById('vr');
  var np = document.getElementById('np');
  var nv = document.getElementById('nv');
  var vrOpen = false, npOpen = false, nvOpen = false;

  updateSB = function () {
    sb.classList.remove('h', 'm');
    if (sbOpen) {
      if (window.innerWidth <= 768) {
        sb.classList.add('m');
      }
      main.classList.remove('x');
    } else {
      sb.classList.add('h');
      main.classList.add('x');
    }
    document.getElementById('b-sb').setAttribute('aria-expanded', sbOpen ? 'true' : 'false');
  }

  // Sidebar toggle — only open if there's content in sidebar
  document.getElementById('b-sb').addEventListener('click', function () {
    var sb = document.getElementById('sb');
    if (!sbOpen && (!sb.innerHTML || sb.innerHTML.trim() === '')) return;
    sbOpen = !sbOpen;
    updateSB();
  });

  // Close sidebar when tapping main content on mobile
  document.getElementById('main').addEventListener('click', function () {
    if (sbOpen && window.innerWidth <= 768) {
      sbOpen = false;
      updateSB();
    }
  });

  // Home button
  document.getElementById('b-home').addEventListener('click', function () { showLibrary(); });

  // Title bar click
  document.getElementById('tb').addEventListener('click', function () { showLibrary(); });

  // Font size
  var fontSize = parseInt(localStorage.getItem('attain_fontsize') || '12');
  document.body.style.fontSize = fontSize + 'pt';

  document.getElementById('b-fs-').addEventListener('click', function () {
    fontSize = Math.max(8, fontSize - 1);
    document.body.style.fontSize = fontSize + 'pt';
    localStorage.setItem('attain_fontsize', String(fontSize));
  });
  document.getElementById('b-fs+').addEventListener('click', function () {
    fontSize = Math.min(24, fontSize + 1);
    document.body.style.fontSize = fontSize + 'pt';
    localStorage.setItem('attain_fontsize', String(fontSize));
  });

  // Theme cycle
  var themeList = ['', 'theme-parchment', 'theme-navy', 'theme-amber'];
  var themeIdx = 0;
  var current = localStorage.getItem('attain_theme') || '';
  for (var ti = 0; ti < themeList.length; ti++) {
    if (themeList[ti] === current) { themeIdx = ti; break; }
  }
  document.getElementById('b-theme').addEventListener('click', function () {
    document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
    themeIdx = (themeIdx + 1) % themeList.length;
    if (themeList[themeIdx]) document.body.classList.add(themeList[themeIdx]);
    localStorage.setItem('attain_theme', themeList[themeIdx]);
  });

  // BeeLine toggle
  document.getElementById('b-beeline').addEventListener('click', function () {
    document.body.classList.toggle('beeline-on');
    var on = document.body.classList.contains('beeline-on');
    localStorage.setItem('attain_beeline', on ? '1' : '');
    this.classList.toggle('on', on);
  });

  // Line focus toggle
  document.getElementById('b-linefocus').addEventListener('click', function () {
    document.body.classList.toggle('linefocus-on');
    var on = document.body.classList.contains('linefocus-on');
    localStorage.setItem('attain_linefocus', on ? '1' : '');
    this.classList.toggle('on', on);
  });

  // Voice reader toggle
  document.getElementById('b-vt').addEventListener('click', function () {
    vrOpen = !vrOpen;
    vr.classList.toggle('on', vrOpen);
    main.classList.toggle('vopen', vrOpen);
    this.classList.toggle('on', vrOpen);
    if (vrOpen) loadVoiceSelect();
  });

  // Voice reader controls
  document.getElementById('b-pl').addEventListener('click', function () {
    speakText(document.getElementById('content').textContent.slice(0, 3000));
  });
  document.getElementById('b-st').addEventListener('click', function () { stopSpeech(); });

  function loadVoiceSelect() {
    loadVoices();
    var vc = document.getElementById('vc');
    vc.innerHTML = '';
    var saved = localStorage.getItem('attain_voice') || '';
    for (var i = 0; i < ttsVoices.length; i++) {
      var opt = document.createElement('option');
      opt.value = ttsVoices[i].name;
      opt.textContent = ttsVoices[i].name;
      if (ttsVoices[i].name === saved) opt.selected = true;
      vc.appendChild(opt);
    }
    vc.addEventListener('change', function () {
      localStorage.setItem('attain_voice', this.value);
    });
  }

  // Notes toggle
  document.getElementById('b-nt').addEventListener('click', function () {
    npOpen = !npOpen;
    np.classList.toggle('on', npOpen);
    this.classList.toggle('on', npOpen);
    if (npOpen && activeBookId) {
      var note = getNote(activeBookId, activeChapterIdx);
      document.getElementById('np-ta').value = note;
      document.getElementById('np-lbl').textContent = 'Notes — Ch ' + (activeChapterIdx + 1);
    }
  });
  document.getElementById('np-save').addEventListener('click', function () {
    if (activeBookId) saveNote(activeBookId, activeChapterIdx, document.getElementById('np-ta').value);
  });
  document.getElementById('np-clr').addEventListener('click', function () {
    document.getElementById('np-ta').value = '';
    if (activeBookId) saveNote(activeBookId, activeChapterIdx, '');
  });
  document.getElementById('np-cls').addEventListener('click', function () {
    npOpen = false;
    np.classList.remove('on');
    document.getElementById('b-nt').classList.remove('on');
  });

  // All notes toggle
  document.getElementById('b-nv').addEventListener('click', function () {
    nvOpen = !nvOpen;
    nv.classList.toggle('on', nvOpen);
    this.classList.toggle('on', nvOpen);
    if (nvOpen) renderAllNotes();
  });

  function renderAllNotes() {
    var notes = getNotes();
    var list = document.getElementById('nv-list');
    list.innerHTML = '';
    var keys = Object.keys(notes);
    if (!keys.length) {
      list.innerHTML = '<p style="color:var(--text-muted);padding:20px">No notes saved yet.</p>';
      return;
    }
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var parts = key.split(':');
      var bk = getBook(parts[0]);
      var bkName = bk ? bk.title : parts[0];
      var chNum = parseInt(parts[1] || 0) + 1;

      var ni = document.createElement('div');
      ni.className = 'ni';
      ni.innerHTML = '<div class="ni-lbl">' + bkName + ' — Ch ' + chNum + '</div>' +
        '<button class="ni-del" data-key="' + key + '" aria-label="Delete this note">\u{1F5D1}</button>' +
        '<div class="ni-txt">' + notes[key] + '</div>';
      list.appendChild(ni);
    }
    var delBtns = list.querySelectorAll('.ni-del');
    for (var d = 0; d < delBtns.length; d++) {
      delBtns[d].addEventListener('click', function () {
        var k = this.getAttribute('data-key');
        var n = getNotes();
        delete n[k];
        try { localStorage.setItem('attain_notes', JSON.stringify(n)); } catch (e) {}
        renderAllNotes();
      });
    }
  }

  // Mobile: close sidebar on section click
  if (window.innerWidth <= 768) sbOpen = false;
  updateSB();

  // Start at library or resume last book at last chapter
  var lastBook = localStorage.getItem('attain_last_book');
  var lastCh = parseInt(localStorage.getItem('attain_last_ch') || '0');
  if (lastBook && getBook(lastBook)) {
    setActiveBook(lastBook).then(function () {
      buildSidebar(lastBook);
      showChapterActivities(lastBook, lastCh);
    });
  } else {
    showLibrary();
  }
}

// ---- Tap-to-hear on content ----
document.addEventListener('click', function (e) {
  var target = e.target;
  if (!target || target.tagName === 'BUTTON' || target.tagName === 'SELECT' ||
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'A') return;
  var inContent = target.closest('.ll-card, .cloze-prompt, .mc-question, .sv-text, .sv-td, .sv-fa, .fc-front, .fc-back, .sv-fq, .ch-question');
  if (!inContent) return;
  var sel = window.getSelection();
  if (sel && sel.toString().trim().length > 0) return;
  var range = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
  if (!range) return;
  range.expand('word');
  var word = range.toString().trim();
  if (word && word.length > 1 && word.length < 40) speakText(word);
});

// ---- Floating Dyslexic Font Toggle ----
function addDyslexicToggle() {
  if (document.getElementById('b-dy-float')) return;
  var btn = document.createElement('button');
  btn.id = 'b-dy-float';
  btn.className = 'font-toggle-btn';
  btn.setAttribute('aria-label', 'Toggle OpenDyslexic font');
  btn.textContent = 'Dy';
  btn.addEventListener('click', function () {
    var on = !document.body.classList.contains('font-dyslexic');
    document.body.classList.toggle('font-dyslexic', on);
    localStorage.setItem('attain_dyslexic', on ? '1' : '');
  });
  document.body.appendChild(btn);
}

// ---- Boot ----
document.addEventListener('DOMContentLoaded', function () { initNav(); addDyslexicToggle(); });
if (document.readyState !== 'loading') initNav();

// ---- Progress Screen — XP, streaks, levels, session history, export/import ----

function showProgress() {
  var s = getStats();
  var xp = s.xp || 0;
  var streak = s.streak || 0;
  var best = s.bestStreak || 0;
  var total = s.totalAnswered || 0;
  var lvl = getLevel(xp);
  var sessions = s.sessions || [];
  var lib = getLibrary();

  var h = '<div class="prog-view">';

  // Level card
  var lvlColor = lvl.current.name === 'Master' ? '#b8860b' :
    lvl.current.name === 'Guardian' ? '#7c3aed' :
    lvl.current.name === 'Architect' ? '#0891b2' :
    lvl.current.name === 'Scholar' ? '#2563eb' : '#6b7280';
  h += '<div class="prog-card prog-level" style="border-color:' + lvlColor + '">';
  h += '<div class="prog-level-icon">' + lvl.current.icon + '</div>';
  h += '<div class="prog-level-name">' + lvl.current.name + '</div>';
  h += '<div class="prog-xp">' + xp + ' XP</div>';
  if (lvl.next) {
    var pct = Math.min(100, Math.round((xp - lvl.current.xp) / (lvl.next.xp - lvl.current.xp) * 100));
    h += '<div class="prog-bar-wrap"><div class="prog-bar" style="width:' + pct + '%"></div></div>';
    h += '<div class="prog-next">' + (lvl.next.xp - xp) + ' XP to ' + lvl.next.icon + ' ' + lvl.next.name + '</div>';
  } else {
    h += '<div class="prog-next">Maximum level reached!</div>';
  }
  h += '</div>';

  // Stats grid
  h += '<div class="prog-card">';
  h += '<div class="prog-stats">';
  h += '<div class="prog-stat" style="background:#2563eb"><div class="ps-val">' + streak + '</div><div class="ps-label">DAY STREAK</div></div>';
  h += '<div class="prog-stat" style="background:#7c3aed"><div class="ps-val">' + best + '</div><div class="ps-label">BEST STREAK</div></div>';
  h += '<div class="prog-stat" style="background:#059669"><div class="ps-val">' + getAllDueCount() + '</div><div class="ps-label">CARDS DUE</div></div>';
  h += '<div class="prog-stat" style="background:#d97706"><div class="ps-val">' + lib.length + '</div><div class="ps-label">BOOKS</div></div>';
  h += '</div></div>';

  // Level roadmap
  h += '<div class="prog-card">';
  h += '<h3 class="prog-h3">Level Roadmap</h3>';
  for (var l = 0; l < LEVELS.length; l++) {
    var reached = xp >= LEVELS[l].xp;
    h += '<div class="prog-road' + (reached ? ' prog-reached' : '') + '">';
    h += '<span class="prog-road-icon">' + LEVELS[l].icon + '</span>';
    h += '<span class="prog-road-name">' + LEVELS[l].name + '</span>';
    h += '<span class="prog-road-xp">' + LEVELS[l].xp + ' XP</span>';
    if (reached) h += '<span class="prog-road-check">\u2713</span>';
    h += '</div>';
  }
  h += '</div>';

  // Per-book mastery
  if (lib.length > 0) {
    h += '<div class="prog-card">';
    h += '<h3 class="prog-h3">Book Progress</h3>';
    for (var b = 0; b < lib.length; b++) {
      var bk = lib[b];
      var bookDue = getDueCards(bk.id).length;
      var bookCards = getCards();
      var bookTotal = 0, bookMastered = 0;
      for (var cid in bookCards) {
        if (bookCards[cid].bookId === bk.id) {
          bookTotal++;
          if (bookCards[cid].ease >= 2.5 && bookCards[cid].reps >= 3) bookMastered++;
        }
      }
      h += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #eee">';
      h += '<div style="width:12px;height:12px;border-radius:50%;background:' + (bk.color || '#2563eb') + ';flex-shrink:0"></div>';
      h += '<div style="flex:1;font-weight:700;font-size:.9em;color:var(--text-main)">' + bk.title + '</div>';
      h += '<div style="font-size:.8em;color:var(--text-muted);font-weight:700">' + bookTotal + ' cards';
      if (bookDue > 0) h += ' \u00B7 ' + bookDue + ' due';
      h += '</div></div>';
    }
    h += '</div>';
  }

  // Recent sessions
  if (sessions.length > 0) {
    h += '<div class="prog-card">';
    h += '<h3 class="prog-h3">Recent Sessions</h3>';
    var recent = sessions.slice(-10).reverse();
    for (var r = 0; r < recent.length; r++) {
      var rs = recent[r];
      var rsBook = getBook(rs.bookId);
      var rsName = rsBook ? rsBook.title : rs.bookId;
      h += '<div class="prog-session">';
      h += '<span class="prog-ses-mode">' + (rs.mode || '').slice(0, 8) + '</span>';
      h += '<span class="prog-ses-label">' + rsName + (rs.chIdx !== undefined ? ' Ch' + (rs.chIdx + 1) : '') + '</span>';
      h += '<span class="prog-ses-score">' + rs.score + '/' + rs.total + '</span>';
      h += '</div>';
    }
    h += '</div>';
  }

  // Export/Import
  h += '<div class="prog-card">';
  h += '<h3 class="prog-h3">Backup &amp; Restore</h3>';
  h += '<div style="display:flex;gap:10px;flex-wrap:wrap">';
  h += '<button class="study-btn" id="b-prog-export" style="background:#059669" aria-label="Export progress">\u{1F4E5} Export Progress</button>';
  h += '<button class="study-btn" id="b-prog-import" style="background:#2563eb" aria-label="Import progress">\u{1F4E4} Import Progress</button>';
  h += '</div>';
  h += '<input type="file" id="prog-file" accept=".json" style="display:none">';
  h += '<div id="prog-io-msg" role="status" aria-live="polite" style="margin-top:8px;font-size:13px;color:var(--text-muted);font-weight:700"></div>';
  h += '</div>';

  h += '<button class="study-btn" id="b-prog-back" style="margin-top:16px" aria-label="Return to library">Back to Library</button>';
  h += '</div>';

  document.getElementById('content').innerHTML = h;
  document.getElementById('tb').textContent = 'Progress';

  // Wire export
  document.getElementById('b-prog-export').addEventListener('click', function () {
    exportProgress();
    document.getElementById('prog-io-msg').textContent = '\u2705 Progress exported successfully';
  });

  // Wire import
  document.getElementById('b-prog-import').addEventListener('click', function () {
    document.getElementById('prog-file').click();
  });
  document.getElementById('prog-file').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    importProgress(file).then(function (msg) {
      document.getElementById('prog-io-msg').textContent = '\u2705 ' + msg;
      setTimeout(function () { showProgress(); }, 1500);
    }).catch(function (err) {
      document.getElementById('prog-io-msg').textContent = '\u274C ' + err.message;
    });
  });

  // Wire back
  document.getElementById('b-prog-back').addEventListener('click', function () { showLibrary(); });

  window.scrollTo(0, 0);
}

console.log('attain-ui.js loaded (complete)');
