import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { PollsService } from '../../services/polls.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PollQuestion } from 'src/app/models/PollQuestion';
import { AppUtilService } from 'src/app/util/AppUtilService';

@Component({
  selector: 'app-poll-result',
  templateUrl: './poll-result.component.html',
  styleUrls: ['./poll-result.component.scss'],
  standalone: false
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
    // read all votes
    this.pollsService
      .getPolls(this.pollQuestion.pollId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.totalVotes = data.length;
        this.appUtil.calculatePollResult(
          this.pollQuestion,
          data,
          this.optionData
        );
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
