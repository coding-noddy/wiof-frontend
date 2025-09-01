import { Component, OnInit, Input } from '@angular/core';
import {
  VIDEO_PLAYER_TITLES,
  VIDEO_PLAYER_VIDEOS,
  YOUTUBE_EMBED_VIDEO_LINK
} from '../../app.constants';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AppUtilService } from 'src/app/util/AppUtilService';

@Component({
  selector: 'app-video-widget',
  templateUrl: './video-widget.component.html',
  styleUrls: ['./video-widget.component.scss'],
  standalone: false
})
export class VideoWidgetComponent implements OnInit {
  @Input() element: string;
  videoPlayerTitle: string;
  videoLink: string;
  urlSafe: SafeResourceUrl;
  videoPlayerClass: string;

  constructor(
    private sanitizer: DomSanitizer,
    private appUtilService: AppUtilService
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
}
