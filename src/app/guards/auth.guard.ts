import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, from, of } from 'rxjs';
import { switchMap, first } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { UserProfileService } from '../services/user-profile.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService,
    private userProfileService: UserProfileService,
    private toastController: ToastController
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      first(),
      switchMap((user) => {
        if (!user) {
          this.router.navigate(['/login']);
          return of(false);
        }

        return from(this.userProfileService.getRole(user.uid)).pipe(
          switchMap((role) => {
            if (role === 'admin') {
              return of(true);
            }

            // Role is 'public' or missing — deny access
            this.router.navigate(['/home']);
            this.showAccessDeniedToast();
            return of(false);
          })
        );
      })
    );
  }

  private async showAccessDeniedToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Access denied: Admin privileges required',
      duration: 4000,
      position: 'bottom',
      color: 'danger',
      buttons: [{ text: 'Dismiss', role: 'cancel' }]
    });
    await toast.present();
  }
}
