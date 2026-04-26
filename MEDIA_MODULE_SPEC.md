# Load Media Module — Spec & Build Queue

This file is the source of truth for the Load video editor's
feature roadmap, locked in from the user's VN-comparison spec
(2026-04-26, last extended 2026-04-27 with the 14-step VN flow).

Format per item:
- ✅ shipped
- 🛠 in progress
- ⚠️ partial / scaffolded
- ⛔ pending (priority order matters)

---

## 14-STEP VN VIDEO EDITING FLOW (locked 2026-04-27)

The end-to-end pipeline Load Media must reproduce. Each step lists
the user-visible outcome and the current build state.

### Step 1 — Import / project creation
- ✅ Pick video via Edit Video import card or open existing video
- ✅ File stored as Blob in IndexedDB (memory-safe wrap, survives reload)
- ✅ Metadata extracted (duration, videoWidth/Height) on loadedmetadata
- ⚠️ Frame-rate not surfaced (browser API limitation — would need parsing)
- ✅ Thumbnail frames generated (8 evenly-spaced, 2-pass: instant tile + per-frame replace)
- ⚠️ Audio waveform — visual placeholder bars only; real waveform needs decodeAudioData pass
- ✅ First clip auto-placed in timeline

### Step 2 — Timeline initialisation
- ✅ Primary video track w/ thumbnails
- ⚠️ Audio waveform under video (decorative for now)
- ✅ Playhead at 0:00 + grab dot
- ✅ Clip duration label (`5.04s` style)
- ✅ Selectable state (yellow glow + drop shadow)

### Step 3 — Preview engine
- ✅ Video element renders preview
- ✅ Playhead synced to currentTime via timeupdate
- ✅ Play/pause via ▶ in transport row + tap-preview-to-play
- ✅ Drag-to-scrub (pointerdown on strip + pointermove)
- ✅ Real-time visual feedback

### Step 4 — Clip selection
- ✅ Tap clip → ve-selected class adds yellow ring + glow
- ✅ Selection state preserved until tap-outside or Done
- ✅ Context toolbar replaces main action bar on selection

### Step 5 — Context action system
- ✅ Video clip context: Edit · Split · Replace · Speed · Opacity · Duplicate · Delete · Done
- ⛔ Text clip context: Edit text / Style / Position
- ⛔ Audio clip context: Volume / Fade / Sync
- ⛔ Sticker / PiP clip context

### Step 6 — Timeline editing
- ✅ Trim — drag yellow handles (left/right) shortens the clip
- ✅ Trim handles snap to 0.5s grid when Snap is on
- ⚠️ Split — UI present, real mid-clip splice (creates 2 clips) needs multi-clip array
- ⛔ Move — drag clip horizontally (multi-clip phase)
- ⛔ Duplicate — clone clip (multi-clip phase)
- ✅ Delete — confirm + tear down (single-clip MVP closes editor; multi-clip phase removes one clip)

### Step 7 — Layer system
- ✅ Track rows: Music / Subtitle / Sticker-PiP / Video / Audio
- ✅ + adder per row opens a panel for that layer
- ⛔ Each layer with independent timeline (currently all share one playhead)
- ⛔ Layer overlap support (z-order management)
- ⛔ Per-layer trim handles

### Step 8 — Audio processing
- ⛔ Extract audio from video → separate track
- ✅ Add background music (file pick → AudioBufferSourceNode preview)
- ✅ Volume slider (0–100%)
- ✅ Mute original audio toggle
- ⚠️ Sync audio to timeline (music starts at 0; no offset/trim yet)
- ⚠️ Waveform display (decorative bars; real waveform from decodeAudioData = next)

### Step 9 — Text / caption system
- ✅ Add subtitle text (one per clip for v1)
- ✅ Position (top / middle / bottom)
- ✅ Style (size, colour, background bar)
- ⚠️ Sync timing — caption shows for entire clip duration; timeline-keyframed timing = next
- ⛔ Auto captions via speech-to-text

### Step 10 — Effects + adjustments
- ⛔ Filter — colour-grade presets
- ✅ Speed change (0.25x – 4x slider + presets, live preview)
- ⛔ Zoom — Ken-Burns pan/zoom keyframes
- ✅ Opacity — 0–100% slider, live preview on video + overlay
- ⛔ FX (zoom shake / pulse / etc.)

### Step 11 — Keyframe system
- ⛔ Position keyframes (interpolate translate over time)
- ⛔ Opacity keyframes (fade in/out animation)
- ⛔ Scale keyframes (zoom in/out animation)
- ⛔ Rotation keyframes
- ⛔ Visual keyframe editor on the affected track row

