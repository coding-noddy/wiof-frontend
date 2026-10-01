import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { throwError, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { ActionItem } from 'src/app/models/ActionItem';
import { ActionService } from 'src/app/services/action.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { UI_MESSAGES, ITEMS, ELEMENTS, ACTION_TYPE } from 'src/app/app.constants';

@Component({
  selector: 'app-manage-take-action',
  templateUrl: './manage-take-action.page.html',
  styleUrls: ['./manage-take-action.page.scss']
})
export class ManageTakeActionPage implements OnInit, OnDestroy {
  destroy$: Subject<boolean> = new Subject();

  elements = Object.values(ELEMENTS);
  actionTypes = Object.values(ACTION_TYPE);

  // Data
  allActions: ActionItem[] = [];
  displayedActions: ActionItem[] = [];

  // Sorting
  sortColumn = 'displayOrder';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Filter
  searchText = '';
  filterElement = '';
  filterActionType = '';
  filterActive = ''; // '', 'true', 'false'
  filterFeatured = ''; // '', 'true', 'false'
  openDropdown = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Summary
  summary = { total: 0, active: 0, inactive: 0, featured: 0 };

  constructor(
    private actionService: ActionService,
    private uiUtil: UiUtilService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.actionService.getAllActions().pipe(
      takeUntil(this.destroy$),
      catchError((err) => throwError(err))
    ).subscribe(actionList => {
      this.allActions = actionList;
      this.computeSummary(actionList);
      this.applyFilterSortPaginate();
    });
  }

  private computeSummary(list: ActionItem[]) {
    this.summary = {
      total: list.length,
      active: list.filter(a => a.isActive).length,
      inactive: list.filter(a => !a.isActive).length,
      featured: list.filter(a => a.isFeatured).length
    };
  }

  applyFilterSortPaginate() {
    let filtered = [...this.allActions];

    if (this.searchText) {
      const term = this.searchText.toLowerCase();
      filtered = filtered.filter(a => a.title?.toLowerCase().includes(term));
    }
    if (this.filterElement) {
      filtered = filtered.filter(a => (a.elementIds || []).includes(this.filterElement));
    }
    if (this.filterActionType) {
      filtered = filtered.filter(a => a.actionType === this.filterActionType);
    }
    if (this.filterActive) {
      const wantActive = this.filterActive === 'true';
      filtered = filtered.filter(a => !!a.isActive === wantActive);
    }
    if (this.filterFeatured) {
      const wantFeatured = this.filterFeatured === 'true';
      filtered = filtered.filter(a => !!a.isFeatured === wantFeatured);
    }

    filtered.sort((a, b) => {
      let valA = a[this.sortColumn];
      let valB = b[this.sortColumn];
      if (valA == null) valA = '';
      if (valB == null) valB = '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.totalPages = Math.ceil(filtered.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.displayedActions = filtered.slice(start, start + this.pageSize);
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
    this.applyFilterSortPaginate();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.openDropdown = '';
    this.applyFilterSortPaginate();
  }

  toggleDropdown(name: string) {
    this.openDropdown = this.openDropdown === name ? '' : name;
  }

  removeFilter(key: string) {
    this[key] = '';
    this.onFilterChange();
  }

  clearAllFilters() {
    this.searchText = '';
    this.filterElement = '';
    this.filterActionType = '';
    this.filterActive = '';
    this.filterFeatured = '';
    this.onFilterChange();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchText || this.filterElement || this.filterActionType || this.filterActive || this.filterFeatured);
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.applyFilterSortPaginate();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.applyFilterSortPaginate();
  }

  get pageNumbers(): number[] {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  get filteredCount(): number {
    let filtered = this.allActions;
    if (this.searchText) {
      const term = this.searchText.toLowerCase();
      filtered = filtered.filter(a => a.title?.toLowerCase().includes(term));
    }
    if (this.filterElement) {
      filtered = filtered.filter(a => (a.elementIds || []).includes(this.filterElement));
    }
    if (this.filterActionType) {
      filtered = filtered.filter(a => a.actionType === this.filterActionType);
    }
    if (this.filterActive) {
      const wantActive = this.filterActive === 'true';
      filtered = filtered.filter(a => !!a.isActive === wantActive);
    }
    if (this.filterFeatured) {
      const wantFeatured = this.filterFeatured === 'true';
      filtered = filtered.filter(a => !!a.isFeatured === wantFeatured);
    }
    return filtered.length;
  }

  refreshData() {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  /**
   * Deactivate only — never a hard delete, so existing user_actions history
   * referencing this action keeps resolving (Section 10 of the architecture
   * doc). Unlike Blog's deleteBlog(), there is no delete button at all here.
   */
  public async deactivateAction(action: ActionItem) {
    this.uiUtil.presentAlert(
      UI_MESSAGES.CONFIRM_HEADER,
      UI_MESSAGES.CONFIRM_DEACTIVATE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.TAKE_ACTION),
      [
        {
          text: UI_MESSAGES.CONFIRM_DEACTIVATE_PRIMARY_CTA,
          handler: async () => {
            const loader = await this.uiUtil.showLoader(
              UI_MESSAGES.DEACTIVATE_IN_PROGRESS.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.TAKE_ACTION)
            );
            this.actionService.deactivateAction(action.id).pipe(
              takeUntil(this.destroy$)
            ).subscribe(
              () => {
                loader.dismiss();
                this.uiUtil.presentToast(
                  UI_MESSAGES.SUCCESS_DEACTIVATE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.TAKE_ACTION),
                  'success'
                );
                this.loadData();
              },
              () => {
                loader.dismiss();
                this.uiUtil.presentToast(
                  UI_MESSAGES.FAILURE_DEACTIVATE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.TAKE_ACTION),
                  'error'
                );
              }
            );
          }
        },
        { text: UI_MESSAGES.CONFIRM_DEACTIVATE_SECONDARY_CTA, role: 'cancel' }
      ]
    );
  }

  viewActionDetails(action: ActionItem) {
    this.actionService.setViewEditModeAction(action);
    this.router.navigate(['take-action', 'edit'], { relativeTo: this.route, queryParams: { id: action.id } });
  }

  addNewAction() {
    this.router.navigate(['take-action', 'new'], { relativeTo: this.route });
  }
}
