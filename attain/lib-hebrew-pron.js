// Hebrew pronunciation helper — Attain / Attain Jr / Load
// Copyright (c) 2026 LBond. All Rights Reserved.
//
// iPad Safari's SpeechSynthesis voices butcher Hebrew words pulled
// out of biblical or rabbinic texts ("Yeshayahu", "Tehillim", "Adonai")
// because the default English voice falls back to letter-by-letter
// reading on Unicode 0590-05FF and the transliterations in many books
// land in spelling-pronunciation traps for English voices.
//
// This file exposes a single global, window.HebrewPron, with two
// methods:
//
//   HebrewPron.normalize(text)
//     Returns text with Hebrew strings + common transliterations
//     replaced by phoneme-friendly English approximations. Pass any
//     read-aloud queue text through this before handing to
//     SpeechSynthesisUtterance and the same voice will pronounce it
//     close to how a native speaker says it.
//
//   HebrewPron.phonemes(word)
//     Returns the IPA-ish phoneme map for a single word, or null if
//     the dictionary doesn't know it. Useful for inline reading-aid
//     bubbles ("how do I say this?") in Attain / Attain Jr.
//
// The dictionary is intentionally biblical-leaning since that's what
// the parent ACR / scrolls reader covers, plus a baseline of common
// kid-friendly story words. Easy to grow — every entry is just
// {hebrew, translit, phon}. translit is what to substitute for English
// TTS; phon is the human-readable hint we show on screen.

