// Attain — Universal Study PWA
// Copyright (c) 2026 DssOrit. All Rights Reserved.
// Unauthorized reproduction, modification, distribution, or
// commercial use is strictly prohibited. See LICENSE at the
// repository root for the full terms.
//
// Attain Universal — Parser Module
// PDF.js ingestion, EPUB parsing, text parsing, chapter detection, key term extraction
// Client-side only — no server required

// ---- PDF Parsing (via PDF.js loaded from CDN) ----
function parsePDF(file) {
  return new Promise(function (resolve, reject) {
    if (!window.pdfjsLib) {
      reject(new Error('PDF.js not loaded'));
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var typedArray = new Uint8Array(ev.target.result);
      pdfjsLib.getDocument({ data: typedArray }).promise.then(function (pdf) {
        var total = pdf.numPages;
        var pages = [];

        function processPage(num) {
          if (num > total) {
            var fullText = pages.join('\n\n');
            if (!fullText.trim()) {
              reject(new Error('No text extracted from PDF — it may be image-based'));
              return;
            }
            resolve(fullText);
            return;
          }
          // Update status if element exists
          var statusEl = document.getElementById('upload-status');
          if (statusEl) statusEl.textContent = '\u23F3 Reading page ' + num + ' of ' + total + '...';

          pdf.getPage(num).then(function (page) {
            return page.getTextContent();
          }).then(function (content) {
            var text = content.items.map(function (item) {
              return item.str;
            }).join(' ').trim();
            pages.push(text);
            processPage(num + 1);
          }).catch(function () {
            pages.push('');
            processPage(num + 1);
          });
        }

        processPage(1);
      }).catch(function (err) {
        reject(new Error('PDF parse error: ' + err.message));
      });
    };
    reader.onerror = function () { reject(new Error('Failed to read file')); };
    reader.readAsArrayBuffer(file);
  });
}

// ---- EPUB Parsing (via epub.js loaded from CDN) ----
function parseEPUB(file) {
  return new Promise(function (resolve, reject) {
    if (!window.ePub) {
      reject(new Error('epub.js not loaded'));
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var book = ePub(ev.target.result);
      book.ready.then(function () {
        return book.loaded.spine;
      }).then(function (spine) {
        var chapters = [];
        var items = spine.items || spine.spineItems || [];
        var processed = 0;

        if (!items.length) {
          reject(new Error('No chapters found in EPUB'));
          return;
        }

        function processItem(idx) {
          if (idx >= items.length) {
            var fullText = chapters.sort(function (a, b) {
              return a.idx - b.idx;
            }).map(function (c) { return c.text; }).join('\n\n---CHAPTER_BREAK---\n\n');
            resolve(fullText);
            return;
          }
          var item = items[idx];
          book.load(item.href).then(function (doc) {
            var div = document.createElement('div');
            if (typeof doc === 'string') {
              div.innerHTML = doc;
            } else if (doc && doc.body) {
              div.innerHTML = doc.body.innerHTML;
            } else if (doc && doc.documentElement) {
              div.innerHTML = doc.documentElement.innerHTML;
            }
            var text = div.textContent || div.innerText || '';
            chapters.push({ idx: idx, text: text.trim() });
            processItem(idx + 1);
          }).catch(function () {
            chapters.push({ idx: idx, text: '' });
            processItem(idx + 1);
          });
        }

        processItem(0);
      }).catch(function (err) {
        reject(new Error('EPUB parse error: ' + err.message));
      });
    };
    reader.onerror = function () { reject(new Error('Failed to read file')); };
    reader.readAsArrayBuffer(file);
  });
}

// ---- Plain Text / Paste Parsing ----
function parsePlainText(text) {
  return Promise.resolve(text);
}

// ---- DOCX Parsing (basic — extracts text from XML) ----
function parseDOCX(file) {
  return new Promise(function (resolve, reject) {
    if (!window.JSZip) {
      reject(new Error('JSZip not loaded — cannot parse DOCX'));
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      JSZip.loadAsync(ev.target.result).then(function (zip) {
        var docXml = zip.file('word/document.xml');
        if (!docXml) {
          reject(new Error('Not a valid DOCX file'));
          return;
        }
        docXml.async('string').then(function (xmlStr) {
          var div = document.createElement('div');
          div.innerHTML = xmlStr;
          var paragraphs = div.querySelectorAll('w\\:p, p');
          var lines = [];
          for (var i = 0; i < paragraphs.length; i++) {
            var texts = paragraphs[i].querySelectorAll('w\\:t, t');
            var line = '';
            for (var j = 0; j < texts.length; j++) {
              line += texts[j].textContent;
            }
            if (line.trim()) lines.push(line.trim());
          }
          resolve(lines.join('\n'));
        });
      }).catch(function (err) {
        reject(new Error('DOCX parse error: ' + err.message));
      });
    };
    reader.onerror = function () { reject(new Error('Failed to read file')); };
    reader.readAsArrayBuffer(file);
  });
}

// ---- Unified File Parser ----
function parseFile(file) {
  var name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return parsePDF(file);
  if (name.endsWith('.epub')) return parseEPUB(file);
  if (name.endsWith('.docx')) return parseDOCX(file);
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.html') || name.endsWith('.htm')) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        var text = ev.target.result;
        if (name.endsWith('.html') || name.endsWith('.htm')) {
          var div = document.createElement('div');
          div.innerHTML = text;
          text = div.textContent || div.innerText || '';
        }
        resolve(text);
      };
      reader.onerror = function () { reject(new Error('Failed to read file')); };
      reader.readAsText(file);
    });
  }
  return Promise.reject(new Error('Unsupported file type: ' + name.split('.').pop()));
}

// ---- Chapter Detection ----
// Detects chapter breaks from raw text using multiple heuristics

// Written-out numbers 1-99 for "Chapter Ten", "Chapter Twenty-Two" style
// books. Anchored to avoid matching "Chapter title ..." with "title" being
// a non-number word.
var WORD_NUM_RE = '(?:one|two|three|four|five|six|seven|eight|nine|ten|' +
  'eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|' +
  'twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)' +
  '(?:[\\s-](?:one|two|three|four|five|six|seven|eight|nine))?';

var CHAPTER_PATTERNS = [
  /^chapter\s+\d+/i,
  new RegExp('^chapter\\s+' + WORD_NUM_RE + '\\b', 'i'),
  /^ch\.\s*\d+/i,
  /^ch\s+\d+/i,
  /^ch\.\d+/i,
  /^act\s+\w+/i,
  /^part\s+\w+/i,
  /^section\s+\d+/i,
  /^book\s+\d+/i,
  /^volume\s+\w+/i,
  /^interlude/i,
  /^prologue/i,
  /^epilogue/i,
  /^\d+\.\s+[A-Z]/,
  /^\d+$/,
  /^[IVXLC]+\.\s/,
  /^---CHAPTER_BREAK---$/
];

