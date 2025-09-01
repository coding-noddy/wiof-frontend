import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-eq-widget',
  templateUrl: './eq-widget.component.html',
  styleUrls: ['./eq-widget.component.scss'],
  standalone: false
})
export class EQWidgetComponent implements OnInit {
  showTest: boolean = false;
  constructor() {}

  ngOnInit() {}
  startTest() {
    this.showTest = true;
  }
}
