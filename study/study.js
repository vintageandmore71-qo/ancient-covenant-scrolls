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

  var content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading ' + LBL[i] + '…</div>';

  fetch('../data/' + fid + '.json')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (d) {
      content.innerHTML =
        '<div class="study-banner"><button class="study-btn sb-pri" id="b-study-sec">' +
        '\u{1F4D6} Study this section</button></div>' + d.html;
      applyFontSize();
      var bStudy = document.getElementById('b-study-sec');
      if (bStudy) bStudy.addEventListener('click', function () { showStudyMode(fid); });
      document.getElementById('tb').textContent = LBL[i];
      var secs = document.querySelectorAll('.sec');
      for (var j = 0; j < secs.length; j++) {
        secs[j].classList.toggle('on', secs[j].getAttribute('data-id') === fid);
      }
      try { localStorage.setItem('acr_study_last', fid); } catch (e) {}
      // Load any saved note for this section into the notes textarea
      document.getElementById('np-lbl').textContent = 'Notes — ' + LBL[i];
      document.getElementById('np-ta').value = getNote(fid) || '';
      if (window.innerWidth <= 768) {
        document.getElementById('sb').classList.remove('m');
      }
      window.scrollTo(0, 0);
    })
    .catch(function (e) {
      content.innerHTML = '<div class="err">Could not load section: ' + e.message + '</div>';
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
    h += '<button class="study-btn" id="b-back-read">Back to reading</button>';
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
