import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ActionItem } from 'src/app/models/ActionItem';

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
  styleUrls: ['./take-action-detail.component.scss']
})
export class TakeActionDetailComponent {
  @Input() action: ActionItem;

  constructor(private modalCtrl: ModalController) {}

  close(): void {
    this.modalCtrl.dismiss();
  }
}
