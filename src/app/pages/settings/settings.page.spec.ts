import { of, throwError } from 'rxjs';
import { SettingsPage } from './settings.page';

describe('SettingsPage - Avatar', () => {
  let page: SettingsPage;
  let authServiceMock: any;
  let userProfileServiceMock: any;
  let uiUtilMock: any;
  let routerMock: any;

  function makeFile(type: string, name = 'avatar'): File {
    return new File([new Blob(['data'])], name, { type });
  }

  beforeEach(() => {
    authServiceMock = {
      currentUser$: of({ uid: 'user1' }),
      updateAuthProfile: jasmine.createSpy('updateAuthProfile').and.returnValue(Promise.resolve()),
      logout: jasmine.createSpy('logout').and.returnValue(Promise.resolve())
    };

    userProfileServiceMock = {
      getProfile: jasmine.createSpy('getProfile').and.returnValue(of({
        displayName: 'Jane Doe',
        email: 'jane@example.com',
        photoURL: 'https://example.com/old.jpg',
        preferredElements: ['earth'],
        joinedDate: null
      })),
      uploadAvatar: jasmine.createSpy('uploadAvatar').and.returnValue(of('https://example.com/new.jpg')),
      updatePhotoURL: jasmine.createSpy('updatePhotoURL').and.returnValue(Promise.resolve()),
      removeAvatar: jasmine.createSpy('removeAvatar').and.returnValue(Promise.resolve()),
      sanitizeUpdate: jasmine.createSpy('sanitizeUpdate').and.callFake((p: any) => p),
      updateProfile: jasmine.createSpy('updateProfile').and.returnValue(Promise.resolve()),
      updatePreferredElements: jasmine.createSpy('updatePreferredElements').and.returnValue(Promise.resolve())
    };

    uiUtilMock = {
      presentToast: jasmine.createSpy('presentToast').and.returnValue(Promise.resolve())
    };

    routerMock = { navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)) };

    page = new SettingsPage(
      authServiceMock,
      userProfileServiceMock,
      uiUtilMock,
      routerMock
    );

    (page as any).lastUid = 'user1';
    page.photoURL = 'https://example.com/old.jpg';
  });

  describe('avatarInitial', () => {
    it('should use the first letter of the display name', () => {
      page.profileForm.patchValue({ displayName: 'Jane Doe' });
      expect(page.avatarInitial).toBe('J');
    });

    it('should fall back to the first letter of the email when no display name is set', () => {
      page.profileForm.patchValue({ displayName: '' });
      page.userEmail = 'zed@example.com';
      expect(page.avatarInitial).toBe('Z');
    });

    it('should fall back to "U" when neither display name nor email is available', () => {
      page.profileForm.patchValue({ displayName: '' });
      page.userEmail = '';
      expect(page.avatarInitial).toBe('U');
    });
  });

  describe('onAvatarFileSelected', () => {
    function makeEvent(file: File | null): Event {
      const input = { files: file ? [file] : null, value: 'x' } as unknown as HTMLInputElement;
      return { target: input } as unknown as Event;
    }

    it('should accept a valid image and set a local preview', () => {
      const file = makeFile('image/png');
      page.onAvatarFileSelected(makeEvent(file));

      expect(page.selectedAvatarFile).toBe(file);
      expect(page.avatarPreviewUrl).toBeTruthy();
      expect(uiUtilMock.presentToast).not.toHaveBeenCalled();
    });

    it('should reject an invalid file type and show an error toast', () => {
      const file = makeFile('image/gif');
      page.onAvatarFileSelected(makeEvent(file));

      expect(page.selectedAvatarFile).toBeNull();
      expect(page.avatarPreviewUrl).toBeNull();
      expect(uiUtilMock.presentToast).toHaveBeenCalledWith(jasmine.any(String), 'error');
    });

    it('should do nothing when no file was chosen', () => {
      page.onAvatarFileSelected(makeEvent(null));
      expect(page.selectedAvatarFile).toBeNull();
    });
  });

  describe('cancelAvatarSelection', () => {
    it('should clear the pending preview and selected file', () => {
      const file = makeFile('image/jpeg');
      page.onAvatarFileSelected({ target: { files: [file], value: '' } as any } as Event);
      expect(page.selectedAvatarFile).toBeTruthy();

      page.cancelAvatarSelection();

      expect(page.selectedAvatarFile).toBeNull();
      expect(page.avatarPreviewUrl).toBeNull();
    });
  });

  describe('confirmAvatarUpload', () => {
    beforeEach(() => {
      const file = makeFile('image/jpeg');
      page.onAvatarFileSelected({ target: { files: [file], value: '' } as any } as Event);
    });

    it('should upload, persist to Firestore and Auth, and update local state on success', async () => {
      await page.confirmAvatarUpload();

      expect(userProfileServiceMock.uploadAvatar).toHaveBeenCalledWith('user1', jasmine.any(File));
      expect(userProfileServiceMock.updatePhotoURL).toHaveBeenCalledWith('user1', 'https://example.com/new.jpg');
      expect(authServiceMock.updateAuthProfile).toHaveBeenCalledWith({ photoURL: 'https://example.com/new.jpg' });
      expect(page.photoURL).toBe('https://example.com/new.jpg');
      expect(page.selectedAvatarFile).toBeNull();
      expect(uiUtilMock.presentToast).toHaveBeenCalledWith(jasmine.any(String), 'success');
      expect(page.isUploadingPhoto).toBeFalse();
    });

    it('should restore the previous avatar and show an error toast on upload failure', async () => {
      userProfileServiceMock.uploadAvatar.and.returnValue(throwError(() => new Error('upload failed')));

      await page.confirmAvatarUpload();

      expect(page.photoURL).toBe('https://example.com/old.jpg');
      expect(page.selectedAvatarFile).toBeNull();
      expect(uiUtilMock.presentToast).toHaveBeenCalledWith(jasmine.any(String), 'error');
      expect(page.isUploadingPhoto).toBeFalse();
    });

    it('should not run when no file is selected', async () => {
      page.cancelAvatarSelection();
      await page.confirmAvatarUpload();
      expect(userProfileServiceMock.uploadAvatar).not.toHaveBeenCalled();
    });
  });

  describe('removeAvatarPhoto', () => {
    it('should remove the avatar and clear Auth/Firestore photoURL on success', async () => {
      await page.removeAvatarPhoto();

      expect(userProfileServiceMock.removeAvatar).toHaveBeenCalledWith('user1');
      expect(authServiceMock.updateAuthProfile).toHaveBeenCalledWith({ photoURL: '' });
      expect(page.photoURL).toBe('');
      expect(uiUtilMock.presentToast).toHaveBeenCalledWith(jasmine.any(String), 'success');
    });

    it('should restore the previous avatar and show an error toast on failure', async () => {
      userProfileServiceMock.removeAvatar.and.returnValue(Promise.reject(new Error('remove failed')));

      await page.removeAvatarPhoto();

      expect(page.photoURL).toBe('https://example.com/old.jpg');
      expect(uiUtilMock.presentToast).toHaveBeenCalledWith(jasmine.any(String), 'error');
    });

    it('should do nothing when there is no current photo', async () => {
      page.photoURL = '';
      await page.removeAvatarPhoto();
      expect(userProfileServiceMock.removeAvatar).not.toHaveBeenCalled();
    });
  });
});
