# Load Tasks v5.5: Remove Blocking Overlays

## What this fixes

The site was blocked by full-screen overlays:

- How-To pop-up
- Floating Notes pop-up

## What changed

Both blocking overlays have been removed from the HTML and forcibly hidden with CSS/JS.

## What remains

- Agent Lab
- Alert Dashboard
- Help Center
- Load AI Helper
- Validator
- Repair Command Center
- Repair Preview
- Project Vault
- Focus Mode
- Launch Certificate

## What is temporarily disabled

- Floating Notes pop-up
- Full-screen How-To pop-up

These should be rebuilt later as inline panels, not full-screen overlays.

## Files to replace

- index.html
- app.js
- styles.css
- service-worker.js
- manifest.json
