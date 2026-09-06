import { TestBed } from '@angular/core/testing';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { of, throwError } from 'rxjs';
import {
  UserProfileService,
  UserProfile,
  validateAvatarFile,
  getAvatarExtension,
  MAX_AVATAR_SIZE_BYTES
} from './user-profile.service';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let firestoreMock: any;
  let storageMock: any;
  let storageRefMock: any;

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

    storageRefMock = {
      delete: jasmine.createSpy('delete').and.returnValue(of(undefined)),
      getDownloadURL: jasmine.createSpy('getDownloadURL').and.returnValue(of('https://example.com/avatar.jpg'))
    };
    storageMock = {
      ref: jasmine.createSpy('ref').and.returnValue(storageRefMock),
      upload: jasmine.createSpy('upload').and.returnValue({
        snapshotChanges: () => of({})
      })
    };

    TestBed.configureTestingModule({
      providers: [
        UserProfileService,
        { provide: AngularFirestore, useValue: firestoreMock },
        { provide: AngularFireStorage, useValue: storageMock }
      ]
    });
    service = TestBed.inject(UserProfileService);
  });

  describe('getRole', () => {
    // Admin authority comes from a document's existence in the separate
    // `admins` collection (doc ID == uid), not a field value — see
    // firestore.rules isAdmin() for the matching security-rule authority.
    it('should return cached role on subsequent calls', async () => {
      // First call - set up Firestore to return an admins/{uid} doc that exists
      const mockDoc = firestoreMock.collection().doc();
      mockDoc.ref.get.and.returnValue(Promise.resolve({ exists: true }));

      const role1 = await service.getRole('user1');
      expect(role1).toBe('admin');

      // Second call should use cache (no additional Firestore call)
      mockDoc.ref.get.calls.reset();
      const role2 = await service.getRole('user1');
      expect(role2).toBe('admin');
      expect(mockDoc.ref.get).not.toHaveBeenCalled();
    });

    it('should return "admin" when an admins/{uid} document exists', async () => {
      const mockDoc = firestoreMock.collection().doc();
      mockDoc.ref.get.and.returnValue(Promise.resolve({ exists: true }));

      const role = await service.getRole('admin-user');
      expect(role).toBe('admin');
    });

    it('should return "public" when no admins/{uid} document exists', async () => {
      const mockDoc = firestoreMock.collection().doc();
      mockDoc.ref.get.and.returnValue(Promise.resolve({ exists: false }));

      const role = await service.getRole('public-user');
      expect(role).toBe('public');
    });

    it('should default to "public" when Firestore read fails', async () => {
      const mockDoc = firestoreMock.collection().doc();
      mockDoc.ref.get.and.returnValue(Promise.reject(new Error('Network error')));

      const role = await service.getRole('offline-user');
      expect(role).toBe('public');
    });
  });

  describe('clearRoleCache', () => {
    it('should clear cached roles so next getRole fetches from Firestore', async () => {
      const mockDoc = firestoreMock.collection().doc();
      mockDoc.ref.get.and.returnValue(Promise.resolve({ exists: true }));

      // Populate cache
      await service.getRole('user1');

      // Clear cache
      service.clearRoleCache();

      // Next call should hit Firestore again
      mockDoc.ref.get.and.returnValue(Promise.resolve({ exists: false }));

      const role = await service.getRole('user1');
      expect(role).toBe('public');
    });
  });

  describe('sanitizeUpdate', () => {
    it('should keep only the editable profile fields', () => {
      const payload: Partial<UserProfile> = {
        displayName: 'New Name',
        role: 'admin',
        email: 'test@test.com'
      };

      const sanitized = service.sanitizeUpdate(payload);
      expect(sanitized).toEqual({ displayName: 'New Name' });
      expect((sanitized as any).role).toBeUndefined();
      expect((sanitized as any).email).toBeUndefined();
    });

    it('should strip security-sensitive fields such as loginCount, joinedDate, lastLogin, currentStreak, daysVisited, savedBlogsCount, uid', () => {
      const payload: any = {
        displayName: 'New Name',
        uid: 'attacker-uid',
        loginCount: 999,
        joinedDate: 'fake',
        lastLogin: 'fake',
        currentStreak: 999,
        daysVisited: 999,
        savedBlogsCount: 999
      };

      const sanitized = service.sanitizeUpdate(payload);
      expect(sanitized).toEqual({ displayName: 'New Name' });
    });

    it('should allow photoURL and preferredElements through', () => {
      const payload: Partial<UserProfile> = {
        photoURL: 'https://example.com/photo.jpg',
        preferredElements: ['earth', 'water']
      };

      const sanitized = service.sanitizeUpdate(payload);
      expect(sanitized).toEqual({
        photoURL: 'https://example.com/photo.jpg',
        preferredElements: ['earth', 'water']
      });
    });

    it('should return empty object when only non-editable fields are provided', () => {
      const payload: any = { role: 'admin' };

      const sanitized = service.sanitizeUpdate(payload);
      expect(sanitized).toEqual({});
    });
  });

  // createProfile/updateLoginMetrics/recordVisit/resetEngagementData now delegate
  // to Cloud Functions (createUserProfile/recordLoginMetrics/recordUserVisit/
  // resetEngagementCounters — see firestore.rules isValidOwnProfileUpdate and
  // functions/index.js) instead of writing Firestore directly, since those
  // fields are system-managed and no longer client-writable. Covered by the
  // emulator rules tests (tests/rules/firestore.rules.test.js) rather than
  // here — unit-testing them meaningfully needs a callable-function mocking
  // strategy this suite doesn't have yet.

  describe('validateAvatarFile', () => {
    function makeFile(type: string, sizeBytes: number): File {
      const blob = new Blob([new Uint8Array(sizeBytes)], { type });
      return new File([blob], 'avatar', { type });
    }

    it('should accept a valid JPEG under the size limit', () => {
      const file = makeFile('image/jpeg', 1024);
      expect(validateAvatarFile(file)).toEqual({ valid: true });
    });

    it('should accept a valid PNG under the size limit', () => {
      const file = makeFile('image/png', 1024);
      expect(validateAvatarFile(file)).toEqual({ valid: true });
    });

    it('should reject unsupported file types', () => {
      const file = makeFile('image/gif', 1024);
      const result = validateAvatarFile(file);
      expect(result.valid).toBeFalse();
      expect(result.error).toBeDefined();
    });

    it('should reject files larger than 1 MB', () => {
      const file = makeFile('image/png', MAX_AVATAR_SIZE_BYTES + 1);
      const result = validateAvatarFile(file);
      expect(result.valid).toBeFalse();
      expect(result.error).toBeDefined();
    });

    it('should reject a missing file', () => {
      const result = validateAvatarFile(null as any);
      expect(result.valid).toBeFalse();
    });
  });

  describe('getAvatarExtension', () => {
    it('should map image/png to "png"', () => {
      const file = new File([new Blob()], 'a', { type: 'image/png' });
      expect(getAvatarExtension(file)).toBe('png');
    });

    it('should map image/jpeg and image/jpg to "jpg"', () => {
      const jpeg = new File([new Blob()], 'a', { type: 'image/jpeg' });
      const jpg = new File([new Blob()], 'a', { type: 'image/jpg' });
      expect(getAvatarExtension(jpeg)).toBe('jpg');
      expect(getAvatarExtension(jpg)).toBe('jpg');
    });
  });

  describe('uploadAvatar', () => {
    it('should upload to user-avatars/{uid}/profile.{ext} and resolve a cache-busted download URL', async () => {
      const file = new File([new Blob(['data'])], 'avatar.png', { type: 'image/png' });

      const url = await service.uploadAvatar('user1', file).toPromise();

      expect(url).toMatch(/^https:\/\/example\.com\/avatar\.jpg\?v=\d+$/);
      expect(storageMock.upload).toHaveBeenCalledWith('user-avatars/user1/profile.png', file);
    });

    it('should attempt to delete the other avatar variant before uploading (avoid orphans)', async () => {
      const file = new File([new Blob(['data'])], 'avatar.png', { type: 'image/png' });

      await service.uploadAvatar('user1', file).toPromise();

      expect(storageMock.ref).toHaveBeenCalledWith('user-avatars/user1/profile.jpg');
    });

    it('should throw synchronously for an invalid file instead of uploading', () => {
      const file = new File([new Blob(['data'])], 'avatar.gif', { type: 'image/gif' });

      expect(() => service.uploadAvatar('user1', file)).toThrow();
      expect(storageMock.upload).not.toHaveBeenCalled();
    });

    it('should propagate an error if the download URL lookup fails', async () => {
      storageRefMock.getDownloadURL.and.returnValue(throwError(() => new Error('network error')));
      const file = new File([new Blob(['data'])], 'avatar.jpg', { type: 'image/jpeg' });

      await expectAsync(service.uploadAvatar('user1', file).toPromise()).toBeRejected();
    });
  });

  describe('removeAvatar', () => {
    it('should delete both known avatar variants and clear photoURL in Firestore', async () => {
      const mockDoc = firestoreMock.collection().doc();

      await service.removeAvatar('user1');

      expect(storageMock.ref).toHaveBeenCalledWith('user-avatars/user1/profile.jpg');
      expect(storageMock.ref).toHaveBeenCalledWith('user-avatars/user1/profile.png');
      expect(mockDoc.update).toHaveBeenCalledWith({ photoURL: '' });
    });

    it('should still clear photoURL even if a storage file is missing', async () => {
      storageRefMock.delete.and.returnValue(throwError(() => new Error('object-not-found')));
      const mockDoc = firestoreMock.collection().doc();

      await expectAsync(service.removeAvatar('user1')).toBeResolved();
      expect(mockDoc.update).toHaveBeenCalledWith({ photoURL: '' });
    });
  });

  describe('updatePhotoURL', () => {
    it('should sanitize and persist the photoURL field only', async () => {
      const mockDoc = firestoreMock.collection().doc();

      await service.updatePhotoURL('user1', 'https://example.com/new.jpg');

      expect(mockDoc.update).toHaveBeenCalledWith({ photoURL: 'https://example.com/new.jpg' });
    });
  });
});
