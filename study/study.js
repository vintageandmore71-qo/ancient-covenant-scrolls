// ACR Study — Phase 1.5 stub
// Shell + navigation + TOC + font controls.
// Voice reader and notes panels are wired up to empty handlers here;
// actual logic lands in follow-up commits one function at a time.

// All 46 volumes / 111 sections matching the ACR reader
var IDS=[];for(var _i=1;_i<=111;_i++)IDS.push('file_'+_i);

var LBL = [
'Bereshit (Genesis) \u2014 Part 1 \u2014 Ch 1\u201311',
'Bereshit (Genesis) \u2014 Part 2 \u2014 Ch 12\u201325',
'Bereshit (Genesis) \u2014 Part 3 \u2014 Ch 26\u201336',
'Bereshit (Genesis) \u2014 Part 4 \u2014 Ch 37\u201350',
'Shemot (Exodus) \u2014 Part 1 \u2014 Ch 1\u201318',
'Shemot (Exodus) \u2014 Part 2 \u2014 Ch 19\u201340',
'Vayikra (Leviticus) \u2014 Part 1 \u2014 Ch 1\u201316',
'Vayikra (Leviticus) \u2014 Part 2 \u2014 Ch 17\u201327',
'Bamidbar (Numbers) \u2014 Part 1 \u2014 Ch 1\u201319',
'Bamidbar (Numbers) \u2014 Part 2 \u2014 Ch 20\u201336',
'Devarim (Deuteronomy) \u2014 Part 1 \u2014 Ch 1\u201317',
'Devarim (Deuteronomy) \u2014 Part 2 \u2014 Ch 18\u201334',
'Chanokh (Book of Chanokh) \u2014 Part 1 \u2014 Ch 1\u201336 \u2014 Book of the Watchers',
'Chanokh (Book of Chanokh) \u2014 Part 2 \u2014 Ch 37\u201355 \u2014 Astronomical and Dream Visions',
'Chanokh (Book of Chanokh) \u2014 Part 3 \u2014 Ch 56\u201373 \u2014 Epistle',
'Yovelim (Jubilees) \u2014 Part 1 \u2014 Ch 1\u201325',
'Yovelim (Jubilees) \u2014 Part 2 \u2014 Ch 26\u201350',
'Book of Giants (Sefer HaNephilim) \u2014 Complete \u2014 Fragments 1\u20136',
'Visions of Amram (4QAmram) \u2014 Complete',
'Yehoshua (Joshua) \u2014 Part 1 \u2014 Ch 1\u20138',
'Yehoshua (Joshua) \u2014 Part 2 \u2014 Ch 9\u201315',
'Yehoshua (Joshua) \u2014 Part 3 \u2014 Ch 16\u201324',
'Shofetim (Judges) \u2014 Part 1 \u2014 Ch 1\u20137',
'Shofetim (Judges) \u2014 Part 2 \u2014 Ch 8\u201314',
'Shofetim (Judges) \u2014 Part 3 \u2014 Ch 15\u201321',
"Shemu\'el Aleph (1 Samuel) \u2014 Part 1 \u2014 Ch 1\u201310",
"Shemu\'el Aleph (1 Samuel) \u2014 Part 2 \u2014 Ch 11\u201317",
"Shemu\'el Aleph (1 Samuel) \u2014 Part 3 \u2014 Ch 18\u201324",
"Shemu\'el Aleph (1 Samuel) \u2014 Part 4 \u2014 Ch 25\u201331",
"Shemu\'el Bet (2 Samuel) \u2014 Part 1 \u2014 Ch 1\u20136",
"Shemu\'el Bet (2 Samuel) \u2014 Part 2 \u2014 Ch 7\u201312",
"Shemu\'el Bet (2 Samuel) \u2014 Part 3 \u2014 Ch 13\u201318",
"Shemu\'el Bet (2 Samuel) \u2014 Part 4 \u2014 Ch 19\u201324",
'Melakhim Aleph (1 Kings) \u2014 Part 1 \u2014 Ch 1\u20136',
'Melakhim Aleph (1 Kings) \u2014 Part 2 \u2014 Ch 7\u201312',
'Melakhim Aleph (1 Kings) \u2014 Part 3 \u2014 Ch 13\u201318',
'Melakhim Aleph (1 Kings) \u2014 Part 4 \u2014 Ch 19\u201322',
'Melakhim Bet (2 Kings) \u2014 Part 1 \u2014 Ch 1\u20137',
'Melakhim Bet (2 Kings) \u2014 Part 2 \u2014 Ch 8\u201313',
'Melakhim Bet (2 Kings) \u2014 Part 3 \u2014 Ch 14\u201319',
'Melakhim Bet (2 Kings) \u2014 Part 4 \u2014 Ch 20\u201325',
"Yesha\'yahu (Isaiah) \u2014 1QIsa-a \u2014 Part 1 \u2014 Ch 1\u201312",
"Yesha\'yahu (Isaiah) \u2014 1QIsa-a \u2014 Part 2 \u2014 Ch 13\u201327",
"Yesha\'yahu (Isaiah) \u2014 1QIsa-a \u2014 Part 3 \u2014 Ch 28\u201341",
"Yesha\'yahu (Isaiah) \u2014 1QIsa-a \u2014 Part 4 \u2014 Ch 42\u201354",
"Yesha\'yahu (Isaiah) \u2014 1QIsa-a \u2014 Part 5 \u2014 Ch 55\u201366",
'Yirmeyahu (Jeremiah) \u2014 Part 1 \u2014 Ch 1\u20137',
'Yirmeyahu (Jeremiah) \u2014 Part 2 \u2014 Ch 8\u201315',
'Yirmeyahu (Jeremiah) \u2014 Part 3 \u2014 Ch 16\u201323',
'Yirmeyahu (Jeremiah) \u2014 Part 4 \u2014 Ch 24\u201331',
'Yirmeyahu (Jeremiah) \u2014 Part 5 \u2014 Ch 32\u201339',
'Yirmeyahu (Jeremiah) \u2014 Part 6 \u2014 Ch 40\u201348',
'Yirmeyahu (Jeremiah) \u2014 Part 7 \u2014 Ch 49\u201352',
'Yehezkel (Ezekiel) \u2014 Part 1 \u2014 Ch 1\u201311',
'Yehezkel (Ezekiel) \u2014 Part 2 \u2014 Ch 12\u201319',
'Yehezkel (Ezekiel) \u2014 Part 3 \u2014 Ch 20\u201324',
'Yehezkel (Ezekiel) \u2014 Part 4 \u2014 Ch 25\u201332',
'Yehezkel (Ezekiel) \u2014 Part 5 \u2014 Ch 33\u201339',
'Yehezkel (Ezekiel) \u2014 Part 6 \u2014 Ch 40\u201348',
'The Twelve \u2014 Part 1 \u2014 Hoshea',
'The Twelve \u2014 Part 2 \u2014 Yoel and Amos',
'The Twelve \u2014 Part 3 \u2014 Ovadyah, Yonah, Mikhah, Nakhum',
'The Twelve \u2014 Part 4 \u2014 Havakuk, Tzefanyah, Khagai, Zekhariyahu 1\u20138',
'The Twelve \u2014 Part 5 \u2014 Zekhariyahu 9\u201314 and Malakhi',
'Tehillim (Psalms) \u2014 Part 1 \u2014 Psalms 1\u201320',
'Tehillim (Psalms) \u2014 Part 2 \u2014 Psalms 21\u201341',
'Tehillim (Psalms) \u2014 Part 3 \u2014 Psalms 42\u201372',
'Tehillim (Psalms) \u2014 Part 4 \u2014 Psalms 73\u201389',
'Tehillim (Psalms) \u2014 Part 5 \u2014 Psalms 90\u2013106',
'Tehillim (Psalms) \u2014 Part 6 \u2014 Psalms 107\u2013118',
'Tehillim (Psalms) \u2014 Part 7 \u2014 Psalm 119',
'Tehillim (Psalms) \u2014 Part 8 \u2014 Psalms 120\u2013150',
'Tehillim (Psalms) \u2014 Part 9 \u2014 Psalms 151, 154, 155 \u2014 DSS Only',
'Mishlei (Proverbs) \u2014 Part 1 \u2014 Ch 1\u201310',
'Mishlei (Proverbs) \u2014 Part 2 \u2014 Ch 11\u201320',
'Mishlei (Proverbs) \u2014 Part 3 \u2014 Ch 21\u201331',
'Iyov (Job) \u2014 Part 1 \u2014 Ch 1\u201314',
'Iyov (Job) \u2014 Part 2 \u2014 Ch 15\u201328',
'Iyov (Job) \u2014 Part 3 \u2014 Ch 29\u201342',
'Shir HaShirim (Song of Songs) \u2014 Complete',
'Ruth \u2014 Complete',
'Eikha (Lamentations) \u2014 Complete',
'Kohelet (Ecclesiastes) \u2014 Complete',
"Esther \u2014 Orit Ge\'ez Primary \u2014 Complete",
'Daniyel (Daniel) \u2014 Part 1 \u2014 Ch 1\u20136',
'Daniyel (Daniel) \u2014 Part 2 \u2014 Ch 7\u201312',
'Ezra-Nekhemyah \u2014 Part 1 \u2014 Ezra',
'Ezra-Nekhemyah \u2014 Part 2 \u2014 Nekhemyah',
'Divrei HaYamim Aleph (1 Chronicles) \u2014 Part 1 \u2014 Ch 1\u20139',
'Divrei HaYamim Aleph (1 Chronicles) \u2014 Part 2 \u2014 Ch 10\u201329',
'Divrei HaYamim Bet (2 Chronicles) \u2014 Part 1 \u2014 Ch 1\u201318',
'Divrei HaYamim Bet (2 Chronicles) \u2014 Part 2 \u2014 Ch 19\u201336',
'4Q246 (Aramaic Apocalypse) \u2014 Complete',
'War Scroll 1QM (Sons of Light vs Darkness) \u2014 All 19 Columns \u2014 Complete',
'4QMMT (Some Works of the Torah) of the Torah \u2014 Complete',
'Damascus Document (Brit Damesek) \u2014 Part 1 \u2014 Columns 1\u20138',
'Damascus Document (Brit Damesek) \u2014 Part 2 \u2014 Columns 9\u201316',
'Community Rule 1QS (Serekh HaYakhad) \u2014 Complete',
'Rule of the Congregation 1QSa (Serekh HaEdah) \u2014 Complete',
'Rule of Blessings 1QSb (Serekh HaBerakhot) \u2014 Complete',
"Words of the Luminaries (Divrei HaMe'orot) \u2014 Complete",
'Pesher Nahum (Commentary on Nahum) \u2014 Complete',
'Hodayot (Thanksgiving Hymns) \u2014 Part 1 \u2014 Col 1\u20134',
'Hodayot (Thanksgiving Hymns) \u2014 Part 2 \u2014 Col 5\u20138',
'Pesher Habakkuk (Commentary on Habakkuk) \u2014 Complete',
'Songs of Sabbath Sacrifice (Shirot Olat HaShabbat) \u2014 Complete',
'Genesis Apocryphon (Bereshit Apocryphon) \u2014 Complete',
'11QMelchizedek (Melchizedek Scroll) \u2014 Complete',
'Temple Scroll 11Q19 (Megillat HaMikdash) \u2014 Part 1 \u2014 Col 1\u201322',
'Temple Scroll 11Q19 (Megillat HaMikdash) \u2014 Part 2 \u2014 Col 23\u201344',
'Temple Scroll 11Q19 (Megillat HaMikdash) \u2014 Part 3 \u2014 Col 45\u201366'
];

var VOL_GROUPS = [
{title:'Vol 1 \u2014 Bereshit',eng:'Genesis',count:4,vol:'1'},
{title:'Vol 2 \u2014 Shemot',eng:'Exodus',count:2,vol:'2'},
{title:'Vol 3 \u2014 Vayikra',eng:'Leviticus',count:2,vol:'3'},
{title:'Vol 4 \u2014 Bamidbar',eng:'Numbers',count:2,vol:'4'},
{title:'Vol 5 \u2014 Devarim',eng:'Deuteronomy',count:2,vol:'5'},
{title:'Vol 6 \u2014 Chanokh',eng:'Book of Chanokh',count:3,vol:'6'},
{title:'Vol 7 \u2014 Yovelim',eng:'Book of Jubilees',count:2,vol:'7'},
{title:'Vol 8 \u2014 Book of Giants',eng:'DSS Attested',count:1,vol:'8'},
{title:'Vol 9 \u2014 Visions of Amram',eng:'4QAmram',count:1,vol:'9'},
{title:'Vol 10 \u2014 Yehoshua',eng:'Joshua',count:3,vol:'10'},
{title:'Vol 11 \u2014 Shofetim',eng:'Judges',count:3,vol:'11'},
{title:"Vol 12 \u2014 Shemu\'el Aleph",eng:'1 Samuel',count:4,vol:'12'},
{title:"Vol 13 \u2014 Shemu\'el Bet",eng:'2 Samuel',count:4,vol:'13'},
{title:'Vol 14 \u2014 Melakhim Aleph',eng:'1 Kings',count:4,vol:'14'},
{title:'Vol 15 \u2014 Melakhim Bet',eng:'2 Kings',count:4,vol:'15'},
{title:"Vol 16 \u2014 Yesha\'yahu",eng:'Isaiah \u2014 1QIsa-a',count:5,vol:'16'},
{title:'Vol 17 \u2014 Yirmeyahu',eng:'Jeremiah',count:7,vol:'17'},
{title:'Vol 18 \u2014 Yehezkel',eng:'Ezekiel',count:6,vol:'18'},
{title:'Vol 19 \u2014 The Twelve',eng:'Minor Prophets',count:5,vol:'19'},
{title:'Vol 20 \u2014 Tehillim',eng:'Psalms incl 151, 154, 155',count:9,vol:'20'},
{title:'Vol 21 \u2014 Mishlei',eng:'Proverbs',count:3,vol:'21'},
{title:'Vol 22 \u2014 Iyov',eng:'Job',count:3,vol:'22'},
{title:'Vol 23 \u2014 Shir HaShirim',eng:'Song of Songs',count:1,vol:'23'},
{title:'Vol 24 \u2014 Ruth',eng:'',count:1,vol:'24'},
{title:'Vol 25 \u2014 Eikha',eng:'Lamentations',count:1,vol:'25'},
{title:'Vol 26 \u2014 Kohelet',eng:'Ecclesiastes',count:1,vol:'26'},
{title:'Vol 27 \u2014 Esther',eng:"Orit Ge\'ez Primary",count:1,vol:'27'},
{title:'Vol 28 \u2014 Daniyel',eng:'Daniel',count:2,vol:'28'},
{title:'Vol 29 \u2014 Ezra-Nekhemyah',eng:'Ezra & Nehemiah',count:2,vol:'29'},
{title:'Vol 30 \u2014 Divrei HaYamim Aleph',eng:'1 Chronicles',count:2,vol:'30'},
{title:'Vol 31 \u2014 Divrei HaYamim Bet',eng:'2 Chronicles',count:2,vol:'31'},
{title:'Vol 32 \u2014 4Q246',eng:'Aramaic Apocalypse',count:1,vol:'32'},
{title:'Vol 33 \u2014 War Scroll 1QM',eng:'Sons of Light vs Darkness',count:1,vol:'33'},
{title:'Vol 34 \u2014 4QMMT',eng:'Works of the Torah',count:1,vol:'34'},
{title:'Vol 35 \u2014 Damascus Document',eng:'',count:2,vol:'35'},
{title:'Vol 36 \u2014 Community Rule 1QS',eng:'',count:1,vol:'36'},
{title:'Vol 37 \u2014 Rule of the Congregation',eng:'1QSa',count:1,vol:'37'},
{title:'Vol 38 \u2014 Rule of Blessings',eng:'1QSb',count:1,vol:'38'},
{title:'Vol 39 \u2014 Words of the Luminaries',eng:'4QDibHam',count:1,vol:'39'},
{title:'Vol 40 \u2014 Pesher Nahum',eng:'4QpNah',count:1,vol:'40'},
{title:'Vol 41 \u2014 Hodayot',eng:'Thanksgiving Hymns',count:2,vol:'41'},
{title:'Vol 42 \u2014 Pesher Habakkuk',eng:'1QpHab',count:1,vol:'42'},
{title:'Vol 43 \u2014 Songs of Sabbath Sacrifice',eng:'',count:1,vol:'43'},
{title:'Vol 44 \u2014 Genesis Apocryphon',eng:'1QapGen',count:1,vol:'44'},
{title:'Vol 45 \u2014 11QMelchizedek',eng:'',count:1,vol:'45'},
{title:'Vol 46 \u2014 Temple Scroll 11Q19',eng:'All 66 Columns',count:3,vol:'46'}
];
var fs = parseFloat(localStorage.getItem('acr_study_fs') || '10.5');
var lh = parseFloat(localStorage.getItem('acr_study_lh') || '1.65');
var sbo = true;
var cur = -1;
var vop = false;
var npop = false;
var nvop = false;

document.documentElement.style.setProperty('--lh', lh);

// ---- Reading Aids: BeeLine gradient + Line Focus ----
var beelineOn = localStorage.getItem('acr_study_beeline') === '1';
var lineFocusOn = localStorage.getItem('acr_study_linefocus') === '1';

function toggleBeeline() {
  beelineOn = !beelineOn;
  document.body.classList.toggle('beeline-on', beelineOn);
  try { localStorage.setItem('acr_study_beeline', beelineOn ? '1' : '0'); } catch (e) {}
}

function toggleLineFocus() {
  lineFocusOn = !lineFocusOn;
  document.body.classList.toggle('linefocus-on', lineFocusOn);
  try { localStorage.setItem('acr_study_linefocus', lineFocusOn ? '1' : '0'); } catch (e) {}
}

var childMode = localStorage.getItem('acr_study_child') === '1';

function toggleChildMode() {
  childMode = !childMode;
  document.body.classList.toggle('child-mode', childMode);
  if (childMode) {
    document.body.classList.add('font-dyslexic');
  }
  try { localStorage.setItem('acr_study_child', childMode ? '1' : '0'); } catch (e) {}
}

if (childMode) {
  document.body.classList.add('child-mode');
  document.body.classList.add('font-dyslexic');
}
if (beelineOn) document.body.classList.add('beeline-on');
if (lineFocusOn) document.body.classList.add('linefocus-on');

// ---- Volume banner graphics (inline SVG, no external dependency) ----
var VOL_ICONS = {
  '1': '\u{1F30D}', '2': '\u{1F525}', '3': '\u{1F54E}', '4': '\u{1F3DC}',
  '5': '\u{1F4DC}', '6': '\u{1F47C}', '7': '\u{1F4C5}', '8': '\u2694\uFE0F'
};
var VOL_COLORS = {
  '1': ['#2563eb','#1e40af'], '2': ['#dc2626','#991b1b'], '3': ['#059669','#065f46'],
  '4': ['#d97706','#92400e'], '5': ['#7c3aed','#5b21b6'], '6': ['#0891b2','#155e75'],
  '7': ['#ea580c','#9a3412'], '8': ['#b8860b','#78350f']
};
var VOL_NAMES = {
  '1': 'Bereshit \u00B7 Genesis', '2': 'Shemot \u00B7 Exodus',
  '3': 'Vayikra \u00B7 Leviticus', '4': 'Bamidbar \u00B7 Numbers',
  '5': 'Devarim \u00B7 Deuteronomy', '6': 'Chanokh \u00B7 Book of Chanokh',
  '7': 'Yovelim \u00B7 Book of Jubilees', '8': 'War Scroll 1QM'
};

function getVolForFid(fid) {
  var idx = IDS.indexOf(fid);
  if (idx < 0) return '1';
  var count = 0;
  for (var g = 0; g < VOL_GROUPS.length; g++) {
    count += VOL_GROUPS[g].count;
    if (idx < count) return VOL_GROUPS[g].vol;
  }
  return '1';
}

function volBanner(volId) {
  var c = VOL_COLORS[volId] || ['#333','#111'];
  var name = VOL_NAMES[volId] || '';
  return '<div class="vol-banner" style="background:linear-gradient(135deg,' + c[0] + ',' + c[1] + ')">' +
    '<div class="vol-banner-name">' + name + '</div>' +
    '</div>';
}

// ---- Tap-to-hear: tap any word in content areas to hear it spoken ----
document.addEventListener('click', function (e) {
  var target = e.target;
  if (!target || target.tagName === 'BUTTON' || target.tagName === 'SELECT' ||
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'A') return;
  // Only in content areas
  var inContent = target.closest('.ll-card, .cloze-prompt, .mc-question, .sv-text, .sv-td, .sv-fa, .fc-front, .fc-back, .sv-fq');
  if (!inContent) return;
  var sel = window.getSelection();
  if (sel && sel.toString().trim().length > 0) return; // don't interfere with selection
  // Get the word under the tap
  var range = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
  if (!range) return;
  range.expand('word');
  var word = range.toString().trim();
  if (word && word.length > 1 && word.length < 40) {
    speakText(word);
  }
});

// ---- SM-2 Spaced Repetition Algorithm ----
// Each card: {id, fid, front, back, type, ease:2.5, interval:1, reps:0, nextReview:dateStr}
// Confidence 1-5 maps: 1=again(0), 2=hard(1), 3=okay(3), 4=good(4), 5=easy(5)

function getCards() {
  try { return JSON.parse(localStorage.getItem('acr_study_cards') || '{}'); } catch (e) { return {}; }
}
function saveCards(cards) {
  try { localStorage.setItem('acr_study_cards', JSON.stringify(cards)); } catch (e) {}
}

