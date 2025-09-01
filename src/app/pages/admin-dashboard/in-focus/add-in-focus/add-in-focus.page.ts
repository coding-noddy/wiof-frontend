import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import {
  PAGE_CATEGORY_MAP,
  UI_MESSAGES,
  ITEMS,
  ITEM_STATUS
} from 'src/app/app.constants';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { InFocus } from 'src/app/models/InFocus';
import { InFocusService } from 'src/app/services/in-focus.service';

@Component({
  selector: 'app-add-in-focus',
  templateUrl: './add-in-focus.page.html',
  styleUrls: ['./add-in-focus.page.scss'],
  standalone: false
})
export class AddInFocusPage implements OnInit, OnDestroy {
  isEditMode = false;
  inFocus: InFocus = {} as InFocus;
  addInFocusForm: FormGroup;
  loader;
  destroy$: Subject<boolean> = new Subject();
  categories: string[] = Object.values(PAGE_CATEGORY_MAP);

  pageContent = {
    addInFocusTitle: 'Add In Focus',
    editInFocusTitle: 'Edit In Focus',
    titleLabel: 'Title',
    subTitleLabel: 'Sub Title',
    descriptionLabel: 'Description',
    categoryLabel: 'Category',
    videoLinkLabel: 'In Focus Link (only youtube video ID)',
    knowMoreLinkLabel: 'Know More Link',
    submitDateLabel: 'Submit Date',
    publishDateLabel: 'Publish Date',
    unpublishDateLabel: 'Unpublish Date',
    saveLabel: 'Save',
    cancelLabel: 'Cancel'
  };

  constructor(
    private uiUtil: UiUtilService,
    private inFocusService: InFocusService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.inFocus = {} as InFocus;
    this.route.paramMap.subscribe((param) => {
      if (param.has('mode') && param.get('mode') === 'edit') {
        this.inFocus = this.inFocusService.getViewEditModeInFocus();
        if (!this.inFocus) {
          this.router.navigateByUrl('/admin-dashboard/manage-in-focus');
          return;
        }
        this.isEditMode = true;
        this.addInFocusForm = this.initFormByInFocus(this.inFocus);
      } else {
        this.isEditMode = false;
        this.addInFocusForm = this.initForm();
      }
    });
  }

  private initForm() {
    return new FormGroup({
      title: new FormControl('', Validators.required),
      subTitle: new FormControl('', Validators.required),
      description: new FormControl('', Validators.required),
      category: new FormControl('', Validators.required),
      videoLink: new FormControl('', Validators.required),
      knowMoreLink: new FormControl('', Validators.required)
    });
  }

  private initFormByInFocus(inFocus: InFocus) {
    return new FormGroup({
      title: new FormControl(inFocus.title, Validators.required),
      subTitle: new FormControl(inFocus.subTitle, Validators.required),
      description: new FormControl(inFocus.description, Validators.required),
      category: new FormControl(inFocus.category, Validators.required),
      videoLink: new FormControl(inFocus.videoLink, Validators.required),
      knowMoreLink: new FormControl(inFocus.knowMoreLink, Validators.required)
    });
  }

  async onSubmit() {
    if (this.addInFocusForm.valid) {
      console.log(this.addInFocusForm.value);
      this.inFocus = this.createByForm(
        this.addInFocusForm,
        this.inFocus,
        this.isEditMode
      );
      this.loader = await this.uiUtil.showLoader(
        UI_MESSAGES.SAVE_IN_PROGRESS.replace(
          UI_MESSAGES.PLACEHOLDER,
          ITEMS.IN_FOCUS
        )
      );
      this.inFocusService
        .saveInFocus(this.inFocus)
        .pipe(
          takeUntil(this.destroy$),
          catchError((err) => {
            return throwError(err);
          })
        )
        .subscribe(
          (response) => {
            this.loader.dismiss();
            if (!this.isEditMode) {
              this.addInFocusForm.reset();
            }
            this.uiUtil.presentAlert(
              UI_MESSAGES.SUCCESS_HEADER,
              UI_MESSAGES.SUCCESS_ADD_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                ITEMS.IN_FOCUS
              ),
              [UI_MESSAGES.SUCCESS_CTA_TEXT]
            );
          },
          (error) => {
            console.log(error);
            this.loader.dismiss();
            this.uiUtil.presentAlert(
              UI_MESSAGES.FAILURE_HEADER,
              UI_MESSAGES.FAILURE_ADD_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                ITEMS.IN_FOCUS
              ),
              [UI_MESSAGES.FAILURE_CTA_TEXT]
            );
          }
        );
    }
  }

  private createByForm(
    addInFocusForm: FormGroup,
    inFocus: InFocus,
    isEditMode: boolean
  ) {
    return new InFocus(
      isEditMode ? inFocus.inFocusId : null,
      addInFocusForm.value.title,
      addInFocusForm.value.subTitle,
      addInFocusForm.value.description,
      addInFocusForm.value.category,
      addInFocusForm.value.videoLink,
      addInFocusForm.value.knowMoreLink,
      isEditMode ? inFocus.status : ITEM_STATUS.SUBMITTED,
      new Date().getTime()
    );
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
