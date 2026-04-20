// Attain Universal — Study Module
// Study modes added incrementally. This file starts with flashcards only.

// ---- Flashcards with SM-2 Spaced Repetition ----

// Find the shortest sentence in `chapters` that contains the given term.
// Prefers sentences under 200 chars so the flashcard back stays readable.
function findContextSentence(term, chapters, preferredChapterIdx) {
  if (!term || !chapters || !chapters.length) return '';
  var re = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
  // Search preferred chapter first, then any chapter
  var order = [];
  if (typeof preferredChapterIdx === 'number' && preferredChapterIdx >= 0 && preferredChapterIdx < chapters.length) {
    order.push(preferredChapterIdx);
  }
  for (var i = 0; i < chapters.length; i++) if (order.indexOf(i) === -1) order.push(i);

  for (var oi = 0; oi < order.length; oi++) {
    var paras = chapters[order[oi]].paragraphs || [];
    for (var p = 0; p < paras.length; p++) {
      var sentences = paras[p].match(/[^.!?]+[.!?]+/g) || [paras[p]];
      var best = null;
      for (var s = 0; s < sentences.length; s++) {
        var sent = sentences[s].trim();
        if (sent.length < 20 || sent.length > 240) continue;
        if (!re.test(sent)) continue;
        if (!best || sent.length < best.length) best = sent;
      }
      if (best) return best;
    }
  }
  return '';
}

function usagePrompt(term, isProperNoun) {
  if (isProperNoun) {
    return 'Who or what is ' + term + ', and what role do they play here?';
  }
  return 'What does "' + term + '" mean in this passage, and why is it important?';
}

function buildFlashcardDeck(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book) return [];
  var chapters = activeChapters;
  if (!chapters || !chapters[chIdx]) return [];
  var ch = chapters[chIdx];
  var cards = [];

  // Key term cards — front = term, back = context sentence + optional
  // definition + usage prompt. Falls back to stats only if no sentence
  // can be found anywhere in the book.
  if (book.keyTerms && book.keyTerms.length) {
    for (var t = 0; t < book.keyTerms.length; t++) {
      var kt = book.keyTerms[t];
      var isProper = kt.term && kt.term[0] === kt.term[0].toUpperCase() && kt.term[0] !== kt.term[0].toLowerCase();
      var context = findContextSentence(kt.term, chapters, chIdx);
      var backHtml = '';
      if (context) {
        backHtml += '<div class="fc-context">"' + context + '"</div>';
      }
      if (kt.definition) {
        backHtml += '<div class="fc-def">' + kt.definition + '</div>';
      }
      backHtml += '<div class="fc-prompt">' + usagePrompt(kt.term, isProper) + '</div>';
      if (!context && !kt.definition) {
        // Fallback stats when no sentence found (rare — term must be in text
        // because it was extracted from it).
        backHtml = '<div class="fc-def">Appears ' + kt.frequency + ' times across the book, in ' + kt.spread + '% of chapters.</div>' + backHtml;
      }
      cards.push({
        front: kt.term,
        back: backHtml,
        type: 'term'
      });
    }
  }

  // Paragraph cards from the current chapter — recall the full paragraph
  // from its opening 6 words
  var paras = ch.paragraphs || [];
  var usable = paras.filter(function (p) { return p.length > 20 && p.length < 300; });
  usable = shuffle(usable.slice()).slice(0, 15);
  for (var v = 0; v < usable.length; v++) {
    var words = usable[v].split(/\s+/);
    var front = words.slice(0, Math.min(6, Math.ceil(words.length / 2))).join(' ') + '...';
    cards.push({ front: front, back: usable[v], type: 'paragraph' });
  }

  return cards;
}

function showFlashcards(bookId, chIdx) {
  var cards = buildFlashcardDeck(bookId, chIdx);
  if (!cards.length) {
    showNoContent(bookId, chIdx, 'Flashcards');
    return;
  }

  var book = getBook(bookId);
  var ch = activeChapters[chIdx];
  var chTitle = ch ? ch.title : 'Chapter ' + (chIdx + 1);

  // Sort due cards first
  var today = new Date().toISOString().slice(0, 10);
  var dueCards = [], otherCards = [];
  cards.forEach(function (c) {
    var stored = getOrCreateCard(bookId, chIdx, c.front, c.back, c.type);
    if (stored.nextReview <= today) dueCards.push(c);
    else otherCards.push(c);
  });
  cards = shuffle(dueCards).concat(shuffle(otherCards));

  var ci = 0, flipped = false;
  var ratings = [];
  var weakQueue = [];
  var sinceWeak = 0;

  function renderCard() {
    if (ci >= cards.length) { showFlashcardSummary(); return; }
    var c = cards[ci];
    flipped = false;
    var typeColor = c.type === 'term' ? 'var(--vol6)' : 'var(--vol1)';
    var typeLabel = c.type === 'term' ? 'KEY TERM' : chTitle;

    var h = '<div class="fc-view">';
    h += '<div class="fc-progress">' + (ci + 1) + ' of ' + cards.length + '</div>';
    h += '<div class="fc-type" style="color:' + typeColor + '">' + typeLabel + '</div>';
    h += '<div class="fc-card" id="fc-card" role="button" aria-label="Flashcard — tap to flip">';
    h += '<div class="fc-front" id="fc-front">' + c.front + '</div>';
    h += '<div class="fc-back" id="fc-back" style="display:none">' + c.back + '</div>';
    h += '</div>';
    h += '<button class="cloze-audio" id="b-fc-hear" aria-label="Listen to this card">\u{1F50A} Listen</button>';
    h += '<div class="fc-action" id="fc-action">';
    h += '<button class="study-btn sb-pri" id="b-fc-flip" aria-label="Flip card to reveal answer">\u{1F504} Flip to reveal</button>';
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
    h += '<button class="study-btn" id="b-fc-quit" style="margin-top:18px" aria-label="Return to activities">Back to activities</button>';
    h += '</div>';

    document.getElementById('content').innerHTML = h;

    document.getElementById('b-fc-quit').addEventListener('click', function () {
      showChapterActivities(bookId, chIdx);
    });
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
        var card = getOrCreateCard(bookId, chIdx, c.front, c.back, c.type);
        var updated = sm2(card, qualityMap[r]);
        updateCard(updated);
        if (r <= 2) weakQueue.push(cards[ci]);
        sinceWeak++;
        ci++;
        if (weakQueue.length > 0 && sinceWeak >= 3) {
          cards.splice(ci, 0, weakQueue.shift());
          sinceWeak = 0;
        }
        renderCard();
      });
    }
  }

  function showFlashcardSummary() {
    var avg = ratings.length ? ratings.reduce(function (a, b) { return a + b; }, 0) / ratings.length : 0;
    var emoji = avg >= 4 ? '\u{1F3C6}' : avg >= 3 ? '\u{1F31F}' : '\u{1F4AA}';
    var msg = avg >= 4 ? 'You know this well!' : avg >= 3 ? 'Getting there!' : 'Keep practicing!';
    var xpEarned = recordSession(bookId, chIdx, 'flashcards', cards.length, cards.length);

    var h = '<div class="cloze-results">';
    h += '<div class="cr-emoji">' + emoji + '</div>';
    h += '<div class="cr-score">' + cards.length + ' cards reviewed</div>';
    h += '<div class="cr-pct">Average confidence: ' + avg.toFixed(1) + ' / 5</div>';
    h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
    h += '<div class="cr-msg">' + msg + '</div>';
    h += '<div class="cr-btns">';
    h += '<button class="study-btn sb-pri" id="b-fc-retry" aria-label="Review cards again">\u{1F504} Again</button>';
    if (chIdx < activeChapters.length - 1) {
      h += '<button class="study-btn sb-pri" id="b-fc-next" aria-label="Go to next chapter">\u25B6 Next Chapter</button>';
    }
    h += '<button class="study-btn" id="b-fc-back" aria-label="Return to activities">Back to activities</button>';
    h += '</div></div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-fc-retry').addEventListener('click', function () {
      showFlashcards(bookId, chIdx);
    });
    var nextBtn = document.getElementById('b-fc-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        showChapterActivities(bookId, chIdx + 1);
      });
    }
    document.getElementById('b-fc-back').addEventListener('click', function () {
      showChapterActivities(bookId, chIdx);
    });
  }

  renderCard();
}

// ---- Cross-Book Review (due cards from all books) ----

function showCrossReview() {
  var allDue = getAllDueCards();
  if (!allDue.length) {
    document.getElementById('content').innerHTML =
      '<div class="cloze-results"><div class="cr-emoji">\u2705</div>' +
      '<div class="cr-msg">No cards due for review!</div>' +
      '<div class="cr-btns"><button class="study-btn sb-pri" id="b-rev-home" aria-label="Return home">Home</button></div></div>';
    document.getElementById('b-rev-home').addEventListener('click', function () { showLibrary(); });
    return;
  }

  var cards = allDue.slice(0, 20);
  var ci = 0, flipped = false;
  var ratings = [];

  function renderCard() {
    if (ci >= cards.length) { showRevSummary(); return; }
    var c = cards[ci];
    flipped = false;
    var book = getBook(c.bookId);
    var bookTitle = book ? book.title : 'Unknown';

    var h = '<div class="fc-view">';
    h += '<div class="fc-progress">' + (ci + 1) + ' of ' + cards.length + ' due</div>';
    h += '<div class="fc-type" style="color:var(--vol1)">' + bookTitle + '</div>';
    h += '<div class="fc-card" id="fc-card" role="button" aria-label="Review card — tap to flip">';
    h += '<div class="fc-front" id="fc-front">' + c.front + '</div>';
    h += '<div class="fc-back" id="fc-back" style="display:none">' + c.back + '</div>';
    h += '</div>';
    h += '<button class="cloze-audio" id="b-fc-hear" aria-label="Listen">\u{1F50A} Listen</button>';
    h += '<div class="fc-action" id="fc-action">';
    h += '<button class="study-btn sb-pri" id="b-fc-flip" aria-label="Flip card">\u{1F504} Flip to reveal</button>';
    h += '</div>';
    h += '<div class="fc-rate" id="fc-rate" style="display:none">';
    h += '<div class="fc-rate-label">How well did you know this?</div>';
    h += '<div class="fc-rate-btns">';
    var rLabels = ['Blank', 'Hard', 'Okay', 'Good', 'Easy'];
    var rColors = ['#dc2626', '#d97706', '#0891b2', '#059669', '#2563eb'];
    for (var r = 1; r <= 5; r++) {
      h += '<button class="fc-rate-btn" data-r="' + r +
        '" style="background:' + rColors[r - 1] + '" aria-label="Rate ' + r + ': ' + rLabels[r - 1] + '">' +
        r + '<br><span class="fc-rate-sub">' + rLabels[r - 1] + '</span></button>';
    }
    h += '</div></div>';
    h += '<button class="study-btn" id="b-rev-quit" style="margin-top:18px" aria-label="Return home">Back to Home</button>';
    h += '</div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-rev-quit').addEventListener('click', function () { showLibrary(); });
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
    var xpEarned = recordSession('review', 0, 'review', cards.length, cards.length);
    var emoji = avg >= 4 ? '\u{1F3C6}' : avg >= 3 ? '\u{1F31F}' : '\u{1F4AA}';

    var h = '<div class="cloze-results">';
    h += '<div class="cr-emoji">' + emoji + '</div>';
    h += '<div class="cr-score">' + cards.length + ' cards reviewed</div>';
    h += '<div class="cr-pct">Average confidence: ' + avg.toFixed(1) + ' / 5</div>';
    h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
    if (remaining > 0) h += '<div class="cr-mastery">\u{1F4DA} ' + remaining + ' more cards still due</div>';
    else h += '<div class="cr-mastery">\u2705 All caught up!</div>';
    h += '<div class="cr-btns">';
    if (remaining > 0) h += '<button class="study-btn sb-pri" id="b-rev-more" aria-label="Review more cards">\u{1F504} Review More</button>';
    h += '<button class="study-btn" id="b-rev-home" aria-label="Return home">Home</button>';
    h += '</div></div>';

    document.getElementById('content').innerHTML = h;
    if (remaining > 0) document.getElementById('b-rev-more').addEventListener('click', function () { showCrossReview(); });
    document.getElementById('b-rev-home').addEventListener('click', function () { showLibrary(); });
  }

  renderCard();
}

