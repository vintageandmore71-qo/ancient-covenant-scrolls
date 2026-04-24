# Attain Jr™ — Design Notes

Scaffold created: April 24, 2026.
Started from: Attain (parent app) + user's direction during the late-evening Load session.

---

## What Attain Jr is

A **kid-focused variant of Attain**. Same offline-first philosophy, same dyslexia-friendly accessibility foundation, but designed for early readers and their parents.

The tagline idea: *"Attain, for the littlest learners."*

---

## Core differences from Attain

| Thing | Attain | Attain Jr |
|---|---|---|
| Target age | Teen → adult | Pre-K → early elementary |
| UI density | Standard | Bigger buttons, fewer per screen |
| Reading level | Varies | Controlled — picture-first, short text |
| Activity types | Full study suite | Simplified subset + picture-based matching |
| AI providers | Opt-in (Gemini, etc.) | **Off by default.** Parent-only gate if added later. |
| External links | Allowed | **Blocked by default.** No cloud round-trips. |
| Reward system | XP, scoring | Stars, stickers, celebratory animation |
| Parent/teacher mode | n/a | **Yes** — separate PIN-gated area to assign content, see progress |

---

## Planned features (first milestone)

- [ ] **Picture-first cards** — every concept shown with an image before the word appears
- [ ] **Read-to-me default** — TTS auto-plays on every card (muteable)
- [ ] **Touch-only interactions** — no typing. Tap-to-match, tap-to-choose, drag-to-sort
- [ ] **Celebrate EVERY correct answer** — animation + sound, loud and cheerful
- [ ] **Never say "wrong"** — just "try again" with encouragement
- [ ] **Parent dashboard** — PIN-gated; shows which books / activities the child has visited, time spent, stars earned
- [ ] **Content assignment** — parent picks which books from the shared library the child can see
- [ ] **Fully offline** — no network at all by default. Safety + privacy.
- [ ] **Home-screen-install guided** — first-run banner showing parent how to add to child's iPad

---

## Design safety principles

1. **No external network calls. Ever.** Unlike Attain (which allows opt-in cloud AI), Attain Jr blocks all external hosts at the CSP level.
2. **No data leaves the device.** All progress tracking is local IndexedDB only.
3. **No in-app purchases.** If monetized, do it at download (App Store price) or via a separate parent-facing purchase flow — never inside the child experience.
4. **No ads. Ever.**
5. **Kid-focused COPPA-friendly defaults.** No accounts, no email fields, no contact form, no sharing features exposed to child mode.

---

## Technical starting point

- Share **`attain/attain-parser.js`** for content parsing — same book format as Attain
- Share **`attain/attain-study.js`** only where activities map; most will be rewritten for picture-first kid UI
- New: **`attain-jr.css`** with generous sizing (targets ~10% of screen height per button), softer colors, rounded shapes everywhere
- New: **`attain-jr-voices.js`** for child-friendly TTS picks (Siri "Kate" / "Karen" for English; filter voice list)

---

## Sunday (April 26) starting task

When you pick up, the first question to answer is:
> *Does Attain Jr start as a **fork** of Attain (copy + strip back), or as a **fresh build** sharing only the content format?*

Forking is faster but drags in Attain's UI density. Fresh build takes longer but the result feels right for the audience. User to decide.

---

Copyright © 2026 LBond. All Rights Reserved.
Attain Jr™ is an unregistered trademark of LBond, claimed under U.S. common-law use since 2026.
