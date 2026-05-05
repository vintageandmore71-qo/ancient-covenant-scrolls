# Load Tasks - Open First

Load Tasks is a standalone PWA for tracking, validating, repairing, and handing off Load-related builds.

## What this app does

- Uploads PWA, HTML, ZIP, notes, reports, and build files.
- Extracts promised features from ChatGPT, Claude, or developer notes.
- Validates PWA structure, app launch risk, missing files, icons, buttons, assets, and security warnings.
- Blocks false complete status by using Not proven when file evidence is missing.
- Generates repair prompts, QA checklists, reports, and GitHub-ready packages.
- Works locally in the browser after first hosted load.

## How to open quickly

1. Unzip the folder.
2. Open `index.html` in a browser.
3. Use this only for a quick visual test.

Some PWA features may not work from a local file because browsers restrict service workers on `file://` pages.

## Best way to use

1. Upload the unzipped folder to GitHub Pages, Netlify, Vercel, or any HTTPS host.
2. Open the HTTPS link.
3. On iPad or iPhone, use Share, then Add to Home Screen.
4. On desktop Chrome or Edge, use Install App if offered.
5. Open the installed app and upload a test PWA zip.

## If it opens as raw code

One of these is usually true:

- You opened a source file instead of `index.html`.
- The ZIP was not unzipped.
- The wrong folder was uploaded to hosting.
- `index.html` is not at the hosting root.
- A developer delivered source fragments instead of a built standalone app.

## Recommended first test

1. Open Load Tasks.
2. Choose Upload Build.
3. Upload a PWA ZIP.
4. Click Analyze Upload.
5. Open Validator.
6. Export the Markdown Report.
7. Export the Claude Repair Prompt.
8. Export the GitHub-ready ZIP.
