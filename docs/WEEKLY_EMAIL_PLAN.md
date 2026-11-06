# Weekly email: plan

Status: **planned**. We build it after the impact work (8.13.0 and the personal impact release) is live on production.

## What it is

Once a week, on Sunday morning India time, WIOF sends one short, calm email. Its job is to bring people back gently, by curiosity, never by pressure. If there's nothing new that week, it isn't sent.

| Section | Everyone who subscribed | Signed-in members who turned it on |
|---|---|---|
| Story of the week | ✓ the most-read or newest story | ✓ one picked for them (Next for you) |
| Coming up this week | ✓ 2–3 calendar days, each with its "Did you know?" | ✓ |
| Your action | | ✓ "Did you try *Take a Shorter Shower*?" with a link to mark it done |
| Your impact | | ✓ "This week you saved about 40 L of water" (once personal impact is live) |
| Together | ✓ "This month WIOF members saved about 12,000 L" (only above 20 members) | ✓ |
| One-click unsubscribe | ✓ | ✓ |

## Why it's built this way

- **Automatic, with a safety net.** A scheduled Cloud Function builds every email from data we already have. Nobody has to write anything each week. Admins can preview it, send a test to themselves, and pause sending at any time.
- **Consent first.**
  - Newsletter subscribers have already opted in.
  - Members get a **"Weekly email" switch in Settings, off by default**.
  - Every email has a one-click unsubscribe link.
- **It reaches the inbox.** Gmail and Yahoo require bulk senders to authenticate their domain (SPF, DKIM, DMARC) and offer one-click unsubscribe. Without these, emails go to spam.
- **Small and cheap.** At our size, a free tier is enough.

## What it fixes today

The newsletter sign-up stores names and emails in the `Subscriptions` collection, but:
- **nothing ever sends to them**;
- **there's no unsubscribe**, although the privacy policy says there is.

This plan closes both gaps.

## Your steps (before we build)

1. **Choose the email service.** My recommendation is **Brevo** (free for 300 emails a day) or **Resend** (free for 3,000 a month). Both handle personal content well.
   - Brevo: also good if admins later want to send one-off campaigns from its dashboard.
   - Resend: simpler, developer-first.
2. **Create the account** with a WIOF team email (not a personal one). Turn on two-factor sign-in.
3. **Choose the sender address**, e.g. `hello@worldisonefamily.com`. It needs to be a real inbox that someone reads, because people reply. This can also be the **privacy contact email** that the privacy policy still needs.
4. **Add the DNS records** the service shows you (SPF, DKIM and DMARC) wherever `worldisonefamily.com` is managed (GoDaddy, Cloudflare, Google Domains, etc.). I'll go through them with you. It's three or four copy-and-paste records, and they can take up to a day to take effect.
5. **Create an API key** in the service, and **send it to me privately**, not in chat or git. I'll show you how to store it as a Firebase secret, so it never appears in the code.
6. **Decide two things:**
   - the day and time (my suggestion: **Sunday 9:00 IST**);
   - who checks the first real email before it goes out (I suggest one admin, for the first 2–3 weeks).

## What I'll build

1. **Settings → "Weekly email"** switch for members (off by default), stored on the profile, and allowed by the security rules.
2. **Unsubscribe**: a signed link in every email that works without signing in. It turns the email off for members, or marks a newsletter subscriber as unsubscribed. The unsubscribe header lets Gmail show its own "Unsubscribe" button.
3. **`buildWeeklyEmail`**: a scheduled Cloud Function that:
   - picks the content (story of the week, upcoming days, community total);
   - adds the personal parts for members (started action, their impact);
   - skips anyone who unsubscribed, and skips the week if nothing is new;
   - sends through the service's API in small batches, and logs each send, so nobody gets two copies.
4. **Admin → Email**: preview this week's email, "Send a test to me", a pause switch, and the last few sends with counts.
5. **The email template**: in the WIOF style (Ivory, Teal, Aleo headings), easy to read on a phone, with a plain-text version.
6. **Privacy policy update**: what we send, how often, and how to stop.
7. **Tests**: unit tests for content selection and unsubscribe; a staging run that sends only to the test accounts.

## How we'll roll it out

1. **Staging:** emails go only to the team's test inboxes, with a "[STAGING]" prefix in the subject.
2. **Production, admins only, for 1–2 weeks:** check how it looks in Gmail, Outlook and phones, and whether it lands in spam.
3. **Production, newsletter subscribers:** one send, then watch unsubscribes and spam reports in the service's dashboard.
4. **Members:** announce the Settings switch (for example, a line in the welcome-back panel).

## How we'll know it's working

- In the service's dashboard: open rate, clicks and unsubscribes. A healthy weekly newsletter typically sees opens of 30% or more and unsubscribes under 0.5% per send.
- In Admin → Analytics: visits that come from the email. Links carry a tag such as `utm_source=weekly_email`, so GA shows them.
- Most important: **people who come back within 7 days**, measured by the planned "Coming back" section.

## Costs

- Free at our size: Brevo up to 300 emails a day; Resend up to 3,000 a month.
- If we grow past that, about **US$10–20 a month** for tens of thousands of emails.