var HEADING_PATTERNS = [
  /^[A-Z][A-Z\s]{4,}$/,
  /^[A-Z][A-Z\s\-:]{8,}$/,
  /^[A-Z][A-Z\s\-—:,.']{4,80}$/
];

function cleanTitle(raw, chapterNum) {
  if (!raw || !raw.trim()) return 'Chapter ' + chapterNum;
  var title = raw.trim();
  // If title is too long, truncate at a natural break
  if (title.length > 80) {
    var cut = title.indexOf(' — ');
    if (cut > 10 && cut < 80) { title = title.slice(0, cut); }
    else if (title.indexOf('. ') > 10 && title.indexOf('. ') < 80) { title = title.slice(0, title.indexOf('. ')); }
    else { title = title.slice(0, 77) + '...'; }
  }
  // If it's a full paragraph, use a generic title
  if (title.length > 60 && title.split(/\s+/).length > 12) {
    return 'Chapter ' + chapterNum;
  }
  return title;
}

function generateSubtitle(paragraphs) {
  if (!paragraphs || !paragraphs.length) return '';
  var first = paragraphs[0].trim();
  // Look for a short opening line that could be a heading
  if (first.length < 80 && first.length > 3) return first;
  // Extract first sentence
  var sentEnd = first.indexOf('. ');
  if (sentEnd > 5 && sentEnd < 80) return first.slice(0, sentEnd);
  // First few words
  var words = first.split(/\s+/).slice(0, 8).join(' ');
  return words.length > 3 ? words + '...' : '';
}

// High-confidence front-matter signals only. Ambiguous patterns
// (bare "Introduction", "Preface", "Notes", bare two-word proper names,
// "Appendix", "Glossary", "Index", "Bibliography") are NOT filtered here
// because they are often legitimate chapter content. We prefer to let
// ambiguous front matter through rather than silently delete real
// chapters. The extractKeyTerms edge-chapter filter still catches most
// author-name leaks from title pages that do slip through.
var FRONT_MATTER_PATTERNS = [
  /^copyright\b/i, /^all rights reserved\b/i, /^isbn\b/i,
  /^table of contents$/i, /^contents$/i,
  /^\u00a9\s*\d{4}/,
  /^published by\b/i, /^printed in\b/i,
  /^library of congress\b/i, /^first edition\b/i,
  /^first printing\b/i, /^first published\b/i,
  /^cataloging[-\s]in[-\s]publication\b/i,
  /^no part of this (?:book|publication)\b/i,
  /^this book is a work of fiction\b/i,
  /^a\s+cip\s+catalogue\b/i,
  /^names:\s*characters/i,
  /^cover design\b/i, /^editing by\b/i,
  /^translated by\b/i, /^illustrated by\b/i,
  /^manufactured in\b/i, /^typeset (?:by|in)\b/i
];

function isFrontMatter(text) {
  if (!text) return true;
  var lower = text.toLowerCase().trim();
  if (lower.length < 3) return true;
  for (var i = 0; i < FRONT_MATTER_PATTERNS.length; i++) {
    if (FRONT_MATTER_PATTERNS[i].test(lower)) return true;
  }
  return false;
}

function isFrontMatterChapter(ch) {
  if (!ch || !ch.paragraphs || ch.paragraphs.length === 0) return true;
  // Check title + first paragraph only. Previously we scanned deeper
  // and a per-paragraph scrubber, but that ate legitimate chapter
  // content whose opening lines merely resembled bylines.
  var firstPara = ch.paragraphs[0] || '';
  var probe = (ch.title || '') + ' ' + firstPara;
  return isFrontMatter(probe);
}

// Detects title-page / cover-page paragraphs: short lines that are
// mostly uppercase (>= 55% of letters) and contain at least two words
// in ALL-CAPS. Used ONLY on the first detected chapter to remove cover
// dumps without touching real dialogue or content elsewhere.
function isTitlePageParagraph(text) {
  if (!text) return false;
  var t = String(text).trim();
  if (t.length > 200) return false; // real paragraphs are longer
  if (t.length < 3) return false;
  var letters = t.replace(/[^A-Za-z]/g, '');
  if (letters.length < 6) return false;
  var uppers = letters.replace(/[^A-Z]/g, '').length;
  var upperRatio = uppers / letters.length;
  // Count ALL-CAPS words of 2+ letters
  var words = t.split(/\s+/);
  var allCapWords = 0;
  for (var i = 0; i < words.length; i++) {
    var w = words[i].replace(/[^A-Za-z]/g, '');
    if (w.length >= 2 && w === w.toUpperCase()) allCapWords++;
  }
  return upperRatio >= 0.55 && allCapWords >= 2;
}

function detectChapters(rawText) {
  var lines = rawText.split('\n');
  var chapters = [];
  var currentTitle = 'Chapter 1';
  var currentLines = [];
  var chapterCount = 0;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    var isChapterBreak = false;

    // Check explicit break marker (from EPUB parsing)
    if (line === '---CHAPTER_BREAK---') {
      isChapterBreak = true;
    }

    // Check chapter patterns (Chapter N, CH.N, Part N, Volume N, etc.)
    if (!isChapterBreak) {
      for (var p = 0; p < CHAPTER_PATTERNS.length; p++) {
        if (CHAPTER_PATTERNS[p].test(line)) {
          isChapterBreak = true;
          break;
        }
      }
    }

    // Also check if a short line (< 60 chars) starts with a chapter marker.
    // Handles "Chapter 10", "Chapter Ten", "Chapter Twenty-Two" equivalently.
    if (!isChapterBreak && line.length < 60) {
      if (/^chapter\s+\d+/i.test(line)
          || new RegExp('^chapter\\s+' + WORD_NUM_RE + '\\b', 'i').test(line)
          || /^act\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)/i.test(line)
          || /^interlude$/i.test(line)) {
        isChapterBreak = true;
      }
    }

    // Only use ALL-CAPS heading patterns if we have enough content
    // before them (at least 20 lines) — prevents splitting on
    // every section header within a chapter
    if (!isChapterBreak && line.length > 4 && line.length < 100 && currentLines.length >= 20) {
      for (var h = 0; h < HEADING_PATTERNS.length; h++) {
        if (HEADING_PATTERNS[h].test(line)) {
          isChapterBreak = true;
          break;
        }
      }
    }

    if (isChapterBreak && currentLines.length > 0) {
      chapterCount++;
      chapters.push({
        title: cleanTitle(currentTitle, chapterCount),
        paragraphs: linesToParagraphs(currentLines)
      });
      currentTitle = line === '---CHAPTER_BREAK---' ? 'Chapter ' + (chapterCount + 1) : line;
      currentLines = [];
    } else if (line !== '---CHAPTER_BREAK---') {
      if (currentLines.length === 0 && chapters.length === 0 && isChapterBreak) {
        currentTitle = line;
      } else {
        currentLines.push(line);
      }
    }
  }

  // Push final chapter
  if (currentLines.length > 0) {
    chapters.push({
      title: cleanTitle(currentTitle, chapters.length + 1),
      paragraphs: linesToParagraphs(currentLines)
    });
  }

  // Merge tiny chapters (< 3 paragraphs) into previous chapter
  var merged = [];
  for (var m = 0; m < chapters.length; m++) {
    if (chapters[m].paragraphs.length < 3 && merged.length > 0) {
      var prev = merged[merged.length - 1];
      prev.paragraphs = prev.paragraphs.concat(chapters[m].paragraphs);
    } else {
      merged.push(chapters[m]);
    }
  }
  chapters = merged;

  // Remove front-matter chapters (copyright page, TOC, publisher data,
  // etc.) only when the signal is strong.
  chapters = chapters.filter(function (ch) {
    return !isFrontMatterChapter(ch);
  });

  // Strip title-page style paragraphs from the FIRST chapter only. These
  // are the "BRITE STAR / THE AMERICAN ANTHEM VOLUMES / The Letters"
  // cover-page dumps that PDF extraction mashes into chapter 1 when the
  // book has no explicit front-matter signals. Narrowly scoped to chapter 1
  // to avoid eating legitimate all-caps content (dialogue yelling, signs,
  // section headings) elsewhere in the book.
  if (chapters.length > 0) {
    chapters[0].paragraphs = chapters[0].paragraphs.filter(function (p) {
      return !isTitlePageParagraph(p);
    });
  }

  // Remove chapters with very little content (likely blank pages)
  chapters = chapters.filter(function (ch) {
    var totalText = ch.paragraphs.join(' ');
    return totalText.length > 50;
  });

  // If no chapters detected, split by paragraph count
  if (chapters.length <= 1 && rawText.length > 3000) {
    chapters = splitByParagraphCount(rawText);
  }

  // Ensure at least one chapter
  if (chapters.length === 0) {
    chapters.push({
      title: 'Full Text',
      paragraphs: linesToParagraphs(rawText.split('\n').filter(function (l) { return l.trim(); }))
    });
  }

  return chapters;
}

