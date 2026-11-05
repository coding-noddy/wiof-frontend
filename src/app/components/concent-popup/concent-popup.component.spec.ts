import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { AnalyticsConsentService } from 'src/app/services/analytics-consent.service';

import { ConcentPopupComponent } from './concent-popup.component';

describe('ConcentPopupComponent (analytics consent banner)', () => {
  let fixture: ComponentFixture<ConcentPopupComponent>;
  let consent: { choice$: BehaviorSubject<any>; bannerOpen$: BehaviorSubject<boolean>; choose: jasmine.Spy };

  beforeEach(waitForAsync(() => {
    consent = { choice$: new BehaviorSubject(null), bannerOpen$: new BehaviorSubject(true), choose: jasmine.createSpy('choose') };
    TestBed.configureTestingModule({
      declarations: [ConcentPopupComponent],
      imports: [IonicModule.forRoot()],
      providers: [provideRouter([]), { provide: AnalyticsConsentService, useValue: consent }]
    }).compileComponents();
    fixture = TestBed.createComponent(ConcentPopupComponent);
    fixture.detectChanges();
  }));

  it('asks with Accept and Decline, and passes the choice on', () => {
    const el: HTMLElement = fixture.nativeElement;
    const buttons = [...el.querySelectorAll<HTMLButtonElement>('.consent-btn')];
    expect(buttons.map((b) => b.textContent!.trim())).toEqual(['Decline', 'Accept']);
    buttons[0].click();
    expect(consent.choose).toHaveBeenCalledWith('denied');
    buttons[1].click();
    expect(consent.choose).toHaveBeenCalledWith('granted');
  });

  it('shows nothing once the visitor has chosen', () => {
    consent.bannerOpen$.next(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.consent-bar')).toBeNull();
  });
});
