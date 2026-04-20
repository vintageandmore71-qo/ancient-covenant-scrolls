// ACR Study — Question Validator
//
// CHAT-TIME CURATION TOOL ONLY. Not loaded by the PWA. Not cached
// by the service worker. Run with Node during content authoring to
// lint a batch of questions before committing.
//
// Spec: study/BUILD_PLAN.md → "PENDING INSTRUCTIONS BACKLOG →
// #3 Question Validation".
//
// Usage (CLI):
//   node study/validate-questions.js <content.json> [body.txt]
//
// - <content.json>  A study content file (new schema: question/options/
//                   correct letter/hint/source_passage) OR a legacy
//                   study/content/file_N.json (auto-normalized).
// - [body.txt]      Optional raw chapter body. If omitted, the
//                   source_quote/source_passage field is trusted as-is
//                   for checkSourcePassageExists.
//
// Usage (module):
//   const { validateQuestion, validateBatch, checkDifficultyBalance }
//     = require('./validate-questions.js');
//
// Every check runs independently; failures collect into `reasons[]`
// so one question can fail multiple rules in a single pass.

'use strict';

// ---------- Schema normalization ----------

// Accept both the new spec schema and the existing legacy schema.
// Normalizes in-memory only; never rewrites source files.
function normalizeQuestion(q) {
  const out = Object.assign({}, q);
  // legacy fill_blank style -> treat prompt as question, answer as correct
  if (!out.question && out.prompt) out.question = out.prompt;
  if (out.answer && out.correct === undefined) out.correct = out.answer;
  // legacy source_quote -> source_passage
  if (!out.source_passage && out.source_quote) out.source_passage = out.source_quote;
  // integer correct -> letter correct (0->A, 1->B...)
  if (typeof out.correct === 'number' && Array.isArray(out.options)) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    if (out.correct >= 0 && out.correct < out.options.length) {
      out._correctValue = out.options[out.correct];
      out.correct = letters[out.correct];
    }
  } else if (typeof out.correct === 'string' && /^[A-F]$/.test(out.correct) && Array.isArray(out.options)) {
    const idx = out.correct.charCodeAt(0) - 65;
    if (idx >= 0 && idx < out.options.length) out._correctValue = out.options[idx];
  } else if (typeof out.correct === 'string' && Array.isArray(out.options)) {
    // correct holds the answer string itself
    out._correctValue = out.correct;
  }
  return out;
}

// ---------- Per-question checks ----------

function checkRequiredFields(q, reasons) {
  const required = ['question', 'options', 'correct', 'hint', 'source_passage'];
  required.forEach(function (field) {
    const v = q[field];
    if (v === undefined || v === null) {
      reasons.push('missing field: ' + field);
      return;
    }
    if (typeof v === 'string' && v.trim() === '') {
      reasons.push('empty field: ' + field);
    }
    if (field === 'options' && (!Array.isArray(v) || v.length < 2)) {
      reasons.push('options must be an array of 2+ entries');
    }
  });
}

function checkQuestionLength(q, reasons) {
  if (!q.question) return;
  const words = q.question.trim().split(/\s+/).filter(Boolean);
  if (words.length > 20) {
    reasons.push('question is ' + words.length + ' words (>20)');
  }
}

function checkNoDoubleNegative(q, reasons) {
  if (!q.question) return;
  const text = q.question.toLowerCase();
  const patterns = [
    /\bnot\s+\w+\s+(?:no|never|none|neither|nothing|nobody|nowhere)\b/,
    /\bnever\s+\w+\s+(?:no|not|none|nothing)\b/,
    /\bno\s+\w+\s+(?:not|never|without)\b/,
    /\bwithout\s+\w+\s+(?:not|no|never)\b/,
    /\bn[o']t\s+\w+\s+(?:n[o']t|never|none)\b/
  ];
  for (let i = 0; i < patterns.length; i++) {
    if (patterns[i].test(text)) {
      reasons.push('double negative detected');
      return;
    }
  }
}

