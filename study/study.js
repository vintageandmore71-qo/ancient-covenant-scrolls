// ACR Study — Phase 1.5 stub
// Shell + navigation + TOC + font controls.
// Voice reader and notes panels are wired up to empty handlers here;
// actual logic lands in follow-up commits one function at a time.

var IDS = [
  'file_1', 'file_2', 'file_3', 'file_4',
  'file_5', 'file_6',
  'file_7', 'file_8',
  'file_9', 'file_10',
  'file_11', 'file_12',
  'file_13', 'file_14', 'file_15',
  'file_16', 'file_17',
  'file_94'
];

var LBL = [
  'Bereshit (Genesis) — Part 1 — Chapters 1–11',
  'Bereshit (Genesis) — Part 2 — Chapters 12–25',
  'Bereshit (Genesis) — Part 3 — Chapters 26–36',
  'Bereshit (Genesis) — Part 4 — Chapters 37–50',
  'Shemot (Exodus) — Part 1 — Chapters 1–18',
  'Shemot (Exodus) — Part 2 — Chapters 19–40',
  'Vayikra (Leviticus) — Part 1 — Chapters 1–16',
  'Vayikra (Leviticus) — Part 2 — Chapters 17–27',
  'Bamidbar (Numbers) — Part 1 — Chapters 1–19',
  'Bamidbar (Numbers) — Part 2 — Chapters 20–36',
  'Devarim (Deuteronomy) — Part 1 — Chapters 1–17',
  'Devarim (Deuteronomy) — Part 2 — Chapters 18–34',
  'Chanokh (1 Enoch) — Part 1 — Chapters 1–36 — Book of Watchers',
  'Chanokh (1 Enoch) — Part 2 — Chapters 37–55 — Dream Visions',
  'Chanokh (1 Enoch) — Part 3 — Chapters 56–73 — Epistle',
  'Yovelim (Jubilees) — Part 1 — Chapters 1–25',
  'Yovelim (Jubilees) — Part 2 — Chapters 26–50',
  'War Scroll 1QM — Complete — All 19 Columns'
];

var VOL_GROUPS = [
  { title: 'Vol 1 — Bereshit', count: 4, vol: '1' },
  { title: 'Vol 2 — Shemot', count: 2, vol: '2' },
  { title: 'Vol 3 — Vayikra', count: 2, vol: '3' },
  { title: 'Vol 4 — Bamidbar', count: 2, vol: '4' },
  { title: 'Vol 5 — Devarim', count: 2, vol: '5' },
  { title: 'Vol 6 — Chanokh', count: 3, vol: '6' },
  { title: 'Vol 7 — Yovelim', count: 2, vol: '7' },
  { title: 'Vol 33 — War Scroll 1QM', count: 1, vol: '8' }
];

var fs = parseFloat(localStorage.getItem('acr_study_fs') || '10.5');
var lh = parseFloat(localStorage.getItem('acr_study_lh') || '1.65');
var sbo = true;
var cur = -1;
var vop = false;
var npop = false;
var nvop = false;

document.documentElement.style.setProperty('--lh', lh);

function buildTOC() {
  var sb = document.getElementById('sb');
  var intro = document.createElement('div');
  intro.className = 'sb-intro';
  intro.textContent = '\u{1F4D6} ACR STUDY — 8 VOLUMES';
  sb.appendChild(intro);

  var idx = 0;
  for (var g = 0; g < VOL_GROUPS.length; g++) {
    var group = VOL_GROUPS[g];
    var h = document.createElement('div');
    h.className = 'vol-hdr';
    h.setAttribute('data-vol', group.vol);
    h.textContent = group.title;
    sb.appendChild(h);
    for (var i = 0; i < group.count; i++) {
      var fid = IDS[idx];
      var s = document.createElement('div');
      s.className = 'sec';
      s.setAttribute('data-id', fid);
      s.textContent = LBL[idx];
      (function (capturedFid) {
        s.addEventListener('click', function () { go(capturedFid); });
      })(fid);
      sb.appendChild(s);
      idx++;
    }
  }
}

function applyFontSize() {
  var c = document.getElementById('content');
  if (c) c.style.fontSize = fs + 'pt';
}

