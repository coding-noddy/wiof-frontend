import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
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
 * "Explore next" (Phase 2 step 4): related content for a blog, video,
 * action or calendar occasion, in two groups by intent — stories and videos
 * to keep reading, and actions to take (WIOF's read → act). On an action the
 * order flips: learn more about it first, then similar actions. Each group is
 * left out when empty; nothing renders when both are.
 *
 * On a page (not compact) actions show as full Take Action cards, so a
 * reader can mark one done right under the story, and the heading names
 * what the page is about ("Because you read about Veganism").
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

  constructor(private relatedContent: RelatedContentService) {}

  ngOnChanges(): void {
    this.heading = this.headingFor(this.source);
    if (!this.source) {
      this.view$ = of({ groups: [] });
      return;
    }
    const onAction = this.source.type === 'action';
    this.view$ = this.relatedContent.exploreNext(this.source).pipe(
      map(({ read, act }): ExploreView => {
        const readGroup: ExploreGroupView = { key: 'read', title: onAction ? 'Learn more' : 'Keep reading', icon: 'book-outline', items: read };
        const actGroup: ExploreGroupView = onAction
          ? { key: 'act', title: 'More actions like this', icon: 'leaf-outline', items: act }
          : { key: 'act', title: 'Your next step', subtitle: 'Small things you can do today', icon: 'leaf-outline', items: act };
        return { groups: [readGroup, actGroup].filter((g) => g.items.length) };
      }),
      startWith({ groups: null })
    );
  }

  /** The heading says what the page is about, when we know. */
  private headingFor(source: ExploreSource | null): string {
    if (this.compact || !source) return DEFAULT_HEADING;
    const topic = (source.subCategory || '').trim();
    if (source.type === 'blog') return topic ? `Because you read about ${topic}` : 'Because you read this story';
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

  typeLabel(item: ExploreItem): string {
    return TYPE_LABEL[item.type];
  }
}