function sm2(card, quality) {
  // quality: 0-5 (mapped from confidence 1-5)
  var c = Object.assign({}, card);
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

function getOrCreateCard(fid, front, back, type) {
  var cards = getCards();
  var id = fid + ':' + type + ':' + front.slice(0, 30);
  if (!cards[id]) {
    cards[id] = { id: id, fid: fid, front: front, back: back, type: type,
      ease: 2.5, interval: 1, reps: 0, nextReview: new Date().toISOString().slice(0, 10) };
    saveCards(cards);
  }
  return cards[id];
}

function getDueCards(fid) {
  var cards = getCards();
  var today = new Date().toISOString().slice(0, 10);
  var due = [];
  for (var id in cards) {
    if (cards[id].fid === fid && cards[id].nextReview <= today) {
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

function updateCard(card) {
  var cards = getCards();
  cards[card.id] = card;
  saveCards(cards);
}

function isVolumeMastered(volId) {
  var cards = getCards();
  var volFids = [];
  var count = 0;
  for (var g = 0; g < VOL_GROUPS.length; g++) {
    for (var i = 0; i < VOL_GROUPS[g].count; i++) {
      if (VOL_GROUPS[g].vol === volId) volFids.push(IDS[count]);
      count++;
    }
  }
  if (!volFids.length) return false;
  var volCards = [];
  for (var id in cards) {
    if (volFids.indexOf(cards[id].fid) >= 0) volCards.push(cards[id]);
  }
  if (volCards.length < 5) return false; // need at least 5 cards studied
  var mastered = volCards.filter(function (c) { return c.ease >= 2.5 && c.reps >= 3; });
  return mastered.length >= volCards.length * 0.8; // 80% mastered
}

// ---- Question Mastery Tracking ----
function getQuizMastery() {
  try { return JSON.parse(localStorage.getItem('acr_study_qmastery') || '{}'); } catch (e) { return {}; }
}
function saveQuizMastery(m) {
  try { localStorage.setItem('acr_study_qmastery', JSON.stringify(m)); } catch (e) {}
}
function recordQuestionResult(fid, mode, qIndex, correct) {
  var m = getQuizMastery();
  var key = fid + ':' + mode + ':' + qIndex;
  if (!m[key]) m[key] = { correct: 0, attempts: 0, mastered: false };
  m[key].attempts++;
  if (correct) m[key].correct++;
  if (m[key].correct >= 3) m[key].mastered = true;
  saveQuizMastery(m);
}

// ---- Remix Queue (BUILD_PLAN #4) ----
// Tracks every question a user misses. At round end, the Remix card
// resurfaces each item in the OPPOSITE game format so the user gets
// another chance without repeating the exact same experience. Cleared
// only when the remixed version is answered correctly.

function getRemixQueue() {
  try { return JSON.parse(localStorage.getItem('acr_study_remix_queue') || '[]'); }
  catch (e) { return []; }
}
function saveRemixQueue(q) {
  try { localStorage.setItem('acr_study_remix_queue', JSON.stringify(q || [])); }
  catch (e) {}
}
function remixKey(item) {
  // Unique identity so we never push the same miss twice.
  return item.fid + '|' + item.missedInMode + '|' + (item.ref || '') + '|' + ((item.prompt || item.question || '').slice(0, 60));
}
function pushToRemixQueue(item) {
  if (!item || !item.fid || !item.missedInMode) return;
  var q = getRemixQueue();
  var key = remixKey(item);
  for (var i = 0; i < q.length; i++) {
    if (remixKey(q[i]) === key) return; // already queued
  }
  item.missedAt = new Date().toISOString();
  q.push(item);
  // Cap the queue so it doesn't grow unbounded
  if (q.length > 100) q = q.slice(-100);
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
function getRemixCount(fid) {
  var q = getRemixQueue();
  if (!fid) return q.length;
  var n = 0;
  for (var i = 0; i < q.length; i++) if (q[i].fid === fid) n++;
  return n;
}
function getSectionMastery(fid) {
  var m = getQuizMastery();
  var total = 0, mastered = 0;
  for (var key in m) {
    if (key.indexOf(fid + ':') === 0) {
      total++;
      if (m[key].mastered) mastered++;
    }
  }
  if (total === 0) return { total: 0, mastered: 0, pct: 0, badge: '' };
  var pct = Math.round(mastered / total * 100);
  var badge = pct >= 100 ? '\u{1F947}' : pct >= 80 ? '\u{1F948}' : pct >= 50 ? '\u{1F949}' : '';
  return { total: total, mastered: mastered, pct: pct, badge: badge };
}
function getUnmasteredQuestions(fid, mode, questions) {
  var m = getQuizMastery();
  var unmastered = [];
  for (var i = 0; i < questions.length; i++) {
    var key = fid + ':' + mode + ':' + i;
    if (!m[key] || !m[key].mastered) unmastered.push({ q: questions[i], origIdx: i });
  }
  return unmastered;
}
function getNextSectionFid(fid) {
  var idx = IDS.indexOf(fid);
  if (idx < 0 || idx >= IDS.length - 1) return null;
  return IDS[idx + 1];
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

// ---- XP, Streak & Level system ----
var LEVELS = [
  { name: 'Seeker', icon: '\u{1F50D}', xp: 0 },
  { name: 'Scholar', icon: '\u{1F4DC}', xp: 100 },
  { name: 'Guardian', icon: '\u{1F6E1}\uFE0F', xp: 500 },
  { name: 'Keeper of the Scroll', icon: '\u{1F3C6}', xp: 1500 }
];

function getStats() {
  try { return JSON.parse(localStorage.getItem('acr_study_stats') || '{}'); }
  catch (e) { return {}; }
}

// ---- Hint Ladder (BUILD_PLAN #5) ----
// Three progressive hints per question. XP multiplier reduces as hints
// are used: 0 hints = 1.0 (10 XP), 1 = 0.7 (7 XP), 2 = 0.4 (4 XP),
// 3 = 0.1 (1 XP). Full answer never auto-revealed; user must still
// submit a final guess.

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
  var stage1 = '\u{1F4A1} ' + lenLabel;
  var stage2 = passage ? '\u{1F4D6} "' + String(passage).trim() + '"' : '\u{1F4D6} No passage available for this question.';
  var stage3 = '\u{1F521} ' + blankedReveal(a);
  return [stage1, stage2, stage3];
}

function hintMultiplier(hintsUsed) {
  if (hintsUsed <= 0) return 1.0;
  if (hintsUsed === 1) return 0.7;
  if (hintsUsed === 2) return 0.4;
  return 0.1;
}

// Wires up a hint button + display element already present in the DOM.
// Caller provides element IDs, the answer, the passage, and a callback
// invoked each time a hint is consumed (to increment its hintsUsed
// counter for scoring).
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
    if (used < 3) {
      btn.innerHTML = labels[used];
    } else {
      btn.innerHTML = '\u2714 Hints used';
      btn.disabled = true;
    }
    if (typeof onUse === 'function') onUse(used);
  });
}

// ---- Flashcard context enrichment ----
// Find the shortest sentence in the curated content that contains the
// term, so the flashcard back can teach the word in its real context.
function findTermContextInCuratedData(term, data) {
  if (!term || !data) return '';
  var re = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
  var sources = [];
  if (data.fill_blank) data.fill_blank.forEach(function (q) { if (q.source_quote) sources.push(q.source_quote); });
  if (data.multiple_choice) data.multiple_choice.forEach(function (q) { if (q.source_quote) sources.push(q.source_quote); });
  var best = null;
  for (var i = 0; i < sources.length; i++) {
    var sentences = sources[i].match(/[^.!?]+[.!?]+/g) || [sources[i]];
    for (var s = 0; s < sentences.length; s++) {
      var sent = sentences[s].trim();
      if (sent.length < 20 || sent.length > 240) continue;
      if (!re.test(sent)) continue;
      if (!best || sent.length < best.length) best = sent;
    }
  }
  return best || '';
}

function termUsagePrompt(term, isProperNoun) {
  if (isProperNoun) {
    return 'Who or what is ' + term + ', and what role do they play here?';
  }
  return 'What does "' + term + '" mean in this passage, and why is it important?';
}

// ---- Speaker-quote extraction (for Who Said It mode) ----
var SPEAKER_VERBS = 'said|replied|answered|asked|spoke|declared|announced|' +
  'called|responded|commanded|charged|proclaimed|blessed|cursed|prayed|' +
  'swore|vowed|wept|cried|told';
var SPEAKER_NAME = '[A-Z][a-zA-Z\u2019\']+(?:\\s+[A-Z][a-zA-Z\u2019\']+)?';

function extractSpeakerQuotesFromCurated(data) {
  if (!data) return [];
  var sources = [];
  if (data.fill_blank) data.fill_blank.forEach(function (q) { if (q.source_quote) sources.push(q.source_quote); });
  if (data.multiple_choice) data.multiple_choice.forEach(function (q) { if (q.source_quote) sources.push(q.source_quote); });

  var p1 = new RegExp('[\u201C"]([^\u201C\u201D"]{10,240})[.?!,]?[\u201D"]\\s*(' + SPEAKER_NAME + ')\\s+(?:' + SPEAKER_VERBS + ')\\b', 'g');
  var p2 = new RegExp('[\u201C"]([^\u201C\u201D"]{10,240})[.?!,]?[\u201D"]\\s*(?:' + SPEAKER_VERBS + ')\\s+(' + SPEAKER_NAME + ')\\b', 'g');
  var p3 = new RegExp('\\b(' + SPEAKER_NAME + ')\\s+(?:' + SPEAKER_VERBS + ')[,:]?\\s*[\u201C"]([^\u201C\u201D"]{10,240})[\u201D"]', 'g');
  var p4 = new RegExp('\\b(' + SPEAKER_NAME + ')\\s+(?:' + SPEAKER_VERBS + ')\\s+(?:to|unto)\\s+[^,"\u201C\u201D]{1,50}[,:]\\s*[\u201C"]([^\u201C\u201D"]{10,240})[\u201D"]', 'g');

  var results = [];
  var seen = {};
  function add(quote, speaker) {
    var key = quote.toLowerCase().slice(0, 60);
    if (seen[key]) return;
    seen[key] = true;
    results.push({ quote: quote.trim(), speaker: speaker.trim() });
  }
  for (var i = 0; i < sources.length; i++) {
    var text = sources[i];
    var m;
    p1.lastIndex = 0; while ((m = p1.exec(text)) !== null) add(m[1], m[2]);
    p2.lastIndex = 0; while ((m = p2.exec(text)) !== null) add(m[1], m[2]);
    p3.lastIndex = 0; while ((m = p3.exec(text)) !== null) add(m[2], m[1]);
    p4.lastIndex = 0; while ((m = p4.exec(text)) !== null) add(m[2], m[1]);
  }
  return results;
}

function saveStats(s) {
  try { localStorage.setItem('acr_study_stats', JSON.stringify(s)); } catch (e) {}
}

function addXP(amount) {
  var s = getStats();
  s.xp = (s.xp || 0) + amount;
  s.totalAnswered = (s.totalAnswered || 0) + 1;
  updateStreak(s);
  saveStats(s);
  return s;
}

function recordSession(fid, mode, score, total) {
  var s = getStats();
  if (!s.sessions) s.sessions = [];
  s.sessions.push({
    fid: fid, mode: mode, score: score, total: total,
    date: new Date().toISOString().slice(0, 10)
  });
  if (s.sessions.length > 100) s.sessions = s.sessions.slice(-100);
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

function buildTOC() {
  var sb = document.getElementById('sb');
  var intro = document.createElement('div');
  intro.className = 'sb-intro';
  intro.textContent = '\u{1F4D6} ACR STUDY — 8 VOLUMES';
  sb.appendChild(intro);

  var idx = 0;
  for (var g = 0; g < VOL_GROUPS.length; g++) {
    var group = VOL_GROUPS[g];
    var volColorVars = ['--vol1','--vol2','--vol3','--vol4','--vol5','--vol6','--vol7','--vol8'];
    var h = document.createElement('div');
    h.className = 'vol-hdr';
    h.setAttribute('data-vol', group.vol);
    h.style.color = 'var(' + volColorVars[g % 8] + ')';
    var mastered = isVolumeMastered(group.vol);
    h.innerHTML = group.title +
      (mastered ? ' <span class="vol-badge">\u{1F3C6}</span>' : '') +
      (group.eng ? '<span class="vol-eng">' + group.eng + '</span>' : '');
    sb.appendChild(h);
    for (var i = 0; i < group.count; i++) {
      var fid = IDS[idx];
      var s = document.createElement('div');
      s.className = 'sec';
      s.setAttribute('data-id', fid);
      s.setAttribute('role', 'button');
      s.setAttribute('tabindex', '0');
      s.setAttribute('aria-label', 'Study section: ' + LBL[idx]);
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
  var dueCount = getDueCards(fid).length;
  var totalDue = getAllDueCount();
  var volId = getVolForFid(fid);
  var h = volBanner(volId);
  h += '<div class="activity-grid-header">' + LBL[i] + '</div>';
  if (dueCount > 0 || totalDue > 0) {
    h += '<div class="due-banner">';
    if (dueCount > 0) h += '<span class="due-badge">\u{1F4DA} ' + dueCount + ' cards due for review in this section</span>';
    if (totalDue > dueCount) h += '<span class="due-total">' + totalDue + ' total due across all sections</span>';
    h += '</div>';
  }
  var secMastery = getSectionMastery(fid);
  if (secMastery.total > 0) {
    h += '<div class="mastery-bar"><div class="mastery-label">' +
      (secMastery.badge || '\u{1F4CA}') + ' ' + secMastery.mastered + '/' + secMastery.total +
      ' questions mastered (' + secMastery.pct + '%)</div>' +
      '<div class="prog-bar-wrap"><div class="prog-bar" style="width:' + secMastery.pct + '%"></div></div></div>';
  }
  h += '<div class="activity-grid">';
  h += actCard('\u{1F4D6}', 'Chapter Summary', '#2563eb', 'summary', fid);
  h += actCard('\u{1F9E9}', 'Fill in the Blank', '#059669', 'filblank', fid);
  h += actCard('\u{1F50A}', 'Audio Fill the Gap', '#16a34a', 'audio-filblank', fid);
  h += actCard('\u270F\uFE0F', 'Multiple Choice', '#7c3aed', 'mc', fid);
  h += actCard('\u{1F4AC}', 'Who Said It', '#a855f7', 'whosaidit', fid);
  h += actCard('\u2696\uFE0F', 'True or False', '#0ea5e9', 'truefalse', fid);
  h += actCard('\u{1F501}', 'Story Sequence', '#ea580c', 'sequence', fid);
  h += actCard('\u21AA', 'Cause & Effect', '#be185d', 'causeeffect', fid);
  h += actCard('\u{1F3A7}', 'Dictation', '#0891b2', 'dictation', fid);
  h += actCard('\u{1F500}', 'Word Morph', '#4338ca', 'morph', fid);
  h += actCard('\u{1F441}\uFE0F', 'Syllable Tap', '#f59e0b', 'syllable', fid);
  h += actCard('\u{1F3B6}', 'Rhyme Chain', '#0891b2', 'rhyme', fid);
  h += actCard('\u{1F0CF}', 'Flashcards', '#d97706', 'flash', fid);
  h += actCard('\u{1F4DA}', 'Key Terms', '#0891b2', 'terms', fid);
  h += actCard('\u2753', 'FAQ', '#ea580c', 'faq', fid);
  h += actCard('\u{1F9E0}', 'Memory Match', '#dc2626', 'memory', fid);
  h += actCard('\u{1F50A}', 'Listen & Learn', '#4f46e5', 'listen', fid);
  h += actCard('\u{1F3C6}', 'Progress', '#b8860b', 'progress', fid);
  h += actCard('\u{1F9E9}', 'Verse Builder', '#e91e90', 'versebuild', fid);
  h += actCard('\u{1F517}', 'Word Match', '#6d28d9', 'wordmatch', fid);
  h += actCard('\u2694\uFE0F', 'Challenge', '#b91c1c', 'challenge', fid);
  var remixN = getRemixCount(fid);
  if (remixN > 0) {
    h += '<div class="act-card act-card-remix" data-mode="remix" role="button" tabindex="0" aria-label="Remix Round activity, ' + remixN + ' due">' +
      '<div class="act-icon" aria-hidden="true">\u{1F504}</div>' +
      '<div class="act-label">Remix Round<br><span class="act-remix-badge">' + remixN + ' due</span></div>' +
      '</div>';
  }
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
  return '<div class="act-card" data-mode="' + mode + '" style="background:' + color + '" role="button" tabindex="0" aria-label="' + label + ' activity">' +
    '<div class="act-icon" aria-hidden="true">' + icon + '</div>' +
    '<div class="act-label">' + label + '</div>' +
    '</div>';
}

function openActivity(mode, fid) {
  if (mode === 'summary') { showStudyMode(fid); return; }
  if (mode === 'terms') { showTermsMode(fid); return; }
  if (mode === 'faq') { showFaqMode(fid); return; }
  if (mode === 'filblank') { showFillBlank(fid); return; }
  if (mode === 'audio-filblank') { showFillBlank(fid, true); return; }
  if (mode === 'mc') { showMC(fid); return; }
  if (mode === 'flash') { showFlashcards(fid); return; }
  if (mode === 'memory') { showMemoryMatch(fid); return; }
  if (mode === 'listen') { showListenLearn(fid); return; }
  if (mode === 'progress') { showProgress(fid); return; }
  if (mode === 'versebuild') { showVerseBuild(fid); return; }
  if (mode === 'wordmatch') { showWordMatch(fid); return; }
  if (mode === 'challenge') { showChallenge(fid); return; }
  if (mode === 'whosaidit') { showWhoSaidIt(fid); return; }
  if (mode === 'truefalse') { showTrueFalse(fid); return; }
  if (mode === 'sequence') { showStorySequence(fid); return; }
  if (mode === 'causeeffect') { showCauseEffect(fid); return; }
  if (mode === 'dictation') { showDictation(fid); return; }
  if (mode === 'morph') { showWordMorph(fid); return; }
  if (mode === 'syllable') { showSyllableTap(fid); return; }
  if (mode === 'rhyme') { showRhymeChain(fid); return; }
  if (mode === 'remix') { showRemix(fid); return; }
  // Fallback: mode-specific "not enough content" message
  var modeLabels = {
    stub: 'This section',
    whosaidit: 'Who Said It',
    truefalse: 'True or False',
    sequence: 'Story Sequence',
    causeeffect: 'Cause & Effect',
    dictation: 'Dictation',
    morph: 'Word Morph',
    syllable: 'Syllable Tap',
    filblank: 'Fill in the Blank',
    mc: 'Multiple Choice',
    flash: 'Flashcards',
    memory: 'Memory Match',
    wordmatch: 'Word Match',
    versebuild: 'Verse Builder',
    challenge: 'Challenge',
    'audio-filblank': 'Audio Fill the Gap'
  };
  var modeReasons = {
    whosaidit: 'needs at least 4 lines of quoted dialogue with a named speaker.',
    truefalse: 'needs sentences containing a proper-noun key term.',
    sequence: 'needs at least 3 ordered source quotes.',
    causeeffect: 'needs at least 3 cause/effect sentences (because, so, led to).',
    dictation: 'needs source quotes between 30 and 160 characters.',
    morph: 'needs at least 3 key terms of 5+ letters.',
    syllable: 'needs at least 3 key terms of 5+ letters with 2+ syllables.',
    filblank: 'needs more fill-in-blank items.',
    mc: 'needs more multiple-choice questions.',
    flash: 'needs key terms or source verses.',
    memory: 'needs at least 4 key terms with definitions.',
    wordmatch: 'needs at least 4 terms with definitions.',
    versebuild: 'needs source verses to reconstruct.',
    challenge: 'needs fill-in-blank or multiple-choice items.',
    'audio-filblank': 'needs fill-in-blank items.'
  };
  var friendly = modeLabels[mode] || (mode.charAt(0).toUpperCase() + mode.slice(1));
  var reason = modeReasons[mode] || 'does not have enough content in this section yet.';
  document.getElementById('content').innerHTML =
    '<div class="study-view"><div class="sv-sec stub-view">' +
    '<div class="stub-emoji" aria-hidden="true">\u{1F4ED}</div>' +
    '<h3>' + friendly + '</h3>' +
    '<p class="study-na">This activity ' + reason + '</p>' +
    '<p class="stub-hint">Try a different section, or pick another activity in this one.</p>' +
    '<button class="study-btn sb-pri" id="b-back-grid">Back to activities</button>' +
    '</div></div>';
  document.getElementById('b-back-grid').addEventListener('click', function () { go(fid); });
}

// Split-out views for terms and FAQ so they can be opened from the grid
function showTermsMode(fid) {
  loadContent(fid).then(function (data) {
    if (!data) {
      // Algorithmic fallback: extract unique capitalized names from verses
      var verses = getVerses(fid);
      if (!verses.length) {
        fetch('../data/'+fid+'.json').then(function(r){return r.ok?r.json():null;}).then(function(d){
          if(d){CHAPTER_CACHE[fid]=d;showTermsMode(fid);}else{openActivity('stub',fid);}
        }).catch(function(){openActivity('stub',fid);}); return;
      }
      var allText = verses.join(' ');
      var nameSet = {};
      var words = allText.split(/\s+/);
      for (var w = 0; w < words.length; w++) {
        var clean = words[w].replace(/[.,;:!?"'()]/g, '');
        if (clean.length > 3 && clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase() &&
            ['And','The','But','For','Now','Then','When','So','Let','Not','All','His','Her','Who','This','That','These','Those'].indexOf(clean) < 0) {
          nameSet[clean] = (nameSet[clean] || 0) + 1;
        }
      }
      var names = Object.keys(nameSet).sort(function(a,b){return nameSet[b]-nameSet[a];}).slice(0, 10);
      var secLabel = IDS.indexOf(fid) >= 0 ? LBL[IDS.indexOf(fid)] : fid;
      var h = '<div class="study-view">';
      h += '<h2 class="sv-title" style="border-left-color:var(--vol6)">Key Names \u2014 ' + secLabel.split(' \u2014 ')[0] + '</h2>';
      h += '<div class="sv-sec">';
      for (var n = 0; n < names.length; n++) {
        h += '<div class="sv-term"><strong class="sv-tw">' + names[n] + '</strong> <span class="sv-td">Appears ' + nameSet[names[n]] + ' times in this section</span></div>';
      }
      h += '</div><button class="study-btn" id="b-back-grid">Back to activities</button></div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-back-grid').addEventListener('click', function () { go(fid); });
      window.scrollTo(0, 0); return;
    }
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
    if (!data) {
      var secIdx = IDS.indexOf(fid);
      var secLabel = secIdx >= 0 ? LBL[secIdx].split(' \u2014 ')[0] : fid;
      var h = '<div class="study-view">';
      h += '<h2 class="sv-title" style="border-left-color:var(--vol1)">FAQ \u2014 ' + secLabel + '</h2>';
      h += '<div class="sv-sec"><p class="study-na">Curated FAQ for this section will be added in a future session. Use Listen &amp; Learn to hear the full text, or try Fill in the Blank and Flashcards which work now.</p></div>';
      h += '<button class="study-btn" id="b-back-grid">Back to activities</button></div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-back-grid').addEventListener('click', function () { go(fid); });
      window.scrollTo(0, 0); return;
    }
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
  loadVoiceSelector();
  window.speechSynthesis.onvoiceschanged = function () {
    ttsVoices = window.speechSynthesis.getVoices();
    loadVoiceSelector();
  };
}

function loadVoiceSelector() {
  var vc = document.getElementById('vc');
  if (!vc || !ttsVoices.length) return;
  var saved = localStorage.getItem('acr_study_voice');
  vc.innerHTML = '';
  var enh = [], siri = [], other = [];
  ttsVoices.forEach(function (v, i) {
    if (v.name.indexOf('Enhanced') >= 0) enh.push({ v: v, i: i });
    else if (v.name.indexOf('Siri') >= 0) siri.push({ v: v, i: i });
    else other.push({ v: v, i: i });
  });
  enh.concat(siri).concat(other).forEach(function (item) {
    var o = document.createElement('option');
    o.value = item.i;
    o.textContent = item.v.name.replace('(Enhanced)', ' \u2605').replace('(Compact)', '').trim();
    if (saved && item.v.name === saved) o.selected = true;
    else if (!saved && item.v.name.indexOf('Enhanced') >= 0 && !vc.querySelector('[selected]')) o.selected = true;
    vc.appendChild(o);
  });
  if (!vc.value && vc.options.length) vc.options[0].selected = true;
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

function prepTTS(txt) {
  txt = txt.replace(/\u{10909}\u{10904}\u{10905}\u{10904}/gu, 'Yahweh');
  txt = txt.replace(/YHWH/g, 'Yahweh');
  txt = txt.replace(/\bYH\b/g, 'Yah');
  txt = txt.replace(/\bMosheh\b/g, 'Mo-sheh');
  txt = txt.replace(/\bYehoshua\b/g, 'Yeh-ho-shua');
  txt = txt.replace(/\bYirmeyahu\b/g, 'Yir-meh-yah-hoo');
  txt = txt.replace(/\bYesha.yahu\b/g, 'Yeh-sha-yah-hoo');
  txt = txt.replace(/\bYehezkel\b/g, 'Yeh-hez-kel');
  txt = txt.replace(/\bYisrael\b/g, 'Yis-rah-el');
  txt = txt.replace(/\bBereshit\b/g, 'Beh-reh-sheet');
  txt = txt.replace(/\bShemot\b/g, 'Sheh-mot');
  txt = txt.replace(/\bVayikra\b/g, 'Vah-yik-rah');
  txt = txt.replace(/\bBamidbar\b/g, 'Bah-mid-bar');
  txt = txt.replace(/\bDevarim\b/g, 'Deh-vah-reem');
  txt = txt.replace(/\bChanokh\b/g, 'Hha-nokh');
  txt = txt.replace(/\bYovelim\b/g, 'Yo-veh-leem');
  txt = txt.replace(/\bTehillim\b/g, 'Teh-hil-leem');
  txt = txt.replace(/\bMelakhim\b/g, 'Meh-lah-kheem');
  txt = txt.replace(/\bShemu.el\b/g, 'Sheh-moo-el');
  txt = txt.replace(/\bShofetim\b/g, 'Sho-feh-teem');
  txt = txt.replace(/\bNevi.im\b/g, 'Neh-vee-eem');
  txt = txt.replace(/\bKetuvim\b/g, 'Keh-too-veem');
  txt = txt.replace(/\bQumran\b/g, 'Koom-rahn');
  txt = txt.replace(/\bOrit\b/g, 'Oh-reet');
  txt = txt.replace(/\bGe.ez\b/g, 'Geh-ez');
  txt = txt.replace(/\bQayin\b/g, 'Kah-yin');
  txt = txt.replace(/\bHevel\b/g, 'Heh-vel');
  txt = txt.replace(/\bNoakh\b/g, 'No-akh');
  txt = txt.replace(/\bChavah\b/g, 'Khah-vah');
  txt = txt.replace(/\bMetushelakh\b/g, 'Meh-too-sheh-lakh');
  txt = txt.replace(/\bBavel\b/g, 'Bah-vel');
  txt = txt.replace(/\bAvram\b/g, 'Ahv-rahm');
  txt = txt.replace(/\bAvraham\b/g, 'Ahv-rah-hahm');
  txt = txt.replace(/\bYitzkhak\b/g, 'Yeets-khahk');
  txt = txt.replace(/\bYaakov\b/g, 'Yah-ah-kov');
  txt = txt.replace(/\bYosef\b/g, 'Yo-sef');
  txt = txt.replace(/\bYehudah\b/g, 'Yeh-hoo-dah');
  txt = txt.replace(/\bMasoretic\b/g, 'Mah-so-reh-tic');
  txt = txt.replace(/\bElohim\b/g, 'Eh-lo-heem');
  txt = txt.replace(/\bNephilim\b/g, 'Neh-fi-leem');
  txt = txt.replace(/\bShet\b/g, 'Sheht');
  txt = txt.replace(/\bEnosh\b/g, 'Eh-nosh');
  txt = txt.replace(/\bQeynan\b/g, 'Kay-nahn');
  txt = txt.replace(/\bMahalalel\b/g, 'Mah-hah-lah-lel');
  txt = txt.replace(/\bYered\b/g, 'Yeh-red');
  txt = txt.replace(/\bLamekh\b/g, 'Lah-mekh');
  txt = txt.replace(/\b4Q/g, 'fragment 4Q');
  txt = txt.replace(/\b1Q/g, 'fragment 1Q');
  txt = txt.replace(/\bDSS\b/g, 'Dead Sea Scrolls');
  txt = txt.replace(/\[DSS\]/g, 'Dead Sea Scrolls note:');
  txt = txt.replace(/\[ORIT GE.EZ\]/g, 'Oh-reet Geh-ez note:');
  txt = txt.replace(/\[MASORETIC VARIANT\]/g, 'Mah-so-reh-tic variant note:');
  txt = txt.replace(/\[CRITICAL NOTE\]/g, 'Critical note:');
  txt = txt.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
  return txt;
}

function speakText(text) {
  if (!window.speechSynthesis) return;
  try { window.speechSynthesis.resume(); } catch (e) {}
  try { window.speechSynthesis.cancel(); } catch (e) {}
  var u = new SpeechSynthesisUtterance(prepTTS(text));
  u.rate = 1; u.lang = 'en-US'; u.volume = 1;
  var voice = getBestVoice();
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

// ---- Smart Algorithmic Question Generator ----
var IMPORTANT_WORDS = /\b(YHWH|Creator|covenant|Torah|Yisra.EL|holy|righteous|judgment|Sinai|Tziyon|Yerushalayim|temple|priest|prophet|angel|heaven|earth|glory|blessing|curse|commandment|Shabbat|Pesach|altar|offering|blood|fire|spirit|kingdom|throne|servant|nations|wilderness|promise|faithfulness|iniquity|transgression|sin|mercy|steadfast|everlasting|forever|inheritance|firstborn|circumcision|Pesach|jubilee|Sabbath|anointed|tabernacle|ark|sword|shield|trumpet|banner|pillar|cloud|lamp|bread|wine|oil|water|stone|mountain|river|garden|vineyard|sheep|shepherd|flock|seed|grain|harvest|tithe|vow|dream|vision|sign|wonder|plague|deliver|redeem|gather|scatter|exile|return|restore|remember|forget|forsake|seek|find|call|answer|hear|speak|write|teach|learn|obey|rebel|repent|forgive|heal|save|destroy|build|rest|rise|fall|live|die)\b/gi;

var NAMES_PATTERN = /\b(Adam|Chavah|Qayin|Hevel|Chanokh|Noakh|Avram|Avraham|Sarah|Yitzhak|Rivkah|Yaakov|Esav|Yosef|Moshe|Aharon|Miryam|Yehoshua|Dawid|Shelomoh|Eliyahu|Elisha|Yesha.yahu|Yirmeyahu|Yehezkel|Daniyel|Shem|Ham|Yafet|Levi|Yehudah|Binyamin|Reuven|Shim.on|Dan|Naftali|Gad|Asher|Yissakhar|Zevulun|Efrayim|Menasheh|Sha.ul|Bat.Sheva|Devorah|Gid.on|Shimshon|Ruth|Na.omi|Bo.az|Chanah|Shemu.el|Yonatan|Rachav|Kalev|Tzipporah|Yitro|Pharaoh|Nevukhadnetzar|Koresh)\b/g;

var NUMBERS_PATTERN = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|hundred|thousand|first|second|third|fourth|fifth|sixth|seventh|tenth|twelfth|fortieth|fiftieth)\b/gi;

var PLACES_PATTERN = /\b(Egypt|Mitsrayim|Babylon|Bavel|Sinai|Horev|Yerushalayim|Tziyon|Shekhem|Hevron|Beit.El|Gilgal|Yericho|Shiloh|Midyan|Negev|Yarden|Kedar|Lebanon|Karmel|Seir|Edom|Mo.av|Ammon|Aram|Asshur|Kena.an|En.Gedi|Ophir|Beersheva|Ramah|Giv.on|Ai|Nevo|Pisgah)\b/g;

function smartBlank(verse) {
  var words = verse.split(/\s+/);
  if (words.length < 5) return null;
  var targets = [];
  for (var i = 1; i < words.length - 1; i++) {
    var w = words[i].replace(/[.,;:!?"'()]/g, '');
    if (w.length < 3) continue;
    var score = 0;
    if (NAMES_PATTERN.test(w)) { score += 10; NAMES_PATTERN.lastIndex = 0; }
    if (PLACES_PATTERN.test(w)) { score += 8; PLACES_PATTERN.lastIndex = 0; }
    if (NUMBERS_PATTERN.test(w)) { score += 7; NUMBERS_PATTERN.lastIndex = 0; }
    if (IMPORTANT_WORDS.test(w)) { score += 5; IMPORTANT_WORDS.lastIndex = 0; }
    if (w.length >= 5) score += 2;
    if (score > 0) targets.push({ idx: i, word: w, score: score });
  }
  if (!targets.length) {
    var eligible = [];
    for (var i = 1; i < words.length - 1; i++) {
      var w = words[i].replace(/[.,;:!?"'()]/g, '');
      if (w.length >= 4) eligible.push({ idx: i, word: w, score: 1 });
    }
    if (!eligible.length) return null;
    targets = eligible;
  }
  targets.sort(function (a, b) { return b.score - a.score; });
  var pick = targets[Math.floor(Math.random() * Math.min(3, targets.length))];
  var prompt = verse.replace(new RegExp('\\b' + pick.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), '______');
  if (prompt === verse) return null;
  return { ref: '', prompt: prompt, answer: pick.word, source_quote: verse, difficulty: pick.score >= 8 ? 'hard' : pick.score >= 5 ? 'medium' : 'easy' };
}

function generateSmartQuestions(fid, count) {
  var verses = getVerses(fid);
  if (!verses.length) return [];
  var usable = verses.filter(function (v) { return v.length > 25 && v.length < 250; });
  usable = shuffle(usable);
  var questions = [];
  var seen = {};
  for (var i = 0; i < usable.length && questions.length < count; i++) {
    var q = smartBlank(usable[i]);
    if (q && !seen[q.answer.toLowerCase()]) {
      seen[q.answer.toLowerCase()] = true;
      questions.push(q);
    }
  }
  return questions;
}

function generateSmartMC(fid, count) {
  var verses = getVerses(fid);
  if (!verses.length) return [];
  var usable = verses.filter(function (v) { return v.length > 30 && v.length < 200; });
  usable = shuffle(usable);
  var questions = [];
  for (var i = 0; i < usable.length && questions.length < count; i++) {
    var words = usable[i].split(/\s+/);
    var nameMatches = usable[i].match(NAMES_PATTERN);
    var placeMatches = usable[i].match(PLACES_PATTERN);
    if (nameMatches && nameMatches.length > 0) {
      var name = nameMatches[0];
      var snippet = words.slice(0, Math.min(10, words.length)).join(' ');
      if (snippet.length > 60) snippet = snippet.slice(0, 57) + '...';
      var allNames = [];
      for (var v = 0; v < usable.length; v++) {
        var m = usable[v].match(NAMES_PATTERN);
        if (m) for (var n = 0; n < m.length; n++) if (allNames.indexOf(m[n]) < 0 && m[n] !== name) allNames.push(m[n]);
      }
      var opts = [name].concat(shuffle(allNames).slice(0, 3));
      opts = shuffle(opts);
      questions.push({ ref: '', question: 'Who is mentioned in: "' + snippet + '"?', options: opts, correct: opts.indexOf(name), source_quote: usable[i], difficulty: 'medium' });
    } else if (placeMatches && placeMatches.length > 0) {
      var place = placeMatches[0];
      var snippet = words.slice(0, Math.min(10, words.length)).join(' ');
      if (snippet.length > 60) snippet = snippet.slice(0, 57) + '...';
      var allPlaces = [];
      for (var v = 0; v < usable.length; v++) {
        var m = usable[v].match(PLACES_PATTERN);
        if (m) for (var p = 0; p < m.length; p++) if (allPlaces.indexOf(m[p]) < 0 && m[p] !== place) allPlaces.push(m[p]);
      }
      var opts = [place].concat(shuffle(allPlaces).slice(0, 3));
      opts = shuffle(opts);
      questions.push({ ref: '', question: 'Which place appears in: "' + snippet + '"?', options: opts, correct: opts.indexOf(place), source_quote: usable[i], difficulty: 'medium' });
    }
  }
  return questions;
}

// ---- Difficulty Tiers ----
function getDifficultyTier(fid) {
  var m = getSectionMastery(fid);
  if (m.pct >= 80) return 'hard';
  if (m.pct >= 40) return 'medium';
  return 'easy';
}

function getCrossReferenceQuestions(fid, count) {
  var idx = IDS.indexOf(fid);
  if (idx < 0) return [];
  var nearby = [];
  for (var i = Math.max(0, idx - 3); i <= Math.min(IDS.length - 1, idx + 3); i++) {
    if (i !== idx) nearby.push(IDS[i]);
  }
  var questions = [];
  for (var n = 0; n < nearby.length && questions.length < count; n++) {
    var nq = generateSmartQuestions(nearby[n], 2);
    for (var q = 0; q < nq.length && questions.length < count; q++) {
      nq[q].difficulty = 'hard';
      nq[q].crossRef = nearby[n];
      questions.push(nq[q]);
    }
  }
  return questions;
}

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

function showFillBlank(fid, audioMode) {
  loadContent(fid).then(function (data) {
    var questions = [], allAns = [];
    var tier = getDifficultyTier(fid);

    // Easy tier: curated questions (prioritize unmastered)
    if (data && data.fill_blank && data.fill_blank.length) {
      var curated = data.fill_blank.slice();
      var unmastered = getUnmasteredQuestions(fid, 'filblank', curated);
      if (unmastered.length > 0 && tier === 'easy') {
        questions = shuffle(unmastered.map(function (u) { return u.q; }));
      } else {
        questions = shuffle(curated);
      }
      allAns = data.fill_blank.map(function (q) { return q.answer; });
    }

    // Medium tier: add smart algorithmic questions from same section
    if (tier !== 'easy' || questions.length < 5) {
      var verses = getVerses(fid);
      if (!verses.length) {
        fetch('../data/' + fid + '.json').then(function(r){return r.ok?r.json():null;}).then(function(d){
          if(d){CHAPTER_CACHE[fid]=d;showFillBlank(fid, audioMode);}else if(!questions.length){openActivity('stub',fid);}
        }).catch(function(){if(!questions.length) openActivity('stub',fid);});
        if (!questions.length) return;
      }
      var smartQ = generateSmartQuestions(fid, tier === 'hard' ? 30 : 20);
      for (var sq = 0; sq < smartQ.length; sq++) {
        questions.push(smartQ[sq]);
        if (allAns.indexOf(smartQ[sq].answer) < 0) allAns.push(smartQ[sq].answer);
      }
    }

    // Hard tier: add cross-reference questions from nearby sections
    if (tier === 'hard') {
      var crossQ = getCrossReferenceQuestions(fid, 5);
      for (var cq = 0; cq < crossQ.length; cq++) {
        questions.push(crossQ[cq]);
        if (allAns.indexOf(crossQ[cq].answer) < 0) allAns.push(crossQ[cq].answer);
      }
    }

    if (!questions.length) { openActivity('stub', fid); return; }
    questions = shuffle(questions).slice(0, tier === 'hard' ? 30 : 20);
    var qi = 0, score = 0, points = 0, firstAttempt = true, hintsUsed = 0;

    function renderQ() {
      if (qi >= questions.length) { showResults(); return; }
      var q = questions[qi];
      var correct = q.answer;
      firstAttempt = true;
      hintsUsed = 0;
      // Pick distractors similar to the correct answer (same length range, alphabetic proximity)
      var candidates = allAns.filter(function (a) {
        return a.toLowerCase() !== correct.toLowerCase();
      });
      candidates.sort(function (a, b) {
        var aDiff = Math.abs(a.length - correct.length);
        var bDiff = Math.abs(b.length - correct.length);
        if (aDiff !== bDiff) return aDiff - bDiff;
        return Math.abs(a.charCodeAt(0) - correct.charCodeAt(0)) -
               Math.abs(b.charCodeAt(0) - correct.charCodeAt(0));
      });
      // Also add plausible words from the same verse if available
      if (q.source_quote) {
        var verseWords = q.source_quote.split(/\s+/).filter(function (w) {
          return w.length > 3 && w.toLowerCase() !== correct.toLowerCase() &&
                 w !== '______' && candidates.indexOf(w) < 0;
        });
        candidates = candidates.concat(shuffle(verseWords).slice(0, 3));
      }
      var others = candidates.slice(0, 3);
      if (others.length < 3) others = shuffle(candidates).slice(0, 3);
      var opts = shuffle([correct].concat(others));
      var colors = ['#2563eb', '#059669', '#7c3aed', '#d97706'];

      var h = '<div class="cloze-view">';
      var tierNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
      var tierColors = { easy: '#059669', medium: '#d97706', hard: '#dc2626' };
      h += '<div class="cloze-progress">' + (qi + 1) + ' of ' + questions.length +
        ' <span style="color:' + (tierColors[tier] || '#059669') + ';font-size:.85em">\u25CF ' + (tierNames[tier] || 'Easy') + '</span></div>';
      var clozeIdx = IDS.indexOf(fid);
      var clozeLabel = clozeIdx >= 0 ? LBL[clozeIdx].split(' \u2014 ')[0] : fid;
      h += '<div class="cloze-ref">' + clozeLabel + (q.ref ? ' ' + q.ref : '') + '</div>';
      if (audioMode) {
        h += '<div class="audio-gap-banner">\u{1F50A} Listen and tap the missing word</div>';
      }
      h += '<div class="cloze-prompt">' +
        q.prompt.replace('______', '<span class="cloze-blank">______</span>') + '</div>';
      h += '<button class="cloze-audio" id="b-cloze-hear">\u{1F50A} Listen</button>';
      h += '<button class="hint-btn" id="b-cloze-hint" aria-label="Get a hint">\u{1F4A1} Hint</button>';
      h += '<div class="hint-display" id="cloze-hint-display" role="status" aria-live="polite"></div>';
      h += '<div class="cloze-opts">';
      for (var o = 0; o < opts.length; o++) {
        h += '<button class="cloze-opt" data-val="' + opts[o] +
          '" style="background:' + colors[o % 4] + '" aria-label="Answer option: ' + opts[o] + '">' + opts[o] + '</button>';
      }
      h += '</div>';
      h += '<div class="cloze-feedback" id="cloze-fb" role="status" aria-live="polite"></div>';
      h += '<button class="study-btn" id="b-cloze-quit" style="margin-top:18px">Back to activities</button>';
      h += '</div>';

      document.getElementById('content').innerHTML = h;
      document.getElementById('b-cloze-quit').addEventListener('click', function () { go(fid); });
      document.getElementById('b-cloze-hear').addEventListener('click', function () {
        speakText(q.source_quote || q.prompt.replace('______', correct));
      });
      if (audioMode) {
        // Auto-play the passage with "blank" spoken at the missing word
        setTimeout(function () {
          speakText(q.prompt.replace('______', 'blank'));
        }, 400);
      }
      wireHintLadder('b-cloze-hint', 'cloze-hint-display', correct, q.source_quote, function (n) { hintsUsed = n; });
      var btns = document.querySelectorAll('.cloze-opt');
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
          var val = this.getAttribute('data-val');
          var fb = document.getElementById('cloze-fb');
          if (val.toLowerCase() === correct.toLowerCase()) {
            this.classList.add('cloze-correct');
            fb.innerHTML = '<span class="fb-correct">\u2714 Correct!</span>' +
              '<div class="cloze-source">' + (q.source_quote || '') + '</div>';
            if (firstAttempt) { score++; points += hintMultiplier(hintsUsed); }
            recordQuestionResult(fid, 'filblank', qi, firstAttempt);
            var all = document.querySelectorAll('.cloze-opt');
            for (var x = 0; x < all.length; x++) all[x].disabled = true;
            setTimeout(function () { qi++; renderQ(); }, 2200);
          } else {
            if (firstAttempt) {
              pushToRemixQueue({
                fid: fid, missedInMode: 'filblank', qIndex: qi,
                ref: q.ref || '', prompt: q.prompt, answer: correct,
                source_quote: q.source_quote || ''
              });
            }
            firstAttempt = false;
            this.classList.add('cloze-wrong');
            this.disabled = true;
            fb.innerHTML = '<span class="fb-try">Try another \u2192</span>';
          }
        });
      }
    }

    function showResults() {
      var pct = Math.round(score / questions.length * 100);
      var xpEarned = recordSession(fid, 'filblank', points, questions.length);
      var stats = getStats();
      var lvl = getLevel(stats.xp || 0);
      var mastery = getSectionMastery(fid);
      var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
      var msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good work!' : 'Keep studying!';
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">' + emoji + '</div>';
      h += '<div class="cr-score">' + score + ' / ' + questions.length + '</div>';
      h += '<div class="cr-pct">' + pct + '%</div>';
      if (mastery.badge) h += '<div class="cr-mastery">' + mastery.badge + ' ' + mastery.mastered + '/' + mastery.total + ' questions mastered</div>';
      h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
      h += '<div class="cr-level">' + lvl.current.icon + ' ' + lvl.current.name +
        ' \u2014 ' + (stats.xp || 0) + ' XP total</div>';
      h += '<div class="cr-msg">' + msg + '</div>';
      h += '<div class="cr-btns">';
      h += '<button class="study-btn sb-pri" id="b-cloze-retry">\u{1F504} Try Again</button>';
      var nextFid = pct >= 80 ? getNextSectionFid(fid) : null;
      if (nextFid) {
        var nextIdx = IDS.indexOf(nextFid);
        var nextLabel = nextIdx >= 0 ? LBL[nextIdx].split(' \u2014 ')[0] : '';
        h += '<button class="study-btn sb-pri" id="b-cloze-next">\u25B6 Next: ' + nextLabel + '</button>';
      }
      h += '<button class="study-btn" id="b-cloze-back">Back to activities</button>';
      h += '</div></div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-cloze-retry').addEventListener('click', function () { showFillBlank(fid); });
      if (nextFid) document.getElementById('b-cloze-next').addEventListener('click', function () { go(nextFid); });
      document.getElementById('b-cloze-back').addEventListener('click', function () { go(fid); });
    }

    renderQ();
  });
}

// ---- Multiple Choice quiz ----
function showMC(fid) {
  loadContent(fid).then(function (data) {
    var questions = [];
    var tier = getDifficultyTier(fid);

    // Easy tier: curated questions (prioritize unmastered)
    if (data && data.multiple_choice && data.multiple_choice.length) {
      var curated = data.multiple_choice.slice();
      var unmastered = getUnmasteredQuestions(fid, 'mc', curated);
      if (unmastered.length > 0 && tier === 'easy') {
        questions = shuffle(unmastered.map(function (u) { return u.q; }));
      } else {
        questions = shuffle(curated);
      }
    }

    // Medium tier: add smart algorithmic MC from same section
    if (tier !== 'easy' || questions.length < 5) {
      var verses = getVerses(fid);
      if (!verses.length) {
        fetch('../data/'+fid+'.json').then(function(r){return r.ok?r.json():null;}).then(function(d){
          if(d){CHAPTER_CACHE[fid]=d;showMC(fid);}else if(!questions.length){openActivity('stub',fid);}
        }).catch(function(){if(!questions.length) openActivity('stub',fid);});
        if (!questions.length) return;
      }
      var smartMC = generateSmartMC(fid, tier === 'hard' ? 10 : 8);
      for (var sm = 0; sm < smartMC.length; sm++) questions.push(smartMC[sm]);
    }

    // Hard tier: cross-reference MC from nearby sections
    if (tier === 'hard') {
      var idx = IDS.indexOf(fid);
      var nearby = [];
      for (var ni = Math.max(0, idx - 3); ni <= Math.min(IDS.length - 1, idx + 3); ni++) {
        if (ni !== idx) nearby.push(IDS[ni]);
      }
      for (var nn = 0; nn < nearby.length && questions.length < 20; nn++) {
        var crossMC = generateSmartMC(nearby[nn], 2);
        for (var cm = 0; cm < crossMC.length; cm++) {
          crossMC[cm].difficulty = 'hard';
          questions.push(crossMC[cm]);
        }
      }
    }

    if (!questions.length) { openActivity('stub', fid); return; }
    questions = shuffle(questions).slice(0, tier === 'hard' ? 30 : 20);
    var qi = 0, score = 0, points = 0, mcFirstAttempt = true, mcHintsUsed = 0;
    var mcColors = ['#dc2626', '#2563eb', '#059669', '#d97706'];

    function renderQ() {
      if (qi >= questions.length) { showResults(); return; }
      var q = questions[qi];
      mcFirstAttempt = true;
      mcHintsUsed = 0;

      var h = '<div class="mc-view">';
      var tierNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
      var tierColors = { easy: '#059669', medium: '#d97706', hard: '#dc2626' };
      h += '<div class="mc-progress">' + (qi + 1) + ' of ' + questions.length +
        ' <span style="color:' + (tierColors[tier] || '#059669') + ';font-size:.85em">\u25CF ' + (tierNames[tier] || 'Easy') + '</span></div>';
      var mcIdx = IDS.indexOf(fid);
      var mcLabel = mcIdx >= 0 ? LBL[mcIdx].split(' \u2014 ')[0] : fid;
      h += '<div class="mc-ref">' + mcLabel + (q.ref ? ' ' + q.ref : '') + '</div>';
      h += '<div class="mc-question">' + q.question + '</div>';
      h += '<button class="cloze-audio" id="b-mc-hear">\u{1F50A} Listen</button>';
      h += '<button class="hint-btn" id="b-mc-hint" aria-label="Get a hint">\u{1F4A1} Hint</button>';
      h += '<div class="hint-display" id="mc-hint-display" role="status" aria-live="polite"></div>';
      h += '<div class="mc-opts">';
      // Child mode: show only 3 options (correct + 2 distractors)
      var mcOpts = q.options.slice();
      if (childMode && mcOpts.length > 3) {
        var correctOpt = mcOpts[q.correct];
        var others = mcOpts.filter(function (_, i) { return i !== q.correct; });
        others = shuffle(others).slice(0, 2);
        mcOpts = shuffle([correctOpt].concat(others));
        // remap correct index
        q._childCorrect = mcOpts.indexOf(correctOpt);
      }
      for (var o = 0; o < mcOpts.length; o++) {
        h += '<button class="mc-opt" data-idx="' + o +
          '" style="background:' + mcColors[o % 4] + '" aria-label="Option ' + (o + 1) + ': ' + mcOpts[o] + '">' +
          mcOpts[o] + '</button>';
      }
      h += '</div>';
      h += '<div class="mc-feedback" id="mc-fb" role="status" aria-live="polite"></div>';
      h += '<button class="study-btn" id="b-mc-quit" style="margin-top:18px">Back to activities</button>';
      h += '</div>';

      document.getElementById('content').innerHTML = h;
      document.getElementById('b-mc-quit').addEventListener('click', function () { go(fid); });
      document.getElementById('b-mc-hear').addEventListener('click', function () {
        speakText(q.question);
      });
      var mcCorrectIdx = (q._childCorrect !== undefined) ? q._childCorrect : q.correct;
      var mcCorrectText = mcOpts[mcCorrectIdx];
      wireHintLadder('b-mc-hint', 'mc-hint-display', mcCorrectText, q.source_quote, function (n) { mcHintsUsed = n; });
      var btns = document.querySelectorAll('.mc-opt');
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
          var idx = parseInt(this.getAttribute('data-idx'));
          var fb = document.getElementById('mc-fb');
          var correctIdx = (q._childCorrect !== undefined) ? q._childCorrect : q.correct;
          if (idx === correctIdx) {
            this.classList.add('mc-correct');
            fb.innerHTML = '<span class="fb-correct">' + (childMode ? '\u{1F31F} Great job!' : '\u2714 Correct!') + '</span>' +
              '<div class="cloze-source">' + (q.source_quote || '') + '</div>';
            if (mcFirstAttempt) { score++; points += hintMultiplier(mcHintsUsed); }
            recordQuestionResult(fid, 'mc', qi, mcFirstAttempt);
            var all = document.querySelectorAll('.mc-opt');
            for (var x = 0; x < all.length; x++) all[x].disabled = true;
            setTimeout(function () { qi++; renderQ(); }, 2200);
          } else {
            if (mcFirstAttempt) {
              pushToRemixQueue({
                fid: fid, missedInMode: 'mc', qIndex: qi,
                ref: q.ref || '', question: q.question,
                options: mcOpts.slice(), correct: mcCorrectIdx,
                source_quote: q.source_quote || ''
              });
            }
            mcFirstAttempt = false;
            this.classList.add('mc-wrong');
            this.disabled = true;
            fb.innerHTML = '<span class="fb-try">Not quite \u2014 try another \u2192</span>';
          }
        });
      }
    }

    function showResults() {
      var pct = Math.round(score / questions.length * 100);
      var xpEarned = recordSession(fid, 'mc', points, questions.length);
      var stats = getStats();
      var lvl = getLevel(stats.xp || 0);
      var mastery = getSectionMastery(fid);
      var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
      var msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good work!' : 'Keep studying!';
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">' + emoji + '</div>';
      h += '<div class="cr-score">' + score + ' / ' + questions.length + '</div>';
      h += '<div class="cr-pct">' + pct + '%</div>';
      if (mastery.badge) h += '<div class="cr-mastery">' + mastery.badge + ' ' + mastery.mastered + '/' + mastery.total + ' questions mastered</div>';
      h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
      h += '<div class="cr-level">' + lvl.current.icon + ' ' + lvl.current.name +
        ' \u2014 ' + (stats.xp || 0) + ' XP total</div>';
      h += '<div class="cr-msg">' + msg + '</div>';
      h += '<div class="cr-btns">';
      h += '<button class="study-btn sb-pri" id="b-mc-retry">\u{1F504} Try Again</button>';
      var nextFid = pct >= 80 ? getNextSectionFid(fid) : null;
      if (nextFid) {
        var nextIdx = IDS.indexOf(nextFid);
        var nextLabel = nextIdx >= 0 ? LBL[nextIdx].split(' \u2014 ')[0] : '';
        h += '<button class="study-btn sb-pri" id="b-mc-next">\u25B6 Next: ' + nextLabel + '</button>';
      }
      h += '<button class="study-btn" id="b-mc-back">Back to activities</button>';
      h += '</div></div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-mc-retry').addEventListener('click', function () { showMC(fid); });
      if (nextFid) document.getElementById('b-mc-next').addEventListener('click', function () { go(nextFid); });
      document.getElementById('b-mc-back').addEventListener('click', function () { go(fid); });
    }

    renderQ();
  });
}

// ---- Flashcards with flip animation + confidence rating ----
function showFlashcards(fid) {
  loadContent(fid).then(function (data) {
    var cards = [];
    var idx = IDS.indexOf(fid);
    var secLabel = idx >= 0 ? LBL[idx] : fid;
    if (data && data.key_terms) {
      data.key_terms.forEach(function (t) {
        var context = findTermContextInCuratedData(t.term, data);
        var isProper = t.term && t.term[0] === t.term[0].toUpperCase() && t.term[0] !== t.term[0].toLowerCase();
        var backHtml = '';
        if (context) backHtml += '<div class="fc-context">"' + context + '"</div>';
        if (t.definition) backHtml += '<div class="fc-def">' + t.definition + '</div>';
        backHtml += '<div class="fc-prompt">' + termUsagePrompt(t.term, isProper) + '</div>';
        cards.push({
          front: t.term + (t.phonetic ? ' (' + t.phonetic + ')' : ''),
          back: backHtml,
          type: 'term'
        });
      });
    }
    if (data && data.fill_blank) {
      data.fill_blank.forEach(function (q) {
        cards.push({ front: secLabel + ' ' + q.ref, back: q.source_quote, type: 'verse' });
      });
    }
    // Algorithmic fallback: if no curated content, generate cards from chapter verses
    if (!cards.length) {
      var verses = getVerses(fid);
      if (!verses.length && CHAPTER_CACHE[fid]) { verses = getVerses(fid); }
      if (!verses.length) {
        // Try fetching chapter data first
        fetch('../data/' + fid + '.json').then(function(r){return r.ok?r.json():null;}).then(function(d){
          if(d){CHAPTER_CACHE[fid]=d;showFlashcards(fid);}else{openActivity('stub',fid);}
        }).catch(function(){openActivity('stub',fid);});
        return;
      }
      var usable = verses.filter(function(v){return v.length > 20 && v.length < 300;});
      usable = shuffle(usable).slice(0, 15);
      for (var v = 0; v < usable.length; v++) {
        var words = usable[v].split(/\s+/);
        var front = words.slice(0, Math.min(6, Math.ceil(words.length / 2))).join(' ') + '...';
        cards.push({ front: front, back: usable[v], type: 'verse' });
      }
    }
    if (!cards.length) { openActivity('stub', fid); return; }
    // Sort due cards first, then shuffle the rest
    var today = new Date().toISOString().slice(0, 10);
    var dueCards = [], otherCards = [];
    cards.forEach(function (c) {
      var stored = getOrCreateCard(fid, c.front, c.back, c.type);
      if (stored.nextReview <= today) dueCards.push(c);
      else otherCards.push(c);
    });
    cards = shuffle(dueCards).concat(shuffle(otherCards));
    var ci = 0, flipped = false;
    var ratings = [];
    var weakQueue = [];
    var sinceWeak = 0;

    function renderCard() {
      if (ci >= cards.length) { showSummary(); return; }
      var c = cards[ci];
      flipped = false;
      var typeColor = c.type === 'term' ? 'var(--vol6)' : 'var(--vol1)';
      var shortLabel = secLabel.split(' \u2014 ')[0];
      var typeLabel = c.type === 'term' ? 'KEY TERM' : shortLabel;

      var h = '<div class="fc-view">';
      h += '<div class="fc-progress">' + (ci + 1) + ' of ' + cards.length + '</div>';
      h += '<div class="fc-type" style="color:' + typeColor + '">' + typeLabel + '</div>';
      h += '<div class="fc-card" id="fc-card">';
      h += '<div class="fc-front" id="fc-front">' + c.front + '</div>';
      h += '<div class="fc-back" id="fc-back" style="display:none">' + c.back + '</div>';
      h += '</div>';
      h += '<button class="cloze-audio" id="b-fc-hear">\u{1F50A} Listen</button>';
      h += '<div class="fc-action" id="fc-action">';
      h += '<button class="study-btn sb-pri" id="b-fc-flip">\u{1F504} Flip to reveal</button>';
      h += '</div>';
      h += '<div class="fc-rate" id="fc-rate" style="display:none">';
      h += '<div class="fc-rate-label">How well did you know this?</div>';
      h += '<div class="fc-rate-btns">';
      var rLabels = ['Blank', 'Hard', 'Okay', 'Good', 'Easy'];
      var rColors = ['#dc2626', '#d97706', '#0891b2', '#059669', '#2563eb'];
      for (var r = 1; r <= 5; r++) {
        h += '<button class="fc-rate-btn" data-r="' + r +
          '" style="background:' + rColors[r - 1] + '" aria-label="Rate ' + r + ' out of 5: ' + rLabels[r - 1] + '">' +
          r + '<br><span class="fc-rate-sub">' + rLabels[r - 1] + '</span></button>';
      }
      h += '</div></div>';
      h += '<button class="study-btn" id="b-fc-quit" style="margin-top:18px">Back to activities</button>';
      h += '</div>';

      document.getElementById('content').innerHTML = h;

      document.getElementById('b-fc-quit').addEventListener('click', function () { go(fid); });
      document.getElementById('b-fc-hear').addEventListener('click', function () {
        speakText(flipped ? c.back : c.front);
      });

      document.getElementById('b-fc-flip').addEventListener('click', function () {
        flipped = true;
        document.getElementById('fc-front').style.display = 'none';
        document.getElementById('fc-back').style.display = '';
        document.getElementById('fc-card').classList.add('fc-flipped');
        document.getElementById('fc-action').style.display = 'none';
        document.getElementById('fc-rate').style.display = '';
      });

      var rBtns = document.querySelectorAll('.fc-rate-btn');
      for (var b = 0; b < rBtns.length; b++) {
        rBtns[b].addEventListener('click', function () {
          var r = parseInt(this.getAttribute('data-r'));
          ratings.push(r);
          // SM-2: update the card's schedule based on confidence rating
          var qualityMap = [0, 0, 1, 3, 4, 5]; // confidence 1-5 -> SM-2 quality 0-5
          var card = getOrCreateCard(fid, c.front, c.back, c.type);
          var updated = sm2(card, qualityMap[r]);
          updateCard(updated);
          // Weak card queue: cards rated 1-2 resurface after 3 more cards
          if (r <= 2) {
            weakQueue.push(cards[ci]);
          }
          sinceWeak++;
          ci++;
          // Re-insert a weak card after every 3 cards
          if (weakQueue.length > 0 && sinceWeak >= 3) {
            cards.splice(ci, 0, weakQueue.shift());
            sinceWeak = 0;
          }
          renderCard();
        });
      }
    }

    function showSummary() {
      var avg = ratings.reduce(function (a, b) { return a + b; }, 0) / ratings.length;
      var emoji = avg >= 4 ? '\u{1F3C6}' : avg >= 3 ? '\u{1F31F}' : '\u{1F4AA}';
      var msg = avg >= 4 ? 'You know this well!' : avg >= 3 ? 'Getting there!' : 'Keep practicing!';
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">' + emoji + '</div>';
      h += '<div class="cr-score">' + cards.length + ' cards reviewed</div>';
      h += '<div class="cr-pct">Average confidence: ' + avg.toFixed(1) + ' / 5</div>';
      h += '<div class="cr-msg">' + msg + '</div>';
      h += '<div class="cr-btns">';
      h += '<button class="study-btn sb-pri" id="b-fc-retry">\u{1F504} Again</button>';
      h += '<button class="study-btn" id="b-fc-back">Back to activities</button>';
      h += '</div></div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-fc-retry').addEventListener('click', function () { showFlashcards(fid); });
      document.getElementById('b-fc-back').addEventListener('click', function () { go(fid); });
    }

    renderCard();
  });
}

// ---- Memory Match — flip cards, find matching pairs ----
function showMemoryMatch(fid) {
  loadContent(fid).then(function (data) {
    if (!data || !data.key_terms || data.key_terms.length < 4) {
      // Algorithmic fallback: match first half of verse to second half
      var verses = getVerses(fid);
      if (!verses.length) {
        fetch('../data/'+fid+'.json').then(function(r){return r.ok?r.json():null;}).then(function(d){
          if(d){CHAPTER_CACHE[fid]=d;showMemoryMatch(fid);}else{openActivity('stub',fid);}
        }).catch(function(){openActivity('stub',fid);}); return;
      }
      var usable = verses.filter(function(v){return v.length>30&&v.length<150;});
      usable = shuffle(usable).slice(0, 6);
      if (usable.length < 4) { openActivity('stub', fid); return; }
      // Create fake key_terms from verse halves
      data = { key_terms: usable.map(function(v) {
        var words = v.split(/\s+/);
        var half = Math.ceil(words.length / 2);
        return { term: words.slice(0, half).join(' '), definition: words.slice(half).join(' ') + '.' };
      })};
    }
    // Use first 6 terms for a 4x3 grid (6 pairs = 12 cards)
    var terms = data.key_terms.slice(0, 6);
    var tiles = [];
    terms.forEach(function (t, i) {
      tiles.push({ id: i, side: 'term', text: t.term, pairId: i });
      tiles.push({ id: i, side: 'def', text: t.definition.split('.')[0] + '.', pairId: i });
    });
    tiles = shuffle(tiles);

    var flippedA = null, flippedB = null;
    var matched = 0, attempts = 0, locked = false;
    var tileColors = ['#ef4444', '#f97316', '#e91e90', '#16a34a', '#2563eb', '#ca8a04'];

    function render() {
      var h = '<div class="mm-view">';
      h += '<div class="mm-header">Match the term to its meaning</div>';
      h += '<div class="mm-stats">Pairs: ' + matched + '/' + terms.length +
        ' &nbsp; Attempts: ' + attempts + '</div>';
      h += '<div class="mm-grid">';
      for (var i = 0; i < tiles.length; i++) {
        var t = tiles[i];
        h += '<div class="mm-tile" data-idx="' + i + '">';
        h += '<div class="mm-tile-inner">';
        h += '<div class="mm-tile-front">?</div>';
        h += '<div class="mm-tile-back" style="background:' +
          tileColors[t.pairId % 6] + '">' + t.text + '</div>';
        h += '</div></div>';
      }
      h += '</div>';
      h += '<button class="study-btn" id="b-mm-back" style="margin-top:20px">Back to activities</button>';
      h += '</div>';

      document.getElementById('content').innerHTML = h;
      document.getElementById('b-mm-back').addEventListener('click', function () { go(fid); });

      var tileEls = document.querySelectorAll('.mm-tile');
      for (var i = 0; i < tileEls.length; i++) {
        tileEls[i].addEventListener('click', function () {
          if (locked) return;
          var idx = parseInt(this.getAttribute('data-idx'));
          var tile = tiles[idx];
          if (this.classList.contains('mm-matched') || this.classList.contains('mm-open')) return;

          this.classList.add('mm-open');
          // Strip verse references like (1:2) or (15:25) before speaking
          speakText(tile.text.replace(/\(\d+:\d+[^)]*\)/g, ''));

          if (flippedA === null) {
            flippedA = { idx: idx, tile: tile, el: this };
          } else {
            flippedB = { idx: idx, tile: tile, el: this };
            attempts++;
            locked = true;

            if (flippedA.tile.pairId === flippedB.tile.pairId &&
                flippedA.tile.side !== flippedB.tile.side) {
              // Match!
              flippedA.el.classList.add('mm-matched');
              flippedB.el.classList.add('mm-matched');
              matched++;
              updateStats();
              flippedA = null; flippedB = null;
              locked = false;
              if (matched === terms.length) {
                setTimeout(showWin, 600);
              }
            } else {
              // No match — flip back after delay
              var elA = flippedA.el, elB = flippedB.el;
              setTimeout(function () {
                elA.classList.remove('mm-open');
                elB.classList.remove('mm-open');
                flippedA = null; flippedB = null;
                locked = false;
                updateStats();
              }, 1000);
            }
          }
        });
      }
    }

    function updateStats() {
      var s = document.querySelector('.mm-stats');
      if (s) s.innerHTML = 'Pairs: ' + matched + '/' + terms.length +
        ' &nbsp; Attempts: ' + attempts;
    }

    function showWin() {
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">\u{1F3C6}</div>';
      h += '<div class="cr-score">All ' + terms.length + ' pairs matched!</div>';
      h += '<div class="cr-pct">in ' + attempts + ' attempts</div>';
      h += '<div class="cr-msg">' + (attempts <= terms.length + 2 ? 'Amazing memory!' :
        attempts <= terms.length * 2 ? 'Well done!' : 'Keep practicing!') + '</div>';
      h += '<div class="cr-btns">';
      h += '<button class="study-btn sb-pri" id="b-mm-retry">\u{1F504} Play Again</button>';
      h += '<button class="study-btn" id="b-mm-done">Back to activities</button>';
      h += '</div></div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-mm-retry').addEventListener('click', function () { showMemoryMatch(fid); });
      document.getElementById('b-mm-done').addEventListener('click', function () { go(fid); });
    }

    render();
  });
}

// ---- Listen & Learn — read chapter aloud verse by verse ----
function getVerses(fid) {
  var data = CHAPTER_CACHE[fid];
  if (!data) return [];
  var div = document.createElement('div');
  div.innerHTML = data.html;
  var paras = div.querySelectorAll('p.dp');
  var verses = [], anyTyped = false;
  for (var i = 0; i < paras.length; i++) {
    var pt = paras[i].getAttribute('data-ptype');
    if (pt) anyTyped = true;
    if (pt === 'verse') {
      var t = paras[i].textContent.trim();
      if (t) verses.push(t);
    }
  }
  if (!verses.length && !anyTyped) {
    for (var i = 0; i < paras.length; i++) {
      var t = paras[i].textContent.trim();
      if (t && t.length > 20) verses.push(t);
    }
  }
  return verses;
}

function showListenLearn(fid) {
  var verses = getVerses(fid);
  if (!verses.length) {
    // Data might not be cached yet — try fetching
    fetch('../data/' + fid + '.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d) { CHAPTER_CACHE[fid] = d; showListenLearn(fid); }
        else { openActivity('stub', fid); }
      }).catch(function () { openActivity('stub', fid); });
    return;
  }

  var vi = 0, playing = false, utterance = null;
  var idx = IDS.indexOf(fid);
  var label = idx >= 0 ? LBL[idx] : fid;

  function renderVerse() {
    var h = '<div class="ll-view">';
    h += '<div class="ll-header">Listen &amp; Learn</div>';
    h += '<div class="ll-section">' + label + '</div>';
    // Wrap each word in a span for word-by-word highlight during TTS
    var words = verses[vi].split(/(\s+)/);
    var wordHtml = '';
    var wIdx = 0;
    for (var w = 0; w < words.length; w++) {
      if (words[w].trim()) {
        wordHtml += '<span class="ll-word" data-w="' + wIdx + '">' + words[w] + '</span>';
        wIdx++;
      } else {
        wordHtml += words[w];
      }
    }
    h += '<div class="ll-card" id="ll-card">' + wordHtml + '</div>';
    h += '<div class="ll-progress">' + (vi + 1) + ' of ' + verses.length + '</div>';
    h += '<div class="ll-controls">';
    h += '<button class="ll-btn ll-prev" id="b-ll-prev">\u25C0 Prev</button>';
    h += '<button class="ll-btn ll-play" id="b-ll-play">\u25B6 Play</button>';
    h += '<button class="ll-btn ll-stop" id="b-ll-stop">\u25A0 Stop</button>';
    h += '<button class="ll-btn ll-next" id="b-ll-next">Next \u25B6</button>';
    h += '</div>';
    h += '<div class="ll-auto">';
    h += '<label><input type="checkbox" id="ll-autoplay" checked> Auto-advance to next verse</label>';
    h += '</div>';
    h += '<button class="study-btn" id="b-ll-back" style="margin-top:20px">Back to activities</button>';
    h += '</div>';

    document.getElementById('content').innerHTML = h;

    document.getElementById('b-ll-prev').addEventListener('click', function () {
      stopSpeech(); vi = Math.max(0, vi - 1); renderVerse();
    });
    document.getElementById('b-ll-next').addEventListener('click', function () {
      stopSpeech(); vi = Math.min(verses.length - 1, vi + 1); renderVerse();
    });
    document.getElementById('b-ll-play').addEventListener('click', function () {
      playVerse();
    });
    document.getElementById('b-ll-stop').addEventListener('click', function () {
      stopSpeech();
      this.textContent = '\u25A0 Stopped';
    });
    document.getElementById('b-ll-back').addEventListener('click', function () {
      stopSpeech(); go(fid);
    });
  }

  function playVerse() {
    if (!window.speechSynthesis) return;
    try { window.speechSynthesis.resume(); } catch (e) {}
    try { window.speechSynthesis.cancel(); } catch (e) {}
    var card = document.getElementById('ll-card');
    if (card) card.classList.add('ll-speaking');
    var btn = document.getElementById('b-ll-play');
    if (btn) btn.textContent = '\u{1F50A} Reading...';

    var ttsText = prepTTS(verses[vi]);
    utterance = new SpeechSynthesisUtterance(ttsText);
    utterance.rate = 1; utterance.lang = 'en-US'; utterance.volume = 1;
    var voice = getBestVoice();
    if (voice) utterance.voice = voice;

    // Word-by-word sync highlighting
    var wordSpans = card ? card.querySelectorAll('.ll-word') : [];
    var lastHighlight = null;
    utterance.onboundary = function (ev) {
      if (ev.name !== 'word' || !wordSpans.length) return;
      // Map charIndex in TTS text to word index
      var before = ttsText.slice(0, ev.charIndex);
      var wCount = before.split(/\s+/).filter(function (s) { return s.length > 0; }).length;
      if (wCount < wordSpans.length) {
        if (lastHighlight !== null && lastHighlight < wordSpans.length) {
          wordSpans[lastHighlight].classList.remove('ll-word-active');
        }
        wordSpans[wCount].classList.add('ll-word-active');
        lastHighlight = wCount;
      }
    };

    utterance.onend = function () {
      if (lastHighlight !== null && lastHighlight < wordSpans.length) {
        wordSpans[lastHighlight].classList.remove('ll-word-active');
      }
      if (card) card.classList.remove('ll-speaking');
      if (btn) btn.textContent = '\u25B6 Play';
      var auto = document.getElementById('ll-autoplay');
      if (auto && auto.checked && vi < verses.length - 1) {
        vi++;
        renderVerse();
        setTimeout(playVerse, 400);
      }
    };
    utterance.onerror = function (ev) {
      if (card) card.classList.remove('ll-speaking');
      if (btn) btn.textContent = '\u25B6 Play';
    };
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeech() {
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  }

  renderVerse();
}

// ---- Progress & Stats view ----
function showProgress(fid) {
  var s = getStats();
  var xp = s.xp || 0;
  var streak = s.streak || 0;
  var best = s.bestStreak || 0;
  var total = s.totalAnswered || 0;
  var lvl = getLevel(xp);
  var sessions = s.sessions || [];

  var h = '<div class="prog-view">';

  // Level card
  h += '<div class="prog-card prog-level" style="border-color:' +
    (lvl.current.name === 'Keeper of the Scroll' ? '#b8860b' :
     lvl.current.name === 'Guardian' ? '#7c3aed' :
     lvl.current.name === 'Scholar' ? '#2563eb' : '#6b7280') + '">';
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

  // Stats row
  h += '<div class="prog-stats">';
  h += '<div class="prog-stat" style="background:#ef4444"><div class="ps-val">' +
    (streak > 0 ? '\u{1F525}' : '') + ' ' + streak + '</div><div class="ps-label">Day Streak</div></div>';
  h += '<div class="prog-stat" style="background:#2563eb"><div class="ps-val">' +
    best + '</div><div class="ps-label">Best Streak</div></div>';
  h += '<div class="prog-stat" style="background:#059669"><div class="ps-val">' +
    sessions.length + '</div><div class="ps-label">Sessions</div></div>';
  h += '<div class="prog-stat" style="background:#7c3aed"><div class="ps-val">' +
    total + '</div><div class="ps-label">Answered</div></div>';
  h += '</div>';

  // Level roadmap
  h += '<div class="prog-card"><h3 class="prog-h3">Level Roadmap</h3>';
  for (var i = 0; i < LEVELS.length; i++) {
    var l = LEVELS[i];
    var reached = xp >= l.xp;
    h += '<div class="prog-road ' + (reached ? 'prog-reached' : '') + '">';
    h += '<span class="prog-road-icon">' + l.icon + '</span> ';
    h += '<span class="prog-road-name">' + l.name + '</span>';
    h += '<span class="prog-road-xp">' + l.xp + ' XP</span>';
    if (reached) h += ' <span class="prog-road-check">\u2714</span>';
    h += '</div>';
  }
  h += '</div>';

  // Recent sessions
  if (sessions.length > 0) {
    h += '<div class="prog-card"><h3 class="prog-h3">Recent Sessions</h3>';
    var recent = sessions.slice(-8).reverse();
    for (var r = 0; r < recent.length; r++) {
      var rs = recent[r];
      var ridx = IDS.indexOf(rs.fid);
      var rlbl = ridx >= 0 ? LBL[ridx].split(' \u2014 ')[0] : rs.fid;
      h += '<div class="prog-session">';
      h += '<span class="prog-ses-mode">' + rs.mode + '</span> ';
      h += '<span class="prog-ses-label">' + rlbl + '</span> ';
      h += '<span class="prog-ses-score">' + rs.score + '/' + rs.total + '</span>';
      h += '</div>';
    }
    h += '</div>';
  }

  h += '<div class="prog-card"><h3 class="prog-h3">Backup &amp; Restore</h3>';
  h += '<div style="display:flex;gap:10px;flex-wrap:wrap">';
  h += '<button class="study-btn" id="b-prog-export" style="background:#059669" aria-label="Export progress to file">\u{1F4E5} Export Progress</button>';
  h += '<button class="study-btn" id="b-prog-import" style="background:#2563eb" aria-label="Import progress from file">\u{1F4E4} Import Progress</button>';
  h += '</div>';
  h += '<input type="file" id="prog-file" accept=".json" style="display:none">';
  h += '<div id="prog-io-msg" role="status" aria-live="polite" style="margin-top:8px;font-size:13px;color:var(--text-muted);font-weight:700"></div>';
  h += '</div>';

  h += '<button class="study-btn" id="b-prog-back" style="margin-top:16px">Back to activities</button>';
  h += '</div>';

  document.getElementById('content').innerHTML = h;
  document.getElementById('b-prog-back').addEventListener('click', function () { go(fid); });

  document.getElementById('b-prog-export').addEventListener('click', function () {
    var exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      stats: getStats(),
      cards: getCards(),
      quizMastery: getQuizMastery(),
      notes: (function () { try { return JSON.parse(localStorage.getItem('acr_study_notes') || '{}'); } catch (e) { return {}; } })()
    };
    var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'acr-study-progress-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    document.getElementById('prog-io-msg').textContent = '\u2705 Progress exported successfully';
  });

  document.getElementById('b-prog-import').addEventListener('click', function () {
    document.getElementById('prog-file').click();
  });

  document.getElementById('prog-file').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var imported = JSON.parse(ev.target.result);
        if (!imported.version || !imported.stats) {
          document.getElementById('prog-io-msg').textContent = '\u274C Invalid file — not an ACR Study export';
          return;
        }
        if (imported.stats) {
          var current = getStats();
          imported.stats.xp = Math.max(current.xp || 0, imported.stats.xp || 0);
          imported.stats.bestStreak = Math.max(current.bestStreak || 0, imported.stats.bestStreak || 0);
          var currentSessions = current.sessions || [];
          var importedSessions = imported.stats.sessions || [];
          imported.stats.sessions = currentSessions.concat(importedSessions).slice(-100);
          saveStats(imported.stats);
        }
        if (imported.cards) {
          var currentCards = getCards();
          for (var id in imported.cards) {
            if (!currentCards[id] || imported.cards[id].reps > (currentCards[id].reps || 0)) {
              currentCards[id] = imported.cards[id];
            }
          }
          saveCards(currentCards);
        }
        if (imported.quizMastery) {
          var currentM = getQuizMastery();
          for (var key in imported.quizMastery) {
            if (!currentM[key] || imported.quizMastery[key].correct > (currentM[key].correct || 0)) {
              currentM[key] = imported.quizMastery[key];
            }
          }
          saveQuizMastery(currentM);
        }
        if (imported.notes) {
          var currentNotes = (function () { try { return JSON.parse(localStorage.getItem('acr_study_notes') || '{}'); } catch (e) { return {}; } })();
          for (var nk in imported.notes) {
            if (!currentNotes[nk]) currentNotes[nk] = imported.notes[nk];
          }
          try { localStorage.setItem('acr_study_notes', JSON.stringify(currentNotes)); } catch (e) {}
        }
        document.getElementById('prog-io-msg').textContent = '\u2705 Progress imported — merging with existing data';
        setTimeout(function () { showProgress(fid); }, 1500);
      } catch (err) {
        document.getElementById('prog-io-msg').textContent = '\u274C Error reading file: ' + err.message;
      }
    };
    reader.readAsText(file);
  });

  window.scrollTo(0, 0);
}

