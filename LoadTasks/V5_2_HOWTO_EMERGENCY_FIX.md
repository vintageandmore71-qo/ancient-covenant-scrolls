# Load Tasks v5.2 How-To Emergency Fix

## What this fixes

The How-To modal opened but showed a blank instruction box.

## Why this works

This patch adds an inline How-To loader directly inside index.html. It does not depend on app.js loading correctly.

## Replace these files

At minimum, replace:

- index.html
- styles.css
- service-worker.js
- manifest.json

Recommended: replace app.js too, but the emergency fix is inside index.html.

## After upload

1. Wait 2 to 5 minutes.
2. Open the site.
3. Tap browser refresh.
4. Tap a How-To button.
5. The step list should appear.
