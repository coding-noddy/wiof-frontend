import { Component, OnInit, ViewChild } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CoffeeConversationService } from 'src/app/services/coffee-conversation.service';
import { NgoInFocusService } from 'src/app/services/ngo-in-focus.service';
import { Observable } from 'rxjs';
import { CoffeeConversation } from 'src/app/models/CoffeeConversation';
import { NgoInFocus } from 'src/app/models/NgoInFocus';
import { CourseInFocusService } from 'src/app/services/course-in-focus.service';
import { CourseInFocus } from 'src/app/models/CourseInFocus';
import { NewsService } from 'src/app/services/news.service';
import { News } from 'src/app/models/News';
import { HomeJourneyPanelComponent } from 'src/app/components/home-journey-panel/home-journey-panel.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit, ViewWillEnter {
  viewConsentPopup = true;
  coffeeConversations$: Observable<CoffeeConversation[]>;
  ngosInFocus$: Observable<NgoInFocus[]>;
  coursesInFocus$: Observable<CourseInFocus[]>;
  newsList$: Observable<News[]>;

  // Static: false — the panel is rendered unconditionally, not behind an
  // *ngIf, so it exists by the time ngAfterViewInit (and ionViewWillEnter,
  // which fires after) runs.
  @ViewChild(HomeJourneyPanelComponent) journeyPanel?: HomeJourneyPanelComponent;

  constructor(
    private newsService: NewsService,
    private coffeeConversationService: CoffeeConversationService,
    private ngoService: NgoInFocusService,
    private courseService: CourseInFocusService
  ) {}

  ngOnInit(): void {
    const privacyConsentAccepted = localStorage.getItem(
      'privacyConsentAccepted'
    );
    this.viewConsentPopup = privacyConsentAccepted !== 'true';
    this.newsList$ = this.newsService.getAllNews();
    this.coffeeConversations$ = this.coffeeConversationService.getCoffeeConversations();
    this.ngosInFocus$ = this.ngoService.getActiveNgosInFocus();
    this.coursesInFocus$ = this.courseService.getCoursesInFocus();
  }

  /**
   * Ionic keeps this page alive in the nav stack rather than destroying it
   * on back-navigation, so ngOnInit doesn't re-run on return — without this,
   * saving a blog elsewhere and coming back to home showed a stale saved
   * count until a full page reload. ionViewWillEnter fires every time this
   * page becomes active again, including the very first entry (same
   * pattern as my-library.page.ts's own ionViewWillEnter).
   */
  ionViewWillEnter(): void {
    this.journeyPanel?.refresh();
  }

  onAccept(): void {
    this.viewConsentPopup = false;
    localStorage.setItem('privacyConsentAccepted', 'true');
  }

  scrollToElements(): void {
    const el = document.querySelector('app-life-elements');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
