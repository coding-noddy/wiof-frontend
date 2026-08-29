import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { first } from 'rxjs/operators';
import { UserProfileService } from './user-profile.service';
import { FIREBASE_COLLECTION } from '../app.constants';

/**
 * List of Firestore collections that are restricted to admin-only writes.
 */
export const ADMIN_COLLECTIONS: string[] = [
  FIREBASE_COLLECTION.BLOGS,
  FIREBASE_COLLECTION.NEWS,
  FIREBASE_COLLECTION.COFFEE_CONVERSATIONS,
  FIREBASE_COLLECTION.IN_FOCUS,
  FIREBASE_COLLECTION.NGO_IN_FOCUS,
  FIREBASE_COLLECTION.COURSE_IN_FOCUS,
  FIREBASE_COLLECTION.ENVCAL,
  'AboutUs',
  'AboutUsProfiles'
];

/**
 * Service that verifies the current user has admin role before allowing
 * write operations to admin-only Firestore collections.
 *
 * This provides client-side defense-in-depth — Firestore security rules
 * are the primary enforcement layer.
 */
@Injectable({
  providedIn: 'root'
})
export class AdminWriteGuardService {

  constructor(
    private afAuth: AngularFireAuth,
    private userProfileService: UserProfileService
  ) {}

  /**
   * Verifies the current user has admin role.
   * Throws an error if the user is not authenticated or not an admin.
   *
   * @throws Error if user is not authenticated
   * @throws Error if user does not have admin role
   */
  async assertAdmin(): Promise<void> {
    const user = await this.afAuth.authState.pipe(first()).toPromise();

    if (!user) {
      throw new Error('Admin write rejected: User is not authenticated');
    }

    const role = await this.userProfileService.getRole(user.uid);

    if (role !== 'admin') {
      throw new Error('Admin write rejected: User does not have admin privileges');
    }
  }
}
