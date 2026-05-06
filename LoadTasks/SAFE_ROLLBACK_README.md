# Load Tasks Safe Rollback

## Purpose

This rollback returns Load Tasks to the last verified stable version before the v5 How-To overlay problem.

## Why

The v5 Phase 1 How-To system created a blocking overlay that trapped the site.

## Replace these files in GitHub

Upload the files in this package into:

ancient-covenant-scrolls / LoadTasks /

Replace existing files.

At minimum replace:

- index.html
- app.js
- styles.css
- service-worker.js
- manifest.json

Recommended replace all included files and folders from this rollback package.

## After upload

1. Wait 2 to 5 minutes.
2. Open the live Load Tasks link.
3. Refresh the browser.
4. Confirm the site opens normally.
5. Confirm Help Center, Validator, Fix Studio, Project Vault, Focus Mode, and Repair Preview still work.

## Next rebuild rule

Do not add a full-screen How-To modal again. Future help must be a non-blocking drawer or inline help card.
