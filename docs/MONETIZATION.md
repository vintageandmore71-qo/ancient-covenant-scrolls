# Monetization paths for Attain and Attain Jr

Reference doc for future-you. Answers the question: "OK, I'm ready to
sell this — what are my options?"

Written assuming the Attain / Attain Jr code has been moved to a
**private repo** on a different GitHub account and deployed to a free
host (Netlify / Cloudflare / Vercel) — see `HANDOFF.md` TASK A.

---

## Three realistic distribution models

Pick one. You can switch later, but starting with one keeps focus.

### Model A — App Store (iOS + Android) via Capacitor

**What it is:** Wrap the PWA in a native shell, submit to Apple's App
Store and Google Play. Users buy or subscribe through the stores.

**Pros:**
- Familiar, trusted purchase flow for parents and educators
- Apple handles DRM, piracy, chargebacks, refunds
- Users discover you via App Store search
- Works offline natively (users expect this from installed apps)

**Cons:**
- **Apple developer account: $99/year.** Required.
- **Google Play one-time fee: $25** (single payment, lifetime).
- Apple takes **30% of revenue** (15% after the first year of a
  subscription).
- App Review can reject you for unclear reasons; timeline 24 hours to
  2 weeks.
- Every update goes through review again.

**Execution path:**
1. Install Capacitor: `npm init @capacitor/app`
2. Copy the built PWA (`dist/attain/`) into the Capacitor www folder.
3. Configure `capacitor.config.ts` with app ID, name, icon.
4. Build iOS: `npx cap add ios`, open in Xcode, archive, submit.
5. Build Android: `npx cap add android`, open Android Studio, sign
   APK/AAB, submit to Play Console.
6. Set pricing in each store's console (one-time or subscription).
7. Submit for review.

**Revenue:** A $10 one-time purchase nets ~$7 after Apple's cut.

**Best for:** Polished, education-focused apps where parents/schools
are the buyer.

---

### Model B — Paid web subscription with Stripe

**What it is:** Keep the PWA on a web host, put a login + paywall in
front of it. Users subscribe via Stripe; successful payment unlocks
the app for their account.

**Pros:**
- **Keep all revenue minus Stripe fees** (~2.9% + $0.30 per
  transaction).
- Ship updates instantly (no App Review wait).
- Users can access from any device with a browser.
- Free tier or trial is easy to offer.

**Cons:**
- You need to build or adopt an auth system (email/password +
  password reset + account management).
- Requires a small backend — Stripe webhooks need a server to verify
  subscription status. Options:
  - Cloudflare Workers (free tier) + KV store for user state
  - Netlify Functions (free tier) + Fauna / Supabase
  - Firebase Auth + Firestore (free tier; be aware of Firebase's
    free-stack-violation risk — see `study/BUILD_PLAN.md`)
- Users don't expect to pay for "a website" the same way they pay for
  "an app" — conversion can be lower.

