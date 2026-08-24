import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable } from 'rxjs';
import { map, first } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup, getAuth, Auth } from 'firebase/auth';
import { ToastController } from '@ionic/angular';
import { UserProfileService } from './user-profile.service';
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

  constructor(
    private afAuth: AngularFireAuth,
    private userProfileService: UserProfileService,
    private toastController: ToastController
  ) {
    // Initialize observables
    this.currentUser$ = this.afAuth.authState;
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
    const toast = await this.toastController.create({
      message: 'Profile synchronization failed. Some features may be limited.',
      duration: 4000,
      position: 'bottom',
      color: 'warning',
      buttons: [{ text: 'Dismiss', role: 'cancel' }]
    });
    await toast.present();
  }
}
