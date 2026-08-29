import { Component, Input, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { COFFEE_CONV_SLIDER_OPTIONS } from 'src/app/app.constants';
import { CoffeeConversation } from 'src/app/models/CoffeeConversation';
import { AppUtilService } from 'src/app/util/AppUtilService';
import { ActivityService } from 'src/app/services/activity.service';
import { AuthService } from 'src/app/services/auth.service';
import { VideoWatchCompleteEvent } from 'src/app/directives/youtube-watch-tracker.directive';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-coffee-conversation',
  templateUrl: './coffee-conversation.component.html',
  styleUrls: ['./coffee-conversation.component.scss']
})
export class CoffeeConversationComponent
  implements OnInit, OnDestroy, OnChanges {
  @Input() coffeeConvList: Array<CoffeeConversation>;
  @Input() element: string;
  @Input() fromHomePage: boolean;
  showAboutInterviewee = false;

  slideOpts = COFFEE_CONV_SLIDER_OPTIONS;
  coffeeConvClass: string;

  constructor(
    private appUtilService: AppUtilService,
    private activityService: ActivityService,
    private authService: AuthService
  ) {}

  ngOnChanges() {
    if (this.coffeeConvList) {
      this.coffeeConvList.sort((a, b) => a.interviewDate - b.interviewDate);
      if(this.fromHomePage){
        this.coffeeConvList = this.coffeeConvList.slice(this.coffeeConvList.length - 1);
      }
    }
  }

  showIntervieweeDetails(event, value) {
    event.preventDefault();
    event.stopPropagation();
    this.showAboutInterviewee = value;
  }

  ngOnInit() {
    this.coffeeConvClass = this.element ? `wiof-${this.element}` : '';
  }

  onVideoWatchComplete(event: VideoWatchCompleteEvent): void {
    this.authService.currentUser$.pipe(first()).subscribe(user => {
      if (!user) return;
      this.activityService.logVideoWatchComplete(
        user.uid, event.contentId, event.watchPercent, event.videoTitle
      ).catch(err => console.warn('Coffee conv video watch logging failed:', err));
    });
  }

  ngOnDestroy(): void {
    this.appUtilService.stopVideos();
  }
}