// ---- Placeholder for no-content state ----
function showNoContent(bookId, chIdx, modeName) {
  var h = '<div class="cloze-results">';
  h += '<div class="cr-emoji">\u{1F4AD}</div>';
  h += '<div class="cr-msg">Not enough content for ' + modeName + ' in this chapter yet.</div>';
  h += '<div class="cr-btns"><button class="study-btn" id="b-nc-back" aria-label="Return to activities">Back to activities</button></div>';
  h += '</div>';
  document.getElementById('content').innerHTML = h;
  document.getElementById('b-nc-back').addEventListener('click', function () {
    showChapterActivities(bookId, chIdx);
  });
}

// ---- Fill-in-the-Blank (Cloze Deletion) ----

function showFillBlank(bookId, chIdx, audioMode) {
  var book = getBook(bookId);
  if (!book || !activeChapters[chIdx]) { showNoContent(bookId, chIdx, 'Fill in the Blank'); return; }
  var ch = activeChapters[chIdx];
  var paras = ch.paragraphs || [];
  var keyTerms = book.keyTerms || [];
  var tier = getDifficultyTier(bookId, chIdx);

  var questions = generateFillBlanks(paras, keyTerms, tier === 'hard' ? 30 : 20);

  // Hard tier: pull cross-chapter questions
  if (tier === 'hard') {
    for (var ci = Math.max(0, chIdx - 2); ci <= Math.min(activeChapters.length - 1, chIdx + 2); ci++) {
      if (ci === chIdx) continue;
      var crossParas = activeChapters[ci].paragraphs || [];
      var crossQ = generateFillBlanks(crossParas, keyTerms, 3);
      for (var cq = 0; cq < crossQ.length; cq++) {
        crossQ[cq].crossRef = ci;
        questions.push(crossQ[cq]);
      }
    }
  }

  if (!questions.length) { showNoContent(bookId, chIdx, 'Fill in the Blank'); return; }
  questions = shuffle(questions).slice(0, tier === 'hard' ? 30 : 20);

  // Build distractor pool from all answers
  var allAns = questions.map(function (q) { return q.answer; });
  for (var kt = 0; kt < keyTerms.length; kt++) {
    if (allAns.indexOf(keyTerms[kt].term) < 0) allAns.push(keyTerms[kt].term);
  }

  var qi = 0, score = 0, points = 0, firstAttempt = true, hintsUsed = 0;
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);

  function renderQ() {
    if (qi >= questions.length) { showFBResults(); return; }
    var q = questions[qi];
    var correct = q.answer;
    firstAttempt = true;
    hintsUsed = 0;

    // Pick distractors
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
    // Add words from the source paragraph as extra distractors
    if (q.source) {
      var srcWords = q.source.split(/\s+/).filter(function (w) {
        var clean = w.replace(/[.,;:!?"'()]/g, '');
        return clean.length > 3 && clean.toLowerCase() !== correct.toLowerCase() && candidates.indexOf(clean) < 0;
      });
      candidates = candidates.concat(shuffle(srcWords).slice(0, 3));
    }
    var others = candidates.slice(0, 3);
    var opts = shuffle([correct].concat(others));
    var colors = ['#2563eb', '#059669', '#7c3aed', '#d97706'];

    var tierNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
    var tierColors = { easy: '#059669', medium: '#d97706', hard: '#dc2626' };

    var h = '<div class="cloze-view">';
    h += '<div class="cloze-progress">' + (qi + 1) + ' of ' + questions.length +
      ' <span style="color:' + (tierColors[tier] || '#059669') + ';font-size:.85em">\u25CF ' + (tierNames[tier] || 'Easy') + '</span></div>';
    h += '<div class="cloze-ref">' + chTitle + '</div>';
    if (audioMode) {
      h += '<div class="audio-gap-banner">\u{1F50A} Listen and tap the missing word</div>';
    }
    h += '<div class="cloze-prompt">' +
      q.prompt.replace('______', '<span class="cloze-blank">______</span>') + '</div>';
    h += '<button class="cloze-audio" id="b-cloze-hear" aria-label="Listen to this passage">\u{1F50A} Listen</button>';
    h += '<button class="hint-btn" id="b-cloze-hint" aria-label="Get a hint">\u{1F4A1} Hint</button>';
    h += '<div class="hint-display" id="cloze-hint-display" role="status" aria-live="polite"></div>';
    h += '<div class="cloze-opts">';
    for (var o = 0; o < opts.length; o++) {
      h += '<button class="cloze-opt" data-val="' + opts[o] +
        '" style="background:' + colors[o % 4] + '" aria-label="Answer option: ' + opts[o] + '">' + opts[o] + '</button>';
    }
    h += '</div>';
    h += '<div class="cloze-feedback" id="cloze-fb" role="status" aria-live="polite"></div>';
    h += '<button class="study-btn" id="b-cloze-quit" style="margin-top:18px" aria-label="Return to activities">Back to activities</button>';
    h += '</div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-cloze-quit').addEventListener('click', function () {
      showChapterActivities(bookId, chIdx);
    });
    document.getElementById('b-cloze-hear').addEventListener('click', function () {
      speakText(q.source || q.prompt.replace('______', correct));
    });
    if (audioMode) {
      setTimeout(function () {
        speakText(q.prompt.replace('______', 'blank'));
      }, 400);
    }
    wireHintLadder('b-cloze-hint', 'cloze-hint-display', correct, q.source, function (n) { hintsUsed = n; });
    var btns = document.querySelectorAll('.cloze-opt');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('click', function () {
        var val = this.getAttribute('data-val');
        var fb = document.getElementById('cloze-fb');
        if (val.toLowerCase() === correct.toLowerCase()) {
          this.classList.add('cloze-correct');
          fb.innerHTML = '<span class="fb-correct">\u2714 Correct!</span>' +
            '<div class="cloze-source">' + (q.source || '') + '</div>';
          if (firstAttempt) { score++; points += hintMultiplier(hintsUsed); }
          recordQuestionResult(bookId, chIdx, 'filblank', qi, firstAttempt);
          var all = document.querySelectorAll('.cloze-opt');
          for (var x = 0; x < all.length; x++) all[x].disabled = true;
          setTimeout(function () { qi++; renderQ(); }, 2200);
        } else {
          if (firstAttempt) {
            pushToRemixQueue({
              bookId: bookId, chIdx: chIdx, missedInMode: 'filblank',
              qIndex: qi, ref: q.ref || '', prompt: q.prompt,
              answer: correct, source: q.source || ''
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

  function showFBResults() {
    var pct = Math.round(score / questions.length * 100);
    var xpEarned = recordSession(bookId, chIdx, 'filblank', points, questions.length);
    var stats = getStats();
    var lvl = getLevel(stats.xp || 0);
    var mastery = getChapterMastery(bookId, chIdx);
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
    h += '<button class="study-btn sb-pri" id="b-fb-retry" aria-label="Try again">\u{1F504} Try Again</button>';
    if (pct >= 80 && chIdx < activeChapters.length - 1) {
      h += '<button class="study-btn sb-pri" id="b-fb-next" aria-label="Next chapter">\u25B6 Next Chapter</button>';
    }
    h += '<button class="study-btn" id="b-fb-back" aria-label="Return to activities">Back to activities</button>';
    h += '</div></div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-fb-retry').addEventListener('click', function () { showFillBlank(bookId, chIdx); });
    var nextBtn = document.getElementById('b-fb-next');
    if (nextBtn) nextBtn.addEventListener('click', function () { showChapterActivities(bookId, chIdx + 1); });
    document.getElementById('b-fb-back').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
  }

  renderQ();
}

// ---- Multiple Choice Quiz ----

function showMC(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters[chIdx]) { showNoContent(bookId, chIdx, 'Multiple Choice'); return; }
  var ch = activeChapters[chIdx];
  var paras = ch.paragraphs || [];
  var keyTerms = book.keyTerms || [];
  var tier = getDifficultyTier(bookId, chIdx);
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);

  var questions = generateMCQuestions(paras, keyTerms, tier === 'hard' ? 12 : 8);

  // Hard tier: cross-chapter MC
  if (tier === 'hard') {
    for (var ci = Math.max(0, chIdx - 2); ci <= Math.min(activeChapters.length - 1, chIdx + 2); ci++) {
      if (ci === chIdx) continue;
      var crossParas = activeChapters[ci].paragraphs || [];
      var crossMC = generateMCQuestions(crossParas, keyTerms, 2);
      for (var cm = 0; cm < crossMC.length; cm++) {
        crossMC[cm].crossRef = ci;
        questions.push(crossMC[cm]);
      }
    }
  }

  // Fallback: paragraph identification questions
  if (questions.length < 4) {
    var usable = paras.filter(function (p) { return p.length > 30 && p.length < 200; });
    usable = shuffle(usable);
    for (var vi = 0; vi < Math.min(usable.length, 8) && questions.length < 10; vi++) {
      var words = usable[vi].split(/\s+/);
      var snippet = words.slice(0, Math.min(8, words.length)).join(' ');
      var opts = [usable[vi]];
      var others = usable.filter(function (_, j) { return j !== vi; });
      others = shuffle(others).slice(0, 3);
      for (var oi = 0; oi < others.length; oi++) opts.push(others[oi]);
      opts = shuffle(opts.map(function (o) { return o.length > 60 ? o.slice(0, 57) + '...' : o; }));
      var correctText = usable[vi].length > 60 ? usable[vi].slice(0, 57) + '...' : usable[vi];
      questions.push({
        question: 'Which passage contains: "' + snippet + '..."?',
        options: opts,
        correct: opts.indexOf(correctText),
        source: usable[vi]
      });
    }
  }

  if (!questions.length) { showNoContent(bookId, chIdx, 'Multiple Choice'); return; }
  questions = shuffle(questions).slice(0, tier === 'hard' ? 30 : 20);

  var qi = 0, score = 0, points = 0, mcFirstAttempt = true, mcHintsUsed = 0;
  var mcColors = ['#dc2626', '#2563eb', '#059669', '#d97706'];

  function renderQ() {
    if (qi >= questions.length) { showMCResults(); return; }
    var q = questions[qi];
    mcFirstAttempt = true;
    mcHintsUsed = 0;

    var tierNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
    var tierColors = { easy: '#059669', medium: '#d97706', hard: '#dc2626' };

    var h = '<div class="mc-view">';
    h += '<div class="mc-progress">' + (qi + 1) + ' of ' + questions.length +
      ' <span style="color:' + (tierColors[tier] || '#059669') + ';font-size:.85em">\u25CF ' + (tierNames[tier] || 'Easy') + '</span></div>';
    h += '<div class="mc-ref">' + chTitle + '</div>';
    h += '<div class="mc-question">' + q.question + '</div>';
    h += '<button class="cloze-audio" id="b-mc-hear" aria-label="Listen to question">\u{1F50A} Listen</button>';
    h += '<button class="hint-btn" id="b-mc-hint" aria-label="Get a hint">\u{1F4A1} Hint</button>';
    h += '<div class="hint-display" id="mc-hint-display" role="status" aria-live="polite"></div>';
    h += '<div class="mc-opts">';
    for (var o = 0; o < q.options.length; o++) {
      h += '<button class="mc-opt" data-idx="' + o +
        '" style="background:' + mcColors[o % 4] + '" aria-label="Option ' + (o + 1) + ': ' + q.options[o] + '">' +
        q.options[o] + '</button>';
    }
    h += '</div>';
    h += '<div class="mc-feedback" id="mc-fb" role="status" aria-live="polite"></div>';
    h += '<button class="study-btn" id="b-mc-quit" style="margin-top:18px" aria-label="Return to activities">Back to activities</button>';
    h += '</div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-mc-quit').addEventListener('click', function () {
      showChapterActivities(bookId, chIdx);
    });
    document.getElementById('b-mc-hear').addEventListener('click', function () {
      speakText(q.question);
    });
    var mcAnswer = q.options[q.correct];
    wireHintLadder('b-mc-hint', 'mc-hint-display', mcAnswer, q.source, function (n) { mcHintsUsed = n; });
    var btns = document.querySelectorAll('.mc-opt');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-idx'));
        var fb = document.getElementById('mc-fb');
        if (idx === q.correct) {
          this.classList.add('mc-correct');
          fb.innerHTML = '<span class="fb-correct">\u2714 Correct!</span>' +
            '<div class="cloze-source">' + (q.source || '') + '</div>';
          if (mcFirstAttempt) { score++; points += hintMultiplier(mcHintsUsed); }
          recordQuestionResult(bookId, chIdx, 'mc', qi, mcFirstAttempt);
          var all = document.querySelectorAll('.mc-opt');
          for (var x = 0; x < all.length; x++) all[x].disabled = true;
          setTimeout(function () { qi++; renderQ(); }, 2200);
        } else {
          if (mcFirstAttempt) {
            pushToRemixQueue({
              bookId: bookId, chIdx: chIdx, missedInMode: 'mc',
              qIndex: qi, ref: q.ref || '', question: q.question,
              options: q.options.slice(), correct: q.correct,
              source: q.source || ''
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

  function showMCResults() {
    var pct = Math.round(score / questions.length * 100);
    var xpEarned = recordSession(bookId, chIdx, 'mc', points, questions.length);
    var stats = getStats();
    var lvl = getLevel(stats.xp || 0);
    var mastery = getChapterMastery(bookId, chIdx);
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
    h += '<button class="study-btn sb-pri" id="b-mc-retry" aria-label="Try again">\u{1F504} Try Again</button>';
    if (pct >= 80 && chIdx < activeChapters.length - 1) {
      h += '<button class="study-btn sb-pri" id="b-mc-next" aria-label="Next chapter">\u25B6 Next Chapter</button>';
    }
    h += '<button class="study-btn" id="b-mc-back" aria-label="Return to activities">Back to activities</button>';
    h += '</div></div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-mc-retry').addEventListener('click', function () { showMC(bookId, chIdx); });
    var nextBtn = document.getElementById('b-mc-next');
    if (nextBtn) nextBtn.addEventListener('click', function () { showChapterActivities(bookId, chIdx + 1); });
    document.getElementById('b-mc-back').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
  }

  renderQ();
}

// ---- Memory Match — flip cards, find matching pairs ----

function showMemoryMatch(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters[chIdx]) { showNoContent(bookId, chIdx, 'Memory Match'); return; }
  var ch = activeChapters[chIdx];
  var paras = ch.paragraphs || [];
  var keyTerms = book.keyTerms || [];

  var terms = [];
  // Use key terms if enough exist
  if (keyTerms.length >= 4) {
    var selected = shuffle(keyTerms.slice()).slice(0, 6);
    for (var t = 0; t < selected.length; t++) {
      terms.push({
        term: selected[t].term,
        def: selected[t].definition || 'Appears ' + selected[t].frequency + ' times (' + selected[t].spread + '% of chapters)'
      });
    }
  }

  // Fallback: match first half of paragraph to second half
  if (terms.length < 4) {
    var usable = paras.filter(function (p) { return p.length > 30 && p.length < 150; });
    usable = shuffle(usable).slice(0, 6);
    if (usable.length < 4) { showNoContent(bookId, chIdx, 'Memory Match'); return; }
    terms = usable.map(function (p) {
      var words = p.split(/\s+/);
      var half = Math.ceil(words.length / 2);
      return {
        term: words.slice(0, Math.min(4, half)).join(' ') + '...',
        def: p
      };
    });
  }

  // Build tile pairs
  var tiles = [];
  var tileColors = ['#ef4444', '#f97316', '#e91e90', '#16a34a', '#2563eb', '#ca8a04'];
  for (var i = 0; i < terms.length; i++) {
    tiles.push({ id: i, side: 'term', text: terms[i].term, pairId: i });
    tiles.push({ id: i, side: 'def', text: terms[i].def.split('.')[0] + '.', pairId: i });
  }
  tiles = shuffle(tiles);

  var flippedA = null, flippedB = null;
  var matched = 0, attempts = 0, locked = false;

  function render() {
    var h = '<div class="mm-view">';
    h += '<div class="mm-header">Match the term to its meaning</div>';
    h += '<div class="mm-stats">Pairs: ' + matched + '/' + terms.length +
      ' &nbsp; Attempts: ' + attempts + '</div>';
    h += '<div class="mm-grid">';
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      h += '<div class="mm-tile" data-idx="' + i + '" role="button" tabindex="0" aria-label="Card ' + (i + 1) + ' — tap to flip">';
      h += '<div class="mm-tile-inner">';
      h += '<div class="mm-tile-front" aria-hidden="true">?</div>';
      h += '<div class="mm-tile-back" style="background:' +
        tileColors[t.pairId % 6] + '">' + t.text + '</div>';
      h += '</div></div>';
    }
    h += '</div>';
    h += '<button class="study-btn" id="b-mm-back" style="margin-top:20px" aria-label="Return to activities">Back to activities</button>';
    h += '</div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-mm-back').addEventListener('click', function () {
      showChapterActivities(bookId, chIdx);
    });

    var tileEls = document.querySelectorAll('.mm-tile');
    for (var i = 0; i < tileEls.length; i++) {
      tileEls[i].addEventListener('click', function () {
        if (locked) return;
        var idx = parseInt(this.getAttribute('data-idx'));
        var tile = tiles[idx];
        if (this.classList.contains('mm-matched') || this.classList.contains('mm-open')) return;

        this.classList.add('mm-open');
        speakText(tile.text.replace(/\(\d+:\d+[^)]*\)/g, ''));

        if (flippedA === null) {
          flippedA = { idx: idx, tile: tile, el: this };
        } else {
          flippedB = { idx: idx, tile: tile, el: this };
          attempts++;
          locked = true;

          if (flippedA.tile.pairId === flippedB.tile.pairId &&
              flippedA.tile.side !== flippedB.tile.side) {
            flippedA.el.classList.add('mm-matched');
            flippedB.el.classList.add('mm-matched');
            matched++;
            updateStats();
            flippedA = null; flippedB = null;
            locked = false;
            if (matched === terms.length) {
              setTimeout(showMMWin, 600);
            }
          } else {
            var a = flippedA, b = flippedB;
            setTimeout(function () {
              a.el.classList.remove('mm-open');
              b.el.classList.remove('mm-open');
              flippedA = null; flippedB = null;
              locked = false;
            }, 1000);
          }
        }
      });
    }
  }

  function updateStats() {
    var statsEl = document.querySelector('.mm-stats');
    if (statsEl) statsEl.innerHTML = 'Pairs: ' + matched + '/' + terms.length +
      ' &nbsp; Attempts: ' + attempts;
  }

  function showMMWin() {
    var efficiency = Math.round(terms.length / attempts * 100);
    var xpEarned = recordSession(bookId, chIdx, 'memory', matched, terms.length);
    var stats = getStats();
    var lvl = getLevel(stats.xp || 0);
    var emoji = efficiency >= 80 ? '\u{1F3C6}' : efficiency >= 50 ? '\u{1F31F}' : '\u{1F4AA}';

    var h = '<div class="cloze-results">';
    h += '<div class="cr-emoji">' + emoji + '</div>';
    h += '<div class="cr-score">All ' + terms.length + ' pairs matched!</div>';
    h += '<div class="cr-pct">' + attempts + ' attempts \u2014 ' + efficiency + '% efficiency</div>';
    h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
    h += '<div class="cr-level">' + lvl.current.icon + ' ' + lvl.current.name +
      ' \u2014 ' + (stats.xp || 0) + ' XP total</div>';
    h += '<div class="cr-btns">';
    h += '<button class="study-btn sb-pri" id="b-mm-retry" aria-label="Play again">\u{1F504} Play Again</button>';
    h += '<button class="study-btn" id="b-mm-done" aria-label="Return to activities">Back to activities</button>';
    h += '</div></div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-mm-retry').addEventListener('click', function () { showMemoryMatch(bookId, chIdx); });
    document.getElementById('b-mm-done').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
  }

  render();
}

// ---- Word Match — tap a term, then tap its meaning ----

function showWordMatch(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters[chIdx]) { showNoContent(bookId, chIdx, 'Word Match'); return; }
  var ch = activeChapters[chIdx];
  var paras = ch.paragraphs || [];
  var keyTerms = book.keyTerms || [];

  var terms = [];
  if (keyTerms.length >= 4) {
    var selected = shuffle(keyTerms.slice()).slice(0, 6);
    for (var t = 0; t < selected.length; t++) {
      terms.push({
        term: selected[t].term,
        definition: selected[t].definition || 'Appears ' + selected[t].frequency + ' times (' + selected[t].spread + '% of chapters)'
      });
    }
  }

  // Fallback: match paragraph opening words to full paragraph
  if (terms.length < 4) {
    var usable = paras.filter(function (p) { return p.length > 30 && p.length < 150; });
    usable = shuffle(usable).slice(0, 6);
    if (usable.length < 4) { showNoContent(bookId, chIdx, 'Word Match'); return; }
    terms = usable.map(function (p) {
      var words = p.split(/\s+/);
      return {
        term: words.slice(0, Math.min(4, Math.ceil(words.length / 2))).join(' ') + '...',
        definition: p
      };
    });
  }

  var defs = shuffle(terms.map(function (t) {
    return { term: t.term, def: t.definition.split('.')[0] + '.' };
  }));
  var matched = 0, selectedTerm = null;
  var itemColors = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706', '#0891b2'];

  function render() {
    var h = '<div class="wm-view">';
    h += '<div class="wm-header">Tap a term, then tap its meaning</div>';
    h += '<div class="wm-stats">Matched: ' + matched + ' / ' + terms.length + '</div>';
    h += '<div class="wm-cols">';

    // Terms column
    h += '<div class="wm-col">';
    for (var i = 0; i < terms.length; i++) {
      var mClass = terms[i]._matched ? ' wm-done' : '';
      h += '<button class="wm-item wm-term' + mClass + '" data-t="' + i +
        '" style="border-left:4px solid ' + itemColors[i % 6] + '" aria-label="Term: ' + terms[i].term + '">' +
        terms[i].term + '</button>';
    }
    h += '</div>';

    // Definitions column
    h += '<div class="wm-col">';
    for (var j = 0; j < defs.length; j++) {
      var dClass = defs[j]._matched ? ' wm-done' : '';
      h += '<button class="wm-item wm-def' + dClass + '" data-d="' + j +
        '" aria-label="Definition: ' + defs[j].def + '">' + defs[j].def + '</button>';
    }
    h += '</div></div>';

    h += '<div id="wm-fb" class="cloze-feedback" role="status" aria-live="polite"></div>';
    h += '<button class="study-btn" id="b-wm-back" style="margin-top:16px" aria-label="Return to activities">Back to activities</button>';
    h += '</div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-wm-back').addEventListener('click', function () {
      showChapterActivities(bookId, chIdx);
    });

    // Wire term buttons
    var termBtns = document.querySelectorAll('.wm-term:not(.wm-done)');
    for (var tb = 0; tb < termBtns.length; tb++) {
      termBtns[tb].addEventListener('click', function () {
        document.querySelectorAll('.wm-term').forEach(function (b) { b.classList.remove('wm-selected'); });
        this.classList.add('wm-selected');
        selectedTerm = parseInt(this.getAttribute('data-t'));
        speakText(terms[selectedTerm].term);
      });
    }

    // Wire definition buttons
    var defBtns = document.querySelectorAll('.wm-def:not(.wm-done)');
    for (var db = 0; db < defBtns.length; db++) {
      defBtns[db].addEventListener('click', function () {
        if (selectedTerm === null) {
          document.getElementById('wm-fb').innerHTML = '<span class="fb-try">Tap a term first</span>';
          return;
        }
        var di = parseInt(this.getAttribute('data-d'));
        if (defs[di].term === terms[selectedTerm].term) {
          // Correct match
          terms[selectedTerm]._matched = true;
          defs[di]._matched = true;
          matched++;
          selectedTerm = null;
          if (matched === terms.length) {
            showWMWin();
          } else {
            document.getElementById('wm-fb').innerHTML = '<span class="fb-correct">\u2714 Matched!</span>';
            render();
          }
        } else {
          // Wrong match
          document.getElementById('wm-fb').innerHTML = '<span class="fb-try">Not a match \u2014 try again</span>';
          speakText(defs[di].def);
        }
      });
    }
  }

  function showWMWin() {
    var xpEarned = recordSession(bookId, chIdx, 'wordmatch', matched, terms.length);
    var stats = getStats();
    var lvl = getLevel(stats.xp || 0);

    var h = '<div class="cloze-results">';
    h += '<div class="cr-emoji">\u{1F3C6}</div>';
    h += '<div class="cr-score">All ' + terms.length + ' terms matched!</div>';
    h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
    h += '<div class="cr-level">' + lvl.current.icon + ' ' + lvl.current.name +
      ' \u2014 ' + (stats.xp || 0) + ' XP total</div>';
    h += '<div class="cr-btns">';
    h += '<button class="study-btn sb-pri" id="b-wm-retry" aria-label="Play again">\u{1F504} Play Again</button>';
    h += '<button class="study-btn" id="b-wm-done" aria-label="Return to activities">Back to activities</button>';
    h += '</div></div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-wm-retry').addEventListener('click', function () { showWordMatch(bookId, chIdx); });
    document.getElementById('b-wm-done').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
  }

  render();
}

