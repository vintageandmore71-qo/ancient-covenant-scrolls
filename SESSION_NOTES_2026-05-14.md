# Session Notes — 2026-05-14

## Current State
- Branch: `claude/fix-session-sending-TVMbW-i4JHc`
- Latest main HEAD: `036b2b1` (PR #115 squash-merged)
- Working tree: clean
- Backup branch: `backup/2026-05-14-v92`

## Built Today

### PR #113 — Provider Registry v1 (merged earlier, SW Load Studio v90)
- Shared `load-provider-registry.js` module at repo root
- 49 providers: free, open-source, local-first only
- Load Eco + LoadStudio both load it
- Panel UI with group collapse, test, set-primary, save

### PR #114 — Provider Registry → AI Image Director sync (v91)
- Root cause: Registry used `load_provider_registry_v1` key; AI Director used `loadstudio_ai_image_director_providers` — completely disconnected
- Fix: sync bridge in `load-provider-registry.js`
  - `REGISTRY_TO_ROUTER` and `ROUTER_TO_REGISTRY` ID maps
  - `_syncRegistryPrimaryToAID` writes router ID when primary is set
  - `_migrateAIDToRegistry` imports legacy AID primary into registry on load
  - `_initSync` runs on DOMContentLoaded
  - `window.LoadProviderRegistrySelfTest()` and `window.lsAID_providerSyncSelfTest()` added
- Verified: all 3 CI checks passed

### PR #115 — Editing Bay timeline thumbnails fix (v92)
- Root causes fixed:
  1. `thumbnail-strip` used `height:100%` in a flex container without `position:absolute` → zero visible height on iOS Safari. Fixed with `position:absolute;inset:0`.
  2. Video attachment fell into empty state — `_renderImageStrip` only checked `scene.media.image`, not `scene.media.video`. Added video placeholder + async first-frame canvas capture.
  3. Waveform not restored after page reload. Now rendered on editor open if audio in saved state.
  4. Audio preload skipped on restore. Now preloads all audio lanes from saved state.
- Verified: all 3 CI checks passed, merged

## Outstanding / Blocking
- iPad live test needed for PR #115 (Editing Bay thumbnail fix)
- iPad live test needed for PR #114 (provider sync)
- Both are now on main — Pages will serve after CDN propagates

## Tomorrow Priorities (per user closeout)

1. **Continuity Memory** — approved/rejected/corrected takes, scene memory, character continuity, world rules, canonical references
2. **Review / Takes System** — Approve/Correct/Reject saves thumbnail + provider + prompt + scene + timestamp + notes, reopenable
3. **Export / Reopen Integrity** — scenes.json, characters.json, continuity-report.json, generation-report.json, prompt-log.json, rights.json, asset declarations, editBay scene data, provider reports
4. **CinePWA Playback Polish** — transition system, subtitle timing, multi-scene playback, scene sequencing, autoplay project mode, transition previews
5. **Character System** — character cards, reference packs, canonical character lock, attach approved AI Director images to characters, reusable scene casting
6. **Provider Report Validation** — every generation logged, fallback logged, timestamps saved, export integrity verified

## Architecture Rules (locked)
- Build format first, player second, platform third
- All new systems additive to: production engine, LoadPlay, CinePWA format, scene cards, timeline editing, provider routing, export/reopen, continuity, standalone PWA cinema workflow
- Providers: free / open-source / local-first / no-card free-tier only. Paid = disabled by default
- Never mark provider READY without real blob/URL/text returned
- Never export API keys, tokens, private endpoints

## Capability Gaps This Session
- Cannot fetch `dssorit.github.io` directly — use `raw.githubusercontent.com` to verify deployed files
- Cannot fetch `api.github.com/repos/.../pages` — use GitHub MCP tools instead

## Backups
- `backup/2026-05-14-v92` — points to main HEAD after PR #115 merge (036b2b1)
- Recovery: `git checkout backup/2026-05-14-v92`

## Today's Commits
```
f5ab225 fix: sync media to timeline clip strip in Editing Bay (v92)
9cf4860 fix: sync Provider Registry primary to AI Image Director (v91) (#114)
041e9c8 fix: sync Provider Registry primary to AI Image Director
7aa19a6 Provider Registry v1: shared free/open-source provider module (#113)
54f95ae loadstudio+load: Provider Registry v1
```
