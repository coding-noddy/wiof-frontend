import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { combineLatest, Subject, throwError } from 'rxjs';
import { catchError, first, map, takeUntil } from 'rxjs/operators';
import { PollQuestion } from 'src/app/models/PollQuestion';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { AppUtilService } from 'src/app/util/AppUtilService';
import { IpService } from '../../services/ip.service';
import { PollQuestionService } from '../../services/poll-question.service';
import { PollsService } from '../../services/polls.service';
import { Poll } from 'src/app/models/Poll';
import { UI_MESSAGES } from 'src/app/app.constants';
import { ActivityService } from 'src/app/services/activity.service';
import { AuthService } from 'src/app/services/auth.service';
import firebase from 'firebase/compat/app';

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

  // Auth and vote detection state
  isAuthenticated: boolean = false;
  currentUser: firebase.User | null = null;
  hasVoted: boolean = false;
  votedOption: string = '';

  constructor(
    private pollsService: PollsService,
    private pollQuestionService: PollQuestionService,
    private ip: IpService,
    private uiUtil: UiUtilService,
    private appUtil: AppUtilService,
    private activityService: ActivityService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.wiofPollsForm = new FormGroup({
      name: new FormControl(''),
      option: new FormControl('', [Validators.required]),
      email: new FormControl('')
    });

    // Check authentication state and set up user context
    this.authService.isAuthenticated$.pipe(first()).subscribe(isAuth => {
      this.isAuthenticated = isAuth;
      if (isAuth) {
        this.authService.currentUser$.pipe(first()).subscribe(user => {
          this.currentUser = user;
          // Check vote status once we have the poll loaded
          this.checkVoteStatusWhenReady();
        });
      }
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
          // Check vote status if user is already authenticated
          this.checkVoteStatus();
        },
        (err) => {
          console.log(err);
        }
      );
  }

  /**
   * Checks vote status once auth data is available but poll may not be loaded yet.
   * Retries when poll data arrives via checkVoteStatus().
   */
  private checkVoteStatusWhenReady(): void {
    if (this.pollQuestion && this.currentUser) {
      this.checkVoteStatus();
    }
  }

  /**
   * Checks if the authenticated user has already voted on the current poll.
   * If voted, disables the form and shows the voted option.
   */
  private checkVoteStatus(): void {
    if (!this.isAuthenticated || !this.currentUser || !this.pollQuestion) {
      return;
    }

    this.activityService.hasUserVoted(this.currentUser.uid, this.pollQuestion.pollId)
      .then(result => {
        if (result.voted) {
          this.hasVoted = true;
          this.votedOption = result.selectedOption || '';
          this.showForm = false;
          this.showPollResult = true;
        }
      })
      .catch(err => console.warn('Vote status check failed:', err));
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

            // Log poll vote activity for authenticated users (must be before form reset)
            this.logPollVote();

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

  private logPollVote(): void {
    if (!this.isAuthenticated || !this.currentUser) return;

    const selectedOptionKey = this.wiofPollsForm.get('option')?.value;
    // Resolve the option text from the poll question options array
    // option values are 'option1', 'option2', etc.
    const optionIndex = selectedOptionKey ? parseInt(selectedOptionKey.replace('option', ''), 10) - 1 : -1;
    const selectedOptionText = (optionIndex >= 0 && this.pollQuestion?.options)
      ? this.pollQuestion.options[optionIndex] || selectedOptionKey
      : selectedOptionKey || '';

    const userEmail = this.currentUser.email || '';

    this.activityService.logPollVote(
      this.currentUser.uid,
      this.pollQuestion?.pollId || '',
      selectedOptionText,
      userEmail,
      this.pollQuestion?.question || ''
    ).then(() => {
      // Mark as voted locally after successful log
      this.hasVoted = true;
      this.votedOption = selectedOptionText;
    }).catch(err => console.warn('Poll vote activity logging failed:', err));
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
