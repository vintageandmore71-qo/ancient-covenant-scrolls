# GitHub Account Hardening — step-by-step for iPad Safari

Two free protections that prevent the realistic attack vectors on an
unpopular public repo: account takeover, and accidental force-pushes
rewriting history.

---

## EASIEST PATH (accessibility-friendly — 2 taps each, no typing)

If the full walkthrough below is too much, do just these two things.
Both use Face ID — no codes, no apps, no typing.

### Tap 1 — Add a passkey to lock your account

1. On iPad Safari, tap this link: **`https://github.com/settings/passkeys`**
2. Tap **Add a passkey** → confirm with Face ID.

That's it. Face ID is now required to sign in. Anyone who learns
your password still can't get in. Passkeys are phishing-proof.

*(A passkey counts as 2FA. You do NOT need the authenticator-app
steps below if you do this.)*

### Tap 2 — Lock the `main` branch so nothing can corrupt it

1. On iPad Safari, tap this link:
   **`https://github.com/dssorit/ancient-covenant-scrolls/settings/branches`**
2. Tap **Add classic branch protection rule** (or **Add branch ruleset**).
3. In the pattern box, type: `main`
4. Check these three boxes (scroll if needed):
   - Restrict deletions
   - Require linear history
   - Block force pushes
5. Scroll down and tap **Create** (or **Save changes**).

That's it. No one — not even you by accident — can rewrite or
delete `main` anymore. If a push tries to rewrite history, GitHub
silently rejects it.

### What this session already did for you automatically

- **Safety backup branch** `safety/stable-2026-04-22` is on GitHub
  pointing at the current stable state. If anything ever goes wrong
  with `main`, you (or a future Claude session) can recover to this
  exact commit.
- **Secret scan** of the entire codebase — clean. No API keys,
  tokens, or credentials leaked.
- **LICENSE + copyright headers** on every source file. Legal
  recourse if someone copies the code.
- **No Netlify, no analytics, no tracking, no paid services** in
  the stack. Nothing to compromise or leak.

You genuinely only need the two taps above. Everything else is
optional.

---

## 1. Enable 2FA (two-factor authentication)

Without 2FA, anyone who learns or guesses your GitHub password can sign
in, push commits, delete branches, rename the repo, or transfer it to
themselves. 2FA adds a second check that stops all of those.

### Steps on iPad Safari

1. Go to `https://github.com`, sign in to your `dssorit` account.
2. Tap the avatar (top-right) → **Settings**.
3. In the left-side menu (scroll if you don't see it), tap **Password and authentication**.
4. Scroll to the **Two-factor authentication** section → tap **Enable two-factor authentication**.
5. GitHub offers several methods. Recommended:
   - **Authenticator app** (safest): install any TOTP app — Google Authenticator, Authy, 1Password, iOS built-in Passwords app all work. Scan the QR code GitHub shows. Enter the 6-digit code the app gives you. Done.
   - **SMS** (simpler but less secure): enter your phone number, get a text, enter the code. Still much better than no 2FA.
6. GitHub will show **recovery codes**. **Save them.** Screenshot or copy to a password manager. If you lose your phone, these are how you get back in.
7. Done. Next time you sign in, GitHub will ask for your password AND a 6-digit code.

### Verify it worked
Sign out of GitHub and sign back in. You should be prompted for the second factor. If not, 2FA isn't on.

### Optional: add a passkey too (extra step, even safer)
Same settings page → **Passkeys** → **Add a passkey** → use Face ID or Touch ID. After this, iPad can sign you in without needing a password at all — and phishing sites can't steal passkeys the way they can passwords.

---

## 2. Enable branch protection on `main`

Prevents force-pushes or branch deletion from silently rewriting history — even if someone (including future-you, by accident) runs the wrong command.

### Steps on iPad Safari

1. Go to `https://github.com/dssorit/ancient-covenant-scrolls`.
2. Tap **Settings** (top of the repo — you may need to scroll the tabs horizontally to find it).
3. In the left-side menu, tap **Branches** (under "Code and automation").
4. Tap **Add branch ruleset** (or **Add classic branch protection rule** on older UI).
5. **Ruleset name:** `Protect main`.
6. **Enforcement status:** `Active`.
7. **Target branches:** tap **Add target** → **Include by pattern** → enter `main` → tap Add.
8. Scroll to **Branch rules** and check:
   - **Restrict deletions** (prevents anyone from deleting the branch)
   - **Require linear history** (prevents merge commits via the web UI that could tangle history)
   - **Block force pushes** (the big one — prevents history from being rewritten)
9. Scroll down and tap **Create** (or **Save**).

### Verify it worked
On the Branches settings page you should now see one active ruleset named **Protect main**. Try running `git push --force` from a terminal — it'll be rejected.

---

## 3. Make backups

### Cloud-less local backup (free)

Install the **Working Copy** app from the App Store (free tier).

1. Open Working Copy → tap `+` → **Clone repository**.
2. Paste: `https://github.com/dssorit/ancient-covenant-scrolls.git`.
3. Sign in to GitHub when prompted.
4. Done — a full copy of the repo is on your iPad's local storage. It does not go to iCloud by default.

Re-pull periodically to keep the copy fresh. If GitHub ever loses your repo, this copy restores it.

### Remote mirror backup (free, optional)

If you want a second cloud copy:

1. Create a new **private** repo on a **different** free GitHub account (or GitLab, or Bitbucket).
2. In Working Copy (or on a laptop), add that remote as `backup`:
   ```
   git remote add backup https://github.com/<other-account>/<repo>.git
   git push backup main
   ```
3. Every few weeks, run `git push backup main` again.

Now your code lives on three services. Unrealistic for all three to fail at once.

---

## 4. What NOT to do

- **Don't disable 2FA** even temporarily. If you lose your device, use a recovery code.
- **Don't share your recovery codes.** They bypass 2FA.
- **Don't add collaborators to the repo** unless you trust them with full write access. GitHub's "read-only" option requires paid plan levels above free.
- **Don't paste personal-access tokens into chat / docs / commit messages.** They're passwords.
- **Don't force-push to main** even if branch protection blocks it — if protection isn't active yet, you could rewrite history.

---

## If something goes wrong

- **Locked out of GitHub account:** use a recovery code from step 1.6.
- **Recovery codes also lost:** contact GitHub support (`https://support.github.com`). They can verify identity through the email on file.
- **Accidentally pushed something sensitive:** delete the commit, force-push to overwrite. If branch protection is on, you'll need to temporarily disable it. Remember: once public, assume it was scraped — rotate any exposed secrets.

---

## After this is done

- Tier 1 from `PROTECTION_GUIDE.md` is complete.
- Move on to Tier 2 (private repo + Cloudflare Pages) whenever you're getting close to launch.
- See `HANDOFF.md` TASK A for the Attain-split execution plan.
