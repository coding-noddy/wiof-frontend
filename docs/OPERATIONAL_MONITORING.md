# Operational Monitoring

Foundation Hardening Plan v4 §11 ("operational analytics"): visibility into
function failures, failed writes, auth errors, and rules denials. This is
the practical, buildable version of that within Firebase's own tooling —
not a new platform, since Cloud Logging already collects this passively.

## What changed

Every callable Cloud Function and Firestore trigger in `functions/index.js`
(everything except the pre-existing `socialMetaTags`, which already had its
own per-branch error handling) is now wrapped with `withErrorLogging` /
`withTriggerErrorLogging`. Both:

- Let an intentionally-thrown `HttpsError` (unauthenticated, permission-denied)
  pass straight through — those are expected outcomes, not failures worth
  alerting on.
- Catch anything else, log it as a single structured JSON line via
  `console.error`, and (for callables) replace it with a generic
  client-facing message so internals never leak to the client.

### Turning logging off (`LOGGING_ENABLED`)

`functions/.env` sets `LOGGING_ENABLED=true`. `logFunctionError()` checks
this at call time and skips the `console.error` entirely when it's set to
the literal string `"false"` — everything else (including the file or
variable being missing) keeps logging on. This exists purely as a
cost/noise control switch, not because the current volume is expected to
matter under Cloud Logging's free tier; flip it per-environment by adding
`.env.wiof-staging` / `.env.wiof-production` (Firebase loads the
project-specific file instead of the shared one when it exists) rather
than editing the shared `.env`.

## Finding failures

Firebase Console → the project → **Functions** → **Logs**, or Google Cloud
Console → **Logging** → **Logs Explorer**, filtered to this project. Useful
queries:

- All operational failures across every function:
  `resource.type="cloud_function" AND jsonPayload.fn:*`
- One specific function:
  `resource.type="cloud_function" AND jsonPayload.fn="resetEngagementData"`
- One specific user's failures (once you have a uid):
  `resource.type="cloud_function" AND jsonPayload.uid="<uid>"`
- Anything Firebase itself flagged as an error, including ones outside this
  wrapper (crashes before the try/catch, out-of-memory, timeouts):
  `resource.type="cloud_function" AND severity>=ERROR`

## What this does not do yet

- **No alerting** — nothing pages or emails anyone when a failure happens;
  you have to go looking. Setting up an alerting policy (Cloud Monitoring →
  Alerting, trigger on the log-based metric above) is a Console
  configuration step, not something wired up here.
- **No client-side error aggregation** — Angular service failures
  (`console.warn`/`console.error` calls throughout the app) only show up in
  a user's own browser console, not anywhere centrally visible. Worth
  revisiting if a crash-reporting tool (e.g. Firebase Crashlytics for web,
  or Sentry) gets adopted later.
- **No rules-denial visibility** — Firestore/Storage rules rejections are
  not, by default, exported anywhere queryable at the per-rule level. Cloud
  Firestore audit logs exist but need Cloud Audit Logging enabled
  separately; not done here since it has its own cost/retention tradeoffs
  worth a deliberate decision rather than a default-on setting.

## Event schema versioning

Related, smaller piece from the same plan section (§6.2): every
`activity_log` entry now carries `schemaVersion` (see
`ActivityService.SCHEMA_VERSION` in `activity.service.ts`). If the event
shape changes in the future in a way old entries won't have, this is what
lets a reader tell old and new entries apart instead of guessing from which
optional fields happen to be present. Bump the constant and update readers
when that day comes; nothing consumes this field yet.