// ---- Verse Builder — tap scrambled words in order to rebuild a verse ----
function showVerseBuild(fid) {
  loadContent(fid).then(function (data) {
    var verses;
    if (data && data.fill_blank && data.fill_blank.length) {
      verses = data.fill_blank.map(function (q) { return { ref: q.ref, text: q.source_quote }; });
    } else {
      var rawVerses = getVerses(fid);
      if (!rawVerses.length) {
        fetch('../data/'+fid+'.json').then(function(r){return r.ok?r.json():null;}).then(function(d){
          if(d){CHAPTER_CACHE[fid]=d;showVerseBuild(fid);}else{openActivity('stub',fid);}
        }).catch(function(){openActivity('stub',fid);}); return;
      }
      var usable = rawVerses.filter(function(v){return v.split(/\s+/).length>=5&&v.split(/\s+/).length<=15;});
      usable = shuffle(usable).slice(0, 5);
      if (!usable.length) { openActivity('stub', fid); return; }
      verses = usable.map(function(v){ return { ref: '', text: v }; });
    }
    verses = shuffle(verses);
    var qi = 0, score = 0;

    function renderPuzzle() {
      if (qi >= Math.min(verses.length, 5)) { showResults(); return; }
      var v = verses[qi];
      var origWords = v.text.split(/\s+/).filter(function (w) { return w.length > 0; });
      var scrambled = shuffle(origWords.slice());
      var placed = [];

      function draw() {
        var h = '<div class="vb-view">';
        h += '<div class="vb-progress">' + (qi + 1) + ' of ' + Math.min(verses.length, 5) + '</div>';
        var vbIdx = IDS.indexOf(fid);
        var vbLabel = vbIdx >= 0 ? LBL[vbIdx] : fid;
        h += '<div class="vb-ref">' + vbLabel + ' \u2014 ' + v.ref + '</div>';
        h += '<div class="vb-placed" id="vb-placed">';
        for (var p = 0; p < placed.length; p++) {
          h += '<span class="vb-word vb-done" data-pi="' + p + '">' + placed[p] + '</span>';
        }
        if (placed.length < origWords.length) h += '<span class="vb-cursor">_</span>';
        h += '</div>';
        h += '<div class="vb-bank" id="vb-bank">';
        for (var s = 0; s < scrambled.length; s++) {
          var used = placed.indexOf(scrambled[s]) >= 0 && countIn(placed, scrambled[s]) >= countIn(scrambled.slice(0, s + 1), scrambled[s]);
          if (!used) {
            h += '<button class="vb-word vb-pick" data-si="' + s + '">' + scrambled[s] + '</button>';
          }
        }
        h += '</div>';
        h += '<div class="vb-btns">';
        h += '<button class="study-btn" id="b-vb-undo" style="background:#6b7280">\u21A9 Undo</button>';
        h += '<button class="cloze-audio" id="b-vb-hear">\u{1F50A} Listen</button>';
        h += '</div>';
        h += '<div id="vb-fb" class="cloze-feedback"></div>';
        h += '<button class="study-btn" id="b-vb-quit" style="margin-top:18px">Back to activities</button>';
        h += '</div>';
        document.getElementById('content').innerHTML = h;

        document.getElementById('b-vb-quit').addEventListener('click', function () { go(fid); });
        document.getElementById('b-vb-hear').addEventListener('click', function () { speakText(v.text); });
        document.getElementById('b-vb-undo').addEventListener('click', function () {
          if (placed.length > 0) { placed.pop(); draw(); }
        });

        var picks = document.querySelectorAll('.vb-pick');
        for (var i = 0; i < picks.length; i++) {
          picks[i].addEventListener('click', function () {
            var si = parseInt(this.getAttribute('data-si'));
            var word = scrambled[si];
            placed.push(word);
            // Check if correct so far
            var correct = true;
            for (var c = 0; c < placed.length; c++) {
              if (placed[c] !== origWords[c]) { correct = false; break; }
            }
            if (!correct) {
              placed.pop();
              this.classList.add('cloze-wrong');
              document.getElementById('vb-fb').innerHTML = '<span class="fb-try">Not that word \u2014 try another</span>';
              var self = this;
              setTimeout(function () { self.classList.remove('cloze-wrong'); }, 500);
            } else if (placed.length === origWords.length) {
              score++;
              document.getElementById('vb-fb').innerHTML = '<span class="fb-correct">\u2714 Perfect!</span>';
              setTimeout(function () { qi++; renderPuzzle(); }, 1500);
              draw();
            } else {
              draw();
            }
          });
        }
      }
      draw();
    }

    function countIn(arr, val) {
      var c = 0; for (var i = 0; i < arr.length; i++) if (arr[i] === val) c++; return c;
    }

    function showResults() {
      var pct = Math.round(score / Math.min(verses.length, 5) * 100);
      var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
      var xpEarned = recordSession(fid, 'versebuild', score, Math.min(verses.length, 5));
      var h = '<div class="cloze-results"><div class="cr-emoji">' + emoji + '</div>';
      h += '<div class="cr-score">' + score + ' / ' + Math.min(verses.length, 5) + '</div>';
      h += '<div class="cr-xp">+' + xpEarned + ' XP</div>';
      h += '<div class="cr-btns">';
      h += '<button class="study-btn sb-pri" id="b-vb-retry">\u{1F504} Again</button>';
      h += '<button class="study-btn" id="b-vb-back">Back to activities</button>';
      h += '</div></div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-vb-retry').addEventListener('click', function () { showVerseBuild(fid); });
      document.getElementById('b-vb-back').addEventListener('click', function () { go(fid); });
    }

    renderPuzzle();
  });
}

