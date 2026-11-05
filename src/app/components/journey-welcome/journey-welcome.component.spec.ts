import { NavigationEnd } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { JourneyWelcomeComponent } from './journey-welcome.component';

describe('JourneyWelcomeComponent', () => {
  let user$: BehaviorSubject<any>;
  let profile$: BehaviorSubject<any>;
  let events$: Subject<any>;
  let profiles: any;
  let router: any;
  let component: JourneyWelcomeComponent;

  const create = (url = '/home') => {
    router.url = url;
    component = new JourneyWelcomeComponent({ currentUser$: user$ } as any, profiles, router);
    component.ngOnInit();
  };

  beforeEach(() => {
    user$ = new BehaviorSubject<any>({ uid: 'u1' });
    profile$ = new BehaviorSubject<any>({ uid: 'u1', preferredElements: [], firstName: 'Asha' });
    events$ = new Subject();
    profiles = {
      getProfile: () => profile$,
      resolveFirstName: (p: any) => p?.firstName || '',
      completeWelcome: jasmine.createSpy('completeWelcome').and.resolveTo()
    };
    router = { url: '/home', events: events$, navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true) };
  });

  afterEach(() => component.ngOnDestroy());

  it('opens on home for a signed-in user who needs it', () => {
    create();
    expect(component.visible).toBeTrue();
    expect(component.firstName).toBe('Asha');
  });

  it('stays closed for guests, off home, and for users who already chose elements', () => {
    user$.next(null);
    create();
    expect(component.visible).toBeFalse();
    component.ngOnDestroy();

    user$.next({ uid: 'u1' });
    create('/element/earth/blog/x');
    expect(component.visible).toBeFalse();
    component.ngOnDestroy();

    profile$.next({ uid: 'u1', preferredElements: ['air'] });
    create();
    expect(component.visible).toBeFalse();
  });

  it('closes when the user navigates away without choosing, and comes back on home', () => {
    create();
    events$.next(new NavigationEnd(1, '/take-action', '/take-action'));
    expect(component.visible).toBeFalse();
    events$.next(new NavigationEnd(2, '/home', '/home'));
    expect(component.visible).toBeTrue();
  });

  it('saves the chosen elements in site order, then goes to the chosen start', async () => {
    create();
    component.toggle('earth');
    component.toggle('air');
    component.next();
    expect(component.startElement.slug).toBe('air');
    await component.finish(component.starts[1].link);
    expect(profiles.completeWelcome).toHaveBeenCalledWith('u1', ['air', 'earth']);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/element/air/take-action');
    expect(component.visible).toBeFalse();
  });

  it('skipping saves no elements but still counts as done, and stays closed after the profile updates', async () => {
    create();
    await component.finish();
    expect(profiles.completeWelcome).toHaveBeenCalledWith('u1', []);
    profile$.next({ uid: 'u1', preferredElements: [], onboarding: { welcomeDoneAt: {} } });
    expect(component.visible).toBeFalse();
  });
});
