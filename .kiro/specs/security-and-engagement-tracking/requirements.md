# Requirements Document

## Introduction

This feature hardens the security posture of the WIOF platform and deepens engagement tracking capabilities. Security hardening introduces role-based access control to differentiate admin users from public Google-signed-in users, tightens Firestore security rules so users can only modify their own documents, restricts admin collections to admin-role writes, and adds rate limiting on high-frequency write paths. Enhanced engagement tracking adds smart blog read completion detection (scroll depth + time spent), EQ score history persistence with dimension breakdowns, and poll vote history linked to user accounts. These enhancements surface richer data on the My Journey page.

## Glossary

- **WIOF_App**: The Angular 16 + Ionic 7 frontend application served via Firebase Hosting
- **Auth_Service**: The Angular service responsible for authentication operations using Firebase Authentication (AngularFireAuth compat mode)
- **Auth_Guard**: The route guard at src/app/guards/auth.guard.ts protecting the /admin-dashboard route
- **Public_User_Guard**: The route guard at src/app/guards/public-user.guard.ts protecting public user routes (/my-journey, /my-saved)
- **User_Profile_Service**: The Angular service responsible for creating, reading, and updating user profile documents in Firestore
- **Activity_Service**: The Angular service responsible for recording user activity events to the Firestore activity_log collection
- **Firestore_Rules**: The security rules defined in firestore.rules governing read/write access to all collections
- **Admin_User**: A team member who signs in via email/password, has a User_Profile_Document with role field set to "admin", and manages content via the admin dashboard
- **Public_User**: A visitor who has signed in via Google OAuth and has a User_Profile_Document with role field set to "public"
- **Guest_User**: A visitor who has not signed in and uses WIOF anonymously
- **User_Profile_Document**: A Firestore document in the users collection containing profile, role, and engagement data
- **Activity_Log_Entry**: A Firestore document in the activity_log collection recording a single user activity event
- **Admin_Collection**: Any of the following Firestore collections managed exclusively by admins: Blogs, News, CoffeeConversations, InFocus, NGOinFocus, CourseInFocus, Envcal, AboutUs, AboutUsProfiles
- **Blog_Read_Tracker**: A client-side component embedded in the blog detail page that monitors scroll depth and time spent
- **Scroll_Depth**: The percentage of the blog article body the user has scrolled past, measured from 0 to 100
- **Time_To_Read**: The estimated reading time in seconds for a blog post, calculated based on word count
- **Quality_Read_Threshold**: The combined condition of Scroll_Depth exceeding 75% AND time spent on the page exceeding Time_To_Read multiplied by 0.6
- **EQ_Dimension_Breakdown**: The raw scores for Attention, Clarity, and Reparation dimensions of the EQ assessment
- **Poll_Response_Document**: A Firestore document in a poll_responses sub-collection or field linking a user's vote to their userId and email
- **My_Journey_Page**: A logged-in-only page displaying the user's engagement summary, EQ history, poll history, and quality read metrics
- **Rate_Limiter**: A Firestore security rule mechanism or client-side throttle that restricts the number of write operations a user can perform within a defined time window

## Requirements

### Requirement 1: Role-Based User Profile Enhancement

**User Story:** As a platform administrator, I want user profiles to include a role field distinguishing admins from public users, so that the system can enforce access control based on user type.

#### Acceptance Criteria

1. THE User_Profile_Service SHALL store a "role" field on each User_Profile_Document with a value of either "admin" or "public"
2. WHEN a new User_Profile_Document is created via Google OAuth sign-in, THE User_Profile_Service SHALL set the role field to "public"
3. WHEN an Admin_User signs in via email/password, THE User_Profile_Service SHALL verify that the corresponding User_Profile_Document has the role field set to "admin"
4. THE User_Profile_Service SHALL reject any client-side request to modify the role field on a User_Profile_Document — role changes SHALL only be possible through direct Firestore console or server-side admin operations
5. IF a User_Profile_Document exists without a role field (legacy data), THEN THE User_Profile_Service SHALL treat the user as "public" for all access control decisions

### Requirement 2: Admin Route Protection

**User Story:** As a platform administrator, I want the admin dashboard protected by role verification, so that Google-signed-in public users cannot access administrative functionality.

#### Acceptance Criteria

