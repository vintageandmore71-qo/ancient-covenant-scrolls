# Session Notes — 2026-04-29

## Current state

- Working branch: `claude/fix-session-sending-TVMbW`; `main` fast-forwarded to match.
- **Last user-verified working tip:** `v17dh` — Wave 6 Vision pipeline (image-prompt-v12)
- **Session-end shipped tip:** `v17dl` — bulletproof save banner + Debug panel (image-prompt-v16)
- Three commits since v17dh are *shipped but not user-verified* due to a localStorage-clearing incident (see below).
- ACR is at `acr-v17`; standalone, not part of today's work.

## Backups (recoverable forever)

Stable-state backup branches on origin. Every shipped version today has its own backup. To recover any of these states: `git checkout backup/<name>` then optionally fast-forward main.

| Branch | SHA | Captures |
| --- | --- | --- |
| `backup/2026-04-28-acr-v16` | `91581c7` | ACR baseline (separate app) |
| `backup/2026-04-28-v17cs` | `654dbd1` | Pre-Image-Prompt baseline (Load only) |
| `backup/2026-04-29-v17ct` | `074b73c` | Phase 1A — Image Prompt drop-in |
| `backup/2026-04-29-v17cu` | `9e4defb` | Custom Image Prompt brand mark |
| `backup/2026-04-29-v17cv` | `ee6d8a1` | Full custom Workspace tile icons |
| `backup/2026-04-29-v17cw` | `14901f4` | Cohesive icon system (topbar + context menu) |
| `backup/2026-04-29-v17cx` | `081bb7f` | 4-provider chain + intent router |
| `backup/2026-04-29-v17cy` | `b2c4f36` | 8-provider chain + health-board |
| `backup/2026-04-29-v17cz` | `d713eda` | 12-provider chain (paid included) |
| `backup/2026-04-29-v17da` | `3568348` | Local libs (Jimp / Anime / OpenCV / Lottie) + Puter token |
| `backup/2026-04-29-v17db` | `d045756` | Multi-turn + Save-to-Library + Continue chips |
| `backup/2026-04-29-v17dc` | `71fd154` | Multi-turn fix (Puter vision + context aug) |
| `backup/2026-04-29-v17dd` | `07d5af9` | Wave 1 — P1 Scene Lock + popup framework |
| `backup/2026-04-29-v17de` | `9c35cb1` | Q1+Q2 — Gemini 2.5 Flash Image + img2img priority |
| `backup/2026-04-29-v17df` | `79339fd` | AI Horde img2img + opt-in for paid |
| `backup/2026-04-29-v17dg` | `dddcc3c` | Drop pay-per-use providers (7-provider final) |
| `backup/2026-04-29-v17dh` | `86d3b46` | **Wave 6 — Vision pipeline (last user-verified)** |
| `backup/2026-04-29-v17di` | `1ef7ca5` | Wave 6.5 Part 1 — manipulation router + HF rembg |
| `backup/2026-04-29-v17dj` | `c395c2a` | Stuck-state cleanup + timeouts + missing-token visibility |
| `backup/2026-04-29-v17dk` | `3f56251` | Debug panel + Force Refresh button |
| `backup/2026-04-29-v17dl` | `38f95a0` | Bulletproof save (health check + giant banner + save trail) |
| `backup/2026-04-29-session-end` | (set after this commit) | Tonight's tip + this session log |

**Recovery quick-check:** if anything broke after v17dh, `git checkout backup/2026-04-29-v17dh` returns to last user-verified state.

## Built today (chronological)