function linesToParagraphs(lines) {
  var paragraphs = [];
  var current = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) {
      if (current.length > 0) {
        paragraphs.push(current.join(' '));
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    paragraphs.push(current.join(' '));
  }

  // If everything ended up as one paragraph, split by sentences
  if (paragraphs.length === 1 && paragraphs[0].length > 500) {
    var sentences = paragraphs[0].match(/[^.!?]+[.!?]+/g) || [paragraphs[0]];
    paragraphs = [];
    var chunk = '';
    for (var s = 0; s < sentences.length; s++) {
      chunk += sentences[s].trim() + ' ';
      if (chunk.length > 200 || s === sentences.length - 1) {
        paragraphs.push(chunk.trim());
        chunk = '';
      }
    }
  }

  return paragraphs.filter(function (p) { return p.length > 0; });
}

// Fallback: split large single-chapter text into ~20 paragraph chunks
function splitByParagraphCount(rawText) {
  var allParas = rawText.split(/\n\s*\n/).filter(function (p) { return p.trim().length > 10; });
  if (allParas.length < 10) {
    // Try single newlines
    allParas = rawText.split('\n').filter(function (l) { return l.trim().length > 10; });
  }
  var chunkSize = Math.max(5, Math.ceil(allParas.length / 15));
  var chapters = [];
  for (var i = 0; i < allParas.length; i += chunkSize) {
    var slice = allParas.slice(i, i + chunkSize);
    chapters.push({
      title: 'Section ' + (chapters.length + 1),
      paragraphs: slice.map(function (p) { return p.trim(); })
    });
  }
  return chapters;
}

// ---- Key Term Extraction (Frequency Analysis) ----

