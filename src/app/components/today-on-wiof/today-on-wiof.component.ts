import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { EnvDay } from 'src/app/models/env-cal-data';
import { ExploreItem } from 'src/app/models/RelatedContent';
import { hiddenToday, sourceName, TODAY_HIDDEN_KEY, todaysOccasion } from 'src/app/models/TodayOnWiof';
import { toCalendarDay } from 'src/app/services/activity.service';
import { EnvcalService } from 'src/app/services/envcal-service';
import { RelatedContentService } from 'src/app/services/related-content.service';

/** The Environment Calendar heading on the home page. */
export const CALENDAR_HEADING_ID = 'environment-calendar';

interface TodayView {
  occasion: EnvDay;
  source: string | null;
  story: ExploreItem | null;
  action: ExploreItem | null;
}

/**
 * "Today on WIOF" on the home page (Phase 2 step 6): today's occasion, its
 * fact and source, and one story and one action to go with it — the
 * admin's own links first, then the server's keyword matches
 * (related_auto/occasion_{id}). Nothing is padded in: with no match it
 * shows just the fact. "Not today" hides it until tomorrow on this device;
 * a day with no occasion shows nothing. "See the full calendar" takes the
 * reader down to the Environment Calendar on the same page.
 */
@Component({
    selector: 'app-today-on-wiof',
    templateUrl: './today-on-wiof.component.html',
    styleUrls: ['./today-on-wiof.component.scss'],
    standalone: false
})
export class TodayOnWiofComponent implements OnInit {
  view$: Observable<TodayView | null> = of(null);
  hidden = false;
  readonly todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  private readonly today = toCalendarDay(new Date());

  constructor(private envcal: EnvcalService, private relatedContent: RelatedContentService) {}

  ngOnInit(): void {
    this.hidden = hiddenToday(this.read(), this.today);
    if (this.hidden) return;
    this.view$ = this.envcal.getUpcomingOccasions(new Date(), 1).pipe(
      map(({ today }) => todaysOccasion(today)),
      switchMap((occasion) => {
        if (!occasion) return of(null);
        const base: TodayView = { occasion, source: sourceName(occasion.showMoreLink), story: null, action: null };
        return this.relatedContent
          .exploreNext({ links: occasion.relatedContent || [], autoKey: `occasion_${occasion.id}` }, { read: 1, act: 1 })
          .pipe(map(({ read, act }) => ({ ...base, story: read[0] || null, action: act[0] || null })));
      }),
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

  notToday(): void {
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