// ---- Verse Builder — reconstruct scrambled paragraph word-by-word ----

function showVerseBuilder(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters[chIdx]) { showNoContent(bookId, chIdx, 'Verse Builder'); return; }
  var ch = activeChapters[chIdx];
  var paras = ch.paragraphs || [];
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);

  var usable = paras.filter(function (p) { return p.length > 20 && p.length < 150; });
  usable = shuffle(usable).slice(0, 5);
  if (!usable.length) { showNoContent(bookId, chIdx, 'Verse Builder'); return; }

  // Wrap each usable paragraph with ref
  var verses = usable.map(function (p, i) { return { text: p, ref: 'Passage ' + (i + 1) }; });
  var qi = 0, score = 0;

  function countIn(arr, val) {
    var c = 0;
    for (var i = 0; i < arr.length; i++) if (arr[i] === val) c++;
    return c;
  }

  function renderPuzzle() {
    if (qi >= verses.length) { showVBResults(); return; }
    var v = verses[qi];
    var origWords = v.text.split(/\s+/).filter(function (w) { return w.length > 0; });
    var scrambled = shuffle(origWords.slice());
    var placed = [];

    function draw() {
      var h = '<div class="vb-view">';
      h += '<div class="vb-progress">' + (qi + 1) + ' of ' + verses.length + '</div>';
      h += '<div class="vb-ref">' + chTitle + ' \u2014 ' + v.ref + '</div>';

      // Placed words area
      h += '<div class="vb-placed" id="vb-placed">';
      for (var p = 0; p < placed.length; p++) {
        h += '<span class="vb-word vb-done" aria-label="Placed word: ' + placed[p] + '">' + placed[p] + '</span>';
      }
      if (placed.length < origWords.length) h += '<span class="vb-cursor">_</span>';
      h += '</div>';

      // Word bank
      h += '<div class="vb-bank" id="vb-bank">';
      for (var s = 0; s < scrambled.length; s++) {
        var used = placed.indexOf(scrambled[s]) >= 0 &&
          countIn(placed, scrambled[s]) >= countIn(scrambled.slice(0, s + 1), scrambled[s]);
        if (!used) {
          h += '<button class="vb-word vb-pick" data-si="' + s + '" aria-label="Pick word: ' + scrambled[s] + '">' + scrambled[s] + '</button>';
        }
      }
      h += '</div>';

      h += '<div class="vb-btns">';
      h += '<button class="study-btn" id="b-vb-undo" style="background:#6b7280" aria-label="Undo last word">\u21A9 Undo</button>';
      h += '<button class="cloze-audio" id="b-vb-hear" aria-label="Listen to passage">\u{1F50A} Listen</button>';
      h += '</div>';
      h += '<div id="vb-fb" class="cloze-feedback" role="status" aria-live="polite"></div>';
      h += '<button class="study-btn" id="b-vb-quit" style="margin-top:18px" aria-label="Return to activities">Back to activities</button>';
      h += '</div>';

      document.getElementById('content').innerHTML = h;

      document.getElementById('b-vb-quit').addEventListener('click', function () {
        showChapterActivities(bookId, chIdx);
      });
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

  function showVBResults() {
    var pct = Math.round(score / verses.length * 100);
    var xpEarned = recordSession(bookId, chIdx, 'versebuild', score, verses.length);
    var stats = getStats();
    var lvl = getLevel(stats.xp || 0);
    var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
    var msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good work!' : 'Keep building!';

    var h = '<div class="cloze-results">';
    h += '<div class="cr-emoji">' + emoji + '</div>';
    h += '<div class="cr-score">' + score + ' / ' + verses.length + ' passages rebuilt</div>';
    h += '<div class="cr-pct">' + pct + '%</div>';
    h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
    h += '<div class="cr-level">' + lvl.current.icon + ' ' + lvl.current.name +
      ' \u2014 ' + (stats.xp || 0) + ' XP total</div>';
    h += '<div class="cr-msg">' + msg + '</div>';
    h += '<div class="cr-btns">';
    h += '<button class="study-btn sb-pri" id="b-vb-retry" aria-label="Try again">\u{1F504} Try Again</button>';
    if (pct >= 80 && chIdx < activeChapters.length - 1) {
      h += '<button class="study-btn sb-pri" id="b-vb-next" aria-label="Next chapter">\u25B6 Next Chapter</button>';
    }
    h += '<button class="study-btn" id="b-vb-back" aria-label="Return to activities">Back to activities</button>';
    h += '</div></div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-vb-retry').addEventListener('click', function () { showVerseBuilder(bookId, chIdx); });
    var nextBtn = document.getElementById('b-vb-next');
    if (nextBtn) nextBtn.addEventListener('click', function () { showChapterActivities(bookId, chIdx + 1); });
    document.getElementById('b-vb-back').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
  }

  renderPuzzle();
}

