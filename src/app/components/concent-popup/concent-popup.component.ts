import { Component } from '@angular/core';
import { AnalyticsConsentService } from 'src/app/services/analytics-consent.service';

/**
 * The analytics consent banner (8.9.0): shown on whatever page a visitor
 * lands on until they choose, and again from "Cookie settings" in the
 * footer. Accept and Decline are equally easy: Google Analytics runs only
 * after Accept (AnalyticsConsentService).
 */
@Component({
    selector: 'app-concent-popup',
    templateUrl: './concent-popup.component.html',
    styleUrls: ['./concent-popup.component.scss'],
    standalone: false
})
export class ConcentPopupComponent {
  constructor(public consent: AnalyticsConsentService) {}
}
