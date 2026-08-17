import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { By } from '@angular/platform-browser';

import { OnboardingOverlayComponent } from './onboarding-overlay.component';

describe('OnboardingOverlayComponent', () => {
  let component: OnboardingOverlayComponent;
  let fixture: ComponentFixture<OnboardingOverlayComponent>;

  function createComponent(): void {
    fixture = TestBed.createComponent(OnboardingOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OnboardingOverlayComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem('wiof_onboarding_seen');
  });

  describe('visibility', () => {
    it('should display overlay when localStorage key is absent', () => {
      localStorage.removeItem('wiof_onboarding_seen');
      createComponent();
      expect(component.visible).toBeTrue();
    });

    it('should NOT display overlay when localStorage key is "true"', () => {
      localStorage.setItem('wiof_onboarding_seen', 'true');
      createComponent();
      expect(component.visible).toBeFalse();
    });

    it('should NOT display overlay and NOT error when localStorage throws', () => {
      spyOn(localStorage, 'getItem').and.throwError('SecurityError');
      createComponent();
      expect(component.visible).toBeFalse();
    });
  });

  describe('dismissal', () => {
    beforeEach(() => {
      localStorage.removeItem('wiof_onboarding_seen');
      createComponent();
    });

    it('should set localStorage key on dismiss via "Got it" button', () => {
      component.dismiss();
      expect(localStorage.getItem('wiof_onboarding_seen')).toBe('true');
      expect(component.visible).toBeFalse();
    });

    it('should set localStorage key on dismiss via close button', () => {
      const closeBtn = fixture.debugElement.query(By.css('.close-btn'));
      closeBtn.triggerEventHandler('click', null);
      fixture.detectChanges();
      expect(localStorage.getItem('wiof_onboarding_seen')).toBe('true');
      expect(component.visible).toBeFalse();
    });

    it('should dismiss on Escape key press', () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
      expect(component.visible).toBeFalse();
      expect(localStorage.getItem('wiof_onboarding_seen')).toBe('true');
    });

    it('should not error when localStorage throws on dismiss', () => {
      spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');
      expect(() => component.dismiss()).not.toThrow();
      expect(component.visible).toBeFalse();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      localStorage.removeItem('wiof_onboarding_seen');
      createComponent();
    });

    it('should have role="dialog" attribute', () => {
      const overlay = fixture.debugElement.query(By.css('[role="dialog"]'));
      expect(overlay).toBeTruthy();
    });

    it('should have aria-label attribute', () => {
      const overlay = fixture.debugElement.query(By.css('[aria-label]'));
      expect(overlay).toBeTruthy();
      expect(overlay.nativeElement.getAttribute('aria-label')).toContain('onboarding');
    });

    it('should have aria-label on close button', () => {
      const closeBtn = fixture.debugElement.query(By.css('.close-btn'));
      expect(closeBtn.nativeElement.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('content', () => {
    beforeEach(() => {
      localStorage.removeItem('wiof_onboarding_seen');
      createComponent();
    });

    it('should display Five Elements list with names and descriptions', () => {
      const items = fixture.debugElement.queryAll(By.css('.element-item'));
      expect(items.length).toBe(5);

      const names = items.map(i => i.query(By.css('.element-name')).nativeElement.textContent.trim());
      expect(names).toEqual(['Earth', 'Water', 'Air', 'Energy', 'Spirit']);
    });

    it('should display purpose paragraph within 200 characters', () => {
      const purpose = fixture.debugElement.query(By.css('.overlay-purpose'));
      expect(purpose.nativeElement.textContent.trim().length).toBeLessThanOrEqual(200);
    });

    it('should display features summary', () => {
      const features = fixture.debugElement.query(By.css('.features-text'));
      expect(features).toBeTruthy();
      expect(features.nativeElement.textContent).toContain('Blogs');
    });
  });

  describe('non-modal behavior', () => {
    beforeEach(() => {
      localStorage.removeItem('wiof_onboarding_seen');
      createComponent();
    });

    it('should use position:fixed without blocking page interaction', () => {
      const overlay = fixture.debugElement.query(By.css('.onboarding-overlay'));
      const style = getComputedStyle(overlay.nativeElement);
      expect(style.position).toBe('fixed');
      // No backdrop covering the full page — the overlay is positioned in a corner
    });
  });
});
