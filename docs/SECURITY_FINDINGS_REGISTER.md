# Security & Hardening Findings Register

The deliverable called for by Foundation Hardening Plan v4 §21.12 ("security
findings resolved/remaining register"). `PERMISSION_MATRIX.md` documents the
current state of every collection/path; `OPERATIONAL_MONITORING.md` documents
the logging setup. Neither tracks *history* — what was found, what fixed it,
what's still open. This does. Update it whenever a new issue is found or an
open item closes; don't let it drift into a second source of truth for
current rules — link to `PERMISSION_MATRIX.md` for that.

## Resolved

| # | Finding | Plan ref | Fix |
|---|---|---|---|
| 1 | Client could self-escalate to admin via a `role` field on its own `users/{uid}` doc | P0 §3.1 | Admins moved to a separate `admins/{uid}` collection; `isAdmin()` checks existence there, never a client-writable field |
| 2 | System-derived profile counters (loginCount, streaks, etc.) were client-writable | P0 §3.2 | Only Admin-SDK Cloud Functions (`createUserProfile`, `recordLoginMetrics`, `recordUserVisit`, `resetEngagementData`) write these; rules deny them on client `update` |
| 3 | Raw poll votes (email + IP) were publicly readable | P0 §3.3 | `Polls/{id}` read restricted to `isAdmin()`; public `poll_results/{id}` sanitized aggregate added, written only by the `onPollVoteCreated` trigger |
| 4 | Subscriber list was enumerable by public clients | P0 §3.4 | No client read path on `Subscriptions` at all; existence check goes through the `checkSubscriberExists` Cloud Function |
| 5 | Engagement reset wasn't reliable/idempotent/complete | P0 §5 | `resetEngagementData` Cloud Function — batched, safe to retry, zeroes `user_metrics` too (gap found and fixed during this session's own re-verification, not user-reported) |
| 6 | Activity/event writes could race and duplicate under concurrent requests | P1 §7 | Deterministic doc IDs + `allow update: if false` — a second write to the same key is atomically rejected, not just discouraged |
| 7 | Saved-content used query-then-delete, could duplicate | P1 §9 | Deterministic `{userId}_{contentId}` IDs; existence-check-then-set, direct delete |
| 8 | Dashboard re-scanned full `activity_log` on every load | P1 §12.1 | `user_metrics` materialized summary for tallies; detail history lists capped at 50 items |
| 9 | `resource == null` crash saving/removing a not-yet-saved favorite (live bug, user-reported) | — | Guarded in `firestore.rules`; 2 regression tests added |
| 10 | Existing users couldn't remove favorites saved under the pre-migration ID scheme (live bug, user-reported) | — | `scripts/migrate-saved-content-ids.js` run on staging |
| 11 | Guest poll votes silently failed whenever no email was entered (found 2026-09-06) | — | `polls-widget.component.ts` was assigning `poll.email = undefined` for emailless guests — the Firestore SDK rejects an explicit `undefined` field client-side, before rules even run. Now the field is omitted entirely instead of set to `undefined` |
| 12 | Product analytics didn't exist — only operational (function-failure) logging did | P1 §11 (half) | `AnalyticsService` added; wired into sign-up/login, content open/complete, EQ completion, poll vote, bookmarks |
| 13 | Third-party API keys in the client bundle were never formally classified | P0 §4.4 | Audited — `youtube_api_key`, `aqi_api_key`, `data_gov_api_key`, `usda_api_key` are all read-only public-data lookups, not server secrets; no code change needed, only a console-side check that the YouTube key is referrer-restricted |

## Open / deferred (by decision, not oversight)

| # | Item | Plan ref | Status |
|---|---|---|---|
| 1 | App Check | P0 §4.3 | Blocked on a reCAPTCHA site key from Firebase Console (manual, user-side); sequenced after Brand Alignment by explicit agreement (2026-09-06) |
| 2 | Rules tests not wired into a CI pipeline | P1 §10 / Definition of Done | Deferred by explicit decision — deploys already gate on `npm run test:rules` via npm `predeploy` hooks, which covers the actual risk (a bad rules change reaching staging/prod) even without a PR-time check |
| 3 | `users.role` field cleanup | — | Inert leftover from the pre-`admins`-collection design; optional, tracked in memory (`cleanup_users_role_field.md`) |
| 4 | Account deletion (distinct from engagement reset) | P0 §5.2 | Explicitly future work per the plan; no target date |
| 5 | Phase E — IA/taxonomy/onboarding | P1 §13-15 | Separate phase, sequenced after Brand Alignment, not started |

"Resolved" means implemented and deployed to **staging**; production promotion still follows the plan's staging-first gate before going live.
