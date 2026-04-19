// Attain Universal — Study Module
// Study modes added incrementally. This file starts with flashcards only.

// ---- Flashcards with SM-2 Spaced Repetition ----

function buildFlashcardDeck(bookId, chIdx) {
  var book = getBook(bookId);
  if (!book) return [];
  var chapters = activeChapters;
  if (!chapters || !chapters[chIdx]) return [];
  var ch = chapters[chIdx];
  var cards = [];

  // Key term cards
  if (book.keyTerms && book.keyTerms.length) {
    for (var t = 0; t < book.keyTerms.length; t++) {
      var kt = book.keyTerms[t];
      cards.push({
        front: kt.term,
        back: kt.definition || 'Appears ' + kt.frequency + ' times across the book. Found in ' + kt.spread + '% of chapters.',
        type: 'term'
      });
    }
  }

  // Paragraph cards from the current chapter
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

function showFillBlank(bookId, chIdx) {
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

  var qi = 0, score = 0, firstAttempt = true;
  var chTitle = ch.title || 'Chapter ' + (chIdx + 1);

  function renderQ() {
    if (qi >= questions.length) { showFBResults(); return; }
    var q = questions[qi];
    var correct = q.answer;
    firstAttempt = true;

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
    h += '<div class="cloze-prompt">' +
      q.prompt.replace('______', '<span class="cloze-blank">______</span>') + '</div>';
    h += '<button class="cloze-audio" id="b-cloze-hear" aria-label="Listen to this passage">\u{1F50A} Listen</button>';
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
    var btns = document.querySelectorAll('.cloze-opt');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('click', function () {
        var val = this.getAttribute('data-val');
        var fb = document.getElementById('cloze-fb');
        if (val.toLowerCase() === correct.toLowerCase()) {
          this.classList.add('cloze-correct');
          fb.innerHTML = '<span class="fb-correct">\u2714 Correct!</span>' +
            '<div class="cloze-source">' + (q.source || '') + '</div>';
          if (firstAttempt) score++;
          recordQuestionResult(bookId, chIdx, 'filblank', qi, firstAttempt);
          var all = document.querySelectorAll('.cloze-opt');
          for (var x = 0; x < all.length; x++) all[x].disabled = true;
          setTimeout(function () { qi++; renderQ(); }, 2200);
        } else {
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
    var xpEarned = recordSession(bookId, chIdx, 'filblank', score, questions.length);
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

  var qi = 0, score = 0, mcFirstAttempt = true;
  var mcColors = ['#dc2626', '#2563eb', '#059669', '#d97706'];

  function renderQ() {
    if (qi >= questions.length) { showMCResults(); return; }
    var q = questions[qi];
    mcFirstAttempt = true;

    var tierNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
    var tierColors = { easy: '#059669', medium: '#d97706', hard: '#dc2626' };

    var h = '<div class="mc-view">';
    h += '<div class="mc-progress">' + (qi + 1) + ' of ' + questions.length +
      ' <span style="color:' + (tierColors[tier] || '#059669') + ';font-size:.85em">\u25CF ' + (tierNames[tier] || 'Easy') + '</span></div>';
    h += '<div class="mc-ref">' + chTitle + '</div>';
    h += '<div class="mc-question">' + q.question + '</div>';
    h += '<button class="cloze-audio" id="b-mc-hear" aria-label="Listen to question">\u{1F50A} Listen</button>';
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
    var btns = document.querySelectorAll('.mc-opt');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-idx'));
        var fb = document.getElementById('mc-fb');
        if (idx === q.correct) {
          this.classList.add('mc-correct');
          fb.innerHTML = '<span class="fb-correct">\u2714 Correct!</span>' +
            '<div class="cloze-source">' + (q.source || '') + '</div>';
          if (mcFirstAttempt) score++;
          recordQuestionResult(bookId, chIdx, 'mc', qi, mcFirstAttempt);
          var all = document.querySelectorAll('.mc-opt');
          for (var x = 0; x < all.length; x++) all[x].disabled = true;
          setTimeout(function () { qi++; renderQ(); }, 2200);
        } else {
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
    var xpEarned = recordSession(bookId, chIdx, 'mc', score, questions.length);
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

console.log('attain-study.js loaded (all study modes)');