// ---- Listen & Learn — paragraph-by-paragraph read-along with word highlighting ----

function showListenLearn(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters[chIdx]) { showNoContent(bookId, chIdx, 'Listen & Learn'); return; }
  var ch = activeChapters[chIdx];
  var paras = ch.paragraphs || [];
  if (!paras.length) { showNoContent(bookId, chIdx, 'Listen & Learn'); return; }

  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);
  var vi = 0, playing = false, utterance = null;

  function renderParagraph() {
    // Wrap each word in a span for word-by-word highlight during TTS
    var words = paras[vi].split(/(\s+)/);
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

    var h = '<div class="ll-view">';
    h += '<div class="ll-header">Listen &amp; Learn</div>';
    h += '<div class="ll-section">' + chTitle + '</div>';
    h += '<div class="ll-card" id="ll-card" role="region" aria-label="Current paragraph">' + wordHtml + '</div>';
    h += '<div class="ll-progress">' + (vi + 1) + ' of ' + paras.length + '</div>';
    h += '<div class="ll-controls">';
    h += '<button class="ll-btn ll-prev" id="b-ll-prev" aria-label="Previous paragraph">\u25C0 Prev</button>';
    h += '<button class="ll-btn ll-play" id="b-ll-play" aria-label="Play audio">\u25B6 Play</button>';
    h += '<button class="ll-btn ll-stop" id="b-ll-stop" aria-label="Stop audio">\u25A0 Stop</button>';
    h += '<button class="ll-btn ll-next" id="b-ll-next" aria-label="Next paragraph">Next \u25B6</button>';
    h += '</div>';
    h += '<div class="ll-auto">';
    h += '<label><input type="checkbox" id="ll-autoplay" checked> Auto-advance to next paragraph</label>';
    h += '</div>';
    h += '<button class="study-btn" id="b-ll-back" style="margin-top:20px" aria-label="Return to activities">Back to activities</button>';
    h += '</div>';

    document.getElementById('content').innerHTML = h;

    document.getElementById('b-ll-prev').addEventListener('click', function () {
      stopLL(); vi = Math.max(0, vi - 1); renderParagraph();
    });
    document.getElementById('b-ll-next').addEventListener('click', function () {
      stopLL(); vi = Math.min(paras.length - 1, vi + 1); renderParagraph();
    });
    document.getElementById('b-ll-play').addEventListener('click', function () {
      playParagraph();
    });
    document.getElementById('b-ll-stop').addEventListener('click', function () {
      stopLL();
      this.textContent = '\u25A0 Stopped';
    });
    document.getElementById('b-ll-back').addEventListener('click', function () {
      stopLL();
      showChapterActivities(bookId, chIdx);
    });
  }

  function playParagraph() {
    if (!window.speechSynthesis) return;
    stopLL();
    playing = true;

    var card = document.getElementById('ll-card');
    if (card) card.classList.add('ll-speaking');

    utterance = new SpeechSynthesisUtterance(paras[vi]);
    utterance.rate = 1;
    utterance.lang = 'en-US';
    utterance.volume = 1;
    var voice = getBestVoice();
    if (voice) utterance.voice = voice;

    // Word-by-word highlighting via boundary events
    var wordSpans = document.querySelectorAll('.ll-word');
    var currentWordIdx = 0;

    utterance.onboundary = function (e) {
      if (e.name === 'word' && wordSpans.length > 0) {
        // Remove previous highlight
        for (var i = 0; i < wordSpans.length; i++) {
          wordSpans[i].classList.remove('ll-word-active');
        }
        if (currentWordIdx < wordSpans.length) {
          wordSpans[currentWordIdx].classList.add('ll-word-active');
          currentWordIdx++;
        }
      }
    };

    utterance.onend = function () {
      playing = false;
      if (card) card.classList.remove('ll-speaking');
      // Remove all highlights
      for (var i = 0; i < wordSpans.length; i++) {
        wordSpans[i].classList.remove('ll-word-active');
      }
      // Auto-advance
      var autoCheck = document.getElementById('ll-autoplay');
      if (autoCheck && autoCheck.checked && vi < paras.length - 1) {
        vi++;
        renderParagraph();
        setTimeout(function () { playParagraph(); }, 500);
      }
    };

    utterance.onerror = function () {
      playing = false;
      if (card) card.classList.remove('ll-speaking');
    };

    try { window.speechSynthesis.resume(); } catch (e) {}
    window.speechSynthesis.speak(utterance);
  }

  function stopLL() {
    playing = false;
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    var card = document.getElementById('ll-card');
    if (card) card.classList.remove('ll-speaking');
    var wordSpans = document.querySelectorAll('.ll-word');
    for (var i = 0; i < wordSpans.length; i++) {
      wordSpans[i].classList.remove('ll-word-active');
    }
  }

  renderParagraph();
}

// ---- Chapter Breakdown — progressive reveal: summary → terms → paragraphs ----

