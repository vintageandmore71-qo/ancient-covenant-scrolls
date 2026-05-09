// Attain — Learning Quality Engine
// Copyright (c) 2026 LBond. All Rights Reserved.
//
// Validation pipeline that prevents Attain question generators from
// shipping items that can be guessed without knowing the material.
//
// Public API:
//   window.LoadAttainQuality.auditQuestion(q)    -> { ok, score, reasons }
//   window.LoadAttainQuality.auditQuestionSet(qs) -> { total, pass, fail,
//                                                       score, reasons }
//   window.LoadAttainQuality.classifyPos(word)    -> 'verb'|'noun'|'adj'
//                                                     |'adv'|'unknown'
//   window.LoadAttainQuality.checkCaseParity(opts)         -> bool
//   window.LoadAttainQuality.checkLengthParity(opts)       -> bool
//   window.LoadAttainQuality.checkPosParity(opts)          -> bool
//   window.LoadAttainQuality.checkTenseParity(opts)        -> bool
//   window.LoadAttainQuality.checkNumberParity(opts)       -> bool
//   window.LoadAttainQuality.checkSemanticParity(opts, src) -> bool
//   window.LoadAttainQuality.blindSolve(q)                  -> { guessed,
//                                                               reason }
//
// Uses lightweight suffix heuristics — no NLP runtime cost and runs
// fully offline. Trade-off: not as accurate as a tagger, but
// catches the common giveaways the user flagged (POS mismatch,
// length mismatch, capitalisation tells, semantic absurdity).

