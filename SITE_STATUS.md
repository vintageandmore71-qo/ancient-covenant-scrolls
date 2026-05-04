# Site Status — All Load suite apps

_Snapshot as of 2026-05-04, tip `4826b1b` on `main`._

| Site | URL | Live cache | Latest build notes | Per-site handoff |
|---|---|---|---|---|
| **Load Main** | `/load/` | `load-v17el` | Premium icons + Inter font + transparent blue front buttons. Editor toolbar SVG icons + sidebar SVG icons. Headless mode for `?lsedit=` so the editor can be hosted by LoadStudio without Load Main UI bleeding through. | `HANDOFF.md` (root, suite-wide) |
| **LoadStudio** | `/loadstudio/` | `loadstudio-complete-v37` | Editing Bay runs the editor NATIVELY via copied `lseditor.js` (no iframe, no `../load/` runtime dep). Purple theme bound to `#__loadVideoEdit`. Install banner + zoom-fix banner + Reset Page Zoom toolbar button. Advertiser admin + Creator Inbox sections wired with save/export. | `loadstudio/HANDOFF_LOADSTUDIO.md` |
| **LoadPlay** | `/LoadPlay/` | `loadplay-v32` | Splash uncovered, install banner + how-to modal, interactive guided tour, zoom-fix banner. Cross-suite footer pruned to Load-only. | `LoadPlay/HANDOFF_LOADPLAY.md` |
| Attain | `/attain/` | `attain-v62` | Untouched this session. | (none) |
| Attain Jr | `/attain-jr/` | `attainjr-v1s` | Untouched this session. | (none) |
| ACR Study | `/study/` | `acr-study-v76` | Untouched this session. | (none) |

## Cross-cutting policies (CLAUDE.md)

- **No emojis** anywhere — code, comments, commits, UI strings.
- **No external product names** in user-facing labels (no "VN",
  "Glam AI", "CapCut", "Runway", etc. — internal IDs may keep
  short codes).
- **Cache versions go forward only.** Every shipping JS/HTML/CSS
  edit must bump the matching `sw.js` cache string.
- **Push to BOTH** `claude/<branch>` AND `main` on every shipping
  commit. Pages serves from `main`.
- **Footers carry Load-suite links only:** Main Load, LoadStudio,
  LoadPlay. Attain, Attain Jr, Study are intentionally NOT linked
  from the Load footers per user direction 2026-05-03.

## Most recent backup branches

- `backup/2026-05-04-loadstudio-v37` → `4826b1b` (covers all sites at
  this tip — created end of 2026-05-04 session)
- `backup/2026-05-02-loadplay-v19` → `ed355a7` (older LoadPlay
  snapshot from 2026-05-02 session)
- Older Attain / Study / ACR backups documented in those sessions'
  notes.

Recovery: `git checkout backup/<name>`.

## Where work is going next

See per-site handoffs (LoadPlay now has a Tier 6 Autopilot Content Engine spec — see Tier 6 section in `HANDOFF_LOADPLAY.md` + full spec in `PLAN_LOADPLAY_AUTOPILOT.md`):

- LoadStudio: `loadstudio/HANDOFF_LOADSTUDIO.md` §5 ("What's still
  pending") — 7 open items including Feature Tools dyslexia rework,
  end-to-end Import wiring, Envato-style stock library, cover-button
  routing, IDB schema.
- LoadPlay: `LoadPlay/HANDOFF_LOADPLAY.md` ("What's still pending"
  + Tier 0–5 backlog).
- Load Main: long-form FAQ emoji strip is done; some geometric
  unicode glyphs remain inside the runtime-built editor quick-action
  panel (◎ / ◖ / ↻ — visually fine on iPad).

## Today's session log

Full chronological list of commits is in
`SESSION_NOTES_2026-05-04.md` ("Today's commit log" section).