// ---- Word Match — tap term then tap its definition ----
function showWordMatch(fid) {
  loadContent(fid).then(function (data) {
    var terms;
    if (data && data.key_terms && data.key_terms.length >= 4) {
      terms = shuffle(data.key_terms.slice(0, 6));
    } else {
      // Algorithmic fallback: match first words of verse to rest
      var rawV = getVerses(fid);
      if (!rawV.length) {
        fetch('../data/'+fid+'.json').then(function(r){return r.ok?r.json():null;}).then(function(d){
          if(d){CHAPTER_CACHE[fid]=d;showWordMatch(fid);}else{openActivity('stub',fid);}
        }).catch(function(){openActivity('stub',fid);}); return;
      }
      var us = rawV.filter(function(v){return v.length>30&&v.length<150;});
      us = shuffle(us).slice(0, 6);
      if (us.length < 4) { openActivity('stub', fid); return; }
      terms = us.map(function(v) {
        var w = v.split(/\s+/);
        var h = Math.ceil(w.length / 2);
        return { term: w.slice(0, Math.min(4, h)).join(' ') + '...', definition: v };
      });
    }
    var defs = shuffle(terms.map(function (t) { return { term: t.term, def: t.definition.split('.')[0] + '.' }; }));
    var matched = 0, selectedTerm = null;

    function render() {
      var h = '<div class="wm-view">';
      h += '<div class="wm-header">Tap a term, then tap its meaning</div>';
      h += '<div class="wm-stats">Matched: ' + matched + ' / ' + terms.length + '</div>';
      h += '<div class="wm-cols">';
      h += '<div class="wm-col">';
      for (var i = 0; i < terms.length; i++) {
        var mClass = terms[i]._matched ? ' wm-done' : '';
        h += '<button class="wm-item wm-term' + mClass + '" data-t="' + i + '" style="border-left:4px solid ' +
          ['#2563eb','#dc2626','#059669','#7c3aed','#d97706','#0891b2'][i % 6] + '">' + terms[i].term + '</button>';
      }
      h += '</div><div class="wm-col">';
      for (var j = 0; j < defs.length; j++) {
        var dClass = defs[j]._matched ? ' wm-done' : '';
        h += '<button class="wm-item wm-def' + dClass + '" data-d="' + j + '">' + defs[j].def + '</button>';
      }
      h += '</div></div>';
      h += '<div id="wm-fb" class="cloze-feedback"></div>';
      h += '<button class="study-btn" id="b-wm-back" style="margin-top:16px">Back to activities</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-wm-back').addEventListener('click', function () { go(fid); });

      var termBtns = document.querySelectorAll('.wm-term:not(.wm-done)');
      var defBtns = document.querySelectorAll('.wm-def:not(.wm-done)');

      for (var t = 0; t < termBtns.length; t++) {
        termBtns[t].addEventListener('click', function () {
          document.querySelectorAll('.wm-term').forEach(function (b) { b.classList.remove('wm-selected'); });
          this.classList.add('wm-selected');
          selectedTerm = parseInt(this.getAttribute('data-t'));
          speakText(terms[selectedTerm].term);
        });
      }
      for (var d = 0; d < defBtns.length; d++) {
        defBtns[d].addEventListener('click', function () {
          if (selectedTerm === null) {
            document.getElementById('wm-fb').innerHTML = '<span class="fb-try">Tap a term first</span>';
            return;
          }
          var di = parseInt(this.getAttribute('data-d'));
          if (defs[di].term === terms[selectedTerm].term) {
            terms[selectedTerm]._matched = true;
            defs[di]._matched = true;
            matched++;
            if (matched === terms.length) {
              var xp = recordSession(fid, 'wordmatch', matched, terms.length);
              document.getElementById('wm-fb').innerHTML = '<span class="fb-correct">\u{1F3C6} All matched! +' + xp + ' XP</span>';
              setTimeout(function () { go(fid); }, 2000);
            } else {
              selectedTerm = null;
              render();
            }
          } else {
            this.classList.add('cloze-wrong');
            document.getElementById('wm-fb').innerHTML = '<span class="fb-try">Not a match \u2014 try again</span>';
            var self = this;
            setTimeout(function () { self.classList.remove('cloze-wrong'); }, 500);
          }
        });
      }
    }
    render();
  });
}

