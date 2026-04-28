/* Voice Manipulator — DSP for the Voice Manipulation Tool.
 *
 * Pure Web Audio + JavaScript. No external libraries, no codec
 * downloads. Provides:
 *
 *   pitchShift(buf, semitones, ctx)     // independent pitch
 *   timeStretch(buf, rate, ctx)         // independent speed
 *   applyChain(buf, opts, ctx)          // EQ + reverb + echo + distortion + dry/wet
 *   process(buf, opts)                  // full pipeline
 *
 * opts (all optional):
 *   pitchSemitones  -12..+12   (default 0)
 *   speed           0.5..2.0   (default 1.0; preserves pitch via granular stretch)
 *   eqLow           -12..+12   dB shelf @ 250 Hz
 *   eqMid           -12..+12   dB peaking @ 1500 Hz
 *   eqHigh          -12..+12   dB shelf @ 6000 Hz
 *   reverb          0..1       (synthesised IR, longer at higher values)
 *   echo            0..1       (delay 0.30 s with feedback scaled)
 *   distortion      0..1       (waveshaper grit)
 *   wet             0..1       (final dry/wet mix; 0 = original recording)
 *
 * Pitch + speed use overlap-add granular synthesis with a Hann
 * window, 50 ms grains, 50% overlap. Trade-off: tiny graininess at
 * extreme settings, but otherwise indistinguishable from native-
 * pitch playback for voice content.
 */
