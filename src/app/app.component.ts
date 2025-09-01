import { Component } from '@angular/core';
import { Meta, MetaDefinition } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  constructor(
    private metaService: Meta
  ) {
    // this.addMetaTags();
  }

  addMetaTags() {
    this.metaService.addTag({
      name: 'description',
      content:
        'An ancient Indian idea of Vasudhaiva Kutumbakam (The entire world is one family) is the need of the hour for this planet. We are here with one and only one purpose, to awaken, inform and encourage people to come together to make a difference to their lives and the lives of many others less fortunate so as to add meaning to their lives.'
    });

    this.metaService.addTag({
      property: 'og:title',
      content: 'World Is One Family'
    });
    this.metaService.addTag({
      property: 'og:description',
      content:
        'A socio-environmental platform based on Indian idea of Vasudhaiva Kutumbakam (The entire world is one family).'
    });
    this.metaService.addTag({
      property: 'og:image',
      content: 'https://worldisonefamily.com/wiof_message.jpg'
    });
    this.metaService.addTag({
      property: 'og:url',
      content: 'https://worldisonefamily.com/home'
    });
    this.metaService.addTag({
      property: 'twitter:card',
      content: 'summary_large_image'
    });
  }

  // To do

  // <!--  Non-Essential, But Recommended -->
  // //
  // <meta property="og:site_name" content="European Travel, Inc.">
  // <meta name="twitter:image:alt" content="Alt text for image">

  // <!--  Non-Essential, But Required for Analytics -->

  // <meta property="fb:app_id" content="your_app_id" />
  // <meta name="twitter:site" content="@website-username">

  // <meta property="fb:admins" content="703492,100001554670066">
  // <meta property="fb:page_id" content="21281155105">
  // <meta property="fb:app_id" content="174477382631902">
}
