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

> **Load = a mobile-first packaging + publishing platform for offline web apps.**
>
> Scope: **iOS and Android only.** Not Windows, not macOS, not Linux desktops. The point is to turn an offline web app (OWA / PWA) — something the user built or imported on their iPad — into a **fully working mobile application** the creator can hand to another phone or tablet user and have it feel native.
>
> Think "Swift, but iPad-native, and only for mobile." A creator opens Load, authors or imports an OWA / PWA, and Load produces every mobile format they might want:
>   - Standalone single-file PWA (runs on any iOS/Android browser)
>   - iOS app bundle (via PWABuilder handoff, sideload or App Store)
>   - Android APK / AAB (via PWABuilder handoff, sideload or Play Store)
>   - EPUB for Kindle / Apple Books / Kobo
>   - PDF
>
> No desktop tools, no build server, no Apple Developer environment to learn. The whole pipeline runs on an iPad.
>
> The unprecedented bit: Load itself runs offline on iPad. No other tool in this space does that.

### Sunday priority queue (in order)

1. **🏆 Standalone Load PWA file** — the first proof point of the vision. Load produces a single-file version of itself with the three vendor libs (jszip, pdf.js, epub.js) inlined. Ships the same flavor as `Attain-Standalone.html` that already exists in the repo. ~7–10 MB. ~1–2 hours work. ✅ **DONE April 26** — rebuilt against current `/load/` tree, all April 24 features inlined.

2. **📚 Import → Edit → Publish pipeline (NEW — replaces former #2 EPUB-only step)**

   User scope (April 26): *"Drop in your already-written + art-generated book, edit, export for KDP-friendly or other digital publishing sites."* No image generation, no template gallery curation, no real-time collab. The realistic reach with one well-built EPUB + one well-built PDF: **Amazon KDP** (print + Kindle), **Apple Books**, **Kobo**, **Barnes & Noble Nook Press**, **Smashwords / Draft2Digital**, **IngramSpark**, **Google Play Books**.

   Build part-by-part, smallest shippable first:

   1. **Import .docx + .txt + .md** — read .docx as zipped XML (paragraphs, headings, lists, inline images), drop tracked changes / complex tables. Lossy-but-functional. Most common case, fastest win.
   2. **EPUB 3 export** — covers Kindle / Apple / Kobo / Nook / Google in one shot. Use the JSZip already loaded.
   3. **KDP page-layout view** — trim presets (6×9, 8.5×11, kids' 8.5×8.5, etc.), KDP-spec bleed and margins (margins grow with page count), page numbers, headers, full-bleed children's-book layout.
   4. **PDF export** — KDP print + IngramSpark. Browser print API styled to KDP-acceptable PDF.
   5. **Import .epub + .pdf** — so users can re-edit a book they already published.
   6. **Cover-image export** — high-res PNG / JPEG for KDP's separate cover upload.

   Skipped on purpose: image generation (user already has art), Canva-scale stock library (use iPad Photos / Files), Microsoft Word docx export (KDP wants EPUB/PDF anyway), real-time collab (offline-first; async AirDrop round-trips + local comments cover 95% of self-pub feedback rounds).

3. **🎨 Publishing templates** — "nice designed templates for the different file uploads." Pre-built cover-page, copyright-page, dedication, TOC, chapter-opener, and back-matter layouts that the user picks in Load's Create screen. Each template is dyslexia-friendly AND formatted to each platform's spec:
   - **KDP print paperback** — trim size, bleed, margins, ISBN area
   - **KDP Kindle ebook** — reflowable EPUB, no fixed layout
   - **Apple Books** — same EPUB but with Apple-specific metadata
   - **Generic EPUB** — neutral, universal
   - **Cover-only** — for separate cover upload (KDP asks separately)

4. **📦 Mobile app packaging walkthrough** — "PWA → native" via pwabuilder.com, **iOS + Android only, no Windows target**. Document the workflow so Load users can generate `.ipa` / `.apk` / `.aab` packages from any Load PWA. Apple Developer account needed for iOS App Store submission but not for sideloading / TestFlight. Android APK can be distributed without Play Store.

5. **👶 Start building Attain Jr™** — kid-focused variant of Attain. Scaffold created April 24 at `attain-jr/` with `index.html` placeholder and `NOTES.md` laying out the design principles (picture-first, touch-only, no network, parent-gated AI, no ads, COPPA-friendly). Sunday decision point: **fork from Attain and strip back, or fresh build sharing only the content format?**

### ✅ Already in Load (reminder — don't rebuild)

- **Kindle-style book reading.** Load already handles **EPUB** and **PDF** import out of the box. Users can load books directly from Files or via share-to-Load from any reader. Dyslexia-friendly fonts, TTS, bookmarks, notes, and per-app theme memory all work on imported books.

### 🌐 Domain plan (low budget)

User asked whether buying domains matters if Load + Attain go App Store / Google Play only. Verdict: **necessary minimum is one domain**.

Reasons: both stores **require** a privacy-policy URL to approve the app, and both **display** the developer website in the listing. A `dssorit.github.io` URL there looks like a hobby project; a custom domain looks like a real company.

**Recommended cheapest workable plan:**
- Buy **one umbrella domain** (e.g. `lbond.app`, ~$15/year, on Namecheap or Porkbun — NOT GoDaddy: 2× the cost, paid WHOIS privacy, aggressive upsells).
- Use **subdomains for each app** (free): `load.lbond.app`, `attain.lbond.app`, `attainjr.lbond.app`.
- Each subdomain hosts a small landing + privacy-policy page on GitHub Pages.

**Defensive expansion if/when budget allows:**
- `loadapp.io`, `attainapp.com`, `attainjr.com` — grab before squatters do.
- Total at that point: ~$45–80/year.

**Order of legal-protection spending (cheapest first):**
1. Now — **one umbrella domain** (~$15/yr)
2. Later — defensive domain registrations (~$30–60/yr)
3. When revenue allows — **USPTO trademarks** Load → Attain → Attain Jr (~$250 each, one at a time)

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
