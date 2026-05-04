# Suggestions parked — review by 2026-05-25

User direction 2026-05-04: capture and revisit in a few weeks. **Do not
implement until the user explicitly requests one of these.**

These are exploratory ideas the user asked me to brainstorm for the
suite (Load, LoadStudio, LoadPlay, ACR Reader, Attain, Attain Jr,
Study). Grouped by theme. Each is offline-friendly, dyslexia-aware,
avoids external product names.

---

## Cross-suite (highest leverage)

- **Universal voice layer.** Web Speech command bar across all six apps. "Open Bereshit." "Make this into a study deck." "Resume my last edit." iPad supports this offline.
- **Shared local knowledge graph.** One IndexedDB the whole suite reads/writes. A "covenant" tag in ACR Reader surfaces as a study card in Attain, a scene tag in LoadStudio, a chapter marker in Load. No server needed.
- **Personal color-of-meaning palette.** Instead of red/blue defaults, the user maps their own colors to concepts. Same palette appears across every app. The brain learns the mapping once.
- **Cross-app reading handoff.** Pause a passage in ACR Reader, resume the same point as audio in Load while doing something else, then study it in Attain. One reading "session" object spans apps.
- **Cadence learner.** The suite quietly tracks where the user slows down or backtracks. Auto-scroll speed, voice pace, BeeLine timing, and Attain review intervals tune to that cadence.
- **Visual save-history.** Every save anywhere produces a thumbnail in a scrubbable timeline. "Time-travel" without filenames.

## ACR Reader + Attain

- **Pre-read schema.** Two-line plain-language preview at the top of every chapter so dyslexic readers have context before sentences.
- **Semantic bookmarks.** "Bookmark all passages about courage" via local-LLM tagging, not just positions.
- **Difficult-word predictor.** Inline pronunciation hints appear right before words the user has historically paused on.
- **Concept map that grows as you read.** Tap any term to see every other passage that uses it. Builds itself silently.

## Load main

- **"Rewrite for clarity" overlay.** Select any paragraph in any imported HTML app → instant simpler-language version. Toggleable in the viewer.
- **One-click study export.** Any imported book → Attain deck, automatically.
- **Lost-focus auto-bookmarks.** Detects back-scroll patterns and silently marks where the reader struggled.

## LoadStudio

- **Scene whisper.** Quiet plain-language line per editing step ("add a wide shot first so viewers know where they are").
- **Director presets.** Pick a voice (Documentary / Calm / Energetic) and the studio shifts pacing, color, and music suggestions.
- **PWA dry-run preview.** See the published book/video as a viewer would, with throttled network simulation.
- **Project state thumbnails on the dashboard.** At-a-glance where every project sits (drafted / scored / awaiting cover / ready).

## LoadPlay

- **Quiet mode feed.** Low-stimulation rail. Long-form, ambient, no autoplay, soft palette.
- **LAN co-watch handoff.** Scan a QR on a second iPad to continue the same playback. Works offline on the same Wi-Fi.
- **Family progress garden.** Educational watch time grows a visual garden the whole family sees.

---

## Reminder logistics

I can't actually wake up on a specific date — my session is reactive,
not scheduled. To make sure these resurface, do one of:

1. Set a calendar reminder on your iPad for **2026-05-25** that says
   "Open `SUGGESTIONS_PARKED.md` in the repo and ask Claude to revisit."
2. Each new session, look at `CLAUDE.md` — I added a
   "**Active reminders**" section that lists this file's review date
   so future sessions surface it automatically.
