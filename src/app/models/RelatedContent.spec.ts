import { ExploreItem, groupExploreItems, interleave, MAX_RELATED, mergeExploreItems, relatedFields, seededOrder, youtubeIdFrom } from './RelatedContent';

const item = (type: ExploreItem['type'], id: string, reason: ExploreItem['reason'] = 'linked'): ExploreItem =>
  ({ type, id, title: id, image: null, link: [], reason });

describe('Related content', () => {
  it('youtubeIdFrom reads bare IDs and watch, share, embed and shorts URLs', () => {
    expect(youtubeIdFrom('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeIdFrom('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe('dQw4w9WgXcQ');
    expect(youtubeIdFrom('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe('dQw4w9WgXcQ');
    expect(youtubeIdFrom('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeIdFrom('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('youtubeIdFrom rejects anything else', () => {
    expect(youtubeIdFrom('')).toBeNull();
    expect(youtubeIdFrom('Our Planet full episode')).toBeNull();
    expect(youtubeIdFrom('https://example.com/watch?v=short')).toBeNull();
    expect(youtubeIdFrom('https://youtu.be/dQw4w9WgXcQextra')).toBeNull();
  });

  it('relatedFields drops duplicates, blanks, unknown types and the item itself', () => {
    const { relatedContent, relatedKeys } = relatedFields([
      { type: 'blog', id: 'b1', title: 'One' },
      { type: 'blog', id: 'b1', title: 'One again' },
      { type: 'blog', id: 'self', title: 'Me' },
      { type: 'video', id: 'dQw4w9WgXcQ', title: 'Video', element: 'earth' },
      { type: 'action', id: '', title: 'Blank' },
      { type: 'poll' as any, id: 'p1', title: 'Poll' },
      null
    ], { type: 'blog', id: 'self' });
    expect(relatedKeys).toEqual(['blog:b1', 'video:dQw4w9WgXcQ']);
    expect(relatedContent[1]).toEqual({ type: 'video', id: 'dQw4w9WgXcQ', title: 'Video', element: 'earth' });
  });

  it('relatedFields keeps a same-ID link of another type, and caps the list', () => {
    expect(relatedFields([{ type: 'action', id: 'x', title: '' }], { type: 'blog', id: 'x' }).relatedKeys).toEqual(['action:x']);
    const many = Array.from({ length: 10 }, (_, i) => ({ type: 'blog' as const, id: `b${i}`, title: '' }));
    expect(relatedFields(many).relatedContent.length).toBe(MAX_RELATED);
    expect(relatedFields(undefined)).toEqual({ relatedContent: [], relatedKeys: [] });
  });

  it('mergeExploreItems puts links first, removes duplicates and the current item, and caps', () => {
    const result = mergeExploreItems(
      'blog:self',
      [item('action', 'a1'), item('blog', 'self'), item('video', 'v1')],
      [item('action', 'a1', 'element'), item('blog', 'b2', 'element'), item('blog', 'b3', 'element')],
      4
    );
    expect(result.map((i) => `${i.type}:${i.id}:${i.reason}`)).toEqual([
      'action:a1:linked', 'video:v1:linked', 'blog:b2:element', 'blog:b3:element'
    ]);
  });

  it('groupExploreItems splits reading from actions, primary items first, each capped', () => {
    const groups = groupExploreItems(
      'blog:self',
      [item('action', 'a1'), item('blog', 'b1', 'similar'), item('blog', 'self'), item('video', 'v1')],
      [item('blog', 'b1', 'element'), item('blog', 'b2', 'element'), item('blog', 'b3', 'element'), item('action', 'a2', 'element'), item('action', 'a3', 'element')],
      { read: 3, act: 2 }
    );
    expect(groups.read.map((i) => `${i.type}:${i.id}:${i.reason}`)).toEqual(['blog:b1:similar', 'video:v1:linked', 'blog:b2:element']);
    expect(groups.act.map((i) => `${i.type}:${i.id}`)).toEqual(['action:a1', 'action:a2']);
  });

  it('interleave alternates two lists of any length', () => {
    expect(interleave<number | string>([1, 2, 3], ['a'])).toEqual([1, 'a', 2, 3]);
    expect(interleave([], [1, 2])).toEqual([1, 2]);
  });

  it('seededOrder is stable per page but differs between pages', () => {
    const pool = Array.from({ length: 12 }, (_, i) => `b${i}`);
    const order = (seed: string) => seededOrder(pool, seed, (x) => x);
    expect(order('blog:one')).toEqual(order('blog:one'));
    expect(order('blog:one').slice(0, 4)).not.toEqual(order('blog:two').slice(0, 4));
    expect([...order('video:x')].sort()).toEqual([...pool].sort());
  });
});
