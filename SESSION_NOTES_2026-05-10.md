# SESSION NOTES — 2026-05-10

## Current state

Branch: `claude/fix-session-sending-TVMbW-i4JHc`
Tip: `91f7d39` (Merge PR #4 — Study v79/v80 + Attain v72 + Load v17g74/v17g75)
main: same SHA — everything is live on Pages.

## REMINDER FOR NEXT SESSION — TOP PRIORITY

**AI Chat Studio and Image Prompt are not working on the live site.**
User confirmed this today (2026-05-10).
Do NOT mark either section complete without user iPad verification.

Required tests:
1. Image Prompt / Quick Image Tool — can it generate an image? Does the result card appear?
2. AI Chat Studio — does Send do anything visible? Does a result card appear?
3. Follow-up edit grounding — does editing a result stay grounded in the original image?
4. Shared provider chain — are both surfaces using the same 17-provider chain?

These were flagged as broken in inbox files 5.8 AI Studio Fix.docx and 5.8 READ AI Studio Not working.docx.

## Built / confirmed today

- Study v80 (acr-study-v80) confirmed live on main — verified via GitHub MCP.
- lib-attain-quality.js confirmed present on main.
- study/index.html script tag confirmed present.
- 403 push issue from last session: explained and resolved (Dependabot non-fast-forward conflict, fixed via PR #4 merge).

## Inbox files read this session (5/6–5/8 backlog)

### 5.7 AI Providers Verification.docx
- Requests audit of 34-slot provider registry (original 17 image + 17 new free/open/local slots).
- Requests verification of all capability categories (text, image, imageToImage, inpainting, upscale, faceRestore, styleTransfer, referenceImage, imageAnimation, video, motionPrompt, performanceAnimation, audio, sfx, ambience, music, voice, narration, local, free, requiresApiKey, requiresLocalServer, documentParsing, safety).
- Requests verification of full Load AI Chat production pipeline (14 steps).
- Status: NOT YET ACTIONED. Audit still needed.

### Load Main AI Addendum.docx (5/7)
- Adds X-AI-AUDIO Sound and Atmosphere Engine to the roadmap.
- Three sound paths: embedded video audio, separate generated audio/SFX, sound prompt fallback.
- Required status labels: Audio embedded / Separate audio generated / Sound prompt saved / Audio provider needed / Silent video / Audio failed / etc.
- Required data fields: audioPrompt, sfxPrompt, musicPrompt, ambiencePrompt, voicePrompt, audio, music, sfx, audioStatus, audioProvider, audioOutputProof, audioEmbedded, audioMuxed, audioDuration, audioRightsStatus.
- Required UI cards: animation request, animation progress, audio generation, video result, audio result.
- Status: NOT YET ACTIONED. Captured in MASTER_BACKLOG as X-AI-AUDIO.

### Load Main Next Build Plan.docx (5/7)
- 13-part plan to upgrade Load Main into full ecosystem hub.
- Part 1: Fix contradictory AI/privacy copy.
- Part 2: Feature Verification Dashboard (43 tests, Run All Tests button).
- Part 3: LoadStudio package support (.loadstudio.zip / .cinepwa.zip).
- Part 4: Safety and Rights validation panel.
- Part 5: Export receipts after every export.
- Part 6: Ecosystem routing buttons (Open in Load, Prepare for LoadStudio, Prepare for LoadPlay, etc.).
- Part 7: Sample Projects section.
- Part 8: PWA Book Export standard.
- Part 9: Piper/TTS resilience improvements.
- Part 10: AI provider routing with no false positives.
- Part 11: Module list (diagnostics, packages, sandbox, ai, voice, samples, ecosystem).
- Part 12: Code structure (diagnostic result format, validator, rights, receipt schemas).
- Part 13: 23 acceptance criteria.
- Status: NOT YET ACTIONED.

### 5.8 AI Studio Fix.docx
- One controlled patch: AI Chat Studio usability + provider-routing gap.
- Decision: Option B — extract shared provider library (lib-load-image-providers.js).
- Both Image Prompt and AI Chat Studio must import the same 17-provider chain.
- Simple Creator View: only show primary actions, hide technical details in collapsed Advanced Details.
- Plain labels: Create image / Edit image / Animate / Add sound / Write prompt.
- Readability requirements: larger tap targets, more whitespace, plain language.
- Handoff from Image Prompt must pass image, prompt, negative prompt, provider, op type, output proof.
- 16 tests required before complete.
- Status: NOT YET ACTIONED. This is the patch for the broken AI Studio issue.

### 5.8 READ AI Studio Not working.docx
- Full fix plan for Load AI Chat and Image Prompt.
- Part 1: Unify image system — shared lib-load-image-providers.js (Option B).
- Part 2: Fix AI Chat Studio image creation flow — result area must always show loading/success/failure card.
- Part 3: Fix semantic follow-up edit flow — follow-up must stay grounded in previous image, not generate new image.
- Part 4: Fix image quality / anatomy — quality prompt enforcement for human outputs.
- Part 5: Fix audio/SFX/voice — honest labels, no fake success for static/noise.
- Part 6: Fix animation — camera zoom must not be labeled as character animation.
- Part 7: Simplify AI Chat Studio UI — calmer, less crowded, Glam-like flow.
- Part 8: Keep both surfaces, connect them correctly.
- Part 9: Preserve package/output proof rules.
- Part 10: Fix provider timeout/fallback — no silent failure, always produce a card.
- Part 11: 9 test cases required.
- Status: NOT YET ACTIONED. Core fix document.

### PWA One Click Create.docx
- Parts 14–17 of Load Main Next Build Plan.
- One-click Build Standalone PWA ZIP button.
- 20-step build flow with real-time progress.
- Security scanner for every generated ZIP.
- 18 acceptance criteria.
- Status: NOT YET ACTIONED.

### load_ai_reliability_infrastructure_addendum.zip
- Adds reliability infrastructure on top of provider system.
- 1. Provider Health Monitor (Ready / Not configured / Failed / Rate limited / etc.)
- 2. Auto-Fallback Router (image → animation → sound fallback chains).
- 3. Output Proof Gate (image/video/audio/ZIP must exist before UI claims success).
- 4. Generation Queue (Queued / Preparing / Generating / Saving / etc.).
- 5. Retry and Resume System (save job state, recover from Safari reload).
- 6. Provider Timeout Rules (image 45s, image-to-image 60s, video 3–8min, audio 60–120s).
- Status: NOT YET ACTIONED.

## REMINDER FOR 2026-05-11 — START HERE

Test everything below on iPad before building anything new.

**Load v17g76 audio routing — verify these 6 cases:**
1. "People laughing in the background" — must route to SFX WAV, NOT be read aloud
2. "Engine roar" — must play a low sawtooth rumble WAV, not a 440Hz tone
3. "Wind blowing" — must play filtered noise WAV
4. "Say hello world" — must use TTS (no WAV card)
5. Any unmatched SFX prompt — must show red "Placeholder tone" badge (not green OK)
6. Engine prompt badge — must show "Engine placeholder" label

**AI Chat Studio and Image Prompt — still broken, not yet verified:**
- Can it generate an image? Does a result card appear?
- Does Send do anything visible in AI Chat Studio?
- Does editing a result stay grounded in the original image?
- Inbox fix plan is in 5.8 AI Studio Fix.docx and 5.8 READ AI Studio Not working.docx — read those before building.

Confirm cache is live first: open `https://dssorit.github.io/ancient-covenant-scrolls/load/sw.js` and verify `CACHE = 'load-v17g76'`.
## Outstanding / blocking

- AI Chat Studio and Image Prompt not working — user to verify on iPad after fix is built.
- 5/7 inbox files `5.7 load_ai_complete_addendum_since_last_zip.zip` and `5.7 load_ai_chat_animation.zip` referenced in MASTER_BACKLOG but not present in inbox — may have been processed in a prior session. Confirm with user.
- Attain v72 Learning Quality Engine — not yet user-verified on iPad.
- Load v17g75 mask-painter + HF SDXL inpaint — not yet user-verified on iPad.

## Pending / parked

- All X-AI-* roadmap items: X-AI-14, X-AI-MASK, X-AI-PROVIDERS, X-AI-CHAT-STUDIO, X-VIDEO-AI, X-AI-AUDIO.
- Load Main Next Build Plan (13 parts) — not started.
- PWA One Click Create — not started.
- Reliability Infrastructure Addendum — not started.
- Piper Stage 2 — blocked on Stage 1 verified working.
- Password hash rotation (HANDOFF.md) — pending user confirmation of new password.

## Capability gaps this session

- Cannot reach dssorit.github.io directly — Pages verification requires user iPad report.
- Cannot test UI on iPad — all AI Studio / Image Prompt functionality must be user-verified.

## Today's commit log

<<<<<<< HEAD
- `c1c0900` — Load v17g76: audio routing fix (sfxLikeRx + engine SFX + honest tone labeling)
- `a9d05a6` — Merge origin/main (CLAUDE.md shipping flow update) into feature branch
- PR #6 squash-merged to main — SHA `d842909`
=======
No new commits this session. All session activity was diagnostic / planning.
>>>>>>> origin/main
