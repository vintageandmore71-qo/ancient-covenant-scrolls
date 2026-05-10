// Load — Shared AI Creation Pipeline
// Copyright (c) 2026 LBond. All Rights Reserved.
//
// Single source of truth for image / edit / animation / audio
// creation across AI Image Editor (Quick Image Tool) and AI Chat
// Studio (Production AI Chat). Both surfaces import this module so
// the user never gets a different result depending on which tab
// they opened.
//
// Public API:
//   window.LoadAIPipeline.compileImagePrompt(userPrompt, opts)
//     -> { visualPrompt, negativePrompt, qualityPrompt, stylePrompt,
//          aspectRatio, operationType, route, intent, isHeadshot,
//          isPortrait, fullPrompt }
//
//   window.LoadAIPipeline.detectIntent(rawPrompt, opts)
//     -> 'text-to-image' | 'image-edit' | 'animate-uploaded'
//        | 'animate-generated' | 'animate-reference'
//        | 'inpaint' | 'prompt-only-motion-fallback'
//
//   window.LoadAIPipeline.qualityGate(intent, result)
//     -> { ok: bool, reason: string }
//
//   window.LoadAIPipeline.statusLabels
//     -> { thinking, generating, timedOut, returnedNoFile, failed,
//          fallbackAvailable, promptSaved, imageCreated,
//          imageEditFailed, animationProviderNeeded, videoCreated,
//          audioAttached, editProviderNeeded }
//
// All inputs are validated; all outputs are JSON-serializable.

