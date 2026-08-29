import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
import firebase from 'firebase/compat/app';

import { AuthService } from 'src/app/services/auth.service';
import { UserProfileService, validateAvatarFile } from 'src/app/services/user-profile.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { noWhitespaceOnlyValidator, minArrayLength, maxArrayLength } from './settings.validators';
import { ELEMENTS } from 'src/app/app.constants';
import { ActivityService } from 'src/app/services/activity.service';
import { SavedContentService } from 'src/app/services/saved-content.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss']
})
export class SettingsPage implements OnDestroy {
  private destroy$ = new Subject<void>();
  private lastUid: string | null = null;

  @ViewChild('avatarFileInput') avatarFileInputRef!: ElementRef<HTMLInputElement>;

  // Elements list in fixed order
  readonly elementsList: string[] = [
    ELEMENTS.EARTH,
    ELEMENTS.ENERGY,
    ELEMENTS.AIR,
    ELEMENTS.WATER,
    ELEMENTS.SPIRIT
  ];

  // Reactive form
  profileForm: FormGroup = new FormGroup({
    displayName: new FormControl('', [
      Validators.required,
      Validators.maxLength(100),
      noWhitespaceOnlyValidator
    ]),
    preferredElements: new FormControl([], [
      Validators.required,
      minArrayLength(1),
      maxArrayLength(5)
    ])
  });

  // State properties
  isLoading = true;
  hasError = false;
  isSaving = false;
  isSigningOut = false;
  isResettingData = false;
  showResetModal = false;
  resetConfirmation = '';
  userEmail = '';
  memberSince = '';
  private previousElements: string[] = [];

  // Avatar state
  photoURL = '';
  avatarPreviewUrl: string | null = null;
  selectedAvatarFile: File | null = null;
  isUploadingPhoto = false;
  isRemovingPhoto = false;

  constructor(
    private authService: AuthService,
    private userProfileService: UserProfileService,
    private uiUtil: UiUtilService,
    private router: Router,
    private activityService: ActivityService,
    private savedContentService: SavedContentService
  ) {}

