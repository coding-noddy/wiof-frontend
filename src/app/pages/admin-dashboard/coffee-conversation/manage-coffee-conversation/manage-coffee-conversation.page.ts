import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CoffeeConversation } from 'src/app/models/CoffeeConversation';
import { CoffeeConversationService } from 'src/app/services/coffee-conversation.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { UI_MESSAGES, ITEMS } from 'src/app/app.constants';

@Component({
  selector: 'app-manage-coffee-conversation',
  templateUrl: './manage-coffee-conversation.page.html',
  styleUrls: ['./manage-coffee-conversation.page.scss']
})
export class ManageCoffeeConversationPage implements OnInit, OnDestroy {
  destroy$: Subject<boolean> = new Subject();
  allItems: CoffeeConversation[] = [];
  displayedItems: CoffeeConversation[] = [];
  sortColumn = 'interviewDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  filterYear = '';
  filterCategory = '';
  openDropdown = '';
  availableYears: string[] = [];
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  constructor(
    private coffeeConversationService: CoffeeConversationService,
    private uiUtil: UiUtilService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() { this.loadData(); }

  loadData() {
    this.coffeeConversationService.getCoffeeConversations().pipe(takeUntil(this.destroy$)).subscribe(list => {
      this.allItems = list;
      this.availableYears = [...new Set(list.map(cc => cc.interviewDate ? new Date(cc.interviewDate).getFullYear().toString() : ''))].filter(y => y).sort().reverse();
      this.applySort();
    });
  }

  applySort() {
    let filtered = [...this.allItems];
    if (this.filterYear) {
      filtered = filtered.filter(cc => cc.interviewDate && new Date(cc.interviewDate).getFullYear().toString() === this.filterYear);
    }
    if (this.filterCategory) {
      filtered = filtered.filter(cc => (cc.category || '').toLowerCase() === this.filterCategory);
    }
    const sorted = filtered.sort((a, b) => {
      let valA = a[this.sortColumn]; let valB = b[this.sortColumn];
      if (valA == null) valA = ''; if (valB == null) valB = '';
      if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = (valB as string).toLowerCase(); }
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    this.totalPages = Math.ceil(sorted.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.displayedItems = sorted.slice(start, start + this.pageSize);
  }

  sortBy(column: string) {
    if (this.sortColumn === column) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortColumn = column; this.sortDirection = 'desc'; }
    this.currentPage = 1; this.applySort();
  }

  onFilterChange() { this.currentPage = 1; this.openDropdown = ''; this.applySort(); }
  toggleDropdown(name: string) { this.openDropdown = this.openDropdown === name ? '' : name; }
  removeFilter(key: string) { this[key] = ''; this.onFilterChange(); }
  clearAllFilters() { this.filterYear = ''; this.filterCategory = ''; this.onFilterChange(); }
  get hasActiveFilters(): boolean { return !!(this.filterYear || this.filterCategory); }
  goToPage(p: number) { if (p >= 1 && p <= this.totalPages) { this.currentPage = p; this.applySort(); } }
  onPageSizeChange() { this.currentPage = 1; this.applySort(); }
  get pageNumbers(): number[] { const pages = []; const max = 5; let s = Math.max(1, this.currentPage - 2); let e = Math.min(this.totalPages, s + max - 1); if (e - s < max - 1) s = Math.max(1, e - max + 1); for (let i = s; i <= e; i++) pages.push(i); return pages; }
  refreshData() { this.loadData(); }

  addCoffeeConversation() { this.router.navigate(['coffee-conversation', 'new'], { relativeTo: this.route }); }

  viewCoffeeConversationDetails(cc: CoffeeConversation) {
    this.coffeeConversationService.setViewEditModeCoffeeConversation(cc);
    this.router.navigate(['coffee-conversation', 'edit'], { relativeTo: this.route, queryParams: { id: cc.ccId } });
  }

  deleteCoffeeConversation(index: number, cc: CoffeeConversation) {
    this.uiUtil.presentAlert(UI_MESSAGES.CONFIRM_HEADER,
      UI_MESSAGES.CONFIRM_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.COFFEE_CONVERSATION),
      [{ text: UI_MESSAGES.CONFIRM_DELETE_PRIMARY_CTA, handler: async () => {
        const loader = await this.uiUtil.showLoader(UI_MESSAGES.DELETE_IN_PROGRESS.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.COFFEE_CONVERSATION));
        this.coffeeConversationService.deleteCoffeeConversation(cc.ccId).pipe(takeUntil(this.destroy$)).subscribe(
          () => { loader.dismiss(); this.loadData(); this.uiUtil.presentToast(UI_MESSAGES.SUCCESS_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.COFFEE_CONVERSATION), 'success'); },
          () => { loader.dismiss(); this.uiUtil.presentToast(UI_MESSAGES.FAILURE_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.COFFEE_CONVERSATION), 'error'); }
        );
      }}, { text: UI_MESSAGES.CONFIRM_DELETE_SECONDARY_CTA, role: 'cancel' }]);
  }

  ngOnDestroy(): void { this.destroy$.next(true); this.destroy$.unsubscribe(); }
}