var STOP_WORDS = new Set([
  // Articles, conjunctions, prepositions
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'upon', 'unto', 'about', 'above',
  'after', 'again', 'against', 'among', 'around', 'before', 'behind',
  'below', 'beneath', 'beside', 'between', 'beyond', 'during', 'down',
  'except', 'inside', 'into', 'near', 'off', 'onto', 'out', 'outside',
  'over', 'past', 'since', 'through', 'throughout', 'till', 'toward',
  'towards', 'under', 'underneath', 'until', 'up', 'upon', 'versus',
  'via', 'within', 'without',
  // Pronouns
  'i', 'me', 'my', 'mine', 'myself', 'we', 'us', 'our', 'ours',
  'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
  'themselves', 'who', 'whom', 'whose', 'which', 'what', 'where',
  'when', 'why', 'how', 'this', 'that', 'these', 'those', 'someone',
  'somebody', 'anyone', 'anybody', 'everyone', 'everybody', 'nobody',
  'none', 'nothing', 'something', 'anything', 'everything',
  // Be / have / do
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'done',
  // Modals
  'will', 'would', 'could', 'should', 'may', 'might', 'shall',
  'can', 'must', 'ought',
  // Negation
  'not', 'no', 'nor', 'never', 'neither', 'none',
  // Common verbs (base + conjugations)
  'get', 'got', 'gotten', 'getting', 'make', 'made', 'makes', 'making',
  'take', 'took', 'taken', 'taking', 'takes', 'come', 'came', 'comes',
  'coming', 'go', 'went', 'gone', 'going', 'goes', 'say', 'said',
  'says', 'saying', 'see', 'saw', 'seen', 'sees', 'seeing', 'know',
  'knew', 'known', 'knows', 'knowing', 'think', 'thought', 'thinks',
  'thinking', 'look', 'looked', 'looking', 'looks', 'want', 'wanted',
  'wanting', 'wants', 'give', 'gave', 'given', 'giving', 'gives',
  'use', 'used', 'using', 'uses', 'find', 'found', 'finding', 'finds',
  'tell', 'told', 'telling', 'tells', 'ask', 'asked', 'asking', 'asks',
  'work', 'worked', 'working', 'works', 'seem', 'seemed', 'seeming',
  'seems', 'feel', 'felt', 'feeling', 'feels', 'try', 'tried', 'trying',
  'tries', 'leave', 'left', 'leaving', 'leaves', 'call', 'called',
  'calling', 'calls', 'need', 'needed', 'needing', 'needs', 'become',
  'became', 'becoming', 'becomes', 'mean', 'meant', 'meaning', 'means',
  'keep', 'kept', 'keeping', 'keeps', 'hold', 'held', 'holding',
  'holds', 'bring', 'brought', 'bringing', 'brings', 'begin', 'began',
  'begun', 'beginning', 'begins', 'happen', 'happened', 'happening',
  'happens', 'write', 'wrote', 'written', 'writing', 'writes',
  'provide', 'provided', 'providing', 'provides', 'sit', 'sat',
  'sitting', 'sits', 'stand', 'stood', 'standing', 'stands', 'lose',
  'lost', 'losing', 'loses', 'pay', 'paid', 'paying', 'pays', 'meet',
  'met', 'meeting', 'meets', 'include', 'included', 'including',
  'includes', 'continue', 'continued', 'continuing', 'continues',
  'set', 'sets', 'setting', 'learn', 'learned', 'learnt', 'learning',
  'learns', 'change', 'changed', 'changing', 'changes', 'lead', 'led',
  'leading', 'leads', 'understand', 'understood', 'understanding',
  'understands', 'watch', 'watched', 'watching', 'watches', 'follow',
  'followed', 'following', 'follows', 'stop', 'stopped', 'stopping',
  'stops', 'create', 'created', 'creating', 'creates', 'speak', 'spoke',
  'spoken', 'speaking', 'speaks', 'read', 'reading', 'reads', 'allow',
  'allowed', 'allowing', 'allows', 'add', 'added', 'adding', 'adds',
  'require', 'required', 'requires', 'requiring', 'spend', 'spent',
  'spending', 'spends', 'grow', 'grew', 'grown', 'growing', 'grows',
  'open', 'opened', 'opening', 'opens', 'walk', 'walked', 'walking',
  'walks', 'win', 'won', 'winning', 'wins', 'offer', 'offered',
  'offering', 'offers', 'remember', 'remembered', 'remembering',
  'remembers', 'love', 'loved', 'loving', 'loves', 'consider',
  'considered', 'considering', 'considers', 'appear', 'appeared',
  'appearing', 'appears', 'wait', 'waited', 'waiting', 'waits',
  'serve', 'served', 'serving', 'serves', 'die', 'died', 'dying',
  'dies', 'send', 'sent', 'sending', 'sends', 'expect', 'expected',
  'expecting', 'expects', 'build', 'built', 'building', 'builds',
  'stay', 'stayed', 'staying', 'stays', 'fall', 'fell', 'fallen',
  'falling', 'falls', 'reach', 'reached', 'reaching', 'reaches',
  'remain', 'remained', 'remaining', 'remains', 'suggest', 'suggested',
  'suggesting', 'suggests', 'raise', 'raised', 'raising', 'raises',
  'pass', 'passed', 'passing', 'passes', 'sell', 'sold', 'selling',
  'sells', 'report', 'reported', 'reporting', 'reports', 'decide',
  'decided', 'deciding', 'decides', 'pull', 'pulled', 'pulling',
  'pulls', 'carry', 'carried', 'carrying', 'carries', 'break', 'broke',
  'broken', 'breaking', 'breaks', 'receive', 'received', 'receiving',
  'receives', 'agree', 'agreed', 'agreeing', 'agrees', 'support',
  'supported', 'supporting', 'supports', 'hit', 'hits', 'hitting',
  'produce', 'produced', 'producing', 'produces', 'eat', 'ate', 'eaten',
  'eating', 'eats', 'cover', 'covered', 'covering', 'covers', 'catch',
  'caught', 'catching', 'catches', 'draw', 'drew', 'drawn', 'drawing',
  'draws', 'choose', 'chose', 'chosen', 'choosing', 'chooses', 'cause',
  'caused', 'causing', 'causes', 'help', 'helped', 'helping', 'helps',
  'move', 'moved', 'moving', 'moves', 'play', 'played', 'playing',
  'plays', 'run', 'ran', 'running', 'runs', 'live', 'lived', 'living',
  'lives', 'show', 'showed', 'shown', 'showing', 'shows', 'hear',
  'heard', 'hearing', 'hears', 'let', 'lets', 'letting', 'put', 'puts',
  'putting', 'say', 'talk', 'talked', 'talking', 'talks', 'turn',
  'turned', 'turning', 'turns', 'seem', 'try', 'wish', 'wished',
  'wishing', 'wishes', 'want', 'attempt', 'attempted', 'attempting',
  'attempts',
  // Common adjectives / adverbs (non-domain-specific)
  'good', 'bad', 'big', 'small', 'large', 'little', 'long', 'short',
  'high', 'low', 'new', 'old', 'young', 'early', 'late', 'first',
  'last', 'next', 'previous', 'other', 'another', 'same', 'different',
  'own', 'able', 'available', 'various', 'several', 'possible',
  'impossible', 'necessary', 'certain', 'sure', 'true', 'false',
  'real', 'whole', 'full', 'empty', 'hard', 'easy', 'difficult',
  'simple', 'complex', 'quick', 'slow', 'fast', 'right', 'wrong',
  'poor', 'rich', 'cold', 'hot', 'warm', 'cool', 'nice', 'best',
  'better', 'worse', 'worst', 'great', 'important', 'major', 'minor',
  'really', 'actually', 'basically', 'suddenly', 'quickly', 'slowly',
  'always', 'often', 'sometimes', 'usually', 'rarely', 'probably',
  'perhaps', 'certainly', 'definitely', 'together', 'almost', 'nearly',
  'quite', 'rather', 'somewhat', 'absolutely', 'literally', 'simply',
  'just', 'only', 'ever', 'yet', 'already', 'still', 'anyway',
  'however', 'therefore', 'thus', 'hence', 'indeed', 'instead',
  'otherwise', 'moreover', 'furthermore', 'meanwhile', 'nevertheless',
  'besides', 'finally', 'soon', 'far', 'well', 'back', 'forward',
  'much', 'many', 'few', 'fewer', 'fewest', 'less', 'least', 'more',
  'most', 'such', 'very', 'so', 'too', 'either', 'neither', 'enough',
  'also', 'even', 'now', 'then', 'today', 'tomorrow', 'yesterday',
  'here', 'there', 'anywhere', 'somewhere', 'everywhere', 'nowhere',
  // Conjunctions / discourse
  'if', 'unless', 'whether', 'whereas', 'because', 'though', 'although',
  'while', 'until', 'when', 'whenever', 'wherever', 'once', 'either',
  'both', 'each', 'every', 'all', 'any', 'some', 'none', 'above',
  'like', 'unlike', 'according', 'than',
  // Narrative filler
  'says', 'said', 'asked', 'replied', 'answered', 'spoke', 'thought',
  'felt', 'looked', 'seemed', 'appeared', 'smiled', 'laughed', 'cried',
  'nodded', 'shrugged', 'sighed',
  // Numbers (written)
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty',
  'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred',
  'thousand', 'million', 'billion',
  // Generic nouns (time, place, quantity)
  'way', 'ways', 'time', 'times', 'day', 'days', 'night', 'nights',
  'year', 'years', 'month', 'months', 'week', 'weeks', 'hour', 'hours',
  'minute', 'minutes', 'moment', 'moments', 'thing', 'things', 'stuff',
  'place', 'places', 'part', 'parts', 'side', 'sides', 'kind', 'kinds',
  'sort', 'sorts', 'type', 'types', 'lot', 'lots', 'bit', 'bits',
  'piece', 'pieces', 'man', 'men', 'woman', 'women', 'boy', 'boys',
  'girl', 'girls', 'person', 'people', 'someone', 'anyone', 'everyone',
  'folks', 'guys', 'anybody', 'everybody', 'nobody', 'end', 'ends',
  'beginning', 'middle', 'top', 'bottom', 'area', 'areas', 'point',
  'points', 'case', 'cases', 'fact', 'facts', 'reason', 'reasons',
  'idea', 'ideas', 'word', 'words',
  // Book-structure words
  'chapter', 'chapters', 'page', 'pages', 'section', 'sections',
  'part', 'parts', 'book', 'books', 'volume', 'volumes', 'story',
  'stories', 'note', 'notes'
]);

