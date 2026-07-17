import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges
} from "@angular/core";
import { Food } from "../../services/food-data.service";

@Component({
  selector: "app-food-ph-indicator-meter",
  templateUrl: "./food-ph-indicator-meter.component.html",
  styleUrls: ["./food-ph-indicator-meter.component.scss"]
})
export class FoodPhIndicatorMeterComponent implements OnInit, OnChanges {
  @Input()
  food: Food | null = null;

  message = "";

  constructor() {}

  ngOnInit(): void {
    this.updateMessage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.food) {
      this.updateMessage();
    }
  }

  get foodStatus(): string {
    if (!this.food) {
      return "Neutral";
    }

    if (this.food.ph < 7) {
      return "Acidic";
    }

    if (this.food.ph > 7) {
      return "Alkaline";
    }

    return "Neutral";
  }

  get foodStatusClass(): string {
    return this.foodStatus.toLowerCase() + "-badge";
  }

  updatePhPointer(): string {
    if (!this.food) {
      return "ph7";
    }

    const ph = Math.round(this.food.ph);

    return `ph${Math.max(0, Math.min(14, ph))}`;
  }

  private updateMessage(): void {
    if (!this.food) {
      this.message = "Please select a food to view its pH value.";

      return;
    }

    this.message = `${this.food.name} has a pH of ${this.food.ph}. It is classified as ${this.foodStatus.toLowerCase()}.`;
  }
}
