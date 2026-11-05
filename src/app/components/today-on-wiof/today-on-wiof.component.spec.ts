import { of } from 'rxjs';
import { dialogOccasion, factFields, hiddenToday, occasionSource, sourceName, TODAY_HIDDEN_KEY, todaysOccasion } from 'src/app/models/TodayOnWiof';
import { toCalendarDay } from 'src/app/services/activity.service';
import { CALENDAR_HEADING_ID, TodayOnWiofComponent } from './today-on-wiof.component';

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

  it('calls a link the "Source" only for a reviewed fact with its own source', () => {
    const base = { showMoreLink: 'https://www.navs-online.org/x' };
    expect(occasionSource(base)).toEqual({ label: 'Learn more', url: base.showMoreLink, site: 'navs-online.org' });
    expect(occasionSource({ ...base, fact: 'A fact.', factStatus: 'draft', factSource: 'https://fao.org/a' })?.label).toBe('Learn more');
    expect(occasionSource({ ...base, fact: 'A fact.', factStatus: 'reviewed', factSource: 'https://www.fao.org/a' })).toEqual({ label: 'Source', url: 'https://www.fao.org/a', site: 'fao.org' });
    expect(occasionSource({ ...base, fact: 'A fact.', factStatus: 'reviewed', factSource: '' })?.label).toBe('Learn more');
    expect(occasionSource({ showMoreLink: '' })).toBeNull();
  });

  it('saves a fact as a draft until it is reviewed', () => {
    expect(factFields(' A fact. ', ' https://fao.org ', false)).toEqual({ fact: 'A fact.', factSource: 'https://fao.org', factStatus: 'draft' });
    expect(factFields('A fact.', '', true)).toEqual({ fact: 'A fact.', factSource: null, factStatus: 'reviewed' });
    expect(factFields('', 'https://fao.org', true)).toEqual({ fact: null, factSource: 'https://fao.org', factStatus: null });
  });

  it('hiddenToday only for today', () => {
    expect(hiddenToday('2026-11-05', '2026-11-05')).toBeTrue();
    expect(hiddenToday('2026-11-04', '2026-11-05')).toBeFalse();
    expect(hiddenToday(null, '2026-11-05')).toBeFalse();
  });

  it('dialogOccasion gives the calendar modal the fact, its link and the matches', () => {
    const d = dialogOccasion(occasion({ fact: ' Meat-free days cut emissions. ', relatedContent: [{ type: 'blog', id: 'b1', title: 'Veganism' }] }));
    expect(d.name).toBe('World Vegetarian Day');
    expect(d.fact).toBe('Meat-free days cut emissions.');
    expect(d.source).toEqual({ label: 'Learn more', url: 'https://www.navs-online.org/x', site: 'navs-online.org' });
    expect(d.explore).toEqual({ links: [{ type: 'blog', id: 'b1', title: 'Veganism' }], autoKey: 'occasion_veg' });
    expect(dialogOccasion(occasion({ fact: '  ' })).fact).toBeNull();
  });

  describe('component', () => {
    let envcal: any;
    let related: any;
    let dismissRole: string | undefined;
    beforeEach(() => {
      try { localStorage.removeItem(TODAY_HIDDEN_KEY); } catch {}
      envcal = { getUpcomingOccasions: jasmine.createSpy('getUpcomingOccasions').and.returnValue(of({ today: [occasion()], upcoming: [] })) };
      dismissRole = undefined;
      // The modal controller (named "related" so the tests below read as before).
      related = {
        create: jasmine.createSpy('create').and.callFake(async () => ({ present: async () => {}, onDidDismiss: async () => ({ role: dismissRole }) }))
      };
    });
    afterEach(() => {
      try { localStorage.removeItem(TODAY_HIDDEN_KEY); } catch {}
    });

    const views = (c: TodayOnWiofComponent) => {
      const out: any[] = [];
      c.occasion$.subscribe((v) => out.push(v));
      return out;
    };

    it("shows today's occasion, and opens its story in the calendar's modal with a pointer to the calendar", async () => {
      const c = new TodayOnWiofComponent(envcal, related);
      c.ngOnInit();
      const [day] = views(c);
      expect(day.id).toBe('veg');
      await c.openStory(day);
      const props = related.create.calls.mostRecent().args[0].componentProps;
      expect(props.calendarHint).toBeTrue();
      expect(props.occasionDetails.occasion).toEqual([dialogOccasion(day)]);
    });

    it('"Find them all in the Environment Calendar" in the modal scrolls to the calendar', async () => {
      dismissRole = 'calendar';
      const c = new TodayOnWiofComponent(envcal, related);
      const scroll = spyOn(c, 'seeCalendar');
      await c.openStory(occasion());
      expect(scroll).toHaveBeenCalled();
    });

    it('shows nothing on a day without an occasion', () => {
      envcal.getUpcomingOccasions.and.returnValue(of({ today: [], upcoming: [] }));
      const c = new TodayOnWiofComponent(envcal, related);
      c.ngOnInit();
      expect(views(c)).toEqual([null]);
    });

    it('"See the full calendar" scrolls to and focuses the calendar heading, and highlights today', () => {
      const heading = document.createElement('h2');
      heading.id = CALENDAR_HEADING_ID;
      heading.tabIndex = -1;
      const agenda = document.createElement('app-env-calendar-agenda');
      agenda.innerHTML = '<div class="agenda-day agenda-today"></div>';
      document.body.append(heading, agenda);
      try {
        spyOn(heading, 'scrollIntoView');
        const event = new Event('click', { cancelable: true });
        new TodayOnWiofComponent(envcal, related).seeCalendar(event);
        expect(event.defaultPrevented).toBeTrue();
        expect(heading.scrollIntoView).toHaveBeenCalled();
        expect(document.activeElement).toBe(heading);
        expect(agenda.querySelector('.agenda-today')!.classList).toContain('is-flashing');
      } finally {
        heading.remove();
        agenda.remove();
      }
    });

    it('"See the full calendar" leaves the link alone when the calendar is not on the page', () => {
      const event = new Event('click', { cancelable: true });
      new TodayOnWiofComponent(envcal, related).seeCalendar(event);
      expect(event.defaultPrevented).toBeFalse();
    });

    it('"Hide for today" hides it until tomorrow', () => {
      const c = new TodayOnWiofComponent(envcal, related);
      c.ngOnInit();
      c.hideForToday();
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
