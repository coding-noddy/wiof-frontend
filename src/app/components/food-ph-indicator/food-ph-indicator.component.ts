import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { FOOD_ITEMS } from './food-data';

export interface Food {
  name: string;
  value: number;
}

@Component({
  selector: 'app-food-ph-indicator',
  templateUrl: './food-ph-indicator.component.html',
  styleUrls: ['./food-ph-indicator.component.scss']
})
export class FoodPhIndicatorComponent implements OnInit {

  foodOptions: Food[] = [];
  filteredFoodOptions$!: Observable<Food[]>;

  selectedFood: Food = {
    name: 'Default',
    value: 8
  };

 foodInputCtrl = new FormControl('');

  about = false;

  @ViewChild('foodSearchInput')
  foodSearchInput!: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    this.foodOptions = [...FOOD_ITEMS].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    this.filteredFoodOptions$ = this.foodInputCtrl.valueChanges.pipe(
      startWith(''),
      map(value => typeof value === 'string' ? value : value?.name ?? ''),
      map(name =>
        name
          ? this.filterFoodOptions(name)
          : [...this.foodOptions]
      )
    );
  }

  private filterFoodOptions(searchText: string): Food[] {
    const search = searchText.trim().toLowerCase();

    return this.foodOptions.filter(food =>
      food.name.toLowerCase().includes(search)
    );
  }

  getSelectedFoodName(food?: Food): string {
    return food?.name ?? '';
  }

  setSelectedFoodName(selectedFood: Food): void {
    this.selectedFood = selectedFood;
    this.foodInputCtrl.setValue(selectedFood);
  }

  clearSelection(): void {
    this.selectedFood = {
      name: 'Default',
      value: 8
    };

    this.foodInputCtrl.setValue('');

    if (this.foodSearchInput) {
      setTimeout(() => {
        this.foodSearchInput.nativeElement.focus();
      });
    }
  }

}