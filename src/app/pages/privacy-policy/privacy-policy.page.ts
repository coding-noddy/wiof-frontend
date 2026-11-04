import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../../config.service';

@Component({
    selector: 'app-privacy-policy',
    templateUrl: './privacy-policy.page.html',
    styleUrls: ['./privacy-policy.page.scss'],
    standalone: false
})
export class PrivacyPolicyPage implements OnInit {
  constructor(private configService: ConfigService) {}

  ngOnInit() {
    // this.configService.getConfig("privacyPolicy").subscribe(data=>console.log(data));
  }
}
