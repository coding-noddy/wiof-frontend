import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-social-share-home',
  templateUrl: './social-share-home.component.html',
  styleUrls: ['./social-share-home.component.scss']
})
export class SocialShareHomeComponent implements OnInit {
  title: string = 'Checkout this amazing website Worldisonefamily.com..!!';
  url: string = window.location.href;
  facebookLink: string = `https://www.facebook.com/100071449783619/`;
  linkedinLink: string = `https://www.linkedin.com/company/world-is-one-family?originalSubdomain=in`;
  instagramLink: string = `https://www.instagram.com/wiof_social`;
  whatsappShareLink: string = `https://api.whatsapp.com/send?text=${this.title} ${this.url}`;

  constructor() {}

  ngOnInit() {}
}
