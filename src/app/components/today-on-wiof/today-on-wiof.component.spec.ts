import { of } from 'rxjs';
import { hiddenToday, sourceName, TODAY_HIDDEN_KEY, todaysOccasion } from 'src/app/models/TodayOnWiof';
import { toCalendarDay } from 'src/app/services/activity.service';
import { TodayOnWiofComponent } from './today-on-wiof.component';

const occasion = (o: any = {}): any => ({ id: 'veg', occasion: 'World Vegetarian Day', description: 'A day for plant-based food.', showMoreLink: 'https://www.navs-online.org/x', relatedContent: [], ...o });

describe('Today on WIOF', () => {
  it('todaysOccasion picks the first occasion with a fact', () => {
    expect(todaysOccasion([occasion({ id: 'a', description: '  ' }), occasion({ id: 'b' })])?.id).toBe('b');
    expect(todaysOccasion([])).toBeNull();
    expect(todaysOccasion(null)).toBeNull();
  });

  it('sourceName shows the site of a web link only', () => {
    expect(sourceName('https://www.navs-online.org/about')).toBe('navs-online.org');
    expect(sourceName('javascript:alert(1)')).toBeNull();
    expect(sourceName('')).toBeNull();
  });

  it('hiddenToday only for today', () => {
    expect(hiddenToday('2026-11-05', '2026-11-05')).toBeTrue();
    expect(hiddenToday('2026-11-04', '2026-11-05')).toBeFalse();
    expect(hiddenToday(null, '2026-11-05')).toBeFalse();
  });

  describe('component', () => {
    let envcal: any;
    let related: any;
    beforeEach(() => {
      try { localStorage.removeItem(TODAY_HIDDEN_KEY); } catch {}
      envcal = { getUpcomingOccasions: jasmine.createSpy('getUpcomingOccasions').and.returnValue(of({ today: [occasion()], upcoming: [] })) };
      related = { exploreNext: jasmine.createSpy('exploreNext').and.returnValue(of({ read: [{ type: 'blog', id: 'b1', title: 'Veganism' }], act: [] })) };
    });
    afterEach(() => {
      try { localStorage.removeItem(TODAY_HIDDEN_KEY); } catch {}
    });

    const views = (c: TodayOnWiofComponent) => {
      const out: any[] = [];
      c.view$.subscribe((v) => out.push(v));
      return out;
    };

    it("shows today's occasion with its source and the matched story, asking for one of each", () => {
      const c = new TodayOnWiofComponent(envcal, related);
      c.ngOnInit();
      const [view] = views(c);
      expect(view.occasion.id).toBe('veg');
      expect(view.source).toBe('navs-online.org');
      expect(view.story.title).toBe('Veganism');
      expect(view.action).toBeNull();
      expect(related.exploreNext).toHaveBeenCalledWith({ links: [], autoKey: 'occasion_veg' }, { read: 1, act: 1 });
    });

    it('shows nothing on a day without an occasion', () => {
      envcal.getUpcomingOccasions.and.returnValue(of({ today: [], upcoming: [] }));
      const c = new TodayOnWiofComponent(envcal, related);
      c.ngOnInit();
      expect(views(c)).toEqual([null]);
    });

    it('"Not today" hides it until tomorrow', () => {
      const c = new TodayOnWiofComponent(envcal, related);
      c.ngOnInit();
      c.notToday();
      expect(c.hidden).toBeTrue();
      expect(localStorage.getItem(TODAY_HIDDEN_KEY)).toBe(toCalendarDay(new Date()));
      const again = new TodayOnWiofComponent(envcal, related);
      again.ngOnInit();
      expect(again.hidden).toBeTrue();
      localStorage.setItem(TODAY_HIDDEN_KEY, '2000-01-01');
      const tomorrow = new TodayOnWiofComponent(envcal, related);
      tomorrow.ngOnInit();
      expect(tomorrow.hidden).toBeFalse();
    });
  });
});