// ---- Challenge (Family Feud) mode — 4-6 player competitive quiz ----
function showChallenge(fid) {
  var secIdx = IDS.indexOf(fid);
  var secLabel = secIdx >= 0 ? LBL[secIdx].split(' \u2014 ')[0] : fid;
  var playerColors = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706', '#0891b2'];
  var playerCount = 4;

  function setupScreen() {
    var h = '<div class="ch-setup">';
    h += '<div class="ch-title">\u2694\uFE0F CHALLENGE</div>';
    h += '<div class="ch-subtitle">' + secLabel + '</div>';
    h += '<div class="ch-player-count"><label>Players:</label>';
    for (var n = 2; n <= 6; n++) {
      h += '<button class="ch-count-btn' + (n === playerCount ? ' ch-count-on' : '') + '" data-n="' + n + '">' + n + '</button>';
    }
    h += '</div>';
    h += '<div class="ch-players" id="ch-player-list">';
    for (var p = 1; p <= playerCount; p++) {
      h += '<div class="ch-player-input"><label>Player ' + p + '</label><input id="ch-p' + p + '" type="text" value="Player ' + p + '" maxlength="12" class="ch-name"></div>';
    }
    h += '</div>';
    h += '<button class="study-btn sb-pri" id="b-ch-start">Start Challenge \u25B6</button>';
    h += '<button class="study-btn" id="b-ch-back">Back to activities</button>';
    h += '</div>';
    document.getElementById('content').innerHTML = h;
    document.getElementById('b-ch-back').addEventListener('click', function () { go(fid); });
    var countBtns = document.querySelectorAll('.ch-count-btn');
    for (var cb = 0; cb < countBtns.length; cb++) {
      countBtns[cb].addEventListener('click', function () {
        playerCount = parseInt(this.getAttribute('data-n'));
        setupScreen();
      });
    }
    document.getElementById('b-ch-start').addEventListener('click', function () {
      var pNames = [];
      for (var i = 1; i <= playerCount; i++) {
        var el = document.getElementById('ch-p' + i);
        pNames.push(el ? (el.value.trim() || 'Player ' + i) : 'Player ' + i);
      }
      startGame(pNames);
    });
  }

  function startGame(playerNames) {
    var allQ = [];
    loadContent(fid).then(function (data) {
      if (data && data.fill_blank) {
        data.fill_blank.forEach(function (q) {
          var opts = [q.answer];
          var others = data.fill_blank.filter(function (o) { return o.answer !== q.answer; });
          others = shuffle(others).slice(0, 3);
          for (var i = 0; i < others.length; i++) opts.push(others[i].answer);
          opts = shuffle(opts);
          allQ.push({ question: q.prompt.replace('______', '___'), options: opts, correct: opts.indexOf(q.answer), source: q.source_quote || '' });
        });
      }
      if (data && data.multiple_choice) {
        data.multiple_choice.forEach(function (q) {
          allQ.push({ question: q.question, options: q.options.slice(), correct: q.correct, source: q.source_quote || '' });
        });
      }
      if (allQ.length < 5) {
        var verses = getVerses(fid);
        if (!verses.length) {
          fetch('../data/' + fid + '.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
            if (d) { CHAPTER_CACHE[fid] = d; showChallenge(fid); } else { openActivity('stub', fid); }
          }).catch(function () { openActivity('stub', fid); }); return;
        }
        var usable = verses.filter(function (v) { return v.length > 30 && v.length < 200; });
        usable = shuffle(usable).slice(0, 10);
        for (var vi = 0; vi < usable.length; vi++) {
          var words = usable[vi].split(/\s+/).filter(function (w) { return w.length > 3; });
          if (words.length < 4) continue;
          var bIdx = Math.floor(Math.random() * (words.length - 2)) + 1;
          var ans = words[bIdx].replace(/[.,;:!?]/g, '');
          var prompt = usable[vi].replace(new RegExp('\\b' + ans.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), '___');
          if (prompt === usable[vi]) continue;
          var dOpts = [ans];
          var dWords = shuffle(words.filter(function (w) { return w.replace(/[.,;:!?]/g, '') !== ans && w.length > 3; })).slice(0, 3);
          for (var di = 0; di < dWords.length; di++) dOpts.push(dWords[di].replace(/[.,;:!?]/g, ''));
          dOpts = shuffle(dOpts);
          allQ.push({ question: prompt, options: dOpts, correct: dOpts.indexOf(ans), source: usable[vi] });
        }
      }
      if (allQ.length < 2) { openActivity('stub', fid); return; }
      allQ = shuffle(allQ).slice(0, Math.max(50, playerNames.length * 10));
      runGame(playerNames, allQ);
    });
  }

  function runGame(names, questions) {
    var scores = [];
    for (var si = 0; si < names.length; si++) scores.push(0);
    var currentPlayer = 0;
    var qi = 0;
    var strikes = 0;
    var timer = null;
    var timeLeft = 0;

    function nextPlayer() {
      currentPlayer = (currentPlayer + 1) % names.length;
    }

    function renderQuestion() {
      if (qi >= questions.length) { showFinalResults(); return; }
      var q = questions[qi];
      timeLeft = 20;
      strikes = 0;

      var h = '<div class="ch-game">';
      h += '<div class="ch-scorebar">';
      for (var s = 0; s < names.length; s++) {
        h += '<div class="ch-p' + (s === currentPlayer ? ' ch-p-active' : '') + '" style="background:' + playerColors[s % 6] + '"><div class="ch-pname">' + names[s] + '</div><div class="ch-pscore">' + scores[s] + '</div></div>';
      }
      h += '</div>';
      h += '<div class="ch-timer" id="ch-timer">' + timeLeft + '</div>';
      h += '<div class="ch-turn" style="color:' + playerColors[currentPlayer % 6] + '">' + names[currentPlayer] + "&#39;s turn</div>";
      h += '<div class="ch-round">Round ' + (qi + 1) + ' of ' + questions.length + '</div>';
      h += '<div class="ch-question">' + q.question + '</div>';
      h += '<div class="ch-strikes" id="ch-strikes"></div>';
      h += '<div class="ch-opts">';
      for (var o = 0; o < q.options.length; o++) {
        h += '<button class="ch-opt" data-idx="' + o + '" style="background:' + ['#2563eb', '#059669', '#7c3aed', '#d97706'][o % 4] + '">' + q.options[o] + '</button>';
      }
      h += '</div>';
      h += '<div class="ch-fb" id="ch-fb"></div>';
      h += '<button class="study-btn" id="b-ch-quit" style="margin-top:14px">Back to activities</button>';
      h += '</div>';

      document.getElementById('content').innerHTML = h;
      document.getElementById('b-ch-quit').addEventListener('click', function () { clearInterval(timer); go(fid); });

      var timerEl = document.getElementById('ch-timer');
      timer = setInterval(function () {
        timeLeft--;
        if (timerEl) timerEl.textContent = timeLeft;
        if (timeLeft <= 5 && timerEl) timerEl.style.color = '#dc2626';
        if (timeLeft <= 0) {
          clearInterval(timer);
          nextPlayer();
          scores[currentPlayer] += 50;
          document.getElementById('ch-fb').innerHTML = '<span class="fb-try">Time up! ' + names[currentPlayer] + ' gets 50 pts</span>';
          setTimeout(function () { qi++; currentPlayer = qi % names.length; renderQuestion(); }, 2000);
        }
      }, 1000);

      var optBtns = document.querySelectorAll('.ch-opt');
      for (var b = 0; b < optBtns.length; b++) {
        optBtns[b].addEventListener('click', function () {
          var idx = parseInt(this.getAttribute('data-idx'));
          var fb = document.getElementById('ch-fb');
          if (idx === q.correct) {
            clearInterval(timer);
            this.classList.add('cloze-correct');
            var pts = Math.max(10, timeLeft * 5);
            scores[currentPlayer] += pts;
            fb.innerHTML = '<span class="fb-correct">\u2714 ' + names[currentPlayer] + ' +' + pts + ' pts!</span>';
            var all = document.querySelectorAll('.ch-opt'); for (var x = 0; x < all.length; x++) all[x].disabled = true;
            setTimeout(function () { qi++; currentPlayer = qi % names.length; renderQuestion(); }, 2000);
          } else {
            this.classList.add('cloze-wrong');
            this.disabled = true;
            strikes++;
            var strikesEl = document.getElementById('ch-strikes');
            strikesEl.innerHTML = '\u274C'.repeat(strikes);
            if (strikes >= 3) {
              clearInterval(timer);
              nextPlayer();
              fb.innerHTML = '<span class="fb-try">3 strikes! ' + names[currentPlayer] + ' can steal!</span>';
            } else {
              fb.innerHTML = '<span class="fb-try">Strike ' + strikes + '! Try again</span>';
            }
          }
        });
      }
    }

    function showFinalResults() {
      var maxScore = Math.max.apply(null, scores);
      var winners = [];
      for (var w = 0; w < names.length; w++) { if (scores[w] === maxScore) winners.push(names[w]); }
      var winnerText = winners.length > 1 ? 'Tie: ' + winners.join(' & ') : winners[0] + ' wins!';
      var xpEarned = recordSession(fid, 'challenge', maxScore, questions.length * 100);
      var h = '<div class="ch-results">';
      h += '<div class="cr-emoji">\u{1F3C6}</div>';
      h += '<div class="ch-winner">' + winnerText + '</div>';
      h += '<div class="ch-final-scores">';
      var sorted = [];
      for (var fi = 0; fi < names.length; fi++) sorted.push({ name: names[fi], score: scores[fi], color: playerColors[fi % 6] });
      sorted.sort(function (a, b) { return b.score - a.score; });
      for (var ri = 0; ri < sorted.length; ri++) {
        h += '<div class="ch-final-p" style="border-color:' + sorted[ri].color + '">';
        h += '<span class="ch-final-rank">' + (ri + 1) + '</span> ' + sorted[ri].name;
        h += '<br><span class="ch-final-pts">' + sorted[ri].score + '</span></div>';
      }
      h += '</div>';
      h += '<div class="cr-xp">+' + xpEarned + ' XP</div>';
      h += '<div class="cr-btns">';
      h += '<button class="study-btn sb-pri" id="b-ch-again">\u{1F504} Rematch</button>';
      h += '<button class="study-btn" id="b-ch-done">Back to activities</button>';
      h += '</div></div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-ch-again').addEventListener('click', function () { showChallenge(fid); });
      document.getElementById('b-ch-done').addEventListener('click', function () { go(fid); });
    }

    renderQuestion();
  }

  setupScreen();
}

