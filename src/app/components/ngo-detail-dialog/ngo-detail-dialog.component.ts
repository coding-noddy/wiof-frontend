import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { NgoInFocus } from 'src/app/models/NgoInFocus';

/**
 * Full-image detail modal for one NGO — previously a plain *ngIf overlay
 * div on NgoInFocusComponent with no open/close animation. Pulled out into
 * its own ModalController-presented component so it can use the same
 * zoom-from-click-origin animation as every other modal in the app (see
 * EnvCalDialogComponent / TakeActionDetailComponent).
 */
@Component({
  selector: 'app-ngo-detail-dialog',
  templateUrl: './ngo-detail-dialog.component.html',
  styleUrls: ['./ngo-detail-dialog.component.scss']
})
export class NgoDetailDialogComponent {
  @Input() ngo: NgoInFocus;

  constructor(private modalCtrl: ModalController) {}

  close(): void {
    this.modalCtrl.dismiss();
  }
}
