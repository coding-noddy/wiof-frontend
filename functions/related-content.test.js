/**
 * Unit tests for related-content.js (automatic Explore next matches). No emulator needed:
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { MIN_SCORE, OCCASION_MIN_SCORE, computeRelated, corpusFrom, rebuildRelatedContent, terms } = require('./related-content');

const blog = (id, title, content, extra = {}) => ({ type: 'blog', id, title, content, elements: ['earth'], ...extra });
const action = (id, title, shortDescription, extra = {}) => ({ type: 'action', id, title, shortDescription, elements: ['earth'], ...extra });
const doc = (id, data) => ({ id, data: () => data });

const CORPUS = [
  blog('vegan', 'Decoding the science behind veganism', 'A vegan diet without meat or dairy is good for the planet. Vegan recipes.', { subCategory: 'Veganism' }),
  blog('rain', 'Rainwater harvesting and its benefits', 'Harvest rainwater from your roof to save water at home.', { elements: ['water'] }),
  blog('solar', 'Solar energy and its future', 'Solar panels turn sunlight into electricity.', { elements: ['energy'] }),
  action('meal', 'Try a plant-based meal', 'Eat one plant-based meal today.'),
  action('shower', 'Take a shorter shower', 'Save water with a shorter shower.', { elements: ['water'] }),
  action('lights', 'Switch off unused lights', 'Save electricity by switching off lights.', { elements: ['energy'] })
];

describe('terms', () => {
  it('drops HTML, stopwords and numbers, stems, and adds thesaurus concepts', () => {
    const t = terms('<p>We are recycling 10 reusable bottles &amp; eating vegan</p>');
    assert.ok(t.includes('recycl') && t.includes('#recycle'));
    assert.ok(t.includes('reusabl') && t.includes('#reuse'));
    assert.ok(t.includes('#plantdiet'));
    assert.ok(!t.includes('are') && !t.includes('10') && !t.includes('amp') && !t.includes('p'));
  });

  it('maps different words for the same idea to one concept', () => {
    assert.ok(terms('plant-based').includes('#plantdiet'));
    assert.ok(terms('meat-free').includes('#plantdiet'));
    assert.ok(terms('vegan').includes('#plantdiet'));
  });
});

describe('computeRelated', () => {
  const related = computeRelated(CORPUS);

  it('matches stories to the actions about the same thing, best first', () => {
    assert.equal(related.get('blog_vegan').actions[0].id, 'meal');
    assert.equal(related.get('blog_rain').actions[0].id, 'shower');
    assert.equal(related.get('blog_solar').actions[0].id, 'lights');
    assert.equal(related.get('action_shower').blogs[0].id, 'rain');
  });

  it('never lists the item itself, and leaves out weak matches', () => {
    for (const [key, lists] of related) {
      const [type, id] = key.split('_');
      assert.ok(!lists[`${type}s`].some((x) => x.id === id), key);
      for (const x of [...lists.blogs, ...lists.actions]) assert.ok(x.score >= MIN_SCORE, `${key} -> ${x.id}`);
    }
    assert.ok(!related.get('blog_vegan').actions.some((a) => a.id === 'lights'));
  });

  describe('suggested actions fit the element (8.9.1)', () => {
    const river = blog('river', 'Our rivers need us', 'River water pollution: rivers carry plastic waste and sewage.', { elements: ['water'] });
    const scoreOf = (related, key, id) => (related.get(key).actions.find((a) => a.id === id) || {}).score;

    it('leaves out an action from another element unless the match is strong', () => {
      const cold = action('cold', 'Wash clothes with cold water', 'Cold water washing.', { elements: ['energy'] });
      const covid = blog('covid', 'Covid and water', 'Water shortages during Covid.', { elements: ['air'] });
      assert.ok(!computeRelated([covid, cold, ...CORPUS]).get('blog_covid').actions.some((a) => a.id === 'cold'));
      const twin = blog('cold-story', 'Wash clothes with cold water', 'Cold water washing.', { elements: ['air'] });
      assert.ok(computeRelated([twin, cold, ...CORPUS]).get('blog_cold-story').actions.some((a) => a.id === 'cold'));
    });

    it("ranks an action whose main element matches above one that has it only as an extra", () => {
      const sortWaste = action('sort', 'Clean up plastic waste', 'River plastic waste.', { elements: ['earth', 'water'] });
      const cleanup = action('clean', 'Clean up plastic waste', 'River plastic waste.', { elements: ['water', 'earth'] });
      const related = computeRelated([river, sortWaste, cleanup, ...CORPUS]);
      assert.ok(scoreOf(related, 'blog_river', 'clean') > scoreOf(related, 'blog_river', 'sort'));
    });

    it('holds an action with the element only as an extra to a higher bar', () => {
      const weak = action('weak', 'Sort your household waste', 'Separate dry and wet waste at home, recycle plastic.', { elements: ['earth', 'water'] });
      for (const x of computeRelated([river, weak, ...CORPUS]).get('blog_river').actions) {
        if (x.id === 'weak') assert.ok(x.score >= 0.1, `secondary match kept at ${x.score}`);
      }
    });
  });

  it('gives every item a list, even with nothing similar', () => {
    const lonely = computeRelated([blog('a', 'Quantum chromodynamics', 'gluons'), action('b', 'Water the garden', 'hose')]);
    assert.deepEqual(lonely.get('blog_a'), { blogs: [], actions: [] });
  });
});

describe('calendar occasions', () => {
  const occasion = { type: 'occasion', id: 'veg-day', title: 'World Vegetarian Day', description: 'The health and environmental benefits of a vegetarian, plant-based diet.', elements: [] };

  it('get matched to stories and actions, and are never suggested themselves', () => {
    const related = computeRelated([...CORPUS, occasion]);
    assert.equal(related.get('occasion_veg-day').actions[0].id, 'meal');
    assert.equal(related.get('occasion_veg-day').blogs[0].id, 'vegan');
    for (const [, lists] of related) assert.ok(![...lists.blogs, ...lists.actions].some((x) => x.id === 'veg-day'));
  });

  it('need two real words in common, ignoring calendar boilerplate', () => {
    const run = { type: 'occasion', id: 'run', title: 'World Run Day', description: 'A global day to celebrate running.', elements: [] };
    const water = { type: 'action', id: 'tap', title: 'Stop unnecessary running water', shortDescription: 'Turn off the tap.', elements: [] };
    assert.deepEqual(computeRelated([...CORPUS, water, run]).get('occasion_run'), { blogs: [], actions: [] });
  });

  it('use a stricter bar than stories and actions', () => {
    const related = computeRelated([...CORPUS, occasion]);
    for (const x of [...related.get('occasion_veg-day').blogs, ...related.get('occasion_veg-day').actions]) assert.ok(x.score >= OCCASION_MIN_SCORE);
    assert.ok(OCCASION_MIN_SCORE > MIN_SCORE);
  });

  it("don't change the matches between stories and actions", () => {
    const without = computeRelated(CORPUS);
    const withOccasion = computeRelated([...CORPUS, occasion]);
    for (const [key, lists] of without) assert.deepEqual(withOccasion.get(key), lists, key);
  });

  it('are read from Envcal by corpusFrom', () => {
    const items = corpusFrom([], [], [doc('o1', { occasion: 'Earth Day', description: 'Protect the planet' })]);
    assert.deepEqual(items.map((i) => `${i.type}:${i.id}:${i.title}`), ['occasion:o1:Earth Day']);
  });
});

describe('corpusFrom', () => {
  it('uses blogs and active actions only, with elements', () => {
    const items = corpusFrom(
      [doc('b1', { title: 'T', category: 'Earth' })],
      [doc('a1', { title: 'On', isActive: true, elementIds: ['water'] }), doc('a2', { title: 'Off', isActive: false })]
    );
    assert.deepEqual(items.map((i) => `${i.type}:${i.id}:${i.elements.join('+')}`), ['blog:b1:earth', 'action:a1:water']);
  });
});

describe('rebuildRelatedContent', () => {
  const fakeDb = (collections) => {
    const writes = [];
    const deletes = [];
    const db = {
      writes, deletes,
      collection: (name) => ({
        get: async () => ({ docs: (collections[name] || []).map(([id, data]) => doc(id, data)) }),
        doc: (id) => ({ name, id })
      }),
      batch: () => ({
        set: (ref, data) => writes.push([ref.id, data]),
        delete: (ref) => deletes.push(ref.id),
        commit: async () => {}
      })
    };
    return db;
  };

  it('writes changed lists, skips unchanged ones and deletes stale ones', async () => {
    const collections = {
      Blogs: [['b1', { title: 'Rainwater harvesting', content: 'save water', category: 'Water' }]],
      actions: [['a1', { title: 'Shorter shower', shortDescription: 'save water', isActive: true, elementIds: ['water'] }]],
      related_auto: [['blog_gone', { blogs: [], actions: [] }]]
    };
    const first = fakeDb(collections);
    const report = await rebuildRelatedContent(first);
    assert.equal(report.written, 2);
    assert.deepEqual(first.deletes, ['blog_gone']);

    collections.related_auto = first.writes.map(([id, data]) => [id, data]);
    const second = fakeDb(collections);
    assert.equal((await rebuildRelatedContent(second)).written, 0);
  });

  it('writes nothing on a dry run', async () => {
    const db = fakeDb({ Blogs: [['b1', { title: 'x' }]], actions: [], related_auto: [] });
    const report = await rebuildRelatedContent(db, { apply: false });
    assert.equal(report.written, 1);
    assert.equal(db.writes.length, 0);
  });
});
