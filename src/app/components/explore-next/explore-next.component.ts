import { Component, EventEmitter, Input, OnChanges, Optional, Output, SimpleChanges } from '@angular/core';
import { shortTitle } from 'src/app/models/NextForYou';
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

const HEADING_TITLE_LENGTH = 48;
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Why a card is shown, in a few words above it (8.10.0), so the reader sees
 * how it connects to what they just read: an admin's link, the same topic
 * (the story's own topic), or more from the element.
 */
export function exploreReason(item: ExploreItem, sourceType?: ExploreSource['type']): string {
  if (item.reason === 'linked') return 'Picked by our team';
  if (item.reason === 'similar') {
    if (item.type === 'action') return sourceType === 'video' ? 'Goes with this video' : 'Goes with this story';
    const topic = headingTopic(item.blog?.subCategory);
    return topic ? `Also about ${topic}` : 'On a similar topic';
  }
  const element = item.type === 'action' ? item.action?.elementIds?.[0] || item.element : item.element;
  return element ? `More in ${capitalise(element)}` : 'You might like';
}

interface ExploreItemView {
  item: ExploreItem;
  why: string;
}

interface ExploreGroupView {
  key: 'read' | 'act';
  title: string;
  subtitle?: string;
  icon: string;
  items: ExploreItemView[];
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
  /** The story's or video's title, for the heading (a video's arrives after the page). */
  @Input() sourceTitle: string | null = null;
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

  ngOnChanges(changes: SimpleChanges = {}): void {
    this.heading = this.headingFor(this.source);
    // A title arriving later only changes the heading.
    if (changes['sourceTitle'] && !changes['source'] && Object.keys(changes).length === 1) return;
    if (!this.source) {
      this.view$ = of({ groups: [] });
      return;
    }
    this.view$ = this.relatedContent.exploreNext(this.source).pipe(
      map(({ read, act }): ExploreView => {
        const view = (items: ExploreItem[]) => items.map((item) => ({ item, why: exploreReason(item, this.source?.type) }));
        const readGroup: ExploreGroupView = { key: 'read', title: 'Keep reading', icon: 'book-outline', items: view(read) };
        const actGroup: ExploreGroupView = {
          key: 'act',
          title: 'Your next step',
          subtitle: this.compact ? undefined : 'Pick one to try',
          icon: 'leaf-outline',
          items: view(act)
        };
        return { groups: [readGroup, actGroup].filter((g) => g.items.length) };
      }),
      startWith({ groups: null })
    );
  }

  /** The heading says what the page is about, when we know. */
  private headingFor(source: ExploreSource | null): string {
    if (this.compact || !source) return DEFAULT_HEADING;
    const title = (this.sourceTitle || '').trim();
    if (title && (source.type === 'blog' || source.type === 'video')) {
      return `Because you ${source.type === 'blog' ? 'read' : 'watched'} “${shortTitle(title, HEADING_TITLE_LENGTH)}”`;
    }
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
    return !this.compact && group.key === 'act' && group.items.every(({ item }) => !!item.action);
  }

  /** On a page, stories and videos are the same cards as on the element pages. */
  asSiteCards(group: ExploreGroupView): boolean {
    return !this.compact && group.key === 'read' && group.items.every(({ item }) => !!(item.blog || (item.video && item.element)));
  }

  typeLabel(item: ExploreItem): string {
    return TYPE_LABEL[item.type];
  }
}
