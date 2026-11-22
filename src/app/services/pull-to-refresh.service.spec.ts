import { hasTypedText, pullToRefreshAllowed } from './pull-to-refresh.service';

describe('Pull to refresh', () => {
  it('is on for the site, off for the admin pages and sign-in', () => {
    for (const url of ['/', '/home', '/passport', '/element/water/blogs', '/take-action?x=1']) expect(pullToRefreshAllowed(url)).withContext(url).toBeTrue();
    for (const url of ['/admin-dashboard', '/admin-dashboard/passport', '/login', '/login?next=/home']) expect(pullToRefreshAllowed(url)).withContext(url).toBeFalse();
    expect(pullToRefreshAllowed('/login-help')).toBeTrue();
  });

  it('knows when something typed would be lost', () => {
    const page = document.createElement('div');
    page.innerHTML = '<input type="search" value=""><input type="text" readonly value="fixed"><textarea></textarea>';
    expect(hasTypedText(page)).toBeFalse();
    page.querySelector('textarea')!.value = 'my feedback';
    expect(hasTypedText(page)).toBeTrue();
  });
});
