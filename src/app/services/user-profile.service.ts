import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, from } from 'rxjs';
import { last, map, switchMap } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { FIREBASE_COLLECTION } from '../app.constants';

/** Storage folder that holds per-user avatar images. */
export const USER_AVATAR_STORAGE_FOLDER = 'user-avatars';

/** MIME types accepted for profile picture uploads. */
export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

/** Maximum accepted profile picture size, in bytes (1 MB). */
export const MAX_AVATAR_SIZE_BYTES = 1 * 1024 * 1024;

/** Fields a signed-in user is allowed to edit on their own profile document. */
const EDITABLE_PROFILE_FIELDS: Array<keyof UserProfile> = ['displayName', 'photoURL', 'preferredElements'];

export interface AvatarValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a candidate avatar file against the allowed type and size constraints.
 * Pure function so it can be unit tested without touching Firebase.
 */
export function validateAvatarFile(file: File): AvatarValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Please choose a JPG or PNG image.' };
  }
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return { valid: false, error: 'Image must be smaller than 1 MB.' };
  }
  return { valid: true };
}

/** Maps a validated image file to the storage file extension used to store it. */
export function getAvatarExtension(file: File): 'jpg' | 'png' {
  return file.type === 'image/png' ? 'png' : 'jpg';
}

/**
 * Represents a user profile document stored in the Firestore `users` collection.
 */
export interface UserProfile {
  uid: string;
  displayName: string;           // Max 100 characters
  email: string;
  photoURL: string;
  role: 'admin' | 'public';     // User role for access control
  joinedDate: firebase.firestore.Timestamp;
  preferredElements: string[];   // Max 5 items
  lastLogin: firebase.firestore.Timestamp;
  loginCount: number;            // Min 0
  daysVisited: number;           // Min 0
  currentStreak: number;         // Min 0
  savedBlogsCount: number;       // Min 0
}

/**
 * Represents the result of a streak calculation.
 */
export interface StreakUpdate {
  daysVisited: number;       // 0 = no change, 1 = increment
  currentStreak: number;     // 0 = no change, 1 = increment (or reset value)
  resetStreak: boolean;      // true = reset streak to 1
}

/**
 * Converts a Date to a calendar day string "YYYY-MM-DD" in the given timezone.
 */
