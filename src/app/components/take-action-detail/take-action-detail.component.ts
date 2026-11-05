import { Component, Input, OnInit, Optional } from '@angular/core';
import { SuggestionTrackingService } from 'src/app/services/suggestion-tracking.service';
import { ModalController } from '@ionic/angular';
import { Observable, of } from 'rxjs';
import { ActionItem } from 'src/app/models/ActionItem';
import { ExploreItem } from 'src/app/models/RelatedContent';
import { RelatedContentService } from 'src/app/services/related-content.service';

/**
 * Full-detail modal for one action — description, instructions, evidence,
 * safety/accessibility notes. Previously this content lived in an inline
 * expand on TakeActionCardComponent, which got cramped in a multi-column
 * grid once an action carried real safety/evidence content; a modal scales
 * better and matches this app's existing info-panel pattern (see
 * EnvCalDialogComponent) instead of inventing a new one.
 *
 * The modal is for deciding to do the action, so it doesn't carry a full
 * Explore next block (browsing other actions is the Take Action page's job):
 * just one line to the story behind it, when there's a real match.
 */
@Component({
    selector: 'app-take-action-detail',
    templateUrl: './take-action-detail.component.html',
    styleUrls: ['./take-action-detail.component.scss'],
    standalone: false
})
export class TakeActionDetailComponent implements OnInit {
  @Input() action: ActionItem;
  /** The element page the modal was opened from, for the story link. */
  @Input() element?: string;
  storyBehind$: Observable<ExploreItem | null> = of(null);

  constructor(
    private modalCtrl: ModalController,
    private relatedContent: RelatedContentService,
    @Optional() private suggestions?: SuggestionTrackingService
  ) {}

  storyPicked(story: ExploreItem): void {
    this.suggestions?.clicked('story_behind', story, 1);
  }

  ngOnInit(): void {
    const elements = this.action.elementIds || [];
    const element = elements.includes(this.element) ? this.element : elements[0];
    this.storyBehind$ = this.relatedContent.storyBehind(this.action, element);
  }

  close(): void {
    this.modalCtrl.dismiss();
  }
}