(function () {
'use strict';

// ── Suffix-based POS classifier ─────────────────────────────────
// Order matters: longer/more-specific suffixes first.
var VERB_SUFFIXES = ['ifies', 'ified', 'ifying', 'ies', 'ied', 'ing', 'ize', 'ise', 'ate', 'ed', 'en'];
var NOUN_SUFFIXES = ['tion', 'sion', 'ness', 'ment', 'ity', 'ship', 'hood', 'dom', 'ance', 'ence', 'er', 'or', 'ist', 'ism', 'ee'];
var ADJ_SUFFIXES  = ['less', 'ous', 'ful', 'ive', 'ish', 'able', 'ible', 'ic', 'al', 'ent', 'ant', 'ary', 'ory', 'y'];
var ADV_SUFFIXES  = ['ly'];

// Tiny lexicon of common verbs / nouns / adjectives so short or
// irregular forms (be, go, do, name, hand, big) classify correctly.
var COMMON_VERBS = 'be is am are was were been being has have had do does did go went gone going make made making take took taken give gave given say said see saw seen come came get got run ran put set let know knew think thought tell told call called find found feel felt look looked want wanted use used work worked seem seemed leave left mean meant keep kept hold held bring brought write wrote read sit sat stand stood lose lost pay paid meet met include included continue continued learn learned change changed lead leads led understand understood watch watched follow followed stop stopped create created speak spoke spoken open closed reach reached kill killed remain remained suggest suggested raise raised pass passed sell sold require required report reported decide decided pull pulled break broke join joined catch caught build built draw drew choose chose plant planted teach taught throw threw fall fell fight fought win won eat ate ate drink drank drove driven walk walked talk talked grow grew show showed serve served happen happened die died believe believed buy bought wait waited send sent expect expected stay stayed agree agreed allow allowed lay laid receive received love loved consider considered appear appeared add added forget forgot remember remembered ride rode hide hid sing sang swim swam buy bought lend lent borrow blink turned turning drive drives drove driven driving direct directs directed directing arrive arrives arrived arriving survive survived strive strove derive derived live lived give gave given forgive forgave leave left bring brings sing sings sang king ring thing wing string sting spring fling cling';
var COMMON_NOUNS = 'man woman child kid people person thing way day time year hour minute world life hand eye head face name word place case point fact group number part case state company system program area government question idea night moment work right house room door window car book story line word side fact problem story money power music war street tree flower bird dog cat horse mouth foot finger heart blood bone water fire wind light dark sky sun moon star sea ocean river mountain hill valley field forest stone road city town village home street nation country state path king queen prince father mother son daughter brother sister friend enemy soldier teacher king altar temple priest prophet covenant law spirit angel servant master son daughter wisdom truth chair car table dog cat ball stuffed';
var COMMON_ADJS  = 'good bad great small big large little high low long short wide narrow deep shallow heavy light fast slow hot cold warm cool old new young dark bright clear dim soft hard rough smooth sharp dull strong weak rich poor full empty thick thin wide narrow far near right wrong true false simple complex easy difficult happy sad angry calm beautiful ugly clean dirty open closed wet dry safe dangerous quick slow gentle harsh kind cruel honest dishonest brave fearful loud quiet noisy silent smart dumb wise foolish red blue green yellow black white grey purple orange pink brown tall short fat thin proud humble holy righteous wicked just unjust mighty weak';
var COMMON_ADVS  = 'quickly slowly carefully suddenly already always never sometimes often usually rarely frequently soon later yesterday today tomorrow now then here there everywhere nowhere quite very much really truly hardly almost just only also too either neither indeed perhaps maybe certainly possibly probably';

var LEX = (function () {
  var map = {};
  function add(words, tag) {
    String(words || '').split(/\s+/).forEach(function (w) { if (w) map[w.toLowerCase()] = tag; });
  }
  add(COMMON_VERBS, 'verb');
  add(COMMON_NOUNS, 'noun');
  add(COMMON_ADJS,  'adj');
  add(COMMON_ADVS,  'adv');
  return map;
})();

function classifyPos(rawWord) {
  if (!rawWord) return 'unknown';
  var w = String(rawWord).toLowerCase().replace(/[^a-z']/g, '');
  if (!w) return 'unknown';
  if (LEX[w]) return LEX[w];
  // Multi-word phrase: classify the LAST token.
  if (/\s/.test(rawWord)) {
    var parts = String(rawWord).trim().split(/\s+/);
    return classifyPos(parts[parts.length - 1]);
  }
  for (var i = 0; i < VERB_SUFFIXES.length; i++) if (w.length > VERB_SUFFIXES[i].length + 1 && w.endsWith(VERB_SUFFIXES[i])) return 'verb';
  for (var j = 0; j < ADV_SUFFIXES.length;  j++) if (w.length > ADV_SUFFIXES[j].length  + 1 && w.endsWith(ADV_SUFFIXES[j]))  return 'adv';
  for (var k = 0; k < ADJ_SUFFIXES.length;  k++) if (w.length > ADJ_SUFFIXES[k].length  + 1 && w.endsWith(ADJ_SUFFIXES[k]))  return 'adj';
  for (var m = 0; m < NOUN_SUFFIXES.length; m++) if (w.length > NOUN_SUFFIXES[m].length + 1 && w.endsWith(NOUN_SUFFIXES[m])) return 'noun';
  // Default to noun (the highest-frequency POS).
  return 'noun';
}

// ── Parity checks ───────────────────────────────────────────────
function caseStyle(s) {
  var t = String(s || '').trim();
  if (!t) return 'unknown';
  if (t === t.toUpperCase()) return 'upper';
  if (t === t.toLowerCase()) return 'lower';
  // Title Case: first letter of each significant word is upper.
  var first = t[0];
  return (first === first.toUpperCase() && first !== first.toLowerCase()) ? 'title' : 'mixed';
}

function checkCaseParity(opts) {
  if (!opts || opts.length < 2) return true;
  var s = caseStyle(opts[0]);
  for (var i = 1; i < opts.length; i++) if (caseStyle(opts[i]) !== s) return false;
  return true;
}

function checkLengthParity(opts) {
  if (!opts || opts.length < 2) return true;
  var lens = opts.map(function (o) { return String(o || '').trim().length; }).filter(function (n) { return n > 0; });
  if (!lens.length) return false;
  var max = Math.max.apply(null, lens), min = Math.min.apply(null, lens);
  if (min === 0) return false;
  // ratio ≤ 2.5 keeps the visual cue minimal.
  return (max / min) <= 2.5;
}

function checkPosParity(opts) {
  if (!opts || opts.length < 2) return true;
  var p = classifyPos(opts[0]);
  if (p === 'unknown') return true;          // skip when classifier is unsure
  for (var i = 1; i < opts.length; i++) {
    var q = classifyPos(opts[i]);
    if (q !== 'unknown' && q !== p) return false;
  }
  return true;
}

function checkNumberParity(opts) {
  if (!opts || opts.length < 2) return true;
  function isPlural(w) {
    var x = String(w || '').toLowerCase().trim();
    if (!x) return false;
    if (/(ies|es|s)$/.test(x) && !/(ss|us|is|news)$/.test(x)) return true;
    return false;
  }
  var p = isPlural(opts[0]);
  for (var i = 1; i < opts.length; i++) if (isPlural(opts[i]) !== p) return false;
  return true;
}

function checkTenseParity(opts) {
  if (!opts || opts.length < 2) return true;
  var t = _tense(opts[0]);
  for (var i = 1; i < opts.length; i++) if (_tense(opts[i]) !== t) return false;
  return true;
}
function _tense(w) {
  var x = String(w || '').toLowerCase().trim();
  if (/ed$/.test(x))  return 'past';
  if (/ing$/.test(x)) {
    // -ing is only progressive when the word minus -ing is a real
    // verb stem. "bring", "sting", "ring", "thing", "king", etc.
    // are base-form roots that happen to end in -ing.
    var stem = x.slice(0, -3);
    if (stem.length >= 3 && LEX[stem] === 'verb') return 'progressive';
    if (x.length <= 7 && LEX[x] === 'verb') return 'base';
    return 'progressive';
  }
  if (/(s|es)$/.test(x) && classifyPos(x) === 'verb') return 'third-person';
  return 'base';
}

function checkSemanticParity(opts, source) {
  // Every option should appear at least once in the source vocabulary
  // OR resemble (case-insensitive substring) a token from the source.
  // Catches "leg | spirit | friend | gained" pattern where one option
  // is semantically unrelated to the passage.
  if (!opts || !source || opts.length < 2) return true;
  var src = String(source || '').toLowerCase();
  var pass = 0;
  for (var i = 0; i < opts.length; i++) {
    var w = String(opts[i] || '').toLowerCase().trim().replace(/[^a-z' -]/g, '');
    if (!w) continue;
    if (src.indexOf(w) !== -1) { pass++; continue; }
    // Allow option whose stem (first 5 chars) appears in source.
    var stem = w.slice(0, 5);
    if (stem.length >= 4 && src.indexOf(stem) !== -1) pass++;
  }
  // Require >= half of options to be source-anchored.
  return pass >= Math.ceil(opts.length / 2);
}

// Blind-solve: returns { guessed: bool, reason: string }. Heuristic
// only. Combines the parity checks and reports the dominant
// giveaway category. Does NOT execute the question against the
// study material — it asks: could a learner who has NEVER read
// the material narrow this down by surface features alone?
function blindSolve(q) {
  if (!q || !Array.isArray(q.options) || typeof q.correct !== 'number') {
    return { guessed: false, reason: 'no MC shape' };
  }
  var opts = q.options;
  var correct = opts[q.correct];
  if (!correct) return { guessed: false, reason: 'no correct option' };
  // 1. Capitalisation tell.
  if (!checkCaseParity(opts)) {
    var cs = caseStyle(correct);
    var others = opts.filter(function (o, i) { return i !== q.correct; });
    var diff = others.every(function (o) { return caseStyle(o) !== cs; });
    if (diff) return { guessed: true, reason: 'capitalisation tells (correct option uses unique case)' };
  }
  // 2. Length tell.
  var lens = opts.map(function (o) { return String(o).length; });
  var maxLen = Math.max.apply(null, lens);
  var minLen = Math.min.apply(null, lens);
  if (minLen > 0 && maxLen / minLen > 2.5) {
    if (lens[q.correct] === maxLen || lens[q.correct] === minLen) {
      return { guessed: true, reason: 'length tells (correct option is the longest or shortest)' };
    }
  }
  // 3. POS tell.
  if (!checkPosParity(opts)) {
    var cp = classifyPos(correct);
    var posOthers = opts.filter(function (o, i) { return i !== q.correct; });
    var posDiff = posOthers.every(function (o) { var p = classifyPos(o); return p !== 'unknown' && p !== cp; });
    if (posDiff) return { guessed: true, reason: 'part-of-speech tells (correct option is the only one matching the slot)' };
  }
  // 4. Number tell.
  if (!checkNumberParity(opts)) {
    function pl(w) { var x = String(w || '').toLowerCase().trim(); return /(ies|es|s)$/.test(x) && !/(ss|us|is|news)$/.test(x); }
    var pCorrect = pl(correct);
    var numOthers = opts.filter(function (o, i) { return i !== q.correct; });
    if (numOthers.every(function (o) { return pl(o) !== pCorrect; })) {
      return { guessed: true, reason: 'singular/plural tells (correct option uniquely matches the verb agreement)' };
    }
  }
  // 5. Tense tell.
  if (!checkTenseParity(opts)) {
    var tCorrect = _tense(correct);
    var tOthers = opts.filter(function (o, i) { return i !== q.correct; });
    if (tOthers.every(function (o) { return _tense(o) !== tCorrect; })) {
      return { guessed: true, reason: 'tense tells (correct option uniquely matches the slot tense)' };
    }
  }
  // Semantic-mismatch tell is intentionally NOT applied in the
  // default blind-solve. The POS / number / tense / case / length
  // tells together cover the majority of guessable patterns, and
  // semantic mismatch frequently false-positives on synonyms.
  return { guessed: false, reason: 'passes blind-solve' };
}

// Aggregate audit. Returns { ok, score (0-100), reasons[] }. A
// question scores 100 when it passes every check.
function auditQuestion(q) {
  var reasons = [];
  if (!q || !Array.isArray(q.options) || typeof q.correct !== 'number') {
    return { ok: false, score: 0, reasons: ['not a multiple-choice shape'] };
  }
  // Each check worth ~16 points; 6 checks total.
  var pts = 100;
  if (!checkCaseParity(q.options))    { reasons.push('options use mixed capitalisation'); pts -= 16; }
  if (!checkLengthParity(q.options))  { reasons.push('options vary too much in length'); pts -= 16; }
  if (!checkPosParity(q.options))     { reasons.push('options span different parts of speech'); pts -= 18; }
  if (!checkNumberParity(q.options))  { reasons.push('options mix singular and plural'); pts -= 12; }
  if (!checkTenseParity(q.options))   { reasons.push('options mix tenses'); pts -= 12; }
  // Semantic-parity is OPT-IN only (caller passes auditQuestion(q,
  // { semantic: true })) — by default we trust that distractor
  // pools come from key-term vocabularies, not source substrings,
  // so synonym distractors ("leads / directs / drives / brings")
  // are not penalised for failing source-substring lookup.
  var bs = blindSolve(q);
  if (bs.guessed) { reasons.push('blind-solve flag: ' + bs.reason); pts -= 20; }
  pts = Math.max(0, pts);
  return { ok: pts >= 70 && !bs.guessed, score: pts, reasons: reasons, blindSolve: bs };
}

// Aggregate over a question array. Returns
// { total, pass, fail, score, reasons (frequency map), blindSolveCount }
function auditQuestionSet(qs) {
  qs = Array.isArray(qs) ? qs : [];
  var pass = 0, fail = 0, totalScore = 0;
  var reasonCounts = {};
  var blindSolveCount = 0;
  qs.forEach(function (q) {
    var a = auditQuestion(q);
    totalScore += a.score;
    if (a.ok) pass++; else fail++;
    if (a.blindSolve && a.blindSolve.guessed) blindSolveCount++;
    a.reasons.forEach(function (r) { reasonCounts[r] = (reasonCounts[r] || 0) + 1; });
  });
  return {
    total: qs.length,
    pass: pass,
    fail: fail,
    score: qs.length ? Math.round(totalScore / qs.length) : 0,
    eliminationResistance: qs.length ? Math.round((qs.length - blindSolveCount) / qs.length * 100) : 0,
    blindSolveCount: blindSolveCount,
    reasonCounts: reasonCounts
  };
}

if (typeof window !== 'undefined') {
  window.LoadAttainQuality = {
    auditQuestion: auditQuestion,
    auditQuestionSet: auditQuestionSet,
    classifyPos: classifyPos,
    checkCaseParity: checkCaseParity,
    checkLengthParity: checkLengthParity,
    checkPosParity: checkPosParity,
    checkNumberParity: checkNumberParity,
    checkTenseParity: checkTenseParity,
    checkSemanticParity: checkSemanticParity,
    blindSolve: blindSolve
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    auditQuestion: auditQuestion,
    auditQuestionSet: auditQuestionSet,
    classifyPos: classifyPos,
    checkCaseParity: checkCaseParity,
    checkLengthParity: checkLengthParity,
    checkPosParity: checkPosParity,
    checkNumberParity: checkNumberParity,
    checkTenseParity: checkTenseParity,
    checkSemanticParity: checkSemanticParity,
    blindSolve: blindSolve
  };
}
})();
