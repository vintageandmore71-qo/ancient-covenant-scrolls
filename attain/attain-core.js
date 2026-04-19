// Attain Universal — Core Module
// State management, localStorage, SM-2 algorithm, utilities

// ---- Book Library ----
function getLibrary() {
  try { return JSON.parse(localStorage.getItem('attain_library') || '[]'); } catch (e) { return []; }
}
function saveLibrary(lib) {
  try {
    var json = JSON.stringify(lib);
    localStorage.setItem('attain_library', json);
    // Verify it saved
    var check = localStorage.getItem('attain_library');
    if (!check || check.length < 3) {
      alert('Warning: Book library failed to save. Your browser may be in Private Browsing mode or storage is full.');
    }
  } catch (e) {
    alert('Storage error: ' + e.message + '. Books cannot be saved in Private Browsing mode.');
  }
}
function getBook(bookId) {
  var lib = getLibrary();
  for (var i = 0; i < lib.length; i++) {
    if (lib[i].id === bookId) {
      var book = lib[i];
      if (book.hasTerms && (!book.keyTerms || !book.keyTerms.length)) {
        book.keyTerms = getBookTerms(bookId);
      }
      return book;
    }
  }
  return null;
}
function saveBook(book) {
  // Store key terms separately to keep library small
  if (book.keyTerms && book.keyTerms.length > 0) {
    try { localStorage.setItem('attain_terms_' + book.id, JSON.stringify(book.keyTerms)); } catch (e) {}
  }
  // Save a lightweight version to the library
  var lightweight = {};
  for (var k in book) {
    if (k !== 'keyTerms') lightweight[k] = book[k];
  }
  lightweight.hasTerms = !!(book.keyTerms && book.keyTerms.length > 0);
  var lib = getLibrary();
  var found = false;
  for (var i = 0; i < lib.length; i++) {
    if (lib[i].id === book.id) { lib[i] = lightweight; found = true; break; }
  }
  if (!found) lib.push(lightweight);
  saveLibrary(lib);
}
function getBookTerms(bookId) {
  try { return JSON.parse(localStorage.getItem('attain_terms_' + bookId) || '[]'); } catch (e) { return []; }
}
function deleteBook(bookId) {
  var lib = getLibrary().filter(function (b) { return b.id !== bookId; });
  saveLibrary(lib);
  // Clean up associated data
  var cards = getCards();
  var cleaned = {};
  for (var id in cards) {
    if (cards[id].bookId !== bookId) cleaned[id] = cards[id];
  }
  saveCards(cleaned);
  var m = getQuizMastery();
  var cleanedM = {};
  for (var key in m) {
    if (key.indexOf(bookId + ':') !== 0) cleanedM[key] = m[key];
  }
  saveQuizMastery(cleanedM);
}
function generateBookId() {
  return 'book_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

// Book schema:
// {
//   id: string,
//   title: string,
//   color: string (hex),
//   dateAdded: ISO string,
//   chapters: [{ title: string, paragraphs: [string] }],
//   keyTerms: [{ term: string, frequency: number, definition: string }],
//   totalParagraphs: number
// }

// ---- Chapter Content Storage (IndexedDB for large books) ----
var ATTAIN_DB_NAME = 'attain_books';
var ATTAIN_DB_VERSION = 1;

function openDB() {
  return new Promise(function (resolve, reject) {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    var req = indexedDB.open(ATTAIN_DB_NAME, ATTAIN_DB_VERSION);
    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('chapters')) {
        db.createObjectStore('chapters', { keyPath: 'id' });
      }
    };
    req.onsuccess = function (e) { resolve(e.target.result); };
    req.onerror = function () { resolve(null); };
  });
}

function saveChaptersDB(bookId, chapters) {
  // Always save to localStorage as reliable backup
  try { localStorage.setItem('attain_ch_' + bookId, JSON.stringify(chapters)); } catch (e) {}
  return openDB().then(function (db) {
    if (!db) return;
    return new Promise(function (resolve) {
      var tx = db.transaction('chapters', 'readwrite');
      var store = tx.objectStore('chapters');
      store.put({ id: bookId, chapters: chapters });
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { resolve(); };
    });
  }).catch(function () {});
}

