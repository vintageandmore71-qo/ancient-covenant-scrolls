# ACR Study

Spaced repetition study companion for **The Ancient Covenant Record**.

Lives in a subfolder of the reader repo and is installable as its own PWA, separate from the reader. Shares the reader's chapter JSON data via `../data/`. Zero AI dependency, zero cost, works offline after first load.

## Phase status

- [x] **Phase 1 — Shell**: PWA scaffold, sidebar TOC of the 8 covered volumes, chapter loader, dark / sepia / light themes, font-size controls, offline service worker, separate home-screen install.
- [ ] **Phase 2 — Core study engine**: SM-2 spaced repetition, flashcards, confidence rating 1–5, progress tracking, daily streak, weak-card queue.
- [ ] **Phase 3 — Study modes**: fill-in-the-blank quizzes, identification multiple choice, memory drill, read-along (Web Speech API), child mode.
- [ ] **Phase 4 — Chapter breakdown + glossary**: algorithmic chapter summaries from existing JSON, DSS / Orit Ge'ez / Masoretic / Critical note surfacing, key terms glossary, mastery badges.
- [ ] **Phase 5 — Polish**: accessibility, progress export/import, distinct icon, cross-device test.

## Volume scope

Currently: Bereshit, Shemot, Vayikra, Bamidbar, Devarim, Chanokh, Yovelim, and War Scroll 1QM (18 section files, 8 volumes). Architecture is ready to accept Nevi'im and other volumes by appending to `IDS`, `LBL`, and `VOL_GROUPS` in `study.js`.

## Deployment

This folder deploys to `https://dssorit.github.io/ancient-covenant-scrolls/study/` as part of the reader's existing GitHub Pages site. No separate deployment target, no API keys, no secrets. The reader's root files are never modified.

## Local development

Any static file server works. From the repo root:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/study/`. The reader's JSON files at `/data/` must be reachable at the same origin for chapter loading to work.
