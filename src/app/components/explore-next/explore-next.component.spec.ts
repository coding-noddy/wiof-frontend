import { of } from 'rxjs';
import { ExploreGroups, ExploreItem } from 'src/app/models/RelatedContent';
import { ExploreNextComponent, exploreReason, headingTopic } from './explore-next.component';

const item = (type: ExploreItem['type'], id: string, extra: Partial<ExploreItem> = {}): ExploreItem =>
  ({ type, id, title: id, image: null, link: [], reason: 'similar', ...extra });

/** The component's view once loaded, for a source and what the service returns. */
function render(source: any, groups: ExploreGroups, compact = false, sourceTitle: string | null = null) {
  const service = { exploreNext: jasmine.createSpy('exploreNext').and.returnValue(of(groups)) };
  const component = new ExploreNextComponent(service as any);
  component.source = source;
  component.compact = compact;
  component.sourceTitle = sourceTitle;
  component.ngOnChanges();
  const views: any[] = [];
  component.view$.subscribe((v) => views.push(v));
  return { component, views, service };
}

describe('ExploreNextComponent', () => {
  it('headingTopic capitalises each word and keeps acronyms', () => {
    expect(headingTopic('Khalsa aid')).toBe('Khalsa Aid');
    expect(headingTopic('  AQI ')).toBe('AQI');
    expect(headingTopic('Veganism')).toBe('Veganism');
  });

  it('headingTopic drops blanks and anything too long to be a topic', () => {
    expect(headingTopic('')).toBeNull();
    expect(headingTopic(undefined)).toBeNull();
    expect(headingTopic('Healthy sleep and Productive life')).toBeNull();
    expect(headingTopic('Minds & Closets with Mindful Spending')).toBeNull();
  });

  it('names what a blog or video is about, and keeps "Explore next" elsewhere', () => {
    const empty = { read: [item('blog', 'b')], act: [] };
    expect(render({ type: 'blog', id: 'x', subCategory: 'Veganism' }, empty).component.heading).toBe('Because you read about Veganism');
    expect(render({ type: 'blog', id: 'x', subCategory: 'Healthy sleep and Productive life' }, empty).component.heading).toBe('Because you read this story');
    expect(render({ type: 'video', id: 'v' }, empty).component.heading).toBe('Because you watched this video');
    expect(render({ links: [] }, empty).component.heading).toBe('Explore next');
    expect(render({ type: 'blog', id: 'x', subCategory: 'Veganism' }, empty, true).component.heading).toBe('Explore next');
  });

  it('shows a loading state first, then the non-empty groups in order', () => {
    const { views } = render({ type: 'blog', id: 'x' }, { read: [], act: [item('action', 'a')] });
    expect(views[0].groups).toBeNull();
    const groups = views[views.length - 1].groups;
    expect(groups.map((g: any) => g.title)).toEqual(['Your next step']);
  });

  it('uses the site cards on a page and the compact list in a modal', () => {
    const read = [item('blog', 'b', { blog: {} as any, element: 'earth' }), item('video', 'v', { video: {} as any, element: 'earth' })];
    const act = [item('action', 'a', { action: {} as any })];
    const page = render({ type: 'blog', id: 'x' }, { read, act });
    const [readGroup, actGroup] = page.views[page.views.length - 1].groups;
    expect(page.component.asSiteCards(readGroup)).toBeTrue();
    expect(page.component.asActionCards(actGroup)).toBeTrue();

    const modal = render({ links: [] }, { read, act }, true);
    const [r, a] = modal.views[modal.views.length - 1].groups;
    expect(modal.component.asSiteCards(r)).toBeFalse();
    expect(modal.component.asActionCards(a)).toBeFalse();
  });

  it('falls back to the compact list when a video has no element to link under', () => {
    const { component, views } = render({ type: 'blog', id: 'x' }, { read: [item('video', 'v', { video: {} as any })], act: [] });
    expect(component.asSiteCards(views[views.length - 1].groups[0])).toBeFalse();
  });

  it('counts a click that opens a suggestion, not one that shares or bookmarks it', () => {
    const clicked = jasmine.createSpy('clicked');
    const c = new ExploreNextComponent({} as any, { clicked } as any);
    const card = document.createElement('ion-card');
    card.setAttribute('href', '/element/water/blog/rainwater');
    card.innerHTML = '<img><button class="blog-share-icon"></button><app-bookmark-icon><span></span></app-bookmark-icon>';
    const item: any = { type: 'blog', id: 's1', link: ['/element', 'water', 'blog', 'rainwater'] };
    const at = (el: Element) => ({ target: el } as any);
    c.picked(at(card.querySelector('img')!), item, 0);
    c.picked(at(card.querySelector('.blog-share-icon')!), item, 0);
    c.picked(at(card.querySelector('app-bookmark-icon span')!), item, 0);
    c.picked(at(document.createElement('div')), item, 0);
    expect(clicked).toHaveBeenCalledOnceWith('explore_next', item, 1);
  });

  it('names the story or video itself when its title is known', () => {
    const empty = { read: [item('blog', 'b')], act: [] };
    expect(render({ type: 'blog', id: 'x', subCategory: 'Water' }, empty, false, 'Kalpasar Project: India’s Moonshot Water Vision').component.heading)
      .toBe('Because you read “Kalpasar Project: India’s Moonshot Water Vision”');
    expect(render({ type: 'blog', id: 'x' }, empty, false, 'THE OTHER PERSPECTIVE: COVID-19 OUTBREAK & WATER CRISIS').component.heading)
      .toBe('Because you read “THE OTHER PERSPECTIVE: COVID-19 OUTBREAK & WATER…”');
    expect(render({ type: 'video', id: 'v' }, empty, false, 'River clean-up').component.heading).toBe('Because you watched “River clean-up”');
  });

  it('a video title arriving later changes the heading without loading the suggestions again', () => {
    const { component, service } = render({ type: 'video', id: 'v' }, { read: [item('blog', 'b')], act: [] });
    component.sourceTitle = 'River clean-up';
    component.ngOnChanges({ sourceTitle: {} as any });
    expect(component.heading).toBe('Because you watched “River clean-up”');
    expect(service.exploreNext).toHaveBeenCalledTimes(1);
  });

  it('says why each card is shown', () => {
    expect(exploreReason(item('blog', 'b', { reason: 'linked' }), 'blog')).toBe('Picked by our team');
    expect(exploreReason(item('blog', 'b', { blog: { subCategory: 'rainwater harvesting' } as any }), 'blog')).toBe('Also about Rainwater Harvesting');
    expect(exploreReason(item('blog', 'b', { blog: {} as any }), 'blog')).toBe('On a similar topic');
    expect(exploreReason(item('action', 'a'), 'blog')).toBe('Goes with this story');
    expect(exploreReason(item('action', 'a'), 'video')).toBe('Goes with this video');
    expect(exploreReason(item('action', 'a', { reason: 'element', element: 'water', action: { elementIds: ['earth', 'water'] } as any }), 'video')).toBe('More in Earth');
    expect(exploreReason(item('video', 'v', { reason: 'element', element: 'water' }), 'video')).toBe('More in Water');
  });

  it('tints the section by element', () => {
    expect(render({ type: 'blog', id: 'x', element: 'Earth' }, { read: [], act: [] }).component.accent).toBe('earth');
    expect(render({ type: 'blog', id: 'x', element: 'energy' }, { read: [], act: [] }).component.accent).toBe('energy');
    expect(render({ type: 'blog', id: 'x', element: 'water' }, { read: [], act: [] }).component.accent).toBe('teal');
  });
});
