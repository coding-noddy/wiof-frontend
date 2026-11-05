import { Component } from '@angular/core';
import { AnalyticsConsentService } from 'src/app/services/analytics-consent.service';

/** "Cookie settings": reopens the analytics consent banner, to change the choice at any time. */
@Component({
    selector: 'app-cookie-settings-link',
    template: `<button type="button" class="cookie-settings-link" (click)="consent.reopen()">Cookie settings</button>`,
    styles: [`
      .cookie-settings-link {
        padding: 0;
        border: none;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .cookie-settings-link:hover { text-decoration: underline; }
      .cookie-settings-link:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; border-radius: 2px; }
    `],
    standalone: false
})
export class CookieSettingsLinkComponent {
  constructor(public consent: AnalyticsConsentService) {}
}
