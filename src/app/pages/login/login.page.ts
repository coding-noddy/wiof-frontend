import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
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

  constructor(private afService: AuthService, private router: Router) {}

  ngOnInit() {
    var logged_in = this.afService
      .getAuth()
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          this.router.navigate(['/admin-dashboard']);
        }
      });
  }

  onLogin() {
    this.afService
      .login(this.email, this.password)
      .then((res) => {
        this.router.navigate(['/admin-dashboard']);
      })
      .catch((err) => {
        this.error = err;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
