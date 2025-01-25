import { Component, OnInit } from '@angular/core';
import { CoffeeConversationService } from 'src/app/services/coffee-conversation.service';
import { NgoInFocusService } from 'src/app/services/ngo-in-focus.service';
import { Observable } from 'rxjs';
import { CoffeeConversation } from 'src/app/models/CoffeeConversation';
import { NgoInFocus } from 'src/app/models/NgoInFocus';
import { CourseInFocusService } from 'src/app/services/course-in-focus.service';
import { CourseInFocus } from 'src/app/models/courseInFocus';
import { NewsService } from 'src/app/services/news.service';
import { News } from 'src/app/models/News';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit {
  viewConsentPopup = true;
  coffeeConversations$: Observable<CoffeeConversation[]>;
  ngosInFocus$: Observable<NgoInFocus[]>;
  coursesInFocus$: Observable<CourseInFocus[]>;
  newsList$: Observable<News[]>;

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

  onAccept(): void {
    this.viewConsentPopup = false;
    localStorage.setItem('privacyConsentAccepted', 'true');
  }
}
