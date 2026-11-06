import { pickFollowUp } from './FollowUp';
import { communitySentence, communityView } from '../components/community-impact/community-impact.component';
import { showCommunity } from './CommunityImpact';

const action = (id: string, isActive = true): any => ({ id, title: id, isActive });
const started = (actionId: string, iso: string, status = 'IN_PROGRESS'): any => ({ actionId, status, startedAt: new Date(iso) });
const NOW = new Date(2026, 10, 6, 10, 0); // 6 Nov, local time

describe('"Did you try it?" (8.15.0)', () => {
  const actions = [action('shower'), action('leak'), action('old', false)];

  it('asks about the most recently started action from an earlier day', () => {
    const history = [started('leak', '2026-11-02T10:00:00'), started('shower', '2026-11-05T10:00:00')];
    expect(pickFollowUp(history, actions, NOW, {}, '2026-11-06')?.id).toBe('shower');
  });

  it('not about one started today, done, inactive, or put off today', () => {
    const today = new Date(2026, 10, 6, 8, 0).toISOString();
    expect(pickFollowUp([started('shower', today)], actions, NOW, {}, '2026-11-06')).toBeNull();
    expect(pickFollowUp([started('shower', '2026-11-04T10:00:00', 'COMPLETE')], actions, NOW, {}, '2026-11-06')).toBeNull();
    expect(pickFollowUp([started('old', '2026-11-04T10:00:00')], actions, NOW, {}, '2026-11-06')).toBeNull();
    const history = [started('leak', '2026-11-02T10:00:00'), started('shower', '2026-11-05T10:00:00')];
    expect(pickFollowUp(history, actions, NOW, { shower: '2026-11-06' }, '2026-11-06')?.id).toBe('leak');
    expect(pickFollowUp(history, actions, NOW, { shower: '2026-11-05' }, '2026-11-06')?.id).toBe('shower');
  });
});

describe('"Together this month" (8.15.0)', () => {
  const c = (members: number, totals: any) => ({ month: '2026-11', members, minMembers: 20, totals });

  it('shows only from 20 members, with something saved', () => {
    expect(showCommunity(c(19, { water: 100 }))).toBeFalse();
    expect(showCommunity(c(20, { water: 100 }))).toBeTrue();
    expect(showCommunity(c(25, {}))).toBeFalse();
    expect(showCommunity(null)).toBeFalse();
  });

  it('admins always see it, marked as a preview, until there are enough members', () => {
    expect(communityView(c(3, { water: 100 }), false)).toBeNull();
    expect(communityView(c(3, { water: 100 }), true)).toEqual({ members: 3, sentence: 'about 100 L of water', preview: true, minMembers: 20 });
    expect(communityView(c(20, { water: 100 }), false)?.preview).toBeFalse();
    expect(communityView({ ...c(1, { water: 5 }), minMembers: 1 }, false)?.preview).toBeFalse();
  });

  it('says it as one sentence', () => {
    expect(communitySentence(c(20, { water: 1200, co2: 30.4, plastic: 40 }))).toBe('about 1,200 L of water, about 30 kg of CO₂ and 40 plastic items avoided');
    expect(communitySentence(c(20, { water: 1200 }))).toBe('about 1,200 L of water');
  });
});