function go(fid) {
  var i = IDS.indexOf(fid);
  if (i < 0) return;
  cur = i;

  // Silently fetch and cache the chapter data for quiz engines to use later,
  // but never display raw text — this is a study app, not a reader.
  fetch('../data/' + fid + '.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d) CHAPTER_CACHE[fid] = d; })
    .catch(function () {});

  // Also pre-load curated content
  loadContent(fid);

  // Render the activity card grid
  var h = '<div class="activity-grid-header">' + LBL[i] + '</div>';
  h += '<div class="activity-grid">';
  h += actCard('\u{1F4D6}', 'Chapter Summary', '#2563eb', 'summary', fid);
  h += actCard('\u{1F9E9}', 'Fill in the Blank', '#059669', 'filblank', fid);
  h += actCard('\u270F\uFE0F', 'Multiple Choice', '#7c3aed', 'mc', fid);
  h += actCard('\u{1F0CF}', 'Flashcards', '#d97706', 'flash', fid);
  h += actCard('\u{1F4DA}', 'Key Terms', '#0891b2', 'terms', fid);
  h += actCard('\u2753', 'FAQ', '#ea580c', 'faq', fid);
  h += actCard('\u{1F9E0}', 'Memory Match', '#dc2626', 'memory', fid);
  h += actCard('\u{1F50A}', 'Listen & Learn', '#4f46e5', 'listen', fid);
  h += actCard('\u{1F3C6}', 'Progress', '#b8860b', 'progress', fid);
  h += '</div>';

  document.getElementById('content').innerHTML = h;
  document.getElementById('tb').textContent = LBL[i];
  var secs = document.querySelectorAll('.sec');
  for (var j = 0; j < secs.length; j++) {
    secs[j].classList.toggle('on', secs[j].getAttribute('data-id') === fid);
  }
  try { localStorage.setItem('acr_study_last', fid); } catch (e) {}
  document.getElementById('np-lbl').textContent = 'Notes \u2014 ' + LBL[i];
  document.getElementById('np-ta').value = getNote(fid) || '';
  if (window.innerWidth <= 768) {
    document.getElementById('sb').classList.remove('m');
  }
  window.scrollTo(0, 0);

  // Wire up activity card clicks
  var cards = document.querySelectorAll('.act-card');
  for (var c = 0; c < cards.length; c++) {
    cards[c].addEventListener('click', (function (mode, f) {
      return function () { openActivity(mode, f); };
    })(cards[c].getAttribute('data-mode'), fid));
  }
}

var CHAPTER_CACHE = {};

function actCard(icon, label, color, mode, fid) {
  return '<div class="act-card" data-mode="' + mode + '" style="background:' + color + '">' +
    '<div class="act-icon">' + icon + '</div>' +
    '<div class="act-label">' + label + '</div>' +
    '</div>';
}

function openActivity(mode, fid) {
  if (mode === 'summary') { showStudyMode(fid); return; }
  if (mode === 'terms') { showTermsMode(fid); return; }
  if (mode === 'faq') { showFaqMode(fid); return; }
  if (mode === 'filblank') { showFillBlank(fid); return; }
  // Stub for modes not yet built
  document.getElementById('content').innerHTML =
    '<div class="study-view"><div class="sv-sec">' +
    '<h3>' + mode.charAt(0).toUpperCase() + mode.slice(1) + ' Mode</h3>' +
    '<p class="study-na">This activity is coming soon.</p>' +
    '<button class="study-btn" id="b-back-grid">Back to activities</button>' +
    '</div></div>';
  document.getElementById('b-back-grid').addEventListener('click', function () { go(fid); });
}

// Split-out views for terms and FAQ so they can be opened from the grid
function showTermsMode(fid) {
  loadContent(fid).then(function (data) {
    if (!data) { openActivity('stub', fid); return; }
    var h = '<div class="study-view">';
    h += '<h2 class="sv-title" style="border-left-color:var(--vol6)">Key Terms \u2014 ' + data.label + '</h2>';
    h += '<div class="sv-sec">';
    for (var t = 0; t < data.key_terms.length; t++) {
      var k = data.key_terms[t];
      h += '<div class="sv-term"><strong class="sv-tw">' + k.term + '</strong> ';
      h += '<span class="sv-tp">(' + k.phonetic + ')</span> ';
      h += '<span class="sv-td">' + k.definition + '</span></div>';
    }
    h += '</div><button class="study-btn" id="b-back-grid">Back to activities</button></div>';
    document.getElementById('content').innerHTML = h;
    document.getElementById('b-back-grid').addEventListener('click', function () { go(fid); });
    window.scrollTo(0, 0);
  });
}

function showFaqMode(fid) {
  loadContent(fid).then(function (data) {
    if (!data) { openActivity('stub', fid); return; }
    var h = '<div class="study-view">';
    h += '<h2 class="sv-title" style="border-left-color:var(--vol1)">FAQ \u2014 ' + data.label + '</h2>';
    h += '<div class="sv-sec">';
    for (var f = 0; f < data.faq.length; f++) {
      h += '<div class="sv-faq"><div class="sv-fq">' + data.faq[f].question + '</div>';
      h += '<div class="sv-fa">' + data.faq[f].answer + '</div></div>';
    }
    h += '</div><button class="study-btn" id="b-back-grid">Back to activities</button></div>';
    document.getElementById('content').innerHTML = h;
    document.getElementById('b-back-grid').addEventListener('click', function () { go(fid); });
    window.scrollTo(0, 0);
  });
}

// ---- Minimal TTS helper (full voice reader logic comes later) ----
var ttsVoices = [];
function initTTS() {
  if (!window.speechSynthesis) return;
  ttsVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function () {
    ttsVoices = window.speechSynthesis.getVoices();
  };
}
initTTS();
setTimeout(initTTS, 500);
setTimeout(initTTS, 2000);

function getBestVoice() {
  var saved = localStorage.getItem('acr_study_voice');
  if (saved) {
    for (var i = 0; i < ttsVoices.length; i++) {
      if (ttsVoices[i].name === saved) return ttsVoices[i];
    }
  }
  var enh = ttsVoices.filter(function (v) { return v.name.indexOf('Enhanced') >= 0; });
  if (enh.length) return enh[0];
  var siri = ttsVoices.filter(function (v) { return v.name.indexOf('Siri') >= 0; });
  if (siri.length) return siri[0];
  return ttsVoices[0] || null;
}

function speakText(text) {
  if (!window.speechSynthesis) return;
  try { window.speechSynthesis.resume(); } catch (e) {}
  try { window.speechSynthesis.cancel(); } catch (e) {}
  var u = new SpeechSynthesisUtterance(text);
  u.rate = 1; u.lang = 'en-US'; u.volume = 1;
  var voice = getBestVoice();
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

// ---- Fill in the Blank (cloze deletion) quiz ----
function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

function showFillBlank(fid) {
  loadContent(fid).then(function (data) {
    if (!data || !data.fill_blank || !data.fill_blank.length) {
      openActivity('stub', fid); return;
    }
    var questions = shuffle(data.fill_blank.slice());
    var allAns = data.fill_blank.map(function (q) { return q.answer; });
    var qi = 0, score = 0;

    function renderQ() {
      if (qi >= questions.length) { showResults(); return; }
      var q = questions[qi];
      var correct = q.answer;
      var others = shuffle(allAns.filter(function (a) {
        return a.toLowerCase() !== correct.toLowerCase();
      })).slice(0, 3);
      var opts = shuffle([correct].concat(others));
      var colors = ['#2563eb', '#059669', '#7c3aed', '#d97706'];

      var h = '<div class="cloze-view">';
      h += '<div class="cloze-progress">' + (qi + 1) + ' of ' + questions.length + '</div>';
      h += '<div class="cloze-ref">Bereshit ' + q.ref + '</div>';
      h += '<div class="cloze-prompt">' +
        q.prompt.replace('______', '<span class="cloze-blank">______</span>') + '</div>';
      h += '<button class="cloze-audio" id="b-cloze-hear">\u{1F50A} Listen</button>';
      h += '<div class="cloze-opts">';
      for (var o = 0; o < opts.length; o++) {
        h += '<button class="cloze-opt" data-val="' + opts[o] +
          '" style="background:' + colors[o % 4] + '">' + opts[o] + '</button>';
      }
      h += '</div>';
      h += '<div class="cloze-feedback" id="cloze-fb"></div>';
      h += '</div>';

      document.getElementById('content').innerHTML = h;
      document.getElementById('b-cloze-hear').addEventListener('click', function () {
        speakText(q.source_quote || q.prompt.replace('______', correct));
      });
      var btns = document.querySelectorAll('.cloze-opt');
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
          var val = this.getAttribute('data-val');
          var fb = document.getElementById('cloze-fb');
          if (val.toLowerCase() === correct.toLowerCase()) {
            this.classList.add('cloze-correct');
            fb.innerHTML = '<span class="fb-correct">\u2714 Correct!</span>' +
              '<div class="cloze-source">' + (q.source_quote || '') + '</div>';
            score++;
            var all = document.querySelectorAll('.cloze-opt');
            for (var x = 0; x < all.length; x++) all[x].disabled = true;
            setTimeout(function () { qi++; renderQ(); }, 2200);
          } else {
            this.classList.add('cloze-wrong');
            this.disabled = true;
            fb.innerHTML = '<span class="fb-try">Try another \u2192</span>';
          }
        });
      }
    }

    function showResults() {
      var pct = Math.round(score / questions.length * 100);
      var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
      var msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good work!' : 'Keep studying!';
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">' + emoji + '</div>';
      h += '<div class="cr-score">' + score + ' / ' + questions.length + '</div>';
      h += '<div class="cr-pct">' + pct + '%</div>';
      h += '<div class="cr-msg">' + msg + '</div>';
      h += '<div class="cr-btns">';
      h += '<button class="study-btn sb-pri" id="b-cloze-retry">\u{1F504} Try Again</button>';
      h += '<button class="study-btn" id="b-cloze-back">Back to activities</button>';
      h += '</div></div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-cloze-retry').addEventListener('click', function () { showFillBlank(fid); });
      document.getElementById('b-cloze-back').addEventListener('click', function () { go(fid); });
    }

    renderQ();
  });
}

