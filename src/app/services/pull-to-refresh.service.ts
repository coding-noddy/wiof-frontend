import { Injectable, NgZone } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/** Pages without it: the admin pages and sign-in hold forms a reload would throw away. */
const EXCLUDED = /^\/(admin-dashboard|login)(\/|$|\?|#)/;

/** Text someone has typed on the page now open (search boxes left empty don't count). */
const TYPED = 'textarea, input:not([type]), input[type="text"], input[type="email"], input[type="search"], input[type="url"], input[type="tel"], input[type="number"], [contenteditable="true"]';

export function pullToRefreshAllowed(url: string): boolean {
  return !EXCLUDED.test(url || '/');
}

/** Has the visitor typed anything on this page, which a reload would lose? */
export function hasTypedText(page: ParentNode): boolean {
  return [...page.querySelectorAll<HTMLElement>(TYPED)].some((el) => {
    if ((el as HTMLInputElement).readOnly || (el as HTMLInputElement).disabled) return false;
    const value = el.isContentEditable ? el.textContent : (el as HTMLInputElement).value;
    return !!(value || '').trim();
  });
}

/**
 * Pull to refresh on every page, as on other apps (2026-11-22).
 *
 * Each page scrolls inside its own ion-content, so a phone browser's own
 * pull-to-refresh never fires. On touch screens this adds Ionic's refresher
 * to the page that is open, and a pull from the top reloads it: fresh data
 * and the latest version of the site, whatever the page.
 */
@Injectable({
  providedIn: 'root'
})
export class PullToRefreshService {
  private started = false;

  constructor(private router: Router, private zone: NgZone) {}

  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    // Touch screens only: on a computer, a mouse drag shouldn't reload the page.
    if (!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches) return;

    const attach = () => this.zone.runOutsideAngular(() => {
      // Ionic shows the new page a moment after the navigation ends; try again a little later.
      setTimeout(() => this.attachToOpenPage(), 300);
      setTimeout(() => this.attachToOpenPage(), 1200);
    });
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(attach);
    attach();
  }

  private openPage(): HTMLElement | null {
    return document.querySelector<HTMLElement>('ion-router-outlet > .ion-page:not(.ion-page-hidden)');
  }

  private attachToOpenPage(): void {
    if (!pullToRefreshAllowed(this.router.url)) return;
    const content = this.openPage()?.querySelector('ion-content');
    if (!content || content.querySelector(':scope > ion-refresher')) return;

    const refresher = document.createElement('ion-refresher');
    refresher.setAttribute('slot', 'fixed');
    refresher.classList.add('wiof-refresher');
    refresher.appendChild(document.createElement('ion-refresher-content'));
    refresher.addEventListener('ionRefresh', () => {
      const page = this.openPage();
      if (page && hasTypedText(page) && !window.confirm('Refresh this page? What you have typed will be lost.')) {
        (refresher as unknown as { complete: () => void }).complete();
        return;
      }
      window.location.reload();
    });
    content.prepend(refresher);
  }
}
