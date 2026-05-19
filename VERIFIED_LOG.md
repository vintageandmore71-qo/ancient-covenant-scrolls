# Verified-Working Log

Per-version record of what the user actually tested and signed off on.
Append a new row at the moment of sign-off, NOT at end-of-day. This
is the source of truth when the app breaks and we need to know which
state to roll back to and which exact behaviors that state guarantees.

## How to read this file

- One row per user-verified version
- "Test run" = exact prompt or interaction the user performed
- "Confirmed working" = features the user words actually prove (don't
  list features that *should* work — only what was seen)
- "NOT tested" = features that exist in this version but were not
  exercised in this verification (so a future regression here is not
  caught by this row)

## Recovery shortcut

If a later version breaks something, find the most recent row whose
"Confirmed working" includes the broken feature. Run
`git checkout backup/<that-version>` to return to the last proven
state for that feature.

## Logging discipline (mandatory)

Triggered the moment the user says "perfect", "that fixed it",
"working", "verified", or similar. Do NOT batch at end-of-day. Record:
- Version + commit SHA
- Date + browser/device
- Exact prompt or action the user ran
- Features the user-visible result actually proves
- Features in that build that were NOT tested in this run

---

## Versions

### v17dg — `dddcc3c` — 2026-04-29

- **Status:** Last user-verified working state for Image Prompt
- **Confirmed by user (this session):** "the last verified working
  state was v17dg before you moved to Wave 2"
- **What v17dg shipped:** dropped pay-per-use providers (Fal,
  Replicate, DeepInfra, Stability, Hyperbolic), reverted AI Horde to
  text-to-image (img2img dropped — too slow), Pollinations primary
- **Image gen chain (7, all sustained-free):** Pollinations,
  Hugging Face, Cloudflare, Together, AI Horde, Google Imagen, DeepAI
- **Chat / vision providers (6):** Puter, Google Gemini, OpenRouter,
  Cerebras, Anthropic (paid, opt-in), HF Mistral chat
- **Inherited features:** multi-turn editing (result → next input),
  Save-to-Library, Continue chips, Scene Lock, intent router,
  circuit-breaker health-board, local Jimp ops
- **Specific test the user ran:** not separately captured at the
  time. Going forward, this section will record the exact prompt
  and result.
- **Recovery:** `git checkout backup/2026-04-29-v17dg`

### v17dh through v17dm — NOT user-verified

Shipped after v17dg without explicit sign-off. Caused churn. Backups
exist (`backup/2026-04-29-v17dh` through `backup/2026-04-30-v17dm`)
but should not be treated as known-good baselines.

### v17dn — `36a2387` — 2026-04-30

- **Status:** Core image-loop **verified working** by user this date.
  Quality issue logged but functional pipeline confirmed end-to-end.
- **Browser/device:** iPad (Safari assumed — confirm next session)
- **Test 1 (image creation):** prompt = "a woman on a boat".
  Result: image returned, woman on a boat as requested. **Face
  rendered blurry.**
- **Test 2 (multi-turn refinement):** with the turn-1 result as
  input, prompt = "add a bird". Result: image returned with the
  bird **added** to the existing scene. **Slight blur retained**
  in the second output.
- **Confirmed working:**
  - Image creation reaches a result via the chain (likely Pollinations
    default, since user did not configure additional keys)
  - Multi-turn refinement / "promote to add to that exact image" —
    turn-1 result fed into turn-2 prompt and the bird appeared
    in the same scene
  - Scene preservation across turns (boat scene retained)
