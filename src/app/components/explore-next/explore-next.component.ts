import { Component, EventEmitter, Input, OnChanges, Optional, Output } from '@angular/core';
import { SuggestionTrackingService } from 'src/app/services/suggestion-tracking.service';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { ExploreItem } from 'src/app/models/RelatedContent';
import { ExploreSource, RelatedContentService } from 'src/app/services/related-content.service';

const TYPE_LABEL: Record<ExploreItem['type'], string> = {
  blog: 'Story',
  video: 'Video',
  action: 'Action'
};

const DEFAULT_HEADING = 'Explore next';
// Longer "topics" are usually a title pasted into the field, which reads badly in the heading.
const MAX_TOPIC_WORDS = 3;
const MAX_TOPIC_LENGTH = 28;

/**
 * A blog's sub-category as it reads in "Because you read about …": each
 * word capitalised ("Khalsa aid" → "Khalsa Aid", "AQI" unchanged), or null
 * when it's blank or too long to be a topic.
 */
export function headingTopic(subCategory: string | null | undefined): string | null {
  const words = String(subCategory || '').trim().split(/\s+/).filter(Boolean);
  const topic = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return words.length && words.length <= MAX_TOPIC_WORDS && topic.length <= MAX_TOPIC_LENGTH ? topic : null;
}

interface ExploreGroupView {
  key: 'read' | 'act';
  title: string;
  subtitle?: string;
  icon: string;
  items: ExploreItem[];
}

/** `groups` is null while loading. */
interface ExploreView {
  groups: ExploreGroupView[] | null;
}

/**
 * "Explore next" (Phase 2 step 4): related content for a blog or video page
 * or a calendar occasion, in two groups by intent — stories and videos to
 * keep reading, and actions to take (WIOF's read → act). Each group is left
 * out when empty; nothing renders when both are. (An action's details show
 * one "story behind this" line instead: RelatedContentService.storyBehind.)
 *
 * On a page (not compact) every item is the site's own card: stories and
 * videos as on the element pages, actions as Take Action cards (so a reader
 * can mark one done right under the story). The heading names what the page
 * is about ("Because you read about Veganism").
 */
@Component({
    selector: 'app-explore-next',
    templateUrl: './explore-next.component.html',
    styleUrls: ['./explore-next.component.scss'],
    standalone: false
})
export class ExploreNextComponent implements OnChanges {
  @Input() source: ExploreSource;
  /** Smaller cards in one column, for modals. */
  @Input() compact = false;
  /** Emitted when a card is opened, so a modal can close itself. */
  @Output() navigate = new EventEmitter<void>();

  view$: Observable<ExploreView> = of({ groups: [] });
  heading = DEFAULT_HEADING;
  private static count = 0;
  readonly headingId = `explore-next-${++ExploreNextComponent.count}`;

  constructor(
    private relatedContent: RelatedContentService,
    @Optional() private suggestions?: SuggestionTrackingService
  ) {}

  /**
   * A click that opens or acts on a suggestion: a link, a card that links
   * itself (the story and video cards are ion-cards with an href), or an
   * action card's buttons. Sharing or bookmarking it isn't following it.
   */
  picked(event: Event, item: ExploreItem, index: number): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest || target.closest('app-bookmark-icon, .blog-share-icon, [aria-label^="Share"]')) return;
    if (target.closest('a[href], ion-card[href], button')) {
      this.suggestions?.clicked('explore_next', item, index + 1);
    }
  }

  ngOnChanges(): void {
    this.heading = this.headingFor(this.source);
    if (!this.source) {
      this.view$ = of({ groups: [] });
      return;
    }
    this.view$ = this.relatedContent.exploreNext(this.source).pipe(
      map(({ read, act }): ExploreView => {
        const readGroup: ExploreGroupView = { key: 'read', title: 'Keep reading', icon: 'book-outline', items: read };
        const actGroup: ExploreGroupView = {
          key: 'act',
          title: 'Your next step',
          subtitle: 'Small things you can do today',
          icon: 'leaf-outline',
          items: act
        };
        return { groups: [readGroup, actGroup].filter((g) => g.items.length) };
      }),
      startWith({ groups: null })
    );
  }

  /** The heading says what the page is about, when we know. */
  private headingFor(source: ExploreSource | null): string {
    if (this.compact || !source) return DEFAULT_HEADING;
    if (source.type === 'blog') {
      const topic = headingTopic(source.subCategory);
      return topic ? `Because you read about ${topic}` : 'Because you read this story';
    }
    if (source.type === 'video') return 'Because you watched this video';
    return DEFAULT_HEADING;
  }

  /** Element colour for the section's tint. */
  get accent(): string {
    const element = (this.source?.element || '').toLowerCase();
    return element === 'earth' || element === 'energy' ? element : 'teal';
  }

  /** On a page, actions are full Take Action cards (with Mark as Done). */
  asActionCards(group: ExploreGroupView): boolean {
    return !this.compact && group.key === 'act' && group.items.every((item) => !!item.action);
  }

  /** On a page, stories and videos are the same cards as on the element pages. */
  asSiteCards(group: ExploreGroupView): boolean {
    return !this.compact && group.key === 'read' && group.items.every((item) => !!(item.blog || (item.video && item.element)));
  }

  typeLabel(item: ExploreItem): string {
    return TYPE_LABEL[item.type];
  }
}
