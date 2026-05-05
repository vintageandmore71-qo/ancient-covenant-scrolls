# Load Tasks Installation Guide

## Option 1: GitHub Pages

1. Create a GitHub repository.
2. Upload all files from this folder, not the parent ZIP.
3. Make sure `index.html` is in the repo root or selected Pages folder.
4. Go to Settings, then Pages.
5. Choose the branch and folder.
6. Save.
7. Open the GitHub Pages URL.
8. Add to Home Screen from iPad or install from desktop browser.

## Option 2: Netlify

1. Go to Netlify.
2. Drag the unzipped Load Tasks folder into the deployment area.
3. Open the generated HTTPS link.
4. Install the PWA from the browser.

## Option 3: Vercel

1. Create a new Vercel project.
2. Upload or connect the folder.
3. Set the output directory to the folder containing `index.html`.
4. Deploy.
5. Open the HTTPS link and install.

## Option 4: Local test

1. Unzip the folder.
2. Open `index.html`.
3. Use only for visual checking.
4. Full install and offline behavior usually require HTTPS or localhost.

## Localhost test for developers

From the project folder, run one of these:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```
