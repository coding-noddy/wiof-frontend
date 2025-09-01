import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-concent-popup',
  templateUrl: './concent-popup.component.html',
  styleUrls: ['./concent-popup.component.scss'],
  exportAs: 'concentPopup',
  standalone: false
})
export class ConcentPopupComponent implements OnInit {
  @Output() accepted = new EventEmitter();
  read: boolean = false;
  constructor() {}

  ngOnInit() {}
  onAccept() {
    this.read = true;
    this.accepted.emit('concentAccepted');
  }
}