export function toCalendarDay(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Computes the difference in calendar days between two "YYYY-MM-DD" strings.
 */
export function diffCalendarDays(today: string, lastDay: string): number {
  const todayDate = new Date(today + 'T00:00:00Z');
  const lastDate = new Date(lastDay + 'T00:00:00Z');
  const diffMs = todayDate.getTime() - lastDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Pure function that computes the streak update based on profile state and current time.
 */
export function computeStreakUpdate(
  lastLogin: Date,
  now: Date,
  userTimezone: string
): StreakUpdate {
  const today = toCalendarDay(now, userTimezone);
  const lastDay = toCalendarDay(lastLogin, userTimezone);

  if (today === lastDay) {
    // Same day — no streak change
    return { daysVisited: 0, currentStreak: 0, resetStreak: false };
  }

  const daysDiff = diffCalendarDays(today, lastDay);

  if (daysDiff === 1) {
    // Consecutive day — extend streak
    return { daysVisited: 1, currentStreak: 1, resetStreak: false };
  }

  // Gap > 1 day — reset streak
  return { daysVisited: 1, currentStreak: 1, resetStreak: true };
}

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {

  private roleCache: Map<string, 'admin' | 'public'> = new Map();

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage
  ) {}

  /**
   * Retrieves a user profile by UID.
   */
  getProfile(uid: string): Observable<UserProfile | null> {
    return this.firestore
      .collection(FIREBASE_COLLECTION.USERS)
      .doc<UserProfile>(uid)
      .valueChanges()
      .pipe(map(profile => profile || null));
  }

  /**
   * Retrieves registered user profiles for the admin users view.
   */
  getAllProfiles(): Observable<UserProfile[]> {
    return this.firestore
      .collection<UserProfile>(FIREBASE_COLLECTION.USERS, ref => ref.orderBy('joinedDate', 'desc'))
      .valueChanges();
  }

  /**
   * Returns the user's role, using session cache.
   * Legacy profiles without a role field default to 'public'.
   */
  async getRole(uid: string): Promise<'admin' | 'public'> {
    const cached = this.roleCache.get(uid);
    if (cached) {
      return cached;
    }

    // Retry up to 2 times with delay to handle Firestore connection not ready after login
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        const snapshot = await this.firestore
          .collection(FIREBASE_COLLECTION.USERS)
          .doc<UserProfile>(uid)
          .ref.get();

        const data = snapshot.data();
        const role: 'admin' | 'public' = (data?.role === 'admin') ? 'admin' : 'public';
        this.roleCache.set(uid, role);
        return role;
      } catch (error) {
        console.warn(`Role fetch attempt ${attempt + 1} failed:`, error);
      }
    }

    // If both attempts failed, default to 'public' for safety
    console.error('Role fetch failed after retries');
    return 'public';
  }

  /**
   * Clears the role cache (called on logout).
   */
  clearRoleCache(): void {
    this.roleCache.clear();
  }

  /**
   * Whitelists an update payload down to the fields a user may self-edit
   * (displayName, photoURL, preferredElements), dropping everything else
   * (role, uid, email, counters, timestamps, etc.).
   */
  sanitizeUpdate(payload: Partial<UserProfile>): Partial<UserProfile> {
    const sanitized: Partial<UserProfile> = {};
    for (const field of EDITABLE_PROFILE_FIELDS) {
      if (field in payload) {
        (sanitized as any)[field] = (payload as any)[field];
      }
    }
    return sanitized;
  }

  /**
   * Creates a new user profile document from a Firebase user object.
   * Sets initial values for engagement fields.
   */
  async createProfile(user: firebase.User): Promise<void> {
    const now = new Date();

    const profile = {
      uid: user.uid,
      displayName: (user.displayName || '').substring(0, 100),
      email: user.email || '',
      photoURL: user.photoURL || '',
      role: 'public' as const,
      joinedDate: now,
      preferredElements: [],
      lastLogin: now,
      loginCount: 1,
      daysVisited: 1,
      currentStreak: 1,
      savedBlogsCount: 0
    };

    await this.firestore
      .collection(FIREBASE_COLLECTION.USERS)
      .doc(user.uid)
      .set(profile);
  }

  /**
   * Updates login metrics: increments loginCount and updates lastLogin.
   * Called when a returning user signs in.
   */
  async updateLoginMetrics(uid: string): Promise<void> {
    await this.firestore.firestore
      .collection(FIREBASE_COLLECTION.USERS)
      .doc(uid)
      .update({
        loginCount: firebase.firestore.FieldValue.increment(1),
        lastLogin: new Date()
      });
  }

  /**
   * Records a visit with streak calculation logic.
   * - Same calendar day → no change (only updates lastLogin)
   * - Consecutive day → increment daysVisited and currentStreak
   * - Gap > 1 day → increment daysVisited, reset currentStreak to 1
   */
  async recordVisit(uid: string): Promise<void> {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();

    // Fetch the current profile to determine streak state
    const docRef = this.firestore
      .collection(FIREBASE_COLLECTION.USERS)
      .doc<UserProfile>(uid);

    const snapshot = await docRef.ref.get();
    if (!snapshot.exists) {
      return;
    }

    const profile = snapshot.data() as UserProfile;
    // lastLogin could be a Firestore Timestamp or a Date depending on how it was stored
    const lastLoginDate = profile.lastLogin?.toDate ? profile.lastLogin.toDate() : new Date(profile.lastLogin as any);

    const streakUpdate = computeStreakUpdate(lastLoginDate, now, userTimezone);
    const updatePayload: Record<string, any> = {
      lastLogin: now
    };

    if (streakUpdate.daysVisited > 0) {
      updatePayload['daysVisited'] = firebase.firestore.FieldValue.increment(streakUpdate.daysVisited);
    }

    if (streakUpdate.resetStreak) {
      // Gap > 1 day: reset streak to 1
      updatePayload['currentStreak'] = 1;
    } else if (streakUpdate.currentStreak > 0) {
      // Consecutive day: increment streak
      updatePayload['currentStreak'] = firebase.firestore.FieldValue.increment(streakUpdate.currentStreak);
    }

    await this.firestore.firestore
      .collection(FIREBASE_COLLECTION.USERS)
      .doc(uid)
      .update(updatePayload);
  }

  /**
   * Updates a user profile with the given partial data.
   * Callers should use sanitizeUpdate() first to strip protected fields.
   */
  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    await this.firestore
      .collection(FIREBASE_COLLECTION.USERS)
      .doc(uid)
      .update(data);
  }

  /**
   * Updates the user's preferred elements list (max 5 items).
   */
  async updatePreferredElements(uid: string, elements: string[]): Promise<void> {
    const trimmedElements = elements.slice(0, 5);

    await this.firestore
      .collection(FIREBASE_COLLECTION.USERS)
      .doc(uid)
      .update({ preferredElements: trimmedElements });
  }

  /**
   * Uploads a validated avatar file to Storage at `user-avatars/{uid}/profile.{ext}`,
   * removing any stale variant with a different extension first so a user never
   * accumulates orphaned avatar files. Resolves with the download URL, with a
   * cache-busting suffix appended so re-uploads to the same path (same Storage
   * download token) are not served stale from browser/CDN cache.
   */
  uploadAvatar(uid: string, file: File): Observable<string> {
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const extension = getAvatarExtension(file);
    const path = `${USER_AVATAR_STORAGE_FOLDER}/${uid}/profile.${extension}`;

    return from(this.deleteOtherAvatarVariants(uid, extension)).pipe(
      switchMap(() => {
        const ref = this.storage.ref(path);
        const task = this.storage.upload(path, file);
        return task.snapshotChanges().pipe(
          last(),
          switchMap(() => ref.getDownloadURL()),
          map((url: string) => `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`)
        );
      })
    );
  }

  /**
   * Removes any stored avatar variants for the user and clears photoURL in Firestore.
   */
  async removeAvatar(uid: string): Promise<void> {
    await this.deleteAllAvatarVariants(uid);
    await this.updatePhotoURL(uid, '');
  }

  /**
   * Persists a new photoURL value to the user's Firestore profile via the
   * standard sanitized update path.
   */
  async updatePhotoURL(uid: string, photoURL: string): Promise<void> {
    await this.updateProfile(uid, this.sanitizeUpdate({ photoURL }));
  }

  /** Deletes avatar variants other than the one currently being written, ignoring not-found errors. */
  private async deleteOtherAvatarVariants(uid: string, keepExtension: 'jpg' | 'png'): Promise<void> {
    const extensions: Array<'jpg' | 'png'> = ['jpg', 'png'].filter(ext => ext !== keepExtension) as Array<'jpg' | 'png'>;
    await Promise.all(extensions.map(ext => this.deleteAvatarVariant(uid, ext)));
  }

  /** Deletes every known avatar variant for the user, ignoring not-found errors. */
  private async deleteAllAvatarVariants(uid: string): Promise<void> {
    await Promise.all((['jpg', 'png'] as const).map(ext => this.deleteAvatarVariant(uid, ext)));
  }

  private async deleteAvatarVariant(uid: string, extension: 'jpg' | 'png'): Promise<void> {
    const path = `${USER_AVATAR_STORAGE_FOLDER}/${uid}/profile.${extension}`;
    try {
      await this.storage.ref(path).delete().toPromise();
    } catch {
      // No existing file for this extension — nothing to clean up.
    }
  }

  /** Resets engagement counters while preserving the user's account and profile identity. */
  async resetEngagementData(uid: string): Promise<void> {
    await this.firestore.firestore
      .collection(FIREBASE_COLLECTION.USERS)
      .doc(uid)
      .update({
        loginCount: 0,
        daysVisited: 0,
        currentStreak: 0,
        savedBlogsCount: 0,
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
  }
}
