import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, FormArray, Validators } from '@angular/forms';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { PollQuestionService } from 'src/app/services/poll-question.service';
import { Subject, throwError } from 'rxjs';
import { takeUntil, map, catchError } from 'rxjs/operators';
import { PollQuestion } from 'src/app/models/PollQuestion';
import { ActivatedRoute, Router } from '@angular/router';
import { ITEM_STATUS, UI_MESSAGES, ITEMS } from 'src/app/app.constants';
import { PollsService } from 'src/app/services/polls.service';
import { AppUtilService } from 'src/app/util/AppUtilService';

@Component({
  selector: 'app-add-poll',
  templateUrl: './add-poll.page.html',
  styleUrls: ['./add-poll.page.scss']
})
export class AddPollPage implements OnInit, OnDestroy {
  addPollForm: FormGroup;
  loader;
  destroy$: Subject<boolean> = new Subject();
  minDate: string;
  isEditMode = false;
  pollQuestion: PollQuestion = {} as PollQuestion;
  optionData = {};
  pageContent = {
    addPollTitle: 'Add Poll',
    editPollTitle: 'Edit Poll',
    savePollLabel: 'Save',
    cancelLabel: 'Cancel',
    pollQuestionLabel: 'Poll Question',
    optionLabel: 'Option',
    addOptionBtnLabel: 'Add Option',
    publishStartDateLabel: 'Publish Start Date',
    publishStartDateDesc: '*Start date of accepting polls for this question',
    publishEndDateDesc: '*Last date of accepting polls for this question',
    publishEndDateLabel: 'Publish End Date',
    pollResultTitle: 'Poll Result'
  };

  constructor(
    private uiUtil: UiUtilService,
    private pollQuestionService: PollQuestionService,
    private pollsService: PollsService,
    private route: ActivatedRoute,
    private router: Router,
    private appUtil: AppUtilService
  ) {}

  ngOnInit() {
    this.pollQuestion = {} as PollQuestion;
    this.route.paramMap.subscribe((param) => {
      if (param.has('mode') && param.get('mode') === 'edit') {
        this.pollQuestion = this.pollQuestionService.getViewEditModePollQuestion();
        if (!this.pollQuestion) {
          this.router.navigateByUrl('/admin-dashboard/manage-polls');
          return;
        }
        this.isEditMode = true;
        this.addPollForm = this.initFormByPollQuestion(this.pollQuestion);
        this.countVotes();
      } else {
        this.isEditMode = false;
        this.addPollForm = this.initForm();
      }
    });
  }

  countVotes() {
    // read all votes
    this.pollsService
      .getPolls(this.pollQuestion.pollId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.appUtil.calculatePollResult(
          this.pollQuestion,
          data,
          this.optionData
        );
      });
  }

  private initForm() {
    const publishStartDate = new Date();
    const publishEndDate = new Date();
    publishEndDate.setDate(publishStartDate.getDate() + 7);

    return new FormGroup({
      question: new FormControl('', Validators.required),
      options: new FormArray([
        new FormControl('', Validators.required),
        new FormControl('', Validators.required),
        new FormControl('', Validators.required),
        new FormControl('', Validators.required)
      ]),
      correctAnswer: new FormControl(''),
      publishStartDate: new FormControl(publishStartDate, Validators.required),
      publishEndDate: new FormControl(publishEndDate, Validators.required)
    });
  }

  private initFormByPollQuestion(pollQuestion: PollQuestion) {
    const optionControls = pollQuestion.options.map(
      (option) => new FormControl(option, Validators.required)
    );
    this.addPollForm = new FormGroup({
      question: new FormControl(pollQuestion.question, Validators.required),
      options: new FormArray(optionControls),
      correctAnswer: new FormControl(pollQuestion.correctAnswer || ''),
      publishStartDate: new FormControl(
        new Date(pollQuestion.publishStartDate),
        Validators.required
      ),
      publishEndDate: new FormControl(
        new Date(pollQuestion.publishEndDate),
        Validators.required
      )
    });
    return this.addPollForm;
  }

  getOptionControls() {
    return this.addPollForm.get('options') as FormArray;
  }

  async onSubmit() {
    if (this.addPollForm.valid) {
      console.log(this.addPollForm.value);
      this.pollQuestion = this.createByForm(
        this.addPollForm,
        this.pollQuestion,
        this.isEditMode
      );
      this.loader = await this.uiUtil.showLoader(
        UI_MESSAGES.SAVE_IN_PROGRESS.replace(
          UI_MESSAGES.PLACEHOLDER,
          ITEMS.POLL_QUESTION
        )
      );

      this.pollQuestionService
        .savePollQuestion(this.pollQuestion)
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
              this.addPollForm.reset();
            }
            this.uiUtil.presentAlert(
              UI_MESSAGES.SUCCESS_HEADER,
              UI_MESSAGES.SUCCESS_ADD_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                ITEMS.POLL_QUESTION
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
                ITEMS.POLL_QUESTION
              ),
              [UI_MESSAGES.FAILURE_CTA_TEXT]
            );
          }
        );
    }
  }

  private createByForm(
    addPollForm: FormGroup,
    pollQuestion: PollQuestion,
    isEditMode: boolean
  ) {
    return new PollQuestion(
      isEditMode ? pollQuestion.pollId : null,
      addPollForm.value.question,
      addPollForm.value.options,
      addPollForm.value.correctAnswer || '',
      new Date(addPollForm.value.publishStartDate).getTime(),
      new Date(addPollForm.value.publishEndDate).getTime(),
      isEditMode ? pollQuestion.submitDate : new Date().getTime(),
      isEditMode ? pollQuestion.status : ITEM_STATUS.SUBMITTED
    );
  }

  removeOption(index: number) {
    this.getOptionControls().removeAt(index);
  }

  addOption() {
    this.getOptionControls().push(new FormControl('', Validators.required));
  }

  ngOnDestroy(): void {
    this.pollQuestionService.clearViewEditModePollQuestion();
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