1. WHEN a user navigates to the /admin-dashboard route, THE Auth_Guard SHALL verify that the user is authenticated AND that the user's User_Profile_Document has the role field set to "admin"
2. IF an authenticated user with role "public" attempts to navigate to /admin-dashboard, THEN THE Auth_Guard SHALL redirect the user to the /home route and display a toast notification with the message "Access denied: Admin privileges required"
3. IF an unauthenticated user attempts to navigate to /admin-dashboard, THEN THE Auth_Guard SHALL redirect the user to the /login route
4. WHEN a Public_User attempts to perform an admin write operation (create, update, or delete on any Admin_Collection), THE WIOF_App SHALL reject the operation on the client side before sending the request to Firestore
5. THE Auth_Guard SHALL retrieve the user's role from the User_Profile_Document using a single Firestore read and cache the result for the duration of the session to avoid redundant reads on subsequent navigations

### Requirement 3: Firestore Security Rules Tightening

**User Story:** As a platform administrator, I want Firestore rules to enforce that users can only modify their own documents and only admins can write to content collections, so that unauthorized data modifications are prevented at the database level.

#### Acceptance Criteria

1. THE Firestore_Rules SHALL restrict write access on the users collection so that an authenticated user can only create or update documents where the document ID matches the authenticated user's UID
2. THE Firestore_Rules SHALL restrict write access on the user_saved_content collection so that an authenticated user can only create, update, or delete documents where the userId field matches the authenticated user's UID
3. THE Firestore_Rules SHALL restrict write access on the activity_log collection so that an authenticated user can only create documents where the userId field matches the authenticated user's UID
4. THE Firestore_Rules SHALL restrict write access on all Admin_Collection documents (Blogs, News, CoffeeConversations, InFocus, NGOinFocus, CourseInFocus, Envcal, AboutUs, AboutUsProfiles) so that only authenticated users whose User_Profile_Document has role set to "admin" can perform create, update, or delete operations
5. THE Firestore_Rules SHALL allow all users (authenticated and unauthenticated) to read documents from Admin_Collection documents
6. THE Firestore_Rules SHALL allow the Subscriptions and Polls collections to remain publicly writable for guest poll voting and newsletter subscription functionality
7. THE Firestore_Rules SHALL deny delete operations on the activity_log collection for all users — activity log entries SHALL be append-only

### Requirement 4: Rate Limiting on User Write Paths

**User Story:** As a platform administrator, I want write operations on activity_log and user_saved_content to be rate-limited, so that compromised accounts or automated scripts cannot flood the database.

#### Acceptance Criteria

1. THE Firestore_Rules SHALL restrict activity_log writes so that an authenticated user can create a maximum of 1 document per second per userId, enforced by requiring the timestamp field to be at least 1 second later than the most recent entry for that user
2. THE Firestore_Rules SHALL restrict user_saved_content writes so that an authenticated user can create or delete a maximum of 1 document per second per userId
3. THE Activity_Service SHALL implement client-side throttling that buffers activity events and writes a maximum of 1 activity_log document per second per user session
4. IF a write to activity_log or user_saved_content is rejected by the rate limit, THEN THE WIOF_App SHALL silently discard the event without displaying an error to the user and SHALL retry the write after a 2-second delay for a maximum of 2 retry attempts

### Requirement 5: Smart Blog Read Completion Tracking

**User Story:** As a signed-in user, I want my blog reads tracked based on actual reading engagement, so that my journey dashboard reflects content I genuinely consumed rather than pages I briefly opened.

#### Acceptance Criteria

1. WHEN an Authenticated_User opens a blog detail page, THE Blog_Read_Tracker SHALL begin monitoring Scroll_Depth and elapsed time on the page
2. THE Blog_Read_Tracker SHALL calculate Scroll_Depth as the percentage of the blog article content container that has scrolled past the viewport top, measured in increments of 5 percentage points
3. THE Blog_Read_Tracker SHALL calculate Time_To_Read for the blog post as the total word count of the article body divided by 200 (average words per minute), converted to seconds
4. WHEN Scroll_Depth exceeds 75 AND elapsed time on the page exceeds Time_To_Read multiplied by 0.6, THE Activity_Service SHALL record an Activity_Log_Entry with activityType set to "blog_read_complete", userId, contentId, scrollDepth (integer 0-100), timeSpent (integer, seconds), and timestamp
5. THE Activity_Service SHALL record a maximum of one "blog_read_complete" entry per userId per contentId regardless of how many times the user revisits the same blog post
6. THE Blog_Read_Tracker SHALL continue monitoring after a "blog_read_complete" event fires but SHALL NOT record additional entries for the same contentId
7. IF the user navigates away from the blog detail page before meeting the Quality_Read_Threshold, THEN THE Blog_Read_Tracker SHALL not record a "blog_read_complete" entry
8. THE Blog_Read_Tracker SHALL only operate for Authenticated_User sessions — Guest_User reading behavior SHALL not be tracked

