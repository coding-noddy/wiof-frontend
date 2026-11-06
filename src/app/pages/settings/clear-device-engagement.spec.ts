import { FOLLOW_UP_LATER_KEY } from 'src/app/models/FollowUp';
import { clearDeviceEngagement } from './settings.page';

describe('clearDeviceEngagement (8.16.0)', () => {
  const keys = [FOLLOW_UP_LATER_KEY, 'wiof_impact_amount_leak', 'wiof_analytics_consent', 'wiof_today_hidden'];
  beforeEach(() => keys.forEach((k) => localStorage.setItem(k, 'x')));
  afterEach(() => keys.forEach((k) => localStorage.removeItem(k)));

  it('forgets "Not yet" answers, and keeps settings-like memories', () => {
    clearDeviceEngagement(false);
    expect(localStorage.getItem(FOLLOW_UP_LATER_KEY)).toBeNull();
    expect(localStorage.getItem('wiof_impact_amount_leak')).toBe('x');
    expect(localStorage.getItem('wiof_analytics_consent')).toBe('x');
    expect(localStorage.getItem('wiof_today_hidden')).toBe('x');
  });

  it('with Take Action progress, also forgets the last impact amounts', () => {
    clearDeviceEngagement(true);
    expect(localStorage.getItem('wiof_impact_amount_leak')).toBeNull();
    expect(localStorage.getItem('wiof_analytics_consent')).toBe('x');
  });
});