1. **v17ct — Image Prompt drop-in** (Phase 1A): copied chat PWA from `inbox/`, renamed all 8 strings, added 🎨 Workspace tile, fullscreen iframe overlay
2. **v17cu — custom brand mark**: hand-drawn SVG icon replacing the 🎨 emoji
3. **v17cv — full icon set for Workspace tiles**: custom monoline SVG for all 10 tiles + per-category color tints
4. **v17cw — cohesive icon system**: extended to topbar (6 screens) + tile context menu via JS-based installer
5. **v17cx — Phase 1B Part 1**: 4-provider auto-fallback chain (Pollinations / HF / CF / Together) + intent router via SD_PROMPT detection. Anthropic moved to opt-in
6. **v17cy — Phase 1B Part 2**: extended to 8-provider chain (added Fal / Horde / Replicate / Imagen) + circuit-breaker health-board
7. **v17cz — Phase 1B Part 3**: 12-provider chain (added DeepInfra / Stability / DeepAI / Hyperbolic)
8. **v17da — Phase 1B Part 4**: local-first libs (Jimp + Anime.js eager; OpenCV + Lottie lazy-load helpers) + 9-op LOCAL_OPS Jimp router + optional Puter API token + un-cut SadTalker
9. **v17db — Phase 2**: multi-turn image state (result becomes next input), Save-to-Library button (postMessage to Load parent), Continue chips (LLM-emitted CHIPS: line)
10. **v17dc — multi-turn fix**: Puter wired for vision (CAPS.puter.vision = true, image_url content blocks), context augmentation tracks lastSDPrompt + injects to LLM
11. **v17dd — Wave 1 P1**: Scene Lock toggle (preserve previous scene/mood across turns) + first-use popup framework
12. **v17de — Q1+Q2**: replaced Imagen 3 with Gemini 2.5 Flash Image (true edit fidelity), reordered img2img priority
13. **v17df — AI Horde img2img + opt-in for paid**: Replicate / Gemini Image defaulted OFF for testing
14. **v17dg — Drop pay-per-use entirely**: removed Fal / Replicate / DeepInfra / Stability / Hyperbolic from the chain, reverted AI Horde to text-to-image (slow img2img was bad UX), Pollinations primary
15. **v17dh — Wave 6 (Vision pipeline)**: structured-JSON image analysis via Puter, character profile extraction, buildPreservationContext() for richer multi-turn prompts. **User-verified working.**
16. **Inbox digestion**: 7 user-uploaded files captured into PLAN_BOOK_TO_VIDEO.md, SECURITY_PLAN.md, designs/ICON_CONCEPTS.md, PLAN_IMAGE_PROMPT_v3.md addendum. Implementation files dropped at `load/book-video/` for future wiring.
17. **Security hardening**: ran 12-task SECURITY_PLAN audit. Repo clean (no committed secrets, no .env, no node_modules). Added SECURITY.md, .gitignore expansion, .env.example, .github/dependabot.yml, .github/workflows/codeql.yml, PR template, full audit report. Manual GitHub Settings steps documented for user.
18. **v17di — Wave 6.5 Part 1**: specialty manipulation router. Detects "remove background"-class intents and routes to dedicated HF Inference endpoints (briaai/RMBG-1.4 wired). Falls through to generic image gen for other intents.
19. **v17dj — fix stuck 'Analyzing image' + missing HF-token feedback**: 30s timeout on vision call; refreshAnalyzePill('failed') no longer leaves frozen label; missing-HF-token now renders as clear chat message instead of toast.
20. **v17dk — Debug panel + Force Refresh button**: Settings → Debug section reveals app version, saved keys (set/unset), provider toggles, SW state, cache list, localStorage usage. "🔄 Force Refresh & Clear Cache" button unregisters SWs + deletes caches + reloads.
21. **v17dl — bulletproof save**: testLocalStorage() pre-flight; saveSettings wrapped in try/catch; giant green/red banner replaces easy-to-miss toast; save trail (ps_last_save + ps_save_count) for diagnosis.

## Outstanding / blocking

**Save / settings persistence issue (UNRESOLVED):**

