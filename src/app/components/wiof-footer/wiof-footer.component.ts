import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { SubscribePanelService } from 'src/app/services/subscribe-panel.service';

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
  wiofLogo = '../../../assets/logo.png';

  constructor(private subscribePanel: SubscribePanelService) {}

  ngOnInit() {}

  openNewsletter(): void {
    this.subscribePanel.open();
  }
}

