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

### 🎯 Strategic direction (updated April 24 evening)

User pivoted the long-term focus. Sunday's work should serve this bigger mission:

> **Load = a universal packaging + publishing platform for offline-first content.**
>
> Think: "Swift-like wrapper, but iPad-native." A creator opens Load, authors or imports a web app / book / PWA, and Load produces *every format anyone might want* — standalone PWA, native app bundle, EPUB for Kindle, PDF, webarchive, webloc — without ever needing a desktop, a build server, or an Apple Developer account.
>
> The unprecedented bit: Load itself runs offline on iPad. No other tool in this space does that.

### Sunday priority queue (in order)

1. **🏆 Standalone Load PWA file** — the first proof point of the vision. Load produces a single-file version of itself with the three vendor libs (jszip, pdf.js, epub.js) inlined. Ships the same flavor as `Attain-Standalone.html` that already exists in the repo. ~7–10 MB. ~1–2 hours work.

2. **📚 EPUB export** — unlocks KDP. Every iPad-authored book from Load can be uploaded directly to:
   - Amazon KDP (accepts EPUB/KPF)
   - Apple Books (EPUB native)
   - Kobo / Smashwords / Draft2Digital (EPUB)
   - Barnes & Noble Nook Press (EPUB)

   Load would need to construct a valid EPUB 3.0 bundle: `mimetype`, `META-INF/container.xml`, `OEBPS/content.opf`, `OEBPS/toc.ncx`, `OEBPS/nav.xhtml`, `OEBPS/content.xhtml`, plus embedded images. Use JSZip (already loaded).

3. **🎨 Publishing templates** — "nice designed templates for the different file uploads." Pre-built cover-page, copyright-page, dedication, TOC, chapter-opener, and back-matter layouts that the user picks in Load's Create screen. Each template is dyslexia-friendly AND formatted to each platform's spec:
   - **KDP print paperback** — trim size, bleed, margins, ISBN area
   - **KDP Kindle ebook** — reflowable EPUB, no fixed layout
   - **Apple Books** — same EPUB but with Apple-specific metadata
   - **Generic EPUB** — neutral, universal
   - **Cover-only** — for separate cover upload (KDP asks separately)

4. **📑 PDF export** — universal fallback, needed for KDP paperback print. Use browser print API, styled carefully to produce KDP-acceptable PDF.

5. **📦 App packaging walkthrough** — "PWA → native" via pwabuilder.com. Document the workflow so Load users can generate `.ipa` / `.apk` packages from any Load PWA. Needs Apple Developer account for iOS store submission but not for sideloading / TestFlight.

### ⏸ Deferred (few weeks out)

- **Piper TTS** — better voices than Safari's built-in. Revisit when main publishing pipeline is shipping.

### 📋 Also useful during build

- Remember: user **doesn't like Groq** — suggest OpenRouter / Hugging Face if a second AI provider is needed
- User's work style: **dyslexia-friendly short steps, one thing at a time**
- Load's tagline is **"work offline"** — every feature should respect that. Hosting is a last-resort fallback, not a default

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
