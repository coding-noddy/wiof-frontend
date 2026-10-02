import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { NgoInFocus } from 'src/app/models/NgoInFocus';
import { COFFEE_CONV_SLIDER_OPTIONS } from 'src/app/app.constants';
import { ActivityService } from 'src/app/services/activity.service';
import { AuthService } from 'src/app/services/auth.service';
import { VideoWatchCompleteEvent } from 'src/app/directives/youtube-watch-tracker.directive';
import { first } from 'rxjs/operators';
import { NgoDetailDialogComponent } from 'src/app/components/ngo-detail-dialog/ngo-detail-dialog.component';
import { buildModalZoomAnimation } from 'src/app/util/modal-zoom-animation';

@Component({
  selector: 'app-ngo-in-focus',
  templateUrl: './ngo-in-focus.component.html',
  styleUrls: ['./ngo-in-focus.component.scss']
})
export class NgoInFocusComponent implements OnInit {
  @Input() ngosInFocus: Array<NgoInFocus>;
  slideOpts = COFFEE_CONV_SLIDER_OPTIONS;

  constructor(
    private activityService: ActivityService,
    private authService: AuthService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {}

  async openModal(ngo: NgoInFocus, event?: MouseEvent): Promise<void> {
    const originEl = event?.currentTarget as HTMLElement;
    const originRect = originEl?.getBoundingClientRect();

    const modal = await this.modalCtrl.create({
      component: NgoDetailDialogComponent,
      componentProps: { ngo },
      cssClass: 'ngo-detail-modal',
      backdropDismiss: true,
      enterAnimation: (baseEl) => buildModalZoomAnimation(baseEl, originRect, false),
      leaveAnimation: (baseEl) => buildModalZoomAnimation(baseEl, originRect, true)
    });
    await modal.present();
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
