import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, from } from 'rxjs';
import { last, map, switchMap } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { httpsCallable } from 'firebase/functions';
import { FIREBASE_COLLECTION } from '../app.constants';
import { getWiofFunctions } from '../util/cloud-functions.util';

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

/** Result of the resetEngagementData Cloud Function — see UserProfileService.resetEngagementData(). */
export interface ResetEngagementDataResult {
  ok: boolean;
  deletedActivityCount: number;
  deletedSavedContentCount: number;
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
   * Admin authority comes from the separate `admins` collection (doc ID ==
   * uid) — never from a field on the user's own profile document, since that
   * document is client-writable. See firestore.rules `isAdmin()` for the
   * matching security-rule authority.
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
          .collection(FIREBASE_COLLECTION.ADMINS)
          .doc(uid)
          .ref.get();

        const role: 'admin' | 'public' = snapshot.exists ? 'admin' : 'public';
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
   * Creates the signed-in user's profile document via the createUserProfile
   * Cloud Function, which builds it from verified ID token claims rather
   * than client-supplied data and sets the initial engagement-counter
   * values. firestore.rules denies `create` on `users/{uid}` entirely, so
   * this Cloud Function (Admin SDK, bypasses rules) is the only path.
   * The `user` param is unused server-side (identity comes from the
   * caller's auth token) but kept so call sites don't need to change.
   */
  async createProfile(user: firebase.User): Promise<void> {
    const createUserProfile = httpsCallable(getWiofFunctions(), 'createUserProfile');
    await createUserProfile();
  }

  /**
   * Updates login metrics (loginCount, lastLogin) via the recordLoginMetrics
   * Cloud Function — these are system-managed counters excluded from the
   * client-writable field set in firestore.rules. Called when a returning
   * user signs in. The `uid` param is unused server-side (identity comes
   * from the caller's auth token) but kept so call sites don't need to change.
   */
  async updateLoginMetrics(uid: string): Promise<void> {
    const recordLoginMetrics = httpsCallable(getWiofFunctions(), 'recordLoginMetrics');
    await recordLoginMetrics();
  }

  /**
   * Records a visit via the recordUserVisit Cloud Function, which applies
   * the same streak semantics this method used to compute client-side (same
   * day -> no change; consecutive day -> extend streak; gap -> reset to 1) —
   * now server-side since daysVisited/currentStreak are system-managed
   * counters excluded from the client-writable field set in firestore.rules.
   * The browser's local timezone is passed through so calendar-day
   * boundaries match what the user actually experiences.
   */
  async recordVisit(uid: string): Promise<void> {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const recordUserVisit = httpsCallable<{ timezone: string }, { ok: boolean }>(
      getWiofFunctions(),
      'recordUserVisit'
    );
    await recordUserVisit({ timezone });
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

  /**
   * "Clear My Engagement Data" — deletes the user's activity_log and
   * user_saved_content records and zeroes engagement counters, all via the
   * resetEngagementData Cloud Function (a single trusted, idempotent
   * operation — see functions/index.js). Preserves the account and profile
   * identity. The `uid` param is unused server-side (identity comes from the
   * caller's auth token) but kept so call sites don't need to change.
   */
  async resetEngagementData(uid: string): Promise<ResetEngagementDataResult> {
    const resetEngagementData = httpsCallable<void, ResetEngagementDataResult>(
      getWiofFunctions(),
      'resetEngagementData'
    );
    const result = await resetEngagementData();
    return result.data;
  }
}
