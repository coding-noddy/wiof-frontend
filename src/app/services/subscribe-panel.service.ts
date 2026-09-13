import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Lets a control anywhere on the page (e.g. the footer's "Join our
 * newsletter" button) open the single floating <app-subscribe> panel
 * already present on that page, instead of embedding a second instance.
 */
@Injectable({ providedIn: 'root' })
export class SubscribePanelService {
  private readonly openSource = new Subject<void>();
  readonly open$ = this.openSource.asObservable();

  open(): void {
    this.openSource.next();
  }
}
