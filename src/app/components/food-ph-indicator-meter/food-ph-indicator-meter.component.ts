import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-food-ph-indicator-meter',
  templateUrl: './food-ph-indicator-meter.component.html',
  styleUrls: ['./food-ph-indicator-meter.component.scss'],
  standalone: false
})
export class FoodPhIndicatorMeterComponent implements OnInit {
  @Input() food: any;
  message: string;

  constructor() {}

  ngOnInit() {
    this.updatePhPointer();
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

  // generateMessage(){
  //   if(!this.food){
  //     this.message="Please select a food to find its pH value."
  //   }
  //   else if(this.food){
  //     this.message=`ph Level of ${this.food.name} is ${this.food.value}`;
  //   }
  // }
}
