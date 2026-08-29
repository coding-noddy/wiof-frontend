import { Component, Input, OnInit } from '@angular/core';
import { NgoInFocus } from 'src/app/models/NgoInFocus';
import { COFFEE_CONV_SLIDER_OPTIONS } from 'src/app/app.constants';
import { ActivityService } from 'src/app/services/activity.service';
import { AuthService } from 'src/app/services/auth.service';
import { VideoWatchCompleteEvent } from 'src/app/directives/youtube-watch-tracker.directive';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-ngo-in-focus',
  templateUrl: './ngo-in-focus.component.html',
  styleUrls: ['./ngo-in-focus.component.scss']
})
export class NgoInFocusComponent implements OnInit {
  @Input() ngosInFocus: Array<NgoInFocus>;
  slideOpts = COFFEE_CONV_SLIDER_OPTIONS;
  selectedNgo: NgoInFocus | null = null;

  constructor(
    private activityService: ActivityService,
    private authService: AuthService
  ) {}

  ngOnInit() {}

  openModal(ngo: NgoInFocus) {
    this.selectedNgo = ngo;
  }

  closeModal() {
    this.selectedNgo = null;
  }

  onVideoWatchComplete(event: VideoWatchCompleteEvent): void {
    this.authService.currentUser$.pipe(first()).subscribe(user => {
      if (!user) return;
      this.activityService.logVideoWatchComplete(
        user.uid, event.contentId, event.watchPercent, event.videoTitle
      ).catch(err => console.warn('NGO in Focus video watch logging failed:', err));
    });
  }
}