(function (global) {
  'use strict';

  // --- 1. Per-letter consonant + vowel maps --------------------------
  // Used as a fallback when a word isn't in the dictionary. Returns a
  // best-effort transliteration that English voices can read.
  var HE_CONS = {
    'א': '',   'ב': 'v',  'ג': 'g',  'ד': 'd',
    'ה': 'h',  'ו': 'v',  'ז': 'z',  'ח': 'ch',
    'ט': 't',  'י': 'y',  'ך': 'kh', 'כ': 'k',
    'ל': 'l',  'ם': 'm',  'מ': 'm',  'ן': 'n',
    'נ': 'n',  'ס': 's',  'ע': '',   'ף': 'f',
    'פ': 'p',  'ץ': 'tz', 'צ': 'tz', 'ק': 'k',
    'ר': 'r',  'ש': 'sh', 'ת': 't'
  };
  // Common niqqud (vowel marks)
  var HE_VOWEL = {
    'ְ': '',   // sheva
    'ֱ': 'e',  'ֲ': 'a', 'ֳ': 'o',
    'ִ': 'i',  'ֵ': 'e', 'ֶ': 'e', 'ַ': 'a',
    'ָ': 'a',  'ֹ': 'o', 'ֻ': 'u', 'ּ': '', // dagesh
    'ֽ': '',   'ֿ': '', 'ׁ': '',  'ׂ': '',
    'ׇ': 'o'
  };
  function letterTranslit(word) {
    var out = '';
    for (var i = 0; i < word.length; i++) {
      var c = word.charAt(i);
      if (HE_CONS[c] != null) out += HE_CONS[c];
      else if (HE_VOWEL[c] != null) out += HE_VOWEL[c];
      // else: ignore (cantillation marks, punctuation)
    }
    // Insert default 'a' between consonant clusters so English voice
    // doesn't try to pronounce three consonants in a row.
    out = out.replace(/([bcdfghjklmnpqrstvwxyz])([bcdfghjklmnpqrstvwxyz])/gi, '$1a$2');
    return out;
  }

  // --- 2. Curated dictionary ----------------------------------------
  // Each entry: { hebrew?, translit, phon, alt? }
  //   hebrew  — exact Hebrew form (optional)
  //   translit — what to feed the TTS engine
  //   phon    — human-readable phoneme hint shown in popup bubble
  //   alt     — alternate English spellings to also catch (lowercased)
  var DICT = [
    // Names of God + central biblical names
    { hebrew: 'יהוה',     translit: 'Adonai',          phon: 'ah-doh-NAI',       alt: ['yhvh', 'yhwh', 'jehovah'] },
    { hebrew: 'אלהים', translit: 'Eh-loh-heem',   phon: 'eh-loh-HEEM',      alt: ['elohim'] },
    { hebrew: 'אדוני', translit: 'Adonai',         phon: 'ah-doh-NAI',       alt: ['adonai'] },
    { hebrew: 'ישוע',     translit: 'Yeh-shoo-ah',     phon: 'yeh-SHOO-ah',      alt: ['yeshua', 'jesus'] },
    { hebrew: 'משיח',     translit: 'Mah-shee-ahch',   phon: 'mah-shee-AHKH',    alt: ['mashiach', 'messiah'] },
    { hebrew: 'ישראל', translit: 'Yis-rah-el',     phon: 'yis-rah-EL',       alt: ['israel', "yisra'el", 'yisrael'] },
    { hebrew: 'אברהם', translit: 'Av-rah-ham',     phon: 'av-rah-HAHM',      alt: ['abraham'] },
    { hebrew: 'יצחק',     translit: 'Yitz-chak',       phon: 'yitz-KHAK',        alt: ['isaac', 'yitzhak'] },
    { hebrew: 'יעקב',     translit: 'Yah-ah-kov',      phon: 'yah-ah-KOV',       alt: ['jacob', 'yaakov'] },
    { hebrew: 'משה',           translit: 'Mo-sheh',         phon: 'moh-SHEH',         alt: ['moses', 'moshe'] },
    { hebrew: 'אהרן',     translit: 'Ah-ha-ron',       phon: 'ah-ha-RON',        alt: ['aaron'] },
    { hebrew: 'דוד',           translit: 'Da-veed',         phon: 'dah-VEED',         alt: ['david'] },
    { hebrew: 'שלמה',     translit: 'Sh-loh-moh',      phon: 'shloh-MOH',        alt: ['solomon', 'shlomo'] },
    { hebrew: 'עברי',     translit: 'Iv-reet',         phon: 'iv-REET',          alt: ['ivrit', 'hebrew language'] },

    // Books / sections of Tanakh
    { hebrew: 'תורה',     translit: 'Toh-rah',         phon: 'toh-RAH',          alt: ['torah'] },
    { hebrew: 'נביאים', translit: 'Neh-vee-eem', phon: 'neh-vee-EEM',  alt: ["nevi'im", 'neviim', 'prophets'] },
    { hebrew: 'כתובים', translit: 'K-too-veem',  phon: 'k-too-VEEM',   alt: ['ketuvim', 'writings'] },
    { hebrew: 'תהלים', translit: 'T-hee-leem',     phon: 't-hee-LEEM',     alt: ['tehillim', 'psalms'] },
    { hebrew: 'משלי',     translit: 'Mish-lay',        phon: 'mish-LAY',         alt: ['mishlei', 'proverbs'] },
    { hebrew: 'ישעיהו', translit: 'Y-shai-yah-hoo', phon: 'y-shai-YAH-hoo', alt: ['yeshayahu', 'isaiah'] },
    { hebrew: 'ירמיהו', translit: 'Yir-mi-yah-hoo', phon: 'yir-mi-YAH-hoo', alt: ['yirmiyahu', 'jeremiah'] },
    { hebrew: 'יחזקאל', translit: 'Yech-ez-kel',  phon: 'yekh-ez-KEL',  alt: ['yechezkel', 'ezekiel'] },

    // Holidays / common terms
    { hebrew: 'שבת',           translit: 'Sha-baht',        phon: 'shah-BAHT',        alt: ['shabbat', 'sabbath'] },
    { hebrew: 'פסח',           translit: 'Peh-sahch',       phon: 'PEH-sakh',         alt: ['pesach', 'passover'] },
    { hebrew: 'מצות',     translit: 'Mitz-vot',        phon: 'mitz-VOT',         alt: ['mitzvot', 'mitzvos'] },
    { hebrew: 'מצוה',     translit: 'Mitz-vah',        phon: 'mitz-VAH',         alt: ['mitzvah'] },
    { hebrew: 'חסד',           translit: 'Cheh-sed',        phon: 'KHEH-sed',         alt: ['chesed', 'hesed'] },
    { hebrew: 'שלום',     translit: 'Shah-lome',       phon: 'shah-LOME',        alt: ['shalom'] },
    { hebrew: 'אמן',           translit: 'Ah-mehn',         phon: 'ah-MEN',           alt: ['amen'] },
    { hebrew: 'הללויה', translit: 'Hah-leh-loo-yah', phon: 'hah-leh-loo-YAH', alt: ['halleluyah', 'hallelujah', 'alleluia'] },

    // Common kid-book Hebrew (Aleph-Bet game words, blessings)
    { translit: 'Ah-lef',     phon: 'AH-lef',     alt: ['aleph', 'alef'] },
    { translit: 'Bet',        phon: 'BET',        alt: ['bet'] },
    { translit: 'Gee-mel',    phon: 'GEE-mel',    alt: ['gimel'] },
    { translit: 'Dah-let',    phon: 'DAH-let',    alt: ['dalet'] },
    { translit: 'Hay',        phon: 'HEY',        alt: ['hei', 'hey'] },
    { translit: 'Vav',        phon: 'VAHV',       alt: ['vav'] },
    { translit: 'Zai-yin',    phon: 'ZAI-yin',    alt: ['zayin'] },
    { translit: 'Khet',       phon: 'KHET',       alt: ['chet', 'het'] },
    { translit: 'Tet',        phon: 'TET',        alt: ['tet'] },
    { translit: 'Yood',       phon: 'YOOD',       alt: ['yud', 'yod'] },
    { translit: 'Kahf',       phon: 'KAHF',       alt: ['kaf', 'kaph'] },
    { translit: 'Lah-med',    phon: 'LAH-med',    alt: ['lamed'] },
    { translit: 'Mem',        phon: 'MEM',        alt: ['mem'] },
    { translit: 'Nun',        phon: 'NOON',       alt: ['nun'] },
    { translit: 'Sah-mech',   phon: 'SAH-mekh',   alt: ['samech', 'samekh'] },
    { translit: 'Ah-yin',     phon: 'AH-yin',     alt: ['ayin'] },
    { translit: 'Pay',        phon: 'PEY',        alt: ['pe', 'pey'] },
    { translit: 'Tza-dee',    phon: 'tzah-DEE',   alt: ['tzadi', 'tzaddi'] },
    { translit: 'Koof',       phon: 'KOOF',       alt: ['kuf', 'qof'] },
    { translit: 'Reish',      phon: 'REYSH',      alt: ['resh', 'reish'] },
    { translit: 'Sheen',      phon: 'SHEEN',      alt: ['shin'] },
    { translit: 'Tahv',       phon: 'TAHV',       alt: ['tav', 'taw'] }
  ];

  // Build alt -> entry map (case-insensitive) for fast English match.
  var BY_ALT = {};
  var BY_HEB = {};
  DICT.forEach(function (d) {
    if (d.alt) d.alt.forEach(function (a) { BY_ALT[a.toLowerCase()] = d; });
    if (d.hebrew) BY_HEB[d.hebrew] = d;
    // The translit form itself can also surface the popup if a user
    // types "Mashiach" in their book content.
    if (d.translit) BY_ALT[d.translit.toLowerCase()] = d;
  });

  // --- 3. Public API ------------------------------------------------
  function lookupExact(word) {
    if (!word) return null;
    var clean = String(word).replace(/[^\w'א-ת-]/g, '').toLowerCase();
    if (BY_ALT[clean]) return BY_ALT[clean];
    if (BY_HEB[word]) return BY_HEB[word];
    return null;
  }
  function phonemesFor(word) {
    var hit = lookupExact(word);
    if (!hit) return null;
    return { translit: hit.translit, phon: hit.phon };
  }
  function isHebrew(s) { return /[֐-׿]/.test(String(s || '')); }
  function normalize(text) {
    if (!text) return '';
    var out = String(text);
    // 1. Replace exact dictionary alts (English/translit forms) so
    //    "Yeshayahu" reads as "Y-shai-yah-hoo" not "yes-ah-yoo".
    Object.keys(BY_ALT).forEach(function (key) {
      // Word boundary match, case-insensitive.
      var re = new RegExp('\\b' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      out = out.replace(re, BY_ALT[key].translit);
    });
    // 2. Replace any remaining Hebrew runs with the dictionary entry
    //    if known, otherwise letter-by-letter transliteration.
    out = out.replace(/[֐-׿][֐-׿֑-ׇא-תװ-״]*/g, function (m) {
      var hit = BY_HEB[m];
      if (hit) return hit.translit;
      var fb = letterTranslit(m);
      return fb || m;
    });
    return out;
  }

  global.HebrewPron = {
    normalize: normalize,
    phonemes: phonemesFor,
    isHebrew: isHebrew,
    // Export for diagnostics / extension by author
    _dict: DICT
  };
})(typeof window !== 'undefined' ? window : this);
