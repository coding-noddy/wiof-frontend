import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { AboutUsService, AboutUsProfile } from 'src/app/services/aboutus.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { UI_MESSAGES } from 'src/app/app.constants';

@Component({
  selector: 'app-add-about-us',
  templateUrl: './add-about-us.page.html',
  styleUrls: ['./add-about-us.page.scss']
})
export class AddAboutUsPage implements OnInit, OnDestroy {
  addProfileForm: FormGroup;
  imageToDisplay: any;
  imageToSave: any;
  loader: any;
  destroy$: Subject<boolean> = new Subject();
  isEditMode = false;
  profile: AboutUsProfile = {} as AboutUsProfile;

  constructor(
    private aboutUsService: AboutUsService,
    private uiUtil: UiUtilService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((param) => {
      // Logic matching your Blog implementation: checking for 'edit' in the URL
      if (param.has('mode') && param.get('mode') === 'edit') {
        this.profile = this.aboutUsService.getViewEditModeProfile();
        console.log('Edit mode profile is being fetched',this.profile)
        if (!this.profile) {
          // If the user refreshed the page, the service variable is lost. Redirect back.
          this.router.navigateByUrl('/admin-dashboard/manage-about-us');
          return;
        }

        this.isEditMode = true;
        this.imageToDisplay = this.profile.imageLink; // Load existing image
        this.addProfileForm = this.initFormByProfile(this.profile);
      } else {
        this.isEditMode = false;
        this.addProfileForm = this.initForm();
      }
    });
  }

  private initForm() {
    return new FormGroup({
      serialNo: new FormControl(null, [Validators.required]),
      name: new FormControl('', [Validators.required]),
      bio: new FormControl('', [Validators.required]),
      socialLink: new FormControl(''),
      showKnowMore: new FormControl(false)
    });
  }

  private initFormByProfile(profile: AboutUsProfile) {
    return new FormGroup({
      serialNo: new FormControl(profile.serialNo, [Validators.required]),
      name: new FormControl(profile.name, [Validators.required]),
      bio: new FormControl(profile.bio, [Validators.required]),
      socialLink: new FormControl(profile.socialLink || ''),
      showKnowMore: new FormControl(profile.showKnowMore || false)
    });
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
    if (file.size > 4 * 1024 * 1024) {
      this.uiUtil.presentAlert("Error", "This file is too big!", ["OK"]);
      event.target.value = '';
      return;
    }
    }
    if (event.target.files && event.target.files.length) {
      this.imageToSave = event.target.files[0];
      const reader = new FileReader();
      reader.readAsDataURL(this.imageToSave);
      reader.onload = () => {
        this.imageToDisplay = reader.result;
      };
    }
  }

async onSubmit() {
  if (this.addProfileForm.valid) {
    this.loader = await this.uiUtil.showLoader(UI_MESSAGES.SAVE_IN_PROGRESS.replace(UI_MESSAGES.PLACEHOLDER, 'Profile'));

    const profileToSave: AboutUsProfile = {
      ...this.addProfileForm.value,
      id: this.isEditMode ? this.profile.id : null,
      imageLink: this.profile.imageLink || ''
    };

    // 1. Handle Image Upload First if it exists
    const uploadTask$ = this.imageToSave 
      ? this.aboutUsService.saveProfileImage(this.imageToSave, `profile_${Date.now()}_${this.imageToSave.name}`)
      : of(profileToSave.imageLink);

    uploadTask$.pipe(
      switchMap((downloadUrl: string) => {
        // 2. Attach the URL to our object
        profileToSave.imageLink = downloadUrl;
        
        // 3. Save to database ONLY ONCE here
        return this.aboutUsService.saveAboutUsProfile(profileToSave);
      }),
      takeUntil(this.destroy$),
      catchError((err) => throwError(err))
    ).subscribe({
      next: () => {
        this.loader.dismiss();
        this.uiUtil.presentAlert(UI_MESSAGES.SUCCESS_HEADER, this.isEditMode ? "Profile Updated" : "Profile Added", ["OK"]);
        
        if (this.isEditMode) {
          this.router.navigateByUrl('/admin-dashboard/manage-about-us');
        } else {
          this.addProfileForm.reset();
          this.imageToDisplay = null;
          this.imageToSave = null;
        }
      },
      error: (err) => {
        this.loader.dismiss();
        // Use the error message from the service validation (4MB / Format)
        this.uiUtil.presentAlert(UI_MESSAGES.FAILURE_HEADER, err.message || "Operation failed", ["OK"]);
      }
    });
  }
}

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}