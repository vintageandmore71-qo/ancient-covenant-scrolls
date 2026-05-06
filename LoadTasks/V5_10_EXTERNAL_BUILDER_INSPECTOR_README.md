# Load Tasks v5.10 External Builder Inspector

## What this fixes

The Inspect Package button did not work in the live PWA Builder Studio.

## What changed

- Added a separate builder-inspector.js file.
- Loaded builder-inspector.js directly from index.html.
- Added hard button binding outside the main app.js.
- Kept ZIP inspection local in the browser.
- No editing, repair, or rebuild.

## Upload these files

- index.html
- app.js
- styles.css
- service-worker.js
- manifest.json
- builder-inspector.js

Important: builder-inspector.js must be uploaded beside index.html in the LoadTasks folder.

## Live test

1. Open PWA Builder Studio.
2. Choose a ZIP.
3. Tap Inspect Package.
4. Status should change immediately.
