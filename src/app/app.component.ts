import { Component, OnInit } from '@angular/core';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Meta, MetaDefinition } from '@angular/platform-browser';
import { Platform } from '@ionic/angular';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { ActivityService } from './services/activity.service';
import { AuthService } from './services/auth.service';
import { UserProfileService } from './services/user-profile.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private metaService: Meta,
    private authService: AuthService,
    private userProfileService: UserProfileService,
    private activityService: ActivityService
  ) {
    this.initializeApp();
    // this.addMetaTags();
  }

  ngOnInit(): void {
    // Record a visit whenever the authenticated account changes.
    this.authService.currentUser$.pipe(
      filter(user => !!user),
      distinctUntilChanged((previous, current) => previous?.uid === current?.uid)
    ).subscribe(user => {
      this.userProfileService.recordVisit(user!.uid).catch(err => {
        console.warn('Visit recording failed:', err);
      });
      // New daily visit activity log
      this.activityService.logDailyVisit(user!.uid).catch(err => {
        console.warn('Daily visit logging failed:', err);
      });
    });
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
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
