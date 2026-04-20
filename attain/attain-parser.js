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

var CHAPTER_PATTERNS = [
  /^chapter\s+\d+/i,
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

var FRONT_MATTER_PATTERNS = [
  /^copyright/i, /^all rights reserved/i, /^isbn/i,
  /^table of contents/i, /^contents$/i, /^dedication$/i,
  /^acknowledgments?$/i, /^about the author/i, /^preface$/i,
  /^foreword$/i, /^introduction$/i, /^published by/i,
  /^printed in/i, /^library of congress/i, /^first edition/i,
  /^cover design/i, /^editing by/i, /^\u00a9\s*\d{4}/,
  /^by\s+[A-Z][a-z]+\s+[A-Z][a-z]+/,
  /^a\s+novel\s+by/i, /^a\s+memoir\s+by/i, /^a\s+(book|story)\s+by/i,
  /^translated\s+by/i, /^edited\s+by/i, /^illustrated\s+by/i,
  /^foreword\s+by/i, /^introduction\s+by/i, /^preface\s+by/i,
  /^no\s+part\s+of\s+this/i, /^this\s+book\s+is\s+a\s+work\s+of/i,
  /^names:\s*characters/i, /^first\s+published/i,
  /^cataloging[-\s]in[-\s]publication/i,
  /^the\s+author\s+(has|hereby|asserts)/i,
  /^(also|other\s+books)\s+by\s+the\s+author/i,
  /^also\s+by\s+[A-Z]/,
  /^to\s+my\s+(wife|husband|mother|father|family|children|parents|daughter|son)/i,
  /^for\s+my\s+(wife|husband|mother|father|family|children|parents|daughter|son)/i,
  /^praise\s+for/i, /^advance\s+praise/i, /^what\s+readers\s+are\s+saying/i,
  /^epigraph$/i, /^colophon$/i, /^imprint$/i, /^half\s+title$/i,
  /^trademark/i, /^the\s+scanning,\s+uploading/i,
  /^this\s+title\s+is\s+also\s+available/i,
  /^appendix\s+[a-z]?$/i, /^glossary$/i, /^bibliography$/i,
  /^notes$/i, /^endnotes$/i, /^index$/i, /^works\s+cited/i,
  /^about\s+the\s+(author|publisher|type|book|editor|translator)/i,
  /^\d{4}\s+by\s+[A-Z]/,
  /^manufactured\s+in/i, /^typeset\s+(by|in)/i
];

var ATTRIBUTION_PATTERNS = [
  /\u00a9\s*\d{4}/,
  /copyright\s*\u00a9?\s*\d{4}/i,
  /\ball\s+rights\s+reserved\b/i,
  /\bisbn[-\s]?(?:10|13)?[:\s]/i,
  /\blibrary\s+of\s+congress\b/i,
  /\bprinted\s+in\s+the\s+[a-z\s]+$/i,
  /\bfirst\s+(?:edition|printing|published)\b/i,
  /\bpublished\s+by\b/i,
  /\bpublication\s+data\b/i,
  /\bno\s+part\s+of\s+this\s+(?:book|publication)\b/i,
  /\bmay\s+not\s+be\s+reproduced\b/i,
  /\ba\s+cip\s+catalogue\b/i,
  /\bthis\s+book\s+is\s+a\s+work\s+of\s+fiction\b/i,
  /\bnames,\s+characters\b/i,
  /\bwww\.[a-z0-9\-]+\.[a-z]{2,}/i,
  /\bhttps?:\/\//i,
  /\bp\.?\s?cm\b/i
];

function isAttributionParagraph(text) {
  if (!text) return false;
  if (text.length < 10) return true;
  // Very short paragraphs that are mostly a proper name
  // (title pages and bylines) — e.g. "by John Smith" or just a name line.
  if (text.length < 60) {
    if (/^by\s+[A-Z]/.test(text)) return true;
    if (/^[A-Z][a-z]+(\s+[A-Z]\.?)?\s+[A-Z][a-z]+$/.test(text)) return true;
  }
  for (var i = 0; i < ATTRIBUTION_PATTERNS.length; i++) {
    if (ATTRIBUTION_PATTERNS[i].test(text)) return true;
  }
  return false;
}

function isFrontMatter(text) {
  if (!text || text.length < 10) return true;
  var lower = text.toLowerCase().trim();
  for (var i = 0; i < FRONT_MATTER_PATTERNS.length; i++) {
    if (FRONT_MATTER_PATTERNS[i].test(lower)) return true;
  }
  // Any attribution/copyright/ISBN marker in the opening block
  if (isAttributionParagraph(text)) return true;
  return false;
}

function isFrontMatterChapter(ch) {
  if (!ch || !ch.paragraphs || ch.paragraphs.length === 0) return true;
  // Join title + first few paragraphs so front-matter scans deeper than
  // the opening line — title pages often have a blank line before the
  // author attribution.
  var scanParas = ch.paragraphs.slice(0, 3).join(' \n ');
  var probe = (ch.title || '') + ' \n ' + scanParas;
  if (isFrontMatter(probe)) return true;
  // If most of the chapter is short attribution-style paragraphs, drop it.
  var attribCount = 0;
  var checkN = Math.min(ch.paragraphs.length, 6);
  for (var i = 0; i < checkN; i++) {
    if (isAttributionParagraph(ch.paragraphs[i])) attribCount++;
  }
  if (checkN > 0 && attribCount / checkN >= 0.5) return true;
  return false;
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

    // Also check if a short line (< 60 chars) contains "chapter" anywhere
    if (!isChapterBreak && line.length < 60) {
      if (/chapter\s+\d+/i.test(line) || /act\s+(one|two|three|four|five|\d+)/i.test(line) || /^interlude$/i.test(line)) {
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

  // Remove front matter / back matter chapters (copyright, TOC,
  // dedication, about the author, "also by" ads, etc.)
  chapters = chapters.filter(function (ch) {
    return !isFrontMatterChapter(ch);
  });

  // Scrub stray front-matter lines (copyright, ISBN, "by Author",
  // bare-name bylines) that survived inside otherwise-valid chapters.
  for (var sc = 0; sc < chapters.length; sc++) {
    chapters[sc].paragraphs = chapters[sc].paragraphs.filter(function (p) {
      return !isAttributionParagraph(p);
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
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'not', 'no', 'nor',
  'so', 'if', 'then', 'than', 'that', 'this', 'these', 'those', 'it',
  'its', 'he', 'she', 'him', 'her', 'his', 'they', 'them', 'their',
  'we', 'us', 'our', 'you', 'your', 'i', 'me', 'my', 'who', 'whom',
  'which', 'what', 'when', 'where', 'how', 'why', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'only', 'own', 'same', 'also', 'just', 'about', 'above', 'after',
  'again', 'any', 'because', 'before', 'between', 'down', 'during',
  'into', 'out', 'over', 'through', 'under', 'until', 'up', 'very',
  'there', 'here', 'as', 'said', 'says', 'upon', 'unto', 'one', 'two',
  'three', 'four', 'five', 'like', 'even', 'still', 'well', 'back',
  'much', 'many', 'now', 'then', 'too', 'yet', 'made', 'make', 'came',
  'come', 'went', 'go', 'let', 'see', 'saw', 'know', 'knew', 'take',
  'took', 'give', 'gave', 'tell', 'told', 'put', 'set', 'get', 'got',
  'say', 'day', 'days', 'man', 'men', 'way', 'new', 'old', 'great',
  'shall', 'will', 'among', 'against', 'according', 'without', 'within',
  'though', 'while', 'since', 'whether', 'however', 'therefore',
  'chapter', 'page', 'part', 'section', 'book', 'volume'
]);

function extractKeyTerms(chapters, maxTerms) {
  maxTerms = maxTerms || 50;
  var freq = {};
  var chapterIndices = {};
  var totalChapters = chapters.length;

  for (var c = 0; c < chapters.length; c++) {
    var chapterWords = new Set();
    var text = chapters[c].paragraphs.join(' ');
    var words = text.split(/[\s,;:!?.()"\[\]{}]+/);

    for (var w = 0; w < words.length; w++) {
      var word = words[w].replace(/^[^a-zA-Z\u00C0-\u024F]+|[^a-zA-Z\u00C0-\u024F]+$/g, '');
      if (word.length < 3) continue;
      var lower = word.toLowerCase();
      if (STOP_WORDS.has(lower)) continue;

      // Preserve original casing for proper nouns
      var key = lower;
      if (!freq[key]) {
        freq[key] = { count: 0, original: word, isProperNoun: false };
      }
      freq[key].count++;
      // Detect proper nouns (capitalized and not at sentence start)
      if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
        freq[key].isProperNoun = true;
        freq[key].original = word;
      }
      chapterWords.add(key);
    }

    // Track which chapters each term appears in
    chapterWords.forEach(function (w) {
      if (!chapterIndices[w]) chapterIndices[w] = [];
      chapterIndices[w].push(c);
    });
  }

  // Score terms: frequency * chapter spread, boost proper nouns
  var scored = [];
  var firstIdx = 0;
  var lastIdx = Math.max(0, totalChapters - 1);
  for (var term in freq) {
    var f = freq[term];
    if (f.count < 3) continue;
    var presentIn = chapterIndices[term] || [];
    var presence = presentIn.length;
    var spread = presence / totalChapters;

    // Drop terms confined to a single edge chapter — strong signal
    // that the term is a front-matter or back-matter artifact (author
    // name on a title page, "about the author" bio, dedication, etc.)
    // that survived chapter-level filtering.
    if (totalChapters >= 4 && presence === 1) {
      var onlyIdx = presentIn[0];
      if (onlyIdx === firstIdx || onlyIdx === lastIdx) continue;
    }

    var score = f.count * (0.5 + spread);
    if (f.isProperNoun) score *= 1.5;
    if (f.original.length >= 6) score *= 1.2;
    scored.push({
      term: f.isProperNoun ? f.original : f.original.toLowerCase(),
      frequency: f.count,
      score: score,
      spread: Math.round(spread * 100),
      definition: ''
    });
  }

  scored.sort(function (a, b) { return b.score - a.score; });
  return scored.slice(0, maxTerms);
}

// ---- Smart Question Generation from Parsed Content ----

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
      if (clean.length < 3) continue;
      var lower = clean.toLowerCase();
      if (usedAnswers[lower]) continue;

      var score = 0;
      if (termSet[lower]) score += 10;
      if (clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase()) score += 5;
      if (clean.length >= 5) score += 2;
      if (/\d/.test(clean)) score += 3;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = { idx: w, word: clean };
      }
    }

    if (bestTarget && bestScore > 0) {
      var prompt = para.replace(
        new RegExp('\\b' + bestTarget.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'),
        '______'
      );
      if (prompt !== para) {
        questions.push({
          prompt: prompt,
          answer: bestTarget.word,
          source: para
        });
        usedAnswers[bestTarget.word.toLowerCase()] = true;
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
        questions.push({
          question: 'Which term appears in: "' + snippet + '"?',
          options: opts,
          correct: opts.indexOf(found.term),
          source: para
        });
      }
    }
  }

  return questions;
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
