import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import {
  ELEMENT_BLOG_CATEGORY,
  ELEMENT_SELECT,
  ELEMENT_VIDEOS_PLAYLIST_ID
} from 'src/app/app.constants';
import { CoffeeConversation } from 'src/app/models/CoffeeConversation';
import { BlogService } from 'src/app/services/blog.service';
import { CoffeeConversationService } from 'src/app/services/coffee-conversation.service';
import { YoutubeVideoService } from 'src/app/services/youtube-video.service';
import { Blog } from '../../models/Blog';
import { Video } from '../../models/Video';
import { InFocus } from 'src/app/models/InFocus';
import { InFocusService } from 'src/app/services/in-focus.service';

import { SectionNavComponent, SectionNavItem } from 'src/app/components/section-nav/section-nav.component';

@Component({
    selector: 'app-spirit',
    templateUrl: './spirit.page.html',
    styleUrls: ['./spirit.page.scss'],
    standalone: false
})
export class SpiritPage implements OnInit {
  @ViewChild(SectionNavComponent) sectionNav?: SectionNavComponent;

  blogs$: Observable<Blog[]>;
  videos$: Observable<Video[]>;
  inFocuses$: Observable<InFocus[]>;
  coffeeConversations$: Observable<CoffeeConversation[]>;
  elementName: string = ELEMENT_SELECT.SPIRIT;

  pageSections: SectionNavItem[] = [
    { label: 'Featured', sectionId: 'spirit-featured-video' },
    { label: 'Take Action', sectionId: 'spirit-take-action' },
    { label: 'In Focus', sectionId: 'spirit-in-focus' },
    { label: 'Conversations', sectionId: 'spirit-conversations' },
    { label: 'Blogs', sectionId: 'spirit-blogs' },
    { label: 'Videos', sectionId: 'spirit-videos' }
  ];

  constructor(
    private blogService: BlogService,
    private videoService: YoutubeVideoService,
    private coffeeConvService: CoffeeConversationService,
    private inFocusService: InFocusService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.blogs$ = this.blogService.getBlogSummaries(ELEMENT_BLOG_CATEGORY.SPIRIT).pipe(shareReplay(1));
    this.videos$ = this.videoService.getYoutubePlaylist(
      ELEMENT_VIDEOS_PLAYLIST_ID.SPIRIT
    ).pipe(shareReplay(1));
    this.coffeeConversations$ = this.coffeeConvService.getCoffeeConversations(
      ELEMENT_BLOG_CATEGORY.SPIRIT
    );
    this.inFocuses$ = this.inFocusService.getActiveInFocuses(
      ELEMENT_BLOG_CATEGORY.SPIRIT
    );

    this.blogs$.subscribe(blogs => {
      const item = this.pageSections.find(s => s.sectionId === 'spirit-blogs');
      if (item) item.disabled = !blogs || blogs.length === 0;
    });
    this.videos$.subscribe(videos => {
      const item = this.pageSections.find(s => s.sectionId === 'spirit-videos');
      if (item) item.disabled = !videos || videos.length === 0;
    });
  }

  /**
   * Links to the EQ check (#eq-assessment) scroll to it. The page scrolls
   * inside ion-content, so the router's anchor scrolling (window) can't.
   */
  ionViewDidEnter() {
    const fragment = this.route.snapshot.fragment;
    if (fragment) setTimeout(() => document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }

  onContentScroll() {
    this.sectionNav?.handleScroll();
  }
}