### Step 12 — Error handling
- ✅ Codec error toast on video.error (HEVC / network / damaged file)
- ✅ 3-second probe → load-failure overlay if duration stays 0/NaN
- ✅ Failure overlay offers Replace clip or Close editor
- ⛔ "Original video was lost" detection on project reopen
- ⛔ Relink-from-library option

### Step 13 — Export
- ✅ MP4 via Canvas + MediaRecorder + AudioContext mix
- ⛔ Resolution chooser (Auto / 720 / 1080)
- ⛔ Frame-rate chooser (24 / 30 / 60)
- ⛔ Bitrate chooser
- ✅ Combines: video + canvas overlay (text) + bg music + original audio
- ⛔ Combines: layered stickers / PiP / FX / keyframe-baked transforms

### Step 14 — Project save system
- ✅ Save button writes editorDraft (trim + mute + text + music vol + speed + opacity) to app record
- ⛔ Non-destructive snapshot of full timeline (clips array + layer state)
- ⛔ Re-edit any past project from Library tile menu
- ⛔ Auto-save on every meaningful change

---

## Original spec sections (still tracked)

---

## A. Top bar (project + output controls)

- ✅ Back arrow
- ✅ Help (?)
- ✅ Aspect dropdown (Original / 16:9 / 9:16 / 1:1 / 4:5)
- ✅ Three-dots (more)
- ✅ Save
- ✅ Export (blue button)
- ⛔ App mode selector (PWA / Book / Media)
- ⛔ Screen size preview (Mobile / Tablet / Desktop)

## B. Preview canvas

- ✅ Black preview, real-time playback
- ✅ Play / Pause
- ✅ Tap-preview-to-play (VN behaviour)
- ✅ Fullscreen icon
- ✅ Native iOS controls fallback
- ✅ Codec error toast (HEVC / damaged file)
- ✅ Drag-to-scrub playhead synced to preview

## C. Timeline core

- ✅ Playhead (white line + grab dot)
- ✅ Frame thumbnails inside yellow track
- ✅ Time ruler
- ✅ Trim handles (draggable yellow edges)
- ✅ Clip duration label
- ✅ + adder per track
- ✅ + append at end of track
- ✅ Snap toggle (snap-to-grid 0.5s, with visible tick markers)
- ⛔ Snap-to-beats (audio-aware)
- ⛔ Snap-to-caption boundaries

## D. Track layers

- ✅ 5 stacked tracks: Music / Subtitle / Sticker-PiP / Video / Audio
- ✅ Per-track + adder
- ⛔ Drag a clip horizontally to reposition
- ⛔ Trim clip edges with finger (already have handles, needs tighter UX)

## E. Bottom toolbar (26 actions)

- ✅ Filter · Trim · FX · Split · Cutout · | · Speed · Volume · Fade ·
  Crop · Rotate · Mirror · Flip · Fit · | · BG · Border · Blur ·
  Opacity · Denoise · Zoom · Extract Audio · Auto Captions · TTS ·
  Story · Reverse · Freeze · PiP Track
- ✅ Working: Trim · Split · Volume (panel) · TTS
- ⛔ All other 22: real implementations (placeholder toasts ship today)

## F. Cover button

- ✅ Cover tile on left of timeline
- ⛔ Tap → frame picker UI to choose the cover image

---

## G. CONTEXT-AWARE ACTION SYSTEM (priority 1)

- ✅ Strong visual selection feedback (yellow glow + drop shadow)
- ✅ Floating quick-toolbar above selected clip
  (Split · Duplicate · Replace · Delete)
- ✅ Bottom toolbar swaps to context bar on selection
  (Edit · Split · Replace · Speed · Opacity · Duplicate · Delete · Done)
- ✅ Tap-outside or Done deselects
- ✅ Delete (single-clip MVP) wired
- ✅ Edit → opens text-overlay panel (full property editor lands later)
- ⛔ Split → actual mid-clip split (creates two clips on timeline)
- ✅ Replace → file picker swaps video src, regenerates thumbs, resets trim
- ✅ Speed → 0.25x – 4x slider + presets, live playbackRate preview
- ✅ Opacity → 0–100% slider, live preview on video + overlay
- ⛔ Duplicate → clone clip on the timeline (multi-clip phase)

## H. Replace / Relink media (priority 3)

