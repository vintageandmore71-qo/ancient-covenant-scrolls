# inbox/

Drop ZIPs, files, or anything you want Claude to look at here.

## How to upload from iPad

1. On GitHub: open the `inbox` folder
2. Tap **Add file** → **Upload files**
3. Drop the file in
4. Tap **Commit changes**

Then tell Claude: "I uploaded `<filename>` to inbox/" and Claude will fetch
it from `raw.githubusercontent.com`, unzip if needed, and read the contents.

## What works

- ZIPs (any size up to ~100 MB ideally)
- Plain text, HTML, JSON, CSS, JS, Markdown — Claude can read them directly
- PDFs and images — Claude can read them
- Audio / video — Claude can confirm size and type but can't "play" them

## Cleanup

This folder is auxiliary; nothing in `/load`, `/attain`, ACR, etc. uses it.
Safe to delete files here once Claude is done with them.
