# Requirements Document

## Introduction

The User Engagement Layer transforms WIOF from a passive content website into an interactive platform where visitors can optionally create an identity, save content, and track their engagement. This is Phase 1 of the product roadmap — it establishes user accounts, personalization, and activity tracking as the foundation for future features (daily actions, missions, communities). All existing content remains fully accessible to anonymous visitors; login is additive and never gates content.

## Glossary

- **WIOF_App**: The Angular 16 + Ionic frontend application served via Firebase Hosting
- **Auth_Service**: The Angular service responsible for authentication operations using Firebase Authentication (AngularFireAuth compat mode)
- **User_Profile_Service**: The Angular service responsible for creating, reading, and updating user profile documents in Firestore
- **Activity_Service**: The Angular service responsible for recording user activity events to the Firestore activity_log collection
- **Saved_Content_Service**: The Angular service responsible for saving and retrieving bookmarked content from the Firestore user_saved_content collection
- **Header_Component**: The global navigation header component displayed on all pages
- **Onboarding_Overlay**: A dismissible overlay component shown to first-time visitors explaining WIOF and the Five Elements
- **My_Journey_Page**: A logged-in-only page displaying the user's engagement summary and saved content
- **Guest_User**: A visitor who has not signed in and uses WIOF anonymously
- **Authenticated_User**: A visitor who has signed in via Google and has a Firestore user profile
- **Admin_User**: A team member who signs in via email/password and accesses the admin dashboard
- **User_Profile_Document**: A Firestore document in the users collection containing profile and engagement data
- **Activity_Log_Entry**: A Firestore document in the activity_log collection recording a single user activity event
- **Saved_Content_Document**: A Firestore document in the user_saved_content collection linking a user to a bookmarked content item

## Requirements

### Requirement 1: Google Sign-In for Public Users

**User Story:** As a visitor, I want to sign in with my Google account, so that I can access personalization features without managing a separate password.

#### Acceptance Criteria

1. WHEN a Guest_User clicks the "Continue with Google" button, THE Auth_Service SHALL initiate a Google OAuth sign-in popup flow using Firebase Authentication
2. WHEN Google authentication completes successfully, THE Auth_Service SHALL persist the authentication session using Firebase local persistence so that the session survives browser tab closures and page refreshes, and update the application authentication state so that all UI components reflecting sign-in status render the authenticated view within 2 seconds
3. IF Google authentication fails or the user closes the sign-in popup, THEN THE Auth_Service SHALL display an inline error message on the sign-in page indicating the failure reason, retain the user on the current page without navigating away, and keep any previously entered form data intact
4. THE Auth_Service SHALL maintain the existing email/password sign-in method for Admin_User access at the /login route, separate from the public Google Sign-In flow
5. WHEN an Authenticated_User signs in via Google and no User_Profile_Document exists, THE User_Profile_Service SHALL create a new profile document in the Firestore `users` collection with uid, displayName, email, photoURL, joinedDate set to the current timestamp, loginCount set to 1, and lastLogin set to the current timestamp
6. WHEN an Authenticated_User signs in via Google and a User_Profile_Document already exists, THE User_Profile_Service SHALL update lastLogin to the current timestamp and increment loginCount by 1
7. IF the User_Profile_Service fails to create or update the User_Profile_Document after Google authentication succeeds, THEN THE Auth_Service SHALL still complete the sign-in (maintaining the authenticated session) and display a non-blocking toast notification indicating that profile synchronization failed

### Requirement 2: Guest Experience Preservation

**User Story:** As a visitor, I want to access all WIOF content without creating an account, so that I can browse freely and decide to sign up only if I see value.

#### Acceptance Criteria

