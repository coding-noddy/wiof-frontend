# Implementation Plan: User Engagement Layer

## Overview

This plan implements the User Engagement Layer for the WIOF Angular 16 + Ionic application. It introduces Google OAuth sign-in for public users, Firestore-backed user profiles with streak tracking, content bookmarking, activity logging, a personal dashboard (My Journey), a saved content page (My Saved), and a first-time onboarding overlay. All new components follow the existing glass-morphism design language and lazy-loaded module architecture.

## Tasks

- [x] 1. Set up core services and data models
  - [x] 1.1 Create UserProfileService with Firestore integration
    - Create `src/app/services/user-profile.service.ts`
    - Implement `UserProfile` interface with all required fields (uid, displayName, email, photoURL, joinedDate, preferredElements, lastLogin, loginCount, daysVisited, currentStreak, savedBlogsCount)
    - Implement `createProfile(user)` method that creates a new user document in the `users` collection
    - Implement `updateLoginMetrics(uid)` method that increments loginCount and updates lastLogin
    - Implement `recordVisit(uid)` method with streak calculation logic (same day → no change, consecutive day → increment, gap > 1 → reset to 1)
    - Implement `getProfile(uid)` and `updatePreferredElements(uid, elements)` methods
    - Use `AngularFirestore` compat mode, `providedIn: 'root'`
    - _Requirements: 1.5, 1.6, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 1.2 Write property tests for UserProfileService (Profile Document Integrity)
    - **Property 1: Profile Document Integrity**
    - **Validates: Requirements 1.5, 3.1**
    - Use fast-check to generate random Firebase user objects
    - Verify resulting UserProfile has all required fields, correct types, displayName ≤ 100 chars, preferredElements ≤ 5 items, integer fields ≥ 0

  - [ ]* 1.3 Write property tests for login count increment
    - **Property 2: Login Count Monotonic Increment**
    - **Validates: Requirements 1.6**
    - Use fast-check to generate random existing profiles with varying loginCount
    - Verify after update: loginCount = N + 1 and lastLogin is updated

  - [ ]* 1.4 Write property tests for visit streak state machine
    - **Property 3: Visit Streak State Machine**
    - **Validates: Requirements 3.2, 3.3, 3.4**
    - Use fast-check to generate random (lastLogin, currentDate, timezone) tuples
    - Verify all three branches: same day → no change, consecutive → increment, gap → reset to 1

  - [x] 1.5 Create ActivityService with deduplication logic
    - Create `src/app/services/activity.service.ts`
    - Implement `ActivityLogEntry` and `ActivityLogInput` interfaces
    - Implement `logActivity(entry)` with fire-and-forget error handling
    - Implement deduplication: max one blog_read / video_view per userId + contentId + calendar day
    - Implement `getActivitiesForUser(userId)` and `getActivityCounts(userId)` for metrics aggregation
    - Use `calendarDay` field ("YYYY-MM-DD") for deduplication queries
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 1.6 Write property tests for activity deduplication
    - **Property 11: Activity Deduplication**
    - **Validates: Requirements 6.7**
    - Use fast-check to generate repeated same-day interactions
    - Verify at most one blog_read and one video_view per userId + contentId + calendar day

  - [ ]* 1.7 Write property tests for activity logging correctness
    - **Property 9: Activity Logging Correctness**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
    - Use fast-check to generate random authenticated user interactions
    - Verify entries contain correct userId, activityType, timestamp not in future, and appropriate fields (contentId, widgetName, score)

  - [ ]* 1.8 Write property tests for guest activity exclusion
    - **Property 10: Guest Activity Exclusion**
    - **Validates: Requirements 6.6**
    - Use fast-check to generate random guest interactions
    - Verify zero new activity_log entries created

  - [x] 1.9 Create SavedContentService with optimistic update pattern
    - Create `src/app/services/saved-content.service.ts`
    - Implement `SavedContentDocument` and `SaveContentInput` interfaces
    - Implement `saveContent(item)` creating a document in `user_saved_content` collection
    - Implement `unsaveContent(userId, contentId)` deleting the matching document
    - Implement `isContentSaved(userId, contentId)` returning an Observable<boolean>
    - Implement `getSavedContent(userId, pageSize, lastDoc?)` with pagination (max 20 per page, ordered by savedAt descending)
    - Implement `getSavedContentIds(userId)` returning Observable<Set<string>> for efficient lookup
    - Enforce one document per userId + contentId pair in code
    - _Requirements: 4.2, 4.3, 4.5, 4.6_

  - [ ]* 1.10 Write property tests for SavedContentService
    - **Property 4: Save Content Document Creation**
    - **Property 5: Unsave Content Removes Document**
    - **Property 7: Saved Content Ordering and Pagination**
    - **Validates: Requirements 4.2, 4.3, 4.6, 5.5**
    - Use fast-check to generate random content items and verify document fields, removal, ordering, and page size constraints

