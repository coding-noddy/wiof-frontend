import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-social-share',
  templateUrl: './social-share.component.html',
  styleUrls: ['./social-share.component.scss']
})
export class SocialShareComponent implements OnInit {
  // @Input() title:string="Get to know more at WorldIsOneFamily.com";
  title: string = 'See what I found on Worldisonefamily.com..!!';
  url: string = window.location.href;
  facebookShareLink: string = `https://www.facebook.com/sharer.php?u=${this.url}`;
  // https://www.linkedin.com/shareArticle?url=[post-url]&title=[post-title]
  linkedinShareLink: string = `https://www.linkedin.com/shareArticle?url=${this.url}&title=${this.title}`;
  // linkedinShareLink: string =`https://www.linkedin.com/company/world-is-one-family?originalSubdomain=in`;
  twitterShareLink: string = `https://twitter.com/share?url=${this.url}&text=${this.title}`;
  whatsappShareLink: string = `https://api.whatsapp.com/send?text=${this.title} ${this.url}`;

  constructor() {}

  ngOnInit() {}
}
