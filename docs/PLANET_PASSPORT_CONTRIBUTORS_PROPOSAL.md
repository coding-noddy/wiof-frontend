# Contributor badges and claim links: proposal

**Status:** proposal (2026-11-21), waiting for approval. Nothing is built.

**Builds on:**
- design §3a "Contributor badges" (docs/PLANET_PASSPORT_DESIGN.md: the 8 badges, the wax seal, "Endorsements", granting, claim links, agreed 2026-11-19);
- decisions D6 and D7 (docs/PLANET_PASSPORT_V1_PROPOSAL.md);
- Admin → Passport (docs/PLANET_PASSPORT_ADMIN_PROPOSAL.md, built).

**Governs:** docs/roadmap/WIOF_Planet_Passport_Production_Implementation_Contract_v1.md §6 and §9.

## 1. Objective

WIOF can thank the people who contribute to it (writers, Coffee Conversations guests, workshop hosts, volunteers, supporters, advocates, partners, the team) with a badge in their Planet Passport. An admin grants it, and the member sees the admin's reason. People without an account get a one-time link, which they claim after signing up.

## 2. Audit: what exists today

| Need | Today | Gap |
|---|---|---|
| Definitions | `passport_stamp_defs`, changed only through `savePassportStamp` (versions, audit) | No `contributor` family, no `seal` shape, no "granted" rule |
| Records | `passport_stamps/{uid}_{stampId}`: server-only, created once | No grant fields (reason, count, revoked) |
| Evaluator | `evaluate()` awards from counts, and skips challenges | Must skip contributor badges too (never awarded from counts) |
| New-badge moment | Any page, using `users.passportSeenAt` | Works as is for a granted badge |
| Booklet | Covers, milestones, journey, element and challenge pages, plus the detail sheet | No "Endorsements" page |
| Admin | Badge map, form, history | No way to grant to a member, no claim links |
| Finding a member | Admin → Users (list and search, admin-only) | Reused to pick the member |
| Passport issue | Only with Earthrise (D5) | Exception for a claim link (D7) |

## 3. What gets built

### 3.1 Definitions: a fourth family
- A new family, `contributor`: shape `seal` (an embossed wax seal), rule `{ type: 'granted' }`.
- The 8 badges from design §3a are seeded like the rest (catalogue v4): Storyteller, Fireside Voice, Lantern Bearer, Many Hands, Rainmaker, Pollinator, Kindred Roots, Heartwood.
- Admins edit their name and meaning, add new contributor badges and retire them in the existing badge form ("Earned when: granted by an admin"). They are versioned and audited like every badge.
- The evaluator, the backfill and "would earn it now" skip this family.

### 3.2 Granting to a member (Admin → Passport → Contributors)
- The admin picks the member (search by name or email, as on Admin → Users), the badge, and:
  - a **reason** the member sees ("Thank you for your story *River of Glass*");
  - an optional **private note** (proof or context), for admins only.
- An admin-only callable, `grantPassportBadge`, checks the admin claim, then:
  - writes `passport_stamps/{uid}_{badgeId}` with `source: 'grant'`, `grantedBy`, `reason`, `count: 1`, and `earnedAt` on the server clock;
  - writes a log record, `passport_grants/{autoId}` (who, whom, which badge, the reason, the note, when), readable by admins only.
- **Granting again for the same badge** doesn't duplicate it. It adds 1 to `count` ("Storyteller · 4"), shows the latest reason, and logs the grant. The first date stays.
- **Revoking** is for this family only, and needs a reason. The record is marked `revoked` (with who and why) and logged. It isn't deleted, and it disappears from the member's booklet.
- **The member's Passport:**
  - Is the Passport already issued? The grant shows the new-badge moment on the member's next page.
  - Not issued yet (no Earthrise)? The grant is kept, and appears when the Passport is issued. This follows D5: the claim link is the only exception (D7).

### 3.3 Claim links, for people without an account
- **The admin creates a link** for a badge and a reason: `wiof.org/passport/claim/{token}`.
  - The token is 32 random bytes. Only its **SHA-256 hash** is stored, in `passport_claims/{hash}`, with the badge, the reason, `createdBy`, the expiry (30 days) and the status (open, claimed, cancelled, expired).
  - **No name or email of the guest is stored.**
- **The admin sends the link** themselves, by email or WhatsApp. Admin → Passport lists open links with "Copy link" and "Cancel". The plain link is shown only once, when it's created; after that only its badge, reason and status.
- **The guest opens the link:**
  - Signed out, they see the badge and the reason with "Sign up to claim your badge" (or "Sign in"). After signing up, they come back to the link, and it claims.
  - Signed in, it claims straight away.
- **Claiming** is a callable, `claimPassportBadge({ token })`. In one transaction it:
  - checks the link is open and not expired;
  - writes the badge (or adds 1 to `count`, as for a repeat grant);
  - **issues the Passport immediately** (D7), with `passport_holders.source: 'claim'`;
  - marks the link claimed by that uid, and logs the claim.
- **Using a link again**, or using an expired or cancelled one, gives a friendly message and changes nothing.
- **Guessing links:** with 256-bit tokens, guessing is not practical. Failed claims are still logged, for monitoring.