- **Known issue:** face quality and overall sharpness is poor on
  the default provider. None of the 4 SDXL-class slots added in
  this build (Pollinations Flux #8, AI Horde SDXL #10, Cloudflare
  SDXL-Lightning #11, HF SDXL-Turbo #12) were exercised — the
  chain stopped on Pollinations' first-success.
- **NOT tested in this run:**
  - Save to Library button
  - Continue chips
  - Sharper SDXL-class providers (8 / 10 / 11 / 12)
  - Console errors / network anomalies (not reported)
- **Recovery if needed:** `git revert 36a2387 && git push origin main`
  → returns live to v17dm. Or `git checkout backup/2026-04-29-v17dg`
  for clean v17dg baseline.

### v17e1 / v17e2 / v17e3 — FAILED — 2026-04-30

- **Status:** Roadmap item #2 (background removal) — **NEVER VERIFIED. Tab crashed on iPad Safari each ship.**
- **v17e1 (`ff8461c`)**: OpenCV.js GrabCut path — crashed loading 8 MB WASM
- **v17e2 (`792e86f`)**: Hotfix routing to HF briaai/RMBG-1.4 — also crashed
- **v17e3 (`583141f`)**: Sentinel-throw to park the feature — site stopped loading entirely
- **Resolution:** v17e4 (`2fff569`) reverts the image-prompt source to v17e0 (verified working) and bumps caches forward (`load-v17e4` / `image-prompt-v35`) so the broken cached SW is evicted on hard refresh.
- **Lesson logged:** any iPad-side WASM model (OpenCV, Transformers.js, etc.) needs a strict memory test BEFORE wiring into runImageTask. Background removal stays parked.

### v17e4 — `2fff569` — 2026-04-30

- **Status:** Failed — code was correct (byte-identical to v17e0) but iPad's stuck v17e3 service worker prevented load.
- **Resolution:** Rolled forward to commit `165e0b0` (revert to v17e0 cache strings + source).

### Restoration to v17e0 — `165e0b0` — 2026-04-30

- **Status:** Loading confirmed by user ("Working now").
- **State:** Byte-identical to v17e0 (`593d410`) — Manual Mask painter, 12-provider chain, runImageTask, character slot, Output Receipts, Test Keys diagnostic. Cache strings: `load-v17e0` / `image-prompt-v31`.
- **Lesson logged:** No more iPad-side WASM/heavy-model experiments without a memory-budget test on a real device first. Background removal stays parked.
- **Recovery:** `git checkout backup/2026-04-30-v17e0`

### v17e8 — `1bd6cea` — 2026-04-30

- **Status:** Loading confirmed by user ("Working").
- **What it adds on top of v17e0:**
  - SiliconFlow provider (FLUX.1 Kontext img2img + FLUX.1-schnell, opt-in, free-entry credits)
  - Real-ESRGAN (HF Inference) — upscale slot
  - GFPGAN (HF Inference) — face restoration
  - CodeFormer (HF Inference) — alt face restoration
  - Settings UI for SiliconFlow key + 4 new toggles
  - `reply.match` error fixed (callPuter response normalized at source)
  - `taskOnly` flag on Real-ESRGAN (groundwork for next ship)
- **Image provider count:** 17 (Local SD + 12 from v17e0 + 4 added)
- **NOT yet tested:** new providers' actual gen calls, Real-ESRGAN/GFPGAN/CodeFormer routing for upscale/face-restore tasks
- **Recovery:** `git checkout backup/2026-04-30-v17e0` (last known fully-verified state)

### v17e0 — `593d410` — 2026-04-30

- **Status:** Roadmap item #1 (Manual Mask painter) — verified working by user.
- **Browser/device:** iPad Safari
- **Test run:** Uploaded a photo, tapped 🖌, painted a mask over the face/eyes region, tapped Done, sent a prompt to add sunglasses.
- **User words:** "Created sunglasses. Verified"
- **Confirmed working:**
  - 🖌 button enabled once image is attached
  - Mask painter overlay opens, brush + Done flow operates
  - `currentMask` populated; pipeline forced `taskType='inpaint'`
  - HF inpainting model returned a result with sunglasses on the masked region; un-painted area preserved
- **NOT tested in this run:**
  - Eraser tool / Clear button
  - Local SD inpaint path (`/sdapi/v1/img2img` with mask)
  - "Image-edit provider needed" fallback (not triggered — HF token configured)
- **Recovery:** `git checkout backup/2026-04-30-v17e0`

### v17dn (built) — `<pending>` — 2026-04-30 — original built-state row

### v17dn (built) — `<pending>` — 2026-04-30 — original built-state row

- **Status:** Built. Awaiting user verification.
- **Base:** v17dg restored
- **Added:** 5 new sustained-free image providers (slots 8-12) to
  reach a total of 12. All extensions of providers already in the
  chain (no new accounts/keys required):
  - 8. Pollinations Flux (`?model=flux`)
  - 9. Pollinations Turbo (`?model=turbo`)
  - 10. AI Horde SDXL (anonymous, `models: ['SDXL 1.0']`)
  - 11. Cloudflare SDXL-Lightning (`@cf/bytedance/...`)
  - 12. HF SDXL-Turbo (`stabilityai/sdxl-turbo`, separate slot)
- **Cache:** `load-v17dm` → `load-v17dn` (Load SW) + `image-prompt-v17`
  → `image-prompt-v18` (Image Prompt SW) + version badge bumped
- **NOT yet tested:** all new endpoints unverified live. User to
  test on iPad Safari and confirm.
- **Recovery if broken:** `git checkout backup/2026-04-29-v17dg`

---

## LOAD STUDIO — Editing Bay Music / Audio

### v163 — commit `6e293be` — music categories baseline (last known clean state)

- **Status:** Confirmed working by user (screenshot, 2026-05-18 session).
- **What worked:**
  - Vlog tab: `Mellow Demo` → `assets/audio/demo/demo-music-mellow.wav`
  - Pop tab: `Upbeat Demo` → `assets/audio/demo/demo-music-upbeat.wav`
  - Dynamic tab: `Energetic Demo` → `assets/audio/demo/demo-music-energetic.wav`
  - Fresh / Acoustic / Electronic / Hip-Hop: intentionally empty (no demo tracks)
- **Demo track names at this state:** Mellow Demo, Upbeat Demo, Energetic Demo — DO NOT RENAME THESE.
- **Recovery:** `git show 6e293be:loadstudio/lseb.js | grep -A 10 "_MUSIC_DEMO"`

### v166 — commit `77d533b` — music local-cache playback fix

- **Status:** Confirmed working by user (screenshot, iPad Safari, 2026-05-18).
- **Screenshot evidence:** debug log showed `meta dur=1.5`, `unlock EVT playing ct=0.00`, music audible.
- **What worked:**
  - Music Add gesture unlocks audio element silently.
  - Main Play reuses that element, unmutes it — audible.
  - Local path (`assets/audio/demo/demo-music-mellow.wav`) stored as `localPath` on track item.
  - Play engine: resolves `localPath || src`, blocks remote `https://` URLs.
- **Known quirk at this state:** WAV files are ~1.5s (not 30s). Silent replay bug still present (fixed in v168).
- **Recovery:** `git checkout 77d533b -- loadstudio/lseb.js loadstudio/sw.js`

### v168 — commit `e365717` — silent-replay fix (a.ended seek)

- **Root cause found:** gesture-unlock plays the 1.5s WAV to `ended`. On next Play, `lt=0` skipped seek — element was at `currentTime=end`, `play()` fired `ended` instantly with no audio.
- **Fix:** if `a.ended === true`, always seek to `max(0, lt)` before `play()`.
- **Demo labels changed (mistake):** Vlog/Pop/Dynamic were renamed away from their working names. Corrected in v170.
- **Recovery:** `git checkout e365717 -- loadstudio/lseb.js loadstudio/sw.js`

### v172 — commit `cc6cbc2` — 2026-05-19

- **Status:** Confirmed working by user ("it works in safari").
- **Browser/device:** iPad Safari
- **What it has:**
  - All 7 demo music tracks converted to MP3 (44100 Hz stereo 128 kbps) — WAV files kept as fallback for legacy saves
  - `audible-test.mp3` (5s 440 Hz sine tone) added as Test category in Music drawer
  - `_DEMO_AUDIO` keys updated to `.mp3` paths
  - SW: `loadstudio-complete-v172`
- **Root cause resolved:** iOS Safari was suspending silent WAV audio elements during gesture-unlock playback. MP3 at 44100 Hz stereo plays reliably without suspension.
- **NOT tested in this run:** individual genre demos (Mellow/Upbeat/Energetic/Fresh/Acoustic/Electronic/Hip-Hop) — user confirmed the Test category track specifically.
- **Recovery:** `git checkout cc6cbc2 -- loadstudio/lseb.js loadstudio/sw.js loadstudio/assets/audio/demo/`

### v170 — commit `fabf85d` — current verified baseline (2026-05-18)

- **Status:** Built and merged. Pending iPad verification.
- **What it has:**
  - Vlog: `Mellow Demo` (original, confirmed working name) → `demo-music-mellow.wav`
  - Pop: `Upbeat Demo` (original) → `demo-music-upbeat.wav`
  - Dynamic: `Energetic Demo` (original) → `demo-music-energetic.wav`
  - Fresh: `Fresh Demo` → `demo-music-fresh.wav` (new synthesized, 120 BPM xylophone arpeggio)
  - Acoustic: `Acoustic Demo` → `demo-music-acoustic.wav` (new synthesized, fingerpicked G major)
  - Electronic: `Electronic Demo` → `demo-music-electronic.wav` (new synthesized, sawtooth synth 128 BPM)
  - Hip-Hop: `Hip-Hop Demo` → `demo-music-hiphop.wav` (new synthesized, kick/snare/bass 90 BPM)
  - Play engine: `a.ended` seek fix prevents silent replay.
  - SW: `loadstudio-complete-v170`
- **Recovery:** `git checkout fabf85d -- loadstudio/lseb.js loadstudio/sw.js`
- **NOTE:** If user says any of the 4 new synthesized tracks sound wrong, check this log before changing — do NOT rename the original 3 (Mellow/Upbeat/Energetic Demo).
