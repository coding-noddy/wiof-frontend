import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { combineLatest, of, Subject } from 'rxjs';
import { filter, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { EQ_ASSESSMENT_FRAGMENT, EQ_ASSESSMENT_LINK, ElementSlug, JOURNEY_ELEMENTS, needsWelcome } from 'src/app/models/Journey';
import { AuthService } from 'src/app/services/auth.service';
import { UserProfileService } from 'src/app/services/user-profile.service';
import { WELCOME_PATHS } from '../onboarding-overlay/onboarding-overlay.component';

/**
 * The welcome after sign-in (Phase 2 step 5): two short, skippable steps,
 * shown once on the home page to a signed-in user who hasn't done it and
 * hasn't chosen elements yet. 1: which elements matter to you (saved as
 * preferredElements). 2: where to start — a story, an action or the EQ
 * check, for the first chosen element. Skipping or closing also counts as
 * done, so it never comes back. Guests get OnboardingOverlayComponent.
 */
@Component({
    selector: 'app-journey-welcome',
    templateUrl: './journey-welcome.component.html',
    styleUrls: ['./journey-welcome.component.scss'],
    standalone: false
})
export class JourneyWelcomeComponent implements OnInit, OnDestroy {
  readonly elements = JOURNEY_ELEMENTS;
  visible = false;
  step: 1 | 2 = 1;
  chosen = new Set<ElementSlug>();
  saving = false;
  firstName = '';

  @ViewChild('dialog') dialog?: ElementRef<HTMLElement>;

  private uid: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService, private profiles: UserProfileService, private router: Router) {}

  ngOnInit(): void {
    const onHome$ = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
      map((url) => WELCOME_PATHS.includes(url.split(/[?#]/)[0] || '/'))
    );
    const profile$ = this.authService.currentUser$.pipe(
      switchMap((user) => (user ? this.profiles.getProfile(user.uid).pipe(map((profile) => ({ uid: user.uid, profile }))) : of(null)))
    );
    combineLatest([onHome$, profile$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([onHome, signedIn]) => {
        if (!signedIn) {
          this.visible = false;
          return;
        }
        this.uid = signedIn.uid;
        // Once open, it stays open until the user chooses, even as the profile updates.
        if (!this.visible && onHome && needsWelcome(signedIn.profile)) {
          this.firstName = this.profiles.resolveFirstName(signedIn.profile);
          this.open();
        } else if (this.visible && !onHome) {
          this.visible = false; // navigated away without choosing: ask again on home
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible) void this.finish();
  }

  toggle(slug: ElementSlug): void {
    this.chosen.has(slug) ? this.chosen.delete(slug) : this.chosen.add(slug);
  }

  next(): void {
    this.step = 2;
    this.focusDialog();
  }

  /** Where step 2's choices lead: the first chosen element, else Earth. */
  get startElement(): { slug: ElementSlug; name: string } {
    const first = this.elements.find((e) => this.chosen.has(e.slug)) || this.elements.find((e) => e.slug === 'earth');
    return { slug: first.slug, name: first.name };
  }

  get starts(): { verb: string; title: string; desc: string; icon: string; link: string }[] {
    const { slug, name } = this.startElement;
    return [
      { verb: 'Read', title: `A story about ${name}`, desc: 'Start with something to read', icon: 'book-outline', link: `/element/${slug}/blogs` },
      { verb: 'Act', title: 'One small action', desc: 'Something you can do today', icon: 'leaf-outline', link: `/element/${slug}/take-action` },
      { verb: 'Reflect', title: 'Check your EQ', desc: 'About 5 minutes, 24 questions', icon: 'heart-outline', link: `${EQ_ASSESSMENT_LINK}#${EQ_ASSESSMENT_FRAGMENT}` }
    ];
  }

  /** Saves the chosen elements (if any), closes, and optionally goes somewhere. */
  async finish(link?: string): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    const elements = this.elements.map((e) => e.slug).filter((slug) => this.chosen.has(slug));
    try {
      if (this.uid) await this.profiles.completeWelcome(this.uid, elements);
    } catch (err) {
      // Not worth blocking the user over; it shows again next time.
      console.warn('Saving the welcome failed:', err);
    } finally {
      this.saving = false;
      this.visible = false;
    }
    if (link) void this.router.navigateByUrl(link);
  }

  private open(): void {
    this.step = 1;
    this.chosen.clear();
    this.visible = true;
    this.focusDialog();
  }

  /**
   * Focus the dialog itself, so screen readers announce it and Tab starts
   * inside it. Same 1s delay as the guest welcome: the home page's sliders
   * steal focus during their own start-up.
   */
  private focusDialog(): void {
    setTimeout(() => this.dialog?.nativeElement.focus(), this.step === 1 ? 1000 : 0);
  }
}
