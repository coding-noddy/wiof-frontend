import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { Food, FoodDataService } from '../../services/food-data.service';

@Component({
  selector: 'app-food-ph-indicator',
  templateUrl: './food-ph-indicator.component.html',
  styleUrls: ['./food-ph-indicator.component.scss']
})
export class FoodPhIndicatorComponent implements OnInit {

  foodOptions: Food[] = [];
  filteredFoodOptions$!: Observable<Food[]>;
  selectedFood: Food | null = null;

  foodInputCtrl = new FormControl('');

  about = false;

  @ViewChild('foodSearchInput')
  foodSearchInput!: ElementRef<HTMLInputElement>;

  constructor(private foodDataService: FoodDataService) { }

  ngOnInit(): void {
    this.foodDataService.getFoods().subscribe(
      foods => {
        this.foodOptions = foods;
        this.initializeAutocomplete();
      },
      error => {
        console.error('Failed to load food dataset.', error);
      }
    );
  }

  private initializeAutocomplete(): void {
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
      food.name.toLowerCase().includes(search) ||
      food.scientificName.toLowerCase().includes(search) ||
      food.category.toLowerCase().includes(search)
    );
  }

  getSelectedFoodName(food?: Food): string {
    return food ? food.name : '';
  }

  setSelectedFoodName(food: Food): void {
    this.selectedFood = food;
    this.foodInputCtrl.setValue(food);
  }

  clearSelection(): void {
    this.selectedFood = null;
    this.foodInputCtrl.setValue('');

    if (this.foodSearchInput) {
      setTimeout(() => {
        this.foodSearchInput.nativeElement.focus();
      });
    }
  }

}