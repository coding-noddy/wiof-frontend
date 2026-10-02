# WIOF Take Action — Proposed Architecture & Copilot Implementation Plan

**Status:** Proposed architecture for Production V1  
**Date:** 1 October 2026

## 1. Objective

Transform the current static WIOF Take Action experience into a real, interactive, data-driven feature while preserving the existing WIOF UX and Firebase architecture.

V1 should allow WIOF to:
- Manage actions from the Admin Dashboard.
- Display actions contextually on Element pages.
- Provide a global Take Action experience.
- Let authenticated users start and complete actions.
- Persist user action history.
- Support one-time and repeatable actions.
- Show basic progress/history.
- Keep the model ready for future challenges, achievements/badges, events and Planet Passport.
- Keep product action data separate from generic analytics.

**Product principle:**  
**Inspire through Creativity → Enlighten through Knowledge → Protect through Action**

---

## 2. Current State

The existing application already has:
- A static Take Action catalogue in `take-action-data.ts`.
- Approximately 20 current items across Earth, Energy, Air, Water and Spirit.
- `ElementTakeActionTeaserComponent` on Element pages.
- Element-specific Take Action routing.
- Firebase Authentication and Firestore.
- Existing Admin CRUD patterns.
- `activity_log`.
- `user_metrics`.
- My Journey and existing engagement tracking.

The current Take Action items are primarily educational/action-oriented content. They should become the seed catalogue for the new product model, after content curation.

**Do not delete the current implementation until the replacement is working.**

---

## 3. Target Architecture

```text
                    WIOF TAKE ACTION
                           |
              +------------+------------+
              |                         |
        Action Catalogue           User Action History
              |                         |
           actions                  user_actions
              |                         |
              +------------+------------+
                           |
                    Progress / Journey
                           |
                     My Journey
                           |
                Future Recognition
                           |
              Badges / Challenges
                           |
                    Planet Passport
```

Keep analytics separate:

```text
User interactions
      |
 activity_log
      |
 user_metrics
      |
 My Journey
```

**Important:** `activity_log` must not be the source of truth for Take Action completion.

---

## 4. Firestore: `actions`

Suggested path:

`actions/{actionId}`

Suggested model:

```json
{
  "title": "Switch Off Unused Lights",
  "shortDescription": "Turn off lights whenever you leave a room.",
  "description": "A simple action that helps reduce unnecessary energy consumption.",
  "instructions": [
    "Identify lights that are not needed.",
    "Switch them off when leaving the room."
  ],

  "elementIds": ["energy", "earth"],
  "categories": ["energy-saving", "daily-habit"],
  "tags": ["energy", "home", "daily"],

  "actionType": "PERSONAL",
  "completionType": "SELF_REPORTED",
  "repeatType": "DAILY",

  "estimatedDurationMinutes": 1,
  "difficulty": "EASY",

  "isActive": true,
  "isFeatured": false,

  "media": {
    "type": "YOUTUBE",
    "url": "https://..."
  },

  "displayOrder": 10,

  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp",
  "createdBy": "uid",
  "updatedBy": "uid"
}
```

The exact field names should follow existing project conventions.

### Multiple elements

An action must be able to belong to multiple elements.

Example:

```json
"elementIds": ["water", "earth", "spirit"]
```

for an action such as caring for/watering a tree.

Do not duplicate the same action merely because it relates to multiple elements.

**Codebase check (2026-10-01):** this is a genuinely new content-modeling pattern, not a reuse of an existing one. Every existing content type (Blog, News, InFocus, etc.) tags to exactly one element via a single `category: string` field. The only existing `string[]` precedent is `UserProfile.preferredElements`, which is a user-preference list, not content tagging. No existing Admin form component handles multi-select elements — this will need new form UI, not a copy of an existing one.

---

## 5. Action Types

Keep V1 controlled and simple:

```text
PERSONAL
NATURE
COMMUNITY
EVENT
```

`EVENT` is future-ready and does not need full event integration in V1.

Examples:
- PERSONAL: switch off unused lights.
- NATURE: plant/care for a tree.
- COMMUNITY: join a cleanup drive.
- EVENT: attend a WIOF environmental event.

---

## 6. User Action History

Separate the action definition from the user's participation.

**Codebase check (2026-10-01):** every existing per-user collection (`activity_log`, `user_metrics`, `user_saved_content`) is a flat top-level collection filtered by a `userId` field — `firestore.rules` has zero nested `match` blocks today. A `users/{userId}/user_actions` subcollection would be a first-of-its-kind structural pattern, not a reuse of an existing one, and needs its own rules shape.

**Decision for V1:** use a flat collection instead, to match existing convention and avoid introducing a second rules pattern:

