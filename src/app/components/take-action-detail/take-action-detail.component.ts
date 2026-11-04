import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ActionItem } from 'src/app/models/ActionItem';
import { ExploreSource } from 'src/app/services/related-content.service';

/**
 * Full-detail modal for one action — description, instructions, evidence,
 * safety/accessibility notes. Previously this content lived in an inline
 * expand on TakeActionCardComponent, which got cramped in a multi-column
 * grid once an action carried real safety/evidence content; a modal scales
 * better and matches this app's existing info-panel pattern (see
 * EnvCalDialogComponent) instead of inventing a new one.
 */
@Component({
    selector: 'app-take-action-detail',
    templateUrl: './take-action-detail.component.html',
    styleUrls: ['./take-action-detail.component.scss'],
    standalone: false
})
export class TakeActionDetailComponent implements OnInit {
  @Input() action: ActionItem;
  /** The element page the modal was opened from, for links and the fallback. */
  @Input() element?: string;
  exploreSource: ExploreSource;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit(): void {
    const elements = this.action.elementIds || [];
    this.exploreSource = {
      type: 'action',
      id: this.action.id,
      links: this.action.relatedContent,
      element: elements.includes(this.element) ? this.element : elements[0]
    };
  }

  close(): void {
    this.modalCtrl.dismiss();
  }
}
