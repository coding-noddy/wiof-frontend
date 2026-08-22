import { TestBed } from '@angular/core/testing';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { UserProfileService, UserProfile } from './user-profile.service';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let firestoreMock: any;

  beforeEach(() => {
    firestoreMock = {
      collection: jasmine.createSpy('collection').and.returnValue({
        doc: jasmine.createSpy('doc').and.returnValue({
          valueChanges: jasmine.createSpy('valueChanges'),
          ref: {
            get: jasmine.createSpy('get'),
            update: jasmine.createSpy('update')
          },
          set: jasmine.createSpy('set').and.returnValue(Promise.resolve()),
          update: jasmine.createSpy('update').and.returnValue(Promise.resolve())
        })
      })
    };

    TestBed.configureTestingModule({
      providers: [
        UserProfileService,
        { provide: AngularFirestore, useValue: firestoreMock }
      ]
    });
    service = TestBed.inject(UserProfileService);
  });

  describe('getRole', () => {
    it('should return cached role on subsequent calls', async () => {
      // First call - set up Firestore to return admin
      const mockDoc = firestoreMock.collection().doc();
      mockDoc.ref.get.and.returnValue(Promise.resolve({
        data: () => ({ role: 'admin' })
      }));

      const role1 = await service.getRole('user1');
      expect(role1).toBe('admin');

      // Second call should use cache (no additional Firestore call)
      mockDoc.ref.get.calls.reset();
      const role2 = await service.getRole('user1');
      expect(role2).toBe('admin');
      expect(mockDoc.ref.get).not.toHaveBeenCalled();
    });

    it('should return "admin" for user with admin role', async () => {
      const mockDoc = firestoreMock.collection().doc();
      mockDoc.ref.get.and.returnValue(Promise.resolve({
        data: () => ({ role: 'admin' })
      }));

      const role = await service.getRole('admin-user');
      expect(role).toBe('admin');
    });

    it('should return "public" for user with public role', async () => {
      const mockDoc = firestoreMock.collection().doc();
      mockDoc.ref.get.and.returnValue(Promise.resolve({
        data: () => ({ role: 'public' })
      }));

      const role = await service.getRole('public-user');
      expect(role).toBe('public');
    });

    it('should default to "public" for legacy documents without role field', async () => {
      const mockDoc = firestoreMock.collection().doc();
      mockDoc.ref.get.and.returnValue(Promise.resolve({
        data: () => ({ uid: 'legacy-user', displayName: 'Legacy' })
      }));

      const role = await service.getRole('legacy-user');
      expect(role).toBe('public');
    });

    it('should default to "public" when Firestore read fails', async () => {
      const mockDoc = firestoreMock.collection().doc();
      mockDoc.ref.get.and.returnValue(Promise.reject(new Error('Network error')));

      const role = await service.getRole('offline-user');
      expect(role).toBe('public');
    });

    it('should default to "public" for document with null data', async () => {
      const mockDoc = firestoreMock.collection().doc();
      mockDoc.ref.get.and.returnValue(Promise.resolve({
        data: () => null
      }));

      const role = await service.getRole('null-user');
      expect(role).toBe('public');
    });
  });

  describe('clearRoleCache', () => {
    it('should clear cached roles so next getRole fetches from Firestore', async () => {
      const mockDoc = firestoreMock.collection().doc();
      mockDoc.ref.get.and.returnValue(Promise.resolve({
        data: () => ({ role: 'admin' })
      }));

      // Populate cache
      await service.getRole('user1');

      // Clear cache
      service.clearRoleCache();

      // Next call should hit Firestore again
      mockDoc.ref.get.and.returnValue(Promise.resolve({
        data: () => ({ role: 'public' })
      }));

      const role = await service.getRole('user1');
      expect(role).toBe('public');
    });
  });

  describe('sanitizeUpdate', () => {
    it('should strip the role field from update payload', () => {
      const payload: Partial<UserProfile> = {
        displayName: 'New Name',
        role: 'admin',
        email: 'test@test.com'
      };

      const sanitized = service.sanitizeUpdate(payload);
      expect(sanitized).toEqual({ displayName: 'New Name', email: 'test@test.com' });
      expect((sanitized as any).role).toBeUndefined();
    });

    it('should return payload unchanged when no role field is present', () => {
      const payload: Partial<UserProfile> = {
        displayName: 'New Name',
        email: 'test@test.com'
      };

      const sanitized = service.sanitizeUpdate(payload);
      expect(sanitized).toEqual({ displayName: 'New Name', email: 'test@test.com' });
    });

    it('should return empty object when only role is provided', () => {
      const payload: Partial<UserProfile> = { role: 'admin' };

      const sanitized = service.sanitizeUpdate(payload);
      expect(sanitized).toEqual({});
      expect((sanitized as any).role).toBeUndefined();
    });
  });

  describe('createProfile', () => {
    it('should set role to "public" for Google OAuth users', async () => {
      const mockUser = {
        uid: 'google-user-123',
        displayName: 'Test User',
        email: 'test@gmail.com',
        photoURL: 'https://photo.url/pic.jpg'
      } as any;

      const mockDoc = firestoreMock.collection().doc();
      mockDoc.set = jasmine.createSpy('set').and.returnValue(Promise.resolve());

      // Re-setup the mock to capture the set call
      firestoreMock.collection.and.returnValue({
        doc: jasmine.createSpy('doc').and.returnValue({
          set: mockDoc.set
        })
      });

      await service.createProfile(mockUser);

      expect(mockDoc.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ role: 'public' })
      );
    });
  });
});
