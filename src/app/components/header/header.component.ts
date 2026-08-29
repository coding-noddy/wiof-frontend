import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import firebase from 'firebase/compat/app';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  wiofLogo: string = '../../assets/logo.png';
  sub: Subscription;
  colorName: string;

  /** Observable of the current authenticated user (null when guest) */
  currentUser$: Observable<firebase.User | null>;

  /** Observable boolean for template *ngIf binding */
  isAuthenticated$: Observable<boolean>;

  /** Tracks whether mobile menu is open */
  mobileMenuOpen = false;

  /** Tracks whether sign-in is in progress */
  signingIn = false;

  constructor(
    public platform: Platform,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.getColor();
    this.currentUser$ = this.authService.currentUser$;
    this.isAuthenticated$ = this.authService.isAuthenticated$;
  }

  ngOnInit() {}

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  /**
   * Initiates Google sign-in popup directly from the header (no page navigation).
   */
  signIn(): void {
    this.signingIn = true;
    this.authService.signInWithGoogle()
      .then(() => {
        this.signingIn = false;
      })
      .catch(error => {
        this.signingIn = false;
        console.warn('Google sign-in failed or was cancelled:', error);
      });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
  }

  getColor() {
    const url_array = this.route.snapshot['_routerState'].url.split('/');
    if (url_array.includes('home')) {
      this.colorName = 'home';
    } else if (url_array.includes('earth')) {
      this.colorName = 'earth';
    } else if (url_array.includes('energy')) {
      this.colorName = 'energy';
    } else if (url_array.includes('air')) {
      this.colorName = 'airele';
    } else if (url_array.includes('water')) {
      this.colorName = 'water';
    } else if (url_array.includes('spirit')) {
      this.colorName = 'spirit';
    } else {
      this.colorName = 'home';
    }
  }
}