function checkAnswerIsUnambiguous(q, reasons) {
  if (!Array.isArray(q.options)) return;
  // No two options may be the same string (case-insensitive, trimmed)
  const seen = {};
  for (let i = 0; i < q.options.length; i++) {
    const key = String(q.options[i]).trim().toLowerCase();
    if (seen[key]) {
      reasons.push('ambiguous: duplicate option "' + q.options[i] + '"');
      return;
    }
    seen[key] = true;
  }
}

function checkDistractorsNotAbsurd(q, reasons) {
  if (!Array.isArray(q.options)) return;
  const absurdMarkers = [
    /^none of the above$/i,
    /^all of the above$/i,
    /^(lorem|ipsum|foo|bar|baz|xxx|todo|tbd)$/i,
    /^(n\/a|na|\?+|\.+|-+)$/i
  ];
  for (let i = 0; i < q.options.length; i++) {
    const opt = String(q.options[i]).trim();
    if (opt.length < 1) {
      reasons.push('empty distractor at index ' + i);
      continue;
    }
    for (let m = 0; m < absurdMarkers.length; m++) {
      if (absurdMarkers[m].test(opt)) {
        reasons.push('absurd/placeholder option: "' + opt + '"');
        break;
      }
    }
  }
}

function checkAnswerInOptions(q, reasons) {
  if (!Array.isArray(q.options) || !q.correct) return;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  if (typeof q.correct === 'string' && /^[A-F]$/.test(q.correct)) {
    const idx = letters.indexOf(q.correct);
    if (idx < 0 || idx >= q.options.length) {
      reasons.push('correct letter ' + q.correct + ' out of range for ' + q.options.length + ' options');
    }
    return;
  }
  // otherwise: correct should match one of the options exactly
  const correctStr = String(q.correct).trim().toLowerCase();
  const found = q.options.some(function (o) { return String(o).trim().toLowerCase() === correctStr; });
  if (!found) reasons.push('correct value "' + q.correct + '" not in options');
}

