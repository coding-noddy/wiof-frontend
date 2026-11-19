# WIOF Planet Passport — Production Implementation Contract
**Version:** 1.0  
**Status:** Proposed; implementation requires explicit approval.

## 1. Purpose

Convert the existing Passport prototype into a production-safe, trustworthy personal journey record that reflects verified WIOF activity and milestones.

The Passport is a personal journey expression. It is not a score, competition, or measure of a user's environmental worth.

## 2. Context and constraints

The reviewed project uses Angular 21.2.x, Ionic 8.8.x, Firebase 12.19.x, Firestore, and Cloud Functions.

Existing foundations include activity validation/deduplication, server-derived `user_metrics`, action catalogue/history, activity logs, completion records, My Journey, deterministic recommendations, and Passport UI/stamp components.

**Preserve existing architecture and trusted sources.** Do not introduce parallel activity or metric systems.

Important conceptual data domains:
- `activity_log`: raw events/history.
- `user_metrics`: derived summaries.
- `actions`: action catalogue.
- `user_actions`: user/action relationship or history.
- `user_action_completions`: individual completion records.

Confirm exact collection schemas and current repository implementation before coding. Names above are architectural context, not permission to assume every field or schema.

## 3. Objectives

1. Define a stable Passport data model and stamp lifecycle.
2. Make eligibility and awarding server-authoritative.
3. Persist permanent earned records with trustworthy timestamps.
4. Make award operations idempotent and auditable.
5. Protect against forged client requests and duplicate events.
6. Integrate with existing trusted activity/metrics without duplicating sources of truth.
7. Provide reset/deletion behavior that is consistent with user expectations and privacy requirements.
8. Deliver accessible, responsive UI with clear states.
9. Provide tests, operational guidance, and a safe release plan.

## 4. Non-goals

- Points, leaderboards, ranks, or competitive scoring.
- Speculative environmental impact calculations.
- Public sharing by default.
- Blockchain/NFT ownership.
- AI-based stamp eligibility or award decisions.
- Replacing the existing activity/metrics architecture.
- A large redesign of unrelated Phase 1/Phase 2 features.
- Production deployment without explicit approval.

## 5. Required discovery before implementation

Claude/developer must begin with a **read-only audit**:
- Inspect the current branch, working tree, project structure, and existing Passport code.
- Identify all Passport components, services, models, rules, functions, tests, feature flags, and routes.
- Trace how activity and completion data are currently written and validated.
- Identify exact Firestore collections, document ownership, security rules, and function call paths.
- Check for existing migrations/backfills and reset/deletion flows.
- Identify code that is complete, incomplete, duplicated, obsolete, or risky.
- Run available tests and report missing scripts/configuration without fabricating results.
- Compare repository state with the archived review; do not assume the archive is current.

Deliver an audit report and implementation proposal before changing files.

## 6. Functional requirements

### 6.1 Stamp definition
Each stamp definition should have:
- Stable identifier.
- Display name and description.
- Category/theme.
- Icon/art reference.
- Eligibility rule identifier/version.
- Status (draft/published/retired or equivalent).
- Definition version and timestamps.
- Optional display ordering.

Stamp definitions must be controlled by trusted administrative mechanisms. Client users must not create or modify definitions.

### 6.2 Award record
An earned stamp record should capture, at minimum:
- User identity/reference consistent with existing account ownership.
- Stamp identifier and definition version.
- `earnedAt` server timestamp.
- Award rule/version or reason code.
- Source event/completion reference where applicable.
- Idempotency key or equivalent deduplication mechanism.
- Record status only if the design needs revocation/correction.

Avoid storing unnecessary personal data or duplicating the entire source activity.

### 6.3 Server-authoritative awards
- Client-side UI may display eligibility hints but cannot be the final authority.
- Validate all award conditions in trusted server code.
- Validate user identity and ownership.
- Do not trust client-provided metrics, timestamps, stamp IDs, or claims of completion.
- Use server timestamps.
- Use transactions or an equivalent atomic mechanism where needed.
- Handle concurrent duplicate requests safely.
- Ensure retry behavior does not create duplicate earned records.
- Prevent users from awarding stamps to other users.

### 6.4 Eligibility
- Eligibility must be deterministic, documented, versioned, and testable.
- Prefer existing trusted completion/activity/metrics records.
- Do not infer eligibility from untrusted client state.
- Do not create arbitrary environmental impact estimates.
- Avoid retroactive award changes without a documented migration and approval.

### 6.5 User experience
- Show earned, not-yet-earned, and unavailable/retired states clearly.
- Do not imply that an unearned stamp means failure.
- Explain what a milestone represents and how it is earned.
- Support empty states and users with little activity.
- Provide responsive layouts and accessibility semantics.
- Avoid unnecessary animation and respect reduced-motion settings.
- Do not require users to complete actions to access unrelated learning content.

