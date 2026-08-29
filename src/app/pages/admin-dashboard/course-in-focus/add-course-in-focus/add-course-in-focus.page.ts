import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, throwError, of } from 'rxjs';
import { catchError, takeUntil, switchMap } from 'rxjs/operators';
import {
  PAGE_CATEGORY_MAP,
  UI_MESSAGES,
  ITEMS,
  ITEM_STATUS
} from 'src/app/app.constants';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { CourseInFocus } from 'src/app/models/CourseInFocus';
import { CourseInFocusService } from 'src/app/services/course-in-focus.service';
import { AppUtilService } from 'src/app/util/AppUtilService';

@Component({
  selector: 'app-add-course-in-focus',
  templateUrl: './add-course-in-focus.page.html',
  styleUrls: ['./add-course-in-focus.page.scss']
})
export class AddCourseInFocusPage implements OnInit, OnDestroy {
  isEditMode = false;
  courseInFocus: CourseInFocus = {} as CourseInFocus;
  imageToDisplay: string;
  imageToSave: any;
  addCourseInFocusForm: FormGroup;
  loader;
  destroy$: Subject<boolean> = new Subject();
  categories: string[] = Object.values(PAGE_CATEGORY_MAP);

  pageContent = {
    addCourseInFocusTitle: 'Add Course In Focus',
    editCourseInFocusTitle: 'Edit Course In Focus',
    nameLabel: 'Course Name',
    linkLabel: 'Course Link',
    offeredByLabel: 'Offered By (e.g. ABC university)',
    platformLabel: 'Course Platform (e.g. Coursera)',
    durationLabel: 'Duration',
    approxCostLabel: 'Approximate Cost (e.g. ₹2000)',
    keyTopicsLabel:
      'Key Topics (Enter comma separated list of topics e.g. Topic1, Topic2)',
    imageLabel: 'Course Image',
    descriptionLabel: 'Description',
    categoryLabel: 'Category',
    submitDateLabel: 'Submit Date',
    publishDateLabel: 'Publish Date',
    unpublishDateLabel: 'Unpublish Date',
    saveLabel: 'Save',
    cancelLabel: 'Cancel'
  };

  constructor(
    private appUtil: AppUtilService,
    private uiUtil: UiUtilService,
    private courseInFocusService: CourseInFocusService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.courseInFocus = {} as CourseInFocus;
    this.route.paramMap.subscribe((param) => {
      if (param.has('mode') && param.get('mode') === 'edit') {
        this.courseInFocus = this.courseInFocusService.getViewEditModeCourseInFocus();
        this.courseInFocus.image$.subscribe((imageData) => {
          this.imageToDisplay = imageData.toString();
        });
        if (!this.courseInFocus) {
          this.router.navigateByUrl('/admin-dashboard/manage-course-in-focus');
          return;
        }
        this.isEditMode = true;
        this.addCourseInFocusForm = this.initFormByCourseInFocus(
          this.courseInFocus
        );
      } else {
        this.isEditMode = false;
        this.addCourseInFocusForm = this.initForm();
      }
    });
  }

  private initForm() {
    return new FormGroup({
      name: new FormControl('', Validators.required),
      offeredBy: new FormControl('', Validators.required),
      platform: new FormControl('', Validators.required),
      duration: new FormControl('', Validators.required),
      approxCost: new FormControl('', Validators.required),
      keyTopics: new FormControl('', Validators.required),
      link: new FormControl('', Validators.required),
      image: new FormControl('', [Validators.required]),
      description: new FormControl('', Validators.required),
      category: new FormControl('', Validators.required)
    });
  }

  private initFormByCourseInFocus(courseInFocus: CourseInFocus) {
    return new FormGroup({
      name: new FormControl(courseInFocus.name, Validators.required),
      offeredBy: new FormControl(courseInFocus.offeredBy, Validators.required),
      platform: new FormControl(courseInFocus.platform, Validators.required),
      duration: new FormControl(courseInFocus.duration, Validators.required),
      approxCost: new FormControl(
        courseInFocus.approxCost,
        Validators.required
      ),
      link: new FormControl(courseInFocus.link, Validators.required),
      image: new FormControl(courseInFocus.image, [Validators.required]),
      keyTopics: new FormControl(courseInFocus.keyTopics, [
        Validators.required
      ]),
      description: new FormControl(
        courseInFocus.description,
        Validators.required
      ),
      category: new FormControl(courseInFocus.category, Validators.required)
    });
  }

  onFileSelected(event) {
    this.appUtil.onFileSelected(event, this);
  }

  async onSubmit() {
    if (this.addCourseInFocusForm.valid) {
      console.log(this.addCourseInFocusForm.value);
      this.courseInFocus = this.createByForm(
        this.addCourseInFocusForm,
        this.courseInFocus,
        this.isEditMode
      );
      this.loader = await this.uiUtil.showLoader(
        UI_MESSAGES.SAVE_IN_PROGRESS.replace(
          UI_MESSAGES.PLACEHOLDER,
          ITEMS.COURSE_IN_FOCUS
        )
      );
      this.courseInFocusService
        .saveCourseInFocus(this.courseInFocus)
        .pipe(
          switchMap((data) => {
            console.log(data);
            if (this.imageToSave !== undefined) {
              return this.courseInFocusService.saveCourseInFocusImage(
                this.imageToSave,
                this.courseInFocus.image
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
              this.addCourseInFocusForm.reset();
              this.imageToDisplay = null;
              this.imageToSave = null;
            }
            this.uiUtil.presentToast(
              UI_MESSAGES.SUCCESS_ADD_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                ITEMS.COURSE_IN_FOCUS
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
                ITEMS.COURSE_IN_FOCUS
              ),
              'error'
            );
          }
        );
    }
  }

  private createByForm(
    addCourseInFocusForm: FormGroup,
    courseInFocus: CourseInFocus,
    isEditMode: boolean
  ) {
    return new CourseInFocus(
      isEditMode ? courseInFocus.id : null,
      addCourseInFocusForm.value.name,
      addCourseInFocusForm.value.offeredBy,
      addCourseInFocusForm.value.platform,
      addCourseInFocusForm.value.duration,
      addCourseInFocusForm.value.approxCost,
      addCourseInFocusForm.value.keyTopics,
      addCourseInFocusForm.value.link,
      addCourseInFocusForm.value.description,
      addCourseInFocusForm.value.category,
      isEditMode && courseInFocus.image !== undefined
        ? courseInFocus.image
        : this.appUtil.formatImageName('courseInFocus_', this.imageToSave),
      isEditMode ? courseInFocus.status : ITEM_STATUS.SUBMITTED,
      new Date().getTime()
    );
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