  /**
   * Ionic lifecycle hook — fires every time the page becomes visible.
   * Subscribes to auth state and triggers profile load.
   */
  ionViewWillEnter(): void {
    this.authService.currentUser$
      .pipe(
        first(user => user !== null),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (user) => {
          if (user) {
            this.lastUid = user.uid;
            this.loadProfile(user.uid);
          }
        },
        error: () => {
          this.isLoading = false;
          this.hasError = true;
        }
      });
  }

  /**
   * Fetches the user profile and populates the form and read-only fields.
   */
  loadProfile(uid: string): void {
    this.isLoading = true;
    this.hasError = false;

    this.userProfileService.getProfile(uid)
      .pipe(
        first(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (profile) => {
          if (profile) {
            // Populate form fields
            this.profileForm.patchValue({
              displayName: profile.displayName || '',
              preferredElements: profile.preferredElements || []
            });

            // Store initial elements for revert logic
            this.previousElements = [...(profile.preferredElements || [])];

            // Populate read-only fields
            this.userEmail = profile.email || '';
            this.photoURL = profile.photoURL || '';
            this.memberSince = profile.joinedDate
              ? this.formatJoinedDate(profile.joinedDate)
              : '';
          } else {
            this.hasError = true;
          }
          this.isLoading = false;
        },
        error: () => {
          this.hasError = true;
          this.isLoading = false;
        }
      });
  }

  /**
   * Re-attempts profile load with the last known UID.
   */
  retry(): void {
    if (this.lastUid) {
      this.loadProfile(this.lastUid);
    }
  }

  /**
   * Converts a Firestore Timestamp to "MMMM D, YYYY" format.
   * E.g., "January 5, 2024"
   */
  formatJoinedDate(timestamp: firebase.firestore.Timestamp): string {
    const date = timestamp.toDate();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  }

  /**
   * Validates the form, trims the display name, and saves both the
   * display name and preferred elements to Firestore.
   */
  async onSave(): Promise<void> {
    if (this.profileForm.invalid) {
      return;
    }

    this.isSaving = true;

    try {
      const trimmedName = (this.profileForm.get('displayName')!.value as string).trim();
      const selectedElements = this.profileForm.get('preferredElements')!.value as string[];

      const sanitizedPayload = this.userProfileService.sanitizeUpdate({ displayName: trimmedName });

      await this.userProfileService.updateProfile(this.lastUid!, sanitizedPayload);
      await this.userProfileService.updatePreferredElements(this.lastUid!, selectedElements);

      await this.uiUtil.presentToast('Settings saved successfully', 'success');
    } catch (error) {
      await this.uiUtil.presentToast('Failed to save settings. Please try again.', 'error');
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Signs the user out and navigates to /home.
   * On failure, shows an error toast and re-enables the sign-out button.
   */
  async onSignOut(): Promise<void> {
    this.isSigningOut = true;
    try {
      await this.authService.logout();
      this.router.navigate(['/home']);
    } catch (error) {
      await this.uiUtil.presentToast('Sign-out failed. Please try again.', 'error', 5000);
      this.isSigningOut = false;
    }
  }

  openResetModal(): void {
    if (!this.lastUid || this.isResettingData) {
      return;
    }
    this.resetConfirmation = '';
    this.showResetModal = true;
  }

  cancelReset(): void {
    if (this.isResettingData) {
      return;
    }
    this.showResetModal = false;
    this.resetConfirmation = '';
  }

  async confirmReset(): Promise<void> {
    if (!this.lastUid || this.isResettingData || this.resetConfirmation.trim().toUpperCase() !== 'RESET') {
      return;
    }

    this.showResetModal = false;

    this.isResettingData = true;
    try {
      await this.activityService.deleteAllForUser(this.lastUid);
      await this.savedContentService.deleteAllForUser(this.lastUid);
      await this.userProfileService.resetEngagementData(this.lastUid);
      await this.uiUtil.presentToast('Your engagement data was cleared. Your account remains active.', 'success', 5000);
      await this.authService.logout();
      await this.router.navigate(['/home']);
    } catch (error) {
      await this.uiUtil.presentToast('Could not clear all engagement data. Nothing was changed after the failed step.', 'error', 5000);
    } finally {
      this.isResettingData = false;
    }
  }

  /**
   * Returns true if the given element option should be disabled.
   * An option is disabled when 5 elements are already selected
   * and this option is NOT one of the currently selected elements.
   */
  isElementDisabled(element: string): boolean {
    const selected: string[] = this.profileForm.get('preferredElements')!.value || [];
    return selected.length >= 5 && !selected.includes(element);
  }

  /**
   * Handles ionChange on the preferred elements select.
   * Prevents deselecting the last remaining element by reverting the value.
   */
  onElementsChange(event: any): void {
    const newValue: string[] = event.detail.value || [];
    const control = this.profileForm.get('preferredElements')!;

    if (newValue.length === 0) {
      // Revert to previous value — cannot deselect the last element
      // Use emitEvent: false to avoid triggering ionChange again
      control.setValue(this.previousElements, { emitEvent: false });
      return;
    }

    // Store current value as previous for next change
    this.previousElements = [...newValue];
  }

  /**
   * Returns the fallback initial shown when no profile photo is available.
   */
  get avatarInitial(): string {
    const name = (this.profileForm.get('displayName')!.value as string) || '';
    if (name.trim().length > 0) {
      return name.trim().charAt(0).toUpperCase();
    }
    return this.userEmail ? this.userEmail.charAt(0).toUpperCase() : 'U';
  }

  /**
   * Opens the native file picker for choosing a new avatar image.
   */
  triggerAvatarFilePicker(): void {
    if (this.isUploadingPhoto || this.isRemovingPhoto) {
      return;
    }
    this.avatarFileInputRef.nativeElement.click();
  }

  /**
   * Validates the chosen file and shows a local preview.
   * Invalid files (wrong type/too large) are rejected with a toast.
   */
  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    input.value = '';

    if (!file) {
      return;
    }

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      this.uiUtil.presentToast(validation.error || 'Invalid image file.', 'error');
      return;
    }

    this.discardPendingAvatarPreview();
    this.selectedAvatarFile = file;
    this.avatarPreviewUrl = URL.createObjectURL(file);
  }

  /**
   * Discards the currently selected (not-yet-saved) avatar preview.
   */
  cancelAvatarSelection(): void {
    this.discardPendingAvatarPreview();
  }

  /**
   * Uploads the selected avatar file to Storage, updates Firestore and
   * Firebase Auth photoURL, and refreshes local state. Restores the
   * previous avatar if any step fails.
   */
  async confirmAvatarUpload(): Promise<void> {
    if (!this.selectedAvatarFile || !this.lastUid || this.isUploadingPhoto || this.isRemovingPhoto) {
      return;
    }

    const uid = this.lastUid;
    const file = this.selectedAvatarFile;
    const previousPhotoURL = this.photoURL;

    this.isUploadingPhoto = true;
    try {
      const downloadURL = await this.userProfileService.uploadAvatar(uid, file).toPromise();
      await this.userProfileService.updatePhotoURL(uid, downloadURL as string);
      await this.authService.updateAuthProfile({ photoURL: downloadURL as string });

      this.photoURL = downloadURL as string;
      this.discardPendingAvatarPreview();
      await this.uiUtil.presentToast('Profile photo updated.', 'success');
    } catch (error) {
      console.error('Avatar upload failed:', error);
      this.photoURL = previousPhotoURL;
      this.discardPendingAvatarPreview();
      await this.uiUtil.presentToast('Could not update your profile photo. Please try again.', 'error');
    } finally {
      this.isUploadingPhoto = false;
    }
  }

  /**
   * Removes the current avatar from Storage/Firestore/Auth. Restores the
   * previous avatar reference locally if removal fails.
   */
  async removeAvatarPhoto(): Promise<void> {
    if (!this.lastUid || !this.photoURL || this.isUploadingPhoto || this.isRemovingPhoto) {
      return;
    }

    const uid = this.lastUid;
    const previousPhotoURL = this.photoURL;

    this.isRemovingPhoto = true;
    try {
      await this.userProfileService.removeAvatar(uid);
      await this.authService.updateAuthProfile({ photoURL: '' });
      this.photoURL = '';
      await this.uiUtil.presentToast('Profile photo removed.', 'success');
    } catch (error) {
      console.error('Avatar removal failed:', error);
      this.photoURL = previousPhotoURL;
      await this.uiUtil.presentToast('Could not remove your profile photo. Please try again.', 'error');
    } finally {
      this.isRemovingPhoto = false;
    }
  }

  private discardPendingAvatarPreview(): void {
    if (this.avatarPreviewUrl) {
      URL.revokeObjectURL(this.avatarPreviewUrl);
    }
    this.avatarPreviewUrl = null;
    this.selectedAvatarFile = null;
  }

  ngOnDestroy(): void {
    this.discardPendingAvatarPreview();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
