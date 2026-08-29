import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, throwError, combineLatest, of } from 'rxjs';
import { catchError, takeUntil, switchMap } from 'rxjs/operators';
import {
  PAGE_CATEGORY_MAP,
  UI_MESSAGES,
  ITEMS,
  ITEM_STATUS,
  MEDIA_TYPE
} from 'src/app/app.constants';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { NgoInFocus } from 'src/app/models/NgoInFocus';
import { NgoInFocusService } from 'src/app/services/ngo-in-focus.service';
import { AppUtilService } from 'src/app/util/AppUtilService';

@Component({
  selector: 'app-add-ngo-in-focus',
  templateUrl: './add-ngo-in-focus.page.html',
  styleUrls: ['./add-ngo-in-focus.page.scss']
})
export class AddNgoInFocusPage implements OnInit, OnDestroy {
  isEditMode = false;
  ngoInFocus: NgoInFocus = {} as NgoInFocus;
  imageToDisplay: string;
  imageToSave: any;
  logoImageToDisplay: string;
  logoImageToSave: any;
  addNgoInFocusForm: FormGroup;
  loader;
  destroy$: Subject<boolean> = new Subject();
  categories: string[] = Object.values(PAGE_CATEGORY_MAP);

  pageContent = {
    addNgoInFocusTitle: 'Add NGO In Focus',
    editNgoInFocusTitle: 'Edit NGO In Focus',
    nameLabel: 'NGO Name',
    linkLabel: 'Know More Link',
    keyActivitiesLabel:
      'Key Activities/Work Areas (Enter comma separated list of activites e.g. activity1, activity2)',
    ngoLogoLabel: 'NGO Logo',
    mediaLinkLabel:
      'Media Link (Please enter youtube video ID only, do not enter full link)',
    mediaTypeLabel: 'Media Type',
    ngoImageLabel: 'NGO Image',
    descriptionLabel: 'Description',
    categoryLabel: 'Category',
    submitDateLabel: 'Submit Date',
    publishDateLabel: 'Publish Date',
    unpublishDateLabel: 'Unpublish Date',
    saveLabel: 'Save',
    cancelLabel: 'Cancel'
  };

  constructor(
    private uiUtil: UiUtilService,
    private appUtil: AppUtilService,
    private ngoInFocusService: NgoInFocusService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.ngoInFocus = {} as NgoInFocus;
    this.route.paramMap.subscribe((param) => {
      if (param.has('mode') && param.get('mode') === 'edit') {
        this.ngoInFocus = this.ngoInFocusService.getViewEditModeNgoInFocus();
        combineLatest([
          this.ngoInFocus.image$,
          this.ngoInFocus.logoImage$
        ]).subscribe(([imageData, logoImageData]) => {
          this.imageToDisplay = imageData.toString();
          this.logoImageToDisplay = logoImageData.toString();
        });
        if (!this.ngoInFocus) {
          this.router.navigateByUrl('/admin-dashboard/manage-ngo-in-focus');
          return;
        }
        this.isEditMode = true;
        this.addNgoInFocusForm = this.initFormByNgoInFocus(this.ngoInFocus);
      } else {
        this.isEditMode = false;
        this.addNgoInFocusForm = this.initForm();
      }
      this.updateMediaTypeValidation();
    });
  }

  updateMediaTypeValidation() {
    this.addNgoInFocusForm
      .get('mediaType')
      .valueChanges.subscribe((mediaType) => {
        if (mediaType === MEDIA_TYPE.IMAGE) {
          this.addNgoInFocusForm
            .get('image')
            .setValidators(Validators.required);
          this.addNgoInFocusForm.get('mediaLink').clearValidators();
        } else if (mediaType === MEDIA_TYPE.VIDEO) {
          this.addNgoInFocusForm
            .get('mediaLink')
            .setValidators(Validators.required);
          this.addNgoInFocusForm.get('image').clearValidators();
          this.imageToSave = undefined;
          this.imageToDisplay = undefined;
        }
      });
  }

  private initForm() {
    return new FormGroup({
      ngoName: new FormControl('', Validators.required),
      knowMoreLink: new FormControl('', Validators.required),
      mediaType: new FormControl('', Validators.required),
      mediaLink: new FormControl(''),
      image: new FormControl(''),
      ngoLogo: new FormControl('', Validators.required),
      keyActivities: new FormControl('', Validators.required),
      description: new FormControl('', Validators.required),
      category: new FormControl('', Validators.required)
    });
  }