- [x] 2. Enhance AuthService with Google Sign-In
  - [x] 2.1 Add Google OAuth sign-in to existing AuthService
    - Modify `src/app/services/auth.service.ts`
    - Add `signInWithGoogle()` method using `AngularFireAuth.signInWithPopup(new GoogleAuthProvider())`
    - Add `currentUser$` Observable and `isAuthenticated$` derived Observable
    - On successful Google sign-in, call `UserProfileService.createOrUpdateProfile()`
    - If profile sync fails, show non-blocking toast but keep auth session alive
    - Preserve existing `login(email, password)` for admin access
    - Set Firebase persistence to local (survives tab close)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 2.2 Write unit tests for AuthService Google sign-in flow
    - Test popup initiation
    - Test success path (profile created for new user, metrics updated for returning user)
    - Test failure/cancellation (error message shown, user stays on page)
    - Test profile sync failure (auth persists, toast shown)
    - _Requirements: 1.1, 1.2, 1.3, 1.7_

- [x] 3. Checkpoint - Ensure all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Header Navigation Updates
  - [x] 4.1 Create AvatarDropdownComponent
    - Create `src/app/components/avatar-dropdown/` (component, template, SCSS, spec)
    - Display user photo as 32px circular avatar
    - Implement fallback: if photoURL fails to load, show circular placeholder with first letter of displayName (uppercase)
    - Dropdown menu items: My Journey, Saved, Settings, Logout
    - Close dropdown on outside click or Escape key press
    - Logout calls `AuthService.logout()` and reverts header to "Sign In" button
    - Apply glass-morphism styling (backdrop blur, semi-transparent background, rounded corners)
    - Smooth CSS transition (200-300ms) for dropdown entrance/exit
    - Responsive: collapses into mobile menu below 768px
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.9, 9.1, 9.3_

  - [ ]* 4.2 Write property test for avatar fallback derivation
    - **Property 13: Avatar Fallback Derivation**
    - **Validates: Requirements 10.3**
    - Use fast-check to generate random displayNames and broken photo URLs
    - Verify the placeholder shows uppercase first character of displayName

  - [x] 4.3 Update HeaderComponent with auth-aware navigation
    - Modify existing Header_Component
    - When guest: display "Sign In" button that triggers `AuthService.signInWithGoogle()` directly (no page navigation)
    - When authenticated: display `app-avatar-dropdown` in place of "Sign In" button
    - Preserve existing admin /login route (no public link added)
    - Responsive rendering: 320px–2560px, mobile menu below 768px
    - _Requirements: 10.1, 10.2, 10.7, 10.8, 10.9_

  - [ ]* 4.4 Write unit tests for HeaderComponent auth state rendering
    - Test guest state shows "Sign In" button
    - Test authenticated state shows avatar dropdown
    - Test "Sign In" button triggers Google OAuth flow
    - _Requirements: 10.1, 10.2, 10.8_

- [x] 5. Implement Onboarding Overlay
  - [x] 5.1 Create OnboardingOverlayComponent
    - Create `src/app/components/onboarding-overlay/` (component, template, SCSS, spec)
    - Display on first visit when `localStorage.getItem('wiof_onboarding_seen')` is null
    - Content: WIOF purpose paragraph (≤200 chars), Five Elements list with descriptions, available features summary
    - Dismissible via close button (top-right) or "Got it" button (bottom)
    - On dismiss: set `localStorage.setItem('wiof_onboarding_seen', 'true')`
    - Non-modal: no scroll lock, user can interact with page beneath
    - Keyboard accessible: Escape key dismissal, visible focus indicators, `role="dialog"`, `aria-label`
    - Smooth entrance/exit CSS transitions (200-300ms)
    - Glass-morphism styling: backdrop blur, semi-transparent background, rounded corners
    - If localStorage unavailable/throws: do not display overlay, do not error
    - Display within 1 second of page initial render
    - Works for both Guest_User and Authenticated_User
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 9.1, 9.3, 9.4_

  - [ ]* 5.2 Write unit tests for OnboardingOverlayComponent
    - Test overlay appears when localStorage key absent
    - Test overlay hidden when localStorage key is "true"
    - Test dismiss sets localStorage key
    - Test Escape key dismissal
    - Test localStorage error handling (no overlay, no error)
    - Test ARIA attributes present
    - _Requirements: 7.1, 7.4, 7.5, 7.8, 7.9_

