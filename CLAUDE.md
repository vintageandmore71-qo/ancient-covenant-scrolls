# Project rules for Claude (read first, every session)

This repo is the user's offline-first iPad PWA suite: ACR Reader (root),
Load (`/load`), Attain (`/attain`), Attain Jr (`/attain-jr`), Study
(`/study`). User is dyslexic and works on iPad; tone should be plain,
short steps, never overpromise.

## ABSOLUTE LOCKED RULES — DO NOT VIOLATE EVER

These have been re-locked on 2026-05-04 after repeated violations.

1. **NO NARRATION DURING A BUILD.** When the user requests a multi-step
   build, do NOT send any text between tool calls. No "starting on X",
   no "now doing Y", no "almost done", no "about to push". Build
   silently. The user only sees one message: a single end-of-build
   summary AFTER the last commit is pushed. This rule overrides every
   other text-output instruction in this file or anywhere else. If you
   are about to type a sentence between tool calls, STOP and instead
   make the next tool call.
2. **NO FALSE POSITIVES.** Never claim something works without
   verification. Never say "fixed" until pushed and the user has
   confirmed.
3. **NO EMOJIS.** Anywhere. Code, comments, commits, UI strings, chat.
4. **NO EXTERNAL PRODUCT NAMES** in user-facing labels (no "VN", "Glam
   AI", "CapCut", "Runway", "Tubi" used as descriptors, etc.).
5. **CACHE STRINGS GO FORWARD ONLY** — never decrement.
6. **SHIPPING PUSH FLOW.** Pages serves from `main`, but direct push
   to `main` is blocked (non-fast-forward after squash merges, and
   may also be blocked by Rulesets). On every shipping commit:
   a. Push to the feature branch (`git push -u origin <branch>`).
   b. Open or update a PR from the feature branch into `main` using
      the GitHub MCP tools (`mcp__github__list_pull_requests` to
      check for an open one, `mcp__github__create_pull_request` if
      none exists).
   c. Enable PR auto-merge via `mcp__github__enable_pr_auto_merge`
      (squash) so it lands as soon as required checks pass.
   d. Tell the user the PR number + URL, the list of files changed,
      the risk level, and whether the change touches live code.
      Wait for the user to merge. **Do not call
      `mcp__github__merge_pull_request` unless rule 9 explicitly
      authorizes it for that PR.**
   Never attempt `git push origin <branch>:main` — it will fail.
   NEVER force push to `main`.
7. **SYNC FROM `origin/main` BEFORE EVERY PUSH.** Squash merges
   rewrite main's history, so any long-running feature branch goes
   stale within one merged PR. Before pushing the feature branch
   (and again before opening any PR), run:
   `git fetch origin main && git merge origin/main --no-edit`
   This is also the first thing to do at session start. If a direct
   push to `main` fails, fall back to the PR workflow in rule 6.
   Do not ship from a stale branch. Do not force push.
8. **DO NOT TOUCH ACR READER** (the root `/` app — files at repo
   root: `index.html`, `acr.css`, `sw.js`, etc., and the
   `content/` folder). Locked 2026-05-04 by user. Only edit if the
   user explicitly says "edit ACR reader" / "fix the reader" /
   names a root-app file. Otherwise leave the root untouched.
9. **NEVER DIRECTLY MERGE A PR WITHOUT EXPLICIT PER-PR APPROVAL.**
   Locked 2026-05-10 by user after a self-merge incident.
   "Zero clicks for the user" is NOT more important than safety.
   - For PRs that touch live site code, service worker, AI tools,
     provider routing, export, security, package validation, or
     deployment logic: **no direct merge ever.** Required-check
     gating is preferred. Report changed files, explain risk
     level, and wait for the user to merge.
   - For PRs that only touch low-risk documentation / status
     pages: still no default direct merge. State the files
     changed, the risk level, whether it affects live code, and
     ask before considering a direct merge. Only proceed if the
     user replies with explicit approval for that specific PR.
   - The real fix for unattended landing is a required CI check
     so auto-merge has a gate to wait on. Direct self-merge by
     Claude is not a substitute and is not the long-term fix.

These are LOCKED. They take precedence over politeness, helpfulness,
acknowledgements, "thinking out loud", or any pattern from earlier in
training. Treat them as hard constraints, not preferences.

## Preferred shipping workflow

This is the default shipping flow. Follow it unless the user explicitly
overrides it for a specific build.

- At the start of every session, fetch and sync from `origin/main`
  (`git fetch origin main && git merge origin/main --no-edit`).
- Before every PR, fetch and sync from `origin/main` again.
- Do not ship from stale branches.
- After a PR is squash-merged, treat that feature branch as finished.
- For each new logical shipping unit, prefer a fresh branch from the
  latest `origin/main` (e.g. `claude/study-v81`, not a long-running
  catch-all branch).
- Never force push to `main`.
- If direct push to `main` fails, use the PR workflow in locked rule 6.
- Do not claim live completion until GitHub Pages confirms the new
  version / cache marker on iPad.

## Session continuity (mandatory)

1. **At session start**, read these files in order:
   - `SESSION_NOTES_*.md` (most recent date wins) — current state, blocking
     questions, pending features
   - `HANDOFF.md` — long-running architectural state
   - `MASTER_BACKLOG.md` — single source of truth for what's done vs.
     left across every site (ACR, Load, LoadStudio, LoadPlay, Attain,
     Attain Jr, Study). The user's lock-rule: nothing they've asked
     for should fall off the list.
   - `SUGGESTIONS_PARKED.md` — exploratory ideas the user asked me to
     hold. **If today's date is on or after the "review by" date in
     that file, surface those suggestions to the user.**
   - `git log --oneline -30` — recent commit detail
   Do NOT ask the user to re-explain context that's in those files.

2. **At session end (or whenever the user says goodnight / signs off /
   asks to wrap up)**, write a session log:
   - Filename: `SESSION_NOTES_<YYYY-MM-DD>.md` at repo root
   - Sections (always include all of these, even if short):
     - Current state (latest commit hash, branch, anything uncommitted)
     - Built today (chronological, one bullet per shipped feature/fix)
     - Outstanding / blocking (what the user needs to verify or decide)
     - Pending / parked (features deferred, with WHY they're parked)
     - Capability gaps in this session (e.g. blocked hosts, missing MCP
       tools) so the next session doesn't waste time rediscovering them
     - Today's commit log (oneline list)
   - Commit + push the notes file in the same wrap-up turn
   - Don't wait for the user to ask. Logging happens automatically.

3. **Mid-session checkpoints**: if a single feature spans many commits,
   update the in-progress section of the day's `SESSION_NOTES` instead of
   waiting for the end. The user has lost work to "where are we"
   confusion before. Bias toward over-logging.

## Stable-state backups (mandatory)

Every session that ships at least one feature/fix verified working by
the user MUST end by creating a backup branch on the remote so the
working state is recoverable forever:

- Branch name: `backup/<YYYY-MM-DD>-<lastCacheVersion>` (e.g.
  `backup/2026-04-28-v17cs`). If the day already has a backup, append
  the cache version of the *new* tip — never overwrite a previous
  backup branch.
- Point it at the current `main` HEAD after the last verified-working
  commit, NOT at unstable WIP.
- Push it: `git push -u origin backup/<name>`.
- Mention the new backup branch name + SHA in `SESSION_NOTES_*.md`
  under a "Backups" subsection so future sessions can find it.

Mid-session, also create a fresh backup any time the user explicitly
confirms something is working ("perfect", "that fixed it", "working
right now") — these are the stable points worth preserving. Don't ask
permission for backup-branch creation; new refs are non-destructive.

Recovery is `git checkout backup/<name>` — surface this in session
notes any time you make a backup so the user knows the magic words.

## Cache version discipline

Every Load build that ships JS/HTML/CSS edits must bump:
- `load/sw.js` — `var CACHE = 'load-vXXY'` (alpha-incremented)
- `load/load.js` — the on-screen badge `<span id="ve-version">vXXY</span>`

Same pattern for ACR (`sw.js` `acr-vNN`), Attain (`attain-vNN`), Attain Jr
(`attainjr-vNN`), Study (`acr-study-vNN`). Skipping the bump = users
serve stale cached code.

## Reverts must NEVER lose verified-working features (mandatory)

Per user direction 2026-04-30, after a session where a revert wiped
shipped work. **Surgical revert only — never blanket revert.**

When a recently-shipped feature is broken and we need to roll back:

1. **Identify the broken commit precisely.** `git log` + `git diff` to
   pin the exact file(s) + function(s) that broke. Don't assume the
   whole tree is bad.

2. **Revert ONLY the broken file(s) or function(s).** Use
   `git checkout <good-sha> -- <specific files>` not a wholesale
   `git reset --hard`. Verified-working features in OTHER files stay.

3. **If the bad change touched a shared file:**
   - Cherry-pick or hand-port the un-broken parts forward
   - Use `git diff <good-sha>..<bad-sha> -- <file>` to see exactly
     what changed; reverse only the breaking hunks

4. **Before touching `main`, list the verified-working features
   between the target version and current HEAD.** Source: rows in
   `VERIFIED_LOG.md` with status "✓ verified". Each one must either
   survive the revert or be re-applied on top — they cannot be
   silently dropped.

5. **Cache strings must always go FORWARD, never backward.** Lower
   cache numbers (e.g. v17e4 → v17e0) can leave iOS Safari with the
   broken old SW still active. Always bump past the highest version
   ever shipped.

6. **Document the revert in `VERIFIED_LOG.md`** with: what was
   reverted, what was preserved, why the surgical approach was used,
   and the recovery commands.

7. **If a full-tree revert is genuinely the only option**, FIRST
   create a `pre-revert-<date>-<version>` branch on the current HEAD
   so nothing is permanently lost — then revert main.

The cost of a careful surgical revert is minutes. The cost of
silently dropping shipped work is days of re-building features the
user already verified.

## Verification before pushing "fix" claims

The user has explicit rules from past frustration:
- **No more guessing.** Every factual claim about state — version
  number, commit hash, file contents, deployed URL, working/broken
  status — must come from a tool call (Read, Bash, MCP) or from text
  the user wrote in this session. Don't infer from commit titles or
  memory; verify against the actual file. If you can't, say "I don't
  know" and run the check.
- **No "try a refresh" or "clear Safari data" advice unless I can prove
  the deployed file is the broken one.** Cache is a guess until proven.
- Never repeat or slightly modify a fix that already failed. Find a
  different cause or ask for the file.
- When unsure, STOP and ask. Don't iterate.

## Sandbox / network gaps to remember

Each session's network policy is set at start; can't change mid-session.
What's typically blocked:
- `dssorit.github.io` (live Pages URL) — can't fetch directly
- `api.github.com/repos/.../pages` — can't read Pages config

What works:
- `raw.githubusercontent.com/DssOrit/ancient-covenant-scrolls/...` —
  use this to verify what's on `main` HEAD
- Git push (always works)
- GitHub MCP (`get_file_contents`, `list_commits`, `get_commit`) — same
  data as raw URL, useful for confirming branch state

If the user reports a deployed-page bug and I can't reach the live URL,
ask them to open `https://dssorit.github.io/ancient-covenant-scrolls/sw.js`
and report the `CACHE = '...'` value. That single line tells us whether
Pages is current or stale.

## User preferences (from prior sessions)

- Doesn't like Groq — suggest OpenRouter / Hugging Face if a second AI
  provider is needed
- Dyslexia-friendly: short steps, one thing at a time, no walls of text
- Load's tagline is "work offline" — every feature respects that;
  hosting is last-resort fallback, not a default
- iPad is the primary device; design and test for iPad Safari first
- **No emoji icons. Ever.** No emojis in code, comments, commit
  messages, UI strings, or chat output. SVG icons or plain text only.
- **No progress narration during builds.** When the user has asked
  for a multi-step build, don't send "doing X next", "now working on
  Y", "almost done". Build silently and share a single end-of-build
  results message. Don't open the response with what was just done;
  lead with the result.
- **Pages serves from `main`.** Pushes to `claude/<branch>` are
  invisible to the deployed site until `main` is fast-forwarded
  (`git push origin <branch>:main`). Do both on every shipping push.
- **Never reference other sites' product names** in user-facing
  labels, descriptions, comments, or commit messages — no "VN",
  "Glam AI", "CapCut", "Runway", or any other external product name
  used as a description or comparison. Use neutral, internally-
  meaningful names ("Visual Editor", "Scene Composer", etc.).
  Internal identifiers (data-section ids, feature keys) may keep
  short codes but the visible label must never reference an outside
  product.