function loadChaptersDB(bookId) {
  // Try localStorage first — it's the most reliable on Safari/iOS
  try {
    var lsData = localStorage.getItem('attain_ch_' + bookId);
    if (lsData) {
      var parsed = JSON.parse(lsData);
      if (parsed && parsed.length > 0) return Promise.resolve(parsed);
    }
  } catch (e) {}
  // Then try IndexedDB
  return openDB().then(function (db) {
    if (!db) return [];
    return new Promise(function (resolve) {
      var tx = db.transaction('chapters', 'readonly');
      var store = tx.objectStore('chapters');
      var req = store.get(bookId);
      req.onsuccess = function () {
        resolve(req.result ? req.result.chapters : []);
      };
      req.onerror = function () { resolve([]); };
    });
  });
}

function deleteChaptersDB(bookId) {
  return openDB().then(function (db) {
    if (!db) {
      try { localStorage.removeItem('attain_ch_' + bookId); } catch (e) {}
      return;
    }
    return new Promise(function (resolve) {
      var tx = db.transaction('chapters', 'readwrite');
      tx.objectStore('chapters').delete(bookId);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { resolve(); };
    });
  });
}

// ---- Active Book State ----
var activeBookId = null;
var activeChapterIdx = 0;
var activeChapters = [];

function setActiveBook(bookId) {
  activeBookId = bookId;
  activeChapterIdx = 0;
  localStorage.setItem('attain_active_book', bookId);
  return loadChaptersDB(bookId).then(function (ch) {
    activeChapters = ch || [];
    return ch;
  });
}

function getActiveBook() {
  if (!activeBookId) {
    activeBookId = localStorage.getItem('attain_active_book') || null;
  }
  return activeBookId ? getBook(activeBookId) : null;
}

// ---- SM-2 Spaced Repetition Algorithm ----
function getCards() {
  try { return JSON.parse(localStorage.getItem('attain_cards') || '{}'); } catch (e) { return {}; }
}
function saveCards(cards) {
  try { localStorage.setItem('attain_cards', JSON.stringify(cards)); } catch (e) {}
}

function sm2(card, quality) {
  var c = {};
  for (var k in card) c[k] = card[k];
  if (quality < 3) {
    c.reps = 0;
    c.interval = 1;
  } else {
    if (c.reps === 0) c.interval = 1;
    else if (c.reps === 1) c.interval = 6;
    else c.interval = Math.round(c.interval * c.ease);
    c.reps++;
  }
  c.ease = c.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (c.ease < 1.3) c.ease = 1.3;
  var next = new Date();
  next.setDate(next.getDate() + c.interval);
  c.nextReview = next.toISOString().slice(0, 10);
  return c;
}

function getOrCreateCard(bookId, chIdx, front, back, type) {
  var cards = getCards();
  var id = bookId + ':' + chIdx + ':' + front.slice(0, 40);
  if (cards[id]) return cards[id];
  var card = {
    id: id, bookId: bookId, chIdx: chIdx,
    front: front, back: back, type: type || 'term',
    ease: 2.5, interval: 1, reps: 0,
    nextReview: new Date().toISOString().slice(0, 10)
  };
  cards[id] = card;
  saveCards(cards);
  return card;
}

function updateCard(card) {
  var cards = getCards();
  cards[card.id] = card;
  saveCards(cards);
}

function getDueCards(bookId) {
  var cards = getCards();
  var today = new Date().toISOString().slice(0, 10);
  var due = [];
  for (var id in cards) {
    if (cards[id].bookId === bookId && cards[id].nextReview <= today) {
      due.push(cards[id]);
    }
  }
  due.sort(function (a, b) { return a.ease - b.ease; });
  return due;
}

function getAllDueCount() {
  var cards = getCards();
  var today = new Date().toISOString().slice(0, 10);
  var count = 0;
  for (var id in cards) {
    if (cards[id].nextReview <= today) count++;
  }
  return count;
}

function getAllDueCards() {
  var cards = getCards();
  var today = new Date().toISOString().slice(0, 10);
  var due = [];
  for (var id in cards) {
    if (cards[id].nextReview <= today) due.push(cards[id]);
  }
  due.sort(function (a, b) { return a.ease - b.ease; });
  return due;
}