function showBreakdown(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters[chIdx]) { showNoContent(bookId, chIdx, 'Breakdown'); return; }
  var ch = activeChapters[chIdx];
  var paras = ch.paragraphs || [];
  var keyTerms = book.keyTerms || [];
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);

  // Find terms that appear in this chapter's paragraphs
  var chapterText = paras.join(' ').toLowerCase();
  var chTerms = keyTerms.filter(function (t) {
    return chapterText.indexOf(t.term.toLowerCase()) >= 0;
  });

  // Generate a summary from the first few paragraphs
  var summaryParas = paras.slice(0, Math.min(3, paras.length));
  var summaryText = summaryParas.map(function (p) {
    return p.length > 200 ? p.slice(0, 197) + '...' : p;
  }).join(' ');

  var h = '<div class="study-view">';

  // Title card
  h += '<div class="sv-title" style="border-left-color:' + (book.color || 'var(--vol1)') + '">' + chTitle + '</div>';

  // Phase 1: Summary
  h += '<div class="sv-sec">';
  h += '<h3>Overview</h3>';
  h += '<div class="sv-text">' + summaryText + '</div>';
  if (paras.length > 3) {
    h += '<button class="sv-toggle" id="b-bd-full" aria-label="Show full chapter text">Show full text (' + paras.length + ' paragraphs)</button>';
    h += '<div id="bd-full-text" style="display:none">';
    for (var p = 0; p < paras.length; p++) {
      h += '<p class="sv-text" style="margin-bottom:10px">' + paras[p] + '</p>';
    }
    h += '</div>';
  }
  h += '</div>';

  // Phase 2: Key terms found in this chapter
  if (chTerms.length > 0) {
    h += '<div class="sv-sec">';
    h += '<h3>Key Terms in This Chapter (' + chTerms.length + ')</h3>';
    for (var t = 0; t < chTerms.length; t++) {
      h += '<div class="sv-term">';
      h += '<span class="sv-tw">' + chTerms[t].term + '</span>';
      h += '<span class="sv-tp" style="margin-left:8px">' + chTerms[t].frequency + 'x across book</span>';
      if (chTerms[t].definition) {
        h += '<span class="sv-td">' + chTerms[t].definition + '</span>';
      }
      h += '</div>';
    }
    h += '</div>';
  }

  // Phase 3: Paragraph-by-paragraph with tap-to-hear
  h += '<div class="sv-sec">';
  h += '<h3>Paragraph by Paragraph</h3>';
  h += '<div id="bd-paras">';
  var initialShow = Math.min(5, paras.length);
  for (var i = 0; i < initialShow; i++) {
    h += '<div class="sv-faq" style="border-left-color:' + (book.color || 'var(--vol1)') + '">';
    h += '<div class="sv-fq" style="color:' + (book.color || 'var(--vol1)') + '">Paragraph ' + (i + 1) + '</div>';
    h += '<div class="sv-fa">' + paras[i] + '</div>';
    h += '</div>';
  }
  if (paras.length > initialShow) {
    h += '<button class="sv-toggle" id="b-bd-more" aria-label="Show remaining paragraphs">Show ' + (paras.length - initialShow) + ' more paragraphs</button>';
    h += '<div id="bd-more-paras" style="display:none">';
    for (var j = initialShow; j < paras.length; j++) {
      h += '<div class="sv-faq" style="border-left-color:' + (book.color || 'var(--vol1)') + '">';
      h += '<div class="sv-fq" style="color:' + (book.color || 'var(--vol1)') + '">Paragraph ' + (j + 1) + '</div>';
      h += '<div class="sv-fa">' + paras[j] + '</div>';
      h += '</div>';
    }
    h += '</div>';
  }
  h += '</div></div>';

  // Practice buttons
  h += '<div class="sv-sec sv-actions">';
  h += '<h3>Practice This Chapter</h3>';
  h += '<button class="study-btn sb-pri" id="b-bd-flash" aria-label="Start flashcards">\u{1F0CF} Flashcards</button>';
  h += '<button class="study-btn" id="b-bd-fill" aria-label="Start fill in the blank" style="background:#059669">\u{1F9E9} Fill in Blank</button>';
  h += '<button class="study-btn" id="b-bd-mc" aria-label="Start multiple choice" style="background:#7c3aed">\u270F\uFE0F Multiple Choice</button>';
  h += '<button class="study-btn" id="b-bd-listen" aria-label="Start listen and learn" style="background:#4f46e5">\u{1F50A} Listen &amp; Learn</button>';
  h += '</div>';

  h += '<button class="study-btn" id="b-bd-back" style="margin-top:16px" aria-label="Return to activities">Back to activities</button>';
  h += '</div>';

  document.getElementById('content').innerHTML = h;

  // Wire toggle buttons
  var fullBtn = document.getElementById('b-bd-full');
  if (fullBtn) {
    fullBtn.addEventListener('click', function () {
      var el = document.getElementById('bd-full-text');
      if (el.style.display === 'none') {
        el.style.display = '';
        this.textContent = 'Hide full text';
      } else {
        el.style.display = 'none';
        this.textContent = 'Show full text (' + paras.length + ' paragraphs)';
      }
    });
  }
  var moreBtn = document.getElementById('b-bd-more');
  if (moreBtn) {
    moreBtn.addEventListener('click', function () {
      var el = document.getElementById('bd-more-paras');
      if (el.style.display === 'none') {
        el.style.display = '';
        this.style.display = 'none';
      }
    });
  }

  // Wire practice buttons
  document.getElementById('b-bd-flash').addEventListener('click', function () { showFlashcards(bookId, chIdx); });
  document.getElementById('b-bd-fill').addEventListener('click', function () { showFillBlank(bookId, chIdx); });
  document.getElementById('b-bd-mc').addEventListener('click', function () { showMC(bookId, chIdx); });
  document.getElementById('b-bd-listen').addEventListener('click', function () { showListenLearn(bookId, chIdx); });
  document.getElementById('b-bd-back').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });

  window.scrollTo(0, 0);
}

// ---- Challenge Mode — 2-6 player competitive quiz ----

function showChallenge(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters[chIdx]) { showNoContent(bookId, chIdx, 'Challenge'); return; }
  var ch = activeChapters[chIdx];
  var paras = ch.paragraphs || [];
  var keyTerms = book.keyTerms || [];
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);
  var playerColors = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706', '#0891b2'];
  var playerCount = 4;

  function setupScreen() {
    var h = '<div class="ch-setup">';
    h += '<div class="ch-title">\u2694\uFE0F CHALLENGE</div>';
    h += '<div class="ch-subtitle">' + chTitle + '</div>';
    h += '<div class="ch-player-count"><label>Players:</label>';
    for (var n = 2; n <= 6; n++) {
      h += '<button class="ch-count-btn' + (n === playerCount ? ' ch-count-on' : '') + '" data-n="' + n + '" aria-label="' + n + ' players">' + n + '</button>';
    }
    h += '</div>';
    h += '<div class="ch-players" id="ch-player-list">';
    for (var p = 1; p <= playerCount; p++) {
      h += '<div class="ch-player-input"><label>Player ' + p + '</label><input id="ch-p' + p + '" type="text" value="Player ' + p + '" maxlength="12" class="ch-name" aria-label="Player ' + p + ' name"></div>';
    }
    h += '</div>';
    h += '<button class="study-btn sb-pri" id="b-ch-start" aria-label="Start challenge">\u25B6 Start Challenge</button>';
    h += '<button class="study-btn" id="b-ch-back" aria-label="Return to activities">Back to activities</button>';
    h += '</div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-ch-back').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
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
      buildQuestions(pNames);
    });
  }

  function buildQuestions(playerNames) {
    var allQ = [];
    // Fill-blank questions
    var fbQ = generateFillBlanks(paras, keyTerms, 10);
    for (var f = 0; f < fbQ.length; f++) {
      var fb = fbQ[f];
      var fbOpts = [fb.answer];
      var fbOthers = fbQ.filter(function (o) { return o.answer !== fb.answer; });
      fbOthers = shuffle(fbOthers).slice(0, 3);
      for (var fo = 0; fo < fbOthers.length; fo++) fbOpts.push(fbOthers[fo].answer);
      fbOpts = shuffle(fbOpts);
      allQ.push({ question: fb.prompt.replace('______', '___'), options: fbOpts, correct: fbOpts.indexOf(fb.answer), source: fb.source || '' });
    }
    // MC questions
    var mcQ = generateMCQuestions(paras, keyTerms, 10);
    for (var m = 0; m < mcQ.length; m++) {
      allQ.push({ question: mcQ[m].question, options: mcQ[m].options, correct: mcQ[m].correct, source: mcQ[m].source || '' });
    }

    if (allQ.length < 3) { showNoContent(bookId, chIdx, 'Challenge'); return; }
    allQ = shuffle(allQ).slice(0, Math.max(50, playerNames.length * 10));
    runGame(playerNames, allQ);
  }

  function runGame(names, questions) {
    var scores = [];
    for (var si = 0; si < names.length; si++) scores.push(0);
    var currentPlayer = 0;
    var qi = 0;
    var strikes = 0;
    var timer = null;
    var timeLeft = 0;

    function renderQuestion() {
      if (qi >= questions.length) { showFinalResults(); return; }
      var q = questions[qi];
      timeLeft = 20;
      strikes = 0;

      var h = '<div class="ch-game">';
      h += '<div class="ch-scorebar">';
      for (var s = 0; s < names.length; s++) {
        h += '<div class="ch-p' + (s === currentPlayer ? ' ch-p-active' : '') + '" style="background:' + playerColors[s % 6] + '">';
        h += '<div class="ch-pname">' + names[s] + '</div><div class="ch-pscore">' + scores[s] + '</div></div>';
      }
      h += '</div>';
      h += '<div class="ch-timer" id="ch-timer">' + timeLeft + '</div>';
      h += '<div class="ch-turn" style="color:' + playerColors[currentPlayer % 6] + '">' + names[currentPlayer] + "&#39;s turn</div>";
      h += '<div class="ch-round">Round ' + (qi + 1) + ' of ' + questions.length + '</div>';
      h += '<div class="ch-question">' + q.question + '</div>';
      h += '<div class="ch-strikes" id="ch-strikes" role="status" aria-live="polite"></div>';
      h += '<div class="ch-opts">';
      for (var o = 0; o < q.options.length; o++) {
        h += '<button class="ch-opt" data-idx="' + o + '" style="background:' + ['#2563eb', '#059669', '#7c3aed', '#d97706'][o % 4] + '" aria-label="Answer: ' + q.options[o] + '">' + q.options[o] + '</button>';
      }
      h += '</div>';
      h += '<div class="ch-fb" id="ch-fb" role="status" aria-live="polite"></div>';
      h += '<button class="study-btn" id="b-ch-quit" style="margin-top:14px" aria-label="Return to activities">Back to activities</button>';
      h += '</div>';

      document.getElementById('content').innerHTML = h;
      document.getElementById('b-ch-quit').addEventListener('click', function () { clearInterval(timer); showChapterActivities(bookId, chIdx); });

      var timerEl = document.getElementById('ch-timer');
      timer = setInterval(function () {
        timeLeft--;
        if (timerEl) timerEl.textContent = timeLeft;
        if (timeLeft <= 5 && timerEl) timerEl.style.color = '#dc2626';
        if (timeLeft <= 0) {
          clearInterval(timer);
          var nextP = (currentPlayer + 1) % names.length;
          scores[nextP] += 50;
          document.getElementById('ch-fb').innerHTML = '<span class="fb-try">Time up! ' + names[nextP] + ' gets 50 pts</span>';
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
            var all = document.querySelectorAll('.ch-opt');
            for (var x = 0; x < all.length; x++) all[x].disabled = true;
            setTimeout(function () { qi++; currentPlayer = qi % names.length; renderQuestion(); }, 2000);
          } else {
            this.classList.add('cloze-wrong');
            this.disabled = true;
            strikes++;
            document.getElementById('ch-strikes').innerHTML = '\u274C'.repeat(strikes);
            if (strikes >= 3) {
              clearInterval(timer);
              var stealP = (currentPlayer + 1) % names.length;
              currentPlayer = stealP;
              fb.innerHTML = '<span class="fb-try">3 strikes! ' + names[stealP] + ' can steal!</span>';
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
      var xpEarned = recordSession(bookId, chIdx, 'challenge', maxScore, questions.length * 100);

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
      h += '<button class="study-btn sb-pri" id="b-ch-again" aria-label="Rematch">\u{1F504} Rematch</button>';
      h += '<button class="study-btn" id="b-ch-done" aria-label="Return to activities">Back to activities</button>';
      h += '</div></div>';

      document.getElementById('content').innerHTML = h;
      document.getElementById('b-ch-again').addEventListener('click', function () { showChallenge(bookId, chIdx); });
      document.getElementById('b-ch-done').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
    }

    renderQuestion();
  }

  setupScreen();
}

// ---- Read Mode — full chapter text, dyslexic-friendly digital reader ----

function showReadMode(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters[chIdx]) { showNoContent(bookId, chIdx, 'Read'); return; }
  var ch = activeChapters[chIdx];
  var paras = ch.paragraphs || [];
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);

  var h = '<div class="study-view" style="max-width:700px;margin:0 auto">';
  h += '<div class="sv-title" style="border-left-color:' + (book.color || 'var(--vol1)') + '">' + chTitle + '</div>';

  // Read controls
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">';
  h += '<button class="cloze-audio" id="b-read-play" aria-label="Read aloud">\u{1F50A} Read Aloud</button>';
  h += '<button class="study-btn" id="b-read-stop" style="background:#6b7280" aria-label="Stop reading">\u25A0 Stop</button>';
  h += '</div>';

  // Paragraph-by-paragraph display
  for (var i = 0; i < paras.length; i++) {
    h += '<p class="sv-text" style="margin-bottom:14px;padding:12px 16px;background:var(--bg-card);border-radius:10px;box-shadow:var(--shadow);line-height:2.0;font-size:1.05em">' + paras[i] + '</p>';
  }

  // Navigation
  h += '<div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap">';
  if (chIdx > 0) {
    h += '<button class="study-btn" id="b-read-prev" aria-label="Previous chapter">\u25C0 Previous Chapter</button>';
  }
  if (chIdx < activeChapters.length - 1) {
    h += '<button class="study-btn sb-pri" id="b-read-next" aria-label="Next chapter">Next Chapter \u25B6</button>';
  }
  h += '</div>';

  h += '<button class="study-btn" id="b-read-back" style="margin-top:16px" aria-label="Return to activities">Back to activities</button>';
  h += '</div>';

  document.getElementById('content').innerHTML = h;
  document.getElementById('tb').textContent = chTitle;

  document.getElementById('b-read-play').addEventListener('click', function () {
    var fullText = paras.join('. ');
    speakText(fullText);
  });
  document.getElementById('b-read-stop').addEventListener('click', function () { stopSpeech(); });

  var prevBtn = document.getElementById('b-read-prev');
  if (prevBtn) prevBtn.addEventListener('click', function () { showReadMode(bookId, chIdx - 1); });
  var nextBtn = document.getElementById('b-read-next');
  if (nextBtn) nextBtn.addEventListener('click', function () { showReadMode(bookId, chIdx + 1); });
  document.getElementById('b-read-back').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });

  window.scrollTo(0, 0);
}