(function (global) {
  'use strict';
  if (global.VoiceManipulator) return;

  var STYLE_PRESETS = [
    { key: 'flat',     label: 'Flat',       icon: '⚪', vals: { pitchSemitones: 0,  speed: 1.0, eqLow: 0, eqMid: 0, eqHigh: 0, reverb: 0, echo: 0, distortion: 0, wet: 1 } },
    { key: 'child',    label: 'Child',      icon: '🧒', vals: { pitchSemitones: 6,  speed: 1.05, eqLow: -2, eqMid: 1, eqHigh: 4, reverb: 0.1, echo: 0,    distortion: 0,    wet: 1 } },
    { key: 'deepmale', label: 'Deep male',  icon: '🦁', vals: { pitchSemitones: -5, speed: 0.95, eqLow: 4,  eqMid: 1, eqHigh: -2, reverb: 0.1, echo: 0,    distortion: 0,    wet: 1 } },
    { key: 'elder',    label: 'Elder',      icon: '🧓', vals: { pitchSemitones: -2, speed: 0.92, eqLow: 1,  eqMid: -1,eqHigh: -3, reverb: 0.15,echo: 0,    distortion: 0.05, wet: 1 } },
    { key: 'robot',    label: 'Robot',      icon: '🤖', vals: { pitchSemitones: -3, speed: 1.0,  eqLow: -2, eqMid: 4, eqHigh: 2,  reverb: 0,   echo: 0.25, distortion: 0.55, wet: 1 } },
    { key: 'narrator', label: 'Narrator',   icon: '🎙', vals: { pitchSemitones: -1, speed: 0.97, eqLow: 2,  eqMid: 2, eqHigh: 1,  reverb: 0.18,echo: 0,    distortion: 0,    wet: 1 } },
    { key: 'cartoon',  label: 'Cartoon',    icon: '🎬', vals: { pitchSemitones: 5,  speed: 1.1,  eqLow: -1, eqMid: 3, eqHigh: 4,  reverb: 0.05,echo: 0.1,  distortion: 0,    wet: 1 } },
    { key: 'creature', label: 'Creature',   icon: '🤡', vals: { pitchSemitones: -8, speed: 0.85, eqLow: 6,  eqMid: -3,eqHigh: -4, reverb: 0.25,echo: 0.15, distortion: 0.7,  wet: 1 } }
  ];

  /* Pitch shift WITH formant shift (resample + granular stretch).
   * This is the transformation that actually changes voice character
   * (man ↔ woman ↔ child) instead of just sounding like a chipmunk
   * at a different pitch. Two stages:
   *
   *   1. Resample by `rate` via OfflineAudioContext + playbackRate.
   *      This shifts pitch AND formants (vocal-tract resonances) AND
   *      compresses/expands duration. Sounds like a different person.
   *
   *   2. Granular time stretch by `1/rate` to restore the original
   *      duration. Granular stretch preserves whatever pitch +
   *      formants are in the input — so the voice keeps its new
   *      character but the timing matches the original.
   */
  async function pitchShift(buf, semitones) {
    semitones = +semitones || 0;
    if (semitones === 0) return buf;
    var rate = Math.pow(2, semitones / 12);
    var sr = buf.sampleRate;
    var nCh = Math.min(2, buf.numberOfChannels || 1);

    // Stage 1 — resample via playbackRate
    var resampledLen = Math.max(1, Math.floor(buf.length / rate));
    var oCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(nCh, resampledLen, sr);
    var src = oCtx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    src.connect(oCtx.destination);
    src.start();
    var resampled = await oCtx.startRendering();

    // Stage 2 — granular stretch back to original duration. Preserves
    // the pitch+formants of the resampled buffer.
    return timeStretch(resampled, 1 / rate);
  }

  /* Granular time stretch — preserves pitch, scales duration. rate
   * 2.0 → twice as fast (half duration), 0.5 → half speed (twice
   * duration). Uses overlap-add with Hann window. */
  function timeStretch(buf, rate, ctx) {
    rate = (+rate) || 1;
    if (rate === 1) return buf;
    var sr = buf.sampleRate;
    var nCh = buf.numberOfChannels;
    var inLen = buf.length;
    var outLen = Math.max(1, Math.floor(inLen / rate));
    var grain = Math.max(256, Math.floor(sr * 0.05));
    var synthHop = Math.floor(grain * 0.5);
    var anaHop = synthHop * rate;
    var out = (ctx || new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(nCh, outLen, sr)).createBuffer(nCh, outLen, sr);
    var win = new Float32Array(grain);
    for (var i = 0; i < grain; i++) win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (grain - 1)));
    for (var c = 0; c < nCh; c++) {
      var src = buf.getChannelData(c);
      var dst = out.getChannelData(c);
      var anaPos = 0, synPos = 0;
      while (synPos + grain < outLen && anaPos + grain < inLen) {
        for (var k = 0; k < grain; k++) {
          var i0 = Math.floor(anaPos + k);
          if (i0 < 0 || i0 >= inLen) continue;
          dst[synPos + k] += src[i0] * win[k];
        }
        anaPos += anaHop;
        synPos += synthHop;
      }
    }
    return out;
  }

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

  /* Apply EQ + reverb + echo + distortion + dry/wet to a buffer.
   * Uses an OfflineAudioContext graph. */
  async function applyChain(buf, opts) {
    opts = opts || {};
    var sr = buf.sampleRate;
    var nCh = Math.min(2, buf.numberOfChannels);
    var pad = Math.ceil(sr * 1.0); // tail for reverb / echo
    var ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(nCh, buf.length + pad, sr);
    var src = ctx.createBufferSource(); src.buffer = buf;

    // 3-band EQ
    var low = ctx.createBiquadFilter();  low.type  = 'lowshelf';  low.frequency.value  = 250;  low.gain.value  = +opts.eqLow  || 0;
    var mid = ctx.createBiquadFilter();  mid.type  = 'peaking';   mid.frequency.value  = 1500; mid.gain.value  = +opts.eqMid  || 0; mid.Q.value = 0.7;
    var high= ctx.createBiquadFilter();  high.type = 'highshelf'; high.frequency.value = 6000; high.gain.value = +opts.eqHigh || 0;

    // Distortion (waveshaper)
    var distAmt = Math.max(0, Math.min(1, +opts.distortion || 0));
    var distNode = ctx.createWaveShaper();
    if (distAmt > 0) {
      var n = 1024;
      var curve = new Float32Array(n);
      var k = distAmt * 18 + 1;
      for (var i = 0; i < n; i++) {
        var x = (i / (n - 1)) * 2 - 1;
        curve[i] = (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
      }
      distNode.curve = curve;
      distNode.oversample = '4x';
    }

    // Echo (delay + feedback)
    var echoAmt = Math.max(0, Math.min(1, +opts.echo || 0));
    var delay = ctx.createDelay(2.0); delay.delayTime.value = 0.30;
    var feedback = ctx.createGain(); feedback.gain.value = echoAmt * 0.55;
    var echoMix = ctx.createGain(); echoMix.gain.value = echoAmt;

    // Reverb (convolver with synthesised IR)
    var revAmt = Math.max(0, Math.min(1, +opts.reverb || 0));
    var conv = ctx.createConvolver();
    conv.buffer = buildIR(ctx, 0.6 + revAmt * 4, 1.5, 0.5);
    var revMix = ctx.createGain(); revMix.gain.value = revAmt;

    // Wet/dry mix
    var wet = (typeof opts.wet === 'number') ? Math.max(0, Math.min(1, opts.wet)) : 1;
    var wetGain = ctx.createGain(); wetGain.gain.value = wet;
    var dryGain = ctx.createGain(); dryGain.gain.value = 1 - wet;

    // Wire: src → EQ chain → distortion → split into wet & dry
    var afterDist = distAmt > 0 ? distNode : ctx.createGain();
    src.connect(low); low.connect(mid); mid.connect(high);
    if (distAmt > 0) high.connect(distNode);
    else             high.connect(afterDist);

    // Dry pass-through (before fx)
    src.connect(dryGain);

    // Wet branch — start from afterDist
    afterDist.connect(wetGain);
    // + echo branch
    if (echoAmt > 0) {
      afterDist.connect(delay);
      delay.connect(feedback); feedback.connect(delay);
      delay.connect(echoMix); echoMix.connect(wetGain);
    }
    // + reverb branch
    if (revAmt > 0) {
      afterDist.connect(conv); conv.connect(revMix); revMix.connect(wetGain);
    }

    dryGain.connect(ctx.destination);
    wetGain.connect(ctx.destination);

    src.start();
    return await ctx.startRendering();
  }

  /* Full pipeline: pitch → stretch → fx chain. Returns AudioBuffer. */
  async function process(buf, opts) {
    if (!buf) return null;
    opts = opts || {};
    var stage = buf;
    var pitch = +opts.pitchSemitones || 0;
    var speed = +opts.speed || 1;
    if (pitch !== 0) stage = await pitchShift(stage, pitch);
    if (speed !== 1) stage = timeStretch(stage, speed);
    if (opts.eqLow || opts.eqMid || opts.eqHigh ||
        opts.reverb || opts.echo || opts.distortion ||
        (typeof opts.wet === 'number' && opts.wet !== 1)) {
      stage = await applyChain(stage, opts);
    }
    return stage;
  }

  global.VoiceManipulator = {
    STYLE_PRESETS: STYLE_PRESETS,
    pitchShift: pitchShift,
    timeStretch: timeStretch,
    applyChain: applyChain,
    process: process
  };
})(typeof window !== 'undefined' ? window : globalThis);
