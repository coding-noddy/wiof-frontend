# Implementation Plan: Security and Engagement Tracking

## Overview

This implementation plan covers security hardening (RBAC, Firestore rules, rate limiting) and engagement tracking enhancements (smart blog read completion, EQ score history, poll vote tracking, My Journey page) for the WIOF platform. Tasks are organized to build foundational security infrastructure first, then layer engagement tracking features on top, wiring everything together on the My Journey page.

## Tasks

- [x] 1. Set up foundational types, interfaces, and rate limiter service
  - [x] 1.1 Enhance UserProfile interface and ActivityLogEntry model
    - Add `role: 'admin' | 'public'` field to the `UserProfile` interface
    - Add new fields to `ActivityLogEntry`: `scrollDepth`, `timeSpent`, `eqDimensions`, `selectedOption`, `userEmail`
    - Add new `activityType` values: `'blog_read_complete'`, `'poll_vote'`, `'eq_completion'`
    - Create `QualityReadEntry`, `EqHistoryEntry`, and `PollHistoryEntry` interfaces
    - _Requirements: 1.1, 5.4, 6.1, 7.3_

  - [x] 1.2 Implement RateLimiterService
    - Create `src/app/services/rate-limiter.service.ts`
    - Implement `canWrite(key: string): boolean` with 1-write-per-second-per-key throttle using a `Map<string, number>` of last write timestamps
    - Implement `scheduleRetry(key: string, writeFn: () => Promise<void>)` with max 2 attempts at 2-second delay
    - Register as `{ providedIn: 'root' }` singleton
    - _Requirements: 4.3, 4.4_

  - [ ]* 1.3 Write property test for RateLimiterService (Property 4: Rate Limiter Throughput Cap)
    - **Property 4: Rate Limiter Throughput Cap**
    - **Validates: Requirements 4.3**
    - Use fast-check to generate random timestamp sequences and verify at most 1 write passes per 1-second window per key

- [x] 2. Implement RBAC in UserProfileService and AuthGuard
  - [x] 2.1 Extend UserProfileService with role retrieval and caching
    - Add `roleCache: Map<string, 'admin' | 'public'>` for session-level caching
    - Implement `getRole(uid: string): Promise<'admin' | 'public'>` that checks cache first, then Firestore
    - Default to `'public'` for documents without a `role` field (legacy data handling)
    - Implement `clearRoleCache()` called on logout
    - Implement `sanitizeUpdate(payload: Partial<UserProfile>): Partial<UserProfile>` that strips the `role` field from any update payload
    - Ensure `createProfile(user)` sets role to `'public'` for Google OAuth users
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.5_

  - [ ]* 2.2 Write property test for role field immutability (Property 1: Role Field Immutability)
    - **Property 1: Role Field Immutability**
    - **Validates: Requirements 1.4**
    - Use fast-check to generate random update payloads with optional `role` field and verify `sanitizeUpdate()` always strips it

  - [x] 2.3 Enhance AuthGuard for admin role verification
    - Modify `canActivate()` in `src/app/guards/auth.guard.ts` to:
      - Check authentication state via AuthService
      - If unauthenticated → redirect to `/login`
      - If authenticated → call `UserProfileService.getRole(uid)`
      - If role is `'admin'` → allow navigation
      - If role is `'public'` or missing → redirect to `/home` and display toast "Access denied: Admin privileges required"
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 2.4 Write property test for admin route access (Property 2: Admin Route Access Correlates with Role)
    - **Property 2: Admin Route Access Correlates with Role**
    - **Validates: Requirements 2.1, 1.5**
    - Use fast-check to generate random users with random roles and verify `canActivate()` returns `true` iff role is `'admin'`

  - [x] 2.5 Add client-side admin write rejection for non-admin users
    - Implement a pre-check in relevant admin services (blog management, news, etc.) that verifies the user's cached role is `'admin'` before attempting any Firestore write to Admin_Collections
    - If role is not admin, reject the operation immediately without sending to Firestore
    - _Requirements: 2.4_

  - [ ]* 2.6 Write property test for non-admin write rejection (Property 3: Non-Admin Write Rejection)
    - **Property 3: Non-Admin Write Rejection on Admin Collections**
    - **Validates: Requirements 2.4**
    - Use fast-check to generate random collections × random roles and verify writes are rejected for non-admin users

