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
  selector: 'app-water',
  templateUrl: './water.page.html',
  styleUrls: ['./water.page.scss']
})
export class WaterPage implements OnInit {
  blogs$: Observable<Blog[]>;
  videos$: Observable<Video[]>;
  inFocuses$: Observable<InFocus[]>;
  coffeeConversations$: Observable<CoffeeConversation[]>;
  elementName: string = ELEMENT_SELECT.WATER;

  pageSections: SectionNavItem[] = [
    { label: 'Featured', sectionId: 'water-featured-video' },
    { label: 'In Focus', sectionId: 'water-in-focus' },
    { label: 'Conversations', sectionId: 'water-conversations' },
    { label: 'Blogs', sectionId: 'water-blogs' },
    { label: 'Videos', sectionId: 'water-videos' }
  ];

  constructor(
    private blogService: BlogService,
    private videoService: YoutubeVideoService,
    private coffeeConvService: CoffeeConversationService,
    private inFocusService: InFocusService
  ) {}

  ngOnInit() {
    this.blogs$ = this.blogService.getBlogs(ELEMENT_BLOG_CATEGORY.WATER);
    this.videos$ = this.videoService.getYoutubePlaylist(
      ELEMENT_VIDEOS_PLAYLIST_ID.WATER
    );
    this.coffeeConversations$ = this.coffeeConvService.getCoffeeConversations(
      ELEMENT_BLOG_CATEGORY.WATER
    );
    this.inFocuses$ = this.inFocusService.getActiveInFocuses(
      ELEMENT_BLOG_CATEGORY.WATER
    );

    this.blogs$.subscribe(blogs => {
      const item = this.pageSections.find(s => s.sectionId === 'water-blogs');
      if (item) item.disabled = !blogs || blogs.length === 0;
    });
    this.videos$.subscribe(videos => {
      const item = this.pageSections.find(s => s.sectionId === 'water-videos');
      if (item) item.disabled = !videos || videos.length === 0;
    });
  }
}
