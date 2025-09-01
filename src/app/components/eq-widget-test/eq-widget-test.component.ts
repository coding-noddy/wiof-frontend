import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-eq-widget-test',
  templateUrl: './eq-widget-test.component.html',
  styleUrls: ['./eq-widget-test.component.scss'],
  standalone: false
})
export class EqWidgetTestComponent implements OnInit {
  @Input() gpr: string[]; //gender, parameter, result
  food: any = 'nothing';

  firstBlockWidth: string;
  secondBlockWidth: string;
  thirdBlockWidth: string;
  arrowPositionBracket: string;
  message: string;

  constructor() {}

  ngOnInit() {
    // this.updatePhPointer();
    this.updateRanges();
    this.positionArrow();

    // this.generateMessage();
  }

  ngOnChanges() {
    this.updatePhPointer();
    // this.generateMessage();
  }

  updatePhPointer() {
    if (this.food.name === 'Default') {
      this.message = 'Please select a food to find its pH value.';
      return 'ph7';
    } else {
      this.message = `ph Level of ${this.food.name} is ${this.food.value}`;
      return `ph${this.food.value}`;
    }
  }

  positionArrow() {
    this.arrowPositionBracket = 'calc(' + this.gpr[2] + '% - 5px)';
  }

  blockWidths = {
    m: {
      '1': ['52.5%', '27.5%', '20%'],
      '2': ['60%', '27.5%', '12.5%'],
      '3': ['62.5%', '25%', '12.5%']
    },
    f: {
      '1': ['57.5%', '27.5%', '15%'],
      '2': ['57.5%', '30%', '12.5%'],
      '3': ['57.5%', '27.5%', '15%']
    }
  };

  updateRanges() {
    const blockWidth = this.blockWidths[this.gpr[0]][this.gpr[1]];
    this.firstBlockWidth = blockWidth[0];
    this.secondBlockWidth = blockWidth[1];
    this.thirdBlockWidth = blockWidth[2];
  }
}
