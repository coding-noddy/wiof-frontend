import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ExploreItem } from 'src/app/models/RelatedContent';
import { ExploreSource, RelatedContentService } from 'src/app/services/related-content.service';

const TYPE_LABEL: Record<ExploreItem['type'], string> = {
  blog: 'Story',
  video: 'Video',
  action: 'Action'
};

/**
 * "Explore next" (Phase 2 step 4): up to four cards linking a blog, video,
 * action or calendar occasion to related content, with "more from this
 * element" filling the gaps. Renders nothing when there's nothing to show.
 */
@Component({
    selector: 'app-explore-next',
    templateUrl: './explore-next.component.html',
    styleUrls: ['./explore-next.component.scss'],
    standalone: false
})
export class ExploreNextComponent implements OnChanges {
  @Input() source: ExploreSource;
  @Input() max = 4;
  /** Smaller cards in one column, for modals. */
  @Input() compact = false;
  /** Emitted when a card is opened, so a modal can close itself. */
  @Output() navigate = new EventEmitter<void>();

  items$: Observable<ExploreItem[]> = of([]);
  private static count = 0;
  readonly headingId = `explore-next-${++ExploreNextComponent.count}`;

  constructor(private relatedContent: RelatedContentService) {}

  ngOnChanges(): void {
    this.items$ = this.source ? this.relatedContent.exploreNext(this.source, this.max) : of([]);
  }

  typeLabel(item: ExploreItem): string {
    return TYPE_LABEL[item.type];
  }

  /** "Explore next", or "More from Earth" when nothing is linked yet. */
  heading(items: ExploreItem[]): string {
    const element = this.source?.element;
    if (element && items.every((i) => i.reason === 'element')) {
      return `More from ${element.charAt(0).toUpperCase()}${element.slice(1)}`;
    }
    return 'Explore next';
  }
}
