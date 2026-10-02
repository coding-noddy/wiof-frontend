import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BlogService } from 'src/app/services/blog.service';
import { PAGE_CATEGORY_MAP } from 'src/app/app.constants';
import { Blog } from 'src/app/models/Blog';
import { SearchBoxComponent } from 'src/app/components/search-box/search-box.component';
import { searchItems, searchTerms } from 'src/app/util/text-search';

interface OtherElementMatch {
  blog: Blog;
  element: string;
}

@Component({
  selector: 'app-blogs',
  templateUrl: './blogs.page.html',
  styleUrls: ['./blogs.page.scss']
})
export class BlogsPage implements OnInit, OnDestroy {
  @ViewChild('searchBox') searchBox: SearchBoxComponent;

  // null while loading.
  blogList: Blog[] | null = null;
  category: string = '';
  element: string;

  // Search filters the already-loaded blogs for this element. Matches from
  // the other elements are a fallback for "I read it somewhere but forget
  // where" — every blog is fetched once, lazily, on the first search only.
  searchQuery = '';
  searchResults: Blog[] = [];
  otherElementResults: OtherElementMatch[] = [];
  otherElementsLoading = false;
  private allBlogs: Blog[] | null = null;

  private destroy$ = new Subject<void>();
  private elementChange$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private blogService: BlogService
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params.has('element')) {
        this.category = PAGE_CATEGORY_MAP[params.get('element')];
        this.element = params.get('element');
        this.loadBlogs();
      }
    });
  }

  private loadBlogs(): void {
    // Switching element via the pills reuses this component — drop the old
    // element's in-flight load and search.
    this.elementChange$.next();
    this.blogList = null;
    this.searchBox?.clear();
    this.blogService
      .getBlogs(this.category)
      .pipe(takeUntil(this.elementChange$), takeUntil(this.destroy$))
      .subscribe((blogs) => {
        this.blogList = blogs;
        this.applySearch();
      });
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.applySearch();
    if (this.isSearching && !this.allBlogs && !this.otherElementsLoading) {
      this.loadAllBlogs();
    }
  }

  get isSearching(): boolean {
    return searchTerms(this.searchQuery).length > 0;
  }

  private loadAllBlogs(): void {
    this.otherElementsLoading = true;
    this.blogService
      .getBlogs()
      .pipe(takeUntil(this.destroy$))
      .subscribe((blogs) => {
        this.allBlogs = blogs;
        this.otherElementsLoading = false;
        this.applySearch();
      });
  }

  /** Every query word must appear in the title, short description, author,
   *  or sub-category. Title matches sort first. */
  private applySearch(): void {
    const fields = (b: Blog) => [b.shortDescription, b.author, b.subCategory];
    this.searchResults = searchItems(this.blogList || [], this.searchQuery, (b) => b.title, fields);
    this.otherElementResults = searchItems(
      (this.allBlogs || []).filter((b) => b.category !== this.category),
      this.searchQuery,
      (b) => b.title,
      fields
    )
      .map((blog) => ({ blog, element: this.elementForCategory(blog.category) }))
      .filter((m) => !!m.element);
  }

  private elementForCategory(category: string): string | undefined {
    return Object.keys(PAGE_CATEGORY_MAP).find((key) => PAGE_CATEGORY_MAP[key] === category);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
