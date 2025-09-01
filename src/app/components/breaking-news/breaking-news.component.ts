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
  styleUrls: ['./breaking-news.component.scss'],
  standalone: false
})
export class BreakingNewsComponent implements OnChanges {
  @Input() newsList: Array<News>;
  videoSliderClass: string;
  slideOpts = BREAKING_NEWS_SLIDER_OPTIONS;

  constructor(
    private sanitizer: DomSanitizer,
    private appUtilService: AppUtilService
  ) {}

  ngOnChanges() {
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

  stopVideos() {
    this.appUtilService.stopVideos();
  }
}
