/* Piper voices — shared panel UI for ACR main / ACR Study / Attain.
 * Copyright (c) 2026 LBond. All Rights Reserved.
 *
 * Loaded after piper-voices.js. Exposes window.PiperPanel.open(lsKey)
 * which creates (once) a floating panel with install/remove/select
 * controls for neural voices. The lsKey is the localStorage key each
 * app uses to store the user's preferred Piper voice ID ("" = none).
 */
(function (global) {
  'use strict';

  var PANEL_ID = 'piper-panel-root';
  var STYLE_ID = 'piper-panel-styles';
  var lsKey = 'acr_piper_voice';

  function openPanel(key) {
    lsKey = key || lsKey;
    injectStyles();
    var root = document.getElementById(PANEL_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = PANEL_ID;
      root.className = 'piper-panel-scrim';
      document.body.appendChild(root);
    }
    root.innerHTML =
      '<div class="piper-panel">' +
        '<div class="piper-panel-head">' +
          '<h3>Neural voices (Piper)</h3>' +
          '<button class="piper-close" aria-label="Close">&times;</button>' +
        '</div>' +
        '<p class="piper-note">High-quality offline voices powered by <a href="https://github.com/rhasspy/piper" target="_blank" rel="noopener">Piper TTS</a>. Each voice is ~63 MB and downloads once, then runs fully offline. Installed voices live on this device only.</p>' +
        '<div id="piper-voice-list" class="piper-voice-list">Loading…</div>' +
        '<p class="piper-status" id="piper-global-status"></p>' +
      '</div>';
    root.classList.add('on');
    root.querySelector('.piper-close').addEventListener('click', close);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    if (!global.PiperVoices || !global.PiperVoices.isSupported()) {
      document.getElementById('piper-voice-list').innerHTML =
        '<p class="piper-note error">Your browser doesn\'t support the features Piper needs (WebAssembly + IndexedDB). Web Speech voices still work.</p>';
      return;
    }
    render();
    global.PiperVoices.onStateChange(function (state, detail) {
      var s = document.getElementById('piper-global-status');
      if (!s) return;
      if (state === 'installing-voice')   s.textContent = 'Downloading ' + detail.voiceId + ' — ' + (detail.progress || 0) + '%';
      else if (state === 'voice-installed') { s.textContent = '✓ Installed ' + detail.voiceId; render(); }
      else if (state === 'voice-removed')   { s.textContent = 'Removed ' + detail.voiceId; render(); }
      else if (state === 'error')           s.textContent = '✗ ' + (detail && detail.message || 'Error');
      else if (state === 'loading-runtime') s.textContent = 'Loading Piper runtime…';
      else if (state === 'synthesizing')    s.textContent = 'Synthesizing…';
      else if (state === 'playing')         s.textContent = 'Playing…';
      else if (state === 'ended')           s.textContent = 'Done.';
    });
  }

  function close() {
    var root = document.getElementById(PANEL_ID);
    if (root) root.classList.remove('on');
  }

  async function render() {
    var list = document.getElementById('piper-voice-list');
    if (!list) return;
    var voices = global.PiperVoices.listVoices();
    var installed = await global.PiperVoices.installedVoices();
    var selected = '';
    try { selected = localStorage.getItem(lsKey) || ''; } catch (_) {}
    list.innerHTML = voices.map(function (v) {
      var isInstalled = installed.indexOf(v.id) >= 0;
      var isSelected = selected === v.id;
      return '<div class="piper-voice-row' + (isSelected ? ' selected' : '') + '" data-voice="' + v.id + '">' +
        '<div class="piper-voice-main">' +
          '<div class="piper-voice-label">' + v.label + '</div>' +
          '<div class="piper-voice-meta">~' + v.mb + ' MB &middot; ' + (isInstalled ? 'Installed' : 'Not installed') + (isSelected ? ' &middot; <strong>Active</strong>' : '') + '</div>' +
        '</div>' +
        '<div class="piper-voice-actions">' +
          (isInstalled
            ? (isSelected
                ? '<button data-act="clear">Use Web Speech instead</button>'
                : '<button data-act="use" class="primary">Use this voice</button>') +
              '<button data-act="remove" class="danger">Remove</button>'
            : '<button data-act="install" class="primary">Install (~' + v.mb + ' MB)</button>') +
        '</div>' +
      '</div>';
    }).join('');
    list.querySelectorAll('[data-voice]').forEach(function (row) {
      var voiceId = row.getAttribute('data-voice');
      row.querySelectorAll('[data-act]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var act = btn.getAttribute('data-act');
          if (act === 'install') {
            try { await global.PiperVoices.installVoice(voiceId); }
            catch (e) { /* error already surfaced via state listener */ }
          } else if (act === 'remove') {
            await global.PiperVoices.removeVoice(voiceId);
          } else if (act === 'use') {
            try { localStorage.setItem(lsKey, voiceId); } catch (_) {}
            render();
          } else if (act === 'clear') {
            try { localStorage.removeItem(lsKey); } catch (_) {}
            render();
          }
        });
      });
    });
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '#' + PANEL_ID + '{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:none;z-index:999;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:auto;}',
      '#' + PANEL_ID + '.on{display:flex;}',
      '#' + PANEL_ID + ' .piper-panel{background:#1a1a36;color:#e8e8ee;border:1px solid #2a2a4a;border-radius:12px;max-width:560px;width:100%;padding:20px 22px;font-family:-apple-system,BlinkMacSystemFont,"Atkinson Hyperlegible",sans-serif;box-shadow:0 12px 48px rgba(0,0,0,0.5);}',
      '#' + PANEL_ID + ' .piper-panel-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;}',
      '#' + PANEL_ID + ' .piper-panel h3{margin:0;flex:1;color:#b0b0ff;font-size:18px;}',
      '#' + PANEL_ID + ' .piper-close{background:none;border:none;color:#aaa;font-size:28px;line-height:1;cursor:pointer;padding:0 4px;}',
      '#' + PANEL_ID + ' .piper-close:hover{color:#fff;}',
      '#' + PANEL_ID + ' .piper-note{font-size:13px;line-height:1.6;color:#b0b0c8;margin:0 0 14px;}',
      '#' + PANEL_ID + ' .piper-note.error{color:#ff8a8a;}',
      '#' + PANEL_ID + ' .piper-note a{color:#b0b0ff;}',
      '#' + PANEL_ID + ' .piper-voice-list{display:flex;flex-direction:column;gap:8px;}',
      '#' + PANEL_ID + ' .piper-voice-row{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#14142a;border:1px solid #2a2a4a;border-radius:10px;}',
      '#' + PANEL_ID + ' .piper-voice-row.selected{border-color:#7c7cff;background:rgba(124,124,255,0.10);}',
      '#' + PANEL_ID + ' .piper-voice-main{flex:1;min-width:0;}',
      '#' + PANEL_ID + ' .piper-voice-label{font-size:15px;font-weight:600;}',
      '#' + PANEL_ID + ' .piper-voice-meta{font-size:12px;color:#b0b0c8;margin-top:2px;}',
      '#' + PANEL_ID + ' .piper-voice-actions{display:flex;flex-direction:column;gap:6px;}',
      '#' + PANEL_ID + ' .piper-voice-actions button{background:#222238;color:#e8e8ee;border:1px solid #3a3a5a;border-radius:6px;padding:8px 12px;font-size:13px;cursor:pointer;white-space:nowrap;font-family:inherit;}',
      '#' + PANEL_ID + ' .piper-voice-actions button.primary{background:#7c7cff;color:#fff;border-color:#7c7cff;}',
      '#' + PANEL_ID + ' .piper-voice-actions button.danger{color:#ff8a8a;}',
      '#' + PANEL_ID + ' .piper-status{font-size:12px;color:#b0b0c8;margin:14px 0 0;padding:8px 10px;background:#14142a;border-radius:6px;min-height:16px;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  global.PiperPanel = { open: openPanel, close: close };

})(typeof window !== 'undefined' ? window : this);
