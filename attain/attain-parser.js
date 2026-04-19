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
  /^part\s+\w+/i,
  /^section\s+\d+/i,
  /^book\s+\d+/i,
  /^volume\s+\w+/i,
  /^\d+\.\s+[A-Z]/,
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

    // Check chapter patterns
    if (!isChapterBreak) {
      for (var p = 0; p < CHAPTER_PATTERNS.length; p++) {
        if (CHAPTER_PATTERNS[p].test(line)) {
          isChapterBreak = true;
          break;
        }
      }
    }

    // Check all-caps headings (likely chapter titles)
    if (!isChapterBreak && line.length > 4 && line.length < 100) {
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
  var chapterPresence = {};
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
      if (!chapterPresence[w]) chapterPresence[w] = 0;
      chapterPresence[w]++;
    });
  }

  // Score terms: frequency * chapter spread, boost proper nouns
  var scored = [];
  for (var term in freq) {
    var f = freq[term];
    if (f.count < 3) continue;
    var spread = chapterPresence[term] / totalChapters;
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
