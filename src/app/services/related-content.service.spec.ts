import { of } from 'rxjs';
import { ExploreItem } from '../models/RelatedContent';
import { RelatedContentService } from './related-content.service';

const item = (type: ExploreItem['type'], id: string, extra: Partial<ExploreItem> = {}): ExploreItem =>
  ({ type, id, title: id, image: null, link: ['/element', 'earth', type, id], reason: 'linked', ...extra });

describe('RelatedContentService.storyBehind', () => {
  // storyBehind only composes exploreNext, so the Firestore-backed parts aren't needed.
  const service = new RelatedContentService(null as any, null as any, null as any);
  const action: any = {
    id: 'meal',
    relatedContent: [
      { type: 'action', id: 'other', title: 'Other action' },
      { type: 'blog', id: 'vegan', title: 'Veganism' }
    ]
  };

  it('asks for one story or video from links and matches only: no actions, no element fallback', (done) => {
    const spy = spyOn(service, 'exploreNext').and.returnValue(of({ read: [item('blog', 'vegan')], act: [] }));
    service.storyBehind(action, 'earth').subscribe((story) => {
      const [source, limits] = spy.calls.mostRecent().args;
      expect(source).toEqual({ type: 'action', id: 'meal', links: [{ type: 'blog', id: 'vegan', title: 'Veganism' }], element: undefined });
      expect(limits).toEqual({ read: 1, act: 0 });
      expect(story?.id).toBe('vegan');
      done();
    });
  });

  it('is null when nothing really matches', (done) => {
    spyOn(service, 'exploreNext').and.returnValue(of({ read: [], act: [] }));
    service.storyBehind({ id: 'x' } as any).subscribe((story) => {
      expect(story).toBeNull();
      done();
    });
  });

  it("links a video with no element of its own under the action's element", (done) => {
    spyOn(service, 'exploreNext').and.returnValue(of({ read: [item('video', 'abc', { element: undefined, link: ['/element', undefined, 'video', 'abc'] })], act: [] }));
    service.storyBehind({ id: 'x' } as any, 'water').subscribe((story) => {
      expect(story?.link).toEqual(['/element', 'water', 'video', 'abc']);
      done();
    });
  });
});

describe('RelatedContentService element fallback (video pages)', () => {
  const action = (id: string, elementIds: string[]) => ({ id, title: id, isActive: true, elementIds, displayOrder: 0 });
  const noStories = { collection: () => ({ get: () => of({ docs: [] }) }) };

  it("shows the element's own actions before those that have it only as an extra", (done) => {
    const actions = [action('sort-waste', ['earth', 'water']), action('cleanup', ['earth', 'water', 'air']), action('leak', ['water']), action('tap', ['water'])];
    const service = new RelatedContentService(noStories as any, { getActionsForElement: () => of(actions) } as any, null as any);
    (service as any).moreFromElement('water', 'video:river').subscribe((items: ExploreItem[]) => {
      expect(items.map((i) => i.id).slice(0, 2).sort()).toEqual(['leak', 'tap']);
      expect(items.map((i) => i.id).slice(2).sort()).toEqual(['cleanup', 'sort-waste']);
      done();
    });
  });
});