`user_actions/{userActionId}` (with a `userId` field for ownership, same as `activity_log`)

Alternative collection structure may be used if it better matches existing Firestore conventions and query requirements.

Suggested fields:

```json
{
  "actionId": "switch-off-unused-lights",
  "status": "COMPLETED",
  "startedAt": "serverTimestamp",
  "completedAt": "serverTimestamp",
  "completionCount": 1,
  "lastCompletedAt": "serverTimestamp",
  "completionMethod": "SELF_REPORTED",
  "evidence": null,
  "elementIdsSnapshot": ["energy", "earth"],
  "actionVersion": 1,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Snapshot relevant taxonomy/version information so historical records do not unexpectedly change when an admin edits the action later.

---

## 7. Repeatable Actions

Support repeatable actions in V1.

**Codebase check (2026-10-01):** `activity_log`'s `daily_visit` activity type already implements per-calendar-day dedup via a deterministic document ID (`${userId}_daily_visit_${calendarDay}`), relying on Firestore rules denying `update` on `activity_log` so a repeat `set()` to the same ID is rejected client-side as "already recorded." This is the closest existing precedent to `repeatType: DAILY` and should be the pattern `user_actions` reuses for periodic completions (deterministic ID incorporating `actionId` + the relevant period key), rather than inventing a new dedup mechanism.

Example:

```text
Action:
Avoid Littering

User history:
2026-10-01 COMPLETED
2026-10-02 COMPLETED
2026-10-03 COMPLETED
```

Do not create a new action definition for each occurrence.

This model will later support:
- streaks
- milestones
- badges
- challenges
- impact calculations

---

## 8. Completion UX

Use a lightweight lifecycle:

```text
NOT_STARTED
     |
   START
     |
 IN_PROGRESS
     |
 COMPLETE
```

For simple actions, START may be optional:

```text
Take Action → Mark Complete
```

Do not force a complex workflow onto a one-minute action.

---

## 9. Trust / Verification

WIOF is not a policing system.

### V1
Use self-reported completion for simple actions.

### Optional future evidence
Keep an optional evidence field but do not require uploads for ordinary actions.

### Future event verification
Event actions can later support:
- registration
- QR check-in
- organizer confirmation
- attendance records

Do not build this in V1.

---

## 10. Admin Dashboard

Add:

**Admin → Take Action / Actions**

Reuse the existing Admin CRUD architecture.

Support:

### List
- Search
- Filter by element
- Filter by category
- Active/inactive
- Featured
- Sort/order

### Create/Edit
- Title
- Short/full description
- Instructions
- Elements
- Categories/tags
- Action type
- Completion type
- Repeat type
- Difficulty
- Duration
- Media
- Display order
- Active/featured status

### Deactivate
Use:

```text
isActive = false
```

Avoid deleting actions that already have user history.

Do not introduce a second admin framework.

---

## 11. Frontend

Reuse existing Angular patterns.

Potential components:

```text
TakeActionPageComponent
TakeActionListComponent
TakeActionCardComponent
TakeActionDetailComponent
ElementTakeActionTeaserComponent
MyActionsComponent
```

Use project naming conventions if existing equivalents already exist.

---

## 12. Global Take Action Page

The global page becomes the main hub.

V1 structure:

```text
Protect Through Action
      |
Short introduction
      |
Featured / Recommended Actions
      |
Browse by Element
      |
Browse by Category
      |
My Actions (authenticated users)
      |
Recently Completed
```

Keep V1 intentionally simple.

---

## 13. Element Page Integration

Keep the current contextual Take Action location.

Current concept:

```text
Element
  ↓
Video + Widget
  ↓
Static Take Action cards
  ↓
In Focus
```

Target:

```text
Element
  ↓
Video + Widget
  ↓
Contextual Take Action
  ↓
In Focus
```

Show 2–4 relevant actions from the shared action catalogue.

Example:

```text
Water — Take Action

[Reduce Water Waste]
[Care for a Tree]
[Explore More Water Actions]
```

The Element page should act as a contextual entry point into the same global action system.

---

## 14. Home Page Integration

Do not create a huge Take Action section.

For guests:

```text
Protect Through Action
One small action you can take today.

[Explore Actions]
```

For authenticated users:

```text
Continue Your Journey

You've completed 7 actions.

Next:
Reduce household water waste

