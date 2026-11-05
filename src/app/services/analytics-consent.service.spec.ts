import { ANALYTICS_CONSENT_KEY, readAnalyticsConsent } from '../util/analytics-init';
import { AnalyticsConsentService } from './analytics-consent.service';

describe('AnalyticsConsentService (Google Analytics opt-in)', () => {
  let resend: jasmine.Spy;
  const make = () => new AnalyticsConsentService({ resendCurrent: resend } as any);

  beforeEach(() => {
    localStorage.removeItem(ANALYTICS_CONSENT_KEY);
    resend = jasmine.createSpy('resendCurrent');
  });
  afterEach(() => localStorage.removeItem(ANALYTICS_CONSENT_KEY));

  it('asks on a first visit: no choice yet, banner open', () => {
    const s = make();
    expect(s.choice$.value).toBeNull();
    expect(s.bannerOpen$.value).toBeTrue();
  });

  it('Decline is remembered, closes the banner and counts nothing', () => {
    make().choose('denied');
    expect(readAnalyticsConsent()).toBe('denied');
    expect(resend).not.toHaveBeenCalled();
    const next = make();
    expect(next.bannerOpen$.value).toBeFalse();
  });

  it('Accept is remembered and counts the page the visitor is on, once', () => {
    const s = make();
    s.choose('granted');
    s.choose('granted');
    expect(readAnalyticsConsent()).toBe('granted');
    expect(resend).toHaveBeenCalledTimes(1);
  });

  it('Cookie settings reopens the banner with the current choice', () => {
    const s = make();
    s.choose('denied');
    s.reopen();
    expect(s.bannerOpen$.value).toBeTrue();
    expect(s.choice$.value).toBe('denied');
  });

  it('ignores anything but granted or denied in storage', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'yes');
    expect(readAnalyticsConsent()).toBeNull();
  });
});
