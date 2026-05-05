# Load Tasks Security Notes

Load Tasks is local-first. Project data is stored in this browser unless the user exports it.

## Rules

- Do not save GitHub tokens to localStorage.
- Use session-only token fields for optional direct GitHub push.
- Export a rollback ZIP before pushing to GitHub.
- Do not run arbitrary uploaded HTML as trusted code.
- Use validation, sandboxing, and CSP before publishing uploaded creator packages.
- Treat hidden redirects, credential forms, external scripts, and eval-like code as review-required risks.

## What Load Tasks can safely auto-fix

- Missing manifest file.
- Missing service worker file.
- Missing README.
- Missing security note.
- Some missing PWA metadata.

## What requires developer review

- Authentication.
- Payments.
- API provider calls.
- Nudity or profanity moderation.
- YouTube API compliance.
- Arbitrary HTML upload execution.
- GitHub OAuth or production repository access.
