# SESSION HANDOFF — 2026-05-09

## Open blocker (top priority for next session)

`origin/main` is at `8e62bd6` (Dependabot actions/checkout-6 merge).
Five shipping commits on `claude/fix-session-sending-TVMbW` HAVE NOT
LANDED ON MAIN despite being ready and tested. Pages serves `main`,
so iPad cannot see any of them.

Branch tip: `54ece04` (merge commit that incorporates `8e62bd6` so
the feature branch is fast-forward-able into main).

Commits queued for main, in order:

| sha | label |
|---|---|
| `efa9677` | Load v17g74 — in-chat edit-provider config + animal anatomy gate |
| `ad6f219` | Load v17g75 — mask-painter wired to HF SDXL inpaint (true source-preserving edit) |
| `56a5cc4` | Study v79 — iPad TTS wake-up (sound dropping after silence) |
| `bee68ef` | Attain v72 — Learning Quality Engine (POS / parity / blind-solve gate) |
| `c5d37ab` | Study v80 — Learning Quality Engine ported to Study |
| `54ece04` | merge of `origin/main` into the feature branch (carries the Dependabot commit forward) |

## Push status

- Direct push to `refs/heads/main`: **HTTP 403 / send-pack disconnect** on every retry today.
  Earlier in the session there was also a `non-fast-forward` error.
  The non-fast-forward was cured by merging `origin/main` into the
  feature branch — the 403 persists past that fix.
- Push to `refs/heads/claude/fix-session-sending-TVMbW`: **succeeds**.
  Branch is up to date at `54ece04`.

The 403 looks like a branch-protection rule on `main`, not a credential
problem. Token / fetch / branch-push all work; only the direct push to
`main` is selectively blocked.

## What the user should do

Open a Pull Request from `claude/fix-session-sending-TVMbW` into `main`
and merge it via GitHub UI:

```
https://github.com/DssOrit/ancient-covenant-scrolls/compare/main...claude/fix-session-sending-TVMbW
```

After merge, hard-refresh iPad until each app's SW reports the new cache:

| App | Cache string after merge | Build marker |
|---|---|---|
| Study | `acr-study-v80` | (no badge — verify via the new Quality Audit panel) |
| Attain | `attain-v72` | n/a |
| Load | `load-v17g75` | badge `v17g75` · `CHAT-STUDIO-v4.9-2026-05-08-v17g75 (mask-painter + HF SDXL inpaint)` |

## Verifications to run after merge

### 1. Study v80 — Learning Quality Engine

- File `study/lib-attain-quality.js` exists on main.
- File `study/index.html` line 110 reads `<script src="lib-attain-quality.js"></script>` BEFORE `<script src="study.js"></script>`.
- File `study/sw.js` line 13 reads `const CACHE = 'acr-study-v80';` and SHELL contains `'lib-attain-quality.js'`.
- iPad: open any chapter → tap **Progress** → scroll. A purple-bordered "Learning Quality Audit" card sits between **Backup & Restore** and **Back to activities**, with a **Run Learning Quality Audit** button that renders a PASS / PARTIAL / FAIL badge + counts + reason frequency.

### 2. Study v79 — TTS wake-up

- iPad: open any chapter → tap any speaker icon / Listen & Learn. Audio plays after the page sat idle (was failing pre-v79).
- Code path: `speakText` and `playVerse` now do `resume() → cancel-if-busy → setTimeout(speak, 0)`. Voices race waited up to 1.5s.

### 3. Attain v72 — Learning Quality Engine

- File `attain/lib-attain-quality.js` exists on main.
- iPad: open any book → **Settings** → scroll to "Learning Quality Audit" purple card → tap **Run Learning Quality Audit**.
- Expected: PASS / PARTIAL / FAIL badge + total / pass / fail / score / elimination resistance % / blind-solve count + reason frequency list.

### 4. Load v17g75 — mask-painter + HF SDXL inpaint

- iPad: refresh until badge reads `v17g75`.
- Configure a free Hugging Face token via Image Prompt > Settings (or via the in-chat **Configure edit provider** button).
- Create a red car. Tap the small reference-image thumbnail's **Paint mask** button. Paint the area to change. Apply mask. Type "Add a small shih tzu dog beside it". Send.
- PASS = car remains pixel-identical outside the mask; dog inpainted inside the mask; result meta says `op: inpaint · source preserved: yes · mask used: yes`.
- FAIL = car regenerates / no inpaint / text-to-image fallback fires.

## NOT marked VERIFIED — every row above is READY FOR USER VERIFICATION until iPad confirms.

## Plan reminders carried from earlier today

- Today's user-set scope: Study app only. Load + Attain follow-ups deferred to tomorrow per direct user instruction.
- Tomorrow's first-action reminders the user asked me to surface:
  - Load: 5 commits queued for main merge (above). Latest blocker — true source-preserving image edit (Refine/Edit) requires merging the feature branch then iPad-testing the mask-painter + HF SDXL inpaint.
  - Attain: v72 Learning Quality Engine ships POS / parity / blind-solve gate. Phases 2–4 deferred — non-MC question types (Speaker quiz / True-False / Rhyme groups / matching / ordering / paraphrase identification / concept grouping / context interpretation / thematic connections / memory reconstruction), difficulty tiers (easy / medium / hard / expert), spaced-repetition adaptive frequency tuning beyond SM2, weak-area detector, confidence tracking, 100-question acceptance test runner with the 90 / 90 bar.

## Locked session rules (carried)

- No false positives. Never mark VERIFIED without iPad confirmation.
- Don't give updates while building. Only deliver confirmed final results. Minimum text replies.
- No emojis anywhere.
- No external product names in user-facing labels.
- Cache strings forward-only.
- Push to feature branch AND main on every shipping commit. Pages serves main.
- Do not touch ACR Reader (root `/`).

## Backups

- Backup branch for today's stable points should be created from `54ece04`
  AFTER it lands on main: `backup/2026-05-09-v80-attain-v72-load-v17g75`.
  Recovery: `git checkout backup/2026-05-09-v80-attain-v72-load-v17g75`.

## Capability gaps in this session

- Direct push to `main` blocked by HTTP 403 / branch-protection-like
  behavior. Workaround: PR-based merge from `claude/fix-session-sending-TVMbW`.
- Cannot reach `dssorit.github.io` from sandbox; cannot self-verify
  what Pages is actually serving until the user confirms on iPad.
- iPad-only behaviour (Safari speechSynthesis idle-state, MediaRecorder,
  HF inpaint round-trip) cannot be tested from sandbox; flagged in plan.