  private initFormByNgoInFocus(ngoInFocus: NgoInFocus) {
    return new FormGroup({
      ngoName: new FormControl(ngoInFocus.ngoName, Validators.required),
      knowMoreLink: new FormControl(
        ngoInFocus.knowMoreLink,
        Validators.required
      ),
      mediaType: new FormControl(ngoInFocus.mediaType, Validators.required),
      ngoLogo: new FormControl(ngoInFocus.ngoLogo, Validators.required),
      mediaLink: new FormControl(ngoInFocus.mediaLink),
      image: new FormControl(''),
      keyActivities: new FormControl(
        ngoInFocus.keyActivities,
        Validators.required
      ),
      description: new FormControl(ngoInFocus.description, Validators.required),
      category: new FormControl(ngoInFocus.category, Validators.required)
    });
  }

  onFileSelected(event, isLogoImage?: boolean) {
    if (isLogoImage) {
      this.appUtil.onFileSelected(event, this, {
        imageToSave: 'logoImageToSave',
        imageToDisplay: 'logoImageToDisplay'
      });
    } else {
      this.appUtil.onFileSelected(event, this);
    }
  }

  async onSubmit() {
    if (this.addNgoInFocusForm.valid) {
      this.ngoInFocus = this.createByForm(
        this.addNgoInFocusForm,
        this.ngoInFocus,
        this.isEditMode
      );
      this.loader = await this.uiUtil.showLoader(
        UI_MESSAGES.SAVE_IN_PROGRESS.replace(
          UI_MESSAGES.PLACEHOLDER,
          ITEMS.NGO_IN_FOCUS
        )
      );
      this.ngoInFocusService
        .saveNgoInFocus(this.ngoInFocus)
        .pipe(
          switchMap((data) => {
            console.log(data);
            if (this.imageToSave !== undefined) {
              return this.ngoInFocusService.saveNgoInFocusImage(
                this.imageToSave,
                this.ngoInFocus.mediaLink
              );
            } else {
              return of(true);
            }
          }),
          switchMap(() => {
            if (this.logoImageToSave !== undefined) {
              return this.ngoInFocusService.saveNgoInFocusImage(
                this.logoImageToSave,
                this.ngoInFocus.ngoLogo
              );
            } else {
              return of(true);
            }
          }),
          takeUntil(this.destroy$),
          catchError((err) => {
            return throwError(err);
          })
        )
        .subscribe(
          (response) => {
            this.loader.dismiss();
            if (!this.isEditMode) {
              this.addNgoInFocusForm.reset();
            }
            this.uiUtil.presentToast(
              UI_MESSAGES.SUCCESS_ADD_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                ITEMS.NGO_IN_FOCUS
              ),
              'success'
            );
          },
          (error) => {
            console.log(error);
            this.loader.dismiss();
            this.uiUtil.presentToast(
              UI_MESSAGES.FAILURE_ADD_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                ITEMS.NGO_IN_FOCUS
              ),
              'error'
            );
          }
        );
    }
  }

  private createByForm(
    addNgoInFocusForm: FormGroup,
    ngoInFocus: NgoInFocus,
    isEditMode: boolean
  ) {
    const mediaLink =
      addNgoInFocusForm.value.mediaType === MEDIA_TYPE.VIDEO
        ? addNgoInFocusForm.value.mediaLink
        : isEditMode && ngoInFocus.mediaLink !== undefined
        ? ngoInFocus.mediaLink
        : this.appUtil.formatImageName('ngoInFocus_', this.imageToSave);

    return new NgoInFocus(
      isEditMode ? ngoInFocus.id : null,
      addNgoInFocusForm.value.ngoName,
      isEditMode && ngoInFocus.ngoLogo !== undefined
        ? ngoInFocus.ngoLogo
        : this.appUtil.formatImageName(
            'ngoInFocus_logo_',
            this.logoImageToSave
          ),
      addNgoInFocusForm.value.mediaType,
      mediaLink,
      addNgoInFocusForm.value.knowMoreLink,
      addNgoInFocusForm.value.keyActivities,
      addNgoInFocusForm.value.description,
      addNgoInFocusForm.value.category,
      isEditMode ? ngoInFocus.status : ITEM_STATUS.SUBMITTED,
      new Date().getTime()
    );
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