[Take Action]
```

Match the existing brand-aligned UX rather than creating a new visual language.

---

## 15. Guest vs Authenticated

### Guest
Can:
- Browse actions.
- Read action details.
- View supporting content.
- Understand the Take Action experience.

When trying to record completion:

```text
Sign in to save your progress
```

Do not block the entire page behind authentication.

### Authenticated
Can:
- Start actions.
- Complete actions.
- Repeat eligible actions.
- View action history.
- See basic progress.

---

## 16. My Journey Integration

Do not create a second large dashboard.

Extend existing My Journey with a minimal action metric:

```text
Actions Taken
7
```

Potential breakdown:

```text
Earth  3
Water  2
Energy 2
```

Then:

```text
View Action History
```

opens the user's action history.

Only add derived metrics actually required by V1.

---

## 17. Activity Log

Action completion may also emit an analytics event:

```json
{
  "activityType": "ACTION_COMPLETED",
  "actionId": "...",
  "timestamp": "serverTimestamp"
}
```

But:

**`user_actions` = product source of truth**

**`activity_log` = analytics**

Never rely on analytics events as the only completion record.

---

## 18. User Metrics

Only add V1 metrics that are needed by the UI, for example:

```text
totalActionsCompleted
uniqueActionsCompleted
actionsByElement
lastActionAt
```

Do not add dozens of derived fields prematurely.

Avoid huge arrays such as:

```text
completedActions: [thousands of IDs]
```

Use documents/subcollections instead.

**Codebase check (2026-10-01):** today, `user_metrics` is write-protected in rules (`write: false` for clients) and is only ever updated server-side, via an `onActivityLogCreated` Cloud Function trigger that increments counters when a new `activity_log` doc is created — never written directly by the client. Follow the same pattern for the new action-related metrics (increment via a Cloud Function trigger on `user_actions` writes, not from the Angular service), to avoid the kind of stale/never-incremented counter that already exists on `UserProfile.savedBlogsCount` (set once, never updated, now bypassed by a live query instead).

---

## 19. Badges / Achievements

**Do not implement the full badge engine in V1.**

But make action history ready for it.

Future architecture:

```text
user_actions
     |
achievement rules
     |
user_achievements
```

Possible future achievements:
- First Step
- 5 Actions Completed
- Earth Ally
- Energy Saver
- Water Guardian
- Community Participant

Badges should represent meaningful behavior, not clicks.

---

## 20. Planet Passport

Not V1.

Future Passport can consume:

```text
actions
user_actions
achievements
challenges
events
learning history
impact
```

V1 must preserve durable action history so Passport can be added later without redesigning the core action model.

---

## 21. Challenges

Not V1.

Future:

```text
challenge
   |
   +-- action 1
   +-- action 2
   +-- action 3
```

Examples:
- 7-Day Energy Challenge
- Water Awareness Challenge
- Earth Week Challenge
- Community Cleanup Challenge

Actions remain independent entities; do not duplicate action definitions inside challenges.

---

## 22. Events

Not fully implemented in V1.

Future:

```text
event
   ↓
participation
   ↓
user action record
```

Example:

```text
River Cleanup
→ User attends
→ Participation recorded
→ Action appears in My Journey
```

---

## 23. Impact Measurement

V1 should record completion, not invent environmental impact.

Future:

```text
Action completed
      ↓
Scientific methodology
      ↓
