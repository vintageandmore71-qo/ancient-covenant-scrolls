# LoadStudio — Handoff & Build Plan

_Last updated: 2026-05-04, tip `4826b1b`, cache `loadstudio-complete-v37`._

LoadStudio is a same-origin sibling of Load Main (`/loadstudio/` next
to `/load/`). It is positioned as an iPad-first **production studio**:
plan → cast → shoot → edit → publish — all offline.

---

## 1. Architecture as of v37

### Files

```
loadstudio/
  index.html                ~510 KB   — sole HTML entry point
  app.js                    ~37 KB    — state/sections/render/actions
  styles.css                ~990 KB   — Complete-pkg base styles
  lseditor.js               ~870 KB   — verbatim copy of load/load.js
                                       (the real video editor; see §3)
  sw.js                                — service worker, cache v37
  manifest.json                        — PWA manifest
  data/feature-registry.json           — 40 sections, 661 features
  data/initial-state.json              — empty starter state
  icons/icon-{72..512}.png             — A2HS icons (all = same icon)
  assets/brand/
    loadstudio-logo.png                — drawer logo
    loadstudio-splash.jpeg             — splash hero (~244 KB)
```

### Body class state machine (`ls-v10-gate` script in index.html)

| Class | Meaning | Hides | Shows |
|---|---|---|---|
| `ls-host` | LoadStudio is the host page (always on) | (skips lseditor.js boot) | `window.openVideoEditor` exposed |
| `ls-front` | front splash visible | `.content`, `.ls-wsp`, dashboard sections | splash + 3 buttons + 8 boxes + footer |
| `ls-wsp-on` | "Where do you want to work?" page | splash, 3 buttons, 8 boxes, footer | `.ls-wsp` |
| `ls-studio` | inside a section (Editing Bay etc.) | front chrome | `.content > .section.active` |
| `ls-cat-{lobby,story,prod,voice,ai,look,distro,dev}` | dept color theme | — | drives `--cat` accent |
| `ls-editor-fs` | (legacy class — `:has()` rules supersede) | LoadStudio chrome | active editor section |

### 8 departments (color-coded)

| dept | color | sections |
|---|---|---|
| lobby (`#b388ff`) | purple | dashboard, templates, import-center, asset-library |
| story (`#5fc8ff`) | sky | script-tools, book-cinema, vn-tools, text-tools |
| prod (`#ff6e9c`) | rose | scene-builder, timeline-editor (Editing Bay) |
| voice (`#fbd24a`) | amber | character-studio, character-consistency, casting, performance, voice-studio, voice-manipulator, character-voice |
| ai (`#9c9cff`) | indigo | image-prompt, image-editing, provider-routing, copilot, llm-providers |
| look (`#5ee0a5`) | mint | sound-studio, soundtrack, look-lab, camera-tools, wardrobe, props, locations |
| distro (`#ffa852`) | orange | marketplace, add-creations, export-studio, load-play-prep |
| dev (`#ff8ad6`) | pink | asset-doctor, pwa-diagnostics, content-safety, advertiser, inbox, developer-lab, api-keys, connectivity, help-tour |

---

## 2. Front splash flow

1. `body.ls-front` set on load.
2. Splash image (`assets/brand/loadstudio-splash.jpeg`) at full size,
   no overlay.
3. **3 main buttons** under splash (Get Started / Editing Bay / Creator
   Upload).
4. **4 feat tiles** (Production Studio / AI Tools / Cinema Format /
   Private and Local) with tap-to-info popovers.
5. **4 workspace tiles** (`.ls-workspace`).
6. **Part of Load** footer + copyright + cross-site links (Main Load
   + LoadPlay only).
7. Scroll stops at footer (verified — `.content` is `display:none` on
   `body.ls-front`).

Tapping **Get Started** → `gateWsp()` → `body.ls-wsp-on` → "Where do
you want to work?" page with 8 dept tiles, each tappable to drill into
that dept's full feature grid (`body[data-ls-dept="<dept>"]`).

Tapping **Editing Bay** → click delegator on `[data-section="timeline-
editor"]` → `go("timeline-editor")` adds `.active` to
`#section-timeline-editor` → `:has()` CSS promotes the section to
fullscreen (`position:fixed inset:0 z-index:5000 height:100dvh`).

---

## 3. Editing Bay — native mount of the Load Main editor

**The editor is now a same-folder JS file, NOT an iframe.**

### Load chain

