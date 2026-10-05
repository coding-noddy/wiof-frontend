import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ModalController } from '@ionic/angular';
import { SubscribePanelService } from 'src/app/services/subscribe-panel.service';
import { FeedbackDialogComponent } from 'src/app/components/feedback-dialog/feedback-dialog.component';
import { buildModalZoomAnimation } from 'src/app/util/modal-zoom-animation';

declare const require: any;

@Component({
  selector: 'app-wiof-footer',
  templateUrl: './wiof-footer.component.html',
  styleUrls: ['./wiof-footer.component.scss']
})
export class WiofFooterComponent implements OnInit {
  currentYear = new Date().getFullYear();
  appVersion: string = require('../../../../package.json').version;
  envLabel = environment.production ? 'prod' : 'staging';
  wiofLogo = '../../../assets/brand/logos/WIOF-full-logo.png';

  // Moved here from the old floating app-social-share sidebar (removed
  // sitewide — a position:fixed/absolute rail with a hardcoded vertical
  // offset had no safe universal position across every page's differently-
  // shaped hero, and kept overlapping headline/body text). The footer is
  // normal document flow, so it can never overlap page content.
  facebookLink = 'https://www.facebook.com/100071449783619/';
  linkedinLink = 'https://www.linkedin.com/company/world-is-one-family?originalSubdomain=in';
  instagramLink = 'https://www.instagram.com/wiof_social';
  whatsappShareLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    "Checkout this amazing website Worldisonefamily.com..!! " + window.location.href
  )}`;

  constructor(
    private subscribePanel: SubscribePanelService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {}

  openNewsletter(): void {
    this.subscribePanel.open();
  }

  async openFeedback(event?: MouseEvent): Promise<void> {
    const originRect = (event?.currentTarget as HTMLElement)?.getBoundingClientRect();
    const modal = await this.modalCtrl.create({
      component: FeedbackDialogComponent,
      cssClass: 'feedback-modal',
      backdropDismiss: true,
      enterAnimation: (baseEl) => buildModalZoomAnimation(baseEl, originRect, false),
      leaveAnimation: (baseEl) => buildModalZoomAnimation(baseEl, originRect, true)
    });
    await modal.present();
  }
}

