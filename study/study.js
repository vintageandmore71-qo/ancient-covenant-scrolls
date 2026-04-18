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
  h += actCard('\u{1F9E9}', 'Verse Builder', '#e91e90', 'versebuild', fid);
  h += actCard('\u{1F517}', 'Word Match', '#6d28d9', 'wordmatch', fid);
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
  if (mode === 'mc') { showMC(fid); return; }
  if (mode === 'flash') { showFlashcards(fid); return; }
  if (mode === 'memory') { showMemoryMatch(fid); return; }
  if (mode === 'listen') { showListenLearn(fid); return; }
  if (mode === 'progress') { showProgress(fid); return; }
  if (mode === 'versebuild') { showVerseBuild(fid); return; }
  if (mode === 'wordmatch') { showWordMatch(fid); return; }
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
    var questions, allAns;
    if (data && data.fill_blank && data.fill_blank.length) {
      questions = shuffle(data.fill_blank.slice());
      allAns = data.fill_blank.map(function (q) { return q.answer; });
    } else {
      // Algorithmic fallback: generate fill-in-blank from chapter verses
      var verses = getVerses(fid);
      if (!verses.length) {
        fetch('../data/' + fid + '.json').then(function(r){return r.ok?r.json():null;}).then(function(d){
          if(d){CHAPTER_CACHE[fid]=d;showFillBlank(fid);}else{openActivity('stub',fid);}
        }).catch(function(){openActivity('stub',fid);});
        return;
      }
      var usable = verses.filter(function(v){return v.length > 30 && v.length < 200;});
      usable = shuffle(usable).slice(0, 10);
      questions = []; allAns = [];
      for (var vi = 0; vi < usable.length; vi++) {
        var words = usable[vi].split(/\s+/).filter(function(w){return w.length > 3;});
        if (words.length < 4) continue;
        var blankIdx = Math.floor(Math.random() * (words.length - 2)) + 1;
        var answer = words[blankIdx].replace(/[.,;:!?]/g, '');
        var prompt = usable[vi].replace(new RegExp('\\b' + answer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b'), '______');
        if (prompt === usable[vi]) continue;
        questions.push({ ref: '', prompt: prompt, answer: answer, source_quote: usable[vi] });
        allAns.push(answer);
      }
      if (!questions.length) { openActivity('stub', fid); return; }
    }
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
      var xpEarned = recordSession(fid, 'filblank', score, questions.length);
      var stats = getStats();
      var lvl = getLevel(stats.xp || 0);
      var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
      var msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good work!' : 'Keep studying!';
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">' + emoji + '</div>';
      h += '<div class="cr-score">' + score + ' / ' + questions.length + '</div>';
      h += '<div class="cr-pct">' + pct + '%</div>';
      h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
      h += '<div class="cr-level">' + lvl.current.icon + ' ' + lvl.current.name +
        ' \u2014 ' + (stats.xp || 0) + ' XP total</div>';
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

// ---- Multiple Choice quiz ----
function showMC(fid) {
  loadContent(fid).then(function (data) {
    if (!data || !data.multiple_choice || !data.multiple_choice.length) {
      openActivity('stub', fid); return;
    }
    var questions = shuffle(data.multiple_choice.slice());
    var qi = 0, score = 0;
    var mcColors = ['#dc2626', '#2563eb', '#059669', '#d97706'];

    function renderQ() {
      if (qi >= questions.length) { showResults(); return; }
      var q = questions[qi];

      var h = '<div class="mc-view">';
      h += '<div class="mc-progress">' + (qi + 1) + ' of ' + questions.length + '</div>';
      h += '<div class="mc-ref">Bereshit ' + q.ref + '</div>';
      h += '<div class="mc-question">' + q.question + '</div>';
      h += '<button class="cloze-audio" id="b-mc-hear">\u{1F50A} Listen</button>';
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
          '" style="background:' + mcColors[o % 4] + '">' +
          mcOpts[o] + '</button>';
      }
      h += '</div>';
      h += '<div class="mc-feedback" id="mc-fb"></div>';
      h += '</div>';

      document.getElementById('content').innerHTML = h;
      document.getElementById('b-mc-hear').addEventListener('click', function () {
        speakText(q.question);
      });
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
            score++;
            var all = document.querySelectorAll('.mc-opt');
            for (var x = 0; x < all.length; x++) all[x].disabled = true;
            setTimeout(function () { qi++; renderQ(); }, 2200);
          } else {
            this.classList.add('mc-wrong');
            this.disabled = true;
            fb.innerHTML = '<span class="fb-try">Not quite \u2014 try another \u2192</span>';
          }
        });
      }
    }

    function showResults() {
      var pct = Math.round(score / questions.length * 100);
      var xpEarned = recordSession(fid, 'mc', score, questions.length);
      var stats = getStats();
      var lvl = getLevel(stats.xp || 0);
      var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
      var msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good work!' : 'Keep studying!';
      var h = '<div class="cloze-results">';
      h += '<div class="cr-emoji">' + emoji + '</div>';
      h += '<div class="cr-score">' + score + ' / ' + questions.length + '</div>';
      h += '<div class="cr-pct">' + pct + '%</div>';
      h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
      h += '<div class="cr-level">' + lvl.current.icon + ' ' + lvl.current.name +
        ' \u2014 ' + (stats.xp || 0) + ' XP total</div>';
      h += '<div class="cr-msg">' + msg + '</div>';
      h += '<div class="cr-btns">';
      h += '<button class="study-btn sb-pri" id="b-mc-retry">\u{1F504} Try Again</button>';
      h += '<button class="study-btn" id="b-mc-back">Back to activities</button>';
      h += '</div></div>';
      document.getElementById('content').innerHTML = h;
      document.getElementById('b-mc-retry').addEventListener('click', function () { showMC(fid); });
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
        cards.push({ front: t.term + (t.phonetic ? ' (' + t.phonetic + ')' : ''), back: t.definition, type: 'term' });
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
      var typeLabel = c.type === 'term' ? 'KEY TERM' : 'VERSE';

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
          '" style="background:' + rColors[r - 1] + '">' +
          r + '<br><span class="fc-rate-sub">' + rLabels[r - 1] + '</span></button>';
      }
      h += '</div></div>';
      h += '</div>';

      document.getElementById('content').innerHTML = h;

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
      openActivity('stub', fid); return;
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

  h += '<button class="study-btn" id="b-prog-back" style="margin-top:16px">Back to activities</button>';
  h += '</div>';

  document.getElementById('content').innerHTML = h;
  document.getElementById('b-prog-back').addEventListener('click', function () { go(fid); });
  window.scrollTo(0, 0);
}

// ---- Verse Builder — tap scrambled words in order to rebuild a verse ----
function showVerseBuild(fid) {
  loadContent(fid).then(function (data) {
    if (!data || !data.fill_blank || !data.fill_blank.length) { openActivity('stub', fid); return; }
    var verses = data.fill_blank.map(function (q) { return { ref: q.ref, text: q.source_quote }; });
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
        h += '</div>';
        document.getElementById('content').innerHTML = h;

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
    if (!data || !data.key_terms || data.key_terms.length < 4) { openActivity('stub', fid); return; }
    var terms = shuffle(data.key_terms.slice(0, 6));
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
  html += '<div class="btns">' +
    '<button id="b-begin">Begin with Bereshit \u25B6</button>' +
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
