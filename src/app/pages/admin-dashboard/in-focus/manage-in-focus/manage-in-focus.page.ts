import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { InFocus } from 'src/app/models/InFocus';
import { InFocusService } from 'src/app/services/in-focus.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { UI_MESSAGES, ITEMS, normalizeElementCategory } from 'src/app/app.constants';

@Component({
  selector: 'app-manage-in-focus',
  templateUrl: './manage-in-focus.page.html',
  styleUrls: ['./manage-in-focus.page.scss']
})
export class ManageInFocusPage implements OnInit, OnDestroy {
  destroy$: Subject<boolean> = new Subject();
  allItems: InFocus[] = [];
  displayedItems: InFocus[] = [];
  sortColumn = 'submitDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  filterCategory = '';
  filterStatus = '';
  openDropdown = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  constructor(private inFocusService: InFocusService, private uiUtil: UiUtilService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() { this.loadData(); }

  loadData() {
    this.inFocusService.getInFocuses().pipe(takeUntil(this.destroy$)).subscribe(list => {
      this.allItems = list;
      this.applySort();
    });
  }

  applySort() {
    let filtered = [...this.allItems];
    if (this.filterCategory) filtered = filtered.filter(item => normalizeElementCategory(item.category) === this.filterCategory);
    if (this.filterStatus) filtered = filtered.filter(item => item.status === this.filterStatus);
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
  clearAllFilters() { this.filterCategory = ''; this.filterStatus = ''; this.onFilterChange(); }
  get hasActiveFilters(): boolean { return !!(this.filterCategory || this.filterStatus); }
  goToPage(p: number) { if (p >= 1 && p <= this.totalPages) { this.currentPage = p; this.applySort(); } }
  onPageSizeChange() { this.currentPage = 1; this.applySort(); }
  get pageNumbers(): number[] { const pages = []; let s = Math.max(1, this.currentPage - 2); let e = Math.min(this.totalPages, s + 4); if (e - s < 4) s = Math.max(1, e - 4); for (let i = s; i <= e; i++) pages.push(i); return pages; }
  refreshData() { this.loadData(); }

  addInFocus() { this.router.navigate(['in-focus', 'new'], { relativeTo: this.route }); }
  viewInFocusDetails(inFocus: InFocus) { this.inFocusService.setViewEditModeInFocus(inFocus); this.router.navigate(['in-focus', 'edit'], { relativeTo: this.route, queryParams: { id: inFocus.inFocusId } }); }

  deleteInFocus(index: number, inFocusId: string) {
    this.uiUtil.presentAlert(UI_MESSAGES.CONFIRM_HEADER, UI_MESSAGES.CONFIRM_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.IN_FOCUS),
      [{ text: UI_MESSAGES.CONFIRM_DELETE_PRIMARY_CTA, handler: async () => {
        const loader = await this.uiUtil.showLoader(UI_MESSAGES.DELETE_IN_PROGRESS.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.IN_FOCUS));
        this.inFocusService.deleteInFocus(inFocusId).pipe(takeUntil(this.destroy$)).subscribe(
          () => { loader.dismiss(); this.loadData(); this.uiUtil.presentToast(UI_MESSAGES.SUCCESS_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.IN_FOCUS), 'success'); },
          () => { loader.dismiss(); this.uiUtil.presentToast(UI_MESSAGES.FAILURE_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.IN_FOCUS), 'error'); }
        );
      }}, { text: UI_MESSAGES.CONFIRM_DELETE_SECONDARY_CTA, role: 'cancel' }]);
  }

  publishInFocus(inFocusId: string) {
    this.inFocusService.publishInFocus(inFocusId).subscribe(() => {
      this.uiUtil.presentToast(UI_MESSAGES.SUCCESS_PUBLISH_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.IN_FOCUS), 'success');
      this.loadData();
    });
  }

  unpublishInFocus(inFocusId: string) {
    this.inFocusService.unpublishInFocus(inFocusId).subscribe(() => {
      this.uiUtil.presentToast(UI_MESSAGES.SUCCESS_UNPUBLISH_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.IN_FOCUS), 'success');
      this.loadData();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(true); this.destroy$.unsubscribe(); }
}
