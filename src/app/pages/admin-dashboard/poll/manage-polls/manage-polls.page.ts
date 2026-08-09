import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { PollQuestion } from 'src/app/models/PollQuestion';
import { PollQuestionService } from 'src/app/services/poll-question.service';
import { PollsService } from 'src/app/services/polls.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { Router, ActivatedRoute } from '@angular/router';
import { UI_MESSAGES, ITEMS } from 'src/app/app.constants';

@Component({
  selector: 'app-manage-polls',
  templateUrl: './manage-polls.page.html',
  styleUrls: ['./manage-polls.page.scss']
})
export class ManagePollsPage implements OnInit, OnDestroy {
  destroy$: Subject<boolean> = new Subject();
  pollQuestionList$: Observable<PollQuestion[]>;
  sortColumn = 'submitDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  filterStatus = '';
  openDropdown = '';
  summary = { total: 0, published: 0, totalVotes: 0 };
  voteCounts: { [pollId: string]: number } = {};

  constructor(
    private pollQuestionService: PollQuestionService,
    private pollsService: PollsService,
    private uiUtil: UiUtilService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.initPage();
  }

  initPage() {
    this.pollQuestionList$ = this.pollQuestionService.getPollQuestions().pipe(
      takeUntil(this.destroy$),
      map((list) => {
        this.computeSummary(list);
        list.forEach(poll => this.loadVoteCount(poll.pollId));
        let filtered = list;
        if (this.filterStatus) filtered = filtered.filter(p => p.status === this.filterStatus);
        return this.sortData(filtered);
      }),
      catchError((err) => throwError(err))
    );
  }

  private computeSummary(list: PollQuestion[]) {
    this.summary.total = list.length;
    this.summary.published = list.filter(p => p.status === 'published').length;
  }

  private loadVoteCount(pollId: string) {
    if (this.voteCounts[pollId] !== undefined) return;
    this.pollsService.getPolls(pollId).pipe(takeUntil(this.destroy$)).subscribe(votes => {
      this.voteCounts[pollId] = votes.length;
      // Update total votes
      this.summary.totalVotes = Object.values(this.voteCounts).reduce((sum, v) => sum + v, 0);
    });
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
    this.initPage();
  }

  private sortData(list: PollQuestion[]): PollQuestion[] {
    return list.sort((a, b) => {
      let valA = a[this.sortColumn];
      let valB = b[this.sortColumn];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  refreshData() {
    this.voteCounts = {};
    this.initPage();
  }

  toggleDropdown(name: string) { this.openDropdown = this.openDropdown === name ? '' : name; }
  onFilterChange() { this.openDropdown = ''; this.initPage(); }
  removeFilter(key: string) { this[key] = ''; this.onFilterChange(); }
  get hasActiveFilters(): boolean { return !!this.filterStatus; }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  public async deletePollQuestion(pollQuestionList: PollQuestion[], index: number, pollQuestionId: string) {
    this.uiUtil.presentAlert(
      UI_MESSAGES.CONFIRM_HEADER,
      UI_MESSAGES.CONFIRM_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.POLL_QUESTION),
      [
        {
          text: UI_MESSAGES.CONFIRM_DELETE_PRIMARY_CTA,
          handler: async () => {
            const loader = await this.uiUtil.showLoader(
              UI_MESSAGES.DELETE_IN_PROGRESS.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.POLL_QUESTION)
            );
            this.pollQuestionService.deletePollQuestion(pollQuestionId).subscribe(
              () => {
                loader.dismiss();
                this.uiUtil.presentAlert(UI_MESSAGES.SUCCESS_HEADER,
                  UI_MESSAGES.SUCCESS_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.POLL_QUESTION),
                  [UI_MESSAGES.FAILURE_CTA_TEXT]);
                pollQuestionList.splice(index, 1);
              },
              () => {
                loader.dismiss();
                this.uiUtil.presentAlert(UI_MESSAGES.FAILURE_HEADER,
                  UI_MESSAGES.FAILURE_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.POLL_QUESTION),
                  [UI_MESSAGES.FAILURE_CTA_TEXT]);
              }
            );
          }
        },
        { text: UI_MESSAGES.CONFIRM_DELETE_SECONDARY_CTA, role: 'cancel' }
      ]
    );
  }

  publishPollQuestion(pollQuestionId: string) {
    this.pollQuestionService.publishPollQuestion(pollQuestionId).subscribe(() => {
      this.uiUtil.presentAlert(UI_MESSAGES.SUCCESS_HEADER,
        UI_MESSAGES.SUCCESS_PUBLISH_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.POLL_QUESTION),
        [UI_MESSAGES.FAILURE_CTA_TEXT]);
      this.refreshData();
    });
  }

  viewPollDetails(pollQuestion: PollQuestion) {
    this.pollQuestionService.setViewEditModePollQuestion(pollQuestion);
    this.router.navigate(['poll', 'edit'], { relativeTo: this.route, queryParams: { id: pollQuestion.pollId } });
  }

  addNewPoll() {
    this.router.navigate(['poll', 'new'], { relativeTo: this.route });
  }
}
