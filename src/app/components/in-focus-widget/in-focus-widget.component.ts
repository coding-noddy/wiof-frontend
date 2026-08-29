import { Component, OnInit, Input } from '@angular/core';
import { InFocus } from 'src/app/models/InFocus';
import { AppUtilService } from 'src/app/util/AppUtilService';
import { ActivityService } from 'src/app/services/activity.service';
import { AuthService } from 'src/app/services/auth.service';
import { VideoWatchCompleteEvent } from 'src/app/directives/youtube-watch-tracker.directive';
import { first } from 'rxjs/operators';
import {
  IN_FOCUS_TITLE,
  COFFEE_CONV_SLIDER_OPTIONS
} from 'src/app/app.constants';

@Component({
  selector: 'app-in-focus-widget',
  templateUrl: './in-focus-widget.component.html',
  styleUrls: ['./in-focus-widget.component.scss']
})
export class InFocusWidgetComponent implements OnInit {
  @Input() element: string;
  @Input() inFocuses: InFocus[];
  @Input() inFocusTitle: string;
  slideOpts = COFFEE_CONV_SLIDER_OPTIONS;

  inFocusClass: string;

  constructor(
    private appUtilService: AppUtilService,
    private activityService: ActivityService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.appUtilService.stopVideos();
    this.inFocusClass = `wiof-${this.element}`;
    this.inFocusTitle = IN_FOCUS_TITLE[this.element];
  }

  onVideoWatchComplete(event: VideoWatchCompleteEvent): void {
    this.authService.currentUser$.pipe(first()).subscribe(user => {
      if (!user) return;
      this.activityService.logVideoWatchComplete(
        user.uid, event.contentId, event.watchPercent, event.videoTitle
      ).catch(err => console.warn('In Focus video watch logging failed:', err));
    });
  }

  //TODO setting dynamic title - Pending fron Naved
  setTitle(inFocusTitle: string) {
    this.inFocusTitle = inFocusTitle;
  }
}
