// Load — Animation intent parser
// Copyright (c) 2026 LBond. All Rights Reserved.
//
// PROMPT-ONLY METADATA. No real subject animation provider runs in
// MVP — this module extracts a structured cinematic intent from a
// free-text prompt so:
//   1. AI Chat Studio can show what was understood, in plain
//      language, before running camera-motion preview.
//   2. The intent is written into the scene record on attach so a
//      future Animation Provider (AnimateDiff / Wan / LTX / ComfyUI
//      / Load Local Engine) can render against it without the user
//      re-typing.
//
// Public API:
//   window.LoadAnimationIntent.parse(prompt) -> {
//     subjectMotion: string,        // "blink, turn toward Nineveh"
//     environmentMotion: string,    // "smoke drifts from the city"
//     cameraMotion: string,         // "slow push-in"
//     audioIntent: string,          // "engine roar"
//     voiceIntent: string,          // 'Say: "I told you this..."'
//     ambienceIntent: string,       // "people laughing, distant gulls"
//     duration: number,             // seconds; default 5
//     raw: string,
//     promptOnly: true              // always — no provider attached
//   }
//
//   window.LoadAnimationIntent.summarize(intent) -> string
//     plain-language one-liner suitable for a result-card meta line
//
// All locked rules: free / open-source / local-first only; no API
// keys read or written; no paid provider required.