### 3.4 Members' side
- A new booklet page, **"Endorsements"** (after the stamp pages, like a real passport's endorsements page), holds the wax seals with the reason and the count.
- The page is shown only when the member has at least one. Contributor badges never appear as "not earned yet" outlines.
- The detail sheet shows: "Why: Thank you for your story *River of Glass*", and "Granted by WIOF on 21 November 2026". The admin's name is never shown to the member.
- Contributor badges can be shared as images, like any stamp.
- The share card and the moment say "Endorsed by WIOF".
- Contributor badges don't count towards any milestone.

## 4. Data and security

| Collection or field | Written by | Read by |
|---|---|---|
| `passport_stamps` (grant fields) | `grantPassportBadge`, `claimPassportBadge` | the owner, admins (as today) |
| `passport_grants` | the callables | admins only |
| `passport_claims` | the callables | admins only (the claim page reads through a callable, `peekPassportClaim`, which returns only the badge, the reason and whether the link can be used) |
| `passport_holders.source` | `claimPassportBadge` | as today |

- **No client writes** to any of these (rules `write: false`). The rules tests are extended to cover all of them.
- **The private note** is kept only in `passport_grants`, never on the member-readable stamp.
- **Reset and deletion:**
  - "Also clear my Passport" removes contributor badges too, since it's the member's data. An admin can grant them again. The admin log keeps the grant record, with the member's uid.
  - Account deletion, once it's built, must delete the stamps and remove the uid from `passport_grants`, keeping only the counts.

## 5. Scope and non-goals

**In:**
- the contributor family, the seal shape and the seeded 8 badges;
- grant, repeat grant and revoke, with the log;
- claim links (create, copy, cancel, expire, claim), with the sign-up return;
- the Endorsements page, the detail sheet, sharing and the moment;
- tests, and runbook and privacy-policy updates.

**Not in this release:**
- the public profile, including the per-badge "show publicly" choice and Rainmaker hidden by default (the next workstream);
- automatic grants, for example on publishing a blog. Admins grant by hand first;
- sending emails from WIOF;
- bulk grants (one member at a time; claim links one at a time).

## 6. Acceptance criteria

1. An admin grants Storyteller to a member with a reason. The member sees the moment, then the seal on Endorsements with the reason.
2. A second grant shows "· 2" and doesn't create a second record. Revoking hides it, and both actions are in the log.
3. A non-admin can't grant, revoke, create links or read the log or the links (rules + callable tests).
4. A guest opens a claim link, signs up, returns, and has the badge and an issued Passport without doing the first steps.
5. A claimed, cancelled or expired link changes nothing a second time.
6. Only the token's hash is stored. The guest's name or email appears nowhere except their own new account.
7. Contributor badges never come from the evaluator or the backfill, and don't count towards milestones.
8. All existing tests and the three staging Passport e2e suites still pass.

## 7. Tests

- **Functions:**
  - grant, repeat and revoke planning;
  - the token hash and expiry;
  - claim states (open, claimed, cancelled, expired, and an existing member claiming);
  - the evaluator skipping the contributor family.
- **Rules:** the new collections are closed to members; grant fields can't be written by a client.
- **Staging e2e:**
  - the admin grants to the test member, who sees the moment and the Endorsements page;
  - the admin creates a link, a temporary account claims it, and a second claim does nothing;
  - cancelling a link.
- **Manual QA:** the claim page signed out, signed in, on a phone, and with a screen reader.

## 8. Rollout and rollback

- **Rollout:**
  1. Deploy with backend.
  2. Sync the catalogue (v4: the 8 contributor badges).
  3. Admins start granting.
  4. Prod only with your approval, after staging QA.
- **Rollback:**
  - The awards switch doesn't cover grants: an admin simply stops granting.
  - A wrong grant is revoked.
  - A functions rollback disables the callables. Existing seals stay readable.

## 9. Size and risks

**Size:** large, about 8 commits (definitions, callables and log, claim links, claim page and sign-up return, Endorsements page, admin screens, tests, docs).

| Risk | Mitigation |
|---|---|
| A claim link is forwarded, and someone else claims it | Single-use, 30-day expiry, cancellable. The admin sees who claimed it and can revoke |
| A sign-up loses the link on the way | The token is kept in session storage through sign-up and onboarding, then claimed |
| An admin grants to the wrong member | Revoke with a reason; the log shows both |
| A guest's details are stored without consent | None stored: only the hash, the badge and the reason |

## 10. Decisions needed from you

1. **Repeat contributions:** one seal with a count ("Storyteller · 4"), as the design says. I recommend yes.
2. **"Also clear my Passport"** removes contributor badges too. I recommend yes: it's the member's choice, and an admin can grant them again.
3. **Who can grant and create links:** every admin, like publishing. I recommend yes; the log shows who did what.
4. **A grant to a member without Earthrise** waits until their Passport is issued (D5). Or should it issue the Passport, like a claim link? I recommend it waits, so D7 stays the only exception.
5. **Link expiry:** 30 days, as the design says?
