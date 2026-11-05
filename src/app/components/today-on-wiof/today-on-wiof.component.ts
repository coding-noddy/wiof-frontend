import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EnvDay } from 'src/app/models/env-cal-data';
import { dialogOccasion, hiddenToday, TODAY_HIDDEN_KEY, todaysOccasion } from 'src/app/models/TodayOnWiof';
import { toCalendarDay } from 'src/app/services/activity.service';
import { EnvcalService } from 'src/app/services/envcal-service';
import { buildModalZoomAnimation } from 'src/app/util/modal-zoom-animation';
import { EnvCalDialogComponent } from '../env-cal-dialog/env-cal-dialog.component';

/** The Environment Calendar heading on the home page. */
export const CALENDAR_HEADING_ID = 'environment-calendar';

/**
 * "Today on WIOF" on the home page (Phase 2 step 6; a small invitation since
 * 8.11.0): the date and today's occasion, nothing more. Tapping it opens the
 * calendar's own day modal (EnvCalDialogComponent) with the description,
 * the "Did you know?" fact and the stories and actions that go with it, and
 * a pointer to the full calendar. Curiosity opens it; the page stays calm.
 * The × hides it until tomorrow on this device; a day with no occasion
 * shows nothing. "See the full calendar" takes the reader down to the
 * Environment Calendar on the same page.
 */
@Component({
    selector: 'app-today-on-wiof',
    templateUrl: './today-on-wiof.component.html',
    styleUrls: ['./today-on-wiof.component.scss'],
    standalone: false
})
export class TodayOnWiofComponent implements OnInit {
  occasion$: Observable<EnvDay | null> = of(null);
  hidden = false;
  readonly todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  private readonly today = toCalendarDay(new Date());

  constructor(
    private envcal: EnvcalService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit(): void {
    this.hidden = hiddenToday(this.read(), this.today);
    if (this.hidden) return;
    this.occasion$ = this.envcal.getUpcomingOccasions(new Date(), 1).pipe(
      map(({ today }) => todaysOccasion(today)),
      catchError((err) => {
        console.warn('Today on WIOF failed to load:', err);
        return of(null);
      })
    );
  }

  /**
   * Scrolls to the Environment Calendar heading (instantly with reduced
   * motion), moves focus there for keyboard and screen-reader users, and
   * briefly highlights today in the agenda. Without the section (another
   * page) the link's own #fragment is left to the browser.
   */
  seeCalendar(event: Event): void {
    const heading = document.getElementById(CALENDAR_HEADING_ID);
    if (!heading) return;
    event.preventDefault();
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    heading.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    heading.focus({ preventScroll: true });
    const today = document.querySelector('app-env-calendar-agenda .agenda-today');
    if (today) {
      today.classList.remove('is-flashing');
      void (today as HTMLElement).offsetWidth; // restart the animation on a repeat click
      today.classList.add('is-flashing');
      setTimeout(() => today.classList.remove('is-flashing'), 2000);
    }
  }

  /** The day's story in the calendar's modal; "Find them all…" there scrolls to the calendar. */
  async openStory(occasion: EnvDay, event?: Event): Promise<void> {
    const originRect = (event?.currentTarget as HTMLElement | null)?.getBoundingClientRect();
    // The modal's slider needs Swiper (instant where a page already loaded it).
    await import('../../util/swiper-elements');
    const modal = await this.modalCtrl.create({
      component: EnvCalDialogComponent,
      componentProps: { occasionDetails: { occasion: [dialogOccasion(occasion)] }, calendarHint: true },
      cssClass: 'env-cal-modal',
      backdropDismiss: true,
      enterAnimation: (baseEl) => buildModalZoomAnimation(baseEl, originRect, false),
      leaveAnimation: (baseEl) => buildModalZoomAnimation(baseEl, originRect, true)
    });
    await modal.present();
    const { role } = await modal.onDidDismiss();
    if (role === 'calendar') this.seeCalendar(new Event('click'));
  }

  hideForToday(): void {
    this.hidden = true;
    try {
      localStorage.setItem(TODAY_HIDDEN_KEY, this.today);
    } catch {
      // Storage unavailable (private mode): hidden for this visit only.
    }
  }

  private read(): string | null {
    try {
      return localStorage.getItem(TODAY_HIDDEN_KEY);
    } catch {
      return null;
    }
  }
}
