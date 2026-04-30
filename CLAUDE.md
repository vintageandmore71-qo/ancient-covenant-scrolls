# Project rules for Claude (read first, every session)

This repo is the user's offline-first iPad PWA suite: ACR Reader (root),
Load (`/load`), Attain (`/attain`), Attain Jr (`/attain-jr`), Study
(`/study`). User is dyslexic and works on iPad; tone should be plain,
short steps, never overpromise.

## Session continuity (mandatory)

1. **At session start**, read these files in order:
   - `SESSION_NOTES_*.md` (most recent date wins) — current state, blocking
     questions, pending features
   - `HANDOFF.md` — long-running architectural state
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
