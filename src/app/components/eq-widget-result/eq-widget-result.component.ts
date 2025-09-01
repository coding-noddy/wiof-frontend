import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-eq-widget-result',
  templateUrl: './eq-widget-result.component.html',
  styleUrls: ['./eq-widget-result.component.scss'],
  standalone: false
})
export class EqWidgetResultComponent implements OnInit {
  @Input() percent: any;
  @Input() msg: any;
  rotateValue: string;

  constructor() {}

  ngOnInit() {
    console.log(this.percent);
    this.setRotation(Number(this.percent));
  }

  setRotation(percent: number) {
    const degree = (180 / 100) * percent;
    this.rotateValue = `rotate(${degree}deg)`;
    console.log('rotation set to:', this.rotateValue);
  }
}