function goHome() {
  var lastFid = localStorage.getItem('acr_study_last');
  var hasResume = lastFid && IDS.indexOf(lastFid) >= 0;
  var html = '<div id="home">' +
    '<div class="logo">\u{1F4D6}</div>' +
    '<h1>ACR STUDY</h1>' +
    '<p class="tag">Spaced repetition study companion<br>for The Ancient Covenant Record</p>' +
    '<div class="btns">' +
    '<button id="b-begin">Begin with Bereshit \u25B6</button>' +
    (hasResume ? '<button id="b-resume">Resume where I left off</button>' : '') +
    '</div>' +
    '<p class="small">' +
    'Phase 1 \u00B7 Shell + voice + notes<br>' +
    'Data shared with the <a href="../">ACR Reader</a> on this device<br>' +
    'Add to Home Screen from Safari for offline access' +
    '</p>' +
    '</div>';
  document.getElementById('content').innerHTML = html;
  document.getElementById('tb').textContent = 'ACR Study';
  cur = -1;
  var secs = document.querySelectorAll('.sec');
  for (var i = 0; i < secs.length; i++) secs[i].classList.remove('on');
  var bBegin = document.getElementById('b-begin');
  if (bBegin) bBegin.addEventListener('click', function () { go(IDS[0]); });
  var bResume = document.getElementById('b-resume');
  if (bResume) {
    bResume.addEventListener('click', function () {
      var f = localStorage.getItem('acr_study_last');
      if (f && IDS.indexOf(f) >= 0) go(f);
    });
  }
  window.scrollTo(0, 0);
}

