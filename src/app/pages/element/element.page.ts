import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import {
  ELEMENT_VIDEOS_PLAYLIST_ID,
  PAGE_CATEGORY_MAP,
} from 'src/app/app.constants';
import { CoffeeConversation } from 'src/app/models/CoffeeConversation';
import { Blog } from '../../models/Blog';
import { Video } from '../../models/Video';
import { BlogService } from 'src/app/services/blog.service';
import { CoffeeConversationService } from 'src/app/services/coffee-conversation.service';
import { YoutubeVideoService } from 'src/app/services/youtube-video.service';
import { InFocus } from 'src/app/models/InFocus';
import { InFocusService } from 'src/app/services/in-focus.service';

@Component({
  selector: 'app-element',
  templateUrl: './element.page.html',
  styleUrls: ['./element.page.scss'],
})
export class ElementPage implements OnInit {
  elementId: string;
  blogs$: Observable<Blog[]>;
  videos$: Observable<Video[]>;
  inFocuses$: Observable<InFocus[]>;
  coffeeConversations$: Observable<CoffeeConversation[]>;

  get elementName(): string {
    return this.elementId;
  }

  get subscribePage(): string {
    return this.elementId === 'fire' ? 'energy' : this.elementId;
  }

  get welcomeImageClass(): string {
    return `${this.elementId}-welcome-img`;
  }

  constructor(
    private route: ActivatedRoute,
    private blogService: BlogService,
    private videoService: YoutubeVideoService,
    private coffeeConvService: CoffeeConversationService,
    private inFocusService: InFocusService
  ) {}

  ngOnInit() {
    this.elementId = this.route.snapshot.paramMap.get('element') || '';
    const categoryKey = this.elementId === 'fire' ? 'energy' : this.elementId;
    const category = PAGE_CATEGORY_MAP[categoryKey];

    this.blogs$ = this.blogService.getBlogs(category);
    this.videos$ = this.videoService.getYoutubePlaylist(
      ELEMENT_VIDEOS_PLAYLIST_ID[this.elementId.toUpperCase()]
    );
    this.coffeeConversations$ = this.coffeeConvService.getCoffeeConversations(
      category
    );
    this.inFocuses$ = this.inFocusService.getActiveInFocuses(category);
  }
}

