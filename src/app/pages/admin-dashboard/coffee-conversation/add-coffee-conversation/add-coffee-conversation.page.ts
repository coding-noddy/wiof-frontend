import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { PAGE_CATEGORY_MAP, UI_MESSAGES, ITEMS } from 'src/app/app.constants';
import { CoffeeConversation } from 'src/app/models/CoffeeConversation';
import { CoffeeConversationService } from 'src/app/services/coffee-conversation.service';
import { AppUtilService } from 'src/app/util/AppUtilService';
import { UiUtilService } from 'src/app/util/UiUtilService';

@Component({
  selector: 'app-add-coffee-conversation',
  templateUrl: './add-coffee-conversation.page.html',
  styleUrls: ['./add-coffee-conversation.page.scss']
})
export class AddCoffeeConversationPage implements OnInit {
  isEditMode: boolean = false;
  coffeeConversation: CoffeeConversation = {} as CoffeeConversation;
  addCoffeeConversationForm: FormGroup;
  loader;
  destroy$: Subject<boolean> = new Subject();
  imageToDisplay: string;
  imageToSave: any;
  categories: string[] = Object.values(PAGE_CATEGORY_MAP);

  pageContent = {
    addCoffeeConversationTitle: 'Add Coffee Conversation',
    editCoffeeConversationTitle: 'Edit Coffee Conversation',
    topicLabel: 'Topic',
    topicShortDescLabel: 'Topic Short Description',
    topicDescLabel: 'Topic Detailed Description',
    categoryLabel: 'Category',
    interviewerNameLabel: 'Interviewer Name',
    intervieweeNameLabel: 'Interviewee Name',
    intervieweeDescLabel: 'Interviewee Description',
    interviewDateLabel: 'Interview Date',
    videoLinkLabel: 'Coffee Conversation Link (only youtube video ID)',
    knowMoreLinkLabel: 'Know More Link',
    saveLabel: 'Save',
    cancelLabel: 'Cancel'
  };

  constructor(
    private uiUtil: UiUtilService,
    private coffeeConversationService: CoffeeConversationService,
    private route: ActivatedRoute,
    private router: Router,
    private appUtil: AppUtilService
  ) {}

  ngOnInit() {
    this.coffeeConversation = {} as CoffeeConversation;
    this.route.paramMap.subscribe((param) => {
      if (param.has('mode') && param.get('mode') === 'edit') {
        this.coffeeConversation = this.coffeeConversationService.getViewEditModeCoffeeConversation();
        if (!this.coffeeConversation) {
          this.router.navigateByUrl(
            '/admin-dashboard/manage-coffee-conversation'
          );
          return;
        }
        this.isEditMode = true;
        this.addCoffeeConversationForm = this.initFormByCoffeeConversation(
          this.coffeeConversation
        );
      } else {
        this.isEditMode = false;
        this.addCoffeeConversationForm = this.initForm();
      }
    });
  }

  private initForm() {
    return new FormGroup({
      topic: new FormControl('', Validators.required),
      topicShortDesc: new FormControl('', Validators.required),
      topicDesc: new FormControl('', Validators.required),
      category: new FormControl('', Validators.required),
      interviewerName: new FormControl('', Validators.required),
      intervieweeName: new FormControl('', Validators.required),
      intervieweeDesc: new FormControl('', Validators.required),
      interviewDate: new FormControl('', Validators.required),
      videoLink: new FormControl('', Validators.required),
      knowMoreLink: new FormControl('', Validators.required)
    });
  }

  private initFormByCoffeeConversation(coffeeConversation: CoffeeConversation) {
    return new FormGroup({
      topic: new FormControl(coffeeConversation.topic, Validators.required),
      topicShortDesc: new FormControl(
        coffeeConversation.topicShortDesc,
        Validators.required
      ),
      topicDesc: new FormControl(
        coffeeConversation.topicDesc,
        Validators.required
      ),
      category: new FormControl(
        coffeeConversation.category,
        Validators.required
      ),
      interviewerName: new FormControl(
        coffeeConversation.interviewerName,
        Validators.required
      ),
      intervieweeName: new FormControl(
        coffeeConversation.intervieweeName,
        Validators.required
      ),
      intervieweeDesc: new FormControl(
        coffeeConversation.intervieweeDesc,
        Validators.required
      ),
      interviewDate: new FormControl(
        new Date(coffeeConversation.interviewDate),
        Validators.required
      ),
      videoLink: new FormControl(
        coffeeConversation.videoLink,
        Validators.required
      ),
      knowMoreLink: new FormControl(
        coffeeConversation.knowMoreLink,
        Validators.required
      )
    });
  }

  async onSubmit() {
    if (this.addCoffeeConversationForm.valid) {
      console.log(this.addCoffeeConversationForm.value);
      this.coffeeConversation = this.createByForm(
        this.addCoffeeConversationForm,
        this.coffeeConversation,
        this.isEditMode
      );
      this.loader = await this.uiUtil.showLoader(
        UI_MESSAGES.SAVE_IN_PROGRESS.replace(
          UI_MESSAGES.PLACEHOLDER,
          ITEMS.COFFEE_CONVERSATION
        )
      );
      this.coffeeConversationService
        .saveCoffeeConversation(this.coffeeConversation)
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
              this.addCoffeeConversationForm.reset();
            }
            this.uiUtil.presentToast(
              UI_MESSAGES.SUCCESS_ADD_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                ITEMS.COFFEE_CONVERSATION
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
                ITEMS.COFFEE_CONVERSATION
              ),
              'error'
            );
          }
        );
    }
  }

  private createByForm(
    addCoffeeConversationForm: FormGroup,
    coffeeConversation: CoffeeConversation,
    isEditMode: boolean
  ) {
    return new CoffeeConversation(
      isEditMode ? coffeeConversation.ccId : null,
      addCoffeeConversationForm.value.topic,
      addCoffeeConversationForm.value.topicShortDesc,
      addCoffeeConversationForm.value.topicDesc,
      addCoffeeConversationForm.value.category,
      addCoffeeConversationForm.value.interviewerName,
      addCoffeeConversationForm.value.intervieweeName,
      addCoffeeConversationForm.value.intervieweeDesc,
      new Date(addCoffeeConversationForm.value.interviewDate).getTime(),
      addCoffeeConversationForm.value.videoLink,
      addCoffeeConversationForm.value.knowMoreLink
    );
  }
}
