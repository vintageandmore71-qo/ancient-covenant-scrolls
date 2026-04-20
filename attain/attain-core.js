// Attain Universal — Core Module
// State management, localStorage, SM-2 algorithm, utilities

// ---- Cookie Persistence Layer ----
function setCookie(name, value, days) {
  var d = new Date();
  d.setTime(d.getTime() + (days * 86400000));
  document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
}
function getCookie(name) {
  var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}
function saveLibraryToCookies(lib) {
  var slim = lib.map(function (b) {
    return { id: b.id, title: b.title, color: b.color, chapterCount: b.chapterCount, hasTerms: b.hasTerms };
  });
  try { setCookie('attain_lib', JSON.stringify(slim), 365); } catch (e) {}
}
function getLibraryFromCookies() {
  try {
    var data = getCookie('attain_lib');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [];
}

// ---- Book Library ----
function saveLibrary(lib) {
  var json = JSON.stringify(lib);
  // Layer 3: localStorage
  try { localStorage.setItem('attain_library', json); } catch (e) {}
  // Layer 1: Cache Storage backup
  if (window.caches) {
    caches.open(BOOKS_CACHE).then(function (cache) {
      cache.put('attain-library', new Response(json, { headers: { 'Content-Type': 'application/json' } }));
    }).catch(function () {});
  }
  // Layer 4: Cookies (survives Safari ITP purges for up to 1 year)
  saveLibraryToCookies(lib);
}

function getLibrary() {
  // Try localStorage first
  try {
    var data = localStorage.getItem('attain_library');
    if (data) {
      var parsed = JSON.parse(data);
      if (parsed && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [];
}

function getLibraryAsync() {
  var lib = getLibrary();
  if (lib.length > 0) return Promise.resolve(lib);

  // Try cookies (survives Safari purges)
  var cookieLib = getLibraryFromCookies();
  if (cookieLib.length > 0) {
    try { localStorage.setItem('attain_library', JSON.stringify(cookieLib)); } catch (e) {}
    return Promise.resolve(cookieLib);
  }

  // Try Cache Storage
  if (!window.caches) return Promise.resolve([]);
  return caches.open(BOOKS_CACHE).then(function (cache) {
    return cache.match('attain-library');
  }).then(function (response) {
    if (!response) return [];
    return response.json().then(function (data) {
      if (data && data.length > 0) {
        try { localStorage.setItem('attain_library', JSON.stringify(data)); } catch (e) {}
        saveLibraryToCookies(data);
        return data;
      }
      return [];
    });
  }).catch(function () { return []; });
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

// ---- Chapter Content Storage (Multi-layer persistence) ----
// Layer 1: Cache Storage (large quota, survives Safari purges for installed PWAs)
// Layer 2: IndexedDB (structured, good persistence)
// Layer 3: localStorage (small, fast metadata backup)
// Layer 4: Static content/ folder (permanent, deployed files)

var ATTAIN_DB_NAME = 'attain_books';
var ATTAIN_DB_VERSION = 1;
var BOOKS_CACHE = 'attain-books-data';
var MAX_CACHED_BOOKS = 2;

// Request persistent storage on first use
function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then(function (granted) {
      if (granted) console.log('Attain: Persistent storage granted');
    });
  }
}
requestPersistence();

// Check available storage
function checkStorageQuota() {
  if (navigator.storage && navigator.storage.estimate) {
    return navigator.storage.estimate().then(function (est) {
      return { used: est.usage || 0, total: est.quota || 0, available: (est.quota || 0) - (est.usage || 0) };
    });
  }
  return Promise.resolve({ used: 0, total: 0, available: 5000000 });
}

// ---- Cache Storage for book content ----
function saveBookToCache(bookId, chapters) {
  if (!window.caches) return Promise.resolve();
  return caches.open(BOOKS_CACHE).then(function (cache) {
    var data = JSON.stringify(chapters);
    var response = new Response(data, {
      headers: { 'Content-Type': 'application/json', 'X-Book-Id': bookId, 'X-Saved': new Date().toISOString() }
    });
    return cache.put('book/' + bookId, response);
  }).catch(function () {});
}

function loadBookFromCache(bookId) {
  if (!window.caches) return Promise.resolve(null);
  return caches.open(BOOKS_CACHE).then(function (cache) {
    return cache.match('book/' + bookId);
  }).then(function (response) {
    if (!response) return null;
    return response.json();
  }).catch(function () { return null; });
}

function evictOldBooksFromCache() {
  if (!window.caches) return Promise.resolve();
  return caches.open(BOOKS_CACHE).then(function (cache) {
    return cache.keys().then(function (keys) {
      if (keys.length <= MAX_CACHED_BOOKS) return;
      // Evict oldest entries beyond the limit
      var toDelete = keys.slice(0, keys.length - MAX_CACHED_BOOKS);
      return Promise.all(toDelete.map(function (key) { return cache.delete(key); }));
    });
  }).catch(function () {});
}

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
  // Layer 1: Cache Storage (largest, most persistent for PWAs)
  saveBookToCache(bookId, chapters).then(function () {
    evictOldBooksFromCache();
  });
  // Layer 2: IndexedDB
  openDB().then(function (db) {
    if (!db) return;
    try {
      var tx = db.transaction('chapters', 'readwrite');
      var store = tx.objectStore('chapters');
      store.put({ id: bookId, chapters: chapters });
    } catch (e) {}
  }).catch(function () {});
  // Layer 3: localStorage (may fail on large books — that's ok)
  try { localStorage.setItem('attain_ch_' + bookId, JSON.stringify(chapters)); } catch (e) {}
  return Promise.resolve();
}

function loadChaptersDB(bookId) {
  // Try Layer 3 first (localStorage — fastest)
  try {
    var lsData = localStorage.getItem('attain_ch_' + bookId);
    if (lsData) {
      var parsed = JSON.parse(lsData);
      if (parsed && parsed.length > 0) return Promise.resolve(parsed);
    }
  } catch (e) {}

  // Try Layer 1 (Cache Storage — largest, most persistent)
  return loadBookFromCache(bookId).then(function (cached) {
    if (cached && cached.length > 0) {
      // Restore to localStorage for faster next load
      try { localStorage.setItem('attain_ch_' + bookId, JSON.stringify(cached)); } catch (e) {}
      return cached;
    }
    // Try Layer 2 (IndexedDB)
    return openDB().then(function (db) {
      if (!db) return [];
      return new Promise(function (resolve) {
        var tx = db.transaction('chapters', 'readonly');
        var store = tx.objectStore('chapters');
        var req = store.get(bookId);
        req.onsuccess = function () {
          var result = req.result ? req.result.chapters : [];
          if (result.length > 0) {
            // Restore to other layers
            saveBookToCache(bookId, result);
            try { localStorage.setItem('attain_ch_' + bookId, JSON.stringify(result)); } catch (e) {}
          }
          resolve(result);
        };
        req.onerror = function () { resolve([]); };
      });
    });
  }).catch(function () { return []; });
}

function deleteChaptersDB(bookId) {
  // Clean all layers
  try { localStorage.removeItem('attain_ch_' + bookId); } catch (e) {}
  try { localStorage.removeItem('attain_terms_' + bookId); } catch (e) {}
  if (window.caches) {
    caches.open(BOOKS_CACHE).then(function (cache) {
      cache.delete('book/' + bookId);
    }).catch(function () {});
  }
  return openDB().then(function (db) {
    if (!db) return;
    try {
      var tx = db.transaction('chapters', 'readwrite');
      tx.objectStore('chapters').delete(bookId);
    } catch (e) {}
  }).catch(function () {});
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
// ---- Dictation Challenge helpers ----

// Pull N readable sentences (30-140 chars) from chapter paragraphs.
function pickDictationSentences(paragraphs, count) {
  count = count || 8;
  if (!paragraphs || !paragraphs.length) return [];
  var out = [];
  for (var p = 0; p < paragraphs.length && out.length < count * 3; p++) {
    var sents = paragraphs[p].match(/[^.!?]+[.!?]+/g) || [];
    for (var s = 0; s < sents.length; s++) {
      var t = sents[s].trim();
      if (t.length < 30 || t.length > 140) continue;
      // Avoid sentences that are mostly quoted dialogue (hard to dictate)
      if ((t.match(/["\u201C\u201D]/g) || []).length > 2) continue;
      out.push(t);
    }
  }
  // Shuffle and downsample to `count`
  for (var i = out.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out.slice(0, count);
}

// Normalize for comparison: lowercase, strip punctuation, collapse whitespace
function dictationNormalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Compute a 0..1 similarity score between typed text and target.
// Perfect match after normalization = 1.0; otherwise word-overlap ratio.
function dictationScore(typed, target) {
  var a = dictationNormalize(typed);
  var b = dictationNormalize(target);
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  var wa = a.split(' ');
  var wb = b.split(' ');
  var setB = {};
  for (var i = 0; i < wb.length; i++) setB[wb[i]] = (setB[wb[i]] || 0) + 1;
  var matched = 0;
  for (var k = 0; k < wa.length; k++) {
    if (setB[wa[k]] > 0) { matched++; setB[wa[k]]--; }
  }
  var maxLen = Math.max(wa.length, wb.length);
  return maxLen === 0 ? 0 : matched / maxLen;
}

// Render highlighted comparison: correct words green, missing words red.
function dictationCompareHtml(typed, target) {
  var wa = dictationNormalize(typed).split(' ').filter(Boolean);
  var wbOriginal = target.split(/\s+/);
  var wbNorm = wbOriginal.map(dictationNormalize);
  var typedSet = {};
  for (var i = 0; i < wa.length; i++) typedSet[wa[i]] = (typedSet[wa[i]] || 0) + 1;
  var parts = [];
  for (var j = 0; j < wbOriginal.length; j++) {
    var nw = wbNorm[j];
    if (nw && typedSet[nw] > 0) {
      parts.push('<span class="dict-hit">' + wbOriginal[j] + '</span>');
      typedSet[nw]--;
    } else {
      parts.push('<span class="dict-miss">' + wbOriginal[j] + '</span>');
    }
  }
  return parts.join(' ');
}

// ---- Word Morph helpers ----
// Generate 3 "one-letter-off" variants of a word: substitution, insertion,
// deletion. Used by Word Morph to test exact spelling recall of unfamiliar
// names and domain vocabulary.

function wordMorphVariants(word) {
  var w = String(word || '');
  if (w.length < 3) return [];
  var isCap = w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase();
  var lowers = 'abcdefghijklmnopqrstuvwxyz';

  // Preserve casing: compute on lowercase body then re-cap first letter
  var body = w.slice(1).toLowerCase();
  var firstLower = w[0].toLowerCase();

  function restore(variant) {
    if (!variant) return '';
    return (isCap ? variant[0].toUpperCase() : variant[0]) + variant.slice(1);
  }

  // Pick a substitution letter that isn't already in the word at that index
  function randLetterNot(ch) {
    var c = lowers[Math.floor(Math.random() * lowers.length)];
    var guard = 0;
    while (c === ch && guard < 10) { c = lowers[Math.floor(Math.random() * lowers.length)]; guard++; }
    return c;
  }

  var variants = [];
  // Substitution: swap one letter in the body
  var subIdx = Math.floor(Math.random() * (body.length || 1));
  var subVariant = firstLower + body.slice(0, subIdx) + randLetterNot(body[subIdx] || 'e') + body.slice(subIdx + 1);
  variants.push(restore(subVariant));

  // Insertion: add a letter somewhere in the body
  var insIdx = Math.floor(Math.random() * (body.length + 1));
  var insLetter = lowers[Math.floor(Math.random() * lowers.length)];
  var insVariant = firstLower + body.slice(0, insIdx) + insLetter + body.slice(insIdx);
  variants.push(restore(insVariant));

  // Deletion: remove one letter from the body (only if body is long enough)
  if (body.length >= 3) {
    var delIdx = Math.floor(Math.random() * body.length);
    var delVariant = firstLower + body.slice(0, delIdx) + body.slice(delIdx + 1);
    variants.push(restore(delVariant));
  } else {
    // Fallback: another substitution with a different index
    var altIdx = (subIdx + 1) % (body.length || 1);
    var altVariant = firstLower + body.slice(0, altIdx) + randLetterNot(body[altIdx] || 'a') + body.slice(altIdx + 1);
    variants.push(restore(altVariant));
  }

  // Dedup against original and each other; return unique non-matching variants
  var out = [];
  var seen = {};
  seen[w.toLowerCase()] = true;
  for (var i = 0; i < variants.length; i++) {
    var v = variants[i];
    var key = v.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    out.push(v);
  }
  return out;
}

// ---- Remix Queue ----
// Tracks every question a user misses. At round end, the Remix card
// resurfaces each item in the OPPOSITE game format so the user gets
// another chance without repeating the exact same experience. Cleared
// only when the remixed version is answered correctly.

function getRemixQueue() {
  try { return JSON.parse(localStorage.getItem('attain_remix_queue') || '[]'); }
  catch (e) { return []; }
}
function saveRemixQueue(q) {
  try { localStorage.setItem('attain_remix_queue', JSON.stringify(q || [])); }
  catch (e) {}
}
function remixKey(item) {
  return item.bookId + ':' + item.chIdx + '|' + item.missedInMode +
    '|' + (item.ref || '') + '|' + ((item.prompt || item.question || '').slice(0, 60));
}
function pushToRemixQueue(item) {
  if (!item || !item.bookId || !item.missedInMode) return;
  var q = getRemixQueue();
  var key = remixKey(item);
  for (var i = 0; i < q.length; i++) {
    if (remixKey(q[i]) === key) return;
  }
  item.missedAt = new Date().toISOString();
  q.push(item);
  if (q.length > 200) q = q.slice(-200);
  saveRemixQueue(q);
}
function removeFromRemixQueue(item) {
  var q = getRemixQueue();
  var key = remixKey(item);
  var out = [];
  for (var i = 0; i < q.length; i++) {
    if (remixKey(q[i]) !== key) out.push(q[i]);
  }
  saveRemixQueue(out);
}
function getRemixCount(bookId, chIdx) {
  var q = getRemixQueue();
  if (!bookId) return q.length;
  var n = 0;
  for (var i = 0; i < q.length; i++) {
    if (q[i].bookId !== bookId) continue;
    if (chIdx !== undefined && chIdx !== null && q[i].chIdx !== chIdx) continue;
    n++;
  }
  return n;
}

// ---- Hint Ladder ----
// Three progressive hints per question. XP multiplier reduces as hints
// are used: 0 hints = 1.0, 1 = 0.7, 2 = 0.4, 3 = 0.1. Full answer is
// never auto-revealed — user must still submit a final guess.

function blankedReveal(answer) {
  if (!answer) return '';
  var a = String(answer);
  if (a.length <= 2) return a.toUpperCase();
  var out = a[0].toUpperCase();
  for (var i = 1; i < a.length - 1; i++) {
    out += (a[i] === ' ' ? '  ' : ' _');
  }
  out += ' ' + a[a.length - 1].toUpperCase();
  return out;
}

function buildHintLadder(answer, passage) {
  var a = String(answer || '').trim();
  var wordCount = a ? a.split(/\s+/).length : 0;
  var lenLabel = wordCount > 1
    ? (wordCount + ' words, starts with "' + a.charAt(0).toUpperCase() + '"')
    : ('Starts with "' + a.charAt(0).toUpperCase() + '", ' + a.length + ' letters');
  return [
    '\u{1F4A1} ' + lenLabel,
    passage ? '\u{1F4D6} "' + String(passage).trim() + '"' : '\u{1F4D6} No passage available for this question.',
    '\u{1F521} ' + blankedReveal(a)
  ];
}

function hintMultiplier(hintsUsed) {
  if (hintsUsed <= 0) return 1.0;
  if (hintsUsed === 1) return 0.7;
  if (hintsUsed === 2) return 0.4;
  return 0.1;
}

function wireHintLadder(btnId, displayId, answer, passage, onUse) {
  var btn = document.getElementById(btnId);
  var disp = document.getElementById(displayId);
  if (!btn || !disp) return;
  var stages = buildHintLadder(answer, passage);
  var labels = ['\u{1F4A1} Hint', '\u{1F4D6} Show passage', '\u{1F521} Reveal pattern'];
  var used = 0;
  btn.addEventListener('click', function () {
    if (used >= 3) return;
    disp.innerHTML = '<div class="hint-stage hint-stage-' + (used + 1) + '">' + stages[used] + '</div>';
    used++;
    if (used < 3) { btn.innerHTML = labels[used]; }
    else { btn.innerHTML = '\u2714 Hints used'; btn.disabled = true; }
    if (typeof onUse === 'function') onUse(used);
  });
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
