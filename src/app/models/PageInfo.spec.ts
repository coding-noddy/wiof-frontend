import { fakeAsync, tick } from '@angular/core/testing';
import { NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { CONTENT_TITLE_WAIT_MS, PageTrackingService } from '../services/page-tracking.service';
import { suggestionClick } from '../services/suggestion-tracking.service';
import { documentTitle, pageInfo, SITE_NAME } from './PageInfo';

describe('Page info (titles and GA page groups)', () => {
  it('names every kind of page', () => {
    const cases: [string, string, string | null, string][] = [
      ['/', 'home', null, 'Home'],
      ['/home?x=1', 'home', null, 'Home'],
      ['/element/water', 'element', 'water', 'Water'],
      ['/element/water/blogs', 'stories', 'water', 'Water stories'],
      ['/element/water/blog/rainwater', 'story', 'water', 'Story · Water'],
      ['/element/air/videos', 'videos', 'air', 'Air videos'],
      ['/element/air/video/abc', 'video', 'air', 'Video · Air'],
      ['/element/earth/take-action?action=leak', 'take_action', 'earth', 'Earth · Take Action'],
      ['/element/spirit', 'element', 'spirit', 'Spirit'],
      ['/take-action', 'take_action', null, 'Take Action'],
      ['/my-journey', 'my_journey', null, 'My Journey'],
      ['/my-feedback/123', 'my_feedback', null, 'My Feedback'],
      ['/privacy-policy', 'legal', null, 'Privacy Policy'],
      ['/our-team', 'about', null, 'Our Team'],
      ['/admin-dashboard/manage-blogs', 'admin', null, 'Admin · Manage blogs'],
      ['/element/fire', 'not_found', null, 'Page not found'],
      ['/nope', 'not_found', null, 'Page not found']
    ];
    for (const [url, group, element, title] of cases) {
      const p = pageInfo(url);
      expect([p.group, p.element, p.title]).withContext(url).toEqual([group, element, title]);
    }
    expect(pageInfo('/element/water/blog/x').waitsForContent).toBeTrue();
    expect(pageInfo('/element/water/blog/x?a=1#top').path).toBe('/element/water/blog/x');
    expect(pageInfo('/').path).toBe('/home');
  });

  it('browser titles: the site name last, the content title on story and video pages', () => {
    expect(documentTitle(pageInfo('/home'))).toBe(SITE_NAME);
    expect(documentTitle(pageInfo('/take-action'))).toBe(`Take Action · ${SITE_NAME}`);
    expect(documentTitle(pageInfo('/element/water/blog/x'), 'Rainwater Harvesting')).toBe(`Rainwater Harvesting · Water · ${SITE_NAME}`);
    expect(documentTitle(pageInfo('/element/water/blog/x'))).toBe(`Story · Water · ${SITE_NAME}`);
  });
});

describe('PageTrackingService', () => {
  let events: Subject<any>;
  let views: any[];
  let title: string;
  const make = () => {
    events = new Subject();
    views = [];
    title = '';
    const service = new PageTrackingService(
      { events } as any,
      { setTitle: (t: string) => (title = t), getTitle: () => title } as any,
      { logPageView: (v: any) => views.push(v) } as any,
      { runOutsideAngular: (fn: () => any) => fn(), run: (fn: () => any) => fn() } as any
    );
    service.start();
    return service;
  };
  const go = (url: string) => events.next(new NavigationEnd(1, url, url));

  it('one page_view per page, with its title, group and element', () => {
    make();
    go('/home');
    go('/take-action');
    go('/take-action?action=leak'); // same page, a query change: no new view
    expect(views.map((v) => [v.page_path, v.content_group, v.page_title])).toEqual([
      ['/home', 'home', SITE_NAME],
      ['/take-action', 'take_action', `Take Action · ${SITE_NAME}`]
    ]);
    expect(views[1].page_referrer).toContain('/home');
  });

  it('a story waits for its title, then sends it', fakeAsync(() => {
    const service = make();
    go('/element/water/blog/rainwater');
    expect(views.length).toBe(0);
    service.setContentTitle('Rainwater Harvesting');
    expect(views.length).toBe(1);
    expect(views[0]).toEqual(jasmine.objectContaining({ page_title: `Rainwater Harvesting · Water · ${SITE_NAME}`, content_group: 'story', element: 'water' }));
    tick(CONTENT_TITLE_WAIT_MS);
    expect(views.length).toBe(1);
  }));

  it('a story whose title never comes is still counted, with the placeholder title', fakeAsync(() => {
    make();
    go('/element/air/video/abc');
    tick(CONTENT_TITLE_WAIT_MS);
    expect(views.map((v) => v.page_title)).toEqual([`Video · Air · ${SITE_NAME}`]);
  }));
});

describe('suggestionClick', () => {
  it('records the ID the later read, watch or completion carries', () => {
    const blog: any = { type: 'blog', id: 'abc123', link: ['/element', 'water', 'blog', 'rainwater'], reason: 'similar' };
    const action: any = { type: 'action', id: 'leak', link: ['/element', 'water', 'take-action'], reason: 'linked' };
    expect(suggestionClick('explore_next', blog, 2)).toEqual({ via: 'explore_next', contentType: 'blog', contentId: 'rainwater', position: 2, reason: 'similar' });
    expect(suggestionClick('today', action, 1)?.contentId).toBe('leak');
    expect(suggestionClick('today', { ...action, id: '' , link: [] }, 1)).toBeNull();
  });
});
