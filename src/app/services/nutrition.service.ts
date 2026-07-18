import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface NutritionData {
  foodName: string;
  calories: number | null;       // kcal per 100g
  protein: number | null;        // g per 100g
  fat: number | null;            // g per 100g
  carbs: number | null;          // g per 100g
  fiber: number | null;          // g per 100g
  source: string;
  fdcId: number | null;          // USDA FDC ID for direct link
  usdaUrl: string | null;        // Direct link to USDA food page
}

@Injectable({
  providedIn: 'root'
})
export class NutritionService {

  private readonly API_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
  private cache = new Map<string, NutritionData>();

  constructor(private http: HttpClient) {}

  /**
   * Searches USDA FoodData Central for nutrition info.
   * Returns the top match's basic macronutrients.
   */
  getNutrition(foodName: string): Observable<NutritionData | null> {
    const cacheKey = foodName.toLowerCase().trim();

    // Return cached if available
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    const params = new HttpParams()
      .set('api_key', environment.usda_api_key)
      .set('query', foodName)
      .set('pageSize', '1')
      .set('dataType', 'Foundation,SR Legacy');

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(response => {
        if (!response?.foods?.length) return null;

        const food = response.foods[0];
        const nutrients = food.foodNutrients || [];

        const data: NutritionData = {
          foodName: food.description || foodName,
          calories: this.findNutrient(nutrients, 1008),  // Energy (kcal)
          protein: this.findNutrient(nutrients, 1003),   // Protein
          fat: this.findNutrient(nutrients, 1004),       // Total fat
          carbs: this.findNutrient(nutrients, 1005),     // Carbohydrate
          fiber: this.findNutrient(nutrients, 1079),     // Fiber
          source: 'USDA FoodData Central',
          fdcId: food.fdcId || null,
          usdaUrl: food.fdcId ? `https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients` : null
        };

        this.cache.set(cacheKey, data);
        return data;
      }),
      catchError(() => of(null))
    );
  }

  private findNutrient(nutrients: any[], nutrientId: number): number | null {
    const found = nutrients.find((n: any) => n.nutrientId === nutrientId);
    return found ? Math.round(found.value * 10) / 10 : null;
  }
}
