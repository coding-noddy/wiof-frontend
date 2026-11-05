import { NextForYouComponent } from '../components/next-for-you/next-for-you.component';
import { NextForYouInput, nextForYouElements, pickNextForYou, shortTitle } from './NextForYou';
import { ExploreItem } from './RelatedContent';

const story = (id: string, element = 'water', slug = `${id}-slug`): ExploreItem =>
  ({ type: 'blog', id, title: `Story ${id}`, element, blog: { slug } as any, image: null, link: ['/element', element, 'blog', slug], reason: 'similar' });
const action = (id: string, elementIds = ['water']): ExploreItem =>
  ({ type: 'action', id, title: `Action ${id}`, action: { id, elementIds } as any, image: null, link: ['/element', elementIds[0], 'take-action'], reason: 'element' });

const input = (o: Partial<NextForYouInput> = {}): NextForYouInput => ({
  elements: ['water'],
  readIds: new Set(),
  doneActionIds: new Set(),
  started: [],
  recentReads: [],
  newestByElement: {},
  actionsByElement: {},
  ...o
});

const ids = (picks: { item: ExploreItem }[]) => picks.map((p) => p.item.id);

describe('Next for you', () => {
  it('suggests from the chosen elements, else the explored ones', () => {
    expect(nextForYouElements({ preferredElements: ['Earth', 'water'] }, null)).toEqual(['water', 'earth']);
    expect(nextForYouElements({ preferredElements: [] }, { qualityReadsByElement: { air: 2 } } as any)).toEqual(['air']);
    expect(nextForYouElements(null, null)).toEqual([]);
  });

  it('stories similar to recent reads come first, with the reason, then the newest in each element', () => {
    const picks = pickNextForYou(input({
      elements: ['water', 'earth'],
      recentReads: [{ title: 'Veganism', blogs: [story('s1')], actions: [] }],
      newestByElement: { water: [story('w1')], earth: [story('e1', 'earth')] }
    }), { read: 3, act: 0, total: 3 });
    expect(picks.read.map((p) => `${p.item.id}: ${p.why}`)).toEqual([
      's1: Because you read “Veganism”',
      'w1: New in Water',
      'e1: New in Earth'
    ]);
  });

  it('never suggests a story already read, by ID or by slug', () => {
    const picks = pickNextForYou(input({
      readIds: new Set(['s1', 's2-slug']),
      newestByElement: { water: [story('s1'), story('s2'), story('s3')] }
    }));
    expect(ids(picks.read)).toEqual(['s3']);
  });

  it('keeps to the user\'s elements', () => {
    const picks = pickNextForYou(input({
      recentReads: [{ title: 'X', blogs: [story('air1', 'air'), story('w1')], actions: [action('a-air', ['air']), action('a-w')] }]
    }));
    expect(ids(picks.read)).toEqual(['w1']);
    expect(ids(picks.act)).toEqual(['a-w']);
  });

  it('actions: started first, then ones that go with a read, then the element\'s; never completed ones', () => {
    const picks = pickNextForYou(input({
      doneActionIds: new Set(['done']),
      started: [action('started')],
      recentReads: [{ title: 'Rainwater harvesting at home, a practical guide', blogs: [], actions: [action('done'), action('goes')] }],
      actionsByElement: { water: [action('started'), action('el')] }
    }), { read: 0, act: 3, total: 3 });
    expect(picks.act.map((p) => `${p.item.id}: ${p.why}`)).toEqual([
      'started: You started this',
      'goes: Goes with “Rainwater harvesting at home…”',
      'el: Try in Water'
    ]);
  });

  it('two of each, and one kind fills in when the other runs short, up to four', () => {
    const many = { water: [action('a1'), action('a2'), action('a3'), action('a4')] };
    const both = pickNextForYou(input({ newestByElement: { water: [story('s1'), story('s2'), story('s3')] }, actionsByElement: many }));
    expect([both.read.length, both.act.length]).toEqual([2, 2]);
    const fewStories = pickNextForYou(input({ newestByElement: { water: [story('s1')] }, actionsByElement: many }));
    expect([fewStories.read.length, fewStories.act.length]).toEqual([1, 3]);
    expect(pickNextForYou(input()).read).toEqual([]);
  });

  it('an item picked for two reasons shows once, with the first reason', () => {
    const picks = pickNextForYou(input({
      recentReads: [{ title: 'A', blogs: [story('s1')], actions: [] }, { title: 'B', blogs: [story('s1')], actions: [] }],
      newestByElement: { water: [story('s1')] }
    }));
    expect(picks.read.map((p) => p.why)).toEqual(['Because you read “A”']);
  });

  it('shortTitle trims long titles', () => {
    expect(shortTitle('Veganism')).toBe('Veganism');
    expect(shortTitle('Kalpasar Project: India’s Moonshot Water Vision')).toBe('Kalpasar Project: India’s…');
    expect(shortTitle('x'.repeat(50))).toBe('x'.repeat(28) + '…');
  });

  describe('component', () => {
    it('lists stories then actions, and names the elements', () => {
      const c = new NextForYouComponent();
      c.picks = { read: [{ item: story('s1'), why: 'New in Water' }], act: [{ item: { ...action('a1'), meta: '10 min' }, why: 'Try in Water' }], elements: ['water', 'earth', 'air'] };
      expect(ids(c.items)).toEqual(['s1', 'a1']);
      expect(c.basisLabel).toBe('Water, Earth and Air');
      expect(c.kindLabel(c.items[1])).toBe('Action · 10 min');
      expect(c.kindLabel(c.items[0])).toBe('Story');
    });

    it('shows nothing without picks', () => {
      expect(new NextForYouComponent().items).toEqual([]);
    });
  });
});