// ---- Chapter Breakdown study view ----

function showStudyMode(fid) {
  var i = IDS.indexOf(fid);
  if (i < 0) return;
  loadContent(fid).then(function (data) {
    if (!data) {
      document.getElementById('content').innerHTML =
        '<div class="study-view"><p class="study-na">Study content is not available for this section yet.</p>' +
        '<button class="study-btn" id="b-back-na">Back to reading</button></div>';
      document.getElementById('b-back-na').addEventListener('click', function () { go(fid); });
      return;
    }
    var h = '<div class="study-view">';
    h += '<h2 class="sv-title">' + data.label + '</h2>';
    h += '<div class="sv-sec"><h3>Summary</h3>';
    h += '<div id="sv-plain" class="sv-text">' + data.summary_plain + '</div>';
    h += '<div id="sv-deep" class="sv-text" style="display:none">' + data.summary_scholarly + '</div>';
    h += '<button class="sv-toggle" id="b-sum-toggle">Show deeper summary</button></div>';
    h += '<div class="sv-sec"><h3>Key Terms (' + data.key_terms.length + ')</h3>';
    for (var t = 0; t < data.key_terms.length; t++) {
      var k = data.key_terms[t];
      h += '<div class="sv-term"><strong class="sv-tw">' + k.term + '</strong> ';
      h += '<span class="sv-tp">(' + k.phonetic + ')</span> ';
      h += '<span class="sv-td">' + k.definition + '</span></div>';
    }
    h += '</div>';
    h += '<div class="sv-sec"><h3>Questions &amp; Answers (' + data.faq.length + ')</h3>';
    for (var f = 0; f < data.faq.length; f++) {
      h += '<div class="sv-faq"><div class="sv-fq">' + data.faq[f].question + '</div>';
      h += '<div class="sv-fa">' + data.faq[f].answer + '</div></div>';
    }
    h += '</div>';
    h += '<div class="sv-sec sv-actions"><h3>Practice</h3>';
    h += '<button class="study-btn sb-pri" disabled>Fill in the blank (' + data.fill_blank.length + ')</button>';
    h += '<button class="study-btn sb-pri" disabled>Multiple choice (' + data.multiple_choice.length + ')</button>';
    h += '<button class="study-btn sb-pri" disabled>Flashcards (coming soon)</button>';
    h += '</div>';
    h += '<button class="study-btn" id="b-back-read">Back to activities</button>';
    h += '</div>';
    document.getElementById('content').innerHTML = h;
    document.getElementById('tb').textContent = 'Study \u2014 ' + LBL[i];
    document.getElementById('b-sum-toggle').addEventListener('click', function () {
      var p = document.getElementById('sv-plain');
      var d = document.getElementById('sv-deep');
      if (p.style.display === 'none') { p.style.display = ''; d.style.display = 'none'; this.textContent = 'Show deeper summary'; }
      else { p.style.display = 'none'; d.style.display = ''; this.textContent = 'Show plain summary'; }
    });
    document.getElementById('b-back-read').addEventListener('click', function () { go(fid); });
    window.scrollTo(0, 0);
    window.scrollTo(0, 0);
  });
}

