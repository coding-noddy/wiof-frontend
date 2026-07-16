import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-food-ph-indicator-meter',
  templateUrl: './food-ph-indicator-meter.component.html',
  styleUrls: ['./food-ph-indicator-meter.component.scss']
})
export class FoodPhIndicatorMeterComponent implements OnInit {
  @Input() food: any;
  message: string;

  constructor() {}

  ngOnInit() {
    this.updatePhPointer();
  }

  ngOnChanges() {
    this.updatePhPointer();
  }

  get foodStatus(): string {
    if (!this.food || this.food.name === 'Default') {
      return 'Neutral';
    }
    return this.food.value < 7
      ? 'Acidic'
      : this.food.value === 7
      ? 'Neutral'
      : 'Alkaline';
  }

  get foodStatusClass(): string {
    return this.foodStatus.toLowerCase() + '-badge';
  }

  updatePhPointer() {
    if (!this.food || this.food.name === 'Default') {
      this.message = 'Please select a food to find its pH value.';
      return 'ph7';
    } else {
      this.message = `pH level of ${this.food.name} is ${this.food.value}`;
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