// ---- Question Mastery Tracking ----
function getQuizMastery() {
  try { return JSON.parse(localStorage.getItem('attain_qmastery') || '{}'); } catch (e) { return {}; }
}
function saveQuizMastery(m) {
  try { localStorage.setItem('attain_qmastery', JSON.stringify(m)); } catch (e) {}
}
function recordQuestionResult(bookId, chIdx, mode, qIndex, correct) {
  var m = getQuizMastery();
  var key = bookId + ':' + chIdx + ':' + mode + ':' + qIndex;
  if (!m[key]) m[key] = { correct: 0, attempts: 0, mastered: false };
  m[key].attempts++;
  if (correct) m[key].correct++;
  if (m[key].correct >= 3) m[key].mastered = true;
  saveQuizMastery(m);
}
function getChapterMastery(bookId, chIdx) {
  var m = getQuizMastery();
  var prefix = bookId + ':' + chIdx + ':';
  var total = 0, mastered = 0;
  for (var key in m) {
    if (key.indexOf(prefix) === 0) {
      total++;
      if (m[key].mastered) mastered++;
    }
  }
  if (total === 0) return { total: 0, mastered: 0, pct: 0, badge: '' };
  var pct = Math.round(mastered / total * 100);
  var badge = pct >= 100 ? '\u{1F947}' : pct >= 80 ? '\u{1F948}' : pct >= 50 ? '\u{1F949}' : '';
  return { total: total, mastered: mastered, pct: pct, badge: badge };
}
function getDifficultyTier(bookId, chIdx) {
  var m = getChapterMastery(bookId, chIdx);
  if (m.pct >= 80) return 'hard';
  if (m.pct >= 40) return 'medium';
  return 'easy';
}

// ---- XP, Streak & Level System ----
var LEVELS = [
  { name: 'Seeker', icon: '\u{1F50D}', xp: 0 },
  { name: 'Scholar', icon: '\u{1F4DC}', xp: 100 },
  { name: 'Architect', icon: '\u{1F3D7}\uFE0F', xp: 300 },
  { name: 'Guardian', icon: '\u{1F6E1}\uFE0F', xp: 700 },
  { name: 'Master', icon: '\u{1F3C6}', xp: 1500 }
];

function getStats() {
  try { return JSON.parse(localStorage.getItem('attain_stats') || '{}'); } catch (e) { return {}; }
}
function saveStats(s) {
  try { localStorage.setItem('attain_stats', JSON.stringify(s)); } catch (e) {}
}
function recordSession(bookId, chIdx, mode, score, total) {
  var s = getStats();
  if (!s.sessions) s.sessions = [];
  s.sessions.push({
    bookId: bookId, chIdx: chIdx, mode: mode,
    score: score, total: total,
    date: new Date().toISOString().slice(0, 10)
  });
  if (s.sessions.length > 200) s.sessions = s.sessions.slice(-200);
  var xpEarned = Math.round(score * 10);
  s.xp = (s.xp || 0) + xpEarned;
  updateStreak(s);
  saveStats(s);
  return xpEarned;
}
function updateStreak(s) {
  var today = new Date().toISOString().slice(0, 10);
  if (s.lastStudyDate === today) return;
  if (!s.lastStudyDate) {
    s.streak = 1;
  } else {
    var last = new Date(s.lastStudyDate);
    var now = new Date(today);
    var diff = Math.round((now - last) / 86400000);
    s.streak = diff === 1 ? (s.streak || 0) + 1 : 1;
  }
  s.lastStudyDate = today;
  if (!s.bestStreak || s.streak > s.bestStreak) s.bestStreak = s.streak;
}
function getLevel(xp) {
  var lvl = LEVELS[0];
  for (var i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) { lvl = LEVELS[i]; break; }
  }
  var nextIdx = LEVELS.indexOf(lvl) + 1;
  var next = nextIdx < LEVELS.length ? LEVELS[nextIdx] : null;
  return { current: lvl, next: next };
}

// ---- Notes ----
function getNotes() {
  try { return JSON.parse(localStorage.getItem('attain_notes') || '{}'); } catch (e) { return {}; }
}
function getNote(bookId, chIdx) {
  var n = getNotes();
  return n[bookId + ':' + chIdx] || '';
}
function saveNote(bookId, chIdx, text) {
  var n = getNotes();
  var key = bookId + ':' + chIdx;
  if (text && text.trim()) n[key] = text;
  else delete n[key];
  try { localStorage.setItem('attain_notes', JSON.stringify(n)); } catch (e) {}
}