### Requirement 6: EQ Score History Persistence

**User Story:** As a signed-in user, I want my EQ assessment results stored with full dimension breakdowns, so that I can track how my emotional intelligence evolves over time.

#### Acceptance Criteria

1. WHEN an Authenticated_User completes the EQ assessment, THE Activity_Service SHALL record an Activity_Log_Entry with activityType set to "eq_completion", userId, timestamp, overall score (integer), and an eqDimensions object containing attentionScore (integer), clarityScore (integer), and reparationScore (integer)
2. THE Activity_Service SHALL store each EQ assessment completion as a separate Activity_Log_Entry — multiple completions by the same user SHALL each create a new entry with its own timestamp
3. WHEN an Authenticated_User navigates to the My_Journey_Page, THE My_Journey_Page SHALL display a chronological history of all "eq_completion" entries for that user, showing date, overall score, and individual dimension scores (Attention, Clarity, Reparation)
4. WHEN an Authenticated_User has multiple EQ completions, THE My_Journey_Page SHALL display the most recent score prominently and list previous scores in reverse chronological order
5. IF an Authenticated_User has no "eq_completion" entries, THEN THE My_Journey_Page SHALL display "Not yet taken" in the EQ history section with a prompt to take the assessment

### Requirement 7: Poll Vote Tracking Enhancement

**User Story:** As a user, I want my poll votes remembered and linked to my account, so that I can see how I voted on revisit and review my poll history.

#### Acceptance Criteria

1. WHEN an Authenticated_User submits a poll vote, THE WIOF_App SHALL automatically use the user's email from the authenticated session without prompting for email input
2. WHEN a Guest_User submits a poll vote, THE WIOF_App SHALL display an optional email input field on the poll form with placeholder text "Email (optional)" allowing the guest to provide an email address
3. WHEN a poll vote is submitted by an Authenticated_User, THE Activity_Service SHALL record an Activity_Log_Entry with activityType set to "poll_vote", userId, contentId (poll identifier), selectedOption (the voted option text), userEmail, and timestamp
4. WHEN an Authenticated_User revisits a poll page where the user has previously voted, THE WIOF_App SHALL display an indicator showing "You voted for: [selectedOption]" and disable the vote submission for that poll
5. WHEN an Authenticated_User navigates to the My_Journey_Page, THE My_Journey_Page SHALL display a poll history section listing all "poll_vote" entries with poll title, selected option, and vote date in reverse chronological order
6. THE WIOF_App SHALL continue to allow Guest_User poll voting without authentication — the optional email field SHALL not block form submission if left empty
7. IF a Guest_User provides an email while voting and later signs in with Google using the same email, THEN THE WIOF_App SHALL NOT automatically link the guest vote to the authenticated profile — votes are linked only by userId at the time of submission

### Requirement 8: My Journey Page Enhancements for New Metrics

**User Story:** As a signed-in user, I want my journey page to show quality read metrics, EQ history, and poll history, so that I have a comprehensive view of my engagement.

#### Acceptance Criteria

1. WHEN an Authenticated_User navigates to the My_Journey_Page, THE My_Journey_Page SHALL display a "Quality Reads" section showing the count of "blog_read_complete" entries and a list of blog titles the user has fully read
2. WHEN an Authenticated_User navigates to the My_Journey_Page, THE My_Journey_Page SHALL display an "EQ History" section showing all EQ assessment completions with date, overall score, and dimension breakdown (Attention, Clarity, Reparation)
3. WHEN an Authenticated_User navigates to the My_Journey_Page, THE My_Journey_Page SHALL display a "Poll History" section showing all poll votes with poll title, selected option, and date
4. THE My_Journey_Page SHALL differentiate between "blog_read" (page opened) count and "blog_read_complete" (quality read) count, displaying both metrics with distinct labels
5. IF the My_Journey_Page has no entries for a given section (Quality Reads, EQ History, or Poll History), THEN THE My_Journey_Page SHALL display an appropriate empty-state message specific to that section
6. THE My_Journey_Page SHALL load engagement data in parallel for all sections and display a loading skeleton for each section independently until its data arrives
