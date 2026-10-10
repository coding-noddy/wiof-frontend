import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

/** The welcome shows on the home page only. Not on content pages: someone
 *  arriving from a shared blog or video link should read what they came for
 *  (they'll see it when they first reach home). Not on Take Action either:
 *  that page already explains itself. */
export const WELCOME_PATHS = ['/', '/home'];

@Component({
  selector: 'app-onboarding-overlay',
  templateUrl: './onboarding-overlay.component.html',
  styleUrls: ['./onboarding-overlay.component.scss']
})
export class OnboardingOverlayComponent implements OnInit, OnDestroy {
  visible = false;
  signingIn = false;

  readonly isAuthenticated$: Observable<boolean>;

  @ViewChild('closeBtn') closeBtn?: ElementRef<HTMLButtonElement>;

  // Same order, names and color families as life-elements.component.ts.
  readonly elements = [
    { slug: 'air', name: 'Air', colorClass: 'teal' },
    { slug: 'energy', name: 'Energy', colorClass: 'marigold' },
    { slug: 'water', name: 'Water', colorClass: 'teal' },
    { slug: 'earth', name: 'Earth', colorClass: 'brown' },
    { slug: 'spirit', name: 'Spirit', colorClass: 'teal' }
  ];

  private routerSub?: Subscription;

  constructor(private router: Router, private authService: AuthService) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
  }

  ngOnInit(): void {
    if (!this.shouldShowOverlay()) {
      return;
    }
    this.onRoute(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.onRoute(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.visible) {
      this.dismiss();
    }
  }

  dismiss(): void {
    this.visible = false;
    this.routerSub?.unsubscribe();
    try {
      localStorage.setItem('wiof_onboarding_seen', 'true');
    } catch {
      // localStorage unavailable — silently ignore
    }
  }

  onPrimaryCta(): void {
    this.dismiss();
    this.router.navigateByUrl('/take-action');
  }

  /** Inspire: Coffee Conversation and the poll are on the home page, which is
   *  the only page the welcome shows on — so this just scrolls to them. */
  goToConversations(): void {
    this.dismiss();
    document.querySelector('.conversation-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  signIn(): void {
    this.signingIn = true;
    this.authService.signInWithGoogle()
      .then(() => {
        this.signingIn = false;
        this.dismiss();
      })
      .catch(error => {
        this.signingIn = false;
        console.warn('Google sign-in failed or was cancelled:', error);
      });
  }

  private onRoute(url: string): void {
    const shouldShow = WELCOME_PATHS.includes(this.pathOf(url));
    if (shouldShow && !this.visible) {
      this.visible = true;
      // Ionic's gesture controller (used by the home page's sliders) blurs
      // whatever is focused during its own init, shortly after mount — a
      // focus set any earlier gets silently stolen back. 1s clears it
      // reliably and is still well inside the entrance animation window.
      setTimeout(() => this.closeBtn?.nativeElement.focus(), 1000);
    } else if (!shouldShow) {
      // Navigated away (e.g. browser back) without choosing: hide for now,
      // without marking it seen, so it can show again on home.
      this.visible = false;
    }
  }

  private pathOf(url: string): string {
    return url.split(/[?#]/)[0] || '/';
  }

  private shouldShowOverlay(): boolean {
    try {
      return localStorage.getItem('wiof_onboarding_seen') === null;
    } catch {
      // localStorage unavailable — do not display overlay
      return false;
    }
  }
}
