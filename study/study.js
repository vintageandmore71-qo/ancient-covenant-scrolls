// ACR Study — Phase 1 shell
// Loads chapter JSON from the reader's /data/ folder (same origin, sibling path).
// Settings namespaced under acr_study_* so they never collide with reader state.

// Volumes 1-7 + War Scroll 1QM, per Phase 1 scope.
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
  "Yovelim (Jubilees) — Part 1 — Chapters 1–25",
  "Yovelim (Jubilees) — Part 2 — Chapters 26–50",
  'War Scroll 1QM — Complete — All 19 Columns'
];

var VOL_GROUPS = [
  { title: 'Vol 1 — Bereshit', count: 4 },
  { title: 'Vol 2 — Shemot', count: 2 },
  { title: 'Vol 3 — Vayikra', count: 2 },
  { title: 'Vol 4 — Bamidbar', count: 2 },
  { title: 'Vol 5 — Devarim', count: 2 },
  { title: 'Vol 6 — Chanokh', count: 3 },
  { title: "Vol 7 — Yovelim", count: 2 },
  { title: 'Vol 33 — War Scroll 1QM', count: 1 }
];

// Settings with localStorage persistence (acr_study_* prefix)
// Default theme is 'white' (no body class) — study mode should be bright.
var fs = parseFloat(localStorage.getItem('acr_study_fs') || '10.5');
var lh = parseFloat(localStorage.getItem('acr_study_lh') || '1.65');
var theme = localStorage.getItem('acr_study_theme') || 'white';
var sbo = true;
var cur = -1;

document.documentElement.style.setProperty('--lh', lh);
if (theme === 'sepia') document.body.classList.add('sepia');
else if (theme === 'dark') document.body.classList.add('dark');

function buildTOC() {
  var sb = document.getElementById('sb');
  // Intro label
  var intro = document.createElement('div');
  intro.className = 'sb-intro';
  intro.textContent = '\u{1F4D6} ACR STUDY — 8 VOLUMES';
  sb.appendChild(intro);

  var idx = 0;
  for (var g = 0; g < VOL_GROUPS.length; g++) {
    var group = VOL_GROUPS[g];
    var h = document.createElement('div');
    h.className = 'vol-hdr';
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
  content.innerHTML =
    '<div class="loading">Loading ' + LBL[i] + '…</div>';

  // Fetch from ../data/file_N.json — sibling folder in the reader repo.
  fetch('../data/' + fid + '.json')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (d) {
      content.innerHTML = d.html;
      applyFontSize();
      document.getElementById('tb').textContent = LBL[i];
      var secs = document.querySelectorAll('.sec');
      for (var j = 0; j < secs.length; j++) {
        secs[j].classList.toggle(
          'on',
          secs[j].getAttribute('data-id') === fid
        );
      }
      try { localStorage.setItem('acr_study_last', fid); } catch (e) {}
      if (window.innerWidth <= 768) {
        document.getElementById('sb').classList.remove('m');
      }
      window.scrollTo(0, 0);
    })
    .catch(function (e) {
      content.innerHTML =
        '<div class="err">Could not load section: ' + e.message +
        '<br><br>Check your connection and tap the section again.</div>';
    });
}

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

  document.getElementById('b-theme').addEventListener('click', function () {
    var b = document.body;
    // Cycle: white (default) -> sepia -> dark -> white
    if (b.classList.contains('sepia')) {
      b.classList.remove('sepia');
      b.classList.add('dark');
      theme = 'dark';
    } else if (b.classList.contains('dark')) {
      b.classList.remove('dark');
      theme = 'white';
    } else {
      b.classList.add('sepia');
      theme = 'sepia';
    }
    try { localStorage.setItem('acr_study_theme', theme); } catch (e) {}
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

  var bBegin = document.getElementById('b-begin');
  if (bBegin) bBegin.addEventListener('click', function () { go(IDS[0]); });

  var bResume = document.getElementById('b-resume');
  var lastFid = localStorage.getItem('acr_study_last');
  if (bResume && lastFid && IDS.indexOf(lastFid) >= 0) {
    bResume.style.display = 'inline-block';
    bResume.addEventListener('click', function () { go(lastFid); });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  buildTOC();
  bindUI();
});

// Service worker registration. Failures are silent — the app still works
// online without it.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
