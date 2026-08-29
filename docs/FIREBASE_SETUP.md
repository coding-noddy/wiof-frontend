# Firebase Configuration for User Engagement Layer

This document outlines all changes made on the Firebase/GCP side to support the User Engagement Layer feature.

## 1. Firebase Authentication

### Enable Google Sign-In Provider
1. Go to **Firebase Console** → **wiof-staging** → **Authentication** → **Sign-in method**
2. Enable **Google** provider
3. Set a support email address
4. Save

### Create OAuth 2.0 Client ID (if auto-created one was deleted)
1. Go to **Google Cloud Console** → Project: **wiof-staging**
2. Navigate to **APIs & Services** → **Credentials**
3. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
4. Application type: **Web application**
5. Name: `Web client for Firebase Auth`
6. Authorized redirect URIs:
   - `https://wiof-staging.firebaseapp.com/__/auth/handler`
   - (For production: `https://worldisonefamily.com/__/auth/handler`)
7. Copy the generated Client ID
8. Paste it in Firebase Console → Authentication → Google provider → **Web client ID** field

### OAuth Consent Screen (if not configured)
1. GCP Console → APIs & Services → **OAuth consent screen**
2. User type: **External**
3. App name: `World Is One Family`
4. Support email: your email
5. Authorized domains: `wiof-staging.firebaseapp.com`, `worldisonefamily.com`
6. Save

### Authorized Domains
Ensure these are listed in Firebase Console → Authentication → Settings → Authorized domains:
- `localhost` (for development)
- `wiof-staging.firebaseapp.com`
- `worldisonefamily.com` (production)

---

## 2. Firestore Database

### New Collections (auto-created on first write)

| Collection | Document Key | Purpose |
|------------|-------------|---------|
| `users` | User's Firebase UID | User profile with engagement metrics |
| `user_saved_content` | Auto-generated | Bookmarked blogs/videos |
| `activity_log` | Auto-generated | User activity events (blog reads, video views, etc.) |

### Document Schemas

**users/{uid}**
```json
{
  "uid": "string",
  "displayName": "string (max 100 chars)",
  "email": "string",
  "photoURL": "string",
  "joinedDate": "timestamp",
  "preferredElements": "array (max 5 items)",
  "lastLogin": "timestamp",
  "loginCount": "number (min 0)",
  "daysVisited": "number (min 0)",
  "currentStreak": "number (min 0)",
  "savedBlogsCount": "number (min 0)"
}
```

**user_saved_content/{docId}**
```json
{
  "userId": "string",
  "contentId": "string (blog slug or video ID)",
  "contentType": "blog | video",
  "contentTitle": "string",
  "contentThumbnail": "string (filename or URL)",
  "savedAt": "timestamp"
}
```

**activity_log/{docId}**
```json
{
  "userId": "string",
  "activityType": "blog_read | video_view | poll_vote | eq_completion | widget_usage",
  "contentId": "string (optional)",
  "widgetName": "string (optional)",
  "score": "number (optional, for eq_completion)",
  "timestamp": "timestamp",
  "calendarDay": "string (YYYY-MM-DD)"
}
```

### Security Rules
Deploy from `firestore.rules`:
```
firebase deploy --only firestore:rules
```

Key rules:
- `users/{userId}` — authenticated users can read/write
- `user_saved_content/{docId}` — authenticated users can read/write
- `activity_log/{docId}` — authenticated users can read/write

### Composite Indexes (Required)
Deploy from `firestore.indexes.json`:
```
firebase deploy --only firestore:indexes
```

Or create manually in Firebase Console → Firestore → Indexes:

| Collection | Fields | Query Scope |
|------------|--------|-------------|
| `user_saved_content` | `userId` (Asc) + `savedAt` (Desc) | Collection |
| `activity_log` | `userId` (Asc) + `timestamp` (Desc) | Collection |
| `activity_log` | `userId` (Asc) + `activityType` (Asc) + `contentId` (Asc) + `calendarDay` (Asc) | Collection |

---

## 3. Firebase Hosting

No changes needed. The existing hosting configuration serves the Angular app.

---

## 4. AngularFireAuthModule

Added to `app.module.ts` imports:
```typescript
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
```

This was previously commented out in the project.

---

## 5. Production Deployment Checklist

Before deploying to production:

1. [ ] Enable Google Sign-In on the **production** Firebase project
2. [ ] Create/verify OAuth client with production redirect URI
3. [ ] Deploy Firestore rules to production
4. [ ] Create composite indexes on production Firestore
5. [ ] Verify `authDomain` in production environment.ts matches the production Firebase project
6. [ ] Add production domain to Authorized Domains in Firebase Authentication settings
7. [ ] Test sign-in flow on production domain

---

## 6. Rollback Instructions

To disable the user engagement layer without removing code:
1. Disable Google provider in Firebase Console → Authentication → Sign-in method
2. The "Sign In" button will still show but popup will fail gracefully
3. All content remains accessible to guest users (no content is gated)
