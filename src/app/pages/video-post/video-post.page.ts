import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { YoutubeVideoService } from '../../services/youtube-video.service';
import { Subject } from 'rxjs';
import { takeUntil, first } from 'rxjs/operators';
import { YOUTUBE_EMBED_VIDEO_LINK } from 'src/app/app.constants';
import { ActivityService } from 'src/app/services/activity.service';
import { AuthService } from 'src/app/services/auth.service';
import { VideoWatchCompleteEvent } from 'src/app/directives/youtube-watch-tracker.directive';

@Component({
  selector: 'app-video-post',
  templateUrl: './video-post.page.html',
  styleUrls: ['./video-post.page.scss']
})
export class VideoPostPage implements OnInit, OnDestroy {
  videoUrl: string = '';
  urlSafe: SafeResourceUrl;
  id: string;
  video: any;
  vid: any;
  videoTitle: string;
  videoChannelName: string;
  videoDescription: string;
  videoThumbnail: string = '';
  destroy$: Subject<boolean> = new Subject();
  showFullVideoDescription: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private videoService: YoutubeVideoService,
    private activityService: ActivityService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      if (params.has('videoId')) {
        this.id = params.get('videoId');
        this.videoUrl = YOUTUBE_EMBED_VIDEO_LINK.replace('VIDEO_ID', this.id);
        this.videoThumbnail = `https://img.youtube.com/vi/${this.id}/hqdefault.jpg`;
        this.urlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(
          this.videoUrl
        );
        this.videoService
          .getYoutubeVideo(this.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe((data) => {
            this.video = data;
            let { items } = this.video;

            items.map((itemData) => {
              this.vid = itemData;
              let { snippet } = this.vid;
              this.videoTitle = snippet.title;
              this.videoDescription = snippet.description;
              this.videoChannelName = snippet.title;
            });
          });

        // Log video page view for authenticated users (fire-and-forget)
        this.logVideoView(this.id);
      }
    });
  }

  private logVideoView(contentId: string): void {
    this.authService.isAuthenticated$.pipe(first()).subscribe(isAuth => {
      if (!isAuth) return;
      this.authService.currentUser$.pipe(first()).subscribe(user => {
        if (!user) return;
        this.activityService.logActivity({
          activityType: 'video_view',
          contentId,
          userId: user.uid
        }).catch(err => console.warn('Video view activity logging failed:', err));
      });
    });
  }

  /**
   * Handles the watchComplete event from YoutubeWatchTrackerDirective.
   */
  onWatchComplete(event: VideoWatchCompleteEvent): void {
    this.authService.currentUser$.pipe(first()).subscribe(user => {
      if (!user) return;
      this.activityService.logVideoWatchComplete(
        user.uid,
        event.contentId,
        event.watchPercent,
        event.videoTitle
      ).catch(err => console.warn('Video watch complete logging failed:', err));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  toggleVideoDescription() {
    this.showFullVideoDescription = !this.showFullVideoDescription;
  }
}