// ---- Who Said It — match curated dialogue to speaker ----
function showWhoSaidIt(fid) {
  loadContent(fid).then(function (data) {
    var quotes = extractSpeakerQuotesFromCurated(data);
    if (quotes.length < 4) { openActivity('stub', fid); return; }
    var idx = IDS.indexOf(fid);
    var secLabel = idx >= 0 ? LBL[idx].split(' \u2014 ')[0] : fid;
    var speakerPool = [];
    quotes.forEach(function (q) {
      if (speakerPool.indexOf(q.speaker) === -1) speakerPool.push(q.speaker);
    });

    var questions = shuffle(quotes.slice()).slice(0, 15);
    var qi = 0, score = 0, points = 0, firstAttempt = true, hintsUsed = 0;
    var mcColors = ['#dc2626', '#2563eb', '#059669', '#d97706'];

    function renderQ() {
      if (qi >= questions.length) { showResults(); return; }
      var q = questions[qi];
      firstAttempt = true;
      hintsUsed = 0;
      var distractors = shuffle(speakerPool.filter(function (s) { return s !== q.speaker; })).slice(0, 3);
      while (distractors.length < 3) distractors.push('\u2014');
      var opts = shuffle([q.speaker].concat(distractors));
      var correctIdx = opts.indexOf(q.speaker);

      var h = '<div class="mc-view">';
      h += '<div class="whosaidit-banner">\u{1F4AC} Who Said It</div>';
      h += '<div class="mc-ref">' + secLabel + '</div>';
      h += '<div class="mc-question">Who said: <em>"' + q.quote + '"</em></div>';
      h += '<button class="cloze-audio" id="b-ws-hear">\u{1F50A} Listen</button>';
      h += '<button class="hint-btn" id="b-ws-hint" aria-label="Get a hint">\u{1F4A1} Hint</button>';
      h += '<div class="hint-display" id="ws-hint-display" role="status" aria-live="polite"></div>';
      h += '<div class="mc-opts">';
      for (var o = 0; o < opts.length; o++) {
        h += '<button class="mc-opt" data-idx="' + o + '" style="background:' + mcColors[o % 4] + '" aria-label="Option ' + (o + 1) + ': ' + opts[o] + '">' + opts[o] + '</button>';
      }
      h += '</div>';
      h += '<div class="mc-feedback" id="ws-fb" role="status" aria-live="polite"></div>';
      h += '<button class="study-btn" id="b-ws-quit" style="margin-top:18px">Back to activities</button>';
      h += '</div>';

      document.getElementById('content').innerHTML = h;
      document.getElementById('b-ws-quit').addEventListener('click', function () { go(fid); });
      document.getElementById('b-ws-hear').addEventListener('click', function () { speakText(q.quote); });
      wireHintLadder('b-ws-hint', 'ws-hint-display', q.speaker, q.quote, function (n) { hintsUsed = n; });
      var btns = document.querySelectorAll('.mc-opt');
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
          var idx2 = parseInt(this.getAttribute('data-idx'));
          var fb = document.getElementById('ws-fb');
          if (idx2 === correctIdx) {
            this.classList.add('mc-correct');
            fb.innerHTML = '<span class="fb-correct">\u2714 Correct!</span>' +
              '<div class="cloze-source">\u201C' + q.quote + '\u201D \u2014 ' + q.speaker + '</div>';
            if (firstAttempt) { score++; points += hintMultiplier(hintsUsed); }
            recordQuestionResult(fid, 'whosaidit', qi, firstAttempt);
            var all = document.querySelectorAll('.mc-opt');
            for (var x = 0; x < all.length; x++) all[x].disabled = true;
            setTimeout(function () { qi++; renderQ(); }, 2200);
          } else {
            if (firstAttempt) {
              pushToRemixQueue({
                fid: fid, missedInMode: 'whosaidit', qIndex: qi,
                ref: '', question: 'Who said: "' + q.quote + '"?',
                options: opts.slice(), correct: correctIdx,
                answer: q.speaker, source_quote: q.quote
              });
            }
            firstAttempt = false;
            this.classList.add('mc-wrong');
            this.disabled = true;
            fb.innerHTML = '<span class="fb-try">Not quite \u2014 try another \u2192</span>';
          }
        });
      }
    }

    function showResults() {
      var pct = Math.round(score / questions.length * 100);
      var xpEarned = recordSession(fid, 'whosaidit', points, questions.length);
      var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
      var msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good work!' : 'Listen closer!';
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">' + emoji + '</div>';
      h += '<div class="cr-score">' + score + ' / ' + questions.length + '</div>';
      h += '<div class="cr-pct">' + pct + '%</div>';
      h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
      h += '<div class="cr-msg">' + msg + '</div>';
      h += '<button class="study-btn sb-pri" id="b-ws-retry">\u{1F504} Try Again</button>';
      h += '<button class="study-btn" id="b-ws-back">Back to activities</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-ws-retry').addEventListener('click', function () { showWhoSaidIt(fid); });
      document.getElementById('b-ws-back').addEventListener('click', function () { go(fid); });
    }

    renderQ();
  });
}

// ---- True or False with Why ----
function generateTrueFalseFromCurated(data, count) {
  count = count || 10;
  if (!data || !data.key_terms || data.key_terms.length < 3) return [];
  var sources = [];
  if (data.fill_blank) data.fill_blank.forEach(function (q) { if (q.source_quote) sources.push(q.source_quote); });
  if (data.multiple_choice) data.multiple_choice.forEach(function (q) { if (q.source_quote) sources.push(q.source_quote); });
  if (!sources.length) return [];

  var termByLower = {};
  for (var t = 0; t < data.key_terms.length; t++) {
    termByLower[data.key_terms[t].term.toLowerCase()] = data.key_terms[t].term;
  }

  var candidates = [];
  for (var i = 0; i < sources.length; i++) {
    var sentences = sources[i].match(/[^.!?]+[.!?]+/g) || [sources[i]];
    for (var s = 0; s < sentences.length; s++) {
      var sent = sentences[s].trim();
      if (sent.length < 20 || sent.length > 220) continue;
      var words = sent.split(/\s+/);
      for (var w = 0; w < words.length; w++) {
        var clean = words[w].replace(/[^a-zA-Z\u00C0-\u024F]/g, '');
        if (clean.length < 3) continue;
        if (clean[0] !== clean[0].toUpperCase() || clean[0] === clean[0].toLowerCase()) continue;
        var canonical = termByLower[clean.toLowerCase()];
        if (canonical) {
          candidates.push({ sentence: sent, term: canonical, source: sources[i] });
          break;
        }
      }
    }
  }
  if (candidates.length < 3) return [];
  candidates = shuffle(candidates.slice());

  var questions = [];
  var used = {};
  for (var c = 0; c < candidates.length && questions.length < count; c++) {
    var cand = candidates[c];
    var key = cand.sentence.slice(0, 50);
    if (used[key]) continue;
    used[key] = true;
    var makeTrue = (questions.length % 2 === 0);
    if (makeTrue) {
      questions.push({ statement: cand.sentence, answer: true, source: cand.source, originalTerm: cand.term });
    } else {
      var others = data.key_terms.filter(function (kt) {
        return kt.term.toLowerCase() !== cand.term.toLowerCase() &&
          kt.term[0] === kt.term[0].toUpperCase() && kt.term[0] !== kt.term[0].toLowerCase();
      });
      if (!others.length) continue;
      var altTerm = shuffle(others.slice())[0].term;
      var re = new RegExp('\\b' + cand.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
      var wrong = cand.sentence.replace(re, altTerm);
      if (wrong === cand.sentence) continue;
      questions.push({ statement: wrong, answer: false, source: cand.source, originalTerm: cand.term, wrongTerm: altTerm });
    }
  }
  return questions;
}

function showTrueFalse(fid) {
  loadContent(fid).then(function (data) {
    var questions = generateTrueFalseFromCurated(data, 12);
    if (questions.length < 3) { openActivity('stub', fid); return; }
    var idx = IDS.indexOf(fid);
    var secLabel = idx >= 0 ? LBL[idx].split(' \u2014 ')[0] : fid;
    var qi = 0, score = 0, points = 0, firstAttempt = true;

    function renderQ() {
      if (qi >= questions.length) { showResults(); return; }
      var q = questions[qi];
      firstAttempt = true;

      var h = '<div class="mc-view">';
      h += '<div class="tf-banner">\u2696\uFE0F True or False with Why \u2014 ' + (qi + 1) + ' of ' + questions.length + '</div>';
      h += '<div class="mc-ref">' + secLabel + '</div>';
      h += '<div class="tf-statement">' + q.statement + '</div>';
      h += '<button class="cloze-audio" id="b-tf-hear">\u{1F50A} Listen</button>';
      h += '<div class="tf-opts">';
      h += '<button class="tf-opt tf-true" data-val="true">\u2714 True</button>';
      h += '<button class="tf-opt tf-false" data-val="false">\u2718 False</button>';
      h += '</div>';
      h += '<div class="mc-feedback" id="tf-fb" role="status" aria-live="polite"></div>';
      h += '<button class="study-btn" id="b-tf-quit" style="margin-top:18px">Back to activities</button>';
      h += '</div>';

      document.getElementById('content').innerHTML = h;
      document.getElementById('b-tf-quit').addEventListener('click', function () { go(fid); });
      document.getElementById('b-tf-hear').addEventListener('click', function () { speakText(q.statement); });

      var btns = document.querySelectorAll('.tf-opt');
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
          var val = this.getAttribute('data-val') === 'true';
          var fb = document.getElementById('tf-fb');
          if (val === q.answer) {
            this.classList.add('mc-correct');
            var whyHtml = '<div class="tf-why"><strong>Why:</strong> ' + q.source + '</div>';
            if (!q.answer) {
              whyHtml += '<div class="tf-why-note">The statement swapped <em>' + q.originalTerm + '</em> with <em>' + q.wrongTerm + '</em>.</div>';
            }
            fb.innerHTML = '<span class="fb-correct">\u2714 Correct!</span>' + whyHtml;
            if (firstAttempt) { score++; points += 1.0; }
            recordQuestionResult(fid, 'truefalse', qi, firstAttempt);
            var all = document.querySelectorAll('.tf-opt');
            for (var x = 0; x < all.length; x++) all[x].disabled = true;
            setTimeout(function () { qi++; renderQ(); }, 3600);
          } else {
            if (firstAttempt) {
              pushToRemixQueue({
                fid: fid, missedInMode: 'truefalse', qIndex: qi,
                ref: '', question: 'True or False: ' + q.statement,
                options: ['True', 'False'], correct: q.answer ? 0 : 1,
                answer: q.answer ? 'True' : 'False', source_quote: q.source
              });
            }
            firstAttempt = false;
            this.classList.add('mc-wrong');
            this.disabled = true;
            fb.innerHTML = '<span class="fb-try">Not quite \u2014 try the other one.</span>';
          }
        });
      }
    }

    function showResults() {
      var pct = Math.round(score / questions.length * 100);
      var xpEarned = recordSession(fid, 'truefalse', points, questions.length);
      var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
      var msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good work!' : 'Read closer!';
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">' + emoji + '</div>';
      h += '<div class="cr-score">' + score + ' / ' + questions.length + '</div>';
      h += '<div class="cr-pct">' + pct + '%</div>';
      h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
      h += '<div class="cr-msg">' + msg + '</div>';
      h += '<button class="study-btn sb-pri" id="b-tf-retry">\u{1F504} Try Again</button>';
      h += '<button class="study-btn" id="b-tf-back">Back to activities</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-tf-retry').addEventListener('click', function () { showTrueFalse(fid); });
      document.getElementById('b-tf-back').addEventListener('click', function () { go(fid); });
    }

    renderQ();
  });
}

// ---- Story Sequence — reorder scrambled curated events ----
function generateSequenceFromCurated(data, count) {
  count = count || 6;
  if (!data || !data.fill_blank || data.fill_blank.length < 3) return [];
  // fill_blank items already carry ref (e.g. "1:3") so we can order by
  // numeric ref when available, otherwise keep authored order.
  var items = data.fill_blank.slice().filter(function (q) { return q.source_quote && q.source_quote.length > 20; });
  if (items.length < 3) return [];
  items.sort(function (a, b) {
    var ar = parseRef(a.ref), br = parseRef(b.ref);
    if (ar === null || br === null) return 0;
    return ar - br;
  });
  // Downsample to `count`, keeping original order
  var step = Math.max(1, Math.floor(items.length / count));
  var events = [];
  for (var i = 0; i < items.length && events.length < count; i += step) {
    var text = items[i].source_quote;
    if (text.length > 200) text = text.slice(0, 197) + '...';
    events.push({ order: events.length, text: text, ref: items[i].ref || '' });
  }
  return events;
}

function parseRef(ref) {
  if (!ref) return null;
  var m = ref.match(/(\d+)(?::(\d+))?/);
  if (!m) return null;
  return parseInt(m[1]) * 1000 + (m[2] ? parseInt(m[2]) : 0);
}

function showStorySequence(fid) {
  loadContent(fid).then(function (data) {
    var events = generateSequenceFromCurated(data, 6);
    if (events.length < 3) { openActivity('stub', fid); return; }
    var idx = IDS.indexOf(fid);
    var secLabel = idx >= 0 ? LBL[idx].split(' \u2014 ')[0] : fid;
    var shuffled = shuffle(events.slice());
    var picked = [];
    var attempts = 0, finished = false;

    function render() {
      var h = '<div class="cloze-view">';
      h += '<div class="seq-banner">\u{1F501} Story Sequence \u2014 tap events in the order they happen</div>';
      h += '<div class="cloze-ref">' + secLabel + '</div>';
      h += '<div class="seq-slots">';
      for (var i = 0; i < events.length; i++) {
        var slotNum = i + 1;
        if (i < picked.length) {
          var ev = events.find(function (e) { return e.order === picked[i]; });
          h += '<div class="seq-slot seq-slot-filled" data-slot="' + i + '"><span class="seq-num">' + slotNum + '</span><span class="seq-text">' + ev.text + '</span><button class="seq-remove" data-slot="' + i + '" aria-label="Remove">\u2715</button></div>';
        } else {
          h += '<div class="seq-slot seq-slot-empty"><span class="seq-num">' + slotNum + '</span><span class="seq-placeholder">Tap an event below</span></div>';
        }
      }
      h += '</div>';
      h += '<div class="seq-pool-label">Available events:</div>';
      h += '<div class="seq-pool">';
      for (var p = 0; p < shuffled.length; p++) {
        if (picked.indexOf(shuffled[p].order) !== -1) continue;
        h += '<button class="seq-pool-item" data-order="' + shuffled[p].order + '">' + shuffled[p].text + '</button>';
      }
      h += '</div>';
      h += '<div class="seq-actions">';
      if (picked.length === events.length && !finished) {
        h += '<button class="study-btn sb-pri" id="b-seq-check">\u2714 Check order</button>';
      }
      h += '<button class="study-btn" id="b-seq-quit">Back to activities</button>';
      h += '</div>';
      h += '<div class="mc-feedback" id="seq-fb" role="status" aria-live="polite"></div>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;

      document.getElementById('b-seq-quit').addEventListener('click', function () { go(fid); });
      var poolBtns = document.querySelectorAll('.seq-pool-item');
      for (var pb = 0; pb < poolBtns.length; pb++) {
        poolBtns[pb].addEventListener('click', function () {
          picked.push(parseInt(this.getAttribute('data-order')));
          render();
        });
      }
      var removeBtns = document.querySelectorAll('.seq-remove');
      for (var rb = 0; rb < removeBtns.length; rb++) {
        removeBtns[rb].addEventListener('click', function (e) {
          e.stopPropagation();
          picked.splice(parseInt(this.getAttribute('data-slot')), 1);
          render();
        });
      }
      var checkBtn = document.getElementById('b-seq-check');
      if (checkBtn) {
        checkBtn.addEventListener('click', function () {
          attempts++;
          var correct = 0;
          for (var i = 0; i < picked.length; i++) if (picked[i] === i) correct++;
          var fb = document.getElementById('seq-fb');
          if (correct === events.length) {
            finished = true;
            var pts = attempts === 1 ? 1.0 : attempts === 2 ? 0.7 : 0.4;
            var xpEarned = recordSession(fid, 'sequence', pts, 1);
            fb.innerHTML = '<div class="fb-correct">\u{1F389} Perfect order! (+' + Math.round(pts * 10) + ' XP)</div>';
            setTimeout(function () { go(fid); }, 2800);
          } else {
            if (attempts === 1) {
              pushToRemixQueue({
                fid: fid, missedInMode: 'sequence', qIndex: 0, ref: '',
                question: 'Put these ' + events.length + ' events in order',
                options: events.map(function (e) { return e.text; }), correct: 0,
                answer: events[0].text, source_quote: ''
              });
            }
            fb.innerHTML = '<div class="fb-try">' + correct + ' of ' + events.length + ' in the right spot. Move the wrong ones and check again.</div>';
          }
        });
      }
    }
    render();
  });
}

// ---- Cause and Effect Match ----
function extractCauseEffectFromCurated(data) {
  if (!data) return [];
  var sources = [];
  if (data.fill_blank) data.fill_blank.forEach(function (q) { if (q.source_quote) sources.push(q.source_quote); });
  if (data.multiple_choice) data.multiple_choice.forEach(function (q) { if (q.source_quote) sources.push(q.source_quote); });
  if (data.faq) data.faq.forEach(function (q) { if (q.answer && q.answer.length > 40) sources.push(q.answer); });
  if (!sources.length) return [];

  var p1 = /([A-Z][^.!?]{15,140})\s+because\s+([^.!?]{10,140})[.!?]/g;
  var p2 = /([A-Z][^.!?]{15,140}),?\s+(?:so|therefore|thus|hence)\s+([^.!?]{10,140})[.!?]/g;
  var p3 = /([A-Z][^.!?]{15,140})\s+(?:led to|caused|brought about|resulted in)\s+([^.!?]{10,140})[.!?]/g;
  var p4 = /Because\s+([^,]{10,140}),\s+([^.!?]{10,140})[.!?]/g;

  var pairs = [];
  var seen = {};
  function trim(s) { return s.replace(/\s+/g, ' ').trim(); }
  function add(cause, effect, source) {
    cause = trim(cause);
    effect = trim(effect);
    if (cause.length < 10 || effect.length < 10) return;
    if (cause.length > 120) cause = cause.slice(0, 117) + '...';
    if (effect.length > 120) effect = effect.slice(0, 117) + '...';
    var key = (cause + '|' + effect).toLowerCase().slice(0, 80);
    if (seen[key]) return;
    seen[key] = true;
    pairs.push({ cause: cause, effect: effect, source: source });
  }
  for (var s = 0; s < sources.length; s++) {
    var text = sources[s];
    var m;
    p1.lastIndex = 0; while ((m = p1.exec(text)) !== null) add(m[2], m[1], text);
    p2.lastIndex = 0; while ((m = p2.exec(text)) !== null) add(m[1], m[2], text);
    p3.lastIndex = 0; while ((m = p3.exec(text)) !== null) add(m[1], m[2], text);
    p4.lastIndex = 0; while ((m = p4.exec(text)) !== null) add(m[1], m[2], text);
  }
  return pairs;
}

