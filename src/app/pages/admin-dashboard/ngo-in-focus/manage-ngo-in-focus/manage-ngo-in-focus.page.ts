import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, of } from 'rxjs';
import { NgoInFocus } from 'src/app/models/NgoInFocus';
import { NgoInFocusService } from 'src/app/services/ngo-in-focus.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntil, catchError, switchMap } from 'rxjs/operators';
import { UI_MESSAGES, ITEMS, MEDIA_TYPE } from 'src/app/app.constants';

@Component({
  selector: 'app-manage-ngo-in-focus',
  templateUrl: './manage-ngo-in-focus.page.html',
  styleUrls: ['./manage-ngo-in-focus.page.scss']
})
export class ManageNgoInFocusPage implements OnInit, OnDestroy {
  destroy$: Subject<boolean> = new Subject();
  allItems: NgoInFocus[] = [];
  displayedItems: NgoInFocus[] = [];
  sortColumn = 'submitDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  filterCategory = '';
  filterStatus = '';
  openDropdown = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  constructor(private ngoInFocusService: NgoInFocusService, private uiUtil: UiUtilService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() { this.loadData(); }

  loadData() {
    this.ngoInFocusService.getNgosInFocus().pipe(takeUntil(this.destroy$)).subscribe(list => {
      this.allItems = list; this.applySort();
    });
  }

  applySort() {
    let filtered = [...this.allItems];
    if (this.filterCategory) filtered = filtered.filter(item => (item.category || '').toLowerCase() === this.filterCategory);
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

  sortBy(column: string) { if (this.sortColumn === column) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; else { this.sortColumn = column; this.sortDirection = 'desc'; } this.currentPage = 1; this.applySort(); }
  onFilterChange() { this.currentPage = 1; this.openDropdown = ''; this.applySort(); }
  toggleDropdown(name: string) { this.openDropdown = this.openDropdown === name ? '' : name; }
  removeFilter(key: string) { this[key] = ''; this.onFilterChange(); }
  clearAllFilters() { this.filterCategory = ''; this.filterStatus = ''; this.onFilterChange(); }
  get hasActiveFilters(): boolean { return !!(this.filterCategory || this.filterStatus); }
  goToPage(p: number) { if (p >= 1 && p <= this.totalPages) { this.currentPage = p; this.applySort(); } }
  onPageSizeChange() { this.currentPage = 1; this.applySort(); }
  get pageNumbers(): number[] { const pages = []; let s = Math.max(1, this.currentPage - 2); let e = Math.min(this.totalPages, s + 4); if (e - s < 4) s = Math.max(1, e - 4); for (let i = s; i <= e; i++) pages.push(i); return pages; }
  refreshData() { this.loadData(); }

  addNgoInFocus() { this.router.navigate(['ngo-in-focus', 'new'], { relativeTo: this.route }); }
  viewNgoInFocusDetails(ngo: NgoInFocus) { this.ngoInFocusService.setViewEditModeNgoInFocus(ngo); this.router.navigate(['ngo-in-focus', 'edit'], { relativeTo: this.route, queryParams: { id: ngo.id } }); }

  deleteNgoInFocus(index: number, ngo: NgoInFocus) {
    this.uiUtil.presentAlert(UI_MESSAGES.CONFIRM_HEADER, UI_MESSAGES.CONFIRM_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.NGO_IN_FOCUS),
      [{ text: UI_MESSAGES.CONFIRM_DELETE_PRIMARY_CTA, handler: async () => {
        const loader = await this.uiUtil.showLoader(UI_MESSAGES.DELETE_IN_PROGRESS.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.NGO_IN_FOCUS));
        this.ngoInFocusService.deleteNgoInFocus(ngo.id).pipe(takeUntil(this.destroy$),
          switchMap(() => ngo.ngoLogo ? this.ngoInFocusService.deleteNgoInFocusImage(ngo.ngoLogo).pipe(catchError(() => of(true))) : of(true)),
          switchMap(() => ngo.mediaType === MEDIA_TYPE.IMAGE && ngo.mediaLink ? this.ngoInFocusService.deleteNgoInFocusImage(ngo.mediaLink).pipe(catchError(() => of(true))) : of(true))
        ).subscribe(
          () => { loader.dismiss(); this.loadData(); this.uiUtil.presentAlert(UI_MESSAGES.SUCCESS_HEADER, UI_MESSAGES.SUCCESS_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.NGO_IN_FOCUS), [UI_MESSAGES.FAILURE_CTA_TEXT]); },
          () => { loader.dismiss(); this.uiUtil.presentAlert(UI_MESSAGES.FAILURE_HEADER, UI_MESSAGES.FAILURE_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.NGO_IN_FOCUS), [UI_MESSAGES.FAILURE_CTA_TEXT]); }
        );
      }}, { text: UI_MESSAGES.CONFIRM_DELETE_SECONDARY_CTA, role: 'cancel' }]);
  }

  publishNgoInFocus(id: string, category: string) {
    this.ngoInFocusService.publishNgoInFocus(id, category).subscribe(() => {
      this.uiUtil.presentAlert(UI_MESSAGES.SUCCESS_HEADER, UI_MESSAGES.SUCCESS_PUBLISH_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.NGO_IN_FOCUS), [UI_MESSAGES.FAILURE_CTA_TEXT]);
      this.loadData();
    });
  }

  unpublishSingleNgoInFocus(ngo: NgoInFocus) {
    this.ngoInFocusService.unpublishSingleItem(ngo.id).subscribe(() => {
      this.uiUtil.presentAlert(UI_MESSAGES.SUCCESS_HEADER, UI_MESSAGES.SUCCESS_UNPUBLISH_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.NGO_IN_FOCUS), [UI_MESSAGES.FAILURE_CTA_TEXT]);
      this.loadData();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(true); this.destroy$.unsubscribe(); }
}