function extractKeyTerms(chapters, maxTerms) {
  maxTerms = maxTerms || 50;
  var freq = {};
  var chapterIndices = {};
  // Per-term: paragraph occurrences flagged as first-15% or last-15% of
  // their chapter. These edge positions signal setup / payoff words.
  var edgeHits = {};
  // Per-term: which paragraphs (absolute index across all chapters) it
  // appears in. Used for proximity scoring below.
  var paraPresence = {};
  var totalChapters = chapters.length;
  var absParaIdx = 0;

  for (var c = 0; c < chapters.length; c++) {
    var paras = chapters[c].paragraphs || [];
    var edgeSize = Math.max(1, Math.ceil(paras.length * 0.15));
    var chapterWords = new Set();

    for (var p = 0; p < paras.length; p++) {
      var isEdge = (p < edgeSize) || (p >= paras.length - edgeSize);
      var words = paras[p].split(/[\s,;:!?.()"\[\]{}]+/);

      for (var w = 0; w < words.length; w++) {
        var word = words[w].replace(/^[^a-zA-Z\u00C0-\u024F]+|[^a-zA-Z\u00C0-\u024F]+$/g, '');
        if (word.length < 3) continue;
        var lower = word.toLowerCase();
        if (STOP_WORDS.has(lower)) continue;

        var key = lower;
        if (!freq[key]) {
          freq[key] = { count: 0, original: word, isProperNoun: false };
          edgeHits[key] = 0;
          paraPresence[key] = new Set();
        }
        freq[key].count++;
        if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
          freq[key].isProperNoun = true;
          freq[key].original = word;
        }
        chapterWords.add(key);
        if (isEdge) edgeHits[key]++;
        paraPresence[key].add(absParaIdx);
      }
      absParaIdx++;
    }

    chapterWords.forEach(function (w) {
      if (!chapterIndices[w]) chapterIndices[w] = [];
      chapterIndices[w].push(c);
    });
  }

  // Identify candidate terms. Gate is adaptive: a large book with many
  // repetitions can afford a strict gate (only filler words survive if
  // we let everything through). A small / short book has fewer
  // repetitions per word, so the strict gate leaves nothing.
  //
  //   Large book  (>= 15 chapters):  strict gate
  //     - proper noun: count >= 3
  //     - other noun:  length >= 7 AND count >= 5
  //
  //   Medium book (5..14 chapters):  mid gate
  //     - proper noun: count >= 2
  //     - other noun:  length >= 6 AND count >= 4
  //
  //   Small book  (< 5 chapters):    loose gate
  //     - proper noun: count >= 2
  //     - other noun:  length >= 5 AND count >= 3
  //
  //   Plus: at any size, drop terms that appear in EVERY chapter
  //   (spread = 100%) — that's almost certainly generic English.
  var strict = totalChapters >= 15;
  var small = totalChapters < 5;
  var minProperCount = strict ? 3 : 2;
  var minOtherCount = strict ? 5 : small ? 3 : 4;
  var minOtherLen = strict ? 7 : small ? 5 : 6;

  var candidates = {};
  for (var term in freq) {
    var f = freq[term];
    var presence = (chapterIndices[term] || []).length;
    if (f.isProperNoun) {
      if (f.count < minProperCount) continue;
    } else {
      if (f.original.length < minOtherLen) continue;
      if (f.count < minOtherCount) continue;
    }
    // Drop terms present in every chapter (generic connectors).
    // Only apply when the book has enough chapters for spread to mean
    // something (>= 6 chapters).
    if (totalChapters >= 6 && presence === totalChapters && !f.isProperNoun) continue;
    candidates[term] = true;
  }

  // Proximity: per candidate, count how many OTHER candidate terms share
  // at least one paragraph with it. A term that co-occurs with many
  // other key terms is part of a clustered important idea.
  var proximity = {};
  var candidateList = Object.keys(candidates);
  for (var i = 0; i < candidateList.length; i++) {
    var mine = paraPresence[candidateList[i]];
    var n = 0;
    for (var j = 0; j < candidateList.length; j++) {
      if (i === j) continue;
      var theirs = paraPresence[candidateList[j]];
      // Does any paragraph overlap?
      var shared = false;
      theirs.forEach(function (pi) {
        if (!shared && mine.has(pi)) shared = true;
      });
      if (shared) n++;
    }
    proximity[candidateList[i]] = n;
  }

  // Score terms: frequency * chapter spread, proper-noun boost, length
  // boost, edge-position boost, proximity boost.
  var scored = [];
  var firstIdx = 0;
  var lastIdx = Math.max(0, totalChapters - 1);
  for (var k = 0; k < candidateList.length; k++) {
    var ck = candidateList[k];
    var cf = freq[ck];
    var presentIn = chapterIndices[ck] || [];
    var presence = presentIn.length;
    var spread = presence / totalChapters;

    // Drop terms confined to a single edge chapter — author-name leak
    // guard (title page / back-matter bio).
    if (totalChapters >= 4 && presence === 1) {
      var onlyIdx = presentIn[0];
      if (onlyIdx === firstIdx || onlyIdx === lastIdx) continue;
    }

    var score = cf.count * (0.5 + spread);
    if (cf.isProperNoun) score *= 1.8;
    if (cf.original.length >= 7) score *= 1.3;
    // Edge-position boost: up to 1.4x when many occurrences are in a
    // chapter's first/last 15% of paragraphs.
    var edgeRatio = cf.count > 0 ? edgeHits[ck] / cf.count : 0;
    if (edgeRatio > 0) score *= (1 + edgeRatio * 0.4);
    // Proximity boost: up to 1.5x when the term co-occurs (shares a
    // paragraph) with many other candidate terms.
    var proxNorm = Math.min(proximity[ck] / Math.max(1, candidateList.length * 0.2), 1);
    score *= (1 + proxNorm * 0.5);

    scored.push({
      term: cf.isProperNoun ? cf.original : cf.original.toLowerCase(),
      frequency: cf.count,
      score: score,
      spread: Math.round(spread * 100),
      definition: ''
    });
  }

  scored.sort(function (a, b) { return b.score - a.score; });
  return scored.slice(0, maxTerms);
}

// ---- Smart Question Generation from Parsed Content ----
//
// Every generated question runs through validateGenerated() before being
// accepted, so algorithmically-authored questions meet the same quality
// bar as the hand-curated ACR content. This is a subset of the 11 checks
// in study/validate-questions.js — the chat-time tool covers schema
// fields the runtime doesn't produce (hint / source_passage / difficulty),
// so those checks are skipped here.
//
// Applied checks, per shape:
//   fill_blank       : double-negative, front-matter
//   multiple_choice  : length, double-negative, jargon-dump, front-matter,
//                      duplicate-option, absurd-option, distractor-length
//   true_false       : double-negative, front-matter
//
// Length and jargon-density checks run only on `multiple_choice` because
// the MC question is short wrapper text. Fill blanks and true/false
// statements hold a full source paragraph or sentence in the "question"
// slot — applying the 20-word / jargon thresholds there would silently
// reject most candidates from dense source material.
//
// A rejected candidate is skipped silently — the generator moves on to
// the next paragraph, so bad inputs never block content.
var FRONT_MATTER_REFS = [
  /\btable of contents\b/i, /\bcopyright\b/i, /\bisbn\b/i,
  /\bpreface\b/i, /\bforeword\b/i,
  /\bindex\b\s*(?:page|section)/i, /\babout the author\b/i,
  /\bauthor\s+bio(?:graphy)?\b/i, /\bdedication\s+page\b/i,
  /\btitle page\b/i
];

var DOUBLE_NEG_PATTERNS = [
  /\bnot\s+\w+\s+(?:no|never|none|neither|nothing|nobody|nowhere)\b/,
  /\bnever\s+\w+\s+(?:no|not|none|nothing)\b/,
  /\bno\s+\w+\s+(?:not|never|without)\b/,
  /\bwithout\s+\w+\s+(?:not|no|never)\b/,
  /\bn[o']t\s+\w+\s+(?:n[o']t|never|none)\b/
];

