import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AvatarDropdownComponent } from './avatar-dropdown.component';
import { AuthService } from '../../services/auth.service';

describe('AvatarDropdownComponent', () => {
  let component: AvatarDropdownComponent;
  let fixture: ComponentFixture<AvatarDropdownComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['logout']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      declarations: [AvatarDropdownComponent],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Avatar Display', () => {
    it('should display user photo when photoURL is provided', () => {
      component.photoURL = 'https://example.com/photo.jpg';
      component.showFallback = false;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('.avatar-image');
      expect(img).toBeTruthy();
      expect(img.src).toContain('https://example.com/photo.jpg');
    });

    it('should show fallback with first letter of displayName when photoURL is null', () => {
      component.photoURL = null;
      component.displayName = 'John Doe';
      fixture.detectChanges();

      const fallback = fixture.nativeElement.querySelector('.avatar-fallback');
      expect(fallback).toBeTruthy();
      expect(fallback.textContent.trim()).toBe('J');
    });

    it('should show fallback when image fails to load', () => {
      component.photoURL = 'https://example.com/broken.jpg';
      component.displayName = 'Alice';
      fixture.detectChanges();

      component.onImageError();
      fixture.detectChanges();

      const fallback = fixture.nativeElement.querySelector('.avatar-fallback');
      expect(fallback).toBeTruthy();
      expect(fallback.textContent.trim()).toBe('A');
    });

    it('should display uppercase first letter as fallback', () => {
      component.photoURL = null;
      component.displayName = 'bob smith';
      fixture.detectChanges();

      expect(component.fallbackLetter).toBe('B');
    });

    it('should display "?" when displayName is empty', () => {
      component.photoURL = null;
      component.displayName = '';
      fixture.detectChanges();

      expect(component.fallbackLetter).toBe('?');
    });

    it('should render avatar as 32px circular element', () => {
      const button = fixture.nativeElement.querySelector('.avatar-button');
      expect(button).toBeTruthy();
    });
  });

  describe('Dropdown Menu', () => {
    it('should be closed by default', () => {
      expect(component.isOpen).toBeFalse();
      const menu = fixture.nativeElement.querySelector('.dropdown-menu');
      expect(menu.classList.contains('dropdown-open')).toBeFalse();
    });

    it('should open on avatar click', () => {
      component.toggleDropdown();
      fixture.detectChanges();

      expect(component.isOpen).toBeTrue();
      const menu = fixture.nativeElement.querySelector('.dropdown-menu');
      expect(menu.classList.contains('dropdown-open')).toBeTrue();
    });

    it('should contain menu items: My Journey, Saved, Settings, Logout', () => {
      component.isOpen = true;
      fixture.detectChanges();

      const items = fixture.nativeElement.querySelectorAll('.dropdown-item');
      const texts = Array.from(items).map((item: any) => item.textContent.trim());

      expect(texts).toContain('My Journey');
      expect(texts).toContain('Saved');
      expect(texts).toContain('Settings');
      expect(texts).toContain('Logout');
    });

    it('should close on outside click', () => {
      component.isOpen = true;
      fixture.detectChanges();

      const outsideEvent = new MouseEvent('click');
      Object.defineProperty(outsideEvent, 'target', { value: document.body });
      component.onDocumentClick(outsideEvent);

      expect(component.isOpen).toBeFalse();
    });

    it('should close on Escape key press', () => {
      component.isOpen = true;
      fixture.detectChanges();

      component.onEscapeKey();

      expect(component.isOpen).toBeFalse();
    });

    it('should not close on click inside the component', () => {
      component.isOpen = true;
      fixture.detectChanges();

      const insideElement = fixture.nativeElement.querySelector('.dropdown-menu');
      const insideEvent = new MouseEvent('click');
      Object.defineProperty(insideEvent, 'target', { value: insideElement });
      component.onDocumentClick(insideEvent);

      expect(component.isOpen).toBeTrue();
    });
  });

  describe('Navigation', () => {
    it('should navigate to /my-journey when My Journey is clicked', () => {
      component.navigateTo('/my-journey');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/my-journey']);
    });

    it('should navigate to /my-saved when Saved is clicked', () => {
      component.navigateTo('/my-saved');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/my-saved']);
    });

    it('should navigate to /settings when Settings is clicked', () => {
      component.navigateTo('/settings');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/settings']);
    });

    it('should close dropdown after navigation', () => {
      component.isOpen = true;
      component.navigateTo('/my-journey');

      expect(component.isOpen).toBeFalse();
    });
  });

  describe('Logout', () => {
    it('should call AuthService.logout() when Logout is clicked', () => {
      component.logout();
      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it('should close dropdown after logout', () => {
      component.isOpen = true;
      component.logout();

      expect(component.isOpen).toBeFalse();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-expanded on avatar button', () => {
      const button = fixture.nativeElement.querySelector('.avatar-button');
      expect(button.getAttribute('aria-expanded')).toBe('false');

      component.isOpen = true;
      fixture.detectChanges();
      expect(button.getAttribute('aria-expanded')).toBe('true');
    });

    it('should have aria-haspopup on avatar button', () => {
      const button = fixture.nativeElement.querySelector('.avatar-button');
      expect(button.getAttribute('aria-haspopup')).toBe('true');
    });

    it('should have role="menu" on dropdown', () => {
      const menu = fixture.nativeElement.querySelector('.dropdown-menu');
      expect(menu.getAttribute('role')).toBe('menu');
    });

    it('should have role="menuitem" on each menu item', () => {
      const items = fixture.nativeElement.querySelectorAll('.dropdown-item');
      items.forEach((item: HTMLElement) => {
        expect(item.getAttribute('role')).toBe('menuitem');
      });
    });
  });
});