// ---- Who Said It — match dialogue to speaker ----
function showWhoSaidIt(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters) { showNoContent(bookId, chIdx, 'Who Said It'); return; }
  var ch = activeChapters[chIdx];
  if (!ch) { showNoContent(bookId, chIdx, 'Who Said It'); return; }
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);

  // Prefer current-chapter dialogue; fall back to whole book if too sparse
  var quotes = extractSpeakerQuotes([ch]);
  if (quotes.length < 4) {
    quotes = extractSpeakerQuotes(activeChapters);
  }
  if (quotes.length < 4) {
    showNoContent(bookId, chIdx, 'Who Said It');
    return;
  }

  // Unique speakers for distractors
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
    // Build 4 options: correct speaker + 3 distractors
    var distractors = shuffle(speakerPool.filter(function (s) { return s !== q.speaker; })).slice(0, 3);
    while (distractors.length < 3) distractors.push('\u2014');
    var opts = shuffle([q.speaker].concat(distractors));
    var correctIdx = opts.indexOf(q.speaker);

    var h = '<div class="mc-view">';
    h += '<div class="whosaidit-banner">\u{1F4AC} Who Said It</div>';
    h += '<div class="mc-ref">' + chTitle + '</div>';
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
    h += '<button class="study-btn" id="b-ws-quit" style="margin-top:18px" aria-label="Return to activities">Back to activities</button>';
    h += '</div>';

    document.getElementById('content').innerHTML = h;
    document.getElementById('b-ws-quit').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
    document.getElementById('b-ws-hear').addEventListener('click', function () { speakText(q.quote); });
    wireHintLadder('b-ws-hint', 'ws-hint-display', q.speaker, q.quote, function (n) { hintsUsed = n; });
    var btns = document.querySelectorAll('.mc-opt');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-idx'));
        var fb = document.getElementById('ws-fb');
        if (idx === correctIdx) {
          this.classList.add('mc-correct');
          fb.innerHTML = '<span class="fb-correct">\u2714 Correct!</span>' +
            '<div class="cloze-source">\u201C' + q.quote + '\u201D \u2014 ' + q.speaker + '</div>';
          if (firstAttempt) { score++; points += hintMultiplier(hintsUsed); }
          recordQuestionResult(bookId, chIdx, 'whosaidit', qi, firstAttempt);
          var all = document.querySelectorAll('.mc-opt');
          for (var x = 0; x < all.length; x++) all[x].disabled = true;
          setTimeout(function () { qi++; renderQ(); }, 2200);
        } else {
          if (firstAttempt) {
            pushToRemixQueue({
              bookId: bookId, chIdx: chIdx, missedInMode: 'whosaidit',
              qIndex: qi, ref: '', question: 'Who said: "' + q.quote + '"?',
              options: opts.slice(), correct: correctIdx,
              source: q.quote, answer: q.speaker
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
    var xpEarned = recordSession(bookId, chIdx, 'whosaidit', points, questions.length);
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
    document.getElementById('b-ws-retry').addEventListener('click', function () { showWhoSaidIt(bookId, chIdx); });
    document.getElementById('b-ws-back').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
  }

  renderQ();
}

// ---- True or False with Why ----
function showTrueFalse(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters) { showNoContent(bookId, chIdx, 'True or False'); return; }
  var ch = activeChapters[chIdx];
  if (!ch) { showNoContent(bookId, chIdx, 'True or False'); return; }
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);

  var questions = generateTrueFalseQuestions(ch.paragraphs || [], book.keyTerms || [], 12);
  if (questions.length < 3) { showNoContent(bookId, chIdx, 'True or False'); return; }

  var qi = 0, score = 0, points = 0, firstAttempt = true;

  function renderQ() {
    if (qi >= questions.length) { showResults(); return; }
    var q = questions[qi];
    firstAttempt = true;

    var h = '<div class="mc-view">';
    h += '<div class="tf-banner">\u2696\uFE0F True or False with Why \u2014 ' + (qi + 1) + ' of ' + questions.length + '</div>';
    h += '<div class="mc-ref">' + chTitle + '</div>';
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
    document.getElementById('b-tf-quit').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
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
          recordQuestionResult(bookId, chIdx, 'truefalse', qi, firstAttempt);
          var all = document.querySelectorAll('.tf-opt');
          for (var x = 0; x < all.length; x++) all[x].disabled = true;
          setTimeout(function () { qi++; renderQ(); }, 3600);
        } else {
          if (firstAttempt) {
            pushToRemixQueue({
              bookId: bookId, chIdx: chIdx, missedInMode: 'truefalse',
              qIndex: qi, ref: '', question: 'True or False: ' + q.statement,
              options: ['True', 'False'], correct: q.answer ? 0 : 1,
              source: q.source, answer: q.answer ? 'True' : 'False'
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
    var xpEarned = recordSession(bookId, chIdx, 'truefalse', points, questions.length);
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
    document.getElementById('b-tf-retry').addEventListener('click', function () { showTrueFalse(bookId, chIdx); });
    document.getElementById('b-tf-back').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
  }

  renderQ();
}

// ---- Story Sequence — reorder scrambled chapter events ----
function showStorySequence(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters) { showNoContent(bookId, chIdx, 'Story Sequence'); return; }
  var ch = activeChapters[chIdx];
  if (!ch) { showNoContent(bookId, chIdx, 'Story Sequence'); return; }
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);

  var events = generateStorySequence(ch.paragraphs || [], 6);
  if (events.length < 3) { showNoContent(bookId, chIdx, 'Story Sequence'); return; }

  // Shuffle for display; the user will tap in intended order
  var shuffled = shuffle(events.slice());
  var picked = []; // array of event.order values in user's chosen order
  var attempts = 0;
  var score = 0, points = 0;
  var finished = false;

  function render() {
    var h = '<div class="cloze-view">';
    h += '<div class="seq-banner">\u{1F501} Story Sequence \u2014 tap events in the order they happen</div>';
    h += '<div class="cloze-ref">' + chTitle + '</div>';
    // Picked slots
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
    // Pool
    h += '<div class="seq-pool-label">Available events:</div>';
    h += '<div class="seq-pool">';
    for (var p = 0; p < shuffled.length; p++) {
      var isPicked = picked.indexOf(shuffled[p].order) !== -1;
      if (isPicked) continue;
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

    document.getElementById('b-seq-quit').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });

    var poolBtns = document.querySelectorAll('.seq-pool-item');
    for (var pb = 0; pb < poolBtns.length; pb++) {
      poolBtns[pb].addEventListener('click', function () {
        var ord = parseInt(this.getAttribute('data-order'));
        picked.push(ord);
        render();
      });
    }
    var removeBtns = document.querySelectorAll('.seq-remove');
    for (var rb = 0; rb < removeBtns.length; rb++) {
      removeBtns[rb].addEventListener('click', function (e) {
        e.stopPropagation();
        var slot = parseInt(this.getAttribute('data-slot'));
        picked.splice(slot, 1);
        render();
      });
    }
    var checkBtn = document.getElementById('b-seq-check');
    if (checkBtn) {
      checkBtn.addEventListener('click', function () {
        attempts++;
        var correct = 0;
        for (var i = 0; i < picked.length; i++) {
          if (picked[i] === i) correct++;
        }
        var fb = document.getElementById('seq-fb');
        if (correct === events.length) {
          finished = true;
          score = 1;
          points = attempts === 1 ? 1.0 : attempts === 2 ? 0.7 : 0.4;
          var xpEarned = recordSession(bookId, chIdx, 'sequence', points, 1);
          fb.innerHTML = '<div class="fb-correct">\u{1F389} Perfect order! (+' + Math.round(points * 10) + ' XP)</div>';
          setTimeout(function () { showChapterActivities(bookId, chIdx); }, 2800);
        } else {
          if (attempts === 1) {
            pushToRemixQueue({
              bookId: bookId, chIdx: chIdx, missedInMode: 'sequence',
              qIndex: 0, ref: '', question: 'Put these ' + events.length + ' events in order',
              options: events.map(function (e) { return e.text; }), correct: 0,
              source: '', answer: events[0].text
            });
          }
          fb.innerHTML = '<div class="fb-try">' + correct + ' of ' + events.length + ' in the right spot. Move the wrong ones and check again.</div>';
        }
      });
    }
  }

  render();
}

// ---- Cause and Effect Match ----
function showCauseEffect(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters) { showNoContent(bookId, chIdx, 'Cause and Effect'); return; }
  var ch = activeChapters[chIdx];
  if (!ch) { showNoContent(bookId, chIdx, 'Cause and Effect'); return; }
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);

  // Prefer current chapter; fall back to whole book if sparse
  var pairs = extractCauseEffectPairs(ch.paragraphs || []);
  if (pairs.length < 3) {
    var all = [];
    for (var ci = 0; ci < activeChapters.length; ci++) {
      all = all.concat(activeChapters[ci].paragraphs || []);
    }
    pairs = extractCauseEffectPairs(all);
  }
  if (pairs.length < 3) { showNoContent(bookId, chIdx, 'Cause and Effect'); return; }
  pairs = shuffle(pairs.slice()).slice(0, 5);
  // Independent shuffle of the effect column so the match is not trivial
  var effectOrder = shuffle(pairs.map(function (_, i) { return i; }));

  var selectedCause = null;
  var matched = 0;
  var attempts = 0;

  function render() {
    var h = '<div class="cloze-view">';
    h += '<div class="ce-banner">\u21AA Cause and Effect \u2014 tap a cause, then tap its effect</div>';
    h += '<div class="cloze-ref">' + chTitle + '</div>';
    h += '<div class="ce-grid">';
    h += '<div class="ce-col"><div class="ce-col-label">Causes</div>';
    // Cause items (stable order: original pair index)
    for (var i = 0; i < pairs.length; i++) {
      var matchedClass = pairs[i].solved ? ' ce-solved' : '';
      var selectedClass = (selectedCause === i && !pairs[i].solved) ? ' ce-selected' : '';
      h += '<button class="ce-item ce-cause' + matchedClass + selectedClass + '" data-cause="' + i + '"' + (pairs[i].solved ? ' disabled' : '') + '>' + pairs[i].cause + '</button>';
    }
    h += '</div>';
    // Effect items (independently shuffled via effectOrder)
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

    document.getElementById('b-ce-quit').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });

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
          if (matched === pairs.length) {
            setTimeout(showResults, 1200);
          } else {
            render();
          }
        } else {
          if (attempts <= 1) {
            pushToRemixQueue({
              bookId: bookId, chIdx: chIdx, missedInMode: 'causeeffect',
              qIndex: selectedCause, ref: '',
              question: 'Match cause to effect: ' + pairs[selectedCause].cause,
              options: pairs.map(function (p) { return p.effect; }),
              correct: selectedCause,
              source: pairs[selectedCause].source,
              answer: pairs[selectedCause].effect
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
    var pct = matched / pairs.length;
    var points = attempts <= pairs.length ? pairs.length : Math.max(1, pairs.length * 2 - attempts);
    var xpEarned = recordSession(bookId, chIdx, 'causeeffect', points, pairs.length);
    var h = '<div class="cloze-results">';
    h += '<div class="cr-emoji">\u21AA</div>';
    h += '<div class="cr-score">' + matched + ' / ' + pairs.length + ' matched</div>';
    h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
    h += '<div class="cr-msg">' + (attempts <= pairs.length ? 'Clean sweep!' : 'All matched \u2014 took ' + attempts + ' tries.') + '</div>';
    h += '<button class="study-btn sb-pri" id="b-ce-retry">\u{1F504} Try Again</button>';
    h += '<button class="study-btn" id="b-ce-back">Back to activities</button>';
    h += '</div>';
    document.getElementById('content').innerHTML = h;
    document.getElementById('b-ce-retry').addEventListener('click', function () { showCauseEffect(bookId, chIdx); });
    document.getElementById('b-ce-back').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
  }

  render();
}

// ---- Dictation Challenge ----
function showDictation(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters) { showNoContent(bookId, chIdx, 'Dictation'); return; }
  var ch = activeChapters[chIdx];
  if (!ch) { showNoContent(bookId, chIdx, 'Dictation'); return; }
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);

  var sentences = pickDictationSentences(ch.paragraphs || [], 8);
  if (sentences.length < 3) { showNoContent(bookId, chIdx, 'Dictation'); return; }

  var qi = 0, totalPoints = 0, plays = 0;

  function renderQ() {
    if (qi >= sentences.length) { showResults(); return; }
    var target = sentences[qi];
    plays = 0;

    var h = '<div class="cloze-view">';
    h += '<div class="dict-banner">\u{1F3A7} Dictation \u2014 listen, then type what you heard</div>';
    h += '<div class="cloze-ref">' + chTitle + '</div>';
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

    // Auto-play on render for a beat
    setTimeout(function () { speakText(target); plays++; }, 350);

    document.getElementById('b-dict-play').addEventListener('click', function () {
      speakText(target); plays++;
    });
    document.getElementById('b-dict-quit').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
    document.getElementById('b-dict-skip').addEventListener('click', function () {
      qi++; renderQ();
    });

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
          bookId: bookId, chIdx: chIdx, missedInMode: 'dictation',
          qIndex: qi, ref: '', question: 'Dictate: "' + target + '"',
          options: [], correct: 0, source: target, answer: target
        });
      }
      document.getElementById('b-dict-check').disabled = true;
      document.getElementById('b-dict-skip').disabled = true;
      document.getElementById('b-dict-next').addEventListener('click', function () {
        qi++; renderQ();
      });
    });
  }

  function showResults() {
    var pct = Math.round((totalPoints / sentences.length) * 100);
    var xpEarned = recordSession(bookId, chIdx, 'dictation', totalPoints, sentences.length);
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
    document.getElementById('b-dict-retry').addEventListener('click', function () { showDictation(bookId, chIdx); });
    document.getElementById('b-dict-back').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
  }

  renderQ();
}

