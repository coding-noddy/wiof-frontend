import { Component, Input, OnInit } from '@angular/core';
import { NgoInFocus } from 'src/app/models/NgoInFocus';
import { COFFEE_CONV_SLIDER_OPTIONS } from 'src/app/app.constants';

@Component({
  selector: 'app-ngo-in-focus',
  templateUrl: './ngo-in-focus.component.html',
  styleUrls: ['./ngo-in-focus.component.scss']
})
export class NgoInFocusComponent implements OnInit {
  @Input() ngosInFocus: Array<NgoInFocus>;
  slideOpts = COFFEE_CONV_SLIDER_OPTIONS;
  selectedNgo: NgoInFocus | null = null;

  constructor() {}

  ngOnInit() {}

  openModal(ngo: NgoInFocus) {
    this.selectedNgo = ngo;
  }

  closeModal() {
    this.selectedNgo = null;
  }
}
