# ACR Study App — Complete Build Plan & Status
# Locked in: 2026-04-16 (updated 2026-04-18)
# Tags: study-9-cards-working, study-13-of-18-content, study-all-features
# Repo: https://github.com/dssorit/ancient-covenant-scrolls
# Live: https://dssorit.github.io/ancient-covenant-scrolls/study/

---

## COMPLETED — What's Live Right Now

### Core Study App (9 of 9 Activity Cards Working)
- [x] 📖 Chapter Summary — plain + scholarly summary toggle, key terms, FAQ, practice stubs
- [x] 🧩 Fill in the Blank — cloze deletion with 4 colored tap options, audio, animated feedback
- [x] ✏️ Multiple Choice — 4 color-coded stacked answer buttons, animated feedback, audio
- [x] 🃏 Flashcards — front/back flip, confidence rating 1-5 (Blank/Hard/Okay/Good/Easy)
- [x] 📚 Key Terms — 10 terms with phonetic pronunciation and definitions
- [x] ❓ FAQ — 6 verified entries about the ACR's approach
- [x] 🧠 Memory Match — 3-column flip-to-match pairs game, bold colors, audio on flip
- [x] 🔊 Listen & Learn — verse-by-verse read-along with auto-advance, play/pause/stop/prev/next
- [x] 🏆 Progress — XP, streak, level system, stats dashboard, recent sessions, level roadmap

### XP & Level System
- [x] 🔍 Seeker (0 XP) → 📜 Scholar (100 XP) → 🧙 Sage (500 XP) → 🏆 Keeper of the Scroll (1500 XP)
- [x] 10 XP per correct quiz answer
- [x] Daily streak with best-streak tracking
- [x] Session history (last 100 sessions stored)
- [x] XP + level shown on quiz results screens

