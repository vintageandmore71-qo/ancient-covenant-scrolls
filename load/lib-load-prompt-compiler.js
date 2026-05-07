// Load — Prompt Compiler (reliability addendum #15)
//
// Turns a single free-text user request into a compiled, production-
// shaped prompt object with all 11 spec layers populated. Empty
// layers are returned as '' (never undefined) so downstream code can
// never receive a missing key.
//
// Public API:
//   window.LoadPromptCompiler.LAYERS                 - 11 spec keys (in order)
//   window.LoadPromptCompiler.compile(text, opts?)   -> compiled object
//   window.LoadPromptCompiler.summary(compiled)      -> { totalChars, layersFilled, empty[] }
//
// opts (optional):
//   { style: '<curated style suffix>', sceneId: '...', sourceImage: '...',
//     extraNegative: '...', rightsHint: '...' }

(function () {
'use strict';

var LAYERS = [
  'visualPrompt',
  'negativePrompt',
  'motionPrompt',
  'cameraPrompt',
  'characterMotionPrompt',
  'environmentPrompt',
  'soundPrompt',
  'musicPrompt',
  'sfxPrompt',
  'voicePrompt',
  'rightsPrompt'
];

var BASE_NEGATIVE = 'no text, no captions, no watermarks, no logos, no morphing limbs, no extra fingers, no warping faces, no distorted hands, no embedded text overlays';
var BASE_RIGHTS = 'platform-original generated content; verify per-asset rights envelope before publish-prep; no third-party copyrighted material implied or referenced';

// Keyword groups. Each entry contains the keyword (lowercase) plus the
// canonical phrase to surface in the compiled layer.
var KEYWORDS = {
  motion: [
    [/(bring|brought)\s+(this|the)?\s*image\s+to\s+life/, 'animate the still image with subtle scene motion'],
    [/\banimate\b/, 'animate the scene'],
    [/\b(moving|movement|motion)\b/, 'subjects in scene moving naturally'],
    [/\b(shift|shifting)\b/, 'crowd shifting'],
    [/\b(walk|walking)\b/, 'figures walking through frame'],
    [/\b(run|running)\b/, 'figures running'],
    [/\b(hammer|hammering)\b/, 'workers hammering with rhythm'],
    [/\b(build|building)\b/, 'workers building, rhythmic action'],
    [/\b(march|marching)\b/, 'marching cadence'],
    [/\b(snap|snapping)\b/, 'fabric snapping'],
    [/\b(drift|drifting)\b/, 'mist or smoke drifting'],
    [/\b(rustle|rustling)\b/, 'leaves rustling']
  ],
  camera: [
    [/\b(slow|gentle)\s+push[- ]?in\b/, 'slow cinematic push-in'],
    [/\bpush[- ]?in\b/, 'push-in dolly'],
    [/\bpull[- ]?back\b|\bzoom[- ]?out\b/, 'slow pull-back / zoom-out'],
    [/\bzoom\s+in\b|\bzoom-?in\b/, 'slow zoom-in'],
    [/\bdolly\b/, 'parallax dolly'],
    [/\bpan\b/, 'horizontal pan'],
    [/\borbit\b/, 'orbit around subject'],
    [/\btracking\s+shot\b/, 'tracking shot'],
    [/\bwide\s+shot\b/, 'steady wide static shot'],
    [/\bclose[- ]?up\b/, 'close-up framing'],
    [/\bcinematic\b/, 'cinematic camera movement']
  ],
  characterMotion: [
    [/\b(laugh|laughter)\b/, 'characters laughing'],
    [/\b(mock|mocking|jeer|jeering)\b/, 'mockers jeering at the subject'],
    [/\b(shout|shouting|yell)\b/, 'figures shouting'],
    [/\b(crowd|crowds)\b/, 'crowd shifting and reacting'],
    [/\b(workers?|labourers?)\b/, 'workers in steady labour'],
    [/\b(vendors?)\b/, 'vendors haggling'],
    [/\b(sailors?)\b/, 'sailors working the rigging'],
    [/\b(soldiers?)\b/, 'soldiers in formation'],
    [/\b(gesture|gesturing|wave)\b/, 'gesturing arms']
  ],
  environment: [
    [/\b(ark|noah)\b/, 'ancient ark construction site, weathered timber, dust'],
    [/\b(marketplace|market)\b/, 'crowded marketplace, tents and stalls'],
    [/\b(forest|woods)\b/, 'quiet forest, soft mist between trees'],
    [/\b(sea|ocean)\b/, 'open sea, salt spray, churning waves'],
    [/\b(desert)\b/, 'arid desert, ochre dunes, hard sun'],
    [/\b(cave)\b/, 'damp cave, lantern light'],
    [/\b(village|town)\b/, 'old stone village'],
    [/\b(battle|battlefield)\b/, 'distant battlefield, drifting smoke'],
    [/\b(storm)\b/, 'storm sky, dramatic backlight, broken cloud'],
    [/\b(dawn|sunrise)\b/, 'pre-dawn light, low mist'],
    [/\b(dusk|sunset)\b/, 'sunset, warm rim light']
  ],
  sound: [
    [/\b(laugh|laughter)\b/, 'mocking laughter, near and far'],
    [/\b(noise|noisy)\b/, 'noisy crowd ambience'],
    [/\b(crowd|crowds)\b/, 'crowd murmur and reaction'],
    [/\b(hammer|hammering)\b/, 'wooden hammering on heavy timber'],
    [/\b(thunder)\b/, 'distant thunder roll'],
    [/\b(rain)\b/, 'steady rain on surfaces'],
    [/\b(wind)\b/, 'wind through fabric and beams'],
    [/\b(birds?)\b/, 'birdsong, wing flutter'],
    [/\b(footsteps?)\b/, 'footsteps on dirt'],
    [/\b(clinking?|coins?)\b/, 'coins clinking, small metal contact'],
    [/\b(animals?|cattle|horses?|sheep)\b/, 'distant animal calls']
  ],
  music: [
    [/\b(tense|ominous)\b/, 'low tense underscore, sustained strings'],
    [/\b(triumph|triumphant)\b/, 'rising triumphant theme'],
    [/\b(sorrow|sorrowful|sad)\b/, 'sorrowful piano motif'],
    [/\b(ancient|biblical)\b/, 'ancient cinematic underscore, low brass'],
    [/\b(heroic)\b/, 'heroic horns, broad strings'],
    [/\b(dark|menacing)\b/, 'dark menacing pulse']
  ],
  sfx: [
    [/\b(laugh|laughter)\b/, 'mocking laughter samples, layered crowd'],
    [/\b(hammer|hammering)\b/, 'hammer impacts on wood'],
    [/\b(thunder)\b/, 'distant thunder hit'],
    [/\b(rain)\b/, 'rain bed'],
    [/\b(footsteps?)\b/, 'footstep events'],
    [/\b(coins?|clinking?)\b/, 'coin clink one-shots'],
    [/\b(crowd)\b/, 'crowd murmur bed'],
    [/\b(wind)\b/, 'wind whoosh'],
    [/\b(swords?|clash|clashing)\b/, 'distant sword clashes']
  ],
  voice: [
    [/\b(narrate|narration|narrator)\b/, 'narrator voice, calm tone'],
    [/\b(dialogue|dialog)\b/, 'character dialogue'],
    [/\b(whisper|whispers?)\b/, 'whispered voice'],
    [/\b(laugh|laughter|mocking)\b/, 'mocking laughter spoken layer'],
    [/\b(shout|shouting|yell)\b/, 'shouted lines']
  ]
};

function pick(text, group) {
  var t = (text || '').toLowerCase();
  var hits = [];
  KEYWORDS[group].forEach(function (pair) {
    if (pair[0].test(t)) hits.push(pair[1]);
  });
  // Deduplicate (later matches with same phrase only added once).
  var seen = {};
  return hits.filter(function (h) { if (seen[h]) return false; seen[h] = true; return true; });
}

// Extract any "no X, no Y" phrasing from the user text and merge into the
// negative prompt. Heuristic only — no false positives because the BASE
// negative is always present regardless.
function extractUserNegatives(text) {
  var t = (text || '').toLowerCase();
  var out = [];
  var rx = /\bno\s+([a-z][a-z\- ]{2,40})\b(?=[.,;:]|$|\s+(?:no|with|and))/g;
  var m;
  while ((m = rx.exec(t)) !== null) {
    var phrase = m[1].trim();
    if (!/^(idea|chance|way|need|reason|word|one|other|matter|problem)$/.test(phrase)) {
      out.push('no ' + phrase);
    }
  }
  return out;
}

function compile(text, opts) {
  opts = opts || {};
  var raw = String(text == null ? '' : text).trim();
  var visual = raw || '';
  if (opts.style && typeof opts.style === 'string') visual = visual + (visual ? ', ' : '') + opts.style;

  var motionHits = pick(raw, 'motion');
  var cameraHits = pick(raw, 'camera');
  var charHits = pick(raw, 'characterMotion');
  var envHits = pick(raw, 'environment');
  var soundHits = pick(raw, 'sound');
  var musicHits = pick(raw, 'music');
  var sfxHits = pick(raw, 'sfx');
  var voiceHits = pick(raw, 'voice');

  // Defaults so downstream code never has to guess.
  if (!motionHits.length) motionHits.push('gentle subject motion');
  if (!cameraHits.length) cameraHits.push('slow cinematic camera movement');

  var userNegatives = extractUserNegatives(raw);
  var negative = BASE_NEGATIVE + (opts.extraNegative ? ', ' + opts.extraNegative : '') + (userNegatives.length ? ', ' + userNegatives.join(', ') : '');

  var compiled = {
    visualPrompt:           visual,
    negativePrompt:         negative,
    motionPrompt:           motionHits.join('; '),
    cameraPrompt:           cameraHits.join('; '),
    characterMotionPrompt:  charHits.join('; '),
    environmentPrompt:      envHits.join('; '),
    soundPrompt:            soundHits.join('; '),
    musicPrompt:            musicHits.join('; '),
    sfxPrompt:              sfxHits.join(' / '),
    voicePrompt:            voiceHits.join('; '),
    rightsPrompt:           opts.rightsHint || BASE_RIGHTS
  };
  // Normalise — empty fields stay '' (never undefined) and LAYERS shape is preserved.
  LAYERS.forEach(function (k) { if (typeof compiled[k] !== 'string') compiled[k] = ''; });
  return compiled;
}

function summary(compiled) {
  var totalChars = 0, layersFilled = 0, empty = [];
  LAYERS.forEach(function (k) {
    var v = (compiled && typeof compiled[k] === 'string') ? compiled[k] : '';
    totalChars += v.length;
    if (v.trim()) layersFilled++; else empty.push(k);
  });
  return { totalChars: totalChars, layersFilled: layersFilled, empty: empty };
}

if (typeof window !== 'undefined') {
  window.LoadPromptCompiler = {
    LAYERS: LAYERS.slice(),
    compile: compile,
    summary: summary,
    BASE_NEGATIVE: BASE_NEGATIVE,
    BASE_RIGHTS: BASE_RIGHTS
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LAYERS: LAYERS, compile: compile, summary: summary, BASE_NEGATIVE: BASE_NEGATIVE, BASE_RIGHTS: BASE_RIGHTS };
}
})();
