import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
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

import { SectionNavItem } from 'src/app/components/section-nav/section-nav.component';

@Component({
  selector: 'app-spirit',
  templateUrl: './spirit.page.html',
  styleUrls: ['./spirit.page.scss']
})
export class SpiritPage implements OnInit {
  blogs$: Observable<Blog[]>;
  videos$: Observable<Video[]>;
  inFocuses$: Observable<InFocus[]>;
  coffeeConversations$: Observable<CoffeeConversation[]>;
  elementName: string = ELEMENT_SELECT.SPIRIT;

  pageSections: SectionNavItem[] = [
    { label: 'Featured', sectionId: 'spirit-featured-video' },
    { label: 'In Focus', sectionId: 'spirit-in-focus' },
    { label: 'Conversations', sectionId: 'spirit-conversations' },
    { label: 'Blogs', sectionId: 'spirit-blogs' },
    { label: 'Videos', sectionId: 'spirit-videos' }
  ];

  constructor(
    private blogService: BlogService,
    private videoService: YoutubeVideoService,
    private coffeeConvService: CoffeeConversationService,
    private inFocusService: InFocusService
  ) {}

  ngOnInit() {
    this.blogs$ = this.blogService.getBlogs(ELEMENT_BLOG_CATEGORY.SPIRIT);
    this.videos$ = this.videoService.getYoutubePlaylist(
      ELEMENT_VIDEOS_PLAYLIST_ID.SPIRIT
    );
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
}
