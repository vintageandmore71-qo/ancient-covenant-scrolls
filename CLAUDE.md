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

## Cache version discipline

Every Load build that ships JS/HTML/CSS edits must bump:
- `load/sw.js` — `var CACHE = 'load-vXXY'` (alpha-incremented)
- `load/load.js` — the on-screen badge `<span id="ve-version">vXXY</span>`

Same pattern for ACR (`sw.js` `acr-vNN`), Attain (`attain-vNN`), Attain Jr
(`attainjr-vNN`), Study (`acr-study-vNN`). Skipping the bump = users
serve stale cached code.

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
