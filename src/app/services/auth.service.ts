import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, Subject, merge } from 'rxjs';
import { map, first } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup, getAuth, Auth } from 'firebase/auth';
import { UserProfileService } from './user-profile.service';
import { UiUtilService } from '../util/UiUtilService';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /**
   * Observable of the currently authenticated Firebase user, or null if not signed in.
   */
  currentUser$: Observable<firebase.User | null>;

  /**
   * Observable that emits true when a user is authenticated, false otherwise.
   */
  isAuthenticated$: Observable<boolean>;

  private modularAuth: Auth;

  /** Emits the mutated firebase.User after an in-place profile update (e.g. avatar change) so
   *  subscribers (header/avatar) re-render immediately without waiting for a new auth state event. */
  private userProfileRefreshed$ = new Subject<firebase.User | null>();

  constructor(
    private afAuth: AngularFireAuth,
    private userProfileService: UserProfileService,
    private uiUtil: UiUtilService,
    private router: Router
  ) {
    // Initialize observables
    this.currentUser$ = merge(this.afAuth.authState, this.userProfileRefreshed$);
    this.isAuthenticated$ = this.currentUser$.pipe(map(user => !!user));

    // Get or create the modular Firebase app for auth operations
    const app = getApps().length > 0
      ? getApp()
      : initializeApp(environment.firebaseConfig);
    this.modularAuth = getAuth(app);
  }

  /**
   * Existing email/password login for admin access.
   */
  login(email: string, password: string) {
    this.userProfileService.clearRoleCache();
    return new Promise((resolve, reject) => {
      this.afAuth.signInWithEmailAndPassword(email, password).then(
        (userData) => resolve(userData),
        (err) => reject(err)
      );
    });
  }

  /**
   * Returns an Observable of the current auth state.
   * Preserved for backward compatibility with existing components.
   */
  getAuth() {
    return this.afAuth.authState.pipe(map((auth) => auth));
  }

  /**
   * Signs in using Google OAuth popup.
   * Uses the modular Firebase Auth SDK for the popup (Firebase v10 compatibility),
   * then bridges the credential to the compat auth layer so AngularFirestore works.
   */
  async signInWithGoogle(): Promise<any> {
    this.userProfileService.clearRoleCache();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.modularAuth, provider);

    // Bridge to compat auth layer using the OAuth credential
    // This ensures AngularFireAuth/AngularFirestore recognize the authenticated user
    const oauthCredential = GoogleAuthProvider.credentialFromResult(result);
    if (oauthCredential) {
      const compatCredential = firebase.auth.GoogleAuthProvider.credential(
        oauthCredential.idToken,
        oauthCredential.accessToken
      );
      const compatResult = await this.afAuth.signInWithCredential(compatCredential);

      // Now compat auth is fully active — sync profile using compat user
      if (compatResult.user) {
        this.syncUserProfile(compatResult.user).catch(() => {});
      }
    }

    return result;
  }

  /**
   * Signs out the current user from both auth layers.
   * Returns a Promise that resolves when sign-out completes.
   */
  async logout(): Promise<void> {
    this.userProfileService.clearRoleCache();
    await this.modularAuth.signOut();
    await this.afAuth.signOut();
    await this.router.navigate(['/home']);
  }

  /**
   * Updates the currently signed-in Firebase Auth user's profile (e.g. photoURL,
   * displayName) and notifies subscribers of currentUser$ so UI bound to the
   * auth user (header avatar) refreshes immediately without logout/reload.
   */
  async updateAuthProfile(updates: { displayName?: string; photoURL?: string }): Promise<void> {
    const user = await this.afAuth.currentUser;
    if (!user) {
      return;
    }
    await user.updateProfile(updates);
    this.userProfileRefreshed$.next(user);
  }

  /**
   * Creates a new profile for first-time users or updates login metrics for returning users.
   * If this fails, a non-blocking toast is shown but the auth session remains intact.
   */
  private async syncUserProfile(user: firebase.User): Promise<void> {
    try {
      const profile = await this.userProfileService.getProfile(user.uid)
        .pipe(first())
        .toPromise();

      if (!profile) {
        await this.userProfileService.createProfile(user);
      } else {
        await this.userProfileService.updateLoginMetrics(user.uid);
      }
    } catch (error) {
      console.warn('Profile sync failed:', error);
      await this.showProfileSyncFailureToast();
    }
  }

  /**
   * Displays a non-blocking toast notification when profile synchronization fails.
   */
  private async showProfileSyncFailureToast(): Promise<void> {
    await this.uiUtil.presentToast('Profile synchronization failed. Some features may be limited.', 'warning', 4000);
  }
}