var ABSURD_OPTION_PATTERNS = [
  /^none of the above$/i,
  /^all of the above$/i,
  /^(lorem|ipsum|foo|bar|baz|xxx|todo|tbd)$/i,
  /^(n\/a|na|\?+|\.+|-+)$/i
];

function checkLength(text) {
  if (!text) return true;
  var words = text.trim().split(/\s+/).filter(Boolean);
  return words.length <= 20;
}

function checkNoDoubleNegative(text) {
  if (!text) return true;
  var lower = text.toLowerCase();
  for (var i = 0; i < DOUBLE_NEG_PATTERNS.length; i++) {
    if (DOUBLE_NEG_PATTERNS[i].test(lower)) return false;
  }
  return true;
}

function checkNoJargonDump(text) {
  if (!text) return true;
  var words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  var longWords = 0;
  var letterCount = 0;
  for (var i = 0; i < words.length; i++) {
    var w = words[i].replace(/[^\w'-]/g, '');
    if (w.length >= 13) longWords++;
    letterCount += w.length;
  }
  if (longWords > 2) return false;
  if (letterCount / words.length > 8) return false;
  return true;
}

function checkNotFromFrontMatter(text) {
  if (!text) return true;
  for (var i = 0; i < FRONT_MATTER_REFS.length; i++) {
    if (FRONT_MATTER_REFS[i].test(text)) return false;
  }
  return true;
}

function checkOptionsUnambiguous(options) {
  if (!Array.isArray(options)) return true;
  var seen = {};
  for (var i = 0; i < options.length; i++) {
    var key = String(options[i]).trim().toLowerCase();
    if (!key) return false;
    if (seen[key]) return false;
    seen[key] = true;
  }
  return true;
}

function checkOptionsNotAbsurd(options) {
  if (!Array.isArray(options)) return true;
  for (var i = 0; i < options.length; i++) {
    var opt = String(options[i]).trim();
    if (!opt) return false;
    for (var m = 0; m < ABSURD_OPTION_PATTERNS.length; m++) {
      if (ABSURD_OPTION_PATTERNS[m].test(opt)) return false;
    }
  }
  return true;
}

function checkDistractorsPlausible(options, correctValue) {
  if (!Array.isArray(options) || options.length < 3) return true;
  if (!correctValue || typeof correctValue !== 'string') return true;
  var correctLen = correctValue.trim().length;
  if (correctLen < 3) return true;
  for (var i = 0; i < options.length; i++) {
    var opt = String(options[i]).trim();
    if (opt === String(correctValue).trim()) continue;
    if (opt.length < 2) return false;
    var ratio = Math.max(opt.length, correctLen) / Math.min(opt.length, correctLen);
    if (ratio > 6) return false;
  }
  return true;
}

// Shape-aware gate used by the generators. Returns true if the candidate
// is safe to surface, false to drop it.
//
// Length and jargon-density checks apply only to `multiple_choice`
// candidates, because that shape is the only one where the question text
// is a short stand-alone wrapper ("Which term appears in: ...?"). Fill
// blanks and true/false statements carry a full source paragraph or
// sentence in the question slot — the 20-word / jargon thresholds from
// the chat-time MC spec don't translate and would reject most candidates
// from dense source material. Double-negative and front-matter checks
// still run on every shape, since those signal genuine unfit content
// regardless of length.
function validateGenerated(kind, q) {
  if (kind === 'fill_blank') {
    var joined = (q.prompt || '') + ' ' + (q.source || '');
    if (!checkNoDoubleNegative(q.prompt)) return false;
    if (!checkNotFromFrontMatter(joined)) return false;
    return true;
  }
  if (kind === 'multiple_choice') {
    var mcJoined = (q.question || '') + ' ' + (q.source || '');
    if (!checkLength(q.question)) return false;
    if (!checkNoDoubleNegative(q.question)) return false;
    if (!checkNoJargonDump(q.question)) return false;
    if (!checkNotFromFrontMatter(mcJoined)) return false;
    if (!checkOptionsUnambiguous(q.options)) return false;
    if (!checkOptionsNotAbsurd(q.options)) return false;
    var correctVal = (typeof q.correct === 'number' && Array.isArray(q.options))
      ? q.options[q.correct] : q.correct;
    if (!checkDistractorsPlausible(q.options, correctVal)) return false;
    return true;
  }
  if (kind === 'true_false') {
    var tfJoined = (q.statement || '') + ' ' + (q.source || '');
    if (!checkNoDoubleNegative(q.statement)) return false;
    if (!checkNotFromFrontMatter(tfJoined)) return false;
    return true;
  }
  return true;
}

function generateFillBlanks(paragraphs, keyTerms, count) {
  count = count || 10;
  var termSet = {};
  for (var t = 0; t < keyTerms.length; t++) {
    termSet[keyTerms[t].term.toLowerCase()] = keyTerms[t].term;
  }

  var questions = [];
  var usedAnswers = {};
  var shuffledParas = shuffle(paragraphs.slice());

  for (var i = 0; i < shuffledParas.length && questions.length < count; i++) {
    var para = shuffledParas[i];
    if (para.length < 30 || para.length > 300) continue;

    var words = para.split(/\s+/);
    var bestTarget = null;
    var bestScore = 0;

    for (var w = 1; w < words.length - 1; w++) {
      var clean = words[w].replace(/[.,;:!?"'()]/g, '');
      if (clean.length < 4) continue;
      var lower = clean.toLowerCase();
      if (usedAnswers[lower]) continue;
      // Never blank a stop word — "the", "said", "required", etc.
      if (STOP_WORDS.has(lower)) continue;

      var score = 0;
      if (termSet[lower]) score += 10;
      var isCap = (clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase());
      if (isCap) score += 5;
      if (clean.length >= 6) score += 2;
      if (/\d/.test(clean)) score += 3;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = { idx: w, word: clean };
      }
    }

    // Only accept a target that is a known key term (score >= 10) or a
    // proper noun (score >= 5). Otherwise the blank is filler and the
    // question fails the Question Generation Rules.
    if (bestTarget && bestScore >= 5) {
      var prompt = para.replace(
        new RegExp('\\b' + bestTarget.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'),
        '______'
      );
      if (prompt !== para) {
        var fbCandidate = {
          prompt: prompt,
          answer: bestTarget.word,
          source: para
        };
        if (validateGenerated('fill_blank', fbCandidate)) {
          questions.push(fbCandidate);
          usedAnswers[bestTarget.word.toLowerCase()] = true;
        }
      }
    }
  }

  return questions;
}

function generateMCQuestions(paragraphs, keyTerms, count) {
  count = count || 10;
  var questions = [];
  var termNames = keyTerms.filter(function (t) {
    return t.term[0] === t.term[0].toUpperCase() && t.term[0] !== t.term[0].toLowerCase();
  });

  var shuffledParas = shuffle(paragraphs.slice());

  for (var i = 0; i < shuffledParas.length && questions.length < count; i++) {
    var para = shuffledParas[i];
    if (para.length < 30 || para.length > 250) continue;

    // Find a key term in this paragraph
    var found = null;
    for (var t = 0; t < keyTerms.length; t++) {
      var re = new RegExp('\\b' + keyTerms[t].term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(para)) {
        found = keyTerms[t];
        break;
      }
    }

    if (found) {
      var snippet = para.length > 80 ? para.slice(0, 77) + '...' : para;
      var distractors = shuffle(keyTerms.filter(function (k) {
        return k.term.toLowerCase() !== found.term.toLowerCase();
      })).slice(0, 3).map(function (k) { return k.term; });

      if (distractors.length >= 2) {
        var opts = shuffle([found.term].concat(distractors));
        var mcCandidate = {
          question: 'Which term appears in: "' + snippet + '"?',
          options: opts,
          correct: opts.indexOf(found.term),
          source: para
        };
        if (validateGenerated('multiple_choice', mcCandidate)) {
          questions.push(mcCandidate);
        }
      }
    }
  }

  return questions;
}

// ---- Speaker-quote extraction (for Who Said It mode) ----
// Scans paragraphs for dialogue with attribution. Handles three patterns:
//   "quote," Name said.
//   "quote," said Name.
//   Name said, "quote."
// Returns { quote, speaker, chapter } records.

var ATTRIB_VERBS = 'said|replied|answered|asked|shouted|whispered|muttered|' +
  'exclaimed|cried|declared|announced|murmured|called|responded|stated|' +
  'insisted|continued|added|explained|admitted|agreed|spoke|argued|noted|' +
  'observed|remarked|told';
var NAME_PAT = '[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?';

function extractSpeakerQuotes(chapters) {
  if (!chapters || !chapters.length) return [];
  // Pattern 1: "quote..." Name said
  var p1 = new RegExp('[\u201C"]([^\u201C\u201D"]{10,200})[.?!,]?[\u201D"]\\s*(' + NAME_PAT + ')\\s+(?:' + ATTRIB_VERBS + ')\\b', 'g');
  // Pattern 2: "quote..." said Name
  var p2 = new RegExp('[\u201C"]([^\u201C\u201D"]{10,200})[.?!,]?[\u201D"]\\s*(?:' + ATTRIB_VERBS + ')\\s+(' + NAME_PAT + ')\\b', 'g');
  // Pattern 3: Name said, "quote"  (direct attribution)
  var p3 = new RegExp('\\b(' + NAME_PAT + ')\\s+(?:' + ATTRIB_VERBS + ')[,:]?\\s*[\u201C"]([^\u201C\u201D"]{10,200})[\u201D"]', 'g');
  // Pattern 4: Name said to [someone], "quote"  (biblical / narrative)
  var p4 = new RegExp('\\b(' + NAME_PAT + ')\\s+(?:' + ATTRIB_VERBS + ')\\s+to\\s+[^,"\u201C\u201D]{1,40}[,:]\\s*[\u201C"]([^\u201C\u201D"]{10,200})[\u201D"]', 'g');
  // Pattern 5: Name said[:] unquoted-speech-until-sentence-end
  //   Covers biblical / scholarly text that uses colon-introduced speech
  //   without quote marks: "YHWH said to Qayin: Where is Hevel?"
  var p5 = new RegExp('\\b(' + NAME_PAT + ')\\s+(?:' + ATTRIB_VERBS + ')(?:\\s+(?:to|unto)\\s+[^:,\u201C\u201D"]{1,50})?[,:]\\s+([^.!?]{10,240}[.!?])', 'g');

  var results = [];
  var seenQuotes = {};
  function cleanSpeaker(s) {
    var leadWords = /^(?:And|Then|So|But|Now|Yet|For|Therefore|Behold|When|After|Before|Because|If|Though|While|Until|As|Since)\s+/;
    var cleaned = String(s || '').trim();
    while (leadWords.test(cleaned)) cleaned = cleaned.replace(leadWords, '');
    return cleaned;
  }
  function add(quote, speaker, c) {
    var q = String(quote || '').trim();
    var s = cleanSpeaker(speaker);
    if (q.length < 10 || s.length < 2) return;
    if (/^(The|This|That|These|Those|He|She|They|It|We|You)$/.test(s)) return;
    var key = q.toLowerCase().slice(0, 60);
    if (seenQuotes[key]) return;
    seenQuotes[key] = true;
    results.push({ quote: q, speaker: s, chapter: c });
  }

  for (var c = 0; c < chapters.length; c++) {
    var text = (chapters[c].paragraphs || []).join(' ');
    var m;
    p1.lastIndex = 0; while ((m = p1.exec(text)) !== null) add(m[1], m[2], c);
    p2.lastIndex = 0; while ((m = p2.exec(text)) !== null) add(m[1], m[2], c);
    p3.lastIndex = 0; while ((m = p3.exec(text)) !== null) add(m[2], m[1], c);
    p4.lastIndex = 0; while ((m = p4.exec(text)) !== null) add(m[2], m[1], c);
    p5.lastIndex = 0; while ((m = p5.exec(text)) !== null) add(m[2], m[1], c);
  }
  return results;
}

// ---- True/False with Why — generate statements with source paragraph ----
// Scans paragraphs for sentences containing a key-term proper noun.
// Builds TRUE questions from the sentence verbatim, FALSE questions by
// swapping the proper noun with another key term from the list.
// Every question carries the source paragraph so the answer screen can
// show the proof.
function generateTrueFalseQuestions(paragraphs, keyTerms, count) {
  count = count || 10;
  if (!keyTerms || keyTerms.length < 3) return [];
  // Match key terms against sentences via word-boundary regex, so
  // compound terms (multi-word) match even though whitespace-split
  // word iteration would miss them. Accept ANY key term, not just
  // proper nouns — thematic terms (covenant, sanctuary) qualify.
  var terms = keyTerms.filter(function (t) { return t.term && t.term.length >= 3; });
  var candidates = [];
  for (var p = 0; p < paragraphs.length; p++) {
    var sentences = paragraphs[p].match(/[^.!?]+[.!?]+/g) || [];
    for (var s = 0; s < sentences.length; s++) {
      var sent = sentences[s].trim();
      if (sent.length < 20 || sent.length > 260) continue;
      for (var k = 0; k < terms.length; k++) {
        var tterm = terms[k].term;
        var re = new RegExp('\\b' + tterm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (re.test(sent)) {
          candidates.push({ sentence: sent, term: tterm, paragraph: paragraphs[p] });
          break;
        }
      }
    }
  }
  if (candidates.length < 2) return [];
  candidates = shuffle(candidates.slice());

  var questions = [];
  var usedSentences = {};
  for (var c = 0; c < candidates.length && questions.length < count; c++) {
    var cand = candidates[c];
    var key = cand.sentence.slice(0, 50);
    if (usedSentences[key]) continue;
    usedSentences[key] = true;
    var makeTrue = (questions.length % 2 === 0);
    if (makeTrue) {
      var tfTrue = {
        statement: cand.sentence,
        answer: true,
        source: cand.paragraph,
        originalTerm: cand.term
      };
      if (validateGenerated('true_false', tfTrue)) questions.push(tfTrue);
    } else {
      // Prefer a swap of matching capitalization so the sentence still
      // reads right ("Qayin" <-> "Noakh", not "Qayin" <-> "covenant").
      var origIsCap = cand.term[0] === cand.term[0].toUpperCase() && cand.term[0] !== cand.term[0].toLowerCase();
      var others = keyTerms.filter(function (kt) {
        if (!kt.term || kt.term.toLowerCase() === cand.term.toLowerCase()) return false;
        var kc = kt.term[0] === kt.term[0].toUpperCase() && kt.term[0] !== kt.term[0].toLowerCase();
        return kc === origIsCap;
      });
      if (!others.length) continue;
      var altTerm = shuffle(others.slice())[0].term;
      var re = new RegExp('\\b' + cand.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      var wrongSentence = cand.sentence.replace(re, altTerm);
      if (wrongSentence === cand.sentence) continue;
      var tfFalse = {
        statement: wrongSentence,
        answer: false,
        source: cand.paragraph,
        originalTerm: cand.term,
        wrongTerm: altTerm
      };
      if (validateGenerated('true_false', tfFalse)) questions.push(tfFalse);
    }
  }
  return questions;
}

// ---- Story Sequence — pick the first clear sentence of each paragraph ----
// so the user can reorder scrambled events from a chapter.
function generateStorySequence(paragraphs, count) {
  count = count || 6;
  if (!paragraphs || paragraphs.length < 3) return [];
  // Sample evenly-spaced paragraphs through the chapter so we get
  // beginning -> middle -> end coverage, not 6 events from the opening.
  var usable = [];
  for (var p = 0; p < paragraphs.length; p++) {
    var para = paragraphs[p];
    if (!para || para.length < 40) continue;
    var sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
    for (var s = 0; s < sentences.length; s++) {
      var sent = sentences[s].trim();
      if (sent.length < 25 || sent.length > 180) continue;
      usable.push({ sentence: sent, order: usable.length, paraIdx: p });
      break;
    }
  }
  if (usable.length < 3) return [];
  // Downsample to `count` keeping original order
  var step = Math.max(1, Math.floor(usable.length / count));
  var events = [];
  for (var i = 0; i < usable.length && events.length < count; i += step) {
    events.push({ order: events.length, text: usable[i].sentence });
  }
  return events;
}

// ---- Cause and Effect extraction ----
// Scans paragraphs for three connective patterns and returns a list of
// { cause, effect, source } pairs. Trims each side to <= 120 chars so
// the match-pair UI stays readable.
function extractCauseEffectPairs(paragraphs) {
  if (!paragraphs || !paragraphs.length) return [];
  // Pattern 1: "<effect> because <cause>."
  var p1 = /([A-Z][^.!?]{15,140})\s+because\s+([^.!?]{10,140})[.!?]/g;
  // Pattern 2: "<cause>, (so|therefore|thus|hence|consequently|thereby) <effect>."
  var p2 = /([A-Z][^.!?]{15,140}),?\s+(?:so|therefore|thus|hence|consequently|thereby)\s+([^.!?]{10,140})[.!?]/g;
  // Pattern 3: "<cause> (led to|caused|brought about|resulted in|produced|gave rise to) <effect>."
  var p3 = /([A-Z][^.!?]{15,140})\s+(?:led to|caused|brought about|resulted in|produces?|produced|gives rise to|gave rise to)\s+([^.!?]{10,140})[.!?]/g;
  // Pattern 4: "Because <cause>, <effect>."
  var p4 = /Because\s+([^,]{10,140}),\s+([^.!?]{10,140})[.!?]/g;
  // Pattern 5: "When/Since <cause>, <effect>."
  var p5 = /(?:When|Since)\s+([^,]{10,140}),\s+([^.!?]{10,140})[.!?]/g;
  // Pattern 6: "If <cause>, [then] <effect>."
  var p6 = /If\s+([^,]{10,140}),?\s+(?:then\s+)?([^.!?]{10,140})[.!?]/g;
  // Pattern 7: "<cause>, which [verb] <effect>."
  var p7 = /([A-Z][^.!?,]{15,140}),\s+which\s+(?:led to|caused|resulted in|meant|made|brought about)\s+([^.!?]{10,140})[.!?]/g;
  // Pattern 8: "As a result of / Due to / Owing to <cause>, <effect>."
  var p8 = /(?:As a result of|Due to|Owing to|Thanks to|Because of)\s+([^,]{10,140}),\s+([^.!?]{10,140})[.!?]/g;

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

  for (var p = 0; p < paragraphs.length; p++) {
    var text = paragraphs[p];
    var m;
    p1.lastIndex = 0; while ((m = p1.exec(text)) !== null) add(m[2], m[1], text);
    p2.lastIndex = 0; while ((m = p2.exec(text)) !== null) add(m[1], m[2], text);
    p3.lastIndex = 0; while ((m = p3.exec(text)) !== null) add(m[1], m[2], text);
    p4.lastIndex = 0; while ((m = p4.exec(text)) !== null) add(m[1], m[2], text);
    p5.lastIndex = 0; while ((m = p5.exec(text)) !== null) add(m[1], m[2], text);
    p6.lastIndex = 0; while ((m = p6.exec(text)) !== null) add(m[1], m[2], text);
    p7.lastIndex = 0; while ((m = p7.exec(text)) !== null) add(m[1], m[2], text);
    p8.lastIndex = 0; while ((m = p8.exec(text)) !== null) add(m[1], m[2], text);
  }
  return pairs;
}

// ---- Full Book Import Pipeline ----
function importBook(title, rawText) {
  var chapters = detectChapters(rawText);
  var allParas = [];
  for (var c = 0; c < chapters.length; c++) {
    allParas = allParas.concat(chapters[c].paragraphs);
  }
  var keyTerms = extractKeyTerms(chapters);
  var totalParas = allParas.length;

  var bookId = generateBookId();
  var lib = getLibrary();
  var colorIdx = lib.length;

  var book = {
    id: bookId,
    title: title,
    color: assignBookColor(colorIdx),
    dateAdded: new Date().toISOString(),
    chapterCount: chapters.length,
    keyTerms: keyTerms,
    totalParagraphs: totalParas
  };

  saveBook(book);

  return saveChaptersDB(bookId, chapters).then(function () {
    return {
      book: book,
      chapters: chapters,
      keyTerms: keyTerms
    };
  });
}

console.log('attain-parser.js loaded');