- [x] 3. Checkpoint - RBAC and rate limiter
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Firestore Security Rules
  - [x] 4.1 Write Firestore security rules file
    - Update `firestore.rules` with:
      - `users/{userId}`: read by any authenticated user; write only if `request.auth.uid == userId`; deny update of `role` field from client
      - `user_saved_content/{docId}`: read/write only if `resource.data.userId == request.auth.uid`; rate limit 1 write/second
      - `activity_log/{docId}`: read only own docs; create only own docs (userId == auth.uid); deny all deletes; rate limit 1 create/second
      - Admin_Collections (Blogs, News, CoffeeConversations, InFocus, NGOinFocus, CourseInFocus, Envcal, AboutUs, AboutUsProfiles): read by all; write only if user role is `'admin'` (via `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'`)
      - Subscriptions, Polls: remain publicly readable and writable
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2_

  - [ ]* 4.2 Write integration tests for Firestore security rules
    - Set up Firebase emulator test environment
    - Test owner-only writes on `users`, `user_saved_content`, `activity_log`
    - Test admin-only writes on all Admin_Collections
    - Test public read on Admin_Collections
    - Test delete denial on `activity_log`
    - Test rate limiting behavior
    - Test public write access on Subscriptions and Polls
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 5. Implement Smart Blog Read Completion Tracking
  - [x] 5.1 Create BlogReadTrackerDirective
    - Create `src/app/directives/blog-read-tracker.directive.ts`
    - Inputs: `contentId: string`, `wordCount: number`
    - Calculate `timeToRead` as `wordCount / 200 * 60` (seconds)
    - Use `IntersectionObserver` to track scroll depth in 5% increments
    - Start a timer on init to measure elapsed time
    - Implement `checkThreshold()`: fire completion when `scrollDepth > 75 AND timeSpent > timeToRead * 0.6`
    - Set `completed = true` flag to prevent duplicate firing within session
    - On destroy: disconnect observer, clear interval, cleanup
    - Only activate for authenticated users (check auth state on init)
    - Fall back to scroll event listener if IntersectionObserver is unsupported
    - _Requirements: 5.1, 5.2, 5.3, 5.7, 5.8_

  - [ ]* 5.2 Write property test for quality read threshold (Property 5: Quality Read Threshold Evaluation)
    - **Property 5: Quality Read Threshold Evaluation**
    - **Validates: Requirements 5.2, 5.3, 5.4**
    - Use fast-check to generate random (scrollDepth, timeSpent, wordCount) tuples and verify the threshold predicate returns `true` iff `scrollDepth > 75 AND timeSpent > (wordCount / 200 * 60) * 0.6`

  - [x] 5.3 Implement blog read complete logging with deduplication in ActivityService
    - Add `logBlogReadComplete(userId, contentId, scrollDepth, timeSpent): Promise<void>` to ActivityService
    - Before writing, query `activity_log` for existing `blog_read_complete` entry with matching userId+contentId
    - If already exists, skip the write (dedup)
    - If not, use `RateLimiterService` to throttle and write the entry
    - _Requirements: 5.4, 5.5, 5.6_

  - [ ]* 5.4 Write property test for blog read deduplication (Property 6: Blog Read Complete Deduplication)
    - **Property 6: Blog Read Complete Deduplication**
    - **Validates: Requirements 5.5, 5.6**
    - Use fast-check to generate random userId+contentId pairs with repeat attempts and verify at most 1 entry is created per pair

  - [x] 5.5 Integrate BlogReadTrackerDirective into blog detail page
    - Add the directive to the blog detail page template, passing `contentId` and `wordCount`
    - Ensure the directive is declared in the appropriate module
    - Wire the directive's completion event to `ActivityService.logBlogReadComplete()`
    - _Requirements: 5.1, 5.4_