- [x] 6. Implement Bookmark and Sign-In Prompt Components
  - [x] 6.1 Create BookmarkIconComponent
    - Create `src/app/components/bookmark-icon/` (component, template, SCSS, spec)
    - Inputs: contentId, contentType, contentTitle, contentThumbnail
    - Display heart/bookmark icon on blog cards, blog detail, video cards, video detail
    - When authenticated + unsaved: unfilled state → click saves → filled state within 1s
    - When authenticated + saved: filled state → click unsaves → unfilled state within 1s
    - When guest: click shows `app-sign-in-prompt` with "Sign in to save this" + "Continue with Google" button
    - On network error: revert icon to previous state, show error message
    - Smooth CSS transition for state toggle (200-300ms)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 9.3_

  - [ ]* 6.2 Write property test for bookmark state consistency
    - **Property 6: Bookmark State Consistency**
    - **Validates: Requirements 4.5**
    - Use fast-check to generate random saved/unsaved content sets for a user
    - Verify bookmark filled state equals true iff a SavedContentDocument exists for that userId + contentId

  - [x] 6.3 Create SignInPromptComponent
    - Create `src/app/components/sign-in-prompt/` (component, template, SCSS, spec)
    - Non-blocking inline tooltip/banner adjacent to triggering element
    - Visible dismiss button that closes immediately
    - After dismiss: same prompt not shown again for that feature during current session (tracked in component state or session storage)
    - "Continue with Google" action button triggers `AuthService.signInWithGoogle()`
    - Glass-morphism styling consistent with existing consent bar
    - _Requirements: 2.5, 2.6, 9.1, 9.4_

  - [ ]* 6.4 Write property test for guest prompt session persistence
    - **Property 12: Guest Prompt Session Persistence**
    - **Validates: Requirements 2.6**
    - Use fast-check to generate dismiss + re-trigger sequences
    - Verify dismissed prompts do not re-display within the same session

  - [ ]* 6.5 Write unit tests for BookmarkIconComponent and SignInPromptComponent
    - Test authenticated save/unsave flow
    - Test guest click shows sign-in prompt
    - Test network error rollback
    - Test prompt dismissal hides prompt for session
    - _Requirements: 4.2, 4.3, 4.4, 4.7, 2.5, 2.6_

- [~] 7. Checkpoint - Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement My Journey Page
  - [x] 8.1 Create MyJourneyPage module and component
    - Create `src/app/pages/my-journey/` (module, page component, template, SCSS, spec, routing module)
    - Lazy-loaded module at route `/my-journey`
    - Display engagement metrics: blogs read count, videos watched count, polls voted count, last EQ score with date (or "Not yet taken"), saved content count, currentStreak
    - Display "0" for metrics with no activity
    - Retrieve metrics via `ActivityService.getActivityCounts(userId)`
    - Display saved content list (max 20, ordered by savedAt desc) with title, type, link to detail page
    - Empty state: message "No saved content yet" with prompt to explore
    - Loading state: skeleton cards matching existing patterns
    - Error state: inline error with retry button
    - Card-based layout consistent with existing blog/element cards
    - Fully responsive, mobile-first, no horizontal overflow
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.7, 9.1, 9.2, 9.5, 9.6_

  - [ ]* 8.2 Write property test for activity metrics aggregation
    - **Property 8: Activity Metrics Aggregation**
    - **Validates: Requirements 5.3**
    - Use fast-check to generate random activity_log entries for a user
    - Verify computed metrics: blogs_read = count of blog_read entries, videos_watched = count of video_view, polls_voted = count of poll_vote, last EQ score = score from most recent eq_completion

  - [ ]* 8.3 Write unit tests for MyJourneyPage
    - Test metrics display with mock data
    - Test empty state rendering
    - Test error state with retry
    - Test loading skeleton display
    - _Requirements: 5.3, 5.6, 5.7_

