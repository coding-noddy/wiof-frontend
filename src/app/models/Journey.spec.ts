import { elementsExplored, firstSteps, journeyStory, needsWelcome, preferredElements, showFirstSteps } from './Journey';

const metrics = (m: any = {}): any => ({
  blogsRead: 0, qualityReads: 0, qualityReadsByElement: {}, videosWatched: 0, videosCompleted: 0, pollsVoted: 0,
  lastEqScore: null, lastEqDate: null, lastBlogReadDate: null, totalActionsCompleted: 0, uniqueActionsCompleted: 0,
  actionsByElement: {}, lastActionAt: null, ...m
});
const profile = (p: any = {}): any => ({ uid: 'u1', preferredElements: [], ...p });

describe('Journey', () => {
  it('preferredElements keeps known elements in the site order', () => {
    expect(preferredElements(profile({ preferredElements: ['Water', 'fire', 'air'] }))).toEqual(['air', 'water']);
    expect(preferredElements(null)).toEqual([]);
  });

  it('needsWelcome: only a profile with no welcome done and no elements chosen', () => {
    expect(needsWelcome(profile())).toBeTrue();
    expect(needsWelcome(profile({ preferredElements: ['earth'] }))).toBeFalse();
    expect(needsWelcome(profile({ onboarding: { welcomeDoneAt: {} } }))).toBeFalse();
    expect(needsWelcome(null)).toBeFalse();
  });

  it('firstSteps ticks each step from its metric and links to the first chosen element', () => {
    const steps = firstSteps(profile({ preferredElements: ['water'] }), metrics({ qualityReads: 1, lastEqScore: 80 }));
    expect(steps.map((s) => `${s.key}:${s.done}`)).toEqual(['elements:true', 'read:true', 'watch:false', 'eq:true', 'act:false']);
    expect(steps.find((s) => s.key === 'act').link).toBe('/element/water/take-action');
    expect(firstSteps(profile(), metrics()).find((s) => s.key === 'read').link).toBe('/element/earth/blogs');
  });

  it('the EQ step opens the EQ check on the Spirit page', () => {
    const eq = firstSteps(profile(), metrics()).find((s) => s.key === 'eq');
    expect([eq.link, eq.fragment]).toEqual(['/element/spirit', 'eq-assessment']);
  });

  it('showFirstSteps: hidden once dismissed or when everything is done', () => {
    const all = metrics({ qualityReads: 1, videosCompleted: 1, lastEqScore: 70, totalActionsCompleted: 1 });
    const chosen = profile({ preferredElements: ['air'] });
    expect(showFirstSteps(chosen, firstSteps(chosen, metrics()))).toBeTrue();
    expect(showFirstSteps(chosen, firstSteps(chosen, all))).toBeFalse();
    const dismissed = profile({ onboarding: { checklistDismissedAt: {} } });
    expect(showFirstSteps(dismissed, firstSteps(dismissed, metrics()))).toBeFalse();
  });

  it('elementsExplored counts quality reads and actions per element', () => {
    expect(elementsExplored(metrics({ qualityReadsByElement: { water: 2, air: 0 }, actionsByElement: { earth: 1 } }))).toEqual(['water', 'earth']);
    expect(elementsExplored(null)).toEqual([]);
  });

  it('journeyStory tells what the user has done, since they joined', () => {
    const joined = { toDate: () => new Date(2026, 2, 14) };
    const m = metrics({ qualityReads: 9, videosCompleted: 1, totalActionsCompleted: 17, qualityReadsByElement: { water: 3, air: 1 }, actionsByElement: { earth: 5, spirit: 2 } });
    expect(journeyStory(profile({ joinedDate: joined }), m)).toBe("Since you joined in March 2026, you've read 9 stories, watched 1 video and done 17 actions across 4 elements.");
    expect(journeyStory(profile(), metrics({ qualityReads: 1, qualityReadsByElement: { earth: 1 } }))).toBe("You've read 1 story in 1 element.");
  });

  it('journeyStory is null with nothing to tell', () => {
    expect(journeyStory(profile(), metrics({ blogsRead: 3 }))).toBeNull();
    expect(journeyStory(profile(), null)).toBeNull();
  });
});
