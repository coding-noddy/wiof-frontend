import { Component, ViewChild, HostListener, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ELEMENT_BLOG_CATEGORY,
  ELEMENT_SELECT,
  ELEMENT_VIDEOS_PLAYLIST_ID
} from 'src/app/app.constants';
import { BlogService } from 'src/app/services/blog.service';
import { YoutubeVideoService } from 'src/app/services/youtube-video.service';
import { Blog } from '../../models/Blog';
import { Video } from '../../models/Video';
import { VideoWidgetComponent } from '../../components/video-widget/video-widget.component';
import { CoffeeConversationService } from 'src/app/services/coffee-conversation.service';
import { CoffeeConversation } from 'src/app/models/CoffeeConversation';
import { InFocus } from 'src/app/models/InFocus';
import { InFocusService } from 'src/app/services/in-focus.service';

import { SectionNavItem } from 'src/app/components/section-nav/section-nav.component';

@Component({
  selector: 'app-air',
  templateUrl: './air.page.html',
  styleUrls: ['./air.page.scss']
})
export class AirPage implements OnInit {
  @ViewChild(VideoWidgetComponent) videoWidgetRef: VideoWidgetComponent;

  blogs$: Observable<Blog[]>;
  videos$: Observable<Video[]>;
  inFocuses$: Observable<InFocus[]>;
  coffeeConversations$: Observable<CoffeeConversation[]>;
  elementName: string = ELEMENT_SELECT.AIR;

  pageSections: SectionNavItem[] = [
    { label: 'Featured', sectionId: 'air-featured-video' },
    { label: 'In Focus', sectionId: 'air-in-focus' },
    { label: 'Conversations', sectionId: 'air-conversations' },
    { label: 'Blogs', sectionId: 'air-blogs' },
    { label: 'Videos', sectionId: 'air-videos' }
  ];

  constructor(
    private blogService: BlogService,
    private videoService: YoutubeVideoService,
    private coffeeConvService: CoffeeConversationService,
    private inFocusService: InFocusService
  ) {}

  ngOnInit() {
    this.blogs$ = this.blogService.getBlogs(ELEMENT_BLOG_CATEGORY.AIR);
    this.videos$ = this.videoService.getYoutubePlaylist(
      ELEMENT_VIDEOS_PLAYLIST_ID.AIR
    );
    this.coffeeConversations$ = this.coffeeConvService.getCoffeeConversations(
      ELEMENT_BLOG_CATEGORY.AIR
    );
    this.inFocuses$ = this.inFocusService.getActiveInFocuses(
      ELEMENT_BLOG_CATEGORY.AIR
    );
  }
}
