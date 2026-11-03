import { Blog } from './Blog';

describe('Blog dates', () => {
  it('toMillis reads epoch millis, Firestore Timestamps and date strings', () => {
    expect(Blog.toMillis(1700000000000)).toBe(1700000000000);
    expect(Blog.toMillis({ toDate: () => new Date(1700000000000) })).toBe(1700000000000);
    expect(Blog.toMillis('2021-05-23T12:00:00Z')).toBe(Date.UTC(2021, 4, 23, 12));
  });

  it('toMillis returns null for a missing or unreadable date', () => {
    expect(Blog.toMillis(undefined)).toBeNull();
    expect(Blog.toMillis(null)).toBeNull();
    expect(Blog.toMillis('')).toBeNull();
    expect(Blog.toMillis('not a date')).toBeNull();
  });

  it('sortDate uses publishDate, then submitDate, then 0', () => {
    expect(Blog.sortDate({ publishDate: 200 as any, submitDate: 100 as any })).toBe(200);
    expect(Blog.sortDate({ publishDate: undefined, submitDate: 100 as any })).toBe(100);
    expect(Blog.sortDate({ publishDate: undefined, submitDate: undefined })).toBe(0);
  });
});
