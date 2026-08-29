import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { throwError, Subject } from 'rxjs';
import { catchError, map, takeUntil, switchMap } from 'rxjs/operators';
import { Blog } from 'src/app/models/Blog';
import { BlogService } from 'src/app/services/blog.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { UI_MESSAGES, ITEMS } from 'src/app/app.constants';

@Component({
  selector: 'app-manage-blog',
  templateUrl: './manage-blog.page.html',
  styleUrls: ['./manage-blog.page.scss']
})
export class ManageBlogPage implements OnInit, OnDestroy {
  destroy$: Subject<boolean> = new Subject();

  // Data
  allBlogs: Blog[] = [];
  displayedBlogs: Blog[] = [];

  // Sorting
  sortColumn = 'submitDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Filter
  filterCategory = '';
  filterAuthor = '';
  availableAuthors: string[] = [];
  openDropdown = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Summary
  summary = { total: 0, earth: 0, water: 0, air: 0, fire: 0, spirit: 0 };

  constructor(
    private blogService: BlogService,
    private uiUtil: UiUtilService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.blogService.getBlogs().pipe(
      takeUntil(this.destroy$),
      catchError((err) => throwError(err))
    ).subscribe(blogList => {
      this.allBlogs = blogList;
      this.availableAuthors = [...new Set(blogList.map(b => b.author).filter(a => a))].sort();
      this.computeSummary(blogList);
      this.applyFilterSortPaginate();
    });
  }

  private computeSummary(list: Blog[]) {
    this.summary = { total: list.length, earth: 0, water: 0, air: 0, fire: 0, spirit: 0 };
    list.forEach(b => {
      const cat = (b.category || '').toLowerCase();
      if (this.summary.hasOwnProperty(cat)) this.summary[cat]++;
    });
  }

  applyFilterSortPaginate() {
    let filtered = [...this.allBlogs];

    // Filters
    if (this.filterCategory) {
      filtered = filtered.filter(b => (b.category || '').toLowerCase() === this.filterCategory);
    }
    if (this.filterAuthor) {
      filtered = filtered.filter(b => b.author === this.filterAuthor);
    }

    // Sort
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

    // Paginate
    this.totalPages = Math.ceil(filtered.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.displayedBlogs = filtered.slice(start, start + this.pageSize);
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
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
    this.filterCategory = '';
    this.filterAuthor = '';
    this.onFilterChange();
  }

  get hasActiveFilters(): boolean {
    return !!(this.filterCategory || this.filterAuthor);
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
    let filtered = this.allBlogs;
    if (this.filterCategory) {
      filtered = filtered.filter(b => (b.category || '').toLowerCase() === this.filterCategory);
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

  public async deleteBlog(index: number, blogId: string, blogImage: string) {
    this.uiUtil.presentAlert(
      UI_MESSAGES.CONFIRM_HEADER,
      UI_MESSAGES.CONFIRM_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.BLOG),
      [
        {
          text: UI_MESSAGES.CONFIRM_DELETE_PRIMARY_CTA,
          handler: async () => {
            const loader = await this.uiUtil.showLoader(
              UI_MESSAGES.DELETE_IN_PROGRESS.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.BLOG)
            );
            this.blogService.deleteBlogImage(blogImage).pipe(
              takeUntil(this.destroy$),
              switchMap(() => this.blogService.deleteBlog(blogId))
            ).subscribe(
              () => {
                loader.dismiss();
                this.uiUtil.presentToast(
                  UI_MESSAGES.SUCCESS_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.BLOG),
                  'success'
                );
                this.loadData();
              },
              () => {
                loader.dismiss();
                this.uiUtil.presentToast(
                  UI_MESSAGES.FAILURE_DELETE_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.BLOG),
                  'error'
                );
              }
            );
          }
        },
        { text: UI_MESSAGES.CONFIRM_DELETE_SECONDARY_CTA, role: 'cancel' }
      ]
    );
  }

  viewBlogDetails(blog: Blog) {
    this.blogService.setViewEditModeBlog(blog);
    this.router.navigate(['blog', 'edit'], { relativeTo: this.route, queryParams: { id: blog.id } });
  }

  addNewBlog() {
    this.router.navigate(['blog', 'new'], { relativeTo: this.route });
  }
}