// ---- Word Morph — which spelling is real? ----
function showWordMorph(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters) { showNoContent(bookId, chIdx, 'Word Morph'); return; }
  var ch = activeChapters[chIdx];
  if (!ch) { showNoContent(bookId, chIdx, 'Word Morph'); return; }
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);
  var keyTerms = book.keyTerms || [];
  // Prefer key terms that are long enough to generate good variants
  var usable = keyTerms.filter(function (kt) { return kt.term && kt.term.length >= 5; });
  if (usable.length < 3) { showNoContent(bookId, chIdx, 'Word Morph'); return; }
  var rounds = shuffle(usable.slice()).slice(0, 8);

  var qi = 0, score = 0, points = 0;

  function renderQ() {
    if (qi >= rounds.length) { showResults(); return; }
    var kt = rounds[qi];
    var variants = wordMorphVariants(kt.term);
    if (variants.length < 2) { qi++; renderQ(); return; }
    var opts = shuffle([kt.term].concat(variants.slice(0, 3)));
    var correctIdx = opts.indexOf(kt.term);
    var context = findContextSentence(kt.term, activeChapters, chIdx);
    var morphColors = ['#4338ca', '#0891b2', '#be185d', '#ea580c'];

    var h = '<div class="mc-view">';
    h += '<div class="morph-banner">\u{1F500} Word Morph \u2014 which spelling is real?</div>';
    h += '<div class="cloze-ref">' + chTitle + '</div>';
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

    document.getElementById('b-morph-quit').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
    var firstAttempt = true;
    var btns = document.querySelectorAll('.morph-opt');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-idx'));
        var fb = document.getElementById('morph-fb');
        if (idx === correctIdx) {
          this.classList.add('mc-correct');
          var contextBlock = context ? '<div class="morph-context">"' + context + '"</div>' : '';
          fb.innerHTML = '<div class="fb-correct">\u2714 ' + kt.term + ' is the correct spelling.</div>' + contextBlock;
          if (firstAttempt) { score++; points += 1.0; }
          var all = document.querySelectorAll('.morph-opt');
          for (var x = 0; x < all.length; x++) all[x].disabled = true;
          setTimeout(function () { qi++; renderQ(); }, 2400);
        } else {
          if (firstAttempt) {
            pushToRemixQueue({
              bookId: bookId, chIdx: chIdx, missedInMode: 'morph',
              qIndex: qi, ref: '', question: 'Which is the real spelling?',
              options: opts.slice(), correct: correctIdx,
              source: context || '', answer: kt.term
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
    var xpEarned = recordSession(bookId, chIdx, 'morph', points, rounds.length);
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
    document.getElementById('b-morph-retry').addEventListener('click', function () { showWordMorph(bookId, chIdx); });
    document.getElementById('b-morph-back').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
  }

  renderQ();
}

// ---- Syllable Tap — how many syllables? ----
function showSyllableTap(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters) { showNoContent(bookId, chIdx, 'Syllable Tap'); return; }
  var ch = activeChapters[chIdx];
  if (!ch) { showNoContent(bookId, chIdx, 'Syllable Tap'); return; }
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);
  var keyTerms = (book.keyTerms || []).filter(function (t) { return t.term && t.term.length >= 5 && countSyllables(t.term) >= 2; });
  if (keyTerms.length < 3) { showNoContent(bookId, chIdx, 'Syllable Tap'); return; }
  var rounds = shuffle(keyTerms.slice()).slice(0, 8);

  var qi = 0, score = 0, points = 0;

  function renderQ() {
    if (qi >= rounds.length) { showResults(); return; }
    var kt = rounds[qi];
    var correctCount = countSyllables(kt.term);
    // Build 4 unique count options around the true answer
    var candidates = [correctCount - 2, correctCount - 1, correctCount, correctCount + 1, correctCount + 2]
      .filter(function (n) { return n >= 1 && n <= 8; });
    var opts = shuffle(candidates.slice()).slice(0, 4);
    if (opts.indexOf(correctCount) === -1) opts[0] = correctCount;
    opts = shuffle(opts);
    var correctIdx = opts.indexOf(correctCount);
    var firstAttempt = true;

    var h = '<div class="mc-view">';
    h += '<div class="syll-banner">\u{1F441}\uFE0F\u200D\u{1F5E8}\uFE0F Syllable Tap \u2014 how many syllables?</div>';
    h += '<div class="cloze-ref">' + chTitle + '</div>';
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

    document.getElementById('b-syll-quit').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
    document.getElementById('b-syll-hear').addEventListener('click', function () { speakText(kt.term); });

    var btns = document.querySelectorAll('.syll-opt');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-idx'));
        var fb = document.getElementById('syll-fb');
        if (idx === correctIdx) {
          this.classList.add('mc-correct');
          var parts = splitSyllables(kt.term);
          var colors = ['#2563eb', '#059669', '#7c3aed', '#d97706', '#dc2626'];
          var coloredHtml = parts.map(function (p, i) {
            return '<span style="color:' + colors[i % colors.length] + ';font-weight:800">' + p + '</span>';
          }).join('<span class="syll-sep">·</span>');
          fb.innerHTML = '<div class="fb-correct">\u2714 ' + correctCount + ' syllable' + (correctCount === 1 ? '' : 's') + '</div>' +
            '<div class="syll-reveal">' + coloredHtml + '</div>';
          if (firstAttempt) { score++; points += 1.0; }
          var all = document.querySelectorAll('.syll-opt');
          for (var x = 0; x < all.length; x++) all[x].disabled = true;
          setTimeout(function () { qi++; renderQ(); }, 2400);
        } else {
          if (firstAttempt) {
            pushToRemixQueue({
              bookId: bookId, chIdx: chIdx, missedInMode: 'syllable',
              qIndex: qi, ref: '',
              question: 'How many syllables in "' + kt.term + '"?',
              options: opts.map(String), correct: correctIdx,
              source: '', answer: String(correctCount)
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
    var xpEarned = recordSession(bookId, chIdx, 'syllable', points, rounds.length);
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
    document.getElementById('b-syll-retry').addEventListener('click', function () { showSyllableTap(bookId, chIdx); });
    document.getElementById('b-syll-back').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
  }

  renderQ();
}

// ---- Rhyme Chain — which word rhymes? ----
function showRhymeChain(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters) { showNoContent(bookId, chIdx, 'Rhyme Chain'); return; }
  var ch = activeChapters[chIdx];
  if (!ch) { showNoContent(bookId, chIdx, 'Rhyme Chain'); return; }
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);

  var groups = buildRhymeGroups(ch.paragraphs || []);
  // Keep only groups with 2+ members (seed word + at least one rhymer)
  var usableKeys = [];
  var keys = Object.keys(groups);
  for (var i = 0; i < keys.length; i++) {
    if (groups[keys[i]].length >= 2) usableKeys.push(keys[i]);
  }
  if (usableKeys.length < 3) { showNoContent(bookId, chIdx, 'Rhyme Chain'); return; }

  // Flat word pool from all groups (for distractor selection)
  var allWords = [];
  for (var k = 0; k < keys.length; k++) {
    for (var w = 0; w < groups[keys[k]].length; w++) allWords.push({ word: groups[keys[k]][w], key: keys[k] });
  }

  usableKeys = shuffle(usableKeys.slice()).slice(0, 8);
  var qi = 0, score = 0, points = 0;

  function renderQ() {
    if (qi >= usableKeys.length) { showResults(); return; }
    var key = usableKeys[qi];
    var members = groups[key].slice();
    var seed = shuffle(members)[0];
    var rhymer = shuffle(members.filter(function (w) { return w !== seed; }))[0];
    if (!rhymer) { qi++; renderQ(); return; }
    // 3 distractors from OTHER rhyme groups
    var nonRhymers = allWords.filter(function (x) { return x.key !== key; });
    var distractors = shuffle(nonRhymers).slice(0, 3).map(function (x) { return x.word; });
    while (distractors.length < 3) distractors.push('\u2014');
    var opts = shuffle([rhymer].concat(distractors));
    var correctIdx = opts.indexOf(rhymer);
    var firstAttempt = true;
    var rhymeColors = ['#0891b2', '#059669', '#7c3aed', '#d97706'];

    var h = '<div class="mc-view">';
    h += '<div class="rhyme-banner">\u{1F3B6} Rhyme Chain \u2014 which word rhymes?</div>';
    h += '<div class="cloze-ref">' + chTitle + '</div>';
    h += '<div class="dict-progress">' + (qi + 1) + ' of ' + usableKeys.length + '</div>';
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

    document.getElementById('b-rhy-quit').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
    document.getElementById('b-rhy-hear').addEventListener('click', function () { speakText(seed); });

    var btns = document.querySelectorAll('.rhyme-opt');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-idx'));
        var fb = document.getElementById('rhy-fb');
        if (idx === correctIdx) {
          this.classList.add('mc-correct');
          fb.innerHTML = '<div class="fb-correct">\u2714 ' + seed + ' and ' + rhymer + ' rhyme. (\u2026' + key + ')</div>';
          if (firstAttempt) { score++; points += 1.0; }
          var all = document.querySelectorAll('.rhyme-opt');
          for (var x = 0; x < all.length; x++) all[x].disabled = true;
          setTimeout(function () { qi++; renderQ(); }, 2200);
        } else {
          if (firstAttempt) {
            pushToRemixQueue({
              bookId: bookId, chIdx: chIdx, missedInMode: 'rhyme',
              qIndex: qi, ref: '',
              question: 'Which word rhymes with "' + seed + '"?',
              options: opts.slice(), correct: correctIdx,
              source: '', answer: rhymer
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
    var pct = Math.round(score / usableKeys.length * 100);
    var xpEarned = recordSession(bookId, chIdx, 'rhyme', points, usableKeys.length);
    var emoji = pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F31F}' : '\u{1F4AA}';
    var msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good work!' : 'Say them aloud.';
    var h = '<div class="cloze-results">';
    h += '<div class="cr-emoji">' + emoji + '</div>';
    h += '<div class="cr-score">' + score + ' / ' + usableKeys.length + '</div>';
    h += '<div class="cr-pct">' + pct + '%</div>';
    h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
    h += '<div class="cr-msg">' + msg + '</div>';
    h += '<button class="study-btn sb-pri" id="b-rhy-retry">\u{1F504} Try Again</button>';
    h += '<button class="study-btn" id="b-rhy-back">Back to activities</button>';
    h += '</div>';
    document.getElementById('content').innerHTML = h;
    document.getElementById('b-rhy-retry').addEventListener('click', function () { showRhymeChain(bookId, chIdx); });
    document.getElementById('b-rhy-back').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
  }

  renderQ();
}

// ---- Mind Map Builder — force-directed graph of key-term co-occurrence ----
// Pure SVG + a tiny force simulation. No library; stays under the free
// stack constraint and adds ~0 KB to the cached shell.
function showMindMap(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book || !activeChapters) { showNoContent(bookId, chIdx, 'Mind Map'); return; }
  var ch = activeChapters[chIdx];
  if (!ch) { showNoContent(bookId, chIdx, 'Mind Map'); return; }
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);
  var paras = ch.paragraphs || [];
  var keyTerms = (book.keyTerms || []).slice(0, 14);
  if (keyTerms.length < 4) { showNoContent(bookId, chIdx, 'Mind Map'); return; }

  // Build co-occurrence edges: two terms share an edge if they appear
  // together in any paragraph. Edge weight = number of shared paragraphs.
  var nodes = keyTerms.map(function (t, i) {
    return { id: i, label: t.term, count: t.frequency || 1, selected: false };
  });
  var edges = [];
  var edgeMap = {};
  for (var p = 0; p < paras.length; p++) {
    var lower = paras[p].toLowerCase();
    var present = [];
    for (var n = 0; n < nodes.length; n++) {
      var re = new RegExp('\\b' + nodes[n].label.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
      if (re.test(lower)) present.push(n);
    }
    for (var a = 0; a < present.length; a++) {
      for (var b = a + 1; b < present.length; b++) {
        var key = present[a] + ',' + present[b];
        if (!edgeMap[key]) { edgeMap[key] = { source: present[a], target: present[b], weight: 0 }; edges.push(edgeMap[key]); }
        edgeMap[key].weight++;
      }
    }
  }
  // Drop nodes that have no edges at all (visually isolated)
  var connected = {};
  edges.forEach(function (e) { connected[e.source] = true; connected[e.target] = true; });
  nodes = nodes.filter(function (n) { return connected[n.id]; });
  if (nodes.length < 3) { showNoContent(bookId, chIdx, 'Mind Map'); return; }
  // Remap IDs since we filtered
  var idRemap = {};
  nodes.forEach(function (n, i) { idRemap[n.id] = i; n.id = i; });
  edges = edges.map(function (e) { return { source: idRemap[e.source], target: idRemap[e.target], weight: e.weight }; }).filter(function (e) { return e.source !== undefined && e.target !== undefined; });

  var W = 640, H = 460;
  // Initial positions — place on a circle so the simulation starts clean
  nodes.forEach(function (n, i) {
    var angle = (i / nodes.length) * Math.PI * 2;
    n.x = W / 2 + Math.cos(angle) * 140;
    n.y = H / 2 + Math.sin(angle) * 140;
    n.vx = 0; n.vy = 0;
  });

  // Force simulation: spring attraction along edges, Coulomb repulsion
  // between all pairs, weak centering force toward the middle.
  function simulate(iterations) {
    iterations = iterations || 180;
    for (var step = 0; step < iterations; step++) {
      // Repulsion
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var dx = nodes[j].x - nodes[i].x;
          var dy = nodes[j].y - nodes[i].y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          var force = 2200 / (dist * dist);
          var fx = (dx / dist) * force;
          var fy = (dy / dist) * force;
          nodes[i].vx -= fx; nodes[i].vy -= fy;
          nodes[j].vx += fx; nodes[j].vy += fy;
        }
      }
      // Spring attraction along edges
      for (var e = 0; e < edges.length; e++) {
        var s = nodes[edges[e].source], t = nodes[edges[e].target];
        var dx2 = t.x - s.x, dy2 = t.y - s.y;
        var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 0.01;
        var springK = 0.02 * Math.min(3, edges[e].weight);
        var fx2 = dx2 * springK, fy2 = dy2 * springK;
        s.vx += fx2; s.vy += fy2;
        t.vx -= fx2; t.vy -= fy2;
      }
      // Centering + damping + integrate
      for (var k = 0; k < nodes.length; k++) {
        var n = nodes[k];
        n.vx += (W / 2 - n.x) * 0.003;
        n.vy += (H / 2 - n.y) * 0.003;
        n.vx *= 0.82; n.vy *= 0.82;
        n.x += n.vx; n.y += n.vy;
        // Clamp inside bounds
        var pad = 40;
        if (n.x < pad) n.x = pad; if (n.x > W - pad) n.x = W - pad;
        if (n.y < pad) n.y = pad; if (n.y > H - pad) n.y = H - pad;
      }
    }
  }
  simulate(200);

  var selectedNodeId = -1;

  function render() {
    var h = '<div class="cloze-view">';
    h += '<div class="mind-banner">\u{1F9E0} Mind Map \u2014 tap a term to see its context</div>';
    h += '<div class="cloze-ref">' + chTitle + '</div>';
    h += '<div class="mind-wrap">';
    h += '<svg viewBox="0 0 ' + W + ' ' + H + '" class="mind-svg" role="img" aria-label="Concept mind map">';
    // Edges first
    for (var e = 0; e < edges.length; e++) {
      var s = nodes[edges[e].source], t = nodes[edges[e].target];
      var op = Math.min(0.6, 0.15 + edges[e].weight * 0.12);
      var sw = Math.min(4, 1 + edges[e].weight * 0.4);
      h += '<line x1="' + s.x.toFixed(1) + '" y1="' + s.y.toFixed(1) + '" x2="' + t.x.toFixed(1) + '" y2="' + t.y.toFixed(1) + '" stroke="#7c3aed" stroke-opacity="' + op.toFixed(2) + '" stroke-width="' + sw.toFixed(1) + '" />';
    }
    // Nodes + labels
    var colors = ['#2563eb', '#059669', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#be185d', '#ca8a04'];
    for (var n = 0; n < nodes.length; n++) {
      var nn = nodes[n];
      var r = 10 + Math.min(18, Math.sqrt(nn.count));
      var color = colors[n % colors.length];
      var sel = (selectedNodeId === n) ? ' class="mind-node-selected"' : '';
      h += '<g data-node="' + n + '" class="mind-node"' + sel + ' role="button" tabindex="0" aria-label="' + nn.label + '">';
      h += '<circle cx="' + nn.x.toFixed(1) + '" cy="' + nn.y.toFixed(1) + '" r="' + r + '" fill="' + color + '" stroke="#fff" stroke-width="2" />';
      h += '<text x="' + nn.x.toFixed(1) + '" y="' + (nn.y + r + 14).toFixed(1) + '" text-anchor="middle" class="mind-label">' + nn.label + '</text>';
      h += '</g>';
    }
    h += '</svg>';
    h += '</div>';
    // Detail panel for selected node
    if (selectedNodeId >= 0) {
      var sel2 = nodes[selectedNodeId];
      var kt = keyTerms.find(function (k) { return k.term === sel2.label; });
      var context = findContextSentence(sel2.label, activeChapters, chIdx);
      h += '<div class="mind-detail">';
      h += '<div class="mind-detail-term">' + sel2.label + '</div>';
      if (kt) h += '<div class="mind-detail-meta">Appears ' + (kt.frequency || '?') + ' times \u00B7 ' + (kt.spread || 0) + '% of chapters</div>';
      if (context) h += '<div class="mind-detail-ctx">"' + context + '"</div>';
      // Connected terms
      var conn = [];
      edges.forEach(function (ed) {
        if (ed.source === selectedNodeId) conn.push(nodes[ed.target].label);
        else if (ed.target === selectedNodeId) conn.push(nodes[ed.source].label);
      });
      if (conn.length) h += '<div class="mind-detail-conn"><strong>Connected to:</strong> ' + conn.join(', ') + '</div>';
      h += '</div>';
    }
    h += '<button class="study-btn" id="b-mind-quit" style="margin-top:14px">Back to activities</button>';
    h += '</div>';
    document.getElementById('content').innerHTML = h;
    document.getElementById('b-mind-quit').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
    var nodeEls = document.querySelectorAll('.mind-node');
    for (var ni = 0; ni < nodeEls.length; ni++) {
      nodeEls[ni].addEventListener('click', function () {
        selectedNodeId = parseInt(this.getAttribute('data-node'));
        render();
      });
    }
  }
  render();
  // Award a small XP just for engaging with the map (this is a view, not a quiz)
  recordSession(bookId, chIdx, 'mindmap', 0.3, 1);
}

// ---- Remix Round — resurface missed questions in a different format ----
function showRemix(bookId, chIdx) {
  var items = getRemixQueue().filter(function (it) {
    return it.bookId === bookId && it.chIdx === chIdx;
  });
  if (items.length === 0) { showChapterActivities(bookId, chIdx); return; }
  items = shuffle(items.slice());
  var qi = 0, score = 0, points = 0, firstAttempt = true, hintsUsed = 0;
  var chapters = activeChapters;
  var ch = chapters && chapters[chIdx];
  var chTitle = (ch && ch.title) || 'Chapter ' + (chIdx + 1);

  function pickRemixMode(item) {
    if (item.missedInMode === 'filblank') return 'mc';
    if (item.missedInMode === 'mc') {
      if (item.options && typeof item.correct === 'number') {
        var ans = item.options[item.correct];
        if (ans && item.source && item.source.toLowerCase().indexOf(ans.toLowerCase()) !== -1) {
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
    var h = '<div class="cloze-view remix-view">';
    h += '<div class="remix-banner">\u{1F504} Remix Round \u2014 ' + (qi + 1) + ' of ' + items.length + '</div>';
    h += '<div class="cloze-ref">' + chTitle + (item.ref ? ' ' + item.ref : '') + '</div>';

    if (mode === 'mc') {
      var answer = item.answer || (item.options && item.options[item.correct]);
      var otherAns = otherAnswerPool().filter(function (a) { return a && a.toLowerCase() !== String(answer).toLowerCase(); });
      var distractors = shuffle(otherAns).slice(0, 3);
      while (distractors.length < 3) distractors.push('\u2014');
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
      document.getElementById('b-rx-quit').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
      document.getElementById('b-rx-hear').addEventListener('click', function () { speakText(question); });
      wireHintLadder('b-rx-hint', 'rx-hint-display', answer, item.source, function (n) { hintsUsed = n; });
      var btns = document.querySelectorAll('.mc-opt');
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
          var idx = parseInt(this.getAttribute('data-idx'));
          var fb = document.getElementById('rx-fb');
          if (idx === correctIdx) {
            this.classList.add('mc-correct');
            fb.innerHTML = '<span class="fb-correct">\u2714 Remixed!</span>' +
              '<div class="cloze-source">' + (item.source || '') + '</div>';
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
      var answer2 = item.options[item.correct];
      var quote = item.source;
      var re = new RegExp('\\b' + String(answer2).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      var prompt = quote.replace(re, '______');
      if (prompt === quote) { prompt = quote + ' \u2014 what word is missing?'; }
      var otherAns2 = otherAnswerPool().filter(function (a) { return a && a.toLowerCase() !== String(answer2).toLowerCase(); });
      var distractors2 = shuffle(otherAns2).slice(0, 3);
      while (distractors2.length < 3) distractors2.push('\u2014');
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
      document.getElementById('b-rx-quit').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
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
    document.getElementById('b-rx-quit').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
    document.getElementById('b-rx-hear').addEventListener('click', function () { speakText(front); });
    document.getElementById('rx-flash').addEventListener('click', function () {
      if (revealed) return;
      revealed = true;
      this.innerHTML = '<strong>' + answer3 + '</strong>' + (item.source ? '<div class="cloze-source">' + item.source + '</div>' : '');
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
    var xpEarned = recordSession(bookId, chIdx, 'remix', points, items.length);
    var remaining = getRemixCount(bookId, chIdx);
    var h = '<div class="cloze-results">';
    h += '<div class="cr-emoji">\u{1F504}</div>';
    h += '<div class="cr-score">' + score + ' / ' + items.length + '</div>';
    h += '<div class="cr-pct">' + pct + '% remixed</div>';
    h += '<div class="cr-xp">+' + xpEarned + ' XP earned</div>';
    if (remaining > 0) {
      h += '<p class="cr-hint">' + remaining + ' still in your remix queue \u2014 try again later.</p>';
    } else {
      h += '<p class="cr-hint">Queue cleared for this chapter. Nice work.</p>';
    }
    h += '<button class="study-btn sb-pri" id="b-rx-again">Back to activities</button>';
    h += '</div>';
    document.getElementById('content').innerHTML = h;
    document.getElementById('b-rx-again').addEventListener('click', function () { showChapterActivities(bookId, chIdx); });
  }

  renderNext();
}

console.log('attain-study.js loaded (all study modes)');