```
loadstudio/index.html
  └── <script src="lseditor.js" defer>
        └── lseditor.js IIFE
              ├── try { window.openVideoEditor = openVideoEditor; }
              │   ← hoisted export at top of IIFE so it's always
              │     callable, even if downstream init throws on
              │     missing Load Main DOM
              ├── ~17,000 lines of editor + helpers (function decls)
              └── if (!body.ls-host) boot();
                  ← skipped in LoadStudio context — boot() expects
                    Load Main home/library/import DOM that doesn't
                    exist here. window.openVideoEditor is already
                    exposed above.
```

### Launcher

`#section-timeline-editor` and `#section-vn-tools` host the same
launcher card — three big buttons:

| Button | Click handler | Calls `mountEditor({...})` with |
|---|---|---|
| Upload Video | `<input type="file" accept="video/*">` → file picker | `{kind:'media', subKind:'video', binary: <File>}` |
| Upload Image | file picker → wrap into 5 s synth video via canvas + MediaRecorder | `{kind:'media', subKind:'video', binary: <Blob>}` |
| Create from Scratch | 3 s blank 16:9 canvas via canvas + MediaRecorder | `{kind:'media', subKind:'video', binary: <Blob>}` |

`mountEditor()` (in `index.html` `#ls-v35-native-editor` script):
1. Toast: "Opening Editing Bay…"
2. Calls `window.openVideoEditor(app)`
3. 120 ms later checks `document.getElementById('__loadVideoEdit')`
4. If present, force-bumps `z-index` to 9500 + background `#0a0a14`
5. If absent, red toast: "openVideoEditor ran but no __loadVideoEdit
   appeared" — surfaces the failure for diagnosis

### Purple theme

`#__loadVideoEdit` selectors in `loadstudio/index.html` (v35 block)
recolor every Load-blue accent to `#b388ff` / `#7d2ae8`:
- clip block selected ring + handles
- timeline frame border
- quick-action popover background + arrow
- snap-on chip
- range slider accent + readouts
- text track gradient
- waveform via `filter: hue-rotate(258deg)`
- Export button gradient
- progress-bar fill

---

## 4. Install banner / "How to install"

Pattern ported from Load Main:

- `#ls-install-banner` shown in Safari (not standalone).
- `localStorage.ls_install_dismissed_v1` persists dismissal.
- Tap `How to install` → opens `#ls-install-modal` with 5-step
  Add-to-Home-Screen guide.
- Visualviewport scale > 1.08 triggers `#lsZoomBanner` "Page is
  zoomed in. Pinch out to reset, or tap Fix." with `lsFixZoom()`.

---

## 5. What's still pending

| ID | Item | Notes |
|---|---|---|
| LS-1 | **Feature Tools panel dyslexia rework** for ~36 remaining sections | Only Editing Bay / Visual Editor / Advertiser / Inbox have proper UIs. The rest still ship the generic "Feature tools" + "Working controls" two-panel layout. |
| LS-2 | **End-to-end Import wiring** in Import Center | File input + saveImports() exists but only stores metadata. Need: thumbnail extraction, type routing, asset-library tile render, duplicate detection. |
| LS-3 | **Envato-Enterprise-style stock library** | User asked for parity. Need: stock photo + video search UI (Pollinations or Pexels free API), license metadata, asset checkout into project. Not started. |
| LS-4 | **Help & Guided Tour content** | Drawer item exists, splash tour exists, per-section walkthroughs are empty. |
| LS-5 | **Editor extraction** | `lseditor.js` is a wholesale copy of `load/load.js` (~870 KB). Long-term: extract just the openVideoEditor subgraph to a smaller module. Not blocking. |
| LS-6 | **Cover button on editor track rail** | Has SVG icon now but its click handler in `load.js` (~line 13377) navigates to a Load Main cover-designer screen that doesn't exist in LoadStudio. Either implement a LoadStudio cover designer or hide the button when `body.ls-host`. |
| LS-7 | **Save draft / IndexedDB schema** | The editor's "Save draft" writes to Load Main's IDB schema. In LoadStudio context this creates a new IDB at `dssorit.github.io` origin scope per-PWA. Drafts don't sync between Load Main and LoadStudio (each lives in its own IDB). |

---

## 6. Sub-app cross-references

- `/load/` — Main Load (HTML/PDF/EPUB launcher + the source-of-truth
  video editor)
- `/LoadPlay/` — LoadPlay streaming front
- `/loadstudio/` — this app
- `/attain/`, `/attain-jr/`, `/study/` — separate study suite (NOT
  linked from Load suite footers per user direction 2026-05-03)

---

## 7. Cache version discipline (CLAUDE.md rule)

Every shipped change must bump `loadstudio/sw.js` `CACHE` string
forward (`v37` → `v38` etc.). Lower cache numbers can leave iPad
Safari with the old SW still active. Always increment past the
highest version ever shipped.
