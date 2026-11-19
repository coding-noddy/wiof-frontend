import { Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { combineLatest, of, Subject } from 'rxjs';
import { filter, switchMap, takeUntil } from 'rxjs/operators';
import { buildStamps, momentWaitsOn, newBadges, Stamp } from 'src/app/models/Passport';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { AuthService } from 'src/app/services/auth.service';
import { PassportService } from 'src/app/services/passport.service';
import { SingleVideoPlaybackService } from 'src/app/services/single-video-playback.service';
import { UserProfileService } from 'src/app/services/user-profile.service';

/** Other overlays the moment never stacks on (it waits its turn). */
const OTHER_OVERLAYS = 'ion-modal, ion-alert, ion-action-sheet, [aria-modal="true"], .wiof-subscribe.active, .consent-bar, .reset-modal, .confirm-modal';
const RETRY_MS = 3000;

/** Seed and leaf pieces of the gentle burst: angle (deg), distance (px), delay (s). */
const BURST = Array.from({ length: 12 }, (_, i) => ({ angle: i * 30 + (i % 2 ? 9 : -6), distance: 70 + (i % 3) * 18, delay: (i % 4) * 0.04, leaf: i % 3 !== 0 }));

/**
 * The new-badge moment (docs/PLANET_PASSPORT_DESIGN.md §6a): when the server
 * awards a signed-in member a stamp, a small modal shows it landing, on
 * whatever page they're on. Several at once come in one modal. It never
 * shows before the Passport is issued (D5; the issuing moment shows
 * Earthrise and what was kept), never on top of another overlay, during a
 * playing video, on the Passport page (the booklet lands it there), sign-in,
 * admin or the EQ check: it waits and tries again. Shown once:
 * users.passportSeenAt (server clock) marks everything up to then as seen.
 */
@Component({
  selector: 'app-badge-moment',
  templateUrl: './badge-moment.component.html',
  styleUrls: ['./badge-moment.component.scss'],
  standalone: false
})
export class BadgeMomentComponent implements OnInit, OnDestroy {
  visible = false;
  badges: Stamp[] = [];
  index = 0;
  /** The issuing moment: Earthrise is among them. */
  issuing = false;
  readonly burst = BURST;

  @ViewChild('dialog') dialog?: ElementRef<HTMLElement>;

  private uid = '';
  private pending: Stamp[] = [];
  private shown = new Set<string>();
  private retry: any;
  private returnFocus: HTMLElement | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private passport: PassportService,
    private profiles: UserProfileService,
    private videos: SingleVideoPlaybackService,
    private analytics: AnalyticsService,
    private router: Router,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.auth.currentUser$
      .pipe(
        switchMap((user) => {
          this.uid = user?.uid || '';
          if (!user) return of(null);
          return combineLatest([
            this.passport.stampDefs(),
            this.passport.stamps(user.uid),
            this.passport.holder(user.uid),
            this.profiles.getProfile(user.uid)
          ]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((data) => {
        if (!data) {
          this.pending = [];
          this.visible = false;
          return;
        }
        const [defs, records, holder, profile] = data;
        const seen: any = profile?.passportSeenAt;
        const fresh = newBadges(records, seen?.toDate ? seen.toDate() : null, !!holder);
        const ids = new Set(fresh.map((r) => r.stampId));
        // A badge already shown this session waits for nothing (its seen marker may still be on its way).
        this.pending = buildStamps(defs, records.filter((r) => ids.has(r.stampId) && !this.shown.has(r.stampId)), { metrics: null, profile });
        this.tryShow();
      });

    // A page change may be the moment's turn (it waited on the Passport page, sign-in, admin…).
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), takeUntil(this.destroy$)).subscribe(() => this.tryShow());
  }

  ngOnDestroy(): void {
    clearTimeout(this.retry);
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Shows the pending badges if nothing else needs the screen; otherwise tries again shortly. */
  private tryShow(): void {
    clearTimeout(this.retry);
    if (this.visible || !this.pending.length) return;
    const url = this.router.url + (typeof location !== 'undefined' ? location.hash : '');
    const blocked = momentWaitsOn(url) || this.videos.videoPlaying || this.otherOverlayOpen();
    if (blocked) {
      this.zone.runOutsideAngular(() => {
        this.retry = setTimeout(() => this.zone.run(() => this.tryShow()), RETRY_MS);
      });
      return;
    }
    this.open(this.pending);
  }

  private otherOverlayOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return [...document.querySelectorAll<HTMLElement>(OTHER_OVERLAYS)].some(
      (el) => !el.closest('app-badge-moment') && (el.offsetParent !== null || getComputedStyle(el).position === 'fixed')
    );
  }

  private open(badges: Stamp[]): void {
    this.badges = badges;
    badges.forEach((b) => this.shown.add(b.id));
    this.pending = [];
    this.index = 0;
    this.issuing = badges.some((b) => b.id === 'earthrise');
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.visible = true;
    this.analytics.logBadgeMoment('shown', badges.length, this.issuing);
    // Seen now, so it shows once (even if the member reloads without closing it).
    if (this.uid) this.profiles.markPassportSeen(this.uid).catch(() => undefined);
    setTimeout(() => this.dialog?.nativeElement.focus(), 50);
  }

  get current(): Stamp | null {
    return this.badges[this.index] || null;
  }

  get heading(): string {
    if (this.issuing) return 'Your Planet Passport is issued';
    return this.badges.length > 1 ? `You earned ${this.badges.length} badges` : `You earned ${this.current?.title.join(' ') || 'a badge'}`;
  }

  /** One line more for the bigger milestones (not bigger confetti: design §6a). */
  get extraLine(): string {
    const s = this.current;
    if (!s) return '';
    if (s.id === 'one-family') return 'All five elements. One family.';
    if (s.family === 'milestone' && (s.shape === 'pentagon' || s.shape === 'hexagon')) return 'A milestone with many corners: thank you for keeping going.';
    return '';
  }

  prev(): void {
    if (this.index > 0) this.index--;
  }

  next(): void {
    if (this.index < this.badges.length - 1) this.index++;
  }

  openPassport(): void {
    const stamp = this.current?.id;
    this.analytics.logBadgeMoment('open_passport', this.badges.length, this.issuing);
    this.close(false);
    void this.router.navigate(['/passport'], { queryParams: stamp ? { stamp } : {} });
  }

  close(restoreFocus = true): void {
    this.visible = false;
    if (restoreFocus) this.returnFocus?.focus?.();
    // Anything earned while it was open gets its turn.
    setTimeout(() => this.tryShow(), RETRY_MS);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (!this.visible) return;
    if (e.key === 'Escape') this.close();
    if (e.key === 'ArrowRight') this.next();
    if (e.key === 'ArrowLeft') this.prev();
  }
}
