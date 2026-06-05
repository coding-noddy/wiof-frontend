import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { combineLatest, Subject, throwError } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { PollQuestion } from 'src/app/models/PollQuestion';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { AppUtilService } from 'src/app/util/AppUtilService';
import { IpService } from '../../services/ip.service';
import { PollQuestionService } from '../../services/poll-question.service';
import { PollsService } from '../../services/polls.service';
import { Poll } from 'src/app/models/Poll';
import { UI_MESSAGES } from 'src/app/app.constants';

@Component({
  selector: 'app-polls-widget',
  templateUrl: './polls-widget.component.html',
  styleUrls: ['./polls-widget.component.scss']
})
export class PollsWidgetComponent implements OnInit, OnDestroy {
  pollQuestion: PollQuestion;
  IP4: any = { ip: '' };
  IP6: any = { ip: '' };
  showPollResult: boolean = false;
  showForm: boolean = true;
  errorShow: boolean = false;
  loader;
  destroy$: Subject<boolean> = new Subject();
  wiofPollsForm: FormGroup;
  // result data
  totalVotes: number = 0;
  optionData: any = {};
  constructor(
    private pollsService: PollsService,
    private pollQuestionService: PollQuestionService,
    private ip: IpService,
    private uiUtil: UiUtilService
    ,private appUtil: AppUtilService
  ) {}

  ngOnInit() {
    this.wiofPollsForm = new FormGroup({
      name: new FormControl(''),
      option: new FormControl('', [Validators.required])
    });

    combineLatest([
      //TODO IP handling pending
      // this.ip.getIp4(),
      // this.ip.getIp6(),
      this.pollQuestionService.getPollQuestion()
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([pollData]) => {
          //TODO IP handling pending
          // this.IP4 = ip4Data;
          // this.IP6 = ip6Data;
          this.pollQuestion = pollData[0];
          // load current results (useful after vote)
          this.loadResults();
        },
        (err) => {
          console.log(err);
        }
      );
  }

  async submit() {
    if (this.wiofPollsForm.valid) {
      const poll = Poll.createByForm(
        this.pollQuestion.pollId,
        this.wiofPollsForm,
        this.IP4.ip,
        this.IP6.ip
      );
      this.loader = await this.uiUtil.showLoader(
        UI_MESSAGES.SAVE_IN_PROGRESS.replace(
          UI_MESSAGES.PLACEHOLDER,
          'your vote'
        )
      );
      this.pollsService
        .savePolls(poll)
        .pipe(
          takeUntil(this.destroy$),
          map((pollsRes) => {
            return pollsRes;
          }),
          catchError((err) => {
            return throwError(err);
          })
        )
        .subscribe(
          (subscribeRes) => {
            this.loader.dismiss();
            this.uiUtil.presentAlert(
              UI_MESSAGES.SUCCESS_POLL_VOTE_HEADER,
              UI_MESSAGES.SUCCESS_POLL_VOTE_DESC.replace(
                '$NAME',
                this.wiofPollsForm.get('name').value
              ),
              [UI_MESSAGES.SUCCESS_CTA_TEXT]
            );
            this.wiofPollsForm.reset();
            this.showPollResult = true;
            this.showForm = false;
            // refresh results after successful vote
            this.loadResults();
          },
          (error) => {
            this.loader.dismiss();
            this.uiUtil.presentAlert(
              UI_MESSAGES.FAILURE_HEADER,
              UI_MESSAGES.FAILURE_ADD_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                'vote'
              ),
              [UI_MESSAGES.FAILURE_CTA_TEXT]
            );
            console.log(error);
          }
        );
    } else {
      this.showError();
    }
  }

  loadResults() {
    if (!this.pollQuestion || !this.pollQuestion.pollId) {
      return;
    }
    this.pollsService
      .getPolls(this.pollQuestion.pollId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.totalVotes = data.length;
        this.appUtil.calculatePollResult(this.pollQuestion, data, this.optionData);
      });
  }

  showError() {
    this.errorShow = true;
    setTimeout(() => (this.errorShow = false), 2000);
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