function showCauseEffect(fid) {
  loadContent(fid).then(function (data) {
    var pairs = extractCauseEffectFromCurated(data);
    if (pairs.length < 3) { openActivity('stub', fid); return; }
    pairs = shuffle(pairs.slice()).slice(0, 5);
    var effectOrder = shuffle(pairs.map(function (_, i) { return i; }));
    var idx = IDS.indexOf(fid);
    var secLabel = idx >= 0 ? LBL[idx].split(' \u2014 ')[0] : fid;
    var selectedCause = null;
    var matched = 0;
    var attempts = 0;

    function render() {
      var h = '<div class="cloze-view">';
      h += '<div class="ce-banner">\u21AA Cause and Effect \u2014 tap a cause, then tap its effect</div>';
      h += '<div class="cloze-ref">' + secLabel + '</div>';
      h += '<div class="ce-grid">';
      h += '<div class="ce-col"><div class="ce-col-label">Causes</div>';
      for (var i = 0; i < pairs.length; i++) {
        var matchedClass = pairs[i].solved ? ' ce-solved' : '';
        var selectedClass = (selectedCause === i && !pairs[i].solved) ? ' ce-selected' : '';
        h += '<button class="ce-item ce-cause' + matchedClass + selectedClass + '" data-cause="' + i + '"' + (pairs[i].solved ? ' disabled' : '') + '>' + pairs[i].cause + '</button>';
      }
      h += '</div>';
      h += '<div class="ce-col"><div class="ce-col-label">Effects</div>';
      for (var j = 0; j < effectOrder.length; j++) {
        var pairIdx = effectOrder[j];
        var solvedClass = pairs[pairIdx].solved ? ' ce-solved' : '';
        h += '<button class="ce-item ce-effect' + solvedClass + '" data-effect="' + pairIdx + '"' + (pairs[pairIdx].solved ? ' disabled' : '') + '>' + pairs[pairIdx].effect + '</button>';
      }
      h += '</div></div>';
      h += '<div class="mc-feedback" id="ce-fb" role="status" aria-live="polite"></div>';
      h += '<button class="study-btn" id="b-ce-quit" style="margin-top:18px">Back to activities</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;

      document.getElementById('b-ce-quit').addEventListener('click', function () { go(fid); });
      var causeBtns = document.querySelectorAll('.ce-cause');
      for (var cb = 0; cb < causeBtns.length; cb++) {
        causeBtns[cb].addEventListener('click', function () {
          selectedCause = parseInt(this.getAttribute('data-cause'));
          render();
        });
      }
      var effectBtns = document.querySelectorAll('.ce-effect');
      for (var eb = 0; eb < effectBtns.length; eb++) {
        effectBtns[eb].addEventListener('click', function () {
          if (selectedCause === null) {
            document.getElementById('ce-fb').innerHTML = '<div class="fb-try">Tap a cause first.</div>';
            return;
          }
          attempts++;
          var pairIdx = parseInt(this.getAttribute('data-effect'));
          var fb = document.getElementById('ce-fb');
          if (pairIdx === selectedCause) {
            pairs[selectedCause].solved = true;
            matched++;
            selectedCause = null;
            fb.innerHTML = '<div class="fb-correct">\u2714 Matched!</div>';
            if (matched === pairs.length) setTimeout(showResults, 1200);
            else render();
          } else {
            if (attempts <= 1) {
              pushToRemixQueue({
                fid: fid, missedInMode: 'causeeffect', qIndex: selectedCause,
                ref: '', question: 'Match cause to effect: ' + pairs[selectedCause].cause,
                options: pairs.map(function (p) { return p.effect; }),
                correct: selectedCause,
                answer: pairs[selectedCause].effect,
                source_quote: pairs[selectedCause].source
              });
            }
            selectedCause = null;
            fb.innerHTML = '<div class="fb-try">Not that one. Try again.</div>';
            render();
          }
        });
      }
    }

    function showResults() {
      var points = attempts <= pairs.length ? pairs.length : Math.max(1, pairs.length * 2 - attempts);
      var xpEarned = recordSession(fid, 'causeeffect', points, pairs.length);
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">\u21AA</div>';
      h += '<div class="cr-score">' + matched + ' / ' + pairs.length + ' matched</div>';
      h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
      h += '<div class="cr-msg">' + (attempts <= pairs.length ? 'Clean sweep!' : 'All matched \u2014 took ' + attempts + ' tries.') + '</div>';
      h += '<button class="study-btn sb-pri" id="b-ce-retry">\u{1F504} Try Again</button>';
      h += '<button class="study-btn" id="b-ce-back">Back to activities</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-ce-retry').addEventListener('click', function () { showCauseEffect(fid); });
      document.getElementById('b-ce-back').addEventListener('click', function () { go(fid); });
    }

    render();
  });
}

// ---- Dictation Challenge ----
function pickDictationFromCurated(data, count) {
  count = count || 8;
  if (!data) return [];
  var pool = [];
  if (data.fill_blank) data.fill_blank.forEach(function (q) { if (q.source_quote) pool.push(q.source_quote); });
  if (data.multiple_choice) data.multiple_choice.forEach(function (q) { if (q.source_quote && pool.indexOf(q.source_quote) === -1) pool.push(q.source_quote); });
  var out = [];
  for (var i = 0; i < pool.length; i++) {
    var sents = pool[i].match(/[^.!?]+[.!?]+/g) || [pool[i]];
    for (var s = 0; s < sents.length; s++) {
      var t = sents[s].trim();
      if (t.length < 30 || t.length > 160) continue;
      if ((t.match(/["\u201C\u201D]/g) || []).length > 2) continue;
      if (out.indexOf(t) === -1) out.push(t);
    }
  }
  return shuffle(out.slice()).slice(0, count);
}

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

function showDictation(fid) {
  loadContent(fid).then(function (data) {
    var sentences = pickDictationFromCurated(data, 8);
    if (sentences.length < 3) { openActivity('stub', fid); return; }
    var idx = IDS.indexOf(fid);
    var secLabel = idx >= 0 ? LBL[idx].split(' \u2014 ')[0] : fid;
    var qi = 0, totalPoints = 0, plays = 0;

    function renderQ() {
      if (qi >= sentences.length) { showResults(); return; }
      var target = sentences[qi];
      plays = 0;

      var h = '<div class="cloze-view">';
      h += '<div class="dict-banner">\u{1F3A7} Dictation \u2014 listen, then type what you heard</div>';
      h += '<div class="cloze-ref">' + secLabel + '</div>';
      h += '<div class="dict-progress">' + (qi + 1) + ' of ' + sentences.length + '</div>';
      h += '<button class="cloze-audio dict-play" id="b-dict-play">\u{1F50A} Play sentence</button>';
      h += '<textarea class="dict-input" id="dict-input" placeholder="Type what you heard..." aria-label="Dictation answer" autocomplete="off" autocapitalize="sentences"></textarea>';
      h += '<div class="dict-actions">';
      h += '<button class="study-btn sb-pri" id="b-dict-check">\u2714 Check</button>';
      h += '<button class="study-btn" id="b-dict-skip">Skip \u27A1</button>';
      h += '</div>';
      h += '<div class="dict-feedback" id="dict-fb" role="status" aria-live="polite"></div>';
      h += '<button class="study-btn" id="b-dict-quit" style="margin-top:18px">Back to activities</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;

      setTimeout(function () { speakText(target); plays++; }, 350);

      document.getElementById('b-dict-play').addEventListener('click', function () { speakText(target); plays++; });
      document.getElementById('b-dict-quit').addEventListener('click', function () { go(fid); });
      document.getElementById('b-dict-skip').addEventListener('click', function () { qi++; renderQ(); });
      document.getElementById('b-dict-check').addEventListener('click', function () {
        var typed = document.getElementById('dict-input').value;
        var score = dictationScore(typed, target);
        var penalty = Math.max(0, plays - 1) * 0.05;
        var points = Math.max(0, score - penalty);
        totalPoints += points;
        var fb = document.getElementById('dict-fb');
        var emoji = score >= 0.95 ? '\u{1F3C6}' : score >= 0.75 ? '\u2714' : score >= 0.4 ? '\u{1F4AA}' : '\u{1F914}';
        var label = score >= 0.95 ? 'Perfect!' : score >= 0.75 ? 'Very close' : score >= 0.4 ? 'Partial' : 'Keep listening';
        fb.innerHTML =
          '<div class="dict-score">' + emoji + ' ' + label + ' \u2014 ' + Math.round(score * 100) + '%</div>' +
          '<div class="dict-compare">' + dictationCompareHtml(typed, target) + '</div>' +
          '<button class="study-btn sb-pri" id="b-dict-next" style="margin-top:12px">Next \u27A1</button>';
        if (score < 0.7) {
          pushToRemixQueue({
            fid: fid, missedInMode: 'dictation', qIndex: qi,
            ref: '', question: 'Dictate: "' + target + '"',
            options: [], correct: 0, answer: target, source_quote: target
          });
        }
        document.getElementById('b-dict-check').disabled = true;
        document.getElementById('b-dict-skip').disabled = true;
        document.getElementById('b-dict-next').addEventListener('click', function () { qi++; renderQ(); });
      });
    }

    function showResults() {
      var pct = Math.round((totalPoints / sentences.length) * 100);
      var xpEarned = recordSession(fid, 'dictation', totalPoints, sentences.length);
      var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
      var msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good work!' : 'Try more listens next time.';
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">' + emoji + '</div>';
      h += '<div class="cr-score">' + pct + '% accuracy</div>';
      h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
      h += '<div class="cr-msg">' + msg + '</div>';
      h += '<button class="study-btn sb-pri" id="b-dict-retry">\u{1F504} Try Again</button>';
      h += '<button class="study-btn" id="b-dict-back">Back to activities</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-dict-retry').addEventListener('click', function () { showDictation(fid); });
      document.getElementById('b-dict-back').addEventListener('click', function () { go(fid); });
    }

    renderQ();
  });
}

// ---- Word Morph — which spelling is real? ----
function wordMorphVariants(word) {
  var w = String(word || '');
  if (w.length < 3) return [];
  var isCap = w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase();
  var lowers = 'abcdefghijklmnopqrstuvwxyz';
  var body = w.slice(1).toLowerCase();
  var firstLower = w[0].toLowerCase();
  function restore(v) {
    if (!v) return '';
    return (isCap ? v[0].toUpperCase() : v[0]) + v.slice(1);
  }
  function randLetterNot(ch) {
    var c = lowers[Math.floor(Math.random() * lowers.length)];
    var g = 0;
    while (c === ch && g < 10) { c = lowers[Math.floor(Math.random() * lowers.length)]; g++; }
    return c;
  }
  var variants = [];
  var subIdx = Math.floor(Math.random() * (body.length || 1));
  variants.push(restore(firstLower + body.slice(0, subIdx) + randLetterNot(body[subIdx] || 'e') + body.slice(subIdx + 1)));
  var insIdx = Math.floor(Math.random() * (body.length + 1));
  var insLetter = lowers[Math.floor(Math.random() * lowers.length)];
  variants.push(restore(firstLower + body.slice(0, insIdx) + insLetter + body.slice(insIdx)));
  if (body.length >= 3) {
    var delIdx = Math.floor(Math.random() * body.length);
    variants.push(restore(firstLower + body.slice(0, delIdx) + body.slice(delIdx + 1)));
  } else {
    var altIdx = (subIdx + 1) % (body.length || 1);
    variants.push(restore(firstLower + body.slice(0, altIdx) + randLetterNot(body[altIdx] || 'a') + body.slice(altIdx + 1)));
  }
  var out = [];
  var seen = {};
  seen[w.toLowerCase()] = true;
  for (var i = 0; i < variants.length; i++) {
    var v = variants[i];
    if (!v || seen[v.toLowerCase()]) continue;
    seen[v.toLowerCase()] = true;
    out.push(v);
  }
  return out;
}

function showWordMorph(fid) {
  loadContent(fid).then(function (data) {
    if (!data || !data.key_terms) { openActivity('stub', fid); return; }
    var usable = data.key_terms.filter(function (t) { return t.term && t.term.length >= 5; });
    if (usable.length < 3) { openActivity('stub', fid); return; }
    var rounds = shuffle(usable.slice()).slice(0, 8);
    var idx = IDS.indexOf(fid);
    var secLabel = idx >= 0 ? LBL[idx].split(' \u2014 ')[0] : fid;
    var qi = 0, score = 0, points = 0;

    function renderQ() {
      if (qi >= rounds.length) { showResults(); return; }
      var kt = rounds[qi];
      var variants = wordMorphVariants(kt.term);
      if (variants.length < 2) { qi++; renderQ(); return; }
      var opts = shuffle([kt.term].concat(variants.slice(0, 3)));
      var correctIdx = opts.indexOf(kt.term);
      var context = findTermContextInCuratedData(kt.term, data);
      var morphColors = ['#4338ca', '#0891b2', '#be185d', '#ea580c'];

      var h = '<div class="mc-view">';
      h += '<div class="morph-banner">\u{1F500} Word Morph \u2014 which spelling is real?</div>';
      h += '<div class="cloze-ref">' + secLabel + '</div>';
      h += '<div class="dict-progress">' + (qi + 1) + ' of ' + rounds.length + '</div>';
      h += '<div class="morph-grid">';
      for (var o = 0; o < opts.length; o++) {
        h += '<button class="morph-opt" data-idx="' + o + '" style="background:' + morphColors[o % 4] + '">' + opts[o] + '</button>';
      }
      h += '</div>';
      h += '<div class="mc-feedback" id="morph-fb" role="status" aria-live="polite"></div>';
      h += '<button class="study-btn" id="b-morph-quit" style="margin-top:18px">Back to activities</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-morph-quit').addEventListener('click', function () { go(fid); });
      var firstAttempt = true;
      var btns = document.querySelectorAll('.morph-opt');
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
          var i2 = parseInt(this.getAttribute('data-idx'));
          var fb = document.getElementById('morph-fb');
          if (i2 === correctIdx) {
            this.classList.add('mc-correct');
            var ctx = context ? '<div class="morph-context">"' + context + '"</div>' : '';
            fb.innerHTML = '<div class="fb-correct">\u2714 ' + kt.term + ' is the correct spelling.</div>' + ctx;
            if (firstAttempt) { score++; points += 1.0; }
            var all = document.querySelectorAll('.morph-opt');
            for (var x = 0; x < all.length; x++) all[x].disabled = true;
            setTimeout(function () { qi++; renderQ(); }, 2400);
          } else {
            if (firstAttempt) {
              pushToRemixQueue({
                fid: fid, missedInMode: 'morph', qIndex: qi, ref: '',
                question: 'Which is the real spelling?',
                options: opts.slice(), correct: correctIdx,
                answer: kt.term, source_quote: context || ''
              });
              firstAttempt = false;
            }
            this.classList.add('mc-wrong');
            this.disabled = true;
            fb.innerHTML = '<div class="fb-try">Not quite \u2014 look again at the letters.</div>';
          }
        });
      }
    }

    function showResults() {
      var pct = Math.round(score / rounds.length * 100);
      var xpEarned = recordSession(fid, 'morph', points, rounds.length);
      var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
      var msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good work!' : 'Notice the letter shapes.';
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">' + emoji + '</div>';
      h += '<div class="cr-score">' + score + ' / ' + rounds.length + '</div>';
      h += '<div class="cr-pct">' + pct + '%</div>';
      h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
      h += '<div class="cr-msg">' + msg + '</div>';
      h += '<button class="study-btn sb-pri" id="b-morph-retry">\u{1F504} Try Again</button>';
      h += '<button class="study-btn" id="b-morph-back">Back to activities</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-morph-retry').addEventListener('click', function () { showWordMorph(fid); });
      document.getElementById('b-morph-back').addEventListener('click', function () { go(fid); });
    }

    renderQ();
  });
}

// ---- Syllable Tap — how many syllables? ----
function countSyllables(word) {
  var w = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  var prepped = w.replace(/([aeiou])y([aeiou])/g, '$1 y$2');
  var groups = prepped.match(/[aeiouy]+/g) || [];
  var count = groups.length;
  var isLeEnding = /[^aeiouy]le$/.test(w);
  if (w.length > 3 && w[w.length - 1] === 'e' && !isLeEnding && count > 1) count--;
  return Math.max(1, count);
}

function splitSyllables(word) {
  var orig = String(word || '');
  var w = orig.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length < 3) return [orig];
  var groups = [];
  var re = /[aeiouy]+/g;
  var m;
  while ((m = re.exec(w)) !== null) groups.push({ start: m.index, end: m.index + m[0].length });
  if (groups.length <= 1) return [orig];
  var mapBack = [];
  for (var i = 0; i < orig.length; i++) if (/[a-zA-Z]/.test(orig[i])) mapBack.push(i);
  var splitPoints = [];
  for (var g = 0; g < groups.length - 1; g++) {
    var clusterStart = groups[g].end;
    var clusterEnd = groups[g + 1].start;
    var clusterLen = clusterEnd - clusterStart;
    var splitAt;
    if (clusterLen >= 2) splitAt = clusterStart + 1;
    else if (clusterLen === 1) splitAt = clusterStart;
    else splitAt = clusterEnd;
    splitPoints.push(mapBack[splitAt] !== undefined ? mapBack[splitAt] : orig.length);
  }
  var out = [];
  var cursor = 0;
  for (var sp = 0; sp < splitPoints.length; sp++) {
    out.push(orig.slice(cursor, splitPoints[sp]));
    cursor = splitPoints[sp];
  }
  out.push(orig.slice(cursor));
  return out.filter(function (s) { return s.length > 0; });
}

function showSyllableTap(fid) {
  loadContent(fid).then(function (data) {
    if (!data || !data.key_terms) { openActivity('stub', fid); return; }
    var usable = data.key_terms.filter(function (t) { return t.term && t.term.length >= 5 && countSyllables(t.term) >= 2; });
    if (usable.length < 3) { openActivity('stub', fid); return; }
    var rounds = shuffle(usable.slice()).slice(0, 8);
    var idx = IDS.indexOf(fid);
    var secLabel = idx >= 0 ? LBL[idx].split(' \u2014 ')[0] : fid;
    var qi = 0, score = 0, points = 0;

    function renderQ() {
      if (qi >= rounds.length) { showResults(); return; }
      var kt = rounds[qi];
      var correctCount = countSyllables(kt.term);
      var candidates = [correctCount - 2, correctCount - 1, correctCount, correctCount + 1, correctCount + 2].filter(function (n) { return n >= 1 && n <= 8; });
      var opts = shuffle(candidates.slice()).slice(0, 4);
      if (opts.indexOf(correctCount) === -1) opts[0] = correctCount;
      opts = shuffle(opts);
      var correctIdx = opts.indexOf(correctCount);
      var firstAttempt = true;

      var h = '<div class="mc-view">';
      h += '<div class="syll-banner">\u{1F441}\uFE0F\u200D\u{1F5E8}\uFE0F Syllable Tap \u2014 how many syllables?</div>';
      h += '<div class="cloze-ref">' + secLabel + '</div>';
      h += '<div class="dict-progress">' + (qi + 1) + ' of ' + rounds.length + '</div>';
      h += '<div class="syll-word">' + kt.term + '</div>';
      h += '<button class="cloze-audio" id="b-syll-hear">\u{1F50A} Listen</button>';
      h += '<div class="syll-opts">';
      for (var o = 0; o < opts.length; o++) {
        h += '<button class="syll-opt" data-idx="' + o + '">' + opts[o] + '</button>';
      }
      h += '</div>';
      h += '<div class="mc-feedback" id="syll-fb" role="status" aria-live="polite"></div>';
      h += '<button class="study-btn" id="b-syll-quit" style="margin-top:18px">Back to activities</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;

      document.getElementById('b-syll-quit').addEventListener('click', function () { go(fid); });
      document.getElementById('b-syll-hear').addEventListener('click', function () { speakText(kt.term); });

      var btns = document.querySelectorAll('.syll-opt');
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
          var i2 = parseInt(this.getAttribute('data-idx'));
          var fb = document.getElementById('syll-fb');
          if (i2 === correctIdx) {
            this.classList.add('mc-correct');
            var parts = splitSyllables(kt.term);
            var colors = ['#2563eb', '#059669', '#7c3aed', '#d97706', '#dc2626'];
            var coloredHtml = parts.map(function (p, k) {
              return '<span style="color:' + colors[k % colors.length] + ';font-weight:800">' + p + '</span>';
            }).join('<span class="syll-sep">\u00B7</span>');
            fb.innerHTML = '<div class="fb-correct">\u2714 ' + correctCount + ' syllable' + (correctCount === 1 ? '' : 's') + '</div>' +
              '<div class="syll-reveal">' + coloredHtml + '</div>';
            if (firstAttempt) { score++; points += 1.0; }
            var all = document.querySelectorAll('.syll-opt');
            for (var x = 0; x < all.length; x++) all[x].disabled = true;
            setTimeout(function () { qi++; renderQ(); }, 2400);
          } else {
            if (firstAttempt) {
              pushToRemixQueue({
                fid: fid, missedInMode: 'syllable', qIndex: qi, ref: '',
                question: 'How many syllables in "' + kt.term + '"?',
                options: opts.map(String), correct: correctIdx,
                answer: String(correctCount), source_quote: ''
              });
              firstAttempt = false;
            }
            this.classList.add('mc-wrong');
            this.disabled = true;
            fb.innerHTML = '<div class="fb-try">Not quite \u2014 say the word aloud and count each beat.</div>';
          }
        });
      }
    }

    function showResults() {
      var pct = Math.round(score / rounds.length * 100);
      var xpEarned = recordSession(fid, 'syllable', points, rounds.length);
      var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
      var msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good work!' : 'Say them aloud.';
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">' + emoji + '</div>';
      h += '<div class="cr-score">' + score + ' / ' + rounds.length + '</div>';
      h += '<div class="cr-pct">' + pct + '%</div>';
      h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
      h += '<div class="cr-msg">' + msg + '</div>';
      h += '<button class="study-btn sb-pri" id="b-syll-retry">\u{1F504} Try Again</button>';
      h += '<button class="study-btn" id="b-syll-back">Back to activities</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-syll-retry').addEventListener('click', function () { showSyllableTap(fid); });
      document.getElementById('b-syll-back').addEventListener('click', function () { go(fid); });
    }

    renderQ();
  });
}

// ---- Rhyme Chain — which word rhymes? ----
function rhymeKeyStudy(word) {
  var w = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (w.length < 3) return '';
  if (w[w.length - 1] === 'e' && w.length > 3 && !/[^aeiouy]le$/.test(w)) w = w.slice(0, -1);
  var lastVowelIdx = -1;
  for (var i = w.length - 1; i >= 0; i--) {
    if (/[aeiouy]/.test(w[i])) { lastVowelIdx = i; break; }
  }
  if (lastVowelIdx < 0) return w;
  while (lastVowelIdx > 0 && /[aeiouy]/.test(w[lastVowelIdx - 1])) lastVowelIdx--;
  return w.slice(lastVowelIdx);
}

