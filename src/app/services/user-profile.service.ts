import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { FIREBASE_COLLECTION } from '../app.constants';

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

  constructor(private firestore: AngularFirestore) {}

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
   * Returns the user's role, using session cache.
   * Legacy profiles without a role field default to 'public'.
   */
  async getRole(uid: string): Promise<'admin' | 'public'> {
    const cached = this.roleCache.get(uid);
    if (cached) {
      return cached;
    }

    try {
      const snapshot = await this.firestore
        .collection(FIREBASE_COLLECTION.USERS)
        .doc<UserProfile>(uid)
        .ref.get();

      const data = snapshot.data();
      const role: 'admin' | 'public' = (data?.role === 'admin') ? 'admin' : 'public';
      this.roleCache.set(uid, role);
      return role;
    } catch (error) {
      // If Firestore is unavailable, default to 'public' for safety
      return 'public';
    }
  }

  /**
   * Clears the role cache (called on logout).
   */
  clearRoleCache(): void {
    this.roleCache.clear();
  }

  /**
   * Strips the `role` field from any update payload to prevent
   * client-side role modifications.
   */
  sanitizeUpdate(payload: Partial<UserProfile>): Partial<UserProfile> {
    const { role, ...sanitized } = payload;
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
    await this.firestore
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

    await docRef.update(updatePayload);
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
}