function normalizeForMatch(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    // strip punctuation so trailing periods and commas don't break matches
    .replace(/[.,;:!?()"'\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function checkSourcePassageExists(q, bodyText, reasons) {
  if (!q.source_passage) return;
  if (!bodyText) return; // trust-mode when body not provided
  const body = normalizeForMatch(bodyText);
  const passage = normalizeForMatch(q.source_passage);
  if (passage.length < 10) {
    reasons.push('source_passage too short to verify');
    return;
  }
  // Try full passage first, then a 40-char probe as fallback.
  if (body.indexOf(passage) !== -1) return;
  const probe = passage.slice(0, Math.min(40, passage.length));
  if (body.indexOf(probe) === -1) {
    reasons.push('source_passage not found in provided body text');
  }
}

const FRONT_MATTER_REFS = [
  /\btable of contents\b/i, /\bcopyright\b/i, /\bisbn\b/i,
  /\bpreface\b/i, /\bforeword\b/i, /\bintroduction\s+(?:section|page|chapter)\b/i,
  /\bindex\b\s*(?:page|section)?/i, /\babout the author\b/i,
  /\bauthor\s+bio(?:graphy)?\b/i, /\bpublisher\b/i, /\bdedication\s+page\b/i,
  /\btitle page\b/i, /\bfootnote\b/i, /\bappendix\b/i
];

function checkNotFromFrontMatter(q, reasons) {
  const joined = [q.question, q.source_passage, q.hint].filter(Boolean).join(' ');
  for (let i = 0; i < FRONT_MATTER_REFS.length; i++) {
    if (FRONT_MATTER_REFS[i].test(joined)) {
      reasons.push('references front/back matter: ' + FRONT_MATTER_REFS[i]);
      return;
    }
  }
}

function checkNoJargonDump(q, reasons) {
  if (!q.question) return;
  const words = q.question.split(/\s+/).filter(Boolean);
  let longWords = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i].replace(/[^\w'-]/g, '');
    if (w.length >= 13) longWords++;
  }
  // More than 2 very long words in a short question signals jargon dump.
  if (longWords > 2) reasons.push('jargon dump: ' + longWords + ' long words');
  // Average word length > 8 is a second signal.
  const letterCount = words.reduce(function (a, w) { return a + w.replace(/[^\w]/g, '').length; }, 0);
  if (words.length > 0 && letterCount / words.length > 8) {
    reasons.push('average word length too high (' + (letterCount / words.length).toFixed(1) + ')');
  }
}

function checkDistractorsArePlausible(q, reasons) {
  if (!Array.isArray(q.options) || q.options.length < 3) return;
  // Heuristic: flag only egregious length mismatches (>6x) that signal
  // a toss-in distractor. Single-word-vs-phrase is legitimate.
  const correct = q._correctValue || q.correct;
  if (!correct || typeof correct !== 'string') return;
  const correctLen = correct.trim().length;
  if (correctLen < 3) return;
  for (let i = 0; i < q.options.length; i++) {
    const opt = String(q.options[i]).trim();
    if (opt === String(correct).trim()) continue;
    if (opt.length < 2) continue; // caught by checkDistractorsNotAbsurd
    const ratio = Math.max(opt.length, correctLen) / Math.min(opt.length, correctLen);
    if (ratio > 6) {
      reasons.push('distractor "' + opt + '" length wildly different from answer');
      return;
    }
  }
}

function checkAnswerNotKeywordOnly(q, bodyText, reasons) {
  if (!q.question) return;
  // Comprehension signal: question contains a why/how/explain/means/compare word
  // OR is longer than 6 words. If the question is short AND purely "what is X"
  // style AND the answer is a single word that appears verbatim in the question,
  // that's keyword-spotting bait.
  const text = q.question.toLowerCase();
  const comprehensionWords = /\b(why|how|explain|describe|compare|means?|mean|because|therefore|if|then|relationship|cause|effect|result|purpose)\b/;
  const hasComprehensionCue = comprehensionWords.test(text);
  const words = text.split(/\s+/).filter(Boolean);
  const correct = q._correctValue || q.correct;
  if (typeof correct !== 'string') return;
  const ans = correct.trim().toLowerCase();
  if (!ans || ans.indexOf(' ') !== -1) return; // multi-word answers are fine
  // If short question AND single-word answer AND no comprehension cue AND
  // answer word appears in the question, that's pure keyword spotting.
  const answerInQuestion = text.indexOf(ans) !== -1;
  if (!hasComprehensionCue && words.length <= 8 && answerInQuestion) {
    reasons.push('keyword-spotting bait (answer word in short question, no why/how cue)');
  }
}

// ---------- Wrappers ----------

function validateQuestion(questionObj, bodyText) {
  const q = normalizeQuestion(questionObj);
  const reasons = [];
  checkRequiredFields(q, reasons);
  checkQuestionLength(q, reasons);
  checkNoDoubleNegative(q, reasons);
  checkAnswerIsUnambiguous(q, reasons);
  checkDistractorsNotAbsurd(q, reasons);
  checkAnswerInOptions(q, reasons);
  checkSourcePassageExists(q, bodyText, reasons);
  checkNotFromFrontMatter(q, reasons);
  checkNoJargonDump(q, reasons);
  checkDistractorsArePlausible(q, reasons);
  checkAnswerNotKeywordOnly(q, bodyText, reasons);
  return { valid: reasons.length === 0, reasons: reasons };
}

function validateBatch(questionsArray, bodyText) {
  const passed = [];
  const failed = [];
  questionsArray.forEach(function (q, index) {
    const result = validateQuestion(q, bodyText);
    if (result.valid) passed.push(q);
    else failed.push({ index: index, question: q.question || q.prompt || 'NO QUESTION TEXT', reasons: result.reasons });
  });
  return { passed: passed, failed: failed, total: questionsArray.length };
}

function checkDifficultyBalance(questionsArray) {
  const total = questionsArray.length;
  const warnings = [];
  if (total < 10) return { total: total, warnings: warnings, counts: null };
  const counts = { recall: 0, comprehension: 0, analysis: 0, untagged: 0 };
  questionsArray.forEach(function (q) {
    const d = (q.difficulty || '').toLowerCase();
    if (counts[d] !== undefined) counts[d]++;
    else counts.untagged++;
  });
  const r = counts.recall / total;
  const c = counts.comprehension / total;
  const a = counts.analysis / total;
  if (r < 0.2 || r > 0.4) warnings.push('recall off (target 3/10, got ' + counts.recall + ')');
  if (c < 0.3 || c > 0.5) warnings.push('comprehension off (target 4/10, got ' + counts.comprehension + ')');
  if (a < 0.2 || a > 0.4) warnings.push('analysis off (target 3/10, got ' + counts.analysis + ')');
  if (counts.untagged > 0) warnings.push(counts.untagged + ' questions missing difficulty tag');
  return { total: total, warnings: warnings, counts: counts };
}

// ---------- CLI ----------

if (typeof require !== 'undefined' && require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const contentPath = process.argv[2];
  const bodyPath = process.argv[3];
  if (!contentPath) {
    console.error('Usage: node validate-questions.js <content.json> [body.txt]');
    process.exit(2);
  }
  const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
  const body = bodyPath ? fs.readFileSync(bodyPath, 'utf8') : '';
  const buckets = [];
  if (Array.isArray(content)) buckets.push({ name: 'root', items: content });
  else {
    // Spec targets multiple-choice questions. fill_blank has a different
    // shape (no options) and is not covered by the locked validator spec.
    ['questions', 'multiple_choice'].forEach(function (k) {
      if (Array.isArray(content[k])) buckets.push({ name: k, items: content[k] });
    });
  }
  if (buckets.length === 0) {
    console.error('No question arrays found. Expected: top-level array, or one of questions / multiple_choice.');
    process.exit(2);
  }
  let anyFailed = false;
  buckets.forEach(function (bucket) {
    const result = validateBatch(bucket.items, body);
    const balance = checkDifficultyBalance(bucket.items);
    console.log('\n[' + bucket.name + '] ' + result.passed.length + ' of ' + result.total + ' passed');
    if (result.failed.length) {
      anyFailed = true;
      result.failed.forEach(function (f) {
        console.log('  #' + f.index + ' ' + f.question);
        f.reasons.forEach(function (r) { console.log('     - ' + r); });
      });
    }
    if (balance.warnings.length) {
      console.log('  Balance warnings:');
      balance.warnings.forEach(function (w) { console.log('     - ' + w); });
    }
  });
  process.exit(anyFailed ? 1 : 0);
}

// ---------- Module exports ----------

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateQuestion: validateQuestion,
    validateBatch: validateBatch,
    checkDifficultyBalance: checkDifficultyBalance,
    normalizeQuestion: normalizeQuestion,
    checks: {
      checkRequiredFields: checkRequiredFields,
      checkQuestionLength: checkQuestionLength,
      checkNoDoubleNegative: checkNoDoubleNegative,
      checkAnswerIsUnambiguous: checkAnswerIsUnambiguous,
      checkDistractorsNotAbsurd: checkDistractorsNotAbsurd,
      checkAnswerInOptions: checkAnswerInOptions,
      checkSourcePassageExists: checkSourcePassageExists,
      checkNotFromFrontMatter: checkNotFromFrontMatter,
      checkNoJargonDump: checkNoJargonDump,
      checkDistractorsArePlausible: checkDistractorsArePlausible,
      checkAnswerNotKeywordOnly: checkAnswerNotKeywordOnly
    }
  };
}
