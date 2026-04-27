# Session Notes — 2026-04-27

## ⏸ PARKED — resume tomorrow

### Piper TTS in Load (v17bx — working but voice not playing yet)

**Where we got to:**
- Shared engine `/lib-piper.js` ships LoadPiper API across all 5 ACR apps.
- Load Settings → Premium voice — Piper section has Install / Repair /
  Test / Skip / 4-test Diagnostics expander.
- Tour narration falls through Piper → Safari speechSynthesis cleanly.
- v17bv fixed "no available backend found" by pre-loading
  onnxruntime-web@1.17.1 with `wasm.wasmPaths` pointed at jsDelivr.
- v17bw verifies the OPFS config JSON parses before declaring install
  success.

**Last error from user (v17bw, after Repair):**
"Repair completed but Piper still cannot play. Falling back to iOS voices."

**v17bx (already pushed) now surfaces the actual exception in the
progress label** — next time the user repairs, we'll see the real
post-install say() error instead of the swallowed generic message.

### What to do first thing tomorrow

1. Ask user to force-refresh Load (badge `v17bx`), then Settings →
   Piper → 🩹 **Repair voice**.
2. The error message under the progress bar will now tell us exactly
   why predict() is failing post-install. Likely candidates:
   - Voice model file (`*.onnx`) is incomplete despite config being
     fine → need to verify model size in install too.
   - Onnxruntime needs an `executionProviders` array we didn't set.
   - `en_US-amy-low` voice file URL on HuggingFace has changed —
     swap to `en_US-hfc_female-medium` or `en_US-libritts_r-medium`.
3. If error is opaque, run Diagnostic 3 (Piper generate) for more
   detail; that path bypasses our wrappers.

**Don't iterate further without the new exception text** — every
guess so far has been one layer off.

### User feedback on this session
- Frustrated by long Piper iteration loop. Wants visible progress
  not endless "try this".
- Confirmed Tests 1 (raw audio) + 2 (browser voice) pass on iPad,
  Tests 3 + 4 (Piper) fail.

---

## Other tracks in flight

- **Stage 2 of Piper rollout** (ACR / Attain / Study read-aloud)
  blocked on Stage 1 actually working.
- **Stage 4** (Attain Jr per-character voices via LibriTTS multi-
  speaker) blocked on Stage 1.
- **Tour** (v17bl) shipped fine; uses Piper when available else
  speechSynthesis.

---

## Today's shipped commits (chronological)

- `0c874c5` — ACR + Attain top bars scroll, Attain sidebar overlay
- `0df53b7` — Load v17bk: fix AI helper duplicate-answer bug
- `637be9f` — Study + Attain Jr top bars scroll
- `3306a0a` — Load v17bl: interactive guided tour
- `b34c4b0` — Piper Stage 1: shared engine
- `9b3a7f6` — Stage 1.1: Web Audio API playback
- `832eb27` — Stage 1.2: corrupt-cache auto-recover
- `87d970f` — Stage 1.3: Re-install button
- `2887e99` — Stage 1.4: aggressive uninstall + OPFS cross-check
- `ba11169` — Stage 1.5: clean re-import + visible install errors
- `a257b18` — Stage 1.6: post-install verify + Repair button
- `21a9148` — Stage 1.7: relaxed verify + Skip Piper exit
- `258f192` — Stage 1.8: hard 4-layer audio diagnostics
- `48275e7` — Stage 1.9: ONNX wasmPaths fix (no available backend)
- `5db1fa8` — Stage 1.10: verify config JSON parses
- `305af78` — Stage 1.11: surface real repair-test exception (v17bx)
