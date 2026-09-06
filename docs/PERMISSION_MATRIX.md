# Firestore & Storage Permission Matrix

Every production Firestore collection and Storage path, what a request can do
to it, and how it fits the privacy/reset model. This is the deliverable
called for by the Foundation Hardening Plan v4 §3.5 ("Audit every Firestore
path and Storage path") — update it whenever a collection's rules or purpose
changes; do not let this drift from `firestore.rules` / `storage.rules`.

`isAdmin()` = authenticated **and** a document exists at `admins/{uid}` (see
`firestore.rules`). It is never derived from a field a client can write.

## Firestore

| Collection | Public read | Auth read | Owner r/w | Admin r/w | Server-only write | Sensitive fields | Resettable | Account-delete behavior |
|---|---|---|---|---|---|---|---|---|
| `users/{uid}` | no | no | read own; update own limited to `displayName`/`photoURL`/`preferredElements` — no client `create` at all | read any; no special create/update path (admins don't edit other profiles today) | **yes** — `createUserProfile`, `recordLoginMetrics`, `recordUserVisit`, `resetEngagementData` (Cloud Functions) are the only way `role`, `loginCount`, `lastLogin`, `daysVisited`, `currentStreak`, `savedBlogsCount` are ever written | none stored beyond profile identity | engagement counters reset in place (`resetEngagementData`); `displayName`/`photoURL`/`preferredElements` are user identity, not reset | doc itself is account-delete-only (no account-delete feature exists yet — future work) |
| `admins/{uid}` | no | no | no — not even the admin themself can write | read own only (`get`, not `list`); no admin write path either | **yes** — Console or trusted server process only | membership itself (who is an admin) | not resettable — not user-owned | not user-owned; managed outside the app entirely |
| `user_saved_content/{docId}` | no | no | owner create/read/update/delete (`savedAt` must be `request.time`) — delete is still client-reachable because `unsaveContent` (bookmark toggle) needs it. Doc ID is deterministic (`{userId}_{contentId}`, see `SavedContentService.docId`), not a random auto-ID — a concurrent double-save can't create duplicates, and unsave is a direct doc delete instead of query-then-delete | no explicit admin path for normal reads (not needed today); `migrateSavedContentIds` (Cloud Function) can enumerate all docs for the one-time ID migration | bulk reset goes through `resetEngagementData` (Cloud Function, Admin SDK) rather than a client bulk-delete | which content a user saved | fully resettable — deleted wholesale by `resetEngagementData` | deleted on reset already; would also be deleted on account deletion |
| `activity_log/{docId}` | no | no | create + read own only — no update, no delete, not even the owner's | read (analytics) | **yes** — bulk deletion on reset goes through `resetEngagementData` (Cloud Function, Admin SDK); the client has no delete path of any kind (rate-limited create via `timestamp == request.time`) | full behavioral history (reads, watches, votes, EQ scores) | fully resettable — deleted wholesale by `resetEngagementData` | deleted on reset already; would also be deleted on account deletion |
| `Blogs`, `News`, `CoffeeConversations`, `InFocus`, `NGOinFocus`, `CourseInFocus`, `Envcal`, `AboutUs`, `AboutUsProfiles` | yes | — | no | full r/w | no | none (public content) | n/a — admin-owned content, not user data | n/a |
| `Subscriptions/{id}` | no | no | create-only (newsletter sign-up form; field-validated, no update/delete) | full r/w | **yes** — "already subscribed?" goes through `checkSubscriberExists` (Cloud Function, Admin SDK); no client read path at all, not even bounded | email address | not user-account data (no login tied to it) — no reset applies | admin-managed; no self-service removal today |
| `Polls/{id}` (raw votes) | no | no | create-only (vote submission; field-validated) | full r/w | **yes** — dedup check goes through `checkPollEmailVoted` (Cloud Function); aggregate results come from `poll_results`, never this collection | voter email + IP address | n/a — anonymous/guest-mixed data, not tied to a resettable user profile in a simple way | admin-managed |
| `poll_results/{pollQuestionId}` | yes | — | no | no client write at all | **yes** — only `onPollVoteCreated` / `backfillPollResults` (Admin SDK) write it | none (aggregate counts only) | n/a — derived/materialized data, recomputable from `Polls` | n/a |
| `Poll/{id}` (question config) | yes | — | no | full r/w | no | none | n/a | n/a |
| `user_metrics/{uid}` | no | no | read own only | read any | **yes** — only `onActivityLogCreated` (per-event trigger) / `backfillUserMetrics` (Admin SDK) write it | none (aggregate counts + last EQ score/date) | n/a — derived/materialized data, fully recomputable from `activity_log` via `backfillUserMetrics` | n/a |

## Storage

| Path | Public read | Owner write | Admin write | Constraints | Sensitive | Resettable |
|---|---|---|---|---|---|---|
| `user-avatars/{uid}/{fileName}` | yes (rendered via plain `<img>`, no auth token sent) | yes, own path only | delete only (cleanup) | ≤ 1 MB, `image/jpeg`\|`image/jpg`\|`image/png` | avatar image | replaced/removed via Settings; not part of the engagement-data reset flow today |
| `{allPaths=**}` (published media — blog/news/course/NGO images, etc.) | yes | no | full r/w | ≤ 10 MB, `image/.*` or `video/.*` | none (public content) | n/a — admin-owned content |

## Notes for future collections

Every new user-owned collection must be added to this table **and** given an
explicit resettable classification before it ships, per the
`RESETTABLE_USER_DATA` contract described in the Foundation Hardening Plan
(§5.5) — that contract does not exist as a separate artifact yet; this table
is the closest thing to it.

"Clear My Engagement Data" (`SettingsPage.confirmReset()`) now calls a single
Cloud Function, `resetEngagementData`, which deletes the user's `activity_log`
and `user_saved_content` records and zeroes the profile counters in one
trusted, idempotent server-side operation — not three separate client calls
each independently interruptible by a closed tab or network failure the way
it used to be. It still isn't one Firestore transaction (a large deletion can
exceed the 500-write batch limit, a constraint no server-side design escapes),
but a retry after a partial failure is always safe: deleting an already-empty
result set and re-zeroing already-zero counters both no-op, so the client can
honestly tell a user "please retry" without risk of double-deleting or erroring
on clean data.

My Journey's dashboard tallies (blogs read, videos watched/completed, polls
voted, last EQ score) now read `user_metrics/{uid}` — a materialized summary
kept current by the `onActivityLogCreated` trigger — instead of downloading
and re-scanning a user's entire `activity_log` history on every page load.
The detail history sections (Quality Reads, EQ History, Poll History, Videos
Watched) still query `activity_log` directly, since those need the actual
items, not just counts; each is now bounded to the most recent 50 entries
(`ActivityService.MAX_HISTORY_ITEMS`) rather than an unbounded scan.

Known gaps this table intentionally does not paper over:
- No account-deletion feature exists yet (separate from engagement reset).
- App Check is not yet configured — see the Foundation Hardening Plan §4.3.
