# Load Tasks GitHub Pages Ready Upload

This ZIP is flattened so `index.html` is at the top level.

## Why the 404 happened

The earlier ZIP had the app inside a folder named `load-tasks-complete`. GitHub Pages only serves the file path you upload. If `index.html` is nested, the site may 404 unless the URL includes that folder name.

## Correct upload method

1. Unzip this package.
2. Open the unzipped folder.
3. Upload the contents of the folder to your GitHub repo or chosen folder.
4. Make sure `index.html` is visible at the exact GitHub Pages publishing location.
5. Do not upload only the ZIP file.
6. Commit the files.
7. Go to Settings, then Pages.
8. Choose the branch and folder where `index.html` is located.
9. Wait a few minutes.
10. Open the GitHub Pages URL.

## If publishing from repository root

Use:
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/

## If publishing from a folder inside the repository

Example folder:
loadtasks/

Use:
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/loadtasks/

## Required top-level files

These must be visible at the publishing location:

- index.html
- manifest.json
- service-worker.js
- styles.css
- app.js
- favicon.ico
- assets/

## Important

GitHub Pages is case-sensitive. Folder names and file names must match exactly.
