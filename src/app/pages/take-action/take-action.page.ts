import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActionItem } from 'src/app/models/ActionItem';
import { UserAction } from 'src/app/models/UserAction';
import { ActionService } from 'src/app/services/action.service';
import { UserActionService } from 'src/app/services/user-action.service';
import { AuthService } from 'src/app/services/auth.service';
import { searchItems, searchTerms } from 'src/app/util/text-search';

interface ElementTab {
  element: string;
  actions: ActionItem[];
}

/** Same order as LifeElementsComponent (home page / element page switcher),
 *  which now also drives the "Browse by Element" pills here — kept in sync
 *  manually since LifeElementsComponent's order is a literal array, not an
 *  exported constant. */
const ELEMENT_TAB_ORDER = ['air', 'energy', 'water', 'earth', 'spirit'];

@Component({
  selector: 'app-take-action',
  templateUrl: './take-action.page.html',
  styleUrls: ['./take-action.page.scss']
})
export class TakeActionPage implements OnInit, OnDestroy {
  destroy$: Subject<boolean> = new Subject();

  isLoading = true;
  allActions: ActionItem[] = [];
  featuredActions: ActionItem[] = [];
  elementTabs: ElementTab[] = [];
  categories: string[] = [];
  selectedCategory = '';
  categoryFilteredActions: ActionItem[] = [];

  // Client-side search over the already-loaded catalogue — no extra
  // Firestore reads. While a query is active, results replace the
  // Featured/Browse sections.
  searchQuery = '';
  searchResults: ActionItem[] = [];

  // Air is first in the canonical element order (ELEMENT_TAB_ORDER, same as
  // LifeElementsComponent's order) — default the tab to it, not Earth.
  selectedElement = ELEMENT_TAB_ORDER[0];

  isAuthenticated = false;
  private userId: string | null = null;
  myActionsLoading = false;
  recentlyCompleted: UserAction[] = [];

  constructor(
    private route: ActivatedRoute,
    private actionService: ActionService,
    private userActionService: UserActionService,
    private authService: AuthService
  ) {
    const urlArray = this.route.snapshot['_routerState'].url.split('/');
    this.selectedElement = urlArray[2] || ELEMENT_TAB_ORDER[0];
  }

  ngOnInit() {
    this.actionService.getActiveActions().pipe(takeUntil(this.destroy$)).subscribe((actions) => {
      this.allActions = actions;
      this.featuredActions = actions.filter((a) => a.isFeatured).slice(0, 4);
      this.buildElementTabs(actions);
      this.buildCategories(actions);
      this.applySearch();
      this.isLoading = false;
    });

    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.isAuthenticated = !!user;
      this.userId = user?.uid || null;
      this.loadMyActions();
    });
  }

  private buildElementTabs(actions: ActionItem[]): void {
    this.elementTabs = ELEMENT_TAB_ORDER.map((element) => ({
      element,
      actions: actions.filter((a) => (a.elementIds || []).includes(element))
    }));
  }

  private buildCategories(actions: ActionItem[]): void {
    const set = new Set<string>();
    actions.forEach((a) => (a.categories || []).forEach((c) => set.add(c)));
    this.categories = Array.from(set).sort();
    this.applyCategory();
  }

  selectCategory(category: string): void {
    this.selectedCategory = this.selectedCategory === category ? '' : category;
    this.applyCategory();
  }

  private applyCategory(): void {
    this.categoryFilteredActions = this.selectedCategory
      ? this.allActions.filter((a) => (a.categories || []).includes(this.selectedCategory))
      : this.allActions;
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.applySearch();
  }

  get isSearching(): boolean {
    return searchTerms(this.searchQuery).length > 0;
  }

  /** Every query word must appear in the action's title, short description,
   *  tags, categories, or elements. Title matches sort first. */
  private applySearch(): void {
    this.searchResults = searchItems(
      this.allActions,
      this.searchQuery,
      (a) => a.title,
      (a) => [a.shortDescription, ...(a.tags || []), ...(a.categories || []), ...(a.elementIds || [])]
    );
  }

  selectElement(element: string): void {
    this.selectedElement = element;
  }

  get activeElementTab(): ElementTab | undefined {
    return this.elementTabs.find((t) => t.element === this.selectedElement);
  }

  private loadMyActions(): void {
    if (!this.isAuthenticated || !this.userId) {
      this.recentlyCompleted = [];
      return;
    }
    this.myActionsLoading = true;
    this.userActionService
      .getUserActionHistory(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((history) => {
        this.myActionsLoading = false;
        this.recentlyCompleted = history.filter((h) => h.status === 'COMPLETE').slice(0, 6);
      });
  }

  getActionTitle(actionId: string): string {
    return this.allActions.find((a) => a.id === actionId)?.title || actionId;
  }

  get completedCount(): number {
    return this.recentlyCompleted.length;
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