- ⛔ Detect missing media (broken blob URL after Safari evicts)
- ⛔ Modal: "Media file not found" with Replace / Relink / Ignore
- ⛔ Replace = pick new file, keep clip position + duration
- ⛔ Relink = pick from Load Library, keep position
- ⛔ Ignore = mark clip as placeholder, keep timeline intact

## I. Clip interaction depth (priority 4)

- ⛔ Drag clip horizontally on timeline (reorder / reposition)
- ⛔ Snap-to-grid while dragging
- ⛔ Snap-to-beats (audio-aware)
- ⛔ Snap-to-caption boundaries
- ⛔ Long-press to start drag (so it doesn't fight scrub)

## J. Multi-clip support

- ⛔ More than one clip on the video track
- ⛔ Clips dock side-by-side; gap fills with black
- ⛔ Each clip independently selectable
- ⛔ Cross-clip transitions (cut by default; fade option later)

## K. Captions system (elevated per spec)

- ⛔ Auto Captions — speech-to-text → time-stamped subtitle track
- ⛔ Manual subtitle row editor
- ⛔ Caption sync to playhead (drag to retime)
- ⛔ Word highlight mode (karaoke) for kid reading
- ⛔ Caption export as .srt / .vtt

## L. Audio + voice intelligence

- ⛔ Voice Assign (per-character voice mapping)
- ⛔ Character Voice picker tied to book characters
- ⛔ Narration Mode (read-aloud the visible subtitle track)
- ⛔ Audio Sync to text (auto-time captions to TTS audio)
- ⛔ Loop audio toggle
- ⛔ Denoise (audio noise reduction)

## M. Export system

- ✅ MP4 via Canvas + MediaRecorder
- ⛔ Resolution chooser (Auto / 720 / 1080)
- ⛔ Compression preset (Low / Med / High)
- ⛔ Format toggle (MP4 / MP3 / WAV / GIF)
- ⛔ Export-as-type:
    App Asset · Book Video · Narration Audio · Social Clip · Background Loop
- ⛔ Send To: App Project · Book Project · Media Library
  (currently: download to Files only)

## N. Media type selector

- ⛔ Type chooser at top: Video · Audio · Narration · Background Loop · UI Animation
- ⛔ Behaviour-shapes-export: type controls how the file shows up after Send

## O. Loop / playback control

- ⛔ Loop ON/OFF
- ⛔ Autoplay ON/OFF
- ⛔ Muted-start ON/OFF

## P. Performance / safety

- ✅ Big-video import bypasses readAsArrayBuffer (stores File directly)
- ⛔ Resolution-reduce warning when source > 1080p
- ⛔ Compression suggestion banner when output > 100 MB
- ⛔ Mobile-optimised export preset

---

## Build order (locked 2026-04-26, refreshed 2026-04-27)

1. Context Action Bar — ✅
2. Floating Quick Toolbar — ✅
3. Strong Visual Selection Feedback — ✅
4. Replace media — ✅
5. Snap Toggle — ✅
6. Real Speed slider — ✅
7. Real Opacity slider — ✅
8. Editor topbar buttons (Back / Help / More / Save / Stack / Undo / Redo) — ✅
9. Media persistence Blob fix (no more error-files on reload) — ✅
10. On-device AI 30s timeout — ✅
11. Force load() + load-failure overlay + multi-trigger thumbs — ✅
12. **NEXT: real audio waveform** (decodeAudioData → draw real bars
    so step 8 stops being decorative)
13. Multi-clip array foundation (the unblocker for steps 6-Move,
    6-Duplicate, 13-layered-stickers, and step 14-snapshot-save)
14. Real Split (mid-clip splice, requires #13)
15. Clip drag-to-reposition (requires #13)
16. Clip Duplicate (requires #13)
17. Auto Captions (speech-to-text → time-stamped subtitle track)
18. Caption timing keyframes (subtitle segments over the timeline)
19. Keyframe system (position / opacity / scale / rotation)
20. Resolution / framerate / bitrate export options
21. Send To: App Project / Book Project / Media Library
22. Project save snapshot (non-destructive, re-editable)
23. Relink-from-library on missing media
9. Multi-clip support — ⛔
10. Auto Captions (speech-to-text) — ⛔
11. Voice Assign / Character Voice — ⛔
12. Resolution / compression / format export options — ⛔
13. Send-To integration (App / Book / Media Library) — ⛔
14. Media type selector — ⛔
15. Loop / Autoplay / Muted-start toggles — ⛔
16. App mode + screen size preview at top — ⛔
