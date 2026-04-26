# Load Media Module — Spec & Build Queue

This file is the source of truth for the Load video editor's
feature roadmap, locked in from the user's VN-comparison spec
(2026-04-26).

Format per item:
- ✅ shipped
- 🛠 in progress
- ⛔ pending (priority order matters)

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
- ⛔ Snap toggle (snap-to-grid / beats / captions)

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
- ⛔ Edit → real per-clip property editor
- ⛔ Split → actual mid-clip split (creates two clips on timeline)
- ⛔ Replace → file picker, swap source, keep position
- ⛔ Speed → 0.25x – 4x slider with live preview
- ⛔ Opacity → 0–100% slider with live preview
- ⛔ Duplicate → clone clip on the timeline

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

## Build order (locked in 2026-04-26)

1. Context Action Bar — ✅ shipped 67156a6 → a8665da batch
2. Floating Quick Toolbar — ✅ same commit
3. Strong Visual Selection Feedback — ✅ same commit
4. Replace / Relink Media — ⛔ NEXT
5. Clip Interaction (drag / trim / duplicate) — ⛔
6. Snap Toggle — ⛔
7. Real Speed slider — ⛔
8. Real Opacity slider — ⛔
9. Multi-clip support — ⛔
10. Auto Captions (speech-to-text) — ⛔
11. Voice Assign / Character Voice — ⛔
12. Resolution / compression / format export options — ⛔
13. Send-To integration (App / Book / Media Library) — ⛔
14. Media type selector — ⛔
15. Loop / Autoplay / Muted-start toggles — ⛔
16. App mode + screen size preview at top — ⛔
