import { Component, OnInit, Input } from '@angular/core';
import {
  VIDEO_PLAYER_TITLES,
  VIDEO_PLAYER_VIDEOS,
  YOUTUBE_EMBED_VIDEO_LINK
} from '../../app.constants';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AppUtilService } from 'src/app/util/AppUtilService';
import { ActivityService } from 'src/app/services/activity.service';
import { AuthService } from 'src/app/services/auth.service';
import { VideoWatchCompleteEvent } from 'src/app/directives/youtube-watch-tracker.directive';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-video-widget',
  templateUrl: './video-widget.component.html',
  styleUrls: ['./video-widget.component.scss']
})
export class VideoWidgetComponent implements OnInit {
  @Input() element: string;
  videoPlayerTitle: string;
  videoLink: string;
  urlSafe: SafeResourceUrl;
  videoPlayerClass: string;

  constructor(
    private sanitizer: DomSanitizer,
    private appUtilService: AppUtilService,
    private activityService: ActivityService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.appUtilService.stopVideos();
    this.videoPlayerClass = `wiof-${this.element}`;
    this.setPlayerTitle();
    this.setVideoLink();
    this.urlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(
      YOUTUBE_EMBED_VIDEO_LINK.replace('VIDEO_ID', this.videoLink)
    );
  }

  setPlayerTitle() {
    this.videoPlayerTitle = VIDEO_PLAYER_TITLES[this.element.toUpperCase()];
  }

  setVideoLink() {
    this.videoLink = VIDEO_PLAYER_VIDEOS[this.element.toUpperCase()];
  }

  onVideoWatchComplete(event: VideoWatchCompleteEvent): void {
    this.authService.currentUser$.pipe(first()).subscribe(user => {
      if (!user) return;
      this.activityService.logVideoWatchComplete(
        user.uid, event.contentId, event.watchPercent, event.videoTitle
      ).catch(err => console.warn('Video widget watch logging failed:', err));
    });
  }
}
