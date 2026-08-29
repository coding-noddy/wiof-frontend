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
  wiofLogo: string = '../../assets/logo.png';
  destroy$: Subject<boolean> = new Subject();
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
    this.isLoggingIn = true;
    try {
      const res = await this.afService.login(this.email, this.password);
      // Pre-fetch role before navigating so the guard has it cached
      const user = (res as any).user;
      if (user?.uid) {
        await this.userProfileService.getRole(user.uid);
      }
      this.router.navigate(['/admin-dashboard']);
    } catch (err) {
      this.error = err as string;
    } finally {
      this.isLoggingIn = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