function buildRhymeGroupsFromCurated(data) {
  if (!data) return {};
  var sources = [];
  if (data.fill_blank) data.fill_blank.forEach(function (q) { if (q.source_quote) sources.push(q.source_quote); });
  if (data.multiple_choice) data.multiple_choice.forEach(function (q) { if (q.source_quote) sources.push(q.source_quote); });
  if (data.faq) data.faq.forEach(function (q) { if (q.answer) sources.push(q.answer); });

  var groups = {};
  var seen = {};
  // Basic stop-word skim so "because" / "through" don't pollute groups
  var stops = {the:1,and:1,for:1,but:1,with:1,from:1,that:1,this:1,have:1,been:1,were:1,will:1,would:1,could:1,should:1,when:1,where:1,which:1,their:1,there:1,they:1,then:1,than:1,into:1,your:1,what:1,been:1,some:1,does:1,unto:1,upon:1};
  for (var s = 0; s < sources.length; s++) {
    var words = sources[s].split(/[\s,;:!?.()"\u201C\u201D\[\]{}]+/);
    for (var w = 0; w < words.length; w++) {
      var word = words[w].replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
      if (word.length < 4) continue;
      var lower = word.toLowerCase();
      if (seen[lower] || stops[lower]) continue;
      seen[lower] = true;
      var key = rhymeKeyStudy(word);
      if (!key || key.length < 2) continue;
      if (!groups[key]) groups[key] = [];
      groups[key].push(word);
    }
  }
  return groups;
}

function showRhymeChain(fid) {
  loadContent(fid).then(function (data) {
    var groups = buildRhymeGroupsFromCurated(data);
    var usable = [];
    var allWords = [];
    var keys = Object.keys(groups);
    for (var k = 0; k < keys.length; k++) {
      if (groups[keys[k]].length >= 2) usable.push(keys[k]);
      for (var wi = 0; wi < groups[keys[k]].length; wi++) allWords.push({ word: groups[keys[k]][wi], key: keys[k] });
    }
    if (usable.length < 3) { openActivity('stub', fid); return; }
    usable = shuffle(usable.slice()).slice(0, 8);
    var idx = IDS.indexOf(fid);
    var secLabel = idx >= 0 ? LBL[idx].split(' \u2014 ')[0] : fid;
    var qi = 0, score = 0, points = 0;

    function renderQ() {
      if (qi >= usable.length) { showResults(); return; }
      var key = usable[qi];
      var members = groups[key].slice();
      var seed = shuffle(members)[0];
      var rhymer = shuffle(members.filter(function (x) { return x !== seed; }))[0];
      if (!rhymer) { qi++; renderQ(); return; }
      var nonRhymers = allWords.filter(function (x) { return x.key !== key; });
      var distractors = shuffle(nonRhymers).slice(0, 3).map(function (x) { return x.word; });
      while (distractors.length < 3) distractors.push('\u2014');
      var opts = shuffle([rhymer].concat(distractors));
      var correctIdx = opts.indexOf(rhymer);
      var firstAttempt = true;
      var rhymeColors = ['#0891b2', '#059669', '#7c3aed', '#d97706'];

      var h = '<div class="mc-view">';
      h += '<div class="rhyme-banner">\u{1F3B6} Rhyme Chain \u2014 which word rhymes?</div>';
      h += '<div class="cloze-ref">' + secLabel + '</div>';
      h += '<div class="dict-progress">' + (qi + 1) + ' of ' + usable.length + '</div>';
      h += '<div class="rhyme-seed">' + seed + '</div>';
      h += '<button class="cloze-audio" id="b-rhy-hear">\u{1F50A} Listen</button>';
      h += '<div class="mc-opts">';
      for (var o = 0; o < opts.length; o++) {
        h += '<button class="mc-opt rhyme-opt" data-idx="' + o + '" style="background:' + rhymeColors[o % 4] + '">' + opts[o] + '</button>';
      }
      h += '</div>';
      h += '<div class="mc-feedback" id="rhy-fb" role="status" aria-live="polite"></div>';
      h += '<button class="study-btn" id="b-rhy-quit" style="margin-top:18px">Back to activities</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;

      document.getElementById('b-rhy-quit').addEventListener('click', function () { go(fid); });
      document.getElementById('b-rhy-hear').addEventListener('click', function () { speakText(seed); });
      var btns = document.querySelectorAll('.rhyme-opt');
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
          var i2 = parseInt(this.getAttribute('data-idx'));
          var fb = document.getElementById('rhy-fb');
          if (i2 === correctIdx) {
            this.classList.add('mc-correct');
            fb.innerHTML = '<div class="fb-correct">\u2714 ' + seed + ' and ' + rhymer + ' rhyme. (\u2026' + key + ')</div>';
            if (firstAttempt) { score++; points += 1.0; }
            var all = document.querySelectorAll('.rhyme-opt');
            for (var x = 0; x < all.length; x++) all[x].disabled = true;
            setTimeout(function () { qi++; renderQ(); }, 2200);
          } else {
            if (firstAttempt) {
              pushToRemixQueue({
                fid: fid, missedInMode: 'rhyme', qIndex: qi, ref: '',
                question: 'Which word rhymes with "' + seed + '"?',
                options: opts.slice(), correct: correctIdx,
                answer: rhymer, source_quote: ''
              });
              firstAttempt = false;
            }
            this.classList.add('mc-wrong');
            this.disabled = true;
            fb.innerHTML = '<div class="fb-try">Not that one \u2014 try another.</div>';
          }
        });
      }
    }

    function showResults() {
      var pct = Math.round(score / usable.length * 100);
      var xpEarned = recordSession(fid, 'rhyme', points, usable.length);
      var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
      var msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good work!' : 'Say them aloud.';
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">' + emoji + '</div>';
      h += '<div class="cr-score">' + score + ' / ' + usable.length + '</div>';
      h += '<div class="cr-pct">' + pct + '%</div>';
      h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
      h += '<div class="cr-msg">' + msg + '</div>';
      h += '<button class="study-btn sb-pri" id="b-rhy-retry">\u{1F504} Try Again</button>';
      h += '<button class="study-btn" id="b-rhy-back">Back to activities</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-rhy-retry').addEventListener('click', function () { showRhymeChain(fid); });
      document.getElementById('b-rhy-back').addEventListener('click', function () { go(fid); });
    }

    renderQ();
  });
}

// ---- Remix Round — resurface missed questions in a different format ----
function showRemix(fid) {
  var items = getRemixQueue().filter(function (it) { return it.fid === fid; });
  if (items.length === 0) { go(fid); return; }
  items = shuffle(items.slice());
  var qi = 0, score = 0, points = 0, firstAttempt = true, hintsUsed = 0;

  function pickRemixMode(item) {
    if (item.missedInMode === 'filblank') return 'mc';
    if (item.missedInMode === 'mc') {
      if (item.options && typeof item.correct === 'number') {
        var ans = item.options[item.correct];
        if (ans && item.source_quote && item.source_quote.toLowerCase().indexOf(ans.toLowerCase()) !== -1) {
          return 'cloze';
        }
      }
      return 'flash';
    }
    return 'mc';
  }

  function otherAnswerPool() {
    var q = getRemixQueue();
    var pool = [];
    for (var i = 0; i < q.length; i++) {
      var it = q[i];
      if (it.answer && pool.indexOf(it.answer) === -1) pool.push(it.answer);
      if (it.options && typeof it.correct === 'number' && it.options[it.correct]) {
        var o = it.options[it.correct];
        if (pool.indexOf(o) === -1) pool.push(o);
      }
    }
    return pool;
  }

  function renderNext() {
    if (qi >= items.length) { showRemixResults(); return; }
    var item = items[qi];
    firstAttempt = true;
    hintsUsed = 0;
    var mode = pickRemixMode(item);
    var secIdx = IDS.indexOf(item.fid);
    var label = secIdx >= 0 ? LBL[secIdx].split(' \u2014 ')[0] : item.fid;
    var h = '<div class="cloze-view remix-view">';
    h += '<div class="remix-banner">\u{1F504} Remix Round \u2014 ' + (qi + 1) + ' of ' + items.length + '</div>';
    h += '<div class="cloze-ref">' + label + (item.ref ? ' ' + item.ref : '') + '</div>';

    if (mode === 'mc') {
      // Missed in filblank, present as MC with derived question
      var answer = item.answer || (item.options && item.options[item.correct]);
      var otherAns = otherAnswerPool().filter(function (a) { return a && a.toLowerCase() !== String(answer).toLowerCase(); });
      var distractors = shuffle(otherAns).slice(0, 3);
      while (distractors.length < 3) distractors.push('—');
      var opts = shuffle([answer].concat(distractors));
      var correctIdx = opts.indexOf(answer);
      var question = item.prompt ? ('Which word fills the blank? ' + item.prompt) : (item.question || 'Choose the best answer.');
      h += '<div class="mc-question">' + question + '</div>';
      h += '<button class="cloze-audio" id="b-rx-hear">\u{1F50A} Listen</button>';
      h += '<button class="hint-btn" id="b-rx-hint" aria-label="Get a hint">\u{1F4A1} Hint</button>';
      h += '<div class="hint-display" id="rx-hint-display" role="status" aria-live="polite"></div>';
      h += '<div class="mc-opts">';
      var mcColors = ['#dc2626', '#2563eb', '#059669', '#d97706'];
      for (var o = 0; o < opts.length; o++) {
        h += '<button class="mc-opt" data-idx="' + o + '" style="background:' + mcColors[o % 4] + '" aria-label="Option ' + (o + 1) + ': ' + opts[o] + '">' + opts[o] + '</button>';
      }
      h += '</div>';
      h += '<div class="mc-feedback" id="rx-fb" role="status" aria-live="polite"></div>';
      h += '<button class="study-btn" id="b-rx-quit" style="margin-top:18px">Leave remix round</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-rx-quit').addEventListener('click', function () { go(fid); });
      document.getElementById('b-rx-hear').addEventListener('click', function () { speakText(question); });
      wireHintLadder('b-rx-hint', 'rx-hint-display', answer, item.source_quote, function (n) { hintsUsed = n; });
      var btns = document.querySelectorAll('.mc-opt');
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
          var idx = parseInt(this.getAttribute('data-idx'));
          var fb = document.getElementById('rx-fb');
          if (idx === correctIdx) {
            this.classList.add('mc-correct');
            fb.innerHTML = '<span class="fb-correct">\u2714 Remixed!</span>' +
              '<div class="cloze-source">' + (item.source_quote || '') + '</div>';
            if (firstAttempt) { score++; points += hintMultiplier(hintsUsed); }
            removeFromRemixQueue(item);
            var all = document.querySelectorAll('.mc-opt');
            for (var x = 0; x < all.length; x++) all[x].disabled = true;
            setTimeout(function () { qi++; renderNext(); }, 2200);
          } else {
            firstAttempt = false;
            this.classList.add('mc-wrong');
            this.disabled = true;
            fb.innerHTML = '<span class="fb-try">Not quite \u2014 try another \u2192</span>';
          }
        });
      }
      return;
    }

    if (mode === 'cloze') {
      // Missed in MC, present as cloze by blanking the answer in the source_quote
      var answer2 = item.options[item.correct];
      var quote = item.source_quote;
      var re = new RegExp('\\b' + String(answer2).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '\\b', 'i');
      var prompt = quote.replace(re, '______');
      if (prompt === quote) { prompt = quote + ' \u2014 what word is missing?'; }
      var otherAns2 = otherAnswerPool().filter(function (a) { return a && a.toLowerCase() !== String(answer2).toLowerCase(); });
      var distractors2 = shuffle(otherAns2).slice(0, 3);
      while (distractors2.length < 3) distractors2.push('—');
      var opts2 = shuffle([answer2].concat(distractors2));
      var colors2 = ['#2563eb', '#059669', '#7c3aed', '#d97706'];
      h += '<div class="cloze-prompt">' + prompt.replace('______', '<span class="cloze-blank">______</span>') + '</div>';
      h += '<button class="cloze-audio" id="b-rx-hear">\u{1F50A} Listen</button>';
      h += '<button class="hint-btn" id="b-rx-hint" aria-label="Get a hint">\u{1F4A1} Hint</button>';
      h += '<div class="hint-display" id="rx-hint-display" role="status" aria-live="polite"></div>';
      h += '<div class="cloze-opts">';
      for (var o2 = 0; o2 < opts2.length; o2++) {
        h += '<button class="cloze-opt" data-val="' + opts2[o2] + '" style="background:' + colors2[o2 % 4] + '" aria-label="Answer option: ' + opts2[o2] + '">' + opts2[o2] + '</button>';
      }
      h += '</div>';
      h += '<div class="cloze-feedback" id="rx-fb" role="status" aria-live="polite"></div>';
      h += '<button class="study-btn" id="b-rx-quit" style="margin-top:18px">Leave remix round</button>';
      h += '</div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-rx-quit').addEventListener('click', function () { go(fid); });
      document.getElementById('b-rx-hear').addEventListener('click', function () { speakText(quote); });
      wireHintLadder('b-rx-hint', 'rx-hint-display', answer2, quote, function (n) { hintsUsed = n; });
      var btns2 = document.querySelectorAll('.cloze-opt');
      for (var b2 = 0; b2 < btns2.length; b2++) {
        btns2[b2].addEventListener('click', function () {
          var val = this.getAttribute('data-val');
          var fb = document.getElementById('rx-fb');
          if (val.toLowerCase() === String(answer2).toLowerCase()) {
            this.classList.add('cloze-correct');
            fb.innerHTML = '<span class="fb-correct">\u2714 Remixed!</span><div class="cloze-source">' + quote + '</div>';
            if (firstAttempt) { score++; points += hintMultiplier(hintsUsed); }
            removeFromRemixQueue(item);
            var all = document.querySelectorAll('.cloze-opt');
            for (var x = 0; x < all.length; x++) all[x].disabled = true;
            setTimeout(function () { qi++; renderNext(); }, 2200);
          } else {
            firstAttempt = false;
            this.classList.add('cloze-wrong');
            this.disabled = true;
            fb.innerHTML = '<span class="fb-try">Try another \u2192</span>';
          }
        });
      }
      return;
    }

    // Flashcard fallback
    var answer3 = (item.options && item.options[item.correct]) || item.answer || '';
    var front = item.question || item.prompt || 'Remember this:';
    var revealed = false;
    h += '<div class="cloze-prompt">' + front + '</div>';
    h += '<button class="cloze-audio" id="b-rx-hear">\u{1F50A} Listen</button>';
    h += '<div class="remix-flash" id="rx-flash">Tap to reveal answer</div>';
    h += '<div class="mc-opts remix-confidence" id="rx-confidence" style="display:none">';
    h += '<button class="mc-opt" data-rx="yes" style="background:#059669">I knew it</button>';
    h += '<button class="mc-opt" data-rx="no" style="background:#dc2626">Still unsure</button>';
    h += '</div>';
    h += '<button class="study-btn" id="b-rx-quit" style="margin-top:18px">Leave remix round</button>';
    h += '</div>';
    document.getElementById('content').innerHTML = h;
    document.getElementById('b-rx-quit').addEventListener('click', function () { go(fid); });
    document.getElementById('b-rx-hear').addEventListener('click', function () { speakText(front); });
    document.getElementById('rx-flash').addEventListener('click', function () {
      if (revealed) return;
      revealed = true;
      this.innerHTML = '<strong>' + answer3 + '</strong>' + (item.source_quote ? '<div class="cloze-source">' + item.source_quote + '</div>' : '');
      document.getElementById('rx-confidence').style.display = 'grid';
    });
    var cBtns = document.querySelectorAll('#rx-confidence .mc-opt');
    for (var cb = 0; cb < cBtns.length; cb++) {
      cBtns[cb].addEventListener('click', function () {
        var knew = this.getAttribute('data-rx') === 'yes';
        if (knew) { score++; points += 0.7; removeFromRemixQueue(item); }
        qi++; renderNext();
      });
    }
  }

  function showRemixResults() {
    var pct = items.length ? Math.round(score / items.length * 100) : 0;
    var xpEarned = recordSession(fid, 'remix', points, items.length);
    var remainingFid = getRemixCount(fid);
    var h = '<div class="cloze-results">';
    h += '<div class="cr-emoji">\u{1F504}</div>';
    h += '<div class="cr-score">' + score + ' / ' + items.length + '</div>';
    h += '<div class="cr-pct">' + pct + '% remixed</div>';
    h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
    if (remainingFid > 0) {
      h += '<p class="cr-hint">' + remainingFid + ' still in your remix queue \u2014 try again later.</p>';
    } else {
      h += '<p class="cr-hint">Queue cleared for this section. Nice work.</p>';
    }
    h += '<button class="study-btn sb-pri" id="b-rx-again">Back to activities</button>';
    h += '</div>';
    document.getElementById('content').innerHTML = h;
    document.getElementById('b-rx-again').addEventListener('click', function () { go(fid); });
  }

  renderNext();
}

// ---- Cross-Volume Review — pull due cards from ALL sections ----
function showCrossReview() {
  var allDue = getAllDueCards();
  if (!allDue.length) {
    document.getElementById('content').innerHTML =
      '<div class="cloze-results"><div class="cr-emoji">\u2705</div>' +
      '<div class="cr-msg">No cards due for review!</div>' +
      '<div class="cr-btns"><button class="study-btn sb-pri" id="b-rev-home">Home</button></div></div>';
    document.getElementById('b-rev-home').addEventListener('click', function () { goHome(); });
    return;
  }
  var cards = allDue.slice(0, 20);
  var ci = 0, flipped = false;
  var ratings = [];

  function renderCard() {
    if (ci >= cards.length) { showRevSummary(); return; }
    var c = cards[ci];
    flipped = false;
    var secIdx = IDS.indexOf(c.fid);
    var secName = secIdx >= 0 ? LBL[secIdx].split(' \u2014 ')[0] : c.fid;
    var typeColor = c.type === 'term' ? 'var(--vol6)' : 'var(--vol1)';

    var h = '<div class="fc-view">';
    h += '<div class="fc-progress">' + (ci + 1) + ' of ' + cards.length + ' due</div>';
    h += '<div class="fc-type" style="color:' + typeColor + '">' + secName + '</div>';
    h += '<div class="fc-card" id="fc-card">';
    h += '<div class="fc-front" id="fc-front">' + c.front + '</div>';
    h += '<div class="fc-back" id="fc-back" style="display:none">' + c.back + '</div>';
    h += '</div>';
    h += '<button class="cloze-audio" id="b-fc-hear">\u{1F50A} Listen</button>';
    h += '<div class="fc-action" id="fc-action">';
    h += '<button class="study-btn sb-pri" id="b-fc-flip">\u{1F504} Flip to reveal</button>';
    h += '</div>';
    h += '<div class="fc-rate" id="fc-rate" style="display:none">';
    h += '<div class="fc-rate-label">How well did you know this?</div>';
    h += '<div class="fc-rate-btns">';
    var rLabels = ['Blank', 'Hard', 'Okay', 'Good', 'Easy'];
    var rColors = ['#dc2626', '#d97706', '#0891b2', '#059669', '#2563eb'];
    for (var r = 1; r <= 5; r++) {
      h += '<button class="fc-rate-btn" data-r="' + r +
        '" style="background:' + rColors[r - 1] + '">' +
        r + '<br><span class="fc-rate-sub">' + rLabels[r - 1] + '</span></button>';
    }
    h += '</div></div>';
    h += '<button class="study-btn" id="b-rev-quit" style="margin-top:18px">Back to Home</button>';
    h += '</div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-rev-quit').addEventListener('click', function () { goHome(); });
    document.getElementById('b-fc-hear').addEventListener('click', function () {
      speakText(flipped ? c.back : c.front);
    });
    document.getElementById('b-fc-flip').addEventListener('click', function () {
      flipped = true;
      document.getElementById('fc-front').style.display = 'none';
      document.getElementById('fc-back').style.display = '';
      document.getElementById('fc-card').classList.add('fc-flipped');
      document.getElementById('fc-action').style.display = 'none';
      document.getElementById('fc-rate').style.display = '';
    });
    var rBtns = document.querySelectorAll('.fc-rate-btn');
    for (var b = 0; b < rBtns.length; b++) {
      rBtns[b].addEventListener('click', function () {
        var r = parseInt(this.getAttribute('data-r'));
        ratings.push(r);
        var qualityMap = [0, 0, 1, 3, 4, 5];
        var updated = sm2(c, qualityMap[r]);
        updateCard(updated);
        ci++;
        renderCard();
      });
    }
  }

  function showRevSummary() {
    var avg = ratings.reduce(function (a, b) { return a + b; }, 0) / ratings.length;
    var remaining = getAllDueCount();
    var xpEarned = recordSession('review', 'review', cards.length, cards.length);
    var emoji = avg >= 4 ? '\u{1F3C6}' : avg >= 3 ? '\u{1F31F}' : '\u{1F4AA}';
    var h = '<div class="cloze-results">';
    h += '<div class="cr-emoji">' + emoji + '</div>';
    h += '<div class="cr-score">' + cards.length + ' cards reviewed</div>';
    h += '<div class="cr-pct">Average confidence: ' + avg.toFixed(1) + ' / 5</div>';
    h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
    if (remaining > 0) h += '<div class="cr-mastery">\u{1F4DA} ' + remaining + ' more cards still due</div>';
    else h += '<div class="cr-mastery">\u2705 All caught up!</div>';
    h += '<div class="cr-btns">';
    if (remaining > 0) h += '<button class="study-btn sb-pri" id="b-rev-more">\u{1F504} Review More</button>';
    h += '<button class="study-btn" id="b-rev-home">Home</button>';
    h += '</div></div>';
    document.getElementById('content').innerHTML = h;
    if (remaining > 0) document.getElementById('b-rev-more').addEventListener('click', function () { showCrossReview(); });
    document.getElementById('b-rev-home').addEventListener('click', function () { goHome(); });
  }

  renderCard();
}

function goHome() {
  var lastFid = localStorage.getItem('acr_study_last');
  var hasResume = lastFid && IDS.indexOf(lastFid) >= 0;
  var totalDue = getAllDueCount();
  var stats = getStats();
  var lvl = getLevel(stats.xp || 0);
  var streak = stats.streak || 0;
  var html = '<div id="home">' +
    '<div class="logo">\u{1F4D6}</div>' +
    '<h1>ACR STUDY</h1>' +
    '<p class="tag">Spaced repetition study companion<br>for The Ancient Covenant Record</p>';
  if (totalDue > 0 || streak > 0 || (stats.xp || 0) > 0) {
    html += '<div class="home-stats">';
    if (totalDue > 0) html += '<div class="home-stat home-due">\u{1F4DA} ' + totalDue + ' cards due</div>';
    if (streak > 0) html += '<div class="home-stat home-streak">\u{1F525} ' + streak + ' day streak</div>';
    html += '<div class="home-stat home-level">' + lvl.current.icon + ' ' + lvl.current.name + ' \u00B7 ' + (stats.xp || 0) + ' XP</div>';
    html += '</div>';
  }
  html += '<div class="btns">';
  if (totalDue > 0) html += '<button id="b-review">\u{1F4DA} Review All Due (' + totalDue + ' cards)</button>';
  html += '<button id="b-begin">Begin with Bereshit \u25B6</button>' +
    (hasResume ? '<button id="b-resume">Resume where I left off</button>' : '') +
    '</div>' +
    '<p class="small">' +
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
  var bReview = document.getElementById('b-review');
  if (bReview) bReview.addEventListener('click', function () { showCrossReview(); });
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
      // Algorithmic fallback: show first verses as summary
      var verses = getVerses(fid);
      if (!verses.length) {
        fetch('../data/'+fid+'.json').then(function(r){return r.ok?r.json():null;}).then(function(d){
          if(d){CHAPTER_CACHE[fid]=d;showStudyMode(fid);}else{openActivity('stub',fid);}
        }).catch(function(){openActivity('stub',fid);}); return;
      }
      var secLabel = i >= 0 ? LBL[i] : fid;
      var preview = verses.slice(0, Math.min(5, verses.length)).join(' ');
      var h = '<div class="study-view">';
      h += '<h2 class="sv-title">' + secLabel + '</h2>';
      h += '<div class="sv-sec"><h3>Preview</h3><div class="sv-text">' + preview + '</div></div>';
      h += '<div class="sv-sec"><p class="study-na">Full curated summary, key terms, and FAQ will be added in a future session.</p></div>';
      h += '<button class="study-btn" id="b-back-na">Back to activities</button></div>';
      document.getElementById('content').innerHTML = h;
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

  // Theme cycle: light -> parchment -> navy -> amber -> light
  var themes = ['', 'theme-parchment', 'theme-navy', 'theme-amber'];
  var curTheme = localStorage.getItem('acr_study_theme_mode') || '';
  if (curTheme) document.body.classList.add(curTheme);
  document.getElementById('b-theme').addEventListener('click', function () {
    var idx = themes.indexOf(curTheme);
    document.body.classList.remove(curTheme);
    curTheme = themes[(idx + 1) % themes.length];
    if (curTheme) document.body.classList.add(curTheme);
    try { localStorage.setItem('acr_study_theme_mode', curTheme); } catch (e) {}
    this.classList.toggle('on', curTheme !== '');
  });
  if (curTheme) document.getElementById('b-theme').classList.add('on');

  // Child mode
  document.getElementById('b-child').addEventListener('click', function () {
    toggleChildMode();
    this.classList.toggle('on', childMode);
  });
  if (childMode) document.getElementById('b-child').classList.add('on');

  // Reading aids
  document.getElementById('b-beeline').addEventListener('click', function () {
    toggleBeeline();
    this.classList.toggle('on', beelineOn);
  });
  if (beelineOn) document.getElementById('b-beeline').classList.add('on');
  document.getElementById('b-linefocus').addEventListener('click', function () {
    toggleLineFocus();
    this.classList.toggle('on', lineFocusOn);
  });
  if (lineFocusOn) document.getElementById('b-linefocus').classList.add('on');

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
  document.getElementById('vc').addEventListener('change', function () {
    var v = ttsVoices[parseInt(this.value)];
    if (v) { try { localStorage.setItem('acr_study_voice', v.name); } catch (e) {} }
  });
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