1. THE WIOF_App SHALL render all blog pages, video pages, element pages, polls, coffee conversations, courses, news pages, and interactive widgets to Guest_User without requiring authentication
2. THE WIOF_App SHALL allow Guest_User to vote in polls without requiring authentication
3. THE WIOF_App SHALL allow Guest_User to use all interactive widgets (AQI, Food pH, EQ assessment, Water rainfall, Energy calculator) without requiring authentication, and SHALL display widget results within the current session without persisting them to any user profile
4. WHILE a Guest_User is browsing, THE WIOF_App SHALL display no full-page overlays, modals, or blocking elements that require sign-in before content is accessible, excluding the dismissible Onboarding_Overlay which does not require sign-in
5. WHEN a Guest_User interacts with a personalization feature (save content, view My Journey), THE WIOF_App SHALL display a non-blocking inline tooltip or banner adjacent to the triggering element suggesting sign-in, with a visible dismiss button that closes the prompt immediately and allows the guest to continue browsing the current page
6. WHEN a Guest_User dismisses a sign-in prompt, THE WIOF_App SHALL not display the same prompt again for that feature during the current browsing session

### Requirement 3: User Profile Storage

**User Story:** As a signed-in user, I want my profile information stored securely, so that the platform can personalize my experience across sessions.

#### Acceptance Criteria

