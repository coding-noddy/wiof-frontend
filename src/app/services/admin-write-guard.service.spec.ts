import { TestBed } from '@angular/core/testing';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { of } from 'rxjs';
import { AdminWriteGuardService, ADMIN_COLLECTIONS } from './admin-write-guard.service';
import { UserProfileService } from './user-profile.service';

describe('AdminWriteGuardService', () => {
  let service: AdminWriteGuardService;
  let mockAfAuth: jasmine.SpyObj<any>;
  let mockUserProfileService: jasmine.SpyObj<UserProfileService>;

  beforeEach(() => {
    mockAfAuth = {
      authState: of(null)
    };
    mockUserProfileService = jasmine.createSpyObj('UserProfileService', ['getRole']);

    TestBed.configureTestingModule({
      providers: [
        AdminWriteGuardService,
        { provide: AngularFireAuth, useValue: mockAfAuth },
        { provide: UserProfileService, useValue: mockUserProfileService }
      ]
    });
    service = TestBed.inject(AdminWriteGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('ADMIN_COLLECTIONS', () => {
    it('should include all required admin collections', () => {
      expect(ADMIN_COLLECTIONS).toContain('Blogs');
      expect(ADMIN_COLLECTIONS).toContain('News');
      expect(ADMIN_COLLECTIONS).toContain('CoffeeConversations');
      expect(ADMIN_COLLECTIONS).toContain('InFocus');
      expect(ADMIN_COLLECTIONS).toContain('NGOinFocus');
      expect(ADMIN_COLLECTIONS).toContain('CourseInFocus');
      expect(ADMIN_COLLECTIONS).toContain('Envcal');
      expect(ADMIN_COLLECTIONS).toContain('AboutUs');
      expect(ADMIN_COLLECTIONS).toContain('AboutUsProfiles');
    });
  });

  describe('assertAdmin', () => {
    it('should throw an error when user is not authenticated', async () => {
      mockAfAuth.authState = of(null);
      // Recreate the service to pick up the new authState
      service = new AdminWriteGuardService(mockAfAuth as any, mockUserProfileService);

      await expectAsync(service.assertAdmin()).toBeRejectedWithError(
        'Admin write rejected: User is not authenticated'
      );
    });

    it('should throw an error when user has public role', async () => {
      mockAfAuth.authState = of({ uid: 'user123' });
      mockUserProfileService.getRole.and.returnValue(Promise.resolve('public'));
      service = new AdminWriteGuardService(mockAfAuth as any, mockUserProfileService);

      await expectAsync(service.assertAdmin()).toBeRejectedWithError(
        'Admin write rejected: User does not have admin privileges'
      );
      expect(mockUserProfileService.getRole).toHaveBeenCalledWith('user123');
    });

    it('should resolve successfully when user has admin role', async () => {
      mockAfAuth.authState = of({ uid: 'admin123' });
      mockUserProfileService.getRole.and.returnValue(Promise.resolve('admin'));
      service = new AdminWriteGuardService(mockAfAuth as any, mockUserProfileService);

      await expectAsync(service.assertAdmin()).toBeResolved();
      expect(mockUserProfileService.getRole).toHaveBeenCalledWith('admin123');
    });

    it('should not call getRole when user is not authenticated', async () => {
      mockAfAuth.authState = of(null);
      service = new AdminWriteGuardService(mockAfAuth as any, mockUserProfileService);

      await expectAsync(service.assertAdmin()).toBeRejected();
      expect(mockUserProfileService.getRole).not.toHaveBeenCalled();
    });
  });
});
