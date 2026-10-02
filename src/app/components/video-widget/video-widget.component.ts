import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { YOUTUBE_EMBED_VIDEO_LINK } from '../../app.constants';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AppUtilService } from 'src/app/util/AppUtilService';
import { ActivityService } from 'src/app/services/activity.service';
import { AuthService } from 'src/app/services/auth.service';
import { HeroVideoService } from 'src/app/services/hero-video.service';
import { VideoWatchCompleteEvent } from 'src/app/directives/youtube-watch-tracker.directive';
import { Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-video-widget',
  templateUrl: './video-widget.component.html',
  styleUrls: ['./video-widget.component.scss']
})
export class VideoWidgetComponent implements OnInit, OnDestroy {
  @Input() element: string;
  videoPlayerTitle: string;
  videoLink: string;
  urlSafe: SafeResourceUrl;
  videoPlayerClass: string;

  private destroy$ = new Subject<void>();

  constructor(
    private sanitizer: DomSanitizer,
    private appUtilService: AppUtilService,
    private activityService: ActivityService,
    private authService: AuthService,
    private heroVideoService: HeroVideoService
  ) {}

  ngOnInit() {
    this.appUtilService.stopVideos();
    this.videoPlayerClass = `wiof-${this.element}`;
    // Admin-managed (Admin → Hero Videos), falling back to the built-in
    // default. The iframe only renders once this resolves, so it loads
    // once rather than loading the default and then swapping.
    this.heroVideoService
      .getHeroVideoForWidget(this.element)
      .pipe(takeUntil(this.destroy$))
      .subscribe((video) => {
        this.videoPlayerTitle = video.title;
        this.videoLink = video.videoId;
        this.urlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(
          YOUTUBE_EMBED_VIDEO_LINK.replace('VIDEO_ID', video.videoId)
        );
      });
  }

  onVideoWatchComplete(event: VideoWatchCompleteEvent): void {
    this.authService.currentUser$.pipe(first()).subscribe(user => {
      if (!user) return;
      this.activityService.logVideoWatchComplete(
        user.uid, event.contentId, event.watchPercent, event.videoTitle
      ).catch(err => console.warn('Video widget watch logging failed:', err));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
