import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject, Subscription, fromEvent, merge } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { UiUtilService } from '../util/UiUtilService';

/**
 * Auto-logs out any authenticated user (admin or regular) after a period of
 * inactivity, warning them shortly before the session is ended.
 */
@Injectable({
  providedIn: 'root'
})
export class IdleTimeoutService implements OnDestroy {
  private readonly IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 min total idle allowed
  private readonly WARNING_BEFORE_MS = 60 * 1000; // warn 1 min before logout
  private readonly ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];

  private destroy$ = new Subject<void>();
  private activitySub?: Subscription;
  private warningTimeoutId?: ReturnType<typeof setTimeout>;
  private logoutTimeoutId?: ReturnType<typeof setTimeout>;
  private warningShown = false;
  private started = false;

  constructor(
    private authService: AuthService,
    private uiUtil: UiUtilService,
    private zone: NgZone
  ) {}

  /**
   * Starts watching auth state so idle monitoring only runs while someone is logged in.
   * Safe to call multiple times — only wires up the subscription once.
   */
  init(): void {
    if (this.started) return;
    this.started = true;

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.startMonitoring();
        } else {
          this.stopMonitoring();
        }
      });
  }

  private startMonitoring(): void {
    this.stopActivityListeners();
    this.resetTimers();

    // Activity listeners are high-frequency (mousemove/scroll) — keep them outside
    // Angular's change detection zone so they don't trigger needless digest cycles.
    this.zone.runOutsideAngular(() => {
      this.activitySub = merge(
        ...this.ACTIVITY_EVENTS.map(evt => fromEvent(document, evt))
      ).subscribe(() => this.resetTimers());
    });
  }

  private resetTimers(): void {
    clearTimeout(this.warningTimeoutId);
    clearTimeout(this.logoutTimeoutId);
    this.warningShown = false;

    this.warningTimeoutId = setTimeout(() => {
      this.zone.run(() => this.showWarning());
    }, this.IDLE_TIMEOUT_MS - this.WARNING_BEFORE_MS);

    this.logoutTimeoutId = setTimeout(() => {
      this.zone.run(() => this.handleIdleLogout());
    }, this.IDLE_TIMEOUT_MS);
  }

  private showWarning(): void {
    if (this.warningShown) return;
    this.warningShown = true;
    this.uiUtil.presentToast(
      'You will be logged out in 1 minute due to inactivity.',
      'warning',
      8000
    );
  }

  private async handleIdleLogout(): Promise<void> {
    this.stopMonitoring();
    await this.authService.logout();
    await this.uiUtil.presentToast('You were logged out due to inactivity.', 'warning', 4000);
  }

  private stopActivityListeners(): void {
    this.activitySub?.unsubscribe();
    this.activitySub = undefined;
  }

  private stopMonitoring(): void {
    this.stopActivityListeners();
    clearTimeout(this.warningTimeoutId);
    clearTimeout(this.logoutTimeoutId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopMonitoring();
  }
}
