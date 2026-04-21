# Protection Guide — Attain + ACR repositories

A record of everything discussed about repo protection, encryption, and
monetisation of Attain / Attain Jr. Keep this file for reference.

---

## What can and can't happen to your files on a public GitHub repo

### Who can modify files in your repo

| Who | Can they change files? |
|---|---|
| Random visitors | ❌ No — read-only; can only fork, star, or open issues |
| Collaborators you invite (repo Settings → Collaborators) | ✅ Yes — full write access |
| Anyone who steals your GitHub password or a personal-access token | ✅ Yes — treated as you |
| GitHub (the company) | Technically yes, but they only act on legal orders (DMCA, court). Not randomly. |

**Key point:** random internet strangers CANNOT corrupt or modify your repo. A public repo is public to **read**, not public to write.

### What Git itself protects against

- Every commit is **cryptographically chained** to its parent. Any silent modification of a past commit invalidates every commit after it — an obvious tamper signal.
- **Force pushes** can overwrite history, but only by authorised writers (you or collaborators).
- The repo exists on **multiple machines** at once — GitHub's servers, any local clones, any fork. A deletion in one place doesn't erase it from others.

### Realistic corruption / theft risks and their mitigations

| Risk | Mitigation | Cost |
|---|---|---|
| Your GitHub password gets stolen | Enable 2FA | Free |
| Accidental force-push rewrites history | Branch protection rules | Free |
| Collaborator goes rogue | Don't add collaborators you don't trust | Free |
| GitHub loses your data (rare) | Keep local `git clone` backups | Free |
| You edit a file and break it | Snapshot hook (already installed) | Free |

---

## Why encryption doesn't protect your source code

JavaScript has to **run in the browser**. Browsers cannot execute encrypted code. Therefore the JS must be plaintext at the moment it's executed.

Any "encrypted app" scheme ends with both the decryption key AND the plaintext code in the browser at the same time, where anyone with DevTools can grab both.

This is a fundamental property of client-side code. No crypto technique changes it.

**Encryption CAN protect content** (chapter text, quiz JSON, images) from casual browsers and automated scrapers, because those files don't need to execute — the PWA can decrypt them on the fly and display them.

**Encryption CANNOT protect app code** (the JavaScript that makes Attain work). That needs to run.

---

## What does protect a sellable PWA

| Mechanism | Protection level | Cost |
|---|---|---|
| Private repo (GitHub) + **Netlify / Cloudflare Pages** free tier for hosting | Full — source is invisible to everyone except you | **Free** |
| GitHub Pro private-repo Pages | Full — same as above, stays on GitHub | $4/mo |
| Minify + obfuscate JS before deploy | Speed bump — makes casual copying harder, not impossible | Free |
| Copyright + LICENSE file | Legal recourse after theft | Free |
| Trademark your brand name (e.g. "Attain") | Brand protection, stops knock-offs using your name | ~$250 USPTO filing |
| App Store distribution (Capacitor-wrapped PWA) | Apple handles code-signing + payment + piracy prevention | $99/yr Apple dev account |
| Auth-gated paid hosting | Only paying users get the code | $0-20/mo depending on setup |

**For Attain specifically**, the realistic path is:
1. **Now (testing):** keep developing in the current public repo
2. **Before marketing/launching:** move to a **private GitHub repo** and host via Netlify / Cloudflare (free tier includes private-repo deploys)
3. **When selling:** wrap as a native app via **Capacitor** and distribute through the App Store, OR gate access behind a Stripe paywall on a web deployment

---

## The free tier protection plan (recommended order)

### Tier 1 — do today

1. **Enable 2FA** on your GitHub account (GitHub → Settings → Password and authentication → Two-factor authentication).
2. **Enable branch protection** on `main` (repo → Settings → Branches → Add rule). Require linear history, restrict deletions, disallow bypass.
3. **Add `LICENSE`** at repo root with "All Rights Reserved" wording.
4. **Add copyright headers** to each source file. Declares ownership; supports later legal claims.

### Tier 2 — before you announce or market Attain

1. Create a **new private GitHub repo** for Attain (and a separate one for Attain Jr, when that exists).
2. Migrate the `attain/` folder there (HANDOFF.md TASK A has the execution plan).
3. Connect the private repo to **Netlify** or **Cloudflare Pages** (both free, both support private repos). Get a free `yourapp.netlify.app` or `yourapp.pages.dev` URL.
4. Keep `dssorit/ancient-covenant-scrolls` as the public ACR content repo.

### Tier 3 — when you're ready to sell

1. **Minify + obfuscate** JS at build time (`esbuild --minify` is one line).
2. Pick a distribution model:
   - **App Store** via Capacitor ($99/yr Apple account) — users pay once or subscribe through Apple.
   - **Stripe payment links** on a web version — free Stripe account, 2.9% + $0.30 per transaction.
   - **Bulk educator licensing** — sell to schools directly, you set the price.

---

## Corruption protection — free actions right now

- **Snapshot hook** (already installed) zips the repo before any Edit/Write runs. Restore by unzipping a recent `.snapshots/pre-*.zip` if anything breaks locally.
- **Backup to iPad via Working Copy** — free app. Clone the repo to your device for an independent copy.
- **2FA + branch protection** — the only realistic attack vectors on an unpopular public repo.

---

## Content (separate from app code)

If you ever want to protect *content* (not app code) — e.g., a book you want to ship with Attain but only paying users should read — client-side AES-GCM encryption is a viable tool. Summary:

- Encrypt the content file locally with a passphrase
- Commit only the encrypted blob
- PWA prompts for the passphrase once and decrypts on load
- Stops automated scrapers, GitHub search, indexers, casual browsers
- Does NOT stop a developer willing to read your decrypt code and extract the key from localStorage

Trade-off applies to any DRM: you can raise the bar but not eliminate the risk.

---

## Bottom line — what to do and what not to do

| Do | Don't |
|---|---|
| Enable 2FA on GitHub | Rely on encryption to protect Attain source code (it can't) |
| Add LICENSE + copyright headers | Publish unreleased drafts to a public repo |
| Move to private repo + Netlify before marketing | Wait until you've already promoted the app to think about this |
| Keep local git-clone backups | Trust that GitHub will never lose your data |
| Enable branch protection on main | Add collaborators without strong 2FA themselves |

---

## Files prepped in this repo to support the plan

- `LICENSE` — All Rights Reserved wording (root)
- Copyright headers in `attain/*.js`, `attain/*.css`, `study/study.js`, `study/study.css`, `study/validate-questions.js`
- `docs/GITHUB_SETUP.md` — step-by-step iPad-Safari walkthrough for 2FA and branch protection
- `HANDOFF.md` TASK A — updated with free-private-hosting migration plan (Netlify / Cloudflare / Vercel)

This guide itself is `PROTECTION_GUIDE.md` at the repo root.

---

## Further reading / references

- GitHub Pages free vs Pro: https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages
- Netlify free tier limits: https://www.netlify.com/pricing/
- Cloudflare Pages free tier: https://pages.cloudflare.com/
- Capacitor (PWA → native): https://capacitorjs.com/
- Stripe pricing: https://stripe.com/pricing
- USPTO trademark search: https://tmsearch.uspto.gov/