(function () {
'use strict';

// Subject-motion verbs — actions the SUBJECT (person / animal /
// character) can take. Order matters: longer phrases first.
var SUBJECT_VERBS_RX = /\b(blinks?|blinking|looks?|looking|turns?|turning|nods?|nodding|smiles?|smiling|frowns?|frowning|laughs?|laughing|cries?|crying|breathes?|breathing|inhales?|exhales?|speaks?|speaking|whispers?|whispering|shouts?|shouting|sighs?|sighing|gestures?|gesturing|points?|pointing|waves?|waving|reaches?|reaching|grabs?|grabbing|lifts?|lifting|holds?|holding|drops?|dropping|throws?|throwing|kicks?|kicking|punches?|punching|jumps?|jumping|runs?|running|walks?|walking|sits?|sitting|stands?|standing|kneels?|kneeling|bows?|bowing|dances?|dancing|claps?|clapping|hugs?|hugging|kisses?|kissing|fights?|fighting|sleeps?|sleeping|wakes?|waking|dreams?|dreaming)\b/i;

// Environment-motion verbs — actions the WORLD around the subject
// performs. Birds, smoke, wind, sea, lanterns, fire, rain, etc.
var ENV_VERBS_RX = /\b(drifts?|drifting|flows?|flowing|swirls?|swirling|sways?|swaying|moves?|moving|flickers?|flickering|glows?|glowing|burns?|burning|blows?|blowing|rains?|raining|snows?|snowing|fades?|fading|shimmers?|shimmering|ripples?|rippling|crashes?|crashing|rolls?|rolling|spins?|spinning|falls?|falling|rises?|rising|grows?|growing|shrinks?|shrinking|expands?|expanding|breaks?|breaking|shatters?|shattering|trembles?|trembling|shakes?|shaking|vibrates?|vibrating|pulses?|pulsing|bounces?|bouncing|floats?|floating|hovers?|hovering|gathers?|gathering|scatters?|scattering)\b/i;

// Environment subjects — birds, smoke, wind, sea, sun, moon, stars,
// fire, rain, snow, leaves, trees, water, sand, dust, fog, mist.
var ENV_SUBJECTS_RX = /\b(bird|birds|smoke|wind|gust|breeze|sea|ocean|wave|waves|sun|sunlight|moon|moonlight|star|stars|fire|flame|flames|rain|raindrops|snow|snowflakes|leaf|leaves|tree|trees|branch|branches|water|river|stream|fountain|sand|dust|fog|mist|cloud|clouds|lantern|lanterns|candle|candles|torch|torches|flag|flags|banner|banners|hair|robe|cloak|cape|fabric|cloth|grass|wheat|sail|sails|ship|ships|boat|boats|bell|bells)\b/i;

// Camera-motion verbs — push-in, dolly, pan, zoom, etc.
var CAMERA_RX = /\b(zoom(?:s|ing)?(?:\s+in|\s+out)?|pan(?:s|ning)?|tilt(?:s|ing)?|dolly(?:\s+in|\s+out)?|push(?:\s+in)?|pull(?:\s+back)?|track(?:s|ing)?|orbit(?:s|ing)?|crane|jib|aerial|overhead|close[\s-]up|wide[\s-]shot|establishing\s+shot|cinematic\s+(?:camera|move|movement)|slow\s+(?:push|pull|pan|tilt|zoom)|fast\s+(?:push|pull|pan|tilt|zoom)|ken[\s-]?burns)\b/i;

// Voice intent — "Say:" / "Narrate:" / quoted dialogue line.
var VOICE_RX = /(?:^|\s)(say|narrate|narrator|speak|tell|recite|deliver|voice\s*over|voiceover|vo)\s*[:,]\s*("[^"]+"|'[^']+'|[^.!?\n]+[.!?])/i;

// Audio / ambience keywords — used to extract audioIntent +
// ambienceIntent. "engine roar" / "people laughing" / "wind".
var SFX_RX = /\b(engine|roar|laughter|laugh|laughing|crowd|chatter|whispers?|footstep|footsteps|knock|crash|thunder|storm|rain|wind|bird|birds|chirp|chirping|bark|barking|meow|growl|crash|explosion|gun|shot|gunshot|drum|drums|clap|clapping|cheer|cheering|cry|sob|scream|shout|yell|hum|murmur|traffic|horn|siren|bell|whistle)\b/i;
var AMBIENCE_RX = /\b(in\s+the\s+background|background\s+(noise|sound|ambience|music)|atmosphere|ambient|ambien[ct]e|distant|faraway|far\s+off|crowd\s+chatter|busy\s+(office|street|market)|outdoor\s+(wind|rain|birds)|room\s+tone|environment\s+sound)\b/i;

function pickPhrasesByRegex(prompt, rx, max) {
  if (!prompt) return [];
  // Split on sentence + comma + 'and' boundaries so each phrase
  // we extract is roughly one motion clause.
  var parts = prompt.split(/[.!?,;]\s+|\s+and\s+|\s+then\s+/i)
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
  var hit = [];
  for (var i = 0; i < parts.length; i++) {
    if (rx.test(parts[i])) hit.push(parts[i]);
    if (max && hit.length >= max) break;
  }
  return hit;
}

function extractVoiceIntent(prompt) {
  if (!prompt) return '';
  var m = prompt.match(VOICE_RX);
  if (!m) return '';
  return (m[1] + ': ' + (m[2] || '').replace(/^["']|["']$/g, '').trim()).trim();
}

function extractDurationSec(prompt) {
  if (!prompt) return 5;
  var m = prompt.match(/\b(\d+)\s*(?:s|sec|secs|seconds?)\b/i);
  if (!m) return 5;
  var n = parseInt(m[1], 10);
  return isFinite(n) && n > 0 && n <= 60 ? n : 5;
}

function parse(prompt) {
  var raw = String(prompt || '');
  // Subject-motion clauses: phrases that contain a subject verb
  // (blink / turn / wave / etc) AND DON'T also contain an
  // environment subject (so "birds fly" doesn't double-count).
  var subjectClauses = pickPhrasesByRegex(raw, SUBJECT_VERBS_RX, 6)
    .filter(function (p) { return !ENV_SUBJECTS_RX.test(p) || /\b(I|he|she|him|her|they|them|character|person|man|woman|child|girl|boy|subject|protagonist)\b/i.test(p); });
  // Environment-motion clauses: env subject + env verb, OR just
  // env subject + a generic motion word.
  var envClauses = pickPhrasesByRegex(raw, ENV_VERBS_RX, 6)
    .filter(function (p) { return ENV_SUBJECTS_RX.test(p); });
  // Camera clauses: anything mentioning a camera move.
  var cameraClauses = pickPhrasesByRegex(raw, CAMERA_RX, 4);
  // SFX / ambience.
  var sfxClauses = pickPhrasesByRegex(raw, SFX_RX, 6)
    .filter(function (p) { return !AMBIENCE_RX.test(p); });
  var ambienceClauses = pickPhrasesByRegex(raw, AMBIENCE_RX, 6);
  return {
    subjectMotion:     subjectClauses.join('; '),
    environmentMotion: envClauses.join('; '),
    cameraMotion:      cameraClauses.join('; '),
    audioIntent:       sfxClauses.join('; '),
    voiceIntent:       extractVoiceIntent(raw),
    ambienceIntent:    ambienceClauses.join('; '),
    duration:          extractDurationSec(raw),
    raw:               raw,
    promptOnly:        true
  };
}

function summarize(intent) {
  if (!intent) return '';
  var bits = [];
  if (intent.subjectMotion)     bits.push('subject: ' + intent.subjectMotion);
  if (intent.environmentMotion) bits.push('environment: ' + intent.environmentMotion);
  if (intent.cameraMotion)      bits.push('camera: ' + intent.cameraMotion);
  if (intent.voiceIntent)       bits.push('voice: ' + intent.voiceIntent);
  if (intent.audioIntent)       bits.push('sfx: ' + intent.audioIntent);
  if (intent.ambienceIntent)    bits.push('ambience: ' + intent.ambienceIntent);
  if (!bits.length) bits.push('no structured cinematic intent detected');
  return bits.join(' · ');
}

if (typeof window !== 'undefined') {
  window.LoadAnimationIntent = { parse: parse, summarize: summarize };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parse: parse, summarize: summarize };
}
})();
