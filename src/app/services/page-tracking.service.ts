import { Injectable, NgZone } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { documentTitle, PageInfo, pageInfo } from '../models/PageInfo';
import { AnalyticsService } from './analytics.service';

/** How long a story or video page may take to report its own title before the view is sent anyway. */
export const CONTENT_TITLE_WAIT_MS = 2500;

/**
 * Gives every page its own browser title and sends Google Analytics exactly
 * one page_view per navigation (8.9.0), with the path, that title, the page
 * group (GA4's content_group) and the element. Story and video pages pass
 * their content's title with setContentTitle(); the view waits for it (up to
 * CONTENT_TITLE_WAIT_MS) so GA records "Rainwater Harvesting · Water", not a
 * placeholder.
 *
 * Firebase's automatic page_view is turned off (util/analytics-init.ts), and
 * AngularFire's ScreenTrackingService isn't used: it sent app-style
 * screen_view events named after components, which GA's web reports ignore.
 */
@Injectable({ providedIn: 'root' })
export class PageTrackingService {
  private current: PageInfo | null = null;
  private pending: ReturnType<typeof setTimeout> | null = null;
  private sent = false;
  private referrer: string | null = null;

  constructor(
    private router: Router,
    private title: Title,
    private analytics: AnalyticsService,
    private zone: NgZone
  ) {}

  start(): void {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => this.onNavigation(e.urlAfterRedirects));
  }

  /** A story or video page knows its title: use it for the browser title and the pending page view. */
  setContentTitle(contentTitle: string | null | undefined): void {
    if (!this.current?.waitsForContent || !contentTitle?.trim()) return;
    this.title.setTitle(documentTitle(this.current, contentTitle));
    if (!this.sent) this.send();
  }

  private onNavigation(url: string): void {
    // A view still waiting for its title goes out now, before the next page.
    if (this.current && !this.sent) this.send();
    const page = pageInfo(url);
    // Same page, different query (e.g. opening an action's details): not a new page view.
    if (this.current && page.path === this.current.path) return;
    this.referrer = this.current ? location.origin + this.current.path : null;
    this.current = page;
    this.sent = false;
    this.title.setTitle(documentTitle(page));
    if (page.waitsForContent) {
      this.zone.runOutsideAngular(() => {
        this.pending = setTimeout(() => this.zone.run(() => !this.sent && this.send()), CONTENT_TITLE_WAIT_MS);
      });
    } else {
      this.send();
    }
  }

  private send(): void {
    if (!this.current) return;
    if (this.pending) clearTimeout(this.pending);
    this.pending = null;
    this.sent = true;
    this.analytics.logPageView({
      page_title: this.title.getTitle(),
      page_location: location.origin + this.current.path,
      page_path: this.current.path,
      content_group: this.current.group,
      element: this.current.element || undefined,
      page_referrer: this.referrer || undefined
    });
  }
}
