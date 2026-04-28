# Session Notes — 2026-04-28

## Current state

- Working branch: `claude/fix-session-sending-TVMbW` (per session task config)
- Load is at **v17cq** (`load/sw.js` `CACHE = 'load-v17cq'`, on-screen badge `v17cq`).
  v17cq adds Library auto-cleanup (one-prompt consent) + manual Clear Library button + per-tile favorite toggle.
  The earlier v17cp bump landed inside commit `34f9127` (Voice Library + ACR per-chapter
  recording) — the title doesn't say "Load" so don't be misled by `git log` greps.
- ACR is at **acr-v15** (latest standalone ACR commit `33d8ac3`).
- Latest commit before this turn: `624996f` — Add CLAUDE.md (project rules + session-logging mandate)
- v17cq commit pending push to `claude/fix-session-sending-TVMbW`

## Live verification

- ✅ `main` HEAD's `index.html` contains `id="b-rc"` at line 582 + `id="micTestButton"` at line 583 (verified via raw.githubusercontent.com)
- ✅ `main` HEAD's `sw.js` declares `CACHE = 'acr-v15'` (verified via raw.githubusercontent.com)
- ❌ Cannot directly verify what GitHub Pages is currently serving — sandbox network blocks `dssorit.github.io`. Repo is correct; deployment status unknown from this side.

## Built today (in order)

1. Audio I/O export expansion → WAV / AIFF / M4A / AAC / WebM / OGG / MP3 / FLAC (Load v17ci, v17cj)
2. Sound Studio (Voice FX) — 20 effect presets via Web Audio (v17cj, v17ck swap baby/grandma/grandpa/cartoon)
3. Voice Manipulator — granular pitch shift + time stretch + 3-band EQ + reverb / echo / distortion / dry-wet + 8 style presets (v17cl)
4. v17cn — pitch-shift rewrite to use resample+stretch (formant-shifting) for real voice character change instead of chipmunk effect
5. v17co — Creature icon 🐲 → 🤡 per user request
6. **Voice Library** (A) — IndexedDB store shared across all five ACR apps, manager panel, save buttons added to Sound Studio + Voice Manipulator (commit 34f9127)
7. **ACR per-chapter recording** (B) — 🎤 button in voice-reader bar, IndexedDB store keyed by chapter id, play your recording instead of TTS (commit 34f9127)
8. ACR v13 fix — call `crSetButtons()` from inside `go()` body (the wrap-window-go approach didn't work because TOC click handlers call the local function, not `window.go`) (commit 90b2b21)
9. ACR v14 — SW cache-buster query string + controllerchange auto-reload (port from Load v17ca pattern) (commit 076b927)
10. ACR v15 — fixed-position bright-red MIC TEST marker for forensic deployment verification (commit 33d8ac3)
11. v17cm — Voice Studio (cvs) record button now works without a script (free-recording fallback) (commit d20795b)
12. **Load v17cq — Library auto-cleanup + Clear Library + favorites**:
    - ⭐ Favorite toggle in tile context menu (sets `app.favorite` boolean, shown as star next to tile name)
    - 🗑 "Clear Library" button in `library-screen` header — wipes everything except favorited / annotated / bookmarked apps with confirm
    - On boot: `cleanupExpiredApps()` finds apps with `now - (lastOpened||dateAdded) > 30 days` AND not favorite AND no notes AND no bookmarks; ONE consent popup ("Auto-clean N old items?"), Yes → silent delete + toast, No → defers for the rest of the boot (no nagging)
    - Bumped `load/sw.js` `CACHE = 'load-v17cq'` and on-screen badge `v17cq`

## Outstanding / blocking

**The user reports the 🎤 button is not visible on iPad after force-refresh + clearing Safari data.**

- The button IS in the code on `main` HEAD (verified)
- The user has no `.github/workflows` directory, so Pages auto-deploys from `main` root
- I cannot reach `dssorit.github.io` from this sandbox to verify deployment

**Next step on resume:** ask the user to open `https://dssorit.github.io/ancient-covenant-scrolls/sw.js` in Safari and report the `CACHE = 'acr-vXX'` value at the top:
- If `'acr-v15'` → Pages IS current; the issue is iPad-side cache. Diagnose that.
- If older → Pages hasn't published; just wait, no code fix needed.

## Notes on capability gaps (not bugs — just constraints I have to flag)

- This session's sandbox blocks outbound HTTP to `dssorit.github.io` and `api.github.com`. I CAN reach `raw.githubusercontent.com` and `github.com`. The block is set at session start and cannot be changed mid-session.
- The GitHub MCP server in this session is a managed remote service (not a local config). Tool subset is fixed by the server. No `list_workflow_runs`, `list_pages_deployments`, or workflow-status tools. Cannot independently confirm Pages build success.
- Future sessions: ask the user to verify the `sw.js` CACHE value if "stale build on iPad" symptoms recur. Don't iterate on cache fixes without that data.

## Pending features (parked, NOT abandoned)

- **Piper TTS** — parked since Apr 27 (see `SESSION_NOTES_2026-04-27.md`). Still blocked on the post-install play() exception text from the user. v17bx surfaces it; need user to tap Repair voice and report.
- **Voice Library cross-app integration** — only Load currently has the save-to-library buttons. ACR / Attain / Attain Jr / Study can READ from the shared IndexedDB but no UI yet to invoke library voices for reading. Phase 2 once the 🎤 button is verified working.
- **Stage 2 of Piper rollout** (ACR / Attain / Study) — blocked on Stage 1 working.
- **Stage 4** (Attain Jr per-character voices via LibriTTS multi-speaker) — blocked on Stage 1.

## Today's commit log (chronological)

```
0d977fb — Load v17cf: integrate LoadAudioFix patch + sync-unlock on Play
a3d5399 — Load v17cg: stop re-seeking video.currentTime every rAF tick (audio fix)
e4e621a — ACR v10: highlight + audio sync (watchdog tuning + cancel-speak gap)
8a5307e — ACR v11: saved voice persists across refresh (two narrow patches)
8590011 — Add ACR-Reader-PWA.zip — downloadable installable PWA bundle
e220fe3 — Downloadable PWA bundles for all four apps
bbb518d — Load v17ch: Character Voice Studio (Phase 1)
b402464 — Load v17ci: extract audio in WAV / AIFF / M4A / AAC / WebM / OGG + expand import accept
7369ec9 — Load v17cj: Sound Studio (Voice FX) + MP3 / FLAC encoders
ee3bfd6 — Load v17ck: Sound Studio FX preset swap (per user request)
d663f6f — Load v17cl: Voice Manipulation Tool
cf8a972 — Stash: opt-in rateMultiplier + toneShift on VoiceFX.applyToBuffer
d20795b — Load v17cm: Voice Studio record button works without a script
21f3add — Load v17cn: real voice transformation (pitch + formant shift) + dragon icon
d23c66c — Add files via upload (user-side)
af727b4 — Load v17co: Creature preset icon 🐲 → 🤡
34f9127 — Voice Library (A) + ACR per-chapter recording (B)
90b2b21 — ACR v13: chapter recording buttons actually appear on chapter open
076b927 — ACR v14: SW cache-buster + auto-reload on controllerchange (real fix for stale build)
33d8ac3 — ACR v15: forensic MIC TEST marker (fixed-position, top-right, z-index 999999)
```