- [x] 9. Implement My Saved Page
  - [x] 9.1 Create MySavedPage module and component
    - Create `src/app/pages/my-saved/` (module, page component, template, SCSS, spec, routing module)
    - Lazy-loaded module at route `/my-saved`
    - Display paginated list of saved content (max 20 per page) ordered by savedAt descending
    - Each item shows: content title, content type badge (blog/video), thumbnail, link to content detail
    - "Load more" button for additional pages
    - Empty state: message indicating no content saved yet
    - Loading state: skeleton cards
    - Card-based layout, fully responsive
    - _Requirements: 4.6, 4.8, 9.1, 9.2, 9.5, 9.6_

  - [ ]* 9.2 Write unit tests for MySavedPage
    - Test paginated content display
    - Test empty state rendering
    - Test "Load more" button fetches next page
    - _Requirements: 4.6, 4.8_

- [x] 10. Implement PublicUserGuard and Route Wiring
  - [x] 10.1 Create PublicUserGuard
    - Create `src/app/guards/public-user.guard.ts`
    - Implement `canActivate()`: if user not authenticated, redirect to `/home` and trigger sign-in prompt toast
    - Distinguish from existing `AuthGuard` (which redirects to `/login` for admin)
    - _Requirements: 5.2_

  - [x] 10.2 Wire new routes in AppRoutingModule
    - Add `/my-journey` route with lazy-loaded `MyJourneyPageModule` and `PublicUserGuard`
    - Add `/my-saved` route with lazy-loaded `MySavedPageModule` and `PublicUserGuard`
    - Preserve all existing routes unchanged
    - _Requirements: 5.1, 5.2_

  - [ ]* 10.3 Write unit tests for PublicUserGuard
    - Test authenticated user can access route
    - Test guest user redirected to home with toast
    - _Requirements: 5.2_

- [x] 11. Integrate Activity Tracking into Content Pages
  - [x] 11.1 Add activity logging calls to blog, video, poll, EQ, and widget pages
    - In blog detail page: call `ActivityService.logActivity({ activityType: 'blog_read', contentId, userId })` on page open
    - In video detail page: call `ActivityService.logActivity({ activityType: 'video_view', contentId, userId })` on page open
    - In poll component: call `ActivityService.logActivity({ activityType: 'poll_vote', contentId, userId })` on vote submit
    - In EQ assessment: call `ActivityService.logActivity({ activityType: 'eq_completion', score, userId })` on completion
    - In element widgets: call `ActivityService.logActivity({ activityType: 'widget_usage', widgetName, userId })` on interaction
    - Skip logging for guest users (check `AuthService.isAuthenticated$`)
    - Fire-and-forget pattern: failures logged to console but never block UI
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 11.2 Add BookmarkIconComponent to blog and video cards/detail pages
    - Add `<app-bookmark-icon>` to existing blog card component, blog detail page, video card component, and video detail page
    - Pass contentId, contentType, contentTitle, contentThumbnail as inputs
    - _Requirements: 4.1_

- [x] 12. Implement Guest Experience Preservation
  - [x] 12.1 Add OnboardingOverlayComponent to AppComponent
    - Include `<app-onboarding-overlay>` in the root app component template
    - Ensure overlay displays on first visit for both guest and authenticated users
    - Verify no content is gated behind authentication
    - _Requirements: 7.1, 7.7, 2.1, 2.2, 2.3, 2.4_

  - [x] 12.2 Add visit recording to app initialization
    - In `AppComponent.ngOnInit()` or via an APP_INITIALIZER, subscribe to `AuthService.currentUser$`
    - When authenticated user detected, call `UserProfileService.recordVisit(uid)`
    - Handle errors silently (fire-and-forget)
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [~] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- All new components use the existing glass-morphism design language (backdrop blur, semi-transparent backgrounds, rounded corners 8-12px, pastel palette)
- All services use `providedIn: 'root'` and AngularFirestore compat mode
- Feature pages (My Journey, My Saved) are lazy-loaded modules
- Activity logging always uses fire-and-forget pattern — never blocks user experience

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.5", "1.9"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.6", "1.7", "1.8", "1.10", "2.1"] },
    { "id": 2, "tasks": ["2.2", "4.1", "5.1", "6.1", "6.3"] },
    { "id": 3, "tasks": ["4.2", "4.3", "5.2", "6.2", "6.4", "6.5"] },
    { "id": 4, "tasks": ["4.4", "10.1", "8.1", "9.1"] },
    { "id": 5, "tasks": ["8.2", "8.3", "9.2", "10.2", "10.3"] },
    { "id": 6, "tasks": ["11.1", "11.2", "12.1", "12.2"] }
  ]
}
```
