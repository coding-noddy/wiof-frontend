import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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

  // Per-browser guard for guests who don't enter an email
  private readonly POLL_VOTE_STORAGE_PREFIX = 'wiof_poll_voted_';

  constructor(
    private pollsService: PollsService,
    private pollQuestionService: PollQuestionService,
    private ip: IpService,
    private uiUtil: UiUtilService,
    private appUtil: AppUtilService,
    private activityService: ActivityService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.wiofPollsForm = new FormGroup({
      option: new FormControl('', [Validators.required]),
      email: new FormControl('')
    });

    // Keep the vote state tied to the currently authenticated account.
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.isAuthenticated = !!user;
        this.resetVoteState();
        this.checkVoteStatusWhenReady();
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
          // Testing-only: `?resetPollVote=1` clears this browser's local vote lock
          // so QA can simulate a new visitor without a real IP/device change.
          this.applyDevVoteReset();
          // Check vote status if user is already authenticated
          this.checkVoteStatus();
          // Check vote status for guests who voted from this browser before
          this.checkLocalGuestVoteStatus();
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

    const userId = this.currentUser.uid;
    const pollId = this.pollQuestion.pollId;

    this.activityService.hasUserVoted(userId, pollId)
      .then(result => {
        // Ignore a response belonging to an account that has since signed out
        // or been replaced.
        if (this.currentUser?.uid !== userId || this.pollQuestion?.pollId !== pollId) {
          return;
        }

        if (result.voted) {
          this.hasVoted = true;
          // Resolve option key to text if it's a legacy value like "option1"
          this.votedOption = this.resolveOptionText(result.selectedOption || '');
          this.showForm = false;
          this.showPollResult = true;
        }
      })
      .catch(err => console.warn('Vote status check failed:', err));
  }

  private resetVoteState(): void {
    this.hasVoted = false;
    this.votedOption = '';
    this.showForm = true;
    this.showPollResult = false;
  }

  private pollVoteStorageKey(pollId: string): string {
    return `${this.POLL_VOTE_STORAGE_PREFIX}${pollId}`;
  }

  /**
   * Testing helper only: `?resetPollVote=1` clears this browser's local vote lock,
   * letting QA simulate a fresh visitor without changing IP/device.
   */
  private applyDevVoteReset(): void {
    if (!this.pollQuestion?.pollId) return;
    if (this.route.snapshot.queryParamMap.get('resetPollVote')) {
      localStorage.removeItem(this.pollVoteStorageKey(this.pollQuestion.pollId));
    }
  }

  /**
   * Guests aren't tracked by uid, so an anonymous (no email) vote is remembered
   * per-browser via localStorage to block resubmission from the same browser.
   */
  private checkLocalGuestVoteStatus(): void {
    if (this.isAuthenticated || this.hasVoted || !this.pollQuestion?.pollId) return;

    const raw = localStorage.getItem(this.pollVoteStorageKey(this.pollQuestion.pollId));
    if (!raw) return;

    try {
      const record = JSON.parse(raw);
      this.hasVoted = true;
      this.votedOption = record.option || '';
      this.showForm = false;
      this.showPollResult = true;
    } catch {
      localStorage.removeItem(this.pollVoteStorageKey(this.pollQuestion.pollId));
    }
  }

  private persistLocalGuestVote(selectedOptionText: string): void {
    if (this.isAuthenticated || !this.pollQuestion?.pollId) return;
    localStorage.setItem(
      this.pollVoteStorageKey(this.pollQuestion.pollId),
      JSON.stringify({ option: selectedOptionText, votedAt: Date.now() })
    );
  }

  /**
   * Resolves a poll option value to its display text.
   * Handles legacy values like "option1", "option2" by looking up the poll question options array.
   * Returns the value as-is if it's already human-readable text.
   */
  private resolveOptionText(value: string): string {
    if (!value) return '';
    // Check if it's a legacy key like "option1", "option2", etc.
    const match = value.match(/^option(\d+)$/);
    if (match && this.pollQuestion?.options) {
      const index = parseInt(match[1], 10) - 1;
      if (index >= 0 && index < this.pollQuestion.options.length) {
        return this.pollQuestion.options[index];
      }
    }
    return value;
  }
  async submit() {
    if (!this.wiofPollsForm.valid) {
      this.showError();
      return;
    }

    const selectedOptionKey = this.wiofPollsForm.get('option')?.value || '';
    const selectedOptionText = this.resolveOptionText(selectedOptionKey);
    const normalizedEmail = (
      this.isAuthenticated ? this.currentUser?.email || '' : this.wiofPollsForm.value.email || ''
    ).trim().toLowerCase();

    // Guests: block a duplicate vote by email, even if that email belongs to
    // an account that already voted while authenticated.
    if (!this.isAuthenticated && normalizedEmail) {
      try {
        const existing = await this.pollsService.hasEmailVoted(this.pollQuestion.pollId, normalizedEmail).toPromise();
        if (existing?.voted) {
          this.hasVoted = true;
          this.votedOption = this.resolveOptionText(existing.option || '');
          this.showForm = false;
          this.showPollResult = true;
          this.uiUtil.presentToast(`You already voted for: ${this.votedOption}`, 'warning');
          return;
        }
      } catch (err) {
        console.warn('Email vote check failed:', err);
      }
    }

    const poll = Poll.createByForm(
      this.pollQuestion.pollId,
      this.wiofPollsForm,
      this.IP4.ip,
      this.IP6.ip
    );
    // Omit the field entirely rather than assigning `undefined` — the
    // Firestore SDK throws client-side on an explicit `undefined` field
    // value, which was breaking every guest vote submitted without an email.
    if (normalizedEmail) {
      poll.email = normalizedEmail;
    } else {
      delete poll.email;
    }
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
          this.uiUtil.presentToast(UI_MESSAGES.SUCCESS_POLL_VOTE_DESC, 'success');

          // Log poll vote activity for authenticated users (must be before form reset)
          this.logPollVote();
          // Remember this vote for guests so the same browser can't resubmit
          this.persistLocalGuestVote(selectedOptionText);

          this.wiofPollsForm.reset();
          this.showPollResult = true;
          this.showForm = false;
          // refresh results after successful vote
          this.loadResults();
        },
        (error) => {
          this.loader.dismiss();
          this.uiUtil.presentToast(
            UI_MESSAGES.FAILURE_ADD_ITEM_DESC.replace(
              UI_MESSAGES.PLACEHOLDER,
              'vote'
            ),
            'error'
          );
          console.log(error);
        }
      );
  }

  loadResults() {
    if (!this.pollQuestion || !this.pollQuestion.pollId) {
      return;
    }
    // Sanitized public aggregate (no email/IP) — raw vote documents are admin-only.
    this.pollsService
      .getPollResults(this.pollQuestion.pollId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((results) => {
        this.totalVotes = results.totalVotes;
        this.appUtil.applyPollResultCounts(this.pollQuestion, results.totalVotes, results.optionCounts, this.optionData);
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