Estimated/verified impact
```

Any numerical environmental impact must use a documented methodology and version.

Do not display invented CO2/water/energy savings merely to motivate users.

---

## 24. Initial Action Catalogue

The existing ~20 Take Action items are a seed catalogue, not automatically the final production set.

Review each action for:

- Is it actually an action?
- Can a normal user realistically perform it?
- Is completion unambiguous?
- Is it safe?
- Is it relevant to WIOF?
- Which elements does it relate to?
- Personal/Nature/Community/Event?
- One-time or repeatable?
- Is supporting content accurate/current?
- Does it create meaningful environmental or personal value?

Then curate the production V1 list.

---

## 25. V1 Scope

### Build

- `actions` Firestore collection.
- `user_actions` persistence.
- Admin action CRUD.
- Action service/repository.
- Global Take Action page.
- Interactive action cards.
- Action detail.
- Start/complete.
- Repeatable action support.
- Guest/authenticated states.
- Element filtering.
- Existing Element Take Action integration.
- Basic My Journey action metric/history.
- Analytics event.
- Security rules.
- Required indexes.
- Curated seed actions.

### Do NOT build in V1

- Full badge engine.
- Planet Passport.
- Full challenge engine.
- Event attendance system.
- Advanced impact calculations.
- Social sharing.
- Recognition email automation.
- AI recommendation engine.
- Complex evidence verification.
- Leaderboards.
- Points economy.

---

## 26. Implementation Order

### Step 1 — Inspect
Review existing models, services, Firebase patterns, Admin CRUD, My Journey, activity logging and Element Take Action.

### Step 2 — Domain
Create Action interfaces/models following existing conventions.

### Step 3 — Catalogue
Implement Firestore `actions` service/repository.

### Step 4 — User history
Implement `user_actions` and security rules.

### Step 5 — Admin
Implement Action CRUD using existing Admin patterns.

### Step 6 — Element UX
Replace static data consumption with Firestore-backed actions.

### Step 7 — Interaction
Implement Action Card + Detail + completion.

### Step 8 — Global hub
Implement the global Take Action page.

### Step 9 — Auth
Implement guest/authenticated behavior.

### Step 10 — My Journey
Add basic action progress/history.

### Step 11 — Analytics
Emit action completion analytics independently.

### Step 12 — Security/indexes
Validate rules, indexes and query performance.

### Step 13 — Seed content
Curate and load production actions.

### Step 14 — QA
Test end-to-end without regressing existing features.

---

## 27. Security Requirements

Reuse the current Firebase authentication and authorization architecture.

### Actions
- Public read for active/published actions.
- Admin-only create/update/deactivate.

### User actions
- User can read their own records.
- User can create/update permitted records for themselves.
- User cannot modify another user's records.
- Admin access only where required.

Do not trust client-provided user IDs for authorization. Use Firebase Authentication identity and existing role/claim mechanisms.

**Codebase check (2026-10-01) — critical:** this app has no custom-claims mechanism, and `users/{uid}.role` is a dead field — it is set to `'public'` at account creation and never updated anywhere in the codebase. It must NOT be used to gate admin writes. The actual, enforced admin mechanism is existence of an `admins/{uid}` document:
- Rules: `isAdmin()` → `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` (`firestore.rules`), with an explicit comment that a client-writable field can never be the thing that grants privilege.
- Client: `UserProfileService.getRole(uid)` checks `admins/{uid}` existence (not the `role` field), and `AdminWriteGuardService.assertAdmin()` is called before every admin-collection mutation as defense-in-depth; `AuthGuard` uses the same check to protect `/admin-dashboard` routes.

Admin CRUD for `actions` must follow this exact pattern: `isAdmin()` in the new Firestore rules, `AdminWriteGuardService`/`getRole()` before admin writes in the Angular service, same as Blog/News/InFocus do today.

---

## 28. Performance Requirements

- Query only active actions for public catalogue views.
- Use appropriate Firestore indexes.
- Avoid scanning complete user history for every page load.
- Use `user_metrics` for frequently displayed summaries where justified.
- Paginate history where necessary.
- Keep analytics separate from product history.
- Avoid unbounded arrays.
- Avoid N+1 Firestore queries.

---

## 29. Copilot Instructions

Before modifying code:

1. Inspect the repository.
2. Identify existing patterns for Firebase, Firestore, Admin CRUD, My Journey, activity logging and Element Take Action.
3. Reuse existing patterns.
4. Do not introduce a second data-access pattern.
5. Do not duplicate authentication/authorization logic.
6. Do not migrate unrelated application architecture.
7. Do not redesign unrelated UX.
8. Do not introduce a new state-management library unless the existing architecture requires it.
9. Do not implement badges, Passport, challenges or events in V1.
10. Do not store all action history in `activity_log`.
11. Do not hard-code the production action catalogue into Angular components.
12. Do not remove the existing static Take Action implementation until the new flow is validated.
13. Run existing tests/build/lint after major changes.
14. Report all changed files plus Firestore rule/index changes.
15. Keep changes incremental and reviewable.

---

## 30. Acceptance Criteria

V1 is complete when:

- Admin can create/edit/deactivate actions.
- Active actions appear without a code deployment.
- Actions can belong to multiple elements.
- Guests can browse actions.
- Authenticated users can start/complete actions.
- Completion persists across sessions/devices.
- Repeatable actions can be completed according to their rules.
- User action history is available.
- My Journey can show basic action progress.
- Action completion does not depend on `activity_log`.
- Analytics continue independently.
- Users cannot modify another user's records.
- Deactivated actions do not break historical records.
- Existing Element UX remains intact.
- Existing authentication/security behavior remains intact.
- Existing My Journey metrics do not regress.
- No full badge/Passport/challenge engine is accidentally introduced.

---

## 31. Final Product Loop

The V1 experience should establish:

```text
WIOF Content
     ↓
Discover an Action
     ↓
Understand the Action
     ↓
Take the Action
     ↓
Record Completion
     ↓
See Progress
     ↓
Return to WIOF
     ↓
Take Another Meaningful Action
```

Long-term:

```text
Actions
  ↓
Progress
  ↓
Recognition
  ↓
Challenges / Events
  ↓
Impact
  ↓
Planet Passport
```

The goal is **not** to build the entire future WIOF platform in V1.

The goal is to build a durable Take Action foundation that makes the future possible without forcing a major architectural rewrite.
