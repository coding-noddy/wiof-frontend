import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, first, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { CoffeeConversation } from 'src/app/models/CoffeeConversation';
import { JOURNEY_ELEMENTS } from 'src/app/models/Journey';
import { VideoWatchCompleteEvent } from 'src/app/directives/youtube-watch-tracker.directive';
import { ActivityService } from 'src/app/services/activity.service';
import { AuthService } from 'src/app/services/auth.service';
import { CoffeeConversationService } from 'src/app/services/coffee-conversation.service';
import { PageTrackingService } from 'src/app/services/page-tracking.service';
import { ExploreSource } from 'src/app/services/related-content.service';
import { AppUtilService } from 'src/app/util/AppUtilService';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { shareLink } from 'src/app/util/share-link';

const ELEMENT_SLUGS = new Set<string>(JOURNEY_ELEMENTS.map((e) => e.slug));

/** The element a conversation belongs to (its category), or null. */
export function conversationElement(cc: Pick<CoffeeConversation, 'category'> | null | undefined): string | null {
  const slug = String(cc?.category || '').trim().toLowerCase();
  return ELEMENT_SLUGS.has(slug) ? slug : null;
}

/** The guest's name, or null when the conversation has none ("NA" in the admin form). */
export function conversationGuest(cc: Pick<CoffeeConversation, 'intervieweeName'> | null | undefined): string | null {
  const name = String(cc?.intervieweeName || '').trim();
  return name && name.toUpperCase() !== 'NA' ? name : null;
}

interface ConversationView {
  cc: CoffeeConversation;
  element: string | null;
  guest: string | null;
  thumbnail: string;
  explore: ExploreSource;
}

/**
 * A Coffee Conversation's own page (8.12.0): the video, the topic, the
 * guest and the full description, with save (♡) and share, and Explore
 * next underneath. Conversations used to live only inside the sliders on
 * the home and element pages, so they couldn't be saved or shared. Shared
 * links get a proper preview: socialMetaTags (functions) serves
 * /conversation/** to crawlers.
 */
@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.page.html',
  styleUrls: ['./conversation.page.scss'],
  standalone: false
})
export class ConversationPage implements OnInit, OnDestroy {
  view$: Observable<ConversationView | null | 'missing'> = of(null);
  showGuest = false;

  constructor(
    private route: ActivatedRoute,
    private conversations: CoffeeConversationService,
    private authService: AuthService,
    private activityService: ActivityService,
    private pageTracking: PageTrackingService,
    private uiUtil: UiUtilService,
    private appUtil: AppUtilService
  ) {}

  ngOnInit(): void {
    this.view$ = this.route.paramMap.pipe(
      map((params) => params.get('id') || ''),
      switchMap((id) => (id ? this.conversations.getCoffeeConversation(id) : of(null))),
      map((cc): ConversationView | 'missing' => {
        if (!cc) return 'missing';
        const element = conversationElement(cc);
        return {
          cc,
          element,
          guest: conversationGuest(cc),
          thumbnail: `https://img.youtube.com/vi/${cc.videoLink}/hqdefault.jpg`,
          // As a video, so admins' links to its YouTube video show here too.
          explore: { type: 'video', id: cc.videoLink, element: element || undefined }
        };
      }),
      tap((view) => this.pageTracking.setContentTitle(view !== 'missing' ? view.cc.topic : null)),
      catchError(() => of('missing' as const)),
      shareReplay(1)
    );
  }

  async share(view: ConversationView): Promise<void> {
    const by = view.guest ? ` — a conversation with ${view.guest}` : '';
    await shareLink({ title: view.cc.topic, text: `${view.cc.topic}${by} | World is One Family`, url: window.location.href }, this.uiUtil);
  }

  /** Watching the video most of the way counts, under its YouTube ID (the server checks it). */
  onWatchComplete(event: VideoWatchCompleteEvent): void {
    this.authService.currentUser$.pipe(first()).subscribe((user) => {
      if (!user) return;
      this.activityService
        .logVideoWatchComplete(user.uid, event.contentId, event.watchPercent, event.videoTitle)
        .catch((err) => console.warn('Conversation watch logging failed:', err));
    });
  }

  ngOnDestroy(): void {
    this.appUtil.stopVideos();
  }
}
