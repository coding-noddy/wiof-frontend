import { TestBed } from '@angular/core/testing';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { UserProfileService } from './user-profile.service';
import { UiUtilService } from '../util/UiUtilService';
import { AnalyticsService } from './analytics.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('updateAuthProfile', () => {
    let afAuthMock: any;
    let updateProfileSpy: jasmine.Spy;
    let mockUser: any;
    let localService: AuthService;

    beforeEach(() => {
      updateProfileSpy = jasmine.createSpy('updateProfile').and.returnValue(Promise.resolve());
      mockUser = { uid: 'user1', displayName: 'Test User', photoURL: null, updateProfile: updateProfileSpy };
      afAuthMock = {
        authState: of(mockUser),
        currentUser: Promise.resolve(mockUser)
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AuthService,
          { provide: AngularFireAuth, useValue: afAuthMock },
          { provide: UserProfileService, useValue: { clearRoleCache: () => {} } },
          { provide: UiUtilService, useValue: { presentToast: () => Promise.resolve() } },
          { provide: AnalyticsService, useValue: jasmine.createSpyObj('AnalyticsService', ['logSignUp', 'logLogin']) },
          { provide: Router, useValue: { navigate: () => Promise.resolve(true) } }
        ]
      });
      localService = TestBed.inject(AuthService);
    });

    it('should call updateProfile on the current Firebase Auth user', async () => {
      await localService.updateAuthProfile({ photoURL: 'https://example.com/new.jpg' });
      expect(updateProfileSpy).toHaveBeenCalledWith({ photoURL: 'https://example.com/new.jpg' });
    });

    it('should emit the mutated user on currentUser$ so the header refreshes without reload', async () => {
      const emitted: any[] = [];
      localService.currentUser$.subscribe(user => emitted.push(user));

      await localService.updateAuthProfile({ photoURL: 'https://example.com/new.jpg' });

      expect(emitted.some(u => u === mockUser)).toBeTrue();
    });

    it('should do nothing when there is no signed-in user', async () => {
      afAuthMock.currentUser = Promise.resolve(null);
      await expectAsync(localService.updateAuthProfile({ photoURL: 'x' })).toBeResolved();
      expect(updateProfileSpy).not.toHaveBeenCalled();
    });
  });
});