// ---- Full Sync Export/Import (includes book content) ----
function exportFullSync() {
  var lib = getLibrary();
  var chaptersData = {};
  var termsData = {};

  for (var i = 0; i < lib.length; i++) {
    var bookId = lib[i].id;
    try {
      var ch = localStorage.getItem('attain_ch_' + bookId);
      if (ch) chaptersData[bookId] = JSON.parse(ch);
    } catch (e) {}
    try {
      var terms = localStorage.getItem('attain_terms_' + bookId);
      if (terms) termsData[bookId] = JSON.parse(terms);
    } catch (e) {}
  }

  var data = {
    version: 2,
    app: 'attain-full-sync',
    exportDate: new Date().toISOString(),
    library: lib,
    chapters: chaptersData,
    keyTerms: termsData,
    stats: getStats(),
    cards: getCards(),
    quizMastery: getQuizMastery(),
    notes: getNotes()
  };

  var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'attain-sync-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return data;
}

function importFullSync(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var data = JSON.parse(ev.target.result);
        if (!data.app || (data.app !== 'attain-full-sync' && data.app !== 'attain')) {
          reject(new Error('Not a valid Attain sync file'));
          return;
        }

        // Restore library
        if (data.library && data.library.length > 0) {
          var currentLib = getLibrary();
          var existingIds = currentLib.map(function (b) { return b.id; });
          for (var i = 0; i < data.library.length; i++) {
            if (existingIds.indexOf(data.library[i].id) < 0) {
              currentLib.push(data.library[i]);
            }
          }
          saveLibrary(currentLib);
        }

        // Restore chapters
        if (data.chapters) {
          for (var bookId in data.chapters) {
            try {
              localStorage.setItem('attain_ch_' + bookId, JSON.stringify(data.chapters[bookId]));
            } catch (e) {}
            // Also save to IndexedDB
            saveChaptersDB(bookId, data.chapters[bookId]);
          }
        }

        // Restore key terms
        if (data.keyTerms) {
          for (var tid in data.keyTerms) {
            try {
              localStorage.setItem('attain_terms_' + tid, JSON.stringify(data.keyTerms[tid]));
            } catch (e) {}
          }
        }

        // Restore stats (merge — keep higher values)
        if (data.stats) {
          var current = getStats();
          data.stats.xp = Math.max(current.xp || 0, data.stats.xp || 0);
          data.stats.bestStreak = Math.max(current.bestStreak || 0, data.stats.bestStreak || 0);
          var cs = current.sessions || [];
          var is = data.stats.sessions || [];
          data.stats.sessions = cs.concat(is).slice(-200);
          saveStats(data.stats);
        }

        // Restore cards (keep more practiced version)
        if (data.cards) {
          var cc = getCards();
          for (var cid in data.cards) {
            if (!cc[cid] || data.cards[cid].reps > (cc[cid].reps || 0)) cc[cid] = data.cards[cid];
          }
          saveCards(cc);
        }

        // Restore mastery
        if (data.quizMastery) {
          var cm = getQuizMastery();
          for (var key in data.quizMastery) {
            if (!cm[key] || data.quizMastery[key].correct > (cm[key].correct || 0)) cm[key] = data.quizMastery[key];
          }
          saveQuizMastery(cm);
        }

        // Restore notes
        if (data.notes) {
          var cn = getNotes();
          for (var nk in data.notes) {
            if (!cn[nk]) cn[nk] = data.notes[nk];
          }
          try { localStorage.setItem('attain_notes', JSON.stringify(cn)); } catch (e) {}
        }

        var bookCount = data.library ? data.library.length : 0;
        resolve('Synced ' + bookCount + ' books with all progress');
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}
function exportProgress() {
  var data = {
    version: 1,
    app: 'attain',
    exportDate: new Date().toISOString(),
    library: getLibrary(),
    stats: getStats(),
    cards: getCards(),
    quizMastery: getQuizMastery(),
    notes: getNotes()
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'attain-progress-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var imported = JSON.parse(ev.target.result);
        if (!imported.version || imported.app !== 'attain') {
          reject(new Error('Invalid file — not an Attain export'));
          return;
        }
        if (imported.stats) {
          var current = getStats();
          imported.stats.xp = Math.max(current.xp || 0, imported.stats.xp || 0);
          imported.stats.bestStreak = Math.max(current.bestStreak || 0, imported.stats.bestStreak || 0);
          var cs = current.sessions || [];
          var is = imported.stats.sessions || [];
          imported.stats.sessions = cs.concat(is).slice(-200);
          saveStats(imported.stats);
        }
        if (imported.cards) {
          var cc = getCards();
          for (var id in imported.cards) {
            if (!cc[id] || imported.cards[id].reps > (cc[id].reps || 0)) cc[id] = imported.cards[id];
          }
          saveCards(cc);
        }
        if (imported.quizMastery) {
          var cm = getQuizMastery();
          for (var key in imported.quizMastery) {
            if (!cm[key] || imported.quizMastery[key].correct > (cm[key].correct || 0)) cm[key] = imported.quizMastery[key];
          }
          saveQuizMastery(cm);
        }
        if (imported.notes) {
          var cn = getNotes();
          for (var nk in imported.notes) {
            if (!cn[nk]) cn[nk] = imported.notes[nk];
          }
          try { localStorage.setItem('attain_notes', JSON.stringify(cn)); } catch (e) {}
        }
        resolve('Progress imported successfully');
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

// ---- Utilities ----
function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

var BOOK_COLORS = [
  '#2563eb', '#dc2626', '#059669', '#d97706',
  '#7c3aed', '#0891b2', '#ea580c', '#b8860b',
  '#e91e90', '#16a34a', '#6d28d9', '#0ea5e9'
];

function assignBookColor(index) {
  return BOOK_COLORS[index % BOOK_COLORS.length];
}

// ---- TTS ----
var ttsVoices = [];
function loadVoices() {
  if (!window.speechSynthesis) return;
  ttsVoices = speechSynthesis.getVoices();
  if (!ttsVoices.length) {
    speechSynthesis.onvoiceschanged = function () {
      ttsVoices = speechSynthesis.getVoices();
    };
  }
}
loadVoices();

function getBestVoice() {
  if (!ttsVoices.length) loadVoices();
  var saved = localStorage.getItem('attain_voice');
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

function stopSpeech() {
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
}

// ---- Built-in Books (from content/ folder) ----
function loadBuiltInBooks() {
  return fetch('content/index.json').then(function (r) {
    if (!r.ok) return [];
    return r.json();
  }).then(function (fileList) {
    if (!fileList || !fileList.length) return [];
    var loaded = [];
    var promises = fileList.map(function (filename) {
      return fetch('content/' + filename).then(function (r) {
        if (!r.ok) return null;
        return r.json();
      }).then(function (bookData) {
        if (!bookData || !bookData.id) return;
        // Check if this book is already in the library
        var existing = getBook(bookData.id);
        if (existing) return;
        // Save the book to library
        var book = {
          id: bookData.id,
          title: bookData.title || filename,
          color: bookData.color || assignBookColor(getLibrary().length),
          dateAdded: bookData.dateAdded || new Date().toISOString(),
          chapterCount: bookData.chapters ? bookData.chapters.length : 0,
          keyTerms: bookData.keyTerms || [],
          totalParagraphs: bookData.totalParagraphs || 0,
          builtIn: true
        };
        saveBook(book);
        // Save chapters
        if (bookData.chapters && bookData.chapters.length > 0) {
          try { localStorage.setItem('attain_ch_' + book.id, JSON.stringify(bookData.chapters)); } catch (e) {}
          saveChaptersDB(book.id, bookData.chapters);
        }
        loaded.push(book.title);
      }).catch(function () {});
    });
    return Promise.all(promises).then(function () { return loaded; });
  }).catch(function () { return []; });
}

function exportAsBuiltIn(bookId) {
  var book = getBook(bookId);
  if (!book) return;
  return loadChaptersDB(bookId).then(function (chapters) {
    var data = {
      id: bookId,
      title: book.title,
      color: book.color,
      dateAdded: book.dateAdded,
      chapters: chapters,
      keyTerms: book.keyTerms || getBookTerms(bookId),
      totalParagraphs: book.totalParagraphs || 0
    };
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var safeName = book.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    a.download = safeName + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