User reported keys stopped saving after testing HF / bg-removal. v17dk Debug status showed `ps_* entries: 0` — localStorage entirely empty. Code review confirmed `saveSettings` logic has no bugs (every field ID resolves, no clear() calls, no destructive removeItem on user data).

User runs DDG (DuckDuckGo) browser on iPad. Past sessions worked fine. The breakage correlates with HF testing today.

**Pure speculation (NOT verified):** Force Refresh might have triggered DDG's privacy-driven storage cleanup as a side effect of unregistering service workers. Not proven. User explicitly told me to stop guessing — they're right; I had no evidence.

**To resolve tomorrow** (in this order):
1. User opens in Safari: `https://dssorit.github.io/ancient-covenant-scrolls/load/?bust=v17dl&_t=fresh`
2. User pastes a key (any one — Gemini, HF, etc.) into Settings → tap Save
3. User reports the green/red banner text + the Debug → Show status output
4. Three lines of evidence will tell us definitively:
   - `localStorage TEST: ✓ working` or `✗ FAILED <reason>`
   - `total saves on this iPad: N`
   - `last save: <timestamp>`
5. If banner says success but localStorage shows empty after a refresh → DDG/Safari quirk; ship v17dm with IndexedDB backup of keys.
6. If banner shows error → real bug; investigate the exact error string.
7. If save works in Safari but not DDG → confirms a browser-specific issue.

## Pending / parked

- **Wave 6.5 Part 2**: Real-ESRGAN upscale, GFPGAN face restore, Florence-2 captioning, Qwen2.5-VL alt vision, SDXL inpaint via HF Inference. Blocked on resolving the save issue first (these all need keys).
- **Wave 7**: Pipeline B Prompt Builder strict/moderate/loose modes
- **Wave 8**: Pipeline D multi-image continuity + character profile storage (subsumes original P2 batch + P3 dual-merge)
- **Wave 9**: Pipeline E Output Verification + auto-retry
- **Wave 10**: Pipeline C Manipulation Tools UI (mask/region edit)
- **Wave 11**: Pipeline F Fallback + Capability Registry cleanup
- **W4**: Global help index page
- **W5**: Encrypted key vault
- **W12**: Phase 4 polish (Lottie / OpenCV / etc.)
- **Book-to-Video engine**: `load/book-video/` code present, not wired into UI. See `PLAN_BOOK_TO_VIDEO.md` for integration steps.
- **Pre-launch toggles**: flip Gemini Image ON, optionally Replicate (see `PLAN_IMAGE_PROMPT.md` checklist).
- **Manual GitHub Settings**: branch protection, secret scanning, push protection, private vulnerability reporting (see `SECURITY_AUDIT_REPORT.md`).
- **Apply v17cw icon style to ACR / Attain / Attain Jr / Study** (parked option E — user said "after Image Prompt is fully built").
- **Voice cloning** — three free paths discussed; user leaning HF; pending decision.
- **Piper TTS** — parked since 2026-04-27.
- **Stage 2-4 Piper rollout** — blocked on Stage 1.

## Capability gaps in this session

- This session's sandbox blocks outbound HTTP to `dssorit.github.io` and `api.github.com`. `raw.githubusercontent.com` works.
- The GitHub MCP server here is a managed remote service; tool subset is fixed. No `list_workflow_runs`, `list_pages_deployments`. Cannot independently confirm Pages deploy success.
- GitHub Pages CDN edge caching can lag 5-15 min after a push. Symptom: `sw.js` shows new cache value but rendered page is old. Fix: `?bust=<random>` query string. Never advise cache-clearing without proof — verify with bust trick first.
- Save / localStorage diagnosis was speculation today; ended without proof. Resolving requires user data-collection in Safari to compare against DDG.

## Today's commit log (chronological — 33 commits)

