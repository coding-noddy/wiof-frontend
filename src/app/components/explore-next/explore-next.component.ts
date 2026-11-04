import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ExploreItem } from 'src/app/models/RelatedContent';
import { ExploreSource, RelatedContentService } from 'src/app/services/related-content.service';

const TYPE_LABEL: Record<ExploreItem['type'], string> = {
  blog: 'Story',
  video: 'Video',
  action: 'Action'
};

interface ExploreGroupView {
  key: 'read' | 'act';
  title: string;
  icon: string;
  items: ExploreItem[];
}

/**
 * "Explore next" (Phase 2 step 4): related content for a blog, video,
 * action or calendar occasion, in two groups by intent — stories and videos
 * to keep reading, and actions to take (WIOF's read → act). On an action the
 * order flips: learn more about it first, then similar actions. Each group is
 * left out when empty; nothing renders when both are.
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

  groups$: Observable<ExploreGroupView[]> = of([]);
  private static count = 0;
  readonly headingId = `explore-next-${++ExploreNextComponent.count}`;

  constructor(private relatedContent: RelatedContentService) {}

  ngOnChanges(): void {
    if (!this.source) {
      this.groups$ = of([]);
      return;
    }
    const onAction = this.source.type === 'action';
    this.groups$ = this.relatedContent.exploreNext(this.source).pipe(
      map(({ read, act }) => {
        const readGroup: ExploreGroupView = { key: 'read', title: onAction ? 'Learn more' : 'Keep reading', icon: 'book-outline', items: read };
        const actGroup: ExploreGroupView = {
          key: 'act',
          title: onAction ? 'More actions like this' : 'Take action on this',
          icon: 'leaf-outline',
          items: act
        };
        return [readGroup, actGroup].filter((g) => g.items.length);
      })
    );
  }

  typeLabel(item: ExploreItem): string {
    return TYPE_LABEL[item.type];
  }
}
