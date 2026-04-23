# Load — Run Web Apps on iPad

Native iPad app that hosts user-imported web apps (PWAs / HTML
bundles / single-file readers) offline. Built in Swift Playgrounds
4+ on iPad. Free Apple Developer account tier is enough for
personal install; App Store distribution is a later phase.

Copyright (c) 2026 LBond. All Rights Reserved.

## Constraints (locked)

- 100% free to run. No subscriptions, no hosting fees, no servers.
- Zero internet required after install. Everything runs from local
  device storage.
- Swift Playgrounds compatible — iPad only, no Mac, no Xcode.
- Dark theme, iPad-first layout.
- Works with every web file format already in the ACR project
  (HTML / JS / CSS / JSON / PDF.js / epub.js / woff2 / base64
  data URLs, etc.) because WKWebView is the same engine Safari
  uses.

## Build plan (split into parts)

- [x] **Part 1 — Bootable shell.** App entry, root content view,
      Project model, library grid with empty state. No imports,
      no persistence, no viewer yet. This part must compile and
      show the empty library before moving on.
- [ ] **Part 2 — File import + persistence.** UIDocumentPicker,
      copy imported files into the app's Documents folder, save
      the Project list to disk, delete projects.
- [ ] **Part 3 — WKWebView viewer.** Project tap opens in-app
      WebView, loads the entry HTML, with back / reload / close
      controls.
- [ ] **Part 4 — Dyslexia reading aids.** Font swap
      (OpenDyslexic), adjustable font size / line spacing / letter
      spacing, colored overlays (cream / yellow / soft blue),
      bionic reading, focus line, TTS, adjustable column width.
      All injected into the loaded page via JavaScript so any
      imported web app gets the same aids for free.
- [ ] **Part 5 — Book features.** Auto-save reading position per
      project, bookmarks with notes, progress tracker, in-page
      search, sepia / night mode per project.
- [ ] **Part 6 — ZIP import + manifest parsing.** Adds the
      ZIPFoundation Swift Package to enable ZIP extraction so
      users can import `.zip` bundles like the ACR offline bundle
      or the Attain standalone zip. Parses `manifest.json` for
      name / start URL / description when present. Validator
      flags missing files and broken icon paths.

## Files in this folder

| File | Purpose |
|---|---|
| `MyApp.swift` | `@main` app entry — dark theme + brand accent. |
| `ContentView.swift` | Root container; routes to `LibraryView`. |
| `Project.swift` | Project data model (Codable for persistence). |
| `LibraryView.swift` | Library grid + empty state + `+` button. |

## How to set up Part 1 in Swift Playgrounds

1. Open **Swift Playgrounds** on iPad.
2. On the home screen tap **See All** (top-right under
   "New App Project" if visible) and pick the **App** template.
3. Name the project `Load` and tap **Create**. Swift Playgrounds
   generates two default files, usually `MyApp.swift` and
   `ContentView.swift`.
4. Open `MyApp.swift`. Select all, delete, paste the contents of
   this folder's `MyApp.swift`.
5. Open `ContentView.swift`. Select all, delete, paste the
   contents of this folder's `ContentView.swift`.
6. Add a new file: tap `+` in the left sidebar → **Swift File** →
   name it `Project` and paste the contents of `Project.swift`
   (without the `.swift` extension in the name field).
7. Repeat for `LibraryView` using `LibraryView.swift`.
8. Tap the **Play** button (top-right). The simulator inside
   Swift Playgrounds should boot and show the empty library
   titled "Load" with a `+` icon top-right and the
   "No projects yet" message in the center.

If the app doesn't launch, check the Console (bottom panel) for
errors — most are typos from the paste, easy to spot.

Once Part 1 renders the empty library cleanly, we move to Part 2.