### 6.6 Admin and definition lifecycle
- Provide a safe mechanism to publish/update stamp definitions.
- Version eligibility rules.
- Avoid editing a published rule in a way that silently changes historical meaning.
- Retire definitions without deleting valid earned history.
- Admin access must be verified server-side and follow least privilege.
- Document how a new stamp is added and tested.

## 7. Data integrity and source-of-truth rules

- Existing activity/completion records remain the source of truth for qualifying user behavior.
- `user_metrics` remain derived summaries, not user-editable inputs.
- Passport award records are a durable projection/recognition of qualifying milestones, not a replacement for raw activity.
- Do not copy all activity data into Passport.
- Do not maintain a second manually editable metric total.
- If a source record is corrected or deleted, define whether the stamp remains, is corrected, or is revoked. Do not silently erase history.
- Any backfill must be reviewed, dry-run capable, bounded, logged, and approved.

## 8. Reset, deletion, and retention

Before release, document:
- What a user reset clears and what it preserves.
- Whether earned Passport records are resettable.
- Account deletion behavior and retention obligations.
- Treatment of user reflections/notes.
- Whether reset actions can be reversed.
- How administrative corrections are recorded.
- Whether any data is retained for security/audit purposes and for how long.

Never let a reset button accidentally delete unrelated user data. Require confirmation for consequential actions and test the exact behavior.

## 9. Security and abuse prevention

Required checks:
- Firestore security rules deny direct client writes to authoritative award records.
- Cloud Functions/callable endpoints verify authentication and ownership.
- Admin-only operations verify trusted roles/claims.
- App Check is evaluated and rollout documented.
- Rate limits/abuse controls considered for callable award endpoints.
- Validate payload shape, IDs, and allowed values.
- Avoid exposing sensitive error details.
- Add audit logs for administrative changes and exceptional corrections.
- Review logs for PII minimization.

## 10. Testing requirements

### Unit tests
- Every eligibility rule.
- Stamp definition validation.
- Award payload validation.
- Idempotency behavior.
- Version handling.
- Invalid/unauthorized inputs.

### Integration tests
- Authenticated user awards a qualifying stamp.
- Non-qualifying activity is rejected.
- User cannot award another user's stamp.
- Duplicate/retried calls produce one award.
- Concurrent requests do not create duplicates.
- Client cannot write authoritative award records.
- Admin-only definition changes are protected.
- Reset/deletion behavior matches contract.

### Regression and UI tests
- Existing activity and metrics flows remain intact.
- Passport renders empty, earned, retired, and error states.
- Mobile and desktop layouts.
- Keyboard navigation, screen-reader labels, contrast, touch targets.
- Reduced motion behavior.

### Test reporting
Report exact commands, environment, counts, failures, and gaps. Never claim a test passed if it was not run.

## 11. Rollout plan

1. Read-only audit and design approval.
2. Implement data model and server-side logic in a feature branch.
3. Add tests and rules coverage.
4. Deploy to a non-production environment.
5. Test with controlled accounts and representative data.
6. Review logs, permissions, and reset/deletion behavior.
7. Run a limited pilot or feature-flagged release.
8. Obtain explicit production approval.
9. Deploy with monitoring and rollback instructions.
10. Verify after release and publish a completion report.

No production deployment or destructive migration without explicit user approval.

## 12. Acceptance criteria

The work is complete only when:
- Passport award logic is server-authoritative.
- Award records are durable and idempotent.
- Existing trusted sources remain authoritative.
- Security rules and backend authorization are tested.
- Reset/deletion behavior is defined and verified.
- UI is accessible and responsive.
- Automated tests and CI checks pass or documented gaps are explicitly accepted.
- Operational and rollback instructions exist.
- No unrelated features or architecture changes were introduced.
- A final report lists changed files, decisions, tests, known risks, and deployment status.

## 13. Required developer completion report

Provide:
1. Summary of implemented behavior.
2. Files changed and why.
3. Data model and migration details.
4. Security and privacy decisions.
5. Tests run with exact results.
6. Manual QA performed.
7. Remaining issues and risks.
8. Rollback/recovery steps.
9. Deployment status—never imply production deployment unless it actually occurred.
10. Recommended next step.

## 14. Stop conditions

Pause and ask for approval if:
- A schema migration or destructive data operation is needed.
- Existing activity/metrics source-of-truth is unclear.
- Production data or permissions must be changed.
- A product decision changes award meaning or user privacy.
- The requested implementation requires a broad rewrite.
- Security rules would be weakened.
- The test environment cannot verify a critical requirement.
