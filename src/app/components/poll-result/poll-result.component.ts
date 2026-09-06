import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { PollsService } from '../../services/polls.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PollQuestion } from 'src/app/models/PollQuestion';
import { AppUtilService } from 'src/app/util/AppUtilService';

@Component({
  selector: 'app-poll-result',
  templateUrl: './poll-result.component.html',
  styleUrls: ['./poll-result.component.scss']
})
export class PollResultComponent implements OnInit, OnDestroy {
  @Input() pollQuestion: PollQuestion;
  destroy$: Subject<boolean> = new Subject();
  totalVotes = 0;
  optionData = {};

  constructor(
    private pollsService: PollsService,
    private appUtil: AppUtilService
  ) {}

  ngOnInit() {
    this.countVotes();
  }

  ngOnChange() {
    this.countVotes();
  }

  countVotes() {
    // read the sanitized public aggregate (no email/IP) rather than raw votes
    this.pollsService
      .getPollResults(this.pollQuestion.pollId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((results) => {
        this.totalVotes = results.totalVotes;
        this.appUtil.applyPollResultCounts(
          this.pollQuestion,
          results.totalVotes,
          results.optionCounts,
          this.optionData
        );
      });
  }

  getCorrectAnswerText(): string {
    if (!this.pollQuestion.correctAnswer) return '';
    const index = parseInt(this.pollQuestion.correctAnswer.replace('option', ''), 10) - 1;
    return this.pollQuestion.options[index] || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