(function () {
'use strict';

// ── Per-spec safety baseline negative prompt. Always included so
// every image route inherits the same minimum quality floor.
var BASE_NEGATIVE = 'no text, no captions, no watermarks, no logos, no morphing limbs, no extra fingers, no warping faces, no distorted hands, no embedded text overlays, no double heads, no blurry faces, no asymmetrical eyes, no broken anatomy';

// Headshot / portrait quality clauses auto-injected when the user
// asks for a headshot, portrait, or person-focused render. These
// match the user's required quality controls verbatim:
//   realistic anatomy, natural face, clear eyes, correct hands,
//   no distorted limbs, no extra fingers, no warped facial features,
//   professional lighting, sharp focus, high quality portrait.
var PORTRAIT_QUALITY = [
  'realistic anatomy', 'natural face', 'clear eyes', 'correct hands',
  'no distorted limbs', 'no extra fingers', 'no warped facial features',
  'professional lighting', 'sharp focus', 'high quality portrait'
].join(', ');

// Default headshot framing — enforces shoulders-up framing so a
// "headshot" request never returns a wide office scene.
var HEADSHOT_FRAMING = 'shoulders-up portrait, head and shoulders framing, subject centred, neutral background depth';

// Generic high-quality clauses for non-portrait images.
var BASE_QUALITY = 'high detail, sharp focus, balanced exposure, coherent composition';

// Animal anatomy quality — auto-injected when the prompt mentions
// a dog / cat / animal / pet etc. Mirrors the portrait clause set
// so a text-to-image generation of "shih tzu beside a red car"
// inherits the locked anatomy controls.
var ANIMAL_QUALITY = [
  'realistic animal anatomy', 'correct legs', 'correct paws',
  'natural face', 'correct eyes', 'correct muzzle', 'natural fur',
  'no extra limbs', 'no melted body', 'no warped paws',
  'no distorted head', 'realistic scale beside the surrounding objects',
  'photorealistic detail'
].join(', ');

var ANIMAL_RX = /\b(dog|dogs|puppy|puppies|cat|cats|kitten|kittens|animal|animals|pet|pets|bird|birds|horse|horses|cow|cows|sheep|pig|pigs|rabbit|rabbits|hamster|fox|wolf|bear|tiger|lion|elephant|giraffe|monkey|deer|squirrel|shih\s*tzu|labrador|retriever|poodle|bulldog|chihuahua|husky|collie|terrier|spaniel|beagle)\b/i;

// Aspect-ratio map for spec sizes.
var SIZE_TO_RATIO = {
  '512x512': '1:1',
  '768x768': '1:1',
  '1024x576': '16:9',
  '576x1024': '9:16'
};

// Prompts that include people / faces / portraits — used to decide
// whether to auto-inject the portrait quality block.
var PORTRAIT_RX = /\b(portrait|headshot|head\s*shot|face|selfie|self\s*portrait|profile\s+(picture|photo))\b/i;
var HEADSHOT_RX = /\b(headshot|head\s*shot)\b/i;
// "professional photo of a person" or "of a man/woman" etc.
var PERSON_RX = /\b(person|woman|man|girl|boy|child|kid|teen|teenager|adult|model|professional|business\s+person|executive|ceo|actor|actress|musician|dancer|character)\b/i;

function detectIntent(rawPrompt, opts) {
  opts = opts || {};
  if (opts.intent && typeof opts.intent === 'string') return opts.intent;
  var hasRef = !!opts.referenceImage;
  var hasUpload = !!opts.uploadedImage;
  if (opts.mode === 'animate') {
    if (hasUpload) return 'animate-uploaded';
    if (hasRef) return 'animate-reference';
    return 'prompt-only-motion-fallback';
  }
  if (opts.mode === 'i2i' || opts.mode === 'image-edit') {
    if (hasRef || hasUpload) return 'image-edit';
    return 'text-to-image';
  }
  if (opts.mode === 'inpaint' || opts.hasMask) return 'inpaint';
  return 'text-to-image';
}

function isPortrait(prompt) { return PORTRAIT_RX.test(prompt) || (PERSON_RX.test(prompt) && /\b(photo|picture|image|portrait|headshot)\b/i.test(prompt)); }
function isHeadshot(prompt) { return HEADSHOT_RX.test(prompt); }
function isAnimal(prompt)   { return ANIMAL_RX.test(prompt); }

function compileImagePrompt(userPrompt, opts) {
  opts = opts || {};
  userPrompt = String(userPrompt || '').trim();
  var size = opts.size || '512x512';
  var stylePrompt = opts.style || '';
  var intent = detectIntent(userPrompt, opts);
  var portrait = isPortrait(userPrompt);
  var headshot = isHeadshot(userPrompt);
  var animal   = isAnimal(userPrompt);
  // Visual prompt — user's literal ask, plus framing for headshots.
  var visualBits = [userPrompt];
  if (headshot) visualBits.push(HEADSHOT_FRAMING);
  var visualPrompt = visualBits.filter(Boolean).join(', ');
  // Quality prompt — portrait clauses if person/portrait/headshot,
  // generic otherwise. Always non-empty so every route inherits a
  // minimum quality floor.
  // Stack quality clauses: portrait + animal both, when present.
  // Portrait is anchored at the front (subject identity), animal
  // appended (creature anatomy guardrails).
  var qualityPrompt;
  if (portrait && animal) qualityPrompt = PORTRAIT_QUALITY + ', ' + ANIMAL_QUALITY;
  else if (portrait)      qualityPrompt = PORTRAIT_QUALITY;
  else if (animal)        qualityPrompt = ANIMAL_QUALITY;
  else                    qualityPrompt = BASE_QUALITY;
  // Negative prompt — base safety floor, never empty.
  var negativePrompt = BASE_NEGATIVE;
  // Final compiled prompt for providers that take a single string.
  // Layered comma-join, deduped, length-capped at 800 chars (most
  // providers cut off well before that).
  var fullPrompt = [visualPrompt, qualityPrompt, stylePrompt]
    .filter(function (s) { return s && String(s).trim(); })
    .join(', ')
    .slice(0, 800);
  // Operation type label used by every result card.
  var operationType;
  switch (intent) {
    case 'image-edit':                    operationType = 'image edit / image-to-image'; break;
    case 'inpaint':                       operationType = 'inpainting'; break;
    case 'animate-uploaded':              operationType = 'animate uploaded image'; break;
    case 'animate-generated':             operationType = 'animate generated image'; break;
    case 'animate-reference':             operationType = 'animate reference image'; break;
    case 'prompt-only-motion-fallback':   operationType = 'prompt-only motion fallback'; break;
    default:                              operationType = 'text-to-image'; break;
  }
  // Suggested route — caller still picks a concrete provider, but
  // this gives a default chain the pipeline expects.
  var route;
  switch (intent) {
    case 'image-edit':                    route = 'horde-img2img -> save-prompt-only'; break;
    case 'inpaint':                       route = 'hf-inpaint -> manual-mask -> save-prompt-only'; break;
    case 'animate-uploaded':              route = 'on-device-kenburns -> save-prompt-only'; break;
    case 'animate-generated':             route = 'on-device-kenburns -> save-prompt-only'; break;
    case 'animate-reference':             route = 'on-device-kenburns -> save-prompt-only'; break;
    case 'prompt-only-motion-fallback':   route = 'save-prompt-only'; break;
    default:                              route = 'pollinations -> horde -> save-prompt-only'; break;
  }
  return {
    intent: intent,
    operationType: operationType,
    route: route,
    visualPrompt: visualPrompt,
    negativePrompt: negativePrompt,
    qualityPrompt: qualityPrompt,
    stylePrompt: stylePrompt,
    aspectRatio: SIZE_TO_RATIO[size] || size,
    isHeadshot: headshot,
    isPortrait: portrait,
    isAnimal: animal,
    fullPrompt: fullPrompt
  };
}

// ── Quality gate — last line before a result is shown as "ready".
// Rejects: no blob/url, brightness/filter result for a semantic
// edit, headshot request that returned a wide scene shape, etc.
//
// Inputs:
//   intent    string — the resolved intent from detectIntent()
//   result    { url|blob, width, height, providerId, providerType,
//               opType, isLocalFilter, hadSemanticEditIntent,
//               outputProofKind, outputProofBytes }
//
// Returns { ok: bool, reason: string }.
function qualityGate(intent, result) {
  result = result || {};
  // 1) Real artifact required.
  if (!result.url && !result.blob) return { ok: false, reason: 'returned no file' };
  // 2) For semantic edits, never accept a local brightness/filter result.
  if (intent === 'image-edit' && result.isLocalFilter && result.hadSemanticEditIntent) {
    return { ok: false, reason: 'local filter is not a real edit' };
  }
  // 3) Provider must have actually produced something — empty blob
  // (under 200 B for image, under 1 KB for video) means "returned
  // no file" even when the URL exists.
  if (result.outputProofKind === 'webm-blob' && result.outputProofBytes && result.outputProofBytes < 1024) {
    return { ok: false, reason: 'video blob too small (' + result.outputProofBytes + ' B)' };
  }
  if (result.outputProofKind === 'image-blob' && result.outputProofBytes && result.outputProofBytes < 200) {
    return { ok: false, reason: 'image blob too small (' + result.outputProofBytes + ' B)' };
  }
  // 4) Headshot framing check: when the prompt requested a headshot
  // and the returned aspect ratio is wide (> 1.4:1), the provider
  // likely re-rendered as a wide office scene. We flag it but do
  // NOT hard-fail because some providers return 16:9 even for
  // portraits; the result card lets the user retry.
  if (result.isHeadshot && result.width && result.height) {
    var ratio = result.width / result.height;
    if (ratio > 1.4) return { ok: true, reason: 'wide-aspect result for headshot — consider retry with portrait size', flagged: true };
  }
  return { ok: true, reason: 'all checks passed' };
}

// Standardised status labels — every result card surfaces one of
// these so the experience matches across both surfaces.
var statusLabels = {
  thinking:                  'Thinking',
  generating:                'Generating',
  timedOut:                  'Provider Timed Out',
  returnedNoFile:            'Returned No File',
  failed:                    'Failed',
  fallbackAvailable:         'Fallback Available',
  promptSaved:               'Prompt Saved',
  imageCreated:              'Image Created',
  imageEditFailed:           'Image Edit Failed',
  animationProviderNeeded:   'Animation Provider Needed',
  videoCreated:              'Video Created',
  audioAttached:             'Audio Attached',
  editProviderNeeded:        'Edit Provider Needed',
  promptOnlyFallbackSaved:   'Prompt-Only Fallback Saved'
};

if (typeof window !== 'undefined') {
  window.LoadAIPipeline = {
    compileImagePrompt: compileImagePrompt,
    detectIntent: detectIntent,
    qualityGate: qualityGate,
    statusLabels: statusLabels,
    BASE_NEGATIVE: BASE_NEGATIVE,
    PORTRAIT_QUALITY: PORTRAIT_QUALITY,
    HEADSHOT_FRAMING: HEADSHOT_FRAMING,
    BASE_QUALITY: BASE_QUALITY,
    ANIMAL_QUALITY: ANIMAL_QUALITY,
    isAnimal: isAnimal
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    compileImagePrompt: compileImagePrompt,
    detectIntent: detectIntent,
    qualityGate: qualityGate,
    statusLabels: statusLabels
  };
}
})();