1. THE User_Profile_Service SHALL store each User_Profile_Document in the Firestore users collection with the following fields: uid (string), displayName (string, maximum 100 characters), email (string), photoURL (string), joinedDate (timestamp), preferredElements (array, maximum 5 items), lastLogin (timestamp), loginCount (integer, minimum 0), daysVisited (integer, minimum 0), currentStreak (integer, minimum 0), and savedBlogsCount (integer, minimum 0)
2. WHEN an Authenticated_User visits the platform on a new calendar day (determined by the user's local timezone derived from the browser), THE User_Profile_Service SHALL increment daysVisited by 1, increment currentStreak by 1, and update lastLogin to the current timestamp
3. IF an Authenticated_User visits the platform and the lastLogin date is more than one calendar day before the current date (in the user's local timezone), THEN THE User_Profile_Service SHALL reset currentStreak to 1, increment daysVisited by 1, and update lastLogin to the current timestamp
4. WHEN an Authenticated_User visits the platform and the lastLogin date is the same calendar day as the current date (in the user's local timezone), THE User_Profile_Service SHALL update lastLogin to the current timestamp without modifying daysVisited or currentStreak
5. IF a Firestore write fails when updating the User_Profile_Document during a visit, THEN THE User_Profile_Service SHALL retain the user's authenticated session without interruption and shall not display an error to the user

### Requirement 4: Favorites and Saved Content

**User Story:** As a signed-in user, I want to bookmark blogs and videos, so that I can easily find content I want to revisit.

#### Acceptance Criteria

1. THE WIOF_App SHALL display a heart/bookmark icon on each blog card, blog detail page, video card, and video detail page
2. WHEN an Authenticated_User clicks the bookmark icon on an unsaved content item, THE Saved_Content_Service SHALL create a Saved_Content_Document in the user_saved_content collection containing userId, contentId, contentType (blog or video), contentTitle, contentThumbnail, and savedAt timestamp, and THE WIOF_App SHALL switch the bookmark icon to the filled/active state within 1 second
3. WHEN an Authenticated_User clicks the bookmark icon on an already-saved content item, THE Saved_Content_Service SHALL delete the corresponding Saved_Content_Document from the user_saved_content collection, and THE WIOF_App SHALL switch the bookmark icon to the unfilled/inactive state within 1 second
4. WHEN a Guest_User clicks the bookmark icon, THE WIOF_App SHALL display a contextual prompt with the text "Sign in to save this" and a "Continue with Google" action button
5. WHILE an Authenticated_User is viewing a content page, THE WIOF_App SHALL display the bookmark icon in a filled/active state for content the user has previously saved
6. THE WIOF_App SHALL provide a "My Saved" page listing Saved_Content_Documents for the Authenticated_User, ordered by savedAt descending, displaying a maximum of 20 items per page with the ability to load additional pages
7. IF the Saved_Content_Service fails to create or delete a Saved_Content_Document due to a network or server error, THEN THE WIOF_App SHALL revert the bookmark icon to its previous state and display an error message indicating the save operation could not be completed
8. WHEN an Authenticated_User navigates to the "My Saved" page and the list is empty, THE WIOF_App SHALL display an empty-state message indicating no content has been saved yet

### Requirement 5: My Journey Dashboard

**User Story:** As a signed-in user, I want a personal dashboard showing my engagement summary, so that I can see my progress and feel motivated to continue.

#### Acceptance Criteria

1. THE WIOF_App SHALL provide a My_Journey_Page accessible at the /my-journey route
2. WHEN a Guest_User navigates to /my-journey, THE WIOF_App SHALL redirect to the home page and display a non-blocking sign-in prompt with a "Continue with Google" action and a dismiss option
3. WHEN an Authenticated_User navigates to the My_Journey_Page, THE My_Journey_Page SHALL display the following engagement metrics: blogs read count, videos watched count, polls voted in count, last EQ assessment score with its completion date, saved content count, and currentStreak — displaying "0" for any count metric with no recorded activity and "Not yet taken" for the EQ assessment score when no eq_completion entry exists
4. THE My_Journey_Page SHALL retrieve engagement metrics from the Activity_Service by querying all activity_log entries for the current user's userId
5. THE My_Journey_Page SHALL display a list of the user's saved content ordered by savedAt descending, showing a maximum of 20 items with each item displaying content title, content type (blog or video), and a link to the content detail page
6. IF the Activity_Service or Saved_Content_Service fails to retrieve data, THEN THE My_Journey_Page SHALL display an inline error message indicating that engagement data could not be loaded and provide a retry action
7. WHEN an Authenticated_User with no saved content navigates to the My_Journey_Page, THE My_Journey_Page SHALL display an empty state message indicating no saved content yet with a prompt to explore content

### Requirement 6: Activity Tracking

**User Story:** As a signed-in user, I want my learning activities tracked, so that I can see a summary of my engagement over time.

#### Acceptance Criteria

1. WHEN an Authenticated_User opens a blog post, THE Activity_Service SHALL record an Activity_Log_Entry with userId, activityType set to "blog_read", contentId, and timestamp
2. WHEN an Authenticated_User opens a video page, THE Activity_Service SHALL record an Activity_Log_Entry with userId, activityType set to "video_view", contentId, and timestamp
3. WHEN an Authenticated_User submits a poll vote, THE Activity_Service SHALL record an Activity_Log_Entry with userId, activityType set to "poll_vote", contentId, and timestamp
4. WHEN an Authenticated_User completes the EQ assessment, THE Activity_Service SHALL record an Activity_Log_Entry with userId, activityType set to "eq_completion", score, and timestamp
5. WHEN an Authenticated_User interacts with an element widget, THE Activity_Service SHALL record an Activity_Log_Entry with userId, activityType set to "widget_usage", widgetName, and timestamp
6. THE Activity_Service SHALL not record any activity for Guest_User interactions
7. THE Activity_Service SHALL deduplicate blog_read and video_view entries by recording a maximum of one entry per userId per contentId per calendar day

### Requirement 7: Onboarding Welcome Tour

**User Story:** As a first-time visitor, I want a brief introduction to WIOF and its Five Elements, so that I can understand the platform's purpose and navigate effectively.

#### Acceptance Criteria

1. WHEN a visitor loads the WIOF_App for the first time and no "wiof_onboarding_seen" key exists in localStorage, THE Onboarding_Overlay SHALL display automatically within 1 second of the page completing its initial render
2. THE Onboarding_Overlay SHALL present the following content sections: a one-paragraph explanation of WIOF's purpose (maximum 200 characters), a list of the Five Elements (Earth, Water, Air, Energy, Spirit) each with a name and a single-sentence description, and a summary of available features (blogs, videos, polls, interactive widgets)
3. THE Onboarding_Overlay SHALL be dismissible via a visible close button (top-right corner) or a "Got it" action button (bottom of the overlay)
4. WHEN the user dismisses the Onboarding_Overlay, THE WIOF_App SHALL set the "wiof_onboarding_seen" key in localStorage to "true"
5. WHILE the "wiof_onboarding_seen" key in localStorage equals "true", THE WIOF_App SHALL not display the Onboarding_Overlay
6. THE Onboarding_Overlay SHALL render as a non-modal panel that does not disable scrolling or interaction with the underlying page — the user SHALL be able to dismiss the overlay at any time without completing the tour
7. THE Onboarding_Overlay SHALL display regardless of authentication status (both Guest_User and Authenticated_User)
8. THE Onboarding_Overlay SHALL support keyboard dismissal via the Escape key, maintain a visible focus indicator on interactive elements, and include appropriate ARIA attributes (role="dialog" and aria-label) for screen reader accessibility
9. IF localStorage is unavailable or throws an error when reading or writing the "wiof_onboarding_seen" key, THEN THE WIOF_App SHALL not display the Onboarding_Overlay and SHALL not prevent normal page usage

### Requirement 9: Modern Design Consistency

**User Story:** As a user, I want the new engagement features to visually match the existing modern design of the site, so that the experience feels cohesive and polished.

#### Acceptance Criteria

1. All new UI components (sign-in prompts, onboarding overlay, My Journey page, My Saved page, bookmark icons, avatar dropdown) SHALL follow the existing WIOF design language: glass-morphism effects, soft shadows, rounded corners (8-12px radius), and the established pastel color palette
2. All new pages and components SHALL use loading skeletons (matching existing skeleton patterns) while data is being fetched, rather than blank screens or text-based loading indicators
3. All new interactive elements SHALL include smooth CSS transitions (200-300ms) for state changes such as bookmark toggling, dropdown appearing, and overlay entrance/exit
4. The onboarding overlay, sign-in prompts, and dropdown menu SHALL use backdrop blur and semi-transparent backgrounds consistent with the existing privacy consent bar and subscribe section design
5. The My Journey page and My Saved page SHALL use card-based layouts consistent with the existing blog cards, element page cards, and admin dashboard summary cards
6. All new components SHALL be fully responsive, following the existing mobile-first approach with proper padding, no horizontal overflow, and consistent card widths across breakpoints (matching existing site patterns)
7. Typography in new components SHALL use the existing font stack and size scale already established in the WIOF custom theming SCSS

### Requirement 10: Header Navigation Updates

**User Story:** As a user, I want clear navigation options reflecting my authentication state, so that I can access my personal features or sign in easily.

#### Acceptance Criteria

1. WHILE a Guest_User is browsing, THE Header_Component SHALL display a "Sign In" button in the navigation area
2. WHILE an Authenticated_User is browsing, THE Header_Component SHALL display the user's profile photo as a circular avatar of 32px diameter in place of the "Sign In" button
3. IF an Authenticated_User's profile photo URL is unavailable or fails to load, THEN THE Header_Component SHALL display a circular placeholder containing the first letter of the user's displayName in place of the photo
4. WHEN an Authenticated_User clicks the avatar, THE Header_Component SHALL display a dropdown menu with the following items in order: My Journey, Saved, Settings, and Logout
5. WHEN the dropdown menu is open and the Authenticated_User clicks outside of it or presses the Escape key, THE Header_Component SHALL close the dropdown menu
6. WHEN an Authenticated_User clicks "Logout" in the dropdown menu, THE Auth_Service SHALL sign out the user and THE Header_Component SHALL revert to displaying the "Sign In" button
7. THE Header_Component SHALL preserve the existing /login route for Admin_User access without modification — no public-facing link to /login SHALL be added to the navigation
8. WHEN a Guest_User clicks the "Sign In" button in the header, THE Auth_Service SHALL initiate the Google OAuth sign-in flow directly without navigating to a separate login page
9. THE Header_Component authentication UI SHALL render correctly on viewport widths from 320px to 2560px, collapsing into the mobile menu on viewports narrower than 768px
