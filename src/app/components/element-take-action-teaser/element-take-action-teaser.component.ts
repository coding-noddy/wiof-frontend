import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActionItem } from 'src/app/models/ActionItem';
import { ActionService } from 'src/app/services/action.service';

/**
 * "Small shifts, real impact" teaser shown on each element page — surfaces
 * up to 4 Firestore-backed actions tagged to this element (Section 13: show
 * 2-4 relevant actions) as real interactive cards, and links through to the
 * full element Take Action page for more.
 */
@Component({
  selector: 'app-element-take-action-teaser',
  templateUrl: './element-take-action-teaser.component.html',
  styleUrls: ['./element-take-action-teaser.component.scss']
})
export class ElementTakeActionTeaserComponent implements OnChanges, OnDestroy {
  @Input() element: string;

  actions: ActionItem[] = [];
  private sub: Subscription | null = null;

  constructor(private actionService: ActionService) {}

  ngOnChanges(): void {
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = null;
    }
    if (!this.element) {
      this.actions = [];
      return;
    }
    this.sub = this.actionService
      .getActionsForElement(this.element.toLowerCase(), 4)
      .subscribe((actions) => {
        this.actions = actions;
      });
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
