# Load (iOS / Swift Playgrounds) — PAUSED

This build is paused. The PWA version in `/load/` is the active path.

## Where we stopped

- Swift Playgrounds 4+ project created on iPad, named **My App**
- `MyApp.swift` — replaced with Load's `@main` entry point ✓
- `ContentView.swift` — replaced with `LibraryView()` router ✓
- `Project.swift` — file created in the sidebar ✓
- `Project.swift` — **code NOT yet pasted inside** ← this was the next step
- `LibraryView.swift` — not yet created
- App not yet run

## To resume

1. Open the Swift Playgrounds app on iPad.
2. Open the "My App" project.
3. In the left sidebar, tap `Project` to open that file.
4. Paste the contents of `load-ios/Project.swift` from this repo into the empty editor.
5. Continue with Step 5 from the prior chat — add a new Swift file named `LibraryView` and paste `load-ios/LibraryView.swift` contents.
6. Tap the Play button to run Part 1.

## Why paused

Swift Playgrounds requires precise tapping and file management that
is hard to navigate with dyslexia. The PWA version at `/load/` in
this repo delivers the same offline local-file launcher capability
without leaving the browser — same engine (WebKit), zero Swift,
zero file-management gymnastics. Swift path stays available for a
future App-Store distribution phase.
