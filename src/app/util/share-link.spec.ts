import { shareLink } from './share-link';

describe('shareLink', () => {
  const data = { title: 'T', text: 'x', url: 'https://wiof.example/element/earth/blog/a' };
  let toast: jasmine.Spy;
  let ui: any;
  let originalShare: any;

  beforeEach(() => {
    toast = jasmine.createSpy('presentToast').and.resolveTo();
    ui = { presentToast: toast };
    originalShare = Object.getOwnPropertyDescriptor(navigator, 'share');
  });

  afterEach(() => {
    if (originalShare) Object.defineProperty(navigator, 'share', originalShare);
    else delete (navigator as any).share;
  });

  const setShare = (fn: any) => Object.defineProperty(navigator, 'share', { value: fn, configurable: true, writable: true });

  it('uses the share sheet and shows nothing more', async () => {
    const share = jasmine.createSpy('share').and.resolveTo();
    setShare(share);
    await shareLink(data, ui);
    expect(share).toHaveBeenCalledWith(data);
    expect(toast).not.toHaveBeenCalled();
  });

  it('does nothing when the reader closes the share sheet', async () => {
    setShare(jasmine.createSpy('share').and.rejectWith(new DOMException('cancelled', 'AbortError')));
    const copy = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    await shareLink(data, ui);
    expect(copy).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('copies the link with a toast when there is no share sheet', async () => {
    setShare(undefined);
    const copy = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    await shareLink(data, ui);
    expect(copy).toHaveBeenCalledWith(data.url);
    expect(toast).toHaveBeenCalledWith('Link copied', 'success', 2500);
  });

  it('says so when copying fails', async () => {
    setShare(undefined);
    spyOn(navigator.clipboard, 'writeText').and.rejectWith(new Error('denied'));
    await shareLink(data, ui);
    expect(toast.calls.mostRecent().args[1]).toBe('error');
  });
});
