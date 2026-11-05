import { BehaviorSubject, of } from 'rxjs';
import { REPEAT_TYPE, USER_ACTION_STATUS } from 'src/app/app.constants';
import { TakeActionCardComponent } from './take-action-card.component';

describe('TakeActionCardComponent: "I\'ll try this" under a story (offerTry)', () => {
  const action: any = { id: 'leak', title: 'Fix a Water Leak', elementIds: ['water'], repeatType: REPEAT_TYPE.ONCE };
  let status: any;
  let users: { startAction: jasmine.Spy; completeAction: jasmine.Spy; getUserActionStatus: jasmine.Spy; getActionStreak: jasmine.Spy };

  function make(offerTry = true, signedIn = true) {
    users = {
      startAction: jasmine.createSpy('startAction').and.callFake(async () => (status = { status: USER_ACTION_STATUS.IN_PROGRESS, completionCount: 0 })),
      completeAction: jasmine.createSpy('completeAction').and.callFake(async () => (status = { status: USER_ACTION_STATUS.COMPLETE, completionCount: 1 })),
      getUserActionStatus: jasmine.createSpy('getUserActionStatus').and.callFake(() => of(status)),
      getActionStreak: jasmine.createSpy('getActionStreak').and.returnValue(of(0))
    };
    const auth = { currentUser$: new BehaviorSubject(signedIn ? { uid: 'u1' } : null) };
    const ui = { presentToast: jasmine.createSpy('presentToast').and.resolveTo() };
    const card = new TakeActionCardComponent(auth as any, users as any, ui as any, {} as any);
    card.action = action;
    card.offerTry = offerTry;
    card.ngOnInit();
    return card;
  }

  beforeEach(() => (status = null));

  it('offers "I\'ll try this" first, saves it as started, then offers "Done it"', async () => {
    const card = make();
    expect(card.buttonLabel).toBe("I'll try this");
    await card.onActionClick();
    expect(users.startAction).toHaveBeenCalledOnceWith('u1', action);
    expect(users.completeAction).not.toHaveBeenCalled();
    expect(card.statusNote).toBe("You're trying this");
    expect(card.buttonLabel).toBe('Done it');
    await card.onActionClick();
    expect(users.completeAction).toHaveBeenCalledOnceWith('u1', action);
    expect(card.buttonLabel).toBe('Completed');
  });

  it('keeps one-tap "Mark as Done" on the Take Action page', async () => {
    const card = make(false);
    expect(card.buttonLabel).toBe('Mark as Done');
    await card.onActionClick();
    expect(users.startAction).not.toHaveBeenCalled();
    expect(users.completeAction).toHaveBeenCalled();
  });

  it('asks a guest to sign in instead of saving', async () => {
    const card = make(true, false);
    await card.onActionClick();
    expect(card.showSignInPrompt).toBeTrue();
    expect(users.startAction).not.toHaveBeenCalled();
  });
});
