import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';

import { OnboardingOverlayComponent } from './onboarding-overlay.component';
import { AuthService } from '../../services/auth.service';

describe('OnboardingOverlayComponent', () => {
  let component: OnboardingOverlayComponent;
  let fixture: ComponentFixture<OnboardingOverlayComponent>;
  let router: Router;
  let currentUrl: string;
  let navigateSpy: jasmine.Spy;
  let isAuthenticated$: BehaviorSubject<boolean>;
  let authService: jasmine.SpyObj<AuthService>;

  function createComponent(url = '/home'): void {
    currentUrl = url;
    fixture = TestBed.createComponent(OnboardingOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  // Stands in for a NavigationEnd event (the real Router is used so that
  // routerLink works; only its url and navigateByUrl are stubbed).
  function navigate(url: string): void {
    currentUrl = url;
    (component as any).onRoute(url);
    fixture.detectChanges();
  }

  beforeEach(() => {
    isAuthenticated$ = new BehaviorSubject<boolean>(false);
    authService = jasmine.createSpyObj('AuthService', ['signInWithGoogle'], { isAuthenticated$ });

    TestBed.configureTestingModule({
      declarations: [OnboardingOverlayComponent],
      imports: [IonicModule.forRoot(), RouterTestingModule],
      providers: [{ provide: AuthService, useValue: authService }]
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.callFake(() => currentUrl);
    navigateSpy = spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    localStorage.removeItem('wiof_onboarding_seen');
  });

  afterEach(() => {
    localStorage.removeItem('wiof_onboarding_seen');
  });

  describe('visibility', () => {
    it('shows on the home page when the welcome has not been seen', () => {
      createComponent('/home');
      expect(component.visible).toBeTrue();
    });

    it('does not show on Take Action, which explains itself', () => {
      createComponent('/take-action');
      expect(component.visible).toBeFalse();
    });

    it('does not show on content pages such as a shared blog link', () => {
      createComponent('/element/air/blogs/blog?id=1');
      expect(component.visible).toBeFalse();
    });

    it('shows later when the visitor reaches home without having seen it', () => {
      createComponent('/element/air');
      navigate('/home');
      expect(component.visible).toBeTrue();
    });

    it('does not show once seen', () => {
      localStorage.setItem('wiof_onboarding_seen', 'true');
      createComponent('/home');
      expect(component.visible).toBeFalse();
    });

    it('does not show and does not error when localStorage throws', () => {
      spyOn(localStorage, 'getItem').and.throwError('SecurityError');
      createComponent('/home');
      expect(component.visible).toBeFalse();
    });
  });

  describe('dismissal', () => {
    beforeEach(() => createComponent('/home'));

    it('marks the welcome seen via "Explore on my own"', () => {
      fixture.debugElement.query(By.css('.secondary-link')).triggerEventHandler('click', null);
      expect(localStorage.getItem('wiof_onboarding_seen')).toBe('true');
      expect(component.visible).toBeFalse();
    });

    it('marks the welcome seen via the close button', () => {
      fixture.debugElement.query(By.css('.close-btn')).triggerEventHandler('click', null);
      expect(localStorage.getItem('wiof_onboarding_seen')).toBe('true');
      expect(component.visible).toBeFalse();
    });

    it('dismisses on Escape', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(component.visible).toBeFalse();
      expect(localStorage.getItem('wiof_onboarding_seen')).toBe('true');
    });

    it('does not error when localStorage throws on dismiss', () => {
      spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');
      expect(() => component.dismiss()).not.toThrow();
      expect(component.visible).toBeFalse();
    });
  });

  describe('three ways to start', () => {
    it('links every element pill to its element page', () => {
      createComponent('/home');
      const pills = fixture.debugElement.queryAll(By.css('.element-pill'));
      expect(pills.map(p => p.nativeElement.textContent.trim()))
        .toEqual(['Air', 'Energy', 'Water', 'Earth', 'Spirit']);
    });

    it('primary CTA goes to Take Action', () => {
      createComponent('/home');
      component.onPrimaryCta();
      expect(navigateSpy).toHaveBeenCalledWith('/take-action');
      expect(component.visible).toBeFalse();
    });

    it('Inspire closes the welcome and stays on the home page', () => {
      createComponent('/home');
      component.goToConversations();
      expect(component.visible).toBeFalse();
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe('sign-in note', () => {
    it('is shown to signed-out visitors', () => {
      createComponent('/home');
      expect(fixture.debugElement.query(By.css('.sign-in-note'))).toBeTruthy();
    });

    it('is hidden for signed-in users', () => {
      isAuthenticated$.next(true);
      createComponent('/home');
      expect(fixture.debugElement.query(By.css('.sign-in-note'))).toBeNull();
    });

    it('closes the welcome after a successful sign-in', async () => {
      authService.signInWithGoogle.and.returnValue(Promise.resolve({}));
      createComponent('/home');
      component.signIn();
      await fixture.whenStable();
      expect(component.visible).toBeFalse();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => createComponent('/home'));

    it('is a labelled modal dialog', () => {
      const dialog = fixture.debugElement.query(By.css('[role="dialog"]')).nativeElement;
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      const titleId = dialog.getAttribute('aria-labelledby');
      expect(document.getElementById(titleId)?.textContent).toContain('Welcome to WIOF');
    });

    it('labels the close button', () => {
      const closeBtn = fixture.debugElement.query(By.css('.close-btn'));
      expect(closeBtn.nativeElement.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
