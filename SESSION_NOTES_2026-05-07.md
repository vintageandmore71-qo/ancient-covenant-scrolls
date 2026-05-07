# SESSION_NOTES 2026-05-07

## Current state

- **Latest commit:** `70462a2` (about to bump to v17g54 with Piper paste-back capture).
- **Branch:** `claude/fix-session-sending-TVMbW`.
- **Cache (Load):** `load-v17g53` -> bumping to `load-v17g54`.
- **Pages serves from:** `main`. Every shipping commit pushed to both
  `main` and the feature branch.
- **Backups:** `backup/2026-05-07-v17g53` will be created at the
  end-of-session push (see Backups below).

## Built today (chronological, end-of-session list)

The session ran the full **Reliability Infrastructure Addendum** —
17 items, each with its own `lib-load-*.js` library, a visible
`tools/*.html` audit page tiled in Handoff Tools, an SW shell entry
for offline, and a build-time Node self-test that PASSED before push.

1. **Provider Health Monitor** (#1) — `lib-?` and
   `tools/provider-health.html`. v17g37.
2. **Auto-Fallback Router** for image (#2) — Pollinations -> AI Horde
   anonymous async (120 s cap with live queue progress) ->
   prompt-only. Wired into Chat Studio. v17g38.
3. **Output Proof Gate** (#3) — `lib-output-proof.js` +
   `tools/output-proof.html`. Real Blob magic checks (WebM EBML,
   WAV RIFF/WAVE, ZIP PK\x03\x04). v17g39.
4. **Generation Queue** (#4) — `lib-load-queue.js` +
   `tools/generation-queue.html`. 9 spec statuses, persistent in
   `LoadDB.kv`, real Cancel + Retry. Chat Studio wires every send
   into the queue. v17g40.
5. **Retry & Resume System** (#5) — `lib-load-resume.js` +
   `tools/resume-recovery.html`. Auto-flips non-terminal jobs older
   than 60 s to Failed (interrupted by reload). Recovers last
   prompt + reference image + last-attached scene Blobs. v17g41.
6. **Provider Timeout Rules** (#6) — `lib-load-timeouts.js` +
   `tools/timeouts.html`. 23-entry per-intent matrix matching the
   spec (image 45 s, image-to-image 60 s, video/animation 480 s,
   audio/sfx/voice/narration 120 s, local-server-check 10 s,
   provider-connection-test 10 s) plus aliases + provider-specific
   overrides. Live self-test wraps a 5 s sleep in a 200 ms timeout
   and confirms rejection inside 200 ms. v17g42.
7. **Local-only Mode** (#7) — `lib-load-local-only.js` +
   `tools/local-only.html`. `guardedFetch` rejects with the spec
   message before any network traffic leaves the device. Persistent
   in `LoadDB.kv`. Chat Studio's text/image/Horde/Pollinations call
   sites all guard against `isOn()`. v17g43.
8. **Provider Budget / Cost Guard** (#8) — `lib-load-budget.js` +
   `tools/budget-guard.html`. `allowPaid` OFF default; toggle
   requires `window.confirm` + a positive monthly cap before it
   can flip on. `checkPaidUse` blocks paid calls without a cap.
   v17g44.
9. **Asset Rights Inspector** (#9) — `lib-load-rights-inspector.js`
   + `tools/rights-inspector.html`. 9-status enum;
   `unknown`/`needs-review` block publish-prep. v17g45.
10. **Scene Asset Dependency Checker** (#10) — `lib-load-scene-
    deps.js` + `tools/scene-dependencies.html`. Detects Missing
    file / Broken path / Unattached asset / Rights missing. v17g46.
11. **Web Audio Scene Mixer** (#11) — `lib-load-mixer.js` +
    `tools/scene-mixer.html`. Real AudioContext graph; play()
    returns `{ startedAt, lanesStarted }`; UI only claims started
    when BufferSources actually fire. v17g47.
12. **Audio Cue Sheet / Timeline SFX** (#12) — `lib-load-cue-
    sheet.js` + `tools/cue-sheet.html`. Persistent timed cues
    `{ time, type, asset }` matching the spec example exactly.
    Schedules cues against `LoadMixer`. v17g48.
13. **FFmpeg / Audio-Video Muxing future path** (#13) — `lib-load-
    mux.js` + `tools/mux-future.html`. Architecture reserved; every
    op rejects "not implemented in MVP" until `registerBackend()`.
    v17g49.
14. **Model Capability Audit** (#14) — `lib-load-capability-
    audit.js` + `tools/capability-audit.html`. Confirms all 65
    providers declare 24 capability flags as booleans;
    `checkRoute()` blocks a capability mismatch (audio request to
    image-only, etc.). v17g50.
15. **Prompt Compiler** (#15) — `lib-load-prompt-compiler.js` +
    `tools/prompt-compiler.html`. Compiles a single user request
    into the spec's 11 production layers. Empty layers stay `''`.
    Safety-baseline negative prompt always included. v17g51.
16. **Continuity Lock System** (#16) — `lib-load-continuity.js` +
    `tools/continuity-lock.html`. 8 spec locks per thread.
    `applyLocksToPrompt` is idempotent; `diff()` reports drift.
    v17g52.
17. **Versioned Generation History** (#17) — `lib-load-versions.js`
    + `tools/version-history.html`. 5 spec kinds, 3 statuses, spec
    label `scene_NNN_kind_vN`. Restore writes payload back into the
    scene record. v17g53.

Plus today: budget-guard reclassification fix (gemini/groq now
declare the `free` flag; new `classification()` API exposes the
three-bucket free / license-review-required / paid distinction;
toggle requires confirm + positive cap), cap-required guard
condition (per the user's 8-item paid-provider concern list).

### 5 yesterday-list items — final status

1. **X-AI-14 Tier 14** — Done Phase 1: Style Library + 7-layer
   Chat Flow + 18-fallback panel shipped. 14b/14c/14d providers in
   registry. 15 HF Spaces connector intentionally future-only.
2. **Browser Mask Editor (X-AI-MASK)** — Done. Tiled in Handoff
   Tools.
3. **Character Consistency (X-CC)** — Done. Tiled in Handoff
   Tools.
4. **Piper TTS Stage 1 unblock** — Still blocked on the live
   `play()` error from your iPad. v17g54 ships a "Copy as plain
   text" paste-back capture so tomorrow's session can fix it
   blind. Plan below.
5. **LOAD-ECO acceptance test pass** — Done. Section 18 manual
   rows still need iPad sign-off (not a code task).

## Outstanding / blocking

- **Piper Stage 1.** Single open blocker. Tomorrow needs a copy
  of the plain-text diagnostic from `tools/piper-resilience.html`
  (reachable via Handoff Tools > Piper TTS diagnostic).

## Pending / parked

None new. The Reliability Addendum + 5.7 README + branding ™
passes are all complete. Future work (paid provider wiring, real
HF Inference, X-AI-CHAT-STUDIO inline cards beyond Phase 2) is
deliberately deferred per master rule (free / local-first MVP).

## Capability gaps in this session

- Could not reach `dssorit.github.io` from sandbox; verification
  done via `raw.githubusercontent.com` + Node syntax / behaviour
  tests on every new lib.
- iPad-only behaviour (Safari `play()` quirks, `decodeAudioData`
  call-form, mic permission for browser TTS recording) cannot be
  tested from sandbox; flagged in plan.

## Piper plan for tomorrow

Goal: ship Piper Stage 1 fix in a single commit once we have the
diagnostic plain-text from your iPad.

### Step 1 — Capture (your action, on iPad)

1. Open Load > Handoff Tools > **Piper TTS diagnostic**
   (or directly: `tools/piper-resilience.html`).
2. Tap each diagnostic in order, top to bottom: Raw audio,
   Browser voice, Piper generate, Piper generate + play.
3. Tap **Copy as plain text (paste-back)** at the bottom.
4. Paste the whole block into the next Claude session.

### Step 2 — Branch the fix on which step failed

The plain-text panel surfaces the failing step + exact error.
Tomorrow's commit follows the branch:

- **Test 1 (Raw audio) fail** -> patch `lib-piper.js` raw-WAV
  path. Likely cause: Safari mute-switch / silent-mode behaviour
  on iPad. Fix: defer first AudioContext until a user gesture and
  add a one-time unlock-on-tap.
- **Test 2 (speechSynthesis) fail** -> patch the iOS-Safari
  voices race: `getVoices()` returns empty until the
  `voiceschanged` event fires. Fix: gate the test on
  `voiceschanged` and add a 1 s fallback timer.
- **Test 3 (Piper generate) fail** -> patch the WASM init / model
  load path inside `lib-piper.js`. Likely fix: confirm the model
  fetch URL is alive (the existing diagnostic reports HTTP
  status); rebuild voice cache if stale.
- **Test 4 (Piper generate + play) fail** -> patch the playback
  path. Likely fix: switch from `audio.src = URL.createObjectURL
  (blob)` + autoplay to a tap-to-play affordance for iPad's
  user-gesture-required autoplay policy.

### Step 3 — Verify

Re-run the same diagnostic on iPad after the patch lands. The
plain-text panel must report PASS on the previously-failing step.
Stage 2 voices roll out only after Stage 1 PASS.

## Today's commit log

```
70462a2 Load v17g53: Versioned Generation History (reliability #17)
7fd55db Load v17g52: Continuity Lock System (reliability #16)
e7b9945 Load v17g51: Prompt Compiler (reliability #15)
c4eae42 Load v17g50: Model Capability Audit (reliability #14)
078283b Load v17g49: FFmpeg / Audio-Video Muxing future path (reliability #13)
a7d3a2d Load v17g48: Audio Cue Sheet / Timeline SFX (reliability #12)
40f28ab Load v17g47: Web Audio Scene Mixer (reliability #11)
360b245 Load v17g46: budget classification fixes + Scene Asset Dependency Checker (#10)
987ea1d Load v17g45: Asset Rights Inspector (reliability #9)
fbc4f4b Load v17g44: Provider Budget / Cost Guard (reliability #8)
7caa40b Load v17g43: Local-only Mode (reliability #7)
57b4f17 Load v17g42: Provider Timeout Rules (reliability #6)
145f0da Load v17g41: Retry & Resume System (reliability #5)
dbe2ab6 Load v17g40: Generation Queue (reliability #4)
4bde23c Load v17g39: Output Proof Gate library + audit (reliability #3)
e237eb2 Load v17g38: Auto-Fallback Router for image (reliability #2)
f40eca9 Load v17g37: Provider Health Monitor (reliability #1)
... (earlier commits in MASTER_BACKLOG)
```

## Backups

- `backup/2026-05-07-v17g53` will be pushed at end-of-session
  pointing at `main` HEAD. Recovery: `git checkout
  backup/2026-05-07-v17g53`.
