import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Video } from 'src/app/models/Video';
import { YoutubeVideoService } from 'src/app/services/youtube-video.service';
import {
  ELEMENT_VIDEOS_PLAYLIST_ID,
  PAGE_CATEGORY_MAP
} from 'src/app/app.constants';
import { ActivatedRoute } from '@angular/router';
import { SearchBoxComponent } from 'src/app/components/search-box/search-box.component';
import { searchItems, searchTerms } from 'src/app/util/text-search';

@Component({
  selector: 'app-videos',
  templateUrl: './videos.page.html',
  styleUrls: ['./videos.page.scss']
})
export class VideosPage implements OnInit, OnDestroy {
  @ViewChild('searchBox') searchBox: SearchBoxComponent;

  // null while loading.
  videosList: Video[] | null = null;
  category: string;
  element: string;

  // YouTube playlist items only carry a title, so search is title-only.
  searchQuery = '';
  searchResults: Video[] = [];

  private destroy$ = new Subject<void>();
  private elementChange$ = new Subject<void>();

  constructor(
    private videoService: YoutubeVideoService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params.has('element')) {
        const element = params.get('element');
        this.category = PAGE_CATEGORY_MAP[element];
        this.element = element;
        this.loadVideos(ELEMENT_VIDEOS_PLAYLIST_ID[element]);
      }
    });
  }

  private loadVideos(playlistId: string): void {
    // Switching element via the pills reuses this component — drop the old
    // element's in-flight load and search.
    this.elementChange$.next();
    this.videosList = null;
    this.searchBox?.clear();
    // Full playlist (paged), not just the first 25, so the grid — and the
    // search over it — includes older videos too.
    this.videoService
      .getAllPlaylistVideos(playlistId)
      .pipe(takeUntil(this.elementChange$), takeUntil(this.destroy$))
      .subscribe((videos) => {
        this.videosList = videos;
        this.applySearch();
      });
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.applySearch();
  }

  get isSearching(): boolean {
    return searchTerms(this.searchQuery).length > 0;
  }

  private applySearch(): void {
    this.searchResults = searchItems(this.videosList || [], this.searchQuery, (v) => v.title, () => []);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