### Visual Design (Dyslexia-Optimized)
- [x] Atkinson Hyperlegible as default font (Google Fonts, free)
- [x] OpenDyslexic as toggle option (floating Aa/Dy button, persisted)
- [x] 14pt base font size, 1.7x line height (2.0x in dyslexic mode)
- [x] Left-aligned text everywhere, no justified, no italics
- [x] Warm off-white background (#faf6f0) instead of pure white
- [x] Letter spacing + word spacing increased in dyslexic mode
- [x] All tap targets minimum 44px (most are 52px+)
- [x] Card-based layouts with rounded corners (12-20px) and shadows

### Color System
- [x] 8 volume colors: Bereshit=blue, Shemot=red, Vayikra=green, Bamidbar=amber, Devarim=purple, Chanokh=teal, Yovelim=coral, War Scroll=gold
- [x] Sidebar volume headers color-coded
- [x] Activity cards are solid vivid color blocks (140px+ tall)
- [x] Quiz option buttons are distinct colors
- [x] Memory Match tiles color-coded per pair

### Audio
- [x] speakText() helper with prepTTS pronunciation for all Hebrew names
- [x] Enhanced/Siri voice selection (getBestVoice priority: saved > Enhanced > Siri > first)
- [x] Voice selector dropdown populated with all available voices (Enhanced marked ★)
- [x] 🔊 Listen button on every quiz question
- [x] Audio on Memory Match tile flips
- [x] Listen & Learn full chapter read-along

### Pronunciation Replacements (prepTTS)
- [x] YHWH / 𐤉𐤄𐤅𐤄 → Yahweh
- [x] YH → Yah
- [x] Mosheh → Mo-sheh
- [x] Yehoshua → Yeh-ho-shua
- [x] Chanokh → Hha-nokh
- [x] Qumran → Koom-rahn
- [x] Orit → Oh-reet
- [x] Ge'ez → Geh-ez
- [x] DSS → Dead Sea Scrolls
- [x] Bereshit → Beh-reh-sheet
- [x] Qayin → Kah-yin
- [x] Hevel → Heh-vel
- [x] Noakh → No-akh
- [x] Chavah → Khah-vah
- [x] Metushelakh → Meh-too-sheh-lakh
- [x] Bavel → Bah-vel
- [x] Elohim → Eh-lo-heem
- [x] Nephilim → Neh-fi-leem
- [x] + 20 more names (Avram, Yitzkhak, Yaakov, Yosef, etc.)
- [x] All Paleo-Hebrew characters silently stripped
- [x] [DSS] → Dead Sea Scrolls note:
- [x] [ORIT GE'EZ] → Oh-reet Geh-ez note:
- [x] [MASORETIC VARIANT] → Mah-so-reh-tic variant note:
- [x] [CRITICAL NOTE] → Critical note:

### Content — Verified Against ACR Text
- [x] file_1.json (Bereshit Part 1, Chapters 1-11) — v3, audited
  - 1 plain summary (821 chars)
  - 1 scholarly summary (1914 chars)
  - 10 key terms with phonetic pronunciation
  - 10 fill-in-blank questions with source_quote from ACR
  - 10 multiple choice questions with source_quote from ACR
  - 6 FAQ entries
  - All names match ACR spelling (Qayin not Qa'in, Noakh not Noach)
  - All verse quotes verified word-for-word against data/file_1.json
  - No academic framing, no Christian/rabbinic terminology
  - Orit Ge'ez as living primary witness, DSS as attestation

### Architecture
- [x] Study app lives in /study/ subfolder — completely separate from reader
- [x] No root files modified (reader untouched)
- [x] Own service worker (acr-study-v18) with own cache namespace
- [x] Own manifest.json — installable as separate PWA
- [x] Fetches chapter data from ../data/ (shared with reader, same origin)
- [x] All settings in localStorage under acr_study_* prefix
- [x] No AI dependencies, no external APIs, no paid services
- [x] Works offline after first load

### ACR Reader (Separate, Untouched)
- [x] All reader features working: voice, notes, highlighting, bookmarks, etc.
- [x] Offline with all 111 chapters pre-cached
- [x] YHWH glyph fixed (Yod-He-Vav-He)
- [x] Password persists per browser
- [x] Tagged: all-features-working

---

## REMAINING — Build Plan (Priority Order)

### Priority 1: Content Generation (COMPLETE — 18 of 18 done)
Generate curated content for each section, one at a time, in chat.
Each file requires: read full ACR source text → write JSON → audit every
quiz item word-for-word against ACR → commit.

Content files needed:
- [x] file_2.json — Bereshit Part 2, Chapters 12-25 ✅
- [x] file_3.json — Bereshit Part 3, Chapters 26-36 ✅
- [x] file_4.json — Bereshit Part 4, Chapters 37-50 ✅
- [x] file_5.json — Shemot Part 1, Chapters 1-18 ✅
- [x] file_6.json — Shemot Part 2, Chapters 19-40 ✅
- [x] file_7.json — Vayikra Part 1, Chapters 1-16 ✅
- [x] file_8.json — Vayikra Part 2, Chapters 17-27 ✅
- [x] file_9.json — Bamidbar Part 1, Chapters 1-19 ✅
- [x] file_10.json — Bamidbar Part 2, Chapters 20-36 ✅
- [x] file_11.json — Devarim Part 1, Chapters 1-17 ✅
- [x] file_12.json — Devarim Part 2, Chapters 18-34 ✅
- [x] file_13.json — Chanokh Part 1, Chapters 1-36 (Book of Watchers) ✅
- [x] file_14.json — Chanokh Part 2, Chapters 37-55 (Dream Visions) ✅
- [x] file_15.json — Chanokh Part 3, Chapters 56-73 (Epistle) ✅
- [x] file_16.json ✅ — Yovelim Part 1, Chapters 1-25
- [x] file_17.json ✅ — Yovelim Part 2, Chapters 26-50
- [x] file_94.json ✅ — War Scroll 1QM, All 19 Columns

Each content file schema:
  id, label, volume, content_version,
  summary_plain, summary_scholarly,
  key_terms[{term, phonetic, definition}],
  fill_blank[{ref, prompt, answer, source_quote}],
  multiple_choice[{ref, question, options[], correct, source_quote}],
  faq[{question, answer}]

### Priority 2: SM-2 Spaced Repetition Algorithm
- [x] SM-2 algorithm: ease factor, interval, repetition count, next review date
- [x] Confidence 1-5 maps to SM-2 quality ratings
- [x] Card state stored in localStorage (acr_study_cards)
- [x] Flashcard mode reads from SM-2 schedule: due cards first
- [x] Weak card queue: cards rated 1-2 resurface same session
- [x] "Due today" count shown on home screen and Progress view
- [x] Mastery threshold: ease >= 2.5 after 3+ reviews

### Priority 3: Images
- [ ] Source public domain scroll/manuscript images from Wikimedia Commons
- [ ] Volume-specific thematic imagery
- [ ] Flashcard header images
- [ ] Chapter breakdown banner images
- [ ] Activity card decorative backgrounds
- [ ] Commit to study/img/ folder

### Priority 4: Reading Aids (Dyslexia Layer)
- [x] BeeLine Reader-style color gradient across lines
- [x] Line focus mode (dim all except current 1/3/5 lines)
- [x] Word-by-word synchronized highlighting during TTS (onboundary event)
- [x] Tap any word for instant audio pronunciation
- [x] High contrast color themes (dark parchment, deep navy, warm amber)

### Priority 5: Child Mode
- [x] Toggle in settings
- [x] OpenDyslexic locked on
- [x] Even larger text (+4pt)
- [x] Every word tappable for audio pronunciation
- [x] Simplified plain-language summaries
- [x] Encouraging animated feedback ("Great job!" with animation)
- [x] Swipe-friendly large tap targets
- [x] No time pressure on any drill
- [x] 3-option multiple choice instead of 4

### Priority 6: Additional Puzzle Modes
- [x] Verse reconstruction — drag and drop scrambled words into correct order
- [x] Word matching puzzle — draw lines connecting Hebrew terms to meanings
- [ ] Crossword puzzle per chapter using key terms
- [ ] Jigsaw reveal — correct answers progressively reveal a chapter image
- [ ] Chapter sequence puzzle — reorder events/passages by dragging
- [ ] Pattern recognition drills — identify which volume a verse belongs to

### Priority 7: Advanced Visual Features
- [ ] Mind map view per chapter — visual tappable concept web
- [ ] Color-coded timeline across all volumes
- [ ] Symbol/icon system for recurring themes (covenant, scroll, calendar)
- [ ] Color-block verse map — chapter visualized as tappable color grid
- [ ] Visual concordance — tap key term, see all verses containing it
- [ ] Progress map — scrollable illustrated journey across 8 volumes

### Priority 8: Polish & Accessibility
- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation
- [ ] Progress export/import (backup study state as JSON)
- [ ] Distinct study app icon (replace reader's icon copy)
- [ ] Cross-device install testing (iPad, iPhone, Mac Safari, Chrome)
- [ ] Search within section
- [ ] Adaptive difficulty per exercise (easy/medium/hard tiers)
- [ ] Caregiver/educator progress summary export

---

## CONTENT VOICE DIRECTIVE (Locked In)

All curated content must follow these rules without exception:

- Evidence-based, not hypothetical
- Dead Sea Scrolls + Orit Ge'ez as primary witnesses
- No Christianity/rabbinic/Talmud framing
- No use of "LORD", "God", or any substitute for YHWH
- No "apocryphal", "pseudepigraphal", "deuterocanonical" labels
- No academic hedging ("primordial history", "cosmogony", etc.)
- No Samaritan or Septuagint as co-equal witnesses
- Orit Ge'ez is the LIVING primary witness; DSS attest the text
- Masoretic is a later variant only, not a baseline
- Personal names in original Hebrew (Qayin, Noakh, Chanokh, etc.)
- Anglicized forms noted only for learner recognition
- No messianic, no lunar calendar, no New Testament
- Strip "Middle East" label (colonial term invented 1902)
- Deliberately include African, Indigenous, non-Western primary sources
- Treat disappearance from dominant textbooks as a warning sign
- Never soften substitution and erasure — name them directly
- Every quiz item must include source_quote from the actual ACR text
- Every quiz item must be verified word-for-word against data/file_N.json

---

## QUESTION GENERATION RULES (Locked In)

Applies to every quiz item in every `study/content/file_N.json` and to
the Attain reader's in-app generator. All rules must be satisfied —
no exceptions.

### Content Rules
- Generate questions ONLY from the body text of the chapter provided.
- Do NOT use content from: titles, subtitles, headers, introductions,
  table of contents, prefaces, author bios, footnotes, or index pages.
- Every question must be directly answerable from a specific passage
  within the chapter body text.
- Do not infer, assume, or introduce external knowledge not present
  in the provided text.

### Quality Rules
- Questions must test genuine comprehension, not surface scanning.
- Avoid questions answerable by spotting a single keyword.
- At least 60% of questions should require the learner to understand
  meaning, cause/effect, sequence, or character/concept relationships.
- Do not generate trick questions or questions designed to confuse.
- Each correct answer must be unambiguous and directly supported by
  the text.
- Wrong answer choices (distractors) must be plausible but clearly
  incorrect to someone who read the chapter — not random or absurd.

### Format Rules
- Return ONLY valid JSON. No markdown, no explanation, no preamble.
- Each question object must include:

```
{
  "question": "string",
  "options": ["A", "B", "C", "D"],
  "correct": "A",
  "hint": "string referencing where in the text the answer is found",
  "source_passage": "brief quote or paraphrase from the chapter that supports the answer"
}
```

### Difficulty Balance (per batch of 10)
- 3 recall questions (who, what, where)
- 4 comprehension questions (why, how, what does this mean)
- 3 application/analysis questions (what would happen if, what is the
  relationship between)

### Dyslexia-Friendly Language
- Keep question sentences under 20 words where possible.
- Use plain, direct language.
- Avoid double negatives entirely.
- Avoid jargon unless the jargon itself is the learning target.

### Scope & Cost Constraint
- These rules apply to **chat-time curation only**.
- No AI, no API calls, no paid services may be introduced into the
  deployed app — the app stays 100% free, fully static, GitHub Pages
  only. All question content is either hand-authored in chat under
  the existing plan (for `study/content/`) or generated client-side
  by the Attain parser's algorithmic generator.

### Reconciliation Note
The existing `study/content/file_N.json` files use `source_quote` (not
`source_passage`), integer `correct` index (not letter), and no `hint`
field. Before regenerating any existing file, decide: migrate old
files to this new schema, or keep the old schema and map the new
fields (`source_passage` → `source_quote`, letter `correct` →
numeric index, add `hint` as an optional field). Do not mix schemas
in a single file.

---

## FREE STACK (Locked In)

Every current and future feature must use ONLY these — no paid APIs,
no subscription services, no keys.

- **Web Speech API** (built-in browser) — all TTS and voice recognition
- **MediaRecorder API** (built-in browser) — audio capture for Dictation
  Challenge and any record-and-compare modes
- **HTML5 drag-and-drop** — native browser DnD for simple reorder/match
- **SortableJS** (MIT licensed, free) — richer drag interactions; vendor
  into `study/lib/` (no CDN dependency)
- **vis.js** or **Cytoscape.js** (MIT/Apache, free) — Mind Map Builder,
  Concept Web, Chapter Timeline; vendor into `study/lib/`
- **GitHub Pages** — hosting (free tier, static only)
- **localStorage / IndexedDB / Cache Storage / cookies** — all persistence
- **JSON files** — all content

Forbidden even if free-tier exists:
- OpenAI / Anthropic / Gemini / any hosted LLM API
- Firebase, Supabase, any hosted DB
- Google Analytics, Mixpanel, any tracker
- Paid fonts (use Google Fonts only)
- Any service that could introduce a future paywall

Why vendor instead of CDN: CDNs can go down, rate-limit, or start
charging. Vendoring a 30-50KB library into `study/lib/` is free, offline,
and permanent.

---

## PENDING INSTRUCTIONS BACKLOG (Locked In)

The following were handed down in session and must not be lost. Build
order is flexible; none should silently disappear.

### #3 — Question Validation
Eleven per-question checks + one batch-level difficulty-balance check.
Target file: `study/validate-questions.js` (standalone, NOT shipped to
the app, run in chat during curation).

Checks required:
1. `checkRequiredFields` — question, options, correct, hint,
   source_passage all present and non-empty
2. `checkQuestionLength` — question sentence ≤ 20 words where possible
3. `checkNoDoubleNegative` — reject double negatives outright
4. `checkAnswerIsUnambiguous` — only one option can be the correct answer
5. `checkDistractorsNotAbsurd` — distractors must be plausible wrong
   answers, not nonsense
6. `checkAnswerInOptions` — the `correct` value must match one of the
   `options`
7. `checkSourcePassageExists` — `source_passage` text must appear in
   the provided `bodyText`
8. `checkNotFromFrontMatter` — question must not reference titles,
   TOC, prefaces, author bios, footnotes, or index
9. `checkNoJargonDump` — avoid jargon unless jargon IS the learning
   target
10. `checkDistractorsArePlausible` — distractors belong to the same
    category/domain as the answer
11. `checkAnswerNotKeywordOnly` — answer can't be spotted by scanning
    a single keyword without comprehension

Batch-level:
- `checkDifficultyBalance` — per batch of 10: 3 recall / 4 comprehension
  / 3 application-analysis (20–40% / 30–50% / 20–40% ratios)

Wrappers: `validateQuestion(q, bodyText)` returns
`{valid, reasons[]}`. `validateBatch(questions, bodyText)` filters to
passing questions and warns on failures.

### #4 — Remix Round
Track every question a user misses during any game mode in the
current session. At round end, resurface those questions in a
**different** game format — e.g. missed a Fill-in-Blank → reappears
as Multiple Choice → then as Flashcard. Prevents the user from
failing the exact same experience twice.

Storage: localStorage key `acr_study_remix_queue` with schema
`[{chapterId, questionRef, missedInMode, missedAt}]`. Cleared when
the remixed version is answered correctly, or at session end if
the user quits.

UI: appears as a new card at the end of every round titled
"Remix Round" — same visual weight as other activity cards.

### #5 — Hint Ladder
Three progressive hint levels on any question:
1. **Letter hint** — reveal starting letter + word length (e.g.
   "Starts with D, 7 letters")
2. **Passage hint** — pull the source passage from the chapter
3. **Blanked reveal** — show the answer with middle letters blanked
   (e.g. `D _ _ _ _ _ M`)

Full answer only appears after all three hints exhausted AND the
user submits a final guess.

UI: a single `<button class="hint-btn">` component that updates its
own label each stage: "💡 Hint" → "📖 Show passage" → "🔡 Reveal pattern"
→ (disabled after 3). Consumed hints reduce XP reward for that
question (e.g. 10 XP → 7 → 4 → 1).

### #6 — Game Modes Backlog
Sixteen suggested modes. Some overlap with existing cards — those
are marked `equiv`. Build order is not fixed; pick one at a time.

| Mode | Status | Notes |
|------|--------|-------|
| Fill the Gap | `equiv` | Existing Fill in the Blank |
| Streak Rewards | `equiv` | Existing XP + daily streak |
| Echo Read | `equiv` | Existing Listen & Learn + tap-any-word |
| Chapter Timeline | backlog | Already Priority 7 |
| Mind Map Builder | backlog | Already Priority 7 |
| Concept Web | backlog | Already Priority 7 |
| Remix Round | backlog | See #4 above |
| Syllable Tap | new | Tap syllable boundaries in chapter words — dyslexia aid |
| Rhyme Chain | new | Chain rhyming words drawn from the chapter |
| Word Morph | new | Change one letter at a time between two chapter words |
| Story Sequence | done | Tap-to-pick UI (iPad-friendly, no DnD). 6 events per round sampled evenly across chapter; scoring 1.0/0.7/0.4 by attempt count; partial-credit feedback allows retry without reset; Remix integration |
| True or False with Why | done | TRUE = verbatim sentence from source; FALSE = key-term proper noun swapped. Correct answer reveals source paragraph ("Why:" block) + swap note when applicable. Remix integration |
| Who Said It | done | Scans source_quotes (Study) / chapter paragraphs (Attain) for dialogue attribution patterns; MC-style picks speaker from 4 options; Hint Ladder + Remix integration |
| Cause and Effect Match | done | Scans source_quotes / faq answers for 4 connective patterns (because / so-therefore-thus-hence / led to-caused / Because X, Y). 5 pairs per round, effects independently shuffled, tap-to-match; Remix integration |
| Audio Fill the Gap | done | TTS auto-plays prompt with "blank" spoken at the missing word; reuses FB engine + Hint Ladder; green banner distinguishes mode |
| Dictation Challenge | new | Hear a verse, type it back; compare |

---

## TECHNICAL CONSTRAINTS (Locked In)

- No AI dependencies in the deployed app
- No external APIs at runtime
- No paid services
- Fully self-contained on GitHub Pages
- All study work inside /study/ subfolder only
- Never modify any root file (reader is untouched)
- Write study.js in small chunks, commit after each
- Curated content generated in chat (free under existing plan)
- All settings in localStorage under acr_study_* prefix
- Service worker scoped to /study/, own cache namespace

---

## GIT STATE

Latest commit: e881ad2 (Chanokh Part 3, Epistle)
Tags: study-9-cards-working, study-13-of-18-content
Branch: main
Reader tag: all-features-working (commit 0083767)

Files in /study/:
  study/index.html          — PWA shell with Google Fonts links
  study/study.css           — dyslexia-optimized visual design
  study/study.js            — all 9 activity modes + XP/streak/level
  study/sw.js               — scoped service worker
  study/manifest.json       — PWA manifest
  study/icon.png            — app icon (user uploading Attain icon via GitHub web UI)
  study/README.md           — phase checklist
  study/BUILD_PLAN.md       — this file
  study/content/file_1.json — Bereshit Part 1 (v3, audited)
  study/content/file_2.json — Bereshit Part 2 (audited)
  study/content/file_3.json — Bereshit Part 3 (audited)
  study/content/file_4.json — Bereshit Part 4 (audited)
  study/content/file_5.json — Shemot Part 1 (audited)
  study/content/file_6.json — Shemot Part 2 (audited)
  study/content/file_7.json — Vayikra Part 1 (audited)
  study/content/file_8.json — Vayikra Part 2 (audited)
  study/content/file_9.json — Bamidbar Part 1 (audited)
  study/content/file_10.json — Bamidbar Part 2 (audited)
  study/content/file_11.json — Devarim Part 1 (audited)
  study/content/file_12.json — Devarim Part 2 (audited)
  study/content/file_13.json — Chanokh Part 1 — Book of Watchers (audited)
  study/content/file_14.json — Chanokh Part 2 — Astronomical/Dream Visions (audited)
  study/content/file_15.json — Chanokh Part 3 — Epistle (audited)

Volumes complete: 1 (Bereshit), 2 (Shemot), 3 (Vayikra), 4 (Bamidbar), 5 (Devarim), 6 (Chanokh)
Volumes remaining: 7 (Yovelim — 2 files), 33 (War Scroll — 1 file)

## NEXT SESSION INSTRUCTIONS

Open with: "Read study/BUILD_PLAN.md. Continue content generation from file_16 (Yovelim Part 1). Then file_17 and file_94. After content is complete, continue with SM-2, images, and remaining features from the build plan."
