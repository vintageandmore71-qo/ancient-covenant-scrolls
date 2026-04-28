/* Voice FX engine — applies a named effect preset to an AudioBuffer
 * via OfflineAudioContext (offline / fast) or a regular AudioContext +
 * MediaStreamDestination (real-time, used when MediaRecorder needs a
 * stream). Pure Web Audio API — no codec libraries.
 *
 * Public surface:
 *   window.VoiceFX = {
 *     PRESETS,                  // array of { key, label, icon, note }
 *     applyToBuffer(buf, key),  // returns Promise<AudioBuffer>
 *     applyToStream(stream, key, ctx) // returns MediaStream (for live preview)
 *   }
 */
(function (global) {
  'use strict';
  if (global.VoiceFX) return;

  var PRESETS = [
    { key: 'none',       label: 'No effect',  icon: '🎙', note: 'Original recording' },
    { key: 'chipmunk',   label: 'Chipmunk',   icon: '🐿', note: 'High-pitch, fast' },
    { key: 'helium',     label: 'Helium',     icon: '🎈', note: 'Squeaky balloon voice' },
    { key: 'baby',       label: 'Baby',       icon: '👶', note: 'Tiny + soft + sing-song' },
    { key: 'child',      label: 'Child',      icon: '🧒', note: 'Slightly higher + brighter' },
    { key: 'cartoon',    label: 'Cartoon',    icon: '🎬', note: 'Bouncy, bright, character-y' },
    { key: 'woman',      label: 'Woman',      icon: '👩', note: 'Softer + slightly higher' },
    { key: 'man',        label: 'Man',        icon: '👨', note: 'Lower, fuller' },
    { key: 'deep',       label: 'Deep voice', icon: '🦁', note: 'Big, deep, slow' },
    { key: 'grandma',    label: 'Grandma',    icon: '👵', note: 'Warm voice with gentle quaver' },
    { key: 'grandpa',    label: 'Grandpa',    icon: '👴', note: 'Lower, warm, gentle quaver' },
    { key: 'elder',      label: 'Elder',      icon: '🧓', note: 'Slow, warm, slight tremor' },
    { key: 'echo',       label: 'Echo',       icon: '🔁', note: 'Repeating decay' },
    { key: 'cathedral',  label: 'Cathedral',  icon: '⛪', note: 'Long reverb' },
    { key: 'telephone',  label: 'Telephone',  icon: '☎️', note: 'Bandpassed 300-3400 Hz' },
    { key: 'walkietalkie',label:'Walkie-talkie',icon:'📻', note: 'Crunchy + static' },
    { key: 'underwater', label: 'Underwater', icon: '🌊', note: 'Lowpass + slow chorus' },
    { key: 'whisper',    label: 'Whisper',    icon: '🤫', note: 'Quiet, breathy highs' },
    { key: 'megaphone',  label: 'Megaphone',  icon: '📣', note: 'Boosted mids, slight clip' },
    { key: 'cave',       label: 'Cave',       icon: '🕳', note: 'Long delay + low cut' }
  ];

  // Build a synthesised impulse response for ConvolverNode (no external
  // .wav file needed). decay in seconds, dampening 0..1 (high = dark).
  function buildIR(ctx, durationSec, decay, dampening) {
    var sr = ctx.sampleRate;
    var len = Math.max(1, Math.floor(sr * durationSec));
    var ir = ctx.createBuffer(2, len, sr);
    for (var c = 0; c < 2; c++) {
      var ch = ir.getChannelData(c);
      for (var i = 0; i < len; i++) {
        var n = (Math.random() * 2 - 1);
        var env = Math.pow(1 - i / len, decay);
        ch[i] = n * env * (1 - dampening * (i / len));
      }
    }
    return ir;
  }

  // Build the effect graph for a given preset. `srcNode` is the source
  // (BufferSource / MediaStream input). Connects to `outNode`. Returns
  // an object with optional `playbackRate` to apply to a BufferSource.
  function buildGraph(ctx, srcNode, outNode, key) {
    var rate = 1;
    function chain() { var nodes = Array.prototype.slice.call(arguments); for (var i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); }

    if (key === 'none' || !key) {
      srcNode.connect(outNode);
      return { rate: 1 };
    }
    if (key === 'chipmunk')      rate = 1.6;
    else if (key === 'helium')   rate = 1.8;
    else if (key === 'baby')     rate = 1.55;
    else if (key === 'child')    rate = 1.25;
    else if (key === 'cartoon')  rate = 1.4;
    else if (key === 'woman')    rate = 1.12;
    else if (key === 'man')      rate = 0.88;
    else if (key === 'deep')     rate = 0.7;
    else if (key === 'grandma')  rate = 1.05;
    else if (key === 'grandpa')  rate = 0.9;
    else if (key === 'elder')    rate = 0.85;

    // Baby — high pitch + soft brightness, slight breathy highpass
    if (key === 'baby') {
      var bHp = ctx.createBiquadFilter(); bHp.type = 'highpass'; bHp.frequency.value = 250;
      var bGain = ctx.createGain(); bGain.gain.value = 0.85;
      chain(srcNode, bHp, bGain, outNode);
      return { rate: rate };
    }
    // Cartoon — bright + light wobble (chorus-style short delay) for
    // a bouncy, character-y feel.
    if (key === 'cartoon') {
      var cHp = ctx.createBiquadFilter(); cHp.type = 'peaking'; cHp.frequency.value = 3000; cHp.gain.value = 4; cHp.Q.value = 0.7;
      var cDel = ctx.createDelay(); cDel.delayTime.value = 0.012;
      var cLfo = ctx.createOscillator(); cLfo.frequency.value = 4;
      var cLfoGain = ctx.createGain(); cLfoGain.gain.value = 0.005;
      cLfo.connect(cLfoGain); cLfoGain.connect(cDel.delayTime);
      var cDry = ctx.createGain(); cDry.gain.value = 0.7;
      var cWet = ctx.createGain(); cWet.gain.value = 0.5;
      srcNode.connect(cHp);
      cHp.connect(cDry); cDry.connect(outNode);
      cHp.connect(cDel); cDel.connect(cWet); cWet.connect(outNode);
      try { cLfo.start(); } catch (_) {}
      return { rate: rate, _stopOsc: cLfo };
    }
    // Grandma / Grandpa — warm tone (lowpass) + gentle tremor
    // (LFO-modulated gain ~5-6 Hz, depth 0.12-0.15).
    if (key === 'grandma' || key === 'grandpa') {
      var ageLp = ctx.createBiquadFilter(); ageLp.type = 'lowpass';
      ageLp.frequency.value = (key === 'grandma') ? 3000 : 2500;
      var ageGain = ctx.createGain(); ageGain.gain.value = 1;
      var trLfo = ctx.createOscillator();
      trLfo.frequency.value = (key === 'grandma') ? 6 : 5;
      var trDepth = ctx.createGain();
      trDepth.gain.value = (key === 'grandma') ? 0.15 : 0.12;
      trLfo.connect(trDepth); trDepth.connect(ageGain.gain);
      chain(srcNode, ageLp, ageGain, outNode);
      try { trLfo.start(); } catch (_) {}
      return { rate: rate, _stopOsc: trLfo };
    }
    // Elder — slow + warm + slight tremor (existing pitch-only path
    // boosted with a touch of warmth and a softer LFO).
    if (key === 'elder') {
      var elLp = ctx.createBiquadFilter(); elLp.type = 'lowpass'; elLp.frequency.value = 2800;
      var elGain = ctx.createGain(); elGain.gain.value = 1;
      var elLfo = ctx.createOscillator(); elLfo.frequency.value = 4.5;
      var elDepth = ctx.createGain(); elDepth.gain.value = 0.10;
      elLfo.connect(elDepth); elDepth.connect(elGain.gain);
      chain(srcNode, elLp, elGain, outNode);
      try { elLfo.start(); } catch (_) {}
      return { rate: rate, _stopOsc: elLfo };
    }
    if (key === 'cathedral' || key === 'cave') {
      var conv = ctx.createConvolver();
      conv.buffer = buildIR(ctx,
        key === 'cathedral' ? 4 : 3,
        key === 'cave' ? 1.2 : 1.5,
        0.4
      );
      var dry = ctx.createGain(); dry.gain.value = 0.6;
      var wet = ctx.createGain(); wet.gain.value = 0.7;
      srcNode.connect(dry); dry.connect(outNode);
      srcNode.connect(conv); conv.connect(wet); wet.connect(outNode);
      return { rate: rate };
    }
    if (key === 'echo') {
      var d = ctx.createDelay(); d.delayTime.value = 0.32;
      var fb = ctx.createGain(); fb.gain.value = 0.45;
      var dry2 = ctx.createGain(); dry2.gain.value = 0.7;
      var wet2 = ctx.createGain(); wet2.gain.value = 0.6;
      srcNode.connect(dry2); dry2.connect(outNode);
      srcNode.connect(d); d.connect(wet2); wet2.connect(outNode);
      d.connect(fb); fb.connect(d);
      return { rate: rate };
    }
    if (key === 'telephone') {
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 1.2;
      var bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 1700; bp2.Q.value = 1.2;
      chain(srcNode, bp, bp2, outNode);
      return { rate: rate };
    }
    if (key === 'walkietalkie') {
      var bpw = ctx.createBiquadFilter(); bpw.type = 'bandpass'; bpw.frequency.value = 1500; bpw.Q.value = 1.0;
      var wsw = ctx.createWaveShaper();
      var c2 = new Float32Array(1024);
      for (var ii = 0; ii < 1024; ii++) { var xx = ii / 512 - 1; c2[ii] = Math.tanh(xx * 4); }
      wsw.curve = c2; wsw.oversample = '4x';
      chain(srcNode, bpw, wsw, outNode);
      return { rate: rate };
    }
    if (key === 'underwater') {
      var lpu = ctx.createBiquadFilter(); lpu.type = 'lowpass'; lpu.frequency.value = 700;
      var dl = ctx.createDelay(); dl.delayTime.value = 0.04;
      var fbu = ctx.createGain(); fbu.gain.value = 0.3;
      chain(srcNode, lpu, dl, outNode);
      dl.connect(fbu); fbu.connect(dl);
      return { rate: rate };
    }
    if (key === 'whisper') {
      var hpw = ctx.createBiquadFilter(); hpw.type = 'highpass'; hpw.frequency.value = 1200;
      var gw = ctx.createGain(); gw.gain.value = 0.55;
      chain(srcNode, hpw, gw, outNode);
      return { rate: rate };
    }
    if (key === 'megaphone') {
      var bpm = ctx.createBiquadFilter(); bpm.type = 'peaking'; bpm.frequency.value = 1800; bpm.gain.value = 8; bpm.Q.value = 0.7;
      var wsm = ctx.createWaveShaper();
      var c3 = new Float32Array(1024);
      for (var jj = 0; jj < 1024; jj++) { var xj = jj / 512 - 1; c3[jj] = Math.tanh(xj * 3); }
      wsm.curve = c3;
      chain(srcNode, bpm, wsm, outNode);
      return { rate: rate };
    }
    // Pitch-only presets (chipmunk, helium, child, woman, man, deep,
    // elder) just connect direct — the rate is applied to the source.
    srcNode.connect(outNode);
    return { rate: rate };
  }

  async function applyToBuffer(buf, key, opts) {
    if (!buf) return null;
    opts = opts || {};
    var rateMul = (typeof opts.rateMultiplier === 'number' && opts.rateMultiplier > 0) ? opts.rateMultiplier : 1;
    var toneShift = (typeof opts.toneShift === 'number') ? opts.toneShift : 0; // -1 (warm) .. +1 (bright)
    if ((!key || key === 'none') && rateMul === 1 && toneShift === 0) return buf;
    var rateGuess = 1;
    // First-pass estimate of length (preset's playbackRate compresses
    // the rendered output, except for pure-FX presets where rate=1).
    var probe = { rate: 1 };
    var probeCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, buf.sampleRate);
    var probeSrc = probeCtx.createBufferSource(); probeSrc.buffer = buf;
    probe = buildGraph(probeCtx, probeSrc, probeCtx.destination, key) || { rate: 1 };
    rateGuess = (probe.rate || 1) * rateMul;
    if (probe._stopOsc) try { probe._stopOsc.stop(); } catch (_) {}

    var renderDur = (buf.duration || 0) / rateGuess + 1; // +1s for FX tails
    var ch = Math.min(2, buf.numberOfChannels || 1);
    var outLen = Math.max(1, Math.floor(buf.sampleRate * renderDur));
    var ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(ch, outLen, buf.sampleRate);
    var src = ctx.createBufferSource(); src.buffer = buf;
    // Insert a tone-shaper between the preset graph and the destination
    // so the user's Tone slider is applied consistently regardless of
    // which preset is active. Negative tone darkens (lowpass), positive
    // brightens (peaking shelf around 4 kHz).
    var toneIn = ctx.createGain();
    var toneOut = ctx.createGain();
    if (toneShift < 0) {
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.value = 800 + (1 + toneShift) * 11000; // -1 → 800Hz, 0 → 11.8kHz
      toneIn.connect(lp); lp.connect(toneOut);
    } else if (toneShift > 0) {
      var pk = ctx.createBiquadFilter(); pk.type = 'peaking';
      pk.frequency.value = 4000;
      pk.gain.value = toneShift * 9; // up to +9 dB
      pk.Q.value = 0.7;
      toneIn.connect(pk); pk.connect(toneOut);
    } else {
      toneIn.connect(toneOut);
    }
    var info = buildGraph(ctx, src, toneIn, key);
    if (info.rate || rateMul !== 1) {
      src.playbackRate.value = (info.rate || 1) * rateMul;
    }
    toneOut.connect(ctx.destination);
    src.start();
    var rendered = await ctx.startRendering();
    return rendered;
  }

  function applyToStream(stream, key, ctx) {
    // Live-preview path. Returns an output MediaStream. Caller hooks
    // into MediaRecorder or an <audio> element. Same graph logic.
    var src = ctx.createMediaStreamSource(stream);
    var dest = ctx.createMediaStreamDestination();
    buildGraph(ctx, src, dest, key);
    return dest.stream;
  }

  global.VoiceFX = {
    PRESETS: PRESETS,
    applyToBuffer: applyToBuffer,
    applyToStream: applyToStream
  };
})(typeof window !== 'undefined' ? window : globalThis);
