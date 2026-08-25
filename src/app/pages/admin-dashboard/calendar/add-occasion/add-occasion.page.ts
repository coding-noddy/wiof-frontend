import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { EnvDay } from 'src/app/models/env-cal-data';
import { EnvcalService } from 'src/app/services/envcal-service';
import { AppUtilService } from 'src/app/util/AppUtilService';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { Months, UI_MESSAGES, ITEMS } from 'src/app/app.constants';

@Component({
  selector: 'app-add-occasion',
  templateUrl: './add-occasion.page.html',
  styleUrls: ['./add-occasion.page.scss']
})
export class AddOccasionPage implements OnInit {
  addOccasionForm: FormGroup;
  imageToDisplay: string;
  imageToSave: any;
  loader;
  destroy$: Subject<boolean> = new Subject();
  isEditMode: boolean = false;
  occasion: EnvDay = {} as EnvDay;
  months = Months;

  pageContent = {
    addOccasionTitle: 'Add Occasion',
    editOccasionTitle: 'Edit Occasion',
    occasionLabel: 'Occasion',
    descriptionLabel: 'Description',
    saveOccasionLabel: 'Save',
    cancelLabel: 'Cancel'
  };

  constructor(
    private calendarService: EnvcalService,
    private uiUtil: UiUtilService,
    private appUtil: AppUtilService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.occasion = {} as EnvDay;
    this.route.paramMap.subscribe((param) => {
      if (param.has('mode') && param.get('mode') === 'edit') {
        this.occasion = this.calendarService.getViewEditModeOccasion();
        this.occasion.image.subscribe((imageData) => {
          this.imageToDisplay = imageData.toString();
        });
        if (!this.occasion) {
          this.router.navigateByUrl('/admin-dashboard/manage-occasion');
          return;
        }
        this.isEditMode = true;
        this.addOccasionForm = this.initFormByOccasion(this.occasion);
      } else {
        this.isEditMode = false;
        this.addOccasionForm = this.initForm();
      }
    });
  }

  private initForm() {
    return new FormGroup({
      day: new FormControl('', [Validators.required]),
      month: new FormControl('', [Validators.required]),
      occasion: new FormControl('', [Validators.required]),
      imageName: new FormControl('', [Validators.required]),
      description: new FormControl('', [Validators.required]),
      showMoreLink: new FormControl('', [Validators.required])
    });
  }

  private initFormByOccasion(occasion: EnvDay) {
    return new FormGroup({
      day: new FormControl(occasion.day, [Validators.required]),
      month: new FormControl(occasion.month, [Validators.required]),
      occasion: new FormControl(occasion.occasion, [Validators.required]),
      imageName: new FormControl(occasion.imageName, [Validators.required]),
      description: new FormControl(occasion.description, [Validators.required]),
      showMoreLink: new FormControl(occasion.showMoreLink, [
        Validators.required
      ])
    });
  }

  onFileSelected(event) {
    this.appUtil.onFileSelected(event, this);
  }

  async onSubmit() {
    if (this.addOccasionForm.valid) {
      this.occasion = this.createByForm(
        this.addOccasionForm,
        this.occasion,
        this.isEditMode
      );
      this.loader = await this.uiUtil.showLoader(
        UI_MESSAGES.SAVE_IN_PROGRESS.replace(
          UI_MESSAGES.PLACEHOLDER,
          ITEMS.OCCASION
        )
      );
      this.calendarService
        .saveOccasion(this.occasion)
        .pipe(
          switchMap((data) => {
            console.log(data);
            if (this.imageToSave !== undefined) {
              return this.calendarService.saveOccasionImage(
                this.imageToSave,
                this.occasion.imageName
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
            console.log(response);
            this.loader.dismiss();
            if (!this.isEditMode) {
              this.addOccasionForm.reset();
              this.imageToDisplay = null;
              this.imageToSave = null;
            }
            this.uiUtil.presentToast(
              UI_MESSAGES.SUCCESS_ADD_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                ITEMS.OCCASION
              ),
              'success'
            );
          },
          (error) => {
            this.loader.dismiss();
            this.uiUtil.presentToast(
              UI_MESSAGES.FAILURE_ADD_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                ITEMS.OCCASION
              ),
              'error'
              [UI_MESSAGES.FAILURE_CTA_TEXT]
            );
          }
        );
    }
  }

  private createByForm(
    addOccasionForm: FormGroup,
    occasion: EnvDay,
    isEditMode: boolean
  ) {
    return new EnvDay(
      isEditMode ? occasion.id : null,
      addOccasionForm.value.day,
      addOccasionForm.value.month,
      addOccasionForm.value.occasion,
      isEditMode && occasion.imageName !== undefined
        ? occasion.imageName
        : this.appUtil.formatImageName('occasion_', this.imageToSave),
      addOccasionForm.value.description,
      addOccasionForm.value.showMoreLink
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
