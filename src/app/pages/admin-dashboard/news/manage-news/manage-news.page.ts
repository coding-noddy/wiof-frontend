import { Component, OnInit, OnDestroy } from '@angular/core';
import { NewsService } from 'src/app/services/news.service';
import { News } from 'src/app/models/News';
import { Subject, of } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { Router, ActivatedRoute } from '@angular/router';
import { MEDIA_TYPE, UI_MESSAGES, ITEMS, normalizeElementCategory } from 'src/app/app.constants';

@Component({
  selector: 'app-manage-news',
  templateUrl: './manage-news.page.html',
  styleUrls: ['./manage-news.page.scss']
})
export class ManageNewsPage implements OnInit, OnDestroy {
  destroy$: Subject<boolean> = new Subject();

  allNews: News[] = [];
  displayedNews: News[] = [];
  sortColumn = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  filterCategory = '';
  filterMediaType = '';
  openDropdown = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  summary = { total: 0, withImage: 0, withVideo: 0 };

  constructor(
    private newsService: NewsService,
    private uiUtil: UiUtilService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() { this.loadData(); }

  loadData() {
    this.newsService.getAllNews().pipe(takeUntil(this.destroy$)).subscribe(list => {
      this.allNews = list;
      this.computeSummary(list);
      this.applyFilterSortPaginate();
    });
  }

  private computeSummary(list: News[]) {
    this.summary.total = list.length;
    this.summary.withImage = list.filter(n => n.mediaType === 'image').length;
    this.summary.withVideo = list.filter(n => n.mediaType === 'video').length;
  }

  applyFilterSortPaginate() {
    let filtered = [...this.allNews];
    if (this.filterCategory) {
      filtered = filtered.filter(n => normalizeElementCategory(n.category) === this.filterCategory);
    }
    if (this.filterMediaType) {
      filtered = filtered.filter(n => n.mediaType === this.filterMediaType);
    }
    filtered.sort((a, b) => {
      let valA = a[this.sortColumn]; let valB = b[this.sortColumn];
      if (valA == null) valA = ''; if (valB == null) valB = '';
      if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = (valB as string).toLowerCase(); }
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    this.totalPages = Math.ceil(filtered.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.displayedNews = filtered.slice(start, start + this.pageSize);
  }

  get filteredCount(): number {
    if (!this.filterCategory) return this.allNews.length;
    return this.allNews.filter(n => normalizeElementCategory(n.category) === this.filterCategory).length;
  }

  get pageNumbers(): number[] {
    const pages = []; const max = 5;
    let start = Math.max(1, this.currentPage - Math.floor(max / 2));
    let end = Math.min(this.totalPages, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  sortBy(column: string) {
    if (this.sortColumn === column) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortColumn = column; this.sortDirection = 'desc'; }
    this.currentPage = 1;
    this.applyFilterSortPaginate();
  }

  onFilterChange() { this.currentPage = 1; this.openDropdown = ''; this.applyFilterSortPaginate(); }
  toggleDropdown(name: string) { this.openDropdown = this.openDropdown === name ? '' : name; }
  removeFilter(key: string) { this[key] = ''; this.onFilterChange(); }
  clearAllFilters() { this.filterCategory = ''; this.filterMediaType = ''; this.onFilterChange(); }
  get hasActiveFilters(): boolean { return !!(this.filterCategory || this.filterMediaType); }
  onPageSizeChange() { this.currentPage = 1; this.applyFilterSortPaginate(); }
  goToPage(page: number) { if (page >= 1 && page <= this.totalPages) { this.currentPage = page; this.applyFilterSortPaginate(); } }
  refreshData() { this.loadData(); }

  addBreakinNews() { this.router.navigate(['news', 'new'], { relativeTo: this.route }); }
  viewNewsDetails(news: News) {
    this.newsService.setViewEditModeNews(news);
    this.router.navigate(['news', 'edit'], { relativeTo: this.route, queryParams: { id: news.newsId } });
  }

  deleteNews(index: number, news: News) {
    this.uiUtil.presentAlert(UI_MESSAGES.CONFIRM_HEADER,
      UI_MESSAGES.CONFIRM_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.NEWS),
      [{
        text: UI_MESSAGES.CONFIRM_DELETE_PRIMARY_CTA,
        handler: async () => {
          const loader = await this.uiUtil.showLoader(UI_MESSAGES.DELETE_IN_PROGRESS.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.NEWS));
          this.newsService.deleteNews(news.newsId).pipe(takeUntil(this.destroy$),
            switchMap(() => news.mediaType === MEDIA_TYPE.IMAGE ? this.newsService.deleteNewsImage(news.mediaLink) : of(true))
          ).subscribe(() => { loader.dismiss(); this.loadData();
            this.uiUtil.presentToast(UI_MESSAGES.SUCCESS_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.NEWS), 'success');
          }, () => { loader.dismiss();
            this.uiUtil.presentToast(UI_MESSAGES.FAILURE_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.NEWS), 'error');
          });
        }
      }, { text: UI_MESSAGES.CONFIRM_DELETE_SECONDARY_CTA, role: 'cancel' }]
    );
  }

  ngOnDestroy(): void { this.destroy$.next(true); this.destroy$.unsubscribe(); }
}
