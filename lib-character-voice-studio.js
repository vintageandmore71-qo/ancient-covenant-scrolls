/* Character Voice Studio for Load — v1
 *
 * Self-contained module. Exposes window.CharacterVoiceStudio with:
 *   open({ onAddTextLines(lines), onAddAudioBlob(blob, name) })
 *
 * Workflow:
 *   1. User pastes a script.
 *   2. Studio parses "NAME:" / "Name:" lines + bare quoted dialogue.
 *      Narrator gets the prose between dialogue lines.
 *   3. Each detected character gets a voice profile (voice, rate, pitch,
 *      volume) — profiles persist in localStorage.
 *   4. Preview: line / character / full scene via speechSynthesis.
 *   5. Add to timeline:
 *        - "Add as text track"  → onAddTextLines(lines) — emits one
 *          subtitle block per line at estimated duration.
 *        - "Record character voice" → MediaRecorder mic capture per
 *          line, assembled into a single WAV → onAddAudioBlob(blob).
 *
 * Does NOT rewrite Load's editor, timeline engine, audio wiring, or
 * project save. Relies on the bridge callbacks supplied by Load.
 */
(function (global) {
  'use strict';
  if (global.CharacterVoiceStudio) return;

  var LS_PROFILES = 'load_cvs_profiles_v1';
  var LS_LAST_SCRIPT = 'load_cvs_last_script_v1';

  function loadProfiles() {
    try { return JSON.parse(localStorage.getItem(LS_PROFILES) || '{}'); }
    catch (_) { return {}; }
  }
  function saveProfiles(p) {
    try { localStorage.setItem(LS_PROFILES, JSON.stringify(p)); } catch (_) {}
  }
  function loadLastScript() {
    try { return localStorage.getItem(LS_LAST_SCRIPT) || ''; } catch (_) { return ''; }
  }
  function saveLastScript(s) {
    try { localStorage.setItem(LS_LAST_SCRIPT, s || ''); } catch (_) {}
  }

  function listVoices() {
    if (!window.speechSynthesis) return [];
    return window.speechSynthesis.getVoices() || [];
  }

  /* Parser. Splits the script into an ordered list of:
   *   { speaker: 'Narrator' | 'CharacterName', text: '...' }
   * Recognises:
   *   "NAME: dialogue"        (line starts with NAME:)
   *   "Name: dialogue"        (mixed case)
   *   '"quoted line"'         (a paragraph that's purely a quoted line,
   *                            still attributed to "Narrator" unless
   *                            preceded by a dialog tag we can detect)
   * Everything else attributes to "Narrator".
   */
  function parseScript(text) {
    var lines = String(text || '').split(/\r?\n/);
    var out = [];
    var nameRe = /^\s*([A-Z][A-Za-z0-9 _'\-]{0,30})\s*[:—]\s*(.+)$/;
    lines.forEach(function (raw) {
      var line = raw.replace(/\s+$/, '');
      if (!line.trim()) return;
      var m = line.match(nameRe);
      if (m && /^[A-Z]/.test(m[1])) {
        out.push({ speaker: m[1].trim(), text: m[2].trim() });
        return;
      }
      // Pure quoted line — still narrator unless we detect a tag
      out.push({ speaker: 'Narrator', text: line.trim() });
    });
    return out;
  }

  function uniqueSpeakers(parsedLines) {
    var seen = {};
    var order = [];
    parsedLines.forEach(function (l) {
      if (!seen[l.speaker]) { seen[l.speaker] = true; order.push(l.speaker); }
    });
    if (order.indexOf('Narrator') < 0) order.unshift('Narrator');
    return order;
  }

  function defaultProfileFor(name) {
    return {
      voiceName: '',
      rate: 1,
      pitch: 1,
      volume: 1,
      note: name === 'Narrator' ? 'Narrator voice' : ''
    };
  }

  function speakLine(line, profile, opts) {
    opts = opts || {};
    if (!window.speechSynthesis) return null;
    var u = new SpeechSynthesisUtterance(line);
    u.rate = profile.rate || 1;
    u.pitch = profile.pitch || 1;
    u.volume = (profile.volume == null) ? 1 : profile.volume;
    if (profile.voiceName) {
      var v = listVoices().filter(function (vv) { return vv.name === profile.voiceName; })[0];
      if (v) u.voice = v;
    }
    if (opts.onstart) u.onstart = opts.onstart;
    if (opts.onend) u.onend = opts.onend;
    if (opts.onerror) u.onerror = opts.onerror;
    try { window.speechSynthesis.speak(u); } catch (_) {}
    return u;
  }

  function stopSpeech() {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) {}
  }

  /* Estimate duration in seconds for a line at a given rate.
   * ~12 chars/sec at rate 1.0 — slightly slower than the ACR
   * watchdog estimate so timeline blocks don't undershoot.
   */
  function estimateSeconds(text, rate) {
    var r = (typeof rate === 'number' && rate > 0) ? rate : 1;
    return Math.max(1.5, (text.length / 12) / r);
  }

  /* Build the studio panel.
   * Bridges: opts.onAddTextLines, opts.onAddAudioBlob
   */
  function open(opts) {
    opts = opts || {};
    var prev = document.getElementById('cvs-modal');
    if (prev) prev.remove();

    var profiles = loadProfiles();
    var script = loadLastScript();
    var parsed = [];
    var speakers = [];

    var modal = document.createElement('div');
    modal.id = 'cvs-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,20,0.78);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML =
      '<div id="cvs-box" style="background:#1a1a26;color:#fff;border-radius:18px;width:100%;max-width:780px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.55);border:1px solid #2a2a40;overflow:hidden;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #2a2a40;flex-shrink:0;">' +
          '<h2 style="margin:0;font-size:18px;font-weight:800;">🎭 Character Voice Studio</h2>' +
          '<button id="cvs-close" style="background:transparent;border:none;color:#cfcfdc;font-size:24px;cursor:pointer;line-height:1;">×</button>' +
        '</div>' +
        '<div style="overflow-y:auto;padding:14px 18px;flex:1;">' +
          '<div style="margin-bottom:12px;">' +
            '<label style="font-size:12px;color:#a8a8c4;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">Script</label>' +
            '<textarea id="cvs-script" rows="6" placeholder="Paste a script. Use NAME: or Name: prefixes for character lines, e.g.&#10;&#10;NARRATOR: It was a stormy night.&#10;JONAH: I will not go to Nineveh.&#10;CAPTAIN: Wake up, sleeper!" style="width:100%;background:#0e0e18;color:#fff;border:1px solid #2a2a40;border-radius:10px;padding:10px 12px;font-size:14px;font-family:inherit;resize:vertical;margin-top:6px;"></textarea>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">' +
              '<button id="cvs-parse" style="background:#fbbf24;color:#1a1a26;border:none;border-radius:8px;padding:8px 14px;font-weight:800;cursor:pointer;">↻ Detect characters</button>' +
              '<label style="background:#2a2a40;color:#cfcfdc;border-radius:8px;padding:8px 14px;cursor:pointer;font-weight:600;font-size:13px;">📄 Import .txt<input id="cvs-file" type="file" accept=".txt,text/plain" style="display:none;"></label>' +
              '<button id="cvs-clear" style="background:transparent;color:#a8a8c4;border:1px solid #2a2a40;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer;">Clear</button>' +
            '</div>' +
          '</div>' +
          '<div id="cvs-cast"></div>' +
          '<div id="cvs-lines"></div>' +
        '</div>' +
        '<div style="padding:12px 18px;border-top:1px solid #2a2a40;display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0;">' +
          '<button id="cvs-preview-scene" style="background:#22c55e;color:#0a0a14;border:none;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer;flex:1;min-width:160px;">▶ Preview full scene</button>' +
          '<button id="cvs-stop" style="background:#2a2a40;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer;">■ Stop</button>' +
          '<button id="cvs-add-text" style="background:#1d6fff;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer;flex:1;min-width:160px;">＋ Add to timeline (text)</button>' +
          '<button id="cvs-add-audio" style="background:#a855f7;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer;flex:1;min-width:160px;">🎙 Record + add audio</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    var scriptEl   = modal.querySelector('#cvs-script');
    var castEl     = modal.querySelector('#cvs-cast');
    var linesEl    = modal.querySelector('#cvs-lines');
    var fileEl     = modal.querySelector('#cvs-file');

    if (script) scriptEl.value = script;

    function close() { stopSpeech(); try { modal.remove(); } catch (_) {} }
    modal.querySelector('#cvs-close').addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

    function renderCast() {
      castEl.innerHTML = '';
      if (!speakers.length) { castEl.innerHTML = '<p style="color:#a8a8c4;font-size:13px;">Tap “Detect characters” after pasting your script.</p>'; return; }
      var voices = listVoices();
      var voiceOpts = '<option value="">(System default)</option>' +
        voices.map(function (v) {
          return '<option value="' + escAttr(v.name) + '">' + escHtml(v.name) + ' (' + escHtml(v.lang || '') + ')</option>';
        }).join('');
      var head = document.createElement('div');
      head.style.cssText = 'font-size:12px;color:#a8a8c4;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;margin:14px 0 6px;';
      head.textContent = 'Cast — ' + speakers.length + ' voice' + (speakers.length === 1 ? '' : 's');
      castEl.appendChild(head);
      speakers.forEach(function (name) {
        var p = profiles[name] || defaultProfileFor(name);
        profiles[name] = p;
        var row = document.createElement('div');
        row.className = 'cvs-cast-row';
        row.style.cssText = 'background:#0e0e18;border:1px solid #2a2a40;border-radius:12px;padding:10px 12px;margin-bottom:8px;';
        row.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px;">' +
            '<strong style="font-size:14px;">' + (name === 'Narrator' ? '📖 ' : '🗣 ') + escHtml(name) + '</strong>' +
            '<button data-cvs-preview-char="' + escAttr(name) + '" style="background:#2a2a40;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">▶ Preview</button>' +
          '</div>' +
          '<label style="font-size:11px;color:#a8a8c4;display:block;margin-bottom:4px;">Voice</label>' +
          '<select data-cvs-prof="' + escAttr(name) + '" data-field="voiceName" style="width:100%;background:#1a1a26;color:#fff;border:1px solid #2a2a40;border-radius:8px;padding:7px 9px;font-size:13px;margin-bottom:8px;">' + voiceOpts + '</select>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;">' +
            sliderHtml(name, 'rate', 'Rate', p.rate, 0.5, 2, 0.05) +
            sliderHtml(name, 'pitch', 'Pitch', p.pitch, 0, 2, 0.05) +
            sliderHtml(name, 'volume', 'Volume', p.volume, 0, 1, 0.05) +
          '</div>';
        castEl.appendChild(row);
        // Restore saved voice
        var sel = row.querySelector('[data-field="voiceName"]');
        if (sel && p.voiceName) sel.value = p.voiceName;
      });
      // Wire field updates
      Array.prototype.forEach.call(castEl.querySelectorAll('[data-cvs-prof]'), function (el) {
        el.addEventListener('input', function () {
          var n = el.getAttribute('data-cvs-prof');
          var f = el.getAttribute('data-field');
          var v = el.value;
          if (f !== 'voiceName') v = parseFloat(v);
          profiles[n] = profiles[n] || defaultProfileFor(n);
          profiles[n][f] = v;
          var lbl = el.parentNode.querySelector('[data-cvs-val]');
          if (lbl && f !== 'voiceName') lbl.textContent = (+v).toFixed(2);
          saveProfiles(profiles);
        });
        el.addEventListener('change', function () { saveProfiles(profiles); });
      });
      Array.prototype.forEach.call(castEl.querySelectorAll('[data-cvs-preview-char]'), function (b) {
        b.addEventListener('click', function () {
          var n = b.getAttribute('data-cvs-preview-char');
          var sample = parsed.filter(function (l) { return l.speaker === n; })[0];
          if (!sample) sample = { speaker: n, text: 'This is the voice of ' + n + '.' };
          stopSpeech();
          speakLine(sample.text, profiles[n] || defaultProfileFor(n));
        });
      });
    }

    function sliderHtml(name, field, label, val, min, max, step) {
      return (
        '<div>' +
          '<label style="font-size:11px;color:#a8a8c4;display:flex;justify-content:space-between;">' +
            '<span>' + label + '</span><span data-cvs-val>' + (+val).toFixed(2) + '</span>' +
          '</label>' +
          '<input data-cvs-prof="' + escAttr(name) + '" data-field="' + field + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" style="width:100%;accent-color:#fbbf24;">' +
        '</div>'
      );
    }

    function renderLines() {
      linesEl.innerHTML = '';
      if (!parsed.length) return;
      var head = document.createElement('div');
      head.style.cssText = 'font-size:12px;color:#a8a8c4;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;margin:14px 0 6px;';
      head.textContent = 'Lines — ' + parsed.length;
      linesEl.appendChild(head);
      parsed.forEach(function (l, i) {
        var row = document.createElement('div');
        row.style.cssText = 'background:#0e0e18;border:1px solid #2a2a40;border-radius:10px;padding:8px 10px;margin-bottom:6px;display:flex;align-items:center;gap:8px;';
        var speakerOpts = speakers.map(function (s) {
          return '<option value="' + escAttr(s) + '"' + (s === l.speaker ? ' selected' : '') + '>' + escHtml(s) + '</option>';
        }).join('');
        row.innerHTML =
          '<button data-cvs-preview-line="' + i + '" style="background:#2a2a40;color:#fff;border:none;border-radius:6px;width:32px;height:32px;cursor:pointer;flex-shrink:0;">▶</button>' +
          '<select data-cvs-reassign="' + i + '" style="background:#1a1a26;color:#fff;border:1px solid #2a2a40;border-radius:6px;padding:5px 7px;font-size:12px;flex-shrink:0;">' + speakerOpts + '</select>' +
          '<span style="flex:1;font-size:13px;line-height:1.35;color:#cfcfdc;">' + escHtml(l.text) + '</span>';
        linesEl.appendChild(row);
      });
      Array.prototype.forEach.call(linesEl.querySelectorAll('[data-cvs-preview-line]'), function (b) {
        b.addEventListener('click', function () {
          var idx = +b.getAttribute('data-cvs-preview-line');
          var l = parsed[idx]; if (!l) return;
          stopSpeech();
          speakLine(l.text, profiles[l.speaker] || defaultProfileFor(l.speaker));
        });
      });
      Array.prototype.forEach.call(linesEl.querySelectorAll('[data-cvs-reassign]'), function (sel) {
        sel.addEventListener('change', function () {
          var idx = +sel.getAttribute('data-cvs-reassign');
          if (parsed[idx]) parsed[idx].speaker = sel.value;
        });
      });
    }

    function detect() {
      var text = scriptEl.value || '';
      saveLastScript(text);
      parsed = parseScript(text);
      speakers = uniqueSpeakers(parsed);
      // Ensure profile entries exist for every detected speaker
      speakers.forEach(function (s) { if (!profiles[s]) profiles[s] = defaultProfileFor(s); });
      saveProfiles(profiles);
      renderCast();
      renderLines();
    }

    modal.querySelector('#cvs-parse').addEventListener('click', detect);
    modal.querySelector('#cvs-clear').addEventListener('click', function () {
      scriptEl.value = '';
      saveLastScript('');
      parsed = []; speakers = [];
      renderCast(); renderLines();
    });
    fileEl.addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () { scriptEl.value = String(fr.result || ''); detect(); };
      fr.readAsText(f);
    });

    // Live preview chain — speak each line in order, advancing on
    // utterance end. Re-uses the speakLine helper so a single voice
    // queue plays through the whole scene.
    var previewIdx = 0, previewing = false;
    function previewScene() {
      stopSpeech();
      previewing = true; previewIdx = 0;
      next();
      function next() {
        if (!previewing || previewIdx >= parsed.length) { previewing = false; return; }
        var l = parsed[previewIdx++];
        speakLine(l.text, profiles[l.speaker] || defaultProfileFor(l.speaker), { onend: next, onerror: next });
      }
    }
    modal.querySelector('#cvs-preview-scene').addEventListener('click', previewScene);
    modal.querySelector('#cvs-stop').addEventListener('click', function () { previewing = false; stopSpeech(); });

    // Add to timeline as text track
    modal.querySelector('#cvs-add-text').addEventListener('click', function () {
      if (!parsed.length) { alert('Detect characters first.'); return; }
      if (typeof opts.onAddTextLines !== 'function') { alert('No editor open. Open a video in the editor first, then re-open the studio from there to add to its timeline.'); return; }
      var lines = parsed.map(function (l) {
        var p = profiles[l.speaker] || defaultProfileFor(l.speaker);
        return {
          speaker: l.speaker,
          text: l.speaker + ': ' + l.text,
          dur: estimateSeconds(l.text, p.rate)
        };
      });
      opts.onAddTextLines(lines);
      close();
    });

    // Record per-line via mic, assemble into a single audio blob,
    // hand off to Load's timeline. iPad-compatible (MediaRecorder +
    // getUserMedia).
    modal.querySelector('#cvs-add-audio').addEventListener('click', async function () {
      if (typeof opts.onAddAudioBlob !== 'function') { alert('No editor open. Open a video in the editor first, then re-open the studio from there to add audio to its timeline.'); return; }
      if (!navigator.mediaDevices || !window.MediaRecorder) { alert('Microphone recording is not supported on this device.'); return; }
      var btn = this;
      var orig = btn.textContent;
      btn.disabled = true;
      try {
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        var mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
                 : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4'
                 : '';
        var chunks = [];
        var rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        var stopped = new Promise(function (res) { rec.onstop = res; });
        if (!parsed.length) {
          // FREE-RECORDING path — no script needed. One start, one
          // stop, one audio clip. The user gets a confirm to start
          // and a second confirm to stop.
          btn.textContent = 'Recording…';
          var goAhead = confirm('No script detected.\n\nTap OK to start a free recording, then OK again to stop.');
          if (!goAhead) { stream.getTracks().forEach(function (t) { t.stop(); }); btn.textContent = orig; btn.disabled = false; return; }
          rec.start();
          alert('Recording: speak now. Tap OK when done.');
          rec.stop();
        } else {
          // SCRIPTED path — record line by line.
          for (var i = 0; i < parsed.length; i++) {
            var l = parsed[i];
            btn.textContent = 'Recording line ' + (i + 1) + '/' + parsed.length + ' …';
            var ok = confirm('Line ' + (i + 1) + ' / ' + parsed.length + '\n' +
              l.speaker + ': ' + l.text + '\n\nTap OK to start recording, then OK again to stop.');
            if (!ok) { rec.stop(); stream.getTracks().forEach(function (t) { t.stop(); }); btn.textContent = orig; btn.disabled = false; return; }
            if (rec.state === 'inactive') rec.start();
            alert('Recording: speak now. Tap OK when done.');
          }
          rec.stop();
        }
        stream.getTracks().forEach(function (t) { t.stop(); });
        await stopped;
        var blob = new Blob(chunks, { type: mime || 'audio/webm' });
        opts.onAddAudioBlob(blob, 'voice-' + (parsed.length ? 'scene' : 'clip') + '-' + Date.now() + (mime.indexOf('mp4') >= 0 ? '.m4a' : '.webm'));
        close();
      } catch (e) {
        alert('Recording failed: ' + ((e && e.message) || e));
        btn.textContent = orig; btn.disabled = false;
      }
    });

    function escHtml(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function escAttr(s) { return escHtml(s).replace(/"/g,'&quot;'); }

    // First render
    if (script) detect(); else { renderCast(); renderLines(); }
  }

  /* Sound Studio — quick voice recorder + FX. Tier-1 of the user's
   * "funny voice changer" spec: record once, slap any preset onto
   * the sample (chipmunk / robot / ghost / telephone / etc.), preview
   * instantly, save or share.
   */
  function openSoundStudio(opts) {
    opts = opts || {};
    var prev = document.getElementById('cvs-fx-modal');
    if (prev) prev.remove();

    var lastBuffer = null;       // raw recorded AudioBuffer
    var lastFxBuffer = null;     // post-FX buffer (used for save/share)
    var lastFxKey = 'none';
    var rec = null, recStream = null, recChunks = [], recBlob = null;
    var ctx = null;
    var playingSrc = null;       // current preview BufferSource

    var presets = (window.VoiceFX && window.VoiceFX.PRESETS) || [{ key: 'none', label: 'No effect', icon: '🎙', note: '' }];

    var modal = document.createElement('div');
    modal.id = 'cvs-fx-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,20,0.78);z-index:9550;display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML =
      '<div style="background:#1a1a26;color:#fff;border-radius:18px;width:100%;max-width:720px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.55);border:1px solid #2a2a40;overflow:hidden;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #2a2a40;flex-shrink:0;">' +
          '<h2 style="margin:0;font-size:18px;font-weight:800;">🎤 Sound Studio · Voice FX</h2>' +
          '<button id="cvsfx-close" style="background:transparent;border:none;color:#cfcfdc;font-size:24px;cursor:pointer;line-height:1;">×</button>' +
        '</div>' +
        '<div style="overflow-y:auto;padding:14px 18px;flex:1;">' +
          '<div id="cvsfx-rec-row" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">' +
            '<button id="cvsfx-rec" style="background:#ff3b5c;color:#fff;border:none;border-radius:50%;width:64px;height:64px;font-size:24px;cursor:pointer;flex-shrink:0;">⏺</button>' +
            '<div style="flex:1;min-width:180px;">' +
              '<div id="cvsfx-status" style="font-size:14px;font-weight:700;">Tap ⏺ to record. Speak, then tap ■ to stop.</div>' +
              '<div id="cvsfx-time" style="font-size:13px;color:#a8a8c4;font-variant-numeric:tabular-nums;">0:00</div>' +
            '</div>' +
            '<button id="cvsfx-import" style="background:#2a2a40;color:#fff;border:none;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;">📂 Import audio</button>' +
            '<input id="cvsfx-import-file" type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac,.aiff,.aif,.webm,.weba,.opus" style="display:none;">' +
          '</div>' +
          '<div id="cvsfx-fx-section" style="display:none;">' +
            '<div style="font-size:12px;color:#a8a8c4;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:6px;">Effect</div>' +
            '<div id="cvsfx-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;"></div>' +
          '</div>' +
        '</div>' +
        '<div style="padding:12px 18px;border-top:1px solid #2a2a40;display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0;">' +
          '<button id="cvsfx-play" style="background:#22c55e;color:#0a0a14;border:none;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer;flex:1;min-width:130px;" disabled>▶ Preview</button>' +
          '<button id="cvsfx-stop" style="background:#2a2a40;color:#fff;border:none;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;">■</button>' +
          '<button id="cvsfx-add" style="background:#1d6fff;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer;flex:1;min-width:130px;" disabled>＋ Add to timeline</button>' +
          '<button id="cvsfx-save" style="background:#fbbf24;color:#1a1a26;border:none;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer;flex:1;min-width:130px;" disabled>💾 Save file</button>' +
          '<button id="cvsfx-share" style="background:#a855f7;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer;flex:1;min-width:130px;" disabled>↗ Share</button>' +
          '<button id="cvsfx-lib" style="background:#0e0e18;color:#fbbf24;border:1px solid #fbbf24;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer;flex:1;min-width:140px;" disabled>📚 Save to Library</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    function close() { stopPlay(); stopRec(); try { modal.remove(); } catch (_) {} }
    modal.querySelector('#cvsfx-close').addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

    var statusEl = modal.querySelector('#cvsfx-status');
    var timeEl   = modal.querySelector('#cvsfx-time');
    var recBtn   = modal.querySelector('#cvsfx-rec');
    var fxSec    = modal.querySelector('#cvsfx-fx-section');
    var gridEl   = modal.querySelector('#cvsfx-grid');
    var playBtn  = modal.querySelector('#cvsfx-play');
    var stopBtn  = modal.querySelector('#cvsfx-stop');
    var addBtn   = modal.querySelector('#cvsfx-add');
    var saveBtn  = modal.querySelector('#cvsfx-save');
    var shareBtn = modal.querySelector('#cvsfx-share');
    var libBtn   = modal.querySelector('#cvsfx-lib');
    var importBtn= modal.querySelector('#cvsfx-import');
    var importFile=modal.querySelector('#cvsfx-import-file');

    function ensureCtx() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }

    function renderGrid() {
      gridEl.innerHTML = '';
      presets.forEach(function (p) {
        var b = document.createElement('button');
        b.dataset.fx = p.key;
        b.style.cssText = 'background:#0e0e18;border:1.5px solid ' + (p.key === lastFxKey ? '#fbbf24' : '#2a2a40') +
          ';color:#fff;border-radius:10px;padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;font-family:inherit;';
        b.innerHTML =
          '<span style="font-size:22px;">' + p.icon + '</span>' +
          '<span style="font-size:12px;font-weight:700;text-align:center;">' + p.label + '</span>';
        b.title = p.note || '';
        b.addEventListener('click', function () { selectFx(p.key); });
        gridEl.appendChild(b);
      });
    }

    async function selectFx(key) {
      if (!lastBuffer) return;
      lastFxKey = key;
      Array.prototype.forEach.call(gridEl.querySelectorAll('[data-fx]'), function (b) {
        b.style.borderColor = b.getAttribute('data-fx') === key ? '#fbbf24' : '#2a2a40';
      });
      statusEl.textContent = 'Applying ' + key + '…';
      try {
        if (window.VoiceFX && VoiceFX.applyToBuffer) {
          lastFxBuffer = await VoiceFX.applyToBuffer(lastBuffer, key);
        } else {
          lastFxBuffer = lastBuffer;
        }
        statusEl.textContent = 'Ready — preview, save, share, or add to timeline.';
        playBtn.disabled = false; addBtn.disabled = false; saveBtn.disabled = false;
        shareBtn.disabled = !(navigator.share && (lastFxBuffer || lastBuffer));
        if (libBtn) libBtn.disabled = !window.VoiceLibrary;
      } catch (e) {
        statusEl.textContent = 'FX failed: ' + ((e && e.message) || e);
      }
    }

    function stopPlay() {
      if (playingSrc) { try { playingSrc.stop(); } catch (_) {} try { playingSrc.disconnect(); } catch (_) {} playingSrc = null; }
    }
    playBtn.addEventListener('click', function () {
      if (!lastFxBuffer) return;
      stopPlay();
      var c = ensureCtx();
      try { c.resume(); } catch (_) {}
      var s = c.createBufferSource(); s.buffer = lastFxBuffer; s.connect(c.destination); s.start(); playingSrc = s;
      statusEl.textContent = 'Playing — ' + lastFxKey + '…';
      s.onended = function () { if (playingSrc === s) { playingSrc = null; statusEl.textContent = 'Done.'; } };
    });
    stopBtn.addEventListener('click', stopPlay);

    function bufToWavBlob(buf) {
      var nCh = buf.numberOfChannels, sr = buf.sampleRate, len = buf.length * nCh * 2 + 44;
      var ab = new ArrayBuffer(len), v = new DataView(ab), off = 0;
      function ws(s) { for (var i = 0; i < s.length; i++) v.setUint8(off++, s.charCodeAt(i)); }
      function w16(n) { v.setUint16(off, n, true); off += 2; }
      function w32(n) { v.setUint32(off, n, true); off += 4; }
      ws('RIFF'); w32(len - 8); ws('WAVE'); ws('fmt '); w32(16); w16(1); w16(nCh); w32(sr); w32(sr * nCh * 2); w16(nCh * 2); w16(16); ws('data'); w32(buf.length * nCh * 2);
      var chs = []; for (var c = 0; c < nCh; c++) chs.push(buf.getChannelData(c));
      for (var i = 0; i < buf.length; i++) {
        for (var ch2 = 0; ch2 < nCh; ch2++) {
          var s = Math.max(-1, Math.min(1, chs[ch2][i]));
          v.setInt16(off, s < 0 ? s * 32768 : s * 32767, true); off += 2;
        }
      }
      return new Blob([ab], { type: 'audio/wav' });
    }

    addBtn.addEventListener('click', function () {
      if (!lastFxBuffer || typeof opts.onAddAudioBlob !== 'function') {
        if (!opts.onAddAudioBlob) alert('Open a video in the editor first to add audio to its timeline.');
        return;
      }
      opts.onAddAudioBlob(bufToWavBlob(lastFxBuffer), 'voicefx-' + lastFxKey + '-' + Date.now() + '.wav');
      close();
    });
    saveBtn.addEventListener('click', function () {
      if (!lastFxBuffer) return;
      var blob = bufToWavBlob(lastFxBuffer);
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'voicefx-' + lastFxKey + '-' + Date.now() + '.wav';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    });
    shareBtn.addEventListener('click', async function () {
      if (!lastFxBuffer || !navigator.share) return;
      var blob = bufToWavBlob(lastFxBuffer);
      var f = new File([blob], 'voicefx-' + lastFxKey + '.wav', { type: 'audio/wav' });
      try {
        if (navigator.canShare && !navigator.canShare({ files: [f] })) throw new Error('share-files-unsupported');
        await navigator.share({ files: [f], title: 'Voice FX', text: 'Voice with ' + lastFxKey + ' effect' });
      } catch (e) {
        // Fall back: just trigger download
        saveBtn.click();
      }
    });
    if (libBtn) libBtn.addEventListener('click', async function () {
      if (!lastFxBuffer || !window.VoiceLibrary) return;
      var name = prompt('Save as (name this voice clip):', 'Voice ' + lastFxKey + ' ' + new Date().toLocaleString());
      if (name == null) return;
      try {
        var blob = bufToWavBlob(lastFxBuffer);
        await VoiceLibrary.save(blob, { name: name.trim() || ('Voice ' + lastFxKey), durationSec: lastFxBuffer.duration, mime: 'audio/wav' });
        statusEl.textContent = '✓ Saved to Voice Library.';
      } catch (e) { statusEl.textContent = 'Save failed: ' + ((e && e.message) || e); }
    });

    function startRec() {
      if (!navigator.mediaDevices || !window.MediaRecorder) { statusEl.textContent = 'Recording not supported on this device.'; return; }
      var mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
               : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        recStream = stream;
        recChunks = [];
        rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        rec.ondataavailable = function (e) { if (e.data && e.data.size) recChunks.push(e.data); };
        rec.onstop = onRecStopped;
        rec.start();
        recBtn.textContent = '■';
        recBtn.style.background = '#fbbf24'; recBtn.style.color = '#1a1a26';
        statusEl.textContent = 'Recording…';
        recStartedAt = Date.now();
        recTimer = setInterval(updateTime, 250);
      }).catch(function (e) {
        statusEl.textContent = 'Mic permission denied: ' + ((e && e.message) || e);
      });
    }
    function stopRec() {
      if (recTimer) { clearInterval(recTimer); recTimer = null; }
      if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch (_) {} }
      if (recStream) { try { recStream.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {} recStream = null; }
      recBtn.textContent = '⏺'; recBtn.style.background = '#ff3b5c'; recBtn.style.color = '#fff';
    }
    var recTimer = null, recStartedAt = 0;
    function updateTime() {
      var s = Math.floor((Date.now() - recStartedAt) / 1000);
      var m = Math.floor(s / 60); s = s % 60;
      timeEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    }
    async function onRecStopped() {
      var blob = new Blob(recChunks, { type: rec && rec.mimeType ? rec.mimeType : 'audio/webm' });
      recBlob = blob;
      statusEl.textContent = 'Decoding…';
      try {
        var c = ensureCtx();
        var buf = await c.decodeAudioData(await blob.arrayBuffer());
        lastBuffer = buf;
        fxSec.style.display = '';
        renderGrid();
        await selectFx('none');
      } catch (e) {
        statusEl.textContent = 'Decode failed: ' + ((e && e.message) || e);
      }
    }
    recBtn.addEventListener('click', function () {
      if (rec && rec.state === 'recording') stopRec(); else startRec();
    });

    importBtn.addEventListener('click', function () { importFile.click(); });
    importFile.addEventListener('change', async function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      statusEl.textContent = 'Decoding ' + f.name + '…';
      try {
        var c = ensureCtx();
        var buf = await c.decodeAudioData(await f.arrayBuffer());
        lastBuffer = buf;
        fxSec.style.display = '';
        renderGrid();
        await selectFx('none');
      } catch (err) {
        statusEl.textContent = 'Could not decode: ' + ((err && err.message) || err);
      }
      importFile.value = '';
    });
  }

  /* Voice Manipulator — dedicated panel for fine-grained control
   * (pitch -12..+12, speed 0.5..2x, 3-band EQ, reverb/echo/dist
   * + dry/wet, style presets, real-time preview, Apply, Reset).
   * Uses lib-voice-manipulator.js for the DSP. */
  function openManipulator(opts) {
    opts = opts || {};
    if (!window.VoiceManipulator) { alert('Voice Manipulator module did not load.'); return; }
    var prev = document.getElementById('cvs-vm-modal');
    if (prev) prev.remove();

    var sourceBuf = null;     // original recorded/imported buffer
    var processedBuf = null;  // most-recent rendered output
    var ctx = null;
    var playingSrc = null;
    var renderToken = 0;      // bumps per render; older renders self-cancel

    var state = {
      pitchSemitones: 0, speed: 1.0,
      eqLow: 0, eqMid: 0, eqHigh: 0,
      reverb: 0, echo: 0, distortion: 0, wet: 1
    };

    var modal = document.createElement('div');
    modal.id = 'cvs-vm-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,20,0.78);z-index:9550;display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML =
      '<div style="background:#1a1a26;color:#fff;border-radius:18px;width:100%;max-width:760px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.55);border:1px solid #2a2a40;overflow:hidden;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #2a2a40;flex-shrink:0;">' +
          '<h2 style="margin:0;font-size:18px;font-weight:800;">🎚 Voice Manipulator</h2>' +
          '<button id="vm-close" style="background:transparent;border:none;color:#cfcfdc;font-size:24px;cursor:pointer;line-height:1;">×</button>' +
        '</div>' +
        '<div id="vm-body" style="overflow-y:auto;padding:14px 18px;flex:1;">' +
          '<div id="vm-source" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">' +
            '<button id="vm-rec" style="background:#ff3b5c;color:#fff;border:none;border-radius:50%;width:56px;height:56px;font-size:22px;cursor:pointer;flex-shrink:0;">⏺</button>' +
            '<div style="flex:1;min-width:160px;">' +
              '<div id="vm-status" style="font-size:13px;font-weight:700;">Tap ⏺ to record, or import audio.</div>' +
              '<div id="vm-info" style="font-size:12px;color:#a8a8c4;font-variant-numeric:tabular-nums;">No source loaded</div>' +
            '</div>' +
            '<button id="vm-import" style="background:#2a2a40;color:#fff;border:none;border-radius:8px;padding:9px 12px;font-weight:700;cursor:pointer;">📂 Import</button>' +
            '<input id="vm-import-file" type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac,.aiff,.aif,.webm,.weba,.opus" style="display:none;">' +
          '</div>' +
          '<div id="vm-controls" style="display:none;">' +
            '<div class="vm-section">' +
              '<h3>Pitch & Speed</h3>' +
              vmSliderHtml('pitchSemitones', 'Pitch', -12, 12, 1, 0, 'st', 'Lower deeper · Higher higher') +
              vmSliderHtml('speed', 'Speed', 0.5, 2, 0.05, 1, '×', 'Tortoise → Rabbit (timing only — pitch preserved)') +
            '</div>' +
            '<div class="vm-section">' +
              '<h3>Tone (EQ)</h3>' +
              vmSliderHtml('eqLow', 'Low', -12, 12, 1, 0, 'dB', 'Bass / warmth') +
              vmSliderHtml('eqMid', 'Mid', -12, 12, 1, 0, 'dB', 'Clarity / presence') +
              vmSliderHtml('eqHigh', 'High', -12, 12, 1, 0, 'dB', 'Air / brightness') +
            '</div>' +
            '<div class="vm-section">' +
              '<h3>Effects</h3>' +
              vmSliderHtml('reverb', 'Reverb', 0, 1, 0.05, 0, '', 'Room size feel') +
              vmSliderHtml('echo', 'Echo', 0, 1, 0.05, 0, '', 'Delay repeats') +
              vmSliderHtml('distortion', 'Distortion', 0, 1, 0.05, 0, '', 'Grit / robot edge') +
              vmSliderHtml('wet', 'Dry / Wet', 0, 1, 0.05, 1, '', '0 = original · 1 = full effect') +
            '</div>' +
            '<div class="vm-section">' +
              '<h3>Voice style presets</h3>' +
              '<div id="vm-presets" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="padding:12px 18px;border-top:1px solid #2a2a40;display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0;">' +
          '<button id="vm-reset" style="background:transparent;color:#a8a8c4;border:1px solid #2a2a40;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;">↺ Reset</button>' +
          '<button id="vm-preview" style="background:#22c55e;color:#0a0a14;border:none;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer;flex:1;min-width:120px;" disabled>▶ Preview</button>' +
          '<button id="vm-stop" style="background:#2a2a40;color:#fff;border:none;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;">■</button>' +
          '<button id="vm-apply" style="background:#1d6fff;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer;flex:1;min-width:140px;" disabled>＋ Apply to timeline</button>' +
          '<button id="vm-save" style="background:#fbbf24;color:#1a1a26;border:none;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;" disabled>💾 Save</button>' +
          '<button id="vm-lib" style="background:#0e0e18;color:#fbbf24;border:1px solid #fbbf24;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;" disabled>📚 Library</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    // Inline styles for the Manipulator's own classes
    if (!document.getElementById('vm-style')) {
      var st = document.createElement('style');
      st.id = 'vm-style';
      st.textContent =
        '.vm-section{margin-bottom:14px;}' +
        '.vm-section h3{margin:0 0 8px;font-size:12px;color:#fbbf24;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;}' +
        '.vm-row{display:grid;grid-template-columns:90px 1fr 60px;align-items:center;gap:10px;margin-bottom:6px;}' +
        '.vm-row label{font-size:13px;font-weight:700;}' +
        '.vm-row .vm-hint{font-size:10px;color:#a8a8c4;font-weight:500;display:block;margin-top:1px;}' +
        '.vm-row input[type=range]{width:100%;accent-color:#fbbf24;}' +
        '.vm-row .vm-val{font-size:12px;color:#cfcfdc;text-align:right;font-variant-numeric:tabular-nums;}' +
        '.vm-preset{background:#0e0e18;border:1px solid #2a2a40;border-radius:10px;padding:8px 6px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:#fff;font-family:inherit;}' +
        '.vm-preset:hover{border-color:#fbbf24;}' +
        '.vm-preset .ic{font-size:20px;}' +
        '.vm-preset .lb{font-size:11px;font-weight:700;}';
      document.head.appendChild(st);
    }

    function vmSliderHtml(field, label, min, max, step, val, unit, hint) {
      return (
        '<div class="vm-row">' +
          '<label>' + label + '<span class="vm-hint">' + (hint || '') + '</span></label>' +
          '<input type="range" data-vm-field="' + field + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">' +
          '<span class="vm-val" data-vm-val="' + field + '">' + val + (unit || '') + '</span>' +
        '</div>'
      );
    }

    function close() { stopPlay(); try { modal.remove(); } catch (_) {} }
    modal.querySelector('#vm-close').addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

    var statusEl = modal.querySelector('#vm-status');
    var infoEl   = modal.querySelector('#vm-info');
    var ctrlsEl  = modal.querySelector('#vm-controls');
    var presetEl = modal.querySelector('#vm-presets');
    var previewBtn = modal.querySelector('#vm-preview');
    var applyBtn   = modal.querySelector('#vm-apply');
    var saveBtn    = modal.querySelector('#vm-save');
    var libBtn     = modal.querySelector('#vm-lib');

    function ensureCtx() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }

    function setSourceBuffer(buf, label) {
      sourceBuf = buf;
      processedBuf = buf;
      infoEl.textContent = (label || 'Audio') + ' · ' + buf.duration.toFixed(2) + 's · ' + buf.sampleRate + ' Hz · ' + buf.numberOfChannels + 'ch';
      statusEl.textContent = 'Source loaded — drag any slider to shape the voice.';
      ctrlsEl.style.display = '';
      previewBtn.disabled = false; applyBtn.disabled = false; saveBtn.disabled = false;
      if (libBtn) libBtn.disabled = !window.VoiceLibrary;
      renderPresets();
      schedulePreview();
    }

    function renderPresets() {
      presetEl.innerHTML = '';
      VoiceManipulator.STYLE_PRESETS.forEach(function (p) {
        var b = document.createElement('button');
        b.className = 'vm-preset';
        b.innerHTML = '<span class="ic">' + p.icon + '</span><span class="lb">' + p.label + '</span>';
        b.addEventListener('click', function () { applyPresetVals(p.vals); });
        presetEl.appendChild(b);
      });
    }
    function applyPresetVals(vals) {
      Object.keys(vals).forEach(function (k) { state[k] = vals[k]; });
      Array.prototype.forEach.call(modal.querySelectorAll('[data-vm-field]'), function (el) {
        var f = el.getAttribute('data-vm-field');
        el.value = state[f];
        var lbl = modal.querySelector('[data-vm-val="' + f + '"]');
        if (lbl) lbl.textContent = formatVal(f, state[f]);
      });
      schedulePreview();
    }
    function formatVal(field, val) {
      if (field === 'pitchSemitones') return (val > 0 ? '+' : '') + val + ' st';
      if (field === 'speed')          return (+val).toFixed(2) + '×';
      if (field === 'eqLow' || field === 'eqMid' || field === 'eqHigh') return (val > 0 ? '+' : '') + val + ' dB';
      return Math.round((+val) * 100) + '%';
    }

    // Slider events
    Array.prototype.forEach.call(modal.querySelectorAll('[data-vm-field]'), function (el) {
      el.addEventListener('input', function () {
        var f = el.getAttribute('data-vm-field');
        var v = parseFloat(el.value);
        state[f] = v;
        var lbl = modal.querySelector('[data-vm-val="' + f + '"]');
        if (lbl) lbl.textContent = formatVal(f, v);
        schedulePreview();
      });
    });

    // Debounced render. Cancels stale renders so the latest slider
    // value wins. Auto-plays when the new buffer is ready (only if
    // user is currently previewing or hasn't scrubbed).
    var renderTimer = null;
    function schedulePreview() {
      if (!sourceBuf) return;
      if (renderTimer) { clearTimeout(renderTimer); renderTimer = null; }
      renderTimer = setTimeout(runRender, 300);
    }
    async function runRender() {
      if (!sourceBuf) return;
      var token = ++renderToken;
      try {
        var out = await VoiceManipulator.process(sourceBuf, Object.assign({}, state));
        if (token !== renderToken) return; // stale
        processedBuf = out;
        // Auto-play newly-rendered buffer
        playProcessed();
      } catch (e) {
        statusEl.textContent = 'Render failed: ' + ((e && e.message) || e);
      }
    }
    function playProcessed() {
      if (!processedBuf) return;
      stopPlay();
      var c = ensureCtx();
      try { c.resume(); } catch (_) {}
      var s = c.createBufferSource(); s.buffer = processedBuf; s.connect(c.destination); s.start(); playingSrc = s;
      s.onended = function () { if (playingSrc === s) playingSrc = null; };
    }
    function stopPlay() {
      if (playingSrc) { try { playingSrc.stop(); } catch (_) {} try { playingSrc.disconnect(); } catch (_) {} playingSrc = null; }
    }
    previewBtn.addEventListener('click', playProcessed);
    modal.querySelector('#vm-stop').addEventListener('click', stopPlay);

    modal.querySelector('#vm-reset').addEventListener('click', function () {
      applyPresetVals({ pitchSemitones: 0, speed: 1.0, eqLow: 0, eqMid: 0, eqHigh: 0, reverb: 0, echo: 0, distortion: 0, wet: 1 });
    });

    function bufToWavBlob(buf) {
      var nCh = buf.numberOfChannels, sr = buf.sampleRate, len = buf.length * nCh * 2 + 44;
      var ab = new ArrayBuffer(len), v = new DataView(ab), off = 0;
      function ws(s) { for (var i = 0; i < s.length; i++) v.setUint8(off++, s.charCodeAt(i)); }
      function w16(n) { v.setUint16(off, n, true); off += 2; }
      function w32(n) { v.setUint32(off, n, true); off += 4; }
      ws('RIFF'); w32(len - 8); ws('WAVE'); ws('fmt '); w32(16); w16(1); w16(nCh); w32(sr); w32(sr * nCh * 2); w16(nCh * 2); w16(16); ws('data'); w32(buf.length * nCh * 2);
      var chs = []; for (var c = 0; c < nCh; c++) chs.push(buf.getChannelData(c));
      for (var i = 0; i < buf.length; i++) {
        for (var ch2 = 0; ch2 < nCh; ch2++) {
          var s = Math.max(-1, Math.min(1, chs[ch2][i]));
          v.setInt16(off, s < 0 ? s * 32768 : s * 32767, true); off += 2;
        }
      }
      return new Blob([ab], { type: 'audio/wav' });
    }
    applyBtn.addEventListener('click', function () {
      if (!processedBuf || typeof opts.onAddAudioBlob !== 'function') {
        if (!opts.onAddAudioBlob) alert('Open a video in the editor first to add audio to its timeline.');
        return;
      }
      opts.onAddAudioBlob(bufToWavBlob(processedBuf), 'voice-' + Date.now() + '.wav');
      close();
    });
    saveBtn.addEventListener('click', function () {
      if (!processedBuf) return;
      var blob = bufToWavBlob(processedBuf);
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'voice-manipulated-' + Date.now() + '.wav';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    });
    if (libBtn) libBtn.addEventListener('click', async function () {
      if (!processedBuf || !window.VoiceLibrary) return;
      var name = prompt('Save to Voice Library — name this clip:', 'Voice ' + new Date().toLocaleString());
      if (name == null) return;
      try {
        var blob = bufToWavBlob(processedBuf);
        await VoiceLibrary.save(blob, { name: name.trim() || 'Voice', durationSec: processedBuf.duration, mime: 'audio/wav' });
        statusEl.textContent = '✓ Saved to Voice Library.';
      } catch (e) { statusEl.textContent = 'Save failed: ' + ((e && e.message) || e); }
    });

    // Recording
    var rec = null, recStream = null, recChunks = [];
    function startRec() {
      if (!navigator.mediaDevices || !window.MediaRecorder) { statusEl.textContent = 'Recording not supported.'; return; }
      var mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
               : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        recStream = stream;
        recChunks = [];
        rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        rec.ondataavailable = function (e) { if (e.data && e.data.size) recChunks.push(e.data); };
        rec.onstop = onRecStopped;
        rec.start();
        statusEl.textContent = 'Recording…';
        modal.querySelector('#vm-rec').textContent = '■';
        modal.querySelector('#vm-rec').style.background = '#fbbf24';
        modal.querySelector('#vm-rec').style.color = '#1a1a26';
      }).catch(function (e) {
        statusEl.textContent = 'Mic permission denied: ' + ((e && e.message) || e);
      });
    }
    function stopRec() {
      if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch (_) {} }
      if (recStream) { try { recStream.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {} recStream = null; }
      modal.querySelector('#vm-rec').textContent = '⏺';
      modal.querySelector('#vm-rec').style.background = '#ff3b5c';
      modal.querySelector('#vm-rec').style.color = '#fff';
    }
    async function onRecStopped() {
      var blob = new Blob(recChunks, { type: rec && rec.mimeType ? rec.mimeType : 'audio/webm' });
      statusEl.textContent = 'Decoding…';
      try {
        var c = ensureCtx();
        var buf = await c.decodeAudioData(await blob.arrayBuffer());
        setSourceBuffer(buf, 'Recording');
      } catch (e) {
        statusEl.textContent = 'Decode failed: ' + ((e && e.message) || e);
      }
    }
    modal.querySelector('#vm-rec').addEventListener('click', function () {
      if (rec && rec.state === 'recording') stopRec(); else startRec();
    });

    var importBtn = modal.querySelector('#vm-import');
    var importFile= modal.querySelector('#vm-import-file');
    importBtn.addEventListener('click', function () { importFile.click(); });
    importFile.addEventListener('change', async function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      statusEl.textContent = 'Decoding ' + f.name + '…';
      try {
        var c = ensureCtx();
        var buf = await c.decodeAudioData(await f.arrayBuffer());
        setSourceBuffer(buf, f.name);
      } catch (err) {
        statusEl.textContent = 'Could not decode: ' + ((err && err.message) || err);
      }
      importFile.value = '';
    });

    // If caller handed us a starting buffer, load it now
    if (opts.sourceBuffer) {
      try { setSourceBuffer(opts.sourceBuffer, opts.sourceLabel || 'Audio'); }
      catch (_) {}
    }
  }

  global.CharacterVoiceStudio = {
    open: open,
    openSoundStudio: openSoundStudio,
    openManipulator: openManipulator,
    parseScript: parseScript,
    estimateSeconds: estimateSeconds
  };
})(typeof window !== 'undefined' ? window : globalThis);
