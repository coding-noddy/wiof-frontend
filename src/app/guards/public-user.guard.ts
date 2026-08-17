import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

/**
 * Guard for public user routes (e.g., /my-journey, /my-saved).
 * Redirects unauthenticated users to /home and shows a sign-in prompt toast.
 * Distinct from AuthGuard which redirects to /login for admin access.
 */
@Injectable({
  providedIn: 'root'
})
export class PublicUserGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.isAuthenticated$.pipe(
      map((isAuthenticated) => {
        if (!isAuthenticated) {
          this.showSignInPromptToast();
          this.router.navigate(['/home']);
          return false;
        }
        return true;
      })
    );
  }

  /**
   * Shows a non-blocking toast prompting the user to sign in.
   */
  private async showSignInPromptToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Please sign in to access this page.',
      duration: 4000,
      position: 'bottom',
      color: 'warning',
      buttons: [{ text: 'Dismiss', role: 'cancel' }]
    });
    await toast.present();
  }
}
