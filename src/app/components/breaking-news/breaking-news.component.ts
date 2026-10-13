import { Component, Input, OnChanges } from '@angular/core';
import {
  BREAKING_NEWS_SLIDER_OPTIONS,
  YOUTUBE_EMBED_VIDEO_LINK
} from 'src/app/app.constants';
import { News } from 'src/app/models/News';
import { DomSanitizer } from '@angular/platform-browser';
import { AppUtilService } from 'src/app/util/AppUtilService';

@Component({
  selector: 'app-breaking-news',
  templateUrl: './breaking-news.component.html',
  styleUrls: ['./breaking-news.component.scss']
})
export class BreakingNewsComponent implements OnChanges {
  @Input() newsList: Array<News>;
  videoSliderClass: string;
  slideOpts = BREAKING_NEWS_SLIDER_OPTIONS;
  /**
   * Slides whose image/video has been allowed to load. Only the current
   * slide and its neighbours load, so a visitor who never swipes doesn't
   * download every story's full-size image (up to HOME_BREAKING_NEWS_LIMIT).
   */
  private loadedSlides = new Set<number>();

  constructor(
    private sanitizer: DomSanitizer,
    private appUtilService: AppUtilService
  ) {}

  ngOnChanges() {
    this.loadedSlides.clear();
    this.onSlideChange(0);
    if (this.newsList) {
      this.newsList.sort((a, b) => (a.date > b.date ? -1 : 1));
      this.newsList.forEach((news) => {
        if (news.mediaType === 'video') {
          news.sanitizedLink = this.sanitizer.bypassSecurityTrustResourceUrl(
            YOUTUBE_EMBED_VIDEO_LINK.replace('VIDEO_ID', news.mediaLink)
          );
        }
      });
    }
  }

  onSlideChange(index: number) {
    const count = this.newsList?.length || 0;
    if (!count) {
      return;
    }
    // Neighbours both ways: the slider loops, so "previous" from the first
    // story is the last one.
    for (const offset of [-1, 0, 1]) {
      this.loadedSlides.add((index + offset + count) % count);
    }
  }

  isLoaded(index: number): boolean {
    return this.loadedSlides.has(index);
  }

  stopVideos() {
    this.appUtilService.stopVideos();
  }
}
