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
      if (!parsed.length) { alert('Detect characters first.'); return; }
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
        for (var i = 0; i < parsed.length; i++) {
          var l = parsed[i];
          btn.textContent = 'Recording line ' + (i + 1) + '/' + parsed.length + ' …';
          var ok = confirm('Line ' + (i + 1) + ' / ' + parsed.length + '\n' +
            l.speaker + ': ' + l.text + '\n\nTap OK to start recording, then OK again to stop.');
          if (!ok) { rec.stop(); stream.getTracks().forEach(function (t) { t.stop(); }); btn.textContent = orig; btn.disabled = false; return; }
          if (rec.state === 'inactive') rec.start();
          // Single-utterance gate — user controls stop with confirm
          alert('Recording: speak now. Tap OK when done.');
        }
        rec.stop();
        stream.getTracks().forEach(function (t) { t.stop(); });
        await stopped;
        var blob = new Blob(chunks, { type: mime || 'audio/webm' });
        opts.onAddAudioBlob(blob, 'voice-scene-' + Date.now() + (mime.indexOf('mp4') >= 0 ? '.m4a' : '.webm'));
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

  global.CharacterVoiceStudio = {
    open: open,
    parseScript: parseScript,
    estimateSeconds: estimateSeconds
  };
})(typeof window !== 'undefined' ? window : globalThis);
