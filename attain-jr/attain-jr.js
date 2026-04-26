/* Attain Jr — kid-friendly study companion.
   Mirrors Attain's chapter / character / activity structure but with
   bigger touch targets, audio-first interactions, paraphrase
   read-aloud, inline SFX, custom voice upload, and parent-gated
   settings. Pure offline JS — no frameworks. */
(function () {
  'use strict';

  /* ---------- Sample story (ships in v1 so the app demonstrates
     itself even with zero imported books). Replace via Library
     import in a future commit. */
  var SAMPLE_BOOK = {
    title: 'The Brave Little Fox',
    author: 'Attain Jr Sample',
    ageBand: '3-5',
    cover: 'splash.jpg',
    characters: [
      { name: 'Fox',  emoji: '🦊', voiceHint: 'high-young' },
      { name: 'Owl',  emoji: '🦉', voiceHint: 'wise-deep' },
      { name: 'Bear', emoji: '🐻', voiceHint: 'low-warm' }
    ],
    storyworld: {
      setting: 'A bright forest at the edge of a winding river.',
      time: 'A long time ago, in story-time.',
      lesson: 'Being brave means asking for help when you need it.'
    },
    gallery: [
      { caption: 'A bright forest at sunrise.', src: 'splash.jpg' }
    ],
    scenes: [
      {
        id: 'meet',
        title: 'Meeting',
        color: 'blue',
        sfx: ['pop'],
        body: [
          { type: 'stage', text: 'Sunlight peeks through the trees.' },
          { type: 'p',     text: 'A little fox lived by a winding river.' },
          { type: 'char',  who: 'Fox' },
          { type: 'p',     text: 'I want to find the wise owl on the other side of the river.' },
          { type: 'p',     text: 'But the river was wide and fast.' }
        ]
      },
      {
        id: 'river',
        title: 'River',
        color: 'orange',
        sfx: ['storm'],
        body: [
          { type: 'stage', text: 'The river roars softly. Splashes of water sparkle.' },
          { type: 'p',     text: 'The fox stood at the edge of the water.' },
          { type: 'highlight', text: '“I am too small to swim across.”' },
          { type: 'p',     text: 'A bear walked by with a big log.' },
          { type: 'char',  who: 'Bear' },
          { type: 'p',     text: 'Little fox, why are you sad?' },
          { type: 'char',  who: 'Fox' },
          { type: 'p',     text: 'I want to cross the river. Will you help me?' }
        ]
      },
      {
        id: 'owl',
        title: 'Owl',
        color: 'purple',
        sfx: ['chime'],
        body: [
          { type: 'stage', text: 'On the other side, an owl waits in a great oak tree.' },
          { type: 'char',  who: 'Owl' },
          { type: 'p',     text: 'You are very brave, little fox. Do you know why?' },
          { type: 'char',  who: 'Fox' },
          { type: 'p',     text: 'Because I crossed the river?' },
          { type: 'char',  who: 'Owl' },
          { type: 'p',     text: 'Because you asked for help.' },
          { type: 'highlight', text: 'Being brave means asking for help when you need it.' }
        ]
      },
      {
        id: 'home',
        title: 'Home',
        color: 'green',
        sfx: ['celebrate'],
        body: [
          { type: 'stage', text: 'The fox returns home, happy and warm.' },
          { type: 'p',     text: 'And the fox lived bravely ever after.' }
        ]
      }
    ],
    activities: [
      {
        type: 'mc',
        prompt: 'Tap the brave little animal!',
        choices: [
          { text: '🦊 Fox',   correct: true },
          { text: '🐢 Turtle' },
          { text: '🐭 Mouse' }
        ]
      },
      {
        type: 'mc',
        prompt: 'What helped the fox cross the river?',
        choices: [
          { text: '🪵 A log',  correct: true },
          { text: '🚗 A car' },
          { text: '🪁 A kite' }
        ]
      },
      {
        type: 'mc',
        prompt: 'Being brave means…',
        choices: [
          { text: 'Asking for help', correct: true },
          { text: 'Doing it alone' },
          { text: 'Hiding away' }
        ]
      }
    ]
  };

  var book = SAMPLE_BOOK;
  var currentSceneIdx = 0;
  var currentTab = 'reader';
  var withMusic = false;

  /* ---------- Splash ---------- */
  function dismissSplash(opts) {
    opts = opts || {};
    document.body.classList.remove('splash-on');
    document.getElementById('splash').remove();
    document.getElementById('app').hidden = false;
    if (opts.music) startMusic();
    selectTab('reader');
  }
  document.getElementById('b-begin').addEventListener('click', function () {
    primeAudio();
    dismissSplash();
  });
  document.getElementById('b-begin-music').addEventListener('click', function () {
    primeAudio();
    dismissSplash({ music: true });
  });
  document.getElementById('b-parent').addEventListener('click', openParentGate);

  /* ---------- Tabs ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (btn) {
    btn.addEventListener('click', function () {
      selectTab(btn.getAttribute('data-tab'));
    });
  });
  function selectTab(name) {
    currentTab = name;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-tab') === name);
    });
    document.getElementById('scene-strip').hidden = name !== 'reader';
    document.getElementById('sfx-bar').hidden = !(name === 'reader' || name === 'storyworld');
    if (name === 'reader')      renderReader();
    else if (name === 'characters') renderCharacters();
    else if (name === 'storyworld') renderStoryworld();
    else if (name === 'gallery')    renderGallery();
    else if (name === 'activities') renderActivities();
  }

  /* ---------- Reader ---------- */
  function renderReader() {
    var strip = document.getElementById('scene-strip');
    strip.innerHTML = book.scenes.map(function (s, i) {
      var on = i === currentSceneIdx ? ' on' : '';
      return '<button class="scene-pill' + on + '" data-color="' + s.color + '" data-idx="' + i + '">' + escHtml(s.title) + '</button>';
    }).join('');
    Array.prototype.forEach.call(strip.querySelectorAll('.scene-pill'), function (el) {
      el.addEventListener('click', function () {
        currentSceneIdx = parseInt(el.getAttribute('data-idx'), 10) || 0;
        stopRead();
        renderReader();
      });
    });
    var sc = book.scenes[currentSceneIdx];
    var c = document.getElementById('content');
    var html = '<h1>' + escHtml(book.title) + '</h1>';
    html += '<h2 style="color:#7b6cff">Scene: ' + escHtml(sc.title) + '</h2>';
    html += sc.body.map(renderBlock).join('');
    c.innerHTML = html;
  }
  function renderBlock(b) {
    // data-rl   = read-aloud (everything that should be spoken in full mode)
    // data-story = story body only (skips stage directions, character labels)
    if (b.type === 'stage') return '<div class="stage" data-rl>' + escHtml(b.text) + '</div>';
    if (b.type === 'highlight') return '<div class="highlight" data-rl data-story>' + escHtml(b.text) + '</div>';
    if (b.type === 'char') {
      var ch = book.characters.find(function (x) { return x.name === b.who; });
      var em = ch ? ch.emoji : '';
      return '<div class="char" data-char="' + escHtml(b.who) + '">' + em + ' ' + escHtml(b.who.toUpperCase()) + '</div>';
    }
    if (b.type === 'p') return '<p data-rl data-story>' + escHtml(b.text) + '</p>';
    if (b.type === 'img') return '<div class="imgcard"><img src="' + escAttr(b.src) + '" alt="' + escAttr(b.alt || '') + '"></div>';
    return '';
  }

  /* ---------- Characters ---------- */
  function renderCharacters() {
    var c = document.getElementById('content');
    c.innerHTML = '<h1>Characters</h1>' + book.characters.map(function (ch) {
      return '<div class="act"><h3>' + ch.emoji + ' ' + escHtml(ch.name) + '</h3>' +
        '<p>Voice hint: ' + escHtml(ch.voiceHint) + '</p>' +
      '</div>';
    }).join('');
  }

  /* ---------- Storyworld ---------- */
  function renderStoryworld() {
    var c = document.getElementById('content');
    var sw = book.storyworld || {};
    c.innerHTML = '<h1>Storyworld</h1>' +
      '<div class="act"><h3>📍 Where</h3><p>' + escHtml(sw.setting || '') + '</p></div>' +
      '<div class="act"><h3>🕰 When</h3><p>' + escHtml(sw.time || '') + '</p></div>' +
      '<div class="act"><h3>💡 Lesson</h3><p>' + escHtml(sw.lesson || '') + '</p></div>';
  }

  /* ---------- Gallery ---------- */
  function renderGallery() {
    var c = document.getElementById('content');
    c.innerHTML = '<h1>Gallery</h1>' + (book.gallery || []).map(function (g) {
      return '<div class="imgcard"><img src="' + escAttr(g.src) + '" alt="' + escAttr(g.caption || '') + '"></div>' +
        (g.caption ? '<p style="text-align:center;color:#666;">' + escHtml(g.caption) + '</p>' : '');
    }).join('');
  }

  /* ---------- Activities ---------- */
  function renderActivities() {
    var c = document.getElementById('content');
    c.innerHTML = '<h1>Activities</h1>' + (book.activities || []).map(function (a, i) {
      return renderActivity(a, i);
    }).join('');
    Array.prototype.forEach.call(c.querySelectorAll('.act-opt'), function (btn) {
      btn.addEventListener('click', function () {
        var right = btn.getAttribute('data-right') === '1';
        if (right) { btn.classList.add('right'); celebrate('⭐'); playSfx('celebrate'); speak('Yes! You got it!'); }
        else { btn.classList.add('wrong'); playSfx('pop'); speak('Try again!'); setTimeout(function () { btn.classList.remove('wrong'); }, 800); }
      });
    });
  }
  function renderActivity(a, i) {
    if (a.type !== 'mc') return '';
    return '<div class="act">' +
      '<h3>Q' + (i + 1) + '. ' + escHtml(a.prompt) + '</h3>' +
      '<div class="act-options">' +
        a.choices.map(function (c) {
          return '<button class="act-opt" data-right="' + (c.correct ? '1' : '0') + '">' + escHtml(c.text) + '</button>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  /* ---------- Audio: Speech, Read-aloud, Pause/Stop, Voice cast ----------
     Voice modes:
       cast   — per-character voice + narrator voice (Jonah-style)
       single — one voice reads everything

     Voice cast persists per-book via localStorage so the user picks
     once and the assignment sticks. */
  var voices = [];
  var customVoiceBlob = null;   // user-recorded voice (Blob)
  var voiceCast = {};           // { characterName: voiceIndex }
  var narratorVoiceIdx = -1;    // -1 = first English voice / system default
  var currentUtter = null;
  var readQueue = [];
  var readIdx = 0;
  var readPaused = false;
  function loadVoices() {
    voices = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    var sel = document.getElementById('ab-voice');
    if (!sel) return;
    sel.innerHTML = '<option value="auto">Auto voice</option>' +
      voices.map(function (v, i) { return '<option value="' + i + '">' + escHtml(v.name) + '</option>'; }).join('');
    if (customVoiceBlob) sel.innerHTML += '<option value="custom">🎙 My recorded voice</option>';
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
  setTimeout(loadVoices, 600);
  function pickNarratorVoice() {
    var sel = document.getElementById('ab-voice');
    var v = sel ? sel.value : 'auto';
    if (v === 'custom') return null;
    if (v === 'auto') {
      // Pick first English voice we find (Siri / Samantha on iPad)
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang && voices[i].lang.indexOf('en') === 0) return voices[i];
      }
      return voices[0] || null;
    }
    var idx = parseInt(v, 10);
    return isNaN(idx) ? null : voices[idx];
  }
  function autoAssignCast() {
    // Pick distinct voices for each character. Prefer English voices,
    // skip the narrator voice when picking character voices.
    var en = voices.filter(function (v) { return v.lang && v.lang.indexOf('en') === 0; });
    var pool = en.length >= book.characters.length + 1 ? en : voices.slice();
    var narrator = pickNarratorVoice();
    var available = pool.filter(function (v) { return !narrator || v.name !== narrator.name; });
    book.characters.forEach(function (ch, i) {
      if (available.length) {
        voiceCast[ch.name] = voices.indexOf(available[i % available.length]);
      } else {
        voiceCast[ch.name] = -1;
      }
    });
    saveCast();
  }
  function loadCast() {
    try {
      var raw = localStorage.getItem('attainjr_cast_' + (book.title || 'sample'));
      if (raw) voiceCast = JSON.parse(raw) || {};
    } catch (e) { voiceCast = {}; }
  }
  function saveCast() {
    try { localStorage.setItem('attainjr_cast_' + (book.title || 'sample'), JSON.stringify(voiceCast)); } catch (e) {}
  }
  function voiceForCharacter(name) {
    if (!name) return pickNarratorVoice();
    var idx = voiceCast[name];
    if (typeof idx === 'number' && idx >= 0 && voices[idx]) return voices[idx];
    return pickNarratorVoice();
  }
  function speak(text, opts) {
    if (!text || !text.trim()) return;
    if (!window.speechSynthesis) return;
    opts = opts || {};
    // Custom-recorded voice plays for the WHOLE passage when selected.
    if (customVoiceBlob && document.getElementById('ab-voice').value === 'custom') {
      var au = new Audio(URL.createObjectURL(customVoiceBlob));
      au.play().catch(function () {});
      if (opts.onend) setTimeout(opts.onend, 1200);
      return;
    }
    var u = new SpeechSynthesisUtterance(text);
    var v = opts.voice || pickNarratorVoice();
    if (v) u.voice = v;
    u.rate = opts.rate || 0.95;
    u.pitch = opts.pitch || 1.05;
    u.volume = 1;
    u.onend = opts.onend || null;
    currentUtter = u;
    try { speechSynthesis.cancel(); } catch (e) {}
    speechSynthesis.speak(u);
  }

  // Read-aloud with optional story-only mode + voice-cast switching.
  // storyOnly=true skips stage directions, character labels and front
  // matter (cover/title/copyright) -- reads only paragraph + highlight
  // blocks marked data-story.
  // mode='cast' switches voices per-character: when a [character] block
  // is encountered, the next [paragraph] block is voiced as that
  // character. Otherwise the narrator voice reads.
  function buildReadQueue(storyOnly) {
    var sel = storyOnly ? '[data-story]' : '[data-rl]';
    var nodes = Array.prototype.slice.call(document.querySelectorAll(sel));
    // Walk the DOM in document order to detect character context for
    // voice-cast mode -- a 'char' badge sets the speaker for the next
    // paragraph until another char or stage block resets it.
    var allReadable = Array.prototype.slice.call(document.querySelectorAll('[data-rl], [data-char]'));
    var speakerByEl = new Map();
    var currentSpeaker = null;
    for (var i = 0; i < allReadable.length; i++) {
      var el = allReadable[i];
      if (el.hasAttribute && el.hasAttribute('data-char')) {
        currentSpeaker = el.getAttribute('data-char');
        speakerByEl.set(el, null);
      } else {
        speakerByEl.set(el, currentSpeaker);
        // Stage directions reset the speaker (back to narrator)
        if (el.classList && el.classList.contains('stage')) currentSpeaker = null;
      }
    }
    return nodes.map(function (el) {
      return { el: el, text: el.textContent || '', speaker: speakerByEl.get(el) || null };
    });
  }
  function readAloudInternal(storyOnly) {
    stopRead();
    readQueue = buildReadQueue(!!storyOnly);
    readIdx = 0; readPaused = false;
    nextRead();
  }
  function readAloud()      { readAloudInternal(false); }
  function readStoryOnly()  { readAloudInternal(true); }
  function nextRead() {
    if (readPaused) return;
    if (readIdx >= readQueue.length) return;
    var item = readQueue[readIdx];
    var el = item.el;
    Array.prototype.forEach.call(document.querySelectorAll('.reading'), function (e) { e.classList.remove('reading'); });
    el.classList.add('reading');
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    var mode = (document.getElementById('ab-voice-mode') || {}).value || 'cast';
    var voice = (mode === 'cast' && item.speaker) ? voiceForCharacter(item.speaker) : pickNarratorVoice();
    var pitch = (mode === 'cast' && item.speaker) ? voicePitchHint(item.speaker) : 1.05;
    speak(item.text, { voice: voice, pitch: pitch, onend: function () { readIdx++; nextRead(); } });
  }
  // Per-character pitch nudge so distinct voices are even more distinct.
  // We can't control timbre with SpeechSynthesis, but pitch + speaker
  // voice combine to give noticeably different deliveries.
  function voicePitchHint(name) {
    var ch = book.characters.find(function (x) { return x.name === name; });
    if (!ch) return 1.05;
    if ((ch.voiceHint || '').indexOf('high') >= 0) return 1.4;
    if ((ch.voiceHint || '').indexOf('low')  >= 0) return 0.7;
    if ((ch.voiceHint || '').indexOf('deep') >= 0) return 0.75;
    if ((ch.voiceHint || '').indexOf('warm') >= 0) return 0.95;
    return 1.05;
  }
  function stopRead() {
    readPaused = false; readQueue = []; readIdx = 0;
    Array.prototype.forEach.call(document.querySelectorAll('.reading'), function (e) { e.classList.remove('reading'); });
    try { speechSynthesis.cancel(); } catch (e) {}
  }
  document.getElementById('ab-read').addEventListener('click', readAloud);
  document.getElementById('ab-read-story').addEventListener('click', readStoryOnly);
  document.getElementById('ab-pause').addEventListener('click', function () {
    if (!window.speechSynthesis) return;
    if (readPaused) { speechSynthesis.resume(); readPaused = false; }
    else { speechSynthesis.pause(); readPaused = true; }
  });
  document.getElementById('ab-stop').addEventListener('click', stopRead);
  document.getElementById('ab-music').addEventListener('click', function () {
    if (musicNode) stopMusic(); else startMusic();
  });
  document.getElementById('ab-prev').addEventListener('click', function () {
    if (currentSceneIdx > 0) { stopRead(); currentSceneIdx--; renderReader(); }
  });
  document.getElementById('ab-next').addEventListener('click', function () {
    if (currentSceneIdx < book.scenes.length - 1) { stopRead(); currentSceneIdx++; renderReader(); }
  });

  /* ---------- Custom voice recording ---------- */
  var mediaRecorder = null;
  document.getElementById('ab-record-voice').addEventListener('click', async function () {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      this.textContent = '🎙 Record';
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('This iPad does not support voice recording in this browser.');
      return;
    }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      var chunks = [];
      mediaRecorder.addEventListener('dataavailable', function (e) { if (e.data && e.data.size > 0) chunks.push(e.data); });
      mediaRecorder.addEventListener('stop', function () {
        customVoiceBlob = new Blob(chunks, { type: 'audio/webm' });
        idbPut('voice', customVoiceBlob).catch(function () {});
        loadVoices();
        document.getElementById('ab-voice').value = 'custom';
        document.getElementById('ab-record-voice').textContent = '🎙 Re-record';
        speak('Your voice is saved!');
      });
      mediaRecorder.start();
      this.textContent = '⏹ Stop recording';
    } catch (e) { alert('Could not access microphone: ' + (e && e.message || e)); }
  });

  /* ---------- Paraphrase: summarize chapter (or selection) and speak ---------- */
  document.getElementById('tool-paraphrase').addEventListener('click', async function () {
    this.disabled = true; var oldLabel = this.textContent;
    this.textContent = '💭 Thinking…';
    try {
      var sel = (window.getSelection && String(window.getSelection())).trim();
      var text = sel || sceneText();
      if (!text) { speak('There is nothing to paraphrase yet.'); return; }
      var paraphrase = await getParaphrase(text);
      speak(paraphrase, { rate: 0.92 });
    } catch (e) {
      speak('I could not paraphrase right now.');
    } finally {
      this.textContent = oldLabel;
      this.disabled = false;
    }
  });
  function sceneText() {
    var scene = book.scenes[currentSceneIdx];
    if (!scene) return '';
    return scene.body.map(function (b) {
      if (b.type === 'p' || b.type === 'stage' || b.type === 'highlight') return b.text;
      if (b.type === 'char') return b.who + ':';
      return '';
    }).join(' ');
  }
  // Free + no-account paraphrase via Pollinations.ai. Falls back to a
  // very simple "first sentence + last sentence" excerpt offline.
  async function getParaphrase(text) {
    try {
      var resp = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          private: true,
          referrer: 'attain-jr',
          messages: [
            { role: 'system', content: 'You are a friendly story summarizer for children ages 3 to 7. Rewrite the story in 2 short, simple sentences using easy words. No quotes around the answer.' },
            { role: 'user', content: text.slice(0, 4000) }
          ]
        })
      });
      if (resp.ok) {
        var raw = await resp.text();
        try {
          var data = JSON.parse(raw);
          var t = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
          if (t) return String(t).trim();
        } catch (e) { return raw; }
      }
    } catch (e) {}
    // Offline fallback: first sentence + last sentence.
    var sentences = text.match(/[^.!?]+[.!?]/g) || [];
    if (sentences.length <= 2) return text;
    return sentences[0].trim() + ' ' + sentences[sentences.length - 1].trim();
  }

  /* ---------- SFX (WebAudio, no files needed) + Music loop ---------- */
  var ac = null;
  function getAC() { if (!ac && (window.AudioContext || window.webkitAudioContext)) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
  function primeAudio() { var c = getAC(); if (c && c.state === 'suspended') c.resume().catch(function () {}); }
  function tone(freq, dur, type, gain) {
    var c = getAC(); if (!c) return;
    var o = c.createOscillator(); var g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gain || 0.18, c.currentTime + 0.02);
    g.gain.linearRampToValueAtTime(0, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.05);
  }
  function noiseBurst(dur, gain) {
    var c = getAC(); if (!c) return;
    var bufSize = Math.floor((c.sampleRate || 44100) * dur);
    var buf = c.createBuffer(1, bufSize, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    var src = c.createBufferSource(); src.buffer = buf;
    var g = c.createGain(); g.gain.value = gain || 0.2;
    src.connect(g).connect(c.destination); src.start();
  }
  function playSfx(name) {
    primeAudio();
    if (name === 'pop')        { tone(880, 0.08, 'square', 0.16); setTimeout(function () { tone(1320, 0.08, 'square', 0.14); }, 60); }
    else if (name === 'chime') { [880, 1175, 1480].forEach(function (f, i) { setTimeout(function () { tone(f, 0.5, 'sine', 0.18); }, i * 120); }); }
    else if (name === 'celebrate') { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { tone(f, 0.18, 'triangle', 0.2); }, i * 90); }); }
    else if (name === 'storm') { noiseBurst(2.0, 0.24); setTimeout(function () { tone(60, 1.2, 'sawtooth', 0.18); }, 200); }
    else if (name === 'splash'){ noiseBurst(0.5, 0.3); setTimeout(function () { tone(220, 0.3, 'sine', 0.18); }, 80); }
    else if (name === 'cinematic') { startMusic(); }
    else if (name === 'stop')  { stopMusic(); try { speechSynthesis.cancel(); } catch (e) {} }
  }
  Array.prototype.forEach.call(document.querySelectorAll('.sfx'), function (b) {
    b.addEventListener('click', function () { playSfx(b.getAttribute('data-sfx')); });
  });
  // Background music: a tiny ambient pad loop using two detuned oscillators.
  var musicNode = null;
  function startMusic() {
    primeAudio();
    if (musicNode) return;
    var c = getAC(); if (!c) return;
    var o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = 220;
    var o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 277;
    var g = c.createGain(); g.gain.value = 0.05;
    o1.connect(g); o2.connect(g); g.connect(c.destination);
    o1.start(); o2.start();
    musicNode = { o1: o1, o2: o2, g: g };
  }
  function stopMusic() {
    if (!musicNode) return;
    try { musicNode.o1.stop(); musicNode.o2.stop(); } catch (e) {}
    musicNode = null;
  }

  /* ---------- Celebration ---------- */
  function celebrate(emoji) {
    var el = document.getElementById('celebrate');
    el.textContent = emoji || '⭐';
    el.hidden = false;
    requestAnimationFrame(function () {
      el.style.animation = 'none';
      el.offsetHeight; // reflow
      el.style.animation = 'celebrate-pop 0.9s ease-out forwards';
    });
    setTimeout(function () { el.hidden = true; }, 950);
  }

  /* ---------- Parent gate ---------- */
  function openParentGate() {
    var modal = document.getElementById('parent-gate');
    modal.hidden = false;
    document.getElementById('pg-pin').value = '';
    document.getElementById('pg-err').textContent = '';
    setTimeout(function () { document.getElementById('pg-pin').focus(); }, 100);
  }
  document.getElementById('pg-cancel').addEventListener('click', function () { document.getElementById('parent-gate').hidden = true; });
  document.getElementById('pg-ok').addEventListener('click', function () {
    var pin = document.getElementById('pg-pin').value || '';
    if (!/^\d{4}$/.test(pin)) { document.getElementById('pg-err').textContent = 'Please enter 4 digits.'; return; }
    var saved = localStorage.getItem('attainjr_pin');
    if (!saved) {
      // First time — save the entered PIN as the parent PIN
      localStorage.setItem('attainjr_pin', pin);
      document.getElementById('parent-gate').hidden = true;
      alert('PIN saved. You\'re in.');
      // Just return to splash so the parent area can be built later
      return;
    }
    if (pin !== saved) { document.getElementById('pg-err').textContent = 'Wrong PIN.'; return; }
    document.getElementById('parent-gate').hidden = true;
    alert('Welcome, parent. (Dashboard coming in v2.)');
  });

  /* ---------- IndexedDB tiny helpers (for custom voice persistence) ---------- */
  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('attainjr', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('kv'); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function idbPut(key, val) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(val, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function idbGet(key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction('kv', 'readonly');
        var req = tx.objectStore('kv').get(key);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { resolve(null); };
      });
    });
  }
  // On boot, restore any previously-recorded voice + voice cast
  idbGet('voice').then(function (b) { if (b) { customVoiceBlob = b; loadVoices(); } }).catch(function () {});
  loadCast();
  // Auto-assign cast on first load if none saved (after voices are
  // available -- iOS Safari populates them asynchronously).
  setTimeout(function () {
    if (Object.keys(voiceCast).length === 0 && voices.length > 0) autoAssignCast();
  }, 1000);

  /* ---------- Voice cast modal ---------- */
  document.getElementById('ab-cast').addEventListener('click', openCastModal);
  function openCastModal() {
    var modal = document.getElementById('cast-modal');
    var rows = document.getElementById('cast-rows');
    rows.innerHTML = book.characters.map(function (ch) {
      var current = voiceCast[ch.name];
      var opts = '<option value="-1">— Narrator voice —</option>' +
        voices.map(function (v, i) {
          var on = (i === current) ? ' selected' : '';
          return '<option value="' + i + '"' + on + '>' + escHtml(v.name) + ' (' + escHtml(v.lang || '') + ')</option>';
        }).join('');
      return '<div class="cast-row">' +
        '<div class="cast-label">' + ch.emoji + ' <strong>' + escHtml(ch.name) + '</strong> <span class="cast-hint">' + escHtml(ch.voiceHint || '') + '</span></div>' +
        '<select class="cast-pick" data-char="' + escHtml(ch.name) + '">' + opts + '</select>' +
        '<button class="cast-test" data-char="' + escHtml(ch.name) + '">▶ Test</button>' +
      '</div>';
    }).join('');
    modal.hidden = false;
    Array.prototype.forEach.call(rows.querySelectorAll('.cast-test'), function (b) {
      b.addEventListener('click', function () {
        var name = b.getAttribute('data-char');
        var sel = rows.querySelector('.cast-pick[data-char="' + name.replace(/"/g, '\\"') + '"]');
        var idx = parseInt(sel.value, 10);
        var v = (idx >= 0) ? voices[idx] : pickNarratorVoice();
        speak('Hi! I am ' + name + '.', { voice: v, pitch: voicePitchHint(name) });
      });
    });
  }
  document.getElementById('cast-cancel').addEventListener('click', function () {
    document.getElementById('cast-modal').hidden = true;
  });
  document.getElementById('cast-auto').addEventListener('click', function () {
    autoAssignCast();
    openCastModal();   // refresh dropdowns
  });
  document.getElementById('cast-save').addEventListener('click', function () {
    var picks = document.querySelectorAll('#cast-rows .cast-pick');
    Array.prototype.forEach.call(picks, function (sel) {
      var name = sel.getAttribute('data-char');
      var idx = parseInt(sel.value, 10);
      voiceCast[name] = isNaN(idx) ? -1 : idx;
    });
    saveCast();
    document.getElementById('cast-modal').hidden = true;
    speak('Voice cast saved.');
  });

  /* ---------- Reading aids cycle (Aa button) ---------- */
  document.getElementById('tool-aa').addEventListener('click', function () {
    var b = document.body;
    if (b.classList.contains('aa-xxl')) {
      b.classList.remove('aa-xxl');
    } else if (b.classList.contains('aa-xl')) {
      b.classList.remove('aa-xl'); b.classList.add('aa-xxl');
    } else {
      b.classList.add('aa-xl');
    }
  });

  /* ---------- Back button → splash ---------- */
  document.getElementById('tool-back').addEventListener('click', function () {
    location.reload();
  });

  /* ---------- Service worker ---------- */
  if ('serviceWorker' in navigator) {
    try { navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }); } catch (e) {}
  }

  /* ---------- HTML escape helpers ---------- */
  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function escAttr(s) { return escHtml(s); }

})();