// ---- Curated study content loader ----
// Fetches study/content/file_N.json, caches in-memory per session.
// Returns a Promise that resolves to the content object, or null on failure.

var CONTENT_CACHE = {};

function loadContent(fid) {
  if (CONTENT_CACHE[fid]) return Promise.resolve(CONTENT_CACHE[fid]);
  return fetch('content/' + fid + '.json')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (d) {
      CONTENT_CACHE[fid] = d;
      return d;
    })
    .catch(function () { return null; });
}

// ---- Notes (per section) ----

function getNotes() {
  try { return JSON.parse(localStorage.getItem('acr_study_notes') || '{}'); }
  catch (e) { return {}; }
}
function getNote(fid) { return getNotes()[fid] || ''; }
function saveNote(fid, t) {
  var n = getNotes();
  if (t && t.trim()) n[fid] = t;
  else delete n[fid];
  try { localStorage.setItem('acr_study_notes', JSON.stringify(n)); } catch (e) {}
}

function closeNP() {
  npop = false;
  var np = document.getElementById('np');
  if (np) np.classList.remove('on');
  var bnt = document.getElementById('b-nt');
  if (bnt) bnt.classList.remove('on');
  var main = document.getElementById('main');
  if (main) main.classList.toggle('vopen', vop);
}

function toggleNV() {
  nvop = !nvop;
  var nv = document.getElementById('nv');
  if (nv) nv.classList.toggle('on', nvop);
  var bnv = document.getElementById('b-nv');
  if (bnv) bnv.classList.toggle('on', nvop);
}

