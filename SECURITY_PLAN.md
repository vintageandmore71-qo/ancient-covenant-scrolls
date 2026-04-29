# SECURITY PLAN — GitHub Public Repo Hardening

**Source:** user-uploaded `Load_GitHub_Security_Developer_Prompt.zip` (2026-04-29).

**Status:** **NOT YET RUN.** Recommend running before any public launch / App Store submission. Saved here so it's not lost.

**Inbox source file (safe to delete after this is committed):**
- `inbox/Load_GitHub_Security_Developer_Prompt.zip` — captured below

---

## Hard rules (apply to every step)

- Repo is **public** — treat everything inside as visible to the entire internet
- Do NOT break the app — no features removed, app still builds, app still runs
- Do NOT expose API keys / tokens / passwords / private URLs / admin bypasses / .env files / DB credentials / production secrets
- Do NOT pretend the repo is safe if public risks remain

---

## 12-task hardening checklist

### 1. Secret audit

Search the entire repo for:
- API keys, tokens, passwords, private URLs, admin passwords, admin bypass links
- `.env` files
- Firebase credentials, Supabase credentials
- OpenRouter keys, Hugging Face tokens, Cloudflare keys, Google/Gemini keys
- Puter-related secrets
- Any provider credentials
- Private user data
- Copyrighted paid assets
- Unreleased private business notes

**If any real secret found:**
- STOP and tell user exactly where it was found
- Remove from code, replace with placeholder
- Tell user the key MUST be revoked + regenerated
- Do NOT commit real secrets back

### 2. Update `.gitignore`

Block:
```
.env
.env.*
node_modules
build outputs
logs
cache files
local config files
keys
certificates
local databases
secret files
private credential files
```

Keep `.env.example` allowed.

### 3. Add `.env.example`

Placeholder values only. Example:

```
OPENROUTER_API_KEY=replace_with_server_side_secret_only
HUGGINGFACE_TOKEN=replace_with_server_side_secret_only
CLOUDFLARE_API_TOKEN=replace_with_server_side_secret_only
GEMINI_API_KEY=replace_with_server_side_secret_only
PUTER_ENABLED=true
POLLINATIONS_ENABLED=true
```

**Note:** if app uses VITE variables, remember those are VISIBLE in frontend builds. Never put private keys in VITE_*.

### 4. Move secrets out of frontend code

Inspect every provider call. If any API key or privileged call lives in browser/frontend code, move it behind a backend or serverless proxy.

**Preferred safe structure:**

```
Load PWA (public frontend)
    ↓
backend / serverless proxy
    ↓
private provider keys in env vars
    ↓
AI provider API
```

**Free / free-tier proxy options:**
- Cloudflare Workers
- Netlify Functions
- Vercel Serverless Functions
- Supabase Edge Functions
- Firebase Functions

### 5. Add GitHub security files

Add if missing:
- `SECURITY.md`
- `.github/pull_request_template.md`
- `.github/dependabot.yml`
- `.github/workflows/codeql.yml`
- `CODEOWNERS` (if appropriate)

### 6. `SECURITY.md` content

Must say:
- Do NOT report security problems in public issues — report privately
- Do NOT submit API keys / passwords / tokens / .env / private data / paid assets / production credentials
- Repo is public; must never contain secrets

### 7. PR template checklist

Each PR confirms:
- [ ] No API keys added
- [ ] No `.env` file added
- [ ] No provider keys exposed in frontend
- [ ] No private user data added
- [ ] No paid/copyrighted assets added without approval
- [ ] App still builds
- [ ] App still runs

### 8. Dependabot

`.github/dependabot.yml` for npm weekly updates.

### 9. CodeQL

GitHub Actions CodeQL scanning for JavaScript/TypeScript via `.github/workflows/codeql.yml`.

### 10. Branch protection (manual GitHub setting)

Instructions to give the user:
- Protect `main` branch
- No direct pushes to main
- Require PR before merge
- Require at least one review
- Require status checks
- Require conversation resolution
- Block force pushes
- Block branch deletion

### 11. Local scan instructions

Free local checks before pushing:
- `gitleaks` — leak scanner
- `trufflehog` — secret scanner
- `npm audit` / `pnpm audit` — dependency vulnerabilities

### 12. Final security report

After running steps 1-11, deliver:
- What was changed
- What files were added
- What secrets / risks were found
- What must be enabled MANUALLY in GitHub settings
- What should stay out of the public repo
- Whether any exposed key must be revoked
- Any remaining public-repo risks

---

## When to run this

Recommend **before** any of:
- App Store submission
- Public launch / press
- Inviting collaborators to the repo
- Deploying a backend that holds keys

Until then, current state is OK because:
- All API keys are user-supplied via Settings UI (stored in browser localStorage, not committed)
- No `.env` file exists in the repo
- No backend with secrets

## Quick pre-run audit (anyone can do this in 5 min)

Before the full 12-task run, do these grep checks to spot obvious leaks:

```bash
# Search for likely secret patterns in tracked files only
git grep -nE "sk-[a-zA-Z0-9]{20,}|hf_[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9_-]{35}|r8_[a-zA-Z0-9]{20,}"

# Search for .env files
git ls-files | grep -E "^\.env"

# Check for committed credentials in history
git log --all --diff-filter=A -- '.env*'
```

If those return nothing, the basic posture is OK.

## Cross-reference

This security work is independent of Image Prompt feature work. Can be run in a separate session as a one-shot pass. After running, mark complete by adding a "## DONE" line at the top with date + SHA.
