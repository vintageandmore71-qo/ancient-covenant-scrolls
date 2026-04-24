# Load — Sunday Pickup Notes

*Last updated: April 24, 2026*

---

## Current state: stable and shipping

Load is fully working on your iPad with full AI, sharing, and scan/fix features. Everything pushed to `main`, live at:

- **Load:** https://dssorit.github.io/ancient-covenant-scrolls/load/
- **The Great Eraser (test PWA):** https://dssorit.github.io/ancient-covenant-scrolls/GreatE/

---

## What we shipped this weekend

### AI Helper
- ✅ **AI-first routing** — Gemini sees your full question, not the KB
- ✅ Local model install + persistence (IndexedDB-backed, iOS won't evict)
- ✅ iOS `navigator.storage.persist()` request keeps the model offline
- ✅ Welcome bubble explains commands on every open
- ✅ Copy button on every AI answer
- ✅ **Apply to editor** button when AI returns code
- ✅ New chat (↻) button
- ✅ Sees console errors + current selection in context
- ✅ Honest error diagnostics (not "all providers rate-limited")
- ✅ Gemini switched from exp → stable `gemini-2.0-flash`
- ✅ Defer on-device model load (fixed boot freeze)
- ✅ 16px input font (fixed iOS auto-zoom)
- ✅ Boot-time stuck-zoom self-reset

### Console / Fixer
- ✅ Auto-fix button always tappable with clear count
- ✅ New local fixes: **charset meta**, **image alt**, **tracking script strip**, **manifest field fill**
- ✅ **Google Fonts download + embed** (one tap, no hosting)
- ✅ **"Ask AI to fix everything"** card (uses your Gemini/OpenRouter to rewrite the whole file)
- ✅ Diagnose ordering fixed — real provider errors surface before misleading "local cache gone"

### Sharing
- ✅ **Share picker** with three formats
- ✅ **🔗 `.webloc` Offline Link** — recommended, self-contained, opens in Safari, no hosting. Gzipped launcher.
- ✅ **📱 `.webarchive`** — fallback for apps too big for data URL
- ✅ **📄 Raw `.html`** — for uploading to a host
- ✅ Every shared file auto-injects: PWA meta tags, inline apple-touch-icon (from bundle or auto-generated initials), **Add-to-Home-Screen popup** for recipient, **multi-page router** for PWAs with login → home → etc.

### Templates & Misc
- ✅ **Save-as-template** button on viewer topbar (💾). Saves the whole open file as a reusable template.
- ✅ Raw-HTML templates coexist with Create-wizard templates; opens new scratch file in editor.

### IP Protection
- ✅ LICENSE strengthened with Load™ + Attain™ trademark claim
- ✅ NOTICE.md (plain-language)
- ✅ README.md with commercial-use section
- ✅ Load™ shown on splash title (small superscript)

### Related
- ✅ Attain/Study quiz fixed — **no more blank answer bars**, 10–30 questions per activity

---

## Parked for Sunday

### 1. Standalone Load PWA file (like Attain has)
**User wants this next.** A single self-contained `Load-Standalone.html` that inlines the three external libs (jszip, pdf.js, epub.js). Would let Load itself run without a hosted repo.

Size estimate: ~7-10 MB inlined. Non-trivial — each lib is ~1 MB uncompressed.

Approach:
- Fetch each vendor lib
- Inline into `<script>` blocks
- Remove the `<script src=…>` tags
- Package with current Load HTML/CSS

### 2. PWA → Native app via PWABuilder
Walk-through for packaging Load + Attain as iOS/Android app packages via pwabuilder.com. Needs:
- A live hosted URL (✅ already have)
- PWABuilder generates an `.ipa` or App Store bundle
- For App Store: needs Apple Developer account ($99/yr)

### 3. Piper TTS
Better TTS voices than Safari's built-in. Piper is a client-side ONNX model — similar story to the local AI model (ship by IndexedDB, request persistence). Estimated 40-80 MB per voice.

---

## Known friction / open questions

### iPad file sharing limits
- Apple blocks JS in QuickLook preview of local `.html` files
- `.webarchive` opens in Safari but sometimes still hangs on loading
- `.webloc` with data URL is the cleanest path — works for < ~10 MB
- Any PWA over 10 MB basically needs hosting (GitHub Pages works, `GreatE/` folder already set up)

### Rate limits
- Gemini free tier: 15 RPM, 1500 RPD
- User reported rate-limit even without heavy testing — likely VPN flagging or fresh-key soft-lock
- Fix pattern: wait 30 min, keys are valid, they cool down

### User preferences (notes for me)
- **Doesn't like Groq** — suggest OpenRouter or Hugging Face if second provider needed
- **Very strict on Load staying offline-first** — hosting is last resort, not default
- **Dyslexia-friendly communication** — short steps, one thing at a time, plain words

---

## Quick reference: key file locations

- `load/load.js` — main application (~6000+ lines)
- `load/load.css` — all styles
- `load/index.html` — markup + PWA metas
- `load/sw.js` — service worker (bump CACHE var on every push)
- `load/manifest.json` — PWA manifest
- `attain/attain-study.js` — study mode (quiz fixes here)
- `attain/attain-parser.js` — content parser for activities
- `GreatE/` — user's hosted book (placeholder + uploaded files)

---

## First question to ask Sunday

> **"Should we pick up with the standalone Load PWA file, or is something else higher priority?"**

User mentioned the standalone Load file is the most important remaining piece. ~1-2 hour task.