function stopVoice() { /* implemented in follow-up commit */ }
function startPlayback() { /* implemented in follow-up commit */ }

// ---- UI bindings ----

function bindUI() {
  document.getElementById('b-sb').addEventListener('click', function () {
    if (window.innerWidth <= 768) {
      document.getElementById('sb').classList.toggle('m');
    } else {
      sbo = !sbo;
      document.getElementById('sb').classList.toggle('h', !sbo);
      document.getElementById('main').classList.toggle('x', !sbo);
    }
  });

  document.getElementById('b-home').addEventListener('click', goHome);
  document.getElementById('tb').addEventListener('click', goHome);
  document.getElementById('tb').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); }
  });

  document.getElementById('b-fs-').addEventListener('click', function () {
    fs = Math.max(8, fs - 1);
    applyFontSize();
    try { localStorage.setItem('acr_study_fs', fs); } catch (e) {}
  });

  document.getElementById('b-fs+').addEventListener('click', function () {
    fs = Math.min(22, fs + 1);
    applyFontSize();
    try { localStorage.setItem('acr_study_fs', fs); } catch (e) {}
  });

  // Notes — per-section textarea, saved under acr_study_notes[fid]
  document.getElementById('b-nt').addEventListener('click', function () {
    npop = !npop;
    document.getElementById('np').classList.toggle('on', npop);
    this.classList.toggle('on', npop);
    document.getElementById('main').classList.toggle('vopen', npop || vop);
    if (npop && cur >= 0) document.getElementById('np-ta').focus();
  });
  document.getElementById('np-cls').addEventListener('click', closeNP);
  document.getElementById('np-save').addEventListener('click', function () {
    if (cur < 0) return;
    saveNote(IDS[cur], document.getElementById('np-ta').value);
    var t = this;
    t.textContent = 'Saved!';
    setTimeout(function () { t.textContent = '\u2713 Save'; }, 1500);
  });
  document.getElementById('np-clr').addEventListener('click', function () {
    document.getElementById('np-ta').value = '';
    if (cur >= 0) saveNote(IDS[cur], '');
  });
  document.getElementById('np-ta').addEventListener('input', function () {
    if (cur >= 0) saveNote(IDS[cur], this.value);
  });

  document.getElementById('b-nv').addEventListener('click', toggleNV);

  // Voice reader — toggle only; speech logic added in follow-up commit
  document.getElementById('b-vt').addEventListener('click', function () {
    vop = !vop;
    document.getElementById('vr').classList.toggle('on', vop);
    document.getElementById('main').classList.toggle('vopen', vop || npop);
    this.classList.toggle('on', vop);
  });
  document.getElementById('b-pl').addEventListener('click', startPlayback);
  document.getElementById('b-pa').addEventListener('click', function () {});
  document.getElementById('b-st').addEventListener('click', stopVoice);
  document.getElementById('b-pv').addEventListener('click', function () {});
  document.getElementById('vs').addEventListener('change', function () {});
  document.getElementById('vc').addEventListener('change', function () {});
  document.getElementById('vm').addEventListener('change', function () {});
}

document.addEventListener('DOMContentLoaded', function () {
  buildTOC();
  bindUI();
  goHome();

  // Font toggle: Atkinson Hyperlegible (default) ↔ OpenDyslexic
  var fontBtn = document.createElement('button');
  fontBtn.className = 'font-toggle-btn';
  fontBtn.textContent = 'Aa';
  fontBtn.title = 'Switch font: Atkinson Hyperlegible / OpenDyslexic';
  fontBtn.setAttribute('aria-label', 'Toggle dyslexic font');
  document.body.appendChild(fontBtn);
  if (localStorage.getItem('acr_study_font') === 'dyslexic') {
    document.body.classList.add('font-dyslexic');
    fontBtn.textContent = 'Dy';
  }
  fontBtn.addEventListener('click', function () {
    var on = document.body.classList.toggle('font-dyslexic');
    this.textContent = on ? 'Dy' : 'Aa';
    try { localStorage.setItem('acr_study_font', on ? 'dyslexic' : 'default'); } catch (e) {}
  });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