```
074b73c — Load v17ct: Phase 1A — Image Prompt drop-in (Workspace tile)
9e4defb — Load v17cu: custom Image Prompt brand mark (no more emoji)
ee6d8a1 — Load v17cv: full custom icon set for Workspace tiles + category colors
14901f4 — Load v17cw: cohesive custom icon system across topbar + context menu
081bb7f — Load v17cx: Image Prompt Phase 1B — 4-provider auto-fallback + intent router
b2c4f36 — Load v17cy: Image Prompt Phase 1B Part 2 — full 8-provider chain + health-board
d713eda — Load v17cz: Image Prompt — 12-provider chain (Phase 1B Part 3)
3568348 — Load v17da: Phase 1B Part 4 — local-first libs + Puter token + un-cut SadTalker
d045756 — Load v17db: Image Prompt Phase 2 — multi-turn + Save-to-Library + chips
71fd154 — Load v17dc: Image Prompt multi-turn fix — Puter vision + context augmentation
07d5af9 — Load v17dd: P1 Scene Lock + first-use popup framework (Wave 1)
9c35cb1 — Load v17de: Q1 Gemini 2.5 Flash Image edit + Q2 img2img priority fix
79339fd — Load v17df: AI Horde img2img (TRULY FREE no-key edit) + opt-in for paid/limited
70096ca — Plan: pre-launch checklist for re-enabling Gemini Image / Replicate
dddcc3c — Load v17dg: drop pay-per-use providers + revert to fast Pollinations flow
0fa0944 — Plan v3: multi-pipeline image-AI architecture spec (verbatim capture)
86d3b46 — Load v17dh: Wave 6 — Spec Pipeline A (Vision / Image Analysis)
[user uploads to inbox: 5 commits]
f8cffdf — Plan v3 expansion: full 58-item provider list + deferred backend stack
c98536a — Inbox digestion: HANDOFF / Book-to-Video / Security / Icons captured
4c73391 — Security hardening (public repo): SECURITY.md + .gitignore + .github/ + audit report
1ef7ca5 — Load v17di: Wave 6.5 Part 1 — Specialty manipulation router + HF rembg
c395c2a — Load v17dj: fix stuck 'Analyzing image' + missing HF-token feedback
3f56251 — Load v17dk: Debug panel + Force Refresh button (diagnose stuck states)
38f95a0 — Load v17dl: bulletproof save with health check + visible banner + save trail
```

## How to resume next session (cold-start checklist)

1. Read `HANDOFF.md` first (CURRENT STATE block at top), then this file, then `CLAUDE.md`, `PLAN_IMAGE_PROMPT_v3.md`
2. `git log --oneline -30` — confirm tip is `v17dl` or newer
3. Check `inbox/` for any new files from the user
4. **First thing to investigate**: the save / localStorage issue (see "Outstanding" above). User to test in Safari first. Banner color + Debug status output is the data we need.
5. After save mystery is resolved, **next wave to ship** is **Wave 6.5 Part 2** (Real-ESRGAN / GFPGAN / Florence-2 / Qwen2.5-VL / SDXL inpaint) per `PLAN_IMAGE_PROMPT_v3.md` build sequence.
6. Don't ship Wave 6.5 Part 2 until save issue is resolved — those features all need API keys; testing with broken save is wasted effort.
7. **Update HANDOFF.md** at the end of every verified milestone — that's the cross-session bridge.

## Browser guidance for the user (carry-over to tomorrow)

User has been testing in DDG browser. Past sessions worked. Today's HF testing surfaced storage issues. Recommendations for the user:

- **Try Safari for Load PWA features.** PWAs are designed and tested for Safari on iOS. Add to Home Screen for proper isolation.
- **DDG works** for casual browsing of Load but may have storage quirks under stress (heavy testing, SW unregister).
- **Cache-bust URL pattern** (`?bust=<version>`) is mandatory because of GitHub Pages CDN edge caching, regardless of browser.
- **Force Refresh button** (in Debug panel) is safe in Safari, possibly destructive in DDG. Investigate tomorrow before recommending it again.
