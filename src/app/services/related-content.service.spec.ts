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