**Execution path:**
1. Create a Stripe account (free).
2. Create a Product in Stripe dashboard (e.g., "Attain Pro — $4.99/
   month" or "Attain Lifetime — $24.99 one-time").
3. Copy the Stripe-hosted Checkout link (Payment Links are the
   simplest MVP — no code needed).
4. In Attain, gate the app behind a sign-in screen.
5. On successful Stripe payment, Stripe redirects back with a
   session ID. Your backend verifies the session and marks the user
   as paid.
6. On subsequent visits, check the paid-status from your backend.

**Revenue:** A $5/month subscription nets ~$4.55 per user per month.

**Best for:** Users who want cross-device access, or if you want to
iterate fast without App Review friction.

---

### Model C — Bulk educator / school licensing

**What it is:** Sell access in bulk (classroom, school, district)
directly to institutions. Larger deal sizes, slower sales cycle.

**Pros:**
- Higher revenue per sale (a 30-student classroom license at $300
  = $10/student but one transaction).
- Schools have budgets for accessibility / dyslexia tools.
- Builds predictable recurring revenue via annual licenses.
- Marketing channel: educator conferences, accessibility blogs.

**Cons:**
- Long sales cycle (weeks to months per deal).
- May need invoicing, purchase orders, W9s — more admin.
- Often requires demo calls, trials, references.
- Schools may require accessibility audits (WCAG compliance — Attain
  is well-positioned here given the dyslexia focus).

**Execution path:**
1. Build a simple landing page (e.g., `attainapp.com/educators`).
2. Offer a free 30-day classroom trial behind an email form.
3. Price tiers:
   - Classroom (up to 30 students): $X/year
   - School (up to 500 students): $Y/year
   - District: Contact for quote
4. Invoice via Stripe or direct bank transfer.
5. Use short-lived access codes or login credentials for licensed
   users.

**Best for:** Once you have a polished product and 1-2 happy early
customers to reference.

---

## Combo: start with one, add others later

Realistic ramp for a one-person indie:

1. **Month 0-3:** finish the product, get 20 beta testers for free via
   email / dyslexia communities / iPad Safari testing.
2. **Month 3-6:** Model A (App Store) first. Fastest path to
   revenue. One-time price ($5-$10) to remove subscription friction
   for first-time buyers.
3. **Month 6-12:** Add Model B (web subscription) for power users who
   want cross-device. Your App Store app continues selling.
4. **Month 12+:** Model C (school licensing) once you have proof of
   adoption — demo calls become easier when you can show "500 parents
   have purchased this."

---

## Pricing reference points (competitor research)

- **ModMath** (iPad math for dyslexia): free tier, $10 one-time unlock.
- **Natural Reader** (text-to-speech for dyslexia): $10/month web;
  $60 one-time desktop.
- **OpenDyslexic font apps**: $3-$5 one-time on App Store.
- **Learning Ally** (audiobook service for learning disabilities):
  $135/year.

Attain sits in the "accessible study + reading" niche. Mid-market
educational tools price points are typically:
- One-time: $5-$25
- Subscription: $3-$10/month
- Bulk school: $3-$8 per student per year

---

## Legal / admin things to set up before first sale

- [ ] **Business entity** (sole proprietorship is fine at start; LLC
  costs ~$100-500 depending on state, protects personal assets).
- [ ] **Separate bank account** for Attain revenue.
- [ ] **Simple Terms of Service + Privacy Policy** on the website
  (free templates: Termly, iubenda).
- [ ] **Trademark "Attain"** if commercially viable (~$250 USPTO
  filing — optional but helpful if a knockoff appears).
- [ ] **Tax setup:** track revenue + expenses. Stripe and Apple will
  1099 you at year-end if you cross their thresholds.
- [ ] **Accessibility compliance statement** on the website. Given
  Attain's dyslexia focus, publishing a WCAG 2.1 AA compliance
  statement is a trust signal for school buyers.

---

## Copyright and intellectual property

- Copyright on the code is automatic the moment it's written. The
  `LICENSE` file + copyright headers already in the repo are sufficient
  to assert ownership.
- For **trademark on the word "Attain"** specifically (hard — it's a
  common word), you might trademark the logo and specific product name
  like "Attain Reader" or "Attain Jr" instead of bare "Attain." A
  trademark attorney is $200-500 for a filing consult.
- For **Attain Jr** (child-focused version):
  - Consider COPPA compliance (US law for apps targeting under-13).
  - No tracking, no ads, no data collection = easy COPPA compliance.
  - Publish a clear Privacy Policy for parents.

---

## When to do what

| Phase | Do | Don't |
|---|---|---|
| Still in public repo testing | Use `PROTECTION_GUIDE.md` tier 1 steps | Don't market the app yet |
| Ready to share with early users | Move to private repo + Netlify (TASK A) | Don't skip the 2FA step |
| Getting first paying customers | Pick Model A or B. Start with one price. | Don't offer too many pricing tiers |
| Scaling past 100 users | Add the other model; hire an attorney for a trademark filing if still growing | Don't over-engineer the auth system |
| School/district deals | Model C — build a proper landing page with demo video | Don't try to compete on price with free apps |

---

## Follow-up execution tasks for future sessions

When ready to execute, the order is:

1. **TASK A** (HANDOFF.md) — private repo + Netlify migration
2. **Minify pipeline** — use `tools/minify.mjs` on every production build
3. **Capacitor wrap** — new task, can be added to HANDOFF.md when needed
4. **Stripe payment link** — small change to the PWA's entry screen
5. **Landing page** — separate repo/site for marketing

None of these are urgent until you're within a few months of launch.
