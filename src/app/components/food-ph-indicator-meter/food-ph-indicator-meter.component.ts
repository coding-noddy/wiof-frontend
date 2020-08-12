import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-food-ph-indicator-meter',
  templateUrl: './food-ph-indicator-meter.component.html',
  styleUrls: ['./food-ph-indicator-meter.component.scss'],
})
export class FoodPhIndicatorMeterComponent implements OnInit {
  @Input() food:any;
  message:string;

  constructor() { }

  ngOnInit() {
    // this.phValue=8;
    if(!this.food){
      this.message="Please select a food to find its pH value."
    }
    else if(this.food){
      this.message=`ph Level of ${this.food.name} is ${this.food.value}`;
    }

    this.updatePhPointer();
    console.log(this.food);
  }

  ngOnChanges(){
    console.log(this.food);

    this.updatePhPointer();
    if(!this.food){
      this.message="Please select a food to find its pH value."
    }
    else if(this.food){
      this.message=`ph Level of ${this.food.name} is ${this.food.value}`;
    }
  }
  updatePhPointer(){
    // return 'ph8';
    if (this.food){
      return `ph${this.food.value}`;
    }
    else{
      return '8';
    }      
  }
}
