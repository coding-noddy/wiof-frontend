import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserProfileService } from '../../services/user-profile.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage implements OnInit, OnDestroy {
  email: string;
  password: string;
  error: string;
  wiofLogo: string = '../../assets/brand/logos/WIOF-full-logo.png';
  destroy$: Subject<boolean> = new Subject();
  signingInWithGoogle = false;
  private isLoggingIn = false;

  constructor(
    private afService: AuthService,
    private userProfileService: UserProfileService,
    private router: Router
  ) {}

  ngOnInit() {
    this.afService
      .getAuth()
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user && !this.isLoggingIn) {
          this.router.navigate(['/admin-dashboard']);
        }
      });
  }

  async onLogin() {
    this.error = '';
    if (!this.email?.trim()) {
      this.error = 'Enter your email address.';
      return;
    }
    if (!this.password) {
      this.error = 'Enter your password.';
      return;
    }
    this.isLoggingIn = true;
    try {
      const res = await this.afService.login(this.email, this.password);
      // Pre-fetch role before navigating so the guard has it cached
      const user = (res as any).user;
      if (user?.uid) {
        await this.userProfileService.getRole(user.uid);
      }
      this.router.navigate(['/admin-dashboard']);
    } catch (err: any) {
      this.error = this.loginErrorMessage(err?.code);
    } finally {
      this.isLoggingIn = false;
    }
  }

  /**
   * Google sign-in for admins. Admin rights come from admins/{uid}; with
   * production's one-account-per-email setting, an admin's Google sign-in
   * lands on the same uid as their email/password account.
   */
  async onGoogleLogin() {
    this.error = '';
    this.isLoggingIn = true;
    this.signingInWithGoogle = true;
    try {
      const res = await this.afService.signInWithGoogle();
      const user = (res as any)?.user;
      const role = user?.uid ? await this.userProfileService.getRole(user.uid) : 'public';
      if (role === 'admin') {
        this.router.navigate(['/admin-dashboard']);
      } else {
        this.error = `${user?.email || 'This Google account'} isn't an admin. You're signed in as a regular user.`;
      }
    } catch (err: any) {
      // Closing the popup isn't an error worth showing.
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        this.error = "Google sign-in didn't complete. Please try again.";
      }
    } finally {
      this.signingInWithGoogle = false;
      this.isLoggingIn = false;
    }
  }

  /**
   * Plain-language message for a failed email/password sign-in. Unknown
   * email and wrong password share one message, so the form doesn't reveal
   * which emails have accounts.
   */
  private loginErrorMessage(code: string): string {
    switch (code) {
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        return 'Email or password is incorrect.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a few minutes and try again.';
      case 'auth/network-request-failed':
        return "Couldn't reach the server. Check your connection and try again.";
      default:
        return "Sign-in didn't complete. Please try again.";
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
