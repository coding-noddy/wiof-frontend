import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-social-share-home',
  templateUrl: './social-share-home.component.html',
  styleUrls: ['./social-share-home.component.scss'],
  standalone: false
})
export class SocialShareHomeComponent implements OnInit {
  title: string = 'Checkout this amazing website Worldisonefamily.com..!!';
  url: string = window.location.href;
  facebookShareLink: string = `https://www.facebook.com/sharer.php?u=${this.url}`;
  // https://www.linkedin.com/shareArticle?url=[post-url]&title=[post-title]
  linkedinShareLink: string = `https://www.linkedin.com/shareArticle?url=${this.url}&title=${this.title}`;
  twitterShareLink: string = `https://twitter.com/share?url=${this.url}&text=${this.title}`;
  whatsappShareLink: string = `https://api.whatsapp.com/send?text=${this.title} ${this.url}`;

  constructor() {}

  ngOnInit() {}
}