- [x] 6. Checkpoint - Blog read tracking
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement EQ Score History and Poll Vote Tracking
  - [x] 7.1 Implement EQ completion logging in ActivityService
    - Add `logEqCompletion(userId, overallScore, dimensions: {attentionScore, clarityScore, reparationScore}): Promise<void>`
    - Create an `ActivityLogEntry` with `activityType: 'eq_completion'`, all scores, userId, timestamp, and calendarDay
    - Each completion creates a new entry (no dedup — multiple completions allowed)
    - Use `RateLimiterService` for throttling
    - _Requirements: 6.1, 6.2_

  - [ ]* 7.2 Write property test for EQ entry data integrity (Property 7: EQ Completion Entry Data Integrity)
    - **Property 7: EQ Completion Entry Data Integrity**
    - **Validates: Requirements 6.1**
    - Use fast-check to generate random EQ scores (0-100 for each dimension) and verify resulting entry contains all required fields with no nulls

  - [ ]* 7.3 Write property test for EQ completion count invariant (Property 8: EQ Completion Count Invariant)
    - **Property 8: EQ Completion Count Invariant**
    - **Validates: Requirements 6.2**
    - Use fast-check to generate random N (1-10) completions per user and verify query returns exactly N entries with distinct timestamps

  - [x] 7.4 Implement poll vote logging in ActivityService
    - Add `logPollVote(userId, contentId, selectedOption, userEmail): Promise<void>`
    - Create an `ActivityLogEntry` with `activityType: 'poll_vote'`, all fields, timestamp, and calendarDay
    - Use `RateLimiterService` for throttling
    - _Requirements: 7.3_

  - [ ]* 7.5 Write property test for poll vote entry data integrity (Property 10: Poll Vote Entry Data Integrity)
    - **Property 10: Poll Vote Entry Data Integrity**
    - **Validates: Requirements 7.3**
    - Use fast-check to generate random poll data and verify resulting entry contains all required non-empty fields

  - [x] 7.6 Implement poll vote detection and UI changes
    - Add `hasUserVoted(userId, contentId): Promise<{voted: boolean, selectedOption?: string}>` to PollService or ActivityService
    - Query `activity_log` for `poll_vote` entry with matching userId+contentId
    - In poll component: if user is authenticated, check vote status on load
    - If already voted, display "You voted for: [selectedOption]" and disable submission
    - If user is authenticated, auto-fill email from session (no email input shown)
    - If user is guest, show optional email field with placeholder "Email (optional)"
    - _Requirements: 7.1, 7.2, 7.4, 7.6_

  - [ ]* 7.7 Write property test for previously-voted poll detection (Property 11: Previously-Voted Poll Detection)
    - **Property 11: Previously-Voted Poll Detection**
    - **Validates: Requirements 7.4**
    - Use fast-check to generate random userId+contentId combinations with and without prior votes and verify detection correctness

- [x] 8. Checkpoint - EQ and poll tracking
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Enhance My Journey Page
  - [x] 9.1 Add Quality Reads section to My Journey page
    - Query `activity_log` for `blog_read_complete` entries for the current user
    - Display count of quality reads and list of blog titles with completion dates
    - Show loading skeleton while data loads
    - Show empty state "No quality reads yet — start reading to track your engagement!" if no entries
    - Differentiate between `blog_read` count (pages opened) and `blog_read_complete` count (quality reads) with distinct labels
    - _Requirements: 8.1, 8.4, 8.5, 8.6_

  - [x] 9.2 Add EQ History section to My Journey page
    - Query `activity_log` for `eq_completion` entries for the current user
    - Display most recent score prominently with dimension breakdown (Attention, Clarity, Reparation)
    - List previous scores in reverse chronological order with date and all scores
    - Show loading skeleton while data loads
    - Show empty state "Not yet taken" with prompt to take the assessment if no entries
    - _Requirements: 6.3, 6.4, 6.5, 8.2, 8.5, 8.6_

  - [x] 9.3 Add Poll History section to My Journey page
    - Query `activity_log` for `poll_vote` entries for the current user
    - Display list of poll titles, selected options, and vote dates in reverse chronological order
    - Show loading skeleton while data loads
    - Show empty state "No poll votes yet — participate in polls to see your voting history!" if no entries
    - _Requirements: 7.5, 8.3, 8.5, 8.6_

  - [x] 9.4 Implement parallel data loading and section-independent error handling
    - Load all sections (Quality Reads, EQ History, Poll History) in parallel using `Promise.all` or individual observables
    - Each section has its own loading state and error state
    - If one section fails, display error for that section only; other sections remain functional
    - If all sections fail, display a global retry button
    - _Requirements: 8.6_

  - [ ]* 9.5 Write property test for history ordering invariant (Property 9: History Ordering Invariant)
    - **Property 9: History Ordering Invariant**
    - **Validates: Requirements 6.3, 6.4, 7.5**
    - Use fast-check to generate random entry sets with random timestamps and verify all sections are sorted in reverse chronological order

  - [ ]* 9.6 Write property test for activity metric computation (Property 12: Activity Metric Computation)
    - **Property 12: Activity Metric Computation**
    - **Validates: Requirements 8.1, 8.4**
    - Use fast-check to generate random activity log arrays with mixed `blog_read` and `blog_read_complete` entries and verify counts are computed independently

- [x] 10. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- Firestore security rules are deployed separately but should be tested with the Firebase emulator
- The existing Angular 16 + Ionic 7 + Firebase stack is preserved; no new frameworks introduced
- All property tests use the existing Karma + Jasmine test runner with fast-check library

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.5", "4.2"] },
    { "id": 3, "tasks": ["2.4", "2.6", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3"] },
    { "id": 5, "tasks": ["5.4", "5.5", "7.1", "7.4"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.5", "7.6"] },
    { "id": 7, "tasks": ["7.7", "9.1", "9.2", "9.3"] },
    { "id": 8, "tasks": ["9.4", "9.5", "9.6"] }
  ]
}
```
